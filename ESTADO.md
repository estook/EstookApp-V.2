# ESTADO DEL PROYECTO

Última actualización: 10 de septiembre de 2026 · M6½ cerrado y comprobado · **listo para M7**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> Aquí está lo que hace falta para trabajar hoy. **Lo que hizo cada módulo, con sus
> fallos y sus porqués, está entero en
> [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)**, y las
> razones de fondo, en [`docs/decisiones/`](docs/decisiones/).

---

## 1 · Dónde estamos

|                |                                                                                                                         |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6** ✓ · **M6½** ✓ en seis entregas (#37 a #42): fusionado, migrado, desplegado y mirado en TPV y móvil      |
| **Siguiente**  | **M7** · Proveedores y compras, las entregas en el Calendario y, al final, el local en Google                           |
| **Pruebas**    | 765 unitarias y de base de datos · 327 de pantalla en escritorio y móvil, todas en verde · catálogo **77 de 83** (93 %) |
| **Rama**       | `m7-listo-para-empezar`: solo documentos, las dos decisiones de Richi para M7                                           |
| **Base**       | **30 de 30** aplicadas en Supabase, **44 tablas**, todas con seguridad por filas · leído el 10 de septiembre            |
| **API**        | **Desplegada y al día** · conoce las 25 consultas y los 58 comandos, y los JSON se guardan como objetos                 |
| **Entrar**     | La cuenta de Ricardo, con su negocio (`ikatz`). Ninguna cuenta de ejemplo puede entrar                                  |
| **Dirección**  | **Evolución de producto 1.0**: de aplicación de gestión a sistema operativo del local                                   |

> **M6½ está cerrado, y comprobado en la base de verdad el 10 de septiembre**: el
> Panel ya se guarda (hay uno guardado, del móvil), el GPS del fichaje funciona (un
> fichaje en el local a 47 m con ±5 m de precisión) y ya hay una caja cerrada. Lo
> siguiente es M7, con lo que Richi decidió al cerrar: **sección 8**.

---

## 0 · Los cinco documentos maestros

Viven en [`docs/maestros/`](docs/maestros/) en Markdown; el PDF sale con
`pnpm maestros`. Se leen en este orden:

| Documento                                                                | Qué responde                       | Cuándo se lee            |
| ------------------------------------------------------------------------ | ---------------------------------- | ------------------------ |
| [Evolución 1.0](docs/maestros/Estook-Evolucion-1.0.md)                   | Hacia dónde va y en qué orden      | **Primero, siempre**     |
| [Manifiesto](docs/maestros/Estook-Manifiesto.md)                         | Qué es el producto y cuánto cuesta | Antes de diseñar         |
| [Plan de desarrollo](docs/maestros/Estook-Plan-de-Desarrollo.md)         | Cómo se construye y con qué reglas | Antes de escribir código |
| [Roles y administración](docs/maestros/Estook-Roles-y-Administracion.md) | Qué ve exactamente cada persona    | Antes de tocar permisos  |
| [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)       | Qué desencadena cada cambio        | Antes de cerrar módulo   |

**Si dos parecen decir cosas distintas, manda el más específico.** Si de verdad se
contradicen, se para y se pregunta (regla 13). Y si uno se queda corto frente a lo
que el producto necesita, se propone lo mejor y **se cambia el documento**, con su
decisión escrita: un maestro no frena el producto.

Lo que cambió con la **Evolución 1.0**: el tamaño del paquete se mide y no bloquea
(bloquea la velocidad); cada módulo nace con su capa inteligente dentro; y nada
entra aislado (regla 14: qué datos usa, quién se entera, qué automatiza Fogón y
qué aprueba una persona).

---

## 2 · Qué hay que hacer

### Ahora mismo

1. **Fusionar `m7-listo-para-empezar`**: solo documentos —las dos decisiones de
   abajo, escritas en el Plan, el Manifiesto, Roles y la Auditoría—.
2. **Empezar M7 en un chat nuevo**, con la sección 8 como punto de partida.

### Lo que Richi decidió al cerrar M6½

- **Google, al final de M7**: Places y Business Profile, «para verlo todo», con la
  API de Places **bien acotada** y **actualizándose sola al acabar el día**
  ([0030](docs/decisiones/0030-el-local-se-situa-con-google.md)).
- **Las entregas y las caducidades son eventos del Calendario**, «para que lo sepa
  la gente», y **los avisos se publican eligiendo qué roles los ven**. Un calendario
  completo, «que quede bien sin pasarse» ([0031](docs/decisiones/0031-el-calendario-recoge-lo-de-todos.md)).

### Lo que M6½ deja preparado, y dónde se termina

Lo que Richi pidió «a futuro» tiene ya su sitio, sus datos y su documento:

| Qué                                                                        | Dónde se termina  | Qué hay ya                                            |
| -------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- |
| Avisos «mañana entras a las 9» y «entras en 5 minutos, ficha ya», por push | **M25**           | El horario de siempre; el widget ya lo dice           |
| Fichar solo desde aparatos del local, modo quiosco con PIN                 | **M15**           | Fichar con ubicación, correcciones                    |
| Lo planificado contra lo fichado                                           | **M14**           | Las horas fichadas frente al contrato                 |
| La foto de la merma y del Z, leídas por Fogón                              | **M22**           | Los botones puestos y apagados, diciéndolo            |
| El parte de mermas con el logo, en PDF                                     | **M11**           | CSV e «Imprimir o PDF» sin barras                     |
| Descontar lo vendido del inventario                                        | **M20**           | El cierre guarda los platos con el nombre normalizado |
| Conectar el TPV                                                            | **M18** y **M19** | La pregunta contestada y el TPV elegido               |
| El recuento, la desviación y la calibración del aprovechamiento            | **M8**            | La merma con motivo; el aprovechamiento «sin medir»   |

### Lo que sigue sin decidirse · es de Richi

1. **Si Fogón habla antes de M22.** Tiene su sitio y su contexto; le falta la voz,
   que necesita elegir modelo, presupuesto diario por local y caché.
2. **Si se quitan de la API `mis_locales`, `mis_permisos` y `un_local`**, que
   `quien_soy` dejó sin trabajo en M4.

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No existe un dato único:
dependen del bien y de la operación. Cuando aparezcan se añaden como filas; hasta
entonces el motor dice «sin regla» y para ([0006](docs/decisiones/0006-el-motor-fiscal.md)).

### Sin prisa

| Qué                                                                   | Cuándo                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                              |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                            |
| Google Places y Business Profile                                      | **final de M7** ([0030](docs/decisiones/0030-el-local-se-situa-con-google.md)) |
| Volver a `BrowserRouter` cuando haya `estook.com`                     | con dominio ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md))         |
| El vectorial del logotipo y de Fogón                                  | cuando aparezcan; se sustituyen en un sitio                                    |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
(el catálogo del sistema de diseño está en `/admin/`).

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito, por el agrupador de sesión (la conexión directa de los proyectos nuevos
solo va por IPv6). **29 de 29 migraciones** y 44 tablas, todas con seguridad por
filas; la única vista es `estook.existencias`. Leído el 10 de septiembre. Se
comprueba con `.\estook.cmd bd:comprobar`, que lo lee de la base y no de aquí.

