// Vista "Mi patrimonio": pinta cuentas, reservas/objetivos, totales y avisos.
// Aquí solo hay DOM y strings; toda la aritmética vive en patrimonio.js / calculos.js.
// Modelo SOBRE: los objetivos son etiquetas sobre el dinero de las cuentas, nunca dinero aparte.

import {
  PATRIMONIO_VACIO,
  estadoPatrimonio,
  progresoObjetivo,
  normalizarCuenta,
  normalizarObjetivo,
  sugerenciaImpuestos,
  sugerenciaGastosFijos,
} from './patrimonio.js';
import { formatoEuros, IRPF_DEFAULT, SPLIT } from './calculos.js';

// Nombres exactos de las reservas sugeridas: si existen, el botón desaparece.
const NOMBRE_IMPUESTOS = 'Impuestos IRPF';
const NOMBRE_GASTOS = 'Gastos fijos mes siguiente';

const TIPOS_CUENTA = [['banco', 'Banco'], ['cripto', 'Cripto'], ['efectivo', 'Efectivo']];
const CLASES_OBJETIVO = [['reserva', 'Reserva'], ['objetivo', 'Objetivo']];

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

// Los nombres de cuentas y objetivos los escribe el usuario: sin escapar, un nombre
// con < o " rompe el render (o inyecta HTML). Todo texto de usuario pasa por aquí.
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Último ctx recibido. Lo guardamos para poder refrescar solo los totales mientras
// el usuario escribe (ver bindPatrimonio), sin exigirle ctx a los handlers.
let ctxUltimo = null;

