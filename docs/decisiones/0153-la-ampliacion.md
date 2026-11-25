# 0153 · La Ampliación

**24 de noviembre de 2026.** Richi pide una pausa antes de R3 · 2 · 2 · Los descuentos, con tres
listas: **6 fallos, 5 arreglos y 2 cosas nuevas** (el Calendario con las vacaciones, la ficha del
trabajador con sus nóminas, y las reservas). Pide que esté bien documentado, con maquetas, partido
en las partes que hagan falta («Ampliación 1, 2…»), investigando la mejor forma de hacerlo y
proponiendo mejoras.

**Estado: propuesta, con las respuestas de Richi del 24-nov** (sección 9). Falta que apruebe la
[maqueta](../maquetas/la-ampliacion.html) con Turnos rehecho. **No se construye nada hasta que la apruebe.** Lo que conteste se escribe
aquí, en la sección 9, y lo que cambie de la maqueta se cambia en la maqueta, antes del código.

## 1 · Las cinco partes, y por qué en este orden

| Parte                                            | Qué lleva                                                                                                                       | PR  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --- |
| **Ampliación 1 · Los fallos del servicio**       | Fallos 1, 2, 4, 5 y 6; arreglos 3 y 3.1 (Ajustes); la auditoría que se debe (sección 7)                                         | 1   |
| **Ampliación 2 · El comandero y la carta**       | Fallo 3 y 3.1 (venta rápida en el comandero y abrir mesa); arreglos 1, 2 y 2.1 (la foto del almacén, escandallos, más vendidos) | 1   |
| **Ampliación 3 · La ficha del trabajador** (M13) | La ficha nueva, el alta en tres formas con Fogón, las nóminas y el historial de jornadas exportable                             | 2   |
| **Ampliación 4 · Calendario y vacaciones** (M14) | Calendario › Equipo, Personal y Propuestas; pedir, negociar y aprobar vacaciones, con el saldo calculado; **Turnos, rehecho**   | 1   |
| **Ampliación 5 · Las reservas** (M32, nuevo)     | 5 · 1 el motor y la sala en el TPV · 5 · 2 la web y los correos · 5 · 3 clientes, lista de espera y los que no vienen           | 3   |

**Primero lo que falla en el servicio**, que no lleva pantallas nuevas y se prueba en un día.
**Después lo que cambia en el TPV que ya se usa.** **La ficha antes que las vacaciones**, porque el
saldo sale de la fecha de incorporación, la jornada y los días del contrato. **Las reservas al
final**, que son lo más grande, con la sala ya pulida. Detrás de la Ampliación 3 y la 4 va la
**Auditoría 3** del Plan (los datos de los empleados), que deja de esperar a M15 y M16b para lo
que ya exista. Al acabar, **R3 · 2 · 2 · Los descuentos**, con su maqueta ya aprobada.

M13 y M14 no cambian de número ni de ficha: se adelantan. Su ficha del Plan recoge lo que Richi
ha pulido. Las reservas son un módulo nuevo, **M32 · Reservas**, en la Fase 4.

## 2 · Los fallos: qué pasa y por qué (mirado en el código)

1. **La venta rápida se queda a 0 €** (`apps/tpv/src/rapida/LaVentaRapida.tsx`). Al tocar un
   método, la venta se abre y sus platos se mandan con el id que nació en el aparato. Si se sale
   antes de cobrar (otra pantalla, atrás, recargar), la venta queda abierta en «Para llevar» y el
   ticket sigue guardado en el aparato. Al volver, se abre otra venta y se mandan **los mismos
   ids**; `pedir` (`servidor/aplicacion/comandos/sala.ts`) salta los que ya existen, sin mirar de
   qué cuenta son, y la nueva nace vacía. **Arreglo:** en cuanto la venta se manda, el aparato
   guarda su cuenta y deja de guardar el ticket suelto; al volver, sigue ese cobro. **Y en el
   servidor**, un plato cuyo id ya es de otra cuenta da un error claro en vez de callarse. Con su
   prueba, también para atrás y recargar.
