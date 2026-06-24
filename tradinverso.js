// Carga y parseo de los datos del dashboard de Tradingverso (Google Apps Script).
// `parseTradinverso` es puro (testeable). `cargarTradinverso` usa JSONP (solo navegador).

const MESES = {
  Ene: '01', Feb: '02', Mar: '03', Abr: '04', May: '05', Jun: '06',
  Jul: '07', Ago: '08', Sep: '09', Oct: '10', Nov: '11', Dic: '12',
};

// Extrae el beneficio mensual de la hoja RESUMEN (columna "Beneficio" = neto sin IVA − gastos).
export function parseIngresos(data, anioBase) {
  const resumen = data.RESUMEN || [];
  const headerIdx = resumen.findIndex(
    (r) => r[0] === 'Mes' && r.includes('Beneficio')
  );
  if (headerIdx === -1) return [];
  const colBenef = resumen[headerIdx].indexOf('Beneficio');
  const ingresos = [];
  for (let i = headerIdx + 1; i < resumen.length; i++) {
    const nombre = resumen[i][0];
    if (nombre === 'Total') break;
    const mm = MESES[nombre];
    if (!mm) continue;
    const beneficio = Number(resumen[i][colBenef]) || 0;
    if (beneficio !== 0) ingresos.push({ mes: `${anioBase}-${mm}`, beneficio });
  }
  return ingresos;
}

// Extrae los retiros de la hoja REPARTO (fecha ISO, importe total, concepto).
export function parseRetiros(data) {
  const reparto = data.REPARTO || [];
  const headerIdx = reparto.findIndex((r) => r[0] === 'Fecha reparto');
  if (headerIdx === -1) return [];
  const retiros = [];
  for (let i = headerIdx + 1; i < reparto.length; i++) {
    const fecha = reparto[i][0];
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    const total = Number(reparto[i][1]) || 0;
    if (total === 0) continue;
    retiros.push({
      fecha: fecha.slice(0, 10),
      total,
      concepto: reparto[i][6] || '',
    });
  }
  return retiros;
}

// Ventas individuales (diarias) desde INGRESOS: fecha, neto sin IVA, bruto, cliente, método.
export function parseVentas(data) {
  const ing = data.INGRESOS || [];
  const headerIdx = ing.findIndex((r) => r[0] === 'Fecha venta');
  if (headerIdx === -1) return [];
  const ventas = [];
  for (let i = headerIdx + 1; i < ing.length; i++) {
    const fecha = ing[i][0];
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    ventas.push({
      fecha: fecha.slice(0, 10),
      cliente: ing[i][1] || '',
      pais: ing[i][2] || '',
      bruto: Number(ing[i][3]) || 0,
      neto: Number(ing[i][6]) || 0,
      metodo: ing[i][7] || '',
    });
  }
  return ventas;
}

// Gastos del negocio (diarios) desde GASTOS: fecha, total, concepto, categoría.
export function parseGastosNegocio(data) {
  const g = data.GASTOS || [];
  const headerIdx = g.findIndex((r) => r[0] === 'Fecha');
  if (headerIdx === -1) return [];
  const gastos = [];
  for (let i = headerIdx + 1; i < g.length; i++) {
    const fecha = g[i][0];
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) continue;
    gastos.push({
      fecha: fecha.slice(0, 10),
      concepto: g[i][1] || '',
      categoria: g[i][2] || '',
      proveedor: g[i][3] || '',
      total: Number(g[i][5]) || 0,
    });
  }
  return gastos;
}

// Cash real del negocio desde CASH_FLOW (escaneo etiqueta -> valor siguiente).
export function parseCaja(data) {
  const cf = data.CASH_FLOW || [];
  const get = (etiqueta) => {
    for (const row of cf) {
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === etiqueta) return Number(row[i + 1]) || 0;
      }
    }
    return 0;
  };
  return {
    disponible: get('Saldo en caja'),
    pendienteCobro: get('Total pendiente cobro'),
    cashLimpio: get('Cash limpio'),
    saldoCripto: get('Saldo cripto'),
    saldoBanco: get('Saldo banco'),
  };
}

export function parseTradinverso(data, anioBase) {
  return {
    ingresos: parseIngresos(data, anioBase),
    retiros: parseRetiros(data),
    ventas: parseVentas(data),
    gastosNegocio: parseGastosNegocio(data),
    caja: parseCaja(data),
  };
}

// Carga el endpoint vía JSONP (esquiva CORS). Solo navegador.
// timeout amplio: el Apps Script tarda 7-10s de base (más en frío / red móvil).
export function cargarTradinverso(apiUrl, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const cbName = '__tvcb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout al conectar con Tradingverso'));
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
      reject(new Error('Error de red al conectar con Tradingverso'));
    };
    const sep = apiUrl.includes('?') ? '&' : '?';
    script.src = `${apiUrl}${sep}callback=${cbName}`;
    document.body.appendChild(script);
  });
}
