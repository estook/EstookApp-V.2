# Pasos para cerrar M6

> ## Lo que ya está hecho · comprobado el 4 de septiembre de 2026
>
> **Están los cuatro pasos de máquina. No hay nada bloqueado**, y lo he
> comprobado contra tu Supabase y contra tu GitHub, no de memoria:
>
> | Qué                         | Cómo está                                               |
> | --------------------------- | ------------------------------------------------------- |
> | Los pull requests #30 a #34 | **Fusionados**                                          |
> | La base de datos            | **24 de 24** migraciones aplicadas                      |
> | La API desplegada           | **Al día**: conoce las 14 consultas que tiene el código |
> | El almacén del logo         | **Listo**: sube, firma, lee y borra                     |
>
> El almacén te lo daba yo por pendiente desde M5 y **ya lo tenías hecho**: la
> clave estaba puesta al final de `.env.local`. Ese punto queda cerrado.
>
> **Lo único que falta es el paso 4: mirarlo en tu móvil.**

---

## Cómo se escriben los comandos aquí

**El lanzador es `.\estook.cmd`.** En tu ordenador `pnpm` no se encuentra, porque
la ventana de terminal se abrió antes de instalarlo y se quedó con el PATH viejo.
`.\estook.cmd` busca `pnpm` donde de verdad está, así que funciona siempre. Todos
los comandos de este documento van así.

Y una cosa de PowerShell: **no entiende `&&`**. Si ves «El token '&&' no es un
separador de instrucciones válido en esta versión», es siempre eso. Por eso cada
comando va en su propio recuadro, de uno en uno.

```bash
.\estook.cmd bd:comprobar
```

Si algún día abres una ventana nueva de terminal, `pnpm bd:comprobar` también
funciona. Pero no hace falta: `.\estook.cmd` vale siempre.

---

## Los tres pasos de máquina, por si hay que repetirlos

El orden es la regla 1 de «cómo trabajamos»: **primero fusionar, después aplicar a
Supabase, y después desplegar la API**. La base de datos nunca va por delante del
código.

### Paso 1 · Fusionar el pull request

**Dónde:** GitHub → pestaña **Pull requests** → entrar en el abierto → bajar al
recuadro del final. Las tres comprobaciones tienen que estar en verde: `Calidad`,
`Construccion y presupuestos` y `Migraciones reversibles`. Entonces, **Merge pull
request** y **Confirm merge**.

**Qué sale si va bien:** el pull request en morado con la palabra **Merged**.

> **Si alguna comprobación sale en rojo, para y dímelo.** No fusiones: el candado
> de `main` está para eso.

### Paso 2 · Aplicar las migraciones

```bash
git checkout main
```

```bash
git pull
```

```bash
.\estook.cmd bd:comprobar
```

La primera línea dice por dónde va la base. Si le falta alguna:

```bash
.\estook.cmd bd:migrar
```

**Qué sale si va bien:** una línea por cada migración que aplica. Vuelve a
ejecutar `.\estook.cmd bd:comprobar` y la primera línea tiene que decir el número
nuevo. Hoy dice **24 (hasta la 24)**.

### Paso 3 · Desplegar la API

**Las aplicaciones se publican solas al fusionar. La API no: va a mano.** Es el
paso que se olvida y hace que parezca que todo está roto.

**Dónde:** GitHub → **Actions** → en la izquierda, **«Desplegar la API»** → a la
derecha, **Run workflow** → escribir la palabra **`desplegar`** en minúsculas →
**Run workflow**.

**Qué sale si va bien:** una ejecución nueva que en un par de minutos se pone en
verde. Y desde tu ordenador:

```bash
.\estook.cmd bd:comprobar-api
```

Tiene que decir estas dos líneas:

```
OK   la API desplegada responde
OK   y conoce todas las consultas que tiene el codigo · las 14
```

