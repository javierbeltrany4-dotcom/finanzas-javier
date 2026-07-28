// Vista "Cuánto facturar": de "quiero quedarme limpio con X" a cuántas ventas hacen falta,
// de dónde sale cada euro, qué se retiene contra lo que de verdad se paga, y España contra Dubái.
// Aquí solo hay DOM y strings; toda la aritmética vive en objetivo.js / calculos.js.
//
// Dos ideas que la pantalla tiene que dejar cerradas, porque son las que dan ansiedad:
//   1) el 20 % es lo que se RETIENE cada mes, no lo que se acaba pagando. El IRPF real va por
//      tramos, y por eso la respuesta grande de la inversa se calcula CON los tramos: la
//      retención plana queda como comparativa pequeña debajo, nunca como la respuesta.
//   2) Dubái no es gratis: cuesta lo mismo se gane poco o mucho, así que tiene un punto de cruce.
//      No se opina: se enseña el número y a partir de cuántas ventas cambia el signo.

import {
  MODELO_DEFAULT,
  normalizarModelo,
  normalizarDubai,
  resultadoMensual,
  puntoMuerto,
  ventasParaLimpiar,
  escalera,
  palancas,
  irpfAnualReal,
  bolsilloRealMes,
  ventasParaLimpiarReal,
  rentaFiscalDelAnio,
  tramoDe,
  TRAMOS_IRPF_TEXTO,
  SMI_ANUAL,
  comparativaFiscal,
  ventasParaDubai,
} from './objetivo.js';
import { formatoEuros } from './calculos.js';

// ---------------------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------------------

// Meta por defecto si nadie ha dicho todavía cuánto quiere quedarse limpio.
const OBJETIVO_DEFAULT = 3000;

const METAS_RAPIDAS = [1000, 2000, 3000, 5000, 10000];
const ESCALONES = [0, 1, 2, 3, 5, 7, 10, 15, 20, 30, 40];
const VENTAS_DUBAI = [3, 5, 7.5, 10, 20, 40];

const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Campos editables del modelo: clave, etiqueta con unidad, paso del input y una línea
// que dice qué es y de dónde ha salido el valor actual. La de los fijos es dinámica
// (sale de c.fuente) y por eso aquí va vacía: ver descFijos().
const CAMPOS_MODELO = [
  ['ticket', 'Ticket con IVA (€)', 1, 'Lo que paga el cliente por una venta, con el IVA dentro. Es tu precio actual.'],
  ['iva', 'IVA (%)', 1, 'Va dentro del precio y nunca es tuyo. El 21 % general de España.'],
  ['comisionPct', 'Comisión de la pasarela (%)', 0.01, 'Lo que se queda Stripe/PayPal de cada cobro. Medido de 6 meses de comisiones reales.'],
  ['fijosNegocio', 'Gastos fijos del negocio (€/mes)', 1, ''],
  ['miShare', 'Mi parte del beneficio (%)', 1, 'Lo que te toca del beneficio; David tiene el resto. Vuestro acuerdo actual.'],
  ['cuotaAutonomo', 'Cuota de autónomo (€/mes)', 1, 'Tu tarifa plana actual de la Seguridad Social. Cuando se acabe, sube: corrígelo aquí ese día.'],
  ['deducibles', 'Asesoría, deducible (€/mes)', 1, 'Se resta ANTES del IRPF porque Hacienda la admite. Tu cuota de asesoría actual.'],
  ['gastosPersonales', 'Gastos personales, NO deducibles (€/mes)', 1, 'Gimnasio y similares: se restan DESPUÉS del IRPF porque Hacienda no los admite.'],
  ['irpf', 'Porcentaje que apartas de tu base cada mes (%)', 1, 'El porcentaje de tu base que apartas cada mes. NO es el IRPF final: ese va por tramos y se calcula solo, arriba.'],
];

const CAMPOS_DUBAI = [
  ['costeAnual', 'Coste de la estructura (€/año)', 100],
  ['impuestoSociedades', 'Impuesto de sociedades (%)', 0.5],
  ['minimoExento', 'Mínimo exento (€/año)', 1000],
];

// Textos que no se tocan: son la letra pequeña honesta de la pantalla.
const AVISO_MODELO = 'Esto sirve para decidir, no para Hacienda. Los tramos de IRPF son la escala general; cada comunidad cambia su mitad. La cuota de autónomo va por tramos de rendimientos y la tuya de 80 € es tarifa plana: cuando se acabe, sube. Valida las cifras con tu asesoría.';
const AVISO_DUBAI = 'Solo cuenta impuestos y estructura. No incluye el coste de vivir allí, los 183 días de residencia obligatorios, ni lo que España te pueda reclamar al irte. Consúltalo con un fiscalista antes de mover nada.';
const EXPLICACION_TIPOS = 'El marginal es lo que pagas por el SIGUIENTE euro. El medio es lo que pagas de verdad sobre el total. Nunca pierdes dinero por ganar más.';
const IMPOSIBLE = 'Con estos números no se llega ni vendiendo infinito.';

// LA frase que sostiene todo el bloque de IRPF, y por eso es una constante y no se toca.
//
// Él no es socio de una sociedad española que le reparte beneficios: es un autónomo español
// que FACTURA a la empresa alemana de su socio, y solo tributa por lo que factura. Pero la
// renta de un autónomo se imputa por DEVENGO, no por cobro, así que si tiene derecho
// contractual al 40 % y no lo factura, su asesoría puede decirle que debería estar
// facturando más. La app no puede resolver eso -depende de un contrato que no conoce-, así
// que hace lo único honesto: enseña las DOS cifras y dice cuál usa para los impuestos.
const AVISO_DEVENGO = 'Tributas por lo que facturas, no por lo que te corresponde. Si tienes derecho contractual al 40 % y no lo facturas, pregúntale a tu asesoría si deberías estar facturándolo igualmente: la renta de un autónomo se reconoce por devengo.';

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

// ---------------------------------------------------------------------------
// Utilidades locales
// ---------------------------------------------------------------------------

// Todo texto que no controlamos (valores tecleados, textos de fuente) pasa por aquí
// antes de entrar en un innerHTML: un < o unas comillas romperían el render.
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Mismo criterio que objetivo.js: vacío o basura -> valor por defecto; el 0 es legítimo.
function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

// El usuario no puede ver nunca un NaN ni un Infinity: en su lugar, una raya.
function euros(f, n) {
  return Number.isFinite(n) ? f(n) : '—';
}

// 40 -> "40 %", 12,5 -> "12,5 %". Sin ceros de relleno.
function pctTexto(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return `${Number(n).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} %`;
}

// 8.53 -> "8,5" · 3 -> "3". Una cifra decimal: más precisión aquí es ruido.
function ventasTexto(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return String(Math.round(Number(n) * 10) / 10).replace('.', ',');
}

// Como ventasTexto pero con los decimales que se pidan (punto muerto: 0,45).
function decTexto(n, dec) {
  if (!Number.isFinite(Number(n))) return '—';
  return Number(n).toFixed(dec).replace('.', ',');
}

