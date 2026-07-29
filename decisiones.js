// "¿Qué hago ahora?": el motor que convierte todos los números del dashboard en una
// respuesta. Sin DOM y sin fechas del sistema: testeable con `node --test`.
//
// La pantalla que se alimenta de aquí tiene que responder tres preguntas SIEMPRE, sin
// que el usuario piense:
//   1. ¿Dónde estoy ahora mismo?          -> semaforo() y alertas()
//   2. ¿Qué es lo siguiente y cuándo?     -> hitos() y siguienteHito()
//   3. ¿Qué hago hoy?                     -> queHacerHoy()
//
// DOS REGLAS QUE NO SE TOCAN:
//
//  · La distancia a un umbral se dice SIEMPRE en ventas al mes además de en euros. Las
//    ventas son lo único que el usuario controla; los euros son la consecuencia.
//
//  · Ninguna cifra fiscal se inventa aquí. Todas salen de `docs/investigacion-fiscal-2026.md`
//    o de `docs/bali-indonesia-2026.md`, con la sección apuntada al lado. Si un umbral no se
//    puede calcular por falta de un dato, el hito NO desaparece: sale diciendo qué dato
//    falta y dónde mirarlo. Y donde hay que preguntar algo, va LA PREGUNTA EXACTA, no un
//    "consúltalo con un profesional".

import {
  SPLIT,
  diasDesdeUltimaVenta,
  disponibleRealParaMi,
  gastoFijoMensual,
  mejorDiaVentas,
  mejorPeorMes,
  miRetiroDelMes,
  proyeccionLineal,
  formatoEuros,
} from './calculos.js';

import {
  MODELO_DEFAULT,
  normalizarModelo,
  resultadoMensual,
  porVenta,
  puntoMuerto,
  ventasParaBeneficioAnual,
  situacionFiscalDelAnio,
  rentaFiscalDelAnio,
  modeloDesdeDatos,
} from './objetivo.js';

import { estadoPatrimonio, normalizarObjetivo } from './patrimonio.js';

// LA cifra de "cuánto tiene que estar apartado hoy para Hacienda". Viene de fiscal.js, que es
// el único módulo que sabe de PLAZOS: la reserva de impuestos no es una provisión que se pueda
// ir haciendo despacio, es caja que Hacienda pide un día concreto. Antes esta pantalla -la que
// abre la app- calculaba su propia versión (solo la parte devengada del IRPF real) y daba la
// cifra MÁS BAJA de las tres pantallas que responden a la misma pregunta.
import { reservaImpuestosHoy, reservaImpuestosEtiquetada } from './fiscal.js';

// La escala de IRPF sale de aquí, no de la agregada aproximada de objetivo.js: estas dos
// están en el informe con etiqueta OFICIAL y URL (sección 2.1).
import {
  DEDUCCION_GENERICA_RETA,
  DATOS_AUTONOMICOS,
  ESCALA_ESTATAL,
  ESCALAS_AUTONOMICAS,
  cuotaRetaAnual,
  detalleIrpfEspana,
  escalaIrpfAgregada,
  tramoRetaDe,
  normalizarOpciones as normalizarResidencia,
} from './residencia.js';

// ---------------------------------------------------------------------------
// Los umbrales, con su fuente
// ---------------------------------------------------------------------------

export const UMBRALES = {
  // Tarifa plana: 12 meses, prorrogables otros 12 SOLO si los rendimientos netos anuales
  // quedan por debajo del SMI. SMI 2026 = 1.221 EUR/mes en 14 pagas = 17.094 EUR/año.
  // FUENTE: docs/investigacion-fiscal-2026.md, secciones 2.2 y 7.5
  //         (art. 38 ter Ley 20/2007 · RD 126/2026).
  smiAnual: 17094,
  tarifaPlanaMeses: 12,
  tarifaPlanaProrrogaMeses: 12,

  // Frontera tabla reducida -> tabla general del RETA: 1.166,70 EUR/mes de rendimiento
  // computable = 14.000,40 EUR/año. El computable NO es el beneficio: es el beneficio menos
  // la deducción genérica del 7 % del art. 308.1.c) LGSS.
  // FUENTE: docs/investigacion-fiscal-2026.md, secciones 2.2 y 7.5 (Orden PJC/297/2026).
  retaComputableAnual: 14000.40,

  // A partir de 72.000 EUR/año computables la cuota mínima se congela en 607,35 EUR/mes.
  // FUENTE: docs/investigacion-fiscal-2026.md, secciones 2.2 y 7.5.
  retaTopeComputableAnual: 72000,

  // SL contra autónomo, sacando todo el dinero cada año: equilibrio matemático en ~60.000 EUR
  // de beneficio; con el sobrecoste de gestoría, no compensa de verdad hasta 90.000-100.000.
  // FUENTE: docs/investigacion-fiscal-2026.md, sección 7.2.
  slEquilibrio: 60000,
  slConGestoria: 90000,

  // Dubái sobre España: el cruce está en 33.000-34.000 EUR de beneficio contando solo
  // impuestos y estructura. El umbral honesto, con coste de vida y riesgo jurídico, en 150.000.
  // FUENTE: docs/investigacion-fiscal-2026.md, sección 7.1.
  dubaiCruce: 33000,
  dubaiHonesto: 150000,

  // Paraguay ya sale mejor que España desde 15.000 EUR de beneficio (13.000 contra 10.806).
  // FUENTE: docs/investigacion-fiscal-2026.md, sección 7.3.
  paraguayDesde: 15000,

  // Bali: el visado E33G exige acreditar 60.000 USD/año ≈ 52.650 EUR con extractos. Ese es el
  // umbral que manda, y es migratorio, no fiscal. El fiscal frente a España está en
  // 120.000-150.000, porque Indonesia grava la renta mundial al 21-28 % efectivo.
  // FUENTE: docs/bali-indonesia-2026.md, sección 7 (umbrales 1 y 2).
  baliLegal: 52650,
  baliFiscal: 120000,
};

// Días sin una sola venta a partir de los cuales se avisa. No son cifras fiscales: son
// una decisión de diseño para que la alerta no salte cada fin de semana.
const DIAS_SIN_VENTAS_AMBAR = 14;
const DIAS_SIN_VENTAS_ROJO = 30;

// Antes del día 7 un mes no dice nada: dos días flojos proyectados a 30 hunden cualquier
// media y sólo generan ansiedad. Hasta ahí, la alerta del mes va en verde a propósito.
const DIA_MINIMO_PARA_JUZGAR_EL_MES = 7;

// Por debajo de esto, "puedes retirar" es ruido.
const RETIRO_MINIMO_RELEVANTE = 100;

const URGENCIAS = ['ya', 'este-trimestre', 'este-ano', 'vigilar'];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function num(v, porDefecto = 0) {
  if (v === null || v === undefined || v === '') return porDefecto;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

function esFecha(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
}

function esMes(v) {
  return /^\d{4}-\d{2}$/.test(String(v ?? ''));
}

// Días del mes de una fecha ISO. Date.UTC no depende de la zona horaria del sistema, así
// que el módulo sigue siendo puro: mismo hoyISO, mismo resultado, en cualquier máquina.
function diasDelMes(hoy) {
  return new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)), 0)).getUTCDate();
}

// Meses enteros entre dos 'YYYY-MM'. Aritmética de enteros a propósito.
function mesesEntre(desde, hasta) {
  const a = Number(desde.slice(0, 4)) * 12 + Number(desde.slice(5, 7));
  const b = Number(hasta.slice(0, 4)) * 12 + Number(hasta.slice(5, 7));
  return b - a;
}

