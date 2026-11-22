# 0149 · M20 · 1 · Lo vendido baja del almacén

**Fecha:** 22 de noviembre de 2026
**Estado:** construido en `m20-1-lo-vendido-baja`, con la migración **0121** (y la **0122**, que borra
`boton_del_tpv.fijado`). [La maqueta](../maquetas/m20-1-lo-vendido-baja.html), aprobada por Richi el
22-nov («las maquetas me gustan») y pulida después a petición suya.
**Sigue:** el [plan de M20](../m20-ventas-y-consumo.md), la [0095](0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md)
(lo vendido sin escandallo) y la [0145](0145-cobrar-en-la-mesa-y-negocio-ventas.md) (Negocio › Ventas).
**Cambia:** el Plan (la ficha de M20 y la tabla B5), el Anexo (5.4 y 7.7), la Auditoría de flujos (el
cobro), el [mapa](../MAPA-de-modulos.md) y ESTADO.

## 1 · Lo que hace

Al cobrar una mesa (o una venta rápida) en Estook TPV, **cada plato resta lo que lleva su escandallo**,
sin que nadie apunte nada (Richi, 10-nov: «tiene que ser un reloj suizo»):

- **Lo elegido al pedir cuenta**: «sin cebolla» no resta la cebolla; la tónica de la copa, sí; cambiar
  el pan por uno sin gluten hace las dos cosas (lo congeló la línea al pedirlo, T3 · 2).
- **El menú del día** resta los platos que se eligieron dentro.
- **En bruto**: la receta pide gramos limpios y la cámara guarda kilos en bruto. 280 g de atún limpio con
  un 70 % aprovechable son 400 g que salen.
- **Lo de dentro de una elaboración**, por lo que rinde; **una tanda**, por sus raciones.
- **Del lote que antes caduca**, como cualquier salida (0078).
- **Con el coste de ese momento**, congelado en el libro: lo que costó un plato el día que se vendió no
  cambia aunque mañana suba la carne.
- **A nombre de quien cobró**, con «Vendido · Mesa 4» en cada línea del libro.

**Cuándo:** al cobrar, no al mandar a cocina ni al emitirse el ticket. La cuenta cobrada a partes iguales
resta entera con la última parte (las partes no dicen platos). Una mesa abierta no resta.

## 2 · Las tres preguntas que se explicaron antes de construir

1. **Un plato sin escandallo** (decidido en la 0095): se vende igual, cuenta en dinero y no resta género.
   En **Escandallos › Resumen** sale «Vendidos sin escandallo» con cuántos esta semana; al tocarlo se
   abre para crearlo. Sin un euro: lo ve también la cocina. **Lo ya vendido no se rehace**: el escandallo
   resta desde la siguiente venta y el recuento cuadra lo de antes.
2. **Lo que se devuelve o se anula** (la pregunta de Richi, contestada «A» el 22-nov: «muy bien visto»):
   - **Un ticket anulado** nunca debió existir (se cobró la mesa que no era): **todo vuelve**, a sus lotes.
   - **Una devolución vuelve según su motivo**, con los cuatro de siempre y ninguno más («las justas para
     que el camarero no se haga el lío»): **solo «Se cobró de más» devuelve el género** (tres cañas
     cobradas, dos servidas). «Mal hecho», «No lo quiso» y «Otro» no: ese plato salió y se gastó.
   - **Quitar un plato o anular una mesa sin cobrarla** no resta nada: no se vendió.
3. **Lo vendido sin conexión**: hoy Estook TPV no cobra sin internet. Cuando lo haga (lo que queda de T7),
   esas ventas pasarán por el mismo camino y restarán al volver, con la hora en que se vendieron
   (`apuntar` recibe la hora del cobro).

## 3 · Cómo está hecho, y por qué así

- **En el mismo cobro, en un punto de guardado aparte** (`enUnPuntoDeGuardado`, lección 225). El cobro deja
  lo suyo en una cola (`lo_vendido_por_bajar`) dentro de su transacción y resta en el punto de guardado:
  **si algo falla, el cobro sigue entero**, la fila se queda en la cola con su fallo (y en Sentry), y **el
  siguiente cobro del local la vuelve a intentar** antes que lo suyo. Sin reloj nuevo y sin perder nada.
  `bd:comprobar-api` avisa en rojo si algo lleva más de una hora.
