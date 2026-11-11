# Pasos de T6 · 2 · 2 · 1 · Las facturas y quién hace qué

> ## Cómo está
>
> | Qué              | Cómo está                                                               |
> | ---------------- | ----------------------------------------------------------------------- |
> | El pull request  | «T6 · 2 · 2 · 1 · Las facturas y quién hace qué»                        |
> | La base de datos | **Hay que migrar**: pasa de 106 a **107** (la 0107)                     |
> | La API           | Hay que desplegarla **después de migrar**: 125 consultas y 345 comandos |
> | La caja          | **No hay caja nueva**: la 1.3.0 ya imprime la factura                   |
>
> Lo decidido, en la [0137](../decisiones/0137-t6-2-2-1-las-facturas-y-quien-hace-que.md). **Todo en
> pruebas**: nada llega a Hacienda de verdad.

---

## Lo que cambia para ti

- **Tickets y facturas**, en Servicio › Ventas y en Estook TPV (botón «Tickets»): buscador, fechas,
  filtros, y lo que falla arriba sea del día que sea.
- **Hacer factura** de uno o varios tickets, y **Hacer una factura** a mano.
- **Ajustes › Facturación › Quién hace qué**: los camareros ya pueden hacer la factura de un ticket, sin
  ver la parte fiscal. Tú cambias a cada persona con un interruptor.
- ~~**«En Hacienda» ya no se queda parado**~~: **no era verdad**, y lo arregla
  [el reloj de los documentos](pasos-del-reloj-de-los-documentos.md).

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

   **Tiene que decir** que aplica la `0107_las_facturas_y_quien_hace_que` y acabar sin error.

3. **En GitHub**: pestaña **Actions** → **Desplegar la API** → **Run workflow** → **Run workflow**, y
   espera a que salga en verde.

## Lo que hay que mirar en IKATZ

**1 · Aquel ticket.** En Servicio › Ventas › Tickets y facturas, pulsa **Ayer** y abre `T-IKA-2026-000001`.
**Debe poner** «Correcto», y en su historia «Hacienda: correcto». Si sigue en «En Hacienda», mándame
una foto.

**2 · Un ticket nuevo, para ver que ya no se queda parado.** En Ajustes › Facturación › Probar el papel,
pulsa **Imprimir un ticket de prueba**. Vuelve a Tickets y facturas y espera unos minutos sin tocar nada.
**Debe pasar** de «En Hacienda» a «Correcto» solo.

**3 · Su factura.** Abre ese ticket → **Hacer factura**. Escribe un NIF de empresa de verdad (el de tu
gestoría, por ejemplo) y sal del campo. **Debe salir** «✓ En Hacienda: …» con su nombre. Pon el domicilio
→ **Hacer la factura**.

- **Debe salir** la factura `F-IKA-2026-000001`, con su QR, el precio sin IVA y «Sustituye a» el ticket.
- **Si dice que Verifacti no la ha aceptado**, mándame la foto: es lo único que no he podido comprobar,
  por la marca `4833_` que la empresa de pruebas pone a los números.
- Lee su QR con el móvil. **Debe salir** «Encontrada» en la web de la AEAT, como con el ticket.
- Vuelve al ticket: **debe poner** «Canjeado» y ya no ofrecer «Hacer factura».

**4 · Una factura a mano.** Pulsa **Hacer una factura**. Elige el cliente de antes, **Concepto libre**
«Alquiler del comedor», 150 € al 21 %, **Por cobrar** y una fecha en **Vence** → **Hacer la factura**.
Después **Descargar** (debe bajar un PDF A4), y **Marcar cobrada**.

**5 · Quién hace qué.** En Ajustes › Facturación, abre **Factura a mano** en «Quién hace qué». **Debes ver**
a tu equipo con un interruptor. Cambia uno y **debe poner** «cambiado a mano».

**6 · Un camarero.** Con la cuenta de un camarero, en el móvil o en el TPV:

- **Debe ver** Tickets y facturas con hoy y ayer, y poder hacer la factura de un ticket.
- **No debe ver** «Hacer una factura», «Elegir fechas», ni Ajustes › Facturación.

**Sin impresora** no puedes probar «Imprimir»: queda para cuando la tengas, con la lectura del QR en papel.
