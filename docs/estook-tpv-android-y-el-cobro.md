# Estook TPV para Android y cobrar con tarjeta en el aparato

**Investigado el 6 de noviembre de 2026**, a petición de Richi. Las fuentes están al final, con su
fecha. **Nada de esto se ha probado todavía con un aparato de verdad.** Lo marcado **[VERIFICAR]**
no se programa hasta comprobarlo con el proveedor o con el aparato en la mano (regla 13 del Plan).
La decisión que sale de aquí es la [0134](decisiones/0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md), **ya contestada por Richi el mismo día** (apartado 8). **El 11-nov Richi reabrió con qué proveedor se cobra y cuánto cobra Estook: apartado 9**, que manda sobre «Stripe primero». **El 17-nov, los dos aparatos, los precios de cada proveedor y el precio de Pro: apartado 10**, lo último.

## En corto

- **Se puede hacer, y es buena idea.** Un TPV Android con impresora dentro (Sunmi y similares) puede
  llevar **Estook TPV como app** y cobrar con tarjeta en el propio aparato: el cliente acerca la
  tarjeta o el móvil a la pantalla. Se llama **Tap to Pay** (o SoftPOS).
- **Hace falta una app de Android de verdad.** Desde el navegador no se puede cobrar con tarjeta ni
  usar la impresora de dentro. La app abre **el mismo Estook TPV** de siempre, como la caja para
  Windows, y añade solo lo del aparato: imprimir, el cajón, el lector de códigos, el modo quiosco y
  cobrar.
- **Sirve también el móvil de cada camarero**, si es Android y tiene NFC: con la app, cobra en la
  mesa sin ningún aparato más. **El iPhone también puede** (Tap to Pay en iPhone ya funciona en
  España), pero necesita la app de iPhone, que va después.
- **Se empieza con Stripe**, no con SumUp (apartado 4), y **se cobra sin salir de Estook**: la
  pantalla de Stripe para acercar la tarjeta aparece dentro de nuestra app y vuelve sola.
- **Dónde va:** justo después de cobrar (T7), como **M20D · Estook TPV para Android**. El iPhone y el
  iPad, al final, cuando el mercado lo pida.
- **Estook no gana nada con los cobros**: solo la suscripción.
- **La regla de siempre no cambia:** el dinero va de la tarjeta del cliente a la cuenta del local,
  con un proveedor a nombre del local. Estook no toca fondos, no ve la tarjeta y no es entidad de
  pago. **El datáfono del banco sigue valiendo siempre.**

## 1 · Las dos clases de aparatos Android, y por qué importa

Es lo más importante de toda la investigación. Parecen iguales y no lo son.

|                          | **Aparato de pago** (datáfono Android)                                             | **TPV Android** (sin ser datáfono)                                               |
| ------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Ejemplos                 | Sunmi **P3**, **P2**; PAX A920, A77; myPOS; Stripe S700                            | Sunmi **V3 PLUS**, **V3**, **V3 MIX**, **T3**, **D3**, **FLEX 3**; iMin; tablets |
| Qué tarjetas cobra       | **Todas**: chip, banda, sin contacto                                               | **Solo sin contacto** (tarjeta, móvil o reloj), con Tap to Pay                   |
| ¿Deja meter nuestra app? | **Casi nunca**: cada uno lleva la app de su banco o proveedor, y el resto, cerrado | **Sí**: es un Android normal con la tienda de Google                             |
| Atado a                  | **Un solo proveedor** (el del aparato)                                             | **Ninguno**: la app elige con qué proveedor cobra                                |

- **Viva lo dice claro:** sus PAX y Sunmi de pago son **«sistema cerrado»**, solo con la app de Viva.
  Solo los Ciontek CS30PRO y CS50C dejan instalar otras apps a su lado.
- **myPOS** sí deja meter apps en sus aparatos, pero cada app tiene que firmarla myPOS con su clave
  y pasar su revisión, y el aparato solo cobra con myPOS.
- **Stripe** deja meter tu app en su S700 («Apps on Devices»), pero sin la tienda de Google, sin
  impresora, con permiso de Stripe y solo para cuentas de Stripe.
- **Y Tap to Pay no funciona en un aparato de pago**: Stripe exige que el aparato **no** sea un
  datáfono certificado (PCI PTS).

**Conclusión:** el «TPV comandero portátil» de Estook tiene que ser **un TPV Android que no sea
datáfono**, con **NFC** y **con los servicios de Google** (el certificado GMS). **Un Sunmi P3 no vale**
aunque parezca el aparato perfecto: es un datáfono cerrado de su banco.

## 2 · Los aparatos que valen

Lo que exige Stripe para cobrar con Tap to Pay en un aparato Android (lo más estricto de todos):
Android 13 o más nuevo · NFC · **los servicios de Google y la Play Store** · sin root y con el
sistema de fábrica · un parche de seguridad de los últimos 12 meses · almacén de claves por hardware
· internet estable · **las opciones de desarrollador apagadas**. SumUp pide menos: Android 11 o más
nuevo y NFC, y que el aparato pase su comprobación de seguridad.

**Stripe nombra estos Sunmi como compatibles**: D3, D3 80MM, D3 MINI y V3 MIX (sobremesa) · L3, M3 y
**V3** (portátiles) · FLEX 3 con chip Qualcomm 6225 (quiosco) · T3 y T3 80MM (caja) · CPad (tablet).
Y además iMin (Falcon 2, Lark 1), Ciontek CS50C, Honeywell CT32 y CT37, Zebra, Samsung Galaxy Tab
Active5 y cientos de móviles (Samsung, Pixel, Xiaomi, Redmi, Motorola, OnePlus, Oppo, Honor…).

**Un mismo modelo se vende con y sin Google.** El V3 base se anuncia muchas veces «sin GMS». **Sin
GMS no hay Tap to Pay** (Stripe da `ATTESTATION_FAILURE`). Hay que comprar siempre **la versión GMS**.

### Lo que recomendaría para cada sitio del local

