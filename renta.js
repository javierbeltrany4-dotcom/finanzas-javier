// La declaración de la Renta, simulada. Para que llegue a junio sabiendo el número en vez de
// enterándose. Sin DOM y sin fechas del sistema: testeable con `node --test`. El "hoy" entra
// SIEMPRE por parámetro.
//
// POR QUÉ EXISTE ESTE MÓDULO, aunque ya haya un fiscal.js:
//
//   fiscal.js contesta "¿qué me toca presentar y cuánto adelanto?". Eso son los modelos 130:
//   un 20 % fijo del art. 110.1.a) RIRPF que NO es su tipo de IRPF. Aquí se contesta la otra
//   pregunta, la de junio: "cuando se liquide de verdad, ¿me devuelven o pongo dinero?".
//
//   Y la respuesta, con sus cifras, es que le devuelven. Eso también es una noticia que hay
//   que dar: son mil y pico euros suyos que están en Hacienda hasta junio.
//
// LAS REGLAS QUE NO SE TOCAN AQUÍ DENTRO:
//
//  · Ninguna cifra fiscal se inventa. El 5 % de difícil justificación con tope de 2.000 €, el
//    mínimo personal de 5.550 € y el mecanismo del art. 63.1.2º salen de los informes, con su
//    artículo al lado. Lo que los informes NO dan por verificado para 2026 sale marcado
//    (`confirmado: false`) y con su pregunta exacta, no con un número plausible.
//
//  · Prohibido "consúltalo con un profesional" a secas: cada duda va con LA PREGUNTA EXACTA
//    para copiar y pegar (PREGUNTAS_RENTA, más las de fiscal.js que ya valían).
//
//  · Prohibido preocuparle sin darle una acción, y prohibido alegrarle sin darle la condición:
//    la devolución NO existe hasta que presente los cuatro modelos 130. Lo que no ingresa no lo
//    puede restar. Esa frase va en `desviacion()` y en el paso 1 del checklist.
//
//  · `aDevolver` y `aPagar` son dos campos distintos y NUNCA salen los dos a la vez. Un signo
//    negativo en una pantalla de impuestos se lee mal y se lee tarde.
//
// SU CASO (docs/situacion-real-cliente-aleman.md): autónomo español, soltero y sin hijos, en
// estimación directa simplificada, que factura a la GmbH alemana de su socio. Todo lo que
// cobra es rendimiento de actividad económica y tributa íntegro en España (art. 7.1 del
// Convenio España-Alemania de 2011). Sus pagos a cuenta son los modelos 130, y nada más:
// ningún cliente le retiene, porque la GmbH no puede retener IRPF español (art. 76 RIRPF).

import { formatoEuros } from './calculos.js';

import {
  MINIMO_PERSONAL,
  MODELO_DEFAULT,
  TRAMOS_IRPF,
  irpfPorTramos,
  normalizarModelo,
  porVenta,
  rentaFiscalDelAnio,
  tipoMarginal,
  tipoMedioReal,
  tramoDe,
} from './objetivo.js';

import {
  PORCENTAJE_130,
  PREGUNTAS,
  calendarioDelAnio,
  importeModelo130,
} from './fiscal.js';

// ---------------------------------------------------------------------------
// Las cifras de la Renta, con su fuente
// ---------------------------------------------------------------------------

// Gastos de difícil justificación de la estimación directa simplificada. NO son 2.000 €
// automáticos: son el 5 % del rendimiento neto previo CON UN TOPE de 2.000 € al año. Con su
// rendimiento de 7.479,63 € salen 373,98 €, no 2.000; el tope solo se toca a partir de
// 40.000 € de rendimiento neto previo.
//
// FUENTE: docs/situacion-real-cliente-aleman.md §8 punto 24 (corrección expresa del informe)
//         y docs/investigacion-fiscal-2026.md (art. 30.2.4ª LIRPF · estimación directa
//         simplificada). El propio informe avisa: el 5 % está confirmado para 2025 en fuente
//         AEAT y para 2026 SOLO en fuentes secundarias. Por eso `confirmado2026: false`.
export const DIFICIL_JUSTIFICACION = {
  porcentaje: 5,
  tope: 2000,
  articulo: 'Art. 30.2.4ª LIRPF · estimación directa simplificada',
  confirmado2026: false,
  fuente: 'docs/situacion-real-cliente-aleman.md §8 punto 24 · docs/investigacion-fiscal-2026.md',
};

// El mínimo personal del contribuyente: soltero, sin hijos ni ascendientes a cargo.
// El mecanismo importa y casi nadie lo cuenta bien: el mínimo NO se resta de la base. Se le
// aplica la escala y esa cuota se resta de la cuota íntegra (art. 63.1.2º LIRPF). O sea,
// desgrava a los tipos más bajos, no al marginal. Es exactamente lo que hace `irpfPorTramos`.
//
// El 5.550 es el ESTATAL. Cada comunidad fija el suyo (Madrid 5.956,65 · Andalucía 5.790 ·
// C. Valenciana 6.105 · Cataluña 5.550) y la app no sabe dónde está empadronado: por eso es un
// campo editable (`ctx.renta.minimoPersonal`) y sale su aviso con la pregunta.
// FUENTE: docs/investigacion-fiscal-2026.md, sección de IRPF (art. 63.1.2º LIRPF).
export const MINIMO_PERSONAL_ESTATAL = MINIMO_PERSONAL;

// Los mínimos personales autonómicos que el informe da por buenos, para que la pantalla pueda
// ofrecerlos en vez de pedirle un número que no sabe. No se elige ninguno por él.
// FUENTE: docs/investigacion-fiscal-2026.md (mismo párrafo del art. 63.1.2º).
export const MINIMOS_AUTONOMICOS = [
  { comunidad: 'Estatal (por defecto)', importe: 5550 },
  { comunidad: 'Madrid', importe: 5956.65 },
  { comunidad: 'Andalucía', importe: 5790 },
  { comunidad: 'Comunidad Valenciana', importe: 6105 },
  { comunidad: 'Cataluña', importe: 5550 },
];

// El techo de reducción por planes de pensiones: 1.500 € del régimen general más hasta
// 4.250 € adicionales SOLO en planes de empleo simplificados de autónomos. El plan del banco
// de toda la vida se queda en los 1.500.
// FUENTE: docs/investigacion-fiscal-2026.md (art. 52 LIRPF).
export const PLAN_PENSIONES = {
  general: 1500,
  empleoSimplificado: 4250,
  maximo: 5750,
  articulo: 'Art. 52 LIRPF',
  fuente: 'docs/investigacion-fiscal-2026.md',
};

