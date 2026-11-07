# 0136 · T6 · 2 · 1 · El motor y el ticket

**Fecha:** 6 de noviembre de 2026
**Estado:** construido en la rama `t6-2-1-el-motor-y-el-ticket`, **con la migración 0106** y la
**caja para Windows 1.3.0**.
**Sigue:** la [0126](0126-t6-1-el-alta-de-facturacion.md) (el alta), la
[0125](0125-t6-la-facturacion-las-tres-respuestas.md) (las maquetas de T6, aprobadas el 2-nov) y
la [0059](0059-emitir-un-documento-fiscal.md) (numerar al preparar y llamar fuera de la
transacción). Lo que tiene que estar, en [el plan de M20A](../m20a-la-sala-y-la-cocina.md), «T6 ·
2 · Emitir».
**Cambia:** el Anexo (4.1, 4.4, 4.5, 4.8, 4.10, 6.5 y 8), el plan de M20A, el mapa, las claves,
el precio de Verifacti, el coste por local y ESTADO.

La primera de las tres entregas de T6 · 2. **Todo en pruebas**: nada llega a Hacienda de verdad
hasta las once condiciones del capítulo 9 del Anexo.

## 1 · Lo que se puede hacer

- **Ajustes › Facturación › Probar el papel › «Imprimir un ticket de prueba»** (maqueta de T6,
  1): con el alta lista y en pruebas, un ticket (F2) **de verdad en el entorno de pruebas de
  Verifacti**, con su número, su QR y «PRUEBA · SIN VALIDEZ», por la impresora de la caja. Un
  café y un agua al tipo de restauración del local, que pone el motor fiscal (10 % de IVA en la
  península, 7 % de IGIC en Canarias). No cuenta en ventas.
- **Servicio › Ventas › Tickets y facturas** (maqueta de T6, 3 y 4): lo de hoy o de ayer, con su
  chapa ante Hacienda (Enviando, En Hacienda, Correcto, Aceptado con errores, Rechazado, Se emite
  al volver, Por el SII); **lo que falla, arriba y en llano**, con qué hacer; y al tocar uno,
  **el papel como salió**, con su QR, **su historia** (preparado, mandado, registrado, lo que dijo
  Hacienda) y **Reimprimir**, que sale como copia y no crea nada. Solo para quien lleva la
  facturación (0128). Hacer factura, devolver y anular llegan con T6 · 2 · 2.

## 2 · El motor (Anexo 4.9)

1. **Preparar, dentro del comando**: lo que se mira (el alta, las doce líneas, los 3.000 €, el
   impuesto del local), el número con el candado de **su** serie y el documento congelado. Dura
   milisegundos: ningún aparato espera a Verifacti para numerar.
2. **Mandar, con el comando ya guardado y sin ninguna transacción abierta**, con la clave de
   idempotencia del documento. Lo que contesta, en otra transacción corta.
3. **Repasar, cada minuto con el reloj** (**no era verdad**: colgaba del latido del móvil, que solo suena con avisos; lo arregla la [0138](0138-el-reloj-de-los-documentos-y-la-auditoria-de-las-facturas.md)): lo que se quedó «enviando» se termina con la misma clave,
   y lo «pendiente» se pregunta a Verifacti.
4. **Los avisos de Verifacti** entran en `/avisos/verifacti`, firmados con un secreto y una sola
   vez por su `X-Webhook-Id`.

Todo lo fiscal es **de solo inserción** (`documento`, `envio`, `registro`, `aviso_recibido`,
`justificante`); **cómo está un documento no se guarda**: se lee de lo que se le ha ido
añadiendo.

## 3 · Lo que dice Verifacti (su especificación OpenAPI, leída entera el 6-nov)

Tres cosas que el Anexo tenía por mirar, y que ya están mirando su documentación:

- **Un 400 no registra nada ni llega a Hacienda**, y la clave de idempotencia **repite también
  el 400**: si se corrigen los datos hay que mandar **con otra clave**. Así que volver a mandar
  con el mismo número es posible técnicamente; si debe hacerse, lo dice el asesor (Anexo 4.4).
  Hasta entonces, como decía el plan, **el número queda usado**.
