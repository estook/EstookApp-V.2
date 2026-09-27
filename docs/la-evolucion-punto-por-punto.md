# La evolución, punto por punto

**Para qué existe este papel.** El 27 de septiembre de 2026 Richi mandó su visión del
producto en veintidós puntos —«Estook = gestión + datos conectados + automatización +
inteligencia con Fogón»— para ordenar lo que viene. **Casi todo ya estaba escrito** en
los documentos maestros. Aquí está cada punto con tres cosas: **dónde está escrito**,
**qué hay ya en la app** y **qué falta, y en qué módulo cae**. Así nadie se pierde ni
lo construye dos veces.

> **Lo que manda:** para lo que va a pasar, el [Plan de desarrollo](maestros/Estook-Plan-de-Desarrollo.md);
> para lo que ya ha pasado, [`ESTADO.md`](../ESTADO.md). Este papel es un índice de los
> dos. Si dice algo distinto, el que está mal es este. El porqué de lo cambiado ese día,
> en la [decisión 0054](decisiones/0054-estook-tpv-y-uber-eats-comprobado.md).
>
> _Al día del 27-sep-2026, con R2 en producción. Lo siguiente es **H · Horarios**._

---

## Lo que no encajaba, y cómo quedó

Se revisó el texto de Richi frase a frase contra los maestros. Esto es lo que no
cuadraba, y lo que se hizo:

| #   | Lo que decía el texto                                             | Lo que está decidido                                                                                                                                                |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | «No queremos convertir Estook en otro TPV: el TPV sigue cobrando» | **Estook cobra** (20-sep). Richi aclaró que quería decir «no es un TPV más: es el mejor». **No se toca nada** del cobro                                             |
| 2   | «Tener Estook app y Estook TPV»                                   | **Dos nombres, una aplicación**: Estook TPV son los modos Sala y Cocina de la misma app. Es lo que hace que los datos lleguen al momento (Anexo 10.1)               |
| 3   | «Si piden ticket o recibo, tener Verifacti»                       | **El ticket se emite en cada cobro, lo pidan o no**: es la ley. El cliente elige cómo llevárselo —papel, correo o QR—, no si existe (Anexo 10.2)                    |
| 4   | La app «Inventario»                                               | **Se llama Almacén** desde el 25-sep ([0049](decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md), lo decidió Richi); **Inventario** es contar la cámara |
| 5   | «Mantener el chat previsto en la cabecera»                        | **El chat no existe todavía** y está sin decidir si va con Horarios o aparte (`ESTADO.md`, apartado 2). Lo que hay es el Tablón, para los avisos del día            |
| 6   | Prioridad 1, «rediseñar el Panel»                                 | **No es lo siguiente**: el Panel ya se ha ido haciendo por partes (el de cada puesto, «Hoy», la campana). La evolución no reordena los módulos (Evolución 16)       |
| 7   | Prioridad 2, «Fogón transversal»                                  | **Fogón no habla hasta M22**, y falta decidir el modelo, el presupuesto por local y la caché (`ESTADO.md`, apartado 2). Su sitio en pantalla sí está hecho          |
| 8   | Integraciones: «Pagos · Stripe»                                   | Stripe es **la suscripción de Estook**, no algo que conecte el local. Pasa a ser **«Datáfonos»**: Stripe Terminal, Viva.com, SumUp (Anexo 10.7)                     |
| 9   | Glop, Last.app y Revo con «Conectar»                              | Salen como **«próximamente»** hasta que exista su conexión. Revo y Last.app, además, **exigen aprobación**, pedida en septiembre                                    |
| 10  | «La integración con Uber Eats no debe convertir Estook en un TPV» | Con Estook TPV, el pedido de reparto **entra en su cocina** pero **no pasa por el cobro**: el cliente ya pagó a la plataforma (Anexo 10.8)                          |

Y dos que estaban **dentro de los propios maestros**, arregladas el mismo día: el Plan y
la Auditoría decían que **Canarias** no podía facturar, cuando la
[0043](decisiones/0043-hasta-donde-llega-la-facturacion.md) dice que sí, con IGIC; y el
Plan ponía la impresión de Enlace en dos sitios distintos.

---

## Los veintidós puntos

**Cómo leer la tabla.** ✓ hecho y en producción · ◐ empezado, con lo que falta al lado ·
○ escrito y sin empezar. «Dónde» es el documento que lo manda.

