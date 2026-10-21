# Pasos de M10

> ## Cómo está
>
> Leído el 21 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                      |
> | ---------------- | ---------------------------------------------------------------------------------------------- |
> | Pull requests    | **#125 fusionada** (M10 · 1). Abierta: **las respuestas de M10 · 2**, solo documentos          |
> | La base de datos | **78 de 78** migraciones: la 0078 (los agotados), migrada                                      |
> | La API           | **Desplegada** con M10 · 1: **98 consultas y 215 comandos**, comprobado con `bd:comprobar-api` |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de antes, en [`pasos-de-la-auditoria-del-20-oct.md`](pasos-de-la-auditoria-del-20-oct.md).

---

## Lo que te toca ahora · las respuestas de M10 · 2

Lo que contestaste, con tus palabras, y lo que propongo, en la [0103](decisiones/0103-las-respuestas-de-m10-2.md); el plan de M10 · 2, en [`m10-la-carta-menus-y-analisis.md`](m10-la-carta-menus-y-analisis.md). **Solo documentos: sin migración ni API.**

1. **En GitHub**: abre el pull request **«M10 · 2: las respuestas de Richi…»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main` y `git pull`. **No hay que migrar ni desplegar.**
3. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos minutos**.

## Y lo que necesito de ti · las dos preguntas que quedan

Explicadas, con mi recomendación, en [el plan de M10](m10-la-carta-menus-y-analisis.md), apartado «3 · Las dos preguntas que quedan». Me basta con «A1, B1» o lo que elijas:

- **A · ¿Cómo cambia el menú del día en IKATZ?** A1, cada día distinto (la pantalla es la semana) o A2, igual varios días (un solo menú).
- **B · ¿Cuántas veces se puede «Analizar mi zona»?** B1, buscar una vez a la semana y comparar cada día gratis, o B2, una vez al día.

Y si no estás de acuerdo con algo de «Lo que propongo» de la [0103](decisiones/0103-las-respuestas-de-m10-2.md), dímelo antes de que lo construya.

## Si no lo has probado · M10 · 1, ya en producción

En tu iPhone, en IKATZ (cierra la app y ábrela dos veces, que la primera trae la versión nueva):

- **Un agotado**: Carta → Carta → **Agotados** → busca un plato → **Agotado**. Sale arriba, en «Agotados ahora», con «Hasta mañana · tu nombre»; abajo, «Quítalo también de tu TPV y de Uber Eats». En Carta, el plato lleva la etiqueta roja **Agotado**, y en el chat, en «Todo el equipo», sale su tarjeta. **«Ya hay»** lo devuelve y la tarjeta cambia sola.
- **Desde la cocina y la sala**: con la cuenta de un cocinero o de un camarero, el **«+»** de abajo tiene **«Marcar un agotado»**.
- **Leer tu carta**: Carta → Carta → **Leer tu carta** → elige el PDF de la carta de IKATZ. Te dice qué platos son nuevos, qué precios cambian y qué no sale; marca lo que quieras y **Actualizar tu carta**.
- **El equilibrio**: Carta → **Análisis**. Cada sección con su rango de precios y su barra; si algo no cuadra, lo dice.
- **El cierre**: Servicio → Jornada → Cierre, apunta un plato de la carta: el importe sale ya con su precio.

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.
