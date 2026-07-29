# Dónde te pagan: Wise, bancos, pasarelas y cripto

**Fecha del informe: 29 de julio de 2026**

Esto es lo último que quedaba pendiente de lo que pediste hace meses ("mirar Wise"). Lo he mirado
entero, y con ello los cobros de la academia y el cripto, porque son la misma pregunta: por qué
tubería entra el dinero y cuánto se queda por el camino.

Aviso antes de empezar, porque cambia el orden de todo: **mientras investigaba esto he encontrado
algo urgente que no tiene nada que ver con Wise y que te afecta hoy.** Está en el apartado 0.

Cuando algo no lo he podido verificar, lo digo y lo marco. No hay ninguna cifra aquí que no lleve
su fuente. Las etiquetas son las de siempre: `OFICIAL` (web del organismo o de la empresa),
`SECUNDARIO` (medio o gestoría), `NO VERIFICADO` (no lo he podido confirmar).

---

## 0. Lo urgente: tus dos vías de cripto llevan 4 semanas cerradas

Tu dashboard clasifica los retiros por concepto. La lista de conceptos de cripto que configuraste
es `['Binance', 'Bitbase']` (`calculos.js`, `IRPF_DEFAULT`). Las dos han dejado de operar en España.

**Binance.** El 24 de junio de 2026 retiró su solicitud de licencia MiCA ante el regulador griego
(HCMC), a seis días de que expirase el período transitorio. El 26 de junio comunicó a sus usuarios
de la UE —España nombrada expresamente— que dejaba de prestar servicios. **Desde el 1 de julio de
2026** se pararon altas nuevas, órdenes de compra al contado, depósitos y los productos Earn y
staking para usuarios de la UE. `SECUNDARIO` — Euronews, CoinDesk, El Español

Binance dijo literalmente: *"Your assets remain safe and secure, and will remain accessible at all
times"*, y que espera conseguir la licencia en otro Estado miembro "en los próximos meses"
(se apunta a Francia). `SECUNDARIO` — CoinDesk 26/06/2026

**Bitbase.** El 30 de junio de 2026 anunció la suspensión temporal de sus operaciones en España a
la espera de la resolución de su solicitud de licencia MiCA. `SECUNDARIO` — CriptoNoticias

El contexto: el período de gracia de MiCA (Reglamento UE 2023/1114) terminó el 30 de junio de 2026.
De más de 3.000 proveedores registrados en la UE, solo unos 244 obtuvieron licencia CASP.
`SECUNDARIO`

### Lo que tienes que hacer, hoy

1. Entra en Binance y en Bitbase y mira el saldo. Si hay algo, **sácalo**.
2. Si vas a mantener cripto, muévelo a un proveedor con licencia MiCA (comprueba el registro de la
   ESMA y el de la CNMV antes de elegir) o a autocustodia. La autocustodia tiene además una ventaja
   fiscal concreta que te explico en el apartado 5.2.
3. Si alguna venta de la academia se cobró por Binance Pay, díselo a David hoy: esa vía tampoco
   existe ya para clientes de la UE.

**No he verificado** cuál es la fecha límite exacta para retirar fondos ni qué pasa con los saldos
que se queden dentro. Ni CoinDesk ni Binance publicaron una fecha de cierre de retiradas. Lo trato
como riesgo abierto: el dinero que no está en tu mano no está en tu mano.

**Coste de esta acción: cero. Dinero en juego: el saldo íntegro.** Por eso va la primera.

---

## 1. Tus cobros de hoy, en números

Todo lo que sigue sale de tus cifras verificadas. Dejo la aritmética a la vista para que puedas
comprobarla o corregirla.

| Dato | Valor | De dónde sale |
|---|---|---|
| Ticket al alumno | 1.497,00 € con IVA | Confirmado |
| Ticket neto (sin IVA 21 %) | 1.237,19 € | 1.497 / 1,21 |
| Comisión media de pasarela | 1,49 % | Medida en 6 meses reales |
| Ventas netas del negocio (año) | ~28.000 € | Dato de partida |
| Volumen bruto cobrado (año) | 33.880 € | 28.000 × 1,21 |
| Número de cobros al año | ~23 | 28.000 / 1.237,19 = 22,63 |
| Comisión de pasarela (año) | **417,20 €** | 28.000 × 1,49 % |
| Comisión por venta | 18,14 € | 417,20 / 23 |
| Lo que te deja una venta a ti | 487,50 € brutos / 390,00 € tras IRPF | Ya calculado en el dashboard |

**Dos avisos de honestidad sobre estas cifras:**

1. **No sé sobre qué base está medido el 1,49 %.** El plan maestro dice "1,49 % del neto". Si es
   sobre el neto, la comisión efectiva sobre el importe bruto que se le cobra al alumno es del
   **1,231 %** (417,20 / 33.880). Si estuviera medida sobre el bruto, sería 504,81 €/año. La
   diferencia entre las dos lecturas es de 87,61 €/año. Uso la primera, que es la que dice el plan,
   y es también la más conservadora para las conclusiones.
2. **23 cobros al año son 1,9 ventas al mes, y tú tienes medidas 2,7-3,3.** O el ticket medio real
   es menor que 1.497 € (descuentos, pagos a plazos), o 2026 va por debajo de la media de meses
   cerrados, o los ~28.000 € se quedan cortos. Derivando desde tu propia proyección de 2026
   (9.339,63 € tuyos = 40 % del beneficio; fijos 549 €/mes) el volumen neto sale entre
   **29.900 € y 30.400 €**, no 28.000 €. Uso 28.000 € porque es el dato que me diste; con 30.400 €
   todas las cifras de comisión suben un 8,6 % y **ninguna conclusión cambia**.

---

## 2. Wise para ti

### 2.1. Qué es Wise exactamente

Wise **no es un banco**. En la UE opera como **Wise Europe SA**, entidad autorizada y supervisada
por el **Banco Nacional de Bélgica**. Ellos mismos lo dicen así: *"En la UE, Wise Europe SA es una
institución de pago autorizada supervisada por el Banco Nacional de Bélgica"*. `OFICIAL` — Wise

Consecuencia directa, también literal de Wise: *"nuestros servicios de pago no están sujetos al
Sistema Belga de Garantía de Depósitos"*. `OFICIAL` — Wise

Lo que hace en su lugar es **salvaguarda** (*safeguarding*): mantiene tu dinero separado del suyo,
en efectivo en JPMorgan Chase Bank y en fondos monetarios de BlackRock y State Street, y solo
invierte en fondos con liquidez el mismo día donde su participación es inferior al 5 % del total.
`OFICIAL` — Wise

Traducido: **si Wise quiebra, no tienes los 100.000 € del fondo de garantía.** Tienes un derecho de
separación sobre unos fondos que están segregados y que en teoría no forman parte de la masa
concursal. Es probablemente suficiente en la práctica, pero no es lo mismo y no debe venderse como
si lo fuera.

### 2.2. Lo que cuesta de verdad

