# Plan maestro — Mi sistema financiero

> **Qué es esto:** el plan vivo del dashboard. Se actualiza al final de cada sesión.
> Si algo no está aquí, se olvida. Última actualización: **29 de julio de 2026**.

---

## El objetivo, en una frase

Que Javier sepa **en todo momento** en qué punto está, qué es lo siguiente que va a pasar
y qué tiene que hacer hoy — para dejar de tomar decisiones de dinero con ansiedad
y empezar a tomarlas con números verificados.

No es un dashboard de métricas. Es un sistema que **guía**.

---

## Las tres preguntas que el sistema tiene que responder siempre

1. **¿Dónde estoy ahora mismo?**
2. **¿Qué va a pasar después y cuándo?**
3. **¿Qué hago hoy?**

Todo lo que se construya tiene que servir a una de las tres. Si no sirve a ninguna, sobra.

---

## Reglas que no se rompen

| Regla | Por qué |
|---|---|
| **Cero cifras inventadas** | Ya pasó dos veces (los 10.000 € de Dubái, y el otro Claude). Cada cifra fiscal lleva su URL. |
| **Lo que no se verifica, se marca como laguna** | Un hueco honesto vale más que un número plausible. |
| **Todo lo derivable se deriva** | Si sale de sus datos, no se le pregunta. Lo manual es corrección, no entrada. |
| **Nada se presenta como certeza si es estimación** | Etiquetado explícito. |
| **Una pregunta, UNA cifra en toda la app** | La reserva de Hacienda llegó a tener **tres respuestas el mismo día**, y la más baja estaba en la pestaña que abre la app. Si dos pantallas contestan lo mismo, la cuenta se hace en un módulo y viaja. |
| **Prohibido "consulta con un profesional" a secas** | Si hay que preguntar algo, se le da **la pregunta exacta** para copiar y pegar. |
| **Prohibido preocuparle sin darle una acción** | Cada alerta lleva su qué hacer. |
| **Las distancias se miden en ventas al mes** | Es lo único que él controla. Los euros son consecuencia. |
| **Todo se audita antes de subir** | 3 lentes independientes + refutación ejecutando código. Ya cazó 5 bugs graves. |
| **El repo es público: nada personal dentro** | Saldos, claves y cifras reales fuera del repo. |

---

## Su situación (confirmada, base de todos los cálculos)

| Dato | Valor | Confirmado |
|---|---|---|
| Reparto con el socio | 40 % Javier / 60 % David | Sí |
| Estructura del negocio | Empresa **alemana** del socio; Javier le factura su 40 % | Sí, 28/07/2026 |
| Quién factura al alumno | El socio o su empresa alemana | Sí, 28/07/2026 |
| Residencia de Javier | España | Sí |
| Residencia del socio | Alemania | Sí |
| Ticket | 1.497 € con IVA (neto 1.237,19 €) | Sí |
| Comisión de pasarela | 1,49 % del neto (medida en 6 meses reales) | Sí |
| Cuota de autónomo | 80 €/mes — **tarifa plana** | Sí |
| Deducibles propios | Asesoría 75 €/mes | Sí |
| No deducibles | Gimnasio 27 €/mes | Sí |
| "IRPF 20 %" | **Es el modelo 130**, no una retención. Una empresa alemana no puede retener IRPF español (art. 76.1 RIRPF) | Deducido 28/07/2026 |
| Ventas | ~3,3/mes (media de meses cerrados) | Medido |
| Punto muerto | 0,45 ventas/mes | Calculado |
| Cada venta le deja | 487,50 € brutos / **390,00 €** tras el 20 % del 130 (que es anticipo, no su tipo real) | Calculado |

### Las cifras ancla de 2026 (a 29/07/2026)

Estas son las que hay que reproducir si algo se toca. Si una cuenta las mueve, es que la
cuenta está mal o hay una decisión de criterio que tomar con el informe delante.