| Sitio                   | Aparato                                                                                              | Por qué                                                                                                          | Precio orientativo              |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **TPV portátil** (mesa) | **Sunmi V3 PLUS (GMS)**; o el **V3 (GMS)**, que Stripe ya nombra                                     | 6,75″, impresora de 80 mm (también 58), lector de códigos 2D, NFC, 4G, batería que se cambia, Android 14 con GMS | Unos 575 € el V3 PLUS           |
| **Caja**                | Sunmi **T3 / T3 PRO** o **D3 / D3 PRO**, o el PC con Windows de siempre                              | Pantalla grande, impresora de 80 mm dentro, cajón; el T3 y el D3 están en la lista de Stripe                     | Unos 1.900 € el T3 PRO de 15,6″ |
| **Pantalla de cocina**  | Sunmi **FLEX 3 KDS** de 18,5″ o 22″ (GMS), o cualquier tablet de 13″                                 | Táctil, aguanta salpicaduras (IP54 o IP55, según la ficha), en la pared con VESA; **ya funciona hoy, sin app**   | Desde unos 1.440 € el de 22″    |
| **Impresoras**          | Cualquier ESC/POS de 80 mm por red (Epson, Star, la de cocina de Sunmi **[VERIFICAR]**)              | Lo que ya imprime la caja para Windows desde T5                                                                  | Lo de siempre                   |
| **Tarjetas con chip**   | Un lector Bluetooth del mismo proveedor (Stripe WisePad 3, 59 €; SumUp Solo) o el datáfono del banco | Tap to Pay solo cobra sin contacto                                                                               | 59 € el WisePad 3               |

Los precios son de tiendas de Europa en noviembre de 2026, sin saber si llevan IVA: **orientativos**.

**Sobre el SUNMI V3H que propuso Richi:** existe, con impresora de 58 mm, NFC, lector 2D y versión
GMS (la P06100047). Pero la web de Sunmi España ya no lo enseña: ahora vende el **V3 PLUS**, el
**V3e**, el **V3** y el **V3 MIX**. Ninguna lista de proveedor nombra el V3H. **Antes de recomendar
uno, se prueba**: con todo terminado, se alquila un V3 PLUS con Google y se hace un cobro de prueba
y una impresión (Richi, 6-nov).

### El lector de códigos de barras

El V3 PLUS, el V3 y el L3 lo llevan dentro. **Para el almacén sirve en Estook, no en Estook TPV**: la
recepción y el inventario están en Estook. Los Sunmi pueden mandar lo leído **como si fuera un
teclado**, y entonces funciona en Estook desde Chrome, sin app. **[VERIFICAR con el aparato]** que
ese modo viene así de fábrica en el V3 PLUS.

## 3 · Cobrar con el móvil del camarero

**Sí se puede**, con dos condiciones:

1. **Con la app de Estook TPV**, no desde el navegador. Ningún navegador deja cobrar con tarjeta.
2. **Un móvil que cumpla lo del apartado 2**: Android 13 o más nuevo con NFC y Google (casi cualquier
   Samsung, Xiaomi, Pixel o Motorola de los últimos años), sin root y con el sistema al día.

- **iPhone:** Tap to Pay en iPhone funciona en España con Stripe, SumUp, Viva y Adyen, desde el
  iPhone XS. **Necesita la app de iPhone**, que va al final (5.3).
- **Que pague el cliente con su propio móvil** (escanear un QR en la mesa y pagar) es otra cosa: ya
  está apuntado en el Anexo 10.7 como «más adelante», y no necesita ningún aparato.

## 4 · Los proveedores de pago, comparados

| Proveedor             | Cómo se conecta con Estook                                                                       | ¿En España?                                                                     | ¿Lista de aparatos?             | Lo que cobra al local (noviembre de 2026)          |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| **Stripe**            | **Un solo SDK** para Tap to Pay en Android y en iPhone, lectores Bluetooth y lectores en la nube | Tap to Pay en Android **en vista previa pública**; en iPhone y los lectores, sí | **Sí**, con los Sunmi nombrados | 1,4 % + 0,10 €, **+ 0,10 € con Tap to Pay**        |
| **SumUp**             | SDK de Tap to Pay para Android (**con permiso**, tras revisión) y SDK del lector Solo            | Sí: SumUp lo ofrece en España en su app desde Android 11                        | No: «contacta con SumUp»        | 1,49 %; o 25 €/mes con el 0 % hasta 2.500 € al mes |
| **Viva**              | **De app a app**: Estook abre la app de Viva, cobra y vuelve; y su API en la nube                | Sí, muy usado en la hostelería española                                         | Cualquier Android 8.1 con NFC   | No publica la tarifa de España **[VERIFICAR]**     |
| **Adyen**             | SDK o su app de cobros                                                                           | Tap to Pay en Android en España **sin confirmar**                               | «Que no sea datáfono»           | Para empresas grandes                              |
| **myPOS**             | Solo en sus propios aparatos, con su firma                                                       | Sí                                                                              | Solo los suyos                  | —                                                  |
| **Revolut**           | Solo su Revolut Terminal, desde la API                                                           | Sí                                                                              | Solo el suyo                    | —                                                  |
| **El banco (Redsys)** | Sin SDK abierto: cada banco lo suyo                                                              | —                                                                               | —                               | Lo que pacte el local                              |

### Por qué Stripe primero, y no SumUp

1. **Ya está dentro de Estook.** La suscripción se cobra con Stripe desde E2: cuenta, claves,
   webhooks y quien lo sabe llevar.
2. **Un SDK lo cubre todo**: Tap to Pay en Android, en iPhone cuando llegue, el lector Bluetooth para
   las tarjetas con chip y los lectores de mostrador. Con SumUp serían dos SDK distintos, y el de
   Tap to Pay, con permiso.
3. **Dice qué aparatos valen**, y nombra los Sunmi. SumUp no publica lista y su guía piensa en un
   móvil.
4. **El local tiene su propia cuenta de Stripe** y la conecta a Estook (Stripe Connect, «cargos
   directos»): el dinero va a la suya, Stripe le cobra a él, y a Estook no le cuesta nada.
