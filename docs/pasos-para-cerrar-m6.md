# Pasos para cerrar M6

Son **cuatro**, y van en este orden. El orden es la regla 1 de «cómo trabajamos»:
**primero fusionar, después aplicar a Supabase, y después desplegar la API**. La
base de datos nunca va por delante del código, porque si se aplica la migración
antes de fusionar, la API publicada se encuentra con tablas que no sabe que
existen.

Cada paso dice **qué haces, dónde se hace y qué tiene que salir si va bien**.

> ### Lo que ya está hecho, para que no lo repitas
>
> Los pull requests **#30, #31, #32 y #33** están fusionados, y la migración
> **`0023`** aplicada a Supabase: son las siete tablas del inventario. Eso ya
> está. Lo que queda es lo de abajo.

---

## Antes de nada: si la terminal dice que no conoce `pnpm`

Sale así:

```
pnpm : El término 'pnpm' no se reconoce como nombre de un cmdlet...
```

**No es que falte: está instalado.** Es que una ventana de terminal ya abierta se
queda con el PATH que había cuando se abrió, para siempre. Si abriste esa ventana
antes de instalar `pnpm`, no lo va a encontrar nunca.

Dos salidas, y las dos valen:

- **La definitiva:** cierra esa ventana y abre otra. La nueva ya coge el PATH
  bueno, y todos los comandos de aquí abajo funcionan tal cual.
- **La de emergencia:** escribe `.\estook.cmd` en vez de `pnpm`, sin salir de la
  ventana que tienes. Por ejemplo, `.\estook.cmd bd:comprobar`.

Y una cosa de la terminal de Windows: **PowerShell no entiende `&&`**. Si ves «El
token '&&' no es un separador de instrucciones válido en esta versión», es
siempre eso: los comandos van **de uno en uno**, y por eso aquí cada uno va en su
propio recuadro.

---

## Paso 1 · Fusionar el pull request

**Dónde:** en la web de GitHub, en el repositorio `EstookApp-V.2`, pestaña
**Pull requests**.

1. Entra en el que está abierto: **«Los seis de la pantalla»**.
2. Baja hasta el recuadro del final. Las tres comprobaciones automáticas tienen
   que estar **en verde**:
   - `Calidad`
   - `Construccion y presupuestos`
   - `Migraciones reversibles`
3. Pulsa **Merge pull request** y luego **Confirm merge**.

**Qué tiene que salir si va bien:** el pull request se pone en morado con la
palabra **Merged**, y debajo aparece un botón para borrar la rama. Puedes
borrarla.

> **Si alguna comprobación sale en rojo, para aquí y dímelo.** No fusiones: el
> candado de `main` está para eso.

---

## Paso 2 · Aplicar la migración `0024`

Es una sola columna, y es la que hace que **«no me lo recuerdes más»** de la
tarjeta del Panel sea de verdad para siempre y en todos tus aparatos, y no solo
en el ordenador desde el que lo pulses.

**Dónde:** en tu ordenador, en una ventana de terminal, dentro de la carpeta del
proyecto.

### 2.1 · Traerte lo fusionado

```bash
git checkout main
```

```bash
git pull
```

**Qué tiene que salir:** el primero, `Switched to branch 'main'`. El segundo, una
lista de ficheros que acaba en algo parecido a `Fast-forward`.

### 2.2 · Ver por dónde va la base, antes de tocar nada

```bash
pnpm bd:comprobar
```

**Qué tiene que salir:** un resumen largo. **La primera línea es la que importa**,
y ahora mismo dice:

```
Migraciones aplicadas: 23 (hasta la 23)
```

Eso es lo esperado: la `0024` es la nueva y todavía no está.

### 2.3 · Aplicarla

```bash
pnpm bd:migrar
```

**Qué tiene que salir:** **una sola línea**, la de `0024_quitalo_para_siempre`, y
después un mensaje de que ha terminado. Tarda unos segundos.

Vuelve a ejecutar `pnpm bd:comprobar` y ahora la primera línea tiene que decir:

```
Migraciones aplicadas: 24 (hasta la 24)
```

---

## Paso 3 · Desplegar la API

