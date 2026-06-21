// Lógica pura de cálculo financiero. Sin DOM: testeable con `node --test`.

export const SPLIT = { yo: 0.40, david: 0.60 };

export function beneficioAcumulado(ingresos) {
  return ingresos.reduce((acc, i) => acc + i.beneficio, 0);
}

export function totalRetirado(retiros) {
  return retiros.reduce((acc, r) => acc + r.total, 0);
}

export function retiradoPorMi(retiros, split = SPLIT) {
  return totalRetirado(retiros) * split.yo;
}

export function retiradoPorDavid(retiros, split = SPLIT) {
  return totalRetirado(retiros) * split.david;
}

export function pendienteDeRetirar(ingresos, retiros) {
  return beneficioAcumulado(ingresos) - totalRetirado(retiros);
}

// Lo que puedo retirar YO ahora: mi 40% del pendiente de retirar.
export function disponibleParaMi(ingresos, retiros, split = SPLIT) {
  return pendienteDeRetirar(ingresos, retiros) * split.yo;
}

// Lo que le queda por retirar a David: su 60% del pendiente.
export function disponibleParaDavid(ingresos, retiros, split = SPLIT) {
  return pendienteDeRetirar(ingresos, retiros) * split.david;
}

// Mi parte (40%) del beneficio de un mes concreto.
export function miParteMes(beneficio, split = SPLIT) {
  return beneficio * split.yo;
}

// Lo que puedo retirar HOY de verdad: mi 40% del cash REAL en caja (sin pendiente de cobro).
export function disponibleRealParaMi(caja, split = SPLIT) {
  return (caja?.disponible || 0) * split.yo;
}

// Lo que retiré YO en un mes concreto (mi 40% de los retiros de ese mes).
export function miRetiroDelMes(retiros, mes, split = SPLIT) {
  return retirosDelMes(retiros, mes) * split.yo;
}

// Ahorro personal del mes: lo que me llevé menos mis gastos fijos.
// Solo es ahorro real si hubo retiro; si no, es dinero que sale de mi banco.
export function ahorroDelMes(miRetiroMes, gastosTotal) {
  return miRetiroMes - gastosTotal;
}

// Mi ganancia (40%) generada en una fecha concreta (suma del neto de ventas de ese día).
export function gananciaDiaParaMi(ventas, fecha, split = SPLIT) {
  return ventasNetasEntre(ventas, fecha, fecha) * split.yo;
}

// Suma del neto de ventas en un rango de fechas [desde, hasta] (ambos inclusive, 'YYYY-MM-DD').
export function ventasNetasEntre(ventas, desde, hasta) {
  return ventas
    .filter((v) => v.fecha >= desde && v.fecha <= hasta)
    .reduce((acc, v) => acc + v.neto, 0);
}

// Suma de gastos del negocio en un rango de fechas [desde, hasta].
export function gastosEntre(gastosNegocio, desde, hasta) {
  return gastosNegocio
    .filter((g) => g.fecha >= desde && g.fecha <= hasta)
    .reduce((acc, g) => acc + g.total, 0);
}

// Suma de retiros en un rango de fechas [desde, hasta].
export function retirosEntre(retiros, desde, hasta) {
  return retiros
    .filter((r) => r.fecha >= desde && r.fecha <= hasta)
    .reduce((acc, r) => acc + r.total, 0);
}

// Mi parte (40%) de cualquier importe (gasto, retiro, venta…).
export function miParteDe(importe, split = SPLIT) {
  return importe * split.yo;
}

// Mi beneficio (40%) en un rango: mi parte de (ventas netas − gastos del negocio).
// Coincide con el beneficio mensual de Tradingverso cuando el rango es un mes completo.
export function miBeneficioEntre(ventas, gastosNegocio, desde, hasta, split = SPLIT) {
  return (ventasNetasEntre(ventas, desde, hasta) - gastosEntre(gastosNegocio, desde, hasta)) * split.yo;
}

// Proyección lineal (run-rate): a este ritmo, cuánto se cerraría al final del periodo.
export function proyeccionLineal(acumulado, diasTranscurridos, diasTotales) {
  if (!diasTranscurridos || diasTranscurridos <= 0) return 0;
  return (acumulado / diasTranscurridos) * diasTotales;
}

// Progreso hacia una meta, en %. Devuelve null si no hay meta.
export function progresoMeta(valor, meta) {
  if (!meta || meta <= 0) return null;
  return (valor / meta) * 100;
}

// Día con mayor "mi ganancia" (40% de ventas) dentro del rango.
export function mejorDiaVentas(ventas, desde, hasta, split = SPLIT) {
  const porDia = {};
  ventas
    .filter((v) => v.fecha >= desde && v.fecha <= hasta)
    .forEach((v) => { porDia[v.fecha] = (porDia[v.fecha] || 0) + v.neto; });
  let mejor = null;
  for (const [fecha, neto] of Object.entries(porDia)) {
    const importe = neto * split.yo;
    if (!mejor || importe > mejor.importe) mejor = { fecha, importe };
  }
  return mejor;
}

