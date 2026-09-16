# Las claves, y donde vive cada una

Regla unica: **ninguna clave se escribe en el repositorio**. Ni en un fichero de
configuracion, ni en un comentario, ni en un ejemplo. Este documento dice como se
llama cada una y en que panel se pone, nunca cuanto vale.

## Variables del repositorio · GitHub → Settings → Secrets and variables → Actions

Son publicas por naturaleza: acaban dentro del JavaScript que descarga el
navegador. Van en **Variables**, no en Secrets.

| Nombre                   | Que es                                     |
| ------------------------ | ------------------------------------------ |
| `VITE_SUPABASE_URL`      | La URL del proyecto de Supabase            |
| `VITE_SUPABASE_ANON_KEY` | La clave publicable (`sb_publishable_...`) |
| `VITE_APP_URL`           | La direccion publica de la aplicacion      |
| `VITE_BASE`              | La raiz bajo la que se publica             |
| `VITE_ENTORNO`           | `produccion`, `demostracion` o `pruebas`   |
| `VITE_SENTRY_DSN`        | El DSN del proyecto `estook-app` en Sentry |
| `VITE_API_URL`           | Donde vive la API (M4)                     |

El DSN de Sentry **tambien es publico**: viaja dentro del JavaScript, igual que la
clave publicable de Supabase. Por eso va aqui y no en Secrets. Lo unico que
permite es enviar errores a ese proyecto; no da acceso a leer nada.

`VITE_VERSION` no se declara: el flujo de publicacion la rellena solo con el
commit exacto que se esta publicando.

`VITE_API_URL` es publica igual que las demas: es una direccion a la que llama el
navegador. Mientras no este declarada, la aplicacion publicada **lo dice** en la
pantalla de entrar —«todavia no hay servidor al que preguntar»— en vez de quedarse
cargando para siempre.

## Secretos del repositorio · misma pantalla, pestana Secrets

**Dos, desde M4**, y son los primeros. Los dos son para desplegar la API, no del
producto: no acaban en el navegador de nadie.

| Nombre                 | Que es                                           |
| ---------------------- | ------------------------------------------------ |
| `TOKEN_DE_SUPABASE`    | Se saca en supabase.com/dashboard/account/tokens |
| `PROYECTO_DE_SUPABASE` | El identificador del proyecto                    |

**Van en castellano a proposito.** La primera version se llamaban
`SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF`, y con esos nombres acabaron
donde no iban: en la consola de Supabase, que **reserva el prefijo `SUPABASE_`**
y los rechaza con un error que no explica por que. Un nombre que se parece al de
otro sitio es un nombre que acabara en otro sitio.

Sin ellos, el flujo `Desplegar la API` se para y dice que faltan. Se lanza a mano
desde la pestana Actions, escribiendo «desplegar»: poner los datos de verdad al
alcance de cualquiera con un navegador se hace mirando, no de paso.

## Secretos de Supabase · Project Settings → Edge Functions → Secrets

Los que no pueden pisar el navegador jamas.

| Nombre                | Que es                                            |
| --------------------- | ------------------------------------------------- |
| `CLAVE_DE_SERVICIO`   | La clave secreta del proyecto                     |
| `GOOGLE_MAPS_KEY`     | Google Places (New) · **ya la lee la API** (0040) |
| `RESEND_API_KEY`      | El correo que manda Estook (0017)                 |
| `AI_API_KEY`          | El proveedor de IA de Fogon · M22                 |
| `AI_MODELO_RAPIDO`    | El modelo barato para lo cotidiano                |
| `AI_MODELO_ANALISIS`  | El modelo bueno para el analisis nocturno         |
| `APP_URL`             | La direccion publica, para los enlaces            |
| `DATABASE_URL`        | La cadena del **agrupador de sesion** (M4)        |
| `ORIGENES_PERMITIDOS` | Origenes de mas, si alguno hace falta (M4)        |
| `ENTORNO`             | `produccion` (M4)                                 |

### Las que faltan, cuál usa ya el código y dónde van

Revisado el 16 de septiembre de 2026. **Ninguna frena lo que hay construido**: lo
que depende de una clave está hecho y apagado con su motivo (0022), y se enciende al
ponerla.

| Qué                         | Nombre exacto                                          | Dónde se pone                           | ¿La usa ya el código?                        |
| --------------------------- | ------------------------------------------------------ | --------------------------------------- | -------------------------------------------- |
| **Google Places (New)**     | `GOOGLE_MAPS_KEY`                                      | Secretos de Supabase (Edge Functions)   | **Sí** · Ajustes → Tu local en Google (0040) |
| **Google Business Profile** | **No es una clave**: acceso aprobado + OAuth           | —                                       | No · espera a que Google apruebe             |
| **Resend** (correo)         | `RESEND_API_KEY` y el dominio verificado               | Secretos de Supabase + DNS en Hostinger | No · entrega 2 (0017)                        |
| **IA** (Fogón)              | `AI_API_KEY`, `AI_MODELO_RAPIDO`, `AI_MODELO_ANALISIS` | Secretos de Supabase                    | No · M22, con modelo y tope elegidos (0023)  |

