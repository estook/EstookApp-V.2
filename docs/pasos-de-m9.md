# Pasos de M9 · Escandallos

> ## Cómo está
>
> Comprobado el 18 de octubre de 2026, leyendo la base de producción y la API (solo lectura).
>
> | Qué                         | Cómo está                                                                                       |
> | --------------------------- | ----------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #114** (18-oct). Abierta: **las respuestas del 18-oct** (solo documentos) |
> | La base de datos            | **73 de 73** migraciones, igual que `main`                                                      |
> | La API                      | **Desplegada el 18-oct**: 92 consultas y 196 comandos, en Irlanda junto a su base               |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                       |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo que quede de antes, en [`pasos-de-m8.md`](pasos-de-m8.md).

---

## Lo que te toca ahora · las respuestas del 18-oct

Un pull request **solo de documentos** (tus respuestas: Fogón en dos mitades, y la propuesta del día del precio). **Sin migración y sin desplegar la API**: solo fusionar, con las **tres comprobaciones en verde**.

## Hecho · M9 · 3 (en producción desde el 18-oct)

Fusionada (#113 y #114), migrada (**0073**) y la API desplegada (**92 y 196**): `bd:comprobar-api` sin nada mal, leído el 18-oct. Lo de abajo queda para probarlo.

### Probarlo en el móvil

**Cierra Estook del todo y ábrela dos veces** (la primera trae la versión nueva). Lo que tiene que pasar:

- **Escandallos → Fichas → un plato**: arriba, **«Para [ 1 ] raciones»** con − y +. Pon 4: las cantidades se multiplican por 4 y el botón dice **«PDF para 4»**. **«Como está escrita»** la deja como estaba. Toca la cantidad de un ingrediente, escribe lo que tienes y **«Escalar»**: lo demás se ajusta. La **«i»** lo explica.
- **Fichas → «Descargar todas»**: un PDF con todas, por secciones y sin euros.
- **Escandallos → Escandallos → un plato → Editar**: **«¿Es una receta de olla?»** pide para cuántas raciones es la tanda; el coste sigue siendo **el de una ración**.
- **Un plato sin escandallo**: en la lista sale **«~X € aprox.»** (precio sin IVA por tu objetivo de coste). En la **Carta**, su ficha dice «Sin escandallo: no sabrás lo que cuesta ni lo que gasta».
- **Si un plato se llama como una receta de Estook** (por ejemplo, «Tortilla de patatas») y no tiene escandallo, al **Desgranar** te ofrece **«Empezar desde ella»**; cada ingrediente te pregunta cuál de tus productos es, y no se guarda hasta que los elijas.
- **«Qué ha cambiado»**, en el Resumen, **solo sale cuando el coste de algún plato se ha movido** (con 7, 30 o 90 días): en IKATZ puede no salir todavía, y está bien.

**Lo que ya tenías sigue igual**: tus escandallos son de una ración, como siempre.

## Hecho · cómo detecta Estook lo que se escapa

Fusionado (#112). El diseño, para M20, en [`como-detecta-estook-lo-que-se-escapa.md`](como-detecta-estook-lo-que-se-escapa.md); tus dos respuestas, en la [0094](decisiones/0094-la-prueba-de-la-plantilla.md).

## Hecho · el plan de M9 · 3

Fusionado (#111), con tus respuestas ([0092](decisiones/0092-las-respuestas-de-m9-3.md)) y las cuatro siguientes ([0093](decisiones/0093-como-detecta-estook-lo-que-se-escapa.md)). Construido el 18-oct: arriba, sus pasos.

## Hecho · la puesta al día del 17-oct

Fusionada (#110), con las tres comprobaciones en verde y sin pruebas repetidas. Sin migración ni API ([0091](decisiones/0091-estado-a-250-lineas-y-los-documentos-al-dia.md)).

## Hecho · el repaso del 16-oct

Fusionado (#109), migrado (**0072**) y la API desplegada (**90 y 196**), comprobado en producción el 17-oct. Richi lo notó **«un 25 % más rápido»**. El modo cocina de **Ajustes** se queda (17-oct); el de Escandallos se quitó.

## Hecho · el arreglo de M9 · 2 y los permisos de la API

Fusionados (#107 y #108), migrados (**0070** y **0071**) y la API desplegada: comprobado en producción el 17-oct.

## Hecho · M9 · 2 · Fichas y escandallos (en producción desde el 16-oct)

Fusionada (#106), migrada (0069) y la API desplegada ([decisión 0087](decisiones/0087-fichas-y-escandallos.md)). **Desde el repaso del 16-oct** ([0090](decisiones/0090-el-repaso-del-16-oct.md)), Escandallos se usa así: **Resumen · Escandallos · Fichas**. En **Escandallos**, un plato se desgrana (lo que lleva y lo que cuesta, y lo que te deja en cada canal); en **Fichas**, la ficha técnica coge ese plato y le añade **los pasos, cada uno con su foto**, y el PDF sin euros. **Ya no hay modo cocina en Escandallos ni se crean elaboraciones** (las que había se siguen viendo).

## Hecho · M9 · 1 · El plato y tu carta (en producción desde el 15-oct)

Fusionada (#104), migrada (0068) y la API desplegada ([decisión 0086](decisiones/0086-las-respuestas-de-m9.md)). En IKATZ: **14 platos y Uber Eats activo** (mirado el 17-oct).

## Lo que queda tuyo, si no lo has hecho

- **Cerrar un segundo inventario** en IKATZ: hay uno, del 11-oct. Con dos, salen lo gastado y la desviación.
- **Que Santi publique una semana** en Pizzeriacazzo (no tiene ninguna): es lo único que le falta de «Pon en marcha Pizzeriacazzo».
- Alguien del equipo que entró con su PIN, **ponerse contraseña**; y **el chat en tu iPhone**.
