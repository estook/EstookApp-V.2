# Pasos de la entrada de Estook TPV

> ## Cómo está
>
> **Fusionada** el 26 de octubre de 2026 a las 23:01 de Madrid (#145), y el sitio publicado. **Falta
> desplegar la API**, que solo cambia dónde se cae: la pantalla nueva ya va sola a la sala.
>
> | Qué              | Cómo está                                                                    |
> | ---------------- | ---------------------------------------------------------------------------- |
> | Pull requests    | **La entrada (#145)**, fusionada; **«El cambio de hora» (#146)**, una prueba |
> | La base de datos | **92 de 92** en producción; no hay migración                                 |
> | La API           | **113 consultas y 303 comandos**; desplegada a las 22:16, antes de la #145   |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **Se entra a la sala**: ya no hay inicio de baldosas. Arriba, **Fichar** en naranja y **el
  engranaje** (en la caja), y el plano **cabe entero** en la pantalla.
- **El engranaje** tiene los Ajustes del TPV en grupos, cada uno con su dibujo, su color y cómo está;
  «Editar sala» está dentro, en «La sala y las mesas». Y en la botonera, **mantener pulsado** un
  producto lo agota o lo pide con una nota.

Lo que se decidió, en la [0118](decisiones/0118-la-entrada-del-tpv.md).

## Lo que te toca · fusionar el arreglo y desplegar

**Esta vez no hay que migrar.** Se despliega la API para que diga a todos «a la sala».

1. **En GitHub**: la #145 ya está fusionada. Abre **«El cambio de hora» (#146)** (arregla la prueba
   de Ventas que puso en rojo la vuelta de `main`) y, con las comprobaciones en verde, **Merge pull
   request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **113 consultas y 303 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

Estook TPV se actualiza solo al fusionar (unos minutos). Si la caja sigue igual, cierra la app y
ábrela otra vez.

1. **Entrar en la caja** con tu PIN.
   - **Qué debe salir:** la sala, directamente. Arriba, Fichar en naranja, el engranaje y tu nombre con
     Bloquear. Ni «Editar sala» ni baldosas.
2. **Mirar el plano.**
   - **Qué debe salir:** el plano entero en la pantalla, sin tener que bajar.
3. **Tocar el engranaje.**
   - **Qué debe salir:** Hoy (Agotados), Lo que se vende (La sala y las mesas, Productos y precios,
     Cocina y barra), Lo que se conecta (Aparatos del local) y Seguridad (PIN y bloqueo), cada uno con
     su dibujo, su color y una línea de cómo está. **«La sala y las mesas»** abre el editor del plano.
4. **Mantener pulsado un producto** en una mesa (o el botón derecho, en el ordenador).
   - **Qué debe salir:** «⊘ Se ha agotado» y «✎ Con una nota para cocina». Agótalo: sale en gris en
     todos los aparatos. Mantenlo otra vez: «↺ Ya hay otra vez».
5. **En un comandero**, entra con tu PIN.
   - **Qué debe salir:** la sala, sin Fichar ni engranaje.

## Lo que no está todavía, para que no lo busques

- **La caja arriba** (abrir y cerrar), **las ventas de hoy** y **el datáfono**: con el cobro (T7).
- **Impresoras y cajón**: con Estook Link y la caja para Windows (T5).
