# ESTADO DEL PROYECTO

Última actualización: 31 de agosto de 2026

> Este fichero es la memoria del proyecto. Se lee lo primero de cada sesión y se
> escribe lo último. Si una conversación se corta, el contexto se recupera aquí.

## Dónde estamos

**M0 · Cimientos y disciplina — terminado, probado y publicado.**

Siguiente: **M1 · Modelo maestro: alcances, roles y permisos.**

Módulos terminados: **M0 ✓**

## La dirección web

**https://estook.github.io/EstookApp-V.2/** — decidido por Richi el 31 de agosto de
2026, hasta que compre `estook.com`.

Las cuatro aplicaciones cuelgan de ahí:

| Aplicación    | Dirección               |
| ------------- | ----------------------- |
| Web pública   | `/EstookApp-V.2/`       |
| La aplicación | `/EstookApp-V.2/app/`   |
| Carta digital | `/EstookApp-V.2/carta/` |
| Panel interno | `/EstookApp-V.2/admin/` |

Cuando haya dominio propio, se declara la variable `VITE_BASE` con el valor `/` en
GitHub y ya está. No hay que tocar código.

## Qué hizo M0

| Lo que pedía el Plan                           | Dónde está                                    |
| ---------------------------------------------- | --------------------------------------------- |
| Monorepo con las cuatro apps arrancando vacías | `apps/`, `pnpm-workspace.yaml`, `turbo.json`  |
| TypeScript estricto                            | `tsconfig.base.json`                          |
| Lint, formato y reglas de dependencia          | `eslint.config.js`, `.dependency-cruiser.cjs` |
| Migraciones numeradas y reversibles            | `base-de-datos/`                              |
| Tres entornos más el de demostración           | `packages/utiles/src/entorno.ts`              |
| Integración continua que bloquea               | `.github/workflows/integracion.yml`           |
| `ESTADO.md` y las plantillas de A2             | este fichero, `docs/`                         |
| Sentry y registro con `correlacion_id`         | `packages/utiles/src/`                        |
| Banderas de función                            | `packages/utiles/src/banderas.ts`             |
| Dos semillas                                   | `base-de-datos/semillas/`                     |

## Qué se ha comprobado, ejecutándolo de verdad

| Comprobación                 | Resultado                                        |
| ---------------------------- | ------------------------------------------------ |
| `pnpm tipos`                 | 14 de 14 paquetes                                |
| `pnpm lint` · `pnpm formato` | limpios                                          |
| `pnpm dependencias`          | sin violaciones                                  |
| `pnpm prueba`                | 12 de 12                                         |
| `pnpm prueba:e2e`            | 16 de 16, escritorio y móvil pequeño             |
| `pnpm tamano`                | 71,7 KB de 250 permitidos                        |
| `pnpm publicacion`           | las rutas apuntan a donde se publica             |
| SQL contra Postgres real     | migración, reversión, reaplicación e invariantes |

Las reglas se probaron **incumpliéndolas a propósito** para ver que bloquean: un
import prohibido entre capas, un `Math.round()` sobre dinero (regla 9) y un
`new Date()` en el navegador (regla 10). Las tres saltaron con su mensaje.

## El fallo de la página en blanco, y cómo no se repite

La primera publicación salió en blanco. El HTML pedía los ficheros en `/assets/…`
cuando estaban en `/EstookApp-V.2/assets/…`: no los encontraba y no pintaba nada.
No fallaba ninguna construcción, simplemente no se veía.

Arreglado de dos maneras: el flujo de publicación deduce la raíz del nombre del
repositorio, y `pnpm publicacion` compara lo construido con donde se va a publicar
y **bloquea** si no cuadran. Está en `herramientas/comprueba-publicacion.mjs` y
corre en los dos flujos de trabajo.

## Decisiones tomadas

Escritas enteras en `docs/decisiones/`:

1. **0001 · GitHub Pages en vez de Netlify.** El Plan (A3) decía Netlify y el
   inventario de claves decía Pages. Preguntado: manda Pages. Incluye la dirección
   de arriba.
