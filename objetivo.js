// "Cuánto tengo que facturar": del ticket que cobra el cliente al dinero que me queda
// limpio en el bolsillo. Sin DOM y sin fechas del sistema: testeable con `node --test`.
//
// La cadena de cálculo está confirmada con el usuario y NO se toca:
//   facturación → IVA → comisiones → fijos → beneficio → mi parte → cuota → IRPF → bolsillo
//
// Dos matices que se olvidan siempre:
//   · el ticket ya lleva el IVA dentro (no se suma, se saca de dentro);
//   · los deducibles (asesoría) se restan ANTES del IRPF y los gastos personales
//     (gimnasio) DESPUÉS, porque Hacienda no los admite.

import { formatoEuros } from './calculos.js';

// Valores reales del negocio a julio de 2026. Cambiarlos aquí cambia todo el módulo.
export const MODELO_DEFAULT = {
  ticket: 1497,          // € por venta, CON IVA incluido
  iva: 21,               // %
  comisionPct: 1.49,     // % sobre el neto (Stripe/PayPal, medido en 6 meses reales)
  fijosNegocio: 549.42,  // €/mes recurrentes del negocio (sin puntuales ni anuales)
  miShare: 40,           // % que me toca a mí (David tiene el 60)
  cuotaAutonomo: 80,     // €/mes, tarifa plana: se acabará y subirá mucho
  deducibles: 75,        // €/mes de asesoría, se restan ANTES del IRPF
  gastosPersonales: 27,  // €/mes de gimnasio, NO deducible: se resta DESPUÉS
  irpf: 20,              // %
};

// Las palancas comparan siempre contra estos objetivos fijos, para que el usuario
// vea el mismo escenario cada vez que entra y pueda compararlo mes a mes.
const TICKET_PALANCA = 2497;
const SHARE_PALANCA = 50;

// Número de usuario o de la hoja: vacío, null o basura -> el valor por defecto.
// Ojo: el 0 es un valor legítimo (ticket 0, fijos 0) y tiene que sobrevivir.
function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

// Porcentaje: como num pero acotado a 0..100. Un IRPF del 300% no existe.
function pct(v, porDefecto) {
  return Math.min(100, Math.max(0, num(v, porDefecto)));
}

// Porcentaje para pintar: 40 -> "40 %", 12.5 -> "12,5 %". Sin ceros de relleno.
function pctTexto(n) {
  return `${Number(n).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} %`;
}

// Número de ventas para pintar: 8.5 -> "8,5", 3 -> "3".
function ventasTexto(n) {
  return String(Math.round(Number(n) * 10) / 10).replace('.', ',');
}

// ---------------------------------------------------------------------------
// El modelo
// ---------------------------------------------------------------------------

// ¿Cuánto de un ticket es mío de verdad y cuánto es IVA que solo estoy guardando?
// El IVA va DENTRO del precio, así que se divide, no se resta.
export function netoDeTicket(ticket, ivaPct) {
  const t = num(ticket, 0);
  const factor = 1 + num(ivaPct, 0) / 100;
  if (!(factor > 0)) return 0;
  return t / factor;
}

// ¿Qué deja UNA venta? Lo que entra en el negocio y lo que acaba siendo mío,
// antes de tocar los gastos fijos del mes.
export function porVenta(m) {
  const x = normalizarModelo(m);
  const neto = netoDeTicket(x.ticket, x.iva);
  const comision = neto * (x.comisionPct / 100);
  const alNegocio = neto - comision;
  return {
    neto,
    comision,
    alNegocio,
    miParte: alNegocio * (x.miShare / 100),
  };
}