// 8.5 -> "8,5" · 3 -> "3". Igual que en objetivo.js, para que los números suenen iguales
// en toda la app. Con una salvedad: un resto diminuto NO se redondea a "0", porque leer
// "a 0 ventas" cuando todavía falta algo es justo el tipo de mentira que da ansiedad.
function ventasTexto(n) {
  if (!Number.isFinite(n)) return '—';
  if (n > 0 && n < 0.05) return 'menos de 0,1';
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function pctTexto(n) {
  return `${Number(n).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} %`;
}

function pesoUrgencia(u) {
  const i = URGENCIAS.indexOf(u);
  return i < 0 ? URGENCIAS.length : i;
}

// La urgencia por cercanía. Un umbral a media venta al mes de distancia es de este
// trimestre; a cuatro ventas, de este año; más lejos, de vigilar y ya está.
function urgenciaPorVentas(ventasQueFaltan) {
  if (ventasQueFaltan === null || !Number.isFinite(ventasQueFaltan)) return 'vigilar';
  if (ventasQueFaltan <= 1) return 'este-trimestre';
  if (ventasQueFaltan <= 4) return 'este-ano';
  return 'vigilar';
}

// ---------------------------------------------------------------------------
// El contexto, normalizado una sola vez
// ---------------------------------------------------------------------------

// Todo lo que necesitan las cinco funciones públicas, calculado una vez y sin sorpresas:
// nunca NaN, nunca undefined, y con `hoy` vacío si la fecha no sirve (los hitos que
// dependan de ella lo dirán en vez de mentir).
function contexto(ctx) {
  const c = ctx || {};
  const datos = c.datos || {};
  const modelo = normalizarModelo(c.modelo || MODELO_DEFAULT);
  const hoy = esFecha(c.hoyISO) ? String(c.hoyISO) : '';
  const mes = hoy ? hoy.slice(0, 7) : '';

  const ventas = Array.isArray(datos.ventas) ? datos.ventas : [];
  const retiros = Array.isArray(datos.retiros) ? datos.retiros : [];
  const caja = datos.caja || {};
  const config = datos.config || {};

  const split = config.split && Number.isFinite(Number(config.split.yo))
    ? { yo: Number(config.split.yo), david: Number(config.split.david ?? 1 - Number(config.split.yo)) }
    : SPLIT;

  // La media de ventas es el "dónde estoy" de todo el módulo. Sale de los datos reales por
  // el mismo camino que la vista "Cuánto facturar", para que las dos pantallas no digan
  // números distintos. Se puede forzar con ctx.ventasMedia (los tests lo usan).
  const ventasMedia = c.ventasMedia === null || c.ventasMedia === undefined || c.ventasMedia === ''
    ? Math.max(0, num(modeloDesdeDatos(datos, modelo, mes ? { mesActual: mes } : undefined).ventasMedia, 0))
    : Math.max(0, num(c.ventasMedia, 0));

  const mesActualModelo = resultadoMensual(modelo, ventasMedia);
  const miParteMes = mesActualModelo.miParte;
  const miParteVenta = porVenta(modelo).miParte;

  // LA renta anual de toda la app, la que se compara contra cada umbral. Llega por ctx
  // porque app.js la calcula UNA sola vez y se la pasa igual a esta pantalla y a "Dónde
  // vivir": antes cada una la sacaba por su cuenta y las dos comparaban países contra
  // cifras distintas, así que a un toque de distancia la app decía "te faltan 0,3 ventas
  // para que Paraguay te compense" y "Paraguay ya es el que más te deja".
  //
  // Lo que app.js manda hoy es lo que él FACTURA proyectado a doce meses, no su 40 % del
  // beneficio del negocio: es un autónomo que factura a la empresa de su socio y solo
  // tributa por lo que factura. Si no llega nada, se cae a la media de ventas, que es lo
  // único reconstruible desde aquí; y por eso los tests pueden forzarla.
  const beneficioPorVentas = miParteMes * 12;
  const beneficioAnual = Number.isFinite(Number(c.beneficioAnual))
    ? Number(c.beneficioAnual)
    : beneficioPorVentas;

  // Y la distancia en ventas se mide desde ESE beneficio. Si la cifra que llega por ctx no
  // coincide con la que implica la media de ventas, los euros y las ventas dirían dos
  // cosas distintas del mismo umbral.
  const ventasMediaBeneficio = Math.abs(beneficioAnual - beneficioPorVentas) < 0.005
    ? ventasMedia
    : (ventasParaBeneficioAnual(modelo, beneficioAnual) ?? ventasMedia);

  // La foto por DEVENGO: su 40 % del beneficio del negocio. Es informativa -mide el tamaño
  // del negocio y de aquí sale `mesesTranscurridos`- y NO se usa para calcular impuestos.
  const situacionFiscal = c.situacionFiscal && Number.isFinite(Number(c.situacionFiscal.irpfRealProyectado))
    ? c.situacionFiscal
    : situacionFiscalDelAnio(datos, modelo, hoy);

  // La foto FISCAL de verdad: lo que factura. `rentaFiscal.irpfReal` es el IRPF que se le
  // va a reclamar, y es el que manda en la reserva de impuestos.
  const rentaDada = Boolean(c.rentaFiscal) && Number.isFinite(Number(c.rentaFiscal.irpfReal));
  const rentaFiscal = rentaDada ? c.rentaFiscal : rentaFiscalDelAnio(datos, modelo, hoy);

  // EL IRPF del año, con un orden de preferencia que no es cosmético:
  //   1) `rentaFiscal.irpfReal` si lo mandan por ctx: lo facturado pasado por la escala, que
  //      es lo que app.js calcula hoy;
  //   2) `situacionFiscal.irpfRealProyectado` si lo mandan por ctx: una foto fiscal impuesta
  //      desde fuera. Respetarla es lo que evita que este módulo ignore lo que le acaban de
  //      decir (los tests fijan el escenario justo así);
  //   3) y si no llega ninguna, lo que salga de los datos por la vía buena: los retiros.
  // Lo que NUNCA vuelve a pasar solo es que el IRPF del DEVENGADO se calcule aquí dentro y
  // se cuele como si fuera la deuda: con las cifras de julio de 2026 eso pedía apartar
  // 2.433,36 € cuando la factura real son 366,63.
  const situacionDada = Boolean(c.situacionFiscal)
    && Number.isFinite(Number(c.situacionFiscal.irpfRealProyectado));
  const irpfDelAnio = rentaDada
    ? Math.max(0, num(c.rentaFiscal.irpfReal, 0))
    : (situacionDada
      ? Math.max(0, num(c.situacionFiscal.irpfRealProyectado, 0))
      : Math.max(0, num(rentaFiscal.irpfReal, 0)));

  const patrimonio = c.patrimonio || {};
  const cuentas = Array.isArray(patrimonio.cuentas) ? patrimonio.cuentas : [];
  const objetivos = (Array.isArray(patrimonio.objetivos) ? patrimonio.objetivos : []).map(normalizarObjetivo);

  const residencia = normalizarResidencia(c.residencia);

  // Los gastos fijos personales: lo que te cuesta estar vivo cada mes. Si el usuario los
  // tiene apuntados, mandan los suyos; si no, se reconstruyen del modelo (cuota + asesoría
  // + gastos personales), que es exactamente la misma lista con otro nombre.
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

  // Tarifa plana: el mes de alta en el RETA no está en ningún sitio de la app todavía.
  // Se acepta por ctx o por config, y si no llega, se dice.
  const tp = c.tarifaPlana || config.tarifaPlana || {};
  const inicioTarifa = esMes(tp.inicio) ? String(tp.inicio)
    : (esFecha(tp.inicio) ? String(tp.inicio).slice(0, 7) : '');
  const tarifaPlana = {
    inicio: inicioTarifa,
    prorrogada: Boolean(tp.prorrogada),
    mesesUsados: inicioTarifa && mes ? mesesEntre(inicioTarifa, mes) : null,
    mesesTotales: tp.prorrogada
      ? UMBRALES.tarifaPlanaMeses + UMBRALES.tarifaPlanaProrrogaMeses
      : UMBRALES.tarifaPlanaMeses,
  };
  tarifaPlana.mesesQueQuedan = tarifaPlana.mesesUsados === null
    ? null
    : tarifaPlana.mesesTotales - tarifaPlana.mesesUsados;

  const c2 = {
    datos, modelo, hoy, mes, ventas, retiros, caja, config, split,
    ventasMedia, ventasMediaBeneficio, mesActualModelo, miParteMes, beneficioAnual, miParteVenta,
    situacionFiscal, rentaFiscal, irpfDelAnio, cuentas, objetivos, residencia, gastosVida, tarifaPlana,
  };
  c2.fraccionDelAnio = fraccionDelAnioDevengada(c2);
  // LA reserva de impuestos del día, calculada por fiscal.js con los mismos datos, el mismo
  // patrimonio y el mismo "hoy" que usan "Hacienda" y "Mi patrimonio". Se puede forzar por
  // ctx (los tests lo usan) y si el cálculo no sale, se cae a null y estadoReservaImpuestos
  // vuelve al prorrateo, que es lo único reconstruible desde aquí.
  c2.reservaHacienda = c.reservaHacienda || reservaHaciendaDe(c2, c);
  return c2;
}

// Envoltorio con red: fiscal.js necesita `datos`, `presentados` y `hoy`. Si algo falta o
// revienta, se devuelve null en vez de tumbar la pantalla que abre la app.
function reservaHaciendaDe(c2, ctxOriginal) {
  if (!c2.hoy) return null;
  try {
    const r = reservaImpuestosHoy({
      datos: c2.datos,
      presentados: ctxOriginal.presentados,
      renta: ctxOriginal.renta,
      hoyISO: c2.hoy,
    }, c2.hoy, c2.objetivos);
    return Number.isFinite(Number(r && r.debeHaber)) ? r : null;
  } catch (e) {
    return null;
  }
}

// Qué parte del año fiscal llevas devengada, con el mes en curso contado POR DÍAS.
//
// Con meses enteros (`meses / 12`) el día 1 de cada mes el devengado pegaba un escalón
// hacia arriba sin que cambiara ni un dato: el 1 de junio, +32 %. Tres días 1 distintos del
// año volteaban el semáforo entero de ámbar a rojo y el usuario abría la app para leer
// "hay algo que arreglar hoy" sin haber hecho nada. Es exactamente el mismo problema que
// objetivo.js ya resolvió en la proyección (situacionFiscalDelAnio), con la misma fórmula.
//
// Sin `hoy` no hay fracción que contar y se vuelve al mes entero, que es lo único honesto.
function fraccionDelAnioDevengada(c) {
  const meses = Math.min(12, Math.max(0, num(c.situacionFiscal.mesesTranscurridos, 0)));
  if (!(meses > 0)) return 0;
  if (!c.hoy) return meses / 12;
  const diaDelMes = Number(c.hoy.slice(8, 10));
  const dias = new Date(Date.UTC(Number(c.hoy.slice(0, 4)), meses, 0)).getUTCDate();
  if (!(dias > 0) || !Number.isFinite(diaDelMes)) return meses / 12;
  const transcurrido = (meses - 1) + diaDelMes / dias;
  return Math.min(1, Math.max(0, transcurrido / 12));
}

// La reserva que el usuario tiene puesta PARA HACIENDA, no cualquier reserva: si el dinero
// de "colchón del mes que viene" contara como reserva de impuestos, la pantalla diría que
// está cubierto cuando no lo está. La regla vive en fiscal.js para que las tres pantallas
// seleccionen exactamente las mismas reservas.
function reservaImpuestosDe(objetivos) {
  return reservaImpuestosEtiquetada(objetivos);
}

// ---------------------------------------------------------------------------
// La distancia, en ventas
// ---------------------------------------------------------------------------

// Ventas AL MES que faltan para que tu beneficio anual llegue a `beneficioObjetivo`.
// Se apoya en ventasParaBeneficioAnual de objetivo.js en vez de reescribir la fórmula: si
// algún día cambia la cadena de cálculo, esto sigue cuadrando solo.
// Nunca negativo: si ya estás por encima, la distancia es 0, no "menos dos ventas".
// null cuando vender más no mueve el beneficio (ticket 0, comisión del 100 %, mi parte al 0 %).
export function distanciaEnVentas(ctx, beneficioObjetivo) {
  const c = contexto(ctx);
  return ventasFaltan(c, beneficioObjetivo);
}

function ventasFaltan(c, beneficioObjetivo) {
  const v = ventasParaBeneficioAnual(c.modelo, beneficioObjetivo);
  if (v === null) return null;
  return Math.max(0, v - c.ventasMediaBeneficio);
}

// Ventas al mes de colchón por encima de un umbral ya cruzado.
function ventasHolgura(c, beneficioObjetivo) {
  const v = ventasParaBeneficioAnual(c.modelo, beneficioObjetivo);
  if (v === null) return null;
  return Math.max(0, c.ventasMediaBeneficio - v);
}

// ---------------------------------------------------------------------------
// Los hitos
// ---------------------------------------------------------------------------

// Constructor con los valores por defecto, para que ningún hito salga con campos a medias.
function hito(x) {
  return {
    id: x.id,
    titulo: x.titulo,
    tipo: x.tipo,
    // La DIRECCIÓN del hito: 'meta' es un umbral que quieres cruzar; 'aviso' es uno que
    // cruzar te cuesta dinero. Sin este campo la vista pintaba los dos con la misma barra
    // verde de progreso, y "95 %" sobre la tarifa plana significaba, literalmente, "95 %
    // del camino hacia pagar 2.634,70 € más al año".
    sentido: x.sentido === 'aviso' ? 'aviso' : 'meta',
    // Un TECHO solo se respeta quedándose POR DEBAJO. Su distancia es holgura, no camino:
    // por eso nunca encabeza la lista de "lo siguiente" aunque su distancia sea 0.
    esTecho: Boolean(x.esTecho),
    umbral: x.umbral === undefined ? null : x.umbral,
    unidad: x.unidad || null,
    alcanzado: Boolean(x.alcanzado),
    distancia: x.distancia === undefined ? null : x.distancia,
    ventasQueFaltan: x.ventasQueFaltan === undefined ? null : x.ventasQueFaltan,
    // 'ventas/mes' para los umbrales de ritmo · 'ventas' para los huecos de dinero, que se
    // tapan con N ventas y no con N ventas AL MES. Decirlo evita el error más caro de leer.
    ventasQueFaltanUnidad: x.ventasQueFaltanUnidad || 'ventas/mes',
    // true cuando el hueco se tapa con dinero que YA tienes (caja + lo que no has
    // etiquetado). Ahí la cifra grande no puede ser un número de ventas: no hace falta
    // vender nada, hace falta poner una etiqueta.
    cubrible: x.cubrible === undefined ? null : Boolean(x.cubrible),
    holgura: x.holgura === undefined ? null : x.holgura,
    quePasa: x.quePasa,
    // DIAGNÓSTICO (dónde estás) y ORDEN (qué haces) van en campos distintos. queHacerHoy()
    // solo lee `queHacer`: una frase de estado ocupando el hueco de la acción del día es
    // una acción perdida, y encima con etiqueta HOY.
    situacion: x.situacion || null,
    queHacer: x.queHacer || null,
    urgencia: x.urgencia || 'vigilar',
    faltaDato: x.faltaDato || null,
  };
}

// Un umbral de los que se miden en beneficio anual (fiscales y de mudanza): siempre sale la
// misma estructura, con la distancia en euros al año Y en ventas al mes.
function hitoPorBeneficio(c, x) {
  const alcanzado = c.beneficioAnual >= x.umbral;
  const faltan = alcanzado ? 0 : ventasFaltan(c, x.umbral);
  const holgura = alcanzado ? ventasHolgura(c, x.umbral) : null;
  return hito({
    ...x,
    unidad: 'eur-ano',
    alcanzado,
    distancia: alcanzado ? 0 : x.umbral - c.beneficioAnual,
    ventasQueFaltan: faltan,
    holgura,
    urgencia: x.urgencia || (alcanzado ? 'vigilar' : urgenciaPorVentas(faltan)),
    faltaDato: faltan === null
      ? 'Con estos ajustes una venta más no mueve el beneficio, así que no hay distancia que medir. Revisa el ticket, la comisión y tu porcentaje en Ajustes del modelo.'
      : x.faltaDato,
  });
}

function hitoPuntoMuerto(c) {
  const umbral = puntoMuerto(c.modelo);
  if (umbral === null) {
    return hito({
      id: 'punto-muerto',
      titulo: 'El negocio deja de perder dinero',
      tipo: 'estructura',
      umbral: null,
      unidad: 'ventas-mes',
      alcanzado: false,
      quePasa: 'No puedo decirte cuántas ventas hacen falta para cubrir los gastos fijos: con los ajustes de ahora una venta no deja nada al negocio.',
      queHacer: 'Abre Ajustes del modelo y revisa tres campos: el ticket, la comisión de la pasarela y tu porcentaje del beneficio. Alguno está a cero.',
      urgencia: 'ya',
      faltaDato: 'Una venta deja 0 € al negocio: sin margen por venta no existe punto muerto.',
    });
  }
  const alcanzado = c.ventasMedia >= umbral;
  const faltan = Math.max(0, umbral - c.ventasMedia);
  return hito({
    id: 'punto-muerto',
    titulo: 'El negocio deja de perder dinero',
    tipo: 'estructura',
    umbral,
    unidad: 'ventas-mes',
    alcanzado,
    distancia: alcanzado ? 0 : faltan,
    ventasQueFaltan: alcanzado ? 0 : faltan,
    holgura: alcanzado ? c.ventasMedia - umbral : null,
    quePasa: `Con menos de ${ventasTexto(umbral)} ventas al mes, los ${formatoEuros(c.modelo.fijosNegocio)} de gastos fijos del negocio se comen todo lo que entra y el mes cierra en rojo. A partir de ahí, cada venta ya suma.`,
    situacion: alcanzado
      ? `Vas por ${ventasTexto(c.ventasMedia)} ventas al mes y el suelo está en ${ventasTexto(umbral)}: mientras no bajes de ahí, esto no vuelve.`
      : null,
    queHacer: alcanzado
      ? null
      : `Cierra ${ventasTexto(faltan)} ventas más este mes. Es el mínimo para que el mes no salga en negativo.`,
    urgencia: alcanzado ? 'vigilar' : 'ya',
  });
}

function hitoGastosVida(c) {
  const umbralMes = c.gastosVida.total;
  const umbralAnual = umbralMes * 12;
  if (!(umbralMes > 0)) {
    return hito({
      id: 'gastos-vida',
      titulo: 'El negocio te paga la vida',
      tipo: 'personal',
      umbral: null,
      unidad: 'eur-mes',
      alcanzado: false,
      quePasa: 'No sé cuánto te cuesta vivir cada mes, así que no puedo decirte cuándo el negocio lo cubre solo.',
      queHacer: 'Apunta tus gastos fijos en la pestaña de Gastos: cuota de autónomo, asesoría, gimnasio, alquiler, comida. Con eso ya sale el número.',
      urgencia: 'ya',
      faltaDato: 'Faltan tus gastos fijos personales (€/mes).',
    });
  }
  const miMes = c.beneficioAnual / 12;
  const alcanzado = miMes >= umbralMes;
  const faltan = alcanzado ? 0 : ventasFaltan(c, umbralAnual);
  const huecoMes = Math.max(0, umbralMes - miMes);
  return hito({
    id: 'gastos-vida',
    titulo: 'El negocio te paga la vida',
    tipo: 'personal',
    umbral: umbralMes,
    unidad: 'eur-mes',
    alcanzado,
    distancia: alcanzado ? 0 : huecoMes,
    ventasQueFaltan: faltan,
    holgura: alcanzado ? ventasHolgura(c, umbralAnual) : null,
    // La frase de los ahorros vive AQUÍ, en el diagnóstico, no en la acción del día: es
    // una consecuencia, no algo que se pueda hacer, y leerla con la etiqueta HOY encima
    // era culpa sin salida en la pantalla que existe justo para quitar ansiedad.
    quePasa: `Tu vida cuesta ${formatoEuros(umbralMes)} al mes. A partir de ahí, eso sale del negocio y no de tus ahorros; hasta entonces, la diferencia se la quitas a tus ahorros cada mes. Ojo: es antes de Hacienda; el IRPF va aparte y por eso existe el hito de la reserva.`,
    situacion: alcanzado
      ? `Ya está cubierto: tu parte del beneficio es de ${formatoEuros(miMes)} al mes. Lo siguiente es que además te sobre, no que llegues.`
      : `Te faltan ${formatoEuros(huecoMes)} al mes.`,
    queHacer: alcanzado
      ? null
      : (Number.isFinite(faltan)
        ? `Cierra ${ventasTexto(faltan)} ventas más al mes, o baja ${formatoEuros(huecoMes)} de gasto fijo. Una de las dos, no las dos.`
        : `Baja ${formatoEuros(huecoMes)} de gasto fijo al mes: con los ajustes de ahora, vender más no mueve tu parte.`),
    urgencia: alcanzado ? 'vigilar' : 'ya',
    faltaDato: c.gastosVida.fuente === 'modelo'
      ? 'Tus gastos fijos no están apuntados: he usado los del modelo (cuota + asesoría + gastos personales). Si pagas alquiler o comida, el número real es más alto.'
      : null,
  });
}

// La escala de IRPF DE VERDAD: la estatal (art. 63.1.1º Ley 35/2006) sumada tramo a tramo
// con la autonómica de su comunidad. Las dos salen de residencia.js, que las trae del
// informe con etiqueta OFICIAL y URL (docs/investigacion-fiscal-2026.md, sección 2.1).
//
// Antes esto usaba TRAMOS_IRPF de objetivo.js (19/24/30/37/45/47), una escala agregada
// aproximada que su propio comentario admite que "sirve para decidir, no para liquidar" y
// que no aparece en ninguno de los dos informes. Comparte cortes con la estatal, así que
// parecía plausible; pero los cortes autonómicos de Madrid (13.362,22 · 19.004,63 ·
// 35.425,68 · 57.320,40) meten escalones intermedios que no veía. Con 15.000 € de
// beneficio se saltaba DOS escalones y ponía el siguiente salto a 7.060 € cuando estaba a
// 222 €: un error de 32 veces, y encima decía "aparta el 30 %" con un marginal del 20,5 %.
//
// Los bordes son la unión ordenada de las dos escalas; el tipo de cada tramo, la suma de
// los dos marginales en ese tramo. Escala autonómica vacía (Cataluña, Andalucía, Valencia
// van así A PROPÓSITO, el informe no las publica) -> queda solo la estatal, y se avisa.
// Vive en residencia.js, que es donde están las dos escalas y sus fuentes. Aquí solo se
// reexporta el nombre local para no tocar el resto del módulo.
//
// Antes esta función era privada de decisiones.js, y por eso el arreglo se quedó a medias:
// objetivo.js seguía con su tabla propia (19/24/30/37/45/47), que es la que alimenta la
// pestaña "Hacienda" entera, la reserva de impuestos y la Renta. La app enseñaba las DOS a
// la vez: "estás en el tramo del 19 %" y "cambio de tramo: del 18 % al 20,5 %".

function hitoTramoIrpf(c) {
  const fijoAnual = (c.modelo.cuotaAutonomo + c.modelo.deducibles) * 12;
  // La base imponible anual sale del beneficio anual de la app, no de la media de ventas
  // por su cuenta: así este hito mira exactamente la misma cifra que todos los demás.
  const baseAnual = c.beneficioAnual - fijoAnual;
  const comunidad = c.residencia.comunidad;
  const datosCom = DATOS_AUTONOMICOS[comunidad] || DATOS_AUTONOMICOS.madrid;
  const escala = escalaIrpfAgregada(comunidad);
  // Sin escala autonómica publicada no se inventan tramos: se usa el aviso que ya redacta
  // detalleIrpfEspana y el hito lo dice en voz alta.
  const avisoEscala = datosCom.escalaCompleta
    ? null
    : (detalleIrpfEspana(Math.max(0, baseAnual), comunidad).avisos[0] || null);

  const idx = escala.findIndex((t) => baseAnual <= t.hasta);
  const actual = idx >= 0 ? escala[idx] : escala[escala.length - 1];
  const siguiente = idx >= 0 && idx + 1 < escala.length ? escala[idx + 1] : null;

  if (!siguiente || !Number.isFinite(actual.hasta)) {
    return hito({
      id: 'irpf-tramo',
      titulo: 'Cambio de tramo de IRPF',
      tipo: 'fiscal',
      sentido: 'aviso',
      umbral: null,
      unidad: 'eur-ano',
      alcanzado: true,
      distancia: 0,
      ventasQueFaltan: 0,
      quePasa: `Ya estás en el tramo más alto de la escala de ${datosCom.nombre} (${pctTexto(actual.tipo)}). No hay siguiente escalón al que subir.`,
      queHacer: `Aparta el ${pctTexto(actual.tipo)} de cada euro nuevo que entre y no lo mires más.`,
      urgencia: 'vigilar',
      faltaDato: avisoEscala,
    });
  }

  // El umbral es una base imponible, no un beneficio: para pasarlo a ventas hay que
  // devolverle la cuota y los deducibles que se le habían restado.
  const umbralBase = actual.hasta;
  const beneficioEquivalente = umbralBase + fijoAnual;
  const faltan = ventasFaltan(c, beneficioEquivalente);
  return hito({
    id: 'irpf-tramo',
    titulo: `Cambio de tramo de IRPF: del ${pctTexto(actual.tipo)} al ${pctTexto(siguiente.tipo)}`,
    tipo: 'fiscal',
    sentido: 'aviso',
    umbral: umbralBase,
    unidad: 'eur-ano',
    alcanzado: false,
    distancia: umbralBase - baseAnual,
    ventasQueFaltan: faltan,
    quePasa: `Al pasar de ${formatoEuros(umbralBase)} de base al año, el euro SIGUIENTE tributa al ${pctTexto(siguiente.tipo)} en vez de al ${pctTexto(actual.tipo)} (escala estatal + la de ${datosCom.nombre}). Lo que ya has ganado no cambia de tipo. Nunca pierdes dinero por ganar más: sube lo que tienes que apartar, no el recibo entero.`,
    situacion: `Nada que frenar. Lo único que cambia: a partir de ese punto lo que apartes de lo que entre de MÁS es el ${pctTexto(siguiente.tipo)}, no el ${pctTexto(c.modelo.irpf)} de ahora.`,
    queHacer: null,
    urgencia: urgenciaPorVentas(faltan),
    faltaDato: avisoEscala,
  });
}

function hitoFronteraReta(c) {
  const factor = 1 - DEDUCCION_GENERICA_RETA / 100;
  // El computable no es el beneficio: es el beneficio menos el 7 % del art. 308.1.c) LGSS.
  const umbralBeneficio = UMBRALES.retaComputableAnual / factor;
  const computableHoy = tramoRetaDe(c.beneficioAnual, c.residencia.deduccionGenericaReta).computableAnual;
  const alcanzado = computableHoy >= UMBRALES.retaComputableAnual;
  const faltan = alcanzado ? 0 : ventasFaltan(c, umbralBeneficio);
  return hito({
    id: 'reta-frontera',
    titulo: 'Frontera de la tabla de cuota de autónomo',
    tipo: 'fiscal',
    sentido: 'aviso',
    umbral: umbralBeneficio,
    unidad: 'eur-ano',
    alcanzado,
    distancia: alcanzado ? 0 : umbralBeneficio - c.beneficioAnual,
    ventasQueFaltan: faltan,
    holgura: alcanzado ? ventasHolgura(c, umbralBeneficio) : null,
    quePasa: `Por encima de ${formatoEuros(UMBRALES.retaComputableAnual)} al año de rendimiento computable (1.166,70 al mes) sales de la tabla reducida de la Seguridad Social y entras en la general. Hoy vas por ${formatoEuros(computableHoy)} computables. Con tarifa plana no lo notas; el día que se acabe, tu cuota sale de esa tabla.`,
    situacion: alcanzado
      ? 'Ya estás en la tabla general.'
      : `Te faltan ${formatoEuros(umbralBeneficio - c.beneficioAnual)} de beneficio al año, que son ${ventasTexto(faltan)} ventas más al mes. Cuando lo cruces, hay que comunicar el rendimiento nuevo en Importass antes de que te lo regularicen.`,
    queHacer: alcanzado
      ? 'Entra en Importass y comprueba que el rendimiento que tienes comunicado es el de verdad: de ese número sale tu cuota, y si está corto te lo regularizan después.'
      : null,
    urgencia: alcanzado ? 'vigilar' : urgenciaPorVentas(faltan),
  });
}

// La tarifa plana son DOS cosas y estaban en un solo hito, mezcladas:
//
//   · una FECHA -a los 12 meses del alta en el RETA se acaba-, y
//   · un TECHO de rendimiento -solo puedes prorrogar si te quedas por debajo del SMI-.
//
// El hito viejo sacaba `alcanzado` de los meses que quedan y la distancia del SMI, con
// `max(0, SMI − beneficio)` y `ventasFaltan(SMI)`, que son fórmulas de SUELO aplicadas a un
// TECHO. El informe dice lo contrario (sección 7.5): "por encima, no puedes prorrogar; y si
// prorrogaste y lo superas, te regularizan". Resultado: con 40.000 o con 230.000 € al año
// la pantalla ponía la misma cifra grande, "0 ventas más al mes", y como con distancia 0
// encabezaba siempre la lista, el hueco de "lo siguiente que va a pasar" quedaba
// secuestrado de forma permanente. Ahora son dos hitos con dos varas distintas.
function hitoTarifaPlana(c) {
  const cuotaDespues = cuotaRetaAnual(c.beneficioAnual, c.residencia.deduccionGenericaReta) / 12;
  const salto = cuotaDespues - c.modelo.cuotaAutonomo;
  const quedan = c.tarifaPlana.mesesQueQuedan;
  const elSalto = `tu cuota pasa de ${formatoEuros(c.modelo.cuotaAutonomo)} al mes a unos ${formatoEuros(cuotaDespues)}: ${formatoEuros(salto)} más cada mes, ${formatoEuros(salto * 12)} al año`;

  // SIN la fecha de alta no hay NADA cruzado. `alcanzado` es calendario, y aquí no hay
  // calendario. Antes esta rama lo deducía del beneficio (>= SMI), que es otra magnitud, y
  // pasaba lo peor que puede pasar: tener MENOS información hacía que la app afirmara MÁS.
  // Con 19 ventas al mes pintaba el hito en verde con un visto y "hecho", escondía el
  // "no sé en qué mes te diste de alta" dentro de un plegable cerrado, y se llevaba por
  // delante la única acción que importaba (queHacerHoy solo empujaba los faltaDato NO
  // alcanzados). El plazo de la prórroga, si se pasa, no se recupera.
  if (quedan === null) {
    const yaPorEncima = c.beneficioAnual >= UMBRALES.smiAnual;
    // El techo se mide sobre el RENDIMIENTO, que es lo que factura, no sobre el beneficio
    // del negocio. Con el beneficio esta frase decía "la prórroga probablemente no te la
    // concedan" teniendo 7.754 € de margen por debajo del SMI.
    const loDeLaProrroga = yaPorEncima
      ? ` Además, para prorrogar el segundo año hay que quedarse por debajo de ${formatoEuros(UMBRALES.smiAnual)} de rendimiento neto al año (SMI 2026) y tú ya vas por ${formatoEuros(c.beneficioAnual)} facturados: la prórroga probablemente no te la concedan, así que cuenta con la cuota de verdad.`
      : ` La buena noticia: SÍ puedes prorrogarla. El techo para el segundo año es ${formatoEuros(UMBRALES.smiAnual)} de rendimiento neto al año (SMI 2026) y tú vas por ${formatoEuros(c.beneficioAnual)} facturados, con ${formatoEuros(UMBRALES.smiAnual - c.beneficioAnual)} de margen.`;
    return hito({
      id: 'tarifa-plana',
      titulo: 'Se te acaba la tarifa plana',
      tipo: 'fiscal',
      sentido: 'aviso',
      umbral: null,
      unidad: 'meses',
      alcanzado: false,
      distancia: null,
      ventasQueFaltan: null,
      quePasa: `Cuando se acabe, ${elSalto}.${loDeLaProrroga}`,
      queHacer: 'Entra hoy en Importass y mira la fecha exacta de tu alta en el RETA. La prórroga hay que pedirla ANTES de que se cumplan los 12 primeros meses: si se pasa el plazo, se pierde y no se recupera. Es la acción de menos esfuerzo y más dinero que tienes ahora mismo.',
      urgencia: 'ya',
      faltaDato: 'No sé en qué mes te diste de alta en el RETA, así que no puedo contarte los meses que quedan. Está en Importass, en "Mis datos de autónomo".',
    });
  }

  const alcanzado = quedan <= 0;
  return hito({
    id: 'tarifa-plana',
    titulo: alcanzado ? 'Tu tarifa plana ya se acabó' : 'Se te acaba la tarifa plana',
    tipo: 'fiscal',
    sentido: 'aviso',
    umbral: c.tarifaPlana.mesesTotales,
    unidad: 'meses',
    alcanzado,
    distancia: Math.max(0, quedan),
    // Es una FECHA, no un ritmo: no hay ventas al mes que la retrasen ni que la adelanten.
    ventasQueFaltan: null,
    quePasa: alcanzado
      ? `Ya se acabó. Tu cuota real, con tu beneficio de ahora, es de unos ${formatoEuros(cuotaDespues)} al mes, no ${formatoEuros(c.modelo.cuotaAutonomo)}.`
      : `Te quedan ${quedan} ${quedan === 1 ? 'mes' : 'meses'}. Cuando se acabe, ${elSalto}.`,
    queHacer: alcanzado
      ? `Cambia la cuota de autónomo en Ajustes del modelo: pon ${formatoEuros(cuotaDespues)} en vez de ${formatoEuros(c.modelo.cuotaAutonomo)}. Todo lo demás de la app está calculando de menos hasta que lo hagas.`
      : `Pide la prórroga en Importass antes de que se cumplan los 12 primeros meses. Y ese mismo día, cambia la cuota en Ajustes del modelo a ${formatoEuros(cuotaDespues)} para ver la foto de verdad.`,
    urgencia: alcanzado || quedan <= 3 ? 'ya' : (quedan <= 6 ? 'este-trimestre' : 'este-ano'),
  });
}

// El TECHO del SMI, con semántica de techo: lo que se mide es la holgura que te queda por
// debajo, nunca "lo que te falta". Cruzarlo NO es un fracaso -significa que ganas más de lo
// que vale la prórroga-, y por eso este hito no puede encabezar la lista ni pintar una
// barra de progreso verde.
// FUENTE: docs/investigacion-fiscal-2026.md, sección 7.5 (art. 38 ter Ley 20/2007).
function hitoTarifaPlanaSmi(c) {
  const superado = c.beneficioAnual > UMBRALES.smiAnual;
  const holgura = superado ? null : ventasFaltan(c, UMBRALES.smiAnual);
  const margen = Math.max(0, UMBRALES.smiAnual - c.beneficioAnual);
  return hito({
    id: 'tarifa-plana-smi',
    titulo: superado
      ? 'La prórroga de la tarifa plana ya no te sale por rendimiento'
      : 'Puedes prorrogar la tarifa plana: vas por debajo del techo',
    tipo: 'fiscal',
    sentido: 'aviso',
    esTecho: true,
    umbral: UMBRALES.smiAnual,
    unidad: 'eur-ano',
    alcanzado: superado,
    distancia: superado ? 0 : margen,
    // Nunca "ventas que faltan": aquí no falta nada, SOBRA. Pedir ventas para cruzar un
    // techo que cuesta 2.600 € al año era el signo invertido del bug.
    ventasQueFaltan: null,
    holgura,
    // El rendimiento que mide este techo es lo que FACTURA, no el beneficio del negocio:
    // lo que no se factura no es rendimiento suyo y no cuenta contra el SMI.
    quePasa: superado
      ? `Para prorrogar el segundo año de tarifa plana hay que quedarse por debajo de ${formatoEuros(UMBRALES.smiAnual)} de rendimiento neto al año (SMI 2026) y vas por ${formatoEuros(c.beneficioAnual)} facturados. Por encima no se puede prorrogar, y si la prorrogaste y lo superas, te regularizan. Esto no es una mala noticia: ganas más de lo que vale la prórroga.`
      : `SÍ puedes prorrogar el segundo año: hay que quedarse por debajo de ${formatoEuros(UMBRALES.smiAnual)} de rendimiento neto al año (SMI 2026) y tú vas por ${formatoEuros(c.beneficioAnual)} facturados. Te sobran ${formatoEuros(margen)}, que son ${ventasTexto(holgura)} ventas al mes de margen. Es un techo, no una meta.`,
    situacion: superado
      ? 'No hay nada que hacer con esto: el negocio no se frena para pagar menos cuota. Lo que sí cambia es que tienes que contar con la cuota de verdad.'
      : 'El techo se mide sobre lo que facturas, no sobre el beneficio del negocio: lo que sigue en la caja sin facturar no cuenta contra el SMI. Nada que hacer hoy más que pedir la prórroga a tiempo.',
    queHacer: null,
    urgencia: 'vigilar',
  });
}

function hitoSL(c) {
  return hitoPorBeneficio(c, {
    id: 'sl',
    titulo: 'Montar una SL en vez de seguir como autónomo',
    tipo: 'estructura',
    umbral: UMBRALES.slEquilibrio,
    quePasa: `A partir de ${formatoEuros(UMBRALES.slEquilibrio)} de beneficio tuyo al año, la SL empieza a empatar con el autónomo si sacas todo el dinero cada año. Con el sobrecoste de gestoría no compensa de verdad hasta ${formatoEuros(UMBRALES.slConGestoria)}-100.000. Y si dejas el dinero dentro para reinvertir, compensa antes: desde 50.000.`,
    situacion: 'Nada todavía: por debajo de ese beneficio la SL te cuesta dinero.',
    queHacer: 'Cuando llegues, manda esta pregunta a tu asesoría, con estas palabras: "¿me aplica el puerto seguro del art. 18.6 LIS, que obliga a retribuir a los socios profesionales con al menos el 75 % del resultado previo?". Si te aplica, la SL deja de compensar y esta cuenta cambia entera.',
  });
}

function hitoParaguay(c) {
  return hitoPorBeneficio(c, {
    id: 'paraguay',
    titulo: 'Paraguay ya te sale mejor que España',
    tipo: 'mudanza',
    umbral: UMBRALES.paraguayDesde,
    quePasa: `Desde ${formatoEuros(UMBRALES.paraguayDesde)} de beneficio al año, Paraguay te deja más limpio que España sobre el papel: 13.000 contra 10.806 con ese mismo beneficio. Y le gana a Dubái hasta 140.000-150.000. El freno no es el dinero: Stripe no opera en Paraguay y tú cobras por ahí, y su residencia fiscal es la más fácil de conseguir y también la más fácil de tumbar por la AEAT.`,
    queHacer: 'Antes de mover nada, manda esta pregunta a tu asesoría, con estas palabras: "si me hago residente fiscal en Paraguay, ¿puedo seguir cobrando por Stripe con una entidad de otro país sin que eso me cree un establecimiento permanente fuera de Paraguay?". Sin esa respuesta, Paraguay es teoría.',
  });
}

function hitoBali(c) {
  return hitoPorBeneficio(c, {
    id: 'bali',
    titulo: 'Bali: el visado se te abre',
    tipo: 'mudanza',
    umbral: UMBRALES.baliLegal,
    quePasa: `El visado E33G exige acreditar 60.000 USD al año (unos ${formatoEuros(UMBRALES.baliLegal)}) con extractos bancarios. Por debajo de ahí, Bali no está sobre la mesa: sólo turista sin trabajar. Y aunque llegues, Indonesia grava tu renta MUNDIAL al 21-28 % efectivo: frente a España no gana de verdad hasta ${formatoEuros(UMBRALES.baliFiscal)}-150.000. Bali no es una decisión fiscal, es una decisión de vida con factura europea. Y es UTC+8: una clase a las 20:00 de España cae a las 02:00 allí.`,
    queHacer: 'Escribe a Imigrasi o a la Embajada de Indonesia en Madrid y pregunta esto, con estas palabras: "¿un contrato mercantil de servicios con una empresa extranjera vale como perjanjian kerja para el visado E33G, o exigen un contrato laboral?". Tú facturas a la GmbH de tu socio, no eres su empleado. Esa respuesta decide si Bali existe para ti.',
  });
}

function hitoDubai(c) {
  return hitoPorBeneficio(c, {
    id: 'dubai',
    titulo: 'Dubái deja de costarte dinero',
    tipo: 'mudanza',
    umbral: UMBRALES.dubaiCruce,
    quePasa: `Entre ${formatoEuros(UMBRALES.dubaiCruce)} y 34.000 de beneficio al año, Dubái empata con España contando sólo impuestos y estructura. Por debajo te CUESTA dinero: con tus cifras de hoy, entre 4.300 y 6.800 al año. El umbral honesto, sumando coste de vida y el riesgo de que Hacienda te reclame sin convenio que oponer, está en ${formatoEuros(UMBRALES.dubaiHonesto)}.`,
    queHacer: 'Antes de gastar un euro, manda esta pregunta a un fiscalista internacional, con estas palabras: "si mi único cliente es la empresa alemana de mi socio y me voy a Emiratos, ¿me aplica el art. 9.1.b) LIRPF por núcleo de intereses económicos, y puedo oponer el art. 4.1.b) del convenio con Emiratos?". Con Emiratos ese convenio no te protege como crees.',
  });
}

// Lo que le debes a Hacienda, con las tres cifras que importan calculadas una sola vez.
// Las usan el hito Y la alerta, para que la misma orden no salga con dos números distintos.
function estadoReservaImpuestos(c) {
  const reserva = reservaImpuestosDe(c.objetivos);
  // LA cifra del día sale de fiscal.js, que es quien sabe de plazos: los 130 vencidos con su
  // recargo y el que está a punto de vencer. Antes aquí se prorrateaba el IRPF real del año
  // y salía la cifra MÁS BAJA de las tres pantallas: obedecerla dejaba el mínimo del día por
  // cumplido con cientos de euros de menos mientras corría el recargo de un 130 vencido.
  const caja = c.reservaHacienda;
  // El IRPF de lo FACTURADO, no el del devengado. Ver `irpfDelAnio` en contexto().
  const irpfAnual = Math.max(0, num(c.irpfDelAnio, 0));
  // El objetivo de fin de año nunca puede ser menor que la caja que ya hace falta hoy: el 130
  // es un ANTICIPO del 20 % y en su caso adelanta MÁS de lo que su IRPF real acabará siendo.
  const debido = caja ? Math.max(irpfAnual, caja.debeHaber) : irpfAnual;
  const devengado = caja ? caja.debeHaber : irpfAnual * c.fraccionDelAnio;
  return {
    reserva,
    debido,
    devengado,
    irpfAnual,
    // Lo que Hacienda te pide tener HOY y no está apartado. Es la MISMA cifra que enseñan
    // "Hacienda" y "Mi patrimonio".
    minimoHoy: Math.max(0, devengado - reserva.importe),
    // Lo que falta para cubrir el año entero: el objetivo.
    falta: Math.max(0, debido - reserva.importe),
    // El dinero con el que se tapa esto YA existe: es tuyo y está en caja o sin etiquetar
    // en tus cuentas. Vender más no cierra este hueco, lo AGRANDA (más beneficio, más
    // IRPF): la única acción que lleva la cifra a cero es la que implica cero ventas.
    disponible: Math.max(0, estadoPatrimonio(c.cuentas, c.objetivos).libre)
      + Math.max(0, disponibleRealParaMi(c.caja, c.split)),
  };
}

// LA frase de la reserva de impuestos: una sola, con las dos cifras y su papel. Antes había
// dos -la alerta decía el hueco contra lo DEVENGADO y el hito el del AÑO ENTERO- y las dos
// salían juntas en "Qué hago hoy", con el mismo verbo y números distintos.
function accionReservaImpuestos(c) {
  const e = estadoReservaImpuestos(c);
  if (!(e.debido > 0) || e.falta <= 0) return null;
  const donde = e.reserva.hay
    ? `Muévelo a tu reserva de impuestos en Patrimonio (${e.reserva.nombres.join(', ')}).`
    : 'Crea una reserva de impuestos en Patrimonio, llámala "Impuestos", y mete ahí ese dinero.';
  const deDonde = e.disponible >= e.falta
    ? 'No hace falta vender nada: ese dinero ya lo tienes, solo está sin etiquetar.'
    : `Con lo que tienes ahora puedes tapar ${formatoEuros(Math.min(e.disponible, e.falta))}; el resto sale de lo que entre.`;
  // De dónde sale el mínimo del día. Es la misma cifra que la pestaña "Hacienda" pone en
  // grande, así que hay que decir por qué es esa y no el IRPF del año: son los pagos
  // fraccionados del 130, que es un ANTICIPO del 20 % y no la factura final.
  const porQue = porQueEseMinimo(c);
  return `Mínimo hoy: ${formatoEuros(e.minimoHoy)}${porQue} Objetivo de aquí a fin de año: ${formatoEuros(e.falta)}. ${donde} ${deDonde}`;
}

function porQueEseMinimo(c) {
  const caja = c.reservaHacienda;
  if (!caja) return ', que es lo que YA has devengado y no está apartado.';
  const trozos = [];
  if (caja.vencidoSinIngresar > 0) {
    trozos.push(`${formatoEuros(caja.vencidoSinIngresar)} de modelos 130 YA vencidos`
      + (caja.recargoQueCorre > 0 ? ` más ${formatoEuros(caja.recargoQueCorre)} de recargo que ya corre` : ''));
  }
  if (caja.porVencerDevengado > 0 && caja.primeroPorVencer) {
    trozos.push(`${formatoEuros(caja.porVencerDevengado)} del ${caja.primeroPorVencer.periodo}, que vence el ${caja.primeroPorVencer.fechaLimite}`);
  }
  if (!trozos.length) return ', que es lo que YA has devengado y no está apartado.';
  return `: ${trozos.join(' y ')}. Es la misma cifra que ves en "Hacienda".`;
}

function hitoReservaImpuestos(c) {
  const e = estadoReservaImpuestos(c);
  const { reserva, debido, devengado, falta } = e;
  const alcanzado = reserva.importe >= debido && debido > 0;
  // Solo se traduce a ventas la parte que de verdad hay que GANAR. Si el dinero ya está,
  // pedir ventas es mentira: el hueco se tapa con una etiqueta, no con una venta.
  const cubrible = falta > 0 && falta <= e.disponible;
  const porGanar = Math.max(0, falta - e.disponible);
  const ventasParaTapar = c.miParteVenta > 0 ? porGanar / c.miParteVenta : null;

  if (!(debido > 0)) {
    return hito({
      id: 'reserva-impuestos',
      titulo: 'Tener apartado lo que le debes a Hacienda',
      tipo: 'riesgo',
      umbral: 0,
      unidad: 'eur',
      alcanzado: true,
      distancia: 0,
      ventasQueFaltan: 0,
      ventasQueFaltanUnidad: 'ventas',
      quePasa: 'Con lo que llevas ganado este año, el IRPF proyectado te sale a cero. No hay nada que apartar todavía.',
      situacion: 'En cuanto el año coja ritmo, este número se enciende solo.',
      queHacer: null,
      urgencia: 'vigilar',
    });
  }

  return hito({
    id: 'reserva-impuestos',
    titulo: 'Tener apartado lo que le debes a Hacienda',
    tipo: 'riesgo',
    umbral: debido,
    unidad: 'eur',
    alcanzado,
    distancia: falta,
    ventasQueFaltan: alcanzado ? 0 : ventasParaTapar,
    ventasQueFaltanUnidad: 'ventas',
    cubrible,
    // Dos cifras y dos papeles, sin mezclarlos: lo que Hacienda te pide TENER HOY (los pagos
    // fraccionados del 130, que son un anticipo del 20 %) y lo que de verdad se va a quedar
    // al cerrar el año (tu IRPF real por tramos). En su caso el anticipo es MAYOR que la
    // factura, y por eso la Renta le devuelve: decir solo una de las dos confunde.
    quePasa: `Hacienda te pide tener apartados ${formatoEuros(devengado)} a día de hoy: ese dinero no es tuyo aunque esté en tu cuenta. Tienes apartados ${formatoEuros(reserva.importe)}.`
      + (e.irpfAnual > 0 && Math.abs(e.irpfAnual - devengado) >= 1
        ? ` Tu IRPF real de todo el año son ${formatoEuros(e.irpfAnual)}: los 130 son un anticipo del 20 % y lo que sobre vuelve en la Renta.`
        : ''),
    situacion: alcanzado
      ? 'Está cubierto el año entero. No toques esa reserva para nada más.'
      : (cubrible
        ? `El dinero para taparlo ya lo tienes: ${formatoEuros(e.disponible)} entre la caja y lo que no has etiquetado. Es un hueco de etiqueta, no de ventas.`
        : `Con lo que tienes hoy puedes tapar ${formatoEuros(Math.min(e.disponible, falta))} de los ${formatoEuros(falta)}.`),
    queHacer: alcanzado ? null : accionReservaImpuestos(c),
    urgencia: reserva.importe < devengado ? 'ya' : (alcanzado ? 'vigilar' : 'este-trimestre'),
    faltaDato: reserva.hay
      ? null
      : 'No hay ninguna reserva con "impuestos", "Hacienda" o "IRPF" en el nombre dentro de Patrimonio: cuento 0 apartado.',
  });
}

function hitosObjetivosPersonales(c) {
  return c.objetivos
    .filter((o) => o.clase === 'objetivo')
    .map((o, i) => {
      const nombre = o.nombre || `Objetivo sin nombre ${i + 1}`;
      const id = `objetivo-${o.nombre ? o.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : `sin-nombre-${i + 1}`}`;
      if (!(o.meta > 0)) {
        return hito({
          id,
          titulo: nombre,
          tipo: 'personal',
          umbral: null,
          unidad: 'eur',
          alcanzado: false,
          quePasa: `"${nombre}" no tiene meta puesta, así que no sé cuándo está hecho ni cuánto te falta.`,
          queHacer: `Abre Patrimonio y ponle una cifra a "${nombre}". Sin meta, es un deseo, no un objetivo.`,
          urgencia: 'vigilar',
          faltaDato: `Falta la meta en euros de "${nombre}".`,
        });
      }
      const falta = Math.max(0, o.meta - o.asignado);
      const alcanzado = o.asignado >= o.meta;
      const ventasParaTapar = c.miParteVenta > 0 ? falta / c.miParteVenta : null;
      return hito({
        id,
        titulo: nombre,
        tipo: 'personal',
        umbral: o.meta,
        unidad: 'eur',
        alcanzado,
        distancia: falta,
        ventasQueFaltan: alcanzado ? 0 : ventasParaTapar,
        ventasQueFaltanUnidad: 'ventas',
        quePasa: alcanzado
          ? `"${nombre}" está completo: ${formatoEuros(o.asignado)} de ${formatoEuros(o.meta)}. El dinero ya está.`
          : `Te faltan ${formatoEuros(falta)} para "${nombre}", que son ${ventasTexto(ventasParaTapar)} ventas. No al mes: ${ventasTexto(ventasParaTapar)} ventas en total.`,
        queHacer: alcanzado
          ? `Hazlo. El dinero está apartado desde hace tiempo y sigue ahí parado.`
          : `Cada vez que retires, manda ${formatoEuros(Math.min(falta, c.miParteVenta))} a "${nombre}" antes de gastar nada. Con una venta al mes lo tienes en ${Math.max(1, Math.ceil(falta / Math.max(1, c.miParteVenta)))} meses.`,
        urgencia: alcanzado ? 'ya' : 'vigilar',
        sentido: 'meta',
      });
    });
}

// Todos los hitos, ordenados por cercanía. Primero lo que tienes delante y puedes calcular;
// luego lo que no se puede medir por falta de un dato; al final lo que ya cruzaste, y ahí
// el primero es el que tienes más justo, que es el que puedes volver a perder.
export function hitos(ctx) {
  const c = contexto(ctx);
  const lista = [
    hitoPuntoMuerto(c),
    hitoGastosVida(c),
    hitoTramoIrpf(c),
    hitoFronteraReta(c),
    hitoTarifaPlana(c),
    hitoTarifaPlanaSmi(c),
    hitoSL(c),
    hitoParaguay(c),
    hitoBali(c),
    hitoDubai(c),
    hitoReservaImpuestos(c),
    ...hitosObjetivosPersonales(c),
  ];

  // El orden, y por qué NO es un solo número.
  //
  // `ventasQueFaltan` lleva dos magnitudes que no se comparan entre sí, y el propio
  // comentario del constructor avisa de que confundirlas es el error más caro de leer:
  //   · 'ventas/mes' -> un cambio de RITMO permanente (subir de 3 a 9 ventas al mes),
  //   · 'ventas'     -> un hueco de DINERO que se tapa esperando, sin cambiar nada.
  // Ordenarlas juntas ponía "Dubái, 3,08 ventas/mes" (duplicar el ritmo para siempre) por
  // delante de "colchón, 5,13 ventas" (1,7 meses al ritmo de hoy), y mandaba "Irme del
  // país" al último puesto detrás de montar una SL. Van en grupos separados, cada uno con
  // su vara: los huecos se miden en MESES al ritmo de hoy; los ritmos, en ventas al mes.
  const mesesAlRitmo = (h) => (c.ventasMedia > 0 ? h.ventasQueFaltan / c.ventasMedia : Infinity);

  const clave = (h) => {
    if (h.alcanzado) return [4, Number.isFinite(h.holgura) ? h.holgura : Infinity];
    // Los techos nunca encabezan: su distancia es holgura, no camino, y con 0 se colaban
    // los primeros y secuestraban el bloque de "lo siguiente".
    if (h.esTecho) return [2, Number.isFinite(h.holgura) ? h.holgura : Infinity];
    if (h.ventasQueFaltan === null || !Number.isFinite(h.ventasQueFaltan)) return [3, 0];
    if (h.ventasQueFaltanUnidad === 'ventas') return [1, mesesAlRitmo(h)];
    return [0, h.ventasQueFaltan];
  };

  return lista
    .map((h, i) => ({ h, i }))
    .sort((a, b) => {
      const ka = clave(a.h);
      const kb = clave(b.h);
      if (ka[0] !== kb[0]) return ka[0] - kb[0];
      if (ka[1] !== kb[1]) return ka[1] - kb[1];
      return a.i - b.i;
    })
    .map((x) => x.h);
}

// El más cercano que todavía no has cruzado. Si todos los que se pueden medir están
// cruzados, devuelve el primero sin cruzar aunque no se pueda medir (que también es una
// respuesta: "esto es lo siguiente, y me falta un dato"). null sólo si no queda ninguno.
export function siguienteHito(ctx) {
  const lista = hitos(ctx);
  return lista.find((h) => !h.alcanzado) || null;
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

function alerta(id, nivel, texto, dato) {
  return { id, nivel, texto, dato: dato === undefined || dato === null ? '' : String(dato) };
}

// Siempre salen las seis, siempre en el mismo orden, aunque estén en verde. Una lista que
// cambia de tamaño cada día es una lista que da miedo mirar: si todo va bien, se ven seis
// líneas verdes y se cierra la app tranquilo.
export function alertas(ctx) {
  const c = contexto(ctx);
  const out = [];

  // 1. Días sin vender
  const dias = c.hoy ? diasDesdeUltimaVenta(c.ventas, c.hoy) : null;
  if (dias === null) {
    out.push(alerta('sin-ventas', 'ambar',
      'Todavía no hay ninguna venta apuntada. Sin ventas no hay nada que medir.',
      '—'));
  } else if (dias >= DIAS_SIN_VENTAS_ROJO) {
    out.push(alerta('sin-ventas', 'rojo',
      `Llevas ${dias} días sin una sola venta. Es más de un mes: esto ya no es una mala racha.`,
      `${dias} días`));
  } else if (dias >= DIAS_SIN_VENTAS_AMBAR) {
    out.push(alerta('sin-ventas', 'ambar',
      `Llevas ${dias} días sin una venta.`,
      `${dias} días`));
  } else {
    out.push(alerta('sin-ventas', 'verde',
      dias === 0 ? 'Hoy has vendido.' : `Tu última venta fue hace ${dias} ${dias === 1 ? 'día' : 'días'}.`,
      `${dias} días`));
  }

  // 2. La reserva de impuestos contra el IRPF real proyectado sobre lo que FACTURA (ver
  // `irpfDelAnio` en contexto(): con el devengado esta alerta pedía apartar 2.433,36 €
  // cuando la factura de verdad son 366,63). El devengado del año se cuenta con el mes en
  // curso por días (fraccionDelAnioDevengada): con meses enteros, cada día 1 esta alerta
  // saltaba de ámbar a rojo sin que cambiara ni un dato.
  const reserva = reservaImpuestosDe(c.objetivos);
  const debido = Math.max(0, num(c.irpfDelAnio, 0));
  const devengado = debido * c.fraccionDelAnio;
  if (!(debido > 0)) {
    out.push(alerta('reserva-impuestos', 'verde',
      'Con lo que llevas este año, el IRPF proyectado es cero: no hay nada que apartar.',
      formatoEuros(0)));
  } else if (reserva.importe < devengado) {
    out.push(alerta('reserva-impuestos', 'rojo',
      `Tu reserva de impuestos (${formatoEuros(reserva.importe)}) no cubre ni lo que YA has devengado este año (${formatoEuros(devengado)}). Ese dinero no es tuyo.`,
      formatoEuros(devengado - reserva.importe)));
  } else if (reserva.importe < debido) {
    out.push(alerta('reserva-impuestos', 'ambar',
      `Cubres lo devengado, pero al ritmo de este año vas a deber ${formatoEuros(debido)} y tienes ${formatoEuros(reserva.importe)}.`,
      formatoEuros(debido - reserva.importe)));
  } else {
    out.push(alerta('reserva-impuestos', 'verde',
      `Tienes cubierto el IRPF del año entero: ${formatoEuros(reserva.importe)} apartados contra ${formatoEuros(debido)} de factura prevista.`,
      formatoEuros(reserva.importe - debido)));
  }

  // 3. Sobreasignado: has repartido más de lo que hay
  const estado = estadoPatrimonio(c.cuentas, c.objetivos);
  if (estado.sobreasignado) {
    out.push(alerta('sobreasignado', 'rojo',
      `Has puesto etiqueta a ${formatoEuros(estado.exceso)} más de lo que hay en tus cuentas. Alguno de esos objetivos no tiene dinero detrás.`,
      formatoEuros(estado.exceso)));
  } else {
    out.push(alerta('sobreasignado', 'verde',
      `Todo lo asignado tiene dinero detrás. Te quedan ${formatoEuros(estado.libre)} sin etiquetar.`,
      formatoEuros(estado.libre)));
  }

  // 4. El mes contra tu media
  out.push(alertaDelMes(c));

  // 5. Dinero tuyo esperando en caja
  const disponible = disponibleRealParaMi(c.caja, c.split);
  const retiradoEsteMes = c.mes ? miRetiroDelMes(c.retiros, c.mes, c.split) : 0;
  if (disponible >= RETIRO_MINIMO_RELEVANTE && retiradoEsteMes <= 0) {
    out.push(alerta('retirar', 'ambar',
      `Tienes ${formatoEuros(disponible)} tuyos en caja y este mes no has retirado nada.`,
      formatoEuros(disponible)));
  } else if (disponible >= RETIRO_MINIMO_RELEVANTE) {
    out.push(alerta('retirar', 'verde',
      `Te quedan ${formatoEuros(disponible)} por retirar y este mes ya sacaste ${formatoEuros(retiradoEsteMes)}.`,
      formatoEuros(disponible)));
  } else {
    out.push(alerta('retirar', 'verde',
      'No hay dinero tuyo esperando en caja.',
      formatoEuros(disponible)));
  }

  // 6. Tarifa plana
  out.push(alertaTarifaPlana(c));

  return out;
}

function alertaDelMes(c) {
  if (!c.hoy) {
    return alerta('mes-bajo-media', 'ambar',
      'No sé qué día es hoy, así que no puedo comparar el mes con tu media.', '—');
  }
  const dia = Number(c.hoy.slice(8, 10));
  const total = diasDelMes(c.hoy);
  const delMes = c.ventas.filter((v) => String(v && v.fecha).slice(0, 7) === c.mes && String(v && v.fecha) <= c.hoy).length;

  if (!(c.ventasMedia > 0)) {
    return alerta('mes-bajo-media', 'verde',
      `Todavía no hay media con la que comparar. Este mes llevas ${delMes} ${delMes === 1 ? 'venta' : 'ventas'}.`,
      `${delMes}`);
  }
  if (dia < DIA_MINIMO_PARA_JUZGAR_EL_MES) {
    return alerta('mes-bajo-media', 'verde',
      `Es día ${dia}: demasiado pronto para juzgar el mes. Llevas ${delMes} ${delMes === 1 ? 'venta' : 'ventas'}.`,
      `${delMes}`);
  }

  const proyectado = proyeccionLineal(delMes, dia, total);
  const ratio = proyectado / c.ventasMedia;
  if (ratio < 0.5) {
    return alerta('mes-bajo-media', 'rojo',
      `A este ritmo el mes cierra con ${ventasTexto(proyectado)} ventas y tu media es ${ventasTexto(c.ventasMedia)}. Vas a menos de la mitad.`,
      `${ventasTexto(proyectado)} vs ${ventasTexto(c.ventasMedia)}`);
  }
  if (ratio < 0.9) {
    return alerta('mes-bajo-media', 'ambar',
      `A este ritmo el mes cierra con ${ventasTexto(proyectado)} ventas, por debajo de tu media de ${ventasTexto(c.ventasMedia)}.`,
      `${ventasTexto(proyectado)} vs ${ventasTexto(c.ventasMedia)}`);
  }
  return alerta('mes-bajo-media', 'verde',
    `El mes va a ritmo: proyecta ${ventasTexto(proyectado)} ventas contra tu media de ${ventasTexto(c.ventasMedia)}.`,
    `${ventasTexto(proyectado)} vs ${ventasTexto(c.ventasMedia)}`);
}

function alertaTarifaPlana(c) {
  const quedan = c.tarifaPlana.mesesQueQuedan;
  const cuotaDespues = cuotaRetaAnual(c.beneficioAnual, c.residencia.deduccionGenericaReta) / 12;
  if (quedan === null) {
    return alerta('tarifa-plana', 'ambar',
      'No sé cuándo empezó tu tarifa plana, así que no puedo avisarte de cuándo se acaba. Está en Importass.',
      '—');
  }
  if (quedan <= 0) {
    return alerta('tarifa-plana', 'rojo',
      `Tu tarifa plana ya se acabó y la app sigue calculando con ${formatoEuros(c.modelo.cuotaAutonomo)} de cuota. La tuya real son unos ${formatoEuros(cuotaDespues)}.`,
      `${quedan} meses`);
  }
  if (quedan <= 3) {
    return alerta('tarifa-plana', 'rojo',
      `Te quedan ${quedan} ${quedan === 1 ? 'mes' : 'meses'} de tarifa plana. La prórroga se pide antes de que se cumplan los 12 primeros meses.`,
      `${quedan} meses`);
  }
  if (quedan <= 6) {
    return alerta('tarifa-plana', 'ambar',
      `Te quedan ${quedan} meses de tarifa plana. Después, la cuota sube a unos ${formatoEuros(cuotaDespues)} al mes.`,
      `${quedan} meses`);
  }
  return alerta('tarifa-plana', 'verde',
    `Te quedan ${quedan} meses de tarifa plana.`,
    `${quedan} meses`);
}

// ---------------------------------------------------------------------------
// El semáforo
// ---------------------------------------------------------------------------

function peorNivel(lista) {
  if (lista.some((a) => a.nivel === 'rojo')) return 'rojo';
  if (lista.some((a) => a.nivel === 'ambar')) return 'ambar';
  return 'verde';
}

// Una sola frase honesta: dónde estás y qué es lo siguiente. Ni consejos ni ánimos.
export function semaforo(ctx) {
  const c = contexto(ctx);
  const lista = alertas(ctx);
  const sig = siguienteHito(ctx);

  // EL SEMÁFORO NO PUEDE SER MÁS OPTIMISTA QUE EL BLOQUE "LO SIGUIENTE".
  //
  // Antes el nivel salía SOLO de peorNivel(alertas()), y ninguna de las seis alertas mide
  // rentabilidad: alertaDelMes compara el mes contra su PROPIA media, así que con la media
  // ya por debajo del punto muerto imprimía "el mes va a ritmo" mientras el negocio perdía
  // dinero. Resultado real: "Está todo en orden · ... no hay nada urgente" tres huecos por
  // encima de un bloque rojo que decía "y es para hoy", en la misma pantalla.
  const enNegativo = c.miParteMes < 0;
  const sigEsParaHoy = Boolean(sig && sig.urgencia === 'ya');
  let nivel = peorNivel(lista);
  if (enNegativo) nivel = 'rojo';
  else if (sigEsParaHoy && nivel === 'verde') nivel = 'ambar';

  // Un umbral que NO quieres cruzar no se anuncia como una meta: no es "lo siguiente que
  // vas a conseguir", es "lo siguiente que cambia".
  const verbo = sig && sig.sentido === 'aviso' ? 'lo siguiente que cambia es' : 'lo siguiente es';
  const loSiguiente = sig
    ? (sig.unidad === 'meses' && Number.isFinite(sig.distancia)
      ? `${verbo} "${sig.titulo}", dentro de ${sig.distancia} ${sig.distancia === 1 ? 'mes' : 'meses'}`
      : (sig.cubrible
        ? `${verbo} "${sig.titulo}", y para eso no hace falta vender: el dinero ya lo tienes`
        : (sig.ventasQueFaltan === null || !Number.isFinite(sig.ventasQueFaltan)
          ? `${verbo} "${sig.titulo}", y ahí me falta un dato para medirlo`
          : (sig.ventasQueFaltanUnidad === 'ventas'
            ? `${verbo} "${sig.titulo}", a ${ventasTexto(sig.ventasQueFaltan)} ventas`
            : `${verbo} "${sig.titulo}", a ${ventasTexto(sig.ventasQueFaltan)} ventas al mes`))))
    : 'no te queda ningún hito por cruzar';

  const dondeEstoy = `Vas por ${ventasTexto(c.ventasMedia)} ventas al mes, que son ${formatoEuros(c.miParteMes)} tuyos al mes`;

  if (nivel === 'rojo') {
    const peor = lista.find((a) => a.nivel === 'rojo');
    const cabeza = enNegativo
      ? `El negocio no cubre sus gastos: cada mes que sigue así, la diferencia sale de tus ahorros.${peor ? ` ${peor.texto}` : ''}`
      : peor.texto;
    return {
      nivel,
      titulo: 'Hay algo que arreglar hoy',
      explicacion: `${cabeza} ${dondeEstoy} y ${loSiguiente}.`,
    };
  }
  if (nivel === 'ambar') {
    const peor = lista.find((a) => a.nivel === 'ambar');
    const cabeza = peor ? `${peor.texto} ` : '';
    // Sin ninguna alerta encendida pero con el hito de "lo siguiente" para hoy: se dice.
    const cola = !peor && sigEsParaHoy ? ' Ninguna alerta encendida, pero eso es para hoy.' : '';
    return {
      nivel,
      titulo: 'Vas bien, con algo pendiente',
      explicacion: `${cabeza}${dondeEstoy} y ${loSiguiente}.${cola}`,
    };
  }
  // Nada de "no hay nada urgente" a pelo: esa frase la escribía el código, no los datos.
  return {
    nivel,
    titulo: 'Está todo en orden',
    explicacion: `${dondeEstoy}, ninguna alerta encendida y ${loSiguiente}.`,
  };
}

// ---------------------------------------------------------------------------
// Qué hago hoy
// ---------------------------------------------------------------------------

// Cómo se convierte una alerta roja o ámbar en una acción concreta. Sin esta tabla, las
// alertas se quedarían en "algo va mal" y eso es exactamente lo que no sirve.
// "Repite tu mejor mes" no es una acción: no dice qué mes, ni qué se hizo, ni qué se
// repite. Los datos para decirlo ya están en la app (mejorPeorMes y mejorDiaVentas de
// calculos.js), así que se dicen. Y si no se puede decir QUÉ repetir -sin histórico, o
// porque el mejor mes es este mismo-, esto devuelve null y no ocupa uno de los tres huecos
// del día: un hueco con una frase que no se puede ejecutar es un hueco perdido.
function accionMejorMes(c) {
  if (!c.mes || !c.hoy) return null;
  const ingresos = (Array.isArray(c.datos.ingresos) ? c.datos.ingresos : [])
    .filter((i) => i && esMes(i.mes) && Number.isFinite(Number(i.beneficio)));
  const { mejor } = mejorPeorMes(ingresos);
  if (!mejor || !(mejor.beneficio > 0) || mejor.mes === c.mes) return null;

  const delMes = (m) => c.ventas.filter((v) => String(v && v.fecha).slice(0, 7) === m).length;
  const ventasMejor = delMes(mejor.mes);
  const ventasAhora = c.ventas.filter((v) => String(v && v.fecha).slice(0, 7) === c.mes && String(v.fecha) <= c.hoy).length;
  const faltan = Math.max(0, ventasMejor - ventasAhora);
  const dia = mejorDiaVentas(c.ventas, `${mejor.mes}-01`, `${mejor.mes}-31`, c.split);
  const trozoDia = dia ? ` El mejor día fue el ${dia.fecha}, con ${formatoEuros(dia.importe)} tuyos en un solo día.` : '';
  const trozoFaltan = faltan > 0
    ? ` Este mes llevas ${ventasAhora}: te ${faltan === 1 ? 'falta 1 venta' : `faltan ${faltan} ventas`} para igualarlo.`
    : ` Este mes ya llevas ${ventasAhora}.`;
  return `Repite lo que hiciste en ${mejor.mes}: ${ventasMejor} ${ventasMejor === 1 ? 'venta' : 'ventas'} y ${formatoEuros(mejor.beneficio * c.split.yo)} tuyos.${trozoDia}${trozoFaltan}`;
}

function accionDeAlerta(a, c) {
  if (a.nivel === 'verde') return null;
  switch (a.id) {
    case 'sin-ventas':
      return {
        accion: 'Escribe hoy a los tres últimos interesados que no compraron. Uno a uno, por su nombre.',
        porque: a.texto,
        urgencia: a.nivel === 'rojo' ? 'ya' : 'este-trimestre',
      };
    case 'reserva-impuestos': {
      // La MISMA frase que el hito, salida de la misma función: dos órdenes con el mismo
      // verbo y dos cifras distintas sobre la misma reserva sobrevivían las dos al top 3.
      const accion = accionReservaImpuestos(c);
      if (!accion) return null;
      return {
        accion,
        porque: a.texto,
        urgencia: a.nivel === 'rojo' ? 'ya' : 'este-trimestre',
      };
    }
    case 'sobreasignado':
      return {
        accion: `Quita ${a.dato} de los objetivos de Patrimonio hasta que cuadre con lo que hay en las cuentas.`,
        porque: a.texto,
        urgencia: 'ya',
      };
    case 'mes-bajo-media': {
      const accion = accionMejorMes(c);
      if (!accion) return null;
      return {
        accion,
        porque: a.texto,
        urgencia: a.nivel === 'rojo' ? 'ya' : 'este-trimestre',
      };
    }
    case 'retirar':
      return {
        accion: `Haz el reparto: ${a.dato} son tuyos y llevan tiempo parados en caja.`,
        porque: a.texto,
        urgencia: 'este-trimestre',
      };
    case 'tarifa-plana':
      return {
        accion: 'Entra en Importass y mira la fecha exacta de tu alta en el RETA y si la prórroga está pedida.',
        porque: a.texto,
        urgencia: a.nivel === 'rojo' ? 'ya' : 'este-trimestre',
      };
    default:
      return null;
  }
}

// Como mucho tres. Tres cosas se hacen; diez se leen y no se hace ninguna.
export function queHacerHoy(ctx) {
  const c = contexto(ctx);
  const lista = alertas(ctx);

  const candidatas = [];
  for (const a of lista) {
    const acc = accionDeAlerta(a, c);
    if (acc) candidatas.push(acc);
  }

  // Solo `queHacer`, nunca `situacion`: un diagnóstico ("te faltan 401,77 € al mes")
  // ocupando el hueco de la acción, con la etiqueta HOY encima, no se puede ejecutar.
  const sig = siguienteHito(ctx);
  if (sig && sig.queHacer) {
    candidatas.push({
      accion: sig.queHacer,
      porque: `${sig.titulo}: ${sig.quePasa}`,
      urgencia: sig.urgencia,
    });
  }

  // Hitos que faltan por un dato: preguntar ese dato ES la acción. Sin condicionarlo a
  // `!alcanzado`, porque si falta el dato, preguntarlo sigue siendo la acción.
  for (const h of hitos(ctx)) {
    if (h.faltaDato && h.queHacer) {
      candidatas.push({
        accion: h.queHacer,
        porque: h.faltaDato,
        urgencia: h.urgencia,
      });
    }
  }

  if (!candidatas.length) {
    candidatas.push({
      accion: 'Nada. Hoy no hay ninguna ficha que mover.',
      porque: 'Ninguna alerta encendida y ningún umbral cerca.',
      urgencia: 'vigilar',
    });
  }

  const vistas = new Set();
  return candidatas
    .map((x, i) => ({ x, i }))
    .sort((a, b) => {
      const d = pesoUrgencia(a.x.urgencia) - pesoUrgencia(b.x.urgencia);
      return d !== 0 ? d : a.i - b.i;
    })
    .map((o) => o.x)
    .filter((x) => {
      if (!x.accion || vistas.has(x.accion)) return false;
      vistas.add(x.accion);
      return true;
    })
    .slice(0, 3);
}