// ---------------------------------------------------------------------------
// Las preguntas exactas, para copiar y pegar
// ---------------------------------------------------------------------------
//
// Ninguna afirma una cifra que los informes no den. Todas llevan dentro la tesis, el artículo
// y lo que se quiere que contesten, que es lo que convierte "pregúntaselo a tu asesoría" en
// algo que se puede hacer hoy desde el móvil.
export const PREGUNTAS_RENTA = {
  dificilJustificacion2026: 'Estoy en estimación directa simplificada. Para el ejercicio 2026, '
    + '¿el porcentaje de gastos de difícil justificación del art. 30.2.4ª LIRPF sigue siendo el '
    + '5 % del rendimiento neto previo con el tope de 2.000 € anuales, o ha cambiado? Lo tengo '
    + 'confirmado en fuente oficial de la AEAT para 2025, pero para 2026 solo en fuentes '
    + 'secundarias, y prefiero no dar por bueno un porcentaje que no he verificado. Confirmadme '
    + 'también las dos cosas siguientes: (a) que se aplica sobre el rendimiento neto PREVIO, es '
    + 'decir, después de restar la cuota de autónomos y la asesoría y antes de cualquier '
    + 'reducción; y (b) si además se aplica en los pagos fraccionados del modelo 130 o solo en '
    + 'la declaración de la Renta. Con mi rendimiento neto previo estimado de unos 7.500 € el '
    + '5 % son unos 375 €, no los 2.000 € del tope: confirmadme que ese es el importe que me '
    + 'estáis aplicando.',

  minimoPersonalCcaa: 'Soy soltero, sin hijos ni ascendientes a cargo. Para calcular mi cuota '
    + 'necesito dos datos que dependen de mi comunidad autónoma de residencia a 31 de diciembre: '
    + '(1) el importe exacto del mínimo personal del contribuyente aplicable en mi comunidad, '
    + 'además del estatal de 5.550 €; y (2) la escala autonómica del IRPF que me corresponde, con '
    + 'sus tramos y tipos. Quiero entender el efecto real: entiendo que el mínimo no se resta de '
    + 'la base, sino que se le aplica la escala y esa cuota se descuenta de la cuota íntegra '
    + '(art. 63.1.2º LIRPF), de modo que desgrava a los tipos más bajos y no a mi marginal. '
    + '¿Es correcto? Y decidme qué documentación necesitáis para acreditar mi residencia '
    + 'autonómica del ejercicio.',

  reduccionesYDeducciones: 'Quiero cerrar el ejercicio sabiendo qué me puedo aplicar y qué no, '
    + 'antes del 31 de diciembre, porque después ya no hay margen. Decidme, con importe máximo y '
    + 'artículo, cuáles de estas me caben en mi situación (autónomo en estimación directa '
    + 'simplificada, soltero, sin hijos, cliente único que es una sociedad alemana): '
    + '(1) reducción por aportaciones a un plan de pensiones de empleo simplificado de autónomos '
    + '(entiendo que son 1.500 € del régimen general más hasta 4.250 € adicionales, art. 52 '
    + 'LIRPF: confirmadme el importe que me cabe a mí y qué producto concreto lo permite); '
    + '(2) primas de seguro de salud como gasto deducible de la actividad; (3) suministros de la '
    + 'vivienda por afectación parcial (entiendo que es el 30 % de la parte proporcional afecta, '
    + 'art. 30.2.5ª.b LIRPF, y que exige haber declarado los metros afectos en el modelo 036: '
    + '¿lo tengo declarado?); (4) reducción por inicio de actividad del art. 32.3 LIRPF, si '
    + 'todavía estoy en plazo. Y decidme cuáles NO me caben, para dejar de darles vueltas.',

  pagosACuentaNoIngresados: 'En la declaración de la Renta se restan como pagos a cuenta los '
    + 'modelos 130 del ejercicio. Mi pregunta es sobre los que están fuera de plazo: '
    + '(1) ¿puedo restarme en la Renta un modelo 130 que presento e ingreso tarde, pero antes de '
    + 'presentar la declaración? (2) ¿Y uno que no haya llegado a presentar ni a ingresar? '
    + 'Entiendo que no, y que solo se resta lo efectivamente ingresado. (3) Si un 130 lo presento '
    + 'con recargo del art. 27 LGT, ¿el recargo también se resta o solo la cuota? Necesito saberlo '
    + 'porque de ello depende que mi declaración salga a devolver o a cero.',
};

// ---------------------------------------------------------------------------
// Utilidades. Todo con Date.UTC y sin mirar el reloj: mismo `hoyISO`, mismo resultado.
// ---------------------------------------------------------------------------

function esFecha(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
}

function num(v, porDefecto = 0) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
  return Number.isFinite(n) ? n : porDefecto;
}

// Redondeo a céntimos. Sin esto, 7.479,63 × 5 % sale con doce decimales y la pantalla enseña
// un dígito que no existe.
function eur(n) {
  return Math.round(num(n, 0) * 100) / 100;
}

function entero(v) {
  return Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null;
}

function anioDe(fechaISO) {
  return esFecha(fechaISO) ? Number(String(fechaISO).slice(0, 4)) : null;
}

// Normaliza 1..4, '1T'..'4T', '1'..'4'. Cualquier otra cosa -> null. Mismo criterio que
// fiscal.js: si las dos pantallas leyeran los periodos distinto, un 130 marcado como
// presentado contaría en un sitio y no en el otro.
function numeroTrimestre(t) {
  const m = /^([1-4])T?$/.exec(String(t ?? '').trim().toUpperCase());
  return m ? Number(m[1]) : null;
}

function ventasTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  if (x > 0 && x < 0.05) return 'menos de 0,1';
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

// "1,3 ventas tuyas" / "1 venta tuya". Vacío si no se puede traducir. Los euros son la
// consecuencia; las ventas son lo único que él mueve, así que van pegadas a cada cifra.
function frasesVentas(n) {
  if (n === null || !Number.isFinite(Number(n)) || !(Number(n) > 0)) return '';
  const una = Math.round(Number(n) * 10) / 10 === 1;
  return `${ventasTexto(n)} ${una ? 'venta tuya' : 'ventas tuyas'}`;
}

// ---------------------------------------------------------------------------
// El contexto, normalizado una sola vez
// ---------------------------------------------------------------------------

// ctx = {
//   datos: { retiros, facturas?, ventas, gastosNegocio, config? },
//   modelo?, hoyISO?, anio?,
//   presentados?: [{ modelo, periodo, anio, fecha?, importe? }],
//   renta?: {                      // TODO editable: lo que la app no puede saber sola
//     ingresos?,                   // fuerza los ingresos del año (si tiene las facturas de verdad)
//     otrosGastos?,                // gastos deducibles que la app no conoce (seguro, suministros…)
//     reducciones?,                // reducciones de la BASE: planes de pensiones (arts. 51 y 52)
//     minimoPersonal?,             // por defecto el estatal, 5.550 €
//     dificilJustificacion?,       // true/false: aplicar o no el 5 % del art. 30.2.4ª
//     tramos?,                     // otra escala (la autonómica de verdad, cuando se sepa)
//   },
// }
function contexto(ctx, anio, hoyISO) {
  const c = ctx || {};
  const datos = c.datos || {};
  const config = datos.config || {};
  const modelo = normalizarModelo(c.modelo || config.modelo || MODELO_DEFAULT);
  const ajustes = c.renta && typeof c.renta === 'object' ? c.renta : {};

  const hoy = esFecha(hoyISO) ? String(hoyISO) : (esFecha(c.hoyISO) ? String(c.hoyISO) : '');
  const anioDeHoy = anioDe(hoy);
  const a = entero(anio) !== null ? entero(anio)
    : (entero(c.anio) !== null ? entero(c.anio) : anioDeHoy);

  const retiros = (Array.isArray(datos.retiros) ? datos.retiros : [])
    .map((r) => ({ fecha: String((r && r.fecha) ?? ''), total: num(r && r.total, 0) }))
    .filter((r) => esFecha(r.fecha));

  // Si algún día apunta sus facturas de verdad, mandan ellas: son el dato bueno. Es la misma
  // regla que fiscal.js, para que las dos pantallas no digan cifras distintas del mismo año.
  const facturas = (Array.isArray(datos.facturas) ? datos.facturas : [])
    .map((f) => ({ fecha: String((f && f.fecha) ?? ''), base: num(f && f.base, 0) }))
    .filter((f) => esFecha(f.fecha));

  const presentados = (Array.isArray(c.presentados) ? c.presentados : []).map((p) => ({
    modelo: String((p && p.modelo) ?? ''),
    periodo: String((p && p.periodo) ?? ''),
    anio: entero(p && p.anio),
    fecha: esFecha(p && p.fecha) ? String(p.fecha) : '',
    importe: p && p.importe !== undefined && p.importe !== null && p.importe !== ''
      ? num(p.importe, 0) : null,
  }));

  const tramos = Array.isArray(ajustes.tramos) && ajustes.tramos.length ? ajustes.tramos : TRAMOS_IRPF;
  const minimoPersonal = Math.max(0, num(ajustes.minimoPersonal, MINIMO_PERSONAL_ESTATAL));

  // La foto fiscal del año EN CURSO: la misma que usa el resto de la app. De aquí sale la
  // proyección de lo que va a acabar facturando en diciembre.
  const renta = a !== null && hoy && anioDeHoy === a
    ? rentaFiscalDelAnio(datos, modelo, hoy, tramos, minimoPersonal)
    : null;

  return {
    datos,
    modelo,
    ajustes,
    hoy,
    anioDeHoy,
    anio: a,
    retiros,
    facturas,
    presentados,
    tramos,
    minimoPersonal,
    minimoPersonalPorDefecto: !Number.isFinite(Number(ajustes.minimoPersonal)),
    renta,
    share: modelo.miShare / 100,
    // Lo que deja UNA venta antes de impuestos: la vara con la que se traduce cualquier
    // importe a ventas. La misma que usan fiscal.js y la vista.
    porVentaMia: porVenta(modelo).miParte,
    // El ctx tal y como lo entiende fiscal.js. Se le pasa TAL CUAL para que los cuatro 130
    // que se restan aquí sean exactamente los mismos que enseña el bloque de "cuánto tienes
    // que tener guardado hoy". Ni un campo de más.
    ctxFiscal: { datos, modelo, hoyISO: hoy, presentados, anio: a },
  };
}

