// Vista "Y ahora qué": la primera pantalla de la app y la que abre por defecto.
//
// Tiene que responder tres preguntas SIEMPRE, sin que el usuario piense:
//   1. ¿Dónde estoy ahora mismo?        -> #dec-semaforo y #dec-alertas
//   2. ¿Qué es lo siguiente y cuándo?   -> #dec-siguiente y #dec-camino
//   3. ¿Qué hago hoy?                   -> #dec-hoy
// Y una cuarta que en su caso es la misma pregunta con otra ropa: dónde vivir -> #dec-paises.
//
// Aquí solo hay DOM y strings. Toda la aritmética vive en decisiones.js (semáforo, alertas,
// hitos y acciones), en residencia.js y bali.js (los países) y en objetivo.js (la
// traducción a ventas). Esta vista no calcula dinero ni se inventa una sola cifra fiscal.
//
// LA REGLA DE ESTA PANTALLA: ninguna distancia se dice solo en euros. Los euros son la
// consecuencia; las ventas al mes son lo único que él controla, así que van SIEMPRE, y en
// grande. Y cuando un hueco se tapa con N ventas de golpe (no con N ventas al mes), se
// dice con esas palabras: es el error más caro de leer que tiene este dashboard.
//
// Todo lo que llega de decisiones.js pasa por esc(): dentro de los títulos de los hitos
// personales van nombres que ha escrito el usuario.

import {
  alertas,
  distanciaEnVentas,
  hitos,
  queHacerHoy,
  semaforo,
  siguienteHito,
} from './decisiones.js';

import {
  modeloDesdeDatos,
  normalizarModelo,
  resultadoMensual,
} from './objetivo.js';

import {
  normalizarOpciones as normalizarResidencia,
  netoDe,
  umbralDetalle,
} from './residencia.js';

import { calificaE33G, UMBRALES_BALI } from './bali.js';
import { formatoEuros } from './calculos.js';

// ---------------------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------------------

// Los cuatro PAÍSES. Ojo: no son los cinco escenarios de "Dónde vivir". Montar una SL no
// es mudarse, así que aquí no pinta nada: esta pregunta es "dónde vivo", no "qué figura
// jurídica uso". El detalle de los cinco está en la otra pestaña.
const PAISES = ['espana-autonomo', 'dubai', 'paraguay', 'bali'];

const NOMBRE_PAIS = {
  'espana-autonomo': 'España',
  dubai: 'Dubái',
  paraguay: 'Paraguay',
  bali: 'Bali',
};

// Cómo se lee cada nivel de urgencia en una etiqueta. Mismo vocabulario que decisiones.js.
const URGENCIA_TEXTO = {
  ya: 'HOY',
  'este-trimestre': 'ESTE TRIMESTRE',
  'este-ano': 'ESTE AÑO',
  vigilar: 'VIGILAR',
};

const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

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

function num(v, porDefecto) {
  if (v === null || v === undefined || v === '') return porDefecto;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : porDefecto;
}

// Nunca un NaN ni un Infinity en pantalla: en su lugar, una raya.
function euros(f, n) {
  return Number.isFinite(n) ? f(n) : '—';
}

// Mismo criterio que decisiones.js: un resto diminuto NO se redondea a "0". Leer "a 0
// ventas" cuando todavía falta algo es justo el tipo de mentira que da ansiedad.
function ventasTexto(n) {
  if (n === null || !Number.isFinite(Number(n))) return '—';
  const x = Number(n);
  if (x > 0 && x < 0.05) return 'menos de 0,1';
  return String(Math.round(x * 10) / 10).replace('.', ',');
}

// Los textos de fiscal.js llevan las fechas en ISO ("Venció el 2026-07-20"). Ahí dentro son
// un dato bien puesto -es un módulo, no una pantalla-, pero en mitad de una frase se leen
// como un código y no como el día que son. Se pasan al castellano solo al pintarlas: es una
// transformación de presentación, no toca fiscal.js y no cambia ninguna cifra.
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fiscalTexto(v) {
  return String(v ?? '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,
    (m, a, mes, d) => `${Number(d)} de ${MESES_LARGO[Number(mes) - 1]} de ${a}`);
}

