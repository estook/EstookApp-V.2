# ESTADO DEL PROYECTO

Última actualización: 25 de septiembre de 2026, por la tarde · **Antes de M8. La #68 y la #69, en producción. El Panel en el móvil (#70), en verde y por fusionar. E2 · el pago con Stripe, hecha en su rama con la migración `0047`**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último.
> **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> **¿Empiezas un chat nuevo?** Basta con «lee `ESTADO.md` entero y dime dónde estamos».
> Lo demás vive en su sitio, y aquí solo se enlaza:
>
> - **Lo que hizo cada módulo**, con sus fallos: [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)
> - **Lo aprendido fallando** (115 lecciones): [`docs/lecciones.md`](docs/lecciones.md)
> - **Las trece reglas** que no se discuten: [`docs/reglas.md`](docs/reglas.md)
> - **Por qué está hecho así**: [`docs/decisiones/`](docs/decisiones/)
> - **Los pasos de Richi** de cada entrega: [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)

---

## 1 · Dónde estamos

_Producción leída el 25-sep a mediodía: migraciones y organizaciones en solo lectura, la API desplegada preguntada por todas sus operaciones, la ráfaga de 30 a la vez contra ella, y GitHub de `main` y de la #70 mirado por dentro._

|                  |                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Terminados**   | **M0** a **M6½** · **M7** (entregas 1, 1½, 1¾, 1⅞ y 4) · **A1** · **E1** · **V** · **el repaso del 23-sep** · **los arreglos del móvil** (#68) · **O** (#69) |
| **Por fusionar** | **El Panel en el móvil** (#70): en verde, **1.251** y **696** sin repetidas. Sin migración, con despliegue de la API                                         |
| **Ahora**        | **E2 · El pago con Stripe**, en la rama `e2-el-pago-con-stripe`, con la migración `0047`. Va **después** de la #70                                           |
| **`main`**       | Todo fusionado hasta la **#69**                                                                                                                              |
| **Base**         | Supabase, **46 de 46** migraciones, igual que `main`. Con E2 serán 47                                                                                        |
| **API**          | Desplegada el 25-sep a las 11:31 con la #69: **48 consultas y 87 comandos**. **La ráfaga: 90 de 90** (`bd:rafaga`). Con E2 serán 50 y 93                     |
| **Sitio**        | `estook.com`, `/app/`, `/carta/<local>` y `/admin/`. Se publica solo al fusionar (la #69, el 25-sep a las 11:17)                                             |
| **Pruebas**      | En `main`: **1.246** unitarias y de base y **681** de pantalla, con las **32 capturas**, en verde y sin repetidas. En la rama de E2, en local: **1.289**     |
| **Entrar**       | App: Ricardo (`ikatz`) y las cuentas de abajo. Admin: `estookapp@gmail.com` y Santi, los dos con segundo factor                                              |
| **Dirección**    | **Evolución 1.1**: de aplicación de gestión a sistema operativo del local, y **de no cobrar a cobrar** (el TPV es la Fase 4)                                 |

> **M8 no empieza hasta que las veinte mejoras y el panel de administración estén al
> 100 %** (Richi, 16-sep). Los planes: [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)
> y [`docs/panel-de-administracion.md`](docs/panel-de-administracion.md).

### El orden, y dónde estamos en él

| #   | Entrega                          | Cómo está                                                            |
| --- | -------------------------------- | -------------------------------------------------------------------- |
| —   | **A1 · La puerta del admin**     | ✓ en producción (#53, #54)                                           |
| —   | **E1 · Crear cuenta y Google**   | ✓ en producción (#56)                                                |
| 1   | **V · Lo que se ve**             | ✓ en producción (#64, #65, #67)                                      |
| —   | **El repaso del 23-sep**         | ✓ en producción (#66)                                                |
| —   | **Los arreglos del móvil**       | ✓ en producción (#68)                                                |
| 2   | **O · Lo que se ordena**         | ✓ en producción (#69, migración `0046`)                              |
| —   | **El Panel en el móvil**         | **En verde, por fusionar** (#70)                                     |
| 3   | **E2 · El pago con Stripe**      | **Hecha, en su rama** (migración `0047`, decisión 0048). Apartado 9  |
| 4   | **A2 · Clientes**                | Falta                                                                |
| 5   | **R · El reloj y los avisos**    | Falta · lleva dentro la entrega 2 de M7. **El reloj ya lo monta E2** |
| 6   | **H · Horarios**                 | Falta · lleva dentro la entrega 3 de M7                              |
| 7   | **I · La app instalable**        | Falta                                                                |
| 8   | **L · El lector**                | Falta                                                                |
| 9   | **A3 · Vendedores y códigos**    | Falta                                                                |
| 10  | **A4 · Ventas**                  | Falta                                                                |
| —   | **M8 · Inventario y desviación** | Después de todo lo anterior                                          |

### El Panel en el móvil (#70) · en verde, por fusionar

Lo que Richi vio al mirar O en el móvil, y un repaso de 19 pantallas: **«Hoy» plegado**
en el móvil y fuera si no hay avisos; **la línea de ventas sin el punto suelto** (el hueco,
en discontinuo); **el «+» que se aparta al bajar**; la zona de avisos que se salía por la
derecha, un «Cargando» escondido en las fichas cerradas, «hoy» y no «caducado», y
**«Entrar» que se movía bajo el dedo** al aparecer Google. Contado en la
[historia](docs/historia-de-los-modulos.md). La ráfaga de la #68, repetida contra
producción: **90 de 90**, y por la `5432` siguen fallando 15, que es lo que demuestra
que la ráfaga ve el tope.

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **De las veinte mejoras, diez en producción y el QR de la 20**: la 1, 2, 3, 4, 5, 6, 7,
  8, 9 y 17. Las demás, con su plan en [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md).
- **No se cobra todavía**: E2 está hecha pero sin fusionar, y **aunque se fusione se
  cobra en modo prueba**: para cobrar de verdad hace falta la clave real y la cuenta de
  Stripe activada con los datos fiscales de quien factura (apartado 9).
- **Del admin, la puerta y la lista de cuentas** (E2): ni la ficha de cada cliente, ni
  vendedores y códigos, ni ventas.
- **No hay recuperar la contraseña por correo** (la da quien lleva el local).
- **Lo que espera a su módulo**: la foto del plato y los platos de la carta (M9, M10; el
  QR ya está), leer fotos (M22), responder reseñas (Business Profile), hablar con Fogón
  (M22), el lector de códigos (entrega L) y el TPV (Fase 4).

### Lo que hay de verdad en producción

Cuatro organizaciones reales, además de las tres de ejemplo (leído el 25-sep):

| Organización  | Locales | Hoy                                  | **Al desplegar E2**                             |
| ------------- | ------- | ------------------------------------ | ----------------------------------------------- |
| `ikatz`       | 1       | prueba, caducada el 17-sep           | **Activa, de la casa**: no paga (Richi, 25-sep) |
| `burger-king` | 2       | prueba, caducada el 18-sep           | **Tiene que elegir plan** para seguir entrando  |
| `prueba1`     | 1       | pendiente de pago, alta en el paso 0 | Elegir plan, como hasta ahora                   |
| `prueba1-1`   | 1       | prueba hasta el 28-sep               | Entra hasta el 28; después, elegir plan         |

`ikatz` es el negocio de Richi; `burger-king` es de prueba, lo creó él; `prueba1` y
`prueba1-1` se crearon con Google el 17-sep. Los tres ejemplos quedan **de la casa**.

---

## 2 · Lo que es de Richi

**Ya hecho, y no se vuelve a pedir:** Resend (dominio `estook.com`, remitente
`hola@estook.com`) · entrar y crear cuenta con Google · Places (IKATZ enlazado) · los
datos del titular (#59) · **V entera** · **la #68 y la #69** (fusionadas, `0046`
aplicada, API desplegada, miradas en el móvil) · **la cuenta de Stripe** (24-sep) · **las
siete respuestas de E2** (25-sep) · **`STRIPE_SECRET_KEY` puesta en Supabase** (lo dijo
Richi el 25-sep; se comprueba al desplegar E2: con ella, Elegir plan abre el pago).

**Ahora, en este orden** (los pasos, uno a uno, en
[`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)):

1. **Fusionar la #70** y desplegar la API (sin migración).
2. **Fusionar E2**, aplicar la `0047` y desplegar la API. Después, `bd:comprobar-api`
   tiene que decir «50» y «93» y que el reloj está programado.
3. **Probar el pago en modo prueba** con una cuenta nueva y la tarjeta `4242 4242 4242 4242`.

**Para cobrar de verdad, más adelante:** la sociedad o el alta de autónomo; activar la
cuenta de Stripe con esos datos (salen en cada factura); cambiar la clave de prueba por
la real; y que el asesor revise las facturas de la cuota (VeriFactu obliga a los
autónomos desde el **1-jul-2027** y a las sociedades desde el **1-ene-2027**).

**Cuando quiera, sin prisa:** encender las alertas de Dependabot en GitHub (Settings ›
Code security), quitar «Automatically expose new tables» en Supabase (Settings › API)
antes de tener clientes, y regenerar las claves de Google que pasaron por un chat (M27).
Business Profile espera a que Google apruebe el acceso.

**Del asesor fiscal**, y hasta que conteste no se programa ninguna: el IVA de
restauración, de «para llevar» y reparto; el IGIC de hostelería; `S` o `I` y R1 frente a
R4 en las rectificativas; el texto del justificante sin conexión; las propinas; si los
3.000 € valen para el reparto; la declaración responsable de Estook; la revisión escrita
del planteamiento (condición 4 del capítulo 9 del Anexo); y, de E2, **la cuota a un
cliente de Canarias, Ceuta o Melilla** y **si la factura de Stripe vale hasta VeriFactu**.

**Verifacti:** la propuesta es por NIF activo, de 5,59 € con diez a 3,71 € con cincuenta,
**y caduca hacia el 19 de octubre**; falta preguntarles qué se paga con menos de diez
([`docs/el-precio-de-verifacti.md`](docs/el-precio-de-verifacti.md)). Las claves no hacen
falta hasta M20B. La de pruebas empieza por `vf_test_` y la de producción por
`vf_prod_`; **la dirección no cambia entre entornos, la clave decide**.

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
   terminal es del local, no de una persona** (Anexo 3.4): pieza aparte,
   `aparato_del_local`. Lo demás, en
   [`docs/lo-que-el-tpv-toca-de-lo-construido.md`](docs/lo-que-el-tpv-toca-de-lo-construido.md).
6. **Estook no toca el dinero del local** —la tarjeta de sus clientes la cobra el
   datáfono— **ni calcula huellas**: eso lo hace Verifacti. La cuota de Estook la cobra
   Stripe, y la tarjeta tampoco pasa por Estook (0048).
7. **No se inventa ni un campo ni un endpoint** de Verifacti, la AEAT, un TPV o Stripe:
   primero la documentación oficial; hasta entonces, adaptador simulado.
8. **Canarias entra con IGIC; Ceuta y Melilla, todavía no.** Foral y SII quedan fuera
   por ley ([0043](docs/decisiones/0043-hasta-donde-llega-la-facturacion.md)).
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
el agrupador: las herramientas, en modo sesión; **la API, en modo transacción**
(`bd:rafaga` lo mide). **58 tablas —55 en `estook` y 3 en `plataforma`— todas con
seguridad por filas** (con E2, 63: cinco más en `plataforma`); la única vista es
`estook.existencias`. `pg_cron` y `pg_net` están disponibles y **los enciende la `0047`**.
Se comprueba con `.\estook.cmd bd:comprobar`, que lo lee de la base y no de aquí.

**Organizaciones de ejemplo:** `bar-centro`, `casa-lola` y `grupo-costa`, con las cuentas
cerradas desde el 3-sep (tenían una contraseña publicada en este repositorio).

**Errores:** `estook-app` en Sentry. **Variables** del repositorio: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_SENTRY_DSN` y `VITE_API_URL`; **secretos**:
`TOKEN_DE_SUPABASE` y `PROYECTO_DE_SUPABASE`. En Supabase: `GOOGLE_MAPS_KEY`,
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `RESEND_API_KEY`,
`CORREO_REMITENTE` y **`STRIPE_SECRET_KEY`** (de prueba). Todo en [`config/claves.md`](config/claves.md).

**GitHub:** `main` protegida por el conjunto de reglas «Proteger main» —ni borrar ni
reescribir, y tres comprobaciones obligatorias, **sin tilde**: `Calidad`, `Construccion
y presupuestos` (que lleva dentro las pruebas de pantalla) y `Migraciones reversibles`—.
**Nunca añadir `Construir` ni `Publicar`**: ese flujo solo corre después de fusionar.

**El peso inicial** (`pnpm tamano`, 25-sep, rama de la #70): `app` **304,3 KB**, `admin`
**212,5 KB**, `web` 166,3 y `carta` 171,5; de cada uno, 106,1 KB son la tipografía. La
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

| Núm      | Qué                                                                             |
| -------- | ------------------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify                                                  |
| **0002** | La API en Hono sobre Supabase Edge Functions                                    |
| **0003** | M0 crea el esqueleto mínimo de alcances                                         |
| **0004** | El presupuesto de velocidad de B7, reconstruido                                 |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción               |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                               |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta               |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages               |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`                |
| **0010** | El login es nuestro, no de Supabase Auth                                        |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad                      |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                             |
| **0013** | Google Places se aplaza a M23                                                   |
| **0014** | Un módulo reacciona a otro en la misma transacción                              |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app                     |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con E2 (0048)           |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                           |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                              |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato                 |
| **0020** | Un catálogo de acciones, y una acción es una dirección                          |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha                 |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero                 |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor               |
| **0024** | El color del local pinta la app, y hay dos temas                                |
| **0025** | Fichar pide dónde, y no bloquea nunca                                           |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe                     |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo                 |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha                 |
| **0029** | Lo que va a una columna JSON viaja como texto                                   |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto                 |
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve                   |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma            |
| **0033** | Los precios de compra se guardan sin IVA, y se escriben como venga              |
| **0034** | Nadie gestiona el acceso de su igual: lo hace quien está por encima             |
| **0035** | El alta pregunta cómo se compra, y la cuenta la hace el dominio                 |
| **0036** | La dirección es `estook.com`, y la sabe el código                               |
| **0037** | Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja            |
| **0038** | Cada producto es de una zona, y cada uno trabaja con la suya                    |
| **0039** | El Panel se monta como un móvil, y cada uno se pone sus cifras                  |
| **0040** | El local se busca en Google, con el tope contado antes de llamar                |
| **0041** | El panel de administración: el cliente es la organización                       |
| **0042** | Registro abierto con correo o Google, y se paga al empezar salvo oferta         |
| **0043** | Canarias entra con IGIC; Ceuta y Melilla esperan; foral y SII, fuera            |
| **0044** | Las cifras de cada app: la misma tarjeta, las mismas cuentas                    |
| **0045** | El aspecto y el orden: Resumen, mosaico y Ajustes por secciones                 |
| **0046** | Los vacíos invitan, el oscuro se mide y fotografía, y la foto de cada producto  |
| **0047** | El «+» con Fogón, lo de hoy, el Panel de cada puesto, el semáforo y el QR       |
| **0048** | El pago con Stripe: sin pago no hay app, siete días de gracia y todo en Ajustes |

> **Ojo con los números:** las decisiones y las migraciones se numeran aparte. La
> **decisión** 0048 es el pago; la **migración** `0047` es la que lo monta.

Otras, sin fichero propio:

- **La matriz de permisos vive solo en la base.** Una prueba cuadra los dos catálogos.
- **Las funciones de visibilidad son `security definer`**, o `membresia` entra en
  recursión consigo misma. No se usa `force row level security`: rompería las semillas.
- **Sesión y correlación son cosas distintas**: una visita y una acción dentro de ella.
- **Los ganchos de React se llaman en español** (`usar…`) y viven en `ganchos/`; **un
  fichero no exporta a la vez un componente y un gancho**.
- **El token va en `Authorization: Bearer`**, no en una cookie: la app y la API viven en
  dominios distintos.
- **Dependencias nuevas justificadas:** `@electric-sql/pglite`, solo de desarrollo; y
  `@dnd-kit` para arrastrar los widgets (0039), en su propio trozo. **Stripe va sin
  librería** (unas pocas llamadas `fetch`, como Resend y Google). Contraseñas, segundo
  factor, tokens y la firma de los avisos de Stripe van con `crypto.subtle`.
- **React Router se queda en la 6 por ahora**: sus dos avisos de seguridad no nos afectan.

---

## 7 · Lo que NO hay que tocar

Cerrado y probado. Ampliar es normal; reescribir, no, sin decisión escrita:

- `packages/utiles/src/` · `base-de-datos/herramientas/migrar.mjs` ·
  `.dependency-cruiser.cjs` · las reglas 9 y 10 de `eslint.config.js` ·
  `herramientas/comprueba-publicacion.mjs`.
- **Las fichas de diseño** (`packages/ui/estilos/fichas.css`), que son B1.
- **Los ficheros generados**: `packages/iconos/src/generados.tsx`, `packages/ui/fuentes/`
  y los PNG de `packages/ui/marca/`.
- **Las migraciones `0001` a `0047`.** Se amplían con una `0048`, nunca se editan
  (regla 2). Y al ampliar una función SQL, **se copia la original entera**.
- **Un valor de un tipo enumerado no se quita**: Postgres no sabe. Se añade con
  `add value if not exists`, y no se usa en la misma transacción.
- **Lo que va a una columna JSON se escribe `${…}::text::jsonb`**, y **las listas,
  `${comoLista(…)}::text::tipo[]`** ([0029](docs/decisiones/0029-lo-que-va-a-jsonb-viaja-como-texto.md)).
- **El libro de movimientos.** Solo se añade; un error se enmienda con otro movimiento.
  `estook.existencias` es una vista. Todo lo que mueve género pasa por `apuntar`, y **su
  candado es `pg_advisory_xact_lock`** ([0026](docs/decisiones/0026-la-merma-tiene-motivo-y-partida.md)).
  **Una merma no tira más de lo que hay** (`sePuedeTirar`).
- **Un lote no se borra: se retira**; **un producto con género no cambia de unidad**.
- **Cuál es el precio vigente lo dice `estook.precios_vigentes`** (`0044`), y una lista
  lo pide **de una pasada**. **El valor de la cámara** se calcula en un solo sitio,
  `elValorDeLaCamara`.
- **La factura no mueve género**, y **los importes de compra van sin impuestos**
  ([0032](docs/decisiones/0032-las-compras-se-mandan-se-reciben-y-se-concilian.md),
  [0033](docs/decisiones/0033-los-precios-de-compra-se-guardan-sin-iva.md)).
- **La aritmética vive en `packages/dominio`.** Ni un disparador suma stock ni pondera
  precios (regla 6).
- **Quién ve las horas de quién lo decide `estook.a_quien_lleva`**; quién ve qué del
  Calendario, la política de su tabla; y quién gestiona a quién,
  `servidor/aplicacion/jerarquia.ts` ([0034](docs/decisiones/0034-nadie-gestiona-a-su-igual.md)).
- **«En línea» y «última vez» los contesta la base** (`esta_en_linea` y
  `visto_por_ultima_vez`).
- **Las funciones `security definer`** son la puerta de atrás y están tasadas: una prueba
  las cuenta con sus nombres —**36 en `estook`** (con E2) y 3 en `plataforma`— y otra
  comprueba que **ninguna la puede ejecutar nadie más que la API** (`0043`).
- **`sinRecordar`** salta la idempotencia, y solo lo lleva `sigo_aqui`; una prueba tasa
  la lista. Lo que suma, resta o crea algo se recuerda siempre.
- **El pago** (0048): **la puerta del pago está en el despachador** (`porQueNoPasaElPago`),
  no en la pantalla; **lo que pasa sin pagar lo declara la operación** (`sinPagar`) y una
  prueba tasa la lista; **cómo está una cuenta lo dice el dominio** (`comoEstaLaCuenta`,
  con los siete días contados por la hora, sin que nadie cambie el estado); **lo que
  dice Stripe se vuelve a leer a Stripe**, con la firma comprobada y cada aviso una vez;
  **la versión de su API va fija** (`VERSION_DE_STRIPE`); y **lo de Stripe en
  `plataforma` solo lo lee el sistema** (`enNombreDelSistema`). «Plan y facturación» es de
  la organización: se lee con `cuenta.laLlevo`, no de los permisos del local.
- **El reloj** (0016, 0048): `pg_cron` llama cada hora a `/tareas/latir` con un secreto
  que **generó la migración** (en el Vault; en la base solo su huella). Lo del día, una
  vez, a partir de las 8 de Madrid. **Las rutas que no son de la app van fuera de `/v1`**:
  otra ruta que empiece por `/v…` deja al enrutador de Hono sin encontrar ninguna.
- **El mosaico** (0045): varias tarjetas en una pantalla van en `Mosaico`. Y lo elegido va
  en `bg-texto text-superficie`, nunca en `bg-charcoal`, que en oscuro no se lee.
- **Los atajos son uno** (`usarMisAtajos`), y **el Panel de fábrica sale del puesto**
  (`elPuestoDe`, por permisos, nunca por nombre de rol).
- **Lo de hoy no cuenta nada por su cuenta** (`lo_de_hoy` y `loDeHoy`); **sin nada, no se
  pinta**, y en el móvil sale plegado. **La caja y las cifras cuentan con la jornada; las
  caducidades y las compras, con el calendario.**
- **El semáforo cuenta como las cifras** y lo pinta el dominio (`lasCifrasDelSemaforo`);
  la merma, **en fracción de lo comprado**.
- **La dirección de la carta no se cambia nunca** (la pone la base al nacer el local y la
  lleva un QR impreso), y **la página de la carta es la `404.html` del sitio**.
- **La API entra en Postgres por el modo transacción** (`laPuertaDeLaApi`). Nada de la API
  puede usar la conexión fuera de `begin`.
- **Solo `sin_sesion` manda a entrar.** Cualquier otro fallo de `quien_soy` se reintenta.
  Y **`quien_soy` pone al día una sesión que se ha quedado sin local** (la de quien entró
  sin pagar y ya ha pagado).
- **En una lista, la etiqueta solo si avisa** (`avisa`).
- **La línea de las cifras** no lleva nada redondo dentro del SVG que se estira
  (`formasDeLaTendencia`). **El «+» se aparta al bajar** solo por debajo de `lg`. **Lo
  que aparece encima de un botón ocupa su sitio desde el principio** («Continuar con
  Google» en la puerta).
- **La red de debajo de cada pantalla** (`SiAlgoFalla`).
- **La zona segura del móvil** (`env(safe-area-inset-top)`) y **los campos a 16 px como
  mínimo en pantallas táctiles** (`base.css`).
- **Qué ajustes hay y dónde viven**, en `pantallas/lasSeccionesDeAjustes.ts`.
- **Las cifras con flecha**: una sola tarjeta, `TarjetaDeIndicador`, y cada cifra en el
  dominio, contada como la pantalla de la que sale.
- **El modo cocina se hace en `cocina.css`**, y los ajustes del aparato se aplican en la
  raíz (`Aplicacion.tsx`).
- **Los catálogos**: el de navegación (`packages/ui/src/apps.ts`), el de widgets
  (`packages/ui/src/panel/catalogo.ts`) y el de acciones (`apps/app/src/acciones/catalogo.tsx`).
- **El catálogo de referencia** (`0021`): se corrige con una migración.
- **La puerta del admin** (0041): toda operación del admin declara `soloAdmin` y empieza
  por `admin_`.
- **Qué pide cada indicador vive en `@estook/permisos`** (`LO_QUE_PIDE_EL_INDICADOR`).
- **Google, solo por la API y por su puerto**, y todo lo que lo llama pasa antes por
  `contar`, que es el tope.
- **El precio de venta no vive en el producto**: es del plato, en la carta (M10).
- **Los vacíos** (0046): todo `EstadoVacio` lleva su dibujo, que **solo se importa con
  `import()`**. Lo filtrado que no está va en `NadaConEso`.
- **El acento como texto va en `acentoParaTexto`**: en claro no llega a 4,5:1.
- **Las capturas de referencia son las de Linux**, con **Ubuntu fijo**. Una pantalla que
  cambia a propósito se da por buena con `pnpm capturas:traer` y **mirándola**. **Con
  Vera no entra ninguna otra prueba.**
- **Las fotos de producto** (0046): la fila guarda claves, nunca direcciones, y los
  enlaces se firman **de una tanda**.

---

## 8 · El siguiente paso

**Primero, fusionar la #70** y desplegar la API. **Después, E2**: su pull request en
verde y mirado por dentro, fusionar, aplicar la `0047`, desplegar la API y probar el pago
en modo prueba (apartado 9). **Luego, A2 · Clientes.**

**Cómo se comprueba que no rompe lo de antes:** `.\estook.cmd verifica`,
`.\estook.cmd prueba:e2e:completa` (que incluye la cobertura) y, tras desplegar,
`.\estook.cmd bd:comprobar-api`. Si una captura sale en rojo en GitHub,
`pnpm capturas:traer`, mirarla y subirla si es lo que se quería.

### Lo que queda preparado, y dónde se termina

| Qué                                                        | Dónde se termina | Qué hay ya                                                      |
| ---------------------------------------------------------- | ---------------- | --------------------------------------------------------------- |
| Los avisos del reloj (a quien manda, la bandeja de salida) | **Mejoras · R**  | **El reloj** (E2): latido cada hora y lo del día, con su prueba |
| Business Profile                                           | Con accesos      | La ficha de Google del local                                    |
| Calendario, avisos con roles y turnos                      | **M14**          | La tabla, su seguridad por roles y «Lo que viene»               |
| Recalcular platos con lo que corrigió la factura           | **M9**           | Lo cobrado, en cada línea del albarán con fecha                 |
| El pedido en PDF con el logo                               | **M11**          | «Imprimir», sin membrete                                        |
| El precio pactado para toda una cadena                     | **M24**          | Lo pactado por local                                            |
| Leer el albarán de una foto                                | **M22**          | La recepción línea a línea                                      |
| Avisos de fichar por push                                  | **Mejoras · I**  | El horario de siempre, que el widget ya dice                    |
| Recuento, desviación y calibración del aprovechamiento     | **M8**           | La merma con motivo; albaranes con incidencias; el recuento     |
| Descontar lo vendido del inventario                        | **M20**          | El cierre guarda los platos con el nombre normalizado           |
| Los terminales del local                                   | **M20A**         | Cómo se dan de alta, en el Anexo 3.4                            |
| La ficha de cada cliente, su historial y su vendedor       | **A2**           | La lista de cuentas del admin y el historial de estados (E2)    |
| Cerrar un local (y que la cuota baje)                      | Sin fecha        | La cuota ya sube sola al abrir uno                              |

**Sin prisa, de código:** volver a `BrowserRouter` ahora que hay dominio
([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)); pasar Pedidos, Albaranes y
Facturas a `usarListaLarga` cuando una crezca; subir a React Router 7; **el 19 de
octubre, mirar la integración continua**, que GitHub pasa `ubuntu-latest` a Ubuntu 26 ese
día; y el vectorial del logotipo y de Fogón cuando aparezcan.

---

## 9 · E2, el pago con Stripe

**Hecha el 25-sep** en la rama `e2-el-pago-con-stripe`, con la migración `0047` y la
[decisión 0048](docs/decisiones/0048-el-pago-con-stripe.md), **con lo que contestó Richi**:

| Qué                       | Cómo queda                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Sin pago no hay app**   | Toda cuenta nueva paga antes de entrar, **también con oferta**. Lo cumple la API en cada petición: ni mirar ni escribir sin pagar |
| **La prueba**             | **Con tarjeta**: hoy no se cobra, el primer cobro al acabar, un correo siete días antes, y cancelando antes no se paga nada       |
| **La cuota por local**    | Cambia sola al abrir uno (se dice cuánto antes), prorrateada; **Pro con dos o más pasa a Cadena**, que es más barato              |
| **Un cobro que falla**    | **Siete días** trabajando con un aviso arriba y **un correo cada día**; el octavo, **solo lectura**. No se borra nada             |
| **Ajustes → Suscripción** | Plan, cuota, renovación o fin de prueba, tarjeta; cambiar de plan (con Pausa), cancelar y seguir; tarjeta y facturas en el portal |
| **Las cuentas de ahora**  | `ikatz` y los ejemplos, **de la casa**; las demás, como cualquier cliente                                                         |
| **El admin**              | Pestaña **Cuentas**: cómo está cada una, qué plan y cuánto paga                                                                   |
| **Lo legal**              | Condiciones y privacidad al día; en la app, plegado en «Cómo funciona el pago»; en Stripe, junto al botón                         |

**Una sola clave, `STRIPE_SECRET_KEY`.** Productos, precios, IVA, portal y aviso los
crea el código la primera vez. Probado contra la base con el Stripe de mentira (que
avisa firmado por la misma puerta): **14** contra la base, **14** del dominio, **6** del
adaptador y **3** de sus rutas, y **5** de pantalla (`el-pago.spec.ts`). Contra el Stripe de verdad en modo prueba se mira **al desplegar**.

**Terminado cuando:** una cuenta nueva paga en modo prueba y entra al alta, desde el
móvil de Richi; `bd:comprobar-api` dice que el reloj está programado y ha latido; y la
pestaña Cuentas del admin la enseña al día.
