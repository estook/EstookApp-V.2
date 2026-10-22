# M20 · Ventas y consumo

> **Estado: plan, sin construir.** Escrito el 22-oct-2026, con M16a ya en producción (80
> migraciones, API 102/230). Es la segunda pieza de Estook TPV
> ([0061](decisiones/0061-el-orden-y-la-infraestructura.md)): **el motor que convierte lo vendido en
> lo que sale del almacén**, para todas las vías a la vez —el cierre a mano, el fichero del TPV, la
> foto del Z y, después, Estook TPV—. **Faltan las cuatro respuestas de Richi** (apartado 3) y **un
> fichero de verdad de Revo** antes de construir.

## 1 · De dónde se parte

### Lo que ya está hecho

| Pieza                                  | Desde                                                                                                                  | Lo que hace hoy                                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **El cierre con sus platos**           | M6½ ([0027](decisiones/0027-la-caja-se-cierra-sin-tpv.md))                                                             | Se apuntan platos y unidades a mano, desde un fichero (CSV) o desde la foto del Z (Fogón la lee). **Nadie descuenta nada con ellos** |
| **El precio, desde la carta**          | M10 · 1                                                                                                                | Al apuntar «Croquetas, 12», el importe sale de la carta                                                                              |
| **Emparejar lo que se vende tal cual** | M8 ([0079](decisiones/0079-lo-gastado-y-la-desviacion.md))                                                             | En Almacén › Consumo, «Coca-Cola» de la caja se une a su producto del Almacén, una vez                                               |
| **Escandallos de una ración**          | M9 y el repaso del 19-oct                                                                                              | Cada plato sabe qué lleva y cuánto; lo que se vende tal cual, su producto y su ración                                                |
| **Sacar de la cámara, con su porqué**  | [0037](decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)                                                     | «Vendido a un cliente», «Gastado en cocina» o una merma. **Hoy, con mermas y recuentos, es lo único que hace bajar el almacén**      |
| **La jornada y cerrar en tres pasos**  | M16a ([0105](decisiones/0105-m16a-la-jornada.md))                                                                      | Un día cerrado no se toca; reabrir pide motivo. La 0105 dejó dicho: «descontar al cerrar, con M20»                                   |
| **Cómo se detecta lo que se escapa**   | [0093](decisiones/0093-como-detecta-estook-lo-que-se-escapa.md) y [0094](decisiones/0094-la-prueba-de-la-plantilla.md) | Diseñado entero ([el diseño](como-detecta-estook-lo-que-se-escapa.md)): los cuatro filtros, «aprendiendo» y el mes en silencio       |

### Lo que hay en IKATZ (leído el 22-oct, en solo lectura)

- **Cobra con Revo.** De **22 cierres, 1 trae platos** (el 30-sep); los demás, solo el total del día.
- **10 de sus 18 platos** tienen escandallo. Uber Eats, activo (30 % de comisión).
- En el Almacén, del 10-sep al 20-oct: **20 «Gastado en cocina»** (en 10 días), **23 «Vendido a un
  cliente»** (en 5), 21 mermas y 3 días de recuento.

**Lo que eso quiere decir:** sin los platos de cada día, M20 no tiene nada que mover. Por eso la
pregunta 2 (cómo llegan los platos de Revo) es la que decide si M20 se ve en IKATZ antes de Estook
TPV.

## 2 · Lo que propongo, en dos entregas

### M20 · 1 · Lo vendido mueve el almacén

**En la cocina.** El viernes se venden 8 pulpos a la gallega. Su escandallo lleva 250 g de pulpo
cocido. Al cerrar el día, el almacén baja 2 kg de pulpo **sin que nadie lo apunte**. El lunes, al
contar, la diferencia entre lo que dice Estook y lo que hay es **lo que se ha escapado** (eso lo
explica M20 · 2).

