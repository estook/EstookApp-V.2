# ESTADO DEL PROYECTO

Última actualización: 2 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Nunca puede afirmar algo que no sea cierto en ese momento.

---

## 1 · Dónde estamos

|                |                                                                                    |
| -------------- | ---------------------------------------------------------------------------------- |
| **Terminados** | **M0 ✓** · **M1 ✓** · **M2 ✓** · **M3 ✓** · **M4 ✓** identidad y acceso            |
| **Siguiente**  | **M5** · onboarding y arranque asistido                                            |
| **Pruebas**    | 532 unitarias y de base de datos · 136 de extremo a extremo · 40 contra Supabase   |
| **Rama**       | `main`. M4 fusionado. Falta aplicar la `0018` y la `0019` a Supabase               |
| **Publicado**  | web viva. **La API todavía no está desplegada**, y la aplicación lo dice al entrar |

---

## 2 · Qué hay que hacer

### Ahora · lo que M4 deja pendiente de un botón

De los cuatro pasos que M4 dejó pendientes, **los dos primeros ya están hechos**.
Quedan dos, y los tiene que pulsar Richi porque tocan Supabase y GitHub. Están
explicados paso a paso en
[`docs/pasos-para-cerrar-m4.md`](docs/pasos-para-cerrar-m4.md).

1. ~~Fusionar el pull request~~ · hecho
2. ~~`pnpm bd:migrar` y `pnpm bd:sembrar` contra Supabase~~ · hecho el 2 de
   septiembre de 2026. 19 migraciones, 23 tablas todas con seguridad por filas, y
   `bd:comprobar-api` en verde contra esa misma base.
3. **Declarar los dos secretos y desplegar la API** · desde Actions
4. **Declarar `VITE_API_URL`** para que la aplicación publicada sepa a dónde
   llamar

Hasta el paso 4, la pantalla de entrar dice «todavía no hay servidor al que
preguntar», que es la verdad.

Los PIN de las personas de ejemplo **no están escritos en ningún sitio**, aquí
tampoco: lo que se guarda es su huella. Si se pierden, se vuelve a ejecutar
`pnpm bd:sembrar` y salen otros.

### Lo que 538 pruebas en verde no podían ver

El primer despliegue de verdad se cayó con todo en verde:

```
Error: failed to create the graph
  Relative import path "@estook/utiles" not prefixed with / or ./ or ../
```

No es que las pruebas fueran malas. Es que **corren en Node**, donde
`@estook/utiles` lo resuelve pnpm con los enlaces del espacio de trabajo, y la
API desplegada **corre en Deno**, que no hace eso: para él, cualquier cosa que no
empiece por `/`, `./` o `../` hay que declararla en un mapa de importaciones.

Había un camino entero —el que de verdad llega al cliente— que no comprobaba
nadie hasta el momento de desplegar. Ahora:

- El mapa está en [`supabase/functions/api/deno.json`](supabase/functions/api/deno.json),
  con los nuestros apuntando al fuente y los de fuera con versión exacta.
- `pnpm grafo` lo recorre entero desde la misma entrada que usa Supabase, y está
  en `verifica` y en la integración continua.
- Y de paso mira que nadie lea `process.env` en ese camino: en Deno el sitio es
  `Deno.env`, y eso no falla al desplegar sino al atender la primera petición.
  Se lee con `variable()` de `@estook/utiles`, que mira en los dos sitios.

**Lo comprueba una herramienta nuestra y no un Deno de verdad, a propósito.** Se
intentó con `deno info` y pasaba igual de verde con el fallo puesto, porque Deno
lee el `package.json` del espacio de trabajo y resuelve por su cuenta; ni
desactivando `node_modules` ni el `package.json` se le quita. El empaquetador de
Supabase no hace eso. Una comprobación que no puede fallar es peor que no
tenerla, porque da confianza.

El otro fallo del mismo día fue más tonto: `supabase/setup-cli` con
`version: latest` le pregunta a la API de GitHub sin identificarse y se topa con
el límite de peticiones. Va con versión fija.

### Y el 404 de después: la raíz que impone Supabase

