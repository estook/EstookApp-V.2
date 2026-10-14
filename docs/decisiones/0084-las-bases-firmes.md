# 0084 · Las bases firmes: el buscador que abre, el Panel en filas completas, gráficas ligeras con la semana anterior, Ajustes en mosaico, el recorrido y lo que recuerda tu cuenta

**Fecha:** 14 de octubre de 2026
**Estado:** construido el 14-oct, en su pull request. **Con dos migraciones** (`0065_el_buscador_que_encuentra`: la función del buscador; `0066_lo_que_recuerda_tu_cuenta`: una tabla nueva, `preferencias_de_persona`) y **con despliegue de la API**: **82 consultas** (llega `las_caras`) y **176 comandos** (llegan `poner_el_periodo_del_widget` y `ya_he_visto_el_recorrido`). Sin secretos nuevos.
**Cambia:** la tabla B3 del [Plan](../maestros/Estook-Plan-de-Desarrollo.md) (el Panel lleva la casa; el ✦ abre las apps; `layout-dashboard` es el Resumen de cada app) y el Panel de fábrica de cada puesto (seis widgets como mucho).

Lo pidió Richi el 14-oct, con la #101 en producción y antes de seguir con M9: «no podemos seguir de módulo hasta que dejemos unas bases fuertes, tanto de experiencia de usuario, UI/UX, seguridad, velocidad y app funcional y bonita». Ocho fallos con cuatro capturas, las seis mejoras que se le propusieron tras la 0083, y una auditoría por roles. Lo que se encontró, en la [auditoría del 14-oct](../auditorias/auditoria-2026-10-14-las-bases-firmes.md).

## Lo que pidió Richi, y lo que se hace

1. **«En Apps y Resumen los símbolos están al revés.»** Lo estaban: «Apps» llevaba el icono de la propia app (la caja de Almacén, las personas de Equipo) y «Resumen» el del Panel. Ahora hay **tres dibujos para tres cosas, siempre los mismos**: la **casa** es el Panel (en el menú, en la barra del móvil y en la rueda), el **✦** abre las apps (el centro de la barra del Panel y «Apps» de cada app: la misma estrella que se despliega) y el **Resumen** de cada app conserva su rejilla.
2. **Dos logos en el Panel del móvil.** En el Panel, el logo y el nombre del local de la barra de arriba **aparecen al bajar**, cuando el saludo ya no se ve, como el título de las apps del teléfono. Con varios locales, el selector se queda siempre. Y en el ordenador, la barra de arriba del Panel dice «Panel» y no el local por tercera vez.
3. **«La búsqueda no funciona nunca.»** La base encontraba, pero **cada resultado llevaba al Panel**: «los destinos los traen los módulos», y los módulos llegaron sin que nadie volviera al buscador. Ahora un producto abre su ficha, un proveedor la suya, una persona la suya, un local cambia a él, y si es de otro local, primero se cambia de local. Y la base (**0065**) **encuentra con media palabra** («sal» → «Lomo de salmón», que antes daba 0,19 y no pasaba de 0,18), sin el ruido de antes, y **cada cosa a quien la puede abrir**: el género a quien tiene Almacén, las personas a quien tiene Equipo.
4. **El botón de desplegar el menú, escondido abajo.** Plegado, **el logo del local despliega el menú**, y al pasar por encima deja ver el icono de desplegar. El Panel tiene su propia fila justo debajo. Y en el menú abierto, **solo queda desplegada la app en la que estás**: antes se quedaban abiertas todas por las que pasabas.
5. **Los widgets: huecos y descolocados.** Era el mosaico medido de la entrega V, que encaja tarjetas de un solo ancho pero deja huecos al mezclar pequeños y anchos. Ahora el Panel va en **filas completas**: se colocan en su orden; si el siguiente no cabe, sube el primero que tape el hueco; y si no queda ninguno, los de la fila se estiran (un pequeño solo ocupa la fila). Las tarjetas de una fila miden lo mismo de alto. Dos tamaños: pequeño (una columna) y ancho (dos).
6. **El dato de la gráfica se salía del widget.** Las gráficas pequeñas ya no llevan bocadillo: al deslizar el dedo o pasar el ratón, **el número grande del widget pasa a ser el de ese día**, con su fecha y lo que fue el mismo día del periodo anterior. Nunca se sale de nada. En la gráfica grande del detalle, el bocadillo va siempre dentro, arriba.
7. **«La carga de la app más lenta.»** Tres cosas, medidas: (a) el paquete inicial había llegado a **364 KB** comprimidos y ahora es **294 KB**: cada app se descarga al entrar en ella y se precarga sola en cuanto el navegador está libre; (b) cada gráfica pequeña esperaba a **Recharts** (un trozo de ~380 KB sin comprimir que no se guarda al instalar) para pintar una raya de 60 px: ahora se dibujan a mano, al momento, y Recharts solo se trae al abrir un detalle; (c) `quien_soy`, que se pide al abrir y al volver a la app, hacía ~10 viajes a la base en fila y luego firmaba tu foto: ahora van **todos a la vez**, con la foto en paralelo. Y las fotos (tu cara, el logo, el género) **ya no se vuelven a descargar** cada vez que la app se pone al día.
8. **Incidencias: el botón abajo ensanchaba cada fila.** La acción va **a la derecha, en la misma fila** (y solo baja si no cabe); «abrir sus fichajes» es una flecha.

