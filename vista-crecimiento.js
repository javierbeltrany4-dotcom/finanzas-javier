// Vista "Crecer": qué mover para ganar más, con SUS números y no en abstracto.
//
// Contesta cuatro preguntas, en este orden:
//   1. ¿Suben o bajan mis ventas?              -> #cre-tendencia
//   2. ¿Qué palanca mueve más, y de quién      -> #cre-palancas
//      depende cada una?
//   3. ¿Cuál es el siguiente objetivo sensato? -> #cre-objetivo
//   4. ¿Y si sigo igual, mejoro o me paro?     -> #cre-escenarios
//
// Aquí solo hay DOM y strings. Toda la aritmética vive en crecimiento.js (que a su vez le
// pide el IRPF por tramos a objetivo.js y la comparación entre países a residencia.js, cada
// uno con sus fuentes dentro). Esta vista no calcula dinero ni se inventa una cifra fiscal.
//
// LAS TRES REGLAS DE ESTA PANTALLA:
//
//  · No se dibuja una flecha donde no hay señal. Si la recta no explica lo que pasa,
//    crecimiento.js devuelve `sin-senal` y aquí se dice con esas palabras, en ámbar, sin
//    flecha y sin pendiente. Un "vas subiendo" sacado del ruido es peor que no decir nada.
//
//  · Las palancas se separan por QUIÉN las activa antes que por cuánto dan. La más grande de
//    todas -renegociar su parte del beneficio- no la puede activar él solo, y eso hay que
//    leerlo antes que el número.
//
//  · Ningún "consúltalo con tu asesoría" suelto: donde hay que preguntar algo va LA PREGUNTA
//    EXACTA, en un bloque seleccionable y con su botón de copiar.

import {
  estacionalidad,
  evolucionVentas,
  palancasReales,
  proyeccionRealista,
  siguienteObjetivoSensato,
} from './crecimiento.js';

import { formatoEuros } from './calculos.js';

// ---------------------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------------------

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

// Las flechas SOLO se usan cuando hay señal. Para lo plano va una raya, y para lo que no se
// puede medir no va ningún símbolo: va la palabra.
const FLECHA_ARRIBA = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1 L9 8 L1 8 Z" fill="currentColor"/></svg>';
const FLECHA_ABAJO = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 9 L1 2 L9 2 Z" fill="currentColor"/></svg>';
const RAYA = '<svg viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="4.2" width="8" height="1.6" fill="currentColor"/></svg>';

const ESFUERZO_TEXTO = { bajo: 'Esfuerzo bajo', medio: 'Esfuerzo medio', alto: 'Esfuerzo alto' };

const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Los dos horizontes de la proyección. Seis meses es lo que se puede empujar; doce, lo que
// se puede planear. Más allá de ahí cualquier línea es literatura.
const HORIZONTES = [6, 12];

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

function euros(f, n) {
  return Number.isFinite(n) ? f(n) : '—';
}

function ventasTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  if (x > 0 && x < 0.05) return 'menos de 0,1';
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

function pctTexto(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return `${Number(n).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} %`;
}

// "1 venta al mes" y no "1 ventas al mes". El singular no es cosmético: una frase que suena
// a máquina se lee como un dato aproximado aunque sea exacto.
function ventasAlMes(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const r = Math.round(Number(n) * 10) / 10;
  return `${ventasTexto(n)} ${r === 1 ? 'venta al mes' : 'ventas al mes'}`;
}

// El nombre INTERNO de la pestaña, traducido al que él ve en la barra. crecimiento.js la
// llama "Reparto de capital" (así se llamaba la sesión 6 del plan) y en la app pone "Mi
// capital". Es una transformación de PRESENTACIÓN, igual que las fechas ISO de "Y ahora
// qué": no toca el módulo, no cambia ninguna cifra y evita mandarle a una pestaña que no
// existe, que es la forma más rápida de que deje de fiarse de las indicaciones.
function textoPantalla(v) {
  return String(v ?? '').replace(/Reparto de capital/g, 'Mi capital');
}