| Magnitud | Valor | Qué es |
|---|---|---|
| Facturado (retirado) en 2026 | **5.372,80 €** | Lo que ha cobrado. Es su renta. |
| Proyectado a diciembre | **9.339,63 €** | La proyección desde los retiros |
| Base de IRPF proyectada | **7.479,63 €** | Menos cuota de autónomo (960 €) y asesoría (900 €) |
| IRPF real del año | **366,63 €** | **4,9 % efectivo**, primer tramo (19 %) |
| Devengado (su 40 % del beneficio) | 10.937,35 € · 19.012,59 € proyectado | **Informativo.** No tributa por esto. |

---

### Preguntas abiertas que bloquean trabajo

**Ninguna se ha cerrado hoy.** Las siete siguen abiertas, y son suyas: las contesta él o su
asesoría, no se pueden deducir de sus datos. Lo que sí ha cambiado es que ya **no bloquean la
app**: cada una tiene su campo editable, su aviso y su pregunta exacta con botón de copiar.
La app dice "no lo sé" en vez de rellenar el hueco con un número plausible.

| Pregunta | Qué cambia si se contesta | Dónde se contesta en la app |
|---|---|---|
| **¿Es socio de la GmbH o solo proveedor con acuerdo del 40 %?** | Todo el análisis de salida (Dubái, Paraguay) y el riesgo de que la GmbH acabe siendo española | Hacienda → las preguntas para tu asesoría |
| **¿Está dado de alta en el ROI/VIES?** | Bloquea el 349 y la factura B2B intracomunitaria. Alerta propia en "Y ahora qué" | Hacienda → lo que tienes que comprobar tú |
| **¿Presenta el modelo 349?** | Sanción del art. 198 LGT si no. La app da la horquilla, no elige | Hacienda → checklist |
| **¿Sus facturas llevan IVA?** | No deberían: inversión del sujeto pasivo | Hacienda → checklist |
| **¿Cuándo se le acaba la tarifa plana?** | Al acabarse, su neto cae ~176 €/mes. Sin el mes de alta en el RETA, ese hito no se puede fechar | `config.tarifaPlana` (hoy vacío) |
| **¿En qué comunidad autónoma reside?** | El mínimo personal (5.550 estatal / 5.956,65 Madrid / 5.790 Andalucía / 6.105 Valencia) y la escala autonómica. **Hoy la app asume Madrid** porque es la única escala completa del informe | Hacienda → Renta → campos editables |
| **¿Epígrafe de IAE?** | Determina si le aplica el puerto seguro del art. 18.6 LIS | Hacienda → las preguntas |

---

## Correcciones importantes

Lo que estaba mal, quién lo cazó y qué se movió. Va aquí y no en un comentario de código
porque son las que cambiaron el modelo, no las que cambiaron una línea.

### 1. Devengado contra facturado — **la encontró él** (28/07/2026)

Todo el modelo fiscal usaba **su 40 % del beneficio del negocio** como si fuera su renta.
No lo es. Es un autónomo español que factura a la GmbH de su socio: **tributa por lo que
factura, y factura cuando retira**. Lo que no ha facturado sigue en la caja del negocio.

| | Devengado (lo que usaba) | Facturado (lo real) |
|---|---|---|
| 2026 hasta hoy | 10.937,35 € | **5.372,80 €** |
| Proyectado a diciembre | 19.012,59 € | **9.339,63 €** |
| IRPF que le pedía apartar | 2.433,36 € | **366,63 €** (4,9 % efectivo) |
| Tramo | 24 % | **19 %**, el primero |
| Prórroga de la tarifa plana | "ya no te cabe" | **sí le cabe**, con 7.754,37 € de margen |

Cuatro respuestas cambiadas de signo. No fue un ajuste: fue cambiar la magnitud sobre la que
gira la app entera. El devengado no desapareció —vive en `situacionFiscalDelAnio()`, etiquetado
como informativo, porque la renta de un autónomo se imputa por devengo y su asesoría puede
decirle que debería estar facturando más—, pero **no se usa para calcular ni un euro de
impuesto**. La cifra buena la da `rentaFiscalDelAnio()` (`objetivo.js`) y es una sola para
todas las pantallas.

### 2. La cripto no tributaba (29/07/2026)

