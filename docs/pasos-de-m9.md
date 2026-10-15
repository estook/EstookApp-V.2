# Pasos de M9 · Escandallos

> ## Cómo está
>
> Comprobado el 15 de octubre de 2026, leyendo la base de producción y la API.
>
> | Qué                         | Cómo está                                                                                                |
> | --------------------------- | -------------------------------------------------------------------------------------------------------- |
> | Pull requests               | **Fusionadas hasta la #103** (la 0085). Abierta: **M9 · 1 · El plato y tu carta**                        |
> | La base de datos            | **67 de 67** migraciones, igual que `main`                                                               |
> | La API                      | **Desplegada con la #103**: 83 y 176, con el lote y **con Sentry**                                       |
> | **Las copias de seguridad** | **Ninguna**: aplazadas hasta la mudanza. Se pueden encender cualquier día                                |
> | M9                          | **Contestado** ([0086](decisiones/0086-las-respuestas-de-m9.md)); la primera entrega, en su pull request |

Los comandos van con `.\estook.cmd` y **uno por recuadro**: PowerShell no entiende `&&`. Lo que quede de antes, en [`pasos-de-m8.md`](pasos-de-m8.md).

---

## Lo que te toca ahora · M9 · 1 · El plato y tu carta

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
2. **«Nueva sección»**: Entrantes, Principales, Postres… Se ordenan con las flechas de cada sección, y los platos de dentro con **«Ordenar»**.
3. **Carta › Canales**: **activa Uber Eats**. Sale con un 30 % de comisión; **pon la tuya** y, si lo pagas tú, el envase por pedido, y **Guardar**.
4. **Toca un plato**: su ficha. En **Uber Eats**, pon el precio que tenga allí. **Si lo dejas vacío, vale el de sala**, y debajo te dice lo que se lleva Uber Eats y lo que te queda.
5. En la misma ficha, **«Historial»**: verás «Uber Eats: igual que sala → 12,50 €», con tu nombre y la hora.
6. La **lupa** (Ctrl + K): escribe media palabra de un plato y se abre su ficha.

### 5 · Mirarlo en el móvil

En **Carta**: los platos con su precio y, si lo tienen distinto, el de Uber Eats debajo. Alguien de sala **la ve pero no la toca**; alguien de cocina no la tiene (lo suyo será la ficha, sin precios, en M9 · 2).

### Lo que queda de la 0085

En producción desde el 15-oct (#103, 67 migraciones, 83 y 176 con el lote, comprobado ese día). Si no lo has mirado: el Panel abre con una sola petición; la lupa encuentra un pedido por su número; y **a Santi le saldrá «Pon en marcha Pizzeriacazzo» con «Publicar el horario»**, que es lo único que le falta.
