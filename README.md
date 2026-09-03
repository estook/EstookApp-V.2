# Estook

**Tu cocina, bajo control.**

La aplicacion donde vive todo lo que no es cobrar: el genero, los costes, la carta,
el equipo, el calendario, el control sanitario, los documentos y las decisiones.

> Antes de tocar nada, se lee [`ESTADO.md`](ESTADO.md). Es la memoria del proyecto:
> dice en que modulo estamos, que esta terminado y cual es el siguiente paso.

## Arrancar

Hace falta [Node 22](https://nodejs.org) y pnpm (`corepack enable`).

```bash
pnpm arranca
```

Ese unico comando comprueba Node, prepara `.env.local`, instala, migra, siembra las
dos semillas y levanta las cuatro aplicaciones:

| Aplicacion | Que es                                                   | En local              |
| ---------- | -------------------------------------------------------- | --------------------- |
| `web`      | La web publica                                           | http://localhost:5173 |
| `app`      | El Panel y sus ocho apps                                 | http://localhost:5174 |
| `carta`    | La carta digital publica                                 | http://localhost:5175 |
| `admin`    | El panel interno · **el catálogo del sistema de diseño** | http://localhost:5176 |

Para la base de datos hace falta rellenar `DATABASE_URL` en `.env.local`. Sin ella
el arranque salta ese paso y avisa.

## Comandos

| Comando                 | Que hace                                              |
| ----------------------- | ----------------------------------------------------- |
| `pnpm arranca`          | Todo lo de arriba, de una vez                         |
| `pnpm dev`              | Las cuatro aplicaciones en modo desarrollo            |
| `pnpm verifica`         | Tipos, lint, formato, reglas de dependencia y pruebas |
| `pnpm build`            | Construye las cuatro                                  |
| `pnpm tamano`           | Mide el peso de lo construido. Informa, no bloquea    |
| `pnpm prueba:e2e`       | Playwright, en escritorio y en movil pequeno          |
| `pnpm bd:migrar`        | Aplica las migraciones pendientes                     |
| `pnpm bd:revertir`      | Deshace la ultima                                     |
| `pnpm bd:revertir:todo` | Las deshace todas, de la ultima a la primera          |
| `pnpm bd:sembrar`       | Carga las cinco semillas                              |
| `pnpm bd:comprobar`     | Dice que hay de verdad en la base de datos            |
| `pnpm bd:comprobar-api` | Arranca la API y la prueba contra Supabase de verdad  |
| `pnpm almacen:preparar` | Crea el cubo de ficheros y comprueba el camino entero |

Y dos que solo se usan contra una base de datos que no es la tuya:

| Comando                          | Que hace                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| `pnpm bd:sin-cuentas-de-ejemplo` | Cierra las cuentas de ejemplo: contrasenas, PIN y sesiones |
| `pnpm bd:cuenta-de-verdad`       | Crea una cuenta con una clave de un solo uso               |

**A una base remota no se le siembran credenciales de ejemplo**, y `bd:sembrar` lo
salta solo. La razon esta en `base-de-datos/semillas/acceso.ts`, y costo ocho
cuentas con clave publicada en produccion.

Y tres que se ejecutan **una sola vez** y suben lo que sacan al repositorio, para
que construir no dependa de que nadie esté en pie:

| Comando                                 | Que trae                                 |
| --------------------------------------- | ---------------------------------------- |
| `node herramientas/traer-fuentes.mjs`   | Montserrat en WOFF2, autoalojada (B2)    |
| `node herramientas/traer-iconos.mjs`    | Los 50 iconos de Lucide que se usan (B3) |
| `node herramientas/iconos-de-marca.mjs` | Los PNG de aplicacion, desde el SVG      |

## Como esta organizado

```
apps/         web · app · carta · admin
packages/     dominio · ui · iconos · cliente-api · permisos · documentos · utiles
servidor/     api -> aplicacion -> dominio · infraestructura · eventos · trabajos · conectores · ia
base-de-datos/ migraciones · politicas · vistas · semillas
docs/         reglas · plantilla de tarea · entornos · decisiones · auditorias
pruebas/      extremo a extremo
```

Las dependencias van en un solo sentido: `apps -> packages` y
`api -> aplicacion -> dominio`. El dominio no importa nada de infraestructura ni de
red. No es un consejo: `.dependency-cruiser.cjs` lo comprueba y la integracion
continua bloquea la fusion si se incumple.

## Antes de escribir una linea

- [Las trece reglas](docs/reglas.md)
- [La plantilla de tarea](docs/plantilla-tarea.md)
- [Los entornos y las banderas](docs/entornos.md)
- [Las decisiones tomadas](docs/decisiones/)
- [El sistema de diseño](packages/ui/estilos/fichas.css) · fichas, tipografía y movimiento
- **El catálogo**, en `admin`: los veinte componentes pintados en sus estados. Es
  donde se mira qué usar antes de escribir uno nuevo
- [Las auditorías de flujos, por módulo](docs/auditorias/)
- [Donde vive cada clave](config/claves.md)

## Las claves

Ninguna se escribe en el repositorio. Las publicas van a las variables de GitHub y
las secretas a los secretos de Supabase. Esta todo en
[`config/claves.md`](config/claves.md), con los nombres y sin un solo valor.

## Documentos maestros

El Manifiesto (que es el producto), el Plan de desarrollo (como se construye y en
que orden) y Roles, vistas, auditorias y administracion (que ve cada persona). Si
algo no esta escrito ahi, se pregunta antes de construirlo.