`tributaRetiro()` devolvía `false` para los retiros con concepto Binance o Bitbase: **IRPF cero
sobre 1.572,80 € de los 5.372,80 € facturados**, casi el 30 % de lo que cobra. Es falso: el
canal por el que le pagan no cambia nada, cobrar en cripto es rendimiento de actividad
económica a valor de mercado del día del cobro (arts. 28.1 y 43 LIRPF) y computa en el 130.
Lo peor: la app **se contradecía consigo misma**. `facturadoEntre()` (fiscal.js) y `retiradoYtd`
(objetivo.js) ya los contaban enteros, y la versión benévola era justo la de la pantalla que
él mira a diario. Hoy tributa todo. `clasificarRetiro()` sigue existiendo, pero solo dice por
dónde entró el dinero.

### 3. La reserva de Hacienda tenía tres respuestas el mismo día (29/07/2026)

"¿Cuánto meto hoy en la reserva de impuestos?" se contestaba en tres sitios con tres cuentas
distintas: el prorrateo del IRPF del año en "Y ahora qué", el 20 % plano de lo retirado y el
IRPF por tramos del devengado en "Mi patrimonio" —que además enseñaba un aviso verde de "no
reserves nada" pegado a un botón de "reserva 760 €"—. La más baja de las tres estaba en la
pestaña que abre la app. Hoy la cifra sale **una sola vez** de `fiscal.js`
(`reservaImpuestosHoy`), que es el único módulo que sabe de plazos y de recargos, y viaja igual
a las tres pantallas.

### 4. El 20 % no es una retención, es el modelo 130 (28/07/2026)

Una GmbH alemana no puede retener IRPF español (art. 76.1 RIRPF). No es dinero que alguien le
descuenta: es dinero que **tiene que ingresar él**, cuatro veces al año. De ahí salió la
pestaña Hacienda entera y el descubrimiento del 130 del 2T vencido.

### 5. El hito de la tarifa plana tapaba al siguiente hito real (28/07/2026)

Eran dos cosas metidas en un solo hito (cuándo se acaba y si puede prorrogarla), y al colapsarlas
el sistema se saltaba el hito que venía después. Hoy van separadas.

### 6. Los 10.000 € de Dubái

Una cifra a ojo presentada como dato. De ahí salió la primera regla de este documento. Hoy el
coste está investigado y va con horquilla: 8.470–10.970 €/año recurrente.

---

## Estado del software

### En vivo — https://javierbeltrany4-dotcom.github.io/finanzas-javier/

Las doce pestañas, en su orden real (de lo que aprieta hoy a lo que decide el año que viene).
En móvil la barra se reparte en **dos filas con scroll horizontal**: doce en una sola fila eran
tres pantallazos de arrastre para llegar a la última.

| Pestaña | Qué hace |
|---|---|
| Y ahora qué | Semáforo, qué hacer hoy, siguiente hito, el camino entero, los cuatro países. Las alertas de Hacienda salen aquí arriba del todo |
| Hacienda | Lo vencido primero, cuánto apartar hoy, **la Renta de junio**, calendario, fichas, preguntas y checklist |
| Resumen | Cuánto puede retirar hoy, verificación de datos, insights |
| Histórico | Beneficio por mes, gráfico, comparativa |
| Retiros | Filtros por año/mes/rango, IRPF y neto real por retiro |
| Mi dinero | Ahorro real del mes tras IRPF, gastos fijos, saldo |
| Calendario | Drill-down diario, heatmap, proyección |
| Mi patrimonio | Cuentas, reservas y objetivos (modelo sobre), con LA reserva de Hacienda del día |
| Mi capital | Libre de verdad, colchón en meses, simulador de "si meto X" y coste de oportunidad |
| Cuánto facturar | Calculadora inversa, cascada, escalera, palancas, tramo de IRPF automático |
| Crecer | Tendencia con R², palancas por quién las activa, siguiente objetivo, tres futuros |
| Dónde vivir | Comparador de países con sus fuentes y los umbrales en ventas al mes |

**932 tests.** Service worker v16, red primero.

### Los módulos, y por qué están separados

