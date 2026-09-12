# 0037 · Lo que sale de la cámara dice si se vendió, y el dinero lo cuenta la caja

**Fecha:** 12 de septiembre de 2026
**Estado:** decidido y construido en el repaso de M7 (migración `0034`)

## Lo que dijo Richi

> «Es importante que al quitar algo de inventario quede claro si se ha vendido —al
> precio que está puesto— y cuánto, o si se ha tirado por cualquier motivo y no se
> ha ganado dinero con ello (malo, comida de personal…). Si se pone vendido,
> preguntar si se suma a ganancias. Si dice que sí, avisar de que puede conectar el
> TPV o subir un CSV o fotos de tíquets para hacerlo automáticamente. Necesitamos
> datos para que sea exacto y todo vaya como un reloj suizo.»

## El agujero

Sacar género de la cámara ofrecía **«Gastado o vendido»** como primera opción. Las
dos cosas en el mismo botón. Y no se parecen en nada:

| Qué              | Sale de cámara | Entra dinero | Qué es para el negocio            |
| ---------------- | -------------- | ------------ | --------------------------------- |
| **Vendido**      | sí             | **sí**       | ingreso, con su margen            |
| **Gastado**      | sí             | no           | lo que cuesta lo que vendes       |
| **Tirado**       | sí             | no           | pérdida (merma)                   |
| **Del personal** | sí             | no           | gasto de personal, partida aparte |

Con las dos primeras juntas, Estook **no podía contestar «cuánto he vendido de
esto»** ni «cuánto me ha dejado», que son las dos preguntas de las que cuelga el
margen. Es el mismo fallo que el Manifiesto 28 ya arregló un escalón más abajo —«la
comida del personal no es merma, ni las invitaciones»— y que la
[0026](0026-la-merma-tiene-motivo-y-partida.md) arregló con los motivos: **una nota
no se puede sumar.**

## Cómo lo hacen las que funcionan, y qué se copia

Las aplicaciones de control de costes de hostelería —MarketMan, Apicbase, Nory,
Cost Control— reparten el movimiento de género en cuatro cubos y **ninguna deja que
una salida de almacén cree un ingreso**:

1. **Consumo teórico**, que sale de las ventas por la ficha del plato.
2. **Merma con motivo**, apuntada por quien la rompe.
3. **Traspasos** entre locales.
4. **Recuentos**, que cuadran la diferencia.

Y el ingreso viene de un solo sitio: el TPV, o el cierre de caja. Esa es la
estructura que se copia, y la parte que importa es la que **no** se copia de las
hojas de cálculo de bar: sumar el dinero donde se apunta el género.

## Lo que se decide

### Uno · Tres familias, y se elige dentro de una

Al sacar género se elige entre once porqués, agrupados en tres, y cada grupo dice
lo que significa **antes** de elegir:

- **Se ha vendido** · «Ha entrado dinero por ello. Se cuenta en la caja del día.»
- **Se ha usado** · «No entra dinero. Es lo que cuesta lo que vendes.»
- **No se ha aprovechado** · «Ni se ha vendido ni se ha usado. Se apunta como merma.»

El catálogo vive en el dominio (`packages/dominio/src/salida.ts`) y lo leen la
pantalla y el servidor: un dato, un dueño (regla 6). Los siete motivos de merma no
se duplican: se apuntan del catálogo de la 0028, así que añadir uno nuevo no obliga
a acordarse de dos ficheros.

### Dos · Una venta es una línea propia del libro

`estook.tipo_de_movimiento` gana `venta`. No es `salida` con una nota, por lo mismo
que la merma no lo es. Y no es `consumo`: `consumo` lo produce M20 al explotar la
ficha de un plato vendido —sale harina porque se vendió una pizza— y `venta` es el
género que se vende **tal cual**, que es media barra de un bar.

La línea guarda `ingreso_centimos`: lo que se cobró, **con impuesto**, que es el
único número que quien lo apunta sabe con certeza. Nulo se acepta: se puede vender
algo sin acordarse de a cuánto, y perder el dato de que se vendió por no saber el
importe sería peor.

### Tres · El dinero se cuenta en la caja, y solo ahí

**Esta es la decisión de fondo, y contesta a «¿se suma a ganancias?».**