| #    | Punto                             | Dónde está escrito                                                                                                                                                | Qué hay ya                                                                                                                                                           | Qué falta, y cuándo                                                                                                               |
| ---- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| —    | **Objetivo · 250 KB**             | Evolución 1 · Plan B7                                                                                                                                             | ✓ **Se mide y no bloquea**; manda la velocidad, que sí bloquea                                                                                                       | Nada                                                                                                                              |
| 1    | **El nuevo concepto**             | Evolución 2 · Manifiesto 1                                                                                                                                        | ✓ Escrito, con el efecto en cadena                                                                                                                                   | Se construye módulo a módulo                                                                                                      |
| 2    | **Las ocho apps y su pregunta**   | Evolución 4 · Plan B5                                                                                                                                             | ✓ Las ocho, con su navegación, y **cada destino lleva escrita la pregunta que contesta** en el catálogo de navegación                                                | Llenarlas: cada módulo la suya                                                                                                    |
| 3    | **El Panel, centro de control**   | Evolución 5 · Roles 1.2 · [0047](decisiones/0047-lo-que-se-ordena.md)                                                                                             | ◐ El Panel de cada puesto, **«Hoy»** con lo que hay que hacer, las cifras con su semáforo y la **campana**                                                           | El personal previsto (**H**), las ventas previstas (**M21**) y la atención priorizada por Fogón (**M22**)                         |
| 4    | **Estook Pulse**                  | Evolución 6 · Plan M21                                                                                                                                            | ◐ Su sitio en Negocio, marcado M21; **Negocio → Informes** (R2) ya da cada cifra con su flecha y tres frases                                                         | **M21**: la nota con sus componentes, sus pesos y qué la baja                                                                     |
| 5    | **Fogón, el cerebro**             | Evolución 8 · Plan M22 · [0015](decisiones/0015-fogon-es-una-burbuja-no-una-pestana.md) · [0023](decisiones/0023-fogon-nunca-arma-su-contexto-en-el-navegador.md) | ◐ **Su sitio**: el banner encima del «+» y `⌘J`. Las reglas (propone y rellena; una persona guarda; ve lo que ve quien pregunta), escritas                           | **M22**. Antes, que Richi decida si habla antes (`ESTADO.md`, apartado 2)                                                         |
| 6    | **Horarios con Fogón**            | Evolución 7 · Plan M13 y M14 · Auditoría 2.17                                                                                                                     | ◐ El horario de siempre de cada persona y el fichaje                                                                                                                 | **H · Horarios** (lo siguiente): el cuadrante con su coste en vivo. **Que lo proponga Fogón**, con M22. **Nunca se publica solo** |
| 7    | **Almacén que predice**           | Evolución 7 · Plan M6, M7 y M8                                                                                                                                    | ◐ El pedido sugerido **con su porqué**, pesado por días de la semana; «mañana toca pedir»; caducidades y lo congelado; las subidas de precio                         | **M8**: consumo real, días que quedan y la previsión con día y hora                                                               |
| 8    | **Escandallos y margen**          | Evolución 7 · Plan M9 · Auditoría 2.1                                                                                                                             | ○ El diseño de Richi, escrito en el Plan ([0049](decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md))                                                    | **M9**. Nunca se recalcula el pasado con precios de hoy                                                                           |
| 9    | **Carta inteligente**             | Evolución 7 · Plan M10                                                                                                                                            | ◐ La carta **subida** en PDF o fotos, con su QR                                                                                                                      | **M10**: canales, la matriz de rentabilidad y lo que Fogón clasifica. **Nunca retira nada solo**                                  |
| 10   | **Documentos que se leen**        | Evolución 7 · Plan M11 y M22 · Auditoría 2.18                                                                                                                     | ○ La recepción del albarán línea a línea, a mano                                                                                                                     | **M22**: leer albaranes y contratos. **Fogón propone, una persona confirma**                                                      |
| 11   | **Centro de alertas**             | Evolución 9 · Plan M22 y M25 · [0052](decisiones/0052-la-campana-y-los-avisos.md)                                                                                 | ◐ **La campana** (R1): cada aviso lleva a donde se resuelve, uno por cosa y persona, y Ajustes → Avisos                                                              | Qué impacto tiene y qué se recomienda en cada uno (M22); el push (**I**, antes de M8)                                             |
| 12   | **El chat del equipo**            | Evolución 10 · Plan M23                                                                                                                                           | ○ No existe. **El Tablón** cubre los avisos del día                                                                                                                  | **Decisión de Richi**: con Horarios o aparte                                                                                      |
| 13   | **Integraciones**                 | Evolución 11 · Plan M18, M19 y M29                                                                                                                                | ◐ **Google** (Places). La pantalla **Servicio → Delivery**, sin botón de conectar a propósito ([0022](decisiones/0022-el-reparto-tiene-sitio-antes-que-conexion.md)) | M18 y M19 (TPV de otros), **M29** (la sección de Integraciones y los canales)                                                     |
| 13.1 | **Uber Eats**                     | **Evolución 11.1**, comprobado el 27-sep · Plan M29                                                                                                               | ○ Investigado contra su documentación oficial                                                                                                                        | **M29**, empezando por pedir la cuenta de desarrollador y su aprobación                                                           |
| 14   | **API pública**                   | Evolución 12 · Plan M30                                                                                                                                           | ○ La API interna, que es su base                                                                                                                                     | **M30**                                                                                                                           |
| 15   | **Area manager y cadenas**        | Evolución 13 · Roles 2 · Plan M24                                                                                                                                 | ◐ El rol, y qué locales ve cada uno lo decide la base                                                                                                                | **M24**: el panel de cadena, lo que se sale primero                                                                               |
| 16   | **Auditorías que detectan solas** | Evolución 13 · Roles 3 · Plan M24                                                                                                                                 | ○ Escrito entero                                                                                                                                                     | **M24**: tarea + responsable + fecha                                                                                              |
| 17   | **Interfaz**                      | Evolución 14 · Plan B · [0045](decisiones/0045-el-aspecto-y-el-orden.md)                                                                                          | ✓ El sistema de diseño, dos temas, el mosaico, poco texto (V, O y los repasos)                                                                                       | Seguir igual en cada módulo                                                                                                       |
| 18   | **«¿Qué quieres hacer?»**         | Evolución 14 · Manifiesto, principio 14                                                                                                                           | ✓ Es como se escriben los textos de la app                                                                                                                           | Seguir igual                                                                                                                      |
| 19   | **Datos y arquitectura**          | Evolución 15 · Plan A1 y A3                                                                                                                                       | ✓ Todo lo de la lista, construido y probado                                                                                                                          | Nada: **no se toca**                                                                                                              |
| 20   | **La regla sobre cambios**        | Evolución 17 · [`reglas.md`](reglas.md)                                                                                                                           | ✓ Es como se trabaja                                                                                                                                                 | —                                                                                                                                 |
| 21   | **El orden**                      | Evolución 16                                                                                                                                                      | ✓ Cada prioridad, con el módulo en que cae                                                                                                                           | —                                                                                                                                 |
| 22   | **El resultado y la regla final** | Evolución 17 y 18                                                                                                                                                 | ✓ Las quince preguntas antes de construir                                                                                                                            | —                                                                                                                                 |

