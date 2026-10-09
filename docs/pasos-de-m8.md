# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 9 de octubre de 2026 por la mañana, leyendo la base de producción.
>
> | Qué                         | Cómo está                                                                                      |
> | --------------------------- | ---------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #96** (M8, la primera entrega). Abierta: **M8, la segunda entrega**      |
> | La base de datos            | **60 de 60** migraciones, igual que `main`. 104 tablas                                         |
> | La API                      | **Desplegada con la primera entrega de M8**: 78 y 169, los avisos al móvil y el reloj latiendo |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                      |
> | M8                          | **La primera entrega en producción**; **la segunda construida**, sin fusionar                  |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · M8, la segunda entrega

Lo que pediste el 9-oct, construido ([decisión 0079](decisiones/0079-lo-gastado-y-la-desviacion.md)). **Una migración** (la **0061**) y **un despliegue**. Ninguna clave nueva, y nada que preparar para las fotos.

**Qué trae** (todo en **Almacén → Movimientos → Desviación**, para quien cierra inventarios):

- **El food cost real**: lo que se fue en género de cada 100 € vendidos **sin IVA**, entre los dos últimos inventarios o en un mes, frente a **tu objetivo de materia prima**. Si faltan días de caja, lo dice.
- **Lo que se vende tal cual**: lo que salió de la cámara frente a lo que vendió la caja —«Faltan 16 ud · 9,60 €»— con **su causa más probable** y un botón para comprobarla.
- **Emparejar la caja**: «Coca-Cola» de la caja es tu «Coca-Cola 33 cl». Se dice una vez; Estook propone el producto que se le parece.
- **Lo gastado de verdad** de cada producto contado dos veces: había, entró, queda y gastado, en euros.
- **Un aviso** en la campana al cerrar un inventario si lo que falta pasa del 3 %.
- **La foto de la merma**, si quieres: «Añadir una foto» al apuntarla, y «Ver la foto» en Mermas.

**Lo que no trae, a propósito:** «lo que falta» de lo que se cocina (el pulpo, la merluza). Sin la ficha del plato no se sabe cuánto debía gastarse; de eso ves lo gastado de verdad, y su desviación llega con M9.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«M8 · lo gastado de verdad…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 2 · Aplicar la migración

**Qué hace:** crea dónde guardar qué producto es cada línea de la caja y la foto de cada merma, y el aviso nuevo. **No cambia nada de lo que ya hay.** En PowerShell, en la carpeta del proyecto:

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
  aplicando 0061_lo_gastado_y_la_desviacion.sql ... hecho
  1 migracion(es) aplicadas · 61 en total
```

**Si sale un error en rojo, no lo repitas: cópiamelo tal cual.**

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «las 80» consultas y «los 171» comandos.

### 4 · Probarlo

La web se publica sola al fusionar, en unos minutos. En la app (**Ctrl + F5**; en el móvil, ciérrala y ábrela):

1. **Almacén → Movimientos → Desviación**. Arriba, **Food cost real**: con el periodo «Un mes» sale el de octubre; despliega **«Cómo sale»** y mira que «Había», «Compraste» y «Queda» te suenan.
2. Más abajo, **«En la caja, sin decir qué es»**: las líneas de tus cierres de caja. Si vendes refrescos o botellas tal cual, pulsa **«¿Es …?»** → **«Es este producto»**. Si una línea es un plato o el menú, **«No es de almacén»**.
3. **Lo gastado de verdad**: sale de lo que hayas contado **dos veces**. Si solo has contado una, lo dice: «con el segundo inventario sale». Haz el segundo (Inventario → Contar una zona) y vuelve.
4. Con un producto emparejado y contado dos veces, en **«Lo que se vende tal cual»** sale si cuadra o **«Faltan …»**; toca la etiqueta de la causa y el botón **«Mirar …»**.
5. **Una merma con foto**: apunta una (producto, cuánto, por qué) → **«Añadir una foto»** → haz la foto → **Apuntar**. Sale «apuntado con su foto». En **Almacén → Mermas**, en esa línea, **«Ver la foto»**.

Si algo no sale como aquí, hazle una captura y me la pasas.

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
