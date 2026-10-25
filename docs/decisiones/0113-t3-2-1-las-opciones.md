# 0113 · T3 · 2 · 1 · Las opciones y los extras, lo que se vende a peso y el precio desde el TPV

**Fecha:** 25 de octubre de 2026
**Estado:** construida, en su pull request (`t3-2-las-opciones`), con la migración 0088.
**Sigue:** la [0111](0111-t3-1-la-botonera.md) y el Anexo 10.3, 10.12 y 11.11. Las maquetas de T3 ·
2 ([`docs/maquetas/t3-2-lo-de-cada-producto.html`](../maquetas/t3-2-lo-de-cada-producto.html)), **aprobadas por Richi el 25-oct** («sí… auditalas y mira si tienen sentido… pero sí me gusta»), con
la auditoría que les añadió cinco cosas.
**Cambia:** el plan (T3 · 2 se parte en dos), el Anexo 7.2 y ESTADO.

## 1 · Lo que dijo Richi

| #   | Pregunta                                      | Respuesta                                                                              |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | ¿Te valen las maquetas?                       | **Sí**: «auditalas y mira si tienen sentido y si se suele hacer así… pero sí me gusta» |
| 2   | ¿50 ml por copa y la copa de vino de 150 ml?  | **Sí**                                                                                 |
| 3   | ¿El precio de la copa con el refresco dentro? | **Sí**                                                                                 |

**La auditoría** (en las maquetas): los grupos de opciones que se reutilizan, con obligatorio, mínimo y
máximo, son los «conjuntos de modificadores» de [Square](https://squareup.com/help/us/en/article/5119);
las copas por marca con «¿Con qué?» son los combinados de los TPV de aquí; la caña, la doble y la jarra,
cada una con su botón. Lo que añadió: buscador, «Solo lo que falta», «Mismo precio a todas» y «una que no
está en el almacén» en «Monta tus bebidas»; la dosis propia de una botella; «+ Otro café»; cuántas se
eligen en cada grupo y el aviso al cambiar uno que usan varios platos; y decir qué falta al pedir.

## 2 · Qué deja T3 · 2 · 1

- **Los grupos de opciones**, en la hoja de cada botón (Ajustes del TPV › Productos): «Opciones al
  pedirlo», con un interruptor por grupo, «Cambiar» y «+ Grupo nuevo». Cada grupo tiene su nombre,
  **cuántas se eligen** (obligatoria y una, opcional y una, opcional y varias hasta N) y sus opciones,
  cada una con **lo que suma** y **lo que gasta del almacén**: añade algo, quita un ingrediente,
  cambia uno por otro, o nada (el extra libre). Si lo usan varios platos lo dice, y **«Copiar y cambiar
  solo en este plato»** hace uno para él.
- **Al pedir**: el plato con opciones abre su hoja, una pregunta y un toque cada una. **Si es un solo
  grupo obligatorio de una** (el «¿Con qué?» de una copa), **el toque ya lo apunta**. Si no, «Añadir ·
  13,50» se enciende cuando lo obligatorio está contestado, y si no, dice qué falta. **La API tampoco
  deja pedirlo sin contestar**: «Falta «Guarnición» en «Hamburguesa»».
- **Lo que se vende a peso**: «Se vende a peso» en la hoja del botón. Su precio es el del kilo, y al
  pedirlo se escribe lo que pesa y el precio sale solo (120 g a 120 €/kg, 14,40 €).
- **El precio desde el TPV**, en la hoja del botón, para quien puede cambiar la carta: **es el de la
  carta**, cambia en Estook y queda en su rastro.
- **En la cuenta y en la cocina**, debajo de cada plato, lo elegido y lo que pesó: «Patatas · doble de
  queso», «120 g».

**La base** (migración 0088, con su `.revertir.sql`): `grupo_de_opciones`, `opcion_de_grupo` y
`grupo_del_plato`; `plato.a_peso`; y en `linea_de_cuenta`, `opciones` (lo elegido, congelado, con lo
que gasta) y `peso_gramos`.

**La API**: `los_grupos_de_opciones` y seis órdenes (`guardar_grupo_de_opciones`,
`copiar_grupo_de_opciones`, `quitar_grupo_de_opciones`, `poner_grupos_al_plato`,
`cambiar_precio_desde_el_tpv` y `vender_a_peso`), solo en el TPV y nunca en el móvil de nadie.
`pedir` acepta las opciones y el peso, y los vuelve a mirar; `la_carta_de_la_sala`, `la_mesa` y
`la_cocina` los dicen. La lógica, en `@estook/dominio` (`opciones.ts`).

## 3 · Lo que decidí al construirlo

1. **T3 · 2 se parte en dos** (la regla 2 del plan): **T3 · 2 · 1**, esto; **T3 · 2 · 2**, «Monta tus
   bebidas» (las raciones, las copas con su «¿Con qué?» y los cafés hechos), que va encima, porque las
   copas usan los grupos.
2. **Los grupos van en el plato, no en el botón**: el plato los pregunta venda donde se venda (mañana, la
   carta digital o el reparto). Se montan desde el botón, que es donde se está.
3. **Lo elegido se congela en la línea**, con su nombre, su precio y lo que gasta, como ya se congelaban
   el nombre y el precio del plato. **El precio de la línea ya lo lleva**: todo lo que suma la cuenta
   sigue igual.
4. **El almacén todavía no descuenta lo que se vende en el TPV**: eso llega con el cobro (T7 · M20C), que
   es cuando una venta es venta. Lo que gasta cada opción **queda guardado en cada línea** para entonces.
5. **El precio de una opción es el de la sala.** El de cada canal (el reparto) llega cuando el reparto
   entre en el TPV.
6. **Dos hamburguesas con distinta guarnición son dos líneas**: lo que lleva algo elegido no se suma a
   otra igual.
7. **«¿Cuántas se eligen?» tiene tres formas en la pantalla** (obligatoria y una; opcional y una;
   opcional y varias, hasta N). La API admite también «obligatorias, de 2 a 3», que ningún bar pidió.
8. **Guardar un grupo cambia sus opciones enteras**; lo ya pedido no cambia, porque cada línea guardó las
   suyas.
9. **Una sustitución más barata puede restar** en la API (precio negativo); la pantalla, de momento, solo
   escribe lo que suma.
10. **El precio y «a peso» piden poder cambiar la carta**, además de los Ajustes del TPV: son de la carta.
    Su historial es su rastro.
11. **A peso, en gramos enteros**, de 1 g a 100 kg; las opciones de un plato a peso suman a su precio.
12. **La hoja del grupo se abre encima de la del botón**, y al guardarla se vuelve a la del botón con el
    grupo ya puesto.
13. **«Copiar y cambiar»** llama al grupo nuevo «Guarnición · Entrecot» (el grupo y el plato), y el
    plato pasa a preguntar la copia.
14. **Los platos de un menú no preguntan opciones**: el menú elige el plato, y lo demás va en la nota.

## 4 · Lo que no entra en T3 · 2 · 1

- **«Monta tus bebidas»**, las raciones, las copas y los cafés hechos: T3 · 2 · 2.
- **Que el almacén descuente** lo vendido en el TPV, con sus opciones: con el cobro (T7).
- **La balanza conectada**: con Estook Link (T5).
