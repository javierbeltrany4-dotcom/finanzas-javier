// Bali (Indonesia) como quinto escenario de "¿dónde me sale mejor vivir?". Sin DOM y sin
// fechas del sistema: testeable con `node --test`.
//
// REGLA DE ESTE MÓDULO, la misma que la de residencia.js: cada constante lleva el
// comentario de dónde sale, con la sección de `docs/bali-indonesia-2026.md`. Si una cifra
// no está en el informe, no se inventa.
//
// LO PRIMERO QUE HAY QUE ENTENDER, porque cambia la lectura de todos los números de abajo:
// Bali NO es Dubái ni Paraguay. Indonesia grava la renta MUNDIAL de sus residentes
// fiscales, y un KITAS de más de 183 días de validez es, por norma escrita, prueba de
// intención de residir: eres residente fiscal indonesio desde el primer día aunque pases
// allí menos de 183 días. El propio visado que te legaliza es la prueba que usa su
// Hacienda. SECCIONES 3.1 y 3.2 — art. 4(1) Ley del PPh y art. 2 y 7(1) PMK 18/2021.
//
// Y hay un umbral que no es fiscal y manda sobre todos los demás: el visado E33G exige
// acreditar 60.000 USD/año con extractos bancarios. Por debajo de ~52.650 EUR, Bali no
// está sobre la mesa. SECCIÓN 7, umbral 1.

import { formatoEuros } from './calculos.js';

// Tipo de cambio de TODO el informe: 1 EUR ≈ 20.400 IDR (26/07/2026). Bank Indonesia
// publicó el 28/07/2026 un Kurs Transaksi de 20.402,78 (compra) / 20.613,25 (venta).
// CABECERA del informe. La rupia es volátil: el propio informe avisa de que un presupuesto
// hecho hoy puede desviarse un 5-10 % en un año. Por eso el cambio es editable.
export const IDR_POR_EUR = 20400;

// Mínimo exento (PTKP) de soltero sin hijos: 54.000.000 IDR ≈ 2.647 EUR.
// SECCIÓN 3.4 — art. 17 UU PPh tras la UU HPP 7/2021.
export const PTKP_IDR = 54000000;

// Escala progresiva del PPh vigente en 2026, en RUPIAS porque así está publicada.
// SECCIÓN 3.4 — `ESPECIALIZADO` (PwC y Pajakku, coincidentes); pajak.go.id confirma
// directamente el primer tramo de 60M y el tramo del 35 %.
//
// Fíjate en el tramo del 30 %: empieza en 500 millones ≈ 24.510 EUR de base. Es un
// estándar europeo, no un paraíso: por eso cuanto más ganas, peor sale Bali comparado.
export const TRAMOS_PPH = [
  { hastaIdr: 60000000, tipo: 5 },      // ≈ 2.941 EUR
  { hastaIdr: 250000000, tipo: 15 },    // ≈ 12.255 EUR
  { hastaIdr: 500000000, tipo: 25 },    // ≈ 24.510 EUR
  { hastaIdr: 5000000000, tipo: 30 },   // ≈ 245.098 EUR
  { hastaIdr: Infinity, tipo: 35 },
];

// NPPN: "norma de cálculo de renta neta" para personas físicas con facturación bruta por
// debajo de 4.800 millones IDR. En vez de contabilidad completa se aplica un porcentaje
// normativo a la facturación y SOLO eso se considera renta, que luego pasa por la escala.
// Para el código de actividad 85499 ("Jasa Pendidikan Lainnya Swasta", servicios de
// educación privada) en Denpasar el porcentaje es el 36 %.
// SECCIÓN 3.4 — `OFICIAL`, Anexo II PER-17/PJ/2015.
export const NPPN_PCT = 36;

// PPh Final UMKM: 0,5 % sobre la facturación BRUTA, con los primeros 500 millones IDR
// exentos y tope de facturación en 4.800 millones, sin límite temporal.
// SECCIÓN 3.4 — `OFICIAL`, PP 20/2026, en vigor desde el 22/04/2026.
export const UMKM = {
  tipo: 0.5,
  exentoIdr: 500000000,   // ≈ 24.510 EUR
  topeIdr: 4800000000,    // ≈ 235.294 EUR
};

// Los tres regímenes, del más prudente al más improbable. El informe es explícito:
// "planifica con el escenario progresivo (21-28 % efectivo)". SECCIÓN 3.5.
export const REGIMENES_BALI = ['progresivo', 'nppn', 'umkm'];