// La foto completa de un mes con N ventas: de la facturación bruta al bolsillo,
// con cada resta por el camino para poder enseñarla en cascada.
export function resultadoMensual(m, ventas) {
  const x = normalizarModelo(m);
  const v = num(ventas, 0);

  const facturacion = v * x.ticket;
  const iva = facturacion * (x.iva / 100) / (1 + x.iva / 100);
  const netoNegocio = facturacion - iva;
  const comisiones = netoNegocio * (x.comisionPct / 100);
  const fijos = x.fijosNegocio;
  const beneficio = netoNegocio - comisiones - fijos;
  const miParte = beneficio * (x.miShare / 100);
  const cuota = x.cuotaAutonomo;
  const deducibles = x.deducibles;
  const baseIrpf = miParte - cuota - deducibles;
  const irpfPagado = Math.max(0, baseIrpf) * (x.irpf / 100);
  const trasIrpf = miParte - cuota - irpfPagado;
  const bolsillo = trasIrpf - deducibles - x.gastosPersonales;

  return {
    ventas: v,
    facturacion,
    iva,
    netoNegocio,
    comisiones,
    fijos,
    beneficio,
    miParte,
    cuota,
    deducibles,
    baseIrpf,
    irpfPagado,
    trasIrpf,
    bolsillo,
  };
}

// ¿A partir de cuántas ventas el negocio deja de perder dinero? (beneficio = 0).
// Si una venta no deja nada (ticket 0, comisión del 100%), no hay punto muerto: null.
export function puntoMuerto(m) {
  const x = normalizarModelo(m);
  const { alNegocio } = porVenta(x);
  if (!(alNegocio > 0)) return null;
  return x.fijosNegocio / alNegocio;
}

// La pregunta del usuario al revés: "quiero quedarme limpio con X, ¿cuánto vendo?".
// Se despeja de una, sin tanteos. El IRPF tiene un max(0, ...) dentro, así que la
// función tiene dos tramos: se resuelve el de con-IRPF y, si la base sale negativa,
// se vuelve a despejar sin IRPF. null si ni vendiendo se llega (o hacen falta ventas
// negativas, que es la forma matemática de decir "imposible").
export function ventasParaLimpiar(m, objetivoBolsillo) {
  const x = normalizarModelo(m);
  const objetivo = num(objetivoBolsillo, 0);

  const P = porVenta(x).alNegocio;   // lo que deja una venta al negocio
  const S = x.miShare / 100;         // mi parte
  const F = x.fijosNegocio;
  const C = x.cuotaAutonomo;
  const D = x.deducibles;
  const G = x.gastosPersonales;
  const I = x.irpf / 100;

  // Sin margen por venta o sin parte del negocio, vender más no cambia nada.
  if (!(P > 0) || !(S > 0)) return null;

  // Agrupando la cadena entera:  bolsillo = (1 − I)·(X − C − D) − G,  con X = mi parte
  // del beneficio = (V·P − F)·S. De ahí sale X y de X salen las ventas.
  const ventasDesdeX = (X) => (X / S + F) / P;

  let X = null;

  // Tramo 1: pago IRPF (baseIrpf > 0).
  const unoMenosI = 1 - I;
  if (unoMenosI > 0) {
    const candidato = (objetivo + G) / unoMenosI + C + D;
    if (candidato - C - D > 0) X = candidato;
  }

  // Tramo 2: no pago IRPF porque la base es 0 o negativa.
  if (X === null) {
    const candidato = objetivo + C + D + G;
    if (candidato - C - D <= 0) X = candidato;
  }

  if (X === null || !Number.isFinite(X)) return null;

  const ventasExactas = ventasDesdeX(X);
  if (!Number.isFinite(ventasExactas) || ventasExactas < 0) return null;

  const facturacionMes = ventasExactas * x.ticket;
  return {
    ventas: Math.round(ventasExactas * 10) / 10,
    ventasExactas,
    facturacionMes,
    facturacionAnio: facturacionMes * 12,
  };
}

// La misma tabla que el usuario dibuja en un papel: qué pasa con 1, 2, 5, 10 ventas.
// `porVentaAdicional` es lo que suma subir del escalón anterior a este; en el primero
// no hay escalón anterior, así que va null.
export function escalera(m, listaVentas) {
  const x = normalizarModelo(m);
  const lista = Array.isArray(listaVentas) ? listaVentas : [];
  let anterior = null;
  return lista.map((v) => {
    const r = resultadoMensual(x, v);
    const porVentaAdicional = anterior === null ? null : r.bolsillo - anterior;
    anterior = r.bolsillo;
    return { ...r, porVentaAdicional };
  });
}

