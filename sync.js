// Sincronización del estado del usuario contra SU propia hoja de cálculo, a través de
// un Apps Script suyo. Sin DOM salvo `guardarRemoto` / `leerRemoto` / los helpers de
// credenciales: el resto es lógica pura, testeable con `node --test`.
//
// ###########################################################################
// #                                                                         #
// #   LA CLAVE ES UN SECRETO. NO SE ESCRIBE NUNCA EN EL REPOSITORIO.        #
// #                                                                         #
// #   Este repositorio es PÚBLICO (GitHub Pages). La clave y la URL del     #
// #   Apps Script NO van en datos.json, ni en este fichero, ni en ningún    #
// #   otro fichero versionado. El usuario las teclea UNA VEZ POR            #
// #   DISPOSITIVO y viven sólo en el localStorage de ese dispositivo.       #
// #                                                                         #
// #   Si alguna vez ves una clave escrita en un fichero del repo: está      #
// #   comprometida. Cámbiala en el Apps Script y vuelve a introducirla.     #
// #                                                                         #
// ###########################################################################
//
// POR QUÉ JSONP Y NO fetch()
// Esto es una web estática servida desde GitHub Pages: no hay backend propio. Los
// Apps Script no devuelven cabeceras CORS utilizables, así que la única vía es meter
// un <script src="..."> y que la respuesta llame a nuestro callback. Es exactamente
// lo que ya hace tradinverso.js con el dashboard del negocio; se copia ese patrón.
//
// CONSECUENCIA: todo viaja en la URL, en un GET. Las URLs no son infinitas (los
// navegadores y el propio Google cortan alrededor de los 8.000 caracteres), así que
// hay un límite duro de payload. Si se pasa, se avisa y se manda al usuario a la copia
// en archivo. NUNCA se trunca en silencio: truncar aquí es perder datos.

// Tope del JSON que cabe en la URL. Por encima de esto no se intenta: se falla claro.
export const LIMITE_PAYLOAD = 6000;

// Longitud mínima de la clave. Una clave corta en una URL pública es una clave rota:
// la aplicación web está desplegada como "cualquier usuario" y la URL es adivinable.
export const CLAVE_MIN = 16;

// Dónde viven las credenciales en el dispositivo. Sólo localStorage, nunca el repo.
export const CLAVES_LOCALSTORAGE = {
  url: 'sync-url-v1',
  clave: 'sync-clave-v1',
  ultimaCopia: 'ultima-copia-v1',
};

const ACCIONES = ['leer', 'guardar'];

// ---------------------------------------------------------------------------
// Ayudas privadas
// ---------------------------------------------------------------------------

