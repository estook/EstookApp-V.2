# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 8 de octubre de 2026 a las 21:40, leyendo la base de producción.
>
> | Qué                         | Cómo está                                                                      |
> | --------------------------- | ------------------------------------------------------------------------------ |
> | Pull requests               | **Fusionadas hasta la #95** (A4, 8-oct). Abierta: **el plan de M8**            |
> | La base de datos            | **59 de 59** migraciones, igual que `main`. 101 tablas                         |
> | La API                      | **Desplegada con A4**: 74 y 163, los avisos al móvil y el reloj latiendo       |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día      |
> | «Antes de M8»               | **Entero en producción**. Quedan pruebas tuyas: abajo, «Lo que queda de antes» |
> | M8                          | **Su plan, con cuatro preguntas para ti**. Nada construido todavía             |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · M8, el plan

**Qué es:** saber cuánto género se va sin que nadie lo apunte, y cuánto dinero es. Contar a menudo sin que cueste, el valor del almacén, lo gastado de verdad, el food cost real y la desviación con su causa. Todo, en [`m8-inventario-mermas-y-desviacion.md`](m8-inventario-mermas-y-desviacion.md).

### 1 · Leer el plan y contestar

En **github.com** → **Pull requests** → **«M8 · el plan…»** → pestaña **Files changed** → `docs/m8-inventario-mermas-y-desviacion.md` → los tres puntos de arriba a la derecha → **View file**. Las preguntas están al final.

**Cómo contestar:** en el chat, **la letra de cada una**, por ejemplo `1A 2A 3A 4A`. Si alguna de «Lo que decido yo» no te cuadra, dime su número.

| Pregunta                                        | Lo que recomiendo                                                |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| **1 · La desviación de los platos necesita M9** | **A**: M8 ya con todo lo demás y la barra; los platos, con M9    |
| **2 · Quién cuenta y quién cierra**             | **A**: cuenta el cocinero también; cierra quien tiene el permiso |
| **3 · El mínimo, calculado**                    | **A**: Estook lo propone y tú aceptas                            |
| **4 · La merma con foto**                       | **A**: si quieres, nunca obligatoria                             |

### 2 · Fusionar el plan

Son **solo documentos**: no hay migración ni despliegue. En la pull request, con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

---

## Lo que queda de antes de M8

### A4 · Ventas · mirarlo

Fusionada, migrada (0059) y desplegada (74 y 163): comprobado el 8-oct por la noche. Lo que solo se puede ver **desde mañana**:

1. **El 9-oct, después de las 8**, en `estook.com/admin/` → **Ventas** (**Ctrl + F5**): **Entra al mes** dice **65,29 €** (los 79 € con que se apuntó Pizzeriacazzo, sin IVA). Si sigue en 81,82 €, avísame.
2. **Este año** → **Cobrado**: sale su primer cobro, del 26-sep.
3. **El lunes 12-oct, a partir de las 8**, te llega el correo **«Estook, la semana: …»** (a ti y a Santi).

El resto de cómo probarlo, en el paso 4 de A4 de [`pasos-antes-de-m8.md`](pasos-antes-de-m8.md).

### A3 y C2 · probarlos, si no lo has hecho ya

- **A3**: con un vendedor «Prueba» aparte, crear una cuenta entrando por su enlace y verla en Clientes. En la base, **ningún cliente ha llegado todavía por un enlace**. Paso 4 de A3 en [`pasos-antes-de-m8.md`](pasos-antes-de-m8.md).
- **C2**: confirmar, fijar, «Al chat» y el aviso del horario, con alguien del equipo. Paso 4 de C2, en el mismo sitio.
- **El horario**: montar y publicar una semana de verdad en IKATZ, y mirar «Mi turno» en el móvil de alguien del equipo.

Si algo no sale como aquí, hazle una captura y me la pasas.
