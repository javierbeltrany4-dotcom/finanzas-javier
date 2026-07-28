// Copia de seguridad de TODO lo que escribe el usuario, en un fichero que se puede
// guardar en iCloud, en el correo o donde quiera. Sin DOM salvo `descargar`:
// el resto es lógica pura, testeable con `node --test`.
//
// POR QUÉ EXISTE ESTE MÓDULO
// Las cuentas, los objetivos y los ajustes vivían SOLO en localStorage. localStorage
// se borra al cambiar de perfil de Chrome, al limpiar datos del navegador y no viaja
// al iPhone. El usuario ya perdió sus datos una vez. Esto es el seguro de vida:
// un fichero suyo, en su disco, que no depende de ningún navegador.
//
// QUÉ ES UN "ESTADO"
// Todo lo que el usuario ha escrito a mano. NO incluye los datos de Tradingverso
// (ésos se vuelven a bajar solos) ni `apiUrl` (ése vive en datos.json).
//
//   {
//     actualizado: '2026-07-28T09:00:00.000Z',   // cuándo cambió el DATO por última vez
//     saldoBanco:  { importe, fechaActualizacion },
//     metaMensual: 3000,
//     gastosFijos: [{ nombre, importe, diaPago }],
//     irpf:        { porcentaje, conceptosBanco[], conceptosCripto[] },
//     modelo:      { ...9 campos, fijosManual? },
//     dubai:       { costeAnual, impuestoSociedades, minimoExento },
//     patrimonio:  { cuentas[], objetivos[] },
//     objetivoLimpio: 3000,
//     residencia:  { ... }                        // opcional
//   }
//
// REGLA DE ORO AL IMPORTAR: si la copia viene rota, NO se machaca lo que ya hay.
// `importarTodo` devuelve ok:false y estado:null, y quien llama no toca nada.
//
// REGLA DE ORO AL NORMALIZAR: un campo que NO viene en la copia NO se inventa; se
// omite, y la app cae a su valor por defecto de siempre. Sólo se limpia lo que llega.

import { normalizarCuenta, normalizarObjetivo } from './patrimonio.js';
import { normalizarModelo, normalizarDubai } from './objetivo.js';
import { normalizarOpciones } from './residencia.js';
import { IRPF_DEFAULT } from './calculos.js';

// Versión del FORMATO de la copia, no de la app. Sube sólo si cambia la forma de
// `datos` de manera que una copia vieja ya no se pueda leer tal cual.
//   0 = el `datos.json` que soltaba el botón "Exportar" antiguo (sin campo version)
//   1 = { version, fecha, datos } con el estado plano de arriba
export const VERSION_RESPALDO = 1;

// Los únicos campos que se reconocen dentro de `datos`. Cualquier otra cosa se ignora
// (con aviso), para que una copia manipulada a mano no meta basura en la app.
export const CAMPOS_ESTADO = [
  'actualizado',
  'saldoBanco',
  'metaMensual',
  'gastosFijos',
  'irpf',
  'modelo',
  'dubai',
  'patrimonio',
  'objetivoLimpio',
  'residencia',
];

// ---------------------------------------------------------------------------
// Ayudas privadas
// ---------------------------------------------------------------------------

// Objeto de verdad: ni null, ni array, ni número disfrazado.
function esObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// CONVERTIR PUEDE LANZAR, Y AQUÍ NO SE PUEDE LANZAR.
//
// Parece imposible, pero no lo es: `String(v)` y `Number(v)` tiran un TypeError ("Cannot
// convert object to primitive value") en cuanto `v` es un objeto con una clave `toString`
// que no sea una función. Y eso el JSON lo produce sin despeinarse: {"toString": 1} es un
// JSON perfectamente válido. `valueOf` heredado de Object.prototype devuelve el objeto, así
// que no hay ningún camino a un primitivo y la conversión revienta.
//
// La REGLA DE ORO de la cabecera de este módulo dice que una copia rota devuelve ok:false,
// no que reviente al que la lea: `importarTodo` tiene un contrato y una excepción no
// capturada lo incumple. Por eso las dos conversiones van blindadas, y un valor que no se
// pueda convertir degrada como lo que es —basura— en vez de tumbar la importación entera.
function aTexto(v) {
  try { return String(v); } catch (e) { return ''; }
}
function aNumero(v) {
  try { return Number(v); } catch (e) { return NaN; }
}

