# 0107 · Estook TPV entero: una aplicación aparte con su inicio, los aparatos vinculados, el PIN, la caja, el plano en el TPV y los productos elegidos

**Fecha:** 23 de octubre de 2026
**Estado:** decidido con Richi sobre las maquetas y sus once respuestas, sin construir.
**Sigue:** el Anexo de TPV y facturación, que pasa a la versión 1.4 y gana el **capítulo 11, la
especificación entera** de Estook TPV; y el plan de construcción,
[`m20a-la-sala-y-la-cocina.md`](../m20a-la-sala-y-la-cocina.md), con sus entregas nuevas.
**Sustituye:** de la [0106](0106-estook-tpv-la-sala-y-la-cocina.md), las tres pestañas Bebidas · Carta
· Menú del día (punto 1), «cada sección se marca como comida o como bebida» (punto 20), que todo se
configure en Estook y nunca en el TPV (puntos 19 a 23: se monta en el TPV, con los mismos datos) y su
orden (apartado 4); de la [0056](0056-estook-tpv-su-puerta-y-estook-link.md), que un móvil personal
entre al TPV desde Estook; y de la [0057](0057-quien-es-quien-en-el-tpv.md), las funciones del
terminal (sala, barra, cocina, pase, fichar), el bloqueo al minuto y que se dé de alta en Estook ›
Ajustes › Terminales. **Lo demás de las tres sigue valiendo.**
**Cambia:** el Anexo (versión 1.4: el capítulo 11 nuevo, y 3.1, 3.2, 3.4, 3.7, 6.5, 7, 10.1 a 10.4 y
10.11), el Plan (M20A y el orden de la Fase 4), Roles 1.12, la Arquitectura (capítulos 5, 6 y 8), el
mapa y ESTADO.