// 'YYYY-MM' -> 'jul 26'. En una columna de 27 px no cabe otra cosa.
function mesCorto(ym) {
  const s = String(ym ?? '');
  if (!/^\d{4}-\d{2}$/.test(s)) return '';
  return `${MESES_CORTO[Number(s.slice(5, 7)) - 1]} ${s.slice(2, 4)}`;
}

// El mismo mes, partido en dos trozos. Con doce columnas en un iPhone de 390 px cada una
// mide 25 px y "jul 26" no cabe: el año se esconde por CSS en móvil (.cre-col-anio) y en
// pantalla ancha se ve entero. Partirlo aquí evita tener que decidirlo en JavaScript, que es
// lo que obligaría a mirar el ancho de la ventana desde dentro de una vista.
function mesCortoPartido(ym) {
  const s = String(ym ?? '');
  if (!/^\d{4}-\d{2}$/.test(s)) return '';
  return `${MESES_CORTO[Number(s.slice(5, 7)) - 1]}<span class="cre-col-anio"> ${s.slice(2, 4)}</span>`;
}

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// Las preguntas para la asesoría
// ---------------------------------------------------------------------------
//
// crecimiento.js entrega la pregunta de la mudanza pegada a su frase de introducción
// ("...mándale esta pregunta a tu asesoría tal cual: ¿Qué tengo que hacer para..."). En una
// línea de párrafo no se puede ni leer ni copiar, así que se parte en dos: la frase se queda
// arriba y la pregunta va a un bloque monoespaciado con su botón.
const MARCA_PREGUNTA = 'tal cual: ';

function partirPregunta(texto) {
  const t = String(texto ?? '');
  const i = t.indexOf(MARCA_PREGUNTA);
  // El corte solo vale si detrás hay una pregunta de verdad y no el final de una frase.
  if (i < 0 || t.length - (i + MARCA_PREGUNTA.length) < 40) return null;
  return {
    intro: t.slice(0, i + MARCA_PREGUNTA.length - 1).trim(),
    pregunta: t.slice(i + MARCA_PREGUNTA.length).trim(),
  };
}

function bloquePregunta(intro, pregunta, id) {
  return `<div class="cre-preg">
    ${intro ? `<p class="cre-preg-intro">${esc(intro)}</p>` : ''}
    <p class="cre-preg-txt" id="${esc(id)}">${esc(pregunta)}</p>
    <button type="button" class="btn btn-ghost cre-copiar" data-copiar="${esc(id)}">${ICON_COPY} Copiar la pregunta</button>
  </div>`;
}

// Un texto que PUEDE llevar una pregunta pegada: se pinta como párrafo o como párrafo más
// bloque copiable, según lo que traiga.
function textoConPregunta(texto, id, clase = 'cre-txt') {
  const p = partirPregunta(texto);
  if (!p) return `<p class="${clase}">${esc(texto)}</p>`;
  return `<p class="${clase}">${esc(p.intro)}</p>${bloquePregunta('', p.pregunta, id)}`;
}

function pintarAvisos(lista, idBase) {
  return (Array.isArray(lista) ? lista : []).map((a, i) => {
    const p = partirPregunta(a);
    if (p) return bloquePregunta(p.intro, p.pregunta, `${idBase}-${i}`);
    return `<div class="cre-aviso">${ICON_WARN}<span>${esc(textoPantalla(a))}</span></div>`;
  }).join('');
}

