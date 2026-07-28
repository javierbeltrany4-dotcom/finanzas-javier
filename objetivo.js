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

import { formatoEuros, ventasNetasEntre, gastosEntre, retirosEntre } from './calculos.js';

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
// El try no es paranoia: `Number(v)` LANZA un TypeError si v es un objeto con una clave
// `toString` que no sea función, y eso llega desde una copia de seguridad importada
// ({"ticket": {"toString": 1}} es JSON válido). Ver la nota larga en respaldo.js.
function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
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

// A partir de qué día del mes el mes en curso ya cuenta como un mes más de la ventana.
//
// POR QUÉ EXISTE ESTE NÚMERO. Dejar el mes abierto SIEMPRE fuera parecía lo prudente y
// resultó ser lo contrario: a 28/07/2026, con los gastos reales del negocio en
// 293,86 (abril) · 368,30 (mayo) · 675,66 (junio) · 934,17 (julio), la ventana cerrada
// (abril-junio, sin comisiones) daba 320,94 EUR/mes de fijos mientras el mes que se estaba
// viviendo ya iba por 934,17. La pantalla decía que el negocio cuesta 321 al mes con el
// recibo de 934 encima de la mesa: el punto muerto, la cascada y las palancas salían todos
// baratos de más, y el error crecía justo cuando los gastos suben.
//
// El corte en 15 es el punto en el que el mes ya ha contado más de la mitad de sus días:
// por debajo, meterlo en el denominador como un mes entero hunde la media (dos días flojos
// valdrían lo mismo que un mes de treinta); por encima, dejarlo fuera esconde lo que de
// verdad está pasando. Sigue siendo un mes incompleto contado como completo, así que en la
// segunda quincena la media de VENTAS sale conservadora a propósito: preferimos pedir de
// más que prometer de menos. Y la pantalla enseña las dos cifras por separado (la media de
// la ventana y el mes en curso suelto) para que nadie tenga que fiarse de una sola.
const DIA_PARA_CONTAR_EL_MES_EN_CURSO = 15;

