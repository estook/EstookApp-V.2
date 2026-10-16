# Pasos de M9 · Escandallos

> ## Cómo está
>
> Comprobado el 16 de octubre de 2026, leyendo la base de producción y la API (solo lectura).
>
> | Qué                         | Cómo está                                                                                                 |
> | --------------------------- | --------------------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #105** (M9 · 1 y el arreglo de `bd:comprobar-api`). Abierta: **M9 · 2**             |
> | La base de datos            | **68 de 68** migraciones, igual que `main`. Con M9 · 2 llega la **0069**                                  |
> | La API                      | **Desplegada con la #104**: 85 y 188, con el lote y **con Sentry**. Con M9 · 2 pasa a 90 y 194            |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                                 |
> | M9                          | **M9 · 1 en producción**; **M9 · 2** en su pull request ([0087](decisiones/0087-fichas-y-escandallos.md)) |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo que quede de antes, en [`pasos-de-m8.md`](pasos-de-m8.md).

---

## Lo que te toca ahora · M9 · 2 · Fichas y escandallos

Las fichas, los escandallos con el margen por canal, el modo cocina, el PDF y el historial con «Recuperar»; y en la Carta, **vincular lo que se vende tal cual**, las unidades de la ración, los alérgenos y el picante ([decisión 0087](decisiones/0087-fichas-y-escandallos.md)). **Hay una migración** (`0069`: cuatro tablas nuevas, cuatro columnas del plato y la ficha para la sala) y **hay que desplegar la API** (cinco consultas y seis comandos nuevos). **No hay secretos nuevos.** El orden importa: **fusionar, migrar y después desplegar**.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«M9 · 2 · Fichas y escandallos…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

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

**Qué tiene que decir:** que aplica la **0069 · fichas y escandallos**, y que la base va por la **69**.

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir**, en verde: **«las 90» consultas**, **«los 194» comandos**, y en **«M9 · 2 · lo que la 0069 dejo puesto»**: las cuatro tablas con seguridad, que el historial no se puede cambiar y que **la sala ve las fichas y ni la sala ni la cocina ven un euro**. Al final, **ninguna comprobación mal**.

### 4 · Probarlo con IKATZ (en el ordenador es más cómodo)

Recarga con **Ctrl + F5**.

1. **Escandallos › Resumen**: «Con ficha 0 de …» (tus platos) y la lista **«Sin ficha»**. Toca un plato → **«Desgranar»**: escribe el ingrediente (sale lo de tu Almacén), la cantidad y su unidad (**g o kg, ml o l, ud**), y los pasos. **Guardar.** Si un ingrediente no está, **«Crear … en el Almacén»** (sale sin precio: el plato dirá «falta el precio de 1»).
2. **Escandallos › Elaboraciones → «Nueva elaboración»**: una salsa con **lo que sale de hacerla una vez** («2 l»). Escríbela y úsala dentro de un plato: el coste baja solo.
3. En la ficha del plato, **«Escandallo»**: el coste, el food cost frente a tu objetivo, **el precio recomendado** y **lo que te deja en Sala y en Uber Eats**. Si algún canal pierde dinero, lo dice en rojo, y también en el Resumen.
4. **«Editar»**, cambia un gramaje y guarda; abre **«Historial»**: «Carne: 180 g → 200 g», con tu nombre. **«Recuperar»** la de antes.
5. **«Modo cocina»** (mejor en el móvil): primero lo que lleva, después un paso por pantalla; desliza. **«PDF»**: la ficha en papel, sin un euro (si dice que los PDF no están encendidos, es lo de siempre de Cloudflare).
6. **Carta → «Desde el almacén»**: marca las bebidas o el chuletón, pon su precio y **«Añadir a la carta»**: salen con la **cadena** (vinculados). En la ficha de un plato, **«Alérgenos, picante y más»**: los alérgenos de la receta ya salen marcados; añade los que falten, el picante, vegetariano o vegano, y las unidades de la ración (las croquetas).

### 5 · Mirarlo con alguien de sala y de cocina

Alguien **de sala** ahora tiene **Escandallos**: ve la ficha de cada plato (gramos y pasos) y sus alérgenos, **sin un euro**. Alguien **de cocina**, igual, y en modo cocina. Ninguno de los dos ve la pestaña «Escandallo».

## M9 · 1 · El plato y tu carta (en producción desde el 15-oct)

Tu carta en Estook: secciones, platos, los canales con su precio a mano y el historial de cada plato ([decisión 0086](decisiones/0086-las-respuestas-de-m9.md)). **Hay una migración** (`0068`: cuatro tablas nuevas y el buscador) y **hay que desplegar la API** (dos consultas y doce comandos nuevos). **No hay secretos nuevos.** El orden importa: **fusionar, migrar y después desplegar**.

### 1 · Fusionar

En **github.com** → **Pull requests** → **«M9 · 1 · El plato y tu carta…»** → con las **tres comprobaciones en verde** → **Merge pull request** → **Confirm merge**. **Si alguna sale en rojo o «cancelled», para y avísame.**

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

**Qué tiene que decir:** que aplica la **0068 · el plato y tu carta**, y que la base va por la **68**.

### 3 · Desplegar la API

**Actions** → **Desplegar la API** → **Run workflow**, rama `main`, escribe **`desplegar`** → **Run workflow**. Espera al **círculo verde**. Después:

```bash
.\estook.cmd bd:comprobar-api
```

**Qué tiene que decir:** **«las 85» consultas** (llegan `mi_carta` y `un_plato`), **«los 188» comandos** (llegan los doce de la carta), **«y junta las consultas del Panel»** y **«y manda sus fallos a Sentry»**, en verde.

### 4 · Montar la carta de IKATZ (en el ordenador es más cómodo)

Recarga con **Ctrl + F5** y entra en **Carta** (en el menú de la izquierda).

1. **«Añadir platos»**: escribe cada plato y su precio, fila a fila (siempre queda una fila libre al final). Elige la sección arriba, o déjalos en «Sin sección» y colócalos después. **Con IVA**, como en tu carta de papel.
2. **«Nueva sección»**: Entrantes, Principales, Postres… Para cambiarlas de sitio, toca el **lápiz** de la sección: **Subir** y **Bajar**. Los platos de dentro, con **«Ordenar»**.
3. **Carta › Canales**: **activa Uber Eats**. Sale con un 30 % de comisión; **pon la tuya** y, si lo pagas tú, el envase por pedido, y **Guardar**.
4. **Toca un plato**: su ficha. En **Uber Eats**, pon el precio que tenga allí. **Si lo dejas vacío, vale el de sala**, y debajo te dice lo que se lleva Uber Eats y lo que te queda.
5. En la misma ficha, **«Historial»**: verás «Uber Eats: igual que sala → 12,50 €», con tu nombre y la hora.
6. La **lupa** (Ctrl + K): escribe media palabra de un plato y se abre su ficha.

### 5 · Mirarlo en el móvil

En **Carta**: los platos con su precio y, si lo tienen distinto, el de Uber Eats debajo. Alguien de sala **la ve pero no la toca**; alguien de cocina no la tiene (lo suyo será la ficha, sin precios, en M9 · 2).

### Lo que queda de la 0085

En producción desde el 15-oct (#103, 67 migraciones, 83 y 176 con el lote, comprobado ese día). Si no lo has mirado: el Panel abre con una sola petición; la lupa encuentra un pedido por su número; y **a Santi le saldrá «Pon en marcha Pizzeriacazzo» con «Publicar el horario»**, que es lo único que le falta.