export const NOMBRES_REGIMEN = {
  progresivo: 'escala progresiva (lo probable)',
  nppn: 'NPPN al 36 % (si le dejan)',
  umkm: 'PPh Final UMKM al 0,5 % (improbable)',
};

// El visado. Todo `OFICIAL` de imigrasi.go.id. SECCIÓN 2.
//  · ingresoUsd/ingresoEur: 60.000 USD/año acreditados con extractos ≈ 52.650 EUR.
//  · tasaEur: 7.000.000 IDR ≈ 343 EUR de tasas del Estado. Lo que cobran las agencias
//    por encima de eso es su margen, no una tasa.
export const VISADO_E33G = {
  nombre: 'E33G — Visa Rumah Kedua Pekerja Jarak Jauh',
  ingresoUsd: 60000,
  ingresoEur: 52650,
  saldoUsd: 2000,
  tasaEur: 343,
};

// Coste de estructura anual. SECCIÓN 4.1.
//  · estructuraMin/Max: 1.400-5.000 EUR/año (tasas E33G + BPJS + seguro médico
//    internacional, cuyo rango comercial va de 900 a 4.150 y está sesgado al alza).
//  · estructuraAnual: 2.500 EUR/año, el punto medio que usan las tablas de la sección 6.
//  · vidaAustero / vidaCanggu: coste de VIDA, sección 4.2. No entra en el cálculo del
//    neto (ningún escenario lo mete, para que la comparación sea apples-to-apples), pero
//    se guarda aquí porque en Bali es la variable que puede darle la vuelta a todo.
export const COSTES_BALI = {
  estructuraMin: 1400,
  estructuraMax: 5000,
  estructuraAnual: 2500,
  tasasE33G: VISADO_E33G.tasaEur,
  bpjs: 88,
  vidaAustero: 8440,
  vidaCanggu: 16480,
};

// Los tres umbrales de la sección 7, en el orden en el que se cruzan.
//  · legal: 52.650 EUR. Es MIGRATORIO, no fiscal, y es el único que no admite
//    interpretación. Por debajo, Bali no existe como opción legal.
//  · fiscalMin / fiscalMax: 120.000-150.000 EUR, de donde el ahorro empieza a ser serio.
//
// OJO CON LA FILA DE 53.000 DEL INFORME (docs/bali-indonesia-2026.md, sección 7): dice
// "~36.700" de neto español y "+1.400" de diferencia, y las dos están mal. Es la ÚNICA fila
// de esa tabla escrita a ojo: el motor reproduce al euro las de 15.000, 40.000, 80.000 y
// 150.000, y en 53.000 da 36.000 de neto español, no 36.700. La diferencia real en el
// umbral del visado (52.650) es de +2.118,78 EUR con la estructura media, y va de -381,22
// (estructura 5.000) a +3.218,78 (estructura 1.400). Quien necesite esa cifra que la
// calcule con `netoBali` y `netoEspanaAutonomo`, como hace vista-residencia.js: NO se
// copia de ahí.
export const UMBRALES_BALI = {
  legal: 52650,
  fiscalMin: 120000,
  fiscalMax: 150000,
};

// Cripto, que importa porque el usuario cobra por ahí. PMK 50/2025, desde 2026.
// SECCIÓN 3.8 — `OFICIAL`, pajak.go.id. El informe deja dicho que NO ha verificado qué
// pasa con cripto recibido en wallets o exchanges extranjeros siendo residente indonesio.
export const CRIPTO_PPH = {
  exchangeIndonesio: 0.21,
  exchangeExtranjero: 1,
};

// El supuesto con el que se calcula, para poder enseñarlo pegado a la cifra.
export const SUPUESTO_BALI = 'Residente fiscal indonesio con visado E33G, soltero sin hijos, escala progresiva del PPh sobre la renta mundial (mínimo exento PTKP de 54.000.000 IDR) y estructura de 2.500 EUR/año, punto medio de la horquilla 1.400-5.000. No incluye coste de vida (8.440 EUR/año austero, 16.480 en Canggu) ni resuelve lo de Stripe. Por debajo de 52.650 EUR ni siquiera calificas para el visado.';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Igual que en residencia.js: vacío, null o basura -> el valor por defecto; el 0 sobrevive.
// Y con el mismo try, por el mismo motivo: `Number(v)` LANZA con un objeto que tenga una
// clave `toString` no invocable, y estas opciones llegan de una copia importada.
function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
  return Number.isFinite(n) ? n : porDefecto;
}

function pct(v, porDefecto) {
  return Math.min(100, Math.max(0, num(v, porDefecto)));
}