// Rellena el modelo con lo que de verdad ha pasado: los fijos son la media real de
// los últimos 3 meses (comisiones aparte) y las ventas, las que hubo de media.
// Si no llegan datos no se inventa nada: se queda con los valores de `base`.
//
// `opciones.mesActual` ('YYYY-MM') es el mes que todavía está abierto. El módulo es puro
// y no puede mirar el reloj, así que "hoy" entra por aquí, desde quien sí lo tiene.
// Sin él el comportamiento es el de siempre: cuenta todo lo que llegue.
//
// `opciones.hoy` ('YYYY-MM-DD') es lo mismo pero con el día dentro, y es lo que permite
// aplicar la regla de los 15 días de arriba. Si solo llega `mesActual` no hay día que
// mirar y el mes en curso se queda fuera, que es la conducta de siempre.
export function modeloDesdeDatos(datos, base = MODELO_DEFAULT, opciones) {
  const b = normalizarModelo(base);
  const d = datos || {};
  const o = opciones || {};
  const gastos = Array.isArray(d.gastosNegocio) ? d.gastosNegocio : [];
  const ventas = Array.isArray(d.ventas) ? d.ventas : [];

  // El mes en curso no ha terminado: si el día 3 lleva una venta, pesaría en el
  // denominador lo mismo que un mes cerrado de diez y hundiría la media justo el día que
  // se abre la app. Se deja fuera... salvo que ya lleve más de medio mes andado (ver
  // DIA_PARA_CONTAR_EL_MES_EN_CURSO) o que no quede ningún mes cerrado con datos: entonces
  // es mejor un mes a medias que una pantalla vacía, y se dice en el texto.
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(o.hoy ?? '')) ? String(o.hoy) : '';
  const mesActual = /^\d{4}-\d{2}$/.test(String(o.mesActual ?? ''))
    ? String(o.mesActual)
    : (hoy ? hoy.slice(0, 7) : '');
  // El día solo vale si es el día DE ese mes: un `hoy` de otro mes distinto del que se dice
  // abierto no puede decidir si ese mes está medio andado o recién empezado.
  const diaDelMes = hoy && mesActual === hoy.slice(0, 7) ? Number(hoy.slice(8, 10)) : 0;
  const mesEnCursoYaCuenta = Number.isFinite(diaDelMes) && diaDelMes > DIA_PARA_CONTAR_EL_MES_EN_CURSO;

  const esAbierto = (x) => {
    const mes = mesFila(x);
    return Boolean(mesActual) && Boolean(mes) && mes >= mesActual;
  };
  const conFecha = (x) => Boolean(mesFila(x));
  const hayAbierto = gastos.some(esAbierto) || ventas.some(esAbierto);
  const hayCerrado = gastos.some((g) => conFecha(g) && !esAbierto(g))
    || ventas.some((v) => conFecha(v) && !esAbierto(v));
  const fueraElAbierto = hayAbierto && hayCerrado && !mesEnCursoYaCuenta;
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

  // El mes en curso SUELTO, con la misma vara que la media (sin comisiones). No entra en
  // ningún cálculo: existe para poder enseñarlo al lado de la media y que se vea de un
  // vistazo si el mes que se está viviendo se ha ido por encima. `null` cuando no hay mes
  // abierto que mirar o cuando todavía no ha llegado ni un gasto suyo: un 0 se leería como
  // "este mes no has gastado nada", que es una afirmación, no una ausencia de dato.
  const gastosDelMesEnCurso = mesActual ? gastos.filter((g) => mesFila(g) === mesActual) : [];
  const fijosMesEnCurso = gastosDelMesEnCurso.length
    ? gastosDelMesEnCurso
      .filter((g) => !esComision(g))
      .reduce((acc, g) => acc + num(g && g.total, 0), 0)
    : null;

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
  } else if (hayAbierto && mesEnCursoYaCuenta) {
    textos.push(`Incluye el mes en curso (${mesActual}), que ya lleva más de ${DIA_PARA_CONTAR_EL_MES_EN_CURSO} días: cuenta entero y la media se moverá`);
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
      // Las dos cifras que la pantalla enseña juntas en Ajustes: la media de la ventana (la
      // que de verdad se usa) y lo que lleva el mes abierto. Ver DIA_PARA_CONTAR_EL_MES_EN_CURSO.
      fijosMedia: fuenteFijos === 'datos' ? fijosNegocio : null,
      fijosMesEnCurso,
      diaDelMes: diaDelMes || null,
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

// La misma escala pero con los DOS límites de cada tramo, para poder pintarla entera en
// pantalla sin que la vista tenga que reconstruir los "desde" a mano (y equivocarse).
// El último tramo no tiene techo: su `hasta` es Infinity, y así se dice en vez de
// inventarse un número redondo que no existe en la ley.
export const TRAMOS_IRPF_TEXTO = TRAMOS_IRPF.map((t, i) => ({
  desde: i === 0 ? 0 : TRAMOS_IRPF[i - 1].hasta,
  hasta: t.hasta,
  tipo: t.tipo,
}));

// Mínimo personal: el primer tramo de renta que no tributa (soltero, sin hijos).
export const MINIMO_PERSONAL = 5550;

// SMI 2026 = 1.221 EUR/mes en 14 pagas. Es el techo de rendimiento neto anual por debajo
// del cual se puede PRORROGAR el segundo año de tarifa plana (80 EUR/mes de cuota).
// FUENTE: docs/investigacion-fiscal-2026.md, secciones 2.2 y 7.5
//         (art. 38 ter Ley 20/2007 · RD 126/2026).
// Es el mismo número que decisiones.js expone como UMBRALES.smiAnual. No se importa de
// allí porque decisiones.js ya importa de aquí y sería un ciclo; hay un test que comprueba
// que las dos copias siguen diciendo lo mismo.
export const SMI_ANUAL = 17094;

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

// El bolsillo de un mes pero con el IRPF REAL: la base mensual anualizada pasa por la
// escala (irpfPorTramos(baseIrpf·12)/12) en vez de por la retención plana del modelo.
// Vivía en la vista; la lógica de dinero no vive en vistas, así que se movió aquí.
export function bolsilloRealMes(m, ventas, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  return irpfAnualReal(m, ventas, tramos, minimoPersonal).bolsilloAnualReal / 12;
}

// "Quiero quedarme limpio con X DE VERDAD": la inversa contra bolsilloRealMes.
// Con la escala por tramos no hay despeje cerrado como en ventasParaLimpiar: se busca
// por bisección, que vale porque el bolsillo real crece de forma monótona con las
// ventas. Devuelve la misma forma que la inversa plana; null si ni 10000 ventas llegan.
export function ventasParaLimpiarReal(m, objetivoBolsillo, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const x = normalizarModelo(m);
  const objetivo = num(objetivoBolsillo, 0);
  const MAX = 10000;
  const bolsillo = (v) => bolsilloRealMes(x, v, tramos, minimoPersonal);

  if (!(bolsillo(MAX) >= objetivo)) return null;

  let ventasExactas = 0;
  if (!(bolsillo(0) >= objetivo)) {
    let lo = 0;
    let hi = MAX;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (bolsillo(mid) >= objetivo) hi = mid; else lo = mid;
    }
    ventasExactas = hi;
  }

  const facturacionMes = ventasExactas * x.ticket;
  return {
    ventas: Math.round(ventasExactas * 10) / 10,
    ventasExactas,
    facturacionMes,
    facturacionAnio: facturacionMes * 12,
  };
}

