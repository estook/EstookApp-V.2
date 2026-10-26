# 0116 · T4 · 1 · La cocina: la pantalla de cocina, sin PIN, y lo que la sala le dice

**Fecha:** 26 de octubre de 2026
**Estado:** construida, en su pull request (`t4-1-la-cocina`, después de la #140), con la migración 0090.
**Sigue:** la [0106](0106-estook-tpv-la-sala-y-la-cocina.md), la [0115](0115-cada-aparato-a-lo-suyo.md)
y las maquetas de T4, 2.ª versión
([`docs/maquetas/t4-la-cocina-y-la-barra.html`](../maquetas/t4-la-cocina-y-la-barra.html)), que Richi dio
por buenas el 26-oct con lo acabado en su pestaña.
**Cambia:** el Anexo 3.2, 3.4, 3.7 y 11.13, el plan (T4 en dos) y ESTADO.

## 1 · Lo que dijo Richi

De la 1.ª versión de las maquetas (25-oct): **tachar y destachar sin PIN ni nada**; la cocina **no
confirma NADA** («van rápido y ajetreados, no pueden ponerse a dar clics»): solo toques en los platos que
salen y, si acaso, **un botón para llamar al camarero**; lo que ya salió, a la vista con un color y,
pasados unos 40 minutos, **plegado** con la mesa y una flecha; **las fichas técnicas, fuera del servicio**
(en Estook); la pantalla de cocina **no pide PIN y jamás cierra sesión**; y **el sonido, importante: que
suene bien y siempre**.

De la 2.ª (26-oct): **lo que ya salió no se junta con los tickets nuevos: otra pestaña** («si se vende
mucho se peta»). Con eso, adelante.

## 2 · Qué deja

- **La pantalla de cocina**, una función nueva al vincular («Pantalla de cocina»): se vincula una vez,
  **entra sin PIN** y se queda encendida, sin que la pantalla se apague sola.
- **Dos pestañas: En marcha y Acabados.** En marcha, cada mesa en su tarjeta con **el ticket entero**: el
  1.º en marcha y el 2.º en espera, apagado; lo que tiene prisa y lo que va tarde, arriba; «NUEVO»,
  «ANULADO», «CAMBIO» y «VUELVE»; la nota y lo elegido de cada plato. **Ni un euro**, tampoco en la
  respuesta del servidor.
- **Un toque tacha, otro destacha**, siempre, sin PIN ni margen. Al tachar lo marchado, «Fuera lo
  marchado · esperando a que marchen»; al marcharlo la sala, **«¡MARCHA EL 2.º!»**; y al tachar el
  último, **la mesa pasa sola a Acabados**: lo de los últimos 40 minutos a la vista, lo de antes plegado.
- **El color del tiempo**: verde, ámbar a los 10 minutos y rojo a los 20, que se cambian en la caja
  (Ajustes del TPV › Cocina y barra), con el sonido y «Probar el sonido».
- **Suena**: dos toques al entrar una mesa, tres hacia arriba al marchar, y uno fuerte con algo anulado o
  «tienen prisa». Si el navegador no deja sonar, lo dice en grande, y el primer toque lo arregla.
- **El teclado de cocina**: la tecla de cada tarjeta (1 a 9) tacha su siguiente plato.
- **«Llamar a Lucía»**: a la sala le sale **«La cocina te llama · Mesa 6»**, arriba del plano o flotando
  dentro de una mesa, y al camarero de la mesa le vibra el móvil, hasta que alguien dice **«Ya voy»**.
- **«Tienen prisa»**, en las opciones de la mesa: la tarjeta sube arriba en cocina, con su franja.

**La base** (migración 0090, con su `.revertir.sql`): **la pantalla del local**, que la API declara después
de mirar su llave y que la base reconoce **con el permiso de cocinar y ningún otro**
(`es_la_pantalla_del_local`, en `puede_ver` y `puede_editar`); los disparadores de la sala le aplican las
reglas de un cocinero (no marcha ni quita); lee las mesas de su local, el nombre de pila de quien lleva
cada una y los minutos de su cocina, y apunta en el rastro lo que hace. En la cuenta, `con_prisa` y
`cocina_llama_en`; en el local, los minutos y el sonido.

**La API**: cuatro órdenes de la pantalla, sin sesión y con su llave (`la_pantalla_de_cocina`,
`tachar_en_la_pantalla`, `destachar_en_la_pantalla` y `llamar_al_camarero`); dos de la sala
(`cambiar_la_prisa` y `ya_voy`); y los ajustes (`la_cocina_y_la_barra` y
`guardar_la_cocina_y_la_barra`), solo en la caja. Con esto, **113 consultas y 302 comandos**.

## 3 · Lo que decidí al construirlo

1. **T4 se parte en dos**: T4 · 1, la cocina; **T4 · 2, la barra y la alergia de la mesa** (en la sala, al
   pedir, y en la cocina, para verla) y la hora en el ✓ de la cuenta.
2. **La pantalla no tiene sesión, vale por su llave**, como el aparato para fichar (0068). Para la base es
   «la pantalla de este local», solo dentro de esa petición y solo después de mirar la llave. **Leer es un
   comando**: la llave va en el cuerpo, nunca en la dirección.
3. **Su permiso es uno**: cocinar. Ve las mesas del servicio, no los productos, ni la carta, ni el rastro.
   **Del rastro solo puede leer lo que apunta ella en esa misma petición**, que es lo que hace falta para
   apuntarlo.
4. **«Todo fuera» no sale en la pantalla**: Richi no quiere nada que parezca confirmar. La orden sigue en
   la API para la cocina con sesión.
5. **Sin «Lo que llevamos hoy» ni afinar los minutos por plato** por ahora: en el servicio, lo menos posible.
   Se ponen cuando un local lo pida.
6. **«Tienen prisa» va primero**, delante de lo que va tarde.
7. **El sonido se hace en el propio navegador**, sin ficheros. Al encender no suena lo que ya hay: solo
   lo que llega después.
8. **Sin el aviso al segundo, la pantalla pregunta cada 5 segundos; con él, cada 30**, por si se pierde un
   aviso. Preguntar más gastaría plan de Supabase.
9. **«Llamada a las 21:33»** se queda en la tarjeta hasta que la sala dice «Ya voy»; llamar otra vez deja
   la hora nueva.
10. **Delivery no se enseña** hasta que haya pedidos de reparto en el TPV (T7): no se enseña vacío.

## 4 · Lo que no entra en T4 · 1

- **La pantalla de barra, la alergia de la mesa y la hora en el ✓ de la cuenta**: T4 · 2, lo siguiente.
- **El papel** (la comanda impresa): con la caja para Windows (T5), si Richi dice que sí.
