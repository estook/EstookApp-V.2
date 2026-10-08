# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 8 de octubre de 2026 a las 21:40, leyendo la base de producción.
>
> | Qué                         | Cómo está                                                                                    |
> | --------------------------- | -------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #95** (A4, 8-oct). Abierta: **M8, el plan y la primera entrega** (#96) |
> | La base de datos            | **59 de 59** migraciones, igual que `main`. 101 tablas                                       |
> | La API                      | **Desplegada con A4**: 74 y 163, los avisos al móvil y el reloj latiendo                     |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                    |
> | «Antes de M8»               | **Entero en producción**. Quedan pruebas tuyas: abajo, «Lo que queda de antes»               |
> | M8                          | **Contestado (1A 2A 3A 4A) y la primera entrega construida**, sin fusionar                   |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · M8, la primera entrega (#96)

Tus respuestas del 8-oct, construidas ([decisión 0078](decisiones/0078-las-respuestas-de-m8.md)). **Una migración** (la **0060**) y **un despliegue**. Ninguna clave nueva.

**Qué trae:**

- **Contar y cerrar, dos pasos.** Cuenta quien lleva el almacén —el cocinero también— **sin ver lo que dice el libro**, y lo manda. Lo cierras tú (o el jefe de cocina), viendo **lo que más baila primero y en euros**.
- **Lo contado se compara con lo que había al contarlo**: si entra un albarán entre que se cuenta y se cierra, no se pierde.
- **Se cuenta como está en la estantería**: «2 cajas y 3 sueltas». Y lo contado **se guarda en el móvil** mientras se cuenta.
- **«Que lo vuelvan a contar»** una línea que baila, y **descartar** lo contado con su porqué.
- **«Toca contar»**: cada semana lo que más vale, lo demás una vez al mes. **Los lunes, en la campana.** Y **«Imprimir la hoja»**, sin las cifras del libro.
- **El valor del almacén en cualquier fecha**: Productos → **Valor**.
- **Los lotes se gastan solos**, primero el que antes caduca; el que se acaba deja de avisar.
- **El mínimo que propone Estook**: en «Bajo mínimo» y en la ficha, con su porqué. El que aceptas lo rehace cada lunes.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«M8 · …»** (la #96) → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 2 · Aplicar la migración

**Qué hace:** crea dónde guardar lo contado, de qué lote sale cada salida y qué mínimos rehace Estook. **No cambia lo que hay en el almacén.** Los lotes que ya tienes empiezan con lo que trajeron: **el primer inventario lo ajusta**. En PowerShell, en la carpeta del proyecto:

```bash
git checkout main
```

```bash
git pull
```

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que salir**, tal cual:

```
  aplicando 0060_contar_el_almacen.sql ... hecho
  1 migracion(es) aplicadas · 60 en total
```

**Si sale un error en rojo, no lo repitas: cópiamelo tal cual.**

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «las 78» consultas y «los 169» comandos.

### 4 · Probarlo, con alguien de cocina

La web se publica sola al fusionar, en unos minutos. En la app (**Ctrl + F5**; en el móvil, ciérrala y ábrela):

1. **Tú**: **Almacén → Movimientos → Inventario**. Sale **«Toca contar»** con tus productos, los que más valen en naranja. Pulsa **«Contar una zona»** → **«Imprimir la hoja»**: sale la hoja **sin cifras**.
2. **Un cocinero, en su móvil**: lo mismo, **«Contar una zona»**, cuenta tres o cuatro cosas —**no ve lo que dice el libro**— y **«Mandar lo contado»**. Sale **«Mandado»**.
3. **Tú**: en la campana, **«… ha contado cocina»**. Tócalo: lo que más baila arriba, con lo que decía el libro y **en euros**. Marca uno **«Que lo vuelvan a contar»** → **«Que vuelvan a contar este»**.
4. **El cocinero**: le llega **«Vuelve a contar 1 producto»**. Lo recuenta y **«Mandar lo recontado»**.
5. **Tú**: **«Cerrar el inventario»** → **«Inventario cerrado»**.
6. **Productos → Valor**: lo que vale hoy tu almacén; cambia **«El día»** a uno de la semana pasada y sale lo que valía entonces.
7. **Productos → Bajo mínimo**: si sale **«Estook propone el mínimo de…»**, **Revisar** y **Usar** uno. Si no sale, es que todavía no hay una semana de salidas con las que calcularlo.
8. **El lunes 12-oct**, en la campana: **«Toca contar…»**.

Si algo no sale como aquí, hazle una captura y me la pasas.

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