2. **0002 · La API en Hono sobre Supabase Edge Functions.** El Plan no decía dónde
   corre. Elección delegada. Se implementa en M2, no antes.
3. **0003 · M0 crea el esqueleto mínimo de organización, área y local.** Sin esas
   tres tablas las semillas de M0 no podían existir. Con RLS encendida y sin
   ninguna política, que es el fallo seguro. M1 lo amplía.

Menores: las pruebas se llaman `*.prueba.ts`; la cadena de ejemplo es Grupo Costa
(Zona Norte y Zona Sur); Node 24 LTS; la integración continua corre en todas las
ramas; Safari móvil solo se prueba en integración continua, porque WebKit en
Windows pide librerías que no están.

## Lo que falta, y es cosa de Richi

1. **Activar el candado.** En Settings → Rules → New branch ruleset: nombre
   «Proteger main», estado **Active**, objetivo «Include default branch», marcar
   «Require status checks to pass» y añadir `Calidad`, `Construcción y
presupuestos`, `Migraciones reversibles` y `Publicar en GitHub Pages`.
   **Sin esto, código roto sí podría entrar en `main`**, que es justo lo que M0
   promete que no pasa. Es el último punto de M0 sin marcar.
2. **Los ficheros de marca** en `packages/ui/marca/` (logo, símbolo, Fogón y
   favicons). La carpeta ya existe con la lista. Se usan en M3.
3. **`DATABASE_URL` en `.env.local`** si se quiere migrar contra Supabase desde
   esta máquina. El SQL ya está probado, pero contra un Postgres de usar y tirar.

## Preguntas pendientes

1. **La tabla del presupuesto de velocidad (apartado B7) está rota en el PDF.** Al
   maquetarla se descolocaron las columnas: hay ocho conceptos y siete cifras, y no
   se sabe cuál va con cuál. Solo se ha aplicado la única inequívoca, el peso de la
   app. **Hace falta bien antes de M3.**
2. **La web pública y el posicionamiento.** La Parte C pide `apps/web` renderizada
   en servidor y Pages solo sirve ficheros. Se decide en M26.
3. **Las claves de Google han pasado por un chat** (Maps y Gemini). El propio
   inventario dice que hay que regenerarlas antes del lanzamiento. Anotado para M27.

## Lo que NO hay que tocar

Cerrados y probados en M0. Ampliarlos es normal; reescribirlos, no, sin una
decisión escrita en `docs/decisiones/`:

- `packages/utiles/src/` — entorno, banderas, correlación y registro.
- `base-de-datos/herramientas/` — el ejecutor de migraciones y el sembrador.
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js`.
- `herramientas/comprueba-publicacion.mjs`.

## El siguiente paso · M1

**Modelo maestro: alcances, roles y permisos.** Qué entra, según el Plan:

- Organizaciones, áreas, locales y **usuarios** (el cuarto alcance: persona).
- Membresías con alcance y vigencia.
- La función `locales_visibles`.
- Los doce roles, herencia de permisos y recorte por local en tres estados:
  sin acceso · ver · ver y editar.
- RLS en todas las tablas, escrita contra `locales_visibles`.
- Auditoría append-only, que rechaza `UPDATE` por permisos de base de datos.
- Catálogo maestro con sus tres políticas, traducciones y dispositivos con
  revocación.

**Reglas críticas.** Aunque el primer cliente tenga un local, el modelo nace con
los cuatro alcances. La auditoría rechaza `UPDATE` por permisos de base de datos.

**Errores típicos a evitar.** Montarlo todo sobre «un usuario pertenece a un
local». Fiarse del `local_id` que manda el cliente. Dejar las traducciones para
luego y acabar con columnas `nombre_en`.

**Terminado cuando.** Toda consulta cruzada entre organizaciones devuelve vacío y
`403`, y un area manager ve exactamente sus tres locales.

M1 empieza ampliando `base-de-datos/migraciones/` con `0002_…`, sin tocar la 0001.
