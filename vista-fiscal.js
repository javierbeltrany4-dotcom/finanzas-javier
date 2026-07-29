// Vista "Hacienda": la pantalla de los impuestos.
//
// Contesta, por este orden y sin que haya que pensar:
//   1. ¿Tengo algo VENCIDO y cuánto me cuesta hoy?     -> #fis-urgente
//   2. ¿Cuánto dinero tengo que tener guardado ahora?  -> #fis-apartar
//   3. En junio, ¿me devuelven o pongo dinero?         -> #fis-renta
//   4. ¿Qué viene y cuándo?                            -> #fis-calendario
//   5. ¿Por qué me obliga cada modelo?                 -> #fis-modelos
//   6. ¿Qué le pregunto a mi asesoría?                 -> #fis-preguntas
//   7. ¿Qué tengo que comprobar yo?                    -> #fis-pendiente
//
// Aquí solo hay DOM y strings. Toda la aritmética fiscal vive en fiscal.js, que es puro,
// no mira el reloj y no se inventa una cifra: plazos, recargos y sanciones salen de
// docs/situacion-real-cliente-aleman.md con su artículo al lado. Esta vista NO calcula
// impuestos; lo único que hace con números es sumar lo que fiscal.js ya ha devuelto y
// traducirlo a ventas con el mismo `porVenta` que usa el resto de la app.
//
// LAS TRES REGLAS DE ESTA PANTALLA:
//
//  · Nada en euros a secas. Un importe que él controla se dice también en VENTAS, que es lo
//    único que puede mover. "651,01 €" no se puede accionar; "1,3 ventas tuyas", sí.
//
//  · Ningún "consúltalo con un profesional" suelto. Donde hay que preguntar algo va LA
//    PREGUNTA EXACTA, con su botón de copiar (bloque #fis-preguntas y PREGUNTAS de fiscal.js).
//
//  · Ningún susto sin salida. Todo lo rojo lleva su "qué hago" concreto, con la fecha, el
//    importe y el enlace. Y el recargo del art. 27 LGT NO sube cada día: sube de golpe el día
//    que se cumple otro mes completo. Decir "cada día que pasa te cuesta más" sería falso, así
//    que se dice la fecha exacta del salto y cuánto salta.

import {
  MODELOS,
  PORCENTAJE_130,
  PREGUNTAS,
  RECARGO_ART27,
  SANCIONES,
  cuantoApartar,
  vencimientosAbiertos,
} from './fiscal.js';

import {
  MINIMO_PERSONAL_ESTATAL,
  PLAN_PENSIONES,
  PREGUNTAS_RENTA,
  checklistRenta,
  desviacion,
  simularRenta,
} from './renta.js';

import { formatoEuros } from './calculos.js';
import { normalizarModelo, porVenta } from './objetivo.js';
import { normalizarObjetivo } from './patrimonio.js';

// ---------------------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------------------

// La Sede electrónica de la AEAT. Es la dirección oficial y no es una cifra fiscal, así que
// no necesita fuente; lo que NO se hace es inventarse enlaces profundos a cada modelo, que
// cambian de ruta cada temporada y acaban en un 404 el día que más prisa hay.
const URL_SEDE = 'https://sede.agenciatributaria.gob.es/';
// El validador europeo de NIF-IVA. Esta sí sale del informe, §2.1.
const URL_VIES = 'https://ec.europa.eu/taxation_customs/vies/';
// Donde vive la fecha de alta en el RETA, que la app no tiene por ningún otro sitio.
const URL_IMPORTASS = 'https://portal.seg-social.gob.es/wps/portal/importass/importass';

// El MISMO criterio que decisiones.js para saber qué reserva de Patrimonio es la de
// Hacienda. Si el colchón del mes que viene contara como reserva de impuestos, esta pantalla
// diría que está cubierto cuando no lo está, y encima diría lo contrario que "Y ahora qué".
const RE_IMPUESTOS = /impuest|hacienda|irpf|renta|declaraci/i;

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const PERIODICIDAD_TEXTO = {
  trimestral: 'cada trimestre',
  anual: 'una vez al año',
  puntual: 'una sola vez',
};

// ---------------------------------------------------------------------------
// El checklist de lo pendiente
// ---------------------------------------------------------------------------
//
// Es el apartado 2 del informe convertido en casillas. Cada una dice qué comprobar, dónde
// mirarlo en 30 segundos y qué cuesta si está mal, con la cifra sacada de SANCIONES (que a su
// vez sale del informe). El `id` es la clave con la que se guarda: NO se renombra nunca, o el
// usuario pierde lo que ya tenía marcado.
//
// La primera casilla es especial: marcarla le dice a fiscal.js que SÍ está en el ROI, y con
// eso desaparece el trámite del 036 de la lista de urgentes. Por eso su texto no es "he mirado
// el ROI" sino "he mirado y salgo VÁLIDO": marcar una comprobación hecha y marcar un resultado
// correcto no son lo mismo, y de la diferencia depende media pantalla.
const CHECKLIST = [
  {
    id: 'roi',
    titulo: 'He mirado el VIES y mi NIF sale VÁLIDO: estoy dado de alta en el ROI',
    como: `Entra en ${URL_VIES}, elige España, escribe tu NIF y pulsa verificar. Tarda 30 segundos.`,
    siEstaMal: 'Si sale "no válido" NO marques esto: presenta el modelo 036 con las casillas 130 '
      + '(inscripción en el ROI), 582 (alta) y 584 (fecha prevista de la primera operación). '
      + `Sanción censal: ${formatoEuros(SANCIONES.censal)}, o ${formatoEuros(SANCIONES.censalVoluntaria)} `
      + 'si lo presentas tú antes de que te requieran (art. 198.2 LGT). Y ojo: Hacienda tiene TRES '
      + 'MESES para resolver y el silencio es negativo.',
    enlace: URL_VIES,
    enlaceTexto: 'Abrir el VIES',
    fuente: 'Informe §2.1 · art. 3.3.d) RD 1065/2007',
  },
  {
    id: 'nif-gmbh',
    titulo: 'He validado la USt-IdNr. de la GmbH y he guardado el justificante con fecha',
    como: 'Formato DE + 9 dígitos. Hazlo desde la Sede de la AEAT con certificado digital: te '
      + 'genera un justificante con CSV, que es mejor prueba que una captura del portal europeo. '
      + 'Al menos una vez por trimestre.',
    siEstaMal: 'El art. 18.1 del Reglamento (UE) 282/2011 dice "podrá considerar", no "deberá '
      + 'comprobar": no es una obligación sancionable, es un puerto seguro. Pero si no lo validas '
      + 'pierdes la presunción y te toca a ti probar que tu cliente era empresario. Y sin NIF-IVA '
      + 'válido de la GmbH no puedes presentar el modelo 349: el campo es obligatorio.',
    enlace: URL_SEDE,
    enlaceTexto: 'Sede de la AEAT',
    fuente: 'Informe §2.5 · art. 18.1 Reglamento (UE) 282/2011',
  },
  {
    id: 'facturas',
    titulo: 'Mis facturas a la GmbH llevan «inversión del sujeto pasivo» y los dos NIF-IVA',
    como: 'Coge la última factura que le hayas emitido y mira tres cosas: que NO lleve IVA español '
      + 'del 21 %, que lleve esas cuatro palabras exactas, y que consten tu NIF-IVA (ES + tu NIF) '
      + 'y el de la GmbH (DE + 9 dígitos).',
    siEstaMal: 'La mención es obligatoria y es la letra m) del art. 6.1 RD 1619/2012, no la j): '
      + 'poner "operación exenta art. 20 LIVA" está MAL, porque esto no es una exención sino una '
      + 'no sujeción con inversión del sujeto pasivo. Si has facturado CON IVA español por error, '
      + 'se corrige con el art. 89 LIVA (4 años) y tienes que devolverle ese IVA a la GmbH: no es '
      + 'un trámite, es una conversación con David.',
    fuente: 'Informe §2.2 · art. 6.1.m) RD 1619/2012',
  },
  {
    id: 'm349',
    titulo: 'He mirado en la Sede si tengo modelos 349 presentados, y cuáles',
    como: 'Sede de la AEAT con certificado o Cl@ve, apartado "Mis expedientes" o consulta de '
      + 'declaraciones presentadas, y busca el modelo 349.',
    siEstaMal: 'Preséntalos todos, pero DESPUÉS de tener el ROI concedido: necesitas tu NIF-IVA '
      + 'para presentarlo, y hacerlo antes delata las fechas del incumplimiento censal. Cada uno '
      + `sin presentar cuesta entre ${formatoEuros(SANCIONES.informativa349Min)} y `
      + `${formatoEuros(SANCIONES.informativa349Max)}, o entre `
      + `${formatoEuros(SANCIONES.informativa349MinVoluntaria)} y `
      + `${formatoEuros(SANCIONES.informativa349MaxVoluntaria)} si lo presentas tú antes de que te `
      + 'requieran (art. 198.2 LGT).',
    enlace: URL_SEDE,
    enlaceTexto: 'Sede de la AEAT',
    fuente: 'Informe §2.3 · art. 198 LGT',
  },
  {
    id: 'casilla-59',
    titulo: 'Mi asesoría pone mis facturas en la casilla 59 del 303, no en la 120, y me deduce el IVA de mis gastos',
    como: 'Pídele el último modelo 303 presentado y mira las dos casillas. La 59 es informativa: '
      + 'no suma a la base ni a la cuota. Ponerlo en la 59 Y en la 120 duplica.',
    siEstaMal: 'Aunque no repercutas ni un euro de IVA, SÍ puedes deducirte el IVA de tus gastos: '
      + 'son operaciones que originan derecho a deducción. Tu 303 tiene que salir a compensar o a '
      + 'devolver de forma sistemática. Si tu asesoría no te lo está deduciendo, estás perdiendo '
      + 'dinero todos los trimestres.',
    fuente: 'Informe §3.4 · instrucciones AEAT del modelo 303',
  },
  {
    id: 'tarifa-plana',
    titulo: 'Sé la fecha exacta en la que se me acaba la tarifa plana de autónomo',
    como: `Entra en Importass (${URL_IMPORTASS}) y mira la fecha de tu alta en el RETA. La cuota `
      + 'reducida dura 12 meses y la prórroga de otros 12 se pide ANTES de que se cumplan los 12 '
      + 'primeros, y solo si el rendimiento neto del año no llega al SMI.',
    siEstaMal: 'Esto no es de Hacienda, es de la Seguridad Social, pero es la subida de coste fijo '
      + 'más grande que tienes por delante y la app no puede saber la fecha por ti. Mientras no la '
      + `sepas, todo el dashboard calcula con los 80 € de cuota que pagas hoy.`,
    enlace: URL_IMPORTASS,
    enlaceTexto: 'Abrir Importass',
    fuente: 'Informe §2 y ficha de la tarifa plana en "Y ahora qué"',
  },
  {
    id: 'pasarelas',
    titulo: 'Ninguna pasarela ni cuenta del negocio está a mi nombre',
    como: 'Repasa Stripe, PayPal, los exchanges de cripto y las cuentas del negocio: que ninguna '
      + 'esté a tu nombre, con tu NIF, ni contigo como autorizado o beneficiario.',
    siEstaMal: 'Es el riesgo con más importe de todo el informe. Si alguna lo está, Hacienda te '
      + 'puede imputar esos ingresos como tuyos, y entonces el problema deja de ser un 349 sin '
      + 'presentar y pasa a ser una regularización de todos los cobros de la academia. Además, si '
      + 'tienes cuentas fuera (Wise, Revolut) por más de 50.000 €, entra el modelo 720; y cripto '
      + 'custodiada fuera por más de 50.000 € a 31 de diciembre, el modelo 721.',
    fuente: 'Informe §2.6 · art. 42 quater RD 1065/2007',
  },
  {
    id: 'contrato',
    titulo: 'Tengo contrato escrito con la GmbH',
    como: 'Un PDF firmado por las dos partes que diga de dónde sale el 40 %, qué servicio prestas '
      + 'y con qué autonomía.',
    siEstaMal: 'Es lo más barato de arreglar y lo que más te protege. Sin contrato escrito no '
      + 'tienes nada que oponer: ni a una inspección de trabajo, ni a una comprobación de '
      + 'Hacienda, ni a una discusión sobre de dónde sale tu 40 %. La redacción concreta es la '
      + 'pregunta "Socio o proveedor" de aquí abajo.',
    fuente: 'Informe §2.7 y §4',
  },
];

