# Pasos de T6 · 2 · 3 · Pide tu factura

> ## Cómo está
>
> | Qué              | Cómo está                                                               |
> | ---------------- | ----------------------------------------------------------------------- |
> | El pull request  | «T6 · 2 · 3 · Pide tu factura»                                          |
> | La base de datos | **Hay que migrar**: pasa de 110 a **111** (la 0111)                     |
> | La API           | Hay que desplegarla **después de migrar**: 125 consultas y 354 comandos |
> | La caja          | **No hay caja nueva**                                                   |
>
> Lo decidido, en la [0141](decisiones/0141-t6-2-3-pide-tu-factura.md). **Todo en pruebas**: nada llega a
> Hacienda de verdad.

---

## Lo que cambia para ti

- **Tu cliente puede pedir su factura en su móvil**, en `estook.com/factura/…`, y le llega al correo. El QR en el
  papel llega con el cobro (T7).
- **Al abrir un ticket en Tickets y facturas**, «Copiar el enlace». Sirve para probarla hoy y para quien te llame
  al día siguiente.
- **En la lista**, la chapa «Pedida por el cliente». No te avisa de nada, salvo que Hacienda la rechace.

## Lo que te toca · fusionar, migrar y desplegar

Si algo falla, no sigas y pásame una foto de lo que dice la pantalla.

1. **En GitHub**: abre el pull request y espera a que las comprobaciones estén **en verde**. Después:
   **Merge pull request** → **Confirm merge**.
2. **En tu ordenador**, en PowerShell, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   **Tiene que decir** que aplica la `0111_pide_tu_factura` y acabar sin error.

3. **En GitHub**: pestaña **Actions** → **Desplegar la API** → **Run workflow** → **Run workflow**, y espera a que
   salga en verde.
4. **Recarga** la pestaña de Estook.

## Lo que hay que mirar en IKATZ

Antes, imprime un ticket de prueba en **Ajustes › Facturación**.

**1 · El enlace.** En **Servicio › Ventas › Tickets y facturas**, abre ese ticket → **Copiar el enlace**. **Debe
poner «Copiado»**. Ábrelo en tu móvil: mándatelo por WhatsApp, por ejemplo. Si lo abres enseguida, **debe decir «Tu
ticket se está registrando»**, y en un minuto cambia solo al formulario.

**2 · Pedirla.** En el móvil, **debe poner «PRUEBA · SIN VALIDEZ» arriba** y «Tu factura de IKATZ», con el número y el
importe del ticket. Escribe el NIF de la empresa de pruebas y sal del campo: **debe salir su nombre con un ✓**. Pon un
domicilio y **tu correo** → **Quiero la factura**. **Debe decir «Ya está»**. En uno o dos minutos **te debe llegar el
correo con el PDF**.

**3 · Lo que ves tú.** En Tickets y facturas, la factura **debe llevar «Pedida por el cliente»**, y su historia, «La
pidió el cliente desde su móvil» y «Mandada por correo a…». El ticket **debe poner «Canjeado»**.

**4 · Otra vez.** Vuelve a abrir el enlace en el móvil. **Debe decir «Este ticket ya tiene factura»**, sin enseñar tu
correo ni tu NIF. **Mandarla otra vez** → **debe llegarte otro correo**, en uno o dos minutos.

**5 · Apagarla.** Imprime otro ticket y copia su enlace. En **Ajustes › Facturación**, apaga **«Pide tu factura» en el
ticket**. Abre el enlace: **debe decir «En IKATZ, la factura se pide en el local»**, y dejarte descargar el ticket. En
el ticket **ya no debe salir** «Copiar el enlace». **Vuelve a encenderla.**

**6 · Un particular.** Con otro ticket, elige **Particular**: tu DNI, tu nombre y apellidos, domicilio y correo. **Debe
llegarte igual**.

**7 · Sin el enlace.** Abre `estook.com/factura`. **Debe pedirte el código de tu papel**. Escribe cualquier cosa: **debe
decir que ese código no tiene buena pinta**, o que no es de ningún ticket.