// Número de usuario: vacío, NaN o basura -> null (y quien llama decide qué hacer).
// Ojo: el 0 es legítimo y tiene que sobrevivir.
function numONull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : aNumero(v);
  return Number.isFinite(n) ? n : null;
}

// Texto de usuario: recorta espacios; null/undefined -> ''. Igual que patrimonio.js.
function texto(v) {
  if (v === null || v === undefined) return '';
  return aTexto(v).trim();
}

// Lista de conceptos ("Fyrst", "Binance"…): descarta vacíos y recorta. Acepta también
// la cadena "Fyrst, Revolut" que teclea el usuario en el modal de ajustes.
function listaTexto(v) {
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(v)) return null;
  return v.map(texto).filter(Boolean);
}

// 'YYYY-MM-DD' o ISO completo -> milisegundos del DÍA en UTC. null si no hay fecha.
// Se trunca al día a propósito: comparar "hace 7 días" con horas locales de por medio
// daría resultados distintos según a qué hora del día se abra la app.
function diaEnMs(iso) {
  const s = texto(iso);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const ms = Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

// ---------------------------------------------------------------------------
// Normalización del estado
// ---------------------------------------------------------------------------

// Limpia el estado entero campo a campo. Devuelve { estado, errores, avisos }:
//   errores = la copia está rota de forma (una lista donde tocaba un objeto)
//   avisos  = se ha corregido o descartado algo, pero se puede seguir
export function revisarEstado(entrada) {
  const errores = [];
  const avisos = [];
  const estado = {};

  if (!esObjeto(entrada)) {
    return { estado: null, errores: ['Los datos de la copia no son un objeto.'], avisos };
  }

  // Marca de tiempo del dato. Se conserva tal cual: es la que decide quién gana al fusionar.
  const marca = texto(entrada.actualizado);
  if (entrada.actualizado !== undefined && !marca) {
    avisos.push('La copia traía una marca de tiempo vacía; se ignora.');
  }
  if (marca) estado.actualizado = marca;

  // --- Saldo del banco ---
  if (entrada.saldoBanco !== undefined) {
    if (!esObjeto(entrada.saldoBanco)) {
      errores.push('El campo "saldoBanco" debería ser un objeto con "importe" y "fechaActualizacion".');
    } else {
      const importe = numONull(entrada.saldoBanco.importe);
      if (importe === null) avisos.push('El saldo del banco no era un número; se guarda como 0.');
      estado.saldoBanco = {
        importe: importe === null ? 0 : importe,
        fechaActualizacion: texto(entrada.saldoBanco.fechaActualizacion),
      };
    }
  }

  // --- Meta mensual de beneficio ---
  if (entrada.metaMensual !== undefined) {
    const meta = numONull(entrada.metaMensual);
    if (meta === null) avisos.push('La meta mensual no era un número; se descarta.');
    else estado.metaMensual = meta;
  }

  // --- Gastos fijos ---
  if (entrada.gastosFijos !== undefined) {
    if (!Array.isArray(entrada.gastosFijos)) {
      errores.push('El campo "gastosFijos" debería ser una lista de gastos.');
    } else {
      const limpios = [];
      let sinNombre = 0;
      entrada.gastosFijos.forEach((g) => {
        const nombre = texto(g && g.nombre);
        if (!nombre) { sinNombre++; return; }
        const dia = numONull(g && g.diaPago);
        limpios.push({
          nombre,
          importe: numONull(g && g.importe) ?? 0,
          diaPago: dia === null ? 1 : Math.min(31, Math.max(1, Math.round(dia))),
        });
      });
      if (sinNombre > 0) {
        avisos.push(`Se han descartado ${sinNombre} gasto(s) fijo(s) sin nombre.`);
      }
      estado.gastosFijos = limpios;
    }
  }

  // --- IRPF (porcentaje + listas de conceptos) ---
  if (entrada.irpf !== undefined) {
    if (!esObjeto(entrada.irpf)) {
      errores.push('El campo "irpf" debería ser un objeto con "porcentaje", "conceptosBanco" y "conceptosCripto".');
    } else {
      const pct = numONull(entrada.irpf.porcentaje);
      if (pct === null) avisos.push(`El porcentaje de IRPF no era un número; se usa el de siempre (${IRPF_DEFAULT.porcentaje} %).`);
      const banco = listaTexto(entrada.irpf.conceptosBanco);
      const cripto = listaTexto(entrada.irpf.conceptosCripto);
      if (entrada.irpf.conceptosBanco !== undefined && banco === null) {
        avisos.push('La lista de conceptos de banco venía mal; se usa la de siempre.');
      }
      if (entrada.irpf.conceptosCripto !== undefined && cripto === null) {
        avisos.push('La lista de conceptos de cripto venía mal; se usa la de siempre.');
      }
      estado.irpf = {
        porcentaje: pct === null ? IRPF_DEFAULT.porcentaje : Math.min(100, Math.max(0, pct)),
        conceptosBanco: banco || IRPF_DEFAULT.conceptosBanco.slice(),
        conceptosCripto: cripto || IRPF_DEFAULT.conceptosCripto.slice(),
      };
    }
  }

  // --- Modelo del negocio ---
  // `normalizarModelo` tira la bandera `fijosManual` (no es un número del modelo), pero
  // esa decisión del usuario tiene que sobrevivir al viaje: si tecleó los fijos a mano,
  // al volver de la copia deben seguir siendo suyos y no la media calculada.
  if (entrada.modelo !== undefined) {
    if (!esObjeto(entrada.modelo)) {
      errores.push('El campo "modelo" debería ser un objeto con los ajustes del negocio.');
    } else {
      const m = normalizarModelo(entrada.modelo);
      if (entrada.modelo.fijosManual === true) m.fijosManual = true;
      estado.modelo = m;
    }
  }

  // --- Ajustes de Dubái (la comparativa rápida de la pestaña "Cuánto facturar") ---
  if (entrada.dubai !== undefined) {
    if (!esObjeto(entrada.dubai)) {
      errores.push('El campo "dubai" debería ser un objeto con "costeAnual", "impuestoSociedades" y "minimoExento".');
    } else {
      estado.dubai = normalizarDubai(entrada.dubai);
    }
  }

  // --- Patrimonio: cuentas y objetivos ---
  if (entrada.patrimonio !== undefined) {
    if (!esObjeto(entrada.patrimonio)) {
      errores.push('El campo "patrimonio" debería ser un objeto con "cuentas" y "objetivos".');
    } else {
      const p = {};
      if (entrada.patrimonio.cuentas !== undefined && !Array.isArray(entrada.patrimonio.cuentas)) {
        errores.push('El campo "patrimonio.cuentas" debería ser una lista de cuentas.');
      } else {
        p.cuentas = (entrada.patrimonio.cuentas || []).map(normalizarCuenta);
      }
      if (entrada.patrimonio.objetivos !== undefined && !Array.isArray(entrada.patrimonio.objetivos)) {
        errores.push('El campo "patrimonio.objetivos" debería ser una lista de objetivos.');
      } else {
        p.objetivos = (entrada.patrimonio.objetivos || []).map(normalizarObjetivo);
      }
      if (p.cuentas && p.objetivos) estado.patrimonio = p;
    }
  }

  // --- Objetivo limpio al mes ---
  if (entrada.objetivoLimpio !== undefined) {
    const o = numONull(entrada.objetivoLimpio);
    if (o === null) avisos.push('El objetivo limpio no era un número; se descarta.');
    else estado.objetivoLimpio = Math.max(0, o);
  }

  // --- Opciones de la comparativa de residencia ---
  // `normalizarOpciones` se queda solo con las claves que residencia.js usa para calcular,
  // y tira la horquilla de coste de Dubái (mínimo y máximo del informe). Esa horquilla no
  // es una cifra de cálculo —el módulo trabaja con un único coste, su punto medio— pero
  // sí es una decisión del usuario y tiene que sobrevivir al viaje, igual que la bandera
  // `fijosManual` del modelo del negocio.
  if (entrada.residencia !== undefined) {
    if (!esObjeto(entrada.residencia)) {
      errores.push('El campo "residencia" debería ser un objeto con las opciones de la comparativa.');
    } else {
      const r = normalizarOpciones(entrada.residencia);
      ['dubaiCosteMin', 'dubaiCosteMax'].forEach((k) => {
        const n = numONull(entrada.residencia[k]);
        if (n !== null && n >= 0) r[k] = n;
      });
      estado.residencia = r;
    }
  }

  // --- Campos que no conocemos: se ignoran, pero se dice ---
  const desconocidos = Object.keys(entrada).filter((k) => !CAMPOS_ESTADO.includes(k));
  if (desconocidos.length) {
    avisos.push(`Campos que este dashboard no conoce y se ignoran: ${desconocidos.join(', ')}.`);
  }

  return { estado, errores, avisos };
}

// Atajo cuando sólo interesa el estado limpio (la app, al guardar). Ante una copia rota
// devuelve null: quien llama decide, aquí no se machaca nada.
export function normalizarEstado(entrada) {
  const r = revisarEstado(entrada);
  return r.errores.length ? null : r.estado;
}

// Sella el estado con la hora en la que el usuario CAMBIÓ un dato. Es la marca que usa
// `fusionar` en sync.js para decidir quién gana. La hora entra por parámetro: este
// módulo no mira el reloj.
export function marcarActualizado(estado, ahoraISO) {
  return { ...(estado || {}), actualizado: texto(ahoraISO) };
}

// ---------------------------------------------------------------------------
// Exportar
// ---------------------------------------------------------------------------

// El estado del usuario dentro de un sobre con versión y fecha de la copia.
//   version = formato del fichero (para poder migrarlo dentro de dos años)
//   fecha   = cuándo se hizo ESTA copia (no cuándo cambió el dato)
//   datos   = el estado ya limpio
// `ahoraISO` es opcional para respetar la firma `exportarTodo(estado)`; si no llega,
// se cae a la marca del propio estado. Nada de Date.now() aquí dentro.
export function exportarTodo(estado, ahoraISO) {
  const r = revisarEstado(estado);
  const datos = r.errores.length ? {} : r.estado;
  return {
    version: VERSION_RESPALDO,
    fecha: texto(ahoraISO) || texto(estado && estado.actualizado),
    datos,
  };
}

// Nombre de fichero con la fecha dentro, para que en la carpeta de descargas se vea de
// un vistazo cuál es la copia buena: "respaldo-dashboard-2026-07-28.json".
export function nombreDeCopia(hoyISO) {
  const dia = texto(hoyISO).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dia)
    ? `respaldo-dashboard-${dia}.json`
    : 'respaldo-dashboard.json';
}

