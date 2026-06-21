# Mis Finanzas — Dashboard personal

Web estática que muestra mis finanzas **leyendo automáticamente** los datos del dashboard de
[Tradingverso](https://tradinverso.github.io/dashboard/): ingresos mensuales, caja del negocio,
retiros (reparto **40% yo / 60% David**), gastos fijos, saldo bancario y balance mensual.

## Cómo funciona

- **Ingresos, retiros y caja → automáticos.** Se leen en vivo del mismo origen que Tradingverso
  (un Google Apps Script) vía JSONP cada vez que abres la web o pulsas **🔄 Actualizar**.
  No hay que meter nada a mano: si actualizas Tradingverso, esto se actualiza solo.
- **Gastos fijos y saldo → manuales.** Pulsa **Editar datos**: cambias el saldo de tu cuenta y los
  gastos fijos (Gimnasio 27 € · Asesoría 75 € · Cuota autónomo 80 € = 182 €/mes). Se guardan en el
  navegador. Para que los gastos viajen a GitHub, pulsa **Exportar datos.json** y sube el archivo al repo.
- **Vista por pestañas.** Resumen · Histórico · Retiros · Gastos · Calendario.
- **Cifra protagonista:** "Puedo retirar ahora" = tu 40% del pendiente de retirar.
- **Alerta** si tu saldo bancario no cubre los gastos fijos del mes.
- **Caché de seguridad.** El último dato bueno de Tradingverso se guarda en el navegador; si te quedas
  sin conexión, el dashboard sigue mostrándolo (con aviso "desde caché").

## Ver en local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```
(Hace falta servidor porque la web lee `datos.json` con `fetch`; abrir el archivo directamente con
`file://` no funciona. La conexión con Tradingverso sí funciona en local porque usa JSONP.)

## Publicar en GitHub Pages

1. Sube esta carpeta a un repositorio de GitHub.
2. **Settings → Pages → Source:** rama `main`, carpeta `/ (root)`.
3. La web queda en `https://<usuario>.github.io/<repo>/` y se actualiza sola con cada cambio que
   subas al repo.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura de las secciones. |
| `style.css` | Estilo elegante y minimalista. |
| `calculos.js` | Cálculos puros (caja, repartos, balance, formato €). Testeado. |
| `tradinverso.js` | Carga (JSONP) y parseo de los datos de Tradingverso. Testeado. |
| `app.js` | Une todo: carga datos, calcula y pinta el dashboard + gráficos. |
| `datos.json` | Config: URL de la API, gastos fijos, reparto 40/60, año base. |
| `tests/` | Tests con `node --test`. |

## Tests

```bash
npm test
```
Verifica toda la lógica de dinero (`calculos.js`) y el parser de Tradingverso (`tradinverso.js`).

## Notas

- El año de los ingresos se toma de `anioBase` en `datos.json` (la hoja RESUMEN de Tradingverso usa
  solo el nombre del mes). Si pasas a 2027, actualiza `anioBase`.
- El beneficio mensual se toma de la columna **"Beneficio"** de la hoja RESUMEN (neto sin IVA − gastos),
  que es la base real del reparto, no del bruto con IVA.