| Concepto | Coste | Fuente |
|---|---|---|
| Alta de Wise Business (datos de cuenta en 22 divisas) | **50 EUR, una sola vez** | `OFICIAL` wise.com/es/pricing/business/receive |
| Cuota mensual | **0 €** | `OFICIAL` Wise |
| Recibir EUR por SEPA (nacional, no SWIFT) | **Gratis** | `OFICIAL` Wise |
| Recibir EUR por SWIFT | 2,39 EUR por pago | `OFICIAL` Wise |
| Recibir USD por wire/SWIFT | 6,11 USD por pago | `OFICIAL` Wise |
| Recibir GBP por SWIFT | 2,16 GBP por pago | `OFICIAL` Wise |
| Mantener saldo | Sin comisión de mantenimiento en más de 40 divisas | `OFICIAL` Wise |
| Conversión de divisa | Tipo medio de mercado + comisión variable, ~0,47 %-0,55 % en divisas comunes | `SECUNDARIO` Exiap |

### 2.3. Wise contra una cuenta española normal, en tu caso concreto

Tu único cobro es **EUR desde Alemania**. La GmbH te paga por transferencia SEPA en euros. No hay
conversión de divisa en ningún punto de tu cadena.

| | Wise Business | Cuenta española de autónomo (gratuita) |
|---|---|---|
| Alta | 50 € una vez | 0 € |
| Mensual | 0 € | 0 € en las cuentas online sin comisiones |
| Recibir la transferencia de la GmbH | 0 € | 0 € |
| Conversión de divisa | No la necesitas | No la necesitas |
| **Coste total año 1** | **50 €** | **0 €** |

**Wise te cuesta 50 € y no te ahorra un céntimo, porque no conviertes divisa.** Toda la ventaja de
Wise vive en el diferencial de cambio, y tú no cambias nada. Los 50 € son el 13 % de lo que te deja
una venta después de IRPF (390 €).

Esto cambia el día que factures en otra divisa. Si algún día la GmbH te pagara en USD o la academia
vendiera en dólares, el cálculo se da la vuelta y Wise gana con holgura contra cualquier banco
español (que aplica diferenciales del 2-3 % sin decírtelo). **Hoy, no.**

### 2.4. El IBAN belga: ¿sirve para facturar?

**Sí, sin ninguna duda, y por dos motivos distintos.**

**Primero: una factura no necesita llevar IBAN.** El contenido obligatorio de la factura está en el
art. 6 del RD 1619/2012 (Reglamento de Facturación) y ahí no hay ningún número de cuenta. Puedes
poner el IBAN por comodidad, o no ponerlo. No es un requisito.

**Segundo: exigirte un IBAN de un país concreto es ilegal en la UE.** Es la llamada
"discriminación de IBAN", prohibida por el **art. 9 del Reglamento (UE) 260/2012** (Reglamento
SEPA): quien ordena una transferencia hacia una cuenta situada en la Unión no puede especificar el
Estado miembro en el que debe estar radicada esa cuenta, siempre que sea accesible por SEPA. El
Banco de España tiene página propia sobre esto y sobre cómo reclamar. `OFICIAL` — Banco de España,
Portal del Cliente Bancario

Es decir: si mañana un proveedor o un cliente te dice "es que necesito un IBAN español", está
incumpliendo el Reglamento SEPA, y hay dónde reclamarlo. Que ocurra en la práctica, ocurre; que sea
legal, no lo es.

### 2.5. ¿Y Hacienda? Cobrar en un IBAN no español no es problema. Pagar, sí puede serlo.

**Cobrar:** ninguna norma española te obliga a cobrar en una cuenta española. No hay infracción, no
hay sanción, no hay nada. El único efecto real es informativo, y va en el apartado 2.6.

**Pagar tus impuestos:** aquí sí hay fricción, y es la parte que la gente descubre tarde.

La domiciliación de autoliquidaciones en la AEAT está pensada para cuentas abiertas en **entidades
colaboradoras** en la recaudación. Wise no lo es. Pero desde el **22 de abril de 2023** existe una
vía: el **art. 5 bis de la Orden EHA/1658/2009**, añadido por la Orden HFP/387/2023 y modificado por
la Orden HAC/241/2025, regula "la gestión de las domiciliaciones ordenadas en cuentas abiertas en
entidades no colaboradoras dentro de la Zona SEPA". `OFICIAL` — BOE

Cómo funciona, en corto:

- Cubre **autoliquidaciones** (tu modelo 130, tu 303) y aplazamientos/fraccionamientos.
- La Zona SEPA a estos efectos son 36 países: los 27 de la UE más Islandia, Liechtenstein, Noruega,
  Andorra, Mónaco, San Marino, Suiza, Reino Unido y el Vaticano. Bélgica está dentro.
- Una entidad colaboradora adherida hace de intermediaria y **te repercute la comisión**: *"Se
  repercutirán al obligado al pago todas las comisiones y gastos bancarios que la AEAT deba
  satisfacer a las entidades colaboradoras participantes"*. Ojo con esto: si tu cuenta no tiene
  saldo para la deuda **más** la comisión, la entidad **retrocede el importe íntegro** y el pago no
  se produce.
- La fecha de ingreso es la del adeudo (art. 38.2 RGR).

Y en paralelo existe la **Resolución de 18 de enero de 2021 de la Dirección General de la AEAT**
(BOE-A-2021-1617), que permite el **pago por transferencia** desde cuentas de entidades **no**
colaboradoras, incluidas entidades financieras extranjeras. Aviso serio de la propia AEAT: toda
transferencia que no siga estrictamente el procedimiento, o que se ordene desde una entidad que
**sí** es colaboradora, **se devuelve con gastos a tu cargo y no produce efecto de pago**.
`OFICIAL` — BOE / Sede AEAT

**Seguridad Social (tu cuota de 80 €/mes): `NO VERIFICADO`.** No he encontrado la política oficial
publicada de la TGSS sobre si el mandato SEPA del modelo TC 1/15-3 admite un IBAN no español. El
formulario pide el IBAN completo sin restringir país, y el Reglamento SEPA apunta a que debería
admitirse, pero **eso es una inferencia mía, no una confirmación**. La pregunta exacta para
resolverlo está en el apartado 7.

### 2.6. Modelo 720: la parte que casi nadie mira

**Sí, una cuenta de Wise puede obligarte al modelo 720.** Esto es lo que se ignora.

La obligación está en el **art. 42 bis del RD 1065/2007**, que obliga a informar de *"todas las
cuentas... que se encuentren situadas en el extranjero, abiertas en entidades que se dediquen al
tráfico bancario o crediticio"*, y su apartado 2 extiende eso a *"cualesquiera otras cuentas o
depósitos dinerarios con independencia de la modalidad o denominación que adopten"*.

La duda razonable es si una entidad de dinero electrónico —que no es una entidad de crédito— entra
ahí. **La DGT ya dijo que sí.** En la consulta vinculante **V1239-17, de 18 de mayo de 2017**,
sobre una tarjeta prepago emitida por una entidad de dinero electrónico del Reino Unido sin
establecimiento en España, concluyó que **hay que declararla en el modelo 720**, porque el producto
funcionaba materialmente como una cuenta corriente: permitía transferencias, operaciones de pago y
retirar el saldo. Se declara con clave "C". `SECUNDARIO` — texto de la consulta vía Iberley

Wise encaja de lleno en ese razonamiento: te da datos de cuenta, IBAN, recibe, envía y retira.

**Los umbrales, exactos:**

- No hay obligación si el **saldo conjunto a 31 de diciembre** y el **saldo medio del último
  trimestre** no superan, ninguno de los dos, **50.000 €**. `OFICIAL` — Sede AEAT