2. **La bebida sale «Bebiendo» sin servir** (`packages/dominio/src/sala.ts`, `laMesaEnCocina` y
   `comoVaLaMesa`). Solo cuenta lo que va a cocina (`destino === 'cocina'`); lo de la barra no.
   Pasa en cuatro casos: la mesa que solo pide bebida; la que ya comió y pide otra ronda o cafés;
   comida y bebida juntas, cuando sale la comida; y la barra en papel, donde nadie tacha.
   **Arreglo:** lo de la barra cuenta igual, y la mesa espera hasta que **el camarero lo marca
   servido**. Nuevo estado «Bebida en camino» (violeta). Propuesto: «Bebida lista» si la barra
   tiene pantalla y la tachó (sigue esperando al camarero).
3. **El comandero del móvil no tiene venta rápida.** No es un fallo del código: la 0148 (sección
   4, punto 2) la dejó solo en la caja, **y lo decidió la IA, no Richi**. Se corrige: el rayo
   sale en la puerta y arriba del comandero; tarjeta y Bizum se cobran ahí; **el efectivo queda
   pendiente en la caja**, como al cobrar en la mesa (0145).
   **3.1 · Abrir mesa** (`apps/tpv/src/plano/AbrirMesa.tsx`): de hoja que sube desde abajo a
   ventana en medio, en dos pasos; el número grande que se toca para escribir, un deslizador de 1
   a 20 con «−» y «+», y dos cuadrados (Por pases · Todo junto) que abren la mesa al tocarlos.
4. **Recargar pide el PIN** (`apps/tpv/src/puerta/LaPuerta.tsx`): quien está dentro vive solo en
   la memoria de la pestaña. **La sala ya se pone al día sola** (el toque al segundo y, sin él,
   cada 8 s), pero en el iPhone, al volver de la pantalla bloqueada, esa conexión tarda en
   volver; por eso dan ganas de recargar. **Arreglo:** la sesión se guarda en la pestaña
   (`sessionStorage`) hasta el bloqueo por tiempo de siempre; al volver a la app se pide lo nuevo
   al instante y se reconecta; una franja fina avisa si se corta. Sin botón de actualizar.
5. **Las tarjetas del Panel** (`apps/app/src/panel/Panel.tsx`): «Añadidos por ti» tiene un alto
   fijo de 17rem (272 px) en todas las pantallas; sobra hueco o se corta. **Arreglo:** en el móvil
   cada tarjeta mide lo que lleva; en tablet y ordenador, las de una fila igualan a la más alta.
   Propuesto (pregunta 6): como mucho 5 filas y «Ver los 6», en vez de deslizar dentro.
6. **El widget del menú del día** sale del Panel y de «Añadir». Quien lo tenía deja de verlo.

## 3 · Los arreglos

1. **La foto del almacén.** Un plato que viene de un producto del almacén y no tiene foto propia
   usa la del producto (`producto.foto_clave`, 0045) en la carta y en el TPV. Si se le pone una,
   manda la suya.
2. **Escandallos solo de lo que se cocina o se monta a mano.** Fuera de la lista lo que se vende
   tal cual (`receta.tal_cual`, 0070) y lo que monta Estook (cafés y copas de «Monta tus bebidas»,
   0089). **Por dentro siguen**: restan del almacén al cobrarse (0149) y su coste entra en el food
   cost. Su margen se ve en **Carta › Bebidas**, junto al precio. Los cócteles hechos a mano
   (mojito) siguen con su escandallo (decidido el 22-oct).
   **2.1 · «Más vendidos» solo con platos**; las bebidas, en «Bebidas más vendidas». Lo decide la
   sección de la carta (de comida o de bebida), como ya decide si va a cocina o a la barra.
