# Pasos de T2 · La sala

> ## Cómo está
>
> Escrito el 25 de octubre de 2026, en su pull request, **sin fusionar**. «El PIN y la contraseña»
> (#134) ya está en `main`, **pero sin migrar su 0084 y sin desplegar la API** (leído el 25-oct).
>
> | Qué              | Cómo está                                                                              |
> | ---------------- | -------------------------------------------------------------------------------------- |
> | Pull requests    | **«T2 · La sala» (#135)**, abierta (rama `t2-la-sala`)                                 |
> | La base de datos | **83** en producción; faltan **la 0084** (del #134) y **la 0085** (de esta)            |
> | La API           | La de T1 (109 y 261); con el #134, 109 y 265; con T2, **109 consultas y 271 comandos** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de
antes, en [`pasos-del-pin-y-la-contrasena.md`](pasos-del-pin-y-la-contrasena.md).

---

## Lo que cambia para ti, en dos frases

- **La sala se dibuja en Estook TPV**, en la caja o en la tablet, **a ojo**: sin un número. «Tu
  sala» ya no está en Estook › Ajustes; lo que dibujaste allí sale igual en el TPV.
- **Todas las mesas a la vista de todos**, con las iniciales de su camarero, y **se pide con los
  pases en pestañas** encima de la cuenta (Bebidas · 1.º · 2.º · 3.º · Postre).

Lo hecho y por qué, en la [0110](decisiones/0110-t2-la-sala.md) (mira la sección 2, «Lo que decidí
al construirlo»).

## Lo que te toca · fusionar, migrar y desplegar

**Primero, lo que falta del #134**: `git checkout main`, `git pull`, `.\estook.cmd bd:migrar` (la 0084) y desplegar la API ([sus pasos](pasos-del-pin-y-la-contrasena.md), del 2 al 4). Si no lo has
hecho cuando fusiones esta, no pasa nada: el `bd:migrar` de abajo aplica **las dos**, la 0084 y la 0085. Después, esta, **en este orden y seguido**:

1. **En GitHub**: abre el pull request **«T2 · La sala» (#135)** y, con las **tres comprobaciones en
   verde**, **Merge pull request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0085** (o la 0084 y la 0085) y que hay **85 en total**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **109 consultas y 271 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

En **la caja** (un ordenador o una tablet; en el móvil no se dibuja):

1. **Dibuja la sala.** En las mesas, arriba, **Editar sala** (o Ajustes del TPV › **La sala**). Si
   no tienes sala, **Plantillas** → «Restaurante de 12 mesas» o «Terraza de 8». Si ya tenías una de
   Estook, sale tal cual.
   - **Mueve una mesa** arrastrándola: se pega sola en fila con las demás (verás una línea naranja).
   - **Toca una mesa** y, a la derecha, cambia sus **plazas a 6**: crece sola. Prueba **Rectangular**.
   - **Tira de un punto de una esquina** para estirarla, y **del redondo de arriba** para girarla: se
     queda sola en 0°, 45° y 90°.
   - En la paleta de la izquierda, **toca «Barra»** y **«Pared»**: salen en un hueco; arrástralas a
     su sitio y estíralas.
   - **Deshacer** devuelve lo último. **Duplicar** pone la mesa de al lado con el número siguiente.
   - **Qué debe salir:** «✓ Guardado» arriba, siempre; y **ningún número de centímetros** en ninguna
     parte. Toca **Listo**.
2. **El plano en el móvil.** En el móvil de un camarero (su comandero), las mismas mesas **de tres
   en fila**, en el orden de sus números. Lo que muevas en la caja se ve en el móvil **en un par de
   segundos**.
3. **Todas · Mías.** Abre una mesa en la caja y otra en el móvil del camarero. En las dos se ven las
   dos mesas, cada una con las **iniciales de su camarero**. **Mías** enseña solo las tuyas; el móvil
   del camarero empieza en «Mías».
4. **Quedármela.** Toca la mesa del camarero → **Quedármela**: pasa a ser tuya, con tus iniciales.
5. **Pedir con los pases.** Abre una mesa para 2. Arriba de la cuenta, **Bebidas** marcada: pide una
   caña. Toca la página **Entrantes**: se marca sola el **1.º**; pide unas croquetas. Toca
   **Principales**: se marca el **2.º**; pide un principal. **Mandar**.
   - **Qué debe salir:** «Mandado: a cocina 2 y a la barra 1 · sale el 1.º, el 2.º espera», y la
     pestaña del 2.º dice «en espera».
6. **Una mesa abierta se mueve, pero no se quita.** En **Editar sala**, mueve la mesa abierta: su
   cuenta sigue igual. **Quitar** sale apagado: «Está abierta».

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **La botonera** (qué se vende en el TPV y en qué botón, «Lo más pedido», los extras): T3. Hasta
  entonces, la carta sale **una página por sección**.
- **La pantalla de cocina y la de barra**: T4. **Imprimir y el cajón**: T5. **Cobrar y la caja**: T7.
- **Las reservas** no están en ningún módulo todavía.
