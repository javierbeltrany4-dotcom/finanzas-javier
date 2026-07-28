// "¿Dónde me sale mejor vivir?": para un beneficio anual, lo que queda limpio como
// autónomo en España, con SL en España, en Dubái, en Paraguay y en Bali. Sin DOM y sin
// fechas del sistema: testeable con `node --test`.
//
// REGLA DE ESTE MÓDULO: cada constante fiscal lleva el comentario de dónde sale, con la
// sección de `docs/investigacion-fiscal-2026.md` (o de `docs/bali-indonesia-2026.md` en
// todo lo indonesio, que vive en `bali.js`). Si una cifra no está en el informe, no se
// inventa: el campo se deja editable, con valor 0 y un aviso que llega hasta la vista.
//
// "Beneficio anual" (supuesto 1 de la sección 6) = tu parte del beneficio de la academia,
// ANTES de restar cuota de autónomo e impuestos, y DESPUÉS de todos los demás gastos
// deducibles. Es la misma magnitud en los cinco escenarios, para poder compararlos.

import { formatoEuros } from './calculos.js';
import {
  SUPUESTO_BALI,
  netoBali,
  normalizarOpcionesBali,
  opcionesBaliPorDefecto,
} from './bali.js';

// Los cuatro escenarios de `docs/investigacion-fiscal-2026.md`, en el orden de su tabla
// maestra. Esta lista NO incluye Bali a propósito: es la que cotejan los tests contra el
// informe fiscal, fila a fila, y tiene que seguir siendo exactamente esa tabla.
export const ESCENARIOS = ['espana-autonomo', 'espana-sl', 'dubai', 'paraguay'];

// Los cinco que se enseñan en pantalla. Bali llega de un informe distinto y más tardío
// (`docs/bali-indonesia-2026.md`), así que va al final: se añade a la comparación, no
// reescribe la tabla maestra.
export const ESCENARIOS_TODOS = [...ESCENARIOS, 'bali'];

// Los dos escenarios que pasan por el IRPF español y, por tanto, por la escala
// AUTONÓMICA. Se exporta porque quien pinta los umbrales necesita saber si un par queda
// contaminado por una comunidad de la que el informe no publica la escala: ahí la parte
// autonómica sale 0, el neto español sale alto y el umbral se mueve en la dirección que
// cuesta dinero. Ver ESCALAS_AUTONOMICAS y `umbralDetalle`.
export const ESCENARIOS_ESPANA = ['espana-autonomo', 'espana-sl'];

const NOMBRES_ESCENARIO = {
  'espana-autonomo': 'España, autónomo',
  'espana-sl': 'España, SL sacando todo',
  dubai: 'Dubái, free zone no-QFZP',
  paraguay: 'Paraguay, IRP',
  bali: 'Bali, residente fiscal indonesio',
};

// El rango de búsqueda de los umbrales. Por encima de un millón de beneficio la pregunta
// deja de ser esta y el usuario no está ni cerca.
const MAX_UMBRAL = 1000000;

// ---------------------------------------------------------------------------
// Los supuestos, literales de la sección 6 del informe
// ---------------------------------------------------------------------------
//
// Se exportan para poder enseñarlos junto a la tabla: una cifra sin su supuesto es
// exactamente el tipo de número que ya le costó dinero al usuario una vez.
export const SUPUESTOS = {
  beneficio: 'Tu parte del beneficio de la academia, antes de cuota de autónomo e impuestos y después de los demás gastos deducibles.',
  'espana-autonomo': 'Madrid, soltero, sin hijos, estimación directa simplificada, mínimo personal 5.550 (estatal) / 5.956,65 (Madrid), gastos de difícil justificación al 5 % con tope de 2.000, SIN tarifa plana (la foto de cuando se te acabe). No incluye la reducción por inicio de actividad ni ninguna otra.',
  'espana-sl': 'Sueldo de administrador de 35.200 EUR y el resto por dividendos, sacando todo el dinero. Cuota de autónomo societario 5.384,28 EUR/año. No incluye gestoría.',
  dubai: 'Free zone no-QFZP (0 % hasta 89.550 EUR, 9 % encima), escenario típico recurrente con contabilidad (8.470–10.970 EUR/año; el informe usa el punto medio 9.720). No incluye coste de vida, vivienda ni vuelos. Asume que rompes limpiamente la residencia fiscal española.',
  paraguay: 'IRP al 10 % como techo (los tramos bajos ahorran unos ~330 USD y las deducciones personales lo bajarían más). Coste de estructura estimado en 500 EUR/año de tasas oficiales recurrentes. No incluye gestoría (sin fuente) ni coste de vida. Y no resuelve el problema de Stripe.',
  // El de Bali vive en bali.js, con el resto de lo indonesio. Viene de otro informe.
  bali: SUPUESTO_BALI,
};

// ---------------------------------------------------------------------------
// España: Seguridad Social
// ---------------------------------------------------------------------------

// Tipos de cotización 2026: 28,30 % contingencias comunes + 1,30 % profesionales +
// 0,90 % cese de actividad + 0,10 % formación + 0,90 % MEI = 31,50 %.
// SECCIÓN 2.2 — Orden PJC/297/2026, arts. 18.2, 33.5.a) y 33.6 (BOE-A-2026-7296).
// La web de la Seguridad Social dice "31,40 %" en un párrafo y enumera cinco tipos que
// suman 31,50 % en el siguiente. El 31,40 % es un residuo de 2025 (MEI al 0,80 %): el
// informe se queda con el 31,50 % porque es lo que resulta del BOE.
export const TIPO_COTIZACION_RETA = 31.5;

