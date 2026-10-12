// Datos del negocio (Tradinverso) para el dashboard.
//
// DE DÓNDE SALEN (cambió en octubre de 2026). La contabilidad se lleva ahora en
// conta.tradinverso.com, que vuelca una copia a un Sheet de Drive nuevo. Ese Sheet NO se
// puede leer directamente desde el navegador:
//   · pide autenticación (devuelve 401 a cualquiera que no tenga acceso),
//   · su endpoint JSON contesta una página de consentimiento, no datos,
//   · y además lleva datos personales de alumnos (email, teléfono, DNI) que NUNCA deben
//     acabar en esta app, que se sirve en una URL pública.
//
// Por eso en medio hay un puente: un Apps Script ("Puente Mis Finanzas") que vive en la
// cuenta de Javier, entra al Sheet ya autenticado, y publica SOLO los agregados que esta app
// necesita — sin nombres de cliente, sin email, sin teléfono, sin DNI. Se lee por JSONP
// porque Apps Script contesta con un 302 a otro dominio y así da igual lo que haga el CORS.
//
// TRES CAPAS para que no se vuelva a quedar en blanco nunca:
//   1. el puente en vivo (datos de hoy),
//   2. si falla, `tradinverso.json` del propio repo (última foto buena, mismo origen),
//   3. si eso también falla, la caché de localStorage que guarda app.js.
//
// `parseTradinverso` es puro (testeable). `cargarTradinverso` solo trae los datos.

// Normaliza una fecha a 'YYYY-MM-DD'. Acepta ya-ISO o 'dd/mm/yyyy' (como lo escribe el Sheet).
export function fechaISO(valor) {
  const s = String(valor ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[0];
  const esp = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (esp) return `${esp[3]}-${esp[2].padStart(2, '0')}-${esp[1].padStart(2, '0')}`;
  return '';
}

// Número tolerante: acepta 1234.56, "1.234,56 €" (formato español) y basura -> 0.
export function num(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  let s = String(valor ?? '').replace(/[€\s ]/g, '').trim();
  if (!s) return 0;
  // Si acaba en ",dd" es formato español: el punto es separador de miles.
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Beneficio por mes. SE CALCULA AQUÍ a partir de las ventas y los gastos, no se lee de la
// hoja. Esto es a propósito y es lo que arregló el "no se ve octubre":
//
// El Sheet trae un bloque "Por meses" en RESUMEN, pero leerlo es frágil de tres maneras:
// Google convierte el texto "2026-10" en una fecha, la palabra "Beneficio" también aparece en
// la fila de totales, y las pestañas se reescriben enteras cada vez. Cuando eso se descuadra
// el bloque llega vacío y el dashboard enseña 0 € sin avisar de nada.
//
// Calcularlo es más fiable y además es internamente consistente: sale de las MISMAS ventas y
// gastos que alimentan todas las demás cifras de la pantalla, así que no puede contradecirlas.
// Comprobado con los datos reales de octubre de 2026: suma 83.393,70 €, que es exactamente
// lo repartido (57.558,49) + lo pendiente de repartir (25.835,21), al céntimo.
//
// `data.ingresos` solo se usa de reserva, si no viniera ninguna venta ni ningún gasto.
export function parseIngresos(data) {
  const propios = (Array.isArray(data?.ingresos) ? data.ingresos : [])
    .map((i) => ({ mes: String(i?.mes ?? '').slice(0, 7), beneficio: num(i?.beneficio) }))
    .filter((i) => /^\d{4}-\d{2}$/.test(i.mes));

  const ventas = parseVentas(data);
  const gastos = parseGastosNegocio(data);
  if (!ventas.length && !gastos.length) return propios;

  const porMes = new Map();
  const suma = (fecha, importe) => {
    const mes = fecha.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(mes)) return;
    porMes.set(mes, (porMes.get(mes) || 0) + importe);
  };
  ventas.forEach((v) => suma(v.fecha, v.neto));
  gastos.forEach((g) => suma(g.fecha, -g.total));

  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, beneficio]) => ({ mes, beneficio: Math.round(beneficio * 100) / 100 }));
}

// Repartos ya PAGADOS. `concepto` trae delante la cuenta de origen ("Cripto" o "Banco"),
// que es lo que usa `clasificarRetiro` para saber si ese dinero lleva IRPF o no.
export function parseRetiros(data) {
  return (Array.isArray(data?.retiros) ? data.retiros : [])
    .map((r) => ({ fecha: fechaISO(r?.fecha), total: num(r?.total), concepto: String(r?.concepto ?? '') }))
    .filter((r) => r.fecha && r.total !== 0);
}

