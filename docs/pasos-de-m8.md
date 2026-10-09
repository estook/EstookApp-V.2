# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 9 de octubre de 2026 por la noche, leyendo la base de producción.
>
> | Qué                         | Cómo está                                                                                         |
> | --------------------------- | ------------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #98** (el repaso del 9-oct). Abierta: **un solo horario y las incidencias** |
> | La base de datos            | **61 de 61** migraciones, igual que `main`. 106 tablas                                            |
> | La API                      | **Desplegada con el repaso del 9-oct** (17:36 UTC): 80 y 171                                      |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                         |
> | M8                          | **Las dos entregas y su repaso en producción**                                                    |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · un solo horario y las incidencias

Los cinco puntos que pediste y la auditoría ([decisión 0081](decisiones/0081-un-solo-horario-y-las-incidencias.md), [el informe](auditorias/auditoria-2026-10-09.md)). **Esta vez sí hay migración** (`0062`) **y hay que desplegar la API**. El orden importa: **fusionar, migrar y después desplegar**.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«Un solo horario y las incidencias…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

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

**Qué tiene que decir:** que aplica la **0062 · las incidencias** y que la base va por la **62**.

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 81» consultas** (una más: las incidencias) y **«los 171» comandos** (se van los dos del horario de siempre y llegan justificar y quitar la justificación).

### 4 · Publicar la semana en Horarios (importante)

Desde hoy **el único horario es el de Horarios**. El «horario de siempre» de cada ficha **deja de contar**: en IKATZ había 22 tramos y en Pizzeriacazzo 10. Sin semana publicada **no hay retrasos, ni faltas, ni «entras en cinco minutos»**. En IKATZ: **Equipo → Horarios** → «Copiar la semana anterior» o ponerla → **Publicar**. Y dile a Santi que haga lo mismo en Pizzeriacazzo.

### 5 · Probarlo

La web se publica sola al fusionar, en unos minutos. En la app (**Ctrl + F5**; en el móvil, ciérrala y ábrela):

1. **Inventario**: Almacén → Movimientos → Inventario → **«Contar una zona»** → **Escanear** un producto. Tiene que salir **«¿Cuántos hay?»** con su medida (cajas y sueltas, kilos o unidades). Escribe una cifra y **Guardar**. Escanea el mismo otra vez: dice **«Llevabas…»** y deja **Sumar** o **Sustituir**.
2. **Equipo → Incidencias** (la quinta pestaña): con la semana publicada, quien tenía turno y no fichó sale como **«No vino»**. Pulsa **Justificar** → un motivo → **Justificar**: queda «Justificada» y deja de contar. **Quitar la justificación** la devuelve.
3. **Equipo → Resumen**: **cuatro cifras** (Horas, Coste, Retrasos e **Incidencias**). Tocar Retrasos o Incidencias abre Incidencias.
4. **Equipo → Fichajes → Para mirar**: «X fichajes que revisar» y «X retrasos» son **botones** que llevan a Incidencias.
5. **La ficha de una persona**: ya no hay «Su horario»; en su sitio, **«Incidencias»** con las últimas y **«Ver más»**.
6. **Equipo → Horarios**: ya no está «Rellenar con el de siempre».
7. **Almacén → Productos**: «Sin precio», «Congelados» y «Desactivados» **solo salen si tienen algo**.
8. **Panel → Editar**: la cifra de **Retrasos** ya no se puede poner en grande.
9. **Ajustes → Avisos**: por correo, de fábrica, **solo «Tu mes» y «Te corrigen un fichaje»**; cada explicación en su **«i»**. Ojo: **Santi tiene dieciséis tipos encendidos por correo a mano** (lo eligió él, y se respeta); si no los quiere, se apagan en su Ajustes → Avisos.

Si algo no sale como aquí, hazle una captura y me la pasas.

### Lo que queda del repaso del 9-oct

En producción desde el 9-oct (#98). **El chat en tu iPhone**: abre una conversación y toca la caja de escribir; tiene que quedarse **justo encima del teclado**. Solo se puede probar ahí.

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
