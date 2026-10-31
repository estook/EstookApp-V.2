# 0123 · T5 · 2 · 2 · La caja de centro: sin internet, la cocina recibe por la caja

**Fecha:** 31 de octubre de 2026
**Estado:** construido en la rama `t5-2-2-la-caja-de-centro`, con la migración **0097**; la API
cambia por dentro (sigue con 115 consultas y 313 comandos) y hay que desplegarla; y la caja para
Windows pasa a la **1.1.0**, que hay que publicar.
**Sigue:** la [0122](0122-t5-2-1-cada-aparato-aguanta-solo.md) (cada aparato aguanta solo, y las
respuestas de Richi del 29-oct en su punto 5), la [0119](0119-t5-la-caja-para-windows.md) (la caja
para Windows) y las maquetas: las de T5 · 2 ([`t5-2-sin-internet.html`](../maquetas/t5-2-sin-internet.html)),
aprobadas el 29-oct, y las de los cuatro avisos nuevos
([`t5-2-2-la-caja-de-centro.html`](../maquetas/t5-2-2-la-caja-de-centro.html)), aprobadas el 31-oct.
**Cambia:** el Anexo (3.6, 6.4 y 10.9), la Arquitectura (capítulo 7), el plan de M20A y ESTADO.

## 1 · Lo que pidió Richi

Seguir con **T5 · 2 · 2 · La caja de centro**: que la cocina y los comanderos sigan funcionando a
través de la caja cuando se va internet. Sus respuestas del 29-oct (0122, punto 5): los camareros
en el wifi del local, la cocina mejor en una tablet Android (el iPad se queda con el papel sin
internet) y la caja por cable o por wifi. Lo va a probar en el local de un amigo, que ya tiene su
TPV funcionando: «tiene que estar pulido».

## 2 · Cómo lo hacen los mejores

- **Toast** tiene un aparato de centro («local hub»), que tiene que ir **por cable** y lo elige
  Toast solo. Sin internet, lo que se pide en un TPV llega a la pantalla de cocina del mismo wifi;
  **no se puede entrar ni fichar**, y lo de un TPV no se ve en otro: solo en la cocina. Si se cae
  el wifi del local, no llega nada.
- **Lightspeed** sigue igual mientras el wifi del local funcione: la impresora y la pantalla de
  cocina reciben; las integraciones y el cobro con datáfono sin 4G, no.
- **Square** no tiene centro: cada aparato guarda lo suyo.
- **Chrome**: desde la versión 141, en el ordenador y en Android, una web segura puede hablar con
  una dirección del wifi del local (`http://192.168.…`) **si se le da un permiso, una vez**
  (Local Network Access). Safari, en el iPhone y el iPad, no lo deja.

Estook hace lo de Toast **con la caja que el local ya tiene**, sin comprar un aparato más.

## 3 · Lo que queda (esta entrega)

- **La caja escucha en el wifi del local**, siempre en el puerto 47100, y **solo contesta a los
  aparatos de su local**. Cada uno le habla con un sobre cerrado con su propia clave.
- **Con internet no cambia nada**: todo va a Estook como siempre. La caja solo entra cuando un
  aparato no llega a Estook.
- **Sin internet, lo que se manda y se marcha en un comandero llega a la caja**, que **lo imprime
  en la cocina y en la barra** (si van en papel) y **se lo da a la pantalla de cocina**, que lo lee
  cada segundo y medio. En el comandero se dice: «Sin internet: la cocina ya lo tiene, por la caja».
- **La franja**, con la caja: «Sin internet. Todo sigue funcionando en el local» (Anexo 10.9). Sin
  ella, la de siempre en ámbar: «la cocina aún no lo recibe».
- **La pantalla de cocina sin internet** sigue con lo que tenía, le suma lo que llega por la caja
  y **deja tachar**, que sube al volver. Sin la caja (apagada, o la cocina es un iPad): «Lo nuevo
  no llega a esta pantalla. Lo de antes sigue aquí y se puede tachar».
- **Al volver internet, cada comandero sube lo suyo una vez**, como en T5 · 2 · 1, diciendo que ya
  pasó por la caja: **Estook no vuelve a imprimirlo**, y lleva la hora a la que llegó a la cocina.
- **Preparado antes de que falte**: en el plano, con internet, una línea si Chrome aún no ha dado
  el permiso («Seguir» lo pide), si alguien tocó «Bloquear» («Cómo arreglarlo») o si el móvil va
  con datos móviles («Conéctate al wifi del local»).

## 4 · Lo que decidió la IA al construirlo

1. **El comandero arma lo que va a la cocina**, con las mismas reglas que Estook
   (`losPasesQueSalenAlMandar`): qué pase sale y cuál espera. La caja **no decide nada de la
   sala**: guarda, imprime y reparte. Así el papel de la caja dice lo mismo que diría con internet.
2. **Cada comandero sube lo suyo** al volver, con su clave, como en T5 · 2 · 1; la caja no sube lo
   de otros (tendría que hacerse pasar por cada aparato). Lo que tiene la caja es para la cocina
   y se guarda en su disco por si se cierra el programa.
