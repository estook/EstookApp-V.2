# ESTADO DEL PROYECTO

Última actualización: 2 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Nunca puede afirmar algo que no sea cierto en ese momento.

---

## 1 · Dónde estamos

|                |                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0 ✓** cimientos · **M1 ✓** alcances · **M2 ✓** núcleo · **M3 ✓** diseño y esqueleto · **M4 ✓** identidad y acceso |
| **Siguiente**  | **M5** · onboarding y arranque asistido                                                                              |
| **Pruebas**    | 522 unitarias y de base de datos · 130 de extremo a extremo                                                          |
| **Rama**       | `m4-identidad-y-acceso`, **sin fusionar**. La `0018` no está aplicada todavía                                        |
| **Publicado**  | web viva, con Sentry escuchando. **La API sigue sin desplegar**                                                      |

---

## 2 · Qué hay que hacer

### Ahora, y por este orden

M4 está escrito y probado entero, pero **quedan tres botones que no puedo pulsar
yo**, y hasta que se pulsen la aplicación publicada sigue sin login:

1. **Fusionar el pull request de M4.** Primero fusionar, después aplicar a
   Supabase (regla 1).
2. **Aplicar la `0018`** con `pnpm bd:migrar`, y **sembrar** con `pnpm bd:sembrar`.
   La semilla nueva es la que pone la contraseña de las personas de ejemplo; se
   niega a correr si `ENTORNO=produccion`.
3. **Desplegar la API.** Actions → `Desplegar la API` → escribir «desplegar».
   Antes hacen falta los secretos, que están en
   [`config/claves.md`](config/claves.md): dos en GitHub y tres en Supabase.

Y después, declarar `VITE_API_URL` en las variables del repositorio, que es lo
que hace que la aplicación publicada sepa a dónde llamar. Mientras no esté, la
pantalla de entrar **lo dice** en vez de quedarse cargando.

### Lo único de M4 que no puedo firmar yo

**Verlo en un móvil de verdad** (regla 11). Las pruebas corren a 375 px y una de
ellas encontró que en móvil no había forma de cambiar de local, pero eso no
sustituye a tener el teléfono en la mano y escribir un PIN con una sola mano.

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No es que falte el dato: es
que **no existe un dato único**, porque dependen del bien y de la operación.
**Cuando aparezcan se añaden como filas, sin tocar código.** Mientras tanto el
motor devuelve «sin regla» y para, en vez de inventarse un tipo. Está en
[`docs/decisiones/0006`](docs/decisiones/0006-el-motor-fiscal.md).

### Sin prisa

| Qué                                                                   | Cuándo                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                              |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                            |
| Volver a `BrowserRouter` cuando haya `estook.com`                     | cuando haya dominio ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |
| El archivo vectorial del logotipo y de Fogón                          | cuando aparezca; se sustituye en un sitio                                      |
| Un código QR para el segundo factor                                   | hoy se enseña la clave y el enlace, que basta. Con M11 llega la librería       |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
El **catálogo del sistema de diseño** está en `/admin/`: es la referencia de qué
componente usar y cómo se ve cada uno.

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito. Proyecto nuevo; el de la versión 1 sigue apagado y sin tocar.

Comprobado con `pnpm bd:comprobar` contra la base de datos de verdad, **antes de
la `0018`**:

| Qué                            | Cuánto                                         |
| ------------------------------ | ---------------------------------------------- |
| Migraciones aplicadas          | **17 de 18** · la `0018` se aplica al fusionar |
| Tablas en el esquema `estook`  | 18, **todas con seguridad por filas**          |
| Roles · permisos · concesiones | 12 · 33 · 166                                  |
| Reglas fiscales                | 17, todas con su referencia legal              |
| Datos de ejemplo               | 2 organizaciones, 7 locales, 7 personas        |
| Tablas sueltas en `public`     | **0**                                          |

Cuando se aplique la `0018` serán **18 migraciones y 23 tablas**, y las personas
de ejemplo pasarán a ocho: entra **Nuria**, camarera en dos locales de la Zona
Norte. No es un capricho: es el caso que M4 usa como criterio de terminado, y sin
ella «¿dónde estás hoy?» no se podría comprobar con nadie.

La conexión va por el agrupador de sesión de Supabase, porque la conexión directa
de los proyectos nuevos solo funciona por IPv6.

**La API se prueba en tres capas distintas**, y las tres hacen falta:

| Dónde                   | Qué caza                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| `pnpm prueba`           | cálculo puro y SQL contra un Postgres efímero                               |
| `pnpm prueba:e2e`       | la API **de verdad** contra Postgres efímero, con navegador                 |
| `pnpm bd:comprobar-api` | la API contra **Supabase**, que es donde aparece lo que WebAssembly esconde |