// Cuántas ventas hacen falta para un importe. null si una venta no deja nada.
function enVentas(c, importe) {
  if (!(c.porVentaMia > 0)) return null;
  return Math.max(0, num(importe, 0) / c.porVentaMia);
}

// ---------------------------------------------------------------------------
// Los ingresos del año
// ---------------------------------------------------------------------------

// Lo FACTURADO a la GmbH en el ejercicio. Tres caminos, en este orden:
//   1. Lo que diga `ctx.renta.ingresos`, si lo ha escrito él (es el dato bueno de verdad).
//   2. Las facturas apuntadas de ese año, si las hay.
//   3. Sus retiros del año por su parte del reparto. Y si el año es el que está en curso,
//      proyectados a diciembre al mismo ritmo que usa el resto de la app.
//
// El tercer camino es el que hoy manda, y por eso sale con `fuente: 'retiros'` y su aviso: la
// hoja apunta el reparto ENTERO de los dos socios y lo suyo es el 40 % de ese total.
function ingresosDelAnio(c) {
  const forzado = c.ajustes.ingresos;
  if (forzado !== undefined && forzado !== null && forzado !== '') {
    return { eur: Math.max(0, num(forzado, 0)), fuente: 'editado', proyectado: false, hayDatos: true };
  }

  const anio = String(c.anio);
  const delAnio = (lista) => lista.filter((x) => x.fecha.slice(0, 4) === anio);

  const fac = delAnio(c.facturas);
  if (fac.length) {
    return {
      eur: fac.reduce((acc, f) => acc + f.base, 0),
      fuente: 'facturas',
      proyectado: false,
      hayDatos: true,
    };
  }

  const ret = delAnio(c.retiros);
  // El ejercicio en curso se proyecta a diciembre; uno ya cerrado, no. El 31 de diciembre
  // tampoco: ese día el año ya está completo y proyectar sería multiplicar por uno y mentir
  // con la etiqueta.
  const enCurso = c.anio === c.anioDeHoy && Boolean(c.hoy) && c.hoy < `${anio}-12-31`;
  if (enCurso && c.renta) {
    return {
      eur: Math.max(0, num(c.renta.retiradoProyectado, 0)),
      fuente: 'retiros',
      proyectado: true,
      hayDatos: ret.length > 0 || num(c.renta.retiradoYtd, 0) > 0,
    };
  }

  return {
    eur: ret.reduce((acc, r) => acc + r.total, 0) * c.share,
    fuente: 'retiros',
    proyectado: false,
    hayDatos: ret.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Los pagos a cuenta: los cuatro modelos 130 del año
// ---------------------------------------------------------------------------

// Lo que se resta en la Renta son los modelos 130 del ejercicio, y nada más: a él no le
// retiene nadie, porque la GmbH alemana no puede practicar retención de IRPF español
// (art. 76 RIRPF). Por eso el 100 % de sus ingresos va sin retención y por eso está obligado
// a los cuatro trimestres (art. 109.2 RIRPF).
//
// Se distingue con cuidado entre DOS cosas que se parecen y no son lo mismo:
//   · `total`     : lo que se va a poder restar en la Renta si presenta los cuatro.
//   · `ingresado` : lo que consta REALMENTE ingresado hoy.
// La diferencia es la condición de la devolución, y es la frase más importante del módulo.
function pagosDelAnio(c) {
  const detalle = [];
  let total = 0;
  let ingresado = 0;
  let nPresentados = 0;

  for (let t = 1; t <= 4; t += 1) {
    const r = importeModelo130(c.ctxFiscal, t);
    const apunte = c.presentados.find((p) => p.modelo === '130'
      && numeroTrimestre(p.periodo) === t
      && (p.anio === null || p.anio === c.anio));
    const presentado = Boolean(apunte);
    const conImporte = presentado && apunte.importe !== null;
    // Si consta presentado con su importe, manda ese: es el dinero que salió del banco. Si
    // consta presentado pero sin importe, se usa la estimación y se dice.
    const importe = eur(conImporte ? Math.max(0, apunte.importe) : num(r.aIngresar, 0));

    total += importe;
    if (presentado) {
      nPresentados += 1;
      ingresado += importe;
    }

    detalle.push({
      trimestre: t,
      periodo: `${t}T`,
      importe,
      presentado,
      // De dónde sale ese importe: de lo que él apuntó, de lo que consta presentado sin
      // importe, o de la estimación de fiscal.js.
      fuente: conImporte ? 'apuntado' : (presentado ? 'presentado-sin-importe' : 'estimado'),
      proyectado: Boolean(r.proyectado),
    });
  }

  return {
    total: eur(total),
    ingresado: eur(ingresado),
    pendiente: eur(total - ingresado),
    nPresentados,
    fuente: nPresentados === 4 ? 'presentados' : (nPresentados > 0 ? 'mixto' : 'estimado'),
    detalle,
  };
}

// ---------------------------------------------------------------------------
// La simulación
// ---------------------------------------------------------------------------

// La forma vacía. Se devuelve entera, con todos los campos a cero, en vez de un objeto a
// medias: una pantalla que recibe `undefined` pinta "NaN €", y eso da más miedo que la cifra.
function vacio(anio, avisos) {
  return {
    anio: anio ?? null,
    conocido: false,
    proyectado: false,
    fuenteIngresos: 'retiros',
    ingresos: 0,
    gastosDeducibles: 0,
    rendimientoNeto: 0,
    reducciones: 0,
    baseLiquidable: 0,
    cuotaIntegra: 0,
    minimoPersonal: MINIMO_PERSONAL_ESTATAL,
    cuotaDelMinimo: 0,
    cuotaLiquida: 0,
    pagosACuenta: 0,
    resultado: 0,
    aDevolver: 0,
    aPagar: 0,
    resultadoEnVentas: null,
    tipoMedio: 0,
    tipoMarginal: tipoMarginal(0),
    tramo: tramoDe(0),
    dificilJustificacion: {
      aplicado: false,
      eur: 0,
      porcentaje: DIFICIL_JUSTIFICACION.porcentaje,
      tope: DIFICIL_JUSTIFICACION.tope,
      enElTope: false,
      confirmado: DIFICIL_JUSTIFICACION.confirmado2026,
      articulo: DIFICIL_JUSTIFICACION.articulo,
      pregunta: PREGUNTAS_RENTA.dificilJustificacion2026,
    },
    sinDificilJustificacion: { cuotaLiquida: 0, resultado: 0, aDevolver: 0, aPagar: 0, diferencia: 0 },
    pagos: { total: 0, ingresado: 0, pendiente: 0, nPresentados: 0, fuente: 'estimado', detalle: [] },
    campanaDesde: null,
    campanaHasta: null,
    campanaConfirmada: false,
    frase: 'No hay datos de ese ejercicio, así que no hay Renta que simular.',
    queHacer: 'Cuando haya retiros o facturas apuntadas de ese año, esta simulación sale sola.',
    detalle: [],
    avisos: avisos || [],
  };
}

// La declaración de la Renta del ejercicio `anio`, entera y con el desglose.
//
// EL ORDEN DE LA CUENTA, que es el del impreso y no otro:
//   ingresos
//   − gastos deducibles (cuota de autónomo + asesoría + el 5 % de difícil justificación)
//   = rendimiento neto
//   − reducciones de la base (planes de pensiones: arts. 51 y 52 LIRPF)
//   = base liquidable
//   → cuota íntegra por la escala progresiva (art. 63 LIRPF)
//   − la cuota del mínimo personal (art. 63.1.2º: el mínimo NO se resta de la base)
//   = cuota líquida  ← ESTE es su IRPF del año, el de verdad
//   − pagos a cuenta (los cuatro modelos 130)
//   = resultado. Positivo = le devuelven; negativo = pone dinero.
export function simularRenta(ctx, anio, hoyISO) {
  const c = contexto(ctx, anio, hoyISO);

  if (c.anio === null) {
    return vacio(null, ['Sin fecha de hoy ni año no se puede simular la Renta: pásale `hoyISO` o `anio`.']);
  }

  const ing = ingresosDelAnio(c);
  if (!ing.hayDatos) {
    return vacio(c.anio, [
      `No hay ni un retiro ni una factura de ${c.anio}, así que no hay nada que declarar de ese `
      + 'ejercicio. Esto no dice que no debas nada: dice que la app no tiene datos.',
      'Si ese año sí facturaste, apunta las facturas (o los retiros) y la simulación sale sola. '
      + 'Mientras tanto, el borrador de la AEAT es la única foto buena de un año cerrado.',
    ]);
  }

  const ingresos = eur(ing.eur);

  // Los dos gastos que la app conoce con certeza, los doce meses del año: la cuota de autónomo
  // y la asesoría. Son deducibles se haya facturado mucho o poco. El gimnasio NO entra: no es
  // gasto de la actividad, y meterlo aquí es el error que le costaría una paralela.
  const cuotaAutonomoAnual = eur(c.modelo.cuotaAutonomo * 12);
  const asesoriaAnual = eur(c.modelo.deducibles * 12);
  const otrosGastos = Math.max(0, eur(num(c.ajustes.otrosGastos, 0)));
  const gastosBase = eur(cuotaAutonomoAnual + asesoriaAnual + otrosGastos);

  // Rendimiento neto PREVIO: la magnitud sobre la que se calcula el 5 %.
  const rendimientoNetoPrevio = eur(ingresos - gastosBase);

  const aplicaDj = c.ajustes.dificilJustificacion === false ? false : true;
  const djBruto = Math.max(0, rendimientoNetoPrevio) * (DIFICIL_JUSTIFICACION.porcentaje / 100);
  const dj = aplicaDj ? eur(Math.min(DIFICIL_JUSTIFICACION.tope, djBruto)) : 0;

  const gastosDeducibles = eur(gastosBase + dj);
  const rendimientoNeto = eur(ingresos - gastosDeducibles);

  const reducciones = Math.max(0, eur(num(c.ajustes.reducciones, 0)));
  // La base liquidable general no baja de cero: una base negativa es una pérdida del ejercicio
  // que se compensa en años siguientes, no un IRPF negativo. Se dice en un aviso.
  const baseLiquidable = Math.max(0, eur(rendimientoNeto - reducciones));

  // La escala. Se reutiliza `irpfPorTramos` de objetivo.js en vez de reescribir aquí el
  // recorrido de los tramos: con mínimo 0 devuelve la cuota íntegra, y con el mínimo puesto,
  // la cuota líquida. Así las dos pantallas no pueden divergir nunca.
  const cuotaIntegra = eur(irpfPorTramos(baseLiquidable, c.tramos, 0));
  const cuotaDelMinimo = eur(irpfPorTramos(Math.min(baseLiquidable, c.minimoPersonal), c.tramos, 0));
  const cuotaLiquida = eur(irpfPorTramos(baseLiquidable, c.tramos, c.minimoPersonal));

  const pagos = pagosDelAnio(c);
  const pagosACuenta = pagos.total;

  const resultado = eur(pagosACuenta - cuotaLiquida);
  const aDevolver = Math.max(0, resultado);
  const aPagar = Math.max(0, eur(-resultado));

  // La misma cuenta SIN el 5 % de difícil justificación. No es adorno: es el número que da hoy
  // el bloque de "cuánto tienes que tener guardado", que no aplica ese 5 % a propósito porque
  // el informe no confirma si entra en el pago fraccionado. Enseñar los dos evita que la misma
  // pantalla parezca contradecirse, y de paso pone precio exacto a la pregunta.
  const baseSinDj = Math.max(0, eur(rendimientoNetoPrevio - reducciones));
  const cuotaSinDj = eur(irpfPorTramos(baseSinDj, c.tramos, c.minimoPersonal));
  const resultadoSinDj = eur(pagosACuenta - cuotaSinDj);

  // Las fechas de la campaña salen del MISMO calendario que la pestaña de Hacienda, no de una
  // copia: el informe dice "abril a junio del año siguiente" y no da el día exacto de cierre,
  // así que fiscal.js toma el 30 de junio y lo marca como no confirmado. Aquí se hereda.
  const enCalendario = calendarioDelAnio(c.anio, c.hoy).find((v) => v.modelo === '100') || null;

  const detalle = [
    {
      concepto: ing.proyectado
        ? `Ingresos facturados a la GmbH (proyección de ${c.anio})`
        : `Ingresos facturados a la GmbH en ${c.anio}`,
      eur: ingresos,
      articulo: 'Art. 27.1 LIRPF · rendimiento de actividad económica',
    },
    {
      concepto: `Cuota de autónomo (12 × ${formatoEuros(c.modelo.cuotaAutonomo)})`,
      eur: -cuotaAutonomoAnual,
      articulo: 'Art. 30.2 LIRPF · gasto deducible de la actividad',
    },
    {
      concepto: `Asesoría (12 × ${formatoEuros(c.modelo.deducibles)})`,
      eur: -asesoriaAnual,
      articulo: 'Art. 30.2 LIRPF · gasto deducible de la actividad',
    },
  ];

  if (otrosGastos > 0) {
    detalle.push({
      concepto: 'Otros gastos deducibles que has apuntado tú',
      eur: -otrosGastos,
      articulo: 'Art. 30.2 LIRPF · los justificantes los tienes que tener tú',
    });
  }

  if (aplicaDj) {
    detalle.push({
      concepto: dj >= DIFICIL_JUSTIFICACION.tope
        ? `Gastos de difícil justificación (${DIFICIL_JUSTIFICACION.porcentaje} %, en el tope de ${formatoEuros(DIFICIL_JUSTIFICACION.tope)})`
        : `Gastos de difícil justificación (${DIFICIL_JUSTIFICACION.porcentaje} % de ${formatoEuros(rendimientoNetoPrevio)})`,
      eur: -dj,
      articulo: DIFICIL_JUSTIFICACION.articulo,
    });
  }

  detalle.push({ concepto: 'Rendimiento neto', eur: rendimientoNeto, articulo: '' });

  detalle.push({
    concepto: reducciones > 0
      ? 'Reducciones de la base (planes de pensiones y demás)'
      : 'Reducciones de la base: ninguna apuntada',
    eur: -reducciones,
    articulo: 'Arts. 51 y 52 LIRPF',
  });

  detalle.push({ concepto: 'Base liquidable', eur: baseLiquidable, articulo: 'Art. 50 LIRPF' });
  detalle.push({
    concepto: 'Cuota íntegra (escala progresiva)',
    eur: cuotaIntegra,
    articulo: 'Art. 63 LIRPF · escala general',
  });
  detalle.push({
    concepto: `Cuota del mínimo personal (${formatoEuros(c.minimoPersonal)} pasados por la escala)`,
    eur: -cuotaDelMinimo,
    articulo: 'Art. 63.1.2º LIRPF · el mínimo no se resta de la base',
  });
  detalle.push({
    concepto: 'Cuota líquida — tu IRPF del año, el de verdad',
    eur: cuotaLiquida,
    articulo: 'Art. 62 LIRPF',
  });
  detalle.push({
    concepto: `Pagos a cuenta: los cuatro modelos 130 (${PORCENTAJE_130} %)`,
    eur: -pagosACuenta,
    articulo: 'Art. 110.1.a) RIRPF · pago fraccionado',
  });
  detalle.push({
    concepto: aDevolver > 0 ? 'Resultado: A DEVOLVER' : (aPagar > 0 ? 'Resultado: A PAGAR' : 'Resultado: a cero'),
    eur: resultado,
    articulo: 'Art. 97 LIRPF · autoliquidación',
  });

  const avisos = [];

  if (ing.proyectado) {
    avisos.push(`El año todavía no ha cerrado: los ${formatoEuros(ingresos)} de ingresos son una `
      + 'PROYECCIÓN al ritmo de lo que llevas facturado, no un dato cerrado. Se ajusta sola según '
      + 'vayas facturando, y en diciembre será la cifra real.');
  }
  if (ing.fuente === 'retiros') {
    avisos.push('Los ingresos salen de tus retiros (tu parte del reparto), no de facturas '
      + 'apuntadas. Si tus facturas a la GmbH no coinciden con eso, apúntalas: mandan ellas, y '
      + 'esta simulación se queda corta o larga exactamente en esa diferencia.');
  }
  if (aplicaDj) {
    avisos.push(`Se ha aplicado el ${DIFICIL_JUSTIFICACION.porcentaje} % de gastos de difícil `
      + `justificación (${formatoEuros(dj)}, ${DIFICIL_JUSTIFICACION.articulo}). NO son los 2.000 € `
      + `del tope: son el ${DIFICIL_JUSTIFICACION.porcentaje} % de tu rendimiento neto previo, y el `
      + 'tope solo se toca a partir de 40.000 € de rendimiento. El informe lo da por confirmado '
      + 'para 2025 en fuente AEAT y para 2026 solo en fuentes secundarias, así que confírmalo. '
      + 'Pregunta: ' + PREGUNTAS_RENTA.dificilJustificacion2026);
    avisos.push('Ese 5 % es la diferencia entre esta pantalla y el bloque de "cuánto tienes que '
      + `tener guardado hoy": allí NO se aplica, porque el informe no confirma si entra en el pago `
      + `fraccionado del modelo 130. Sin él te devolverían ${formatoEuros(Math.max(0, resultadoSinDj))} `
      + `en vez de ${formatoEuros(Math.max(0, resultado))}: ${formatoEuros(Math.abs(eur(resultado - resultadoSinDj)))} `
      + 'de diferencia. No es un error de la app: es una pregunta sin cerrar, y ese es su precio.');
  } else {
    avisos.push(`NO se ha aplicado el ${DIFICIL_JUSTIFICACION.porcentaje} % de gastos de difícil `
      + `justificación (${DIFICIL_JUSTIFICACION.articulo}) porque lo has desactivado. Si te `
      + 'corresponde, estás pagando de más. Pregunta: ' + PREGUNTAS_RENTA.dificilJustificacion2026);
  }
  if (c.minimoPersonalPorDefecto) {
    avisos.push(`Se usa el mínimo personal ESTATAL de ${formatoEuros(MINIMO_PERSONAL_ESTATAL)} `
      + '(soltero, sin hijos ni ascendientes). Cada comunidad fija además el suyo y la mitad de la '
      + 'escala también es autonómica: la app no sabe dónde estás empadronado a 31 de diciembre, '
      + 'así que esto aproxima. Sirve para decidir, no para liquidar. Pregunta: '
      + PREGUNTAS_RENTA.minimoPersonalCcaa);
  }
  if (!(reducciones > 0)) {
    avisos.push('No se ha aplicado NINGUNA reducción de la base porque la app no sabe si tienes. '
      + `La más grande que te cabe es el plan de pensiones de empleo simplificado de autónomos: `
      + `${formatoEuros(PLAN_PENSIONES.general)} del régimen general más hasta `
      + `${formatoEuros(PLAN_PENSIONES.empleoSimplificado)} adicionales (${PLAN_PENSIONES.articulo}). `
      + 'Es un campo editable y caduca el 31 de diciembre. Pregunta: '
      + PREGUNTAS_RENTA.reduccionesYDeducciones);
  }
  if (c.modelo.gastosPersonales > 0) {
    avisos.push(`El gimnasio (${formatoEuros(c.modelo.gastosPersonales)} al mes) NO está aquí y no `
      + 'puede estar: no es gasto de la actividad. Sale de tu bolsillo después de impuestos, no '
      + 'antes. Meterlo como deducible es de las cosas que Hacienda cruza sola.');
  }
  if (rendimientoNeto < 0) {
    avisos.push('Tu rendimiento neto sale NEGATIVO: gastas más de lo que facturas. Eso no es un '
      + 'IRPF negativo (no existe): es una pérdida del ejercicio que se compensa con los '
      + 'siguientes. Díselo a tu asesoría para que la deje declarada, o la pierdes.');
  }
  if (pagos.fuente !== 'presentados') {
    avisos.push(`De los ${formatoEuros(pagosACuenta)} de modelos 130 que se restan aquí, solo consta `
      + `presentado ${formatoEuros(pagos.ingresado)} (${pagos.nPresentados} de 4 trimestres). Lo que `
      + 'no ingreses no lo puedes restar en la Renta: esta devolución no existe hasta que los '
      + 'presentes. Pregunta: ' + PREGUNTAS_RENTA.pagosACuentaNoIngresados);
  }
  if (enCalendario && enCalendario.confirmado === false) {
    avisos.push('El informe dice "abril a junio del año siguiente" y no da el día exacto de cierre '
      + `de la campaña. Aquí se toma el ${enCalendario.fechaLimite} como referencia: verifícalo. `
      + 'Pregunta: ' + PREGUNTAS.calendario2027);
  }
  avisos.push('La escala que se usa es la general estatal más una aproximación autonómica '
    + 'agregada, la misma de todo el dashboard. Sirve para decidir y para no llevarse un susto, '
    + 'no para liquidar: quien firma la declaración es tu asesoría.');

  const enVentasResultado = enVentas(c, aDevolver > 0 ? aDevolver : aPagar);
  const colaVentas = frasesVentas(enVentasResultado);

  const frase = aDevolver > 0
    ? `En la Renta de ${c.anio} te DEVUELVEN ${formatoEuros(aDevolver)}`
      + (colaVentas ? ` (${colaVentas})` : '') + '.'
    : (aPagar > 0
      ? `En la Renta de ${c.anio} te toca PAGAR ${formatoEuros(aPagar)}`
        + (colaVentas ? ` (${colaVentas})` : '') + '.'
      : `La Renta de ${c.anio} te sale a cero: ni pagas ni te devuelven.`);

  const queHacer = aDevolver > 0
    ? (pagos.fuente === 'presentados'
      ? `Nada que apartar para la Renta: tus cuatro modelos 130 (${formatoEuros(pagosACuenta)}) ya `
        + `cubren de sobra tu IRPF real (${formatoEuros(cuotaLiquida)}). Presenta la declaración `
        + 'entre abril y junio y cobra la devolución. Ese dinero es tuyo y está en Hacienda.'
      : `Presenta los modelos 130 que te falten: hasta que no los ingreses, esos `
        + `${formatoEuros(pagos.pendiente)} no se pueden restar y la devolución de `
        + `${formatoEuros(aDevolver)} no existe. Con ellos presentados, en junio cobras.`)
    : (aPagar > 0
      ? `Aparta ${formatoEuros(aPagar)} antes de junio${colaVentas ? ` (${colaVentas})` : ''}. `
        + 'Créate en Mi patrimonio una reserva llamada "Renta" y mételo ahí en cuanto puedas: es '
        + 'dinero que ya no es tuyo.'
      : 'No hay nada que apartar ni que cobrar. Presenta la declaración igualmente entre abril y '
        + 'junio: estás obligado y no presentarla es lo único que sí tiene coste.');

  return {
    anio: c.anio,
    conocido: true,
    proyectado: ing.proyectado,
    fuenteIngresos: ing.fuente,

    ingresos,
    gastosDeducibles,
    rendimientoNeto,
    reducciones,
    baseLiquidable,
    cuotaIntegra,
    minimoPersonal: c.minimoPersonal,
    cuotaDelMinimo,
    cuotaLiquida,
    pagosACuenta,
    resultado,
    aDevolver,
    aPagar,
    resultadoEnVentas: enVentasResultado,

    // El desglose de los gastos, para poder enseñarlos uno a uno sin recalcular nada.
    cuotaAutonomoAnual,
    asesoriaAnual,
    otrosGastos,
    rendimientoNetoPrevio,

    tipoMedio: tipoMedioReal(baseLiquidable, c.tramos, c.minimoPersonal),
    tipoMarginal: tipoMarginal(baseLiquidable, c.tramos),
    tramo: tramoDe(baseLiquidable, c.tramos),

    dificilJustificacion: {
      aplicado: aplicaDj,
      eur: dj,
      porcentaje: DIFICIL_JUSTIFICACION.porcentaje,
      tope: DIFICIL_JUSTIFICACION.tope,
      enElTope: aplicaDj && dj >= DIFICIL_JUSTIFICACION.tope,
      confirmado: DIFICIL_JUSTIFICACION.confirmado2026,
      articulo: DIFICIL_JUSTIFICACION.articulo,
      pregunta: PREGUNTAS_RENTA.dificilJustificacion2026,
    },

    // La misma Renta sin ese 5 %, que es lo que hoy dice el bloque de "cuánto apartar".
    sinDificilJustificacion: {
      cuotaLiquida: cuotaSinDj,
      resultado: resultadoSinDj,
      aDevolver: Math.max(0, resultadoSinDj),
      aPagar: Math.max(0, eur(-resultadoSinDj)),
      diferencia: eur(resultado - resultadoSinDj),
    },

    pagos,
    campanaDesde: enCalendario ? enCalendario.fechaApertura : null,
    campanaHasta: enCalendario ? enCalendario.fechaLimite : null,
    campanaConfirmada: enCalendario ? enCalendario.confirmado !== false : false,

    frase,
    queHacer,
    detalle,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// La desviación: lo que lleva ingresado contra lo que va a deber
// ---------------------------------------------------------------------------

// La pregunta de junio, en un número y una frase. `desviacion` es POSITIVA cuando le devuelven.
//
// Y con ella, la condición que casi nadie cuenta: en la Renta solo se resta lo que de verdad se
// ha ingresado. Si no presenta los 130, no hay pagos a cuenta que restar y la devolución
// desaparece. Por eso van tres cifras y no una: lo que se restará, lo que consta ingresado y lo
// que falta por ingresar para que esto sea verdad.
export function desviacion(ctx, anio, hoyISO) {
  const c = contexto(ctx, anio, hoyISO);
  const r = simularRenta(ctx, anio, hoyISO);

  if (!r.conocido) {
    return {
      anio: r.anio,
      conocido: false,
      irpfDelAnio: 0,
      pagosACuenta: 0,
      ingresado: 0,
      pendienteDeIngresar: 0,
      desviacion: 0,
      aDevolver: 0,
      aPagar: 0,
      sentido: 'cero',
      enVentas: null,
      adelantoDeMasPct: null,
      frase: r.frase,
      queHacer: r.queHacer,
      avisos: r.avisos,
    };
  }

  const irpfDelAnio = r.cuotaLiquida;
  const pagosACuenta = r.pagosACuenta;
  const desv = eur(pagosACuenta - irpfDelAnio);
  const aDevolver = Math.max(0, desv);
  const aPagar = Math.max(0, eur(-desv));
  const sentido = aDevolver > 0 ? 'devolver' : (aPagar > 0 ? 'pagar' : 'cero');

  // Cuánto está adelantando de más, en porcentaje de su impuesto real. Con un IRPF de 295,57 €
  // y 1.495,93 € de pagos, está adelantando cinco veces lo que debe: eso explica el número
  // mejor que el propio número.
  const adelantoDeMasPct = irpfDelAnio > 0 ? Math.round((desv / irpfDelAnio) * 1000) / 10 : null;

  const cola = frasesVentas(enVentas(c, aDevolver > 0 ? aDevolver : aPagar));

  const avisos = [];

  if (sentido === 'devolver') {
    avisos.push(`No es un error ni un regalo: el modelo 130 es un ${PORCENTAJE_130} % FIJO sobre el `
      + `rendimiento neto (art. 110.1.a) RIRPF) y tu tipo real es del `
      + `${String(Math.round(r.tipoMedio * 10) / 10).replace('.', ',')} %. Adelantas al `
      + `${PORCENTAJE_130} % y liquidas al ${String(Math.round(r.tipoMedio * 10) / 10).replace('.', ',')} %: `
      + 'la diferencia vuelve en junio.');
    if (adelantoDeMasPct !== null && adelantoDeMasPct > 0) {
      avisos.push(`Estás adelantando un ${String(adelantoDeMasPct).replace('.', ',')} % más de lo `
        + `que vas a deber: ${formatoEuros(pagosACuenta)} contra ${formatoEuros(irpfDelAnio)}. Ese `
        + 'dinero es tuyo, pero está en Hacienda hasta junio: no cuentes con él antes.');
    }
  }
  if (sentido === 'pagar') {
    avisos.push(`Los modelos 130 del año (${formatoEuros(pagosACuenta)}) NO cubren tu IRPF real `
      + `(${formatoEuros(irpfDelAnio)}). La diferencia la pones tú en junio.`);
  }
  if (r.pagos.fuente !== 'presentados') {
    avisos.push(`ATENCIÓN A ESTO, que es la condición de todo lo anterior: de los `
      + `${formatoEuros(pagosACuenta)} solo consta ingresado ${formatoEuros(r.pagos.ingresado)}. `
      + `Quedan ${formatoEuros(r.pagos.pendiente)} sin presentar, y en la Renta solo se resta lo que `
      + 'de verdad se ha ingresado. Si no los presentas, esta cuenta no vale. Pregunta: '
      + PREGUNTAS_RENTA.pagosACuentaNoIngresados);
  }
  avisos.push(...r.avisos);

  const frase = sentido === 'devolver'
    ? `Vas ${formatoEuros(aDevolver)} POR DELANTE de Hacienda: te lo devuelven en la Renta de `
      + `${r.anio}${cola ? ` (${cola})` : ''}.`
    : (sentido === 'pagar'
      ? `Vas ${formatoEuros(aPagar)} POR DETRÁS de Hacienda: eso es lo que tendrás que poner en la `
        + `Renta de ${r.anio}${cola ? ` (${cola})` : ''}.`
      : `Vas justo: lo que ingresas en los 130 es lo mismo que vas a deber. Ni devolución ni susto.`);

  const queHacer = sentido === 'devolver'
    ? (r.pagos.fuente === 'presentados'
      ? `No apartes nada para la Renta: te sobra. Lo único que tienes que hacer es presentarla `
        + 'entre abril y junio para cobrar la devolución. Si no la presentas, ese dinero se queda '
        + 'donde está.'
      : `Presenta los ${r.pagos.detalle.filter((t) => !t.presentado).length} modelos 130 que te `
        + `faltan (${formatoEuros(r.pagos.pendiente)}). Ese dinero no se pierde: vuelve en junio. `
        + 'Lo que sí se pierde es el recargo si sigues esperando.')
    : (sentido === 'pagar'
      ? `Aparta ${formatoEuros(aPagar)} en Mi patrimonio, en una reserva llamada "Renta", antes de `
        + 'junio. Repartido hasta entonces son unos '
        + `${formatoEuros(eur(aPagar / 12))} al mes. No es negociable: es dinero que ya no es tuyo.`
      : 'Nada que hacer más que presentarla en plazo. Vuelve a mirar esto cuando cambien tus '
        + 'ingresos: el equilibrio de hoy no aguanta un trimestre bueno.');

  return {
    anio: r.anio,
    conocido: true,
    irpfDelAnio,
    pagosACuenta,
    ingresado: r.pagos.ingresado,
    pendienteDeIngresar: r.pagos.pendiente,
    desviacion: desv,
    aDevolver,
    aPagar,
    sentido,
    enVentas: enVentas(c, aDevolver > 0 ? aDevolver : aPagar),
    adelantoDeMasPct,
    frase,
    queHacer,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// El checklist: qué tiene que tener listo antes de junio, en orden
// ---------------------------------------------------------------------------

// El orden NO es el del impreso: es el de los relojes. Primero lo que ya está corriendo (los
// 130 vencidos), después lo que caduca el 31 de diciembre y todavía puede cambiar la cifra
// (el plan de pensiones), después las preguntas que hay que hacer con tiempo, después los
// papeles, y al final presentar.
//
// `hecho` vale true, false o null. `null` significa "la app no lo puede saber": no se marca
// como pendiente algo que a lo mejor ya está hecho, ni como hecho algo que no consta.
export function checklistRenta(ctx, anio) {
  const c = contexto(ctx, anio, ctx && ctx.hoyISO);
  const a = c.anio;
  const r = simularRenta(ctx, a, c.hoy);

  const pasos = [];
  const add = (x) => pasos.push({
    orden: pasos.length + 1,
    id: x.id,
    titulo: x.titulo,
    porQue: x.porQue,
    queHacer: x.queHacer,
    cuando: x.cuando,
    fechaLimite: x.fechaLimite ?? null,
    hecho: x.hecho === undefined ? null : x.hecho,
    pregunta: x.pregunta ?? null,
    fuente: x.fuente,
  });

  if (a === null) {
    return [];
  }

  // 1. Los modelos 130. Sin ellos no hay nada que restar, y son lo único de esta lista que
  //    empeora solo mientras no se hace.
  const faltan = r.conocido ? r.pagos.detalle.filter((t) => !t.presentado) : [];
  add({
    id: '130-del-anio',
    titulo: `Presentar los cuatro modelos 130 de ${a}`,
    porQue: 'Son los únicos pagos a cuenta que tienes: la GmbH alemana no te retiene IRPF español '
      + '(art. 76 RIRPF), así que el 100 % de tus ingresos va sin retención. En la Renta solo se '
      + 'resta lo que de verdad se ha ingresado: cada 130 sin presentar es dinero que no te '
      + 'devuelven.',
    // Tres respuestas distintas, porque son tres situaciones distintas: te faltan, los tienes,
    // o la app no tiene datos de ese año. Decir "los tienes los cuatro" cuando lo que pasa es
    // que no se sabe nada del ejercicio es justo la tranquilidad que luego sale cara.
    queHacer: !r.conocido
      ? `No tengo datos de ${a} para saber qué 130 presentaste. Míralo en la Sede de la AEAT, en `
        + '"Mis expedientes", y compruébalo tú: sin ellos no hay pagos a cuenta que restar.'
      : (faltan.length
        ? `Te faltan ${faltan.length}: ${faltan.map((t) => t.periodo).join(', ')}. Suman `
          + `${formatoEuros(r.pagos.pendiente)}. Preséntalos en la Sede de la AEAT, y los vencidos `
          + 'hoy mismo: el recargo del art. 27 LGT sube de golpe cada mes completo.'
        : 'Los tienes los cuatro. Guarda los justificantes con su CSV: son la prueba de los pagos '
          + 'a cuenta que vas a restar.'),
    cuando: '20 de abril, 20 de julio, 20 de octubre y 30 de enero del año siguiente',
    fechaLimite: `${a + 1}-01-30`,
    hecho: r.conocido ? faltan.length === 0 : null,
    pregunta: PREGUNTAS_RENTA.pagosACuentaNoIngresados,
    fuente: 'docs/situacion-real-cliente-aleman.md §2.4 y §3.2 · arts. 109.2 y 110.1.a) RIRPF',
  });

  // 2. Lo único que todavía puede MOVER la cifra, y caduca con el año.
  add({
    id: 'plan-pensiones',
    titulo: `Decidir antes del 31 de diciembre de ${a} si metes dinero en un plan de pensiones`,
    porQue: 'Es la única palanca de esta lista que todavía cambia el resultado, y la única que '
      + 'caduca con el año: el 1 de enero ya no se puede hacer nada por el ejercicio anterior. Y '
      + 'no todos valen lo mismo: el plan del banco de toda la vida se queda en '
      + `${formatoEuros(PLAN_PENSIONES.general)}; el de EMPLEO SIMPLIFICADO de autónomos llega a `
      + `${formatoEuros(PLAN_PENSIONES.maximo)}.`,
    queHacer: `Pregunta a tu asesoría qué importe te cabe a ti (${PLAN_PENSIONES.articulo}) y con `
      + 'qué producto concreto, y decide con la cuenta delante. Con tu rendimiento de este año la '
      + 'rebaja se aplica a tu tipo, que es bajo: puede que no compense, y saberlo también es '
      + 'decidir. Lo que no vale es que se te pase la fecha sin haberlo mirado.',
    cuando: 'antes del 31 de diciembre',
    fechaLimite: `${a}-12-31`,
    hecho: r.conocido ? r.reducciones > 0 : null,
    pregunta: PREGUNTAS_RENTA.reduccionesYDeducciones,
    fuente: `docs/investigacion-fiscal-2026.md · ${PLAN_PENSIONES.articulo}`,
  });

  // 3. La pregunta que cambia las dos pantallas a la vez.
  add({
    id: 'dificil-justificacion',
    titulo: `Confirmar el ${DIFICIL_JUSTIFICACION.porcentaje} % de gastos de difícil justificación de ${a}`,
    porQue: 'Es un gasto deducible que no necesita factura y que mucha gente no se aplica. No son '
      + `los ${formatoEuros(DIFICIL_JUSTIFICACION.tope)} del tope: son el `
      + `${DIFICIL_JUSTIFICACION.porcentaje} % de tu rendimiento neto previo`
      + (r.conocido ? `, o sea ${formatoEuros(r.dificilJustificacion.eur)} en tu caso` : '')
      + '. El informe lo da por confirmado para 2025 en fuente AEAT y para 2026 solo en fuentes '
      + 'secundarias, así que no se da por bueno solo.',
    queHacer: 'Mándale a tu asesoría la pregunta de este paso, tal cual. Contesta dos cosas de '
      + 'golpe: el porcentaje de 2026 y si también entra en los modelos 130, que es lo que hoy '
      + 'hace que esta pantalla y la de "cuánto apartar" digan cifras distintas.',
    cuando: 'cuanto antes: también afecta a los 130 que aún no has presentado',
    fechaLimite: null,
    hecho: null,
    pregunta: PREGUNTAS_RENTA.dificilJustificacion2026,
    fuente: `docs/situacion-real-cliente-aleman.md §8 punto 24 · ${DIFICIL_JUSTIFICACION.articulo}`,
  });

  // 4. El dato que la app no tiene y que mueve la cuota entera.
  add({
    id: 'comunidad-autonoma',
    titulo: 'Decirle a tu asesoría en qué comunidad autónoma estás empadronado a 31 de diciembre',
    porQue: 'La mitad de la escala del IRPF es autonómica y el mínimo personal también tiene parte '
      + `autonómica (Madrid ${formatoEuros(5956.65)} · Andalucía ${formatoEuros(5790)} · `
      + `C. Valenciana ${formatoEuros(6105)} · Cataluña ${formatoEuros(5550)}). Sin ese dato no hay `
      + 'un solo tipo efectivo real, y esta simulación usa una escala agregada que solo aproxima.',
    queHacer: 'Mándale la pregunta de este paso y, cuando te den el mínimo exacto de tu comunidad, '
      + 'métetelo aquí: el campo es editable y la simulación se recalcula sola.',
    cuando: 'antes de abril',
    fechaLimite: `${a + 1}-04-01`,
    hecho: r.conocido ? !c.minimoPersonalPorDefecto : null,
    pregunta: PREGUNTAS_RENTA.minimoPersonalCcaa,
    fuente: 'docs/investigacion-fiscal-2026.md · art. 63.1.2º LIRPF · informe §8 punto 6',
  });

  // 5. Los papeles de los ingresos.
  add({
    id: 'facturas-gmbh',
    titulo: `Reunir todas las facturas emitidas a la GmbH en ${a}`,
    porQue: 'Son la prueba de tus ingresos y lo que Hacienda cruza vía VIES con lo que la GmbH '
      + 'declare en Alemania. Además tienen que llevar la mención literal «inversión del sujeto '
      + 'pasivo» y los NIF-IVA de las dos partes; si no la llevan, hay que rectificarlas ANTES de '
      + 'la Renta, no después.',
    queHacer: 'Júntalas todas en una carpeta por trimestre y suma las bases. Esa suma tiene que '
      + `cuadrar con los ${r.conocido ? formatoEuros(r.ingresos) : 'ingresos'} de esta simulación: `
      + 'si no cuadra, manda la factura y hay que apuntarlas en la app.',
    cuando: 'enero, con el cierre del año',
    fechaLimite: `${a + 1}-01-31`,
    hecho: r.conocido ? r.fuenteIngresos === 'facturas' : null,
    pregunta: PREGUNTAS.regularizacion,
    fuente: 'docs/situacion-real-cliente-aleman.md §2.2 y §2.5 · art. 6.1.m) RD 1619/2012',
  });

  // 6. Los papeles de los gastos que sí tienes.
  add({
    id: 'certificado-reta',
    titulo: 'Descargar de Import@ss el certificado de bases y cuotas ingresadas del año',
    porQue: `Es el justificante de los ${r.conocido ? formatoEuros(r.cuotaAutonomoAnual) : 'euros'} `
      + 'de cuota de autónomo que te estás deduciendo. Es un gasto deducible de la actividad '
      + '(art. 30.2 LIRPF) y es de los que más se olvidan cuando la cuota es de tarifa plana y '
      + 'parece poca cosa.',
    queHacer: 'Entra en https://portal.seg-social.gob.es/wps/portal/importass/importass con Cl@ve '
      + 'o certificado, pide el informe de bases y cuotas ingresadas del ejercicio, y guárdalo con '
      + 'las facturas. Tarda dos minutos.',
    cuando: 'enero, en cuanto cierre el año',
    fechaLimite: `${a + 1}-01-31`,
    hecho: null,
    pregunta: null,
    fuente: 'docs/situacion-real-cliente-aleman.md §3.1 · art. 30.2 LIRPF',
  });

  // 7. Los gastos que la app no conoce y que se pierden por no preguntarlos.
  add({
    id: 'otros-gastos',
    titulo: 'Reunir los gastos deducibles que la app no conoce',
    porQue: 'Aquí solo están la cuota de autónomo y la asesoría, que son los que la app sabe con '
      + 'certeza. Hay más que pueden caberte y que se pierden por no preguntarlos: seguro de '
      + 'salud, suministros de casa con afectación parcial declarada en el modelo 036, formación, '
      + 'herramientas. Cada euro deducible te ahorra tu tipo marginal.',
    queHacer: 'Manda la pregunta de este paso, y lo que te confirmen métetelo en el campo "otros '
      + 'gastos deducibles" de esta pantalla. Ojo con los suministros: NO es el 30 % de la factura, '
      + 'es el 30 % de la parte proporcional afecta, y exige tener los metros declarados en el 036.',
    cuando: 'antes de abril',
    fechaLimite: `${a + 1}-04-01`,
    hecho: r.conocido ? r.otrosGastos > 0 : null,
    pregunta: PREGUNTAS_RENTA.reduccionesYDeducciones,
    fuente: 'docs/investigacion-fiscal-2026.md · arts. 30.2 y 30.2.5ª.b LIRPF',
  });

  // 8. El cuadre que Hacienda hace sola, y que si falla llega antes que la Renta.
  add({
    id: 'cuadre-iva',
    titulo: `Comprobar que los 303, los 349 y el 390 de ${a} cuadran entre sí`,
    porQue: 'Hacienda cruza esto automáticamente: suma de las casillas 59 de tus cuatro 303 = suma '
      + 'de tus cuatro 349 = casilla 103 del 390, y todo ello contra lo que la GmbH declare en '
      + 'Alemania en su Zusammenfassende Meldung. Si no cuadra salta un requerimiento, y un '
      + 'requerimiento llega antes que la campaña de la Renta y se lleva por delante todas las '
      + 'reducciones por regularización voluntaria.',
    queHacer: 'En enero, cuando presentes el 4T y el 390, suma las tres cosas y comprueba que dan '
      + 'lo mismo. Si no dan, rectifica antes de que te pregunten: presentarlo tú vale la mitad '
      + '(art. 198.2 LGT).',
    cuando: 'enero, con el 4T y el modelo 390',
    fechaLimite: `${a + 1}-01-30`,
    hecho: null,
    pregunta: PREGUNTAS.regularizacion,
    fuente: 'docs/situacion-real-cliente-aleman.md §3.1 y §3.3',
  });

  // 9. Contrastar antes de firmar nada.
  add({
    id: 'datos-fiscales',
    titulo: `Descargar los datos fiscales de la AEAT en abril y contrastarlos con esta simulación`,
    porQue: 'Los datos fiscales son lo que Hacienda cree que has ganado. Si no coinciden con tus '
      + 'facturas, quieres enterarte en abril y con tiempo, no el 29 de junio. Y el borrador de un '
      + 'autónomo NUNCA viene bien: no lleva tus gastos, porque Hacienda no los conoce.',
    queHacer: `En cuanto se abra la campaña (${r.campanaDesde || `1 de abril de ${a + 1}`}), descarga `
      + 'los datos fiscales desde la Sede y compáralos con esta pantalla línea a línea. Lo que no '
      + 'cuadre, a tu asesoría antes de firmar nada.',
    cuando: 'abril',
    fechaLimite: r.campanaDesde || `${a + 1}-04-01`,
    hecho: null,
    pregunta: null,
    fuente: 'docs/situacion-real-cliente-aleman.md §3.1 y §3.2',
  });

  // 10. Presentarla.
  add({
    id: 'presentar-renta',
    titulo: `Presentar la declaración de la Renta de ${a}`,
    porQue: r.conocido && r.aDevolver > 0
      ? `Te sale a devolver ${formatoEuros(r.aDevolver)}: si no la presentas, ese dinero se queda `
        + 'en Hacienda. Es tuyo, pero hay que ir a por él.'
      : 'Estás obligado a presentarla, salga como salga. No presentarla es lo único de esta lista '
        + 'que sí tiene coste seguro.',
    queHacer: r.conocido && r.aPagar > 0
      ? `Ten apartados los ${formatoEuros(r.aPagar)} antes de presentarla, y valora fraccionar el `
        + 'pago en dos plazos (60 % ahora, 40 % en noviembre) si te viene mejor: pregúntaselo a tu '
        + 'asesoría al mandarle el resto de preguntas.'
      : 'Preséntala en la Sede de la AEAT o dile a tu asesoría que la presente. Revisa antes que '
        + 'los cuatro modelos 130 aparecen restados: son tu devolución.',
    cuando: r.campanaDesde && r.campanaHasta
      ? `entre el ${r.campanaDesde} y el ${r.campanaHasta}`
      : `entre abril y junio de ${a + 1}`,
    fechaLimite: r.campanaHasta || `${a + 1}-06-30`,
    hecho: c.presentados.some((p) => p.modelo === '100' && (p.anio === null || p.anio === a)),
    pregunta: r.campanaConfirmada ? null : PREGUNTAS.calendario2027,
    fuente: 'docs/situacion-real-cliente-aleman.md §3.1 y §3.2 · Ley 35/2006 (IRPF)',
  });

  return pasos;
}
