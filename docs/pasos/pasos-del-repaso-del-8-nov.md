# Pasos del repaso del 8-nov · R1 · El TPV y el Panel

> ## Cómo está
>
> | Qué              | Cómo está                                                                                |
> | ---------------- | ---------------------------------------------------------------------------------------- |
> | El pull request  | «El repaso del 8-nov · R1 · El TPV y el Panel», **abierto**, sin fusionar                |
> | La base de datos | **No hay que migrar**: sigue en 113                                                      |
> | La API           | **Hay que desplegarla**: sigue en 128 consultas y 358 comandos; cambia un texto de Fogón |
> | La caja          | **No hay caja nueva**                                                                    |
>
> Lo decidido, en la [0143](../decisiones/0143-el-repaso-del-8-nov.md); lo que se ve, en
> [la maqueta](../maquetas/el-repaso-del-8-nov.html). R2 (Carta, Escandallos, Menús y objetivos) y R3 (la caja) van
> detrás, cada una con su pull request a `main`.

---

## Lo que cambia para ti

- **Estook TPV, al vincular con el correo**: sale **«Continuar con Google»**. No salía nunca.
- **Estook TPV, el tema**: el engranaje sale en todos los aparatos, también en el comandero. Dentro, **Tu sesión**:
  **Cambiar de persona** (vuelve al PIN), **Tema** (Claro, Oscuro o Auto, de cada aparato) y, en la caja,
  **Desvincular este aparato**.
- **Estook TPV, los platos**: la foto arriba y grande; sin foto, el icono de su sección sobre su color. «Lo
  elegido» (el pase, la zona) va ahora en blanco sobre oscuro y al revés en claro.
- **Ajustes del TPV**: letra y filas más grandes.
- **«Principales» y «Segundos»** salen en morado con los cubiertos, no en gris.
- **El Panel**: **Equipo ahora** y **Caduca pronto** en filas de una línea. Quien lleva días dentro dice
  «13 días · ¿olvidó salir?» en vez de «333 h 19 min».
- **Textos**: «Importar tu carta» en vez de «Leer tu carta»; Menús pregunta «¿Sirves menú del día?»; Empleados y
  «Estook TPV» en Ajustes, sin repetir lo que ya sabes.

## Lo que te toca · fusionar y desplegar

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

## Qué mirar

1. **En el TPV**, sin vincular (otro navegador o ventana privada): **Entrar con mi correo** → debajo de «Entrar»,
   **Continuar con Google**.
2. **En la caja**: el engranaje → **Tu sesión** → **Tema** → **Claro**. Todo el TPV pasa a claro; **Auto** sigue
   al aparato.
3. **En el comandero**: también sale el engranaje, con **Cambiar de persona** y **Tema**.
4. **Una mesa**: los platos con foto la llevan arriba; los demás, el icono de su sección en su color.
5. **En Estook, el Panel en el móvil**: **Equipo ahora** y **Caduca pronto**, sin huecos.