// El camino inverso al que necesita la pestaña "Dónde vivir": "para tener X euros de
// beneficio ANUAL mío, ¿cuántas ventas al mes hacen falta?".
//
// `beneficioAnual` es exactamente la magnitud que compara residencia.js (supuesto 1 de la
// sección 6 del informe): mi parte del beneficio del negocio, ANTES de cuota de autónomo e
// impuestos y después de los gastos del negocio. Es decir, resultadoMensual().miParte × 12.
//
// Se invierte con dos evaluaciones del propio modelo en vez de reescribir aquí la fórmula:
// miParte es lineal en las ventas ((V·P − F)·S), así que dos puntos la determinan, y si
// algún día cambia la cadena de cálculo esto sigue siendo correcto solo.
//
// null cuando una venta más no mueve el beneficio (ticket 0, comisión del 100 %, mi parte
// al 0 %): ahí no hay ventas que pedir, y devolver un número sería mentir.
export function ventasParaBeneficioAnual(m, beneficioAnual) {
  const x = normalizarModelo(m);
  const objetivo = num(beneficioAnual, 0);
  const enCero = resultadoMensual(x, 0).miParte * 12;
  const enUna = resultadoMensual(x, 1).miParte * 12;
  const pendiente = enUna - enCero;
  if (!(pendiente > 0)) return null;
  const ventas = (objetivo - enCero) / pendiente;
  return Number.isFinite(ventas) ? Math.max(0, ventas) : null;
}

// En qué tramo de la escala cae una base anual (0..5). Base negativa o nula: tramo 0.
function indiceTramo(baseAnual, tramos = TRAMOS_IRPF) {
  const base = Math.max(0, num(baseAnual, 0));
  const t = Array.isArray(tramos) && tramos.length ? tramos : TRAMOS_IRPF;
  for (let i = 0; i < t.length; i++) if (base <= t[i].hasta) return i;
  return t.length - 1;
}

// Dónde cae exactamente una base dentro de la escala, con las dos distancias que hacen
// falta para decirlo en una frase: cuánto sobra del tramo anterior y cuánto falta para el
// siguiente. Sin esto la pantalla solo puede decir "estás en el 19 %", que no ayuda a
// decidir; con esto puede decir "te faltan 4.970 € para entrar en el 24 %".
//
// La frontera pertenece al tramo de ABAJO: con 12.450 € clavados se está en el 19 %, no en
// el 24 %, y `faltaParaElSiguiente` es 0. Es el mismo criterio que usa tipoMarginal, así
// que las dos funciones nunca se contradicen.
// En el último tramo no hay siguiente: `faltaParaElSiguiente` va null, no Infinity, porque
// la pantalla tiene que poder distinguir "te falta muchísimo" de "no hay más escalera".
export function tramoDe(base, tramos = TRAMOS_IRPF) {
  const t = Array.isArray(tramos) && tramos.length ? tramos : TRAMOS_IRPF;
  const b = Math.max(0, num(base, 0));
  const indice = indiceTramo(b, t);
  const desde = indice === 0 ? 0 : t[indice - 1].hasta;
  const hasta = t[indice].hasta;
  return {
    indice,
    tipo: t[indice].tipo,
    desde,
    hasta,
    faltaParaElSiguiente: Number.isFinite(hasta) ? hasta - b : null,
    sobraDelAnterior: b - desde,
  };
}

