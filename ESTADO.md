# ESTADO DEL PROYECTO

Última actualización: 24 de septiembre de 2026 · **Antes de M8. El repaso del 23-sep, en producción (#66). V, segunda parte —los vacíos, el oscuro y las fotos de producto— en `v-vacios-oscuro-y-fotos`, con su pull request y una migración (`0045`). Con ella, V entera**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último.
> **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> **¿Empiezas un chat nuevo?** Basta con «lee `ESTADO.md` entero y dime dónde estamos».
> Lo demás vive en su sitio, y aquí solo se enlaza:
>
> - **Lo que hizo cada módulo**, con sus fallos: [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)
> - **Lo aprendido fallando** (100 lecciones): [`docs/lecciones.md`](docs/lecciones.md)
> - **Las trece reglas** que no se discuten: [`docs/reglas.md`](docs/reglas.md)
> - **Por qué está hecho así**: [`docs/decisiones/`](docs/decisiones/)
> - **Los pasos de Richi** de cada entrega: [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)

---

## 1 · Dónde estamos

_Producción leída el 24 de septiembre de 2026, en una transacción de solo lectura, y la API desplegada preguntada por sus operaciones nuevas._

|                |                                                                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6½** · **M7** (entregas 1, 1½, 1¾, 1⅞ y 4) · **A1**, la puerta del admin · **E1**, crear cuenta y Google · **V, primera parte** (puntos 1, 2, 3 y 7) · **el repaso del 23-sep**                       |
| **Ahora**      | **V, segunda parte** (puntos 4 y 5), en la rama `v-vacios-oscuro-y-fotos` con su pull request. Con ella V queda entera. **E2 · Stripe** espera a Richi                                                            |
| **`main`**     | Todo fusionado hasta la **#66**                                                                                                                                                                                   |
| **Base**       | Supabase, **44 de 44** migraciones, igual que `main`. **La rama trae una más** (`0045`, la foto del producto): hay que aplicarla al fusionar. El cubo `fotos-de-producto` del almacén **ya está creado** (24-sep) |
| **API**        | Desplegada el 24-sep a las 00:03 con la #66: 45 consultas y 85 comandos. **La rama trae dos comandos** (87: poner y quitar la foto) y hay que desplegarla después de migrar                                       |
| **Sitio**      | `estook.com`, `/app/` y `/admin/`. Se publica solo al fusionar                                                                                                                                                    |
| **Pruebas**    | En la rama: **1.178** unitarias y de base y **613** de pantalla (los tres navegadores), en verde y sin repetidas · catálogo **124 de 130** (95 %)                                                                 |
| **Entrar**     | App: Ricardo (`ikatz`) y las cuentas de abajo. Admin: `estookapp@gmail.com` y Santi, los dos con segundo factor                                                                                                   |
| **Dirección**  | **Evolución 1.1**: de aplicación de gestión a sistema operativo del local, y **de no cobrar a cobrar** (el TPV es la Fase 4)                                                                                      |

> **M8 no empieza hasta que las veinte mejoras y el panel de administración estén al
> 100 %** (Richi, 16-sep). Los planes: [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)
> y [`docs/panel-de-administracion.md`](docs/panel-de-administracion.md).

### El orden, y dónde estamos en él

| #   | Entrega                          | Cómo está                                                                                  |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| —   | **A1 · La puerta del admin**     | ✓ en producción (#53, #54)                                                                 |
| —   | **E1 · Crear cuenta y Google**   | ✓ en producción (#56)                                                                      |
| 1   | **V · Lo que se ve**             | Puntos 1, 2, 3 y 7 ✓ en producción (#64, #65). **El 4 y el 5, en su pull request** (abajo) |
| —   | **El repaso del 23-sep**         | ✓ en producción (#66)                                                                      |
| 2   | **E2 · El pago con Stripe**      | **Espera a Richi**: su cuenta de Stripe. Va en paralelo a V                                |
| 3   | **O · Lo que se ordena**         | Falta                                                                                      |
| 4   | **A2 · Clientes**                | Falta                                                                                      |
| 5   | **R · El reloj y los avisos**    | Falta · lleva dentro la entrega 2 de M7 (avisos a quien manda, invitar a un pedido)        |
| 6   | **H · Horarios**                 | Falta · lleva dentro la entrega 3 de M7                                                    |
| 7   | **I · La app instalable**        | Falta                                                                                      |
| 8   | **L · El lector**                | Falta                                                                                      |
| 9   | **A3 · Vendedores y códigos**    | Falta                                                                                      |
| 10  | **A4 · Ventas**                  | Falta                                                                                      |
| —   | **M8 · Inventario y desviación** | Después de todo lo anterior                                                                |

### V, segunda parte · lo que lleva la rama

Los puntos 4 y 5 de las mejoras, razonados en la
[0046](docs/decisiones/0046-los-vacios-el-oscuro-y-las-fotos.md) y contados en la
[historia](docs/historia-de-los-modulos.md), apartado «V, la segunda parte».

| Qué                                  | Cómo                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Los vacíos, con dibujo**           | Veinte dibujos de una familia (`packages/ui/src/dibujos/`), pintados con las fichas y **cada uno en su trozo**; obligatorio en `EstadoVacio`             |
| **Un botón que hace lo que dice**    | Las acciones del catálogo (`usarAccion`, `BotonDeAccion`), solo a quien puede; otra salida, en texto y debajo                                            |
| **Lo filtrado que no está**          | `NadaConEso`: ofrece quitar el filtro, nunca crear algo                                                                                                  |
| **La cámara vacía**                  | El Resumen enseña cómo empezar (sin «Cómo va»); Productos enseña solo el vacío                                                                           |
| **Lo del futuro que quedaba**        | Fuera de la hoja de merma y de Mermas (regla de la 0045)                                                                                                 |
| **El contraste, medido en pantalla** | 17 pantallas, dos temas, ordenador y móvil. Encontró el color de la app como texto en claro (3,46:1): `acentoParaTexto`                                  |
| **Las capturas**                     | 32, en claro y oscuro, comparadas en Linux con Ubuntu fijo; las hace **Vera** (Bar Ribera). Las nuevas, con `pnpm capturas:traer`                        |
| **Las fotos de producto**            | Migración `0045`, cubo `fotos-de-producto`, reducidas en el teléfono (800 px WebP, JPG en Safari, miniatura de 160), en la lista, la ficha y el recuento |
| **De paso**                          | El logo comprueba sus primeros bytes; un nombre largo ya no pisa la cantidad en el móvil                                                                 |

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **De las veinte mejoras, cuatro en producción**: la 1 (modo cocina), la 2 (las cifras
  de cada app), la 3 (el Resumen) y la 7 (Ajustes en secciones). **La 4 y la 5, en su
  pull request**: hasta que se fusione, en `estook.com` no hay dibujos ni fotos. Las demás tienen su
  plan y su entrega en [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md).
- **Del admin, solo la puerta** (A1): ni clientes, ni vendedores y códigos, ni ventas.
  Los niveles comercial, soporte y vendedor existen en la base y no se pueden dar.
- **No se cobra** y el estado de la suscripción no se cumple en la API (E2). No hay
  recuperar la contraseña por correo.
- **Lo que espera a su módulo**: leer fotos (M22), responder reseñas (Business
  Profile), la carta con QR (M9 y M10), hablar con Fogón (M22) y el TPV (Fase 4).

### Lo que hay de verdad en producción

Cuatro organizaciones reales, además de las tres de ejemplo:

| Organización  | Locales | Suscripción                          |
| ------------- | ------- | ------------------------------------ |
| `ikatz`       | 1       | **prueba, caducada el 17 de sep**    |
| `burger-king` | 2       | **prueba, caducada el 18 de sep**    |
| `prueba1`     | 1       | `pendiente_de_pago` · alta en paso 0 |
| `prueba1-1`   | 1       | prueba, hasta el 28 de sep           |

Uso real, leído el 23-sep: 11 productos, 316 movimientos, 7 cierres de caja, 25 fichajes y 4 pedidos.
`ikatz` es el negocio de Richi; `burger-king` es de prueba, lo creó él; `prueba1` y
`prueba1-1` se crearon con Google el 17-sep.

> **Lo que no se puede perder:** `ikatz` y `burger-king` tienen la prueba caducada, y
> hoy no pasa nada porque la API no lo hace cumplir. **La entrega que encienda el
> cumplimiento (E2) tiene que pasarlas a `activa` en la misma entrega**, o Richi se
> queda fuera de su propio local el día del despliegue.

---

## 2 · Lo que es de Richi

**Ya hecho, y no se vuelve a pedir:** Resend (dominio `estook.com`, remitente
`hola@estook.com`, los códigos llegan) · entrar y crear cuenta con Google · Places
(IKATZ enlazado desde el 16-sep) · los datos del titular en privacidad y condiciones
(#59).

**Ahora:** fusionar el pull request de V, segunda parte, **aplicar la migración `0045`**
y **desplegar la API**, en ese orden, y mirar en el móvil la foto de un producto, los
vacíos y el oscuro. **El cubo de las fotos no hay que prepararlo**: ya está. Los pasos, uno a uno, en
[`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md).

**Lo que desbloquea E2:**

1. **Activar la cuenta de Stripe** —datos fiscales y cuenta bancaria— y dejarla en modo
   prueba. **Sin crear productos ni precios a mano**: los crea el código.
2. **El alta de autónomo en Hacienda** (036/037), si no está hecha. Es del asesor, pero
   es lo que de verdad bloquea cobrar al primer cliente.

**Cuando quiera, sin prisa:** encender las alertas de Dependabot en GitHub (Settings ›
Code security), quitar «Automatically expose new tables» en Supabase (Settings › API)
antes de tener clientes, y regenerar las claves de Google que pasaron por un chat (M27).
Business Profile espera a que Google apruebe el acceso.

**Del asesor fiscal**, y hasta que conteste no se programa ninguna: el IVA de
restauración, de «para llevar» y reparto; el IGIC de hostelería; `S` o `I` y R1 frente a
R4 en las rectificativas; el texto del justificante sin conexión; las propinas; si los
3.000 € valen para el reparto; la declaración responsable de Estook; y la revisión
escrita del planteamiento (condición 4 del capítulo 9 del Anexo).

**Verifacti:** la propuesta es por NIF activo, de 5,59 € con diez a 3,71 € con cincuenta,
**y caduca hacia el 19 de octubre**; falta preguntarles qué se paga con menos de diez
([`docs/el-precio-de-verifacti.md`](docs/el-precio-de-verifacti.md)). Las claves no hacen
falta hasta M20B: primero se trabaja contra un adaptador simulado. La de pruebas empieza
por `vf_test_` y la de producción por `vf_prod_`; **la dirección no cambia entre
entornos, la clave decide**.

**Las claves nunca por el chat**: se ponen como secretos en Supabase y se dice solo el
nombre. **Y no se toca jamás el borrado permanente de un NIF en Verifacti**: dar de baja
a un cliente es desactivar.

### Lo que sigue sin decidirse · es de Richi

1. **El chat de Estook**: mandar el horario a un grupo necesita un chat que no existe.
   ¿Con Horarios o aparte? Mientras, el horario se comparte en PDF.
2. **Si Fogón habla antes de M22**: le falta elegir modelo, presupuesto por local y caché.
3. **Si se quitan de la API `mis_locales`, `mis_permisos` y `un_local`**, que `quien_soy`
   dejó sin trabajo en M4.

---

## 3 · Lo que hay que tener en cuenta de aquí al final

1. **Estook es fabricante de un sistema de facturación.** Obliga a la declaración
   responsable en la app, a numerar sin huecos, al QR, y a que **nada de facturación
   llegue a producción sin la revisión escrita del asesor** (capítulo 9 del Anexo).
2. **La facturación es intocable**: un ticket o una factura emitidos no se editan ni se
   borran desde ningún sitio; se corrigen con otro documento, en su propio esquema, solo
   de inserción.
3. **Son seis documentos maestros** (abajo), y en sala, cocina, cobro, caja o
   facturación **manda el Anexo**.
4. **Las pruebas leen los documentos.** Cambiar la tabla B5 del Plan pone la integración
   en rojo hasta que el código la siga: es la prueba funcionando.
5. **El TPV es la Fase 4**, después de M17, y va **dentro de `apps/app`** como modo de
   pantalla. Lo preparado —dos vistas apagadas en Servicio— está marcado `M20C`. **El
   terminal es del local, no de una persona** (Anexo 3.4, decidido el 23-sep): pieza
   aparte, `aparato_del_local`. Lo demás que el TPV toca de lo construido, en
   [`docs/lo-que-el-tpv-toca-de-lo-construido.md`](docs/lo-que-el-tpv-toca-de-lo-construido.md).
6. **Estook no toca el dinero** —la tarjeta la cobra el datáfono— **ni calcula huellas**:
   eso lo hace Verifacti. Un SHA-256 de un registro de facturación en nuestro código es
   una segunda cadena y está mal.
7. **No se inventa ni un campo ni un endpoint** de Verifacti, la AEAT o un TPV: primero
   la documentación oficial; hasta entonces, adaptador simulado.
8. **Canarias entra con IGIC; Ceuta y Melilla, todavía no.** Foral y SII quedan fuera
   por ley ([0043](docs/decisiones/0043-hasta-donde-llega-la-facturacion.md)). Hasta
   tener los tipos de IGIC e IPSI de compra, el motor dice «sin regla» y no propone IVA.
9. **El registro horario** (M15): el Real Decreto sigue sin publicarse. Se hace la
   exportación y no se inventa ningún protocolo.

### Los seis documentos maestros

En [`docs/maestros/`](docs/maestros/), en Markdown; el PDF sale con `pnpm maestros`. Las
versiones anteriores, en [`docs/antiguos/maestros/`](docs/antiguos/maestros/).

| Documento                                                                    | Versión | Qué responde                       | Cuándo se lee                                    |
| ---------------------------------------------------------------------------- | ------- | ---------------------------------- | ------------------------------------------------ |
| [Evolución](docs/maestros/Estook-Evolucion.md)                               | 1.1     | Hacia dónde va y en qué orden      | **Primero, siempre**                             |
| [Manifiesto](docs/maestros/Estook-Manifiesto.md)                             | 1.2     | Qué es el producto y cuánto cuesta | Antes de diseñar                                 |
| [Plan de desarrollo](docs/maestros/Estook-Plan-de-Desarrollo.md)             | 1.2     | Cómo se construye y con qué reglas | Antes de escribir código                         |
| [Roles y administración](docs/maestros/Estook-Roles-y-Administracion.md)     | 1.2     | Qué ve exactamente cada persona    | Antes de tocar permisos                          |
| [Auditoría de flujos](docs/maestros/Estook-Auditoria-de-Flujos.md)           | 1.2     | Qué desencadena cada cambio        | Antes de cerrar módulo                           |
| [Anexo · TPV y facturación](docs/maestros/Estook-Anexo-TPV-y-Facturacion.md) | 1.0     | Cómo se cobra y se factura         | Antes de tocar sala, cocina, cobro o facturación |

**Manda el más específico.** Si dos se contradicen de verdad, se para y se pregunta
(regla 13). Si uno se queda corto, se propone lo mejor y **se cambia el documento**, con
su decisión escrita: un maestro no frena el producto.

---

## 4 · Lo que está vivo

**Web:** https://estook.com · `/app/` · `/carta/` · `/admin/` (con puerta: contraseña y
segundo factor). El DNS lo lleva Hostinger, con cuatro registros A a GitHub Pages y `www`
por CNAME ([0036](docs/decisiones/0036-la-direccion-es-estook-com.md)).

**Base de datos:** Supabase `efgtzujwjztihyiwgpwg`, Europa (eu-west-1), plan gratuito, por
el agrupador de sesión. **58 tablas —55 en `estook` y 3 en `plataforma`— todas con
seguridad por filas**; la única vista es `estook.existencias`. Se comprueba con
`.\estook.cmd bd:comprobar`, que lo lee de la base y no de aquí.

**Organizaciones de ejemplo:** `bar-centro`, `casa-lola` y `grupo-costa`, con las cuentas
cerradas desde el 3-sep (tenían una contraseña publicada en este repositorio).

**Errores:** `estook-app` en Sentry. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; **secretos**:
`TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. En Supabase: `GOOGLE_MAPS_KEY`,
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `RESEND_API_KEY` y
`CORREO_REMITENTE` (`Estook <hola@estook.com>`). Todo en [`config/claves.md`](config/claves.md).

**GitHub:** `main` protegida por el conjunto de reglas «Proteger main» —ni borrar ni
reescribir, y tres comprobaciones obligatorias, **sin tilde**: `Calidad`, `Construccion
y presupuestos` (que lleva dentro las pruebas de pantalla) y `Migraciones reversibles`—.
**Nunca añadir `Construir` ni `Publicar`**: ese flujo solo corre después de fusionar.

**El peso inicial** (`pnpm tamano`, 24-sep, en la rama de V, segunda parte): `app`
**295,9 KB**, `admin` **212,1 KB**, `web` 166,2 y `carta` 166,0; de cada uno, 106,1 KB
son la tipografía. Los veinte dibujos de los vacíos no suman: cada uno va en su trozo. La
referencia es 250 y **se mide, no bloquea**: manda el presupuesto de velocidad, que pasa
en la prueba de pantalla. Compras, Recharts y `@dnd-kit` se cargan aparte.

---

## 5 · Cómo trabajamos

**Los comandos, con `.\estook.cmd`**, uno por recuadro: PowerShell no entiende `&&`.

1. **Todo en castellano**: el chat, los pasos, los documentos, los commits, los pull
   requests y el código.
2. **Primero fusionar, después migrar, después desplegar.** La base nunca va por detrás
   del código desplegado: el despliegue lo comprueba y no deja pasar.
3. **Una rama por entrega y un pull request.** Nada entra en `main` sin él.
4. **Ante la duda, preguntar**, explicado en llano. Nada de programar a ojo.
5. **Revisar lo propio antes de entregarlo**, y que Richi no encuentre el fallo.
6. **A Richi, siempre sus pasos**: qué hacer, dónde y qué debe salir. Lo que pueda
   hacer yo, lo hago yo.
7. **GitHub entero en verde, mirado dentro**: sin pruebas repetidas ni errores escondidos
   en una pasada verde.
8. **Una lección se convierte en prueba**, y **una prueba nueva se ve fallar** con el
   arreglo quitado.
9. **Si se toca una pantalla, `prueba:e2e:completa`.** Y si el rojo es del servidor,
   mirar el puerto 5177: puede haber una API de pruebas viva con el código viejo.
10. **Después de desplegar, se mira la base de verdad** (`bd:comprobar-api`).

El resto, con su porqué, en [`docs/lecciones.md`](docs/lecciones.md).

---

## 6 · Decisiones tomadas

En [`docs/decisiones/`](docs/decisiones/), una por fichero:

| Núm      | Qué                                                                            |
| -------- | ------------------------------------------------------------------------------ |
| **0001** | GitHub Pages en vez de Netlify                                                 |
| **0002** | La API en Hono sobre Supabase Edge Functions                                   |
| **0003** | M0 crea el esqueleto mínimo de alcances                                        |
| **0004** | El presupuesto de velocidad de B7, reconstruido                                |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción              |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                              |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta              |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages              |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`               |
| **0010** | El login es nuestro, no de Supabase Auth                                       |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad                     |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                            |
| **0013** | Google Places se aplaza a M23                                                  |
| **0014** | Un módulo reacciona a otro en la misma transacción                             |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app                    |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con Google             |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                          |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                             |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato                |
| **0020** | Un catálogo de acciones, y una acción es una dirección                         |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha                |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero                |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor              |
| **0024** | El color del local pinta la app, y hay dos temas                               |
| **0025** | Fichar pide dónde, y no bloquea nunca                                          |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe                    |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo                |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha                |
| **0029** | Lo que va a una columna JSON viaja como texto                                  |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto                |
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve                  |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma           |
| **0033** | Los precios de compra se guardan sin IVA, y se escriben como venga             |
| **0034** | Nadie gestiona el acceso de su igual: lo hace quien está por encima            |
| **0035** | El alta pregunta cómo se compra, y la cuenta la hace el dominio                |
| **0036** | La dirección es `estook.com`, y la sabe el código                              |
| **0037** | Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja           |
| **0038** | Cada producto es de una zona, y cada uno trabaja con la suya                   |
| **0039** | El Panel se monta como un móvil, y cada uno se pone sus cifras                 |
| **0040** | El local se busca en Google, con el tope contado antes de llamar               |
| **0041** | El panel de administración: el cliente es la organización                      |
| **0042** | Registro abierto con correo o Google, y se paga al empezar salvo oferta        |
| **0043** | Canarias entra con IGIC; Ceuta y Melilla esperan; foral y SII, fuera           |
| **0044** | Las cifras de cada app: la misma tarjeta, las mismas cuentas                   |
| **0045** | El aspecto y el orden: Resumen, mosaico y Ajustes por secciones                |
| **0046** | Los vacíos invitan, el oscuro se mide y fotografía, y la foto de cada producto |

> **Ojo con los números:** las decisiones y las migraciones se numeran aparte. La
> **decisión** 0041 es el panel de administración; la **migración** `0041` es la de que
> el jefe de cocina vea las ventas.

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base.** Una prueba cuadra los dos catálogos.
- **Las funciones de visibilidad son `security definer`**, o `membresia` entra en
  recursión consigo misma. No se usa `force row level security`: rompería las semillas.
- **Sesión y correlación son cosas distintas**: una visita y una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usar…`) y viven en `ganchos/`; **un
  fichero no exporta a la vez un componente y un gancho**, para que la recarga en
  caliente funcione (el proveedor va en su propio fichero).
- **El token va en `Authorization: Bearer`**, no en una cookie: la app y la API viven en
  dominios distintos.
- **Dependencias nuevas justificadas:** `@electric-sql/pglite`, solo de desarrollo; y
  `@dnd-kit` para arrastrar los widgets (0039), en su propio trozo. Contraseñas, segundo
  factor y tokens van con `crypto.subtle`.
- **React Router se queda en la 6 por ahora**: sus dos avisos de seguridad no nos afectan
  (uno es de páginas generadas en el servidor; el otro, de navegar a direcciones escritas
  por alguien de fuera, y las nuestras salen del catálogo). Se sube a la 7 cuando toque.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/migrar.mjs` ·
  `.dependency-cruiser.cjs` · las reglas 9 y 10 de `eslint.config.js` ·
  `herramientas/comprueba-publicacion.mjs`.
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`), que son B1.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`, `packages/ui/fuentes/`
  y los PNG de `packages/ui/marca/`.
- **Las migraciones `0001` a `0045`.** Se amplían con una `0046`, nunca se editan
  (regla 2). Y al ampliar una función SQL, **se copia la original entera**.
- **Un valor de un tipo enumerado no se quita**: Postgres no sabe. Se añade con
  `add value if not exists`, y no se usa en la misma transacción.
- **Lo que va a una columna JSON se escribe `${…}::text::jsonb`**, y **las listas,
  `${comoLista(…)}::text::tipo[]`** ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md)).
- **El libro de movimientos.** Solo se añade; un error se enmienda con otro movimiento.
  `estook.existencias` es una vista. Todo lo que mueve género pasa por `apuntar`, y **su
  candado es `pg_advisory_xact_lock`** ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
  **Una merma no tira más de lo que hay** (`sePuedeTirar`, en el dominio y en el servidor).
- **Un lote no se borra: se retira**; **un producto con género no cambia de unidad**.
- **Cuál es el precio vigente lo dice `estook.precios_vigentes`** (migración `0044`), y
  `precio_vigente` la llama con uno. Una lista de productos lo pide **de una pasada**,
  nunca producto a producto: era casi todo el tiempo del Resumen de Inventario. Y **el
  valor de la cámara** se calcula en un solo sitio, `elValorDeLaCamara`.
- **La factura no mueve género**, y **los importes de compra van sin impuestos**; el IVA
  se calcula al enseñarlo ([0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md),
  [0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).
- **La aritmética vive en `packages/dominio`.** Ni un disparador suma stock ni pondera
  precios (regla 6).
- **Quién ve las horas de quién lo decide `estook.a_quien_lleva`**, en la base; quién ve
  qué del Calendario, la política de su tabla; y quién gestiona a quién,
  `servidor/aplicacion/jerarquia.ts` ([0034](docs/decisiones/0034-nadie-gestiona-a-su-igual.md)).
- **«En línea» y «última vez» los contesta la base** (`esta_en_linea` y
  `visto_por_ultima_vez`, migración `0042`): volver a leer las sesiones desde una
  consulta devuelve a todos fuera de línea para quien no puede quitar accesos.
- **Las funciones `security definer`** son la puerta de atrás y están tasadas: una prueba
  las cuenta con sus nombres —**32 en `estook`** y 3 en `plataforma`— y otra comprueba
  que **ninguna la puede ejecutar nadie más que la API** (`0043`).
- **`sinRecordar`** salta la idempotencia, y solo lo lleva `sigo_aqui`; una prueba tasa
  la lista. Lo que suma, resta o crea algo se recuerda siempre.
- **El mosaico** (0045): varias tarjetas en una pantalla van en `Mosaico`. Y lo elegido va
  en `bg-texto text-superficie`, nunca en `bg-charcoal`, que en oscuro no se lee.
- **La red de debajo de cada pantalla** (`SiAlgoFalla`), en la raíz de la app y del admin
  y alrededor del `<Outlet />` del esqueleto.
- **La zona segura del móvil**: toda barra o pantalla pegada arriba suma
  `env(safe-area-inset-top)`. Y **los campos, a 16 px como mínimo en pantallas táctiles**
  (`base.css`, fuera de las capas): por debajo, Safari hace zoom.
- **Qué ajustes hay y dónde viven**, en `pantallas/lasSeccionesDeAjustes.ts`.
- **Las cifras con flecha** (0039, 0044): una sola tarjeta, `TarjetaDeIndicador`; cada
  cifra, en el dominio, y **contada como la pantalla de la que sale**, con su prueba.
- **El modo cocina se hace en `cocina.css`**, fuera de `@layer base`; y los tres ajustes
  del aparato —tema, letra y modo cocina— se aplican en la raíz (`Aplicacion.tsx`).
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`, que sigue a B5 del
  Plan), el de widgets (`packages/ui/src/panel/catalogo.ts`) y el de acciones
  (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración.
- **La puerta del admin** (decisión 0041): ser admin es de `plataforma`; la sesión del
  admin y la de la app no se cruzan; toda operación del admin declara `soloAdmin` y
  empieza por `admin_`.
- **Qué pide cada indicador vive en `@estook/permisos`** (`LO_QUE_PIDE_EL_INDICADOR`).
- **Google, solo por la API y por su puerto**, y todo lo que lo llama pasa antes por
  `contar`, que es el tope.
- **El precio de venta no vive en el producto**: es del plato, en la carta (M10).
- **Los vacíos** (0046): todo `EstadoVacio` lleva su dibujo de `dibujos/catalogo.ts`, y
  los dibujos **solo se importan con `import()`**, sin un color escrito a mano: lo vigila
  `dibujos.prueba.ts`. Lo filtrado que no está va en `NadaConEso`.
- **El acento como texto va en `acentoParaTexto`**, nunca a secas: en claro no llega a
  4,5:1. Lo mide `contraste-de-los-temas.spec.ts` en pantallas de verdad.
- **Las capturas de referencia son las de Linux** (`pruebas/e2e/capturas/linux/`), y el
  trabajo que las compara lleva **Ubuntu fijo** (`ubuntu-24.04`). Una pantalla que cambia
  a propósito se da por buena trayendo la nueva con `pnpm capturas:traer` y **mirándola**.
  **Con Vera no entra ninguna otra prueba**: es la de las capturas.
- **Las fotos de producto** (0046): la fila guarda claves, nunca direcciones; se sube
  antes de escribir la fila, se toma la fila con `for update` antes de subir, y se mira
  la firma de los bytes. Los enlaces se firman **de una tanda** (`enlaces`).

---

## 8 · El siguiente paso

**Primero, V, segunda parte** (rama `v-vacios-oscuro-y-fotos`, con su pull request):
Richi la fusiona, aplica la migración `0045` y despliega la API. Luego mira en el móvil
**la foto de un producto** (hacerla con la cámara desde su ficha), los vacíos y el oscuro
(regla 29: medir el contraste no basta). Con eso, **V está terminada**: los vacíos invitan a
empezar y las capturas en oscuro se comparan en la prueba, que era lo que faltaba de su
«terminado cuando».

**Luego, O · Lo que se ordena** (mejoras 6, 8, 9 y 17, y el QR definitivo de la 20), en
una rama nueva. **E2 · Stripe** en paralelo, en cuanto esté la cuenta de Richi.

**Cómo se comprueba que no rompe lo de antes:** `.\estook.cmd verifica`,
`.\estook.cmd prueba:e2e:completa` (que incluye la cobertura) y, tras desplegar,
`.\estook.cmd bd:comprobar-api`. Si una captura sale en rojo en GitHub,
`pnpm capturas:traer`, mirarla y subirla si es lo que se quería.

---

### Lo que queda preparado, y dónde se termina

| Qué                                                              | Dónde se termina | Qué hay ya                                                  |
| ---------------------------------------------------------------- | ---------------- | ----------------------------------------------------------- |
| El reloj diario (y tirar las claves de todas las organizaciones) | **Mejoras · R**  | `limpiarCaducadas`; Places guardado con su fecha (0040)     |
| Business Profile                                                 | Con accesos      | La ficha de Google del local                                |
| Calendario, avisos con roles y turnos                            | **M14**          | La tabla, su seguridad por roles y «Lo que viene»           |
| Recalcular platos con lo que corrigió la factura                 | **M9**           | Lo cobrado, en cada línea del albarán con fecha             |
| El pedido en PDF con el logo                                     | **M11**          | «Imprimir», sin membrete                                    |
| El precio pactado para toda una cadena                           | **M24**          | Lo pactado por local                                        |
| Leer el albarán de una foto                                      | **M22**          | La recepción línea a línea                                  |
| Avisos de fichar por push                                        | **Mejoras · I**  | El horario de siempre, que el widget ya dice                |
| Recuento, desviación y calibración del aprovechamiento           | **M8**           | La merma con motivo; albaranes con incidencias; el recuento |
| Descontar lo vendido del inventario                              | **M20**          | El cierre guarda los platos con el nombre normalizado       |
| Los terminales del local                                         | **M20A**         | Cómo se dan de alta, en el Anexo 3.4                        |

**Sin prisa, de código:** volver a `BrowserRouter` ahora que hay dominio
([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)); pasar Pedidos, Albaranes y
Facturas a `usarListaLarga` cuando una crezca; subir a React Router 7; **el 19 de octubre, mirar la integración continua**, que GitHub pasa `ubuntu-latest` a Ubuntu 26 ese día (hoy es solo un aviso); y el vectorial
del logotipo y de Fogón cuando aparezcan.

## 9 · En paralelo · E2, el pago con Stripe

**Antes de empezarla:** E1 fusionada, migrada y desplegada ✓ · los datos del titular ✓
(#59) · **la cuenta de Stripe de Richi, activada y en modo prueba: falta.**

**Qué entra:** los productos y precios de la
[0042](docs/decisiones/0042-registro-abierto-google-y-la-oferta.md) en Stripe, con IVA
incluido, al mes y al año; pagar desde Elegir plan (Checkout); el portal para cambiar
tarjeta, plan o cancelar; los avisos de Stripe (webhook firmado e idempotente); **el
estado de la suscripción cumplido en la API**; Stripe en la privacidad; y el admin sabiendo
quién ha pagado. **Y pasar `ikatz` y `burger-king` a `activa` en la misma entrega.**

**Terminado cuando:** una cuenta nueva paga en modo prueba y entra al alta; una pendiente
de pago no puede escribir llamando a la API a pelo; y cancelar en el portal deja la cuenta
en solo lectura al acabar el periodo.

**Lo que E1 no hace todavía:** no cobra (Elegir plan dice que el pago se abre en unos
días), y no hay **recuperar la contraseña por correo** (la da quien lleva el local).
