/**
 * SINCRONIZACIÓN DEL DASHBOARD FINANCIERO — código para Google Apps Script
 * ---------------------------------------------------------------------------
 * Esto NO forma parte de la web. Es el código que TÚ pegas en Google Apps Script,
 * dentro de tu propia hoja de cálculo. La web habla con él y él guarda y devuelve
 * tus datos. Nadie más que tú lo toca.
 *
 * Paso a paso para alguien no técnico: docs/COMO-CONFIGURAR-SYNC.md
 *
 * ###########################################################################
 * #  LO ÚNICO QUE TIENES QUE CAMBIAR ES LA LÍNEA DE `CLAVE_SECRETA`.        #
 * #  Esa clave NO se escribe en ningún fichero del repositorio: el repo es  #
 * #  público. Vive aquí (en tu script privado) y en el navegador de tus     #
 * #  dispositivos. En ningún otro sitio.                                    #
 * ###########################################################################
 */

// ---------------------------------------------------------------------------
// 1. CONFIGURACIÓN
// ---------------------------------------------------------------------------

/**
 * TU CLAVE SECRETA. Cámbiala AHORA por una cadena larga y aleatoria (mínimo 16
 * caracteres; 40 es mejor). Tiene que ser exactamente la misma que teclees luego
 * en el dashboard, carácter por carácter, sin espacios delante ni detrás.
 *
 * Es lo único que protege tus datos: la dirección de esta aplicación web es
 * pública, porque si no, el navegador no podría llamarla sin pedirte permisos.
 */
var CLAVE_SECRETA = 'CAMBIA-ESTO-POR-UNA-CLAVE-LARGA-Y-ALEATORIA';

/**
 * Nombre de la pestaña donde se guardan los datos. Si no existe, el script la crea.
 * No hace falta que la toques a mano nunca.
 */
var NOMBRE_HOJA = 'RESPALDO';

/**
 * Pestaña donde se guarda el historial de todos los guardados. Es la red de seguridad:
 * aunque un día se guarde algo mal, las versiones anteriores siguen ahí.
 */
var NOMBRE_HISTORIAL = 'HISTORIAL';

/** Cuántas versiones antiguas se conservan en el historial antes de ir borrando. */
var MAX_HISTORIAL = 200;

/**
 * Sólo si pegas este script en un proyecto SUELTO (no dentro de la hoja): pon aquí el
 * identificador de tu hoja de cálculo, el trozo largo de su dirección entre "/d/" y
 * "/edit". Si has seguido la guía y abriste el editor desde Extensiones > Apps Script,
 * déjalo vacío.
 */
var ID_HOJA = '';

// ---------------------------------------------------------------------------
// 2. PUNTO DE ENTRADA
// ---------------------------------------------------------------------------

/**
 * Google llama a esta función cada vez que alguien abre la dirección de la aplicación
 * web. Recibe los parámetros de la URL en `e.parameter`:
 *
 *   clave    -> el secreto; si no coincide, no se hace nada
 *   accion   -> 'leer' o 'guardar'
 *   datos    -> (sólo al guardar) el JSON del dashboard, como texto
 *   callback -> el nombre de la función JavaScript a la que hay que llamar al responder
 *
 * SIEMPRE responde en formato JSONP, es decir: `nombreDelCallback({...})`. Es la única
 * manera de que una web estática pueda leer la respuesta sin un servidor propio.
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = nombreCallbackSeguro(params.callback);

  try {
    // --- Puerta de entrada -------------------------------------------------
    // Si la clave no coincide, se responde 'No autorizado' y punto. No se dice si
    // falta, si es corta o si se parece: quien esté probando URLs no aprende nada.
    if (!claveCorrecta(params.clave)) {
      return responder(callback, { ok: false, error: 'No autorizado' });
    }

    var accion = String(params.accion || '');

    if (accion === 'leer') {
      return responder(callback, leer());
    }

    if (accion === 'guardar') {
      if (params.datos === undefined || params.datos === null || params.datos === '') {
        return responder(callback, { ok: false, error: 'No han llegado datos que guardar' });
      }
      return responder(callback, guardar(String(params.datos)));
    }

    return responder(callback, { ok: false, error: 'Accion no reconocida' });

  } catch (err) {
    // Nunca se devuelve el error interno tal cual: podría filtrar el nombre de la hoja
    // o rutas del script. En el registro de ejecuciones de Apps Script sí queda entero.
    Logger.log('Error en doGet: ' + err);
    return responder(callback, { ok: false, error: 'Error interno del script' });
  }
}

// ---------------------------------------------------------------------------
// 3. COMPROBACIÓN DE LA CLAVE
// ---------------------------------------------------------------------------

/**
 * Compara la clave recibida con la de arriba.
 *
 * La comparación recorre SIEMPRE la misma cantidad de caracteres aunque falle en el
 * primero. Es una precaución barata contra quien mida cuánto tarda en responder para
 * ir adivinando la clave letra a letra.
 */