Con el grafo ya resuelto, la función **se desplegó bien y contestó `404` a todo**.
Es de los errores más desconcertantes que hay, porque parece que no está
desplegada cuando lo está y está funcionando: ese «404 Not Found» lo escribía
Hono, no la puerta de Supabase.

Supabase sirve las funciones en `/functions/v1/<nombre>/...` y **le pasa a la
función la ruta con su propio nombre delante**. La nuestra se llama `api`, así
que llegaba `/api/salud` a una API que sólo conocía `/salud`.

Ahora la API entera cuelga de `RAIZ_DE_LA_API`. Va **en la aplicación, no
quitando el prefijo en el fichero de Supabase**, que era la otra opción:
quitarlo allí haría que lo desplegado atendiera rutas distintas de lo probado, y
ese es justo el agujero por el que se coló todo esto. Las pruebas, la
herramienta de comprobación y el e2e piden ahora por la misma raíz que pedirá un
móvil.

Queda fijado en dos pruebas: que `/api/salud` responde, y que `/salud` a secas no.

### Los nombres de los dos secretos, y por qué no son los obvios

Se llamaban `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`, y con esos nombres
acabaron donde no iban: en la consola de Supabase, que **reserva el prefijo
`SUPABASE_`** y los rechaza con un error que no explica por qué. Ahora son
`TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`, van en GitHub, y al leerlos se nota
de quién son. Un nombre que se parece al de otro sitio es un nombre que acabará
en otro sitio.

### Si la terminal dice que no conoce `pnpm`

No es que falte: es que **una ventana ya abierta se queda con el PATH que había
cuando se abrió**. Se cierra la ventana y se abre otra. Y si aun así no, en la
raíz hay [`estook.cmd`](estook.cmd), que lo busca donde de verdad está:
`.\estook.cmd bd:migrar`.

### El repaso de después de desplegar

Con M4 sirviendo de verdad se hizo el primer repaso **mirando algo que
funciona**, y salieron cosas que ninguna prueba veía. Está entero en
[`docs/repaso-despues-de-m4.md`](docs/repaso-despues-de-m4.md). Lo que hay que
tener presente al empezar M5:

- **Hay tres mecanismos de fondo y ninguno se ejecuta**: la bandeja de salida, la
  cola de trabajos y la limpieza de claves de idempotencia. Están construidos y
  probados, pero la API es una función que atiende y se apaga: no hay reloj. Hay
  que decidir quién los ejecuta **antes de M8**, y merece su decisión escrita.
- **`estook.dispositivo` está vacía**: 0 filas, 0 sesiones con dispositivo. Nadie
  escribe en ella, así que «Mis dispositivos» enseña sesiones y no aparatos. Es
  lo que hacía que salieran veintitrés filas iguales. Se paga solo si se arregla
  con M5, que ya toca el alta de personas.
- **Ninguna consulta de lista tiene tope.** Con siete personas da igual; M8 es la
  primera pantalla que lista gente de verdad y conviene que nazca paginada.
- **El presupuesto de tamaño de la app va al 82 %**, con las pantallas grandes
  todavía por construir. No manda sobre el producto: se vigila con `pnpm tamano`.

### Lo único de M4 que no puedo firmar yo

**Verlo en un móvil de verdad** (regla 11) **con la API desplegada**. Las fotos
de M4 en el teléfono ya sirvieron para encontrar dos cosas —están abajo— pero lo
que se vio fue la puerta, no lo de dentro: sin API no hay dónde entrar.

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No es que falte el dato: es
que **no existe un dato único**, porque dependen del bien y de la operación.
Cuando aparezcan se añaden como filas, sin tocar código. Mientras tanto el motor
devuelve «sin regla» y para, en vez de inventarse un tipo
([`0006`](docs/decisiones/0006-el-motor-fiscal.md)).

### Sin prisa

| Qué                                                                   | Cuándo                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                              |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                            |
| Volver a `BrowserRouter` cuando haya `estook.com`                     | cuando haya dominio ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |
| El vectorial del logotipo y de Fogón                                  | cuando aparezcan; se sustituyen en un sitio                                    |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
El **catálogo del sistema de diseño** está en `/admin/`.

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito. La conexión va por el agrupador de sesión, porque la directa de los
proyectos nuevos solo funciona por IPv6.