// ---------------------------------------------------------------------------
// El contexto de la pantalla
// ---------------------------------------------------------------------------
//
// ctx = { datos, modelo, hoyISO, ventasMedia, gastosFijos, beneficioAnual, rentaFiscal,
//         residencia, f }
// Es EL MISMO ctx que reciben decisiones.js y capital.js: app.js monta uno solo, y por eso
// las tres pantallas no pueden decir dos cifras distintas del mismo negocio.
function prepararCtx(ctx) {
  const c = ctx || {};
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(c.hoyISO ?? '')) ? String(c.hoyISO) : '';
  return {
    // El ctx entero, tal cual, para dárselo a crecimiento.js: su contrato es suyo, no de
    // esta vista, y aquí no se le recorta ni se le reordena nada.
    ctx: c,
    datos: c.datos || {},
    hoy,
    // El mes que todavía está abierto. Se le pasa a `evolucionVentas` para que no cuente:
    // el día 3 de agosto, con una venta hecha, agosto arrastraría la recta hacia abajo y la
    // pantalla diría que el negocio se hunde.
    mesEnCurso: hoy ? hoy.slice(0, 7) : '',
    // Ni el modelo ni la traducción a ventas hacen falta aquí: crecimiento.js ya devuelve
    // cada impacto en ventas al mes (`equivaleAVentasAlMes`), calculado por bisección sobre
    // el IRPF por tramos. Dividir por el margen aquí daría un número más bonito y falso.
    f: typeof c.f === 'function' ? c.f : formatoEuros,
  };
}

// ---------------------------------------------------------------------------
// A) ¿Suben o bajan las ventas?
// ---------------------------------------------------------------------------

// Las barras de los meses. No es un adorno: es lo que deja ver de un vistazo si la media
// esconde un mes en blanco. Los meses sin ninguna venta salen como columna vacía y con su
// cero, porque un hueco invisible es el dato más importante que se puede perder.
function barrasMeses(puntos) {
  const lista = Array.isArray(puntos) ? puntos : [];
  if (!lista.length) return '';
  const max = Math.max(1, ...lista.map((p) => num(p.ventas, 0)));
  const barras = lista.map((p) => {
    const v = num(p.ventas, 0);
    const alto = Math.max(2, (v / max) * 100);
    return `<div class="cre-col" title="${esc(p.mes)}: ${v} ${v === 1 ? 'venta' : 'ventas'}">
      <span class="cre-col-v num">${v}</span>
      <div class="cre-col-barra"><div class="cre-col-lleno ${v === 0 ? 'cero' : ''}" style="height:${alto.toFixed(1)}%"></div></div>
      <span class="cre-col-mes">${mesCortoPartido(p.mes)}</span>
    </div>`;
  }).join('');
  return `<div class="cre-barras">${barras}</div>`;
}

// La estacionalidad va PLEGADA y detrás de la tendencia. Con un año de datos no es un patrón
// -es la lista de lo que ha pasado- y crecimiento.js lo dice; enseñarla al mismo nivel que la
// tendencia haría que se leyera como si lo fuera.
function pintarEstacionalidad(c) {
  const e = estacionalidad(c.datos);
  const conDatos = (e.porMes || []).filter((m) => m.observaciones > 0);
  if (!conDatos.length) return '';

  const max = Math.max(1, ...conDatos.map((m) => num(m.media, 0)));
  const filas = conDatos.map((m) => {
    const pct = Math.max(2, (num(m.media, 0) / max) * 100);
    return `<div class="cre-mes-fila">
      <span class="cre-mes-nombre">${esc(m.nombre)}</span>
      <div class="cre-mes-track"><div class="cre-mes-lleno" style="width:${pct.toFixed(1)}%"></div></div>
      <span class="cre-mes-v num">${esc(ventasTexto(m.media))}</span>
      <span class="cre-mes-obs mc">${m.observaciones === 1 ? '1 vez' : `${m.observaciones} veces`}</span>
    </div>`;
  }).join('');

  return `<details class="cre-det">
    <summary>¿Hay meses mejores que otros?${e.haySenal ? '' : ' — todavía no se puede saber'}</summary>
    <div class="cre-det-cuerpo">
      <p class="cre-txt">${esc(e.texto)}</p>
      <div class="cre-meses">${filas}</div>
      ${pintarAvisos(e.avisos, 'cre-estacional-preg')}
    </div>
  </details>`;
}

