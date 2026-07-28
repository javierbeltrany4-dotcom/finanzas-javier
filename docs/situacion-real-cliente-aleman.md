# Tu situación real: autónomo español facturando a una empresa alemana

**Fecha del informe: 28 de julio de 2026**

Este documento está escrito para ti, no para tu asesoría. No hay jerga innecesaria. Cuando algo está mal, lo digo con el artículo de la ley y la sanción concreta. Cuando no he podido verificar algo, lo digo en el apartado 8 y no me lo invento.

Hay un dato que no sabemos y que cambia la mitad del análisis: **si tienes participaciones de la GmbH a tu nombre o no**. Por eso todo lo importante está analizado en los dos escenarios. Resolverlo cuesta 10 minutos (apartado 4).

---

## 1. Tu situación en 10 líneas

1. Eres **residente fiscal en España** y **autónomo** (empresario o profesional a efectos de IVA e IRPF). Todo tu impuesto sobre la renta se paga aquí.
2. Tu dinero viene de **una única empresa alemana**, la GmbH de tu socio David. Los alumnos le pagan a él, no a ti.
3. Las facturas de 1.497 euros a los alumnos **no son tuyas**. No eres sujeto pasivo de esas operaciones, siempre que ninguna pasarela ni cuenta esté a tu nombre.
4. Tu única operación fiscal relevante es: **tú prestas un servicio a una empresa alemana y cobras el 40 % del beneficio repartible**.
5. Ese servicio **no lleva IVA español**. No es una operación exenta: es una operación **no sujeta** en España, porque el cliente está en Alemania (art. 69.Uno.1º LIVA).
6. Alemania **no te retiene nada** sobre esas facturas, porque los servicios de consultoría o formación no están en la lista cerrada del § 50a EStG.
7. La GmbH tampoco te retiene IRPF español, porque no opera en España (art. 76 RIRPF). Eso es correcto, pero tiene una consecuencia: te obliga a presentar el modelo 130.
8. El "20 % de IRPF" que crees que pagas **no es tu IRPF**. Es el porcentaje del pago fraccionado del modelo 130: un anticipo. Tu IRPF real sale de la escala progresiva en la declaración de la Renta.
9. Con 15.000 euros al año ese 20 % te sobra y te lo devuelven. Con 40.000 o más, **se queda corto y te espera una liquidación grande en junio**.
10. Tienes tres obligaciones que probablemente estés incumpliendo ahora mismo sin saberlo: **alta en el ROI, modelo 349 y casilla 59 del 303**. Se arreglan, y regularizar tú antes de que Hacienda pregunte es entre dos y cuatro veces más barato.

---

## 2. Lo urgente: checklist de esta semana

Ordenado por riesgo real, de más a menos. Los cinco primeros son de esta semana.

### 2.1. Comprueba si estás dado de alta en el ROI (VIES)

**Qué comprobar:** si tu NIF con el prefijo ES aparece como válido en el censo europeo VIES.

**Dónde mirarlo:** entra en `https://ec.europa.eu/taxation_customs/vies/`, elige España, escribe tu NIF y pulsa verificar. Tarda 30 segundos. Si sale "válido", estás en el ROI. Si sale "no válido", no lo estás.

**Por qué importa:** el alta en el ROI **no es opcional**. El art. 3.3.d) del RD 1065/2007 obliga a estar inscrito a quien presta servicios que se localizan en otro Estado miembro con inversión del sujeto pasivo. Es exactamente tu caso. Y el alta debe ser **previa** a la primera operación.

**Qué hacer si está mal:** presentar el modelo 036 marcando:
- Casilla 130 (página 1): "Inscripción en el Registro de operadores intracomunitarios"
- Casilla 582 (página 5): "Alta"
- Casilla 584: fecha prevista de la primera operación intracomunitaria

**Ojo con esto:** Hacienda tiene **tres meses** para resolver y el silencio es **negativo**. Es decir: si no contesta en tres meses, se entiende denegado. Además, con un único cliente que es la empresa de tu socio, es un perfil que suelen revisar antes de concederlo. Ten preparado el contrato con la GmbH y facturas o borradores antes de presentarlo.

**Qué te puede costar si no lo arreglas:**
- Sanción censal: **400 euros** (art. 198.1 LGT), o **200 euros** si lo presentas tú voluntariamente antes de que te requieran (art. 198.2 LGT).
- Riesgo mayor, aunque discutible: que Hacienda pretenda cobrarte el 21 % de IVA de todo lo facturado. Sobre esto hay que ser honesto contigo (ver el recuadro siguiente).

> **El punto donde casi todas las gestorías se equivocan.** Muchas asesorías dicen categóricamente: "sin ROI, Hacienda te reclama el 21 % de IVA de todo". Eso es **exacto para venta de bienes** — desde 2020, el NIF-IVA del cliente y el modelo 349 son condiciones materiales de la exención del art. 138 de la Directiva. Pero el art. 138 se titula "Exenciones de las entregas de bienes" y **no alcanza a los servicios**. Para servicios, la no sujeción viene de la regla de localización del art. 44 de la Directiva y el art. 69.Uno.1º LIVA, que solo exige que el cliente sea empresario. El ROI es una obligación censal, no un requisito constitutivo.
>
> **Aviso de honestidad:** esta distinción bienes/servicios es una inferencia jurídica razonada, no una certeza. No he encontrado sentencia del Tribunal Supremo ni resolución del TEAC que lo diga expresamente para servicios. Es la pregunta 1 del apartado 9, y es la más valiosa que le puedes hacer a tu asesoría.

### 2.2. Comprueba qué pone exactamente en tus facturas

**Qué comprobar:** coge la última factura que le hayas emitido a la GmbH y mira tres cosas.

1. **¿Lleva IVA español (21 %)?** Si lo lleva, está mal. Ver 2.2.a.
2. **¿Lleva la mención "inversión del sujeto pasivo"?** Tiene que llevar esas cuatro palabras exactas. Es el art. 6.1.m) del RD 1619/2012 (Reglamento de Facturación), literal: *"En el caso de que el sujeto pasivo del Impuesto sea el adquirente o el destinatario de la operación, la mención «inversión del sujeto pasivo»"*.
3. **¿Lleva tu NIF-IVA (ES + tu NIF) y el de la GmbH (DE + 9 dígitos)?** Los dos tienen que constar.

**Errores frecuentes que hay que evitar:**
- Poner "operación exenta art. 20 LIVA". **Mal.** Esto no es una exención, es una no sujeción con inversión del sujeto pasivo. La letra j) del art. 6.1 (exentas) no es la que aplica; es la letra m).
- No poner nada. También mal: la mención es obligatoria.
- Recomendable, aunque no obligatorio en España: añadir además *"Reverse charge – Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)"* para que a David le cuadre en Alemania. Pero la mención española tiene que estar.

**Otra cosa importante:** aunque la operación no esté sujeta en España, **estás obligado a emitir factura y con las normas españolas** (art. 2.3.b).1º RD 1619/2012). Si hoy no emites factura ninguna y el dinero llega por transferencia sin papel, el problema no es de IVA: es que no hay soporte documental de nada. Eso es más grave.

Si es la GmbH quien emite las facturas por ti (autofacturación, muy común entre socios), la factura debe llevar además la mención "facturación por el destinatario" (art. 6.1.l) y debe existir un acuerdo previo por escrito.

#### 2.2.a. Si has facturado CON IVA español por error

Se corrige con el art. 89 LIVA. Plazo: **cuatro años** desde el devengo. Instrumento: factura rectificativa (art. 15 RD 1619/2012). Tienes dos opciones:

- **Opción a)** pedir a Hacienda la devolución de ingresos indebidos (procedimiento de rectificación de autoliquidaciones, art. 120.3 LGT). Alcance: 4 años. Más lento.
- **Opción b)** regularizarlo en tu propio modelo 303 del trimestre en curso o siguientes, con un plazo máximo de **un año** desde que adviertes el error. Más rápido, ventana más corta.

Tres cosas que deciden el resultado y que nadie te cuenta:
1. Tienes que **devolverle el IVA a la empresa alemana**. Hacienda no te devuelve a ti lo que tú no reintegres al cliente.
2. El TEAC exige acreditar que **enviaste efectivamente** la factura rectificativa al destinatario. Guarda el email o el burofax.
3. Ese IVA español **no se lo puede deducir la GmbH** ni en Alemania ni por el procedimiento de devolución a no establecidos. Es un coste puro del 21 % que alguien ha comido. Si esto ha pasado, hay una conversación pendiente con David.

### 2.3. Comprueba si has presentado el modelo 349

**Qué comprobar:** entra en la Sede de la AEAT con certificado o Cl@ve, apartado "Mis expedientes" o consulta de declaraciones presentadas, y busca el modelo 349.

**Qué es:** la declaración informativa de operaciones intracomunitarias. Tu clave es la **S** — "Prestaciones intracomunitarias de servicios realizadas por el declarante". Se declara solo la base imponible y el NIF-IVA de la GmbH. No hay importe mínimo: **con 1 euro ya hay obligación**.

**Periodicidad que te toca:**
- Con tus 15.000 euros al año actuales: **trimestral**. Se presenta en los 20 primeros días naturales del mes siguiente al trimestre.
- Se pasa a **mensual** en cuanto superes 50.000 euros (IVA excluido) en un trimestre. Es un **umbral trimestral, no anual**, y el salto es automático: el mes en que lo cruces tienes 20 días para presentar. Con 230.000 euros al año (unos 57.500 por trimestre) irías mensual.
- Plazos especiales: la declaración de julio se puede presentar hasta el 20 de septiembre; la del último período del año se presenta hasta el **30 de enero** (no el 20).

**Qué hacer si no lo has presentado:** presentarlos todos, pero **después de tener el ROI concedido**, no antes. Necesitas tu NIF-IVA para presentarlo, y presentarlos antes delata las fechas del incumplimiento censal.

**Qué te puede costar:** aquí hay un matiz técnico no cerrado. Puede ser la multa fija de **200 euros** del art. 198.1 LGT, o el régimen de "20 euros por dato con un mínimo de 300 euros". En tu caso, con un solo cliente, "un conjunto de datos referido a una misma persona" es 1, así que sería el mínimo en cualquiera de las dos lecturas. **Y si lo presentas tú antes de que te requieran, se reduce a la mitad** (art. 198.2 LGT): 150 euros por declaración en lugar de 300.

Traducido: si llevas dos años sin presentarlo, son 8 declaraciones. Regularizando tú: unos 1.200 euros. Esperando al requerimiento: unos 2.400. Y cada trimestre que pasa suma una más.

### 2.4. Comprueba el modelo 130 — el 2T ya ha vencido

**Esto es lo más urgente en términos de fecha.** Hoy es 28 de julio de 2026. El modelo 130 del segundo trimestre venció el **20 de julio**. Llevas 8 días de retraso si no lo has presentado.

**Estás obligado a presentarlo.** Mucha gente cree que se libra por la regla del 70 %, y esa regla juega **en tu contra**. El art. 109.2 RIRPF libera del modelo 130 a quien tuvo al menos el 70 % de sus ingresos del año anterior sometidos a retención. Tú tienes el **0 %** con retención, porque la GmbH no retiene. 0 % es menos que 70 %, así que estás obligado los cuatro trimestres.

**Qué es el 20 %:** el art. 110.1.a) RIRPF dice que se ingresa *"el 20 por ciento del rendimiento neto correspondiente al período de tiempo transcurrido desde el primer día del año hasta el último día del trimestre"*. Es decir: 20 % del **rendimiento neto acumulado** del año (ingresos menos gastos deducibles), no del importe facturado en el trimestre. Y se restan los pagos fraccionados ya ingresados en trimestres anteriores.

