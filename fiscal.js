// El calendario de Hacienda: qué modelo toca, cuándo vence, cuánto es y qué pasa si llega
// tarde. Sin DOM y sin fechas del sistema: testeable con `node --test`. El "hoy" entra
// SIEMPRE por parámetro.
//
// TRES REGLAS QUE NO SE TOCAN AQUÍ DENTRO:
//
//  · Ninguna cifra fiscal se inventa. Plazos, porcentajes, recargos y sanciones salen de
//    `docs/situacion-real-cliente-aleman.md`, con la sección y el artículo al lado. Lo que
//    el informe NO da por verificado sale marcado (`confirmado: false`) y con su aviso, no
//    con un número plausible.
//
//  · Prohibido "consúltalo con un profesional" a secas. Donde hay que preguntar algo va LA
//    PREGUNTA EXACTA para copiar y pegar (ver PREGUNTAS, sacadas del apartado 9 del informe).
//
//  · Prohibido preocuparle sin darle una acción. Todo vencimiento y toda alerta llevan su
//    `queHacer` concreto, y el dinero se dice también en VENTAS, que es lo único que él
//    controla.
//
// SU CASO, QUE ES LO QUE CAMBIA LAS RESPUESTAS RESPECTO DE UN AUTÓNOMO CUALQUIERA:
//
//  · Es autónomo español y su único cliente es la GmbH alemana de su socio. Esa empresa NO
//    le retiene IRPF español porque no opera en España (art. 76 RIRPF). Consecuencia: el
//    100 % de sus ingresos van SIN retención, la regla del 70 % del art. 109.2 RIRPF no le
//    libra de nada (0 % es menos que 70 %) y está obligado al modelo 130 los CUATRO
//    trimestres. Informe §2.4.
//
//  · Sus facturas van sin IVA español: no es una exención, es una operación NO SUJETA por la
//    regla de localización del art. 69.Uno.1º LIVA, con inversión del sujeto pasivo. Va en
//    la casilla 59 del 303 (informativa) y NO en la 120. Informe §2.2 y §3.4.
//
//  · El modelo 349 es trimestral, clave S, y NO tiene importe mínimo: con una sola factura
//    ya hay obligación. Informe §2.3.

import { formatoEuros, retirosEntre } from './calculos.js';

import {
  MODELO_DEFAULT,
  normalizarModelo,
  porVenta,
  rentaFiscalDelAnio,
} from './objetivo.js';

// ---------------------------------------------------------------------------
// Los modelos, con su base legal
// ---------------------------------------------------------------------------

// El 20 % del modelo 130 NO es una retención ni su tipo de IRPF: es el pago fraccionado del
// art. 110.1.a) RIRPF, "el 20 por ciento del rendimiento neto correspondiente al período de
// tiempo transcurrido desde el primer día del año hasta el último día del trimestre".
// FUENTE: docs/situacion-real-cliente-aleman.md §2.4 y §3.1.
export const PORCENTAJE_130 = 20;

// El umbral que convierte el 349 de trimestral en mensual. Es TRIMESTRAL, no anual, y el
// salto es automático: el mes en que se cruza hay 20 días para presentar.
// FUENTE: docs/situacion-real-cliente-aleman.md §2.3 (art. 81 RIVA).
export const UMBRAL_349_MENSUAL_TRIMESTRE = 50000;

export const MODELOS = [
  {
    id: '036',
    nombre: 'Modelo 036 — alta en el ROI',
    queEs: 'La declaración censal. Aquí se pide el alta en el Registro de Operadores '
      + 'Intracomunitarios (ROI), que es lo que valida tu NIF con prefijo ES en el censo europeo VIES.',
    periodicidad: 'puntual',
    porcentaje: null,
    sobreQue: 'Casilla 130 (inscripción en el ROI), casilla 582 (alta) y casilla 584 '
      + '(fecha prevista de la primera operación intracomunitaria).',
    obligatorio: true,
    porQue: 'El alta en el ROI no es opcional: el art. 3.3.d) del RD 1065/2007 obliga a '
      + 'inscribirse a quien presta servicios que se localizan en otro Estado miembro con '
      + 'inversión del sujeto pasivo. Es exactamente tu caso, y el alta debe ser PREVIA a la '
      + 'primera operación.',
    baseLegal: 'Art. 3.3.d) RD 1065/2007',
    fuente: 'docs/situacion-real-cliente-aleman.md §2.1 y §3.1',
  },
  {
    id: '130',
    nombre: 'Modelo 130 — pago fraccionado de IRPF',
    queEs: 'Un anticipo de tu IRPF, cada trimestre. No es tu impuesto: tu IRPF real sale de '
      + 'la escala progresiva en la declaración de la Renta, y lo pagado aquí se resta allí.',
    periodicidad: 'trimestral',
    porcentaje: PORCENTAJE_130,
    sobreQue: 'El rendimiento neto ACUMULADO desde el 1 de enero hasta el último día del '
      + 'trimestre (ingresos menos gastos deducibles), menos los pagos fraccionados ya '
      + 'ingresados en trimestres anteriores.',
    obligatorio: true,
    porQue: 'Estás obligado los cuatro trimestres. El art. 109.2 RIRPF libera del 130 a quien '
      + 'tuvo al menos el 70 % de sus ingresos del año anterior sometidos a retención. Tú '
      + 'tienes el 0 % con retención, porque la GmbH alemana no puede retener IRPF español '
      + '(art. 76 RIRPF). 0 % es menos que 70 %: la regla juega en tu contra.',
    baseLegal: 'Arts. 109.2 y 110.1.a) RIRPF · art. 76 RIRPF',
    fuente: 'docs/situacion-real-cliente-aleman.md §2.4 y §3.1',
  },
  {
    id: '303',
    nombre: 'Modelo 303 — autoliquidación de IVA',
    queEs: 'La declaración trimestral de IVA. Tú no repercutes IVA a la GmbH, pero sí te '
      + 'deduces el IVA de tus gastos, así que te va a salir a compensar o a devolver de '
      + 'forma sistemática.',
    periodicidad: 'trimestral',
    porcentaje: null,
    sobreQue: 'Tus servicios a Alemania van en la CASILLA 59, que es puramente informativa: '
      + 'no suma a la base ni a la cuota. NO se ponen en la 120; ponerlos en las dos duplica.',
    obligatorio: true,
    porQue: 'Tus facturas a la GmbH no llevan IVA español porque la operación no está sujeta '
      + 'en España (el cliente está en Alemania), con inversión del sujeto pasivo. Eso no te '
      + 'exime del 303: sigues siendo empresario a efectos de IVA y sigues teniendo derecho a '
      + 'deducir el IVA de tus gastos. Si tu asesoría no te lo está deduciendo, pierdes dinero.',
    baseLegal: 'Art. 69.Uno.1º LIVA · art. 44 Directiva 2006/112/CE',
    fuente: 'docs/situacion-real-cliente-aleman.md §2.2, §3.1 y §3.4',
  },
  {
    id: '349',
    nombre: 'Modelo 349 — operaciones intracomunitarias',
    queEs: 'La declaración informativa de lo que facturas a la Unión Europea. No se paga '
      + 'nada: se declara la base imponible y el NIF-IVA del cliente.',
    periodicidad: 'trimestral',
    porcentaje: null,
    sobreQue: 'Clave S ("prestaciones intracomunitarias de servicios realizadas por el '
      + 'declarante"): base imponible del trimestre y NIF-IVA alemán de la GmbH.',
    obligatorio: true,
    porQue: 'NO hay importe mínimo: con 1 euro facturado ya hay obligación. Pasa a mensual en '
      + `cuanto superes ${UMBRAL_349_MENSUAL_TRIMESTRE.toLocaleString('es-ES')} € (IVA excluido) `
      + 'en un trimestre, y ese umbral es trimestral, no anual.',
    baseLegal: 'Art. 81 RIVA · instrucciones AEAT del modelo 349',
    fuente: 'docs/situacion-real-cliente-aleman.md §2.3 y §3.1',
  },
  {
    id: '390',
    nombre: 'Modelo 390 — resumen anual de IVA',
    queEs: 'El resumen de los cuatro 303 del año. Tampoco se paga nada aquí.',
    periodicidad: 'anual',
    porcentaje: null,
    sobreQue: 'CASILLA 103, que es el equivalente anual de la casilla 59 del 303.',
    obligatorio: true,
    porQue: 'Hacienda cruza automáticamente esto: suma de las casillas 59 de tus cuatro 303 = '
      + 'suma de tus cuatro 349 = casilla 103 del 390. Y todo eso se cruza vía VIES con lo que '
      + 'la GmbH declare en Alemania en su Zusammenfassende Meldung. Si no cuadra, salta un '
      + 'requerimiento aunque el resto esté bien.',
    baseLegal: 'Instrucciones AEAT del modelo 390',
    fuente: 'docs/situacion-real-cliente-aleman.md §3.1 y §3.3',
  },
  {
    id: '100',
    nombre: 'Modelo 100 — declaración de la Renta',
    queEs: 'Tu IRPF de verdad, una vez al año. Aquí se liquida con la escala progresiva y se '
      + 'resta todo lo que hayas ido pagando en los modelos 130.',
    periodicidad: 'anual',
    porcentaje: null,
    sobreQue: 'Escala progresiva sobre el rendimiento neto del año. El 40 % que cobras de la '
      + 'GmbH tributa íntegramente en España como rendimiento de actividad económica.',
    obligatorio: true,
    porQue: 'Eres residente fiscal en España: todo tu impuesto sobre la renta se paga aquí. '
      + 'Alemania no te grava esos beneficios porque no tienes establecimiento permanente allí '
      + '(art. 7.1 del Convenio España-Alemania de 2011, BOE-A-2012-10212).',
    baseLegal: 'Ley 35/2006 (IRPF) · art. 7.1 Convenio España-Alemania 2011',
    fuente: 'docs/situacion-real-cliente-aleman.md §3.1 y §4.2',
  },
];

export function modeloPorId(id) {
  const clave = String(id ?? '');
  return MODELOS.find((m) => m.id === clave) || null;
}

// ---------------------------------------------------------------------------
// Los recargos y las sanciones
// ---------------------------------------------------------------------------

// Art. 27 LGT tras la Ley 11/2021. Ya NO existe la escala 5/10/15/20 % que sigue circulando:
//   · 1 % fijo, más 1 % adicional por cada mes completo de retraso, hasta 12 meses;
//   · a partir de 12 meses, 15 % más intereses de demora;
//   · reducción del 25 % del recargo si se paga todo en plazo (art. 27.5 LGT).
// Y solo aplica si REGULARIZAS ANTES de que llegue un requerimiento. Si llega el
// requerimiento primero, se acabó el recargo y entra el régimen sancionador del art. 191 LGT.
// FUENTE: docs/situacion-real-cliente-aleman.md §2.4.
export const RECARGO_ART27 = {
  base: 1,
  porMesCompleto: 1,
  mesesMaximo: 12,
  masDeDoceMeses: 15,
  reduccion: 25,
};

// Art. 198 LGT: no presentar en plazo declaraciones sin perjuicio económico.
// El art. 198.2 lo reduce A LA MITAD si lo presentas tú antes de que te requieran.
// FUENTE: docs/situacion-real-cliente-aleman.md §2.1, §2.3 y §2.4.
export const SANCIONES = {
  // Declaración-liquidación sin ingreso (un 130 que sale a cero, un 303, un 390).
  sinIngreso: 200,
  sinIngresoVoluntaria: 100,
  // Modelo 349. El informe deja abierto si son los 200 € fijos del art. 198.1 o el régimen
  // de "20 € por dato con un mínimo de 300 €"; con un solo cliente el conjunto de datos es 1,
  // así que en las dos lecturas sale el mínimo. Se dan las dos, no se elige por él.
  informativa349Min: 200,
  informativa349Max: 300,
  informativa349MinVoluntaria: 100,
  informativa349MaxVoluntaria: 150,
  informativa349DudaAbierta: true,
  // Sanción censal por no estar en el ROI.
  censal: 400,
  censalVoluntaria: 200,
};