Comprobado con `pnpm bd:comprobar` contra la base de datos de verdad, **antes de
aplicar la `0018`**:

| Qué                            | Cuánto                                       |
| ------------------------------ | -------------------------------------------- |
| Migraciones aplicadas          | **17 de 19** · faltan la `0018` y la `0019`  |
| Tablas en el esquema `estook`  | 18, todas con seguridad por filas            |
| Roles · permisos · concesiones | 12 · 33 · 166                                |
| Reglas fiscales                | 17, todas con su referencia legal            |
| Datos de ejemplo               | 2 organizaciones, 7 locales, 7 personas      |
| El area manager ve             | **exactamente 3 locales**                    |
| La auditoría                   | añadir sí · modificar **no** · borrar **no** |

Al aplicar la `0018` y la `0019` pasan a ser **23 tablas** y **8 personas**: M4
añade `credencial`, `pin`, `doble_factor`, `sesion` y `suscripcion`, y las
semillas añaden a Nuria, que es la camarera con dos locales del criterio de M4.

**La API sigue sin desplegar**, y ya no es correcto: es lo único que le falta a
M4 para estar en pie. Lo que hay montado, probado y listo está en
`supabase/functions/api/`, y lo despliega el flujo `Desplegar la API`.

**Errores:** proyecto `estook-app` en Sentry, con solo «Error monitoring»
encendido y el repositorio enlazado.

