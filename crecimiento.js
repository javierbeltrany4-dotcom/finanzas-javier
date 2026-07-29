// "¿Qué palanca mueve más?", con SUS datos y no en abstracto. Sin DOM y sin fechas del
// sistema: testeable con `node --test`. El "hoy" entra SIEMPRE por `ctx.hoyISO`.
//
// POR QUÉ ESTE MÓDULO NO SE PARECE A UNA CALCULADORA DE CRECIMIENTO.
//
// Una calculadora dice "sube el precio un 20 % y ganarás un 20 % más". Eso no le sirve: él ya
// sabe que subir el precio es bueno. Lo que no sabe es cuál de las cinco cosas que podría
// hacer este mes le deja más dinero, cuánto le cuesta cada una y -la que más importa- cuáles
// dependen de él y cuáles dependen de David. Subir su porcentaje del 40 al 50 es la palanca
// más grande de todas y no la puede activar solo: eso hay que decirlo antes que el número.
//
// TRES REGLAS QUE NO SE TOCAN AQUÍ DENTRO:
//
//  · Ninguna cifra fiscal se inventa. El IRPF sale de la escala por tramos de objetivo.js y la
//    comparación entre países de residencia.js, que llevan sus fuentes dentro. Donde hay que
//    preguntar algo va LA PREGUNTA EXACTA (las de fiscal.js), no un "consúltalo".
//
//  · No se llama tendencia a lo que es ruido. `evolucionVentas` devuelve la pendiente Y el R²,
//    y con menos de tres meses -o con un ajuste malo- dice que no hay señal en vez de dibujar
//    una flecha hacia arriba. Con dos puntos la recta pasa siempre por los dos: eso no es una
//    tendencia, es geometría.
//
//  · El objetivo siguiente es el escalón, no el sueño. Si hace 3 ventas, el objetivo es 4 o 5.
//    Poner 20 no motiva: enseña que el objetivo no va en serio.

import { formatoEuros, gastoFijoMensual } from './calculos.js';

import {
  MODELO_DEFAULT,
  bolsilloRealMes,
  modeloDesdeDatos,
  normalizarModelo,
  porVenta,
  puntoMuerto,
  rentaFiscalDelAnio,
  resultadoMensual,
} from './objetivo.js';

// La comparación entre países no se reescribe aquí: es la misma que pinta "Dónde vivir".
import { compararTodos, normalizarOpciones as normalizarResidencia } from './residencia.js';

// La pregunta exacta para la asesoría sobre la mudanza. Es la del apartado 9 del informe.
import { PREGUNTAS } from './fiscal.js';

// ---------------------------------------------------------------------------
// El tamaño de cada palanca, y por qué ese y no otro
// ---------------------------------------------------------------------------

// DECISIONES DE DISEÑO, NO NORMAS. Cada palanca se mide con un paso REALISTA en su propia
// unidad, no con un porcentaje igual para todas: subir el ticket un 37 % y hacer un 37 % más
// de ventas no son dos cosas comparables en la vida real, aunque lo parezcan en una hoja.
// El paso de cada una es el que él podría intentar este mes sin cambiar de negocio.
export const PASOS = {
  // +100 € sobre un ticket de 1.497. Es una subida que se puede defender sin rehacer la oferta.
  ticket: 100,
  // Una venta más al mes. Es la unidad natural del negocio y la única que mueve él solo.
  ventas: 1,
  // Del 40 % al 50 %. Es el reparto que ya usa la pantalla "Cuánto facturar" como referencia.
  share: 50,
  // Un 20 % menos de gastos fijos del negocio. Recortar la mitad suena bien y no se sostiene.
  fijosPct: 20,
};

// Cuánto pesa cada nivel de esfuerzo al ordenar. También es una decisión de diseño: sirve para
// que una palanca enorme que exige negociar con el socio no tape a una mediana que se hace en
// una tarde. El impacto se divide entre el peso, y esa es la cuenta que ordena la lista.
const PESO_ESFUERZO = { bajo: 1, medio: 2, alto: 4 };

// Cuántos meses hacen falta para hablar de tendencia. Con dos puntos la recta es perfecta
// (R² = 1) y no significa nada: es la definición de una recta por dos puntos.
const MINIMO_PUNTOS_TENDENCIA = 3;

// Por debajo de este R² la recta no explica lo que pasa: es ruido con pendiente.
//
// Y el listón sube cuando hay pocos meses, porque con pocos puntos un R² decente sale solo:
// con cuatro meses de 3, 3, 3 y 2 ventas la recta explica un 60 % y diría "tus ventas bajan",
// cuando lo único que ha pasado es que un mes vendió una menos. Con seis meses o más, 0,5;
// por debajo, 0,7. Es una decisión de diseño y su único objetivo es no asustarle con ruido.
const R2_MINIMO = 0.5;
const R2_MINIMO_POCOS_MESES = 0.7;
const MESES_PARA_EXIGIR_MENOS_R2 = 6;

// Si en toda la ventana la recta sube o baja menos de media venta, es plano. Llamarlo
// "tendencia al alza" sería vender humo con dos decimales.
const CAMBIO_MINIMO_VENTANA = 0.5;

// Para hablar de estacionalidad hace falta ver el mismo mes al menos dos veces. Con un año de
// datos, "julio es tu mejor mes" solo significa "el julio que has vivido fue bueno".
const OBSERVACIONES_MINIMAS_ESTACIONALIDAD = 2;

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

// Número de usuario o de la hoja: vacío, null o basura -> el valor por defecto.
// El try no es paranoia: `Number(v)` LANZA un TypeError si v es un objeto con una clave
// `toString` que no sea función, y eso llega desde una copia de seguridad importada.
function num(v, porDefecto = 0) {
  if (v === null || v === undefined || v === '') return porDefecto;
  let n;
  try { n = typeof v === 'number' ? v : Number(v); } catch (e) { return porDefecto; }
  return Number.isFinite(n) ? n : porDefecto;
}

function esFecha(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ''));
}

function esMes(v) {
  return /^\d{4}-\d{2}$/.test(String(v ?? ''));
}

