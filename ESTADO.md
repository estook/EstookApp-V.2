# ESTADO DEL PROYECTO

Última actualización: 1 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Nunca puede afirmar algo que no sea cierto en ese momento.

---

## 1 · Dónde estamos

|                |                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **Terminados** | **M0 ✓** cimientos · **M1 ✓** alcances · **M2 ✓** núcleo técnico · **M3 ✓** diseño y esqueleto |
| **Siguiente**  | **M4** · identidad y acceso                                                                    |
| **Pruebas**    | 407 unitarias y de base de datos · 76 de extremo a extremo                                     |
| **Rama**       | `m3-sistema-de-diseno`, lista para fusionar                                                    |
| **Publicado**  | web viva, con Sentry escuchando                                                                |

---

## 2 · Qué hay que hacer

### Ahora

**Fusionar `m3-sistema-de-diseno`** y, después, aplicar la migración `0017` a
Supabase con `pnpm bd:migrar` (regla 1: primero fusionar, después aplicar).

### Preguntas abiertas para Richi

**1. La paleta de B1 no cumple el contraste de B8, y son las dos cosas escritas.**

Medido, no opinado:

| Combinación                     | Da       | B8 pide            |
| ------------------------------- | -------- | ------------------ |
| Blanco sobre `--naranja`        | 2,61 : 1 | 3 (icono)          |
| `--naranja` sobre `--fondo`     | 2,50 : 1 | 3 (anillo de foco) |
| `--texto-tenue` sobre `--fondo` | 2,97 : 1 | 4,5 (texto)        |
| `--bien` sobre `--fondo`        | 3,96 : 1 | 4,5 (texto)        |
| `--atencion` sobre `--fondo`    | 3,31 : 1 | 4,5 (texto)        |

**No se ha tocado ni un color**: son la marca. Se ha cambiado _cómo se usan_, que
sí es cosa nuestra, y con eso B8 se cumple: el anillo de foco lleva un filo
charcoal, los botones naranjas llevan el texto en charcoal, el color de estado se
queda en el icono y el fondo mientras el texto va en `--texto`, y `--texto-tenue`
**ya no se usa para texto** (hay una prueba que lo impide).

Funciona y se ve bien. **La pregunta es si aun así quieres oscurecer un punto
`--texto-tenue`, `--bien` y `--atencion`**, para poder usarlos como texto sin
rodeos. Es una decisión de marca, no de código. Está todo en
[`contraste.prueba.ts`](packages/ui/src/contraste.prueba.ts).

**2. Faltan dos piezas de marca, y no las puede resolver el código.**

- **El logo horizontal.** La palabra ESTOOK va en una tipografía propia (las O
  cuadradas, la K con su ángulo) que no es Montserrat. Redibujarla a ojo daría un
  logo _parecido_, que es lo peor que le puede pasar a una marca. Hace falta el
  **archivo original** (`.ai`, `.svg`, `.eps` o el Figma). Bloquea la cabecera de
  la web pública; **la aplicación no lo necesita**.
- **El icono de Fogón.** Es una ilustración, no una figura geométrica.
  Vectorizarla a ojo daría otra mascota. **No bloquea nada**: dentro de la
  aplicación, B3 ya dice que Fogón es el icono `flame` de Lucide, y eso es lo que
  usa la barra.

El símbolo (la E de tres barras) **sí se vectorizó**, y salió exacto: es
geometría pura. Detalle en [`packages/ui/marca/LEEME.md`](packages/ui/marca/LEEME.md).

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No es que falte el dato: es
que **no existe un dato único**, porque dependen del bien y de la operación.
Hacen falta tantas reglas como categorías distinga cada tarifa. **Cuando
aparezcan se añaden como filas, sin tocar código.**

Mientras tanto el motor devuelve «sin regla» y para, en vez de inventarse un
tipo. Está en [`docs/decisiones/0006`](docs/decisiones/0006-el-motor-fiscal.md).

### Sin prisa

| Qué                                                                   | Cuándo                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                              |
| Borrar las ramas ya fusionadas en GitHub                              | cuando quieras                                                                 |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                            |
| Volver a `BrowserRouter` cuando haya `estook.com`                     | cuando haya dominio ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
Hasta que haya `estook.com`; entonces basta con declarar `VITE_BASE` a `/`.

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito. Proyecto nuevo; el de la versión 1 sigue apagado y sin tocar.

Comprobado con `pnpm bd:comprobar` contra la base de datos de verdad:

| Qué                            | Cuánto                                         |
| ------------------------------ | ---------------------------------------------- |
| Migraciones aplicadas          | **16 de 17** · la `0017` se aplica al fusionar |
| Tablas en el esquema `estook`  | 18, **todas con seguridad por filas**          |
| Roles · permisos · concesiones | 12 · 33 · 166                                  |
| Reglas fiscales                | 17, todas con su referencia legal              |
| Datos de ejemplo               | 2 organizaciones, 7 locales, 7 personas        |
| Tablas sueltas en `public`     | **0**                                          |
| El area manager ve             | **exactamente 3 locales**                      |
| La auditoría                   | añadir sí · modificar **no** · borrar **no**   |

La conexión va por el agrupador de sesión de Supabase, porque la conexión directa
de los proyectos nuevos solo funciona por IPv6.

**La API se ha probado contra Supabase de verdad**, no solo contra Postgres
efímero: `pnpm bd:comprobar-api` arranca la API entera, se conecta y hace
peticiones reales. Hay que ejecutarla cada vez que se toque la capa de
infraestructura. **Todavía no está desplegada**, y es correcto: no hay a quien
servir hasta que M4 traiga el login.

**Errores:** proyecto `estook-app` en Sentry, con solo «Error monitoring»
encendido y el repositorio enlazado. Cada aplicación se identifica con el commit
exacto que se publicó, para que Sentry pueda señalar qué cambio provocó un fallo.

