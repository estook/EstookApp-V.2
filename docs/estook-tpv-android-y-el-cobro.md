# Estook TPV para Android y cobrar con tarjeta en el aparato

**Investigado el 6 de noviembre de 2026**, a petición de Richi. Las fuentes están al final, con su
fecha. **Nada de esto se ha probado todavía con un aparato de verdad.** Lo marcado **[VERIFICAR]**
no se programa hasta comprobarlo con el proveedor o con el aparato en la mano (regla 13 del Plan).
La decisión que sale de aquí es la [0134](decisiones/0134-estook-tpv-para-android-y-cobrar-en-el-aparato.md).

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
- **El proveedor que mejor encaja para empezar es Stripe**, no SumUp. Lo explico en el apartado 4.
  SumUp sirve, pero su SDK de Tap to Pay se da con permiso y no dice qué aparatos valen.
- **Dónde va:** justo después de cobrar (T7), como **M20D · Estook TPV para Android**. El iPhone y el
  iPad, al final, cuando el mercado lo pida.
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
uno, se prueba**: comprar un V3 PLUS GMS y hacer un cobro de prueba con Stripe y con SumUp.

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
4. **El local tiene su propia cuenta de Stripe** y la conecta a Estook (Stripe Connect, cuenta
   «estándar»): el dinero va a la suya, Stripe le cobra a él y Estook no pone comisión.
5. **Lo que hay que mirar:** en España, el Tap to Pay de Stripe en Android está **en vista previa
   pública**. Se comprueba al empezar M20D que ya está para todos; si no, se empieza con el lector
   Bluetooth y SumUp o Viva pasan delante.

**Después, local a local**, detrás del mismo adaptador: **Viva** (lo tienen muchos bares, y su
integración de app a app es la más sencilla) y **SumUp** (cuando den el permiso del SDK).

### ¿Puede ganar Estook con los cobros?

Hoy la regla firme es que **no** ([0058](decisiones/0058-el-cobro-los-pagos-y-la-caja.md)). Hay dos
formas de cambiarla sin tocar el dinero, y **es decisión de Richi** (pregunta 4 de la 0134):

- **Un acuerdo de socio con el proveedor**: el proveedor paga a Estook una parte de su comisión. El
  local paga lo mismo que si fuera directo.
- **Una comisión de plataforma** encima (Stripe la llama `application_fee`; Viva, `ISV_amount`). El
  local paga más.

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
- **Dónde vive el código:** recomiendo **el mismo repositorio, en su propia carpeta**
  (`apps/tpv-movil`), como `apps/caja-windows`. Es otro lenguaje, otra compilación y otra
  publicación, pero comparte las pruebas, el formato de impresión y los tipos con todo lo demás. Un
  repositorio aparte obliga a copiar o publicar paquetes y a sincronizar dos sitios en cada cambio.
  La 0133 decía «repositorio aparte»: **lo decide Richi** (pregunta 3 de la 0134).
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
8. **Para probar hace falta un aparato de verdad**: Tap to Pay no funciona en un emulador ni con la
   app en modo de pruebas conectada al ordenador.

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

## Fuentes

Leídas el 6 de noviembre de 2026.

- Stripe · [Tap to Pay: países, requisitos y aparatos](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android) · [Consideraciones por país (España)](https://docs.stripe.com/terminal/payments/regional?integration-country=ES) · [Apps on Devices](https://docs.stripe.com/terminal/features/apps-on-devices/overview) · [Precios en España](https://stripe.com/es/pricing)
- SumUp · [SDK de Tap to Pay para Android](https://developer.sumup.com/terminal-payments/sdks/android/tap-to-pay/) · [Tap to Pay, países](https://developer.sumup.com/terminal-payments/readers/tap-to-pay/) · [Tap to Pay en España](https://www.sumup.com/es-es/tap-to-pay/) · [SumUp frente a Stripe (de SumUp, junio de 2026)](https://www.sumup.com/es-es/compare/sumup-vs-stripe/)
- Viva · [De app a app en Android](https://developer.viva.com/apis-for-point-of-sale/card-terminal-apps/android-app/) · [Aparatos compatibles (abiertos y cerrados)](https://www.viva.com/es-es/vendor-solutions/supported-devices) · [Guía para elegir aparatos](https://intercom.help/vivacomeu/es/articles/10210826-guia-para-elegir-dispositivos-de-viva-com)
- Adyen · [Tap to Pay en Android](https://docs.adyen.com/point-of-sale/mobile-android/build/tap-to-pay)
- myPOS · [Smart SDK](https://developers.mypos.com/sdks/smart-sdk) · [AppMarket](https://developers.mypos.com/guides/appmarket-guide)
- Revolut · [Revolut Terminal desde la API](https://developer.revolut.com/docs/guides/in-person-payments/revolut-terminal/push-payments)
- Sunmi · [Productos (España)](https://www.sunmi.com/es/products) · [Impresora de dentro, para programadores](https://file.cdn.sunmi.com/SUNMIDOCS/SunmiPrinter-Developer-Docs-1-1.pdf) · [Ficha del V3H](https://jarltech.co.uk/sites/default/files/documents/product/datasheet/en/V3H_EN.pdf) · [Ficha del FLEX 3](https://cdn.sunmi.com/public/generalfile/mgt_import/a70210b4783a47b4b350e68a2ecfce55.pdf) · [V3 PLUS en una tienda](https://www.barcodesite.eu/sunmi-v3-plus-p06120017.html)
- Banco de España · [Los pagos del segundo semestre de 2025 (nota del 23-jul-2026)](https://www.bde.es/wbe/es/noticias-eventos/actualidad-banco-espana/notas-banco-espana/el-numero-de-operaciones-de-pago-con-instrumentos-distintos-del-efectivo-aumento-un-108-en-el-segundo-semestre-de-2025-respecto-al-mismo-periodo-de-2024.html)