5. **Lo que hay que mirar:** Stripe pone Tap to Pay en Android **disponible en España** en su lista
   de lectores y **en vista previa pública** en la guía. Se comprueba al empezar M20D; si no
   estuviera abierto, se empieza con el lector Bluetooth.

**Otro proveedor, solo si un local lo pide**, detrás del mismo adaptador: **Viva** (lo tienen muchos
bares, y su integración de app a app es la más sencilla) o **SumUp** (cuando den el permiso del SDK).

### ¿Gana Estook con los cobros?

**No** (Richi, 6-nov): Estook solo cobra la suscripción, como dice la
[0058](decisiones/0058-el-cobro-los-pagos-y-la-caja.md). Lo que la ley no deja es **tocar el dinero**
sin ser entidad de pago, y Estook nunca lo toca: el Real Decreto-ley 19/2018 (artículo 4, letra j)
deja fuera a quien da el soporte técnico sin tener nunca los fondos, y la entidad autorizada es
Stripe.

## 5 · Cómo se construye

### 5.1 La app: el mismo Estook TPV, con lo del aparato

- **Una app de Android que abre `apps/tpv`** dentro, igual que la caja para Windows abre el mismo
  Estook TPV en Electron. **Ninguna pantalla nueva**: la sala, la botonera, cobrar y la caja son las
  de siempre.
- **Con Capacitor**, que sirve para Android y, más adelante, para iPhone con el mismo proyecto.
  Estook ya tenía previsto «la cáscara» con Capacitor (Arquitectura).
- **Lo que pone la app**, por un puente como el de la caja para Windows (`window.estookCaja`):
  - **Imprimir** en la impresora de dentro (el servicio de impresión de Sunmi acepta ESC/POS tal
    cual, y Estook ya genera ESC/POS en `packages/impresion`) y en las impresoras de red.
  - **Abrir el cajón** de la caja Android.
  - **Cobrar con tarjeta** con el SDK del proveedor.
  - **El lector de códigos**, el **modo quiosco** (que no se salga nadie), arrancar sola al
    encender y **no actualizarse en mitad de un servicio** (Anexo 10.12).
  - **Más adelante, la caja de centro**: que una caja Android haga lo que hace hoy la caja para
    Windows sin internet (T5 · 2 · 2). Es lo más largo, y va en su propia entrega.
- **Dónde vive el código:** **en este repositorio, en su propia carpeta** (`apps/tpv-movil`), como
  `apps/caja-windows` (Richi, 6-nov, si no vuelve nada más lento y se separa bien; se cumple). Es
  otro lenguaje, otra compilación y otra publicación, con **su propio flujo de GitHub** que solo
  corre cuando se toca esa carpeta o la impresión, y no es obligatorio para fusionar. Comparte el
  formato de impresión y los tipos con todo lo demás.
- **Cómo llega a los aparatos:** por Google Play como app privada de la empresa, o como APK firmado
  desde la web de Estook. En los Sunmi, también por su tienda de socios, que la manda a todos los
  aparatos de un local. **Firmada y en Play antes de vender** (ESTADO: nada se vende hasta estar al
  100 %).

### 5.2 Cobrar: un segundo camino del datáfono conectado

El Anexo 10.7 ya tiene `ProveedorDatafono` (cobrar, consultar, anular y devolver). Se le añade **dónde
se cobra**:

| Camino                   | Cómo                                                                                     | Desde dónde                               |
| ------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Lector en la nube**    | La API de Estook manda el importe al lector por internet (Stripe S700, SumUp Solo, Viva) | Cualquiera, también la web y Windows      |
| **En el propio aparato** | La app abre la pantalla de cobro del SDK; el cliente acerca la tarjeta                   | **Solo la app de Android** (luego iPhone) |
| **Lector Bluetooth**     | La app le habla al lector; sirve para las tarjetas con chip                              | Solo la app                               |

**Siempre igual en los tres:** la API crea la orden de cobro con su clave (un cobro se hace una sola
vez aunque se corte), el resultado vuelve aprobado o denegado y se apunta en `pago` con la operación
del proveedor, y **si algo falla se cobra como en el nivel 1** y queda marcado. **Nunca se para un
cobro.** Sin internet no hay Tap to Pay: entonces el datáfono del banco.

### 5.3 El iPhone y el iPad, al final

La misma app de Capacitor con su parte de iPhone, y el SDK de Stripe para iPhone. Apple tiene que
**dar permiso para usar Tap to Pay** a la app y **revisa cada versión** antes de publicarla, así que
conviene llegar con Android ya rodado. Richi: «iOS seguro al final».

## 6 · Lo que hay que tener en cuenta

1. **Solo sin contacto.** En España, el 95,6 % de los pagos con tarjeta en tienda ya son sin contacto
   (Banco de España, segundo semestre de 2025). Para el resto: lector Bluetooth o el datáfono del
   banco.
2. **Por encima de 50 €**, la tarjeta suele pedir el PIN, que se teclea en la misma pantalla. Stripe
   no deja teclearlo si hay una grabación de pantalla, una ventana encima o las opciones de
   desarrollador encendidas. Algunas tarjetas obligan a meter el chip: lector o datáfono.
3. **Internet obligatorio** para Tap to Pay.
4. **El aparato tiene que estar al día**: un móvil viejo o sin parches no cobra. Al vincularlo,
   **Estook comprueba si ese aparato puede cobrar con tarjeta** y lo dice antes de que nadie cuente
   con ello.
5. **El ticket de Estook sigue siendo el ticket** (con su QR de VeriFactu). El comprobante de la
   tarjeta es aparte. Qué datos de la tarjeta tiene que llevar impresos lo dice el proveedor
   **[VERIFICAR]**.
6. **Las propinas con tarjeta**: el SDK las suma al total. Cómo se apuntan sigue pendiente del asesor
   (Anexo 5.1).
7. **Estook no vende los aparatos.** Dice cuáles están probados y dónde comprarlos. Tener almacén,
   garantía y devoluciones es otro negocio; más adelante se puede pactar con un distribuidor de
   Sunmi.
