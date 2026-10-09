# 0081 · Un solo horario y las incidencias: contar sin escanear mil veces, las vistas vacías fuera, los widgets que no crecen y el correo apagado

**Fecha:** 9 de octubre de 2026 (por la tarde)
**Estado:** construido el 9-oct, en su pull request. **Con migración** (`0062_las_incidencias`) y **con despliegue de la API**: 81 consultas (una más, `las_incidencias`) y 171 comandos (se van `poner_horario_habitual` y `rellenar_con_el_de_siempre`, llegan `justificar_incidencia` y `quitar_justificacion`).
**Cambia:** la tabla B5 del [Plan](../maestros/Estook-Plan-de-Desarrollo.md): Equipo gana su quinto destino, **Incidencias** (Todas · Faltas · Retrasos · Fichajes). Y lo que decía la [0069](0069-el-horario.md) de «cuando hay horario publicado, manda el horario; si no, el de siempre»: **ahora solo cuenta el publicado**.

## Lo que pidió Richi, y lo que se hace

1. **«Al escanear en el inventario te hace pasarlo mil veces. Que pregunte cuántas hay, o en el método de medida elegido.»** Escanear dice **qué** es y abre **«¿Cuántos hay?»**: en cajas y sueltas, en kilos o en unidades, lo que diga su ficha. Si ya estaba contado (la misma leche en dos estanterías), **se suma**; con un toque, **se sustituye**. Con la cámara, la pregunta sale encima y la cámara espera sin apagarse; con un lector de mano, en una hoja. Y si el lector de mano escribe un código en la casilla de la cantidad, se entiende como la siguiente lectura y no como «8 410 000 000 000 latas» (`CuantosHay`, `juntarLoContado`).
2. **«Hay dos horarios, el de la ficha de Persona y el de Horarios; no concuerdan y no tiene sentido. Que la app haga caso al de Horarios, que es el oficial.»** Se quita «Su horario» de la ficha y **«Rellenar con el de siempre»** de Horarios (con «Copiar la semana anterior» se empieza igual). Los retrasos, el aviso de «entras en cinco minutos», quién entra hoy y «Mi turno» miran **solo lo publicado**. La tabla `horario_habitual` **se queda en la base, sin usar**: lo escrito no se borra a escondidas; se quita con M13. En producción tenía 22 tramos en IKATZ y 10 en Pizzeriacazzo, que **dejan de contar**: hay que publicar la semana en Horarios.
   - **2a · «Si un trabajador no ficha y no está justificado, no hay sitio donde lo muestre.»** Equipo → **Incidencias**: quién **no vino** a su tramo publicado, quién **llegó tarde**, y los **fichajes raros** (sin fichar la salida más de doce horas, lejos del local, sin ubicación, sin conexión), por días y con lo que se hace con cada uno: **justificar** (enfermedad, permiso, cambio de turno, avisó, otro) o **quitar la justificación**, abrir la ficha para corregir el fichaje, o «Está bien». Lo justificado **deja de contar** en Incidencias, en los Retrasos y en el Resumen, y se queda a la vista con quién lo dijo. **Nadie se justifica a sí mismo**, y sin Equipo no se ve nada (lo dice la base, con `a_quien_lleva`).
   - Una **cuarta cifra, «Incidencias»** (faltas sin justificar y fichajes por revisar; los retrasos tienen la suya), al lado de Horas, Coste y Retrasos. Tocarla abre Incidencias; tocar Retrasos, Incidencias → Retrasos.
   - En la ficha de cada persona, donde estaba «Su horario», **sus incidencias**: las cuatro últimas y «Ver más», que abre Incidencias solo con las suyas.
   - **2b · «En "Para mirar" aparecen 4 fichajes que revisar y 8 retrasos, pero no se puede acceder.»** Cada línea es un botón que lleva a Incidencias, filtrada. Y «fichajes que revisar» cuenta fichajes, como Incidencias, no personas.
3. **«En Almacén, esconder "Sin precio", "Congelados" o "Desactivados" si están vacíos.»** `mis_productos` dice cuántos hay en cada una y la pantalla no las pinta si tienen cero, **salvo la que se está mirando**.
4. **«Hay widgets que no deberían hacerse más grandes: "Retrasos" solo muestra un número.»** Las cifras que **se cuentan** (retrasos, incidencias, bajo mínimo, cajas cerradas) se quedan en pequeño y ancho; una ya puesta en grande se pinta en ancho.
5. **«Avisos por correo de fábrica apagados, solo al móvil; si no, petamos el buzón y Resend cobra.»** De fábrica, por correo **solo dos**: **Tu mes** (uno al mes) y **te corrigen un fichaje** (tu registro horario; pasa poco). Se apagan la invitación a un pedido, Tu semana, el horario publicado y cambiado, y lo que falta confirmar del chat: **siguen llegando a la campana y al móvil**. Lo que cada uno ya encendió a mano se respeta. Al móvil siguen yendo los diez de antes, que son los que piden hacer algo ya.

## La auditoría de la tarde

El informe entero está en [`auditorias/auditoria-2026-10-09.md`](../auditorias/auditoria-2026-10-09.md). Lo que se arregló con ella, cada cosa con su prueba:

- **«Sin cerrar» contaba a quien estaba trabajando.** La columna «A revisar» del Resumen y «Para mirar» sumaban como fichaje raro un turno abierto ahora mismo. Ahora es abierto **hace más de doce horas**, como el aviso de turno sospechoso. Lo prueba `las-incidencias.prueba.ts`.
- **Llegar más de tres horas tarde no contaba como nada.** El fichaje de una entrada se buscaba solo en las tres horas de alrededor: quien llegaba a las 14:00 a un turno de 10:00 a 18:00 no salía ni como retraso ni como falta. Ahora se busca hasta que acaba el tramo (240 min tarde), y **una falta es un tramo acabado sin ningún fichaje que se cruce con él**.
- **Fechas en formato técnico**: «Del 2026-09-10 al 2026-10-09» en Fichajes y «En Estook desde el 2026-10-09» en la ficha. Ahora «10 sept» y «9 de octubre de 2026». Y «Última vez: Nunca ha entrado» se lee «Nunca ha entrado».
- **Ajustes → Avisos ocupaba doce pantallas en el móvil**: cada aviso con su explicación a la vista. Ahora la explicación va en su «i».
- **Pantallas que ofrecían lo que no hay**: el PDF de un informe sin datos, la nota de importes sin ningún pedido, y en «Contar» de una zona vacía el fichero, «Lo que no hayas contado» y un botón apagado. Ya no salen.
- **Las incidencias sin horario lo decían dos veces** (el aviso y el vacío): ahora una, con su botón «Ir a Horarios».
- **Un índice** para que buscar el fichaje de cada tramo no recorra todos los de la persona con los años (`fichaje (persona_id, entro_en)`).

## Lo que no se hace, y por qué

- **Borrar `horario_habitual`.** Sin uso desde hoy, pero con datos de dos clientes: se quita con M13 (vacaciones y cambios de turno), cuando se decida qué pasa con ellos.
- **Un aviso «X no ha venido a su turno».** No lo pidió Richi; está en Incidencias y en la cifra. Si lo quiere, es un aviso nuevo de la campana, para M13.
- **Apagar los correos que alguien encendió a mano.** En producción una persona tiene dieciséis tipos encendidos por correo. Es una elección suya; se apagan en Ajustes → Avisos.