function eur(n) {
  const r = Math.round(num(n, 0) * 100) / 100;
  return r === 0 ? 0 : r;
}

function ventasTexto(n) {
  if (n === null || !Number.isFinite(n)) return '—';
  if (n > 0 && n < 0.05) return 'menos de 0,1';
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

function pctTexto(n) {
  return `${Number(n).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} %`;
}

// Un mes 'YYYY-MM' desplazado n meses. Aritmética de enteros a propósito: usar Date aquí
// metería la zona horaria del sistema en un módulo puro.
function mesMas(mes, n) {
  const total = Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) - 1) + n;
  const anio = Math.floor(total / 12);
  return `${String(anio).padStart(4, '0')}-${String(total - anio * 12 + 1).padStart(2, '0')}`;
}

// El mes 'YYYY-MM' de una fila. '' si la fecha no sirve.
function mesFila(x) {
  const mes = String((x && x.fecha) ?? '').slice(0, 7);
  return esMes(mes) ? mes : '';
}

// Cuántas ventas hubo en cada mes de CALENDARIO entre el primero y el último con datos.
// Los meses sin ninguna venta valen 0 y siguen en la lista: si desaparecieran, la media y la
// pendiente saldrían infladas y un mes en blanco -que es justo el dato importante- no se vería.
// `excluir` deja fuera un mes concreto (el que está a medias) para que no hunda la serie.
function ventasPorMes(ventas, excluir = '') {
  const cuenta = new Map();
  for (const v of ventas || []) {
    const mes = mesFila(v);
    if (!mes || mes === excluir) continue;
    cuenta.set(mes, (cuenta.get(mes) || 0) + 1);
  }
  if (!cuenta.size) return [];
  const meses = [...cuenta.keys()].sort();
  const primero = meses[0];
  const ultimo = meses[meses.length - 1];
  const salida = [];
  for (let m = primero; m <= ultimo; m = mesMas(m, 1)) {
    salida.push({ mes: m, ventas: cuenta.get(m) || 0 });
  }
  return salida;
}

// Regresión lineal por mínimos cuadrados sobre y = a + b·x, con x = 0, 1, 2…
// Devuelve también el R², que es lo que distingue una tendencia de una nube de puntos.
// `r2` va null cuando todos los valores son iguales: ahí no hay varianza que explicar y
// cualquier número (0 o 1) sería una respuesta a una pregunta que no se ha hecho.
function regresion(ys) {
  const n = ys.length;
  if (n < 2) return { pendiente: null, ordenada: null, r2: null };
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) { sx += i; sy += ys[i]; }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (i - mx) * (ys[i] - my);
    sxx += (i - mx) * (i - mx);
  }
  if (!(sxx > 0)) return { pendiente: null, ordenada: null, r2: null };
  const pendiente = sxy / sxx;
  const ordenada = my - pendiente * mx;
  let ssres = 0;
  let sstot = 0;
  for (let i = 0; i < n; i += 1) {
    const est = ordenada + pendiente * i;
    ssres += (ys[i] - est) * (ys[i] - est);
    sstot += (ys[i] - my) * (ys[i] - my);
  }
  return {
    pendiente,
    ordenada,
    r2: sstot > 0 ? 1 - ssres / sstot : null,
  };
}

// ---------------------------------------------------------------------------
// El contexto, normalizado una sola vez
// ---------------------------------------------------------------------------

// El MISMO ctx que decisiones.js y capital.js, para que app.js no tenga que montar otro.
function contexto(ctx) {
  const c = ctx || {};
  const datos = c.datos || {};
  const config = datos.config || {};
  const modelo = normalizarModelo(c.modelo || config.modelo || MODELO_DEFAULT);
  const hoy = esFecha(c.hoyISO) ? String(c.hoyISO) : '';
  const mes = hoy ? hoy.slice(0, 7) : '';

  const ventasMedia = c.ventasMedia === null || c.ventasMedia === undefined || c.ventasMedia === ''
    ? Math.max(0, num(modeloDesdeDatos(datos, modelo, hoy ? { hoy, mesActual: mes } : undefined).ventasMedia, 0))
    : Math.max(0, num(c.ventasMedia, 0));

  const listaGastos = Array.isArray(c.gastosFijos) ? c.gastosFijos
    : (Array.isArray(config.gastosFijos) ? config.gastosFijos : null);
  const gastosVida = listaGastos && listaGastos.length
    ? {
      total: gastoFijoMensual(listaGastos.map((g) => ({ importe: num(g && g.importe, 0) }))),
      fuente: 'datos',
    }
    : {
      total: modelo.cuotaAutonomo + modelo.deducibles + modelo.gastosPersonales,
      fuente: 'modelo',
    };

  // Su renta REAL es lo que factura, no su 40 % del beneficio del negocio. Ver la nota larga
  // de rentaFiscalDelAnio en objetivo.js.
  const rentaFiscal = c.rentaFiscal && Number.isFinite(Number(c.rentaFiscal.retiradoProyectado))
    ? c.rentaFiscal
    : rentaFiscalDelAnio(datos, modelo, hoy);
  const rentaAnual = Number.isFinite(Number(c.beneficioAnual))
    ? Math.max(0, Number(c.beneficioAnual))
    : Math.max(0, num(rentaFiscal.retiradoProyectado, 0));

  return {
    datos,
    config,
    modelo,
    hoy,
    mes,
    ventas: Array.isArray(datos.ventas) ? datos.ventas : [],
    ventasMedia,
    gastosVida,
    rentaFiscal,
    rentaAnual,
    residencia: normalizarResidencia(c.residencia),
    miParteVenta: porVenta(modelo).miParte,
  };
}

// Lo que le queda LIMPIO al año con N ventas al mes, con el IRPF real por tramos y no con la
// retención plana del 20 %. Es la vara con la que se miden todas las palancas: si una se
// midiera en facturación y otra en bolsillo, la lista no significaría nada.
function bolsilloAnual(modelo, ventas) {
  return bolsilloRealMes(modelo, ventas) * 12;
}

