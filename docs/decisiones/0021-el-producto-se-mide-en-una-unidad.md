# 0021 · El producto se mide en una unidad, y los gramajes son de la ficha técnica

**Fecha:** 9 de septiembre de 2026
**Estado:** decidido y construido en M6½ · segunda tanda

## El problema

El alta de un producto preguntaba, en este orden: cómo se llama, **cómo lo
compras**, **cuánto trae**, **unidad con la que cocinas**, qué porcentaje se
aprovecha, categoría, precio y proveedor.

Richi, mirándolo en el móvil: «preguntas cosas como "cómo lo compras", "cuánto
trae", "unidad con la que cocinas"… no tienen sentido».

Y tenía razón por dos motivos distintos, que conviene separar porque llevan a
soluciones distintas.

**Uno · le hacía hacer cuentas a quien da de alta un producto.** Un saco de harina
de 25 kg obligaba a escribir «Saco de 25 kg», luego «25000», luego elegir «g», y
entender por qué. Tres preguntas y una multiplicación para decir «compro harina, a
tanto el kilo». El Manifiesto dice que el catálogo de referencia existe
precisamente para evitar «el error clásico de confundir la unidad de compra con la
de uso» — y el formulario obligaba a todo el mundo a razonar sobre esa distinción
aunque no le hiciera falta.

**Dos · preguntaba en el sitio equivocado.** «La unidad con la que cocinas» suena a
que ahí se decide cómo se cocina, y no: **cuántos gramos lleva una ración es de la
ficha técnica**, que es donde se dice qué lleva un plato, cuánto cuesta la ración y
a cuánto se vende. Eso es M9. El producto solo tiene que saber en qué se mide y a
cuánto sale.

## Lo decidido

**El alta pregunta tres cosas:** cómo se llama, **en qué se mide** y **lo que
cuesta esa medida**. Si eliges kilos, la casilla de precio dice «lo que te cuesta
el kg». No hay nada que multiplicar.

Y «en qué se mide» va como **cinco pastillas** —`g`, `ml`, `ud`, `kg`, `l`— y no
como un desplegable: son cinco, caben, y verlas todas a la vez es lo que hace que
se entienda la pregunta sin leer la ayuda. Un desplegable de cinco esconde cuatro.

**Debajo, plegado, está «lo compro por envases»**, que es lo que había antes y
sigue haciendo falta: ahí se escribe el envase, cuánto trae, el precio del envase
entero y qué porcentaje se aprovecha, con la cuenta enseñada mientras se escribe.

**Se despliega solo cuando se elige del catálogo**, porque el catálogo **propone un
envase** («Garrafa de 5 l»), y esconderlo obligaría a hacer la cuenta de cabeza a
quien compra garrafas de 8 l. Eso es exactamente el fallo 11 de M6, y no vuelve.

## Lo importante: por debajo es lo mismo

`formato`, `factor` y `unidad_de_uso` siguen siendo lo que el servidor recibe, y la
aritmética del dominio no se entera de que hay dos formas de preguntarlo. En el
modo sencillo el factor es **1** y el formato va vacío, así que:

> coste por unidad de uso = precio ÷ (factor × rendimiento) = precio ÷ rendimiento

es decir, **el precio del kilo es el coste por kilo**. Un solo camino de datos, dos
formas de preguntarlo.

Eso es lo que hace que esta decisión no sea un parche de pantalla: no hay una
segunda manera de guardar un producto, ni una migración, ni un campo nuevo. Lo que
cambia es qué se pregunta y en qué orden.

## Y el aprovechamiento, dentro del pliegue

«Qué porcentaje se aprovecha» es la pregunta que solo tiene sentido para lo que se
limpia o se pela. Preguntársela a un saco de harina es ruido, y el ruido en un
formulario es lo que hace que nadie dé de alta su segundo producto.

Sigue funcionando igual que antes: **solo se manda si alguien lo toca**, y si no va,
el servidor marca el producto «sin verificar» — que es lo que protege del error más
caro del sistema (Auditoría 1.2). Que esté plegado no lo cambia: quien no lo abre no
lo ha verificado, y eso es verdad.

## Lo que esto le deja a M9

Cuando lleguen las fichas técnicas, la ración se escribe ahí: «120 g de harina», y
el coste sale del coste por unidad de uso del producto. **No hay que volver a tocar
el producto**, y no hay que preguntarle a nadie por segunda vez en qué unidad
cocina.

Es la regla que el usuario resumió mejor que el documento: «todo tiene que estar
conectado».
