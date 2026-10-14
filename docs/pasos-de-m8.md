# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 14 de octubre de 2026, leyendo la base de producción y la API.
>
> | Qué                         | Cómo está                                                                         |
> | --------------------------- | --------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #100** (el repaso antes de M9). Abierta: **la experiencia** |
> | La base de datos            | **63 de 63** migraciones, igual que `main`                                        |
> | La API                      | **Desplegada con la #100** (13-oct, 21:46 UTC): 81 y 172, **con Sentry**          |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día         |
> | M8                          | **Las dos entregas, sus repasos, la #99 y la #100 en producción**                 |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · la experiencia

Tus once puntos y la auditoría ([decisión 0083](decisiones/0083-la-experiencia.md), [el plan](la-experiencia.md), [la auditoría](auditorias/auditoria-2026-10-14-la-experiencia.md)). **Hay migración** (`0064`, la foto de cada persona: dos columnas nuevas) y **hay que desplegar la API** (dos comandos nuevos y la contraseña con PIN). **No hay secretos nuevos.** El orden importa: **fusionar, migrar y después desplegar**.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«La experiencia…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

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

**Qué tiene que decir:** que aplica la **0064 · la foto de cada uno** y que la base va por la **64**.

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 81» consultas**, **«los 174» comandos** (llegan `poner_foto_de_persona` y `quitar_foto_de_persona`) y, como ahora, **«y manda sus fallos a Sentry»** en verde.

### 4 · Mirarlo en el ordenador

La web se publica sola al fusionar, en unos minutos. Recarga con **Ctrl + F5**.

1. **El menú a la izquierda**: arriba, el logo de Estook y tu local; debajo, el Panel y tus apps. Pulsa **Almacén**: se abren sus destinos debajo. Pulsa el botón de arriba a la derecha del menú (**Plegar el menú**): queda **el logo de tu local** y los iconos; pulsa un icono y salen sus destinos al lado. Recarga: **se queda como lo dejaste**.
2. **Arriba**: el buscador («Ctrl K»), la campana, el chat, **el sol y la luna** (claro y oscuro, de un clic) y tu cara.
3. **El Panel**: «**Hola, Ricardo 👋**» con el logo de IKATZ grande. Cada widget es distinto: **Tu jornada** (un anillo con tus horas), **Ventas** (pasa el ratón por la gráfica: dice cada día), **Objetivos** (medidores), **Merma** (barras y «Apuntar merma»)…
   - En los que tienen **«7 d · 30 d»**, cambia a 30: la gráfica cambia, y **se recuerda**.
   - Pulsa la cifra de **Ventas** (o el botón de las dos flechas): se abre **en grande**, con los ejes, la media, el ticket medio, las cajas y el food cost.
   - **Editar → Añadir**: ya no hay que elegir tamaño ni días; hay **dieciséis**, cada uno una vez. Tu Panel de antes **se ha traducido solo** a los nuevos.
4. **Almacén → Resumen**: debajo de «Cómo va», el botón largo **«Revisar movimientos»** → abre **Inventario**, con **Historial** y **Consumo** al lado. En la barra de Almacén ya no está Movimientos.
5. **Almacén → Compras**: **Pedidos · Facturas · Proveedores**. En Pedidos, **Abiertos · Llegado · Cancelados** («Llegado» son los albaranes). En Proveedores, arriba, **Precios** plegado.
6. **Almacén → Productos**: el buscador redondo con **el escáner dentro**, los almacenes como **pastillas** («Cocina 12») y la categoría al lado.
7. **Equipo → Personas**: una línea por persona, con su cara, «En línea / Dirección» y su botón **Acceso**.
8. **Tu foto**: pulsa tu cara (arriba a la derecha) → en **Tu cuenta**, toca tu cara → elige una foto. Sale **cuadrada con las esquinas redondeadas** en el menú, arriba y en Personas. Para la de alguien del equipo: **Equipo → Personas → su nombre** → toca su cara.
9. **El oscuro**: pulsa la luna. Ahora es **grafito**, no casi negro.

### 5 · Mirarlo en el móvil

Ciérrala del todo y ábrela otra vez (en la app instalada y en Safari).

1. Arriba, **el logo de IKATZ tal cual lo subiste**, sin el círculo naranja.
2. El Panel con los widgets nuevos: los pequeños llevan el «7 d · 30 d» debajo del título.
3. **Almacén**: abajo, **Resumen · Productos · Compras · Mermas**, que ya caben con sus nombres enteros.
4. **Equipo → Personas**: cuatro personas o más en una pantalla.

**Si tu logo tiene un fondo blanco o de color**, ahora se nota más: súbelo otra vez en **Ajustes → Tu local → Logo y color** en **PNG con el fondo transparente** y se verá limpio en claro y en oscuro.

### 6 · La contraseña

1. **Ajustes → Mi cuenta → Mi acceso → Cambiar mi contraseña**: ahora pide **la nueva dos veces**, y no deja guardar si no coinciden.
2. Con alguien del equipo que **entró con su PIN** y todavía no tiene contraseña: en su móvil, **Ajustes → Mi cuenta → Mi acceso → Ponerme una contraseña**. Le pide **su PIN** además de la nueva dos veces. Con un PIN equivocado, dice «Ese no es tu PIN».

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