**Qué te cuesta el retraso:** los recargos del art. 27 LGT cambiaron con la Ley 11/2021 y ahora son **mucho más baratos** de lo que la gente cree. Ya no existe la escala 5/10/15/20 %. Ahora es:

- **1 % fijo, más 1 % adicional por cada mes completo de retraso**, hasta 12 meses.
- A partir de 12 meses: 15 % más intereses de demora.
- **Reducción del 25 % del recargo** si pagas todo en plazo (art. 27.5 LGT).

Aplicado a ti:
- **2T 2026** (venció el 20/07, 0 meses completos de retraso): recargo del **1 %**, o **0,75 %** con la reducción. Si presentas antes del 20 de agosto no entras en el segundo mes.
- **1T 2026** (venció el 20/04, 3 meses completos): recargo del **4 %**, o **3 %** con la reducción.

Sobre importes pequeños esto son decenas de euros. Y si el trimestre salía a cero o negativo, **no hay recargo posible** porque el recargo se calcula sobre lo que hay que ingresar. En ese caso solo cabría la sanción del art. 198 LGT: 200 euros, o **100 euros** si lo presentas tú voluntariamente.

**Lo importante:** el art. 27 solo aplica si regularizas **antes** de que te llegue un requerimiento. Si llega el requerimiento primero, se acabó el recargo y entra el régimen sancionador del art. 191 LGT, que es mucho peor.

### 2.5. Comprueba el NIF-IVA alemán de la GmbH en VIES

**Qué comprobar:** que la USt-IdNr. de la empresa de David (formato DE + 9 dígitos) sea válida en VIES.

**Por qué importa, y no es lo que parece:** el art. 18.1 del Reglamento (UE) 282/2011 dice que el prestador *"podrá considerar"* que el cliente es empresario si le ha comunicado su NIF-IVA y obtiene confirmación de su validez. Fíjate en la redacción: **"podrá considerar", no "deberá comprobar"**. No es una obligación sancionable. Es un puerto seguro.

Pero funciona al revés de lo que parece: **si no lo validas, pierdes la presunción** y te toca a ti probar que el cliente era empresario si Hacienda lo discute.

**Qué hacer:** guarda el justificante de la consulta VIES **con fecha**, al menos una vez por trimestre. Si la haces desde la Sede de la AEAT con certificado digital, te genera un justificante con CSV, que es mejor prueba que una captura de pantalla del portal europeo.

**Si la GmbH no tiene USt-IdNr. válida:** dos consecuencias. Materialmente la operación sigue sin sujeción (el art. 18.1.b permite probarlo con Handelsregisterauszug, Gewerbeanmeldung, Steuernummer o contratos). Pero **no podrás presentar el modelo 349**, porque el campo del NIF del operador comunitario es obligatorio. Y si la empresa de tu socio no tiene NIF-IVA válido, eso es una señal de alarma sobre la propia estructura alemana, no un detalle administrativo.

### 2.6. Comprueba que ninguna pasarela ni cuenta esté a tu nombre

**Qué comprobar:** que ninguna cuenta de Stripe, PayPal, exchange de cripto o banco del negocio esté a tu nombre, con tu NIF, o contigo como autorizado o beneficiario.

**Por qué:** si alguna lo está, Hacienda te puede imputar directamente esos ingresos como tuyos, no como del socio. Y entonces el problema deja de ser un 349 sin presentar y pasa a ser una regularización de todos los cobros de la academia. Es el riesgo con más importe de todo el documento.

**Consecuencia añadida:** si tienes wallets de cripto custodiados en el extranjero a tu nombre por más de 50.000 euros a 31 de diciembre, entra el **modelo 721** (art. 42 quater RD 1065/2007). Y si tienes cuentas bancarias fuera (Wise, Revolut) por más de 50.000, entra el **modelo 720**.

### 2.7. Comprueba si tienes contrato escrito con la GmbH

**Esto es lo más barato de arreglar y lo que más te protege.** Si no hay contrato escrito, no tienes nada que oponer a nada: ni a una inspección de trabajo, ni a una comprobación de Hacienda, ni a una discusión sobre de dónde sale el 40 %.

Lo desarrollo en el apartado 4. Pero apúntalo aquí: es de esta semana.

---

## 3. Tus obligaciones y calendario 2026

### 3.1. Tabla de modelos

| Modelo | Qué es | Cuándo | Porcentaje | Sobre qué |
|---|---|---|---|---|
| **036** | Alta en el ROI (censo) | Antes de la primera operación intracomunitaria | — | Casillas 130, 582, 584 |
| **130** | Pago fraccionado de IRPF | Trimestral | **20 %** | Rendimiento neto **acumulado** desde el 1 de enero, menos pagos fraccionados anteriores |
| **303** | Autoliquidación de IVA | Trimestral | — | Tus servicios a Alemania van en la **casilla 59** (informativa, no suma). **No** en la 120 |
| **349** | Operaciones intracomunitarias | Trimestral (mensual si superas 50.000 € en un trimestre) | — | Base imponible + NIF-IVA alemán. **Clave S** |
| **390** | Resumen anual de IVA | Anual, del 1 al 30 de enero | — | **Casilla 103** (equivale a la 59 del 303) |
| **Renta** | IRPF anual | Abril a junio del año siguiente | Escala progresiva | Aquí se liquida de verdad y se resta lo pagado en los 130 |
| **720** | Bienes y derechos en el extranjero | 1 de enero a 31 de marzo | — | Solo si superas 50.000 € en algún bloque (cuentas, valores, inmuebles) |
| **721** | Criptomonedas en el extranjero | 1 de enero a 31 de marzo | — | Solo si superas 50.000 € a 31 de diciembre |

### 3.2. Fechas exactas que te quedan en 2026

| Fecha | Qué vence |
|---|---|
| ~~20 abril 2026~~ | 1T: modelos 130, 303, 349. **Ya vencido** |
| ~~20 julio 2026~~ | 2T: modelos 130, 303, 349. **Ya vencido hace 8 días** |
| **1 a 20 de octubre de 2026** | 3T: modelos 130, 303 y 349 |
| **1 a 30 de enero de 2027** | 4T: modelos 130, 303 y 349 (del 4T, hasta el 30) + modelo 390 anual |
| **1 de enero a 31 de marzo de 2027** | Modelos 720 y 721 del ejercicio 2026, si procede |
| **Abril a junio de 2027** | Declaración de la Renta 2026 |

Nota: el 30 de enero de 2027 cae en sábado, así que en principio se trasladaría al lunes 1 de febrero, pero el calendario oficial de la AEAT para 2027 aún no está publicado. No lo des por bueno hasta que salga.

Para domiciliar el pago en banco, el plazo es hasta el día 15 en los trimestres 1T, 2T y 3T, no hasta el 20.

### 3.3. El cuadre que Hacienda comprueba automáticamente

Esto tiene que cuadrar, y si no cuadra salta un requerimiento aunque todo lo demás esté bien:

**Suma de las casillas 59 de tus cuatro modelos 303 = suma de tus cuatro modelos 349 = casilla 103 de tu modelo 390.**

Y además, todo eso se cruza vía VIES con lo que la GmbH declare en Alemania en su Zusammenfassende Meldung. El desajuste típico es de fechas: si facturas en diciembre y David lo registra en enero, aparece una discrepancia. Habla con él para alinear las fechas de emisión.

### 3.4. Dos cosas del 303 que suelen hacerse mal

1. La casilla 59 es **puramente informativa**: no suma a la base ni a la cuota, no cambia el resultado. El error común es poner el importe en la 59 **y** en la 120, lo que duplica.
2. **Sí puedes seguir deduciéndote el IVA de tus gastos** (asesoría, etc.) aunque no repercutas ni un euro. Son operaciones que originan derecho a deducción. Tu 303 saldrá a compensar o a devolver de forma sistemática. Si tu asesoría no te lo está deduciendo, estás perdiendo dinero.

### 3.5. Verifactu: tienes 12 meses

El Real Decreto-ley 15/2025 (BOE de 3 de diciembre de 2025) retrasó Verifactu. Para autónomos personas físicas, la fecha es el **1 de julio de 2027**. Hoy no estás obligado.

Consejo práctico: si vas a rehacer tus facturas ahora para meter la mención "inversión del sujeto pasivo", monta directamente un sistema ya compatible con Verifactu, en vez de tocar las facturas dos veces.

---

## 4. Socio o proveedor

**Este es el dato que falta y que decide la mitad del informe.**

### 4.1. Cómo lo resuelves en 10 minutos

Entra en `https://www.handelsregister.de`, busca la GmbH de David y descarga la **Gesellschafterliste** (lista de socios). Es público y prácticamente gratuito. Si tu nombre está ahí, eres socio. Si no está, eres proveedor.

Pídele además a David el contrato firmado que regula el 40 %.

### 4.2. Escenario PROVEEDOR (no tienes participaciones)

**Qué eres:** un profesional independiente que le presta servicios a un cliente que resulta ser alemán.

**Qué se te aplica:** todo lo del apartado 2. Factura sin IVA con "inversión del sujeto pasivo", alta en el ROI, modelo 349 clave S, casilla 59 del 303, casilla 103 del 390, modelo 130 trimestral, y el 40 % tributa íntegramente en España como rendimiento de actividad económica.

**Base legal:** art. 7.1 del Convenio España-Alemania de 2011 (BOE-A-2012-10212): *"Los beneficios de una empresa de un Estado contratante sólo pueden someterse a imposición en ese Estado, a no ser que la empresa realice su actividad en el otro Estado contratante por medio de un establecimiento permanente situado en él."* Tú trabajas desde España y no tienes establecimiento permanente en Alemania. Tributas solo aquí.

Un detalle que conviene saber: el convenio de 2011 **no tiene** artículo de "servicios personales independientes". Sigue el modelo OCDE moderno, y los autónomos van por el art. 7. Si alguien te cita el art. 14 del convenio para esto, está usando el convenio **antiguo de 1966**, que está derogado. Ese texto sigue circulando por internet.

**El riesgo específico de este escenario no es de IVA, es de calificación.** Un proveedor que tiene un solo cliente, que resulta ser la empresa de su socio, que cobra un porcentaje del beneficio en lugar de un precio por servicio, y que no tiene medios propios diferenciados, es el perfil de manual de dos cosas:

- **Falso autónomo** (relación laboral encubierta). El art. 8.1 del Estatuto de los Trabajadores presume que hay contrato de trabajo *"entre todo el que presta un servicio por cuenta y dentro del ámbito de organización y dirección de otro y el que lo recibe a cambio de una retribución"*. Es una presunción que se destruye con prueba en contrario — pero **hay que tener la prueba**.
- **Operación vinculada** valorada a mercado, si además resultas ser socio.

Dato que puede tranquilizarte: si te declarasen falso autónomo, **el que paga es la empresa alemana, no tú**. Sanción, alta retroactiva en Régimen General y cuotas de los últimos 4 años con recargo, todo a cargo del empleador. A ti te reconocerían derechos laborales. Pero destruiría el modelo del 40 % y te convertiría en asalariado con nómina.

Y no vale el argumento de "es una empresa alemana, la ley española no le llega". El Reglamento (CE) 883/2004, art. 11.3.a) aplica la ley del país donde se trabaja, y el Reglamento 987/2009, art. 21.1 obliga al empresario extranjero a cumplir *"como si su domicilio social o sede de explotación se encontraran en el Estado miembro competente"*.

