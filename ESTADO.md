# ESTADO DEL PROYECTO

Última actualización: 3 de septiembre de 2026

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. Nunca puede afirmar algo que no sea cierto en ese momento.

---

## 1 · Dónde estamos

|                |                                                                                         |
| -------------- | --------------------------------------------------------------------------------------- |
| **Terminados** | **M0 ✓** · **M1 ✓** · **M2 ✓** · **M3 ✓** · **M4 ✓** · **M5 ✓** onboarding y arranque   |
| **Siguiente**  | **M6** · Inventario, con su capa inteligente dentro                                     |
| **Pruebas**    | 613 unitarias y de base de datos · 152 de extremo a extremo                             |
| **Rama**       | `m5-onboarding`, sin fusionar                                                           |
| **Publicado**  | Web, app y **API vivas**. Base al día en la `0021`. Sin ninguna cuenta que pueda entrar |
| **Dirección**  | **Evolución de producto 1.0**, de aplicación de gestión a sistema operativo del local   |

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

### Lo primero de todo · crear una cuenta de verdad

**Ahora mismo no puede entrar nadie en Estook.** Ni tú. Es a propósito y es lo
correcto, pero no puede quedarse así:

```
pnpm bd:cuenta-de-verdad tu@correo.com "Ricardo"
```

Enseña una contraseña de un solo uso, que hay que cambiar al entrar.

### Lo que pasó con las ocho cuentas, y por qué ya no están

**La base de datos de Supabase llegó a tener ocho cuentas cuya contraseña está
escrita en este repositorio** —`estook en desarrollo`, en
[`base-de-datos/semillas/acceso.ts`](base-de-datos/semillas/acceso.ts)— y una de
ellas, la de Elena, tiene rol `direccion` y lo ve todo.

No eran un riesgo futuro: **la API ya estaba desplegada y se entraba desde el
móvil**, así que fueron ocho puertas abiertas de verdad. Se cerraron el 3 de
septiembre de 2026 con `pnpm bd:sin-cuentas-de-ejemplo`:

```
personas de ejemplo   8      sesiones abiertas   8
con contrasena        8      con PIN            21
personas de verdad    0      (no se toco ninguna)
```

La semilla se negaba a correr «en producción» mirando `ENTORNO`, **y esa negativa
no podía saltar nunca**: `ENTORNO` dice `desarrollo` en el `.env.local` de esta
máquina, mientras `DATABASE_URL`, dos líneas más abajo del mismo fichero, apunta
al Supabase de verdad.

Es, palabra por palabra, lo que el Plan había escrito en E4: **«una comprobación
que no puede fallar es peor que no tenerla»** y **«el nombre de una cosa decide
dónde acaba»**.

M5 arregla la causa: la semilla **mira a dónde se conecta**, no una etiqueta.
Contra cualquier base que no sea la de esta máquina se niega a sembrar
credenciales, lo dice por pantalla y sigue con lo demás. Todo está en
[`docs/pasos-para-cerrar-m5.md`](docs/pasos-para-cerrar-m5.md).

### Y después · lo que quedaba de M4, más lo que trae M5

1. ~~Fusionar el pull request de M4~~ · hecho
2. ~~`pnpm bd:migrar` y `pnpm bd:sembrar`~~ · hecho el 2 de septiembre
3. ~~Desplegar la API y declarar `VITE_API_URL`~~ · hecho, y se entra desde el móvil
4. ~~Cerrar las ocho cuentas de ejemplo~~ · hecho el 3 de septiembre
5. ~~Aplicar la `0020` y la `0021` y volver a sembrar~~ · hecho el 3 de septiembre
6. **Crear una cuenta de verdad**, que es lo de arriba del todo
7. **Montar el almacén de ficheros** con `pnpm almacen:preparar`, que crea el cubo
   y comprueba el camino entero: sube, firma, lee y borra
8. **Ver M5 en un móvil de verdad** con datos de verdad (regla 11)
9. **Fusionar la rama** con un solo pull request

`pnpm bd:comprobar-api` pasa hoy sin un solo fallo, con once comprobaciones que
allí no se pueden hacer porque necesitan una sesión abierta. Están explicadas en
su propia salida.

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

Leído de la base de datos de verdad el 3 de septiembre de 2026, **antes de
aplicar lo de M5**:

| Qué                            | Cuánto                                       |
| ------------------------------ | -------------------------------------------- |
| Migraciones aplicadas          | **19 de 21** · faltan la `0020` y la `0021`  |
| Tablas en el esquema `estook`  | 23, **todas** con seguridad por filas        |
| Roles · permisos · concesiones | 12 · 33 · 166                                |
| Reglas fiscales                | 17, todas con su referencia legal            |
| Datos de ejemplo               | 2 organizaciones, 7 locales, 8 personas      |
| Personas de verdad             | **0**                                        |
| La auditoría                   | añadir sí · modificar **no** · borrar **no** |

Al aplicar la `0020` y la `0021` pasan a ser **31 tablas**, y las semillas añaden
Casa Lola: la tercera organización, con un local y un gerente, **sembrada con el
alta a medias a propósito** para poder recorrer la quinta comprobación sin crear
un local a mano cada vez.

