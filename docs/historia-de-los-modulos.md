# Historia de los módulos

> Lo que hizo cada módulo, con sus fallos y sus porqués, tal y como se fue
> escribiendo en `ESTADO.md` hasta M6½. Se sacó de ahí el 10 de septiembre de 2026
> para que el estado se pueda leer en cinco minutos: **aquí no se ha quitado nada**.
> Las razones de fondo están en [`docs/decisiones/`](decisiones/).

---

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
- ~~**El almacén contra Supabase de verdad**~~ · **hecho**. `almacen:preparar`
  pasa los seis pasos contra el proyecto de verdad.
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

#### El bucle del segundo local, y lo que salió con él

**Un local nuevo volvía a preguntar «¿cuántos locales llevas?», y contestar
generaba otro local.** Es la trampa que encontró Richi dando de alta su segundo
negocio: se sale dejando la respuesta en blanco, o no se sale.

La causa es de fondo y merece quedar escrita: **el alta trata sus ocho pasos como
si fueran todos del local, y dos no lo son.** «¿Cómo te llamas?» es de la persona
—tu nombre no cambia porque abras otro bar— y «¿cuántos locales llevas?» es de la
organización, que se contesta una vez y no una por cada local. Preguntarlos otra
vez no es solo pesado: **ese en concreto genera locales al contestarlo**, y por eso
es un bucle y no una molestia.

Ahora un local creado desde el alta nace en el paso «¿dónde está?», que es el
primero que de verdad es suyo. Y si se creó **desde cero** —sin duplicar de otro—
su tipo queda apuntado como pendiente, para que la tarjeta del Panel lo ofrezca
sin meter a nadie otra vez en el asistente entero.

#### Un local de verdad se quedó sin sus categorías

`bd:comprobar-api` lo cazó en la base de producción: un local con tipo y **sin
una sola categoría**, que es el desplegable vacío justo donde la Auditoría promete
«nunca vacío: vienen de serie».

La reacción de M6 escucha los dos momentos en que un local puede saber de qué
tipo es —al crearlo y al responder el paso 2— y **ahora los dos están probados
contra la API de verdad**; el segundo no lo estaba, y es el que usa todo el mundo.
Contra la API de pruebas los dos funcionan, así que la causa exacta en producción
sigue sin conocerse.

Lo que no puede pasar mientras tanto es que la única salida sea escribir SQL a
mano en producción: para eso está `bd:reparar-categorias`, que dice cuáles están
mal y solo toca nada si se le pide con `--arreglar`. **El local de producción ya
está reparado.**

#### La aplicación ya se puede instalar en el móvil

Los iconos de 192 y 512 píxeles llevaban generados desde M3 y **no había
manifiesto que los usara**: en Android no salía «Instalar aplicación» y en iPhone
se abría dentro de Safari, con la barra de direcciones comiéndose una franja de
una pantalla que ya es pequeña.

Es otro «construido y nunca enchufado», y además era el **requisito escondido de
las notificaciones push**: iPhone solo se las da a lo que está en la pantalla de
inicio. Sin esto no habrían podido llegar nunca.

#### La auditoría a fondo, antes de pasar a M7

Se repasó todo lo construido buscando lo de siempre: cosas que existen y nadie
llama, datos que se guardan y no llegan, y botones que prometen algo que no hacen.
Salieron **seis fallos**, y uno de ellos era de seguridad.

**1 · Medir la cobertura del catálogo, que era lo que faltaba.** La lección
estaba escrita desde M6 —«una consulta que ninguna prueba llama es una consulta
rota que todavía no sabes que lo está»— y era **solo prosa**. Ahora la API de
pruebas apunta qué operación ejecuta cada prueba mientras corren, y
[`pnpm cobertura`](herramientas/cobertura-del-catalogo.mjs) lo compara con el
catálogo al terminar. **La primera medición: 43 de 62.**

No se puede medir leyendo el código, y por eso no se había medido antes: las
pruebas de extremo a extremo **pulsan botones**, así que el nombre del comando no
aparece en ninguna parte del fichero de la prueba. Contar nombres con `grep` da un
número que no significa nada.

Lo que la medida destapó, en orden de gravedad:

**2 · El segundo factor entero, sin una sola prueba que lo viera funcionar.**
Activar, confirmar, superar y quitar: cuatro comandos, cero pruebas que los
ejecutaran. Ahora hay una que hace el camino completo, con **un TOTP calculado en
la propia prueba** —una segunda opinión sobre el RFC 6238, no una llamada a la
función del servidor, que no comprobaría nada— y que además comprueba que un
código de respaldo **se gasta al usarlo**.

**3 · A nadie se le podía retirar el acceso.** El guardián de «segundo
administrador o correo de recuperación obligatorio» preguntaba una sola cosa: «sin
contar a esta persona, ¿queda alguien que administre?». En una organización que
**nunca tuvo** dirección ni correo de recuperación —la de Ricardo, sin ir más
lejos— la respuesta era «no» **para todo el mundo**. Retirarle el acceso al
cocinero que se fue devolvía «el negocio se queda sin nadie que pueda
administrarlo», que además era mentira.

**Es un fallo de seguridad, no de texto:** quien se iba seguía entrando con su
PIN, porque la aplicación no dejaba quitárselo. Ahora se comparan las dos fotos
—cómo está la organización contándola y cómo quedaría sin ella— y solo se bloquea
cuando esa persona es justo lo que sostiene el acceso. Con **su prueba al lado**,
porque un guardián que se toca sin prueba es un guardián que un día deja de
guardar.

**4 · Se podía quitar y no se podía traer de vuelta.** Un producto desactivado
desaparecía de la lista **para siempre**, y un proveedor desactivado igual. Las dos
consultas aceptaban `incluir_desactivados` desde el primer día de M6 y estaban
probadas; lo que no había era una pantalla que lo pidiera. Y `reactivar_producto`
llevaba desde M6 en el catálogo **sin nadie que lo llamara**, apuntado como
excepción con la razón «su pantalla llega con M8».

La lección, que es nueva y va en «cómo trabajamos»: **una excepción apuntada con
una razón bonita sigue siendo un agujero.**

**5 · Un «Deshacer» que no deshacía un movimiento de stock.** Apuntar género abría
la barra de deshacer con un botón cuyo `deshacer` era `() => undefined`: se
pulsaba, la barra desaparecía y **el movimiento seguía apuntado**. Peor que un
botón mudo, porque quien lo pulsaba se iba creyendo que la cámara decía otra cosa.

Y no se arregla poniéndole un deshacer de verdad: «el stock es un libro de
movimientos» (regla 8), el libro solo se añade, y **eso es lo que hace que se pueda
auditar**. Ahora el aviso dice que se corrige con otro movimiento, que es la
verdad.

