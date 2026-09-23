-- 0043 · Las funciones con privilegio, cerradas a quien no es la API (repaso del 23-sep-2026)
--
-- Lo encontró la auditoría de producción. Siete funciones `security definer` se
-- crearon antes de que se cogiera la costumbre de cerrarlas (desde M4 todas nacen con
-- `revoke … from public` y `grant … to estook_api`), y seguían ejecutables por
-- cualquier rol de la base:
--
--   personas_visibles(uuid), locales_visibles(uuid), organizaciones_visibles(uuid),
--   nivel_de_permiso, nivel_de_permiso_en_organizacion, a_quien_lleva y
--   suscripcion_al_crear_organizacion (la del disparador).
--
-- **Hoy no se podía abusar de ellas**: los roles públicos de Supabase (`anon` y
-- `authenticated`) no tienen uso del esquema `estook`, así que ni las alcanzan. Pero
-- esa es una sola barrera, y si un día alguien abre el esquema a la API automática de
-- Supabase, estas funciones leen con privilegio quién trabaja dónde y con qué rol.
-- Una segunda barrera cuesta una línea.
--
-- Se hace **sin nombrarlas**: se cierran todas las de `estook` que `public` pueda
-- ejecutar, sea cual sea su firma, y se le dan a la API. Si mañana apareciera otra,
-- la prueba de las funciones con privilegio la caza.
--
-- El disparador no nota nada: Postgres no mira el permiso de ejecutar al saltar un
-- disparador, solo al crearlo.

do $$
declare
  la_funcion regprocedure;
begin
  for la_funcion in
    select p.oid::regprocedure
      from pg_proc p
     where p.pronamespace = 'estook'::regnamespace
       and p.prosecdef
       and has_function_privilege('public', p.oid, 'execute')
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;