// Deducción por gastos genéricos del art. 308.1.c) LGSS, regla 2ª: el rendimiento que
// decide el tramo de cuota es el neto del IRPF (más las cuotas de SS ya pagadas) MENOS
// un 7 %. Baja al 3 % si eres socio de una sociedad de capital.
// SECCIÓN 2.2 — https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724
export const DEDUCCION_GENERICA_RETA = 7;
export const DEDUCCION_GENERICA_RETA_SOCIETARIO = 3;

// Tabla de cuota de autónomo 2026, por rendimiento neto computable MENSUAL.
// SECCIÓN 2.2 — Orden PJC/297/2026, art. 18 (BOE núm. 79, 31/03/2026). No hay tabla
// oficial de cuotas mensuales para 2026: la cuota es base mínima × 31,50 % (`CÁLCULO MÍO`
// del informe), así que aquí se deriva igual en vez de copiar el redondeo.
//
// Las tres primeras filas son la TABLA REDUCIDA, que solo se puede elegir si prevés menos
// de 1.166,70 EUR/mes de rendimiento computable. Las doce siguientes son la TABLA GENERAL.
// Van en el mismo array porque los tramos encajan sin hueco y así la búsqueda es una sola.
// En el borde exacto de 1.166,70 se queda en la reducida: la sección 7.5 dice que se cambia
// de tabla "por encima" de esa cifra.
//
// Los tramos 2 y 3 de la general comparten base mínima (960,78). No es errata: figura así
// en el BOE.
export const TRAMOS_RETA = [
  { tabla: 'reducida', tramo: 1, hastaMes: 670, baseMinima: 653.59 },      // 205,88 EUR/mes
  { tabla: 'reducida', tramo: 2, hastaMes: 900, baseMinima: 718.95 },      // 226,47 EUR/mes
  { tabla: 'reducida', tramo: 3, hastaMes: 1166.70, baseMinima: 849.67 },  // 267,65 EUR/mes
  { tabla: 'general', tramo: 1, hastaMes: 1300, baseMinima: 950.98 },      // 299,56 EUR/mes
  { tabla: 'general', tramo: 2, hastaMes: 1500, baseMinima: 960.78 },      // 302,65 EUR/mes
  { tabla: 'general', tramo: 3, hastaMes: 1700, baseMinima: 960.78 },      // 302,65 EUR/mes
  { tabla: 'general', tramo: 4, hastaMes: 1850, baseMinima: 1143.79 },     // 360,29 EUR/mes
  { tabla: 'general', tramo: 5, hastaMes: 2030, baseMinima: 1209.15 },     // 380,88 EUR/mes
  { tabla: 'general', tramo: 6, hastaMes: 2330, baseMinima: 1274.51 },     // 401,47 EUR/mes
  { tabla: 'general', tramo: 7, hastaMes: 2760, baseMinima: 1356.21 },     // 427,21 EUR/mes
  { tabla: 'general', tramo: 8, hastaMes: 3190, baseMinima: 1437.91 },     // 452,94 EUR/mes
  { tabla: 'general', tramo: 9, hastaMes: 3620, baseMinima: 1519.61 },     // 478,68 EUR/mes
  { tabla: 'general', tramo: 10, hastaMes: 4050, baseMinima: 1601.31 },    // 504,41 EUR/mes
  { tabla: 'general', tramo: 11, hastaMes: 6000, baseMinima: 1732.03 },    // 545,59 EUR/mes
  { tabla: 'general', tramo: 12, hastaMes: Infinity, baseMinima: 1928.10 },// 607,35 EUR/mes
];

// La cuota está TOPADA: a partir de 6.000 EUR/mes computables (72.000 EUR/año) se congela
// en 607,35 EUR/mes, ganes 80.000, 150.000 o 230.000. SECCIÓN 2.2 y umbral de la 7.5.
export const RETA_TOPE_MENSUAL = 6000;

// Base mínima de cotización del autónomo SOCIETARIO en la regularización anual.
// SECCIÓN 5.1 — Orden PJC/297/2026, arts. 3 y 18. Cuota = 1.424,40 × 31,50 % = 448,69/mes.
export const BASE_COTIZACION_SOCIETARIA = 1424.40;

// ---------------------------------------------------------------------------
// España: IRPF
// ---------------------------------------------------------------------------

// Escala estatal 2026, art. 63.1.1º Ley 35/2006.
// SECCIÓN 2.1 — https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764 (texto consolidado
// a 29/04/2026). El informe avisa en la sección 8 de que no ha podido comprobar si hay
// modificación posterior a esa fecha.
export const ESCALA_ESTATAL = [
  { hasta: 12450, tipo: 9.5 },
  { hasta: 20200, tipo: 12 },
  { hasta: 35200, tipo: 15 },
  { hasta: 60000, tipo: 18.5 },
  { hasta: 300000, tipo: 22.5 },
  { hasta: Infinity, tipo: 24.5 },
];