**Variables del repositorio:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_APP_URL` y `VITE_SENTRY_DSN`. **Falta `VITE_API_URL`**, que es el paso 4.
En Secrets **faltan los dos de M4**: `TOKEN_DE_SUPABASE` y
`PROYECTO_DE_SUPABASE`. Todo en [`config/claves.md`](config/claves.md).

**El peso real de lo publicado**, medido con `pnpm tamano`:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | 205,5 KB     | 106,1 KB                 |
| `admin`         | 181,9 KB     | 106,1 KB                 |
| `web` · `carta` | 164,2 KB     | 106,1 KB                 |

De 250 permitidos. **M4 entero le costó a `app` 8,6 KB**: el login, las cuatro
pantallas de la puerta, «Mi acceso» y los accesos del equipo.

> Corrección: hasta ahora este documento decía que `admin` pesaba 164,1 KB, junto
> con `web` y `carta`. **Era falso desde M3**: el catálogo del sistema de diseño
> ya lo dejaba en 181. Se midió construyendo con y sin M4 para saber qué había
> añadido cada módulo, y salió que M4 le suma 0,6 KB.

La tipografía se cuenta **entera y a propósito**: una pantalla en castellano solo
descarga el subconjunto `latin`, 38 KB. Si cabe contando de más, cabe seguro.

---

## 4 · Qué hizo cada módulo

### M0 · Cimientos y disciplina

Monorepo con las cuatro aplicaciones · TypeScript estricto · ESLint, Prettier y
reglas de dependencia entre capas · migraciones numeradas y reversibles con
ejecutor propio · tres entornos más el de demostración · banderas de función ·
Sentry con su hilo de sesión · integración continua que bloquea · publicación en
GitHub Pages bajo un dominio.

Las reglas se probaron **incumpliéndolas a propósito**: un import prohibido entre
capas, un `Math.round()` sobre dinero y un `new Date()` en el navegador. Las tres
saltaron.

### M1 · Modelo maestro: alcances, roles y permisos

Cuatro niveles de alcance · membresías con vigencia · los doce roles · 33
permisos · herencia y recorte local a local · `locales_visibles` · seguridad por
filas escrita contra ella · auditoría que solo sabe añadir · catálogo maestro ·
traducciones · dispositivos.

Queda demostrado con pruebas contra Postgres de verdad: el area manager ve
**exactamente** sus tres locales; el bar independiente no ve nada de la cadena;
**sin decir quién pregunta no se ve absolutamente nada**; una membresía caducada
no da acceso; el cocinero no ve ningún importe; compras central no puede cerrar
recuentos; nadie ve los directos ajenos del chat; y la identidad no sobrevive a
la transacción.

### M2 · Núcleo técnico y motores transversales

Los siete motores en `packages/dominio`, salvo el de permisos: dinero en céntimos
enteros, la fecha operativa del servidor, coste, fiscal, textos, permisos y
recálculo. Cálculo puro, un solo dueño (regla 6).

**La API.** Dos rutas y ninguna más, versionada con compatibilidad N−2, con
idempotencia por cabecera, bandeja de salida transaccional, cola de trabajos y
versión optimista.

**Un fallo que solo apareció contra Supabase de verdad.** La API no podía
ponerse el disfraz de `estook_api`. Es la razón de que exista
`pnpm bd:comprobar-api`.

### M3 · Sistema de diseño y esqueleto

La Parte B entera y el esqueleto de las ocho apps: las fichas de B1, Montserrat
autoalojada, los cincuenta iconos, veinte componentes base, la rueda de apps, las
barras, el buscador universal con `pg_trgm`, deshacer universal y la marca.

Cinco fallos los encontraron las pruebas y no la vista: la paleta contra el
contraste de B8, Montserrat que no se aplicaba, las fichas que chocaban con
Tailwind, el campo de moneda que no sabía leerse a sí mismo, y los nombres que se
salían de la rueda.

### M4 · Identidad y acceso

**El login entero, y el andamio de M3 fuera.**

**Lo que hay:**

- **Entrar con correo y contraseña, o con el PIN del local.** Un solo formulario,
  porque para quien entra es una sola cosa. El PIN está al mismo nivel y no
  escondido: para media plantilla es la forma normal de entrar.
- **Las seis comprobaciones**, en su orden, como cálculo puro y probado:
  suscripción → varias organizaciones → alcance de cadena → «¿dónde estás hoy?» →
  onboarding a medias → el Panel.
- **Cambio de contexto sin nueva sesión.** El local vive en `estook.sesion`, no
  en el navegador, y cambiarlo **se puede deshacer**.
- **Invitación con el PIN en pantalla**, para darlo en mano. Invitar a un correo
  que ya existe añade membresía y **nunca duplica la persona**.
- **Retirar el acceso mata el PIN al instante** y cierra las sesiones. Reactivar
  a quien se fue le devuelve todo.
- **PIN único por local**, garantizado por un índice único y no por una
  comprobación. Funciona porque la sal es del local.
- **Doble factor propio** (TOTP), exigible desde la organización, probado contra
  los vectores del RFC 6238.
- **Segundo administrador o correo de recuperación**, comprobado **antes** de
  quitar un acceso.
- **«Mi acceso»**: contraseña, PIN, doble factor y mis dispositivos.

**Lo que M4 puso en la base de datos:** la `0018` con cinco tablas nuevas, once
funciones con privilegio y la revocación con hora; y la `0019`, que arregla un
fallo del propio M4 (abajo).

**Y lo que quitó, que es media M4:** la cabecera `x-persona-id`. Hasta M4 la API
se creía lo que le dijeran. Ahora quien llama trae un token y la identidad sale
de resolverlo. Hay una prueba que comprueba que esa cabecera **ya no abre nada**.

#### Las tres puertas

Sin sesión, con el segundo factor pendiente, y con una contraseña que puso otra
persona. Las mira el **despachador**, una vez, por todas las operaciones: una
operación nueva nace protegida sin hacer nada, y abrir una puerta se declara.

#### Cinco fallos que M4 encontró, y cómo

Los tres primeros los cazaron las pruebas de extremo a extremo contra la API de
verdad; contra la API a pelo funcionaba todo.

1. **CORS.** Las cabeceras se ponían antes de que respondiera la ruta, y las
   rutas devuelven una `Response` propia que las sustituye. Desde un navegador no
   se podía entrar.
2. **En móvil no se podía cambiar de local.** El selector vive en la barra de
   escritorio, que es `hidden lg:flex`. Quien trabaja en dos locales se quedaba
   encerrado en uno.
3. **A quien entró hoy no se le podía retirar el acceso.** Cerrar la membresía
   con `hasta = ayer` rompía una restricción de la `0002`. Se resolvió separando
   el histórico (`hasta`) del corte (`revocada_en`).
4. **El area manager volvía al consolidado en cada clic.** La resolución de
   destino se rehace en cada petición y no miraba si ya había entrado en un
   local. Lo cazó una prueba de `destino.prueba.ts`.
5. **El código TOTP se comprobaba contra sí mismo.** Se cambió por los vectores
   del RFC 6238, que son los que publica el estándar: si pasan, la aplicación de
   autenticación de la gerente enseña los mismos números.

#### Y tres más, que encontró el repaso **después de fusionar**

Estos son los que más vale la pena dejar escritos, porque las 532 pruebas pasaban
con los tres puestos.

1. **El token de sesión se guardaba en claro en la base de datos.** La
   idempotencia de M2 guarda la respuesta de cada comando para devolverla en los
   reintentos, y `entrar` devuelve el token. Es decir: la sesión guardaba solo la
   huella —a propósito, para que quien se llevara la base no se llevara ninguna
   sesión— y la tabla de al lado guardaba el token entero, veinticuatro horas.
   Ahora **un comando que devuelve un secreto no se recuerda**, y son seis.
2. **`exige` estaba en el contrato desde M2 y no lo miraba nadie.** Las
   operaciones quedaban protegidas igual, porque las políticas de M1 no dejan
   escribir sin permiso, pero la protección llegaba como un error de Postgres: un
   cocinero que intentaba invitar recibía un `500` y un «se nos ha roto algo por
   dentro», que además de feo es mentira. Ahora se comprueba antes de ejecutar, y
   la API tiene una red que traduce lo que se escape.
3. **Invitar a alguien nuevo no funcionaba en absoluto.** `estook.persona` tenía
   seguridad por filas y ninguna política de alta. No se veía porque el comando
   crea la persona **solo si el correo no existe**, y contra las semillas, donde
   las siete ya están, ese camino no se recorría nunca.

   Y lo que costó entender: poner una política de `insert` **no bastaba**. Con
   `returning`, Postgres aplica además la política de **lectura** a la fila
   devuelta, y una persona recién creada no tiene membresía, así que no comparte
   organización con nadie y no se puede leer. El `insert` entraba y el `returning`
   lo tumbaba, con el mismo mensaje que si no hubiera política ninguna. Lo
   arregla la `0019` con una función, y hay una prueba que deja escrito el
   porqué.

#### Los textos, que se vieron en un móvil de verdad

Richi miró las tres páginas publicadas en su teléfono, y ahí salió algo que
ninguna prueba miraba: **M0 y M3 escribían sin tildes y M4 con ellas**. En la
misma aplicación convivían «todavia no tengo datos» y «¿Dónde estás hoy?».

Se arreglaron los 33 sitios y **se dejó comprobado**: `pnpm textos` recorre todo
el texto de pantalla y falla si aparece una palabra que en castellano lleva tilde
siempre. Está en la integración continua, al lado del presupuesto de tamaño.

La lista **no** incluye palabras ambiguas —`esta`/`está`, `mas`/`más`,
`cuanto`/`cuánto`— porque una comprobación que grita se acaba apagando.

#### Cómo se comprueba que M4 está terminado

Su criterio, punto por punto, es
[`pruebas/e2e/acceso.spec.ts`](pruebas/e2e/acceso.spec.ts):

| Criterio del Plan                             | Cómo se comprueba                                       |
| --------------------------------------------- | ------------------------------------------------------- |
| Una camarera con dos locales elige dónde está | Nuria, sembrada para esto, con «¿Dónde estás hoy?»      |
| Un area manager entra en su consolidado       | Ignacio entra en el conjunto, no en un local            |
| Un local ajeno devuelve `403`                 | **Llamando a la API a pelo**, sin pasar por la pantalla |

Y el ciclo entero de una persona —invitar, entrar con su PIN, retirar,
reactivar—, que es la prueba que faltaba y por la que el tercer fallo del repaso
llegó a fusionarse.

---

## 5 · Cómo trabajamos

1. **Primero fusionar, después aplicar a Supabase.** La base de datos nunca va
   por delante del código.
2. **«Terminado» solo cuando además no queden preguntas abiertas.**
3. **Una rama por módulo**, y un solo pull request al final.
4. **Ante la duda, preguntar** antes de construir, y preguntar explicado.
5. **Revisar lo propio antes de entregarlo.** Y `ESTADO.md` no puede afirmar
   nada que no sea cierto en ese momento.
6. **Un repaso después de fusionar vale la pena.** M4 pasó sus 532 pruebas con
   tres fallos dentro, y uno era de seguridad. Las pruebas dicen que lo que se
   probó funciona, no que se haya probado lo que importa.

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

- **La matriz de permisos vive solo en la base de datos.** Una prueba comprueba
  que los dos catálogos cuadran.
- **Las funciones de visibilidad son `security definer`**, o la política de
  `membresia` entra en recursión infinita consigo misma.
- **No se usa `force row level security`**: rompería las semillas.
- **Sesión y correlación son cosas distintas.** Una sesión es una visita; una
  correlación, una acción dentro de ella.
- **Los ganchos de React se llaman en español**, y por eso `rules-of-hooks` está
  apagada donde se declaran. `exhaustive-deps` sigue encendida.
- **El token va en `Authorization: Bearer` y no en una cookie**, porque la
  aplicación y la API viven en dominios distintos. Razonado en
  `apps/app/src/datos/cliente.ts`.
- **Dependencias nuevas justificadas:** `@electric-sql/pglite`, solo de
  desarrollo. **M4 no añadió ninguna**: las contraseñas, el segundo factor y los
  tokens se hacen con `crypto.subtle`, que existe igual en Node, en Deno y en el
  navegador.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/migrar.mjs`
