# 0088 · Vincular todo el Almacén, y el historial de la receta que solo crece

**Fecha:** 16 de octubre de 2026
**Estado:** construido en la rama `el-almacen-entero-y-el-historial`, en su pull request. Hay que fusionar, migrar (la `0070`) y desplegar la API.
**Cambia:** el punto 3 de «Lo que decido yo» de la [0087](0087-fichas-y-escandallos.md).

Richi, el 16-oct, con M9 · 2 recién migrada y desplegada: **«hay fallos, no encuentra cosas en el almacén»**, y `bd:comprobar-api` acabó con un **MAL**: «y el historial de una receta no se puede cambiar, solo crece».

## Lo que pasaba

| Qué                      | Por qué                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **No encuentra lo suyo** | «Desde el almacén» y «Vincular» **solo enseñaban lo que va por unidades**. En el Almacén de verdad el entrecot (pieza de 300 g), la dorada y la lubina enteras, el helado o las croquetas **van en gramos o mililitros**, igual que en el catálogo de serie. Justo los ejemplos de Richi no salían                             |
| **El MAL del historial** | La 0006 da a **toda tabla nueva** de `estook` leer, añadir, cambiar y borrar para la API. La 0069 escribió un `grant` más corto, pero **un `grant` suma, no quita**: la API podía cambiar y borrar el historial. La seguridad por filas lo paraba, pero era una barrera y no dos. Las pruebas no lo veían porque no lo miraban |

## Lo que queda

1. **Sale todo el Almacén**, con lo que es («Carnes · en g»). **Lo que va por unidades se vincula de un toque** (la lata, la botella), como antes. **Lo que va en gramos o mililitros pregunta «Cada ración lleva…»** (300 g, 0,35 kg, 50 ml), y sin eso no se añade: no habría coste ni se sabría qué se gasta.
2. **Vincular sigue siendo la ficha entera**, ahora «un producto y su cantidad». En la Carta y en la ficha se lee **«Vinculado a Entrecot de ternera · 300 g»**; con una unidad, solo el nombre.
3. **Que se vende tal cual lo dice la receta** (`tal_cual`, en la 0070), no su forma. Con cualquier cantidad, «una línea de producto» ya no basta: un pan tostado («Pan, 1 ud» y «tostar») es una ficha, no algo que se vende como está en el Almacén. Los vínculos que ya había se marcan solos al migrar. Si una ficha vinculada se edita y pasa a llevar más cosas, deja de estar vinculada.
4. **La 0070 quita a la API** cambiar y borrar el historial, y borrar una ficha o una elaboración (se archivan): como la 0023 con el libro de movimientos, se quita todo y se da justo lo que hace falta.

## Lo que decidí al arreglarlo

1. Que la ración se escriba **en la unidad pequeña de su familia** (g o ml), y se pueda cambiar a kg o l tocándola, como en el editor de la ficha.
2. Que **«Desde el almacén» no cree nada a medias**: si a uno le falta la ración, el botón no se enciende, y si llegara sin ella, no se crea ni el plato.
3. Que `bd:comprobar-api` mire **lo que la API tiene**, no lo que la migración escribió, y que también mire que una ficha o una elaboración no se borren.

## Lo que no se hace, y por qué

- **Repasar los permisos de todas las tablas** creadas después de la 0006 con un `grant` corto (hay unas veinte): la seguridad por filas las protege y la API no lanza esos `update` ni `delete`, pero merece **una prueba que lo mire en todas a la vez**. Va aparte.
