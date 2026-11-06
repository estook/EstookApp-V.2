# Pasos de R2 · 2 · Servido y cambiar un plato

> ## Cómo está
>
> | Qué              | Cómo está                                                              |
> | ---------------- | ---------------------------------------------------------------------- |
> | El pull request  | «R2 · 2 · Servido y cambiar un plato»                                  |
> | La base de datos | **Hay que migrar**: pasa de 102 a **103** (la 0103)                    |
> | La API           | Hay que desplegarla **después de migrar**: dos órdenes nuevas, 119/336 |
> | La caja          | **No hay caja nueva**: la caja para Windows carga Estook TPV de la web |
>
> Lo decidido, en la [0132](decisiones/0132-r2-2-servido-y-cambiar-un-plato.md).

---

## Lo que cambia para ti

- **«Servido» en la mesa**, si lo enciendes en Ajustes del TPV › Cocina y barra › **La sala**: el
  camarero marca con casillas grandes lo que lleva a la mesa, y la cocina lo ve en verde, «Lucía ha
  marcado servido», con **Deshacer** durante 5 minutos. **Con la cocina solo en papel sale siempre.**
- **Cambiar un plato, sin PIN**: toca el plato en la cuenta → **Cambiar** → el otro. Si está en marcha,
  pregunta **«¿Ya estaba hecho?»**. Si dices que sí, lo que lleva su ficha va a **merma** como «Cambio
  del cliente». La cocina lo ve en naranja, «CAMBIO · 1 Croquetas → 1 Bravas», y suena.
- **Los minutos de «¿Cuenta?»** se cambian en el mismo sitio (15 de fábrica).

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

   **Tiene que decir** que aplica la `0103_servido_y_cambiar_un_plato` y acabar sin error.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde. **Primero migrar, luego desplegar**: al revés, la API pediría columnas que aún no
   existen.

## Lo que te toca · probarlo en IKATZ

1. **En la caja**: Ajustes del TPV › **Cocina y barra** → abajo, **La sala** → enciende «Los camareros
   también marcan lo servido».
2. **Con el móvil**, manda a cocina dos platos del 1.º. Toca la mesa: abajo tiene que salir
   **Servido**. Tócalo, marca uno y pulsa «Marcar 1 servido».
   - **En la pantalla de cocina tiene que salir** la franja verde con tu nombre y «Deshacer».
3. **Cambiar**: en la mesa, toca el otro plato → **Cambiar** → elige otro.
   - **Tiene que preguntar** «¿Ya estaba hecho?». Contesta «No, aún no».
   - **En cocina**: franja naranja «CAMBIO» y el de antes tachado con una flecha al nuevo. Suena.
   - En la cuenta, el nuevo dice «En lugar de …», y el total cambia.
4. Si contestas «Sí, ya estaba» con un plato que tenga ficha: en la app, **Almacén › Mermas**, tiene
   que salir con el motivo «Cambio del cliente».