function pintarTendencia(c) {
  const e = evolucionVentas(c.datos, 12, c.mesEnCurso ? { mesEnCurso: c.mesEnCurso } : undefined);

  // El titular y su símbolo. Aquí está la regla dura de esta pantalla: sin señal NO hay
  // flecha. Ni hacia arriba ni hacia abajo. La palabra es "no lo sé todavía".
  let clase = 'sin-senal';
  let simbolo = '';
  let titular = 'Todavía no se puede decir';
  if (e.tendencia === 'sube') {
    clase = 'sube';
    simbolo = FLECHA_ARRIBA;
    titular = 'Tus ventas suben';
  } else if (e.tendencia === 'baja') {
    clase = 'baja';
    simbolo = FLECHA_ABAJO;
    titular = 'Tus ventas bajan';
  } else if (e.tendencia === 'plana') {
    clase = 'plana';
    simbolo = RAYA;
    titular = 'Tus ventas están planas';
  }

  const media = e.media === null
    ? ''
    : `<div class="cre-dato"><span class="cre-dato-v num">${esc(ventasTexto(e.media))}</span><span class="cre-dato-l">ventas al mes de media</span></div>`;

  const pendiente = e.haySenal && Number.isFinite(e.pendiente)
    ? `<div class="cre-dato"><span class="cre-dato-v num">${e.pendiente > 0 ? '+' : '−'}${esc(ventasTexto(Math.abs(e.pendiente)))}</span><span class="cre-dato-l">ventas al mes, cada mes</span></div>`
    : '';

  // El R² se enseña SIEMPRE que exista, también cuando no llega al listón: es el número que
  // permite desconfiar de la línea, y esconderlo cuando sale mal sería quedarse solo con las
  // veces que la estadística da la razón.
  const ajuste = Number.isFinite(e.r2)
    ? `<div class="cre-dato"><span class="cre-dato-v num">${esc(pctTexto(e.r2 * 100))}</span><span class="cre-dato-l">explica la recta${Number.isFinite(e.r2Exigido) ? ` · hace falta ${esc(pctTexto(e.r2Exigido * 100))}` : ''}</span></div>`
    : '';

  const meses = e.n > 0
    ? `<div class="cre-dato"><span class="cre-dato-v num">${e.n}</span><span class="cre-dato-l">${e.n === 1 ? 'mes cerrado medido' : 'meses cerrados medidos'}</span></div>`
    : '';

  return `<div class="cre-tend ${clase}">
      <p class="cre-tend-tit">${simbolo}<span>${esc(titular)}</span></p>
      <p class="cre-tend-txt">${esc(e.texto)}</p>
      <div class="cre-datos">${media}${pendiente}${ajuste}${meses}</div>
    </div>
    ${barrasMeses(e.puntos)}
    ${pintarAvisos(e.avisos, 'cre-tend-preg')}
    ${pintarEstacionalidad(c)}
    <p class="cre-pie">El mes en curso NO cuenta: está a medias y arrastraría la recta hacia abajo cada día 1.
      Y hacen falta al menos tres meses cerrados para hablar de tendencia, porque por dos puntos pasa siempre una recta perfecta.</p>`;
}

// ---------------------------------------------------------------------------
// B) Las palancas
// ---------------------------------------------------------------------------

