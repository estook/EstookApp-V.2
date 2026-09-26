# 0051 · La auditoría del 26-sep: nada se esconde por vacío, las mermas a la vista y Google con el punto exacto

**Fecha:** 26 de septiembre de 2026
**Estado:** decidido. Sin migración
**Cambia:** «lo vacío se aparta» del Panel ([0039](0039-el-panel-se-monta-como-un-movil.md)); «Hoy» y el
Tablón sin nada, que no salían ([0047](0047-lo-que-se-ordena.md), [0049](0049-almacen-inventario-congelado-tablon-y-carta.md));
las mermas como vista de Movimientos (M6½); y «Tu local en Google» en Conexiones ([0040](0040-el-local-se-busca-en-google-con-tope.md))

## Lo que pidió Richi (26-sep)

1. «El Tablón y otras cosas que hemos hablado no los veo en el Panel.»
2. «Mejor que no se oculten, así no se les pasa y revisan que está todo ok.»
3. «Dónde está el local» y «Tu local en Google» son dos cosas que van juntas y estaban
   separadas: juntarlas en Tu local, y explicar que la manual es para el punto exacto.
4. «Las mermas son importantes y están escondidas»: a la primera pantalla de Almacén,
   al final, con su icono.

Y una auditoría completa por roles: fallos, errores y lo que se pueda mejorar.

## Lo que se decide

- **Nada del Panel se esconde por estar vacío.** Cada tarjeta dice su vacío («Nada caduca
  en los próximos siete días»). «Hoy» sin nada es una línea, «Todo en orden: nada
  urgente para hoy», y el Tablón sin notas, «Sin avisos» con su «Escribir».
- **Las mermas son el quinto destino de Almacén**, con la papelera: Resumen, Productos,
  Movimientos, Compras y Mermas. `/almacen/movimientos/mermas` lleva a `/almacen/mermas`.
  La tarjeta «Merma de hoy» del Panel lleva la misma papelera.
- **«Dónde está tu local»**, en Tu local: buscar el local en Google, y debajo, plegado si
  Google ya dio la posición, **«Marcar a mano el punto exacto»**, que manda. Conexiones se
  queda con las ventas.
- **Quien abre una pantalla que no es suya vuelve al Panel y se le dice**: «Esa pantalla
  no está entre tus apps».
- **La barra del móvil con cinco destinos o más**: «Apps» se queda en su icono de color, y
  por debajo de 360 px solo lleva palabra el destino activo.
- **La barra del ordenador**: los iconos no se encogen; la flechita de cada app, desde
  1536 px.
- **El buscador**: empezar una palabra cuenta como empezar el nombre, y a igualdad gana el
  más corto: «alma» trae «Ir a Almacén» antes que sus cinco destinos.

## Lo que salió de la auditoría, y se arregló

El recorrido automático —siete roles, ordenador y móvil, todas las pantallas— no encontró
errores de consola, llamadas fallidas, desbordes ni textos rotos. A ojo salieron: los
iconos de la barra encogidos a un punto con ocho apps; «← ← Grupo Costa»; seis botones
naranjas pegados en la lista de locales y cuatro carteles grandes de lo que todavía no
existe; «en línea» dos veces en Equipo; un punto suelto en «Tu marca»; dos tarjetas
llamadas casi igual para la carta; y «¿Cómo entran tus ventas?» en cuatro sitios (se
quita de Negocio · Ventas).

## Lo que queda anotado, sin arreglar

- **El mosaico del Panel deja algún hueco** cuando una tarjeta de dos columnas no cabe al
  lado de otra alta: el orden denso no lo puede llenar sin cambiar el orden que eligió
  cada uno.
- **El «+» flotante del móvil tapa lo que quede debajo** en ese momento, como todo botón
  flotante; se aparta al bajar.
