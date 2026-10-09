# 0080 · El repaso del 9-oct: menos texto al pedir, Movimientos en tres pestañas, las flechas del informe, el chat con el teclado y dos cuentas que se torcían

**Fecha:** 9 de octubre de 2026
**Estado:** construido el 9-oct, en su pull request. Sin migración ni cambios en la API (sigue en 80 consultas y 171 comandos).
**Cambia:** la tabla de vistas de B5 del [Plan](../maestros/Estook-Plan-de-Desarrollo.md): Movimientos pasa a **Historial · Inventario · Desviación**.

## Lo que pidió Richi, y lo que se hace

1. **«Hay demasiado texto al pedir y abruma. Si hay que meter más, por una "i" en pequeño.»** El pedido nuevo deja a la vista el producto, la cantidad y el precio; **la cuenta de cada línea va en una «i»** (`ConMasInfo`, en `@estook/ui`, para usarla donde haga falta). El aviso azul de cuatro renglones de «No sé qué días reparte» es una línea con su «i»; «Lo demás que le compras…» y «Es un borrador…» van en la «i» del total; el aviso del pedido mínimo solo sale **si no llega**. Y el gasto al día se dice redondeado: «0,29 l al día», no «0,2857» (`conUnidadAproximada`). En la ficha del pedido, lo mismo con el mínimo y dos ayudas más cortas.
2. **«Al escribir en el chat se tapa la caja de texto y se sube hasta tapar los mensajes.»** El chat medía el teclado una vez por aviso, y el iPhone corrige sus medidas después. Ahora **vuelve a mirar a los 50, 150, 300 y 600 ms** y al entrar y salir de un campo, como ya hacía la barra de abajo; y la conversación **se queda pegada abajo** cuando encoge. Sin un iPhone aquí, **se confirma en el suyo**.
3. **«Movimientos tiene demasiadas opciones; entradas, salidas, ventas y ajustes en una pestaña.»** Eran cinco pestañas y una sola pantalla: el libro con otro filtro. Ahora es **Historial**, con **Todo · Entradas · Salidas · Ventas · Ajustes** en una fila de botones arriba (en la dirección, `?tipo=entradas`). «Ajustes» lleva también lo que corrigió un inventario. Las direcciones de antes llevan a la nueva. Se eligió «Historial» y no «Control» porque dice lo que hay: lo que pasó, quién y cuándo.
4. **«En Tu día, Anterior va una semana atrás y Siguiente un día.»** La flecha de atrás iba al periodo **con el que se compara** (el mismo día de la semana anterior). Ahora las dos van al periodo de al lado (`lasFlechasDelInforme`), en el día, la semana y el mes.
5. **La auditoría.** En producción, en solo lectura: el libro cuadra línea a línea (488 movimientos, ninguno descuadrado), cada línea de albarán tiene su entrada, ningún producto en negativo y el reloj late. Y dos arreglos:
   - **Una anulación cuenta como lo que anula.** Un traspaso «A otro local» anulado salía como gastado en el food cost real (su motivo empieza por «Anula…»). Con su prueba, en rojo sin el arreglo.
   - **Un gasto en negativo no es un gasto.** En IKATZ salía «−27,96 € en género»: unas ventas de septiembre anuladas en octubre devolvieron género sin compra. Ahora se dice «No cuadra: queda más de lo que había y entró», con el porqué y el historial a un toque, y sin porcentaje.

## Lo que queda por decidir

**La desviación** (lo que se vende tal cual frente a la caja): Richi no la entiende y duda de que sirva. Se le explica y decide él; hasta entonces, se queda como está.