- Plazo: **del 1 de enero al 31 de marzo** del año siguiente.
- En años posteriores solo hay que volver a presentarlo si el saldo conjunto **sube más de
  20.000 €** respecto al que motivó la última declaración presentada.

**El giro de 2025-2026, y es importante para ti.** La DGT resolvió en la consulta vinculante
**V2475-25, de 12 de diciembre de 2025**, el caso de una cuenta en una entidad extranjera con IBAN
extranjero que se migró a **IBAN español** al abrir esa entidad una sucursal en España. Conclusión
literal: *"la cuenta deja de estar situada en el extranjero y pasa a considerarse mantenida en un
establecimiento situado en territorio español"*, y desde ese momento **el art. 42 bis no aplica**,
aunque se superen los 50.000 €. `SECUNDARIO` — reseña de la consulta

**Regla práctica que te llevas:** lo que decide el 720 no es la marca del neobanco, es si tu cuenta
cuelga de un establecimiento en España y te han asignado un **IBAN ES**. Con IBAN ES, no hay 720.
Con IBAN BE, LT, DE o FR, sí lo hay en cuanto pases de 50.000 €.

**Y el dato nuevo que puede cambiarlo todo:** el 1 de abril de 2026 se publicó que **Wise Europe
S.A. ha abierto sucursal en España** (Madrid, Paseo de la Castellana; operativa desde finales de
febrero de 2026; representante legal Filippo Galassini; inscrita en el Banco de España y en el
SEPBLAC). `SECUNDARIO` — The Objective, 01/04/2026

Pero **`NO VERIFICADO`: no he podido confirmar que Wise vaya a emitir IBAN español (ES).** La
noticia no lo dice, y la ayuda de Wise sigue describiendo el IBAN en euros como belga
(**BE79 9670 40...**, Wise Europe SA, Rue du Trône 100 bte 3, 1050 Bruselas). Mientras el IBAN sea
BE, la cuenta está en Bélgica a efectos del 720.

**¿Te afecta hoy? No.** Y conviene que veas la distancia en tu unidad:

> Cada venta te deja **390,00 € netos** después de IRPF. Para tener 50.000 € parados en una cuenta
> extranjera tendrías que acumular **128 ventas sin gastar un euro**. A 3 ventas al mes son
> **43 meses**: tres años y siete meses. **El 720 no es tu problema en 2026.** Guárdate la regla
> para cuando lo sea.

### 2.7. ¿Te la va a aceptar la gestoría?

Legalmente, sí: no hay ninguna norma que le permita rechazar una cuenta de una EDE europea.

Operativamente, la fricción real es otra y tiene nombre: **el fichero Norma 43** (el cuaderno
bancario que las asesorías importan para conciliar). Wise exporta CSV y PDF. `NO VERIFICADO`: no he
podido confirmar si Wise emite Norma 43 ni si tu asesoría lo necesita. Es una pregunta de un minuto
y está en el apartado 7. Si no lo emite, le estás regalando a tu asesoría un trabajo manual todos
los meses por 75 €/mes que ya le pagas.

### 2.8. Veredicto sobre Wise, sin rodeos

**Para tu situación de hoy —cobrar euros de una GmbH alemana por SEPA— Wise no te aporta nada y te
cuesta 50 €.** No ahorras comisión de recepción (una cuenta española también la tiene a cero), no
ahorras cambio de divisa (no cambias divisa), no ganas garantía de depósitos (la pierdes), añades
un IBAN extranjero que te complica domiciliar impuestos y que te mete en el radar del 720 el día que
acumules saldo.

**Ábrela el día que factures en divisa distinta del euro.** Ese día es la mejor opción del mercado y
por bastante. Hoy no lo es.

---

## 3. Las alternativas, en una tabla

| | **Wise Business** | **Revolut Business** | **N26 Business** | **Qonto** | **Banco español (cuenta online de autónomo)** |
|---|---|---|---|---|---|
| **Coste** | 50 € una vez, 0 €/mes | Basic ~10 €/mes; Grow ~30 €/mes; Scale ~90 €/mes `NO VERIFICADO` | Standard 0 €/mes; Smart 4,90 €/mes; Metal 16,90 €/mes `SECUNDARIO` | Autónomo: Basic 9 €, Smart 19 €, Premium 39 €/mes `OFICIAL` (verificar si es con o sin IVA) | 0 € en las cuentas online sin comisiones para autónomos |
| **Recibir SEPA en EUR** | Gratis `OFICIAL` | Gratis | Gratis | Gratis (30-200 transferencias/mes según plan; extra 0,10-0,20 €) `OFICIAL` | Gratis |
| **IBAN español** | **No** — IBAN belga BE `OFICIAL` | **Sí** — Revolut Bank UAB, Sucursal en España, BdE nº 1583 `OFICIAL` BOE-A-2023-11803 | **Sí** — N26 Bank SE, Sucursal en España, BdE nº 1563 `SECUNDARIO` | **Sí** — Olinda SAS Sucursal en España (Barcelona) `OFICIAL` | Sí |
| **¿Modelo 720 si pasas de 50.000 €?** | **Sí** (art. 42 bis + DGT V1239-17) | **No**, con IBAN ES (DGT V2475-25) | **No**, con IBAN ES | **No**, con IBAN ES | No |
| **Garantía de depósitos 100.000 €** | **No.** EDE, salvaguarda `OFICIAL` | **Sí**, esquema lituano | **Sí**, esquema alemán | **No.** Entidad de dinero electrónico `SECUNDARIO` | **Sí**, FGD español |
| **Domiciliar AEAT / Seg. Social** | Vía art. 5 bis Orden EHA/1658/2009, con comisión repercutida | Directa (IBAN ES) | Directa (IBAN ES) | Función "Pagar impuestos online (AEAT)" incluida `OFICIAL` | Directa |
| **Encaje con gestoría española** | El más flojo (IBAN extranjero, Norma 43 `NO VERIFICADO`) | Bueno | Bueno | El mejor: facturación y AEAT integrados | Bueno |
| **Restricción de titular** | Autónomos y empresas | Empresas y autónomos | **Solo autónomos, no sociedades** `SECUNDARIO` | Autónomos y empresas | — |

**Notas de honestidad sobre esta tabla:**

- **Revolut Basic.** Las fuentes se contradicen. La propia web de Revolut sugiere que Basic es el
  plan de entrada gratuito y que las suscripciones de pago empiezan en 10 €/mes; una comparativa
  actualizada el 4 de junio de 2026 afirma que Basic cuesta 10 €/mes. Su web devuelve error 403 a
  mis peticiones, así que **no lo doy por verificado**. Compruébalo tú en 30 segundos antes de
  decidir nada.
- **Precios de Qonto:** son los de su web oficial. `NO VERIFICADO` si van con IVA incluido; en
  cuentas de empresa suele mostrarse sin IVA, lo que sumaría un 21 %.
- **Qonto no es un banco:** opera como entidad de dinero electrónico bajo Olinda SAS. Mismo asterisco
  de garantía de depósitos que Wise, con la diferencia del IBAN español.

