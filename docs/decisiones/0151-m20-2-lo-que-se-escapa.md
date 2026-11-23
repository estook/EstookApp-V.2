# 0151 · M20 · 2 · Lo que se escapa

**Fecha:** 22 de noviembre de 2026
**Estado:** construido en `m20-2-lo-que-se-escapa`, sin migración. API sin consultas ni comandos nuevos
(139/371): dos consultas que ya existían dicen más.
**Cambia:** el diseño de [lo que se escapa](../como-detecta-estook-lo-que-se-escapa.md) (0093, 0094), que
pedía aprender «lo normal» de cada producto, una campana y una pregunta de tres botones; y la ficha de M20 · 2
en el Plan y en [m20-ventas-y-consumo](../m20-ventas-y-consumo.md). La maqueta:
[m20-2-lo-que-se-escapa.html](../maquetas/m20-2-lo-que-se-escapa.html).

## 1 · Lo que dijo Richi

Antes de empezar (22-nov), al explicarle qué era M20 · 2: «no quiero sobrecargar la app con info que cuesta
leer». Se le propuso hacerlo en pequeño y dijo «ok, pues hazlo aquí, termina esa entrega»:

- **Sin sección ni pantalla nueva**: va en Almacén › Movimientos › Consumo, que ya existía.
- **Un margen fijo y sensato**, sin aprender nada ni nada que ajustar. Lo de siempre: «esto no es un policía».
- **Nada por canal**, **ni la pregunta de los tres botones**, **ni campana**.
- **Poco texto**: el porqué, plegado.
- «Tu carta en cuatro» (estrellas, caballos, puzzles y perros) **ya existía** (0142) y no se toca.

## 2 · Lo que se ve

**El food cost, con dos cifras.** La tarjeta de siempre, con Estook TPV, pone junto al real **el de tus
escandallos**: lo que costó lo vendido según sus escandallos, con el coste que tenía al venderse, del mismo
periodo y sin IVA. Debajo, una barra y una frase:

- Hasta **3 puntos** de diferencia, por arriba o por abajo: «Cuadra con tus escandallos».
- Más, por arriba: «3,5 puntos por encima: 476,62 € de más. Es lo que se tira y lo que se escapa».
- Más, por abajo: «Tus escandallos piden más de lo que se gasta, o entró género sin apuntar».
- En «Cómo sale», cada cifra: el coste, lo vendido con escandallo, lo vendido sin él (que no cuenta) y la
  resta en euros.

**Lo que se escapa.** Una tarjeta debajo, entre los dos últimos inventarios: **como mucho los tres productos**
que más dinero se llevan, con lo que falta, lo que tenía que salir y el porcentaje. «Por qué puede ser»,
plegado: raciones más grandes, comida del personal o invitaciones sin apuntar, algo tirado sin apuntar, un error
al contar o al recibir. **Nunca dice quién.** Si no hay nada: «Todo dentro del margen». Si se vendieron platos
sin escandallo: cuáles, y «Ir a Escandallos». Si solo hay un inventario: «Falta un inventario».

**Lo gastado de verdad**, la tabla de siempre, va plegada debajo cuando sale lo que se escapa: es el detalle.

Sin Estook TPV, Consumo se queda exactamente como estaba.

## 3 · La cuenta, en una línea

**Lo que se escapa de un producto = lo gastado de verdad − lo que el libro sabe por qué salió.** Lo gastado,
entre dos inventarios: había + entró − queda. Lo que el libro sabe: lo vendido (que ya resta cada cobro, 0149),
las mermas y lo sacado a mano. Es lo mismo que tuvo que ajustar el inventario, con el signo cambiado: **no es
una cuenta nueva**, se lee la que había. Y como el aprovechamiento ya no existe (0150), 100 g en el escandallo
son 100 g que tenían que salir.

**El margen, fijo:** un producto se enseña solo si falta más del **5 %** de lo que tenía que salir **y** vale
**5 € o más**. Faltar 30 g de perejil no es nada; lo que sobra no se enseña nunca. Las constantes viven en un
solo sitio (`packages/dominio/src/desviacion.ts`) y se cambian ahí y aquí si el uso dice que se quedan cortas o
largas.

## 4 · Qué se vigila y qué no

