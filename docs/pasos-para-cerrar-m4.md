# Los cuatro pasos para cerrar M4

M4 está terminado en código y probado. Lo que queda son **cuatro cosas que hay
que pulsar**, y las tienes que hacer tú porque tocan Supabase y GitHub, que son
tuyos.

El **paso 1 ya está hecho**: el pull request está fusionado.

Los otros tres, en orden. **No te saltes ninguno**: el 3 no funciona sin el 2, y
el 4 no sirve de nada sin el 3.

---

## Paso 2 · Poner al día la base de datos

### Qué es esto, en cristiano

La base de datos de Supabase tiene ahora mismo **17 migraciones aplicadas**. M4
escribió dos más:

- La **`0018`** crea las cinco tablas nuevas del login: contraseñas, PIN,
  segundo factor, sesiones y suscripción.
- La **`0019`** arregla un fallo del propio M4 que encontré repasando: sin ella,
  invitar a alguien nuevo no funciona.

Sin este paso, la API no tiene dónde guardar una sesión y **nadie puede entrar**.

### Por qué lo haces tú y no yo

Porque hace falta la contraseña de tu base de datos, que vive solo en tu
ordenador (`.env.local`) y no está en el repositorio. Es la regla de siempre:
ninguna clave se escribe aquí dentro.

### Qué escribir

Abre una terminal en la carpeta del proyecto y escribe, una detrás de otra:

```bash
git checkout main && git pull
```

```bash
pnpm bd:migrar
```

Tiene que decir que ha aplicado la `0018` y la `0019`. Si dice «no hay nada que
aplicar», es que ya estaban.

```bash
pnpm bd:sembrar
```

Esta última hace algo nuevo: además de los locales y las personas, **pone las
contraseñas y los PIN** de las siete personas de ejemplo, y añade a Nuria, que es
la camarera con dos locales.

Al terminar te escribe en pantalla la contraseña y **el PIN de cada persona en
cada local**. Cópialos a algún sitio: los PIN no se pueden volver a consultar, y
si los pierdes hay que generar otros. Es lo mismo que le pasa a un gerente de
verdad, y es a propósito.

> **Ojo, y esto importa.** La semilla se niega a correr si el entorno es
> `produccion`, porque pondría siete cuentas con una contraseña que está escrita
> en GitHub. Hoy tu Supabase solo tiene datos de ejemplo, así que no pasa nada.
> El día que haya un cliente de verdad, esa semilla **no se vuelve a ejecutar**.

### Cómo saber que ha ido bien

```bash
pnpm bd:comprobar
```

Tiene que decir **19 de 19 migraciones** y **23 tablas**, todas con seguridad por
filas.

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

| Name                    | Secret                        |
| ----------------------- | ----------------------------- |
| `SUPABASE_ACCESS_TOKEN` | el token que acabas de copiar |
| `SUPABASE_PROJECT_REF`  | `efgtzujwjztihyiwgpwg`        |

> Estos son **los dos primeros secretos** del repositorio. Hasta ahora no había
> ninguno, y era correcto: lo del navegador es público por naturaleza y lo
> verdaderamente secreto vivía solo en Supabase. Estos dos son distintos porque
> son «nosotros desplegando», no del producto.

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
