// Vista "Dónde vivir": los cinco escenarios (autónomo en España, SL en España, Dubái,
// Paraguay y Bali) puestos uno al lado del otro con SU beneficio anual real, el desglose
// de cada uno, y los umbrales en los que cambia la respuesta.
//
// Aquí solo hay DOM y strings: toda la aritmética vive en residencia.js y en bali.js, y la
// traducción de "beneficio anual" a "ventas al mes" en objetivo.js. Esta vista no calcula
// dinero.
//
// LA REGLA DE ESTA PANTALLA: ninguna cifra fiscal se escribe aquí. Todas llegan de
// residencia.js y bali.js, que las traen de `docs/investigacion-fiscal-2026.md` y
// `docs/bali-indonesia-2026.md` con su sección al lado. Lo único que se escribe aquí son
// los textos que dicen DE DÓNDE sale cada una, y esos textos citan la sección del informe.
// Si un dato no está en el informe (el cambio EUR/USD de Paraguay), el campo va a 0,
// editable, con su aviso: no se rellena a ojo.
//
// Y no se opina. Se enseñan los números, los umbrales y lo que NO incluyen. La decisión
// de dónde vivir es suya.

import {
  ESCENARIOS_TODOS,
  SUPUESTOS,
  COSTES_DUBAI,
  COSTES_PARAGUAY,
  CONFIG_SL,
  DATOS_AUTONOMICOS,
  ESCENARIOS_ESPANA,
  TIPO_COTIZACION_RETA,
  BASE_COTIZACION_SOCIETARIA,
  DIFICIL_JUSTIFICACION_PCT,
  DIFICIL_JUSTIFICACION_TOPE,
  MINIMO_PERSONAL_ESTATAL,
  normalizarOpciones,
  opcionesPorDefecto,
  netoDe,
  compararTodos,
  umbralDetalle,
  planMudanzaParaguay,
} from './residencia.js';
import {
  COSTES_BALI,
  NOMBRES_REGIMEN,
  REGIMENES_BALI,
  UMBRALES_BALI,
  VISADO_E33G,
  escalaPphEnEuros,
  ptkpEnEuros,
  umkmExentoEnEuros,
} from './bali.js';
import { normalizarModelo, ventasParaBeneficioAnual } from './objetivo.js';
import { formatoEuros } from './calculos.js';

// ---------------------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------------------

// Nombre corto para los chips y las cabeceras de la tabla. El nombre largo (con la
// comunidad dentro) lo pone `compararTodos`, que es quien sabe cuál está elegida.
const NOMBRE_CORTO = {
  'espana-autonomo': 'España, autónomo',
  'espana-sl': 'España, SL',
  dubai: 'Dubái',
  paraguay: 'Paraguay',
  bali: 'Bali',
};

// Las cuatro filas de la TABLA MAESTRA (sección 6 del informe). Se mantienen tal cual
// para poder cotejar esta pantalla contra el documento línea a línea.
const BENEFICIOS_TABLA = [15000, 40000, 80000, 150000];

// Atajos para probar cifras sin teclear. Son los mismos de la tabla maestra.
const BENEFICIOS_RAPIDOS = BENEFICIOS_TABLA;

// Los pares que de verdad se pregunta, con el orden "el que cambia" primero: el umbral se
// cuenta siempre a partir de cuándo compensa A sobre B. Salen de la sección 7 de cada
// informe, y por eso la fuente va escrita entera: son dos documentos distintos.
const PARES_UMBRAL = [
  ['dubai', 'espana-autonomo', 'Irte a Dubái contra seguir como autónomo aquí', 'investigación fiscal, sección 7.1'],
  ['espana-sl', 'espana-autonomo', 'Montar una SL contra seguir como autónomo', 'investigación fiscal, sección 7.2'],
  ['paraguay', 'espana-autonomo', 'Irte a Paraguay contra seguir como autónomo aquí', 'investigación fiscal, sección 7.3'],
  ['bali', 'espana-autonomo', 'Irte a Bali contra seguir como autónomo aquí', 'informe de Bali, sección 7'],
  ['paraguay', 'dubai', 'Paraguay contra Dubái', 'investigación fiscal, sección 7.3'],
  ['bali', 'paraguay', 'Bali contra Paraguay', 'informe de Bali, sección 7'],
];

// Las comunidades que el informe menciona, en el orden en el que las publica.
const COMUNIDADES = ['madrid', 'cataluna', 'andalucia', 'valencia'];

// De dónde sale cada campo editable. Cada texto cita la sección del informe: es la única
// forma de que el usuario pueda comprobar la cifra sin fiarse de la pantalla.
const FUENTES = {
  comunidad: 'Compendio «Tributación Autonómica. Medidas 2026» del Ministerio de Hacienda, Tabla 24, actualizado a 29/04/2026 (sección 2.1). El informe SOLO publica la escala completa de Madrid.',
  dubaiCosteMin: `Sección 3.3, escenario típico (IFZA o Meydan) con contabilidad: AED 35.451–45.938 ≈ ${COSTES_DUBAI.recurrenteMin}–${COSTES_DUBAI.recurrenteMax} EUR/año. Este es el extremo bajo de esa horquilla.`,
  dubaiCosteMax: 'Sección 3.3, mismo escenario típico: el extremo alto de la horquilla. El informe avisa (sección 8) de que la contabilidad es el componente más incierto de todos sus totales y el que más los mueve.',
  paraguayEstructuraAnual: 'Sección 6, supuesto 5: 500 EUR/año estimados de tasas oficiales recurrentes. NO incluye gestoría, que el informe deja fuera por no tener fuente.',
  sueldoAdministrador: 'Sección 5.1 y supuesto 3 de la sección 6: 35.200 EUR de sueldo de administrador y el resto por dividendos. Coincide con el final del tercer tramo estatal (por encima, la nómina tributa al 18,5 % y el dividendo al 21 %).',
  paraguayEurPorUsd: 'NO ESTÁ EN EL INFORME. El informe publica EUR/AED (0,2388) y el anclaje AED/USD (3,6725), pero ningún EUR/USD directo. Por eso va a 0: sin ese dato los tramos del IRP (publicados en guaraníes) no se pueden pasar a euros y se aplica el techo del 10 % de la sección 4.2.',
  baliEstructuraAnual: `Informe de Bali, sección 4.1: entre ${COSTES_BALI.estructuraMin} y ${COSTES_BALI.estructuraMax} EUR/año (tasas E33G ${COSTES_BALI.tasasE33G} + BPJS ${COSTES_BALI.bpjs} + seguro médico internacional, cuyo rango comercial va de 900 a 4.150 y está sesgado al alza). Sus tablas usan el punto medio, ${COSTES_BALI.estructuraAnual}.`,
  baliRegimen: 'Informe de Bali, secciones 3.4 y 3.5. El informe dice literalmente: "planifica con el escenario progresivo (21-28 % efectivo)". El NPPN del 36 % y el 0,5 % están aquí para que veas lo que hay en juego, no para contar con ellos: los tres bloqueos de la sección 3.5 siguen abiertos.',
  baliIdrPorEur: 'Cabecera del informe de Bali: 1 EUR ≈ 20.400 IDR (26/07/2026). Bank Indonesia publicó el 28/07/2026 un Kurs Transaksi de 20.402,78 de compra. La rupia es volátil: un presupuesto hecho hoy puede desviarse un 5-10 % en un año.',
};

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------

// Todo texto que no controlamos (avisos que suben desde residencia.js, nombres de
// comunidad, valores tecleados) pasa por aquí antes de entrar en un innerHTML.
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Mismo criterio que residencia.js: vacío o basura -> valor por defecto; el 0 es legítimo.
function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

// El usuario no puede ver nunca un NaN ni un Infinity: en su lugar, una raya.
function euros(f, n) {
  return Number.isFinite(n) ? f(n) : '—';
}

// Una diferencia entre dos escenarios, con el signo delante. Aquí el signo ES la
// información (si una opción gana o pierde), y "−381,22 €" se lee de un vistazo mucho
// mejor que una frase que explique que el número de al lado va en contra.
function eurosFirmados(f, n) {
  if (!Number.isFinite(n)) return '—';
  return `${n >= 0 ? '+' : '−'}${euros(f, Math.abs(n))}`;
}

// 72 -> "72 %", 86,7 -> "86,7 %". null (sin beneficio) -> raya, no NaN.
function pctTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  return `${Number(n).toFixed(1).replace(/\.?0+$/, '').replace('.', ',')} %`;
}

// El "porcentaje que se queda" solo tiene sentido si queda algo. Con beneficios ridículos
// el cociente se dispara (con 1 EUR de beneficio y 500 de estructura sale un −49.910 %,
// que es cierto y no dice nada), así que fuera del rango 0..100 se calla y se explica con
// palabras en su sitio. Un número absurdo en pantalla parece un error de la app.
function pctBolsilloTexto(pct) {
  if (pct === null || !Number.isFinite(pct) || pct < 0 || pct > 100) return '—';
  return pctTexto(pct);
}

// 8.53 -> "8,5". Una cifra decimal: más precisión en ventas es ruido.
function ventasTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  return String(Math.round(Number(n) * 10) / 10).replace('.', ',');
}

