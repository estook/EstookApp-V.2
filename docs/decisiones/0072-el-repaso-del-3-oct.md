# 0072 · El repaso del 3-oct: sacar más de lo que hay se confirma, lo mal tecleado se anula, lo agotado no «se agota» y el logo lleva al Panel

**Fecha:** 3 de octubre de 2026
**Estado:** construido, con la migración `0055`.
**Cambia:** el libro de movimientos (M6, regla 8) gana **anular**, que no borra; Almacén → la ficha del producto y «Ha salido género»; la barra de arriba del móvil.

## Lo que vio Richi

1. **Bajo mínimos:** con un producto a 0 decía «se agota hoy a las 14:30». «Ya está agotado: al llegar a 0 solo avisa que se ha acabado.»
2. **El logo o el nombre del local, arriba, que lleven al Panel**: «es más rápido para el móvil».
3. **El atún de IKATZ, en negativo y con el precio «loco»**: «mira eso y arréglalo, es hiper importante».

## Qué pasó con el atún

Leído en producción, sin tocar nada: Santi apuntó el 30-sep una **venta de 2.000.000 g** (2 toneladas) donde había **6.602 g**. Tenía elegido «por Kilo» y escribió 2000. Nada le preguntó.

- **El precio medio estaba bien** (25,97 € el kilo, el del catálogo). Lo que se volvía loco era lo que se multiplica por la cantidad: la ficha decía que el atún «valía» unos **−51.800 €**.
- **Y no se podía deshacer.** «¿No cuadra?» devolvía lo que hay a su sitio, pero las dos toneladas seguían contando como **vendidas**, y en **lo que se gasta al día**: cuándo se agota y el **pedido sugerido** (que habría propuesto cientos de kilos) miran cuatro semanas atrás.

## Lo que se ha hecho

### Sacar más de lo que hay, solo confirmándolo

El negativo se sigue permitiendo («si el sistema dice que no queda, deja de creerse el sistema», Manifiesto 28), pero **no de un descuido**. Al apuntar una salida mayor de lo que hay, «Ha salido género» dice **cuánto hay y en cuánto quedaría**, y el botón no se activa hasta «Sí, ha salido eso». Cambiar el número pide confirmarlo otra vez. **El servidor también lo exige** (`aunque_no_conste`): sin él, devuelve `no_consta_tanto` con lo que hay, y la hoja lo enseña.

### Anular un movimiento mal tecleado

**No borra nada:** el libro solo se añade (regla 8). Anular apunta **una línea más, del mismo tipo y al revés**, que dice a cuál anula, con quién y por qué. Lo que hay vuelve a su sitio por el camino de siempre, y **las dos líneas dejan de contar** en lo vendido, lo gastado, las mermas, las compras, el cierre de caja, los objetivos, las previsiones y el pedido sugerido: todas esas cuentas leen ahora la vista `movimiento_que_cuenta`. En la ficha, la anulada sale **tachada** con «Anulado», y la otra con «Anula».

Se anula desde **la ficha del producto → Últimos movimientos → «Anular»**, con el porqué obligatorio.

### En negativo no vale dinero negativo

Lo que está en negativo vale **0 €** en la ficha y en la lista, como ya pasaba en el total de la cámara.

### Lo agotado no «se agota»

Con cero o en negativo ya no hay previsión: la etiqueta dice **«No queda nada»** o **«En negativo»**, y nada más.

### El logo y el nombre del local llevan al Panel

En la barra de arriba del móvil. Con varios locales, **el logo** lleva al Panel y el nombre sigue siendo el selector para cambiar de local. En el ordenador ya lo hacía el logo de Estook.

## Lo que decidí al construirlo, y por qué

1. **Qué se puede anular:** entradas, salidas, ventas y mermas **apuntadas a mano o al dar de alta**, **sin lote**, de los **últimos 31 días**, y **una vez**. Lo que llegó con un albarán o una factura se corrige en Compras; un ajuste o un recuento, con otro «¿No cuadra?»; y lo que entró con lote, desde el lote. La pantalla enseña «Anular» solo donde sirve, con la misma regla que el servidor.
2. **Una merma no se confirma: no se puede.** Desde el 23-sep una merma nunca tira más de lo que hay (`mas_de_lo_que_hay`). Si la salida es una merma y pasa de lo que hay, la hoja lo dice en rojo y no ofrece «Sí, ha salido eso»: lo que se tira de más es que antes no se apuntó lo que llegó.
3. **Anular una entrada no recalcula el precio medio**: se queda el que había. Volver a calcularlo pediría reescribir todas las líneas de después, y el libro no se reescribe. Si cuadra mal, el siguiente albarán lo arregla.
4. **«Volver al Panel» y no «Ir al Panel»** en el botón del logo: la rueda de apps ya tiene un «Ir al Panel», y dos con el mismo nombre se confunden (también para quien usa lector de pantalla).

## Lo que hay que hacer en IKATZ, con la app

Con esto en producción, en **Almacén → Productos → Atún en aceite → Últimos movimientos**, la venta del 30-sep lleva «Anular». Los otros tres productos en negativo (chuletón, leche y Fanta) son pequeños: se miran uno a uno y se anula o se cuadra lo que fuera de prueba.
