// Vista "Mi capital": qué parte de lo que tiene es suyo de verdad y cuánto puede mover.
//
// Contesta cuatro preguntas, en este orden y sin que haya que pensar:
//   1. ¿Cuánto tengo libre DE VERDAD?          -> #cap-libre
//   2. Si mañana no vendo nada, ¿cuánto aguanto? -> #cap-colchon
//   3. Quiero meter X en otra cosa, ¿puedo?    -> #cap-simular
//   4. ¿Y si ese dinero se quedara aquí?       -> #cap-coste
//
// Aquí solo hay DOM y strings. Toda la aritmética vive en capital.js (que a su vez le pide
// el dinero de Hacienda a fiscal.js, con sus fuentes). Esta vista NO calcula un euro de
// impuesto ni se inventa un porcentaje: lo único que hace con números es dividir importes
// entre lo que le deja una venta, con el mismo `porVenta` que usa el resto de la app.
//
// LAS TRES REGLAS DE ESTA PANTALLA:
//
//  · El saldo de la cuenta NO se enseña nunca como dinero disponible. La cifra grande es lo
//    LIBRE, y si sale negativa se enseña negativa: es el único caso que obliga a actuar hoy.
//
//  · Ningún importe a secas. Todo lo que él controla se dice también en VENTAS suyas. Los
//    euros son la consecuencia; las ventas son lo único que puede mover.
//
//  · Ningún "consúltalo con tu asesoría" suelto. Donde hay que preguntar algo va LA PREGUNTA
//    EXACTA, en un bloque de texto seleccionable y con su botón de copiar.

import {
  COLCHON,
  PREGUNTA_OTRO_NEGOCIO,
  colchonRecomendado,
  costeDeOportunidad,
  dineroDisponible,
  puedeInvertir,
  simularInversion,
} from './capital.js';

import { formatoEuros } from './calculos.js';
import { normalizarModelo, porVenta } from './objetivo.js';

// ---------------------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------------------

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

// Cómo se lee cada color del semáforo del colchón. Es el MISMO vocabulario que capital.js:
// si la pantalla llamara "seguro" a lo que el módulo llama ámbar, la app diría dos cosas.
const SEMAFORO_TEXTO = {
  verde: 'Puedes',
  ambar: 'Puedes, pero te quedas justo',
  rojo: 'Hoy no',
};

// El paso del campo de importe. 50 € es el mínimo que capital.js considera relevante, así
// que por debajo de eso ni siquiera hay decisión que tomar.
const PASO_IMPORTE = 50;

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
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

// Nunca un NaN ni un Infinity en pantalla: en su lugar, una raya.
function euros(f, n) {
  return Number.isFinite(n) ? f(n) : '—';
}

// Mismo criterio que capital.js: un resto diminuto NO se redondea a "0". Leer "a 0 ventas"
// cuando todavía falta algo es justo el tipo de mentira que da ansiedad.
function ventasTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  if (x > 0 && x < 0.05) return 'menos de 0,1';
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

function mesesTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return 'no lo sé';
  const r = Math.round(Number(n) * 10) / 10;
  return `${String(r).replace('.', ',')} ${r === 1 ? 'mes' : 'meses'}`;
}

