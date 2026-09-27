# 0052 · La campana y los avisos: lo que hace el equipo, a quien manda, uno por cosa

**Fecha:** 27 de septiembre de 2026
**Estado:** decidido. Migración `0050`. Es **R1**, la primera mitad de **R · el reloj y
los avisos**; R2 lleva el pedido sugerido, los informes y la nota de Google
**Cambia:** la hoja «Los avisos… llegan con Fogón» de la campana (M5); cómo avisa Estook
([0017](0017-como-avisa-estook.md)), que se monta aquí para la pantalla y el correo; y
la entrega 2 del repaso de M7, que se cierra aquí

## Lo que contestó Richi (27-sep)

1. **La campana de arriba** es donde llegan los avisos, «aparte de avisos al correo si
   fuese necesario e importante».
2. **Lo que avisa a quien manda**, lo recomendado: a quien está por encima, uno por cosa
   y persona.
3. **Invitar a rellenar un pedido** «en casos urgentes a un cocinero, y que éste pueda
   verlo en ese momento para hacer la compra».
4. **El pedido sugerido**, la forma recomendada: «haz siempre lo más óptimo, limpio y
   claramente lógico para los trabajadores» (R2).
5. **Por correo**: el informe diario, el semanal y el mensual, y las cosas muy
   importantes —mensajes, productos bajos…—, **eligiendo en Ajustes cuáles sí y cuáles
   no**.
6. **Ventas y «Tu semana»**, ya (R2); el PDF, con Horarios (H).
7. **Google**: ni cada día ni cada semana, «un punto medio: el que menos gaste sin dejarles
   desactualizados» (R2).

Y un extra: **un botón para cerrar el buscador de arriba**, en el móvil y en el
ordenador («en el ordenador solo se puede con Esc, y en el móvil no se puede cerrar»).

## Lo que se decide

**La campana es lo que ha pasado; «Hoy», lo que hay que hacer.** Son dos cosas y no se
mezclan: «Hoy» se recalcula cada vez que se mira, y la campana guarda un aviso por cosa
y persona, con su «leído». Tocar uno lleva a donde se resuelve y lo da por visto.

**Los avisos de R1**, y a quién le llega cada uno:

| Aviso                                   | A quién                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| Alguien empieza un pedido               | A quien lo puede mandar y está por encima de quien lo empezó      |
| Se manda un pedido                      | A quien está por encima, y a quien ayudó a rellenarlo             |
| Te piden que rellenes un pedido         | A quien se lo piden, **también por correo** de fábrica            |
| Terminan un pedido que pediste          | A quien lo pidió                                                  |
| Un albarán llega con incidencias        | A quien manda los pedidos: es quien reclama                       |
| Un proveedor sube un precio (mejora 13) | A quien compra y ve precios, menos a quien lo ha puesto           |
| Se tira algo caro (20 € o más)          | A quien está por encima de quien lo apunta, si ve precios         |
| Hay carta nueva                         | A todos los que ven la Carta                                      |
| Una nota nueva en el Tablón             | A quien le toca: la de cocina, a la cocina; la de sala, a la sala |

- **Por encima** es `rol.amplitud`, lo mismo que decide quién gestiona a quién (0034).
  **A dirección, administración de la cuenta y area manager no les llega de fábrica lo
  que hace el equipo**: con varios locales serían decenas al día, y la campana dejaría de
  mirarse. Lo enciende quien lo quiera.
- **Uno por cosa y persona.** Si el cocinero sigue tocando su borrador, no llega otro; si
  lo rellena alguien más, su nombre se suma al mismo sin volver a sonar («Ana y Marcos
  están preparando…»). Mandado o cancelado, lo que avisaba de su borrador se da por leído.
- **La subida de precio** se mira cuando entra el precio —al recibir, al conciliar o a
  mano—, **sin IVA y por unidad de uso**, desde un 5 % que cambia quien manda pedidos y
  lleva el local. Si otro proveedor tuyo lo tiene más barato, se dice cuál y desde
  cuándo. Solo tus proveedores: precios de mercado no hay.
