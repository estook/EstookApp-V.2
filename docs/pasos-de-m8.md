# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 14 de octubre de 2026, leyendo la base de producción y la API.
>
> | Qué                         | Cómo está                                                                    |
> | --------------------------- | ---------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #101** (la experiencia). Abierta: **las bases firmes** |
> | La base de datos            | **64 de 64** migraciones, igual que `main`                                   |
> | La API                      | **Desplegada con la #101**: 81 y 174, **con Sentry**                         |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día    |
> | M8                          | **Las dos entregas, sus repasos, la #99, la #100 y la #101 en producción**   |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · las bases firmes

Tus ocho fallos, las seis mejoras y la auditoría por roles ([decisión 0084](decisiones/0084-las-bases-firmes.md), [la auditoría](auditorias/auditoria-2026-10-14-las-bases-firmes.md)). **Hay dos migraciones** (`0065`, el buscador; `0066`, lo que recuerda tu cuenta: una tabla nueva) y **hay que desplegar la API** (una consulta y dos comandos nuevos, y `quien_soy` más rápido). **No hay secretos nuevos.** El orden importa: **fusionar, migrar y después desplegar**.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«Las bases firmes…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

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

**Qué tiene que decir:** que aplica la **0065 · el buscador que encuentra** y la **0066 · lo que recuerda tu cuenta**, y que la base va por la **66**.

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 82» consultas** (llega `las_caras`), **«los 176» comandos** (llegan `poner_el_periodo_del_widget` y `ya_he_visto_el_recorrido`) y **«y manda sus fallos a Sentry»** en verde.

### 4 · Mirarlo en el móvil

Ciérrala del todo y ábrela otra vez (en la app instalada y en Safari).

1. **El Panel**: arriba **ya no sale el logo de IKATZ**; sale en el saludo. Baja un poco: **aparece arriba**.
2. **Los widgets**, en **filas completas**: Tu jornada y Merma juntas, sin media fila en blanco.
3. **Desliza el dedo por la gráfica de Ventas**: el número grande cambia al de cada día, con su fecha y «antes …». La **línea gris discontinua** es la semana anterior.
4. **Abajo**: Panel lleva **una casa**, el botón naranja **la estrella**. Entra en **Equipo**: «Apps» lleva **la misma estrella**, y «Resumen» su rejilla.
5. **Equipo → Incidencias**: «Justificar» va **a la derecha** de cada fila; las que solo se miran, con una flecha.
6. **La lupa**: escribe **«chul»** (o media palabra de un producto tuyo) y tócalo: **se abre su ficha**. Escribe el nombre de alguien del equipo: **se abre la suya**.
7. **Ajustes → Tu local**: **ocho tarjetas** en vez de la cascada; toca **«Cuándo es llegar tarde»** y se abre en su hoja.
8. **El chat**: las caras **con foto** de quien la tenga. Y en **Almacén → Mermas**, la foto de cada producto.

### 5 · Mirarlo en el ordenador

Recarga con **Ctrl + F5**.

1. **Pliega el menú** y **pulsa el logo de IKATZ**: se despliega (al pasar el ratón por encima se ve el icono de desplegar).
2. Entra en **Almacén** y luego en **Equipo**: en el menú **solo queda abierta la app en la que estás**.
3. **Ventas**: pon **30 d**. Abre la app en el móvil: **también está en 30 d** (se guarda en tu cuenta).
4. **Ctrl + K**, escribe media palabra de un producto y pulsa **Enter**: se abre su ficha.
5. **Ajustes**: el buscador arriba a lo ancho, y cada sección en tarjetas.

### 6 · El recorrido de la primera vez

Te saldrá **una vez**, arriba del Panel: **«Ricardo, te lo enseño en 30 segundos»** (y a cada persona de tu equipo, la primera vez que entre después de desplegar). Pulsa **Empezar**: ilumina **tus apps, el «+», el buscador y tu Panel**, uno a uno, con «Siguiente». Al acabar, o con **«Ya lo conozco»**, **no vuelve a salir ni en el móvil ni en el ordenador**.

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
