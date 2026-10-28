# Pasos de «Estook TPV es de Pro»

> ## Cómo está
>
> **En su pull request, sin fusionar** (28 de octubre de 2026). Trae **la migración 0094** y cambia
> la API, así que van **fusionar, migrar y desplegar**. **Antes**, fusiona «Los documentos en orden»
> (#150): esta va encima.
>
> | Qué              | Cómo está                                                      |
> | ---------------- | -------------------------------------------------------------- |
> | Pull request     | **«Estook TPV es de Pro»**, rama `estook-tpv-es-de-pro`        |
> | La base de datos | **93** en producción; esta trae **la 0094**                    |
> | La API           | Sigue en **115 consultas y 312 comandos**; cambia lo de dentro |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que cambia para ti, en dos frases

- **En Ajustes de Estook, arriba, el botón «Estook TPV»**, oscuro y con el borde naranja. Con Pro
  abre Estook TPV o descarga el programa de Windows; con Esencial sale con «PRO» y explica qué gana
  el local pasando a Pro.
- **Estook TPV es solo de Pro (y de Cadena)**, y lo cierra la API: un local en Esencial no vincula
  aparatos ni entra. Si un local deja Pro, sus aparatos esperan sin borrar nada.

Lo decidido, en la [0120](decisiones/0120-estook-tpv-es-de-pro.md).

## Lo que te toca · fusionar, migrar y desplegar

**En este orden.** La API nueva necesita la 0094.

1. **En GitHub**: fusiona antes **«Los documentos en orden» (#150)**, y después **«Estook TPV es de
   Pro»**. Cada una, con las comprobaciones **en verde**: **Merge pull request** → **Confirm merge**.
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

   Tiene que decir que aplica **la 0094** y que hay **94 en total**.

3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **En PowerShell**:

   ```powershell
   .\estook.cmd bd:comprobar-api
   ```

   Todo en verde, con **115 consultas y 312 comandos**.

**Si algo falla:** dime en qué paso y qué sale. No hace falta deshacer nada.

## Probarlo

1. **En IKATZ, en el ordenador**: Ajustes. Arriba, **«Estook TPV»** en oscuro con el borde naranja.
   Tócalo.
   - **Qué debe salir:** una hoja con **«Abrir Estook TPV»** y **«Descargar para Windows»**.
2. **En IKATZ, en el móvil**: Ajustes › **«Estook TPV»**.
   - **Qué debe salir:** se abre Estook TPV directamente.
3. **Con una cuenta en Esencial** (Pizzeriacazzo, o una de prueba): Ajustes.
   - **Qué debe salir:** el botón en gris con **«PRO»**. Al tocarlo, **«Actualiza a Pro para cobrar
     con nuestro TPV»**, lo que gana, el precio y **«Pasar a Pro»**.
