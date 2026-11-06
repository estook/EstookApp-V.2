# 0134 · Estook TPV para Android: el TPV portátil y cobrar con tarjeta en el aparato

**Fecha:** 6 de noviembre de 2026
**Estado:** **propuesta, con cuatro preguntas para Richi** (abajo). Solo documentos: no se programa
nada hasta contestarlas y hasta acabar T7.
**Sigue:** la [0133](0133-r3-ajustes-y-secciones.md), punto 6.4 (Android como módulo final), y la
[0058](0058-el-cobro-los-pagos-y-la-caja.md) (Estook nunca toca el dinero).
**La investigación entera:** [Estook TPV para Android y cobrar con tarjeta en el aparato](../estook-tpv-android-y-el-cobro.md).
**Cambia:** el Plan (M20D nuevo y M31), el Anexo (10.7, 11.2 y 11.3), la Arquitectura (las
superficies), el Manifiesto (el cobro), el mapa, el plan de M20A y ESTADO.

**R4 queda aplazada** (Richi, 6-nov): sus cifras siguen escritas en la 0133, punto 6, y se hace después.

## Lo que pidió Richi

El 6-nov, después de R3: que Estook TPV se instale en **TPV Android con impresora dentro** (como el
SUNMI V3H) con **un SDK de pago** (como Tap to Pay de SumUp), para que **cobren y saquen el ticket
desde ahí**, y que se pueda **vincular como «TPV comandero portátil»** en Ajustes › Aparatos. Que se
investigue si es factible, qué aparatos valen, si hay algo mejor, si se puede cobrar con el móvil, y
**cuándo y en qué módulo** va.

## Lo que se propone

1. **Sí se hace.** Es factible con los TPV Android que **no son datáfono**, tienen **NFC** y llevan
   **los servicios de Google** (Sunmi V3 PLUS, V3, V3 MIX, T3, D3, FLEX 3; iMin…). **Los datáfonos
   Android (Sunmi P3, P2, PAX) no valen**: están cerrados a la app de su banco o proveedor.
2. **Una app de Android, `apps/tpv-movil`, con Capacitor**, que abre **el mismo Estook TPV** (como la
   caja para Windows) y pone solo lo del aparato: imprimir en la impresora de dentro y en las de red,
   el cajón, cobrar con tarjeta, el lector de códigos, el modo quiosco y no actualizarse en servicio.
   **Ninguna pantalla nueva.** Sustituye a «la cáscara» que la Arquitectura tenía prevista.
3. **El cobro con tarjeta, un segundo camino del datáfono conectado** (Anexo 10.7): además del lector
   en la nube, **en el propio aparato** (Tap to Pay) y con un **lector Bluetooth** para las tarjetas
   con chip. Detrás del mismo `ProveedorDatafono`. **Nunca se para un cobro**: si falla, el datáfono
   del banco, como en el nivel 1, que **no se quita nunca**.
4. **El «TPV portátil», como lo pidió Richi**: al vincular un aparato desde la app de Android, sale
   la opción **«TPV portátil»**: toma nota, imprime la cuenta y el ticket, y cobra con tarjeta en la
   mesa. Por dentro es un **comandero** con dos cosas más (imprime y cobra con tarjeta), y no una
   función nueva: así le valen el PIN, el bloqueo, la bolsa del camarero y los permisos de hoy sin
   tocar nada. **Al vincularlo, Estook comprueba si ese aparato puede cobrar con tarjeta** (Android,
   Google, NFC, parches) y lo dice antes de que alguien cuente con ello.
5. **El móvil del camarero también cobra**, si es Android con NFC y Google, con la app. Desde el
   navegador, nunca. **El iPhone, con su app, al final** (M31).
6. **La caja Android** (Sunmi T3 o D3) vale como caja con la app. **Que haga de centro sin internet**,
   como la caja para Windows, va en su propia entrega, al final de M20D.
7. **Estook no vende aparatos**: dice cuáles están probados y dónde se compran. Ninguna marca en el
   núcleo (Anexo 6.7): «funciona con tu TPV Android», no «compra este».
