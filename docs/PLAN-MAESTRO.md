# Plan maestro — Mi sistema financiero

> **Qué es esto:** el plan vivo del dashboard. Se actualiza al final de cada sesión.
> Si algo no está aquí, se olvida. Última actualización: **28 de julio de 2026**.

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
| Beneficio suyo hoy | ~15.000 €/año | Sí |
| Ventas | ~3,3/mes (media de meses cerrados) | Medido |
| Punto muerto | 0,45 ventas/mes | Calculado |
| Cada venta le deja | 487,50 € brutos / **390,00 €** tras IRPF | Calculado |

### Preguntas abiertas que bloquean trabajo

- [ ] **¿Es socio de la GmbH o solo proveedor con acuerdo del 40 %?** Cambia todo el análisis de salida.
- [ ] **¿Está dado de alta en el ROI/VIES?** Factura B2B intracomunitario.
- [ ] **¿Presenta el modelo 349?**
- [ ] **¿Sus facturas llevan IVA?** No deberían: inversión del sujeto pasivo.
- [ ] **¿Cuándo se le acaba la tarifa plana?** Al acabarse, su neto cae ~176 €/mes.
- [ ] **¿En qué comunidad autónoma reside?** La escala autonómica cambia el IRPF.
- [ ] **¿Epígrafe de IAE?** Determina si le aplica el puerto seguro del art. 18.6 LIS.

---

## Estado del software

### En vivo — https://javierbeltrany4-dotcom.github.io/finanzas-javier/

| Pestaña | Qué hace |
|---|---|
| Resumen | Cuánto puede retirar hoy, verificación de datos, insights |
| Histórico | Beneficio por mes, gráfico, comparativa |
| Retiros | Filtros por año/mes/rango, IRPF y neto real por retiro |
| Mi dinero | Ahorro real del mes tras IRPF, gastos fijos, saldo |
| Calendario | Drill-down diario, heatmap, proyección |
| Mi patrimonio | Cuentas, reservas y objetivos (modelo sobre) |
| Cuánto facturar | Calculadora inversa, cascada, escalera, palancas, tramo de IRPF automático |

**299 tests.** Service worker v9, red primero.

### En construcción (28/07/2026)

- `docs/dubai-deducciones-2026.md` — qué se puede deducir de verdad del 9 % emiratí
- `docs/situacion-real-cliente-aleman.md` — su fiscalidad real facturando a Alemania
- Pestaña **Dónde vivir** — comparador de países con cifras investigadas
- **Sincronización + copia** — para que no vuelva a perder datos
- `docs/bali-indonesia-2026.md` — Bali con fuentes
- Pestaña **Y ahora qué** — el motor de decisiones

---

## Las sesiones

### ✅ Sesión 1 — Datos verídicos
Investigación con 156 fuentes. Tramo de IRPF automático. Cascada que sigue al objetivo.
Ventas del mes en vivo. **Hecho.**

### 🔄 Sesión 2 — Tus datos a salvo
Sincronización Mac↔iPhone por Apps Script + copia en archivo. Aviso permanente mientras
no tenga ninguna de las dos. **En construcción.**

### 🔄 Sesión 3 — Dónde vivir
Comparador España autónomo / España SL / Dubái / Paraguay / **Bali**, con sus cifras reales
y los umbrales traducidos a ventas al mes. **En construcción.**

### 🔄 Sesión 4 — Y ahora qué
Semáforo, qué hacer hoy, siguiente hito, línea de tiempo de todos los umbrales.
Pasa a ser la pestaña de inicio. **En construcción.**

### ⬜ Sesión 5 — El copiloto fiscal
Calendario de Hacienda: modelos 130, 303, 349, 390, renta. Cuánto apartar cada trimestre.
Avisos antes de cada plazo. Simulación de la declaración con lo acumulado.
**Objetivo:** que la gestoría deje de ser una caja negra y él pueda comprobar su trabajo.

### ⬜ Sesión 6 — Reparto de capital
Cuánto puede dedicar a otros negocios sin comprometer reservas ni objetivos.
Qué es dinero libre de verdad y qué está comprometido. Simulador de "si meto X aquí, qué pasa".

### ⬜ Sesión 7 — El motor de crecimiento
Qué palanca mueve más: precio, volumen, su %, costes. Con sus datos reales, no en abstracto.
Seguimiento de si las palancas que activa funcionan.

### ⬜ Sesión 8 — Cierre anual
Simulación de la declaración de la renta con lo acumulado. Desviación contra lo apartado.
Que llegue a junio sin sorpresas.

### ⬜ Pendientes sueltos
- **Wise España** — lo pidió y se me pasó. Investigar.
- **Estonia / e-Residency** — comparar con el resto.
- Coste de vida de Dubái (laguna del informe: sin él, su umbral real no se puede cerrar).

---

## Lo que ya sabemos y no hay que volver a investigar

### España
- IRPF por tramos: 19 / 24 / 30 / 37 / 45 / 47 %. Mínimo personal 5.550 €.
- **Hoy paga de más:** retiene 20 % y su tipo real es ~13,7 %. Le devuelven ~1.023 €/año.
- Al escalar se invierte: a 20 ventas/mes le faltarían ~17.973 €/año. La app ya lo avisa.
- Retenciones reales de autónomo: **15 % general, 7 % nuevos**. El 20 % no existe como retención.
- Umbral SL vs autónomo: ~60.000 € de equilibrio, real por encima de 90.000–100.000 €.
- Canarias ZEC descartada: exige 5 empleados y 100.000 € de inversión.
- Ley Beckham: no le aplica siendo ya residente.

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
- **Problema: Stripe no opera en Paraguay.**

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
| 28/07/2026 | Investigación fiscal con 156 fuentes. Descubierto que el cliente es alemán. |
