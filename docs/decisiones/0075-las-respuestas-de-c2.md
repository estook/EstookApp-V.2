# 0075 · Las respuestas de C2, y tres de C que cambian: solo «Todo el equipo» de fábrica, el chat no traduce nunca y el horario es un aviso

**Fecha:** 7 de octubre de 2026
**Estado:** decidido por Richi y **construido el 7-oct**, con la migración `0057` (lo que decidí al construirlo, al final).
**Cambia:** las respuestas 2, 3 y 5 de la [0071](0071-las-respuestas-de-c.md); lo que construyó C1 de «Cocina» y «Sala» ([0073](0073-c1-hablar.md)); el plan de [`c-el-chat.md`](../c-el-chat.md); y el capítulo 23 del [Manifiesto](../maestros/Estook-Manifiesto.md) y la línea del chat del [Plan](../maestros/Estook-Plan-de-Desarrollo.md), que decían «un canal por área» y «traducción».

## Lo que contestó Richi

### Las seis de C, otra vez

1. **¿En dos entregas?** «Todo junto.» C1 ya está; **C2 va entera en una**.
2. **¿La traducción, con Fogón?** «No, no se traduce, **nuestro chat no traduce de ninguna manera**.»
3. **¿«Todo el equipo», «Cocina» y «Sala» solos?** «No, que **solo esté el de Todos**. Y que **el gerente o los jefes puedan crear canales** (los jefes de sala y cocina a veces tienen mucho poder y el gerente quiere quitarse trabajo). **El de Todos no se borra**, es como el global, y **se pueden ir creando y poniendo nombres**.»
4. **¿Todos escriben en «Todo el equipo»?** «Claro.»
5. **¿El horario al chat?** «El horario solo es un atajo de que está listo, y al darle te lleva al horario; no hace falta comerse mucho la cabeza, es como un aviso. **Que al acabar el horario aparezca "¿quieres enviarlo al chat para avisar?", y que sea sí o no.** Es más fácil, ¿no? Dime si te gusta.»
6. **¿«Leído» siempre?** «Siempre, nadie puede ocultarlo.»

### Las cinco de C2

1. **¿Una sola entrega?** «Sí.»
2. **¿Hasta tres fijados por canal?** «Sí.»
3. **¿Lo fijado en «Todo el equipo», también en el Tablón?** «**No**, porque si se ponen a hablar o a discutir se llena el Panel.»
4. **¿Un recordatorio a quien no ha confirmado, al empezar su turno?** «Sí.»
5. **¿Un correo a quien no tiene los avisos del móvil?** «Sí, como sea más óptimo.»

## Sobre la 5 de C: sí, me gusta

Es más sencillo y hace lo mismo. Una casilla marcada de fábrica se manda sin pensarlo; una pregunta al terminar se contesta en un segundo y es una decisión de verdad. Y **no hace falta pedir «Confirmar que lo he visto»**: «leído» ya dice, siempre y sin poder ocultarlo, quién ha visto el aviso. Dos detalles: **el aviso del chat no hace sonar el móvil**, porque a cada uno ya le llega «tu horario está publicado» con lo suyo; y **al volver a publicar un cambio, se vuelve a preguntar**.

## Cómo queda

| Qué                   | Queda así                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Canales**           | De fábrica, **solo «Todo el equipo»**: no se borra ni se renombra. Los demás, **los crean el gerente y los jefes**, con su nombre; se renombran y se borran    |
| **«Cocina» y «Sala»** | Se quitan. **Solo existían en IKATZ y estaban vacías** (leído en producción el 7-oct). Si en algún sitio tuvieran mensajes, se quedarían como canales normales |
| **Traducción**        | **Nunca**, en el chat. Sale del Manifiesto 23 y del Plan                                                                                                       |
| **Fijados**           | Hasta tres por canal, **solo en el chat**                                                                                                                      |
| **Confirmar**         | Lo pide quien lleva el equipo; recordatorio **una vez, al empezar el siguiente turno** de quien falta                                                          |
| **El horario**        | Al publicar, **«¿Avisar en Todo el equipo?» Sí o No**. Un aviso con «Ver el horario». No suena en el móvil ni pide confirmar                                   |
| **El correo**         | Solo a quien **no** tiene los avisos del móvil; solo **privados y lo que le nombra**; **uno al día como mucho, al empezar su turno**                           |

El detalle de C2, con lo que decido yo, en [`c-el-chat.md`](../c-el-chat.md), al final.

## Lo que decidí al construirlo, y por qué

1. **El recordatorio de confirmar es un aviso de la campana** («Te falta confirmar algo del chat», en Ajustes → Avisos), y no un mensaje más del chat: es lo oficial pendiente, que es lo que guarda la campana. Suena en el móvil con tus reglas, y si no tienes el móvil puesto, sale por correo. Confirmar lo quita.
2. **«Al empezar su siguiente turno»** es el primer turno que empieza después de mandarse; quien no tiene horario, cuando acaba su silencio (las 08:00 de fábrica). Si en una semana no le toca, no se le recuerda: quien lo pidió ve quién falta.
3. **El correo del chat sale en su turno, o al empezar el siguiente**, uno cada 20 horas como mucho, **sin el texto de los mensajes** («Marcos: 2. Todo el equipo: 1, y te nombran»): un correo se queda en el buzón, y lo de un privado no sale de Estook. Abajo dice cómo dejar de recibirlo: poner los avisos del móvil.
4. **Como sistema no se leen ni el nombre ni el correo de nadie** (lo cierra la base, a propósito). Para el correo y para el recordatorio hay una función que se los da solo al sistema, como la de los avisos (lección 151).
5. **Fijar el mensaje de otro lo escribe el sistema**, después de comprobar que quien fija lleva el equipo: la base solo deja a cada uno tocar lo suyo.
6. **Borrar un canal lo archiva**, y antes avisa al segundo a quien lo tiene abierto. Renombrarlo y borrarlo, quien lo creó y el gerente (quien edita Equipo).
7. **«Al chat»** está en la ficha del producto y en la del pedido: eliges la conversación y, si quieres, una línea. La tarjeta se abre en su ficha.
8. **Al publicar el horario y contestar «Sí, avisar»**, el aviso va a «Todo el equipo» a nombre de quien publica, con la semana; no apunta nada para el móvil.