// Euros cortos para chips y extremos de barra: "15.000 €", sin céntimos.
function eurosCortos(n) {
  if (!Number.isFinite(Number(n))) return '—';
  return `${String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
}

const cardPorDefecto = (l, v, mc = '') =>
  `<div class="card"><div class="l">${l}</div><div class="v">${v}</div>${mc ? `<span class="mc">${mc}</span>` : ''}</div>`;

function set(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ---------------------------------------------------------------------------
// El contexto de la pantalla
// ---------------------------------------------------------------------------
//
// ctx = { datos, modelo, beneficioAnual, rentaFiscal, situacionFiscal, patrimonio,
//         residencia, hoyISO, ventasMedia, gastosFijos, tarifaPlana, f, card }
// `rentaFiscal` (lo que factura) manda para los impuestos; `situacionFiscal` (lo devengado)
// se queda como informativo.
//
// El ctx entero se le pasa TAL CUAL a decisiones.js: es su contrato, no el de esta vista.
// Lo que se prepara aquí es solo lo que la vista necesita por su cuenta para el bloque de
// países, y se calcula por el MISMO camino que decisiones.js usa por dentro para que las
// dos mitades de la pantalla no digan números distintos.
function prepararCtx(ctx) {
  const c = ctx || {};
  const datos = c.datos || {};
  const modelo = normalizarModelo(c.modelo);
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(c.hoyISO ?? '')) ? String(c.hoyISO) : '';
  const mes = hoy ? hoy.slice(0, 7) : '';

  // Igual que en decisiones.js: manda la media que llegue del ctx y, si no llega, se
  // reconstruye de los datos reales por la misma vía que "Cuánto facturar".
  const ventasMedia = c.ventasMedia === null || c.ventasMedia === undefined || c.ventasMedia === ''
    ? Math.max(0, num(modeloDesdeDatos(datos, modelo, mes ? { mesActual: mes } : undefined).ventasMedia, 0))
    : Math.max(0, num(c.ventasMedia, 0));

  const miParteMes = resultadoMensual(modelo, ventasMedia).miParte;

  return {
    ctx: c,
    modelo,
    hoy,
    ventasMedia,
    miParteMes,
    // LA renta anual, una sola para toda la app. Llega por ctx desde app.js, que se la pasa
    // igual a esta pantalla, a decisiones.js y a "Dónde vivir". Antes cada pestaña la
    // calculaba por su cuenta y salían dos cifras con un 19 % de diferencia: los hitos
    // decían "te faltan 0,3 ventas al mes para que Paraguay te compense" mientras la
    // pestaña de al lado ya lo daba por cruzado.
    //
    // Y es lo que él FACTURA, no su 40 % del beneficio del negocio: un autónomo español
    // tributa por lo que factura, y los umbrales de estas tarjetas son fiscales. Si no
    // llega, sale de la media de ventas, que es lo único reconstruible desde aquí.
    beneficioAnual: Number.isFinite(Number(c.beneficioAnual))
      ? Number(c.beneficioAnual)
      : miParteMes * 12,
    opciones: normalizarResidencia(c.residencia),
    // Las alertas de Hacienda, YA calculadas por fiscal.js en app.js. Esta vista no las
    // recalcula ni sabe de plazos: solo las pinta.
    //
    // Se cae la de "lo que tienes que tener guardado hoy" (`apartar`) a propósito: la lista
    // de abajo ya tiene su propia alerta de reserva de impuestos, y las dos miden cosas
    // parecidas con cifras distintas -una el IRPF devengado del año, la otra el 130 vencido
    // con su recargo-. Dos números para la misma pregunta en la misma pantalla es la forma
    // más rápida de que no se crea ninguno. El número grande vive en la pestaña Hacienda.
    fiscales: (Array.isArray(c.alertasFiscales) ? c.alertasFiscales : [])
      .filter((a) => a && a.id !== 'apartar'),
    f: typeof c.f === 'function' ? c.f : formatoEuros,
    card: typeof c.card === 'function' ? c.card : cardPorDefecto,
  };
}

// Lo vencido ante Hacienda manda sobre todo lo demás de esta pantalla: es lo único que
// empeora solo, con fecha, mientras la app está cerrada.
function fiscalesRojas(c) {
  return c.fiscales.filter((a) => a.nivel === 'rojo');
}

// De todas las rojas, la que hay que decir en voz alta. NO es la primera de la lista: esa
// viene ordenada por fecha límite, y el 1T, que sale a cero, se comía el titular mientras el
// 2T con 651,01 € y su recargo corriendo quedaba enterrado tres líneas más abajo.
function peorFiscal(lista) {
  if (!lista.length) return null;
  return lista
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const d = (Number(y.a.importe) || 0) - (Number(x.a.importe) || 0);
      return d !== 0 ? d : x.i - y.i;
    })[0].a;
}

// ---------------------------------------------------------------------------
// A) El semáforo: ¿dónde estoy ahora mismo?
// ---------------------------------------------------------------------------

// EL SEMÁFORO NO PUEDE SER MÁS OPTIMISTA QUE HACIENDA.
//
// decisiones.js mide el negocio y no sabe nada de plazos: con un modelo 130 vencido y todo
// lo demás en orden pintaba "Está todo en orden" mientras corría un recargo con fecha. Así
// que si hay algo vencido, el semáforo se pone rojo y la primera frase es esa, no la del mes.
// El resto de la explicación se conserva tal cual: sigue siendo verdad, solo que va después.
function pintarSemaforo(c) {
  const s = semaforo(c.ctx);
  const rojas = fiscalesRojas(c);
  const nivel = rojas.length ? 'rojo' : s.nivel;
  const peor = peorFiscal(rojas);
  const titulo = rojas.length
    ? (rojas.length === 1 ? 'Tienes algo vencido con Hacienda' : `Tienes ${rojas.length} cosas vencidas con Hacienda`)
    : s.titulo;
  const explicacion = rojas.length
    ? fiscalTexto(`Lo más caro: ${peor.titulo}. ${peor.texto} ${s.explicacion}`)
    : s.explicacion;

  return `<div class="dec-semaforo ${esc(nivel)}" role="status">
    <span class="dec-semaforo-luz" aria-hidden="true"></span>
    <div class="dec-semaforo-txt">
      <p class="dec-semaforo-tit">${esc(titulo)}</p>
      <p class="dec-semaforo-exp">${esc(explicacion)}</p>
      ${rojas.length ? '<button type="button" class="btn btn-primary dec-ir" data-ir="fiscal">Ver qué tengo vencido</button>' : ''}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// B) Qué hago hoy
// ---------------------------------------------------------------------------

// El "no hay nada que hacer" de verdad, sin depender de comparar textos: es exactamente la
// condición con la que queHacerHoy() se queda sin candidatas (ninguna alerta encendida y
// ningún hito por cruzar).
function nadaQueHacer(c) {
  return alertas(c.ctx).every((a) => a.nivel === 'verde')
    && siguienteHito(c.ctx) === null
    && c.fiscales.every((a) => a.nivel === 'verde');
}

// Las acciones de Hacienda, con la forma que ya usa esta lista. Van DELANTE de las del
// negocio: presentar un modelo vencido tiene fecha y las demás no.
//
// COMO MUCHO DOS, y elegidas, no las primeras. Volcarlas todas llenaba los tres huecos del
// día con "presenta el 130 del 1T", "presenta el 303 del 1T" y "presenta el 349 del 1T":
// tres frases casi idénticas, ninguna la más cara, y el negocio desaparecido de su propia
// pantalla. Las que salen son:
//   · el ROI, si está en duda, porque bloquea a los demás (sin NIF-IVA no hay 349 que valga);
//   · y el vencimiento que más dinero mueve, diciendo cuántos más quedan detrás.
function accionesFiscales(c) {
  const abiertas = c.fiscales.filter((a) => a.nivel !== 'verde' && a.queHacer);
  if (!abiertas.length) return [];

  const roi = abiertas.find((a) => a.id === 'roi');
  const vencidos = abiertas.filter((a) => a.id !== 'roi');
  const peor = peorFiscal(vencidos);
  const detras = vencidos.length - (peor ? 1 : 0);

  const out = [];
  if (roi) {
    out.push({ accion: fiscalTexto(roi.queHacer), porque: fiscalTexto(`${roi.titulo}: ${roi.texto}`), urgencia: roi.urgencia || 'ya' });
  }
  if (peor) {
    out.push({
      accion: fiscalTexto(peor.queHacer),
      porque: fiscalTexto(`${peor.titulo}: ${peor.texto}`)
        + (detras > 0
          ? ` Y ${detras === 1 ? 'queda otro modelo vencido' : `quedan otros ${detras} modelos vencidos`}: los tienes todos, con lo que cuesta cada uno, en la pestaña "Hacienda".`
          : ''),
      urgencia: peor.urgencia || 'ya',
    });
  }
  return out;
}

function pintarHoy(c) {
  if (nadaQueHacer(c)) {
    return `<div class="dec-nada">
      <p class="dec-nada-tit">Hoy no tienes que hacer nada.</p>
      <p class="dec-nada-sub">Sigue vendiendo.</p>
    </div>`;
  }

  // Tres en total, no tres más tres: si Hacienda ocupa los tres huecos es porque de verdad
  // es lo único que importa hoy, y el resto sigue estando dos bloques más abajo.
  const vistas = new Set();
  const lista = [...accionesFiscales(c), ...queHacerHoy(c.ctx)]
    .filter((x) => {
      if (!x.accion || vistas.has(x.accion)) return false;
      vistas.add(x.accion);
      return true;
    })
    .slice(0, 3);

  if (!lista.length) {
    return `<div class="dec-nada">
      <p class="dec-nada-tit">Hoy no tienes que hacer nada.</p>
      <p class="dec-nada-sub">Sigue vendiendo.</p>
    </div>`;
  }

  const items = lista.map((x, i) => `<li class="dec-hoy-item u-${esc(x.urgencia || 'vigilar')}">
      <span class="dec-hoy-n num" aria-hidden="true">${i + 1}</span>
      <div class="dec-hoy-cuerpo">
        <p class="dec-hoy-accion">${esc(x.accion)}</p>
        <p class="dec-hoy-porque"><span class="dec-hoy-etq">${esc(URGENCIA_TEXTO[x.urgencia] || 'VIGILAR')}</span>${esc(x.porque)}</p>
      </div>
    </li>`).join('');

  return `<ol class="dec-hoy">${items}</ol>
    <p class="dec-pie">Como mucho tres. Tres cosas se hacen; diez se leen y no se hace ninguna.</p>`;
}

// ---------------------------------------------------------------------------
// C) Las alertas
// ---------------------------------------------------------------------------

const PESO_NIVEL = { rojo: 0, ambar: 1, verde: 2 };

function pintarAlertas(c) {
  const lista = alertas(c.ctx)
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const d = (PESO_NIVEL[x.a.nivel] ?? 3) - (PESO_NIVEL[y.a.nivel] ?? 3);
      return d !== 0 ? d : x.i - y.i;
    })
    .map((o) => o.a);

  const tarjeta = (a) => `<div class="dec-alerta ${esc(a.nivel)}">
      <span class="dec-alerta-punto" aria-hidden="true"></span>
      <p class="dec-alerta-txt">${esc(a.texto)}</p>
      ${a.dato ? `<span class="dec-alerta-dato num">${esc(a.dato)}</span>` : ''}
    </div>`;

  const tarjetas = lista.map(tarjeta).join('');

  // Hacienda va en su propio grupo y va PRIMERO. No se mezcla con las seis del negocio
  // porque no se compara con ellas: éstas tienen fecha y las otras no, y una lista ordenada
  // solo por color pondría "llevas 4 días sin vender" por encima de un recargo que corre.
  //
  // Y aquí, a diferencia de las del negocio, va el TÍTULO delante: seis alertas que empiezan
  // por "Venció el ..." son seis líneas indistinguibles, y lo que hace falta saber es de qué
  // modelo y de qué trimestre habla cada una.
  const tarjetaFiscal = (a) => `<div class="dec-alerta ${esc(a.nivel)}">
      <span class="dec-alerta-punto" aria-hidden="true"></span>
      <div class="dec-alerta-txt">
        <p class="dec-alerta-tit">${esc(a.titulo)}</p>
        <p>${esc(fiscalTexto(a.texto))}</p>
      </div>
      ${a.dato ? `<span class="dec-alerta-dato num">${esc(fiscalTexto(a.dato))}</span>` : ''}
    </div>`;

  const fis = c.fiscales.length
    ? `<p class="dec-alertas-sep">Hacienda</p>
      <div class="dec-alertas">${c.fiscales.map(tarjetaFiscal).join('')}</div>
      <p class="dec-pie">Salen de la pestaña "Hacienda", donde está el detalle de cada una: cuánto cuesta hoy, cuándo sube y cómo se presenta.
        <button type="button" class="btn btn-ghost dec-ir" data-ir="fiscal">Ver el detalle en "Hacienda"</button></p>
      <p class="dec-alertas-sep">El negocio</p>`
    : '';

  return `${fis}<div class="dec-alertas">${tarjetas}</div>
    <p class="dec-pie">Del negocio salen siempre las seis, siempre en el mismo orden, aunque estén en verde. Una lista que cambia de tamaño cada día es una lista que da miedo mirar.</p>`;
}