Al final sale **11 sin poder comprobar**. **Esas once son normales y no son
fallos**: necesitan entrar con una cuenta de ejemplo, y en la base de verdad esas
cuentas están cerradas a propósito. Salen marcadas con `--`.

**Lo que no puede salir es ni una línea que empiece por `MAL`.**

---

## Paso 4 · Mirarlo en tu móvil · **esto es lo que falta**

Es la regla 11 del Plan, y es la que de verdad cierra el módulo: **nada se da por
terminado sin verlo en un móvil de verdad**. De los catorce fallos de M5, seis los
encontraste tú aquí. Del primer paseo de M6 salieron seis más, y arreglándolos
salieron dos.

**Dónde:** en tu teléfono, en la aplicación de Estook, entrando con tu cuenta.

### 4.1 · La barra de arriba, que antes no existía

Nada más entrar, arriba del todo: **el local en el que estás** y, a la derecha,
**cinco botones**.

- **Buscar** abre el buscador universal. Antes solo se abría con `Ctrl+K`, así que
  **en un móvil no había buscador**.
- **Avisos** y **chat** dicen qué serán y en qué módulo llegan. Antes no hacían
  nada.
- **Tu avatar** lleva a Ajustes. Compruébalo **desde dentro de Inventario**: es el
  sitio donde antes no había forma de llegar a Ajustes.

### 4.2 · La burbuja de Fogón · lo nuevo

Abajo a la derecha, **por encima de la barra de abajo**, hay una burbuja con la
mascota de Fogón. Está en **todas** las pantallas y va contigo.

**Ábrela desde el Panel.** Lo primero que dice es **«Estás en el Panel»**.
Ciérrala, entra en **Inventario** y ábrela otra vez: ahora dice **«Estás en
Inventario»**, y la lista de debajo cambia —dictar una merma, pedir el pedido de
mañana, preguntar por qué ha subido el aceite—.

Eso es lo que pediste: **sabe en qué página estás sin que se lo digas**. En el
ordenador es el mismo icono de arriba a la derecha, y abre un **panel lateral que
no tapa** lo que estabas mirando; `Ctrl+J` también.

**Lo que todavía no hace es hablar**, y la ventana lo dice con esas palabras. No
hay casilla de escribir a propósito: una casilla que no contesta es un botón mudo,
y de esos ya hemos quitado cuatro. La conversación es el módulo 22.

### 4.3 · Inventario · Hoy

Abre **Inventario**. Tiene que salir la pestaña **Hoy** pintada. **Esta pantalla
devolvía un error a todo el mundo, siempre**, por una suma de fechas mal escrita.
Si sale el aviso de que no se ha podido leer, para y dímelo.

Si no tienes género, ve a **Productos** y pulsa **«Ponme unos ejemplos para
verlo»**: seis productos con su etiqueta gris **ejemplo**.

### 4.4 · Dar de alta un producto, y el envase

Pulsa **«Añadir producto»**, escribe `aceite` y elige el aceite de oliva.

Debajo están **«Cómo lo compras»** y **«Cuánto trae»**, rellenas con lo del
catálogo —«Garrafa de 5 l» y «5000»— y **editables**. Escribe `Garrafa de 8 l` y
`8000`: la frase de debajo cambia sola a **«= 8000 ml para usar»** mientras
escribes.

**Cuéntalo con el reloj:** menos de **treinta segundos** desde que pulsas
«Añadir» hasta que está guardado.

### 4.5 · Mover género y precios

Entra en el producto que acabas de crear:

- **«Ha llegado género»**, **«Ha salido género»** y **«Ajustar lo que hay»**. Tras
  cada uno, la cifra de arriba cambia y abajo aparece una línea con tu nombre y la
  fecha. **Si le dices que hay 4, tiene que quedarse en 4.**
- **«Cambiar el precio»**: sale «Ha subido un X %», y el precio viejo sigue en el
  histórico con su fecha.

### 4.6 · La rueda, que decía dónde estabas y mentía

