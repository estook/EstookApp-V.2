# ESTADO DEL PROYECTO

Última actualización: 11 de septiembre de 2026 · **M7, primera entrega: construida y probada, sin fusionar**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> Aquí está lo que hace falta para trabajar hoy. **Lo que hizo cada módulo, con sus
> fallos y sus porqués, está entero en
> [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)**, y las
> razones de fondo, en [`docs/decisiones/`](docs/decisiones/).

---

## 1 · Dónde estamos

|                |                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6** ✓ · **M6½** ✓ en seis entregas (#37 a #42): fusionado, migrado, desplegado y mirado en TPV y móvil              |
| **Ahora**      | **M7, primera entrega** · las compras enteras y el Calendario. **La segunda** —el reloj y Google— espera a Richi                |
| **Pruebas**    | 868 unitarias y de base de datos · 335 de pantalla en escritorio y móvil, en verde · catálogo **99 de 105** (94 %)              |
| **Rama**       | `m7-proveedores-y-compras`, con su pull request abierto                                                                         |
| **Base**       | En Supabase, **30 de 30** y 44 tablas. En el código, **32**: la `0031` y la `0032` esperan a `bd:migrar` → 51 tablas            |
| **API**        | La desplegada es la de M6½: **no conoce las 22 operaciones nuevas** hasta desplegar. El código tiene 37 consultas y 68 comandos |
| **Entrar**     | La cuenta de Ricardo, con su negocio (`ikatz`). Ninguna cuenta de ejemplo puede entrar                                          |
| **Dirección**  | **Evolución de producto 1.0**: de aplicación de gestión a sistema operativo del local                                           |

> **M7 va en dos entregas** ([0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
> La primera está hecha y probada; para que funcione en la base de verdad hay que
> fusionar, migrar y desplegar: **[`docs/pasos-para-cerrar-m7.md`](docs/pasos-para-cerrar-m7.md)**.

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

### Ahora mismo · es de Richi

Todo en [`docs/pasos-para-cerrar-m7.md`](docs/pasos-para-cerrar-m7.md), en orden:

1. **Fusionar** el pull request de `m7-proveedores-y-compras`.
2. **`bd:migrar`** y **`bd:comprobar`**: 32 de 32 y 51 tablas.
3. **Desplegar la API** y **`bd:comprobar-api`**: que conozca todas las operaciones.
4. **Mirarlo en el TPV y en el móvil**, con la lista del paso 4. Los Paneles ya
   guardados **no reciben los widgets nuevos solos**: se añaden con Editar.
5. **Pedir los dos accesos de Google** (paso 5), que tardan: una clave de Google
   Cloud con facturación para Places, y el acceso a Business Profile con la cuenta
   que gestiona la ficha del local.

### Lo que Richi tiene que confirmar

1. **Mandar pedidos** es de jefe de cocina para arriba (`accion.enviar_pedidos`); el
   cocinero hace el borrador y recibe.
2. **¿Los precios que puso en M6 llevaban IVA?** Las compras van sin IVA, y M6 no
   lo decía en pantalla: ahora cada campo de precio dice «sin IVA». Si los suyos lo
   llevan, hay que corregirlos o las facturas no cuadrarán.
3. **El pedido no sale solo**: se abre WhatsApp o el correo con el pedido escrito.
4. **Lo pactado es de cada local**; el de toda una cadena es M24.
5. **La factura corrige el precio desde hoy**, con lo cobrado guardado para M9.

### Lo que deja preparado, y dónde se termina

| Qué                                                                        | Dónde se termina | Qué hay ya                                               |
| -------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| El reloj y el local en Google                                              | **M7, segunda**  | Decidido en 0016 y 0030; espera los accesos de Google    |
| Las pantallas del Calendario, los avisos con roles y los turnos            | **M14**          | La tabla, su seguridad por roles y «Lo que viene»        |
| Recalcular los platos de los días que la factura corrigió                  | **M9**           | Lo cobrado, guardado en cada línea del albarán con fecha |
| El pedido en PDF con el logo                                               | **M11**          | «Imprimir», que da el PDF sin membrete                   |
| El precio pactado para toda una cadena                                     | **M24**          | Lo pactado por local, con su aviso en la puerta          |
| Leer el albarán de una foto                                                | **M22**          | La recepción línea a línea, que es donde entrará         |
| Avisos «mañana entras a las 9» y «entras en 5 minutos, ficha ya», por push | **M25**          | El horario de siempre; el widget ya lo dice              |
| El recuento, la desviación y la calibración del aprovechamiento            | **M8**           | La merma con motivo; los albaranes y sus incidencias     |
| Descontar lo vendido del inventario                                        | **M20**          | El cierre guarda los platos con el nombre normalizado    |

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

| Qué                                                                   | Cuándo                                                                 |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                      |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                    |
| Volver a `BrowserRouter` cuando haya `estook.com`                     | con dominio ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |
| El vectorial del logotipo y de Fogón                                  | cuando aparezcan; se sustituyen en un sitio                            |

---

## 3 · Lo que está vivo

**Web:** https://estook.github.io/EstookApp-V.2/ · `/app/` · `/carta/` · `/admin/`
(el catálogo del sistema de diseño está en `/admin/`).

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito, por el agrupador de sesión (la conexión directa de los proyectos nuevos
solo va por IPv6). **30 de 30 migraciones** y 44 tablas, todas con seguridad por
filas; la única vista es `estook.existencias`. Leído el 10 de septiembre. **Con la
`0031` y la `0032` serán 32 y 51 tablas.** Se comprueba con
`.\estook.cmd bd:comprobar`, que lo lee de la base y no de aquí.

**Organizaciones:** `bar-centro`, `casa-lola` y `grupo-costa` son semillas de
ejemplo, **con las cuentas cerradas desde el 3 de septiembre** —tenían una
contraseña publicada en este repositorio—. **`ikatz` es el negocio de verdad**.

**Errores:** `estook-app` en Sentry, solo «Error monitoring», con el repositorio
enlazado. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; en
Secrets, `TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. Todo en
[`config/claves.md`](config/claves.md).

**El peso**, medido con `pnpm tamano` el 11 de septiembre:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | **260,5 KB** | 106,1 KB                 |
| `admin`         | 186,3 KB     | 106,1 KB                 |
| `web` · `carta` | 165,9 KB     | 106,1 KB                 |

La referencia es 250 y **se mide, no bloquea**. M7 sube `app` 2,7 KB: son los dos
widgets del Panel y la tarjeta de «Hoy», que tienen que estar en la primera
pantalla. **Compras entera se carga aparte**, al entrar en ella.

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
| **M6½** | La capa de producto: destinos y vistas, Panel en el servidor, merma, fichajes, caja y equipo     |
| **M7**  | Primera entrega: las compras enteras y el Calendario. Abajo                                      |

### M7 · la primera entrega

- **Compras, en cinco vistas de Inventario**: Pedidos · Albaranes · Facturas ·
  Proveedores · Precios. Pedidos empieza por **lo de hoy**: a quién toca pedir antes
  de su hora límite, lo que llega y los borradores por mandar.
- **El ciclo `borrador → mandado → recibido`**, con la sugerencia que cubre hasta el
  reparto de después en cajas enteras, **el pedido escrito para WhatsApp o correo**
  —Estook no lo manda solo— y **recibir entero en dos toques**. Con cambios, cada
  línea con sus incidencias; devoluciones como un albarán al revés.
- **La factura conciliada con sus albaranes mientras se escribe**, con la diferencia
  señalada y el precio nuevo apuntado desde hoy. Abonos igual.
- **Lo pactado** y **quién te lo deja mejor**, en euros al mes.
- **El Calendario**: la tabla con su seguridad por roles, los repartos, los pedidos
  y las caducidades publicados por reacciones, y los widgets **«Compras de hoy»** y
  **«Lo que viene»**.
- **Un permiso nuevo**, `accion.enviar_pedidos`: el cocinero hace el borrador y
  recibe sin ver un precio; mandar es de jefe de cocina para arriba.

**Lo que encontraron las pruebas nuevas, y no ninguna de las viejas:** el
despachador **pedía «editar» para leer** —un Inventario en solo lectura no dejaba ni
mirar—; un permiso de la organización **pasaba por encima del recorte de un
local**; y una lista vacía llegaba a la base como `''` desde el conductor de las
pruebas. Los tres, arreglados y con su prueba.

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
38. **Las listas a Postgres, como texto** (`comoLista` y `::text::tipo[]`), por lo
    mismo que el JSON: una lista vacía de un tipo enumerado llegaba como `''`.
39. **Una consulta pide «ver»; un comando, «editar».** Y **el recorte de un local
    manda** sobre el permiso de la organización. Lo prueba `leer-con-ver.prueba.ts`.
40. **Una ficha que se abre desde varios sitios vive en la dirección** (`?pedido=`),
    no en un estado: así la abre el Panel, «Hoy» o el Calendario sin conocerse.
41. **Un precio que no dice si lleva IVA no cuadra con ninguna factura.** Cada campo
    donde se escribe un precio de compra dice «sin IVA».

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/), una por fichero:

| Núm      | Qué                                                                         |
| -------- | --------------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify                                              |
| **0002** | La API en Hono sobre Supabase Edge Functions                                |
| **0003** | M0 crea el esqueleto mínimo de alcances                                     |
| **0004** | El presupuesto de velocidad de B7, reconstruido                             |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción           |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                           |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta           |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages           |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`            |
| **0010** | El login es nuestro, no de Supabase Auth                                    |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad                  |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                         |
| **0013** | Google Places se aplaza a M23                                               |
| **0014** | Un módulo reacciona a otro en la misma transacción                          |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app                 |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta en la segunda de M7 |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                       |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                          |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato             |
| **0020** | Un catálogo de acciones, y una acción es una dirección                      |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha             |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero             |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor           |
| **0024** | El color del local pinta la app, y hay dos temas                            |
| **0025** | Fichar pide dónde, y no bloquea nunca                                       |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe                 |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo             |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha             |
| **0029** | Lo que va a una columna JSON viaja como texto                               |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto             |
| **0031** | **El Calendario recoge lo de todos los módulos, con quién lo ve**           |
| **0032** | **Las compras: Estook no manda, el albarán mueve y la factura confirma**    |

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
- **Las migraciones `0001` a `0032`.** Se amplían con una `0033`, nunca se editan
  (regla 2). Y al ampliar una función SQL, **se copia la original entera**.
- **Lo que va a una columna JSON se escribe `${…}::text::jsonb`**, nunca `::jsonb` a
  secas; **y las listas, `${comoLista(…)}::text::tipo[]`** ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md), [0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
- **El libro de movimientos.** Solo se añade; un movimiento equivocado se enmienda
  con otro. `estook.existencias` es **una vista**. Todo lo que mueve género pasa
  por `apuntar` —**recibir y devolver también**—, y **el candado de apuntar es
  `pg_advisory_xact_lock`**: volver a `for update` vuelve a dejar sin merma a la
  sala ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
- **La factura no mueve género**: confirma el precio desde hoy y guarda lo cobrado
  en la línea del albarán ([0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
  **Los importes de compra, sin impuestos.**
- **La aritmética vive en `packages/dominio`**: inventario, merma, equipo, cierre,
  **compras y Calendario**. Ni un disparador suma stock ni pondera precios (regla 6).
- **Quién ve las horas de quién lo decide `estook.a_quien_lleva`**, en la base. Las
  consultas no filtran por su cuenta ([0025](docs/decisiones/0025-fichar-pide-donde-y-no-bloquea.md)).
  **Y quién ve qué del Calendario, la política de su tabla** ([0031](docs/decisiones/0031-el-calendario-recoge-lo-de-todos.md)).
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`, cuyas tablas se
  cambian en B5 del Plan primero), el de widgets (`packages/ui/src/panel/catalogo.ts`)
  y el de acciones (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración, no desde la
  aplicación.
- **Las diecisiete funciones `security definer`.** Son la puerta de atrás del
  sistema y están tasadas: una prueba las cuenta, y la última es `a_quien_lleva`.
  M7 no añade ninguna: `mis_roles_en` lee con los permisos de quien pregunta.

Sobre el candado de `main`: las comprobaciones obligatorias van **sin tilde** —
`Calidad`, `Construccion y presupuestos`, `Migraciones reversibles`—. **Nunca
añadir `Construir` ni `Publicar`**: ese flujo solo corre después de fusionar.

---

## 8 · El siguiente paso · la segunda entrega de M7

### Antes de empezarla

1. **Que la primera esté cerrada**: fusionada, `bd:comprobar` con 32 de 32 y 51
   tablas, la API desplegada con `bd:comprobar-api` en verde, y Richi habiéndolo
   mirado en el TPV y en el móvil.
2. **Que Richi tenga los dos accesos de Google** ([pasos, 5](docs/pasos-para-cerrar-m7.md)):
   la clave de Google Cloud con facturación para Places, y el acceso a Business
   Profile. **Sin ellos no se empieza**: se construiría algo que no se puede probar.
3. **Sus respuestas a las cinco preguntas** de la sección 2, sobre todo la del IVA.

### Qué entra

- **El reloj**: `pg_cron` llamando a nuestra API
  ([0016](docs/decisiones/0016-el-reloj-es-pg-cron-llamando-a-la-api.md)). De paso
  vacía la bandeja de eventos y limpia la idempotencia caducada.
- **«El local en Google»** ([0030](docs/decisiones/0030-el-local-se-situa-con-google.md)):
  Places en el alta y en Ajustes, con la posición como centro del radio de fichaje;
  Business Profile para leer las reseñas; **una actualización al día**, al cerrar la
  jornada de cada local; y **el tope de gasto**, con un contador por local y día y
  otro del proyecto, y todo por nuestra API.

**Terminado cuando**, lo que le queda a M7: al elegir el local en el alta se guardan
su ficha y su posición; y al cerrar el día la ficha y las reseñas se actualizan
solas, con el contador de llamadas por debajo de su tope.

**Cómo se comprueba que no rompe lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa`, `pnpm cobertura` y `pnpm bd:comprobar-api` contra
Supabase. Hoy pasan los tres primeros —868 pruebas; 335 de pantalla, con las que
hablan con la API a pelo corriendo en un solo navegador; y 99 de las 105
operaciones ejecutadas, con las seis que faltan apuntadas como deuda y con su
módulo—. El cuarto espera a que se despliegue esta entrega.
