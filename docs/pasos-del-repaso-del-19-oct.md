# Pasos del repaso del 19-oct

> ## Cómo está
>
> Leído el 20 de octubre de 2026 en producción (solo lectura).
>
> | Qué              | Cómo está                                                                                                       |
> | ---------------- | --------------------------------------------------------------------------------------------------------------- |
> | Pull requests    | **#121 fusionada** (Fogón 1 entero). Abierta: **el repaso del 19-oct** (rama `el-repaso-del-19-oct`)            |
> | La base de datos | **75 de 75** migraciones (la 0075 aplicada). La rama nueva trae la **0076**                                     |
> | La API           | **Desplegada el 19-oct** con Fogón 1 entero: 96 consultas y 210 comandos. La rama nueva la deja en **96 y 211** |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo de Fogón, en [`pasos-de-fogon.md`](pasos-de-fogon.md).

---

## Lo que te toca ahora · el repaso del 19-oct

Los ocho fallos y la auditoría ([0099](decisiones/0099-el-repaso-del-19-oct.md)). **Con migración (la 0076) y con la API.** La 0076 arregla los datos rotos de IKATZ: cada producto pasa a valer lo de su precio de hoy, con una línea «Revalorado a lo pagado» en sus movimientos (no se borra nada).

1. **En GitHub**: abre el pull request **«El repaso del 19-oct…»** y, con las **tres comprobaciones en verde**, **Merge pull request** → **Confirm merge**.
2. **En PowerShell**, en la carpeta del proyecto, uno por uno: `git checkout main`, `git pull` y `.\estook.cmd bd:migrar`. **Qué tiene que decir:** «1 migracion(es) aplicadas · 76 en total».
3. **En GitHub**: **Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`**, y espera al **círculo verde**.
4. **Probarlo en tu iPhone, en IKATZ** (cierra la app y ábrela dos veces, que la primera trae la versión nueva):
   - **Almacén → Contramuslos de pollo**: «Vale» tiene que ser **20 kg por su precio**. Ojo: el precio que tiene puesto es **5,45 €** la caja (lo cambió alguien el 19-oct a las 19:58); si era 45,45, cámbialo y saldrá 181,80 €.
   - **Atún en aceite → Precio**: **un solo precio** («20,00 € el kilo») y debajo, pequeño, «Sin IVA, 18,18 €». **Cambiar el precio**: a la izquierda el de antes, una flecha y el nuevo; al seguir, «¿Sube un X %?».
   - **«¿No cuadra lo que hay? Corrígelo»**: pregunta en **kg**, con el selector para pasar a gramos.
   - **Escandallos → Escandallos → Añadir**: «De un plato de la carta» o «Una elaboración desde cero» (prueba el aceite de albahaca: nombre y cuánto sale). Al desgranar, **toca la caja del ingrediente con el teclado del iPhone** y mira que no se mueva ni se cierre: es lo único que no se ha podido probar sin un iPhone.
   - **Escandallos → Fichas → Crear ficha técnica**.
   - **Carta**: abre un plato, abajo **Borrar el plato** → te pregunta antes («No hay vuelta atrás»). Prueba con uno archivado de prueba.
   - **Con alguien del equipo que sea cocinero**: en Almacén **no** tiene que ver Compras ni Mermas.
   - **El aparato para fichar** (si tienes uno puesto): abajo, **Volver a Estook** → tu correo y tu contraseña.
5. **En GitHub**, después de fusionar: la vuelta de `main` tiene que salir en verde **en pocos minutos** (si el código es el mismo que pasó en la rama, ya no repite las pruebas de pantalla).

**Si algo falla:** dime qué pantalla y, si puedes, una captura. No hace falta deshacer nada.