**Si lo que quieres es separar la cuenta del negocio de la personal** —que es la razón sensata para
abrir una segunda cuenta, porque le simplifica la vida a tu asesoría y te limpia el modelo 130— la
elección correcta es **cualquier cuenta con IBAN español**, no Wise. Si además quieres que la
herramienta te haga la facturación, Qonto es la que más te acerca; si quieres coste cero, N26
Business Standard o una cuenta online de banco español.

---

## 4. Los cobros de la academia

Esto lo lleva David, pero te afecta al 40 % del reparto, así que va con números tuyos.

### 4.1. Qué cuesta cada vía, sobre tu volumen real

Base: **33.880 € brutos al año, ~23 cobros**. Ordenado de más barato a más caro.

| Vía de cobro | Tarifa | Coste al año | Diferencia contra hoy |
|---|---|---|---|
| **Transferencia SEPA directa a cuenta** | 0 € | **0,00 €** | **−417,20 €** |
| **Stripe SEPA Direct Debit** (adeudo domiciliado) | 0,35 € fijo `OFICIAL` | **8,05 €** | **−409,15 €** |
| **Hoy (mezcla real medida)** | 1,49 % del neto | **417,20 €** | — |
| Stripe, tarjeta EEE estándar | 1,5 % + 0,25 € `OFICIAL` | 513,95 € | +96,75 € |
| Stripe, tarjeta EEE prémium | 2,8 % + 0,25 € `OFICIAL` | 954,39 € | +537,19 € |
| Cripto vía BitPay (<500.000 $/mes) | 2 % + 0,25 $ `OFICIAL` | ~682,60 € | +265,40 € |
| PayPal, comercial nacional | 2,90 % + 0,35 € `OFICIAL` | 990,57 € | +573,37 € |
| Stripe, tarjeta internacional | 3,15 % + 0,25 € `OFICIAL` | 1.072,97 € | +655,77 € |
| PayPal, internacional fuera EEE/RU | 2,90 % + 1,99 % + 0,35 € `OFICIAL` | 1.664,78 € | +1.247,58 € |
| Stripe internacional **con conversión** | 3,15 % + 2 % + 0,25 € `OFICIAL` | 1.750,57 € | +1.333,37 € |
| PayPal **con conversión de divisa** | lo anterior + 3,0 % sobre el tipo base `OFICIAL` | +1.016,40 € sobre la fila que aplique | — |

Las tarifas de Stripe son idénticas en España y en Alemania (comprobadas en stripe.com/es/pricing y
stripe.com/de/pricing): mismo 1,5 % + 0,25 € para tarjetas del EEE. Que la pasarela esté en la GmbH
alemana no cambia el precio. Comisión por disputa (*chargeback*): **20 € por incidencia** en ambos
países, y otros 20 € si la disputas —reembolsables si ganas—. En un ticket de 1.497 € eso importa.

### 4.2. La conclusión incómoda: ya estáis en el precio bueno

Vuestro **1,49 % medido equivale al 1,231 % sobre el importe bruto**. La tarifa estándar de Stripe
para tarjeta del EEE es **1,5 % + 0,25 €**, es decir un 1,517 % efectivo sobre vuestro ticket.

**Cobráis más barato que la tarifa de tarjeta de Stripe.** Eso significa que la mezcla ya incluye
vías baratas (transferencia, Bizum, adeudo) y que **PayPal apenas tiene peso**: si PayPal pesara,
la media estaría por encima del 2,5 %, no en el 1,49 %.

Por lo tanto, y en contra de lo que dice todo el mundo:

> **Mover volumen de PayPal a Stripe no os va a ahorrar prácticamente nada, porque ya no hay
> volumen relevante en PayPal.** El techo teórico de ahorro es cambiarlo TODO a transferencia SEPA:
> **417,20 €/año para el negocio**.

Y ese techo, traducido a tu unidad:

| El ahorro máximo posible de toda la línea de pasarela | |
|---|---|
| Para el negocio | 417,20 €/año |
| Tu 40 % | 166,88 €/año |
| Tuyo, después de IRPF al 19 % marginal | **135,17 €/año** |
| En ventas | **0,34 ventas al año.** Una venta cada tres años |
| En ventas al mes | 0,028 |

**Toda la comisión de pasarela de un año entero vale un tercio de una venta.** Y eso es el techo,
suponiendo que el 100 % de los alumnos aceptase pagar 1.497 € por transferencia, cosa que no va a
pasar: quitar la tarjeta de un curso de 1.497 € hunde la conversión, y una sola venta perdida
(1.237,19 € netos) se come tres años de ahorro de comisiones.

**Lo que sí tiene sentido proponerle a David:** ofrecer transferencia SEPA o adeudo domiciliado
**como alternativa voluntaria** en la página de pago, no como sustituto. Si la coge uno de cada
cinco alumnos, son ~83 €/año para el negocio, ~33 € tuyos, ~27 € tras IRPF. Es poco, pero es gratis
de implementar y no arriesga ninguna venta.

**Y lo que sí hay que vigilar de verdad**, porque ahí sí hay dinero: que ninguna venta se cuele por
**tarjeta internacional con conversión** (5,15 % → 77,10 € de comisión en un ticket de 1.497 €, en
lugar de 22,71 €) ni por **PayPal internacional** (4,89 % + 0,35 €). Una sola venta latinoamericana
mal enrutada cuesta más que tres meses de la comisión actual. Eso se mira en el panel de Stripe
filtrando por país de la tarjeta, y es una revisión de cinco minutos al trimestre.

### 4.3. Cripto como vía de cobro: no sale a cuenta

- **BitPay:** 2 % + 0,25 $ por debajo de 500.000 $/mes; baja a 1,5 % a partir de ahí y a 1 % por
  encima de 1.000.000 $. `OFICIAL` — bitpay.com/pricing. Con vuestro volumen estáis en el escalón
  del 2 %: **más caro que la tarjeta**.
- **Coinbase Commerce:** `SECUNDARIO` — cerró para comerciantes fuera de EE. UU. y Singapur el
  31 de marzo de 2026. Descartado.
- **Binance Pay:** anunciaba 0 % de comisión, pero desde el 1 de julio de 2026 Binance no presta
  servicios en la UE (apartado 0). Descartado.
- **`NO VERIFICADO`:** las tarifas de 2026 de Plisio, Triple-A y Cryptomus. Los datos que circulan
  vienen de comparadores con interés comercial y no los doy por buenos.

**Además del precio, el cripto añade tres costes que no aparecen en ninguna tabla de tarifas:**
volatilidad entre el cobro y la conversión, imposibilidad práctica de devolver un pago (y vendéis
formación: las devoluciones existen), y **trabajo contable**: cada cobro hay que valorarlo en euros
al momento del cobro y cada conversión posterior genera una ganancia o pérdida patrimonial que hay
que declarar una por una. Y, ahora, el filtro MiCA: la mitad del sector ha desaparecido en un mes.

---

## 5. Cripto: modelo 721, autocustodia y cómo tributa de verdad

### 5.1. Modelo 721

Es la declaración informativa sobre **monedas virtuales situadas en el extranjero**, aprobada por la
**Orden HFP/886/2023, de 26 de julio**. Es el hermano del 720, pero para cripto.