3. **Ajustes › Avisos › «Qué te llega» pasa a «Notificaciones»**, plegado.
   **3.1 · «Este aparato» pasa a «Pantalla»** (tema y letra): es como lo llaman el iPhone y
   Android. **La letra «Automática»** ya es la pequeña en el móvil en Estook (`base.css`); en
   Estook TPV la de fábrica era «Normal» (`usarTamanoDeLetra`), y por eso el comandero del móvil se
   ve grande. Pasa a «Automática» en los dos. Quien ya eligió un tamaño lo conserva.

## 4 · La ficha del trabajador y las nóminas (Ampliación 3, M13)

Lo que pidió Richi, con lo investigado. El detalle vive en la ficha de **M13** del Plan.

- **La ficha:** foto, nombre y puesto; cuatro cuadrados (jornada, contrato, incorporación,
  vacaciones disponibles); y una lista que se despliega: Incidencias (con su número), Información
  personal, Información laboral, Nóminas, Vacaciones y solicitudes, Historial de jornadas.
- **El alta, en tres formas:** foto del contrato, archivo del contrato o a mano. **Recomienda el
  archivo** (el PDF se lee sin errores; la foto, si solo está en papel). Fogón lee en el servidor
  y propone cada campo con la página de donde sale; lo que no sale se marca y se escribe a mano;
  **nada se guarda sin que el gerente confirme**. Los que ya están tienen «Subir contrato».
- **Lo que se lee:** incorporación, horas a la semana, sueldo (bruto o neto, y pagas), convenio,
  vacaciones al año, días naturales o laborables, categoría. **Lo que se calcula, nunca la IA:**
  devengadas, disfrutadas, aprobadas por disfrutar y disponibles. Los pendientes de años
  anteriores los pone el gerente.
- **Las nóminas:** en el perfil, por meses. **Mejora propuesta:** «Subir las nóminas del mes» con
  el PDF entero de la gestoría; Fogón reparte cada página por DNI y nombre, y lo que no sabe a quién
  va lo pregunta. De cada nómina, sueldo bruto y neto, categoría y convenio, para poner la ficha al
  día (propone, el gerente confirma).
- **La privacidad, decidida por la base:** el sueldo, las nóminas, el contrato, el DNI, el
  teléfono y el domicilio los ven **quien lleva el local y la propia persona**. Los jefes con
  permiso de vacaciones gestionan vacaciones e incidencias sin ver nada de eso (lo pidió Richi).
  Los documentos, en almacenamiento privado, con enlaces que caducan. Fogón nunca los ve fuera de
  la lectura que se le pide, y lo que pone un documento es un dato, jamás una instrucción (M22).
- **El historial de jornadas**, bonito y con «Exportar» por fechas (lo que el Plan tenía en M15
  y se adelanta aquí porque vive en la ficha).

## 5 · El Calendario y las vacaciones (Ampliación 4, M14)

- **«Calendario» es lo primero**, encima de Turnos, con tres pestañas: **Equipo**, **Personal**
  y, para el gerente y los jefes con permiso de vacaciones, **Propuestas**.
- **Equipo:** el gerente y los jefes ponen días o tramos con aviso (limpieza, inspección…) para
  todos, solo sala o solo cocina; abajo, los próximos; avisa ese día y cada día si son varios.
  Los jefes ponen vacaciones a su gente. **Las vacaciones no salen en Equipo**, solo en el Personal
  de cada uno. Propuesto: las reservas de 12 o más salen solas aquí, para que cocina lo sepa.
- **Personal:** notas que no ve nadie más (tampoco el gerente), los días trabajados con sus horas
  y los que quedan; abajo, vacaciones disponibles, horas trabajadas y **«Pedir vacaciones»**. El
  camarero pide a sus jefes y al gerente; un jefe, al gerente. **No deja pedir más días de los que
  hay.**
- **Propuestas:** aceptar, proponer otras fechas o rechazar con motivo. **Contrapropuesta:** al
  empleado le aparece su pestaña «Vacaciones» con aviso, y acepta, rechaza o propone otras.
  **Coincidencias:** avisa si coinciden dos del mismo puesto (sala o cocina) y si cae en un día
  marcado del calendario, **sin impedir aprobar**: decide el responsable.