---

## Estook TPV, que es lo que Richi quería detallar

**Cómo se ve y cómo se usa** está en el **capítulo 10 del Anexo TPV y facturación**:
un día de principio a fin, tomar nota en diez toques, el plano, la pantalla de cobrar,
**el cajón que se abre solo con efectivo**, los informes X y Z con **arqueo ciego**,
**el datáfono** —el del banco para todos, y conectado después—, los pedidos de reparto
**en la misma cocina**, qué se ve sin internet, qué lo hace mejor que los demás y cómo
se pone en marcha. **Estook no hace nunca de banco**: el efectivo va al cajón, la
tarjeta al datáfono, y Estook registra la venta.

**Cuándo se construye.** Es la **Fase 4** del Plan, después de M17, porque un TPV sin
carta, sin fichas y sin servicio no existe. Los conectores de otros TPV (M18 y M19b) van
al final de la fase, y los canales de reparto, en la 7:

| Orden | Módulo                        | Qué deja                                                     | Necesita antes         |
| ----- | ----------------------------- | ------------------------------------------------------------ | ---------------------- |
| 1     | **M20** · Ventas y consumo    | Un solo motor de consumo para todas las vías                 | M6½                    |
| 2     | **M19a** · Enlace e impresión | Imprimir en cualquier impresora, con las tablets apagadas    | —                      |
| 3     | **M20A** · Sala y cocina      | Tomar nota, cocina por partidas, el pase. Sin cobrar         | M9, M10, M16 y M19a    |
| 4     | **M20B** · Facturación        | Tickets y facturas con Verifacti                             | **El asesor fiscal**   |
| 5     | **M20C** · Cobro y caja       | Cobrar, el cajón, X y Z, arqueo ciego, el datáfono del banco | M20A y M20B            |
| 6     | **Datáfono conectado**        | El importe viaja solo, local a local                         | M20C y **Richi elige** |
| 7     | **M29** · Canales (Fase 7)    | Uber Eats, y sus pedidos en la cocina de Estook TPV          | La aprobación de Uber  |

**Lo que espera fuera del código**, y sin esto M20B no va a producción: las respuestas
del asesor fiscal (en `ESTADO.md`, apartado 2, y dos nuevas: **quién factura un pedido
de plataforma** y **si el correo y el QR valen como entrega del ticket**), la
declaración responsable firmada y la suscripción de Verifacti con su NIF de producción.

---

## Lo que es de Richi, y cuándo

Nada de esto frena **H · Horarios**, que es lo siguiente.

| Qué                                                             | Cuándo hace falta             |
| --------------------------------------------------------------- | ----------------------------- |
| El chat de Estook: con Horarios o aparte                        | **Antes de empezar H**        |
| Si Fogón habla antes de M22 (modelo, presupuesto por local)     | Antes de «Horarios con Fogón» |
| Las preguntas del asesor fiscal                                 | Antes de M20B                 |
| En qué planes entra el TPV, y el soporte en horario de servicio | Antes de vender el primer TPV |
| Si el camarero cobra por defecto                                | M20C                          |
| Qué datáfono conectado va primero                               | Al terminar M20C              |
| Pedir la cuenta de desarrollador de Uber Eats                   | Al empezar M29                |
