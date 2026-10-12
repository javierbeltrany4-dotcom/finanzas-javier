// Datos del negocio (Tradinverso) para el dashboard.
//
// DE DÓNDE SALEN (cambió en octubre de 2026). Antes se leían en vivo de la hoja de Google
// antigua, vía un Apps Script publicado como web app (JSONP). Esa hoja se abandonó a finales
// de septiembre: la contabilidad se lleva ahora en conta.tradinverso.com, que vuelca una copia
// a un Sheet de Drive nuevo. Ese Sheet NO se puede leer desde el navegador:
//   · pide autenticación (devuelve 401 a cualquiera que no tenga acceso),
//   · su endpoint JSON contesta una página de consentimiento, no datos,
//   · y además lleva datos personales de alumnos (email, teléfono, DNI) que NUNCA deben
//     acabar en esta app, que se sirve en una URL pública.
//
// Por eso la app ya no habla con Google: lee `tradinverso.json`, un fichero del propio repo
// con SOLO los agregados que necesita (sin nombres de cliente ni datos personales). Ese
// fichero lo refresca n8n, que sí entra al Sheet autenticado con la cuenta de Javier.
//
// `parseTradinverso` es puro (testeable). `cargarTradinverso` solo hace un fetch del fichero.

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

// Beneficio por mes. En el Sheet nuevo viene ya calculado (neto − gastos) por MES DE VENTA,
// en el bloque "Por meses" de RESUMEN, con el mes como 'YYYY-MM'.
export function parseIngresos(data) {
  return (Array.isArray(data?.ingresos) ? data.ingresos : [])
    .map((i) => ({ mes: String(i?.mes ?? '').slice(0, 7), beneficio: num(i?.beneficio) }))
    .filter((i) => /^\d{4}-\d{2}$/.test(i.mes));
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

// Lee el fichero del propio repo. Mismo origen: sin CORS, sin JSONP, sin credenciales.
// `cache: 'no-store'` para que el service worker/navegador no sirva una copia vieja.
export function cargarTradinverso(fuente = 'tradinverso.json') {
  const url = `${fuente}${fuente.includes('?') ? '&' : '?'}t=${Math.floor(Date.now() / 60000)}`;
  return fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`No se pudo leer ${fuente} (HTTP ${r.status})`);
    return r.json();
  });
}
