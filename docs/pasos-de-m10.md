# Pasos de M10

> ## Cómo está
>
> Leído el 22 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                                  |
> | ---------------- | ---------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **#125, #126 y #127 fusionadas**: M10 está entero. Lo siguiente, en [`pasos-de-m16a.md`](pasos-de-m16a.md) |
> | La base de datos | **79 de 79** migraciones: la 0079 (los menús y lo de tu zona), migrada                                     |
> | La API           | **Desplegada** con M10 · 2: 101 consultas y 229 comandos                                                   |
>
> Lo de abajo se queda para **probarlo en el iPhone** si no lo has hecho: los pasos 1 a 3 ya
> están hechos.

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de antes, en [`pasos-de-la-auditoria-del-20-oct.md`](pasos-de-la-auditoria-del-20-oct.md).

---

## Lo que te toca ahora · M10 · 2

Lo hecho y por qué, en la [0104](decisiones/0104-m10-2-los-menus-y-tu-zona.md); el plan de M10, en [`m10-la-carta-menus-y-analisis.md`](m10-la-carta-menus-y-analisis.md). **Con migración (0079) y con la API.**

1. **En GitHub**: abre el pull request **#127 «M10 · 2 · Los menús y «Analiza mi zona»»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y `.\estook.cmd bd:migrar`. Tiene que decir que aplica **la 0079** y que hay **79 en total**.
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **Probarlo en tu iPhone, en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la versión nueva). En IKATZ los menús ya están encendidos:
   - **El menú del día**: Carta → **Menús**. Sale la semana, con hoy marcado. **Ajustes** → pon el precio (13,50) y mira «¿Entra pan? ¿café? ¿postre?».
   - **Añadir platos**: en Primeros, **Añadir plato** → **Plato nuevo** → «Lentejas». Sale con «Solo del menú»: no está en tu carta. En Segundos, **Añadir plato** → **De tu carta** → un plato. Tócalo y ponle un **suplemento** (2 €).
   - **Un día que no tocas repite el anterior**: toca el día de mañana. Dice «Repite el…» y lleva lo mismo. Cambia algo ese día: el de hoy no se mueve.
   - **Lo que te deja**: debajo, si a algún plato le falta su escandallo, dice cuál; **Desgranar en Escandallos** te lleva a Escandallos → **Menús**, donde están para desgranarlos. Con los escandallos hechos, dice de cuánto a cuánto te deja cada menú.
   - **Descargar**: el botón abre cuatro cosas. **Cartel en A3** (para la puerta: imprímelo en una copistería en A3, o en A4 en casa), **PDF en A4**, **Por WhatsApp…** y **Imagen** para Instagram.
   - **El Panel de un camarero**: con la cuenta de un camarero nuevo, en el Panel sale **«Menú del día»** con el de hoy y su precio.
   - **Analiza mi zona**: Carta → Análisis → **Tu zona** → **Analiza mi zona**. Tarda un minuto: Fogón busca en internet. Saldrá cada plato tuyo comparado con los de alrededor, cada precio con su enlace. Gasta 25 créditos y se puede una vez cada 24 horas. Si dice que falta algo (la dirección del local, o que Fogón está apagado), lo dice con un enlace a donde se arregla.
   - **Apagarlo**: Ajustes → Tu local → Tu carta → **Tu local sirve menús**. Apagado, la pestaña Menús desaparece; enciéndelo otra vez para seguir.
5. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos minutos**.

**Si «Analiza mi zona» dice que Fogón no ha podido contestar:** entra en el admin → **Fogón** → **Probar la conexión**, y pásame lo que diga. Si fuera que el modelo no admite buscar en internet, no hay que hacer nada: lo pide solo a otro modelo.

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.

## Y una cosa arreglada de paso

En **Ajustes → Tu local → Tu carta → El QR de tu carta** había letras rotas desde el 8 de octubre («EnseÃ±a», «Escanea con la cÃ¡mara del mÃ³vil», también en el cartel del QR que se imprime). Ya está bien. **Si imprimiste ese cartel del QR, vuelve a imprimirlo.**