- **Al aprobarse**, salen en Turnos y «Hacer el cuadrante con Fogón» no pone a nadie de
  vacaciones.
- **El diseño, rehecho el 24-nov** (Richi: «muy fea, sin color… odio que todo sea hiperplano»).
  **Cada tipo con su degradado y su icono**, igual en el móvil y en el PC: vacaciones en azul
  playa con su palmera, horas en naranja con su reloj, turnos en verde, limpiezas en turquesa,
  inspecciones en coral, reservas de grupo en violeta, notas en amarillo y formación en rosa.
  **El espacio del móvil, como lo resuelven Google Calendar, Fantastical y el del iPhone:** la
  semana arriba con puntos de color (se tira y sale el mes), lo de varios días como una banda, y
  el día tocado debajo en tarjetas de color. **En el PC**, el mes con el texto dentro, la barra
  lateral con el mes pequeño y las capas. **Se abre en Personal** para el equipo y **en Equipo**
  para el gerente y los jefes. **En Propuestas, la línea del equipo**: quién está de vacaciones
  esos días, lo que se pide a rayas y cuántos quedan cada día si se aprueba (verde o naranja).
- **Turnos, rehecho** (Richi, 24-nov: «el horario se ve raro»). Hoy es una tabla con todos los
  turnos en el mismo naranja claro y cabeceras grises en mayúsculas. **Pasa a:** cada turno en un
  bloque con el degradado de su zona (sala en verde, cocina en ámbar, barra en violeta), con sus
  horas; los partidos, en dos bloques; **las vacaciones en azul playa con su palmera**, de punta a
  punta de los días; el libre, suave; **el día que el local cierra, sombreado** para todos. A la
  derecha, las horas de cada uno frente a su contrato, en verde o en naranja. Abajo, **cuántos hay
  cada día por zona** y el coste en vivo (con su permiso). Arriba, las alertas que importan («cocina
  con 1 el miércoles»), «Hacer el cuadrante con Fogón» y «Publicar». **En el móvil**, el equipo ve
  «Solo el mío» como tarjetas por día; quien lleva el horario ve **el día por horas**, una barra de
  color por persona, como la vista de día de los buenos calendarios.
- **Propuesto: la contrapropuesta como tarjeta azul arriba de Personal** (con Aceptar, Otras
  fechas y Rechazar, y su aviso al móvil) en vez de una pestaña que aparece y desaparece
  (pregunta 8).
- **La ley, mirada en la fuente** (Estatuto de los Trabajadores, art. 38): al menos **30 días
  naturales** al año, sin cambiarlos por dinero; el trabajador sabe sus fechas **al menos dos meses
  antes**; si una baja coincide con las vacaciones, se disfrutan después (con un tope de 18 meses
  desde el final del año en que se generaron). **Lo que diga cada convenio de hostelería no se
  inventa**: los días salen del contrato, del convenio que confirme el gerente o de lo que ponga a
  mano. Lo de los dos meses se avisa con suavidad al aprobar unas de menos de dos meses vista; no
  bloquea.

## 6 · Las reservas (Ampliación 5, M32)

**Cambia una decisión firme del Manifiesto**: «No gestiona reservas: cuando toque, las leerá del
sistema de reservas que ya use el local». Richi lo cambia el 24-nov; se corrige el Manifiesto con
esta decisión. **Las reservas van apagadas de fábrica** y se encienden en Ajustes › Reservas.