function texto(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// Compara dos marcas de tiempo ISO. -> -1 (a más vieja) | 0 (igual) | 1 (a más nueva).
// No se compara con `<` de cadenas: '2026-07-28' y '2026-07-28T10:00:00Z' son el mismo
// día y la comparación de texto diría que la segunda es más nueva sin serlo del todo.
// Una marca ausente o ilegible es SIEMPRE más vieja que una legible.
function comparaMarcas(a, b) {
  const ta = Date.parse(texto(a));
  const tb = Date.parse(texto(b));
  const va = Number.isFinite(ta);
  const vb = Number.isFinite(tb);
  if (va && vb) return ta === tb ? 0 : (ta > tb ? 1 : -1);
  if (va) return 1;
  if (vb) return -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Credenciales
// ---------------------------------------------------------------------------

// Revisa lo que el usuario ha tecleado en los ajustes de sincronización.
// -> { ok, errores: string[] }
export function validarCredenciales(base, clave) {
  const errores = [];
  const b = texto(base);
  const k = texto(clave);

  if (!b) {
    errores.push('Falta la dirección de la aplicación web. Es la URL que te da Google al implementar el script y acaba en "/exec".');
  } else if (!/^https:\/\//i.test(b)) {
    errores.push('La dirección tiene que empezar por "https://".');
  }

  if (!k) {
    errores.push('Falta la clave secreta. Es la misma que pusiste en el script de Google.');
  } else if (k.length < CLAVE_MIN) {
    errores.push(`La clave es demasiado corta (${k.length} caracteres). Usa al menos ${CLAVE_MIN}: esa dirección es pública y la clave es lo único que protege tus datos.`);
  }

  return { ok: errores.length === 0, errores };
}

// SOLO NAVEGADOR. Lee las credenciales de ESTE dispositivo.
export function leerCredenciales() {
  if (typeof localStorage === 'undefined') return { base: '', clave: '' };
  return {
    base: localStorage.getItem(CLAVES_LOCALSTORAGE.url) || '',
    clave: localStorage.getItem(CLAVES_LOCALSTORAGE.clave) || '',
  };
}

// SOLO NAVEGADOR. Guarda las credenciales en ESTE dispositivo y en ningún sitio más.
export function guardarCredenciales(base, clave) {
  const v = validarCredenciales(base, clave);
  if (!v.ok) return v;
  localStorage.setItem(CLAVES_LOCALSTORAGE.url, texto(base));
  localStorage.setItem(CLAVES_LOCALSTORAGE.clave, texto(clave));
  return v;
}

// SOLO NAVEGADOR. Olvida las credenciales (dispositivo prestado, clave rotada…).
export function olvidarCredenciales() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(CLAVES_LOCALSTORAGE.url);
  localStorage.removeItem(CLAVES_LOCALSTORAGE.clave);
}

// ---------------------------------------------------------------------------
// Construcción de la URL
// ---------------------------------------------------------------------------

// Mide el payload ANTES de intentar nada. No lanza: devuelve el veredicto para que la
// UI pueda avisar sin romperse. -> { json, longitud, limite, cabe, error }
export function medirPayload(payload) {
  let json;
  try {
    json = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
  } catch (e) {
    return {
      json: '',
      longitud: 0,
      limite: LIMITE_PAYLOAD,
      cabe: false,
      error: 'No se han podido convertir los datos a JSON (¿hay una referencia circular?).',
    };
  }
  if (json === undefined) json = '';
  const longitud = json.length;
  const cabe = longitud <= LIMITE_PAYLOAD;
  return {
    json,
    longitud,
    limite: LIMITE_PAYLOAD,
    cabe,
    error: cabe
      ? ''
      : `Tus datos ocupan ${longitud} caracteres y por esta vía sólo caben ${LIMITE_PAYLOAD}. No se ha enviado nada (cortarlos sería perder datos). Usa la copia en archivo: Ajustes > Exportar copia.`,
  };
}

// Construye la URL firmada del Apps Script.
//   base    = la URL .../exec que da Google
//   clave   = el secreto del usuario
//   accion  = 'leer' | 'guardar'
//   payload = el estado a guardar (se ignora en 'leer')
// El parámetro `callback` NO se añade aquí: lo pone el cargador JSONP, igual que en
// tradinverso.js. Lanza Error con mensaje en español si algo no cuadra.
export function urlSync(base, clave, accion, payload) {
  const v = validarCredenciales(base, clave);
  if (!v.ok) throw new Error(v.errores.join(' '));

  const acc = texto(accion);
  if (!ACCIONES.includes(acc)) {
    throw new Error(`Acción no válida: "${acc}". Sólo valen "leer" y "guardar".`);
  }

  const b = texto(base);
  const sep = b.includes('?') ? '&' : '?';
  let url = `${b}${sep}clave=${encodeURIComponent(texto(clave))}&accion=${encodeURIComponent(acc)}`;

  if (acc === 'guardar') {
    if (payload === undefined || payload === null) {
      throw new Error('No hay nada que guardar: no se han pasado datos.');
    }
    const m = medirPayload(payload);
    if (!m.cabe) throw new Error(m.error);
    url += `&datos=${encodeURIComponent(m.json)}`;
  }

  return url;
}

// ---------------------------------------------------------------------------
// Transporte JSONP (SOLO NAVEGADOR)
// ---------------------------------------------------------------------------

// Mete un <script> con la URL y espera a que la respuesta llame a nuestro callback.
// Usa Date.now()/Math.random() para el nombre del callback: es código de navegador,
// no lógica pura, exactamente igual que `cargarTradinverso` en tradinverso.js.
function jsonp(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cbName = '__synccb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Se ha agotado el tiempo de espera hablando con tu hoja de Google. Comprueba la conexión y vuelve a intentarlo.'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      script.remove();
    }

    window[cbName] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('No se ha podido contactar con tu hoja de Google. Revisa la dirección del script en los ajustes de sincronización.'));
    };
    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${cbName}`;
    document.body.appendChild(script);
  });
}

// Traduce la respuesta del script a un mensaje que el usuario entienda. El script
// devuelve 'No autorizado' a secas cuando la clave falla: a propósito, para no dar
// pistas a quien esté probando URLs.
function mensajeDeError(respuesta) {
  const err = respuesta && respuesta.error ? String(respuesta.error) : '';
  if (/no autorizado/i.test(err)) {
    return 'La clave secreta no coincide con la del script de Google. Repásala en los ajustes de sincronización.';
  }
  if (!err) return 'La hoja de Google ha respondido algo que no se entiende. Vuelve a intentarlo.';
  return `La hoja de Google ha devuelto un error: ${err}`;
}

// SOLO NAVEGADOR. Manda el estado a la hoja del usuario.
// -> Promise<{ ok: true, fecha }>. Rechaza con Error si algo falla.
export function guardarRemoto(base, clave, estado, timeoutMs = 15000) {
  let url;
  try {
    url = urlSync(base, clave, 'guardar', estado);
  } catch (e) {
    return Promise.reject(e);
  }
  return jsonp(url, timeoutMs).then((r) => {
    if (!r || r.ok !== true) throw new Error(mensajeDeError(r));
    return { ok: true, fecha: texto(r.fecha) };
  });
}

// SOLO NAVEGADOR. Trae el estado guardado en la hoja del usuario.
// -> Promise<{ ok: true, existe, fecha, estado }>. `estado` es null si nunca se guardó.
export function leerRemoto(base, clave, timeoutMs = 15000) {
  let url;
  try {
    url = urlSync(base, clave, 'leer');
  } catch (e) {
    return Promise.reject(e);
  }
  return jsonp(url, timeoutMs).then((r) => {
    if (!r || r.ok !== true) throw new Error(mensajeDeError(r));
    return interpretarLectura(r);
  });
}

// La hoja devuelve el JSON como TEXTO tal cual está en la celda: si esa celda se ha
// corrompido, se entera aquí y se dice, en vez de reventar dentro del Apps Script.
// Separado de leerRemoto para poder probarlo sin red.
export function interpretarLectura(respuesta) {
  const r = respuesta || {};
  const fecha = texto(r.fecha);
  if (!r.datos) return { ok: true, existe: false, fecha, estado: null };
  if (typeof r.datos !== 'string') return { ok: true, existe: true, fecha, estado: r.datos };
  try {
    return { ok: true, existe: true, fecha, estado: JSON.parse(r.datos) };
  } catch (e) {
    throw new Error('Lo que hay guardado en tu hoja de Google no es un JSON válido. No se ha tocado nada de este dispositivo; usa la copia en archivo.');
  }
}

// ---------------------------------------------------------------------------
// Fusión
// ---------------------------------------------------------------------------

// La marca de tiempo que decide quién gana. La pone `marcarActualizado` de respaldo.js
// cada vez que el usuario cambia un dato.
export function marcaDe(estado) {
  return estado && typeof estado === 'object' ? texto(estado.actualizado) : '';
}

// ¿Cómo está este dispositivo respecto a la hoja?
// -> 'sin-remoto' | 'igual' | 'local-mas-nuevo' | 'remoto-mas-nuevo'
export function estadoSync(local, remoto) {
  if (remoto === null || remoto === undefined) return 'sin-remoto';
  if (local === null || local === undefined) return 'remoto-mas-nuevo';
  const c = comparaMarcas(marcaDe(local), marcaDe(remoto));
  if (c === 0) return 'igual';
  return c > 0 ? 'local-mas-nuevo' : 'remoto-mas-nuevo';
}

// Gana el más reciente. En caso de empate gana el LOCAL: si las dos marcas son iguales
// los datos deberían serlo también, y ante la duda no se pisa lo que el usuario tiene
// delante en la pantalla. -> { estado, origen: 'local' | 'remoto' }
export function fusionar(local, remoto) {
  if (remoto === null || remoto === undefined) return { estado: local ?? null, origen: 'local' };
  if (local === null || local === undefined) return { estado: remoto, origen: 'remoto' };
  return comparaMarcas(marcaDe(local), marcaDe(remoto)) >= 0
    ? { estado: local, origen: 'local' }
    : { estado: remoto, origen: 'remoto' };
}

// Frase para la UI a partir del veredicto de `estadoSync`.
export function textoEstadoSync(estado) {
  switch (estado) {
    case 'sin-remoto': return 'Todavía no hay nada guardado en tu hoja de Google.';
    case 'igual': return 'Este dispositivo y tu hoja de Google dicen lo mismo.';
    case 'local-mas-nuevo': return 'Este dispositivo tiene cambios que aún no están en tu hoja de Google.';
    case 'remoto-mas-nuevo': return 'Tu hoja de Google tiene cambios más nuevos que este dispositivo.';
    default: return 'No se sabe cómo está la sincronización.';
  }
}
