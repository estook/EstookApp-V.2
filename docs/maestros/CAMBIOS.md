# Lo que cambió en cada versión de los maestros

Cada maestro dice en su cabecera **solo su versión de hoy**. Lo que cambió en las
anteriores vive aquí, de la más nueva a la más vieja ([0063](../decisiones/0063-una-fuente-por-tema.md)).
Los textos de las versiones 1.1 a 1.3 son los que llevaba cada cabecera, tal cual: por eso
hablan de «la Evolución» y de «Estook Enlace», que entonces se llamaban así.

## Manifiesto

**1.4** (30 de septiembre de 2026, [0055](../decisiones/0055-la-auditoria-profunda.md)). Recoge lo que era la Evolución: la tabla de cómo se leen los seis documentos, la frase «Estook gestiona. Estook TPV opera. Estook Link conecta. Fogón entiende.» y cómo sabremos que ha salido bien (1). **Estook TPV es una puerta propia** y **Estook Enlace pasa a llamarse Estook Link**, que además es el centro del local (1, 2, 17, 29). El principio 6 dice cuándo sí se borra, y el 12 deja de decir que «la ley no permite» emitir sin conexión (4). Las navegaciones de cada app se igualan a la tabla B5 del Plan (12 a 18). La persona sin correo y la corrección de un fichaje como registro nuevo (16). La bolsa del camarero (17). Lo que se hace con PIN «queda a nombre de», no «firma» (17, 28). Las gráficas (27). **La prueba pide tarjeta** y el pago fallido va como decidió E2 (31, 33). Los riesgos dicen la verdad de las copias, y entran cuatro nuevos (34). **El coste de servir a un local sale del capítulo 32** y vive en `docs/coste-por-local.md`; y «resultado medido» de la IA pasa a ser «objetivo», porque no estaba medido (20, 32; [0065](../decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)).

**1.3** (27 de septiembre de 2026, [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md)). El TPV tiene nombre, **Estook TPV**, y el capítulo 17 cuenta el cajón, el datáfono y el cierre con arqueo ciego; los pedidos de reparto entran en su cocina (capítulos 17 y 24); y en Integraciones, los pagos son **datáfonos del local**, no la suscripción de Estook (capítulo 24).

**1.2.** Estook también cobra: el local elige entre su TPV conectado o el TPV de Estook, con tickets y facturas que cumplen VeriFactu. Cambian los capítulos 1, 2, 4, 8, 9, 17, 24, 26, 29, 30, 32, 33, 34 y 35. Por qué y con qué riesgos, en la Evolución (capítulo 19); cómo se construye, en el **Anexo TPV y facturación**.

**1.1.** Recoge la Evolución de producto 1.0: Estook pasa de ser una aplicación de gestión a ser el sistema operativo del restaurante. Los capítulos afectados son el 1, el 6, el 7 nuevo (Pulse), el 20 (Fogón), el 21 nuevo (alertas), el 24 nuevo (integraciones) y el 33 (negocio y mercado). Todo lo demás sigue palabra por palabra, y eso también es una decisión.

## Arquitectura

**1.0** (30 de septiembre de 2026, [0063](../decisiones/0063-una-fuente-por-tema.md)). Documento nuevo. Reúne lo que estaba repartido: la pila, el repositorio y las superficies (Plan A3, A4 y A5), la arquitectura del TPV y los aparatos (Anexo 2 y 3.4), lo comprobado de Uber Eats y lo que no se toca (Evolución 11.1 y 15) y la lista de `ESTADO.md`; y lo que decidió la auditoría: el modelo de quién, dónde, desde qué y con qué caja, qué funciona sin conexión, las claves, el despliegue, las copias, la escala y la seguridad.

## Plan de desarrollo

