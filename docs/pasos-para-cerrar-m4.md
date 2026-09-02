# Los cuatro pasos para cerrar M4

M4 está terminado en código y probado. Lo que queda son **cuatro cosas que hay
que pulsar**, y las tienes que hacer tú porque tocan Supabase y GitHub, que son
tuyos.

El **paso 1 ya está hecho**: el pull request está fusionado. Y el **paso 2
también**, ejecutado el 2 de septiembre de 2026 contra tu Supabase; queda escrito
aquí abajo por si hay que repetirlo.

Los otros dos, en orden. **El 4 no sirve de nada sin el 3.**

---

## Si la terminal dice que no conoce `pnpm`

Pasó, y no era culpa tuya. Al instalar `pnpm` se añade su carpeta al PATH, pero
**una ventana de terminal que ya estaba abierta se queda con el PATH que había
cuando se abrió**, para siempre. Así que sigue diciendo que no lo conoce aunque
esté perfectamente instalado, y el error no da ninguna pista de eso.

Dos salidas:

1. **Cierra la ventana entera y abre otra.** Suele bastar.
2. Si aun así no, usa el lanzador que hay en la raíz del proyecto, que busca
   `pnpm` donde de verdad está sin depender del PATH:

```bash
.\estook.cmd bd:comprobar
```

Vale para cualquier orden: `.\estook.cmd bd:migrar`, `.\estook.cmd verifica`.

---

## Paso 2 · Poner al día la base de datos · HECHO

Queda documentado porque hay que repetirlo en cada máquina nueva, y porque los
PIN se pierden.

### Qué era

La base tenía 17 migraciones. M4 escribió dos más:

- La **`0018`** crea las cinco tablas nuevas del login: contraseñas, PIN,
  segundo factor, sesiones y suscripción.
- La **`0019`** arregla un fallo del propio M4 que encontré repasando: sin ella,
  invitar a alguien nuevo no funciona.

Sin este paso, la API no tiene dónde guardar una sesión y **nadie puede entrar**.

### Lo que se ejecutó

```bash
pnpm bd:migrar
```

Dijo `aplicando 0018 ... hecho`, `aplicando 0019 ... hecho`, **19 en total**.

```bash
pnpm bd:sembrar
```

Además de los locales y las personas, **puso las contraseñas y los PIN** de las
siete personas de ejemplo, y añadió a Nuria, la camarera con dos locales. Dejó 2
organizaciones, 2 áreas y 7 locales.

Al terminar escribió en pantalla la contraseña y **el PIN de cada persona en cada
local**. Esos PIN **no se pueden volver a consultar**: lo que se guarda es su
huella. Si se pierden, se vuelve a ejecutar `pnpm bd:sembrar` y salen otros. Es
lo mismo que le pasa a un gerente de verdad, y es a propósito.

> **Ojo, y esto importa.** La semilla se niega a correr si el entorno es
> `produccion`, porque pondría siete cuentas con una contraseña que está escrita
> en GitHub. Hoy tu Supabase solo tiene datos de ejemplo, así que no pasa nada.
> El día que haya un cliente de verdad, esa semilla **no se vuelve a ejecutar**.

### Cómo se comprobó

```bash
pnpm bd:comprobar
```

**19 migraciones**, **23 tablas** todas con seguridad por filas, la auditoría sin
poder modificarse ni borrarse, y 0 tablas fuera del esquema `estook`.

```bash
pnpm bd:comprobar-api
```

La API entera contra esa misma base: entrar, el token, el cambio de local sin
abrir sesión nueva, quién ve cuántos locales, el 403 del local ajeno, y que no
hay ninguna contraseña guardada en claro. **Todo correcto.**

---

## Paso 3 · Desplegar la API

### Qué es esto, en cristiano

La API es el programa que está en medio: la aplicación del móvil le pregunta
«¿quién es esta persona y qué puede ver?» y él contesta mirando la base de datos.

**Existe desde M2 y está probado**, pero nunca se ha puesto en marcha en
internet, porque hasta ahora no había a quién servir. Ahora sí: es lo que hace
falta para que el botón de «Entrar» haga algo.

Se despliega dentro de Supabase, como una «Edge Function». Eso ya estaba decidido
desde M0.

### Primero, dos llaves

GitHub necesita permiso para hablar con tu Supabase. Son dos datos, y van en
**Secrets** (no en Variables, porque estos sí son secretos de verdad):

1. Entra en **supabase.com** → arriba a la derecha, tu avatar → **Account
   settings** → **Access Tokens** → **Generate new token**. Ponle de nombre
   «GitHub Estook». Cópialo: **solo se enseña una vez**.

2. El identificador de tu proyecto es `efgtzujwjztihyiwgpwg`. Sale en la
   dirección del panel de Supabase.

Ahora, en GitHub:

**Tu repositorio → Settings → Secrets and variables → Actions → pestaña
Secrets → New repository secret.** Dos veces:

| Name                   | Secret                        |
| ---------------------- | ----------------------------- |
| `TOKEN_DE_SUPABASE`    | el token que acabas de copiar |
| `PROYECTO_DE_SUPABASE` | `efgtzujwjztihyiwgpwg`        |

> Estos son **los dos primeros secretos** del repositorio. Hasta ahora no había
> ninguno, y era correcto: lo del navegador es público por naturaleza y lo
> verdaderamente secreto vivía solo en Supabase. Estos dos son distintos porque
> son «nosotros desplegando», no del producto.