| | |
|---|---|
| **Quién** | Residentes en España que a 31 de diciembre sean titulares, beneficiarios, autorizados o tengan poder de disposición sobre monedas virtuales **custodiadas por terceros** en el extranjero `OFICIAL` |
| **Umbral** | **50.000 €**: no hay obligación si los saldos a 31 de diciembre de cada tipo de moneda virtual, valorados en euros, **no superan conjuntamente** los 50.000 € `OFICIAL` |
| **Plazo** | **Del 1 de enero al 31 de marzo** del año siguiente `OFICIAL` |
| **Años siguientes** | Solo si el saldo conjunto a 31/12 sube **más de 20.000 €** respecto al que motivó la última declaración `OFICIAL` |
| **Norma** | Art. 42 quater RD 1065/2007 + Orden HFP/886/2023 |

**Cuándo se entiende "situada en el extranjero":** cuando quien custodia las claves criptográficas
privadas por cuenta de terceros **no es residente en España ni establecimiento permanente en
territorio español** de una entidad extranjera. `OFICIAL` — Sede AEAT

Esto te da una regla operativa: **lo que decide el 721 no es dónde esté la blockchain, es dónde esté
domiciliado el custodio.**

Aplicado a tu caso: **Binance operaba para residentes en España a través de una entidad española
—Moon Tech Spain, S.L., registro D661 del Banco de España—**, lo que apuntaría a que ese saldo no
computaba como "en el extranjero". `SECUNDARIO`. **Ojo: no doy esto por cerrado.** La asignación de
usuario a entidad la hace Binance internamente según la residencia declarada en el KYC, no lo
decides tú y no siempre es lo que parece. Y con Binance saliendo de la UE, la entidad que custodie
tu saldo a 31/12/2026 puede no ser la misma que lo custodiaba en enero. **Descarga hoy el
justificante de saldo y el certificado de la entidad custodia**: dentro de seis meses puede no estar
disponible.

**Distancia real:** igual que el 720, son 50.000 €, o **128 ventas acumuladas sin gastar nada**.
No es tu problema en 2026.

### 5.2. Autocustodia: fuera del 721

Esto es concreto y es una ventaja: **si tienes tú las claves privadas, no se declara.**

La AEAT lo dice sin ambigüedad: las monedas virtuales en monederos no custodiados, donde el usuario
mantiene el control de las claves privadas, *"no se tendrían en cuenta en el cómputo de los saldos"*
y *"no se informaría sobre las mismas"* en el modelo 721. `OFICIAL` — Sede AEAT, preguntas
frecuentes del modelo 721

La lógica es la del propio artículo: la obligación se define sobre monedas custodiadas por quien
presta servicios de salvaguarda de claves por cuenta de terceros. Si no hay tercero, no hay
obligación.

**Cuidado con la lectura fácil.** Que no haya obligación **informativa** no significa que no haya
obligación **tributaria**. La ganancia patrimonial cuando vendas se declara igual, tengas las claves
tú o las tenga un exchange. La autocustodia te quita un modelo, no un impuesto. Y te añade el riesgo
de perder la clave, que es el 100 % del saldo.

### 5.3. Aviso importante sobre el dashboard: cobrar en cripto no es cobrar sin IRPF

Tu `calculos.js` hace esto:

- `clasificarRetiro()` devuelve `'banco'`, `'cripto'` o `'desconocido'` según el concepto.
- `tributaRetiro()` devuelve `false` para `'cripto'`.
- `irpfDeRetiro()` devuelve **0** si no es `'banco'`.

Como modelo de **caja** —"de este retiro no se me ha ido IRPF por delante"— es defendible y no lo
toco. **Como modelo fiscal sería falso, y quiero que lo sepas por escrito.**

Tu ingreso es un **rendimiento de actividad económica** por un servicio prestado a la GmbH. El
medio de pago no cambia la naturaleza de la renta. Si te pagan en cripto en lugar de en euros:

- El ingreso se computa **por el valor de mercado en euros de la moneda virtual en el momento del
  cobro**. La base es el art. 28.1 LIRPF, que remite a las normas del Impuesto sobre Sociedades para
  determinar el rendimiento neto, y el art. 43 LIRPF para la valoración de rentas en especie a valor
  normal de mercado.
- Ese importe entra en tu **base general**, en tu escala progresiva, y **cuenta para el modelo 130**
  exactamente igual que un cobro por transferencia.
- No declararlo no es "optimizar": es dejar ingresos fuera de la base imponible.

**`NO VERIFICADO`:** no he localizado una consulta vinculante de la DGT que se pronuncie
específicamente sobre el cobro de servicios profesionales en criptomoneda por un autónomo español.
Sí existe doctrina sobre el IVA de la compraventa, la custodia y el staking, y sobre la valoración a
valor de mercado de las recompensas en el momento de su recepción, pero no es exactamente tu
supuesto. **Por eso es la pregunta 1 del apartado 7, y es la más importante de este informe.**

### 5.4. Cómo tributa la ganancia si conviertes a euros más tarde

Hay **dos momentos fiscales distintos** y confundirlos es el error caro:

**Momento 1 — cobras en cripto.** Rendimiento de actividad económica, base **general**, escala
progresiva, modelo 130. Valor: el de mercado en euros ese día. Ese valor pasa a ser tu **valor de
adquisición** de esas monedas.

**Momento 2 — vendes, permutas o conviertes a euros.** Ahí nace una **ganancia o pérdida
patrimonial** que va a la **base del ahorro**. La ganancia es la diferencia entre el valor de
transmisión y el valor de adquisición del momento 1: **solo tributa la revalorización, no el importe
entero.** Se declara en "Ganancias y pérdidas patrimoniales derivadas de transmisiones de otros
elementos patrimoniales", **clave 0 = monedas virtuales**, casilla 1626.

**Tipos de la base del ahorro (2026):** `SECUNDARIO`

| Tramo | Tipo |
|---|---|
| Hasta 6.000 € | 19 % |
| 6.000 – 50.000 € | 21 % |
| 50.000 – 200.000 € | 23 % |
| 200.000 – 300.000 € | 27 % |
| Más de 300.000 € | 30 % |

**Reglas que hay que saber:**

- **Método FIFO obligatorio:** las primeras unidades compradas son las primeras que se consideran
  vendidas. `SECUNDARIO`
- **Cripto por cripto también tributa.** Cambiar BTC por USDT es una permuta y genera ganancia o
  pérdida en ese momento, aunque no hayas visto un euro. Es donde la gente se mete en problemas.
- La ganancia va a la base del ahorro; el rendimiento de tu actividad, a la general. **Son bases
  distintas y no se compensan entre sí.**

**Efecto práctico en tu caso:** si cobras en cripto y conviertes a euros **el mismo día**, la
ganancia patrimonial es prácticamente cero (solo el ruido del precio) y la tributación se queda toda
en el momento 1. Si dejas el cripto meses y sube, pagas dos veces sobre cosas distintas: IRPF
progresivo sobre el cobro, y 19-21 % sobre la revalorización. Si baja, tienes una pérdida
patrimonial que **no** te compensa el rendimiento de actividad.

**Regla simple:** si cobras en cripto porque es cómodo, convierte a euros el mismo día. Si mantienes
cripto, que sea porque quieres invertir en cripto, no como efecto colateral de cobrar.

---

## 6. Lagunas: lo que no he podido verificar