// ---------------------------------------------------------------------------
// D) El siguiente hito: el bloque más importante
// ---------------------------------------------------------------------------

// Dónde estás AHORA en la magnitud del hito. Todos los hitos cumplen
// distancia = umbral − actual, así que el nivel actual sale de la resta y no hace falta
// que la vista sepa de qué magnitud habla cada uno.
function nivelActual(h) {
  if (h.umbral === null || !Number.isFinite(h.umbral)) return null;
  return h.umbral - (Number.isFinite(h.distancia) ? h.distancia : 0);
}

// El progreso hacia el hito, en 0..100. null cuando no hay umbral que medir.
function progresoHito(h) {
  if (h.alcanzado) return 100;
  const u = h.umbral;
  if (u === null || !Number.isFinite(u) || u <= 0) return null;
  const actual = nivelActual(h);
  if (actual === null) return null;
  return Math.max(0, Math.min(100, (actual / u) * 100));
}

// Una cifra dicha en la unidad del hito, para que "1.166" y "1.166 al mes" no se confundan.
function enUnidad(f, v, unidad) {
  if (!Number.isFinite(v)) return '—';
  if (unidad === 'ventas-mes') return `${ventasTexto(v)} ventas/mes`;
  if (unidad === 'meses') return `${v} ${v === 1 ? 'mes' : 'meses'}`;
  if (unidad === 'eur-mes') return `${euros(f, v)} al mes`;
  if (unidad === 'eur-ano') return `${euros(f, v)} al año`;
  return euros(f, v);
}