// ---------------------------------------------------------------------------
// Las preguntas exactas, para copiar y pegar
// ---------------------------------------------------------------------------

// Cada vez que este módulo dice "pregúntaselo a tu asesoría", va con una de estas.
// Las tres primeras son literales del apartado 9 del informe; las dos últimas están
// escritas aquí sobre lagunas que el propio informe declara en su apartado 8 (puntos 24 y
// 26), y no afirman ninguna cifra.
export const PREGUNTAS = {
  regularizacion: 'Quiero regularizar voluntariamente, antes de cualquier requerimiento de la '
    + 'AEAT, mi situación con las operaciones intracomunitarias. Os pido que me confirméis este '
    + 'orden de actuación y que me digáis si cambiaríais algo: 1) Presentar modelo 036 marcando '
    + 'casillas 130, 582 y 584 para el alta en el ROI, y esperar a la concesión (plazo de 3 meses '
    + 'con silencio negativo). 2) Validar la USt-IdNr. de mi cliente alemán en VIES desde la Sede '
    + 'de la AEAT con certificado digital, y conservar el justificante con CSV. 3) Reemitir o '
    + 'rectificar las facturas ya emitidas para que incluyan la mención literal «inversión del '
    + 'sujeto pasivo» del art. 6.1.m) del RD 1619/2012 y los NIF-IVA de ambas partes. '
    + '4) Presentar todos los modelos 349 pendientes (clave S), todos ellos antes de cualquier '
    + 'requerimiento, para acogerme a la reducción a la mitad del art. 198.2 LGT. 5) Rectificar '
    + 'los modelos 303 afectados consignando el importe en la casilla 59 (y no en la 120), y en '
    + 'su caso el modelo 390 (casilla 103). Además os pido una cuantificación de lo que me va a '
    + 'costar en total esta regularización, distinguiendo entre hacerlo ahora voluntariamente y '
    + 'esperar a un requerimiento.',

  sancion349: '¿La sanción por cada modelo 349 no presentado en plazo es la multa fija de 200 € '
    + 'del primer párrafo del art. 198.1 LGT, o el régimen de 20 € por dato con un mínimo de '
    + '300 € del párrafo de suministro de información? Tengo un único cliente, así que el '
    + '"conjunto de datos referido a una misma persona" es 1. Y confirmadme que, presentándolos '
    + 'yo antes de cualquier requerimiento, se reducen a la mitad por el art. 198.2 LGT.',

  roi: 'Presto servicios desde España a una sociedad alemana (GmbH) y no he estado dado de alta '
    + 'en el Registro de Operadores Intracomunitarios durante el período en que he emitido '
    + 'facturas sin IVA español. ¿Permite eso a la AEAT exigirme el IVA repercutido del 21 % '
    + 'sobre esas operaciones? Mi lectura es que no: entiendo que la no sujeción de una '
    + 'prestación de servicios deriva de la regla objetiva de localización del art. 69.Uno.1º '
    + 'LIVA y del art. 44 de la Directiva 2006/112/CE, que solo exige que el destinatario sea '
    + 'empresario, y que el alta en el ROI es una obligación censal (art. 3.3.d) RD 1065/2007) y '
    + 'no un requisito constitutivo; las condiciones materiales de las Quick Fixes de 2020 '
    + 'afectan al art. 138 de la Directiva, que se titula "Exenciones de las entregas de bienes" '
    + 'y no alcanza a los servicios. ¿Existe sentencia del Tribunal Supremo, resolución del TEAC '
    + 'o consulta vinculante de la DGT que se pronuncie expresamente sobre este punto para '
    + 'prestaciones de servicios? Si no existe, decídmelo también.',

  dificilJustificacion: 'En mis modelos 130, ¿me estáis aplicando el 5 % de gastos de difícil '
    + 'justificación del art. 30 del Reglamento del IRPF sobre el rendimiento neto, con el tope '
    + 'de 2.000 € anuales? Quiero saber si se aplica ya en el pago fraccionado trimestral o solo '
    + 'en la declaración de la Renta, y con qué importe exacto lo estáis calculando en mi caso.',

  interesesDemora: 'Si presento fuera de plazo una autoliquidación con más de 12 meses de '
    + 'retraso, el art. 27 LGT fija un recargo del 15 % más intereses de demora. ¿Cuál es el tipo '
    + 'de interés de demora tributario vigente para 2026 y cómo se calcula exactamente en mi '
    + 'caso, desde qué fecha y hasta cuál?',

  calendario2027: '¿Está ya publicado el calendario del contribuyente de la AEAT para 2027? '
    + 'Necesito la fecha exacta de presentación del 4T de 2026 (modelos 130, 303 y 349) y del '
    + 'modelo 390, porque el 30 de enero de 2027 cae en sábado y no sé si se traslada al lunes '
    + '1 de febrero. Y la fecha de fin de la campaña de la Renta de 2026.',

  // PREGUNTA 3 del apartado 9. El dato que falta -si figura como Gesellschafter en el
  // Handelsregister o es solo proveedor- cambia la mitad del análisis, y por eso el informe
  // pide los DOS escenarios por separado en vez de elegir uno.
  socioOProveedor: 'Cobro de una sociedad alemana (GmbH) el 40 % del beneficio repartible del '
    + 'negocio. No sé con certeza si figuro como socio (Gesellschafter) en el Handelsregister '
    + 'alemán o si soy únicamente proveedor con un acuerdo de reparto. Voy a comprobarlo, pero '
    + 'necesito el análisis de los dos escenarios por separado. SI SOY SOLO PROVEEDOR: ¿cómo '
    + 'redactamos un contrato de prestación de servicios que (a) me permita defender la condición '
    + 'de trabajador autónomo económicamente dependiente del art. 11 de la Ley 20/2007, '
    + 'aprovechando que el art. 11.2.e) exige precisamente una contraprestación en función del '
    + 'resultado con riesgo y ventura; (b) me proteja frente a la presunción de laboralidad del '
    + 'art. 8.1 del Estatuto de los Trabajadores; y (c) evite crearle a la sociedad alemana un '
    + 'establecimiento permanente en España por agente dependiente conforme al art. 5.5 del '
    + 'Convenio España-Alemania de 2011? ¿Es registrable en el SEPE un contrato de TRADE cuando el '
    + 'cliente es una sociedad extranjera sin NIF español? SI SOY SOCIO: ¿qué implicaciones tiene '
    + 'en cuanto a (a) obligación de modelo 720 por las participaciones, teniendo en cuenta la '
    + 'valoración por capitalización al 20 % del art. 16.Uno de la Ley 19/1991; (b) operaciones '
    + 'vinculadas del art. 18.2 LIS y art. 41 LIRPF; (c) riesgo de que el Finanzamt alemán '
    + 'califique mis facturas como verdeckte Gewinnausschüttung del § 8 Abs. 3 Satz 2 KStG; y '
    + '(d) obligación de alta en RETA como societario conforme al art. 305.2.b LGSS, siendo la '
    + 'sociedad extranjera?',

  // PREGUNTA 4 del apartado 9. Va aquí y no en "Dónde vivir" porque lo que decide no es la
  // aritmética de los netos, sino si el convenio te ampara: eso es fiscal, no de estilo de vida.
  mudanza: 'Estoy valorando trasladar mi residencia fiscal a Emiratos Árabes Unidos o a Paraguay, '
    + 'manteniendo como único cliente a una sociedad alemana. Necesito vuestro criterio sobre '
    + 'cuatro puntos. 1) EMIRATOS: entiendo que el art. 4 del Convenio España-EAU '
    + '(BOE 23/01/2007) define "residente de los EAU" para personas físicas como quienes están '
    + 'domiciliados allí Y son nacionales emiratíes, lo que como español me deja sin acceso a las '
    + 'reglas de desempate del art. 4.2 y sin utilidad práctica del certificado de residencia '
    + 'fiscal emiratí (TRC). ¿Lo confirmáis? ¿Qué implica eso para mi defensa si la AEAT invoca el '
    + 'art. 9.1.b) LIRPF? 2) PARAGUAY: el Convenio España-Paraguay (BOE-A-2024-15573, en vigor '
    + 'desde el 14/10/2024) sí tiene reglas de desempate estándar, pero su art. 4.1 excluye de la '
    + 'definición de residente a quien esté sujeto a imposición "exclusivamente por la renta que '
    + 'obtenga de fuentes situadas en el citado Estado", y Paraguay aplica un régimen '
    + 'estrictamente territorial. ¿Me deja eso fuera de la protección del convenio? ¿Hay consulta '
    + 'de la DGT, resolución del TEAC o doctrina sobre esta cuestión tras el convenio de 2024? '
    + '3) ¿Merece la pena plantear una consulta vinculante propia a la DGT antes de mudarme, y con '
    + 'qué redacción? 4) ¿Qué documentación concreta debo preparar para acreditar la ruptura de '
    + 'residencia a la luz de las sentencias del Tribunal Supremo de julio de 2024 sobre el '
    + 'art. 9.1.b) (recursos 1909/2023, 1913/2023 y 2613/2023)?',

  // PREGUNTA 5 del apartado 9. Esta NO es para la asesoría española: el propio informe pide
  // expresamente contrastarla con un Steuerberater alemán, porque son normas alemanas.
  riesgoAleman: 'Antes de que mi socio alemán y yo tomemos ninguna decisión, necesito saber qué '
    + 'riesgos le genero A ÉL en Alemania si me traslado a una jurisdicción de baja tributación. '
    + 'Concretamente: 1) § 16 AStG y § 160 AO: si le facturo desde EAU o Paraguay, ¿puede el '
    + 'Finanzamt exigirle revelar todas las relaciones directas e indirectas conmigo, bajo '
    + 'declaración jurada, y rechazarle la deducción del gasto si no lo hace? Entiendo que el '
    + 'umbral de "tributación insignificante" está en el 10 % según el FG Münster (sentencia de '
    + '8/03/2023, asunto 9 K 147/20 K,G), y que tanto el 9 % emiratí como el 0 % paraguayo caen '
    + 'por debajo. 2) DAC6 (§§ 138d y 138e AO): el § 138e Abs. 3 define "empresa vinculada" '
    + 'incluyendo a quien tiene derecho al menos al 25 % de los beneficios de otra persona. Como '
    + 'cobro el 40 % del beneficio repartible, entiendo que somos empresas vinculadas tenga o no '
    + 'participaciones, y que un pago deducible hacia una jurisdicción de tributación cero '
    + 'activaría el indicio del § 138e Abs. 1 Nr. 3 letra d). ¿Se salvaría por el test del '
    + 'beneficio principal del § 138d Abs. 2 si el traslado responde a motivos vitales genuinos y '
    + 'la retribución no cambia? ¿Quién tiene la obligación de declarar en 30 días y qué '
    + 'exposición hay bajo el § 379 Abs. 2 y 7 AO? 3) § 50a Abs. 1 Nr. 3 EStG: ¿qué redacción del '
    + 'contrato evita que mi retribución se califique como cesión de uso de derechos y active una '
    + 'retención en origen del 15 % más recargo de solidaridad? Me preocupa especialmente porque '
    + 'Alemania no tiene convenio con EAU desde el 1/01/2022 ni convenio general con Paraguay, con '
    + 'lo que esa retención sería irrecuperable. Os pido que esta parte la contrastéis con un '
    + 'Steuerberater alemán, porque son normas alemanas y prefiero un dictamen y no una opinión.',
};