function tarjetaPalanca(c, p, i) {
  const { f } = c;
  const positivo = num(p.impactoAnual, 0) > 0;
  const negativo = num(p.impactoAnual, 0) < 0;

  const equivale = p.equivaleAVentasAlMes === null || !Number.isFinite(p.equivaleAVentasAlMes)
    ? ''
    : `<p class="cre-palanca-equivale">Es lo mismo que sumar <strong>${esc(ventasAlMes(p.equivaleAVentasAlMes))}</strong> sin tocar nada más.</p>`;

  const avisos = pintarAvisos(p.avisos, `cre-palanca-${esc(p.id)}`);

  return `<article class="cre-palanca ${negativo ? 'cuesta' : ''}">
    <div class="cre-palanca-cab">
      <span class="cre-palanca-n num" aria-hidden="true">${i + 1}</span>
      <div>
        <h3 class="cre-palanca-tit">${esc(p.nombre)}</h3>
        <p class="cre-palanca-cambio">${esc(p.cambio)}</p>
      </div>
    </div>
    <div class="cre-palanca-cifras">
      <div class="cre-palanca-big ${positivo ? 'pos' : ''}${negativo ? ' neg' : ''}">
        <span class="num">${negativo ? '−' : '+'}${esc(euros(f, Math.abs(num(p.impactoAnual, 0))))}</span>
        <small>al año, para ti${negativo ? ' · te CUESTA' : ''}</small>
      </div>
      <div class="cre-palanca-mes">
        <span class="num">${negativo ? '−' : '+'}${esc(euros(f, Math.abs(num(p.impactoMensual, 0))))}</span>
        <small>al mes</small>
      </div>
      <span class="cre-esfuerzo ${esc(p.esfuerzo)}">${esc(ESFUERZO_TEXTO[p.esfuerzo] || p.esfuerzo)}</span>
    </div>
    ${equivale}
    <p class="cre-palanca-l">Por qué</p>
    <p class="cre-txt">${esc(p.porQue)}</p>
    <p class="cre-palanca-l">Cómo se hace</p>
    ${textoConPregunta(p.comoSeHace, `cre-como-${esc(p.id)}`, 'cre-txt fuerte')}
    <p class="cre-palanca-quien">${esc(p.deQuienDepende)}</p>
    ${avisos}
  </article>`;
}

function pintarPalancas(c) {
  const lista = palancasReales(c.ctx);
  if (!lista.length) return '<p class="mc">Todavía no hay palancas que medir.</p>';

  // El orden dentro de cada grupo es el que da crecimiento.js: impacto ENTRE esfuerzo. Lo
  // que cambia aquí es el CORTE, y no es cosmético: una palanca que no puedes activar tú
  // solo no es una tarea, es una conversación, y mezclarlas en una lista hacía leer la más
  // grande de todas como si fuera lo siguiente que hacer esta tarde.
  const mias = lista.filter((p) => p.dependeDeMi);
  const otras = lista.filter((p) => !p.dependeDeMi);

  const grupo = (titulo, sub, items) => items.length
    ? `<p class="cre-grupo">${esc(titulo)}</p>
       <p class="cre-grupo-sub">${esc(sub)}</p>
       <div class="cre-palancas">${items.map((p, i) => tarjetaPalanca(c, p, i)).join('')}</div>`
    : '';

  return grupo('Dependen de ti', 'Las puedes empezar hoy sin pedirle permiso a nadie.', mias)
    + grupo('Dependen de David, o de los dos', 'Se piden y se negocian; no se hacen. Cuenta con este dinero de otra manera.', otras)
    + `<p class="cre-pie">Ordenadas por impacto entre esfuerzo, no por impacto a secas: si no, una palanca enorme
      que exige negociar con tu socio taparía a una mediana que se hace en una tarde. Cada paso es el que podrías
      intentar este mes sin cambiar de negocio, y el impacto está medido en lo que te queda LIMPIO, con el IRPF real
      por tramos, no en facturación.</p>`;
}

// ---------------------------------------------------------------------------
// C) El siguiente objetivo
// ---------------------------------------------------------------------------

// La barra hacia el objetivo. Va de 0 a la meta, con la media de hoy marcada: la pregunta es
// "cuánto me falta", no "cuánto llevo del total de mi vida".
function barraObjetivo(ahora, objetivo) {
  if (!(objetivo > 0)) return '';
  const pct = Math.max(0, Math.min(100, (num(ahora, 0) / objetivo) * 100));
  return `<div class="cre-barra">
    <div class="cre-barra-track"><div class="cre-barra-lleno" style="width:${pct.toFixed(1)}%"></div></div>
    <div class="cre-barra-pies">
      <span>ahora · ${esc(ventasTexto(ahora))} ventas/mes</span>
      <span class="cre-barra-pct num">${pct.toFixed(0)} %</span>
      <span class="der">objetivo · ${esc(ventasTexto(objetivo))} ventas/mes</span>
    </div>
  </div>`;
}

