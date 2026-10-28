# Pasos de Fogón

> ## Cómo está
>
> Leído el 19 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                    |
> | ---------------- | -------------------------------------------------------------------------------------------- |
> | Pull requests    | **#117 a #120 fusionadas**. Abierta: **Fogón 1 entero** (rama `fogon-1-entero`)              |
> | La base de datos | **74 de 74** migraciones (la 0074 aplicada). La rama nueva trae la **0075**                  |
> | La API           | **Desplegada el 19-oct**: 94 consultas y 202 comandos. La rama nueva la deja en **96 y 210** |
> | Fogón            | **Encendido** (el general, IKATZ y Pizzeriacazzo) y **contestando** desde el 19-oct          |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de M9, en [`pasos-de-m9.md`](pasos-de-m9.md).

---

## Lo que te toca ahora · Fogón 1 entero

Fogón ya lee, revisa y prepara ([0098](../../decisiones/0098-fogon-1-entero.md)): **la foto del albarán** al recibir, **la foto del Z** al cerrar la caja, **la merma dicha o por foto**, **«Revisar mis datos»** (y cada lunes de madrugada, solo), **«Ajustar con Fogón»** en un pedido, **«Hacerlo con Fogón»** en el horario y **responder una reseña**. Y sabe tu nombre y tu puesto. **Con migración (la 0075) y con la API.**

1. **En GitHub**: abre el pull request **«Fogón 1 entero…»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y `.\estook.cmd bd:migrar`. **Qué tiene que decir:** «1 migracion(es) aplicadas · 75 en total».
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **Probarlo en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la versión nueva):
   - **Almacén → Compras**, un pedido → **Recibir** → **Foto del albarán**: se rellenan las líneas, marcadas «leído por Fogón».
   - **Servicio → Cierre de caja** → **Foto del Z**: se rellenan el total, el efectivo y la tarjeta.
   - **El «+» → Apuntar una merma** → escribe o dicta «se me han roto dos botellas de vino» → **Entenderlo**.
   - **Horario → Montarlo**, la semana que viene (vacía) → **Hacerlo con Fogón**: marca los días fuertes y a quién quieres, y mira lo que propone. **Ponerlo en el borrador** solo si te gusta.
   - **Fogón (el «+» o `Ctrl+J`) → Revisar mis datos → Revisar ahora**.
   - **Negocio → Reseñas**: pega una reseña de Google y **Escribir la respuesta**.
5. **Dime** lo que no te cuadre, sobre todo **las reglas del horario** (punto 2 de la [0098](../../decisiones/0098-fogon-1-entero.md)).

## Hecho · la #119 y la #120 (fusionadas el 19-oct)

El buscador que no dice «Nada con…» antes de preguntar, la clave de Anthropic limpia y las dos pruebas que fallaban de madrugada.

## Hecho · el chat de Fogón y «Probar la conexión» (#118, desplegada el 19-oct)

1. **Fusionar**: la #118.
2. **Desplegar la API**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**.

## Hecho · Fogón 1 · 1 (fusionada, migrada y desplegada el 18-oct)

Lo de abajo es lo que hiciste el 18-oct; queda por si hay que repetir algo.

## Fogón 1 · 1, paso a paso

Fogón ya habla: **preguntarle** desde el «+», **«Rellenar con Fogón»** al desgranar un plato y **«Escribir con Fogón»** los pasos de una ficha. Con el modelo más barato (Claude Haiku 5.5) y con sus topes: un local no pasa de **5 € al mes**, y tiene créditos al día y al mes. El orden: **fusionar, migrar, la clave, desplegar y encender.**

### 1 · Fusionar

En **github.com** → **Pull requests** → **«Fogón 1 · 1 · la base…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 2 · Migrar la base

En PowerShell, en la carpeta del proyecto, uno por uno:

```bash
git checkout main
```

```bash
git pull
```

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que decir:** que aplica la **0074 · Fogón la base**, y que la base va por la **74**.

### 3 · La clave de Anthropic (una sola vez)

Fogón es Claude, de Anthropic, y Anthropic cobra por lo que usa. Esto se hace **en su web, no en el chat**: **la clave nunca me la pegues aquí**.

1. Entra en **platform.claude.com** con la cuenta de Estook (si no tienes, créala allí).
2. En **facturación** (_Billing_) mete **saldo**: con **10 $** sobra para empezar.
3. En **límites** (_Limits_) pon el **límite de gasto del mes en 20 $**. Es el último freno: aunque algo fallara en Estook, Anthropic no deja pasar de ahí.
4. En **claves** (_API keys_) → **crear una** (_Create key_), llámala `estook-fogon` y **cópiala**: solo se ve una vez.
5. En **supabase.com/dashboard** → tu proyecto → **Edge Functions** → **Secrets** → **Add new secret**: nombre **`AI_API_KEY`**, valor **la clave que has copiado** → **Save**.

Si algún nombre no coincide con lo que ves, dímelo y lo miramos juntos.

### 4 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 94»** consultas y **«los 201»** comandos, **«Fogón 1 · 1 (0074)»** con sus dos comprobaciones bien, y debajo **«Fogón apagado en general · 0 cliente(s) encendido(s)»**.

### 5 · Encenderlo para IKATZ

En **estook.com/admin/** → **Fogón**:

1. El interruptor **«Fogón encendido»** (el general). Arriba pasa a decir **«Encendido»**.
2. En **Cada cliente**, el interruptor de **IKATZ**.

Los demás clientes siguen sin Fogón hasta que enciendas el suyo. **Para apagarlo a todos de golpe** (un cambio de IA o un mantenimiento), el general.

### 5½ · Si Fogón no contesta: «Probar la conexión»

En **estook.com/admin/** → **Fogón** → **Probar la conexión**. Si sale **«Funciona»**, la clave, el saldo y el modelo están bien. Si sale **«No funciona»**, dice **qué tocar** (la clave, el saldo, el modelo, el límite…), y debajo, en pequeño, lo que dice Anthropic: si no lo entiendes, pásamelo tal cual (no lleva la clave).

### 6 · Probarlo

En la app, con IKATZ:

1. El **«+»** → **«Pregúntale a Fogón»**: sale el logo, **«Fogón sabe que estás en el Panel»** y unas preguntas. Toca **«¿Qué tengo que atender hoy?»**. Contesta en uno o dos segundos, y debajo de la caja pone **«quedan 149 hoy y 1.499 de 1.500 este mes»**.
2. **Escandallos** → un plato **sin escandallo** → **Desgranar** → **«Rellenar con Fogón · 2 créditos»** (con una pista si quieres: «con bechamel, 8 por ración»). Salen las líneas con **«Borrador de Fogón»** y cada una pregunta **cuál de tus productos es**. **Revísalo**: es un borrador. No guarda nada hasta que pulses Guardar.
3. **Fichas** → un plato **sin pasos** → **«Escribir con Fogón»**.
4. En el admin → **Fogón**: lo gastado este mes, en llamadas, créditos y euros.

**Si Fogón dice que no está conectado**: falta la clave del paso 3, o se puso con otro nombre. **Si dice que no está encendido**: falta uno de los dos interruptores del paso 5.