**Organizaciones:** `bar-centro`, `casa-lola` y `grupo-costa` son semillas de
ejemplo, **con las cuentas cerradas desde el 3 de septiembre** —tenían una
contraseña publicada en este repositorio—. **`ikatz` es el negocio de verdad**.

**Errores:** `estook-app` en Sentry, solo «Error monitoring», con el repositorio
enlazado. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; en
Secrets, `TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. Todo en
[`config/claves.md`](config/claves.md).

**El peso**, medido con `pnpm tamano` el 10 de septiembre:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | **257,8 KB** | 106,1 KB                 |
| `admin`         | 186,1 KB     | 106,1 KB                 |
| `web` · `carta` | 165,8 KB     | 106,1 KB                 |

La referencia es 250 y **se mide, no bloquea**: `app` va 7,8 KB por encima tras
M6½. **Lo que viene tiene que cargarse aparte desde el principio** —cada destino
nuevo, bajo demanda—, que es como ya van la ficha de producto, el libro, Mermas, el
cierre y Ventas.

---

## 4 · Qué hizo cada módulo

En una línea. **El detalle está en
[`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md).**

| Módulo  | Qué dejó                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------ |
| **M0**  | Monorepo, reglas, integración continua con el candado de `main`, publicación en GitHub Pages     |
| **M1**  | Alcances, roles y permisos en la base, con seguridad por filas en cada tabla                     |
| **M2**  | La API (Hono), el despachador de comandos y consultas, los motores de dinero, fechas e impuestos |
| **M3**  | El sistema de diseño, el esqueleto de las ocho apps, la rueda y el buscador universal            |
| **M4**  | El login propio, PIN, segundo factor, sesiones y el primer despliegue de verdad                  |
| **M5**  | El alta en ocho pasos, el catálogo de referencia, los ejemplos y el modo demostración            |
| **M6**  | Inventario: productos, el libro de movimientos, precio medio ponderado, lotes, previsión         |
| **M6½** | La capa de producto, en cuatro entregas: abajo                                                   |

