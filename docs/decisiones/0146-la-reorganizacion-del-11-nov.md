# 0146 · La reorganización del 11-nov: lo que sobra, lo que falta y el orden hasta vender

**Fecha:** 11 de noviembre de 2026
**Estado:** decidido por Richi. **Solo documentos**: no cambia ni una línea de código. Lo que hay
que construir va en su entrega, en el orden de la sección 6.
**Sigue:** el análisis de todo lo pendiente que pidió Richi el 11-nov, después de la
[0145](0145-cobrar-en-la-mesa-y-negocio-ventas.md).
**Cambia:** el Plan (versión 1.5: A1, B5, la parte D y E5), el [mapa](../MAPA-de-modulos.md)
(rehecho como índice), el Manifiesto, Roles, la Auditoría de flujos, el Anexo, la Arquitectura,
[la investigación del cobro](../estook-tpv-android-y-el-cobro.md), los pasos de Richi (ahora en
[`docs/pasos/`](../pasos/) con [su registro](../pruebas-pendientes.md)), las
[auditorías](../auditorias/LEEME.md) y ESTADO.

> **Cómo se lee.** Las secciones 1 a 4 dicen **lo que dijo Richi**, punto por punto y sin perder
> nada. La 5, lo que queda abierto y es suyo. La 6, el orden. La 7, las reglas nuevas. La 8, lo
> que decidió la IA al escribirlo. **La especificación de cada módulo vive en la parte D del
> Plan**; aquí está el porqué.

## 1 · Lo duplicado y lo que sobra

### 1.1 Calendario: una app completa de calendario (M14)

- **El primer destino de la app es «Calendario»**, encima de Turnos.
- **Quién pone cosas:** el gerente, y también el jefe de cocina y el jefe de sala.
- **Qué se pone:** días de limpieza, revisiones, visitas de Sanidad y **otros** (una reserva de
  50, un evento de cinco días seguidos…). Se marca **un día o varios**.
- **A quién avisa:** **general**, **solo sala** o **solo cocina**. El grupo elegido recibe la
  notificación **ese día, o cada uno de los días** si son varios.
- **Arriba, un botón «Añadir recordatorio»**: sale un cuadro para elegir si es general o por
  partes, qué día o días y, si se quiere, la hora.
- **Los empleados** pueden añadir **notas personales**, que solo ven ellos.
- **Todo, lo del local y lo personal, con la opción de activar el recordatorio** (aviso y
  notificación).
- **Bonito y que se vea bien** en móvil, ordenador y tablet.

### 1.2 Vacaciones, en el mismo calendario (M14, con los datos de M13)

- **Un destino «Vacaciones»**, debajo de Calendario.
- **Los jefes** ponen días de vacaciones ya marcados a sus empleados.
- **Los empleados las piden**, y los jefes **las validan o proponen otros días**.
- **A cada empleado le sale cuántos días le quedan**, y los gasta en el calendario.
- **De dónde salen los días:** del convenio colectivo aplicado, del contrato del trabajador o de
  lo que ponga el gerente a mano. Por eso necesita la ficha del trabajador (1.3).

### 1.3 La ficha del trabajador (M13)

- **Mejorar mucho** cómo se ve y cómo se edita el perfil del empleado: fuera «la forma austera»
  de hoy.
- **Al crear un usuario e invitarle**, Estook pregunta al momento: **«Crear la ficha del
  trabajador: a mano o automática»**, explicando las dos.
- **Automática:** se sube el contrato y **Fogón lee** las horas, el tipo de contrato, la fecha
  de incorporación, la jornada, el convenio, las vacaciones y las condiciones: todo. **El gerente
  revisa y confirma**, y la ficha queda hecha. Con eso se calculan las horas, las vacaciones y lo
  demás, «y así no fallamos».
- **Los que ya están** y los hechos a mano tienen **«Subir contrato»**, que pone sus datos al
  día de una vez.
