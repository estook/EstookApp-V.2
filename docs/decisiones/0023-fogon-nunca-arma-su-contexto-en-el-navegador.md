# 0023 · Fogón nunca arma su contexto en el navegador

**Fecha:** 9 de septiembre de 2026
**Estado:** decidido en la auditoría previa a M7 · se construye en M22

## Lo que se preguntó

«Que la IA no se pierda o, peor aún, no mezcle datos de diferentes personas. Eso
es lo más importante.»

## Lo que se encontró al mirarlo

Fogón todavía no habla —la voz es M22— pero **su contexto ya está construido**, y
está construido en el sitio equivocado para lo que viene.

`usarContextoDeFogon` arma el resumen que verá el modelo leyendo la **caché del
navegador**: `inventario_hoy`, la misma consulta que pinta la pantalla. Y esa
caché tenía un agujero que esta misma auditoría ha tapado: al cambiar de local no
se vaciaba, así que durante un minuto contenía las cifras del local anterior.

Con Fogón mudo eso era una pantalla mal pintada durante un minuto. Con Fogón
hablando habría sido **una respuesta segura y con datos de otro sitio**: «tienes
tres productos bajo mínimo» contando los del Bar Puerto mientras estás en el Bar
Playa. Y una frase en prosa no lleva encima de dónde salió el número.

## Lo decidido

**El contexto de Fogón lo arma el servidor, en la misma transacción que responde,
y nunca el navegador.**

Cuando llegue M22 habrá una consulta —`contexto_de_fogon`— que:

1. Se ejecuta como cualquier otra: `set local role estook_api`, la sesión
   resuelta desde el token, `set local estook.persona_id`. O sea, **con las
   políticas de M1 aplicadas** y con el local que dice la sesión, no el que diga
   el cliente (decisión 0005).
2. Recibe **dónde está la persona** —la app y la pantalla— y nada más. Ni cifras,
   ni identificadores de local, ni nada que el navegador pueda equivocar o
   manipular.
3. Devuelve el resumen ya hecho, y **con su sello**: qué persona, qué
   organización, qué local y a qué hora se calculó.

El navegador manda la pregunta y pinta la respuesta. No aporta ni un dato.

## Las tres reglas que salen de ahí

**Una · el sello viaja con el resumen, y se comprueba antes de mandar nada al
modelo.** Si el local del sello no es el local de la sesión de ahora, no se
manda: se vuelve a pedir. Es barato, y es lo único que convierte «no debería
pasar» en «no puede pasar».

**Dos · una conversación pertenece a una persona y a un local.** Al cambiar de
local, el hilo abierto se cierra; no se continúa una conversación en un sitio
distinto de donde empezó. Cambiar de local ya vacía la caché por la misma razón
(ver la auditoría en ESTADO.md); esto es lo mismo aplicado a lo que Fogón
recuerda.

**Tres · lo que se le manda al modelo queda apuntado.** En `estook.auditoria`,
como todo lo demás: qué se preguntó, qué resumen se mandó y de qué local era. Sin
eso, el día que alguien diga «Fogón me contó cosas de otro local» no hay forma de
saber si es verdad, y esa es la clase de duda que hunde la confianza en una
herramienta de IA.

## Y el presupuesto, que es el otro motivo

Lo caro de un modelo es lo que se le manda. Un local con trescientos productos no
puede mandar trescientos productos, y esto ya estaba escrito en el gancho: el
resumen es un puñado de cifras ya calculadas.

Que lo arme el servidor lo hace además **medible**: se sabe exactamente cuánto
ocupa cada resumen porque lo construye un sitio, y el límite diario por persona
—que el Plan pide para M22— se cuenta donde se gasta, no donde se pide.

## Lo que esto no cambia hoy

`usarContextoDeFogon` se queda como está mientras Fogón no hable: lo que enseña
la ventana son cifras que la persona ya está viendo en la pantalla de al lado, y
pedirlas al servidor otra vez sería un viaje de más. Lo que no puede pasar es que
ese gancho sea el que alimente al modelo. Queda escrito antes de que llegue M22,
que es cuando escribirlo sirve de algo.