**Variables del repositorio** (GitHub → Settings → Secrets and variables →
Actions → Variables): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_APP_URL` y `VITE_SENTRY_DSN`, las cuatro declaradas. **En Secrets no hay
nada**, y es correcto: lo verdaderamente secreto vive solo en Supabase. Todo en
[`config/claves.md`](config/claves.md).

**El peso real de lo publicado**, medido con `pnpm tamano` sobre lo construido:

| Aplicación                | Peso inicial | De los cuales tipografía |
| ------------------------- | ------------ | ------------------------ |
| `app`                     | 196,9 KB     | 106,1 KB                 |
| `web` · `carta` · `admin` | 164,1 KB     | 106,1 KB                 |

De 250 permitidos. La tipografía se cuenta **entera y a propósito**: una pantalla
en castellano solo descarga el subconjunto `latin`, 38 KB, así que la cifra de
verdad es unos 70 KB menor. Si cabe contando de más, cabe seguro.

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

Cuatro niveles de alcance (organización, área, local, persona) · membresías con
vigencia · los doce roles · 33 permisos en tres familias · herencia y recorte
local a local · `locales_visibles` · seguridad por filas escrita contra ella ·
auditoría que solo sabe añadir · catálogo maestro con sus tres políticas ·
traducciones · dispositivos con revocación.

**Los tres niveles** (sin acceso · ver · ver y editar) forman una escalera, y eso
es lo que hace que «si alguien tiene dos roles sobre el mismo local, gana el más
amplio» se resuelva comparando, permiso a permiso.

Lo que queda demostrado con pruebas, contra Postgres de verdad:

- Un area manager ve **exactamente** sus tres locales.
- El bar independiente no ve ni un local, ni una organización, ni una persona de
  la cadena. Pedir un local ajeno por su identificador devuelve vacío.
- **Sin decir quién pregunta no se ve absolutamente nada.**
- Una membresía caducada, o que aún no empieza, no da acceso.
- El cocinero no ve ningún importe. El camarero no ve costes, ni ventas, ni el
  cuadrante completo, ni datos de otros.
- El jefe de sala propone cambios en la carta pero **no los publica**.
- Compras central **no puede cerrar recuentos** (conflicto de interés conocido).
- **Nadie**, ni la dirección, ve los directos ajenos del chat.
- La auditoría no se deja modificar ni borrar, ni por permisos ni por su guardián.
- La identidad **no sobrevive** a la transacción, así que no se filtra a la
  siguiente petición.

**M1 es el módulo del modelo, no del comportamiento.** Cuatro tablas están
creadas y protegidas pero todavía sin usar, a propósito. Quién les da vida:

| Tabla                  | Módulo                                     |
| ---------------------- | ------------------------------------------ |
| `auditoria`            | **M2** · la escribe cada comando           |
| `dispositivo`          | **M4** · sesiones, PIN y revocación        |
| `traduccion`           | **M9** · fichas técnicas traducibles       |
| `politica_de_catalogo` | **M24** · propagación del catálogo maestro |

### M2 · Núcleo técnico y motores transversales

**Los siete motores**, en `packages/dominio` salvo el de permisos. Cálculo puro:
las mismas cuentas dan lo mismo en el servidor y en la pantalla, con un solo
dueño (regla 6).

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
`POST /vN/comandos/:nombre`. Versionada con compatibilidad N−2. Con idempotencia
por cabecera, bandeja de salida transaccional, cola de trabajos con reintento y
versión optimista, las cuatro probadas contra Postgres.

**La deuda de M1, saldada.** La consulta `un_local` devuelve 403 sin comprobar de
quién es el local: si las políticas no lo devuelven, no se puede ver. Así la
respuesta es la misma para «no existe» y para «no es tuyo».

**Un fallo que solo apareció contra Supabase de verdad.** La API no podía ponerse
el disfraz de `estook_api`, porque allí el rol que conecta no es superusuario. Es
la razón de que exista `pnpm bd:comprobar-api`.

### M3 · Sistema de diseño y esqueleto

**La Parte B entera, y el esqueleto de las ocho apps.**

**Lo que hay:**

- **Las fichas de B1** en `@theme`, así que generan las utilidades _y_ quedan
  publicadas como variables. Los nombres de B1 (`--r-m`, `--e4`, `--naranja`)
  existen como alias: un valor, dos nombres, y ninguna forma de que se separen.
- **Montserrat autoalojada.** Dos ficheros, no ocho: es fuente variable y Google
  devuelve el mismo para los cuatro pesos (se comprobó, mismo md5). Con su
  `unicode-range`, así que una pantalla en castellano baja 38 KB y nunca los 106.
- **Los cincuenta iconos de Lucide**, descargados y reducidos a su figura: 7 KB
  los cincuenta juntos, contra los cientos de la librería entera.
- **Veinte componentes base**, y los tipos hacen cumplir las reglas de B4: un
  campo sin etiqueta no compila, un estado vacío sin frase tampoco, y las migas
  no aceptan un cuarto nivel.
- **La rueda de apps**, con arrastre, con teclado y con su rejilla para «reducir
  movimiento». La geometría está aparte y probada como lo que es: una cuenta.
- **Las dos barras de móvil** —la general y la de cada app— y la de escritorio
  con sus desplegables.
- **El buscador universal** con `pg_trgm`: sin acentos y aguantando erratas.
  Busca **también acciones**, y esas salen al instante y sin conexión.
- **Deshacer universal**, diez segundos, con `Ctrl+Z`, en tres flujos.
- **El símbolo de la marca, vectorizado**, y los tres PNG que exigen iOS y las
  aplicaciones instalables, generados desde ese mismo SVG.

**Lo que M3 puso en la base de datos:** la migración `0017`, con `pg_trgm`, la
función `sin_acentos` y `estook.buscar`. **Sin `security definer`**, para que las
políticas de M1 le apliquen: un buscador con puerta de atrás sería la forma más
fácil de leer los locales de la competencia escribiendo tres letras. Probado: el
bar independiente busca «bar» y encuentra exactamente uno, el suyo.

**Y dos consultas nuevas:** `mis_permisos`, que es lo que hace posible que la
rueda reparta los sectores; y `buscar`.

#### Cinco fallos que encontraron las pruebas, no la vista

Vale la pena dejarlos escritos, porque los cinco eran invisibles mirando la
pantalla y los cinco habrían llegado a producción:

1. **La paleta contra B8.** Está arriba, en las preguntas abiertas.
2. **Montserrat no se aplicaba.** Mi propia regla `font-family: inherit` para los
   campos incluía `body`, así que body heredaba de `html` la tipografía por
   defecto de Tailwind. La aplicación se veía perfecta... en la fuente del
   sistema.
3. **Las fichas chocaban con Tailwind.** `--radius-r-full` genera
   `rounded-r-full`, que Tailwind ya entiende como «redondea la derecha». El
   botón central de la rueda salía con forma de media pastilla. Se renombraron
   los cinco radios y hay una prueba que impide que vuelva a pasar.
4. **El campo de moneda no sabía leerse a sí mismo.** Enseñaba `10.000,00` y al
   volver a leerlo el punto de los miles lo dejaba en nada: editar un precio de
   más de mil euros vaciaba el campo. Y se reformateaba a cada tecla, así que
   escribir «12,35» era imposible.
5. **Los nombres se salían de la rueda.** Se escriben en horizontal, así que en
   los sectores de las tres y de las nueve crecen _hacia fuera_. Ahora hay una
   prueba que mide las cuatro esquinas de cada palabra.

#### Cómo se comprueba que M3 está terminado

Su criterio, punto por punto, es un `describe` de
[`pruebas/e2e/esqueleto.spec.ts`](pruebas/e2e/esqueleto.spec.ts):

| Criterio del Plan                                    | Cómo se comprueba                                         |
| ---------------------------------------------------- | --------------------------------------------------------- |
| Se navega por las ocho apps sin un salto raro        | Las ocho, con sus pestañas, midiendo desborde a 375 px    |
| La rueda funciona con arrastre y con teclado         | Arrastre con el ratón desde el centro · flechas y `Enter` |
| Deshacer funciona en tres flujos                     | Panel · tamaño de letra · perfil. Más `Ctrl+Z` y el plazo |
| Todos los widgets tienen su «todavía no tengo datos» | Las ocho apps y los widgets del Panel                     |

Corre en escritorio y en móvil pequeño. **Lo automático caza los desbordes; no
sustituye a mirarlo en un teléfono de verdad**, que es lo que pide la regla 11 y
lo único de la lista que no puedo firmar yo.

#### El andamio que M4 se lleva por delante

Sin login no hay a quien preguntar los permisos, y sin permisos la rueda se
quedaría vacía. En vez de inventarse que se tienen las ocho apps —que sería
mentir y además taparía el fallo el día que la consulta falle de verdad— hay
**seis perfiles de muestra** copiados de las semillas, la aplicación **lo dice
arriba con todas las letras**, y se cambia de perfil en Ajustes.

No es una función del producto: es lo que permite comprobar **hoy** que la rueda
de una camarera tiene cuatro sectores y la de una gerente ocho. Y **no puede
mentir**: hay una prueba contra Postgres que compara los seis perfiles, permiso a
permiso, con la matriz de roles de M1, y falla si dejan de cuadrar.

**Dependencias nuevas, justificadas:** `tailwindcss` y `@tailwindcss/vite` (los
estilos que fija A3), `react-router-dom` y `@tanstack/react-query` (también de
A3) y `recharts` (las gráficas de A3, cargado aparte para que no entre en el
paquete inicial). **`Motion` no se ha instalado**, y está razonado en
[`0007`](docs/decisiones/0007-el-movimiento-sin-libreria.md).

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

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base de datos.** `packages/permisos`
  tiene el vocabulario, no los niveles (regla 6). Una prueba comprueba que los
  dos catálogos cuadran.
- **Las funciones de visibilidad son `security definer`**, o la política de
  `membresia` entra en recursión infinita consigo misma. Pasó de verdad.
- **No se usa `force row level security`**: rompería las semillas y no hace falta.
- **Sesión y correlación son cosas distintas.** Una sesión es una visita; una
  correlación, una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usarDeshacer`), y por eso
  `rules-of-hooks` está apagada en los ficheros que los declaran: la regla
  reconoce los ganchos por el prefijo `use` y no entiende otro idioma.
  `exhaustive-deps`, que es la que caza errores de verdad, sigue encendida. Está
  escrito en `eslint.config.js`.