**1.4** (30 de septiembre de 2026, [0055](../decisiones/0055-la-auditoria-profunda.md)). **El orden nuevo**: Estook TPV justo después de M10, M16 partido en M16a (la jornada) y M16b (APPCC), y H, I, A3 y A4 antes de M8 (D y E3, [0061](../decisiones/0061-el-orden-y-la-infraestructura.md)). A1 gana la tabla de qué regla vigila la máquina y las quince preguntas de antes de construir (venían de `docs/reglas.md` y de la Evolución 17). A2 quita la regla de las 300 líneas y fija `ESTADO.md` en 150. **A3, A4 y A5 pasan a la Arquitectura** y aquí queda el enlace. B5: Sala y Cocina viven en Estook TPV, y se corrigen «el máximo es cuatro» y «app → vista → ficha». **B9 nuevo: las gráficas.** M13 (persona sin correo), M15 (la corrección de un fichaje), M19 (Estook Link, el centro del local), M20 (la venta nace al cobrar), M20A (`apps/tpv`, terminal y operador), M20B (la empresa fiscal y el envío fuera de la transacción), M20C (cobro, pagos, caja y bolsa), M26 (la prueba pide tarjeta) y M27 (conservación, copias, Cloudflare y lo legal). **M22 mide el coste de Fogón y M27 hace la prueba final del coste por local** ([0065](../decisiones/0065-el-coste-por-local-y-la-copia-aplazada.md)).

**1.3** (27 de septiembre de 2026, [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md)). El TPV se llama **Estook TPV** y sigue siendo la misma aplicación (A5). M20A y M20C ganan cómo se ven y cómo se usan —el capítulo 10 del Anexo—: el cajón, los informes X y Z, el arqueo ciego y el datáfono. M29 se corrige con Uber Eats comprobado otra vez, y sus pedidos entran en la cocina de Estook TPV. Y se arreglan dos contradicciones: **Canarias sí factura, con IGIC** (M20B, [0043](../decisiones/0043-hasta-donde-llega-la-facturacion.md)), y **la impresión de Enlace es M19a**, antes de M20A (A5).

**1.2.** Estook también cobra (Evolución, capítulo 19). Cambian A1 (regla 15), A3 y A4 (dos piezas nuevas), M5, **la Fase 4, que se reordena y gana M20A, M20B y M20C**, M18, M20, M26, M27, M28, M29 y E3. La especificación completa del TPV y de la facturación está en el **Anexo TPV y facturación**, que manda en su tema.

**1.1.** Recoge la Evolución de producto 1.0. Los cambios están en A1 (la regla 14), en B7 (el tamaño deja de bloquear), en la parte D (cada módulo lleva ahora su capa inteligente, y hay dos módulos nuevos) y en E3. Lo demás sigue igual.

## Roles, vistas, auditorías y administración

**1.4** (30 de septiembre de 2026, [0055](../decisiones/0055-la-auditoria-profunda.md)). En 1.12: el terminal y su operador, la aprobación con el PIN de un superior, los límites por rol, «solo lo mío», la bolsa del camarero, dar de alta un terminal, y el titular de la empresa fiscal como único que autoriza ante Hacienda.

**1.3** (27 de septiembre de 2026, [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md)). El apartado 1.12 gana cinco filas: **abrir el cajón sin venta**, **ver el informe X**, **aceptar o rechazar un pedido de reparto**, **pausar la tienda en la plataforma** y **conectar un datáfono o un canal**. Son lo que trae el capítulo 10 del Anexo.

**1.2.** Estook también cobra (Evolución, capítulo 19). Entra el apartado **1.12**, con quién puede tomar nota, cobrar, facturar, rectificar y llevar la caja; se tocan el camarero, el cocinero y la gestoría; y el panel interno no puede tocar nada de facturación (4.8).

**1.1.** Recoge la Evolución de producto 1.0: cada rol tiene ahora su **zona de atención** en el Panel y su reparto de alertas, se dice quién ve **Estook Pulse**, las auditorías **detectan solas** lo que el resto de Estook ya sabe, y el panel interno vigila también las integraciones.

## Auditoría de flujos

**1.4** (30 de septiembre de 2026, [0055](../decisiones/0055-la-auditoria-profunda.md)). La venta nace al cobrar y el envío a Hacienda va fuera de la transacción (2.29); una comanda compromete existencias (2.27); sin internet la cocina sigue con Estook Link (2.32); la respuesta perdida (2.33); el turno de caja y el cierre del día (2.34); **2.35 nuevo**, liquidar una bolsa; los estados del documento fiscal, del cobro, del turno de caja, del terminal y de la aprobación (4); dos fallos nuevos (5); y más puntos en las listas de Facturación y de Caja (8).

**1.3** (27 de septiembre de 2026, [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md)). El pedido de reparto entra en la cocina de Estook TPV cuando el local cobra con Estook (2.15); cobrar en efectivo abre el cajón (2.29); entra el **2.34**, cerrar la caja con el TPV; tres fallos nuevos; la lista de comprobación gana **Caja**; y se corrige una contradicción: **Canarias sí puede activar la facturación**, con IGIC ([0043](../decisiones/0043-hasta-donde-llega-la-facturacion.md)).