Y las seis mejoras:

1. **Ajustes con el mismo aspecto.** El buscador arriba y a lo ancho, y cada sección un **mosaico de tarjetas de una línea** (icono, nombre y qué es) que se abren en su hoja. «Tu local» medía tres pantallas de formularios abiertos; ahora son ocho tarjetas. La hoja va en la dirección (`/ajustes/local#llegar-tarde`), así que el buscador y los avisos abren justo esa. En el móvil, dentro de una sección, el título es la sección.
2. **La línea gris con el periodo anterior.** En cada gráfica, discontinua y alineada día a día: los 7 (o 30) días de antes. El servidor ya los contaba para la flecha; ahora los devuelve día a día (`serieAnterior`).
3. **El recorrido de 30 segundos.** Se **ofrece** la primera vez con una tarjeta arriba del Panel («Te lo enseño en 30 segundos» · «Empezar» · «Ya lo conozco»), y al empezar **ilumina el sitio de verdad** de cada cosa: tus apps, el «+», el buscador y tu Panel. Visto o saltado, se guarda en la cuenta y no vuelve en ningún aparato.
4. **Un Panel de fábrica más corto.** Seis widgets como mucho por puesto; lo que cada puesto traía antes sale primero al añadir, en «Para ti».
5. **Las caras con foto en el chat, y la foto del producto en la merma.** Una consulta para toda la app, `las_caras`, con las fotos del equipo firmadas de una tanda y guardadas media hora; `CaraDe` las pinta en el chat (mensajes, lecturas, privados y menciones), las incidencias, Equipo › Resumen y «Mi turno». Y cada merma lleva la miniatura de su producto, también al buscarlo para apuntarla.
6. **El periodo de cada widget, en tu cuenta** (**0066**): el móvil y el ordenador recuerdan lo mismo. Viaja con `quien_soy`, así que las cifras se piden con sus días desde el primer momento.

## Lo que decidí al construirlo

1. Que el recorrido **se ofrezca y no se imponga**: quien ya usa Estook no tiene que cerrar nada que no pidió. Las personas de ejemplo ya lo han visto (semilla `recorrido-visto.sql`), para que no cambien las pruebas ni las capturas del Panel.
2. Que **los resultados del buscador que no se pueden abrir no salgan**: un resultado que no lleva a nada tapa a otro que sí.
3. Que las personas solo las encuentre quien tiene **Equipo**: un correo no es para cualquiera del local, aunque la base ya se lo dejara ver.
4. **El Panel de fábrica de cada puesto** (seis): quien lleva el local, su jornada, ventas, objetivos, merma, valor de la cámara y equipo ahora; jefe, su jornada, objetivos (el food cost va en su semáforo), caducidades, bajo mínimo, compras y equipo; cocina, su jornada, sus horas, su turno, merma, caducidades y bajo mínimo; sala, como estaba.
5. Que **el periodo no lleve control de versión**: lo último que se elige es lo que vale; un «lo cambió otra persona» por esto sería ruido.
6. Que el enlace de una foto se reutilice **media hora** aunque llegue con otra firma (la API las firma para doce horas, y los logos para una).
7. Que **el aparato de fichar, Mis fichajes y elegir plan sigan en el paquete inicial**: lo que se abre sin señal no puede depender de un trozo aparte. Mis fichajes se partió primero y la prueba de la app instalable lo cazó en GitHub: sin cobertura y con la API lenta, se quedaba sin pintar.
8. Que un botón pequeño (`tamano="s"`) tenga **menos relleno y letra secundaria, pero el mismo blanco de 44 px**: el toque mínimo de B4 no se negocia.
9. Que «Cuándo es llegar tarde» deje de decir «el horario de siempre»: desde la 0081 solo cuenta el horario publicado.

## Lo que no se hace, y por qué

- **El resumen vivo en cada tarjeta de Ajustes** («Más de 5 min», «Naranja Estook»): pediría leer cada ajuste para pintar la lista. Va en la lista de propuestas.
- **Recharts fuera del todo**: la gráfica grande del detalle, con sus ejes, lo sigue usando, y se trae solo al abrirla.
- **Rediseñar por dentro cada formulario de Ajustes**: ahora se ven de uno en uno y en su hoja, que era lo que hacía la pantalla vieja; el texto largo de algunos va a la lista de propuestas.