1. **Sobre qué base está medido el 1,49 %** (neto o bruto). Diferencia: 87,61 €/año.
2. **El volumen real de ventas.** 28.000 € implican 1,9 ventas/mes; tú tienes medidas 2,7-3,3.
3. **El desglose por vía de cobro.** Sin él, el 1,49 % es una media que oculta la mezcla. Es el
   dato que más falta hace y lo tiene David en el panel de Stripe en dos clics.
4. **Si Wise emitirá IBAN español (ES)** desde su nueva sucursal en España. Decide si hay 720 o no.
5. **Si Wise emite fichero Norma 43** para tu asesoría.
6. **Si la TGSS admite un IBAN no español** en el mandato SEPA TC 1/15-3 para la cuota de autónomo.
7. **El precio real del plan Basic de Revolut Business** (0 € o 10 €/mes). Su web me devuelve 403.
8. **Si los precios de Qonto** de su web llevan IVA incluido.
9. **La fecha límite de Binance para retirar fondos** y qué ocurre con los saldos que no se retiren.
10. **Qué entidad custodia hoy tu saldo de Binance** tras la salida de la UE, y por tanto si computa
    o no como "en el extranjero" a efectos del 721 a 31/12/2026.
11. **Consulta vinculante de la DGT** sobre el cobro de servicios profesionales en criptomoneda por
    un autónomo español. No la he encontrado.
12. **Tarifas 2026 de las pasarelas cripto** distintas de BitPay.
13. **Si el saldo de Bitbase es recuperable** durante la suspensión temporal.

---

## 7. Las preguntas exactas, para copiar y pegar

**PREGUNTA 1 — para tu asesoría. La más importante de este informe.**

> Soy autónomo residente fiscal en España, en estimación directa, y presto servicios a una sociedad
> alemana (GmbH). Parte de mi retribución la he cobrado en criptomoneda a través de exchanges
> (Binance, Bitbase) en lugar de por transferencia bancaria.
>
> Necesito que me confirméis o desmontéis este criterio, que es el mío: **la contraprestación
> cobrada en criptomoneda es rendimiento íntegro de actividad económica y se computa por el valor de
> mercado en euros de la moneda virtual en la fecha del cobro**, conforme al art. 28.1 LIRPF (que
> remite a las normas del Impuesto sobre Sociedades) y al art. 43 LIRPF sobre valoración de rentas
> en especie; que **ese importe se integra en la base general** y **computa para el pago fraccionado
> del modelo 130**; y que ese mismo valor constituye el **valor de adquisición** de esas monedas a
> efectos de la ganancia o pérdida patrimonial que se genere cuando las transmita o permute.
>
> Os pido tres cosas concretas: **(a)** si existe consulta vinculante de la DGT, resolución del TEAC
> o doctrina administrativa que se pronuncie expresamente sobre el **cobro de servicios
> profesionales en criptomoneda por un empresario o profesional persona física** —no sobre la
> inversión, ni sobre el staking, ni sobre el IVA de la compraventa—, con la referencia exacta;
> **(b)** si en mis modelos 130 ya presentados de 2025 y 2026 se han computado o no esos cobros, y
> si no se han computado, cuánto cuesta regularizarlo voluntariamente ahora frente a esperar a un
> requerimiento; y **(c)** qué documentación de soporte debo conservar para acreditar el valor de
> mercado en la fecha de cada cobro.

**PREGUNTA 2 — para tu asesoría.**

> Estoy valorando abrir una cuenta de empresa en Wise (Wise Europe SA, entidad de dinero electrónico
> supervisada por el Banco Nacional de Bélgica, con IBAN belga BE) para cobrar las facturas que
> emito a mi cliente alemán.
>
> **(a)** ¿Podéis importar los extractos de Wise en vuestro sistema, o necesitáis fichero Norma 43?
> Si lo necesitáis y Wise no lo emite, decidme qué coste añadido supone y si me recomendáis
> descartarla por eso.
> **(b)** Entiendo que, conforme al art. 42 bis del RD 1065/2007 y a la consulta vinculante
> V1239-17 (18/05/2017) sobre cuentas en entidades de dinero electrónico, una cuenta de Wise con
> IBAN belga **sí** queda sujeta al modelo 720 si el saldo a 31 de diciembre o el saldo medio del
> cuarto trimestre superan los 50.000 €. ¿Lo confirmáis?
> **(c)** Entiendo también que, conforme a la consulta vinculante **V2475-25 (12/12/2025)**, si Wise
> migrara mi cuenta a un IBAN español asociado a su nueva sucursal en España, la cuenta dejaría de
> estar situada en el extranjero y desaparecería la obligación del 720. ¿Lo confirmáis, y me avisáis
> si esa migración se produce?

**PREGUNTA 3 — para la Tesorería General de la Seguridad Social (teléfono 901 50 20 50 o
Importass).**

> Soy trabajador autónomo en RETA. Quiero domiciliar mi cuota mensual en una cuenta de pago con
> IBAN de otro país de la Zona SEPA (Bélgica) de la que soy titular, presentando el mandato SEPA
> TC 1/15-3.
>
> **¿Admite la TGSS un IBAN no español en ese mandato?** Si no lo admite, os pido que me indiquéis
> la norma concreta que lo impide, dado que el art. 9 del Reglamento (UE) 260/2012 prohíbe exigir
> que la cuenta esté radicada en un Estado miembro determinado siempre que sea accesible por SEPA.

**PREGUNTA 4 — para David, sobre los cobros de la academia.**

> Necesito el desglose de los cobros de los últimos 12 meses por método de pago: tarjeta del EEE
> estándar, tarjeta del EEE prémium, tarjeta internacional, tarjeta internacional con conversión de
> divisa, PayPal nacional, PayPal internacional, transferencia, adeudo SEPA y cripto. Importe bruto
> y comisión real de cada bloque.
>
> Lo pido por dos motivos. El primero: he calculado que nuestra comisión media del 1,49 % ya está
> por debajo de la tarifa estándar de tarjeta de Stripe (1,5 % + 0,25 €), así que **no hay nada que
> ganar moviendo volumen entre pasarelas** y no quiero que perdamos tiempo ahí. El segundo: donde sí
> se nos puede escapar dinero es en las tarjetas internacionales con conversión (5,15 %: 77,10 € de
> comisión en un ticket de 1.497 €, frente a 22,71 € de una tarjeta del EEE) y en PayPal
> internacional (4,89 % + 0,35 €). Con el desglose lo veo en cinco minutos.
>
> Y una segunda cosa: propongo **añadir** transferencia SEPA o adeudo domiciliado como opción
> voluntaria en la página de pago, sin quitar la tarjeta. Si la coge uno de cada cinco alumnos son
> ~83 €/año, y no arriesgamos ninguna venta.
>
> Y una tercera, urgente: si alguna venta se cobró por Binance Pay, hay que sacarlo del checkout ya.
> Binance dejó de prestar servicios en la UE el 1 de julio.

---

## 8. Las tres acciones, ordenadas por dinero

### Acción 1 — Vacía Binance y Bitbase. Hoy.

| | |
|---|---|
| **Dinero en juego** | El saldo íntegro que tengas en las dos. Es la cifra más grande de este informe y no la conozco |
| **Coste de hacerlo** | 0 € |
| **Tiempo** | 20 minutos |
| **Por qué ahora** | Llevan 4 semanas sin licencia MiCA. Binance dice que los fondos están accesibles, pero no publica fecha de cierre de retiradas. Bitbase está en suspensión "temporal" |