// ---------------------------------------------------------------------------
// Los trimestres y sus plazos
// ---------------------------------------------------------------------------

// Plazos de 2026, del informe §3.2:
//   1T -> 20 de abril · 2T -> 20 de julio · 3T -> 1 a 20 de octubre
//   4T -> 1 a 30 de enero del año siguiente (hasta el 30, no el 20), junto con el 390 anual
// Para DOMICILIAR el pago en el banco, el plazo acaba el día 15 en 1T, 2T y 3T, no el 20.
// Del 4T el informe no da fecha de domiciliación, así que aquí va null y se dice.
export const TRIMESTRES = [
  { trimestre: 1, mesInicio: 1, mesFin: 3, vencAnioSiguiente: false, vencMes: 4, vencDia: 20, domiciliacionDia: 15 },
  { trimestre: 2, mesInicio: 4, mesFin: 6, vencAnioSiguiente: false, vencMes: 7, vencDia: 20, domiciliacionDia: 15 },
  { trimestre: 3, mesInicio: 7, mesFin: 9, vencAnioSiguiente: false, vencMes: 10, vencDia: 20, domiciliacionDia: 15 },
  { trimestre: 4, mesInicio: 10, mesFin: 12, vencAnioSiguiente: true, vencMes: 1, vencDia: 30, domiciliacionDia: null },
];

// Modelos trimestrales, en el orden en que se presentan.
const TRIMESTRALES = ['130', '303', '349'];

// El año a partir del cual el informe da los plazos por buenos. Para 2027 el propio informe
// avisa de que el calendario oficial de la AEAT no está publicado (apartado 8, punto 31).
const ANIO_CALENDARIO_CONFIRMADO = 2026;

// ---------------------------------------------------------------------------
// Utilidades de fecha y número. Todo con Date.UTC: mismo `hoyISO`, mismo resultado,
// en cualquier máquina y con cualquier zona horaria.
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

// Redondeo a céntimos. Sin esto, 3.222,80 × 20 % sale 644,5600000000001 y la pantalla
// enseña un decimal que no existe.
function eur(n) {
  const x = num(n, 0);
  return Math.round(x * 100) / 100;
}

function dos(n) {
  return String(n).padStart(2, '0');
}

function iso(anio, mes, dia) {
  return `${anio}-${dos(mes)}-${dos(dia)}`;
}

function ultimoDiaDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function diasEntre(desdeISO, hastaISO) {
  if (!esFecha(desdeISO) || !esFecha(hastaISO)) return null;
  const a = Date.parse(`${desdeISO}T00:00:00Z`);
  const b = Date.parse(`${hastaISO}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

// Una fecha más k meses, "de fecha a fecha". Si el mes de destino no tiene día equivalente
// (31 de enero + 1 mes), el plazo expira el último día del mes: art. 5 del Código Civil.
function fechaMasMeses(fechaISO, k) {
  if (!esFecha(fechaISO)) return '';
  const anio = Number(fechaISO.slice(0, 4));
  const mes = Number(fechaISO.slice(5, 7));
  const dia = Number(fechaISO.slice(8, 10));
  const total = anio * 12 + (mes - 1) + Math.trunc(k);
  const anioNuevo = Math.floor(total / 12);
  const mesNuevo = (total % 12) + 1;
  return iso(anioNuevo, mesNuevo, Math.min(dia, ultimoDiaDelMes(anioNuevo, mesNuevo)));
}

// Meses COMPLETOS de retraso, que es la unidad del art. 27 LGT. Se cuenta de fecha a fecha,
// no dividiendo días entre 30: del 20 de abril al 29 de julio son 3 meses completos (100
// días), y del 20 al 29 de julio, 0.
function mesesCompletosEntre(desdeISO, hastaISO) {
  if (!esFecha(desdeISO) || !esFecha(hastaISO)) return 0;
  if (hastaISO <= desdeISO) return 0;
  let k = 0;
  while (k < 600 && fechaMasMeses(desdeISO, k + 1) <= hastaISO) k += 1;
  return k;
}

// Días de retraso -> meses completos, para cuando solo llegan días (la firma pública de
// recargoPorRetraso). Es una aproximación de 30 días por mes y se dice: el camino exacto es
// el de las fechas, y por eso el calendario le pasa los meses ya contados en `opciones`.
function mesesDesdeDias(dias) {
  const d = Math.max(0, Math.trunc(num(dias, 0)));
  return Math.floor(d / 30);
}

function ventasTexto(n) {
  if (!Number.isFinite(n)) return '—';
  if (n > 0 && n < 0.05) return 'menos de 0,1';
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

// ---------------------------------------------------------------------------
// El contexto, normalizado una sola vez
// ---------------------------------------------------------------------------

// ctx = {
//   datos: { retiros, ventas, gastosNegocio, facturas?, config? },
//   modelo?, hoyISO?, anio?,
//   presentados?: [{ modelo, periodo, anio, fecha?, importe? }],
//   roi?: true | false | null,     // ¿está dado de alta en el ROI/VIES?
//   desdeAnio?: number,            // primer ejercicio con obligaciones
// }
function contextoFiscal(ctx, hoyISO) {
  const c = ctx || {};
  const datos = c.datos || {};
  const config = datos.config || {};
  const modelo = normalizarModelo(c.modelo || config.modelo || MODELO_DEFAULT);

  const hoy = esFecha(hoyISO) ? String(hoyISO) : (esFecha(c.hoyISO) ? String(c.hoyISO) : '');

  const retiros = (Array.isArray(datos.retiros) ? datos.retiros : [])
    .map((r) => ({ fecha: String((r && r.fecha) ?? ''), total: num(r && r.total, 0) }));
  // Si algún día apunta sus facturas de verdad, mandan ellas: son el dato bueno. Mientras
  // no las haya, la base se reconstruye de los retiros por su miShare, que es exactamente
  // lo que hace rentaFiscalDelAnio y evita que dos pantallas digan cifras distintas.
  const facturas = (Array.isArray(datos.facturas) ? datos.facturas : [])
    .map((f) => ({ fecha: String((f && f.fecha) ?? ''), base: num(f && f.base, 0) }))
    .filter((f) => esFecha(f.fecha));

  const anioDeHoy = hoy ? Number(hoy.slice(0, 4)) : null;
  const anio = Number.isFinite(Number(c.anio)) ? Math.trunc(Number(c.anio)) : anioDeHoy;

  // El primer ejercicio con obligaciones. Si no lo dicen, se deduce del dato más antiguo que
  // hay; y si no hay ninguno, del año de hoy. Sirve para no llenar la pantalla de
  // vencimientos de años en los que todavía no facturaba.
  const fechas = [...retiros.map((r) => r.fecha), ...facturas.map((f) => f.fecha)].filter(esFecha).sort();
  const desdeAnio = Number.isFinite(Number(c.desdeAnio))
    ? Math.trunc(Number(c.desdeAnio))
    : (fechas.length ? Number(fechas[0].slice(0, 4)) : (anio ?? null));

  const presentados = (Array.isArray(c.presentados) ? c.presentados : []).map((p) => ({
    modelo: String((p && p.modelo) ?? ''),
    periodo: String((p && p.periodo) ?? ''),
    anio: Number.isFinite(Number(p && p.anio)) ? Math.trunc(Number(p.anio)) : null,
    fecha: esFecha(p && p.fecha) ? String(p.fecha) : '',
    importe: p && p.importe !== undefined && p.importe !== null ? num(p.importe, 0) : null,
  }));

  const roi = c.roi === true ? true : (c.roi === false ? false : null);

  // La foto fiscal del año: la misma que usa el resto de la app. De aquí sale el IRPF real
  // proyectado y el ritmo con el que se proyectan los trimestres que aún no han cerrado.
  const renta = anio !== null && hoy && Number(hoy.slice(0, 4)) === anio
    ? rentaFiscalDelAnio(datos, modelo, hoy)
    : null;

  // Lo que deja UNA venta antes de impuestos. Es la vara con la que se traduce cualquier
  // importe a ventas: los euros son consecuencia, las ventas son lo que él controla.
  const porVentaMia = porVenta(modelo).miParte;

  return {
    datos, config, modelo, hoy, anio, desdeAnio, retiros, facturas, presentados, roi,
    renta, porVentaMia, share: modelo.miShare / 100,
    gastoDeducibleMes: modelo.cuotaAutonomo + modelo.deducibles,
  };
}

// Cuántas ventas hacen falta para pagar un importe. null si una venta no deja nada.
function enVentas(c, importe) {
  if (!(c.porVentaMia > 0)) return null;
  return Math.max(0, num(importe, 0) / c.porVentaMia);
}

// Lo FACTURADO a la GmbH entre dos fechas, ambas inclusive.
function facturadoEntre(c, desde, hasta) {
  if (c.facturas.length) {
    return c.facturas
      .filter((f) => f.fecha >= desde && f.fecha <= hasta)
      .reduce((acc, f) => acc + f.base, 0);
  }
  return retirosEntre(c.retiros, desde, hasta) * c.share;
}

function fuenteIngresos(c) {
  return c.facturas.length ? 'facturas' : 'retiros';
}

// ---------------------------------------------------------------------------
// El calendario
// ---------------------------------------------------------------------------

function periodoTrimestre(t) {
  return `${t}T`;
}

function vencimientoTrimestral(anio, t) {
  const info = TRIMESTRES[t - 1];
  const anioVenc = info.vencAnioSiguiente ? anio + 1 : anio;
  return {
    desde: iso(anio, info.mesInicio, 1),
    hasta: iso(anio, info.mesFin, ultimoDiaDelMes(anio, info.mesFin)),
    // La ventana se abre el día 1 del mes del vencimiento ("1 a 20 de octubre", §3.2).
    fechaApertura: iso(anioVenc, info.vencMes, 1),
    fechaLimite: iso(anioVenc, info.vencMes, info.vencDia),
    fechaDomiciliacion: info.domiciliacionDia ? iso(anioVenc, info.vencMes, info.domiciliacionDia) : null,
    anioVenc,
  };
}

// Estado de un vencimiento a día `hoy`. Sin `hoy` válido no se puede decir: va null en vez
// de un "pendiente" que sería mentira.
function estadoDe(fechaApertura, fechaLimite, hoy, presentado) {
  if (presentado) return 'presentado';
  if (!hoy) return null;
  if (fechaLimite && hoy > fechaLimite) return 'vencido';
  if (fechaApertura && hoy >= fechaApertura) return 'vence-pronto';
  return 'pendiente';
}

function estaPresentado(c, idModelo, periodo, anio) {
  return c.presentados.some((p) => p.modelo === idModelo
    && p.periodo === periodo
    && (p.anio === null || p.anio === anio));
}

// Todos los vencimientos del EJERCICIO `anio`, aunque su fecha caiga en el año siguiente:
// el 4T y el 390 de 2026 vencen en enero de 2027, y la Renta de 2026 en junio de 2027. Es la
// misma lectura que la tabla §3.2 del informe.
//
// El modelo 036 (alta en el ROI) no aparece aquí a propósito: no tiene fecha anual, su plazo
// es "antes de la primera operación intracomunitaria". Sale en vencimientosAbiertos(), que
// sí sabe por ctx si está dado de alta o no.
export function calendarioDelAnio(anio, hoyISO) {
  const a = Math.trunc(num(anio, 0));
  const hoy = esFecha(hoyISO) ? String(hoyISO) : '';
  if (!(a >= 1900 && a <= 9999)) return [];

  const lista = [];

  TRIMESTRES.forEach((info) => {
    const v = vencimientoTrimestral(a, info.trimestre);
    TRIMESTRALES.forEach((idModelo) => {
      lista.push(construirVencimiento({
        idModelo,
        anio: a,
        periodo: periodoTrimestre(info.trimestre),
        trimestre: info.trimestre,
        ...v,
        hoy,
      }));
    });
  });

  // 390: resumen anual de IVA, del 1 al 30 de enero del año siguiente (§3.1 y §3.2).
  lista.push(construirVencimiento({
    idModelo: '390',
    anio: a,
    periodo: 'anual',
    trimestre: null,
    desde: iso(a, 1, 1),
    hasta: iso(a, 12, 31),
    fechaApertura: iso(a + 1, 1, 1),
    fechaLimite: iso(a + 1, 1, 30),
    fechaDomiciliacion: null,
    anioVenc: a + 1,
    hoy,
  }));

  // Renta: "abril a junio del año siguiente" (§3.1 y §3.2). El informe no da el día exacto de
  // cierre, así que se toma el último de junio y se marca como NO confirmado, con su pregunta.
  lista.push(construirVencimiento({
    idModelo: '100',
    anio: a,
    periodo: 'anual',
    trimestre: null,
    desde: iso(a, 1, 1),
    hasta: iso(a, 12, 31),
    fechaApertura: iso(a + 1, 4, 1),
    fechaLimite: iso(a + 1, 6, 30),
    fechaDomiciliacion: null,
    anioVenc: a + 1,
    diaExactoNoConfirmado: true,
    hoy,
  }));

  return ordenar(lista);
}

function ordenar(lista) {
  const peso = (v) => {
    const i = MODELOS.findIndex((m) => m.id === v.modelo);
    return i < 0 ? MODELOS.length : i;
  };
  return lista
    .map((v, i) => ({ v, i }))
    .sort((x, y) => {
      const fx = x.v.fechaLimite || '9999-12-31';
      const fy = y.v.fechaLimite || '9999-12-31';
      if (fx !== fy) return fx < fy ? -1 : 1;
      const px = peso(x.v);
      const py = peso(y.v);
      if (px !== py) return px - py;
      return x.i - y.i;
    })
    .map((x) => x.v);
}

function construirVencimiento(x) {
  const m = modeloPorId(x.idModelo);
  const presentado = false;
  const estado = estadoDe(x.fechaApertura, x.fechaLimite, x.hoy, presentado);
  const dias = estado === 'vencido' ? Math.max(0, diasEntre(x.fechaLimite, x.hoy) ?? 0) : (x.hoy ? 0 : null);

  const avisos = [];
  // Los plazos del informe están verificados para 2026. Para 2027 el propio informe dice que
  // el calendario oficial de la AEAT no está publicado (apartado 8, punto 31).
  const anioVenc = x.anioVenc;
  let confirmado = anioVenc <= ANIO_CALENDARIO_CONFIRMADO;
  if (!confirmado) {
    avisos.push(`El calendario oficial de la AEAT para ${anioVenc} no está publicado. Esta fecha `
      + 'sale de la regla general, no del calendario, así que confírmala antes de fiarte.');
  }
  if (x.fechaLimite === '2027-01-30') {
    avisos.push('El 30 de enero de 2027 cae en sábado. En principio se trasladaría al lunes '
      + '1 de febrero, pero eso no está confirmado: no lo des por bueno hasta que salga el '
      + 'calendario oficial. Pregunta: ' + PREGUNTAS.calendario2027);
  }
  if (x.diaExactoNoConfirmado) {
    confirmado = false;
    avisos.push('El informe dice "abril a junio del año siguiente" y no da el día exacto de '
      + 'cierre de la campaña. Aquí se toma el 30 de junio como referencia: verifícalo.');
  }
  if (x.trimestre && x.trimestre < 4) {
    avisos.push(`Si quieres domiciliar el pago en el banco, el plazo acaba el ${x.fechaDomiciliacion}, `
      + 'no el día 20.');
  }
  if (x.trimestre === 4) {
    avisos.push('Del 4T el informe no da fecha de domiciliación bancaria. Si piensas domiciliar, '
      + 'pregúntala antes de apurar.');
  }

  return {
    modelo: x.idModelo,
    nombre: m ? m.nombre : x.idModelo,
    periodo: x.periodo,
    trimestre: x.trimestre ?? null,
    anio: x.anio,
    desde: x.desde,
    hasta: x.hasta,
    fechaApertura: x.fechaApertura,
    fechaLimite: x.fechaLimite,
    fechaDomiciliacion: x.fechaDomiciliacion,
    confirmado,
    estado,
    diasDeRetraso: dias,
    recargoPct: 0,
    recargoEur: 0,
    importeEstimado: null,
    queHacer: queHacerGenerico(x.idModelo, x.periodo, x.anio),
    avisos,
  };
}

function queHacerGenerico(idModelo, periodo, anio) {
  const etiqueta = periodo === 'anual' ? `de ${anio}` : `del ${periodo} de ${anio}`;
  if (idModelo === '130') {
    return `Presenta el modelo 130 ${etiqueta} en la Sede de la AEAT. Es el 20 % del rendimiento `
      + 'neto acumulado desde el 1 de enero, menos lo ya ingresado en trimestres anteriores.';
  }
  if (idModelo === '303') {
    return `Presenta el modelo 303 ${etiqueta}. Tus facturas a la GmbH van en la CASILLA 59 `
      + '(informativa) y no en la 120. Y dedúcete el IVA de tus gastos: te saldrá a compensar.';
  }
  if (idModelo === '349') {
    return `Presenta el modelo 349 ${etiqueta} con CLAVE S, la base imponible del trimestre y el `
      + 'NIF-IVA alemán de la GmbH. No hay importe mínimo: con una factura ya hay obligación.';
  }
  if (idModelo === '390') {
    return `Presenta el modelo 390 de ${anio}. La casilla 103 tiene que ser igual a la suma de las `
      + 'cuatro casillas 59 de tus 303 y a la suma de tus cuatro 349. Hacienda lo cruza solo.';
  }
  if (idModelo === '100') {
    return `Presenta la declaración de la Renta de ${anio}. Aquí se resta todo lo que hayas pagado `
      + 'en los modelos 130 del año.';
  }
  return `Presenta el modelo ${idModelo} ${etiqueta}.`;
}

// ---------------------------------------------------------------------------
// El modelo 130
// ---------------------------------------------------------------------------

// El 20 % del RENDIMIENTO NETO ACUMULADO del año hasta el último día del trimestre, menos lo
// ya ingresado en los trimestres anteriores. Art. 110.1.a) RIRPF.
//
// Rendimiento neto = lo facturado menos los gastos deducibles. Los gastos deducibles que la
// app conoce con certeza son la cuota de autónomo y la asesoría: se prorratean por los meses
// transcurridos del año. NO se aplica aquí el 5 % de gastos de difícil justificación del
// art. 30 RIRPF: el informe lo trata para la Renta y no confirma si entra en el pago
// fraccionado, así que va como aviso con la pregunta exacta, no como cifra inventada.
//
// Los trimestres YA CERRADOS a día de hoy se calculan con los datos reales. Los que aún no
// han cerrado se proyectan al ritmo del año (el mismo de rentaFiscalDelAnio) y salen
// marcados con `proyectado: true`: decir que el 4T son 0 € porque todavía no ha facturado
// nada de octubre es justo el tipo de mentira que produce el susto de diciembre.
export function importeModelo130(ctx, trimestre) {
  const c = contextoFiscal(ctx, ctx && ctx.hoyISO);
  return calculo130(c, trimestre, c.anio);
}

function vacio130(trimestre, avisos) {
  return {
    trimestre: numeroTrimestre(trimestre),
    anio: null,
    periodo: null,
    desde: null,
    hasta: null,
    porcentaje: PORCENTAJE_130,
    ingresosAcumulados: 0,
    gastosDeduciblesAcumulados: 0,
    rendimientoNetoAcumulado: 0,
    cuotaAcumulada: 0,
    ingresadoEnTrimestresAnteriores: 0,
    aIngresar: 0,
    aCompensar: 0,
    enVentas: null,
    proyectado: false,
    fuenteIngresos: 'retiros',
    fuenteIngresado: 'estimado',
    avisos,
  };
}

// Normaliza 1..4, '1T'..'4T', '1'..'4'. Cualquier otra cosa -> null.
function numeroTrimestre(t) {
  const s = String(t ?? '').trim().toUpperCase();
  const m = /^([1-4])T?$/.exec(s);
  return m ? Number(m[1]) : null;
}

// Cuota acumulada del 130 hasta el fin del trimestre T, sin restar nada. Es la pieza que se
// reutiliza para saber cuánto se dedujo en los trimestres anteriores.
function cuota130Acumulada(c, t, anio) {
  const info = TRIMESTRES[t - 1];
  const desde = iso(anio, 1, 1);
  const finTrimestre = iso(anio, info.mesFin, ultimoDiaDelMes(anio, info.mesFin));
  const mesesAcumulados = info.mesFin;

  // Un trimestre de un ejercicio anterior siempre está cerrado, y uno de este año lo está
  // cuando hoy ya ha pasado su último día. Solo se proyecta lo que de verdad sigue abierto.
  const cerrado = Boolean(c.hoy) && (anio !== c.anio || c.hoy >= finTrimestre);
  let ingresos;
  if (cerrado || !c.renta || anio !== c.anio) {
    ingresos = facturadoEntre(c, desde, finTrimestre);
  } else {
    // Ritmo del año: lo facturado hasta hoy dividido entre los meses transcurridos (con la
    // fracción del mes en curso), llevado al final del trimestre.
    const ritmoMensual = num(c.renta.retiradoProyectado, 0) / 12;
    ingresos = ritmoMensual * mesesAcumulados;
  }

  const gastos = c.gastoDeducibleMes * mesesAcumulados;
  const rendimiento = ingresos - gastos;
  const cuota = Math.max(0, rendimiento) * (PORCENTAJE_130 / 100);

  return {
    desde,
    hasta: finTrimestre,
    mesesAcumulados,
    cerrado,
    ingresos: eur(ingresos),
    gastos: eur(gastos),
    rendimiento: eur(rendimiento),
    cuota: eur(cuota),
  };
}

function calculo130(c, trimestre, anioPedido) {
  const t = numeroTrimestre(trimestre);
  if (t === null) {
    return vacio130(trimestre, ['Trimestre no válido: se espera 1, 2, 3 o 4 (o "1T".."4T").']);
  }
  const anio = Number.isFinite(Number(anioPedido)) ? Math.trunc(Number(anioPedido)) : c.anio;
  if (anio === null) {
    return vacio130(t, ['Sin fecha de hoy ni año no se puede calcular el 130: pásale `hoyISO` o `anio`.']);
  }

  const acumulado = cuota130Acumulada(c, t, anio);

  // Lo ya ingresado en trimestres anteriores (art. 110.1.a) RIRPF). Se mira TRIMESTRE A
  // TRIMESTRE, no eligiendo una fuente global para todos: de cada trimestre anterior manda su
  // apunte si consta con importe, y si no consta se estima lo que TOCABA ingresar ese
  // trimestre (el incremento sobre lo acumulado hasta el anterior; el 130 nunca devuelve:
  // cuando la cuota baja, el exceso se arrastra, no se reintegra).
  //
  // POR QUÉ PER-TRIMESTRE Y NO UNA RAMA U OTRA: antes bastaba UN solo 130 apuntado con importe
  // para que la rama estimada no se ejecutara nunca, y los trimestres anteriores sin apuntar
  // desaparecían de la resta. Su importe se cobraba entonces DOS veces (una en su propio
  // trimestre y otra en el siguiente), inflaba la suma de los cuatro 130 por encima de la
  // cuota acumulada del 4T e inventaba una devolución en la Renta que no existe. Apuntar el
  // 1T a cero -que es lo que la propia app le pide hacer- duplicaba TODOS los siguientes.
  let ingresadoAnterior = 0;
  let nApuntados = 0;
  for (let k = 1; k < t; k += 1) {
    const apunte = c.presentados.find((p) => p.modelo === '130'
      && (p.anio === null || p.anio === anio)
      && p.importe !== null
      && numeroTrimestre(p.periodo) === k);
    if (apunte) {
      ingresadoAnterior += Math.max(0, apunte.importe);
      nApuntados += 1;
    } else {
      ingresadoAnterior = Math.max(ingresadoAnterior, cuota130Acumulada(c, k, anio).cuota);
    }
  }
  ingresadoAnterior = eur(ingresadoAnterior);
  // 'presentados' solo si constan TODOS los anteriores; 'mixto' si parte de la resta sigue
  // siendo estimación. El mismo vocabulario que ya usa renta.js para sus pagos a cuenta.
  const anteriores = Math.max(0, t - 1);
  let fuenteIngresado = 'estimado';
  if (anteriores > 0 && nApuntados === anteriores) fuenteIngresado = 'presentados';
  else if (nApuntados > 0) fuenteIngresado = 'mixto';

  const bruto = eur(acumulado.cuota - ingresadoAnterior);
  const aIngresar = Math.max(0, bruto);
  const aCompensar = Math.max(0, -bruto);

  const avisos = [];
  if (!acumulado.cerrado) {
    avisos.push(`El ${t}T todavía no ha cerrado: esta cifra es una PROYECCIÓN al ritmo de lo que `
      + 'llevas facturado este año, no un dato cerrado. Se ajusta sola según vas facturando.');
  }
  if (fuenteIngresos(c) === 'retiros') {
    avisos.push('Los ingresos salen de tus retiros (tu parte del reparto), no de facturas '
      + 'apuntadas. Si tus facturas a la GmbH no coinciden con eso, apúntalas y mandan ellas.');
  }
  if (acumulado.rendimiento <= 0) {
    avisos.push('El rendimiento neto acumulado sale a cero o en negativo, así que este trimestre '
      + 'no hay nada que ingresar. Presentarlo igual: un 130 a cero se presenta.');
  }
  avisos.push('No se ha aplicado el 5 % de gastos de difícil justificación (art. 30 RIRPF). El '
    + 'informe no confirma si entra en el pago fraccionado o solo en la Renta. Pregunta: '
    + PREGUNTAS.dificilJustificacion);
  if (fuenteIngresado === 'estimado' && t > 1) {
    avisos.push('Lo restado de trimestres anteriores es lo que TOCABA ingresar, no lo que consta '
      + 'ingresado. Si no presentaste alguno, solo puedes restar lo que de verdad pagaste.');
  }
  if (fuenteIngresado === 'mixto') {
    avisos.push('De los trimestres anteriores solo consta el importe de algunos: el resto se ha '
      + 'restado por lo que TOCABA ingresar, no por lo que consta ingresado. Apunta el importe de '
      + 'los que faltan y esta cifra deja de ser una estimación.');
  }

  return {
    trimestre: t,
    anio,
    periodo: periodoTrimestre(t),
    desde: acumulado.desde,
    hasta: acumulado.hasta,
    porcentaje: PORCENTAJE_130,
    ingresosAcumulados: acumulado.ingresos,
    gastosDeduciblesAcumulados: acumulado.gastos,
    rendimientoNetoAcumulado: acumulado.rendimiento,
    cuotaAcumulada: acumulado.cuota,
    ingresadoEnTrimestresAnteriores: ingresadoAnterior,
    aIngresar: eur(aIngresar),
    aCompensar: eur(aCompensar),
    enVentas: enVentas(c, aIngresar),
    proyectado: !acumulado.cerrado,
    fuenteIngresos: fuenteIngresos(c),
    fuenteIngresado,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// Los recargos del art. 27 LGT
// ---------------------------------------------------------------------------

// Devuelve lo que cuesta presentar tarde, y lo que costaría esperar otro mes.
//
// `opciones`:
//   · mesesCompletos : los meses completos ya contados de fecha a fecha. Es el camino exacto
//                      y es el que usa el calendario. Sin él se estiman desde los días a 30
//                      días por mes, que puede bailar un día en los cambios de mes.
//   · voluntario     : false si YA ha llegado un requerimiento de Hacienda. Entonces el
//                      art. 27 no aplica: se acabó el recargo y entra el art. 191 LGT.
export function recargoPorRetraso(diasDeRetraso, importe, opciones) {
  const o = opciones || {};
  const dias = Math.trunc(num(diasDeRetraso, 0));
  const imp = num(importe, 0);
  const voluntario = o.voluntario === false ? false : true;
  const meses = Number.isFinite(Number(o.mesesCompletos))
    ? Math.max(0, Math.trunc(Number(o.mesesCompletos)))
    : mesesDesdeDias(dias);

  const base = {
    diasDeRetraso: Math.max(0, dias),
    mesesCompletos: 0,
    importe: eur(Math.max(0, imp)),
    pct: 0,
    eur: 0,
    pctConReduccion: 0,
    eurConReduccion: 0,
    interesesDemora: null,
    sancion: null,
    sancionVoluntaria: null,
    tramo: 'en-plazo',
    explicacion: '',
    queHacer: '',
    fuente: 'docs/situacion-real-cliente-aleman.md §2.4 (art. 27 LGT tras la Ley 11/2021)',
  };

  // En plazo solo si NO hay retraso por ninguno de los dos caminos. Si el que llama pasa los
  // meses ya contados (que es el camino exacto), mandan ellos aunque los días vengan a cero.
  if (dias <= 0 && meses <= 0) {
    return {
      ...base,
      explicacion: 'Estás en plazo: no hay recargo. El art. 27 LGT solo entra cuando se presenta '
        + 'después de la fecha límite.',
      queHacer: 'Preséntalo antes de que venza y no pasa nada.',
    };
  }

  if (!voluntario) {
    return {
      ...base,
      mesesCompletos: meses,
      tramo: 'con-requerimiento',
      pct: null,
      eur: null,
      pctConReduccion: null,
      eurConReduccion: null,
      explicacion: 'Si Hacienda ya te ha requerido, el art. 27 LGT no aplica: no hay recargo, hay '
        + 'sanción del art. 191 LGT, que es mucho peor. El informe no da el porcentaje de esa '
        + 'sanción, así que aquí no se inventa.',
      queHacer: 'Llévale el requerimiento a tu asesoría hoy mismo y pide que te cuantifiquen la '
        + 'sanción del art. 191 LGT antes de contestar. No presentes nada por tu cuenta sin eso.',
    };
  }

  // Un recargo se calcula sobre lo que hay que INGRESAR. Si el trimestre sale a cero o
  // negativo no hay recargo posible: solo cabe la sanción del art. 198 LGT, y la mitad si lo
  // presentas tú antes de que te requieran (art. 198.2).
  if (!(imp > 0)) {
    return {
      ...base,
      mesesCompletos: meses,
      tramo: 'sin-ingreso',
      sancion: SANCIONES.sinIngreso,
      sancionVoluntaria: SANCIONES.sinIngresoVoluntaria,
      explicacion: `Este modelo no sale a ingresar, así que no hay recargo: el recargo se calcula `
        + `sobre lo que hay que pagar. Lo único que cabe es la sanción del art. 198 LGT: `
        + `${formatoEuros(SANCIONES.sinIngreso)}, o ${formatoEuros(SANCIONES.sinIngresoVoluntaria)} `
        + 'si lo presentas tú antes de que te requieran (art. 198.2 LGT).',
      queHacer: 'Preséntalo igualmente y cuanto antes: presentarlo tú vale la mitad que esperar al '
        + 'requerimiento, y mientras no esté presentado el reloj de la sanción sigue abierto.',
    };
  }

  const conReduccion = (pct) => Math.round(pct * (1 - RECARGO_ART27.reduccion / 100) * 10000) / 10000;

  if (meses >= RECARGO_ART27.mesesMaximo) {
    const pct = RECARGO_ART27.masDeDoceMeses;
    const pctRed = conReduccion(pct);
    return {
      ...base,
      mesesCompletos: meses,
      tramo: 'mas-de-12-meses',
      pct,
      eur: eur(imp * pct / 100),
      pctConReduccion: pctRed,
      eurConReduccion: eur(imp * pctRed / 100),
      // El tipo de interés de demora de 2026 es una laguna declarada del informe (apartado 8,
      // punto 26). Va null y con su pregunta, no con un número inventado.
      interesesDemora: null,
      explicacion: `Llevas ${meses} meses completos de retraso: más de 12. El recargo salta al `
        + `${RECARGO_ART27.masDeDoceMeses} % (${formatoEuros(eur(imp * pct / 100))}), `
        + `${pctRed} % con la reducción del art. 27.5 LGT, y ADEMÁS corren intereses de demora, `
        + 'que aquí no se cuantifican porque el tipo de 2026 no está verificado.',
      queHacer: 'Preséntalo ya y pide el importe exacto de los intereses. Pregunta: '
        + PREGUNTAS.interesesDemora,
    };
  }

  const pct = Math.min(
    RECARGO_ART27.base + RECARGO_ART27.porMesCompleto * meses,
    RECARGO_ART27.base + RECARGO_ART27.porMesCompleto * (RECARGO_ART27.mesesMaximo - 1),
  );
  const pctRed = conReduccion(pct);
  const importeRecargo = eur(imp * pct / 100);
  const importeRecargoRed = eur(imp * pctRed / 100);

  return {
    ...base,
    mesesCompletos: meses,
    tramo: 'hasta-12-meses',
    pct,
    eur: importeRecargo,
    pctConReduccion: pctRed,
    eurConReduccion: importeRecargoRed,
    explicacion: meses === 0
      ? `Menos de un mes completo de retraso: el recargo es el ${RECARGO_ART27.base} % fijo, `
        + `${formatoEuros(importeRecargo)}. Con la reducción del 25 % del art. 27.5 LGT se queda `
        + `en ${pctRed} %, ${formatoEuros(importeRecargoRed)}.`
      : `${meses} ${meses === 1 ? 'mes completo' : 'meses completos'} de retraso: `
        + `${RECARGO_ART27.base} % fijo más ${RECARGO_ART27.porMesCompleto} % por cada mes, o sea `
        + `${pct} % (${formatoEuros(importeRecargo)}). Con la reducción del 25 % del art. 27.5 LGT, `
        + `${pctRed} % (${formatoEuros(importeRecargoRed)}).`,
    queHacer: 'Preséntalo y paga el total de una vez para quedarte con la reducción del 25 %. Y '
      + 'hazlo antes de que se cumpla otro mes completo: cada mes suma un punto más.',
  };
}

// ---------------------------------------------------------------------------
// Los vencimientos que le tocan a ÉL, con importes
// ---------------------------------------------------------------------------

// Todos los vencimientos abiertos (no presentados) de los ejercicios que le afectan, con el
// importe estimado de cada uno, el recargo que ya corre y qué hacer con cada uno.
// Ordenados por fecha límite: los vencidos van primero porque su fecha es la más antigua.
//
// `opciones.incluirPresentados` los devuelve todos, marcando con estado 'presentado' los que
// constan presentados. Es para una pantalla que quiera enseñar el año entero con sus vistos;
// por defecto quedan fuera, porque una lista de tareas no lista lo que ya está hecho.
export function vencimientosAbiertos(ctx, hoyISO, opciones) {
  const c = contextoFiscal(ctx, hoyISO);
  const incluirPresentados = Boolean(opciones && opciones.incluirPresentados);
  if (c.anio === null) return [];

  // El ejercicio en curso y el anterior: el 4T, el 390 y la Renta del año pasado vencen
  // dentro de este. Nunca antes del primer ejercicio con obligaciones.
  const anios = [];
  for (let a = c.anio - 1; a <= c.anio; a += 1) {
    if (c.desdeAnio === null || a >= c.desdeAnio) anios.push(a);
  }

  const lista = [];

  anios.forEach((a) => {
    calendarioDelAnio(a, c.hoy).forEach((v) => {
      const m = modeloPorId(v.modelo);
      if (!m || !m.obligatorio) return;
      const presentado = estaPresentado(c, v.modelo, v.periodo, a);
      if (presentado && !incluirPresentados) return;
      const conDatos = conImporte(c, v);
      if (presentado) {
        // Ya está hecho: ni estado de retraso, ni recargo, ni "qué hacer".
        conDatos.estado = 'presentado';
        conDatos.diasDeRetraso = 0;
        conDatos.recargo = null;
        conDatos.recargoPct = 0;
        conDatos.recargoEur = 0;
        conDatos.siguienteSaltoDeRecargo = null;
        conDatos.recargoPctTrasElSalto = null;
        conDatos.queHacer = 'Ya lo tienes presentado. Nada que hacer.';
      }
      lista.push(conDatos);
    });
  });

  // El 036 no tiene fecha: su plazo es "antes de la primera operación intracomunitaria", así
  // que si ya factura y no está en el ROI, va tarde por definición. Solo aparece si no consta
  // que esté dado de alta.
  const roi = tramiteRoi(c);
  if (roi) lista.unshift(roi);

  const dated = ordenar(lista.filter((v) => v.fechaLimite));
  const undated = lista.filter((v) => !v.fechaLimite);
  return [...undated, ...dated];
}

function tramiteRoi(c) {
  if (c.roi === true) return null;
  const desconocido = c.roi === null;
  const avisos = [];
  if (desconocido) {
    avisos.push('No sabemos si estás dado de alta en el ROI. Compruébalo tú: entra en '
      + 'https://ec.europa.eu/taxation_customs/vies/, elige España, escribe tu NIF y pulsa '
      + 'verificar. Tarda 30 segundos. Si sale "válido", estás; si sale "no válido", no.');
  }
  avisos.push(`Si no estás, la sanción censal es de ${formatoEuros(SANCIONES.censal)} (art. 198.1 LGT), `
    + `o ${formatoEuros(SANCIONES.censalVoluntaria)} si lo presentas tú antes de que te requieran `
    + '(art. 198.2 LGT).');
  avisos.push('Hacienda tiene TRES MESES para resolver y el silencio es negativo. Con un único '
    + 'cliente que es la empresa de tu socio, es un perfil que revisan: ten preparado el contrato '
    + 'con la GmbH y las facturas antes de presentarlo.');

  return {
    modelo: '036',
    nombre: 'Modelo 036 — alta en el ROI',
    periodo: 'puntual',
    trimestre: null,
    anio: c.anio,
    desde: null,
    hasta: null,
    fechaApertura: null,
    // No hay fecha de calendario: el plazo es "antes de la primera operación".
    fechaLimite: null,
    fechaDomiciliacion: null,
    confirmado: true,
    estado: desconocido ? 'pendiente' : 'vencido',
    diasDeRetraso: null,
    recargoPct: 0,
    recargoEur: 0,
    importeEstimado: 0,
    baseImponible: null,
    sancion: SANCIONES.censal,
    sancionVoluntaria: SANCIONES.censalVoluntaria,
    recargo: null,
    enVentas: null,
    queHacer: desconocido
      ? 'Míralo hoy en https://ec.europa.eu/taxation_customs/vies/ (España + tu NIF, 30 segundos). '
        + 'Si sale "no válido", presenta el modelo 036 marcando la casilla 130 (inscripción en el '
        + 'ROI), la 582 (alta) y la 584 (fecha prevista de la primera operación).'
      : 'Presenta el modelo 036 marcando la casilla 130 (inscripción en el ROI), la 582 (alta) y '
        + 'la 584 (fecha prevista de la primera operación). Y NO presentes los 349 pendientes '
        + 'hasta tener el ROI concedido: los necesitas con NIF-IVA.',
    pregunta: PREGUNTAS.roi,
    avisos,
  };
}

function conImporte(c, v) {
  const out = { ...v };
  const vencido = v.estado === 'vencido';
  const dias = num(v.diasDeRetraso, 0);
  const meses = vencido ? mesesCompletosEntre(v.fechaLimite, c.hoy) : 0;

  out.baseImponible = null;
  out.sancion = null;
  out.sancionVoluntaria = null;
  out.sancionMax = null;
  out.sancionMaxVoluntaria = null;
  out.pregunta = null;
  out.devolucionEsperada = null;
  out.detalle130 = null;
  out.avisos = [...(v.avisos || [])];

  if (v.modelo === '130') {
    const r = calculo130(c, v.trimestre, v.anio);
    out.importeEstimado = r.aIngresar;
    out.detalle130 = r;
    out.avisos.push(...r.avisos);
    // Un 130 que sale a cero se presenta igual. Ahí no cabe recargo (no hay nada que
    // ingresar): lo que cabe es la sanción del art. 198 LGT, y la mitad si lo presenta él.
    if (!(r.aIngresar > 0)) {
      out.sancion = SANCIONES.sinIngreso;
      out.sancionVoluntaria = SANCIONES.sinIngresoVoluntaria;
    }
    if (r.proyectado) {
      out.queHacer = `${v.queHacer} Con lo que llevas facturado, la previsión es `
        + `${formatoEuros(r.aIngresar)}; se ajustará según factures.`;
    } else {
      out.queHacer = `${v.queHacer} Con tus datos cerrados: ${formatoEuros(r.aIngresar)}.`;
    }
  } else if (v.modelo === '303') {
    // No repercute IVA: el 303 no sale a ingresar. Sale a compensar o a devolver, y cuánto
    // depende del IVA soportado de sus gastos, que la app no tiene.
    out.importeEstimado = 0;
    out.baseImponible = eur(facturadoEntre(c, v.desde, v.hasta));
    out.sancion = SANCIONES.sinIngreso;
    out.sancionVoluntaria = SANCIONES.sinIngresoVoluntaria;
    out.avisos.push('Tu 303 no sale a ingresar: no repercutes IVA. Sale a compensar o a devolver, '
      + 'y el importe depende del IVA de tus gastos, que la app no conoce. Apúntalo o pídeselo a '
      + 'tu asesoría.');
  } else if (v.modelo === '349') {
    out.importeEstimado = 0;
    out.baseImponible = eur(facturadoEntre(c, v.desde, v.hasta));
    out.sancion = SANCIONES.informativa349Min;
    out.sancionVoluntaria = SANCIONES.informativa349MinVoluntaria;
    out.sancionMax = SANCIONES.informativa349Max;
    out.sancionMaxVoluntaria = SANCIONES.informativa349MaxVoluntaria;
    out.pregunta = PREGUNTAS.sancion349;
    out.avisos.push(`Base imponible del trimestre a declarar (clave S): `
      + `${formatoEuros(eur(facturadoEntre(c, v.desde, v.hasta)))}. Sin importe mínimo: con una `
      + 'factura ya hay obligación.');
    out.avisos.push('La sanción por no presentarlo está entre '
      + `${formatoEuros(SANCIONES.informativa349Min)} y ${formatoEuros(SANCIONES.informativa349Max)} `
      + `(la mitad, ${formatoEuros(SANCIONES.informativa349MinVoluntaria)}–`
      + `${formatoEuros(SANCIONES.informativa349MaxVoluntaria)}, si lo presentas tú antes de que te `
      + 'requieran). El informe deja abierto cuál de las dos lecturas aplica.');
  } else if (v.modelo === '390') {
    out.importeEstimado = 0;
    out.baseImponible = eur(facturadoEntre(c, v.desde, v.hasta));
    out.sancion = SANCIONES.sinIngreso;
    out.sancionVoluntaria = SANCIONES.sinIngresoVoluntaria;
    out.avisos.push('La casilla 103 tiene que valer '
      + `${formatoEuros(eur(facturadoEntre(c, v.desde, v.hasta)))}, y coincidir con la suma de las `
      + 'cuatro casillas 59 de tus 303 y con la suma de tus cuatro 349.');
  } else if (v.modelo === '100') {
    const cuenta = liquidacionDelAnio(c, v.anio);
    out.importeEstimado = cuenta.conocido ? cuenta.aPagar : null;
    out.devolucionEsperada = cuenta.conocido ? cuenta.devolucion : null;
    if (!cuenta.conocido) {
      out.avisos.push(`La Renta de ${v.anio} no se puede estimar desde aquí: la app solo tiene la `
        + 'foto fiscal del ejercicio en curso. Pídele a tu asesoría el borrador.');
      out.queHacer = `${v.queHacer} No tengo cifras de ${v.anio} para estimarla: pídele el borrador `
        + 'a tu asesoría antes de que se cierre la campaña.';
    } else if (cuenta.devolucion > 0) {
      out.queHacer = `${v.queHacer} Con las cifras de hoy no te toca pagar: te devolverían unos `
        + `${formatoEuros(cuenta.devolucion)}, porque los 130 del año suman más que tu IRPF real.`;
    } else {
      out.queHacer = `${v.queHacer} Con las cifras de hoy saldría a pagar unos `
        + `${formatoEuros(cuenta.aPagar)}. Ténlo apartado antes de junio.`;
    }
  } else {
    out.importeEstimado = 0;
  }

  const imp = num(out.importeEstimado, 0);
  out.enVentas = out.importeEstimado === null ? null : enVentas(c, imp);

  if (vencido) {
    const r = recargoPorRetraso(dias, imp, { mesesCompletos: meses });
    out.recargo = r;
    out.recargoPct = num(r.pct, 0);
    out.recargoEur = num(r.eur, 0);
    const salto = fechaMasMeses(v.fechaLimite, meses + 1);
    out.siguienteSaltoDeRecargo = salto;
    out.recargoPctTrasElSalto = meses + 1 >= RECARGO_ART27.mesesMaximo
      ? RECARGO_ART27.masDeDoceMeses
      : RECARGO_ART27.base + RECARGO_ART27.porMesCompleto * (meses + 1);
    out.queHacer = `${out.queHacer} ${r.queHacer}`
      + (imp > 0 ? ` Si lo presentas antes del ${salto} no entras en el siguiente mes.` : '');
  } else {
    out.recargo = null;
    out.recargoPct = 0;
    out.recargoEur = 0;
    out.siguienteSaltoDeRecargo = null;
    out.recargoPctTrasElSalto = null;
  }

  return out;
}

// La cuenta del año: lo que suman los cuatro 130 contra el IRPF real proyectado.
// Solo se sabe del ejercicio EN CURSO, que es del único del que la app tiene foto fiscal.
// De un año cerrado devuelve `conocido: false` en vez de un cero que parecería un dato.
function liquidacionDelAnio(c, anio) {
  const mismoAnio = anio === c.anio && Boolean(c.renta);
  if (!mismoAnio) {
    return { conocido: false, irpfAnual: 0, pagosFraccionados: 0, aPagar: 0, devolucion: 0, detalle: [] };
  }
  const irpfAnual = Math.max(0, eur(c.renta.irpfReal));
  let pagos = 0;
  const detalle = [];
  for (let t = 1; t <= 4; t += 1) {
    const r = calculo130(c, t, anio);
    pagos += r.aIngresar;
    detalle.push(r);
  }
  pagos = eur(pagos);
  return {
    conocido: true,
    irpfAnual,
    pagosFraccionados: pagos,
    aPagar: Math.max(0, eur(irpfAnual - pagos)),
    devolucion: Math.max(0, eur(pagos - irpfAnual)),
    detalle,
  };
}

// ---------------------------------------------------------------------------
// Cuánto tiene que tener guardado
// ---------------------------------------------------------------------------

// Todas las cifras que devuelve son >= 0 y finitas, siempre. Lo que en una cuenta corriente
// sería un signo, aquí son dos campos distintos (`aPagarEnRenta` y `devolucionEsperada`):
// un número negativo en una pantalla de impuestos se lee mal y se lee tarde.
export function cuantoApartar(ctx, hoyISO) {
  const c = contextoFiscal(ctx, hoyISO);

  const vacio = {
    irpfAnual: 0,
    yaDevengado: 0,
    yaIngresado: 0,
    pendiente: 0,
    porTrimestre: 0,
    mensualRecomendado: 0,
    pagosFraccionados: 0,
    vencidoSinIngresar: 0,
    recargoQueCorre: 0,
    guardarHoy: 0,
    guardarHoyEnVentas: null,
    aPagarEnRenta: 0,
    devolucionEsperada: 0,
    detallePorTrimestre: [],
    avisos: ['Sin fecha de hoy no se puede decir cuánto apartar: pásale `hoyISO`.'],
  };
  if (!c.hoy || c.anio === null) return vacio;

  const cuenta = liquidacionDelAnio(c, c.anio);
  const irpfAnual = cuenta.irpfAnual;
  const pagos = cuenta.pagosFraccionados;

  // Qué parte del año llevas devengada, con el mes en curso contado POR DÍAS. Con meses
  // enteros, cada día 1 el devengado pegaba un escalón hacia arriba sin que cambiara ni un
  // dato; es el mismo criterio que ya usan objetivo.js y decisiones.js.
  const transcurrido = c.renta ? Math.min(12, Math.max(0, num(c.renta.transcurrido, 0))) : 0;
  const fraccion = transcurrido / 12;
  const yaDevengado = Math.max(0, eur(irpfAnual * fraccion));

  const yaIngresado = Math.max(0, eur(c.presentados
    .filter((p) => p.modelo === '130' && (p.anio === null || p.anio === c.anio) && p.importe !== null)
    .reduce((acc, p) => acc + Math.max(0, p.importe), 0)));

  // Lo vencido y sin presentar, que es dinero que hace falta HOY, no en diciembre.
  let vencido = 0;
  let recargoQueCorre = 0;
  const detalle = [];
  let porVencer = 0;
  let nPorVencer = 0;
  let porVencerDevengado = 0;
  let primeroPorVencer = null;

  for (let t = 1; t <= 4; t += 1) {
    const r = cuenta.detalle[t - 1] || calculo130(c, t, c.anio);
    const v = vencimientoTrimestral(c.anio, t);
    const presentado = estaPresentado(c, '130', periodoTrimestre(t), c.anio);
    const estado = estadoDe(v.fechaApertura, v.fechaLimite, c.hoy, presentado);
    let recargo = 0;
    if (estado === 'vencido' && r.aIngresar > 0) {
      vencido += r.aIngresar;
      const meses = mesesCompletosEntre(v.fechaLimite, c.hoy);
      recargo = num(recargoPorRetraso(diasEntre(v.fechaLimite, c.hoy) ?? 0, r.aIngresar, { mesesCompletos: meses }).eur, 0);
      recargoQueCorre += recargo;
    }
    if (estado === 'pendiente' || estado === 'vence-pronto') {
      porVencer += r.aIngresar;
      nPorVencer += 1;
    }
    // Lo INMINENTE: el trimestre que ya ha cerrado (su cifra no se mueve) o que ya tiene el
    // plazo abierto, y que todavía no está presentado. Es caja que hace falta el día 20, no en
    // diciembre. NO entra aquí un trimestre que sigue abierto (el 3T y el 4T en junio): esos
    // van proyectados y reservarlos hoy sería sobre-reservar.
    if (!presentado && r.aIngresar > 0
      && (estado === 'vence-pronto' || (estado === 'pendiente' && c.hoy >= v.hasta))) {
      porVencerDevengado += r.aIngresar;
      if (!primeroPorVencer || v.fechaLimite < primeroPorVencer.fechaLimite) {
        primeroPorVencer = { trimestre: t, periodo: periodoTrimestre(t), fechaLimite: v.fechaLimite, importe: eur(r.aIngresar) };
      }
    }
    detalle.push({
      trimestre: t,
      periodo: periodoTrimestre(t),
      fechaLimite: v.fechaLimite,
      estado,
      importe: r.aIngresar,
      recargo: eur(recargo),
      proyectado: r.proyectado,
      enVentas: enVentas(c, r.aIngresar),
    });
  }

  vencido = eur(vencido);
  recargoQueCorre = eur(recargoQueCorre);

  const pendiente = Math.max(0, eur(pagos - yaIngresado));
  const porTrimestre = nPorVencer > 0 ? Math.max(0, eur(porVencer / nPorVencer)) : 0;

  const mesesTranscurridos = c.renta ? Math.min(12, Math.max(1, num(c.renta.mesesTranscurridos, 1))) : 1;
  const mesesQueQuedan = Math.max(1, 12 - mesesTranscurridos + 1);
  const mensualRecomendado = Math.max(0, eur(pendiente / mesesQueQuedan));

  // Lo que tiene que tener guardado HOY: lo mayor entre lo que ya ha devengado y no ha
  // ingresado, y la CAJA que le van a pedir a corto (lo ya vencido + su recargo + lo que
  // vence en el plazo que viene). Lo de Hacienda manda porque es dinero que hay que soltar ya,
  // aunque el devengo del año todavía vaya por menos.
  //
  // POR QUÉ ENTRA `porVencerDevengado`: el pago fraccionado del art. 110.1.a) RIRPF es el 20 %
  // del rendimiento, y en su caso es 4-7 veces su IRPF real progresivo (1.478,63 € contra
  // 358 €). Con solo el devengo prorrateado, la cifra NUNCA avisaba de un 130 a punto de
  // vencer: el 5 de julio pedía 66,16 € cuando en 15 días había que poner 644,56 €, y solo
  // reaccionaba el día 21, ya con recargo corriendo. Ahora el trimestre cerrado entra en la
  // cuenta desde que cierra, que es cuando su cifra deja de moverse.
  porVencerDevengado = eur(porVencerDevengado);
  const cajaDeHacienda = eur(vencido + recargoQueCorre + porVencerDevengado);
  const guardarHoy = Math.max(0, eur(Math.max(
    Math.max(0, yaDevengado - yaIngresado),
    cajaDeHacienda,
  )));

  const avisos = [];
  if (!c.presentados.length) {
    avisos.push('No consta ningún modelo presentado, así que se ha asumido que no has ingresado '
      + 'nada todavía. Si ya presentaste alguno, apúntalo y las cifras se ajustan.');
  }
  if (vencido > 0) {
    avisos.push(`Tienes ${formatoEuros(vencido)} de modelos 130 vencidos sin presentar, más `
      + `${formatoEuros(recargoQueCorre)} de recargo que ya corre.`);
  }
  if (primeroPorVencer) {
    avisos.push(`De lo que tienes que tener guardado, ${formatoEuros(porVencerDevengado)} vencen `
      + `el ${primeroPorVencer.fechaLimite} (el ${primeroPorVencer.periodo}). Ese trimestre ya ha `
      + 'cerrado, así que la cifra ya no se mueve: tenlo en la cuenta antes de esa fecha y te '
      + 'ahorras el recargo.');
  }
  if (cuenta.devolucion > 0) {
    avisos.push(`Los cuatro 130 del año suman ${formatoEuros(pagos)} y tu IRPF real proyectado son `
      + `${formatoEuros(irpfAnual)}: estás adelantando de más y en la Renta te devolverían unos `
      + `${formatoEuros(cuenta.devolucion)}. No es un error, es cómo funciona el 20 % fijo.`);
  }
  if (cuenta.aPagar > 0) {
    avisos.push(`Los 130 del año (${formatoEuros(pagos)}) NO cubren tu IRPF real proyectado `
      + `(${formatoEuros(irpfAnual)}): en junio te tocaría poner ${formatoEuros(cuenta.aPagar)} más. `
      + 'Apártalo desde ya.');
  }
  if (cuenta.detalle.some((r) => r.proyectado)) {
    avisos.push('Los trimestres que aún no han cerrado van proyectados al ritmo de este año: son '
      + 'una previsión, no un dato cerrado.');
  }

  return {
    irpfAnual,
    yaDevengado,
    yaIngresado,
    pendiente,
    porTrimestre,
    mensualRecomendado,
    pagosFraccionados: pagos,
    vencidoSinIngresar: vencido,
    recargoQueCorre,
    porVencerDevengado,
    porVencerDevengadoEnVentas: enVentas(c, porVencerDevengado),
    primeroPorVencer,
    guardarHoy,
    guardarHoyEnVentas: enVentas(c, guardarHoy),
    aPagarEnRenta: cuenta.aPagar,
    devolucionEsperada: cuenta.devolucion,
    detallePorTrimestre: detalle,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// LA reserva de impuestos: una sola cifra para toda la app
// ---------------------------------------------------------------------------

// El nombre de las reservas que provisionan la MISMA factura de Hacienda. Es la misma regla
// en las tres pantallas: si el dinero del "colchón del mes que viene" contara aquí, la app
// diría que está cubierto cuando no lo está.
export const RE_RESERVA_IMPUESTOS = /impuest|hacienda|irpf|renta|declaraci/i;

// Lo que hay etiquetado HOY para Hacienda en los objetivos del patrimonio.
export function reservaImpuestosEtiquetada(objetivos) {
  const lista = Array.isArray(objetivos) ? objetivos : [];
  const marcadas = lista.filter((o) => o
    && String(o.clase || '') === 'reserva'
    && RE_RESERVA_IMPUESTOS.test(String(o.nombre || '')));
  return {
    importe: Math.max(0, eur(marcadas.reduce((acc, o) => acc + num(o.asignado, 0), 0))),
    hay: marcadas.length > 0,
    nombres: marcadas.map((o) => String(o.nombre || '')),
  };
}

// LA respuesta a "¿cuánto tengo que tener apartado hoy para Hacienda?", una sola vez y para
// las tres pantallas que la enseñan: "Hacienda", "Y ahora qué" y "Mi patrimonio".
//
// POR QUÉ EXISTE: la misma pregunta salía con tres cifras distintas el mismo día, y las tres
// con el mismo verbo ("mete ahí ese dinero"). "Hacienda" daba el 130 vencido más su recargo,
// "Y ahora qué" -que es la pantalla que ABRE la app- daba solo la parte devengada de su IRPF
// real (la más baja de las tres, 443,88 € por debajo), y "Mi patrimonio" un 20 % plano de lo
// ya retirado. Obedecer a la pantalla de inicio dejaba el mínimo del día por cumplido con
// cientos de euros de menos mientras corría el recargo de un 130 vencido.
//
// Manda `cuantoApartar().guardarHoy` porque es la única de las tres que sabe de plazos: es
// caja que Hacienda pide en una FECHA, no una provisión que se pueda ir haciendo despacio.
// El IRPF real del año viaja al lado (`irpfAnual`) porque es el objetivo de fin de año, y son
// dos cosas distintas: el 130 es un ANTICIPO del 20 % y lo que sobra vuelve en la Renta.
export function reservaImpuestosHoy(ctx, hoyISO, objetivos) {
  const r = cuantoApartar(ctx, hoyISO);
  const reserva = reservaImpuestosEtiquetada(objetivos);
  const debeHaber = Math.max(0, num(r.guardarHoy, 0));
  const irpfAnual = Math.max(0, num(r.irpfAnual, 0));
  const c = contextoFiscal(ctx, hoyISO);

  const falta = Math.max(0, eur(debeHaber - reserva.importe));
  // El objetivo de fin de año es lo que de verdad se va a quedar Hacienda (el IRPF real),
  // nunca menos que lo que ya hay que tener hoy en caja.
  const objetivoAnual = Math.max(irpfAnual, debeHaber);

  return {
    // Lo que tiene que estar apartado HOY, pase lo que pase.
    debeHaber,
    debeHaberEnVentas: enVentas(c, debeHaber),
    // Lo que ya está etiquetado para esta misma factura.
    reserva,
    // El hueco de hoy: lo único que hay que mover ahora mismo.
    falta,
    faltaEnVentas: enVentas(c, falta),
    // La foto de fin de año, para no confundir el anticipo con la factura.
    irpfAnual,
    objetivoAnual,
    faltaAFinDeAnio: Math.max(0, eur(objetivoAnual - reserva.importe)),
    // De dónde sale la cifra de hoy, para poder decirlo en pantalla sin mentir.
    vencidoSinIngresar: r.vencidoSinIngresar,
    recargoQueCorre: r.recargoQueCorre,
    porVencerDevengado: r.porVencerDevengado,
    primeroPorVencer: r.primeroPorVencer,
    devolucionEsperada: r.devolucionEsperada,
  };
}

// ---------------------------------------------------------------------------
// Lo siguiente y las alertas
// ---------------------------------------------------------------------------

// El primero de la lista de abiertos CON FECHA: si hay algo vencido, ESO es lo siguiente que
// tiene que hacer, no el plazo de octubre. El trámite del ROI no compite aquí porque no tiene
// fecha de calendario; sale por su cuenta en alertasFiscales(). null si no queda ninguno.
export function proximoVencimiento(ctx, hoyISO) {
  const lista = vencimientosAbiertos(ctx, hoyISO);
  return lista.find((v) => v.fechaLimite) || null;
}

function alerta(x) {
  return {
    id: x.id,
    nivel: x.nivel,
    titulo: x.titulo,
    texto: x.texto,
    dato: x.dato === undefined || x.dato === null ? '' : String(x.dato),
    queHacer: x.queHacer || '',
    urgencia: x.urgencia || 'vigilar',
    modelo: x.modelo === undefined ? null : x.modelo,
    periodo: x.periodo === undefined ? null : x.periodo,
    fechaLimite: x.fechaLimite === undefined ? null : x.fechaLimite,
    importe: x.importe === undefined ? null : x.importe,
    recargo: x.recargo === undefined ? null : x.recargo,
    pregunta: x.pregunta === undefined ? null : x.pregunta,
  };
}

// Los vencidos primero, con el recargo que ya corre. Después el ROI, que es de 30 segundos y
// bloquea el resto. Después lo que está en plazo abierto. Y siempre, al final, cuánto tiene
// que tener guardado hoy: una lista que nunca dice el número grande no sirve de nada.
export function alertasFiscales(ctx, hoyISO) {
  const c = contextoFiscal(ctx, hoyISO);
  const out = [];

  if (!c.hoy) {
    return [alerta({
      id: 'sin-fecha',
      nivel: 'ambar',
      titulo: 'No sé qué día es hoy',
      texto: 'Sin la fecha de hoy no puedo decirte qué tienes vencido ni cuánto recargo corre.',
      dato: '—',
      queHacer: 'Pásale `hoyISO` al módulo (formato YYYY-MM-DD).',
      urgencia: 'ya',
    })];
  }

  const abiertos = vencimientosAbiertos(ctx, c.hoy);

  const vencidos = abiertos.filter((v) => v.estado === 'vencido' && v.modelo !== '036');
  vencidos.forEach((v) => {
    const imp = num(v.importeEstimado, 0);
    const conRecargo = eur(imp + num(v.recargoEur, 0));
    const ventas = v.enVentas;
    const cola = imp > 0 && Number.isFinite(ventas)
      ? ` Son ${ventasTexto(ventas)} ${ventas === 1 ? 'venta' : 'ventas'} tuyas.`
      : '';
    // La sanción del 349 no es un número, es una horquilla: el informe deja abierto si son
    // los 200 € fijos del art. 198.1 o el régimen de 20 €/dato con mínimo de 300 €. Se dicen
    // las dos y va la pregunta para cerrarlo, en vez de elegir una por él.
    const sancionTexto = v.sancionMax && v.sancionMax !== v.sancion
      ? `${formatoEuros(num(v.sancion, 0))}–${formatoEuros(num(v.sancionMax, 0))}, o `
        + `${formatoEuros(num(v.sancionVoluntaria, 0))}–${formatoEuros(num(v.sancionMaxVoluntaria, 0))} `
        + 'si lo presentas tú antes de que te requieran'
      : `${formatoEuros(num(v.sancion, 0))}, o ${formatoEuros(num(v.sancionVoluntaria, 0))} si lo `
        + 'presentas tú antes de que te requieran';
    out.push(alerta({
      id: `vencido-${v.modelo}-${v.periodo}-${v.anio}`,
      nivel: 'rojo',
      titulo: `${v.nombre}: ${v.periodo === 'anual' ? `de ${v.anio}` : `${v.periodo} de ${v.anio}`}, vencido`,
      texto: imp > 0
        ? `Venció el ${v.fechaLimite} y llevas ${v.diasDeRetraso} ${v.diasDeRetraso === 1 ? 'día' : 'días'} `
          + `de retraso. Son ${formatoEuros(imp)} más ${formatoEuros(num(v.recargoEur, 0))} de recargo `
          + `(${v.recargoPct} %, art. 27 LGT): ${formatoEuros(conRecargo)} en total.${cola}`
        : `Venció el ${v.fechaLimite} y llevas ${v.diasDeRetraso} ${v.diasDeRetraso === 1 ? 'día' : 'días'} `
          + 'de retraso. No sale a ingresar, así que no hay recargo, pero sí sanción del art. 198 LGT: '
          + `${sancionTexto}.`,
      dato: imp > 0 ? formatoEuros(conRecargo) : `${v.diasDeRetraso} días`,
      queHacer: v.queHacer,
      urgencia: 'ya',
      modelo: v.modelo,
      periodo: v.periodo,
      fechaLimite: v.fechaLimite,
      importe: imp,
      recargo: v.recargo,
      pregunta: v.pregunta,
    }));
  });

  const roi = abiertos.find((v) => v.modelo === '036');
  if (roi) {
    out.push(alerta({
      id: 'roi',
      nivel: roi.estado === 'vencido' ? 'rojo' : 'ambar',
      titulo: 'Alta en el ROI (VIES)',
      texto: roi.estado === 'vencido'
        ? 'No estás dado de alta en el ROI y el alta tenía que ser PREVIA a la primera operación '
          + 'con la GmbH (art. 3.3.d) RD 1065/2007).'
        : 'No sabemos si estás dado de alta en el ROI, y sin eso no puedes presentar los modelos 349 '
          + 'ni tienes NIF-IVA válido en el censo europeo.',
      dato: roi.estado === 'vencido' ? formatoEuros(SANCIONES.censalVoluntaria) : '30 segundos',
      queHacer: roi.queHacer,
      urgencia: 'ya',
      modelo: '036',
      periodo: 'puntual',
      pregunta: roi.pregunta,
    }));
  }

  const enPlazo = abiertos.filter((v) => v.estado === 'vence-pronto');
  enPlazo.forEach((v) => {
    const imp = num(v.importeEstimado, 0);
    const quedan = diasEntre(c.hoy, v.fechaLimite);
    out.push(alerta({
      id: `pronto-${v.modelo}-${v.periodo}-${v.anio}`,
      nivel: 'ambar',
      titulo: `${v.nombre}: ${v.periodo === 'anual' ? `de ${v.anio}` : `${v.periodo} de ${v.anio}`}, plazo abierto`,
      texto: `El plazo está abierto y cierra el ${v.fechaLimite}: te quedan ${quedan} `
        + `${quedan === 1 ? 'día' : 'días'}.`
        + (imp > 0 ? ` Son ${formatoEuros(imp)}.` : ' No sale a ingresar, pero hay que presentarlo.')
        + (v.fechaDomiciliacion ? ` Si lo quieres domiciliar, el ${v.fechaDomiciliacion}.` : ''),
      dato: imp > 0 ? formatoEuros(imp) : `${quedan} días`,
      queHacer: v.queHacer,
      urgencia: 'ya',
      modelo: v.modelo,
      periodo: v.periodo,
      fechaLimite: v.fechaLimite,
      importe: imp,
    }));
  });

  if (!vencidos.length && !roi && !enPlazo.length) {
    const siguiente = abiertos.find((v) => v.fechaLimite);
    out.push(alerta({
      id: 'al-dia',
      nivel: 'verde',
      titulo: 'No tienes nada vencido',
      texto: siguiente
        ? `Lo siguiente es el ${siguiente.nombre} ${siguiente.periodo === 'anual' ? `de ${siguiente.anio}` : `del ${siguiente.periodo} de ${siguiente.anio}`}: `
          + `el plazo se abre el ${siguiente.fechaApertura} y cierra el ${siguiente.fechaLimite}.`
        : 'No queda ningún vencimiento abierto.',
      dato: siguiente ? siguiente.fechaLimite : '—',
      queHacer: siguiente ? siguiente.queHacer : 'Nada por hoy.',
      urgencia: 'vigilar',
      modelo: siguiente ? siguiente.modelo : null,
      periodo: siguiente ? siguiente.periodo : null,
      fechaLimite: siguiente ? siguiente.fechaLimite : null,
    }));
  }

  // El número grande, siempre. Sea cual sea el estado del calendario.
  const apartar = cuantoApartar(ctx, c.hoy);
  const ventas = apartar.guardarHoyEnVentas;
  const queHacerApartar = apartar.vencidoSinIngresar > 0
    ? `Lo primero: paga los ${formatoEuros(eur(apartar.vencidoSinIngresar + apartar.recargoQueCorre))} `
      + 'que ya están vencidos, hoy. Y a partir de ahí aparta '
      + `${formatoEuros(apartar.mensualRecomendado)} al mes en una cuenta que no toques: cada `
      + `trimestre que queda te va a costar unos ${formatoEuros(apartar.porTrimestre)}.`
    : (apartar.pendiente > 0
      ? `Aparta ${formatoEuros(apartar.mensualRecomendado)} al mes hasta diciembre en una cuenta que `
        + `no toques. Cada trimestre que queda te va a costar unos ${formatoEuros(apartar.porTrimestre)}.`
      : 'Nada que apartar hoy. Cuando vuelvas a facturar, esto se recalcula solo.');
  out.push(alerta({
    id: 'apartar',
    nivel: apartar.vencidoSinIngresar > 0 ? 'rojo' : (apartar.guardarHoy > 0 ? 'ambar' : 'verde'),
    titulo: 'Lo que tienes que tener guardado hoy',
    texto: apartar.guardarHoy > 0
      ? `Hoy deberías tener ${formatoEuros(apartar.guardarHoy)} apartados para Hacienda`
        + (Number.isFinite(ventas) ? ` (${ventasTexto(ventas)} ${ventas === 1 ? 'venta' : 'ventas'} tuyas)` : '')
        + `. Este año, entre los cuatro 130, van ${formatoEuros(apartar.pagosFraccionados)}.`
      : 'Hoy no tienes nada que apartar para Hacienda: no hay ningún 130 vencido ni devengado sin cubrir.',
    dato: formatoEuros(apartar.guardarHoy),
    queHacer: queHacerApartar,
    urgencia: apartar.guardarHoy > 0 ? 'ya' : 'vigilar',
    importe: apartar.guardarHoy,
  }));

  return out;
}
