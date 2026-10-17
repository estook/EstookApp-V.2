# Pasos de M9 · Escandallos

> ## Cómo está
>
> Comprobado el 17 de octubre de 2026, leyendo la base de producción y la API (solo lectura).
>
> | Qué                         | Cómo está                                                                                   |
> | --------------------------- | ------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #112** (cómo detecta Estook lo que se escapa). Ninguna abierta        |
> | La base de datos            | **72 de 72** migraciones, igual que `main`                                                  |
> | La API                      | **Desplegada el 17-oct**: 90 consultas y 196 comandos, corriendo en Irlanda junto a su base |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                   |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo que quede de antes, en [`pasos-de-m8.md`](pasos-de-m8.md).

---

## Lo que te toca ahora · decir si construyo M9 · 3

Está contestado entero ([0092](decisiones/0092-las-respuestas-de-m9-3.md) a [0094](decisiones/0094-la-prueba-de-la-plantilla.md)). Cuando digas «adelante», se construye y te llegan sus pasos: **fusionar, migrar** (una columna nueva: cuántas raciones salen de una tanda) **y desplegar la API**. Mientras, no hay nada que hacer en GitHub.

## Hecho · cómo detecta Estook lo que se escapa

Fusionado (#112). El diseño, para M20, en [`como-detecta-estook-lo-que-se-escapa.md`](como-detecta-estook-lo-que-se-escapa.md); tus dos respuestas, en la [0094](decisiones/0094-la-prueba-de-la-plantilla.md).

## Hecho · el plan de M9 · 3

Fusionado (#111), con tus respuestas ([0092](decisiones/0092-las-respuestas-de-m9-3.md)) y las cuatro siguientes ([0093](decisiones/0093-como-detecta-estook-lo-que-se-escapa.md)). Listo para construir.

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
