// Vista "Cuánto facturar": de "quiero quedarme limpio con X" a cuántas ventas hacen falta,
// de dónde sale cada euro, qué se retiene contra lo que de verdad se paga, y España contra Dubái.
// Aquí solo hay DOM y strings; toda la aritmética vive en objetivo.js / calculos.js.
//
// Dos ideas que la pantalla tiene que dejar cerradas, porque son las que dan ansiedad:
//   1) el 20 % es lo que se RETIENE cada mes, no lo que se acaba pagando. El IRPF real va por
//      tramos: hoy Hacienda devuelve, escalando hará falta apartar. Siempre los dos números juntos.
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
const VENTAS_CURVA_IRPF = [3, 10, 20, 30];
const VENTAS_DUBAI = [3, 5, 7.5, 10, 20, 40];

// Campos editables del modelo: clave, etiqueta con unidad y paso del input.
const CAMPOS_MODELO = [
  ['ticket', 'Ticket con IVA (€)', 1],
  ['iva', 'IVA (%)', 1],
  ['comisionPct', 'Comisión de la pasarela (%)', 0.01],
  ['fijosNegocio', 'Gastos fijos del negocio (€/mes)', 1],
  ['miShare', 'Mi parte del beneficio (%)', 1],
  ['cuotaAutonomo', 'Cuota de autónomo (€/mes)', 1],
  ['deducibles', 'Asesoría, deducible (€/mes)', 1],
  ['gastosPersonales', 'Gastos personales, NO deducibles (€/mes)', 1],
  ['irpf', 'IRPF que te retienes (%)', 1],
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

// Lo que de verdad queda al mes con el IRPF por tramos, no con el 20 % que se retiene.
function bolsilloRealMes(m, ventas) {
  return irpfAnualReal(m, ventas).bolsilloAnualReal / 12;
}

// Las ventas que hacen falta para quedarse limpio con `objetivo` DESPUÉS del IRPF real.
// No se despeja como ventasParaLimpiar porque la escala va por tramos: se busca por
// bisección, que vale porque el bolsillo real crece de forma monótona con las ventas.
// null si no se llega ni vendiendo mucho.
function ventasParaLimpiarReal(m, objetivo) {
  const MAX = 1000;
  if (!(bolsilloRealMes(m, MAX) >= objetivo)) return null;
  if (bolsilloRealMes(m, 0) >= objetivo) return 0;
  let lo = 0;
  let hi = MAX;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bolsilloRealMes(m, mid) >= objetivo) hi = mid; else lo = mid;
  }
  return hi;
}

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
    <div class="obj-meta-pie mc">euros al mes, limpios con el ${pctTexto(c.modelo.irpf)} que te retienes (justo debajo, con el IRPF real)</div>
    <div class="obj-rapidos">${rapidos}</div>
  </div>
  <div id="obj-inversa-res"></div>`;
}

function pintarInversaRes(c) {
  const { modelo, ventasMedia, objetivo, f } = c;
  const r = ventasParaLimpiar(modelo, objetivo);

  // Sin solución: se dice por qué y se corta. Nunca un NaN ni un Infinity en pantalla.
  if (!r || !Number.isFinite(r.ventasExactas)) {
    return `<div class="obj-resultado imposible">
      <div class="l">Sin salida con este modelo</div>
      <div class="v">${IMPOSIBLE}</div>
      <span class="mc">Revisa el ticket o los fijos.</span>
    </div>`;
  }

  const card = c.card;
  const tarjetas = [
    cardCon('acento', 'Ventas al mes', `<span class="num">${ventasTexto(r.ventas)}</span>`, 'esta es la respuesta'),
    card('Facturas al mes', `<span class="num">${euros(f, r.facturacionMes)}</span>`, 'lo que tiene que entrar por caja, IVA incluido'),
    card('Facturas al año', `<span class="num">${euros(f, r.facturacionAnio)}</span>`, 'lo mismo, a doce meses'),
  ].join('');

  const faltan = r.ventasExactas - ventasMedia;
  const bolsilloHoy = resultadoMensual(modelo, ventasMedia).bolsillo;
  const contexto = faltan <= 0.05
    ? `<span class="pos">Ya lo consigues.</span> Con tus ${ventasTexto(ventasMedia)} ventas al mes te quedan ${euros(f, bolsilloHoy)} limpios.`
    : `Ahora haces ${ventasTexto(ventasMedia)} ventas al mes. Te faltan <strong>${ventasTexto(faltan)}</strong>.`;

  // El número de arriba sale del 20 % que se RETIENE, no del IRPF real por tramos. Es
  // justo la confusión que esta pantalla existe para deshacer, así que su pareja real va
  // pegada debajo y no en otro bloque: nunca uno sin el otro.
  return `<div class="grid grid-3 obj-cards">${tarjetas}</div>
    ${notaIrpfRealMeta(c, r)}
    <p class="obj-contexto">${contexto}</p>`;
}

// La respuesta de arriba, recalculada con el IRPF real de esas mismas ventas.
function notaIrpfRealMeta(c, r) {
  const { modelo, objetivo, f } = c;
  const a = irpfAnualReal(modelo, r.ventasExactas);
  const real = a.bolsilloAnualReal / 12;
  if (!Number.isFinite(real)) return '';

  const falta = objetivo - real;
  const nReal = ventasParaLimpiarReal(modelo, objetivo);
  // Si al redondear salen las mismas ventas, repetirlas suena a error de la pantalla.
  const mismasVentas = nReal !== null && ventasTexto(nReal) === ventasTexto(r.ventas);
  let cola = '';
  if (nReal === null) {
    cola = ` Con el IRPF real, a ${eurosCortos(objetivo)} limpios no se llega con este modelo.`;
  } else if (!mismasVentas) {
    cola = ` Para ${euros(f, objetivo)} limpios DE VERDAD hacen falta <strong>${ventasTexto(nReal)}</strong> ventas al mes.`;
  }

  // Ámbar solo cuando el 20 % se queda corto: ahí el número de arriba promete de más.
  const clase = a.diferencia < 0 ? ' obj-aviso-real' : '';
  const cabeza = `Con esas ${ventasTexto(r.ventas)} ventas te retienes el ${pctTexto(modelo.irpf)}`;

  if (Math.abs(falta) < 1) {
    return `<p class="obj-real${clase}">${cabeza} y el IRPF real por tramos son ${euros(f, a.irpfReal)} al año:
      sale casi clavado, te quedarían <strong>${euros(f, real)}</strong> al mes.</p>`;
  }
  // El 20 % retiene de más: la respuesta de arriba se queda corta a tu favor. Este es el
  // lado tranquilizador y hay que decirlo igual de claro que el otro.
  if (falta < 0) {
    return `<p class="obj-real${clase}">${cabeza}, pero el IRPF real por tramos es más bajo: ${euros(f, a.irpfReal)} al año.
      En el bolsillo te quedarían <strong>${euros(f, real)}</strong> al mes, más de los ${euros(f, objetivo)} que pediste:
      lo que retienes de más te lo devuelven.</p>`;
  }
  return `<p class="obj-real${clase}">${cabeza}, pero el IRPF real por tramos son ${euros(f, a.irpfReal)} al año:
    en el bolsillo te quedarían <strong>${euros(f, real)}</strong> al mes, no ${euros(f, objetivo)}.${cola}</p>`;
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

function pintarCascada(c) {
  const { modelo: m, ventasMedia: v, f } = c;
  const r = resultadoMensual(m, v);
  const fac = r.facturacion;

  const filas = [
    filaCasc('Facturación', `${ventasTexto(v)} ventas × ${euros(f, m.ticket)} con IVA`, r.facturacion, fac, f),
    filaCasc('IVA', `el ${pctTexto(m.iva)} va dentro del precio: nunca fue tuyo`, Math.abs(r.iva), fac, f, 'casc-resta'),
    filaCasc('Neto', 'lo que de verdad factura el negocio', r.netoNegocio, fac, f, 'casc-sub'),
    filaCasc('Comisiones de la pasarela', `${pctTexto(m.comisionPct)} sobre el neto`, Math.abs(r.comisiones), fac, f, 'casc-resta'),
    filaCasc('Gastos fijos del negocio', 'se pagan haya ventas o no', Math.abs(r.fijos), fac, f, 'casc-resta'),
    filaCasc('BENEFICIO DEL NEGOCIO', 'lo que queda para repartir', r.beneficio, fac, f, 'casc-hito'),
    filaCasc(`Tu ${pctTexto(m.miShare)}`, 'tu parte del beneficio', r.miParte, fac, f, 'casc-sub'),
    filaCasc('Cuota de autónomo', 'tarifa plana: cuando se acabe, sube', Math.abs(r.cuota), fac, f, 'casc-resta'),
    filaCasc(`IRPF retenido (${pctTexto(m.irpf)})`, 'lo que apartas cada mes, no la factura final', Math.abs(r.irpfPagado), fac, f, 'casc-resta'),
    filaCasc('Tras impuestos', 'antes de tus gastos personales', r.trasIrpf, fac, f, 'casc-sub'),
    filaCasc('Asesoría', 'deducible: se resta ANTES del IRPF', Math.abs(r.deducibles), fac, f, 'casc-resta'),
    filaCasc('Gimnasio', 'no deducible: se resta DESPUÉS', Math.abs(m.gastosPersonales), fac, f, 'casc-resta'),
    filaCasc('EN TU BOLSILLO', 'limpio, ya libre de todo', r.bolsillo, fac, f, `casc-final${r.bolsillo < 0 ? ' negativo' : ''}`),
  ].join('');

  const pm = puntoMuerto(m);
  const notaPm = pm === null
    ? 'Con estos números una venta no deja nada al negocio: no hay punto muerto. Revisa el ticket o la comisión.'
    : `Punto muerto: <strong>${decTexto(pm, 2)}</strong> ventas al mes. Por debajo de ahí el negocio pierde dinero.`;

  const extra = resultadoMensual(m, v + 1).bolsillo - r.bolsillo;
  const notaExtra = `Cada venta de más te deja <strong class="${extra >= 0 ? 'pos' : 'neg'}">${euros(f, extra)}</strong> limpios en el bolsillo.`;

  return `<div class="casc">${filas}</div>
    <div class="obj-notas">
      <div class="obj-nota">${notaPm}</div>
      <div class="obj-nota">${notaExtra}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// C) Lo que retienes contra lo que de verdad pagas