**6 · Quién puso cada precio se guardaba y no se enseñaba.** `creado_por` era la
**única columna de las 363 del esquema** que se escribía sin que ninguna consulta
la leyera. «Lo que hace cada uno queda con su nombre» (Manifiesto 8) lo cumplía el
libro de movimientos y no el de precios, que es donde más falta hace: un precio
mal metido se arrastra a todos los escandallos.

**7 · El Panel llevaba desde M3 esperando a Inventario, y M6 no lo enchufó.**
Dos tarjetas con su letrero puesto —«los pendientes los traen Inventario (M6) y
Servicio (M12)», «se llenará con M6 y M8»— seguían diciendo «todavía no hay nada
que medir» mientras `inventario_hoy` devolvía **exactamente eso**: lo que está por
debajo del mínimo, lo que caduca y lo que no tiene precio.

No faltaba código: faltaba que dos partes construidas se hablaran. Y es la
primera pantalla que se ve cada mañana. Ahora el Panel enseña lo que hay que
atender —caducidades primero, que tienen fecha— y cuántos productos tienen precio,
con su botón a Inventario. A quien no tiene la app no le sale nada, que es la otra
mitad de la regla.

**Y la prueba que lo tapaba era una prueba en verde.** `los widgets del Panel
tambien` comprobaba que las tarjetas siguieran vacías, así que M6 pudo terminar
sin llenarlas y nadie se enteró. Ahora comprueba la verdad de hoy: con género,
números; sin la app, nada.

**8 · «Conectar ahora» estaba apagado.** Con la explicación debajo en letra
pequeña, que suena honesto y no lo es: un botón apagado no se lee, se ignora.
Ahora contesta, como avisos, chat y Fogón.

**Después de la auditoría: 56 de 62 operaciones, el 90 %.** Las siete que quedan
están apuntadas **una por una con su razón y con el módulo donde se pagan**, en el
propio fichero de la herramienta. Esa lista es una deuda, no una excepción.

#### Y dónde vive Fogón, decidido y construido antes que Fogón

La pregunta salió mirando el móvil —«¿y la IA? No hay burbuja, no hay nada, ni la
entiendo»— y la respuesta corta es que **Fogón es M22**. Pero debajo había una
decisión de producto sin tomar, y tomarla ahora se llevó por delante la salida
mala.

**La salida mala era una pestaña «Fogón» en cada app.** Es lo que se deduce
leyendo el Plan al pie de la letra —«presente en **todas** las apps»— y tiene tres
problemas: son ocho pestañas en barras que B5 limita a cuatro; te obligan a salir
de lo que estás haciendo para preguntar por lo que estás haciendo; y dicen que
Fogón es un sitio al que se va, cuando es algo que está.

**Lo decidido** ([decisión 0015](docs/decisiones/0015-fogon-es-una-burbuja-no-una-pestana.md)):

- **Burbuja flotante en móvil**, por encima de la barra de abajo, en todas las
  pantallas.
- **Icono de arriba a la derecha en escritorio** —el que B5 ya mandaba— abriendo
  un **panel lateral que no tapa** lo que estabas mirando. Y `Ctrl+J`.
- **Sabe en qué pantalla estás** y lo dice lo primero.
- **Es también un chat de verdad**: se le pregunta cualquier cosa desde cualquier
  sitio, no solo sobre la pantalla de delante.
- **Nunca una pestaña.** Las pestañas de cada app se quedan para los **análisis
  que Fogón deja hechos**, calculados fuera de hora y guardados: cada 8 horas lo
  que se mueve con cada servicio, cada 12 lo del día, cada 24 lo de la semana. La
  cadencia la decide el dato, no la app.

**Se construye el sitio, no la conversación.** Dónde vive un botón es navegación,
y dejarla para M22 obligaría a rehacer la barra, la rueda y el esqueleto cuando
llegue. La ventana dice con esas palabras que todavía no se puede hablar con él, y
**no lleva casilla de escribir apagada**: un control muerto es el fallo que más
veces ha aparecido en este proyecto.

Está escrito además donde se lee: **B5 y la ficha de M22 del Plan**.

#### Lo que M6 deja pendiente, dicho sin redondear

- **Sigue sin poder darse por terminado** (regla 11): falta aplicar la `0024`,
  desplegar la API y volver a mirarlo en el teléfono con todo puesto. Los pasos
  están en `docs/pasos-para-cerrar-m6.md`.
- **El widget «Tu equipo» no dice quién está fichado ni cuántas horas lleva.**
  Eso son los fichajes, M15, y hasta entonces no hay de dónde sacarlo.
- **El atajo al TPV cuando esté conectado** es M18: hoy la tarjeta solo se puede
  aplazar, porque el asistente de conexión no existe.
- **Fogón tiene su sitio, no su voz.** La burbuja, el panel y el contexto están;
  la conversación, el presupuesto por local y día, la caché y la voz son M22.
- **Los análisis periódicos de las pestañas necesitan el reloj**, que sigue sin
  decidirse. Sin reloj no hay «cada 8 horas».
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

### M6½ · La capa de producto

**No es un módulo del Plan: es la pausa que pidió Richi antes de M7.** «El diseño y
cómo mostramos todo es superlioso, las páginas, las apps y las cosas dentro»; «la
info se muestra supersuelta, nada ordenada, mucho texto y mal explicado»; «hay
opciones como "crearlo a mano" que salen abajo del todo cuando es un botón que se
utiliza mucho».

No reordena nada del Plan: adelanta **las dos primeras prioridades de la Evolución
1.0** —el rediseño del Panel y el sitio de Fogón— que el capítulo 16 pone antes que
todo lo demás, y que estaban esperando a módulos que llegan mucho después.

**Lo que hay:**

- **Destinos y vistas** ([decisión 0018](docs/decisiones/0018-destinos-y-vistas.md)).
  Cada app tiene como mucho cuatro **destinos** —un sitio que contesta una
  pregunta, abajo en móvil y en menú lateral en escritorio— y cada destino sus
  **vistas**, que son la misma pantalla mirada de otra forma, en un control
  segmentado arriba. **Un destino sin construir no ocupa posición**, y ninguna app
  vuelve a tener un «Más».
- **Cada app declara su forma**: panel, lista, calendario o cuaderno. Decide el
  ancho y la rejilla, y es lo que hace que un calendario no sea una lista con otro
  acento.
- **El menú lateral de cada app en escritorio**, que B5 mandaba desde M3 y no se
  había construido. Con la pregunta que contesta cada destino debajo de su nombre:
  en una pastilla solo cabe una palabra.