// La barra de progreso hacia el hito. Es la única imagen de la pantalla, así que dice a la
// vez dónde está y cuánto le queda, con las dos puntas etiquetadas.
//
// SOLO para los hitos de sentido 'meta'. Un umbral que NO quieres cruzar pintado con esta
// misma barra verde decía, literalmente, "95 % del camino hacia pagar 2.634,70 € más al
// año". La aritmética era correcta; la palabra que la acompañaba, no.
function barraHito(c, h) {
  if (h.sentido === 'aviso') return '';
  const pct = progresoHito(h);
  if (pct === null) return '';
  const { f } = c;
  const actual = nivelActual(h);
  return `<div class="dec-barra" role="img" aria-label="Progreso hacia el hito: ${pct.toFixed(0)} por ciento">
    <div class="dec-barra-track"><div class="dec-barra-lleno" style="width:${pct.toFixed(1)}%"></div></div>
    <div class="dec-barra-pies">
      <span class="dec-barra-pie">ahora · ${esc(enUnidad(f, actual, h.unidad))}</span>
      <span class="dec-barra-pct num">${pct.toFixed(0)} %</span>
      <span class="dec-barra-pie der">el hito · ${esc(enUnidad(f, h.umbral, h.unidad))}</span>
    </div>
  </div>`;
}

