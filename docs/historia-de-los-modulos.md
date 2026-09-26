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
[`pruebas/e2e/acceso.spec.ts`](../pruebas/e2e/acceso.spec.ts):

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
[`pruebas/e2e/alta.spec.ts`](../pruebas/e2e/alta.spec.ts):

| Criterio del Plan                           | Cómo se comprueba                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| El alta en menos de cuatro minutos          | El recorrido entero, cronometrado, en escritorio y en móvil pequeño                            |
| Un producto del catálogo en quince segundos | **A medias**, y se dice: el catálogo devuelve la ficha rellena; crear                          |
|                                             | el producto es M6 ([0012](decisiones/0012-el-producto-nace-en-m6.md))                          |
| El botón de quitar ejemplos los borra todos | Contra la base de datos, con el registro y sus políticas                                       |
| El gasto de Google por debajo de 0,50 €     | **Es cero**: Google se aplaza a M23 ([0013](decisiones/0013-google-places-se-aplaza-a-m23.md)) |

Y la lista de la Auditoría de flujos, pasada punto por punto, en
[`docs/auditorias/m5.md`](auditorias/m5.md).

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
[decisión 0014](decisiones/0014-las-reacciones-entre-modulos.md).

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
[`pruebas/e2e/inventario.spec.ts`](../pruebas/e2e/inventario.spec.ts):

| Criterio del Plan                                      | Cómo se comprueba                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Un producto de alta en 30 segundos                     | Cronometrado **desde la pantalla**, con el catálogo de referencia, en escritorio y en móvil |
| El coste y el medio ponderado con factor y rendimiento | Pulpo: caja de 5 kg al 55 %. Sube un 20 % el precio y el coste por gramo sube ese 20 %      |
| El stock se reconstruye desde los movimientos          | Se replica el libro con el motor y se compara línea a línea con lo guardado                 |
| La previsión acierta el día con consumo estable        | Un local nuevo con tres semanas de consumo sembrado, y la fecha cuadra con la cuenta        |

Y la lista de la Auditoría de flujos, pasada punto por punto, en
[`docs/auditorias/m6.md`](auditorias/m6.md).

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
[`pnpm cobertura`](../herramientas/cobertura-del-catalogo.mjs) lo compara con el
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

**Lo decidido** ([decisión 0015](decisiones/0015-fogon-es-una-burbuja-no-una-pestana.md)):

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

- **Destinos y vistas** ([decisión 0018](decisiones/0018-destinos-y-vistas.md)).
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
- **El Panel de cada uno** ([decisión 0019](decisiones/0019-el-panel-de-cada-uno-vive-en-el-servidor.md)).
  Zona de atención fija arriba, y debajo una rejilla de widgets **de dos columnas
  en móvil** y cuatro en escritorio, con tres tamaños, que se arrastra, se añade y
  se quita, y **se guarda en el servidor por persona y por aparato** (migración
  `0025`). Con su catálogo de dieciséis widgets: los nueve que existen hoy y los
  siete que llegan con su módulo, en gris y sin poder pulsarse.
- **Un catálogo de acciones** ([decisión 0020](decisiones/0020-un-catalogo-de-acciones.md)),
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
de uso, y no hay un segundo camino de datos ([decisión 0021](decisiones/0021-el-producto-se-mide-en-una-unidad.md)).

Y la razón de fondo, que es la que importa para lo que viene: **cuántos gramos
lleva una ración es de la ficha técnica**, no del producto. Eso es M9, y ahora no
hay que preguntarle a nadie dos veces en qué unidad cocina.

**4 · Y el formulario tenía «Cómo lo compras» dos veces**, una como título de
sección y otra como etiqueta de la casilla de al lado. Lo puse yo en la primera
tanda agrupando el formulario, y se ve en la captura sin tener que buscarlo.

**5 · Delivery no estaba en ninguna parte.** Ahora Servicio tiene su destino
`Delivery`, con Uber Eats por su nombre y su icono, y el Panel su widget en el
catálogo. **Sin ningún botón de conectar**: la integración es M29
([decisión 0022](decisiones/0022-el-reparto-tiene-sitio-antes-que-conexion.md)).

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
  nada ([decisión 0022](decisiones/0022-el-reparto-tiene-sitio-antes-que-conexion.md)).
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
la [decisión 0023](decisiones/0023-fogon-nunca-arma-su-contexto-en-el-navegador.md):
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
API ([`herramientas/politica-de-seguridad.ts`](../herramientas/politica-de-seguridad.ts)).

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

Está entero en la [decisión 0024](decisiones/0024-el-color-del-local-pinta-la-app.md).

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

### M7 · el repaso: lo que vio Richi con la primera entrega en la mano

Richi fusionó la #44, la miró en el móvil y en el TPV —«funciona bien, todo ok»— y
volvió con once puntos y las respuestas a las cinco preguntas. Se reparten en cinco
entregas pequeñas, cada una con su pull request, para que ninguna se quede a
medias: **esta es la primera**, la de Inventario, el Panel y los fallos.

#### Uno · Un lote que caduca se quita

«Si hay un producto caducado, poder quitarlo con un botón en ese lote; si no, se
queda siempre y no tiene sentido.» Cada lote lleva su **«Quitar»** en «Caduca esta
semana» y en la ficha: **se ha gastado** —deja de avisar— o **se ha tirado**
—sale de cámara como **merma por caducado**, por `apuntar`, con su lote—. El lote
no se borra: se retira (`retirado_en`, `como_se_retiro`), y su evento del
Calendario se va con él por la misma reacción que lo puso.

#### Dos · Lo congelado se ve

«Congelado», con la fecha en que se congeló: al dar de alta, en cada lote de la
ficha y con «Congelar una parte» —un lote nuevo congelado hoy—. Sale como etiqueta
en la lista, en «Hoy», en el widget de caducidades y en el Calendario, y tiene su
vista, **Productos · Congelados**.

#### Tres · Dos decimales, y cambiando de unidad

«No pongas 1,7500 €: es 1,75 €.» El cuarto decimal venía de enseñar el precio por
gramo o por mililitro. Ahora `comoPrecioPorUnidad` da siempre dos: lo que se cuenta
en g o ml se lee en €/kg o €/l («0,64 €/l»), y lo que no llega a un céntimo, por
cada cien. Por dentro sigue todo en milésimas ([0035](decisiones/0035-el-alta-pregunta-como-se-compra.md)).

#### Cuatro · El alta pregunta cómo se compra

«Queso azul en envases de 250 g: cuántas unidades, cuánto pesa cada una, cuánto
cuestan todas o una, y que haga el cálculo. No explicándolo con texto sino con un
buen diseño.» Tres tarjetas —por peso, por litros, por unidades—, las dos o tres
preguntas de cada una y la línea de lo que se guarda: «Caja de 6 tarros de 250 g ·
1,5 kg en total». El precio, el que se tenga a mano, y la otra cifra sale sola: «La
caja sale a 21,00 € · 14,00 € el kg». La cuenta, en el dominio
(`presentacion.ts`); la misma en el alta y al corregir la ficha, que no deja cambiar
la forma de un producto con género apuntado ([0035](decisiones/0035-el-alta-pregunta-como-se-compra.md)).

#### Cinco · El IVA, bien puesto