La tercera hay que ejecutarla cada vez que se toque la infraestructura y **cada
vez que una migración instale algo**. La `0018` crea un índice único y once
funciones con privilegio, que es exactamente ese caso.

**Errores:** proyecto `estook-app` en Sentry, con solo «Error monitoring»
encendido y el repositorio enlazado.

**Variables del repositorio** (GitHub → Settings → Secrets and variables →
Actions): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL` y
`VITE_SENTRY_DSN`. **Falta declarar `VITE_API_URL`**, que es de M4. Y en Secrets
harán falta dos, `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`, que son los
primeros del repositorio: son para desplegar, no del producto. Todo en
[`config/claves.md`](config/claves.md).

**El peso real de lo publicado**, medido con `pnpm tamano` sobre lo construido:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | 205,5 KB     | 106,1 KB                 |
| `admin`         | 181,9 KB     | 106,1 KB                 |
| `web` · `carta` | 164,2 KB     | 106,1 KB                 |

De 250 permitidos. **La cifra de `admin` de la versión anterior de este fichero
estaba mal**: decía 164,1 agrupándola con `web` y `carta`, y el catálogo del
sistema de diseño ya la había subido a 181. Medido de nuevo antes y después de
M4, para no repetir el error.

M4 entero le costó a `app` **8,4 KB**, que es lo que se ahorró por no meter
`@supabase/supabase-js` (unos 40). Está razonado en la
[decisión 0010](docs/decisiones/0010-el-login-es-nuestro.md).

La tipografía se cuenta **entera y a propósito**: una pantalla en castellano solo
descarga el subconjunto `latin`, 38 KB, así que la cifra de verdad es unos 70 KB
menor. Si cabe contando de más, cabe seguro.

---

## 4 · Qué hizo cada módulo

### M0 · Cimientos y disciplina

Monorepo con las cuatro aplicaciones arrancando · TypeScript estricto · ESLint,
Prettier y reglas de dependencia entre capas · migraciones numeradas y reversibles
con ejecutor propio · tres entornos más el de demostración · banderas de función ·
Sentry y registro con su hilo de sesión · integración continua que bloquea ·
publicación en GitHub Pages de las cuatro aplicaciones bajo un dominio.

Las reglas se probaron **incumpliéndolas a propósito**: un import prohibido entre
capas, un `Math.round()` sobre dinero (regla 9) y un `new Date()` en el navegador
(regla 10). Las tres saltaron.

### M1 · Modelo maestro: alcances, roles y permisos

Cuatro niveles de alcance · membresías con vigencia · los doce roles · 33 permisos
en tres familias · herencia y recorte local a local · `locales_visibles` ·
seguridad por filas escrita contra ella · auditoría que solo sabe añadir ·
catálogo maestro con sus tres políticas · traducciones · dispositivos.

Lo que queda demostrado con pruebas, contra Postgres de verdad: un area manager ve
**exactamente** sus tres locales · el bar independiente no ve nada de la cadena ·
**sin decir quién pregunta no se ve absolutamente nada** · una membresía caducada
no da acceso · el cocinero no ve ningún importe · el jefe de sala propone la carta
pero **no la publica** · compras central **no puede cerrar recuentos** · **nadie**
ve los directos ajenos del chat · la auditoría no se deja modificar ni borrar.

**M1 es el módulo del modelo, no del comportamiento.** De las cuatro tablas que
dejó creadas y sin usar, **M4 ha estrenado `dispositivo`**; quedan `traduccion`
(M9) y `politica_de_catalogo` (M24). `auditoria` la estrenó M2.

### M2 · Núcleo técnico y motores transversales

**Los siete motores**, en `packages/dominio` salvo el de permisos. Cálculo puro:
las mismas cuentas dan lo mismo en el servidor y en la pantalla (regla 6).

| Motor         | Qué resuelve                                                                               |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Dinero**    | Céntimos enteros. Reparte sin perder ni ganar: el que sobra, a la primera línea            |
| **Tiempo**    | La fecha operativa, con zona y hora de corte. Probado en las dos noches del cambio de hora |
| **Coste**     | `precio ÷ (factor × rendimiento)` y precio medio ponderado                                 |
| **Fiscal**    | IVA, IGIC e IPSI. Reglas versionadas; nunca recalcula el pasado                            |
| **Textos**    | Español de España, sin jerga y sin emojis. Con su catálogo de errores                      |
| **Permisos**  | El servidor no envía lo que el rol no puede ver: los campos se quitan, no se vacían        |
| **Recálculo** | Precio, elaboración, plato, margen, aviso. Una cola por producto                           |

**La API.** Dos rutas y ninguna más: `GET /vN/consultas/:nombre` y
`POST /vN/comandos/:nombre`. Versionada con compatibilidad N−2, con idempotencia
por cabecera, bandeja de salida transaccional, cola de trabajos con reintento y
versión optimista.

**Un fallo que solo apareció contra Supabase de verdad.** La API no podía ponerse
el disfraz de `estook_api`, porque allí el rol que conecta no es superusuario. Es
la razón de que exista `pnpm bd:comprobar-api`.

### M3 · Sistema de diseño y esqueleto

**La Parte B entera, y el esqueleto de las ocho apps**: las fichas de B1 en
`@theme` · Montserrat autoalojada, dos ficheros y no ocho · los cincuenta iconos
de Lucide reducidos a su figura, 7 KB · veinte componentes base cuyos tipos hacen
cumplir las reglas de B4 · la rueda de apps con arrastre, teclado y rejilla para
«reducir movimiento» · las dos barras de móvil y la de escritorio · el buscador
universal con `pg_trgm` · deshacer universal · la marca vectorizada.

**En la base de datos:** la `0017`, con `pg_trgm`, `sin_acentos` y `estook.buscar`
**sin `security definer`**, para que las políticas de M1 le apliquen.

Al repasar M3 aparecieron **once de los veinte componentes sin pintar ni una vez**.
Ahora hay un **catálogo del sistema de diseño** en `/admin/` que los pinta todos
en sus estados, con su prueba de extremo a extremo.

Y **cinco fallos que encontraron las pruebas, no la vista**: la paleta no cumplía
el contraste de B8 (se oscurecieron tres colores) · Montserrat no se aplicaba ·
las fichas chocaban con Tailwind · el campo de moneda no sabía leerse a sí mismo ·
los nombres se salían de la rueda.

### M4 · Identidad y acceso

**Lo que M4 trae, punto por punto del Plan:**

- **Login único** con correo y contraseña **o PIN**, en un solo formulario. El PIN
  está al mismo nivel y no escondido, porque para media plantilla es la forma
  normal de entrar.
- **Las seis comprobaciones** al entrar, en su orden: suscripción → en qué empresa
  → vista de cadena → «¿dónde estás hoy?» → onboarding a medias → el Panel.
- **Cambio de contexto sin nueva sesión.** El local vive en `estook.sesion`, no en
  el navegador, y **se puede deshacer**.
- **Invitación con el PIN en pantalla**, para darlo en mano. Invitar a un correo
  que ya existe **añade membresía, nunca duplica persona**.
- **Retirar el acceso** mata el PIN al instante y cierra las sesiones. **Reactivar**
  a quien se fue, con su historial.
- **PIN único por local**, garantizado por un índice.
- **Doble factor** con TOTP, exigible desde la organización, con códigos de
  respaldo.
- **Segundo administrador o correo de recuperación obligatorio**, comprobado antes
  de quitar un acceso, no después.
- **Sesiones y dispositivos** en Ajustes → Mi acceso.

**Y lo que M4 arregla de lo que había:** la API dejó de creerse `x-persona-id`.
Mientras existió esa cabecera, cualquiera podía escribir el identificador de otra
persona y ver sus datos llamando a la API a pelo. Era correcto no tener login
antes; dejarla puesta con login no lo sería (regla 4).

#### Las tres decisiones que sostienen M4

**1. El login es nuestro, no de Supabase Auth**
([0010](docs/decisiones/0010-el-login-es-nuestro.md)). Lo decidió a medias la
decisión 0005, que ya había descartado `auth.uid()` para poder probar el modelo en
cualquier Postgres. Con Supabase Auth, dos de las tres capas de pruebas se
quedarían sin poder entrar. Y la mitad de M4 —el PIN por local, matar sesiones—
habría que escribirla igual.

**2. Las contraseñas se derivan en el servidor, no en SQL.** No hay `pgcrypto` en
el Postgres de las pruebas, igual que no había `unaccent` en M3. Se usa PBKDF2 a
210.000 vueltas sobre `crypto.subtle`, que existe igual en Node, Deno y el
navegador, y los parámetros viajan dentro de lo guardado para poder subir el coste
sin invalidar nada.

**3. Las pruebas de extremo a extremo levantan la API de verdad**
([0011](docs/decisiones/0011-la-api-en-las-pruebas.md)). Sin login no se puede
entrar, y sin entrar no se comprueba nada de M3. Se levanta la API entera contra
un Postgres efímero: mismos comandos, mismas políticas, mismas puertas.

#### La pieza de la que se puede estar orgulloso

**«PIN único por local» lo garantiza un índice, no una comprobación.** La sal del
PIN es **del local, no de la persona**, así que el mismo PIN da siempre la misma
huella dentro de un local y `pin_unico_en_su_local` lo rechaza. Comprobarlo a mano
se habría olvidado el día que hubiera un segundo sitio que crea PIN; un índice, no.

Y no cuesta seguridad: contra quien tenga la base de datos entera, la sal por
persona no protege más, porque un PIN de seis dígitos tiene un millón de
combinaciones y la sal está en la fila de al lado. Por eso la derivación es lenta
a propósito.

#### Seis fallos que encontraron las pruebas, no la vista

1. **El area manager volvía al consolidado en cada clic.** La resolución de
   destino se rehace en cada petición, así que sin cuidado quien entra en un local
   sale rebotado. No se veía roto: se veía mal.
2. **A quien entraba y salía el mismo día no se le podía retirar el acceso.** Se
   cerraba la membresía con `hasta = ayer`, y contra las semillas —donde todo el
   mundo entró hoy— eso deja una membresía que acaba antes de empezar. La base de
   datos lo rechazaba con un error en la cara. Se arregló separando el histórico
   (`hasta`) del corte (`revocada_en`), que además hace verdad lo de «al instante».
3. **CORS.** La API ponía las cabeceras de permiso antes de que respondiera la
   ruta, y las rutas devuelven una `Response` propia que las sustituye. Contra la
   API a pelo funcionaba todo; desde un navegador no se podía entrar.
4. **En móvil no había forma de cambiar de local.** El selector vive en la barra
   de escritorio, que es `hidden lg:flex`. Lo cazó una prueba corriendo a 375 px.
5. **El catálogo de errores creció de doce a dieciocho**, y la prueba del catálogo
   falló. Es justo para lo que está: que añadir un error sea una decisión.
6. **Un `waitFor` que no esperaba.** React sustituye el nodo del botón al pintarlo
   como «Entrando…», así que esperar a que se desenganche se cumple al instante.
   No es del producto, pero costó un rato y por eso está escrito.

#### El andamio de M3, borrado entero

`perfiles.ts`, `AvisoDelAndamio.tsx`, el bloque «Perfil de muestra» de Ajustes y
su prueba contra la matriz de roles. No queda ni un fichero. Los tres flujos de
deshacer siguen siendo tres: el del Panel, el tamaño de letra y —en el sitio del
perfil— **cambiar de local**, que es mejor caso porque es lo que se hace sin
querer.

#### Cómo se comprueba que M4 está terminado

Su criterio, punto por punto, es un `describe` de
[`pruebas/e2e/acceso.spec.ts`](pruebas/e2e/acceso.spec.ts):

| Criterio del Plan                                    | Cómo se comprueba                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Una camarera con dos locales elige dónde está        | Nuria entra y se le pregunta; elige, y no se le vuelve a preguntar |
| Un area manager entra en su consolidado              | Ignacio ve su conjunto, entra en un local y vuelve con la flecha   |
| Una llamada a la API pidiendo un local ajeno → `403` | Llamando a la API **a pelo**, sin pasar por la pantalla            |

Corre en escritorio y en móvil pequeño. **Lo automático caza los desbordes; no
sustituye a mirarlo en un teléfono de verdad**, que es lo único de la lista que no
puedo firmar yo.

---

## 5 · Cómo trabajamos

1. **Primero fusionar, después aplicar a Supabase.** La base de datos nunca va
   por delante del código.
2. **«Terminado» solo cuando además no queden preguntas abiertas.**
3. **Una rama por módulo**, y un solo pull request al final.
4. **Ante la duda, preguntar** antes de construir, y preguntar explicado.
5. **Revisar lo propio antes de entregarlo.** Y `ESTADO.md` no puede afirmar
   nada que no sea cierto en ese momento.

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/):

| Núm      | Qué                                                               |
| -------- | ----------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify, con la dirección de hoy           |
| **0002** | La API en Hono sobre Supabase Edge Functions                      |
| **0003** | M0 crea el esqueleto mínimo de alcances                           |
| **0004** | El presupuesto de velocidad de B7, reconstruido                   |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                 |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`  |
| **0010** | **El login es nuestro, no de Supabase Auth**                      |
| **0011** | **Las pruebas de extremo a extremo levantan la API de verdad**    |

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base de datos.** `packages/permisos`
  tiene el vocabulario, no los niveles (regla 6).