function pintarSiguiente(c) {
  const h = siguienteHito(c.ctx);
  if (!h) {
    return `<div class="dec-sig verde">
      <p class="dec-sig-eyebrow">Lo siguiente</p>
      <p class="dec-sig-tit">No te queda ningún umbral por cruzar.</p>
      <p class="dec-sig-quepasa">Todos los hitos que esta app sabe medir están pasados. A partir de aquí lo único que cambia la foto es que ganes más o que cambies de país, y las dos cosas se ven en el camino de abajo.</p>
    </div>`;
  }

  const { f } = c;
  const esAviso = h.sentido === 'aviso';
  const hayVentas = h.ventasQueFaltan !== null && Number.isFinite(h.ventasQueFaltan);

  // La cifra grande es SIEMPRE la de ventas, porque es lo único que él controla... salvo
  // cuando decirlo en ventas sería mentira. Dos casos:
  //
  //  · el hito es una FECHA (la tarifa plana): no hay ventas que la muevan, hay meses;
  //  · el hueco se tapa con dinero que YA tiene: no hace falta vender, hace falta etiquetar.
  //    Ahí "3,4 ventas" convivía en el mismo recuadro con "mueve dinero que ya tienes", y
  //    encima hacer esas 3,4 ventas subía la cifra a 4,7 en vez de bajarla a 0.
  let grande;
  if (h.unidad === 'meses' && Number.isFinite(h.distancia)) {
    grande = `<div class="dec-sig-big aviso"><span class="num">${h.distancia}</span><small>${h.distancia === 1 ? 'mes' : 'meses'}</small></div>`;
  } else if (h.cubrible) {
    grande = `<div class="dec-sig-big"><span class="num">${euros(f, h.distancia)}</span><small>ya lo tienes: solo hay que etiquetarlo</small></div>`;
  } else if (hayVentas) {
    // En un aviso, la distancia en ventas no es "lo que te falta para conseguirlo": es lo
    // que te falta para que cambien las reglas. La coletilla lo dice.
    const unidadVentas = esAviso
      ? 'ventas al mes y cambia'
      : (h.ventasQueFaltanUnidad === 'ventas' ? 'ventas' : 'ventas más al mes');
    grande = `<div class="dec-sig-big${esAviso ? ' aviso' : ''}"><span class="num">${ventasTexto(h.ventasQueFaltan)}</span><small>${esc(unidadVentas)}</small></div>`;
  } else {
    grande = '<div class="dec-sig-big sin-dato"><span class="num">—</span><small>me falta un dato para medirlo</small></div>';
  }

  // La coletilla de los euros NO es decorativa: "5.800 € al año" y "5.800 € en total" son
  // dos cosas distintas, y confundirlas es el error más caro de leer que tiene la pantalla.
  const colaEuros = { 'eur-mes': 'al mes', 'eur-ano': 'al año', eur: 'en total, de una vez' };
  const eurLinea = !h.cubrible && Number.isFinite(h.distancia) && h.distancia > 0
    && h.unidad !== 'ventas-mes' && h.unidad !== 'meses'
    ? `<div class="dec-sig-eur"><span class="num">${euros(f, h.distancia)}</span><small>${esc(colaEuros[h.unidad] || 'de distancia')}</small></div>`
    : '';

  let aclaracion = '';
  if (h.cubrible) {
    aclaracion = '<p class="dec-sig-ojo">Este hueco no se tapa vendiendo: el dinero ya está en tu caja o en tus cuentas, sin etiquetar. Vender más ni siquiera lo cierra, lo agranda.</p>';
  } else if (esAviso) {
    aclaracion = '<p class="dec-sig-ojo">Esto no es una meta: es un aviso. No hay nada que perseguir aquí, solo saber cuándo cambian las reglas.</p>';
  } else if (h.ventasQueFaltanUnidad === 'ventas') {
    aclaracion = '<p class="dec-sig-ojo">Son ventas EN TOTAL, de una vez, no ventas al mes. Es un hueco de dinero, no un cambio de ritmo.</p>';
  }

  // Sin barra de progreso para los avisos: en su lugar, dónde está la raya.
  const umbralLinea = esAviso && Number.isFinite(h.umbral) && h.unidad !== 'meses'
    ? `<p class="dec-sig-umbral">A partir de ${esc(enUnidad(f, h.umbral, h.unidad))} cambia la regla.</p>`
    : '';

  const dato = h.faltaDato
    ? `<div class="dec-sig-falta">${ICON_WARN}<span>${esc(h.faltaDato)}</span></div>`
    : '';

  const situacion = h.situacion
    ? `<div class="dec-sig-bloque">
      <p class="dec-sig-l">Cómo estás</p>
      <p class="dec-sig-quepasa">${esc(h.situacion)}</p>
    </div>`
    : '';

  const queHacer = h.queHacer
    ? `<div class="dec-sig-bloque">
      <p class="dec-sig-l">Qué hacer</p>
      <p class="dec-sig-quehacer">${esc(h.queHacer)}</p>
    </div>`
    : '';

  return `<div class="dec-sig ${esc(h.urgencia)}${esAviso ? ' aviso' : ''}">
    <p class="dec-sig-eyebrow">${esAviso ? 'Lo siguiente que cambia' : 'Lo siguiente que va a pasar'}${h.urgencia === 'ya' ? ' · y es para hoy' : ''}</p>
    <p class="dec-sig-tit">${esc(h.titulo)}</p>
    <div class="dec-sig-cifras">${grande}${eurLinea}</div>
    ${aclaracion}
    ${umbralLinea}
    ${barraHito(c, h)}
    <div class="dec-sig-bloque">
      <p class="dec-sig-l">Qué pasa cuando lo cruces</p>
      <p class="dec-sig-quepasa">${esc(h.quePasa)}</p>
    </div>
    ${situacion}
    ${queHacer}
    ${dato}
  </div>`;
}

// ---------------------------------------------------------------------------
// E) El camino: todos los hitos, en una línea de tiempo
// ---------------------------------------------------------------------------

// La distancia de un hito, dicha corta, para la cabecera plegada.
//
// Un aviso ya cruzado no pone "hecho": no lo has conseguido, te ha pasado. Y un hito al que
// le falta el dato tampoco: "hecho" sobre "no sé en qué mes te diste de alta en el RETA" era
// la app afirmando justo lo que no sabe.
function distanciaCorta(h) {
  if (h.alcanzado) return h.sentido === 'aviso' ? 'cruzado' : 'hecho';
  if (h.unidad === 'meses' && Number.isFinite(h.distancia)) {
    return `${h.distancia} ${h.distancia === 1 ? 'mes' : 'meses'}`;
  }
  if (h.esTecho) {
    return Number.isFinite(h.holgura) ? `${ventasTexto(h.holgura)} ventas/mes de margen` : 'techo';
  }
  if (h.cubrible) return 'ya lo tienes';
  if (h.ventasQueFaltan === null || !Number.isFinite(h.ventasQueFaltan)) return 'falta un dato';
  const cola = h.ventasQueFaltanUnidad === 'ventas' ? 'ventas' : 'ventas/mes';
  return `${ventasTexto(h.ventasQueFaltan)} ${cola}`;
}