- **Nada se resta dos veces**: cada plato cobrado se apunta una vez en `linea_bajada`, que es su clave. El
  mismo cobro repetido (se perdió la respuesta) no resta otra vez.
- **Quien cobra no lleva Almacén**: lo escribe «el sistema», con tres políticas nuevas que se suman a las
  de siempre (solo el consumo de una venta). Lo que se lee va con la persona que cobra: de un local que no
  ve, no resta nada.
- **Un solo motor** (Plan, M20): la cuenta pura vive en `@estook/dominio` (`loQueBajaUnPlato`), con sus
  pruebas hechas a mano; Revo conectado o el fichero de otro TPV entrarán por el mismo (M18).
- **Cada plato en su sitio del ticket** (`cobro_de_linea.posicion`): una devolución dice «la línea 2», y
  así se sabe qué plato vuelve.

## 4 · Lo que se ve

| Dónde                                 | Qué                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Almacén › Movimientos › Historial** | Cada cobro, una línea («Vendido · Mesa 4 · 5 productos»), que se despliega; «Ventas» filtra también esto |
| **Escandallos › Resumen**             | «Vendidos sin escandallo», con cuántos esta semana; solo si hay alguno                                   |
| **Negocio › Ventas › Por producto**   | Pestaña nueva: lo cobrado plato a plato, sin IVA, con su coste de aquel día y el food cost               |
| **Almacén › Ha salido género**        | En un local cuyas ventas ya restan, sin «Vendido a un cliente» ni «Gastado en cocina» (m20, 3.1)         |

**Por producto** suma exactamente su total, cuenta un menú como una fila con sus platos dentro y deja
fuera del food cost lo que no sabe lo que costó (sin escandallo, sin precio, un artículo libre): no se da
un coste falso. El coste solo viaja a quien ve lo que cuesta un plato.

## 5 · El fallo de Cobros (lección 277)

Richi vio que **Negocio › Ventas › Cobros decía «Hoy no se ha cobrado nada»** con cuatro cobros de prueba
hechos ese día (1.347,30 € con tarjeta). La consulta contaba cada cobro en el día en que **se abrió su
caja**, y la de IKATZ llevaba abierta desde el 18-nov. Ahora **cada cobro cuenta en la jornada en que se
cobró**, con la hora de corte del local; lo mismo en «Cómo se cobra» del Panel. Y el Historial del almacén
escribía «Hoy» con el día del calendario: entre medianoche y la hora de corte, lo de hoy salía en «Ayer».

## 6 · Lo que decidió la IA por su cuenta

1. **El escandallo de un plato a peso es el de un kilo**, porque su precio es el del kilo: 150 g de jamón
   restan 0,15 de su receta.
2. **«Sacar género» esconde lo vendido y lo cocinado solo si las ventas ya restan de verdad**: algún cobro
   ha restado su escandallo en los últimos treinta días. Un local Pro que aún no cobra con Estook TPV lo
   sigue viendo todo. Lo vigila también el servidor.
3. **Lo quitado de una mesa ya cocinado no se apunta como merma solo**: el motivo es texto libre y no dice
   si se tiró. Lo cuadra el recuento, como hoy.
4. **«Por producto» empieza con M20 · 1**: lee lo que cada cobro dejó apuntado; lo cobrado antes del
   despliegue no sale ahí (sigue en Cobros y en Información).
5. **Lo devuelto por «Se cobró de más» no toca los lotes**, solo lo que hay: una parte de una línea del
   libro no se puede repartir entre lotes sin inventarlo. El ticket anulado entero sí vuelve a sus lotes.

## 7 · Lo que no entra

Conectar Revo o el fichero de otro TPV (M18), lo que se escapa y la carta en cuatro (M20 · 2), el
«Quedan 3» del TPV con el stock y el escandallo, y cobrar sin internet (lo que queda de T7).
