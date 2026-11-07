# Pasos del reloj de los documentos

> ## Cómo está
>
> | Qué              | Cómo está                                                                      |
> | ---------------- | ------------------------------------------------------------------------------ |
> | El pull request  | «El reloj de los documentos y la auditoría de las facturas»                    |
> | La base de datos | **Hay que migrar**: pasa de 107 a **108** (la 0108)                            |
> | La API           | Hay que desplegarla **después de migrar**: siguen 125 consultas y 345 comandos |
> | La caja          | **No hay caja nueva**                                                          |
>
> Lo decidido, en la [0138](decisiones/0138-el-reloj-de-los-documentos-y-la-auditoria-de-las-facturas.md).
> **Todo en pruebas**: nada llega a Hacienda de verdad.

---

## Lo que cambia para ti

- **Los tickets y las facturas pasan solos de «En Hacienda» a «Correcto»**, sin tocar nada.
- **Arriba, el total ya no cuenta dos veces** un ticket y su factura.
- **Si Hacienda rechaza una factura, puedes volver a hacerla** de ese ticket.
- **Si el correo al cliente no sale, te lo dice** al hacer la factura.

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

   **Tiene que decir** que aplica la `0108_el_reloj_de_los_documentos` y acabar sin error.

3. **En GitHub**: pestaña **Actions** → **Desplegar la API** → **Run workflow** → **Run workflow**, y
   espera a que salga en verde.

## Lo que hay que mirar en IKATZ

**1 · Un ticket nuevo.** En Ajustes › Facturación › Probar el papel, pulsa **Imprimir un ticket de prueba**.
Abre Servicio › Ventas › Tickets y facturas y **espera tres minutos sin tocar nada**: la pantalla se
refresca sola. **Debe pasar** de «En Hacienda» a «Correcto». Abriéndolo, en su historia debe poner
«Hacienda: correcto».

**2 · El total.** Hoy, con **Todos**: la cifra de arriba **debe** contar una sola vez cada venta. Haz factura
de ese ticket: siguen sumando 2,70 €, no 5,40 €.

**3 · Lo de antes, sin hacer nada.** Espera **una hora** desde que despliegues. `T-IKA-2026-000001`,
`T-IKA-2026-000002` y `F-IKA-2026-000001` **deben dejar** de poner «En Hacienda»: los dos tickets y la
factura, con lo que diga Hacienda.

- **Si la factura pone «Aceptado con errores» o «Rechazado»**, mándame la foto: es lo único que no se puede
  saber sin desplegar, por la marca `4833_` de la empresa de pruebas.
- **Si en una hora siguen igual**, dímelo y lo leo yo en la base.

**Sin impresora** no puedes probar «Imprimir»: queda para cuando la tengas, con la lectura del QR en papel.