Las maquetas, en una página privada de Richi:
[Estook TPV · el TPV completo](https://claude.ai/artifact/EUZuQhUJSg13As8qeUWk5X). Mandan sobre el
aspecto; el Anexo, capítulo 11, manda sobre lo que hace cada pantalla.

## 1 · Cómo se llegó aquí

El 23-oct, con M20A · 1 · 2 ya fusionada (#131: la sala en `estook.com/tpv/`, «Tu sala» y «Es de
bebidas» en Estook), Richi la rechazó: **«poco intuitivo… no está a la altura»**. Lo que pedía era
un TPV profesional, como los que ya se venden, y lo construido era un comandero metido en el flujo
de Estook: sin inicio, sin caja, sin aparatos, con el plano dibujado en Estook y entrando con la
sesión de cada uno. Pidió investigar a fondo cómo lo hacen los mejores —las cajas, los móviles, cómo
se vinculan y cómo se sabe cuál es cuál, el acceso, las ventas, las mesas, el mapeado— y preguntarle
con detalle. **«Estook app ya está listo. No agregues más ahí: tiene que ser el TPV.»**

Se miró Square (códigos de un solo uso para cada aparato, de 5 minutos, con su modo; el plano y las
secciones), Toast (al montar el aparato se elige su modo, la impresora y el cajón; el código de cada
empleado), Revo (el tipo de cada aparato, el control de caja Simple/Completo/Ciego con su fondo, X y
Z, las órdenes de plato en pestañas antes del producto, la impresión por destino), Lightspeed (el
editor de la sala dentro del TPV con mesas, sillas y suelos; los centros de producción que deciden
dónde sale cada grupo de productos), Loyverse (abrir turno, entradas y salidas, lo esperado frente a
lo contado), TableIn y los TPV españoles (ClassicGes, Glop, Sysme: los salones se dibujan en el
propio TPV). Y lo que no es de nadie: cómo imprime una web (no puede abrir la impresora por la red:
Link o la cáscara), los datáfonos en España (Redsys TPV-PC con pinpad certificado, Stripe Terminal
con lectores inteligentes) y las fechas de VeriFactu (Real Decreto-ley 15/2025).

Se le enseñaron 13 maquetas y 10 preguntas. Contestó el mismo día.

## 2 · Las respuestas de Richi, tal cual las dio

| #   | Pregunta                         | Respuesta                                                                                                                                                                                                                                                 |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿TPV entero, con el cobro legal? | **Sí**, «pero actualiza documentos y que quede claro y optimizado, que no confundan, para evitar el vibe coding»                                                                                                                                          |
| 2   | ¿Qué aparatos?                   | **Todos**: «no es lo que yo tenga: esta app será para venderla a otros locales, y tendrán Windows con caja conectada, o tablet, o móviles… investiga para todos»                                                                                          |
| 3   | ¿Cómo se vincula un aparato?     | **«Como hagan las mejores apps, y la más segura»**                                                                                                                                                                                                        |
| 4   | ¿Bloqueo con PIN?                | **Sí**: tras cada cobro y a los 2 minutos en la caja compartida; a los 10 en el móvil personal                                                                                                                                                            |
| 5   | ¿Qué mesas ve un camarero?       | **Todas**: «tienen que tener control de toda la sala, pero pueden filtrar para ver solo las suyas, y deberían ver de quién son las otras»                                                                                                                 |
| 6   | ¿Cómo llegan los platos al TPV?  | «Es de bebidas» **no se entiende**: «explícalo bien o busca otra opción mejor, tal vez añadiendo los platos desde el TPV y eligiéndolos, no que se añadan directamente, o que te deje exportar todos o hacerlo desde 0… si hay alguna app, usa su método» |
| 7   | ¿Medidas de las mesas?           | **A ojo**: «cm no tiene sentido, nadie se pone a medir las mesas». Y en todo, **ahorrar trabajo**: fácil e intuitivo, pero que funcione perfectamente                                                                                                     |
| 8   | ¿Claro u oscuro?                 | **Oscuro**                                                                                                                                                                                                                                                |
| 9   | ¿La caja?                        | **Lo que recomiende la IA**: una caja por cajón y el cierre ciego de fábrica                                                                                                                                                                              |
| 10  | ¿Las maquetas?                   | **Van por buen camino**, «mucho mejor que las anteriores»; mejorarlas donde se pueda, «parecido pero sin copiarlo, el funcionamiento sí»                                                                                                                  |
| 11  | (extra)                          | **«Hay que definir todo, dejarlo bien definido y escrito en documentos para evitar el vibe coding a futuro, teniendo en cuenta los detalles»**                                                                                                            |

## 3 · Lo que se decide

### Qué es Estook TPV

1. **Una aplicación aparte**, `apps/tpv` en `estook.com/tpv/`, con su icono, su tema oscuro y **su
   pantalla de inicio**. Comparte la base, la API, los permisos y los PIN con Estook (0056), pero **no
   se entra con la sesión de nadie**: **Estook TPV solo funciona en un aparato vinculado al local**.
2. **La frontera, dicha una vez** (Anexo 11.1): en **Estook** se gestiona —la carta con sus precios y
   escandallos, el almacén, el equipo, Negocio—; en **Estook TPV** se vende y se monta lo de vender
   —el plano, qué se vende y en qué botón, quién lo prepara, los aparatos, las impresoras, la caja, el
   PIN—. **Las dos escriben en los mismos datos**: un plato creado en el TPV es un plato de la carta.
   **En Estook no se añade nada más para el TPV**, y salen de allí «Tu sala», «Abrir la sala» y «Es
   de bebidas».

### Los aparatos y cómo se vinculan

3. **Vale cualquier aparato de un local** (Anexo 11.2): un ordenador con Windows táctil con su cajón
   e impresora, una tablet Android o un iPad, los móviles Android o iPhone de los camareros, y una
   pantalla en cocina. Se instala desde el navegador (Edge, Chrome o Safari); la cáscara nativa solo
   hace falta en el iPad que imprime sin Link (Anexo 6.3).
4. **Cada aparato se vincula una vez y se le dice qué es** (Anexo 11.3), como Square y Toast: la
   función **no se adivina nunca**. Cinco funciones: **Caja · Comandero · Pantalla de cocina ·
   Pantalla de barra · Fichar**. Un comandero puede ser **compartido** (la tablet de la terraza) o
   **personal** (el móvil de Sara, que solo abre Sara).
5. **Vincular, lo más seguro** (Anexo 11.3): **el primer aparato** del local lo vincula quien lo lleva,
   entrando con su correo y contraseña en ese aparato (y su doble factor si lo tiene). Su sesión
   personal **se cierra al acabar**: el aparato se queda con **su propia llave**, la de 0068. **Los
   demás**, desde cualquier TPV vinculado, en Ajustes del TPV › Aparatos: se elige la función y el
   nombre **antes**, y sale **un código de 6 cifras y su QR, de un solo uso, que caduca a los 10
   minutos y muere a los 5 intentos fallidos**. En el aparato nuevo se abre `estook.com/tpv/`, se
   escribe el código o se lee el QR, y ya está. **Desvincular** lo deja sin valer en la petición
   siguiente. **Si se pierden todos**, el gerente vincula uno nuevo con su correo y desvincula los
   demás desde él.

### Entrar y bloquear

6. **Se entra con el PIN de cada uno**, 4 cifras, único en el local (lo que ya existe desde M1):
   **teclearlo es todo**, sin buscar la cara antes. Los PIN fáciles (0000, 1234, 1111…) no valen al
   ponerlos. Cinco fallos de una persona la paran 15 minutos; diez fallos seguidos en un aparato lo
   paran 5 (lo que ya hace fichar, 0068).
7. **El bloqueo** (respuesta 4): en la **caja y el comandero compartido**, **al acabar cada cobro y a
   los 2 minutos sin tocar**; en el **comandero personal**, **a los 10 minutos**; **la pantalla de
   cocina y la de barra no se bloquean** (no tienen operador). El gerente lo ajusta en Ajustes del TPV
   › PIN y bloqueo.
8. **Fichar y entrar son el mismo PIN** (0057): a quien no ha fichado se le ofrece fichar en un toque.

### El inicio, la caja y las ventas

9. **Una pantalla de inicio** (Anexo 11.5) con lo que el operador puede hacer en ese aparato: Mesas,
   Venta rápida, Para llevar y reparto, Caja, Ventas de hoy, Fichar, Agotados y Ajustes del TPV; y
   «Ahora», con la caja, las mesas abiertas y los avisos. **El primer operador del día cae en el
   inicio; tras un bloqueo, el siguiente cae en las mesas** (o en Venta rápida, si el local no tiene
   mesas), que es lo que se hace el 90 % de las veces.
10. **La caja** (respuesta 9, Anexo 11.6): **una caja por cajón**, abierta con su fondo (se propone lo
    que se dejó ayer), entradas y salidas con motivo, abrir el cajón sin venta con permiso y rastro,
    el informe X, y **el cierre ciego de fábrica**: se cuenta por billetes y monedas sin ver lo
    esperado, se escribe el total del datáfono, y se dice cuánto se queda para mañana. **Nunca bloquea
    el servicio**: se toma nota con la caja cerrada, y lo único que la pide es cobrar en efectivo, que
    la abre en el mismo gesto.
11. **Ventas de hoy** (Anexo 11.7): cada ticket con su hora, mesa, camarero, forma de pago y total; y
    desde él reimprimir (copia), **factura** (el canje), **cambiar la forma de pago** y **devolver**
    (la rectificativa). **Un ticket emitido no se «reabre»**: se devuelve y se vuelve a cobrar.

### Las mesas

12. **Todos ven todas las mesas y pueden hacer de todo en cualquiera** (respuesta 5, Anexo 11.8). Cada
    mesa lleva **las iniciales de su camarero**, y el filtro **«Mías»** está a un toque (y el aparato
    lo recuerda). **La venta es del camarero de la mesa**, y cada plato queda a nombre de quien lo
    pidió. **Cualquier camarero puede quedarse una mesa o pasarla a otro**, con rastro: es lo que pide
    «el control de todo», y cambia Roles 1.12, donde el camarero solo pasaba las suyas.
13. **El plano se dibuja en el TPV** (Anexo 11.9): salas como pestañas, mesas cuadradas, redondas,
    rectangulares, ovaladas y alargadas, taburetes, la barra, paredes, columnas, puertas, plantas y textos;
    **todo a ojo** (respuesta 7): se arrastra, se estira desde las esquinas y se gira, **sin un solo
    número de centímetros**; al elegir cuántas plazas tiene una mesa, toma un tamaño razonable sola; y
    se empieza desde una plantilla. **«Tu sala» sale de Estook.**

### Pedir

14. **Los pases, en pestañas encima de la cuenta**, como Revo (Anexo 11.10): **Bebidas · 1.º · 2.º ·
    3.º · Postre**. **Lo que se toca va al pase marcado**, y **al cambiar de página se marca solo el de
    esa página** (Entrantes marca el 1.º; Principales, el 2.º; las bebidas, Bebidas), así que casi
    nunca se toca la pestaña. Las reglas de la 0106 no cambian: marcha el camarero, el botón grande
    dice lo siguiente, las bebidas van a la barra.

### Los productos del TPV (respuesta 6)

15. **«Es de bebidas» desaparece.** Lo que hacía lo dicen ahora dos preguntas que se entienden solas
    (Anexo 11.11), y que se contestan **en el TPV**, por página y, si hace falta, por producto:
    - **«¿Quién lo prepara?» Cocina · Barra · Nadie (se sirve tal cual)**. Decide a qué pantalla o
      impresora va. Es lo que Lightspeed llama centro de producción y Revo, destino de impresión.
    - **«¿En qué pase sale?» Bebidas (al momento) · 1.º · 2.º · 3.º · Postre**. Decide la pestaña que
      se marca sola.
      Las dos vienen **propuestas por el nombre** de la sección (Vinos → Barra y Bebidas; Entrantes →
      Cocina y 1.º), y se cambian con un toque. Lo que ya estaba marcado «de bebidas» pasa a Barra y
      Bebidas sin que nadie haga nada.
16. **La botonera**: lo que sale en el TPV es una capa encima de la carta, como el «Item grid» de
    Square: qué productos, en qué página, en qué orden y de qué color. La carta no se copia: **el
    precio, el IVA, la foto, los alérgenos y el escandallo siguen siendo los de la carta**.
17. **Al empezar, tres caminos** (Anexo 11.11), justo lo que pidió Richi:
    - **Traer toda la carta**: cada sección, una página. Lo nuevo de la carta **entra solo**.
    - **Elegir lo que se vende aquí**: la carta con casillas, sección a sección. Lo nuevo de la carta
      **no entra solo**: sale en «Nuevos en la carta» con «Añadir» de un toque.
    - **Empezar de cero**: se crean los productos en el TPV (nombre, precio, página y quién lo
      prepara; el IVA se propone). **Se crean también en la carta de Estook**, marcados «sin
      escandallo» para completarlos allí si se quiere (0095).
18. **Lo de las bebidas que la 0106 dejaba en Estook se monta en el TPV**: «Monta tus bebidas» (las
    del almacén, con sus páginas y sus precios de una vez), las copas por marca con «¿Con qué?» y
    los cafés hechos, en Ajustes del TPV › Productos. Lo que guardan es lo de siempre —la carta y su
    escandallo «tal cual» o con receta—, así que el almacén descuenta igual.

### Cómo se ve

19. **Oscuro** (respuesta 8), denso como Revo, con botones de 48 px o más en la caja y de 44 px en el
    móvil, el estado de cada mesa con color **e** icono, y el aspecto de las maquetas (Anexo 11.12).

### El cobro legal

20. **El TPV entero incluye cobrar con su ticket legal** (respuesta 1): la facturación VeriFactu (M20B)
    y el cobro y la caja (M20C) entran en el mismo bloque, en el orden de la sección 5. **Ningún local
    cobra con Estook TPV hasta que M20B esté entero** (Anexo, capítulo 9): vender un programa de
    facturación que no cumple ya está prohibido desde el 29-jul-2025.

## 4 · Qué pasa con lo que ya está en producción (#130 y #131)

| Pieza                                                                | Qué pasa                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| La base y la API de la sala y la cocina (0081, 1 · 1)                | **Se quedan**: las mesas, las cuentas, los pases, mandar, marchar y tachar no cambian                  |
| `estook.com/tpv/` y sus pantallas (1 · 2)                            | **Se rehacen** en las entregas T1 a T3, sobre el mismo servidor                                        |
| «Tu sala» en Estook › Ajustes y «Abrir la sala» en Servicio          | **Salen de Estook** en T1; el plano se dibuja en el TPV desde T2                                       |
| El interruptor «Es de bebidas» de la Carta y `es_bebida` (0082)      | **Salen** en T3: `es_bebida` pasa a «quién lo prepara: Barra» y «pase: Bebidas», y se quita la columna |
| `la_carta_de_la_sala`, `el_plano_del_local`, las 6 órdenes del plano | Se quedan y crecen (las formas, el giro, las paredes y la botonera)                                    |
| El aparato para fichar (0068)                                        | Es la misma tabla `terminal`: gana las otras cuatro funciones y el código de vincular                  |

## 5 · El orden nuevo

El que había (0106: M20A · 1 · 3 la cocina → 1 · 4 las bebidas en Estook → M19a → …) se cambia por
este. Cada entrega se fusiona, se prueba en IKATZ y deja algo que se usa; el detalle de cada una, con
lo que tiene que cumplir para darla por buena, en [el plan](../m20a-la-sala-y-la-cocina.md).

1. **T1 · La puerta**: vincular aparatos, sus funciones, el PIN y el bloqueo, el inicio y el tema
   oscuro; y fuera de Estook lo que no es suyo.
2. **T2 · La sala**: el editor del plano en el TPV, el plano con sus dueños, pedir con los pases en
   pestañas, y el comandero en el móvil.
3. **T3 · Los productos**: la botonera, los tres caminos, quién lo prepara y en qué pase, las opciones,
   «Monta tus bebidas», las copas y los cafés.
4. **T4 · La cocina y la barra**: sus pantallas (lo que era 1 · 3).
5. **T5 · Estook Link (M19a)**: imprimir la comanda y la cuenta, el cajón, y sin internet.
6. **T6 · La facturación (M20B)**, con Verifacti y el asesor.
7. **T7 · Cobrar, la caja y las ventas (M20C)**, con el motor que resta del almacén (M20).
8. **Después, local a local**: el datáfono conectado, los pedidos de reparto (M29) y Revo conectado
   (M18).

## 6 · Lo que decidí yo, y Richi puede cambiar

1. **Estook TPV solo en aparatos vinculados**, sin entrar con correo salvo para vincular el primero:
   un TPV donde cada uno entra con su cuenta mezcla al dueño con el aparato, y es lo que no hacen Square
   ni Toast.
2. **10 minutos y 5 intentos** para el código de vincular (Square da 5 minutos): da tiempo a ir a por
   la tablet de la terraza.
3. **Solo el PIN, sin elegir la cara antes**: es un toque menos cada vez, y el PIN ya es único en el
   local.
4. **Tras un bloqueo, a las mesas y no al inicio**: el siguiente camarero viene a pedir.
5. **Cualquier camarero se queda o pasa cualquier mesa**, con rastro (lectura de «el control de todo»).
6. **Las opciones de la mesa** siguen las de la 0106, con «Quedármela» además de «Pasar a otro
   camarero».
7. **Tres funciones de pantalla en vez de cinco**: «Pase» desaparece (0106 ya lo quitó: cada tarjeta
   es el pase de su mesa) y «Sala» y «Barra» de la 0057 son ahora **Caja** (con cajón) y **Comandero**
   (sin cajón), que es la diferencia que de verdad importa.
8. **«Cambiar la forma de pago»** de un ticket, con permiso y rastro, sin rectificativa: la forma de
   pago no va en el registro de VeriFactu **[VERIFICAR con el asesor]**; mueve la caja.
9. **Un producto en una sola página**, más la página automática **«Lo más pedido»** de esa franja.
10. **Sin terceros puestos de preparación** («Horno», «Barra de la terraza») en la primera entrega: solo
    Cocina, Barra y Nadie. Se abre cuando un local lo pida, sin cambiar el modelo.
