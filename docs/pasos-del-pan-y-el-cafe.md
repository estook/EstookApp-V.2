# Pasos de «El pan, el agua y los cafés»

> ## Cómo está
>
> Escrito el 25 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                   |
> | ---------------- | --------------------------------------------------------------------------- |
> | Pull requests    | **«El pan, el agua y los cafés» (#137)**, abierta (rama `el-pan-y-el-cafe`) |
> | La base de datos | **86 de 86** en producción; esta trae **la 0087**                           |
> | La API           | **110 consultas y 283 comandos**, las mismas: no le añade ninguna           |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **El pan y el agua van en su página, «Pan y agua», la primera**, y los sirve el camarero. **Los
  cafés y las infusiones van en «Cafés», la última**, y los hace la barra. Da igual en qué sección los
  tengas en la carta: en el TPV van ahí, como en cualquier TPV.
- **En la mesa, «¿Pan para la mesa? · Pan para 4»**: un toque y pone un pan por comensal. **Nunca lo
  pone solo**, porque en España el pan no se puede cobrar si no se pide.

Lo que se miró y lo que se decidió, en la [0112](decisiones/0112-el-pan-y-el-cafe.md).

## Lo que te toca · fusionar, migrar y desplegar

1. **En GitHub**: abre el pull request **«El pan, el agua y los cafés» (#137)** y, con las **tres
   comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   Tiene que decir que aplica **la 0087** y que hay **87 en total**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **110 consultas y 283 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

En **la caja**:

1. **Las páginas de siempre.** Inicio › Ajustes del TPV › **Productos**.
   - **Qué debe salir:** **«Pan y agua»** la primera, con **Nadie** marcado y tu pan y tu agua dentro
     (aunque en la carta estuvieran en Entrantes o en Bebidas); y **«Cafés»** la última, con **Barra**
     y tus cafés e infusiones. Si en la carta ya tenías una sección «Cafés e infusiones», sigue igual.
   - Lo que se cocina **no se mueve**: el pan con tomate sigue en su sitio.
2. **Lo nuevo entra solo.** En Estook › Carta, añade «Cortado» a la sección Postres. En Productos, sale
   en **«Cafés»**, no en Postres.
3. **«Pan para 4».** Abre una mesa para 4.
   - **Qué debe salir:** encima de los productos, **«¿Pan para la mesa? · Pan para 4 · …»**. Tócalo:
     en la cuenta, **4 Pan**, y el botón se va. Una mesa recién abierta empieza en la página de las
     bebidas, no en la del pan.
   - Al **Mandar**, el pan no sale en la cocina: «… y 1 tal cual».

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **Mandar los cafés con el postre**: llega con T4, cuando la barra tenga su pantalla. Hasta entonces,
  el café se pide cuando la mesa lo pide.
- **Montar las bebidas** (las cañas, los vinos por copa, las copas con su refresco, los cafés con su
  leche): «Monta tus bebidas», en T3 · 2, que es lo siguiente.
