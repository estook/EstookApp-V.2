# 0015 · Fogón es una burbuja que va contigo, no una pestaña dentro de cada app

**Fecha:** 4 de septiembre de 2026 · **Módulo:** decidido en M6, se construye en
M22 · **Estado:** aceptada

## Qué se decide

**1 · Fogón se abre desde el mismo sitio en toda la aplicación, y ese sitio va
contigo.**

- **En móvil, una burbuja flotante**, abajo a la derecha, por encima de la barra
  de abajo. Está en todas las pantallas y no se va.
- **En escritorio, el icono de arriba a la derecha** que B5 ya mandaba, abriendo
  un **panel lateral** que no tapa lo que estabas mirando.
- **`Ctrl+J`** abre lo mismo.

**2 · Sabe en qué pantalla estás, sin que se lo digas.** Se abre sabiendo si
estás en Inventario, en Escandallos o en el Panel, y lo primero que hace es
decirlo. Preguntarle por lo que tienes delante no debería obligarte a explicarle
qué tienes delante.

**3 · Es también un chat de verdad, no solo un ayudante de pantalla.** Se le
habla, se le piden cosas y se le pide que rellene cosas. Que sepa dónde estás es
un extra, no un límite: se le puede preguntar cualquier cosa desde cualquier
sitio.

**4 · Nunca una pestaña «Fogón» dentro de una app.** Ni en Inventario, ni en
Escandallos, ni en ninguna.

**5 · Las pestañas de cada app son para los análisis que Fogón deja hechos**, no
para hablar con él. Análisis periódicos, calculados fuera de hora y guardados:
**cada 8, 12 o 24 horas según el dato**, y no en cada visita.

## Por qué

**La pestaña era la salida obvia y era la mala.** El Plan dice de M22 «presente
en **todas** las apps, trabajando con el contexto de la pantalla», y la forma más
directa de cumplirlo al pie de la letra es meterle una pestaña a cada app. Tiene
tres problemas, y los tres son de producto:

1. **Queda feo y es poco intuitivo.** Son ocho pestañas más, en barras que B5
   limita a cuatro y un «Más». Una de esas cuatro dejaría de estar a mano para
   dejarle sitio.
2. **Te obliga a salir de lo que estás haciendo para preguntar por lo que estás
   haciendo.** Si estoy mirando la ficha de un producto y quiero preguntar por
   él, cambiar de pestaña es perder de vista justo aquello por lo que pregunto.
   Y B5 dice «nunca se pierde el trabajo al navegar».
3. **Dice que Fogón es un sitio al que se va.** Y no lo es: es algo que está.

**La burbuja resuelve las tres.** No ocupa una posición de la barra, no te saca
de la pantalla —el panel lateral en escritorio deja la lista a la vista a
propósito— y está encima de todo, que es exactamente lo que significa
«transversal».

**Y hace falta un chat aparte además del contexto.** Un ayudante que solo
responde sobre la pantalla en la que estás obliga a navegar hasta el sitio
correcto antes de poder preguntar. «¿Cuánto me subió el aceite el mes pasado?» se
pregunta desde donde uno esté.

**Las pestañas ganan un trabajo mejor.** Poner ahí los análisis periódicos hace
dos cosas a la vez: llena pantallas que hoy están vacías con algo que se mira, y
—esto es lo que importa del coste— **saca el trabajo caro del momento en el que
alguien abre la app**. El Plan ya lo pide: «lo pesado, en lote nocturno»,
«respuestas frecuentes cacheadas», «presupuesto por local y día». Un análisis
recalculado cada vez que alguien entra en Inventario es la forma más rápida de
gastarse el presupuesto del mes en una tarde.

**Las cadencias no son todas iguales, y por eso son tres.** Lo que cambia con
cada servicio no se puede mirar una vez al día, y lo que cambia con el mes no
hace falta mirarlo cada ocho horas:

| Cada         | Qué                                                         |
| ------------ | ----------------------------------------------------------- |
| **8 horas**  | Lo que se mueve con cada servicio: género, mermas, agotados |
| **12 horas** | Lo que se mueve con el día: ventas, margen, personal        |
| **24 horas** | Lo que se mueve con la semana: carta, proveedores, reseñas  |

La cadencia de cada análisis se elige **por el dato**, no por la app, y se guarda
con la hora a la que se calculó, para que la pantalla pueda decir «mirado hace
tres horas» en vez de dar a entender que es de ahora mismo.

## Qué se hace ahora, en M6, y qué no

**Se construye el sitio.** La burbuja, el panel lateral, el atajo, y que la
ventana sepa en qué pantalla estás. Eso es **navegación**, y la navegación se
decide y se prueba ahora: dejarla para M22 obligaría a rehacer la barra, la rueda
y el esqueleto cuando llegue.

**No se construye la conversación**, que es M22 entera: el modelo, el catálogo de
herramientas con permisos, el presupuesto por local y día, la caché, el contexto
parcheado y las reglas de degradación. La ventana lo dice con esas palabras.

**Y no se pone una casilla de escribir apagada.** Una casilla que no contesta es
un control muerto, y es el fallo que más veces ha aparecido en este proyecto: en
M5 fueron seis de catorce, y en el segundo paseo por el móvil de M6, cuatro
botones de la barra que no hacían nada.

## Lo que queda apuntado para M22

- **Los análisis periódicos necesitan un reloj**, y el reloj sigue sin decidirse:
  es la misma decisión pendiente que dejaron M5 y M6, y que hay que tomar antes
  de M8. Sin reloj no hay «cada 8 horas».
- **El contador de gasto por local y día** tiene que verse desde la propia
  ventana de Fogón: quien paga tiene que poder mirar cuánto lleva.
- **La voz** —dictar una merma, una temperatura, un gramaje— entra por la misma
  burbuja, con el micrófono dentro de la ventana.