Pasos, en orden:

1. Entra en las dos y descarga el **extracto completo y el justificante de saldo a fecha de hoy**.
   Esto lo necesitarás para el IRPF aunque el saldo sea cero, y para el 721 si algún año llegas ahí.
2. Retira el saldo: a euros contra tu cuenta bancaria, o a un proveedor con licencia MiCA, o a
   autocustodia.
3. Si eliges autocustodia, recuerda el apartado 5.2: **fuera del 721, dentro del IRPF**.
4. Escribe a David hoy mismo si alguna vía de cobro de la academia pasaba por ahí.

### Acción 2 — Manda la pregunta 1 a tu asesoría, hoy también.

| | |
|---|---|
| **Dinero en juego** | Todo el IRPF y todos los modelos 130 asociados a lo que hayas cobrado en cripto. No lo puedo cifrar sin saber cuánto es |
| **Coste** | 0 €. Ya le pagas 75 €/mes |
| **Por qué antes que lo demás** | Regularizar voluntariamente cuesta el recargo del art. 27 LGT: **1 % + 1 % por cada mes completo de retraso**, con **reducción del 25 %** si pagas en plazo voluntario y no recurres. Esperar a un requerimiento convierte eso en sanción |

Y aprovecha el mismo correo para el modelo 130 del 2T, que venció el 20 de julio y hoy llevas
**9 días de retraso**: si lo presentas antes del 20 de agosto el recargo es del **1 %**; a partir de
ahí sube un punto por mes. Está desarrollado en `docs/situacion-real-cliente-aleman.md`, apartado
2.4.

### Acción 3 — Decide la cuenta. Y la decisión es: no abras Wise todavía.

| | |
|---|---|
| **Ahorro directo** | 50 € del alta, que no te compra nada mientras cobres euros por SEPA |
| **Ahorro indirecto** | No añadir un IBAN extranjero que te complica domiciliar el 130, el 303 y la cuota de autónomo, y que te mete en el modelo 720 el día que acumules 50.000 € |
| **Qué hacer en su lugar** | Si quieres separar el dinero del negocio del personal —y deberías, le simplifica la vida a tu asesoría—, abre una cuenta con **IBAN español**: N26 Business Standard (0 €/mes), una cuenta online de autónomo de un banco español (0 €/mes) o Qonto si quieres facturación integrada (9 €/mes) |
| **Cuándo revisar esto** | El día que factures en una divisa distinta del euro. Ese día Wise gana con holgura y el cálculo se da la vuelta |

Antes de decidir, dos comprobaciones de 30 segundos cada una: el precio real del plan Basic de
Revolut Business en su web, y si los precios de Qonto llevan IVA.

---

### Lo que no debe preocuparte

Porque la regla de esta casa es no preocuparte sin darte una acción, y aquí la acción es *no hacer
nada*:

- **El modelo 720 no es tu problema en 2026.** Necesitarías 50.000 € parados en cuentas extranjeras:
  **128 ventas acumuladas sin gastar un euro**, 43 meses a tu ritmo actual.
- **El modelo 721 tampoco.** Mismo umbral, misma distancia.
- **Las comisiones de pasarela no son tu problema.** 417,20 €/año en el negocio, 135,17 €/año tuyos
  después de IRPF: **0,34 ventas al año**. Ya cobráis por debajo de la tarifa estándar de tarjeta de
  Stripe. Esta línea está bien y no hay que tocarla.

Lo tuyo hoy es sacar el cripto de donde está, y el modelo 130.

---

## 9. Fuentes

### Wise

| Fuente | URL | Confianza |
|---|---|---|
| Wise Business: comisiones por recibir dinero (alta 50 EUR, SEPA gratis, SWIFT 2,39 EUR) | https://wise.com/es/pricing/business/receive | Oficial |
| Wise: comisiones por mantener, recibir y gastar dinero | https://wise.com/es/help/articles/2893489/comisiones-por-mantener-recibir-y-gastar-dinero | Oficial |
| Wise: cómo salvaguarda los fondos Wise Europe SA (Banco Nacional de Bélgica, sin garantía de depósitos) | https://wise.com/es/help/articles/50VrYRVwHcsYeKzvWbjf3n/como-nuestra-entidad-de-la-ue-wise-europe-sa-salvaguarda-los-fondos-de-los-clientes | Oficial |
| Wise: datos bancarios y IBAN | https://wise.com/es/help/articles/2932124/datos-bancarios-de-wise | Oficial |
| Wise: cómo está regulada en cada país | https://wise.com/help/articles/2932693/how-is-wise-regulated-in-each-country-and-region | Oficial |
| Wise abre sucursal en España (Madrid, operativa desde febrero de 2026) | https://theobjective.com/economia/banca/2026-04-01/wise-envio-dinero-sucursal-en-espana/ | Medio |
| Comisiones de Wise y tipo de cambio 2026 (comisión variable 0,47-0,55 %) | https://exiap.es/guias/wise-comisiones | Medio-especializado |

### Modelo 720 y modelo 721

| Fuente | URL | Confianza |
|---|---|---|
| RD 1065/2007 (arts. 42 bis, 42 ter, 42 quater, 54 bis) | https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984 | Oficial |
| AEAT: modelo 720, procedimiento y preguntas frecuentes | https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI34.shtml | Oficial |
| AEAT: modelo 720, otras causas de exoneración | https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-720-decla_____sobre-bienes-derechos-extranjero_/preguntas-frecuentes/otras-causas-exoneracion.html | Oficial |
| DGT V1239-17 (18/05/2017): las cuentas en entidades de dinero electrónico se declaran en el 720 | https://www.iberley.es/resoluciones/resolucion-vinculante-dgt-v1239-17-18-05-2017-1470995 | Medio-especializado |
| DGT V2475-25 (12/12/2025): la migración a IBAN español excluye la obligación del 720 | https://primeralecturaediciones.com/consultas/archivo/la-migracion-de-una-cuenta-con-iban-aleman-a-iban-espanol-excluye-la-obligacion-de-declarar-el-modelo-720/ | Medio-especializado |
| AEAT: modelo 721, procedimiento | https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml | Oficial |
| AEAT: modelo 721, preguntas frecuentes (autocustodia excluida del cómputo) | https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-721-decla-sobre-monedas-extranjero/preguntas-frecuentes-sobre-modelo-721.html | Oficial |
| AEAT: cuándo se entiende una moneda virtual situada en el extranjero | https://www3.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-721-decla-sobre-monedas-extranjero/preguntas-frecuentes-sobre-modelo-721/cuando-se-entiende-moneda-virtual-extranjero.html | Oficial |
| AEAT: plazo de presentación del modelo 721 | https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-721-decla-sobre-monedas-extranjero/preguntas-frecuentes-sobre-modelo-721/plazo-presentacion-modelo-721.html | Oficial |
| Orden HFP/886/2023 (aprobación del modelo 721) | https://www.boe.es/buscar/doc.php?id=BOE-A-2023-17429 | Oficial |

### Pagar impuestos desde un IBAN no español