function claveCorrecta(recibida) {
  var a = String(recibida || '');
  var b = String(CLAVE_SECRETA || '');
  // Una clave sin cambiar o vacía deja la hoja abierta: mejor cerrarla del todo.
  if (b.length < 16 || b.indexOf('CAMBIA-ESTO') === 0) return false;
  if (a.length !== b.length) return false;
  var diferencias = 0;
  for (var i = 0; i < b.length; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) diferencias++;
  }
  return diferencias === 0;
}

// ---------------------------------------------------------------------------
// 4. LA HOJA
// ---------------------------------------------------------------------------

/** El libro de cálculo: el que contiene este script, o el de ID_HOJA si lo has puesto. */
function libro() {
  if (ID_HOJA) return SpreadsheetApp.openById(ID_HOJA);
  var activo = SpreadsheetApp.getActive();
  if (!activo) {
    throw new Error('No hay hoja de calculo asociada. Rellena ID_HOJA arriba.');
  }
  return activo;
}

/**
 * Devuelve la pestaña de respaldo, creándola con sus cabeceras si es la primera vez.
 * Los datos van SIEMPRE en la misma celda, A2. La fecha del último guardado, en B2.
 */
function hojaRespaldo() {
  var ss = libro();
  var hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HOJA);
    hoja.getRange('A1').setValue('DATOS (no tocar a mano)');
    hoja.getRange('B1').setValue('ULTIMO GUARDADO');
    hoja.setFrozenRows(1);
    // Texto plano: así Google no intenta interpretar el JSON como fórmula ni como fecha.
    hoja.getRange('A2:B2').setNumberFormat('@');
  }
  return hoja;
}

/** Pestaña del historial, creándola si hace falta. */
function hojaHistorial() {
  var ss = libro();
  var hoja = ss.getSheetByName(NOMBRE_HISTORIAL);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HISTORIAL);
    hoja.getRange('A1').setValue('FECHA');
    hoja.getRange('B1').setValue('DATOS');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// ---------------------------------------------------------------------------
// 5. LEER Y GUARDAR
// ---------------------------------------------------------------------------

/**
 * Devuelve lo que haya en A2 tal cual, como TEXTO. No se hace JSON.parse aquí a
 * propósito: si la celda estuviera corrupta, el script reventaría y el usuario sólo
 * vería "Error interno". Enviándolo crudo, es la web la que avisa de qué pasa.
 *
 * -> { ok: true, existe: true|false, fecha: '...', datos: '...' }
 */
function leer() {
  var hoja = hojaRespaldo();
  var datos = String(hoja.getRange('A2').getValue() || '');
  var fecha = hoja.getRange('B2').getValue();
  return {
    ok: true,
    existe: datos.length > 0,
    fecha: fecha ? aIso(fecha) : '',
    datos: datos
  };
}

