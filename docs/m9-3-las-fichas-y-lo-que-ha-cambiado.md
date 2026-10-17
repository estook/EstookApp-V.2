# M9 · 3 · Las fichas que se usan, y lo que ha cambiado

> **Estado: plan, sin construir.** Richi contestó las siete preguntas el 17-oct-2026
> ([0092](decisiones/0092-las-respuestas-de-m9-3.md)). Quedan **cuatro preguntas** (al final),
> y **no se escribe código hasta que las conteste**. Es la última entrega de M9
> ([el plan de M9](m9-escandallos.md)); después viene M10.

## Lo que contestó Richi, y lo que significa

| Pregunta                        | Richi, 17-oct                                                                                           | Qué hace Estook                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 · «Qué ha cambiado»           | **B**                                                                                                   | Un bloque en Escandallos › Resumen, y aviso en la campana solo cuando un plato cruza una raya |
| 2 · Empezar desde una receta    | **B**                                                                                                   | Cada ingrediente pregunta cuál de tus productos es; nada se crea solo                         |
| 3 · Escalar                     | Sí, en la ficha técnica: «poner cuántas raciones y que multiplique»                                     | La pieza 1 de abajo                                                                           |
| 4 · Extras y sustituciones      | **En Estook TPV**, no en la app de gestión: «el TPV son ventas»                                         | Salen de M9 y van a M20A, con su escandallo (ver «Lo que sale de M9»)                         |
| 5 · «Ya la sé»                  | **No**: la ficha es para consultarla, no para estudiarla. Y que se pueda hacer por raciones o por tanda | Fuera «ya la sé» y el modo aprendizaje. La tanda, en la pieza 1                               |
| 6 · El QR de la ficha impresa   | **Ninguno**: sin QR. Se imprime, se encuaderna o se descarga                                            | Fuera el QR                                                                                   |
| 7 · Coste teórico y calibración | **A**, con el TPV; y antes, investigar cómo lo hacen los mejores, sin porcentajes inventados            | La propuesta, abajo. Se construye con M20, cuando hay ventas plato a plato                    |

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

**Lo que se propone (pregunta 1, al final):**

- **Al escribir el escandallo**, una línea arriba: **«Esta receta es para: (1 ración) / (una
  tanda de __ raciones)»**. De fábrica, 1 ración: para los platos de siempre no cambia nada.
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

### 4 · Pendiente de Richi: todas las fichas en un PDF

Para **encuadernarlas**, un botón «Descargar todas» que hace un PDF con todas las fichas
técnicas, por secciones de la carta, sin euros. Es la pregunta 2.

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

## El coste teórico y la calibración · la propuesta

**Nada de esto se construye ahora**: va con M20, cuando Estook TPV dé las ventas plato a plato.
Se escribe ya para que el TPV llegue con la decisión tomada (pregunta 3).

### Las dos palabras, en llano

- **Coste teórico**: lo que **debías** gastar en género según lo que vendiste y lo que lleva cada
  plato. 80 raciones de pulpo × 150 g = 12 kg.
- **Lo gastado de verdad**: lo que dicen los inventarios. Había 10 kg, entraron 12, quedan 8: **14
  kg**. Esto ya lo hace Estook (M8).
- **La diferencia** (2 kg, 64 €), quitando lo que sí está explicado (mermas apuntadas, consumo del
  personal), es lo que se escapa: raciones de más, merma sin apuntar, invitaciones, errores al
  contar… o algo peor.
- **Calibrar** es que los números se acerquen a la realidad **sin tapar lo que se escapa**.

### Lo que hacen los mejores (investigado el 17-oct)

