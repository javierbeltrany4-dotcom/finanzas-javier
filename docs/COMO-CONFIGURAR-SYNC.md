# Cómo configurar la sincronización

Esta guía es para que tus datos del dashboard (cuentas, objetivos, ajustes) dejen de vivir
solo en el navegador y se guarden en **una hoja de cálculo tuya**. A partir de ahí:

- si cambias de perfil de Chrome, no pierdes nada;
- si abres la app en el iPhone, ves lo mismo que en el ordenador;
- si borras los datos del navegador sin querer, se recuperan.

No hace falta saber programar. Son unos 15 minutos, una sola vez.
Después, en cada dispositivo nuevo, son 2 minutos.

---

## Antes de empezar: qué vas a montar

Tres piezas:

1. **Una hoja de cálculo** tuya, privada, en tu Google Drive. Ahí se guardan los datos.
2. **Un pequeño programa** (Apps Script) pegado dentro de esa hoja. Es el que escribe y lee.
3. **Una clave secreta** que inventas tú. Es la contraseña de la puerta.

La dirección del programa es pública (Google no permite otra cosa sin pedirte login cada vez),
así que **la clave es lo único que protege tus datos**. Por eso tiene que ser larga.

---

## Paso 0. Genera tu clave secreta

Necesitas una cadena larga y aleatoria. Elige la opción que te resulte más cómoda:

**Opción A — con tu gestor de contraseñas (la más fácil).**
En 1Password, Bitwarden, el llavero de iCloud o el que uses: "Generar contraseña", pon la
longitud al máximo, sin símbolos raros (evita `&`, `?`, `#`, `=`, `+`, `%` y espacios).
Guárdala ahí mismo con el nombre "Clave sync dashboard".

**Opción B — desde el navegador.**
Abre el dashboard, pulsa `F12` (en Mac: `Cmd + Alt + I`), ve a la pestaña **Console**,
pega esto y pulsa Enter:

```js
crypto.randomUUID().replace(/-/g,'') + crypto.randomUUID().replace(/-/g,'')
```

Verás una línea de 64 letras y números entre comillas. Cópiala **sin las comillas**.

**Opción C — a mano.**
Escribe 40 caracteres seguidos aporreando letras y números. Sirve, pero apúntala bien
porque no la vas a recordar.

> Apunta la clave donde no la pierdas. Si la pierdes, no pasa nada grave: pones otra
> nueva en los dos sitios. Pero tendrás que hacerlo en todos los dispositivos.

Lo que **nunca** hay que hacer: escribirla en un fichero del proyecto y subirla a GitHub.
El repositorio es público. Si eso pasa, la clave está quemada y hay que cambiarla.

---

## Paso 1. Crea la hoja de cálculo

