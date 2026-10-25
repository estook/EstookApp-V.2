# Pasos de T3 · 2 · 1 · Las opciones

> ## Cómo está
>
> Escrito el 25 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                  |
> | ---------------- | -------------------------------------------------------------------------- |
> | Pull requests    | **«T3 · 2 · 1 · Las opciones» (#138)**, abierta (rama `t3-2-las-opciones`) |
> | La base de datos | **87 de 87** en producción; esta trae **la 0088**                          |
> | La API           | 110 consultas y 283 comandos; con esta, **111 y 289**                      |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **Cada plato puede preguntar cosas al pedirlo**: la guarnición, los extras, el «¿Con qué?» de una
  copa. Los grupos se montan una vez y se ponen en los platos que quieras, y **cada opción gasta lo suyo
  del almacén** («doble de queso», 30 g de queso). Sin contestar lo obligatorio, no se pide.
- **Lo que se vende a peso** (el jamón, el pescado del día) pide lo que pesa, y **el precio de un plato
  se cambia desde el TPV**: es el de tu carta.

Lo que se decidió, en la [0113](decisiones/0113-t3-2-1-las-opciones.md). Lo siguiente, T3 · 2 · 2: «Monta
tus bebidas», con las copas y los cafés.

## Lo que te toca · fusionar, migrar y desplegar

**En este orden: primero migrar, después desplegar.** La API nueva necesita la 0088.

1. **En GitHub**: abre el pull request **«T3 · 2 · 1 · Las opciones» (#138)** y, con las **tres comprobaciones
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

   Tiene que decir que aplica **la 0088** y que hay **88 en total**.

3. **En GitHub**, **después de fusionar y de migrar**: **Actions** → **Desplegar la API** → **Run
   workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **111 consultas y 289 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

En **la caja**, Inicio › Ajustes del TPV › **Productos**:

1. **La guarnición.** Toca el botón de una hamburguesa (o de un plato que lleve guarnición) → en
   «Opciones al pedirlo», **+ Grupo nuevo** → nombre «Guarnición», **Obligatoria, una**, opciones
   «Patatas» y «Ensalada» → **Guardar**.
   - **Qué debe salir:** de vuelta en la hoja del plato, «Guarnición» encendida, con «obligatoria, una ·
     Patatas, Ensalada».
2. **Un extra que gasta.** En el mismo plato, **+ Grupo nuevo** → «Extras», **Opcional, varias**, hasta
   3 → una opción «Doble de queso», suma 1,00 €, «¿Qué gasta del almacén?» **Añade algo del almacén** →
   tu queso, 30 g → **Guardar**.
3. **A peso.** Toca el botón del jamón (o del pescado del día) → **Se vende a peso**. El precio pasa a
   decir «Precio del kilo».
4. **Un precio.** En la hoja de cualquier plato, cambia el precio → **Guardar el precio**. En **Estook ›
   Carta** sale el nuevo.
5. **Pedir.** En una mesa:
   - Toca la hamburguesa: sale **«Guarnición · obligatoria, una»** y los extras. **«Añadir» no se
     enciende hasta elegir la guarnición**. Elige Patatas y Doble de queso → **Añadir · …**.
   - **Qué debe salir:** en la cuenta, la hamburguesa con «Patatas · Doble de queso» debajo, y el precio
     con el euro del queso.
   - Toca el jamón: **«¿Cuánto pesa?»**, escribe 120 → **Añadir · …** con el precio de esos gramos. En la
     cuenta, «120 g».
6. **El «¿Con qué?» de un toque.** Si pones a un plato **un solo grupo obligatorio de una** (por ejemplo,
   «¿Con qué?» con Coca-Cola y Tónica), al pedirlo **un toque en la opción ya lo apunta**. Las copas de
   verdad, con su botella y su refresco del almacén, llegan con «Monta tus bebidas».

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **«Monta tus bebidas»**, la caña, la doble y la jarra, las copas y los cafés hechos: T3 · 2 · 2, lo
  siguiente.
- **Que el almacén descuente lo vendido en el TPV**, con lo que gasta cada opción: llega con el cobro
  (T7). Lo que gasta cada opción ya queda guardado en cada línea para entonces.
- **La balanza conectada**: con Estook Link (T5). Hasta entonces, el peso se escribe.
