# M9 · 3 · Las fichas que se usan, y lo que ha cambiado

> **Estado: contestado entero, listo para construir.** Richi contestó las siete preguntas y las
> cuatro siguientes el 17-oct-2026 ([0092](decisiones/0092-las-respuestas-de-m9-3.md) y
> [0093](decisiones/0093-como-detecta-estook-lo-que-se-escapa.md)). Es la última entrega de M9
> ([el plan de M9](m9-escandallos.md)); después viene M10. **El coste teórico y los avisos de lo
> que se escapa** van con M20 y viven en su documento:
> [`como-detecta-estook-lo-que-se-escapa.md`](como-detecta-estook-lo-que-se-escapa.md).

## Lo que contestó Richi, y lo que significa

| Pregunta                        | Richi, 17-oct                                                                                           | Qué hace Estook                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 · «Qué ha cambiado»           | **B**                                                                                                   | Un bloque en Escandallos › Resumen, y aviso en la campana solo cuando un plato cruza una raya |
| 2 · Empezar desde una receta    | **B**                                                                                                   | Cada ingrediente pregunta cuál de tus productos es; nada se crea solo                         |
| 3 · Escalar                     | Sí, en la ficha técnica: «poner cuántas raciones y que multiplique»                                     | La pieza 1 de abajo                                                                           |
| 4 · Extras y sustituciones      | **En Estook TPV**, no en la app de gestión: «el TPV son ventas»                                         | Salen de M9 y van a M20A, con su escandallo (ver «Lo que sale de M9»)                         |
| 5 · «Ya la sé»                  | **No**: la ficha es para consultarla, no para estudiarla. Y que se pueda hacer por raciones o por tanda | Fuera «ya la sé» y el modo aprendizaje. La tanda, en la pieza 1                               |
| 6 · El QR de la ficha impresa   | **Ninguno**: sin QR. Se imprime, se encuaderna o se descarga                                            | Fuera el QR                                                                                   |
| 7 · Coste teórico y calibración | **A**, con el TPV; y antes, investigar cómo lo hacen los mejores, sin porcentajes inventados            | Diseñado en [su documento](como-detecta-estook-lo-que-se-escapa.md). Se construye con M20     |

**Por qué la 7 va con el TPV, con datos:** en IKATZ hay **21 cierres de caja y solo 1 trae los
platos** (mirado el 17-oct). Sin saber cuántas raciones de cada plato se vendieron, no se puede
saber cuánto se debía gastar.

---

## Lo que entra en M9 · 3

### 1 · Escalar: la receta por ración o por tanda

**Lo que pasa en una cocina.** La mayoría de los platos se piensan **por ración**: un entrecot
lleva 300 g de carne. Pero lo de la casa que se hace en olla —un puchero, unas lentejas, la
salsa de los callos— se cocina **por tandas**: «esta olla lleva 3 kg de garbanzos y sale para
25 raciones». Escribir esa receta dividida por 25 es antinatural y nadie la sigue. Y las **diez
recetas de Estook** (la tortilla, las croquetas, la paella…) **ya vienen escritas así**: la
tortilla para 8, las croquetas para 40.

