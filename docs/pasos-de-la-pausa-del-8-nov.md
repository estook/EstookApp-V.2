# Pasos de la pausa del 8-nov · P1 · Lo del alta y Ajustes

> ## Cómo está
>
> | Qué              | Cómo está                                                                     |
> | ---------------- | ----------------------------------------------------------------------------- |
> | El pull request  | «La pausa del 8-nov · P1 · Lo del alta y Ajustes»                             |
> | La base de datos | **No hay que migrar**: sigue en 111                                           |
> | La API           | **Hay que desplegarla**: 125 consultas y **357 comandos** (tres nuevos)       |
> | Google           | **Hecho por Richi el 8-nov**: las dos direcciones del TPV, apuntadas (paso 4) |
> | La caja          | **No hay caja nueva**                                                         |
>
> Lo decidido, en la [0142](decisiones/0142-la-pausa-del-8-nov.md); lo que se ve, en
> [la maqueta](maquetas/la-pausa-del-8-nov.html). P2 (Información e Informes) y P3 (Empleados) van detrás.

---

## Lo que cambia para ti

- **Almacén › Movimientos**: la semana, en botones. Y en **Consumo**, el food cost por semana, mes o trimestre,
  con flechas para ir atrás.
- **La letra, «Automática»**: más pequeña en el móvil, normal en la tablet y el ordenador. Quien ya eligió una,
  la conserva.
- **Ajustes › Tu local › Datos del local**: el nombre, la calle y el teléfono del local, por fin editables, y
  **Ajustes › Organización › Nombre del negocio**.
- **Al crear una cuenta**: «¿Cuántos locales tienes?» antes de pagar; «Busca tu local en Google» rellena la
  dirección; y ya no se pregunta la hora de cierre.
- **Con Pro**: nada de «¿Cómo entran tus ventas?». Al acabar el alta y en Ajustes › Conexiones, «Tus ventas entran
  solas con Estook TPV», con la descarga para Windows y **«Vincular un aparato»**. **El cierre a mano sigue** hasta
  que el TPV cobre (T7).
- **Estook TPV**: «Continuar con Google» debajo de «Entrar». En la caja para Windows, Google no deja: el código se
  saca en el móvil, en Ajustes › Conexiones › «Vincular un aparato».

## Lo que te toca · fusionar, desplegar y Google

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

3. **En GitHub**: pestaña **Actions** → **Desplegar la API** → **Run workflow** → **Run workflow**, y espera a que
   salga en verde.
4. **Ya hecho por ti el 8-nov.** Para saber dónde está: **en Google Cloud** (console.cloud.google.com), con la cuenta de Estook: **APIs y servicios** → **Credenciales**
   → el cliente de OAuth de Estook (el de «Continuar con Google») → **URI de redireccionamiento autorizados** →
   **Añadir URI**, y añade estas dos, tal cual, con la barra del final:

   ```text
   https://estook.com/tpv/
   ```

   ```text
   https://www.estook.com/tpv/
   ```

   **Guardar**. **Tiene que salir** la lista con las de `/app/` de siempre y estas dos nuevas. Google tarda unos
   minutos en aplicarlo.

5. **Recarga** la pestaña de Estook.

## Lo que hay que probar

1. **Crear una cuenta nueva de prueba** (como Giulietta): en «Elige tu plan», sube los locales a 3 con el **+**.
   **Tiene que salir** Cadena en vez de Pro, y el precio por tres. Con la casa no se cobra: basta con verlo.
2. **En el alta, «¿Dónde está tu restaurante?»**: escribe el nombre de un bar que conozcas y su ciudad, y toca
   «Es este». **Tienen que rellenarse** la calle, el código postal, la población, la provincia y el teléfono, y
   debajo, «Tu día en Estook acaba a las 05:00».
3. **Al acabar el alta, con Pro**: **tiene que salir** «Tus ventas entran solas con Estook TPV», sin «Lo apunto yo».
4. **En IKATZ, Ajustes › Tu local › Datos del local**: cambia el teléfono y guarda. Vuelve a entrar: **tiene que
   seguir** el nuevo. En **Ajustes › Organización**, cambia el nombre del negocio y mira que sale arriba.
5. **En Ajustes › Conexiones › «Vincular un aparato»**: elige «Comandero», «Sacar el código», y escríbelo en
   Estook TPV desde otro móvil, en «Tengo un código». **Tiene que vincularse** con ese nombre.
6. **En Estook TPV, desde el navegador** (no la caja para Windows), «Vincular este aparato» → «Entrar con mi
   correo» → **«Continuar con Google»** con la cuenta de Google con la que entras en Estook. **Tiene que llevarte**
   a elegir el local y qué es el aparato. Si dice que Google no deja, es que falta el paso 4.
7. **En el móvil**, mira el Panel: los números grandes, **más pequeños que antes**.
8. **Almacén › Movimientos**: toca «Semana». Y en **Consumo**, «Semana» y la flecha de la izquierda.

## Si algo falla

- **«Continuar con Google» dice que la dirección no está permitida**: falta el paso 4, o Google aún no lo ha aplicado
  (espera diez minutos).
- **No sale «Busca tu local en Google»** en el alta: el servidor no tiene la clave de Google, o se acabó el tope del
  mes de ese local. Se escribe a mano, como antes.