Desde el Panel, abre la rueda de apps: **ningún sector naranja**. Antes salía
Inventario resaltado, y en un teléfono eso se lee como «estás aquí».

Entra en Inventario y vuelve a abrirla: **ahora sí** tiene que estar Inventario
resaltado.

### 4.7 · El Panel, en el móvil y en el ordenador

- **«Termina de configurar tu local»** tiene ahora **«No me lo recuerdes más»**. Si
  lo pulsas se va, **y se va también en el otro aparato**, porque se guarda en el
  servidor. No da nada por hecho: lo que falte sigue en Ajustes.
- **«Conecta tus ventas»**: pulsa «Recuérdamelo». Se va. Recarga y sigue sin estar.
  Ahora **sal y vuelve a entrar con tu contraseña**: tiene que volver. Antes se iba
  y no volvía nunca.
- Si hay alguien más con acceso, sale **«Tu equipo»**: quién es, su rol, quién no
  ha entrado todavía, y un botón a Equipo · Personas.

### 4.8 · En el ordenador, lo que no se puede probar en el móvil

En la barra de arriba, **pulsa «Inventario»**. Tiene que abrirse su desplegable.
Pruébalos todos. **Antes no se abría ninguno**: el menú se creaba y quedaba
recortado por la propia barra.

### 4.9 · Y lo que hay que mirar con lupa

Las tres de siempre, que son las que encuentras tú:

1. **¿Hay algún botón que prometa algo y no lo haga?**
2. **¿Algún texto habla del aparato equivocado?** Nada debería decir «pasa el
   ratón» en el móvil, ni «toca» en el ordenador.
3. **¿Se sale algo de la pantalla, o se corta un título?**

---

## Fogón, contestado del todo

**Fogón es el módulo 22**, y hasta entonces no habla. Lo que ya está decidido y
construido es **dónde vive**, que era lo que estaba mal planteado:

- **Burbuja flotante en el móvil**, en todas las pantallas.
- **Icono de arriba a la derecha en el ordenador**, con panel lateral que no tapa.
- **Sabe en qué pantalla estás**, sin que se lo digas.
- **Será también un chat de verdad**: se le pregunta cualquier cosa desde
  cualquier sitio, no solo sobre la pantalla que tengas delante.
- **Nunca una pestaña dentro de una app.** Las pestañas se quedan para los
  **análisis que Fogón deja hechos**, calculados fuera de hora y guardados: cada 8
  horas lo que se mueve con cada servicio, cada 12 lo del día, cada 24 lo de la
  semana.

Está escrito en
[`docs/decisiones/0015`](decisiones/0015-fogon-es-una-burbuja-no-una-pestana.md),
y en el Plan, en B5 y en la ficha de M22.

Y una cosa que conviene tener clara: lo que Estook ya calcula —cuándo se agota
cada producto, cuánto se gasta al día, qué precio ha subido— **lo hace la base de
datos, no un modelo**. Es una regla del Plan: «los números los calcula la base de
datos, **nunca** el modelo». Ahí no falta IA; ahí la IA no pinta nada.

---

## Lo que hay que decidir, y no lo decido yo

**Quién ejecuta los procesos de fondo.** Hay que decidirlo antes de M8, y ahora
además lo necesitan los análisis periódicos de Fogón: **sin reloj no hay «cada 8
horas»**.

Estook apunta en una lista todo lo que pasa —«se ha creado un local», «ha subido
un precio»— para que otras partes se enteren luego. Esa lista **hoy no la vacía
nadie**, porque la API es un programa que se despierta cuando alguien entra y se
apaga después: no hay nada que corra solo cada cierto tiempo.

**Hoy no rompe nada.** Pero la lista crece, y M8 va a necesitar leerla.

Hay tres formas de tener ese reloj. Cuando quieras me lo dices y te explico las
tres con sus pegas, y decides. **Las dos primeras son gratis.**
