# Pasos de T3 · 1 · La botonera

> ## Cómo está
>
> Escrito el 25 de octubre de 2026, en su pull request, **sin fusionar**. Va **detrás de «T2 · La
> sala» (#135)**: se fusiona después.
>
> | Qué              | Cómo está                                                                           |
> | ---------------- | ----------------------------------------------------------------------------------- |
> | Pull requests    | **«T3 · 1 · La botonera»**, abierta (rama `t3-la-botonera`)                         |
> | La base de datos | **83** en producción; faltan la 0084 (#134), la 0085 (T2) y **la 0086** (de esta)   |
> | La API           | La de T1 (109 y 261); con T2, 109 y 271; con esta, **110 consultas y 283 comandos** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de
antes, en [`pasos-de-t2.md`](pasos-de-t2.md).

---

## Lo que cambia para ti, en dos frases

- **Lo que se vende en el TPV se monta en el TPV**: Ajustes del TPV › **Productos**. Tu carta ya
  está puesta, una página por sección, y cada página dice **quién lo prepara** (Cocina · Barra ·
  Nadie) y **en qué pase sale**. «Es de bebidas» ya no está en Estook › Carta.
- **Al pedir**, la primera página es **«Lo más pedido»** a esa hora, y cada cosa va sola a quien la
  prepara: la caña a la barra, las croquetas a cocina, el pan a ninguna parte.

Lo hecho y por qué, en la [0111](decisiones/0111-t3-1-la-botonera.md) (mira la sección 2, «Lo que
decidí al construirlo»). T3 va en dos: **esta es la 1**; la 2 trae las opciones y los extras,
«Monta tus bebidas» y lo que se vende a peso.

## Lo que te toca · fusionar, migrar y desplegar

**Primero T2** (sus pasos, en [`pasos-de-t2.md`](pasos-de-t2.md)). Después, esta, **en este orden y
seguido**:

1. **En GitHub**: abre el pull request **«T3 · 1 · La botonera»** y, con las **tres comprobaciones
   en verde**, **Merge pull request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0086** (y la 0084 y la 0085, si aún no las habías migrado) y
   que hay **86 en total**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **110 consultas y 283 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

En **la caja** (un ordenador o una tablet):

1. **Tu botonera, ya puesta.** Inicio › **Ajustes del TPV** › **Productos**. Arriba pone «Toda la
   carta»: una página por cada sección de tu carta, en su orden.
   - **Qué debe salir:** las de bebidas (Bebidas, Vinos, Cafés…) con **Barra** y **Bebidas**
     marcados; los entrantes con **Cocina** y **1.º**; los principales, **2.º**; los postres,
     **Postre**.
2. **El pan, de «Nadie».** Toca el botón del pan (o del agua) → en «¿Quién lo prepara?», **Nadie** →
   **Listo**. El botón dice «Pan · Nadie».
3. **Un producto nuevo.** **Nuevo producto** → nombre «Tortilla del día», precio 8 → Página
   «Entrantes» → **Crear el producto**.
   - **Qué debe salir:** el botón en Entrantes, y en **Estook › Carta**, la tortilla en Entrantes,
     **sin escandallo**.
4. **Lo nuevo entra solo.** En Estook › Carta, añade un plato a cualquier sección. Vuelve a
   Productos: **ya tiene su botón** en la página de su sección.
5. **Pedir.** En una mesa, pide una caña, el pan y la tortilla, y **Mandar**.
   - **Qué debe salir:** «Mandado: a cocina 1, a la barra 1 y 1 tal cual · sale el 1.º».
   - Después de unos cuantos servicios, la primera página es **«Lo más pedido»**: lo que más se pide
     a esa hora.

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **Las opciones y los extras** (el «¿Con qué?» de una copa, el extra de queso), **«Monta tus
  bebidas»**, **lo que se vende a peso** y **cambiar el precio desde el TPV**: T3 · 2.
- **La pantalla y la impresora de la barra**: T4. Hasta entonces, lo de la barra lo ve el camarero en
  la cuenta, como ahora.
- **Lo que cambias en la botonera** se ve al momento en esa caja, y en los demás aparatos **en un par
  de minutos** como mucho.
