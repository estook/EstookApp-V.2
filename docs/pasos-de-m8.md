# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 15 de octubre de 2026, leyendo la base de producción y la API.
>
> | Qué                         | Cómo está                                                                 |
> | --------------------------- | ------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #102** (las bases firmes). Abierta: **la 0085**     |
> | La base de datos            | **66 de 66** migraciones, igual que `main`                                |
> | La API                      | **Desplegada con la #102**: 82 y 176, **con Sentry**                      |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día |
> | M8                          | **Las dos entregas, sus repasos, la #99 a la #102 en producción**         |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · la 0085

El Panel en una sola petición, las siluetas de carga, el buscador con pedidos, facturas y recientes, y la puesta en marcha ([decisión 0085](decisiones/0085-una-peticion-siluetas-buscador-y-puesta-en-marcha.md)). **Hay una migración** (`0067`: solo la función del buscador, no toca datos) y **hay que desplegar la API** (una consulta nueva y la ruta que junta las consultas). **No hay secretos nuevos.** El orden importa: **fusionar, migrar y después desplegar**.

> Si la web se publica antes de que despliegues la API, **no se rompe nada**: la app nueva pide el lote, la API de antes dice que no lo conoce y la app pide como siempre. Solo va más lenta hasta que despliegues.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«El Panel en una sola petición…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 2 · Migrar la base

En PowerShell, en la carpeta del proyecto, uno por uno:

```bash
git checkout main
```

```bash
git pull
```

```bash
.\estook.cmd bd:migrar
```

**Qué tiene que decir:** que aplica la **0067 · el buscador encuentra pedidos y facturas**, y que la base va por la **67**.

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 83» consultas** (llega `la_puesta_en_marcha`), **«los 176» comandos**, **«y junta las consultas del Panel en una petición (0085)»** y **«y manda sus fallos a Sentry»**, en verde.

### 4 · Mirarlo en el móvil

Ciérrala del todo y ábrela otra vez.

1. **Al abrir el Panel**, mientras llega, cada widget enseña **su forma en gris** (el anillo de la jornada, la gráfica de ventas, los medidores) en vez de rayas iguales. Con buena cobertura casi no se ve: se nota con poca.
2. **La lupa** con la caja vacía: si ya abriste algo desde ella, sale en **Recientes**. Escribe **el número de un pedido** (por ejemplo **«3»** o **«pedido 3»**) y tócalo: **se abre su ficha**. Escribe **el nombre de un proveedor**: sale él y, debajo, sus tres últimos pedidos y facturas.
3. Vuelve a abrir la lupa: lo que abriste está arriba, en **Recientes**. **«Borrar»** los quita.

### 5 · Mirarlo en el ordenador

Recarga con **Ctrl + F5**.

1. **Ctrl + K**, escribe el número de una factura (o una parte) y pulsa **Enter**: se abre la factura.
2. **La puesta en marcha a ti no te sale**, y es lo correcto: IKATZ ya tiene logo, género, proveedores, horario publicado y equipo (leído el 15-oct). **A Santi sí**: a Pizzeriacazzo le falta **publicar el horario**, así que arriba de su Panel verá **«Pon en marcha Pizzeriacazzo» · 4/5**, y el paso que falta le lleva a Calendario › Turnos. Al publicar la semana, la tarjeta se va sola.

### Lo que queda de las bases firmes

En producción desde el 14-oct (#102, 66 migraciones, 82 y 176, comprobado el 15-oct) y mirada por ti. Nada pendiente.

### Lo que queda de la experiencia

En producción desde el 14-oct (#101, 64 migraciones, 81 y 174). Si no lo has hecho: con alguien del equipo que **entró con su PIN** y todavía no tiene contraseña, en su móvil **Ajustes → Mi cuenta → Contraseña y acceso → Ponerme una contraseña**: pide **su PIN** y la nueva dos veces.

### Lo que queda de la #100

En producción desde el 13-oct (63 migraciones, 81 y 172, Sentry encendido, comprobado el 14-oct). Si no lo has hecho: **mira el chat en tu iPhone** (la caja encima del teclado, como en WhatsApp) y que **Santi publique la semana** en Pizzeriacazzo.

### Lo que queda de la #99

En producción desde el 9-oct (0062, 81 y 171), comprobado el 10-oct. **Tú ya publicaste la semana en IKATZ**; en **Pizzeriacazzo todavía no hay ninguna semana publicada**: dile a Santi que la publique en **Calendario → Turnos** (sin ella no salen ni retrasos ni faltas). Si no lo has mirado, los nueve puntos de la #99 siguen valiendo (Incidencias, la ficha, «Para mirar», los avisos por correo de fábrica).

### Lo que queda de la segunda entrega

En producción desde el 9-oct (#97, 0061, 80 y 171). **En IKATZ todavía no se ha cerrado ningún inventario**, y lo gastado de verdad y la desviación salen de contar **dos veces**: haz uno (Movimientos → Inventario → «Contar una zona» → cerrar) y otro dentro de unos días.

---

## Lo que queda de la primera entrega · probarla con alguien de cocina

En producción desde el 9-oct (#96, 0060, 78 y 169). Si solo la has mirado por encima, lo que vale la pena probar con un cocinero:

1. **Él, en su móvil**: Almacén → Movimientos → Inventario → **«Contar una zona»**, cuenta tres o cuatro cosas —**no ve lo que dice el libro**— y **«Mandar lo contado»**.
2. **Tú**: en la campana, **«… ha contado cocina»**; marca uno **«Que lo vuelvan a contar»**; él lo recuenta; y **«Cerrar el inventario»**.
3. **Productos → Valor**: cambia **«El día»** a uno de la semana pasada.
4. **El lunes 12-oct**, en la campana: **«Toca contar…»**.

## Lo que queda de antes de M8

- **A4**: en `estook.com/admin/` → **Ventas** (**Ctrl + F5**), **Entra al mes** dice **65,29 €** y, en **Este año → Cobrado**, el cobro de Pizzeriacazzo del 26-sep; y el lunes 12-oct, a partir de las 8, el correo **«Estook, la semana: …»** (a ti y a Santi). Lo demás de A4, en el paso 4 de [`pasos-antes-de-m8.md`](pasos-antes-de-m8.md).
- **A3**: con un vendedor «Prueba» aparte, crear una cuenta entrando por su enlace y verla en Clientes.
- **C2**: confirmar, fijar, «Al chat» y el aviso del horario, con alguien del equipo.
- **El horario**: montar y publicar una semana de verdad en IKATZ, y mirar «Mi turno» en el móvil de alguien del equipo.