// Euros cortos para chips y etiquetas de barra: "15.000 €", sin céntimos.
function eurosCortos(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return `${String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

// Valor que se mete en un input numérico: a céntimos, para no pintar 9719.999999.
function paraInput(n) {
  return Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : '';
}

const cardPorDefecto = (l, v, mc = '') =>
  `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function avisoAmbar(texto, extra = '') {
  return `<div class="aviso-ambar${extra ? ` ${extra}` : ''}">${ICON_WARN}<span>${texto}</span></div>`;
}

// ---------------------------------------------------------------------------
// Estado de la pantalla
// ---------------------------------------------------------------------------
//
// Vive a nivel de módulo, igual que `cascModo` en vista-objetivo.js: los bloques se
// reescriben enteros en cada repintado y no pueden guardar nada dentro.

// La cifra que el usuario está probando a mano. null = su beneficio real, el que llega
// en el ctx. No se persiste a propósito: es un "¿y si…?", no un dato suyo.
let beneficioManual = null;

// Qué escenario enseña el desglose. null = el ganador del ranking en cada momento.
let escSeleccionado = null;

// Último ctx pintado, para poder refrescar solo los resultados mientras teclea.
let ctxUltimo = null;

// Deja el ctx en un estado en el que ninguna función de abajo puede recibir basura.
//
// ctx = { beneficioAnual, opciones, f, card } — más, opcionalmente, `modelo`,
// `ventasMedia` (lo que hace falta para traducir los umbrales a ventas al mes) y
// `devengadoAnual`. Sin ellos la pantalla funciona igual: se calla esas líneas en vez de
// inventarlas.
//
// QUÉ ES `beneficioAnual` AQUÍ, porque estaba mal y es la premisa de toda la pantalla: es
// lo que él FACTURA al año, no su 40 % del beneficio del negocio. Comparar países es
// comparar SU tributación, y un autónomo español tributa por lo que factura. Con el
// beneficio del negocio esta pantalla comparaba escenarios sobre 18.234 € de renta que él
// no declara, y los umbrales de Paraguay (15.000) y Dubái (33.000) salían a distancias que
// no son las suyas. `devengadoAnual` viaja al lado solo para poder decirlo en voz alta.
function prepararCtx(ctx) {
  const c = ctx || {};
  const real = Math.max(0, num(c.beneficioAnual, 0));
  const bruto = c.opciones || {};
  return {
    beneficioReal: real,
    beneficio: beneficioManual === null ? real : Math.max(0, beneficioManual),
    manual: beneficioManual !== null,
    devengadoAnual: Math.max(0, num(c.devengadoAnual, 0)),
    opciones: normalizarOpciones(bruto),
    // La horquilla de Dubái no es una opción de cálculo (residencia.js usa un único coste):
    // es el rango del informe, y de su punto medio sale el coste que sí se calcula. Viaja
    // aparte porque `normalizarOpciones` solo conoce las claves que usa para calcular.
    dubaiMin: Math.max(0, num(bruto.dubaiCosteMin, COSTES_DUBAI.recurrenteMin)),
    dubaiMax: Math.max(0, num(bruto.dubaiCosteMax, COSTES_DUBAI.recurrenteMax)),
    modelo: c.modelo ? normalizarModelo(c.modelo) : null,
    ventasMedia: Math.max(0, num(c.ventasMedia, 0)),
    f: typeof c.f === 'function' ? c.f : formatoEuros,
    card: typeof c.card === 'function' ? c.card : cardPorDefecto,
  };
}

// Los cinco escenarios ordenados, ya con la comunidad elegida dentro del nombre.
function ranking(c) {
  return compararTodos(c.beneficio, c.opciones);
}

// El escenario cuyo desglose se enseña: el elegido, si sigue existiendo, o el ganador.
function escenarioActivo(c, filas) {
  const lista = filas || ranking(c);
  if (escSeleccionado && lista.some((r) => r.escenario === escSeleccionado)) return escSeleccionado;
  return lista.length ? lista[0].escenario : 'espana-autonomo';
}

// ---------------------------------------------------------------------------
// A) Lo que facturas al año
// ---------------------------------------------------------------------------
// Se parte en formulario y resultado: el input no se repinta nunca mientras se escribe,
// o el usuario perdería el foco a mitad de cifra (mismo motivo que en vista-objetivo.js).

function pintarMioForm(c) {
  const rapidos = BENEFICIOS_RAPIDOS.map((n) => {
    const on = Math.abs(n - c.beneficio) < 0.5 ? ' on' : '';
    return `<button type="button" class="btn btn-ghost obj-rapido${on}" data-benef="${n}">${eurosCortos(n)}</button>`;
  }).join('');

  const volver = c.manual
    ? `<button type="button" class="btn btn-ghost" id="res-beneficio-reset">Volver a mi cifra real (${eurosCortos(c.beneficioReal)})</button>`
    : '';

  // A la semana, al mes o al año: el mismo número, distinto divisor. Él piensa en semanas
  // y meses («esta semana me llevé X»); todo lo fiscal va en años. La pantalla acepta las
  // tres y enseña SIEMPRE las otras dos, para que no tenga que hacer la cuenta de cabeza.
  const p = PERIODOS[periodoElegido] || PERIODOS.anio;
  const valor = c.beneficio / p.divisor;
  const otros = Object.keys(PERIODOS)
    .filter((k) => k !== periodoElegido)
    .map((k) => `<strong>${euros(c.f, c.beneficio / PERIODOS[k].divisor)}</strong> ${PERIODOS[k].sufijo}`);

  const chips = Object.entries(PERIODOS).map(([k, v]) =>
    `<button type="button" data-periodo="${k}"${k === periodoElegido ? ' class="on"' : ''}>${v.etiqueta}</button>`).join('');

  return `<div id="res-mio-res"></div>
    <div class="res-probar">
      <label class="res-probar-l" for="res-beneficio">Probar otra cifra que ganes tú</label>
      <div class="seg res-periodo" id="res-periodo">${chips}</div>
      <input id="res-beneficio" class="res-probar-input" type="number" inputmode="decimal"
        step="${p.paso}" min="0"
        value="${esc(paraInput(valor))}" placeholder="${p.ejemplo}"
        aria-label="Lo que ganas tú ${p.sufijo}, en euros" />
      <p class="mc res-equivale">Son ${otros.join(' · ')}.</p>
      <div class="obj-rapidos">${rapidos}${volver}</div>
    </div>`;
}

// Las tres formas de mirar el mismo dinero. 52 semanas, no 4 por mes: un mes tiene 4,33
// semanas y con 4 el año se quedaría corto en un mes entero.
const PERIODOS = {
  semana: { etiqueta: 'A la semana', divisor: 52, sufijo: 'a la semana', paso: 25, ejemplo: '180' },
  mes: { etiqueta: 'Al mes', divisor: 12, sufijo: 'al mes', paso: 50, ejemplo: '780' },
  anio: { etiqueta: 'Al año', divisor: 1, sufijo: 'al año', paso: 500, ejemplo: '9340' },
};

// Periodo elegido. Vive a nivel de módulo, como el modo de la cascada: sobrevive a los
// repintados y no se pierde mientras se escribe.
let periodoElegido = 'anio';

function pintarMioRes(c) {
  const { f, card } = c;
  const filas = ranking(c);
  const mejor = filas[0];
  const espana = filas.find((r) => r.escenario === 'espana-autonomo');
  const diferencia = mejor && espana ? mejor.neto - espana.neto : 0;

  const pie = c.manual
    ? `Cifra de prueba. La tuya real, la que sale de los retiros que has facturado este año proyectados a doce meses, es ${euros(f, c.beneficioReal)}.`
    : (c.beneficioReal > 0
      ? 'Lo que TÚ facturas: tus retiros de lo que va de año, proyectados a doce meses. Es antes de cuota de autónomo e impuestos: eso lo resta cada escenario a su manera. La asesoría no está descontada aquí.'
      : 'Todavía no hay retiros de este año con los que calcular lo que facturas. Prueba una cifra a mano aquí abajo y la pantalla entera se recalcula.');

  const tarjetas = [
    card('Si te quedas como estás', `<span class="num">${euros(f, espana ? espana.neto : NaN)}</span>`, 'autónomo en España, con esta comunidad'),
    card('Lo mejor de los cinco', `<span class="num pos">${euros(f, mejor ? mejor.neto : NaN)}</span>`, mejor ? esc(mejor.nombre) : ''),
    card('La diferencia', `<span class="num ${diferencia >= 0 ? 'pos' : 'neg'}">${euros(f, diferencia)}</span>`, 'al año, solo impuestos y estructura'),
  ].join('');

  return `${avisoFacturado(c)}<div class="res-mio">
      <div class="res-mio-l">Tu facturación, proyectada a doce meses</div>
      <div class="res-mio-v num">${euros(f, c.beneficio)}</div>
      <div class="res-mio-pie mc">${pie}</div>
    </div>
    <div class="grid grid-3 res-mio-cards">${tarjetas}</div>`;
}

// EL aviso que sostiene toda esta pantalla, y va arriba del todo por eso mismo.
//
// La comparación entre países es sobre SU tributación como autónomo español, y un autónomo
// tributa por lo que factura. El negocio no se muda con él: sigue siendo la empresa alemana
// de su socio, con sus impuestos, esté él donde esté. Confundir las dos cosas es lo que
// hacía que esta pantalla comparara escenarios sobre 18.234 € de renta que él no declara.
function avisoFacturado(c) {
  const { f } = c;
  const cifra = c.manual ? c.beneficioReal : c.beneficio;
  const conDevengado = c.devengadoAnual > cifra + 1
    ? ` Tu 40 % del beneficio del negocio proyecta ${euros(f, c.devengadoAnual)} al año, pero eso no es renta tuya mientras no lo factures.`
    : '';
  const conPrueba = c.manual
    ? ` Ahora mismo estás probando ${euros(f, c.beneficio)}, que no es tu cifra.`
    : '';
  return avisoAmbar(`Esta comparación usa lo que TÚ facturas (${euros(f, cifra)} al año), no el beneficio del negocio. Si te mudas, lo que cambia es tu tributación, no la del negocio de tu socio.${conDevengado}${conPrueba}`, 'res-aviso');
}

// ---------------------------------------------------------------------------
// B) El ranking
// ---------------------------------------------------------------------------

// La horquilla de Dubái, calculada con los dos extremos del coste recurrente. Es lo que
// hace el informe en su tabla maestra ("4.030 – 6.530"), y esconderlo daría una falsa
// precisión: la incertidumbre de la contabilidad emiratí vale miles de euros al año.
function horquillaDubai(c) {
  const conCoste = (coste) => netoDe('dubai', c.beneficio, { ...c.opciones, dubaiCosteAnual: coste }).neto;
  const alto = conCoste(c.dubaiMin);   // menos coste -> queda más
  const bajo = conCoste(c.dubaiMax);
  return { bajo, alto };
}

function pintarRanking(c) {
  const { f } = c;
  const filas = ranking(c);
  if (!filas.length) return '<p class="mc">No hay escenarios que comparar.</p>';
  const mejor = filas[0];
  const activo = escenarioActivo(c, filas);

  return filas.map((r, i) => {
    const gana = i === 0;
    const clases = ['res-card', gana ? 'acento' : '', r.escenario === activo ? 'sel' : ''].filter(Boolean).join(' ');
    const etiqueta = gana ? '<span class="fila-tag meta">MEJOR PARA TI AHORA</span>' : '';
    const paga = c.beneficio - r.neto;

    // Con el neto en negativo no hay porcentaje que enseñar: no es que se quede poco, es
    // que pone dinero de su bolsillo. Se dice así, que es lo que pasa de verdad.
    const linea = r.neto >= 0
      ? `te quedas el <strong>${pctBolsilloTexto(r.pct)}</strong> · pagas ${euros(f, paga)} entre impuestos y estructura`
      : `no te queda nada: pondrías <strong>${euros(f, -r.neto)}</strong> de tu bolsillo, porque la estructura y las cuotas se pagan igual`;

    const diferencia = gana
      ? `<div class="res-card-dif mc">Es el que más te deja facturando ${euros(f, c.beneficio)} al año.</div>`
      : `<div class="res-card-dif mc">${euros(f, r.neto - mejor.neto)} al año frente a ${esc(NOMBRE_CORTO[mejor.escenario] || mejor.nombre)}.</div>`;

    // Dubái enseña además su horquilla: el coste de contabilidad es el número más
    // incierto de todo el informe y mueve el resultado miles de euros.
    let rango = '';
    if (r.escenario === 'dubai') {
      const h = horquillaDubai(c);
      rango = `<div class="res-card-rango mc">Con la horquilla del informe (${eurosCortos(c.dubaiMin)}–${eurosCortos(c.dubaiMax)} de estructura): entre ${euros(f, h.bajo)} y ${euros(f, h.alto)}.</div>`;
    }
    // Bali lleva su propio sello: el visado es un umbral MIGRATORIO y manda sobre el
    // dinero. Con un neto estupendo y sin visado, esta fila no existe.
    if (r.escenario === 'bali') {
      rango = r.detalle && r.detalle.califica
        ? `<div class="res-card-rango mc">Calificas por la cifra (${eurosCortos(UMBRALES_BALI.legal)} de ingresos acreditados). Sigue pendiente que Imigrasi acepte tu contrato de servicios como "perjanjian kerja": tú facturas a la GmbH, no eres su empleado. Régimen: ${esc(NOMBRES_REGIMEN[r.detalle.regimen] || r.detalle.regimen)}.</div>`
        : `<div class="res-card-rango mc res-card-bloqueo">Con esta cifra NO calificas para el visado E33G: pide acreditar ${VISADO_E33G.ingresoUsd.toLocaleString('es-ES')} USD al año (${eurosCortos(UMBRALES_BALI.legal)}) con extractos. Te faltan ${eurosCortos(Math.max(0, UMBRALES_BALI.legal - c.beneficio))} de beneficio anual. Este número enseña la forma de la curva; legalmente esta fila no existe.</div>`;
    }

    const avisos = (r.avisos || []).map((a) => avisoAmbar(esc(a), 'res-aviso')).join('');

    return `<div class="${clases}" data-esc="${r.escenario}" role="button" tabindex="0" aria-label="Ver el desglose de ${esc(r.nombre)}">
      <div class="res-card-top"><span class="res-card-nombre">${esc(r.nombre)}</span>${etiqueta}</div>
      <div class="res-card-neto num ${r.neto >= 0 ? 'pos' : 'neg'}">${euros(f, r.neto)}</div>
      <div class="res-card-pct">${linea}</div>
      ${diferencia}
      ${rango}
      ${avisos}
    </div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// C) El desglose, en cascada
// ---------------------------------------------------------------------------

// Una fila de la cascada. El porcentaje se mide siempre sobre el beneficio anual, que es
// la magnitud que compara toda la pantalla. `casc-resta` pinta el signo menos por CSS,
// así que a las restas se les pasa el valor absoluto.
function filaCasc(cpt, small, imp, base, f, cls = '') {
  const pct = base > 0 && Number.isFinite(imp)
    ? `${(Math.abs(imp) / base * 100).toFixed(1).replace('.', ',')} %`
    : '—';
  return `<div class="casc-fila${cls ? ` ${cls}` : ''}">
    <div class="cpt">${cpt}${small ? `<small>${small}</small>` : ''}</div>
    <div class="imp num">${euros(f, imp)}</div>
    <div class="pct">${pct}</div>
  </div>`;
}

function filasEspanaAutonomo(d, c) {
  const { f } = c;
  const b = c.beneficio;
  const t = d.tramoReta || {};
  const dt = d.irpfDetalle || {};
  const com = DATOS_AUTONOMICOS[dt.comunidad] || DATOS_AUTONOMICOS.madrid;
  const tabla = t.tabla === 'reducida' ? 'tabla reducida' : 'tabla general';

  return [
    filaCasc('Beneficio anual', 'tu parte, antes de cuota e impuestos', b, b, f, 'casc-hito'),
    filaCasc('Cuota de autónomo', `${tabla}, tramo ${t.tramo ?? '—'} · base mínima ${euros(f, t.baseMinima)} × ${String(TIPO_COTIZACION_RETA).replace('.', ',')} % × 12`, Math.abs(d.cuotaReta), b, f, 'casc-resta'),
    filaCasc('Rendimiento previo', 'beneficio menos lo cotizado', d.rendimientoPrevio, b, f, 'casc-sub'),
    filaCasc('Gastos de difícil justificación', `${DIFICIL_JUSTIFICACION_PCT} % con tope de ${eurosCortos(DIFICIL_JUSTIFICACION_TOPE)} (art. 30.2.4ª LIRPF)`, Math.abs(d.dificilJustificacion), b, f, 'casc-resta'),
    filaCasc('Base liquidable', 'sobre esto se aplican las dos escalas', d.baseLiquidable, b, f, 'casc-sub'),
    filaCasc('IRPF estatal', 'escala del art. 63.1.1º Ley 35/2006', Math.abs(dt.estatal), b, f, 'casc-resta'),
    filaCasc(`IRPF autonómico (${esc(com.nombre)})`, com.escalaCompleta ? 'escala completa publicada en el informe' : 'sin escala publicada: sale 0 y este IRPF queda MÁS BAJO de lo real', Math.abs(dt.autonomica), b, f, 'casc-resta'),
    // Con los céntimos exactos: el mínimo autonómico de Madrid son 5.956,65, y redondearlo
    // a 5.957 rompería el cotejo con el desglose de la sección 6 del informe.
    filaCasc('Cuota del mínimo personal', `${euros(f, MINIMO_PERSONAL_ESTATAL)} estatal + ${euros(f, com.minimoPersonal)} autonómico: se descuentan de la CUOTA, no de la base`, Math.abs(dt.deduccionMinimo), b, f, 'casc-suma'),
    filaCasc('IRPF a pagar', 'las dos escalas menos el mínimo personal', d.irpf, b, f, 'casc-sub'),
    filaCasc('TE QUEDA AL AÑO', 'ya libre de cuota y de IRPF', d.neto, b, f, `casc-final${d.neto < 0 ? ' negativo' : ''}`),
  ].join('');
}

function filasEspanaSL(d, c) {
  const { f } = c;
  const b = c.beneficio;
  const o = c.opciones;

  return [
    filaCasc('Beneficio anual', 'tu parte, antes de cuota e impuestos', b, b, f, 'casc-hito'),
    filaCasc('Cuota de autónomo societario', `base ${euros(f, BASE_COTIZACION_SOCIETARIA)} × ${String(TIPO_COTIZACION_RETA).replace('.', ',')} % × 12 · con el 40 % de una SL la ley presume control efectivo`, Math.abs(d.cuotaSocietaria), b, f, 'casc-resta'),
    filaCasc('Disponible en la sociedad', 'lo que queda para sueldo y dividendos', d.disponible, b, f, 'casc-sub'),
    filaCasc('Sueldo de administrador', 'deducible en el Impuesto de Sociedades; el resto sale por dividendos', d.sueldo, b, f, 'casc-sub'),
    filaCasc('Base del Impuesto de Sociedades', 'lo que queda tras sueldo y cuota', d.baseIS, b, f, 'casc-sub'),
    filaCasc('Impuesto de Sociedades', `${o.tipoIS} % hasta ${eurosCortos(o.limitePrimerTramoIS)} y ${o.tipoISResto} % el resto (DT 44ª LIS)`, Math.abs(d.impuestoSociedades), b, f, 'casc-resta'),
    filaCasc('Dividendo bruto', 'lo que la sociedad puede repartirte', d.dividendoBruto, b, f, 'casc-sub'),
    filaCasc('IRPF del sueldo', 'base general: las mismas dos escalas del autónomo', Math.abs(d.irpfTrabajo), b, f, 'casc-resta'),
    filaCasc('IRPF del dividendo', 'base del ahorro: 19 / 21 / 23 / 27 / 30 % (sin exención desde 2015)', Math.abs(d.irpfAhorro), b, f, 'casc-resta'),
    filaCasc('TE QUEDA AL AÑO', 'sacando todo el dinero cada año', d.neto, b, f, `casc-final${d.neto < 0 ? ' negativo' : ''}`),
  ].join('');
}

function filasDubai(d, c) {
  const { f } = c;
  const b = c.beneficio;
  const o = c.opciones;

  return [
    filaCasc('Beneficio anual', 'tu parte, antes de impuestos y estructura', b, b, f, 'casc-hito'),
    filaCasc('Impuesto de sociedades emiratí', `0 % hasta ${eurosCortos(o.dubaiExento)} y ${o.dubaiTipo} % el exceso · tu academia no puede ser QFZP, y por eso conserva el tramo exento`, Math.abs(d.impuesto), b, f, 'casc-resta'),
    filaCasc('Estructura, cada año', 'licencia, visado prorrateado, seguro, banco y contabilidad', Math.abs(d.estructura), b, f, 'casc-resta'),
    filaCasc('TE QUEDA AL AÑO', 'del segundo año en adelante', d.neto, b, f, `casc-final${d.neto < 0 ? ' negativo' : ''}`),
  ].join('');
}

function filasParaguay(d, c) {
  const { f } = c;
  const b = c.beneficio;
  const o = c.opciones;
  const detalleIrp = d.modo === 'tramos'
    ? 'escala del 8 / 9 / 10 % pasada a euros con el cambio que has puesto'
    : `techo del ${o.paraguayTipoTecho} % · los tramos reales son 8 / 9 / 10 % y las deducciones personales bajarían más`;

  return [
    filaCasc('Beneficio anual', 'tu parte, antes de impuestos y estructura', b, b, f, 'casc-hito'),
    filaCasc('IRP paraguayo', detalleIrp, Math.abs(d.impuesto), b, f, 'casc-resta'),
    filaCasc('Estructura, cada año', 'tasas oficiales recurrentes estimadas; sin gestoría', Math.abs(d.estructura), b, f, 'casc-resta'),
    filaCasc('TE QUEDA AL AÑO', 'sobre el papel: falta resolver lo de Stripe', d.neto, b, f, `casc-final${d.neto < 0 ? ' negativo' : ''}`),
  ].join('');
}

function filasBali(d, c) {
  const { f } = c;
  const b = c.beneficio;
  const o = c.opciones;
  const escala = escalaPphEnEuros(o.baliIdrPorEur);
  const ptkp = ptkpEnEuros(o.baliIdrPorEur);

  // Cada régimen calcula el impuesto por un camino distinto: la fila que lo explica cambia
  // con él. Y en los tres, el mínimo exento y los tramos son los mismos del art. 17.
  let detalleImpuesto;
  if (d.regimen === 'nppn') {
    detalleImpuesto = `NPPN: solo el ${o.baliNppnPct} % de la facturación cuenta como renta (código 85499, Denpasar), y eso pasa por la escala`;
  } else if (d.regimen === 'umkm') {
    detalleImpuesto = `PPh Final UMKM: ${String(o.baliUmkmTipo).replace('.', ',')} % de la facturación que pase de ${eurosCortos(umkmExentoEnEuros(o.baliIdrPorEur))} exentos`;
  } else {
    detalleImpuesto = `escala del art. 17: 5 / 15 / 25 / 30 / 35 % · el 30 % empieza en ${eurosCortos(escala[2].hasta)} de base · mínimo exento (PTKP) de ${euros(f, ptkp)}`;
  }

  return [
    filaCasc('Beneficio anual', 'tu parte, antes de impuestos y estructura', b, b, f, 'casc-hito'),
    filaCasc('Impuesto indonesio (PPh)', detalleImpuesto, Math.abs(d.impuesto), b, f, 'casc-resta'),
    filaCasc('Estructura, cada año', `tasas del E33G (${eurosCortos(COSTES_BALI.tasasE33G)}), BPJS y seguro médico internacional`, Math.abs(d.estructura), b, f, 'casc-resta'),
    filaCasc('TE QUEDA AL AÑO', d.califica ? 'sin coste de vida, y con el visado sin resolver' : 'con una cifra con la que NO calificas para el visado', d.neto, b, f, `casc-final${d.neto < 0 ? ' negativo' : ''}`),
  ].join('');
}

function pintarDetalle(c) {
  const { f } = c;
  const o = c.opciones;
  const filas = ranking(c);
  const activo = escenarioActivo(c, filas);
  const fila = filas.find((r) => r.escenario === activo) || filas[0];
  if (!fila) return '<p class="mc">Sin escenario que desglosar.</p>';
  const d = netoDe(activo, c.beneficio, c.opciones);
  if (!d) return '<p class="mc">Sin escenario que desglosar.</p>';

  const chips = `<div class="seg res-esc-sel" id="res-esc-modo">${filas
    .map((r) => `<button type="button" data-esc="${r.escenario}"${r.escenario === activo ? ' class="on"' : ''}>${esc(NOMBRE_CORTO[r.escenario] || r.escenario)}</button>`)
    .join('')}</div>`;

  let cuerpo;
  if (activo === 'espana-autonomo') cuerpo = filasEspanaAutonomo(d, c);
  else if (activo === 'espana-sl') cuerpo = filasEspanaSL(d, c);
  else if (activo === 'dubai') cuerpo = filasDubai(d, c);
  else if (activo === 'bali') cuerpo = filasBali(d, c);
  else cuerpo = filasParaguay(d, c);

  // Notas que no son una fila de la cascada pero cambian la lectura de la última.
  const notas = [];
  if (activo === 'dubai') {
    notas.push(`El primer año, además, la constitución: <strong>${euros(f, d.constitucion)}</strong>. Ese año te quedarían <strong>${euros(f, d.primerAno)}</strong>.`);
    const h = horquillaDubai(c);
    notas.push(`Con la horquilla entera de estructura (${eurosCortos(c.dubaiMin)}–${eurosCortos(c.dubaiMax)}) esto se mueve entre ${euros(f, h.bajo)} y ${euros(f, h.alto)}.`);
  }
  if (activo === 'espana-sl') {
    notas.push(`Puede aplicarte el puerto seguro del art. 18.6 LIS: obliga a sacar como sueldo el ${CONFIG_SL.puertoSeguroPct} % del resultado previo. No está modelado, y si te aplica esta columna es demasiado optimista.`);
  }
  if (activo === 'paraguay') {
    // El mínimo no incidido se publica en guaraníes y sobre INGRESOS BRUTOS. Ni la moneda
    // ni la magnitud son las de esta pantalla, así que la comparación se hace solo si el
    // usuario ha puesto un cambio EUR/USD (el informe no publica ninguno: ver
    // FUENTES.paraguayEurPorUsd), y se dice en qué unidad está cada cosa.
    const minGs = COSTES_PARAGUAY.minimoNoIncididoGs;
    const minUsd = minGs / COSTES_PARAGUAY.guaraniesPorUsd;
    const cabeza = `El mínimo no incidido está en ₲${minGs.toLocaleString('es-ES')} (unos ${Math.round(minUsd).toLocaleString('es-ES')} USD al cambio oficial de la sección 4.1) de INGRESOS BRUTOS por servicios personales. Ojo a la magnitud: esta pantalla mide beneficio, no facturación bruta, y tu facturación es mayor que tu beneficio.`;
    if (o.paraguayEurPorUsd > 0) {
      const minEur = minUsd * o.paraguayEurPorUsd;
      notas.push(`${cabeza} Con el cambio EUR/USD que has puesto tú (${String(o.paraguayEurPorUsd).replace('.', ',')}) son ${euros(f, minEur)}, y tu beneficio de ${euros(f, c.beneficio)} queda ${c.beneficio >= minEur ? 'POR ENCIMA' : 'POR DEBAJO'}${c.beneficio >= minEur ? '' : ' (aunque tu facturación bruta, que es lo que de verdad se mide, puede estar por encima)'}.`);
    } else {
      notas.push(`${cabeza} Pasarlo a euros exige un cambio EUR/USD que el informe no publica, y por eso ese ajuste está a 0: mientras siga así, esta pantalla no puede decirte si lo superas o no. No se rellena a ojo.`);
    }
  }
  if (activo === 'bali') {
    // Lo que Bali te deja de más justo donde el visado se abre. Se CALCULA con netoDe en
    // los dos escenarios, no se escribe a mano: con la estructura en el extremo alto de la
    // horquilla del informe el signo se da la vuelta y Bali pierde.
    const legal = UMBRALES_BALI.legal;
    const netoEspana = netoDe('espana-autonomo', legal, o).neto;
    const difCon = (estructura) => netoDe('bali', legal, { ...o, baliEstructuraAnual: estructura }).neto - netoEspana;
    const dPuesta = difCon(o.baliEstructuraAnual);
    const dMin = difCon(COSTES_BALI.estructuraMin);
    const dMax = difCon(COSTES_BALI.estructuraMax);
    notas.push(`El umbral que manda es el del visado, y es migratorio: <strong>${eurosCortos(legal)}</strong> de ingresos acreditados con extractos. Justo ahí, con la estructura que tienes puesta (${euros(f, o.baliEstructuraAnual)}), la diferencia frente a seguir como autónomo aquí es de <strong>${eurosFirmados(f, dPuesta)}</strong> al año; con la horquilla entera del informe (${eurosCortos(COSTES_BALI.estructuraMin)}–${eurosCortos(COSTES_BALI.estructuraMax)}) va de ${eurosFirmados(f, Math.min(dMin, dMax))} a ${eurosFirmados(f, Math.max(dMin, dMax))}, o sea que en el extremo caro Bali pierde. El umbral fiscal frente a España está en <strong>${eurosCortos(UMBRALES_BALI.fiscalMin)}–${eurosCortos(UMBRALES_BALI.fiscalMax)}</strong>.`);
    notas.push('La pregunta exacta, por escrito, a Imigrasi o a la Embajada de Indonesia en Madrid: "¿un contrato mercantil de servicios con una empresa extranjera vale como <em>perjanjian kerja</em> para el E33G, o exigen un contrato laboral?". Tú facturas a la GmbH de tu socio, no eres su empleado. Esa respuesta decide si Bali existe para ti.');
    notas.push(`Coste de vida, que aquí no está restado: ${euros(f, COSTES_BALI.vidaAustero)} al año austero y ${euros(f, COSTES_BALI.vidaCanggu)} en Canggu. Con 15.000 € de beneficio, vivir en Canggu te deja en negativo.`);
  }
  const notasHtml = notas.length
    ? `<div class="obj-notas">${notas.map((n) => `<div class="obj-nota">${n}</div>`).join('')}</div>`
    : '';

  return `${chips}
    <p class="mc res-supuesto">${esc(SUPUESTOS[activo] || '')}</p>
    <div class="casc">${cuerpo}</div>
    ${notasHtml}`;
}

// ---------------------------------------------------------------------------
// D) Los umbrales: cuándo cambia la respuesta
// ---------------------------------------------------------------------------

// Quién gana por encima del cruce. Se mira un poco más arriba del umbral, no en el punto
// exacto: en el cruce los dos netos son (casi) iguales y la comparación no decide nada.
function ganaPorEncima(a, b, umbral, o) {
  const punto = umbral + Math.max(1000, umbral * 0.05);
  return netoDe(a, punto, o).neto >= netoDe(b, punto, o).neto ? a : b;
}

// Quién gana en un punto concreto, por su nombre corto. Se usa cuando NO hay cruce en todo
// el rango: entonces el ganador es el mismo en cualquier punto y basta con mirar uno.
function ganaEn(a, b, o, punto) {
  const p = punto > 0 ? punto : BENEFICIOS_TABLA[0];
  const gana = netoDe(a, p, o).neto >= netoDe(b, p, o).neto ? a : b;
  return NOMBRE_CORTO[gana] || gana;
}

// ¿Este par pasa por el IRPF español y, con él, por la escala autonómica?
function tocaEspana(a, b) {
  return ESCENARIOS_ESPANA.includes(a) || ESCENARIOS_ESPANA.includes(b);
}

// La línea de ventas: el umbral traducido a lo que él controla de verdad. Se calla si no
// ha llegado el modelo del negocio o si una venta más no mueve el beneficio.
//
// `quePunto` nombra a qué se está apuntando. Por defecto es el cruce fiscal, pero cuando el
// que manda es otro (el visado de Bali) hay que decirlo: si no, el "ya estás por encima" se
// lee como luz verde para un umbral que no es el que decide.
function lineaVentas(c, umbral, quePunto = 'ese cruce') {
  if (!c.modelo) return '';
  const vUmbral = ventasParaBeneficioAnual(c.modelo, umbral);
  const vHoy = ventasParaBeneficioAnual(c.modelo, c.beneficio);
  if (vUmbral === null || vHoy === null) return '';
  const faltan = vUmbral - vHoy;
  const cola = faltan > 0.05
    ? `Te faltan <strong>${ventasTexto(faltan)}</strong> ventas al mes.`
    : 'Con tus ventas de ahora ya estás por encima.';
  return `<div class="res-umbral-ventas mc">En lo que tú controlas: para llegar a ${esc(quePunto)} harían falta <strong>${ventasTexto(vUmbral)}</strong> ventas al mes, y tu cifra de ahora equivale a <strong>${ventasTexto(vHoy)}</strong>. ${cola}</div>`;
}

// Los cruces que dependen de un coste de estructura con horquilla NO son un número, son
// una banda. La sección 7.1 lo dice con todas las letras para Dubái ("con el coste
// recurrente en el extremo alto el cruce se va a ~37.000; con el extremo bajo baja a
// ~30.000"), y la sección 4.1 del informe de Bali publica una horquilla todavía más ancha
// (1.400–5.000). Enseñar solo el punto medio daría una precisión falsa justo en la cifra
// más incierta de cada informe. Se calcula el mismo umbral con los dos extremos.
//
// Es la MISMA función para los dos: lo único que cambia es qué opción se mueve y con qué
// horquilla. `clave` es la opción de cálculo (`dubaiCosteAnual`, `baliEstructuraAnual`).
function bandaEstructura(a, b, c, cfg) {
  const { escenario, clave, min, max, etiqueta, nota } = cfg;
  if (a !== escenario && b !== escenario) return '';
  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 1) return '';
  const rango = `${eurosCortos(min)}–${eurosCortos(max)}`;
  const uMin = umbralDetalle(a, b, { ...c.opciones, [clave]: min });
  const uMax = umbralDetalle(a, b, { ...c.opciones, [clave]: max });

  // En los dos extremos hay cruce: una banda de toda la vida.
  if (uMin && uMax) {
    const bajo = Math.min(uMin.beneficio, uMax.beneficio);
    const alto = Math.max(uMin.beneficio, uMax.beneficio);
    if (alto - bajo < 1) return '';
    return `<div class="res-umbral-horquilla mc">Este cruce no es un punto, es una banda: con la horquilla de estructura de ${esc(etiqueta)} (${rango}) se mueve entre <strong>${eurosCortos(bajo)}</strong> y <strong>${eurosCortos(alto)}</strong>. ${nota}</div>`;
  }

  // En los dos extremos hay lo mismo que en el medio (ningún cruce): el bloque ya lo dice.
  if (!uMin && !uMax) return '';

  // En UN extremo no hay cruce y en el otro sí. Eso no es mover una cifra: es que dentro
  // de la horquilla del informe cambia la respuesta. Callarlo sería lo peor de las dos
  // opciones, porque arriba se está enseñando un punto con céntimos.
  const conCruce = uMin || uMax;
  const costeSinCruce = uMin ? max : min;
  const costeConCruce = uMin ? min : max;
  const ganaSiempre = ganaEn(a, b, { ...c.opciones, [clave]: costeSinCruce }, c.beneficio);
  return `<div class="res-umbral-horquilla mc">Este cruce ni siquiera es una banda: dentro de la horquilla de estructura de ${esc(etiqueta)} (${rango}) cambia la respuesta. Con ${eurosCortos(costeSinCruce)} no hay cruce en todo el rango y gana <strong>${esc(ganaSiempre)}</strong> siempre; con ${eurosCortos(costeConCruce)} el cruce está en <strong>${eurosCortos(conCruce.beneficio)}</strong>. La cifra de arriba es solo el punto medio de esa horquilla. ${nota}</div>`;
}

// Las dos horquillas, cada una con su fuente. Se pasan las dos a cada bloque: la función
// se calla sola si el par no toca a ese escenario.
function bandasDeEstructura(a, b, c) {
  return bandaEstructura(a, b, c, {
    escenario: 'dubai',
    clave: 'dubaiCosteAnual',
    min: c.dubaiMin,
    max: c.dubaiMax,
    etiqueta: 'Dubái',
    nota: 'El coste de contabilidad emiratí es la cifra más incierta de todo el informe.',
  }) + bandaEstructura(a, b, c, {
    escenario: 'bali',
    clave: 'baliEstructuraAnual',
    min: COSTES_BALI.estructuraMin,
    max: COSTES_BALI.estructuraMax,
    etiqueta: 'Bali',
    nota: `La estructura de Bali es una estimación con horquilla (informe de Bali, sección 4.1): el seguro médico internacional va de 900 a 4.150 EUR y el propio informe dice que su rango está sesgado al alza. La pantalla calcula con el punto medio, ${eurosCortos(COSTES_BALI.estructuraAnual)}.`,
  });
}

// La puerta migratoria de Bali. El E33G no es un umbral fiscal: es de extranjería, y manda
// sobre el dinero. Un cruce aritmético por debajo de UMBRALES_BALI.legal no habilita nada,
// y decirle "ya lo has pasado" contradice al resto de esta misma pantalla, que declara esa
// fila legalmente inexistente. Devuelve '' si el par no toca a Bali.
function puertaBali(a, b, c, cruce) {
  if (a !== 'bali' && b !== 'bali') return '';
  const legal = UMBRALES_BALI.legal;
  const cruceCorto = Number.isFinite(cruce) && cruce < legal;
  const tuyaCorta = c.beneficio < legal;
  if (!cruceCorto && !tuyaCorta) return '';

  const partes = [];
  if (cruceCorto) {
    partes.push(`Este cruce cae ${eurosCortos(legal - cruce)} por debajo del umbral del visado E33G (${eurosCortos(legal)} de ingresos acreditados con extractos, ${VISADO_E33G.ingresoUsd.toLocaleString('es-ES')} USD al año).`);
  }
  if (tuyaCorta) {
    partes.push(`Con tu cifra de hoy ${cruceCorto ? 'tampoco' : 'no'} calificas para el visado E33G (${eurosCortos(legal)}): te faltan ${eurosCortos(legal - c.beneficio)} de beneficio anual acreditado.`);
  }
  partes.push('Por debajo de ese umbral Bali no es una opción legal, gane lo que gane en la aritmética.');
  return avisoAmbar(partes.join(' '), 'res-aviso');
}

// La barra: dónde está él y dónde está el cruce, en la misma escala.
//
// Las dos rayas van en su punto exacto, pero las etiquetas NO cuelgan de ellas: van en una
// fila aparte, ordenadas de izquierda a derecha según dónde caiga cada raya. Una etiqueta
// centrada sobre una raya al 0 % se sale de la tarjeta, y en el iPhone eso mueve la página
// entera de sitio. Así la etiqueta de la izquierda es siempre la de la raya de la izquierda
// y nunca hay desbordamiento que arreglar con overflow.
// `nombre` es lo que se lee bajo la segunda raya. Es un parámetro porque no siempre es el
// cruce fiscal: cuando el umbral que decide es el del visado de Bali, la barra tiene que
// enseñar ESE, o el dibujo dice lo contrario que el texto de encima.
function barraUmbral(c, umbral, nombre = 'cruce') {
  // El 1,25 deja aire a la derecha: sin él la raya del máximo se pega al borde.
  const tope = Math.max(umbral, c.beneficio) * 1.25 || 1;
  const pos = (v) => Math.max(0, Math.min(100, (v / tope) * 100));
  const pYo = pos(c.beneficio);
  const pCruce = pos(umbral);

  const etiquetas = [
    { clase: 'yo', txt: `tú · ${eurosCortos(c.beneficio)}`, p: pYo },
    { clase: 'cruce', txt: `${esc(nombre)} · ${eurosCortos(umbral)}`, p: pCruce },
  ].sort((a, b) => a.p - b.p);

  return `<div class="res-barra" role="img" aria-label="Tu beneficio, ${eurosCortos(c.beneficio)}; ${esc(nombre)}, ${eurosCortos(umbral)}">
    <div class="res-barra-track"><div class="res-barra-lleno" style="width:${Math.min(pYo, pCruce).toFixed(1)}%"></div></div>
    <span class="res-barra-marca yo" style="left:${pYo.toFixed(1)}%"></span>
    <span class="res-barra-marca cruce" style="left:${pCruce.toFixed(1)}%"></span>
    <div class="res-barra-pies">${etiquetas.map((e) => `<span class="${e.clase}">${e.txt}</span>`).join('')}</div>
  </div>`;
}

// El marco de un bloque de umbral. El cuerpo cambia mucho según el caso; el título con su
// fuente, no.
function marcoUmbral(titulo, fuente, cuerpo) {
  return `<div class="res-umbral">
    <div class="res-umbral-tit">${esc(titulo)}<span class="res-umbral-sec">${esc(fuente)}</span></div>
    ${cuerpo}
  </div>`;
}

// EL CASO EN EL QUE NO SE PUEDE DAR CIFRA.
//
// Un umbral es la resta de dos netos, así que hereda los defectos de los dos. Con Cataluña,
// Andalucía o Comunitat Valenciana el informe NO publica la escala autonómica (sección 2.1),
// residencia.js la deja vacía a propósito y la parte autonómica sale 0. Consecuencia: el
// IRPF español sale bajo, el neto español sale ALTO y cualquier cruce que toque a España se
// desplaza en la dirección que cuesta dinero (con Valencia el modelo da un cruce con Dubái
// 11.065 € MÁS ARRIBA que con Madrid, cuando el marginal valenciano —54 %— es MAYOR que el
// madrileño —45 %— y el cruce real tendría que caer más abajo).
//
// Así que aquí no se da número. Se enseña el de Madrid, que es la única escala que el
// informe publica entera, dicho como lo que es: una referencia calculable, no su umbral.
function bloqueSinEscala(c, [a, b, titulo, fuente]) {
  const { f } = c;
  const o = c.opciones;
  const com = DATOS_AUTONOMICOS[o.comunidad] || DATOS_AUTONOMICOS.madrid;
  const madrid = DATOS_AUTONOMICOS.madrid;
  const uMadrid = umbralDetalle(a, b, { ...o, comunidad: 'madrid' });
  // Los dos escenarios españoles se comparan entre sí (SL contra autónomo): ahí la escala
  // que falta mueve a los dos y no se puede afirmar hacia dónde cae el cruce.
  const soloUnEspanol = ESCENARIOS_ESPANA.includes(a) !== ESCENARIOS_ESPANA.includes(b);

  const porQue = `El informe no publica la escala autonómica de ${esc(com.nombre)} (sección 2.1): solo da su marginal máximo agregado (${com.marginalMaximoTotal} %, frente al ${madrid.marginalMaximoTotal} % de Madrid) y su marginal autonómico a 60.000 (${String(com.marginalA60000).replace('.', ',')} %, frente al ${String(madrid.marginalA60000).replace('.', ',')} % de Madrid). Sin tabla, este modelo calcula tu parte autonómica a 0, así que la columna española sale MÁS ALTA de lo que sería de verdad.`;

  let referencia;
  if (uMadrid) {
    referencia = soloUnEspanol
      ? `Con la escala de Madrid, la única que el informe publica entera, el cruce cae en <strong>${euros(f, uMadrid.beneficio)}</strong>. Esa cifra es una COTA, no tu umbral: en ${esc(com.nombre)} pagarías más IRPF, te quedaría menos aquí y el cruce estaría POR DEBAJO. Cuánto por debajo, el informe no da datos para calcularlo.`
      : `Con la escala de Madrid, la única que el informe publica entera, el cruce cae en <strong>${euros(f, uMadrid.beneficio)}</strong>. En este par los dos escenarios son españoles, así que la escala que falta mueve a los dos: la cifra de Madrid es la única referencia calculable, y ni siquiera se puede decir hacia qué lado se desplaza la de ${esc(com.nombre)}.`;
  } else {
    // Sin cruce ni con Madrid. Si el que gana siempre es el escenario NO español, la
    // conclusión aguanta: gana incluso con la columna española favorecida. Si el que gana
    // siempre es el español, la conclusión está construida sobre el número inflado y no
    // vale nada.
    const gana = ganaEn(a, b, { ...o, comunidad: 'madrid' }, c.beneficio);
    const ganaEspana = gana === NOMBRE_CORTO['espana-autonomo'] || gana === NOMBRE_CORTO['espana-sl'];
    referencia = ganaEspana
      ? `Con la escala de Madrid no hay cruce en todo el rango, pero ahí el que gana siempre es el escenario español, que es justo el que este modelo está favoreciendo. Con ${esc(com.nombre)} no se puede decir nada de este par.`
      : `Con la escala de Madrid no hay cruce en todo el rango: hasta 1.000.000 € gana ${esc(gana)}. En ${esc(com.nombre)} el IRPF español sería aún más alto, así que ese orden se mantiene con más margen todavía; lo que no se puede dar es la cifra.`;
  }

  return marcoUmbral(titulo, fuente, `<div class="res-umbral-v">Sin cifra con ${esc(com.nombre)}: el informe no publica su escala</div>
    <div class="res-umbral-pie">${referencia}</div>
    ${avisoAmbar(porQue, 'res-aviso')}`);
}

function bloqueUmbral(c, [a, b, titulo, fuente]) {
  const { f } = c;
  const o = c.opciones;
  const nombreA = NOMBRE_CORTO[a] || a;
  const nombreB = NOMBRE_CORTO[b] || b;

  // Antes que nada: ¿este par se puede calcular con la comunidad elegida? Si toca a España
  // y su escala autonómica no está publicada, la cifra saldría movida en la dirección que
  // cuesta dinero. Se dice, y no se pinta ningún número duro.
  if (tocaEspana(a, b) && !(DATOS_AUTONOMICOS[o.comunidad] || DATOS_AUTONOMICOS.madrid).escalaCompleta) {
    return bloqueSinEscala(c, [a, b, titulo, fuente]);
  }

  const u = umbralDetalle(a, b, o);

  // Sin cruce en todo el rango: uno gana siempre y no hay umbral que perseguir. Es el
  // caso de Paraguay contra España, y decirlo es más útil que enseñar una barra vacía.
  if (u === null) {
    const gana = ganaEn(a, b, o, c.beneficio);
    return marcoUmbral(titulo, fuente, `<div class="res-umbral-v">No hay cruce: <strong>${esc(gana)}</strong> gana siempre</div>
      <div class="res-umbral-pie mc">Hasta 1.000.000 € de beneficio anual el orden no cambia con estos números. La respuesta a este par no depende de cuánto ganes, sino de todo lo que la tabla no mide.</div>
      ${bandasDeEstructura(a, b, c)}
      ${puertaBali(a, b, c, NaN)}`);
  }

  const encima = ganaPorEncima(a, b, u.beneficio, o);
  const gananteArriba = encima === a ? nombreA : nombreB;
  const perdedorArriba = encima === a ? nombreB : nombreA;

  // Bali se decide en Imigrasi, no en la calculadora. Cuando el cruce fiscal cae por debajo
  // de UMBRALES_BALI.legal, el umbral que de verdad manda es el del visado: es MIGRATORIO y
  // no admite interpretación, así que pasa a ser el punto de referencia de todo el bloque
  // (titular, barra, distancia y ventas). Un "ya lo has pasado" sobre el cruce fiscal
  // contradice al ranking de esta misma pantalla, que declara esa fila legalmente
  // inexistente.
  const legalBali = UMBRALES_BALI.legal;
  const cruceSinVisado = (a === 'bali' || b === 'bali') && u.beneficio < legalBali;
  const puntoEfectivo = cruceSinVisado ? legalBali : u.beneficio;
  const falta = puntoEfectivo - c.beneficio;

  const titular = cruceSinVisado
    ? `El cruce fiscal cae en <strong>${euros(f, u.beneficio)}</strong>, pero el umbral que decide es migratorio: <strong>${eurosCortos(legalBali)}</strong> de ingresos acreditados. Por debajo, esta comparación no tiene efecto legal.`
    : `<strong>${esc(gananteArriba)}</strong> te compensa a partir de <strong>${euros(f, u.beneficio)}</strong> al año`;

  let distancia;
  if (cruceSinVisado) {
    const pasadoElFiscal = c.beneficio >= u.beneficio;
    distancia = falta > 0
      ? `Te faltan <strong>${euros(f, falta)}</strong> de beneficio anual acreditado para calificar. ${pasadoElFiscal
        ? `El cruce fiscal (${euros(f, u.beneficio)}) queda por debajo de tu cifra, y no habilita nada.`
        : `El cruce fiscal está en ${euros(f, u.beneficio)}, y tampoco es el que manda.`}`
      : `Ya calificas por la cifra: vas <strong>${euros(f, -falta)}</strong> por encima del umbral del visado. Lo que sigue abierto es si Imigrasi acepta tu contrato de servicios como <em>perjanjian kerja</em>.`;
  } else if (falta > 0) {
    distancia = `Te faltan <strong>${euros(f, falta)}</strong> de beneficio anual para llegar ahí. Por debajo del cruce gana ${esc(perdedorArriba)}.`;
  } else {
    distancia = `Ya lo has pasado: vas <strong>${euros(f, -falta)}</strong> por encima del cruce.`;
  }

  // El cruce por salto: la cuota de autónomo cambia de golpe en cada frontera de tramo,
  // así que a veces los dos netos NO son iguales en el punto de cruce. Decirlo evita que
  // el usuario haga la resta y crea que la pantalla miente.
  const salto = u.exacto
    ? ''
    : `<div class="res-umbral-salto mc">En ese punto los dos no empatan del todo (${euros(f, Math.abs(u.diferencia))} de diferencia): el cruce cae en un escalón de la tabla de cuotas de autónomo, que sube de golpe.</div>`;

  // Cuando el que manda es el visado, la barra y la traducción a ventas apuntan a ÉL. Con
  // el cruce fiscal dibujado, la imagen diría "ya lo tienes" justo debajo de un titular que
  // dice lo contrario.
  const nombreBarra = cruceSinVisado ? 'visado' : 'cruce';
  const quePunto = cruceSinVisado ? 'el umbral del visado' : 'ese cruce';

  return marcoUmbral(titulo, fuente, `<div class="res-umbral-v">${titular}</div>
    ${barraUmbral(c, puntoEfectivo, nombreBarra)}
    <div class="res-umbral-pie">${distancia}</div>
    ${lineaVentas(c, puntoEfectivo, quePunto)}
    ${bandasDeEstructura(a, b, c)}
    ${salto}
    ${puertaBali(a, b, c, u.beneficio)}`);
}

function pintarUmbrales(c) {
  const bloques = PARES_UMBRAL.map((par) => bloqueUmbral(c, par)).join('');
  const pieVentas = c.modelo
    ? `<p class="obj-nota res-umbral-nota">Las ventas salen de tu modelo de negocio de la pestaña "Cuánto facturar": ticket, IVA, comisión, fijos y tu ${c.modelo.miShare} % del beneficio. Si cambias algo allí, estos números cambian aquí.</p>`
    : '';
  return bloques + pieVentas;
}

// ---------------------------------------------------------------------------
// E) La tabla: los cuatro escenarios a distintos beneficios
// ---------------------------------------------------------------------------

// Las cuatro filas del informe más la suya, metida en su sitio por orden. Si su cifra ya
// es una de las cuatro no se duplica: se marca la que hay.
function filasTabla(beneficio) {
  const lista = BENEFICIOS_TABLA.slice();
  const i = lista.findIndex((n) => Math.abs(n - beneficio) < 1);
  if (i >= 0) return { lista, iMio: i };
  const nueva = [...lista, beneficio].sort((a, b) => a - b);
  return { lista: nueva, iMio: nueva.indexOf(beneficio) };
}

function pintarTabla(c) {
  const { f } = c;
  const { lista, iMio } = filasTabla(c.beneficio);

  // El orden de las columnas es el de ESCENARIOS_TODOS: los cuatro de la tabla maestra del
  // informe fiscal (autónomo, SL, Dubái, Paraguay) y Bali al final, que llega de otro
  // informe. Así las cuatro primeras se cotejan fila a fila contra el documento.
  const cuerpo = lista.map((b, i) => {
    const netos = ESCENARIOS_TODOS.map((e) => netoDe(e, b, c.opciones));
    const maximo = Math.max(...netos.map((x) => x.neto));
    const celdas = netos.map((x) => {
      const gana = x.neto === maximo;
      // Una celda de Bali por debajo del umbral del visado lleva asterisco: el número es
      // correcto y la fila no existe legalmente. El informe hace exactamente lo mismo.
      const sinVisado = x.escenario === 'bali' && !x.califica;
      return `<td class="num${gana ? ' res-gana' : ''}${sinVisado ? ' res-sin-visado' : ''}">${euros(f, x.neto)}${sinVisado ? '<sup>*</sup>' : ''}<small>${pctBolsilloTexto(x.pctBolsillo)}</small></td>`;
    }).join('');
    const mio = i === iMio;
    return `<tr${mio ? ' class="hoy"' : ''}>
      <td class="num">${eurosCortos(b)}${mio ? '<span class="fila-tag ahora">TU CIFRA</span>' : ''}</td>
      ${celdas}
    </tr>`;
  }).join('');

  const comunidad = DATOS_AUTONOMICOS[c.opciones.comunidad] || DATOS_AUTONOMICOS.madrid;

  return `<table>
    <thead><tr>
      <th class="num">Beneficio anual</th>
      <th class="num">Autónomo (${esc(comunidad.nombre)})</th>
      <th class="num">SL sacando todo</th>
      <th class="num">Dubái</th>
      <th class="num">Paraguay</th>
      <th class="num">Bali (${esc(NOMBRES_REGIMEN[c.opciones.baliRegimen] || c.opciones.baliRegimen)})</th>
    </tr></thead>
    <tbody>${cuerpo}</tbody>
  </table>
  <p class="mc" style="padding:12px 18px 2px">Cada celda: lo que te queda al año y, debajo, el porcentaje del beneficio que acaba en tu bolsillo. En verde, el que más deja de esa fila. Las cuatro filas fijas son las de la tabla maestra del informe (sección 6): puedes cotejarlas una a una. La columna de Dubái es el año 2 en adelante; el primero paga además la constitución. Las celdas de Bali con <sup>*</sup> son cifras con las que <strong>no calificas para el visado E33G</strong>: enseñan la forma de la curva, no una opción legal.</p>`;
}

// ---------------------------------------------------------------------------
// F) Ajustes, cada uno con su fuente
// ---------------------------------------------------------------------------

function campoNumero(k, etiqueta, valor, paso, fuente, aviso = false) {
  return `<div class="obj-ajuste res-ajuste">
    <label for="res-a-${k}">${etiqueta}</label>
    <input id="res-a-${k}" type="number" inputmode="decimal" step="${paso}" min="0"
      data-res="${k}" value="${esc(paraInput(valor))}" />
    <span class="obj-ajuste-desc${aviso ? ' res-sin-fuente' : ''}">${fuente}</span>
  </div>`;
}

function pintarAjustes(c) {
  const { f } = c;
  const o = c.opciones;

  const opciones = COMUNIDADES.map((k) => {
    const d = DATOS_AUTONOMICOS[k];
    const marca = d.escalaCompleta ? '' : ' — sin escala publicada';
    return `<option value="${k}"${k === o.comunidad ? ' selected' : ''}>${esc(d.nombre)}${marca}</option>`;
  }).join('');

  const campoComunidad = `<div class="obj-ajuste res-ajuste">
    <label for="res-a-comunidad">Comunidad autónoma</label>
    <select id="res-a-comunidad" data-res="comunidad">${opciones}</select>
    <span class="obj-ajuste-desc">${FUENTES.comunidad}</span>
  </div>`;

  const opcionesRegimen = REGIMENES_BALI
    .map((k) => `<option value="${k}"${k === o.baliRegimen ? ' selected' : ''}>${esc(NOMBRES_REGIMEN[k])}</option>`)
    .join('');

  const campoRegimen = `<div class="obj-ajuste res-ajuste">
    <label for="res-a-baliRegimen">Bali: régimen fiscal</label>
    <select id="res-a-baliRegimen" data-res="baliRegimen">${opcionesRegimen}</select>
    <span class="obj-ajuste-desc">${FUENTES.baliRegimen}</span>
  </div>`;

  const campos = [
    campoComunidad,
    campoNumero('dubaiCosteMin', 'Dubái: estructura al año, mínimo (€)', c.dubaiMin, 100, FUENTES.dubaiCosteMin),
    campoNumero('dubaiCosteMax', 'Dubái: estructura al año, máximo (€)', c.dubaiMax, 100, FUENTES.dubaiCosteMax),
    campoNumero('paraguayEstructuraAnual', 'Paraguay: estructura al año (€)', o.paraguayEstructuraAnual, 50, FUENTES.paraguayEstructuraAnual),
    campoNumero('sueldoAdministrador', 'SL: sueldo de administrador (€/año)', o.sueldoAdministrador, 100, FUENTES.sueldoAdministrador),
    campoNumero('paraguayEurPorUsd', 'Paraguay: cambio EUR/USD (0 = sin dato)', o.paraguayEurPorUsd, 0.01, FUENTES.paraguayEurPorUsd, true),
    campoRegimen,
    campoNumero('baliEstructuraAnual', 'Bali: estructura al año (€)', o.baliEstructuraAnual, 100, FUENTES.baliEstructuraAnual),
    campoNumero('baliIdrPorEur', 'Bali: cambio IDR por euro', o.baliIdrPorEur, 100, FUENTES.baliIdrPorEur),
  ].join('');

  // El coste que de verdad entra en el cálculo es el punto medio de la horquilla, que es
  // justo el método del informe (usa 9.720, el medio de 8.470–10.970). Se enseña para que
  // no haya que adivinar de dónde sale el número de la columna de Dubái.
  const medio = `<p class="obj-nota res-ajustes-medio">Con esa horquilla, el coste de Dubái que entra en los cálculos es su punto medio: <strong>${euros(f, o.dubaiCosteAnual)}</strong> al año. Es el método del informe, que calcula con ${eurosCortos((COSTES_DUBAI.recurrenteMin + COSTES_DUBAI.recurrenteMax) / 2)}.</p>`;

  const sinDato = o.paraguayEurPorUsd > 0
    ? ''
    : avisoAmbar('El cambio EUR/USD no está en el informe, así que va a 0 y los tramos del IRP paraguayo (publicados en guaraníes) no se pueden pasar a euros. Mientras siga a 0 se aplica el techo del 10 %, que es la cifra prudente de la sección 4.2. Si lo rellenas, será tu dato, no el del informe.');

  // Los dos regímenes buenos de Bali son los que el informe deja marcados como
  // improbables. Si el usuario elige uno, la pantalla se lo recuerda ahí mismo: es la
  // diferencia entre pagar 627 € o 41.461 € sobre 150.000, y no se puede enseñar callado.
  const regimenImprobable = o.baliRegimen === 'progresivo'
    ? ''
    : avisoAmbar(`Estás mirando Bali con el régimen "${esc(NOMBRES_REGIMEN[o.baliRegimen])}", y el informe dice que hoy NO puedes contar con él: la renta de fuente extranjera queda fuera del 0,5 %, los formadores están excluidos por el art. 56 de la PP 55/2022, y los dos regímenes son para operadores registrados en Indonesia mientras el E33G te prohíbe ejercer actividad económica allí. Para planificar, vuelve a la escala progresiva.`);

  return `<p class="obj-ajustes-intro">No tienes que rellenar nada: todo viene de los informes con la cifra que ellos usan. Esto es para corregirlo si te mudas de comunidad, si te dan un presupuesto real de Dubái o de Bali, o si quieres ver otro sueldo de administrador. Cada campo dice de qué sección sale su valor.</p>
    <div class="obj-ajustes res-ajustes">
      ${campos}
      <div class="obj-ajustes-pie">
        <button type="button" class="btn btn-ghost" id="res-reset">Volver a las cifras del informe</button>
        <span class="obj-fuente">docs/investigacion-fiscal-2026.md (secciones 2 a 6) · docs/bali-indonesia-2026.md (secciones 3, 4 y 7)</span>
      </div>
    </div>
    ${medio}
    ${sinDato}
    ${regimenImprobable}`;
}

// ---------------------------------------------------------------------------
// Render público
// ---------------------------------------------------------------------------

// Pinta SOLO lo que se calcula. Ningún input vive aquí dentro, así que se puede llamar en
// cada tecla sin robarle el foco al usuario (ver bindResidencia).
function pintarResultados(c) {
  set('res-mio-res', pintarMioRes(c));
  set('res-ranking', pintarRanking(c));
  set('res-detalle', pintarDetalle(c));
  set('res-umbrales', pintarUmbrales(c));
  set('res-tabla', pintarTabla(c));
  set('res-paraguay-plan', pintarPlanParaguay(c));
}

// Lo que cuesta MUDARSE, que es la pregunta que de verdad decide y no es fiscal.
// Se separa lo seguro de lo dudoso (el depósito de solvencia) porque las dos fuentes
// oficiales paraguayas se contradicen y no se puede dar por cierto.
function pintarPlanParaguay(c) {
  const { f } = c;
  const o = c.opciones || {};
  const p = planMudanzaParaguay(undefined, num(o.paraguayEurPorUsd, 0));
  const ahorroAlAno = Math.max(0, (netoDe('paraguay', c.beneficio, o).neto || 0)
    - (netoDe('espana-autonomo', c.beneficio, o).neto || 0));
  const anos = ahorroAlAno > 0 ? p.minimo / ahorroAlAno : null;

  const filasTram = p.tramites.map((t) => `<div class="casc-fila">
      <span>${esc(t.concepto)}<small class="mc"> · ${esc(t.nota)}</small></span>
      <span class="num">${euros(f, t.eur)}</span></div>`).join('');

  const filasAhorro = p.partidas.map((x) => `<div class="casc-fila${x.seguro ? '' : ' casc-dudosa'}">
      <span>${esc(x.concepto)}</span>
      <span class="num">${euros(f, x.eur)}</span></div>`).join('');

  return `<div class="bloque-title">Qué cuesta irte a Paraguay</div>
    <div class="casc-grupo">
      <div class="pat-grupo">TRÁMITES DE RESIDENCIA</div>
      ${filasTram}
      <div class="casc-fila casc-hito"><span>Total de trámites</span>
        <span class="num">${euros(f, p.totalTramites)}</span></div>
    </div>
    <p class="mc">Aranceles oficiales del Decreto 6225/2026, indexados al jornal mínimo:
      suben cada julio. La cédula tarda 60 días hábiles y hay que retirarla <strong>en
      persona</strong>, así que cuenta con al menos dos viajes.</p>

    <div class="casc-grupo">
      <div class="pat-grupo">CUÁNTO LLEVAR AHORRADO</div>
      ${filasAhorro}
      <div class="casc-fila casc-hito"><span>Mínimo para irte</span>
        <span class="num pos">${euros(f, p.minimo)}</span></div>
      <div class="casc-fila casc-final"><span>Con el depósito de solvencia por si acaso</span>
        <span class="num">${euros(f, p.conColchon)}</span></div>
    </div>
    ${anos !== null && Number.isFinite(anos) ? `<p class="mc">A tu ritmo de hoy, ahorrando
      todo lo que te ahorrarías en impuestos allí (${euros(f, ahorroAlAno)} al año),
      tardarías <strong>${anos.toFixed(1)} años</strong> en juntar ese mínimo. El dinero
      para mudarte pesa mucho más que el ahorro fiscal: esa es la cuenta que decide.</p>` : ''}

    <div class="aviso-ambar">Dos cosas sin resolver, las dos de fuente oficial paraguaya.
      El Ministerio de Exteriores publica que hacen falta 5.000 USD de solvencia en
      depósito; Migraciones, bajo la Ley 6984/2022, no lo menciona. Y la Resolución
      DNM 407/2026 endureció desde el 6 de julio la acreditación de ingresos, sin publicar
      importes. Pregúntalo por escrito a Migraciones antes de presupuestar nada.
      Y recuerda que <strong>Stripe no opera en Paraguay</strong>.</div>`;
}

// ctx = { beneficioAnual, opciones, f, card } (+ modelo y ventasMedia si se quieren las
// ventas al mes en los umbrales).
export function renderResidencia(ctx) {
  const c = prepararCtx(ctx);
  ctxUltimo = c;

  // Zonas con inputs: se pintan enteras solo aquí, nunca al teclear.
  set('res-mio', pintarMioForm(c));
  set('res-ajustes', pintarAjustes(c));

  pintarResultados(c);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
// Mismo patrón que bindObjetivo y bindPatrimonio, por el mismo motivo: los bloques se
// reescriben enteros en cada repintado, así que un listener colgado de un input concreto
// moriría con él. Todo por delegación desde #v-residencia, que no se destruye nunca.
//
// handlers = { getOpciones, setOpciones, rerender }
export function bindResidencia(handlers) {
  const raiz = document.getElementById('v-residencia');
  if (!raiz || raiz.dataset.resBind === '1') return;
  raiz.dataset.resBind = '1';

  const h = handlers || {};
  const llamar = (fn, v) => { if (typeof fn === 'function') fn(v); };
  const leer = (fn, porDefecto) => (typeof fn === 'function' ? fn() : porDefecto);

  // El ctx de trabajo: lo último que se pintó, pero con las opciones vivas del handler.
  function ctxVivo() {
    const base = ctxUltimo || {};
    return prepararCtx({
      beneficioAnual: base.beneficioReal,
      devengadoAnual: base.devengadoAnual,
      opciones: leer(h.getOpciones, null),
      modelo: base.modelo,
      ventasMedia: base.ventasMedia,
      f: base.f,
      card: base.card,
    });
  }

  const repintarTodo = () => {
    if (typeof h.rerender === 'function') h.rerender();
    else renderResidencia(ctxVivo());
  };

  // Salir de un campo puede ser justo el clic en un botón: primero llega el blur (y con él
  // el 'change') y solo después el clic. Si repintáramos en ese instante, el botón
  // desaparecería por el camino y el primer toque se perdería.
  let pendiente = 0;
  function repintarTodoDiferido() {
    if (pendiente) return;
    pendiente = setTimeout(() => { pendiente = 0; repintarTodo(); }, 0);
  }

  function refrescar() {
    const c = ctxVivo();
    ctxUltimo = c;
    pintarResultados(c);
  }

  // Escribe un ajuste en las opciones guardadas. Las claves que residencia.js no conoce
  // (la horquilla de Dubái) viajan pegadas al objeto: `normalizarOpciones` las ignora al
  // calcular, y de su punto medio sale el coste que sí se usa. Mismo truco que
  // `fijosManual` en el modelo del negocio.
  function aplicarAjuste(el) {
    const k = el.dataset.res;
    if (!k) return false;
    const guardadas = leer(h.getOpciones, null) || {};
    const previas = { ...guardadas, ...normalizarOpciones(guardadas) };
    previas.dubaiCosteMin = num(guardadas.dubaiCosteMin, COSTES_DUBAI.recurrenteMin);
    previas.dubaiCosteMax = num(guardadas.dubaiCosteMax, COSTES_DUBAI.recurrenteMax);

    // Los dos campos que no son un número: se guardan tal cual y `normalizarOpciones` se
    // encarga de que un valor inventado caiga en su valor por defecto.
    if (k === 'comunidad' || k === 'baliRegimen') {
      llamar(h.setOpciones, { ...previas, [k]: el.value });
      return true;
    }

    const v = parseFloat(el.value);
    const valor = Number.isFinite(v) ? Math.max(0, v) : '';

    if (k === 'dubaiCosteMin' || k === 'dubaiCosteMax') {
      const nuevas = { ...previas, [k]: valor === '' ? COSTES_DUBAI[k === 'dubaiCosteMin' ? 'recurrenteMin' : 'recurrenteMax'] : valor };
      // El coste que se calcula es el punto medio de la horquilla: es lo que hace el
      // informe (usa 9.720, el medio de 8.470–10.970).
      nuevas.dubaiCosteAnual = (nuevas.dubaiCosteMin + nuevas.dubaiCosteMax) / 2;
      llamar(h.setOpciones, nuevas);
      return true;
    }

    llamar(h.setOpciones, { ...previas, [k]: valor });
    return true;
  }

  raiz.addEventListener('input', (e) => {
    const benef = e.target.closest('#res-beneficio');
    if (benef) {
      const v = parseFloat(benef.value);
      // Lo tecleado puede venir en meses: se guarda SIEMPRE en años, que es la unidad
      // en la que piensan los escenarios. Solo la pantalla habla de meses.
      const bruto = Number.isFinite(v) ? Math.max(0, v) : 0;
      beneficioManual = bruto * ((PERIODOS[periodoElegido] || PERIODOS.anio).divisor);
      refrescar();
      // Los atajos se marcan con classList, sin reescribir HTML: así se iluminan mientras
      // se teclea en el input de al lado sin robarle el foco.
      raiz.querySelectorAll('.obj-rapido[data-benef]').forEach((b) => {
        b.classList.toggle('on', Math.abs(parseFloat(b.dataset.benef) - beneficioManual) < 0.5);
      });
      return;
    }
    const ajuste = e.target.closest('[data-res]');
    if (ajuste && ajuste.tagName === 'INPUT' && aplicarAjuste(ajuste)) refrescar();
  });

  raiz.addEventListener('change', (e) => {
    const el = e.target.closest('#res-beneficio, [data-res]');
    if (!el) return;
    if (el.id === 'res-beneficio') { repintarTodoDiferido(); return; }
    if (aplicarAjuste(el)) repintarTodoDiferido();
  });

  raiz.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) {
      // El selector mes/año no cambia la cifra, solo cómo se escribe y se lee.
      const per = btn.closest('#res-periodo') ? btn.dataset.periodo : null;
      if (per && PERIODOS[per]) {
        periodoElegido = per;
        repintarTodo();
        return;
      }
      if (btn.id === 'res-beneficio-reset') {
        beneficioManual = null;
        repintarTodo();
        return;
      }
      if (btn.id === 'res-reset') {
        // Las cifras del informe otra vez, horquilla de Dubái incluida.
        llamar(h.setOpciones, {
          ...opcionesPorDefecto(),
          dubaiCosteMin: COSTES_DUBAI.recurrenteMin,
          dubaiCosteMax: COSTES_DUBAI.recurrenteMax,
        });
        repintarTodo();
        return;
      }
      if (btn.dataset.benef !== undefined) {
        beneficioManual = Math.max(0, parseFloat(btn.dataset.benef) || 0);
        repintarTodo();
        return;
      }
    }
    // Los chips del desglose y las tarjetas del ranking apuntan al mismo sitio: solo
    // cambian qué escenario se enseña, no tocan nada guardado.
    const conEsc = e.target.closest('[data-esc]');
    if (conEsc) {
      escSeleccionado = conEsc.dataset.esc;
      refrescar();
    }
  });

  // Las tarjetas del ranking son divs con role="button": el teclado tiene que poder
  // activarlas igual que el ratón.
  raiz.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tarjeta = e.target.closest('.res-card[data-esc]');
    if (!tarjeta) return;
    e.preventDefault();
    escSeleccionado = tarjeta.dataset.esc;
    refrescar();
  });
}