// ---------------------------------------------------------------------------

function pintarIrpf(c) {
  const { modelo: m, ventasMedia: v, f, card } = c;
  const a = irpfAnualReal(m, v);
  const devuelven = a.diferencia > 0;
  const cuadra = Math.abs(a.diferencia) < 1;

  const duo = `<div class="obj-duo">
    <div class="obj-duo-col">
      <div class="l">Te retienen al año</div>
      <div class="v num">${euros(f, a.irpfRetenido)}</div>
      <span class="mc">el ${pctTexto(m.irpf)} que apartas todos los meses</span>
    </div>
    <div class="obj-duo-vs">contra</div>
    <div class="obj-duo-col">
      <div class="l">De verdad te toca</div>
      <div class="v num">${euros(f, a.irpfReal)}</div>
      <span class="mc">IRPF real por tramos sobre ${euros(f, Math.max(0, a.baseAnual))} de base</span>
    </div>
  </div>`;

  let veredicto;
  if (cuadra) {
    veredicto = `<div class="obj-veredicto">Vas justo: lo que retienes es casi exactamente lo que pagas.
      <span class="mc">Diferencia de ${euros(f, Math.abs(a.diferencia))} al año.</span></div>`;
  } else if (devuelven) {
    veredicto = `<div class="obj-veredicto ok">Hacienda te devuelve ${euros(f, a.diferencia)}
      <span class="mc">Estás pagando de más cada mes. Es tuyo, pero no lo ves hasta la declaración.</span></div>`;
  } else {
    veredicto = `<div class="obj-veredicto mal">Tienes que apartar ${euros(f, -a.diferencia)} — no es tuyo
      <span class="mc">Con lo que retienes no llega: esa diferencia te la van a reclamar en la declaración.</span></div>`;
  }

  const tarjetas = `<div class="grid grid-3">
    ${card('Tipo medio real', `<span class="num pos">${pctTexto(a.tipoMedio)}</span>`, 'lo que pagas de verdad sobre el total')}
    ${card('Tipo marginal', `<span class="num">${pctTexto(a.tipoMarginal)}</span>`, 'lo que pagarías por el siguiente euro')}
    ${card('Lo que te retienes', `<span class="num">${pctTexto(m.irpf)}</span>`, 'el porcentaje del modelo, mes a mes')}
  </div>
  <p class="mc obj-explica">${EXPLICACION_TIPOS}</p>`;

  // La curva real: el mismo modelo a 3, 10, 20 y 30 ventas. Sirve para ver que el tipo
  // medio sube despacio y nunca alcanza al marginal.
  const { lista: curva, iHoy } = conFilaDeHoy(VENTAS_CURVA_IRPF, v);
  const filas = curva.map((n, i) => {
    const x = irpfAnualReal(m, n);
    const hoy = i === iHoy;
    return `<tr${hoy ? ' class="hoy"' : ''}>
      <td class="num">${ventasTexto(n)}${hoy ? '<span class="fila-tag ahora">AHORA</span>' : ''}</td>
      <td class="num">${euros(f, Math.max(0, x.baseAnual))}</td>
      <td class="num col-irpf">${euros(f, x.irpfReal)}</td>
      <td class="num pos">${pctTexto(x.tipoMedio)}</td>
      <td class="num">${pctTexto(x.tipoMarginal)}</td>
    </tr>`;
  }).join('');

  const tabla = `<div class="tabla-wrap obj-mini">
    <table>
      <thead><tr>
        <th class="num">Ventas/mes</th>
        <th class="num">Base anual</th>
        <th class="num col-irpf">IRPF real</th>
        <th class="num">Tipo medio</th>
        <th class="num">Tipo marginal</th>
      </tr></thead>
      <tbody>${filas}</tbody>
    </table>
  </div>`;

  const sinBase = a.baseAnual <= 0
    ? '<p class="obj-nota">Con estas ventas no llegas a base imponible: de IRPF, cero.</p>'
    : '';

  return duo + veredicto + sinBase + tarjetas + tabla;
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

  const cuerpo = filas.map((r, i) => {
    const clases = [i === iHoy ? 'hoy' : '', i === iMeta ? 'meta' : ''].filter(Boolean).join(' ');
    const tags = `${i === iHoy ? '<span class="fila-tag ahora">AHORA</span>' : ''}${i === iMeta ? '<span class="fila-tag meta">TU META</span>' : ''}`;
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
// G) Ajustes del modelo
// ---------------------------------------------------------------------------

function pintarAjustes(c) {
  const m = c.modelo;
  // Ojo con el prefijo: los ids van con "obj-m-" y no con "obj-", porque "obj-irpf"
  // ya es el div del bloque de IRPF y dos ids iguales romperían getElementById.
  const filas = CAMPOS_MODELO.map(([k, etiqueta, paso]) => `<div class="pat-fila">
    <label for="obj-m-${k}">${etiqueta}</label>
    <input id="obj-m-${k}" class="pat-imp" type="number" inputmode="decimal" step="${paso}"
      data-obj="modelo" data-k="${k}" value="${esc(paraInput(m[k]))}" />
  </div>`).join('');

  const fuente = c.fuente && c.fuente.texto
    ? `<span class="obj-fuente">${esc(c.fuente.texto)}</span>`
    : '';

  return `<div class="obj-ajustes">
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
    if (btn.dataset.meta !== undefined) {
      llamar(h.setObjetivo, Math.max(0, parseFloat(btn.dataset.meta) || 0));
      repintarTodo();
    } else if (btn.id === 'obj-reset') {
      llamar(h.setModelo, { ...MODELO_DEFAULT });
      repintarTodo();
    }
  });
}
