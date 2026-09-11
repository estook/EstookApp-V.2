# 0016 · El reloj es `pg_cron` llamando a nuestra API, no una acción de GitHub

**Fecha:** 5 de septiembre de 2026 · **Módulo:** decidido en M6; el Plan lo adelantó a M7, y se monta en su segunda entrega, con Google ([0032](0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)) ·
**Estado:** aceptada

## Qué se decide

**Quien despierta a Estook cada cierto tiempo es la propia base de datos.**

`pg_cron` —una extensión de Postgres que Supabase trae de serie— llama cada pocos
minutos a un endpoint nuestro, `POST /v1/tareas/latir`, usando `pg_net`. Ese
endpoint es **código de aplicación normal**, con sus puertas y su transacción, y
es quien vacía la bandeja de salida y, más adelante, lanza los análisis
periódicos de Fogón.

- **La cadencia base es de 5 minutos.** No es la de cada tarea: es cada cuánto se
  mira si hay algo que hacer. Cada tarea lleva su propio «cada cuánto» apuntado.
- **Va autenticado con un secreto propio**, distinto de todo lo demás, que vive
  en los secretos de la función y en `pg_cron`. Nadie puede provocar un latido
  desde fuera.
- **Es idempotente y se puede solapar.** Si un latido tarda más de cinco minutos,
  el siguiente no duplica trabajo: la bandeja se toma con `for update skip
locked`, que es para lo que existe.

## Por qué esta y no las otras dos

**Una acción programada de GitHub.** Es gratis y no hace falta nada nuevo, y por
eso era la candidata obvia. Se descarta por una razón concreta: **el `cron` de
GitHub Actions no es puntual**. La propia documentación de GitHub avisa de que
una ejecución programada puede retrasarse, y en la práctica los retrasos de diez
a treinta minutos son normales en horas de carga; y en repositorios sin actividad
las programaciones se desactivan solas. Un reloj que a veces no suena no es un
reloj: es una fuente de fallos que solo aparecen en producción y que además son
difíciles de creer cuando alguien los cuenta.

Hay un segundo motivo, menos llamativo y más serio: **el reloj estaría fuera del
producto**. Para saber por qué no llegó un aviso habría que ir a mirar los
registros de otro sitio, con otra cuenta y otro lenguaje.

**Un servicio aparte encendido siempre** (Railway, Fly, Render). Es lo más
flexible y lo que hace todo el mundo cuando crece. Se descarta hoy porque **cuesta
dinero todos los meses** y porque añade un cuarto sitio donde desplegar, con su
propia forma de fallar, para un trabajo que hoy son unos segundos cada cinco
minutos. El día que el trabajo de fondo sea de verdad pesado —el lote nocturno de
Fogón, los recálculos de M8— esta decisión se revisa, y el endpoint no cambia:
solo cambia quién lo llama.

**`pg_cron` gana por dónde vive.** Está dentro de Supabase, que ya es nuestra base
de datos; no hay proveedor nuevo, ni factura nueva, ni despliegue nuevo. Es
puntual, porque lo ejecuta el propio Postgres. Y sobre todo: **la lógica no se va
a SQL**. `pg_cron` solo sabe hacer una cosa —llamar a una dirección— y todo lo
que hay que decidir sigue en la capa de aplicación, con sus tipos, sus pruebas y
su registro. Un disparador de Postgres que hiciera el trabajo sería una regla
escondida, que es justo lo que la decisión 0014 rechazó para las reacciones.

## Lo que esto NO cambia

**Las reacciones siguen siendo síncronas** (decisión 0014). Lo que no puede
esperar —ponerle sus categorías a un local nuevo— se sigue haciendo en la misma
transacción del comando que lo provoca. El reloj es para lo que **sí** puede
esperar: un correo, un aviso, un recálculo, un análisis.

Y **la bandeja de salida no cambia**. Ya está escrita, ya se llena y ya tiene su
índice de pendientes. Lo único que le falta es alguien que la lea.

## Cómo se monta, cuando toque

1. Una migración enciende `pg_cron` y `pg_net`, y programa el latido.
2. El endpoint `POST /v1/tareas/latir` entra en el catálogo con su puerta propia:
   **no lleva sesión de persona**, lleva el secreto del reloj.
3. Cada tarea de fondo se declara en una lista, como las reacciones, con su
   cadencia. Quien la escribe no toca ni `pg_cron` ni el endpoint.
4. `bd:comprobar-api` comprueba que el latido está programado y que ha latido en
   la última hora. Un reloj parado tiene que salir en rojo, no descubrirse tres
   semanas después porque faltan avisos.

**El punto 4 no es opcional.** Es lo que separa esta decisión de las que se
quedan a medias: un proceso de fondo que falla en silencio es peor que no
tenerlo, porque el producto parece funcionar.
