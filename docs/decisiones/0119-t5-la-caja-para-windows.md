# 0119 · T5 · La caja para Windows: Estook TPV con lo de Estook Link dentro, en dos entregas

**Fecha:** 27 de octubre de 2026
**Estado:** decidido; se construye en **T5 · 1 · Imprimir y el cajón** y **T5 · 2 · Sin internet**.
**Sigue:** la [0056](0056-estook-tpv-su-puerta-y-estook-link.md), la
[0107](0107-estook-tpv-el-tpv-entero.md), la [0115](0115-cada-aparato-a-lo-suyo.md) y las maquetas
de T5 ([`docs/maquetas/t5-la-caja-para-windows.html`](../maquetas/t5-la-caja-para-windows.html),
#147), cuyas cuatro preguntas contestó Richi el 27-oct sin cambiar nada de lo dibujado.
**Sustituye:** de la 0056, que **Estook Link** sea un programa aparte, en Rust, para Windows, Linux y
macOS; y de la Arquitectura, capítulo 1, «Descartado: un TPV de escritorio aparte para Windows».
**Cambia:** la Arquitectura (capítulos 1, 2, 3, 6, 7 y 8), el Manifiesto (capítulos 1, 2, 4, 29 y 34),
la Auditoría de flujos, el Anexo (capítulos 6, 7.5, 10, 11.2 y 11.13), el Plan (M19), el plan de
Estook TPV, el mapa y ESTADO.

## 1 · Lo que pidió Richi

- **26-oct:** una **app de Windows con Estook Link dentro**: un solo programa en el PC de la caja; la
  web y el programa a la vez, avisando de que descargado va mejor; en la tablet, la web instalada.
- **27-oct:** T5 se llama **«La caja para Windows»** («lo que antes llamábamos Estook Link, ahora
  dentro de la app descargable»), y la quiere **«súper pulida»**, con las mejoras y lo que no cuadre
  dicho antes de programar.

## 2 · Sus cuatro respuestas (27-oct)

1. **Dónde se prueba:** no en IKATZ, sino **en el restaurante de un amigo**, cuya cuenta de prueba se
   crea después: un **PC con Windows táctil** en la caja, **una impresora Epson por cable de red**
   (sin saber el modelo), **la cocina con papel y pantalla**, **la barra que también prepara** y los
   camareros con **móviles Android**, como la mayoría.
2. **Los iPhone:** por ahora **Android**, que es lo que usa casi todo el mundo; la app de iPhone
   (la cuenta de Apple ya la tiene, por otra app suya) **se hace si alguien la pide**.
3. **La firma del programa: la A.** Sin firmar para las pruebas, sabiendo que Windows enseña «Windows
   protegió su PC» la primera vez; **se firma antes de vender**, con la sociedad y la mudanza.
4. **En dos entregas: la A.** **T5 · 1 · Imprimir y el cajón**, y después **T5 · 2 · Sin internet**.

## 3 · Lo que se decide

### Qué es

- **La caja para Windows** es un programa que se descarga en el PC de la caja. Dentro va **Estook TPV
  tal cual** (la misma sala, la misma botonera, el mismo código, publicado en `estook.com/tpv/`), y
  **lo que hacía Estook Link**: hablar con las impresoras y el cajón (T5 · 1) y ser **el centro del
  local** cuando se va internet (T5 · 2).
- **La web sigue valiendo** en cualquier aparato. En un PC con Windows, la caja web enseña una franja
  para descargar el programa.
- **Solo Windows.** Linux, Mac y un mini PC sin pantalla, cuando un cliente lo pida.
- **Pasar la caja al programa** se hace con **el código de 6 cifras de siempre** (T1): el programa
  llega con el nombre, el cajón y la función de la caja, y **la del navegador se desvincula sola**,
  para que nunca haya dos cajas con el mismo cajón.

### Cómo se hace por dentro: Electron, no Rust

Decidido por la IA, porque cambia lo escrito en la 0056:

1. **Un solo lenguaje.** El traductor del formato intermedio (Anexo 6.5) a las órdenes de la
   impresora (ESC/POS) se escribe **una vez, en TypeScript**, y lo usará también la app de Android
   cuando llegue. En Rust serían dos traductores que hay que mantener iguales.
2. **Se prueba entero en este ordenador** con lo de siempre (Vitest y Playwright, que sabe manejar
   Electron), sin instalar Rust ni las herramientas de compilación de Microsoft.
3. **Trae su propio navegador** (Chromium): la caja no depende del Edge que tenga el PC.

**Lo que cuesta:** el instalador pesa unos 100 MB en vez de 10, y gasta algo más de memoria. Un PC
de caja lo aguanta, y la velocidad manda sobre el tamaño (B7 del Plan). **Seguridad:** la web no
toca nada del sistema; el programa le deja **un puente pequeño y con nombre** (imprimir, buscar
impresoras, cómo está la caja), y nada más.

### Imprimir (T5 · 1)

- **La cola vive en la nube** (Anexo 6.3): mandar, marchar o pedir la cuenta deja un trabajo con su
  contenido **ya compuesto por el servidor**. **La caja lo recoge con su llave**, también bloqueada y
  sin nadie dentro, lo traduce y lo manda a la impresora. Quien pide nunca imprime: el móvil del
  camarero no necesita nada.
- **Por la red del local**, que es lo que tienen casi todas las impresoras de bar y lo que tiene el
  local de prueba. **Por USB**, en una entrega siguiente, cuando un local lo tenga: Windows lo hace
  a través de su propio controlador, y se prueba con una de verdad.
- **Qué sale en papel en T5 · 1:** la comanda de cocina y la de la barra al mandar, «¡Marcha el
  2.º!», lo anulado, lo que vuelve, **la cuenta** (la precuenta, que no es un documento fiscal),
  reimprimir (sale «COPIA») y el papel de prueba. **El cajón, de prueba**, con permiso, motivo y su
  rastro.
- **El ticket del cobro y el cajón al cobrar en efectivo, con T6 y T7**: el ticket es la factura
  simplificada y solo existe cuando Verifacti lo registra. Queda dibujado y preparado.
- **Cocina y barra eligen** pantalla, papel o las dos. Con las dos, el papel lleva lo nuevo, lo
  marchado, lo anulado y lo que vuelve.
- **Sin pantalla de cocina, marchar va directo**, sin el aviso «lo de antes aún no ha salido»: nadie
  tacha, así que el aviso saldría siempre.
- **La impresora de reserva** y **los avisos** de «sin papel» o «no responde», en la caja y en el
  aparato de quien mandó.

### Sin internet (T5 · 2)

- **La caja hace de centro** (lo de la 0056, ahora dentro del programa): los demás aparatos le
  mandan por el wifi del local, ella imprime, reparte a las pantallas de cocina y barra y lo guarda
  para subirlo una vez.
- **Android y Windows, sí**, con el permiso de red local de Chrome y Edge. **iPhone y iPad, no**:
  Safari no deja; guardan lo suyo y lo suben al volver, con el aviso ámbar «la cocina aún no lo
  recibe» (respuesta 2).
- **La caja va por cable** al router, como exige Toast a su centro; si va por wifi, se avisa.

### Descargar y actualizar

- **Se descarga de las publicaciones del repositorio en GitHub** mientras sea público; **con la
  mudanza**, del alojamiento nuevo. **Sin firmar** hasta vender (respuesta 3).
- **Se actualiza solo**, y la versión nueva se pone **al cerrar la caja o sin mesas abiertas**,
  nunca en mitad del servicio (Anexo 10.12). La web de dentro se actualiza como siempre, al fusionar.
- **Arranca con Windows y a pantalla completa**, si el local quiere.

### El conector de otros TPV (M19b)

Leer los ficheros de Revo, Ágora o Glop era la otra mitad de Estook Link, para quien **no** cobra
con Estook. Ese local no tendría «la caja para Windows»: **el mismo programa podrá hacerlo sin la
caja**, y se decide con M18.

## 4 · Lo que no se toca

- **Un solo código, en web.** El programa enseña la misma Estook TPV; no hay pantallas de Windows.
- **Los datos, en la nube**: la caja no guarda nada que no esté también arriba, salvo lo que espera a
  subir (T5 · 2).
- **El ticket lo emite la nube** (0059); que lo emita la caja sin internet es futuro y necesita al
  asesor.
- **La caja no decide nada**: no calcula precios ni numera tickets; lo que hace pasa por las mismas
  órdenes, los mismos permisos y la misma auditoría que todo lo demás.
- **Ninguna marca en el núcleo** (Anexo 6.7): vale cualquier impresora ESC/POS.