**1.2.** Estook también cobra. Entran las ventas del TPV de Estook en el mapa, la ficha del **documento de facturación**, siete efectos en cadena (del 2.27 al 2.33), cuatro selectores, seis máquinas de estado, cinco fallos, cuatro hallazgos (del 19 al 22), siete decisiones y la lista de comprobación de **Facturación**.

**1.1.** Recoge la Evolución de producto 1.0: entran los canales de reparto en el mapa de dependencias, cuatro efectos en cadena nuevos, la máquina de estado de una alerta y de un pedido externo, seis hallazgos nuevos (del 13 al 18) y las decisiones de improvisación que traen las integraciones.

## Anexo · TPV y facturación

**1.2** (30 de septiembre de 2026, [0055](../decisiones/0055-la-auditoria-profunda.md)). Estook TPV con su propia puerta y Estook Link como centro del local sin internet ([0056](../decisiones/0056-estook-tpv-su-puerta-y-estook-link.md)); el terminal, el operador y la aprobación con PIN ([0057](../decisiones/0057-quien-es-quien-en-el-tpv.md)); cobro, pagos, caja y bolsa, y la venta que nace al cobrar ([0058](../decisiones/0058-el-cobro-los-pagos-y-la-caja.md)); el flujo de emisión corregido, con el envío fuera de la transacción, y «sin conexión» dicho como es: una limitación de la arquitectura, no de la ley ([0059](../decisiones/0059-emitir-un-documento-fiscal.md)); la empresa fiscal ([0060](../decisiones/0060-la-empresa-fiscal.md)); el modelo de datos reescrito (7); las pruebas renumeradas (8); once condiciones antes de producción (9); y la velocidad en toques (10.13).

**1.1** (27 de septiembre de 2026, [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md)). Los capítulos 3 a 7 decían **qué hace** el TPV y **dónde se guarda**; faltaba **cómo se ve y cómo se usa** un día normal, que es lo que decide si un camarero lo quiere o lo odia. Eso es el **capítulo 10**: el nombre —**Estook TPV**—, tomar nota, el plano, cobrar, **el cajón y la caja**, **el datáfono**, los pedidos de reparto en la misma cocina y la puesta en marcha. El capítulo 7 gana lo que eso necesita guardar. No se quita nada de la versión 1.0.

## Evolución de producto

**Dejó de ser un maestro el 30 de septiembre de 2026** ([0063](../decisiones/0063-una-fuente-por-tema.md)): repetía casi entero el Manifiesto. Dónde está ahora cada capítulo, en [su índice](Estook-Evolucion.md); su texto de la versión 1.2, guardado en [`docs/historia/`](../historia/Estook-Evolucion-1.2.md).

**1.2** (27 de septiembre de 2026). No cambia el rumbo: lo confirma. Richi volvió a mandar su visión del producto punto por punto, y **ya estaba toda escrita aquí**; lo que cambia es lo que se había quedado corto o mal. **Uber Eats, comprobado otra vez contra su documentación oficial** (11.1): cómo autoriza el restaurante, qué avisos manda de verdad —uno estaba mal descrito— y que solo una aplicación por tienda puede aceptar pedidos. **El TPV tiene nombre, Estook TPV**, y el Anexo gana su capítulo 10: cómo se ve y cómo se usa, con el cajón, el datáfono y los pedidos de reparto en la misma cocina. Y en el capítulo 11, los pagos son **datáfonos**, no la suscripción de Estook. El punto por punto, con lo que hay construido de cada cosa, está en [`docs/la-evolucion-punto-por-punto.md`](../la-evolucion-punto-por-punto.md); el porqué, en la [decisión 0054](../decisiones/0054-estook-tpv-y-uber-eats-comprobado.md).

**1.1** (lo primero que hay que saber). Cambia una frontera que los cinco documentos daban por fija: **Estook también cobra.** El local elige entre seguir con su TPV conectado o usar el TPV de Estook —sala, cocina, cobro, tickets y facturas cumpliendo VeriFactu—. Todo está en el **capítulo 19** y en el **Anexo TPV y facturación**. Donde cualquier documento diga que Estook no es un TPV, no cobra o no emite facturas, **manda el capítulo 19**.