- **El Panel de cada uno** ([decisión 0019](docs/decisiones/0019-el-panel-de-cada-uno-vive-en-el-servidor.md)).
  Zona de atención fija arriba, y debajo una rejilla de widgets **de dos columnas
  en móvil** y cuatro en escritorio, con tres tamaños, que se arrastra, se añade y
  se quita, y **se guarda en el servidor por persona y por aparato** (migración
  `0025`). Con su catálogo de dieciséis widgets: los nueve que existen hoy y los
  siete que llegan con su módulo, en gris y sin poder pulsarse.
- **Un catálogo de acciones** ([decisión 0020](docs/decisiones/0020-un-catalogo-de-acciones.md)),
  único dueño de «qué se puede hacer». De ahí salen los accesos rápidos del Panel
  —que el Manifiesto pedía y no existían—, la paleta del buscador universal y los
  botones de Fogón. Y **una acción es una dirección**, así que el enlace a «añadir
  un producto» se puede copiar y pegar en el chat del equipo.
- **El libro de movimientos, entero y legible.** Es la pantalla nueva más
  importante, y está contada abajo.
- **Fogón con contexto y con botones que hacen algo.** Sabe dónde estás **y qué
  cifras hay delante**, y ofrece las acciones de esa pantalla que funcionan hoy.
  Sigue sin casilla para escribirle: eso es M22.

#### El libro de movimientos: el registro que no se podía leer

«El stock es un libro de movimientos, y no hay ninguna tabla con una cantidad
editable» es la regla 8, y es lo que hace que la cámara se pueda auditar: el libro
solo se añade, nadie tiene concedido el `update`, un disparador lo rechaza y un
movimiento equivocado se enmienda con otro.

**Y el libro no se podía leer.** Sus líneas solo salían dentro de la ficha de un
producto, de un producto a la vez y las cincuenta últimas. Es decir: el proyecto
tenía el registro inmutable montado, probado y protegido, y **la pregunta para la
que sirve un registro inmutable** —«esta mañana faltaban cuatro kilos de pulpo,
¿quién apuntó qué y cuándo?»— **no se podía contestar** sin abrir fichas de una en
una.

Es la familia de fallo de siempre en su versión más cara: no faltaba código de
servidor ni había nada mal hecho. Faltaba la pantalla.

#### Ocho fallos de lo de antes, y cuatro estaban en la primera pantalla del día

**1 · El Panel inventaba una cifra.** Pintaba **«Facturado · 0,00 €»** en la
tipografía más grande de la pantalla con el TPV sin conectar. Es exactamente lo que
este proyecto tiene escrito que no se hace —«poner un cero en gris sería inventarse
una cifra»— y lo tenía escrito **dos tarjetas más abajo, en el mismo fichero**.

**2 · Y dos números de módulo mal, ahí también.** Decía que las ventas del TPV las
traía «M13», que es Equipo, y que Negocio era «M17», que es Cuaderno. El número
estaba escrito a mano en el texto de cada tarjeta, y en otro fichero había una tabla
con los ocho bien: un dato con dos dueños acaba con dos valores (regla 6). Ahora se
escribe una vez, en el catálogo de navegación.

**3 · Un andamio de pruebas publicado.** «Deshacer · apuntar una nota de prueba»
era un botón de M3 con un `deshacer` que no deshacía nada, puesto en el Panel para
comprobar que la barra aparecía y contaba diez segundos. **Se quedó publicado en el
Panel de un negocio de verdad.**

Y quitarlo dejaba a M3 con dos flujos de deshacer de los tres que pide su criterio,
así que el tercero es ahora uno de verdad y mejor: **quitar un widget del Panel**,
que se hace sin querer —la ✕ está a un centímetro del asa de arrastrar— y que
destruye lo que acabas de colocar a mano. «Volver al panel de siempre» también se
deshace, que se lleva el Panel entero.

**4 · Una prueba en verde que contradecía al maestro.** `apps.prueba.ts` fijaba las
pestañas de cada app **con los valores copiados dentro**, y por eso estuvo en verde
diciendo que Negocio tenía «Reseñas» donde la tabla de B5 dice «Pulse». Tres sitios,
dos valores, y la comprobación del lado equivocado. Ahora **lee el Plan**, no una
copia del Plan.

**5 · Y este documento decía que había una prueba cuadrando los números de módulo
con el Plan. No la había.** Es justo lo que `ESTADO.md` no puede hacer. Ahora
existe: lee los títulos de la parte D y los compara con el catálogo.

**6 · Ajustes estaba dos veces en el móvil**, arriba y abajo, a diez centímetros una
puerta de la otra. Y en escritorio también: un icono de ajustes y, pegado, un avatar
que abría la misma pantalla —cinco cosas en una fila donde B5 pide cuatro—.

Quitar sin más el de arriba habría reabierto el agujero que M6 tapó: **dentro de una
app la barra de abajo es la de esa app**, así que ahí no hay posición «Ajustes».
Ahora el avatar abre **tu cuenta** —ajustes, mi acceso, cambiar de local y salir—,
que es lo que hay detrás de un retrato en cualquier aplicación, y funciona desde
cualquier pantalla.

**7 · La barra de arriba en móvil tenía seis botones y el nombre del local en 375
píxeles.** Fue el precio de tapar el agujero de M6 trayéndose las cinco de
escritorio tal cual: lo que en un ordenador es una fila cómoda, en un teléfono es
una fila donde se pulsa lo de al lado, y el nombre del local se quedaba sin sitio
para leerse. Se dejaron en cuatro: dónde estás, buscar, **la bandeja** —los avisos y
el chat comparten puerta, porque las dos son cosas que alguien te manda— y el
avatar.

> **Esto cambió en M6½ · segunda tanda.** El chat y Fogón volvieron arriba, y lo
> que se fue fue Ajustes, que estaba dos veces. La de hoy está más abajo, en «En el
> móvil se habían ido tres botones cuando sobraba uno».

**8 · El alta de un producto enseñaba ruido antes de escribir nada.** Abrir la hoja
consultaba el catálogo con la casilla vacía, así que lo primero que se veía eran
**doce referencias elegidas por nada**, y debajo de las doce el botón «Crearlo a
mano» —que es el que usa cualquiera que compre algo que el catálogo no tenga, y el
catálogo es una ayuda, no un censo del género de España—.

Ahora la búsqueda empieza a las dos letras, «Crearlo a mano» está arriba desde el
primer instante, el formulario va agrupado por lo que pregunta, la cuenta del envase
sale en su caja y **el aprovechamiento se puede corregir también viniendo del
catálogo**: el pulpo llega al 55 % y quien lo compra ya limpio no tenía dónde
decirlo.

#### Y uno más, que salió al arreglar los otros

**«Con acceso» enseñaba solo a quien ya había entrado.** Así que invitar a alguien y
verlo desaparecer de la lista que tienes delante era el camino normal, justo cuando
acabas de darle el PIN y quieres comprobar que está. Quien fue invitado **tiene
acceso**: su PIN vale y puede entrar cuando quiera. «Sin entrar todavía» sigue
siendo su vista, para poder repasarlos de un golpe.

