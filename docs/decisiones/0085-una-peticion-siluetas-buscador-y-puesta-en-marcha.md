# 0085 · El Panel en una sola petición, las siluetas de carga, el buscador con pedidos, facturas y recientes, y la puesta en marcha

**Fecha:** 15 de octubre de 2026
**Estado:** construido el 15-oct, en su pull request. **Con una migración** (`0067_el_buscador_encuentra_pedidos_y_facturas`: solo la función del buscador, sin datos) y **con despliegue de la API**: **83 consultas** (llega `la_puesta_en_marcha`), **176 comandos** y una ruta nueva, `POST /v1/consultas/varias`. Sin secretos nuevos.
**Cambia:** nada de los maestros. La API pasa de dos rutas a tres: la tercera es la primera en lote.

Lo pidió Richi el 15-oct, con la #102 en producción («lo he probado y todo genial»): una entrega corta con cuatro mejoras antes de M9.

## Lo que pidió Richi, y lo que se hace

1. **«Una sola petición para todo el Panel: hoy son unas diez, y con mala cobertura se nota.»** Eran **trece, en dos tandas**: ocho al abrir y, cuando llegaba dónde va cada widget, otras cinco. Ahora:
   - **La API contesta varias consultas en una petición** (`POST /v1/consultas/varias`, hasta 24). **Cada una pasa por su camino de siempre** —sus cinco puertas, su permiso y su transacción—, así que venir en lote no abre nada: la camarera recibe «sin permiso» en las mismas que si llegaran solas. Una que falla no tumba a las demás.
   - **El cliente junta lo que sale a la vez** (8 ms de espera) y reparte a cada pantalla lo suyo. Una consulta suelta sigue yendo sola. No hay que tocar ninguna pantalla: vale para el Panel, la campana y cualquier app que pida varias cosas al abrir.
   - **El Panel recuerda su última colocación** en el aparato y pinta los widgets desde el primer momento, así que lo de los widgets viaja **en la misma petición** que lo de arriba. El Ventas sin cajas usa la consulta que ya viaja («¿Cómo entran tus ventas?») en vez de pedir otra después.
   - **Sin señal, igual que antes**: cada consulta se guarda en el móvil por separado (I · 0070), y sin red no sale ninguna petición.
   - **Con la API de antes, igual que antes**: la web se publica al fusionar y la API se despliega después. En ese rato la app pide el lote, la API vieja contesta 404 y desde ahí todo va suelto. Lo prueba una prueba de pantalla.
   - Medido en local con la gerente: **`quien_soy` y un solo lote de catorce consultas** (antes, trece peticiones).
2. **Siluetas con la forma real de cada widget y de cada lista.** `Cargando` lleva una `forma`: la cifra con su gráfica recortada, el anillo de la jornada con su botón, los medidores en redondo, las barras de nivel, las casillas de los días, las caras apiladas, la línea del tiempo, las listas con su cara o su foto, y el mosaico. **48 sitios** de la app la llevan ya (los widgets, Productos, Mermas, Movimientos, Compras, Equipo, el chat, el horario…). Lo que queda con rayas es texto suelto, donde la silueta es eso.
3. **El buscador.**
   - **Pedidos y facturas por número o por proveedor** (0067): «12», «nº 12» o «pedido 12» encuentran el pedido 12; «871» o «ZB-2026/00871», la factura; «makro», a Makro y debajo **sus tres últimos** pedidos y facturas. Cada uno **abre su ficha** encima de su lista, en su local. Las facturas, solo a quien ve los precios de compra; los pedidos, a quien tiene Almacén. Un número de una cifra ya se puede buscar.
   - **Lo último abierto**: con la caja vacía salen las seis últimas cosas que abriste desde el buscador, y un toque las abre otra vez. Con «Borrar». Son de cada persona en su aparato y **se borran al salir de la app**.
4. **La puesta en marcha.** Arriba del Panel, debajo del recorrido: **«Pon en marcha {tu local}»**, con un anillo («1/5») y cinco pasos —tu logo, tu primer producto, tus proveedores, publicar el horario, invitar a tu equipo—. **Un toque lleva a hacerlo**, con lo que abre ya abierto. **Lo hecho lo mide el servidor** con lo que hay de verdad en el local (`la_puesta_en_marcha`), y lo de ejemplo no cuenta. **Con todo hecho no sale**, y quien termina el último paso ve una vez «Tu local ya está en marcha». No sale en los locales de ejemplo ni a quien ya lo tiene todo.

## Lo que decidí al construirlo

1. Que **el lote sea una ruta y no una consulta más**: una consulta que llama a otras tendría que copiar las puertas del despachador, y lo que se copia se olvida en la operación cuarenta. Así cada pieza pasa por el mismo `consultar` de siempre.
2. Que la ruta sea **`POST /v1/consultas/varias`** y no `/v1/consultas`: con otra forma, el enrutador de Hono dejaba de encontrar **todas** las rutas de `/v1` (lección 179).
3. Que el cliente espere **8 ms** antes de mandar: lo bastante para que todo el Panel salga junto y nada que se note en una consulta suelta.
4. Que la colocación recordada sean **solo los nombres de los widgets**, por persona y aparato: no lleva ningún dato. Mientras llega la de verdad, el Panel se mira pero no se edita.
5. Que **la puesta en marcha sustituya a «Termina de configurar» mientras está a la vista**: dos tarjetas de arrancar el local, una encima de otra, son una de más. Lo que falte del alta vuelve en cuanto la otra se acaba. **«No me lo recuerdes más» es el mismo de las dos**: no hace falta migración.
6. Que cada paso salga **solo a quien lo puede dar**: el logo, a quien edita Ajustes; el género y los proveedores, a quien edita el Almacén; el horario, a quien lo publica; el equipo, a quien invita.
7. Que «el equipo» esté hecho con **una persona más con acceso vivo** al local, y «el horario», con **una semana publicada** alguna vez.
8. Que el buscador guarde **lo abierto y no lo escrito**: lo que se busca dos veces es lo que se abre dos veces, y «salm» no le dice nada a nadie.
9. Que los estados en el buscador digan **lo mismo que Compras** («Borrador», «Mandado», «Sin comprobar»…).

## Lo que no se hace, y por qué

- **Juntar también los comandos**: cada comando lleva su clave de idempotencia y su respuesta; juntarlos mezclaría lo que se guarda con lo que no. Al abrir el Panel salen dos (`sigo_aqui` y abrir el chat), que no esperan a nada.
- **Las búsquedas recientes en la cuenta**, en todos los aparatos: haría falta una tabla y no se ha pedido. Si se echa de menos, va en `preferencias_de_persona`.
- **Albaranes en el buscador**: se llega a ellos desde su pedido.