| Módulo | Contesta |
|---|---|
| `objetivo.js` | Cuánto tiene que facturar y cuál es su renta fiscal del año |
| `fiscal.js` | Qué le toca presentar, cuándo vence, cuánto recargo corre y cuánto tiene que tener guardado HOY |
| `renta.js` | En junio, ¿le devuelven o pone dinero? |
| `capital.js` | Cuánto de lo que tiene es dinero libre de verdad |
| `crecimiento.js` | Qué palanca mueve más |
| `decisiones.js` | Qué hace hoy |
| `residencia.js` | Dónde le sale a cuenta vivir |
| `respaldo.js` · `sync.js` | Que no vuelva a perder datos |

Los módulos son puros: sin DOM, sin `localStorage` y sin mirar el reloj. El "hoy" entra
**siempre** por parámetro. Las tres pantallas que razonan sobre el negocio ("Y ahora qué",
"Mi capital" y "Crecer") comparten **un solo ctx**, montado en `ctxNegocio()` de `app.js`: si
cada una se montara el suyo, dirían tres cifras distintas del mismo negocio. Ya pasó una vez
(ver corrección 3).

---

## Las sesiones

### Sesión 1 — Datos verídicos (28/07/2026)
Investigación con 156 fuentes. Tramo de IRPF automático. Cascada que sigue al objetivo.
Ventas del mes en vivo.

### Sesión 2 — Tus datos a salvo (28/07/2026)
Sincronización Mac↔iPhone por Apps Script (`sync.js`) y copia en archivo (`respaldo.js`), con
aviso rojo permanente mientras no tenga ninguna de las dos. La clave del script vive solo en el
dispositivo: no viaja en la copia ni en el JSON exportado.
**Queda de él:** guardar la primera copia y meter la clave. El software está.

### Sesión 3 — Dónde vivir (28/07/2026)
Comparador España autónomo / España SL / Dubái / Paraguay / Bali, con sus cifras reales y los
umbrales traducidos a ventas al mes. Acepta la cifra al mes o al año, sincronizadas. Bloque de
qué cuesta irse a Paraguay y cuánto llevar ahorrado (11.428,67 € mínimo), con los aranceles
oficiales y lo no confirmado aparte.

### Sesión 4 — Y ahora qué (28/07/2026)
Semáforo, qué hacer hoy, siguiente hito, línea de tiempo de todos los umbrales. Es la pestaña
de inicio.

### Sesión 5 — El copiloto fiscal (29/07/2026)
Pestaña **Hacienda**: modelos 036, 130, 303, 349, 390 y renta; lo vencido primero con el recargo
del art. 27 LGT y la fecha exacta del salto; cuánto apartar, enlazado con la reserva de impuestos
de "Mi patrimonio"; ficha de cada modelo; las preguntas del apartado 9 con botón de copiar; y el
checklist del apartado 2. `fiscal.js` (puro, el "hoy" por parámetro) + `vista-fiscal.js`.
Sus alertas salen también en "Y ahora qué" y ponen el semáforo en rojo si hay algo vencido.
Lo que marca como presentado y lo que ya ha comprobado se guarda en el dispositivo
(`fiscal-presentados-v1` y `fiscal-checklist-v1`); no viaja en la copia ni en la sincronización,
porque `estadoLocal()` tiene la forma exacta que valida `respaldo.js` y un campo desconocido se
tiraría en silencio en el primer viaje de ida y vuelta.
**Objetivo cumplido:** la gestoría deja de ser una caja negra y él puede comprobar su trabajo.
**Queda:** avisos ANTES de cada plazo. Hoy solo avisa cuando el plazo ya está abierto o vencido.

### Sesión 6 — Reparto de capital (29/07/2026)
Pestaña **Mi capital** (`capital.js` puro + `vista-capital.js`). Cuatro bloques: lo libre de
verdad con el desglose de por qué cada cosa está comprometida; los meses que aguanta con el
negocio parado, con el objetivo de 6 marcado en la barra; el simulador con semáforo y los dos
techos (lo máximo sin bajar de 6 y de 3 meses); y contra qué se compara ese dinero.
El dinero de Hacienda **no se estima aquí**: se lo pide a `fiscal.js`, con su calendario y su
art. 27 LGT. Los 6 meses y los cortes del semáforo van marcados como decisión de diseño, no norma.
La pregunta para la asesoría sobre abrir otra actividad (alta en IAE, deducibilidad de los gastos
antes de facturar y compensación de pérdidas) sale entera y con botón de copiar.