> **Van en castellano, y es por algo.** Antes se llamaban `SUPABASE_ACCESS_TOKEN`
> y `SUPABASE_PROJECT_REF`, y con esos nombres acabaron donde no iban: en la
> consola de Supabase, que **reserva el prefijo `SUPABASE_`** y los rechaza. Un
> nombre que se parece al de otro sitio es un nombre que acabará en otro sitio.

### Segundo, tres datos dentro de Supabase

La API, una vez en marcha, necesita saber tres cosas.

**Supabase → tu proyecto → Project Settings → Edge Functions → Secrets** → **Add
new secret**, tres veces:

| Name                  | Value                                       |
| --------------------- | ------------------------------------------- |
| `DATABASE_URL`        | la cadena de conexión, **la del agrupador** |
| `ORIGENES_PERMITIDOS` | `https://estook.github.io`                  |
| `ENTORNO`             | `produccion`                                |

Sobre la primera: en Supabase, botón **Connect**, elige **Session pooler** (no
«Direct connection»). Es la misma que tienes en tu `.env.local`. La directa solo
funciona por IPv6 y la API no siempre lo tiene.

Sobre la segunda: es la lista de páginas que pueden llamar a la API desde un
navegador. **No la dejes vacía ni pongas `*`.**

### Tercero, el botón

**Tu repositorio → pestaña Actions → «Desplegar la API» → Run workflow.**

Te pide escribir la palabra **`desplegar`**. Es a propósito: desplegar la API es
lo que pone los datos al alcance de cualquiera con un navegador, y eso se hace
mirando, no de paso.

El propio flujo comprueba al final que la API responde. Si no responde, falla y
te lo dice.

### Cómo saber que ha ido bien

Abre esta dirección en el navegador:

```
https://efgtzujwjztihyiwgpwg.supabase.co/functions/v1/api/salud
```

Tiene que contestar `{"datos":{"estado":"en pie","version":1}}`.

---

## Paso 4 · Decirle a la aplicación dónde está la API

### Qué es esto, en cristiano

La aplicación que está publicada **no sabe todavía** que existe esa API. Por eso
en tu foto sale «Todavía no hay servidor al que preguntar»: no es un error, es la
verdad, dicha a propósito en vez de dejarte una pantalla cargando para siempre.

Este paso es decírselo.

### Qué hacer

**Tu repositorio → Settings → Secrets and variables → Actions → pestaña
Variables → New repository variable:**

| Name           | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| `VITE_API_URL` | `https://efgtzujwjztihyiwgpwg.supabase.co/functions/v1/api` |

Esta va en **Variables** y no en Secrets, como las de Supabase que ya tienes: es
una dirección que acaba dentro del JavaScript que descarga cualquiera. No es
secreta y no pretende serlo.

### Y volver a publicar

La dirección se mete dentro de la aplicación **al construirla**, así que hay que
construirla otra vez:

**Actions → «Publicar en GitHub Pages» → Run workflow.**

O, si prefieres, cualquier cosa que fusiones en `main` la vuelve a publicar sola.

### Cómo saber que ha ido bien

Abre https://estook.github.io/EstookApp-V.2/app/ en el móvil. El aviso naranja
tiene que haber desaparecido y en su sitio tienen que estar los dos campos.

Entra con:

- **Correo:** `rosa@ejemplo.estook.com`
- **Contraseña:** `estook en desarrollo`

Tienes que acabar en el Panel del Bar Centro, con las ocho apps en la rueda.

---

## Y cuando funcione, lo que te pido

Esto es lo único de M4 que no puedo firmar yo, y es la regla 11: **míralo en el
móvil de verdad**. En concreto:

1. **Entra como Rosa** y mira que la rueda tenga ocho sectores.
2. **Sal, y entra como Sara** (`sara@ejemplo.estook.com`, la misma contraseña).
   Tiene que tener cuatro. Y no tiene que haber ni un candado: las apps que no
   son suyas **no aparecen**.
3. **Entra como Nuria** (`nuria@ejemplo.estook.com`). Te tiene que preguntar
   «¿Dónde estás hoy?» con dos locales. Elige uno, y luego cámbialo desde arriba
   del contenido: aparece la barra de deshacer.
4. **Entra como Ignacio** (`ignacio@ejemplo.estook.com`). No te tiene que
   preguntar dónde estás: entra en el conjunto de Zona Norte con sus tres
   locales. Entra en uno y vuelve con la flecha.
5. **Prueba el PIN.** Con el de Rosa en el Bar Centro, de los que te escribió
   `pnpm bd:sembrar`, pulsando «Prefiero usar mi PIN».

Si algo se ve raro, torcido o cortado, hazme una foto como las de antes. Las tres
que mandaste sirvieron para encontrar dos cosas.

---

## Si algo falla

| Lo que ves                                         | Qué suele ser                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| «Todavía no hay servidor al que preguntar»         | Falta el paso 4, o no se ha vuelto a publicar después de declararla |
| «No hay conexión» al pulsar Entrar                 | La API no está desplegada (paso 3), o `ORIGENES_PERMITIDOS` mal     |
| «Ese correo y esa contraseña no cuadran»           | Falta `pnpm bd:sembrar` del paso 2                                  |
| «Se nos ha roto algo por dentro»                   | Mira los registros de la función en Supabase → Edge Functions       |
| El flujo de desplegar dice que faltan los secretos | Paso 3, la primera parte                                            |

Y si no está en esta tabla, mándame lo que salga en pantalla y lo miro.