- **El campo de la rectificativa es `tipo_rectificativa`**, con `S` (sustitución) o `I`
  (diferencias). Quita un [VERIFICAR] del Anexo 4.5.
- **La fecha de expedición «debe ser la fecha actual»**: se pone al mandar, no al preparar. Lo
  que se manda otro día lleva la de hoy, la de la operación y la incidencia (Anexo 4.11).

## 4 · Lo que decidió la IA al construirlo

1. **El ticket de prueba es un ticket de verdad en pruebas**, y no un papel de muestra: es lo
   único que deja ver el QR de verdad en la impresora y abrirlo con el móvil (prueba 24). **En
   real no se ofrece**: no se imprime nada de mentira (Anexo 4.12).
2. **Un envío que se quedó sin respuesta, otro día, se pregunta antes a Hacienda** (`POST
/verifactu/status`) con la fecha de aquel envío: si ya lo tiene, se lee su registro y no se
   manda otro; si no, sale con la fecha de hoy, una clave nueva y la incidencia. Así no se
   registra nunca dos veces.
3. **Cuándo se pregunta por un «Pendiente»**, sin guardar cuándo se preguntó: en su minuto 2 y en
   cada hora en punto de su edad (prueba 17). Lo normal es que llegue antes su aviso.
4. **El QR se imprime con la orden de QR de la impresora** (`GS ( k`), con la dirección de
   cotejo que da Verifacti, corrección M y el tamaño calculado para que mida **entre 30 y 40
   mm** en 80 y en 58 mm. Es el mismo contenido que su imagen, que también se guarda.
5. **El papel con QR es la versión 2** y lo imprime **la caja 1.3.0**, que lo dice al pedir su
   cola. **A una caja de antes no se le da** (se rompería a medias y pararía las comandas): vuelve
   a la cola y, a los cinco intentos, queda «No salió». Las comandas y las cuentas siguen igual.
6. **El justificante** (Verifacti no contesta) lleva un código `J-` y diez cifras que no se
   adivina; **recoger el ticket con él** llega con la página de «Pide tu factura» (T6 · 2 · 3).
7. **Los avisos**: con `VERIFACTI_SECRETO_DE_LOS_AVISOS` en Supabase, el reloj da de alta el
   aviso de cada entorno en Verifacti y le añade los NIF que emiten. Sin él, todo funciona igual
   y el reloj pregunta.
8. **Tickets y facturas solo para quien lleva la facturación**: el destino Ventas de Servicio
   lleva ese permiso, y las otras tres vistas (M20) siguen esperando.
9. **Los XML de cada registro** (`xml_del_registro` del Anexo 7.6) no se bajan todavía: solo
   hacen falta en real, para conservarlos. Van antes de «Pasar a real».

## 5 · Las pruebas del capítulo 8 del Anexo

En verde, contra la base y el Verifacti de mentira (`emitir-el-ticket.prueba.ts`, `emitir.prueba.ts`
y `escpos.prueba.ts`), cada una vista fallar antes del arreglo: **1, 3, 4, 5** (el número queda
usado), **7, 8, 9, 10, 15, 16, 17, 19 y 22**, y de la **14** el justificante y la emisión al
volver. **La 21** ya estaba con T6 · 1. **Con T6 · 2 · 2**: 11 y 13. **Con T7**: 12, 18 y de la 23
a la 26, y de la 14 la venta y el almacén. **La 24** (leer el QR con la app de la AEAT) la hace
Richi en IKATZ con la caja 1.3.0. **La 6** (dos NIF a la vez) y **la 20** (los cambios de hora)
quedan para T6 · 2 · 2.

## 6 · Y una cosa de R4

**Verifacti a 14,99 € + 1,99 €** es **la oferta de startup** que Verifacti le dio a Richi (6-nov);
su página pública va por tramos. Y ya está mirado en ella: **3.000 registros al mes por NIF
dentro, y 2 € por cada 1.000 de más**.
