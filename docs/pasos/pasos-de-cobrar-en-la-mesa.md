# Pasos de cobrar en la mesa y Negocio › Ventas

> ## Cómo está
>
> | Qué              | Cómo está                                                                                  |
> | ---------------- | ------------------------------------------------------------------------------------------ |
> | El pull request  | «Cobrar en la mesa y Negocio › Ventas», **abierto**, para fusionar cuando esté en verde    |
> | La base de datos | **Hay que migrar**: pasa de 116 a **117** (los cobros en efectivo que esperan en la caja)  |
> | La API           | **Hay que desplegarla, después de migrar**: pasa a **134 consultas y 370 comandos**        |
> | La caja          | **No hay caja para Windows nueva**: la caja abre Estook TPV de la web, que se publica sola |
>
> Lo decidido, en la [0145](../decisiones/0145-cobrar-en-la-mesa-y-negocio-ventas.md).

---

## Lo que cambia para ti

- **El comandero cobra en la mesa**: con tarjeta (cobras en el datáfono y tocas «Cobrado con tarjeta»),
  Bizum o cheque. Con **efectivo**, toca «Dejar 40,00 € para la caja»: queda pendiente a nombre de quien lo
  deja.
- **En la caja, el efectivo pendiente**: la mesa dice «Cobro en caja». Al tocarla, «Cobrar efectivo · Ricardo»
  → **el PIN de quien cobra** → «¿Cuánto te da?» → sale el cambio → «Cobrar». Sale el ticket y la impresora
  abre el cajón. El cobro queda a nombre de quien tecleó el PIN.
- **Con la caja bloqueada**, a la izquierda de la pantalla del PIN salen los **cobros pendientes** de todos. Se
  toca uno, se teclea el PIN y se entra directo a cobrarlo.
- **Cerrar caja ya no pregunta el datáfono**: tres pasos (contar, para mañana y el resultado).
- **Ajustes del TPV › Aparatos**: en cada comandero, «Saca sus tickets en». Sin elegir, la impresora de la caja.
- **En Estook, Negocio › Ventas** tiene tres pestañas: **Resumen** (con «Cómo se cobró»: lo cobrado, tarjeta y
  efectivo, y «Hoy» en el periodo), **Cobros** (cada cobro con lo que dio el cliente y el cambio) y **Tickets y
  facturas**, que antes estaba en Servicio. **Servicio ya no tiene Ventas.** Los camareros no ven nada de esto
  en Estook: facturan en Estook TPV › Tickets.
- **Servicio › Jornadas › Cierres de caja**: en cada caja, **«Descargar su Z»** (el PDF del cierre) y **«Sus
  tickets»** (sus cobros).
- **La pantalla de contar el cajón** va en filas: billetes a un lado y monedas al otro.

## Lo que te toca · fusionar, migrar y desplegar

**Si lo único en rojo son fotos de pantallas**, GitHub las sube solo y vuelve a probar. Si sale en rojo otra
cosa, pásame una foto.

1. **En GitHub**: cuando el pull request esté **en verde**, **Merge pull request** → **Confirm merge**.
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

   Tiene que acabar diciendo que la base está en la **117**.

3. **En GitHub**, después de migrar: pestaña **Actions** → **Desplegar la API** → **Run workflow** → escribe
   `desplegar` → **Run workflow**, y espera a que salga en verde.

## Qué mirar, en IKATZ

Tienes que tener **la caja abierta** y haber **fichado** (el comandero es para quien ha fichado).

1. **Con tarjeta, en el móvil.** En tu móvil de comandero, abre una mesa con algo pedido → **Cobrar** →
   **Tarjeta** → **Cobrado con tarjeta**. Tiene que salir ✓ y el número del ticket, y el ticket por la Epson de
   la caja. La mesa queda libre.
2. **Efectivo, en el móvil.** Otra mesa → **Cobrar** → **Efectivo** → **Dejar … para la caja**. Sale «… en
   efectivo, para la caja». En el plano, la mesa dice **«Cobro en caja»**.
3. **Cobrarlo en la caja.** En la caja, toca esa mesa → **Cobrar efectivo · Ricardo** → teclea tu PIN → toca un
   billete → mira el cambio → **Cobrar**. Sale el ticket y se abre el cajón.
4. **Desde la pantalla del PIN.** Deja otro efectivo desde el móvil, y en la caja toca **Bloquear**. A la
   izquierda tiene que salir «Cobros pendientes» con esa mesa. Tócala, teclea tu PIN y cóbralo.
5. **Cerrar caja**: ya no pregunta el datáfono.
6. **En Estook**, **Negocio › Ventas**: en **Resumen** elige **Hoy** y mira «Cómo se cobró»; en **Cobros**, lo
   que dio el cliente y el cambio. **Servicio** ya no tiene Ventas.
7. **Servicio › Jornadas › Cierres de caja** → toca un día → en una caja, **Descargar su Z** (baja un PDF) y
   **Sus tickets**.

**Si algo falla**, dime en qué paso y qué sale en pantalla (una foto vale).