// Cuota de una base recorriendo una escala tramo a tramo (los tramos ya en euros).
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

// Un cambio de 0 o negativo dividiría por cero: se cae al del informe.
function cambio(idrPorEur) {
  const c = num(idrPorEur, IDR_POR_EUR);
  return c > 0 ? c : IDR_POR_EUR;
}

// El porcentaje del beneficio que acaba en el bolsillo. Sin beneficio, null.
function porcentajeBolsillo(neto, beneficio) {
  return beneficio > 0 ? (neto / beneficio) * 100 : null;
}

// ---------------------------------------------------------------------------
// La escala, pasada a euros
// ---------------------------------------------------------------------------

// Los tramos del art. 17 en euros, con el cambio que se le pase. Se expone para poder
// enseñar la tabla en pantalla sin que la vista tenga que dividir nada.
export function escalaPphEnEuros(idrPorEur = IDR_POR_EUR) {
  const c = cambio(idrPorEur);
  return TRAMOS_PPH.map((t) => ({
    hasta: t.hastaIdr === Infinity ? Infinity : t.hastaIdr / c,
    tipo: t.tipo,
    hastaIdr: t.hastaIdr,
  }));
}

// El mínimo exento en euros: 54.000.000 IDR / 20.400 = 2.647,06.
export function ptkpEnEuros(idrPorEur = IDR_POR_EUR) {
  return PTKP_IDR / cambio(idrPorEur);
}

// Los primeros 500.000.000 IDR que el 0,5 % deja exentos, en euros: 24.509,80.
export function umkmExentoEnEuros(idrPorEur = IDR_POR_EUR) {
  return UMKM.exentoIdr / cambio(idrPorEur);
}

// El impuesto indonesio de una RENTA por la escala progresiva. Renta negativa o por debajo
// del mínimo exento -> 0, nunca un número negativo.
//
// Reproduce las cuotas de la sección 3.4 al euro: 15.000 -> 1.568,65 (el informe dice
// ~1.569), 40.000 -> 8.460,78 (~8.461), 80.000 -> 20.460,78 (~20.461) y
// 150.000 -> 41.460,78 (~41.461).
export function impuestoBaliProgresivo(renta, idrPorEur = IDR_POR_EUR) {
  const base = Math.max(0, num(renta, 0) - ptkpEnEuros(idrPorEur));
  return cuotaEscala(base, escalaPphEnEuros(idrPorEur));
}

// NPPN: se considera renta solo el 36 % de la facturación, y ESO pasa por la escala.
//
// Cuadra con la tabla de la sección 3.4 en tres de sus cuatro filas al euro (15.000 -> 138,
// 40.000 -> 1.469, 150.000 -> 12.661). En la de 80.000 el informe publica ~5.019 y la
// escala da 5.100,78: son 82 EUR de diferencia que no salen de aplicar sus propios tramos a
// su propio porcentaje. Se calcula con la regla, no con la celda, y queda dicho aquí.
export function impuestoBaliNppn(facturacion, idrPorEur = IDR_POR_EUR, porcentaje = NPPN_PCT) {
  const bruto = Math.max(0, num(facturacion, 0));
  return impuestoBaliProgresivo(bruto * (pct(porcentaje, NPPN_PCT) / 100), idrPorEur);
}

// PPh Final UMKM: 0,5 % de la facturación bruta que pase de los 500 millones IDR exentos.
// Reproduce la tabla de la sección 3.4 exacta: 15.000 -> 0, 40.000 -> 77,45,
// 80.000 -> 277,45, 150.000 -> 627,45.
export function impuestoBaliUmkm(facturacion, idrPorEur = IDR_POR_EUR, tipo = UMKM.tipo) {
  const bruto = Math.max(0, num(facturacion, 0));
  return Math.max(0, bruto - umkmExentoEnEuros(idrPorEur)) * (pct(tipo, UMKM.tipo) / 100);
}

// ¿Llegas al visado? Es una comprobación de INGRESOS acreditables, no de beneficio limpio,
// pero el informe compara siempre contra la misma magnitud que el resto de escenarios y
// aquí se hace igual para no cambiar de vara de medir a mitad de tabla.
export function calificaE33G(beneficio) {
  return num(beneficio, 0) >= UMBRALES_BALI.legal;
}

// ---------------------------------------------------------------------------
// Opciones
// ---------------------------------------------------------------------------