// ¿Qué mover primero? Compara los seis cambios posibles sobre el mismo mes y los
// ordena por lo que suman al bolsillo. La primera de la lista es la que más paga.
export function palancas(m, ventasBase) {
  const x = normalizarModelo(m);
  const v = num(ventasBase, 0);
  const base = resultadoMensual(x, v).bolsillo;
  const con = (cambios, ventas = v) => resultadoMensual({ ...x, ...cambios }, ventas).bolsillo;

  const lista = [
    {
      nombre: 'Subir el ticket',
      detalle: `De ${formatoEuros(x.ticket)} a ${formatoEuros(TICKET_PALANCA)} por venta`,
      bolsilloNuevo: con({ ticket: TICKET_PALANCA }),
    },
    {
      nombre: 'Renegociar mi parte',
      detalle: `Del ${pctTexto(x.miShare)} al ${pctTexto(SHARE_PALANCA)} del beneficio`,
      bolsilloNuevo: con({ miShare: SHARE_PALANCA }),
    },
    {
      nombre: 'Recortar los fijos a la mitad',
      detalle: `De ${formatoEuros(x.fijosNegocio)} a ${formatoEuros(x.fijosNegocio / 2)} al mes`,
      bolsilloNuevo: con({ fijosNegocio: x.fijosNegocio / 2 }),
    },
    {
      nombre: 'Dejar de pagar IRPF',
      detalle: `Del ${pctTexto(x.irpf)} al 0 % (mudarse a Dubái)`,
      bolsilloNuevo: con({ irpf: 0 }),
    },
    {
      nombre: 'Una venta más al mes',
      detalle: `De ${ventasTexto(v)} a ${ventasTexto(v + 1)} ventas`,
      bolsilloNuevo: con({}, v + 1),
    },
    {
      nombre: 'Doblar las ventas',
      detalle: `De ${ventasTexto(v)} a ${ventasTexto(v * 2)} ventas`,
      bolsilloNuevo: con({}, v * 2),
    },
  ];

  return lista
    .map((p) => ({ ...p, delta: p.bolsilloNuevo - base }))
    .sort((a, b) => b.delta - a.delta);
}

// ---------------------------------------------------------------------------
// Puente con los datos reales de Tradingverso
// ---------------------------------------------------------------------------

// Una comisión de pasarela no es un gasto fijo: ya se resta antes, por venta.
// Si la contáramos aquí la estaríamos restando dos veces.
const RE_COMISION = /comisi/i;

function esComision(g) {
  const x = g || {};
  return RE_COMISION.test(String(x.categoria ?? '')) || RE_COMISION.test(String(x.concepto ?? ''));
}

// El mes 'YYYY-MM' de una fila. '' si la fecha no sirve.
function mesFila(x) {
  const mes = String((x && x.fecha) ?? '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(mes) ? mes : '';
}

// Un mes 'YYYY-MM' desplazado n meses (negativo = hacia atrás). Aritmética de enteros
// a propósito: usar Date aquí metería la zona horaria del sistema en un módulo puro.
function mesMas(mes, n) {
  const total = Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) - 1) + n;
  const anio = Math.floor(total / 12);
  return `${String(anio).padStart(4, '0')}-${String(total - anio * 12 + 1).padStart(2, '0')}`;
}

// La ventana sobre la que se promedia: los N meses de CALENDARIO que terminan en el mes
// más reciente con datos. No "los N meses que tienen filas": un mes sin ventas (o sin
// gastos apuntados) vale cero y tiene que seguir contando en el denominador. Si
// desapareciera, la media saldría inflada y el texto de la fuente diría un rango que no
// es el que se ha dividido.
// El principio se recorta al primer mes con datos: antes de empezar no había negocio que
// promediar, y dividir por meses anteriores al primero hundiría la media al revés.
function ventanaMeses(listas, n) {
  const meses = new Set();
  for (const lista of listas || []) {
    for (const x of lista || []) {
      const mes = mesFila(x);
      if (mes) meses.add(mes);
    }
  }
  if (!meses.size) return [];
  const ordenados = [...meses].sort();
  const ultimo = ordenados[ordenados.length - 1];
  const primero = ordenados[0];
  let inicio = mesMas(ultimo, -(Math.max(1, n) - 1));
  if (inicio < primero) inicio = primero;
  const rango = [];
  for (let mes = inicio; mes <= ultimo; mes = mesMas(mes, 1)) rango.push(mes);
  return rango;
}