**Este es el paso que se olvida y hace que parezca que todo está roto.** Las
cuatro aplicaciones se publican solas al fusionar; **la API no: se despliega a
mano**, a propósito. Mientras no lo hagas, la pantalla de Inventario está
publicada y el servidor no conoce ninguna de sus operaciones: verás «Eso ya no
está» en cada pantalla.

**Dónde:** en la web de GitHub, en el repositorio, pestaña **Actions**.

1. En la lista de la izquierda, elige **«Desplegar la API»**.
2. A la derecha, pulsa el botón **Run workflow**.
3. Se abre un recuadro pidiendo confirmación. Escribe la palabra **`desplegar`**,
   tal cual, en minúsculas.
4. Pulsa el botón verde **Run workflow** del recuadro.

**Qué tiene que salir si va bien:** aparece una ejecución nueva en la lista con un
círculo amarillo girando; en un par de minutos se pone en **verde**. Si sale en
rojo, para y dímelo.

### 3.1 · Comprobar que la API ya está al día

```bash
pnpm bd:comprobar-api
```

**Qué tiene que salir:** una lista larga de líneas que empiezan por `OK`, y entre
ellas estas dos:

```
OK   la API desplegada responde
OK   y conoce todas las consultas que tiene el codigo
```

Al final, una línea de resumen con **once sin poder comprobar**. **Esas once son
normales y no son fallos:** necesitan entrar con una cuenta de ejemplo, y en la
base de verdad esas cuentas están cerradas a propósito. Salen marcadas con `--`.

**Lo que no puede salir es ni una línea que empiece por `MAL`.** Si sale alguna,
para y dímela entera.

---

## Paso 4 · Mirarlo en tu móvil

Esto es la regla 11 del Plan, y es la que de verdad cierra el módulo: **nada se da
por terminado sin verlo en un móvil de verdad**. De los catorce fallos de M5, seis
los encontraste tú aquí. Del segundo paseo salieron seis más, y arreglándolos
salieron dos.

**Dónde:** en tu teléfono, en la aplicación de Estook, entrando con tu cuenta.

### 4.1 · Lo primero: la barra de arriba, que antes no existía

Nada más entrar, arriba del todo tienes ahora **el local en el que estás** y, a la
derecha, **cinco botones**: buscar, avisos, chat, Fogón y tu avatar.

**Qué tiene que pasar:**

- **Buscar** abre el buscador universal. Antes solo se abría con `Ctrl+K`, así que
  **en un móvil no había buscador**.
- **Avisos**, **chat** y **Fogón** abren una hoja que dice qué serán y en qué
  módulo llegan. Antes los tres eran botones que no hacían nada.
- **Tu avatar** lleva a Ajustes. Entra en Inventario y compruébalo desde ahí: es
  el sitio donde antes **no había forma de llegar a Ajustes**.

### 4.2 · La rueda, que decía dónde estabas y mentía

Desde el Panel, abre la rueda de apps.

**Qué tiene que salir:** **ningún sector naranja**. Antes salía Inventario
resaltado, y en un teléfono eso se lee como «estás aquí».

Ahora entra en Inventario y vuelve a abrir la rueda: **ahora sí** tiene que estar
Inventario resaltado, porque ahí sí estás.

### 4.3 · Inventario · Hoy

Abre **Inventario**.

**Qué tiene que salir:** la pestaña **Hoy**, pintada. **Esta pantalla devolvía un
error a todo el mundo, siempre**, por una suma de fechas mal escrita en la
consulta. Si sale el aviso de que no se ha podido leer, para y dímelo.

Si todavía no tienes género, ve a **Productos** y pulsa **«Ponme unos ejemplos
para verlo»**: seis productos con su etiqueta gris **ejemplo**. Al volver a
**Hoy**, ya no está vacía.

### 4.4 · Dar de alta un producto, y el envase

Pulsa **«Añadir producto»** y escribe `aceite`. Elige el aceite de oliva del
catálogo.

**Qué tiene que salir:** ahora, debajo, están **«Cómo lo compras»** y **«Cuánto
trae»**, rellenas con lo que propone el catálogo —«Garrafa de 5 l» y «5000»— y
**se pueden cambiar**.