// Ventas individuales. SIN nombre de cliente a propósito: este fichero vive en un repo público.
export function parseVentas(data) {
  return (Array.isArray(data?.ventas) ? data.ventas : [])
    .map((v) => ({
      fecha: fechaISO(v?.fecha),
      cliente: String(v?.cliente ?? ''),
      pais: String(v?.pais ?? ''),
      bruto: num(v?.bruto),
      neto: num(v?.neto),
      metodo: String(v?.metodo ?? ''),
    }))
    .filter((v) => v.fecha);
}

export function parseGastosNegocio(data) {
  return (Array.isArray(data?.gastosNegocio) ? data.gastosNegocio : [])
    .map((g) => ({
      fecha: fechaISO(g?.fecha),
      concepto: String(g?.concepto ?? ''),
      categoria: String(g?.categoria ?? ''),
      proveedor: String(g?.proveedor ?? ''),
      total: num(g?.total),
    }))
    .filter((g) => g.fecha);
}

// Caja. Mapeo desde el bloque de totales de RESUMEN del Sheet nuevo:
//   disponible      <- "Saldo en caja"
//   pendienteCobro  <- "Pendiente de cobro"
//   cashLimpio      <- "Cash cobrado"
//   saldoCripto     <- saldo de la cuenta "cripto"
//   saldoBanco      <- saldo de la cuenta "fyrst"
export function parseCaja(data) {
  const c = data?.caja || {};
  return {
    disponible: num(c.disponible),
    pendienteCobro: num(c.pendienteCobro),
    cashLimpio: num(c.cashLimpio),
    saldoCripto: num(c.saldoCripto),
    saldoBanco: num(c.saldoBanco),
    // Nuevo en el Sheet de octubre: lo que queda por repartir entre los dos socios.
    pendienteRepartir: num(c.pendienteRepartir),
  };
}

export function parseTradinverso(data) {
  return {
    ingresos: parseIngresos(data),
    retiros: parseRetiros(data),
    ventas: parseVentas(data),
    gastosNegocio: parseGastosNegocio(data),
    caja: parseCaja(data),
    // Cuándo se refrescó el fichero por última vez (lo escribe n8n). Se enseña en pantalla
    // para que nunca más se mire un dato viejo creyendo que es de hoy.
    actualizado: String(data?.actualizado ?? ''),
  };
}

const RESPALDO = 'tradinverso.json';
const ESPERA_PUENTE = 20000; // Apps Script en frío tarda lo suyo; app.js además reintenta.

// Lee un fichero del propio repo. Mismo origen: sin CORS, sin credenciales.
// `cache: 'no-store'` para que el service worker/navegador no sirva una copia vieja.
function cargarFichero(fuente) {
  const url = `${fuente}${fuente.includes('?') ? '&' : '?'}t=${Math.floor(Date.now() / 60000)}`;
  return fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`No se pudo leer ${fuente} (HTTP ${r.status})`);
    return r.json();
  });
}

// Lee el puente de Apps Script por JSONP.
//
// Por qué JSONP y no fetch: Apps Script contesta un 302 hacia script.googleusercontent.com,
// y a la mínima que ese salto no traiga los permisos correctos el fetch muere en un error de
// CORS indistinguible de "no hay internet". Con JSONP no hay CORS que fallar. Lleva su propio
// temporizador porque una etiqueta <script> que no responde se queda colgada para siempre.
function cargarPuente(url, espera = ESPERA_PUENTE) {
  return new Promise((resolve, reject) => {
    const cb = `puenteFinanzas${Math.random().toString(36).slice(2)}`;
    const s = document.createElement('script');
    let hecho = false;
    const limpiar = () => { try { delete window[cb]; } catch { window[cb] = undefined; } s.remove(); };
    const acabar = (fn, arg) => { if (hecho) return; hecho = true; clearTimeout(timer); limpiar(); fn(arg); };
    const timer = setTimeout(() => acabar(reject, new Error('El puente no contestó a tiempo')), espera);

    window[cb] = (datos) => acabar(resolve, datos);
    s.onerror = () => acabar(reject, new Error('No se pudo conectar con el puente'));
    s.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}&t=${Math.floor(Date.now() / 60000)}`;
    document.head.appendChild(s);
  });
}

// `fuente` puede ser la URL del puente (http…/exec) o un fichero del repo. Si el puente falla,
// cae solo al `tradinverso.json` del repo en vez de dejar la pantalla a 0 €.
export function cargarTradinverso(fuente = RESPALDO) {
  if (!/^https?:\/\//i.test(fuente)) return cargarFichero(fuente);
  return cargarPuente(fuente).catch((e) => {
    console.warn(`[tradinverso] el puente falló (${e.message}); uso la foto del repo.`);
    return cargarFichero(RESPALDO);
  });
}