// ---------------------------------------------------------------------------
// Importar
// ---------------------------------------------------------------------------

// ¿Esto huele al datos.json que soltaba el botón "Exportar" antiguo? Aquel fichero no
// tenía `version` y llevaba los ajustes colgando de `config`.
function pareceFormatoAntiguo(json) {
  return esObjeto(json.config)
    || json.apiUrl !== undefined
    || (json.patrimonio !== undefined && json.datos === undefined && json.version === undefined);
}

// datos.json de la versión antigua -> estado plano. `apiUrl`, `anioBase` y `split` no
// son datos del usuario (viven en datos.json del repo) y se quedan fuera a propósito.
function migrarDeAntiguo(json) {
  const cfg = esObjeto(json.config) ? json.config : {};
  const datos = {};
  if (json.saldoBanco !== undefined) datos.saldoBanco = json.saldoBanco;
  if (cfg.metaMensual !== undefined) datos.metaMensual = cfg.metaMensual;
  if (cfg.gastosFijos !== undefined) datos.gastosFijos = cfg.gastosFijos;
  if (cfg.irpf !== undefined) datos.irpf = cfg.irpf;
  if (cfg.modelo !== undefined) datos.modelo = cfg.modelo;
  if (cfg.dubai !== undefined) datos.dubai = cfg.dubai;
  if (cfg.residencia !== undefined) datos.residencia = cfg.residencia;
  if (json.patrimonio !== undefined) datos.patrimonio = json.patrimonio;
  if (json.objetivoLimpio !== undefined) datos.objetivoLimpio = json.objetivoLimpio;
  return datos;
}

