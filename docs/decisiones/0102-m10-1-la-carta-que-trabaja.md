# 0102 · M10 · 1 · La carta que trabaja: agotados, el precio del cierre, leer tu carta y el equilibrio

**Fecha:** 20 de octubre de 2026
**Estado:** construida en la rama `m10-la-carta-que-trabaja` (migración **0078**). Cambia la API y la app.
**Sigue:** la [0086](0086-las-respuestas-de-m9.md) (lo adelantado de M10) y la [0101](0101-la-auditoria-del-20-oct.md). El plan entero de M10, con las cinco preguntas de M10 · 2, en [`m10-la-carta-menus-y-analisis.md`](../historia/modulos/m10-la-carta-menus-y-analisis.md).

Richi, el 20-oct: que la cuenta que entra revise lo que hizo la otra (Fogón, escandallos, fichas y la auditoría), y si está bien, **siga con el módulo que toca**, que es M10, el último antes de Estook TPV. Lo revisado está bien: `main` con 2.183 pruebas en verde, GitHub en verde y la API desplegada (96 consultas y 211 comandos, 77 migraciones). M10 se parte en dos: **lo que ya estaba decidido por escrito se construye ahora** (M10 · 1), y **lo que no, se pregunta** (M10 · 2).

## 1 · Lo que se ha hecho

| Pieza                         | Dónde estaba decidida                                                    | Lo hecho                                                                                                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agotados**                  | Auditoría de Flujos 2.4 · Roles 1.12 · Manifiesto, cap. 14               | `plato_agotado` (0078). Lo marcan sala y cocina en dos toques: en Carta › Agotados, en la ficha del plato y en el «+» (la cocina no tiene Carta). Vuelve solo al empezar la jornada siguiente, con la hora de corte; «Sin fecha», hasta «Ya hay». No mueve stock |
| **El aviso del agotado**      | Auditoría de Flujos 2.4: «se avisa a sala y a cocina»                    | Una tarjeta en «Todo el equipo» que se pone al día sola («Agotado» o «Ya hay»). Suena solo a quien está fichado; marcarlo otra vez no avisa dos veces. Y «Quítalo también de tu TPV» (y de Uber Eats si está activo), en la barra de deshacer                    |
| **El widget «Agotados»**      | Roles 1.4: el camarero «entra y ve los agotados»                         | En el Panel: lo agotado ahora y, al tocarlo, la hoja para marcar otro. **De fábrica en el Panel de la sala**, en lugar de «Lo que viene» (entregas y caducidades, que no son de la sala); sugerido a la cocina                                                   |
| **El precio en el cierre**    | Plan, M10: «y le da el precio al cierre de caja»                         | Al apuntar un plato en el cierre, el importe sale del precio de sala de la carta; lo que no está en la carta, de la última vez. Lo vendido desde el almacén, igual                                                                                               |
| **Leer tu carta**             | Plan, M10, y [0049](0049-almacen-inventario-congelado-tablon-y-carta.md) | Carta › «Leer tu carta»: el PDF (sus líneas, leídas en el móvil, sin IA) o las fotos (Fogón, 3 créditos por página, hasta 4). Propone nuevos, precios distintos y lo que ya no está, cada uno con su casilla, y lo hace con los comandos de siempre              |
| **El equilibrio de la carta** | Manifiesto, cap. 14 · Plan, M10                                          | Carta › Análisis › Equilibrio: por sección, el salto de precios, la franja media y el tamaño, con los principios de Omnes (comprobados en dos fuentes el 20-oct)                                                                                                 |

Las operaciones nuevas: **consultas** `los_agotados` y `el_equilibrio_de_la_carta`; **comandos** `marcar_agotado`, `quitar_agotado`, `leer_la_carta` y `leer_pagina_con_fogon`. La API pasa a **98 consultas y 215 comandos**.

## 2 · Lo que decidí al construirlo

1. **El aviso del agotado va a «Todo el equipo», no a Sala y a Cocina por separado.** Dos mensajes iguales en dos canales serían ruido, y la sala y la cocina están las dos en el del equipo.
2. **Suena solo a quien está fichado.** A las 23:00 no se despierta a quien libra por un pulpo. Si en el local no ficha nadie, suena como cualquier mensaje del canal. Para saber quién está fichado sin enseñarle los fichajes a una camarera, una función con privilegio que devuelve **solo identificadores**, que no salen del servidor (`quien_trabaja_ahora`, la 58.ª).
3. **El aviso lleva el nombre del plato**, para que el móvil diga «Agotado · Pulpo a la gallega» y no «Una tarjeta». Ese texto no se corrige.
4. **Agotado se deshace en diez segundos** (la barra de siempre), y el recordatorio del TPV va en esa misma barra: una frase, sin otro aviso.
5. **Leer la carta empareja por el nombre exacto** (sin mayúsculas, acentos ni signos), sin parecidos: «Croquetas caseras» es un plato nuevo y no un cambio de «Croquetas de jamón». Así no se cambia un precio por un parecido, y el Plan pide que dos precios cambiados propongan exactamente esos dos.
6. **Lo que ya no está sale sin marcar**: puede que no se haya leído bien, y quitar un plato de la carta lo decide una persona. Se archiva y se recupera.
7. **Fogón solo pasa la foto a líneas**; lo que es plato, precio y sección lo decide Estook, igual que con el PDF. Un solo cálculo (regla 6), y Fogón no inventa números.
8. **Con un plato a dos precios** (media y ración), se queda el último y se dice. Las medias raciones como plato aparte, si Richi las quiere, son una pregunta para después.
9. **El equilibrio solo dice lo largo**, no lo corto: una sección de cuatro postres no es un problema que haya que arreglar (plantilla, 20). Y con menos de tres precios, no se juzga.
10. **El ingrediente que comparten muchos platos y lo de temporada** (Manifiesto) no entran todavía: el primero necesita la carta entera desgranada, y para lo segundo Estook no tiene de dónde saber la temporada. Quedan escritos en el plan de M10.
11. **Leer la carta cuesta 3 créditos por página de foto, y nada en PDF con texto.** El Manifiesto decía «importar una carta entera, 10»: casi todas las cartas tienen una o dos páginas (3 o 6 créditos) y un PDF con texto no necesita IA. Cambiado en el Manifiesto (cap. 32), como pide la regla «un maestro no frena el producto».
12. **El Panel de fábrica de la sala cambia «Lo que viene» por «Agotados».** Sigue con seis (0084), y «Lo que viene» sale el primero al añadir. Solo cambia para quien no ha tocado su Panel.

## 3 · Lo que queda para M10 · 2 (las preguntas)

Cinco piezas del Plan que no están decididas: **el análisis de lo que deja cada plato** (ahora con los cierres o con el TPV), **los menús**, **el menú del día de Fogón**, **el orden como se imprime** (con M11 y M12 o ahora) y **la comparación con la zona**. Explicadas en llano, con ejemplos y una recomendación cada una, en [el plan](../historia/modulos/m10-la-carta-menus-y-analisis.md).

## 4 · Lo que no hace todavía, y cuándo

Quitar lo agotado de la carta del QR (M12), del menú del día (M10 · 2) y del TPV y Uber Eats (Estook TPV y Estook Link). Hasta entonces, el recordatorio.
