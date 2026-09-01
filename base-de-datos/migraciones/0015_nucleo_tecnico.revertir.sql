-- Reversion de 0015 · El nucleo tecnico

drop policy if exists bandeja_de_su_organizacion on estook.bandeja_de_salida;
drop policy if exists idempotencia_de_su_organizacion on estook.clave_de_idempotencia;

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array[
    'organizacion', 'area', 'local', 'persona', 'membresia',
    'recorte_de_permiso', 'traduccion', 'dispositivo', 'politica_de_catalogo'
  ]
  loop
    execute format('drop trigger if exists %I on estook.%I', la_tabla || '_sube_version', la_tabla);
    execute format('alter table estook.%I drop column if exists version', la_tabla);
  end loop;
end
$$;

drop function if exists estook.subir_version();

drop table if exists estook.trabajo;
drop table if exists estook.bandeja_de_salida;
drop table if exists estook.clave_de_idempotencia;

drop type if exists estook.estado_del_trabajo;
drop type if exists estook.estado_de_publicacion;
