# ESTADO DEL PROYECTO

Última actualización: 16 de septiembre de 2026 · **Antes de M8: los planes de las mejoras y del admin (#52), y la primera entrega hecha, A1 · la puerta del admin. El local en Google va a `main` con la #51**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> Aquí está lo que hace falta para trabajar hoy. **Lo que hizo cada módulo, con sus
> fallos y sus porqués, está entero en
> [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)**, y las
> razones de fondo, en [`docs/decisiones/`](docs/decisiones/).

---

## 1 · Dónde estamos

|                |                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6½** ✓ · **M7, entregas 1, 1½, 1¾, 1⅞ y 4** ✓ (#44 a #49): compras, Calendario, repaso, dominio, bases, zonas y Panel     |
| **Ahora**      | **Antes de M8**: A1, **la puerta del admin**, hecha y sin fusionar. Antes van la #51 (Google a `main`) y la #52 (los planes)          |
| **Pruebas**    | 1.021 unitarias y de base de datos · 367 de pantalla en escritorio y móvil, en verde · catálogo **115 de 121** (95 %)                 |
| **Rama**       | `m7-admin-la-puerta`, sobre `mejoras-y-admin-el-plan` (#52), que sale de la de Google (#51). **Se fusionan en ese orden**             |
| **Base**       | En Supabase, **35** y 51 tablas (comprobado el 16-sep). En el código, **37**: la `0036` (Google) y la `0037`, el esquema `plataforma` |
| **API**        | Desplegada con lo de la #48. **Hay que volver a desplegarla**: `un_indicador`, Google y la puerta del admin                           |
| **Entrar**     | La cuenta de Ricardo, con su negocio (`ikatz`). Ninguna cuenta de ejemplo puede entrar. El admin, con `bd:dar-admin` al fusionar      |
| **Dirección**  | **Evolución de producto 1.0**: de aplicación de gestión a sistema operativo del local                                                 |

> **Lo de ahora:** fusionar la #51, la #52 y la puerta del admin, aplicar la `0036` y la
> `0037`, desplegar la API y darse acceso con `bd:dar-admin`: todo en
> **[`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)**. Los planes:
> **[`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)** y
> **[`docs/panel-de-administracion.md`](docs/panel-de-administracion.md)**. **M8 no
> empieza hasta que los dos estén al 100 %.**

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

Los pasos, en [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md), en orden:

1. **Fusionar la #51** (Google a `main`: la #50 se fusionó en la rama del Panel y no
   llegó), **después la #52** (los planes) y **después la puerta del admin**. Al
   fusionar se publica solo.
2. **`bd:migrar`** y **`bd:comprobar`**: 37 de 37, 52 tablas en `estook` y las dos de
   `plataforma`.
3. **Desplegar la API** (Actions → Desplegar la API → `desplegar`) y
   **`bd:comprobar-api`**.
4. **`bd:dar-admin estookapp@gmail.com "Estook"`**, entrar en `estook.com/admin/`,
   ponerse contraseña y montar el segundo factor. **La contraseña del chat no se usa.**
5. **Mirar el Panel vivo en el TPV y en el móvil**, si no está hecho: mantener pulsado
   un widget, arrastrarlo, ponerse una cifra desde «Añadir».
6. **La clave de Places** (`GOOGLE_MAPS_KEY`) en los secretos de Supabase, **nueva**
   —las de antes pasaron por un chat—, con su cuota diaria y su aviso de presupuesto.
   Se enciende sin desplegar.
7. **Repasar las zonas de tu género**, si no está hecho: lo de limpieza va a mano
   (Inventario → Productos → «De dónde»).
8. **Quitarles el IVA a sus precios, una vez**, si no está hecho: Ajustes → «Tus
   precios de compra».
9. **Lo que falta de fuera** —el acceso a Business Profile, Resend y la de IA—.
   **No frenan nada de lo que hay**: cada una la estrena su entrega
   ([`config/claves.md`](config/claves.md)).

### Lo que Richi confirmó el 11 de septiembre

1. **Sus precios llevan IVA**, y quería poder elegir: hecho, [0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md).
2. **Mandan pedidos** jefe de cocina, gerente y manager; y los jefes pueden invitar a
   alguien a rellenar un pedido, que luego mandan ellos: **entrega 2**.
3. **El pedido no sale solo**: se queda así.
4. **El precio nuevo vale desde hoy**, y los de antes se comparan: la gráfica de la ficha.

### Las entregas del repaso

| Entrega | Qué                                                                                                                                            | Cómo está                               |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **1**   | Quitar y congelar lotes, dos decimales, el alta por cómo se compra, IVA, gráfica, widgets, salario, jerarquía                                  | **Fusionada** (#45)                     |
| **1½**  | **Las bases**: vender no es gastar, la ficha se lee, las listas largas se recorren, y vuelve el deshacer                                       | **Fusionada** (#47)                     |
| **1¾**  | **Las apps conectadas**: el precio de venta a la carta, la zona del género, congelar una parte y el recuento                                   | **Fusionada** (#48)                     |
| **1⅞**  | **El Panel vivo**: mantener y arrastrar, lo vacío se aparta, las cifras de cada uno con gráfica y flecha                                       | **Fusionada** (#49)                     |
| **2**   | Avisos a jefes y gerentes de lo que hace su equipo, una vez; invitar a rellenar un pedido                                                      | Dentro de **R** (mejoras)               |
| **3**   | **Horarios**, una app entera en Equipo: cuadrante, historial, horas, avisos, PDF con logo                                                      | Dentro de **H** (mejoras)               |
| **4**   | El dominio **`estook.com`**: el sitio ya vive ahí                                                                                              | **Fusionada** (#46)                     |
| **5**   | **Places con tope por local** ([0040](docs/decisiones/0040-el-local-se-busca-en-google-con-tope.md)). Business Profile y la IA esperan accesos | Places, en la **#51** · el resto espera |

### Antes de M8 · las mejoras y el admin

Richi paró M7 el 16 de septiembre con **veinte mejoras** y **el panel de
administración**, y M8 no empieza hasta tenerlo todo. Cada punto está explicado —qué
se pidió, cómo se hace mejor, qué hay ya y qué necesita de fuera— en dos documentos:

- **[`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)**: las veinte, en
  siete entregas (V, O, R, H, I, L y lo que espera a su módulo).
- **[`docs/panel-de-administracion.md`](docs/panel-de-administracion.md)** y su
  decisión, la [0041](docs/decisiones/0041-el-panel-de-administracion.md): clientes,
  vendedores y códigos, ventas y auditoría, en cuatro entregas (A1 a A4).

| Orden | Entrega                       | Qué lleva                                                     |
| ----- | ----------------------------- | ------------------------------------------------------------- |
| 1     | **A1 · La puerta del admin**  | Entrar con segundo factor, la primera cuenta, más admins      |
| 2     | **V · Lo que se ve**          | Modo cocina, flechas en todas las apps, Inicio, vacíos, fotos |
| 3     | **O · Lo que se ordena**      | Botón de acciones, Ajustes, «Hoy», paneles por rol, semáforo  |
| 4     | **A2 · Clientes**             | Lista, ficha, contrato y actividad, editar con auditoría      |
| 5     | **R · El reloj y los avisos** | El reloj, la entrega 2, pedido sugerido, precios, informe     |
| 6     | **H · Horarios**              | La entrega 3, con el coste en vivo y las horas extra          |
| 7     | **I · La app instalable**     | Push y sin conexión                                           |
| 8     | **L · El lector**             | Códigos de barras                                             |
| 9     | **A3 · Vendedores y códigos** | Vendedores, `?ref=`, asignaciones con historial               |
| 10    | **A4 · Ventas**               | El tablero                                                    |

**Tres no pueden quedar al 100 % antes de M8**, y está dicho en el plan: leer fotos
(la IA, M22), responder reseñas (Business Profile) y la carta con QR (los platos, M9
y M10). De las tres se deja hecho lo que no depende de eso.

### La entrega 1½ · las bases, punto por punto

Son los ocho que trajo Richi mirando la aplicación en su TPV, en su orden:

| Lo que dijo                                          | Qué se ha hecho                                                                                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| «La merma me busca en el catálogo de ejemplo»        | Ya no: la búsqueda de merma solo trae género de verdad                                                                                                       |
| «Que quede claro si se ha vendido, y cuánto»         | Tres familias al sacar género ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)). **El importe se quitó en la 1¾**: lo cuenta la caja |
| «¿Se suma a ganancias?»                              | Sí, **en la caja del día**: sale propuesto al cerrarla, y por eso no se cuenta dos veces                                                                     |
| «El tag naranja de "sin verificar" no sé quitarlo»   | Se iba y volvía solo: era un fallo del servidor. Ahora es el aprovechamiento, en su ficha y con «Lo he medido»                                               |
| «La tarjeta de producto es demasiado sencilla»       | Cada sección es una tarjeta con su título y sus botones. «Lo que deja» **se retiró en la 1¾**: el margen es del plato                                        |
| «Si hay listas enormes, ver más y buscar por tiempo» | El libro y las mermas van por tramos —mes, trimestre, semestre, año—, buscan en el servidor y traen más                                                      |
| «El deshacer ha desaparecido»                        | Vuelve donde se edita algo que importa: la ficha y el precio de compra                                                                                       |
| «Si ves mejoras, aplícalas»                          | Cuatro fallos encontrados de paso, abajo                                                                                                                     |

**Lo que se encontró de paso, y era de antes:**

1. **«Sin verificar» se volvía a poner solo.** El servidor guardaba
   `sin_verificar = !cambiaElCoste`: corregir una errata en el nombre marcaba el
   producto como sin medir. Por eso la etiqueta salía en todos y no se podía quitar.
2. **La vista «Mermas» del libro estaba rota.** La barra mandaba `tipo=merma` y la
   consulta solo aceptaba entrada, salida y ajuste: contestaba «datos no válidos».
   Llevaba así desde M6½.
3. **El buscador del libro mentía.** Filtraba las cien líneas ya traídas, así que
   buscar algo de hace tres meses contestaba «nada con eso». Es el mismo fallo que
   ya costó las vistas de Productos.
4. **Cambiar el envase daba el aprovechamiento por medido.** Son dos datos que se
   multiplican en la misma fórmula, y darlos por medidos juntos vaciaba de
   significado la marca.

### Lo que deja preparado, y dónde se termina

| Qué                                                                        | Dónde se termina | Qué hay ya                                                   |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| El reloj diario                                                            | **Mejoras · R**  | Places guardado con su fecha y su botón de «otra vez» (0040) |
| Business Profile                                                           | **Con accesos**  | Places guardado con su fecha y su botón de «otra vez» (0040) |
| Las pantallas del Calendario, los avisos con roles y los turnos            | **M14**          | La tabla, su seguridad por roles y «Lo que viene»            |
| Recalcular los platos de los días que la factura corrigió                  | **M9**           | Lo cobrado, guardado en cada línea del albarán con fecha     |
| El pedido en PDF con el logo                                               | **M11**          | «Imprimir», que da el PDF sin membrete                       |
| El precio pactado para toda una cadena                                     | **M24**          | Lo pactado por local, con su aviso en la puerta              |
| Leer el albarán de una foto                                                | **M22**          | La recepción línea a línea, que es donde entrará             |
| Avisos «mañana entras a las 9» y «entras en 5 minutos, ficha ya», por push | **Mejoras · I**  | El horario de siempre; el widget ya lo dice                  |
| El recuento, la desviación y la calibración del aprovechamiento            | **M8**           | La merma con motivo; los albaranes y sus incidencias         |
| Descontar lo vendido del inventario                                        | **M20**          | El cierre guarda los platos con el nombre normalizado        |

### Lo que sigue sin decidirse · es de Richi

1. **El chat de Estook.** «Mandar el horario al chat, a un grupo o a una persona»
   necesita un chat dentro de Estook, que no existe. ¿Se construye con Horarios o va
   aparte? Hasta decidirlo, el horario se comparte en PDF.
2. **Si Fogón habla antes de M22.** Tiene su sitio y su contexto; le falta la voz,
   que necesita elegir modelo, presupuesto diario por local y caché.
3. **Si se quitan de la API `mis_locales`, `mis_permisos` y `un_local`**, que
   `quien_soy` dejó sin trabajo en M4.
4. **Las tres preguntas del plan de mejoras**: si lo que espera a su módulo (fotos,
   respuestas a reseñas, carta) se queda ahí; si vale el orden empezando por la puerta
   del admin; y si el modo cocina lo elige cada aparato. Las tres llevan su
   recomendación en [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md).

### Pendiente de dato, no de código

**Los tipos de IGIC e IPSI para entregas de bienes.** No existe un dato único:
dependen del bien y de la operación. Cuando aparezcan se añaden como filas; hasta
entonces el motor dice «sin regla» y para ([0006](docs/decisiones/0006-el-motor-fiscal.md)).
Por lo mismo, **en Canarias, Ceuta y Melilla no se propone IVA de compra** (0033).

### Sin prisa

| Qué                                                                   | Cuándo                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Quitar «Automatically expose new tables» en Supabase → Settings → API | antes de clientes                                                       |
| Regenerar las claves de Google, que pasaron por un chat               | M27                                                                     |
| Volver a `BrowserRouter`: ya hay dominio y Pages copia el `404.html`  | cuando toque ([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)) |
| El vectorial del logotipo y de Fogón                                  | cuando aparezcan; se sustituyen en un sitio                             |
| Pasar Pedidos, Albaranes y Facturas a `usarListaLarga`                | cuando una de las tres crezca                                           |

Lo último no es un fallo hoy: esas tres traen más pidiendo la lista otra vez con un
tope mayor, y **no tienen buscador**, así que no engañan a nadie —que era lo que sí
hacía el libro—. Cuando un local lleve un año de albaranes, el tramo de tiempo y el
«Ver más» por páginas ya están escritos y es cambiar el gancho.

---

## 3 · Lo que está vivo

**Web:** https://estook.com · `/app/` · `/carta/` · `/admin/` (hoy, el catálogo del
sistema de diseño, a la vista; **con la puerta del admin pasa detrás del segundo
factor**). El DNS lo lleva Hostinger: cuatro registros
A a GitHub Pages y `www` por CNAME. La dirección vieja redirige sola
([0036](docs/decisiones/0036-la-direccion-es-estook-com.md)).

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito, por el agrupador de sesión (la conexión directa de los proyectos nuevos
solo va por IPv6). Todas las tablas con seguridad por filas; la única vista es
`estook.existencias`. **35 migraciones y 51 tablas, aplicadas** (comprobado el 16 de
septiembre): ninguna de las dos últimas crea una tabla. La `0035` quita el precio de venta del producto, le
pone su **zona**, le da cantidad a los lotes y cambia la política de `producto`. Se
comprueba con `.\estook.cmd bd:comprobar`, que lo lee de la base y no de aquí.

**Organizaciones:** `bar-centro`, `casa-lola` y `grupo-costa` son semillas de
ejemplo, **con las cuentas cerradas desde el 3 de septiembre** —tenían una
contraseña publicada en este repositorio—. **`ikatz` es el negocio de verdad**.

**Errores:** `estook-app` en Sentry, solo «Error monitoring», con el repositorio
enlazado. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; en
Secrets, `TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. **`GOOGLE_MAPS_KEY` todavía no
está puesta** en los secretos de Supabase: sin ella, Ajustes dice que Google no está
conectado. Todo en
[`config/claves.md`](config/claves.md).

**El peso**, medido con `pnpm tamano` el 16 de septiembre:

| Aplicación      | Peso inicial | De los cuales tipografía |
| --------------- | ------------ | ------------------------ |
| `app`           | **275,7 KB** | 106,1 KB                 |
| `admin`         | **203,1 KB** | 106,1 KB                 |
| `web` · `carta` | 166,3 KB     | 106,1 KB                 |

La referencia es 250 y **se mide, no bloquea**. **La puerta del admin sube `admin` 16 KB**: TanStack Query y el cliente de la API, que la app ya llevaba; `app` no cambia. El local en Google sube `app` 1,8 KB
—la tarjeta de Ajustes—. El Panel vivo la subió 3,5 KB —la
tarjeta del indicador, la línea y la rejilla nueva— y **`@dnd-kit` no cuenta**: va en
su propio trozo (17 KB) y solo se descarga al editar el Panel. Las apps conectadas subieron `app`
2,0 KB: las zonas y el margen son texto y una resta, y **el recuento se carga
aparte**, que es la pantalla más grande de la entrega y se abre una vez al mes.
Antes, las bases habían subido 1,8 KB y el repaso 6,1 KB: el
alta por cómo se compra, el precio con IVA, los lotes y la gráfica de precios van
con el resto de Inventario, y la tarjeta del IVA con Ajustes. **Compras entera y
Recharts se siguen cargando aparte.**

---

## 4 · Qué hizo cada módulo

En una línea. **El detalle está en
[`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md).**

| Módulo   | Qué dejó                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------ |
| **M0**   | Monorepo, reglas, integración continua con el candado de `main`, publicación en GitHub Pages     |
| **M1**   | Alcances, roles y permisos en la base, con seguridad por filas en cada tabla                     |
| **M2**   | La API (Hono), el despachador de comandos y consultas, los motores de dinero, fechas e impuestos |
| **M3**   | El sistema de diseño, el esqueleto de las ocho apps, la rueda y el buscador universal            |
| **M4**   | El login propio, PIN, segundo factor, sesiones y el primer despliegue de verdad                  |
| **M5**   | El alta en ocho pasos, el catálogo de referencia, los ejemplos y el modo demostración            |
| **M6**   | Inventario: productos, el libro de movimientos, precio medio ponderado, lotes, previsión         |
| **M6½**  | La capa de producto: destinos y vistas, Panel en el servidor, merma, fichajes, caja y equipo     |
| **M7**   | Compras y Calendario (#44); el repaso, las bases, las apps conectadas y el Panel vivo            |
| **→ M8** | Los planes de las veinte mejoras y del admin; A1, la puerta del admin                            |

### Antes de M8 · A1, la puerta del admin

- **Ser admin es de la plataforma**: esquema `plataforma`, con `administrador` (nivel e
  historia; nada se borra) y su `auditoria`, que solo se añade ([0041](docs/decisiones/0041-el-panel-de-administracion.md)).
- **`estook.com/admin/` tiene puerta**: contraseña, **segundo factor obligatorio**,
  sesión de **ocho horas** —lo impide la base— y guardada en `sessionStorage`.
- **La sesión del admin y la de la app no se cruzan**, y el acceso se mira en cada
  petición: quitarlo cierra la puerta en el siguiente paso.
- **Administradores**: dar acceso (con cuenta nueva y clave de un solo uso, o con la
  suya) y quitarlo con motivo; los dos piden **el código otra vez**. Nunca uno mismo,
  nunca el último total. **Auditoría**, en frases, de cincuenta en cincuenta.
- **`bd:dar-admin`** da el primer acceso desde la consola. El catálogo del sistema de
  diseño, que se veía sin entrar, va detrás de la puerta.

**Lo que se encontró:** que **la #50 nunca llegó a `main`** (regla 66); que los pasos
de M7 mandaban escribir `.estook.cmd`, sin la barra, que PowerShell no encuentra; y
que aquí ponía «dieciocho funciones `security definer`» cuando la prueba lista
veinticuatro.

### M7 · el repaso, primera entrega

- **Un lote que caduca se quita**, desde «Hoy» y desde la ficha: gastado, o tirado
  —y entonces es merma por caducado—. **Lo congelado se ve**, con su fecha, su
  etiqueta y la vista **Productos · Congelados**.
- **El alta pregunta cómo se compra** —por peso, por litros o por unidades— y la
  cuenta sale sola, con el precio que se tenga a mano ([0035](docs/decisiones/0035-el-alta-pregunta-como-se-compra.md)).
  **Dos decimales siempre**, cambiando de unidad en vez de añadir ceros.
- **El IVA**: se guarda sin él, cada campo lo deja escribir con o sin, y a los
  precios de antes se les quita una vez ([0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).
  Y **los precios de antes, en una gráfica** por proveedor.
- **El catálogo de widgets enseña todos**, con «En tu panel» en los puestos.
- **Nadie gestiona a su igual** ([0034](docs/decisiones/0034-nadie-gestiona-a-su-igual.md)).

**Lo que se encontró:** cambiar el salario **dos veces el mismo día** rompía la
restricción `hasta >= desde` de la vigencia y salía «se nos ha roto algo por
dentro». Ahora el cambio del mismo día corrige la fila de hoy, con su prueba.

### M7 · el local en Google

- **Ajustes → Tu local en Google**: se busca por el nombre, se toca y se guarda su
  ficha —dirección, teléfono, web, Maps, horario, valoración y reseñas— con su
  fecha. Lo escrito a mano en el alta no se pisa.
- **La ubicación del fichaje puede salir de Google**, y se guarda de dónde sale:
  **la marcada a mano manda** ([0040](docs/decisiones/0040-el-local-se-busca-en-google-con-tope.md)).
- **Tope por local, contado antes de llamar**: 40 fichas y 400 búsquedas al mes. Al
  acabarse, Google no llega a enterarse. Abrir Ajustes no llama nunca.
- **Apagado hasta que haya clave**, y dicho. La API de pruebas lleva un Google de
  mentira, y la base de datos lo prueba con uno que cuenta sus llamadas.
- **Lo que no entra, y por qué:** Business Profile no es una clave —es OAuth del
  dueño y acceso aprobado por Google—, y el reloj diario es la 0016, que no existe.

**Lo que se encontró:** que `GOOGLE_BUSINESS_KEY`, apuntada en `config/claves.md`
desde M5, **no existe**: esa API no se usa con una clave. Estaba escrito así para
«cuando llegue», y habría mandado a pedir algo que Google no da.

### M7 · el Panel vivo

- **Se edita como un móvil** ([0039](docs/decisiones/0039-el-panel-se-monta-como-un-movil.md)):
  mantener pulsado entra en edición, los widgets tiemblan, se arrastran desde
  cualquier parte y los demás se deslizan. Las flechas se van; el teclado sigue
  pudiendo moverlo todo. El arrastre es `@dnd-kit`, y **solo se descarga al editar**.
- **Lo vacío se aparta**, y lo dice una línea debajo: «Sin nada ahora en…». Cada
  widget sabe si está vacío (`usarQueEstaVacio`); cargando no cuenta como vacío.
  Y la rejilla rellena sus huecos con el flujo denso.
- **Cada uno se pone sus cifras**: ventas, ticket medio, food cost, merma, compras y
  sus horas, de 7 o 30 días, **con su flecha frente al periodo anterior y su línea
  de días**. Salen de `un_indicador`, que cuenta como `mis_cierres`: el food cost
  del Panel es el de Servicio, y una prueba lo compara.
- **Ventas de hoy** lleva su flecha frente al mismo día de la semana pasada.
- **Seis columnas** en monitores grandes.

**Lo que se encontró:** que el temblor hacía **imposible pulsar el «quitar»**: un
botón que se mueve no se deja pulsar, ni por una prueba ni por un dedo con prisa.
Los controles van quietos y tiembla la tarjeta. Y la línea de las gráficas **salía a
trozos** en Chrome: con un trazo que no escala, los guiones se calculan en píxeles
de pantalla. Se dibuja recortando la caja.

### M7 · las apps conectadas

- **El precio de venta vuelve a la carta.** Un ingrediente no se vende: se vende
  un plato, y su precio es de la carta (M10) y su coste del escandallo (M9).
  Se quitan del producto, y con ellos el importe que se tecleaba al sacar género
  ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md), corregida).
- **Cada producto es de una zona** —cocina, sala o limpieza— y la zona **decide con
  qué trabaja cada uno**: la lista de Inventario de un cocinero no trae la barra, y
  no puede cambiar su ficha ([0038](docs/decisiones/0038-cada-producto-es-de-una-zona.md)).
  **Leer, se lee todo el local**: la merma la apunta quien la rompe.
- **La categoría es el índice de la zona**, con sus cuentas hechas sobre ella. Y
  limpieza no lleva categorías: no se apaga el desplegable, no está.
- **Congelar dice cuánto.** Antes marcaba el producto entero: diez kilos de
  cuarenta y tres dejaban los cuarenta y tres con la etiqueta.
- **El recuento**: «hemos contado la cámara, esto es lo que hay», a mano o desde
  un fichero, con la desviación al lado. Estrena `accion.cerrar_recuento`, que
  llevaba **desde M1** en la matriz sin ninguna pantalla detrás.
- **El Panel**: la cabecera se abre y dice lo tuyo de hoy, las cifras eligen su
  tamaño por lo que ocupan, y se estira en pantallas grandes.

### M7 · las bases, antes de seguir

- **Vender deja de ser lo mismo que gastar.** Al sacar género se elige entre tres
  familias —se vende, se usa, no se aprovecha—. El importe cobrado **se quitó en la
  1¾** ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).
  Ese dinero **no suma solo**: sale propuesto al cerrar la caja del día, que es su
  único dueño, y así el día no se cuenta dos veces.
- ~~**A cuánto lo vendes, y lo que te deja.**~~ **Retirado en la 1¾**: un ingrediente
  no tiene precio de venta; lo tiene el plato, en la carta (M10).
- **La ficha se lee.** Cada sección es una tarjeta con su título y sus botones, con
  la categoría, el proveedor y el envase arriba, y una barra del mínimo.
- **El aprovechamiento, en su sitio y con su botón.** La etiqueta «sin verificar»
  se va de la lista: **volvía sola** cada vez que se guardaba la ficha —un fallo del
  servidor— y salía en todos los productos.
- **Las listas largas se recorren.** El libro y las mermas van por tramos de tiempo,
  buscan en el servidor y traen más de tanto en tanto.
- **Vuelve el deshacer** en lo que se edita y se puede volver a editar: la ficha y el
  precio de compra.
- **La merma solo busca en tu género**, no en el catálogo de ejemplo.

**Lo que se encontró:** cuatro fallos de antes. «Sin verificar» se volvía a poner
sola al guardar la ficha; la vista **Mermas** del libro contestaba «datos no
válidos» desde M6½; el buscador del libro filtraba solo lo ya traído; y **la barra
de deshacer no se podía pulsar con una hoja abierta** —un `<dialog>` modal vive en
la capa superior del navegador— que es justo cuando hace falta.

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
    vez. Y no vale buscar «una cuenta que no toca nadie»: se probó con Luis, y otra
    prueba le añadía un segundo local. **Lo que cambia un ajuste del local, en un
    local nuevo** (la prueba del IVA crea el suyo).
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
41. **Un precio de compra se escribe con o sin IVA, y se guarda sin él** (0033).
    Cada campo lo dice, con su tipo y la otra cifra calculada.
42. **Una vigencia se prueba con dos cambios el mismo día.** El salario fallaba solo
    la segunda vez, que es la de corregir una errata.
43. **Un catálogo que solo enseña lo que falta hace creer que lo quitado se pierde.**
    Se enseña todo, y lo puesto lo dice.
44. **Un permiso dice qué; la amplitud del rol, a quién** (0034).
45. **Un precio se lee con dos decimales.** Si no llega, se cambia de unidad; las
    cuentas siguen en milésimas.
46. **`current_date` es UTC, y no es «hoy».** La fecha la pone el servidor con la
    zona y la hora de corte del local (`jornadaDe`, regla 10). Lo cazó una prueba
    corriendo a las 00:30: lo congelado quedaba fechado el día anterior.
47. **La dirección del producto va en el código** ([0036](docs/decisiones/0036-la-direccion-es-estook-com.md)).
    Estrenar `estook.com` dejó la app en blanco porque la raíz y los orígenes vivían
    en variables y secretos que había que acordarse de cambiar.
48. **Dos cosas en el mismo botón es no preguntar nada.** «Gastado o vendido» hacía
    imposible saber si por lo que salió entró dinero, que es de lo que cuelga el
    margen entero ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md)).
49. **El dinero de un día tiene un solo dueño.** Si una salida de cámara sumara a las
    ganancias y además se metiera el papel de la caja, el día valdría el doble y no
    se vería: el total del mes saldría mal y todo lo demás parecería correcto.
50. **Una marca que sale en todos no marca nada.** «Sin verificar» se volvía a poner
    sola al guardar la ficha, salía en naranja en toda la lista y no se podía quitar
    desde ninguna parte. Un dato que no se puede corregir desde donde se lee es un
    dato que nadie corrige.
51. **Un filtro que solo funciona cuando la lista cabe entera es un filtro que
    miente.** Ya costó las vistas de Productos, y el libro de movimientos seguía
    buscando dentro de las cien líneas traídas. Toda lista que crece a diario va con
    su tramo de tiempo, su búsqueda en el servidor y su «Ver más».
52. **Restar el precio de carta menos el coste es regalarse el IVA como margen.** El
    de venta se ingresa y el de compra se recupera: la resta se hace con las dos
    cifras sin impuesto, y por eso la hace el dominio y no la pantalla.
53. **Un ingrediente no tiene precio de venta.** Lo que se vende es un plato, y su
    precio vive en la carta; lo que cuesta sale de su escandallo. Ponerle un precio
    de venta al género era inventarse un tercer sitio para un dato que ya tiene el
    suyo ([0037](docs/decisiones/0037-lo-que-sale-de-camara-dice-si-se-vendio.md),
    corregida).
54. **Un dato que se pide dos veces acaba con dos respuestas.** Preguntar «cuánto
    has cobrado» al sacar género, teniendo la carta y la caja, era pedir la misma
    cifra por segunda vez.
55. **Acotar lo que se gestiona no es esconder el dato.** Meter la zona en la
    lectura del género dejó a una camarera sin poder apuntar la merma de una nata.
    Se lee todo el local; lo que se acota es la lista de Inventario y quién edita
    la ficha ([0038](docs/decisiones/0038-cada-producto-es-de-una-zona.md)).
56. **Un catálogo cuenta dentro de lo que se está mirando.** «Carnes (14)» en la
    vista de sala, con cero al entrar, es peor que no ofrecer la categoría.
57. **Una marca sobre un total miente cuando es una parte.** «Congelado» sobre un
    producto de 43 kg del que hay 10 congelados decía que no quedaba nada fresco.
58. **Un recuento no pone a cero lo que no se ha contado**, salvo que se diga a
    propósito y se enseñe cuántos se van a vaciar. Contar la cámara el martes y el
    almacén el jueves es lo normal.
59. **Una cifra elige su tamaño por lo que ocupa escrita.** «128 h 45 min» a 34 px
    parte en dos líneas; «9 l» a 20 px desperdicia la tarjeta.
60. **Un botón que se mueve no se deja pulsar.** El temblor va en la tarjeta; los
    controles, quietos. Lo cazó Playwright esperando a que el «quitar» parase.
61. **Una flecha compara lo mismo con lo mismo**: el periodo con el anterior del
    mismo largo, una proporción sobre el periodo entero, y un día sin caja como
    «no se sabe», no como cero. De nada a algo no hay flecha.
62. **Que un título no se vea ya no dice que se haya quitado.** Desde que lo vacío
    se aparta, las pruebas de quitar miran la casilla (`data-widget`), y las de
    ver aceptan «se ve» o «está nombrado en la línea».
63. **Lo que cuesta dinero se cuenta antes de gastarlo**, en una sola orden que solo
    suma si queda sitio. Un aviso de presupuesto avisa y sigue cobrando.
64. **Una integración se construye con su puerto y uno de mentira**, y se enciende
    con la clave. Sin clave se dice, no se rompe (0022, 0040).
65. **Un nombre de clave se comprueba contra la API de verdad antes de apuntarlo.**
    `GOOGLE_BUSINESS_KEY` llevaba desde M5 en la lista y esa API no usa claves.
66. **Un pull request encadenado no cambia de base solo** si la rama de abajo no se
    borra. La #50 apuntaba a la rama del Panel; al fusionarla, la #49 ya estaba en
    `main`, y Google acabó en una rama que nadie iba a fusionar. **Los pull requests
    van a `main`**, y si uno depende de otro, se dice y se fusiona en orden.
67. **Una sesión vale para un sitio.** La del admin y la de la app no se cruzan aunque
    sean de la misma persona, y lo decide el despachador, no la pantalla: un token
    olvidado en la tablet del pase no puede abrir el admin.
68. **Una pieza que se renderiza dos veces se busca por la que se ve.** La tabla pinta
    la de escritorio y las tarjetas del móvil a la vez, una oculta: `getByText` a secas
    encuentra dos, o la que no se ve (`filter({ visible: true })`).

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/), una por fichero:

| Núm      | Qué                                                                      |
| -------- | ------------------------------------------------------------------------ |
| **0001** | GitHub Pages en vez de Netlify                                           |
| **0002** | La API en Hono sobre Supabase Edge Functions                             |
| **0003** | M0 crea el esqueleto mínimo de alcances                                  |
| **0004** | El presupuesto de velocidad de B7, reconstruido                          |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción        |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                        |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta        |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages        |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`         |
| **0010** | El login es nuestro, no de Supabase Auth                                 |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad               |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                      |
| **0013** | Google Places se aplaza a M23                                            |
| **0014** | Un módulo reacciona a otro en la misma transacción                       |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app              |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con Google       |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                    |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                       |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato          |
| **0020** | Un catálogo de acciones, y una acción es una dirección                   |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha          |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero          |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor        |
| **0024** | El color del local pinta la app, y hay dos temas                         |
| **0025** | Fichar pide dónde, y no bloquea nunca                                    |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe              |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo          |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha          |
| **0029** | Lo que va a una columna JSON viaja como texto                            |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto          |
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve            |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma     |
| **0033** | **Los precios de compra se guardan sin IVA, y se escriben como venga**   |
| **0034** | **Nadie gestiona el acceso de su igual: lo hace quien está por encima**  |
| **0035** | **El alta pregunta cómo se compra, y la cuenta la hace el dominio**      |
| **0036** | **La dirección es `estook.com`, y la sabe el código**                    |
| **0037** | **Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja** |
| **0038** | **Cada producto es de una zona, y cada uno trabaja con la suya**         |
| **0039** | **El Panel se monta como un móvil, y cada uno se pone sus cifras**       |
| **0040** | **El local se busca en Google, con el tope contado antes de llamar**     |
| **0041** | **El panel de administración: el cliente es la organización**            |

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base.** Una prueba cuadra los dos catálogos.
- **Las funciones de visibilidad son `security definer`**, o `membresia` entra en
  recursión consigo misma. No se usa `force row level security`: rompería las semillas.
- **Sesión y correlación son cosas distintas**: una visita y una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usar…`) y viven en `ganchos/`.
- **El token va en `Authorization: Bearer`**, no en una cookie: la aplicación y la
  API viven en dominios distintos.
- **Dependencias nuevas justificadas:** `@electric-sql/pglite`, solo de desarrollo; y
  `@dnd-kit/core`, `sortable` y `utilities` para arrastrar los widgets (0039), que
  van en su propio trozo y solo se descargan al editar el Panel.
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
- **Las migraciones `0001` a `0037`.** Se amplían con una `0038`, nunca se editan
  (regla 2). Y al ampliar una función SQL, **se copia la original entera**.
- **Un valor de un tipo enumerado no se quita**: Postgres no sabe hacerlo. Por eso
  la `0034` añade `venta` con `add value if not exists … after 'merma'`, y su
  reversión **para** si ya hay ventas apuntadas en vez de borrarles el importe.
  Y por eso su restricción compara `tipo::text`: el valor nuevo no se puede **usar**
  en la misma transacción en la que se añade.
- **Lo que va a una columna JSON se escribe `${…}::text::jsonb`**, nunca `::jsonb` a
  secas; **y las listas, `${comoLista(…)}::text::tipo[]`** ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md), [0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
- **El libro de movimientos.** Solo se añade; un movimiento equivocado se enmienda
  con otro. `estook.existencias` es **una vista**. Todo lo que mueve género pasa
  por `apuntar` —**recibir, devolver y tirar un lote también**—, y **el candado de
  apuntar es `pg_advisory_xact_lock`**: volver a `for update` vuelve a dejar sin
  merma a la sala ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
- **Un lote no se borra: se retira** (`retirado_en`, `como_se_retiro`), y su evento
  del Calendario se va con él por la reacción. **Un producto con género apuntado no
  cambia de unidad**: el servidor lo rechaza (0035).
- **La factura no mueve género**: confirma el precio desde hoy y guarda lo cobrado
  en la línea del albarán ([0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md)).
  **Los importes de compra, sin impuestos, siempre**; el IVA se calcula al
  enseñarlo ([0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).
- **La aritmética vive en `packages/dominio`**: inventario, merma, equipo, cierre,
  compras, Calendario, **IVA de compra (`iva.ts`) y cómo se compra
  (`presentacion.ts`)**. Ni un disparador suma stock ni pondera precios (regla 6).
- **Quién ve las horas de quién lo decide `estook.a_quien_lleva`**, en la base. Las
  consultas no filtran por su cuenta ([0025](docs/decisiones/0025-fichar-pide-donde-y-no-bloquea.md)).
  **Y quién ve qué del Calendario, la política de su tabla** ([0031](docs/decisiones/0031-el-calendario-recoge-lo-de-todos.md)).
  **Y quién gestiona a quién, `servidor/aplicacion/jerarquia.ts`**, con la amplitud
  de cada rol que guarda la base ([0034](docs/decisiones/0034-nadie-gestiona-a-su-igual.md)).
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`, cuyas tablas se
  cambian en B5 del Plan primero), el de widgets (`packages/ui/src/panel/catalogo.ts`,
  donde cada widget construido dice su grupo) y el de acciones
  (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración, no desde la
  aplicación.
- **Las funciones `security definer`.** Son la puerta de atrás del sistema y están
  tasadas: una prueba las cuenta con sus nombres. **Veinticuatro en `estook`** —la
  última, `zonas_que_ve` ([0038](docs/decisiones/0038-cada-producto-es-de-una-zona.md))—
  y **dos en `plataforma`**, `nivel_de` y `dar_acceso` (0041). Aquí ponía
  «dieciocho» y la prueba lista veinticuatro: se dejó de actualizar.
- **La puerta del admin** (0041): ser admin es de `plataforma`, no un rol de la matriz;
  **la sesión del admin y la de la app no se cruzan**, y lo mira el despachador
  (`porQueNoPasaElAdmin`); toda operación del admin declara `soloAdmin` y empieza por
  `admin_`, y una prueba lo tasa. La auditoría de `plataforma` solo se añade.
- **Qué pide cada indicador vive en `@estook/permisos`** (`LO_QUE_PIDE_EL_INDICADOR`),
  y **cómo es cada uno en el dominio** (`indicador.ts`): el catálogo, la tarjeta y el
  servidor leen de ahí. Lo elegido va en el identificador del widget
  (`indicador-ventas-7`), así que la tabla del Panel no cambia.
- **Google, solo por la API y por su puerto** (`servidor/infraestructura/google.ts`).
  La clave no va al navegador jamás, y **todo lo que llama a Google pasa antes por
  `contar`** (`comandos/google.ts`), que es el tope. Los topes viven en
  `packages/dominio/src/google.ts`.
- **El precio de venta no vive en el producto.** Lo que se vende es un plato, y su
  precio es de la carta (M10); lo que cuesta sale de su escandallo (M9). Se
  intentó en la `0034` y se retiró en la `0035`: está escrito para no repetirlo.

Sobre el candado de `main`: las comprobaciones obligatorias van **sin tilde** —
`Calidad`, `Construccion y presupuestos`, `Migraciones reversibles`—. **Nunca
añadir `Construir` ni `Publicar`**: ese flujo solo corre después de fusionar.

---

## 8 · El siguiente paso · V, lo que se ve

### Antes de empezarla

1. **La #51, la #52 y la puerta del admin, fusionadas**, con la `0036` y la `0037`
   aplicadas, la API desplegada y Richi dentro del admin con su segundo factor.
2. Nada de fuera: V no necesita ninguna clave.

### Qué entra

Las mejoras 1 a 5 de [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md):

- **El modo cocina**, un ajuste del aparato (lo decidió Richi): toques de 64 px,
  contraste 7:1, sin gestos que no sean un toque, y los botones de subir y bajar del
  Panel de vuelta. Se propone encendido en el alta de una tableta de cocina.
- **Las flechas y las gráficas del Panel en Inventario, Servicio y Equipo**, con el
  mismo `Indicador` y `un_indicador` ampliado.
- **Inicio en cada app**, solo al entrar desde la rueda.
- **Estados vacíos con dibujo y una acción**, cargados aparte.
- **El tema oscuro repasado con capturas**, y **las fotos de producto** en el almacén.

**Terminado cuando:** una prueba recorre las pantallas de cocina con el modo puesto y
ningún botón baja de 64 px ni de 7:1; las tres apps enseñan sus cifras con flecha y la
del food cost cuadra con el Panel; y las capturas en oscuro se comparan en la prueba.

**Cómo se comprueba que no rompe lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa`, `pnpm cobertura` y `pnpm bd:comprobar-api` contra
Supabase.