// Capa de verificación: recalcula cifras por caminos independientes y comprueba que cuadran.
// Devuelve { ok, checks:[{nombre, ok, detalle}] }. Si algo falla, la UI avisa en vez de mostrar datos mal.
export function verificarDatos(d, split = SPLIT) {
  const ing = d.ingresos || [], ret = d.retiros || [], ven = d.ventas || [], gas = d.gastosNegocio || [], caja = d.caja || {};
  const checks = [];
  const add = (nombre, ok, detalle = '') => checks.push({ nombre, ok, detalle });

  // 1. Llegaron datos del origen
  add('Datos recibidos de Tradingverso', ing.length > 0 && (caja.disponible || 0) > 0,
    ing.length === 0 ? 'No llegaron ingresos' : (!(caja.disponible > 0) ? 'No llegó la caja' : ''));

  // 2. El detalle diario (ventas − gastos por fecha) cuadra con el beneficio del resumen, mes a mes
  let recOk = true, meses = [];
  ing.forEach((i) => {
    const a = `${i.mes}-01`;
    const b = `${i.mes}-${String(new Date(+i.mes.slice(0, 4), +i.mes.slice(5, 7), 0).getDate()).padStart(2, '0')}`;
    const detalle = ventasNetasEntre(ven, a, b) - gastosEntre(gas, a, b);
    if (Math.abs(detalle - i.beneficio) > 1) { recOk = false; meses.push(i.mes); }
  });
  add('El detalle diario cuadra con el resumen', recOk, recOk ? '' : `Desfase en: ${meses.join(', ')}`);

  // 3. La caja cuadra: pendiente de retirar == cash disponible + pendiente de cobro
  const pend = beneficioAcumulado(ing) - totalRetirado(ret);
  const cajaSuma = (caja.disponible || 0) + (caja.pendienteCobro || 0);
  add('La caja cuadra (disponible + por cobrar)', Math.abs(pend - cajaSuma) <= 1,
    Math.abs(pend - cajaSuma) <= 1 ? '' : `pendiente ${pend.toFixed(2)} ≠ caja ${cajaSuma.toFixed(2)}`);

  return { ok: checks.every((c) => c.ok), checks };
}

// Días transcurridos desde la última venta hasta `hoyISO` (racha sin ventas). 0 si hubo venta hoy.
export function diasDesdeUltimaVenta(ventas, hoyISO) {
  if (!ventas.length) return null;
  const fechas = ventas.map((v) => v.fecha).filter((fe) => fe <= hoyISO).sort();
  if (!fechas.length) return null;
  const ultima = fechas[fechas.length - 1];
  const ms = Date.parse(hoyISO + 'T00:00:00Z') - Date.parse(ultima + 'T00:00:00Z');
  return Math.round(ms / 86400000);
}

export function mesDeFecha(fechaISO) {
  return fechaISO.slice(0, 7);
}

export function gastoFijoMensual(gastosFijos) {
  return gastosFijos.reduce((acc, g) => acc + g.importe, 0);
}

export function retirosDelMes(retiros, mes) {
  return retiros
    .filter((r) => mesDeFecha(r.fecha) === mes)
    .reduce((acc, r) => acc + r.total, 0);
}

export function balanceMensual(beneficioMes, gastoFijo, retirosMes) {
  return beneficioMes - gastoFijo - retirosMes;
}

export function variacionPorcentual(actual, anterior) {
  if (!anterior) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

export function mejorPeorMes(ingresos) {
  if (ingresos.length === 0) return { mejor: null, peor: null };
  let mejor = ingresos[0];
  let peor = ingresos[0];
  for (const i of ingresos) {
    if (i.beneficio > mejor.beneficio) mejor = i;
    if (i.beneficio < peor.beneficio) peor = i;
  }
  return { mejor, peor };
}

export function cajaRestanteTrasRetiro(ingresos, retiros, fechaRetiro) {
  const mesRetiro = mesDeFecha(fechaRetiro);
  const beneficioHasta = ingresos
    .filter((i) => i.mes <= mesRetiro)
    .reduce((acc, i) => acc + i.beneficio, 0);
  const retiradoHasta = retiros
    .filter((r) => r.fecha <= fechaRetiro)
    .reduce((acc, r) => acc + r.total, 0);
  return beneficioHasta - retiradoHasta;
}

export function saldoReal(saldoBanco, gastosPendientes) {
  return saldoBanco - gastosPendientes;
}

// Formato español manual (no depende de datos ICU del entorno): 1.234,50 €
export function formatoEuros(n) {
  const neg = n < 0;
  const [ent, dec] = Math.abs(n).toFixed(2).split('.');
  const entFmt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${entFmt},${dec} €`;
}
