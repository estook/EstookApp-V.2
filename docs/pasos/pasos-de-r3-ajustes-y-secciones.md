# Pasos de R3 · Ajustes y secciones

> ## Cómo está
>
> | Qué              | Cómo está                                                              |
> | ---------------- | ---------------------------------------------------------------------- |
> | El pull request  | «R3 · Ajustes y secciones»                                             |
> | La base de datos | **Hay que migrar**: pasa de 103 a **104** (la 0104)                    |
> | La API           | Hay que desplegarla **después de migrar**: sin órdenes nuevas, 119/336 |
> | La caja          | **No hay caja nueva**: la caja para Windows carga Estook TPV de la web |
>
> Lo decidido, en la [0133](../decisiones/0133-r3-ajustes-y-secciones.md).

---

## Lo que cambia para ti

- **Ajustes del TPV, en listas**: tres grupos (Lo que se vende, Lo que se conecta, Seguridad y
  Hacienda) con su título grande, dos columnas en la tablet y una en el móvil.
- **Productos y precios**: a la izquierda las secciones, a la derecha la que tocas. «Página» se llama
  ahora **«Sección»**.
- **Cada sección con su icono y su color**, que Estook pone solo por el nombre (Cervezas en naranja,
  Vinos en morado, Cafés en marrón…). Se cambian con **«Icono y color»**.
- **En el comandero**, las secciones son baldosas de su color con su icono, y cada producto lleva la
  franja de su sección.
- **«Lo más pedido» ya no sale si no marcas nada.** Para que salga: toca un producto y enciende «En
  Lo más pedido».

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

   **Tiene que decir** que aplica la `0104_icono_y_color_de_cada_seccion` y acabar sin error.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde. **Primero migrar, luego desplegar**: al revés, la API pediría la columna del icono
   antes de que exista.

## Lo que te toca · probarlo en IKATZ

1. **En la caja**, toca el engranaje. **Tiene que salir** en listas: «Lo que se vende», «Lo que se
   conecta» y «Seguridad y Hacienda», con cada fila diciendo cómo está.
2. Toca **Productos y precios**. A la izquierda, tus secciones **con su icono y su color**; a la
   derecha, la primera.
3. Toca una sección (por ejemplo, Cervezas) → **Icono y color** → elige otro color y otro icono →
   **Guardar**. La baldosa cambia en la lista y en el detalle.
4. Mira la fila **«Lo más pedido»**: tiene que decir «No sale: nada marcado» (si no habías marcado
   nada).
5. **En el móvil**, abre una mesa: las secciones son baldosas con su icono, y **no sale «Lo más
   pedido»**.
6. Vuelve a la caja, toca un producto → enciende **«En Lo más pedido»**. **En el móvil**, sal de la
   mesa y vuelve a entrar: ahora sale **«Lo más»** el primero, con ese producto.