- **La exportación para la Inspección sale de aquí** (punto 3.5): del historial de fichajes del
  perfil, por fechas.

### 1.4 Cuaderno, fuera

«No vale para nada actualmente. Fuera esa app completamente: con Calendario y Tablón lo
cubrimos.» **Estook pasa de ocho apps a siete.** Dónde va cada cosa que iba a tener:

| Lo que iba a ser de Cuaderno (M17)         | Dónde queda                                               |
| ------------------------------------------ | --------------------------------------------------------- |
| Lo que tiene que saber el turno siguiente  | El **Tablón** del Panel, que ya existe                    |
| Notas privadas                             | Las **notas personales** del Calendario (1.1)             |
| Revisiones y mantenimiento de las máquinas | **APPCC › Mantenimiento** (3.4) y los recordatorios (1.1) |
| Las dos «Incidencias» con el mismo nombre  | Queda una: **Equipo › Incidencias** (faltas y retrasos)   |
| La historia del Tablón, por días           | Con el Calendario (M14)                                   |

### 1.5 La carta, más limpia, y la carta online (M10, M11 y M12)

- **Fuera las tres pestañas que esperaban** en Carta › Análisis (Matriz, Por canal e Histórico):
  lo que deja cada plato vive en Servicio › Jornadas › Información («Tu carta en cuatro», 0142).
- **Fuera la pestaña «Todos los platos».** Al entrar en Carta **se ve la carta, sin pestañas**.
- **«Agotados» solo aparece, y en rojo, cuando hay algún plato agotado** (se marca tocando el
  plato). Ese día salen dos pestañas: **«Carta»** (la que hoy se llama «Por secciones») y
  **«Agotados»**.
- **En los tres puntitos de Carta, una opción nueva y con color: «Carta online».** El orden
  queda: Nueva sección · **Carta online** · Desde almacén · Importa tu carta.
- **«Carta online» enseña:**
  1. **El enlace de tu carta online**, bien puesto y diseñado, y la carta online **bonita**.
  2. **El QR**: para descargar, para imprimir solo, o con un diseño para los clientes («¡Escanea
     el QR para ver la carta!»).
  3. **La carta para imprimir**: en una hoja, en varias, una sección por hoja, o a elegir. Con
     **varios diseños**: desenfadado, clásico, juvenil, formal y **sobrio** (fondo blanco y letra
     negra, con algún adorno, como los restaurantes caros). Enseña **alérgenos, unidades y
     precios**: una carta profesional de restaurante.
  4. **Todo vectorial, en PDF de imprenta**, con sus márgenes; **el logo solo en la primera
     página**, de portada; las demás, con los platos detallados y ordenados, «de editorial».
  5. **Y lo dice:** «así te ahorras el diseñador: mándala a imprimir».

### 1.6 Negocio › Costes, fuera

«Ya tenemos esta opción en bastantes sitios.» El food cost está en Ventas, las mermas en Almacén,
lo que no deja margen en Escandallos y lo gastado en Consumo.

### 1.7 Estook Pulse, fuera del plan

«Se elimina.» Sale de Negocio, del Manifiesto (capítulo 7), de lo que lleva Pro y de Roles.

### 1.8 Ventas › Resumen e Informes

«Lo dejamos por ahora como está.» Se vuelve a mirar cuando Informes lea lo cobrado.

### 1.9 Traer los datos de otro TPV es de Esencial (M18, con lo que era M19b)

Quien tiene Esencial no tiene Estook TPV, así que Estook no puede leer sus ventas. Eso es lo que
resuelve: **llevar la información de su TPV a la app** para descontar productos, hacer cierres y
ver ganancias. **Va después de Estook TPV**, y con esto:

- **Los cierres de caja y las ventas** de otro TPV, conectado o por fichero.
- **Y también por fotos** de los tickets de cierre: «menos automatizado, pero más barato».
- **Sin lío:** «que todo tenga sentido, que no esté mal colocado, opciones visibles, bien
  explicadas y optimizadas».