- **El aviso de un pedido mandado no lleva importe**: le llega al cocinero que ayudó, y
  el aviso es el mismo texto para todos.
- **Leer una nota en el Tablón la marca en la campana**, y quitarla la quita de todas.

**Lo escribe el sistema, no quien lo provoca.** Quien apunta una merma no puede leer las
membresías de su gerente, y no debe poder dejarle a nadie un aviso falso. Así que el aviso
se escribe en nombre del sistema (`enNombreDelSistema`, que ahora se puede anidar) **en la
misma transacción** que lo que lo provoca: si el pedido no se guarda, no hay aviso. A quién
le llega lo contesta una sola función con privilegio, `estook.quien_recibe`, y **solo al
sistema**. Cada uno lee sus avisos y de ellos solo puede marcar «leído» (lo cuida un
disparador).

**El correo, fuera de la transacción.** El despachador manda los correos pendientes
**con el comando ya guardado**: un correo que no sale no puede deshacer un pedido. Lo que
no salió se queda pendiente y el reloj lo reintenta cada hora, hasta cinco veces. La
dirección se apunta en el aviso al crearlo: después ya no hay sesión con la que leerla.

**Ajustes → Avisos**, sección propia: una fila por aviso y dos interruptores, **Campana**
y **Correo**, como Slack o Linear. Solo salen los que te pueden llegar. **Sin campana no
hay correo.** De fábrica, al correo solo va la invitación a rellenar un pedido; lo demás
lo enciende cada uno. Debajo, a quien lleva el local y manda pedidos, **desde cuánto
avisa una subida**.

**Pedir ayuda con un pedido** (la entrega 2 de M7): en un borrador, quien lo puede mandar
pulsa **«Pedir ayuda»** y elige a quién de los que llevan el almacén —pedir ayuda no da
permisos a nadie—. Al invitado le llega al momento; en el pedido ve quién se lo ha pedido
y **«Listo, avisar a…»**. Lo manda quien lo pidió.

**La campana cuenta**: el número de sin leer, hasta «9+», preguntado cada minuto y solo
con la app a la vista. **Nunca se esconde**, tampoco en el modo cocina de un móvil
pequeño.

**El buscador** lleva una **X** al final del campo y se cierra tocando fuera; las teclas
solo se explican donde hay teclado.

**El reloj** borra cada día los avisos de más de un mes.

## Lo que va en R2 (con lo que contestó Richi)

- **El pedido sugerido** (12): la víspera del día de pedir, «Mañana toca pedir a…». Al
  tocarlo, el borrador se rellena **en ese momento** con lo que hay entonces, cada línea
  con su porqué. Sin borradores que nadie usa. Con menos de dos semanas de movimientos, no
  propone.
- **Los informes** (16): **Tu día**, **Tu semana** y **Tu mes** en Negocio, con las mismas
  cifras que la app, su flecha y tres frases; y por correo el diario, el semanal y el
  mensual, **cada uno con su interruptor en Ajustes → Avisos**. También «productos bajo
  mínimo» por correo, si alguien lo enciende. El PDF, con Horarios.
- **La nota en Google** (19), el punto medio que pidió Richi: **cada tres días** sola (diez
  consultas al mes por local: gratis hasta unos cien locales) y **además al momento cuando
  alguien la mira** si tiene más de un día, dentro del tope de siempre. Solo de las
  cuentas que pagan o están en prueba. Avisa si la media baja.

## Lo que no se hace aquí

- **Notificaciones al móvil** (push): con **I · la app instalable**. Y con ellas, **fuera
  de turno no suena nada** (0017, regla 3), que necesita los turnos de **H**.
- **Un chat**: el Tablón no lo es. Sigue sin decidirse (ESTADO, «Lo que sigue sin
  decidirse»).
