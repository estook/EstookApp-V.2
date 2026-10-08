# 0076 · A3 · Los vendedores: traen el cliente y nada más, sin comisiones en Estook, con un descuento del primer mes en cada código

**Fecha:** 7 de octubre de 2026
**Estado:** decidido por Richi y **construido el 7-oct**, con la migración `0058` (lo que decidí al construirlo, al final).
**Cambia:** el capítulo 3 de [`panel-de-administracion.md`](../panel-de-administracion.md) y lo de vendedores de la [0041](0041-el-panel-de-administracion.md): **sin asignaciones, sin panel del vendedor, sin comisiones ni liquidaciones**, y sin el nivel Vendedor del admin. El plan, en [`a3-vendedores.md`](../a3-vendedores.md).

## Lo que dijo Richi

> «El vendedor no se ocupa de nada, solo trae el cliente; nosotros, los admin, vemos con qué vendedor ha venido y listo. **Los vendedores NO son admins.**»

Y a las preguntas, el mismo 7-oct:

1. **¿Cómo se apunta qué vendedor lo trajo?** «Necesitarán un QR o un enlace de vendedor, para que se suscriban mediante el vendedor y darle a él la venta; y al registrarse, un hueco con el código introducido, y si no está, poderlo poner a mano. **Elige la mejor opción, la más óptima y fácil. No hay que complicarse.**»
2. **¿Comisiones?** «**Lo pactamos todo fuera**, viendo los datos de cada vendedor: cuántos ha traído, el tiempo, activos o inactivos, ya que les tiene que cuidar; y así vamos dando incentivos, pero se hace fuera.»
3. **¿El código le da algo al cliente?** «**Un descuento asociado al código y al vendedor**: el primer mes. Los días de prueba ya se ponen desde el admin, eso lo gestionamos nosotros.»
4. **¿Una sola entrega?** «Sí.»

## Lo que se decide

### Uno · El vendedor no entra en Estook

Es **una ficha en el admin**: nombre, teléfono, correo y notas. No tiene cuenta, ni panel, ni nivel de admin. Los datos los veis vosotros y se los pasáis como queráis.

### Dos · Cada código, su enlace y su QR; y la casilla del registro

Un vendedor tiene **los códigos que quiera** (`JUAN26`, `JUAN-FERIA`), cada uno con su campaña. **Un código no se reutiliza jamás** (0041). Cada código tiene **su enlace**, `estook.com/?ref=JUAN26`, y **su QR** para un folleto.

Quien entra por el enlace o el QR llega a «Crear cuenta» **con el código ya escrito** y su descuento a la vista. Quien no, tiene la casilla **«Código de vendedor»** para escribirlo. Un código que no existe o está cerrado **se avisa al momento y no frena el registro**.

### Tres · El código no se guarda en el navegador

Era la otra mitad de la pregunta 1: recordar el código 60 días por si vuelve otro día. **Lo más óptimo es no hacerlo**:

- Guardarlo **obliga a pedir permiso con un aviso de cookies** (LSSI, artículo 22.2), solo para eso: `estook.com` hoy no lo tiene, y es una ventana más delante de quien acaba de llegar.
- **Gana poco**: quien escanea el QR en el bar y se registra días después lo hace a menudo desde otro aparato, donde no habría nada guardado.
- La casilla lo cubre: **el vendedor le dice «pon JUAN26»**, y con el descuento delante, el cliente tiene motivo para escribirlo.

### Cuatro · Lo que se ve de cada vendedor

En **Vendedores**, de cada uno: **cuántos ha traído** (y cuántos este mes), cuántos **pagan**, cuántos **están en prueba**, cuántos **se están yendo** y cuántos **no pagan**; cuántos **lo usan** y cuántos **están dormidos**; **cuánto dejan al mes** sus clientes; y **cuánto tiempo llevan** con nosotros. Y la lista de sus clientes, con todo eso uno a uno. **Las cifras las calcula el servidor**, con la misma cuenta que la lista de Clientes. Los de ejemplo no cuentan.

En **Clientes**, cada ficha dice **con quién vino** y **por dónde** (vendedor, anuncios, buscadores, otra web o directo), y la lista se filtra por vendedor.

### Cinco · Sin comisiones en Estook

**Se pactan fuera.** Estook no calcula, no liquida y no paga nada a nadie. Si algún día hace falta, los cobros de Stripe siguen ahí.

### Seis · El descuento del primer mes

Cada código puede llevar **un descuento del primer mes**, en tanto por ciento, que se pone al crearlo y **no se cambia** (para otro, otro código). Se aplica **al primer cobro mensual**: sin prueba, en la propia página de pago; con prueba, **al acabar la prueba**, en el primer cobro de verdad. Los días de prueba siguen saliendo de la oferta del admin, como hasta hoy.

**Solo en el pago mensual**: el anual ya lleva dos meses gratis, y un «primer mes» sobre un año entero sería un año a mitad de precio.

### Siete · Corregir quién lo trajo

**Manda el código del registro.** Si el cliente se olvidó de ponerlo, o se puso mal, **lo pone o lo cambia un admin, con motivo**, y queda en la auditoría del admin. Si todavía no ha pagado su primer mes, el descuento le llega igual.

## Lo que decidí al construirlo

1. **El descuento es un cupón de Stripe de «una vez»**, uno por tanto por ciento (`estook-primer-mes-50`), que se crea la primera vez que hace falta. Rebaja la base de la factura, así que el IVA sale bien.
2. **Con prueba, se pone cuando Stripe avisa de que la prueba acaba** (tres días antes, o en el momento si es más corta), y no al pagar: la factura de cero euros del principio se lo gastaría (lección 154). Por eso se le pide a Stripe ese aviso, que antes no se pedía: el código se lo pide solo al de Stripe, sin hacer otro.
3. **La página de pago de Stripe, con prueba, no puede enseñar el descuento**: lo dice el texto junto al botón de pagar, y «Elige tu plan».
4. **La portada enseña el descuento del código**, «Con JUAN26: 50 % el primer mes», y no dice de qué vendedor es: eso es nuestro.
5. **El código viaja por todos los enlaces de la web**, también a la privacidad y las condiciones, para que no se pierda si alguien las lee antes de registrarse.
6. **La política de privacidad lo dice**: qué se guarda de cómo nos conociste, para qué y que no se guarda en el navegador. Es un borrador más, sin asesor, como el resto.
7. **El QR del código es el mismo de la carta**, que pasa al paquete común para que lo usen la app y el admin sin copiarlo.
8. **Las cifras del vendedor se vuelven a leer al entrar**: con lo de hace un rato, un cliente recién registrado no salía (lección 152).

## Lo que se descartó

- **El panel del vendedor y el nivel Vendedor del admin.** «Los vendedores no son admins.»
- **Las asignaciones** («quién lo lleva»): el vendedor no lleva a nadie.
- **Comisiones y liquidaciones en Estook.** Se pactan fuera.
- **Guardar el código en el navegador 60 días.** Pide un aviso de cookies y casi no gana nada (arriba, tres).
- **Descuentos en euros.** Un tanto por ciento vale igual para Esencial y para Pro.
