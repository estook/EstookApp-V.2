# ESTADO DEL PROYECTO

Última actualización: 26 de septiembre de 2026, por la tarde · **Antes de M8. El repaso del 25-sep (#72, `0048`) y L · el lector (#73), en producción; nadie ha pagado todavía. A2 · los clientes en el admin, en la #74 con la migración `0049`. Después, R**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último.
> **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> **¿Empiezas un chat nuevo?** Basta con «lee `ESTADO.md` entero y dime dónde estamos».
> Lo demás vive en su sitio, y aquí solo se enlaza:
>
> - **Lo que hizo cada módulo**, con sus fallos: [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)
> - **Lo aprendido fallando** (121 lecciones): [`docs/lecciones.md`](docs/lecciones.md)
> - **Las trece reglas** que no se discuten: [`docs/reglas.md`](docs/reglas.md)
> - **Por qué está hecho así**: [`docs/decisiones/`](docs/decisiones/)
> - **Los pasos de Richi** de cada entrega: [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)

---

## 1 · Dónde estamos

_Producción leída el 26-sep por la tarde, en solo lectura: migraciones, organizaciones y suscripciones; los despliegues y GitHub de `main`, mirados por dentro._

|                  |                                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados**   | **M0** a **M6½** · **M7** (entregas 1, 1½, 1¾, 1⅞ y 4) · **A1** · **E1** · **V** · **el repaso del 23-sep** · **los arreglos del móvil** · **O** · **el Panel en el móvil** (#70) · **E2** (#71) · **el repaso del 25-sep** (#72) · **L** (#73) |
| **Por fusionar** | **A2 · los clientes en el admin** (#74), con la migración `0049` y la [decisión 0050](docs/decisiones/0050-los-clientes-en-el-admin.md). Apartado 11                                                                                            |
| **Ahora**        | Que Richi fusione la #74, aplique la `0049` y despliegue la API. Después, **R · el reloj y los avisos**                                                                                                                                         |
| **`main`**       | Todo fusionado hasta la **#73**, en verde y sin pruebas repetidas                                                                                                                                                                               |
| **Base**         | Supabase, **48 de 48** migraciones, igual que `main` (la `0048`, el 26-sep a las 16:01). Con la #74 serán 49                                                                                                                                    |
| **API**          | Desplegada el 26-sep a las 16:02 con la #72: **51 consultas y 99 comandos**, y **el reloj latiendo**. La #73 no tocaba la API. Con la #74 serán 52 y 111                                                                                        |
| **Sitio**        | `estook.com`, `/app/`, `/carta/<local>` y `/admin/`. Se publica solo al fusionar (la #73, el 26-sep a las 16:07)                                                                                                                                |
| **Pruebas**      | En `main`: **1.326** unitarias y de base y **746** de pantalla, en verde y sin repetidas. En la #74, en local: **1.362** y **535** de pantalla (sin Safari)                                                                                     |
| **Entrar**       | App: Ricardo (`ikatz`) y las cuentas de abajo. Admin: `estookapp@gmail.com` y Santi, los dos con segundo factor                                                                                                                                 |
| **Dirección**    | **Evolución 1.1**: de aplicación de gestión a sistema operativo del local, y **de no cobrar a cobrar** (el TPV es la Fase 4)                                                                                                                    |

> **M8 no empieza hasta que las veinte mejoras y el panel de administración estén al
> 100 %** (Richi, 16-sep). Los planes: [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)
> y [`docs/panel-de-administracion.md`](docs/panel-de-administracion.md).

### El orden, y dónde estamos en él

| #   | Entrega                          | Cómo está                                                                     |
| --- | -------------------------------- | ----------------------------------------------------------------------------- |
| —   | **A1 · La puerta del admin**     | ✓ en producción (#53, #54)                                                    |
| —   | **E1 · Crear cuenta y Google**   | ✓ en producción (#56)                                                         |
| 1   | **V · Lo que se ve**             | ✓ en producción (#64, #65, #67)                                               |
| —   | **El repaso del 23-sep**         | ✓ en producción (#66)                                                         |
| —   | **Los arreglos del móvil**       | ✓ en producción (#68)                                                         |
| 2   | **O · Lo que se ordena**         | ✓ en producción (#69, migración `0046`)                                       |
| —   | **El Panel en el móvil**         | ✓ en producción (#70)                                                         |
| 3   | **E2 · El pago con Stripe**      | ✓ en producción (#71, migración `0047`). **Falta probar el pago**: apartado 2 |
| —   | **El repaso del 25-sep**         | ✓ en producción (#72, migración `0048`, decisión 0049)                        |
| 4   | **L · El lector**                | ✓ en producción (#73; adelantada, era la 8)                                   |
| 5   | **A2 · Clientes**                | **Hecha, en la #74** (migración `0049`, decisión 0050). Apartado 11           |
| 6   | **R · El reloj y los avisos**    | Falta · lleva dentro la entrega 2 de M7. **El reloj ya lo montó E2**          |
| 7   | **H · Horarios**                 | Falta · lleva dentro la entrega 3 de M7                                       |
| 8   | **I · La app instalable**        | Falta                                                                         |
| 9   | **A3 · Vendedores y códigos**    | Falta                                                                         |
| 10  | **A4 · Ventas**                  | Falta                                                                         |
| —   | **M8 · Inventario y desviación** | Después de todo lo anterior                                                   |

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **De las veinte mejoras, diez en producción y el QR de la 20**: la 1, 2, 3, 4, 5, 6, 7,
  8, 9 y 17. Las demás, con su plan en [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md).
- **Nadie ha pagado todavía**, ni en modo prueba: el 26-sep por la tarde no hay ninguna
  suscripción en Stripe (alguien abrió la página de pago una vez: el catálogo de Stripe
  ya está creado). **Se cobra en modo prueba**; para cobrar de verdad hace falta la clave
  real y la cuenta de Stripe activada con los datos fiscales de quien factura
  (apartado 9).
- **Del admin, la puerta** y, con la #74, **los clientes**; ni vendedores y códigos (A3)
  ni ventas (A4).
- **No hay recuperar la contraseña por correo** (la da quien lleva el local).
- **Lo que espera a su módulo**: los platos, sus fichas y sus escandallos (M9 y M10, con
  el diseño de Richi ya escrito en el Plan), leer fotos (M22), responder reseñas
  (Business Profile), hablar con Fogón (M22) y el TPV (Fase 4).

### Lo que hay de verdad en producción

Cinco organizaciones reales, además de las tres de ejemplo (leído el 26-sep por la tarde):

| Organización    | Locales | Cómo está                                                         |
| --------------- | ------- | ----------------------------------------------------------------- |
| `ikatz`         | 1       | **Activa, de la casa**: no paga. Richi ha entrado después de E2   |
| `burger-king`   | 2       | Prueba caducada el 18-sep: **tiene que elegir plan** para entrar  |
| `prueba1`       | 1       | Pendiente de pago                                                 |
| `prueba1-1`     | 1       | Prueba hasta el 28-sep; después, elegir plan                      |
| `pizzeriacazzo` | 1       | **Nueva, de Santi** (25-sep, 17:42): pendiente de pago, sin pagar |

`ikatz` es el negocio de Richi; `burger-king` es de prueba, lo creó él; `prueba1` y
`prueba1-1` se crearon con Google el 17-sep. Los tres ejemplos, **de la casa**.

---

## 2 · Lo que es de Richi

**Ya hecho, y no se vuelve a pedir:** Resend (dominio `estook.com`, remitente
`hola@estook.com`) · entrar y crear cuenta con Google · Places (IKATZ enlazado) · los
datos del titular (#59) · **V entera** · **la #68, la #69 y la #70** · **la cuenta de
Stripe** (24-sep) · **las siete respuestas de E2** · **`STRIPE_SECRET_KEY`** · **la #71
fusionada, la `0047` aplicada, la API desplegada y `bd:comprobar-api` en OK con el reloj
latiendo** (25-sep) · **los siete puntos del repaso y las tres respuestas de A2** (25-sep) ·
**la #72 y la #73 fusionadas, la `0048` aplicada, la API desplegada y comprobada** (26-sep).

**Ahora, en este orden** (los pasos, uno a uno, en
[`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)):

1. **Fusionar la #74**, aplicar la `0049` y desplegar la API. Después, `bd:comprobar-api`
   tiene que decir «52» y «111».
2. **Probar el pago en modo prueba**, con una cuenta nueva y la tarjeta `4242 4242 4242
4242`. Es lo único de E2 que no se puede comprobar desde aquí: pide crear una cuenta y
   pagar, y eso lo haces tú.
3. **Mirarlo en el iPhone**, con la app instalada: «Hoy», la barra de abajo y el lector.

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
   ¿Con Horarios o aparte? Mientras, el horario se comparte en PDF. (El Tablón es para
   los avisos del día, no un chat.)
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
(`bd:rafaga` lo mide). **65 tablas —57 en `estook` y 8 en `plataforma`— todas con
seguridad por filas** (con la #74, 69: la ficha comercial, las notas de cliente, la foto
diaria del uso y los cambios de correo, las cuatro en `plataforma`); la única
vista es `estook.existencias`. **`pg_cron` y `pg_net`, encendidos por la `0047`**: el
reloj late a los siete minutos de cada hora. Se comprueba con `.\estook.cmd
bd:comprobar`, que lo lee de la base y no de aquí.

**Almacén de ficheros:** Supabase Storage, con cubos privados —`marca`, `fotos-de-producto`
y `cartas`—. En las filas, claves; los
enlaces los firma la API y caducan.

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

**El peso inicial** (`pnpm tamano`, 26-sep, rama de la #74): `app` **317,8 KB**, `admin`
**222,5 KB**, `web` 166,4 y `carta` 172,1; de cada uno, 106,1 KB son la tipografía. La
referencia es 250 y **se mide, no bloquea**: manda el presupuesto de velocidad, que pasa
en la prueba de pantalla. Compras, Recharts, `@dnd-kit`, **PDF.js** (solo al subir la
carta en PDF) y **el lector del iPhone** (solo al abrir la cámara) se cargan aparte.

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

| Núm      | Qué                                                                                      |
| -------- | ---------------------------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify                                                           |
| **0002** | La API en Hono sobre Supabase Edge Functions                                             |
| **0003** | M0 crea el esqueleto mínimo de alcances                                                  |
| **0004** | El presupuesto de velocidad de B7, reconstruido                                          |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción                        |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                                        |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta                        |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages                        |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`                         |
| **0010** | El login es nuestro, no de Supabase Auth                                                 |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad                               |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                                      |
| **0013** | Google Places se aplaza a M23                                                            |
| **0014** | Un módulo reacciona a otro en la misma transacción                                       |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app                              |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con E2 (0048)                    |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                                    |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                                       |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato                          |
| **0020** | Un catálogo de acciones, y una acción es una dirección                                   |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha                          |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero                          |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor                        |
| **0024** | El color del local pinta la app, y hay dos temas                                         |
| **0025** | Fichar pide dónde, y no bloquea nunca                                                    |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe                              |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo                          |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha                          |
| **0029** | Lo que va a una columna JSON viaja como texto                                            |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto                          |
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve                            |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma                     |
| **0033** | Los precios de compra se guardan sin IVA, y se escriben como venga                       |
| **0034** | Nadie gestiona el acceso de su igual: lo hace quien está por encima                      |
| **0035** | El alta pregunta cómo se compra, y la cuenta la hace el dominio                          |
| **0036** | La dirección es `estook.com`, y la sabe el código                                        |
| **0037** | Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja                     |
| **0038** | Cada producto es de una zona, y cada uno trabaja con la suya                             |
| **0039** | El Panel se monta como un móvil, y cada uno se pone sus cifras                           |
| **0040** | El local se busca en Google, con el tope contado antes de llamar                         |
| **0041** | El panel de administración: el cliente es la organización                                |
| **0042** | Registro abierto con correo o Google, y se paga al empezar salvo oferta                  |
| **0043** | Canarias entra con IGIC; Ceuta y Melilla esperan; foral y SII, fuera                     |
| **0044** | Las cifras de cada app: la misma tarjeta, las mismas cuentas                             |
| **0045** | El aspecto y el orden: Resumen, mosaico y Ajustes por secciones                          |
| **0046** | Los vacíos invitan, el oscuro se mide y fotografía, y la foto de cada producto           |
| **0047** | El «+» con Fogón, lo de hoy, el Panel de cada puesto, el semáforo y el QR                |
| **0048** | El pago con Stripe: sin pago no hay app, siete días de gracia y todo en Ajustes          |
| **0049** | Almacén e Inventario, lo congelado aparte, el Tablón y la carta subida                   |
| **0050** | Los clientes en el admin: todo de Stripe, tres gestos y el correo con doble confirmación |

> **Ojo con los números:** las decisiones y las migraciones se numeran aparte. La
> **decisión** 0048 es el pago y la monta la **migración** `0047`; la **decisión** 0049
> es el repaso del 25-sep y la monta la **migración** `0048`; la **decisión** 0050 son los
> clientes del admin y la monta la **migración** `0049`.

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
  `@dnd-kit` para arrastrar los widgets (0039), en su propio trozo; y **`pdfjs-dist`**
  para pasar a imágenes la carta que se sube en PDF (0049), que solo se descarga al
  elegir un PDF; y **`barcode-detector`** con **`zxing-wasm`** para leer códigos en el
  iPhone (entrega L), que Safari no sabe leer: se descarga solo al abrir el lector y **su
  WebAssembly se sirve desde Estook**. Por eso la política de seguridad lleva
  `'wasm-unsafe-eval'`, que deja compilar WebAssembly y no abre `eval`. **Stripe va sin librería** (unas pocas llamadas `fetch`, como Resend y Google). Contraseñas, segundo
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
- **Las migraciones `0001` a `0048`** (y la `0049` en cuanto se fusione). Se amplían con
  la siguiente, nunca se editan (regla 2). Y al ampliar una función SQL, **se copia la
  original entera**; al cambiar el nombre de un permiso, **se leen sus políticas de
  `pg_policies`** en vez de reescribirlas (lección 119).
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
  las cuenta con sus nombres —**44 en `estook`** y **6 en `plataforma`** (con A2)— y otra
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
- **Almacén e Inventario** (0049): la app es **Almacén** (`/almacen`, `app.almacen`) y
  contar la cámara es **Inventario**. Por dentro, el acto de contar sigue siendo
  `recuento` (tipo de movimiento, `cerrar_recuento`, `accion.cerrar_recuento`). Las
  direcciones viejas llevan a las nuevas (`direccionesViejas.ts`); la historia no se
  reescribe.
- **Lo congelado no caduca** (0049): no sale entre lo que caduca; avisa por lo que lleva
  congelado (`congelado_aguanta_meses`, tres por defecto) y congelar no pregunta la
  caducidad. El día lo cuenta la base; qué se dice, `congelado.ts`.
- **El Tablón** (0049): escribe cualquiera del local, a su nombre; quita su autor o quien
  ve Equipo; la cocina no ve lo de sala ni al revés. Con hora, sale en «Hoy» y en el
  Calendario **leído de su tabla**, no copiado.
- **La carta subida** (0049): páginas en imagen, subidas de una en una y **publicadas de
  una vez**; solo claves de `cartas/<su local>/`.
- **En el iPhone** (0049): **nada se esconde con `:has(:empty)`** (`usarSinNadaDentro`; lo
  tasa `sin-has.prueba.ts`), y **lo pegado abajo lleva `--desfase-abajo`** y se aparta
  con el teclado (`anclaAbajo.ts`).
- **Las semillas se cargan por orden alfabético**: su nombre es su turno (lección 118).
- **El lector** (L): un código se busca por `codigo_de_barras` exacto; lo nuevo va al
  alta con él puesto; Open Food Facts **solo propone**, y solo para códigos de tienda; y
  un lector de mano se reconoce por su velocidad (`esDeUnLector`), fuera de los campos. La
  única excepción de `.dependency-cruiser.cjs` para él es su fichero WebAssembly (`?url`),
  que la herramienta no sabe resolver.
- **Los clientes del admin** (0050): el admin **lee** a sus clientes solo por las funciones
  de la `0049` (`los_clientes`, `un_cliente`, `el_uso_de`, `lo_que_hacen_los_clientes`),
  que devuelven lo justo y comprueban ellas mismas que quien pregunta es admin o el reloj.
  **Lo que el admin toca del cliente llega a la auditoría del cliente**
  (`anotar_desde_el_admin`). **La actividad cuenta el trabajo, no montar la cuenta**, y la
  decide el dominio (`laActividad`). **El correo de acceso solo cambia con el enlace del
  correo nuevo**, que hay que pulsar; en la base, solo huellas.
- **Una prueba no fija el día si la base apunta con `now()`**: cuenta desde hoy (lección
  120).

---

## 8 · El siguiente paso

**Primero, la #74**: fusionar, aplicar la `0049`, desplegar la API y mirar Clientes en el
admin. **Que Richi pruebe el pago** con la 4242 (lo único de E2 sin comprobar) y mire el
iPhone. **Después, R · el reloj y los avisos**, la siguiente del orden.

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
| El vendedor de cada cliente y el código con que llegó      | **A3**           | La ficha de cada cliente (A2)                                   |
| El tablero de ventas                                       | **A4**           | La foto diaria del uso de cada cliente (A2)                     |
| Leer los platos de la carta subida y proponer los cambios  | **M10**          | La carta subida y enseñada por su QR (0049)                     |
| Plato, ficha técnica y escandallo unidos por su id         | **M9**           | El diseño de Richi, escrito en el Plan (0049)                   |
| La historia del Tablón, por días                           | **M17**          | El Tablón, con sus notas guardadas (0049)                       |
| Cerrar un local (y que la cuota baje)                      | Sin fecha        | La cuota ya sube sola al abrir uno                              |

**Sin prisa, de código:** volver a `BrowserRouter` ahora que hay dominio
([0008](docs/decisiones/0008-enrutado-con-almohadilla.md)); pasar Pedidos, Albaranes y
Facturas a `usarListaLarga` cuando una crezca; subir a React Router 7; **el 19 de
octubre, mirar la integración continua**, que GitHub pasa `ubuntu-latest` a Ubuntu 26 ese
día; y el vectorial del logotipo y de Fogón cuando aparezcan.

---

## 9 · E2, el pago con Stripe

**En producción desde el 25-sep** (#71, migración `0047`,
[decisión 0048](docs/decisiones/0048-el-pago-con-stripe.md)), con lo que contestó Richi:

| Qué                       | Cómo queda                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Sin pago no hay app**   | Toda cuenta nueva paga antes de entrar, **también con oferta**. Lo cumple la API en cada petición: ni mirar ni escribir sin pagar |
| **La prueba**             | **Con tarjeta**: hoy no se cobra, el primer cobro al acabar, un correo siete días antes, y cancelando antes no se paga nada       |
| **La cuota por local**    | Cambia sola al abrir uno (se dice cuánto antes), prorrateada; **Pro con dos o más pasa a Cadena**, que es más barato              |
| **Un cobro que falla**    | **Siete días** trabajando con un aviso arriba y **un correo cada día**; el octavo, **solo lectura**. No se borra nada             |
| **Ajustes → Suscripción** | Plan, cuota, renovación o fin de prueba, tarjeta; cambiar de plan (con Pausa), cancelar y seguir; tarjeta y facturas en el portal |
| **Las cuentas de ahora**  | `ikatz` y los ejemplos, **de la casa**; las demás, como cualquier cliente                                                         |
| **El admin**              | Era la pestaña **Cuentas**; con la #74, **Clientes** (apartado 11)                                                                |
| **Lo legal**              | Condiciones y privacidad al día; en la app, plegado en «Cómo funciona el pago»; en Stripe, junto al botón                         |

**Comprobado en producción el 25-sep:** la API conoce las 50 consultas y los 93 comandos;
el reloj está programado y late (el último día hecho, el 25); `ikatz` está activa, de la
casa, y Richi ha entrado después del despliegue; la función de la pestaña Cuentas
(`estook.las_cuentas`) devuelve las ocho organizaciones con su estado; y el aviso de
Stripe rechaza lo que no firma Stripe.

**Lo que falta, y es de Richi:** **pagar una vez en modo prueba** con la 4242. Nadie lo ha
hecho todavía (`plataforma.stripe` vacía: el catálogo de Stripe se crea con el primer
pago). Es lo único que no se puede comprobar sin crear una cuenta y pagar.

**Terminado cuando:** una cuenta nueva paga en modo prueba y entra al alta, desde el
móvil de Richi, y el admin la enseña en Clientes, pestaña Pagando.

---

## 10 · El repaso del 25-sep, y lo decidido para L y A2

**En producción desde el 26-sep** (#72), con la migración `0048` y la
[decisión 0049](docs/decisiones/0049-almacen-inventario-congelado-tablon-y-carta.md).
Los siete puntos que Richi vio al mirar E2, con sus respuestas (las cuatro, la
recomendada):

| Qué pidió                              | Cómo queda                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **1 · Lo congelado, aparte**           | No avisa por caducidad: avisa por lo que lleva congelado, **3 meses** o lo que diga su ficha, una semana antes y el día        |
| **2 · Almacén e Inventario**           | La app es **Almacén** y contar es **Inventario**, en pantallas, direcciones, permiso, código y maestros. Lo de antes redirige  |
| **3 · La carta**                       | **Se sube ya** (PDF o fotos, en Ajustes) y es lo que enseña el QR. Plato, ficha y escandallo, **escritos en el Plan** (M9–M10) |
| **4 · El alta**                        | Pide el **mínimo**, y la unidad se toca para elegir **kg o g**. «Escanear producto», con **L, adelantada**                     |
| **5 · «Hoy» en el iPhone**             | Era `:has(:empty)`, que WebKit no vuelve a mirar: ahora lo decide la página, y una prueba lee el código                        |
| **6 · Avisos compartidos**             | **El Tablón** en el Panel: para todos o cocina o sala, con hora (Calendario, y «Hoy» al leerla), «Leído» y quién falta         |
| **7 · La barra que sube en el iPhone** | El visor que se queda colgado tras el teclado: lo pegado abajo lo compensa (`anclaAbajo`) y con teclado se aparta              |

**Probado:** **20** contra la base (`el-repaso-del-25-sep.prueba.ts`), los del dominio,
la unidad del visor, las direcciones viejas y el que prohíbe `:has(:empty)`; y **7** de
pantalla (`el-repaso-del-25-sep.spec.ts`, una con un PDF de verdad). En local: **1.323** unitarias y de base, y la
batería de pantalla en verde. **Lo que no se puede probar aquí**: el iPhone de verdad
(los dos fallos son de WebKit en el teléfono) — lo mira Richi.

**Lo que decidió Richi para A2 · Clientes** (25-sep): el admin **ve todo lo de Stripe y
hace tres gestos con motivo** —alargar la prueba, marcar de la casa, cancelar al final
del periodo—; lo demás, «Abrir en Stripe»; **cambiar el correo de acceso entra en A2**,
con doble confirmación por correo; y **la actividad de cada cliente se calcula cada
noche** con el reloj.

**Terminado cuando:** Richi lo mira en su iPhone con la app instalada: «Hoy» a la
primera, la barra abajo tras cerrar el teclado, su carta subida en el QR, y una nota del
Tablón leída desde otra cuenta.

### L · El lector (#73)

**En producción desde el 26-sep** (#73), adelantada y **sin migración** (el plan, punto por punto, en [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)):
**«Escanear»** a la derecha de «Añadir producto» (abre la ficha, o el alta con el código
puesto y el nombre que propone **Open Food Facts**); **los lectores de mano**, reconocidos
solos; **el inventario** suma uno por lectura; **recibir** marca la línea; pita y vibra
distinto; y siempre se puede escribir el código a mano. **Probado**: `codigos.prueba.ts` y
**5** de pantalla (`el-lector.spec.ts`). **La cámara de verdad**, en el móvil de Richi.

---

## 11 · A2, los clientes en el admin (#74)

**Hecha el 26-sep** en la rama `a2-clientes`, con la migración `0049` y la
[decisión 0050](docs/decisiones/0050-los-clientes-en-el-admin.md), con las tres
respuestas de Richi del 25-sep:

| Qué                      | Cómo queda                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **La lista**             | **Clientes** sustituye a Cuentas y es lo primero del admin: pestañas, buscador, filtros, orden por columnas, de 50 en 50        |
| **Contrato y actividad** | Separados. La actividad, **una foto por cliente y día** que hace el reloj, o «Calcular ahora»; cuenta el trabajo, no el alta    |
| **La ficha**             | Resumen, Datos, Personas, Suscripción, Uso, Actividad y Notas; las alertas arriba                                               |
| **La suscripción**       | Todo lo de Stripe a la vista y **tres gestos con motivo**: alargar la prueba, de la casa, cancelar al acabar; «Abrir en Stripe» |
| **El correo de acceso**  | Con motivo y el código otra vez; enlace al nuevo para confirmar y al de ahora para parar, 24 horas, un solo uso                 |
| **Exportar**             | CSV para Excel, con el código otra vez y en la auditoría                                                                        |
| **Lo que ve el cliente** | Lo que el admin le cambia, en su auditoría, «por: Estook» y con el motivo                                                       |

**Probado:** **20** contra la base con el Stripe de mentira (`los-clientes.prueba.ts`), los
del dominio y del admin, y **7** de pantalla (`los-clientes.spec.ts`). **Alargar la
prueba** no tiene prueba de pantalla —la prueba nace de la oferta, que es una para todo
Estook—: está en la deuda de la cobertura con su razón. **Sin CIF**: la organización no
lo tiene todavía; se busca por nombre, código, correo y teléfono.

**Terminado cuando:** con la #74 fusionada, la `0049` aplicada y la API desplegada, Richi
abre Clientes en el admin, pulsa «Calcular ahora» y ve a `ikatz` de la casa.