8. **Para probar**: Tap to Pay no funciona en un emulador. Se programa con el **lector simulado de
   Stripe en un móvil Android compatible**, y la prueba final se hace con un Sunmi alquilado y una
   tarjeta de verdad.

## 7 · Cómo queda todo lo que puede tener un local

Lo que escribió Richi, corregido donde hacía falta:

| Pieza                    | Qué puede ser                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **La caja**              | El PC con Windows con la caja para Windows (como hoy), o **una caja Android** (Sunmi T3 o D3) con la app. La caja Android hace de centro sin internet cuando llegue esa entrega                                              |
| **Los comanderos**       | El móvil de cada camarero (Android o iPhone, desde el navegador o con la app) o **el TPV portátil** (Sunmi V3 PLUS)                                                                                                          |
| **Cobrar con tarjeta**   | **En el propio aparato** (Tap to Pay, con la app de Android) · con un **lector** del proveedor · o **con el datáfono del banco** de siempre: se teclea el importe y se confirma en Estook. **Este último no se quita nunca** |
| **La cocina y la barra** | Pantalla táctil grande (Sunmi FLEX 3 KDS o cualquier tablet de 13″, **ya funciona hoy**), papel, o las dos                                                                                                                   |
| **Las impresoras**       | Cocina, barra y tickets, ESC/POS por red; o la de dentro del TPV portátil o de la caja Android                                                                                                                               |

**Lo que corrijo de la propuesta:** el Sunmi P3 y los datáfonos Android de los bancos **no valen**
(están cerrados a su app); el V3H no está en la web de Sunmi España ni en ninguna lista, y el V3 PLUS
o el V3 son la apuesta segura; y para empezar encaja mejor Stripe que SumUp.

## 8 · Lo que contestó Richi el 6-nov, y lo que se investigó además

1. **Cuándo:** justo después de T7, como M20D.
2. **Proveedor:** Stripe, porque **cobra sin salir de Estook**: su SDK para Android «se hace cargo de
   la pantalla» de nuestra app para el cobro (con los colores de Estook) y la devuelve al acabar.
3. **El código:** en este repositorio, en su propia carpeta, con su propio flujo de GitHub.
4. **Estook no gana nada con los cobros.**

**Y para dejarlo cerrado:**

- **Stripe Connect con «cargos directos»**: los lectores, los cobros, las devoluciones y las
  comisiones son de la cuenta del local. **A Estook no le cuesta nada** cuando Stripe cobra las
  comisiones al local. El alta del local la hace Stripe en su propia página.
- **El comprobante de la tarjeta** es obligatorio (en papel o por correo) y lleva el nombre de la
  aplicación de la tarjeta, el AID y el tipo de cuenta, que Stripe da al acabar el cobro.
- **Seguridad:** Estook nunca ve la tarjeta. La pantalla del PIN de Stripe no deja capturas,
  grabaciones ni nada encima. Stripe está pasando la certificación PCI para cobrar en móviles
  (MPoC) y publica la guía que debe seguir la app.
- **Rápido:** la app se conecta al lector al arrancar, en segundo plano; las actualizaciones del
  lector se hacen al conectarse, antes del servicio.
- **[VERIFICAR al construir]** si Stripe exige que la app venga de Google Play para Tap to Pay, y si
  el puente de Capacitor funciona con Estook TPV cargado de `estook.com/tpv/` (si no, va dentro de
  cada versión de la app).

## 9 · Lo que se investigó el 11-nov: el banco es más barato, y cuánto cobra Estook

**Pedido por Richi el 11 de noviembre de 2026** ([0146](decisiones/0146-la-reorganizacion-del-11-nov.md),
sección 4): «tal vez no usemos Stripe y usemos Caixa u otros más baratos», mirar los Sunmi «P» y
una forma nueva de cobrar Estook, por aparato con cobro integrado. **Reabre el punto 2 del
apartado 8 («Stripe primero»), y nada más.** Buscado en internet ese día; lo que no salió de una
fuente oficial va marcado **[VERIFICAR]** y no se programa.

### 9.1 Lo que paga un bar por cada cobro

| Con quién cobra                          | Lo que le cuesta                       | Un ticket de 12 € | 30.000 € al mes en 2.000 cobros |
| ---------------------------------------- | -------------------------------------- | ----------------- | ------------------------------- |
| **Su banco** (media de los restaurantes) | **≈ 0,36 %** con tarjeta de particular | **≈ 0,04 €**      | **≈ 110 €**                     |
| Square                                   | 1,25 % + 0,05 €                        | 0,20 €            | 475 €                           |
| SumUp                                    | 1,49 %                                 | 0,18 €            | 447 €                           |
| myPOS                                    | desde 1,45 % + 0,05 €                  | 0,22 €            | 535 €                           |
| Stripe, con Tap to Pay                   | 1,4 % + 0,10 € + 0,10 €                | 0,37 €            | 820 €                           |

- **Lo del banco es un dato oficial**: las tasas de descuento que publica el Banco de España por
  sector; en restaurantes, primer trimestre de 2026, 0,36 % con tarjetas de particulares (y entre
  0,66 % y 1 % con tarjetas de empresa). **Es una media**: cada local pacta la suya, y algunos
  bancos añaden una cuota al mes por el datáfono.
- **Richi tiene razón**: en un bar, con tickets pequeños, los céntimos fijos de Stripe pesan más
  que el porcentaje. **Lo barato es el banco del local.**
- Lo de Square, SumUp, myPOS y Stripe sale de sus páginas o de comparativas de ellos mismos:
  **[VERIFICAR]** en la tarifa oficial el día que se elija.

### 9.2 Los Sunmi «P», y cómo se entra en un datáfono

- **Los Sunmi P (P2, P3) son datáfonos certificados**: cobran chip, banda y sin contacto, con su
  PIN. **No se compran sueltos para cobrar**: los entrega un banco o un proveedor con **su app de
  pago** dentro. Es lo que dice el apartado 1, y no cambia: **Tap to Pay no funciona en ellos**.
- **La forma de entrar es «de app a app»**: Estook TPV, instalado en el mismo aparato, abre la app
  de pago con el importe y recibe «cobrado» o «rechazado». Estook no ve la tarjeta.