Lo cazó una prueba de M4 que llevaba meses en verde, y se cayó en cuanto la lista
dejó de enseñarlo todo mezclado.

#### La segunda tanda · lo que salió de mirarlo desplegado

La primera tanda se fusionó, se aplicó la `0025` y se desplegó la API. Y entonces
Richi lo miró funcionando, que es la regla 11, y salieron **seis cosas**. Cuatro
eran fallos y dos eran que me había pasado de frenada.

**1 · La personalización del Panel se perdía. Siempre.** «Todo lo que personalices,
si refrescas o te mueves de página y vas atrás, se quita y vuelve a como estaba por
defecto.»

Eran **tres agujeros en el mismo sitio**, y conviene tenerlos escritos porque los
tres son de la misma familia —guardar tarde y no mirar quién es el dueño del dato—:

- **El guardado con retraso se aplicaba a todo.** Los 800 ms existen porque
  arrastrar un widget produce veinte reordenaciones; pero **quitar, añadir o
  cambiar el tamaño producen una**. Esperar abría una ventana en la que recargar o
  salir del Panel perdía el cambio — y salir del Panel justo después de colocar
  algo es lo normal: se coloca y uno se va a mirar lo que ha colocado.
- **Al guardar no se tocaba la caché**, así que seguía con lo viejo **y con la
  versión vieja**. Volver al Panel leía esa caché y pisaba lo tuyo; y el siguiente
  guardado mandaba una versión que ya no era la de la fila, así que el servidor
  contestaba «lo cambió otra persona» —contra ti mismo— y **dejaba de guardar del
  todo**.
- **Y al desmontar la pantalla se cancelaba el reloj y se tiraba lo pendiente.**

Ahora la caché es el único dueño de lo que se pinta (regla 6), los gestos sueltos
se guardan al momento, el retraso se queda solo para el arrastre —y se manda al
soltar el dedo—, **solo hay un guardado en vuelo** con los demás en cola, y lo
pendiente se manda al desmontar y al cerrar la pestaña. Y «guardando…» dura hasta
que la cola está vacía, no hasta que vuelve la primera petición.

**Ninguna prueba lo vio**, y la razón es la de siempre: la que había pulsaba
«Listo» antes de recargar, y «Listo» guarda al momento. **Probaba el camino
cómodo.** Ahora hay tres que hacen lo que hace una persona: tocar algo y **irse**.

**2 · En el móvil se habían ido tres botones cuando sobraba uno.** «Solo quería
eliminar ajustes de arriba en móvil para que no se vea doble.» Se quitaron Ajustes,
el chat y Fogón. Y en el ordenador se quitó Ajustes, que ahí sí hacía falta.

La lección es pequeña y cara: **se arregla lo que se ha visto, no lo que uno deduce
de lo que ha visto**. El argumento para quitar Ajustes del ordenador —«abre la misma
pantalla que el avatar»— era medio bueno y la conclusión mala: en un ordenador hay
sitio de sobra, y quien lleva un local entra en Ajustes muchas veces al día.

Ahora, y está en B5: **móvil** dónde estás · buscar · avisos · chat · Fogón ·
avatar. **Escritorio** lo mismo **más Ajustes**. Los botones se quedan en el toque
mínimo de 44 px y lo que cede es el nombre del local, que se recorta.

**3 · El alta de un producto preguntaba tres cosas que no son del producto.**
«Preguntas cosas como "cómo lo compras", "cuánto trae", "unidad con la que
cocinas"… no tienen sentido.»

Ahora pregunta **cómo se llama, en qué se mide y lo que cuesta esa medida**, y si
eliges kilos la casilla dice «lo que te cuesta el kg». Lo del envase está plegado
debajo y se abre solo cuando el catálogo propone uno. Por debajo es lo mismo: en el
modo sencillo el factor es 1, así que el precio del kilo **es** el coste por unidad
de uso, y no hay un segundo camino de datos ([decisión 0021](docs/decisiones/0021-el-producto-se-mide-en-una-unidad.md)).

Y la razón de fondo, que es la que importa para lo que viene: **cuántos gramos
lleva una ración es de la ficha técnica**, no del producto. Eso es M9, y ahora no
hay que preguntarle a nadie dos veces en qué unidad cocina.

**4 · Y el formulario tenía «Cómo lo compras» dos veces**, una como título de
sección y otra como etiqueta de la casilla de al lado. Lo puse yo en la primera
tanda agrupando el formulario, y se ve en la captura sin tener que buscarlo.

**5 · Delivery no estaba en ninguna parte.** Ahora Servicio tiene su destino
`Delivery`, con Uber Eats por su nombre y su icono, y el Panel su widget en el
catálogo. **Sin ningún botón de conectar**: la integración es M29
([decisión 0022](docs/decisiones/0022-el-reparto-tiene-sitio-antes-que-conexion.md)).

Para que cupiera sin pasar de cuatro destinos, **el cierre pasa a ser una vista de
la jornada**, que es lo que es: cerrar la jornada es el final de la jornada, no otro
sitio.

**6 · Y la rueda salía con un cuadrado naranja alrededor.** Es el anillo de foco de
B8: la rueda se abre y la aplicación le da el foco al lienzo, porque es quien
escucha las flechas, y en iOS eso hace que `:focus-visible` se cumpla aunque se haya
abierto con el dedo. Un rectángulo de 2 px alrededor de una rueda redonda.

No se arregla apagándolo —«foco visible siempre» es B8— sino mirando **con qué se
está manejando la aplicación**, que es lo que el navegador deja de saber cuando el
foco lo pone el código. Con el dedo no se pinta; con el teclado sí, y redondo.

#### Y el rojo de la primera fusión

`alta.spec.ts` se cayó al fusionar, con «Hola, Pablo» donde esperaba «Cinco
pantallas y a trabajar». **La prueba estaba escrita fuera del bloque en serie** que
existe justo para eso: el alta de Casa Lola es una sola, tres pruebas de ese bloque
la **terminan**, y esta entraba mientras otra la daba por acabada. La cabecera del
bloque lo decía con todas las letras —«comparten un local y no se puede compartir a
la vez»— y la prueba se escribió al lado, no dentro.

Y las del Panel tenían el mismo problema repartido en tres bloques distintos: entre
bloques se corre en paralelo igual. Ahora están todas en uno, de una en una, y
ningún otro fichero toca el Panel de la gerente.

#### Y tres rojos más, ninguno del producto

Con la segunda tanda ya escrita, la tanda entera —**tres navegadores**, que es lo
que corre en integración continua— tardó cuatro intentos en salir verde. Ninguno de
los tres fallos era de la aplicación, y los tres merecen quedar escritos porque son
tres formas distintas de que **el banco de pruebas mienta**.