### 4.3. Tu mejor defensa: la figura del TRADE

Aquí hay una buena noticia que probablemente nadie te ha contado. Existe la figura del **Trabajador Autónomo Económicamente Dependiente (TRADE)**, regulada en la Ley 20/2007 (LETA). Y encaja contigo casi como un guante.

El art. 11.1 LETA define al TRADE como quien trabaja *"de forma habitual, personal, directa y predominante para una persona física o jurídica... del que dependen económicamente por percibir de él, al menos, el 75 por ciento de sus ingresos"*. Tú estás prácticamente al 100 %. La ley dice "persona física o jurídica", sin exigir que sea española.

El art. 11.2 exige cumplir cinco condiciones a la vez. Léelas con atención, porque son tu checklist:

- **a)** No tener trabajadores por cuenta ajena ni subcontratar.
- **b)** No ejecutar la actividad *"de manera indiferenciada con los trabajadores que presten servicios bajo cualquier modalidad de contratación laboral por cuenta del cliente"*.
- **c)** *"Disponer de infraestructura productiva y material propios, necesarios para el ejercicio de la actividad e independientes de los de su cliente"* — tu ordenador, tu móvil, tu software, no los de la GmbH.
- **d)** *"Desarrollar su actividad con criterios organizativos propios"*.
- **e)** *"Percibir una contraprestación económica en función del resultado de su actividad, de acuerdo con lo pactado con el cliente y asumiendo riesgo y ventura de aquella"*.

**La letra e) es oro para ti.** La ley **exige** que la retribución vaya en función del resultado asumiendo riesgo y ventura. Cobrar el 40 % del beneficio repartible encaja literalmente en la definición legal. Es decir: cobrar un porcentaje del beneficio **no es sospechoso, es exactamente lo que la ley describe** — siempre que esté documentado.

El art. 12.1 exige que el contrato *"se formalizará siempre por escrito y deberá ser registrado en la oficina pública correspondiente"*. Y el art. 12.4: *"Cuando el contrato no se formalice por escrito... se presumirá, salvo prueba en contrario, que el contrato ha sido pactado por tiempo indefinido."*

Derechos que te da: 18 días hábiles de interrupción anual (art. 14.1), indemnización si el cliente resuelve sin causa justificada (art. 15.3), protección en caso de baja o fuerza mayor (art. 16), y jurisdicción social (art. 17.1).

**Un aviso:** el art. 11.3 LETA dice que *"los profesionales que ejerzan su profesión conjuntamente con otros en régimen societario... no tendrán en ningún caso la consideración de trabajadores autónomos económicamente dependientes"*. Si resultas ser socio de la GmbH, esto **podría** excluirte de la figura del TRADE. La redacción parece pensada para sociedades profesionales españolas, pero no he encontrado doctrina que lo aclare para una participación en sociedad extranjera. Los dos escenarios son en parte incompatibles.

### 4.4. Escenario SOCIO (tienes participaciones)

Si tienes participaciones, **no es una salida cómoda: es un cambio de problema**.

**Lo que mejora:** el reparto de beneficio a un socio en su condición de socio (dividendo) no es contraprestación de un servicio. Está fuera del ámbito del IVA. No hay factura, no hay ROI, no hay 349, no hay casilla 59 ni 103.

**Lo que empeora:**

1. **Deja de ser rendimiento de actividad económica** y pasa a la base del ahorro del IRPF, con su propia escala (19 % / 21 % / 23 % / 27 % / 30 %).
2. **Alemania retiene en origen el 26,375 %** (25 % de Kapitalertragsteuer más 5,5 % de Solidaritätszuschlag). El convenio España-Alemania solo te permite el **15 %** — el 5 % del art. 10.2.a) exige que el perceptor sea una **sociedad**, no una persona física. Tengas el 10 %, el 40 % o el 90 %, tú vas al 15 %.
3. Esos **11,375 puntos de diferencia** hay que reclamárselos al Bundeszentralamt für Steuern (§ 50c EStG), por vía exclusivamente electrónica, con un registro previo que puede tardar hasta 6 semanas. **Si no los reclamas, los pierdes**: ese exceso no es deducible en España.
4. **Antes de repartir**, la GmbH ya ha pagado su propio impuesto: 15 % de Körperschaftsteuer + 5,5 % de Soli sobre esa cuota + Gewerbesteuer municipal. Con un Hebesatz del 400 % son unos **29,8 %**. Ese dinero ya no llega.
5. **Modelo 720 obligatorio** si tus participaciones valen más de 50.000 euros. Y ojo a cómo se valoran: el art. 16.Uno de la Ley 19/1991 obliga a tomar el mayor de tres valores, incluido *"el que resulte de capitalizar al tipo del 20 por 100 el promedio de los beneficios de los tres ejercicios sociales cerrados"*. Capitalizar al 20 % es **multiplicar por 5**. Basta con que la GmbH gane 25.000 euros de media al año para que tu 40 % supere los 50.000 y nazca la obligación. Con la facturación que describes, **el umbral ya está superado**.
6. **Operaciones vinculadas**: el art. 18.2 LIS considera vinculados a una entidad y sus socios con participación igual o superior al 25 %. Con el 40 %, cada factura tuya a la GmbH es una operación vinculada revisable, que tienes que poder justificar a valor de mercado.
7. **Riesgo de verdeckte Gewinnausschüttung** (distribución oculta de beneficios, § 8 Abs. 3 Satz 2 KStG). Si tienes participaciones y facturas el 40 % del beneficio, el Finanzamt puede decir que eso no es una factura, es un dividendo disfrazado. Doble golpe: el gasto se rechaza en la GmbH (unos 30 % de coste) **y** se somete a retención como dividendo.
8. **Exit tax** si algún día te mudas. Ver apartado 5.

**Lo que sí funciona a tu favor en este escenario:** la transparencia fiscal internacional del art. 91 LIRPF **no se te aplica**, por tres motivos independientes: (a) exige participación igual o superior al 50 % y tú tienes el 40 %; (b) exige que el impuesto extranjero sea inferior al 75 % del español (18,75 %) y Alemania cobra entre 22,8 % y 29,8 %; (c) el art. 91.14 excluye expresamente a las entidades residentes en la UE que realicen actividades económicas reales. Una academia con alumnos, plataforma y facturación acredita eso sin problema.

### 4.5. El escenario MIXTO es el más probable y el más peligroso

Socio que **además** presta servicios reales. Es lo más habitual en la práctica. Y exige **separar los dos flujos**:

- La parte que retribuye tu **trabajo** va por factura, con inversión del sujeto pasivo, ROI y 349, valorada a precio de mercado.
- La parte que retribuye tu **capital** va por dividendo.

Llamar "reparto del 40 % del beneficio" a lo que en realidad es la retribución de un trabajo es exactamente lo que Hacienda recalifica.

### 4.6. Cuál te conviene, y cómo documentarlo

**Te conviene el escenario PROVEEDOR en todos los niveles de facturación que has planteado**, de 15.000 a 230.000 euros. Los números están en los apartados 6 y 7.

La razón de fondo, y es sencilla: **lo que tú facturas es gasto deducible para la GmbH**. Sale del beneficio **antes** del impuesto alemán de sociedades del 29,8 %. Un dividendo sale **después**. Por cada 100 euros de beneficio que quieren que te lleguen, la vía factura no cuesta nada de impuesto alemán de sociedades y la vía dividendo cuesta 29,83 euros **antes de que España toque nada**.

Y esto es importante para tu conversación con David: **vuestros intereses están alineados**. Que tú factures reduce también la base imponible alemana de la GmbH. A la empresa le sale más barato pagarte facturando que repartiendo dividendo. No tiene nada que perder.

**Cómo documentarlo bien.** Necesitas un contrato de prestación de servicios por escrito que incluya:

1. **Objeto**: qué servicio concreto prestas. Formación, análisis, marketing, gestión de comunidad. Un servicio identificable, no "un porcentaje del beneficio".
2. **Base de cálculo del 40 %**: qué se considera beneficio repartible, qué gastos se descuentan antes, quién lo certifica y con qué periodicidad se liquida. Sin esto no puedes justificar nada ante nadie.
3. **Medios**: que aportas tú tu propia infraestructura (ordenador, software, conexión), independiente de la GmbH. Art. 11.2.c) LETA.
4. **Criterios organizativos propios**: que decides tú cómo y cuándo trabajas. Art. 11.2.d) LETA.
5. **Ausencia de exclusividad impuesta** y ausencia de horario fijo impuesto por el cliente.
6. **Riesgo y ventura**: que tu retribución depende del resultado. Art. 11.2.e) LETA.
7. **Cuidado con las palabras**: que **no** describa el pago como licencia de metodología, de marca, de material formativo o de derechos. Eso te mete en el § 50a Abs. 1 Nr. 3 EStG alemán y activa una retención del 15 % en origen. Ver apartado 5.

Y una cosa que **no** debes hacer: cerrar ventas de cursos en nombre de la GmbH desde España de forma habitual. El art. 5.5 del Convenio España-Alemania dice que si alguien *"tenga y ejerza habitualmente en un Estado contratante poderes que la faculten para concluir contratos en nombre de la empresa, se considerará que esa empresa tiene un establecimiento permanente en ese Estado"*. Le crearías a la GmbH un establecimiento permanente en España, con obligación de tributar aquí. Tu escudo es el art. 5.6: ser un **agente independiente** que actúa en el marco ordinario de su actividad.

Fíjate en la tensión: **cuanto más dependiente seas a efectos laborales, más establecimiento permanente creas a efectos fiscales**. Los dos riesgos se retroalimentan, y el mismo contrato bien redactado te cubre de los dos.

### 4.7. El riesgo del que nadie habla: que la GmbH acabe siendo española

Este es el que más dinero cuesta y el que menos gente mira.

El art. 8.1 de la Ley del Impuesto sobre Sociedades dice que una entidad es residente en España si tiene *"su sede de dirección efectiva en territorio español"*, entendiendo que la tiene *"cuando en él radique la dirección y control del conjunto de sus actividades"*. Es un criterio autónomo: ni el domicilio social ni el país de constitución lo evitan.

Si tú tomas desde España las decisiones de negocio de la academia (producto, precios, marketing, contratación), Hacienda puede declarar que **la GmbH es residente fiscal española** y exigirle el Impuesto sobre Sociedades español sobre **todo el beneficio mundial**, no solo sobre tu 40 %.

Que David resida en Alemania es tu mejor defensa. Pero hay que poder **documentarlo**: actas de reuniones celebradas en Alemania, decisiones formalizadas allí, rastro de que la dirección está donde decís que está.

---

## 5. Si te vas: Dubái o Paraguay con un cliente alemán

Aquí hay dos riesgos, no uno. El español, que es el que todo el mundo mira, y el alemán, que es el que nadie mira y que en tu caso es el gordo.

### 5.1. El riesgo español: mejor de lo que crees

**Buena noticia 1: no hay cuarentena fiscal.** El art. 8.2 LIRPF obliga a seguir tributando en España durante el año del cambio y **los cuatro siguientes** solo si te mudas a un **paraíso fiscal**. La lista española vigente (Orden HFP/115/2023, última consolidación de junio de 2026) **no incluye ni a los Emiratos Árabes Unidos ni a Paraguay**. Mucho contenido en internet sigue diciendo que Dubái es paraíso fiscal para España: es **falso** desde que entró en vigor el convenio de 2006.