function pasoCamino(h, estado, abierto) {
  const cruzadoSinQuerer = h.alcanzado && h.sentido === 'aviso';
  const punto = estado !== 'hecho'
    ? '<span class="dec-paso-punto" aria-hidden="true"></span>'
    : (cruzadoSinQuerer
      ? `<span class="dec-paso-punto cruzado" aria-hidden="true">${ICON_WARN}</span>`
      : `<span class="dec-paso-punto hecho" aria-hidden="true">${ICON_CHECK}</span>`);

  return `<li class="dec-paso ${estado}${h.sentido === 'aviso' ? ' aviso' : ''}">
    <details class="dec-paso-det"${abierto ? ' open' : ''}>
      <summary class="dec-paso-cab">
        ${punto}
        <span class="dec-paso-tit">${esc(h.titulo)}</span>
        <span class="dec-paso-dist">${esc(distanciaCorta(h))}</span>
      </summary>
      <div class="dec-paso-cuerpo">
        <p class="dec-paso-l">Qué pasa</p>
        <p class="dec-paso-txt">${esc(h.quePasa)}</p>
        ${h.situacion ? `<p class="dec-paso-l">Cómo estás</p>
        <p class="dec-paso-txt">${esc(h.situacion)}</p>` : ''}
        ${h.queHacer ? `<p class="dec-paso-l">Qué hacer</p>
        <p class="dec-paso-txt">${esc(h.queHacer)}</p>` : ''}
        ${h.faltaDato ? `<p class="dec-paso-falta">${esc(h.faltaDato)}</p>` : ''}
      </div>
    </details>
  </li>`;
}

// Los pendientes NO son una sola escalera. Son cuatro cosas distintas que no se comparan
// entre sí, y mezclarlas en una lista continua hacía leer "Dubái a 3,09" como si estuviera
// más cerca que un objetivo que se tapa en 1,7 meses sin cambiar nada. Cada grupo con su
// rótulo y su vara.
const ROTULO_GRUPO = {
  ritmo: 'Vender más al mes',
  hueco: 'Huecos de dinero · se tapan con ventas de una vez, sin cambiar el ritmo',
  techo: 'Techos · lo que conviene NO cruzar',
  calendario: 'Pasa solo, con fecha',
  sindato: 'Me falta un dato para medirlos',
};

function grupoDe(h) {
  if (h.esTecho) return 'techo';
  if (h.unidad === 'meses') return Number.isFinite(h.distancia) ? 'calendario' : 'sindato';
  if (!Number.isFinite(h.ventasQueFaltan)) return 'sindato';
  return h.ventasQueFaltanUnidad === 'ventas' ? 'hueco' : 'ritmo';
}

function pintarCamino(c) {
  const lista = hitos(c.ctx);
  if (!lista.length) return '<p class="mc">Todavía no hay hitos que medir.</p>';

  // `hitos()` viene ordenado por cercanía (lo que tienes delante primero). Para una línea
  // de tiempo hace falta el orden del CAMINO: primero lo andado, luego dónde estás, luego
  // lo que queda. Los pasados vienen con el más justo delante, así que se le da la vuelta:
  // arriba lo que cruzaste hace tiempo, abajo lo que acabas de cruzar y puedes perder.
  const pasados = lista.filter((h) => h.alcanzado).reverse();
  const futuros = lista.filter((h) => !h.alcanzado);

  // Un rótulo por grupo, la primera vez que aparece. Si todos los pendientes caen en el
  // mismo grupo no hace falta ninguno: no hay nada de lo que separarlos.
  const variosGrupos = new Set(futuros.map(grupoDe)).size > 1;
  const vistos = new Set();
  const pasosFuturos = futuros.map((h, i) => {
    const g = grupoDe(h);
    const sep = variosGrupos && !vistos.has(g)
      ? `<li class="dec-camino-sep">${esc(ROTULO_GRUPO[g] || '')}</li>`
      : '';
    vistos.add(g);
    return sep + pasoCamino(h, i === 0 ? 'ahora' : 'futuro', i === 0);
  }).join('');

  const pasos = pasados.map((h) => pasoCamino(h, 'hecho', false)).join('') + pasosFuturos;

  return `<ol class="dec-camino">${pasos}</ol>
    <p class="dec-pie">Los de arriba con visto ya están cruzados; los que llevan un aviso también, pero ésos no querías cruzarlos. El destacado es donde estás ahora. Y ojo al rótulo de cada grupo: "3 ventas al mes" (subir el ritmo para siempre) y "3 ventas" (un hueco que se tapa esperando) no son lo mismo ni se comparan.</p>`;
}

// ---------------------------------------------------------------------------
// F) Los cuatro países
// ---------------------------------------------------------------------------

// Bali no está sobre la mesa por debajo del umbral del visado: no es una cuestión de
// dinero, es que legalmente no calificas. Un ranking que lo pusiera el primero con 15.000
// EUR estaría dando un consejo que no se puede seguir.
function paisesDisponibles(beneficio) {
  return PAISES.filter((e) => e !== 'bali' || calificaE33G(beneficio));
}