## 2 · Lo que puede esperar, y lo que no

1. **«Sin envío» es NO VERI\*FACTU, y va sí o sí** (aclarado al preguntarle): la forma legal de
   la [0127](0127-con-verifactu-sin-envio-o-fuera.md), con **el certificado que pidan (el
   gratuito), la cadena y el QR**, «todo legal, eso siempre». **Hay clientes que piden facturar
   sin VERI\*FACTU**, y la obligación se ha aplazado. Va **antes de vender**, donde estaba:
   después de T7. Lo último comprobado de la fecha: Hacienda anunció el 5-oct **octubre de 2028**,
   todavía sin BOE (Anexo 1.2); se vuelve a mirar en el BOE al empezar T6 · 3.
2. **La API pública (M30), fuera del todo.**
3. **Cadena (M24) se queda:** al contratar varios restaurantes, quien los lleva recibe el rol de
   **area manager**. Al entrar ve **la lista de todos sus restaurantes** que usan Estook; debajo,
   un resumen de todos: un top, los ingresos totales y separados; y puede **entrar en un local y
   verlo como lo vería su gerente**. **Solo los locales que tiene asignados.**
4. **El iPhone (M31), solo si el mercado lo pide**: un extra, al final.
5. **Uber Eats (M29) es necesario**: que los pedidos lleguen a cocina. Y estaría bien con otros
   canales.
6. **Primero Estook TPV, y luego lo de Esencial** (1.9).
7. **La exportación de datos ordenados**, tipo resumen de todo: sí (M21). La previsión de ventas
   y el presupuesto, después de vender.

## 3 · Lo que es más necesario de lo que parecía

1. **Las copias de seguridad** siguen aplazadas hasta la mudanza, y **se hacen al cien por
   cien**: es importantísimo.
2. **El asesor: hecho.** Richi habló con él el 11-nov y «está todo ok». La primera de las once
   condiciones del Anexo deja de frenar (sección 8, punto 4).
3. **Sin internet se sigue facturando, y no se pierde nada.** Lo que dice VeriFactu, y lo que
   Estook ya tenía pensado: no se interrumpe la facturación; los registros **se guardan y se
   envían al volver**; el sistema **reintenta el envío cada cierto tiempo**; y **la incidencia
   queda identificada**. **Y lo que lo sostiene: Estook TPV se usa en sus apps nativas**
   (Windows y Android, y iPhone si se hace), que guardan los datos **en la máquina**. **La
   versión web de Estook TPV se queda** —para entrar desde cualquier parte y para probar—, con
   **su aviso de que es mejor la nativa** y **el botón de descarga directa**, como hoy. Estook, la
   app de gestión, es de internet: es otra cosa.
