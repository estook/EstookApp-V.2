# Pasos de T5 · 1 · Imprimir y el cajón

> ## Cómo está
>
> **Fusionada, migrada y desplegada** el 27 de octubre de 2026 (comprobado: 93 migraciones y la API
> con 115 consultas y 312 comandos). **El programa, publicado el 28-oct** (completado a mano, lección
> 239); **falta el paso 5 una vez más**, con el flujo arreglado (lección 238), para que sea el de GitHub.
>
> | Qué              | Cómo está                                                      |
> | ---------------- | -------------------------------------------------------------- |
> | Pull request     | **«T5 · 1 · Imprimir y el cajón» (#148)**, fusionada el 27-oct |
> | La base de datos | **93 de 93**, con **la 0093**                                  |
> | La API           | **115 consultas y 312 comandos**, desplegada el 27-oct         |
> | El programa      | **La caja para Windows 1.0.0**, publicada (falta el paso 5)    |

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

1. **En GitHub**: abre **«T5 · 1 · Imprimir y el cajón» (#148)**. Con las comprobaciones **en verde**,
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

5. **En GitHub**, con **«Publicar la caja entera» (#152)** ya fusionada: **Actions** → **La caja para Windows**
   → **Run workflow**, rama `main`, y en la casilla escribe **`publicar`**: en minúsculas, sin
   espacios ni comillas. Espera al **círculo verde** (unos 10 minutos: es una máquina con Windows).
   - **Qué debe salir:** en **Releases**, a la derecha de la página del repositorio, «v1.0.0» con
     **tres ficheros**: `Estook-TPV-caja-para-Windows.exe`, su `.blockmap` y `latest.yml`. Sin
     `latest.yml`, el programa instalado no se actualiza solo.
   - **Si la casilla no dice exactamente `publicar`**, solo se construye: sale en verde y no publica
     nada. Vuelve a lanzarlo.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo en el restaurante de tu amigo

En [`pasos-en-el-local-del-amigo.md`](pasos-en-el-local-del-amigo.md), al día con su local (29-oct):
su TPV por wifi, la caja por cable y la cocina por wifi, **sin tocar nada suyo**.

## Lo que no está todavía, para que no lo busques

- **El ticket del cobro y el cajón al cobrar en efectivo**: con T6 y T7.
- **Que la cocina reciba sin internet**: con T5 · 2 · 2 (cada aparato ya sigue solo, T5 · 2 · 1).
- **Las impresoras por USB**: en una entrega siguiente, cuando un local la tenga (por red sí).
- **La firma del programa**: antes de vender, con la sociedad.