**Cómo lo hacen los mejores.** La receta tiene **un «rinde»** —una ración o una tanda— y desde
ahí se escala **solo en pantalla y en lo que se imprime, sin cambiar la receta guardada**
([meez](https://intercom.help/getmeez/en/articles/4699925-scaling-your-recipes),
[kitchenCUT](https://support.kitchencut.com/yields)). meez deja escalar también **tocando la
cantidad de un ingrediente** («tengo 3 kg de carrillera»), y kitchenCUT avisa de que **la sal, las
especias y el picante no escalan igual**.

**Lo que se hace** (Richi: A, el 17-oct):

- **Al escribir el escandallo**, de fábrica **1 ración**: para los platos de siempre no cambia nada
  ni se ve nada nuevo. Plegado, **«¿Es una receta de olla?»** abre **«Esta receta es para una
  tanda de __ raciones»**.
  Con tanda, **el escandallo sigue diciendo lo que cuesta una ración**: divide la tanda entre sus
  raciones.
- **En la ficha técnica**, encima de los ingredientes: **«Para [ 1 ] raciones»** con − y +, y
  se puede escribir el número. Si la receta es de tanda, sale **«1 tanda · 25 raciones»** y se
  escala igual, por tandas o por raciones. Las cantidades cambian al momento, en g o en kg
  según el tamaño (como ya hace la app desde mil gramos).
- **Tocar la cantidad de un ingrediente** y escribir lo que tienes («3 kg») escala todo lo
  demás. Es lo más rápido cuando lo que manda es lo que hay en la cámara.
- **Una «i»** que dice en dos líneas: «Escalar no cambia la receta: solo esta pantalla y lo que
  imprimas. La sal, las especias y el picante, ajústalos probando».
- **El PDF y la impresión salen escalados**, con «Para 40 raciones» en el título.
- **El tiempo no se escala**, y las unidades (huevos, panes) se redondean a la media unidad.
- **Quién**: todos los que ven las fichas (cocina y sala). **No se guarda nada**: cerrar la
  ficha la deja como estaba.

**Lo que no es:** **no son las elaboraciones**, que siguen paradas ([0090](decisiones/0090-el-repaso-del-16-oct.md)).
Una elaboración es algo que se usa **dentro de otros platos** y tiene su stock; la tanda es solo
**cómo está escrita la receta de este plato**. Necesita una columna en la receta (cuántas
raciones salen; vacía = 1).

### 2 · «Qué ha cambiado»

**Ejemplo.** El martes llega el albarán con el aceite de oliva a 7,10 €/l (estaba a 6,20).
Toca a 7 platos; la tortilla pasa del 28 al 31 % de coste, y tu objetivo es el 30 %.

- **En Escandallos › Resumen**, un bloque **«Qué ha cambiado»**: los platos cuyo coste se ha
  movido, **ordenados por lo que te cuesta en euros** (no por porcentaje), con el ingrediente que
  lo ha movido y cuántos puntos de margen. De fábrica, **frente a hace 30 días**; se puede
  mirar desde otra fecha.
- **El aviso en la campana**, al jefe de cocina y a quien lleva el local, **solo cuando un plato
  cruza una raya**: pasa de tu objetivo de coste, o empieza a perder dinero en un canal. **Una vez
  por plato y por raya**, no en cada albarán. Y otro cuando vuelve a estar bien, solo en el
  Resumen.
- **Nunca el pasado con precios de hoy** (Manifiesto): lo de hace 30 días se calcula con los
  precios de hace 30 días.

### 3 · Empezar desde una receta de Estook

**Qué es, porque no es lo mismo que la Carta y el escandallo.** Eso ya está hecho: el plato nace
en la Carta y en Escandallos se desgrana a mano. **Esto es un atajo opcional** para no escribir
desde cero: Estook trae **diez recetas clásicas** con sus cantidades. Si desgranas «Tortilla de
patatas» y Estook tiene la suya, te lo ofrece: **«¿Empezar desde la tortilla de Estook? (para 8
raciones)»**. Si dices que sí:

- Copia sus ingredientes y cantidades **a tu escandallo**, como tanda de 8 raciones (pieza 1). La
  de Estook no se toca nunca.
- **Cada ingrediente pregunta cuál de tus productos es** (respuesta B): «Huevo → ¿tus Huevos
  camperos?», con el buscador y **«Crear»** si no lo tienes. Hasta que lo elijas, esa línea no
  cuenta en el coste y el plato dice «falta 1 ingrediente por unir».
- Lo cambias a tu gusto y guardas. Desde ahí, es tuya.

### 4 · Todas las fichas en un PDF

Para **encuadernarlas** (Richi: A): **«Descargar todas»** en Fichas hace un solo PDF con todas las
fichas técnicas, **por secciones de la carta, con un índice y sin euros**.

---

## Lo que sale de M9, y adónde va

| Qué                                | Adónde                                   | Por qué                                                                                      |
| ---------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Extras y sustituciones**         | **Estook TPV, M20A**                     | Richi: la app es de gestión; los extras se configuran donde se vende. El diseño, en el Anexo |
| «Ya la sé» y el modo aprendizaje   | **Fuera**                                | La ficha es para consultarla, no para estudiarla                                             |
| La ficha impresa con QR            | **Fuera**                                | Se imprime, se encuaderna o se descarga en el móvil                                          |
| La hoja de producción con su stock | **Parada**, con las elaboraciones (0090) | Hasta que Richi las pida                                                                     |
| El coste teórico y la calibración  | **M20**, con las ventas plato a plato    | Sin ventas por plato no hay teórico (1 de 21 cierres en IKATZ)                               |
| El borrador de ficha de Fogón      | **M22**                                  | Como ya estaba                                                                               |

**Los extras en Estook TPV, como los quiere Richi y como ya dice el Anexo:** en el TPV, cada plato
de la carta (que el TPV lee de Estook) tiene sus extras. Se eligen **de los ingredientes de su
escandallo** («doble de queso»: gasta queso del almacén) **o de cualquier producto del almacén**,
y existe **el extra libre** —fuera de la receta, con su nombre y su precio—, que cobra pero no
descuenta género porque no se sabe qué es. Los grupos que se repiten («punto de la carne»,
«guarnición») se definen una vez y se ponen en varios platos, con sus opciones obligatorias para
que el cocinero no salga a preguntar. **El precio y el coste siguen viniendo de Estook**: el TPV
no inventa un dato. Se construye con M20A, y la vara de medir es la del Anexo: **una comanda de
cuatro platos en diez toques o menos**.

---

## El coste teórico, los avisos y la calibración

**Van con M20**, y su diseño entero vive en
[`como-detecta-estook-lo-que-se-escapa.md`](como-detecta-estook-lo-que-se-escapa.md): los cuatro
filtros (datos fiables, lo normal de cada producto, no es lo de siempre, que cueste dinero), el
arranque sin datos, la fuga constante con la calibración en tres botones, y la auditoría de la
sencillez. Lo investigado para hacerlo (Apicbase, Restaurant365, MarketMan, meez, y las reglas de
los gráficos de control) está allí.

---

## Las preguntas de la regla 14 y la prueba de la plantilla, para lo que entra

| Pregunta                        | Escalar                                      | «Qué ha cambiado»                                                                                                                                                  | Receta de Estook                                    |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Qué datos usa y de dónde vienen | La receta y su «rinde»                       | Los precios del libro, de hoy y de la fecha elegida                                                                                                                | El catálogo de Estook y tus productos               |
| Quién más se entera             | Nadie: no se guarda                          | La campana del jefe de cocina y de quien lleva el local                                                                                                            | Nadie hasta que guardas                             |
| Qué puede hacer Fogón           | Nada                                         | Explicarlo en una frase (M22)                                                                                                                                      | Proponer qué producto es cuál (M22)                 |
| Qué aprueba una persona         | —                                            | —                                                                                                                                                                  | Cada unión de ingrediente con producto              |
| Permisos                        | Quien ve las fichas                          | Quien ve costes (`dato.coste_de_plato`)                                                                                                                            | Quien edita Escandallos                             |
| Sin internet                    | Necesita señal, como el resto de Escandallos | Necesita señal                                                                                                                                                     | Necesita señal                                      |
| Si se hace dos veces            | Igual                                        | Un aviso por plato y por raya                                                                                                                                      | Cada guardado, al historial; el plato no se duplica |
| Qué queda en la auditoría       | Nada                                         | El aviso                                                                                                                                                           | El guardado, en el historial de la receta           |
| **16 · Trabajo nuevo**          | Ninguno                                      | Ninguno: se lee                                                                                                                                                    | Ninguno: es un atajo opcional                       |
| **17 · Duplica algo**           | No: el PDF es el mismo, escalado             | **Ojo**: el Manifiesto pone en boca de Fogón el mismo mensaje («el aceite ha subido un 12 %…»). Cuando llegue Fogón (M22), **explicará este bloque, no hará otro** | No: copia una vez y la receta es tuya               |
| **18 · Bloquea algo**           | No                                           | No                                                                                                                                                                 | No: se puede escribir desde cero                    |
| **19 · Fácil de usar**          | Una «i»; la tanda, plegada; − y +            | Se lee como una lista                                                                                                                                              | Solo sale si el plato se llama como una de las diez |
| **20 · Avisa con qué hacer**    | No avisa                                     | Solo al cruzar una raya, con el plato y el ingrediente                                                                                                             | No avisa                                            |
| **21 · Con datos a medias**     | Sin «rinde» puesto, es 1 ración              | Sin precio de antes, lo dice                                                                                                                                       | Lo que no está unido no cuenta, y lo dice           |
| **22 · Señala a alguien**       | No                                           | No                                                                                                                                                                 | No                                                  |

---

## Las respuestas de Richi a las cuatro preguntas (17-oct)

1. **Escalar también tocando un ingrediente: A.**
2. **«Descargar todas» las fichas en un PDF: A.**
3. **La regla para avisar: C**, con el estudio que pidió: en
   [`como-detecta-estook-lo-que-se-escapa.md`](como-detecta-estook-lo-que-se-escapa.md), con dos
   preguntas suyas al final.
4. **La calibración: sí, pero sin complicar Estook**: queda como una pregunta de tres botones,
   una sola vez, ante una fuga constante (mismo documento, sección 5).
