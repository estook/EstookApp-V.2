# Pasos para cerrar M6

Son **tres**, y van en este orden. El orden es la regla 1 de «cómo trabajamos»:
**primero fusionar, después aplicar a Supabase**. La base de datos nunca va por
delante del código, porque si se aplica la migración antes de fusionar, la API
que está publicada se encuentra con tablas que no sabe que existen.

Cada paso dice **qué haces, dónde se hace y qué tiene que salir si va bien**.

---

## Paso 1 · Fusionar el pull request

**Dónde:** en la web de GitHub, en el repositorio `EstookApp-V.2`.

1. Abre la pestaña **Pull requests**.
2. Entra en el que se llama **«M6 · Inventario»**.
3. Baja hasta el recuadro verde del final. Ahí salen las comprobaciones
   automáticas. Tienen que estar **las tres en verde**:
   - `Calidad`
   - `Construccion y presupuestos`
   - `Migraciones reversibles`
4. Cuando las tres estén verdes, pulsa **Merge pull request** y luego
   **Confirm merge**.

**Qué tiene que salir si va bien:** el pull request se pone en morado con la
palabra **Merged**, y debajo aparece un botón para borrar la rama. Puedes
borrarla, no hace falta para nada más.

> **Si alguna comprobación sale en rojo, para aquí y dímelo.** No fusiones: el
> candado de `main` está para eso.

---

## Paso 2 · Aplicar la migración a Supabase

Esto crea en la base de datos de verdad las tablas del inventario. **Hasta que no
lo hagas, Inventario no funciona en la app publicada**, aunque el código ya esté
fusionado.

**Dónde:** en tu ordenador, en una ventana de terminal, dentro de la carpeta del
proyecto.

### 2.1 · Traerte lo fusionado

```bash
git checkout main && git pull
```

**Qué tiene que salir:** unas líneas que acaban diciendo algo parecido a
`Fast-forward` y una lista de ficheros. Si dice `Already up to date.`, es que ya
lo tenías: sigue igual.

### 2.2 · Ver qué falta por aplicar, antes de tocar nada

```bash
pnpm bd:comprobar
```

**Qué tiene que salir:** un resumen largo de la base de datos. **La primera línea
es la que importa**, y ahora mismo dice exactamente esto:

```
Migraciones aplicadas: 22 (hasta la 22)
```

Eso es lo esperado antes de aplicar nada: la `0023` es la de M6 y todavía no
está. Más abajo verás la lista de tablas, y que **todas** llevan `RLS` delante.

### 2.3 · Aplicarla

```bash
pnpm bd:migrar
```

**Qué tiene que salir:** una línea por cada migración que aplica. Como solo falta
una, tiene que ser **una sola línea**, la de `0023_inventario`, y después un
mensaje de que ha terminado. Tarda unos segundos.

Vuelve a ejecutar `pnpm bd:comprobar` y ahora la primera línea tiene que decir:

```
Migraciones aplicadas: 23 (hasta la 23)
```

Y en la lista de tablas tienen que aparecer las siete nuevas: `proveedor`,
`categoria_de_producto`, `categoria_de_partida`, `producto`,
`precio_de_producto`, `lote` y `movimiento_de_stock`. **Todas con `RLS`
delante**: si alguna sale sin él, para y dímelo.

> **Si dice que no conoce `pnpm`**, no es que falte: una ventana de terminal ya
> abierta se queda con el PATH que había cuando se abrió. Cierra la ventana y
> abre otra. Y si aun así no, escribe `.\estook.cmd bd:migrar` en vez de
> `pnpm bd:migrar`.

### 2.4 · Comprobar que ha quedado bien

```bash
pnpm bd:comprobar-api
```

**Qué tiene que salir:** una lista larga de líneas que empiezan por `OK`, y al
final una sola línea de resumen. Hoy, antes de aplicar nada, dice exactamente
esto:

```
11 sin poder comprobar
```

**Esas once son normales y no son fallos.** Necesitan entrar con una cuenta de
ejemplo, y en la base de verdad esas cuentas están cerradas a propósito desde
septiembre. Salen marcadas con `--` en la lista.

**Lo que no puede salir es ni una línea que empiece por `MAL`**, ni la palabra
`mal` en el resumen. Si sale alguna, para y dímela entera.

Después de aplicar la `0023`, este mismo comando tiene que seguir sin ningún
`MAL`. Todavía no comprueba las tablas de M6 —eso lo añadiré cuando esté
aplicada y pueda mirarlo contra la base de verdad— pero sí comprueba que **no se
ha roto nada de lo anterior**, que es de lo que se trata.

---

## Paso 3 · Mirarlo en tu móvil