// Escalas autonómicas.
//
// EL INFORME SOLO PUBLICA LA TABLA COMPLETA DE MADRID (sección 2.1, Tabla 24 del compendio
// del Ministerio de Hacienda actualizado a 29/04/2026). De Cataluña, Andalucía y Comunitat
// Valenciana da DOS datos sueltos —el marginal máximo agregado y el marginal autonómico a
// 60.000 EUR de base—, que no bastan para construir una escala.
//
// Por eso esas tres van con la tabla VACÍA a propósito. Rellenarlas a ojo sería inventarse
// entre tres y cinco tramos, que es justo lo que este módulo no hace. Con la tabla vacía la
// parte autonómica sale 0, el IRPF sale bajo y el neto sale ALTO: `irpfEspanaAnual` lo
// marca con un aviso que sube hasta `compararEscenarios`.
//
// Los dos datos sueltos que sí están se guardan en DATOS_AUTONOMICOS, para que la vista
// pueda ofrecerlos como campos editables.
export const ESCALAS_AUTONOMICAS = {
  madrid: [
    { hasta: 13362.22, tipo: 8.5 },
    { hasta: 19004.63, tipo: 10.7 },
    { hasta: 35425.68, tipo: 12.8 },
    { hasta: 57320.40, tipo: 17.4 },
    { hasta: Infinity, tipo: 20.5 },
  ],
  cataluna: [],
  andalucia: [],
  valencia: [],
};

// Lo único que el informe publica de las tres comunidades sin escala, más el mínimo
// personal autonómico de cada una. SECCIÓN 2.1.
// `marginalMaximoTotal` es el agregado (estatal 24,50 % + autonómico) a partir de 300.000.
export const DATOS_AUTONOMICOS = {
  madrid: { nombre: 'Madrid', marginalMaximoTotal: 45, marginalA60000: 20.5, minimoPersonal: 5956.65, escalaCompleta: true },
  cataluna: { nombre: 'Cataluña', marginalMaximoTotal: 50, marginalA60000: 21.5, minimoPersonal: 5550, escalaCompleta: false },
  andalucia: { nombre: 'Andalucía', marginalMaximoTotal: 47, marginalA60000: 22.5, minimoPersonal: 5790, escalaCompleta: false },
  valencia: { nombre: 'Comunitat Valenciana', marginalMaximoTotal: 54, marginalA60000: 25, minimoPersonal: 6105, escalaCompleta: false },
};

// Mínimo personal estatal, soltero sin hijos ni ascendientes. Art. 57.1 Ley 35/2006.
// SECCIÓN 2.1. Ojo al mecanismo: NO se resta de la base. Se aplica la escala al mínimo y
// esa cuota se descuenta de la cuota íntegra (art. 63.1.2º), así que desgrava a los tipos
// más bajos, no al marginal.
export const MINIMO_PERSONAL_ESTATAL = 5550;

// Base del ahorro (dividendos, intereses, ganancias). Tipos totales, ya agregados.
// SECCIÓN 2.1 — Manual práctico IRPF 2025 de la AEAT, campaña 2026.
// Desde 2015 no existe la exención de los primeros 1.500 EUR de dividendos.
export const ESCALA_AHORRO = [
  { hasta: 6000, tipo: 19 },
  { hasta: 50000, tipo: 21 },
  { hasta: 200000, tipo: 23 },
  { hasta: 300000, tipo: 27 },
  { hasta: Infinity, tipo: 30 },
];

// Gastos de difícil justificación en estimación directa simplificada: 5 % del rendimiento
// neto previo, con tope de 2.000 EUR/año. Art. 30.2.4ª LIRPF.
// SECCIÓN 2.4 y umbral de la 7.5. El 7 % de 2023 fue excepcional y está caducado.
export const DIFICIL_JUSTIFICACION_PCT = 5;
export const DIFICIL_JUSTIFICACION_TOPE = 2000;

// ---------------------------------------------------------------------------
// Dubái
// ---------------------------------------------------------------------------

// SECCIÓN 3. Tu academia NO puede ser Qualifying Free Zone Person (la lista de actividades
// del MD 229/2025 es cerrada y no incluye formación, y vender a personas físicas es
// Actividad Excluida). Eso te CONVIENE: un QFZP pierde el tramo exento y tú lo recuperas.
//
//  · exentoEur / tipo: 0 % sobre los primeros 375.000 AED ≈ 89.550 EUR de beneficio
//    imponible, 9 % sobre el exceso. SECCIÓN 3.1 — Guía FTA CTGFZP1, sección 5.6, sobre el
//    art. 3(1) del Federal Decree-Law 47/2022. Tipo de cambio del informe: 1 AED = 0,2388 EUR.
//  · constitucionMin/Max: coste de PRIMER AÑO del escenario TÍPICO (IFZA o Meydan,
//    flexi-desk, 1 visado, banco digital): AED 33.886–45.858 ≈ 8.092–10.951 EUR. SECCIÓN 3.2.
//  · recurrenteMin/Max: coste del año 2 en adelante, escenario típico CON contabilidad:
//    AED 35.451–45.938 ≈ 8.470–10.970 EUR. SECCIÓN 3.3.
//
// El informe avisa (sección 8) de que el coste de contabilidad es el componente más
// incierto de todos sus totales y el que más los mueve, y de que ni IFZA ni SHAMS publican
// precios en sus webs oficiales.
export const COSTES_DUBAI = {
  constitucionMin: 8092,
  constitucionMax: 10951,
  recurrenteMin: 8470,
  recurrenteMax: 10970,
  exentoEur: 89550,
  tipo: 9,
};

// ---------------------------------------------------------------------------
// Paraguay
// ---------------------------------------------------------------------------