- **Las funciones de visibilidad son `security definer`**, o la política de
  `membresia` entra en recursión infinita consigo misma. Pasó de verdad.
- **No se usa `force row level security`**: rompería las semillas y no hace falta.
- **Sesión y correlación son cosas distintas.** Una sesión es una visita; una
  correlación, una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usarDeshacer`), y por eso
  `rules-of-hooks` está apagada en los ficheros que los declaran.
- **El token de sesión viaja en `Authorization: Bearer`, no en una cookie** (M4).
  La aplicación y la API viven en dominios distintos, y una cookie entre dominios
  la bloquean los navegadores. Razonado en `apps/app/src/datos/cliente.ts`.
- **Dependencias de M4: ninguna.** Todo con `crypto.subtle`, que ya estaba.
- **Dependencia nueva justificada:** `@electric-sql/pglite`, solo de desarrollo,
  para tener «Postgres efímero» sin depender de Docker.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/migrar.mjs`
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js`
- `herramientas/comprueba-publicacion.mjs`
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`). Son B1, y los
  nombres de sus claves están elegidos para no chocar con Tailwind.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`,
  `packages/ui/fuentes/` y los PNG de `packages/ui/marca/`.
- **Las migraciones `0001` a `0018`.** Las 17 primeras están aplicadas en
  Supabase; la `0018` se aplica al fusionar. Se amplían con una `0019`, nunca se
  editan (regla 2).
- **`servidor/dominio/secretos.ts` y `doble-factor.ts`** (M4). Es criptografía, y
  está probada contra los vectores del RFC 6238. Un cambio «que parece igual» aquí
  deja a todo el mundo fuera o deja entrar a cualquiera.
- **Las once funciones `security definer` de la `0018`.** Son la única puerta de
  atrás del sistema, están tasadas y hay una prueba que las cuenta. Si un día son
  doce, que sea a propósito y por escrito.

Sobre el candado de `main`: los nombres de las comprobaciones obligatorias van
**sin tilde** — `Calidad`, `Construccion y presupuestos`, `Migraciones
reversibles`. **Nunca añadir `Construir`, `Publicar` ni `Desplegar la API`**: esos
flujos solo corren después de fusionar, y exigirlos antes deja el botón bloqueado
sin salida.

---

## 8 · El siguiente paso · M5

**Onboarding y arranque asistido.** Los ocho pasos del alta · Google Places con
volcado de ficha, reseñas y competidores · régimen fiscal y objetivos · logo y
color con previsualización · camino de grupo con duplicado de local · datos de
ejemplo mínimos etiquetados como ejemplo y borrables de un botón · catálogo de
referencia de unos 250 productos que **nunca se precarga** · importadores con
mapeo propuesto por Fogón · modo demostración con salida limpia · guía de
instalación distinta para iPhone y Android · la tarjeta fija del Panel «Conecta
tus ventas».

**Terminado cuando:** un local termina el alta en menos de cuatro minutos con su
nombre real, su valoración, sus competidores y su marca aplicada; crear un
producto desde el catálogo de referencia lleva menos de quince segundos; el botón
de quitar ejemplos los borra todos sin tocar nada real; y el gasto de Google queda
por debajo de 0,50 €.

**Dependencia que hay que respetar.** El asistente de conexión con el TPV **no se
construye en M5**: vive en M18 y M20. En M5 solo existe la tarjeta del Panel.

**Lo que M4 le deja hecho, y le ahorra:**

- **El registro es lo único que falta de la puerta.** «Tres formas de entrar por
  primera vez: registro, invitación y nada más» (Manifiesto 28). La invitación
  está entera; **el registro es de M5**, porque registrarse es crear el negocio.
- **La quinta comprobación ya le espera.** `local.onboarding_paso` y
  `onboarding_terminado` están creados, y la resolución de destino ya manda al
  alta a quien la tiene a medias. M5 solo tiene que mover el número.
- **La suscripción existe**, con su máquina de estado de la Auditoría de flujos, y
  toda organización nueva nace en prueba de catorce días sin que nadie se acuerde.
  Quien la cobra es M26.
- **`invitar_persona` funciona**, así que el paso «invita a tu equipo» del alta es
  llamar a un comando que ya está probado.

**Cómo se comprueba que M5 no ha roto M4:** `pnpm verifica`, `pnpm prueba:e2e` y
`pnpm bd:comprobar-api` contra Supabase. Las tres pasan hoy —la tercera, en cuanto
se aplique la `0018`— así que cualquier fallo que salga en M5 lo habrá traído M5.