// Todo lo que el usuario puede tocar de Bali, con el valor que usa el informe.
// Las claves llevan el prefijo `bali` a propósito: viajan dentro del MISMO objeto de
// opciones que usa residencia.js, y así no chocan con las de Dubái o Paraguay.
export function opcionesBaliPorDefecto() {
  return {
    baliRegimen: 'progresivo',
    baliEstructuraAnual: COSTES_BALI.estructuraAnual,
    baliIdrPorEur: IDR_POR_EUR,
    baliNppnPct: NPPN_PCT,
    baliUmkmTipo: UMKM.tipo,
  };
}

// Limpia lo que llega de la vista. Un régimen desconocido cae en 'progresivo', que es el
// que el informe manda usar para planificar.
export function normalizarOpcionesBali(opciones) {
  const x = opciones || {};
  const d = opcionesBaliPorDefecto();
  const regimen = REGIMENES_BALI.includes(x.baliRegimen) ? x.baliRegimen : d.baliRegimen;
  return {
    baliRegimen: regimen,
    baliEstructuraAnual: Math.max(0, num(x.baliEstructuraAnual, d.baliEstructuraAnual)),
    baliIdrPorEur: Math.max(0, num(x.baliIdrPorEur, d.baliIdrPorEur)),
    baliNppnPct: pct(x.baliNppnPct, d.baliNppnPct),
    baliUmkmTipo: pct(x.baliUmkmTipo, d.baliUmkmTipo),
  };
}

// ---------------------------------------------------------------------------
// El escenario
// ---------------------------------------------------------------------------

// Lo que te queda limpio viviendo en Bali: beneficio − impuesto indonesio − estructura.
// Misma forma que netoDubai y netoParaguay, para que `netoDe` y la tabla los traten igual.
//
// Con beneficio negativo no hay impuesto pero la estructura se paga igual: es lo que pasa
// de verdad, y esconderlo daría un neto falsamente bueno en la parte baja.
export function netoBali(beneficio, opciones) {
  const o = normalizarOpcionesBali(opciones);
  const b = num(beneficio, 0);
  const gravable = Math.max(0, b);

  let impuesto;
  if (o.baliRegimen === 'nppn') impuesto = impuestoBaliNppn(gravable, o.baliIdrPorEur, o.baliNppnPct);
  else if (o.baliRegimen === 'umkm') impuesto = impuestoBaliUmkm(gravable, o.baliIdrPorEur, o.baliUmkmTipo);
  else impuesto = impuestoBaliProgresivo(gravable, o.baliIdrPorEur);

  const estructura = o.baliEstructuraAnual;
  const neto = b - impuesto - estructura;
  const califica = calificaE33G(b);

  const avisos = [];
  if (!califica) {
    avisos.push(`Con ${formatoEuros(b)} de beneficio NO calificas para el visado E33G: exige acreditar ${VISADO_E33G.ingresoUsd.toLocaleString('es-ES')} USD al año (unos ${formatoEuros(UMBRALES_BALI.legal)}) con extractos bancarios. Esta cifra enseña la forma de la curva; legalmente esta fila no existe.`);
  }
  avisos.push('Indonesia grava tu renta MUNDIAL, y un KITAS de más de 183 días te hace residente fiscal desde el primer día (art. 2 PMK 18/2021). No es Dubái ni Paraguay.');
  if (o.baliRegimen === 'nppn') {
    avisos.push('El NPPN del 36 % es un régimen para operadores económicos registrados en Indonesia, y el E33G te prohíbe ejercer actividad económica allí. Esa contradicción no la resuelve nadie, ni oficial ni comercial.');
  }
  if (o.baliRegimen === 'umkm') {
    avisos.push('El 0,5 % excluye la renta de fuente extranjera y excluye expresamente a "pengajar" y "pelatih" (profesores y formadores). Una academia de trading es formación. El informe dice que hoy NO puedes construir la mudanza sobre este número.');
  }
  avisos.push(`No incluye el coste de vivir allí: ${formatoEuros(COSTES_BALI.vidaAustero)} al año austero, ${formatoEuros(COSTES_BALI.vidaCanggu)} en Canggu. Y Bali es UTC+8: una clase a las 20:00 de España cae a las 02:00 allí.`);

  return {
    escenario: 'bali',
    beneficio: b,
    regimen: o.baliRegimen,
    impuesto,
    estructura,
    neto,
    califica,
    umbralLegal: UMBRALES_BALI.legal,
    tipoEfectivo: gravable > 0 ? (impuesto / gravable) * 100 : null,
    pctBolsillo: porcentajeBolsillo(neto, b),
    avisos,
  };
}
