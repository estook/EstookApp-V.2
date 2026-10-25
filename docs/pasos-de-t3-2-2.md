# Pasos de T3 · 2 · 2 · Monta tus bebidas

> ## Cómo está
>
> Escrito el 25 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                                                                                        |
> | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **«T3 · 2 · 1 · Las opciones» (#138)** y **«T3 · 2 · 2 · Monta tus bebidas» (#139)**, abiertas; la #139 va **encima** de la #138 |
> | La base de datos | **87 de 87** en producción; la #138 trae **la 0088** y esta, **la 0089**                                                         |
> | La API           | 110 consultas y 283 comandos; con las dos, **112 y 293**                                                                         |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **«Monta tus bebidas»** pone en el TPV, de una vez, lo que ya tienes en el almacén: **la caña, la
  doble y la jarra** del mismo barril, **la copa y la botella** de vino, los refrescos; **las copas**
  (el ron, la ginebra) con la dosis de la casa y su **«¿Con qué?»**; y **los cafés**, que ya vienen
  hechos. Cada una te dice **lo que te cuesta**, y tú solo pones el precio.
- **Una copa se pide en dos toques**: el Havana 7 y la Coca-Cola. Y cada bebida queda con su escandallo,
  para cuando el almacén descuente lo que se vende.

Lo que se decidió, en la [0114](decisiones/0114-t3-2-2-monta-tus-bebidas.md). Lo siguiente, T4 · Cocina
y barra.

## Lo que te toca · fusionar, migrar y desplegar

**En este orden: primero fusionar las dos, después migrar, y al final desplegar.** La API nueva necesita
la 0088 y la 0089. Así se migra y se despliega **una sola vez** para las dos.

1. **En GitHub**: abre **«T3 · 2 · 1 · Las opciones» (#138)** y, con las comprobaciones en verde,
   **Merge pull request** → **Confirm merge**.
2. **En GitHub**: abre **«T3 · 2 · 2 · Monta tus bebidas» (#139)**. Al fusionar la #138 se queda solo con
   lo suyo, sin tocar nada. Con las comprobaciones **en verde**, **Merge pull request** → **Confirm
   merge**.
3. **En PowerShell**, en la carpeta del proyecto, uno por uno:

   ```powershell
   git checkout main
   ```

   ```powershell
   git pull
   ```

   ```powershell
   .\estook.cmd bd:migrar
   ```

   Tiene que decir que aplica **la 0088 y la 0089** y que hay **89 en total**. Si ya habías migrado la
   0088 con la #138, aplica solo la 0089: también vale.

4. **En GitHub**, **después de fusionar y de migrar**: **Actions** → **Desplegar la API** → **Run
   workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
5. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **112 consultas y 293 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en IKATZ

En **la caja**, Inicio › Ajustes del TPV › **Productos** › **Monta tus bebidas**:

1. **Las bebidas.** En la pestaña **Bebidas** salen las de tu almacén, cada una con sus raciones ya
   propuestas (la cerveza de barril, «Caña 200 ml» y «Doble 330 ml» encendidas y «Jarra 500 ml»
   apagada) y **lo que te cuesta cada una**.
   - Pon el precio de cada una (o **«Mismo precio a todas»**, para los refrescos) → **Poner N en el TPV**.
   - **Qué debe salir:** «✓ N bebidas en el TPV», y en la sala, cada una en su página (Cervezas, Vinos,
     Refrescos; el agua, en «Pan y agua»).
   - Si vuelves a entrar, **«Solo lo que falta»** ya no las enseña: no se repiten.
2. **Las copas.** Pestaña **Copas** → elige **la dosis de la casa** (50 ml) → toca tus botellas (el
   Havana 7, la ginebra) y pon su precio. Debajo de cada una sale **lo que te deja sin IVA, sin el
   refresco**. En **«¿Con qué?»**, enciende los refrescos que sirves → **Poner N copas en el TPV**.
   - Si una botella no sale, **«+ Añadir botellas del almacén»**.
3. **Los cafés.** Pestaña **Cafés** → enciende los que sirves y pon su precio → **Poner N cafés en el
   TPV**.
   - **Qué debe salir:** cada café con **su coste**. Si tu almacén no tiene el café o la leche, dice
     «aproximado» y **qué falta**.
4. **Pedir.** En una mesa:
   - Toca **Cervezas › Caña**: va a la cuenta de un toque.
   - Toca **Copas › Havana 7**: sale **«¿Con qué?»**; toca **Coca-Cola** y ya está. En la cuenta, el
     Havana 7 con «Coca-Cola» debajo.
5. **Una que no está en el almacén.** En Bebidas, **«+ Una que no está en el almacén»** abre el producto
   nuevo del TPV: le pones nombre, precio y página.

**Si algo falla, o algo no te cuadra:** dime el número del paso, qué esperabas y qué ha salido
(mejor con una captura).

## Lo que no está todavía, para que no lo busques

- **Que el almacén descuente lo vendido en el TPV**: llega con el cobro (T7). Cada bebida ya tiene su
  escandallo para entonces.
- **Las bebidas del reparto con su precio propio**: cuando el reparto entre en el TPV.
- **La cocina y la barra en su pantalla, y las impresoras**: T4 · Cocina y barra, lo siguiente.
