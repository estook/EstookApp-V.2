# Pasos del repaso del 8-nov · R2 · 2 · Escandallos, Menús y objetivos

> ## Cómo está
>
> | Qué              | Cómo está                                                                                  |
> | ---------------- | ------------------------------------------------------------------------------------------ |
> | El pull request  | «El repaso del 8-nov · R2 · 2 · Escandallos, Menús y objetivos», **abierto**, sin fusionar |
> | La base de datos | **Hay que migrar**: pasa de 114 a **115** (los objetivos por semana o mes)                 |
> | La API           | **Hay que desplegarla, después de migrar**: sigue en 128 consultas y 358 comandos          |
> | La caja          | **No hay caja nueva**                                                                      |
>
> Lo decidido, en la [0143](decisiones/0143-el-repaso-del-8-nov.md) (sección 6). Con esto, R2 queda entera; falta R3
> (la caja).

---

## Lo que cambia para ti

- **Servicio › Empleados › Objetivos**: **Semana** o **Mes** y una cifra en euros para todos; en **Por empleado**, una
  distinta para quien haga falta. **Los objetivos en € por hora que hubiera se borran**: hay que poner los nuevos.
  Cada barra sale **verde si va por delante** de lo que toca a estas alturas y ámbar si va por detrás.
- **Escandallos › Carta**: arriba el food cost medio con su anillo; debajo, los platos **de peor a mejor**, cada uno
  con su anillo de color.
- **Carta › Menús**: cada día dice con un punto si tiene menú; «Copiar la semana pasada» y «Otro menú», en «⋯».
- **El botón de Fogón**: un solo aro, Fogón centrado y entero.

## Lo que te toca · fusionar, migrar y desplegar

**Las fotos de referencia ya no paran el pull request** (desde el 9-nov). Cuando lo único en rojo son fotos de
pantallas que cambian a propósito, como el botón de Fogón, GitHub las sube solo en un commit aparte, «Las fotos de
referencia, rehechas por la integración continua», y vuelve a probar: en unos minutos sale en verde sin que nadie
haga nada. Si sale en rojo otra cosa, pásame una foto.

1. **En GitHub**: cuando el pull request esté **en verde**, **Merge pull request** → **Confirm merge**.
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

   Tiene que acabar diciendo que la base está en la **115**.

3. **En GitHub**, después de migrar: pestaña **Actions** → **Desplegar la API** → **Run workflow** → escribe
   `desplegar` → **Run workflow**, y espera a que salga en verde.

## Qué mirar

1. **Servicio › Empleados › Objetivos**: Mes → 4.000 € → **Guardar**. La lista dice cuánto lleva cada uno de lo suyo.
2. **Escandallos › Carta**: el anillo de arriba y los platos de peor a mejor.
3. **Carta › Menús**: los puntos de cada día y «⋯».
4. **El botón de abajo a la derecha**, en el móvil, en claro y en oscuro.