| Pieza                          | Lo que hace                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **El motor**                   | Al **cerrar el día**, cada plato vendido baja del almacén lo que lleva su escandallo, **con el precio de ese día congelado**. Reabrir y volver a cerrar lo rehace **sin duplicar**                        |
| **Emparejar, una vez**         | «Croq. caseras» del TPV es «Croquetas de jamón» de tu carta: **Estook lo propone por parecido, tú dices sí y se recuerda siempre**. También con un producto que se vende tal cual, como ya hace Consumo   |
| **El fichero del TPV**         | Lee el de Revo (y los de otros TPV): `;` o `,`, decimales con coma, fechas `dd/mm/aaaa`, los acentos de Windows, y **se salta las filas de totales**. **Subir el mismo fichero dos veces no cambia nada** |
| **El menú del día**            | «Menú del día × 23» baja lo de los platos que salieron (cómo se sabe, en la pregunta 3)                                                                                                                   |
| **Lo que no tiene escandallo** | **Cuenta en dinero y no baja género**, y lo dice: «3 platos vendidos sin escandallo» con «Desgranar» al lado ([0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md))                  |
| **Servicio › Ventas**          | **Del día**: lo vendido, con **de dónde viene** (Revo, foto, a mano) y si es fiable. **Por producto**: lo que ha bajado de cada producto por las ventas                                                   |
| **Lo de antes no se toca**     | Los días cerrados antes de M20 no se descuentan solos. «Aplicarlo a los días pasados», solo si lo pides, con el precio de cada día (Plan, M20)                                                            |

**Lo que no entra en M20 · 1:** «Del turno» en Servicio › Ventas (sin Estook TPV no hay turnos de
caja: pasa a M20C); los modificadores («sin cebolla», «extra de queso»), que llegan con la sala de
Estook TPV (M20A); y las devoluciones, que son de M20C (el motor ya sabrá deshacer una venta con el
mismo coste que se congeló).

### M20 · 2 · Lo que se escapa y lo que deja cada plato

- **La desviación de los platos**, con los **cuatro filtros** del diseño: ningún aviso con datos a
  medias, «aprendiendo (1 de 3)» hasta el tercer inventario, solo lo que cuesta dinero, **un mes en
  silencio** antes de encenderlo y **la receta nunca se sube a lo que se sirve**. En Almacén › Consumo,
  con el **food cost teórico junto al real** y su brecha.
- **La calibración, en una pregunta**: «El pulpo pierde unos 2 kg al mes. ¿Rinde menos de lo puesto,
  o se sirve de más?», tres botones, una vez.
- **Estrella, caballo, puzzle y perro, por canal** (lo de M10 que Richi dijo «no te olvides», 0103),
  en Carta › Análisis › **Matriz** y **Por canal**. Es el método clásico de Kasavana y Smith (1982),
  el de las escuelas de hostelería: un plato es **popular** si vende al menos el 70 % de lo que le
  tocaría repartiendo a partes iguales en su sección, y **rentable** si deja (sin IVA y sin la
  comisión del canal) más que la media de su sección. **Estrella**: popular y rentable, no se toca.
  **Caballo**: popular y deja poco, se mira su precio o su escandallo. **Puzzle**: deja mucho y se vende
  poco, se cambia de sitio o de nombre. **Perro**: ni una cosa ni otra, candidato a retirar. De las
  últimas cuatro semanas. **Propone; nunca cambia un precio ni retira un plato por su cuenta.**

**Y Fogón 2** (el análisis del cierre, «¿cuánto preparo mañana?»…) **cuando IKATZ lleve cuatro semanas
con sus ventas plato a plato**: antes no tendría de qué hablar ([0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md)).
No frena M19a.

## 3 · Las cuatro preguntas

### Pregunta 1 · ¿El almacén baja con lo vendido o con lo que se saca?

**De dónde sale.** El Plan dice que con M20 «el stock se mueve solo con las ventas del día». Pero desde
la [0037](decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md), en «Sacar» hay **«Gastado en
cocina»** y **«Vendido a un cliente»**, y en IKATZ se usan. **Ningún documento dice qué pasa con ellos
cuando lleguen las ventas**, y si no se decide, **se cuenta dos veces**.

**En la cocina.** Por la mañana, el cocinero saca 2 kg de pulpo y apunta «Gastado en cocina». Por la
noche, Revo dice que se vendieron 8 pulpos a la gallega (250 g cada uno). Si Estook baja las dos cosas,
**el almacén baja 4 kg cuando salieron 2**. Lo mismo con una Coca-Cola apuntada como «Vendido a un
cliente» que además viene en el fichero de Revo.

