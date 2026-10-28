# Pasos del repaso del 20-oct

> ## Cómo está
>
> Leído el 20 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                                                                          |
> | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **#122 fusionada** (el repaso del 19-oct). Abierta: **el repaso del 20-oct**                                                                       |
> | La base de datos | **76 de 76** migraciones (la 0076 aplicada). La rama nueva trae la **0077**                                                                        |
> | La API           | **Desplegada** con el repaso del 19-oct: 96 consultas y 211 comandos. La rama no añade ninguno, pero **cambia lo que hacen** y hay que desplegarla |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de antes, en [`pasos-del-repaso-del-19-oct.md`](pasos-del-repaso-del-19-oct.md).

---

## Lo que te toca ahora · el repaso del 20-oct

Lo que pasaba y lo hecho, en la [0100](../../decisiones/0100-el-repaso-del-20-oct.md). **Con migración (la 0077) y con la API.** La 0077 arregla los datos de IKATZ sin borrar nada: anula las dos entradas mal valoradas (contramuslos a 4,55 € el gramo y aceite a 25 € el litro) y las vuelve a apuntar a su precio de hoy, deja los contramuslos en **50 kg** y cierra los precios «sin proveedor» repetidos.

1. **En GitHub**: abre el pull request **«El repaso del 20-oct…»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y `.\estook.cmd bd:migrar`. **Qué tiene que decir:** «1 migracion(es) aplicadas · 77 en total».
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **Probarlo en tu iPhone, en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la versión nueva):
   - **Almacén → Resumen**: **Compras** ya no dice 91.533 €, sino unos **584 €** la semana. El **valor de la cámara** tiene que ser lo que hay de verdad.
   - **Contramuslos de pollo**: **50 kg**. Toca **«¿No cuadra lo que hay? Corrígelo»**, escribe **48** y mira que debajo diga **«Pasa de 50 kg a 48 kg»**. Escribe **500**: tiene que preguntar **«¿De verdad hay 500 kg?»**. Déjalo sin guardar, o guarda 48 si quieres.
   - **Escandallos → Añadir → Una elaboración desde cero**: «Aceite de albahaca», rinde 1 l. En la **albahaca**, la unidad tiene que salir **en g** (y dejarte elegir kg o ud). Pon 200 g y el coste sale solo. Ojo: tu albahaca dice que **se aprovecha un 50 %** (lo trajo el catálogo), así que 200 g limpios cuestan **dos bandejas** (2,72 €); si no es así, cámbialo en su ficha, en «Se aprovecha».
   - En ese mismo escandallo, escribe un ingrediente que **no tengas** (por ejemplo «Piñones») y toca **«Crear «Piñones» en el Almacén»**: se abre **el alta entera** con el nombre puesto. Ponle cómo viene y su precio, **Guardar el producto**, y vuelves al escandallo con los piñones ya elegidos.
   - **Movimientos → Inventario**: los de peso o litros (la cerveza, el chuletón) se cuentan **en una casilla**, en kilos o litros; los de caja de unidades (refrescos), en cajas y sueltas.
5. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos minutos**.

**Lo que tienes que mirar tú:** el precio de los contramuslos sigue en **5,45 €** la caja de 5 kg (1,09 €/kg). Si era 45,45, cámbialo en su ficha (Precio → Cambiar el precio).

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.