- **CaixaBank lo tiene documentado en público** (Comercia Global Payments, su entidad de pago):
  1. **«Pago integrado con TPV Android»**: una app de terceros convive con la app de pago de
     Comercia en sus datáfonos Android. Los modelos de su lista son Ingenico (Axium DX8000) e
     ITOS (CM35S, CM5, IN20, Q6000), con Android 7.1 a 10. **No nombra ningún Sunmi**
     **[VERIFICAR con Comercia]**.
  2. **«Smartphone TPV»**: su app para cobrar sin contacto en un Android con NFC (desde
     Android 8), y una integración para que otra app le mande el importe. La app integrada **se
     pide a su soporte**. Es su Tap to Pay, y **encaja con un Sunmi V3 o con el móvil del
     camarero**.
- **Viva** documenta lo mismo, de app a app, desde Android 8.1, y vende sus propios Sunmi P3. Su
  0 % es solo para quien tiene la cuenta y la tarjeta de Viva; **la tarifa normal de España no
  está publicada [VERIFICAR]**.
- **Banco Sabadell** (Paycomet) vende el «TPV Smart» como «plataforma de aplicaciones», y
  **Redsys** tiene una modalidad «App2App» para el cobro presencial. **Cómo entra un tercero, sin
  confirmar [VERIFICAR]**. De Santander (Getnet) y de BBVA no salió nada.
- **Lo que no se sabe todavía, y decide:** las condiciones para ser integrador (contrato,
  certificación y plazo), si el local tiene que cambiar de datáfono, y la tarifa. **Se pide por
  escrito** a Comercia y a Viva (es un paso de Richi).

### 9.3 Qué cambia y qué no

- **No cambia:** el adaptador `ProveedorDatafono` (Anexo 10.7); que Estook **no toca el dinero**
  ni cobra **un porcentaje** de los cobros; que el datáfono del banco sin conectar vale siempre;
  la app de Android (T8 · 1), que no depende de con quién se cobre.
- **Cambia:** «Stripe primero» deja de estar decidido. Los caminos, de más barato para el local a
  más caro:

| Camino                                  | Aparato                                   | Para el local                             | Para Estook                                       |
| --------------------------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| **A · El datáfono Android de su banco** | El que le da el banco (Ingenico, ITOS, …) | Lo más barato; un aparato hace de todo    | Un acuerdo y una certificación **por banco**      |
| **B · La app de cobro del banco**       | Sunmi V3 (GMS) o el móvil del camarero    | Barato; solo sin contacto                 | Una integración por banco; sin certificar aparato |
| **C · Viva, de app a app**              | Cualquier Android con NFC, o su P3        | Tarifa por confirmar                      | La integración más sencilla y abierta             |
| **D · Stripe**                          | Sunmi V3 (GMS) o el móvil                 | Caro en tickets pequeños; alta en minutos | Un SDK para todo; ya está dentro de Estook        |

**Lo que recomienda la IA:** empezar por **B con CaixaBank** (su documentación es pública) **o por
C**, según lo que contesten; y dejar **D** como el camino que funciona el primer día para el local
que no quiera esperar a su banco. **No se elige sin las condiciones por escrito** (regla 13 del
Plan).

### 9.4 Cuánto cobra Estook por el cobro integrado

Hoy: Esencial 39 €, Pro 99 € y Cadena 89 € por local y mes, sin IVA ([0135](decisiones/0135-r4-precios-ia-y-papeles.md));
Estook TPV entra en Pro con todos sus aparatos. A Estook, un aparato más no le cuesta nada cada
mes; lo que cuesta es certificarse con cada banco y atender a quien cobra con él.

| Opción                          | Cómo queda                                                                                 | A favor                                              | En contra                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------ |
| **1 · Todo dentro de Pro**      | Pro 99 €, con el cobro integrado incluido                                                  | Lo más sencillo de explicar                          | El que no lo usa paga lo mismo             |
| **2 · Un extra por aparato**    | Pro 99 € con el datáfono aparte, como hoy; **+ un fijo al mes por cada aparato que cobra** | Lo que propone Richi: paga quien lo usa, y es barato | Una línea más en la factura                |
| **3 · Un plan «Pro con cobro»** | Un plan más caro que lo lleva todo                                                         | Un solo precio                                       | Otro plan que explicar; castiga al pequeño |

**Lo que recomienda la IA: la 2**, con un fijo pequeño por aparato (del orden de 5 a 9 € al mes,
**sin decidir**): es lo que pidió Richi, no rompe los precios cerrados el 6-nov, y sigue siendo
suscripción, no comisión. Como referencia, Lightspeed cobra 49 € por cada caja de más y Ágora,
34 € al mes por un puesto, según comparativas de 2026 **[VERIFICAR]**.

**Sin decidir, y es de Richi:** el proveedor con el que se empieza y la opción de precio. **T8 · 2
(cobrar con tarjeta en el aparato) no empieza sin las dos respuestas**; T8 · 1 (la app de Android)
no depende de ellas.

## 10 · Lo que preguntó Richi el 17-nov: dos aparatos, cuánto cuesta cada proveedor y el precio de Pro

**Richi, 17-nov:** «Quiero que no cobren mucho por dispositivo o comisión, y que me expliques bien
los precios. Lo veo bien: podemos cobrar por aparato extra al mes. Pero ¿depende del administrador
de pagos? Si compran un Sunmi y cobran comisión por compra no hay que pagar extra, pero a lo mejor
otros sí piden un dinero al mes. Y que funcionen en Sunmi. ¿Añadimos otra opción, un Android solo
con Tap to Pay? Dos extras: un Sunmi con impresora y NFC, y otro solo Android. Necesito saber
costes, si se alquilan… porque habría que modificar el precio base de Pro, tal vez.»

Buscado el 17-nov. **Lo que no viene de la página oficial del proveedor va marcado
[VERIFICAR]**: son precios de comparadores o de tiendas, y se confirman por escrito antes de elegir.

### 10.1 Lo primero: son dos facturas distintas, y no se mezclan

Esto es lo que lía, y se aclara así:

| Quién cobra               | Qué cobra                                                                                              | A quién                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- |
| **El proveedor de pagos** | Su comisión por cada cobro con tarjeta, y a veces una cuota al mes o el aparato (comprado o alquilado) | Al local, directamente          |
| **Estook**                | La suscripción (Pro), y, si se decide, **un fijo al mes por cada aparato que cobra con tarjeta**       | Al local, en su cuota de Estook |

- **Lo que cobre el proveedor no pasa nunca por Estook**: el contrato es del local con su proveedor
  (Estook no toca el dinero, apartado 4).
- **Lo que cobra Estook no depende del proveedor**: es lo que vale el programa en ese aparato. Si el
  proveedor ya cobra comisión, Estook no la cobra otra vez; y si el proveedor pide una cuota al mes,
  esa cuota es del proveedor, no de Estook.
- **Lo que sí depende del proveedor es lo que paga el local en total.** Por eso, al venderlo, se le
  enseña la cuenta entera (10.4), para que elija con lo que le sale más barato.

### 10.2 Los dos aparatos que propone Richi, y uno más que ya existe

| Aparato                                       | Ejemplo                                                        | Qué cobra                                 | Impresora | Cuánto cuesta (orientativo)                                                                 |
| --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| **A · TPV portátil con impresora y NFC**      | **Sunmi V3 PLUS** con Google (o el V3)                         | Sin contacto (tarjeta, móvil, reloj)      | Sí, 80 mm | **≈ 550 €** comprado, en tiendas de Europa (de 546 € + IVA a 549 € con IVA) **[VERIFICAR]** |
| **B · Android solo, con Tap to Pay**          | El móvil Android del camarero, o una tablet con NFC            | Sin contacto                              | No        | **0 €** si ya lo tiene; un móvil compatible nuevo, desde unos 150 € **[VERIFICAR]**         |
| **C · El datáfono del proveedor** (ya existe) | Sunmi **P3** de Viva (345 € + IVA), los de Teya, los del banco | **Todo**: chip, PIN, banda y sin contacto | Sí        | Lo vende o lo alquila el proveedor                                                          |

- **A y B solo cobran sin contacto.** Las tarjetas que piden chip (pocas en España, pero las hay) se
  cobran con un lector Bluetooth del mismo proveedor (el WisePad 3 de Stripe, 59 € + IVA) o con el
  datáfono de siempre, que **no se quita nunca** (nivel 1 del Anexo, 10.7).
- **A y B son el mismo programa**: Estook TPV para Android (T8 · 1). Lo único que cambia es que A
  imprime. Para Estook son **dos formas de vincular el aparato**, «TPV portátil» y «Comandero que
  cobra», y las dos caben en lo decidido en la 0134.
- **C es lo de hoy, «sin conectar»**: el camarero teclea el importe en el datáfono y marca «Cobrado
  con tarjeta» en Estook. Conectarlo «de app a app» (que Estook mande el importe solo) depende de
  cada proveedor (10.3).
- **¿Se alquilan?** Ningún vendedor de Sunmi en España publica alquiler. Sunmi tiene un distribuidor
  oficial en España (Iberoti) al que se le puede pedir **[VERIFICAR]**. Los proveedores de pagos sí
  ponen el aparato dentro de su cuota: Teya incluye sus aparatos en el plan; los bancos cobran una
  cuota por el datáfono.

### 10.3 Los proveedores, uno a uno

| Proveedor                 | Comisión                                                                                    | Cuota al mes                                                                                                         | Aparato                                              | ¿Se puede conectar con Estook?                                                                                                 | ¿Funciona en un Sunmi V3 (A)?                                |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| **Banco** (Redsys detrás) | **≈ 0,36 %** de media en restaurantes (Banco de España, 1.er trimestre 2026)                | Suele haber, por el datáfono; los comparadores hablan de 10 a 30 € **[VERIFICAR]**                                   | El suyo, en alquiler                                 | **CaixaBank (Comercia)**: documentado en público, en sus datáfonos Android y con su app «Smartphone TPV»; los demás, sin saber | Con la app «Smartphone TPV» de CaixaBank, sí **[VERIFICAR]** |
| **Stripe**                | **1,4 % + 0,10 €**, y **+ 0,10 €** con Tap to Pay (su página oficial)                       | **Ninguna** (el móvil del lector, 9 € al mes, si se quiere)                                                          | Lectores de 59 a 289 € + IVA                         | **Sí**: un SDK para todo; ya está dentro de Estook (la cuota)                                                                  | **Sí**: nombra el V3 y el V3 MIX                             |
| **Adyen**                 | No la publica para España; es para empresas grandes **[VERIFICAR]**                         | Sin publicar                                                                                                         | El local pone el Android                             | Sí, con su SDK                                                                                                                 | Pide «Android con NFC que no sea datáfono»                   |
| **SumUp**                 | **1,49 %**; con su suscripción, menos (los comparadores: 19 €/mes y 0,75 %) **[VERIFICAR]** | Ninguna, o la de la suscripción                                                                                      | Lectores propios                                     | SDK de Tap to Pay **con permiso**, tras revisión                                                                               | Sin lista de aparatos                                        |
| **Viva**                  | Sin cifra pública legible; mínimo 0,03 € por cobro; **0 % solo con su cuenta y su tarjeta** | Sin publicar                                                                                                         | Su Sunmi **P3**, 345 € + IVA                         | **Sí, de app a app**, desde Android 8.1                                                                                        | Su app, en cualquier Android con NFC                         |
| **Teya**                  | Dentro del tramo; **1,5 %** sobre lo que pase del tramo (comparadores) **[VERIFICAR]**      | **Por tramos**: 29,90 € hasta 2.500 €/mes · 44,90 € hasta 5.000 € · 59,90 € hasta 10.000 € · 169,90 € hasta 40.000 € | Incluidos en el plan; uno más, **desde 3 a 6 €/mes** | Sin documentación pública para terceros **[VERIFICAR]**                                                                        | Sin saber                                                    |
| **myPOS**                 | **1,45 % + 0,05 €**                                                                         | **Ninguna**                                                                                                          | De 29 a 249 €                                        | Solo apps firmadas por ellos, en sus aparatos                                                                                  | No: solo sus aparatos                                        |
| **Square**                | 1,25 % + 0,05 €                                                                             | Ninguna                                                                                                              | Los suyos                                            | **No**: su Tap to Pay solo funciona en las apps de Square                                                                      | No                                                           |

