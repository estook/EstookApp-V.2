# 0134 · Estook TPV para Android: el TPV portátil y cobrar con tarjeta en el aparato

**Fecha:** 6 de noviembre de 2026
**Estado:** **decidido el 6-nov con las cuatro respuestas de Richi** (abajo). Solo documentos: se
programa después de T7, como **M20D**.
**Sigue:** la [0133](0133-r3-ajustes-y-secciones.md), punto 6.4 (Android como módulo final), y la
[0058](0058-el-cobro-los-pagos-y-la-caja.md) (Estook nunca toca el dinero).
**La investigación entera:** [Estook TPV para Android y cobrar con tarjeta en el aparato](../estook-tpv-android-y-el-cobro.md).
**Cambia:** el Plan (M20D y M31), el Anexo (6.3, 10.7, 11.2 y 11.3), la Arquitectura, el Manifiesto,
el mapa, el plan de M20A, el coste por local, ESTADO y la carpeta de lo pasado.

**R4 se paró solo para hablar de esto** (Richi, 6-nov): **va ahora**, tal como está en la 0133, punto 6, y después T6 · 2 · 1.

## Lo que pidió Richi

El 6-nov, después de R3: que Estook TPV se instale en **TPV Android con impresora dentro** (como el
SUNMI V3H) con **un SDK de pago** (como Tap to Pay de SumUp), para que **cobren y saquen el ticket
desde ahí**, y que se pueda **vincular como «TPV comandero portátil»** en Ajustes › Aparatos. Que se
investigue si es factible, qué aparatos valen, si hay algo mejor, si se puede cobrar con el móvil y
**cuándo y en qué módulo** va. Y después: **que sea legal, que sea rápido y que se cobre sin salir de
la app**, todo integrado.

## Lo decidido

1. **Sí se hace.** Vale un TPV Android **que no sea datáfono**, con **NFC** y **los servicios de
   Google** (Sunmi V3 PLUS, V3, V3 MIX, T3, D3, FLEX 3; iMin; muchos móviles). **Los datáfonos
   Android (Sunmi P3, P2, PAX) no valen**: van cerrados a la app de su banco o proveedor.
2. **Una app de Android, `apps/tpv-movil`, con Capacitor**, que abre **el mismo Estook TPV** (como la
   caja para Windows) y pone solo lo del aparato: imprimir en la impresora de dentro y en las de red,
   el cajón, cobrar con tarjeta, el lector de códigos, el modo quiosco y no actualizarse en servicio.
   **Ninguna pantalla nueva.** Es «la cáscara» que la Arquitectura ya tenía prevista, con nombre.
3. **Se cobra sin salir de Estook, con Stripe.** El camarero toca **Cobrar › Tarjeta** y aparece,
   dentro de la misma app, la pantalla de Stripe para acercar la tarjeta (con los colores de
   Estook); si la tarjeta pide el PIN, se teclea ahí mismo; al acabar vuelve a Estook con «Cobrado»
   y el ticket sale solo. **Lo gestiona entero el SDK de Stripe**: Estook no ve la tarjeta.
4. **Tres caminos detrás de `ProveedorDatafono`** (Anexo 10.7): **en el propio aparato** (Tap to
   Pay), con un **lector Bluetooth** para las tarjetas que piden el chip, y el **lector en la nube**
   para la caja para Windows y la web. **Nunca se para un cobro**: si falla o no hay internet, el
   datáfono del banco, que **no se quita nunca**.
5. **El «TPV portátil»**: al vincular desde la app de Android sale como su propia opción. Toma nota,
   imprime la cuenta y el ticket, y cobra con tarjeta en la mesa. Por dentro es un **comandero** que
   además imprime y cobra: el PIN, el bloqueo, la bolsa del camarero y los permisos son los de hoy.
   **Al vincularlo, Estook pregunta al SDK si ese aparato puede cobrar con tarjeta** y lo dice antes
   de que nadie cuente con ello.
6. **El móvil del camarero también cobra**, si es Android con NFC y Google, con la app. Desde el
   navegador, nunca. **El iPhone y el iPad, con su app, al final** (M31).
7. **La caja Android** (Sunmi T3 o D3) vale como caja con la app; **que haga de centro sin internet**
   va en la última entrega de M20D.
8. **Estook no vende aparatos**: dice cuáles están probados y dónde se compran (Anexo 6.7).
9. **Se programa sin comprar nada**, con el lector simulado de Stripe en un móvil Android compatible,
   y **se alquila un Sunmi para la prueba final**, con todo terminado (Richi, 6-nov).

