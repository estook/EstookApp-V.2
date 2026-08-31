# ESTADO DEL PROYECTO

Última actualización: 31 de agosto de 2026

> Este fichero es la memoria del proyecto. Se lee lo primero de cada sesión y se
> escribe lo último. Si una conversación se corta o se agota, el contexto se
> recupera leyendo esto.

## Módulo actual

**M0 · Cimientos y disciplina — terminado y verificado.**

Listo para empezar **M1 · Modelo maestro: alcances, roles y permisos**.

## Qué está terminado

M0 ✓

## Qué he hecho en esta sesión

Lectura de los cuatro documentos maestros y construcción completa de M0, punto por
punto de su lista de «Entra»:

| Lo que pedía M0                                | Dónde está                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Monorepo con las cuatro apps arrancando vacías | `apps/`, `pnpm-workspace.yaml`, `turbo.json`                      |
| TypeScript estricto                            | `tsconfig.base.json`                                              |
| Lint, formato y reglas de dependencia          | `eslint.config.js`, `.prettierrc.json`, `.dependency-cruiser.cjs` |
| Migraciones numeradas y reversibles            | `base-de-datos/migraciones/`, `herramientas/migrar.mjs`           |
| Tres entornos más el de demostración           | `packages/utiles/src/entorno.ts`, `docs/entornos.md`              |
| Integración continua que bloquea               | `.github/workflows/integracion.yml`                               |
| `ESTADO.md` y las plantillas de A2             | este fichero, `docs/plantilla-tarea.md`, `docs/reglas.md`         |
| Sentry y registro con `correlacion_id`         | `packages/utiles/src/observabilidad.ts`, `registro.ts`            |
| Banderas de función                            | `packages/utiles/src/banderas.ts`                                 |
| Dos semillas                                   | `base-de-datos/semillas/independiente.sql`, `cadena.sql`          |

## Qué se ha ejecutado, y con qué resultado

Todo esto se ha corrido de verdad en esta máquina, no es una promesa:

| Comprobación                | Resultado                                                               |
| --------------------------- | ----------------------------------------------------------------------- |
| `pnpm install`              | 261 paquetes, `pnpm-lock.yaml` generado                                 |
| `pnpm tipos`                | 14 de 14 paquetes sin errores                                           |
| `pnpm lint`                 | limpio                                                                  |
| `pnpm formato`              | limpio                                                                  |
| `pnpm dependencias`         | sin violaciones · 45 módulos, 52 dependencias                           |
| `pnpm prueba`               | 12 de 12 pruebas                                                        |
| `pnpm build`                | las cuatro aplicaciones                                                 |
| `pnpm tamano`               | 71,7 KB comprimido cada una · límite 250 KB                             |
| `pnpm prueba:e2e`           | 16 de 16, en escritorio y en móvil pequeño                              |
| SQL contra Postgres efímero | migración, reversión, reaplicación, semillas idempotentes e invariantes |

**Las reglas se han probado disparando a propósito**, que es lo que las distingue de
un comentario bonito:

- Un fichero en `servidor/dominio/` importando `servidor/infraestructura/` → bloqueado.
- Un fichero en `packages/dominio/` importando `packages/ui/` → bloqueado.
- Un `Math.round()` sobre dinero → bloqueado con el mensaje de la regla 9.
- Un `new Date()` sin argumentos → bloqueado con el mensaje de la regla 10.

**Lo que se comprobó del SQL**, con un Postgres real (WASM) fuera del proyecto:
la migración aplica; las dos semillas dejan 1 + 6 locales (Zona Norte 3, Zona Sur 3);
sembrar dos veces no duplica nada; un área de otra organización se rechaza en la base
de datos; un código con mayúsculas y un nombre en blanco se rechazan; el trigger de
`actualizado_en` funciona; RLS está encendida en las tres tablas de dominio y en la de
control; la reversión deja el esquema con la tabla de migraciones y nada más; y
después de revertir se puede volver a aplicar.

## Decisiones tomadas

Las tres grandes están escritas enteras en `docs/decisiones/`:

1. **0001 · GitHub Pages en vez de Netlify.** Contradicción entre el Plan (A3) y el
   inventario de claves. Preguntado a Richi: manda Pages.
2. **0002 · La API en Hono sobre Supabase Edge Functions.** El Plan no decía dónde
   corre. Richi delegó la elección. Se implementa en M2, no antes.
3. **0003 · M0 crea el esqueleto mínimo de organización, área y local.** Sin esas
   tres tablas las semillas de M0 no pueden existir. Con RLS encendida y sin ninguna
   política, que es el fallo seguro.

Menores:

- Las pruebas se llaman `*.prueba.ts` y viven al lado de lo que prueban.
- La cadena de ejemplo es **Grupo Costa**, con Zona Norte y Zona Sur. Los nombres de
  local (Bar Puerto, Bar Playa…) salen del documento de Roles.