### 10.4 Lo que le cuesta al mes a un bar, con cada uno

Un bar que cobra **30.000 € al mes con tarjeta en 2.000 cobros** (ticket medio de 15 €):

| Con quién                          | Lo que le cuesta al mes                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| **Su banco**                       | **≈ 110 €** de comisión, + la cuota del datáfono si la tiene |
| **Teya** (tramo de hasta 40.000 €) | **≈ 170 €** si su tramo lo cubre todo **[VERIFICAR]**        |
| **SumUp** con suscripción          | ≈ 245 € (0,75 % + 19 €) **[VERIFICAR]**                      |
| **SumUp** sin suscripción          | ≈ 447 €                                                      |
| **myPOS**                          | ≈ 535 €                                                      |
| **Stripe**, con Tap to Pay         | **≈ 820 €** (los 0,20 € fijos de cada cobro pesan mucho)     |

**Y un bar pequeño**, de **5.000 € al mes en 500 cobros** (10 €): el banco, unos 18 € más su cuota;
Teya, 44,90 €; SumUp, unos 75 €; Stripe, unos 170 €.

**Lo que sale:** para un bar, **el banco es lo más barato** con diferencia, y Teya es predecible.
Stripe es el más fácil de conectar y el más caro en tickets pequeños.

### 10.5 Lo que recomienda la IA

1. **El precio de Pro no se toca: 99 € + IVA.** Pro sigue siendo Estook TPV con el datáfono que ya
   tenga el local, sin conectar (nivel 1), que vale con cualquier banco y no le cuesta nada a nadie.
2. **El cobro integrado se paga aparte, por aparato y al mes, sea cual sea el proveedor** (lo que
   pidió Richi). **Una sola tarifa** para los dos aparatos (A y B), para que sea fácil de explicar:
   **del orden de 5 a 9 € al mes por aparato [sin decidir]**. Como referencia, Teya cobra de 3 a 6 €
   al mes por un aparato de más, y Lightspeed 49 € por una caja de más **[VERIFICAR]**.
3. **El primer proveedor, el que conecte con el banco del local**: empezar por **CaixaBank** (su
   documentación es pública y es el banco con más comercios), y tener **Stripe** como el camino que
   funciona el primer día para quien no quiera esperar a su banco. **Viva**, si contesta con buenas
   condiciones. Adyen, myPOS y Square, no.
4. **Los dos aparatos de Richi, sí**: el **TPV portátil** (Sunmi V3 PLUS, con impresora) y el
   **Android con Tap to Pay** (el móvil del camarero). Mismo programa y mismo precio en Estook.
5. **Nada de esto se programa sin las condiciones por escrito** (regla 13): qué cobra el proveedor
   al local, qué le pide a Estook para conectarse, en qué aparatos funciona y su entorno de pruebas.

### 10.6 Lo que hay que preguntar a cada proveedor (para los correos de Richi)

1. ¿Tenéis integración para un software de TPV de hostelería? ¿De app a app, con SDK o por la
   nube? ¿Hay documentación y un entorno de pruebas?
2. ¿Qué pide para ser integrador: contrato, certificación, plazo y coste para el programa?
3. ¿En qué aparatos funciona? En concreto: **Sunmi V3 PLUS (con Google)**, Sunmi P3, y un móvil
   Android normal con NFC.
4. ¿Qué paga el restaurante? Comisión por cobro (tarjeta de particular y de empresa), cuota al mes,
   **el aparato** (compra o alquiler, y cuánto), permanencia.
5. Un ejemplo: un bar con **30.000 € al mes en 2.000 cobros**. ¿Cuánto le sale al mes?
6. ¿Las propinas, las devoluciones y anular un cobro van por la integración?
7. ¿Cobra algo el integrador (Estook) o se queda algo? (**Estook no quiere comisión**: solo saberlo.)

**Sin decidir, y es de Richi** (cuando lleguen las respuestas, y antes de T8 · 2): con qué proveedor
se empieza, y **cuánto es el fijo por aparato**.

## Fuentes

Leídas el 6 de noviembre de 2026.

