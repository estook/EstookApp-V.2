# 0106 · Estook TPV · la sala y la cocina: el ticket entero, marcha el camarero, la comida en su orden y las bebidas desde el almacén

**Fecha:** 22 de octubre de 2026
**Estado:** decidido con Richi sobre las pantallas dibujadas («todo correcto, lo dejamos así»), sin construir.
**Sigue:** el Anexo de TPV y facturación (capítulos 3 y 10), que pasa a la versión 1.3 con esto, y el
[plan de M20](../m20-ventas-y-consumo.md). **Cambia:** el Anexo 3.1, 3.2, 3.7, 10.3 y 10.4; el Plan
(M20A y el orden de la Fase 4); el mapa y ESTADO.

Las pantallas, en una página privada de Richi:
[Estook TPV · las pantallas](https://claude.ai/artifact/RFZz75ttJGLyZpGpdpmrX8) (18 pantallas). Mandan
sobre el aspecto; este documento manda sobre lo que hacen.

## 1 · Cómo se llegó aquí

El 22-oct, con M16a en producción, se propuso empezar M20 (el motor que resta del almacén lo vendido).
Richi lo paró: el cierre a mano no trae platos, **los platos llegan de Estook TPV o de Revo conectado**,
y quiere que **IKATZ cobre con Estook TPV** (Revo conectado es secundario). Pidió **primero las
pantallas, sin código ni documentos**, «evitando el vibe coding». En cuatro rondas corrigió lo que no
tenía lógica en un restaurante de verdad, y se miró cómo lo hacen Toast, Square, Revo (Cegid), Aloha,
Zonal, Qamarero, MarketMan y Apicbase.

## 2 · Lo que se decide

### La sala

1. **Tres pestañas, en el orden de una comida: Bebidas · Carta · Menú del día.** La carta, **por sus
   secciones y con foto**, como está montada en Estook (nada de mezclar cañas y croquetas).
2. **Al abrir la mesa**: cuántos son (un toque) y **«por pases» o «todo junto»**.
3. **Cada plato va solo a su pase**: entrantes y primeros del menú, al 1.º; principales y segundos, al
   2.º. Se cambia tocando la línea. **Los postres no se piden por adelantado**: se piden al final, como
   una comanda nueva de la misma mesa.
4. **Las notas, solo escritas.** Al tocar la línea de la cuenta: un recuadro con «Ej.: al punto, poco
   hecho, sin sal…» en gris, el pase y «Quitar». **Nada de botones de punto**: el TPV no sabe qué es
   carne y le saldrían a la burrata. Ni «para compartir» ni personas P1–P4 en la nota.
5. **El menú del día, en su momento**: «¿Cuántos menús?» y **se cuentan los platos** (1 lentejas, 1
   ensalada), no persona a persona. **Primeros y segundos juntos** (el 2.º en espera); **postre o café,
   al final** (o postre y café, si el menú del local lo da así, M10 · 2). **Las bebidas que la mesa ya
   pidió entran solas en el menú** si son de las del menú, una por menú. **Una mesa puede tener menú y
   carta a la vez**: es una sola cuenta, y cada plato va a su pase con «menú» al lado.
6. **Marcha el camarero, nunca la cocina** (Toast, Aloha, Zonal: el pase lo suelta la sala). La cocina
   no ve cuándo una mesa acaba el primero. **Cuando la cocina ha sacado todo el 1.º**, la sala lo sabe:
   aviso «Mesa 6 · ha salido todo el 1.º» en el plano y en el móvil, la mesa en azul («Toca marchar el
   2.º») y **el botón grande de la mesa pasa a ser «Marchar el 2.º»**. El camarero marcha cuando ve que
   van acabando. Desaparecen la marcha «al retirar» y «por tiempo» del Anexo 3.1.
7. **El botón grande siempre dice lo siguiente**: «Mandar a cocina» si hay algo sin mandar; «Marchar el
   2.º» si ha salido el 1.º; si no, «Cobrar». El camarero no tiene que pensar.
8. **Cada plato que sale lleva ✓ y su hora** en la cuenta del camarero (lo tacha la cocina).
9. **Al tocar una mesa en el plano, sus opciones**: Marchar el 2.º (cuando toca), Abrir la mesa, Cobro
   rápido; e imprimir la cuenta, dividirla, cambiar de mesa, juntar mesas, **pasar a otro camarero**,
   pasar a la barra o para llevar, nota (para cocina o solo sala), personas y alergias, «lo que ha
   pasado» y anular la mesa con permiso y motivo. **No hay «forzar desbloquear»**: en Estook nadie
   bloquea una mesa (Anexo 7.2: cada aparato añade líneas, no sobrescribe).
10. **Las copas, como en cualquier TPV** (Revo tiene su pestaña COMBINADOS): un botón por marca (Ron ·
    Havana 7, Ginebra · Beefeater…) y **«¿Con qué?»** con los refrescos del almacén o «solo, con hielo».
    Dos toques. Los cócteles (mojito), como un plato.
11. **Las bebidas, los cafés y las copas van a la barra**, no al ticket de cocina.

### La cocina

12. **A cocina llega el ticket entero de la mesa**, todos sus platos. **Nada de partidas** (caliente,
    frío…): «es un lío, más difícil y más clicks». El 1.º en marcha, el 2.º en espera y la alergia arriba.
    Sustituye al Anexo 3.2 «Cada partida ve lo suyo» y a la pantalla de pase aparte: **cada tarjeta ya es
    el pase de su mesa**.
13. **Se toca un plato al sacarlo y queda tachado con su hora.** Otro toque lo destacha; y «Deshacer el
    último».
14. **Al salir todo el 1.º**, la mesa **baja a «Esperando a que la sala marche»**, pequeña, con su 2.º a
    la vista para ir preparando. **Al marcharlo**, sube arriba con **«¡MARCHA EL 2.º!»** y suena distinto.
15. **Al tachar el último plato, la mesa se va sola a «Fuera»**, con 5 segundos para deshacer; también
    «Todo fuera» de un toque. En «Fuera», cuándo salió cada mesa y lo que tardó, y **«Recuperar»**.
16. **Pestañas de cocina: En marcha · Delivery · Fuera.** El delivery lleva la moto, la plataforma, el
    nombre, **la hora a la que pasa el repartidor**, lo que va a la bolsa y «Listo para el repartidor».
17. **Lo que cambia, en la misma mesa**: «NUEVO» con su hora, «ANULADO» en rojo con sonido, «CAMBIO»
    de nota, «VUELVE» (abajo, 3).
18. **Pantalla, papel o las dos**, a elección del local. En papel: el ticket entero con sus pases, y un
    papelito por cada marcha, plato nuevo o anulado.

### En Estook (la gestión): todo se configura aquí, nunca en el TPV

19. **Todo lo que se vende sale de la carta, y todo lo de la carta sale del almacén.** Tres formas:
    **tal cual entero** (la lata, la botella, el tercio: 1 unidad), **tal cual a raciones** (caña, doble
    y jarra del mismo barril; la copa de vino, que Estook propone de **150 ml**, 5 por botella, y la
    botella entera: los ml de la ración), y **con receta** (cafés, copas, cócteles: cada ingrediente).
20. **Qué es vino, refresco o copa lo dice la sección de la carta**, no el almacén (allí solo hay «Bebidas
    con alcohol», «sin alcohol» y «Café e infusiones»). **Cada sección se marca como comida o como
    bebida, una vez**: decide la pestaña del TPV y si va a cocina o a la barra.
21. **«Monta tus bebidas»**, para el primer día: coge las bebidas del almacén, propone su sección por el
    nombre y se ponen todos los precios de una vez.
22. **Las copas se hacen solas**: «Añadir botellas del almacén», y cada copa lleva **50 ml de su botella
    (la dosis de la casa, se cambia una vez)**, el refresco que pidan y hielo. Al cobrar un Havana 7 con
    Coca-Cola baja 50 ml de Havana 7, una Coca-Cola y el hielo, y se ve lo que deja cada copa.
23. **Los cafés vienen hechos**: solo, cortado, con leche (taza y vaso), americano, descafeinado, bombón,
    infusión y Cola Cao, con sus cantidades típicas (7,5 g de café; 30, 120 o 180 ml de leche; un
    azúcar), **unidos solos al café y la leche del almacén**. Sin ellos, un **coste aproximado** (solo
    ≈0,17 €, con leche en taza ≈0,29 €, en vaso ≈0,35 €: 7–8 g por café y 120–140 cafés por kilo,
    [que.es](https://www.que.es/2024/04/13/cuanto-dinero-gana-bar-cafe/10/); leche a ≈1 €/l). El local
    enciende los que sirve y pone el precio. **El postre sí lo escandalla el local.**

## 3 · Lo que pasa en cada caso, mirado como camarero y como cocinero

| Caso                                       | En la sala                                                                                          | En la cocina                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Dos piden menú y dos carta**             | Una sola cuenta; primeros y entrantes al 1.º, segundos y principales al 2.º                         | Un solo ticket; lo del menú lleva «menú» al lado                                           |
| **Cambio de turno**                        | «Pasar a otro camarero», una mesa o todas las suyas; lo que se venda desde ese momento es del nuevo | La tarjeta cambia de nombre                                                                |
| **El camarero se va sin pasar sus mesas**  | El plano marca «mesas de Ana, que ha fichado la salida»; cualquiera con permiso las pasa con su PIN | Nada                                                                                       |
| **Quitar un plato sin mandar**             | Libre                                                                                               | Nada                                                                                       |
| **Quitar un plato mandado y sin salir**    | Motivo; si su puesto no puede, lo aprueba un encargado con su PIN (Anexo 3.4)                       | «ANULADO» en rojo, suena, y papelito; no se hace                                           |
| **Quitar un plato que ya salió**           | Es una devolución: motivo («frío», «no lo pidieron»); si se rehace, «Devolver a cocina»             | Si se rehace, llega arriba como **«VUELVE · más hecho»**; lo tirado es merma con su motivo |
| **Un plato más tarde**                     | Se añade a la mesa; va a su pase, y si ese pase ya está marchado, sale en marcha                    | «NUEVO» con su hora en la misma tarjeta                                                    |
| **Cambiar una nota ya mandada**            | Se toca la línea y se cambia                                                                        | «CAMBIO» al lado del plato                                                                 |
| **La mesa equivocada**                     | «Cambiar de mesa» (toda la cuenta) o pasar platos a otra                                            | La tarjeta cambia de número                                                                |
| **Juntar dos mesas**                       | Una sola cuenta                                                                                     | Las dos tarjetas pasan a ser una                                                           |
| **Tienen prisa**                           | «Nota» de la mesa: «tienen prisa»                                                                   | Sale arriba de la tarjeta                                                                  |
| **Lo quieren todo ya**                     | «Marchar todo»                                                                                      | Todo en marcha a la vez                                                                    |
| **Un plato del 2.º lo quieren antes**      | En su línea, «Sale en el 1.º»                                                                       | Sale en el 1.º                                                                             |
| **Alergia en la mesa**                     | Antes de mandar un plato que la lleva, aviso (Anexo 3.1)                                            | Banda roja arriba                                                                          |
| **Se agota algo con comandas ya mandadas** | Aviso en la mesa que lo tiene pedido: «Pulpo agotado, cámbialo»                                     | «Agotar un plato» desde cocina                                                             |
| **Más menús que personas, o menos**        | «¿Cuántos menús?» no depende de cuántos son                                                         | Nada                                                                                       |
| **Se van sin pagar**                       | Anular la mesa con permiso y motivo «se fue sin pagar»; lo servido baja del almacén como pérdida    | Nada                                                                                       |
| **Dos camareros tocan la misma mesa**      | No se bloquea: lo de los dos se suma, y se ve en «lo que ha pasado»                                 | Nada                                                                                       |
| **Se cae internet**                        | Con Estook Link sigue todo igual; sin Link, aviso grande: «la cocina aún no lo recibe» (Anexo 3.6)  | Con Link recibe; sin Link, nada hasta que vuelva                                           |
| **Tachado sin querer**                     | El ✓ desaparece al destacharlo                                                                      | Otro toque, o «Deshacer el último»                                                         |
| **Una mesa a «Fuera» por error**           | Vuelve a tener platos pendientes                                                                    | «Recuperar»                                                                                |
| **Postres**                                | Al final; lo del menú sin cobrar, lo de la carta aparte                                             | Llegan ya en marcha como «Mesa 6 · postres»                                                |
| **Delivery**                               | Hasta que se conecte la plataforma (M29), se pica como «Delivery»                                   | Con la moto y la hora del repartidor                                                       |

**Lo que la cocina nunca ve: un importe** (Anexo 3.2). **Ni la pantalla de cocina pide PIN** para tachar
(Anexo 3.4).

## 4 · El orden

Richi dijo «ponte a ello» con el orden propuesto el 22-oct, que corrige la [0061](0061-el-orden-y-la-infraestructura.md):

1. **M20A · 1 · Sala y cocina en pantalla**: tomar nota, el plano, los pases, la pantalla de cocina y
   «Fuera», por internet y sin imprimir ni cobrar. Es lo que se puede probar ya en IKATZ con dos
   tablets.
2. **M19a · Estook Link**: imprimir (la comanda en papel, la cuenta) y sala y cocina sin internet.
3. **M20B · Facturación** (con el asesor) y **M20C · Cobro y caja**, y con el cobro, **M20 · el motor
   que resta del almacén** lo vendido.
4. **Revo conectado** (M18), cuando Revo dé acceso, por el mismo motor.

M20 ya no va el primero: sin cobro no hay ventas que mover ([el plan](../m20-ventas-y-consumo.md)).

## 5 · Lo que decidí yo, y Richi puede cambiar

1. **«VUELVE»** para el plato devuelto que se rehace, arriba del todo, y lo tirado como merma.
2. **«Se fue sin pagar»** como motivo de anular: lo servido baja del almacén como pérdida.
3. **El aviso de agotado a la mesa que lo tiene pedido**, además del aviso de M10 · 1 al equipo.
4. **5 segundos para deshacer** el paso a «Fuera», como Square (3 s) con un poco más de margen.
5. **«Mesas de quien ha fichado la salida»** en el plano, para que no se queden sin dueño.
6. **La copa de vino de 150 ml y la copa de 50 ml** como lo que Estook propone (lo habitual va de 100 a
   150 ml de vino y de 40 a 60 de destilado); el local lo cambia una vez.
7. **El orden de las tarjetas en cocina**: lo marchado más reciente destacado arriba, lo que va tarde
   sube, y lo que espera la marcha, abajo y pequeño.

## 6 · Lo que esto deja escrito para quien lo construya

- `linea_de_cuenta` gana **«salió» con su hora y quién** (la tachó), y lo que ya tenía el Anexo 7.3
  (`lista_en`) se usa para eso: **no hay un estado «listo» aparte del tachado**.
- **La partida desaparece del primer paso**: `partida` y `pantalla_de_cocina` del Anexo 7.3 se quedan
  sin construir; si un local grande la pide, vuelve.
- **La tanda es el pase** (1.º, 2.º…), con su «marchada en» y quién la marchó; y la cuenta guarda **«por
  pases» o «todo junto»**.
- **La sección de la carta gana «comida o bebida»**, que decide la pestaña y si va a cocina o a la
  barra.
- **Varias raciones del mismo producto** (caña, doble y jarra) y **las copas que se hacen solas**
  necesitan ampliar «Desde el almacén» (M9 · 2) y Escandallos; **los cafés hechos**, unas recetas de
  serie como las de la 0021.