// SECCIÓN 4. El sistema es territorial, pero el art. 48 de la Ley 6380/2019 grava las
// rentas "provenientes de actividades desarrolladas en la República": si operas la academia
// desde Asunción, es renta de fuente paraguaya y tributa. No es un 0 %.
//
//  · tramos: tipos del IRP por servicios personales, art. 69 Ley 6380/2019, confirmados en
//    la cartilla oficial de la DNIT. SECCIÓN 4.2. Van en GUARANÍES porque así están
//    publicados; el informe da su equivalente aproximado en USD, nunca en euros.
//  · guaraniesPorUsd: tipo oficial del Banco Central del Paraguay del 28/07/2026 (compra).
//    SECCIÓN 4.1.
//  · eurPorUsd: NO ESTÁ EN EL INFORME. El informe publica EUR/AED (0,2388) y el anclaje
//    AED/USD (3,6725), pero nunca un EUR/USD directo. Campo editable, 0 = sin dato. Sin él
//    los tramos progresivos no se pueden pasar a euros y se usa el techo del 10 %.
//  · eurPorUsdDerivado: la multiplicación de esas dos cifras que sí están (sección 3.1).
//    Es una derivación, no un dato: hay que pedirla a mano en `opciones.paraguayEurPorUsd`.
//  · tipoTecho / estructuraAnual: lo que usa la tabla maestra. Supuesto 5 de la SECCIÓN 6.
export const COSTES_PARAGUAY = {
  tramos: [
    { hastaGs: 50000000, tipo: 8, usdAprox: 8329 },
    { hastaGs: 150000000, tipo: 9, usdAprox: 24987 },
    { hastaGs: Infinity, tipo: 10, usdAprox: Infinity },
  ],
  guaraniesPorUsd: 6002.87,
  eurPorUsd: 0,
  eurPorUsdDerivado: 3.6725 * 0.2388,
  // Mínimo no incidido: por debajo de ₲80.000.000 (~USD 13.325) de ingresos brutos por
  // servicios personales hay obligaciones formales pero no de pago. SECCIÓN 4.2.
  minimoNoIncididoGs: 80000000,
  tipoTecho: 10,
  estructuraAnual: 500,
};

// ---------------------------------------------------------------------------
// SL española
// ---------------------------------------------------------------------------

// SECCIÓN 5.1.
//  · sueldoAdministrador: 35.200 EUR. Es el tope de sueldo que usa el informe, y coincide
//    con el final del tercer tramo de la escala estatal: sacar más por nómina empieza a
//    tributar al 18,5 % estatal cuando el dividendo va al 21 %. Supuesto 3 de la sección 6.
//  · cuotaSocietaria: 5.384,28 EUR/año = 1.424,40 × 31,50 % × 12. Con el 40 % de una SL la
//    ley PRESUME control efectivo (art. 305.2.b) LGSS presume desde un tercio), así que
//    eres autónomo societario sí o sí.
//  · tipoIS / tipoISResto / limitePrimerTramoIS: con cifra de negocios < 1.000.000 EUR,
//    19 % sobre los primeros 50.000 de base y 21 % sobre el resto. Son los tipos que de
//    verdad se aplican en 2026 (DT 44ª LIS), no los de la ley general.
//  · constitucion: 60 EUR de notario + 40 de registrador con estatutos-tipo telemáticos y
//    capital ≤ 3.100 EUR. BORME exento. Art. 5 RDL 13/2010.
//  · puertoSeguroPct: el art. 18.6 LIS exige que la retribución del conjunto de socios
//    profesionales no baje del 75 % del resultado previo. Si te aplica, esta tabla es
//    demasiado optimista con la SL: no está modelado, va como aviso.
export const CONFIG_SL = {
  sueldoAdministrador: 35200,
  cuotaSocietaria: 5384.28,
  baseCotizacionSocietaria: BASE_COTIZACION_SOCIETARIA,
  tipoIS: 19,
  tipoISResto: 21,
  limitePrimerTramoIS: 50000,
  constitucion: 100,
  puertoSeguroPct: 75,
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Número de usuario o de la hoja: vacío, null o basura -> el valor por defecto.
// El 0 es un valor legítimo (coste 0, tipo 0) y tiene que sobrevivir.
// El try no es paranoia: `Number(v)` LANZA un TypeError si v es un objeto con una clave
// `toString` que no sea función, y estas opciones llegan de una copia importada
// ({"dubaiCosteMin": {"toString": 1}} es JSON válido). Ver la nota larga en respaldo.js.
function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
  return Number.isFinite(n) ? n : porDefecto;
}

// Porcentaje: como num pero acotado a 0..100.
function pct(v, porDefecto) {
  return Math.min(100, Math.max(0, num(v, porDefecto)));
}

// Cuota íntegra de una base recorriendo una escala tramo a tramo. Escala vacía -> 0,
// que es lo que hace falta para las comunidades sin tabla publicada.
function cuotaEscala(base, tramos) {
  const lista = Array.isArray(tramos) ? tramos : [];
  let cuota = 0;
  let suelo = 0;
  for (const t of lista) {
    if (base <= suelo) break;
    cuota += (Math.min(base, t.hasta) - suelo) * (t.tipo / 100);
    suelo = t.hasta;
  }
  return cuota;
}

// Clave de comunidad: cualquier cosa que no esté en la tabla cae en Madrid, que es la
// comunidad sobre la que está calculado todo el informe. El try, por lo mismo que en `num`.
function claveComunidad(c) {
  let k;
  try { k = String(c ?? '').trim().toLowerCase(); } catch (e) { return 'madrid'; }
  return Object.prototype.hasOwnProperty.call(DATOS_AUTONOMICOS, k) ? k : 'madrid';
}

// ---------------------------------------------------------------------------
// Cuota de autónomo
// ---------------------------------------------------------------------------