// Rellena el modelo con lo que de verdad ha pasado: los fijos son la media real de
// los últimos 3 meses (comisiones aparte) y las ventas, las que hubo de media.
// Si no llegan datos no se inventa nada: se queda con los valores de `base`.
//
// `opciones.mesActual` ('YYYY-MM') es el mes que todavía está abierto. El módulo es puro
// y no puede mirar el reloj, así que "hoy" entra por aquí, desde quien sí lo tiene.
// Sin él el comportamiento es el de siempre: cuenta todo lo que llegue.
export function modeloDesdeDatos(datos, base = MODELO_DEFAULT, opciones) {
  const b = normalizarModelo(base);
  const d = datos || {};
  const o = opciones || {};
  const gastos = Array.isArray(d.gastosNegocio) ? d.gastosNegocio : [];
  const ventas = Array.isArray(d.ventas) ? d.ventas : [];

  // El mes en curso no ha terminado: si el día 3 lleva una venta, pesaría en el
  // denominador lo mismo que un mes cerrado de diez y hundiría la media justo el día que
  // se abre la app. Se deja fuera... salvo que no quede ningún mes cerrado con datos:
  // entonces es mejor un mes a medias que una pantalla vacía, y se dice en el texto.
  const mesActual = /^\d{4}-\d{2}$/.test(String(o.mesActual ?? '')) ? String(o.mesActual) : '';
  const esAbierto = (x) => {
    const mes = mesFila(x);
    return Boolean(mesActual) && Boolean(mes) && mes >= mesActual;
  };
  const conFecha = (x) => Boolean(mesFila(x));
  const hayAbierto = gastos.some(esAbierto) || ventas.some(esAbierto);
  const hayCerrado = gastos.some((g) => conFecha(g) && !esAbierto(g))
    || ventas.some((v) => conFecha(v) && !esAbierto(v));
  const fueraElAbierto = hayAbierto && hayCerrado;
  const filtrar = (lista) => (fueraElAbierto ? lista.filter((x) => !esAbierto(x)) : lista);
  const gastosVentana = filtrar(gastos);
  const ventasVentana = filtrar(ventas);

  // Una sola ventana para los dos: fijos de un trimestre y ventas de otro alimentando el
  // mismo mes no cuadran bajo ninguna lectura, y se desalineaban en silencio.
  const meses = ventanaMeses([gastosVentana, ventasVentana], 3);
  const enVentana = (x) => meses.includes(mesFila(x));

  const gastosDentro = gastosVentana.filter(enVentana);
  let fijosNegocio = b.fijosNegocio;
  let fuenteFijos = 'defecto';
  if (gastosDentro.length) {
    const total = gastosDentro
      .filter((g) => !esComision(g))
      .reduce((acc, g) => acc + num(g && g.total, 0), 0);
    fijosNegocio = total / meses.length;
    fuenteFijos = 'datos';
  }

  const ventasDentro = ventasVentana.filter(enVentana);
  let ventasMedia = 0;
  let fuenteVentas = 'defecto';
  if (ventasDentro.length) {
    ventasMedia = ventasDentro.length / meses.length;
    fuenteVentas = 'datos';
  }

  const rango = (lista) => (lista.length === 1 ? lista[0] : `${lista[0]} a ${lista[lista.length - 1]}`);
  const textos = [
    fuenteFijos === 'datos'
      ? `Fijos: media real de ${rango(meses)}, sin contar comisiones`
      : 'Fijos: valor por defecto, no llegaron gastos',
    fuenteVentas === 'datos'
      ? `Ventas: media real de ${rango(meses)}`
      : 'Ventas: valor por defecto, no llegaron ventas',
  ];
  if (fueraElAbierto) {
    textos.push(`El mes en curso (${mesActual}) no cuenta todavía: aún no ha terminado`);
  } else if (hayAbierto) {
    textos.push(`Incluye el mes en curso (${mesActual}), que aún no ha terminado: la media se moverá`);
  }

  return {
    modelo: normalizarModelo({ ...b, fijosNegocio }),
    ventasMedia,
    fuente: {
      fijosNegocio: fuenteFijos,
      ventasMedia: fuenteVentas,
      meses,
      mesesVentas: meses,
      mesEnCurso: mesActual || null,
      incluyeMesEnCurso: hayAbierto && !fueraElAbierto,
      texto: textos.join(' · '),
    },
  };
}