### M6½ · la capa de producto

**No estaba en el Plan.** Es la pausa que pidió Richi antes de M7: «la idea está
genial pero le falta orden, utilidad y profundidad». Ahora tiene su ficha en el
Plan.

1. **Primera entrega (#37)** · destinos y vistas en cada app ([0018](docs/decisiones/0018-destinos-y-vistas.md)),
   el Panel de cada uno en el servidor ([0019](docs/decisiones/0019-el-panel-de-cada-uno-vive-en-el-servidor.md)),
   el catálogo de acciones ([0020](docs/decisiones/0020-un-catalogo-de-acciones.md)) y el libro de movimientos a la vista.
2. **Segunda (#38)** · lo que se perdía al recargar, las barras y el alta de producto
   por unidad ([0021](docs/decisiones/0021-el-producto-se-mide-en-una-unidad.md)).
3. **Tercera (#39)** · la auditoría de infraestructura, el color del local y el modo
   oscuro ([0024](docs/decisiones/0024-el-color-del-local-pinta-la-app.md)).
4. **Cuarta (#40)** · la lista de trece cosas de Richi:
   - **El Panel que se deshacía al recargar**: un guardado fallaba en silencio y se
     quedaba atascado. Ahora avisa en rojo y deja reintentar; «Acciones rápidas»
     se puede volver a poner.
   - **Fichar con ubicación, sin bloquear nunca**; la ficha de cada persona con sus
     horas, lo que cobra en privado y su horario; el Resumen de horas por quien
     lleva a quién ([0025](docs/decisiones/0025-fichar-pide-donde-y-no-bloquea.md)).
   - **La merma con motivo y partida**, en tres toques y también desde la sala;
     Mermas con totales, CSV e impresión ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
   - **El cierre de caja a mano o con CSV**, la pregunta de cómo entran las ventas
     —al final del alta, en el Panel y en Ajustes— y Negocio › Ventas ([0027](docs/decisiones/0027-la-caja-se-cierra-sin-tpv.md)).
   - **El alta de producto con lo que hay**, sin «cuánto se aprovecha», y el + y el
     − en cada producto ([0028](docs/decisiones/0028-el-alta-pregunta-cuanto-hay.md)).
   - **La rueda** con el Panel en el centro, abajo y sin botón de cerrar; **Equipo ›
     Personas** con «Acceso» en un desplegable y «última vez»; **Fogón, Ajustes e
     Inventario** sin los párrafos que explicaban lo evidente.
5. **Quinta (#41)** · las pruebas del Panel, todas en un solo bloque y en un solo
   navegador de móvil, porque dos a la vez se pisaban.
6. **Sexta, la de hoy, sin fusionar** · lo que vio Richi en el TPV:
   - **El Panel no se guardaba nunca en producción**: los JSON se guardaban
     envueltos en un texto ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md)).
   - **El primer fichaje salió «sin señal»**: el rato de pulsar «Permitir» contaba
     como espera. Ya no, y sin GPS se usa la posición de la wifi.
   - **Las ventanas del ordenador**, en el centro y con ancho de formulario.
   - **La ficha de producto**, en bloques, y el valor de lo que entró sin coste, a
     su precio de hoy.
   - **El importe de cada plato del cierre**, propuesto con el de la última vez.
   - **Google para situar el local**, escrito y propuesto ([0030](docs/decisiones/0030-el-local-se-situa-con-google.md)).

**Lo que encontraron las pruebas nuevas, y no ninguna de las viejas:**

- A una **camarera** le decía «ese producto no está» al apuntar una merma: el
  candado del producto exigía permiso de editarlo. Ahora es un candado de
  transacción que no mira permisos.
- **Corregir solo la entrada de un fichaje le borraba la salida**, y cerrar el turno
  que alguien olvidó **era imposible**: la base exigía una ubicación que quien
  corrige no tiene.
- En el móvil, **cada fila de una tabla era un botón con otro botón dentro** —el
  «Acceso» de cada persona, el + y el − de cada producto—.

**Y lo que no encontró ninguna prueba, y sí mirar la base de verdad:** en
producción no había **ni un Panel guardado**. El conductor de Postgres de
producción convierte a JSON lo que va a una columna JSON, el código ya se lo daba
convertido, y se guardaba envuelto en un texto; en las pruebas, con PGlite, no
pasa. Se reprodujo contra la base de verdad dentro de una transacción deshecha.

---

## 5 · Cómo trabajamos

**Los comandos, con `.\estook.cmd`**, uno por recuadro: PowerShell no entiende
`&&`, y una ventana abierta antes de instalar `pnpm` no lo encuentra.

1. **Primero fusionar, después aplicar a Supabase.** La base nunca va por delante
   del código.
2. **«Terminado» solo si no quedan preguntas abiertas.**
3. **Una rama por entrega, y un pull request.** Nada entra en `main` sin él.
4. **Ante la duda, preguntar**, y preguntar explicado.
5. **Revisar lo propio antes de entregarlo**, y que esto no afirme nada falso.
6. **Un repaso después de fusionar vale la pena**: casi todos los fallos que
   quedaban eran algo construido y probado al que no llegaba nadie desde la pantalla.
7. **Si se toca una pantalla, `prueba:e2e:completa`.** `prueba:e2e` a secas prueba
   lo ya construido.
8. **Si el rojo es del servidor, mirar el puerto 5177**: Playwright reutiliza una
   API de pruebas viva con el código viejo.
9. **Una lección se convierte en prueba.** Escrita en un documento no impide nada.
10. **Una consulta que ninguna prueba llama es una consulta rota que aún no se sabe
    que lo está.** `pnpm cobertura` lo mide corriendo.
11. **Una excepción con una razón bonita sigue siendo un agujero.** Las listas de
    deuda sirven para no olvidar, no para justificar.
12. **Lo que no se mide, no está probado.** Contar nombres con `grep` no mide nada.
13. **Antes de mandar a alguien a hacer algo, comprobar que no está hecho ya.**
14. **`toBeVisible()` no ve el recorte.** Para saber si algo se ve, se pregunta al
    navegador qué hay en ese punto (`seVeDeVerdad`).
15. **Una prueba que compara el código con una copia del documento no compara
    nada.** `apps.prueba.ts` lee la tabla B5 del Plan.
16. **Un dato con dos dueños acaba con dos valores**, aunque sea una frase.
17. **Un andamio de pruebas no va en una pantalla de verdad.**
18. **Lo que toca un estado compartido, en un bloque, de una en una**, y ningún
    otro fichero tocándolo. **Y en un solo navegador de móvil**: el móvil pequeño y
    Safari comparten el Panel del móvil, y en la integración continua corren a la
    vez. Una prueba nueva del Panel con Rosa salió «flaky» por eso al fusionar la #40.
    Y no vale buscar «una cuenta que no toca nadie»: se probó con Luis, y otra prueba
    le añadía un segundo local, así que dejaba de entrar directo a su Panel.
19. **Guardar tarde es perder.** El retraso solo donde hay ráfaga; lo pendiente se
    manda al irse.
20. **Una sola cosa pinta la pantalla**: lo que se guarda se escribe en la caché.
21. **Se arregla lo que se ha visto**, no lo que uno deduce. Antes de quitar de
    más, se pregunta.
22. **Lo que salió en un iPhone se prueba con `CON_WEBKIT=1`.**
23. **Una prueba hace lo que hace una persona**: tocar algo e irse.
24. **Un rojo que no habla de lo probado casi nunca es del producto**: primero,
    quién sirve las pruebas.
25. **Una comprobación que hace dos cosas sin decirlo se lleva la segunda por
    delante.** Se escriben aparte.
26. **Lo que protege el dato y lo que lo enseña son dos capas**, y se prueban las dos.
27. **Una prueba nueva hay que verla fallar** con el arreglo quitado.
28. **El texto se escribe cuando el comportamiento existe.** Mientras, se dice lo
    que pasa.
29. **Cumplir el contraste no hace una buena pantalla**: se mira en el aparato.
30. **Un color que alguien elige se ajusta y se pinta**, y se le dice.
31. **Lo que una aplicación no elige, no se elige por ella.**
32. **Un tema se hace en las fichas, nunca en las pantallas.**
33. **Un permiso sin pantalla es una promesa rota.** Merma y fichar llevaban desde M1
    en la matriz sin dónde hacerse.
34. **Guardar sin decir que ha fallado es peor que no guardar.**
35. **Se prueba con el rol más pequeño que puede hacerlo.** La merma de la camarera
    solo falló entrando como ella.
36. **Una restricción de la base se prueba con el caso normal, no solo con el
    malo.** «Toda salida dice dónde» era correcta y dejaba sin cerrar el turno que
    alguien olvidó, que es lo más normal de corregir.
37. **Después de desplegar, se mira la base de verdad.** Cero paneles guardados en
    producción con todo en verde: el conductor de las pruebas no es el de
    producción. Lo que dependa del conductor se escribe para que dé igual
    (`::text::jsonb`), y `bd:comprobar-api` lo mira en Supabase.

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/), una por fichero:

| Núm      | Qué                                                                 |
| -------- | ------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify                                      |
| **0002** | La API en Hono sobre Supabase Edge Functions                        |
| **0003** | M0 crea el esqueleto mínimo de alcances                             |
| **0004** | El presupuesto de velocidad de B7, reconstruido                     |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción   |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                   |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta   |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages   |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`    |
| **0010** | El login es nuestro, no de Supabase Auth                            |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad          |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                 |
| **0013** | Google Places se aplaza a M23                                       |
| **0014** | Un módulo reacciona a otro en la misma transacción                  |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app         |
| **0016** | El reloj es `pg_cron` llamando a nuestra API                        |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push               |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                  |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato     |
| **0020** | Un catálogo de acciones, y una acción es una dirección              |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha     |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero     |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor   |
| **0024** | El color del local pinta la app, y hay dos temas                    |
| **0025** | **Fichar pide dónde, y no bloquea nunca**                           |
| **0026** | **La merma tiene motivo y partida, y la apunta quien la rompe**     |
| **0027** | **La caja se cierra sin TPV, y los dos caminos acaban en el mismo** |
| **0028** | **El alta de producto pregunta cuánto hay, no cuánto se aprovecha** |
| **0029** | **Lo que va a una columna JSON viaja como texto**                   |
| **0030** | **El local se sitúa con Google** · el cuándo, pendiente de Richi    |

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base.** Una prueba cuadra los dos catálogos.
- **Las funciones de visibilidad son `security definer`**, o `membresia` entra en
  recursión consigo misma. No se usa `force row level security`: rompería las semillas.
- **Sesión y correlación son cosas distintas**: una visita y una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usar…`) y viven en `ganchos/`.
- **El token va en `Authorization: Bearer`**, no en una cookie: la aplicación y la
  API viven en dominios distintos.
- **Dependencias nuevas justificadas:** `@electric-sql/pglite`, solo de desarrollo.
  Contraseñas, segundo factor y tokens van con `crypto.subtle`.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/migrar.mjs` ·
  `.dependency-cruiser.cjs` · las reglas 9 y 10 de `eslint.config.js` ·
  `herramientas/comprueba-publicacion.mjs`.
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`), que son B1.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`,
  `packages/ui/fuentes/` y los PNG de `packages/ui/marca/`.
- **Las migraciones `0001` a `0030`.** Se amplían con una `0031`, nunca se editan
  (regla 2). Y al ampliar una función SQL, **se copia la original entera**.
- **Lo que va a una columna JSON se escribe `${…}::text::jsonb`**, nunca `::jsonb` a
  secas: en producción se guardaría envuelto. Una prueba lo vigila ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md)).
- **El libro de movimientos.** Solo se añade; un movimiento equivocado se enmienda
  con otro. `estook.existencias` es **una vista**. Todo lo que mueve género pasa
  por `apuntar`, y **el candado de apuntar es `pg_advisory_xact_lock`**: volver a
  `for update` vuelve a dejar sin merma a la sala ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
- **La aritmética vive en `packages/dominio`**: inventario, merma, equipo y cierre.
  Ni un disparador suma stock ni pondera precios (regla 6).
- **Quién ve las horas de quién lo decide `estook.a_quien_lleva`**, en la base. Las
  consultas no filtran por su cuenta ([0025](docs/decisiones/0025-fichar-pide-donde-y-no-bloquea.md)).
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`, cuyas tablas se
  cambian en B5 del Plan primero), el de widgets (`packages/ui/src/panel/catalogo.ts`)
  y el de acciones (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración, no desde la
  aplicación.
- **Las diecisiete funciones `security definer`.** Son la puerta de atrás del
  sistema y están tasadas: una prueba las cuenta, y la última es `a_quien_lleva`.

Sobre el candado de `main`: las comprobaciones obligatorias van **sin tilde** —
`Calidad`, `Construccion y presupuestos`, `Migraciones reversibles`—. **Nunca
añadir `Construir` ni `Publicar`**: ese flujo solo corre después de fusionar.

---

## 8 · El siguiente paso · M7

### Cómo arrancar el chat nuevo

1. **Leer, en este orden**: este fichero entero; la ficha de **M7** en el
   [Plan](docs/maestros/Estook-Plan-de-Desarrollo.md); las decisiones
   [0030](docs/decisiones/0030-el-local-se-situa-con-google.md) —Google— y
   [0031](docs/decisiones/0031-el-calendario-recoge-lo-de-todos.md) —Calendario—;
   y la [0014](docs/decisiones/0014-las-reacciones-entre-modulos.md), porque las
   entregas se publican con una reacción.
2. **Comprobar que se parte de lo bueno**: la rama al día con `main`,
   `.\estook.cmd verifica` en verde, y `.\estook.cmd bd:comprobar-api` diciendo 30
   migraciones, las 83 operaciones conocidas y los JSON como objetos.
3. **Pedirle a Richi, lo primero**, lo que tarda en llegar: **solicitar el acceso a
   las API de Google Business Profile** con la cuenta de Google que gestiona la
   ficha del local, y **una clave de Google Cloud con facturación** para Places. Sin
   eso, el último bloque de M7 no se puede probar de verdad.
4. **Crear la rama de M7** y empezar por el modelo de datos, que es lo que decide
   todo lo demás.

### M7 · Proveedores y compras, las entregas en el Calendario y el local en Google

**Proveedores y compras.** M6 le deja la ficha corta del proveedor y M7 la completa;
M6½ le deja el sitio: pedidos y facturas son **vistas del destino «Compras»** de
Inventario, declaradas con su `M7`. **M7 no toca la navegación.**

**Entra.** Ficha con días de reparto y pedido mínimo · contratos marco · el ciclo
`borrador → enviado → recibido` · sugerencia que respeta el calendario de reparto y
el mínimo del proveedor · envío por WhatsApp, correo y PDF · recepción con «¿entero
o con cambios?» · factura conciliada con sus albaranes · abonos y devoluciones.

**Y su capa inteligente.** La sugerencia de pedido **con su motivo escrito** —que M6
ya calcula— respetando los días de reparto, y la comparación entre proveedores.

**Y lo que Richi añadió al cerrar M6½:**

- **Las entregas, en el Calendario** ([0031](docs/decisiones/0031-el-calendario-recoge-lo-de-todos.md)).
  La tabla `estook.evento_de_calendario` con su capa, su origen, su local, cuándo,
  qué dice y **qué roles lo ven** —filtrado por la base—. M7 publica las entregas
  —días de reparto y pedidos con fecha— y las caducidades de los lotes, con una
  reacción y una migración que pone las que ya hay. Y el widget del Panel **«Lo que
  viene»**, con hoy y mañana. Las pantallas del Calendario y los avisos con roles
  son de M14, que pinta lo que ya se publica.
- **El reloj**: `pg_cron` llamando a nuestra API ([0016](docs/decisiones/0016-el-reloj-es-pg-cron-llamando-a-la-api.md)),
  que **se monta aquí** y no en M8. De paso vacía la bandeja de eventos y limpia la
  idempotencia caducada.
- **El último bloque: «El local en Google»** ([0030](docs/decisiones/0030-el-local-se-situa-con-google.md)).
  Places en el alta y en Ajustes, con la posición como centro del radio de fichaje;
  Business Profile para leer las reseñas; **actualización automática una vez al
  día**, al cerrar la jornada de cada local; y **el tope de gasto**: Google solo se
  llama al elegir el local y al cerrar el día, con un contador por local y día y
  otro del proyecto, y todo por nuestra API.

**Terminado cuando.** Un pedido recorre el ciclo, el inventario cuadra, el precio
nuevo ya está repercutido, y una factura con tres albaranes y una diferencia sale
conciliada con esa diferencia señalada. **Y además**: las entregas de la semana salen
en el Panel; al elegir el local en el alta se guardan su ficha y su posición; y al
cerrar el día la ficha y las reseñas se actualizan solas, con el contador de llamadas
por debajo de su tope.

**Lo que no se puede olvidar en M7**, porque ya costó caro:

- Lo que va a `jsonb`, con `${…}::text::jsonb` ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md)).
- Todo lo que mueve género, por `apuntar` y su candado por producto: recibir un
  albarán son entradas en el libro.