const cardPorDefecto = (l, v, mc = '') =>
  `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

function fmtDe(ctx) { return typeof ctx.f === 'function' ? ctx.f : formatoEuros; }
function cardDe(ctx) { return typeof ctx.card === 'function' ? ctx.card : cardPorDefecto; }
function splitDe(ctx) { return typeof ctx.split === 'function' ? ctx.split() : (ctx.split || SPLIT); }

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function opciones(pares, valor) {
  return pares.map(([v, txt]) => `<option value="${v}"${v === valor ? ' selected' : ''}>${txt}</option>`).join('');
}

function botonBorrar(tipo, i, etiqueta) {
  return `<button type="button" class="pat-del" data-tipo="${tipo}" data-i="${i}" title="${etiqueta}" aria-label="${etiqueta}">×</button>`;
}

// ---------- Cuentas ----------
function pintarCuentas(cuentas, total, f) {
  const filas = cuentas.map((c, i) => `<div class="pat-fila" data-tipo="cuenta">
    <input class="pat-nombre" type="text" data-tipo="cuenta" data-i="${i}" data-k="nombre" value="${esc(c.nombre)}" placeholder="Nombre de la cuenta"/>
    <input class="pat-imp" type="number" step="0.01" data-tipo="cuenta" data-i="${i}" data-k="importe" value="${esc(c.importe)}" placeholder="0,00"/>
    <select class="pat-tipo" data-tipo="cuenta" data-i="${i}" data-k="tipo">${opciones(TIPOS_CUENTA, c.tipo)}</select>
    ${botonBorrar('cuenta', i, 'Borrar cuenta')}
  </div>`).join('');
  const vacio = cuentas.length ? '' : '<p class="mc">Todavía no has añadido ninguna cuenta.</p>';
  const resumen = `<div class="pat-fila pat-total"><span class="pat-etq">TENGO</span><span class="pat-imp num">${f(total)}</span></div>`;
  return vacio + filas + resumen;
}

// ---------- Objetivos ----------
// Sin meta (0) no se pinta barra: solo el importe asignado, que es lo típico de una reserva.
function pintarBarra(o, f) {
  const p = progresoObjetivo(o);
  if (p.pct === null) {
    return `<div class="pat-sinmeta mc">${f(o.asignado)} asignado · sin meta</div>`;
  }
  const ancho = Math.max(0, Math.min(100, p.pct));
  const cola = p.completo ? 'LISTO' : `faltan ${f(p.falta)}`;
  const txt = `${f(o.asignado)} de ${f(o.meta)} · ${p.pct.toFixed(0)}% · ${cola}`;
  return `<div class="pat-barra">
    <div class="progreso-bar"><div class="progreso-fill${p.completo ? ' completo' : ''}" style="width:${ancho.toFixed(1)}%"></div></div>
    <div class="progreso-pct">${txt}</div>
  </div>`;
}

function filaObjetivo(o, i, f) {
  return `<div class="pat-item ${o.clase}">
    <div class="pat-fila" data-tipo="objetivo">
      <input class="pat-nombre" type="text" data-tipo="objetivo" data-i="${i}" data-k="nombre" value="${esc(o.nombre)}" placeholder="¿Para qué es?"/>
      <input class="pat-imp" type="number" step="0.01" data-tipo="objetivo" data-i="${i}" data-k="asignado" value="${esc(o.asignado)}" placeholder="0,00" title="Asignado"/>
      <input class="pat-imp" type="number" step="0.01" data-tipo="objetivo" data-i="${i}" data-k="meta" value="${esc(o.meta)}" placeholder="0,00" title="Meta (0 = sin meta)"/>
      <select class="pat-clase" data-tipo="objetivo" data-i="${i}" data-k="clase">${opciones(CLASES_OBJETIVO, o.clase)}</select>
      ${botonBorrar('objetivo', i, 'Borrar objetivo')}
    </div>
    ${pintarBarra(o, f)}
  </div>`;
}

// Dos grupos con cabecera. El data-i es el índice REAL en la lista completa,
// no el del grupo: los handlers escriben sobre patrimonio.objetivos[i].
function pintarObjetivos(objetivos, f) {
  const grupo = (clase, titulo) => {
    const items = objetivos.map((o, i) => ({ o, i })).filter((x) => x.o.clase === clase);
    const cuerpo = items.length
      ? items.map(({ o, i }) => filaObjetivo(o, i, f)).join('')
      : '<p class="mc">Nada aquí todavía.</p>';
    return `<div class="pat-grupo ${clase}">${titulo}</div>${cuerpo}`;
  };
  return grupo('reserva', 'RESERVAS — no es tuyo, ya está gastado')
    + grupo('objetivo', 'OBJETIVOS — esto sí es tuyo');
}

// ---------- Totales ----------
function pintarTotales(e, f, card) {
  return [
    card('Tengo', `<span class="num">${f(e.total)}</span>`, 'suma de todas mis cuentas'),
    card('Reservas', `<span class="num">${f(e.reservas)}</span>`, 'comprometido: ya no es mío'),
    card('Objetivos', `<span class="num">${f(e.objetivos)}</span>`, 'a lo que aspiro'),
    card('Libre de verdad', `<span class="num ${e.libre >= 0 ? 'pos' : 'neg'}">${f(e.libre)}</span>`, 'lo que puedo gastar sin tocar nada'),
  ].join('');
}

// ---------- Avisos y sugerencias ----------
function tieneObjetivo(objetivos, nombre) {
  const buscado = nombre.toLowerCase();
  return objetivos.some((o) => String(o.nombre || '').trim().toLowerCase() === buscado);
}

function pintarAvisos(e, objetivos, ctx, f) {
  let html = '';
  // Sobreasignado: rojo y con el exceso exacto. estadoPatrimonio lo mete como primer
  // aviso, así que el resto se pinta aparte para no repetir el mismo texto.
  if (e.sobreasignado) {
    html += `<div class="alerta">${ICON_WARN}<span>Has asignado <strong>${f(e.exceso)}</strong> más de lo que tienes: ${f(e.asignado)} repartidos sobre ${f(e.total)}.</span></div>`;
  }
  const resto = e.sobreasignado ? e.avisos.slice(1) : e.avisos;
  html += resto.map((a) => `<div class="aviso-ambar">${ICON_WARN}<span>${esc(a)}</span></div>`).join('');

  // Sugerencias: el sistema propone importes, el usuario decide. Son botones, nunca
  // se aplican solos. El importe viaja en data-importe porque bindPatrimonio no ve el ctx.
  const botones = [];
  if (!tieneObjetivo(objetivos, NOMBRE_IMPUESTOS)) {
    const imp = sugerenciaImpuestos(ctx.retiros || [], ctx.irpfCfg || IRPF_DEFAULT, splitDe(ctx));
    botones.push(`<button type="button" class="btn btn-ghost" id="pat-sug-impuestos" data-importe="${imp}">Reservar ${f(imp)} para impuestos</button>`);
  }
  if (!tieneObjetivo(objetivos, NOMBRE_GASTOS)) {
    const imp = sugerenciaGastosFijos(ctx.gastosFijosTotal);
    botones.push(`<button type="button" class="btn btn-ghost" id="pat-sug-gastos" data-importe="${imp}">Reservar ${f(imp)} para los gastos fijos del mes que viene</button>`);
  }
  if (botones.length) html += `<div class="pat-sugerencias">${botones.join('')}</div>`;

  return html;
}

// ---------- Render público ----------
// ctx = { patrimonio, retiros, gastosFijosTotal, irpfCfg, split, f, card }
export function renderPatrimonio(ctx) {
  ctxUltimo = ctx || {};
  const patr = ctxUltimo.patrimonio || PATRIMONIO_VACIO;
  const cuentas = (patr.cuentas || []).map(normalizarCuenta);
  const objetivos = (patr.objetivos || []).map(normalizarObjetivo);
  const f = fmtDe(ctxUltimo);
  const card = cardDe(ctxUltimo);
  const e = estadoPatrimonio(cuentas, objetivos);

  set('pat-cuentas', pintarCuentas(cuentas, e.total, f));
  set('pat-objetivos', pintarObjetivos(objetivos, f));
  set('pat-totales', pintarTotales(e, f, card));
  set('pat-avisos', pintarAvisos(e, objetivos, ctxUltimo, f));
}

// Repinta SOLO el resumen (totales + avisos), sin tocar las filas de inputs.
// Es lo que se usa mientras el usuario teclea: reescribir las filas mataría el foco.
function refrescarResumen(patr) {
  if (!ctxUltimo) return;
  const cuentas = (patr.cuentas || []).map(normalizarCuenta);
  const objetivos = (patr.objetivos || []).map(normalizarObjetivo);
  const f = fmtDe(ctxUltimo);
  const e = estadoPatrimonio(cuentas, objetivos);
  set('pat-totales', pintarTotales(e, f, cardDe(ctxUltimo)));
  set('pat-avisos', pintarAvisos(e, objetivos, ctxUltimo, f));
}

// ---------- Eventos ----------
// Todo por delegación en #v-patrimonio: las filas se reescriben enteras en cada
// repintado, así que un listener directo sobre un input moriría con él.
// handlers = { getPatrimonio, setPatrimonio, rerender }
export function bindPatrimonio(handlers) {
  const raiz = document.getElementById('v-patrimonio');
  if (!raiz || raiz.dataset.patBind === '1') return;
  raiz.dataset.patBind = '1';

  const copia = () => {
    const p = handlers.getPatrimonio() || PATRIMONIO_VACIO;
    return { cuentas: [...(p.cuentas || [])], objetivos: [...(p.objetivos || [])] };
  };

  const listaDe = (el) => {
    const tipo = el.dataset.tipo || (el.closest('#pat-cuentas') ? 'cuenta' : 'objetivo');
    return tipo === 'cuenta' ? 'cuentas' : 'objetivos';
  };

  // Escribe el valor del input en el estado y lo guarda. Devuelve el patrimonio nuevo.
  function aplicarEdicion(el) {
    const clave = listaDe(el);
    const i = Number(el.dataset.i);
    const k = el.dataset.k;
    const p = copia();
    if (!p[clave][i]) return null;
    const item = { ...p[clave][i] };
    if (k === 'nombre' || k === 'tipo' || k === 'clase') item[k] = el.value;
    else item[k] = parseFloat(el.value) || 0; // vacío o basura -> 0, nunca NaN
    p[clave][i] = clave === 'cuentas' ? normalizarCuenta(item) : normalizarObjetivo(item);
    handlers.setPatrimonio(p);
    return p;
  }

  // 'input' (cada tecla): guarda y refresca SOLO los totales. Si repintáramos las filas
  // el input se destruiría a mitad de palabra y el usuario perdería el foco tras cada letra.
  raiz.addEventListener('input', (e) => {
    const el = e.target.closest('[data-i][data-k]');
    if (!el) return;
    const p = aplicarEdicion(el);
    if (p) refrescarResumen(p);
  });

  // 'change' (blur del input, o selección en un select): ahí sí, repintado completo.
  // Ya no hay nadie escribiendo, así que perder el foco no molesta.
  raiz.addEventListener('change', (e) => {
    const el = e.target.closest('[data-i][data-k]');
    if (!el) return;
    const p = aplicarEdicion(el);
    if (p) handlers.rerender();
  });

  function anadirReserva(nombre, importe) {
    const p = copia();
    p.objetivos.push({ nombre, asignado: importe, meta: 0, clase: 'reserva' });
    handlers.setPatrimonio(p);
    handlers.rerender();
  }

  raiz.addEventListener('click', (e) => {
    const del = e.target.closest('.pat-del');
    if (del) {
      const clave = del.dataset.tipo === 'cuenta' ? 'cuentas' : 'objetivos';
      const i = Number(del.dataset.i);
      const p = copia();
      if (!p[clave][i]) return;
      p[clave].splice(i, 1);
      handlers.setPatrimonio(p);
      handlers.rerender();
      return;
    }
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'pat-add-cuenta') {
      const p = copia();
      p.cuentas.push({ nombre: '', importe: 0, tipo: 'banco' });
      handlers.setPatrimonio(p);
      handlers.rerender();
    } else if (btn.id === 'pat-add-objetivo') {
      const p = copia();
      p.objetivos.push({ nombre: '', asignado: 0, meta: 0, clase: 'objetivo' });
      handlers.setPatrimonio(p);
      handlers.rerender();
    } else if (btn.id === 'pat-sug-impuestos') {
      anadirReserva(NOMBRE_IMPUESTOS, parseFloat(btn.dataset.importe) || 0);
    } else if (btn.id === 'pat-sug-gastos') {
      anadirReserva(NOMBRE_GASTOS, parseFloat(btn.dataset.importe) || 0);
    }
  });
}
