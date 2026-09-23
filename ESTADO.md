# ESTADO DEL PROYECTO

Última actualización: 23 de septiembre de 2026 · **Antes de M8. V, primera parte, en producción (#64 y #65). El repaso del 23-sep —lo que Richi vio en el móvil y la auditoría— va en `el-repaso-del-23-sep`, con su pull request ([#66](https://github.com/estook/EstookApp-V.2/pull/66)) y cuatro migraciones (`0041` a `0044`). Después: los puntos 4 y 5 de V**

> La memoria del proyecto. Se lee lo primero de cada sesión y se escribe lo último.
> **Nunca puede afirmar algo que no sea cierto en ese momento.**
>
> **¿Empiezas un chat nuevo?** Basta con «lee `ESTADO.md` entero y dime dónde estamos».
> Lo demás vive en su sitio, y aquí solo se enlaza:
>
> - **Lo que hizo cada módulo**, con sus fallos: [`docs/historia-de-los-modulos.md`](docs/historia-de-los-modulos.md)
> - **Lo aprendido fallando** (96 lecciones): [`docs/lecciones.md`](docs/lecciones.md)
> - **Las trece reglas** que no se discuten: [`docs/reglas.md`](docs/reglas.md)
> - **Por qué está hecho así**: [`docs/decisiones/`](docs/decisiones/)
> - **Los pasos de Richi** de cada entrega: [`docs/pasos-antes-de-m8.md`](docs/pasos-antes-de-m8.md)

---

## 1 · Dónde estamos

_Producción leída el 23 de septiembre de 2026, en una transacción de solo lectura._

|                |                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Terminados** | **M0** a **M6½** · **M7** (entregas 1, 1½, 1¾, 1⅞ y 4) · **A1**, la puerta del admin · **E1**, crear cuenta y Google · **V, primera parte** (puntos 1, 2, 3 y 7) |
| **Ahora**      | **El repaso del 23-sep**, en la rama `el-repaso-del-23-sep` con su pull request. Después, **V · puntos 4 y 5**. **E2 · Stripe** espera a Richi                   |
| **`main`**     | Todo fusionado hasta la **#65**                                                                                                                                  |
| **Base**       | Supabase, **40 de 40** migraciones, igual que `main`. **La rama trae cuatro más** (`0041` a `0044`): hay que aplicarlas al fusionar                              |
| **API**        | Desplegada el 23-sep a las 18:43 con la #64: 44 consultas y 84 comandos. **La rama trae una de cada** (45 y 85) y hay que desplegarla después de migrar          |
| **Sitio**      | `estook.com`, `/app/` y `/admin/`. Se publica solo al fusionar                                                                                                   |
| **Pruebas**    | En la rama: **1.177** unitarias y de base y **424** de pantalla, en verde · catálogo **124 de 130** (95 %), con sus seis deudas apuntadas                        |
| **Entrar**     | App: Ricardo (`ikatz`) y las cuentas de abajo. Admin: `estookapp@gmail.com` y Santi, los dos con segundo factor                                                  |
| **Dirección**  | **Evolución 1.1**: de aplicación de gestión a sistema operativo del local, y **de no cobrar a cobrar** (el TPV es la Fase 4)                                     |

> **M8 no empieza hasta que las veinte mejoras y el panel de administración estén al
> 100 %** (Richi, 16-sep). Los planes: [`docs/mejoras-antes-de-m8.md`](docs/mejoras-antes-de-m8.md)
> y [`docs/panel-de-administracion.md`](docs/panel-de-administracion.md).

### El orden, y dónde estamos en él

| #   | Entrega                          | Cómo está                                                                           |
| --- | -------------------------------- | ----------------------------------------------------------------------------------- |
| —   | **A1 · La puerta del admin**     | ✓ en producción (#53, #54)                                                          |
| —   | **E1 · Crear cuenta y Google**   | ✓ en producción (#56)                                                               |
| 1   | **V · Lo que se ve**             | Puntos 1, 2, 3 y 7 ✓ en producción (#64, #65). **Faltan el 4 y el 5**               |
| —   | **El repaso del 23-sep**         | **En su pull request** (abajo)                                                      |
| 2   | **E2 · El pago con Stripe**      | **Espera a Richi**: su cuenta de Stripe. Va en paralelo a V                         |
| 3   | **O · Lo que se ordena**         | Falta                                                                               |
| 4   | **A2 · Clientes**                | Falta                                                                               |
| 5   | **R · El reloj y los avisos**    | Falta · lleva dentro la entrega 2 de M7 (avisos a quien manda, invitar a un pedido) |
| 6   | **H · Horarios**                 | Falta · lleva dentro la entrega 3 de M7                                             |
| 7   | **I · La app instalable**        | Falta                                                                               |
| 8   | **L · El lector**                | Falta                                                                               |
| 9   | **A3 · Vendedores y códigos**    | Falta                                                                               |
| 10  | **A4 · Ventas**                  | Falta                                                                               |
| —   | **M8 · Inventario y desviación** | Después de todo lo anterior                                                         |

### El repaso del 23 de septiembre · lo que lleva la rama

Lo que Richi trajo mirando la app en el móvil, y la auditoría que pidió. Contado entero
en la [historia](docs/historia-de-los-modulos.md), apartado «el repaso del 23 de
septiembre».

| Qué                                                                             | Cómo                                                                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **El jefe de cocina ve las ventas** (ventas, ticket medio, cierres y food cost) | Solo ver; la caja la cierra quien lleva el local o la sala · **migración `0041`**      |
| **La merma no tira más de lo que hay**                                          | Lo avisa la hoja y lo impide el servidor (`mas_de_lo_que_hay`)                         |
| **«11 por debajo del mínimo» y salían 3**, y en Congelados                      | El título cuenta lo que enseña (`cuantosCumplen`); «Bajo mínimo» ya no pierde el final |
| **La muesca del iPhone tapaba la barra y las hojas**                            | Zona segura en la barra, las hojas, el buscador, entrar, el alta y el admin            |
| **Zoom al tocar un campo** en el móvil                                          | Campos a 16 px mínimo en pantallas táctiles                                            |
| **«Pequeña», más pequeña en el móvil**                                          | 0,82 solo por debajo de 640 px; el ordenador no cambia                                 |
| **Fogón, fuera de la barra de arriba**                                          | La burbuja sale también en el ordenador, y `Ctrl+J`. B5 y la 0015, cambiadas           |
| **Equipo: «Cómo va» debajo de fichar**                                          | Servicio no cambia                                                                     |
| **La ficha: tres fichajes y «Ver todos»**                                       | El historial entero, por meses y de 50 en 50 (`fichajes_de_una_persona`)               |
| **«En línea» solo con la app abierta**                                          | Aviso cada 45 s mientras se ve (`sigo_aqui`); dos minutos sin él, fuera · **`0042`**   |
| **El TPV: «añadir terminal»**                                                   | Encaja con el Anexo 3.4, y lo que faltaba está escrito ahí («Dar de alta un terminal») |
| **Auditoría**: siete funciones con privilegio abiertas                          | Cerradas todas, y una prueba mira todas · **`0043`**                                   |
| **Velocidad**: el Resumen de Inventario tardaba 2,6 s con 400 productos         | El precio vigente, de una pasada: 0,34 s · **`0044`**                                  |
| **Auditoría**: 440 claves caducadas sin borrar                                  | Las tira `anotar` al apuntar una nueva                                                 |
| **Auditoría**: acciones de GitHub con Node 20 y ocho avisos del lint            | A Node 24; los avisos, arreglados sin apagar la regla                                  |
| **ESTADO.md, resumido**                                                         | Esto. Las lecciones y el detalle, en su documento                                      |

**La auditoría no encontró** ninguna tabla sin seguridad por filas, ningún dato
cruzado entre negocios, ningún producto en negativo, ningún fichaje imposible ni ningún
cierre duplicado; y el libro de movimientos cuadra entero. `anon` y `authenticated` no
tienen acceso al esquema `estook`.

### Lo que todavía NO está en la app

Para que nadie dé por hecho lo que solo está escrito:

- **De las veinte mejoras, cuatro en producción**: la 1 (modo cocina), la 2 (las cifras
  de cada app), la 3 (el Resumen) y la 7 (Ajustes en secciones). Las demás tienen su
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

Uso real: 11 productos, 316 movimientos, 7 cierres de caja, 25 fichajes y 4 pedidos.
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

**Ahora:** fusionar el pull request del repaso, **aplicar las cuatro migraciones** y
**desplegar la API**, en ese orden. Los pasos, uno a uno, en
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

**El peso inicial** (`pnpm tamano`, 23-sep, en la rama de V): `app` **292,3 KB**, `admin`
**209,8 KB**, `web` 166,0 y `carta` 167,1; de cada uno, 106,1 KB son la tipografía. La
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

| Núm      | Qué                                                                     |
| -------- | ----------------------------------------------------------------------- |
| **0001** | GitHub Pages en vez de Netlify                                          |
| **0002** | La API en Hono sobre Supabase Edge Functions                            |
| **0003** | M0 crea el esqueleto mínimo de alcances                                 |
| **0004** | El presupuesto de velocidad de B7, reconstruido                         |
| **0005** | Cómo se conecta la API: `set local role` dentro de la transacción       |
| **0006** | El motor fiscal: sin regla, no se inventa un tipo                       |
| **0007** | El movimiento en CSS: no se instala `Motion` hasta que haga falta       |
| **0008** | El enrutado con almohadilla, mientras se publique en GitHub Pages       |
| **0009** | El buscador quita los acentos con `translate`, no con `unaccent`        |
| **0010** | El login es nuestro, no de Supabase Auth                                |
| **0011** | Las pruebas de extremo a extremo levantan la API de verdad              |
| **0012** | El producto nace en M6, y M5 le deja el diccionario                     |
| **0013** | Google Places se aplaza a M23                                           |
| **0014** | Un módulo reacciona a otro en la misma transacción                      |
| **0015** | Fogón es una burbuja que va contigo, no una pestaña por app             |
| **0016** | El reloj es `pg_cron` llamando a nuestra API · se monta con Google      |
| **0017** | Cómo avisa Estook: pantalla, correo con Resend y push                   |
| **0018** | Cada app tiene destinos, y cada destino sus vistas                      |
| **0019** | El Panel de cada uno vive en el servidor, por persona y aparato         |
| **0020** | Un catálogo de acciones, y una acción es una dirección                  |
| **0021** | El producto se mide en una unidad; los gramajes son de la ficha         |
| **0022** | El reparto tiene sitio antes que conexión; Uber Eats el primero         |
| **0023** | Fogón nunca arma su contexto en el navegador: lo arma el servidor       |
| **0024** | El color del local pinta la app, y hay dos temas                        |
| **0025** | Fichar pide dónde, y no bloquea nunca                                   |
| **0026** | La merma tiene motivo y partida, y la apunta quien la rompe             |
| **0027** | La caja se cierra sin TPV, y los dos caminos acaban en el mismo         |
| **0028** | El alta de producto pregunta cuánto hay, no cuánto se aprovecha         |
| **0029** | Lo que va a una columna JSON viaja como texto                           |
| **0030** | El local se sitúa con Google, al final de M7, con tope de gasto         |
| **0031** | El Calendario recoge lo de todos los módulos, con quién lo ve           |
| **0032** | Las compras: Estook no manda, el albarán mueve y la factura confirma    |
| **0033** | Los precios de compra se guardan sin IVA, y se escriben como venga      |
| **0034** | Nadie gestiona el acceso de su igual: lo hace quien está por encima     |
| **0035** | El alta pregunta cómo se compra, y la cuenta la hace el dominio         |
| **0036** | La dirección es `estook.com`, y la sabe el código                       |
| **0037** | Lo que sale de cámara dice si se vendió; el dinero lo cuenta la caja    |
| **0038** | Cada producto es de una zona, y cada uno trabaja con la suya            |
| **0039** | El Panel se monta como un móvil, y cada uno se pone sus cifras          |
| **0040** | El local se busca en Google, con el tope contado antes de llamar        |
| **0041** | El panel de administración: el cliente es la organización               |
| **0042** | Registro abierto con correo o Google, y se paga al empezar salvo oferta |
| **0043** | Canarias entra con IGIC; Ceuta y Melilla esperan; foral y SII, fuera    |
| **0044** | Las cifras de cada app: la misma tarjeta, las mismas cuentas            |
| **0045** | El aspecto y el orden: Resumen, mosaico y Ajustes por secciones         |

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
- **Las migraciones `0001` a `0044`.** Se amplían con una `0045`, nunca se editan
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

---

## 8 · El siguiente paso

**Primero, el repaso del 23-sep** (rama `el-repaso-del-23-sep`, con su pull request):
Richi lo fusiona, aplica las migraciones `0041` a `0044` y despliega la API. Luego mira
en el móvil la muesca, el zoom, la letra pequeña, la merma y la ficha de un trabajador.

**Luego, V · segunda parte**, en una rama nueva:

- **4 · Estados vacíos con dibujo y una acción**, cargados aparte. Con la cámara vacía,
  Inventario · Resumen enseña cómo empezar y no «Cómo va»; los vacíos que hoy dicen «Se
  empieza por Productos» ganan su botón.
- **5 · El tema oscuro con capturas que se comparan en la prueba, y las fotos de
  producto** en el almacén del logo. Lo del tema del sistema ya está hecho (0045).

**Terminado cuando** (del plan): las tres apps enseñan sus cifras —hecho—; el modo cocina
se mide en las pantallas —hecho—; cada app abre con su Resumen —hecho—; los vacíos
invitan a empezar; y las capturas en oscuro se comparan en la prueba.

**Cómo se comprueba que no rompe lo de antes:** `.\estook.cmd verifica`,
`.\estook.cmd prueba:e2e:completa` (que incluye la cobertura) y, tras desplegar,
`.\estook.cmd bd:comprobar-api`.

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