const cardPorDefecto = (l, v, mc = '') =>
  `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Un importe dicho también en ventas suyas. `null` cuando una venta no le deja nada (ticket
// 0, comisión del 100 %, su parte al 0 %): ahí no hay ventas que contar y se calla.
function enVentas(c, importe) {
  if (!(c.miParteVenta > 0)) return null;
  return num(importe, 0) / c.miParteVenta;
}

// "7,6 ventas tuyas" · "1 venta tuya". El singular no es cosmético: "1 ventas tuyas" delata
// que la frase la ha montado una máquina, y una frase que suena a máquina se lee como un
// dato aproximado aunque sea exacto.
function ventasTuyas(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const r = Math.round(Number(n) * 10) / 10;
  return `${ventasTexto(n)} ${r === 1 ? 'venta tuya' : 'ventas tuyas'}`;
}

// La coletilla " · X ventas tuyas". Vacía si no se puede traducir a ventas.
function colaVentas(c, importe) {
  const v = enVentas(c, importe);
  if (v === null) return '';
  return ` · ${ventasTuyas(v)}`;
}

// ---------------------------------------------------------------------------
// Las preguntas para la asesoría
// ---------------------------------------------------------------------------
//
// capital.js entrega la pregunta pegada a su frase de introducción ("...mándale esta pregunta
// a tu asesoría tal cual: ¿Tengo que darme de alta...?"). En una sola línea de párrafo esa
// pregunta es ilegible y, sobre todo, no se puede copiar sin arrastrar media pantalla con el
// dedo. Aquí se parte en dos: la frase se queda como aviso y la pregunta va a un bloque
// monoespaciado con su botón, que es exactamente el gesto que hace falta.
const MARCA_PREGUNTA = 'tal cual: ';

function partirPregunta(texto) {
  const t = String(texto ?? '');
  const i = t.indexOf(MARCA_PREGUNTA);
  if (i < 0 || !t.includes(PREGUNTA_OTRO_NEGOCIO)) return null;
  return {
    // La introducción se queda con sus dos puntos ("...tal cual:") y sin el espacio final:
    // es la frase que presenta el bloque de abajo, no una frase suelta.
    intro: t.slice(0, i + MARCA_PREGUNTA.length - 1).trim(),
    pregunta: t.slice(i + MARCA_PREGUNTA.length).trim(),
  };
}

function bloquePregunta(intro, pregunta, id) {
  return `<div class="cap-preg">
    <p class="cap-preg-intro">${esc(intro)}</p>
    <p class="cap-preg-txt" id="${esc(id)}">${esc(pregunta)}</p>
    <button type="button" class="btn btn-ghost cap-copiar" data-copiar="${esc(id)}">${ICON_COPY} Copiar la pregunta</button>
  </div>`;
}

// Los avisos de un resultado, con la pregunta exacta desenganchada si la hay.
function pintarAvisos(lista, idPregunta) {
  const avisos = Array.isArray(lista) ? lista : [];
  return avisos.map((a, i) => {
    const p = partirPregunta(a);
    if (p) return bloquePregunta(p.intro, p.pregunta, `${idPregunta}-${i}`);
    return `<div class="cap-aviso">${ICON_WARN}<span>${esc(a)}</span></div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// El estado del simulador
// ---------------------------------------------------------------------------
//
// Vive en el módulo y no en localStorage a propósito: es un tanteo, no un dato suyo. Lo que
// sí tiene que sobrevivir es a un repintado, porque si no el número se borraría solo cada
// vez que llegan datos nuevos de Tradingverso mientras él está escribiendo.
//
// `tocado` distingue "todavía no ha escrito nada" de "ha escrito un 0". Mientras no toque el
// campo, la propuesta es su dinero libre redondeado hacia abajo; en cuanto escribe, manda él
// y el número deja de moverse bajo sus dedos.
const estado = {
  importe: 0,
  tocado: false,
  retornoPct: 0,
  meses: 12,
};

let ctxUltimo = null;

function importePropuesto(libre) {
  if (!Number.isFinite(libre) || libre <= 0) return 0;
  return Math.floor(libre / 100) * 100;
}

// ---------------------------------------------------------------------------
// El contexto de la pantalla
// ---------------------------------------------------------------------------
//
// ctx = { datos, modelo, hoyISO, patrimonio, gastosFijos, ventasMedia, beneficioAnual,
//         rentaFiscal, presentados, roi, f, card }
// Es EL MISMO ctx que reciben decisiones.js y crecimiento.js: app.js monta uno solo. El ctx
// entero se le pasa tal cual a capital.js, que es su contrato, no el de esta vista.
function prepararCtx(ctx) {
  const c = ctx || {};
  const modelo = normalizarModelo(c.modelo);
  return {
    ctx: c,
    modelo,
    // Lo que le deja UNA venta a él, antes de impuestos. Es la vara con la que se traduce
    // cualquier importe de esta pantalla. Mismo camino que "Cuánto facturar" y que Hacienda.
    miParteVenta: porVenta(modelo).miParte,
    f: typeof c.f === 'function' ? c.f : formatoEuros,
    card: typeof c.card === 'function' ? c.card : cardPorDefecto,
  };
}

// ---------------------------------------------------------------------------
// A) Cuánto tienes libre de verdad
// ---------------------------------------------------------------------------

