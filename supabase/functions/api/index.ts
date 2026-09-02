/**
 * La API de Estook, desplegada como Supabase Edge Function (M4).
 *
 * Decision 0002: «la API se escribe en Hono y se despliega como Supabase Edge
 * Functions (Deno). El adaptador HTTP concreto se escribe en M2, no antes.» M2
 * escribio el adaptador; **M4 la despliega**, porque es quien trae a alguien a
 * quien servir.
 *
 * ── Este fichero no hace nada, y es lo que tiene que hacer ───────────────────
 *
 * Enchufa la API a `Deno.serve` y se acaba. Todo lo demas —los comandos, las
 * politicas, las puertas, la conexion— es exactamente el mismo codigo que corre
 * en las pruebas y en `pnpm bd:comprobar-api`. Si este fichero creciera, empezaria
 * a haber una API desplegada distinta de la probada, que es como se llega a «en
 * mi maquina funcionaba».
 *
 * ── Que hace falta en Supabase para que esto funcione ────────────────────────
 *
 * En Project Settings → Edge Functions → Secrets:
 *
 *   DATABASE_URL          la cadena del agrupador de sesion, no la directa
 *   ORIGENES_PERMITIDOS   de donde se puede llamar, separados por comas
 *   ENTORNO               `produccion`
 *
 * `DATABASE_URL` tiene que ir por el **agrupador de sesion** (`pooler`), como en
 * las herramientas: la conexion directa de los proyectos nuevos solo funciona por
 * IPv6, y las Edge Functions no siempre lo tienen.
 *
 * ── Como se despliega ────────────────────────────────────────────────────────
 *
 *   supabase functions deploy api --no-verify-jwt
 *
 * `--no-verify-jwt` **no es un descuido y no afloja nada**. Le dice a Supabase que
 * no compruebe un token suyo antes de dejar pasar la peticion, y hay que decirselo
 * porque:
 *
 *   · Nuestras sesiones son nuestras, no de Supabase Auth (decision 0010). El
 *     token que viaja es el de `estook.sesion`, y Supabase no sabe leerlo.
 *   · `entrar` **tiene que poder llamarse sin token**: es la definicion de entrar.
 *     Con la comprobacion de Supabase puesta, nadie podria entrar nunca.
 *
 * Lo que protege la puerta es el despachador, que exige sesion en todo salvo
 * donde se declara lo contrario, y las politicas de M1 debajo. Eso no cambia.
 *
 * Tambien lo despliega solo el flujo `desplegar-api.yml` cuando estan sus dos
 * secretos declarados en GitHub.
 */
import { api } from '../../../servidor/index.ts';

Deno.serve(api.fetch);
