# Pasos del repaso del 8-nov · R2 · 1 · La carta y sus secciones

> ## Cómo está
>
> | Qué              | Cómo está                                                                            |
> | ---------------- | ------------------------------------------------------------------------------------ |
> | El pull request  | «El repaso del 8-nov · R2 · 1 · La carta y sus secciones», **abierto**, sin fusionar |
> | La base de datos | **Hay que migrar**: pasa de 113 a **114** (el color y el icono de cada sección)      |
> | La API           | **Hay que desplegarla, después de migrar**: sigue en 128 consultas y 358 comandos    |
> | La caja          | **No hay caja nueva**                                                                |
>
> Lo decidido, en la [0143](../decisiones/0143-el-repaso-del-8-nov.md) (secciones 4 y 5); lo que se ve, en
> [la maqueta](../maquetas/el-repaso-del-8-nov.html). R2 · 2 (Escandallos, Menús y objetivos) va detrás.

---

## Lo que cambia para ti

- **Estook › Carta**: arriba solo **«+ Plato»** y **«⋯»**, que lleva Importar tu carta, Nueva sección y Desde el
  almacén. Debajo, **un atajo a cada sección**.
- **Cada sección con su icono y su color, los mismos que en Estook TPV.** Se cambian en el lápiz de la sección o en
  Ajustes del TPV › Productos y precios, y cambian en los dos sitios.
- **Cada plato con su foto**; sin foto, el icono de su sección. Si ves costes, **su food cost debajo del precio**.
- **El botón de abajo a la derecha** lleva el dibujo de Fogón y se abre en **una ventana pequeña** con Fogón y Fichar.
  Los atajos, en la tarjeta «Atajos» del Panel (Editar › Añadir).
- **Las cabeceras**: sin «Carta / Carta» repetido, y sin pestañas cuando solo hay una.

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

   Tiene que acabar diciendo que la base está en la **114**.

3. **En GitHub**, después de migrar: pestaña **Actions** → **Desplegar la API** → **Run workflow** → escribe
   `desplegar` → **Run workflow**, y espera a que salga en verde.

## Qué mirar

1. **Estook › Carta, en el móvil**: «+ Plato», «⋯» y los atajos de cada sección; cada sección con su color.
2. **El lápiz de una sección** → otro color → **Guardar**. En el TPV, esa sección sale con el color nuevo.
3. **En el TPV**, Ajustes › Productos y precios › una sección › **Icono y color** → cámbialo. En Estook › Carta sale
   igual.
4. **El botón de Fogón**: se abre pequeño, con Fogón y Fichar; tocando fuera se cierra.
