# M9 · Escandallos · el plan

**Escrito el 10 de octubre de 2026**, con M8 y sus repasos en producción y el repaso antes de M9 en su pull request (leído en la base ese día, en solo lectura: 62 migraciones, 107 tablas, la API con 81 y 171). **Las preguntas, sin contestar todavía**: están al final, cada una con su ejemplo y lo que recomiendo.

De dónde sale: M9 en la parte D del [Plan](maestros/Estook-Plan-de-Desarrollo.md), «Escandallos» en el capítulo 13 del [Manifiesto](maestros/Estook-Manifiesto.md), el diseño de Richi de «un plato, tres vistas» ([0049](decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md)) y lo que le pasó M8 ([0078](decisiones/0078-las-respuestas-de-m8.md)).

## Qué es M9, en llano

**Saber lo que cuesta cada plato y cuánto te deja, sin calcular nada a mano.** Hoy Estook sabe lo que cuesta cada producto del almacén. Lo que falta es **qué lleva cada plato**: con eso, el coste del plato sale solo, se mueve solo cuando sube un ingrediente, y la cocina tiene su receta en el móvil sin ver un euro.

| Pieza                     | Qué hace                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| **El plato**              | Un nombre, su precio de venta (la pregunta 1) y su ficha. Renombrarlo no lo separa de nada              |
| **La ficha técnica**      | Lo que lleva (180 g de carne, 1 pan…) y cómo se hace: pasos, tiempo, temperatura, conservación          |
| **Las elaboraciones**     | Una salsa o un caldo con su propia ficha, que se usa dentro de otras (la pregunta 2)                    |
| **El escandallo**         | Se calcula: coste, food cost, margen y precio recomendado. Nada escrito a mano                          |
| **Los alérgenos**         | Salen solos de los ingredientes, con los catorce símbolos oficiales                                     |
| **El modo cocina**        | La ficha a pantalla completa, letra grande, **sin un solo importe**                                     |
| **Qué ha cambiado**       | «El aceite sube un 12 %: afecta a 7 platos, 2 bajan del objetivo, hasta −3,8 puntos de margen»          |
| **Las fichas que faltan** | «38 de 96 platos con ficha»: un plato sin ficha se vende igual, sale marcado                            |
| **Lo que le pasó M8**     | El food cost teórico junto al real, la desviación de los platos y la calibración (la pregunta 3)        |
| **Y lo demás**            | Versiones con comparador, escalar raciones, extras, «ya la sé», la hoja de producción y la ficha con QR |

## Lo que ya hay

Comprobado en producción el 10-oct:

- **El almacén con su coste por unidad de uso** (kilo, litro, unidad), al precio medio ponderado, y **el aprovechamiento** de cada producto: de 10 kg de carne, cuánto queda útil. Es lo que convierte «10 kg a 60 €» en «7,50 € el kilo de verdad».
- **Los alérgenos de cada producto**, los catorce.
- **302 productos y 10 recetas de referencia** en el catálogo de Estook, para empezar una ficha sin teclearla entera.
- **La app Escandallos ya está en la rueda**, con sus cuatro destinos (Resumen · Fichas · Elaboraciones · Análisis) diciendo «llega en M9».
- **El cierre de caja con sus platos**, con el nombre normalizado. En IKATZ, **19 cierres y 10 líneas de platos**: casi siempre se apunta solo el total.
- **La pantalla de Consumo** (M8), con el food cost real, esperando al teórico.

## Lo que ya está decidido, y no se vuelve a preguntar

| Qué                                                                                                       | Dónde            |
| --------------------------------------------------------------------------------------------------------- | ---------------- |
| **Un plato, tres vistas**: la Carta (lo que se vende y a cuánto), la ficha (cómo se hace) y el escandallo | 0049             |
| **Los tres cuelgan del plato por su identificador**, nunca por el nombre                                  | 0049             |
| **El coste de cada ingrediente sale del Almacén**, con su aprovechamiento; a mano solo si no hay compra   | 0049, Plan M9    |
| **Se recalcula solo lo afectado**, y **nunca el pasado con precios de hoy**                               | Manifiesto 13    |
| **Estook calcula; la IA solo propone** coincidencias, y las confirma una persona                          | 0049             |
| **El margen, sobre el precio sin IVA**, y el escandallo, por unidad de venta                              | Plan M9          |
| **La ficha es dato, no texto**, y **un plato sin ficha no bloquea nada**                                  | Plan M9          |
| **Los importes no viajan** a quien no tiene permiso de costes: un cocinero no recibe ni un céntimo        | Plan M9, regla 7 |
| **Elaboraciones anidables**, sin que una pueda llevarse a sí misma por el camino                          | Plan M9          |