**Las ocho personas de ejemplo tenían una contraseña publicada en este
repositorio, y la API ya estaba desplegada cuando se vio.** Están cerradas desde
el 3 de septiembre. Sigue arriba del todo, en «qué hay que hacer», porque dejó la
base **sin ninguna cuenta con la que entrar**.

**La API está desplegada y viva**, y se entra desde el móvil. La base está al día
en la `0021`.

**Errores:** proyecto `estook-app` en Sentry, con solo «Error monitoring»
encendido y el repositorio enlazado.

**Variables del repositorio:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`. En Secrets, los dos de M4:
`TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. Todo en
[`config/claves.md`](config/claves.md).

**El peso real de lo publicado**, medido con `pnpm tamano`:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | 216,6 KB     | 106,1 KB                 |
| `admin`         | 182,5 KB     | 106,1 KB                 |
| `web` · `carta` | 164,2 KB     | 106,1 KB                 |

De 250 de referencia, que desde la Evolución 1.0 **se mide y se informa, no
bloquea**. **M5 entero le costó a `app` 11,1 KB**: las ocho pantallas del alta, la
guía de instalación, las tres tarjetas del Panel y el reductor de imágenes.

Quedan 33 KB de margen antes de la referencia, con Inventario, Escandallos, Carta,
Calendario, Equipo, Servicio, Negocio, Cuaderno y Fogón por construir. **Las
pantallas grandes van a tener que cargarse aparte**, como ya hace la gráfica.

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

#### Seis fallos que M5 encontró, y quién los cazó

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

#### Lo que M5 deja pendiente, dicho sin redondear

- **Los datos de ejemplo son maquinaria sin filas.** El registro, el botón y la
  regla de que no cuentan están hechos y probados; los seis productos, las tres
  fichas y la carta de cuatro platos los siembra M6, M9 y M10, porque sus tablas
  no existen todavía.
- **Los albaranes por foto** necesitan proveedores y productos: M7.
- **Google Places**, con las reseñas y los competidores: M23.
- **El almacén contra Supabase de verdad** no lo ha ejecutado nadie. Para eso
  está `pnpm almacen:preparar`.

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
| **0012** | **El producto nace en M6, y M5 le deja el diccionario**           |
| **0013** | **Google Places se aplaza a M23**                                 |

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
- **Las migraciones `0001` a `0021`.** Se amplían con una `0022`, nunca se editan
  (regla 2).
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

## 8 · El siguiente paso · M6

**Inventario**, y desde aquí **cada módulo nace ya con su capa inteligente
dentro**: eso es lo que cambia con la Evolución 1.0 a partir de M6.

**Entra.** Productos con formato, unidad de uso, factor, rendimiento, peso
variable, código de barras, tipo impositivo, alérgenos y mínimo · libro de
movimientos con lote · ajuste manual como movimiento · precios con vigencia y
precio medio ponderado · entrada por todas las vías · lotes y caducidades · ficha
completa.

**Y su capa inteligente.** Consumo medio y velocidad de consumo por producto,
**días de cobertura y previsión de agotamiento con fecha y hora**, e histórico de
precio por proveedor.

**Terminado cuando.** Se da de alta un producto en 30 segundos; al cambiar el
precio, el coste por unidad de uso y el medio ponderado cambian bien en un
producto con factor y rendimiento distintos de 1; el stock se reconstruye entero
desde los movimientos; y la previsión de agotamiento acierta el día en un producto
con consumo estable.

**Lo que M5 le deja hecho:**

- **El catálogo de referencia entero**, que es de donde se copia un producto.
  Formato, factor, unidad de uso, rendimiento, categoría fiscal y alérgenos ya
  puestos, con la cuenta explicada. **La mitad cara de «un producto en quince
  segundos» ya está**: falta copiar la fila.
- **El vocabulario**: `estook.unidad_de_uso`, los catorce alérgenos oficiales y
  `comoSaleElCoste` en el dominio. M6 los hereda, no los inventa.
- **Los objetivos**, que son los que ponen en verde o en rojo los semáforos de
  todo lo que M6 empiece a medir.
- **La maquinaria de datos de ejemplo.** M6 apunta sus productos en
  `estook.dato_de_ejemplo` y el botón del Panel se entera solo: no hay que tocar
  ni el comando ni la pantalla.
- **La ficha fiscal del local rellena**, que es lo que el motor fiscal necesita
  para ponerle un tipo a lo que se venda.

**Dos cosas que hay que decidir antes de M8, y M5 no las fuerza:**

1. **Quién ejecuta los procesos de fondo.** La bandeja de salida, la cola de
   trabajos y la limpieza de claves siguen sin ejecutarse. M5 no lo necesitaba
   —el modo demostración limpia al entrar, y los eventos se publican sin que nadie
   los lea, igual que antes— pero **M5 publica cinco eventos nuevos**, así que la
   bandeja crece. Merece su decisión escrita.
2. **La paginación de las listas.** M5 acotó el catálogo de referencia; el resto
   sigue sin tope.

**Cómo se comprueba que M6 no ha roto lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa` y `pnpm bd:comprobar-api` contra Supabase. Los dos
primeros pasan hoy; el tercero, cuando se apliquen la `0020` y la `0021`.