### M20D en cuatro entregas, detrás de T7

| Entrega                                | Qué deja                                                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T8 · 1 · La app de Android**         | `apps/tpv-movil` con Capacitor, firmada; imprimir en la impresora de dentro y en red, el cajón, el lector de códigos, el quiosco; «TPV portátil» en Aparatos |
| **T8 · 2 · Cobrar con tarjeta aquí**   | Conectar la cuenta de Stripe del local en Ajustes del TPV, Tap to Pay y el lector Bluetooth, anular y devolver, el comprobante de la tarjeta, el cuadre solo |
| **T8 · 3 · Los lectores en la nube**   | Stripe desde la caja para Windows y la web (lectores como el S700); y otro proveedor, si un local lo pide (Viva o SumUp)                                     |
| **T8 · 4 · La caja Android de centro** | Una caja Android hace lo que hace hoy la caja para Windows sin internet (T5 · 2 · 2)                                                                         |

**Terminado cuando**, con el Sunmi alquilado: se toma nota de una mesa, sale en cocina, se imprime
la cuenta en el propio aparato, **se cobra con una tarjeta sin contacto y con un móvil sin salir de
Estook**, sale el ticket con su QR y el comprobante de la tarjeta, y al cerrar la caja **la tarjeta
cuadra sola**. Con internet cortado, se cobra con el datáfono del banco sin que nada se pare.

## Las respuestas de Richi, y lo que comprobé de cada una

1. **Cuándo: la A, justo después de T7.** «Escríbelo en todos los documentos.» **Bien elegida**: con
   T7 ya están el cobro, la caja y los tickets, que es lo que M20D usa; y el TPV queda entero antes
   de vender nada (ESTADO: nada se vende hasta estar al 100 %). Escrito en el Plan, el mapa, el plan
   de M20A, la Arquitectura, el Anexo y ESTADO.
2. **Proveedor: Stripe, si deja cobrar sin salir de Estook.** **Lo deja**: el SDK de Stripe Terminal
   para Android lleva Tap to Pay dentro, y «se hace cargo de la pantalla» de nuestra app para el
   cobro y la devuelve al acabar; no abre otra app. Se le pueden poner los colores de Estook. Además
   cubre el lector Bluetooth y, más adelante, el iPhone.
3. **El código, en este repositorio, solo si no lo vuelve más lento y se separa bien.** **Se cumple**,
   igual que con la caja para Windows:
   - **Va en su propia carpeta**, `apps/tpv-movil`, con su lenguaje (Kotlin), su compilación
     (Gradle) y su publicación. No toca el código de Estook ni el de Estook TPV.
   - **No vuelve nada más lento**: la parte de Android solo se construye en **su propio flujo de
     GitHub**, que corre solo cuando un cambio toca `apps/tpv-movil` o la impresión, y no es una
     comprobación obligatoria (como «La caja para Windows»). Las pruebas de siempre ni la ven, y
     `pnpm install` solo baja los paquetes pequeños de Capacitor.
   - **Comparte lo que tiene que compartir**: Estook TPV entero (la app lo abre de `estook.com/tpv/`,
     como la caja), el formato de impresión de `packages/impresion` y los tipos.
   - **Lo único malo**, y es pequeño: quien construya la app necesita Android Studio en su ordenador.
     Con un repositorio aparte también.
4. **¿Gana Estook algo con los cobros? No: solo la suscripción.** **Bien elegida.** Un matiz sobre la
   ley, para que quede exacto: lo que no podemos es **tocar el dinero** sin ser entidad de pago. La
   ley de servicios de pago (Real Decreto-ley 19/2018, artículo 4, letra j) deja fuera a quien da el
   soporte técnico **«sin que llegue a estar en ningún momento en posesión de los fondos»**: eso es
   Estook, y Stripe es la entidad autorizada. Cobrar una comisión a través de Stripe lo hacen otras
   plataformas, pero no la queremos: es más sencillo, más claro para el local y es lo que dice la 0058.

## Lo que se investigó además, para dejarlo cerrado

- **Cómo se conecta el local con Stripe:** con su **propia cuenta de Stripe**, que conecta a Estook
  una vez desde Ajustes del TPV (Stripe Connect, «cargos directos»). Los lectores, los cobros, las
  devoluciones y las comisiones **son de su cuenta**: Stripe le cobra a él y le paga a él. **A Estook
  no le cuesta nada** cuando las comisiones las cobra Stripe al local. El alta y la identidad del
  local las hace Stripe en su propia página.
