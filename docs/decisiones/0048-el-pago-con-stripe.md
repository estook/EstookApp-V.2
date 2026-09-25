# 0048 · El pago con Stripe: sin pago no hay app, siete días de gracia y todo en Ajustes

**Fecha:** 25 de septiembre de 2026
**Estado:** decidido. Es la **entrega 2** de la [0042](0042-registro-abierto-google-y-la-oferta.md)
**Cambia:** de la 0042, «con la oferta encendida la cuenta nace en prueba» (ahora la
prueba **pide tarjeta**); de la [0016](0016-el-reloj-es-pg-cron-llamando-a-la-api.md), dónde vive el
secreto del reloj
**Precisa:** los estados de la suscripción de la 0018 y de la Auditoría de flujos (Parte 4)

## Lo que contestó Richi (25-sep)

1. **La cuota cambia sola** al abrir un local, «bien hecho y pensado».
2. **Tarjeta.**
3. **Siete días** si falla un cobro, no semanas —hay IA y gastos—, con **un correo cada
   día** y un aviso al entrar con los días que quedan, **y que no se pierde nada**.
4. **Ajustes → Suscripción**, con todo a mano: el plan, cuánto queda, la renovación,
   cancelar.
5. **La prueba pide tarjeta**: se pone, empieza la prueba y al acabar se renueva sola.
   Explicado, legal, pero sin ponerlo delante de todo. Se cancela antes en Ajustes →
   Suscripción y no se cobra nada.
6. **Solo `ikatz` sin cobrar**, para probar. Y **sin pago no hay app**: quien crea su
   cuenta paga antes de entrar, con o sin prueba, y no puede haber forma de saltárselo.
7. La forma **más legal**, hasta que haya sociedad o alta de autónomo.

## Lo que se decide

### Uno · Stripe cobra; Estook decide qué se puede hacer

**El pago se hace en la página de Stripe** (Checkout), no dentro de la app: ni un script
de Stripe entra en nuestras páginas (la política de seguridad sigue en `script-src
'self'`), la tarjeta no pasa nunca por Estook, y Apple Pay y Google Pay vienen solos.
**El portal de Stripe** queda para lo que es de la tarjeta: cambiarla, ver y descargar
facturas, pagar una pendiente y los datos de facturación. Lo demás —plan, cancelar,
reanudar— se hace **en Ajustes → Suscripción**, que es donde lo pidió Richi.

**Una sola clave, `STRIPE_SECRET_KEY`.** Los productos, los precios, el 21 % de IVA
incluido, el portal y el aviso (webhook) **los crea el código** la primera vez que hacen
falta, y los encuentra las siguientes por su nombre (`lookup_key`). El secreto del aviso
—Stripe lo da una sola vez, al crearlo— se guarda en `plataforma.stripe`, donde solo
llega la API. La versión de la API de Stripe va **fija** (`2026-08-26.dahlia`).

### Dos · Lo que dice Stripe se vuelve a preguntar

Un aviso de Stripe se comprueba por su firma (HMAC-SHA256 con cinco minutos de
margen), se apunta por su identificador para no aplicarlo dos veces, y **no se cree lo
que trae**: se vuelve a leer la suscripción entera a Stripe y se guarda eso. Así da
igual el orden en que lleguen los avisos.

| Stripe dice                        | Estook guarda                       |
| ---------------------------------- | ----------------------------------- |
| `trialing`                         | `prueba`, hasta el fin de la prueba |
| `active`                           | `activa`                            |
| `past_due`, `unpaid`               | `impago`, desde el primer fallo     |
| `canceled`, `paused`               | `solo_lectura`                      |
| `incomplete`, `incomplete_expired` | `pendiente_de_pago`                 |

### Tres · Cómo está la cuenta, y qué deja hacer

Lo cuenta el dominio (`comoEstaLaCuenta`) con el estado guardado y la fecha, y lo
**cumple la API en cada petición** (la quinta puerta del despachador), no la pantalla:

| Cómo está         | Cuándo                                                                    | Deja                                      |
| ----------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| **Al día**        | activa, o **de la casa** (`ikatz` y los ejemplos)                         | todo                                      |
| **En prueba**     | en prueba y dentro de fecha                                               | todo                                      |
| **Cobro fallido** | impago, **los siete primeros días**                                       | todo, con el aviso de los días que quedan |
| **Solo lectura**  | impago del día 8 en adelante, cancelada, o en **Pausa**                   | mirar y exportar; escribir, no            |
| **Sin pagar**     | pendiente de pago, archivada, o una prueba vieja sin tarjeta que ya acabó | **nada**, salvo pagar y salir             |

Lo que se puede hacer sin pagar lo declara cada operación (`sinPagar`): quién soy, la
suscripción, pagar, el portal, salir, la contraseña y poco más. **Una operación nueva
queda cerrada si no dice nada**, que es como no hay camino que rodee la regla.

### Cuatro · Sin pago no hay app

Toda cuenta nueva nace **pendiente de pago** y lo primero que ve es **Elige tu plan**,
también con la oferta encendida: entonces la oferta son sus días de prueba **con
tarjeta** (se guardan al crear la cuenta, así que apagar la oferta después no se los
quita). La tarjeta se valida al pagar; no se cobra nada hasta que acaba la prueba. Al
volver de Stripe, la app espera a que llegue el aviso y entra sola.

### Cinco · La cuota es por local, y cambia sola

`cantidad = locales activos`. **Pro con dos locales o más pasa solo a Cadena**, que es
más barato (69 € frente a 79 €): nadie paga más por crecer. Antes de crear un local se
dice cuánto sumará; al crearlo se cambia en Stripe **prorrateado en la siguiente
factura**. Si Stripe no contesta, el local no se crea, y el reloj cuadra cada día lo
que se hubiera quedado descuadrado.

### Seis · Siete días de gracia, y un correo cada día

Del primer cobro fallido cuentan siete días. Cada mañana sale un correo —«no hemos
podido cobrar, te quedan N días, no se pierde nada»— y al entrar hay un aviso arriba con
«Pagar ahora» (el portal). El día 8 la cuenta pasa a **solo lectura**, con otro correo.
Stripe sigue reintentando por su cuenta: **si un reintento cobra, todo vuelve solo**.

**La prueba avisa siete días antes de cobrar** (o al empezar, si dura menos): lo piden
las normas de las tarjetas para las pruebas gratis, y es lo honrado.

### Siete · El reloj de la 0016, montado ya

Los correos de cada día necesitan quien despierte a Estook: `pg_cron` llama cada hora a
`POST /tareas/latir`, y el latido hace **una vez al día** lo que toque. El secreto del
reloj **lo genera la migración**: se guarda en el Vault de Supabase para `pg_cron`, y en
`plataforma.reloj` solo su huella, que es lo que compara la API. Así no hay que poner otro
secreto a mano, y quien lea la base no puede provocar un latido. `bd:comprobar-api` dice
si el reloj está programado y cuándo latió (punto 4 de la 0016, que no es opcional).

### Ocho · Lo legal

- **Quién factura:** mientras no haya sociedad ni alta de autónomo, **se prueba en modo
  prueba y no se cobra de verdad**. Para cobrar, Stripe exige activar la cuenta con los
  datos fiscales de quien factura, y **eso es lo que sale en cada factura**. Las facturas
  las hace Stripe, numeradas, con el NIF del cliente (se pide al pagar) y el IVA
  desglosado. **VeriFactu** obliga a los autónomos desde el 1-jul-2027 y a las
  sociedades desde el 1-ene-2027 (RDL 15/2025): antes de esa fecha, las facturas de la
  cuota tendrán que salir de un sistema que lo cumpla. Lo revisa el asesor.
- **La renovación y la prueba**, en las condiciones y en la página de pago, y en la app
  plegado bajo «Cómo funciona»: se renueva sola, se cancela en Ajustes → Suscripción, y
  cancelando en la prueba no se cobra nada.
- **Stripe, en la privacidad**, como encargado del pago.

## Lo que no entra

- **La domiciliación SEPA**: tarda días en confirmarse y se puede devolver durante
  semanas. Cuando la pida un cliente.
- **Cerrar un local** no existe todavía; cuando exista, bajará la cantidad igual que
  abrirlo la sube.
- **Más de diez locales** siguen en Cadena; el trato a medida es del admin (A2).
- **Canarias, Ceuta y Melilla**: con el IVA incluido no vale igual. Espera al asesor.
