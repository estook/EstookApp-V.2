# El mapa · dónde está cada módulo, cómo va y qué le falta

> **Es el índice.** Una fila por módulo o entrega, **en el orden en que se construye**: qué es,
> cómo está, qué le falta y **en qué documento está escrito entero**. Rehecho el 11-nov-2026
> ([0146](decisiones/0146-la-reorganizacion-del-11-nov.md)); el de antes, en [la historia](historia/MAPA-de-modulos-hasta-el-11-nov-2026.md).
>
> | Para saber…                                    | Manda                                                                                                                           |
> | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
> | Qué entra en un módulo y cuándo está terminado | Su ficha en la **parte D del [Plan](maestros/Estook-Plan-de-Desarrollo.md)**                                                    |
> | Cómo es Estook TPV y la facturación            | El **[Anexo](maestros/Estook-Anexo-TPV-y-Facturacion.md)**, y [el plan de Estook TPV](m20a-la-sala-y-la-cocina.md) para T1 a T8 |
> | Qué está construido de verdad                  | **[`ESTADO.md`](../ESTADO.md)**                                                                                                 |
> | Por qué se decidió así                         | [`docs/decisiones/`](decisiones/LEEME.md)                                                                                       |
> | Lo que hizo cada entrega                       | [`historia-de-los-modulos.md`](historia-de-los-modulos.md)                                                                      |
>
> Si dos no dicen lo mismo, manda el Plan para lo que va a pasar y `ESTADO.md` para lo que ya
> ha pasado; y se arregla el otro en el mismo pull request.

---

## 1 · Lo que ya está hecho

| Módulo                                  | Qué es                                                                                              | Dónde leerlo                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **M0 a M6½ · La base**                  | Cuentas, roles y permisos, entrar y el alta, el almacén como libro de movimientos                   | [Plan](maestros/Estook-Plan-de-Desarrollo.md), Fase 1 y M6                                                                  |
| **M7 · Compras**                        | Proveedores, pedido sugerido, recibir «¿entero o con cambios?» y la factura conciliada              | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M7                                                                           |
| **Antes de M8**                         | Horarios (H), la app instalable (I), el chat (C), el admin (A1 a A4), el pago (E1 y E2), avisos (R) | [mejoras](historia/modulos/mejoras-antes-de-m8.md)                                                                          |
| **M8 · Inventario**                     | Contar a ciegas, el valor en una fecha, FEFO, food cost real y lo gastado                           | [0078](decisiones/0078-las-respuestas-de-m8.md), [0079](decisiones/0079-lo-gastado-y-la-desviacion.md)                      |
| **M9 · Escandallos**                    | El plato y su carta, escandallos con lo que deja cada canal, fichas técnicas                        | [0086](decisiones/0086-las-respuestas-de-m9.md) a [0095](decisiones/0095-lo-vendido-sin-escandallo-y-cuando-llega-fogon.md) |
| **Fogón 1**                             | Preguntar, rellenar escandallos, leer albarán, Z y merma por foto, borradores de pedido y cuadrante | [0097](decisiones/0097-fogon-1-las-respuestas-y-la-base.md), [0098](decisiones/0098-fogon-1-entero.md)                      |
| **M10 · Carta y menús**                 | Agotados, leer tu carta, el equilibrio, el menú del día y «Analiza mi zona»                         | [0102](decisiones/0102-m10-1-la-carta-que-trabaja.md), [0104](decisiones/0104-m10-2-los-menus-y-tu-zona.md)                 |
| **M16a · La jornada**                   | El día que se abre solo, cerrar en tres pasos y reabrir con motivo                                  | [0105](decisiones/0105-m16a-la-jornada.md)                                                                                  |
| **T1 a T4 · Estook TPV** (M20A)         | La puerta y el PIN, la sala, la botonera, las opciones y las bebidas, la cocina y la barra          | [el plan](m20a-la-sala-y-la-cocina.md); [Anexo](maestros/Estook-Anexo-TPV-y-Facturacion.md), capítulos 3 y 11               |
| **T5 · La caja para Windows** (M19a)    | Imprimir y el cajón, cada aparato aguanta solo, la comanda llega por la caja sin internet           | [0119](decisiones/0119-t5-la-caja-para-windows.md) a [0124](decisiones/0124-t5-2-2-2-los-pin-y-aparatos.md)                 |
| **T6 · 1 y T6 · 2 · Facturar** (M20B)   | El alta, el ticket, las facturas, las correcciones y «Pide tu factura», con VERI\*FACTU             | [0126](decisiones/0126-t6-1-el-alta-de-facturacion.md) a [0141](decisiones/0141-t6-2-3-pide-tu-factura.md)                  |
| **Las pausas del 5 y del 8-nov**        | Lo rápido, la sala y la mesa, Ajustes, precios; Información, Informes y Empleados; el repaso        | [0130](decisiones/0130-la-pausa-del-5-nov-r1-lo-rapido.md) a [0143](decisiones/0143-el-repaso-del-8-nov.md)                 |
| **R3 · 1 · La caja** (de M20C)          | Abrir caja, cobrar, el cajón, «Cómo va», cerrar a ciegas y Cierres de caja                          | [0144](decisiones/0144-r3-la-caja.md)                                                                                       |
| **Cobrar en la mesa** (de M20C)         | El comandero cobra, el efectivo pendiente con PIN y Negocio › Ventas en tres                        | [0145](decisiones/0145-cobrar-en-la-mesa-y-negocio-ventas.md)                                                               |
| **La reorganización y L · La limpieza** | Fuera Cuaderno, Pulse, Costes y Tareas: siete apps; la Carta sin pestañas; el orden hasta vender    | [0146](decisiones/0146-la-reorganizacion-del-11-nov.md), secciones 1 y 9                                                    |
| **S1 · Cada plan, lo suyo**             | Que Esencial no llegue a nada de Pro ni de Estook TPV, en el servidor y en la base                  | [0147](decisiones/0147-s1-cada-plan-lo-suyo.md)                                                                             |
| **El rediseño** (0148)                  | La puerta, la barra con iconos, las mesas sólidas, la venta rápida y el Panel de cada puesto        | [0148](decisiones/0148-el-rediseno.md)                                                                                      |