**Buena noticia 2: el "núcleo de intereses económicos" juega a tu favor.** El art. 9.1.b) LIRPF te considera residente si *"radique en España el núcleo principal o la base de sus actividades o intereses económicos"*. El Tribunal Supremo lo aclaró en tres sentencias de julio de 2024 (recursos 1909/2023, 1913/2023 y 2613/2023): hay que ponderar **dónde se obtienen las rentas, dónde está el patrimonio inmobiliario y mobiliario, y desde dónde se administra**.

Aplicado a ti: si te vas y (a) tu única fuente de renta es una empresa alemana, (b) no tienes inmuebles ni cartera en España, y (c) no gestionas nada desde España, entonces **renta: Alemania. Patrimonio: fuera. Gestión: fuera**. El art. 9.1.b) se queda sin anclaje. Que tu cliente sea alemán es un argumento **a tu favor**, no en contra.

**Buena noticia 3:** la presunción del último párrafo del art. 9.1 (cónyuge e hijos menores en España) **no te aplica**: eres soltero sin hijos.

**El riesgo real es el art. 9.1.a):** los 183 días y las "ausencias esporádicas". Ahí tienes que ser riguroso con el calendario y con la prueba.

### 5.2. Dubái: el problema que casi nadie te cuenta

**Existe convenio España-Emiratos (BOE 23/01/2007). Pero a ti no te sirve.**

El art. 4 de ese convenio define "residente de los Emiratos Árabes Unidos" para personas físicas como *"personas físicas domiciliadas en los Emiratos Árabes Unidos y que sean nacionales de los Emiratos Árabes Unidos"*.

Tú eres español. Nunca serás nacional emiratí. Por tanto **nunca serás "residente de los EAU" a efectos del convenio**. Consecuencias concretas:

1. No puedes invocar las reglas de desempate del art. 4.2 (vivienda permanente, centro de intereses vitales).
2. El certificado de residencia fiscal emiratí (el famoso TRC) **no te sirve** para ganar un conflicto con España vía convenio.
3. Tu única defensa sería la ley interna española (art. 9 LIRPF) y la prueba de hechos.

Esto lo confirma la propia DGT en la consulta V1842-13: *"si el trabajador no tiene la nacionalidad de los Emiratos Árabes, no adquirirá la residencia fiscal"* a efectos del convenio.

**Cuánto pagarías en Dubái:**
- Como **persona física con licencia freelance**: el Cabinet Decision 49/2023 solo sujeta al Corporate Tax a las personas físicas cuya cifra de negocio supere **1.000.000 AED** (unos 250.000 euros, tipo de cambio no verificado) al año. Por debajo, ni siquiera hay obligación de registro. Para tus escenarios de 40.000 a 230.000 euros: **0 % y sin registro**.
- Como **sociedad en free zone**: aquí está la trampa. La Ministerial Decision 229/2025 tiene una **lista cerrada** de actividades que dan derecho al 0 %. He leído el documento completo: **consultoría, mentoría, formación, marketing y gestión general NO aparecen**. Tributarías al 9 %, no al 0 %. La única puerta es el apartado de "Headquarter services to Related Parties" — pero eso exige que la GmbH sea parte vinculada de tu sociedad emiratí, es decir, **exige que seas socio con control relevante**. Paradoja: la vía que hace funcionar el 0 % de Dubái es justo la que dispara los problemas alemanes del punto siguiente.

**Conclusión práctica sobre Dubái:** si te vas, vete como **persona física con licencia freelance**, no montando sociedad. Es más simple, es 0 % en tu rango, y evita la lista de actividades cualificadas.

### 5.3. Paraguay: jurídicamente más sólido, con una trampa

**Sí hay convenio España-Paraguay.** Firmado el 25/03/2023, BOE-A-2024-15573, en vigor desde el 14/10/2024 y con efectos desde el 1/01/2025. Y este convenio **sí tiene reglas de desempate normales** (art. 4.2, modelo OCDE: vivienda permanente, centro de intereses vitales, vivienda habitual, nacionalidad, acuerdo amistoso).

Esa es la diferencia estructural con Dubái, y es la más importante de todo este apartado: **en Paraguay tendrías un escudo que en Dubái no existe**. Si España invoca el art. 9.1.b), tú puedes ir al art. 4.2 del convenio y ganar por centro de intereses vitales. A igualdad de todo lo demás, **Paraguay es jurídicamente más sólido que Dubái para un español**, aunque tenga peor marketing.

**La trampa, que ningún blog de "residencia en Paraguay" menciona:** el art. 4.1 del convenio excluye de la definición de residente a *"las personas que estén sujetas a imposición en ese Estado exclusivamente por la renta que obtengan de fuentes situadas en el citado Estado"*.

Paraguay aplica un sistema estrictamente territorial: el IRP grava solo la renta de fuente paraguaya. Si vives en Asunción y facturas solo a Alemania, en Paraguay no pagas IRP por esa renta. Un inspector español puede entonces argumentar que estás sujeto **exclusivamente por rentas de fuente paraguaya** y que, por tanto, **no eres residente a efectos del convenio** — y se te cae el escudo, volviendo al escenario Dubái.

Es un debate técnico abierto, no una certeza. La doctrina internacional distingue entre "sujeción plena aunque exenta" y "sujeción limitada por fuente". No he encontrado consulta de la DGT ni resolución del TEAC específica sobre Paraguay tras el convenio de 2024. Es la pregunta 4 del apartado 9.

### 5.4. El riesgo alemán: esto es lo gordo, y le toca a David

**§ 16 de la Außensteuergesetz (AStG).** Texto literal, traducido: si un contribuyente alemán solicita deducir gastos derivados de relaciones comerciales con una **sociedad extranjera que no tributa o tributa solo de forma insignificante**, entonces, a efectos del § 160 de la Abgabenordnung, el acreedor o perceptor *"solo se considera exactamente identificado cuando el contribuyente revela **todas las relaciones**, directas o indirectas, que existen o han existido entre él y esa sociedad"*. Y el § 16 Abs. 2 permite exigir además una **declaración jurada** (Versicherung an Eides Statt) sobre la exactitud y exhaustividad de esos datos.

**Qué significa en cristiano:** si montas una sociedad en Dubái y le facturas a la GmbH, el Finanzamt alemán puede exigirle a David que revele toda la cadena de relaciones entre la GmbH y la entidad emiratí, con nombres y apellidos, bajo declaración jurada. **La estructura de Dubái no es opaca frente a Alemania: activa un régimen de transparencia forzosa.** Y la carga probatoria no es tuya, es de David.

**Qué pasa si no lo cumple: § 160 AO.** Literal, traducido: los gastos *"regularmente no se tendrán en cuenta a efectos fiscales cuando el contribuyente no atienda el requerimiento de la autoridad fiscal de identificar exactamente a los acreedores o perceptores"*.

**Traducido a dinero:** si facturas 150.000 euros desde Dubái y el gasto se rechaza, a un tipo combinado del 30 % eso son **unos 45.000 euros de coste adicional para la GmbH**. Es cuantificable y le toca a tu socio.

**¿Cuándo se considera "tributación insignificante"?** El FG Münster (sentencia de 8/03/2023, asunto 9 K 147/20 K,G, firme) fijó el umbral en **menos del 10 %** de carga por impuesto sobre la renta. Dubái: 9 % o 0 %. Paraguay para renta extranjera: 0 %. **En los dos casos se activa el § 16 AStG.**

### 5.5. DAC6: y aquí está el hallazgo que lo cambia todo

El § 138e Abs. 1 Nr. 3 letra d) de la Abgabenordnung marca como operación potencialmente declarable aquella en la que *"el perceptor de pagos transfronterizos deducibles como gasto entre dos o más **empresas vinculadas** reside en un territorio que no aplica impuesto de sociedades o lo aplica a un tipo del 0 % o cercano al 0 %"*.

Y ahora viene lo importante. El § 138e Abs. 3 define "empresa vinculada" por cuatro vías **alternativas**. La cuarta, literal, traducida: *"una persona tiene derecho a al menos el 25 % de los beneficios de otra persona"*.

**Tu 40 % de reparto ya te convierte en empresa vinculada, tengas o no participaciones.**

Esto significa que **la distinción socio/proveedor, que es la gran incógnita de todo tu caso, es irrelevante para este punto**. En los dos escenarios, un pago de la GmbH a una entidad tuya en Dubái es potencialmente declarable bajo DAC6.

**Lo que puede salvarte:** el § 138d Abs. 2 Satz 1 Nr. 3 AO exige, para los indicios del Abs. 1, un **test del beneficio principal**: que un tercero razonable pueda esperar que el beneficio fiscal es el propósito principal o uno de los principales. Si te mudas por motivos vitales genuinos y la retribución no cambia, ese argumento se sostiene. Si te mudas **y encima reestructuras el contrato metiendo una sociedad interpuesta**, se cae.

**Plazo y sanción:** 30 días desde que la operación está lista para ejecutarse (§ 138f AO), ante el Bundeszentralamt für Steuern. Multa de hasta **25.000 euros** por infracción dolosa o negligente (§ 379 Abs. 2 y 7 AO).

**30 días es un plazo cortísimo.** Si te mudas en enero y David se entera en abril de que había que declarar, el plazo ya está incumplido. Es un argumento concreto para hablar con él **antes** de mudarte, no después.

### 5.6. Lo que sí está limpio

- **Ni Alemania ni España tratan a EAU o Paraguay como jurisdicción no cooperativa.** La lista UE actualizada el 17/02/2026 incluye a Samoa Americana, Anguila, Guam, Palaos, Panamá, Rusia, Islas Turcas y Caicos, Islas Vírgenes de EE.UU., Vanuatu y Vietnam. Ni EAU ni Paraguay. Consecuencia: no se aplica la Steueroasen-Abwehrgesetz alemana (que prohíbe de plano deducir gastos hacia listados) ni el indicio incondicional del § 138e Abs. 2 AO. Reverificar en octubre de 2026, que hay revisión.
- **Alemania no te retendría nada** por servicios normales, vivas donde vivas. El § 50a Abs. 1 EStG tiene una lista cerrada de cuatro supuestos: espectáculos artísticos o deportivos ejecutados en Alemania, explotación de esos espectáculos, cesión de uso de derechos, y miembros de consejos de vigilancia. La consultoría, el coaching, la formación a distancia y la gestión **no están**.

**Pero cuidado con el punto 3 de esa lista.** Si tu contrato se redacta como *"cesión de licencia de metodología / marca / material formativo"*, cae en el § 50a Abs. 1 Nr. 3 y se activa una retención del **15 % más recargo de solidaridad**. Y aquí muerde la ausencia de convenio: **Alemania no tiene convenio con los EAU desde el 1/01/2022** (el de 2010 expiró y Alemania comunicó en junio de 2021 que no lo prorrogaba), ni tiene convenio general con Paraguay (solo uno de 1983 sobre transporte aéreo). Sin convenio, ese 15 % sería **definitivo e irrecuperable**.

Es decir: **cómo se titule tu contrato deja de ser cosmético y pasa a valer dinero real** en cuanto te mudas.

### 5.7. Estonia: por qué no te sirve

Lo menciono porque circula mucho. El impuesto de sociedades estonio es 0 % mientras no repartas beneficio, y 22 % al distribuirlo en 2026 (la subida al 24 % fue derogada en diciembre de 2025). Suena bien.

Pero lo dice la propia agencia tributaria estonia: *"An Estonian company formed by an e-resident is a resident of Estonia that pays income tax in Estonia on its worldwide income"* y *"income of Estonian companies is also taxed abroad **when the management of Estonian companies occurs outside of Estonia**"*. Y: *"e-residency in Estonia does not give an automatic exemption from foreign tax liabilities"*.