## Lo que decido yo, para que lo sepas

Si alguna no te cuadra, dímelo y se cambia.

1. **Se entrega en dos veces.** La primera: platos, fichas, elaboraciones para costear, el escandallo, los alérgenos, el modo cocina, el recálculo, «qué ha cambiado» y las fichas que faltan. La segunda: versiones con comparador, escalar, extras y sustituciones, «ya la sé», la hoja de producción, la ficha impresa con QR y lo de M8 (pregunta 3). Cada una con su pull request.
2. **Quién hace las fichas**: quien lleva el local y el jefe de cocina. **El cocinero las ve en modo cocina**, sin importes, y marca «ya la sé». El camarero ve los alérgenos de cada plato, que los necesita para contestar en sala.
3. **Las cantidades, en la unidad de uso del producto** (g, ml, ud) y **en limpio**: 180 g de carne son 180 g en el plato; el aprovechamiento pone la diferencia en el coste.
4. **Un ingrediente que no está en el almacén se crea desde la ficha** con nombre y unidad, sin precio: el plato sale con «falta el precio de 1 ingrediente» y no se da un coste falso.
5. **Si el mismo producto entra dos veces en una ficha, se suman** y se avisa; no se duplica la línea.
6. **El food cost objetivo** es el que ya tiene el local (Ajustes); por debajo, verde; hasta 3 puntos por encima, ámbar; más, rojo. **El precio recomendado** es el que deja el food cost en el objetivo, redondeado a 0,10 € hacia arriba.
7. **Empezar desde una receta de referencia** copia sus líneas a una ficha tuya, ya unidas a tus productos si los tienes; la del catálogo no se toca nunca.
8. **Un plato que se vende sin ficha** cuenta en dinero y sale en «sin ficha»; el indicador dice qué parte de lo vendido no tiene coste.
9. **El modo cocina** se recorre deslizando, con letra para leer desde el pase; dictar «siguiente» es Fogón (M22).
10. **Escandallos solo lee del Almacén y nunca le escribe.** La Carta (M10) leerá de Escandallos.

## Lo que cuesta · cero

**Nada más al mes.** Todo vive en la base y en la API que ya hay. Las fotos de los pasos, si se ponen, se reducen como las de los productos. **De Richi no hace falta ninguna clave.**

## Lo que no entra

- **El borrador de ficha propuesto por Fogón** y **la traducción al idioma del cocinero**: con Fogón (M22). Hasta entonces, en castellano y empezando desde una receta de referencia.
- **Los canales y sus precios** (sala, terraza, delivery): la Carta, M10.
- **Descontar del almacén lo vendido** plato a plato: con Estook TPV (M20).
- **La ficha con membrete**: M11. Hasta entonces, «Imprimir».

## Las preguntas

### 1 · ¿Dónde nace el plato y su precio, si la Carta llega después (M10)?

**De qué va.** Para saber cuánto te deja un plato hacen falta dos cosas: lo que cuesta (la ficha) y **a cuánto lo vendes**. El precio vive en la Carta (lo decidiste el 25-sep), pero la Carta es el módulo siguiente.

**Un ejemplo.** Haces la ficha de la hamburguesa: cuesta 3,42 €. Si la vendes a 14,50 € (13,18 € sin el 10 % de IVA), su food cost es el 26 % y te deja 9,76 €. Sin el precio, Estook solo puede decir lo primero.

- **A · El plato nace en Escandallos con su precio de sala** (con IVA, como en la carta de papel). Cuando llegue la Carta (M10), ese precio pasa a ser el de sala y se añaden los demás canales. Sigue habiendo un solo dueño de cada dato.
- **B · Sin precio hasta M10**: en M9 cada plato dice lo que cuesta; el margen y el food cost salen con la Carta.

**Recomiendo A**: lo que más vale de M9 es ver el margen, y con B esperarías un módulo entero para verlo. **Lo que decides: A o B.**

### 2 · Las elaboraciones (la salsa de la casa, el caldo), ¿con stock?

**De qué va.** Una elaboración es una receta que se usa dentro de otras: la salsa lleva mayonesa, kétchup y pepinillo, y la hamburguesa lleva 30 g de salsa. Para el **coste** y los **alérgenos** basta con que Estook sepa lo que lleva. Otra cosa es **tenerla en el almacén**: «hay 3 litros de salsa hecha», y que al hacer 5 litros se descuenten sus ingredientes.

**Un ejemplo.** El lunes haces 5 l de salsa: con stock, salen 2 kg de mayonesa del almacén y entran 5 l de salsa, que caducan el jueves. Sin stock, la salsa solo sirve para calcular, y la mayonesa la ves gastada al contar.