**Uno · pruebas sin pantalla corriendo tres veces.** `catalogo-vivo.spec.ts` son
diez pruebas que hablan con la API a pelo, sin abrir ninguna pantalla. Se corrían en
los tres proyectos: al servidor le da igual quién le hable, así que no comprobaban
nada nuevo y **triplicaban** las escrituras contra la única base de datos de
pruebas. De ahí salían «el segundo factor» y «las sesiones abiertas» en rojo un día
sí y otro no: tres copias de la misma prueba activando y quitando el segundo factor
de la misma persona a la vez. Ahora se corren una vez, en `escritorio`, dicho en
`playwright.config.ts`. **Una prueba que no toca pantalla se corre una vez.**

**Dos · la API de pruebas cerraba las conexiones por debajo.** Node cierra las
conexiones reutilizables **a los cinco segundos** de estar quietas, y aquí están
quietas mucho: las peticiones van de una en una porque PGlite es una sola conexión.
Con las pruebas en paralelo había clientes esperando turno con el socket abierto;
cuando les tocaba, mandaban por un socket recién cerrado y se llevaban un
`ECONNRESET`, que en la prueba sale como «no se ha podido entrar» o como un tiempo
agotado, **sin ninguna relación con lo que se estaba probando**. Dos minutos de
espera, y un `clientError` que contesta al socket roto en vez de tumbar el proceso.

**Tres · una comprobación que hacía dos cosas sin decirlo.** Doce sitios esperaban
a entrar así: «el título de nivel 1 **no** pone "Entra en Estook"». Y
`not.toHaveText` exige que haya **exactamente un** título: en el hueco en que uno se
va y el siguiente no ha llegado —«Cargando tu sesión», que no lleva ninguno— no es
que no se cumpla, es que **se cae**. En una máquina rápida ese hueco no se pilla
nunca; en Safari y con las tres tandas a la vez, sí.

Lo caro fue lo siguiente: al cambiarla por «cuenta cero», la tanda salió **peor**,
con quince rojos en el buscador y en los atajos. Porque la comprobación vieja hacía
**dos** cosas —que el título de entrar no esté **y que haya un título nuevo**— y al
arreglar la primera se perdió la segunda: las pruebas seguían desde «Cargando tu
sesión» y Ctrl+K no abría nada, porque los atajos todavía no escuchaban. Ahora van
las dos escritas, que es lo que había que haber hecho desde el principio.

#### Cómo se comprueba que M6½ está terminado

No tiene ficha en el Plan, así que su criterio es este:

| Qué                                                | Cómo se comprueba                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ninguna posición de ninguna barra lleva a un hueco | El e2e recorre **los destinos que cada app ofrece de verdad**, no los del catálogo             |
| Los destinos y las vistas son los de B5            | Una prueba **lee la tabla del Plan** y la compara con el catálogo del código                   |
| El Panel se monta y lo montado se guarda           | Se añade un widget, se pulsa «Listo», se **recarga la página** y sigue ahí                     |
| Un destino sin construir dice en qué módulo llega  | Se abre `/carta/menus` a mano y tiene que poner «M10 · Carta, menús y análisis»                |
| El libro contesta, y el filtro por tipo filtra     | Se le pregunta a la API a pelo, y se comprueba que todas las líneas de «Entradas» son entradas |
| Fogón trae las cifras que hay delante              | Se abre la burbuja en Inventario y tiene que salir «Productos de alta» con su número           |
| Lo que se personaliza **no se pierde**             | Se quita un widget y se recarga, y se sale de la pantalla y se vuelve, **sin pulsar «Listo»**  |
| Un producto se da de alta sin hacer cuentas        | Nombre, unidad y precio de esa unidad; sin abrir el pliegue no existe ni «cuánto trae»         |
| El reparto tiene sitio y ningún botón de mentira   | Se abre `/servicio/delivery`: sale Uber Eats con su módulo, y no hay ningún «Conectar»         |
| La rueda no pinta el anillo al tocarla             | Se abre con el dedo y se mira el `outline` del lienzo. Con teclado, encendido y redondo        |
| Y **mirarlo en un móvil de verdad**                | La primera tanda, mirada: de ahí salió la segunda. La segunda, **pendiente** (regla 11)        |

#### Lo que M6½ deja pendiente, dicho sin redondear

- **Sigue sin poder darse por terminado** (regla 11): la primera tanda está
  fusionada, migrada y desplegada, y **la segunda está sin fusionar y sin mirar en
  el teléfono**. La segunda no trae operaciones nuevas, así que no hay que
  desplegar la API ni aplicar ninguna migración.
- **Fogón tiene contexto y botones, pero no voz.** La conversación, el presupuesto
  por local y día, la caché y la voz son M22, y hablar con él necesita una decisión
  de Richi: qué modelo y cuánto al día.
- **Los widgets que llegan con su módulo son siete**, y salen en el catálogo en
  gris: Pulse, dónde se va el margen, ventas de hoy, calendario, mi turno, platos
  bajo objetivo y avisos de Fogón. Están ahí porque saber que van a existir cambia
  cómo se monta el Panel hoy.
- **«Fijar cualquier cosa al Panel desde cualquier app»** (Manifiesto 6) no está: no
  hay widget de «fijados». Necesita que cada app sepa qué es fijable, y hoy solo hay
  una app construida.
- **El calendario sigue siendo M14, y hay algo que decidir antes.** Las caducidades
  de M6 y los días de reparto de M7 **son eventos de calendario**. Si M14 nace sin
  saberlo, hay que reescribirlo. Está apuntado abajo, en lo que hay que decidir.
- **El escaneo con la cámara** sigue esperando a que haya un aparato con el que
  probarlo, y el lector de los de verdad —que escribe como un teclado— ya funciona.
- **El reparto tiene sitio y no tiene conexión.** Uber Eats es el primero y llega
  con M29; hasta entonces la pantalla dice qué va a entrar y no ofrece conectar
  nada ([decisión 0022](docs/decisiones/0022-el-reparto-tiene-sitio-antes-que-conexion.md)).
- **Los filtros de una lista no se llevan en la dirección**, solo la vista. Buscar
  «pulpo» en Productos y volver atrás pierde el texto. No es personalización —no se
  guarda por persona— pero el enlace a una búsqueda concreta tampoco se puede
  compartir, y eso sí es una carencia que se paga cuando haya que mandar «mira
  esto» por el chat del equipo.
- **`mis_locales`, `mis_permisos` y `un_local`** siguen registradas y sin pantalla,
  igual que al cerrar M6.

#### Lo que le costó al paquete inicial

