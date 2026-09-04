# ESTADO DEL PROYECTO

Última actualización: 4 de septiembre de 2026 · M6 fusionado · el segundo paseo por el móvil

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Nunca puede afirmar algo que no sea cierto en ese momento.

---

## 1 · Dónde estamos

|                |                                                                                       |
| -------------- | ------------------------------------------------------------------------------------- |
| **Terminados** | **M0 ✓** · **M1 ✓** · **M2 ✓** · **M3 ✓** · **M4 ✓** · **M5 ✓** · **M6 ✓** inventario |
| **Siguiente**  | **M7** · Proveedores y compras                                                        |
| **Pruebas**    | 695 unitarias y de base de datos · 224 de extremo a extremo                           |
| **Rama**       | M6 en `main` (PR #30, #33). El repaso del móvil, en un pull request abierto           |
| **Publicado**  | Base en la `0023` · **falta aplicar la `0024`** · **la API sin desplegar con M6**     |
| **Entrar**     | La cuenta de Ricardo, con su negocio. Ninguna cuenta de ejemplo puede entrar          |
| **Dirección**  | **Evolución de producto 1.0**, de aplicación de gestión a sistema operativo del local |

---

## 0 · Los cinco documentos maestros

Viven en [`docs/maestros/`](docs/maestros/) **en Markdown**, y el PDF es lo que
sale: `pnpm maestros`. Antes existían solo como PDF en un escritorio, sin fuente
ni historial, así que corregir una línea obligaba a rehacer el documento entero.

Se leen en este orden:

| Documento                                                                | Qué responde                       | Cuándo se lee            |
| ------------------------------------------------------------------------ | ---------------------------------- | ------------------------ |
| [Evolución 1.0](docs/maestros/Estook-Evolucion-1.0.md)                   | Hacia dónde va y en qué orden      | **Primero, siempre**     |
| [Manifiesto](docs/maestros/Estook-Manifiesto.md)                         | Qué es el producto y cuánto cuesta | Antes de diseñar         |
| [Plan de desarrollo](docs/maestros/Estook-Plan-de-Desarrollo.md)         | Cómo se construye y con qué reglas | Antes de escribir código |
| [Roles y administración](docs/maestros/Estook-Roles-y-Administracion.md) | Qué ve exactamente cada persona    | Antes de tocar permisos  |
| [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)       | Qué desencadena cada cambio        | Antes de cerrar módulo   |

**Precedencia cuando dos parezcan decir cosas distintas:** manda el más
específico. Si de verdad se contradicen, se para y se pregunta (regla 13).

### Lo que cambia con la Evolución 1.0

- **El presupuesto de 250 KB deja de ser una norma.** `pnpm tamano` mide, avisa
  y **no bloquea**. Lo que sigue bloqueando es el presupuesto de **velocidad**, y
  la regla de que ninguna dependencia entra sin justificarse.
- **Estook pasa a ser el sistema operativo del restaurante**: las ocho apps se
  mantienen, y encima van el Panel como centro de control, **Estook Pulse**,
  **Fogón transversal**, el **centro de alertas** y las **integraciones**.
- **Regla 14 nueva en el Plan:** nada entra aislado. Antes de construir algo se
  responde qué datos usa, quién se entera cuando cambien, qué automatiza Fogón y
  qué aprueba una persona.
- **Dos módulos nuevos:** M29 canales de reparto e integraciones, y M30 API
  pública. Van al final a propósito: una integración sobre un dominio a medio
  cerrar se rehace entera.
- **M5 no se movió**, y ya está hecho. La evolución no reordena los cimientos:
  lo que cambia es que **a partir de M6** cada módulo nace ya con su capa
  inteligente dentro, en vez de construirse plano y volver después.

---

## 2 · Qué hay que hacer

**M5 está cerrado.** Se probó en un móvil de verdad el 3 de septiembre de 2026 y
funciona: el alta entera, la tarjeta del Panel, invitar a mano, y la guía de
instalación donde toca.

**M6 está fusionado y la `0023` aplicada. Falta aplicar la `0024`, desplegar la
API y mirarlo en un móvil.**

El primer paseo por el móvil ya se dio, y **salieron seis fallos de pantalla**:
ninguno rompía ninguna de las 692 pruebas que había. Arreglándolos salieron dos
más, y uno de los dos es el más grave de todo M6: **la pantalla «Hoy» devolvía un
`500` a todo el mundo, siempre**. Están todos abajo, en la ficha de M6.

Y el orden importa, porque **hay un paso que se olvida y rompe todo**: las cuatro
aplicaciones se publican solas al fusionar, pero **la API se despliega a mano**.
Entre una cosa y otra, la pantalla de Inventario está publicada y el servidor no
conoce ninguna de sus operaciones: entrar en Inventario devuelve «Eso ya no está»
en cada pantalla y parece que el módulo está roto.

Eso ya no se puede olvidar en silencio: `pnpm bd:comprobar-api` le pregunta a la
API **desplegada** si conoce todas las consultas del código, y si va por detrás lo
dice con esas palabras. Los pasos están en
[`docs/pasos-para-cerrar-m6.md`](docs/pasos-para-cerrar-m6.md).

### Lo único que sigue abierto de M5

- **El almacén del logo.** Falta la clave `service_role` de Supabase en
  `.env.local` y ejecutar `pnpm almacen:preparar`, que crea el cubo y comprueba
  el camino entero: sube, firma, lee y borra. **No bloquea nada**: el color de la
  marca funciona, y el paso del logo dice que todavía no hay dónde guardarlo.
  Está en [`docs/pasos-para-cerrar-m5.md`](docs/pasos-para-cerrar-m5.md).

### Lo que hay que decidir antes de M8, y no lo decide M5

**Quién ejecuta los procesos de fondo.** Hoy `servidor/trabajos/` existe, está
probado y **no lo llama nadie**: no hay reloj. Eso significa que la bandeja de
eventos se llena y no se vacía, y que las claves de idempotencia no se limpian.

Nada de eso se pierde ni rompe nada hoy. Hay que elegir entre `pg_cron` dentro de
Supabase, una acción programada de GitHub, o un servicio aparte. **Es una
decisión de Richi**, y no se inventa.

**M6 se preguntó esto y siguió sin decidirlo, a propósito.** Su ficha decía que
tenía que escuchar `local.creado` para sembrar las categorías de un local nuevo,
y eso parecía necesitar el reloj. No lo necesita, y la razón importa: **un local
que se queda cinco minutos sin categorías es un local roto**, así que sembrar no
puede ser un proceso de fondo aunque lo hubiera. Se hace en el mismo instante y
en la misma transacción, con una **reacción**
([decisión 0014](docs/decisiones/0014-las-reacciones-entre-modulos.md)).

Lo que sigue esperando al reloj es lo que **sí puede esperar**: vaciar la bandeja
de eventos y limpiar las claves de idempotencia. M6 publica cinco eventos nuevos,
así que la bandeja crece más deprisa que antes. Sigue sin romper nada, y sigue
habiendo que decidirlo antes de M8.

### Cómo quedó el estado de la base y del despliegue

| Qué                | Cómo está                                                           |
| ------------------ | ------------------------------------------------------------------- |
| Migraciones        | En el repositorio hasta la `0024`; **en Supabase, hasta la `0023`** |
| Semillas           | Puestas, **sin credenciales de ejemplo**: la semilla se niega       |
| Cuentas de ejemplo | Cerradas. Ninguna puede entrar                                      |
| Cuenta de verdad   | La de Ricardo, con su organización y su local                       |
| API                | Desplegada, **y por detrás del código**: no conoce nada de M6       |
| Web y app          | Publicadas y al día                                                 |

`pnpm bd:comprobar-api` pasa sin un solo fallo, con once comprobaciones que allí
no se pueden hacer porque necesitan cuentas de ejemplo, que en una base remota no
existen a propósito. La propia salida lo explica.

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
- ~~**`estook.dispositivo` está vacía**~~ · **arreglado en M5**. Ahora `entrar`
  manda una marca opaca del navegador, `estook.reconocer_dispositivo` la
  encuentra o la da de alta, y la sesión cuelga de ella. Entrar dos veces desde el
  mismo móvil ya no son dos filas, y hay tres pruebas que lo fijan.
- **Ninguna consulta de lista tiene tope.** Con siete personas da igual; M8 es la
  primera pantalla que lista gente de verdad y conviene que nazca paginada.
  **El catálogo de referencia de M5 sí nace acotado**: 20 por defecto, 50 como
  mucho.
- **El presupuesto de tamaño de la app va al 87 %**, con las pantallas grandes
  todavía por construir. No manda sobre el producto: se vigila con `pnpm tamano`.

### Lo que no puedo firmar yo

**Verlo en un móvil de verdad** (regla 11) **con la API desplegada**. Sigue
pendiente de M4 y ahora también de M5: el alta son ocho pantallas que se hacen con
el pulgar, y lo que mide la prueba automática es que ningún paso se atasque, no lo
que tarda una persona.

**Y el almacén de ficheros contra Supabase de verdad.** El logo se sube, se firma
y se lee en la API de pruebas, con un almacén en memoria; contra Supabase Storage
no lo ha ejecutado nadie todavía. Para eso está `pnpm almacen:preparar`, que hace
el camino entero —crear, subir, firmar, leer, comprobar que sin firma no se sirve
y borrar— en vez de decir «listo» sin haber probado nada.

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No es que falte el dato: es
que **no existe un dato único**, porque dependen del bien y de la operación.
Cuando aparezcan se añaden como filas, sin tocar código. Mientras tanto el motor
devuelve «sin regla» y para, en vez de inventarse un tipo
([`0006`](docs/decisiones/0006-el-motor-fiscal.md)).

### Sin prisa

| Qué                                                                                      | Cuándo                                                                         |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quitar «Automatically expose new tables» en Supabase → Settings → API                    | antes de clientes                                                              |
| Regenerar las claves de Google, que pasaron por un chat                                  | M27                                                                            |
| Google Places en el alta ([0013](docs/decisiones/0013-google-places-se-aplaza-a-m23.md)) | M23                                                                            |
| Volver a `BrowserRouter` cuando haya `estook.com`                                        | cuando haya dominio ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |
| El vectorial del logotipo y de Fogón                                                     | cuando aparezcan; se sustituyen en un sitio                                    |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
El **catálogo del sistema de diseño** está en `/admin/`.

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito. La conexión va por el agrupador de sesión, porque la directa de los
proyectos nuevos solo funciona por IPv6.

Leído de la base de datos de verdad con `pnpm bd:comprobar` **al terminar de
construir M6, y antes de aplicarla**:

| Qué                            | Cuánto                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| Migraciones aplicadas          | **22 de 23** · falta la `0023`, que es la de M6            |
| Tablas en el esquema `estook`  | 31, **todas** con seguridad por filas                      |
| Roles · permisos · concesiones | 12 · 33 · 166                                              |
| Reglas fiscales                | 17, todas con su referencia legal                          |
| Organizaciones                 | 4 · `bar-centro`, `casa-lola`, `grupo-costa` e **`ikatz`** |
| Personas de verdad             | **3** · Ricardo, y dos más en `ikatz`                      |
| La auditoría                   | añadir sí · modificar **no** · borrar **no**               |

**`ikatz` es el negocio de verdad**, con su gerente, su jefe de cocina y su
dirección. Lo demás son las semillas de ejemplo, con sus cuentas cerradas desde
el 3 de septiembre.

**Al aplicar la `0023` pasan a ser 38 tablas**, y aparece la vista
`estook.existencias`, que es la única del proyecto.

**Las ocho personas de ejemplo tenían una contraseña publicada en este
repositorio, y la API ya estaba desplegada cuando se vio.** Están cerradas desde
el 3 de septiembre.

**La API está desplegada y viva**, y se entra desde el móvil. La base está en la
`0022`; la `0023` de M6 está construida y **sin aplicar**.

**Errores:** proyecto `estook-app` en Sentry, con solo «Error monitoring»
encendido y el repositorio enlazado.

**Variables del repositorio:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`. En Secrets, los dos de M4:
`TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. Todo en
[`config/claves.md`](config/claves.md).

**El peso real de lo publicado**, medido con `pnpm tamano`:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | 229,5 KB     | 106,1 KB                 |
| `admin`         | 182,6 KB     | 106,1 KB                 |
| `web` · `carta` | 164,2 KB     | 106,1 KB                 |

De 250 de referencia, que desde la Evolución 1.0 **se mide y se informa, no
bloquea**. **M6 entero le costó a `app` 12,9 KB**: la pantalla «Hoy», la lista de
productos con su buscador, el alta desde el catálogo, la ficha entera con sus
tres hojas y la de proveedores.

**Quedan 20,5 KB de margen, y aquí empieza a apretar de verdad.** Con
Escandallos, Carta, Calendario, Equipo, Servicio, Negocio, Cuaderno y Fogón por
construir, el siguiente módulo que traiga pantallas grandes **tendrá que cargarse
aparte**, como ya hace la gráfica. No bloquea —la referencia se mide y se
informa— pero conviene hacerlo por gusto y no por susto.

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

### M5 · Onboarding y arranque asistido

**El alta entera, y el primer fichero que Estook guarda.**

**Lo que hay:**

- **Los ocho pasos del alta**, una pregunta por pantalla y todos saltables. Lo
  que se salta queda apuntado y vuelve a ofrecerse desde el Panel.
- **La barra de progreso cuenta valor, no tareas.** No dice «3 de 8»: dice «ya sé
  qué impuesto lleva cada cosa». Es cálculo puro, con su prueba al lado.
- **Régimen fiscal y objetivos.** El régimen no se elige: lo decide el
  territorio, y lo comprueba una restricción. Los objetivos **tienen vigencia**,
  como los tipos impositivos: cambiar el de marzo no repinta enero.
- **Marca con previsualización de verdad**: la cabecera pintada con el color
  elegido, encima del formulario. El logo se reduce en el navegador y va a
  Supabase Storage, que es el primer fichero que este proyecto guarda.
- **Camino de grupo**, con duplicado de local. Se copia la configuración —tipo,
  fiscal, objetivos, hora de cierre— y **nunca la operación**: ni stock, ni
  albaranes, ni gente, ni la sal del PIN.
- **Catálogo de referencia**: 302 productos y 10 recetas, con formato, factor,
  unidad de uso, rendimiento y alérgenos puestos, buscable con erratas y sin
  acentos. Y con **la cuenta explicada**: «Garrafa de 5 l = 5.000 ml para usar».
- **Importador del equipo** desde CSV, con el mapeo propuesto **por código y no
  por un modelo**, su pantalla de repaso con cinco filas y su huella para que
  importar dos veces no cambie nada.
- **Modo demostración**: se entra sin cuenta al restaurante de ejemplo, en solo
  lectura, y se sale sin dejar rastro.
- **Guía de instalación**, distinta para iPhone y Android, porque los pasos no se
  parecen en nada.
- **Las tres tarjetas del Panel**: «Conecta tus ventas», «termina de configurar»
  y «quita los ejemplos». Las tres desaparecen solas cuando dejan de tener
  sentido.

**Lo que M5 puso en la base de datos:** la `0020` con ocho tablas nuevas, la
ficha del local, el modo demostración y el arreglo del aparato; y la `0021`, que
es el catálogo de referencia entero.

#### La cuarta puerta

M4 dejó tres —sin sesión, sin segundo factor, con contraseña ajena— y M5 añade la
cuarta: **una visita de demostración mira todo y no escribe nada**. Va en el
despachador, con las otras tres, y por eso una operación nueva nace cerrada a la
demostración sin que nadie se acuerde.

Es lo que hace verdad «se entra y se sale sin dejar rastro» **sin limpiar nada
después**: no hay nada que limpiar. La otra forma —dejar escribir en una copia y
borrarla luego— necesitaría un proceso de fondo que todavía no existe, y un fallo
a mitad dejaría datos de mentira dentro del restaurante de ejemplo.

#### Catorce fallos que M5 encontró, y quién los cazó

1. **El gerente no podía configurar su propio local.** La política de M1 exigía
   `accion.gestionar_locales` para cualquier escritura sobre `estook.local`, y ese
   permiso el gerente no lo tiene, con razón: «altas de local son de
   organización». Resultado: el gerente de un bar recién dado de alta entraba en
   su propia alta y no podía responder ni la primera pregunta. La `0020` parte la
   política en dos —crear un local sigue siendo de organización; **tocar la ficha
   del que llevas es `app.ajustes`**— y lo cazó una prueba de base de datos.
2. **La visita de demostración podía escribir.** La API de pruebas construye la
   sesión a mano, fila a fila, y se quedó sin el campo nuevo: la cuarta puerta no
   saltaba. Contra la API de verdad funcionaba perfectamente. Es la lección de E4
   mirada del otro lado: aquí el camino que se comportaba distinto era **el de
   las pruebas**.
3. **Y la puerta de la demostración cerraba también las consultas.** Una visita
   que no puede leer no enseña nada, que es justo lo contrario de lo que es una
   demostración. Lo cazó su propia prueba, en el primer intento.
4. **La `0020` no se podía aplicar sobre una base con datos.** Ponía la
   restricción de coherencia del alta **antes** de rellenar la columna. Contra el
   Postgres de las pruebas pasaba, porque allí las semillas corren después de las
   migraciones y `estook.local` está vacía cuando pasa la 0020: la restricción no
   tenía ni una fila que comprobar. Contra la base de verdad, con siete locales ya
   montados, saltó al aplicarla.

   Es «una prueba que corre en un sitio no prueba el otro» (E4) con una forma
   nueva: **una migración probada solo contra una tabla vacía no está probada.**
   Ahora hay una prueba que aplica las migraciones del módulo **con las cinco
   semillas ya puestas**, y se comprobó rompiéndola a propósito antes de darla por
   buena.

5. **`bd:comprobar-api` daba dos «OK» sin comprobar nada.** Al mirar el local de
   Nuria hacía `cambiado.datos?.localId === elSuyo`. Sin cuentas con las que
   entrar, `elSuyo` salía `undefined`, la petición devolvía 401, `localId` salía
   `undefined` también, y `undefined === undefined` es verdad. **Dos líneas verdes
   en una pasada en la que no se había comprobado absolutamente nada.**

   Es otra vez E4 —«una comprobación que no puede fallar es peor que no
   tenerla»—, y da miedo porque el verde de al lado sí era de verdad. Ahora se
   exige que el valor exista antes de compararlo.

6. **Y la misma herramienta gritaba diecinueve veces cuando todo estaba bien.**
   Contra una base sin cuentas de ejemplo —que es lo correcto en producción— todo
   lo que necesita entrar salía como `MAL`. No eran fallos: era que no había
   contraseña con la que entrar. Un diagnóstico que grita cuando todo está bien
   deja de leerse, y ese es el camino por el que un fallo de verdad pasa
   desapercibido.

   Ahora se pregunta una vez si hay con quién entrar. Lo que no se puede mirar se
   marca con `--`, se lista y se cuenta aparte, y **el resumen dice siempre las
   dos cifras**. De paso se le añadió lo que le faltaba: la sección de la `0020` y
   la `0021`, que comprueba contra Supabase la restricción que reventó el
   despliegue, que `abrir_sesion` existe una sola vez y ya con ocho argumentos, y
   que `quitar_ejemplos` **no** es `security definer`. Y los índices de trigramas
   se comparan por nombre, no contando: contar seguía cuadrando aunque cayera uno
   y apareciera otro.

#### Y tres más, del repaso de cierre · lo que estaba construido y no se usaba

Los tres son la misma forma de fallo, que es la más callada de todas: **código
escrito, registrado y probado por dentro, al que no llegaba nadie.** No dan
error, no rompen ninguna prueba y no se ven hasta que alguien intenta usarlos.

7. **La demostración no tenía salida limpia**, que es palabra por palabra lo que
   pide su ficha. El botón «Salir» de la pantalla llama a `salir`, y `salir` no
   admitía demostraciones: devolvía 403. La aplicación borraba el token de todas
   formas —por un `finally` puesto para otra cosa— así que **nadie notó que la
   sesión seguía viva en el servidor**. El token recién «cerrado» seguía abriendo
   `quien_soy` hasta caducar, y la promesa era «se entra y se sale sin dejar
   rastro».

   Existía `salir_de_la_demostracion`, que lo hacía bien, y no lo llamaba nadie:
   la forma más cara de tener razón. Ahora las dos llaman a `cerrarLaSesion`, que
   es el único sitio donde se decide que una visita **se borra** en vez de
   cerrarse (regla 6), y hay una prueba de extremo a extremo que sale **por el
   botón de la pantalla**, no por el que hay que acordarse de llamar.

8. **La aplicación no sabía que estaba en una demostración.** El servidor paraba
   las escrituras, que es lo que protege de verdad, pero `quien_soy` no lo
   contaba, así que la pantalla enseñaba los mismos botones de guardar que a
   cualquiera y quien pulsaba uno se llevaba un error en la cara sin haber sido
   avisado. Una promesa que el visitante no ve no la ha recibido. Ahora
   `quien_soy` trae `esDemostracion`, y arriba hay una barra que lo dice y ofrece
   irse.

9. **El logo se podía poner y no quitar.** `quitar_logo` estaba escrito,
   registrado y probado; la pantalla ofrecía «Elegir una imagen» y «Cambiar la
   imagen», nunca quitarla. Quien subía el logo de la cadena en vez del de su
   local podía sustituirlo, jamás volver a no tener ninguno.

#### Y el peor de todos, que salió al intentar entrar de verdad

**La pantalla «Pon una contraseña tuya» dejaba fuera a todo el mundo.**

`cambiar_mi_clave` exige la contraseña actual cuando ya hay una puesta, y ahí
siempre la hay: se acaba de entrar con ella. Esa regla del servidor es correcta
—si no, a quien se dejara la sesión abierta en la tablet del pase le cambiarían
la contraseña de un clic y se quedarían la cuenta—. Lo que faltaba era **pedirla**:
la pantalla mandaba solo la nueva.

Así que el servidor contestaba siempre «ese correo y esa contraseña no cuadran», y
**no había forma de pasar de esa pantalla**. Afectaba a las cuentas creadas con
`bd:cuenta-de-verdad` y a las invitadas con contraseña temporal: **las dos únicas
maneras de entrar por primera vez en Estook**.

La pantalla de Ajustes lo hacía bien desde el primer día. Solo estaba rota la
obligatoria, que es la que pasa todo el mundo y por la que no había pasado nadie.
No había ni una prueba que la recorriera; ahora hay una, y se comprobó rompiendo
el arreglo a propósito antes de darla por buena.

**De paso, un mensaje que mentía.** Una contraseña demasiado corta contestaba
«Falta algo por rellenar. Los campos que faltan están marcados debajo», sin marcar
ninguno, porque no faltaba ninguno. El servidor sí mandaba la frase concreta
—«necesita al menos diez caracteres»— en `detalle.porque`, y `ErrorEnCristiano`
la tiraba a la basura. Ahora la enseña, y el mínimo vive en `@estook/dominio`
para que la ayuda de la pantalla y la regla que la rechaza no puedan discrepar.

**Y una trampa de las pruebas, que casi las hace inútiles para la interfaz:**
`pnpm prueba:e2e` levanta lo ya construido con `vite preview`, así que **prueba
el empaquetado anterior**. Un cambio de pantalla pasa en verde sin haberse
probado. En integración continua no ocurre, porque allí se construye antes; en
local hay que usar `pnpm prueba:e2e:completa`. Está en «Cómo trabajamos».

#### Y tres del primer paseo por el móvil, que las vio Richi

Las tres del mismo sitio: **el alta funcionaba, pero no se comportaba como se
había prometido en la propia pantalla.**

10. **En «Invita a tu equipo» solo se podía subir un CSV.** El único botón era
    «Subir un fichero», así que quien no tuviera la plantilla en un Excel —que es
    casi todo el mundo el primer día— no podía invitar a nadie y tenía que
    saltarse el paso. Y el comentario del propio fichero decía que había dos
    caminos, «de uno en uno» el primero. Ahora está, y usa **la misma hoja** que
    «Quién tiene acceso», no una copia.

11. **Volver a por una cosa metía en el asistente entero.** La tarjeta del Panel
    ofrece «Invita a tu equipo» y debajo «y 1 cosa más, **cuando quieras**».
    Pulsarla reabría el alta y, al guardar, seguía con los pasos siguientes:
    aparecía otra vez el paseo con la guía de instalación, ya visto. Quien acepta
    hacer una cosa no ha aceptado hacer las cinco siguientes.

    Lo arregla la migración **`0022`**, que guarda a qué paso se volvió. Se
    intentó primero sin columna, deduciéndolo, y salió mal de la peor manera: el
    recorrido completo se cerraba solo en el primer paso. Está contado en la
    migración.

12. **La guía de instalación estaba al revés de las dos maneras.** En el
    ordenador el paseo acababa en «Ponerlo en mi móvil» y detrás una pantalla que
    dice «toca el botón de compartir», delante de alguien con un ratón. Y en el
    teléfono, que es donde sirve, había que pasar las cinco pantallas del paseo
    para llegar: quien pulsaba «Saltar el paseo» —lo normal— no la veía nunca.

    Ahora en el móvil está **a un toque desde cualquier pantalla del paseo**, y en
    el ordenador no se ofrece. La prueba corre en los dos proyectos y cada uno
    comprueba lo suyo, que es la única forma de que esto no vuelva.

13. **Y el recado tenía una segunda salida sin arreglar.** Se arregló primero
    solo «Continuar»; «Esto lo dejo para luego» seguía metiendo en el paseo
    entero, que es el camino que más se usa. Las dos salidas del paso miran ahora
    el recado, y hay una prueba para cada una.

#### Y el que no era de M5, pero lo encontró M5

**Ocho cuentas con una contraseña publicada, en una base con la API ya
desplegada.** Estaban abiertas de verdad, no en el futuro. La causa —una
comprobación que miraba una etiqueta en vez de una dirección— está arreglada, y
las cuentas se cerraron el 3 de septiembre. Sigue arriba, en «qué hay que hacer»,
porque dejó una consecuencia viva: **hoy no puede entrar nadie** hasta que haya
una cuenta de verdad.

#### Cómo se comprueba que M5 está terminado

Su criterio, punto por punto, es
[`pruebas/e2e/alta.spec.ts`](pruebas/e2e/alta.spec.ts):

| Criterio del Plan                           | Cómo se comprueba                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| El alta en menos de cuatro minutos          | El recorrido entero, cronometrado, en escritorio y en móvil pequeño                                 |
| Un producto del catálogo en quince segundos | **A medias**, y se dice: el catálogo devuelve la ficha rellena; crear                               |
|                                             | el producto es M6 ([0012](docs/decisiones/0012-el-producto-nace-en-m6.md))                          |
| El botón de quitar ejemplos los borra todos | Contra la base de datos, con el registro y sus políticas                                            |
| El gasto de Google por debajo de 0,50 €     | **Es cero**: Google se aplaza a M23 ([0013](docs/decisiones/0013-google-places-se-aplaza-a-m23.md)) |

Y la lista de la Auditoría de flujos, pasada punto por punto, en
[`docs/auditorias/m5.md`](docs/auditorias/m5.md).

#### Y el catorce, que es el mismo que el de M4

**`SUPABASE_SERVICE_KEY` no se puede llamar así.** Supabase reserva el prefijo
`SUPABASE_` en los secretos de Edge Functions y lo rechaza con «Name must not
start with the SUPABASE_ prefix».

Este proyecto ya se había comido esto en M4 con `SUPABASE_ACCESS_TOKEN` y
`SUPABASE_PROJECT_REF`, y la lección quedó escrita aquí mismo: «un nombre que se
parece al de otro sitio es un nombre que acabará donde no va». **M5 lo repitió
con la lección delante**, y Richi se topó con el mismo error rojo en la misma
pantalla.

Ahora se llama `CLAVE_DE_SERVICIO`, como `ORIGENES_PERMITIDOS` o `ENTORNO`. Y lo
importante: **escribirlo en un documento no lo impidió**, así que ahora hay una
prueba que recorre `servidor/` y `herramientas/` y falla si alguna variable que
elegimos nosotros empieza por `SUPABASE_`. Las que pone Supabase —`SUPABASE_URL`
y compañía— se leen igual: la regla es sobre los nombres que inventamos.

Una lección que no se puede comprobar es una lección que se vuelve a aprender.

#### Cómo se cerró M5

El 3 de septiembre de 2026, en un móvil de verdad, con la cuenta de Ricardo y su
negocio. Se recorrió el alta entera, se volvió desde el Panel a por una cosa
suelta, se invitó a alguien a mano y se miró la guía de instalación.

**Trece fallos en total**, y de ellos **seis los encontró mirar la aplicación en
un teléfono, no las pruebas.** Eso es lo que hay que llevarse a M6: 616 pruebas
en verde dicen que lo probado funciona, no que se haya probado lo que importa.
Los seis eran de la misma familia —algo construido a lo que la pantalla no
llegaba, o un texto que no encajaba con el aparato que se tenía delante— y
ninguno rompía nada por dentro.

#### Lo que M5 deja pendiente, dicho sin redondear

- **Los datos de ejemplo son maquinaria sin filas.** El registro, el botón y la
  regla de que no cuentan están hechos y probados; los seis productos, las tres
  fichas y la carta de cuatro platos los siembra M6, M9 y M10, porque sus tablas
  no existen todavía.
- **Los albaranes por foto** necesitan proveedores y productos: M7.
- **Google Places**, con las reseñas y los competidores: M23.
- **El almacén contra Supabase de verdad** no lo ha ejecutado nadie. Para eso
  está `pnpm almacen:preparar`.
- **`recetas_de_referencia` no la consume nadie todavía**, y se deja a
  propósito: la ficha de M5 pide «recetas de referencia **opcionales**», y quien
  las copia a una ficha técnica es M9. La consulta está hecha y probada; lo que
  falta es la pantalla que las use, y esa no es de este módulo. Es el mismo caso
  que `catalogo_de_referencia`, que sí tiene su prueba de aceptación porque su
  criterio —los quince segundos— es de M5.

---

### M6 · Inventario

**El género, lo que cuesta, y la primera capa inteligente del producto.**

**Lo que hay:**

- **El producto entero**: formato, unidad de uso, factor, rendimiento, peso
  variable, código de barras, tipo impositivo, alérgenos, mínimo y proveedor
  principal. **Solo el nombre es obligatorio**; todo lo demás tiene un valor por
  defecto que se corrige después, porque un formulario de catorce casillas en la
  puerta es la forma más segura de que nadie dé de alta su segundo producto.
- **El alta en el buscador del catálogo de referencia.** Escribes «aceite» y sale
  la ficha rellena con la cuenta hecha: «Garrafa de 5 l = 5000 ml para usar». Eso
  lo construyó M5 y **no lo llamaba ninguna pantalla**; M6 es la primera.
- **El stock es un libro de movimientos, y no hay ninguna tabla con una cantidad
  editable.** Lo que hay en cámara es, literalmente, la última línea del libro:
  `estook.existencias` es **una vista**, no una tabla. Dos sitios donde vive la
  misma cifra son dos sitios que un día se separan.
- **Tres preguntas, no tres tablas**: «ha llegado género», «ha salido género» y
  **«ajustar lo que hay en cámara»**. Si el jefe de cocina dice que hay 4 kg, hay
  4 kg: se apunta la diferencia con su motivo, y nadie se queda bloqueado por
  cuadrar.
- **Precios con vigencia y precio medio ponderado.** Cambiar el precio de hoy no
  reescribe lo que costó en enero: se cierra la vigencia anterior y se abre la
  nueva. Y **hay un precio vigente por proveedor**, que es lo que permite
  compararlos.
- **Lotes y caducidades**, con lo que caduca esta semana en la pantalla «Hoy».
  Consumir primero lo que antes caduca es M8.
- **El stock negativo se permite y se marca.** «Si el sistema dice que no queda
  género, deja de creerse el sistema.»

**Y su capa inteligente, que es lo que cambia con la Evolución 1.0:**

- **Consumo medio diario**, con cuántos días se han mirado al lado. Siempre.
- **Días de cobertura y previsión de agotamiento con fecha y hora**: «se agota
  mañana a las 18:24».
- **Sugerencia de pedido con su motivo escrito**: «mantener unos 5 días de
  cobertura al ritmo al que se está gastando».
- **Histórico de precio, y por proveedor.**
- Y lo que **no** hace: con menos de siete días de historia **no predice nada**, y
  dice por qué. Una previsión hecha con dos días es una corazonada con la
  autoridad de estar escrita en la pantalla.

**Nada de esto llama a un modelo, y es a propósito**: «las reglas van en código»
(Evolución 1.0, capítulo 8). Bajo mínimo, días de cobertura y previsión son
aritmética, y no gastan un solo crédito.

**Lo que M6 puso en la base de datos:** la `0023`, con siete tablas —proveedor,
categoría, categoría de partida, producto, precio, lote y el libro—, una vista,
una función con privilegio y el buscador universal aprendiendo a encontrar
género.

#### Dónde vive cada cuenta, y por qué importa

**Aquí no se calcula nada en SQL.** No hay ni un disparador que sume stock ni uno
que pondere precios: toda la aritmética está en `packages/dominio/src/inventario.ts`,
al lado del `precioMedioPonderado` que M2 escribió en `coste.ts`.

Es la regla 6 aplicada donde más caro se paga. El día que un disparador de
Postgres y el motor del dominio redondearan distinto, el valor de la cámara y el
coste de los platos dejarían de cuadrar, y nadie sabría por qué.

Lo que sí guarda cada línea del libro es **el saldo de después**. No es un segundo
dueño del cálculo: es el resultado congelado del único dueño, como el saldo de
una libreta. Y es lo que hace comprobable «el stock se reconstruye entero desde
los movimientos»: se replica el libro con el motor y tiene que dar exactamente lo
mismo, hasta la última milésima.

#### Los proveedores mínimos, y por qué están en M6

M7 es «Proveedores y compras» y es quien los desarrolla. Aquí nace **la ficha más
corta que sostiene tres promesas escritas**: el «histórico de precio por
proveedor» de la ficha de M6, el «pones tu precio y tu proveedor» del alta de un
producto, y el desplegable de proveedores de la Auditoría. Un precio que no sabe
de quién viene no se puede comparar con el de al lado.

#### La reacción, que es la regla 14 dejando de ser una promesa

M5 publicó `local.creado` y dejó escrito al lado: «M6 le siembra sus categorías».
M6 lo cumple con una **reacción**: una lista en `servidor/aplicacion/reacciones.ts`
donde un módulo declara qué hace cuando otro cambia algo, y que se ejecuta **en
la misma transacción** del comando que la provoca.

Va en la misma transacción y no en un proceso de fondo porque **un local que se
queda cinco minutos sin categorías es un local roto**. Está razonado entero en la
[decisión 0014](docs/decisiones/0014-las-reacciones-entre-modulos.md).

#### Diez fallos que M6 encontró, y cuatro eran de antes

**1 · El camino de grupo de M5 no funcionaba.** `crear_local` devolvía «esto no
está en tu acceso» **a la propietaria de una cadena de seis locales**, que tiene
todos los permisos que existen. Es decir: «con dos o más se ofrece duplicar el
local» era mentira desde que se escribió.

La causa es la que M4 dejó escrita para `estook.persona` en la `0019`, en otra
tabla: **con `returning`, Postgres aplica además la política de lectura a la fila
devuelta**, y la de `local` se escribe contra `locales_visibles()`, que es
`stable`. Una función `stable` mira el instantáneo del principio de la sentencia,
y **la fila que esa misma sentencia está insertando todavía no está ahí**. Falla
con cualquier permiso.

No lo vio nadie porque las semillas crean los locales con `insert` directo, sin
pasar por el comando. Se arregla partiéndolo en dos sentencias, y hay dos pruebas
nuevas: una comprueba el arreglo y **la otra comprueba que no abre la puerta**.

**2 · Cinco operaciones registradas a las que no llegaba nadie**, y la peor era
`catalogo_de_referencia`: el corazón de «un producto en quince segundos», hecho y
probado desde M5, **sin ninguna pantalla que lo llamara**. También
`cambiar_mi_idioma`, que existe desde M2 y no tenía sitio en Ajustes.

Las encontró una prueba nueva, y esa prueba es lo más importante que deja M6
(abajo).

**3 · El buscador universal, reescrito de memoria.** Al añadirle el género se
reescribió la función entera desde una lectura parcial, y se perdieron **dos
bloques —organizaciones y áreas— y el umbral pasó de 0,18 a 0,3**. El umbral lo
cazó una prueba en el acto: «Ignaico» dejó de encontrar a «Ignacio». Los dos
bloques que faltaban **no los cazó ninguna**, porque ninguna preguntaba por
ellos. Ahora hay una que lo hace.

**4 · «Quitar los ejemplos» fallaba en cuanto hubiera un lote.** El libro
apuntaba a su lote con `on delete set null`, y borrar un lote hace que Postgres
lance un **`update`** sobre el libro, que es justo lo que su guardián rechaza. El
botón de M5 se quedaba a medias **sin decir nada**. Va con `cascade`, y no abre
ninguna puerta porque un lote no se borra solo.

**5 · Los ejemplos nacían con la cámara en números rojos.** Tres bandejas de
treinta huevos no aguantan tres semanas gastando veintidós al día: acababan en
−372 unidades. Ahora la entrada sale del consumo.

**6 · Y uno de las pruebas, hermano del que dejó M5.** `pnpm prueba:e2e` levanta
la API con `reuseExistingServer`: si hay una API de pruebas viva de antes, **la
reutiliza con el código viejo**. Costó tres intentos creer que un arreglo
correcto no funcionaba. Antes de dar por bueno un rojo del servidor, se mata lo
que esté escuchando en el 5177.

#### Lo más importante que deja M6: la lección de M5, hecha prueba

De los catorce fallos de M5, **seis los encontró mirar la aplicación en un
móvil**, y la mayoría eran de la misma familia: algo construido, registrado y
probado por dentro **a lo que la pantalla no llamaba**.

`servidor/aplicacion/se-usan.prueba.ts` recorre el catálogo de operaciones y
falla si alguna no aparece en el código de ninguna aplicación. Las excepciones se
declaran **con su motivo escrito**, porque una excepción sin motivo es una
excepción que se copia.

No sabe si el botón se ve ni si la pantalla se alcanza —eso lo miran el e2e y un
móvil de verdad—, pero caza exactamente el fallo que se coló tres veces:
construir algo y no enchufarlo a nada. En cuanto se escribió encontró cinco.

#### Cómo se comprueba que M6 está terminado

Su criterio, punto por punto, es
[`pruebas/e2e/inventario.spec.ts`](pruebas/e2e/inventario.spec.ts):

| Criterio del Plan                                      | Cómo se comprueba                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Un producto de alta en 30 segundos                     | Cronometrado **desde la pantalla**, con el catálogo de referencia, en escritorio y en móvil |
| El coste y el medio ponderado con factor y rendimiento | Pulpo: caja de 5 kg al 55 %. Sube un 20 % el precio y el coste por gramo sube ese 20 %      |
| El stock se reconstruye desde los movimientos          | Se replica el libro con el motor y se compara línea a línea con lo guardado                 |
| La previsión acierta el día con consumo estable        | Un local nuevo con tres semanas de consumo sembrado, y la fecha cuadra con la cuenta        |

Y la lista de la Auditoría de flujos, pasada punto por punto, en
[`docs/auditorias/m6.md`](docs/auditorias/m6.md).

#### Y cuatro más del repaso de después de fusionar

Los encontró pasar la lista de la Auditoría con el módulo ya en `main` y la base
migrada, que es lo que pide la regla 6 de «cómo trabajamos».

**7 · La API no se despliega sola, y me lo dejé fuera de los pasos.** Las cuatro
aplicaciones se publican al fusionar; la API se despliega a mano, a propósito. Así
que quedó la pantalla de Inventario publicada y **el servidor sin conocer ninguna
de sus operaciones**: entrar devolvía «Eso ya no está» en cada una, y por fuera
parecía el módulo roto.

Ahora `bd:comprobar-api` le pregunta a la **API desplegada** si conoce todas las
consultas del código, y si va por detrás lo dice con esas palabras y con la lista
de las que le faltan. Es la comprobación que lo habría cazado antes de que nadie
abriera la aplicación.

**8 · Cuatro pérdidas de datos silenciosas en el mismo formulario.** Corregir una
errata en el nombre de un producto **le borraba la categoría, el proveedor y las
notas, y le cambiaba el impuesto** a «alimento». Un vino guardado así tributa como
comida, y eso no se nota hasta la declaración.

El comando hacía exactamente lo que se le pedía: recibe la ficha entera, que es lo
correcto. El fallo estaba en lo que se le pedía, y su causa una capa más abajo:
**el servidor mandaba los nombres y no los identificadores**, así que el
desplegable no tenía con qué preseleccionar y salía en blanco.

Se arregla en los dos sitios, y hay una prueba que guarda la ficha tal cual llegó
y comprueba que no se ha movido nada.

**9 · Y renombrar a un nombre que ya existe daba un `500`.** «Se nos ha roto algo
por dentro», que además de feo es mentira: es que ya hay otro que se llama así.
`crear_producto` lo decía bien desde el principio; `cambiar_producto` no.

**10 · La lista de índices de trigramas de `bd:comprobar-api` se quedó en ocho.**
Actualicé la prueba del buscador y no la herramienta, y la herramienta lo dijo
sola en la primera pasada contra Supabase.

#### Y ocho más del segundo paseo por el móvil · seis los vio Richi

Una tarde mirando Estook en el teléfono y en el ordenador. **Seis fallos, y
ninguno ponía en rojo ninguna de las 692 pruebas que había**, otra vez. Son de la
misma familia que los seis de M5: algo construido, registrado y probado que la
pantalla no llegaba a enseñar, o que enseñaba algo que no era verdad.

**11 · El envase lo ponía el catálogo, no quien compra.** Elegir «Aceite de oliva
virgen extra» del catálogo **fijaba «Garrafa de 5 l»**, sin casilla que tocar. A
quien compra garrafas de 8 l le quedaban dos salidas y las dos malas: hacer la
cuenta de cabeza, o guardar un producto con un envase que no es el suyo y
arrastrar el error a todos los escandallos que lo lleven. «¿Ya tienen que hacer
cálculos? No tiene sentido.»

**El servidor aceptaba el envase junto a la referencia desde el primer día.** Era
la pantalla la que no lo preguntaba. Ahora la referencia **propone**, las dos
casillas están rellenas y editables, y la cuenta —«= 8000 ml para usar»— se rehace
mientras se escribe, con el mismo `comoSaleElCoste` que usa el servidor.

De paso salió otro escondido detrás: la pantalla mandaba **siempre** el
rendimiento, con su 100 por defecto, así que la etiqueta **«sin verificar»** —que
existe, está probada y protege del error más caro del sistema— no aparecía nunca
en un producto creado a mano. Ahora solo se manda si alguien lo toca.

**12 · La rueda del móvil decía «estás en Inventario» estando en el Panel.** El
cursor del teclado arrancaba en cero, y el primer sector salía pintado de naranja.
En un teléfono eso no se lee como «por aquí empiezan las flechas»: se lee como
**estás aquí**. Ahora el cursor arranca donde de verdad estás, y **en ninguna
parte** desde el Panel: si no estás en ninguna app, no se resalta ninguna. Se dice
además con `aria-current`, que es lo que anuncia un lector de pantalla.

**13 · En el móvil no había buscador, ni avisos, ni chat, ni Fogón, ni Ajustes.**
B5 describe con detalle la barra de escritorio y, para el móvil, la de abajo con
sus tres posiciones. De ahí salió, **sin que nadie lo decidiera**, que en un
teléfono no existiera ninguna de las cinco: el buscador universal solo se abría
con `Ctrl+K`, que en un móvil no existe; avisos, chat y Fogón no estaban en
ninguna parte; y a Ajustes no se llegaba **desde dentro de una app**, porque ahí
la barra de abajo es la de esa app.

Estook se usa de pie y con el teléfono en la mano. Tener las herramientas
transversales solo en el ordenador era tenerlas para quien menos las necesita.
Ahora hay barra de arriba en móvil, con las cinco y con el local en el que estás
—que antes se pintaba dentro del contenido—.

**14 · Los desplegables de la barra de escritorio no se abrían.** Pulsar
«Inventario» en el ordenador **no hacía nada**. Y sí hacía: el estado cambiaba, el
menú se creaba y las pruebas lo encontraban. Lo que pasaba es que se pintaba
`absolute` dentro de un `<nav>` con `overflow-x-auto`, y **en CSS recortar a lo
ancho recorta también a lo alto**: no hay forma de pedir una cosa sin la otra. El
menú entero quedaba por debajo del borde de la barra, recortado.

Ahora se pinta con un portal, `fixed` sobre las coordenadas del botón. Y la
prueba que lo caza no usa `toBeVisible()`, que **no ve el recorte**: pregunta al
navegador qué hay en ese punto de la pantalla, que es lo que preguntaría un dedo.

**15 · Avisos, chat, Fogón y el avatar eran botones mudos.** Los cuatro estaban
puestos como `() => undefined` desde M3. Se pulsaban y no pasaba absolutamente
nada, que es el fallo que más veces ha salido en este proyecto. Hay dos salidas
honestas —quitar el botón, o que diga la verdad— y se eligió la segunda: los tres
primeros abren una hoja que cuenta qué serán y en qué módulo llegan, y el avatar
lleva a Ajustes. **Ya no hay ningún botón mudo en la barra.**

Esa hoja es además la respuesta, dentro del producto, a la pregunta de «¿y la IA,
dónde está?»: **Fogón es M22**, y hasta entonces lo que Estook calcula lo calcula
la base de datos, sin gastar un crédito.

**16 · «Termina de configurar tu local» no se podía quitar.** Iba la primera de
todas, y quien lleva el local solo y no va a invitar a nadie la tenía ahí para
siempre. En el propio fichero estaba escrito que «una tarjeta que no se puede
quitar y que no dice nada es lo peor que se le puede poner encima al Panel a
alguien», y aun así esa no se podía quitar.

Ahora se apaga, **y se apaga en el servidor** (migración `0024`), no en este
navegador: «para siempre» tiene que serlo también en el teléfono. No da nada por
hecho: lo que falta sigue faltando y sigue estando en Ajustes.

Y cuando hay alguien más con acceso, aparece **«Tu equipo»**: quién es, con qué
rol, y quién todavía no ha entrado —que es el dato que se olvida y el que hace
falta para saber a quién hay que volver a darle el PIN—. Con su botón a
Equipo · Personas. **Quién está fichado ahora y las horas de cada uno no están**,
y se dice: eso son los fichajes, M15. Poner un cero en gris sería inventarse una
cifra.

**17 · El «Recuérdamelo» del TPV escondía la tarjeta para siempre.** Guardaba una
fecha siete días en el futuro. Sobre el papel volvía sola; en la práctica, siete
días después nadie se acuerda de nada, así que era un «no me lo enseñes nunca
más» con otro nombre. Ahora el aplazamiento **dura la sesión**: vuelve en cuanto
alguien entra otra vez con su contraseña, que es el momento en el que uno se
sienta a configurar cosas.

**18 · Y el peor, que no lo pidió nadie: «Hoy» devolvía un `500` a todo el
mundo, siempre.** La pantalla principal de M6.

`inventario_hoy` acaba en un bloque que busca los lotes que caducan pronto, y ahí
un parámetro viajaba **sin tipo**:

```sql
and l.caduca_el <= $1::date + $2
```

Postgres no sabe si sumarle algo a una fecha es sumar días o sumar un intervalo,
así que contesta `operator is not unique: date + unknown` y **tumba la consulta
entera**, no solo ese bloque. Un `::int` lo arregla.

Lo que importa no es el arreglo: es **por qué llevaba ahí desde que se escribió**.
Porque **ninguna prueba llamaba a `inventario_hoy`**. Ni las de Postgres, que
prueban la aritmética por debajo, ni las de pantalla, que probaban Productos y la
ficha. La consulta estaba escrita, registrada en el catálogo y llamada desde la
pantalla —y rota—. `se-usan.prueba.ts` comprueba que alguien la llama, que era la
lección de M5; no comprueba que conteste.

Salió leyendo los errores que la API escupía mientras corrían **otras** pruebas.
Ahora tiene dos suyas: una le pregunta a la API si contesta, y otra mira si la
pantalla se pinta o sale el aviso de que se ha roto.

#### Lo que M6 deja pendiente, dicho sin redondear

- **Sigue sin poder darse por terminado** (regla 11): falta aplicar la `0024`,
  desplegar la API y volver a mirarlo en el teléfono con todo puesto. Los pasos
  están en `docs/pasos-para-cerrar-m6.md`.
- **El widget «Tu equipo» no dice quién está fichado ni cuántas horas lleva.**
  Eso son los fichajes, M15, y hasta entonces no hay de dónde sacarlo.
- **El atajo al TPV cuando esté conectado** es M18: hoy la tarjeta solo se puede
  aplazar, porque el asistente de conexión no existe.
- **El mínimo se escribe a mano.** Calcularlo necesita saber qué días reparte
  cada proveedor, y eso es M7 y M8.
- **Los lotes se guardan y se avisa de lo que caduca, pero no se consume por
  ellos.** Gastar primero lo que antes caduca es M8.
- **La merma tiene su propio comando y su lista cerrada de motivos, y es M8.** La
  comida del personal no es merma, y esa partida aparte no existe hasta que
  exista el food cost.
- **La entrada por foto de albarán y por dictado a Fogón** son M7 y M22. En M6 se
  entra a mano, desde el catálogo, y buscando por código de barras.
- **El código de barras se busca, no se escanea con la cámara.** Un lector de los
  de verdad escribe como un teclado y ya funciona; la cámara llega cuando haya un
  aparato con el que probarlo.
- **`reactivar_producto` no tiene pantalla**: la lista de desactivados llega con
  M8. Está apuntado en la prueba con su motivo.
- **Tres datos se guardan y todavía no los lee nadie**, y se dejan a propósito
  porque no se pueden recuperar más tarde: `producto.producto_de_referencia_id`
  —de qué fila del catálogo salió, que M9 necesita para copiar recetas—,
  `movimiento_de_stock.origen` y `precio_de_producto.referencia`, que son de
  dónde vino cada cosa y los llena M7 con los albaranes.
- **`mis_locales`, `mis_permisos` y `un_local` siguen registradas y sin
  pantalla.** `quien_soy` las dejó sin trabajo en M4. Quitarlas de la API es una
  decisión de producto, no de un módulo de inventario, y hay que tomarla a
  propósito.

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
   tres fallos dentro, y uno era de seguridad. M5 pasó sus 613 y el repaso sacó
   otros tres, los tres de la misma forma: **algo construido, registrado y
   probado por dentro al que no llegaba nadie desde la pantalla**. Las pruebas
   dicen que lo que se probó funciona, no que se haya probado lo que importa.
7. **Si se toca una pantalla, `pnpm prueba:e2e:completa`.** El `prueba:e2e` a
   secas sirve lo ya construido, así que prueba el empaquetado anterior y pasa en
   verde sin haber visto el cambio. En integración continua no pasa, porque allí
   se construye antes; en local hay que acordarse.
8. **Y si el rojo es del servidor, mira que no haya una API de pruebas viva de
   antes.** Playwright la levanta con `reuseExistingServer`: si el puerto 5177 ya
   está ocupado, **reutiliza la de antes con el código viejo**, y un arreglo
   correcto sale en rojo. Es hermano del punto 7. Se mata lo que escuche ahí y se
   repite.
9. **Cuando aparezca una lección, se convierte en una prueba.** Escribirla en un
   documento no la impide: M5 repitió el fallo del prefijo `SUPABASE_` con la
   lección delante. De M6 salieron tres pruebas así: la que comprueba que cada
   operación la usa alguien desde la pantalla, la que comprueba que al buscador
   universal no se le ha caído un bloque, y la que comprueba que los ejemplos no
   nacen en negativo.
10. **Una consulta que ninguna prueba llama es una consulta rota que todavía no
    sabes que lo está.** `se-usan.prueba.ts` comprueba que la pantalla la llama;
    eso no comprueba que **conteste**. La pantalla «Hoy» de M6 estaba escrita,
    registrada en el catálogo, llamada desde la pantalla y devolviendo un `500` a
    todo el mundo desde el primer día. Salió leyendo los errores que la API
    escupía mientras corrían **otras** pruebas. Cada consulta del catálogo
    necesita al menos una prueba que la llame de verdad.
11. **`toBeVisible()` no ve el recorte.** Un elemento tapado, o recortado por el
    `overflow` de un padre, sigue teniendo caja: sigue siendo «visible» para
    Playwright y no para una persona. Los desplegables de la barra de escritorio
    llevaban así desde M3. Cuando lo que se comprueba es que algo **se ve**, hay
    que preguntarle al navegador qué hay en ese punto de la pantalla. Está escrito
    en `pruebas/e2e/pantalla.spec.ts` como `seVeDeVerdad`.

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
| **0012** | **El producto nace en M6, y M5 le deja el diccionario**           |
| **0013** | **Google Places se aplaza a M23**                                 |
| **0014** | **Un módulo reacciona a otro en la misma transacción**            |

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
- **Las migraciones `0001` a `0023`.** Se amplían con una `0024`, nunca se editan
  (regla 2).
- **El libro de movimientos** (`estook.movimiento_de_stock`). Solo se añade: no
  tiene `update` concedido a nadie, un disparador lo rechaza y no hay política
  que lo permita. Un movimiento equivocado **se enmienda con otro**, con su
  motivo. Y `estook.existencias` es **una vista**: si algún día alguien la
  convierte en tabla, habrá dos sitios donde vive la misma cifra.
- **La aritmética del inventario vive en `packages/dominio/src/inventario.ts`.**
  Ni un disparador de Postgres suma stock ni pondera precios, a propósito
  (regla 6).
- **El catálogo de referencia** (`0021`). Son datos de producto, como los roles o
  las reglas fiscales: se corrigen con una migración, no desde la aplicación. No
  tiene política de escritura, así que **no hay camino** ni para el gerente.
- **Las once funciones `security definer` de la `0018` y la de la `0019`.** Son
  la única puerta de atrás del sistema, existen porque al entrar todavía no hay
  identidad que consultar, y están tasadas. Hay una prueba que las cuenta: si un
  día son trece, que sea a propósito.

Sobre el candado de `main`: los nombres de las comprobaciones obligatorias van
**sin tilde** — `Calidad`, `Construccion y presupuestos`, `Migraciones
reversibles`. **Nunca añadir `Construir` ni `Publicar`**: ese flujo solo corre
después de fusionar.

---

## 8 · El siguiente paso · M7

**Proveedores y compras.** M6 le deja la ficha corta del proveedor ya montada, y
M7 la completa: no la rehace.

**Entra.** Ficha con días de reparto y pedido mínimo · contratos marco · el ciclo
`borrador → enviado → recibido` · sugerencia que respeta el calendario de reparto
y el mínimo del proveedor · envío por WhatsApp, correo y PDF · recepción con
«¿entero o con cambios?» · factura de compra conciliada con sus albaranes ·
abonos y devoluciones.

**Y su capa inteligente.** La sugerencia de pedido **con su motivo escrito** —que
M6 ya calcula— respetando los días de reparto, y la comparación entre proveedores
para el mismo producto.

**Terminado cuando.** Un pedido recorre el ciclo, el inventario cuadra, el precio
nuevo ya está repercutido, y una factura con tres albaranes y una diferencia sale
conciliada con esa diferencia señalada.

**Lo que M6 le deja hecho:**

- **El libro de movimientos y `apuntar`**, que es el único sitio del sistema que
  escribe stock. Recibir un albarán es apuntar entradas: M7 no toca la cámara,
  llama a lo que ya está.
- **Los precios con vigencia y por proveedor.** «El albarán mueve stock; **la
  factura confirma el precio**» (Auditoría, hallazgo 8) ya tiene dónde vivir: el
  origen del precio es un catálogo cerrado con `albaran` y `factura` dentro,
  esperando a M7.
- **La ficha del proveedor**, con su pantalla, su alta y su desactivación.
- **La sugerencia de pedido**, calculada y con su motivo. Lo que le falta es
  mirar el calendario de reparto, que es de M7.
- **El evento `precio.cambiado`**, con la variación dentro, publicándose desde
  hoy.

**Y dos cosas que hay que decidir, las mismas que dejó M5:**

1. **Quién ejecuta los procesos de fondo.** Sigue sin reloj, y ahora la bandeja
   crece más deprisa: M6 publica cinco eventos nuevos. Nada se rompe, y hay que
   decidirlo **antes de M8**.
2. **Si se quitan de la API `mis_locales`, `mis_permisos` y `un_local`**, que
   `quien_soy` dejó sin trabajo en M4.

**Cómo se comprueba que M7 no ha roto lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa` y `pnpm bd:comprobar-api` contra Supabase. Los dos
primeros pasan hoy; el tercero, cuando se apliquen la `0020`, la `0021`, la `0022`
y la `0023`.