Esto es la regla 11 del Plan, y es la que de verdad cierra el módulo: **nada se
da por terminado sin verlo en un móvil de verdad**. De los catorce fallos de M5,
seis los encontraste tú aquí, no las pruebas.

**Dónde:** en tu teléfono, en la aplicación de Estook, entrando con tu cuenta.

Haz este recorrido y ve fijándote en si algo **no encaja con lo que la pantalla
promete**, que es lo que se escapa siempre:

### 3.1 · Abrir Inventario

Abre la rueda de apps y entra en **Inventario**.

**Qué tiene que salir:** la pestaña **Hoy**, y como todavía no tienes género, una
tarjeta que dice **«La cámara está vacía»** y te manda a Productos.

### 3.2 · Ponerte unos ejemplos, para ver cómo funciona

Ve a la pestaña **Productos** y pulsa **«Ponme unos ejemplos para verlo»**.

**Qué tiene que salir:** seis productos, todos con una etiqueta gris que pone
**ejemplo**. Y al volver a **Hoy**, ya no está vacía: sale lo que está por debajo
del mínimo, con una frase del tipo **«se agota el jueves a las 19:40»**.

**Míralo bien**, porque esto es lo nuevo del módulo: la cifra de consumo tiene
que venir siempre con **cuántos días se han mirado**, y la previsión con **su
día y su hora**.

### 3.3 · Dar de alta un producto de verdad, cronometrándolo

Pulsa **«Añadir producto»**. Escribe algo que compres, por ejemplo `aceite`.

**Qué tiene que salir:** una lista de propuestas, y **cada una con la cuenta
hecha**: «Garrafa de 5 l = 5000 ml para usar». Elige la tuya, ponle el precio y
guarda.

**Cuéntalo con el reloj del móvil.** Tiene que ser **menos de treinta segundos**
desde que pulsas «Añadir» hasta que está guardado. Si tardas más, dime en qué
paso se te va el tiempo: eso es un fallo del módulo, no tuyo.

Al guardar, si todavía tienes ejemplos, la pantalla te ofrece quitarlos. **No los
quita sola.**

### 3.4 · Mover género

Entra en el producto que acabas de crear y prueba los tres botones:

- **«Ha llegado género»** · pon las cajas que hayan venido.
- **«Ha salido género»** · saca un poco.
- **«Ajustar lo que hay»** · dile que hay otra cantidad, y ponle un motivo.

**Qué tiene que salir:** después de cada uno, la cifra de arriba cambia, y abajo,
en **«Qué ha pasado con este producto»**, aparece una línea nueva con tu nombre y
la fecha.

**Y lo importante:** al ajustar, si le dices que hay 4, tiene que quedarse en 4.
No te puede bloquear por cuadrar.

### 3.5 · Los precios

En la ficha, pulsa **«Cambiar el precio»** y sube el precio.

**Qué tiene que salir:** un aviso que dice **«Ha subido un X %»**, y abajo, en el
histórico, **el precio viejo sigue estando**, con su fecha de hasta cuándo valió.
Eso es lo que hace que dentro de seis meses puedas ver qué te ha subido.

### 3.6 · Y lo que hay que mirar con lupa

Estas tres son las que más se escapan, y son las que encontraste tú en M5:

1. **¿Hay algún botón que prometa algo y no lo haga?** Si algo se puede poner,
   tiene que poderse quitar.
2. **¿Algún texto habla del aparato equivocado?** Nada debería decirte «pasa el
   ratón» en el móvil, ni «toca» en el ordenador.
3. **¿Se sale algo de la pantalla, o se corta un título?**

---

## Y una cosa que no es de M6, pero sigue abierta

**El almacén del logo de M5.** Falta poner la clave de servicio de Supabase en
`.env.local` y ejecutar `pnpm almacen:preparar`. No bloquea nada de M6. Está en
[`docs/pasos-para-cerrar-m5.md`](pasos-para-cerrar-m5.md).

---

## Lo que hay que decidir, y no lo decido yo

**Quién ejecuta los procesos de fondo.** Te lo cuento en cristiano porque hay que
decidirlo antes de M8:

Estook apunta en una lista todo lo que pasa —«se ha creado un local», «ha subido
un precio»— para que otras partes se enteren luego. Esa lista **hoy no la vacía
nadie**, porque la API es un programa que se despierta cuando alguien entra y se
apaga después: no hay nada que corra solo cada cierto tiempo.

**Hoy no rompe nada** y M6 no lo necesita: lo que no podía esperar —ponerle sus
categorías a un local nuevo— se hace en el mismo instante. Pero la lista crece, y
M8 sí va a necesitar leerla.

Hay tres formas de tener ese «reloj». Cuando quieras, me dices y te explico las
tres con sus pegas, y decides. Las dos primeras son gratis.