**Business Profile no funciona con una clave**, y el nombre `GOOGLE_BUSINESS_KEY`
que había aquí era un error: esa API exige que **el dueño de la ficha autorice con
su cuenta de Google** (OAuth), y que Google **apruebe el acceso** del proyecto. Lo
que hará falta cuando lo aprueben es un «ID de cliente de OAuth» del proyecto de
Google Cloud, y se le pondrá nombre entonces, con su decisión.

**Cómo está (16 de septiembre de 2026):** el cliente de OAuth «Estook» (aplicación web)
**ya existe** en Google Cloud y la API está habilitada con **cuota 0** hasta la
aprobación. Su secreto **pasó por un chat**, así que al construir la conexión se crea
otro y se borra ese. **No va en el login de Supabase** (Authentication → Providers →
Google): Estook no usa ese login (0010), y ese interruptor tiene que quedar apagado.
Los pasos, en [`docs/pasos-antes-de-m8.md`](../docs/pasos-antes-de-m8.md), al final.

**Places ya está construido y probado.** Al poner la clave en los secretos de
Supabase se enciende sin desplegar otra vez: la API la lee al arrancar cada función.
Lleva **tope por local**: 40 fichas y 400 búsquedas al mes, contadas antes de llamar
(0040). Los pasos para sacarla, con la cuota diaria y el aviso de presupuesto, en
[`pasos-para-cerrar-m7.md`](../docs/pasos-para-cerrar-m7.md), paso 6.

`GOOGLE_MAPS_KEY` la lee la API desde M7 (0040). El paso 4 del alta se sigue
escribiendo a mano: la búsqueda en Google vive en Ajustes hasta que esté conectada
y probada en un local de verdad.

`CLAVE_DE_SERVICIO` la estrena M5, y es la mas delicada de todas: **es la
unica que se salta la seguridad por filas**. La usa la API para firmar los enlaces
del logo, y `pnpm almacen:preparar` para crear el cubo. No va al navegador jamas.

Los tres ultimos los necesita la API desplegada. `DATABASE_URL` tiene que ir por
el **agrupador de sesion** (`pooler`), no por la conexion directa: la directa de
los proyectos nuevos solo funciona por IPv6.

Y `ORIGENES_PERMITIDOS` **ya no hace falta para lo nuestro**: `estook.com` y
`www.estook.com` los lleva el codigo de la API (0036), que es donde se ve. Se deja
para anadir algun origen mas —una previsualizacion, el dominio de un cliente—,
separados por comas. **Nunca `*`**: seria dejar que cualquier pagina del mundo
llame a la API desde el navegador de quien la visite.

## En tu maquina

`.env.local`, partiendo de `.env.example`. Esta en `.gitignore` y ahi se queda.

Ademas de las publicas, dos que solo viven aqui:

| Nombre              | Para que                                                   |
| ------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`      | Las herramientas de base de datos                          |
| `CLAVE_DE_SERVICIO` | `pnpm almacen:preparar`, que crea y comprueba el cubo (M5) |

## Una cosa que aprendio M5, y que vale para cualquier clave

**Una etiqueta miente; una direccion no.**

La semilla de credenciales de M4 se negaba a correr «en produccion» mirando la
variable `ENTORNO`. Y esa negativa no podia saltar nunca: `ENTORNO` dice
`desarrollo` en el `.env.local` de quien desarrolla, mientras `DATABASE_URL`, dos
lineas mas abajo del mismo fichero, apunta al Supabase de verdad. Acabaron ocho
cuentas con una contrasena publicada en la base de produccion.

Ahora esa decision la toma quien abre la conexion, mirando **a donde apunta**. Si
alguna vez hay que decidir algo por el entorno, se mira la direccion, no el
nombre que alguien le haya puesto.
La unica que no aparece en ningun panel es `DATABASE_URL`, que solo la usan las
herramientas de migracion de tu ordenador.

## Pendientes de dar de alta

Stripe (secreta, publicable, webhook e identificadores de precio) para M26, la API
unificada del TPV para M18, Resend para el correo y el acceso OAuth de Google
Business Profile para las resenas propias. Cuando existan, las publicas van a Variables y las secretas a
los secretos de Supabase.

## Si una clave se filtra

Se regenera en su panel de origen y se cambia el valor en el panel donde vive. No
hay que tocar codigo: por eso ninguna esta escrita aqui dentro.