- Cada permiso nuevo nace con su pantalla, y cada operación nueva con una prueba que
  la ejecute: `pnpm cobertura` tiene que seguir sin huecos nuevos.
- Se prueba con el rol más pequeño que puede hacerlo, en móvil y en escritorio, y
  **después de desplegar se mira la base de verdad**.
- Lo nuevo se carga aparte: `app` va 7,8 KB por encima de la referencia.

**Lo que ya tiene hecho:**

- **`apuntar` y el libro**: recibir un albarán es apuntar entradas, con el mismo
  candado por producto.
- **Los precios con vigencia y por proveedor**, con `albaran` y `factura` como
  origen esperando. Y desde M6½, **el + de cada producto ya guarda un precio nuevo
  desde hoy** con el anterior en el histórico: M7 lo hace desde el albarán.
- **La ficha del proveedor**, la **sugerencia de pedido** con su motivo, y el evento
  **`precio.cambiado`** publicándose.
- **El alta de producto con lo que hay** y el proveedor opcional: un albarán con un
  producto nuevo puede darlo de alta con su cantidad de golpe.

**Cómo avisa Estook**, decidido para cuando M7 lo necesite ([0017](docs/decisiones/0017-como-avisa-estook.md)):
**la pantalla siempre**, el correo con Resend para lo que no puede esperar y el push
para lo mismo en el momento. Un aviso sale de la pantalla solo si se lo gana, fuera
de turno no suena nada y **ninguno llega sin decir qué hacer**. El reloj es
`pg_cron` llamando a la API ([0016](docs/decisiones/0016-el-reloj-es-pg-cron-llamando-a-la-api.md)),
y se monta en M7.

**Cómo se comprueba que M7 no ha roto lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa`, `pnpm cobertura` y `pnpm bd:comprobar-api` contra
Supabase. Hoy pasan los tres primeros —765 pruebas; 327 de pantalla, más tres que
hablan con la API a pelo y por eso corren en un solo navegador; y 77 de las 83
operaciones ejecutadas, con las seis que faltan apuntadas como deuda y con su
módulo—, y el cuarto también: la base y la API desplegada, al día el 10 de septiembre.