1. **Ordenan por dinero, no por porcentaje.** «Un 15 % en perejil es ruido; un 4 % en salmón
   cuesta miles» ([Apicbase](https://get.apicbase.com/food-cost-variance/)). Restaurant365 y
   MarketMan enseñan la diferencia en cantidad y en euros, producto a producto
   ([R365](https://docs.restaurant365.com/docs/food-variance-report),
   [MarketMan](https://www.marketman.com/page/actual-vs-theoretical-food-cost-report)).
2. **La referencia es el propio local**, no una cifra del sector: «tu línea base importa más que
   cualquier referencia» (Apicbase). Las cifras que se publican varían mucho —del 1,5 al 5 % según
   el tipo de local ([meez](https://www.getmeez.com/blog/actual-vs-theoretical-food-costs))—, y
   por eso **no sirven como umbral fijo**.
3. **Primero, que los datos estén bien**: recetas con su aprovechamiento, precios al día, ventas
   bien emparejadas e inventarios bien hechos. Si no, la diferencia mide el error del cálculo, no
   la cocina (meez, Apicbase).
4. **Lo caro se cuenta más a menudo** (Apicbase: cada semana, los quince que más valen). Estook ya
   lo hace con «Toca contar» (M8).
5. **Nadie cambia la receta solo.** Lo que se hace es comprobar el aprovechamiento real en varias
   elaboraciones y corregirlo **si sale mal una y otra vez**, a mano. Ningún sistema de los
   mirados corrige las recetas por su cuenta.

### Las alternativas para avisar

| Opción                                                   | Cómo avisa                                                                                                                                     | Lo bueno                                        | Lo malo                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **A · Un tope fijo**                                     | Cuando la diferencia pasa de un % (el 3 %, el 5 %)                                                                                             | Sencillo; lo hace la mayoría                    | El número es inventado. En un bar pequeño, contar 200 g de más en la cámara ya lo dispara: **falsas alarmas** |
| **B · Lo normal de tu local**                            | Cada producto aprende **su** diferencia de siempre; avisa cuando un cierre se sale de lo normal de ese producto                                | Sin números inventados; se adapta a cada uno    | Necesita historia: **avisa solo desde el tercer inventario** de ese producto                                  |
| **C · B, más dinero, más repetición, más datos limpios** | Lo de B, y además **solo si cuesta dinero de verdad**, **se repite** (o el salto es muy grande) y **los datos de ese periodo están completos** | Casi sin falsas alarmas; dice qué mirar primero | Más difícil de explicar: por eso cada aviso dice **por qué** ha saltado                                       |

### La recomendación: C, así

1. **Ningún aviso con los datos incompletos.** Si en el periodo faltan días de caja, ventas sin
   emparejar o platos sin escandallo, Estook **enseña** la diferencia pero **no avisa**, y dice qué
   falta («3 días sin caja», «el 18 % de lo vendido no tiene escandallo»).
2. **«Aprendiendo» hasta el tercer inventario** de cada producto (ya estaba en el Plan). Antes, se
   ve y no avisa.
3. **Lo normal de cada producto** sale de su propia historia: la diferencia típica de sus últimos
   cierres y cuánto suele moverse. Se usa **la mediana**, que no se deja arrastrar por un mal
   recuento suelto. **Fuera de lo normal** es alejarse de esa diferencia típica **tres veces lo
   que suele moverse**: es la regla clásica del control de calidad (las «tres sigmas» de los
   gráficos de control) y no un porcentaje elegido a ojo. Con ella, un producto que se comporta
   como siempre salta muy de vez en cuando por azar.
4. **Que cueste dinero de verdad**: se ordenan los productos por euros perdidos y **solo avisan los
   que, juntos, explican la mayor parte del dinero del periodo**. El perejil no avisa nunca; el
   salmón, sí.
5. **Que se repita**: avisa si sale de lo normal **dos cierres seguidos**, o **una vez** si el salto
   es enorme (el doble de lo que ya sería «fuera de lo normal»).
6. **Cada aviso dice por qué y qué mirar**: «Pulpo: faltan 2 kg (64 €) en dos inventarios seguidos.
   Lo normal en tu cocina es ±0,5 kg. Mira: las raciones, la merma sin apuntar, el
   aprovechamiento». **Nunca señala a nadie** (como ya hace M8).

**Antes de fijarlo, se mide.** Con los cierres reales de IKATZ y de Pizzeriacazzo (cuando haya
ventas plato a plato) se comprueba cuántos avisos habría dado cada regla, y se ajusta con datos,
no a ojo. Es lo que dice la regla de velocidad: primero se mide.

### Y la calibración: proponer, nunca tocar sola

- **Si un producto sale de más una y otra vez y tiene aprovechamiento** (el pulpo cocido pierde
  agua), Estook **propone corregir su aprovechamiento**: «En tus tres últimos inventarios el pulpo
  rinde un 62 %, no el 70 % que tiene puesto. ¿Lo cambio?». Lo confirma una persona y queda en el
  historial. Así **el coste** del plato pasa a ser el de verdad.
- **Si no es aprovechamiento**, **no se toca la receta**: se avisa de que **se sirve de más**. Subir
  la receta a lo que se sirve **escondería** justo el dinero que se escapa.

### Lo que esto corrige de lo que ya estaba escrito

- **El Plan** decía, en el «Terminado cuando» de M9 (ya no: al pasar esto a M20, la 0092 lo ha quitado a la espera de la pregunta 4), que «un producto que se sirve de más deja de
  saltar tras el tercero» (inventario), y el plan de M8, que «si la cocina sirve un 6 % más de
  pulpo, eso pasa a ser lo que lleva». **Las dos frases harían justo lo que hay que evitar**:
  acostumbrarse a perder. Se propone cambiarlas por lo de arriba (pregunta 4).
- **M8 ya usa dos números fijos**: una diferencia de **menos del 2 %** se da por buena
  (`LO_QUE_CUADRA`) y **avisa desde el 3 %** al cerrar un inventario
  ([0079](decisiones/0079-lo-gastado-y-la-desviacion.md)), solo para lo que se vende tal cual.
  Hoy siguen. **Con M20 se cambian por la misma regla de arriba**: un cálculo, un solo sitio
  (pregunta 4).

---

## Las preguntas de la regla 14, para lo que entra

| Pregunta                        | Escalar                                      | «Qué ha cambiado»                                       | Receta de Estook                                    |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Qué datos usa y de dónde vienen | La receta y su «rinde»                       | Los precios del libro, de hoy y de la fecha elegida     | El catálogo de Estook y tus productos               |
| Quién más se entera             | Nadie: no se guarda                          | La campana del jefe de cocina y de quien lleva el local | Nadie hasta que guardas                             |
| Qué puede hacer Fogón           | Nada                                         | Explicarlo en una frase (M22)                           | Proponer qué producto es cuál (M22)                 |
| Qué aprueba una persona         | —                                            | —                                                       | Cada unión de ingrediente con producto              |
| Permisos                        | Quien ve las fichas                          | Quien ve costes (`dato.coste_de_plato`)                 | Quien edita Escandallos                             |
| Sin internet                    | Necesita señal, como el resto de Escandallos | Necesita señal                                          | Necesita señal                                      |
| Si se hace dos veces            | Igual                                        | Un aviso por plato y por raya                           | Cada guardado, al historial; el plato no se duplica |
| Qué queda en la auditoría       | Nada                                         | El aviso                                                | El guardado, en el historial de la receta           |

---

## Las preguntas que quedan

### 1 · Escalar como se describe arriba, ¿te vale?

**De qué va.** La receta dice si es **por ración** (casi todas) o **por tanda** («la olla sale
para 25»). En la ficha técnica, **«Para [ 1 ] raciones»** con − y +, y tocando un ingrediente
escribes lo que tienes («3 kg de carrillera») y se escala todo. El PDF sale escalado. Nada se
guarda. **El escandallo sigue diciendo lo que cuesta una ración.**

- **A** · Así, entero.
- **B** · Sin lo de tocar un ingrediente: solo raciones y tandas. Más sencillo, pero quien tiene
  «3 kg y ya» tiene que hacer la cuenta él.

**Recomiendo A**: lo de tocar un ingrediente no estorba (no se ve hasta que lo tocas) y en una
cocina es lo que más se usa. **Lo que decides: A o B.**

### 2 · Todas las fichas en un PDF para encuadernar

**De qué va.** Hoy cada ficha técnica tiene su PDF. Para tener **el libro de fichas** en la
cocina, habría que descargarlas una a una.

- **A** · Un botón **«Descargar todas»** en Fichas: un solo PDF, por secciones de la carta, con un
  índice, sin euros.
- **B** · No hace falta: una a una.

**Recomiendo A.** **Lo que decides: A o B.**

### 3 · La regla para avisar de lo que se escapa (para cuando llegue el TPV)

**De qué va.** Lo explicado arriba en «Las alternativas para avisar». Un ejemplo inventado, porque
todavía no hay datos: imagina que el pulpo suele cuadrar con ±0,5 kg. Un mes faltan 2 kg (64 €): con **A** saltaría también el mes que
faltan 300 g de perejil; con **C** solo salta el pulpo, y solo si se repite o si el salto es muy
grande.

- **A** · Un tope fijo (el 3 %, por ejemplo).
- **B** · Lo normal de cada producto, sin más.
- **C** · B, más que cueste dinero, que se repita y que los datos estén completos.

**Recomiendo C**, y medirla con los datos reales antes de encenderla. **Lo que decides: A, B o
C.**

### 4 · Corregir lo escrito: el aprovechamiento se propone, la receta no se toca, y los 2 y 3 % de M8 se cambian

**De qué va.** Lo de «Lo que esto corrige» de arriba. Si el pulpo sale de más todos los meses,
o es que **rinde menos** (se corrige el aprovechamiento, y lo confirmas tú) o es que **se sirve de
más** (se avisa, y la receta no se cambia). Y los dos números fijos de M8 pasan a la misma regla
cuando llegue el TPV.

- **A** · Sí: el Plan (M20) y el plan de M8 lo dicen así.
- **B** · No: volver a lo que estaba escrito («lo que se sirve pasa a ser lo que lleva»).

**Recomiendo A.** Con B, Estook se acostumbraría a perder dinero. **Lo que decides: A o B.**