### Sesión 7 — El motor de crecimiento (29/07/2026)
Pestaña **Crecer** (`crecimiento.js` puro + `vista-crecimiento.js`). Tendencia con pendiente y
R² —y **sin flecha cuando no hay señal**: con menos de tres meses cerrados, o con un ajuste por
debajo del listón, dice "todavía no se puede decir"—; las cinco palancas ordenadas por impacto
entre esfuerzo y **separadas por quién las activa** (las suyas y las que dependen de David); el
siguiente objetivo como escalón, no como sueño; y los tres escenarios a 6 y 12 meses, cada uno
etiquetado MEDIDO o SUPUESTO.
**Queda:** seguimiento de si las palancas que activa funcionan. Exige registrar cuándo activó
cada una, y hoy la app no tiene dónde guardarlo.

### Sesión 8 — Cierre anual (29/07/2026)
`renta.js` (puro) + el bloque **"Tu declaración de la Renta, sin sorpresas"** dentro de Hacienda.
No es pestaña nueva a propósito: va pegada a "cuánto tienes que tener guardado hoy" porque es la
otra mitad de la misma frase. Separarlas era lo que hacía que el 20 % del 130 pareciera su tipo
de IRPF, que no lo es.

Qué hace:
- **La cuenta entera, en el orden del impreso**, línea a línea y con su artículo al lado:
  ingresos − gastos deducibles (cuota + asesoría + el 5 % de difícil justificación con tope de
  2.000 €, art. 30.2.4ª LIRPF) = rendimiento neto − reducciones = base liquidable → cuota íntegra
  por la escala − la cuota del mínimo personal (art. 63.1.2º: el mínimo **no** se resta de la
  base, desgrava a los tipos bajos y no al marginal) = cuota líquida − los cuatro 130 = resultado.
- **`aDevolver` y `aPagar` nunca salen a la vez.** Un signo negativo en una pantalla de impuestos
  se lee mal y se lee tarde.
- **La desviación:** cuánto está adelantando de más, en euros y en porcentaje de su impuesto real.
  Con su caso, el 130 le adelanta varias veces lo que va a deber.
- **La condición, siempre pegada a la buena noticia:** la devolución **no existe** hasta que
  presente los cuatro 130. En la Renta solo se resta lo efectivamente ingresado.
- **La misma cuenta sin el 5 %**, que es lo que dice hoy el bloque de "cuánto apartar", para que
  la misma pantalla no parezca contradecirse, y para ponerle precio exacto a la pregunta.
- **Tres campos editables** (mínimo personal de su comunidad, reducciones, otros gastos) en
  `fiscal-renta-v1`, local al dispositivo. Una clave ausente significa "no lo sé" y sale su aviso;
  un 0 significa cero.
- **Checklist ordenado por relojes**, no por el impreso: primero los 130 vencidos, después lo que
  caduca el 31 de diciembre y todavía puede cambiar la cifra (plan de pensiones), después las
  preguntas que hay que hacer con tiempo, después los papeles, y al final presentar. Cada paso
  vale `true`, `false` o `null`: lo que la app no puede saber no se marca ni como hecho ni como
  pendiente.
- **Cuatro preguntas nuevas** para la asesoría (`PREGUNTAS_RENTA`), cada una con la tesis, el
  artículo y lo que se quiere que conteste.

Lo no confirmado para 2026 sale marcado `confirmado: false` con su pregunta: el 5 % de difícil
justificación está en fuente oficial AEAT para 2025 y solo en fuentes secundarias para 2026.

---

## Lo que queda, con nombre

