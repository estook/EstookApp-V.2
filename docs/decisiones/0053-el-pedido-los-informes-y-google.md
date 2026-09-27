# 0053 · El pedido sugerido, los informes y la nota en Google

**Fecha:** 27 de septiembre de 2026
**Estado:** decidido. Migración `0051`. Es **R2**, la segunda mitad de **R · el reloj y
los avisos** (la primera, la campana, es la [0052](0052-la-campana-y-los-avisos.md)).
Cierra las mejoras **12**, **16** y la parte de la **19** que no espera a Google.
**Cambia:** la tabla B5 del Plan (Negocio gana **Informes**, con Día · Semana · Mes, y
**Reseñas** deja de ser un cartel); cómo se sugiere un pedido (M7); y el botón de
Google de Ajustes, que ya no es la única forma de poner la ficha al día (0040).

## Lo que contestó Richi

Las siete del 27-sep están en la 0052. Para R2 mandan la 4 (el pedido sugerido, «lo
más óptimo, limpio y claramente lógico para los trabajadores»), la 5 (los informes por
correo, cada uno con su interruptor), la 6 («Tu semana» ya, el PDF con Horarios) y la 7
(Google, «un punto medio»). Y el 27-sep, a cuatro preguntas más, las cuatro la
recomendada:

1. **Informes es una sección propia de Negocio**, no una parte de Pulse: Ventas ·
   Informes · Pulse · Costes · Reseñas.
2. **De fábrica**, los tres informes a la campana; al correo, **el de la semana y el
   del mes**. El diario por correo, si alguien lo enciende.
3. **Tu día se compara con el mismo día de la semana anterior**: un sábado con otro
   sábado.
4. **La nota en Google se ve en Negocio → Reseñas**, y el aviso de que baja lleva allí.

## Lo que se decide

### 12 · El pedido sugerido

**Mañana toca pedir.** La víspera de cada día de pedir, a las ocho, a quien manda los
pedidos: «Mañana toca pedir a Frutas Pepe · para que llegue el martes, pídelo antes de
las 20:00». **El pedido no se prepara entonces**: se prepara **al tocarlo**, con lo que
haya en la cámara en ese momento, y se abre «Un pedido nuevo» con cada línea y su
porqué, el importe y el mínimo del proveedor —la pantalla de M7 que ya existía—. Un
toque más lo convierte en borrador. Sin borradores que nadie usa, y sin repetir: si ya
hay un pedido mandado para ese reparto, no avisa; y el aviso de cada proveedor sustituye
al de la vez anterior, así que la panadería que reparte a diario no llena la campana.
Le llega también a dirección: no es lo que hace el equipo, es trabajo por hacer.

**La cuenta cambia en dos cosas**, y son las mismas en la ficha, en el pedido y en
«Hoy», porque es la misma función (`cuantoPedir`):

- **Un viernes no gasta lo que un martes.** Con **dos semanas** de historia o más, el
  gasto se reparte por lo que suele gastar cada día de la semana (`pesosDeLaSemana`): el
  pedido que tiene que cubrir el fin de semana pide más. El gasto al día que enseña la
  ficha no cambia —la semana suma lo mismo—; solo se reparte. Con menos de dos semanas,
  cada día igual, como antes: repartir una sola semana por días es tener un dato por día.
  El plan decía «con menos de dos semanas no propone»; se cambia por esto porque la
  sugerencia plana con siete días ya estaba en producción desde M7 y funciona.
- **Lo pedido no se pide dos veces.** Lo mandado que no ha llegado se resta, y el motivo
  lo dice. Lo que ya tenía que haber llegado y no se ha recibido **no** se resta: no se
  sabe si vendrá, y mejor pedir que quedarse sin.

### 16 · Los informes

**Negocio → Informes**, con **Tu día**, **Tu semana** y **Tu mes**. Cada uno es un
periodo **cerrado** —ayer, la semana de lunes a domingo que acaba de pasar, el mes
pasado— frente al de antes, y se puede ir hacia atrás con las flechas. Lo que va por la
mitad ya lo cuentan las tarjetas de cada app, con sus siete y treinta días.