// Meses transcurridos del año CON DECIMALES: los meses ya cerrados más la fracción del que
// está en curso. Con meses enteros, el día 1 de cada mes el divisor sube de golpe mientras
// los ingresos del mes nuevo aún son cero: la proyección se desplomaba un 19 % de un día
// para otro y parecía que el negocio se hundía. Contando la fracción, la curva es continua.
//
// `hoy` ya viene validado contra /^\d{4}-\d{2}-\d{2}$/ y `meses` está entre 1 y 12, así que
// aquí no hay NaN posible. El día sí se acota a un día real del mes: '2026-01-00' pasa el
// regex y dejaba el divisor en 0 (proyección infinita), y un 31 de febrero contaría de más.
function transcurridoDelAnio(hoy, meses) {
  const diasDelMes = new Date(Date.UTC(Number(hoy.slice(0, 4)), meses, 0)).getUTCDate();
  const dia = Math.min(Math.max(Number(hoy.slice(8, 10)), 1), diasDelMes);
  return (meses - 1) + dia / diasDelMes;
}

// La foto del año EN CURSO por DEVENGO: su 40 % del beneficio del negocio, tenga o no
// tenga ese dinero en la mano.
//
// CUIDADO: esto NO es su base fiscal y no hay que enseñarlo como tal. Él es un autónomo
// español que FACTURA a la empresa alemana de su socio, y solo tributa por lo que factura;
// el 40 % del beneficio que no ha facturado sigue en la caja del negocio y no es renta
// suya todavía. Para la base fiscal de verdad está `rentaFiscalDelAnio`, que parte de los
// retiros. Esta función se queda porque el devengado es la otra mitad de la historia (mide
// el tamaño real del negocio y lo que le quedaría por facturar), y porque las pantallas de
// "Dónde vivir" y "Decisiones" comparan escenarios con ella. Se distingue por el campo
// `esDevengado: true`.
//
// Del año de `hoyISO` ('YYYY-MM-DD') se toma lo que va del 1 de enero hasta hoy,
// se anualiza a ritmo constante y se pasa por la escala por tramos.
//   · beneficioYtd  = ventas netas − gastos del negocio, del 1 de enero a hoy
//   · miParteYtd    = beneficioYtd · miShare
//   · baseYtd       = miParteYtd − (cuota + deducibles) · meses transcurridos
//   · baseProyectada = baseYtd / meses · 12  (julio -> 7 meses)
// Bordes: sin datos (o fecha inválida) todo va a 0 y tramo 0, nunca un NaN; con un
// solo mes (enero) la proyección funciona igual.
export function situacionFiscalDelAnio(datos, m, hoyISO, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const x = normalizarModelo(m);
  const d = datos || {};
  const ventas = Array.isArray(d.ventas) ? d.ventas : [];
  const gastos = Array.isArray(d.gastosNegocio) ? d.gastosNegocio : [];

  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(hoyISO ?? '')) ? String(hoyISO) : '';
  const meses = hoy ? Number(hoy.slice(5, 7)) : 0;
  // Solo cuentan los datos de ESTE año: si en enero solo hay ventas del año pasado,
  // proyectar con ellas daría una base inventada.
  const delAnio = (x) => String((x && x.fecha) ?? '').slice(0, 4) === hoy.slice(0, 4);
  const hayDatos = hoy
    ? ventas.some(delAnio) || gastos.some(delAnio)
    : ventas.length > 0 || gastos.length > 0;

  // Sin datos no hay año que proyectar: todo a cero en vez de proyectar en negativo
  // las cuotas de meses sobre los que no sabemos nada.
  if (!hayDatos || !(meses >= 1 && meses <= 12)) {
    return {
      beneficioYtd: 0,
      miParteYtd: 0,
      baseYtd: 0,
      baseProyectada: 0,
      irpfRealProyectado: 0,
      tipoMedio: 0,
      tipoMarginal: tipoMarginal(0, tramos),
      retenidoProyectado: 0,
      diferencia: 0,
      tramo: 0,
      mesesTranscurridos: meses >= 1 && meses <= 12 ? meses : 0,
      esDevengado: true,
    };
  }

  const eneroUno = `${hoy.slice(0, 4)}-01-01`;
  const beneficioYtd = ventasNetasEntre(ventas, eneroUno, hoy) - gastosEntre(gastos, eneroUno, hoy);
  const miParteYtd = beneficioYtd * (x.miShare / 100);
  const baseYtd = miParteYtd - (x.cuotaAutonomo + x.deducibles) * meses;

  const transcurrido = transcurridoDelAnio(hoy, meses);
  const baseProyectada = (baseYtd / transcurrido) * 12;

  const irpfRealProyectado = irpfPorTramos(baseProyectada, tramos, minimoPersonal);
  const retenidoProyectado = Math.max(0, baseProyectada) * (x.irpf / 100);

  return {
    beneficioYtd,
    miParteYtd,
    baseYtd,
    baseProyectada,
    irpfRealProyectado,
    tipoMedio: tipoMedioReal(baseProyectada, tramos, minimoPersonal),
    tipoMarginal: tipoMarginal(baseProyectada, tramos),
    retenidoProyectado,
    diferencia: retenidoProyectado - irpfRealProyectado,
    tramo: indiceTramo(baseProyectada, tramos),
    mesesTranscurridos: meses,
    // La etiqueta que evita confundir esta foto con la base fiscal: aquí se cuenta lo
    // devengado (su 40 % del beneficio), no lo facturado. Ver rentaFiscalDelAnio.
    esDevengado: true,
  };
}