// El tramo de la tabla en el que cae un beneficio anual. Se expone porque la vista quiere
// enseñar "estás en el tramo 3 de la reducida, a 50 EUR de cambiar de tabla".
//
// El rendimiento que decide el tramo NO es el beneficio: es el beneficio menos el 7 % del
// art. 308.1.c) LGSS, repartido en 12 meses. Con 15.000 EUR eso da 1.162,50 EUR/mes, a 4,20
// del salto a la tabla general.
export function tramoRetaDe(rendimientoNeto, deduccionPct = DEDUCCION_GENERICA_RETA) {
  const b = num(rendimientoNeto, 0);
  const factor = 1 - pct(deduccionPct, DEDUCCION_GENERICA_RETA) / 100;
  const computableMes = (b * factor) / 12;
  const tramo = TRAMOS_RETA.find((t) => computableMes <= t.hastaMes) || TRAMOS_RETA[TRAMOS_RETA.length - 1];
  return { ...tramo, computableAnual: b * factor, computableMes };
}

// Lo que cuesta la Seguridad Social en un año entero.
// Beneficio negativo o cero cae en el primer tramo y sigue pagando: el autónomo cotiza
// aunque pierda dinero, y esconderlo daría un neto falsamente bueno en la parte baja.
export function cuotaRetaAnual(rendimientoNeto, deduccionPct = DEDUCCION_GENERICA_RETA) {
  const tramo = tramoRetaDe(rendimientoNeto, deduccionPct);
  return tramo.baseMinima * (TIPO_COTIZACION_RETA / 100) * 12;
}

// ---------------------------------------------------------------------------
// IRPF de la base general
// ---------------------------------------------------------------------------

// El desglose completo, para poder enseñar de dónde sale cada euro y para arrastrar el
// aviso de las comunidades sin escala publicada.
export function detalleIrpfEspana(baseLiquidable, comunidad = 'madrid') {
  const base = Math.max(0, num(baseLiquidable, 0));
  const clave = claveComunidad(comunidad);
  const datos = DATOS_AUTONOMICOS[clave];
  const escalaAutonomica = ESCALAS_AUTONOMICAS[clave] || [];

  const estatal = cuotaEscala(base, ESCALA_ESTATAL);
  const autonomica = cuotaEscala(base, escalaAutonomica);
  // El mínimo personal no se resta de la base: se pasa por la misma escala y se descuenta
  // de la cuota (art. 63.1.2º). Con un tope en la propia base, para que nunca salga negativo.
  const deduccionMinimo = cuotaEscala(Math.min(base, MINIMO_PERSONAL_ESTATAL), ESCALA_ESTATAL)
    + cuotaEscala(Math.min(base, datos.minimoPersonal), escalaAutonomica);
  const cuota = Math.max(0, estatal + autonomica - deduccionMinimo);

  const avisos = [];
  if (!datos.escalaCompleta) {
    avisos.push(`El informe solo publica la escala autonómica completa de Madrid (sección 2.1). De ${datos.nombre} solo hay el marginal máximo agregado (${datos.marginalMaximoTotal} %) y el marginal autonómico a 60.000 (${datos.marginalA60000} %): sin tabla, la parte autonómica va a 0 y este IRPF sale MÁS BAJO de lo que sería.`);
  }

  return {
    comunidad: clave,
    base,
    estatal,
    autonomica,
    deduccionMinimo,
    cuota,
    escalaCompleta: datos.escalaCompleta,
    avisos,
  };
}

// La cuota de IRPF de una base liquidable, en euros. Es la que usa el resto del módulo.
export function irpfEspanaAnual(baseLiquidable, comunidad = 'madrid') {
  return detalleIrpfEspana(baseLiquidable, comunidad).cuota;
}

// IRPF de la base del AHORRO (los dividendos de la SL). Escala propia, sin mínimo personal:
// el mínimo ya se ha consumido contra la base general del sueldo.
export function irpfAhorroAnual(baseAhorro) {
  return cuotaEscala(Math.max(0, num(baseAhorro, 0)), ESCALA_AHORRO);
}

// ---------------------------------------------------------------------------
// Opciones
// ---------------------------------------------------------------------------

// Todo lo que el usuario puede tocar, con el valor que usa el informe.
// Los puntos medios (dubaiCosteAnual, dubaiConstitucion) son los de las horquillas de las
// secciones 3.2 y 3.3; 9.720 es exactamente el que usa la tabla maestra.
export function opcionesPorDefecto() {
  return {
    comunidad: 'madrid',

    // España, autónomo
    deduccionGenericaReta: DEDUCCION_GENERICA_RETA,
    dificilJustificacionPct: DIFICIL_JUSTIFICACION_PCT,
    dificilJustificacionTope: DIFICIL_JUSTIFICACION_TOPE,

    // España, SL
    sueldoAdministrador: CONFIG_SL.sueldoAdministrador,
    cuotaSocietaria: CONFIG_SL.cuotaSocietaria,
    tipoIS: CONFIG_SL.tipoIS,
    tipoISResto: CONFIG_SL.tipoISResto,
    limitePrimerTramoIS: CONFIG_SL.limitePrimerTramoIS,

    // Dubái
    dubaiCosteAnual: (COSTES_DUBAI.recurrenteMin + COSTES_DUBAI.recurrenteMax) / 2,
    dubaiConstitucion: (COSTES_DUBAI.constitucionMin + COSTES_DUBAI.constitucionMax) / 2,
    dubaiExento: COSTES_DUBAI.exentoEur,
    dubaiTipo: COSTES_DUBAI.tipo,

    // Paraguay
    paraguayTipoTecho: COSTES_PARAGUAY.tipoTecho,
    paraguayEstructuraAnual: COSTES_PARAGUAY.estructuraAnual,
    paraguayUsarTramos: false,
    // 0 = sin dato. El informe no publica ningún EUR/USD. Ver COSTES_PARAGUAY.
    paraguayEurPorUsd: COSTES_PARAGUAY.eurPorUsd,

    // Bali. Las claves llevan prefijo y viven en bali.js, que es de donde salen sus
    // fuentes; aquí sólo viajan pegadas al mismo objeto de opciones.
    ...opcionesBaliPorDefecto(),
  };
}