**Pruébalo:** escribe `Garrafa de 8 l` y `8000`. Debajo, la frase tiene que
cambiar sola a **«= 8000 ml para usar»** mientras escribes. Eso es lo que antes no
se podía hacer, y obligaba a echar cuentas de cabeza.

**Cuéntalo con el reloj.** Tiene que ser **menos de treinta segundos** desde que
pulsas «Añadir» hasta que está guardado.

### 4.5 · Mover género y precios

Entra en el producto que acabas de crear:

- **«Ha llegado género»**, **«Ha salido género»** y **«Ajustar lo que hay»**.
  Después de cada uno, la cifra de arriba cambia y abajo aparece una línea nueva
  con tu nombre y la fecha. **Al ajustar, si le dices que hay 4, tiene que
  quedarse en 4.**
- **«Cambiar el precio»**: sale «Ha subido un X %», y el precio viejo sigue en el
  histórico con su fecha.

### 4.6 · El Panel, en el ordenador y en el teléfono

- La tarjeta **«Termina de configurar tu local»** tiene ahora un
  **«No me lo recuerdes más»**. Si lo pulsas, se va — y **se va también en el
  otro aparato**, porque se guarda en el servidor. No da nada por hecho: lo que
  falte sigue estando en Ajustes.
- **«Conecta tus ventas»**: pulsa «Recuérdamelo». Se va. Recarga y sigue sin
  estar. Ahora **sal y vuelve a entrar con tu contraseña**: tiene que volver a
  salir. Antes se iba y no volvía nunca.
- Y si hay alguien más con acceso a tu local, aparece la tarjeta **«Tu equipo»**,
  con quién es, con qué rol, quién todavía no ha entrado, y un botón a
  Equipo · Personas.

### 4.7 · En el ordenador, una cosa que no se puede probar en el móvil

En la barra de arriba, **pulsa «Inventario»**. Tiene que abrirse su desplegable
con sus pestañas. Pruébalas todas: Escandallos, Carta, Calendario…

**Antes no se abría ninguna.** El menú se creaba y quedaba recortado por la propia
barra, así que pulsar no hacía nada.

### 4.8 · Y lo que hay que mirar con lupa

Las tres de siempre, que son las que encontraste tú:

1. **¿Hay algún botón que prometa algo y no lo haga?**
2. **¿Algún texto habla del aparato equivocado?** Nada debería decir «pasa el
   ratón» en el móvil, ni «toca» en el ordenador.
3. **¿Se sale algo de la pantalla, o se corta un título?**

---

## Y la pregunta de la IA, contestada

**Fogón es el módulo 22.** Todavía no está construido, y por eso el botón lo que
hace hoy es contarte qué será: te avisará de lo que pasa antes de que se note,
entenderá lo que le dictes con las manos ocupadas, y te preparará borradores que
tú apruebas o tiras. Estará **dentro de cada pantalla**, no en un chat aparte.

Lo que Estook ya calcula hoy —cuándo se agota cada producto, cuánto se gasta al
día, qué precio ha subido y cuánto— **lo hace la base de datos, no un modelo**.
Eso es a propósito y es una regla del Plan: «los números los calcula la base de
datos, **nunca** el modelo». No es que falte la IA ahí: es que ahí no pinta nada.

---

## Y una cosa que no es de M6, pero sigue abierta

**El almacén del logo de M5.** Falta poner la clave de servicio de Supabase en
`.env.local` y ejecutar `pnpm almacen:preparar`. No bloquea nada de M6. Está en
[`docs/pasos-para-cerrar-m5.md`](pasos-para-cerrar-m5.md).

---

## Lo que hay que decidir, y no lo decido yo

**Quién ejecuta los procesos de fondo.** Hay que decidirlo antes de M8:

Estook apunta en una lista todo lo que pasa —«se ha creado un local», «ha subido
un precio»— para que otras partes se enteren luego. Esa lista **hoy no la vacía
nadie**, porque la API es un programa que se despierta cuando alguien entra y se
apaga después: no hay nada que corra solo cada cierto tiempo.

**Hoy no rompe nada** y M6 no lo necesita. Pero la lista crece, y M8 sí va a
necesitar leerla.

Hay tres formas de tener ese «reloj». Cuando quieras, me lo dices y te explico las
tres con sus pegas, y decides. Las dos primeras son gratis.
