-- 0016 · Permitir el disfraz de estook_api
--
-- Modulo M2. Un fallo que solo aparece contra Supabase de verdad, y que las
-- pruebas contra Postgres efimero no podian ver.
--
-- ── Que pasaba ───────────────────────────────────────────────────────────────
--
-- La decision 0005 dice que la API se conecta con un rol que si tiene login y se
-- pone el disfraz de `estook_api` con `set local role` al abrir cada
-- transaccion. Eso es lo que hace que las politicas de seguridad de M1 le
-- apliquen: `estook_api` no es el dueno de las tablas.
--
-- En las pruebas funcionaba porque alli se conecta un superusuario, y un
-- superusuario puede convertirse en quien quiera. En Supabase **no**: el rol
-- `postgres` no es superusuario y no es miembro de `estook_api`, asi que:
--
--     permission denied to set role "estook_api"
--
-- Sin esto, la API no arranca contra Supabase. Y no se habria visto hasta M4.
--
-- ── El arreglo ───────────────────────────────────────────────────────────────
--
-- Hacer miembro de `estook_api` al rol que ejecuta las migraciones, que es el
-- mismo con el que se conecta la API. Se escribe con `current_user` en vez de
-- con un nombre fijo para que valga en Supabase, en la integracion continua y en
-- cualquier Postgres, sin tener que saber como se llama el rol en cada sitio.
--
-- Ojo con lo que NO cambia: `estook_api` sigue sin poder iniciar sesion, sigue
-- sin ser el dueno de las tablas, y las politicas le siguen aplicando. Lo unico
-- que se concede es poder convertirse en el.

do $$
begin
  execute format('grant estook_api to %I', current_user);
exception
  when duplicate_object then
    -- Ya era miembro. No pasa nada.
    null;
end
$$;

comment on schema estook is
  'El esquema de Estook. La API se conecta con un rol con login y se convierte en estook_api con `set local role` en cada transaccion (decision 0005), para que las politicas de seguridad le apliquen.';