// ---------------------------------------------------------------------------
// Las palancas
// ---------------------------------------------------------------------------

// Las cinco cosas que puede mover, con SUS números. Cada una:
//   { nombre, cambio, impactoAnual, esfuerzo, dependeDeMi }
// más el porqué, cómo se hace y en cuántas ventas al mes se traduce el impacto.
//
// Ordenadas por impacto ENTRE esfuerzo (ver PESO_ESFUERZO). Un impacto negativo es una
// respuesta legítima y sale tal cual: mudarse hoy, con lo que factura, le cuesta dinero.
export function palancasReales(ctx) {
  const c = contexto(ctx);
  const m = c.modelo;
  const v = c.ventasMedia;
  const base = bolsilloAnual(m, v);
  const con = (cambios, ventas = v) => bolsilloAnual({ ...m, ...cambios }, ventas);

  const lista = [];

  // 1. Subir el ticket. El precio es del negocio, así que no depende solo de él.
  lista.push({
    id: 'subir-ticket',
    nombre: 'Subir el ticket',
    cambio: `De ${formatoEuros(m.ticket)} a ${formatoEuros(m.ticket + PASOS.ticket)} por venta`,
    impactoAnual: eur(con({ ticket: m.ticket + PASOS.ticket }) - base),
    esfuerzo: 'medio',
    dependeDeMi: false,
    deQuienDepende: 'De los dos: el precio es del negocio, no tuyo.',
    porQue: `Con ${ventasTexto(v)} ventas al mes, cada euro que subes el ticket entra entero: no `
      + 'cuesta más trabajo vender a 1.597 que a 1.497, cuesta más miedo.',
    comoSeHace: `Súbelo en la próxima cohorte, no en la que ya has anunciado. Y llévale a David el `
      + `número hecho: ${formatoEuros(con({ ticket: m.ticket + PASOS.ticket }) - base)} al año más `
      + 'para ti, y el doble largo para el negocio.',
  });

  // 2. Una venta más al mes. La única que mueve él solo.
  lista.push({
    id: 'mas-ventas',
    nombre: 'Una venta más al mes',
    cambio: `De ${ventasTexto(v)} a ${ventasTexto(v + PASOS.ventas)} ventas al mes`,
    impactoAnual: eur(con({}, v + PASOS.ventas) - base),
    esfuerzo: 'medio',
    dependeDeMi: true,
    deQuienDepende: 'De ti. Es la única de la lista que puedes activar tú solo, hoy.',
    porQue: `Cada venta te deja ${formatoEuros(c.miParteVenta)} antes de impuestos. Una más al mes, `
      + 'todos los meses, es lo que separa un año de otro.',
    comoSeHace: 'Escribe hoy a los tres últimos interesados que no compraron. Uno a uno, por su '
      + 'nombre, sin plantilla. Es la palanca más barata que tienes.',
  });

  // 3. Subir su porcentaje. La más grande, y la que NO depende de él.
  lista.push({
    id: 'subir-mi-porcentaje',
    nombre: 'Renegociar tu parte del beneficio',
    cambio: `Del ${pctTexto(m.miShare)} al ${pctTexto(PASOS.share)} del beneficio`,
    impactoAnual: eur(con({ miShare: PASOS.share }) - base),
    esfuerzo: 'alto',
    dependeDeMi: false,
    deQuienDepende: 'De David. Puedes pedirlo, pero la decisión no es tuya, y eso cambia cuánto '
      + 'puedes contar con este dinero.',
    porQue: 'Es la palanca más grande de la lista porque no toca el negocio: el mismo trabajo, las '
      + 'mismas ventas, los mismos gastos, y a ti te llega más.',
    comoSeHace: 'No lo plantees como "quiero más". Llévale qué parte del trabajo haces tú hoy que '
      + 'no hacías cuando pactasteis el 40/60, y qué pasaría si dejaras de hacerla. Y ponle fecha: '
      + 'una revisión al año, no una discusión abierta.',
  });

  // 4. Bajar los fijos del negocio.
  const fijosNuevos = m.fijosNegocio * (1 - PASOS.fijosPct / 100);
  lista.push({
    id: 'bajar-fijos',
    nombre: 'Recortar los gastos fijos del negocio',
    cambio: `Un ${pctTexto(PASOS.fijosPct)} menos: de ${formatoEuros(m.fijosNegocio)} a `
      + `${formatoEuros(fijosNuevos)} al mes`,
    impactoAnual: eur(con({ fijosNegocio: fijosNuevos }) - base),
    esfuerzo: 'bajo',
    dependeDeMi: false,
    deQuienDepende: 'De los dos, pero la lista de suscripciones la puedes revisar tú en una tarde.',
    porQue: `Los fijos se pagan vendas o no vendas, así que cada euro que quitas lo ganas los doce `
      + `meses. De lo que ahorra el negocio, a ti te llega tu ${pctTexto(m.miShare)}.`,
    comoSeHace: 'Abre el extracto del negocio de los últimos tres meses y marca las suscripciones '
      + 'que no habéis abierto en 30 días. Esas se cancelan hoy, no se "revisan".',
  });

  // 5. Mudarse. Aquí no se reescribe la comparación de países: se le pide a residencia.js, que
  //    es quien tiene las fuentes de cada país. Con una corrección que hay que hacer sí o sí:
  //    ese módulo supone la cuota de autónomo NORMAL, y él está en tarifa plana de 80 €/mes.
  //    Sin corregirlo, mudarse parecería mucho mejor de lo que es solo porque el comparador le
  //    está cobrando una cuota que él hoy no paga.
  lista.push(palancaMudanza(c));

  return lista
    .map((p, i) => ({
      ...p,
      impactoMensual: eur(p.impactoAnual / 12),
      // El impacto, en la única unidad que él controla: cuántas ventas al mes tendría que
      // sumar para conseguir lo mismo sin tocar esa palanca.
      equivaleAVentasAlMes: equivalenciaEnVentas(c, base, p.impactoAnual),
      ratio: p.impactoAnual / (PESO_ESFUERZO[p.esfuerzo] || 1),
      orden: i,
    }))
    .sort((a, b) => {
      if (b.ratio !== a.ratio) return b.ratio - a.ratio;
      if (b.impactoAnual !== a.impactoAnual) return b.impactoAnual - a.impactoAnual;
      return a.orden - b.orden;
    })
    .map(({ orden, ...p }) => p);
}