// Reconoce el sobre y saca el bloque `datos`, migrando si hace falta.
// -> { ok, version, datos, errores, avisos }
export function migrar(json) {
  const errores = [];
  const avisos = [];

  if (!esObjeto(json)) {
    return {
      ok: false,
      version: null,
      datos: null,
      errores: ['La copia no tiene la forma esperada: debería ser un objeto con "version", "fecha" y "datos".'],
      avisos,
    };
  }

  // Sobre moderno: { version, fecha, datos }
  if (json.version !== undefined) {
    const v = numONull(json.version);
    if (v === null) {
      errores.push('La copia dice tener una versión que no es un número; no me fío de ella.');
      return { ok: false, version: null, datos: null, errores, avisos };
    }
    if (v > VERSION_RESPALDO) {
      errores.push(`Esta copia se hizo con una versión más nueva del dashboard (formato ${v}, aquí se entiende hasta el ${VERSION_RESPALDO}). Actualiza la app antes de importarla.`);
      return { ok: false, version: v, datos: null, errores, avisos };
    }
    if (v < VERSION_RESPALDO) {
      // Hoy sólo existe el formato 0 (el datos.json antiguo), que no lleva `version`.
      // Si algún día aparece un formato 1.5, la migración va aquí.
      avisos.push(`Copia en formato antiguo (${v}); se ha convertido al formato ${VERSION_RESPALDO}.`);
      const datos = esObjeto(json.datos) ? json.datos : migrarDeAntiguo(json);
      return { ok: true, version: v, datos, errores, avisos };
    }
    if (!esObjeto(json.datos)) {
      errores.push('La copia no trae el bloque "datos", o no es un objeto.');
      return { ok: false, version: v, datos: null, errores, avisos };
    }
    return { ok: true, version: v, datos: json.datos, errores, avisos };
  }

  // Sin `version`: o es el datos.json antiguo, o es un estado suelto.
  if (pareceFormatoAntiguo(json)) {
    avisos.push('Copia en el formato antiguo (datos.json); se ha convertido al formato nuevo.');
    return { ok: true, version: 0, datos: migrarDeAntiguo(json), errores, avisos };
  }

  const conocidos = Object.keys(json).filter((k) => CAMPOS_ESTADO.includes(k));
  if (conocidos.length) {
    avisos.push('La copia no llevaba número de versión; se ha leído como un estado suelto.');
    return { ok: true, version: 0, datos: json, errores, avisos };
  }

  errores.push('La copia no contiene ningún dato reconocible del dashboard. ¿Seguro que es el fichero de respaldo?');
  return { ok: false, version: null, datos: null, errores, avisos };
}