function pintarObjetivo(c) {
  const { f } = c;
  const o = siguienteObjetivoSensato(c.ctx);

  const desbloquea = (o.desbloquea || []).length
    ? `<p class="cre-obj-l">Qué desbloquea llegar ahí</p>
       <ul class="cre-lista">${o.desbloquea.map((d) => `<li>${esc(d.texto)}</li>`).join('')}</ul>`
    : '';

  const mejor = o.mejorMesReal
    ? `<p class="cre-obj-mejor">Tu mejor mes hasta hoy fueron <strong>${o.mejorMesReal.ventas}</strong>
        ${o.mejorMesReal.ventas === 1 ? 'venta' : 'ventas'} (${esc(mesCorto(o.mejorMesReal.mes))}).</p>`
    : '';

  return `<div class="cre-obj">
      <p class="cre-eyebrow">El siguiente escalón${o.mandaElPuntoMuerto ? ' · y este no lo elijo yo' : ''}</p>
      <div class="cre-obj-big">
        <span class="num">${esc(ventasTexto(o.objetivoVentas))}</span>
        <small>${o.objetivoVentas === 1 ? 'venta al mes' : 'ventas al mes'}${o.yaLoHizo ? ' · ya lo has hecho alguna vez' : ''}</small>
      </div>
      <p class="cre-obj-falta">${o.ventasQueFaltan > 0
    ? `Te ${o.ventasQueFaltan <= 1 ? 'falta' : 'faltan'} <strong>${esc(ventasTexto(o.ventasQueFaltan))}</strong> ${o.ventasQueFaltan === 1 ? 'venta' : 'ventas'} al mes. Plazo: ${esc(o.plazo)}.`
    : 'Ya estás ahí. Lo que toca es sostenerlo dos meses seguidos.'}</p>
      ${barraObjetivo(o.ventasAhora, o.objetivoVentas)}
      <div class="cre-obj-cifras">
        <div><span class="cre-dato-v num pos">+${esc(euros(f, o.impactoAnual))}</span><span class="cre-dato-l">al año, si mantienes ese ritmo</span></div>
        <div><span class="cre-dato-v num">+${esc(euros(f, o.impactoMensual))}</span><span class="cre-dato-l">al mes</span></div>
        <div><span class="cre-dato-v num">${esc(euros(f, o.miParteObjetivo))}</span><span class="cre-dato-l">tu parte con ${esc(ventasTexto(o.objetivoVentas))} ${o.objetivoVentas === 1 ? 'venta' : 'ventas'}, antes de impuestos</span></div>
      </div>
    </div>
    <p class="cre-obj-l">Por qué ese número y no otro</p>
    <p class="cre-txt">${esc(o.porque)}</p>
    ${mejor}
    <p class="cre-obj-l">Qué hacer</p>
    <p class="cre-txt fuerte">${esc(o.comoSeHace)}</p>
    ${desbloquea}
    ${pintarAvisos(o.avisos, 'cre-obj-preg')}
    <p class="cre-pie">El objetivo es el escalón, no el sueño. No pongo 10 ni 20 a propósito: un objetivo que no te
      crees no es un objetivo, es una excusa para no empezar. Y si todavía no cubres el punto muerto, el objetivo
      no lo elige la app: es el punto muerto, porque por debajo de ahí cada mes cierra en rojo.</p>`;
}

// ---------------------------------------------------------------------------
// D) Los tres futuros
// ---------------------------------------------------------------------------