// Cuántas ventas AL MES habría que sumar para ganar lo mismo que da una palanca. Se busca por
// bisección sobre el propio modelo en vez de dividir por el margen: el IRPF por tramos no es
// lineal, así que dividir daría un número bonito y falso. null si no se llega ni con 10.000.
//
// Con impacto NEGATIVO va null, no 0: "0 ventas" se leería como "eso no te cuesta nada", y
// mudarse hoy le cuesta dinero. Lo que no tiene equivalencia en ventas se dice, no se redondea.
function equivalenciaEnVentas(c, base, impactoAnual) {
  if (!Number.isFinite(impactoAnual)) return null;
  if (impactoAnual === 0) return 0;
  if (impactoAnual < 0) return null;
  const objetivo = base + impactoAnual;
  const f = (v) => bolsilloAnual(c.modelo, v);
  const MAX = 10000;
  if (!(f(MAX) >= objetivo)) return null;
  let lo = c.ventasMedia;
  let hi = MAX;
  if (f(lo) >= objetivo) return 0;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= objetivo) hi = mid; else lo = mid;
  }
  return hi - c.ventasMedia;
}

function palancaMudanza(c) {
  // La comparación se hace con SU cuota de autónomo real (la tarifa plana de 80 €/mes), no
  // con la del tramo del RETA. Va como opción DENTRO del comparador y no como resta al final
  // porque la cuota es gasto deducible: bajarla sube la base del IRPF. Restarla en bruto al
  // final se saltaba ese efecto y daba una tercera cifra (-378,25 €/año en vez de -77,70).
  //
  // Es la misma opción que pasan "Dónde vivir" y "Y ahora qué": antes esta corrección vivía
  // SOLO aquí, y por eso la app coronaba a Paraguay como ganador en la pantalla de inicio
  // mientras esta pestaña decía que mudarse le CUESTA dinero.
  const cuotaSuya = c.modelo.cuotaAutonomo * 12;
  const filas = compararTodos(c.rentaAnual, { ...c.residencia, cuotaAutonomoAnual: cuotaSuya });
  const espana = filas.find((f) => f.escenario === 'espana-autonomo');
  const fuera = filas.filter((f) => f.escenario !== 'espana-autonomo' && f.escenario !== 'espana-sl');
  const mejor = fuera.length ? fuera.reduce((a, b) => (b.neto > a.neto ? b : a)) : null;

  // Lo que la tarifa plana le ahorra AL AÑO, ya con el efecto del IRPF dentro: la diferencia
  // entre el España de hoy y el España de cuando se le acabe. Es la cifra que hay que enseñar
  // para que entienda por qué la respuesta cambiará sola.
  const sinTarifaPlana = compararTodos(c.rentaAnual, { ...c.residencia, cuotaAutonomoAnual: null })
    .find((f) => f.escenario === 'espana-autonomo');
  const cuotaComparador = sinTarifaPlana ? num(sinTarifaPlana.detalle && sinTarifaPlana.detalle.cuotaReta, 0) : 0;
  const correccion = espana && sinTarifaPlana ? Math.max(0, espana.neto - sinTarifaPlana.neto) : 0;

  if (!espana || !mejor) {
    return {
      id: 'mudarse',
      nombre: 'Mudarte de país',
      cambio: 'No he podido comparar países',
      impactoAnual: 0,
      esfuerzo: 'alto',
      dependeDeMi: true,
      deQuienDepende: 'De ti, y solo de ti.',
      porQue: 'El comparador de países no ha devuelto ningún escenario con el que comparar.',
      comoSeHace: 'Abre la pestaña "Dónde vivir" y mira si los ajustes de cada país están puestos.',
      avisos: ['Faltan escenarios que comparar.'],
    };
  }

  // La corrección ya está DENTRO de `espana.neto`: no se vuelve a restar aquí.
  const impacto = eur(mejor.neto - espana.neto);
  // Y lo que saldría el día que se acabe la tarifa plana, para poder decir las dos.
  const impactoSinTarifaPlana = sinTarifaPlana ? eur(mejor.neto - sinTarifaPlana.neto) : impacto;

  return {
    id: 'mudarse',
    nombre: 'Mudarte de país',
    cambio: `De España a ${mejor.nombre}, con lo que facturas hoy (${formatoEuros(c.rentaAnual)} al año)`,
    impactoAnual: impacto,
    esfuerzo: 'alto',
    dependeDeMi: true,
    deQuienDepende: 'De ti, y solo de ti. Es la única de la lista que no tienes que negociar con nadie.',
    porQue: impacto > 0
      ? `Con lo que facturas hoy, ${mejor.nombre} te dejaría ${formatoEuros(impacto)} más al año que `
        + 'España, ya descontado lo que te ahorra la tarifa plana mientras la tengas.'
      : `Con lo que facturas hoy, mudarte te CUESTA ${formatoEuros(Math.abs(impacto))} al año: la `
        + 'estructura de allí es fija y tu factura fiscal española es pequeña. Esta palanca se '
        + 'enciende cuando factures mucho más, no ahora.',
    comoSeHace: impacto > 0
      ? 'Antes de mover nada, mándale esta pregunta a tu asesoría tal cual: ' + PREGUNTAS.mudanza
      : 'Nada, hoy. Vuelve a mirarlo cuando dupliques lo que facturas; la pestaña "Dónde vivir" '
        + 'te dice el umbral exacto en ventas al mes.',
    // La corrección de la tarifa plana, expuesta para poder auditarla a mano.
    correccionTarifaPlana: eur(correccion),
    impactoAnualSinTarifaPlana: impactoSinTarifaPlana,
    escenario: mejor.escenario,
    avisos: [
      `Contado con TU cuota de autónomo (${formatoEuros(cuotaSuya)} al año con la tarifa plana), no `
        + `con la del tramo del RETA (${formatoEuros(cuotaComparador)}), que es la que sale cuando se `
        + `te acabe. Eso son ${formatoEuros(correccion)} al año que España te ahorra hoy. El día que `
        + `se acabe, mudarte a ${mejor.nombre} pasa a `
        + `${impactoSinTarifaPlana > 0 ? `darte ${formatoEuros(impactoSinTarifaPlana)}` : `costarte ${formatoEuros(Math.abs(impactoSinTarifaPlana))}`} al año.`,
      ...(Array.isArray(mejor.avisos) ? mejor.avisos : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// ¿Suben o bajan las ventas?
// ---------------------------------------------------------------------------

// La tendencia REAL de sus ventas, con la pendiente y el R² al lado para poder desconfiar de
// ella. `meses` acota la ventana a los N últimos meses de calendario.
//
// `opciones.mesEnCurso` ('YYYY-MM') deja fuera el mes que aún no ha terminado: el día 3 de
// agosto, con una venta hecha, agosto arrastraría la recta hacia abajo y diría que el negocio
// se hunde. Sin él se cuenta todo lo que llegue, que es la conducta de siempre.
//
// LO QUE NO HACE: no llama tendencia a dos puntos. Con menos de tres meses devuelve
// `tendencia: 'sin-senal'` y lo dice en el texto, porque por dos puntos pasa siempre una recta
// perfecta y el R² sale 1 sin que eso signifique absolutamente nada.
export function evolucionVentas(datos, meses, opciones) {
  const d = datos || {};
  const o = opciones || {};
  const excluir = esMes(o.mesEnCurso) ? String(o.mesEnCurso) : '';
  const pedidos = Math.max(1, Math.trunc(num(meses, 12)));

  const todos = ventasPorMes(Array.isArray(d.ventas) ? d.ventas : [], excluir);
  const puntos = todos.slice(Math.max(0, todos.length - pedidos));
  const n = puntos.length;

  const vacio = {
    puntos,
    n,
    pendiente: null,
    pendienteAlAno: null,
    r2: null,
    r2Exigido: null,
    tendencia: 'sin-senal',
    haySenal: false,
    media: null,
    primera: null,
    ultima: null,
    texto: '',
    avisos: [],
  };

  if (!n) {
    return {
      ...vacio,
      texto: 'No hay ninguna venta apuntada, así que no hay nada que medir.',
      avisos: ['Sin ventas no hay tendencia. Cuando entren los datos de Tradingverso, esto se '
        + 'llena solo.'],
    };
  }

  const ys = puntos.map((p) => p.ventas);
  const media = ys.reduce((a, b) => a + b, 0) / n;
  const primera = puntos[0];
  const ultima = puntos[n - 1];
  const { pendiente, r2 } = regresion(ys);

  if (n < MINIMO_PUNTOS_TENDENCIA) {
    return {
      ...vacio,
      pendiente,
      pendienteAlAno: pendiente === null ? null : pendiente * 12,
      // El R² se devuelve en null a propósito aunque la cuenta salga: con dos puntos vale 1
      // SIEMPRE, y enseñar un 1 al lado de la palabra "tendencia" es la peor mentira posible.
      r2: null,
      media,
      primera,
      ultima,
      texto: `Solo tengo ${n} ${n === 1 ? 'mes' : 'meses'} de datos. Por dos puntos pasa siempre `
        + 'una recta, así que cualquier tendencia que te dijera aquí me la estaría inventando.',
      avisos: [`Hacen falta al menos ${MINIMO_PUNTOS_TENDENCIA} meses cerrados para hablar de `
        + 'tendencia. Mientras tanto, mira el número suelto de cada mes, que ese sí es un dato.'],
    };
  }

  const cambioVentana = pendiente === null ? 0 : pendiente * (n - 1);
  const avisos = [];

  // Todos los meses iguales: no hay varianza que explicar. No es ruido ni tendencia: es plano,
  // y decirlo así es más útil que cualquier estadístico.
  if (r2 === null) {
    return {
      ...vacio,
      pendiente,
      pendienteAlAno: pendiente === null ? null : pendiente * 12,
      r2: null,
      tendencia: 'plana',
      haySenal: false,
      media,
      primera,
      ultima,
      texto: `Llevas ${n} meses clavado en ${ventasTexto(media)} ventas. Ni sube ni baja: eso no es `
        + 'una racha, es tu ritmo. Para cambiarlo hay que cambiar algo, no esperar.',
      avisos: ['Un ritmo constante es una buena noticia y una mala a la vez: es predecible, y no '
        + 'crece solo.'],
    };
  }

  const r2Exigido = n >= MESES_PARA_EXIGIR_MENOS_R2 ? R2_MINIMO : R2_MINIMO_POCOS_MESES;
  if (r2 < r2Exigido) {
    return {
      ...vacio,
      pendiente,
      pendienteAlAno: pendiente * 12,
      r2,
      r2Exigido,
      tendencia: 'sin-senal',
      haySenal: false,
      media,
      primera,
      ultima,
      texto: `Tus ventas van dando tumbos: la recta que mejor las explica solo acierta un `
        + `${pctTexto(r2 * 100)} de lo que pasa, y con ${n} meses haría falta un `
        + `${pctTexto(r2Exigido * 100)} para fiarse. Hay meses buenos y malos, pero no hay una `
        + `dirección. Tu media son ${ventasTexto(media)} ventas al mes.`,
      avisos: ['No tomes decisiones con esta pendiente: no significa nada. Usa la media, que sí es '
        + 'un dato.'],
    };
  }

  if (Math.abs(cambioVentana) < CAMBIO_MINIMO_VENTANA) {
    return {
      ...vacio,
      pendiente,
      pendienteAlAno: pendiente * 12,
      r2,
      r2Exigido,
      tendencia: 'plana',
      haySenal: false,
      media,
      primera,
      ultima,
      texto: `En estos ${n} meses la línea se ha movido menos de media venta en total. Es plano: `
        + `sigues en ${ventasTexto(media)} ventas al mes.`,
      avisos: ['Plano no es malo, pero tampoco crece. Si quieres que suba, mira las palancas.'],
    };
  }

  const sube = pendiente > 0;
  if (n < 6) {
    avisos.push(`La tendencia sale de ${n} meses: es una señal, no una certeza. Con un par de `
      + 'meses más se confirma o se cae.');
  }

  return {
    puntos,
    n,
    pendiente,
    pendienteAlAno: pendiente * 12,
    r2,
    r2Exigido,
    tendencia: sube ? 'sube' : 'baja',
    haySenal: true,
    media,
    primera,
    ultima,
    texto: `${sube ? 'Suben' : 'Bajan'}: ${ventasTexto(Math.abs(pendiente))} `
      + `${Math.abs(pendiente) === 1 ? 'venta' : 'ventas'} al mes `
      + `${sube ? 'más' : 'menos'} cada mes que pasa, y la recta explica un ${pctTexto(r2 * 100)} `
      + `de lo que ha pasado. En estos ${n} meses eso son ${ventasTexto(Math.abs(cambioVentana))} `
      + `ventas de ${sube ? 'subida' : 'bajada'}: de ${primera.ventas} en ${primera.mes} a `
      + `${ultima.ventas} en ${ultima.mes}.`,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// Estacionalidad
// ---------------------------------------------------------------------------

// Qué meses son mejores, CON SUS DATOS. Y con la honestidad por delante: para decir que julio
// es su mejor mes hay que haber visto al menos dos julios. Con un año de datos esto no es
// estacionalidad, es la lista de lo que ha pasado, y sale marcado como tal (`haySenal: false`).
//
// Un mes dentro de su historia SIN ventas cuenta como un cero observado, no como un hueco: si
// desapareciera, un mes en blanco -que es el dato más importante que hay- se volvería invisible.
export function estacionalidad(datos) {
  const d = datos || {};
  const serie = ventasPorMes(Array.isArray(d.ventas) ? d.ventas : []);

  const porMes = NOMBRES_MES.map((nombre, i) => ({
    mes: String(i + 1).padStart(2, '0'),
    nombre,
    ventas: 0,
    observaciones: 0,
    anios: [],
    media: null,
  }));

  for (const p of serie) {
    const idx = Number(p.mes.slice(5, 7)) - 1;
    const fila = porMes[idx];
    fila.ventas += p.ventas;
    fila.observaciones += 1;
    fila.anios.push(p.mes.slice(0, 4));
  }
  porMes.forEach((f) => {
    f.media = f.observaciones > 0 ? f.ventas / f.observaciones : null;
  });

  const observados = porMes.filter((f) => f.observaciones > 0);
  const aniosConDatos = new Set(serie.map((p) => p.mes.slice(0, 4))).size;
  // Un mes "repetido" es uno que ha vivido al menos dos veces (dos eneros, dos julios). Y para
  // hablar de patrón hacen falta al menos dos meses así: con uno solo repetido, lo único que se
  // puede decir es que ese mes concreto se pareció al del año pasado, no que el año tenga forma.
  const repetidos = porMes.filter((f) => f.observaciones >= OBSERVACIONES_MINIMAS_ESTACIONALIDAD);
  const haySenal = repetidos.length >= 2;

  if (!observados.length) {
    return {
      porMes,
      mejor: null,
      peor: null,
      haySenal: false,
      mesesConDatos: 0,
      aniosConDatos: 0,
      mesesRepetidos: 0,
      texto: 'No hay ninguna venta apuntada, así que no hay meses que comparar.',
      avisos: ['Sin ventas no hay estacionalidad. Cuando entren los datos, esto se llena solo.'],
    };
  }

  const mejor = observados.reduce((a, b) => (b.media > a.media ? b : a));
  const peor = observados.reduce((a, b) => (b.media < a.media ? b : a));

  const avisos = [];
  if (!haySenal) {
    avisos.push(`Esto NO es estacionalidad: solo tienes ${observados.length} `
      + `${observados.length === 1 ? 'mes' : 'meses'} de historia y ningún mes se repite lo `
      + `suficiente. Para decir "en agosto siempre vendo menos" hay que haber visto al menos dos `
      + 'agostos. Hasta entonces, esto es la lista de lo que ha pasado, no un patrón.');
    avisos.push('No cambies nada por estos números todavía. Lo único que puedes hacer hoy es '
      + 'seguir apuntando: dentro de un año esta misma pantalla ya te dirá algo de verdad.');
  } else {
    avisos.push(`Con ${aniosConDatos} años de datos y ${repetidos.length} meses repetidos, esto ya `
      + `empieza a ser un patrón. Prepara la campaña de ${mejor.nombre} con un mes de antelación y `
      + `no montes lanzamientos en ${peor.nombre}.`);
  }

  return {
    porMes,
    mejor: { mes: mejor.mes, nombre: mejor.nombre, media: mejor.media, observaciones: mejor.observaciones },
    peor: { mes: peor.mes, nombre: peor.nombre, media: peor.media, observaciones: peor.observaciones },
    haySenal,
    mesesConDatos: observados.length,
    aniosConDatos,
    mesesRepetidos: repetidos.length,
    texto: haySenal
      ? `Tu mejor mes es ${mejor.nombre} (${ventasTexto(mejor.media)} ventas de media) y el peor, `
        + `${peor.nombre} (${ventasTexto(peor.media)}).`
      : `Hasta ahora, el mes que más has vendido es ${mejor.nombre} (${mejor.ventas} `
        + `${mejor.ventas === 1 ? 'venta' : 'ventas'}) y el que menos, ${peor.nombre} `
        + `(${peor.ventas}). Es lo que ha pasado, no lo que suele pasar.`,
    avisos,
  };
}

// ---------------------------------------------------------------------------
// Los tres futuros
// ---------------------------------------------------------------------------

// Tres escenarios y ni uno más: si sigue igual, si mejora al ritmo actual, y si no vende nada
// más. El tercero es el que de verdad hace falta ver, y es el que ninguna app enseña.
//
// Cada escenario dice si está MEDIDO (`medido: true`, sale de sus datos) o si es un supuesto
// elegido (`medido: false`). Mezclarlos sin decirlo es cómo se cuelan las promesas.
export function proyeccionRealista(ctx, meses) {
  const c = contexto(ctx);
  const n = Math.max(1, Math.min(120, Math.trunc(num(meses, 12))));
  const desde = c.mes ? mesMas(c.mes, 1) : '';
  const evo = evolucionVentas(c.datos, 12, c.mes ? { mesEnCurso: c.mes } : undefined);

  const construir = (id, nombre, ventasDe, supuesto, medido) => {
    const ventasPorMes2 = [];
    let ventasTotales = 0;
    let miParteTotal = 0;
    let bolsilloTotal = 0;
    for (let i = 0; i < n; i += 1) {
      const v = Math.max(0, ventasDe(i));
      const mes = desde ? mesMas(desde, i) : '';
      const r = resultadoMensual(c.modelo, v);
      ventasPorMes2.push({ mes, ventas: v, miParte: eur(r.miParte) });
      ventasTotales += v;
      miParteTotal += r.miParte;
      bolsilloTotal += bolsilloRealMes(c.modelo, v);
    }
    const ultima = ventasPorMes2[ventasPorMes2.length - 1];
    return {
      id,
      nombre,
      supuesto,
      medido,
      ventasPorMes: ventasPorMes2,
      ventasTotales: Math.round(ventasTotales * 10) / 10,
      ventasAlMesAlFinal: ultima ? ultima.ventas : 0,
      miParteTotal: eur(miParteTotal),
      bolsilloTotal: eur(bolsilloTotal),
      // Lo que le queda cada mes de media en este escenario, ya con el IRPF real.
      bolsilloMedioMes: eur(bolsilloTotal / n),
    };
  };

  const escenarios = [];

  escenarios.push(construir(
    'igual',
    'Si sigue igual',
    () => c.ventasMedia,
    `${ventasTexto(c.ventasMedia)} ventas al mes, que es tu media real de los últimos meses `
      + 'cerrados. Sin subir el precio, sin cambiar nada.',
    true,
  ));

  // "Mejorar al ritmo actual" solo es un dato si hay un ritmo medido. Si no lo hay, el escenario
  // NO desaparece -sigue siendo la pregunta que él se hace- pero se dice que el ritmo lo ha
  // puesto la app como supuesto, no los datos.
  const hayRitmo = evo.haySenal && evo.tendencia === 'sube' && evo.pendiente > 0;
  escenarios.push(hayRitmo
    ? construir(
      'mejora',
      'Si mejora al ritmo actual',
      (i) => c.ventasMedia + evo.pendiente * (i + 1),
      `Sumando ${ventasTexto(evo.pendiente)} ventas cada mes, que es la pendiente medida de tus `
        + `últimos ${evo.n} meses (R² ${pctTexto(evo.r2 * 100)}). Es una tendencia real, no un deseo.`,
      true,
    )
    : construir(
      'mejora',
      'Si mejora al ritmo actual',
      () => c.ventasMedia + 1,
      'SUPUESTO, NO MEDIDO: no hay ninguna tendencia en tus datos que se pueda proyectar, así que '
        + 'aquí he puesto una venta más al mes desde ya. No es una previsión: es la pregunta '
        + '"¿y si vendo una más?" contestada con tus números.',
      false,
    ));

  const escenarioNada = construir(
    'nada',
    'Si no vendes nada más',
    () => 0,
    'Cero ventas desde el mes que viene. Los gastos fijos del negocio siguen corriendo y tu parte '
      + 'de esa pérdida sigue siendo tuya. Este es el escenario que hay que poder mirar sin '
      + 'apartar la vista.',
    true,
  );
  // Cuánto se le va cada mes en el escenario de que se pare todo: su parte de la pérdida del
  // negocio MÁS lo que le cuesta vivir. Es el número que dice cuánto margen tiene de verdad.
  const perdidaMes = resultadoMensual(c.modelo, 0).miParte;
  escenarioNada.quemaMensual = eur(c.gastosVida.total - perdidaMes);
  escenarios.push(escenarioNada);

  const avisos = [];
  avisos.push('Los tres son cuentas, no predicciones. El único que puedes cambiar tú es el '
    + 'primero, y se cambia vendiendo.');
  if (!hayRitmo) {
    avisos.push(`El escenario de mejora NO está medido: ${evo.texto || 'no hay tendencia en tus datos'} `
      + 'Ese "+1 venta" lo he puesto yo para que tengas con qué comparar; no salió de ningún dato.');
  }
  avisos.push(`Si mañana se para todo, se te van ${formatoEuros(escenarioNada.quemaMensual)} al mes `
    + 'entre tu vida y tu parte de los fijos del negocio. Mira cuántos meses de colchón tienes '
    + 'en "Reparto de capital": ese es el plazo real que tendrías para reaccionar.');
  if (c.gastosVida.fuente === 'modelo') {
    avisos.push('Tus gastos fijos no están apuntados y he usado los del modelo (cuota + asesoría + '
      + 'gastos personales). Si pagas alquiler o comida, la quema mensual es mayor. Apúntalos en '
      + 'la pestaña de Gastos.');
  }

  return {
    meses: n,
    desde,
    ventasMedia: c.ventasMedia,
    escenarios,
    tendencia: {
      tendencia: evo.tendencia,
      haySenal: evo.haySenal,
      pendiente: evo.pendiente,
      r2: evo.r2,
      n: evo.n,
    },
    avisos,
  };
}

// ---------------------------------------------------------------------------
// El siguiente escalón
// ---------------------------------------------------------------------------

// El próximo objetivo ALCANZABLE, no el sueño. Si hace 3 ventas, el objetivo es 4 o 5, nunca 20.
//
// LA REGLA, entera y con su porqué:
//   1. Si todavía no cubre el punto muerto, el objetivo ES el punto muerto. No hay nada que
//      discutir por encima de eso: por debajo, cada mes cierra en rojo.
//   2. Si no, el objetivo es el mayor de estos dos: el siguiente número entero por encima de su
//      media, y UNO MÁS de lo que ya ha demostrado que puede hacer en su mejor mes. Lo segundo
//      es lo que evita poner un objetivo que ya cumplió tres veces.
//   3. Con un techo: nunca más de una vez y media su media. Ese techo es el que impide que un
//      mes anómalo -uno bueno de verdad, de esos que pasan una vez- convierta el objetivo en
//      algo que no va a volver a pasar. Es una decisión de diseño, no una ley.
export function siguienteObjetivoSensato(ctx) {
  const c = contexto(ctx);
  const media = c.ventasMedia;
  const suelo = puntoMuerto(c.modelo);

  const serie = ventasPorMes(c.ventas, c.mes);
  const mejorMes = serie.length
    ? serie.reduce((a, b) => (b.ventas > a.ventas ? b : a))
    : null;
  const probado = mejorMes ? mejorMes.ventas : 0;

  const siguienteEntero = Math.floor(media) + 1;
  const sobreLoProbado = probado + 1;
  const techo = Math.max(siguienteEntero, Math.ceil(media * 1.5));
  let objetivo = Math.min(Math.max(siguienteEntero, sobreLoProbado), techo);
  let mandaElSuelo = false;
  if (suelo !== null && objetivo < suelo) {
    objetivo = Math.ceil(suelo);
    mandaElSuelo = true;
  }

  const faltan = Math.max(0, objetivo - media);
  const base = bolsilloAnual(c.modelo, media);
  const conObjetivo = bolsilloAnual(c.modelo, objetivo);
  const impactoAnual = eur(conObjetivo - base);

  // Qué desbloquea llegar ahí. Solo umbrales que se pueden calcular con sus datos: el punto
  // muerto (objetivo.js) y el mes de vida cubierto (sus gastos fijos). Nada de hitos inventados.
  const desbloquea = [];
  if (suelo !== null && media < suelo && objetivo >= suelo) {
    desbloquea.push({
      id: 'punto-muerto',
      texto: `A partir de ${ventasTexto(suelo)} ventas el negocio deja de perder dinero. Con `
        + `${objetivo} lo cruzas.`,
    });
  }
  const miParteAhora = resultadoMensual(c.modelo, media).miParte;
  const miParteObjetivo = resultadoMensual(c.modelo, objetivo).miParte;
  if (c.gastosVida.total > 0 && miParteAhora < c.gastosVida.total && miParteObjetivo >= c.gastosVida.total) {
    desbloquea.push({
      id: 'gastos-vida',
      texto: `Tu vida cuesta ${formatoEuros(c.gastosVida.total)} al mes. Con ${objetivo} ventas tu `
        + `parte sube a ${formatoEuros(miParteObjetivo)} y el negocio te la paga entero.`,
    });
  }

  const porque = mandaElSuelo
    ? `Tu media son ${ventasTexto(media)} ventas al mes y el negocio no empieza a ganar dinero `
      + `hasta ${ventasTexto(suelo)}. Por eso el objetivo no lo elijo yo: es ${objetivo}, que es lo `
      + 'mínimo para que el mes no cierre en rojo. Todo lo demás viene después de esto.'
    : `Tu media son ${ventasTexto(media)} ventas al mes`
      + (mejorMes ? ` y tu mejor mes fueron ${probado} (${mejorMes.mes})` : '')
      + `. El objetivo es ${objetivo}: uno más de lo que ya has demostrado que puedes hacer. `
      + 'No pongo 10 ni 20 porque un objetivo que no te crees no es un objetivo, es una excusa '
      + 'para no empezar.';

  const plazo = faltan <= 1 ? 'este mes' : 'este trimestre';
  const comoSeHace = faltan <= 0
    ? `Ya estás en ${ventasTexto(media)}: mantenlo dos meses seguidos y el siguiente objetivo sube solo.`
    : `Te ${faltan <= 1 ? 'falta' : 'faltan'} ${ventasTexto(faltan)} `
      + `${faltan === 1 ? 'venta' : 'ventas'} al mes. Escribe hoy a los interesados que no `
      + `compraron y cierra ${Math.ceil(faltan)} más este mes. `
      + `Si MANTIENES ese ritmo todo el año, son ${formatoEuros(impactoAnual)} más para ti; `
      + `hacerlo un mes suelto son ${formatoEuros(eur(impactoAnual / 12))}.`;

  const avisos = [];
  if (!mejorMes) {
    avisos.push('Todavía no hay ningún mes cerrado con ventas, así que el objetivo sale solo de tu '
      + 'media. En cuanto tengas un mes completo, este número se ajusta a lo que sabes hacer.');
  }
  if (objetivo === techo && sobreLoProbado > techo) {
    avisos.push(`Tu mejor mes (${probado} ventas) se sale mucho de tu media. He puesto el objetivo `
      + `en ${objetivo} y no en ${sobreLoProbado} a propósito: repetir un mes excepcional no es un `
      + 'objetivo, es esperar que se repita la suerte.');
  }
  avisos.push(`${objetivo} ventas al mes son ${formatoEuros(resultadoMensual(c.modelo, objetivo).facturacion)} `
    + `de facturación del negocio y ${formatoEuros(miParteObjetivo)} tuyos antes de impuestos.`);

  return {
    ventasAhora: media,
    objetivoVentas: objetivo,
    ventasQueFaltan: faltan,
    // La unidad importa: esto es un cambio de RITMO, no un montón de ventas que se acumula.
    unidad: 'ventas/mes',
    mejorMesReal: mejorMes ? { mes: mejorMes.mes, ventas: mejorMes.ventas } : null,
    yaLoHizo: probado >= objetivo,
    puntoMuerto: suelo,
    mandaElPuntoMuerto: mandaElSuelo,
    techo,
    porque,
    plazo,
    comoSeHace,
    impactoMensual: eur(impactoAnual / 12),
    impactoAnual,
    miParteAhora: eur(miParteAhora),
    miParteObjetivo: eur(miParteObjetivo),
    desbloquea,
    avisos,
  };
}