---

## 2 · Lo que queda, en el orden en que se construye

Cada fila es una entrega con su pull request, o varias si lo dice. **Las pantallas nuevas llevan
su maqueta aprobada antes del código**, y **las AUDITORÍAS son las del Plan, E5**.

### Ahora

| Entrega                                          | Qué es                                                                                                                                                                                         | Cómo está                                                                                                                                                      | Dónde está escrito                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Ampliación 1 · Los fallos del servicio**       | La venta rápida a 0 € al volver, la bebida «Bebiendo» sin servir, el PIN al recargar, las tarjetas del Panel a su tamaño, fuera el menú del día, Ajustes más corto; y la auditoría que se debe | Propuesta: maqueta para aprobar (24-nov)                                                                                                                       | [0153](decisiones/0153-la-ampliacion.md), secciones 2 y 3; [la maqueta](maquetas/la-ampliacion.html)    |
| **Ampliación 2 · El comandero y la carta**       | La venta rápida en el comandero, abrir mesa en dos toques, la foto del almacén en la carta, escandallos sin bebidas ni cafés, «Más vendidos» sin bebidas                                       | Propuesta                                                                                                                                                      | [0153](decisiones/0153-la-ampliacion.md), secciones 2 y 3                                               |
| **Ampliación 3 · La ficha del trabajador** (M13) | La ficha nueva, el alta en tres formas con Fogón, las nóminas y el historial de jornadas. Dos entregas                                                                                         | Propuesta                                                                                                                                                      | [0153](decisiones/0153-la-ampliacion.md), sección 4; [Plan](maestros/Estook-Plan-de-Desarrollo.md), M13 |
| **Ampliación 4 · Calendario y vacaciones** (M14) | Equipo, Personal y Propuestas; pedir, negociar y aprobar vacaciones con el saldo calculado                                                                                                     | Entera en producción (#204 a #207): el horario, las vacaciones, los laborables y el calendario del equipo                                                      | [0153](decisiones/0153-la-ampliacion.md), sección 5; [Plan](maestros/Estook-Plan-de-Desarrollo.md), M14 |
| **Ampliación 5 · Las reservas** (M32)            | Reservas sobre el plano del TPV, la web del local, los correos, los clientes y la lista de espera. Tres entregas; apagado de fábrica                                                           | La 5 · 1 (el motor y la sala en el TPV) y la 5 · 2 (la web y los correos), hechas y por fusionar; falta la 5 · 3 (clientes y lista de espera)                  | [0153](decisiones/0153-la-ampliacion.md), sección 6; [Plan](maestros/Estook-Plan-de-Desarrollo.md), M32 |
| **M20 · 1 · Lo vendido baja del almacén**        | Cada cobro resta lo de su escandallo, tal cual y con el coste de ese día; el ticket anulado devuelve todo y la devolución, solo con «Se cobró de más»; Por producto; una sola vez              | **En producción** (#196, migraciones 0121 a 0123, API 139/371, 22-nov; la 0123, fuera el aprovechamiento: [0150](decisiones/0150-fuera-el-aprovechamiento.md)) | [0149](decisiones/0149-m20-1-lo-vendido-baja.md); [la maqueta](maquetas/m20-1-lo-vendido-baja.html)     |

### Estook TPV, hasta el final

| Entrega                                 | Qué es                                                                                                                                                                                                          | Cómo está                                                                    | Dónde está escrito                                                                                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M20 · 2 · Lo que se escapa**          | En Consumo, el food cost de tus escandallos junto al real y los productos que se salen del margen (5 % y 5 €), como mucho tres. La carta en cuatro ya estaba (0142)                                             | **En producción** (#197), sin migración                                      | [0151](decisiones/0151-m20-2-lo-que-se-escapa.md); [la maqueta](maquetas/m20-2-lo-que-se-escapa.html); [el diseño](como-detecta-estook-lo-que-se-escapa.md)   |
| **R3 · 2 · 1 · La caja, segunda parte** | «Retirar» con la caja fuerte, el aviso del descuadre al gerente, «Quédate el cambio» y el reparto, escribir el total y entregar la caja sin cerrar el día                                                       | **En producción** (#198, migración 0124, API 139/373)                        | [0152](decisiones/0152-r3-2-1-la-caja-segunda-parte.md); [la maqueta](maquetas/r3-la-caja.html)                                                               |
| **R3 · 2 · 2 · Los descuentos**         | Descontar al cobrar, con motivo, su permiso y la aprobación de un encargado, en la caja, la venta rápida y el comandero; el ticket con el IVA ya rebajado                                                       | Maqueta corregida y aprobada (23-nov); **ahora**, en `r3-2-2-los-descuentos` | [0152](decisiones/0152-r3-2-1-la-caja-segunda-parte.md); [la maqueta](maquetas/r3-la-caja.html)                                                               |
| **Lo que queda de T7**                  | **Cobrar sin internet en las apps nativas**, con su justificante; las ventas de hoy; para llevar (la venta rápida ya está, 0148; falta cobrarla sin internet); Información, Informes y Empleados con lo cobrado | Sin empezar                                                                  | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M20C; [el plan](m20a-la-sala-y-la-cocina.md), T7; [Anexo](maestros/Estook-Anexo-TPV-y-Facturacion.md), 10 y 11 |
| **T6 · 3 · NO VERI\*FACTU**             | Facturar sin enviar cada ticket a Hacienda, **como manda la ley**: firma con certificado, cadena y QR                                                                                                           | Sin empezar; el certificado se comprueba al empezar                          | [0127](decisiones/0127-con-verifactu-sin-envio-o-fuera.md); [el plan](m20a-la-sala-y-la-cocina.md), T6 · 3                                                    |
| **T8 · Estook TPV para Android** (M20D) | La app de Android con el mismo Estook TPV, el TPV portátil que imprime, y cobrar con tarjeta en el aparato. Cuatro entregas                                                                                     | Decidido; **el proveedor y el fijo por aparato, sin decidir** (apartado 10)  | [0134](decisiones/0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md); [la investigación](estook-tpv-android-y-el-cobro.md), apartados 9 y 10             |
| **AUDITORÍA 2**                         | Seguridad y calidad de todo Estook TPV                                                                                                                                                                          | —                                                                            | [Plan](maestros/Estook-Plan-de-Desarrollo.md), E5                                                                                                             |
| **M29 · Uber Eats**                     | Que los pedidos de reparto entren solos y lleguen a la cocina. Después, Glovo y Just Eat                                                                                                                        | Sin empezar; **falta el acceso de Uber**, que se pide ya                     | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M29; [Anexo](maestros/Estook-Anexo-TPV-y-Facturacion.md), 10.8                                                 |

### Personas

| Entrega                           | Qué es                                                                                                                           | Cómo está                                                                                                                                                                                                     | Dónde está escrito                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **M13 · La ficha del trabajador** | La ficha rehecha; a mano o automática, con Fogón leyendo el contrato; «Subir contrato»; contratos, festivos y bolsa de horas     | Hecho: las personas y lo que cobra cada una. **Se adelanta a la Ampliación 3** (0153)                                                                                                                         | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M13 |
| **M14 · Calendario y Vacaciones** | Una app de calendario: recordatorios general, de sala o de cocina; notas personales; y las vacaciones, que se piden y se validan | Hecho con la Ampliación 4: Equipo con sus recordatorios, Personal con las notas y las vacaciones, Propuestas y Turnos. Falta: recurrencias, suscripción de calendario, «solo lo mío» y la historia del Tablón | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M14 |
| **M15 · Fichajes**                | Las pausas, las horas extra y exportar el historial por fechas desde la ficha                                                    | Hecho: fichar en el móvil y en la caja                                                                                                                                                                        | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M15 |
| **M16b · APPCC**                  | Servicio › APPCC e Historial: un sistema de tareas, no un formulario; con sus papeles para Sanidad                               | Sin empezar                                                                                                                                                                                                   | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M16 |
| **AUDITORÍA 3**                   | Sobre todo, los datos de los empleados                                                                                           | —                                                                                                                                                                                                             | [Plan](maestros/Estook-Plan-de-Desarrollo.md), E5  |

### La carta, Esencial y el negocio

| Entrega                                                  | Qué es                                                                                                                                  | Cómo está                                                       | Dónde está escrito                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **M12 y M11 · La carta online y la carta para imprimir** | Carta › «⋯» › «Carta online»: el enlace, el QR, la carta bonita en el móvil del cliente y la carta en PDF de imprenta, en cinco diseños | Hecho: el QR enseña la carta subida; los PDF salen del servidor | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M11 y M12                                               |
| **M18 · Traer los datos de otro TPV**                    | Para Esencial: sus ventas y sus cierres, conectado, por fichero, por foto del ticket de cierre o a mano. Lleva dentro lo que era M19b   | Hecho: el cierre a mano, con CSV, y el Z por foto               | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M18 y M19                                               |
| **M21 · La exportación**                                 | Los datos ordenados, tipo resumen de todo, que es también la pantalla de la gestoría. Sin Pulse ni Costes                               | Hecho: Ventas, Informes y Empleados                             | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M21                                                     |
| **M22 · Fogón 2**                                        | Fogón con ventas: el análisis del cierre, «¿cuánto preparo mañana?», los precios y la desviación explicada                              | Hecho: Fogón 1                                                  | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M22; [`fogon-en-cada-sitio.md`](fogon-en-cada-sitio.md) |
| **M23 · Reseñas**                                        | Clasificar las reseñas, proponer la respuesta y la competencia de la zona                                                               | Hecho: la nota de Google y «Analiza mi zona»; el chat (C)       | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M23                                                     |
| **M25 · Avisos**                                         | Los tres niveles, WhatsApp, y «mañana entras a las 9» sin abrir la app                                                                  | Hecho: la campana y los avisos al móvil                         | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M25                                                     |
| **M24 · Cadena**                                         | El area manager ve la lista de sus restaurantes, el resumen de todos y entra en cada uno como su gerente. **Solo los suyos**            | Hecho: varios locales al pagar y los permisos por cadena        | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M24; [Roles](maestros/Estook-Roles-y-Administracion.md) |
| **AUDITORÍA 4**                                          | Entera, antes de vender                                                                                                                 | —                                                               | [Plan](maestros/Estook-Plan-de-Desarrollo.md), E5                                                      |

### Vender

| Entrega                                  | Qué es                                                                                                          | Cómo está                                                      | Dónde está escrito                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **M26 · Contratar solo y la web**        | La web pública entera, el antiabuso y las facturas de la cuota. (Los límites de cada plan ya se hicieron en S1) | Hecho: el pago con Stripe, la Pausa y el admin                 | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M26 y la parte C; [`web-publica.md`](web-publica.md)    |
| **M27 · La mudanza y el endurecimiento** | Cloudflare Pages, Supabase Pro, **las copias encendidas**, el repositorio en privado, la carga y lo legal       | Escrito, sin encender                                          | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M27; [`copias-de-seguridad.md`](copias-de-seguridad.md) |
| **M28 · El visto bueno del amigo**       | Su restaurante trabajando con Estook y Estook TPV, sin pagar. Cuando dé el visto bueno, **se vende**            | Sus pasos, en [`pruebas-pendientes.md`](pruebas-pendientes.md) | [Plan](maestros/Estook-Plan-de-Desarrollo.md), M28                                                     |

### Después de vender

**M31 · Estook TPV para iPhone y iPad**, solo si el mercado lo pide · Glovo y Just Eat (M29) · la
previsión de ventas y el presupuesto (M21).

---

## 3 · Lo que se quitó, y dónde quedó

| Qué                               | Cuándo                                                           | Dónde quedó lo que tenía                                                            |
| --------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **M17 · Cuaderno**                | 11-nov ([0146](decisiones/0146-la-reorganizacion-del-11-nov.md)) | El Tablón, las notas personales del Calendario (M14) y APPCC › Mantenimiento (M16b) |
| **Estook Pulse** (de M21)         | 11-nov                                                           | En ningún sitio: se elimina                                                         |
| **Negocio › Costes** (de M21)     | 11-nov                                                           | Ya estaba: Ventas (food cost), Mermas, Escandallos (bajo objetivo) y Consumo        |
| **Calendario › Tareas** (de M14)  | 11-nov                                                           | Las limpiezas, al APPCC; las revisiones y las visitas, recordatorios del Calendario |
| **M30 · API pública**             | 11-nov                                                           | En ningún sitio: fuera del todo                                                     |
| **M19b**, como entrega aparte     | 11-nov                                                           | Dentro de M18                                                                       |
| **El modo cocina de Escandallos** | 16-oct (0090)                                                    | En servicio, la cocina tiene Estook TPV                                             |

**No se vende nada hasta el visto bueno de M28** (0120 y 0146). Lo que lleva cada plan ese día, en
el Manifiesto, capítulo 32.

---

## 4 · Lo que queda preparado, y dónde se termina

Lo que ya existe a medias y el módulo que lo acaba. Vivía en `ESTADO.md` hasta el 30-sep-2026.

| Qué                                                        | Dónde se termina       | Qué hay ya                                                     |
| ---------------------------------------------------------- | ---------------------- | -------------------------------------------------------------- |
| Unir dos personas que resultan ser la misma                | **M13**                | Poner el correo a quien no lo tenía, que no une (H1)           |
| Business Profile: leer y contestar reseñas                 | Con accesos            | La nota en Google con su evolución, en Negocio → Reseñas (R2)  |
| Calendario, avisos con roles y turnos                      | **M14**                | La tabla, su seguridad por roles y «Lo que viene»              |
| Recalcular platos con lo que corrigió la factura           | **M9**                 | Lo cobrado, en cada línea del albarán con fecha                |
| El pedido en PDF con el logo                               | **M11**                | «Imprimir», sin membrete                                       |
| El precio pactado para toda una cadena                     | **M24**                | Lo pactado por local                                           |
| Leer el albarán de una foto                                | **Hecho** (Fogón 1)    | Al recibir, con Fogón (0098)                                   |
| Avisos de fichar por push, y que fuera de turno no suene   | **Mejoras · I**        | La campana (R1) y el horario de siempre, que el widget ya dice |
| Lo gastado de verdad, food cost real y desviación          | **M8**, la 2.ª         | Contar en dos pasos, el valor en una fecha y FEFO (0078)       |
| Desviación de los platos (sin aprovechamiento, 0150)       | **M20** (0092)         | Lo contado con su hora, y la pantalla que deja M8 (0078)       |
| Descontar lo vendido del inventario                        | **M20**                | El cierre guarda los platos con el nombre normalizado          |
| Los terminales del local                                   | **Hecho** (T1, 0108)   | Caja, comandero y fichar; cocina y barra se vinculan con T4    |
| Leer los platos de la carta subida y proponer los cambios  | **Hecho** (M10 · 1)    | Del PDF sin IA o de las fotos con Fogón (0102)                 |
| Estrella, caballo, puzzle y perro (lo que deja cada plato) | **M20** (0103)         | Lo que deja cada plato por canal, del escandallo (M9 · 2)      |
| Fogón propone el menú del día                              | **M22** (0103)         | Con cuatro semanas de menús: M10 · 2 guarda el de cada día     |
| Destacados y columnas de la carta                          | **M11 y M12** (0103)   | El orden de secciones y platos, con las flechas (M9 · 1)       |
| Comparar precios con los locales de Estook, sin nombres    | **M23**, con clientes  | «Analiza mi zona» con Fogón (M10 · 2), de cada local           |
| Plato, ficha técnica y escandallo unidos por su id         | **Hecho** (M9 · 1 y 2) | El plato nace en la Carta y su escandallo cuelga de él (0086)  |
| La historia del Tablón, por días                           | **M14** (0146)         | El Tablón, con sus notas guardadas (0049)                      |
| Cerrar un local (y que la cuota baje)                      | Sin fecha              | La cuota ya sube sola al abrir uno                             |

**Sin prisa, de código:** volver a `BrowserRouter` ahora que hay dominio
([0008](decisiones/0008-enrutado-con-almohadilla.md)); pasar Pedidos, Albaranes y
Facturas a `usarListaLarga` cuando una crezca; subir a React Router 7; **pasar las máquinas de GitHub a Ubuntu 26**
cuando convenga (desde el 17-oct todas van fijas en la 24, y no en `ubuntu-latest`, que
cambia el 19-oct: se sube a mano, todas a la vez y con las capturas rehechas en el mismo
cambio); y el vectorial del logotipo y de Fogón cuando aparezcan.
