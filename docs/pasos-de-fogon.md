# Pasos de Fogón

> ## Cómo está
>
> Leído el 19 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                                     |
> | ---------------- | ------------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **Fogón 1 · 1 fusionada** (#117). Abierta: **el chat de Fogón y «Probar la conexión»** (rama `fogon-el-chat`) |
> | La base de datos | **74 de 74** migraciones (la 0074 aplicada)                                                                   |
> | La API           | **Desplegada el 18-oct** con la #117: 94 consultas y 201 comandos. La rama nueva la deja en **94 y 202**      |
> | Fogón            | **Encendido**: el general, IKATZ y Pizzeriacazzo. **No contesta**: falla la llamada a Anthropic (ver abajo)   |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de M9, en [`pasos-de-m9.md`](pasos-de-m9.md).

---

## Lo que te toca ahora · el chat y por qué no contesta

Lo que viste el 19-oct: Fogón **no contestaba**, y la ventana **no parecía un chat**. Arreglado en su pull request ([0097](decisiones/0097-fogon-1-las-respuestas-y-la-base.md), punto 6): el fallo ahora dice su motivo, el admin tiene **«Probar la conexión»**, y Fogón es **un chat de verdad**. **Sin migración, con la API.**

1. **Fusionar**: en **github.com** → **Pull requests** → **«El chat de Fogón y probar la conexión…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**.
2. **Desplegar la API**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**, y espera al **círculo verde**.
3. **Probar la conexión**: **estook.com/admin/** → **Fogón** → **Probar la conexión**. Lo que diga, dímelo: si es **«Funciona»**, ya está; si es **«No funciona»**, la frase dice qué tocar.
4. **Probarlo en el iPhone**: cierra Estook del todo y ábrela **dos veces** (la primera trae la versión nueva). El «+» → **«Pregúntale a Fogón»**: el logo, «Fogón sabe que estás en…» y unas preguntas que se tocan; la caja para escribir, abajo.

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
