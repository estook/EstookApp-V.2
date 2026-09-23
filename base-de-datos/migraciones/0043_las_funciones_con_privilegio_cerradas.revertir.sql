-- Deshace la 0043: las siete funciones de antes de M4 vuelven a poder ejecutarlas
-- todos, como estaban. La API las sigue teniendo.

do $$
declare
  la_funcion regprocedure;
begin
  for la_funcion in
    select p.oid::regprocedure
      from pg_proc p
     where p.pronamespace = 'estook'::regnamespace
       and p.prosecdef
       and p.proname in (
         'personas_visibles', 'locales_visibles', 'organizaciones_visibles',
         'nivel_de_permiso', 'nivel_de_permiso_en_organizacion', 'a_quien_lleva',
         'suscripcion_al_crear_organizacion'
       )
  loop
    execute format('grant execute on function %s to public', la_funcion);
  end loop;
end
$$;