**Lo investigado** (CoverManager, SevenRooms, TheFork Manager y OpenTable, con sus páginas y
comparativas; sus cifras de marketing no se toman como dato): todos tienen plano de mesas,
asignación de mesa, lista de espera, recordatorios y confirmación, ficha de cliente con
historial, y un tope de comensales por franja («pacing»). CoverManager y TheFork piden tarjeta
como garantía contra los que no vienen; OpenTable y SevenRooms ajustan la duración con su
histórico. **Lo que Estook tiene y ellos no:** el mismo plano y las mismas mesas que cobran, así
que **la duración real de cada mesa sale de las cuentas cobradas** y la reserva se une sola a la
cuenta y al ticket.

**Cómo funciona por dentro:**

- **Servicios** (comida, cena) con franjas de 15 minutos; **duración por tamaño de grupo**, de
  fábrica (1–2: 1 h 30 · 3–4: 1 h 45 · 5–6: 2 h · 7 o más: 2 h 30) y, con 8 semanas de cuentas,
  la real; **tope de comensales por cuarto de hora**, para no hundir la cocina.
- **La mesa la elige Estook**: la que deja menos sillas vacías o dos que se juntan. **Solo se
  juntan las que se marquen en el editor de la sala.** El local decide qué mesas salen por internet
  (la barra, para quien llega).
- **Sin reservas dobles ni sobreocupación:** una reserva por mesa y tramo lo garantiza **la base de
  datos** (una restricción de exclusión sobre el tramo de cada mesa), no la pantalla; el id nace
  en el aparato y repetir no duplica; la web vuelve a comprobar al confirmar, dentro de la misma
  transacción.
- **En el TPV:** «Reservas» con el calendario, a la derecha de Tickets, en la caja, el comandero y
  el móvil; el plano marca lo reservado con su hora; **«Sentar»** abre la mesa con los comensales
  de la reserva (sin preguntar cuántos) y une reserva, cuenta y ticket. **Abrir una mesa reservada**
  avisa y propone otra libre, **sin bloquear**. Avisos: reserva nueva, llegan en 10 minutos, 15 de
  retraso (y liberar la mesa pasados los minutos del local). Todo al segundo, como la sala.
- **La web:** `estook.com/reservar/<local>`, para su web, Instagram, Google y WhatsApp. Solo ofrece
  horas con mesa de verdad. **Nombre y teléfono, siempre obligatorios** (por si hay que llamarle);
  el correo, obligatorio si el local avisa por correo. **Al reservar se le enseña su
  reserva con un código de 4 cifras.** **Desde la misma web, «Ya tengo reserva»**: con su teléfono y
  su código ve su hora y la **confirma o la cancela** (Richi, 24-nov). El código evita que
  cualquiera que sepa un teléfono vea o cancele la reserva de otro.
- **«Avisar al cliente por correo»**, en Ajustes › Reservas, **apagado de fábrica** (Richi, 24-nov:
  «a los clientes sí se les avisa por correo si activan la opción»). Encendido: al reservar le llega
  el correo con su reserva y su código; **un recordatorio el día antes** (o al momento, si reserva
  para el mismo día) con «Confirmo» y «Cancelar»; y funciona **«Avísame si se libera»**. Con Resend,
  que ya usamos. **Al equipo, todo por la app y sus avisos al móvil**, como el calendario.
- **«Pedir que confirmen»**, en Ajustes › Reservas, **apagado de fábrica**: al reservar se le dice
  que tiene que confirmarla, y **si no la ha confirmado X minutos antes de la hora de la reserva, se
  cancela sola** y la mesa queda libre, con aviso en el TPV. **El local elige X, de 15 minutos a 1
  hora** (30 de fábrica). Ejemplo: reserva a las 21:15 con 30 minutos: si a las 20:45 no ha
  confirmado, se cancela. Se cuenta antes de la reserva porque se reserva con días de antelación
  (Richi, 24-nov). Si el local avisa por correo, el recordatorio lleva el botón para confirmar.
- **Clientes:** por teléfono, del local (otro local no los ve nunca); visitas, gasto medio, lo que
  suele pedir, etiquetas y **alergias, que pasan solas a la mesa al sentarlo**. Los que no vienen
  se apuntan y se marcan al reservar.