`app` pasa de **229,5 KB a 243,4 KB**, de los 250 de referencia. Son 13,9 KB por
todo lo de arriba, y hubieran sido 17 si no se hubieran apartado dos cosas del
paquete inicial, como la gráfica desde M3: **la ficha de producto** —1.300 líneas
con sus tres hojas, que no hace falta hasta que alguien abre un producto— y **el
libro de movimientos**, que es uno de cuatro destinos.

No se hizo para cuadrar el presupuesto de tamaño, que «se mide y se informa»: se
hizo por lo que dice B7, que **un módulo que no cumple su presupuesto de velocidad
no está terminado**, y abrir una app tiene 200 ms.

Quedan **6,6 KB de margen**, y M7 trae pantallas grandes. El siguiente módulo
tendrá que cargarse aparte desde el principio, no al final.

---

### La auditoría de infraestructura, antes de M7

Antes de seguir con Proveedores y compras se paró a mirar el cimiento entero, con
una pregunta por delante: **que la IA no se pierda ni mezcle datos de personas
distintas**, y que nada se pierda por el camino.

#### Lo que está bien, y conviene tener escrito

Que un repaso diga «esto aguanta» vale tanto como que encuentre fallos, siempre
que diga **por qué** aguanta:

- **El servidor no puede enseñar el local de otro.** Cada consulta filtra por
  `sesion.localId` —que sale del token, nunca de lo que mande el cliente— y por
  debajo están las políticas de M1, escritas todas contra `locales_visibles()`. La
  API se conecta como `estook_api`, que no es dueño de las tablas, así que las
  políticas le aplican. Y hay prueba: pedir el producto de otro local devuelve
  404, no «existe pero no es tuyo».
- **La identidad muere con la transacción.** `set local`, nunca `set`. En Edge
  Functions las conexiones se comparten entre peticiones, y con un `set` normal la
  segunda petición heredaría la identidad de la primera (decisión 0005).
- **Todas las tablas tienen RLS encendida**, las treinta y tantas, sin una sola
  excepción.
- **Las cuentas del inventario tienen un dueño**, y el stock es un libro: se
  reconstruye desde los movimientos y hay prueba de que cuadra.
- **Los índices están puestos** donde se busca de verdad: por local y actividad,
  por producto y caducidad, y la sesión se resuelve por una huella única.

#### Y los siete agujeros, en orden de gravedad

**1 · Cambiar de local no vaciaba la caché de la pantalla.** El grave, y el que
contesta la pregunta que se hizo. `cambiar_de_contexto` cambiaba el local en el
servidor y después se volvía a pedir `quien_soy` **y nada más**. Todo lo demás
—los productos, lo que hay en cámara, el libro, lo que caduca— seguía en la caché
con su clave de siempre, sin el local dentro. Y la caché aguanta un minuto sin
caducar: **durante ese minuto salía el género de un local con el nombre de otro
arriba**.

El servidor nunca estuvo en peligro. Pero una merma se apunta mirando la pantalla,
y «que nadie apunte una merma en el local equivocado» (Manifiesto 28) es la razón
por la que el selector de local existe.

Y hay un segundo consumidor que lo hacía peor: **el contexto de Fogón se arma con
esa caché**. Hoy solo se enseña en la ventana; en M22 es lo que iba a recibir el
modelo, y una frase en prosa no lleva encima de dónde salió el número. De ahí sale
la [decisión 0023](docs/decisiones/0023-fogon-nunca-arma-su-contexto-en-el-navegador.md):
**el contexto de Fogón lo arma el servidor**, con su sello de persona, local y
hora, y se comprueba antes de mandar nada.

El arreglo va en un sitio —al cambiar la persona, la organización o el local se
tira todo menos `quien_soy`— y no en la clave de cada consulta, por lo mismo que
las puertas de sesión viven en el despachador: la regla no se cumple porque quien
escribe se acuerde, se cumple porque **no hay camino que la rodee**.

**2 · Los cinco sitios que cambian de local no miraban si había salido bien.** Si
fallaba, la pantalla se iba al Panel con el local de antes y con cara de haber
cambiado. Ahora hay un `cambiarDeSitio` en la sesión, uno para los cinco, que
espera al servidor, lo dice en la barra de abajo si falla y devuelve si se puede
seguir. La acción más delicada de Estook era la única sin comprobar.

**3 · Dos mensajes del catálogo de errores prometían cosas que no pasan.** Y el
catálogo es cerrado justamente para que no ocurra:

- «No hay conexión. **Lo que has apuntado se guarda en el móvil y sube solo cuando
  vuelva la señal.**» No hay ninguna cola de salida en el navegador: un comando que
  se cae sin conexión **se pierde entero**. Quien está en una cámara sin cobertura
  lee que ya está guardado y se va.
- «La sesión ha caducado. **Lo que estabas escribiendo se ha guardado.**» Tampoco:
  al caducar se borra el token y se tira la caché, y la pantalla se desmonta con lo
  que hubiera dentro.

Los dos dicen ahora lo que pasa y qué hacer. Las dos funciones que harían verdad
los mensajes viejos —**cola de salida** y **borradores**— están apuntadas abajo
como lo que son: trabajo, no una frase.

Y el primero estaba además **copiado a mano** en `cliente-api`, con las dos copias
ya diciendo cosas distintas. Se coge del catálogo.

**4 · La idempotencia está construida, probada… y no la usa nadie.** El servidor
hace bien su parte: la misma clave dos veces devuelve la respuesta de la primera
sin ejecutar nada. Pero el cliente **genera una clave nueva en cada llamada**, así
que no hay dos llamadas que compartan clave y no protege de nada. El caso que la
justifica —«un móvil en una cámara que pierde la cobertura justo después de
enviar; la persona vuelve a pulsar»— sigue abierto. Está apuntado abajo.

**5 · Las acciones rápidas se guardaban con una sola clave por aparato.** En una
tablet de cocina que usan cuatro, el segundo se encontraba las del primero y al
tocar una se las quitaba. No es un agujero de seguridad —solo salen las acciones
que el permiso de quien mira deja salir— pero es la personalización de otra
persona en tu pantalla. Van por persona.

**6 · No había política de seguridad de contenido.** El token vive en
`localStorage` a propósito y está razonado, y lo único que lo protegía era la
promesa de que nadie escribiría un `innerHTML` con datos de nadie. Eso es una
promesa sobre el código de mañana. Ahora hay `script-src 'self'`, que lo cumple el
navegador, y se calcula al construir porque `connect-src` depende de dónde esté la
API ([`herramientas/politica-de-seguridad.ts`](herramientas/politica-de-seguridad.ts)).

**7 · El alta iba en el paquete inicial.** Dos mil doscientas líneas que se usan
una vez por local, descargadas cada mañana por todo el mundo para no verlas. Ahora
se pide cuando hace falta: **244,0 KB → 235,6 KB**, y el margen pasa de 6 a 14,4.