// Limpia lo que llega de la vista: un campo vacío vuelve a su valor por defecto y los
// porcentajes no se salen de 0..100. Nunca devuelve NaN.
export function normalizarOpciones(opciones) {
  const x = opciones || {};
  const d = opcionesPorDefecto();
  return {
    comunidad: claveComunidad(x.comunidad ?? d.comunidad),

    deduccionGenericaReta: pct(x.deduccionGenericaReta, d.deduccionGenericaReta),
    dificilJustificacionPct: pct(x.dificilJustificacionPct, d.dificilJustificacionPct),
    dificilJustificacionTope: Math.max(0, num(x.dificilJustificacionTope, d.dificilJustificacionTope)),

    sueldoAdministrador: Math.max(0, num(x.sueldoAdministrador, d.sueldoAdministrador)),
    cuotaSocietaria: Math.max(0, num(x.cuotaSocietaria, d.cuotaSocietaria)),
    tipoIS: pct(x.tipoIS, d.tipoIS),
    tipoISResto: pct(x.tipoISResto, d.tipoISResto),
    limitePrimerTramoIS: Math.max(0, num(x.limitePrimerTramoIS, d.limitePrimerTramoIS)),

    dubaiCosteAnual: Math.max(0, num(x.dubaiCosteAnual, d.dubaiCosteAnual)),
    dubaiConstitucion: Math.max(0, num(x.dubaiConstitucion, d.dubaiConstitucion)),
    dubaiExento: Math.max(0, num(x.dubaiExento, d.dubaiExento)),
    dubaiTipo: pct(x.dubaiTipo, d.dubaiTipo),

    paraguayTipoTecho: pct(x.paraguayTipoTecho, d.paraguayTipoTecho),
    paraguayEstructuraAnual: Math.max(0, num(x.paraguayEstructuraAnual, d.paraguayEstructuraAnual)),
    paraguayUsarTramos: Boolean(x.paraguayUsarTramos ?? d.paraguayUsarTramos),
    paraguayEurPorUsd: Math.max(0, num(x.paraguayEurPorUsd, d.paraguayEurPorUsd)),

    ...normalizarOpcionesBali(x),
  };
}

// El porcentaje del beneficio que acaba en el bolsillo. Sin beneficio no hay porcentaje
// que enseñar: null, no Infinity ni NaN.
function porcentajeBolsillo(neto, beneficio) {
  return beneficio > 0 ? (neto / beneficio) * 100 : null;
}

// ---------------------------------------------------------------------------
// Los cuatro escenarios
// ---------------------------------------------------------------------------

// España, autónomo. La cadena es la del método de la sección 6:
//   cuota RETA (por el beneficio × 0,93) -> base liquidable (beneficio − cuota − 5 % con
//   tope 2.000) -> IRPF (estatal + autonómica − cuota del mínimo personal) -> neto.
export function netoEspanaAutonomo(beneficio, opciones) {
  const o = normalizarOpciones(opciones);
  const b = num(beneficio, 0);

  const tramoReta = tramoRetaDe(b, o.deduccionGenericaReta);
  const cuotaReta = tramoReta.baseMinima * (TIPO_COTIZACION_RETA / 100) * 12;

  const rendimientoPrevio = b - cuotaReta;
  // El 5 % de una pérdida sería un número negativo que SUBIRÍA la base. Se corta en 0.
  const dificilJustificacion = Math.min(
    o.dificilJustificacionTope,
    Math.max(0, rendimientoPrevio) * (o.dificilJustificacionPct / 100),
  );
  const baseLiquidable = rendimientoPrevio - dificilJustificacion;

  const detalle = detalleIrpfEspana(baseLiquidable, o.comunidad);
  const irpf = detalle.cuota;
  const neto = b - cuotaReta - irpf;

  return {
    escenario: 'espana-autonomo',
    beneficio: b,
    cuotaReta,
    tramoReta,
    rendimientoPrevio,
    dificilJustificacion,
    baseLiquidable,
    irpf,
    irpfDetalle: detalle,
    neto,
    pctBolsillo: porcentajeBolsillo(neto, b),
    avisos: [...detalle.avisos],
  };
}