// Lee una copia (texto JSON u objeto ya parseado), la valida de verdad y la migra si
// hace falta. -> { ok, estado, errores, avisos, version }
// Si ok es false, `estado` es null: quien llama NO debe tocar nada de lo que ya tiene.
export function importarTodo(json) {
  let bruto = json;

  if (typeof bruto === 'string') {
    const s = bruto.trim();
    if (!s) {
      return { ok: false, estado: null, errores: ['El archivo está vacío.'], avisos: [], version: null };
    }
    try {
      bruto = JSON.parse(s);
    } catch (e) {
      return {
        ok: false,
        estado: null,
        errores: ['El archivo no es un JSON válido. Ábrelo y comprueba que empieza por "{" y no está cortado.'],
        avisos: [],
        version: null,
      };
    }
  }

  const m = migrar(bruto);
  if (!m.ok) {
    return { ok: false, estado: null, errores: m.errores, avisos: m.avisos, version: m.version };
  }

  const r = revisarEstado(m.datos);
  const errores = m.errores.concat(r.errores);
  const avisos = m.avisos.concat(r.avisos);

  if (errores.length) {
    return { ok: false, estado: null, errores, avisos, version: m.version };
  }

  // Un sobre correcto pero vacío por dentro no es una copia: importarlo dejaría al
  // usuario igual que estaba, o peor, si la app decide sobrescribir con esto.
  const utiles = Object.keys(r.estado).filter((k) => k !== 'actualizado');
  if (utiles.length === 0) {
    return {
      ok: false,
      estado: null,
      errores: ['La copia está vacía: no trae cuentas, ni objetivos, ni ajustes. No se ha tocado nada de lo que ya tenías.'],
      avisos,
      version: m.version,
    };
  }

  return { ok: true, estado: r.estado, errores: [], avisos, version: m.version };
}