- `.dependency-cruiser.cjs` y las reglas 9 y 10 de `eslint.config.js`
- `herramientas/comprueba-publicacion.mjs`
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`). Son B1, y sus
  nombres están elegidos para no chocar con Tailwind.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`,
  `packages/ui/fuentes/` y los PNG de `packages/ui/marca/`.
- **Las migraciones `0001` a `0019`.** Se amplían con una `0020`, nunca se editan
  (regla 2).
- **Las once funciones `security definer` de la `0018` y la de la `0019`.** Son
  la única puerta de atrás del sistema, existen porque al entrar todavía no hay
  identidad que consultar, y están tasadas. Hay una prueba que las cuenta: si un
  día son trece, que sea a propósito.

Sobre el candado de `main`: los nombres de las comprobaciones obligatorias van
**sin tilde** — `Calidad`, `Construccion y presupuestos`, `Migraciones
reversibles`. **Nunca añadir `Construir` ni `Publicar`**: ese flujo solo corre
después de fusionar.

---

## 8 · El siguiente paso · M5

**Onboarding y arranque asistido.** Los ocho pasos del alta · Google Places con
volcado de ficha, reseñas y competidores · régimen fiscal y objetivos · logo y
color con previsualización · camino de grupo con duplicado de local · datos de
ejemplo mínimos etiquetados como ejemplo · catálogo de referencia de unos 250
productos · importadores con mapeo propuesto por Fogón · modo demostración ·
guía de instalación · la tarjeta fija del Panel «Conecta tus ventas».