// España, SL, sacando todo el dinero cada año (supuesto 3 de la sección 6):
//   la sociedad paga la cuota de autónomo societario y el sueldo de administrador (ambos
//   deducibles en el IS), tributa el resto al 19/21 % y reparte lo que queda como
//   dividendo, que va a la base del ahorro.
//
// Con beneficio por debajo de la cuota societaria no hay sueldo ni dividendo: el neto es
// directamente el agujero. Es lo que pasa de verdad, y por eso la SL pierde en la parte baja.
export function netoEspanaSL(beneficio, opciones) {
  const o = normalizarOpciones(opciones);
  const b = num(beneficio, 0);

  const cuotaSocietaria = o.cuotaSocietaria;
  const disponible = b - cuotaSocietaria;

  const sueldo = Math.min(o.sueldoAdministrador, Math.max(0, disponible));
  const baseIS = Math.max(0, disponible - sueldo);
  const impuestoSociedades = Math.min(baseIS, o.limitePrimerTramoIS) * (o.tipoIS / 100)
    + Math.max(0, baseIS - o.limitePrimerTramoIS) * (o.tipoISResto / 100);
  const dividendoBruto = baseIS - impuestoSociedades;

  const detalle = detalleIrpfEspana(sueldo, o.comunidad);
  const irpfTrabajo = detalle.cuota;
  const irpfAhorro = irpfAhorroAnual(dividendoBruto);
  const irpf = irpfTrabajo + irpfAhorro;

  const neto = disponible - irpfTrabajo - impuestoSociedades - irpfAhorro;

  return {
    escenario: 'espana-sl',
    beneficio: b,
    cuotaSocietaria,
    disponible,
    sueldo,
    baseIS,
    impuestoSociedades,
    dividendoBruto,
    baseLiquidable: sueldo,
    irpfTrabajo,
    irpfAhorro,
    irpf,
    irpfDetalle: detalle,
    neto,
    pctBolsillo: porcentajeBolsillo(neto, b),
    avisos: [
      'No incluye gestoría. Puede aplicarte el puerto seguro del art. 18.6 LIS.',
      ...detalle.avisos,
    ],
  };
}

// Dubái. Solo impuesto de sociedades emiratí y coste de estructura: no hay IRPF personal
// ni cotización.
//   · `neto` es el año 2 en adelante (solo estructura recurrente).
//   · `primerAno` es lo que queda el PRIMER año, que además paga la constitución. El
//     informe es explícito: la constitución va ADEMÁS del recurrente (nota 2 de la sección 6).
export function netoDubai(beneficio, opciones) {
  const o = normalizarOpciones(opciones);
  const b = num(beneficio, 0);

  const impuesto = Math.max(0, b - o.dubaiExento) * (o.dubaiTipo / 100);
  const estructura = o.dubaiCosteAnual;
  const neto = b - impuesto - estructura;
  const constitucion = o.dubaiConstitucion;
  const primerAno = neto - constitucion;

  return {
    escenario: 'dubai',
    beneficio: b,
    impuesto,
    estructura,
    constitucion,
    neto,
    primerAno,
    pctBolsillo: porcentajeBolsillo(neto, b),
    avisos: [
      `No incluye el coste de vivir allí. El primer año cuesta ${formatoEuros(constitucion)} más de constitución.`,
      'Asume que rompes limpiamente la residencia fiscal española.',
    ],
  };
}

// Paraguay. Por defecto, el 10 % plano que usa la tabla maestra como TECHO (supuesto 5 de
// la sección 6): los tramos del 8 y el 9 % ahorrarían unos 330 USD y las deducciones
// personales bajarían más, así que el techo es la cifra prudente.
//
// Con `opciones.paraguayUsarTramos` se pide la escala progresiva de verdad, pero sus
// límites están en guaraníes y el informe no publica ningún EUR/USD con el que pasarlos a
// euros. Sin `paraguayEurPorUsd` no se puede, y se vuelve al techo con un aviso en vez de
// inventarse el tipo de cambio.
export function netoParaguay(beneficio, opciones) {
  const o = normalizarOpciones(opciones);
  const b = num(beneficio, 0);
  const gravable = Math.max(0, b);

  const avisos = [
    'Stripe no opera en Paraguay, y tú cobras por ahí.',
    'El sistema territorial grava lo que HACES desde allí: 8-10 %, no 0 %.',
  ];

  let impuesto;
  let modo;
  if (o.paraguayUsarTramos && o.paraguayEurPorUsd > 0) {
    const eurPorGs = o.paraguayEurPorUsd / COSTES_PARAGUAY.guaraniesPorUsd;
    const escala = COSTES_PARAGUAY.tramos.map((t) => ({
      hasta: t.hastaGs === Infinity ? Infinity : t.hastaGs * eurPorGs,
      tipo: t.tipo,
    }));
    impuesto = cuotaEscala(gravable, escala);
    modo = 'tramos';
  } else {
    impuesto = gravable * (o.paraguayTipoTecho / 100);
    modo = 'techo';
    if (o.paraguayUsarTramos) {
      avisos.push('Los tramos del IRP (8/9/10 %) están publicados en guaraníes y el informe no da ningún cambio EUR/USD con el que pasarlos a euros. Se aplica el techo del 10 %: rellena `paraguayEurPorUsd` para usar la escala.');
    }
  }

  const estructura = o.paraguayEstructuraAnual;
  const neto = b - impuesto - estructura;

  return {
    escenario: 'paraguay',
    beneficio: b,
    impuesto,
    estructura,
    modo,
    neto,
    pctBolsillo: porcentajeBolsillo(neto, b),
    avisos,
  };
}

// Bali se reexporta para que quien importe residencia.js tenga los cinco escenarios en el
// mismo sitio. La aritmética y las fuentes indonesias siguen viviendo en bali.js.
export { netoBali };