| Qué | Dónde | Por qué no está hecho |
|---|---|---|
| **Avisos antes de cada plazo** | `fiscal.js` | Hoy solo avisa con el plazo abierto o ya vencido. Falta el preaviso |
| **Seguimiento de palancas** | `crecimiento.js` | No hay dónde guardar cuándo activó cada una |
| **Dos escalas de IRPF vivas que no dicen lo mismo** | `objetivo.js` vs `residencia.js` | Ver abajo. Es criterio fiscal, no un arreglo mecánico |
| **Sacar el saldo de Binance y Bitbase** | Es de él, hoy | Cerradas en España desde el 1/07/2026 por MiCA. Coste de la acción: cero |
| **Las cinco preguntas de la asesoría** | Hacienda | Sin ellas, el 5 % de 2026 y el mínimo autonómico siguen `confirmado: false` |
| **Estonia / e-Residency** | — | Sin investigar |
| **Coste de vida de Dubái** | Laguna del informe | Sin él, su umbral real de salida no se puede cerrar |
| **Verifactu** | — | Obligatorio el 1/07/2027 (RDL 15/2025). Hoy no le obliga, pero si rehace las facturas para meter la inversión del sujeto pasivo, que las monte ya compatibles y no las toque dos veces |

### Las dos escalas de IRPF, en detalle

`objetivo.js` tiene la tabla estatal (19/24/30/37/45/47) y es la que alimenta la pestaña
Hacienda entera, la reserva de impuestos, la Renta y "Mi capital". `residencia.js`
(`escalaIrpfAgregada`) construye estatal + autonómica de Madrid tramo a tramo, da **18 %** en el
primer escalón y tiene bordes que la otra no tiene (13.362,22 · 19.004,63 · 35.425,68 ·
57.320,40). La app enseña las dos a la vez y en pantallas distintas:

- "Estás en el tramo del **19 %**" → Cuánto facturar
- "Cambio de tramo: del **18 %** al 20,5 %" → Y ahora qué

Y tres IRPF para la misma base: **358,38** (estatal) · **287,73** (estatal menos el 5 %) ·
**304,95** (Madrid con su mínimo propio). **No se ha unificado a propósito:** hacerlo mueve el
IRPF del año de los 366,63 € verificados a ~339 € y reescribe las cifras ancla de 44 tests.
Depende de la pregunta abierta de la comunidad autónoma. Se decide con el informe delante.

---

## Lo que ya sabemos y no hay que volver a investigar

### España
- IRPF por tramos: 19 / 24 / 30 / 37 / 45 / 47 %. Mínimo personal 5.550 €.
- **Hoy paga de más:** el 130 adelanta el 20 % y su tipo real es del 4,9 %. Le devuelven.
- Al escalar se invierte: a 20 ventas/mes le faltarían ~17.973 €/año. La app ya lo avisa.
- Retenciones reales de autónomo: **15 % general, 7 % nuevos**. El 20 % no existe como retención.
- Umbral SL vs autónomo: ~60.000 € de equilibrio, real por encima de 90.000–100.000 €.
- Canarias ZEC descartada: exige 5 empleados y 100.000 € de inversión.
- Ley Beckham: no le aplica siendo ya residente.
- Está obligado a los cuatro 130 (regla del 70 %, art. 109.2 RIRPF): el 100 % de sus ingresos va
  sin retención porque su cliente es alemán.
- Verifactu para personas físicas: **1 de julio de 2027** (RDL 15/2025).

### Dubái
- 0 % hasta 375.000 AED ≈ 89.550 € de beneficio. 9 % solo por encima.
- Estructura: 8.470–10.970 €/año recurrente. Primer año +8.092–10.951 €.
- Umbral solo por impuestos: 33.000–34.000 €/año.
- **No incluye coste de vida** — laguna abierta que puede mover mucho el umbral.
- Su academia no puede ser QFZP (vender a particulares es Actividad Excluida). **Eso es bueno:**
  recupera el tramo exento de 375.000 AED al 0 %.

### Paraguay
- IRP 8 / 9 / 10 %. **No es 0 %.**
- Territorial ≠ renta extranjera exenta: grava lo que **haces** desde allí (art. 48 Ley 6380/2019).
- Estructura ~500 €/año. Gana a Dubái en dinero hasta ~140.000 €/año.
- Tiene convenio con España, en vigor desde 14/10/2024.
- Coste de irse: 11.428,67 € mínimo, con los aranceles oficiales.
- **Problema: Stripe no opera en Paraguay.**