- **Lo que paga el local** (noviembre de 2026): 1,4 % + 0,10 € por cobro con tarjeta europea, y
  **0,10 € más con Tap to Pay**. El lector Bluetooth, 59 €. Sin cuota mensual.
- **España:** Stripe pone Tap to Pay en Android **disponible en España** en su lista de lectores y
  **en vista previa pública** en la guía. Se comprueba el día que empiece M20D.
- **El comprobante de la tarjeta:** las redes de tarjetas obligan a dar uno, en papel o por correo,
  con **el nombre de la aplicación de la tarjeta, el AID y el tipo de cuenta**. Stripe da esos datos
  al acabar el cobro: van impresos con el ticket o en el correo. El ticket de Estook (con su QR de
  VeriFactu) sigue siendo el ticket.
- **Seguridad:** Estook nunca ve ni guarda el número de la tarjeta. El PIN se teclea en la pantalla de
  Stripe, que **no deja hacer capturas, grabar la pantalla ni poner nada encima**, y pide las
  opciones de desarrollador apagadas. Stripe está pasando la certificación PCI para cobrar en móviles
  (MPoC) y publica la guía que debe seguir la app: se sigue al construir.
- **Las pruebas:** el lector simulado de Stripe funciona sin hardware de pago, pero **en un móvil
  Android de verdad y compatible** (no en un emulador), con la app en versión de pruebas. Para la
  prueba final, el Sunmi alquilado y una tarjeta real.
- **La experiencia, para que sea rápido:** la app se conecta al lector **al arrancar**, en segundo
  plano, así que «Cobrar» responde al momento; las actualizaciones del lector se hacen al conectarse,
  antes del servicio. Un cobro rechazado dice por qué y ofrece otra tarjeta, el lector o el datáfono
  del banco.
- **Cómo llega a los aparatos:** por Google Play, firmada, antes de vender. **[VERIFICAR al
  construir]** si Stripe exige que la app venga de Google Play para Tap to Pay, y si el puente de
  Capacitor funciona con la página cargada de `estook.com/tpv/`; si no, la app lleva Estook TPV
  dentro en cada versión.

## Los documentos, ordenados (Richi, 6-nov)

Richi pidió quitar los documentos que ya no valen, **solo si ya no valen**, o resumirlos en lo
pasado. Se miraron todos. Lo que se hizo:

- **Los PDF de los maestros, fuera del repositorio** (`docs/maestros/pdf/`, 4,4 MB, más de la mitad de
  `docs/`). Eran del 24 y 25 de octubre y **no tenían nada de la 0115 a la 0134**: decían cosas que
  ya no son verdad. Son una salida: se sacan con `.\estook.cmd maestros` cuando se quieran leer, y
  ya no se suben (`.gitignore`). El Plan (A2) lo dice.
- **Los pasos de «Estook TPV, su propia app»**, a [`historia/pasos/`](../historia/pasos/): en
  producción desde el 28-oct y ESTADO ya no los pide.
- **Lo demás se queda**, porque vale: los otros pasos los sigue pidiendo ESTADO (Richi aún tiene que
  probar esas entregas), las maquetas mandan sobre el aspecto de lo construido, y la plantilla de
  tarea, los entornos y «Empezar un chat nuevo» siguen siendo ciertos.
- **La regla**, en [`historia/LEEME.md`](../historia/LEEME.md): qué se mueve, cuándo y por qué nunca se
  borra lo que explica una decisión.

## Lo que decidió la IA, y por qué

1. **TPV que no son datáfono, con Google.** Es lo único que deja meter nuestra app y elegir el
   proveedor.
2. **Capacitor, en una app que abre el mismo Estook TPV.** Es lo que ya hace la caja para Windows
   con Electron, y sirve también para el iPhone con el mismo proyecto.
3. **«TPV portátil» es un comandero que imprime y cobra**, no una función nueva: Richi lo ve como su
   propio tipo al vincular, y por dentro no hay que tocar permisos, PIN ni caja.
4. **El V3 PLUS antes que el V3H**: el V3H no está en la web de Sunmi España ni en ninguna lista de
   proveedor.
5. **Estook no vende aparatos**: almacén, garantía y devoluciones son otro negocio.
6. **Viva y SumUp, solo si un local lo pide**, detrás del mismo adaptador: con Stripe ya está todo.
7. **Los PDF de los maestros no se suben**: una salida vieja en el repositorio engaña.