// La cifra grande de la pantalla. Y puede salir NEGATIVA, que es el caso que más importa:
// significa que una parte de lo que ya tiene comprometido no tiene dinero detrás. Recortarla
// a cero escondería justo lo único que exige actuar hoy.
function pintarLibre(c) {
  const { f } = c;
  const d = dineroDisponible(c.ctx);
  // NO HAY DATO ≠ ESTÁS EN DESCUBIERTO. Sin ninguna cuenta apuntada el total es cero y `libre`
  // sale negativo por construcción, así que el veredicto rojo se disparaba igual: la pantalla
  // abría acusando "ESTÁS EN DESCUBIERTO · 1.743,01 € · TE FALTAN" sobre un estado que no
  // existe, y la única acción que hacía falta -apunta tus cuentas- quedaba a 1.900 caracteres
  // de scroll. Aquí se corta antes: falta un dato, y se pide ese dato.
  const falta = !d.sinDatos && d.libre < 0;

  if (d.sinDatos) {
    return `<div class="cap-hero">
        <p class="cap-eyebrow">Me falta un dato para poder decírtelo</p>
        <div class="cap-big"><span class="num">${euros(f, d.comprometido)}</span><small>ya tienen dueño, y no sé cuánto tienes</small></div>
        <p class="cap-hero-linea">No has apuntado ninguna cuenta, así que no sé cuánto dinero tienes.
          Lo que sí sé es lo que ya tiene dueño: <strong class="num">${euros(f, d.comprometido)}</strong> entre
          Hacienda, tu colchón y lo que hayas etiquetado. En cuanto apuntes tus cuentas, esta pantalla te dice
          exactamente cuánto puedes mover.</p>
        <button type="button" class="btn cap-ir" data-ir="patrimonio">Apuntar mis cuentas en "Mi patrimonio"</button>
      </div>
      <p class="cap-l">Qué está pillado y por qué</p>
      <ul class="cap-desglose">${(d.detalle || []).map((x) => `<li class="cap-linea">
        <div class="cap-linea-cab">
          <span class="cap-linea-cpt">${esc(x.concepto)}</span>
          <span class="cap-linea-eur num">${euros(f, x.eur)}</span>
        </div>
        <p class="cap-linea-motivo">${esc(x.motivo)}${x.eur > 0 ? esc(colaVentas(c, x.eur)) : ''}</p>
      </li>`).join('')}</ul>
      ${pintarAvisos(d.avisos, 'cap-libre-preg')}`;
  }

  const grande = falta
    ? `<div class="cap-big rojo"><span class="num">${euros(f, Math.abs(d.libre))}</span><small>te FALTAN para cubrir lo que ya tiene dueño</small></div>`
    : `<div class="cap-big"><span class="num">${euros(f, d.libre)}</span><small>libre de verdad${d.libre > 0 && d.libreEnVentas !== null ? ` · ${ventasTuyas(d.libreEnVentas)}` : ''}</small></div>`;

  const resumen = `<p class="cap-hero-linea">De los <strong class="num">${euros(f, d.total)}</strong> que hay en tus cuentas,
    <strong class="num">${euros(f, d.comprometido)}</strong> ya tienen dueño: son de Hacienda, de tu colchón o de algo
    que etiquetaste tú. Lo de arriba es lo que queda después de todo eso, que es lo único que puedes mover sin quitárselo a nada.</p>`;

  const filas = (d.detalle || []).map((x) => `<li class="cap-linea">
      <div class="cap-linea-cab">
        <span class="cap-linea-cpt">${esc(x.concepto)}</span>
        <span class="cap-linea-eur num">${euros(f, x.eur)}</span>
      </div>
      <p class="cap-linea-motivo">${esc(x.motivo)}${x.eur > 0 ? esc(colaVentas(c, x.eur)) : ''}</p>
    </li>`).join('');

  return `<div class="cap-hero ${falta ? 'rojo' : 'verde'}">
      <p class="cap-eyebrow">${falta ? 'Estás en descubierto sobre lo comprometido' : 'Puedes mover, sin quitárselo a nada'}</p>
      ${grande}
      ${resumen}
    </div>
    <p class="cap-l">Qué está pillado y por qué</p>
    <ul class="cap-desglose">${filas}</ul>
    ${pintarAvisos(d.avisos, 'cap-libre-preg')}
    <p class="cap-pie">Un objetivo NO cuenta como comprometido salvo que tú lo marques como intocable en "Mi patrimonio":
      un objetivo se puede retrasar, y dar por intocable todo lo que tiene nombre dejaría esta cifra en cero para siempre.
      El dinero de Hacienda no es una estimación de esta pantalla: sale de la pestaña "Hacienda", con su calendario y su artículo al lado.</p>`;
}

