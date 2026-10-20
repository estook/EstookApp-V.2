# Pasos de la auditoría del 20-oct

> **Hecho el 20-oct:** la #124 fusionada y la API desplegada a las 20:15 (comprobado con `bd:comprobar-api`: 96 consultas y 211 comandos). Lo que sigue, en [`pasos-de-m10.md`](pasos-de-m10.md). Lo de mirarlo en el iPhone (punto 4), si no lo has hecho, sigue valiendo.

> ## Cómo está
>
> Leído el 20 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                                                         |
> | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **#123 fusionada** (el repaso del 20-oct). Abierta: **la auditoría del 20-oct**                                                   |
> | La base de datos | **77 de 77** migraciones (la 0077 aplicada). La auditoría **no trae migración**                                                   |
> | La API           | **Desplegada** con el repaso del 20-oct: 96 consultas y 211 comandos. La auditoría no añade ninguno, pero **cambia lo que hacen** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de antes, en [`pasos-del-repaso-del-20-oct.md`](pasos-del-repaso-del-20-oct.md).

---

## Lo que te toca ahora · la auditoría del 20-oct

Lo encontrado y lo hecho, en la [0101](decisiones/0101-la-auditoria-del-20-oct.md); el informe entero, en [`auditoria-del-20-oct.md`](auditoria-del-20-oct.md). **Sin migración y con la API.**

1. **En GitHub**: abre el pull request **«La auditoría del 20-oct…»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main` y `git pull`. **No hace falta migrar**: si lo pruebas, `.\estook.cmd bd:migrar` tiene que decir que no hay nada nuevo (77 en total).
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **Mirarlo en tu iPhone, en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la versión nueva):
   - **El Panel, la tarjeta «Food cost»**: sube más o menos **un 10 %**. No es que vaya peor: ahora divide entre lo vendido **sin IVA**, como el food cost real de Negocio. Debajo dice «Género gastado entre lo vendido sin IVA».
   - **Servicio → Ventas**: el porcentaje de cada día, igual, sin IVA.
   - **Equipo → una persona → Lo que cobra**: ahora pide **lo que le cuesta al local** (el bruto, la Seguridad Social de la empresa y las pagas extra repartidas). **Si pusiste el bruto de la nómina, cámbialo**: si no, el coste de personal sale hasta un tercio por debajo.
   - **El chat**: retira un mensaje de alguien de un canal y, justo después, toca **«⋯»** arriba a la derecha. Tiene que abrir sus opciones a la primera.
5. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos minutos**.

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.