- Stripe · [Terminal con Connect (cargos directos)](https://docs.stripe.com/terminal/features/connect?connect-charge-type=direct) · [Precios de Connect](https://stripe.com/es/connect/pricing) · [Comprobantes](https://docs.stripe.com/terminal/features/receipts) · [Lectores Tap to Pay y MPoC](https://docs.stripe.com/terminal/tap-to-pay-readers) · [Probar con el lector simulado](https://docs.stripe.com/terminal/references/testing)
- Ley · [Real Decreto-ley 19/2018 de servicios de pago (BOE), artículo 4, letra j](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16036)
- Stripe · [Tap to Pay: países, requisitos y aparatos](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android) · [Consideraciones por país (España)](https://docs.stripe.com/terminal/payments/regional?integration-country=ES) · [Apps on Devices](https://docs.stripe.com/terminal/features/apps-on-devices/overview) · [Precios en España](https://stripe.com/es/pricing)
- SumUp · [SDK de Tap to Pay para Android](https://developer.sumup.com/terminal-payments/sdks/android/tap-to-pay/) · [Tap to Pay, países](https://developer.sumup.com/terminal-payments/readers/tap-to-pay/) · [Tap to Pay en España](https://www.sumup.com/es-es/tap-to-pay/) · [SumUp frente a Stripe (de SumUp, junio de 2026)](https://www.sumup.com/es-es/compare/sumup-vs-stripe/)
- Viva · [De app a app en Android](https://developer.viva.com/apis-for-point-of-sale/card-terminal-apps/android-app/) · [Aparatos compatibles (abiertos y cerrados)](https://www.viva.com/es-es/vendor-solutions/supported-devices) · [Guía para elegir aparatos](https://intercom.help/vivacomeu/es/articles/10210826-guia-para-elegir-dispositivos-de-viva-com)
- Adyen · [Tap to Pay en Android](https://docs.adyen.com/point-of-sale/mobile-android/build/tap-to-pay)
- myPOS · [Smart SDK](https://developers.mypos.com/sdks/smart-sdk) · [AppMarket](https://developers.mypos.com/guides/appmarket-guide)
- Revolut · [Revolut Terminal desde la API](https://developer.revolut.com/docs/guides/in-person-payments/revolut-terminal/push-payments)
- Sunmi · [Productos (España)](https://www.sunmi.com/es/products) · [Impresora de dentro, para programadores](https://file.cdn.sunmi.com/SUNMIDOCS/SunmiPrinter-Developer-Docs-1-1.pdf) · [Ficha del V3H](https://jarltech.co.uk/sites/default/files/documents/product/datasheet/en/V3H_EN.pdf) · [Ficha del FLEX 3](https://cdn.sunmi.com/public/generalfile/mgt_import/a70210b4783a47b4b350e68a2ecfce55.pdf) · [V3 PLUS en una tienda](https://www.barcodesite.eu/sunmi-v3-plus-p06120017.html)
- Banco de España · [Los pagos del segundo semestre de 2025 (nota del 23-jul-2026)](https://www.bde.es/wbe/es/noticias-eventos/actualidad-banco-espana/notas-banco-espana/el-numero-de-operaciones-de-pago-con-instrumentos-distintos-del-efectivo-aumento-un-108-en-el-segundo-semestre-de-2025-respecto-al-mismo-periodo-de-2024.html)

Leídas el 11 de noviembre de 2026, para el apartado 9.

- Banco de España · [Tasas de descuento por sector, primer trimestre de 2026](https://www.bde.es/app/sif/documentosTasas/0000_Descuento_202603.pdf)
- CaixaBank y Comercia Global Payments · [Pagos integrados en el TPV](https://docs.globalpayments.es/en/docs/pos-integrated-payments/pos-integrated-payments/) · [Con TPV Android](https://docs.globalpayments.es/en/docs/pos-integrated-payments/payment-integrated-with-android-pos/) · [Con Smartphone TPV, en Android](https://docs.globalpayments.es/en/docs/pos-integrated-payments/payment-integrated-with-smartphone-pos/payment-integration-with-smartphone-pos-android/) · [Fichas de los aparatos](https://docs.globalpayments.es/en/docs/pos-integrated-payments/pos-data-sheets/) · [Tap to Pay de CaixaBank](https://www.caixabank.es/empresa/business/tap-to-pay.html)
- Viva · [Tap on Any Device en Android](https://developer.viva.com/apis-for-point-of-sale/card-terminal-apps/android-app/) · [Su Sunmi P3](https://www.viva.com/en-eu/shop/terminals/vivapos-p3scan)
- Redsys · [Pago presencial y sus modalidades](https://redsys.es/en/pago-presencial)
- Banco Sabadell · [La gama TPV Smart](https://www.bancsabadell.com/bsnacional/en/business/tpv/gama-tpv-smart)
- Square · [Tarifas en España](https://squareup.com/es/es/legal/general/fees) · SumUp · [SumUp frente a myPOS](https://www.sumup.com/es-es/compare/sumup-vs-mypos/)
- Precios de otros TPV · [Lightspeed Restaurant](https://lightspeedhq.com/es/tpv/restaurant/precios) · [Comparativa de TPV para restaurantes de 2026](https://hackceleration.com/es/labs/mejor/tpv-restaurantes)

Leídas el 17 de noviembre de 2026, para el apartado 10.

- Stripe · [Precios en España](https://stripe.com/es/pricing) (1,4 % + 0,10 €, Tap to Pay + 0,10 €, lectores de 59 a 289 € + IVA)
- Teya · [Planes y precios](https://www.teya.com/es/pricing) · [Tarifas, en su ayuda](https://help.teya.com/hc/es-es/articles/42758479807249-Conoce-las-tarifas-y-precios-de-Teya)
- Viva · [Precios en España](https://www.viva.com/es-es/pricing) · [Su Sunmi P3](https://www.viva.com/es-es/shop/terminals/vivapos-p3scan)
- myPOS · [Precios y comisiones](https://www.mypos.com/es-es/pricing-and-fees)
- SumUp · [SumUp frente a Stripe](https://www.sumup.com/es-es/compare/sumup-vs-stripe/) · [Tap to Pay](https://www.sumup.com/es-es/tap-to-pay/) · [SDK de Tap to Pay para Android](https://developer.sumup.com/terminal-payments/sdks/android-ttp/)
- Adyen · [Tap to Pay en Android](https://www.adyen.com/devices/tap-to-pay-on-android) · [Su guía](https://docs.adyen.com/point-of-sale/mobile-android/build/tap-to-pay)
- CaixaBank · [Su Tap to Pay](https://www.caixabank.es/empresa/business/tap-to-pay.html) · [La app que convierte un Android en datáfono (2023)](https://caixabank.com/en/headlines/news/caixabank-becomes-the-first-financial-institution-in-spain-to-launch-an-app-that-allows-mobile-phones-to-be-used-as-point-of-sale-devices-without-the-need-for-an-additional-device)
- Redsys · [Pago presencial](https://redsys.es/en/pago-presencial) · [Integración inApp para Android](https://pagosonline.redsys.es/desarrolladores-inicio/documentacion-operativa/integracion-inapp-para-dispositivos-android/)
- Sunmi · [La familia P3](https://www.sunmi.com/es/p3-family) · [Distribuidor en España (Iberoti)](https://iberoti.com/categoria-producto/marcas/sunmi/) · [V3 PLUS con Google, en una tienda](https://shopnfc.com/en/nfc-printers/801-sunmi-v3-plus-nfc-gms-edla.html)
- Comparadores (sin valor oficial) · [Comisiones de TPV en 2026](https://rankiabusiness.com/comisiones-tpv/) · [Datáfonos libres](https://finantres.com/datafono-libre/)
