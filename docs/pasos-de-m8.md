# Pasos de M8 · Inventario, mermas y desviación

> ## Cómo está
>
> Comprobado el 9 de octubre de 2026 por la tarde, leyendo la base de producción.
>
> | Qué                         | Cómo está                                                                                      |
> | --------------------------- | ---------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #97** (M8, la segunda entrega). Abierta: **el repaso del 9-oct**         |
> | La base de datos            | **61 de 61** migraciones, igual que `main`. 106 tablas                                         |
> | La API                      | **Desplegada con la segunda entrega de M8**: 80 y 171, los avisos al móvil y el reloj latiendo |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                      |
> | M8                          | **Las dos entregas en producción**; el repaso del 9-oct, sin fusionar                          |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`.

---

## Lo que te toca ahora · el repaso del 9-oct

Lo que viste tras la segunda entrega, arreglado ([decisión 0080](decisiones/0080-el-repaso-del-9-oct.md)). **Sin migración.** Sí hay que **desplegar la API**: el arreglo de las flechas del informe y el del food cost viven en el servidor.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«El repaso del 9-oct…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

### 2 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después, en PowerShell, en la carpeta del proyecto:

```bash
git checkout main
```

```bash
git pull
```

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** «las 80» consultas y «los 171» comandos, como ahora.

### 3 · Probarlo

La web se publica sola al fusionar, en unos minutos. En la app (**Ctrl + F5**; en el móvil, ciérrala y ábrela):

1. **Compras → Pedidos → nuevo pedido**, elige Estrella de Galicia: cada producto en **una línea** (nombre, precio y cantidad) con una **«i»** pequeña a la derecha. Tócala: sale la cuenta («Para unos 5 días a 0,29 l al día…»).
2. **Almacén → Movimientos**: arriba, solo **Historial · Inventario · Desviación**. En Historial, la fila **Todo · Entradas · Salidas · Ventas · Ajustes** filtra la lista.
3. **Negocio → Informes → Día**: «Anterior» va **un día** atrás y «Siguiente», un día adelante.
4. **El chat en el iPhone**: abre una conversación y toca la caja de escribir. Tiene que quedarse **justo encima del teclado**, con la cabecera arriba y los últimos mensajes pegados a la caja. **Esto solo se puede probar en tu iPhone**: si no queda así, una captura.
5. **Desviación → Food cost real → Un mes → octubre**: en vez de «−27,96 € en género» sale **«No cuadra: queda más de lo que había y entró»**, con «Ver el historial».

Si algo no sale como aquí, hazle una captura y me la pasas.

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