#### Y dos del banco de trabajo, que escondían cambios

- **`turbo` no sabía que `herramientas/` entra en la construcción**, así que al
  cambiar la política de seguridad daba el `dist` de antes por bueno y servía el
  viejo. Media hora persiguiendo un cambio que sí estaba escrito. Ahora está en
  `globalDependencies`.
- **La política bloqueaba `blob:`**, que es como se carga un logo para medirlo
  antes de subirlo. El navegador lo bloquea **en silencio**: no hay error, la
  imagen no aparece y el botón de quitarla tampoco. Lo cazó la prueba del alta, que
  existe porque ese botón ya faltó una vez.

#### Lo que la auditoría deja pendiente · por orden de importancia

Nada de esto se ha hecho, y ninguna de las cinco es una frase: son trabajo.

1. **La cola de salida.** Un comando que se cae sin conexión se pierde. Lo que hace
   falta: guardar el comando en el navegador con su clave de idempotencia, subirlo
   cuando vuelva la señal, y enseñar cuántos hay esperando. La idempotencia del
   servidor ya está hecha y es justo lo que hace que esto sea seguro. Es lo que
   convierte «Estook se usa de pie y con el teléfono en la mano» en verdad dentro
   de una cámara frigorífica.
2. **Las claves de idempotencia, usadas.** Hoy el cliente inventa una por llamada.
   Lo que hace falta: que un gesto —pulsar «Apuntar la salida» una vez— tenga
   **una** clave, y que reintentar reutilice la misma. Es media tarde y cierra el
   agujero de la merma apuntada dos veces.
3. **El reloj.** `publicarPendientes`, `siguienteTrabajo` y `limpiarCaducadas`
   están escritos y probados, y **no los llama nadie**: no hay `pg_cron` ni función
   programada. Hoy no se nota porque las reacciones que no pueden esperar van
   síncronas a propósito, pero la bandeja de salida se llena y no se vacía, y las
   claves de idempotencia y las sesiones caducadas no se limpian nunca. Estaba
   apuntado desde M6 como «decidir antes de M8», y sigue ahí.
4. **La auditoría no ve dos cosas de seguridad.** Diecinueve de los veinticinco
   ficheros de comandos escriben su línea; entre los que no están **activar y
   quitar el doble factor** y **cerrar la sesión de otro aparato**. Son
   exactamente las que hay que poder mirar cuando alguien pregunta qué pasó con una
   cuenta.
5. **Los borradores.** Que lo escrito sobreviva a que caduque la sesión o a
   recargar sin querer. Es hermano de la cola: lo mismo, para lo que todavía no se
   ha mandado.

---

### La limpieza de imagen · lo que salió de verla en el TPV

Richi abrió Estook en el TPV de la cocina y mandó la foto. La información era
correcta y la pantalla no parecía una aplicación profesional: «todo blanco, texto
suelto». Con el aviso por delante: «cuidado con el texto, que no acabe siendo
negro sobre negro».

#### Uno · Por qué parecía una hoja de papel, y no era una opinión

Era **una medida**. B1 daba `#fafaf8` de fondo y blanco de tarjeta, y esos dos
contrastan **1,02:1**. En un TPV no se ven tarjetas: se ve texto flotando sobre
blanco.

El fondo baja a `#f1efea` —1,15— y con él bajan los dos bordes y se oscurecen
`bien`, `atención` y `texto-tenue`, que sobre el fondo nuevo se quedaban por
debajo de 4,5:1.

Tres líneas, y arregla la pantalla entera. Y es exactamente el tipo de cosa que
**ninguna prueba podía ver**: todas pasaban, porque la paleta cumplía B8. Lo que
no cumplía era «una tarjeta tiene que parecer una tarjeta», que no estaba escrito
en ninguna parte. Ahora sí, y se mide.

#### Dos · Los dos temas, y la ficha que lo hace barato

Claro, oscuro o el del sistema, en Ajustes, guardado en el aparato como el tamaño
de letra. **El de fábrica sigue siendo el claro**: una cocina se mira de lejos y
con la luz encendida.

Lo que hace que esto no sea deuda es **cómo** está hecho: `temas.css` redefine las
fichas, y las utilidades de Tailwind salen de las fichas. `bg-superficie` compila
a `var(--color-superficie)`, así que **ninguna pantalla lleva una clase de modo
oscuro** y una pantalla nueva sale bien en los dos sin que nadie se acuerde. Con
`dark:` en cada clase, el modo oscuro estaría roto en la tercera pantalla.

Y el primer fallo apareció al minuto de mirarlo: **el logotipo es tipografía
charcoal** y se quedaba negro sobre negro en la barra. Se genera del mismo
original una versión clara, tocando solo lo gris —un `invert()` de CSS habría
vuelto azul el naranja de la marca—.

#### Tres · El color del local, y el que de verdad se pinta

El logo y el color se pedían en el paso 5 del alta y **no se podían cambiar
nunca más**. Ahora están en Ajustes, con un interruptor para que ese color pinte
el acento de toda la aplicación (migración `0026`, apagado de fábrica).

Y aquí está lo que hace que esto sea un sistema y no un ajuste: **el color que se
guarda no es el que se pinta**. El botón principal decía `text-charcoal` escrito a
mano —porque el naranja de Estook es claro— y con un azul noche de marca el texto
del botón se quedaba en 1,8:1. Es el aviso de Richi, palabra por palabra.

De un color de marca salen **cuatro**, cada uno medido contra el fondo donde va a
aparecer: el que pinta, el que se escribe encima, el tinte de una pastilla y el
acento **dentro de la barra oscura** —que existe por «Deshacer», donde el fondo es
otro—. Y hay colores que no admiten texto legible de ninguna clase: un gris del
50 % da 3,95 con el blanco y 4,34 con el charcoal. Para esos, el acento se empuja
hasta que sí, y **se dice en Ajustes** que se ha tocado.

Está entero en la [decisión 0024](docs/decisiones/0024-el-color-del-local-pinta-la-app.md).

#### Cuatro · El Panel, que ya tenía el color escrito y no lo usaba

Tres cosas, y las tres son juntar lo que ya existía:

- **Cada widget lleva el acento de su app.** Estaba escrito dos veces sin
  juntarse: cada widget declara de qué app es, y B3 le da a cada app su color.
  Ahora el Panel se lee de un vistazo —lo naranja es de Inventario— sin leer un
  solo título. Se deduce del catálogo, así que un widget nuevo lo trae puesto.
- **Una cabecera con la cara del local**: la banda de su color y su logo. Ese logo
  se le pedía a la gente en el alta y no se enseñaba en ninguna parte.