// ---------------------------------------------------------------------------
// IRPF de verdad: por tramos, no plano
// ---------------------------------------------------------------------------
//
// El 20 % del modelo es lo que se RETIENE cada mes, no lo que se acaba pagando.
// El IRPF español es progresivo: cada tramo tributa a su tipo, solo por la parte
// que cae dentro. Por eso "pasar al 30 %" no sube el recibo entero: sube solo lo
// que sobrepase los 20.200 €.
//
// Confundir el tipo marginal con el medio hace dos daños opuestos:
//   · con pocos ingresos crea miedo (crees pagar 20 % y pagas 11 %);
//   · con muchos crea un agujero (crees pagar 20 % y pagas 36 %).
//
// Escala general estatal + autonómica agregada. Las comunidades cambian su mitad,
// así que esto aproxima: sirve para decidir, no para liquidar.
export const TRAMOS_IRPF = [
  { hasta: 12450, tipo: 19 },
  { hasta: 20200, tipo: 24 },
  { hasta: 35200, tipo: 30 },
  { hasta: 60000, tipo: 37 },
  { hasta: 300000, tipo: 45 },
  { hasta: Infinity, tipo: 47 },
];

// Mínimo personal: el primer tramo de renta que no tributa (soltero, sin hijos).
export const MINIMO_PERSONAL = 5550;

// Cuota íntegra de una base, recorriendo la escala tramo a tramo.
function cuotaEscala(base, tramos) {
  let cuota = 0;
  let suelo = 0;
  for (const t of tramos) {
    if (base <= suelo) break;
    cuota += (Math.min(base, t.hasta) - suelo) * (t.tipo / 100);
    suelo = t.hasta;
  }
  return cuota;
}

// IRPF anual real de una base. El mínimo personal no se resta de la base: se
// convierte en cuota a la misma escala y se descuenta. Así lo hace Hacienda.
export function irpfPorTramos(baseAnual, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const base = Math.max(0, num(baseAnual, 0));
  const minimo = Math.max(0, num(minimoPersonal, 0));
  const t = Array.isArray(tramos) && tramos.length ? tramos : TRAMOS_IRPF;
  return Math.max(0, cuotaEscala(base, t) - cuotaEscala(Math.min(base, minimo), t));
}

// El porcentaje que de verdad se paga sobre el total, no el del último tramo.
// Este es el número que quita el miedo: siempre queda por debajo del marginal.
export function tipoMedioReal(baseAnual, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const base = Math.max(0, num(baseAnual, 0));
  if (!(base > 0)) return 0;
  return (irpfPorTramos(base, tramos, minimoPersonal) / base) * 100;
}

// El tipo del tramo en el que cae el siguiente euro ganado.
export function tipoMarginal(baseAnual, tramos = TRAMOS_IRPF) {
  const base = Math.max(0, num(baseAnual, 0));
  const t = Array.isArray(tramos) && tramos.length ? tramos : TRAMOS_IRPF;
  for (const tr of t) if (base <= tr.hasta) return tr.tipo;
  return t[t.length - 1].tipo;
}

// Lo retenido durante el año contra lo que de verdad toca pagar.
// `diferencia` positiva = Hacienda devuelve; negativa = hay que apartar dinero.
export function irpfAnualReal(m, ventas, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const x = normalizarModelo(m);
  const mes = resultadoMensual(x, ventas);
  const baseAnual = mes.baseIrpf * 12;
  const irpfReal = irpfPorTramos(baseAnual, tramos, minimoPersonal);
  const irpfRetenido = mes.irpfPagado * 12;
  return {
    baseAnual,
    irpfReal,
    irpfRetenido,
    diferencia: irpfRetenido - irpfReal,
    tipoMedio: tipoMedioReal(baseAnual, tramos, minimoPersonal),
    tipoMarginal: tipoMarginal(baseAnual, tramos),
    // Lo que de verdad queda en el bolsillo al cerrar el año, con el IRPF real.
    bolsilloAnualReal: mes.miParte * 12 - x.cuotaAutonomo * 12 - irpfReal
      - x.deducibles * 12 - x.gastosPersonales * 12,
  };
}

