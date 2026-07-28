// Patrimonio personal: cuentas, reservas y objetivos. Sin DOM: testeable con `node --test`.
// Modelo SOBRE: los objetivos son etiquetas sobre el dinero que ya está en las cuentas,
// nunca dinero aparte. Por eso el total es solo la suma de cuentas.

import { irpfAcumulado } from './calculos.js';

export const PATRIMONIO_VACIO = { cuentas: [], objetivos: [] };

const TIPOS_CUENTA = ['banco', 'cripto', 'efectivo'];
const CLASES_OBJETIVO = ['reserva', 'objetivo'];

// Número de usuario: vacío, NaN o basura -> 0. Nunca propaga NaN a la UI.
function num(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Texto de usuario: recorta espacios; null/undefined -> ''.
function texto(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

// Formato español, igual que formatoEuros. Local a propósito: este módulo solo
// importa irpfAcumulado de calculos.js (contrato del diseño).
function euros(n) {
  const neg = n < 0;
  const [ent, dec] = Math.abs(n).toFixed(2).split('.');
  const entFmt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${entFmt},${dec} €`;
}

// Lo que tengo de verdad: suma de todas las cuentas.
export function totalCuentas(cuentas) {
  return (cuentas || []).reduce((acc, c) => acc + num(c && c.importe), 0);
}

// Dinero con etiqueta puesta (reservas + objetivos). No es dinero extra.
export function totalAsignado(objetivos) {
  return (objetivos || []).reduce((acc, o) => acc + num(o && o.asignado), 0);
}

// Asignado de una sola clase: 'reserva' o 'objetivo'.
export function totalPorClase(objetivos, clase) {
  return (objetivos || [])
    .map(normalizarObjetivo)
    .filter((o) => o.clase === clase)
    .reduce((acc, o) => acc + o.asignado, 0);
}

// Lo que queda sin etiquetar. Puede ser NEGATIVO: eso significa sobreasignado.
export function libreDeVerdad(cuentas, objetivos) {
  return totalCuentas(cuentas) - totalAsignado(objetivos);
}

// Progreso de un objetivo. Sin meta (0) no hay progreso que enseñar.
// pct NO se recorta: si asignado > meta pasa de 100 y así se ve.
export function progresoObjetivo(objetivo) {
  const o = normalizarObjetivo(objetivo);
  if (o.meta <= 0) return { pct: null, falta: null, completo: false };
  return {
    pct: (o.asignado / o.meta) * 100,
    falta: Math.max(0, o.meta - o.asignado),
    completo: o.asignado >= o.meta,
  };
}

// Foto completa del patrimonio + avisos ya redactados, listos para pintar.
export function estadoPatrimonio(cuentas, objetivos) {
  const lista = (objetivos || []).map(normalizarObjetivo);
  const total = totalCuentas(cuentas);
  const asignado = totalAsignado(lista);
  const reservas = totalPorClase(lista, 'reserva');
  const objetivosTotal = totalPorClase(lista, 'objetivo');
  const libre = total - asignado;
  const sobreasignado = asignado > total;
  const exceso = sobreasignado ? asignado - total : 0;

  const avisos = [];
  if (sobreasignado) {
    avisos.push(`Sobreasignado: has repartido ${euros(exceso)} más de lo que tienes en las cuentas.`);
  }
  lista.forEach((o) => {
    if (progresoObjetivo(o).completo) {
      avisos.push(`"${o.nombre || 'Sin nombre'}" ya está completo: ${euros(o.asignado)} de ${euros(o.meta)}.`);
    }
  });

  return { total, reservas, objetivos: objetivosTotal, asignado, libre, sobreasignado, exceso, avisos };
}

// Cuánto convendría reservar para Hacienda: el IRPF de todo lo retirado hasta hoy.
export function sugerenciaImpuestos(retiros, irpfCfg, split) {
  return irpfAcumulado(retiros || [], undefined, irpfCfg, split);
}

// Cuánto convendría reservar para el mes que viene: los gastos fijos. Nunca negativo.
export function sugerenciaGastosFijos(gastosFijosTotal) {
  return Math.max(0, num(gastosFijosTotal));
}

// Limpia lo que escribe el usuario. Tipo inválido -> 'banco'.
export function normalizarCuenta(c) {
  const x = c || {};
  return {
    nombre: texto(x.nombre),
    importe: num(x.importe),
    tipo: TIPOS_CUENTA.includes(x.tipo) ? x.tipo : 'banco',
  };
}

// Limpia lo que escribe el usuario. Clase inválida -> 'objetivo'. La nota solo va si hay nota.
export function normalizarObjetivo(o) {
  const x = o || {};
  const limpio = {
    nombre: texto(x.nombre),
    asignado: num(x.asignado),
    meta: num(x.meta),
    clase: CLASES_OBJETIVO.includes(x.clase) ? x.clase : 'objetivo',
  };
  const nota = texto(x.nota);
  if (nota) limpio.nota = nota;
  return limpio;
}
