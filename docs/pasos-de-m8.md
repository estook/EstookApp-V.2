# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 10 de octubre de 2026, leyendo la base de producción y la API.
>
> | Qué                         | Cómo está                                                                                           |
> | --------------------------- | --------------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #99** (un solo horario y las incidencias). Abierta: **el repaso antes de M9** |
> | La base de datos            | **62 de 62** migraciones, igual que `main`. 107 tablas                                              |
> | La API                      | **Desplegada con la #99** (9-oct, 22:36 UTC): 81 y 171                                              |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                           |
> | M8                          | **Las dos entregas, su repaso y la #99 en producción**                                              |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · el repaso antes de M9

Tus seis puntos ([decisión 0082](decisiones/0082-el-repaso-antes-de-m9.md)). **Hay migración** (`0063`, solo pone las tildes a tres nombres de rol), **hay que desplegar la API** y **hay un secreto nuevo** para Sentry. El orden importa: **Sentry, fusionar, migrar y después desplegar**.

### 1 · Crear el proyecto de la API en Sentry y poner su secreto

Es para que los fallos de la API te lleguen a Sentry, como ya llegan los de las apps. **Hazlo antes de desplegar**: la API lee el secreto al arrancar.

1. En **sentry.io**, entra con tu cuenta → arriba a la izquierda **Projects** → botón **Create Project**.
2. En la lista de plataformas busca y elige **Deno**. Más abajo, **Project name**: `estook-api`. **Team**: el tuyo. Pulsa **Create Project**.
3. Te enseña cómo instalarlo: **no hace falta nada de eso**. Solo copia el **DSN**, una dirección que empieza por `https://` y acaba en `.ingest…sentry.io/` y unos números. Si ya cerraste esa pantalla: **Settings → Projects → estook-api → Client Keys (DSN)** → copia el **DSN**.
4. En ese mismo proyecto, **Settings → Projects → estook-api → Security & Privacy**: deja encendidos **Data Scrubber** y **Use Default Scrubbers**, y enciende **Prevent Storing of IP Addresses**.
5. En **supabase.com** → tu proyecto → **Project Settings** → **Edge Functions** → **Secrets** → **Add new secret**. **Name**: `SENTRY_DSN` (exacto, en mayúsculas). **Value**: pega el DSN. **Save**.

**El DSN no me lo pases por el chat**: va solo en Supabase.

### 2 · Fusionar

En **github.com** → **Pull requests** → **«El repaso antes de M9…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 3 · Migrar la base

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

**Qué tiene que decir:** que aplica la **0063 · los roles con tilde** y que la base va por la **63**.

### 4 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 81» consultas**, **«los 172» comandos** (llega `descongelar`) y una línea nueva en verde: **«y manda sus fallos a Sentry»**. Si esa sale en rojo con «falta SENTRY_DSN», el paso 1 no quedó guardado: repítelo y vuelve a desplegar.

### 5 · Mirarlo en tu iPhone · el chat (lo más importante)

La web se publica sola al fusionar, en unos minutos. **Ciérrala del todo** (desliza hacia arriba desde abajo y quítala) y ábrela otra vez, para que coja la versión nueva. Hazlo **en la app instalada y en Safari**, que se portan distinto.

1. **Chat** → **Todo el equipo** → toca la caja de escribir.
2. **Lo que tiene que salir**, como en WhatsApp: arriba, **justo debajo de la hora**, la cabecera con la flecha atrás y «Todo el equipo»; abajo, **la caja pegada encima de la barra ^ v ✓** del teclado; y en medio los mensajes, el último justo encima de la caja.
3. Escribe una frase larga: **se ve todo lo que escribes**, y la caja crece hacia arriba.
4. Desliza los mensajes con el dedo: **solo se mueven los mensajes**, la cabecera y la caja se quedan quietas.
5. Pulsa **✓** (o toca un mensaje): el teclado se va y la caja **baja a su sitio**, encima de la barra de abajo.

**Si algo no sale así, hazle una captura con el teclado abierto y me la pasas**: es lo único que no se puede probar sin un iPhone.

### 6 · Mirar lo demás

1. **Almacén → Productos**: al entrar, «Sin precio», «Congelados» y «Desactivados» **no aparecen ni un instante** si están vacías. Pulsa **Valor**: **siguen sin salir**.
2. **Lo congelado**: abre un producto → **Congelar una parte** → 1 → **Congelar**. Su lote dice **«Congelado el … · aguanta hasta el …»** (sin «Caduca»). Pulsa **Sacar**: solo **Descongelar** y **Tirar**. **Descongelar** → sale «Mañana» marcado → **Descongelarlo**: el lote pasa a «Caduca el …». Congela otra parte → **Sacar → Tirar → Tirarlo** → en **Movimientos → Historial** sale como **merma**.
3. **Equipo**: ya **no hay «Horarios»**; en **Resumen**, debajo de las cifras, **«Horario de la semana»** te lleva a **Calendario → Turnos**, con **Montarlo** y **Lo que ve el equipo**. En **Incidencias**, sin horario publicado, el botón dice **«Ir al horario»** y lleva allí.
4. **El PDF**: Calendario → Turnos → **Lo que ve el equipo** → PDF de la semana. Las columnas de los días caen **unas debajo de otras** en Cocina y en el resto, el descanso va **en pequeño debajo** de las horas, los nombres no se parten y debajo del tuyo pone **«Dirección o propietario»**.
5. **Avisar al publicar**: cambia un tramo de alguien en **Montarlo** → **Publicar los cambios**. Tiene que decir **por dónde le llega**: «Le llega a 1 persona en el móvil» o «… por correo». En **«¿Avisar en Todo el equipo?»** → **Sí, avisar**: a los demás les suena (o les llega el correo del chat si no tienen Estook en el móvil). **Pregunta a Antonio, Héctor o Alejandro** si les ha llegado el correo de su horario: no tienen Estook en el móvil, y hasta hoy no les llegaba nada.

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