- **Dependencia nueva justificada:** `@electric-sql/pglite`, solo de desarrollo,
  para tener «Postgres efímero» sin depender de Docker.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/`
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js`
- `herramientas/comprueba-publicacion.mjs`
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`). Son B1, y los
  nombres de sus claves están elegidos para no chocar con Tailwind: hay una
  prueba que lo comprueba y explica por qué.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`,
  `packages/ui/fuentes/` y los PNG de `packages/ui/marca/`. Se rehacen con su
  herramienta, no a mano.
- **Las migraciones `0001` a `0017`.** Las 16 primeras están aplicadas en
  Supabase; la `0017` se aplica al fusionar. Se amplían con una `0018`, nunca se
  editan (regla 2).

Sobre el candado de `main`: los nombres de las comprobaciones obligatorias van
**sin tilde** — `Calidad`, `Construccion y presupuestos`, `Migraciones
reversibles`. **Nunca añadir `Construir` ni `Publicar`**: ese flujo solo corre
después de fusionar, y exigirlo antes deja el botón bloqueado sin salida.

---

## 8 · El siguiente paso · M4

**Identidad y acceso.** Login único con correo y contraseña o PIN · selector de
organización y luego de local, con cambio de contexto sin nueva sesión ·
resolución de destino tras entrar (las seis comprobaciones) · invitación con PIN
mostrado en pantalla · invitar a un correo existente añade membresía, nunca
duplica persona · reactivar a quien se fue · PIN único por local · doble factor
exigible desde la organización · segundo administrador o correo de recuperación
obligatorio · sesiones y dispositivos.

**Terminado cuando:** una camarera con dos locales elige dónde está; un area
manager entra en su consolidado; y una llamada a la API pidiendo un local ajeno
devuelve `403`.

**Lo que M3 le deja hecho, y le ahorra:**

- **El esqueleto entero.** M4 no pinta ni una barra: pone quién entra y el
  esqueleto se acomoda solo.
- **`mis_permisos` ya existe y está probada.** M4 solo tiene que decir quién es;
  la rueda se reparte sola.
- **La tabla `dispositivo`** lleva creada y protegida desde M1, esperándole.
- **El andamio de los perfiles de muestra se borra entero**: `perfiles.ts`,
  `AvisoDelAndamio.tsx` y el bloque «Perfil de muestra» de Ajustes. Su prueba
  contra la matriz de roles también.
- **La API está montada y probada contra Supabase, pero sin desplegar.** M4 es
  quien la despliega, porque es quien trae a alguien a quien servir.
