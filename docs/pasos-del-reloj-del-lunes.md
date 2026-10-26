# Pasos del reloj del lunes

> ## Cómo está
>
> Escrito el 26 de octubre de 2026, en su pull request, **sin fusionar**.
>
> | Qué              | Cómo está                                                      |
> | ---------------- | -------------------------------------------------------------- |
> | La base de datos | **90 de 90** en producción; esta trae **la 0091**              |
> | La API           | 113 consultas y 302 comandos, desplegada el 26-oct; no cambian |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que pasó, en dos frases

- **La madrugada del lunes 26, el reloj de Estook dio error cada hora desde la 01:07.** La
  revisión de noche de Fogón no veía la que ya había hecho, volvía a los mismos locales y chocaba
  con lo guardado. Ese choque, que tenía que quedarse aparte, tumbaba el latido entero.
- **No fue nada de lo que hiciste tú, ni de T4 · 1**: empezó antes de que migraras. El fallo era
  mío, y las pruebas no lo veían porque su base no se portaba como la de verdad. Ahora sí.

Lo que no salió esa noche: lo que se prepara cada hora para el móvil («entras en cinco minutos»)
y los correos que se reintentan; y la revisión de Fogón de esta semana se quedó en los dos
primeros locales. Lo del día (los correos de las cuentas y Stripe) sale a las 8, cuando ya no se
revisa.

## Lo que te toca · fusionar, migrar y desplegar

**En este orden: fusionar, después migrar, y al final desplegar.** La API nueva necesita la 0091.

1. **En GitHub**: abre **«El reloj del lunes»** y, con las comprobaciones en verde, **Merge pull
   request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0091** y que hay **91 en total**.

3. **En GitHub**, **después de fusionar y de migrar**: **Actions** → **Desplegar la API** → **Run
   workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**, **pasada la siguiente hora y 7** (el reloj late a y 7):

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **113 consultas y 302 comandos**, y en «El reloj», **«y ha latido en las
   dos últimas horas»** en verde.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Lo que no está todavía, para que no lo busques

- **La entrada nueva del TPV**: sus maquetas están en la rama `la-entrada-del-tpv`, esperando a
  que las mires. No se fusiona.
