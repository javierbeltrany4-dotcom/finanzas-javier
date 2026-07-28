import * as C from './calculos.js';
import * as P from './patrimonio.js';
import { renderPatrimonio, bindPatrimonio } from './vista-patrimonio.js';
import { parseTradinverso, cargarTradinverso } from './tradinverso.js';
import * as O from './objetivo.js';
// Ojo con el alias: aquí abajo ya existe una función `renderObjetivo` (el objetivo de
// beneficio del mes, en el Resumen). Dos declaraciones con el mismo nombre romperían
// el módulo entero, así que la vista de "Cuánto facturar" entra con otro nombre.
import { renderObjetivo as renderVistaObjetivo, bindObjetivo } from './vista-objetivo.js';

const CACHE_KEY = 'tv-cache-v2';
const SALDO_KEY = 'saldo-banco-v2';
const GASTOS_KEY = 'gastos-fijos-v2';
const META_KEY = 'meta-mensual-v1';
const PATRIMONIO_KEY = 'patrimonio-v1';
const IRPF_KEY = 'irpf-v1';
const MODELO_KEY = 'modelo-objetivo-v1';
const DUBAI_KEY = 'dubai-v1';
const OBJETIVO_KEY = 'objetivo-limpio-v1';

let config = null;
let datos = { ingresos: [], retiros: [], ventas: [], gastosNegocio: [], caja: {} };
let vistaActiva = 'resumen';
let calModo = 'mes';
let chartIngresos = null;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const f = (n) => C.formatoEuros(n);
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const nombreMes = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]} ${a.slice(2)}`; };
const nombreMesLargo = (ym) => { const [a, m] = ym.split('-'); return `${MESES_LARGO[Number(m) - 1]} ${a}`; };
const hoyISO = () => new Date().toISOString().slice(0, 10);

const ARR_UP = '<svg viewBox="0 0 10 10"><path d="M5 1 L9 8 L1 8 Z" fill="currentColor"/></svg>';
const ARR_DN = '<svg viewBox="0 0 10 10"><path d="M5 9 L1 2 L9 2 Z" fill="currentColor"/></svg>';
const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

function deltaHtml(v) {
  if (v === null) return '<span style="color:var(--muted)">—</span>';
  const up = v >= 0;
  return `<span class="delta ${up ? 'pos' : 'neg'}">${up ? ARR_UP : ARR_DN}${Math.abs(v).toFixed(1)}%</span>`;
}
const card = (l, v, mc = '') => `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;
// Número con count-up (animado por animarCountUps)
const nc = (n, cls = '') => `<span class="num ${cls}" data-count="${n}">${f(0)}</span>`;

const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Texto que no controlamos (conceptos de Tradingverso, nombres del usuario) antes de meterlo en innerHTML.
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function animarCountUps(scope) {
  scope.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    if (Number.isNaN(target)) return;
    if (reduceMotion()) { el.textContent = f(target); return; }
    const dur = 600, t0 = performance.now();
    (function frame(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = f(target * e);
      if (p < 1) requestAnimationFrame(frame); else el.textContent = f(target);
    })(performance.now());
  });
}

function postRender(v) {
  const scope = document.getElementById(`v-${v}`);
  if (!scope) return;
  scope.querySelectorAll('.grid').forEach((g) => [...g.children].forEach((el, i) => el.style.setProperty('--i', i)));
  animarCountUps(scope);
}

// Mini-gráfico SVG (sparkline) a partir de una serie de valores.
function sparkline(values, color = '#00c896') {
  const vals = (values || []).filter((x) => typeof x === 'number');
  if (vals.length < 2) return '';
  const w = 220, h = 40, pad = 3;
  const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
  const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (w - 2 * pad), h - pad - ((v - min) / range) * (h - 2 * pad)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="${area}" fill="${color}" opacity="0.12"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ---------- datos personales ----------
function getGastos() { const o = localStorage.getItem(GASTOS_KEY); return o ? JSON.parse(o) : config.config.gastosFijos; }
function getSaldo() { const o = localStorage.getItem(SALDO_KEY); return o ? JSON.parse(o) : config.saldoBanco; }
function getMeta() { const o = localStorage.getItem(META_KEY); return o !== null ? parseFloat(o) : (config.config.metaMensual || 0); }
// Patrimonio: lo escribe el usuario, vive en localStorage. datos.json es solo la semilla.
function getPatrimonio() { const o = localStorage.getItem(PATRIMONIO_KEY); return o ? JSON.parse(o) : (config.patrimonio || P.PATRIMONIO_VACIO); }
function setPatrimonio(p) { localStorage.setItem(PATRIMONIO_KEY, JSON.stringify(p)); }
// Config de IRPF: porcentaje y listas de conceptos. Editable desde el modal.
function getIrpf() { const o = localStorage.getItem(IRPF_KEY); return o ? JSON.parse(o) : (config.config.irpf || C.IRPF_DEFAULT); }
const split = () => config.config.split;

// ---------- Cuánto facturar: modelo del negocio, Dubái y objetivo limpio ----------
// Tres cosas que el usuario edita y que viven en SU navegador. datos.json es solo la
// semilla: en cuanto toca algo, manda lo suyo.

// Cuánto quiere quedarse limpio al mes si todavía no lo ha dicho nunca.
const OBJETIVO_LIMPIO_DEFAULT = 3000;
const CLAVES_MODELO = Object.keys(O.MODELO_DEFAULT);

// JSON de localStorage sin reventar si dentro hay basura (una versión vieja, un guardado
// a medias). Ante la duda, null: los getters de abajo caen a datos.json y siguen.
function leerJSON(clave) {
  const o = localStorage.getItem(clave);
  if (!o) return null;
  try { return JSON.parse(o); } catch (e) { return null; }
}

// Lo guardado tal cual: localStorage > datos.json > el modelo de fábrica.
function modeloGuardado() {
  return leerJSON(MODELO_KEY) || (config && config.config && config.config.modelo) || O.MODELO_DEFAULT;
}

// ¿Es el modelo de fábrica entero? Es exactamente lo que manda el botón "Volver a los
// valores por defecto", y por eso es también lo que apaga la bandera de fijos a mano.
function esModeloPorDefecto(m) {
  return CLAVES_MODELO.every((k) => Math.abs(m[k] - O.MODELO_DEFAULT[k]) < 0.0001);
}

// El modelo que ve la pantalla. Los gastos fijos NO son los de fábrica: son la media
// REAL de los últimos meses de gastos del negocio… salvo que el usuario los haya
// tecleado a mano. En cuanto toca ese campo se marca `fijosManual` y manda lo suyo.
function getModelo() {
  const guardado = modeloGuardado();
  const m = O.normalizarModelo(guardado);
  if (guardado && guardado.fijosManual === true) { m.fijosManual = true; return m; }
  m.fijosNegocio = O.modeloDesdeDatos(datos, m).modelo.fijosNegocio;
  return m;
}

function setModelo(m) {
  const x = O.normalizarModelo(m);
  const previo = getModelo();
  // El único campo que enciende la bandera es el de los fijos: si el número que llega no
  // es el que había en pantalla, lo ha escrito él. Y como getModelo() ya devuelve los
  // fijos efectivos, editar cualquier otro campo llega aquí con el mismo valor y no la
  // enciende por error. El modelo de fábrica entero (el reset) la apaga.
  const manual = !esModeloPorDefecto(x)
    && (previo.fijosManual === true || Math.abs(x.fijosNegocio - previo.fijosNegocio) > 0.005);
  if (manual) x.fijosManual = true;
  localStorage.setItem(MODELO_KEY, JSON.stringify(x));
}

function getDubai() {
  return O.normalizarDubai(leerJSON(DUBAI_KEY) || (config && config.config && config.config.dubai) || O.DUBAI_DEFAULT);
}
function setDubai(d) { localStorage.setItem(DUBAI_KEY, JSON.stringify(O.normalizarDubai(d))); }

function getObjetivo() {
  const o = localStorage.getItem(OBJETIVO_KEY);
  const n = parseFloat(o !== null ? o : (config && config.objetivoLimpio));
  return Number.isFinite(n) && n >= 0 ? n : OBJETIVO_LIMPIO_DEFAULT;
}
function setObjetivo(v) {
  const n = parseFloat(v);
  localStorage.setItem(OBJETIVO_KEY, String(Number.isFinite(n) && n > 0 ? n : 0));
}

// Modelo + ventas medias ya resueltos contra los datos reales de Tradingverso. Lo usan
// la pestaña "Cuánto facturar" y la reserva de IRPF real de "Mi patrimonio", para que
// las dos hablen exactamente del mismo negocio.
function modeloVivo() {
  const base = getModelo();
  const d = O.modeloDesdeDatos(datos, base);
  if (!base.fijosManual) return { modelo: d.modelo, ventasMedia: d.ventasMedia, fuente: d.fuente };
  // Con los fijos puestos a mano hay que decirlo en la línea de "de dónde salen los
  // números": se cambia solo la mitad de los fijos y se conserva la de las ventas.
  const partes = String((d.fuente && d.fuente.texto) || '').split(' · ');
  const ventas = partes[partes.length - 1] || '';
  return {
    modelo: base,
    ventasMedia: d.ventasMedia,
    fuente: {
      ...d.fuente,
      fijosNegocio: 'manual',
      texto: `Fijos: los ${f(base.fijosNegocio)} que has puesto tú${ventas ? ` · ${ventas}` : ''}`,
    },
  };
}
const finDeMes = (ym) => `${ym}-${String(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate()).padStart(2, '0')}`;

// ---------- Carga ----------
async function cargarConfig() { config = await (await fetch('datos.json')).json(); }
function horaAhora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}
let ultimaActualizacion = null;
let desdeCache = false;