/**
 * Escribe el JSON en A2 y la fecha en B2, y añade una copia al historial.
 *
 * El candado (LockService) evita que dos dispositivos que guardan a la vez se pisen a
 * mitad de escritura. Espera hasta 10 segundos; si no lo consigue, avisa en vez de
 * escribir a medias.
 *
 * -> { ok: true, fecha: '...' }
 */
function guardar(datos) {
  // Una celda de Google Sheets admite unos 50.000 caracteres. La web ya corta en 6.000
  // (el límite real es la longitud de la URL), pero se comprueba también por aquí.
  if (datos.length > 45000) {
    return { ok: false, error: 'Los datos son demasiado grandes para una celda' };
  }

  var candado = LockService.getScriptLock();
  if (!candado.tryLock(10000)) {
    return { ok: false, error: 'La hoja esta ocupada, vuelve a intentarlo' };
  }

  try {
    var ahora = new Date();
    var iso = aIso(ahora);

    var hoja = hojaRespaldo();
    hoja.getRange('A2').setNumberFormat('@').setValue(datos);
    hoja.getRange('B2').setNumberFormat('@').setValue(iso);

    apuntarEnHistorial(iso, datos);

    // Sin esto, Apps Script podría terminar antes de que la escritura llegue a la hoja.
    SpreadsheetApp.flush();

    return { ok: true, fecha: iso };
  } finally {
    candado.releaseLock();
  }
}

/**
 * Añade una fila al historial y va tirando las más viejas cuando pasa de MAX_HISTORIAL.
 * Si esto falla no se rompe el guardado: el historial es un extra, no lo importante.
 */
function apuntarEnHistorial(iso, datos) {
  try {
    var hoja = hojaHistorial();
    hoja.appendRow([iso, datos]);
    var filas = hoja.getLastRow() - 1; // sin contar la cabecera
    if (filas > MAX_HISTORIAL) {
      hoja.deleteRows(2, filas - MAX_HISTORIAL);
    }
  } catch (err) {
    Logger.log('No se pudo escribir el historial: ' + err);
  }
}

// ---------------------------------------------------------------------------
// 6. RESPUESTA JSONP
// ---------------------------------------------------------------------------

/**
 * El nombre del callback llega por la URL y acaba escrito dentro de la respuesta, así
 * que se filtra: sólo letras, números, guion bajo, dólar y punto. Cualquier otra cosa
 * se descarta y se usa un nombre fijo. Sin este filtro, alguien podría colar código.
 */
function nombreCallbackSeguro(nombre) {
  var n = String(nombre || '');
  return /^[A-Za-z0-9_$.]{1,64}$/.test(n) ? n : 'callback';
}

/**
 * Envuelve la respuesta en la llamada al callback. El tipo JAVASCRIPT es lo que hace
 * que el navegador la ejecute al cargarla con una etiqueta <script>.
 */
function responder(callback, objeto) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(objeto) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/** Fecha -> texto ISO ('2026-07-28T09:00:00.000Z'). Es lo que entiende el dashboard. */
function aIso(valor) {
  if (valor instanceof Date) return valor.toISOString();
  return String(valor);
}

// ---------------------------------------------------------------------------
// 7. PRUEBA RÁPIDA (opcional)
// ---------------------------------------------------------------------------

/**
 * Selecciona esta función en el editor y pulsa "Ejecutar" para comprobar que el script
 * puede escribir y leer en tu hoja. Deja escrito un dato de prueba que se sobrescribe
 * en cuanto sincronices de verdad desde el dashboard. Mira el resultado en el panel
 * "Registro de ejecución" de abajo.
 */
function probar() {
  var r1 = guardar('{"prueba":true}');
  Logger.log('Guardar: ' + JSON.stringify(r1));
  var r2 = leer();
  Logger.log('Leer: ' + JSON.stringify(r2));
}
