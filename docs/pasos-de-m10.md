# Pasos de M10

> ## Cómo está
>
> Leído el 20 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                                     |
> | ---------------- | ------------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **#124 fusionada** (la auditoría del 20-oct). Abierta: **M10 · 1 · La carta que trabaja**                     |
> | La base de datos | **77 de 77** migraciones. M10 · 1 trae **la 0078** (los agotados)                                             |
> | La API           | **Desplegada** con la auditoría (20-oct, 20:15): 96 consultas y 211 comandos. M10 · 1 la deja en **98 y 215** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de antes, en [`pasos-de-la-auditoria-del-20-oct.md`](pasos-de-la-auditoria-del-20-oct.md).

---

## Lo que te toca ahora · M10 · 1

Lo hecho y por qué, en la [0102](decisiones/0102-m10-1-la-carta-que-trabaja.md); el plan entero de M10, en [`m10-la-carta-menus-y-analisis.md`](m10-la-carta-menus-y-analisis.md). **Con migración (0078) y con la API.**

1. **En GitHub**: abre el pull request **«M10 · 1 · La carta que trabaja…»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y `.\estook.cmd bd:migrar`. Tiene que decir que aplica **la 0078** y que hay **78 en total**.
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **Probarlo en tu iPhone, en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la versión nueva):
   - **Un agotado**: Carta → Carta → **Agotados** → busca un plato → **Agotado**. Sale arriba, en «Agotados ahora», con «Hasta mañana · tu nombre»; abajo, «Quítalo también de tu TPV y de Uber Eats». En Carta, el plato lleva la etiqueta roja **Agotado**, y en el chat, en «Todo el equipo», sale su tarjeta. **«Ya hay»** lo devuelve y la tarjeta cambia sola. Si no tocas nada, vuelve solo mañana a la hora de corte de IKATZ.
   - **Desde la cocina y la sala**: con la cuenta de un cocinero o de un camarero, el **«+»** de abajo tiene **«Marcar un agotado»**, y en el Panel de un camarero nuevo sale el widget **«Agotados»** (a quien ya tenía su Panel, se le ofrece al añadir).
   - **Leer tu carta**: Carta → Carta → **Leer tu carta** → elige el PDF de la carta de IKATZ. Te dice qué platos son nuevos, qué precios cambian y qué no sale; marca lo que quieras y **Actualizar tu carta**. Si es una foto o un PDF escaneado, lo lee Fogón (3 créditos por página).
   - **El equilibrio**: Carta → **Análisis**. Cada sección con su rango de precios y su barra; si algo no cuadra, lo dice.
   - **El cierre**: Servicio → Jornada → Cierre, apunta un plato de la carta: el importe sale ya con su precio.
5. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos minutos**.

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.

## Y lo que necesito de ti · las cinco preguntas de M10 · 2

Están explicadas, con ejemplos y mi recomendación, en [el plan de M10](m10-la-carta-menus-y-analisis.md#m10--2--las-preguntas-para-richi). Me basta con «1A, 2A, 3B, 4A, 5A» o lo que elijas, y si IKATZ hace menú del día.
