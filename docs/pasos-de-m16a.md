# Pasos de M16a · La jornada

> ## Cómo está
>
> Leído el 22 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                 |
> | ---------------- | ----------------------------------------------------------------------------------------- |
> | Pull requests    | **#128 fusionada** (M16a · La jornada)                                                    |
> | La base de datos | **80 de 80** migraciones (la 0080, migrada)                                               |
> | La API           | **Desplegada** con M16a: 102 consultas y 230 comandos (comprobado con `bd:comprobar-api`) |
>
> **Los pasos 1 a 3 ya están hechos.** Queda el 4: probarlo en el iPhone.

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de
antes, en [`pasos-de-m10.md`](pasos-de-m10.md).

---

## Lo que te toca ahora · M16a

Lo hecho y por qué, en la [0105](decisiones/0105-m16a-la-jornada.md). **Con migración (0080) y
con la API.** Hazlo **en este orden y seguido**: entre fusionar y desplegar, la app nueva habla
unos minutos con la API de antes. No se rompe nada, pero «Reabrir» y «En marcha» no funcionan
hasta que despliegues.

1. **En GitHub**: abre el pull request **#128 «M16a · La jornada»** y, con las **tres
   comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y
   `.\estook.cmd bd:migrar`. Tiene que decir que aplica **la 0080** y que hay **80 en total**.
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe
   **`desplegar`**, y espera al **círculo verde**.
4. **Probarlo en tu iPhone, en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la
   versión nueva):
   - **En marcha**: entra en **Servicio**. Ahora se abre en **Jornada › En marcha**: arriba, «La
     jornada» con el día de hoy, **Abierta**, «Se abrió sola a las…» (tu hora de corte) y lo que le queda.
     Debajo, los mismos widgets de tu Panel: quién está dentro, agotados, menú de hoy, merma y lo
     que llega. Déjalo abierto un par de minutos: se pone al día solo.
   - **Cerrar el día**: pulsa **Cerrar el día**. Son **tres pasos**: **las ventas** (lo de
     siempre: el total, la tarjeta, los platos o la foto del Z) → **Siguiente** → **las mermas**
     (lo que se ha tirado hoy; puedes apuntar una) → **Siguiente** → **el repaso** (lo facturado,
     si el desglose no cuadra, si alguien sigue fichado y «queda a tu nombre») → **Cerrar el día**.
     Sale **«Día cerrado»**. Cuenta cuánto tardas: la meta del Plan es **menos de un minuto**.
   - **Reabrir**: en el día cerrado, pulsa **Reabrir**. Pide **por qué** (no deja sin escribirlo).
     Escribe algo, **Reabrir el día**, cambia el total y ciérralo otra vez. Debajo tiene que quedar
     «Reabierto por» tu nombre, el día, la hora y lo que escribiste.
   - **Ya no se corrige sin más**: un día cerrado no tiene «Corregir»: solo se cambia reabriéndolo.
5. **Este sábado, 24 de octubre, es la noche del cambio de hora** (a las 03:00 vuelven a ser las
   02:00). El sábado en «En marcha» tiene que decir **«Hoy dura 25 horas: esta noche se atrasa la
   hora»**, y lo que cierres o apuntes el domingo de madrugada, antes de tu hora de corte, cuenta
   en el sábado.
6. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos
   minutos**.

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.

## Lo que no está todavía, para que no lo busques

- **El paso del APPCC** del cierre: llega con M16b. Hoy son tres pasos.
- **Que al cerrar se descuente lo vendido del almacén** y Fogón analice el día: llega con M20,
  cuando haya ventas plato a plato (Estook TPV).
- **Cerrar con PIN desde una tablet del local**: cuando la tablet pueda cerrar (Estook TPV).