### Cobros, cuentas y cripto (`docs/cobros-y-wise-2026.md`, 29/07/2026)
- **Binance y Bitbase están cerradas en España desde el 1/07/2026** (fin del período de gracia de
  MiCA, Reglamento UE 2023/1114). Binance retiró su solicitud de licencia el 24/06. De más de
  3.000 proveedores registrados en la UE, solo unos 244 tienen licencia CASP. No hay fecha
  publicada de cierre de retiradas: por eso sacar el saldo va lo primero.
- Wise Business: 50 € de alta una vez, 0 €/mes, recibir EUR SEPA gratis. IBAN belga (BE), entidad
  de dinero electrónico: **sin garantía de depósitos**. Abrió sucursal en España en febrero de
  2026, pero no está confirmado que vaya a dar IBAN ES. **Veredicto: no le aporta nada** mientras
  cobre euros por SEPA. Reabrir el día que facture en divisa distinta del euro.
- Modelo 720 y modelo 721: mismo umbral, **50.000 €**. Con IBAN español no hay 720 (DGT V2475-25).
  Con IBAN extranjero sí, incluso en entidades de dinero electrónico (DGT V1239-17). Traducido:
  **128 ventas netas acumuladas**, 43 meses. No es su problema en 2026.
- Autocustodia de cripto: fuera del 721, dentro del IRPF.
- **Cobrar en cripto no es cobrar sin impuestos:** es rendimiento de actividad económica a valor
  de mercado del día del cobro (arts. 28.1 y 43 LIRPF) y computa en el 130. Ya está corregido en
  la app (corrección 2); falta que la asesoría lo confirme (pregunta 1 del informe).
- Comisiones: su 1,49 % medio **ya está por debajo** de la tarifa de tarjeta de Stripe
  (1,5 % + 0,25 €). Mover PayPal a Stripe no ahorra nada. Todo el ahorro posible de la línea de
  pasarela son 417,20 €/año del negocio = 0,34 ventas al año. No es ahí donde está el dinero.
- Lo caro de verdad: tarjeta internacional con conversión (5,15 %) y PayPal internacional (4,89 %).

### Bali
- En investigación. Foco: visado E33G de trabajador remoto y la excepción de la ley HPP
  para extranjeros los primeros 4 años.

---

## Cómo se trabaja

1. **Ninguna sesión empieza sin spec.** Se acuerda qué se construye antes de tocar código.
2. **Se construye con agentes en paralelo** y contrato de firmas y DOM fijado de antemano.
3. **Se audita con 3 lentes**: cifras, regresiones, claridad para él.
4. **Cada bug tiene que reproducirse ejecutando código** antes de darlo por cierto.
5. **Se verifica en navegador a 390 px** (su iPhone) antes de subir.
6. **Se sube solo lo que pasa todo lo anterior.**
7. **Este plan se actualiza al terminar.**

---

## Historial de sesiones

| Fecha | Qué se hizo |
|---|---|
| 21/06/2026 | Dashboard inicial, auto-carga de Tradingverso, 5 pestañas |
| 27–28/07/2026 | IRPF por retiro, filtros, Mi patrimonio, Cuánto facturar, tramo automático |
| 28/07/2026 | Investigación fiscal con 156 fuentes. Descubierto que el cliente es alemán. Sesiones 2, 3 y 4: sincronización y copia, Dónde vivir, Y ahora qué. **Corrección del devengado contra el facturado** (la encontró él): cambió el modelo entero. |
| 29/07/2026 | Sesiones 5, 6, 7 y 8 cerradas: pestaña **Hacienda** (con la **Renta** dentro), **Mi capital** y **Crecer**. `docs/cobros-y-wise-2026.md` (Wise, cobros, modelo 720/721 y cripto). La cripto pasa a tributar. Una sola reserva de Hacienda para las tres pantallas. Barra de pestañas a dos filas en móvil. **932 tests**, sw v16. |