// ---------------------------------------------------------------------------
// España contra Dubái
// ---------------------------------------------------------------------------
//
// Mudarse no sale gratis: montar y mantener la estructura cuesta lo mismo se gane
// poco o mucho. Por eso es una palanca con umbral, no una mejora automática.
// Por debajo del umbral se pierde dinero; por encima, la diferencia se dispara.
export const DUBAI_DEFAULT = {
  costeAnual: 10000,          // €/año: constitución amortizada, renovación, contabilidad, oficina
  impuestoSociedades: 9,      // % sobre el beneficio que pase del mínimo exento
  minimoExento: 94000,        // € (≈375.000 AED) por debajo de los cuales no se tributa
};

// Lo que queda al año en cada sitio con N ventas al mes.
export function comparativaFiscal(m, ventas, dubai = DUBAI_DEFAULT, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const x = normalizarModelo(m);
  const d = normalizarDubai(dubai);
  const mes = resultadoMensual(x, ventas);
  const miParteAnual = mes.miParte * 12;

  const irpfReal = irpfPorTramos(mes.baseIrpf * 12, tramos, minimoPersonal);
  const espanaPaga = irpfReal + x.cuotaAutonomo * 12;
  const espanaQueda = miParteAnual - espanaPaga;

  const impuestoUae = Math.max(0, miParteAnual - d.minimoExento) * (d.impuestoSociedades / 100);
  const dubaiPaga = impuestoUae + d.costeAnual;
  const dubaiQueda = miParteAnual - dubaiPaga;

  return {
    miParteAnual,
    espana: { paga: espanaPaga, queda: espanaQueda, irpf: irpfReal, cuota: x.cuotaAutonomo * 12 },
    dubai: { paga: dubaiPaga, queda: dubaiQueda, impuesto: impuestoUae, coste: d.costeAnual },
    diferencia: dubaiQueda - espanaQueda,
    compensa: dubaiQueda > espanaQueda,
  };
}

// ¿A partir de cuántas ventas al mes compensa mudarse? Búsqueda binaria sobre la
// diferencia, que crece de forma monótona con las ventas.
// null si no compensa nunca dentro de un rango razonable.
export function ventasParaDubai(m, dubai = DUBAI_DEFAULT, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const dif = (v) => comparativaFiscal(m, v, dubai, tramos, minimoPersonal).diferencia;
  const MAX = 1000;
  if (dif(MAX) <= 0) return null;
  if (dif(0) > 0) return 0;
  let lo = 0;
  let hi = MAX;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (dif(mid) > 0) hi = mid; else lo = mid;
  }
  return hi;
}

// Limpia los ajustes de Dubái igual que normalizarModelo hace con el modelo.
export function normalizarDubai(d) {
  const x = d || {};
  const b = DUBAI_DEFAULT;
  return {
    costeAnual: Math.max(0, num(x.costeAnual, b.costeAnual)),
    impuestoSociedades: pct(x.impuestoSociedades, b.impuestoSociedades),
    minimoExento: Math.max(0, num(x.minimoExento, b.minimoExento)),
  };
}

// Limpia lo que el usuario teclea en "Ajustes del modelo": un campo vacío vuelve a su
// valor por defecto y los porcentajes no se salen de 0..100. Nunca devuelve NaN.
export function normalizarModelo(m) {
  const x = m || {};
  const d = MODELO_DEFAULT;
  return {
    ticket: num(x.ticket, d.ticket),
    iva: pct(x.iva, d.iva),
    comisionPct: pct(x.comisionPct, d.comisionPct),
    fijosNegocio: num(x.fijosNegocio, d.fijosNegocio),
    miShare: pct(x.miShare, d.miShare),
    cuotaAutonomo: num(x.cuotaAutonomo, d.cuotaAutonomo),
    deducibles: num(x.deducibles, d.deducibles),
    gastosPersonales: num(x.gastosPersonales, d.gastosPersonales),
    irpf: pct(x.irpf, d.irpf),
  };
}