// ---------------------------------------------------------------------------
// Las preguntas, en el orden en que le sirven
// ---------------------------------------------------------------------------
//
// El texto NO se escribe aquí: sale de PREGUNTAS, en fiscal.js, que es donde está la fuente.
// Aquí solo va el rótulo y para qué sirve cada una, que es lo que decide si la manda o no.
const ORDEN_PREGUNTAS = [
  {
    clave: 'regularizacion',
    titulo: 'El plan de regularización, y cuánto cuesta',
    paraQue: 'Es la que más dinero mueve. Pide el orden exacto de los cinco pasos y, sobre todo, '
      + 'que te cuantifiquen la diferencia entre arreglarlo tú ahora y esperar a un requerimiento.',
    fuente: 'Apartado 9, pregunta 2',
  },
  {
    clave: 'roi',
    titulo: '¿Puede Hacienda exigirme el 21 % de IVA por no estar en el ROI?',
    paraQue: 'La más valiosa de todas. El informe sostiene que no -la distinción entre bienes y '
      + 'servicios-, pero avisa de que es una inferencia razonada y no doctrina consolidada. Esta '
      + 'pregunta pide justamente eso: la sentencia, la resolución o la consulta. O que te digan '
      + 'que no existe.',
    fuente: 'Apartado 9, pregunta 1',
  },
  {
    clave: 'sancion349',
    titulo: '¿200 € o 300 € por cada 349 sin presentar?',
    paraQue: 'El informe deja abierto cuál de las dos lecturas del art. 198 LGT aplica, y con '
      + 'varios trimestres pendientes la diferencia se multiplica. Esto lo cierra.',
    fuente: 'Apartado 9, pregunta 2 (apartado b)',
  },
  {
    clave: 'socioOProveedor',
    titulo: '¿Soy socio de la GmbH o solo proveedor?',
    paraQue: 'El dato que cambia la mitad del análisis y que hoy no sabemos. Van los dos '
      + 'escenarios por separado, para que no te contesten solo el que les parezca.',
    fuente: 'Apartado 9, pregunta 3',
  },
  {
    clave: 'dificilJustificacion',
    titulo: '¿Me estáis aplicando el 5 % de gastos de difícil justificación?',
    paraQue: 'Baja el rendimiento neto y con él el modelo 130. La app NO lo aplica porque el '
      + 'informe no confirma si entra en el pago fraccionado o solo en la Renta: por eso se '
      + 'pregunta en vez de calcularlo.',
    fuente: 'Art. 30 RIRPF · laguna declarada del informe',
  },
  {
    clave: 'interesesDemora',
    titulo: '¿Cuál es el tipo de interés de demora de 2026?',
    paraQue: 'Solo hace falta si algún modelo pasa de 12 meses de retraso. El informe no da el '
      + 'tipo vigente, así que la app no lo cuantifica: lo dice y lo pregunta.',
    fuente: 'Art. 27 LGT · laguna declarada del informe (apartado 8)',
  },
  {
    clave: 'calendario2027',
    titulo: '¿Está publicado el calendario de la AEAT para 2027?',
    paraQue: 'El 4T de 2026 y el modelo 390 vencen el 30 de enero de 2027, que cae en sábado. La '
      + 'app enseña esa fecha marcada como no confirmada hasta que salga el calendario oficial.',
    fuente: 'Apartado 8, punto 31',
  },
  {
    clave: 'mudanza',
    titulo: 'Si me mudo a Dubái o a Paraguay, ¿me protege el convenio?',
    paraQue: 'Para la pestaña "Dónde vivir". Lo que decide no es la aritmética de los netos, sino '
      + 'si el convenio te ampara: con EAU probablemente no, por nacionalidad, y con Paraguay hay '
      + 'una trampa en el art. 4.1.',
    fuente: 'Apartado 9, pregunta 4',
  },
  {
    clave: 'riesgoAleman',
    titulo: 'Si me mudo, ¿qué riesgo le genero a David en Alemania?',
    paraQue: 'Esta NO es para tu asesoría española: el informe pide expresamente contrastarla con '
      + 'un Steuerberater alemán. Son normas alemanas, y le tocan a él, no a ti.',
    fuente: 'Apartado 9, pregunta 5',
  },
];

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(v, porDefecto = 0) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
  return Number.isFinite(n) ? n : porDefecto;
}

function esFecha(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
}

// Nunca un NaN ni un Infinity en pantalla: en su lugar, una raya.
function euros(f, n) {
  return Number.isFinite(n) ? f(n) : '—';
}

// Mismo criterio que el resto de la app: un resto diminuto NO se redondea a "0".
function ventasTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  if (x > 0 && x < 0.05) return 'menos de 0,1';
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

// "(1,3 ventas tuyas)" / "(1 venta tuya)". Vacío si no se puede traducir: los euros son la
// consecuencia, las ventas son lo único que él mueve, así que van pegadas a cada cifra.
function colaVentas(v) {
  if (v === null || !Number.isFinite(Number(v))) return '';
  const n = Number(v);
  if (!(n > 0)) return '';
  const una = Math.round(n * 10) / 10 === 1;
  return ` (${ventasTexto(n)} ${una ? 'venta tuya' : 'ventas tuyas'})`;
}

// '2026-07-20' -> '20 de julio de 2026'. Las fechas de Hacienda se leen, no se descifran.
function fechaLarga(iso) {
  if (!esFecha(iso)) return '—';
  const a = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  return `${d} de ${MESES_LARGO[m - 1]} de ${a}`;
}

