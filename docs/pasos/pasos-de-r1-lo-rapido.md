# Pasos de R1 · Lo rápido

> ## Cómo está
>
> | Qué              | Cómo está                                                                    |
> | ---------------- | ---------------------------------------------------------------------------- |
> | El pull request  | «R1 · Lo rápido: tachar al momento, mandar de una vez, sin logo que vuelve…» |
> | La base de datos | **Sin migración**: sigue en **102 de 102**                                   |
> | La API           | Falta desplegarla (cambia `mandar_a_cocina`). Sigue con **119 y 334**        |
> | La caja          | **No hay caja nueva**: la caja para Windows carga Estook TPV de la web       |
>
> Lo decidido, en la [0130](../decisiones/0130-la-pausa-del-5-nov-r1-lo-rapido.md).

---

## Lo que cambia para ti

- **En cocina, el plato se tacha al tocarlo**, sin esperar. Si Estook no lo acepta, vuelve a su sitio
  y lo dice.
- **«Mandar» llega antes a cocina**: una sola orden en vez de dos.
- **El logo ya no vuelve de golpe** cuando hay versión nueva: la nueva entra la próxima vez que abras
  la app. **Lo que tarda el logo la primera vez** (esperar a que el servidor diga quién eres) no cambia
  todavía: dime si lo sigues notando largo.
- **La barra de arriba del iPhone (la del reloj) ya no es de cristal**: clara con el tema claro, negra
  con el oscuro; en Estook TPV, negra.

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

   **No hay que migrar**: esta vez no hay migración.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`. Espera al
   círculo verde. **Esto va antes de probar**: sin la API nueva, «Mandar» hace lo de antes.

## Lo que te toca · probarlo en IKATZ

### 1 · Tachar en cocina

1. En la tablet (o el aparato) de cocina, con una mesa en marcha, **toca un plato**.
   - **Tiene que** tacharse **al momento**, sin esperar.
2. Tócalo otra vez: **tiene que** destacharse al momento.
3. Tacha el último plato de una mesa: **tiene que** irse a «Acabados».

### 2 · Mandar desde el comandero

1. En el móvil, abre una mesa, pide dos platos y pulsa **Mandar**.
   - En la cocina **tiene que** llegar **antes que hasta ahora** (cuenta los segundos si puedes).
   - Abajo, en el móvil, **tiene que** decir «Mandado: a cocina 2…».

### 3 · Abrir Estook

1. Cierra la app del todo (desliza hacia arriba) y ábrela otra vez.
   - Fíjate en **cuántos segundos** dura el logo y dímelo.
2. Úsala unos minutos: **el logo no tiene que volver** de golpe.

### 4 · La barra de arriba del iPhone

1. Cierra **Estook** del todo y ábrela dos veces (la primera baja la versión nueva).
   - **Tiene que** verse la barra del reloj **lisa, sin cristal**, y lo de debajo nítido.
2. **Si sigue igual**, puede que el iPhone guarde la barra de cuando la instalaste. Prueba solo con
   **Estook** (no con Estook TPV, que habría que volver a vincular): mantén pulsado su icono →
   **Eliminar app** → **Eliminar de la pantalla de inicio**; abre **estook.com/app** en Safari →
   **Compartir** → **Añadir a pantalla de inicio**, y entra. Si así se arregla, haz lo mismo con
   Estook TPV cuando te venga bien (te pedirá vincular el aparato otra vez).
3. **Dime la versión de iOS**: Ajustes › General › Información › Versión de iOS.

Si la barra sigue igual, mándame una captura: el fallo de iOS 26 sigue abierto en Apple y miraríamos
otra salida.