| Fuente | URL | Confianza |
|---|---|---|
| Orden EHA/1658/2009, art. 5 bis (domiciliaciones desde entidades no colaboradoras de la Zona SEPA) | https://www.iberley.es/legislacion/articulo-5-bis-procedimiento-condiciones-domiciliacion-pago-deudas-entidades-credito-colaboradoras-gestion-recaudatoria-aeat | Medio-especializado |
| Resolución de 18/01/2021 de la DG de la AEAT (pago de deudas por transferencia) | https://www.boe.es/buscar/act.php?id=BOE-A-2021-1617 | Oficial |
| AEAT: pago de autoliquidaciones mediante transferencia bancaria | https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/pago-autoliquidaciones-mediante-transferencia-bancaria.html | Oficial |
| Reglamento (UE) 260/2012, art. 9 (accesibilidad de los pagos) | https://www.boe.es/buscar/doc.php?id=DOUE-L-2012-80471 | Oficial |
| Banco de España: qué es la discriminación de IBAN y cómo reclamar | https://clientebancario.bde.es/pcb/es/blog/discriminacion-de-iban-que-es-y-como-actuar-si-me-ocurre.html | Oficial |
| TGSS: mandato SEPA de domiciliación TC 1/15-3 | https://www.seg-social.es/wps/wcm/connect/wss/ce560ecc-50a5-47e6-be40-7e9515a06496/TC-1-15-3-+EDITABLE+%28003%29.pdf?MOD=AJPERES | Oficial |
| Art. 27 LGT (recargos por declaración extemporánea) | https://www.iberley.es/legislacion/articulo-27-ley-general-tributaria | Medio-especializado |

### Alternativas de cuenta

| Fuente | URL | Confianza |
|---|---|---|
| BOE-A-2023-11803: inscripción de Revolut Bank UAB, Sucursal en España en el Registro de entidades de crédito | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-11803 | Oficial |
| Revolut: planes de cuenta de empresa (web devuelve 403 a peticiones automáticas) | https://www.revolut.com/es-ES/business/business-account-plans/ | Oficial (no accesible) |
| Precios y planes de Revolut Business 2026 (act. 04/06/2026) | https://rankiabusiness.com/precios-planes-revolut-business/ | Medio-especializado |
| N26: IBAN español para nuevos clientes en España | https://n26.com/es-es/prensa/comunicados-de-prensa/n26-ofrece-iban-espanol-a-sus-nuevos-clientes-para-mejorar-la-experiencia-bancaria | Oficial |
| N26: declarar la cuenta N26 en España | https://support.n26.com/es-es/cuenta-e-informacion-personal/informacion-de-impuestos/debo-declarar-mi-cuenta-n26-en-espana | Oficial |
| N26 Business para autónomos: planes y precios | https://sincomisiones.org/cuentas/n26/business | Medio-especializado |
| Qonto: precios y planes en España | https://qonto.com/es/pricing | Oficial |
| Olinda SAS Sucursal en España (entidad legal de Qonto) | https://qonto.com/es/swift-codes/countries/spain/barcelona/olinda-sas-sucursal-en-espana | Oficial |

### Pasarelas de pago

| Fuente | URL | Confianza |
|---|---|---|
| Stripe: tarifas España (1,5 % + 0,25 € EEE; 2,8 % prémium; 3,15 % internacional; +2 % conversión; SEPA DD 0,35 €; disputa 20 €) | https://stripe.com/es/pricing | Oficial |
| Stripe: tarifas Alemania (idénticas a las españolas) | https://stripe.com/de/pricing | Oficial |
| PayPal: tarifas de comerciante España (2,90 % + 0,35 €; +1,99 % fuera EEE/RU; +3,0 % conversión) | https://www.paypal.com/es/webapps/mpp/merchant-fees | Oficial |
| BitPay: tarifas de comerciante (2 % + 0,25 $ por debajo de 500.000 $/mes) | https://bitpay.com/pricing/ | Oficial |

### MiCA, Binance y Bitbase

| Fuente | URL | Confianza |
|---|---|---|
| Euronews: Binance suspende servicios cripto en la UE tras no lograr la aprobación MiCA (25/06/2026) | https://www.euronews.com/business/2026/06/25/binance-to-halt-crypto-services-across-eu-countries-after-failing-to-secure-mica-approval | Medio |
| CoinDesk: Binance comunica a los usuarios de la UE que deja de prestar servicios (26/06/2026) | https://www.coindesk.com/policy/2026/06/26/binance-tells-eu-users-it-will-no-longer-provide-services-after-failing-to-secure-mica-license | Medio |
| El Español: Binance retira su solicitud de licencia MiCA en Grecia (24/06/2026) | https://www.elespanol.com/invertia/mercados/20260624/binance-retira-peticion-licencia-mica-grecia-solicitara-europeo-plazo/1003744298799_0.html | Medio |
| crypto.news: cronología del bloqueo de Binance en la UE el 1 de julio de 2026 | https://crypto.news/binance-eu-mica-license-lockout-july-2026-explained/ | Medio |
| CriptoNoticias: BitBase detiene operaciones en España por MiCA (30/06/2026) | https://www.criptonoticias.com/regulacion/mica-cobrando-victimas-bitbase-detiene-operaciones-en-espana/ | Medio-especializado |
| CriptoNoticias: exchanges en España sin licencia MiCA deben migrar a sus usuarios | https://www.criptonoticias.com/regulacion/exchanges-espana-mica-migrar-usuarios/ | Medio-especializado |
| CNMV: MiCA, nueva regulación de criptoactivos | https://www.cnmv.es/portal/mica/regulacion-criptoactivos | Oficial |
| Binance opera para residentes en España vía Moon Tech Spain, S.L. (registro D661 del Banco de España) | https://www.criptohacienda.es/guia/binance-spain-sl-hacienda-2026/ | Medio-especializado |

### Fiscalidad del cripto

| Fuente | URL | Confianza |
|---|---|---|
| AEAT: compra y venta de monedas virtuales, tributación en el IRPF del inversor (manual IRPF 2025) | https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2025/c11-ganancias-perdidas-patrimoniales/monedas-virtuales/compra-venta-monedas-virtuales-tributacion-inversor.html | Oficial |
| Consultas de la DGT sobre tributación de criptoactivos (recopilación) | https://www.uria.com/es/publicaciones/newsletter/1794-tributario | Medio-especializado |
| Tipos de la base del ahorro 2026 (19/21/23/27/30 %) | https://www.blockpit.io/tax-guides/impuestos-criptomonedas-espana | Blog especializado |

---

## 10. Qué cambia en el dashboard a partir de esto

Nada de forma automática. Este informe no toca código y los 626 tests siguen verdes. Lo que deja
apuntado para la siguiente sesión:

1. **`calculos.js` / `IRPF_DEFAULT.conceptosCripto`**: `['Binance', 'Bitbase']` son dos conceptos que
   ya no pueden generar retiros nuevos. Los históricos siguen siendo válidos y la clasificación no
   se toca.
2. **El texto de la interfaz que dice "Cripto: no tributa"** (`app.js`) es correcto como modelo de
   caja e incorrecto como afirmación fiscal. Merece una nota al lado, con el enlace al apartado 5.3
   de este documento, en cuanto la asesoría conteste a la pregunta 1.
3. **Umbrales del 720 y del 721 (50.000 €) para la línea de tiempo de la pestaña "Y ahora qué"**:
   traducidos, **128 ventas netas acumuladas**. Hoy está a 43 meses de distancia, pero es un hito
   que la línea de tiempo debería mostrar como cualquier otro.
