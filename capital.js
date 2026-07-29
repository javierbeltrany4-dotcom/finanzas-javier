// "¿Cuánto puedo meter en otro negocio sin hacerme daño?". Sin DOM y sin fechas del sistema:
// testeable con `node --test`. El "hoy" entra SIEMPRE por `ctx.hoyISO`.
//
// LA PREGUNTA QUE RESPONDE ESTE MÓDULO, Y POR QUÉ NO ES "¿CUÁNTO TENGO?".
//
// El saldo de la cuenta miente. Dentro de ese número hay dinero de Hacienda que todavía no ha
// salido, hay meses de vida por delante y hay objetivos a los que ya les puso nombre. La
// diferencia entre "tengo 8.000" y "puedo mover 1.200" es exactamente la distancia entre
// tomar una decisión y arrepentirse de ella.
//
// TRES REGLAS QUE NO SE TOCAN AQUÍ DENTRO:
//
//  · Ninguna cifra fiscal se inventa. El dinero que le va a reclamar Hacienda lo calcula
//    `fiscal.js` (que a su vez lo saca de `docs/situacion-real-cliente-aleman.md`), y el
//    recargo que corre por lo vencido es el art. 27 LGT tal y como lo tiene ese módulo. Aquí
//    no hay ni un porcentaje escrito a mano.
//
//  · Las cifras que NO son fiscales -los 6 meses de colchón, los cortes del semáforo- son
//    decisiones de diseño y salen marcadas como tales, con su porqué al lado. No se disfrazan
//    de norma.
//
//  · Prohibido preocuparle sin darle una acción, y prohibido "consúltalo con un profesional" a
//    secas: donde hay que preguntar algo va LA PREGUNTA EXACTA para copiar y pegar. Y todo
//    importe se dice también en VENTAS suyas, que es lo único que él controla.

import { formatoEuros, gastoFijoMensual } from './calculos.js';

import {
  MODELO_DEFAULT,
  modeloDesdeDatos,
  normalizarModelo,
  porVenta,
  rentaFiscalDelAnio,
  resultadoMensual,
} from './objetivo.js';

import { normalizarObjetivo, totalCuentas } from './patrimonio.js';

// El dinero de Hacienda no se estima aquí: se le pide al módulo que tiene las fuentes.
import { RECARGO_ART27, cuantoApartar } from './fiscal.js';

// ---------------------------------------------------------------------------
// Las constantes, con la etiqueta de qué son
// ---------------------------------------------------------------------------

// DECISIÓN DE DISEÑO, NO NORMA. No hay ninguna ley que diga seis meses; es el plazo que le
// da margen para que el negocio se pare y no tener que aceptar el primer trabajo que
// aparezca. Se puede cambiar por parámetro en todas las funciones que lo usan.
//
// Los cortes del semáforo salen del mismo sitio y por la misma razón:
//   · verde  (>= 6 meses) : puede permitirse una decisión que salga mal;
//   · ámbar  (3 a 6)      : puede, pero se queda sin margen para un segundo error;
//   · rojo   (< 3)        : una factura inesperada le obliga a deshacer la inversión con prisa,
//                           que es la forma más cara de perder dinero.
export const COLCHON = {
  mesesRecomendados: 6,
  verde: 6,
  ambar: 3,
};

// Por debajo de esto, "te queda libre" es ruido y no merece ni una línea de aviso.
const IMPORTE_MINIMO_RELEVANTE = 50;

// La pregunta exacta para su asesoría el día que se plantee meter dinero en otro negocio. No
// afirma ninguna cifra: pregunta las tres cosas que cambian la respuesta y que la app no
// puede resolver sola.
export const PREGUNTA_OTRO_NEGOCIO = 'Estoy pensando en dedicar una parte de mis ahorros a '
  + 'poner en marcha otra actividad distinta de la que tengo dada de alta. Necesito tres cosas '
  + 'por escrito antes de mover el dinero. 1) ¿Tengo que darme de alta en un epígrafe de IAE '
  + 'nuevo con un modelo 036/037, y desde qué fecha exactamente: desde el primer gasto o desde '
  + 'el primer ingreso? 2) Mientras la actividad nueva no facture, ¿son deducibles sus gastos '
  + 'en mi rendimiento de actividades económicas, o quedan fuera hasta que haya ingresos? '
  + '3) Si la actividad nueva da pérdidas, ¿se compensan con el rendimiento de la actividad '
  + 'que ya tengo dentro del mismo modelo 130 y de la misma declaración de la Renta, o van por '
  + 'separado? Decidme además si esto cambia en algo mi pago fraccionado trimestral.';

// La reserva que está puesta PARA HACIENDA, no cualquier reserva. Es la misma regla que usa
// decisiones.js: si el colchón del mes que viene contara como reserva de impuestos, la
// pantalla diría que está cubierto cuando no lo está.
const RE_IMPUESTOS = /impuest|hacienda|irpf|renta|declaraci/i;

// La reserva que está puesta para VIVIR. Se separa de las demás por lo mismo: si no se
// distinguiera, el colchón se contaría dos veces (una por lo que él etiquetó y otra por lo
// que este módulo recomienda) y el dinero libre saldría más bajo de lo que es.
const RE_COLCHON = /colch|gasto|vida|emergenc|mes que viene|imprevist/i;

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Número de usuario o de la hoja: vacío, null o basura -> el valor por defecto.
// El try no es paranoia: `Number(v)` LANZA un TypeError si v es un objeto con una clave
// `toString` que no sea función, y eso llega desde una copia de seguridad importada.
// Ver la nota larga en respaldo.js.
function num(v, porDefecto = 0) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
  return Number.isFinite(n) ? n : porDefecto;
}

function esFecha(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
}

// Céntimos, y nunca un -0 que se pinta como "-0,00 €".
function eur(n) {
  const r = Math.round(num(n, 0) * 100) / 100;
  return r === 0 ? 0 : r;
}

