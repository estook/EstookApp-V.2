# 0006 · El motor fiscal

**Fecha:** 1 de septiembre de 2026
**Módulo:** M2
**Estado:** aceptada

## El principio

**Un producto no tiene un tipo impositivo. Lo tiene la operación.**

El mismo botellín de cerveza lleva un impuesto servido en barra y otro vendido en
caja para llevar de una tienda. Ninguno de los dos está escrito en el producto:
sale de cruzar territorio, régimen, naturaleza, modo de consumo, actividad,
clasificación fiscal del producto y fecha de devengo.

## Lo que el motor no hace, a propósito

**No prorratea el impuesto de los ingredientes de una receta.** Una hamburguesa no
tributa por la media ponderada del pan, la carne y el queso: tributa como lo que
es, un servicio de restauración.

La receta sirve para ingredientes, cantidades, costes, food cost, margen e
inventario. La **fiscalidad de las compras** y la **de las ventas** son dos mundos
separados, y mezclarlos es el error que este motor existe para impedir.

## Las decisiones de diseño

### Dos ejes, no una lista de operaciones

En vez de una lista plana (servicio, para llevar, venta de bien, reparto), dos
preguntas independientes:

| Eje                 | Valores                                     | Qué es                                      |
| ------------------- | ------------------------------------------- | ------------------------------------------- |
| **Naturaleza**      | prestación de servicios · entrega de bienes | La distinción **jurídica**. Es la que manda |
| **Modo de consumo** | en el local · para llevar · reparto         | El **hecho**. Describe lo que pasó          |

Con esto, «para llevar» **no puede decidir por sí solo** el impuesto, que era el
riesgo que Richi señaló. Puede ser servicio o entrega, y quien lo dice es la
naturaleza.

### Sin campo de prioridad

La propuesta inicial tenía a la vez «especificidad» y «prioridad». Son dos
mecanismos para lo mismo, y con veinte reglas nadie sabría cuál manda.

**La especificidad se calcula sola**: cuantas más casillas concretas llena una
regla, antes gana. Si dos empatan, ambigüedad explícita. Si algún día hace falta
una excepción, se añade una regla más específica, que se entiende leyéndola.

### Tres resultados, nunca una suposición

`resuelto` · `ambiguo` (con las candidatas nombradas) · `sin_regla`.

Elegir la primera de la lista cuando hay empate convertiría un error de
configuración en un cobro mal calculado que nadie vería.

### La fecha que manda es la del devengo, no la de la jornada

Estook tiene dos fechas para el mismo instante: la del reloj y la de la jornada,
porque las copas de las 02:30 del sábado son de la jornada del viernes.

**Para el impuesto manda el instante real.** Una cerveza servida a las 02:00 del 1
de octubre tributa con el tipo del 1 de octubre, aunque el cierre la agrupe en la
jornada del 30 de septiembre. Se calcula con `fechaEnElLocal()`, nunca con
`jornadaDe()`.

### El pasado no se recalcula, y lo impone la base de datos

Una regla fiscal no se reescribe ni se borra. Solo se puede desactivar o cerrar su
vigencia, y **cerrarla solo hacia delante**. Cambiar un tipo es crear una versión
nueva. Cada alta y cada cambio deja línea en la auditoría, con el antes y el
después, y esa auditoría tampoco se puede tocar.

### El desglose

1. Agrupar las líneas por tratamiento fiscal (régimen + tipo).
2. Sumar los importes del grupo, sin redondear por el camino.
3. Calcular el impuesto **sobre el total del grupo**, no línea a línea.
4. Redondear una sola vez, al final de cada grupo.
5. Nunca mezclar tipos distintos.

Y una garantía que el ejemplo de mano no contempla: **con impuesto incluido, la
base más la cuota dan exactamente lo que paga el cliente**, porque la cuota se
saca restando. Si se calcularan por separado podrían no sumar el total del ticket.

Los precios de una carta llevan el impuesto dentro; una factura a otra empresa lo
lleva aparte. Cada local declara cuál usa.

## Los huecos, y por qué siguen siendo huecos

Solo se siembra lo que se puede justificar con una fuente. Donde no hay certeza
**no se pone un número**: el motor devuelve «sin regla» y para.

Richi investigó los dos huecos el 1 de septiembre de 2026, y su conclusión
**confirma** que dejarlos era lo correcto:

> **Canarias · entregas de bienes.** Se aplica el IGIC. El tipo general es el 7 %,
> pero existen otros según el bien u operación, incluido el 0 % y tipos reducidos
> o incrementados. Estook debe determinar el IGIC según el producto y la normativa
> vigente, **no aplicar automáticamente el 7 %**.
>
> **Ceuta y Melilla · entregas de bienes.** No se aplica IVA, sino IPSI. Los tipos
> dependen de la naturaleza del bien y de la operación, por lo que hay que usar la
> tarifa correspondiente, **sin establecer un porcentaje único**.

O sea: no es que falte el dato, es que **no existe un dato único**. Hacen falta
tantas reglas como categorías distinga cada tarifa, y eso es trabajo de leer las
tarifas de Canarias, Ceuta y Melilla producto a producto.

**Cuando aparezcan, se añaden como filas nuevas. No hay que tocar una línea de
código**, que es justo para lo que se diseñó así.

Mientras tanto, un local de esos territorios que intente vender como entrega de
bienes recibirá «sin regla», que es una parada honesta. Un hueco se ve y se
arregla; un tipo inventado se cobra mal durante años sin que nadie lo note.

## Lo que queda para otros módulos

El motor está cerrado. Lo que falta no es del motor, es de tablas que aún no
existen:

| Qué                                                | Módulo |
| -------------------------------------------------- | ------ |
| El producto se cuelga de una clasificación fiscal  | M6     |
| Los precios por canal, con o sin impuesto incluido | M10    |
| La venta guarda su copia fiscal                    | M20    |
| El cierre guarda su resumen por tipo               | M16    |

La forma de la copia fiscal ya está definida y probada (`CopiaFiscal`): lleva
regla, versión, régimen, tipo, vigencia, referencia legal y fecha de devengo, que
es suficiente para reconstruir la operación dentro de cinco años aunque la regla
ya no exista.