Combinado con el art. 8.1.c) de la Ley del Impuesto sobre Sociedades española (una entidad es residente en España cuando *"radique en territorio español la dirección y control del conjunto de sus actividades"*), una OÜ dirigida por ti desde España sería **sociedad residente en España**, tributando al 25 % sobre el beneficio mundial, con doble imposición y sin diferimiento.

**Estonia solo funciona si te mudas a Estonia.** Para tu caso, no tiene sentido.

### 5.8. Y si te quedas en España pero montas una sociedad fuera

No funciona. El art. 91 LIRPF (transparencia fiscal internacional) te obliga a imputarte las rentas de la entidad no residente si controlas el 50 % o más y esa entidad tributa por debajo del 75 % de lo que habría pagado en España. El 0 % o el 9 % de Dubái están muy por debajo del 75 % del 25 % español. Te lo imputas igual en tu IRPF.

### 5.9. Exit tax: la ventana que se cierra si te haces socio

El art. 95 bis LIRPF grava las plusvalías latentes de participaciones al perder la residencia. Requisitos acumulativos:

- Haber sido contribuyente **al menos 10 de los 15 períodos anteriores**, y además
- que el valor de mercado conjunto exceda de **4.000.000 euros**, **o**
- que el porcentaje de participación sea **superior al 25 %** y el valor exceda de **1.000.000 euros**.

Con el 40 %, tu umbral es el de **1.000.000 euros**, no el de 4.000.000.

**A partir de qué tamaño te salta.** El art. 95 bis.3.b) valora las no cotizadas por el mayor del patrimonio neto contable o *"el que resulte de capitalizar al tipo del 20 por ciento el promedio de los resultados de los tres ejercicios sociales cerrados"*. Capitalizar al 20 % es multiplicar por 5. Tu 40 % supera el millón cuando el beneficio medio de la GmbH supera los **500.000 euros al año**.

En tu escenario de 230.000 euros de ingresos propios (el 40 % del repartible), el beneficio repartible sería de unos 575.000 euros: **por encima del umbral**. En los escenarios de 40.000 a 100.000, no.

**Y si te vas a Dubái o Paraguay:** no te aplica el régimen favorable del art. 95 bis.6 (diferimiento de 10 años, solo pagas si vendes), que está reservado a traslados dentro de la UE o el Espacio Económico Europeo. Te quedaría el aplazamiento del art. 95 bis.4, que exige convenio con cláusula de intercambio de información — España lo tiene con ambos —, pero **devenga intereses de demora y exige constituir garantías**.

**Conclusión de orden:** si vas a mudarte **y** vas a hacerte socio, **mudarte antes es materialmente más barato que mudarte después**. El orden importa.

---

## 6. La alternativa que igual no has mirado: socio con dividendos, contra seguir facturando

Vamos a poner los números. Esto es aritmética a partir de tipos verificados, no cifras copiadas de ningún sitio.

### 6.1. Las capas de cada vía

**Vía DIVIDENDO (socio):**
1. La GmbH paga primero su impuesto: 15 % de Körperschaftsteuer + 5,5 % de Soli sobre esa cuota (0,825 puntos) + Gewerbesteuer (3,5 % × Hebesatz municipal; con Hebesatz del 400 % son 14 puntos). **Total: 29,83 %**.
2. Sobre lo que queda, Alemania retiene el 26,375 %, del que solo el 15 % es definitivo por convenio. **Los 11,375 puntos de exceso hay que reclamarlos al BZSt o se pierden.**
3. En España tributa en la base del ahorro (19 / 21 / 23 / 27 / 30 %), con deducción por doble imposición del 15 % alemán (art. 80 LIRPF, con el límite del art. 22.1.a del convenio).

**Vía FACTURA (proveedor autónomo):**
1. En Alemania: **0 %**. Art. 7.1 del convenio. Y además, lo que te pagan es gasto deducible para la GmbH.
2. En España: escala general del IRPF sobre el rendimiento neto (ingresos menos gastos), más cuota de autónomos.

### 6.2. Aritmética por cada 100 euros de beneficio de la GmbH

| Concepto | Vía dividendo | Vía factura |
|---|---|---|
| Impuesto alemán de sociedades | 29,83 € | 0 € |
| Queda | 70,17 € | 100 € |
| Retención alemana definitiva (15 %) | 10,53 € | 0 € |
| Impuesto español | Base del ahorro sobre 70,17 €, menos crédito de 10,53 € | Escala general sobre el neto |
| **Carga total (tramo bajo del ahorro, 19 %)** | **43,2 %** | — |
| **Carga total (tramo alto del ahorro, 30 %)** | **50,9 %** | — |

### 6.3. Comparativa a 40.000, 80.000 y 150.000 euros

Estos son órdenes de magnitud, no liquidaciones. Faltan dos datos para cerrar los números exactos: **tu comunidad autónoma** (la mitad de la escala general del IRPF es autonómica y la diferencia entre Madrid y Cataluña son varios puntos) y el **Hebesatz de Gewerbesteuer del municipio de la GmbH** (mueve la carga alemana entre el 23 % y el 33 %).

| Lo que te llega al año | Vía FACTURA (carga total aprox.) | Vía DIVIDENDO (carga total aprox.) | Diferencia a favor de facturar |
|---|---|---|---|
| **40.000 €** | ~31 % | ~43 % | ~12 puntos ≈ **4.800 €/año** |
| **80.000 €** | ~36 % | ~44 % | ~8 puntos ≈ **6.400 €/año** |
| **150.000 €** | ~40 % | ~45 % | ~5 puntos ≈ **7.500 €/año** |
| **230.000 €** | ~42 % | ~45,5 % | ~3,5 puntos ≈ **8.000 €/año** |

**Lee la tabla al revés también:** el porcentaje de ventaja se estrecha según subes, porque el marginal del IRPF general (hasta el 45-47 %) supera al de la renta del ahorro (23-30 %). **El cruce está en torno a los 250.000-300.000 euros.** Por encima de ahí, la vía dividendo empezaría a ganar.

**Pero justo en ese punto es donde:**
- se dispara el **exit tax** (tu 40 % pasaría del millón de euros de valor),
- el **modelo 720** lleva años siendo obligatorio,
- entran de lleno las **operaciones vinculadas** y el riesgo de **verdeckte Gewinnausschüttung**.

Es decir: la ventaja fiscal del dividendo llega acompañada de las obligaciones más caras de incumplir.

### 6.4. Conclusión de este apartado

**Hacerte socio y cobrar dividendos es fiscalmente peor que facturar como autónomo en todo tu rango realista.** La razón es estructural: añade una capa societaria alemana de casi el 30 % que la vía factura simplemente no tiene.

Ser socio tiene sentido por razones de **control, de derecho societario y de valor patrimonial** — si algún día se vende la academia, una participación vale dinero y un contrato de servicios no. Eso es una decisión patrimonial, no fiscal, y es legítima. Pero no la tomes creyendo que es un ahorro fiscal, porque no lo es.

Lo que sí puede tener sentido a la larga es **la combinación**: ser socio **y** seguir facturando tus servicios a precio de mercado, dejando el dividendo solo para el excedente. Pero eso es exactamente lo que dispara el riesgo de dividendo encubierto si el precio no está documentado.

**Dato con horizonte:** Alemania va a bajar el impuesto de sociedades del 15 % al 10 % entre 2028 y 2032 (Gesetz für ein steuerliches Investitionssofortprogramm, publicado en julio de 2025, § 23 KStG: 14 % en 2028, 13 % en 2029, 12 % en 2030, 11 % en 2031, 10 % desde 2032). La vía dividendo mejora estructuralmente a partir de 2028. No cambia la conclusión de hoy, pero sí la pendiente.

**Dato en contra:** el Hebesatz mínimo de Gewerbesteuer sube del 200 % al 280 % desde 2027 (§ 16 Abs. 4 GewStG, aprobado por el Bundestag el 24/04/2026). Si la GmbH está en un municipio de baja tributación, su carga sube automáticamente.

---

## 7. Números finales: todos los escenarios

### 7.1. Lo que cambia según crezcas

Un dato que tienes que meter en cualquier proyección y que probablemente no está: **la tarifa plana de 80 euros se acaba**.

El art. 38 ter LETA da la cuota reducida de 80 euros durante los primeros 12 meses, prorrogable otros 12 solo si tus rendimientos netos anuales están por debajo del SMI. Con 15.000 euros al año ya podrías estar por encima. Y con 40.000 o más, la prórroga es imposible.

**Cuota de autónomos real 2026** (Orden PJC/297/2026, art. 18). Tipo total: 31,50 % (28,30 % contingencias comunes + 1,30 % profesionales + 0,90 % cese de actividad + 0,10 % formación + 0,90 % MEI).

| Rendimiento neto | Tramo | Base mínima | Cuota mínima aprox. |
|---|---|---|---|
| 3.190-3.620 €/mes (~40.000 €/año) | 9 | 1.519,61 € | ~479 €/mes = **~5.750 €/año** |
| 4.050-6.000 €/mes (~60-72.000 €/año) | 11 | 1.732,03 € | ~546 €/mes = **~6.550 €/año** |
| Más de 6.000 €/mes (~72.000 €+) | 12 | 1.928,10 € | ~607 €/mes = **~7.290 €/año** |

**Nota importante:** la Seguridad Social **se aplana a partir de unos 72.000 euros al año**. De ahí para arriba, la cuota mínima ya no sube. Es decir: el salto duro es de 80 euros a unos 480-610 euros al mes. Son unos **6.300 euros anuales más** que hoy. Mételo en cualquier proyección.

### 7.2. Tabla comparativa de escenarios

| Escenario | Alemania | España | Cuota autónomos | Carga total aprox. | Obligaciones extra |
|---|---|---|---|---|---|
| **Hoy: 15.000 €, proveedor, España** | 0 % | IRPF bajo, se te devuelve casi todo el 130 | 80 €/mes (tarifa plana) | ~20-25 % | ROI + 349 + 303 c.59 + 390 + 130 |
| **40.000 €, proveedor, España** | 0 % | Marginal ~30 %, medio ~16-17 % | ~5.750 €/año | **~31 %** | Las mismas. 349 sigue trimestral |
| **80.000 €, proveedor, España** | 0 % | Marginal ~37-40 % | ~6.550 €/año | **~36 %** | Las mismas |
| **150.000 €, proveedor, España** | 0 % | Marginal ~45 % | ~7.290 €/año | **~40 %** | Las mismas. 349 puede pasar a mensual |
| **230.000 €, proveedor, España** | 0 % | Marginal ~45-47 %, medio ~39 % | ~7.290 €/año | **~42 %** | 349 **mensual** (>50.000 €/trimestre) |
| **40.000 €, socio con dividendos** | 29,8 % sociedad + 15 % retención | Ahorro 19-21 % con crédito | RETA por control societario (a verificar) | **~43 %** | + Modelo 720 + devolución BZSt |
| **150.000 €, socio con dividendos** | 29,8 % + 15 % | Ahorro 23 % con crédito | Idem | **~45 %** | + 720 + BZSt + operaciones vinculadas |
| **230.000 €, socio con dividendos** | 29,8 % + 15 % | Ahorro 23-27 % con crédito | Idem | **~45,5 %** | + 720 + BZSt + vinculadas + **exit tax si te vas** |
| **Dubái, persona física freelance, proveedor** | 0 % (si el contrato dice servicios) | 0 % si rompes residencia limpiamente | 0 % (cotización congelada) | **~0 %** | **Sin escudo de convenio**. § 16 AStG y DAC6 caen sobre David |
| **Dubái, sociedad free zone** | 0 % (servicios) | 0 % si rompes residencia | 0 % | **9 %** (consultoría no es actividad cualificada) | § 16 AStG + DAC6 + carga probatoria para David |
| **Paraguay, proveedor** | 0 % (servicios) | 0 % si rompes residencia | 0 % | **~0 %** (renta extranjera no sujeta al IRP) | **Sí hay escudo de convenio**, con la duda del art. 4.1 |
| **Estonia OÜ dirigida desde España** | 0 % | **25 % IS español** (sociedad residente en España) + doble imposición | — | **Peor que quedarse** | No tiene sentido |