1. Entra en [sheets.google.com](https://sheets.google.com) con tu cuenta.
2. Pulsa el recuadro **En blanco** (el que tiene un `+` grande).
3. Se abre una hoja vacía llamada *Hoja de cálculo sin título*.
4. Pincha en ese título, arriba a la izquierda, y escribe: **Respaldo dashboard financiero**.

No escribas nada en las celdas. El programa las rellena solo.

**Comprueba que es privada:** el botón azul **Compartir**, arriba a la derecha, debe decir
"Acceso general: restringido". Si dice otra cosa, cámbialo a *Restringido*.

---

## Paso 2. Abre el editor de Apps Script

1. En el menú de arriba de la hoja, pulsa **Extensiones**.
2. En el desplegable, pulsa **Apps Script**.
3. Se abre una pestaña nueva con el editor. Verás un fichero llamado `Código.gs`
   (o `Code.gs`) con estas líneas dentro:

   ```js
   function myFunction() {
   }
   ```

4. Pincha dentro de esa zona de código, selecciona todo (`Ctrl + A`, en Mac `Cmd + A`)
   y bórralo. Tiene que quedar completamente vacío.

---

## Paso 3. Pega el programa

1. Abre el fichero `docs/apps-script-sync.js` de este proyecto.
2. Cópialo **entero**, desde la primera línea hasta la última.
3. Vuelve a la pestaña del editor de Apps Script y pégalo en el hueco vacío.

---

## Paso 4. Pon tu clave dentro del programa

Busca, cerca del principio, esta línea:

```js
var CLAVE_SECRETA = 'CAMBIA-ESTO-POR-UNA-CLAVE-LARGA-Y-ALEATORIA';
```

Sustituye el texto de dentro de las comillas por tu clave del Paso 0. Debe quedar así
(con tu clave, claro):

```js
var CLAVE_SECRETA = 'a3f9c1b7e2d84a6f0c5b9e13d7a24f8b6c0e5a91d3f72b48';
```

Cuidado con dos cosas:

- **No borres las comillas.** La clave va dentro de ellas.
- **No dejes espacios** delante ni detrás de la clave.

Ahora guarda: pulsa el icono del **disquete** (arriba, junto a "Ejecutar"), o `Ctrl + S`.
Arriba del todo verás que el proyecto pasa de "Proyecto sin título" a pedirte un nombre;
si te lo pide, escribe **Sync dashboard** y acepta.

---

## Paso 5. Publica el programa como aplicación web

Aquí es donde le das dirección propia.

1. Arriba a la derecha, pulsa el botón azul **Implementar**.
2. En el desplegable, elige **Nueva implementación**.
3. Se abre una ventana. A la izquierda hay un icono de **engranaje** junto a
   "Seleccionar tipo". Púlsalo y elige **Aplicación web**.
4. Rellena así:
   - **Descripción**: `sync dashboard` (da igual, es para ti).
   - **Ejecutar como**: **Yo (tu-correo@gmail.com)**.
   - **Quién tiene acceso**: **Cualquier usuario**.

   > "Cualquier usuario" suena mal, pero es imprescindible: significa que el navegador
   > puede llamar a la dirección sin abrir una pantalla de login de Google. Lo que impide
   > que un desconocido lea tus datos es la clave secreta, no este ajuste.
   > Ojo: **no** elijas "Cualquier usuario con una cuenta de Google" — con esa opción
   > la sincronización no funcionará.

5. Pulsa **Implementar**.

---

## Paso 6. Dale permisos

La primera vez Google te pide permiso para que el programa toque tu hoja. Verás:

1. Una ventana: **"Autorización necesaria"** → pulsa **Autorizar acceso**.
2. Elige tu cuenta de Google.
3. Una pantalla naranja/gris: **"Google no ha verificado esta aplicación"**.
   Esto es normal: la aplicación la has escrito tú, nadie la ha revisado.
   - Pulsa **Configuración avanzada** (abajo a la izquierda).
   - Pulsa **Ir a Sync dashboard (no seguro)**.
4. Una última pantalla: **"Sync dashboard quiere acceder a tu cuenta de Google"**, con la
   línea "Ver, editar, crear y eliminar todas tus hojas de cálculo de Google".
   Pulsa **Permitir**.

---

## Paso 7. Copia la dirección

Al terminar aparece **"Implementación actualizada"** con dos datos. El que te interesa es
el de abajo: **URL de la aplicación web**. Es una dirección larguísima con esta pinta:

```
https://script.google.com/macros/s/AKfycb...............................­/exec
```

Pulsa **Copiar** debajo de esa dirección. Luego pulsa **Listo**.

Comprueba dos cosas:

- Empieza por `https://script.google.com/macros/s/`
- **Acaba en `/exec`**. Si acaba en `/dev`, has copiado la de pruebas: vuelve a
  Implementar → Administrar implementaciones y coge la que acaba en `/exec`.

Pégala provisionalmente en una nota, junto a la clave.

---

## Paso 8. Comprueba que el programa funciona (opcional, 30 segundos)

Antes de ir al dashboard puedes verificar que escribe bien en la hoja:

1. En el editor de Apps Script, en el desplegable de arriba que pone `doGet`, elige
   **probar**.
2. Pulsa **Ejecutar**.
3. Abajo se abre el **Registro de ejecución**. Debe aparecer algo como:
   `Guardar: {"ok":true,...}` y `Leer: {"ok":true,"existe":true,...}`.
4. Vuelve a la pestaña de la hoja de cálculo. Verás dos pestañas nuevas abajo:
   **RESPALDO** y **HISTORIAL**, y en RESPALDO la celda A2 con `{"prueba":true}`.

Ese dato de prueba se sobrescribe solo la primera vez que sincronices de verdad.

---

## Paso 9. Mete la dirección y la clave en el dashboard

1. Abre el dashboard.
2. Entra en **Ajustes** (el botón de editar, arriba a la derecha).
3. Busca la sección **Sincronización**.
4. En **Dirección de la aplicación web**, pega la URL del Paso 7 (la que acaba en `/exec`).
5. En **Clave secreta**, pega la clave del Paso 0.
6. Pulsa **Guardar** y luego **Sincronizar ahora**.

Si todo va bien verás un mensaje de que tus datos se han guardado, con la hora.

Vuelve a la hoja de cálculo: en la pestaña **RESPALDO**, celda A2, tiene que haber una
línea larguísima que empieza por `{"actualizado":`. Eso son tus datos.

---

## Paso 10. Repite en el iPhone (2 minutos)

En el iPhone **no** hay que repetir nada de Google. Sólo:

1. Abre el dashboard en el iPhone.
2. Ajustes → Sincronización.
3. Pega la misma dirección y la misma clave.
4. **Sincronizar ahora**.

La forma cómoda de pasar la dirección y la clave al móvil es mandártelas por Notas de
Apple o por tu gestor de contraseñas. Por WhatsApp también, pero luego borra el mensaje.

Repite esto en cada dispositivo nuevo. La clave se teclea **una vez por dispositivo** y se
queda guardada en ese navegador.

---

## Qué pasa si...

**...la app dice "La clave secreta no coincide".**
Repasa que la clave del dashboard y la del script sean idénticas: sin espacios delante ni
detrás, mismas mayúsculas y minúsculas. Si has cambiado la clave en el script, acuérdate
de **volver a implementar** (Paso 5) para que el cambio salga a la calle.

**...la app dice "No se ha podido contactar con tu hoja de Google".**
Casi siempre es la dirección: comprueba que acaba en `/exec` y no en `/dev`, y que la
copiaste entera (son unos 120 caracteres).

**...la app dice que tus datos son demasiado grandes.**
Esta vía manda los datos dentro de la dirección web y ahí no caben más de 6.000
caracteres. No se envía nada cortado: o van enteros o no van. Usa **Ajustes → Exportar
copia**, que guarda un fichero sin límite de tamaño, y avísalo para revisar qué ha
crecido tanto.

**...quiero cambiar la clave.**
Cámbiala en el script (Paso 4), **vuelve a implementar** (Implementar → Administrar
implementaciones → el lápiz → Versión: Nueva versión → Implementar; la dirección no
cambia) y luego actualízala en cada dispositivo.

**...he perdido los datos igualmente.**
Abre la hoja, pestaña **HISTORIAL**. Ahí están las últimas 200 versiones guardadas, con
su fecha. Copia el texto de la versión buena (columna DATOS), guárdalo en un fichero
`.json` y usa **Ajustes → Importar copia** en el dashboard.

---

## Las dos vías, y por qué tienes las dos

| | Sincronización (esta guía) | Copia en archivo |
|---|---|---|
| Qué hace | Guarda y trae tus datos de tu hoja de Google | Descarga un `.json` a tu disco |
| Cuándo actúa | Cada vez que cambias algo | Cuando pulsas Exportar |
| Sirve para | Que el iPhone y el ordenador vean lo mismo | Tenerlo en frío, sin depender de Google |
| Límite | 6.000 caracteres | Ninguno |
| Configuración | Estos 10 pasos, una vez | Ninguna |

La sincronización es la comodidad del día a día. La copia en archivo es el seguro de
verdad: hazla de vez en cuando (la app te lo recuerda cada 7 días) y guárdala en un sitio
que no sea el navegador.
