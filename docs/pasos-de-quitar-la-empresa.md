# Pasos de «Quitar la empresa» y la auditoría de T6 · 1

> ## Cómo está
>
> | Qué              | Cómo está                                                                |
> | ---------------- | ------------------------------------------------------------------------ |
> | El pull request  | «T6 · 1: quitar la empresa de un local, y la auditoría»                  |
> | La base de datos | **Migración 0102**: falta migrarla. Tiene que quedar **102 de 102**      |
> | La API           | Falta desplegarla. Tiene que quedar con **119 consultas y 334 comandos** |
> | La caja          | **No hay caja nueva**: nada que publicar                                 |
>
> **Todo sigue en pruebas**: nada llega a Hacienda de verdad.

---

## Lo que cambia para ti

- **Quitar la empresa de un local**, por si te equivocas: en Ajustes › Facturación › paso 1, abajo,
  **«Quitar esta empresa de…»**. Te pide confirmarlo. El local se queda sin empresa y el alta vuelve
  al paso 1. **No se borra nada**, y si la vuelves a poner (escribiendo su NIF o eligiéndola en «Ya
  tienes una empresa»), vuelve la misma, con su alta y su firma.
- **En el admin**, en «La empresa de pruebas de Verifacti», si eliges un local que ya la tiene sale
  **«Quitarla de ese local»**.
- **En real no se quita**: una empresa que ya ha hecho tickets de verdad es la que los firmó.
- **El admin ya no pone la empresa de pruebas encima de la empresa de un local**: te dice que la
  quites antes.
- Lo que salió de la auditoría, en la [0129](decisiones/0129-quitar-la-empresa-y-la-auditoria-de-t6-1.md).

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

   **Tiene que** decir que aplicó la **0102** y que hay **102 de 102**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde.

## Lo que te toca · probarlo

### 1 · Quitarla y ponerla en el admin

1. En **estook.com/admin** → **Facturación** → **La empresa de pruebas de Verifacti** → **En qué
   local**: elige el de **IKATZ**.
   - **Tiene que** salir **«Quitarla de ese local»**.
2. **No la quites en IKATZ** si no quieres volver a ponerla. Si quieres probarlo: **Quitarla de ese
   local**, y luego **Ponerla en ese local** otra vez.
   - **Tiene que** volver a salir, en Estook, Ajustes › Facturación **«Lista»**.

### 2 · Quitarla desde Ajustes

1. En **Estook**, IKATZ → **Ajustes** → **Facturación** → paso 1 → **Cambiar**.
   - **Tiene que** salir el aviso azul de la empresa de pruebas y, abajo, **«Quitar esta empresa de
     IKATZ»**.
2. Púlsalo.
   - **Tiene que** preguntarte si estás seguro, con **«Sí, quitarla»** y **«No»**. Pulsa **No**.

## Cómo se hacen las pruebas reales

Está explicado entero en el mensaje del chat del 5-nov y resumido en la
[0129](decisiones/0129-quitar-la-empresa-y-la-auditoria-de-t6-1.md). En corto:

1. **Ahora, en IKATZ**, con la empresa de pruebas: emitir (T6 · 2) contra el entorno de pruebas.
2. **Antes del primer cliente**, con un NIF de verdad **en pruebas**: el tuyo o el de tu sociedad,
   firma incluida; y después el del restaurante de tu amigo, firmando él.
3. **En real**, solo con las once condiciones del Anexo (capítulo 9), entre ellas la revisión del
   asesor y la declaración responsable firmada.