- **La ley de datos:** la reserva se basa en el propio servicio; **las ofertas, con casilla aparte
  y sin marcar**; sin cookies; lo que se borra y cuándo, con los plazos de M27.
- **Google:** el enlace se pone gratis en la ficha de Google como enlace de reservas. **El botón
  «Reservar» de Google** pide ser socio de su programa (de 12 a 16 semanas de alta, sin garantía):
  se pide cuando se venda.
- **Sin internet**, el TPV enseña las reservas de hoy guardadas; crear una necesita conexión.

## 7 · Lo que añade la IA, para que Richi lo apruebe o lo quite

1. **La auditoría que se debe.** El Plan (E5) pide una cada cuatro entregas de código; desde S1
   (18-nov) van siete (#192 a #198). Va dentro de la Ampliación 1: la caja, lo vendido que baja, el
   rediseño y la venta rápida, con la lista de E5.
2. «Bebida lista» cuando la barra con pantalla la tacha.
3. Las tarjetas del Panel con 5 filas y «Ver los 6» (pregunta 6).
4. En abrir mesa: los comensales de la reserva ya puestos, y sin el paso 2 si el local nunca usa
   pases (se elige en Ajustes).
5. «Subir las nóminas del mes» de una vez.
6. Las reservas de grupo en el calendario del equipo.
7. Las alergias del cliente que pasan solas a la mesa.
8. La duración de cada mesa, aprendida de las cuentas cobradas.
9. Las vacaciones aprobadas en Turnos y en el cuadrante de Fogón.
10. **El color en toda la app** (Richi, 24-nov: «odio que todo sea hiperplano»): cada tipo de cosa
    con su color, sus degradados suaves y un icono que se entiende, y nada de cabeceras grises en
    mayúsculas. Cada parte de la Ampliación lo aplica a las pantallas que toca; la ficha, el Panel
    y Turnos ya lo llevan en la maqueta.

## 8 · Lo que tiene que decidir Richi

1. **El orden:** la Ampliación entera antes de los descuentos, y las reservas dentro de ella, como
   la quinta parte (recomendado), o las reservas después de T7.
2. **¿De qué plan son las reservas?** Recomendado: **de Pro**, porque van unidas al plano y a la
   sala de Estook TPV; Esencial no tiene plano.
3. **Los que no vienen:** recomendado empezar con confirmación por correo, el recordatorio y la
   marca de quien falla, y **la garantía con tarjeta cuando se elija el proveedor de cobro (T8)**:
   Estook nunca tiene el dinero, así que la tarjeta la guardaría el proveedor del local.
4. **Recordatorios por SMS o WhatsApp**: cuestan por mensaje. Recomendado: **correo ahora** (gratis)
   y WhatsApp con M25 · Avisos.
5. **Las nóminas en el perfil del trabajador:** ¿el propio trabajador ve y descarga las suyas?
   Recomendado: sí (es su dato y le ahorra pedirlas).
6. **Las tarjetas del Panel:** 5 filas y «Ver los 6» (recomendado), o deslizar dentro.
7. **El saldo de vacaciones:** «disponibles» cuenta **todo el año** (proporcional si entró a
   mitad de año), y las devengadas a hoy se enseñan aparte (recomendado, es lo habitual); o solo lo
   devengado hasta hoy.
8. **La contrapropuesta de vacaciones:** una tarjeta azul arriba de Personal, con sus tres
   botones y el aviso al móvil (recomendado), o la pestaña «Vacaciones» que pediste.
9. **El plazo de «Pedir que confirmen»:** ¿desde que se hace la reserva o antes de la hora? (Contestada
   en la sección 9.)

## 9 · Lo que contesta Richi

**24-nov:**

1. **El orden: sí**, la Ampliación entera antes de los descuentos y las reservas como quinta parte.
2. **Las reservas son de Pro**: «si los de Esencial no tienen acceso al TPV, ¿qué sentido tiene?».
3. **Los que no vienen confirman o cancelan desde la misma web**, viendo su reserva; y **en Ajustes,
   la opción de que si no confirman a tiempo se cancele**, con el plazo que elija el local. Escrito
   en la sección 6; el plazo, en la pregunta 9.
4. **Avisos.** Richi entendió la pregunta como los avisos del calendario a los empleados, porque no
   decía a quién (lección 279): **a los empleados, por la app y al móvil**; **a los clientes que
   reservan, por correo, si el local enciende la opción**; y **el teléfono, obligatorio** por si hay que
   llamarles. Nada de SMS ni WhatsApp.
5. **El trabajador ve y descarga sus nóminas: sí.**
6. **Tarjetas del Panel: 5 filas y «Ver los 6»: sí.**
7. **El saldo de vacaciones: «lo que sea legal según su contrato y como se suele hacer».** Se hace
   lo habitual: los disponibles son **los días del año que dice su contrato o su convenio**,
   proporcionales si entró a mitad de año, menos los disfrutados y los aprobados; **lo devengado a
   hoy se enseña aparte**, que es lo que cuenta si se va antes de acabar el año. Los pendientes de
   años anteriores los pone el gerente.
8. **La contrapropuesta como tarjeta arriba de Personal: sí.**

**Y pide más:** el color en todo, no solo en el calendario, y **rehacer el horario (Turnos)**, que
«se ve raro», con un diseño más profesional y de app actual. Entra en la Ampliación 4 (sección 5) y
el color, en cada parte, en las pantallas que toque (sección 7).

9. **El plazo, antes de la hora de la reserva**: «si no confirman, por ejemplo, 30 minutos antes de
   la reserva, se cancela automáticamente; pueden reservar un día o dos antes y no tendría sentido
   así». El local elige de 15 minutos a 1 hora.

## 10 · Lo que se construyó en la Ampliación 1 (25-nov)

Con la maqueta aprobada («Aprobada, empieza», 24-nov), en `ampliacion-1-los-fallos`, **con la migración
0125** y la API con una consulta menos (`el_menu_de_hoy` sale con su widget). Las pruebas para Richi, en
[sus pasos](../pasos/pasos-de-la-ampliacion-1.md) (la 33).

**Lo que decidió la IA al construirla**, para que Richi lo sepa:

1. **Hizo falta una migración**, aunque la maqueta decía «sin migración nueva»: **la base también vigila quién
   marca servido** (un disparador de la 0103) y no dejaba a la sala marcar lo de la barra sin la opción
   encendida. La 0125 copia esa función entera y cambia solo eso (lección 280). Y lleva el arreglo de la
   auditoría (sección 7, punto 1): la cola de lo vendido, solo del sistema.
2. **Lo de la barra lo marca siempre la sala**, en todos los locales: si no, en un local con la opción apagada
   la mesa se quedaría esperando la bebida para siempre. Lo de la cocina sigue igual.
3. **Marcar servido lo que la barra ya tachó** no lo destacha: se apunta que lo llevó la sala, con su hora de
   antes. «Deshacer» sobre eso lo vuelve a «en marcha» en la barra (pasa poco, y se ve).
4. **«Bebida en camino» en violeta y «Bebida lista» en turquesa**, dos colores nuevos de la sala con su
   contraste medido, y una línea más en la leyenda.
5. **La venta a medias se guarda en el aparato** con su cuenta; si se cobró o se cerró desde otro sitio, se
   olvida sola. Mientras hay una a medias, tocar un producto avisa «Primero cobra la venta a medias, o déjala
   en «Para llevar»», y hay un botón para dejarla allí.
6. **El servidor dice qué cuenta tiene ya esos platos** (`ya_hecho`, con la cuenta), en vez de crear otra vacía.
7. **Recargar sin el PIN**: se guarda en la pestaña (se va al cerrarla) quién está dentro y su último toque, y
   al recargar se entra solo si el bloqueo no habría saltado (2 minutos en la caja y el comandero, 10 en el móvil
   de cada uno). **Al volver a la app** tras más de medio minuto fuera, o al volver la red, se vuelve a conectar
   y se piden las mesas al momento. Sin botón de actualizar ni franja nueva: si no hay internet, la franja de
   siempre lo dice.
8. **Las tarjetas del Panel**: «Añadidos por ti» deja de tener alto fijo; el rótulo pasa a «En el orden que
   elijas» (ya no son del mismo tamaño). «Caduca pronto», «Bajo mínimo» y «Repartos de hoy» enseñan cinco y
   «Ver los N». Las demás ya enseñaban menos de cinco.
9. **«Notificaciones»** va en un plegable con el resumen «Campana, móvil y correo»; Ajustes › Avisos dice
   «Notificaciones, este móvil y cuándo suena».

## 11 · Lo que se construyó en la Ampliación 2 (25-nov)

En `ampliacion-2-el-comandero-y-la-carta`, **con la migración 0126**. Las pruebas para Richi, en
[sus pasos](../pasos/pasos-de-la-ampliacion-2.md) (la 34).

- **La venta rápida en el comandero**: el rayo en la pantalla del PIN y arriba; tarjeta y Bizum se cobran
  ahí; el efectivo se deja para la caja («A la caja») y la venta queda hecha en el comandero.
- **Abrir una mesa, en medio y en dos pasos**: el número grande que se toca para escribir, el deslizador de
  1 a 20 con «−» y «+», y dos cuadrados que abren la mesa. **Y el ajuste** «Al abrir una mesa, cómo sale la
  cocina» en Ajustes del TPV › Cocina y barra: preguntar (de fábrica), siempre por pases o siempre todo
  junto; si no se pregunta, la ventana se salta el segundo paso.
- **La foto del almacén**: el plato que se vende tal cual y no tiene foto propia enseña la del producto, en
  la carta y en Estook TPV; en su ficha, «Es la foto del producto del almacén» y «Poner la suya».
- **Escandallos sin lo que se monta solo** (lo tal cual, y en una sección de bebidas lo de un ingrediente o
  los cafés), fuera de la lista y de sus cifras. **Carta › Bebidas**, una pestaña nueva que sale solo a quien
  ve costes y si hay algo: de dónde viene, coste, precio y lo que deja.
- **«Lo que más sale» del Panel, solo platos**. Servicio › Información ya separaba comida y bebida.

**Lo que decidió la IA al construirla**, para que Richi lo sepa:

1. **La ventana nace con 2 comensales**, para que abrir siga costando tres toques (mesa, «Siguiente», «Por
   pases»), los mismos que antes (Anexo 10.3).
2. **El ajuste de cómo sale la cocina** va en Cocina y barra, con migración (0126), y el aparato lo lee en su
   latido: tarda como mucho un minuto en llegar a los demás aparatos.
3. **Qué es una bebida**, para Escandallos: lo dice el nombre de su sección («Bebidas», «Vinos», «Cafés»…),
   como lo propone la botonera; la marca de la carta se quitó en la 0086. Una bebida de **varios**
   ingredientes que no es café (un cóctel) sigue en Escandallos.
4. **La foto del producto se lee como el sistema**, porque quien toma nota no lleva Almacén; solo son las
   fotos.
5. **«Bebidas más vendidas»** no se hace aparte: Servicio › Información ya tiene «Bebida».

## 12 · Lo que se toca en los documentos

- **Plan:** la cabecera de D con la Ampliación; las fichas de M13 y M14 con lo de Richi; la ficha
  nueva de M32; el número de módulos.
- **Mapa:** la Ampliación delante de «Estook TPV, hasta el final».
- **Manifiesto:** fuera «No gestiona reservas», con esta decisión.
- **ESTADO**, en el mismo pull request.
- **Roles**, al construir cada parte: los permisos nuevos (gestionar vacaciones, ver nóminas y
  documentos del equipo, reservas) con su nombre real.