// 8.5 -> "8,5" · 3 -> "3". Igual que en objetivo.js y decisiones.js, para que los números
// suenen iguales en toda la app. Un resto diminuto NO se redondea a "0": leer "a 0 ventas"
// cuando todavía falta algo es justo el tipo de mentira que da ansiedad.
function ventasTexto(n) {
  if (n === null || !Number.isFinite(n)) return '—';
  if (n > 0 && n < 0.05) return 'menos de 0,1';
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function mesesTexto(n) {
  if (n === null || !Number.isFinite(n)) return 'no lo sé';
  const r = Math.round(n * 10) / 10;
  return `${String(r).replace('.', ',')} ${r === 1 ? 'mes' : 'meses'}`;
}

// Cualquier importe, traducido a ventas SUYAS. Es la vara del proyecto entero: los euros son
// consecuencia, las ventas son lo que él controla. null cuando una venta no le deja nada
// (ticket 0, comisión del 100 %, su parte al 0 %): ahí no hay ventas que contar.
function enVentas(c, importe) {
  if (!(c.miParteVenta > 0)) return null;
  return num(importe, 0) / c.miParteVenta;
}

// El semáforo del colchón, en un solo sitio: lo usan puedeInvertir() y simularInversion(),
// y si divergieran, la misma inversión saldría de dos colores en dos pantallas.
function semaforoPorMeses(meses) {
  if (meses === null || !Number.isFinite(meses)) return 'ambar';
  if (meses >= COLCHON.verde) return 'verde';
  if (meses >= COLCHON.ambar) return 'ambar';
  return 'rojo';
}

// ---------------------------------------------------------------------------
// El contexto, normalizado una sola vez
// ---------------------------------------------------------------------------

// Acepta el MISMO ctx que decisiones.js y que fiscal.js, para que app.js no tenga que montar
// un tercero: { datos, modelo, hoyISO, patrimonio, gastosFijos, ventasMedia, beneficioAnual,
// rentaFiscal, presentados, roi }. Todo es opcional; lo que falte se reconstruye de los datos
// o se dice en un aviso, pero nunca sale un NaN.
function contexto(ctx) {
  const c = ctx || {};
  const datos = c.datos || {};
  const config = datos.config || {};
  const modelo = normalizarModelo(c.modelo || config.modelo || MODELO_DEFAULT);
  const hoy = esFecha(c.hoyISO) ? String(c.hoyISO) : '';
  const mes = hoy ? hoy.slice(0, 7) : '';

  const patrimonio = c.patrimonio || {};
  const cuentas = Array.isArray(patrimonio.cuentas) ? patrimonio.cuentas : [];

  // `normalizarObjetivo` borra los campos que no conoce, e `intocable` es uno de ellos. Se lee
  // del objeto CRUDO y se vuelve a pegar: así este módulo puede entender la marca sin tocar la
  // firma ni el contrato de patrimonio.js, que tiene sus propios tests.
  const objetivos = (Array.isArray(patrimonio.objetivos) ? patrimonio.objetivos : [])
    .map((o) => ({ ...normalizarObjetivo(o), intocable: Boolean(o && o.intocable) }));

  const total = totalCuentas(cuentas);

  // La media de ventas, por el mismo camino que "Cuánto facturar" y que "Y ahora qué": si cada
  // pantalla la sacara por su cuenta, dirían números distintos del mismo negocio.
  const ventasMedia = c.ventasMedia === null || c.ventasMedia === undefined || c.ventasMedia === ''
    ? Math.max(0, num(modeloDesdeDatos(datos, modelo, hoy ? { hoy, mesActual: mes } : undefined).ventasMedia, 0))
    : Math.max(0, num(c.ventasMedia, 0));

  // Lo que le cuesta estar vivo cada mes. Si los tiene apuntados mandan los suyos; si no, se
  // reconstruyen del modelo (cuota + asesoría + gastos personales), que es la misma lista con
  // otro nombre, y se dice en un aviso que ahí no está el alquiler ni la comida.
  const listaGastos = Array.isArray(c.gastosFijos) ? c.gastosFijos
    : (Array.isArray(config.gastosFijos) ? config.gastosFijos : null);
  const gastosVida = listaGastos && listaGastos.length
    ? {
      total: gastoFijoMensual(listaGastos.map((g) => ({ importe: num(g && g.importe, 0) }))),
      fuente: 'datos',
    }
    : {
      total: modelo.cuotaAutonomo + modelo.deducibles + modelo.gastosPersonales,
      fuente: 'modelo',
    };

  // Su renta REAL es lo que factura (los retiros), no su 40 % del beneficio del negocio: es un
  // autónomo español que factura a la empresa alemana de su socio. Ver la nota larga de
  // rentaFiscalDelAnio en objetivo.js.
  const rentaFiscal = c.rentaFiscal && Number.isFinite(Number(c.rentaFiscal.retiradoProyectado))
    ? c.rentaFiscal
    : rentaFiscalDelAnio(datos, modelo, hoy);

  const rentaAnual = Number.isFinite(Number(c.beneficioAnual))
    ? Math.max(0, Number(c.beneficioAnual))
    : Math.max(0, num(rentaFiscal.retiradoProyectado, 0));

  // El dinero de Hacienda. NO se calcula aquí: se le pide a fiscal.js, que es quien tiene el
  // calendario, los porcentajes y el art. 27 LGT con su fuente. Sin `hoy`, ese módulo devuelve
  // ceros y su propio aviso, y este los propaga en vez de inventarse una deuda.
  const fiscal = cuantoApartar({
    datos,
    modelo,
    hoyISO: hoy,
    presentados: c.presentados,
    roi: c.roi,
    anio: c.anio,
    desdeAnio: c.desdeAnio,
  }, hoy);

  return {
    datos,
    config,
    modelo,
    hoy,
    mes,
    cuentas,
    objetivos,
    total,
    ventasMedia,
    gastosVida,
    rentaFiscal,
    rentaAnual,
    rentaMensual: rentaAnual / 12,
    fiscal,
    miParteVenta: porVenta(modelo).miParte,
    miParteMes: resultadoMensual(modelo, ventasMedia).miParte,
  };
}

// ---------------------------------------------------------------------------
// Qué está comprometido
// ---------------------------------------------------------------------------

// El dinero de Hacienda: lo mayor entre lo que el calendario dice que tiene que tener guardado
// HOY y lo que él mismo ha etiquetado como reserva de impuestos. Los dos son compromisos
// reales -uno se lo impone la ley, el otro se lo impuso él- y el que manda es el más grande.
function impuestosDe(c) {
  const etiquetadas = c.objetivos.filter((o) => o.clase === 'reserva' && RE_IMPUESTOS.test(o.nombre));
  const etiquetado = etiquetadas.reduce((acc, o) => acc + o.asignado, 0);
  const deuda = Math.max(0, num(c.fiscal.guardarHoy, 0));
  return {
    etiquetado,
    deuda,
    importe: Math.max(deuda, etiquetado),
    mandaLaDeuda: deuda >= etiquetado,
    nombres: etiquetadas.map((o) => o.nombre),
    hayEtiqueta: etiquetadas.length > 0,
  };
}

// El colchón: lo mayor entre los N meses de sus gastos fijos y lo que él ya etiquetó para
// vivir. Mismo criterio que con los impuestos, y por la misma razón: contar los dos por
// separado sumaría dos veces el mismo dinero.
function colchonDe(c, meses) {
  const etiquetadas = c.objetivos.filter((o) => o.clase === 'reserva'
    && !RE_IMPUESTOS.test(o.nombre) && RE_COLCHON.test(o.nombre));
  const etiquetado = etiquetadas.reduce((acc, o) => acc + o.asignado, 0);
  const recomendado = c.gastosVida.total * meses;
  return {
    etiquetado,
    recomendado,
    importe: Math.max(recomendado, etiquetado),
    mandaElRecomendado: recomendado >= etiquetado,
    nombres: etiquetadas.map((o) => o.nombre),
  };
}

// Las reservas que no son ni impuestos ni colchón: son compromisos igual, y van una a una para
// que se pueda discutir cada línea en vez de tragarse un total.
function otrasReservasDe(c) {
  return c.objetivos.filter((o) => o.clase === 'reserva'
    && !RE_IMPUESTOS.test(o.nombre) && !RE_COLCHON.test(o.nombre) && o.asignado > 0);
}

// Un objetivo NO se considera comprometido por defecto: un objetivo se puede retrasar, y dar
// por intocable todo lo que tiene nombre dejaría el dinero libre en cero siempre, que es tan
// inútil como decirle que puede gastárselo todo. Solo cuentan los que él marca con
// `intocable: true`. Los demás salen en un aviso con la acción para marcarlos.
function objetivosIntocablesDe(c) {
  return c.objetivos.filter((o) => o.clase === 'objetivo' && o.intocable && o.asignado > 0);
}

// El dinero que es SUYO de verdad: lo que hay en las cuentas menos lo de Hacienda. Es la base
// con la que se cuentan los meses de colchón, aquí y en la simulación. Contar los meses sobre
// el saldo entero sería contar el dinero de Hacienda como si fuera comida.
function dineroPropio(c) {
  return c.total - impuestosDe(c).importe;
}

// ---------------------------------------------------------------------------
// Cuánto hay, cuánto está pillado y cuánto se puede mover
// ---------------------------------------------------------------------------

// El reparto completo del saldo, línea a línea y con el porqué de cada una.
// -> { total, comprometido, libre, detalle: [{ concepto, eur, motivo }], ... }
//
// `libre` PUEDE SER NEGATIVO, y ese es el caso más importante de todos: significa que una
// parte de lo que tiene comprometido no tiene dinero detrás. Recortarlo a cero escondería
// justo la única cifra que exige actuar hoy.
//
// `meses` es el colchón que se considera comprometido. Por defecto los 6 de COLCHON, que es
// una decisión de diseño, no una norma.
export function dineroDisponible(ctx, meses = COLCHON.mesesRecomendados) {
  const c = contexto(ctx);
  return disponibleDe(c, Math.max(0, num(meses, COLCHON.mesesRecomendados)));
}

function disponibleDe(c, meses) {
  const detalle = [];
  const avisos = [];

  const impuestos = impuestosDe(c);
  const colchon = colchonDe(c, meses);
  const otras = otrasReservasDe(c);
  const intocables = objetivosIntocablesDe(c);

  // 1. Hacienda. Esta línea sale SIEMPRE, aunque sea cero: una lista que cambia de tamaño cada
  //    día es una lista que da miedo mirar, y "hoy no debes nada" también es una respuesta.
  const vencido = Math.max(0, num(c.fiscal.vencidoSinIngresar, 0));
  const recargo = Math.max(0, num(c.fiscal.recargoQueCorre, 0));
  //    El motivo se arma en dos trozos y no con un if gigante: primero CUÁL de las dos cifras
  //    manda -la de Hacienda o la que él etiquetó- y después, si hay algo vencido, el aviso de
  //    que además corre un recargo. Cuando esto era un solo if encadenado, tener un 130 vencido
  //    borraba la explicación de qué cifra estaba mandando.
  const cualManda = !c.hoy
    ? 'No sé qué día es hoy, así que no he podido calcular lo que Hacienda te va a reclamar. '
      + `Aquí solo está lo que tú has etiquetado: ${formatoEuros(impuestos.etiquetado)}.`
    : (impuestos.mandaLaDeuda
      ? 'Es lo que llevas devengado del IRPF de este año y todavía no has ingresado. Tú tienes '
        + `etiquetados ${formatoEuros(impuestos.etiquetado)}: manda la cifra de Hacienda, que es mayor.`
      : 'Es lo que TÚ has apartado para impuestos. El calendario de Hacienda solo te pide '
        + `${formatoEuros(impuestos.deuda)} a día de hoy, pero mientras esté etiquetado no es dinero libre.`);
  detalle.push({
    concepto: 'Impuestos',
    eur: eur(impuestos.importe),
    motivo: vencido > 0
      ? `${cualManda} Y hay prisa: ${formatoEuros(vencido)} son de modelos 130 vencidos sin `
        + `presentar, con ${formatoEuros(recargo)} de recargo que ya corre y crece cada mes.`
      : cualManda,
  });

  // 2. El colchón. También sale siempre, por lo mismo.
  detalle.push({
    concepto: `Colchón de ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
    eur: eur(colchon.importe),
    motivo: colchon.mandaElRecomendado
      ? `${meses} ${meses === 1 ? 'mes' : 'meses'} de tus gastos fijos, que son `
        + `${formatoEuros(c.gastosVida.total)} al mes. Es lo que te permite que el negocio se pare `
        + 'sin tener que aceptar el primer trabajo que aparezca.'
      : `Es lo que tú has etiquetado para vivir (${colchon.nombres.join(', ')}), y es más que los `
        + `${meses} ${meses === 1 ? 'mes' : 'meses'} de gastos fijos que saldrían de tus cifras `
        + `(${formatoEuros(colchon.recomendado)}). Manda lo tuyo.`,
  });

  // 3. Las demás reservas, una a una.
  otras.forEach((o) => {
    detalle.push({
      concepto: `Reserva: ${o.nombre || 'sin nombre'}`,
      eur: eur(o.asignado),
      motivo: 'Lo marcaste como reserva. Una reserva es dinero con un trabajo asignado, así que '
        + 'no cuenta como libre.',
    });
  });

  // 4. Los objetivos que él ha marcado como intocables.
  intocables.forEach((o) => {
    detalle.push({
      concepto: `Objetivo intocable: ${o.nombre || 'sin nombre'}`,
      eur: eur(o.asignado),
      motivo: 'Lo has marcado como intocable, así que no entra en el reparto. Si dejara de serlo, '
        + `estos ${formatoEuros(o.asignado)} pasarían a dinero libre.`,
    });
  });

  const comprometido = eur(detalle.reduce((acc, d) => acc + d.eur, 0));
  const total = eur(c.total);
  const libre = eur(total - comprometido);

  // Los avisos. Ninguno se queda en el diagnóstico: todos acaban en algo que se puede hacer.
  if (!c.hoy) {
    avisos.push('Sin la fecha de hoy no puedo calcular lo que Hacienda te va a reclamar. Pásale '
      + '`hoyISO` (formato YYYY-MM-DD) y las cifras de impuestos dejan de estar a cero.');
  }
  if (!c.cuentas.length) {
    avisos.push('No hay ninguna cuenta apuntada, así que el total es cero y todo lo demás sale '
      + 'del revés. Abre "Mi patrimonio" y apunta lo que tienes en cada cuenta: es un minuto y es '
      + 'el dato del que depende toda esta pantalla.');
  }
  if (libre < 0) {
    const falta = Math.abs(libre);
    const ventas = enVentas(c, falta);
    avisos.push(`Te faltan ${formatoEuros(falta)} para cubrir lo que ya tienes comprometido`
      + `${ventas === null ? '' : `, que son ${ventasTexto(ventas)} ventas tuyas`}. Ahora mismo no `
      + 'hay dinero para meter en nada nuevo: lo primero es tapar ese hueco, y el orden es '
      + 'Hacienda, colchón y después los objetivos.');
  }
  if (vencido > 0) {
    avisos.push(`Antes de pensar en invertir: presenta los ${formatoEuros(vencido)} de 130 `
      + `vencidos. Cada mes completo que pase suma otro ${RECARGO_ART27.porMesCompleto} % de `
      + 'recargo (art. 27 LGT), y ese es el único "retorno" garantizado que tienes hoy encima de '
      + 'la mesa: dejar de perderlo.');
  }
  if (!impuestos.hayEtiqueta && impuestos.deuda > 0) {
    avisos.push(`No tienes ninguna reserva llamada "Impuestos" en Mi patrimonio. Crea una de clase `
      + `reserva con ese nombre y mándale ${formatoEuros(impuestos.deuda)}: mientras el dinero de `
      + 'Hacienda no tenga etiqueta, se gasta solo.');
  }
  const sinMarcar = c.objetivos.filter((o) => o.clase === 'objetivo' && !o.intocable && o.asignado > 0);
  if (sinMarcar.length) {
    avisos.push(`Estos objetivos NO cuentan como comprometidos porque un objetivo se puede `
      + `retrasar: ${sinMarcar.map((o) => `"${o.nombre || 'sin nombre'}"`).join(', ')}. Si alguno no `
      + 'se puede retrasar, márcalo con `intocable: true` en Mi patrimonio y saldrá de aquí.');
  }
  if (c.gastosVida.fuente === 'modelo') {
    avisos.push('Tus gastos fijos personales no están apuntados: he usado los del modelo (cuota + '
      + 'asesoría + gastos personales). Si pagas alquiler o comida, el colchón real es más alto. '
      + 'Apúntalos en la pestaña de Gastos.');
  }
  // Los avisos que fiscal.js ya sabe dar (nada presentado, trimestres proyectados, devolución
  // esperada) se pegan tal cual: son suyos y tienen su fuente detrás.
  (Array.isArray(c.fiscal.avisos) ? c.fiscal.avisos : []).forEach((a) => {
    if (a && !avisos.includes(a)) avisos.push(a);
  });

  return {
    total,
    comprometido,
    libre,
    detalle,
    // NO HAY DATO ≠ ESTÁS EN DESCUBIERTO. Sin ninguna cuenta apuntada el total es cero y el
    // "libre" sale negativo por construcción: son las deudas contra un patrimonio que nadie
    // ha escrito todavía. Con el datos.json de fábrica eso abría "Mi capital" con un titular
    // rojo -"ESTÁS EN DESCUBIERTO · 1.743,01 € · TE FALTAN"- sobre un estado que no existe, y
    // la única acción que hacía falta (apuntar las cuentas) quedaba 1.900 caracteres más
    // abajo, fuera del primer scroll. La vista necesita poder distinguir los dos casos, y
    // hasta ahora este objeto no se lo decía ni queriendo.
    sinDatos: !c.cuentas.length,
    // Lo mismo pero en la única unidad que él controla. `libreEnVentas` va en VENTAS, no en
    // ventas al mes: es un montón de dinero, no un cambio de ritmo.
    libreEnVentas: enVentas(c, libre),
    impuestos: eur(impuestos.importe),
    colchon: eur(colchon.importe),
    mesesDeColchon: meses,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// El colchón
// ---------------------------------------------------------------------------

// Sus gastos fijos personales por N meses, y -la pregunta de verdad- cuántos meses aguanta hoy.
//
// "Cuántos meses aguanta" se cuenta sobre el dinero que es SUYO (cuentas menos lo de Hacienda)
// y suponiendo que el negocio se para hoy: no entra ni un euro más. Es el escenario que hace
// falta para decidir, no una previsión.
export function colchonRecomendado(ctx, meses = COLCHON.mesesRecomendados) {
  const c = contexto(ctx);
  return colchonRecomendadoDe(c, Math.max(0, num(meses, COLCHON.mesesRecomendados)));
}

function colchonRecomendadoDe(c, meses) {
  const gastoMensual = c.gastosVida.total;
  const impuestos = impuestosDe(c);
  const tengo = eur(dineroPropio(c));
  const necesario = eur(gastoMensual * meses);
  const falta = eur(Math.max(0, necesario - tengo));

  // Sin gasto mensual no hay meses que contar: null, no Infinity. Una pantalla tiene que poder
  // distinguir "aguantas para siempre" de "no lo sé".
  //
  // Y sin ninguna cuenta apuntada TAMPOCO hay meses que contar: `tengo` sale negativo (son las
  // deudas contra un patrimonio vacío) y "aguantas -3,6 meses" no es una situación, es un
  // artefacto. Un número de meses negativo no significa nada y da miedo gratis.
  const sinDatos = !c.cuentas.length;
  const mesesQueAguanta = sinDatos || !(gastoMensual > 0) ? null : tengo / gastoMensual;

  const avisos = [];
  if (sinDatos) {
    avisos.push('No hay ninguna cuenta apuntada, así que todavía no puedo decirte cuántos meses '
      + 'aguantas. Abre "Mi patrimonio" y apunta lo que tienes en cada cuenta: es un minuto, y es '
      + 'el único dato que falta para que salga este número.');
  }
  if (!(gastoMensual > 0)) {
    avisos.push('Tus gastos fijos están a cero, así que no puedo decirte cuántos meses aguantas. '
      + 'Apunta en la pestaña de Gastos lo que pagas cada mes: cuota de autónomo, asesoría, '
      + 'gimnasio, alquiler y comida. Con eso ya sale el número.');
  } else if (sinDatos) {
    avisos.push(`Para vivir sin vender nada durante ${meses} meses hacen falta `
      + `${formatoEuros(necesario)} (${formatoEuros(gastoMensual)} al mes). Cuánto te falta de eso `
      + 'no lo sé hasta que apuntes tus cuentas.');
  } else if (falta > 0) {
    const ventas = enVentas(c, falta);
    avisos.push(`Te faltan ${formatoEuros(falta)} para tener ${meses} meses cubiertos`
      + `${ventas === null ? '' : `: son ${ventasTexto(ventas)} ventas tuyas`}. `
      + `Aguantas ${mesesTexto(mesesQueAguanta)}. Manda a la reserva de vida lo primero de cada `
      + 'retiro, antes de gastar nada.');
  } else {
    avisos.push(`Ya tienes los ${meses} meses cubiertos: aguantas ${mesesTexto(mesesQueAguanta)} `
      + 'con el negocio parado. A partir de aquí, lo que entre puede ir a otra cosa.');
  }
  if (c.gastosVida.fuente === 'modelo') {
    avisos.push('Ojo: tus gastos fijos no están apuntados y he usado los del modelo (cuota + '
      + 'asesoría + gastos personales). Si pagas alquiler o comida, aguantas menos meses de los '
      + 'que dice este número. Apúntalos en la pestaña de Gastos.');
  }
  if (impuestos.importe > 0) {
    avisos.push(`De lo que hay en tus cuentas he descontado ${formatoEuros(impuestos.importe)} de `
      + 'Hacienda antes de contar los meses: ese dinero no es comida, es de Hacienda.');
  }

  return {
    meses,
    gastoMensual: eur(gastoMensual),
    fuente: c.gastosVida.fuente,
    necesario,
    // Lo que hay para vivir de verdad: cuentas menos el dinero de Hacienda.
    tengo,
    impuestosDescontados: eur(impuestos.importe),
    mesesQueAguanta,
    // Sin cuentas apuntadas no hay veredicto que dar: falta un dato, no falta dinero.
    sinDatos,
    falta,
    faltaEnVentas: falta > 0 ? enVentas(c, falta) : 0,
    cubierto: falta <= 0,
    semaforo: semaforoPorMeses(mesesQueAguanta),
    avisos,
  };
}

// ---------------------------------------------------------------------------
// ¿Puedo meter X en otra cosa?
// ---------------------------------------------------------------------------

// La respuesta, con el después ya calculado. El semáforo mira UNA cosa: los meses de colchón
// que le quedan tras invertir. Verde a partir de 6, ámbar de 3 a 6, rojo por debajo.
//
// `puede` es `semaforo !== 'rojo'`: en ámbar sí puede, con la advertencia de que se queda sin
// margen para un segundo imprevisto. Que se coma un objetivo marcado como intocable no cambia
// el color -el color mide riesgo de supervivencia, no de planes- pero sale gritado en avisos
// con el nombre del objetivo, que es lo que de verdad hace falta leer.
export function puedeInvertir(ctx, importe) {
  const c = contexto(ctx);
  const meses = COLCHON.mesesRecomendados;
  const x = Math.max(0, num(importe, 0));

  const antesDisponible = disponibleDe(c, meses);
  const gastoMensual = c.gastosVida.total;
  const tengo = dineroPropio(c);

  const mesesAntes = gastoMensual > 0 ? tengo / gastoMensual : null;
  const mesesDespues = gastoMensual > 0 ? (tengo - x) / gastoMensual : null;
  const libreDespues = eur(antesDisponible.libre - x);

  const semaforo = semaforoPorMeses(mesesDespues);
  // `puede` es false también cuando NO se puede medir (sin gastos fijos no hay meses de colchón
  // que contar). Un "sí, puedes" calculado sobre un dato que falta es peor que un "no lo sé":
  // el aviso de abajo dice exactamente qué apuntar para que esto deje de estar en el aire.
  const puede = semaforo !== 'rojo' && mesesDespues !== null;

  // Los dos techos que de verdad quiere saber: cuánto es lo máximo que puede mover hoy
  // quedándose en verde, y cuánto quedándose en ámbar. Nunca negativos.
  const maximo = {
    verde: gastoMensual > 0 ? eur(Math.max(0, tengo - gastoMensual * COLCHON.verde)) : 0,
    ambar: gastoMensual > 0 ? eur(Math.max(0, tengo - gastoMensual * COLCHON.ambar)) : 0,
  };

  // Lo que le faltaría tener para que ESTA cantidad saliera en verde. 0 si ya lo está.
  const huecoVerde = gastoMensual > 0 ? eur(Math.max(0, (gastoMensual * COLCHON.verde + x) - tengo)) : 0;

  const avisos = [];

  if (!(gastoMensual > 0)) {
    avisos.push('No puedo pintar el semáforo porque no sé cuánto te cuesta vivir cada mes. '
      + 'Apunta tus gastos fijos en la pestaña de Gastos y vuelve a mirarlo: sin ese número, '
      + 'cualquier respuesta que te diera aquí sería inventada.');
  } else if (semaforo === 'rojo') {
    avisos.push(`Con ${formatoEuros(x)} fuera te quedarías en ${mesesTexto(mesesDespues)} de `
      + `colchón, por debajo de los ${COLCHON.ambar} meses. Baja la cantidad a `
      + `${formatoEuros(maximo.ambar)} y te quedas justo en el límite; a `
      + `${formatoEuros(maximo.verde)} te quedas tranquilo.`);
  } else if (semaforo === 'ambar') {
    avisos.push(`Puedes, pero te quedas en ${mesesTexto(mesesDespues)} de colchón: si te llega una `
      + `factura inesperada, tendrías que deshacer la inversión con prisa, que es la forma más cara `
      + `de perder dinero. Con ${formatoEuros(maximo.verde)} en vez de ${formatoEuros(x)} te quedas `
      + `en verde. O reúne ${formatoEuros(huecoVerde)} más antes de mover nada`
      + `${enVentas(c, huecoVerde) === null ? '' : `: son ${ventasTexto(enVentas(c, huecoVerde))} ventas`}.`);
  } else {
    avisos.push(`Adelante: tras invertir ${formatoEuros(x)} te quedan ${mesesTexto(mesesDespues)} `
      + `de colchón. Hoy podrías llegar hasta ${formatoEuros(maximo.verde)} sin bajar de los `
      + `${COLCHON.verde} meses.`);
  }

  // Comerse dinero comprometido no cambia el color, pero tiene que decirse con nombres y apellidos.
  if (libreDespues < 0) {
    const exceso = Math.abs(libreDespues);
    const intocables = objetivosIntocablesDe(c).map((o) => `"${o.nombre || 'sin nombre'}"`);
    avisos.push(`Esos ${formatoEuros(x)} se pasan en ${formatoEuros(exceso)} de lo que tienes `
      + `libre: estarías gastando dinero que ya tiene dueño`
      + `${intocables.length ? ` (${intocables.join(', ')})` : ''}. O bajas la cantidad a `
      + `${formatoEuros(Math.max(0, antesDisponible.libre))}, o quitas esa etiqueta a conciencia. `
      + 'Lo que no vale es hacerlo sin enterarte.');
  }

  const vencido = Math.max(0, num(c.fiscal.vencidoSinIngresar, 0));
  if (vencido > 0) {
    avisos.push(`Antes que cualquier inversión: tienes ${formatoEuros(vencido)} de modelos 130 `
      + `vencidos. Presentarlos hoy te ahorra el ${RECARGO_ART27.porMesCompleto} % de recargo que `
      + 'entra al cumplirse otro mes completo (art. 27 LGT). Es el único retorno seguro que hay '
      + 'sobre la mesa.');
  }

  if (x >= IMPORTE_MINIMO_RELEVANTE) {
    avisos.push('Y antes de mover el dinero, mándale esta pregunta a tu asesoría tal cual: '
      + PREGUNTA_OTRO_NEGOCIO);
  }

  return {
    puede,
    importe: eur(x),
    semaforo,
    antes: {
      libre: antesDisponible.libre,
      mesesDeColchon: mesesAntes,
    },
    despues: {
      libre: libreDespues,
      mesesDeColchon: mesesDespues,
    },
    // Los techos, que es lo que de verdad se pregunta cuando la respuesta es que no.
    maximo,
    faltaParaVerde: {
      eur: huecoVerde,
      ventas: huecoVerde > 0 ? enVentas(c, huecoVerde) : 0,
    },
    avisos,
  };
}

// ---------------------------------------------------------------------------
// El "y si"
// ---------------------------------------------------------------------------

// Qué le pasa al colchón mes a mes si mete `importe` y le devuelve un `retornoPct` ANUAL
// durante `meses`. NO es una previsión y no promete nada: el retorno lo pone él, y el módulo
// se limita a hacer la cuenta y decir dónde se rompe.
//
// CÓMO SE MUEVE EL DINERO CADA MES, para que se pueda auditar la cuenta a mano:
//   · el mes 0 es HOY, justo después de sacar el dinero: es casi siempre el peor punto;
//   · cada mes entra lo que factura (renta / 12), salen sus gastos fijos y sale el IRPF que va
//     devengando (irpfAnual / 12). Eso es `flujoMensual`, y es lo que ahorra -o lo que quema-
//     sin tocar la inversión;
//   · la inversión devuelve `importe · retornoPct / 100 / 12` cada mes, repartido lineal. Es la
//     forma más simple y la más fácil de comprobar; cualquier otra sería fingir precisión.
export function simularInversion(ctx, importe, retornoPct, meses) {
  const c = contexto(ctx);
  const x = Math.max(0, num(importe, 0));
  const pct = num(retornoPct, 0);
  const n = Math.max(0, Math.min(600, Math.trunc(num(meses, 0))));

  const gastoMensual = c.gastosVida.total;
  const irpfMensual = Math.max(0, num(c.fiscal.irpfAnual, 0)) / 12;
  const flujoMensual = eur(c.rentaMensual - gastoMensual - irpfMensual);
  // La tasa se acumula SIN redondear y solo se redondea al pintar cada mes. Redondeando antes,
  // un 100 % anual sobre 1.000 € daba 83,33 al mes y 999,96 al cabo de doce: la tabla decía que
  // a los doce meses todavía no lo había recuperado, por cuatro céntimos de redondeo.
  const tasaMensual = (x * pct) / 100 / 12;
  const retornoMensual = eur(tasaMensual);
  const base = eur(dineroPropio(c));

  const mensual = [];
  let mesesHastaRecuperar = null;
  for (let m = 0; m <= n; m += 1) {
    const devuelto = eur(tasaMensual * m);
    const sinInvertir = eur(base + flujoMensual * m);
    const conInversion = eur(base - x + flujoMensual * m + devuelto);
    const mesesDeColchon = gastoMensual > 0 ? conInversion / gastoMensual : null;
    if (mesesHastaRecuperar === null && x > 0 && devuelto >= x) mesesHastaRecuperar = m;
    mensual.push({
      mes: m,
      sinInvertir,
      conInversion,
      devuelto,
      recuperado: x > 0 ? devuelto >= x : true,
      mesesDeColchon,
      semaforo: semaforoPorMeses(mesesDeColchon),
    });
  }

  // El peor punto de todo el recorrido. Con flujo mensual positivo es siempre el mes 0, pero si
  // quema dinero cada mes el peor está al final, y es justo el que hay que enseñar.
  let peor = mensual[0] || null;
  for (const fila of mensual) {
    const a = fila.mesesDeColchon === null ? Infinity : fila.mesesDeColchon;
    const b = peor.mesesDeColchon === null ? Infinity : peor.mesesDeColchon;
    if (a < b) peor = fila;
  }

  const supuesto = `Si metes ${formatoEuros(x)} y te devolviera un ${String(pct).replace('.', ',')} % `
    + `anual repartido a partes iguales (${formatoEuros(retornoMensual)} al mes) durante `
    + `${n} ${n === 1 ? 'mes' : 'meses'}. El retorno lo has puesto tú: aquí nadie lo ha medido ni `
    + 'lo promete. Lo único medido son tus gastos, lo que facturas y tu IRPF.';

  const avisos = [];
  avisos.push('Esto no es una previsión, es un "si pasara esto". Cambia el porcentaje y mira '
    + 'cuánto tiene que salir bien para que compense: si necesitas que salga perfecto, no compensa.');

  if (!(gastoMensual > 0)) {
    avisos.push('No sé cuánto te cuesta vivir cada mes, así que la columna de meses de colchón va '
      + 'vacía. Apunta tus gastos fijos en la pestaña de Gastos.');
  }
  if (flujoMensual > 0) {
    // Un detalle que hincha la curva sin que se note: la simulación da por hecho que TODO lo que
    // no está en la lista de gastos fijos se ahorra. Si en esa lista solo están la cuota, la
    // asesoría y el gimnasio -y no el alquiler, ni la comida, ni un café-, la línea sube más
    // deprisa de lo que sube su cuenta de verdad. Decirlo aquí es más honesto que afinar el
    // número con un gasto inventado.
    avisos.push(`La línea sube ${formatoEuros(flujoMensual)} al mes porque supone que ahorras TODO `
      + `lo que no está en tus gastos fijos (${formatoEuros(gastoMensual)}). Si gastas más que eso, `
      + 'sube menos. Añade a la pestaña de Gastos lo que te falte y esta curva se vuelve real.');
  }
  if (flujoMensual < 0) {
    const mesesQueAguanta = gastoMensual > 0 ? (base - x) / Math.abs(flujoMensual) : null;
    avisos.push(`Ojo a esto antes que a la inversión: cada mes se te van ${formatoEuros(Math.abs(flujoMensual))} `
      + `más de los que entran, aunque no inviertas nada. Con ${formatoEuros(x)} fuera aguantarías `
      + `${mesesTexto(mesesQueAguanta)}. El agujero no lo tapa el retorno: lo tapan las ventas.`);
  }
  if (peor && peor.semaforo === 'rojo') {
    avisos.push(`En el mes ${peor.mes} te quedarías en ${mesesTexto(peor.mesesDeColchon)} de `
      + `colchón, que es zona roja. Antes de meter ${formatoEuros(x)}, mira con puedeInvertir() `
      + 'cuánto es lo máximo que aguantas hoy y baja la cantidad hasta ahí.');
  }
  if (x > 0 && pct > 0 && mesesHastaRecuperar === null) {
    const necesarios = retornoMensual > 0 ? Math.ceil(x / retornoMensual) : null;
    avisos.push(necesarios === null
      ? `Con un ${String(pct).replace('.', ',')} % no recuperas nada: revisa el porcentaje.`
      : `Con ese retorno no recuperas los ${formatoEuros(x)} dentro de los ${n} meses que has `
        + `pedido: harían falta ${necesarios} meses. O alargas el plazo, o el número que has `
        + 'puesto no es el que tenías en la cabeza.');
  }
  if (x > 0 && pct <= 0) {
    avisos.push('Has puesto un retorno de cero o negativo, así que esto es la simulación de perder '
      + 'el dinero. Está bien mirarla: si con este escenario aguantas, la decisión es mucho más '
      + 'fácil de tomar.');
  }

  return {
    importe: eur(x),
    retornoPct: pct,
    retornoMensual,
    meses: n,
    base,
    flujoMensual,
    // Las tres piezas de flujoMensual, sueltas, para poder discutir cada una.
    rentaMensual: eur(c.rentaMensual),
    gastoMensual: eur(gastoMensual),
    irpfMensual: eur(irpfMensual),
    supuesto,
    mensual,
    mesesHastaRecuperar,
    peor,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// ¿Y si ese dinero se quedara en el negocio de siempre?
// ---------------------------------------------------------------------------

// La comparación honesta. Y empieza por un aviso incómodo: su negocio NO necesita capital.
// No compra stock, no monta una fábrica, no financia clientes. Lo que le falta para crecer son
// ventas, no euros en la cuenta. Así que "meter dinero en el negocio actual" no tiene un
// retorno medido: lo que sí se puede medir es lo que ese dinero ES con sus varas, cuántas
// ventas hacen falta para recuperarlo, y qué le rinde de verdad cada euro de gasto fijo.
export function costeDeOportunidad(ctx, importe) {
  const c = contexto(ctx);
  const x = Math.max(0, num(importe, 0));

  const fijos = c.modelo.fijosNegocio;
  const gastoMensual = c.gastosVida.total;

  const ventasEquivalentes = enVentas(c, x);
  const mesesDeFijosNegocio = fijos > 0 ? x / fijos : null;
  const mesesDeTuVida = gastoMensual > 0 ? x / gastoMensual : null;
  const mesesAlRitmoDeHoy = ventasEquivalentes !== null && c.ventasMedia > 0
    ? ventasEquivalentes / c.ventasMedia
    : null;

  // El multiplicador MEDIDO de su negocio: a su ritmo real, el negocio se gasta `fijos` al mes
  // y a él le deja `miParteMes`. Es un ratio observado, NO una ley: gastar el doble en software
  // no vende el doble. Por eso va con `causal: false` y con su supuesto escrito.
  const porEuroDeFijo = fijos > 0 ? c.miParteMes / fijos : null;
  const siRindieraIgual = porEuroDeFijo === null ? null : eur(x * porEuroDeFijo);

  // El único retorno SEGURO que hay hoy sobre la mesa: dejar de pagar recargo. El art. 27 LGT
  // suma un punto porcentual por cada mes completo de retraso, así que pagar lo vencido antes
  // de que se cumpla el siguiente mes vale exactamente eso. La cifra y el porcentaje salen de
  // fiscal.js (docs/situacion-real-cliente-aleman.md §2.4), no de aquí.
  const vencido = Math.max(0, num(c.fiscal.vencidoSinIngresar, 0));
  const recargoCorriendo = Math.max(0, num(c.fiscal.recargoQueCorre, 0));
  const pctYaAplicado = vencido > 0 ? (recargoCorriendo / vencido) * 100 : 0;
  const yaEnElTope = pctYaAplicado >= RECARGO_ART27.masDeDoceMeses;
  const ahorroPorPagarYa = vencido > 0 && !yaEnElTope
    ? eur(Math.min(vencido, x) * (RECARGO_ART27.porMesCompleto / 100))
    : 0;

  const opciones = [];

  if (vencido > 0) {
    opciones.push({
      id: 'pagar-lo-vencido',
      nombre: 'Presentar y pagar los modelos 130 vencidos',
      retorno: ahorroPorPagarYa,
      seguro: true,
      nota: yaEnElTope
        ? `Llevas más de 12 meses de retraso: el recargo ya está en el ${RECARGO_ART27.masDeDoceMeses} % `
          + 'y a partir de ahí corren intereses de demora, que el informe no cuantifica. Pagarlo hoy '
          + 'sigue siendo lo primero, pero el ahorro exacto no se puede poner aquí sin inventarlo.'
        : `Tienes ${formatoEuros(vencido)} vencidos. Cada mes completo que pasa suma otro `
          + `${RECARGO_ART27.porMesCompleto} % (art. 27 LGT). Aplicado a lo que estás pensando `
          + `mover, son ${formatoEuros(ahorroPorPagarYa)} que dejas de perder. No es una `
          + 'estimación: es aritmética de la ley.',
    });
  }

  opciones.push({
    id: 'quieto',
    nombre: 'Dejarlo quieto en la cuenta',
    retorno: 0,
    seguro: true,
    nota: 'Cero euros de retorno y cero riesgo. Es el suelo contra el que se compara todo lo '
      + `demás: si una idea no bate esto con holgura, no compensa el susto. Y te compra `
      + `${mesesDeTuVida === null ? 'tiempo' : mesesTexto(mesesDeTuVida)} de tranquilidad.`,
  });

  opciones.push({
    id: 'negocio-actual',
    nombre: 'Meterlo en el negocio que ya tienes',
    retorno: siRindieraIgual,
    seguro: false,
    nota: porEuroDeFijo === null
      ? 'No puedo medirlo: los gastos fijos del negocio están a cero en el modelo.'
      : `Tu negocio se gasta ${formatoEuros(fijos)} al mes en fijos y a ti te deja `
        + `${formatoEuros(c.miParteMes)}: cada euro de gasto fijo te devuelve `
        + `${String(Math.round(porEuroDeFijo * 100) / 100).replace('.', ',')} €. `
        + `Si ${formatoEuros(x)} rindieran igual, serían ${formatoEuros(siRindieraIgual || 0)}. `
        + 'PERO ese ratio es una foto, no una ley: gastar el doble en software no vende el doble. '
        + 'Tu negocio no necesita capital, necesita ventas.',
  });

  // Los seguros primero, y dentro de cada grupo de mayor a menor. Ordenarlos todos juntos por
  // el número pondría un retorno hipotético por delante de uno que está en el BOE, que es
  // exactamente la forma de tomar la peor decisión posible con la mejor tabla posible.
  opciones.sort((a, b2) => {
    if (a.seguro !== b2.seguro) return a.seguro ? -1 : 1;
    return num(b2.retorno, 0) - num(a.retorno, 0);
  });

  const avisos = [];
  avisos.push('Tu negocio no consume capital: consume ventas. Por eso "meterlo en el negocio" no '
    + 'tiene un retorno medido, y cualquier número que te diera aquí sería inventado. Lo que sí '
    + 'está medido es lo de abajo.');
  if (ventasEquivalentes !== null) {
    avisos.push(`Para recuperar ${formatoEuros(x)} vendiendo necesitas `
      + `${ventasTexto(ventasEquivalentes)} ventas`
      + `${mesesAlRitmoDeHoy === null ? '' : `, que a tu ritmo de hoy (${ventasTexto(c.ventasMedia)} `
        + `al mes) son ${mesesTexto(mesesAlRitmoDeHoy)}`}. Esa es la vara con la que medir `
      + 'cualquier promesa que te hagan.');
  } else {
    avisos.push('No puedo traducir ese dinero a ventas: con los ajustes de ahora una venta no te '
      + 'deja nada. Revisa el ticket, la comisión y tu porcentaje en Ajustes del modelo.');
  }
  if (mesesDeFijosNegocio !== null) {
    avisos.push(`Lo único que ese dinero compra hoy en el negocio actual es tiempo: `
      + `${mesesTexto(mesesDeFijosNegocio)} de gastos fijos pagados por adelantado. No vende una `
      + 'sola clase más, pero te deja seguir sin cerrar si un mes viene mal.');
  }

  return {
    importe: eur(x),
    // Lo que ese dinero ES, con sus varas.
    ventasEquivalentes,
    mesesDeFijosNegocio,
    mesesDeTuVida,
    paraEmpatar: {
      ventas: ventasEquivalentes,
      mesesAlRitmoDeHoy,
    },
    enElNegocio: {
      porEuroDeFijo,
      retorno: siRindieraIgual,
      medido: false,
      causal: false,
      supuesto: 'Ratio observado a su ritmo actual (su parte del beneficio dividida entre los '
        + 'gastos fijos del negocio). No es una relación causal: es lo que hay hoy.',
    },
    opciones,
    avisos,
  };
}
