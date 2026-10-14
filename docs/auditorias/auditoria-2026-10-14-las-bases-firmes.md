# Auditoría del 14 de octubre de 2026 · las bases firmes

Pedida por Richi el 14-oct, con la #101 (la experiencia) en producción: «audita por roles, prueba fallos de
todo tipo, seguridad (qué ve quién, datos cruzados…), información, base de datos o fallos visuales; pule
absolutamente todo». Hecha con la API de pruebas y un mes de caja y de horas (`CON_HISTORIA=1`), en claro y en
oscuro, en un móvil de 390, un portátil de 1.440 y un monitor de 1.920; con sondas contra la API como cada rol de
ejemplo; leyendo el código de cada pantalla que se tocó; y contra la base de producción **solo en lectura** (el
buscador, dentro de una transacción que se deshace).

Lo que se hizo con cada cosa está en la decisión [0084](../decisiones/0084-las-bases-firmes.md). Aquí, **qué se
encontró y por qué importaba**.

## 1 · Fallos

| #   | Qué                                                                                                                                                                                                            | Gravedad | Hecho                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Todo resultado del buscador llevaba al Panel.** La base encontraba (probado en producción: «cerv» da Cerveza, «hector» da Héctor), y la prueba de la API estaba en verde; ninguna prueba tocaba el resultado | Alta     | Cada resultado abre su ficha, en su local. Dos pruebas de pantalla que lo tocan                                           |
| F2  | **Lo corto no pasaba el umbral**: «sal» contra «Lomo de salmón», 0,19; «chulet», 0,23. Y había ruido: «santi» traía a quien tuviera «s» y «t» en el correo                                                     | Media    | 0065: parecido por palabras y que la palabra empiece; lo que se parece menos de la mitad del mejor no sale                |
| F3  | **El buscador enseñaba el género a quien no tiene Almacén** (un camarero encontraba productos que no podía abrir) **y los correos del equipo a cualquiera del local**                                          | Media    | 0065: el género a quien tiene Almacén en ese local; las personas, a quien tiene Equipo. Pruebas que fallan sin el arreglo |
| F4  | **Los widgets dejaban huecos** al mezclar pequeños y anchos (la merma sola en el móvil, media fila en blanco) y escalones de alturas distintas                                                                 | Media    | Filas completas, sin huecos, del mismo alto (`colocarEnFilas`, con su prueba)                                             |
| F5  | **El dato de una gráfica salía fuera del widget** en un punto bajo: el bocadillo se pintaba debajo y la tarjeta lo recortaba                                                                                   | Media    | Sin bocadillo en las pequeñas: el número grande pasa a ser el del día; en el detalle, siempre dentro                      |
| F6  | **Cada gráfica pequeña esperaba a Recharts** (un trozo de 393 KB sin comprimir, 108 KB comprimido, que no se guarda al instalar): sin él, el Panel enseñaba recuadros grises                                   | Media    | Dibujo propio, al momento (`LineaViva`, con su prueba). Recharts solo en el detalle                                       |
| F7  | **El paquete inicial había subido a 364 KB** comprimidos (318 el 26-sep): se bajaba el código de todas las pantallas para pintar el Panel                                                                      | Media    | Cada app aparte y precargada en segundo plano: **294 KB**                                                                 |
| F8  | **`quien_soy` hacía unos diez viajes a la base en fila** y después esperaba a que el almacén firmara la foto, en cada arranque y cada vez que se volvía a la app                                               | Media    | Todo a la vez, y la foto en paralelo desde el principio                                                                   |
| F9  | **Las fotos se volvían a descargar** cada vez que la app se ponía al día: cada respuesta trae una firma nueva, y para el navegador es otra imagen (se veía parpadear el logo y la cara)                        | Baja     | El mismo enlace media hora (`enlaceEstable`, con su prueba)                                                               |
| F10 | **En el menú del ordenador se quedaban desplegadas** todas las apps por las que se pasaba                                                                                                                      | Baja     | Solo la app en la que estás                                                                                               |
| F11 | **«Cuándo es llegar tarde» decía «el horario de siempre de esa persona»**, y desde la 0081 solo cuenta el horario publicado                                                                                    | Baja     | Corregido                                                                                                                 |
| F12 | **El botón «Borrar lo escrito» del buscador** vaciaba la caja pero seguía preguntando por lo de antes, y la etiqueta de cada resultado salía en crudo («organizacion»)                                         | Baja     | Corregido                                                                                                                 |
| F13 | **La barra de arriba del ordenador repetía el local** en el Panel: estaba en el menú, en la barra y en el saludo                                                                                               | Baja     | En el Panel dice «Panel»                                                                                                  |