// '2026-07-20' -> '20 jul'. Para la columna estrecha de la línea de tiempo.
function fechaCorta(iso) {
  if (!esFecha(iso)) return '—';
  return `${Number(iso.slice(8, 10))} ${MESES_LARGO[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

// Los textos de fiscal.js llevan las fechas en ISO ("Si lo presentas antes del 2026-08-20…").
// Ahí dentro son un dato bien puesto -es un módulo, no una pantalla-, pero en mitad de una
// frase se leen como un código de referencia y no como el día que son. Aquí se pasan al
// castellano antes de pintarlas. Es una transformación de PRESENTACIÓN: no toca fiscal.js, no
// cambia ninguna cifra y no rompe ninguna de sus pruebas.
function humanizarFechas(txt) {
  return String(txt ?? '').replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (m) => fechaLarga(m));
}

// Texto que llega de fiscal.js, listo para el HTML: fechas en castellano y escapado.
function txt(v) {
  return esc(humanizarFechas(v));
}

function dias(desdeISO, hastaISO) {
  if (!esFecha(desdeISO) || !esFecha(hastaISO)) return null;
  const a = Date.parse(`${desdeISO}T00:00:00Z`);
  const b = Date.parse(`${hastaISO}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

function plural(n, uno, varios) {
  return `${n} ${n === 1 ? uno : varios}`;
}

const cardPorDefecto = (l, v, mc = '') =>
  `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Etiqueta corta de un vencimiento: "2T de 2026" / "de 2026".
function etiquetaPeriodo(v) {
  return v.periodo === 'anual' ? `de ${v.anio}` : `${v.periodo} de ${v.anio}`;
}

// El nombre del modelo, sin la coletilla larga: "Modelo 130 — pago fraccionado…" -> "Modelo 130".
function nombreCorto(v) {
  return `Modelo ${v.modelo}`;
}

function enlaceSede(texto = 'Presentarlo en la Sede de la AEAT') {
  return `<a class="fis-enlace" href="${URL_SEDE}" target="_blank" rel="noopener">${esc(texto)}</a>`;
}

// ---------------------------------------------------------------------------
// El contexto de la pantalla
// ---------------------------------------------------------------------------
//
// ctx = { datos, modelo, hoyISO, presentados, roi, patrimonio, checklist, f, card }
//
// Lo que llega se normaliza una vez y se le pasa a fiscal.js TAL CUAL: su contrato es suyo,
// no el de esta vista. Lo único que se calcula aquí es la traducción a ventas, y se hace con
// el mismo `porVenta` que usa fiscal.js por dentro para que no salgan dos equivalencias
// distintas de la misma cifra en dos bloques de la misma pantalla.
function prepararCtx(ctx) {
  const c = ctx || {};
  const datos = c.datos || {};
  const modelo = normalizarModelo(c.modelo || (datos.config && datos.config.modelo));
  const hoy = esFecha(c.hoyISO) ? String(c.hoyISO) : '';
  const anio = hoy ? Number(hoy.slice(0, 4)) : null;

  const checklist = c.checklist && typeof c.checklist === 'object' ? c.checklist : {};

  // El ROI sale del checklist: marcar "he mirado el VIES y salgo válido" es la única forma
  // que tiene la app de saberlo. Sin marcar, `null` = no lo sabemos, y fiscal.js lo dice así
  // en vez de dar por bueno ninguno de los dos extremos.
  const roi = checklist.roi === true ? true : (c.roi === true ? true : (c.roi === false ? false : null));

  const presentados = (Array.isArray(c.presentados) ? c.presentados : []).map((p) => ({
    modelo: String((p && p.modelo) ?? ''),
    periodo: String((p && p.periodo) ?? ''),
    anio: Number.isFinite(Number(p && p.anio)) ? Math.trunc(Number(p.anio)) : null,
    fecha: esFecha(p && p.fecha) ? String(p.fecha) : '',
    importe: p && p.importe !== undefined && p.importe !== null && p.importe !== ''
      ? num(p.importe, 0) : null,
  }));

  // El ctx que entiende fiscal.js. Ni un campo de más.
  const ctxFiscal = { datos, modelo, hoyISO: hoy, presentados, roi };

  const abiertos = hoy ? vencimientosAbiertos(ctxFiscal, hoy, { incluirPresentados: true }) : [];
  const apartar = cuantoApartar(ctxFiscal, hoy);

  // Los tres datos de la Renta que la app NO puede saber sola y que él sí puede escribir: el
  // mínimo personal de su comunidad, las reducciones de la base (plan de pensiones) y los
  // gastos deducibles que no están en la hoja. Se guardan en este dispositivo, igual que los
  // modelos presentados y el checklist.
  const ajustesRenta = c.renta && typeof c.renta === 'object' && !Array.isArray(c.renta)
    ? c.renta : {};
  const ctxRenta = { ...ctxFiscal, renta: ajustesRenta };
  const renta = simularRenta(ctxRenta, anio, hoy);
  const desv = desviacion(ctxRenta, anio, hoy);
  const pasosRenta = checklistRenta(ctxRenta, anio);

  const patrimonio = c.patrimonio || {};
  const objetivos = (Array.isArray(patrimonio.objetivos) ? patrimonio.objetivos : [])
    .map(normalizarObjetivo);
  const marcadas = objetivos.filter((o) => o.clase === 'reserva' && RE_IMPUESTOS.test(o.nombre));

  // Lo que sale de aquí es SOLO lo ya calculado, no el ctx de fiscal.js: si las pantallas
  // pudieran volver a llamarle por su cuenta, dos bloques de la misma página acabarían
  // pidiendo la misma cuenta con contextos distintos y enseñando dos cifras.
  return {
    modelo,
    hoy,
    anio,
    roi,
    checklist,
    presentados,
    abiertos,
    apartar,
    ajustesRenta,
    renta,
    desv,
    pasosRenta,
    reserva: {
      importe: marcadas.reduce((acc, o) => acc + o.asignado, 0),
      hay: marcadas.length > 0,
      nombres: marcadas.map((o) => o.nombre),
    },
    // Lo que deja UNA venta antes de impuestos: la vara con la que se traduce cualquier
    // importe a ventas. La misma que usa fiscal.js.
    porVentaMia: porVenta(modelo).miParte,
    f: typeof c.f === 'function' ? c.f : formatoEuros,
    card: typeof c.card === 'function' ? c.card : cardPorDefecto,
  };
}

function enVentas(c, importe) {
  if (!(c.porVentaMia > 0)) return null;
  return Math.max(0, num(importe, 0) / c.porVentaMia);
}

// ¿Consta presentado? Se compara igual que fiscal.js: modelo + periodo + año.
function estaPresentado(c, v) {
  return c.presentados.some((p) => p.modelo === v.modelo
    && p.periodo === v.periodo
    && (p.anio === null || p.anio === v.anio));
}

// Botón de "ya lo he presentado" / "no, todavía no". Lo marcado se guarda y cambia TODA la
// pantalla: es lo único que puede llevar el bloque rojo a verde.
//
// `destacado` solo en el bloque de lo vencido. En la línea de tiempo son catorce filas, y
// catorce botones verdes seguidos decían con el color justo lo contrario que los datos: en
// esta pantalla el verde significa "presentado", y ahí no hay nada presentado todavía.
function botonPresentado(v, presentado, destacado = false) {
  const clave = `${v.modelo}|${v.periodo}|${v.anio}`;
  const estilo = presentado || !destacado ? 'btn-ghost' : 'btn-primary';
  return `<button type="button" class="btn ${estilo} fis-marcar"
    data-fis-presentado="${esc(clave)}" data-estado="${presentado ? '1' : '0'}">${presentado
    ? 'Marcarlo como NO presentado' : 'Ya lo he presentado'}</button>`;
}

// ---------------------------------------------------------------------------
// A) Lo vencido: el bloque que va primero
// ---------------------------------------------------------------------------

// Qué cuesta un vencido HOY, y qué costará después del próximo salto del recargo.
//
// El art. 27 LGT no corre por días: es un 1 % fijo más un 1 % por cada MES COMPLETO. Así que
// no se dice "cada día que pasa te cuesta más" (sería falso), se dice la fecha exacta del
// salto, cuánto salta y cuántos días quedan hasta entonces.
function costeDeUnVencido(c, v) {
  const imp = num(v.importeEstimado, 0);
  const rec = num(v.recargoEur, 0);
  const hoyTotal = imp + rec;

  const pctSalto = num(v.recargoPctTrasElSalto, 0);
  const saltoEur = imp > 0 && pctSalto > 0 ? Math.round(imp * pctSalto) / 100 : 0;
  const saltoTotal = imp + saltoEur;
  const diasAlSalto = v.siguienteSaltoDeRecargo ? dias(c.hoy, v.siguienteSaltoDeRecargo) : null;

  // La reducción del 25 % del art. 27.5 LGT no es un descuento decorativo: es pagar el total
  // de una vez y en plazo. Se dice el importe con reducción, porque es el que va a pagar.
  const conReduccion = v.recargo && Number.isFinite(v.recargo.eurConReduccion)
    ? imp + v.recargo.eurConReduccion
    : null;

  return { imp, rec, hoyTotal, saltoEur, saltoTotal, pctSalto, diasAlSalto, conReduccion };
}

function tarjetaVencido(c, v) {
  const { f } = c;
  const presentado = estaPresentado(c, v);
  const k = costeDeUnVencido(c, v);
  const dRetraso = num(v.diasDeRetraso, 0);

  // La cifra grande. Si sale a ingresar, el dinero; si no, los días, porque ahí lo que corre
  // no es un recargo sino una sanción fija que no crece.
  const grande = k.imp > 0
    ? `<div class="fis-big"><span class="num">${esc(euros(f, k.hoyTotal))}</span><small>si lo presentas hoy${esc(colaVentas(enVentas(c, k.hoyTotal)))}</small></div>`
    : `<div class="fis-big sin-dato"><span class="num">${plural(dRetraso, 'día', 'días')}</span><small>de retraso · no sale a ingresar</small></div>`;

  // Qué pasa si sigue esperando.
  let siEspera = '';
  if (k.imp > 0 && k.saltoEur > 0 && v.siguienteSaltoDeRecargo) {
    const dif = k.saltoTotal - k.hoyTotal;
    siEspera = `<p class="fis-salto">A partir del <strong>${esc(fechaLarga(v.siguienteSaltoDeRecargo))}</strong> `
      + `pasan a ser <strong class="num">${esc(euros(f, k.saltoTotal))}</strong>: `
      + `${esc(euros(f, dif))} más, porque el recargo sube del ${num(v.recargoPct, 0)} % al ${k.pctSalto} %. `
      + (k.diasAlSalto !== null && k.diasAlSalto >= 0
        ? `Te ${k.diasAlSalto === 1 ? 'queda 1 día' : `quedan ${k.diasAlSalto} días`}. `
        : '')
      + 'El recargo del art. 27 LGT no sube cada día: sube de golpe ese día.</p>';
  } else if (k.imp <= 0) {
    const sMin = num(v.sancion, 0);
    const sMax = num(v.sancionMax, 0);
    const sMinVol = num(v.sancionVoluntaria, 0);
    const sMaxVol = num(v.sancionMaxVoluntaria, 0);
    const horquilla = sMax > 0 && sMax !== sMin;
    siEspera = `<p class="fis-salto">No sale a ingresar, así que no hay recargo posible: el recargo `
      + `se calcula sobre lo que hay que pagar. Lo que cabe es la sanción del art. 198 LGT, `
      + (horquilla
        ? `entre ${esc(euros(f, sMin))} y ${esc(euros(f, sMax))}, o entre ${esc(euros(f, sMinVol))} y ${esc(euros(f, sMaxVol))} `
        : `${esc(euros(f, sMin))}, o ${esc(euros(f, sMinVol))} `)
      + 'si lo presentas TÚ antes de que te requieran (art. 198.2 LGT). Esa sanción no crece con '
      + 'los días, pero se dobla el día que llegue el requerimiento.</p>';
  }

  // La reducción del 25 %, solo cuando hay recargo que reducir.
  const reduccion = k.imp > 0 && k.conReduccion !== null
    ? `<p class="fis-nota">Si pagas el total de una vez y en plazo, la reducción del 25 % del `
      + `art. 27.5 LGT lo deja en <strong class="num">${esc(euros(f, k.conReduccion))}</strong>.</p>`
    : '';

  const avisos = (v.avisos || []).length
    ? `<details class="fis-det"><summary>La letra pequeña de este modelo (${(v.avisos || []).length})</summary>
        <ul class="fis-avisos">${(v.avisos || []).map((a) => `<li>${txt(a)}</li>`).join('')}</ul>
      </details>`
    : '';

  return `<article class="fis-vencido${presentado ? ' hecho' : ''}">
    <div class="fis-vencido-cab">
      <span class="fis-modelo">${esc(nombreCorto(v))}</span>
      <span class="fis-periodo">${esc(etiquetaPeriodo(v))}</span>
      <span class="fila-tag ${presentado ? 'meta' : 'ahora'}">${presentado ? 'PRESENTADO' : `${plural(dRetraso, 'DÍA', 'DÍAS')} DE RETRASO`}</span>
    </div>
    <p class="fis-vencido-sub">Venció el ${esc(fechaLarga(v.fechaLimite))}.</p>
    ${presentado ? '' : grande}
    ${presentado ? '<p class="fis-nota">Lo tienes marcado como presentado, así que no cuenta como vencido en ningún otro sitio de la app.</p>' : siEspera}
    ${presentado ? '' : reduccion}
    ${presentado ? '' : `<p class="fis-quehacer">${txt(v.queHacer)}</p>`}
    <div class="fis-acciones">
      ${presentado ? '' : enlaceSede()}
      ${botonPresentado(v, presentado, true)}
    </div>
    ${avisos}
  </article>`;
}

// El trámite del ROI no tiene fecha de calendario -su plazo es "antes de la primera
// operación"-, así que no compite con los vencimientos por fecha: va con su propia tarjeta y
// se dice por qué bloquea al resto (sin ROI no se pueden presentar los 349).
function tarjetaRoi(c, v) {
  const { f } = c;
  const desconocido = v.estado !== 'vencido';
  return `<article class="fis-vencido roi${desconocido ? ' ambar' : ''}">
    <div class="fis-vencido-cab">
      <span class="fis-modelo">Modelo 036</span>
      <span class="fis-periodo">alta en el ROI (VIES)</span>
      <span class="fila-tag ${desconocido ? 'mes' : 'ahora'}">${desconocido ? 'SIN COMPROBAR' : 'SIN ALTA'}</span>
    </div>
    <p class="fis-vencido-sub">Este trámite no tiene fecha de calendario: su plazo es "antes de la
      primera operación intracomunitaria", así que ya va tarde por definición si no estás.</p>
    <div class="fis-big ${desconocido ? 'sin-dato' : ''}">
      <span class="num">${desconocido ? '30 s' : esc(euros(f, SANCIONES.censalVoluntaria))}</span>
      <small>${desconocido ? 'lo que tardas en salir de dudas' : 'sanción si lo presentas tú (art. 198.2 LGT)'}</small>
    </div>
    <p class="fis-salto">Va PRIMERO aunque no sea lo más caro: sin el ROI concedido no puedes
      presentar los modelos 349 pendientes, porque necesitas el NIF-IVA. Presentarlos antes solo
      delata las fechas del incumplimiento censal.</p>
    <p class="fis-quehacer">${txt(v.queHacer)}</p>
    <div class="fis-acciones">
      <a class="fis-enlace" href="${URL_VIES}" target="_blank" rel="noopener">Comprobarlo en el VIES</a>
      ${enlaceSede('Presentar el 036 en la Sede')}
    </div>
    ${(v.avisos || []).length ? `<details class="fis-det"><summary>La letra pequeña del ROI (${v.avisos.length})</summary>
      <ul class="fis-avisos">${v.avisos.map((a) => `<li>${txt(a)}</li>`).join('')}</ul></details>` : ''}
  </article>`;
}

function pintarUrgente(c) {
  const { f } = c;

  if (!c.hoy) {
    return `<div class="fis-cabecera ambar">
      <p class="fis-cab-tit">${ICON_WARN} No sé qué día es hoy</p>
      <p class="fis-cab-sub">Sin la fecha de hoy no puedo decirte qué tienes vencido ni cuánto
        recargo corre. Vuelve a abrir la app.</p>
    </div>`;
  }

  const roi = c.abiertos.find((v) => v.modelo === '036');
  const vencidos = c.abiertos
    .filter((v) => v.modelo !== '036' && v.estado === 'vencido' && !estaPresentado(c, v))
    // Primero lo que cuesta dinero y tiene el reloj del recargo en marcha; después lo que
    // solo expone a una sanción fija, de lo más antiguo a lo más nuevo.
    .sort((a, b) => {
      const ia = num(a.importeEstimado, 0);
      const ib = num(b.importeEstimado, 0);
      if ((ib > 0) !== (ia > 0)) return ib > 0 ? 1 : -1;
      if (ib !== ia) return ib - ia;
      return String(a.fechaLimite).localeCompare(String(b.fechaLimite));
    });

  // Los que ya ha marcado como presentados pero que llegaron tarde. fiscal.js les cambia el
  // estado a 'presentado' y les pone el retraso a cero, así que lo tardío se reconoce por la
  // fecha, no por el estado. Se guardan plegados: la lista de hoy no lista lo ya hecho.
  const yaPresentados = c.abiertos.filter((v) => v.modelo !== '036'
    && v.estado === 'presentado' && v.fechaLimite && v.fechaLimite < c.hoy);

  // ESTÁS AL DÍA. Solo si no hay nada vencido Y el ROI no está en duda: decir "al día" con el
  // censo sin comprobar sería exactamente el tipo de tranquilidad que luego sale cara.
  // (`roi` solo existe cuando NO consta el alta; con el ROI confirmado, fiscal.js no lo saca.)
  if (!vencidos.length && !roi) {
    const siguiente = c.abiertos.find((v) => v.fechaLimite && v.estado !== 'vencido' && !estaPresentado(c, v));
    const quedan = siguiente ? dias(c.hoy, siguiente.fechaLimite) : null;
    return `<div class="fis-cabecera verde">
      <p class="fis-cab-tit">${ICON_CHECK} Estás al día</p>
      <p class="fis-cab-sub">${siguiente
        ? `No tienes nada vencido. Lo siguiente es el ${esc(nombreCorto(siguiente))} ${esc(etiquetaPeriodo(siguiente))}: `
          + `el plazo cierra el ${esc(fechaLarga(siguiente.fechaLimite))}`
          + (quedan !== null ? `, dentro de ${plural(quedan, 'día', 'días')}` : '')
          + '. Está abajo, en el calendario.'
        : 'No tienes nada vencido y no queda ningún vencimiento abierto.'}</p>
    </div>`;
  }

  // Los dos números que resumen el susto: lo que hay que PAGAR hoy y lo que se expone en
  // sanciones. No se suman en una sola cifra a propósito: son dos cosas distintas y una de
  // ellas es una horquilla, no un importe.
  const aPagar = vencidos.reduce((acc, v) => acc + costeDeUnVencido(c, v).hoyTotal, 0);
  const sinIngreso = vencidos.filter((v) => !(num(v.importeEstimado, 0) > 0));
  const sancionMin = sinIngreso.reduce((acc, v) => acc + num(v.sancionVoluntaria, 0), 0);
  const sancionMax = sinIngreso.reduce((acc, v) => acc + (num(v.sancionMaxVoluntaria, 0) || num(v.sancionVoluntaria, 0)), 0);

  const cabecera = `<div class="fis-cabecera rojo">
    <p class="fis-cab-tit">${ICON_WARN} ${vencidos.length === 1
      ? 'Tienes 1 modelo vencido sin presentar'
      : `Tienes ${vencidos.length} modelos vencidos sin presentar`}</p>
    <p class="fis-cab-sub">${aPagar > 0
      ? `Si los presentas hoy son <strong class="num">${esc(euros(f, aPagar))}</strong> de dinero a ingresar, recargo incluido${esc(colaVentas(enVentas(c, aPagar)))}.`
      : 'Ninguno sale a ingresar, así que no hay recargo: lo que corre son sanciones.'}
      ${sinIngreso.length
    ? ` Y ${sinIngreso.length === 1 ? 'el que no sale a ingresar expone' : `los ${sinIngreso.length} que no salen a ingresar exponen`} `
        + `a ${sancionMax !== sancionMin ? `entre ${esc(euros(f, sancionMin))} y ${esc(euros(f, sancionMax))}` : esc(euros(f, sancionMin))} `
        + 'de sanción presentándolos tú, y el doble si llega antes un requerimiento (art. 198 LGT).'
    : ''}</p>
    <p class="fis-cab-sub">Presentarlo tú, antes de que Hacienda pregunte, vale entre la mitad y la
      cuarta parte que esperar. El art. 27 LGT solo aplica si regularizas ANTES del requerimiento:
      si llega el requerimiento primero, se acabó el recargo y entra el art. 191 LGT.</p>
  </div>`;

  const tarjetas = vencidos.map((v) => tarjetaVencido(c, v)).join('');
  const roiHtml = roi ? tarjetaRoi(c, roi) : '';

  const hechos = yaPresentados.length
    ? `<details class="fis-det fis-hechos"><summary>Ya presentados fuera de plazo (${yaPresentados.length})</summary>
        ${yaPresentados.map((v) => tarjetaVencido(c, v)).join('')}</details>`
    : '';

  return `${cabecera}${roiHtml}${tarjetas}${hechos}
    <p class="fis-pie">Cuando presentes uno, márcalo aquí: se guarda en este dispositivo y toda la
      pantalla se recalcula, incluido el semáforo de "Y ahora qué".</p>`;
}

// ---------------------------------------------------------------------------
// B) Cuánto tiene que tener guardado hoy
// ---------------------------------------------------------------------------

function pintarApartar(c) {
  const { f, card } = c;
  const a = c.apartar;

  if (!c.hoy) {
    return '<p class="mc">Sin la fecha de hoy no puedo decirte cuánto apartar: sin saber qué día es '
      + 'no sé qué trimestres han cerrado. Cierra la app y vuelve a abrirla; si sigue igual, '
      + 'reinicia el móvil, porque el reloj del sistema es lo único que puede estar fallando.</p>';
  }

  const grande = `<div class="fis-big${a.guardarHoy > 0 ? ' rojo' : ' verde'}">
    <span class="num">${esc(euros(f, a.guardarHoy))}</span>
    <small>${a.guardarHoy > 0
    ? `deberías tenerlos apartados HOY${esc(colaVentas(a.guardarHoyEnVentas))}`
    : 'no tienes nada que apartar hoy'}</small>
  </div>`;

  // POR QUÉ ese número y no otro. Es el mayor de dos cosas, y decir cuál manda es la
  // diferencia entre una cifra que se entiende y una que da miedo.
  const yaDebido = Math.max(0, a.yaDevengado - a.yaIngresado);
  const vencidoTotal = a.vencidoSinIngresar + a.recargoQueCorre;
  const mandaVencido = vencidoTotal >= yaDebido;
  const porQue = a.guardarHoy > 0
    ? `<p class="fis-porque">Sale de lo mayor de estas dos: <strong>${esc(euros(f, vencidoTotal))}</strong>
        de modelos 130 ya vencidos con su recargo, y <strong>${esc(euros(f, yaDebido))}</strong> de IRPF
        que ya has devengado este año y no está ingresado. Manda ${mandaVencido
    ? 'lo vencido, porque es dinero que hay que soltar ya'
    : 'lo devengado, porque el año va por delante de lo que has pagado'}.</p>`
    : '';

  const tarjetas = `<div class="grid grid-4">
    ${card('Los cuatro 130 del año', `<span class="num">${esc(euros(f, a.pagosFraccionados))}</span>`, 'suma de los cuatro trimestres, con los abiertos proyectados')}
    ${card('Tu IRPF real del año', `<span class="num">${esc(euros(f, a.irpfAnual))}</span>`, 'escala progresiva sobre lo que facturas: esto es el impuesto de verdad')}
    ${card('Cada trimestre que queda', `<span class="num">${esc(euros(f, a.porTrimestre))}</span>`, a.porTrimestre > 0 ? `unas ${ventasTexto(enVentas(c, a.porTrimestre))} ventas tuyas` : 'nada, a tu ritmo de ahora')}
    ${card('A apartar cada mes', `<span class="num">${esc(euros(f, a.mensualRecomendado))}</span>`, 'hasta diciembre, en una cuenta que no toques')}
  </div>`;

  // El enlace con Mi patrimonio. Sin esto, "aparta 651,01 €" y la reserva real de Patrimonio
  // vivían en dos pantallas que nunca se miraban entre sí.
  const falta = Math.max(0, a.guardarHoy - c.reserva.importe);
  let bloqueReserva;
  if (!(a.guardarHoy > 0)) {
    bloqueReserva = `<div class="fis-reserva verde">
      <p class="fis-reserva-tit">${ICON_CHECK} Nada que mover</p>
      <p class="fis-reserva-txt">Hoy no hay ningún 130 vencido ni IRPF devengado sin cubrir. Cuando
        vuelvas a facturar, esto se recalcula solo.</p>
    </div>`;
  } else if (!c.reserva.hay) {
    bloqueReserva = `<div class="fis-reserva rojo">
      <p class="fis-reserva-tit">${ICON_WARN} No tienes reserva de impuestos en Mi patrimonio</p>
      <p class="fis-reserva-txt">Te faltan <strong class="num">${esc(euros(f, falta))}</strong> por
        apartar${esc(colaVentas(enVentas(c, falta)))}, y ahora mismo ese dinero no está etiquetado en
        ninguna parte: para la app, y para ti al mirar el saldo, parece tuyo.</p>
      <p class="fis-reserva-txt"><strong>Qué hacer:</strong> entra en Mi patrimonio, crea un objetivo
        de clase "reserva", llámalo <strong>Impuestos</strong> y mete ahí ${esc(euros(f, falta))}.
        Este hueco no se tapa vendiendo: el dinero ya lo tienes o va a entrar; lo que falta es la
        etiqueta.</p>
      <button type="button" class="btn btn-primary" data-ir="patrimonio">Ir a Mi patrimonio</button>
    </div>`;
  } else if (falta > 0) {
    bloqueReserva = `<div class="fis-reserva rojo">
      <p class="fis-reserva-tit">${ICON_WARN} Tu reserva no llega</p>
      <p class="fis-reserva-txt">En <strong>${esc(c.reserva.nombres.join(', '))}</strong> tienes
        <strong class="num">${esc(euros(f, c.reserva.importe))}</strong> y hoy hacen falta
        <strong class="num">${esc(euros(f, a.guardarHoy))}</strong>: te faltan
        <strong class="num">${esc(euros(f, falta))}</strong>${esc(colaVentas(enVentas(c, falta)))}.</p>
      <p class="fis-reserva-txt"><strong>Qué hacer:</strong> mueve ${esc(euros(f, falta))} a esa
        reserva en Mi patrimonio. Ese dinero no es tuyo, es de Hacienda con retraso.</p>
      <button type="button" class="btn btn-primary" data-ir="patrimonio">Ir a Mi patrimonio</button>
    </div>`;
  } else {
    bloqueReserva = `<div class="fis-reserva verde">
      <p class="fis-reserva-tit">${ICON_CHECK} Tu reserva cubre lo de hoy</p>
      <p class="fis-reserva-txt">En <strong>${esc(c.reserva.nombres.join(', '))}</strong> tienes
        <strong class="num">${esc(euros(f, c.reserva.importe))}</strong> contra los
        ${esc(euros(f, a.guardarHoy))} que hacen falta hoy. Te sobran
        <strong class="num">${esc(euros(f, c.reserva.importe - a.guardarHoy))}</strong>.</p>
    </div>`;
  }

  // Lo que pasa en junio. Los dos casos son noticia, y el bueno también hay que darlo: el
  // 20 % del 130 es un porcentaje fijo, no su tipo, y por eso suele adelantar de más.
  let renta = '';
  if (a.devolucionEsperada > 0) {
    renta = `<p class="fis-porque">En la Renta te devolverían unos
      <strong class="num">${esc(euros(f, a.devolucionEsperada))}</strong>: los cuatro 130 suman
      ${esc(euros(f, a.pagosFraccionados))} y tu IRPF real proyectado son ${esc(euros(f, a.irpfAnual))}.
      No es un error, es cómo funciona el 20 % fijo del art. 110.1.a) RIRPF: es un anticipo, no tu
      tipo. Pero hasta junio ese dinero está fuera de tu bolsillo.</p>`;
  } else if (a.aPagarEnRenta > 0) {
    renta = `<p class="fis-porque">Ojo a junio: los 130 del año (${esc(euros(f, a.pagosFraccionados))})
      NO cubren tu IRPF real proyectado (${esc(euros(f, a.irpfAnual))}). Te tocaría poner
      <strong class="num">${esc(euros(f, a.aPagarEnRenta))}</strong> más
      ${esc(colaVentas(enVentas(c, a.aPagarEnRenta)))}. Apártalo desde ya, no en mayo.</p>`;
  }

  const porTrimestre = a.detallePorTrimestre.map((t) => {
    const clase = t.estado === 'vencido' ? 'rojo' : (t.estado === 'vence-pronto' ? 'ambar' : '');
    const etq = t.estado === 'presentado' ? 'presentado'
      : (t.estado === 'vencido' ? 'vencido' : (t.estado === 'vence-pronto' ? 'plazo abierto' : 'por venir'));
    return `<tr class="${clase}">
      <td>${esc(t.periodo)}</td>
      <td>${esc(fechaCorta(t.fechaLimite))}</td>
      <td class="num">${esc(euros(f, t.importe))}${t.proyectado ? '<span class="badge-est">estimado</span>' : ''}</td>
      <td class="num">${t.recargo > 0 ? esc(euros(f, t.recargo)) : '—'}</td>
      <td>${esc(etq)}</td>
    </tr>`;
  }).join('');

  const avisos = a.avisos.length
    ? `<details class="fis-det"><summary>Por qué salen estas cifras (${a.avisos.length})</summary>
        <ul class="fis-avisos">${a.avisos.map((x) => `<li>${txt(x)}</li>`).join('')}</ul></details>`
    : '';

  return `${grande}${porQue}${bloqueReserva}${tarjetas}${renta}
    <div class="tabla-wrap fis-tabla">
      <table><thead><tr>
        <th>Trimestre</th><th>Vence</th><th class="num">Modelo 130</th><th class="num">Recargo</th><th>Estado</th>
      </tr></thead><tbody>${porTrimestre}</tbody></table>
    </div>
    ${avisos}
    <p class="fis-pie">La columna del 130 sale de tus retiros, no de tus facturas: son lo único que
      la app conoce. Si tus facturas a la GmbH no coinciden con lo que has ido retirando, manda lo
      que digan las facturas y esta tabla se queda corta o larga.</p>`;
}

// ---------------------------------------------------------------------------
// C) La Renta: qué pasa en junio
// ---------------------------------------------------------------------------
//
// El bloque que cierra la frase que empieza arriba. Arriba se dice cuánto tiene que tener
// guardado HOY; aquí, qué pasa con todo eso cuando se liquide de verdad. Y con sus cifras la
// respuesta es buena: le devuelven. Eso también hay que decirlo, y decirlo con la condición
// pegada, porque una devolución que depende de presentar cuatro modelos no es una devolución
// todavía: es una promesa con requisitos.
//
// Aquí NO se calcula nada. Los números vienen de renta.js, que es puro y cita su artículo en
// cada línea; esta función solo los coloca.

// El desglose, línea a línea, tal y como lo devuelve renta.js. Se pinta como una cuenta y no
// como una lista: lo que resta va en negativo y con su signo, porque así es como se sigue.
function tablaDesgloseRenta(c) {
  const { f } = c;
  const filas = (c.renta.detalle || []).map((fila) => {
    // Las tres líneas de subtotal se marcan: son las que él va a mirar.
    const clave = /Rendimiento neto|Base liquidable|Cuota líquida|Resultado/.test(fila.concepto);
    const resultado = /^Resultado/.test(fila.concepto);
    return `<tr class="${clave ? 'sub' : ''}${resultado ? ' fin' : ''}">
      <td>${esc(fila.concepto)}</td>
      <td class="num ${fila.eur < 0 ? 'neg' : ''}">${esc(euros(f, fila.eur))}</td>
      <td class="fis-renta-art">${esc(fila.articulo || '')}</td>
    </tr>`;
  }).join('');

  return `<div class="tabla-wrap fis-tabla fis-renta-tabla">
    <table><thead><tr>
      <th>Concepto</th><th class="num">Importe</th><th>De dónde sale</th>
    </tr></thead><tbody>${filas}</tbody></table>
  </div>`;
}

// Los tres campos que la app no puede saber sola. Van con su valor actual, su explicación y
// su pregunta: escribir aquí un número que te has inventado es peor que dejarlo vacío.
function camposRenta(c) {
  const { f } = c;
  const a = c.ajustesRenta;
  const valor = (k) => (a && a[k] !== undefined && a[k] !== null && a[k] !== '' ? a[k] : '');

  return `<details class="fis-det fis-renta-campos">
    <summary>Afinar la simulación con lo que la app no sabe (3 datos)</summary>
    <p class="fis-nota">Nada de esto se inventa: mientras no lo escribas, la simulación usa el
      mínimo estatal y cero reducciones, y lo dice. Lo que escribas se guarda en este dispositivo.</p>
    <div class="fis-renta-campo">
      <label class="fis-importe">Mínimo personal de tu comunidad
        <input type="number" step="0.01" min="0" inputmode="decimal"
          data-fis-renta="minimoPersonal" value="${esc(valor('minimoPersonal'))}"
          placeholder="${Number(MINIMO_PERSONAL_ESTATAL).toFixed(2)}" />
      </label>
      <span class="mc">Por defecto el estatal, ${esc(euros(f, MINIMO_PERSONAL_ESTATAL))}. Madrid
        ${esc(euros(f, 5956.65))} · Andalucía ${esc(euros(f, 5790))} · C. Valenciana
        ${esc(euros(f, 6105))} · Cataluña ${esc(euros(f, 5550))}. Pídeselo a tu asesoría con la
        pregunta de más abajo: sin él, esta cuenta aproxima.</span>
    </div>
    <div class="fis-renta-campo">
      <label class="fis-importe">Reducciones de la base (plan de pensiones)
        <input type="number" step="0.01" min="0" inputmode="decimal"
          data-fis-renta="reducciones" value="${esc(valor('reducciones'))}" placeholder="0,00" />
      </label>
      <span class="mc">Hasta ${esc(euros(f, PLAN_PENSIONES.general))} en un plan normal y hasta
        ${esc(euros(f, PLAN_PENSIONES.maximo))} si es de empleo simplificado de autónomos
        (${esc(PLAN_PENSIONES.articulo)}). Es lo único que todavía puede cambiar la cifra, y
        caduca el 31 de diciembre.</span>
    </div>
    <div class="fis-renta-campo">
      <label class="fis-importe">Otros gastos deducibles del año
        <input type="number" step="0.01" min="0" inputmode="decimal"
          data-fis-renta="otrosGastos" value="${esc(valor('otrosGastos'))}" placeholder="0,00" />
      </label>
      <span class="mc">Seguro de salud, suministros con afectación declarada en el 036, formación,
        herramientas. Aquí solo están la cuota de autónomo y la asesoría, que son los que la app
        conoce con certeza. Con justificante: esto lo firmas tú.</span>
    </div>
  </details>`;
}

// Los pasos hasta junio, en orden. Cada uno con su porqué, su acción y su pregunta lista para
// copiar. El orden no es el del impreso: es el de los relojes.
function pasosRentaHtml(c) {
  const items = (c.pasosRenta || []).map((p) => {
    const marca = p.hecho === true ? 'hecho' : (p.hecho === false ? 'pendiente' : 'nose');
    const etq = p.hecho === true
      ? '<span class="fila-tag meta">HECHO</span>'
      : (p.hecho === false ? '<span class="fila-tag ahora">TE FALTA</span>' : '');
    const idPregunta = `fis-renta-preg-${esc(p.id)}`;
    const pregunta = p.pregunta
      ? `<details class="fis-det">
          <summary>La pregunta exacta para tu asesoría</summary>
          <p class="fis-preg-txt" id="${idPregunta}">${esc(p.pregunta)}</p>
          <div class="fis-acciones">
            <button type="button" class="btn btn-ghost fis-copiar" data-copiar="${idPregunta}">${ICON_COPY} Copiar</button>
          </div>
        </details>`
      : '';
    return `<li class="fis-renta-paso ${marca}">
      <div class="fis-renta-paso-cab">
        <span class="fis-renta-n num">${p.orden}</span>
        <span class="fis-renta-tit">${esc(p.titulo)}</span>
        ${etq}
      </div>
      <p class="fis-paso-si">${txt(p.porQue)}</p>
      <p class="fis-quehacer">${txt(p.queHacer)}</p>
      <p class="mc">Cuándo: ${txt(p.cuando)}${p.fechaLimite ? ` · tope el ${esc(fechaLarga(p.fechaLimite))}` : ''}</p>
      ${pregunta}
      <p class="fis-fuente">${esc(p.fuente)}</p>
    </li>`;
  }).join('');

  return `<ol class="fis-renta-pasos">${items}</ol>`;
}

function pintarRenta(c) {
  const { f, card } = c;

  if (!c.hoy) {
    return '<p class="mc">Sin la fecha de hoy no puedo simular la Renta: no sé de qué ejercicio '
      + 'estamos hablando ni qué trimestres han cerrado. Cierra la app y vuelve a abrirla.</p>';
  }

  const r = c.renta;
  const d = c.desv;

  if (!r.conocido) {
    return `<p class="mc">${txt(r.frase)}</p>
      <p class="fis-quehacer">${txt(r.queHacer)}</p>`;
  }

  const devuelven = r.aDevolver > 0;
  const paga = r.aPagar > 0;

  const grande = `<div class="fis-big ${devuelven ? 'verde' : (paga ? 'rojo' : 'sin-dato')}">
    <span class="num">${esc(euros(f, devuelven ? r.aDevolver : r.aPagar))}</span>
    <small>${devuelven
    ? `te DEVUELVEN en la Renta de ${r.anio}${esc(colaVentas(r.resultadoEnVentas))}`
    : (paga
      ? `te toca PAGAR en la Renta de ${r.anio}${esc(colaVentas(r.resultadoEnVentas))}`
      : `la Renta de ${r.anio} te sale a cero`)}</small>
  </div>`;

  // La frase clara, en una línea, sin que haya que leer la tabla.
  const frase = `<p class="fis-quehacer">${txt(d.frase)}</p>
    <p class="fis-porque">${txt(r.queHacer)}</p>`;

  // LA CONDICIÓN. Va antes que la tabla y con el color de lo urgente cuando falta algo: una
  // devolución que depende de cuatro modelos sin presentar no es una devolución todavía.
  let condicion = '';
  if (r.pagos.fuente !== 'presentados') {
    const faltan = r.pagos.detalle.filter((t) => !t.presentado);
    condicion = `<div class="fis-reserva rojo">
      <p class="fis-reserva-tit">${ICON_WARN} Esta cuenta tiene una condición</p>
      <p class="fis-reserva-txt">En la Renta solo se resta lo que de verdad has ingresado. De los
        <strong class="num">${esc(euros(f, r.pagosACuenta))}</strong> de modelos 130 que se restan
        aquí, ahora mismo consta ingresado <strong class="num">${esc(euros(f, r.pagos.ingresado))}</strong>:
        te faltan ${faltan.length === 1 ? 'el' : 'los'} <strong>${esc(faltan.map((t) => t.periodo).join(', '))}</strong>,
        <strong class="num">${esc(euros(f, r.pagos.pendiente))}</strong>.</p>
      <p class="fis-reserva-txt"><strong>Qué hacer:</strong> presenta esos modelos 130. Ese dinero no
        se pierde: es exactamente lo que vuelve en junio. Lo que sí se pierde es el recargo del
        art. 27 LGT por cada mes completo que sigas esperando, y ese no vuelve.</p>
    </div>`;
  } else {
    condicion = `<div class="fis-reserva verde">
      <p class="fis-reserva-tit">${ICON_CHECK} Los cuatro modelos 130 constan presentados</p>
      <p class="fis-reserva-txt">Los <strong class="num">${esc(euros(f, r.pagosACuenta))}</strong> que
        se restan aquí son dinero que ya has ingresado, así que esta cuenta se sostiene sola.</p>
    </div>`;
  }

  const tarjetas = `<div class="grid grid-4">
    ${card('Lo que facturas en el año', `<span class="num">${esc(euros(f, r.ingresos))}</span>`,
    r.proyectado ? 'proyección al ritmo de este año, no un dato cerrado' : 'dato cerrado del ejercicio')}
    ${card('Tu IRPF real del año', `<span class="num">${esc(euros(f, r.cuotaLiquida))}</span>`,
    `tipo medio del ${esc(String(Math.round(r.tipoMedio * 10) / 10).replace('.', ','))} %, marginal del ${r.tipoMarginal} %`)}
    ${card('Los cuatro modelos 130', `<span class="num">${esc(euros(f, r.pagosACuenta))}</span>`,
    'el 20 % fijo del art. 110.1.a) RIRPF: un anticipo, no tu tipo')}
    ${card(devuelven ? 'Diferencia a tu favor' : 'Diferencia en tu contra',
    `<span class="num">${esc(euros(f, Math.abs(r.resultado)))}</span>`,
    devuelven ? 'sale en junio del año que viene' : 'lo tienes que poner tú en junio')}
  </div>`;

  // Por qué el 20 % le deja de más. Es la explicación que quita el "esto está mal calculado".
  const porQue = devuelven
    ? `<p class="fis-porque">Adelantas al <strong>${PORCENTAJE_130} %</strong> y liquidas al
        <strong>${esc(String(Math.round(r.tipoMedio * 10) / 10).replace('.', ','))} %</strong>. No es un
        error de nadie: el modelo 130 es un porcentaje fijo del art. 110.1.a) RIRPF sobre el
        rendimiento neto, y tu tipo real sale de la escala progresiva con el mínimo personal
        descontado. La diferencia vuelve en junio. Hasta entonces, ese dinero está fuera de tu
        bolsillo: no cuentes con él antes.</p>`
    : `<p class="fis-porque">El <strong>${PORCENTAJE_130} %</strong> del modelo 130 se te queda corto:
        tu tipo real ya es del
        <strong>${esc(String(Math.round(r.tipoMedio * 10) / 10).replace('.', ','))} %</strong>. Esa
        diferencia no desaparece, se acumula hasta junio. Apártala ahora, no en mayo.</p>`;

  // Las dos lecturas del 5 %. Es la única forma honesta de que esta pantalla y la de "cuánto
  // apartar" digan cifras distintas sin parecer que una de las dos está rota.
  const dosLecturas = r.dificilJustificacion.aplicado
    ? `<div class="fis-salto">
        <p>Aquí se aplica el <strong>${r.dificilJustificacion.porcentaje} %</strong> de gastos de
          difícil justificación (<strong class="num">${esc(euros(f, r.dificilJustificacion.eur))}</strong>,
          ${esc(r.dificilJustificacion.articulo)}). Arriba, en "cuánto tienes que tener guardado", NO
          se aplica: el informe lo trata para la Renta y no confirma si entra también en el pago
          fraccionado del 130.</p>
        <p>Por eso las dos cifras no coinciden, y la diferencia es exactamente
          <strong class="num">${esc(euros(f, Math.abs(r.sinDificilJustificacion.diferencia)))}</strong>:
          con el 5 % ${devuelven ? 'te devuelven' : 'pagas'}
          <strong class="num">${esc(euros(f, devuelven ? r.aDevolver : r.aPagar))}</strong>, y sin él,
          <strong class="num">${esc(euros(f, r.sinDificilJustificacion.aDevolver > 0
    ? r.sinDificilJustificacion.aDevolver : r.sinDificilJustificacion.aPagar))}</strong>.
          No es un error de la app: es una pregunta sin cerrar, y ese es su precio exacto.</p>
        <div class="fis-acciones">
          <button type="button" class="btn btn-ghost fis-copiar" data-copiar="fis-renta-preg-dj">${ICON_COPY} Copiar la pregunta que lo cierra</button>
        </div>
        <p class="fis-preg-txt fis-oculto" id="fis-renta-preg-dj">${esc(PREGUNTAS_RENTA.dificilJustificacion2026)}</p>
      </div>`
    : `<div class="fis-salto"><p>Has desactivado el ${r.dificilJustificacion.porcentaje} % de gastos
        de difícil justificación (${esc(r.dificilJustificacion.articulo)}). Si te corresponde, esta
        simulación te está haciendo pagar de más.</p></div>`;

  const avisos = (r.avisos || []).length
    ? `<details class="fis-det"><summary>Por qué salen estas cifras y qué no está confirmado (${r.avisos.length})</summary>
        <ul class="fis-avisos">${r.avisos.map((x) => `<li>${txt(x)}</li>`).join('')}</ul></details>`
    : '';

  const campana = r.campanaDesde && r.campanaHasta
    ? `<p class="fis-pie">La campaña va del ${esc(fechaLarga(r.campanaDesde))} al
        ${esc(fechaLarga(r.campanaHasta))}${r.campanaConfirmada ? '' : ', aunque el día exacto de cierre '
      + 'no está confirmado en el informe: sale de la regla general, no del calendario oficial'}.</p>`
    : '';

  return `${grande}${frase}${condicion}${tarjetas}${porQue}
    <p class="fis-l">El desglose entero, línea a línea</p>
    ${tablaDesgloseRenta(c)}
    ${dosLecturas}
    ${camposRenta(c)}
    <p class="fis-l">Qué tienes que tener listo antes de junio, en orden</p>
    ${pasosRentaHtml(c)}
    ${avisos}
    ${campana}
    <p class="fis-pie">Esto es una simulación con lo que la app sabe: tus retiros, tu cuota de
      autónomo y tu asesoría. La escala es la estatal más una aproximación autonómica, así que
      sirve para llegar a junio sin sorpresas, no para liquidar. Quien firma la declaración es tu
      asesoría.</p>`;
}

// ---------------------------------------------------------------------------
// D) El calendario del año, como línea de tiempo
// ---------------------------------------------------------------------------

// Qué pasa si NO lo presenta. Cada modelo tiene su respuesta y todas salen del informe.
function quePasaSiNo(c, v) {
  const { f } = c;
  const imp = num(v.importeEstimado, 0);

  if (v.modelo === '100') {
    // El informe no cuantifica la Renta fuera de plazo, así que no se inventa un número.
    return 'El informe no cuantifica qué pasa si la Renta se presenta fuera de plazo, así que aquí '
      + 'no me lo invento. Lo que sí es seguro: aquí se resta todo lo que hayas pagado en los 130 '
      + 'del año, así que no presentarla es regalar ese dinero. Pregúntaselo a tu asesoría con la '
      + 'pregunta del calendario, ahí abajo.';
  }
  if (imp > 0) {
    return `Recargo del art. 27 LGT: ${RECARGO_ART27.base} % fijo el primer mes, más `
      + `${RECARGO_ART27.porMesCompleto} % por cada mes completo de retraso, hasta `
      + `${RECARGO_ART27.mesesMaximo} meses; después, ${RECARGO_ART27.masDeDoceMeses} % más intereses `
      + `de demora. Sobre ${euros(f, imp)}, el primer mes serían ${euros(f, Math.round(imp * RECARGO_ART27.base) / 100)}. `
      + `Y con la reducción del ${RECARGO_ART27.reduccion} % del art. 27.5 LGT si pagas todo de una vez.`;
  }
  const sMin = num(v.sancion, 0);
  const sMax = num(v.sancionMax, 0);
  if (sMax > 0 && sMax !== sMin) {
    return `Sanción del art. 198 LGT: entre ${euros(f, sMin)} y ${euros(f, sMax)}, o entre `
      + `${euros(f, num(v.sancionVoluntaria, 0))} y ${euros(f, num(v.sancionMaxVoluntaria, 0))} si lo `
      + 'presentas tú antes de que te requieran (art. 198.2 LGT). El informe deja abierto cuál de '
      + 'las dos lecturas aplica: es una de las preguntas de aquí abajo.';
  }
  return `No sale a ingresar, así que no hay recargo. Sanción del art. 198 LGT: ${euros(f, sMin)}, `
    + `o ${euros(f, num(v.sancionVoluntaria, 0))} si lo presentas tú antes de que te requieran `
    + '(art. 198.2 LGT). Un modelo a cero se presenta igual.';
}

// Cuánto se paga. Para el 303, el 349 y el 390 la respuesta es "nada": lo que hay es una base
// imponible que declarar, y confundir las dos cosas es lo que hace que se dejen sin presentar.
function cuantoSePaga(c, v) {
  const { f } = c;
  const imp = num(v.importeEstimado, 0);
  if (v.modelo === '130') {
    return imp > 0
      ? `<span class="num">${esc(euros(f, imp))}</span>`
      : '<span class="num">0,00 €</span>';
  }
  if (v.modelo === '100') {
    return v.importeEstimado === null
      ? '<span class="fis-sin">sin datos</span>'
      : (num(v.devolucionEsperada, 0) > 0
        ? `<span class="num pos">+${esc(euros(f, v.devolucionEsperada))}</span>`
        : `<span class="num">${esc(euros(f, imp))}</span>`);
  }
  return '<span class="fis-sin">no se paga</span>';
}

function detalleImporte(c, v) {
  const { f } = c;
  if (v.modelo === '130') {
    const d = v.detalle130;
    return d && d.proyectado
      ? 'el 20 % del rendimiento neto acumulado, proyectado al ritmo de este año'
      : 'el 20 % del rendimiento neto acumulado, con tus datos cerrados';
  }
  if (v.modelo === '303') {
    return `se declara ${euros(f, num(v.baseImponible, 0))} en la casilla 59 (informativa), y se deduce el IVA de tus gastos`;
  }
  if (v.modelo === '349') {
    return `se declara ${euros(f, num(v.baseImponible, 0))} con clave S y el NIF-IVA de la GmbH`;
  }
  if (v.modelo === '390') {
    return `la casilla 103 tiene que valer ${euros(f, num(v.baseImponible, 0))}`;
  }
  if (v.modelo === '100') {
    return num(v.devolucionEsperada, 0) > 0
      ? 'saldría a devolver: los 130 del año suman más que tu IRPF real'
      : 'aquí se liquida de verdad y se resta lo pagado en los 130';
  }
  return '';
}

function filaCalendario(c, v, estado, proximo) {
  const presentado = estaPresentado(c, v);
  const marca = presentado
    ? `<span class="fis-punto hecho">${ICON_CHECK}</span>`
    : (estado === 'vencido'
      ? `<span class="fis-punto vencido">${ICON_WARN}</span>`
      : `<span class="fis-punto ${estado}"></span>`);

  const quedan = proximo ? dias(c.hoy, v.fechaLimite) : null;
  const etq = presentado
    ? '<span class="fila-tag meta">PRESENTADO</span>'
    : (estado === 'vencido'
      ? `<span class="fila-tag ahora">VENCIDO HACE ${plural(num(v.diasDeRetraso, 0), 'DÍA', 'DÍAS')}</span>`
      : (proximo && quedan !== null
        ? `<span class="fila-tag mes">ES LO SIGUIENTE · ${plural(quedan, 'DÍA', 'DÍAS')}</span>`
        : ''));

  const noConfirmado = v.confirmado === false
    ? '<span class="badge-est">fecha sin confirmar</span>'
    : '';

  // El importe del 130 que consta ingresado, para poder afinar los trimestres siguientes.
  const clave = `${v.modelo}|${v.periodo}|${v.anio}`;
  const apuntado = c.presentados.find((p) => p.modelo === v.modelo
    && p.periodo === v.periodo && (p.anio === null || p.anio === v.anio));
  const campoImporte = presentado && v.modelo === '130'
    ? `<label class="fis-importe">Ingresado de verdad
        <input type="number" step="0.01" min="0" inputmode="decimal"
          data-fis-importe="${esc(clave)}"
          value="${apuntado && apuntado.importe !== null ? apuntado.importe : ''}"
          placeholder="${num(v.importeEstimado, 0).toFixed(2)}" />
      </label>
      <span class="mc">Si lo dejas vacío, los trimestres siguientes restan lo que TOCABA ingresar, no lo que pagaste.</span>`
    : '';

  return `<li class="fis-paso ${estado}${presentado ? ' hecho' : ''}${proximo ? ' proximo' : ''}">
    ${marca}
    <div class="fis-paso-cuerpo">
      <div class="fis-paso-cab">
        <span class="fis-paso-fecha num">${esc(fechaCorta(v.fechaLimite))}</span>
        <span class="fis-modelo">${esc(nombreCorto(v))}</span>
        <span class="fis-periodo">${esc(etiquetaPeriodo(v))}</span>
        ${etq}${noConfirmado}
      </div>
      <p class="fis-paso-imp">${cuantoSePaga(c, v)} <span class="mc">${esc(detalleImporte(c, v))}</span></p>
      <p class="fis-paso-si">${esc(quePasaSiNo(c, v))}</p>
      ${v.fechaDomiciliacion && estado !== 'vencido' && !presentado
    ? `<p class="mc">Para domiciliar el pago en el banco, el plazo acaba el ${esc(fechaLarga(v.fechaDomiciliacion))}, no el día ${Number(v.fechaLimite.slice(8, 10))}.</p>`
    : ''}
      <div class="fis-acciones">${botonPresentado(v, presentado)}</div>
      ${campoImporte}
    </div>
  </li>`;
}

function pintarCalendario(c) {
  if (!c.hoy || c.anio === null) {
    return '<p class="mc">Sin la fecha de hoy no hay calendario que pintar. Cierra la app y vuelve '
      + 'a abrirla. Mientras tanto, las fechas fijas de 2026 son: 20 de abril (1T), 20 de julio '
      + '(2T), 20 de octubre (3T) y 30 de enero de 2027 (4T y modelo 390).</p>';
  }

  // Los vencimientos del EJERCICIO en curso, aunque su fecha caiga en el año siguiente: el 4T
  // y el 390 de 2026 vencen en enero de 2027, y la Renta de 2026 en junio de 2027. Es la
  // misma lectura que la tabla §3.2 del informe.
  const lista = c.abiertos.filter((v) => v.fechaLimite && v.anio === c.anio);
  if (!lista.length) return '<p class="mc">No hay vencimientos que enseñar para este ejercicio.</p>';

  // El próximo: el primero por fecha que no está vencido ni presentado. Uno solo.
  const idxProximo = lista.findIndex((v) => v.estado !== 'vencido' && !estaPresentado(c, v));

  const pasos = lista.map((v, i) => {
    const presentado = estaPresentado(c, v);
    let estado;
    if (presentado) estado = 'hecho';
    else if (v.estado === 'vencido') estado = 'vencido';
    else if (i === idxProximo) estado = 'ahora';
    else estado = 'futuro';
    return filaCalendario(c, v, estado, i === idxProximo);
  }).join('');

  return `<ol class="fis-camino">${pasos}</ol>
    <p class="fis-pie">Estos son los vencimientos del ejercicio ${c.anio}, y algunos vencen ya en
      ${c.anio + 1}: el 4T y el modelo 390 en enero, y la Renta entre abril y junio. El visto verde
      significa "lo has marcado como presentado", no "la fecha ya pasó": una fecha pasada sin
      presentar sale en rojo, que es la verdad.</p>`;
}

// ---------------------------------------------------------------------------
// E) La ficha de cada modelo
// ---------------------------------------------------------------------------

function pintarModelos(c) {
  const fichas = MODELOS.map((m) => `<details class="fis-ficha">
    <summary class="fis-ficha-cab">
      <span class="fis-modelo">Modelo ${esc(m.id)}</span>
      <span class="fis-ficha-tit">${esc(m.nombre.replace(/^Modelo \d+ — /, ''))}</span>
      <span class="fila-tag mes">${esc(PERIODICIDAD_TEXTO[m.periodicidad] || m.periodicidad)}</span>
      ${m.porcentaje !== null ? `<span class="fila-tag meta">${m.porcentaje} %</span>` : ''}
    </summary>
    <div class="fis-ficha-cuerpo">
      <p class="fis-l">Qué es</p>
      <p class="fis-txt">${esc(m.queEs)}</p>
      <p class="fis-l">Sobre qué</p>
      <p class="fis-txt">${esc(m.sobreQue)}</p>
      <p class="fis-l">Por qué te obliga a ti</p>
      <p class="fis-txt">${esc(m.porQue)}</p>
      <p class="fis-fuente">${esc(m.baseLegal)} · ${esc(m.fuente)}</p>
    </div>
  </details>`).join('');

  return `${fichas}
    <p class="fis-pie">Seis modelos, y ninguno es opcional en tu caso. El que casi todo el mundo se
      salta es el 349, porque no se paga nada con él: por eso no parece importante hasta que llega
      el requerimiento. Y el cuadre que Hacienda comprueba sola es este: suma de las casillas 59 de
      tus cuatro 303 = suma de tus cuatro 349 = casilla 103 del 390.</p>`;
}

// ---------------------------------------------------------------------------
// F) Las preguntas para la asesoría
// ---------------------------------------------------------------------------

function pintarPreguntas(c) {
  const items = ORDEN_PREGUNTAS
    .filter((p) => typeof PREGUNTAS[p.clave] === 'string')
    .map((p, i) => {
      const id = `fis-preg-${p.clave}`;
      return `<article class="fis-preg">
        <div class="fis-preg-cab">
          <span class="fis-preg-n num">${i + 1}</span>
          <div class="fis-preg-cuerpo">
            <p class="fis-preg-tit">${esc(p.titulo)}</p>
            <p class="fis-preg-para">${esc(p.paraQue)}</p>
          </div>
        </div>
        <details class="fis-det">
          <summary>Ver la pregunta entera</summary>
          <p class="fis-preg-txt" id="${id}">${esc(PREGUNTAS[p.clave])}</p>
        </details>
        <div class="fis-acciones">
          <button type="button" class="btn btn-ghost fis-copiar" data-copiar="${id}">${ICON_COPY} Copiar</button>
          <span class="fis-fuente">${esc(p.fuente)}</span>
        </div>
      </article>`;
    }).join('');

  return `<p class="fis-intro">Están escritas para copiar y pegar en un correo, sin tocar nada.
    Llevan dentro la tesis, el artículo y lo que quieres que te contesten, que es lo que convierte
    "consúltalo con tu asesoría" en algo que se puede hacer hoy.</p>
    ${items}
    <p class="fis-pie">La última no es para tu asesoría española: el informe pide expresamente
      contrastarla con un Steuerberater alemán, y le toca a David tanto como a ti.</p>`;
}

// ---------------------------------------------------------------------------
// G) El checklist de lo pendiente
// ---------------------------------------------------------------------------

function pintarPendiente(c) {
  const hechos = CHECKLIST.filter((x) => c.checklist[x.id] === true).length;

  const items = CHECKLIST.map((x) => {
    const marcado = c.checklist[x.id] === true;
    return `<li class="fis-check${marcado ? ' hecho' : ''}">
      <label class="fis-check-cab">
        <input type="checkbox" data-fis-check="${esc(x.id)}"${marcado ? ' checked' : ''} />
        <span class="fis-check-tit">${esc(x.titulo)}</span>
      </label>
      <div class="fis-check-cuerpo">
        <p class="fis-l">Cómo se comprueba</p>
        <p class="fis-txt">${esc(x.como)}</p>
        <p class="fis-l">Qué pasa si está mal</p>
        <p class="fis-txt">${esc(x.siEstaMal)}</p>
        ${x.enlace ? `<a class="fis-enlace" href="${esc(x.enlace)}" target="_blank" rel="noopener">${esc(x.enlaceTexto || 'Abrir')}</a>` : ''}
        <p class="fis-fuente">${esc(x.fuente)}</p>
      </div>
    </li>`;
  }).join('');

  const barra = `<div class="fis-progreso">
    <div class="fis-progreso-track"><div class="fis-progreso-lleno" style="width:${((hechos / CHECKLIST.length) * 100).toFixed(1)}%"></div></div>
    <span class="fis-progreso-txt num">${hechos} de ${CHECKLIST.length}</span>
  </div>`;

  const avisoRoi = c.roi === true
    ? ''
    : `<div class="aviso-ambar">${ICON_WARN}<span>La primera casilla es la que más cambia esta
        pantalla: mientras no la marques, la app da por hecho que <strong>no sabemos</strong> si
        estás en el ROI, y el trámite del modelo 036 sigue saliendo arriba. Márcala solo si el VIES
        te ha dicho "válido": marcarla sin comprobarlo apaga el aviso pero no arregla el censo.</span></div>`;

  return `<p class="fis-intro">Esto es el apartado 2 del informe convertido en casillas. Ninguna
    lleva más de un par de minutos y todas se pueden hacer desde el móvil. Lo que marques se guarda
    en este dispositivo.</p>
    ${barra}
    ${avisoRoi}
    <ul class="fis-checklist">${items}</ul>
    <p class="fis-pie">Marcar una casilla aquí no presenta nada ante Hacienda: es tu registro de
      qué has comprobado ya, para no volver a mirarlo cada semana.</p>`;
}

// ---------------------------------------------------------------------------
// Render público
// ---------------------------------------------------------------------------

// ctx = { datos, modelo, hoyISO, presentados, roi, patrimonio, checklist, f, card }
export function renderFiscal(ctx) {
  const c = prepararCtx(ctx);

  // El "hoy" que se ha pintado, colgado de la raíz. Los eventos lo necesitan para apuntar la
  // fecha de "presentado" y esta vista no mira el reloj: el hoy entra por ctx y sale de aquí.
  const raiz = document.getElementById('v-fiscal');
  if (raiz) raiz.dataset.hoy = c.hoy;

  set('fis-urgente', pintarUrgente(c));
  set('fis-apartar', pintarApartar(c));
  set('fis-renta', pintarRenta(c));
  set('fis-calendario', pintarCalendario(c));
  set('fis-modelos', pintarModelos(c));
  set('fis-preguntas', pintarPreguntas(c));
  set('fis-pendiente', pintarPendiente(c));
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
//
// Mismo patrón que bindDecisiones, bindResidencia, bindObjetivo y bindPatrimonio: todo por
// delegación desde #v-fiscal, que no se destruye nunca, y con una marca en el dataset para no
// engancharse dos veces.
//
// handlers = { getChecklist, setChecklist, getPresentados, setPresentados, getRenta, setRenta,
//              irA, rerender }
export function bindFiscal(handlers) {
  const raiz = document.getElementById('v-fiscal');
  if (!raiz || raiz.dataset.fisBind === '1') return;
  raiz.dataset.fisBind = '1';

  const h = handlers || {};
  const rerender = () => { if (typeof h.rerender === 'function') h.rerender(); };

  // Copiar al portapapeles. La API moderna necesita contexto seguro (https, que es lo que da
  // GitHub Pages) y un gesto del usuario, que lo hay. El camino viejo se queda como red de
  // seguridad: si esto falla en silencio, el botón más importante de la pantalla no hace nada
  // y él no sabe por qué.
  const copiar = async (texto, boton) => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        ok = true;
      }
    } catch (e) { ok = false; }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, texto.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) { ok = false; }
    }
    if (!boton) return;
    const original = boton.innerHTML;
    boton.innerHTML = ok ? 'Copiada' : 'No he podido: selecciónala y cópiala tú';
    boton.classList.toggle('fis-copiada', ok);
    setTimeout(() => {
      boton.innerHTML = original;
      boton.classList.remove('fis-copiada');
    }, ok ? 1800 : 4000);
  };

  raiz.addEventListener('click', (e) => {
    const ir = e.target.closest('[data-ir]');
    if (ir && typeof h.irA === 'function') {
      h.irA(ir.dataset.ir);
      return;
    }

    const btnCopiar = e.target.closest('[data-copiar]');
    if (btnCopiar) {
      const origen = document.getElementById(btnCopiar.dataset.copiar);
      if (origen) copiar(origen.textContent || '', btnCopiar);
      // Si la pregunta está plegada, se abre: copiar algo que no se ve nunca da desconfianza.
      const det = origen && origen.closest('details');
      if (det) det.open = true;
      return;
    }

    const btnPresentado = e.target.closest('[data-fis-presentado]');
    if (btnPresentado && typeof h.setPresentados === 'function') {
      const [modelo, periodo, anio] = String(btnPresentado.dataset.fisPresentado).split('|');
      const estaba = btnPresentado.dataset.estado === '1';
      const lista = (typeof h.getPresentados === 'function' ? h.getPresentados() : []) || [];
      const resto = lista.filter((p) => !(String(p.modelo) === modelo
        && String(p.periodo) === periodo
        && String(p.anio) === anio));
      if (estaba) {
        h.setPresentados(resto);
      } else {
        const hoy = esFecha(raiz.dataset.hoy) ? raiz.dataset.hoy : '';
        resto.push({ modelo, periodo, anio: Number(anio), fecha: hoy, importe: null });
        h.setPresentados(resto);
      }
      rerender();
    }
  });

  raiz.addEventListener('change', (e) => {
    const check = e.target.closest('[data-fis-check]');
    if (check && typeof h.setChecklist === 'function') {
      const actual = (typeof h.getChecklist === 'function' ? h.getChecklist() : {}) || {};
      h.setChecklist({ ...actual, [check.dataset.fisCheck]: Boolean(check.checked) });
      rerender();
      return;
    }

    // Los tres datos de la Renta que la app no puede saber sola. Se leen igual que el importe
    // del 130: aceptando la coma decimal, porque aquí escribe una persona en España, y dejando
    // el campo VACÍO (no en cero) cuando lo que hay no es un número. Un cero y un "no lo sé"
    // no son lo mismo: renta.js sabe leer el "no lo sé" y lo dice con su aviso.
    const rentaCampo = e.target.closest('[data-fis-renta]');
    if (rentaCampo && typeof h.setRenta === 'function') {
      const actual = (typeof h.getRenta === 'function' ? h.getRenta() : {}) || {};
      const bruto = String(rentaCampo.value).trim().replace(',', '.');
      const n = bruto === '' ? null : Number(bruto);
      const valor = n !== null && Number.isFinite(n) && n >= 0 ? n : null;
      const nuevo = { ...actual };
      if (valor === null) delete nuevo[rentaCampo.dataset.fisRenta];
      else nuevo[rentaCampo.dataset.fisRenta] = valor;
      h.setRenta(nuevo);
      rerender();
      return;
    }

    const imp = e.target.closest('[data-fis-importe]');
    if (imp && typeof h.setPresentados === 'function') {
      const [modelo, periodo, anio] = String(imp.dataset.fisImporte).split('|');
      const lista = (typeof h.getPresentados === 'function' ? h.getPresentados() : []) || [];
      // Aquí escribe una persona en España: "644,56" con coma. `Number('644,56')` es NaN, y
      // un NaN guardado sale del JSON convertido en null, o sea, el importe desaparecía sin
      // decir nada. Se acepta la coma, y lo que no sea un número se queda en null (que fiscal.js
      // ya sabe leer: vuelve a estimar y lo dice con un aviso).
      const valor = String(imp.value).trim().replace(',', '.');
      const n = valor === '' ? null : Number(valor);
      const importe = n !== null && Number.isFinite(n) && n >= 0 ? n : null;
      const nuevo = lista.map((p) => (String(p.modelo) === modelo
        && String(p.periodo) === periodo
        && String(p.anio) === anio)
        ? { ...p, importe }
        : p);
      h.setPresentados(nuevo);
      rerender();
    }
  });
}
