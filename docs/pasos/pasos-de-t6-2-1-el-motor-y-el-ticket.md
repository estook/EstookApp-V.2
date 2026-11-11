# Pasos de T6 · 2 · 1 · El motor y el ticket

> ## Cómo está
>
> | Qué              | Cómo está                                                                |
> | ---------------- | ------------------------------------------------------------------------ |
> | El pull request  | «T6 · 2 · 1 · El motor y el ticket»                                      |
> | La base de datos | **Hay que migrar**: pasa de 105 a **106** (la 0106)                      |
> | La API           | Hay que desplegarla **después de migrar**: 121 consultas y 338 comandos  |
> | La caja          | **Hay que publicar la 1.3.0**: es la que sabe imprimir el QR             |
> | Un secreto nuevo | `VERIFACTI_SECRETO_DE_LOS_AVISOS`, **opcional**: los avisos de Verifacti |
>
> Lo decidido, en la [0136](../decisiones/0136-t6-2-1-el-motor-y-el-ticket.md). **Todo en pruebas**:
> nada llega a Hacienda de verdad.

---

## Lo que cambia para ti

- **Ajustes › Facturación › Probar el papel › «Imprimir un ticket de prueba»**: un ticket de
  verdad en el entorno de pruebas de Verifacti, con su número, su QR y «PRUEBA · SIN VALIDEZ», por
  la impresora de la caja. No cuenta en ventas.
- **Servicio › Ventas › Tickets y facturas**: lo emitido hoy o ayer, con lo que dice Hacienda. Lo
  que falla sale arriba, en llano. Al tocar uno, el papel como salió y su historia, y
  **Reimprimir**.
- **Si Verifacti no contesta**, sale un **justificante** que dice que no es una factura, con un
  código; el ticket se emite solo cuando vuelve.

## Lo que te toca · fusionar, migrar y desplegar

Si algo falla, no sigas y pásame una foto de lo que dice la pantalla.

1. **En GitHub**: abre el pull request y espera a que las comprobaciones estén **en verde**.
   Después: **Merge pull request** → **Confirm merge**.
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

   **Tiene que decir** que aplica la `0106_emitir_el_ticket` y acabar sin error.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde. **Primero migrar, luego desplegar.**
4. **En GitHub**: **Actions** → **La caja para Windows** → **Run workflow**, rama `main`, y en la
   casilla escribe **`publicar`**. Espera al círculo verde (unos 10 minutos).
   - **Tiene que salir** en **Releases** «v1.3.0» con tres ficheros: el `.exe`, su `.blockmap` y
     `latest.yml`.
   - La caja que ya tienes instalada se actualiza sola: **ciérrala y vuelve a abrirla** (a veces dos
     veces: la primera la descarga). **Una caja de antes no imprime tickets** (sí las comandas):
     el ticket se queda sin salir hasta que tenga la 1.3.0.
5. **Opcional, en Supabase**: **Edge Functions** → **Secrets** → **Add new secret**. Nombre
   `VERIFACTI_SECRETO_DE_LOS_AVISOS` y, de valor, **una frase larga que te inventes** (no la pegues
   en el chat). Con ella Verifacti avisa al momento de lo que dice Hacienda; sin ella, el reloj
   pregunta solo y todo funciona igual, un poco más despacio.

## Lo que te toca · probarlo en IKATZ

1. **En Estook › Ajustes › Facturación** de IKATZ: arriba tiene que decir que **está lista** y **en
   pruebas**. Si le falta un paso, termínalo (o, si es la empresa de pruebas, que la ponga el admin).
2. En **Probar el papel**, toca **Imprimir un ticket de prueba**.
   - **Tiene que salir** «Hecho: T-…-2026-000001» (o el número que toque).
   - **Por la impresora de la caja** (con la 1.3.0) sale el ticket: **arriba «PRUEBA · SIN
     VALIDEZ»**, luego **«QR tributario:», el QR y «VERI\*FACTU»**, los datos de la empresa, un café
     y un agua, y el total con el IVA.
3. **Abre el QR con la cámara del móvil**: tiene que abrir la página de cotejo de Hacienda (la de
   pruebas). Si no lo lee, dime en qué impresora (80 o 58 mm) y mándame una foto del papel.
4. Toca **Verlo en Tickets y facturas**. Tiene que salir el ticket con **«En Hacienda»** y, a los
   pocos minutos, **«Correcto»**. Tócalo: el papel igual que salió y su historia.
5. Toca **Reimprimir**: sale otra vez, con «COPIA».

**Si algo no cuadra:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.
