# Pasos de T5 · 1 · Imprimir y el cajón

> ## Cómo está
>
> **En su pull request, sin fusionar** (27 de octubre de 2026). Trae la migración **0093** y órdenes
> nuevas de la API, así que van **fusionar, migrar, desplegar** y, al final, **publicar el programa**.
>
> | Qué              | Cómo está                                                           |
> | ---------------- | ------------------------------------------------------------------- |
> | Pull request     | **«T5 · 1 · Imprimir y el cajón»**, rama `t5-1-imprimir-y-el-cajon` |
> | La base de datos | **92** en producción; esta trae **la 0093**                         |
> | La API           | Pasa de 113 y 303 a **115 consultas y 312 comandos**                |
> | El programa      | **La caja para Windows 1.0.0**, por publicar                        |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **La caja para Windows**: un programa que se descarga en el PC de la caja, con Estook TPV dentro tal
  cual. **Imprime** la comanda de cocina y la de la barra (al mandar, al marchar, lo anulado y lo que
  vuelve), **la cuenta** antes de cobrar, y **abre el cajón** de prueba.
- En **Ajustes del TPV › Impresoras y cajón** se buscan las impresoras en la red, se prueban con
  «¿Ha salido?», se dice qué imprime cada una y **si lo de la cocina sale en pantalla, en papel o en
  las dos**. Si una se queda sin papel, la sala lo ve arriba.

Lo que se decidió, en la [0119](decisiones/0119-t5-la-caja-para-windows.md). **El ticket del cobro y
el cajón al cobrar llegan con T6 y T7**; **sin internet, con T5 · 2**.

## Lo que te toca · fusionar, migrar, desplegar y publicar

**En este orden.** La API nueva necesita la 0093, y el programa necesita la API nueva.

1. **En GitHub**: abre **«T5 · 1 · Imprimir y el cajón»**. Con las comprobaciones **en verde**,
   **Merge pull request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0093** y que hay **93 en total**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **115 consultas y 312 comandos**.

5. **En GitHub**: **Actions** → **La caja para Windows** → **Run workflow**, rama `main`, escribe
   **`publicar`**, y espera al **círculo verde** (unos 10 minutos: es una máquina con Windows). Sale
   en **Releases**, a la derecha de la página del repositorio, como «v1.0.0».

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en el restaurante de tu amigo

Primero crea su cuenta de prueba (su demo), y en su PC de la caja vincula Estook TPV como siempre.

1. **Antes de nada, mira el cable de la impresora.** ¿Va **del PC a la impresora directo**, o **los dos
   al router**? Lo bueno es **los dos al router, por cable**. Si va directo, dímelo: hay que darle al PC
   una dirección fija y te lo explico.
2. **En la caja del navegador**, en ese PC: sale arriba la franja **«Descarga la caja para Windows»**.
   Toca **Descargar** y abre el fichero.
   - **Qué debe salir:** la pantalla azul **«Windows protegió su PC»** (es porque aún no está firmado).
     Toca **«Más información»** y **«Ejecutar de todas formas»**. Se instala sola y se abre.
3. **En la caja del navegador**: ⚙ › **Aparatos** › la caja › **«Pasar a la app»**. Sale un código.
4. **En el programa**: dice **«Pasa aquí tu caja»**. Escribe el código.
   - **Qué debe salir:** el PIN, y al entrar, la sala de siempre. La caja del navegador dice «Este
     aparato ya no está vinculado»: es lo correcto, ya no hacen falta dos.
5. **En el programa**: ⚙ › **Impresoras y cajón** › **Buscar impresoras**.
   - **Qué debe salir:** la Epson, con su modelo. Toca **Imprimir prueba**: sale un papel que dice «Si
     lees esto, sale bien», con tildes y eñes. Toca **«Sí, ha salido»**, ponle nombre (Cocina o Caja),
     qué imprime, y si tiene el cajón enchufado. **Darla de alta.**
   - **Si no sale:** que esté encendida, con papel y con el cable de red; y si va directa al PC, el
     punto 1.
6. **Si tiene el cajón**: en la misma impresora, **«Abrir el cajón»**, con su motivo.
   - **Qué debe salir:** el cajón se abre.
7. **Abajo, «Lo de la cocina y la barra sale en…»**: la cocina, **Las dos** (como quiere tu amigo).
8. **Pide desde un móvil Android** (vinculado como comandero) una mesa con algo de cocina en el 1.º y
   en el 2.º, y **Mandar**.
   - **Qué debe salir:** **en menos de 6 segundos**, la comanda en papel: la mesa enorme, «1.º · YA» y
     «2.º · EN ESPERA». Y en la pantalla de cocina, como siempre.
9. **Marcha el 2.º** desde el móvil.
   - **Qué debe salir:** otro papel, **«¡MARCHA EL 2.º!»**.
10. **En las opciones de la mesa**: **«🧾 Imprimir la cuenta»**.
    - **Qué debe salir:** la precuenta, con el total y «Documento no válido como factura».
11. **Quita el papel de la impresora** y manda algo.
    - **Qué debe salir:** arriba de la sala, en rojo, **«Sin papel en Cocina»**, y la caja suena. Pon el
      papel: lo que esperaba sale solo, una vez.

## Lo que no está todavía, para que no lo busques

- **El ticket del cobro y el cajón al cobrar en efectivo**: con T6 y T7.
- **Seguir sin internet**: con T5 · 2.
- **Las impresoras por USB**: en una entrega siguiente, cuando un local la tenga (por red sí).
- **La firma del programa**: antes de vender, con la sociedad.
