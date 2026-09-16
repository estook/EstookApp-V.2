# 0039 · El Panel se monta como un móvil, y cada uno se pone sus cifras

**Fecha:** 16 de septiembre de 2026
**Estado:** decidido y construido en M7 (rama `m7-el-panel-vivo`)
**Cambia:** la [0007](0007-el-movimiento-sin-libreria.md) en lo que toca al arrastre, y la
tabla de movimiento de **B6** del Plan, que gana tres filas

## Lo que dijo Richi

> «El panel más dinámico e inteligente: **quitar cuadrados si están vacíos**,
> poder editarlo mejor y **añadir los nuestros**. Mejorar el añadir widgets: que
> **se puedan mantener para editarlos, que vibren como en Apple** y que **se
> arrastren mejor que las flechas**.»
>
> «Mejora la interfaz en general. Me gustaría algo más moderno y guapo, con
> animaciones y efectos, **gráficas, flechas de subida y bajada**. En PC sobra
> mucho espacio.»

## Cómo lo hacen los que lo hacen bien

| Quién                                   | Qué se copia                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **La pantalla de inicio del iPhone**    | Mantener pulsado para editar, temblar mientras se edita, arrastrar desde cualquier parte y que los demás se aparten |
| **Shopify, Square, Stripe** (resúmenes) | Una cifra por tarjeta, con **su flecha frente al periodo anterior** y una línea de los días debajo                  |
| **Shopify, Square** (montar el panel)   | Añadir una tarjeta es **elegir qué mirar y de cuánto tiempo**, no dibujar una gráfica                               |

## Lo que se decide

### Uno · Editar el Panel es lo mismo que editar un iPhone

- **Mantener pulsado** medio segundo cualquier widget entra en edición, con un toque
  de vibración donde el aparato la tiene. El botón **Editar** se queda: un gesto que
  no se ve no lo descubre nadie.
- **Los widgets tiemblan** mientras se edita. Menos de un grado, cada uno con su
  desfase, y con «reducir movimiento» no tiembla nada.
- **Se arrastran desde cualquier parte**, y los demás **se deslizan** para hacerle
  sitio. Con el dedo hay que dejarlo quieto 150 ms antes de arrastrar, para que
  hacer scroll no coja un widget.
- **Las flechas ← → se van.** El teclado sigue pudiendo moverlo todo —tabulador,
  espacio para coger, flechas, espacio para dejar— y cada paso se anuncia en
  castellano a quien usa un lector de pantalla.
- El **«−»** para quitar va arriba a la izquierda, como en el móvil, y quitar
  **sigue teniendo deshacer**.

### Dos · El arrastre, con `@dnd-kit`, y solo al editar

La 0007 decía que no se trae una librería de movimiento «hasta que haga falta», y
que haría falta con **animación de disposición**: que un elemento se deslice solo
cuando cambia de sitio. **Es exactamente lo que se pide ahora.**

Se elige `@dnd-kit` y no `Motion` porque lo que hace falta es **arrastrar**, no
animar: sensores de dedo, ratón y teclado, el retraso que distingue arrastrar de
hacer scroll, anuncios accesibles y animación de los que se apartan. Es la librería
de arrastrar de referencia en React, sin dependencias, y pesa unos 15 KB
comprimidos. **Se descarga solo al entrar en edición**, en su propio trozo: el
Panel de todos los días no la paga.

`Motion` sigue sin entrar. La 0007 queda igual en todo lo demás.

### Tres · Lo vacío se aparta, y se dice

Un widget que no tiene nada que decir **no ocupa un cuadrado**: se aparta del
Panel, y debajo sale una línea —«Sin nada ahora en Caducidades y Bajo mínimo.
Vuelven en cuanto haya algo»—. Un widget que desaparece sin explicación es uno que
alguien cree haber perdido, y eso ya pasó en M7 con el catálogo.

- **Quien sabe si está vacío es el widget**, y lo dice con `usarQueEstaVacio`. La
  rejilla no sabe qué hay dentro de cada uno, y no debe saberlo.
- **Cargando no es vacío.** Si lo fuera, el Panel abriría sin nada y los iría
  enseñando según llegan los datos.
- **Se aparta, no se desmonta**: sigue pidiendo sus datos, y vuelve solo.
- **En edición se ven todos**, con «Vacío ahora», para poder colocarlos.
- Los que se apartan: caducidades, bajo mínimo, sin precio, compras de hoy, lo que
  viene, lo último apuntado y un indicador sin datos. Los que nunca se apartan
  —fichar, las apps, las acciones— es porque siempre tienen algo que hacer.

Y la otra mitad de «cuadrados vacíos»: **los huecos de la rejilla**. Un widget ancho
detrás de uno pequeño dejaba un agujero y bajaba a la fila siguiente. Con el flujo
denso de CSS se rellena con el siguiente que quepa, como en el móvil.

### Cuatro · «Añadir los nuestros»: los indicadores