function ordenPaises(beneficio, opciones, soloDisponibles = true) {
  const lista = soloDisponibles ? paisesDisponibles(beneficio) : PAISES;
  return lista
    .map((e) => ({ escenario: e, detalle: netoDe(e, beneficio, opciones) }))
    .map((x) => ({ ...x, neto: x.detalle.neto }))
    .sort((a, b) => b.neto - a.neto);
}

// El siguiente beneficio anual en el que cambia QUIÉN gana. Se buscan los cruces del líder
// de ahora con cada uno de los otros, más el umbral del visado de Bali (que no es un cruce
// de dinero: es el momento en que Bali entra en la lista), y se comprueba uno a uno si el
// líder de verdad cambia justo por encima. Devuelve null si no cambia nada en todo el rango.
function cambioDeGanador(beneficio, opciones) {
  const ahora = ordenPaises(beneficio, opciones);
  if (!ahora.length) return null;
  const lider = ahora[0].escenario;

  const candidatos = PAISES
    .filter((p) => p !== lider)
    .map((p) => umbralDetalle(p, lider, opciones))
    .filter((u) => u !== null)
    .map((u) => u.beneficio);

  if (!calificaE33G(beneficio)) candidatos.push(UMBRALES_BALI.legal);

  const ordenados = [...new Set(candidatos)]
    .filter((b) => b > beneficio + 1)
    .sort((a, b) => a - b);

  for (const b of ordenados) {
    // Un pelín por encima del cruce: en el punto exacto los netos son (casi) iguales y la
    // comparación no decide nada.
    const arriba = ordenPaises(b + Math.max(500, b * 0.02), opciones);
    if (arriba.length && arriba[0].escenario !== lider) {
      return { beneficio: b, nuevo: arriba[0].escenario, lider };
    }
  }
  return null;
}