- **Las cifras son las de las tarjetas**, contadas por el mismo camino
  (`calcularElIndicador`): ventas, ticket medio, food cost, merma, compras, horas y coste
  del equipo, y en la semana y el mes las cajas cerradas. Cada uno ve las que su puesto
  le deja.
- **Tres frases**, de reglas y no de un modelo: lo que más ha mejorado, lo que más ha
  empeorado —comparados por cuánto se mueven frente a lo que eran— y lo que conviene
  mirar: primero los días sin caja cerrada, después un objetivo en rojo, y si no, «nada
  más que mirar».
- **En la semana, los objetivos**: el semáforo del Panel, contado para esa semana.
- **El correo es su resumen**: el título, la tabla de cifras con su flecha, las tres
  frases y el enlace al informe. El enlace lleva la fecha (`?del=2026-09-21`), así que
  abierto el jueves sigue enseñando la semana de la que habla.
- **Se cuenta a nombre de quien lo recibe.** A las ocho no hay nadie con sesión: el reloj
  se pone en el lugar de cada destinatario (`comoSiFuera`), con sus permisos y las
  políticas de siempre, y solo para quien lo tiene encendido. Las cifras se guardan con
  su aviso (`aviso.cifras`) para el correo.
- **Sin datos no se manda**: «no hay nada» cada mañana es ruido. Y el informe de hoy
  sustituye al de ayer en la campana: el informe sigue en Negocio.
- El día cada mañana, la semana los lunes y el mes el día 1. **El PDF, con Horarios.**

**Lo que está bajo mínimo** llega a la campana y al correo **solo si alguien lo
enciende**: ya sale en «Hoy» cada mañana, y en la campana sería lo mismo dos veces.

### 19 · La nota en Google

- **El reloj la pone al día cada tres días**, sola: diez fichas al mes por local, que
  Google no cobra hasta unos cien locales. **Y al abrir Negocio → Reseñas**, si lleva más
  de un día sin mirarse. Todo dentro del tope de siempre (40 fichas al mes por local), que
  ahora vive en `nota-de-google.ts` porque lo usan los dos.
- **Solo de las cuentas al día o en prueba** —y las de la casa—. Las demás no se miran.
- **Cada lectura deja la nota del día** en `estook.nota_en_google`, que es su evolución.
  Elegir el local o traerlo desde Ajustes también la deja.
- **Avisa si baja lo que enseña Google**, con su decimal, del mismo sitio de Google (elegir
  otro no es que baje). No se adivina la nota de las reseñas nuevas a partir de dos medias
  redondeadas: con trescientas reseñas, un redondeo son cinco estrellas arriba o abajo.
- **Reseñas** enseña la nota, cuántas reseñas, cómo ha ido y «Ver las reseñas en Google».
  Leerlas y contestar desde Estook, con Business Profile (M23): se dice plegado.

### Lo que puede el sistema

El reloj necesita saber qué locales hay y poner al día su ficha de Google. Son tres
políticas que se suman a las de siempre (`local_lo_mira_el_reloj`,
`local_su_ficha_de_google`, `uso_de_google_del_reloj`), y solo valen dentro de la API
(`enNombreDelSistema`). **Nada más se lee como sistema**: los proveedores, el género y las
cifras se cuentan a nombre de quien va a recibir el aviso.

### Si algo falla

Cada local va en su punto de guardado: un fallo deshace lo de ese local, se apunta en el
registro y el reloj sigue con el siguiente. **No hace repetir el día entero**: esto no
cobra ni escribe nada que no vuelva a salir mañana, y repetirlo cada hora rehacería el
resto del día (Stripe, la foto del uso) por un informe.

## Lo que no se hace aquí

- **El PDF del informe**: con Horarios (H), como pidió Richi.
- **Leer y contestar reseñas**: cuando Google apruebe Business Profile (M23).
- **Notificaciones al móvil**: con I · la app instalable.