// ---------------------------------------------------------------------------
// B) El colchón
// ---------------------------------------------------------------------------

// La barra de meses. El objetivo de 6 meses va MARCADO encima de la barra, no escrito al
// lado: la pregunta es "¿llego o no llego?", y eso se contesta de un vistazo o no se contesta.
// `queFalta` nombra el dato que falta cuando no hay barra que dibujar: no es lo mismo no
// saber lo que cuesta vivir que no saber cuánto dinero hay, y decir el motivo equivocado
// manda a la pestaña equivocada.
function barraColchon(meses, objetivo, queFalta = 'no sé cuánto te cuesta vivir cada mes') {
  if (meses === null || !Number.isFinite(meses)) {
    return `<div class="cap-barra sin-dato">
      <div class="cap-barra-track"><div class="cap-barra-lleno" style="width:0%"></div></div>
      <p class="cap-barra-nota">No puedo dibujarla: ${esc(queFalta)}.</p>
    </div>`;
  }
  // La escala deja siempre el objetivo dentro de la barra, aunque él aguante mucho más: una
  // marca pegada al borde derecho no se lee como una meta, se lee como un adorno.
  const escala = Math.max(objetivo * 1.15, meses * 1.05, 1);
  const pct = Math.max(0, Math.min(100, (meses / escala) * 100));
  const marca = Math.max(0, Math.min(100, (objetivo / escala) * 100));
  const llega = meses >= objetivo;
  return `<div class="cap-barra">
    <div class="cap-barra-track" role="img" aria-label="Aguantas ${mesesTexto(meses)} de ${objetivo} meses recomendados">
      <div class="cap-barra-lleno ${llega ? 'ok' : 'corto'}" style="width:${pct.toFixed(1)}%"></div>
      <div class="cap-barra-marca" style="left:${marca.toFixed(1)}%"></div>
    </div>
    <div class="cap-barra-pies">
      <span>0 meses</span>
      <span class="cap-barra-obj">objetivo · ${objetivo} meses</span>
      <span class="der">${mesesTexto(escala)}</span>
    </div>
  </div>`;
}

function pintarColchon(c) {
  const { f, card } = c;
  const x = colchonRecomendado(c.ctx);

  // Sin cuentas apuntadas no hay meses que enseñar: "aguantas -3,6 meses" y "Tengo para vivir
  // -651,01 €" son artefactos de restar deudas a un patrimonio vacío, no una situación.
  const grande = `<div class="cap-big ${x.semaforo}"><span class="num">${x.mesesQueAguanta === null ? '—' : mesesTexto(x.mesesQueAguanta)}</span><small>${x.sinDatos ? 'no lo sé todavía: te faltan las cuentas' : 'aguantas si mañana no vendes nada más'}</small></div>`;

  const tarjetas = [
    card('Tengo para vivir', `<span class="num">${x.sinDatos ? '—' : euros(f, x.tengo)}</span>`,
      x.sinDatos
        ? 'apunta tus cuentas en "Mi patrimonio"'
        : (x.impuestosDescontados > 0
          ? `tus cuentas menos ${esc(euros(f, x.impuestosDescontados))} de Hacienda`
          : 'lo que hay en tus cuentas')),
    card('Me cuesta vivir', `<span class="num">${euros(f, x.gastoMensual)}</span>`,
      x.fuente === 'datos' ? 'al mes, de tus gastos apuntados' : 'al mes, del modelo: no están apuntados'),
    card(`Para ${x.meses} meses hacen falta`, `<span class="num">${euros(f, x.necesario)}</span>`,
      `${x.meses} × lo que te cuesta un mes`),
    x.sinDatos
      ? card('Me faltan', '<span class="num">—</span>', 'no lo sé hasta que apuntes tus cuentas')
      : card(x.cubierto ? 'Ya está cubierto' : 'Me faltan',
        `<span class="num ${x.cubierto ? 'pos' : 'neg'}">${x.cubierto ? euros(f, 0) : euros(f, x.falta)}</span>`,
        x.cubierto ? 'no tienes que reunir nada más' : ventasTuyas(x.faltaEnVentas)),
  ].join('');

  return `<div class="cap-caja ${x.semaforo}">
      <p class="cap-eyebrow">${x.sinDatos ? 'Me falta un dato para poder decírtelo' : 'Con el negocio parado, sin un euro más entrando'}</p>
      ${grande}
      ${barraColchon(x.mesesQueAguanta, x.meses, x.sinDatos ? 'todavía no has apuntado ninguna cuenta' : 'no sé cuánto te cuesta vivir cada mes')}
    </div>
    <div class="grid grid-4 cap-grid">${tarjetas}</div>
    ${pintarAvisos(x.avisos, 'cap-colchon-preg')}
    <p class="cap-pie">Los ${COLCHON.mesesRecomendados} meses son una decisión de diseño, no una norma: no hay ninguna ley que los exija.
      Es el plazo que te deja aguantar un parón sin tener que aceptar el primer trabajo que aparezca.
      Del dinero de tus cuentas se descuenta antes lo de Hacienda: ese dinero no es comida.</p>`;
}