// ---------------------------------------------------------------------------
// La renta que de verdad tributa: lo FACTURADO, no el 40 % del beneficio
// ---------------------------------------------------------------------------
//
// El error que corrige esta función: él no es socio de una sociedad española que le
// reparte beneficios. Es un AUTÓNOMO español que FACTURA a la empresa alemana de su socio.
// Su renta no es "su 40 % del beneficio del negocio": es lo que factura, y factura cuando
// retira. Lo que no ha retirado sigue en la caja del negocio y no es renta suya todavía.
//
// A 28/07/2026 las dos lecturas se separan 5.564,55 EUR:
//   · su 40 % del beneficio (devengado) : 10.937,35  <- lo que usaba todo el modelo
//   · lo que ha retirado y facturado    :  5.372,80  <- su renta real
// Y no es un matiz de presentación: con la primera cifra la proyección anual sale en
// 18.234 EUR, tramo del 24 % y la tarifa plana ya no se puede prorrogar; con la segunda
// sale en 9.339,63 EUR, tramo del 19 %, un 4,9 % efectivo, y la prórroga sí cabe.
//
// EL MATIZ HONESTO, que la app no puede resolver sola: la renta de un autónomo se imputa
// por DEVENGO, no por cobro. Si tiene derecho contractual al 40 % y no lo factura, su
// asesoría puede decirle que debería estar facturando más. Por eso esta función devuelve
// LAS DOS cifras (`retiradoYtd` y `devengadoYtd`) y lo que las separa (`sinFacturar`): la
// pantalla las enseña juntas y dice cuál se usa para los impuestos. Aquí se usa la
// facturada, que es la que hoy aparece en sus declaraciones.
//
// Bordes: sin datos del año (o con la fecha inválida) todo va a 0 y tramo 0, nunca un NaN;
// con un solo mes (enero) la proyección funciona igual; solo cuenta el año de `hoyISO`.
export function rentaFiscalDelAnio(datos, m, hoyISO, tramos = TRAMOS_IRPF, minimoPersonal = MINIMO_PERSONAL) {
  const x = normalizarModelo(m);
  const d = datos || {};
  const ventas = Array.isArray(d.ventas) ? d.ventas : [];
  const gastos = Array.isArray(d.gastosNegocio) ? d.gastosNegocio : [];
  const retiros = Array.isArray(d.retiros) ? d.retiros : [];
  const share = x.miShare / 100;

  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(hoyISO ?? '')) ? String(hoyISO) : '';
  const meses = hoy ? Number(hoy.slice(5, 7)) : 0;
  const delAnio = (f) => String((f && f.fecha) ?? '').slice(0, 4) === hoy.slice(0, 4);
  const hayDatos = Boolean(hoy)
    && (retiros.some(delAnio) || ventas.some(delAnio) || gastos.some(delAnio));

  // Sin datos de este año no hay renta que proyectar: todo a cero en vez de anualizar las
  // cuotas de meses sobre los que no sabemos nada. `puedeProrrogarTarifaPlana` va null y no
  // true: sin rendimiento estimado no es que quepa la prórroga, es que no se sabe.
  if (!hayDatos || !(meses >= 1 && meses <= 12)) {
    return {
      retiradoYtd: 0,
      devengadoYtd: 0,
      sinFacturar: 0,
      transcurrido: 0,
      mesesTranscurridos: meses >= 1 && meses <= 12 ? meses : 0,
      retiradoProyectado: 0,
      baseIrpf: 0,
      irpfReal: 0,
      tipoMedio: 0,
      tipoMarginal: tipoMarginal(0, tramos),
      tramo: 0,
      retenidoProyectado: 0,
      diferencia: 0,
      puedeProrrogarTarifaPlana: null,
      esDevengado: false,
    };
  }

  const eneroUno = `${hoy.slice(0, 4)}-01-01`;

  // Del origen los importes llegan siempre numéricos (tradinverso.js hace `Number(...) || 0`),
  // pero una copia de seguridad editada a mano puede traer uno en texto. Una fila rota tiene
  // que valer 0 ELLA SOLA: si dejáramos que el NaN se propagara, la foto fiscal entera se
  // volvería ilegible, y si lo cazáramos al final del sumatorio, una fila mala borraría el
  // año completo y la pantalla diría "no debes nada" con toda la confianza.
  const limpiar = (lista, campo) => lista.map((f) => ({
    fecha: String((f && f.fecha) ?? ''),
    [campo]: num(f && f[campo], 0),
  }));

  // Su renta: los retiros del año hasta hoy, por su parte. El importe apuntado en la hoja
  // es el reparto ENTERO (los dos socios); lo suyo es el miShare de ese total.
  const retiradoYtd = retirosEntre(limpiar(retiros, 'total'), eneroUno, hoy) * share;

  // Informativo, la otra mitad de la historia: lo que le habría tocado por contrato.
  const beneficioYtd = ventasNetasEntre(limpiar(ventas, 'neto'), eneroUno, hoy)
    - gastosEntre(limpiar(gastos, 'total'), eneroUno, hoy);
  const devengadoYtd = beneficioYtd * share;

  const transcurrido = transcurridoDelAnio(hoy, meses);
  const retiradoProyectado = (retiradoYtd / transcurrido) * 12;

  // La cuota de autónomo y la asesoría son gasto deducible de los doce meses del año, se
  // haya facturado mucho o poco. Si aún no ha facturado casi nada la base sale negativa:
  // es una pérdida real del ejercicio, no un error, y el IRPF de una base negativa es 0.
  const baseIrpf = retiradoProyectado - (x.cuotaAutonomo + x.deducibles) * 12;

  const irpfReal = irpfPorTramos(baseIrpf, tramos, minimoPersonal);
  const retenidoProyectado = Math.max(0, baseIrpf) * (x.irpf / 100);

  return {
    retiradoYtd,
    devengadoYtd,
    sinFacturar: devengadoYtd - retiradoYtd,
    transcurrido,
    mesesTranscurridos: meses,
    retiradoProyectado,
    baseIrpf,
    irpfReal,
    tipoMedio: tipoMedioReal(baseIrpf, tramos, minimoPersonal),
    tipoMarginal: tipoMarginal(baseIrpf, tramos),
    tramo: indiceTramo(baseIrpf, tramos),
    retenidoProyectado,
    diferencia: retenidoProyectado - irpfReal,
    // El techo se mide sobre el RENDIMIENTO del año, que es lo que se factura, no sobre el
    // beneficio del negocio. Con el devengado el código decía que no podía prorrogar.
    puedeProrrogarTarifaPlana: retiradoProyectado < SMI_ANUAL,
    esDevengado: false,
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