### 7.3. Lo que dice esta tabla

1. **Facturar gana a cobrar dividendos** en todo tu rango realista. Entre 3 y 12 puntos.
2. **Irse es lo que más mueve la aguja**, con diferencia. Pero el ahorro fiscal español viene acompañado de un problema alemán que le cae a tu socio y que puede costarle a él 45.000 euros en un año de 150.000.
3. **Paraguay es jurídicamente más sólido que Dubái** para un español, por el convenio. Dubái es más simple si vas como persona física freelance.
4. **Si te vas y eres socio, vete antes de que la participación valga un millón.** El orden importa y el exit tax no perdona.
5. **Lo que hagas con el contrato importa más que dónde vivas.** Un contrato que diga "cesión de licencia" en vez de "servicios" te cuesta un 15 % irrecuperable en cuanto salgas de España.

---

## 8. Lo que no se ha podido verificar

Esto es lo que **no** doy por bueno. No es relleno: es lo que tu asesoría tiene que cerrar antes de que tomes decisiones.

### Sobre tu caso concreto (se resuelve con datos tuyos)

1. **Si eres socio o proveedor.** El dato central. Se resuelve en el Handelsregister alemán (handelsregister.de, gratis) más el contrato firmado.
2. **Si estás dado de alta en el ROI.** Dos minutos en VIES.
3. **Si la GmbH tiene USt-IdNr. válida** en VIES. Sin ella no se puede presentar materialmente el 349.
4. **Qué pone hoy en tus facturas.** Sin ver una real no se sabe si el problema es "facturaste con IVA" o "facturaste sin ROI", y el remedio es distinto.
5. **Cuántos modelos 349 llevas sin presentar** y desde cuándo facturas a Alemania. Determina el importe acumulado de sanciones.
6. **Tu comunidad autónoma de residencia.** Sin ella no hay un solo tipo efectivo de IRPF real: la mitad de la escala general es autonómica.
7. **El Hebesatz de Gewerbesteuer del municipio de la GmbH.** Mueve la carga alemana entre el 23 % y el 33 %. Lo sabe David en dos minutos.
8. **Si alguna pasarela o cuenta está a tu nombre.** Si lo está, cambia radicalmente el análisis.
9. **Si el 40 % está definido por escrito**: qué se considera beneficio repartible, qué gastos se descuentan, quién lo certifica.
10. **La fecha exacta de tu alta en autónomos**, para saber cuándo se acaba la tarifa plana de 80 euros.

### Sobre el derecho (queda para la asesoría)

11. **No he encontrado sentencia del Tribunal Supremo ni resolución del TEAC** que confirme expresamente que, para **prestaciones de servicios**, la falta de alta en el ROI no permite a Hacienda exigir el IVA español. Es la pieza jurídica más valiosa que falta y la única que convertiría un razonamiento sólido en una defensa firme.
12. **No está cerrado si la sanción del 349 son 200 euros fijos o 20 euros por dato con mínimo de 300.** En tu caso la diferencia práctica es pequeña, pero la respuesta doctrinal está abierta. No he podido leer la resolución del TEAC RG 00/00022/2017.
13. **No he podido leer los literales del art. 69, art. 84.Uno.2º, art. 89 LIVA, art. 76 RIRPF ni art. 27 LGT directamente en el BOE**: el texto consolidado se trunca. Las citas vienen de Iberley y agregadores que reproducen el BOE, pero no son fuente oficial. Antes de citar cualquiera de esos artículos en un escrito ante Hacienda, hay que descargar el PDF consolidado.
14. **Tampoco el literal íntegro del art. 3 del RD 1065/2007** (obligación de ROI): viene de la síntesis oficial de la AEAT, que es fiable pero no es el texto normativo.
15. **Ni el art. 226.11 bis de la Directiva 2006/112/CE** (la mención "Autoliquidación"), **ni el art. 138 apartados 1 y 1 bis**. EUR-Lex devuelve el texto truncado. Esto afecta directamente a la solidez del argumento bienes/servicios del punto 11.
16. **No he encontrado ninguna consulta vinculante de la DGT ni resolución del TEAC** sobre: (a) un autónomo español que se muda al extranjero conservando un único cliente extranjero, bajo el art. 9.1.b) LIRPF; ni (b) si un residente en Paraguay bajo régimen territorial califica como "residente" a efectos del art. 4.1 del convenio de 2024. La base oficial PETETE es una aplicación JavaScript que no se deja consultar automáticamente: hay que buscar a mano.
17. **No he leído el texto íntegro de las sentencias del Tribunal Supremo de julio de 2024** sobre el art. 9.1.b), solo resúmenes. Los números de recurso están identificados y son consultables en CENDOJ: 1909/2023 (ECLI:ES:TS:2024:3882), 1913/2023 y 2613/2023.
18. **No he verificado el literal de la disposición final primera del RDL 15/2025** sobre las fechas de Verifactu. Tengo la referencia (BOE-A-2025-24446) y fuentes secundarias coincidentes, pero no el texto.
19. **Cuantía exacta de las sanciones del art. 22.2 LISOS** (no solicitar el alta en Seguridad Social, caso de falso autónomo). Encontré dos rangos incompatibles en fuentes secundarias: 3.750 a 12.000 euros por trabajador, y 751 a 7.500 euros. El BOE devolvió error. **No afirmo ninguna cifra.**
20. **Si el SEPE admite registrar un contrato de TRADE cuando el cliente es una sociedad extranjera sin NIF español.** La Ley 20/2007 no lo excluye, pero el trámite está pensado para clientes españoles. Hay que preguntarlo directamente.
21. **Si el art. 11.3 LETA excluye de la figura del TRADE a quien participa en una sociedad extranjera.** La redacción parece pensada para sociedades profesionales españolas. No he encontrado doctrina.
22. **Si el art. 305.2.b LGSS** (obligación de alta en RETA por control efectivo de una sociedad) se aplica cuando la sociedad es extranjera. Relevante para el escenario socio: podría obligarte a cotizar en RETA aunque solo cobraras dividendos.
23. **Deducibilidad del gimnasio (27 €/mes).** Mi impresión es que no cumple la correlación con los ingresos del art. 29 LIRPF, pero **no lo afirmo sin fuente**. Tampoco he verificado la deducibilidad de la formación.
24. **Corrección importante sobre los "2.000 euros de difícil justificación":** no son 2.000 automáticos. Es el **5 % del rendimiento neto con tope de 2.000 euros** (art. 30 RIRPF, estimación directa simplificada). Con tus 15.000 euros actuales te salen unos **640 euros**, no 2.000. Solo llegarías al tope con 40.000 euros de rendimiento neto. El 5 % lo tengo confirmado para 2025 en fuente AEAT; para 2026 solo de fuentes secundarias.
25. **Suministros de la vivienda:** no es el 30 % de la factura. Es el 30 % de la parte proporcional afecta (art. 30.2.5ª.b LIRPF). Fórmula: 30 % × (m² afectos / m² totales). El resultado típico es un 5-10 % de la factura. Y requiere haber declarado la afectación parcial en el modelo 036 indicando los metros.
26. **El tipo de interés de demora tributario vigente en 2026**, necesario para cuantificar regularizaciones de más de 12 meses.
27. **Si el certificado de residencia fiscal de la AEAT se llama "modelo 01".** La AEAT no usa esa nomenclatura en ninguna de sus páginas: lo llama "certificado tributario de residencia fiscal", y hay dos modalidades distintas ("España" y "España – Convenio"; para Alemania hay que pedir **Convenio**). Tampoco he verificado su plazo de validez.
28. **El régimen de IVA alemán de la formación.** Si los servicios formativos de la GmbH están exentos en Alemania (§ 4 Nr. 21 UStG), el IVA por inversión del sujeto pasivo de tus facturas dejaría de ser neutro para David y se convertiría en coste real. No lo he verificado, y puede cambiar el apetito de David por cualquier reestructuración.
29. **El tratamiento de wallets de autocustodia** (non-custodial) en el modelo 721. El art. 42 quater cubre monedas virtuales custodiadas por terceros; el criterio de la DGT sobre autocustodia existe pero no lo he leído. Relevante porque el negocio cobra en cripto.
30. **La regla de reiteración del modelo 720** (volver a declarar solo si un bloque ya declarado sube más de 20.000 euros): fuentes secundarias, no confirmada en la FAQ oficial.
31. **El calendario oficial de la AEAT para 2027** aún no está publicado, así que el plazo exacto del 4T 2026 no está confirmado.
32. **Requisitos migratorios y de sustancia reales** de Dubái y Paraguay: días exigidos, coste de licencia freelance, plazos de residencia y RUC. Todo lo encontrado viene de webs comerciales que venden residencias y no lo considero fiable.
33. **El tipo de cambio AED/EUR** usado para situar el millón de AED en "unos 250.000 euros" es aproximado.
34. **Seguridad Social y cobertura sanitaria** en los escenarios de salida. Ni EAU ni Paraguay tienen convenio bilateral de Seguridad Social con España verificado en este informe. Eso significa que **tus años cotizados se congelan**.
35. **Las listas de jurisdicciones no cooperativas cambian.** La española se modificó en junio de 2026 (Orden HAC/649/2026) y la de la UE se revisa en octubre de 2026. Hoy ninguna incluye EAU ni Paraguay. Reverificar justo antes de cualquier mudanza.

---

## 9. Las 5 preguntas para tu asesoría

Copia y pega. Están escritas para que no tengas que traducir nada.

---

**PREGUNTA 1**

> Presto servicios desde España a una sociedad alemana (GmbH). Quiero saber, con la mayor precisión posible, si el hecho de no haber estado dado de alta en el Registro de Operadores Intracomunitarios (ROI) durante el período en que he emitido facturas sin IVA español permite a la AEAT exigirme el IVA repercutido del 21 % sobre esas operaciones.
>
> Mi lectura es que **no**, y quiero que me la confirméis o la desmontéis: entiendo que la no sujeción de una prestación de servicios deriva de la regla objetiva de localización del art. 69.Uno.1º LIVA y del art. 44 de la Directiva 2006/112/CE, que solo exige que el destinatario sea empresario o profesional actuando como tal, y que el alta en el ROI es una obligación censal (art. 3.3.d) RD 1065/2007) y no un requisito constitutivo. Entiendo también que las condiciones materiales introducidas por las Quick Fixes de 2020 (Directiva (UE) 2018/1910) afectan al art. 138 de la Directiva, que se titula "Exenciones de las entregas de bienes" y no alcanza a los servicios.
>
> Concretamente os pido: **¿existe alguna sentencia del Tribunal Supremo, resolución del TEAC o consulta vinculante de la DGT que se pronuncie expresamente sobre este punto para prestaciones de servicios (no para entregas de bienes)?** Si existe, necesito la referencia. Si no existe, decídmelo también, porque entonces sé que estoy sobre una inferencia y no sobre doctrina consolidada.