// ---------------------------------------------------------------------------
// C) Quiero meter X en otra cosa
// ---------------------------------------------------------------------------

// Los atajos del campo. No son decoración: "el máximo sin bajar de 6 meses" es literalmente
// la pregunta que se hace cuando la respuesta es que no, y tenerla a un toque evita el juego
// de subir y bajar el número a ciegas hasta que el semáforo cambie de color.
function atajos(c, r) {
  const libre = Math.max(0, num(r.antes.libre, 0));
  const opciones = [
    { eur: r.maximo.verde, txt: 'El máximo tranquilo' },
    { eur: r.maximo.ambar, txt: 'El máximo al límite' },
    { eur: libre, txt: 'Todo lo libre' },
  ].filter((o) => Number.isFinite(o.eur) && o.eur > 0);

  // Sin duplicados: dos botones con el mismo importe son dos botones que hacen lo mismo.
  const vistos = new Set();
  const botones = opciones.filter((o) => {
    const k = Math.round(o.eur * 100);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).map((o) => `<button type="button" class="btn btn-ghost cap-atajo" data-cap-poner="${o.eur}">${esc(o.txt)} · ${esc(euros(c.f, o.eur))}</button>`).join('');

  return botones ? `<div class="cap-atajos">${botones}</div>` : '';
}

function pintarSimuladorCampo() {
  return `<div class="cap-campo">
    <label for="cap-importe">Quiero meter en otra cosa</label>
    <div class="cap-campo-fila">
      <input type="number" id="cap-importe" data-cap-campo="importe" inputmode="decimal"
        step="${PASO_IMPORTE}" min="0" value="${esc(estado.importe)}" />
      <span class="cap-campo-eur">€</span>
    </div>
  </div>`;
}

// El resultado. Se pinta en su propia caja para poder repintarlo mientras él teclea sin
// tocar el input: reescribir el campo a media palabra le robaría el foco en cada letra.
function pintarSimuladorResultado(c) {
  const { f } = c;
  const x = Math.max(0, num(estado.importe, 0));
  const r = puedeInvertir(c.ctx, x);

  const titulo = SEMAFORO_TEXTO[r.semaforo] || 'No lo sé';
  const cabecera = `<div class="cap-veredicto ${esc(r.semaforo)}">
      <span class="cap-veredicto-luz" aria-hidden="true"></span>
      <div>
        <p class="cap-veredicto-tit">${esc(titulo)}: ${esc(euros(f, r.importe))}${esc(colaVentas(c, r.importe))}</p>
        <p class="cap-veredicto-sub">Después te quedarían <strong>${esc(mesesTexto(r.despues.mesesDeColchon))}</strong> de colchón,
          y <strong class="num">${esc(euros(f, r.despues.libre))}</strong> libres.</p>
      </div>
    </div>`;

  const antesDespues = `<div class="cap-antesdespues">
      <div class="cap-ad">
        <p class="cap-ad-l">Ahora</p>
        <p class="cap-ad-v num">${esc(mesesTexto(r.antes.mesesDeColchon))}</p>
        <p class="cap-ad-mc">${esc(euros(f, r.antes.libre))} libres</p>
      </div>
      <span class="cap-ad-flecha" aria-hidden="true">→</span>
      <div class="cap-ad ${r.semaforo}">
        <p class="cap-ad-l">Si lo metes</p>
        <p class="cap-ad-v num">${esc(mesesTexto(r.despues.mesesDeColchon))}</p>
        <p class="cap-ad-mc">${esc(euros(f, r.despues.libre))} libres</p>
      </div>
    </div>`;

  const techos = `<div class="cap-techos">
      <p><span class="cap-techo-l">Lo máximo sin bajar de ${COLCHON.verde} meses</span>
        <strong class="num">${esc(euros(f, r.maximo.verde))}</strong></p>
      <p><span class="cap-techo-l">Lo máximo sin bajar de ${COLCHON.ambar} meses</span>
        <strong class="num">${esc(euros(f, r.maximo.ambar))}</strong></p>
      ${r.faltaParaVerde.eur > 0
    ? `<p><span class="cap-techo-l">Para que ESTA cantidad salga en verde te falta reunir</span>
        <strong class="num">${esc(euros(f, r.faltaParaVerde.eur))}</strong>
        <span class="mc">${esc(ventasTuyas(r.faltaParaVerde.ventas))}</span></p>`
    : ''}
    </div>`;

  return cabecera + antesDespues + techos + pintarAvisos(r.avisos, 'cap-sim-preg');
}

// El "y si": qué le pasa al colchón mes a mes. Va plegado porque no hace falta para decidir
// si PUEDE: hace falta para decidir si COMPENSA, que es la pregunta siguiente.
//
// OJO A LA ESTRUCTURA, que no es capricho. El <details> y sus dos campos viven FUERA de
// #cap-simular-res y lo calculado vive dentro de #cap-simular-yasi. Con todo junto pasaba
// esto: al teclear el retorno se repintaba el bloque entero, el input moría a media cifra,
// se perdía el foco y el <details> se cerraba solo. Cada trozo se repinta desde donde no se
// está escribiendo.
function pintarSimulacionCaja(c) {
  return `<details class="cap-det">
    <summary>Y si me devolviera algo, ¿cuándo lo recupero?</summary>
    <div class="cap-det-cuerpo">
      <div class="cap-campos">
        <div class="cap-campo">
          <label for="cap-retorno">Suponiendo un retorno anual del</label>
          <div class="cap-campo-fila">
            <input type="number" id="cap-retorno" data-cap-campo="retornoPct" inputmode="decimal" step="1" value="${esc(estado.retornoPct)}" />
            <span class="cap-campo-eur">%</span>
          </div>
        </div>
        <div class="cap-campo">
          <label for="cap-meses">durante</label>
          <div class="cap-campo-fila">
            <input type="number" id="cap-meses" data-cap-campo="meses" inputmode="numeric" step="1" min="0" max="600" value="${esc(estado.meses)}" />
            <span class="cap-campo-eur">meses</span>
          </div>
        </div>
      </div>
      <div id="cap-simular-yasi">${pintarSimulacion(c)}</div>
    </div>
  </details>`;
}

function pintarSimulacion(c) {
  const { f } = c;
  const importe = Math.max(0, num(estado.importe, 0));
  if (!(importe > 0)) {
    return '<p class="cap-intro">Escribe arriba una cantidad y aquí verás mes a mes qué pasa con tu colchón.</p>';
  }
  const s = simularInversion(c.ctx, importe, estado.retornoPct, estado.meses);

  // Como mucho trece filas. Una tabla de 60 meses en un iPhone no se lee: se arrastra.
  const paso = Math.max(1, Math.ceil(s.mensual.length / 13));
  const filas = s.mensual
    .filter((m, i) => i % paso === 0 || i === s.mensual.length - 1)
    .map((m) => `<tr class="${m.semaforo === 'rojo' ? 'cap-fila-roja' : ''}">
      <td>${m.mes === 0 ? 'hoy' : `mes ${m.mes}`}</td>
      <td class="num">${esc(euros(f, m.sinInvertir))}</td>
      <td class="num ${m.conInversion >= 0 ? '' : 'neg'}">${esc(euros(f, m.conInversion))}</td>
      <td class="num">${esc(euros(f, m.devuelto))}</td>
      <td class="num">${esc(mesesTexto(m.mesesDeColchon))}</td>
    </tr>`).join('');

  const recuperar = s.mesesHastaRecuperar === null
    ? 'No lo recuperas dentro del plazo que has puesto.'
    : `Recuperas lo puesto en el mes ${s.mesesHastaRecuperar}.`;

  return `<p class="cap-supuesto">${esc(s.supuesto)}</p>
    <div class="cap-flujo">
      <p><span>Te entra al mes</span><strong class="num">${esc(euros(f, s.rentaMensual))}</strong></p>
      <p><span>Se te va en vivir</span><strong class="num">−${esc(euros(f, s.gastoMensual))}</strong></p>
      <p><span>Se te va en IRPF</span><strong class="num">−${esc(euros(f, s.irpfMensual))}</strong></p>
      <p class="cap-flujo-total"><span>Ahorras al mes</span><strong class="num ${s.flujoMensual >= 0 ? 'pos' : 'neg'}">${esc(euros(f, s.flujoMensual))}</strong></p>
    </div>
    <p class="cap-recupera">${esc(recuperar)}</p>
    <div class="tabla-wrap"><table>
      <thead><tr><th>Cuándo</th><th class="num">Sin invertir</th><th class="num">Si inviertes</th><th class="num">Te ha devuelto</th><th class="num">Colchón</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>
    ${pintarAvisos(s.avisos, 'cap-simul-preg')}`;
}

function pintarSimulador(c) {
  return `<p class="cap-intro">Escribe cuánto estás pensando meter en otra cosa y mira qué te queda detrás.
      No es un consejo de inversión: es la única cuenta que la app puede hacer sin inventarse nada, que es
      cuántos meses de vida te quedan cubiertos después.</p>
    ${pintarSimuladorCampo()}
    ${atajos(c, puedeInvertir(c.ctx, Math.max(0, num(estado.importe, 0))))}
    <div id="cap-simular-res">${pintarSimuladorResultado(c)}</div>
    ${pintarSimulacionCaja(c)}`;
}

// ---------------------------------------------------------------------------
// D) Lo que ese dinero daría en el negocio de siempre
// ---------------------------------------------------------------------------

function pintarCoste(c) {
  const { f, card } = c;
  const x = Math.max(0, num(estado.importe, 0));
  const r = costeDeOportunidad(c.ctx, x);

  if (!(x > 0)) {
    return `<p class="cap-intro">Escribe arriba una cantidad y aquí te digo qué es ese dinero con tus varas:
      cuántas ventas, cuántos meses de gastos del negocio y cuántos meses de tu vida.</p>`;
  }

  const varas = [
    card('Eso, en ventas tuyas', `<span class="num">${r.ventasEquivalentes === null ? '—' : esc(ventasTexto(r.ventasEquivalentes))}</span>`,
      r.paraEmpatar.mesesAlRitmoDeHoy === null
        ? 'ventas tuyas para recuperarlo'
        : `ventas tuyas · a tu ritmo de hoy, ${esc(mesesTexto(r.paraEmpatar.mesesAlRitmoDeHoy))}`),
    card('Gastos fijos del negocio', `<span class="num">${esc(mesesTexto(r.mesesDeFijosNegocio))}</span>`, 'pagados por adelantado'),
    card('Tu vida', `<span class="num">${esc(mesesTexto(r.mesesDeTuVida))}</span>`, 'cubiertos con ese dinero'),
  ].join('');

  const opciones = (r.opciones || []).map((o) => `<div class="cap-opcion ${o.seguro ? 'seguro' : 'incierto'}">
      <div class="cap-opcion-cab">
        <span class="cap-opcion-nombre">${esc(o.nombre)}</span>
        <span class="fila-tag ${o.seguro ? 'meta' : 'ahora'}">${o.seguro ? 'SEGURO' : 'NO MEDIDO'}</span>
      </div>
      <div class="cap-opcion-eur num ${num(o.retorno, 0) > 0 ? 'pos' : ''}">${o.retorno === null ? '—' : esc(euros(f, o.retorno))}</div>
      <p class="cap-opcion-nota">${esc(o.nota)}</p>
    </div>`).join('');

  return `<div class="grid grid-3 cap-grid">${varas}</div>
    <p class="cap-l">Contra qué se compara</p>
    <div class="cap-opciones">${opciones}</div>
    ${pintarAvisos(r.avisos, 'cap-coste-preg')}
    <p class="cap-pie">Los seguros van primero y los inciertos después, aunque el número del incierto sea mayor.
      Ordenarlos todos juntos por la cifra pondría un retorno hipotético por delante de uno que está en el BOE,
      que es la forma de tomar la peor decisión posible con la mejor tabla posible.</p>`;
}

// ---------------------------------------------------------------------------
// Render público
// ---------------------------------------------------------------------------

// ctx = { datos, modelo, hoyISO, patrimonio, gastosFijos, ventasMedia, beneficioAnual,
//         rentaFiscal, presentados, roi, f, card }
export function renderCapital(ctx) {
  const c = prepararCtx(ctx);
  ctxUltimo = c;

  // La propuesta del campo sigue a su dinero libre MIENTRAS no haya escrito nada. En cuanto
  // toca el campo, manda él: un número que se mueve solo bajo los dedos es un número en el
  // que no se puede confiar para decidir nada.
  if (!estado.tocado) {
    estado.importe = importePropuesto(dineroDisponible(c.ctx).libre);
  }

  set('cap-libre', pintarLibre(c));
  set('cap-colchon', pintarColchon(c));
  set('cap-simular', pintarSimulador(c));
  set('cap-coste', pintarCoste(c));
}

// Repinta SOLO lo que depende del importe tecleado. Ni el campo del importe ni los dos del
// "y si" se tocan: reescribir un input a media palabra mata el foco y, en un iPhone, cierra
// el teclado en mitad de una cifra.
function refrescarPorImporte() {
  if (!ctxUltimo) return;
  set('cap-simular-res', pintarSimuladorResultado(ctxUltimo));
  set('cap-simular-yasi', pintarSimulacion(ctxUltimo));
  set('cap-coste', pintarCoste(ctxUltimo));
}

// El retorno y el plazo solo mueven la tabla del "y si". Repintar de más aquí cerraría el
// <details> que él acaba de abrir.
function refrescarSimulacion() {
  if (!ctxUltimo) return;
  set('cap-simular-yasi', pintarSimulacion(ctxUltimo));
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
//
// Mismo patrón que bindPatrimonio, bindObjetivo, bindResidencia y bindFiscal: todo por
// delegación desde #v-capital, que no se destruye nunca, y con una marca en el dataset para
// no engancharse dos veces.
//
// handlers = { irA, rerender }
export function bindCapital(handlers) {
  const raiz = document.getElementById('v-capital');
  if (!raiz || raiz.dataset.capBind === '1') return;
  raiz.dataset.capBind = '1';

  const h = handlers || {};

  // Copiar al portapapeles. Mismo camino que la pestaña "Hacienda": la API moderna necesita
  // contexto seguro (https, que es lo que da GitHub Pages) y un gesto del usuario, que lo
  // hay; el camino viejo se queda como red de seguridad para que el botón nunca se quede
  // sin hacer nada y en silencio.
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
    boton.classList.toggle('cap-copiada', ok);
    setTimeout(() => {
      boton.innerHTML = original;
      boton.classList.remove('cap-copiada');
    }, ok ? 1800 : 4000);
  };

  const escribir = (campo, valor) => {
    if (campo === 'importe') {
      estado.importe = Math.max(0, num(valor, 0));
      estado.tocado = true;
    } else if (campo === 'retornoPct') {
      estado.retornoPct = num(valor, 0);
    } else if (campo === 'meses') {
      estado.meses = Math.max(0, Math.min(600, Math.trunc(num(valor, 0))));
    }
  };

  raiz.addEventListener('input', (e) => {
    const el = e.target.closest('[data-cap-campo]');
    if (!el) return;
    const campo = el.dataset.capCampo;
    escribir(campo, el.value);
    if (campo === 'importe') refrescarPorImporte(); else refrescarSimulacion();
  });

  raiz.addEventListener('click', (e) => {
    const btnCopiar = e.target.closest('[data-copiar]');
    if (btnCopiar) {
      const origen = document.getElementById(btnCopiar.dataset.copiar);
      if (origen) copiar(origen.textContent || '', btnCopiar);
      return;
    }

    const atajo = e.target.closest('[data-cap-poner]');
    if (atajo) {
      estado.importe = Math.max(0, num(atajo.dataset.capPoner, 0));
      estado.tocado = true;
      const campo = document.getElementById('cap-importe');
      if (campo) campo.value = estado.importe;
      refrescarPorImporte();
      return;
    }

    const ir = e.target.closest('[data-ir]');
    if (ir && typeof h.irA === 'function') h.irA(ir.dataset.ir);
  });
}
