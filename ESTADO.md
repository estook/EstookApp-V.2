# ESTADO DEL PROYECTO

Última actualización: 23 de septiembre de 2026 · **Antes de M8. Todo fusionado y desplegado hasta la #63. V se fusiona en dos partes: la primera —modo cocina, «Cómo va», el Resumen, el mosaico, Ajustes por secciones, el aspecto nuevo y el arreglo de entrar— tiene su pull request abierto y esperando a Richi. Quedan los puntos 4 y 5**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo
> último. **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> **¿Empiezas un chat nuevo?** Con decir «lee `ESTADO.md` entero y dime dónde
> estamos» basta. El porqué y los casos raros, en
> [`docs/empezar-un-chat-nuevo.md`](docs/empezar-un-chat-nuevo.md).
>
> Aquí está lo que hace falta para trabajar hoy. **Lo que hizo cada módulo, con sus
> fallos y sus porqués, está entero en
> [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)**, y las
> razones de fondo, en [`docs/decisiones/`](docs/decisiones/).

---

## 1 · Dónde estamos

_Producción comprobada el 23 de septiembre de 2026 con `bd:comprobar` y `bd:comprobar-api`._

|                |                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6½** ✓ · **M7, entregas 1, 1½, 1¾, 1⅞ y 4** ✓ (#44 a #49) · **A1 · la puerta del admin** ✓ (#53, #54) · **E1 · crear cuenta y Google** ✓ (#56)     |
| **Ahora**      | **Antes de M8**, con la entrega **V · Lo que se ve** a medias: puntos 1, 2 y 3 y la mejora 7, hechos. **E2 · Stripe** espera a la cuenta de Stripe de Richi    |
| **Pruebas**    | En la rama de V, el 23-sep: **1.147** unitarias y de base, **420** de pantalla, todas en verde · catálogo **122 de 128** (95 %), con sus seis deudas apuntadas |
| **Rama**       | `main`, con todo fusionado hasta la **#63**. Y `v-lo-que-se-ve`, con `main` dentro: **su primera parte, con el pull request abierto** y esperando a Richi      |
| **Base**       | En Supabase, **39 de 39** ✓, igual que `main`. 58 tablas (55 en `estook` y 3 en `plataforma`), todas con seguridad por filas. **La `0040` va con V**           |
| **API**        | **Desplegada el 22-sep a las 17:55, con la #63 dentro** ✓: conoce las 44 consultas y los 83 comandos de `main`                                                 |
| **Sitio**      | `estook.com`, `/app/` y `/admin/` responden 200. Se publica solo al fusionar                                                                                   |
| **Entrar**     | App: Ricardo (`ikatz`) y las cuentas reales de abajo. Admin: **`estookapp@gmail.com` y Santi**, los dos con segundo factor                                     |
| **Dirección**  | **Evolución 1.1**: de aplicación de gestión a sistema operativo del local, **y de no cobrar a cobrar**                                                         |

> **M8 no empieza hasta que las veinte mejoras y el panel de administración estén al
> 100 %.** Lo decidió Richi el 16 de septiembre. Los planes:
> **[`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)** y
> **[`docs/panel-de-administracion.md`](docs/panel-de-administracion.md)**.

### El orden, y dónde estamos en él

| #   | Entrega                          | Cómo está                                                             |
| --- | -------------------------------- | --------------------------------------------------------------------- |
| —   | **A1 · La puerta del admin**     | ✓ en producción (#53, #54)                                            |
| —   | **E1 · Crear cuenta y Google**   | ✓ en producción (#56)                                                 |
| 1   | **V · Lo que se ve**             | **A medias.** Puntos 1, 2 y 3 de 5 y la mejora 7, en `v-lo-que-se-ve` |
| 2   | **E2 · El pago con Stripe**      | **Espera a Richi** (abajo). Va en paralelo a V                        |
| 3   | **O · Lo que se ordena**         | Falta                                                                 |
| 4   | **A2 · Clientes**                | Falta                                                                 |
| 5   | **R · El reloj y los avisos**    | Falta · lleva dentro la entrega 2 de M7                               |
| 6   | **H · Horarios**                 | Falta · lleva dentro la entrega 3 de M7                               |
| 7   | **I · La app instalable**        | Falta                                                                 |
| 8   | **L · El lector**                | Falta                                                                 |
| 9   | **A3 · Vendedores y códigos**    | Falta                                                                 |
| 10  | **A4 · Ventas**                  | Falta                                                                 |
| —   | **M8 · Inventario y desviación** | Después de todo lo anterior                                           |

### La entrega V, punto por punto

El plan entero está en [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md),
apartado «V · Lo que se ve». **Rama `v-lo-que-se-ve`, sin pull request todavía.**

| Punto | Qué                                                            | Cómo está               |
| ----- | -------------------------------------------------------------- | ----------------------- |
| **1** | **Modo cocina**: 64 px, AAA, y ni un gesto que no sea un toque | **Hecho**, sin fusionar |
| **2** | **«Cómo va»**: las cifras con flecha en todas las apps         | **Hecho**, sin fusionar |
| **3** | **Cada app abre con su Resumen**, y el mosaico y el aspecto    | **Hecho**, sin fusionar |
| **7** | **Ajustes en secciones, con buscador** (era de la entrega O)   | **Hecho**, sin fusionar |
| **4** | Estados vacíos que invitan a empezar                           | **La siguiente**        |
| **5** | Tema oscuro repasado, y fotos de producto                      | Falta                   |

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

**Lo que el punto 2 dejó hecho** ([0044](docs/decisiones/0044-las-cifras-de-cada-app.md)):
**«Cómo va»** en la primera pantalla de Inventario, Servicio y Equipo, debajo de lo
urgente, con «7 días · 30 días» y cada tarjeta llevando a su detalle. La tarjeta del
Panel pasa a `@estook/ui` y la usan todos. **Seis cifras nuevas** —valor de la cámara,
bajo mínimo, cajas cerradas, horas del equipo, coste de personal y retrasos—, contadas
**como las pantallas de las que salen**, con su prueba contra la base que lo compara.
Y **Ajustes → «Cuándo es llegar tarde»**: cinco minutos que cada local cambia
(migración `0040`), con su columna de retrasos en Equipo · Fichajes (que entonces se llamaba «Resumen»).

**Lo que el punto 3 dejó hecho** ([0045](docs/decisiones/0045-el-aspecto-y-el-orden.md)),
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

### Lo que hay de verdad en producción

_Leído de la base el 22 de septiembre de 2026._ Cuatro organizaciones reales, además de las tres de ejemplo:

| Organización  | Nacida    | Suscripción                       | Alta del local            |
| ------------- | --------- | --------------------------------- | ------------------------- |
| `ikatz`       | 3 de sep  | **prueba, caducada el 17 de sep** | Terminada                 |
| `burger-king` | 4 de sep  | **prueba, caducada el 18 de sep** | Terminada, dos locales    |
| `prueba1`     | 17 de sep | `pendiente_de_pago`               | **Se quedó en el paso 0** |
| `prueba1-1`   | 17 de sep | prueba, hasta el 28 de sep        | Terminada                 |

Y el uso real: 9 productos, 36 movimientos, 4 cierres de caja, 21 fichajes, 3 pedidos
y 2 proveedores.

**Tres cosas que salen de aquí y no se pueden perder:**

1. **Dos pruebas están caducadas, y la API no lo hace cumplir.** Hoy no pasa nada
   porque E1 solo elige pantalla. **El día que E2 lo cumpla en el servidor, Richi se
   queda fuera de su propio local.** E2 tiene que pasarlas a `activa` **en la misma
   entrega**, y se comprueba antes de fusionar.
2. **Crear cuenta con correo: funcionando** desde el 23 de septiembre. Resend contestaba
   **403, «The gmail.com domain is not verified»** porque `CORREO_REMITENTE` estaba
   puesto a un Gmail. La #63 hace que el servidor se dé cuenta, y Richi cambió el
   secreto a `Estook <hola@estook.com>` y comprobó que los códigos llegan.
3. **`prueba1` se quedó en el paso 0 del alta.** Una cuenta real que entró y no pasó
   de la primera pantalla. Es lo que viene a arreglar la entrega **V**.

---

## 1½ · Lo que hay que tener en cuenta de aquí al final

_Las consecuencias del cambio de rumbo del 20 de septiembre, en una lista. Ninguna es
para hoy; todas son para no llevarse una sorpresa._

1. **Estook es fabricante de un sistema de facturación**, y eso no se deshace. Obliga a
   la declaración responsable dentro de la app, a numerar sin huecos, a poner el QR, y
   a que **nada de facturación llegue a producción sin la revisión escrita del asesor**
   (las siete condiciones del capítulo 9 del Anexo).
2. **La facturación es intocable.** Un ticket emitido no se edita ni se borra desde
   ningún sitio, ni con una migración de arreglo ni desde el panel interno. Es la regla
   15 de A1 y el principio 17 del Manifiesto.
3. **Son seis documentos maestros, no cinco**, y en sala, cocina, cobro, caja o
   facturación **manda el Anexo** por encima de los demás.
4. **Las pruebas leen los documentos.** Cambiar la tabla de B5 del Plan pone la
   integración en rojo hasta que el código la siga. **Eso es la prueba funcionando**, no
   un estorbo: es lo que impide que el documento y la aplicación se separen en silencio.
5. **El TPV es la Fase 4**, después de M17. No se adelanta, y lo que ya está preparado
   para él —dos vistas apagadas en Servicio— está marcado `M20C` y no hace nada.
6. **Hay cuatro sitios de lo construido que se quedan cortos** para el TPV, y uno que
   no cabe en el modelo actual: **un aparato no puede existir sin dueño**, y el Anexo
   exige que la tablet de sala sea del local. Está todo en
   [`docs/lo-que-el-tpv-toca-de-lo-construido.md`](docs/lo-que-el-tpv-toca-de-lo-construido.md),
   con lo que hay que decidir **antes de escribir la primera pantalla de Sala**.
7. **Cobrar con Estook trae un coste por cliente** (Verifacti, por NIF). Las cuentas
   salen y el TPV cabe en Pro, pero **falta preguntarles qué se paga con menos de diez
   NIF**: [`docs/el-precio-de-verifacti.md`](docs/el-precio-de-verifacti.md).
8. **Canarias entra con IGIC; Ceuta y Melilla, todavía no.** Foral y SII quedan fuera
   **por ley** ([0043](docs/decisiones/0043-hasta-donde-llega-la-facturacion.md)).
9. **El asesor fiscal es un bloqueante de verdad**, no un trámite: los tipos de IVA, el
   texto del justificante provisional, las propinas y la revisión del planteamiento
   entero. Sin eso, M20B no sale a producción.
10. **Y antes de todo eso, M8 no empieza** hasta que las veinte mejoras y el panel de
    administración estén al 100 %.

---

## 0 · Los seis documentos maestros

Viven en [`docs/maestros/`](docs/maestros/) en Markdown; el PDF sale con
`pnpm maestros`. Se leen en este orden:

| Documento                                                                    | Versión | Qué responde                       | Cuándo se lee                                          |
| ---------------------------------------------------------------------------- | ------- | ---------------------------------- | ------------------------------------------------------ |
| [Evolución](docs/maestros/Estook-Evolucion.md)                               | 1.1     | Hacia dónde va y en qué orden      | **Primero, siempre**                                   |
| [Manifiesto](docs/maestros/Estook-Manifiesto.md)                             | 1.2     | Qué es el producto y cuánto cuesta | Antes de diseñar                                       |
| [Plan de desarrollo](docs/maestros/Estook-Plan-de-Desarrollo.md)             | 1.2     | Cómo se construye y con qué reglas | Antes de escribir código                               |
| [Roles y administración](docs/maestros/Estook-Roles-y-Administracion.md)     | 1.2     | Qué ve exactamente cada persona    | Antes de tocar permisos                                |
| [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)           | 1.2     | Qué desencadena cada cambio        | Antes de cerrar módulo                                 |
| [Anexo · TPV y facturación](docs/maestros/Estook-Anexo-TPV-y-Facturacion.md) | 1.0     | Cómo se cobra y se factura         | Antes de tocar sala, cocina, cobro, caja o facturación |

Y el mapa corto de lo que queda, en
[`docs/MAPA-de-modulos.md`](docs/MAPA-de-modulos.md).

**Manda el más específico.** En todo lo que toque sala, cocina, cobro, caja o
facturación **manda el Anexo**. Si dos se contradicen de verdad, se para y se
pregunta (regla 13). Y si uno se queda corto frente a lo que el producto
necesita, se propone lo mejor y **se cambia el documento**, con su decisión
escrita: un maestro no frena el producto.

**Dónde está cada cosa, desde el 20 de septiembre de 2026:**

- **Los seis maestros vigentes**, en `docs/maestros/`. Es su sitio de siempre, y
  por eso `pnpm maestros` y los enlaces del código siguen funcionando sin tocar
  nada.
- **Las versiones anteriores**, en
  [`docs/antiguos/maestros/`](docs/antiguos/maestros/), con sus PDF. **No se
  borran:** son la referencia de qué decía el proyecto antes del cambio de rumbo.
- **Todo lo demás sigue donde estaba**: las decisiones en
  [`docs/decisiones/`](docs/decisiones/), la
  [historia de los módulos](docs/historia-de-los-modulos.md), las auditorías de
  módulo, los pasos y los planes.

Lo que cambió con la **Evolución 1.0** sigue en pie: el tamaño del paquete se
mide y no bloquea (bloquea la velocidad); cada módulo nace con su capa
inteligente dentro; y nada entra aislado (regla 14).

---

## 0½ · Cambio de rumbo · Estook también cobra

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

### Lo único que se ha tocado de código, y por qué

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

### Lo que se ha corregido de los documentos

- **Anexo 1.4**, reescrito con la [0043](docs/decisiones/0043-hasta-donde-llega-la-facturacion.md), y **4.3 y las pruebas 18 y 19 puestas de acuerdo con él**: decían que Canarias no podía activar el módulo.
- **Anexo 4.5, 4.6, 4.7 y 4.14**, con las respuestas comprobadas y su fuente.
- **Plan A4** decía «los cinco documentos» cuando ya son seis.
- **El mapa de módulos** decía «el módulo 22 de 36» y «M7, a medias». Ahora dice lo que es, y dice que mandan el Plan y este fichero.
- Líneas duplicadas en el Anexo 3.7 y en la tabla de Roles 1.12.

El repaso del esquema y del código contra el Anexo está hecho y escrito en
**[`docs/lo-que-el-tpv-toca-de-lo-construido.md`](docs/lo-que-el-tpv-toca-de-lo-construido.md)**:
qué hay que ampliar del cierre de caja, del motor fiscal y de los permisos, y las dos
cosas que hay que **decidir antes de escribir la primera pantalla de Sala**.

### Las reglas duras de esta parte

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

### Los [VERIFICAR] · lo comprobado el 20 de septiembre de 2026

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
  [0043](docs/decisiones/0043-hasta-donde-llega-la-facturacion.md): **Canarias entra
  con IGIC** —el esquema y el motor fiscal ya lo soportan desde la `0012`—, **Ceuta y
  Melilla esperan** por el IPSI y su categoría de establecimiento, y la pantalla
  distingue «no se puede» de «todavía no». El Anexo 1.4 está reescrito.

### Lo que queda, y de quién es

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
se piden está al final del apartado **«Ahora mismo · es de Richi»**, más abajo. Y el
precio real de una impresora que pregunta sola (Anexo 6.3), al comprarla.

**Y uno que ya está resuelto: el precio de Verifacti.** Llegó su propuesta el 21 de
septiembre: **por NIF activo en producción**, de 5,59 € con diez a 3,71 € con cincuenta,
sin IVA, con 3.000 facturas al mes por NIF incluidas. Las cuentas salen y **el TPV cabe
en Pro sin subir el precio**; queda **una pregunta para ellos: qué se paga con menos de
diez NIF**. Todo, en
[`docs/el-precio-de-verifacti.md`](docs/el-precio-de-verifacti.md). **La propuesta
caduca hacia el 19 de octubre.**

**Y uno que no depende de nadie de aquí:** el **[VERIFICAR] del registro horario**
(Plan, M15). El Real Decreto de fichaje digital sigue **en tramitación y sin publicar
en el BOE** a día de hoy, así que no obliga. Cuando se publique hay que mirar el
formato exacto de la exportación para la Inspección y si exige una API. **Hasta
entonces se hace la exportación y no se inventa ningún protocolo.**

---

## 2 · Qué hay que hacer

### Ahora mismo · es de Richi

**Ya hecho por Richi, y comprobado en la base el 23 de septiembre** —no se vuelve a
pedir—: **Resend** (el dominio `estook.com` y el remitente `hola@estook.com`, los
códigos llegan), **entrar y crear cuenta con Google** (los dos secretos puestos, cuatro
cuentas creadas con Google) y **Places** (IKATZ enlazado con Google desde el 16-sep).

**Lo único que falta de Richi, y es lo que desbloquea E2:**

1. **Activar la cuenta de Stripe** —datos fiscales y cuenta bancaria— y dejarla en
   modo prueba. **No crear productos ni precios a mano**: los crea el código con los
   planes del Manifiesto, para que el precio viva en un solo sitio.
2. **El alta de autónomo en Hacienda** (modelo 036/037), si no está hecha. Es del
   asesor, no del código, pero es lo que de verdad bloquea cobrarle al primer cliente.

> **Los datos del titular ya están puestos** (#59). Mientras no haya sociedad, en
> `estook.com/privacidad/` y `/condiciones/` sale el **domicilio particular** de
> Ricardo: es lo normal en un autónomo y lo exige el artículo 10 de la LSSI-CE. Se
> cambia en un solo sitio el día que se constituya la sociedad.

**Cuando quieras, y no bloquea nada:** Business Profile (las reseñas) espera a que
Google apruebe el acceso; repasar las zonas de tu género y, una vez, quitar el IVA a
tus precios de antes (Inventario → Productos → «De dónde»; Ajustes → Tu local → «Tus
precios de compra»). La IA no se usa todavía: su clave se saca en M22.

**Las claves de Verifacti · no hacen falta todavía, y así se sacan cuando toquen.** El
trabajo de M20B se hace **primero contra un adaptador simulado**, con toda la lógica,
las pruebas y las pantallas terminadas. El proveedor de verdad se enchufa al final, y
en dos momentos:

- **Cuando haya que probar el alta de un NIF y el webhook** (paso 4 del alta de
  facturación). Hace falta la **clave de pruebas**: se saca de la cuenta gratuita que
  ya tienes, en el panel de Verifacti → ajustes de la cuenta para la clave de cuenta, y
  dentro de la empresa de prueba para la suya. Empieza por `vf_test_`. **La URL no
  cambia entre entornos: la clave es la que decide**, así que una clave de pruebas en
  producción emite de mentira sin avisar.
- **Cuando se vaya a producción**, y solo con las siete condiciones del capítulo 9 del
  Anexo cumplidas. Hace falta: **suscripción de pago** con Verifacti, dar de alta tu
  **NIF real** en su panel, y **firmar el modelo de representación** ante Hacienda —lo
  da relleno el propio proveedor, y **solo lo puede firmar el titular**—. La clave
  empieza por `vf_prod_`.

**Cómo me las pasas:** nunca por el chat. Se ponen como secretos en Supabase Vault, y
me dices solo que están puestas y con qué nombre. **Y una que no hay que tocar jamás:**
el endpoint de borrado permanente de un NIF en Verifacti elimina sus registros sin
vuelta atrás. Dar de baja a un cliente es **desactivar**.

**Ya hecho, y comprobado contra producción el 23 de septiembre:** crear cuenta con correo, funcionando · las fusiones #51 a
#63 · las migraciones **hasta la `0039`** aplicadas · la API desplegada el 22-sep a las
17:55, **con la #63 dentro** · el cliente de Google respondiendo ·
**`estookapp@gmail.com` y Santi, los dos dentro del admin con su segundo factor** · y
**cuatro cuentas creadas de verdad con Google**.

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

| Orden | Entrega                       | Qué lleva                                                     | Cómo está                        |
| ----- | ----------------------------- | ------------------------------------------------------------- | -------------------------------- |
| 1     | **A1 · La puerta del admin**  | Entrar con segundo factor, la primera cuenta, más admins      | **En producción**, con su repaso |
| 2     | **V · Lo que se ve**          | Modo cocina, flechas, Resumen, Ajustes, vacíos, fotos         | **A medias**, en su rama         |
| 3     | **O · Lo que se ordena**      | Botón de acciones, «Hoy» del Panel, paneles por rol, semáforo | Falta                            |
| 4     | **A2 · Clientes**             | Lista, ficha, contrato y actividad, editar con auditoría      | Falta                            |
| 5     | **R · El reloj y los avisos** | El reloj, la entrega 2, pedido sugerido, precios, informe     | Falta                            |
| 6     | **H · Horarios**              | La entrega 3, con el coste en vivo y las horas extra          | Falta                            |
| 7     | **I · La app instalable**     | Push y sin conexión                                           | Falta                            |
| 8     | **L · El lector**             | Códigos de barras                                             | Falta                            |
| 9     | **A3 · Vendedores y códigos** | Vendedores, `?ref=`, asignaciones con historial               | Falta                            |
| 10    | **A4 · Ventas**               | El tablero                                                    | Falta                            |

### Antes de M8 · E1, crear cuenta y entrar con Google

Richi, el 16 de septiembre: registrarse **con Google o con correo y verificación**,
entrar **con cuenta, PIN o Google** «que se vean bien las opciones», y una **portada
básica** con los dos accesos. Y: **se paga al empezar**, y la prueba de 12 días es una
**oferta que se enciende desde el admin**. Todo en la
[0042](docs/decisiones/0042-registro-abierto-google-y-la-oferta.md).

| Entrega                        | Qué lleva                                                                                                                   | Cómo está                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **E1 · Entrar y crear cuenta** | Portada, privacidad y condiciones, crear cuenta (correo con código o Google), Google al entrar, Elegir plan, admin → Oferta | **En producción** (#56), migrada y desplegada |
| **E2 · Pagar**                 | Stripe: pagar, portal, avisos; **el estado de la suscripción cumplido en el servidor**                                      | La siguiente                                  |
| **E3 · Google en el alta**     | Places en el paso 4 del alta; Business Profile cuando Google apruebe                                                        | Falta                                         |

**Lo que E1 no hace todavía, y hay que saberlo:** **no se cobra** —Elegir plan enseña
los planes y dice que el pago se abre en unos días—, y **el estado de la suscripción no
se cumple en la API**: una cuenta pendiente de pago ve Elegir plan, pero la API no le
impide nada si la llama a pelo. Eso es E2, antes de anunciar nada. Tampoco hay **recuperar
la contraseña por correo** (hoy la da quien lleva el local, o la consola).

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **De las veinte mejoras, ninguna en producción.** La 1 (modo cocina), la 2 (las
  cifras de cada app), la 3 (el Resumen) y la 7 (Ajustes en secciones) están hechas en
  la rama de V, sin fusionar. Todas tienen su plan
  y su entrega; la tabla con cada una está en
  [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md).
- **Del admin, solo la puerta** (A1). **No hay clientes** —lista, ficha tipo CRM,
  contrato y actividad, notas, editar, exportar—, **ni vendedores y códigos** (`?ref=`,
  asignaciones, comisiones), **ni ventas** (tablero y gráficas). Los niveles
  comercial, soporte y vendedor existen en la base y no se pueden dar. El detalle, con
  lo que espera a Resend, Stripe o M26, en
  [`docs/panel-de-administracion.md`](docs/panel-de-administracion.md), arriba del todo.
- **De M7, las entregas 2 (avisos a quien manda) y 3 (Horarios)**, que van dentro de
  R y H; **Business Profile**, que espera a Google; y **el reloj diario**, que va en R.
- **Lo que decidió Richi que espera a su módulo:** leer fotos (M22), responder reseñas
  (Business Profile) y la carta con QR (M12, con el QR definitivo antes, en O).

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
   Las tres preguntas del plan de mejoras **ya las contestó Richi** el 16 de septiembre:
   lo que espera a su módulo se queda ahí, el orden es el recomendado y el modo cocina lo
   elige cada aparato.

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

**Web:** https://estook.com · `/app/` · `/carta/` · `/admin/` (**con puerta**: contraseña
y segundo factor; dentro, Administradores, Auditoría y el catálogo del sistema de diseño). El DNS lo lleva Hostinger: cuatro registros
A a GitHub Pages y `www` por CNAME. La dirección vieja redirige sola
([0036](docs/decisiones/0036-la-direccion-es-estook-com.md)).

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan
gratuito, por el agrupador de sesión (la conexión directa de los proyectos nuevos
solo va por IPv6). Todas las tablas con seguridad por filas; la única vista es
`estook.existencias`. **39 migraciones, 55 tablas en `estook` y 3 en `plataforma`,
aplicadas** (comprobado el 23 de septiembre). La `0038` y la `0039` son las de E1
—crear cuenta, Google, la oferta y los intentos que se cuentan—; la `0040`, el margen
de retraso de cada local, **va con V** y se aplica al fusionarla. Se comprueba con `.\estook.cmd bd:comprobar`, que lo lee de la base y no de aquí.

**Organizaciones:** `bar-centro`, `casa-lola` y `grupo-costa` son semillas de
ejemplo, **con las cuentas cerradas desde el 3 de septiembre** —tenían una
contraseña publicada en este repositorio—. **`ikatz` es el negocio de verdad**, y
`bd:comprobar` enseña además **`burger-king`** (dos locales y una persona con
dirección), que **es de prueba: la creó Richi** (16 de septiembre). Y `prueba1` y
`prueba1-1`, las dos cuentas creadas con Google el 17.

**Errores:** `estook-app` en Sentry, solo «Error monitoring», con el repositorio
enlazado. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; en
Secrets, `TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. **`GOOGLE_MAPS_KEY`, puesta** en los
secretos de Supabase según Richi (16-sep; sin comprobar en Ajustes). **Los de E1, puestos**:
`GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET` (se entra con Google) y
`RESEND_API_KEY` (Resend contesta); y `CORREO_REMITENTE`, a `Estook <hola@estook.com>` desde el 23-sep. Todo en
[`config/claves.md`](config/claves.md).

**El peso**, medido con `pnpm tamano` el 23 de septiembre **en la rama de V**:

| Aplicación      | Peso inicial     | De los cuales tipografía |
| --------------- | ---------------- | ------------------------ |
| `app`           | **292,1 KB**     | 106,1 KB                 |
| `admin`         | **209,8 KB**     | 106,1 KB                 |
| `web` · `carta` | 166,0 · 167,1 KB | 106,1 KB                 |

La referencia es 250 y **se mide, no bloquea**; el presupuesto de velocidad, que es el que manda, pasa en la prueba de pantalla. Lo de V es sobre todo **«Cómo va»** (la tarjeta, que ya estaba, y tres filas pequeñas), las reglas de `cocina.css` y, en el punto 3, **3,6 KB más**: el mosaico, el catálogo de Ajustes y la tarjeta nueva; y **4,5 KB más en `app` y 4,4 en `admin`** con la red de debajo de cada pantalla y su aviso a Sentry. **Crear cuenta y Google (E1) suben `app` 4,7 KB**: la pantalla de crear cuenta, la de elegir plan y la vuelta de Google, que hacen falta antes de entrar; la web baja 0,9 KB al quitar el marcador de M0. **La puerta del admin sube `admin` 16 KB**: TanStack Query y el cliente de la API, que la app ya llevaba; `app` no cambia. El local en Google sube `app` 1,8 KB
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

| Módulo   | Qué dejó                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| **M0**   | Monorepo, reglas, integración continua con el candado de `main`, publicación en GitHub Pages                             |
| **M1**   | Alcances, roles y permisos en la base, con seguridad por filas en cada tabla                                             |
| **M2**   | La API (Hono), el despachador de comandos y consultas, los motores de dinero, fechas e impuestos                         |
| **M3**   | El sistema de diseño, el esqueleto de las ocho apps, la rueda y el buscador universal                                    |
| **M4**   | El login propio, PIN, segundo factor, sesiones y el primer despliegue de verdad                                          |
| **M5**   | El alta en ocho pasos, el catálogo de referencia, los ejemplos y el modo demostración                                    |
| **M6**   | Inventario: productos, el libro de movimientos, precio medio ponderado, lotes, previsión                                 |
| **M6½**  | La capa de producto: destinos y vistas, Panel en el servidor, merma, fichajes, caja y equipo                             |
| **M7**   | Compras y Calendario (#44); el repaso, las bases, las apps conectadas y el Panel vivo                                    |
| **→ M8** | Los planes de las veinte mejoras y del admin; A1, la puerta del admin; E1, crear cuenta y Google; V, a medias en su rama |

### Antes de M8 · E1, crear cuenta y entrar con Google

- **Crear cuenta** en `estook.com/app/#/crear-cuenta`: el negocio y las condiciones
  arriba, y **Google** o **correo con un código de seis cifras** (30 minutos, 5
  intentos, uno por minuto, diez cuentas por hora por dirección). **No se dice si un
  correo tiene cuenta**, ni por la respuesta ni por el tiempo.
- **Google con código y PKCE**, sin scripts de Google en la página; el secreto solo lo
  tiene la API; mismo correo verificado, misma cuenta. Puertos con su adaptador de
  mentira para las pruebas (`correoEnMemoria`, `identidadDeMentira`).
- **La cuenta nace pendiente de pago** y va a **Elegir plan**; con la **oferta**
  encendida en **admin → Oferta**, nace en prueba con sus días.
- **La portada básica**, la **privacidad** y las **condiciones**
  ([`docs/web-publica.md`](docs/web-publica.md)).
- **Entrar**: Google arriba, contraseña y PIN en dos pestañas, crear cuenta abajo.

**Lo que se encontró, y es serio:** **los intentos fallidos de entrar no se guardaban
desde M4**. El fallo deshacía la transacción entera, y con ella el contador: el bloqueo
a los cinco intentos de contraseña y de PIN **no bloqueaba nunca**. Y el segundo factor
**no tenía límite de intentos**. Ahora un fallo puede guardar lo suyo
(`falloQueSeGuarda`), la `0039` cuenta los del segundo factor, y hay pruebas contra la
base que fallaban sin el arreglo. También, que un código del segundo factor mal escrito
decía «el correo y la contraseña no cuadran».

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
- **El repaso de después de fusionar** (#54, en producción): con la contraseña de un
  solo uso sin cambiar **no se lee nada del admin**, ni por la API a pelo;
  `bd:dar-admin` **rescata** a un admin (`--nueva-clave`, `--sin-segundo-factor`); y la
  cabecera del móvil pasa a dos líneas.

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
69. **Una puerta nueva se prueba con cada estado de la sesión**: sin segundo factor,
    con él a medias y **con la contraseña por cambiar**. La del admin miraba los dos
    primeros y dejaba leer con la contraseña de un solo uso; lo vio el repaso, no las
    pruebas.
70. **Lo que da un acceso tiene que poder rescatarlo.** El admin nació sin forma de
    volver a entrar si se perdía la contraseña o el móvil: una puerta sin llave de
    repuesto es una puerta que un día hay que tirar.
71. **Cambiar un documento maestro es cambiar el código.** La prueba de B5 lee la tabla
    del Plan **del fichero**, así que poner el Plan 1.2 en su sitio puso la integración
    en rojo al momento: la tabla decía «En marcha · Caja · Cierre» y el catálogo decía
    otra cosa. **Eso es la prueba funcionando**, no un estorbo. Un documento maestro que
    nadie compara con el código es un documento que se queda atrás en silencio.
72. **Se entra por lo que existe, no por lo primero de la lista.** Las tablas del Plan
    se escriben en el orden en el que se entienden —«En marcha · Caja · Cierre» es el
    orden de un día—, no en el que se construyen. Con `vistas[0]`, Servicio habría
    abierto en «En marcha», que es M16, y el cierre de caja de M6½ —lo único que
    funciona ahí— habría quedado detrás de un cartel. Es la pestaña muerta de B5 un
    piso más abajo, y se arregla igual: `dondeEntraEnElDestino`.
73. **Dos sitios que deciden lo mismo acaban decidiendo distinto.** La dirección a la
    que se redirige y la vista que se pinta las calculaban `rutaDe` y `PantallaDeApp`
    por separado. Mientras el criterio era «la primera» daba igual; en cuanto dejó de
    serlo, habrían sido dos criterios y un bucle de redirecciones. Ahora los dos llaman
    a la misma función (regla 6).
74. **Un número escrito en un documento envejece solo.** El mapa decía «el módulo 22 de
    36» y el Plan decía «los cinco documentos» cuando ya eran seis. Si un número no lo
    comprueba nadie, o se quita o se le pone una prueba: la de las fichas de módulo
    pasó de 31 a 34 y saltó sola.
75. **Tener un dominio verificado y enviar desde él son dos cosas.** `estook.com`
    llevaba verificado en Resend desde el 17 de septiembre, y crear cuenta no
    funcionaba: `CORREO_REMITENTE` estaba puesto a `estookapp@gmail.com` —el correo de
    la cuenta, que es lo que parece razonable— y **desde Gmail no se envía**. Se buscó
    el fallo un día entero en el sitio equivocado. Ahora el servidor **comprueba el
    remitente antes de llamar a Resend** y, si es de un correo gratuito, lo dice y usa
    el de siempre en vez de quedarse sin mandar nada.
76. **Cuando algo de fuera falla, lo primero es leer lo que contesta, no deducirlo.**
    El motivo literal —«The gmail.com domain is not verified»— llevaba un día en el
    registro del servidor, con todas las letras. Mientras no se miró, se estuvo
    adivinando; en cuanto se miró, el arreglo fue cambiar un secreto. **La suposición
    más razonable no es un diagnóstico.**
77. **Un «terminado cuando» que no comprueba nadie no está terminado.** El modo cocina
    se dio por hecho con las pruebas de sus fichas, y su criterio pedía medir las
    pantallas. La prueba que las mide encontró tres fallos el primer día, uno de ellos
    desde M3: la letra grande y el modo cocina **no se aplicaban al abrir la app**.
78. **Cumplir en la ficha no es cumplir en la pantalla.** Una clase de utilidad
    (`min-h-[36px]`) gana a cualquier regla de la capa base, y un color con
    significado (el rojo, el acento de la app) no es un gris. Lo que se promete para
    toda la aplicación se mide en el navegador, pantalla a pantalla (`modo-cocina.spec.ts`).
79. **Una cifra que ya sale en otra pantalla se cuenta como allí**, y una prueba las
    compara. Y **lo que se tiene no se suma**: el valor de la cámara de una semana es
    una foto del último día, no siete fotos juntas.
80. **Una caché solo dice la verdad si sabe qué la ensucia.** Las cifras con flecha se
    guardaban un minuto y ni cerrar la caja ni apuntar una merma las refrescaban. Lo
    que cambia un dato refresca **todo** lo que lo enseña.
81. **Una prueba que pasa por el orden en que se ejecutan no prueba nada.** Las cifras
    de Inventario pasaban solo porque otra prueba, antes, daba de alta un producto.
    Cada prueba se prepara lo suyo.
82. **Una rejilla por filas estira lo corto.** Una fila mide lo que su tarjeta más alta,
    así que la de tres líneas acababa con ochocientos píxeles de nada. Varias tarjetas
    en una pantalla van en `Mosaico` (0045).
83. **Un color se mide en los dos temas, y también cuando va de fondo.** «7 días» iba
    en `bg-charcoal text-superficie`: blanco sobre casi negro en claro y 1,4:1 en
    oscuro. Llevaba así desde M6½ porque la prueba de contraste mira la paleta, no las
    parejas que escribe cada pantalla. Ahora hay una que busca esa pareja.
84. **Dos copias de una paleta acaban siendo dos paletas.** «El del sistema» en claro
    seguía con el fondo de B1 tres semanas después de que el tema claro lo cambiara.
    Lo que se escribe dos veces se compara en una prueba, o no se escribe dos veces.
85. **Lo que todavía no existe no se enseña en la pantalla que se usa.** Una tarjeta de
    «lo que falta por venir» o un botón apagado con su módulo en mitad del día a día
    son texto sobre el futuro que alguien tiene que leer cada vez. Va en el menú
    («Llega después») y en el plan.
86. **Un documento se sube igual que el código: con `verifica` antes.** Los pasos de V
    se subieron sin pasarla, con los tres comandos
    escritos `.estook.cmd` sin la barra, que PowerShell no encuentra,
    y con la carpeta rota; la prueba del lanzador lo cazó en GitHub, no aquí. Y al escribir un fichero desde la consola, **las barras
    `\` se las come la consola**: se escribe con el editor, no con `sed` ni `node -e`.
87. **Un rojo dentro de una vuelta en verde también se mira, y un arreglo se comprueba
    en el sitio donde falló.** «1 flaky» quiere decir que una prueba falló y pasó al
    repetirla. El 22-sep era Safari («WebKit encountered an internal error») al
    recargar; se cambió a abrir la dirección otra vez y se dio por arreglado **sin
    verlo en la integración continua**, que es el único sitio donde corre Safari. El
    23-sep volvió a pasar, al abrir. Es el motor del navegador antes de cargar nada, no
    Estook: ahora las diez ayudas de entrar abren con `abrirSinQueSeCaiga` (`pruebas/e2e/abrir.ts`),
    que repite una vez **solo con ese error**, y una prueba vigila que no tape ningún otro.
88. **Una puerta que va a decir que no, lo dice antes de pedir nada más.** Pedir el
    código del segundo factor para luego contestar «no tienes negocio» abría una sesión
    inútil y hacía creer que las cuentas se mezclaban. Y **una pantalla que pide algo
    dice a quién se lo pide**: el código sin el correo delante no se sabe de quién es.
89. **Lo que se descarga a trozos necesita una red debajo.** Partir la app para que
    abra rápido (B7) crea un fallo nuevo: el trozo que no llega. Sin nada que lo recoja,
    la primera versión que se publica con la app abierta deja pantallas en blanco. Lo
    cazó una prueba de Safari que falló una vez; mirado a fondo, no era Safari.

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
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con Google          |
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
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve               |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma        |
| **0033** | **Los precios de compra se guardan sin IVA, y se escriben como venga**      |
| **0034** | **Nadie gestiona el acceso de su igual: lo hace quien está por encima**     |
| **0035** | **El alta pregunta cómo se compra, y la cuenta la hace el dominio**         |
| **0036** | **La dirección es `estook.com`, y la sabe el código**                       |
| **0037** | **Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja**    |
| **0038** | **Cada producto es de una zona, y cada uno trabaja con la suya**            |
| **0039** | **El Panel se monta como un móvil, y cada uno se pone sus cifras**          |
| **0040** | **El local se busca en Google, con el tope contado antes de llamar**        |
| **0041** | **El panel de administración: el cliente es la organización**               |
| **0042** | **Registro abierto con correo o Google, y se paga al empezar salvo oferta** |
| **0043** | **Canarias entra con IGIC; Ceuta y Melilla esperan; foral y SII, fuera**    |
| **0044** | **Las cifras de cada app: la misma tarjeta, las mismas cuentas** (en V)     |
| **0045** | **El aspecto y el orden: Resumen, mosaico y Ajustes por secciones** (en V)  |

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
- **Las migraciones `0001` a `0040`.** Se amplían con una `0041`, nunca se editan
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
- **El mosaico** (0045): varias tarjetas en una pantalla van en `Mosaico`, y el Panel
  usa la misma medida (`usarFilasDelMosaico`). Volver a una rejilla por filas devuelve
  las tarjetas estiradas. **Y lo elegido va en `bg-texto text-superficie`**, nunca en
  `bg-charcoal text-superficie`, que en oscuro no se lee: una prueba lo vigila.
- **La red de debajo de cada pantalla** (`SiAlgoFalla`): en la raíz de la app y del admin,
  y alrededor del `<Outlet />` del esqueleto. Una pantalla nueva que se cargue aparte
  (`lazy`) queda cubierta sola; quitar la red devuelve las pantallas en blanco.
- **Qué ajustes hay y dónde viven**, en `pantallas/lasSeccionesDeAjustes.ts`: lo leen
  la pantalla, su buscador y el buscador universal. Un ajuste nuevo se escribe ahí.
- **Las cifras con flecha** (0039, 0044): **una sola tarjeta**, `TarjetaDeIndicador` de
  `@estook/ui`, para el Panel y las apps; cada cifra, en el dominio (`indicador.ts`), y
  **contada como la pantalla de la que sale**: la cámara como Inventario · Resumen
  (`lasFotosDeLaCamara`, del libro, sin guardar fotos), y las horas, el coste y los
  retrasos como Equipo · Fichajes (`lasEntradasDelHorario`, una sola pieza para los
  dos). Una cifra nueva que ya salga en otra pantalla lleva su prueba que las compara.
- **El modo cocina se hace en `cocina.css`**, nunca en una pantalla: los colores AAA
  calculados y la regla de 64 px para todo lo que se toca, **fuera de `@layer base`**
  para que ninguna clase de utilidad la pise. Y los tres ajustes del aparato —tema,
  letra y modo cocina— **se aplican en la raíz de la app** (`Aplicacion.tsx`), no en
  Ajustes.
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`, cuyas tablas se
  cambian en B5 del Plan primero), el de widgets (`packages/ui/src/panel/catalogo.ts`,
  donde cada widget construido dice su grupo) y el de acciones
  (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración, no desde la
  aplicación.
- **Las funciones `security definer`.** Son la puerta de atrás del sistema y están
  tasadas: una prueba las cuenta con sus nombres. **Treinta en `estook`** —las seis
  últimas, las de crear cuenta y Google (0042)— y **tres en `plataforma`**, `nivel_de`,
  `dar_acceso` (0041) y `oferta_vigente` (0042). Aquí ponía
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

## 8 · El siguiente paso · V, los puntos 4 y 5

**V se fusiona en dos partes** (23-sep): Richi quería ver ya lo hecho, y esperar a los
cinco puntos lo tenía mirando la web vieja. **La primera parte** —puntos 1, 2 y 3, la
mejora 7 y el arreglo de entrar— tiene su pull request abierto; lo que tiene que hacer
Richi está en [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md), sección V:
fusionar, aplicar la `0040` y desplegar la API, seguidos. **Los puntos 4 y 5** van en
una rama nueva, con su propio pull request.

### Lo que queda

- **4 · Estados vacíos con dibujo y una acción**, cargados aparte. Uno de los casos: con
  la cámara vacía, Inventario · Resumen enseña cómo empezar y no «Cómo va». Hoy los
  vacíos dicen «Se empieza por Productos» sin botón: el 4 les pone el botón.
- **5 · El tema oscuro repasado con capturas que se comparan en la prueba, y las fotos
  de producto.** Lo del tema del sistema ya está hecho (0045). Queda estrenar la
  comparación de capturas con Playwright y las fotos en el almacén del logo.

**Terminado cuando** (del plan): las tres apps enseñan sus cifras con flecha y la del
food cost cuadra con el Panel —hecho—; el modo cocina se mide en las pantallas —hecho—;
cada app abre con su resumen —hecho—; los vacíos invitan a empezar; y las capturas en
oscuro se comparan en la prueba.

**Cómo se comprueba que no rompe lo de antes:** `pnpm verifica`,
`pnpm prueba:e2e:completa` (que ya incluye `pnpm cobertura`) y, tras desplegar,
`.\estook.cmd bd:comprobar-api` contra Supabase.

## 9 · En paralelo · E2, el pago con Stripe

### Antes de empezarla

1. **E1 fusionada, migrada y desplegada.** ✓
2. **Los datos del titular** en las condiciones y la privacidad. ✓ Puestos en la #59.
3. **Richi con su cuenta de Stripe creada y activada**, en modo prueba. Las claves no
   pasan por el chat. **Falta.**

> **Lo que no se puede olvidar, con fechas de verdad.** `ikatz` tiene la prueba
> caducada desde el **17 de septiembre** y `burger-king` desde el **18**. Hoy no pasa
> nada porque la API no lo hace cumplir. **La entrega que encienda el cumplimiento tiene
> que pasar esas cuentas a `activa` en la misma entrega**, o Richi se queda fuera de su
> propio local el día del despliegue. Se comprueba antes de fusionar, no después.

### Qué entra

- Los **productos y precios** de la [0042](docs/decisiones/0042-registro-abierto-google-y-la-oferta.md)
  en Stripe, con el IVA incluido, al mes y al año; **pagar** desde Elegir plan (Checkout);
  **el portal** para cambiar tarjeta, plan o cancelar; **los avisos de Stripe**
  (webhook firmado, idempotente).
- **El estado de la suscripción cumplido en la API**: pendiente de pago, impago y la
  prueba caducada dejan de ser solo una pantalla.
- Stripe en la privacidad, y el admin sabiendo quién ha pagado.

**Terminado cuando:** una cuenta nueva paga en modo prueba de Stripe y entra al alta; una
pendiente de pago no puede escribir llamando a la API a pelo; y cancelar en el portal
deja la cuenta en solo lectura al acabar el periodo.