// Euros cortos para los botones de meta: "1.000 €", sin céntimos.
function eurosCortos(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return `${String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

// Valor que se mete en un input numérico: a céntimos, para no pintar 549.4166666666666.
function paraInput(n) {
  return Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : '';
}

const cardPorDefecto = (l, v, mc = '') =>
  `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

// Igual que card() pero con una clase extra: la card() de app.js no admite clases y
// la tarjeta de la respuesta tiene que destacar sobre las otras dos.
const cardCon = (cls, l, v, mc = '') =>
  `<div class="card ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function avisoAmbar(texto) {
  return `<div class="aviso-ambar">${ICON_WARN}<span>${texto}</span></div>`;
}

// Índice de la fila más cercana a un valor. -1 si la lista está vacía.
function masCercano(lista, valor) {
  let mejor = -1;
  let dist = Infinity;
  lista.forEach((v, i) => {
    const d = Math.abs(v - valor);
    if (d < dist) { dist = d; mejor = i; }
  });
  return mejor;
}

// La fila "AHORA" tiene que ser la del usuario DE VERDAD. masCercano siempre devuelve
// algo, así que con listas que empiezan en 3 ventas a alguien que hace 0 se le marcaba
// como "AHORA" un escenario que no es el suyo, contradiciendo el número grande de arriba.
// Si su cifra no está en la lista, se le abre hueco en su sitio.
function conFilaDeHoy(lista, v) {
  const i = lista.findIndex((n) => Math.abs(n - v) < 0.05);
  if (i >= 0) return { lista, iHoy: i };
  const nueva = [...lista, v].sort((a, b) => a - b);
  return { lista: nueva, iHoy: nueva.indexOf(v) };
}

// bolsilloRealMes y ventasParaLimpiarReal vivían aquí; ahora se importan de
// objetivo.js: la lógica de dinero no vive en vistas.

// Ventas del mes de `hoy` contadas de los datos reales. null si no llegaron datos o
// fecha: así el que pinta sabe distinguir "0 ventas" (real) de "no sé" (sin datos).
function ventasDelMes(datos, hoy) {
  const mes = String(hoy || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) return null;
  const lista = datos && Array.isArray(datos.ventas) ? datos.ventas : null;
  if (!lista) return null;
  return lista.filter((v) => String((v && v.fecha) || '').slice(0, 7) === mes).length;
}

// ['2026-04', '2026-05', '2026-06'] -> "abril a junio de 2026". Para decir de dónde
// salen los fijos medidos sin obligar al usuario a leer fechas ISO.
function rangoMesesTexto(meses) {
  const lista = Array.isArray(meses) ? meses.filter((m) => /^\d{4}-\d{2}$/.test(String(m))) : [];
  if (!lista.length) return '';
  const nombre = (ym) => MESES_LARGO[Number(ym.slice(5, 7)) - 1] || ym;
  const p = lista[0];
  const u = lista[lista.length - 1];
  if (p === u) return `${nombre(u)} de ${u.slice(0, 4)}`;
  if (p.slice(0, 4) === u.slice(0, 4)) return `${nombre(p)} a ${nombre(u)} de ${u.slice(0, 4)}`;
  return `${nombre(p)} de ${p.slice(0, 4)} a ${nombre(u)} de ${u.slice(0, 4)}`;
}

// Qué mes pinta la cascada: el del objetivo (por defecto) o el de hoy. Vive a nivel de
// módulo porque los chips se reescriben con cada repintado y no pueden guardar nada.
let cascModo = 'objetivo';

// Último ctx pintado. Se guarda para poder refrescar solo los resultados mientras el
// usuario teclea, sin obligar a los handlers a reconstruir el contexto entero.
let ctxUltimo = null;

// Deja el ctx en un estado en el que ninguna función de abajo puede recibir basura.
function prepararCtx(ctx) {
  const c = ctx || {};
  return {
    modelo: normalizarModelo(c.modelo),
    dubai: normalizarDubai(c.dubai),
    ventasMedia: Math.max(0, num(c.ventasMedia, 0)),
    objetivo: Math.max(0, num(c.objetivo, OBJETIVO_DEFAULT)),
    fuente: c.fuente || null,
    // Los datos reales y el "hoy" entran desde app.js: la vista no mira el reloj.
    datos: c.datos || null,
    hoy: /^\d{4}-\d{2}-\d{2}$/.test(String(c.hoy ?? '')) ? String(c.hoy) : '',
    f: typeof c.f === 'function' ? c.f : formatoEuros,
    card: typeof c.card === 'function' ? c.card : cardPorDefecto,
  };
}

// ---------------------------------------------------------------------------
// A) La inversa: "quiero quedarme limpio con X"
// ---------------------------------------------------------------------------
// Se parte en dos: el formulario (input + atajos) y los resultados. Solo se repintan
// los resultados mientras se escribe; el input nunca se toca (ver bindObjetivo).

function pintarInversaForm(c) {
  const rapidos = METAS_RAPIDAS.map((n) => {
    const on = Math.abs(n - c.objetivo) < 0.005 ? ' on' : '';
    return `<button type="button" class="btn btn-ghost obj-rapido${on}" data-meta="${n}">${eurosCortos(n)}</button>`;
  }).join('');

  return `<div class="obj-meta">
    <label class="obj-meta-label" for="obj-meta">Quiero quedarme limpio con</label>
    <input id="obj-meta" class="obj-meta-input" type="number" inputmode="decimal" step="50" min="0"
      value="${esc(paraInput(c.objetivo))}" placeholder="3000" aria-label="Euros limpios al mes" />
    <div class="obj-meta-pie mc">euros al mes, limpios de verdad: la respuesta usa el IRPF real por tramos</div>
    <div class="obj-rapidos">${rapidos}</div>
  </div>
  <div id="obj-inversa-res"></div>`;
}

// La respuesta grande sale de ventasParaLimpiarReal (IRPF por tramos), que es el que se
// acaba pagando. La retención plana ya no es la respuesta: queda como comparativa
// pequeña debajo, para ver los dos números juntos.
function pintarInversaRes(c) {
  const { modelo, ventasMedia, objetivo, f } = c;
  const r = ventasParaLimpiarReal(modelo, objetivo);

  // Sin solución: se dice por qué y se corta. Nunca un NaN ni un Infinity en pantalla.
  if (!r || !Number.isFinite(r.ventasExactas)) {
    return `<div class="obj-resultado imposible">
      <div class="l">Sin salida con este modelo</div>
      <div class="v">${IMPOSIBLE}</div>
      <span class="mc">Revisa el ticket o los fijos.</span>
    </div>`;
  }

  const card = c.card;
  // Tu parte BRUTA con esas ventas. Sin esta cifra el resultado desconcierta: pedir 1.709
  // "limpios" devuelve una facturación que parece enorme, porque entre medias hay 582 € de
  // cuota, IRPF, asesoría y gimnasio. Enseñando el bruto se ve de dónde sale la diferencia.
  const conEsas = resultadoMensual(modelo, r.ventasExactas);
  const tarjetas = [
    cardCon('acento', 'Ventas al mes', `<span class="num">${ventasTexto(r.ventas)}</span>`, 'con el IRPF real por tramos: esta es la respuesta'),
    card('Facturas al mes', `<span class="num">${euros(f, r.facturacionMes)}</span>`, 'lo que tiene que entrar por caja, IVA incluido'),
    card('Tu 40 % en bruto', `<span class="num">${euros(f, conEsas.miParte)}</span>`, 'lo que te tocaría ANTES de cuota, IRPF y tus gastos'),
    card('Facturas al año', `<span class="num">${euros(f, r.facturacionAnio)}</span>`, 'lo mismo, a doce meses'),
  ].join('');

  // De bruto a bolsillo, en una línea. Es la resta que él no estaba viendo.
  const merma = conEsas.miParte - objetivo;
  const puente = merma > 0
    ? `<p class="mc obj-puente">Ojo con la diferencia: tu 40 % en bruto serían
       <strong>${euros(f, conEsas.miParte)}</strong>, pero en el bolsillo te quedan
       <strong>${euros(f, objetivo)}</strong>. Los ${euros(f, merma)} de en medio son cuota
       de autónomo, IRPF, asesoría y gimnasio. Cuando compares con "mi 40 % de este mes",
       acuérdate de que esa cifra es la de arriba, no la de abajo.</p>`
    : '';

  // La comparativa con la retención plana: el otro número, pequeño y debajo.
  const rPlana = ventasParaLimpiar(modelo, objetivo);
  let plana = '';
  if (rPlana && Number.isFinite(rPlana.ventasExactas)) {
    plana = ventasTexto(rPlana.ventas) === ventasTexto(r.ventas)
      ? `<p class="mc obj-plana">Con la retención plana del ${pctTexto(modelo.irpf)} sale lo mismo: ${ventasTexto(rPlana.ventas)} ventas.</p>`
      : `<p class="mc obj-plana">Con la retención plana del ${pctTexto(modelo.irpf)} serían ${ventasTexto(rPlana.ventas)} ventas.</p>`;
  }

  // Contexto en vivo: las ventas que de verdad lleva este mes y su media de meses
  // cerrados, contadas de los datos. Y cuánto le falta (o si ya llega) con esa media.
  const n = ventasDelMes(c.datos, c.hoy);
  const vivo = n === null
    ? ''
    : `Este mes llevas <strong>${n}</strong> venta${n === 1 ? '' : 's'} · tu media de meses cerrados es <strong>${ventasTexto(ventasMedia)}</strong>. `;
  const faltan = r.ventasExactas - ventasMedia;
  const bolsilloHoy = bolsilloRealMes(modelo, ventasMedia);
  const estado = faltan <= 0.05
    ? `<span class="pos">Ya lo consigues:</span> con esa media te quedan ${euros(f, bolsilloHoy)} limpios de verdad.`
    : `Para el objetivo te faltan <strong>${ventasTexto(faltan)}</strong> sobre tu media.`;

  return `<div class="grid grid-4 obj-cards">${tarjetas}</div>
    ${puente}
    ${plana}
    <p class="obj-contexto">${vivo}${estado}</p>`;
}

// ---------------------------------------------------------------------------
// B) La cascada: de la facturación al bolsillo, fila a fila
// ---------------------------------------------------------------------------

// Una fila. `resta` pinta el importe en rojo (el CSS le añade el signo menos delante),
// así que a las restas se les pasa el valor absoluto.
function filaCasc(cpt, small, imp, facturacion, f, cls = '') {
  const pct = facturacion > 0 && Number.isFinite(imp)
    ? `${decTexto(Math.abs(imp) / facturacion * 100, 1)} %`
    : '—';
  return `<div class="casc-fila${cls ? ` ${cls}` : ''}">
    <div class="cpt">${cpt}${small ? `<small>${small}</small>` : ''}</div>
    <div class="imp num">${euros(f, imp)}</div>
    <div class="pct">${pct}</div>
  </div>`;
}

// La cascada sigue al objetivo: por defecto pinta el mes que haría falta para la meta
// (las ventas de la inversa real), y con los chips se puede volver al mes de hoy.
// En modo objetivo el IRPF de la fila es el REAL por tramos, no la retención plana:
// enseñar el desglose de la meta con un IRPF que no es el suyo volvería a mentir.
function pintarCascada(c) {
  const { modelo: m, ventasMedia, objetivo, f } = c;
  const rObj = ventasParaLimpiarReal(m, objetivo);
  const hayObjetivo = rObj !== null && Number.isFinite(rObj.ventasExactas);
  const modo = cascModo === 'hoy' || !hayObjetivo ? 'hoy' : 'objetivo';
  const v = modo === 'objetivo' ? rObj.ventasExactas : ventasMedia;

  const chips = `<div class="seg obj-casc-sel" id="obj-casc-modo">
    <button type="button" data-modo="hoy"${modo === 'hoy' ? ' class="on"' : ''}>Hoy (${ventasTexto(ventasMedia)} ventas)</button>
    <button type="button" data-modo="objetivo"${modo === 'objetivo' ? ' class="on"' : ''}${hayObjetivo ? '' : ' disabled'}>Mi objetivo (${hayObjetivo ? ventasTexto(rObj.ventas) : '—'} ventas)</button>
  </div>`;
  const pie = modo === 'objetivo'
    ? `<p class="mc obj-casc-pie">El mes de tu objetivo: ${ventasTexto(rObj.ventas)} ventas para quedarte ${eurosCortos(objetivo)} limpios. Cambia el objetivo arriba y esto se recalcula.</p>`
    : `<p class="mc obj-casc-pie">Tu mes de ahora, con la media real de ${ventasTexto(ventasMedia)} ventas.</p>`;

  const r = resultadoMensual(m, v);
  const fac = r.facturacion;

  // El IRPF de la fila y todo lo que cuelga de él dependen del modo.
  let filaIrpf, trasIrpf, bolsillo;
  if (modo === 'objetivo') {
    const irpfMes = irpfAnualReal(m, v).irpfReal / 12;
    trasIrpf = r.miParte - r.cuota - irpfMes;
    bolsillo = bolsilloRealMes(m, v);
    filaIrpf = filaCasc('IRPF real (por tramos)', `lo que de verdad toca a estas ventas, no el ${pctTexto(m.irpf)} plano`, Math.abs(irpfMes), fac, f, 'casc-resta');
  } else {
    trasIrpf = r.trasIrpf;
    bolsillo = r.bolsillo;
    filaIrpf = filaCasc(`IRPF retenido (${pctTexto(m.irpf)})`, 'lo que apartas cada mes, no la factura final', Math.abs(r.irpfPagado), fac, f, 'casc-resta');
  }

  const filas = [
    filaCasc('Facturación', `${ventasTexto(v)} ventas × ${euros(f, m.ticket)} con IVA`, r.facturacion, fac, f),
    filaCasc('IVA', `el ${pctTexto(m.iva)} va dentro del precio: nunca fue tuyo`, Math.abs(r.iva), fac, f, 'casc-resta'),
    filaCasc('Neto', 'lo que de verdad factura el negocio', r.netoNegocio, fac, f, 'casc-sub'),
    filaCasc('Comisiones de la pasarela', `${pctTexto(m.comisionPct)} sobre el neto`, Math.abs(r.comisiones), fac, f, 'casc-resta'),
    filaCasc('Gastos fijos del negocio', 'se pagan haya ventas o no', Math.abs(r.fijos), fac, f, 'casc-resta'),
    filaCasc('BENEFICIO DEL NEGOCIO', 'lo que queda para repartir', r.beneficio, fac, f, 'casc-hito'),
    filaCasc(`Tu ${pctTexto(m.miShare)}`, 'tu parte del beneficio', r.miParte, fac, f, 'casc-sub'),
    filaCasc('Cuota de autónomo', 'tarifa plana: cuando se acabe, sube', Math.abs(r.cuota), fac, f, 'casc-resta'),
    filaIrpf,
    filaCasc('Tras impuestos', 'antes de tus gastos personales', trasIrpf, fac, f, 'casc-sub'),
    filaCasc('Asesoría', 'deducible: se resta ANTES del IRPF', Math.abs(r.deducibles), fac, f, 'casc-resta'),
    filaCasc('Gimnasio', 'no deducible: se resta DESPUÉS', Math.abs(m.gastosPersonales), fac, f, 'casc-resta'),
    filaCasc('EN TU BOLSILLO', 'limpio, ya libre de todo', bolsillo, fac, f, `casc-final${bolsillo < 0 ? ' negativo' : ''}`),
  ].join('');

  const pm = puntoMuerto(m);
  const notaPm = pm === null
    ? 'Con estos números una venta no deja nada al negocio: no hay punto muerto. Revisa el ticket o la comisión.'
    : `Punto muerto: <strong>${decTexto(pm, 2)}</strong> ventas al mes. Por debajo de ahí el negocio pierde dinero.`;

  // El "cada venta de más" también respeta el IRPF del modo: en objetivo, el real.
  const extra = modo === 'objetivo'
    ? bolsilloRealMes(m, v + 1) - bolsillo
    : resultadoMensual(m, v + 1).bolsillo - r.bolsillo;
  const notaExtra = `Cada venta de más te deja <strong class="${extra >= 0 ? 'pos' : 'neg'}">${euros(f, extra)}</strong> limpios en el bolsillo.`;

  return `${chips}${pie}<div class="casc">${filas}</div>
    <div class="obj-notas">
      <div class="obj-nota">${notaPm}</div>
      <div class="obj-nota">${notaExtra}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// C) El tramo en vivo: la foto fiscal del año en curso
// ---------------------------------------------------------------------------
//
// LO QUE SE ARREGLÓ AQUÍ, porque es el error más caro que ha tenido este dashboard:
// este bloque calculaba los impuestos sobre `situacionFiscalDelAnio`, es decir, sobre su
// 40 % del beneficio del negocio. Esa NO es su renta. Él es un autónomo español que FACTURA
// a la empresa alemana de su socio: solo tributa por lo que factura, y factura cuando
// retira. Lo que no ha facturado sigue en la caja del negocio y no es renta suya todavía.
//
// A 28/07/2026 las dos lecturas se separaban 5.564,55 € y cambiaban tres respuestas:
//                                  devengado (mal)      facturado (bien)
//   de enero a hoy ...............  10.937,35 €          5.372,80 €
//   proyección anual de renta ....  19.012,59 €          9.339,63 €
//   base de IRPF .................  17.126,51 €          7.479,63 €
//   IRPF del año .................   2.433,36 €            366,63 €  (4,9 % efectivo)
//   tramo ........................  24 % (el segundo)    19 % (el PRIMERO)
//   tarifa plana .................  no puede prorrogar   SÍ puede prorrogar
//
// Ahora los impuestos salen de `rentaFiscalDelAnio` (los retiros) y el devengado se queda
// AL LADO, con su etiqueta, porque es la otra mitad de la historia: mide lo que le quedaría
// por facturar y es de lo que tiene que hablar con su asesoría (ver AVISO_DEVENGO).
// CERO inputs en este bloque: todo sale de los datos reales de Tradingverso.

// Una fila de la escala completa: "0 €" / "12.450 €" / "19 %", con el último tramo dicho
// como lo que es -sin techo- en vez de inventarle un número redondo que no existe en la ley.
//
// La marca de su base va en una fila PROPIA debajo de la suya, no en una cuarta columna: a
// 390 px la cuarta columna empujaba la tabla fuera del ancho y el dato que había que ver
// -el suyo- era justo el que se quedaba detrás del borde y había que arrastrar para leer.
function filaTramo(t, i, indiceActual, base, f) {
  const suyo = i === indiceActual;
  const hasta = Number.isFinite(t.hasta) ? eurosCortos(t.hasta) : 'sin techo';
  const fila = `<tr${suyo ? ' class="tuyo"' : ''}>
    <td class="num">${eurosCortos(t.desde)}</td>
    <td class="num">${hasta}</td>
    <td class="num escala-tipo">${t.tipo} %</td>
  </tr>`;
  if (!suyo) return fila;
  return `${fila}<tr class="tuyo-marca">
    <td colspan="3"><span class="escala-marca">Aquí cae tu base: ${euros(f, base)}</span></td>
  </tr>`;
}

// La escala ENTERA, siempre visible. La pidió él con estas palabras: quiere ver los tramos
// exactos porque no se fía de lo que le devuelve una búsqueda. Va como tabla y no solo como
// barra de colores porque los números tienen que poder leerse uno a uno.
function pintarEscalaIrpf(base, f) {
  const t = tramoDe(base);
  const filas = TRAMOS_IRPF_TEXTO.map((x, i) => filaTramo(x, i, t.indice, base, f)).join('');

  const siguiente = TRAMOS_IRPF_TEXTO[t.indice + 1] || null;
  const pie = siguiente && t.faltaParaElSiguiente !== null
    ? `Estás en el tramo del ${t.tipo} %. Te faltan ${euros(f, t.faltaParaElSiguiente)} para el del ${siguiente.tipo} %.`
    : `Estás en el tramo del ${t.tipo} %, el más alto de la escala. No hay siguiente escalón.`;

  return `<div class="escala">
    <div class="escala-tit">La escala completa del IRPF</div>
    <div class="tabla-wrap obj-mini">
      <table class="escala-tabla">
        <thead><tr>
          <th class="num">Desde</th>
          <th class="num">Hasta</th>
          <th class="num">Tipo</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
    <p class="escala-pie"><strong>${pie}</strong></p>
    <p class="tramo-pie">Cada tramo grava SOLO lo que cae dentro de él: pasar al siguiente no encarece lo de abajo. Escala general estatal + autonómica agregada; cada comunidad cambia su mitad, así que esto sirve para decidir, no para liquidar.</p>
  </div>`;
}

function pintarIrpf(c) {
  const { modelo: m, f, card } = c;
  const r = rentaFiscalDelAnio(c.datos, m, c.hoy);
  const d = c.datos || {};
  const hayDatos = ((d.retiros || []).length > 0 || (d.ventas || []).length > 0
    || (d.gastosNegocio || []).length > 0) && r.mesesTranscurridos >= 1;
  if (!hayDatos) {
    return '<p class="obj-nota">Todavía no hay datos del año en curso: en cuanto lleguen retiros, ventas o gastos de Tradingverso, este panel se calcula solo.</p>';
  }

  const base = Math.max(0, r.baseIrpf);
  const t = tramoDe(base);

  const cabeza = `<div class="tramo-head">
      <span class="l">Con lo que has FACTURADO este año, proyectado a diciembre</span>
      <div class="v">Vas por el tramo ${t.indice + 1} (${t.tipo} %)</div>
    </div>`;

  // Las DOS cifras, juntas y sin ambigüedad posible sobre cuál manda. La primera lleva la
  // clase `manda` porque es la única por la que tributa; las otras dos existen para que no
  // parezca que la app se ha dejado dinero fuera.
  const mesHoy = MESES_LARGO[r.mesesTranscurridos - 1] || '';
  const dosCifras = `<div class="renta-tri">
    <div class="manda">
      <span class="l">Has facturado este año</span>
      <span class="v num">${euros(f, r.retiradoYtd)}</span>
      <span class="mc">POR ESTO TRIBUTAS · tu ${pctTexto(m.miShare)} de los repartos de enero a ${mesHoy}</span>
    </div>
    <div>
      <span class="l">Te correspondería (${pctTexto(m.miShare)})</span>
      <span class="v num">${euros(f, r.devengadoYtd)}</span>
      <span class="mc">devengado: tu parte del beneficio del negocio, la hayas facturado o no</span>
    </div>
    <div>
      <span class="l">Sin facturar todavía</span>
      <span class="v num">${euros(f, r.sinFacturar)}</span>
      <span class="mc">sigue en la caja del negocio: no es renta tuya hasta que la factures</span>
    </div>
  </div>
  <p class="mc obj-explica">${AVISO_DEVENGO}</p>`;

  const proyeccion = `<div class="tramo-datos">
    <div>
      <span class="l">Facturación proyectada a diciembre</span>
      <span class="v num">${euros(f, r.retiradoProyectado)}</span>
      <span class="mc">a este ritmo de retiros, si sigue igual hasta fin de año</span>
    </div>
    <div>
      <span class="l">Base de IRPF proyectada</span>
      <span class="v num">${euros(f, r.baseIrpf)}</span>
      <span class="mc">lo facturado menos cuota de autónomo (${euros(f, m.cuotaAutonomo)}) y asesoría (${euros(f, m.deducibles)}) de los doce meses</span>
    </div>
  </div>`;

  const escala = pintarEscalaIrpf(base, f);

  const duo = `<div class="obj-duo">
    <div class="obj-duo-col">
      <div class="l">Retendrás este año</div>
      <div class="v num">${euros(f, r.retenidoProyectado)}</div>
      <span class="mc">el ${pctTexto(m.irpf)} de tu base (lo facturado tras cuota y asesoría), proyectado a diciembre</span>
    </div>
    <div class="obj-duo-vs">contra</div>
    <div class="obj-duo-col">
      <div class="l">De verdad te tocará</div>
      <div class="v num">${euros(f, r.irpfReal)}</div>
      <span class="mc">IRPF real por tramos sobre la base proyectada</span>
    </div>
  </div>`;

  let veredicto;
  if (Math.abs(r.diferencia) < 1) {
    veredicto = `<div class="obj-veredicto">Vas justo: lo que retienes es casi exactamente lo que pagarás.
      <span class="mc">Diferencia de ${euros(f, Math.abs(r.diferencia))} al año.</span></div>`;
  } else if (r.diferencia > 0) {
    veredicto = `<div class="obj-veredicto ok">Te devolverán ${euros(f, r.diferencia)}
      <span class="mc">Retienes de más. Es tuyo, pero no lo verás hasta la declaración.</span></div>`;
  } else {
    veredicto = `<div class="obj-veredicto mal">Aparta ${euros(f, -r.diferencia)} — no es tuyo
      <span class="mc">Con tu retención no llega: esa diferencia te la reclamarán en la declaración.</span></div>`;
  }

  const sinBase = r.baseIrpf <= 0
    ? '<p class="obj-nota">Con lo que llevas facturado este año no llegas a base imponible: de IRPF, cero. La cuota de autónomo y la asesoría de los doce meses ya se te comen lo facturado.</p>'
    : '';

  // El techo del SMI se mide sobre el rendimiento, que es lo FACTURADO. Con el devengado la
  // app decía que la prórroga ya no le cabía teniendo 7.754 € de margen por debajo.
  const prorroga = r.puedeProrrogarTarifaPlana === null
    ? ''
    : (r.puedeProrrogarTarifaPlana
      ? `<p class="obj-nota">Tarifa plana: al ritmo de este año facturarás ${euros(f, r.retiradoProyectado)}, por debajo de los ${euros(f, SMI_ANUAL)} del SMI 2026. <strong>Puedes prorrogar el segundo año</strong>, con ${euros(f, SMI_ANUAL - r.retiradoProyectado)} de margen. Pídela antes de que se cumplan los 12 primeros meses del alta.</p>`
      : `<p class="obj-nota">Tarifa plana: al ritmo de este año facturarás ${euros(f, r.retiradoProyectado)}, por encima de los ${euros(f, SMI_ANUAL)} del SMI 2026. La prórroga del segundo año no te la van a conceder: cuenta con la cuota de verdad.</p>`);

  const tarjetas = `<div class="grid grid-3">
    ${card('Tipo medio real', `<span class="num pos">${pctTexto(r.tipoMedio)}</span>`, 'lo que pagas de verdad sobre el total')}
    ${card('Tipo marginal', `<span class="num">${pctTexto(r.tipoMarginal)}</span>`, 'lo que pagarías por el siguiente euro')}
    ${card('Lo que te apartas', `<span class="num">${pctTexto(m.irpf)}</span>`, 'de tu base, mes a mes')}
  </div>
  <p class="mc obj-explica">${EXPLICACION_TIPOS}</p>`;

  return cabeza + dosCifras + proyeccion + escala + duo + veredicto + sinBase + prorroga + tarjetas;
}

// ---------------------------------------------------------------------------
// D) España o Dubái
// ---------------------------------------------------------------------------

function pintarDubaiRes(c) {
  const { modelo: m, dubai: d, ventasMedia: v, f } = c;
  const comp = comparativaFiscal(m, v, d);
  const cruce = ventasParaDubai(m, d);
  const ganaDubai = comp.compensa;

  const duo = `<div class="obj-duo">
    <div class="obj-duo-col${ganaDubai ? '' : ' gana'}">
      <div class="l">España${ganaDubai ? '' : '<span class="fila-tag meta">GANA</span>'}</div>
      <div class="v num">${euros(f, comp.espana.queda)}</div>
      <span class="mc">te queda al año · pagas ${euros(f, comp.espana.paga)} (IRPF ${euros(f, comp.espana.irpf)} + cuota ${euros(f, comp.espana.cuota)})</span>
    </div>
    <div class="obj-duo-vs">contra</div>
    <div class="obj-duo-col${ganaDubai ? ' gana' : ''}">
      <div class="l">Dubái${ganaDubai ? '<span class="fila-tag meta">GANA</span>' : ''}</div>
      <div class="v num">${euros(f, comp.dubai.queda)}</div>
      <span class="mc">te queda al año · pagas ${euros(f, comp.dubai.paga)} (estructura ${euros(f, comp.dubai.coste)} + sociedades ${euros(f, comp.dubai.impuesto)})</span>
    </div>
  </div>`;

  const veredicto = comp.diferencia >= 0
    ? `<div class="obj-veredicto ok">Hoy te ahorraría ${euros(f, comp.diferencia)} al año
        <span class="mc">Con tus ${ventasTexto(v)} ventas al mes, mudarte sale a favor.</span></div>`
    : `<div class="obj-veredicto mal">Hoy te costaría ${euros(f, -comp.diferencia)} al año
        <span class="mc">Con tus ${ventasTexto(v)} ventas al mes, mudarte sale a perder.</span></div>`;

  let cruceHtml;
  if (cruce === null) {
    cruceHtml = `<div class="obj-cruce"><span class="l">El punto de cruce</span>
      <span class="v">Con estos números Dubái no compensa nunca</span>
      <span class="mc">La estructura cuesta más de lo que ahorra, vendas lo que vendas.</span></div>`;
  } else if (cruce <= 0) {
    cruceHtml = `<div class="obj-cruce"><span class="l">El punto de cruce</span>
      <span class="v">Dubái compensa desde la primera venta</span>
      <span class="mc">Sin coste de estructura no hay umbral que cruzar.</span></div>`;
  } else {
    cruceHtml = `<div class="obj-cruce"><span class="l">El punto de cruce</span>
      <span class="v">Dubái compensa a partir de <strong>${ventasTexto(cruce)}</strong> ventas al mes</span>
      <span class="mc">Tú estás en ${ventasTexto(v)}. Por debajo del cruce pierdes dinero mudándote; por encima, ganas.</span></div>`;
  }

  const { lista: escenarios, iHoy } = conFilaDeHoy(VENTAS_DUBAI, v);
  const filas = escenarios.map((n, i) => {
    const x = comparativaFiscal(m, n, d);
    const hoy = i === iHoy;
    const clases = [hoy ? 'hoy' : '', x.compensa ? 'meta' : ''].filter(Boolean).join(' ');
    return `<tr${clases ? ` class="${clases}"` : ''}>
      <td class="num">${ventasTexto(n)}${hoy ? '<span class="fila-tag ahora">AHORA</span>' : ''}</td>
      <td class="num">${euros(f, x.espana.queda)}</td>
      <td class="num">${euros(f, x.dubai.queda)}</td>
      <td class="num ${x.diferencia >= 0 ? 'pos' : 'neg'}">${euros(f, x.diferencia)}</td>
    </tr>`;
  }).join('');

  const tabla = `<div class="tabla-wrap obj-mini">
    <table>
      <thead><tr>
        <th class="num">Ventas/mes</th>
        <th class="num">Queda en España</th>
        <th class="num">Queda en Dubái</th>
        <th class="num">Diferencia</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>`;

  return duo + veredicto + cruceHtml + tabla;
}

// Los ajustes de Dubái van fuera de los resultados: son inputs y no se repintan al teclear.
function pintarDubaiForm(c) {
  const d = c.dubai;
  const filas = CAMPOS_DUBAI.map(([k, etiqueta, paso]) => `<div class="pat-fila">
    <label for="obj-d-${k}">${etiqueta}</label>
    <input id="obj-d-${k}" class="pat-imp" type="number" inputmode="decimal" step="${paso}" min="0"
      data-obj="dubai" data-k="${k}" value="${esc(paraInput(d[k]))}" />
  </div>`).join('');

  return `<div class="obj-ajustes obj-ajustes-dubai">
      <div class="obj-ajustes-tit">Ajustes de Dubái</div>
      ${filas}
    </div>
    ${avisoAmbar(AVISO_DUBAI)}`;
}

// ---------------------------------------------------------------------------
// E) La escalera
// ---------------------------------------------------------------------------

function pintarEscalera(c) {
  const { modelo: m, ventasMedia: v, objetivo, f } = c;
  const filas = escalera(m, ESCALONES);
  const iHoy = masCercano(ESCALONES, v);
  // La meta es el primer escalón que deja lo pedido en el bolsillo DE VERDAD, con el IRPF
  // por tramos. Medirla contra el bolsillo del 20 % señalaba escalones que no llegan:
  // con 6.000 € de meta marcaba 20 ventas cuando de verdad hacen falta 30.
  const iMeta = filas.findIndex((r) => bolsilloRealMes(m, r.ventas) >= objetivo);
  // AHORA sigue siendo la media de meses cerrados; si las ventas que lleva ESTE mes
  // caen en otra fila, se marca aparte para que vea el mes en curso sin perder la media.
  const nMes = ventasDelMes(c.datos, c.hoy);
  const iMes = nMes === null ? -1 : masCercano(ESCALONES, nMes);

  const cuerpo = filas.map((r, i) => {
    const clases = [i === iHoy ? 'hoy' : '', i === iMeta ? 'meta' : ''].filter(Boolean).join(' ');
    const tags = `${i === iHoy ? '<span class="fila-tag ahora">AHORA</span>' : ''}${i === iMeta ? '<span class="fila-tag meta">TU META</span>' : ''}${i === iMes && i !== iHoy ? '<span class="fila-tag mes">ESTE MES</span>' : ''}`;
    // Lo que deja UNA venta más en este escalón. No vale r.porVentaAdicional: ese es el
    // salto contra el escalón ANTERIOR y ESCALONES no va de uno en uno, así que en las
    // filas de arriba multiplicaba la cifra por el tamaño del salto (hasta 10x).
    const marginal = r.ventas <= 0
      ? null
      : resultadoMensual(m, r.ventas).bolsillo - resultadoMensual(m, r.ventas - 1).bolsillo;
    const real = bolsilloRealMes(m, r.ventas);
    return `<tr${clases ? ` class="${clases}"` : ''}>
      <td class="num">${ventasTexto(r.ventas)}${tags}</td>
      <td class="num">${euros(f, r.facturacion)}</td>
      <td class="num">${euros(f, r.beneficio)}</td>
      <td class="num">${euros(f, r.miParte)}</td>
      <td class="num col-irpf">${euros(f, r.irpfPagado)}</td>
      <td class="num ${r.bolsillo >= 0 ? 'pos' : 'neg'}">${euros(f, r.bolsillo)}</td>
      <td class="num col-real ${real >= 0 ? 'pos' : 'neg'}">${euros(f, real)}</td>
      <td class="num col-extra">${marginal === null ? '—' : euros(f, marginal)}</td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th class="num">Ventas</th>
      <th class="num">Facturas</th>
      <th class="num">Beneficio</th>
      <th class="num">Tu ${pctTexto(m.miShare)}</th>
      <th class="num col-irpf">IRPF retenido (${pctTexto(m.irpf)})</th>
      <th class="num">En tu bolsillo<small>con el ${pctTexto(m.irpf)} retenido</small></th>
      <th class="num col-real">En tu bolsillo de verdad<small>con el IRPF real por tramos</small></th>
      <th class="num col-extra">Cada venta extra</th>
    </tr></thead>
    <tbody>${cuerpo}</tbody>
  </table>`;
}

// ---------------------------------------------------------------------------
// F) Palancas
// ---------------------------------------------------------------------------

// La palanca del IRPF a 0 es la única que no se puede leer sola: quitar el IRPF es
// mudarse, y mudarse cuesta ~10.000 € al año que esa palanca no descuenta. Encima aplica
// el 20 % RETENIDO, no el IRPF real por tramos. Resultado: por debajo del punto de cruce
// pintaba en verde "ganas" mientras el bloque de Dubái, tres centímetros más arriba,
// decía "pierdes". Aquí se corrige el rótulo y se pega el número bueno al lado.
const PALANCA_IRPF = 'Dejar de pagar IRPF';

function palancaDubai(p, c) {
  const { modelo: m, ventasMedia: v, f } = c;
  if (p.nombre !== PALANCA_IRPF) {
    return { detalle: p.detalle, nota: '', baja: p.delta < 0 };
  }
  const comp = comparativaFiscal(m, v, c.dubai);
  const cruce = ventasParaDubai(m, c.dubai);
  const desde = cruce === null || cruce <= 0 ? '' : ` El cruce está en ${ventasTexto(cruce)} ventas al mes.`;
  const nota = comp.diferencia >= 0
    ? `Con la estructura de Dubái pagada, hoy son <strong>+${euros(f, comp.diferencia)}</strong> al año, no ${euros(f, p.delta * 12)}.${desde}`
    : `Esto NO es gratis: mudarse cuesta la estructura. Con ella pagada, hoy son <strong>${euros(f, comp.diferencia)}</strong> al año, no ${euros(f, p.delta * 12)}.${desde}`;
  return {
    detalle: `Del ${pctTexto(m.irpf)} retenido al 0 %`,
    nota: `<div class="palanca-nota${comp.diferencia < 0 ? ' mal' : ''}">${nota}</div>`,
    // El delta se pinta en rojo cuando mudarse sale a perder, aunque el número sea positivo.
    baja: p.delta < 0 || comp.diferencia < 0,
  };
}

function pintarPalancas(c) {
  const { f } = c;
  return palancas(c.modelo, c.ventasMedia).map((p, i) => {
    const x = palancaDubai(p, c);
    return `<div class="palanca${i === 0 ? ' acento top' : ''}">
      <div class="palanca-nombre">${esc(p.nombre)}</div>
      <div class="palanca-detalle">${esc(x.detalle)}</div>
      <div class="palanca-valor">${euros(f, p.bolsilloNuevo)}</div>
      <div class="palanca-delta ${x.baja ? 'baja' : 'sube'}">${p.delta >= 0 ? '+' : ''}${euros(f, p.delta)} al mes</div>
      ${x.nota}
    </div>`;
  }).join('');
}

function pintarPalancasNota(c) {
  const { modelo: m, ventasMedia: v, f } = c;
  const lista = palancas(m, v);
  if (!lista.length) return '';
  const primera = lista[0];
  const segunda = lista[1];
  if (primera.delta <= 0) {
    return 'Ninguna de estas palancas mejora tu bolsillo con los números de ahora.';
  }
  // Si la del IRPF queda la primera y mudarse todavía sale a perder, no se puede anunciar
  // como "lo que más paga hoy": ese número no lleva descontada la estructura de Dubái.
  if (primera.nombre === PALANCA_IRPF && comparativaFiscal(m, v, c.dubai).diferencia < 0) {
    const segundaTxt = segunda
      ? ` Lo que de verdad más paga hoy: <strong>${esc(segunda.nombre.toLowerCase())}</strong>, ${euros(f, segunda.delta)} más al mes.`
      : '';
    return `El IRPF sale arriba, pero quitarlo es mudarse y la estructura no está descontada ahí: mira el bloque "España o Dubái".${segundaTxt}`;
  }
  const contra = segunda
    ? ` Le saca ${euros(f, primera.delta - segunda.delta)} a la siguiente (${esc(segunda.nombre.toLowerCase())}).`
    : '';
  return `Lo que más paga hoy: <strong>${esc(primera.nombre.toLowerCase())}</strong>, ${euros(f, primera.delta)} más al mes.${contra}`;
}

// ---------------------------------------------------------------------------
// G) Ajustes — solo si algo cambia
// ---------------------------------------------------------------------------
// El usuario no tiene que rellenar nada aquí: todo lo de arriba ya se deriva de sus
// datos. Cada campo dice qué es y de dónde ha salido su valor actual, para que quede
// claro que esto es un corrector, no un formulario.

// Las DOS cifras de los gastos fijos, una al lado de la otra: la media de la ventana (la
// que de verdad se usa en todos los cálculos) y lo que lleva el mes en curso suelto.
//
// POR QUÉ HACEN FALTA LAS DOS. Los gastos del negocio no son planos: en 2026 fueron 293,86
// (abril) · 368,30 (mayo) · 675,66 (junio) · 934,17 (julio). Cualquier media de tres meses
// va por detrás de la realidad cuando el gasto sube, y con una sola cifra en pantalla no hay
// forma de saber si vas por detrás o por delante. Con las dos, el desfase se ve solo.
function cifrasFijos(c, f) {
  const fu = c.fuente || {};
  const partes = [];
  if (Number.isFinite(Number(fu.fijosMedia))) partes.push(`media 3 meses: ${euros(f, Number(fu.fijosMedia))}`);
  if (Number.isFinite(Number(fu.fijosMesEnCurso))) partes.push(`mes en curso: ${euros(f, Number(fu.fijosMesEnCurso))}`);
  return partes.length ? ` ${partes.join(' · ')}.` : '';
}

// De dónde salen los fijos que ve en el campo: medidos, puestos a mano o de fábrica.
function descFijos(c) {
  const fu = c.fuente || {};
  const f = typeof c.f === 'function' ? c.f : formatoEuros;
  const cifras = cifrasFijos(c, f);
  if (fu.fijosNegocio === 'manual') {
    return `Los escribiste tú a mano; "Volver a los valores por defecto" recupera la media medida de tus gastos reales.${cifras}`;
  }
  if (fu.fijosNegocio === 'datos') {
    const rango = rangoMesesTexto(fu.meses);
    const donde = rango
      ? `Medido de tus gastos reales de ${rango}, sin contar comisiones.`
      : 'Medido de tus gastos reales, sin contar comisiones.';
    // El mes en curso entra en la media en cuanto pasa de la mitad: esconderlo hacía que
    // esta línea dijera 320,94 € con el recibo de 934,17 € de ese mismo mes encima.
    const regla = fu.incluyeMesEnCurso
      ? ' El mes en curso ya cuenta: lleva más de 15 días.'
      : '';
    return `${donde}${regla}${cifras}`;
  }
  return `Valor por defecto: todavía no han llegado gastos reales que medir.${cifras}`;
}

function pintarAjustes(c) {
  const m = c.modelo;
  // Ojo con el prefijo: los ids van con "obj-m-" y no con "obj-", porque "obj-irpf"
  // ya es el div del bloque de IRPF y dos ids iguales romperían getElementById.
  const filas = CAMPOS_MODELO.map(([k, etiqueta, paso, desc]) => {
    const texto = k === 'fijosNegocio' ? descFijos(c) : desc;
    return `<div class="obj-ajuste">
      <label for="obj-m-${k}">${etiqueta}</label>
      <input id="obj-m-${k}" type="number" inputmode="decimal" step="${paso}"
        data-obj="modelo" data-k="${k}" value="${esc(paraInput(m[k]))}" />
      <span class="obj-ajuste-desc">${texto}</span>
    </div>`;
  }).join('');

  const fuente = c.fuente && c.fuente.texto
    ? `<span class="obj-fuente">${esc(c.fuente.texto)}</span>`
    : '';

  return `<p class="obj-ajustes-intro">Todo lo de arriba se calcula solo con tus datos reales.
      Esto es para corregirme si algo cambia (subes el precio, se acaba la tarifa plana…).</p>
    <div class="obj-ajustes">
      ${filas}
      <div class="obj-ajustes-pie">
        <button type="button" class="btn btn-ghost" id="obj-reset">Volver a los valores por defecto</button>
        ${fuente}
      </div>
    </div>
    ${avisoAmbar(AVISO_MODELO)}`;
}

// ---------------------------------------------------------------------------
// Render público
// ---------------------------------------------------------------------------

// Pinta SOLO lo que se calcula. Ningún input vive aquí dentro: por eso se puede llamar
// en cada tecla sin que el usuario pierda el foco (ver bindObjetivo).
function pintarResultados(c) {
  set('obj-inversa-res', pintarInversaRes(c));
  set('obj-cascada', pintarCascada(c));
  set('obj-irpf', pintarIrpf(c));
  set('obj-dubai-res', pintarDubaiRes(c));
  set('obj-escalera', pintarEscalera(c));
  set('obj-palancas', pintarPalancas(c));
  set('obj-palancas-nota', pintarPalancasNota(c));
}

// ctx = { modelo, dubai, ventasMedia, objetivo, fuente, f, card }
export function renderObjetivo(ctx) {
  const c = prepararCtx(ctx);
  ctxUltimo = c;

  // Zonas con inputs: se pintan enteras solo aquí, nunca al teclear.
  set('obj-inversa', pintarInversaForm(c));
  set('obj-dubai', `<div id="obj-dubai-res"></div>${pintarDubaiForm(c)}`);
  set('obj-ajustes', pintarAjustes(c));

  pintarResultados(c);
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
// Mismo patrón que bindPatrimonio, por el mismo motivo: los bloques se reescriben
// enteros en cada repintado, así que un listener colgado de un input concreto moriría
// con él. Todo va por delegación desde #v-objetivo, que no se destruye nunca.
//
// El reparto es el de siempre:
//   · 'input' (cada tecla)  -> guardar y repintar SOLO los resultados. Los inputs viven
//     en #obj-inversa (el formulario), #obj-dubai (los ajustes de Dubái) y #obj-ajustes,
//     y esas tres zonas no se tocan aquí: reescribir su HTML destruiría el input que el
//     usuario está usando y le robaría el foco a mitad de palabra.
//   · 'change' (al salir del campo) -> repintado completo. Ya no hay nadie escribiendo.
//
// handlers = { getModelo, setModelo, getDubai, setDubai, getObjetivo, setObjetivo, rerender }
export function bindObjetivo(handlers) {
  const raiz = document.getElementById('v-objetivo');
  if (!raiz || raiz.dataset.objBind === '1') return;
  raiz.dataset.objBind = '1';

  const h = handlers || {};
  const llamar = (fn, v) => { if (typeof fn === 'function') fn(v); };
  const leer = (fn, porDefecto) => (typeof fn === 'function' ? fn() : porDefecto);

  // El ctx de trabajo: lo último que se pintó, pero con el estado vivo de los handlers.
  function ctxVivo() {
    const base = ctxUltimo || {};
    return prepararCtx({
      ...base,
      modelo: leer(h.getModelo, base.modelo),
      dubai: leer(h.getDubai, base.dubai),
      objetivo: leer(h.getObjetivo, base.objetivo),
    });
  }

  // Escribe el valor de un input en el estado. Un campo vacío o con basura vuelve a su
  // valor por defecto (lo hace normalizarModelo / normalizarDubai): nunca un NaN.
  function aplicar(el) {
    if (el.id === 'obj-meta') {
      llamar(h.setObjetivo, Math.max(0, parseFloat(el.value) || 0));
      return true;
    }
    const k = el.dataset.k;
    if (!k) return false;
    const v = parseFloat(el.value);
    const valor = Number.isFinite(v) ? v : '';
    if (el.dataset.obj === 'dubai') {
      llamar(h.setDubai, normalizarDubai({ ...normalizarDubai(leer(h.getDubai, null)), [k]: valor }));
    } else {
      llamar(h.setModelo, normalizarModelo({ ...normalizarModelo(leer(h.getModelo, null)), [k]: valor }));
    }
    return true;
  }

  // Los atajos de meta se marcan con classList, sin reescribir HTML: así el botón
  // se ilumina mientras se teclea en el input de al lado sin robarle el foco.
  function marcarRapidos(objetivo) {
    raiz.querySelectorAll('.obj-rapido[data-meta]').forEach((b) => {
      b.classList.toggle('on', Math.abs(parseFloat(b.dataset.meta) - objetivo) < 0.005);
    });
  }

  const repintarTodo = () => {
    if (typeof h.rerender === 'function') h.rerender();
    else renderObjetivo(ctxVivo());
  };

  // Salir de un campo puede ser justo el clic en un botón: primero llega el blur (y con
  // él el 'change') y solo después el clic. Si repintáramos en ese mismo instante, el
  // botón desaparecería por el camino y el primer toque se perdería. Se repinta entero,
  // pero en el tick siguiente, con el clic ya servido.
  let pendiente = 0;
  function repintarTodoDiferido() {
    if (pendiente) return;
    pendiente = setTimeout(() => { pendiente = 0; repintarTodo(); }, 0);
  }

  raiz.addEventListener('input', (e) => {
    const el = e.target.closest('#obj-meta, input[data-k]');
    if (!el || !aplicar(el)) return;
    const c = ctxVivo();
    ctxUltimo = c;
    marcarRapidos(c.objetivo);
    pintarResultados(c);
  });

  raiz.addEventListener('change', (e) => {
    const el = e.target.closest('#obj-meta, input[data-k]');
    if (!el || !aplicar(el)) return;
    repintarTodoDiferido();
  });

  raiz.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    // Los chips de la cascada: solo cambian qué mes se pinta, no tocan ningún estado
    // guardado, así que basta con repintar los resultados (los chips viven ahí dentro).
    if (btn.dataset.modo && btn.closest('#obj-casc-modo')) {
      cascModo = btn.dataset.modo === 'hoy' ? 'hoy' : 'objetivo';
      const c = ctxVivo();
      ctxUltimo = c;
      pintarResultados(c);
    } else if (btn.dataset.meta !== undefined) {
      llamar(h.setObjetivo, Math.max(0, parseFloat(btn.dataset.meta) || 0));
      repintarTodo();
    } else if (btn.id === 'obj-reset') {
      llamar(h.setModelo, { ...MODELO_DEFAULT });
      repintarTodo();
    }
  });
}