4. **El APPCC (M16b) va en Servicio, debajo de Jornadas**, con **APPCC** e **Historial**:
   completo, fácil e intuitivo, con sus documentos para imprimir para Sanidad o para quien los
   pida. **No un formulario enorme: un sistema inteligente de tareas**, con cuidado de no
   duplicar. Lo que pidió, entero:
   - **El panel, en tarjetas:** recepción de mercancías · temperaturas · limpieza y desinfección
     · trazabilidad · proveedores · alérgenos · plagas · mantenimiento · higiene y formación ·
     incidencias y acciones correctoras · documentación e informes.
   - **Quién hace qué:** el **gerente** configura (controles, equipos, frecuencias, límites,
     responsables y procedimientos). El **jefe de cocina y el jefe de sala** ejecutan y registran
     los de su área. **Los trabajadores** hacen controles concretos cuando se les asignan, y
     **nunca se les obliga a rellenar todo el APPCC**.
   - **El día a día:** los controles pendientes de hoy, los hechos, las incidencias abiertas, las
     alertas de temperatura fuera de rango, las próximas tareas y el responsable de cada una.
     **Cada control abre su pantalla rápida y propia**, no un formulario genérico: botones,
     selectores, números, foto cuando haga falta y la confirmación de quien lo hace.
   - **Recepción de mercancías:** proveedor, producto, fecha, lote cuando toque, temperatura si
     procede, estado del embalaje, caducidad y aceptar o rechazar. **Unida a proveedores y al
     almacén**: nada se escribe dos veces.
   - **Automático:** los controles se generan solos con las frecuencias y los horarios del
     gerente. Detecta lo que no se ha hecho, **pide la acción correctora** y avisa al
     responsable. **Una incidencia no se cierra sin decir qué se hizo y quién.**
   - **Historial y papeles:** cada registro con fecha, hora, usuario, resultado y el rastro de
     sus cambios. Filtros por fechas, responsables y categorías; informes en PDF; y toda la
     documentación del sistema a mano.
   - **Cómo se ve:** moderno, visual, rápido y mínimo, con el diseño de Estook. Tarjetas,
     indicadores, calendarios y tareas; **ni tablas interminables ni formularios largos**. Un jefe
     de cocina lo lleva **en segundos**, y el gerente ve cómo cumple el local.
   - **Antes de construir:** revisar lo que ya existe y **reutilizar** usuarios, proveedores,
     almacén, productos y permisos. No duplicar ni tocar otros módulos sin necesidad.
   - **La ley:** el Reglamento (CE) 852/2004, el Real Decreto 1021/2022 y lo sanitario que toque.
     **Los controles, límites y frecuencias se adaptan al APPCC real de cada local: Estook no se
     inventa límites legales universales.**
5. **Los fichajes para la Inspección (M15)**: en la ficha nueva del trabajador, el historial que
   ya existe, puesto bonito, con **exportar por fechas**: última semana, último mes o elegir días.
6. **Cada plan, lo suyo, y cuanto antes.** «Esto jamás puede pasar: no se pueden cruzar
   privilegios, y mucho menos datos entre empresas. Es crítico.» **Esencial tiene sus pantallas**
   y la seguridad de **no llegar a nada de Pro ni del TPV**: «solo la app de gestión, y conectarse
   a un TPV o traer información de él, punto». **En el servidor y en la base, no solo en la
   pantalla.** Es la entrega **S1** (sección 6), y lo que hay hoy de verdad, en la sección 8.
7. **Las pruebas pendientes de Richi, cuanto antes**, y sus documentos rehechos y ordenados sin
   perder nada: [`pruebas-pendientes.md`](../pruebas-pendientes.md).
8. **El piloto no cuenta como venta.** Es un amigo que ayuda a buscar fallos. **Cuando dé el
   visto bueno y todo funcione, se empieza a vender** (M28).

## 4 · El cobro integrado: se reabre el proveedor (pedido por Richi al contestar)

Richi, 11-nov: para cobrar con tarjeta en los Sunmi, «tal vez no usemos Stripe y usemos Caixa u
otros más baratos». Y una forma nueva de cobrar Estook: que Pro sea para quien quiere un TPV
nuevo y **ya tiene su datáfono**, y que **el cobro integrado se pague por aparato**, a un precio
asequible.

**Investigado el mismo día**, con sus fuentes, en
[la investigación del cobro, apartado 9](../estook-tpv-android-y-el-cobro.md). En corto:

- **Richi tiene razón en el precio.** El Banco de España publica lo que pagan de media los
  restaurantes a su banco: **alrededor del 0,36 %** con tarjetas de particulares (primer
  trimestre de 2026). Stripe cobra 1,4 % + 0,10 €, y 0,10 € más con Tap to Pay. **En un ticket de
  12 €, unos 5 céntimos con el banco y 37 con Stripe.**