// ---------------------------------------------------------------------------
// Descarga (SOLO NAVEGADOR)
// ---------------------------------------------------------------------------

// Dispara la descarga del fichero. Mismo patrón que el "Exportar" que ya había en
// app.js: Blob + enlace temporal + revoke, sin dependencias.
export function descargar(nombre, contenido) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
    throw new Error('descargar() sólo funciona dentro del navegador.');
  }
  const cuerpo = typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2);
  const blob = new Blob([cuerpo], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre || 'respaldo-dashboard.json';
  a.click();
  URL.revokeObjectURL(url);
  return a.download;
}

// ---------------------------------------------------------------------------
// Recordatorio de copia
// ---------------------------------------------------------------------------

// ¿Toca hacer copia? Sin copia previa -> sí. Con una fecha ilegible -> sí (ante la duda,
// que la haga). Ambas fechas se truncan al día para que no dependa de la hora.
export function haceFaltaCopia(ultimaCopiaISO, hoyISO, dias = 7) {
  const ultima = diaEnMs(ultimaCopiaISO);
  if (ultima === null) return true;
  const hoy = diaEnMs(hoyISO);
  if (hoy === null) return true;
  const pasados = Math.floor((hoy - ultima) / 86400000);
  // Una copia con fecha futura (reloj cambiado, zona horaria rara) no obliga a repetirla.
  if (pasados < 0) return false;
  return pasados >= Math.max(1, Number(dias) || 1);
}

// Frase para la UI: "Tu última copia es de hace 12 días". La cuenta de días entra ya
// hecha por haceFaltaCopia; aquí sólo se redacta.
export function textoUltimaCopia(ultimaCopiaISO, hoyISO) {
  const ultima = diaEnMs(ultimaCopiaISO);
  const hoy = diaEnMs(hoyISO);
  if (ultima === null) return 'Nunca has hecho una copia de tus datos.';
  if (hoy === null) return 'Tu última copia es del ' + texto(ultimaCopiaISO).slice(0, 10) + '.';
  const dias = Math.floor((hoy - ultima) / 86400000);
  if (dias <= 0) return 'Has hecho copia hoy.';
  if (dias === 1) return 'Tu última copia es de ayer.';
  return `Tu última copia es de hace ${dias} días.`;
}