Lo que **no es un fallo** aunque lo parezca:

- En la prueba de pantalla, la captura «de página entera» de Playwright reinicia la animación de entrada de los
  widgets y salían medio transparentes. Es de la herramienta, no de la app: con la página quieta se ven bien.
- `cambiar_de_contexto` a un local de otra organización **contesta bien pero no cambia nada**: la resolución
  vuelve a elegir uno de los tuyos. Es como está pensado (M4), y no deja entrar.

## 2 · Seguridad por roles (qué ve quién, y datos cruzados)

Con sondas a la API de pruebas, como cada persona de ejemplo:

- **Entre organizaciones**, Rosa (Bar Centro) creó un producto y desde Grupo Costa y Casa Lola (Elena, Ignacio,
  Luis, Nuria y Pablo) se intentó, con sus identificadores: leer el producto, sus movimientos y sus mermas,
  desactivarlo, buscarlo; leer la ficha, los fichajes y las incidencias de Rosa; quién tiene acceso, los permisos
  y la ficha de Bar Centro; leer y escribir en su canal del chat; quitarle la foto; retirar el acceso a Marcos; y
  ver sus caras. **Nada**: «no existe», «sin permiso», «local ajeno» o una lista vacía, cada vez.
- **Dentro del local**, la camarera (Sara) no lee nada del almacén, del equipo, de la caja ni de las compras, y
  sus objetivos llegan vacíos; el cocinero (Marcos) ve el almacén **sin un solo importe**; la gerente (Rosa), todo
  menos la suscripción, que es de quien la paga.
- **Lo nuevo**: `las_caras` solo trae a quien ya ves (políticas de M1) y nada más que el nombre y la foto;
  `preferencias_de_persona` es solo de cada uno, como el Panel; el buscador, ver F3.

## 3 · La experiencia

| #   | Qué se vio                                                                                    | Lo que se hace                                                                   |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| E1  | «Apps» con el icono de la app y «Resumen» con el del Panel: **parecían cambiados**            | Casa para el Panel, ✦ para las apps, rejilla para el Resumen; siempre los mismos |
| E2  | **Dos logos** en el Panel del móvil                                                           | El de arriba entra al bajar                                                      |
| E3  | **El botón de desplegar el menú**, abajo del todo                                             | El logo del local lo despliega                                                   |
| E4  | **Ajustes · Tu local medía tres pantallas** de formularios abiertos con su párrafo cada uno   | Mosaico de tarjetas de una línea; cada una, en su hoja                           |
| E5  | En el móvil, dentro de una sección de Ajustes, **«Ajustes», «‹ Ajustes» y «Tu local»**        | El título es la sección                                                          |
| E6  | **Incidencias: la acción debajo** ensanchaba cada fila; «Abrir sus fichajes» partía el nombre | A la derecha, en la misma fila; una flecha                                       |
| E7  | **Un Panel de fábrica de ocho o diez widgets**, la mitad vacíos el primer día                 | Seis como mucho; el resto, primero al añadir («Para ti»)                         |
| E8  | **Caras sin foto** en el chat, las incidencias y «Mi turno», aunque la persona la tuviera     | `las_caras` y `CaraDe`                                                           |
| E9  | **Las mermas sin la foto del producto**                                                       | La miniatura en la lista y al buscar qué apuntar                                 |
| E10 | **Comparar con la semana anterior** obligaba a leer la flecha y el porcentaje                 | La línea gris discontinua, y «antes …» al señalar un día                         |

## 4 · Lo que queda mirado y no se toca en esta entrega

- **El texto de dentro de algunos ajustes** (los objetivos, el aparato para fichar) sigue siendo largo; ahora se
  lee de uno en uno, en su hoja. Va en las propuestas.
- **El admin** no cambia: lo usan dos personas.