- **Los Sunmi «P» son datáfonos**: llevan la app de pago del banco o del proveedor que los
  entrega, y **Tap to Pay no funciona en ellos**. Estook entra ahí **de app a app**: abre la app
  de pago con el importe y recibe «cobrado».
- **CaixaBank (Comercia Global Payments) tiene documentación pública** para las dos vías: Estook
  dentro de sus datáfonos Android, y su app «Smartphone TPV» en un Android con NFC. **Viva**
  también lo documenta. **Sin las tarifas ni las condiciones por escrito, no se elige.**
- **Lo que no cambia:** el adaptador `ProveedorDatafono`, que Estook no toca el dinero ni cobra
  un porcentaje de los cobros, y que el datáfono del banco sin conectar vale siempre.

**Queda sin decidir, y es de Richi** (sección 5): con qué proveedor se empieza y si el cobro
integrado se paga por aparato. **Hasta entonces la [0134](0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md)
vale en todo menos en «Stripe primero»**, y T8 · 2 no empieza sin esa respuesta.

## 5 · Lo que queda abierto, y es de Richi

1. **El proveedor del cobro integrado y el precio por aparato** (sección 4). Sus pasos: pedir a
   CaixaBank/Comercia y a Viva las condiciones de integrador y la tarifa para un bar, por
   escrito.
2. **El certificado de NO VERI\*FACTU**: Richi dijo «el que pidan, el gratuito». Al empezar
   T6 · 3 se comprueba en la fuente oficial qué certificado cualificado vale para una sociedad y
   para un autónomo y cuál es gratuito, y se le enseña antes de construir.
3. **El orden de los destinos de Calendario** (Calendario · Vacaciones · Turnos, o con Turnos en
   medio) y todo lo que se ve de las pantallas nuevas: **en su maqueta**, antes de construir.
4. **Uber Eats**: pedir ya el acceso de integrador, que tarda. Sin él, M29 no empieza.

## 6 · El orden hasta vender

Cada línea es una entrega con su pull request. **Nada se vende hasta que todo esté al cien por
cien** (0120) y el amigo dé el visto bueno.

```
HECHO       La reorganización (0146): solo documentos
AHORA       L · La limpieza: fuera Cuaderno, Pulse, Costes, Tareas y las pestañas que esperan;
            la Carta sin pestañas
            → S1 · Cada plan, lo suyo: la primera auditoría de seguridad
ESTOOK TPV  → M20 · 1 · Lo vendido baja del almacén → M20 · 2 · Lo que se escapa
            → R3 · 2 · La caja, segunda parte → lo que queda de T7 (sin internet en las nativas,
              las ventas de hoy, la venta rápida, Informes y Empleados con lo cobrado)
            → T6 · 3 · NO VERI*FACTU → T8 · Android (con el proveedor de cobro decidido)
            → AUDITORÍA 2 → M29 · Uber Eats (cuando den el acceso)
PERSONAS    → M13 · La ficha del trabajador → M14 · Calendario y Vacaciones
            → M15 · Fichajes → M16b · APPCC → AUDITORÍA 3
LA CARTA    → M12 y M11 · La carta online y la carta para imprimir
ESENCIAL    → M18 · Traer los datos de otro TPV
EL NEGOCIO  → M21 · La exportación → M22 · Fogón 2 → M23 · Reseñas → M25 · Avisos
            → M24 · Cadena → AUDITORÍA 4
VENDER      → M26 · Contratar solo y la web → M27 · La mudanza, las copias y el endurecimiento
            → M28 · El visto bueno del amigo → se vende
DESPUÉS     M31 · iPhone, si el mercado lo pide · Glovo y Just Eat · previsión y presupuesto
QUITADO     M17 · Cuaderno · M30 · API pública · Estook Pulse · Negocio › Costes · M19b (va en M18)
```

## 7 · Las reglas, para no programar a ojo