---

**PREGUNTA 2**

> Quiero regularizar voluntariamente, antes de cualquier requerimiento de la AEAT, mi situación con las operaciones intracomunitarias. Os pido que me confirméis este orden de actuación y que me digáis si cambiaríais algo:
>
> 1. Presentar modelo 036 marcando casillas 130, 582 y 584 para el alta en el ROI, y esperar a la concesión (plazo de 3 meses con silencio negativo).
> 2. Validar la USt-IdNr. de mi cliente alemán en VIES desde la Sede de la AEAT con certificado digital, y conservar el justificante con CSV.
> 3. Reemitir o rectificar las facturas ya emitidas para que incluyan la mención literal «inversión del sujeto pasivo» del art. 6.1.m) del RD 1619/2012 y los NIF-IVA de ambas partes.
> 4. Presentar todos los modelos 349 pendientes (clave S), todos ellos antes de cualquier requerimiento, para acogerme a la reducción a la mitad del art. 198.2 LGT.
> 5. Rectificar los modelos 303 afectados consignando el importe en la casilla 59 (y **no** en la 120), y en su caso el modelo 390 (casilla 103).
>
> Además os pido dos cosas concretas: **(a)** una cuantificación de lo que me va a costar en total esta regularización, distinguiendo entre hacerlo ahora voluntariamente y esperar a un requerimiento; y **(b)** vuestra opinión sobre si la sanción del modelo 349 no presentado es la multa fija de 200 € del primer párrafo del art. 198.1 LGT o el régimen de 20 € por dato con mínimo de 300 € del párrafo de suministro de información.

---

**PREGUNTA 3**

> Cobro de la sociedad alemana el 40 % del beneficio repartible del negocio. **No sé con certeza si figuro como socio (Gesellschafter) en el Handelsregister alemán o si soy únicamente proveedor con un acuerdo de reparto.** Voy a comprobarlo, pero necesito el análisis de los dos escenarios por separado:
>
> **Si soy solo proveedor:** ¿cómo redactamos un contrato de prestación de servicios que (a) me permita defender la condición de trabajador autónomo económicamente dependiente del art. 11 de la Ley 20/2007, aprovechando que el art. 11.2.e) exige precisamente una contraprestación en función del resultado con riesgo y ventura; (b) me proteja frente a la presunción de laboralidad del art. 8.1 del Estatuto de los Trabajadores; y (c) evite crearle a la sociedad alemana un establecimiento permanente en España por agente dependiente conforme al art. 5.5 del Convenio España-Alemania de 2011? ¿Es registrable en el SEPE un contrato de TRADE cuando el cliente es una sociedad extranjera sin NIF español?
>
> **Si soy socio:** ¿qué implicaciones tiene en cuanto a (a) obligación de modelo 720 por las participaciones, teniendo en cuenta la valoración por capitalización al 20 % del art. 16.Uno de la Ley 19/1991; (b) operaciones vinculadas del art. 18.2 LIS y art. 41 LIRPF; (c) riesgo de que el Finanzamt alemán califique mis facturas como verdeckte Gewinnausschüttung del § 8 Abs. 3 Satz 2 KStG; y (d) obligación de alta en RETA como societario conforme al art. 305.2.b LGSS, siendo la sociedad extranjera?

---

**PREGUNTA 4**

> Estoy valorando trasladar mi residencia fiscal a Emiratos Árabes Unidos o a Paraguay, manteniendo como único cliente a la sociedad alemana. Necesito vuestro criterio sobre cuatro puntos:
>
> 1. **Emiratos:** entiendo que el art. 4 del Convenio España-EAU (BOE 23/01/2007) define "residente de los EAU" para personas físicas como quienes están domiciliados allí **y son nacionales emiratíes**, lo que como español me deja sin acceso a las reglas de desempate del art. 4.2 y sin utilidad práctica del certificado de residencia fiscal emiratí (TRC). ¿Lo confirmáis? ¿Qué implica eso para mi defensa si la AEAT invoca el art. 9.1.b) LIRPF?
> 2. **Paraguay:** el Convenio España-Paraguay (BOE-A-2024-15573, en vigor desde el 14/10/2024) sí tiene reglas de desempate estándar. Pero su art. 4.1 excluye de la definición de residente a quien esté sujeto a imposición "exclusivamente por la renta que obtenga de fuentes situadas en el citado Estado", y Paraguay aplica un régimen estrictamente territorial. **¿Me deja eso fuera de la protección del convenio?** ¿Hay consulta de la DGT, resolución del TEAC o doctrina sobre esta cuestión tras el convenio de 2024?
> 3. ¿Merece la pena plantear una **consulta vinculante propia a la DGT** antes de mudarme, y con qué redacción?
> 4. ¿Qué documentación concreta debo preparar para acreditar la ruptura de residencia a la luz de las sentencias del Tribunal Supremo de julio de 2024 sobre el art. 9.1.b) (recursos 1909/2023, 1913/2023 y 2613/2023)?

---

**PREGUNTA 5**

> Antes de que mi socio alemán y yo tomemos ninguna decisión, necesito saber qué riesgos le genero **a él** en Alemania si me traslado a una jurisdicción de baja tributación. Concretamente:
>
> 1. **§ 16 AStG y § 160 AO:** si le facturo desde EAU o Paraguay, ¿puede el Finanzamt exigirle revelar todas las relaciones directas e indirectas conmigo, bajo declaración jurada, y rechazarle la deducción del gasto si no lo hace? Entiendo que el umbral de "tributación insignificante" está en el 10 % según el FG Münster (sentencia de 8/03/2023, asunto 9 K 147/20 K,G), y que tanto el 9 % emiratí como el 0 % paraguayo caen por debajo.
> 2. **DAC6 (§§ 138d y 138e AO):** el § 138e Abs. 3 define "empresa vinculada" incluyendo a quien tiene derecho al menos al 25 % de los beneficios de otra persona. Como cobro el 40 % del beneficio repartible, entiendo que **somos empresas vinculadas tenga o no participaciones**, y que un pago deducible hacia una jurisdicción de tributación cero activaría el indicio del § 138e Abs. 1 Nr. 3 letra d). ¿Se salvaría por el test del beneficio principal del § 138d Abs. 2 si el traslado responde a motivos vitales genuinos y la retribución no cambia? ¿Quién tiene la obligación de declarar en 30 días y qué exposición hay bajo el § 379 Abs. 2 y 7 AO?
> 3. **§ 50a Abs. 1 Nr. 3 EStG:** ¿qué redacción del contrato evita que mi retribución se califique como cesión de uso de derechos y active una retención en origen del 15 % más recargo de solidaridad? Me preocupa especialmente porque Alemania no tiene convenio con EAU desde el 1/01/2022 ni convenio general con Paraguay, con lo que esa retención sería irrecuperable.
>
> Os pido que esta parte la contrastéis con un **Steuerberater alemán**, porque son normas alemanas y prefiero un dictamen y no una opinión.

---

## 10. Fuentes

### Nivel de confianza

- **Oficial**: BOE, AEAT, gesetze-im-internet.de, Comisión Europea, Bundeszentralamt für Steuern, Ministerio de Hacienda alemán y emiratí.
- **Medio-especializado**: Iberley, agregadores que reproducen el BOE, análisis de despachos de primer nivel (Garrigues, Gómez-Acebo & Pombo, PwC, EY).
- **Blog o proveedor comercial**: usar con cautela, contrastar antes de actuar.

### IVA e intracomunitarias

| Fuente | URL | Confianza |
|---|---|---|
| Ley 37/1992 del IVA (texto consolidado) | https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740 | Oficial |
| Art. 69 LIVA (literal) | https://www.iberley.es/legislacion/articulo-69-ley-impuesto-sobre-valor-anadido-iva | Medio-especializado |
| Art. 89 LIVA (rectificación de cuotas) | https://www.iberley.es/legislacion/articulo-89-ley-impuesto-sobre-valor-anadido-iva | Medio-especializado |
| Directiva 2006/112/CE consolidada | https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:02006L0112-20250101 | Oficial |
| RD 1619/2012, Reglamento de Facturación | https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696 | Oficial |
| Reglamento de Ejecución (UE) 282/2011, art. 18 | https://www.boe.es/doue/2011/077/L00001-00022.pdf | Oficial |
| AEAT: Registro de Operadores Intracomunitarios | https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/quien-debe-estar-censado/registro-operadores-intracomunitarios.html | Oficial |
| AEAT: guía del modelo 036, alta en ROI (casillas 130, 582, 584) | https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/guia-practica-cumplimentacion-modelo-censal-036/capitulo-06-impuesto-sobre-valor-anadido/registros/registro-operadores-intracomunitarios.html | Oficial |
| AEAT: instrucciones del modelo 349 | https://sede.agenciatributaria.gob.es/Sede/static_files/Sede/Procedimiento_ayuda/GI28/instr_mod_349.pdf | Oficial |
| AEAT: instrucciones del modelo 303 (2026), casillas 59 y 120 | https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/iva/modelo-303-iva-autoliquidacion_/instrucciones-2026.html | Oficial |
| AEAT: instrucciones del modelo 390, casilla 103 | https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G412/instr390.pdf | Oficial |
| Validación VIES (Comisión Europea) | https://ec.europa.eu/taxation_customs/vies/ | Oficial |
| § 13b UStG (inversión del sujeto pasivo en Alemania) | https://www.gesetze-im-internet.de/ustg_1980/__13b.html | Oficial |
| Art. 81 RIVA (periodicidad del 349) | https://www.iberley.es/legislacion/articulo-81-reglamento-impuesto-sobre-valor-anadido-iva | Medio-especializado |
| DGT V0031-22 (obligación de facturar) | https://www.iberley.es/resoluciones/resolucion-vinculante-dgt-v0031-22-05-01-2022-1537794 | Medio-especializado |

### IRPF, modelo 130 y sanciones

| Fuente | URL | Confianza |
|---|---|---|
| Ley 35/2006 del IRPF (texto consolidado) | https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764 | Oficial |
| RD 439/2007, Reglamento del IRPF | https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820 | Oficial |
| Art. 76 RIRPF (obligación de retener de no residentes) | https://www.iberley.es/legislacion/articulo-76-reglamento-impuesto-sobre-renta-personas-fisicas-irpf | Medio-especializado |
| Art. 110 RIRPF (20 % del pago fraccionado) | https://www.iberley.es/legislacion/articulo-110-reglamento-impuesto-sobre-renta-personas-fisicas-irpf | Medio-especializado |
| AEAT: pagos fraccionados y regla del 70 % | https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/folleto-actividades-economicas/3-impuesto-sobre-renta-personas-fisicas/3_7-pagos-fraccionados.html | Oficial |
| AEAT: instrucciones del modelo 130 | https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-130-irpf______esionales-estimacion-directa-fraccionado_/instrucciones.html | Oficial |
| AEAT: calendario del contribuyente 2026 | https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html | Oficial |
| Ley 58/2003 General Tributaria | https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186 | Oficial |
| Art. 27 LGT (recargos por extemporaneidad, tras Ley 11/2021) | https://contratos.gobierto.es/normativa/ley-general-tributaria/27 | Medio-especializado |
| Art. 198 LGT (sanciones por no presentar) | https://www.iberley.es/legislacion/articulo-198-ley-general-tributaria | Medio-especializado |
| Art. 199 LGT (declaraciones con datos inexactos) | https://www.iberley.es/legislacion/articulo-199-ley-general-tributaria | Medio-especializado |
| AEAT: gastos de difícil justificación, novedades IRPF 2025 | https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/guia-principales-novedades/rendimiento-actividades-economicas.html | Oficial |
| AEAT: suministros de la vivienda (30 % de la parte afecta) | https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c07-rendimientos-actividades-economicas-estimacion-directa/fase-1-determinacion-rendimiento-neto/gastos-fiscalmente-deducibles/servicios-exteriores/suministros.html | Oficial |
| DGT V2221-19 (retenciones de no residente sin EP) | https://audiconsultores-etlglobal.com/wp-content/uploads/2022/09/DGT-19-08-2019-N.o-CONSULTA-VINCULANTE_-V2221_2019-IRPF-%E2%80%93-Obligaciones-de-retencion-por-una-empresa-no-residente-sin-establecimiento-per.pdf | Medio-especializado |