8. **Antes de recomendar un aparato, se prueba**: un Sunmi V3 PLUS con Google, un cobro de prueba con
   cada proveedor y una impresión.

### M20D en cuatro entregas

| Entrega                                | Qué deja                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T8 · 1 · La app de Android**         | `apps/tpv-movil` con Capacitor, firmada; imprimir en la impresora de dentro y en red, el cajón, el lector de códigos, el quiosco; «TPV portátil» en Aparatos |
| **T8 · 2 · Cobrar con tarjeta aquí**   | El primer proveedor: conectar la cuenta del local en Ajustes del TPV, Tap to Pay y el lector Bluetooth, anular y devolver, el cuadre solo                    |
| **T8 · 3 · Los lectores en la nube**   | El mismo proveedor desde la caja para Windows y la web (Stripe S700, SumUp Solo, Viva), y el segundo proveedor                                               |
| **T8 · 4 · La caja Android de centro** | Una caja Android hace lo que hace hoy la caja para Windows sin internet (T5 · 2 · 2)                                                                         |

**Terminado cuando**, en el local del amigo o en IKATZ: con un Sunmi V3 PLUS, se toma nota de una
mesa, sale en cocina, se imprime la cuenta en el propio aparato, se cobra con una tarjeta sin
contacto y con un móvil, sale el ticket con su QR, y al cerrar la caja **la tarjeta cuadra sola**.
Con internet cortado, se cobra con el datáfono del banco sin que nada se pare.

## Lo que decidió la IA, y por qué

1. **TPV que no son datáfono, con Google.** Es lo único que deja meter nuestra app y elegir el
   proveedor. Un datáfono Android ata al local a un solo proveedor y casi ninguno deja apps de fuera.
2. **Capacitor, en una app aparte que abre el mismo Estook TPV.** Es lo que ya hace la caja para
   Windows con Electron: una sola sala, una sola botonera, un solo cobro. Y Capacitor sirve también
   para el iPhone con el mismo proyecto.
3. **«TPV portátil» es un comandero que imprime y cobra**, no una función nueva. Richi lo ve como su
   propio tipo al vincular; por dentro no hace falta tocar permisos, PIN ni caja.
4. **El V3 PLUS antes que el V3H.** El V3H no está en la web de Sunmi España ni en ninguna lista de
   proveedor; el V3 PLUS es el que vende Sunmi hoy, con impresora de 80 mm y Google, y el V3 lo nombra
   Stripe.
5. **Estook no vende aparatos**: almacén, garantía y devoluciones son otro negocio.

## Las cuatro preguntas para Richi

1. **¿Cuándo se hace?** **A (recomendada):** justo después de T7, como **M20D**, antes de volver a
   M11: el TPV queda entero (pedir, imprimir y cobrar en la mesa) antes de vender nada. **B:** al
   final de la Fase 4, después de M18 y M19b. **C:** al final de todo, como decía la 0133.
2. **¿Con qué proveedor se empieza?** **A (recomendada): Stripe**: ya está en Estook, un solo SDK
   para Android, iPhone y lectores, y dice qué Sunmi valen (en España, su Tap to Pay en Android está
   en vista previa pública: se comprueba al empezar). **B: SumUp**: 1,49 % y muy conocido, pero su
   SDK de Tap to Pay se da con permiso y no publica qué aparatos valen. **C: Viva**: el que más
   tienen los bares, de app a app.
3. **¿Dónde vive el código de la app?** **A (recomendada): en este repositorio, en su propia
   carpeta**, como la caja para Windows: otro lenguaje y otra publicación, pero las mismas pruebas,
   el mismo formato de impresión y los mismos tipos. **B: en un repositorio aparte**, como decía la
   0133: hay que publicar o copiar lo compartido y mantener dos sitios a la vez.
4. **¿Gana Estook algo con los cobros?** **A (recomendada por ahora): no**, como dice la 0058: el
   local paga al proveedor y Estook no pone nada. **B: un acuerdo de socio con el proveedor**: el
   proveedor paga a Estook una parte de su comisión y el local paga lo mismo que yendo directo.
   **C: una comisión de Estook encima**: el local paga más.

Hasta que conteste, los documentos llevan la opción recomendada de cada una y lo dicen.