3. **Sin secretos nuevos**: la clave de cada aparato con la caja sale de la huella que Estook ya
   guarda de la llave de la caja (HMAC con el id del aparato). Estook se la da al aparato en el
   latido; la caja la calcula sin preguntar. Volver a vincular la caja las cambia todas.
4. **Todo lo que viaja por el wifi va cifrado** (AES-GCM) y con el id del aparato pegado: no se lee,
   no se cambia y no se puede repetir. La caja solo contesta «¿estás ahí?» sin sobre, sin decir
   nada del local, y solo da permiso a la web de Estook TPV.
5. **Dónde está la caja lo dice su latido** (la 0097 guarda su dirección en el wifi), y cada
   aparato lo guarda con lo suyo. Una caja que lleva un día sin decirlo deja de ser el centro.
6. **El permiso de Chrome se pide desde «Seguir»**, nunca solo: probar la caja es lo que hace que
   Chrome pregunte. Con el permiso dado (o fuera de Chrome), cada aparato prueba la caja cada
   minuto y lo dice en su latido (`llega_al_centro_en`), para Aparatos.
7. **La pantalla de cocina no repite lo que ya tenía**: un plato que ya estaba, por su id, no se
   vuelve a sumar (lo de un corte anterior ya lo trae Estook).
8. **Lo tachado sin internet espera a su plato** media hora: un plato que pasó por la caja puede no
   estar aún en Estook cuando sube lo tachado.
9. **Lo del centro, en el disco de la caja, cifrado con la cuenta de Windows** (DPAPI): los
   aparatos del local, las impresoras y lo llegado sin internet. Se borra al desvincular la caja.
10. **La dirección de las impresoras sigue sin salir de la caja**: el centro la lee con una función
    propia, como la cola (`las_impresoras_del_centro`, en la 0097).
11. **Lo que no sale en la impresora se vuelve a intentar cada 10 segundos**, sin parar nada, y se
    deja tras un servicio entero.
12. **La política de seguridad de Estook TPV abre el puerto de la caja**, `http://*:47100`, y nada
    más: sin eso el navegador bloqueaba en silencio lo que va a la caja (lección 243). Las demás apps
    no hablan con el wifi del local.

## 5 · Lo que no entra, y dónde va

Va en **T5 · 2 · 2 · 2**, la segunda parte, con las maquetas ya aprobadas:

- **Entrar con el PIN sin internet en cualquier aparato que llegue a la caja**, porque la caja
  comprueba los PIN de todos, y **fichar sin internet en la caja**.
- **Ajustes del TPV › Aparatos dice quién llega a la caja**, y si la caja va por wifi o por cable.
- **Los avisos de Windows** (maqueta de los avisos, secciones 2 y 3): la pregunta del cortafuegos y
  el wifi marcado como «red pública».
- **Que un comandero vea las mesas que abrió otro sin internet**: hoy, como en Toast, cada
  comandero ve lo suyo y la cocina lo de todos.

Y lo que ya estaba fuera: **cobrar sin internet**, con su justificante, en T7.

## 6 · Las pruebas

- **De la caja** (`el-centro.prueba.ts`, con un comandero de mentira en el 127.0.0.1): contesta
  «¿estás ahí?» sin decir nada del local; solo da permiso a Estook TPV; lo mandado sale en la
  impresora de cocina **una vez** aunque se repita, y lo de la barra no; se lo da a la pantalla;
  **no contesta** a otro local, a un sobre repetido ni a uno con otra clave; lo que no sale se
  queda y sobrevive a cerrar el programa; al desvincular no queda nada.
- **Del comandero y la cocina** (`paraLaCaja.prueba.ts`, `porLaCaja.prueba.ts`, `subir.prueba.ts`):
  el 1.º sale y el 2.º espera, como en Estook; la marcha con lo que falta; la cocina suma sin
  repetir, tacha y destacha; y lo pasado por la caja sube diciéndolo.
- **Contra la base** (`la-puerta.prueba.ts`, `las-impresoras.prueba.ts`): la caja dice su
  dirección y una de internet no vale; el comandero recibe la dirección y la clave correcta, y un
  comandero no puede hacerse pasar por el centro; la cola da a la caja sus aparatos e impresoras;
  y lo subido «por la caja» no deja otro papel y lleva la hora a la que llegó a cocina.
- **De pantalla** (`la-caja-de-centro.spec.ts`, con un navegador de verdad y la caja del programa
  escuchando en el 127.0.0.1): Estook deja de contestar pero el wifi sigue; se abre la mesa, se
  piden dos croquetas y se manda: «la cocina ya lo tiene, por la caja», la franja «Todo sigue
  funcionando en el local», la caja tiene la mesa con sus croquetas, y al volver sube una vez. Y la
  política de seguridad, que deja hablar con la caja (`politica-de-seguridad.prueba.ts`).
- **Lo que no se puede probar aquí**: el programa de Windows con el wifi de verdad, el permiso de
  Chrome en un Android de verdad y una impresora de verdad. Se prueba en el local del amigo, con el
  router de internet desenchufado ([los pasos](../pasos-de-t5-2-2.md)).
