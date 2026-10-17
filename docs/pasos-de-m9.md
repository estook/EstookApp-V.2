# Pasos de M9 · Escandallos

> ## Cómo está
>
> Comprobado el 17 de octubre de 2026, leyendo la base de producción y la API (solo lectura).
>
> | Qué                         | Cómo está                                                                                                           |
> | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #109** (el repaso del 16-oct). Abierta: **la puesta al día del 17-oct**, sin migración ni API |
> | La base de datos            | **72 de 72** migraciones, igual que `main`                                                                          |
> | La API                      | **Desplegada el 17-oct**: 90 consultas y 196 comandos, corriendo en Irlanda junto a su base                         |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                                           |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo que quede de antes, en [`pasos-de-m8.md`](pasos-de-m8.md).

---

## Lo que te toca ahora · la puesta al día del 17-oct

Lo que lleva ([decisión 0091](decisiones/0091-estado-a-250-lineas-y-los-documentos-al-dia.md)): `ESTADO.md` rehecho (hasta 250 líneas, con una prueba que lo vigila), las máquinas de GitHub fijas en Ubuntu 24 antes del cambio del 19-oct, dos pruebas de Safari que se repetían, y el aplazamiento de VeriFactu que anunció Hacienda, apuntado en el Anexo. **No hay migración y no hay que desplegar la API**: en la app no cambia nada.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«La puesta al día del 17-oct…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 2 · Traer `main` a tu ordenador

En PowerShell, en la carpeta del proyecto, uno por uno:

```bash
git checkout main
```

```bash
git pull
```

**Qué tiene que salir:** el primero, `Switched to branch 'main'` (o que ya estabas en ella); el segundo, una lista de ficheros cambiados (`ESTADO.md`, `docs/…`, `.github/workflows/…`). **Si dice que hay cambios tuyos que se perderían, para y avísame.**

### 3 · Comprobar que la base sigue igual (opcional)

```bash
.\estook.cmd bd:comprobar
```

**Qué tiene que salir:** arriba, **«Migraciones aplicadas: 72 (hasta la 72)»**. Si sale otro número, avísame.

---

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