- **Y dos barras de proporción**, que son el único gráfico honesto que hay hoy:
  cuántos de tus productos llevan precio —un producto sin precio cuenta cero en el
  valor de la cámara, así que las dos cifras solo cuadran cuando la barra está
  entera— y, en cada línea de «bajo mínimo», cuánto queda respecto de su mínimo,
  que es lo que dice **por cuál empezar**. Una gráfica de verdad necesita una
  serie, y las series llegan con M8 y M12: dibujar una línea ahora sería
  inventarse los datos. Cuando lleguen, `Grafica.tsx` ya está.
- **El equipo en pastillas con avatar**, en vez de una lista de una columna que en
  un TPV se comía media pantalla. Y la zona de atención en dos columnas desde
  1024 px, que es donde el Panel empezaba por debajo del pliegue.

#### Y las tres redes que dejan esto blindado

Son tres porque son tres cosas distintas, y ninguna sustituye a otra:

| Qué mide                            | Dónde                 | Qué caza                                                       |
| ----------------------------------- | --------------------- | -------------------------------------------------------------- |
| La paleta de fábrica, los dos temas | `contraste.prueba.ts` | Que alguien aclare un gris «para que se vea mejor»             |
| La aritmética del color de marca    | `color.prueba.ts`     | Doce colores elegidos para hacer daño, cuatro mínimos cada uno |
| **El píxel**                        | `pantalla.spec.ts`    | Que un componente se haya quedado un color escrito a mano      |

La tercera es la que faltaba en todo esto: pone cinco colores de marca desde
Ajustes y **lee el contraste del botón principal ya pintado**. Se comprobó
devolviendo el `text-charcoal` al botón, y se pone roja con «con #1f3a5f,
"Conectar ahora"».

---

### M7 · Proveedores y compras · la primera entrega

«Esta sección es fácil, pero no hay que dejar de organizarlo y hacerlo bien.
Piensa en cómo piensa un hostelero: quiere tenerlo todo accesible, bonito y bien.»
Con eso, M7 se partió en dos: **las compras enteras y el Calendario ahora**, y el
reloj y Google cuando Richi tenga el acceso a Business Profile y la clave de Google
Cloud. Las nueve preguntas que dejaba abiertas el Plan están contestadas en la
[decisión 0032](decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md).

#### Uno · El orden de un bar, no el de una base de datos

Compras eran tres vistas —Proveedores, Pedidos, Facturas— con Proveedores delante,
porque era lo único que había en M6. Ahora son cinco y **en el orden en que se usan**:
Pedidos, Albaranes, Facturas, Proveedores y Precios. Y Pedidos no empieza por la
lista: empieza por **lo de hoy** —a quién toca pedirle antes de su hora límite, lo
que llega hoy y mañana con su botón de recibir, y los borradores que esperan a que
alguien los mande—.

Lo mismo sale en «Hoy» de Inventario, en el widget «Compras de hoy» del Panel y en
«Lo que viene», y los tres hacen **un solo viaje**: leen la misma consulta con la
misma clave de caché.

#### Dos · Lo que se pulsa en la puerta

- **Recibir entero son dos toques** desde cualquier sitio donde salga el pedido:
  «Recibir» abre la recepción directamente, y «Sí, ha llegado entero».
- **El peso variable no se supone**: aunque haya llegado entero, se pregunta lo que
  dice la báscula de eso, y solo de eso.
- **Con cambios**, cada línea con su − y su +, «no se acepta», y lote, caducidad y
  nota plegados hasta que hacen falta. Al acabar, lo que no cuadró con su nombre
  —«ha venido menos», «precio distinto»— y **«pedirle lo que faltó»** de un toque.
- **Mandar el pedido** abre WhatsApp o el correo con el pedido escrito, lo copia o lo
  imprime, y pregunta **«¿ya se lo has mandado?»** antes de apuntarlo.

#### Tres · La factura, que casi ningún programa concilia

Se apunta la factura, **los albaranes sin factura de ese proveedor se marcan solos**
—una factura de mes suele cubrirlos todos— y la cuenta sale **mientras se escribe**,
con la misma función del dominio que usa el servidor. En cada línea se puede poner
lo que dice la factura, y eso es lo que confirma el precio.

#### Cuatro · Lo que encontraron las pruebas, y no ninguna de las viejas

- **El despachador pedía «editar» para leer.** Un rol con Inventario en solo
  lectura no podía ni mirar un pedido. Ahora una consulta pide «ver».
- **Un permiso de la organización pasaba por encima de un recorte del local.** Si a
  alguien se le quitaba Inventario en un local, lo seguía viendo por tenerlo en la
  organización. Ahora el recorte manda.
- **Una lista vacía de un tipo enumerado** llegaba a la base como `''` desde el
  conductor de las pruebas, y la base la rechazaba. Las listas viajan como texto,
  igual que el JSON desde M6½ (`comoLista`).
- **Un borrador hecho por quien no ve precios se guardaba sin precio esperado**, y
  al recibirlo no había con qué comparar. Ahora el precio esperado se pone al leerlo,
  al mandarlo y al recibirlo, siempre por quien sí los ve.

#### Cinco · El Calendario, que M7 es el primero en llenar

La tabla de la [0031](decisiones/0031-el-calendario-recoge-lo-de-todos.md) con su
seguridad por roles, **los repartos de cada proveedor, cada pedido mandado y cada
caducidad** publicados por las reacciones, y el widget «Lo que viene», que estaba
en el catálogo del Panel apagado con «llega con M14». M14 pintará el mes con la
misma tabla.

---

---

## Apéndice · el primer despliegue y lo que enseñó

> Estaba en la sección 2 de `ESTADO.md` desde M4. Es historia: lo que sigue
> valiendo está en las lecciones de «Cómo trabajamos» y en el Plan (E4).

### Cómo quedó el estado de la base y del despliegue

| Qué                | Cómo está                                                     |
| ------------------ | ------------------------------------------------------------- |
| Migraciones        | `0024` en el repositorio y **aplicadas las 24 en Supabase**   |
| Semillas           | Puestas, **sin credenciales de ejemplo**: la semilla se niega |
| Cuentas de ejemplo | Cerradas. Ninguna puede entrar                                |
| Cuenta de verdad   | La de Ricardo, con su organización y su local                 |
| API                | Desplegada y al día: conoce las catorce consultas del código  |
| Web y app          | Publicadas y al día                                           |
| Almacén del logo   | Listo: sube, firma, lee y borra                               |

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

**El almacén de ficheros contra Supabase de verdad ya está hecho**, comprobado el
4 de septiembre de 2026: `.\estook.cmd almacen:preparar` hace el camino entero
—crear, subir, firmar, leer, comprobar que sin firma no se sirve y borrar— y pasa
los seis pasos. El cubo ya existía y la clave de servicio llevaba tiempo en
`.env.local`.