- **A · Manda lo vendido.** Desde el día en que tu local mete sus ventas plato a plato, el almacén baja
  solo con ellas. **«Gastado en cocina» y «Vendido a un cliente» desaparecen de «Sacar»** (ya lo dice el
  TPV); se quedan las mermas, la comida del personal, las invitaciones y llevarlo a otro local. **La
  cocina deja de apuntar lo que gasta: menos trabajo.** Lo que no cuadre lo descubre el recuento, y eso
  es justo «lo que se escapa». El día que no subas los platos, el repaso del cierre lo dice: «hoy el
  almacén no ha bajado».
- **B · Manda lo que se saca, como hoy.** Lo vendido no toca el almacén: solo calcula lo que se debía
  gastar, para compararlo («sacaste 2 kg de pulpo; lo vendido pedía 2»). Nada cambia para la plantilla,
  pero **la cocina sigue apuntando cada cosa que saca**, y si se olvida, el almacén y el pedido sugerido
  se equivocan.

**Recomiendo A**: es lo que hacen los programas de control de costes que funcionan (MarketMan,
Apicbase, Nory: lo de la cocina sale de las ventas, y el recuento cuadra), quita trabajo y es lo que
pide el Plan. **Lo que decides: A o B.**

### Pregunta 2 · ¿Cómo llegan a Estook los platos que vende IKATZ en Revo?

**De dónde sale.** El Plan, M20: «caminos manuales explicados por marca». La conexión directa con Revo
está pedida desde septiembre y no se programa sin su aprobación y su documentación (Plan, M18); hasta
entonces, o hasta Estook TPV, los platos llegan por un fichero o por una foto.

**En la cocina.** A la una de la mañana, quien cierra mira el Z de Revo y escribe el total en Estook.
Para que el almacén baje, además, Estook necesita **«12 croquetas, 8 pulpos, 23 menús…»**.

- **A · El fichero de Revo, cada noche, al cerrar.** En el paso «Las ventas» ya está «Subir el fichero»:
  se descarga de Revo el informe de ventas por producto de ese día y se sube. **Un minuto más cada
  noche.** El almacén está al día cada mañana.
- **B · El fichero de la semana, de una vez, desde Servicio › Ventas.** Estook lo reparte por días y
  **a cada día ya cerrado le añade sus platos sin tocar su dinero** (total, efectivo, tarjeta), con tu
  nombre y la hora. **Solo vale si el fichero dice la fecha de cada línea.** El almacén baja una vez a
  la semana: entre medias, el pedido sugerido no ve lo vendido.
- **C · La foto del Z, cada noche**, si el Z de Revo imprime los productos (Fogón la lee: 2 créditos).

**Recomiendo A**, y B solo para ponerse al día con los días que se cerraron sin platos. **Lo que
decides: A, B o C.** Y **lo que necesito de ti**: **un fichero de Revo de ventas por producto de un día**
(y, si puedes, de una semana), adjunto en el chat. No sé cómo se llama ese informe en tu Revo ni qué
columnas trae, y **Estook no se programa contra un formato inventado** (ESTADO, «lo que no se puede
olvidar», 4: primero lo de verdad).

### Pregunta 3 · El menú del día: ¿cómo sabe Estook qué platos salieron?

**De dónde sale.** El Plan: «el menú importado se explota a sus platos» y, si la caja no lo dice, «un
reparto estimado». M10 · 2 ya guarda qué platos tenía el menú de cada día.

**En la cocina.** «Menú del día × 23» dice que salieron 23 menús, pero no si fueron 12 lentejas y 11
ensaladas. Para el almacén, eso es lo que importa.

- **A · Del fichero, y si no, a partes iguales.** Muchos TPV apuntan cada primero y cada segundo como
  una línea a 0 € debajo del menú: si el de Revo lo trae, se usa. Si no, Estook reparte los 23 a partes
  iguales entre los platos de ese día y **lo marca «estimado»**. **Nadie hace nada más.** Esos días no
  cuentan para avisar de lo que se escapa en esos productos (filtro 1).
