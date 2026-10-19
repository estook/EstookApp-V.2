# 0098 · Fogón 1 entero: lee, revisa y prepara

**Fecha:** 19 de octubre de 2026
**Estado:** construida en la rama `fogon-1-entero`, con su migración **0075**. Richi pidió «acabar el módulo entero de Fogón, no te dejes nada» y que se le pregunte al acabar.
**Sigue:** la [0097](0097-fogon-1-las-respuestas-y-la-base.md) (Fogón 1 en tres entregas; aquí están la **1 · 2** y la **1 · 3**) y la [0095](0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md) (Fogón 2, lo que necesita ventas, llega con el TPV).

## 1 · Lo que hace Fogón ahora

Todo con **la misma regla**: los números los calcula Estook, **Fogón propone y una persona confirma**. Ningún botón guarda nada solo, cada uno dice lo que gasta y solo gasta si se pulsa.

| Dónde                                         | Qué                                                                                                                                                                                                              | Gasta |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Compras › Recibir**                         | **La foto del albarán**: rellena lo que ha llegado (cuántos, precio, lote, caducidad), el número del albarán, añade lo que no estaba en el pedido y **marca lo del pedido que no sale en la foto** (no lo quita) | 3     |
| **Servicio › Cierre de caja**                 | **La foto del Z**: el total, efectivo, tarjeta, otros, tickets, comensales y lo vendido por plato si lo trae                                                                                                     | 2     |
| **Apuntar una merma**                         | **Dicha** («se me han caído dos botellas de vino») o **por foto**: cada cosa entendida es un botón que rellena la hoja de siempre                                                                                | 1 / 2 |
| **Fogón › Revisar mis datos**                 | Platos sin escandallo, platos y productos sin precio (reglas, gratis); **productos repetidos** y **pasos que no cuadran** (IA). Y cada lunes de madrugada, solo, con aviso en la campana si encuentra algo       | 3     |
| **Un pedido en borrador**                     | **Ajustar con Fogón**: se le cuenta lo que Estook no sabe («boda de 60 el sábado») y propone qué subir o bajar con su cuenta                                                                                     | 2     |
| **Horario › Montarlo** (semana vacía)         | **Hacerlo con Fogón**: pregunta los días de más venta y a quién quieres en ellos, y propone la semana con las reglas de Richi                                                                                    | 3     |
| **Negocio › Reseñas**                         | **Responder una reseña**: se pega la reseña de Google y escribe la respuesta, cercana o formal, para copiarla                                                                                                    | 1     |
| **El chat de Fogón**                          | **Sabe quién eres**: tu nombre de pila y tu puesto en el local, y nada de nadie más                                                                                                                              | —     |
| **El chat, las pistas, la merma, el horario** | **Un micrófono para dictar**, gratis: el del propio navegador                                                                                                                                                    | 0     |

## 2 · El horario, como lo pidió Richi (19-oct)

«Que te pregunte días de más venta y quiénes quieres ahí (ya tiene horas de cada uno en su lista, no lo pregunta)». Es lo construido:

- **Pregunta** los días de más venta (marcados de entrada según las ventas de las cuatro semanas de antes, o viernes y sábado si no hay caja) y **a quién quieres esos días**. **No pregunta las horas**: salen del contrato de cada uno.
- **Las reglas**, tal cual: los de menos horas, de apoyo el fin de semana y los días fuertes; los de más, toda la semana; **cocina libra lunes, martes o miércoles sin que coincidan tantos que se quede sola**; **rotación** (sabe qué libró cada uno la semana pasada); dos libres por semana; y las 12 horas entre jornadas de la ley.
- **Los turnos de siempre** los saca de las cuatro semanas de antes; se pueden cambiar.
- Se enseña **día a día y con las horas de cada uno frente a su contrato**, contadas por Estook. **«Ponerlo en el borrador»** solo si se pulsa, y solo en una semana vacía. Publicar sigue siendo de quien lo monta.

## 3 · Lo que decidí al construirlo

Los que tomó la IA por su cuenta, para que Richi los sepa y cambie lo que no le cuadre:

1. **Al modelo no le llegan los nombres del equipo, ni para el horario**: cada persona va como «P1 · cocina · 40 h», y Estook vuelve a saber quién es. El horario sale igual de bien y nadie sale de Estook. **Sí le llega el nombre de pila de quien pregunta**, y solo el suyo (lo pidió Richi).
2. **Las fotos no se guardan**: se reducen en el móvil (1.600 px, JPEG), se le enseñan al modelo y se olvidan. La foto de la merma de siempre (la que se guarda con la merma) sigue aparte.
3. **Lo que el modelo lee se casa con tus productos aquí**, por el nombre (igual, o el que más se parece si se parece bastante). **Lo que no casa se dice** («no sé cuál de tus productos es»); casar mal es peor que no casar.
4. **En el albarán, lo del pedido que no sale en la foto se marca y no se toca**: la foto puede no llegar a todo, y quitarlo sin decir nada sería apuntar de menos. A quien no edita precios no se le pone ningún precio leído.
5. **La revisión vigila datos, nunca personas** (0095), y **casi todo es regla**: la IA solo mira repetidos y pasos. Si Fogón no tiene créditos, la revisión se hace igual con las reglas y lo dice.
6. **La revisión de noche**: la madrugada del domingo al lunes (de 0 a 7, hora de Madrid), **dos locales por cada hora** del reloj, a nombre de quien la recibe (sus permisos), y se apunta sin persona. Avisa en la campana **solo si encuentra algo**, a quien tiene Fogón y lleva el almacén. **Con más de 16 locales con Fogón habrá que subir el ritmo o darle su propio latido** (está escrito en el código dónde).
7. **Las respuestas a reseñas se pegan a mano** hasta que Google apruebe Business Profile (M23): Estook no publica nada en Google.
8. **El micrófono es el del navegador** (gratis): Anthropic no transcribe audio. Donde el navegador no sabe, el botón no sale y queda el del teclado del móvil.
9. **Lo que gasta cada cosa** (créditos): una foto gasta más que un texto porque el modelo lee la imagen entera. Con Haiku 5.5, una foto de albarán cuesta menos de una décima de céntimo: los 5 € al mes siguen muy lejos.

## 4 · Lo que no entra, y por qué

- **«¿Cuánto preparo mañana?» y «Con Fogón» en el aviso de lo vendido sin escandallo**: necesitan las ventas plato a plato, que llegan con Estook TPV. Son **Fogón 2** (0095).
- **Las temperaturas por voz** (M22): no hay todavía registro de temperaturas en Estook.

## 5 · Lo que necesita de Richi

1. **Fusionar, migrar (la 0075) y desplegar la API.**
2. **Probarlo con IKATZ** (Fogón ya está encendido): una foto de un albarán de verdad y de un Z, una merma dicha, el horario de la semana que viene con Fogón, y «Revisar mis datos».
3. **Decir si las reglas del horario son las suyas** o falta alguna (por ejemplo, si en su casa la sala también libra entre semana, o si se trabaja partido).