### Convenio España-Alemania y fiscalidad alemana

| Fuente | URL | Confianza |
|---|---|---|
| Convenio España-Alemania 2011 (PDF oficial, BOE núm. 181 de 30/07/2012) | https://www.boe.es/boe/dias/2012/07/30/pdfs/BOE-A-2012-10212.pdf | Oficial |
| AEAT: convenios de doble imposición, Alemania | https://sede.agenciatributaria.gob.es/Sede/normativa-criterios-interpretativos/fiscalidad-internacional/convenios-doble-imposicion-firmados-espana/alemania.html | Oficial |
| Texto sintético del convenio con el MLI (Ministerio de Hacienda) | https://www.hacienda.gob.es/sgt/normativadoctrina/tributaria/cdi/textos-sinteticos/cdi-ts-alemania-sp.pdf | Oficial |
| § 50a EStG (retención en origen alemana) | https://www.gesetze-im-internet.de/estg/__50a.html | Oficial |
| § 49 EStG (sujeción limitada) | https://www.gesetze-im-internet.de/estg/__49.html | Oficial |
| § 43a EStG (25 % de Kapitalertragsteuer) | https://www.gesetze-im-internet.de/estg/__43a.html | Oficial |
| § 23 KStG (impuesto de sociedades y senda de bajada a 2032) | https://www.gesetze-im-internet.de/kstg_1977/__23.html | Oficial |
| § 16 GewStG (Hebesatz mínimo, subida al 280 % en 2027) | https://www.gesetze-im-internet.de/gewstg/__16.html | Oficial |
| § 16 AStG (revelación de relaciones con sociedad de baja tributación) | https://www.gesetze-im-internet.de/astg/__16.html | Oficial |
| § 1 AStG (persona vinculada, umbral del 25 %) | https://www.gesetze-im-internet.de/astg/__1.html | Oficial |
| § 160 AO (rechazo de la deducción del gasto) | https://www.gesetze-im-internet.de/ao_1977/__160.html | Oficial |
| § 138d AO (test del beneficio principal, DAC6) | https://www.gesetze-im-internet.de/ao_1977/__138d.html | Oficial |
| § 138e AO (indicios DAC6 y definición de empresa vinculada) | https://www.gesetze-im-internet.de/ao_1977/__138e.html | Oficial |
| BZSt: procedimiento de devolución del § 50c EStG | https://www.bzst.de/DE/Unternehmen/Kapitalertraege/Kapitalertragsteuerentlastung/Sonderkonstellation/Erstattungsverfahren_50c/erstattungsverfahren_50c_node.html | Oficial |
| BZSt: certificado de exención previa (§ 50c Abs. 2) | https://www.bzst.de/DE/Unternehmen/Kapitalertraege/Kapitalertragsteuerentlastung/Sonderkonstellation/Freistellungsverfahren_50c/freistellungsverfahren_50c_node.html | Oficial |
| BZSt: obligación de comunicación DAC6 | https://www.bzst.de/DE/Unternehmen/EUInternational/ErfassungAuslandsbeteiligungen/Mitteilungspflicht_138_Abs_2_AO/mitteilungspflicht_138_Abs_2_AO_node.html | Oficial |
| BMF: listado de convenios a 1/01/2026 | https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Internationales_Steuerrecht/Allgemeine_Informationen/2026-01-07-stand-DBA-1-januar-2026.html | Oficial |
| BMF: acuerdo Alemania-Paraguay (solo transporte aéreo, 1984) | https://www.bundesfinanzministerium.de/Content/DE/Standardartikel/Themen/Steuern/Internationales_Steuerrecht/Staatenbezogene_Informationen/Laender_A_Z/Paraguay/1984-06-20-Paraguay-Abkommen-Luftfahrt.html | Oficial |
| EY: fin del convenio Alemania-EAU el 31/12/2021 | https://www.ey.com/de_de/technical/steuernachrichten/dba-mit-den-vereinigten-arabischen-emiraten-endet-zum-31-12-2021 | Medio-especializado |
| PwC: umbral del 10 % del § 16 AStG (FG Münster 9 K 147/20) | https://blogs.pwc.de/de/steuern-und-recht/article/238853/update-betriebsausgabenabzug-und-begriff-der-nur-unwesentlichen-besteuerung-i.s.v.-16-abs.-1-satz-1-astg/ | Medio-especializado |
| Deloitte: escrito final del BMF sobre DAC6 | https://www.deloitte-tax-news.de/steuern/internationales-steuerrecht/bmf-finales-schreiben-zur-mitteilungspflicht-von-grenzueberschreitenden-steuergestaltungen-dac6.html | Medio-especializado |
| Haufe: bajada del impuesto de sociedades alemán 2028-2032 | https://www.haufe.de/steuern/gesetzgebung-politik/gesetz-fuer-ein-steuerliches-investitionssofortprogramm_168_650104.html | Medio-especializado |
| Registro Mercantil alemán (Handelsregister) | https://www.handelsregister.de | Oficial |

### Residencia, salida y jurisdicciones

| Fuente | URL | Confianza |
|---|---|---|
| Convenio España-Emiratos Árabes Unidos (art. 4) | https://www.boe.es/buscar/act.php?id=BOE-A-2007-1343 | Oficial |
| Convenio España-Paraguay (BOE 29/07/2024) | https://www.boe.es/boe/dias/2024/07/29/pdfs/BOE-A-2024-15573.pdf | Oficial |
| Lista española de jurisdicciones no cooperativas (Orden HFP/115/2023) | https://www.boe.es/buscar/act.php?id=BOE-A-2023-3508 | Oficial |
| Lista UE de jurisdicciones no cooperativas (Consejo, 17/02/2026) | https://www.consilium.europa.eu/en/press/press-releases/2026/02/17/taxation-council-updates-the-eu-list-of-non-cooperative-jurisdictions-for-tax-purposes/ | Oficial |
| Ministerio de Hacienda: listado de convenios en vigor | https://www.hacienda.gob.es/es-ES/Normativa%20y%20doctrina/Normativa/CDI/Paginas/CDI_Alfa.aspx | Oficial |
| EAU: Ministerial Decision 229/2025 (actividades cualificadas de free zone) | https://mof.gov.ae/wp-content/uploads/2025/09/EN-Ministerial-Decision-No.-229-of-2025-Regarding-Qualifying-Activities-and-Excluded-Activities.pdf | Oficial |
| EAU: Cabinet Decision 49/2023 (umbral de 1.000.000 AED para personas físicas) | https://mof.gov.ae/wp-content/uploads/2023/05/Cabinet-Decision-No.-49-of-2023.pdf | Oficial |
| Paraguay: DNIT, Impuesto a la Renta Personal | https://www.dnit.gov.py/en/web/portal-institucional/irp | Oficial |
| Estonia: agencia tributaria, obligaciones de sociedades de e-residentes | https://www.emta.ee/en/business-client/registration-business/non-residents-e-residents/tax-liabilities-companies | Oficial |
| Estonia: tipos del impuesto de sociedades 2026 | https://taxsummaries.pwc.com/estonia/corporate/taxes-on-corporate-income | Medio-especializado |
| AEAT: residencia fiscal de personas jurídicas (sede de dirección efectiva) | https://sede.agenciatributaria.gob.es/Sede/no-residentes/residencia-personas-fisicas-juridicas/persona-juridica-residente-espana.html | Oficial |
| AEAT: certificados de residencia fiscal | https://sede.agenciatributaria.gob.es/Sede/no-residentes/certificados-residencia-fiscal.html | Oficial |
| STS julio 2024 sobre el núcleo de intereses económicos (resumen) | https://www.iberley.es/noticias/el-ts-aclara-como-interpretar-nucleo-principal-o-base-actividades-determinar-residencia-fiscal-espana-efectos-irpf-34048 | Medio-especializado |
| Gómez-Acebo & Pombo: análisis de la doctrina del TS sobre el art. 9.1.b) | https://ga-p.com/publicaciones/la-determinacion-de-la-residencia-fiscal-en-espana-de-las-personas-fisicas-conforme-al-nucleo-de-intereses-economicos-debe-ponderar-tanto-la-variable-de-flujo-de-renta-como-los-intereses-p/ | Medio-especializado |

### Modelos informativos 720 y 721

| Fuente | URL | Confianza |
|---|---|---|
| RD 1065/2007 (arts. 42 bis, 42 ter, 42 quater, 54 bis) | https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984 | Oficial |
| AEAT: modelo 720, régimen sancionador tras la STJUE C-788/19 | https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-720-decla_____sobre-bienes-derechos-extranjero_/preguntas-frecuentes/sanciones-efectos.html | Oficial |
| AEAT: modelo 721, preguntas frecuentes | https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-721-decla-sobre-monedas-extranjero/preguntas-frecuentes-sobre-modelo-721.html | Oficial |
| Orden HFP/886/2023 (aprobación del modelo 721) | https://www.boe.es/buscar/doc.php?id=BOE-A-2023-17429 | Oficial |
| Ley 19/1991 del Impuesto sobre el Patrimonio (art. 16, valoración de participaciones) | https://www.boe.es/buscar/act.php?id=BOE-A-1991-14392 | Oficial |
| Garrigues: eliminación del régimen sancionador del 720 | https://www.garrigues.com/es_ES/noticia/modelo-720-publicada-regulacion-elimina-regimen-sancionador | Medio-especializado |

### Laboral, TRADE y Seguridad Social

| Fuente | URL | Confianza |
|---|---|---|
| Ley 20/2007 del Estatuto del Trabajo Autónomo (LETA) | https://www.boe.es/buscar/act.php?id=BOE-A-2007-13409 | Oficial |
| Estatuto de los Trabajadores (arts. 1.1 y 8.1) | https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430 | Oficial |
| Orden PJC/297/2026 (bases y tipos de cotización 2026) | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-7296 | Oficial |
| Reglamento (CE) 987/2009, art. 21 (obligaciones del empresario extranjero) | https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:02009R0987-20180101 | Oficial |
| Art. 18 LIS (operaciones vinculadas) | https://www.iberley.es/legislacion/articulo-18-ley-impuesto-sobre-sociedades | Medio-especializado |
| Infoautónomos: tarifa plana y falso autónomo | https://www.infoautonomos.com/seguridad-social/tarifa-plana-autonomos/ | Blog especializado |

### Verifactu

| Fuente | URL | Confianza |
|---|---|---|
| RDL 15/2025 (prórroga de Verifactu, BOE 03/12/2025) | https://www.boe.es/boe/dias/2025/12/03/pdfs/BOE-A-2025-24446.pdf | Oficial |