**Terminado cuando:** un local termina el alta en menos de cuatro minutos con sus
datos reales; crear un producto desde el catálogo de referencia lleva menos de
quince segundos; el botón de quitar ejemplos los borra todos; y el gasto de
Google queda por debajo de 0,50 €.

**Lo que M4 le deja hecho:**

- **El login y la sesión.** M5 no tiene que preguntarse quién entra.
- **El hueco del onboarding ya existe**: `local.onboarding_paso` y
  `onboarding_terminado`, y la quinta comprobación ya lleva ahí a quien tenga el
  alta a medias. M5 solo tiene que llenar los ocho pasos.
- **`suscripcion` está creada** con su máquina de estado. M26 la cobra; M5 la
  encuentra puesta.
- **Invitar funciona de verdad**, con su PIN en pantalla.
- **La API de pruebas** levanta el servidor entero contra un Postgres efímero.
  M5 puede escribir pruebas de extremo a extremo sin montar nada.

**Dependencia que hay que respetar:** el asistente de conexión con el TPV **no se
construye en M5**: vive en M18 y M20. En M5 solo existe la tarjeta del Panel.

**Cómo se comprueba que M5 no ha roto M4:** `pnpm verifica`, `pnpm prueba:e2e:completa`
y `pnpm bd:comprobar-api` contra Supabase. Los tres pasan hoy.
