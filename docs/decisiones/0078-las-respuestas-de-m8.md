# 0078 · Las respuestas de M8: los platos esperan a sus fichas, contar y cerrar son dos pasos, el mínimo se propone y la foto de la merma es si quieres

**Fecha:** 8 de octubre de 2026
**Estado:** decidido por Richi. **La primera entrega, construida el 8-oct** con la migración `0060` (lo que decidí al construirla, al final). La segunda, pendiente.
**Cambia:** M8 y M9 en el [Plan](../maestros/Estook-Plan-de-Desarrollo.md), y sus vistas (B5): Productos gana «Valor». El plan, en [`m8-inventario-mermas-y-desviacion.md`](../m8-inventario-mermas-y-desviacion.md).

## Lo que contestó Richi

Las cuatro preguntas del plan, el mismo 8-oct, las cuatro como se recomendaban:

1. **La desviación de los platos necesita sus fichas, que son M9.** **A · M8 ahora con todo lo que no necesita fichas**, y la desviación de lo que se vende tal cual. La de los platos, la calibración y el food cost teórico, con M9.
2. **¿Quién cuenta y quién cierra?** **A · Cuenta cualquiera que lleve el almacén y cierra quien tiene el permiso.** Y añadió: «si hay algo más óptimo, hazlo como lo hagan los mejores».
3. **El mínimo, ¿lo calcula Estook?** **A · Lo calcula y lo propone**; el que se acepta se rehace solo, el que no, se queda el tuyo.
4. **La merma, ¿con foto?** **A · Si quieres**, nunca obligatoria.

## Lo que se decide

### Uno · Los platos esperan a sus fichas (1A)

El Plan cambia: **la desviación de los platos, la calibración y el food cost teórico pasan a M9**, que es donde se sabe qué lleva cada plato. M8 hace lo demás y deja la pantalla de la desviación lista para que se enciendan. Lo que se vende tal cual —una Coca-Cola— no necesita ficha, y su desviación entra en M8.

### Dos · Contar y cerrar, como lo hacen los mejores (2A)

Lo que hacen los programas de inventario serios de hostelería, y lo que se construye:

- **Dos pasos.** Cuenta quien lleve el almacén —el cocinero también— y **manda lo contado**. Lo cierra quien tiene «Cerrar un inventario» (quien lleva el local y el jefe de cocina). Quien puede cerrar puede contar y cerrar de una vez, como hasta hoy.
- **Lo contado se compara con lo que había a la hora de contarlo**, no a la de cerrar. Si Marcos cuenta a las 7, a las 9 entra un albarán y el jefe cierra a las 11, la diferencia es la de las 7 y el albarán sigue sumando. Sin esto, cerrar tarde se comía todo lo apuntado entre medias.
- **Se cuenta a ciegas.** Quien cuenta sin poder cerrar no ve lo que dice el libro: un número a la vista se confirma sin mirar. Quien cierra sí lo ve, y la diferencia.
- **Se cuenta como está en la estantería**: «2 cajas y 3 sueltas», y Estook lo pasa a la unidad del producto.
- **Varios a la vez**: cada uno cuenta su zona y manda lo suyo; quien cierra los ve todos.
- **«Que lo vuelvan a contar»**: quien cierra puede pedir que se recuente una línea que baila mucho, y a quien la contó le llega el aviso.
- **Lo contado se guarda en el móvil mientras se cuenta**: en la cámara sin señal no se pierde nada.

### Tres · El mínimo se propone (3A)

Estook lo calcula —lo que se gasta al día × el mayor hueco entre dos repartos del proveedor, + 20 %— y lo propone producto a producto, con su porqué. **El que se acepta se rehace solo cada lunes**; el que no, se queda como estaba. Cambiarlo a mano en la ficha deja de rehacerlo.

### Cuatro · La foto de la merma, si quieres (4A)

Un cuarto toque que se puede saltar. Llega en la segunda entrega.

### Cinco · Dos entregas

- **La primera** (`0060`): contar en dos pasos, «Toca contar», la hoja impresa, el valor del almacén en cualquier fecha, FEFO y el mínimo calculado.
- **La segunda**: lo gastado de verdad, el food cost real, la desviación de lo que se vende tal cual con su causa probable, y la foto de la merma.

## Lo que decidí al construirlo

1. **«Toca contar» llega los lunes a la campana de quien cierra, sin elegir el día.** El plan decía «se cambia en Ajustes»: si lo quieres otro día, se añade.
2. **No sale en «Hoy» del Panel**: para saber qué toca habría que leer el almacén entero cada vez que alguien abre el Panel, y la velocidad manda. Está en Inventario y en la campana.
3. **Dónde vive**: Inventario es la entrada de siempre dentro de Movimientos, ahora con «Contar una zona», «Por cerrar», «Toca contar» y «Los últimos»; el valor, una vista nueva de Productos, «Valor» (el Plan, B5); y los mínimos, un aviso en «Bajo mínimo» y una línea en la ficha («Estook propone 14,4 kg · Usar»).
4. **Lo que sobra al contar no crea un lote**: un lote sin fecha no avisa de nada. Lo que falta sí sale de los lotes, por FEFO.
5. **FEFO**: lo fresco antes que lo congelado, lo que no tiene fecha al final, y a igual fecha lo que llegó antes. El lote que se acaba se retira solo («se acabó») y vuelve si se anula la salida. **Los lotes que ya había empiezan con lo que trajeron**, sin restar lo gastado —no se sabe de cuál salió—: el próximo inventario lo ajusta.
6. **La merma de la camarera también gasta del lote**: una política nueva deja a quien apunta mermas tocar lo que le queda a un lote, y nada más se toca por ahí.
7. **Quien cierra puede corregir una cifra** («Lo he mirado yo»), y se compara con el libro de ese momento. **Cerrar con líneas pedidas a recontar las deja fuera**, y lo dice.
8. **Contar y cerrar de una vez va por el mismo camino**: deja su inventario, con quién, cuándo y qué. Así hay una sola forma de cerrar.
9. **El mínimo**: unidades y gramos, enteros hacia arriba; kilos y litros, con dos decimales; sin días de reparto, para cinco días. Se propone si se separa más de un 10 % del que hay. **Cambiarlo a mano en la ficha lo deja de rehacer.**
10. **Contar a ciegas es de la pantalla de contar y de lo que llega de un inventario**: la lista de Productos sigue diciendo lo que hay a quien lleva el almacén, como siempre.
11. **El valor en una fecha** cuenta lo activo y sin ejemplos, a precio medio; lo que entró sin coste, a su precio de hoy, y lo dice. Cuadra con «lo que vale la cámara» del Resumen.
12. **La API pasa a 78 consultas y 169 comandos**; la base, a 104 tablas.

## Lo que se descartó

- **Cambiar el orden y hacer M9 antes** (1B): lo que ya vale hoy esperaría a las fichas.
- **Comparar con lo apuntado en vez de con las fichas** (1C): en una cocina casi nadie apunta lo que cocina, y todo saldría como «falta».
- **La foto obligatoria desde 20 €** (4B): una merma sin foto vale más que una sin apuntar.