«Mis precios llevan IVA. Una opción para elegir si está incluido o excluido, bien
puesta: mira cómo lo hacen las mejores.» Como Xero, QuickBooks u Odoo: **se guarda
sin IVA** y se escribe como venga el papel. Cada producto sabe su IVA de compra —el
de su categoría, o el que se elija—; el local elige en Ajustes cómo escribe; cada
campo de precio lleva «Sin IVA · Con IVA» con el tipo y la otra cifra; y a los
precios que ya había se les quita **una vez**, dejando el de antes en el histórico
([0033](decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).

#### Seis · Los precios de antes, en una gráfica

«Si llega un precio nuevo se actualiza, y se comparan los de antes, tipo gráfica.»
En la ficha, con dos precios o más: lo que ha costado **cada proveedor**, en €/kg,
€/l o €/ud —la misma medida aunque cambie el envase— y cuál es hoy el más barato.

#### Siete · Los widgets no se pierden

«Valor de la cámara, acciones rápidas, bajo mínimo, caduca esta semana: salen de
fábrica, pero al dar a añadir no aparecen. ¿Si las borras las pierdes para
siempre?» No se perdían, pero lo parecía: el catálogo **solo enseñaba lo que no
estaba puesto**. Ahora salen todos, por grupos —lo que hay que atender, cifras,
atajos, tu equipo— y con el filo del color de su app; los puestos dicen «En tu
panel» con su «Quitar», y abajo, «Recuperar el panel de siempre». Una prueba exige
que cada widget nuevo diga en qué grupo sale.

#### Ocho · El salario que a veces fallaba

«Puedo cambiarlo, pero a veces me dice "se nos ha roto algo por dentro".» Pasaba
**la segunda vez que se cambiaba el mismo día**: el cambio cierra la fila vigente
«hasta ayer» y abre una «desde hoy», y la segunda vez la fila vigente ya empezaba
hoy, así que cerrarla hasta ayer rompía `hasta >= desde`. Ahora un cambio del mismo
día **corrige la fila de hoy** en vez de abrir otra. Lección: una restricción de
vigencia se prueba con dos cambios el mismo día, que es lo normal al corregir una
errata.

#### Nueve · Nadie echa a su igual

«Que los gerentes, o gente del mismo nivel, no se puedan echar ni retirar el acceso
entre ellos.» El permiso decía **qué** se podía hacer, no **a quién**. Ahora cada
comando que toca a otra persona pide estar por encima en la amplitud del rol —la
dirección, por encima de todos—, nadie da un rol que sea el suyo o esté por encima,
y ni la pantalla de accesos ni la de invitar enseñan lo que va a decir que no
([0034](decisiones/0034-nadie-gestiona-a-su-igual.md)).

Lo destaparon las pruebas de pantalla: la primera versión dejaba invitar **hasta el
propio nivel**, y un gerente nombraba a otro gerente al que en el mismo minuto no
podía darle la contraseña. Quien nombra es quien después gestiona. Y la última
dirección que intentaba irse oía «no es tu nivel» en vez de «el negocio se queda sin
nadie que lo administre»: el guardián de siempre va ahora primero.

#### Y el dominio, que se adelantó a la fuerza

Richi conectó `estook.com` y **la aplicación se quedó en blanco**: seguía
construida para `estook.github.io/EstookApp-V.2/` y pedía sus ficheros donde ya no
había nada. La raíz se deducía del repositorio salvo que alguien declarara una
variable, y la API solo aceptaba el dominio viejo porque la lista vivía en un
secreto de Supabase. Dos pantallas fuera del código que había que recordar, y el
producto caído mientras tanto. Ahora la dirección y los orígenes los sabe el
código, con su prueba ([0036](decisiones/0036-la-direccion-es-estook-com.md)).

De paso salió otro: `congelar` y el alta fechaban con `current_date`, que en
Supabase es UTC. Lo cazó la prueba de congelar corriendo a las 00:30 de Madrid,
cuando en UTC era el día anterior. La fecha la pone el servidor con la zona y la
hora de corte del local, como cualquier movimiento (regla 10).

#### Lo que queda de su lista, y en qué entrega

| Entrega | Qué                                                                                       |
| ------- | ----------------------------------------------------------------------------------------- |
| **2**   | Avisar a jefes y gerentes de lo que hace su equipo, una vez; invitar a rellenar un pedido |
| **3**   | Horarios, una app entera en Equipo: cuadrante, historial, horas, avisos y PDF             |
| **5**   | Los topes de las API de Google por local, y conectarlas cuando lleguen los accesos        |

---

### M7 · las bases, antes de seguir al M8

> «No vamos a continuar hasta que las bases sean profesionales. Cómo se suman y se
> restan los datos, los cálculos internos, el dinero, el fallo humano. Hay que
> pulirlo todo.»

Ocho cosas vistas con la aplicación abierta en el TPV. Cinco eran producto y tres
eran fallos de verdad que nadie había visto.

#### Uno · «Gastado o vendido» era un solo botón

Y con eso, Estook no podía contestar **si por lo que salió de la cámara entró
dinero**, que es de lo que cuelga el margen entero. Ahora el porqué va en tres
familias —se vende, se usa, no se aprovecha—, cada una dice lo que significa antes
de elegir, y lo vendido se apunta con lo que se cobró.

La decisión de fondo no es esa, sino la siguiente: **ese dinero no suma solo**. El
de una jornada tiene un único dueño, que es el cierre de caja; si una salida de
cámara sumara por su cuenta y además se metiera el papel del Z, el día valdría el
doble y **no se vería** —el total del mes saldría mal y todo lo demás parecería
correcto—. Así que lo vendido espera, y al cerrar la caja sale propuesto con su
nombre y su importe ([0037](decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).

Con ello, un producto que se vende tal cual tiene por fin **margen**: lo que entra
sin impuesto, lo que cuesta, lo que queda y qué parte se va en género. La cuenta la
hace el dominio, que quita el IVA antes de restar: restar el precio de carta menos
el coste es regalarse el impuesto como margen, y es el error más repetido que hay en
la hoja de cálculo de un bar.

#### Dos · La etiqueta que no se podía quitar

«Sin verificar», en naranja, en **todos** los productos. Richi la buscó por toda la
aplicación y no encontró dónde quitarla, porque no estaba en ninguna parte: el
servidor guardaba `sin_verificar = !cambiaElCoste`, así que **corregir una errata en
el nombre volvía a marcar el producto**. Una marca que sale en todos no marca nada.

Ahora son tres estados y no dos —si no llega `verificado`, no se toca— y el dato
vive donde se lee y con qué se arregla al lado: «Se aprovecha · 100 % · supuesto,
sin medir», con un botón que pregunta lo que entra y lo que queda limpio y hace la
cuenta. Y enseña el impacto antes de guardar, porque el aprovechamiento multiplica.

De paso se separó lo que estaba mezclado: cambiar cuánto trae una caja **no es**
medir cuánto se aprovecha de ella. Son dos datos que se multiplican en la misma
fórmula, y darlos por medidos juntos era lo que vaciaba de significado la marca.

#### Tres · La ficha del producto no se leía

Secciones sueltas con un título encima y, a la derecha, botones de tono «texto».
Sobre el tema oscuro eso es letra blanca sobre fondo negro: no se veía dónde
empezaba una sección, y las tres cosas que se vienen a hacer —congelar, cambiar el
precio, corregir la ficha— parecían párrafos.

Ahora cada bloque es una tarjeta con su título y sus botones; arriba, la categoría,
el proveedor y el envase, que estaban al final; y una barra que dice de un vistazo
si se llega al mínimo.

#### Cuatro · El buscador del libro mentía

Decía «se enseñan los cien últimos; busca por producto para encontrar los de
antes», y **buscaba dentro de esas cien**. Buscar algo de hace tres meses contestaba
«nada con eso». Es el mismo fallo que ya costó las vistas de Productos: un filtro
que solo funciona cuando la lista cabe entera es un filtro que miente.

Ahora el libro y las mermas van por tramos de tiempo —un mes, tres, seis, un año—,
buscan en el servidor y traen más de tanto en tanto, con cuántas se llevan. El
gancho es uno (`usarListaLarga`) para que la siguiente lista que crezca no lo
reinvente.

Y de paso: **la vista «Mermas» del libro estaba rota desde M6½**. La barra mandaba
`tipo=merma` y la consulta solo aceptaba entrada, salida y ajuste: contestaba «datos
no válidos» y la pantalla salía en rojo.

#### Cinco · El deshacer, y dónde se había metido

Estaba —en cambiar de local, en el Panel y en el idioma— y no en lo que se edita a
mano. Vuelve a la ficha del producto, al precio de compra y al de venta, con su
contraria escrita en cada caso, que es como funciona desde M3.

Lo que **no** lleva deshacer, y no es un olvido: apuntar género. El libro solo se
añade, y un movimiento equivocado se enmienda con otro.

**Y lo que encontró intentar probarlo:** la barra de deshacer **no se podía
pulsar con una hoja o un panel abiertos**. No es un problema de `z-index`: un
`<dialog>` con `showModal()` vive en la capa superior del navegador y su fondo se
traga los clics. Se veía y no se podía tocar, justo en el momento en el que hace
falta —acabas de guardar una ficha y el panel sigue abierto—. La prueba de pantalla
lo intentó veinte veces y el navegador contestó siempre lo mismo.

Se arregla pintando la barra **dentro** del diálogo de arriba, que es la única forma
de entrar en esa capa sin ser uno mismo un modal. Lo cuenta `ganchos/capaDeArriba.ts`.

#### Seis · La merma buscaba en el catálogo de ejemplo

Al apuntar una merma salían los productos de mentira mezclados con los de verdad.
En la lista de Productos salen a propósito —para mirarlos y aprender de ellos—, pero
esto se abre en mitad de un servicio para decir qué se acaba de romper, y una merma
de un producto de ejemplo no cuenta para nada sin que quien la apunta lo sepa.

---

### M7 · las apps conectadas, y el precio que estaba en el sitio equivocado

Cuatro días después de fusionar las bases, Richi las miró en el TPV y trajo once
cosas más. La primera era una corrección, y era del modelo.

#### Uno · «¿A cuánto lo vendes?» en un ingrediente

> «Has puesto una opción en Inventario que pregunta en una ficha de producto "a
> cuánto lo vendes". **No se venden los ingredientes sueltos**: con ellos se crean
> platos, y ahí ponemos el precio de venta. Si es queso en gramos, se sabe por el
> escandallo cuánto cuesta y por la carta a cuánto lo vendes. A eso me refiero con
> conectar todo bien.»

Tenía razón, y no era un detalle de pantalla. Un kilo de queso no tiene precio de
venta; lo tiene el plato que lo lleva. Ponérselo al producto era **inventarse un
tercer sitio para un dato que ya tiene el suyo**, y encima el equivocado:

```
lo que cuesta   ←  inventario (precio de compra, sin IVA)
cuánto lleva    ←  escandallo (M9)
a cuánto sale   ←  carta (M10)
lo que entró    ←  el cierre de caja, o el TPV (M20)
```

Así que se quitan las dos columnas de la 0034 y el importe que se tecleaba al
sacar género —que era pedir dos veces la misma cifra—. **Lo que se queda es el
tipo de movimiento `venta`**, que era lo bueno de aquella entrega: seguir sabiendo
si lo que salió se vendió, se cocinó o se tiró. Y al cerrar la caja, lo vendido
sale propuesto con el importe que ya se sabe de la última vez que se cerró ese
mismo concepto, que es lo más cerca que está hoy de una carta.

La decisión 0037 se queda escrita **con su corrección encima y el apartado cinco
tachado**: es la primera vez que una decisión de este proyecto se retira a los
cuatro días, y borrarla habría escondido justo lo que enseña.

#### Dos · Inventario era un solo montón

«Añade un filtro de sala, cocina y limpieza. Cocineros ven cocina y limpieza,
camareros ven sala y limpieza, y jefes ven todo.»

Cada producto es ahora de una zona, y la zona hace tres cosas: **ordena** la lista,
**decide si hay categorías** —limpieza no las lleva, que son quince cosas— y
**decide quién lo ve**. Esto último no es un filtro de pantalla: es la política de
la tabla, con su función `zonas_que_ve`, que es la puerta de atrás número
dieciocho ([0038](decisiones/0038-cada-producto-es-de-una-zona.md)).

Y las categorías pasan a contarse **dentro de la zona que se mira**. Antes contaban
sobre el local entero: en «Sala» salía «Carnes (14)» y al elegirla no había
ninguna, que es una promesa rota en un desplegable.

Lo que ya estaba se repartió con la categoría fiscal —las bebidas a sala, lo demás
a cocina— en vez de dejar trescientos productos en un montón para que alguien los
ordenara uno a uno.

#### Tres · «Los congelados están fatal»

Y lo estaban: congelar marcaba **el producto entero**. Diez kilos de los cuarenta
y tres que hay dejaban los cuarenta y tres con la etiqueta de congelado, y en la
lista parecía que no quedaba nada fresco. Ahora se dice cuánto —con lo que hay
delante, y sin dejar pasarse— y la etiqueta dice «10 kg congelados».

#### Cuatro · El recuento, que llevaba siete módulos prometido

«Que se pueda subir el inventario que han hecho para actualizar todo. Es una opción
que **cambia**, no suma.» Eso es un recuento, y `accion.cerrar_recuento` estaba en
la matriz de permisos **desde M1 sin ninguna pantalla detrás**: la tercera promesa
rota que aparece en este proyecto, después de la merma y de fichar.

Tres decisiones dentro: las casillas salen **en blanco** con lo que decía el libro
debajo —una cifra puesta de antemano se confirma sin mirar—; se cuenta **una zona
cada vez**, que es como se hace de verdad; y **lo que no se cuenta no se toca**,
salvo que se pida, y entonces se dice cuántos se van a vaciar antes de tocar nada.

Las líneas de un recuento comparten la correlación que ya lleva cada petición desde
M2, así que el libro puede contestar «esto fue el recuento del martes» sin una tabla
nueva ni un identificador inventado.

#### Cinco · Y la pantalla

Las tarjetas de producto ocupaban cinco líneas en un móvil —el nombre y cuatro
pares de etiqueta y valor—: un producto y medio por pantalla, y con trescientos
productos la lista deja de poder recorrerse. Ahora son dos líneas, y la pieza sigue
poniendo lo que cuesta acertar: el área de toque y el velo que hace pulsable la
fila entera.

Las cifras eligen su tamaño por lo que ocupan escritas —«128 h 45 min» a 34 px
partía en dos líneas—, el contenedor se estira en monitores grandes, y la cabecera
del Panel se abre y dice lo tuyo de hoy.

**Y lo que se rompió al hacerlo:** convertir el «Hola, Ricardo» en un botón dejó al
Panel **sin encabezado de nivel 1**, que es por donde entra quien navega con un
lector de pantalla. Lo cazaron trece pruebas de acceso a la vez. Un `<button>` solo
admite contenido de frase, así que el `h1` no puede ir dentro: va fuera,
envolviéndolo, que además es el patrón de siempre para algo que se abre y se cierra.

---

### M7 · el Panel vivo: editar como en el móvil, y las cifras de cada uno

Con las apps conectadas fusionadas, la `0035` aplicada y la API desplegada, Richi
pidió acabar lo que quedaba del Panel antes de seguir: «que se puedan mantener para
editarlos, que vibren como en Apple y se arrastren mejor que las flechas; quitar los
cuadrados vacíos; añadir los nuestros; gráficas y flechas de subida y bajada».

#### Uno · Se copia el iPhone entero, porque cada pieza tiene su razón

Mantener pulsado entra en edición; los widgets tiemblan; se arrastran desde
cualquier parte y los demás se deslizan para hacerles sitio. Nada de eso es adorno:
**temblar dice que se está editando** sin leer nada, y que los demás se aparten dice
**dónde va a caer** antes de soltar. Con el arrastre hecho a mano desde M6½ los
widgets saltaban de golpe al pasar el dedo.

Aquí entró **la primera librería de movimiento del proyecto**, `@dnd-kit`, y se
eligió con la 0007 en la mano: aquella decisión decía que haría falta cuando
hubiera que animar un cambio de sitio, y es justo esto. **Se descarga solo al
editar** (17 KB comprimidos, en su propio trozo): el Panel de cada mañana no la paga.
Y «nada gira» tiene ahora una excepción escrita, una sola: el temblor
([0039](decisiones/0039-el-panel-se-monta-como-un-movil.md)).

#### Dos · Lo vacío se aparta, y se dice

«Caduca esta semana: nada caduca» ocupaba un cuadrado para no decir nada. Ahora
**cada widget avisa de si está vacío** y la rejilla lo aparta, sin desmontarlo
—sigue pidiendo sus datos y vuelve solo— y lo nombra en una línea debajo. Cargando
no cuenta como vacío: si contara, el Panel abriría en blanco e iría apareciendo.

#### Tres · «Añadir los nuestros» son preguntas, no gráficas

Un editor libre de gráficas es lo que tienen las herramientas de análisis, y es lo
contrario de lo que pide un bar. Lo que se construyó es lo de Shopify o Square:
**qué cifra y de cuántos días**. Seis cifras que Estook ya guarda con un dueño
—ventas, ticket medio, food cost, merma, compras y tus horas—, con su flecha frente
al periodo anterior y su línea de días.

Las reglas que hacen que la flecha no mienta son de dominio y tienen prueba: una
proporción se calcula sobre el periodo y no como media de días; **un día sin caja no
vendió cero** y corta la línea; un porcentaje cambia en puntos; de nada a algo no
hay flecha. Y **el food cost del Panel es el de Servicio**: la prueba los pide a los
dos y los compara.

Lo elegido va en el identificador del widget (`indicador-ventas-7`), así que el
Panel se guarda igual que desde la 0025: sin migración.

#### Lo que se rompió al hacerlo

- **El «quitar» temblaba con la tarjeta, y no se podía pulsar.** Lo cazaron casi todas
  las pruebas del Panel a la vez: Playwright espera a que un botón pare antes de pulsarlo, y un
  botón que tiembla no para nunca. A un dedo con prisa le pasa lo mismo. Los
  controles van quietos; tiembla la tarjeta.
- **La línea de las gráficas salía a trozos.** Con un trazo que no escala, Chrome
  calcula los guiones de la animación en píxeles de pantalla. Se dibuja recortando
  la caja, y se ve entera.
- **Dos pruebas daban por hecho que «Bajo mínimo» se ve siempre**, aunque esté vacío,
  que es justo lo que cambió. Ahora «puesto» se mira en la casilla, y «se ve» acepta
  las dos respuestas correctas: se ve, o sale nombrado en la línea.

---

### M7 · el local en Google, apagado hasta la clave y con el tope delante

«Ahora preguntas dónde está el local, pero eso se verá cuando se conecte con Google
Business y Places.» Y antes, el 10 de septiembre: «la API que cuesta dinero hay que
acotarla bien», con una cifra, **cuarenta al mes por local**.

#### Se construye sin la clave, y se enciende al ponerla

Google está detrás de **un puerto**, como el almacén de ficheros de M5: la capa de
aplicación sabe buscar un sitio y pedir su ficha, y no sabe que detrás hay Google.
Con eso se probó todo con **un Google de mentira que cuenta sus llamadas**, y la API
de pruebas lleva otro para que la pantalla se pueda recorrer entera. Sin la clave en
Supabase, Ajustes dice «Google todavía no está conectado» y no enseña un buscador
que no busca ([0040](decisiones/0040-el-local-se-busca-en-google-con-tope.md)).

#### El tope, antes de gastar

Lo que corta de verdad no es el presupuesto de Google —avisa y sigue cobrando— sino
**un contador por local y mes**, y se cuenta **antes** de llamar, con una sola orden
que solo suma si queda sitio. La prueba que importa es la que llena el contador y
comprueba que **Google no llega a enterarse** de la petición siguiente.

#### La ubicación de a mano manda

Marcar el local desde un TPV sitúa la manzana; la de Google no depende del aparato.
Pero dentro de un centro comercial el punto de Google cae en el aparcamiento. Así
que se guarda **de dónde sale** la posición, y la marcada desde el local no la pisa
nadie: ni elegir el local en Google, ni traer su ficha otra vez.

#### Lo que se encontró

- **`GOOGLE_BUSINESS_KEY` no existía.** Llevaba desde M5 en `config/claves.md` como
  una clave más, y Business Profile no se usa con clave: es **OAuth del dueño de la
  ficha** y un acceso que Google tiene que aprobar. Se habría pedido algo que Google
  no da.
- **La API de pruebas no arrancaba** con la clase del error de Google: Node quita los
  tipos sin compilar, y las propiedades declaradas en el constructor no se dejan
  quitar. Se escribió a la antigua.

### Antes de M8 · los planes, y la puerta del admin

El 16 de septiembre Richi paró M7 con **veinte mejoras** y **el panel de
administración** entero —clientes, vendedores con código, ventas y auditoría—, y una
condición: M8 no empieza hasta tenerlo todo. Se escribieron los dos planes
([`mejoras-antes-de-m8.md`](mejoras-antes-de-m8.md) y
[`panel-de-administracion.md`](panel-de-administracion.md), #52) y se construyó la
primera entrega, **A1 · la puerta** (#53, migración `0037`).

#### Uno · Ser admin no es un rol

La tentación era un rol «admin» más en la matriz de M1. Se descartó: esos roles viven
dentro de una organización, y una política mal escrita habría dejado a un gerente
llegar al admin. Ser admin es de un esquema aparte, `plataforma`, con su nivel y su
historia ([0041](decisiones/0041-el-panel-de-administracion.md)).

#### Dos · Dos sesiones que no se cruzan

Entrar en el admin abre **otra clase de sesión**, marcada en la base y de ocho horas
como mucho. El despachador no deja usar una del admin en la app ni una de la app en el
admin, y mira en cada petición que el acceso siga vivo y que haya segundo factor. Así
un token olvidado en la tablet del pase no abre el admin, y quitarle el acceso a
alguien le cierra la puerta en su siguiente paso.

#### Tres · La contraseña del chat no se usó

Richi escribió en el chat una contraseña para `estookapp@gmail.com`. No se usó: lo que
pasa por un chat se da por visto. `bd:dar-admin` genera una de un solo uso y obliga a
cambiarla y a montar el segundo factor antes de ver nada.

#### Lo que se encontró

- **La #50 nunca llegó a `main`**: se fusionó en la rama del Panel vivo, que ya estaba
  fusionada. La llevó la #51 (regla 66).
- **Los pasos de M7 decían `.estook.cmd`**, sin la barra, que PowerShell no encuentra.
- **`ESTADO.md` hablaba de dieciocho funciones con privilegio** y la prueba lista
  veinticuatro.
- **En el repaso de A1, tres más.** Con la contraseña de un solo uso sin cambiar, **las
  consultas del admin se podían leer llamando a la API a pelo**: la pantalla no lo
  dejaba, la API sí. Ahora el despachador lo para, con su prueba vista fallar. **No
  había forma de rescatar a un admin** que olvidara la contraseña o perdiera el móvil y
  los códigos: `bd:dar-admin` gana `--nueva-clave` y `--sin-segundo-factor`. Y **en el
  móvil la cabecera del admin se comía un tercio de la pantalla**, y la fila propia
  enseñaba «Acceso» vacío: se vio sacando capturas, no con las pruebas en verde.

### Antes de M8 · E1, crear cuenta y entrar con Google

Richi pidió que la gente **se pudiera registrar**, con Google o con correo y
verificación; entrar **con cuenta, PIN o Google**, con las opciones a la vista; y una
**portada básica** en `estook.com` con los dos accesos. A las preguntas: **se paga al
empezar**, y la prueba de 12 días es **una oferta** que se enciende desde el admin
cuando hay campaña ([0042](decisiones/0042-registro-abierto-google-y-la-oferta.md),
migraciones `0038` y `0039`).

#### Uno · Un código, no un enlace

El enlace del correo se abre muchas veces en otro navegador —el del móvil—, y la cuenta
acababa creada lejos de donde estaba la persona. El código se escribe donde se empezó.
Y la cuenta **no existe** hasta escribirlo: sin eso se podrían crear cuentas con correos
de otros.

#### Dos · Nada que diga qué correos usan Estook

Pedir el código contesta lo mismo tenga cuenta o no; a quien ya la tiene le llega un
correo de «ya tienes cuenta». **Y tarda lo mismo**: la primera versión se saltaba la
derivación de la contraseña cuando el correo existía, y por el tiempo de respuesta se
habría sabido. Se vio repasando: ahora se deriva siempre.

#### Tres · Google sin scripts de Google

Código con PKCE, ida y vuelta por el navegador: la política de seguridad sigue en
`script-src 'self'`, el secreto solo lo tiene la API y la sesión que sale es la nuestra.
Para probarlo sin salir a internet, **puertos con adaptador de mentira**: un correo en
memoria que la API de pruebas enseña en `/api/pruebas/ultimo-correo`, y un Google que
acepta `prueba|sujeto|correo|nombre`.

#### Lo que se encontró, y es lo más serio del proyecto hasta hoy

- **Los intentos fallidos de entrar no se guardaban desde M4.** Un fallo lanza un error,
  el error deshace la transacción, y **con ella el contador**. El bloqueo a los cinco
  intentos de contraseña y de PIN no bloqueaba nunca, y las pruebas no lo veían porque
  comprobaban la respuesta, no la base. Ahora hay fallos que **guardan lo hecho**
  (`falloQueSeGuarda`), y pruebas que miran la base y que se vieron fallar sin el
  arreglo.
- **El segundo factor no tenía límite de intentos**: seis cifras se pueden probar.
  La `0039` los cuenta y bloquea.
- **Un código del segundo factor mal escrito decía «el correo y la contraseña no
  cuadran»**, con la contraseña ya aceptada. Ahora, «ese código no es correcto».
- **Windows no distingue mayúsculas**: al crear `privacidad.tsx` junto a
  `Privacidad.tsx`, el primero pisó al segundo sin avisar. Las entradas de las páginas
  viven en `src/paginas/`.

### Antes de M8 · V, lo que se ve (la primera parte, en producción con la #64)

**Fusionada en la #64** el 23 de septiembre, con los arreglos de después en la #65. El modo cocina (mejora 1)
y «Cómo va», las cifras con flecha de cada app (mejora 2,
[0044](decisiones/0044-las-cifras-de-cada-app.md), migración `0040`).

#### Uno · La misma tarjeta, y las mismas cuentas

La tarjeta del Panel pasó a `@estook/ui` y la usan el Panel y las tres apps. Richi
decidió que las cifras van **en la primera pantalla de cada app**, **fijas por app**, y
que un retraso es pasar de **cinco minutos que cada local cambia**. Las seis nuevas se
cuentan **como la pantalla de la que salen**: la cámara, como Inventario · Hoy, con una
foto de cada día reconstruida del libro (lo que hay no se suma); las horas, el coste y
los retrasos, como el Resumen de Equipo, que gana su columna de retrasos contada con la
misma pieza. Cada una tiene su prueba contra la base que compara las dos pantallas.

#### Dos · Medir el modo cocina en las pantallas, y no en las fichas

El punto 1 se había dado por hecho con las pruebas de sus fichas, y su «terminado
cuando» pedía **recorrer las pantallas midiendo 64 px y 7:1**. La prueba que lo hace
(`modo-cocina.spec.ts`) se escribió después, y el primer día encontró tres fallos.

#### Lo que se encontró

- **Los ajustes del aparato solo se aplicaban al abrir Ajustes.** La letra grande
  **desde M3** y el modo cocina desde que existe: al volver a abrir la app se perdían, y
  la tableta del pase arrancaba cada mañana con los botones pequeños. Se aplican en la
  raíz, como el tema.
- **El modo cocina solo subía los grises.** El botón principal quedaba a 6,6:1, uno
  rojo a 5,3 y la pestaña activa, en el color de su app, a 3,4. Suben los estados, el
  texto del botón principal y los acentos, calculados; y el color propio de un local se
  ajusta a 7:1 en cocina. El bloque oscuro se aplicaba a «el del sistema» **con el
  sistema en claro**: habría puesto texto casi blanco sobre blanco.
- **Una regla de la capa base pierde contra cualquier clase de utilidad.** La de 64 px
  no llegaba a las vistas (`min-h-[36px]`); va fuera de la capa.
- **En un iPhone SE la barra de arriba no cabía** con los botones a 64 px y cortaba
  el de tu cuenta. En Chrome la prueba no lo veía; en Safari, sí (la integración
  continua prueba los tres). Con el modo puesto y por debajo de 440 px se recogen
  Avisos y Chat, que hoy solo dicen lo que serán.
- **Nada refrescaba las cifras con flecha** al cerrar la caja, apuntar una merma o
  fichar: la caché las guardaba un minuto.
- **Una prueba pasaba por el orden**: las cifras de Inventario solo salían si otra
  prueba había dado de alta un producto antes. Y la prueba del margen de retraso cazó
  que **cambiar el margen y recargar en el mismo instante lo perdía**, sin que la
  pantalla dijera nada. Ahora dice «Guardando…» y «Guardado», y el selector no vuelve
  atrás mientras tanto (lo guardado se escribe en la caché).

#### Lo que dejó cada punto, contado entonces en `ESTADO.md`

**Lo que el punto 1 dejó hecho, y no hay que volver a tocar:** `cocina.css` con las
fichas del modo, `usarModoCocina` como ajuste del aparato —igual que el tema y la
letra—, el interruptor en Ajustes, y los botones de subir y bajar del Panel, que
vuelven **solo con guantes** porque ahí el arrastre se dispara solo.

**Y lo que le faltaba, completado el 23 de septiembre.** Su «terminado cuando» pedía
**una prueba que recorriera las pantallas con el modo puesto midiendo 64 px y 7:1**, y
no existía: se había dado por hecho con las pruebas de las fichas. Ahora existe
(`modo-cocina.spec.ts`: ocho pantallas del cocinero y la hoja de merma, en escritorio
y móvil), y **encontró tres fallos de verdad**:

1. **El modo cocina no se aplicaba al abrir la app**, solo al pasar por Ajustes: la
   tableta del pase arrancaba cada mañana con los botones pequeños. **La letra grande
   tenía el mismo fallo desde M3.** Los dos se aplican ahora en la raíz, como el tema.
2. **Solo subían los grises.** El botón principal quedaba a 6,6:1, un botón rojo a 5,3
   y la pestaña activa, en el color de su app, a 3,4. Ahora suben también los cuatro
   estados, el texto del botón principal y el acento de cada app, calculados; y el
   color propio de un local se ajusta a 7:1 en cocina. De paso: el bloque oscuro del
   modo se aplicaba a «el del sistema» **aunque el sistema estuviera en claro**.
3. **Muchos botones no llegaban a 64 px**: los de «ha llegado / ha salido» de cada
   producto (40), las vistas (36), las migas (20). Ahora lo dice una sola regla de
   `cocina.css`, fuera de la capa base para que ninguna clase la pise. Y con todo más
   grande, **en un iPhone SE la barra de arriba no cabía** y cortaba el botón de tu
   cuenta: lo vio la integración continua, que prueba también Safari. Con el modo
   puesto y por debajo de 440 px, Avisos y Chat —que hoy solo dicen lo que serán— se
   recogen; cuando los avisos existan (entrega I), hay que volver a mirarlo.

**Lo que el punto 2 dejó hecho** ([0044](decisiones/0044-las-cifras-de-cada-app.md)):
**«Cómo va»** en la primera pantalla de Inventario, Servicio y Equipo, debajo de lo
urgente (en Inventario, **arriba del todo** desde el 23-sep, lo pidió Richi), con «7 días · 30 días» y cada tarjeta llevando a su detalle. La tarjeta del
Panel pasa a `@estook/ui` y la usan todos. **Seis cifras nuevas** —valor de la cámara,
bajo mínimo, cajas cerradas, horas del equipo, coste de personal y retrasos—, contadas
**como las pantallas de las que salen**, con su prueba contra la base que lo compara.
Y **Ajustes → «Cuándo es llegar tarde»**: cinco minutos que cada local cambia
(migración `0040`), con su columna de retrasos en Equipo · Fichajes (que entonces se llamaba «Resumen»).

**Lo que el punto 3 dejó hecho** ([0045](decisiones/0045-el-aspecto-y-el-orden.md)),
con lo que Richi pidió el 23 de septiembre mirando la app en su TPV:

- **«Hoy» se llama «Resumen»** en Inventario, Escandallos y Equipo, y en Equipo el
  «Resumen» de las horas pasa a **«Fichajes»**. B5 del Plan, cambiada.
- **Las tarjetas van en mosaico** (`Mosaico`, y la misma medida en la casilla del
  Panel): cada una mide lo que lleva y las demás encajan debajo. Se acabaron las
  tarjetas estiradas con un hueco vacío dentro.
- **Menos texto**: cada aviso en tres líneas con el porqué plegado en «¿Por qué?», los
  cuatro primeros a la vista, el menú lateral solo con el nombre y cada enlace de
  tarjeta en «Ver ›». Fuera la tarjeta «Y lo que falta por venir» y los cuatro botones
  apagados «Con una foto · M22».
- **Ajustes por secciones** —Este aparato, Mi cuenta, Tu local, Conexiones y
  Organización—, cada una con su dirección y un buscador que sale también en el
  buscador universal (`lasSeccionesDeAjustes.ts`).
- **El aspecto nuevo**: tarjeta de 24 px con sombra en dos capas, el icono de la app en
  su pastilla en vez de la línea de color, sin mayúsculas grises, el velo del color del
  local en el Panel, y el oscuro un punto más hondo. La tarjeta se adapta a su propio
  ancho.
- **Dos fallos de antes, con su prueba:** lo elegido («7 días», «Listo») no se leía en
  oscuro —1,4:1—, y «el del sistema» en claro no era el tema claro. Con esto, lo que el
  punto 5 tenía apuntado del tema del sistema queda hecho.

**Y el arreglo de entrar** (23-sep, lo trajo Richi). Entrando en la **app** con
`estookapp@gmail.com` —la cuenta que solo es del admin, sin ningún negocio— la app pedía
el código del segundo factor y después decía «no está asociada a ningún negocio».
Parecía que las cuentas se mezclaban. **No se mezclaba nada**, comprobado en la base: el
segundo factor es de la persona, y solo lo tienen `estookapp@gmail.com` y Santi, que
son los del admin; `belicar1905@gmail.com` no lo tiene, y ninguna cuenta ve nada de otro
negocio. Lo que estaba mal era el orden. Ahora **una cuenta sin negocio se para antes
del código**, sin abrir sesión, con el error `sin_negocio` que manda al admin; y la
pantalla del código **dice de qué cuenta es**, porque la sesión a medias se quedaba en
el navegador y volvía sola días después. Con su prueba contra la base y de pantalla.

**Y la red de debajo de cada pantalla** (23-sep, la destapó Safari en la #64). La app se
descarga a trozos —Movimientos, Compras, la ficha, el alta, las gráficas— y **si un trozo
no llegaba, el fallo no lo recogía nadie**: la pantalla podía quedarse en blanco. Pasa si
se va la conexión y, sobre todo, **al publicar una versión nueva con la app abierta**, que
es justo lo que va a pasar al fusionar V. Ahora `SiAlgoFalla` (en `@estook/ui`) está en
la raíz de la app y del admin y debajo de cada pantalla: un trozo que no llega **recarga
sola una vez** para traer la versión nueva; si vuelve a fallar, lo dice con su botón y
las barras siguen. Cada fallo recogido se manda a Sentry (`avisarDelFallo`). Con su prueba
de pantalla, que corta la descarga de Movimientos a propósito y se vio fallar sin la red.

#### Lo que pasó al fusionar la #64, y lo que se arregló después

**Se desplegó la API sin aplicar la `0040`** (23-sep, 18:43). El código nuevo leía el
margen de retraso de cada local, que crea esa migración; como no existía, **Equipo entero
y el fichar del Panel dejaron de funcionar**. Se aplicó la `0040` a las pocas horas y
volvió todo: comprobado **como cada persona real** de los cuatro negocios, con las 33
consultas del día a día, en una transacción de solo lectura —**cero fallos, y nadie ve
nada de otro negocio**—.

Y de ahí salieron tres arreglos, en la rama `arreglos-tras-la-64`, fusionados en la #65:

- **El despliegue ya no deja adelantarse a la base.** «Desplegar la API» pregunta a
  Supabase, en solo lectura, en qué migración está la base, y **si va por detrás del
  código no despliega** y dice que se aplique `bd:migrar` antes
  (`herramientas/la-base-va-al-dia.mjs`). Si no puede preguntar, avisa y despliega: esa
  puerta de Supabase es «beta» y no puede dejar a Richi sin desplegar un arreglo.
- **Un fallo al leer ya no se disfraza.** El widget de fichar le dijo a Richi, director,
  «tu acceso no incluye fichar» cuando lo que pasaba era que no se podía leer; y los
  demás widgets, sin datos, decían «nada caduca» o se quedaban cargando. Ahora dicen «No
  he podido leerlo» con su botón de volver a intentarlo.
- **En Inventario, «Cómo va» arriba del todo** (lo pidió Richi; 0045, apartado «Seis»).

### Antes de M8 · el repaso del 23 de septiembre

**En producción desde el 24 de septiembre** (#66: fusionada, las cuatro migraciones aplicadas y la API desplegada a las 00:03). Doce cosas que trajo Richi mirando la app en el
móvil, y una auditoría de Supabase, GitHub y la app. Lleva **cuatro migraciones**: de la
`0041` a la `0044`.

#### Lo que pidió, y lo que se hizo

- **El jefe de cocina ve las ventas** —«puede necesitar saber qué sale o qué no»—: las
  del día, el ticket medio, los cierres y, con el precio de compra que ya tenía, el food
  cost. **Solo verlas**; la caja la sigue cerrando quien lleva el local o la sala
  (migración `0041`, Roles 1.6). Lo que sale plato a plato llega con el TPV.
- **La merma no tira más de lo que hay**, ni al apuntarla ni al quitar un lote tirado.
  La hoja lo avisa en el campo y **el servidor lo impide** (`mas_de_lo_que_hay`, 422),
  con la frase de qué hacer si de verdad hay más.
- **Las listas cuentan lo que enseñan.** «11 productos por debajo del mínimo» y salían
  tres; lo mismo en Congelados. El título contaba el local entero, y «Bajo mínimo» se
  perdía los del final del abecedario al filtrar después de cortar. Ahora la consulta
  devuelve `cuantosCumplen`, y los topes de 200 de las listas internas pasan a 5.000.
  **Y medirlo destapó lo lento de verdad** (24-sep). Una prueba de Safari tardó de
  más, y con 400 productos en la base de pruebas el Resumen de Inventario tardaba 2,6 s
  (en `main`, 1,7). Midiendo cada consulta: el recuento nuevo obligaba a calcular lo
  caro de todos (se cuenta ahora con lo barato); **el valor de la cámara recorría el
  libro entero** y estaba escrito dos veces (ahora una, `elValorDeLaCamara`, producto
  a producto); y sobre todo **el precio vigente se pedía producto a producto**
  (migración `0044`: `precios_vigentes`, de una pasada, y la de uno la llama). Quedó
  en 0,34 s el Resumen, 0,32 s «Bajo mínimo» y 0,27 s la lista: entre cuatro y cinco
  veces más rápido que antes de esta rama. Dos cosas que se probaron y no cambiaban
  nada —unir las existencias producto a producto en la lista y agrupar las cuentas del
  libro— se deshicieron.
- **La muesca del iPhone ya no tapa nada**: la barra de arriba, las hojas, el buscador,
  entrar, crear cuenta, el alta y el admin dejan el hueco de la zona segura.
- **Al tocar un campo, el móvil ya no hace zoom**: en pantallas táctiles los campos van
  a 16 px como mínimo, que es lo que Safari mira.
- **La letra «Pequeña», de verdad pequeña en el móvil** (0,82), sin tocar el ordenador;
  y con tilde.
- **Fogón sale de la barra de arriba**, en ordenador y en móvil: se queda la burbuja, y
  en escritorio `Ctrl+J`. B5 del Plan, cambiada.
- **En Equipo, «Cómo va» va justo debajo de fichar**; en Servicio se queda donde estaba.
- **La ficha de una persona enseña sus tres últimos fichajes y «Ver todos»**, que abre
  el historial entero dentro del mismo panel, agrupado por meses y de cincuenta en
  cincuenta, con «Corregir» en cada uno (`fichajes_de_una_persona`). «En el local» se
  mide con el radio del local donde se fichó.
- **«En línea» es tener la app abierta y a la vista** (migración `0042`): la app avisa
  cada 45 segundos mientras se ve (`sigo_aqui`, que no se guarda para repetirlo) y
  una vez al esconderse; dos minutos sin aviso, y deja de salir. «Última vez» es el
  último aviso, no la última entrada.
  **Lo cazó Safari en GitHub:** al recargar, la página se esconde y después se va, y el
  «ya no estoy» salía entre las dos cosas y se cortaba —un fallo de página por cada app
  que abría la prueba—. Ahora espera un segundo y no sale si la página se va.
- **El TPV**: lo que Richi describió —añadir terminal con nombre y función (Sala, Barra
  o Cocina), emparejado por código o QR, que carga su pantalla y al que se entra con
  PIN, y que es del local y no del trabajador— encaja con el Anexo 3.4, y **lo que no
  estaba escrito se escribió** («Dar de alta un terminal»). Con eso queda decidida la
  pregunta abierta de lo que el TPV toca de lo construido: el terminal es una pieza
  aparte, `aparato_del_local`.
- **ESTADO.md, resumido**: las lecciones pasan a [`lecciones.md`](lecciones.md) y el
  detalle de lo hecho, aquí.

#### Lo que encontró la auditoría

- **Supabase, en producción y solo leyendo:** ninguna tabla sin seguridad por filas;
  `anon` y `authenticated` sin acceso al esquema `estook`; ninguna función con
  privilegio sin `search_path` fijo; el libro de movimientos cuadra entero; ningún
  producto en negativo, ningún fichaje imposible, ningún cierre duplicado, y **ningún
  dato cruzado entre negocios** (lotes, movimientos, membresías, pedidos, proveedores).
- **Siete funciones con privilegio seguían ejecutables por cualquiera**, de antes de
  que se cogiera la costumbre de cerrarlas. No se podía abusar —el esquema está
  cerrado—, pero era una sola barrera. La `0043` las cierra todas sin nombrarlas, y la
  prueba mira todas.
- **«En línea» solo lo veía bien quien puede quitar accesos**: las políticas de las
  sesiones no dejan leer las de los demás. Lo arregla la `0042`.
- **440 claves de idempotencia caducadas sin borrar**: las tenía que tirar un trabajo
  nocturno que no tiene reloj. Ahora las tira `anotar` al apuntar una nueva, solo las
  de su organización.
- **GitHub:** `main` protegida por su conjunto de reglas —ni borrar, ni reescribir, y
  las tres comprobaciones obligatorias—. **Las acciones usaban Node 20**, que GitHub
  retira: suben a las versiones con Node 24 (y `upload-pages-artifact` con
  `include-hidden-files`, para que `.nojekyll` siga entrando). **Ocho avisos de
  recarga rápida** del lint, arreglados de verdad: los proveedores de sesión, del
  esqueleto y de deshacer van en su fichero, y cuatro funciones sueltas, en el suyo.
- **Dependencias:** dos avisos moderados de React Router 6 que **no nos afectan** —uno
  es de páginas generadas en el servidor, que no usamos; el otro necesita navegar a una
  dirección escrita por alguien de fuera, y todas las nuestras salen del catálogo—. Se
  van al subir a React Router 7.

---

### Antes de M8 · V, la segunda parte: los vacíos, el oscuro y las fotos

**En producción desde el 24-sep** (#67). Los puntos 4 y 5 del plan de mejoras, que
cierran V. Una migración, la `0045`. Todo razonado en la
[0046](decisiones/0046-los-vacios-el-oscuro-y-las-fotos.md).

#### Lo que se hizo

- **Los vacíos, con dibujo y un botón.** Veinte dibujos de línea de una sola familia
  (`packages/ui/src/dibujos/`), pintados con las fichas y cada uno en su trozo; el
  dibujo pasa a ser obligatorio en `EstadoVacio`. Se repasaron **uno a uno todos los
  vacíos** de las apps y del admin —hoy son cuarenta y cuatro, contando los de un filtro—: los que decían «se hace desde otra pantalla»
  ganaron el botón que lleva allí —las acciones del catálogo, con `usarAccion` y
  `BotonDeAccion`, solo para quien puede—, y los de un filtro pasaron a `NadaConEso`,
  que ofrece quitarlo. Los filtros vacíos que son buena noticia ofrecen volver a la
  lista entera.
- **Inventario · Resumen con la cámara vacía** enseña el botón del alta y los tres
  pasos para empezar, y no «Cómo va». **Productos sin género** enseña solo el vacío:
  mirándolo en oscuro se vio que la barra de filtros decía «Todavía no tienes género»
  dentro de un desplegable, con un «Hacer recuento» de nada y dos botones naranjas.
- **Lo del futuro que quedaba**: la hoja de apuntar una merma y la pantalla de Mermas
  aún decían «con una foto, más adelante… llega con el módulo 22». Se fueron, por la
  regla de la 0045.
- **El contraste, medido en pantalla**: una prueba nueva mide cada texto visible
  contra el fondo que tiene debajo, en diecisiete pantallas, en los dos temas y en
  ordenador y móvil. **El oscuro pasó entero; el claro, no**: la vista elegida y la
  barra de abajo del móvil llevaban el nombre en el color de la app, y el ámbar de
  Inventario sobre blanco da 3,46:1. Se arregló en la pieza con `acentoParaTexto`.
- **Las capturas**: treinta y dos, del sistema de diseño entero y de cinco pantallas,
  en claro y en oscuro, comparadas en la integración continua (en Linux y con Ubuntu
  fijo). Las hace **Vera**, una gerente sembrada en el Bar Ribera con la que no entra
  ninguna otra prueba. Las nuevas se traen con `pnpm capturas:traer`. El catálogo del
  admin ganó un selector «Claro · Oscuro» para mirar las piezas.
- **Las fotos de producto**: migración `0045`, cubo `fotos-de-producto` (lo creó
  `almacen:preparar` contra Supabase el 24-sep, y comprobó allí mismo la firma de dos
  fotos en una petición), comandos `poner_foto_de_producto` y
  `quitar_foto_de_producto`, reducción en el teléfono (800 px WebP, JPG en Safari, y
  miniatura cuadrada de 160) y la foto en la lista, la ficha y el recuento.
- **De paso**: el logo también comprueba que lo subido es una imagen de verdad (sus
  primeros bytes); en la lista del móvil, un nombre con una palabra larga ya no pisa
  la cantidad; y la tabla de personas de las semillas decía siete y eran once.

#### Lo que costó, y lo que queda escrito

- **Una prueba que no ha fallado nunca no se sabe si mira algo.** Las del servidor de
  las fotos se vieron fallar quitando cada protección —el candado de la política,
  borrar lo viejo y mirar los primeros bytes—, y cada una puso en rojo justo la suya.
- **Una captura de Windows no vale para Linux**, ni una de Ubuntu 24 para Ubuntu 26.
  Por eso se comparan solo en la integración continua y con su sistema fijo, y las de
  Windows (`CON_CAPTURAS=1`) son para mirar.
- **Medir el contraste solo en el ordenador no basta**: la barra de abajo solo existe
  en el móvil, y era la mitad de lo que no se leía.
- **Lo que solo ve GitHub.** La primera vuelta encontró que, en el móvil de 320 px del
  Safari de las pruebas, el selector «Claro · Oscuro» del catálogo dejaba el título sin
  ancho; en local, a 375 px, cabía. Y no dejó ninguna captura que mirar: con
  `updateSnapshots: 'none'` Playwright no escribe la que falta. Se pasó a `missing`,
  que la escribe y sigue en rojo.
- **Cada entrada es espera para las demás.** Las pruebas nuevas entraban una vez por
  pantalla —unas setenta— contra una API de pruebas que atiende de una en una, y una
  prueba de Safari de otro fichero se quedó esperando al entrar. Ahora entran una vez
  por persona y tema.
- **Y una carrera que ya existía salió a la luz**: el grupo del alta de Casa Lola era
  `serial`, pero `serial` ordena dentro de un navegador, no entre los tres, y el logo y
  el paso del alta de ese único local se pisaban. Ahora ese grupo corre solo en el
  móvil.

---

### Antes de M8 · los dos fallos que salieron al mirar V en el móvil

Richi miró V en su móvil el 24-sep y mandó dos capturas. Sin migración.

- **El nombre del producto, partido letra a letra** («Nar / anj / a»). La fila del
  móvil dejaba fijos la cantidad, la etiqueta y los dos botones, y al nombre le
  quedaban unos 50 px a 375 px y **cero** a 320. El arreglo de V para que no pisara la
  cantidad (`overflow-wrap:anywhere`) lo partía por cualquier letra. Ahora la fila es
  como la de las listas de inventario grandes: el nombre arriba con todo el ancho (dos
  líneas como mucho, partiendo por palabras), la cantidad debajo y **la etiqueta solo
  si avisa** (`avisa` y `NOMBRE_CORTO_DEL_AVISO`, en el dominio): «Sin mínimo puesto»
  no es un estado del género, es un dato que falta, y vive en la ficha. Por debajo de
  360 px, el + y el − van uno encima del otro.
- **La barra de abajo se salía por los lados a 320 px.** Cada botón era `flex-1` sin
  `min-w-0`, y no bajaba del ancho de su palabra.
- **Recargar dos veces mandaba a entrar, y entrar fallaba.** La API iba por el
  agrupador de Supabase **en modo sesión**, que admite quince clientes: treinta
  transacciones a la vez contra producción, quince con error; por el modo transacción,
  ninguna. La API entra ahora sola por el `6543` (`laPuertaDeLaApi`). Y la app ya no
  confunde un fallo del servidor con no haber entrado: reintenta tres veces y, si
  sigue, enseña «No llego al servidor» con «Volver a probar» (`SinServidor`, con un
  dibujo nuevo, `sin-conexion`). Solo `sin_sesion` manda a entrar.

- **Quien tiene dos locales elegía uno al entrar y se quedaba en «Cargando tu
  panel».** Viene de M4: al cambiar de sitio, la sesión vacía la caché con
  `removeQueries`, y React monta el Panel un instante antes; quitar una consulta que
  ya tiene una pantalla esperándola la deja colgada para siempre. Ahora es
  `resetQueries`, que vuelve a pedir lo que está a la vista. Lo cazó una prueba de O.
- **Dos rojos escondidos en vueltas verdes de Safari**, arreglados de raíz: las
  recargas de las pruebas no estaban protegidas contra el fallo del motor (24
  sueltas, ahora por `recargarSinQueSeCaiga`), y repetir la vuelta de Google gastaba
  lo que esa vuelta solo deja leer una vez. Y las capturas se comparan «en suave»:
  salen todas las distintas en una vuelta, no una por vuelta.

Las pruebas: `el-movil-y-la-recarga.spec.ts` (a 320 y 375 px, cada palabra en una
línea y nada que se salga; el servidor fallando y la sesión caducada), vistas fallar con
el arreglo quitado, y `postgres.prueba.ts`. Lecciones 101 a 105.

### Antes de M8 · O, lo que se ordena

**En producción desde el 25-sep** (#69), con la migración `0046`. Las
mejoras 6, 8, 9 y 17 y el QR de la 20, razonadas en la
[0047](decisiones/0047-lo-que-se-ordena.md) con lo que contestó Richi el 25-sep:
«copia a los mejores y mejóralo», y Fogón destacado en su propio banner.

#### Lo que se hizo

- **El botón «+»** donde estaba la burbuja de Fogón (`acciones/BotonDeHacer.tsx`):
  Fogón arriba en su banner con dónde estás, fichar cuando se puede y los atajos de
  cada puesto (`ACCIONES_DEL_PUESTO`), que son los mismos que las acciones rápidas del
  Panel (`usarMisAtajos`). «Fichar» y «Hacer recuento» entran en el catálogo de
  acciones; `?hacer=fichar` abre la hoja desde cualquier sitio.
- **Lo de hoy** (`lo_de_hoy` y `loDeHoy`): la zona de atención del Panel, ordenada por
  el servidor en cinco escalones con las consultas de siempre, con su botón en cada
  cosa y «Luego». La caja sin cerrar solo avisa si ese día de la semana se suele
  cerrar.
- **El Panel de cada puesto** (`elPuestoDe`, `PANEL_DEL_PUESTO`): cuatro, sacados de los
  permisos, todos con el reloj arriba; «Volver al de mi puesto».
- **El semáforo** (`mis_objetivos`, `lasCifrasDelSemaforo`, el widget «Objetivos» y
  Ajustes · Tu local): food cost, personal, coste primo, merma en % de lo comprado y
  ventas de la semana, con su porqué plegado. Los objetivos, por fin fuera del alta.
- **El QR para siempre** (`0046`, `la_carta`, `apps/carta`, `pantallas/TuCartaYSuQr.tsx`):
  la dirección fija y única, la carta sin sesión y el QR en SVG, PNG y cartel, con `uqr`
  cargado aparte. La página de la carta es la `404.html` de todo el sitio, y la de
  pruebas de M0 que se veía en `estook.com/carta/` se ha ido.
- De paso: `usarLoDeHoy`, que leía `inventario_hoy`, se llama ahora `usarInventarioHoy`;
  `EstadoVacio` puede ser el título de la página (`esLaPagina`).

#### Lo que se torció por el camino

- **Dos relojes.** La primera versión de lo de hoy devolvía el día de las compras (el
  del calendario) y juzgaba la caja con él; a la una de la madrugada, con el corte a
  las cinco, la caja de «ayer» era la de anteayer. Cada cosa cuenta ahora con el suyo, y
  la prueba que lo cazó se escribió a esa hora.
- **Una batería de pruebas contaminada.** Se cambió de rama con la batería de pantalla
  corriendo, y la API de pruebas se recarga desde el código: fallaron pruebas que
  pasaban. Se repitió entera en su rama.
- **El Panel del gerente sin su reloj.** El primer reparto quitaba «Fichar» a quien
  lleva el local; lo vio una prueba, y el Manifiesto ya decía «a todo el que ficha,
  Fichar arriba del todo».
- **Una prueba que pasaba sola y fallaba en compañía.** La de «el Panel no puede leer»
  esperaba el widget de fichar en el Panel guardado de Rosa, y las del Panel de
  `esqueleto.spec.ts` se lo quitaban a la vez. Ahora contesta ella misma con el Panel
  de fábrica.
- **«Ver» en las tarjetas estrechas.** En el móvil, la palabra le quitaba sitio al
  título y «Valor de la cámara» salía en tres líneas; por debajo de 16 rem queda solo
  la flecha.
- **Un botón que llevaba a donde ya estabas.** En Ajustes, la tarjeta de los objetivos
  ofrecía «Poner tus objetivos». El semáforo ya no propone ir a la pantalla en la que
  está (`usarSinIrAquiMismo`), y la prueba lo mira.
- **Una repetida de Safari sin rastro.** La primera vuelta verde de la #69 repitió una
  prueba al entrar, y GitHub no guardaba nada del intento que falló. Ahora el rastro
  es de ese intento y el informe se sube también en verde.
- **Al arrastrar, mandaba el centro y no el dedo.** Con el rastro, la siguiente
  repetida se explicó sola: el Panel decidía dónde caía un widget por el centro del
  que se arrastra (`closestCenter`), y el de los objetivos, alto y cogido por arriba,
  tenía el centro muy lejos del dedo. Soltado encima de «Fichar», no iba ahí. Ahora
  decide el dedo (`pointerWithin`), y el centro solo con el teclado. La prueba lo pone
  alto a propósito: sin el cambio falla siempre.

Las pruebas: `objetivos.prueba.ts`, `hoy.prueba.ts` y `carta.prueba.ts` en el dominio;
`lo-que-se-ordena.prueba.ts` contra la base; `lo-que-se-ordena.spec.ts` y las de Fogón
de `pantalla.spec.ts` en pantalla. Lecciones 106 a 109.

### Antes de M8 · el Panel en el móvil, y un repaso

_25 de septiembre de 2026, con la #68 y la #69 ya en producción._ Sin migración.

Richi miró O en el móvil y mandó dos capturas: le gustaba, salvo tres cosas. Y pidió un
repaso general de cómo se ve. Antes, la ráfaga que quedó pendiente de la #68, contra
producción: **las treinta pasan**, y ahora es una herramienta (`bd:rafaga`).

#### Lo que vio Richi

- **«Hoy» ocupaba la pantalla entera.** Tres avisos, cada uno con su botón grande y
  un «Luego» debajo, se comían el móvil antes del primer widget. Ahora, en el móvil,
  sale **plegado**: «Hoy · 3 cosas», un punto de color por cada una y **solo la más
  urgente** debajo; se abre tocando la cabecera y se recuerda en el aparato. Cada fila
  es más baja —el botón en píldora, «Luego» como un reloj— y el título de la caja ya no
  lleva la fecha entera («La caja de ayer está sin cerrar»). **Sin nada que atender, no
  aparece**: ni la tarjeta ni el «Nada urgente por hoy».
- **Un punto suelto a la derecha de la línea de ventas.** Un día con dato entre dos
  huecos se pintaba como un círculo dentro de un SVG que se estira a lo ancho: salía
  como una raya achatada. Ahora los días seguidos van en trazo entero, **el hueco en
  discontinuo**, y un punto de verdad —fuera del dibujo— en el día suelto y en el
  último (`formasDeLaTendencia`).
- **El «+» se aparta al bajar y vuelve al subir**, solo en el móvil
  (`usarSeEscondeAlBajar`). Con el foco del teclado vuelve siempre.

#### Lo que salió del repaso

Recorridas catorce pantallas en el móvil y cinco en el escritorio, en claro y en
oscuro, mirando la consola, las peticiones y lo que se sale por los lados:

- **La zona de atención se salía por la derecha** con una línea que no se parte
  («3 productos sin precio»): la rejilla no tenía columnas dichas y crecía con ella.
  Y vacía dejaba sus huecos: ahora se esconde.
- **«3 productos sin precio»** pasa de tres líneas a dos, del mismo aire que «Hoy».
- **Una ficha cerrada dejaba un «Cargando» vivo y escondido** (la de una persona y
  la de un producto): `isPending` con la consulta apagada. Ahora `isLoading`.
- **«Caduca esta semana» decía «caducado»** de lo que caduca hoy, mientras «Hoy» decía
  «caduca hoy». Ahora dice «hoy».
- **«Fichar la entrada» partía en dos líneas** en la casilla pequeña: ahí se ve
  «Entrada», y se oye la frase entera.
- **Entrar a veces no hacía nada.** «Continuar con Google» aparecía al contestar el
  servidor, encima del formulario, y lo empujaba: quien pulsaba «Entrar» en ese
  momento tocaba donde ya no estaba. Lo cazó Safari en GitHub. Ahora Google ocupa su
  sitio desde el principio.

Ningún error de consola ni petición fallida en todo el recorrido.

Las pruebas: `formasDeLaTendencia.prueba.ts`, el título de la caja en
`lo-que-se-ordena.prueba.ts` y `el-panel-en-el-movil.spec.ts` (plegado, sin avisos, el
«+» al bajar y ninguna ficha cargando a escondidas). Lecciones 110 a 113.

### Antes de M8 · E2, el pago con Stripe

_25 de septiembre de 2026._ Con la migración `0047` y la
[decisión 0048](decisiones/0048-el-pago-con-stripe.md). Richi contestó las siete
preguntas el mismo día: la cuota cambia sola, tarjeta, **siete días** si falla un cobro
(«hay IA y gastos») con un correo cada día, todo en **Ajustes → Suscripción**, **la
prueba pide tarjeta**, solo `ikatz` sin cobrar y **sin pago no hay app**.

#### Lo que se hizo

- **La quinta puerta del despachador** (`porQueNoPasaElPago`): cómo está la cuenta lo
  cuenta el dominio (`comoEstaLaCuenta`) con el estado y la hora, y se cumple en cada
  petición. Sin pagar no pasa nada; en solo lectura, ningún comando. Lo que pasa sin
  pagar lo declara la operación (`sinPagar`) y una prueba tasa la lista.
- **Stripe, sin librería y con su versión fija** (`infraestructura/stripe.ts`): Checkout
  para pagar, el portal para la tarjeta y las facturas, y el catálogo —productos,
  precios, 21 % de IVA incluido, portal y aviso— creado por el código la primera vez. El
  aviso se comprueba por su firma, se apunta una vez, y **se vuelve a leer la
  suscripción a Stripe** en vez de creerse lo que trae.
- **El reloj de la 0016, por fin** (`reloj.ts`): `pg_cron` llama cada hora con un secreto
  que genera la migración; una vez al día, los correos del impago y del fin de prueba, y
  cuadrar los locales con Stripe.
- **La app:** Elegir plan paga de verdad; la vuelta de Stripe confirma y entra sola;
  **Ajustes → Suscripción**; el aviso de arriba con los días que quedan; crear un local
  dice antes cuánto sumará. **El admin**, su pestaña **Cuentas**.
- **Lo legal:** condiciones y privacidad al día, y «Cómo funciona el pago» plegado en la
  app. La portada y crear cuenta dejan de prometer una prueba «sin tarjeta».

#### Lo que se torció por el camino

- **La sesión sin local al pagar** (lección 115): lo cazó la batería del pago.
- **Una ruta que tapaba a todas** (lección 114): lo cazó `api.prueba.ts`.
- **La dueña de una cadena no habría visto su suscripción**: los permisos de la app se
  resuelven sobre el local, y en la vista de cadena no hay local. «Plan y facturación»
  se lee ahora de la organización (`cuenta.laLlevo`).
- **La firma de los avisos caducaba en las pruebas**: el Stripe de mentira firmaba con la
  hora de verdad y la prueba movía el reloj. Los cinco minutos de margen hacían su
  trabajo; el de mentira firma ahora con la hora de quien lo usa.

Las pruebas: `suscripcion.prueba.ts` (dominio), `stripe.prueba.ts` (la firma, el
formulario y la traducción), `el-pago.prueba.ts` contra la base, las rutas en
`api.prueba.ts` y `el-pago.spec.ts` en pantalla. Lecciones 114 y 115.

### Antes de M8 · el repaso del 25 de septiembre

_25 de septiembre de 2026._ Con la migración `0048` y la
[decisión 0049](decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md). Lo que
Richi vio al mirar E2, siete puntos, y contestó las cuatro preguntas con la recomendada.

#### Lo que se hizo

- **Almacén e Inventario.** La app «Inventario» es **Almacén** y la vista «Recuento» es
  **Inventario**, en pantallas, direcciones, permiso, código y documentos vivos. El
  permiso cambia en la base leyendo sus 23 políticas, y las direcciones de antes llevan a
  las nuevas.
- **Lo congelado va aparte**: no avisa por caducidad sino por lo que lleva en el
  congelador (tres meses si nadie lo cambia en la ficha), una semana antes y el día que se
  cumple; congelar ya no pregunta la caducidad.
- **El alta pide el mínimo**, y la unidad del campo se toca para elegir kg o g (una pieza
  nueva del sistema de diseño).
- **El Tablón** en el Panel: notas del equipo para todos o para cocina o sala, con hora si
  la tienen (sale en «Hoy» y en el Calendario), «Leído», y quién la ha leído y quién falta.
- **La carta subida**: el PDF o las fotos de la carta del local, pasadas a páginas en el
  navegador, vistas antes de publicar y enseñadas por su QR. El diseño de plato, ficha
  técnica y escandallo, escrito en el Plan para M9 y M10.
- **Los dos fallos del iPhone**: «Hoy» que no salía (`:has(:empty)`, lección 116) y la
  barra que se quedaba a media pantalla (el visor tras el teclado, lección 117).

#### Lo que se torció por el camino

- **Siete locales sin categorías** al renombrar una semilla (lección 118): lo cazó la
  prueba de migraciones.
- **Las pruebas buscaban «inven»** para llegar a la app: con el nombre nuevo, el
  buscador encuentra «Almacén» por «alma», y «Hacer inventario» por «inven».

Las pruebas: `el-repaso-del-25-sep.prueba.ts` contra la base (Almacén, congelado, Tablón
y carta), `congelado.prueba.ts` y `hoy.prueba.ts` del dominio, `anclaAbajo.prueba.ts`,
`sin-has.prueba.ts` y `direccionesViejas.prueba.ts`, y `el-repaso-del-25-sep.spec.ts` en
pantalla. Lecciones 116 a 119.

### Antes de M8 · L, el lector, adelantada

_25 de septiembre de 2026._ Sin migración. Richi pidió «Escanear producto» junto a
«Añadir producto» y eligió adelantar la entrega entera.

- **La cámara**: el lector del navegador donde lo hay (Android, Chrome) y ZXing en
  WebAssembly en el iPhone, descargado solo al abrir el lector y servido desde Estook. La
  política de seguridad lleva `'wasm-unsafe-eval'`, que solo deja compilar WebAssembly.
- **Los lectores de mano**, reconocidos por su velocidad, sin configurar nada.
- **Productos** abre la ficha o el alta con el código y la propuesta de Open Food Facts;
  **el inventario** suma uno por lectura; **recibir** marca la línea.

Las pruebas: `codigos.prueba.ts` y `el-lector.spec.ts`. La cámara de verdad no se puede
probar en un navegador de pruebas: la mira Richi en su móvil.

### Cambio de rumbo · Estook también cobra

_20 de septiembre de 2026. La dirección está en la Evolución 1.1, capítulo 19._

Estook deja de ser «no cobro y no facturo». El local elige entre **cobrar con Estook**
—el TPV propio: sala, cocina, cobro, caja, tickets y facturas con VeriFactu—, **lo
trae mi TPV** o **lo apunto yo**. Con eso Estook pasa a ser **fabricante de un sistema
informático de facturación** en España.

**Dos cosas que hay que tener claras para no equivocarse de trabajo:**

- **Esto no rehace nada.** M0 a M17 se quedan como están: mismo repositorio, mismo
  dominio, misma API, misma base de datos y mismo despliegue.
- **Esto no es lo de ahora.** El TPV es la **Fase 4**, trece módulos por delante. Lo
  de ahora sigue siendo **«Antes de M8»**: E2, las veinte mejoras y el panel de
  administración.

#### Lo único que se ha tocado de código, y por qué

**El Plan 1.2 cambió la tabla de vistas de B5, y eso es código.** La prueba de
navegación **lee esa tabla del fichero del Plan**, así que poner el Plan nuevo en su
sitio puso la integración en rojo al momento. Eso es la prueba haciendo su trabajo.

| Qué dice ahora B5                                   | Qué se ha hecho                                                                                                                                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Servicio · Jornada`: **En marcha · Caja · Cierre** | **Caja** entra en el catálogo marcada como **M20C**. Es la caja del TPV —fondo, entradas y salidas, arqueo—, que **no es lo mismo que «Cierre»**: el cierre es el resumen del día, y con el TPV propio se rellena solo desde la caja (Anexo 5.5) |
| `Servicio · Ventas`: gana **Tickets y facturas**    | Entra marcada como **M20C**. Solo existe si el local cobra con Estook: es lo que ha emitido su propio sistema, con su estado ante Hacienda                                                                                                       |
| El orden pasa a ser el de un día                    | **Se respeta tal cual**, y a cambio se arregla lo de abajo                                                                                                                                                                                       |

**Y el fallo de fondo que eso destapó.** Se entraba a un destino por `vistas[0]`, la
primera de la tabla. Pero las tablas del Plan están escritas **en el orden en el que se
entienden**, no en el que se construyen: con el orden nuevo, abrir Servicio habría caído
en «En marcha», que es M16, y **el cierre de caja de M6½ —lo único que funciona ahí—
habría quedado detrás de un cartel de «todavía no»**. Es la pestaña muerta de B5 un piso
más abajo.

Ahora se entra por **`dondeEntraEnElDestino`: la primera vista construida**, y si no hay
ninguna, la primera. Lo usan `rutaDe` y la pantalla, **la misma función en los dos**,
porque dos sitios decidiendo lo mismo acaban decidiendo distinto. Está escrito en B5 del
Plan, que no decía nada de esto, y tiene tres pruebas.

Una vista pendiente **se sigue enseñando** en el control segmentado, apagada y con su
módulo al lado. Ahí no le quita el sitio a nadie y contesta «¿y la caja, dónde está?»
antes de que nadie la busque.

**Nada de esto adelanta el TPV.** Son dos pastillas apagadas que dicen «M20C».

#### Lo que se ha corregido de los documentos

- **Anexo 1.4**, reescrito con la [0043](decisiones/0043-hasta-donde-llega-la-facturacion.md), y **4.3 y las pruebas 18 y 19 puestas de acuerdo con él**: decían que Canarias no podía activar el módulo.
- **Anexo 4.5, 4.6, 4.7 y 4.14**, con las respuestas comprobadas y su fuente.
- **Plan A4** decía «los cinco documentos» cuando ya son seis.
- **El mapa de módulos** decía «el módulo 22 de 36» y «M7, a medias». Ahora dice lo que es, y dice que mandan el Plan y este fichero.
- Líneas duplicadas en el Anexo 3.7 y en la tabla de Roles 1.12.

El repaso del esquema y del código contra el Anexo está hecho y escrito en
**[`docs/lo-que-el-tpv-toca-de-lo-construido.md`](lo-que-el-tpv-toca-de-lo-construido.md)**:
qué hay que ampliar del cierre de caja, del motor fiscal y de los permisos, y las dos
cosas que hay que **decidir antes de escribir la primera pantalla de Sala**.

#### Las reglas duras de esta parte

1. **Web, una sola base de código.** El TPV va **dentro de `apps/app`** como modo de
   pantalla, no en una aplicación aparte. `apps/movil` es una cáscara de Capacitor
   **sin pantallas propias**, opcional, y llega en M20A. Razonado en A5 del Plan:
   **no se reabre**.
2. **La facturación es intocable.** Un ticket o una factura emitidos no se editan ni
   se borran jamás, desde ningún sitio. Se corrigen con otro documento. Viven en su
   propio esquema, **solo de inserción**, y solo los escribe su módulo (regla 15 de
   A1; principio 17 del Manifiesto).
3. **Estook no toca el dinero.** La tarjeta la cobra el datáfono del banco del local.
4. **No calculamos huellas ni encadenamos registros.** Eso lo hace el proveedor
   (Verifacti). Si aparece un SHA-256 de un registro de facturación en nuestro código,
   es una segunda cadena y está mal.
5. **Nada de facturación llega a producción** sin las siete condiciones del capítulo 9
   del Anexo.
6. **La impresión no se ata a una marca.** El núcleo solo deja trabajos en una cola,
   en un formato intermedio propio. Una marca nueva es un traductor nuevo, no tocar el
   núcleo (capítulo 6 del Anexo).
7. **No se inventa ni un campo ni un endpoint.** Ni de Verifacti, ni de la AEAT, ni de
   Revo, ni de Last.app. Primero la documentación oficial vigente; hasta entonces,
   esqueleto con `TODO` y adaptador simulado con el que se pueda probar todo lo demás.

#### Los [VERIFICAR] · lo comprobado el 20 de septiembre de 2026

**Eran nueve.** **Cuatro los he podido comprobar yo contra la fuente oficial y están
resueltos dentro del propio Anexo**, con su enlace: el límite de la factura
simplificada, qué rectificativa toca, los campos de la declaración responsable y los
territorios. Los otros cinco dependen del asesor, de una compra o de que se publique un
BOE, y están abajo. El resumen, más la comprobación del QR y la del proveedor:

| Qué                                                   | Respuesta                                                                                                                                                                                                                                                                                  | Fuente                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Límite de la factura simplificada en restauración** | **3.000 €, IVA incluido.** El general es 400 € (art. 4.1); el art. 4.2.e) lo sube a 3.000 € para hostelería «para consumir en el acto». Anexo 4.6                                                                                                                                          | [RD 1619/2012, art. 4 · BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696)                                                                                                          |
| **Qué rectificativa toca**                            | **R5** para el ticket. **R1** por error fundado en derecho (art. 80.Uno, Dos y Seis LIVA) sobre factura completa; R2 concurso y R3 incobrables **no se programan**; R4, el resto. Anexo 4.5                                                                                                | [AEAT · procedimientos de facturación](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/procedimientos-facturacion.html)      |
| **Campos de la declaración responsable**              | **Orden HAC/1177/2024, cap. IV, art. 15**: doce datos, y **dentro de la app, legible e individualizada, accesible de forma rápida, fácil e intuitiva**. Escritos uno a uno en el Anexo 4.14                                                                                                | [Orden HAC/1177/2024, art. 15 · BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138)                                                                                                  |
| **El QR**                                             | **Art. 21**: nivel M, 30×30 a 40×40 mm, cinco datos y su leyenda. **Coincide exactamente** con lo que ya decía el Anexo 4.7                                                                                                                                                                | [Orden HAC/1177/2024, art. 21 · BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138)                                                                                                  |
| **Territorios**                                       | **Canarias, Ceuta y Melilla están dentro del ámbito legal.** País Vasco y Navarra, fuera (foral). SII, excluido. La fecha del fabricante, **29 de julio de 2025**, vencida                                                                                                                 | [AEAT · ámbitos de aplicación](https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/preguntas-frecuentes/cuestiones-generales-ambitos-aplicacion.html) |
| **Verifacti**                                         | Clave **por NIF y entorno**; `POST /verifactu/create` devuelve el **QR en base 64**; `GET /verifactu/status`; `POST /nifs` da de alta la empresa; **huella y cadena, del proveedor**; los registros se encolan y salen en dos minutos como mucho; webhooks recomendados frente a consultar | [Verifacti · guía rápida](https://www.verifacti.com/es/guia-rapida)                                                                                                                          |

**Y dos hallazgos del repaso, ya metidos en el Anexo:**

- **Faltaba la naturaleza de la rectificación** —`S` por sustitución o `I` por
  diferencias—, que VeriFactu exige junto a la clave R. Está escrito en el Anexo 4.5,
  con su `[VERIFICAR]`: cuál toca lo dice el asesor, y **el nombre del campo se lee de
  la API del proveedor, no se inventa**.
- **Canarias, Ceuta y Melilla se bloqueaban con un motivo falso.** Decidido en la
  [0043](decisiones/0043-hasta-donde-llega-la-facturacion.md): **Canarias entra
  con IGIC** —el esquema y el motor fiscal ya lo soportan desde la `0012`—, **Ceuta y
  Melilla esperan** por el IPSI y su categoría de establecimiento, y la pantalla
  distingue «no se puede» de «todavía no». El Anexo 1.4 está reescrito.

#### Lo que queda, y de quién es

**Del asesor fiscal** —y hasta que conteste, no se programa ninguna:

1. **El tipo de IVA del servicio de restauración**, y el de «para llevar» y reparto.
2. **El IGIC de hostelería**, ahora que Canarias entra.
3. **`S` o `I`** en la rectificativa de una devolución, y **R1 frente a R4** en una
   factura completa.
4. **El texto exacto del justificante provisional** de venta sin conexión.
5. **Las propinas:** si la de efectivo puede quedarse fuera del ticket.
6. **Si el límite de 3.000 € vale también para el reparto a domicilio**, que la ley
   describe como «para consumir en el acto».
7. **La declaración responsable de Estook**, redactada y firmada.
8. **La revisión escrita del planteamiento entero**, que es condición 4 del capítulo 9
   del Anexo.

**De Richi, y no hace falta todavía:** las claves de Verifacti. Cómo se sacan y cuándo
se piden está en `ESTADO.md`, en **«Lo que es de Richi»**. Y el
precio real de una impresora que pregunta sola (Anexo 6.3), al comprarla.

**Y uno que ya está resuelto: el precio de Verifacti.** Llegó su propuesta el 21 de
septiembre: **por NIF activo en producción**, de 5,59 € con diez a 3,71 € con cincuenta,
sin IVA, con 3.000 facturas al mes por NIF incluidas. Las cuentas salen y **el TPV cabe
en Pro sin subir el precio**; queda **una pregunta para ellos: qué se paga con menos de
diez NIF**. Todo, en
[`docs/el-precio-de-verifacti.md`](el-precio-de-verifacti.md). **La propuesta
caduca hacia el 19 de octubre.**

**Y uno que no depende de nadie de aquí:** el **[VERIFICAR] del registro horario**
(Plan, M15). El Real Decreto de fichaje digital sigue **en tramitación y sin publicar
en el BOE** a día de hoy, así que no obliga. Cuando se publique hay que mirar el
formato exacto de la exportación para la Inspección y si exige una API. **Hasta
entonces se hace la exportación y no se inventa ningún protocolo.**

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
[`docs/repaso-despues-de-m4.md`](repaso-despues-de-m4.md). Lo que hay que
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
