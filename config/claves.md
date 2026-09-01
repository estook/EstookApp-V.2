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

El DSN de Sentry **tambien es publico**: viaja dentro del JavaScript, igual que la
clave publicable de Supabase. Por eso va aqui y no en Secrets. Lo unico que
permite es enviar errores a ese proyecto; no da acceso a leer nada.

`VITE_VERSION` no se declara: el flujo de publicacion la rellena solo con el
commit exacto que se esta publicando.

## Secretos del repositorio · misma pantalla, pestana Secrets

De momento **ninguno**. Todo lo que necesita el navegador es publico por
naturaleza, y lo que es de verdad secreto vive en Supabase, abajo.

## Secretos de Supabase · Project Settings → Edge Functions → Secrets

Los que no pueden pisar el navegador jamas.

| Nombre                 | Que es                                    |
| ---------------------- | ----------------------------------------- |
| `SUPABASE_SERVICE_KEY` | La clave secreta del proyecto             |
| `GOOGLE_MAPS_KEY`      | Google Maps Platform · Places, para M5    |
| `AI_API_KEY`           | El proveedor de IA de Fogon · M22         |
| `AI_MODELO_RAPIDO`     | El modelo barato para lo cotidiano        |
| `AI_MODELO_ANALISIS`   | El modelo bueno para el analisis nocturno |
| `APP_URL`              | La direccion publica, para los enlaces    |

## En tu maquina

`.env.local`, partiendo de `.env.example`. Esta en `.gitignore` y ahi se queda.
La unica que no aparece en ningun panel es `DATABASE_URL`, que solo la usan las
herramientas de migracion de tu ordenador.

## Pendientes de dar de alta

Stripe (secreta, publicable, webhook e identificadores de precio) para M26, la API
unificada del TPV para M18, Resend para el correo y Google Business Profile para
las resenas propias. Cuando existan, las publicas van a Variables y las secretas a
los secretos de Supabase.

## Si una clave se filtra

Se regenera en su panel de origen y se cambia el valor en el panel donde vive. No
hay que tocar codigo: por eso ninguna esta escrita aqui dentro.
