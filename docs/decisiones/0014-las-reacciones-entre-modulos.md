# 0014 · Un módulo reacciona a lo que hace otro, en la misma transacción

**Fecha:** 3 de septiembre de 2026 · **Módulo:** M6 · **Estado:** aceptada

## Qué se decide

Cuando un módulo tiene que hacer algo **porque otro ha hecho algo**, y no puede
esperar, se declara una **reacción** en
[`servidor/aplicacion/reacciones.ts`](../../servidor/aplicacion/reacciones.ts).

Las reacciones se ejecutan **dentro de la transacción del comando** que las
provoca, justo después de que el comando termine y antes de anotar la
idempotencia. Leen los eventos que ese comando acaba de publicar en la bandeja
de salida, filtrándolos por la correlación de la petición, que es única por
acción.

La primera —y hoy la única— es la de M6: cuando nace un local, o cuando alguien
responde de qué tipo es, **se le siembran sus categorías de producto** y, si
quien lo hace puede tocar género y precios, sus seis productos de ejemplo.

## Por qué

M5 respondió la regla 14 publicando cinco eventos, y dejó escrito al lado de uno
de ellos: «`local.creado` → M6 le siembra sus categorías». M6 tenía que
cumplirlo, y las dos alternativas obvias eran peores.

**Que `crear_local` llamara a la siembra de M6.** Es un comando de M5. Con eso,
cada módulo nuevo tendría que ir a editar los comandos de los anteriores, y en
veinte módulos `crear_local` sería una lista de llamadas a diez sitios distintos
que nadie se atreve a tocar. Además invierte la dependencia: M5 pasaría a
conocer M6.

**Un disparador en Postgres.** Es una regla escondida: mira una tabla y hace
cosas en otra sin que se vea desde el código que la provoca. Y aquí lo que hay
que sembrar depende de quién esté preguntando, que un disparador no sabe.

Con una lista de reacciones, **quien publica no sabe quién escucha**, quien
escucha se declara en una línea, y todas las reacciones del sistema se leen en un
fichero.

## Por qué son síncronas, si existe una bandeja de salida

Porque un local sin categorías **es un local roto**: se entra en Inventario y el
desplegable está vacío, justo donde la Auditoría promete «nunca vacío: vienen de
serie». Si esto lo hiciera un proceso de fondo que pasa cada cinco minutos,
habría cinco minutos en los que el producto está mal.

Y sobre todo: **hoy no hay ningún proceso de fondo**. `servidor/trabajos/` existe
y está probado, y no lo llama nadie porque no hay reloj. Quién lo ejecuta sigue
sin decidirse, y hay que decidirlo antes de M8.

Que vayan en la misma transacción significa que o pasan las dos cosas o no pasa
ninguna. Si sembrar fallara, el local no se crearía. Es lo correcto: mejor que no
exista a que exista a medias y nadie se entere.

## Lo que esto NO sustituye

**La bandeja de salida sigue igual.** Los eventos se siguen escribiendo y no se
consumen ni se marcan: cuando haya reloj, quien tenga que enterarse tarde —un
aviso, un correo, un recálculo pesado— seguirá teniendo sus eventos ahí enteros.

Aquí solo va **lo que no puede esperar**. Si algo puede esperar cinco minutos, no
es una reacción: es un trabajo de la cola.

## Las reglas que se ponen ahora, mientras solo hay una

- **Una sola pasada.** Si una reacción publicara un evento y ese evento disparara
  otra reacción, tendríamos una cadena que se puede morder la cola sin que nadie
  lo vea venir. Los efectos en cadena de verdad —el recálculo de escandallos
  cuando sube un precio— van por la cola de trabajos, que sabe ordenarlos y
  reintentarlos (Auditoría, hallazgo 9).
- **Una reacción no puede dar por hecho que quien llama tiene permisos.** Quien
  crea un local no es quien va a trabajar en él: un administrador de cuenta da de
  alta locales y su ficha dice «sin acceso a la operación diaria». Por eso la
  siembra de categorías va por una función con privilegio acotada, y la de
  ejemplos se salta si quien llama no puede tocar género.
- **Sembrar es idempotente.** Reaccionar dos veces no duplica nada.

## Qué se pierde

Que un comando pueda fallar por algo que hace otro módulo. Es real, y es el
precio de que las dos cosas pasen juntas. Se acota exigiendo que una reacción sea
corta, determinista y que no llame a nada de fuera; si algún día una necesita red
o tarda, deja de ser una reacción y se va a la cola.
