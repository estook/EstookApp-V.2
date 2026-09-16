# 0042 · Se crea cuenta desde la web, con correo o con Google, y se paga al empezar salvo oferta

**Fecha:** 16 de septiembre de 2026
**Estado:** decidido. **Entrega 1 hecha** (esta: la portada, lo legal, crear cuenta,
Google y la oferta); la 2 es el pago con Stripe; la 3, Places en el alta y Business
Profile
**Cambia:** la sección 31 del [Manifiesto](../maestros/Estook-Manifiesto.md) («no hay
registro abierto» y «la prueba: 14 días»)
**Precisa:** [0010](0010-el-login-es-nuestro.md) (el login es nuestro) y
[0017](0017-como-avisa-estook.md) (el correo con Resend)

## Lo que dijo Richi

> «Me interesaría que se puedan registrar con Google, en la app. Actualmente no hay
> forma de registrarse, pero me gustaría que desde la landing page puedas ir a la app
> directamente: si dan a crear cuenta, llevan a crear cuenta y puedes hacerlo con
> correo normal y verificación o con Google; y si das a iniciar sesión, puedes hacerlo
> con tu cuenta, con PIN o con Google, pero que se vean bien las opciones.»
>
> «Haz la landing page muy básica, luego la mejoramos.»

Y a las preguntas: quien crea la cuenta **entra, monta su negocio y paga
directamente**; «de vez en cuando subiremos una prueba de 12 días para marketing… solo
cuando pongamos la oferta, y desde admin manejamos si activamos la oferta o no». El
mismo correo con contraseña y con Google **se unen solos**. Los textos legales, básicos,
los redacto yo. Los planes, los del Manifiesto, **con el IVA incluido**.

## Lo que se decide

### Uno · Hay registro abierto, y la cuenta no existe hasta demostrar el correo

Desde `estook.com` → **Crear cuenta** → `estook.com/app/#/crear-cuenta`. Se pide lo
mínimo: **el nombre del negocio, aceptar las condiciones**, y luego o Google o nombre,
correo y contraseña. Con correo, **se manda un código de seis cifras** y la cuenta se
crea al escribirlo; sin eso cualquiera podría crear cuentas con correos ajenos.

Lo que se pregunta después lo sigue preguntando el alta (M5), ya dentro.

**Por qué un código y no un enlace:** el enlace abre otra pestaña —muchas veces otro
navegador, el del correo del móvil— y ahí la cuenta queda creada lejos de donde estaba
la persona. El código se escribe donde se empezó.

### Dos · Lo que no se regala a quien prueba correos

- **No se dice si un correo tiene cuenta.** Pedir el código contesta lo mismo; si ya la
  tiene, el correo que llega dice «ya tienes cuenta, entra», y el tiempo de respuesta
  es el mismo (se deriva la contraseña igual).
- **Un código: 30 minutos y 5 intentos.** Otro código, al minuto. **Diez cuentas por
  hora por dirección**, contado en la base.
- **Los intentos fallidos se guardan de verdad** (0039). Salió al construir esto: un
  fallo deshacía la transacción, y con ella **el contador de intentos del login y del
  PIN desde M4**. El bloqueo a los cinco intentos no bloqueaba. Y el segundo factor no
  tenía límite. Ahora un fallo puede guardar lo que tiene que guardar
  (`falloQueSeGuarda`), y las pruebas lo comprueban contra la base.

### Tres · Google es una puerta más, con nuestro login detrás

**Código con PKCE**, ida y vuelta por el navegador: **ningún script de Google** en la
página, y la política de seguridad sigue en `script-src 'self'`. Google vuelve a
`estook.com/app/`; la app comprueba el `state`, borra el código de la dirección y se
lo pasa a la API, que lo canjea **con el secreto, que solo tiene el servidor**. La
sesión que sale es **la nuestra** (0010), igual que con contraseña.

- **Entrar con Google sin cuenta no la crea:** dice que no hay cuenta y lleva a crearla.
- **Mismo correo, se unen solos**, porque Google dice que el correo está
  **verificado**. Con un correo sin verificar no se entra ni se crea nada: no demuestra que sea suyo.
- **El login de Supabase sigue apagado.** No es este Google.
- Las vueltas permitidas están escritas en el código (`VUELTAS_DE_GOOGLE`): no se acepta
  cualquier dirección que mande el navegador.

### Cuatro · Se paga al empezar; la prueba es una oferta que se enciende

Sin oferta, la cuenta nace **pendiente de pago** y lo primero que ve es **Elegir plan**.
Con la oferta encendida en **admin → Oferta**, nace **en prueba** con sus días (12 por
defecto, de 1 a 90). Solo cambia a las cuentas que se crean **mientras** está encendida.

Es **una sola fila** en `plataforma.oferta_de_prueba`, la cambia un admin con acceso
total, queda en la auditoría, y la web y la pantalla de crear cuenta la anuncian solas.

Esto **sustituye** «la prueba: 14 días, sin tarjeta» del Manifiesto: la prueba existe,
pero no siempre.

**El cobro llega en la entrega 2** (Stripe). Hasta entonces, Elegir plan enseña los
planes y dice que el pago con tarjeta se abre en unos días. **Y la entrega 2 tiene que
hacer cumplir el estado en el servidor**: hoy `pendiente_de_pago`, `impago` y la prueba
caducada solo deciden a qué pantalla se va, no qué deja hacer la API.

### Cinco · Los planes, del Manifiesto y con el IVA incluido

| Plan     | Al mes por local | Al año por local | Locales      |
| -------- | ---------------- | ---------------- | ------------ |
| Esencial | 49 €             | 490 €            | desde 1      |
| Pro      | 79 €             | 790 €            | desde 1      |
| Cadena   | 69 €             | 690 €            | de 2 a 10    |
| Pausa    | 12 €             | —                | solo lectura |

El anual son **diez meses** (dos gratis). Viven en `packages/dominio/src/registro.ts`, y
se cambian a la vez aquí y en Stripe.

### Seis · La web es una portada básica, a propósito

`estook.com` dice qué es Estook en una frase, **Crear cuenta** e **Iniciar sesión**, y
anuncia la oferta si está encendida. Tres páginas de verdad —la portada,
`privacidad/` y `condiciones/`—, cada una con su HTML. La web de verdad es la Parte C
del Plan: [`docs/web-publica.md`](../web-publica.md).

### Siete · Lo legal, básico y sin inventar

La política de privacidad y las condiciones dicen lo que Estook hace hoy, en llano.
**El titular no se inventa**: razón social, NIF y domicilio salen cuando Richi los dé
(`apps/web/src/Legal.tsx`). **Antes de crecer, que lo revise alguien que sepa.**

### Ocho · Entrar: las tres formas, a la vista

**Continuar con Google** arriba; un «o»; **contraseña o PIN** en dos pestañas, las dos
visibles; **¿No tienes cuenta? Crear cuenta** abajo; la demostración al final. Google
no sale si no está conectado: un botón que no lleva a ningún sitio es peor que no tenerlo.

## Lo que queda para las otras entregas

- **E2 · Stripe:** productos y precios, pagar, el portal para cambiar tarjeta o
  cancelar, los avisos de Stripe, **el estado cumplido en el servidor**, el final de la
  prueba, y pasar a `activa` a los clientes que ya están (hoy con la prueba caducada).
- **E3 · Google:** buscar el local en Google en el paso 4 del alta; y Business Profile,
  cuando Google apruebe el acceso.
