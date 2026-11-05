# Pasos de R2 · 1 · La sala y la mesa

> ## Cómo está
>
> | Qué              | Cómo está                                                              |
> | ---------------- | ---------------------------------------------------------------------- |
> | El pull request  | «R2 · 1 · La sala y la mesa»                                           |
> | La base de datos | **Sin migración**: sigue en **102 de 102**                             |
> | La API           | Falta desplegarla (el plano dice cómo va cada mesa). Sigue con 119/334 |
> | La caja          | **No hay caja nueva**: la caja para Windows carga Estook TPV de la web |
>
> Lo decidido, en la [0131](decisiones/0131-r2-1-la-sala-y-la-mesa.md).

---

## Lo que cambia para ti

- **Cada mesa dice la verdad**: al mandar, **«Esperando»** con los minutos desde que la cocina lo
  recibió, en azul, ámbar o rojo como en la pantalla de cocina; cuando sale todo, **«Comiendo»**
  («Bebiendo» si solo pidieron bebida); y a los 15 minutos de lo último, **«¿Cuenta?»** en morado, con
  una franja arriba, «Para cobrar».
- **Al tocar una mesa** sale la mesa entera: sus platos, el total y abajo **Pedir, Cuenta y Cobrar**
  (Cobrar, apagado hasta que se cobre con Estook TPV). Arriba, tres iconos: **mover** (cambiar, juntar,
  pasar), **la nota para cocina** y **«···»** con lo demás.
- **Dentro de la mesa**, los mismos tres iconos en vez de «Opciones», y abajo **«La cuenta · 9
  platos»**.
- **Arriba en el móvil**, dos filas en vez de cuatro: tu nombre con el candado para bloquear, y debajo
  las salas con **«Mías»**.
- **Todavía no**: el botón «Servido» del camarero y cambiar un plato (R2 · 2), y los iconos de colores
  de las secciones (R3).

## Lo que te toca · fusionar y desplegar

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

   **No hay que migrar**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde. **Hasta que la despliegues, el plano se ve como antes** (sin «Esperando» ni
   «¿Cuenta?»); lo demás ya se ve.

## Lo que te toca · probarlo en IKATZ, con el móvil

1. **En el plano**, abre una mesa y manda algo de cocina.
   - **Tiene que** decir **«Esperando»** y, debajo, los minutos en azul. Con la pantalla de cocina,
     a los minutos de Ajustes › Cocina y barra se pone ámbar, y luego rojo.
2. **En la cocina, tacha lo que has mandado.**
   - La mesa **tiene que** pasar a **«Comiendo»**. A los 15 minutos, a **«¿Cuenta?»** en morado, con
     «Para cobrar» arriba.
3. **Toca la mesa.**
   - **Tienen que** verse sus platos, el total, y abajo **Pedir, Cuenta y Cobrar**.
   - Toca el icono de las flechas: **Cambiar de mesa, Juntar y Pasar a otro camarero**.
   - Toca «···»: lo demás, con **Anular** al final y en rojo.
4. **Pedir**: dentro de la mesa, arriba los mismos tres iconos y abajo «La cuenta · N platos».
5. **Arriba del plano**: tus iniciales con el candado (bloquea) y «Mías» (solo las tuyas).

**Si tu cocina trabaja solo en papel**, nadie tacha: la mesa se queda «Esperando» en azul hasta R2 · 2,
que trae el botón «Servido» para el camarero.
