# 0074 · El repaso de C1: el mensaje sale al momento, el chat se ajusta al teclado, las notas de voz sin «cargando» y el móvil que no se pierde

**Fecha:** 7 de octubre de 2026
**Estado:** construido. **Sin migración**; con despliegue de la API (lo del móvil).
**Cambia:** la conversación y la caja de escribir del chat ([0073](0073-c1-hablar.md)); cuánto espera lo del chat a poder sonar en el móvil; y lo que se quita al leer.

## Lo que vio Richi

El 6-oct, con C1 en producción, probándolo con Santiago entre dos móviles:

1. **«El mensaje tarda en enviarse** desde que das a enviar hasta que aparece, y resulta raro: mejor que salga de golpe en el chat y se envíe cuando pueda.»
2. **«Al escribir sale muy hacia arriba todo»** (con captura): la conversación se metía debajo de la hora y la batería, y entre la caja y el teclado quedaba un hueco vacío.
3. **«A veces al deslizar coge toda la interfaz de arriba y la baja sin querer**, en vez de desplazarte por la conversación» (con captura).
4. **«Las notas de voz se quedan cargando** aunque ya estén cargadas, y no se quita hasta que das al play.»
5. **«Avisar en el móvil o en el correo si te llegan mensajes**; por ahora no me avisa, creo.»

## Qué pasaba, y qué se ha hecho

### 1 · El mensaje sale al momento

Antes, la pantalla esperaba a que el servidor guardara el mensaje y a volver a pedir la conversación entera. Ahora **sale en cuanto se pulsa**, con un reloj donde irá el ✓, y la caja se vacía. Por detrás se manda **en orden y de uno en uno**. **Sin red**, dice «Sin conexión» y se manda solo al volver, con la misma clave: reintentar no lo duplica. Si el servidor dice que no (un fichero que no vale), queda en rojo con **«Reintentar»** y **«Quitar»**, sin perder lo escrito, y los demás siguen. Corregir un mensaje sí se espera: cambia algo que ya está.

### 2 y 3 · El chat, con el teclado y quieto

El teclado del iPhone no encoge la página: la empuja hacia arriba. El chat iba entre las dos barras de la página entera y subía con ella. Ahora, **con el teclado abierto, el chat ocupa justo lo que se ve**: la cabecera de la conversación arriba y la caja pegada al teclado. Y **mientras el chat está abierto, la página de debajo no se desplaza ni se estira**: deslizar mueve la lista o la conversación, y al llegar a su borde no arrastra la barra de arriba. Al pulsar «Mandar», el teclado ya no se cierra y se vuelve a abrir.

### 4 · Las notas de voz, con reproductor propio

El reproductor del navegador buscaba la duración dentro del fichero, y las notas grabadas en WebM no la llevan: se quedaba con la rueda hasta pulsar play. **El reproductor es ahora nuestro**: play y pausa, una barra que avanza y se toca para saltar, y «Nota de voz · 0:07» desde el principio, porque la duración se sabe al grabar. La rueda solo sale el momento en que de verdad está cargando, después de pulsar. Empezar una nota para la que sonaba.

### 5 · El móvil: avisaba, y además había dos fallos

Leído en producción, sin tocar nada: **el aviso funcionaba, pero a los dos os pilló fuera de lo que cada uno tiene puesto**. A Richi, en sus **horas de silencio** (de 23:00 a 08:00, eran las 23:38); a Santiago, **fuera de su turno** (tiene horario y el siguiente era el jueves). Es lo que se decidió en I (0070) y lo que pide la ley de la desconexión digital (0066): fuera de su turno a nadie le suena si no lo quiere. Y al mirarlo salieron **dos fallos de verdad**:

- **Leer el canal no quitaba lo que esperaba al móvil** (lección 147): a Richi le iban a sonar a las 8:00 los siete mensajes que ya había leído a medianoche. Ahora leer los quita.
- **Lo que no podía sonar en 12 horas se tiraba** (lección 148): a Santiago no le habría sonado nunca. Ahora espera, como los avisos, **hasta una semana**: a que acabe el silencio o a cinco minutos de su turno, y sale uno solo («Prueba 1 · 7 mensajes nuevos»), si no lo ha leído antes.

Y para que no vuelva a parecer que no avisa: **arriba de la lista del chat, una línea cuando hace falta** —«Este móvil no te avisa del chat · Avisarme», «Solo te suena en tu turno · Cambiar» o «Hasta las 08:00 no te suena: son tus horas de silencio · Cambiar»—. Si suena, no dice nada.

**El correo, no** por ahora: «el chat no va por correo» (c-el-chat.md, 8) sigue en pie, y se pregunta en el plan de C2 si quiere un resumen para quien no tiene los avisos del móvil puestos.

## Lo que decidí al construirlo, y por qué

1. **Lo que va de camino vive fuera de la pantalla**: cambiar de conversación no lo pierde. Cerrar la app sí; lo que no puede perderse sin red (fichar, mermas) ya tiene su cola guardada desde I.
2. **Sin red, no sale ninguno hasta que salga el primero**: si saliera el siguiente, llegarían desordenados.
3. **La raya del día sale ya con el mensaje que va de camino**, para que no salte al llegar.
4. **La línea de si te suena, solo en el móvil** y solo cuando no suena ahora: lo normal no se anuncia. Las horas de silencio se miran con el reloj del móvil.
5. **La nota que va de camino se oye desde el móvil** (`blob:`), no desde `data:`, que la política de seguridad no deja oír.
6. **Lo del chat espera lo mismo que los avisos** (`DIAS_QUE_ESPERA_UN_AVISO`, una semana), y no un número suyo.
