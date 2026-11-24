# 0153 · La Ampliación

**24 de noviembre de 2026.** Richi pide una pausa antes de R3 · 2 · 2 · Los descuentos, con tres
listas: **6 fallos, 5 arreglos y 2 cosas nuevas** (el Calendario con las vacaciones, la ficha del
trabajador con sus nóminas, y las reservas). Pide que esté bien documentado, con maquetas, partido
en las partes que hagan falta («Ampliación 1, 2…»), investigando la mejor forma de hacerlo y
proponiendo mejoras.

**Estado: propuesta.** La [maqueta](../maquetas/la-ampliacion.html) y las preguntas de la sección 8
están en manos de Richi. **No se construye nada hasta que la apruebe.** Lo que conteste se escribe
aquí, en la sección 9, y lo que cambie de la maqueta se cambia en la maqueta, antes del código.

## 1 · Las cinco partes, y por qué en este orden

| Parte                                            | Qué lleva                                                                                                                       | PR  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --- |
| **Ampliación 1 · Los fallos del servicio**       | Fallos 1, 2, 4, 5 y 6; arreglos 3 y 3.1 (Ajustes); la auditoría que se debe (sección 7)                                         | 1   |
| **Ampliación 2 · El comandero y la carta**       | Fallo 3 y 3.1 (venta rápida en el comandero y abrir mesa); arreglos 1, 2 y 2.1 (la foto del almacén, escandallos, más vendidos) | 1   |
| **Ampliación 3 · La ficha del trabajador** (M13) | La ficha nueva, el alta en tres formas con Fogón, las nóminas y el historial de jornadas exportable                             | 2   |
| **Ampliación 4 · Calendario y vacaciones** (M14) | Calendario › Equipo, Personal y Propuestas; pedir, negociar y aprobar vacaciones, con el saldo calculado                        | 1   |
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
  horas con mesa de verdad. Nombre, teléfono y correo. **Correo de confirmación y recordatorio 24 h
  antes** con «Confirmo» y «Cancelar» (con Resend, que ya usamos). Sin hora: «Avísame si se libera»,
  y al cancelar alguien le llega al primero.
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

## 9 · Lo que contesta Richi

(Pendiente.)

## 10 · Lo que se toca en los documentos

- **Plan:** la cabecera de D con la Ampliación; las fichas de M13 y M14 con lo de Richi; la ficha
  nueva de M32; el número de módulos.
- **Mapa:** la Ampliación delante de «Estook TPV, hasta el final».
- **Manifiesto:** fuera «No gestiona reservas», con esta decisión.
- **ESTADO**, en el mismo pull request.
- **Roles**, al construir cada parte: los permisos nuevos (gestionar vacaciones, ver nóminas y
  documentos del equipo, reservas) con su nombre real.