function pintarPaises(c) {
  const { f } = c;
  const b = c.beneficioAnual;
  const o = c.opciones;

  const todos = ordenPaises(b, o, false);
  const ganador = ordenPaises(b, o)[0];
  const espana = todos.find((x) => x.escenario === 'espana-autonomo');

  const filas = todos.map((x) => {
    // Sin beneficio no hay ganador que coronar: "GANA AHORA" sobre un neto en rojo es una
    // etiqueta que se contradice a sí misma.
    const gana = b > 0 && ganador && x.escenario === ganador.escenario;
    const bloqueado = x.escenario === 'bali' && !x.detalle.califica;
    const diferencia = espana ? x.neto - espana.neto : 0;
    // La fila de España dice con QUÉ cuota está contada. "lo que tienes hoy" a secas era una
    // afirmación sobre HOY sostenida con una cuota de autónomo que hoy no paga: el comparador
    // cobra la del tramo del RETA y él tiene tarifa plana. Ahora se cuenta con la suya, y se
    // dice, porque es un dato que CADUCA.
    const nota = x.escenario === 'espana-autonomo'
      ? (x.detalle.tarifaPlanaAplicada
        ? `lo que tienes hoy, con tu tarifa plana de ${esc(euros(f, x.detalle.cuotaReta / 12))} al mes`
        : 'lo que tienes hoy')
      : `${diferencia >= 0 ? '+' : ''}${esc(euros(f, diferencia))} al año frente a España`;
    return `<div class="dec-pais${gana ? ' gana' : ''}${bloqueado ? ' bloqueado' : ''}">
      <div class="dec-pais-top">
        <span class="dec-pais-nombre">${esc(NOMBRE_PAIS[x.escenario] || x.escenario)}</span>
        ${gana ? '<span class="fila-tag meta">GANA AHORA</span>' : ''}
        ${bloqueado ? '<span class="fila-tag ahora">SIN VISADO</span>' : ''}
      </div>
      <div class="dec-pais-neto num ${x.neto >= 0 ? 'pos' : 'neg'}">${euros(f, x.neto)}</div>
      <div class="dec-pais-nota mc">${nota}</div>
    </div>`;
  }).join('');

  // El titular: quién gana AHORA, con SU cifra de ahora. Una frase, sin adornos.
  //
  // Con beneficio cero o negativo la pregunta no tiene respuesta útil: mudarse no cambia lo
  // que ganas, solo lo que cuesta la estructura, y decir "gana Paraguay" con un neto en
  // rojo sería un consejo que no se puede seguir. Las tarjetas siguen abajo, que ahí sí se
  // ve lo que cuesta cada sitio cuando no entra dinero.
  let titular;
  if (!ganador) {
    titular = 'Todavía no hay facturación con la que comparar países.';
  } else if (b > 0) {
    titular = `Con ${esc(euros(f, b))} facturados al año, el país que más te deja es <strong>${esc(NOMBRE_PAIS[ganador.escenario])}</strong>: ${esc(euros(f, ganador.neto))} limpios.`;
  } else {
    titular = `A tu ritmo de ahora no estás facturando nada al año, así que mudarte no cambiaría lo que ganas: solo lo que cuesta la estructura de cada sitio. Esta pregunta se contesta sola en cuanto empieces a facturar.`;
  }

  // Y el aviso que evita el consejo imposible: si Bali sale bien en la tabla pero el
  // visado no se te abre, se dice aquí y no en la letra pequeña.
  const bali = todos.find((x) => x.escenario === 'bali');
  const avisoBali = bali && !bali.detalle.califica
    ? `<p class="dec-paises-aviso">Bali está en gris a propósito: el visado E33G exige acreditar ${eurosCortos(UMBRALES_BALI.legal)} al año de ingresos y hoy facturas ${eurosCortos(b)}. Y lo que hay que acreditar con extractos es lo que TE ENTRA a ti, no lo que factura el negocio de tu socio. Por debajo de ahí Bali no es una opción cara, es que no existe.</p>`
    : '';

  // El día que se acabe la tarifa plana esta tabla cambia sola, y puede cambiar el GANADOR.
  // Decirlo aquí y no en la letra pequeña: es la única variable de esta pantalla que se mueve
  // sin que él haga nada, y tiene fecha.
  let avisoTarifaPlana = '';
  if (espana && espana.detalle.tarifaPlanaAplicada && b > 0) {
    const sinTP = ordenPaises(b, { ...o, cuotaAutonomoAnual: null }, false);
    const espanaSinTP = sinTP.find((x) => x.escenario === 'espana-autonomo');
    const ganadorSinTP = ordenPaises(b, { ...o, cuotaAutonomoAnual: null })[0];
    if (espanaSinTP && ganadorSinTP) {
      const cuestaMas = espana.neto - espanaSinTP.neto;
      const cambiaGanador = ganador && ganadorSinTP.escenario !== ganador.escenario;
      avisoTarifaPlana = `<p class="dec-paises-aviso">Esto está contado con tu tarifa plana de `
        + `${esc(euros(f, espana.detalle.cuotaReta / 12))} al mes. Cuando se te acabe, España te `
        + `costará ${esc(euros(f, cuestaMas))} más al año`
        + (cambiaGanador
          ? ` y el que más te deja pasa a ser <strong>${esc(NOMBRE_PAIS[ganadorSinTP.escenario])}</strong>. Es el dato de esta pantalla que caduca: apunta la fecha de tu alta en el RETA.`
          : `, pero ${esc(NOMBRE_PAIS[ganadorSinTP.escenario])} seguiría siendo el que más te deja.`)
        + '</p>';
    }
  }

  const cambio = cambioDeGanador(b, o);
  let siguiente;
  if (!cambio) {
    siguiente = `<p class="dec-paises-cambio">Y esto no cambia por ganar más: hasta un millón de euros al año, ${esc(NOMBRE_PAIS[ganador ? ganador.escenario : 'espana-autonomo'])} sigue siendo el que más deja. La respuesta no depende de cuánto ganes, sino de todo lo que la tabla no mide.</p>`;
  } else {
    const ventas = distanciaEnVentas(c.ctx, cambio.beneficio);
    const linea = ventas === null || !Number.isFinite(ventas)
      ? 'no puedo decirte a cuántas ventas está: con estos ajustes una venta más no mueve el beneficio.'
      : `está a <strong>${ventasTexto(ventas)} ventas más al mes</strong>.`;
    siguiente = `<p class="dec-paises-cambio">El siguiente cambio de respuesta: a partir de <strong>${eurosCortos(cambio.beneficio)}</strong> al año pasa a ganar <strong>${esc(NOMBRE_PAIS[cambio.nuevo])}</strong>, y ${linea}</p>`;
  }

  return `<p class="dec-paises-tit">${titular}</p>
    <div class="dec-paises">${filas}</div>
    ${avisoBali}
    ${avisoTarifaPlana}
    ${siguiente}
    <p class="dec-pie">Solo impuestos y estructura: no incluye lo que cuesta vivir en cada sitio, que puede darle la vuelta a todo. Y se compara con lo que TÚ facturas, no con el beneficio del negocio: mudarte cambia tu tributación, no la del negocio de tu socio. Es la misma cifra aquí, en los hitos de arriba y en "Dónde vivir": una sola para toda la app, para que no haya dos respuestas a la misma pregunta.
      <button type="button" class="btn btn-ghost dec-ir" data-ir="residencia">Ver el detalle en "Dónde vivir"</button></p>`;
}

// ---------------------------------------------------------------------------
// Render público
// ---------------------------------------------------------------------------

// ctx = { datos, modelo, beneficioAnual, rentaFiscal, situacionFiscal, patrimonio,
//         residencia, hoyISO, ventasMedia, gastosFijos, tarifaPlana, f, card }
// `rentaFiscal` (lo que factura) manda para los impuestos; `situacionFiscal` (lo devengado)
// se queda como informativo.
export function renderDecisiones(ctx) {
  const c = prepararCtx(ctx);

  set('dec-semaforo', pintarSemaforo(c));
  set('dec-hoy', pintarHoy(c));
  set('dec-alertas', pintarAlertas(c));
  set('dec-siguiente', pintarSiguiente(c));
  set('dec-camino', pintarCamino(c));
  set('dec-paises', pintarPaises(c));
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
//
// Mismo patrón que bindResidencia, bindObjetivo y bindPatrimonio: todo por delegación
// desde #v-decisiones, que no se destruye nunca, y con una marca en el dataset para no
// engancharse dos veces.
//
// El plegado del camino no pasa por aquí: son <details>, que ya sabe abrirse y cerrarse
// solo, con teclado y con lector de pantalla, sin una línea de JavaScript.
//
// handlers = { irA, rerender }
export function bindDecisiones(handlers) {
  const raiz = document.getElementById('v-decisiones');
  if (!raiz || raiz.dataset.decBind === '1') return;
  raiz.dataset.decBind = '1';

  const h = handlers || {};

  raiz.addEventListener('click', (e) => {
    const ir = e.target.closest('[data-ir]');
    if (ir && typeof h.irA === 'function') {
      h.irA(ir.dataset.ir);
    }
  });
}