// El escenario que toque, por su clave. Escenario desconocido -> null.
export function netoDe(escenario, beneficio, opciones) {
  switch (escenario) {
    case 'espana-autonomo': return netoEspanaAutonomo(beneficio, opciones);
    case 'espana-sl': return netoEspanaSL(beneficio, opciones);
    case 'dubai': return netoDubai(beneficio, opciones);
    case 'paraguay': return netoParaguay(beneficio, opciones);
    case 'bali': return netoBali(beneficio, opciones);
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// La comparativa y los umbrales
// ---------------------------------------------------------------------------

// Los escenarios de `lista` ordenados por lo que dejan limpio, de más a menos. El primero
// es el que más paga a ese nivel de beneficio; los avisos van pegados a cada fila porque
// el orden por sí solo miente (Paraguay gana casi siempre y no resuelve lo de Stripe, y
// Bali puede salir el primero en una fila en la que ni siquiera calificas para el visado).
function comparar(lista, beneficio, opciones) {
  const o = normalizarOpciones(opciones);
  const b = num(beneficio, 0);
  const nombreComunidad = DATOS_AUTONOMICOS[o.comunidad].nombre;

  return lista
    .map((escenario) => {
      const detalle = netoDe(escenario, b, o);
      const nombre = escenario === 'espana-autonomo'
        ? `${NOMBRES_ESCENARIO[escenario]} (${nombreComunidad})`
        : NOMBRES_ESCENARIO[escenario];
      return {
        escenario,
        nombre,
        neto: detalle.neto,
        pct: detalle.pctBolsillo,
        detalle,
        avisos: detalle.avisos,
      };
    })
    .sort((a, b2) => b2.neto - a.neto);
}

// Los CUATRO del informe fiscal, que son los de su tabla maestra. No cambia.
export function compararEscenarios(beneficio, opciones) {
  return comparar(ESCENARIOS, beneficio, opciones);
}

// Los CINCO, con Bali. Es lo que pinta la pantalla "Dónde vivir"; `compararEscenarios` se
// queda como está para que la tabla del informe se pueda seguir cotejando fila a fila.
export function compararTodos(beneficio, opciones) {
  return comparar(ESCENARIOS_TODOS, beneficio, opciones);
}

// El beneficio anual en el que dos escenarios empatan. Bisección en [0, 1.000.000] sobre
// la diferencia de netos.
//
// Devuelve null cuando no cambian de orden en todo el rango: entonces no hay umbral que
// buscar, uno gana siempre (Paraguay contra España es el caso claro).
//
// AVISO IMPORTANTE: la diferencia NO es continua. La cuota de autónomo salta de golpe en
// cada frontera de tramo, así que en España el neto tiene escalones. Si el cambio de signo
// cae justo en uno, la bisección converge al escalón y los dos netos NO son iguales ahí:
// es un cruce por salto, no por empate. `umbralDetalle` lo dice con `exacto: false`.
export function umbralEntre(escenarioA, escenarioB, opciones) {
  // Se valida contra los CINCO: los cruces con Bali son una pregunta legítima, aunque Bali
  // no esté en la tabla maestra del informe fiscal.
  if (!ESCENARIOS_TODOS.includes(escenarioA) || !ESCENARIOS_TODOS.includes(escenarioB)) return null;
  if (escenarioA === escenarioB) return null;
  const o = normalizarOpciones(opciones);

  const dif = (x) => netoDe(escenarioA, x, o).neto - netoDe(escenarioB, x, o).neto;

  const enCero = dif(0);
  const enTope = dif(MAX_UMBRAL);
  if (!Number.isFinite(enCero) || !Number.isFinite(enTope)) return null;
  if (enCero === 0) return 0;
  if (enTope === 0) return MAX_UMBRAL;
  if ((enCero > 0) === (enTope > 0)) return null;

  let lo = 0;
  let hi = MAX_UMBRAL;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if ((dif(mid) > 0) === (enCero > 0)) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// El umbral con lo que hace falta para creérselo: los dos netos en ese punto, la diferencia
// que queda y si el cruce es un empate de verdad (`exacto`) o un salto de la tabla de cuotas.
//
// Y, sobre todo, si el número se puede creer. Un umbral es una resta de dos netos, así que
// hereda TODOS los defectos de los dos. El grave es el de las comunidades sin escala
// publicada: con Cataluña, Andalucía o Comunitat Valenciana la parte autonómica sale 0, el
// neto español sale ALTO y el cruce se desplaza. `detalleIrpfEspana` ya avisa de eso; aquí
// se arrastra hasta la vista en vez de tirarlo por el camino:
//
//   · comunidad / escalaCompleta -> qué escala se ha usado y si estaba entera
//   · afectaEspana -> si alguno de los dos escenarios pasa por el IRPF español
//   · fiable -> false cuando el cruce toca a España con una escala a medias. Con `fiable`
//     en false esta cifra NO se puede enseñar como un umbral: no es una aproximación, es un
//     número movido en la dirección equivocada.
//   · avisos -> los de los dos escenarios, sin repetir
export function umbralDetalle(escenarioA, escenarioB, opciones, tolerancia = 1) {
  const beneficio = umbralEntre(escenarioA, escenarioB, opciones);
  if (beneficio === null) return null;
  const o = normalizarOpciones(opciones);
  const detalleA = netoDe(escenarioA, beneficio, o);
  const detalleB = netoDe(escenarioB, beneficio, o);
  const netoA = detalleA.neto;
  const netoB = detalleB.neto;
  const diferencia = netoA - netoB;
  const datosComunidad = DATOS_AUTONOMICOS[o.comunidad];
  const afectaEspana = ESCENARIOS_ESPANA.includes(escenarioA) || ESCENARIOS_ESPANA.includes(escenarioB);
  return {
    escenarioA,
    escenarioB,
    beneficio,
    netoA,
    netoB,
    diferencia,
    exacto: Math.abs(diferencia) <= tolerancia,
    comunidad: o.comunidad,
    escalaCompleta: datosComunidad.escalaCompleta,
    afectaEspana,
    fiable: datosComunidad.escalaCompleta || !afectaEspana,
    avisos: [...new Set([...(detalleA.avisos || []), ...(detalleB.avisos || [])])],
  };
}