- **Solo lo que vende el TPV**: un producto entra si alguna venta lo restó entre los dos inventarios. La lejía o
  las servilletas no, porque ninguna venta las resta y todo lo gastado saldría «falta».
- **Solo desde que el TPV resta**: el primer inventario tiene que ser posterior a la primera venta que restó. Antes,
  las ventas no están en el libro.
- **Con datos a medias, no** (la A de la 0094): si entre los dos inventarios se vendió algún plato sin
  escandallo, ese periodo no se vigila, y se dice qué platos fueron.
- **Lo que ya resta Estook TPV no se compara con la caja apuntada** (lo de M8 para lo que se vende tal cual):
  restarlo dos veces daría «sobra» lo que se vendió. El aviso de M8 al cerrar un inventario sigue para quien
  vende sin Estook TPV.

## 5 · Lo que no se hace, y por qué

- **«Lo normal» aprendido de cada producto** (la mediana de ocho periodos y las reglas de los gráficos de
  control): Richi pidió un margen fijo. Si con el uso salen de más o de menos, se mide y se decide por escrito.
- **La campana**: nada avisa; se ve en Consumo, quien cierra inventarios. Si con el uso hace falta, se añade con
  su decisión.
- **La pregunta de tres botones** (la fuga constante): sin ella. Lo que se tira al limpiar ya tiene su merma
  (0150).
- **Por canal**: no.
- **`la_desviacion_de_los_platos`**, la consulta que lo recalculaba con la caja apuntada y nunca llegó a
  pantalla, se queda por el contrato de la API y se quita en una entrega de después.

## 6 · Quién ve qué

- **Lo que se escapa**: quien cierra inventarios. Los euros, solo quien ve precios de compra; sin ellos, las
  cantidades y el porcentaje.
- **El food cost de tus escandallos**: quien ve el food cost real (ventas y precios de compra) **y** lo que
  cuesta un plato. Si solo ves unas zonas, no sale: el real sería de tus zonas y el de los escandallos, de todo
  el local.

## 7 · Cómo está hecho

- **Dominio** (`desviacion.ts`): `loQueSeEscapa`, `seSaleDelMargen` y `laBrechaDelFoodCost`, con las cifras de
  la maqueta en `lo-que-se-escapa.prueba.ts`.
- **Servidor**: `loGastadoDeVerdad` lee también lo que restó el TPV, lo vendido sin escandallo entre los dos
  conteos y si el primero fue con el TPV restando; `la_desviacion` devuelve `seEscapa`, y `el_food_cost_real`,
  `escandallos`. Los dos campos son nuevos y opcionales: la app de antes los ignora.
- **La prueba contra la base** (`lo-que-se-escapa.prueba.ts`) vende en Estook TPV, cuenta dos veces, cierra la
  caja y comprueba al céntimo lo que sale, también para quien no ve precios.
- **Sin migración**: todo sale de `linea_bajada` (0121) y del libro.
- **Un caso que se sabe**: si al contar quedaba una venta en la cola de M20 · 1 sin restar, ese producto puede
  salir de más. La cola se vacía en el siguiente cobro y `bd:comprobar-api` avisa si algo lleva más de una hora.

## 8 · Lo que decidió la IA

Richi dio el qué (margen fijo, en Consumo, poco texto, sin campana ni pregunta ni canal). Lo demás, para que lo
sepa y cambie lo que no le cuadre:

- **Las cifras del margen**: el 5 % y los 5 € de cada producto, y los 3 puntos del food cost. El sector habla de
  un 1,5 a un 5 % según el local; se eligió el lado generoso, porque no es un policía.
- **Como mucho tres productos a la vista**, el que más dinero se lleva primero, y «y N más» si hay más.
- **Lo que sobra no se enseña**: no es dinero que se va. El food cost sí dice si se gasta menos de lo que piden
  los escandallos, porque eso apunta a un escandallo mal hecho.
- **Lo que vende Estook TPV deja de compararse con la caja apuntada** de M8, para no restarlo dos veces.
- **La tabla «Lo gastado de verdad» va plegada** cuando sale lo que se escapa, con «Ver» para abrirla.
- **El food cost de tus escandallos no sale a quien solo ve unas zonas**, ni a quien no ve lo que cuesta un
  plato.