function pintarEscenarios(c) {
  const { f } = c;
  // Una llamada por horizonte. Los escenarios son los mismos y en el mismo orden, así que se
  // pueden cruzar por índice sin que nada se descoloque.
  const proyecciones = HORIZONTES.map((m) => ({ meses: m, p: proyeccionRealista(c.ctx, m) }));
  const base = proyecciones[proyecciones.length - 1].p;

  const tarjetas = base.escenarios.map((e, i) => {
    const columnas = proyecciones.map(({ meses, p }) => {
      const x = p.escenarios[i];
      if (!x) return '';
      return `<div class="cre-esc-col">
        <p class="cre-esc-plazo">${meses} meses</p>
        <p class="cre-esc-eur num ${num(x.bolsilloTotal, 0) >= 0 ? '' : 'neg'}">${esc(euros(f, x.bolsilloTotal))}</p>
        <p class="cre-esc-mc">limpio, en total</p>
        <p class="cre-esc-mc">${esc(ventasTexto(x.ventasTotales))} ventas · ${esc(euros(f, x.bolsilloMedioMes))} al mes</p>
      </div>`;
    }).join('');

    const quema = Number.isFinite(e.quemaMensual)
      ? `<p class="cre-esc-quema">Si se para todo, se te van <strong class="num">${esc(euros(f, e.quemaMensual))}</strong> al mes
          entre tu vida y tu parte de los fijos del negocio. Ése es el reloj real que tendrías para reaccionar:
          míralo contra los meses de colchón de "Mi capital".</p>`
      : '';

    return `<article class="cre-esc ${esc(e.id)}">
      <div class="cre-esc-cab">
        <h3 class="cre-esc-tit">${esc(e.nombre)}</h3>
        <span class="fila-tag ${e.medido ? 'meta' : 'ahora'}">${e.medido ? 'MEDIDO' : 'SUPUESTO'}</span>
      </div>
      <div class="cre-esc-cols">${columnas}</div>
      <p class="cre-esc-sup">${esc(e.supuesto)}</p>
      ${quema}
    </article>`;
  }).join('');

  // El aviso de la quema mensual NO se repite abajo: ya está dentro de la tarjeta del
  // escenario al que pertenece, que es donde significa algo. Repetirlo al pie convertía el
  // dato más serio de la pantalla en ruido de letra pequeña, leído dos veces seguidas.
  const avisos = (base.avisos || []).filter((a) => !/se te van .* al mes/.test(String(a ?? '')));

  return `<div class="cre-escenarios">${tarjetas}</div>
    ${pintarAvisos(avisos, 'cre-esc-preg')}
    <p class="cre-pie">Los tres son cuentas, no predicciones, y llevan la etiqueta de si salen de tus datos (MEDIDO)
      o de un supuesto elegido (SUPUESTO). El importe es lo que te queda LIMPIO acumulado en ese plazo, ya con el IRPF
      real por tramos. El tercero es el que ninguna app enseña y el único que hay que poder mirar sin apartar la vista.</p>`;
}

// ---------------------------------------------------------------------------
// Render público
// ---------------------------------------------------------------------------

// ctx = { datos, modelo, hoyISO, ventasMedia, gastosFijos, beneficioAnual, rentaFiscal,
//         residencia, f }
export function renderCrecimiento(ctx) {
  const c = prepararCtx(ctx);

  set('cre-tendencia', pintarTendencia(c));
  set('cre-palancas', pintarPalancas(c));
  set('cre-objetivo', pintarObjetivo(c));
  set('cre-escenarios', pintarEscenarios(c));
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
//
// Mismo patrón que el resto de vistas: delegación desde #v-crecimiento, que no se destruye
// nunca, y una marca en el dataset para no engancharse dos veces. El plegado lo hace
// <details> por su cuenta, con teclado y con lector de pantalla, sin una línea de JavaScript.
//
// handlers = { irA, rerender }
export function bindCrecimiento(handlers) {
  const raiz = document.getElementById('v-crecimiento');
  if (!raiz || raiz.dataset.creBind === '1') return;
  raiz.dataset.creBind = '1';

  const h = handlers || {};

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
    boton.classList.toggle('cre-copiada', ok);
    setTimeout(() => {
      boton.innerHTML = original;
      boton.classList.remove('cre-copiada');
    }, ok ? 1800 : 4000);
  };

  raiz.addEventListener('click', (e) => {
    const btnCopiar = e.target.closest('[data-copiar]');
    if (btnCopiar) {
      const origen = document.getElementById(btnCopiar.dataset.copiar);
      if (origen) copiar(origen.textContent || '', btnCopiar);
      const det = origen && typeof origen.closest === 'function' ? origen.closest('details') : null;
      if (det) det.open = true;
      return;
    }

    const ir = e.target.closest('[data-ir]');
    if (ir && typeof h.irA === 'function') h.irA(ir.dataset.ir);
  });
}