- **B · Te lo pregunta al cerrar**: «Del menú, ¿cuántos de cada?», con los platos del día puestos.
  Exacto, pero **30 segundos más cada noche**, y alguien tiene que saberlo a la una de la mañana.

**Recomiendo A.** **Lo que decides: A o B.** Y dime **cómo marcáis el menú en Revo**: ¿una tecla «Menú
del día» y luego los platos, o solo la tecla?

### Pregunta 4 · Los pedidos de Uber Eats, ¿dónde acaban?

**De dónde sale.** M20 · 2 clasifica cada plato **por canal**: el mismo plato puede ser estrella en sala
y caballo en Uber Eats, porque allí paga un 30 % de comisión. Para eso, Estook tiene que saber **qué se
vendió por Uber Eats**.

**En la cocina.** El pedido de Uber Eats llega a una tablet. O alguien lo pica en Revo, o la tablet está
conectada a Revo, o se queda solo en la tablet de Uber.

- **A · Entran en Revo.** Si el fichero dice el canal de cada línea, Estook los separa solo. Si no, cuentan
  como sala.
- **B · Van aparte, sin pasar por Revo.** Se sube también el informe de pedidos de Uber Eats (si su
  panel deja descargarlo; lo miro con uno de verdad), o **espera a M29**, que conecta el reparto.
- **C · Por ahora da igual**: todo cuenta como sala, y «Por canal» espera.

**Lo que decides: dime cuál es tu caso (A o B)**, y si es B, si quieres subir también su fichero o
esperar a M29. **Si es B, recomiendo esperar**: dos ficheros cada noche es mucho trabajo para un cuadro.

## 4 · La regla 14 y la prueba de la plantilla, de M20 · 1

| Pregunta                            | Respuesta                                                                                                                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué datos usa?                     | Los platos del cierre (a mano, fichero o foto), los emparejamientos, los escandallos de una ración (M9), el menú de cada día (M10 · 2) y el precio medio de cada producto ese día |
| ¿Quién más se entera?               | El Almacén (lo que queda), el pedido sugerido, «Toca contar», el food cost del Panel y, con M20 · 2, Consumo y Carta › Análisis                                                   |
| ¿Qué automatiza Fogón?              | Leer la foto del Z (ya lo hace). **Emparejar lo propone la base por parecido; una persona confirma**                                                                              |
| ¿Qué aprueba una persona?           | Cada emparejamiento, una vez; y aplicar lo vendido a los días pasados                                                                                                             |
| Permisos                            | Subir ventas y cerrar: quien cierra la caja (`dato.ventas`). Emparejar: quien edita la Carta. Ver lo que baja en euros: quien ve precios                                          |
| ¿Sin internet?                      | No: el cierre ya pide señal                                                                                                                                                       |
| ¿Dos veces?                         | El mismo fichero dos veces no cambia nada; reabrir y cerrar rehace el día sin duplicar                                                                                            |
| Auditoría                           | Cada movimiento que baja, con el plato y el día que lo produjo; cada emparejamiento, con quién y cuándo                                                                           |
| 16 · ¿Trabajo nuevo?                | Subir el fichero de Revo al cerrar (un minuto), **y a cambio la cocina deja de apuntar lo que gasta** (si es la A de la pregunta 1)                                               |
| 17 · ¿Duplica algo?                 | **Es lo que decide la pregunta 1**: con A no hay dos caminos para lo mismo                                                                                                        |
| 18 · ¿Bloquea el servicio?          | No: un plato sin emparejar o sin escandallo se cierra igual, y lo dice                                                                                                            |
| 19 · ¿Fácil?                        | Emparejar es «¿Es este? Sí»; subir el fichero, un botón que ya está                                                                                                               |
| 20 · ¿Avisa solo cuando hace falta? | Solo en el repaso del cierre («3 platos sin emparejar», «hoy el almacén no ha bajado»); nunca en la campana                                                                       |
| 21 · ¿Con datos a medias?           | Baja lo que sabe, dice lo que no, y marca «estimado» lo repartido                                                                                                                 |
| 22 · ¿Señala a alguien?             | No: las ventas no llevan nombres de quien vendió                                                                                                                                  |
