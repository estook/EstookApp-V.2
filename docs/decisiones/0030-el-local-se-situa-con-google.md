# 0030 · El local se sitúa con Google, y de ahí salen el fichaje y las reseñas

**Fecha:** 10 de septiembre de 2026
**Estado:** decidido · se construye **al final de M7**, con Places y Business Profile
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

## Cuándo, y con qué tope · decidido

Richi, el 10 de septiembre: «Al final de M7, Places y Google Business, para verlo
todo. Pero la API que cuesta dinero, la de Places, hay que acotarla bien, y que se
actualice automáticamente al acabar el día.»

Así que **«El local en Google» es el último bloque de M7**, y sustituye a la
[0013](0013-google-places-se-aplaza-a-m23.md) en lo que toca a la ficha del local:

1. **Places, en el alta y en Ajustes.** Autocompletar con sesión y una sola ficha
   pedida con lo justo. Se guardan el identificador, la dirección, el teléfono, la
   web, el horario, la posición, la valoración y el número de reseñas. El radio de
   fichaje se centra ahí.
2. **Business Profile, para leer.** El dueño conecta **su** cuenta de Google y
   Estook lee sus reseñas y su valoración. Responder, clasificar por tema y la
   competencia siguen en M23. **Google pide solicitar el acceso a estas API y
   aprobar el proyecto antes de dar cuota**, y eso tarda: se solicita al empezar
   M7, no al final, para que no sea lo que lo retrase.
3. **Se actualiza solo, una vez al día.** Al acabar la jornada de cada local —su
   hora de corte—, el reloj pide la ficha y las reseñas nuevas. El reloj es
   `pg_cron` llamando a nuestra API ([0016](0016-el-reloj-es-pg-cron-llamando-a-la-api.md)),
   y **se monta en M7**, no en M8, porque esto lo necesita.

### El tope de gasto, que es lo que Richi pidió cuidar

- **Places se llama en dos momentos y en ninguno más**: al elegir el local —en el
  alta o en Ajustes— y una vez al día por local, al cerrar la jornada. Abrir una
  pantalla no llama a Google nunca: se lee lo guardado, con su fecha.
- **Se pide solo lo que se guarda**, con la máscara de campos más corta que dé esos
  datos.
- **Un contador en la base, por local y día, con tope**, y un tope diario de todo el
  proyecto. Si se pasa, se para y se avisa: nunca se sigue gastando por su cuenta.
- **Todo por nuestra API**: la clave no sale del servidor y va restringida a las API
  que se usan.
- Los precios de Google se miran y se apuntan aquí **al contratar**, no antes. El
  objetivo sigue siendo el de M5: **menos de 0,50 € por alta**, y céntimos al mes
  por local.

**Hasta entonces**, la posición del local se marca a mano desde un móvil en el
local, y funciona: el 10 de septiembre, un fichaje en el local salió a 47 m con
±5 m de precisión.
