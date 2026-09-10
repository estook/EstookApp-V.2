# 0030 · El local se sitúa con Google, y de ahí salen el fichaje y las reseñas

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido el qué; **el cuándo, propuesto y pendiente de Richi**
**Completa:** la [decisión 0013](0013-google-places-se-aplaza-a-m23.md) y la
[0025](0025-fichar-pide-donde-y-no-bloquea.md)

## Lo que se pidió

«Al preguntar la ubicación para fichar, primero tenemos que saber dónde está el
restaurante. Para esto, en próximos módulos hay que conectar Google Business y
Places, con API, y en el onboarding preguntar qué local es: así se guarda para
analizar reseñas, etc., y usar la ubicación para fichar. Detállalo en los
documentos para tenerlo clarísimo.»

## Cómo está hoy

- El local tiene **latitud, longitud y radio de fichaje** desde la `0027`. Se marcan
  a mano en Ajustes, **estando en el local**: «Estoy en el local: márcalo».
- Cada fichaje pide la posición de la persona y guarda a cuántos metros del local
  se hizo, o por qué no la hay. Nunca bloquea.
- **El primer fichaje de verdad salió «sin señal»**: el reloj de espera contaba el
  rato de pulsar «Permitir». Arreglado en M6½: la pregunta del permiso no cuenta,
  y si la posición exacta no llega se usa la aproximada de la wifi.
- **Marcar el local desde un ordenador o un TPV sitúa la manzana, no el local**: no
  tienen GPS. Ajustes ya lo dice cuando el error pasa de 100 m. Es la razón de
  fondo para que la posición salga de Google.

## Lo que se decide

### Uno · La posición del local sale de su ficha de Google

En el alta, paso 4 —«¿Cuál es tu restaurante?»—, se escribe el nombre y salen los
resultados de **Google Places**. Al tocar el tuyo se guardan, en el local:

| Dato                                    | Para qué                                                   |
| --------------------------------------- | ---------------------------------------------------------- |
| El identificador de Google (`place_id`) | Volver a pedir la ficha sin buscar, y enlazar las reseñas  |
| Latitud y longitud                      | **El centro del radio de fichaje**, desde el primer día    |
| Dirección, teléfono, web                | Los documentos, la carta digital y la ficha del local      |
| Horario                                 | Proponer la hora de corte de la jornada y los turnos (M14) |
| Valoración y nº de reseñas              | El Panel y Negocio, con su fecha                           |

**La posición manual sigue existiendo**, y manda cuando se usa: hay locales dentro
de un centro comercial donde el punto de Google cae en la puerta del parking. Se
guarda **de dónde sale** la posición —de Google o puesta a mano— para saber cuál
se está usando.

### Dos · Las reseñas, con Google Business Profile

Places da la valoración y unas pocas reseñas; **responderlas y leerlas todas** es
Business Profile, y exige que el dueño autorice con **su** cuenta de Google. Eso es
M23: reseñas por tema, caídas, respuesta propuesta para mandarla tú, y el cruce con
el cuadrante. Nunca se responde nada solo.

### Tres · Cómo se paga y dónde vive la clave

- **Todo pasa por nuestra API**, nunca desde el navegador: la clave de Google no sale
  del servidor, se puede limitar y se ve lo que se gasta.
- **Autocompletar con sesión**: una búsqueda de alta, de la primera letra a la
  elección, cuenta como una sola. Y la ficha se pide **con lo justo** (una máscara de
  campos), no entera.
- **Tope de M5: menos de 0,50 € por alta.** Lo que se trae se guarda y se refresca
  pocas veces; la competencia, con caché por zona (M23).

### Cuatro · Lo que no cambia

- La posición de **las personas** se toma solo al fichar. No se sigue a nadie.
- Fichar **nunca se bloquea** por la posición, venga de donde venga la del local.

## Cuándo

La [0013](0013-google-places-se-aplaza-a-m23.md) aplazó Google entero a M23. Richi
lo quiere «en próximos módulos», y tiene razón en que es lo que da sentido a la
posición del fichaje. **Propuesta:** partirlo en dos.

1. **«El local en Google»**, un módulo corto justo después de M7: autocompletar en
   el alta y en Ajustes, guardar la ficha y la posición, y el radio de fichaje
   centrado en ella. Necesita la clave de Google con facturación, que es de Richi.
2. **Reseñas, competencia y respuesta** siguen en M23, con Business Profile.

**Queda por confirmar con Richi el momento** y la clave. Hasta entonces, la posición
se marca a mano desde un móvil en el local.
