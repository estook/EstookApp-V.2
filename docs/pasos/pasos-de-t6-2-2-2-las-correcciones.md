# Pasos de T6 · 2 · 2 · 2 · Las correcciones

> ## Cómo está
>
> | Qué              | Cómo está                                                               |
> | ---------------- | ----------------------------------------------------------------------- |
> | El pull request  | «T6 · 2 · 2 · 2 · Las correcciones»                                     |
> | La base de datos | **Hay que migrar**: pasa de 109 a **110** (la 0110)                     |
> | La API           | Hay que desplegarla **después de migrar**: 125 consultas y 349 comandos |
> | La caja          | **No hay caja nueva**                                                   |
>
> Lo decidido, en la [0140](../decisiones/0140-t6-2-2-2-las-correcciones.md). **Todo en pruebas**: nada llega
> a Hacienda de verdad.

---

## Lo que cambia para ti

- **Al abrir un documento en Tickets y facturas salen más botones**, solo si los puedes usar: **Devolver**,
  **Corregir los datos**, **Anular** y, si Hacienda lo rechazó, **Corregir**.
- **Arriba, «Factura de una señal»**, y la factura final de ese cliente la descuenta sola.
- **En Ajustes › Facturación › Quién hace qué**, tres líneas nuevas: Devolver, Corregir los datos y Anular.
- **La caja no se mueve** todavía al devolver: llega con el cobro.

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

   **Tiene que decir** que aplica la `0110_las_correcciones` y acabar sin error.

3. **En GitHub**: pestaña **Actions** → **Desplegar la API** → **Run workflow** → **Run workflow**, y
   espera a que salga en verde.
4. **Recarga** la pestaña de Estook y la del TPV.

## Lo que hay que mirar en IKATZ

Todo en **Servicio › Ventas › Tickets y facturas**. Antes, imprime dos o tres tickets de prueba en
**Ajustes › Facturación** y espera a que salgan **«Correcto»** (un minuto o dos).

**1 · Devolver una parte de un ticket.** Abre un ticket → **Devolver** → **Solo algunos** → marca el agua → elige
**Mal hecho** → **Devolver 1,20 €**. **Debe salir** un documento `R-…` que dice «Factura rectificativa» y «Rectifica:
T-…», con el importe en negativo, y a los pocos segundos **«Correcto»**. Vuelve al ticket con el enlace de abajo:
**debe poner «Devuelto en parte»**, y el botón es **«Devolver lo que queda»**. Y **«Hacer factura» ya no sale**.

**2 · Lo cobrado de más.** Haz una factura a mano con **2 raciones de algo** → **Devolver** → **Se cobró de más** →
marca esa línea → escribe **1,00** → **Devolver 1,00 €**. Vuelve a la factura → **Devolver lo que queda**: esa línea
**debe seguir con sus 2 raciones**, y un euro menos.

**3 · Una de dos raciones.** En la misma factura → **Devolver** → **Solo algunos** → marca la línea → deja **1 de 2**.
El importe **debe ser el de una**.

**4 · Corregir los datos.** Abre otra factura → **Corregir los datos** → cambia el domicilio → **Hacer la factura
corregida**. **Debe salir** una `R-…` «Corrección de datos» con el domicilio nuevo y «Motivo: Corrige el domicilio».
La anterior **debe poner «Corregida»** y llevar a ella con **Ir a su corrección**. El total de arriba **no debe
subir**: es el mismo dinero.

**5 · Anular.** Abre un ticket en **«Correcto»** → **Anular** → escribe el motivo → **Anular T-…**. **Debe poner
«Anulando»** y, al poco, **«Anulado»**, con tu nombre y el motivo. Ya **no se puede imprimir ni mandar**. **Esto es
lo que más me interesa**: es la primera vez que va a Verifacti de verdad. Si se queda en «Anulando» más de diez
minutos, o sale «La anulación no ha salido», mándame una foto.

**6 · La señal.** **Factura de una señal** → tu NIF, tu domicilio, «Señal de la comida del 14-nov», **300** y **10 %**
→ **Hacer la factura de la señal**. **Debe poner «Señal»**. Después **Hacer una factura** → el mismo NIF y sal del
campo: **debe salir marcado «Descontar su señal», −300,00 €**. Añade un concepto libre de **1.000 € al 10 %**: el total
**debe ser 700,00 €**. Hazla: **debe decir «Descuenta la señal F-…»** y la señal, **«Descontada»**.

**7 · Quién hace qué.** **Ajustes › Facturación › Quién hace qué**: **deben estar** Devolver, Corregir los datos del
cliente y Anular, y **«Factura a mano y señal»** en vez de «Factura a mano».

**8 · Un camarero, si das de alta uno.** IKATZ no tiene ninguno. Con uno, en el TPV: **no le deben salir** Devolver,
Corregir ni Anular, y sí Hacer factura.