function haceCuanto(iso) {
  if (!iso) return 'desconocido';
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d > 1 ? 's' : ''}`;
}
function fechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function cargarNegocio() {
  const est = document.getElementById('estado');
  est.textContent = 'Conectando… (puede tardar unos segundos)'; est.className = 'estado';
  // Intenta en vivo y reintenta 1 vez: el 1er intento "calienta" el Apps Script (frío = lento).
  let raw = null;
  for (let intento = 1; intento <= 2; intento++) {
    try { raw = await cargarTradinverso(config.apiUrl); break; }
    catch (e) { if (intento === 1) { est.textContent = 'Reintentando…'; } }
  }
  if (raw) {
    datos = parseTradinverso(raw, config.anioBase);
    ultimaActualizacion = new Date().toISOString();
    desdeCache = false;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: ultimaActualizacion, datos }));
    est.textContent = `En vivo · ${horaAhora()}`; est.className = 'estado online';
  } else {
    const cache = localStorage.getItem(CACHE_KEY);
    if (cache) {
      const c = JSON.parse(cache);
      datos = c.datos || c;
      ultimaActualizacion = c.ts || null;
      desdeCache = true;
      est.textContent = 'Desde caché'; est.className = 'estado cache';
    } else {
      datos = { ingresos: [], retiros: [], ventas: [], gastosNegocio: [], caja: {} };
      ultimaActualizacion = null; desdeCache = true;
      est.textContent = 'Sin conexión'; est.className = 'estado error';
    }
  }
}

// ---------- RESUMEN ----------
function setNum(id, val) { const el = document.getElementById(id); if (el) { el.dataset.count = val; el.textContent = f(0); } }

const CK = '<svg class="vic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CX = '<svg class="vic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function renderVerificacion() {
  const cont = document.getElementById('verificacion');
  if (!cont) return;
  const r = C.verificarDatos(datos, split());
  let stale = '';
  if (desdeCache) {
    stale = `<div class="alerta">${ICON_WARN}<span><strong>Sin conexión con Tradingverso.</strong> Mostrando datos guardados (${fechaCorta(ultimaActualizacion)}); pueden no estar al día. Pulsa <strong>Actualizar</strong>.</span></div>`;
  }
  const badge = r.ok
    ? `<div class="trust ok">${ICON_OK}<div><strong>Datos verificados</strong><span>Las cifras cuadran con Tradingverso · ${desdeCache ? 'guardado ' + fechaCorta(ultimaActualizacion) : 'en vivo, ' + haceCuanto(ultimaActualizacion)}</span></div></div>`
    : `<div class="trust bad">${ICON_WARN}<div><strong>Cuidado: hay datos que no cuadran</strong><span>No te fíes hasta revisarlo (detalle abajo).</span></div></div>`;
  const checks = r.checks.map((c) =>
    `<div class="vcheck ${c.ok ? 'ok' : 'bad'}">${c.ok ? CK : CX}<span>${c.nombre}${c.detalle ? ` — <em>${c.detalle}</em>` : ''}</span></div>`
  ).join('');
  // Conceptos de retiro que no encajan en ninguna lista: no se adivina si tributan,
  // cuentan 0 € de IRPF y se avisa para que el usuario los clasifique a mano.
  const desconocidos = C.conceptosDesconocidos(datos.retiros || [], getIrpf());
  let ambar = '';
  if (desconocidos.length) {
    const plural = desconocidos.length > 1;
    ambar = `<div class="aviso-ambar">${ICON_WARN}<span><strong>${desconocidos.length} concepto${plural ? 's' : ''} de retiro sin clasificar:</strong> ${desconocidos.map(esc).join(', ')}.
      No sé si tributan, así que cuenta${plural ? 'n' : ''} <strong>0 €</strong> de IRPF y el neto real puede estar inflado.
      <span class="mc">Clasifícalo${plural ? 's' : ''} en <strong>Editar datos</strong>: conceptos que tributan (banco) o que no tributan (cripto).</span></span></div>`;
  }
  cont.innerHTML = stale + badge + ambar + `<div class="vchecks">${checks}</div>`;
}

// Línea bajo el hero: qué se llevaría de verdad si sacara ese dinero por transferencia.
// Solo tributa la vía bancaria, así que con el IRPF al 0% no hay nada que contar y no se pinta.
function pintarLineaIrpf(disponible) {
  const hero = document.querySelector('#v-resumen .hero');
  if (!hero) return;
  let linea = document.getElementById('hero-irpf');
  const pct = Number(getIrpf().porcentaje) || 0;
  if (pct <= 0) { if (linea) linea.remove(); return; }
  if (!linea) {
    linea = document.createElement('div');
    linea.id = 'hero-irpf';
    linea.className = 'irpf-linea';
    hero.appendChild(linea);
  }
  const impuesto = disponible * (pct / 100);
  linea.innerHTML = `Si lo sacas por transferencia bancaria, IRPF <strong>−${f(impuesto)}</strong> (${pct}%): te quedarían <span class="neto">${f(disponible - impuesto)}</span>. Por cripto no tributa aquí.`;
}

function renderResumen() {
  renderVerificacion();
  const { ingresos, retiros, caja } = datos;
  const sp = split();
  setNum('hero-disponible', C.disponibleRealParaMi(caja, sp));
  document.getElementById('hero-help').textContent =
    `Es tu 40% del cash que de verdad hay en caja (${f(caja.disponible || 0)}). No incluye el pendiente de cobro porque aún no es dinero seguro.`;
  setNum('hero-contable', C.disponibleParaMi(ingresos, retiros, sp));
  setNum('hero-cash', caja.disponible || 0);
  setNum('hero-cobro', caja.pendienteCobro || 0);
  setNum('hero-david', C.disponibleParaDavid(ingresos, retiros, sp));
  document.getElementById('hero-spark').innerHTML = sparkline(ingresos.map((i) => C.miParteMes(i.beneficio, sp)));
  pintarLineaIrpf(C.disponibleRealParaMi(caja, sp));

  const ym = mesActual();
  const idx = ingresos.findIndex((i) => i.mes === ym);
  const benef = idx >= 0 ? ingresos[idx].beneficio : 0;
  const prev = idx > 0 ? ingresos[idx - 1].beneficio : undefined;
  const miParte = C.miParteMes(benef, sp);
  const miRetiro = C.miRetiroDelMes(retiros, ym, sp);
  document.getElementById('mes-actual').innerHTML = [
    card('Beneficio del negocio', nc(benef), 'lo que generó el negocio este mes'),
    card('Mi parte (40%)', nc(miParte, 'pos'), 'lo que me corresponde a mí'),
    card('vs mes anterior', deltaHtml(C.variacionPorcentual(benef, prev)), 'beneficio vs el mes pasado'),
    card('Retirado por mí', nc(miRetiro), miRetiro > 0 ? 'me lo llevé este mes' : 'este mes no retiré nada'),
  ].join('');

  const total = (caja.disponible || 0) + (caja.pendienteCobro || 0);
  document.getElementById('negocio-resumen').innerHTML = [
    card('En el negocio ahora', nc(total), 'cash + pendiente de cobro'),
    card('Cash disponible', nc(caja.disponible || 0, 'pos'), 'dinero seguro en caja'),
    card('Pendiente de cobro', nc(caja.pendienteCobro || 0), 'aún sin cobrar'),
  ].join('');

  renderObjetivo();
  renderInsights();
}

function renderObjetivo() {
  const sp = split();
  const meta = getMeta();
  const wrap = document.getElementById('objetivo-wrap');
  if (!meta || meta <= 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  const ym = mesActual();
  const dias = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const acum = C.miBeneficioEntre(datos.ventas, datos.gastosNegocio, `${ym}-01`, finDeMes(ym), sp);
  const pct = C.progresoMeta(acum, meta) || 0;
  const pctClamp = Math.max(0, Math.min(100, pct));
  const proy = C.proyeccionLineal(acum, new Date().getDate(), dias);
  document.getElementById('objetivo-resumen').innerHTML = `<div class="progreso">
    <div class="progreso-top"><span class="v">${f(acum)}</span><span class="meta">objetivo ${f(meta)}</span></div>
    <div class="progreso-bar"><div class="progreso-fill" style="width:${pctClamp}%"></div></div>
    <div class="progreso-pct">${pct.toFixed(0)}% del objetivo · ${pct >= 100 ? '¡conseguido!' : 'a este ritmo cerrarás en ~' + f(proy)}</div>
  </div>`;
}

function renderInsights() {
  const { ingresos, ventas, gastosNegocio } = datos;
  const sp = split();
  const ym = mesActual();
  const idx = ingresos.findIndex((i) => i.mes === ym);
  const out = [];
  if (idx > 0) {
    const v = C.variacionPorcentual(ingresos[idx].beneficio, ingresos[idx - 1].beneficio);
    if (v !== null) out.push({ warn: v < 0, txt: `Vas un <strong>${Math.abs(v).toFixed(1)}%</strong> ${v >= 0 ? 'mejor' : 'peor'} que ${nombreMes(ingresos[idx - 1].mes)} en beneficio.` });
  }
  const { mejor } = C.mejorPeorMes(ingresos);
  if (mejor) out.push({ warn: false, txt: `Tu mejor mes fue <strong>${nombreMes(mejor.mes)}</strong> con ${f(C.miParteMes(mejor.beneficio, sp))} (tu parte).` });
  const racha = C.diasDesdeUltimaVenta(ventas, hoyISO());
  if (racha !== null && racha > 0) out.push({ warn: racha >= 7, txt: `Llevas <strong>${racha} día${racha > 1 ? 's' : ''}</strong> sin ventas nuevas.` });
  const md = C.mejorDiaVentas(ventas, `${ym}-01`, finDeMes(ym), sp);
  if (md && md.importe > 0) out.push({ warn: false, txt: `Tu mejor día de ${nombreMes(ym)} fue el <strong>${Number(md.fecha.slice(8, 10))}</strong> con ${f(md.importe)}.` });
  const meta = getMeta();
  if (meta > 0) {
    const acum = C.miBeneficioEntre(ventas, gastosNegocio, `${ym}-01`, finDeMes(ym), sp);
    out.push({ warn: acum < meta, txt: acum >= meta ? `Has superado tu objetivo del mes (${f(meta)}).` : `Vas ${f(acum)} de tu objetivo de ${f(meta)}.` });
  }
  const ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  document.getElementById('insights-resumen').innerHTML = out.slice(0, 4)
    .map((i) => `<div class="insight ${i.warn ? 'warn' : ''}">${ICON}<span>${i.txt}</span></div>`).join('')
    || '<p class="mc">Sin insights todavía.</p>';
}

// ---------- HISTÓRICO ----------
function renderHistorico() {
  const { ingresos, retiros } = datos;
  const sp = split();
  const { mejor, peor } = C.mejorPeorMes(ingresos);
  let filas = '';
  ingresos.forEach((i, idx) => {
    const v = C.variacionPorcentual(i.beneficio, idx > 0 ? ingresos[idx - 1].beneficio : undefined);
    let tag = '', cls = '';
    if (i === mejor) { tag = '<span class="tag tag-mejor">MEJOR</span>'; cls = 'mejor'; }
    else if (i === peor) { tag = '<span class="tag tag-peor">PEOR</span>'; cls = 'peor'; }
    const miRet = C.miRetiroDelMes(retiros, i.mes, sp);
    filas += `<tr class="${cls}"><td>${nombreMes(i.mes)}${tag}</td><td class="num ${i.beneficio < 0 ? 'neg' : ''}">${f(i.beneficio)}</td><td class="num pos">${f(C.miParteMes(i.beneficio, sp))}</td><td class="num">${miRet > 0 ? f(miRet) : '<span style="color:var(--dim)">—</span>'}</td><td class="num">${deltaHtml(v)}</td></tr>`;
  });
  if (!filas) filas = '<tr><td colspan="5" class="vacio">Sin datos todavía.</td></tr>';
  document.getElementById('tabla-historico').innerHTML =
    `<table><thead><tr><th>Mes</th><th class="num">Beneficio negocio</th><th class="num">Mi parte (40%)</th><th class="num">Mi retiro</th><th class="num">vs anterior</th></tr></thead><tbody>${filas}</tbody></table>`;

  if (chartIngresos) chartIngresos.destroy();
  chartIngresos = new Chart(document.getElementById('chart-ingresos'), {
    type: 'bar',
    data: { labels: ingresos.map((i) => nombreMes(i.mes)), datasets: [{ data: ingresos.map((i) => i.beneficio), backgroundColor: ingresos.map((i) => (i.beneficio >= 0 ? '#00c896' : '#ff5c5c')), borderRadius: 6 }] },
    options: chartOpts(),
  });
}
function chartOpts() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => f(c.parsed.y) }, backgroundColor: '#1c1c22', borderColor: 'rgba(255,255,255,0.13)', borderWidth: 1, titleColor: '#f0f0f0', bodyColor: '#f0f0f0', padding: 10 } },
    scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#777', callback: (v) => f(v) } }, x: { grid: { display: false }, ticks: { color: '#777' } } },
  };
}

// ---------- RETIROS ----------
// Rellena un <select> de filtro conservando lo elegido si sigue existiendo.
// Devuelve el valor efectivo ('' = Todos) para no leerlo dos veces.
function rellenarFiltro(id, valores, texto = (v) => v) {
  const el = document.getElementById(id);
  if (!el) return '';
  const previo = el.value;
  el.innerHTML = '<option value="">Todos</option>'
    + valores.map((v) => `<option value="${v}">${texto(v)}</option>`).join('');
  el.value = valores.includes(previo) ? previo : '';
  return el.value;
}

function renderRetiros() {
  const { ingresos, retiros, caja } = datos;
  const sp = split();
  const total = (caja.disponible || 0) + (caja.pendienteCobro || 0);

  document.getElementById('mio-retirar').innerHTML = [
    card('Puedo retirar ahora (seguro)', `<span class="num pos">${f(C.disponibleRealParaMi(caja, sp))}</span>`, 'mi 40% del cash real en caja'),
    card('Mi total incl. pendiente', `<span class="num">${f(C.disponibleParaMi(ingresos, retiros, sp))}</span>`, 'sumando lo que queda por cobrar'),
    card('Le queda a David', `<span class="num">${f(C.disponibleParaDavid(ingresos, retiros, sp))}</span>`, 'su 60% del pendiente'),
  ].join('');

  document.getElementById('caja-ahora').innerHTML = [
    card('Total en el negocio', `<span class="num">${f(total)}</span>`, 'cash + pendiente de cobro'),
    card('Cash disponible', `<span class="num pos">${f(caja.disponible || 0)}</span>`, 'dinero seguro ya en caja'),
    card('Pendiente de cobro', `<span class="num">${f(caja.pendienteCobro || 0)}</span>`, 'cobros aún no asegurados'),
  ].join('');
  document.getElementById('caja-historico').innerHTML = [
    card('Beneficio histórico total', `<span class="num">${f(C.beneficioAcumulado(ingresos))}</span>`, 'todo lo generado desde el inicio'),
    card('Total retirado', `<span class="num">${f(C.totalRetirado(retiros))}</span>`, `yo ${f(C.retiradoPorMi(retiros, sp))} · David ${f(C.retiradoPorDavid(retiros, sp))}`),
    card('Reinvertido / en caja', `<span class="num">${f(C.beneficioAcumulado(ingresos) - C.totalRetirado(retiros))}</span>`, 'beneficio que no se ha sacado'),
  ].join('');

  // Filtros de fecha. El año manda sobre la lista de meses: si cambia, los meses se repueblan.
  const irpfCfg = getIrpf();
  const anio = rellenarFiltro('filtro-anio', C.aniosDeRetiros(retiros));
  const mes = rellenarFiltro('filtro-mes', C.mesesDeRetiros(retiros, anio || undefined), nombreMes);
  const desde = document.getElementById('filtro-desde').value;
  const hasta = document.getElementById('filtro-hasta').value;
  const lista = C.filtrarRetiros(retiros, { anio, mes, desde, hasta });

  // Cabecera del conjunto filtrado: cuánto se movió y cuánto queda de verdad.
  const res = C.resumenRetiros(lista, irpfCfg, sp);
  document.getElementById('retiros-totales').innerHTML = [
    card(`${res.n} retiro${res.n === 1 ? '' : 's'}`, `<span class="num">${f(res.bruto)}</span>`, 'bruto del negocio (100%)'),
    card('Mi 40%', `<span class="num pos">${f(res.miBruto)}</span>`, 'mi parte, antes de impuestos'),
    card('IRPF', `<span class="num col-irpf">${f(res.irpf)}</span>`, 'solo de los retiros por banco'),
    card('Neto real', `<span class="num ${res.miNeto >= 0 ? 'pos' : 'neg'}">${f(res.miNeto)}</span>`, 'lo que me queda tras Hacienda'),
  ].join('');

  const filtro = document.getElementById('filtro-retiros').value;
  let filas = '';
  lista.forEach((r) => {
    const yo = r.total * sp.yo, david = r.total * sp.david;
    const caja2 = C.cajaRestanteTrasRetiro(ingresos, retiros, r.fecha);
    let imp, rep;
    if (filtro === 'yo') { imp = yo; rep = 'Yo (40%)'; }
    else if (filtro === 'david') { imp = david; rep = 'David (60%)'; }
    else { imp = r.total; rep = `Yo ${f(yo)} · David ${f(david)}`; }
    // Cripto no tributa: va un guion, no un 0,00 € (que se leería como "ya calculado").
    // Desconocido: no se adivina, se marca con "?" en ámbar hasta que se clasifique.
    const clase = C.clasificarRetiro(r, irpfCfg);
    let tdIrpf, tdNeto;
    if (clase === 'banco') {
      tdIrpf = `<td class="num col-irpf">−${f(C.irpfDeRetiro(r, irpfCfg, sp))}</td>`;
      tdNeto = `<td class="num pos">${f(C.miNetoDeRetiro(r, irpfCfg, sp))}</td>`;
    } else if (clase === 'cripto') {
      tdIrpf = '<td class="num" style="color:var(--dim)" title="Cripto: no tributa aquí">—</td>';
      tdNeto = `<td class="num">${f(yo)}</td>`;
    } else {
      tdIrpf = '<td class="num" style="color:var(--amber)" title="Concepto sin clasificar">?</td>';
      tdNeto = '<td class="num" style="color:var(--amber)" title="Sin saber si tributa, no se puede calcular">?</td>';
    }
    filas += `<tr><td>${r.fecha}</td><td class="num">${f(imp)}</td><td>${rep}</td>${tdIrpf}${tdNeto}<td class="num">${f(caja2)}</td></tr>`;
  });
  if (!filas) filas = '<tr><td colspan="6" class="vacio">Sin retiros con estos filtros.</td></tr>';
  const listaBanco = (irpfCfg.conceptosBanco || []).join(', ') || '—';
  const listaCripto = (irpfCfg.conceptosCripto || []).join(', ') || '—';
  document.getElementById('tabla-retiros').innerHTML =
    `<table><thead><tr><th>Fecha</th><th class="num">Importe</th><th>Reparto</th><th class="num col-irpf">IRPF</th><th class="num">Neto real (mío)</th><th class="num">Caja restante (contable)</th></tr></thead><tbody>${filas}</tbody></table>
     <p class="mc" style="padding:12px 18px 2px">El <strong>IRPF</strong> (${Number(irpfCfg.porcentaje) || 0}%) se calcula sobre mi 40% y solo en los retiros por transferencia (${esc(listaBanco)}). Los de cripto (${esc(listaCripto)}) llevan "—" porque no tributan aquí. Un "?" es un concepto sin clasificar: revísalo en "Editar datos".</p>`;
}

// ---------- MI DINERO ----------
function renderMiDinero() {
  const { ingresos, retiros } = datos;
  const sp = split();
  const ym = mesActual();
  document.getElementById('md-mes-nombre').textContent = nombreMesLargo(ym);

  const benef = ingresos.find((i) => i.mes === ym)?.beneficio ?? 0;
  const miParte = C.miParteMes(benef, sp);
  const miRetiro = C.miRetiroDelMes(retiros, ym, sp);
  const gastos = C.gastoFijoMensual(getGastos());
  const irpfCfg = getIrpf();
  const pctIrpf = Number(irpfCfg.porcentaje) || 0;
  // Ahorro real = mi 40% retirado − su IRPF − gastos fijos. El IRPF ya no es invisible.
  const ar = C.ahorroRealDelMes(retiros, ym, gastos, irpfCfg, sp);
  const ahorro = ar.ahorro;
  const huboRetiro = C.retirosDelMes(retiros, ym) > 0;

  document.getElementById('midinero-cards').innerHTML = [
    card('Mi beneficio generado (40%)', `<span class="num pos">${f(miParte)}</span>`, 'lo que me corresponde aunque no lo saque'),
    card('Retirado por mí este mes', `<span class="num">${f(miRetiro)}</span>`, huboRetiro ? 'dinero que entró a mi bolsillo' : 'este mes no retiré nada'),
    card('IRPF del mes', `<span class="num" style="color:var(--amber)">${f(ar.irpf)}</span>`, `${pctIrpf}% de lo retirado por transferencia`),
    card('Mis gastos fijos', `<span class="num neg">${f(gastos)}</span>`, 'gym, asesoría, autónomo…'),
    card(huboRetiro ? 'Ahorro real del mes' : 'Sale de mi banco', `<span class="num ${ahorro >= 0 ? 'pos' : 'neg'}">${f(ahorro)}</span>`, huboRetiro ? 'retirado − IRPF − gastos fijos' : 'gastos cubiertos con tu cuenta'),
  ].join('');

  // Desglose completo, línea a línea: de lo retirado al ahorro real, sin pasos ocultos.
  const desglose = [
    ['Retirado (mi 40%)', f(ar.miBruto)],
    [`− IRPF (${pctIrpf}%)`, `−${f(ar.irpf)}`],
    ['− Gastos fijos', `−${f(ar.gastos)}`],
    ['= Ahorro real', f(ar.ahorro)],
  ].map(([l, v]) => `<div>${l}: <strong>${v}</strong></div>`).join('');

  let aviso = '';
  if (!huboRetiro) {
    aviso = `<div class="alerta">${ICON_WARN}<span>Este mes <strong>no retiraste nada</strong> (reinversión en el negocio). Tus gastos fijos (${f(gastos)}) salen de tu cuenta bancaria, no del negocio. Tu beneficio generado (${f(miParte)}) sigue en la caja y todavía no tributa: el IRPF llega cuando lo saques por transferencia.</span></div>`;
  } else if (ahorro >= 0) {
    aviso = `<div class="alerta ok">${ICON_OK}<span>Este mes retiraste ${f(ar.miBruto)}; tras Hacienda y tus gastos fijos te quedan <strong>${f(ahorro)}</strong> de ahorro real.<span class="mc">${desglose}</span></span></div>`;
  } else {
    aviso = `<div class="alerta">${ICON_WARN}<span>Lo retirado tras IRPF (${f(ar.miBruto - ar.irpf)}) no cubre tus gastos fijos (${f(gastos)}). Te faltan <strong>${f(Math.abs(ahorro))}</strong> de tu cuenta.<span class="mc">${desglose}</span></span></div>`;
  }
  document.getElementById('aviso-midinero').innerHTML = aviso;

  const gf = getGastos();
  let lg = gf.map((g) => card(`${g.nombre} · día ${g.diaPago || 1}`, `<span class="num">${f(g.importe)}</span>`)).join('');
  lg += `<div class="card acento"><div class="l">Total fijo / mes</div><div class="v num">${f(gastos)}</div></div>`;
  document.getElementById('lista-gastos').innerHTML = lg;

  const saldo = getSaldo();
  const real = C.saldoReal(saldo.importe, gastos);
  document.getElementById('saldo-detalle').innerHTML = [
    card('Saldo banco', `<span class="num">${f(saldo.importe)}</span>`, `actualizado ${saldo.fechaActualizacion}`),
    card('Gastos fijos pendientes', `<span class="num">${f(gastos)}</span>`),
    card('Saldo real tras gastos', `<span class="num ${real >= 0 ? 'pos' : 'neg'}">${f(real)}</span>`),
  ].join('');
  let alerta = '';
  if (saldo.importe > 0 && real < 0) alerta = `<div class="alerta">${ICON_WARN}<span>Tu saldo (${f(saldo.importe)}) no cubre los gastos fijos (${f(gastos)}). Te faltan <strong>${f(Math.abs(real))}</strong>.</span></div>`;
  else if (saldo.importe > 0) alerta = `<div class="alerta ok">${ICON_OK}<span>Tu saldo cubre los gastos fijos. Te quedan <strong>${f(real)}</strong>.</span></div>`;
  document.getElementById('alerta-saldo').innerHTML = alerta;

  // Acumulados + histórico personal
  const miBeneficioTotal = C.miParteDe(C.beneficioAcumulado(ingresos), sp);
  const miRetiradoTotal = C.retiradoPorMi(retiros, sp);
  // El acumulado descuenta también el IRPF de cada mes: es dinero que nunca fue mío.
  let ahorroAcum = 0;
  ingresos.forEach((i) => {
    const a = C.ahorroRealDelMes(retiros, i.mes, gastos, irpfCfg, sp);
    if (a.miBruto > 0) ahorroAcum += a.ahorro;
  });
  const sparkBenef = `<div class="spark">${sparkline(ingresos.map((i) => C.miParteMes(i.beneficio, sp)))}</div>`;
  document.getElementById('midinero-acum').innerHTML = [
    card('Mi beneficio generado total', nc(miBeneficioTotal, 'pos') + sparkBenef, '40% de todo lo generado'),
    card('Me he retirado en total', nc(miRetiradoTotal), 'dinero que ya me llevé'),
    card('Ahorro acumulado', nc(ahorroAcum, ahorroAcum >= 0 ? 'pos' : 'neg'), 'retiros − IRPF − gastos, meses con retiro'),
  ].join('');

  let filas = '';
  ingresos.forEach((i) => {
    const miBen = C.miParteMes(i.beneficio, sp);
    const a = C.ahorroRealDelMes(retiros, i.mes, gastos, irpfCfg, sp);
    const ret = a.miBruto;
    const ah = ret > 0 ? a.ahorro : null;
    const tdIrpf = ret > 0
      ? `<td class="num col-irpf">${a.irpf > 0 ? '−' + f(a.irpf) : '<span style="color:var(--dim)">—</span>'}</td>`
      : '<td class="num"><span style="color:var(--dim)">—</span></td>';
    filas += `<tr><td>${nombreMes(i.mes)}</td><td class="num pos">${f(miBen)}</td><td class="num">${ret > 0 ? f(ret) : '<span style="color:var(--dim)">—</span>'}</td>${tdIrpf}<td class="num neg">${f(gastos)}</td><td class="num ${ah === null ? '' : ah >= 0 ? 'pos' : 'neg'}">${ah === null ? '<span style="color:var(--dim)">sin retiro</span>' : f(ah)}</td></tr>`;
  });
  if (!filas) filas = '<tr><td colspan="6" class="vacio">Sin datos todavía.</td></tr>';
  document.getElementById('midinero-tabla').innerHTML =
    `<table><thead><tr><th>Mes</th><th class="num">Mi beneficio (40%)</th><th class="num">Mi retiro</th><th class="num col-irpf">IRPF</th><th class="num">Gastos fijos</th><th class="num">Ahorro real</th></tr></thead><tbody>${filas}</tbody></table>
     <p class="mc" style="padding:12px 18px 2px">El <strong>ahorro real</strong> = lo que retiraste ese mes − el <strong>IRPF</strong> de esos retiros − tus gastos fijos: el dinero que de verdad te llevaste a casa. Solo tributan los retiros por transferencia; los de cripto llevan "—" en la columna de IRPF. No depende del beneficio del negocio de ese mes (puedes retirar de meses anteriores). Por eso mayo, aun siendo mal mes para el negocio, tiene ahorro alto: hiciste un reparto grande.</p>`;
}

// ---------- CALENDARIO ----------
function eventosDeFecha(iso) {
  const sp = split();
  const evs = [];
  const gan = C.gananciaDiaParaMi(datos.ventas, iso, sp); // mi 40% de ventas del día
  if (gan > 0) evs.push({ tipo: 'ganancia', txt: `+${f(gan)}` });
  const gasto = C.gastosEntre(datos.gastosNegocio, iso, iso);
  if (gasto > 0) evs.push({ tipo: 'gasto', txt: `−${f(C.miParteDe(gasto, sp))}` }); // mi 40% del gasto
  const cfg = getIrpf();
  datos.retiros.filter((r) => r.fecha === iso).forEach((r) => {
    evs.push({ tipo: 'retiro', txt: `Retiro ${f(r.total)}` });
    evs.push({ tipo: 'mio', txt: `mi 40%: ${f(C.miParteDe(r.total, sp))}` });
    // El retiro ya se cobró: aquí el IRPF es real, no una estimación.
    const clase = C.clasificarRetiro(r, cfg);
    if (clase === 'banco') {
      evs.push({ tipo: 'gasto', txt: `IRPF −${f(C.irpfDeRetiro(r, cfg, sp))}` });
      evs.push({ tipo: 'mio', txt: `neto: ${f(C.miNetoDeRetiro(r, cfg, sp))}` });
    } else if (clase === 'cripto') {
      evs.push({ tipo: 'mio', txt: 'sin IRPF (cripto)' });
    } else {
      evs.push({ tipo: 'gasto', txt: 'sin clasificar' }); // .ev.gasto va en ámbar
    }
  });
  return evs;
}
let calMaxGan = 0; // máximo de mi-ganancia diaria en el periodo (para el heatmap)
function celda(iso, dentro = true) {
  const d = Number(iso.slice(8, 10));
  const evs = eventosDeFecha(iso).map((e) => `<div class="ev ${e.tipo}">${e.txt}</div>`).join('');
  const gan = C.gananciaDiaParaMi(datos.ventas, iso, split());
  let bg = '';
  if (gan > 0 && calMaxGan > 0) {
    const alpha = (0.08 + 0.5 * (gan / calMaxGan)).toFixed(3);
    bg = ` style="background:rgba(0,200,150,${alpha})"`;
  }
  return `<div class="cal-cell ${iso === hoyISO() ? 'hoy' : ''} ${dentro ? '' : 'fuera'}" data-iso="${iso}"${bg}><div class="d">${d}</div>${evs}</div>`;
}
function lunesDe(date) { const d = new Date(date); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return d; }
function rangoActual() {
  const ym = document.getElementById('cal-mes').value || mesActual();
  const fecha = document.getElementById('cal-fecha').value || hoyISO();
  if (calModo === 'mes') {
    const [a, m] = ym.split('-').map(Number);
    const dias = new Date(a, m, 0).getDate();
    return { desde: `${ym}-01`, hasta: `${ym}-${String(dias).padStart(2, '0')}` };
  }
  if (calModo === 'semana') {
    const l = lunesDe(fecha); const dom = new Date(l); dom.setDate(l.getDate() + 6);
    return { desde: l.toISOString().slice(0, 10), hasta: dom.toISOString().slice(0, 10) };
  }
  return { desde: fecha, hasta: fecha };
}
function renderCalendario() {
  const sp = split();
  const cab = document.getElementById('cal-cab');
  const grid = document.getElementById('cal-grid');
  grid.className = 'cal-grid ' + calModo;
  const inputMes = document.getElementById('cal-mes');
  const inputFecha = document.getElementById('cal-fecha');
  if (!inputMes.value) inputMes.value = mesActual();
  if (!inputFecha.value) inputFecha.value = hoyISO();

  // Totales del periodo
  const { desde, hasta } = rangoActual();
  const neto = C.ventasNetasEntre(datos.ventas, desde, hasta);
  const gastos = C.gastosEntre(datos.gastosNegocio, desde, hasta);
  const miVentas = C.miParteDe(neto, sp);
  const miGastos = C.miParteDe(gastos, sp);
  const miBeneficio = C.miBeneficioEntre(datos.ventas, datos.gastosNegocio, desde, hasta, sp); // = miVentas - miGastos
  const retPer = C.retirosEntre(datos.retiros, desde, hasta);
  const miRetPer = C.miParteDe(retPer, sp);
  const etiqueta = calModo === 'mes' ? 'este mes' : calModo === 'semana' ? 'esta semana' : 'este día';
  // Mi retiro del MES en curso (complemento: ganado vs retirado a fin de mes)
  const mesContexto = (calModo === 'mes' ? (inputMes.value || mesActual()) : (inputFecha.value || hoyISO()).slice(0, 7));
  const miRetMes = C.miRetiroDelMes(datos.retiros, mesContexto, sp);
  document.getElementById('cal-totales').innerHTML = [
    card(`Mi beneficio (40%) ${etiqueta}`, `<span class="num ${miBeneficio >= 0 ? 'pos' : 'neg'}">${f(miBeneficio)}</span>`, 'mi parte de (ventas − gastos)'),
    card(`Mi retiro este mes`, `<span class="num">${f(miRetMes)}</span>`, miRetMes > 0 ? 'lo que me llevé de verdad' : 'este mes no he retirado'),
    card(`Mis ventas (40%) ${etiqueta}`, `<span class="num pos">${f(miVentas)}</span>`, 'mi parte de lo vendido'),
    card(`Mis gastos (40%) ${etiqueta}`, `<span class="num neg">${f(miGastos)}</span>`, 'mi parte de los gastos'),
    card(`Ventas netas negocio ${etiqueta}`, `<span class="num">${f(neto)}</span>`, 'sin IVA, el 100%'),
    card(`Gastos negocio ${etiqueta}`, `<span class="num">${f(gastos)}</span>`, 'el 100%'),
  ].join('');

  // Heatmap: máximo de mi-ganancia diaria en el rango
  calMaxGan = 0;
  for (let t = Date.parse(desde + 'T00:00:00Z'); t <= Date.parse(hasta + 'T00:00:00Z'); t += 86400000) {
    const iso = new Date(t).toISOString().slice(0, 10);
    calMaxGan = Math.max(calMaxGan, C.gananciaDiaParaMi(datos.ventas, iso, sp));
  }

  // Acumulado / media / proyección (solo en modo mes)
  const proyEl = document.getElementById('cal-proyeccion');
  const leyEl = document.getElementById('heat-leyenda');
  if (calModo === 'mes') {
    const ym = inputMes.value || mesActual();
    const diasMes = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
    const esActual = ym === mesActual();
    const diasTrans = esActual ? new Date().getDate() : diasMes;
    const media = diasTrans > 0 ? miBeneficio / diasTrans : 0;
    const proy = esActual ? C.proyeccionLineal(miBeneficio, diasTrans, diasMes) : miBeneficio;
    proyEl.style.display = '';
    proyEl.innerHTML = [
      card('Acumulado del mes', `<span class="num ${miBeneficio >= 0 ? 'pos' : 'neg'}">${f(miBeneficio)}</span>`, 'mi beneficio hasta hoy'),
      card('Media diaria', `<span class="num">${f(media)}</span>`, esActual ? `sobre ${diasTrans} días` : 'media del mes'),
      card(esActual ? 'Proyección fin de mes' : 'Total del mes', `<span class="num ${proy >= 0 ? 'pos' : 'neg'}">${f(proy)}</span>`, esActual ? 'a este ritmo (run-rate)' : 'cerrado'),
    ].join('');
  } else {
    proyEl.style.display = 'none';
    proyEl.innerHTML = '';
  }
  leyEl.innerHTML = 'Heatmap (mi ganancia/día): <span class="box" style="background:rgba(0,200,150,0.08)"></span> menos <span class="box" style="background:rgba(0,200,150,0.58)"></span> más';

  if (calModo === 'mes') {
    cab.innerHTML = DIAS.map((d) => `<span>${d}</span>`).join('');
    const [a, m] = inputMes.value.split('-').map(Number);
    const dias = new Date(a, m, 0).getDate();
    const primer = (new Date(a, m - 1, 1).getDay() + 6) % 7;
    let cel = '';
    for (let i = 0; i < primer; i++) cel += '<div class="cal-cell vacia"></div>';
    for (let d = 1; d <= dias; d++) cel += celda(`${inputMes.value}-${String(d).padStart(2, '0')}`);
    grid.innerHTML = cel;
  } else if (calModo === 'semana') {
    cab.innerHTML = DIAS.map((d) => `<span>${d}</span>`).join('');
    const l = lunesDe(inputFecha.value);
    let cel = '';
    for (let i = 0; i < 7; i++) { const dt = new Date(l); dt.setDate(l.getDate() + i); cel += celda(dt.toISOString().slice(0, 10)); }
    grid.innerHTML = cel;
  } else {
    cab.innerHTML = '';
    grid.innerHTML = `<div style="grid-column:1/-1">${celda(inputFecha.value)}</div>`;
  }
}

// ---------- Detalle del día (drill-down) ----------
function abrirDetalleDia(iso) {
  const sp = split();
  const ventas = datos.ventas.filter((v) => v.fecha === iso);
  const gastos = datos.gastosNegocio.filter((g) => g.fecha === iso);
  const retiros = datos.retiros.filter((r) => r.fecha === iso);

  const netoDia = ventas.reduce((a, v) => a + v.neto, 0);
  const miGan = netoDia * sp.yo;
  const gastoDia = gastos.reduce((a, g) => a + g.total, 0);
  const miGasto = C.miParteDe(gastoDia, sp);
  const retDia = retiros.reduce((a, r) => a + r.total, 0);

  const [a, m, d] = iso.split('-');
  const fechaTxt = `${Number(d)} de ${MESES_LARGO[Number(m) - 1]} ${a}`;

  // Por qué "estimado": el beneficio de este día sigue en la caja del negocio, todavía
  // NO se ha retirado, así que todavía NO tributa. Aquí no hay un retiro que gravar:
  // solo aplicamos el tipo general para dar una idea de lo que quedaría el día que lo
  // saque por transferencia. Si lo sacara por cripto, el IRPF de esta línea sería 0.
  // Por eso no se usa irpfDeRetiro (que exige un retiro real y su concepto).
  const cfg = getIrpf();
  const pctIrpf = Number(cfg.porcentaje) || 0;
  const netoDiaMio = miGan - miGasto;
  const trasIrpf = netoDiaMio * (1 - pctIrpf / 100);

  let html = `<div class="dia-detalle"><h3>${fechaTxt}</h3>
    <div class="dia-resumen">
      <div><span class="l">Mi ganancia (40%)</span><span class="v pos">${f(miGan)}</span></div>
      <div><span class="l">Mi parte de gastos</span><span class="v neg">${f(miGasto)}</span></div>
      <div><span class="l">Mi neto del día</span><span class="v ${netoDiaMio >= 0 ? 'pos' : 'neg'}">${f(netoDiaMio)}</span></div>
      <div><span class="l">Retiros del día</span><span class="v">${f(retDia)}</span></div>
      <div><span class="l">Tras IRPF (${pctIrpf}%)<span class="badge-est">estimado</span></span><span class="v ${trasIrpf >= 0 ? 'pos' : 'neg'}">${f(trasIrpf)}</span></div>
    </div>`;

  if (ventas.length) {
    html += `<div class="dia-seccion"><h4>Ventas (${ventas.length}) · por qué entró dinero</h4>` +
      ventas.map((v) =>
        `<div class="dia-linea"><span class="cpt">${v.cliente || 'Venta'}<small>${v.metodo || ''}${v.pais ? ' · ' + v.pais : ''}</small></span><span class="imp">${f(v.neto)}</span><span class="mio pos">+${f(v.neto * sp.yo)}</span></div>`
      ).join('') + '</div>';
  }
  if (gastos.length) {
    html += `<div class="dia-seccion"><h4>Gastos del negocio (${gastos.length}) · en qué se fue</h4>` +
      gastos.map((g) =>
        `<div class="dia-linea"><span class="cpt">${g.concepto || 'Gasto'}<small>${[g.proveedor, g.categoria].filter(Boolean).join(' · ')}</small></span><span class="imp">−${f(g.total)}</span><span class="mio neg">−${f(C.miParteDe(g.total, sp))}</span></div>`
      ).join('') + '</div>';
  }
  if (retiros.length) {
    html += `<div class="dia-seccion"><h4>Retiros (${retiros.length})</h4>` +
      retiros.map((r) => {
        // Aquí sí hay retiro: el IRPF es el real de ese movimiento, no una estimación.
        const clase = C.clasificarRetiro(r, cfg);
        const miParteRet = C.miParteDe(r.total, sp);
        let sub, mio;
        if (clase === 'banco') {
          sub = `yo 40% · IRPF −${f(C.irpfDeRetiro(r, cfg, sp))}`;
          mio = `<span class="mio pos">${f(C.miNetoDeRetiro(r, cfg, sp))}</span>`;
        } else if (clase === 'cripto') {
          sub = 'yo 40% · sin IRPF (cripto)';
          mio = `<span class="mio">${f(miParteRet)}</span>`;
        } else {
          sub = 'yo 40% · sin clasificar';
          mio = `<span class="mio" style="color:var(--amber)">${f(miParteRet)} ?</span>`;
        }
        return `<div class="dia-linea"><span class="cpt">${esc(r.concepto || 'Retiro')}<small>${sub}</small></span><span class="imp">${f(r.total)}</span>${mio}</div>`;
      }).join('') + '</div>';
  }
  if (!ventas.length && !gastos.length && !retiros.length) {
    html += '<p class="mc">Sin movimientos este día.</p>';
  }
  html += `<p class="nota">Columna derecha = tu parte (40%); en los retiros por banco, ya con el IRPF descontado. La línea <strong>Tras IRPF</strong> del resumen es una <strong>estimación</strong>: este beneficio sigue en la caja del negocio y no tributa hasta que lo retires por transferencia.</p></div>`;

  document.getElementById('modal-dia-contenido').innerHTML = html;
  document.getElementById('modal-dia').classList.remove('oculto');
}

// ---------- Router ----------
function renderVista(v) {
  if (v === 'resumen') renderResumen();
  else if (v === 'historico') renderHistorico();
  else if (v === 'retiros') renderRetiros();
  else if (v === 'midinero') renderMiDinero();
  else if (v === 'calendario') renderCalendario();
  else if (v === 'patrimonio') {
    const mv = modeloVivo();
    renderPatrimonio({
      patrimonio: getPatrimonio(),
      retiros: datos.retiros,
      gastosFijosTotal: C.gastoFijoMensual(getGastos()),
      irpfCfg: getIrpf(),
      split,
      f,
      card,
      // La reserva de impuestos que ya había usa el IRPF PLANO de los retiros hechos.
      // Con esto la vista puede ofrecer además el REAL, el de tramos, sobre las ventas
      // medias del negocio: es el número que dice si hay que apartar o si devuelven.
      modeloObjetivo: mv.modelo,
      ventasMedia: mv.ventasMedia,
    });
  } else if (v === 'objetivo') {
    const mv = modeloVivo();
    renderVistaObjetivo({
      modelo: mv.modelo,
      dubai: getDubai(),
      ventasMedia: mv.ventasMedia,
      objetivo: getObjetivo(),
      fuente: mv.fuente,
      f,
      card,
    });
  }
  postRender(v);
}
function cambiarVista(v) {
  vistaActiva = v;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('activa', t.dataset.vista === v));
  document.querySelectorAll('.vista').forEach((s) => s.classList.toggle('activa', s.id === `v-${v}`));
  renderVista(v);
}

// ---------- Modal ----------
function pintarGastosEdit() {
  document.getElementById('g-gastos').innerHTML = getGastos().map((g, i) =>
    `<div class="gasto-fila"><input data-i="${i}" data-k="nombre" value="${g.nombre}" placeholder="Concepto"/><input data-i="${i}" data-k="importe" class="imp" type="number" step="0.01" value="${g.importe}" placeholder="€"/></div>`
  ).join('');
}
function leerGastosEdit() {
  const filas = {};
  document.querySelectorAll('#g-gastos input').forEach((inp) => {
    const i = inp.dataset.i;
    filas[i] = filas[i] || { nombre: '', importe: 0, diaPago: 1 };
    if (inp.dataset.k === 'nombre') filas[i].nombre = inp.value;
    else filas[i].importe = parseFloat(inp.value) || 0;
  });
  return Object.values(filas).filter((g) => g.nombre.trim());
}
// Lista de conceptos escrita a mano: "Fyrst, Revolut" -> ['Fyrst', 'Revolut'].
function leerConceptos(id) {
  return document.getElementById(id).value.split(',').map((s) => s.trim()).filter(Boolean);
}
function abrirModal() {
  document.getElementById('g-saldo').value = getSaldo().importe;
  document.getElementById('g-meta').value = getMeta();
  const irpf = getIrpf();
  document.getElementById('g-irpf').value = irpf.porcentaje;
  document.getElementById('g-banco').value = (irpf.conceptosBanco || []).join(', ');
  document.getElementById('g-cripto').value = (irpf.conceptosCripto || []).join(', ');
  pintarGastosEdit();
  document.getElementById('modal').classList.remove('oculto');
}
function cerrarModal() { document.getElementById('modal').classList.add('oculto'); }
function guardarModal() {
  const saldo = parseFloat(document.getElementById('g-saldo').value);
  if (!Number.isNaN(saldo)) localStorage.setItem(SALDO_KEY, JSON.stringify({ importe: saldo, fechaActualizacion: hoyISO() }));
  const meta = parseFloat(document.getElementById('g-meta').value);
  if (!Number.isNaN(meta)) localStorage.setItem(META_KEY, String(meta));
  localStorage.setItem(GASTOS_KEY, JSON.stringify(leerGastosEdit()));
  // IRPF: si el porcentaje viene vacío o mal, se conserva el que había (nunca NaN).
  const pct = parseFloat(document.getElementById('g-irpf').value);
  localStorage.setItem(IRPF_KEY, JSON.stringify({
    porcentaje: Number.isNaN(pct) ? (Number(getIrpf().porcentaje) || 0) : pct,
    conceptosBanco: leerConceptos('g-banco'),
    conceptosCripto: leerConceptos('g-cripto'),
  }));
  cerrarModal();
  renderVista(vistaActiva);
}
function exportarJSON() {
  const out = {
    ...config,
    saldoBanco: getSaldo(),
    // El modelo viaja con su bandera `fijosManual`: si el usuario tecleó los fijos, esa
    // decisión tiene que sobrevivir al viaje por GitHub, no perderse por el camino.
    config: { ...config.config, gastosFijos: getGastos(), irpf: getIrpf(), modelo: getModelo(), dubai: getDubai() },
    patrimonio: getPatrimonio(),
    objetivoLimpio: getObjetivo(),
  };
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'datos.json'; a.click();
  URL.revokeObjectURL(url);
}

// ---------- Eventos ----------
function bind() {
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => cambiarVista(t.dataset.vista)));
  document.getElementById('btn-actualizar').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try { await cargarNegocio(); renderVista(vistaActiva); }
    catch (err) { console.error('Error al actualizar', err); }
    finally { btn.disabled = false; }
  });
  // Auto-actualizar al volver a la app (móvil/escritorio)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) cargarNegocio().then(() => renderVista(vistaActiva)).catch(() => {});
  });
  document.getElementById('btn-editar').addEventListener('click', abrirModal);
  document.getElementById('modal-cerrar').addEventListener('click', cerrarModal);
  document.getElementById('g-guardar').addEventListener('click', guardarModal);
  document.getElementById('g-exportar').addEventListener('click', exportarJSON);
  document.getElementById('g-add-gasto').addEventListener('click', () => {
    const actuales = leerGastosEdit(); actuales.push({ nombre: '', importe: 0, diaPago: 1 });
    localStorage.setItem(GASTOS_KEY, JSON.stringify(actuales)); pintarGastosEdit();
  });
  document.getElementById('filtro-retiros').addEventListener('change', renderRetiros);
  // Filtros de fecha del historial. Se combinan con el select de reparto (todos/yo/david).
  document.getElementById('filtro-anio').addEventListener('change', () => {
    // Al cambiar de año los meses disponibles cambian: el mes elegido ya no aplica.
    document.getElementById('filtro-mes').value = '';
    renderRetiros();
  });
  document.getElementById('filtro-mes').addEventListener('change', renderRetiros);
  document.getElementById('filtro-desde').addEventListener('change', renderRetiros);
  document.getElementById('filtro-hasta').addEventListener('change', renderRetiros);
  document.getElementById('filtro-limpiar').addEventListener('click', () => {
    ['filtro-anio', 'filtro-mes', 'filtro-desde', 'filtro-hasta'].forEach((id) => { document.getElementById(id).value = ''; });
    renderRetiros();
  });
  // Patrimonio: se engancha una sola vez (bindPatrimonio ya se protege con dataset).
  bindPatrimonio({ getPatrimonio, setPatrimonio, rerender: () => renderVista('patrimonio') });
  // Cuánto facturar: igual, una sola vez (bindObjetivo también se protege con dataset).
  bindObjetivo({
    getModelo, setModelo, getDubai, setDubai, getObjetivo, setObjetivo,
    rerender: () => renderVista('objetivo'),
  });
  document.getElementById('cal-mes').addEventListener('change', renderCalendario);
  document.getElementById('cal-fecha').addEventListener('change', renderCalendario);
  document.getElementById('cal-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.cal-cell[data-iso]');
    if (cell && !cell.classList.contains('vacia')) abrirDetalleDia(cell.dataset.iso);
  });
  document.getElementById('modal-dia-cerrar').addEventListener('click', () => document.getElementById('modal-dia').classList.add('oculto'));
  document.getElementById('modal-dia').addEventListener('click', (e) => { if (e.target.id === 'modal-dia') document.getElementById('modal-dia').classList.add('oculto'); });
  document.querySelectorAll('#cal-modo button').forEach((b) => b.addEventListener('click', () => {
    calModo = b.dataset.modo;
    document.querySelectorAll('#cal-modo button').forEach((x) => x.classList.toggle('on', x === b));
    document.getElementById('cal-mes').style.display = calModo === 'mes' ? '' : 'none';
    document.getElementById('cal-fecha').style.display = calModo === 'mes' ? 'none' : '';
    renderCalendario();
  }));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

(async function init() {
  await cargarConfig();
  bind();
  await cargarNegocio();
  cambiarVista('resumen');
})();