Una cifra del negocio **con su periodo, su flecha y su línea de días**. Se elige
**qué** y **de cuántos días** (7 o 30), y nada más: ni tipo de gráfica, ni colores.

| Indicador    | De dónde sale                              | Quién lo puede tener         | Subir es       |
| ------------ | ------------------------------------------ | ---------------------------- | -------------- |
| Ventas       | Cierres de caja, con IVA                   | Quien ve ventas              | Bueno          |
| Ticket medio | Cierres con tickets apuntados              | Quien ve ventas              | Bueno          |
| Food cost    | Género gastado ÷ lo vendido, días con caja | Quien ve ventas **y** costes | Malo           |
| Merma        | El libro, a coste medio                    | Inventario **y** costes      | Malo           |
| Compras      | Entradas del libro, a precio sin IVA       | Inventario **y** costes      | Ni uno ni otro |
| Mis horas    | Tus fichajes                               | Todo el mundo                | Ni uno ni otro |

Las reglas, que son las que hacen que la flecha no mienta:

- **Se compara con el periodo anterior del mismo largo**: los 7 días frente a los 7
  de antes.
- **Lo que es una proporción se calcula sobre el periodo**, no como media de días:
  el food cost de la semana es lo gastado entre lo vendido de los siete, porque un
  martes de 40 € no pesa lo mismo que un sábado de 3.000.
- **Un día sin caja no vendió cero**: la línea se corta. La merma, las compras y las
  horas sí son cero cuando no hay nada, porque el libro y los fichajes están siempre.
- **Un porcentaje cambia en puntos**, no en «por ciento de un por ciento».
- **De nada a algo no tiene flecha**: no es «un infinito por ciento más».
- **El color dice si es buena noticia**, no hacia dónde va, y **nunca va solo**:
  lleva flecha y, para quien no ve, la frase entera.
- **El food cost del Panel es el mismo que el de Servicio**: misma cuenta, y una
  prueba que lo compara.

Lo elegido va **en el identificador** del widget (`indicador-ventas-7`): la forma de
guardar el Panel de la 0025 no cambia, no hace falta migración, y el mismo indicador
con el mismo periodo no se puede poner dos veces.

Qué pide cada uno vive en `@estook/permisos` (`LO_QUE_PIDE_EL_INDICADOR`), porque lo
usan el catálogo —que no lo ofrece— y el servidor —que lo vuelve a comprobar—.

### Cinco · Lo que cambia en la tabla de movimiento de B6

| Qué                                | Cómo                                                                   | Cuánto       |
| ---------------------------------- | ---------------------------------------------------------------------- | ------------ |
| Widget que entra al abrir el Panel | Sube 8 px y aparece, escalonado cada 35 ms                             | 240 ms       |
| Línea de una tendencia             | Se dibuja de izquierda a derecha                                       | 600 ms       |
| Panel en edición                   | Los widgets tiemblan, menos de un grado                                | Ciclo 280 ms |
| Widget que se arrastra             | Va pegado al dedo, un 3 % más grande, sombra s3; los demás se deslizan | 200 ms       |

**«Nada gira» tiene ahora una excepción escrita**, y una sola: el temblor de
edición. Dice sin leer que el Panel está en otro modo, es el lenguaje que el iPhone
lleva quince años enseñando, y se apaga con «reducir movimiento».

### Seis · El espacio en pantallas grandes

La rejilla pasa a **seis columnas** desde 1536 px. En un monitor, cuatro columnas
dentro de un contenedor de 92 rem hacían widgets pequeños de 350 px de ancho con
media tarjeta vacía.

## Lo que se descartó

**Un editor libre de gráficas** (elegir tipo, ejes, colores, fórmulas). Es lo que
tienen Metabase o Looker, y es lo contrario de lo que pide un bar: montarlo lleva
una tarde y la pregunta de verdad —«¿vendo más o menos que la semana pasada?»— se
contesta con dos toques.

**Guardar la configuración del indicador aparte**, en una columna nueva. Habría
obligado a migrar la tabla del Panel y a tocar su comando, para guardar dos datos
que caben en el nombre.

**Apartar lo vacío con una opción** («esconder los vacíos: sí / no»). Una opción
más para algo que casi nadie quiere ver: se aparta siempre, se dice, y en edición
se ve todo.

**Seguir sin librería.** Se intentó pensar el deslizamiento a mano (medir cada caja
antes y después, y animar la diferencia). Son cuarenta líneas que ya existen,
probadas y accesibles, y la 0007 decía justo en qué momento dejar de escribirlas.

## Cómo se sabría que fue un error

- Si en el TPV de una cocina, con guantes, mantener pulsado entra en edición sin
  querer. Entonces se sube a 700 ms o se deja solo el botón en pantallas táctiles
  grandes.
- Si alguien pregunta dónde está un widget que se ha apartado. Entonces la línea no
  basta y hay que enseñarlo plegado.