- Node **24** LTS, no 22. Es lo que hay instalado y lo que fija `.nvmrc` para que la
  integración continua use lo mismo.
- La integración continua corre en **todas las ramas**, no solo en `main`: una rama
  sin comprobar no sirve para revisar.
- El proyecto de Playwright para **Safari móvil** solo corre en integración continua.
  WebKit en Windows pide librerías del sistema que aquí no están. En local se fuerza
  con `CON_WEBKIT=1`. El móvil pequeño (375 px) sí se prueba siempre.
- `sin-dependencias-no-declaradas` no mira los imports entre paquetes del monorepo:
  pnpm los resuelve por enlace simbólico y dependency-cruiser no los sabe clasificar.
  Que estén declarados lo garantiza pnpm, porque sin `workspace:*` no habría enlace.
- Sentry entra en el paquete inicial aunque no haya DSN. Cabe de sobra en el
  presupuesto (71,7 de 250 KB), así que no se ha complicado con carga diferida.

## Preguntas pendientes para Richi

1. **El presupuesto de velocidad de B7 está ilegible en el PDF.** La tabla se
   descolocó al maquetar y las cifras no casan con sus filas: hay ocho conceptos y
   siete valores. Lo único inequívoco es «paquete inicial < 250 KB comprimido», y es
   lo único implementado. **Hace falta la tabla correcta antes de M3.**
2. **El dominio y `VITE_BASE`.** Todavía sin decidir. Por ahora `/`. Si el sitio
   acaba siendo de proyecto (`estook.github.io/EstookApp-V.2/`) hay que poner
   `VITE_BASE=/EstookApp-V.2/` en las variables del repositorio; si se crea el
   repositorio `estook.github.io`, se queda en `/`.
3. **La web pública y el posicionamiento.** La Parte C pide `apps/web` renderizada en
   servidor, y Pages solo sirve ficheros. O se prerenderiza al construir, o `apps/web`
   acaba en otro sitio. Se decide en M26.
4. **Las claves de Google han pasado por un chat** (Maps y Gemini). Tu propio
   inventario dice que hay que regenerarlas antes del lanzamiento. Anotado para M27.

## Qué queda por hacer fuera del código

Nada de esto bloquea M1, pero conviene no dejarlo pasar:

- [ ] En GitHub → Settings → Pages, poner el origen en «GitHub Actions».
- [ ] Declarar las variables del repositorio: `VITE_BASE`, `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_ENTORNO`. Están listadas en
      `config/claves.md`.
- [ ] En Settings → Branches → `main`, marcar «Calidad», «Construcción y
      presupuestos» y «Migraciones reversibles» como comprobaciones obligatorias.
      **Sin esto, un pull request con un fallo de tipos sí se podría fusionar**, que
      es justo lo que M0 promete que no pasa.
- [ ] Dejar los ficheros de marca en `packages/ui/marca/` (logo, símbolo, Fogón y
      favicons). La carpeta ya existe con la lista de lo que va dentro.
- [ ] Poner `DATABASE_URL` en `.env.local` para poder migrar contra Supabase desde
      esta máquina. El SQL ya está verificado, pero contra un Postgres efímero.

## Lo que NO hay que tocar

Cerrados y probados en M0:

- `packages/utiles/src/` — entorno, banderas, correlación y registro.
- `base-de-datos/herramientas/` — el ejecutor de migraciones y el sembrador.
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js`.

Ampliarlos es normal; reescribirlos, no, sin una decisión escrita en `docs/decisiones/`.

## Cuál es el siguiente paso

**M1 · Modelo maestro: alcances, roles y permisos.** Entra:

- Organizaciones, áreas, locales y **usuarios** (el cuarto alcance: persona).
- Membresías con alcance y vigencia.
- La función `locales_visibles`.
- Los doce roles, la herencia de permisos y el recorte por local en tres estados.
- RLS en todas las tablas, escrita contra `locales_visibles`.
- Auditoría append-only, que rechaza `UPDATE` por permisos de base de datos.
- Catálogo maestro con sus tres políticas, traducciones y dispositivos con revocación.

Regla crítica de M1: aunque el primer cliente tenga un local, el modelo nace con los
cuatro alcances. Error típico a evitar: montarlo todo sobre «un usuario pertenece a
un local», fiarse del `local_id` que manda el cliente, y dejar las traducciones para
luego y acabar con columnas `nombre_en`.

Terminado cuando: toda consulta cruzada entre organizaciones devuelve vacío y `403`,
y un area manager ve exactamente sus tres locales.

M1 empieza ampliando `base-de-datos/migraciones/` con `0002_…`, sin tocar la 0001.