Richi: «es imperativo que nada de lo dicho se pierda; que los documentos sean claros y no se
contradigan; pon las reglas siempre; si hay dudas, preguntar e investigar; y auditar la
seguridad, los roles y las fugas de información cada cierto número de módulos».

1. **Una sola fuente por módulo.** Lo que entra, sus reglas y cuándo está terminado: **la parte D
   del Plan** (y el Anexo en lo de Estook TPV y la facturación). El mapa es el índice; ESTADO, lo
   que es cierto hoy; las decisiones, el porqué. Lo demás enlaza.
2. **Nada se construye por suposición** (Plan, A1, «Sin suposiciones»): no se inventan funciones
   ni requisitos; no se cambia lo aprobado sin permiso; no se rehace código por iniciativa propia;
   y ante una contradicción o una duda que toque a la arquitectura, **se para y se pregunta**.
3. **Las pantallas nuevas, con su maqueta aprobada antes del código.**
4. **Puntos de auditoría** (Plan, E5): **nunca más de cuatro entregas de código sin una**, las
   cuatro de la sección 6, y siempre antes de vender. Seguridad (negocios separados, roles,
   operaciones del servidor, límites de cada plan, sesiones, datos de empleados y clientes, el
   area manager solo en lo suyo) y calidad (unitarias, de integración, de pantalla, de permisos,
   de sincronización, sin internet y regresiones). **Un fallo crítico para todo lo demás.**
5. **Dos registros**: [las auditorías](../auditorias/LEEME.md) y
   [las pruebas pendientes](../pruebas-pendientes.md), con su resultado y su arreglo.
6. **No basta con esconder en la pantalla**: lo que un plan o un rol no puede, lo niegan el
   servidor y la base, y hay una prueba automática que lo intenta.

## 8 · Lo que decidió la IA al escribirlo, para que Richi lo sepa

1. **Solo documentos en esta entrega.** Quitar Cuaderno toca unas veinticinco piezas del código y
   una migración; va en «L · La limpieza», con sus pruebas. La tabla B5 del Plan sigue diciendo lo
   que hay en el código hasta ese día, y lo dice.
2. **Calendario › Tareas también sale**, aunque Richi no lo nombró: las limpiezas periódicas son
   controles del APPCC, y las revisiones y las visitas, recordatorios del Calendario. Dejarlo
   sería el tercer sitio para lo mismo.
3. **Los números de los módulos no se mueven.** M17 y M30 quedan como «quitado» y M19b dentro de
   M18, para no romper cien referencias.
4. **Lo del asesor se apunta como lo dijo Richi**: hablado y conforme, el 11-nov. Si hay papel,
   lo guarda él fuera del repositorio, que es público. Los textos de `docs/legal/` siguen
   marcados como borradores hasta que diga que también están vistos.
5. **Lo que dije de que Esencial podía llegar a cosas de Pro lo dije sin comprobarlo**, y no era
   exacto. Mirado en el código el mismo día: **los aparatos de Estook TPV ya los cierra la API**
   desde el 28-oct (0120: el latido, el PIN, vincular y todo lo que se hace tras el PIN), y
   **una prueba ataca toda la API desde otro negocio y con cada rol** en cada pull request. **Lo
   que falta**, y es S1: que las operaciones de Estook TPV que se hacen **desde Estook con la
   sesión de una persona** (montar la sala, el alta de facturación, lo de la caja) las cierre
   también el plan y no solo la pantalla; una prueba que recorra todo el catálogo con un local en
   Esencial; y las pantallas de Esencial repasadas una a una.
6. **Auditar «cada X módulos» queda en cuatro entregas como mucho**, y con nombre en el orden.
7. **Uber Eats va antes de vender, pero no lo frena** si Uber tarda en dar el acceso: ese día se
   le pregunta a Richi.
8. **Los 38 documentos de pasos pasan a `docs/pasos/`**, sin cambiarles una palabra, y los que
   siguen por probar se listan en un solo registro.