- **A · En la primera entrega, solo para costear** (y los alérgenos). **El stock de lo elaborado llega en la segunda**, con la hoja de producción: «hoy hay que hacer 5 l de salsa», y al marcarla hecha entra en el almacén.
- **B · Con stock desde la primera entrega.**
- **C · Solo para costear, y el stock fuera de M9.**

**Recomiendo A**: el coste se necesita ya y el stock tiene sentido junto a la hoja de producción, que es cuando se dice «la he hecho». **Lo que decides: A, B o C.**

### 3 · La desviación de los platos, ¿se enciende ya o con Estook TPV?

**De qué va.** Es lo que M8 dejó para M9: **lo que se debía gastar según lo vendido** frente a **lo que se gastó de verdad**. Para lo primero hace falta saber **cuántas hamburguesas se vendieron**, y hoy eso solo lo sabe el cierre de caja si alguien apunta los platos uno a uno. En IKATZ, de 19 cierres, solo hay 10 líneas de platos: casi siempre se apunta el total.

**Un ejemplo.** Entre dos inventarios se gastaron 14 kg de carne. Con 80 hamburguesas vendidas × 180 g, debían ser 14,4 kg: cuadra. Pero si en la caja solo se apuntaron 20 hamburguesas, Estook diría que **sobran** 10 kg de carne, y no es verdad.

- **A · Se enciende en M9 con lo apuntado en el cierre**, emparejando una vez cada línea de la caja con su plato. Con días sin platos apuntados, lo dice y no da cifras.
- **B · Se construye y se prueba en el servidor, y se enseña sola cuando la caja traiga lo vendido plato a plato** (Estook TPV), igual que elegiste el 9-oct para lo vendido tal cual. Mientras, Consumo enseña **el food cost teórico de cada plato** (lo que debería costar) junto al real del local.
- **C · Las dos**: se enseña con lo apuntado y se mejora sola con el TPV.

**Recomiendo B**: es lo mismo que decidiste para la barra, y una desviación con datos a medias asusta y se deja de mirar. **Lo que decides: A, B o C.**

### 4 · ¿Valor nutricional, o solo alérgenos?

**De qué va.** Lo que la ley obliga a decir en un restaurante son **los alérgenos** (eso entra seguro). Las calorías, grasas o azúcares por plato son un extra: para calcularlas hace falta que **cada producto tenga sus datos por 100 g**, y hoy no los tiene ninguno, ni el catálogo de Estook.

**Un ejemplo.** La hamburguesa: 180 g de carne (250 kcal por 100 g), pan, queso… Con los datos de cada uno, sale «820 kcal». Sin ellos, nada.

- **A · Solo alérgenos en M9**, y la nutrición más adelante, cuando el catálogo de Estook traiga los datos de los productos de siempre.
- **B · Nutrición en la segunda entrega**, con los datos por 100 g escritos en cada producto (opcionales): el plato da la suma y avisa de los ingredientes que no los tienen.

**Recomiendo A**: nadie lo pide hoy, no es obligatorio en sala, y teclear los datos de cada producto es mucho trabajo para un bar. **Lo que decides: A o B.**

### 5 · Las versiones de la ficha, ¿cuándo se guarda una nueva?

**De qué va.** Cada vez que cambia lo que lleva un plato (de 180 g a 200 g de carne), el coste de antes no se toca y nace una versión nueva, para poder comparar y saber qué se vendió con qué receta.

**Un ejemplo.** El jefe de cocina ajusta la hamburguesa tres veces en una tarde mientras prueba. ¿Son tres versiones o una?

- **A · Una versión por día y persona**: lo que cambia una persona en un mismo día es una versión; al día siguiente, otra.
- **B · Cada guardado, una versión.**
- **C · Solo cuando se pulsa «Guardar como versión nueva»**; lo demás corrige la actual.

**Recomiendo A**: guarda la historia sin llenarla de pruebas, y nadie tiene que acordarse de pulsar nada. **Lo que decides: A, B o C.**

## Cómo se comprobará que M9 está terminado

- **Se monta una carta entera sin tocar la base a mano**: platos, fichas y elaboraciones anidadas, y una que se intenta llevar a sí misma se rechaza.
- **Un cocinero abre una ficha y no recibe ningún importe**, ni en la pantalla ni en lo que manda el servidor.
- **Sube un ingrediente y solo se recalcula lo afectado**, con «qué ha cambiado» diciendo cuántos platos y cuántos puntos.
- **Los alérgenos de un plato** son la suma de los de sus ingredientes, también los que vienen de una elaboración.
- **El coste cuadra con una cuenta a mano**, con el aprovechamiento puesto.
- Lo de la pregunta 3, como se decida.