Sí se suma —pero en la caja del día, no aquí. El dinero de una jornada tiene un
solo dueño, que es el cierre de caja ([0027](0027-la-caja-se-cierra-sin-tpv.md)). Si
una salida de cámara sumara a las ganancias por su cuenta **y** además se metiera el
papel de la caja, el día se contaría dos veces y **no se vería**: el total del mes
saldría mal y todo lo demás parecería correcto. Es el fallo más caro que hay en una
caja, porque no da la cara.

Así que lo vendido **espera**. Al cerrar la caja de esa jornada sale propuesto, con
su nombre y su importe, y se añade de un toque:

> «Se ha vendido esto desde Inventario hoy. Si tu total de arriba sale del TPV o del
> Z, ya está contado: no lo añadas.»

Lo decide una persona, porque es ella quien sabe de dónde sale el total.

### Cuatro · Y se dice cómo dejar de hacerlo a mano

En el momento de apuntar la venta, y sin botones que no hagan nada: «conectando el
TPV, o subiendo el fichero o la foto del cierre, las ventas entran solas». Los dos
caminos ya existen y acaban en la misma tabla (0027); lo que falta es la conexión
del TPV, que es M20, y leer una foto, que es M22.

### Cinco · A cuánto se vende, para lo que se vende tal cual

`producto.precio_de_venta_centimos`, **con impuesto**, que es el precio de la
pizarra. Al revés que el de compra ([0033](0033-los-precios-de-compra-se-guardan-sin-iva.md))
y por el motivo contrario: el IVA de compra se recupera y el de venta se ingresa.

Con él, la ficha contesta lo que deja cada uno:

```
Te entra   2,27 €  · sin el impuesto
Te cuesta  0,45 €
Te queda   1,82 €  (80 % de lo que entra)
```

Y avisa cuando el género se lleva más de un tercio de lo que se cobra, o cuando se
está vendiendo por debajo de coste. La cuenta la hace el dominio (`margen.ts`), que
quita el impuesto antes de restar: **restar el precio de carta menos el coste es
regalarse el IVA como margen**, y es el error más repetido que hay en la hoja de
cálculo de un bar.

Lo que esto **no** es: la carta. Un plato tiene ficha, escandallo y alérgenos, y eso
es M10. Esto es el precio de un producto que se vende sin pasar por ninguna receta.

## La cadena del dato, y dónde está cada eslabón

Richi pidió que «cada dato se compare para que la app lo sepa todo». Esta es la
cadena entera, con lo que hay hoy y lo que falta:

| Eslabón                            | Dónde está hoy                    | Qué falta             |
| ---------------------------------- | --------------------------------- | --------------------- |
| Lo que cuesta el género            | Precio de compra, sin IVA (0033)  | —                     |
| Lo que hay y lo que se gasta       | El libro de movimientos (M6)      | —                     |
| Lo que se pierde, y en qué partida | La merma con motivo (0026)        | —                     |
| Lo que se vende **tal cual**       | **Esta decisión**                 | —                     |
| Lo que se vende **cocinado**       | Las líneas del cierre, como texto | La carta, **M10**     |
| Lo que cuesta cada plato           | —                                 | El escandallo, **M9** |
| Lo que entra cada día              | El cierre de caja, a mano o CSV   | El TPV, **M20**       |
| Leer una foto del Z o de un tíquet | El sitio, apagado con su motivo   | Fogón, **M22**        |
| Descontar lo vendido del almacén   | —                                 | **M20**               |

Lo que hace esta decisión es cerrar el eslabón que faltaba y **dejar los otros
enchufados**: cuando llegue M20, lo que traiga el TPV se guarda en la misma tabla y
ni una pantalla se entera.

## Lo que se descartó, y por qué

**Sumar el ingreso a una cifra de «ganancias» desde Inventario.** Es lo que pedía la
frase tal cual, y es la que rompe la contabilidad del día en cuanto alguien mete
además el Z. Se hace lo que pedía la frase —que el dinero cuente— por el camino que
no puede contar dos veces.

**Apuntar la venta directamente en el cierre, sin preguntar.** Sería correcto los
días que la caja se teclea a mano y falso los días que viene del TPV. Y un apunte
que unas veces vale y otras sobra es peor que uno que siempre pregunta.

**Un campo de texto «¿qué ha pasado?» en vez de una lista cerrada.** Ya se descartó
en la 0026 y por la misma razón: «¿cuánto se me ha ido en caducado este mes?» no se
contesta con un `like`.
