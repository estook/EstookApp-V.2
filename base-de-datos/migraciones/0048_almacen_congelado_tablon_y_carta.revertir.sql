-- Deshace la 0048: el permiso vuelve a llamarse `app.inventario`, sin cuánto aguanta
-- congelado cada producto, sin Tablón y sin la carta subida.
--
-- **Lo que se pierde:** las notas del Tablón y quién las leyó, cuánto aguanta
-- congelado cada producto (vuelve a avisar por caducidad) y qué carta subió cada
-- local. Los ficheros de la carta se quedan en su cubo, sin nadie que los nombre.

-- ── D · La carta ────────────────────────────────────────────────────────────

drop function estook.la_carta_publica(text);

-- La de la 0046, entera.
create function estook.la_carta_publica(p_direccion text)
returns table (
  nombre text,
  direccion text,
  poblacion text,
  telefono text,
  web text,
  mapa text,
  valoracion numeric,
  resenas integer,
  horario jsonb,
  color_de_marca text,
  logo_clave text
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select l.nombre,
         coalesce(l.google_direccion,
                  nullif(concat_ws(', ', l.direccion, l.poblacion), '')),
         l.poblacion,
         coalesce(l.google_telefono, l.telefono),
         l.google_web,
         l.google_mapa,
         l.google_valoracion,
         l.google_resenas,
         l.google_horario,
         l.color_de_marca,
         l.logo_clave
    from estook.local l
   where l.direccion_de_la_carta = lower(p_direccion)
     and l.activo
$$;

comment on function estook.la_carta_publica(text) is
  'Lo que enseña estook.com/carta/<dirección> a quien escanea el QR, sin sesión: solo lo que el local ya enseña al mundo (0047).';

revoke all on function estook.la_carta_publica(text) from public;
grant execute on function estook.la_carta_publica(text) to estook_api;

alter table estook.local
  drop constraint if exists local_carta_con_fecha,
  drop constraint if exists local_carta_con_paginas,
  drop column if exists carta_subida_en,
  drop column if exists carta_paginas;

-- El cubo de las cartas se queda: puede tener ficheros, y un cubo con ficheros no
-- se borra desde SQL. Sin la columna, no lo nombra nadie.

-- ── C · El Tablón ───────────────────────────────────────────────────────────

drop table if exists estook.nota_leida;
drop table if exists estook.nota_del_tablon;

-- ── B · Lo congelado ────────────────────────────────────────────────────────

-- Los avisos de lo congelado vuelven a ser su caducidad, como los ponía la 0033; y
-- el que no tenía fecha se va, que es lo que hacía `publicarLaCaducidad`.
update estook.evento_de_calendario e
   set dia = l.caduca_el, titulo = 'Caduca ' || p.nombre || ' (congelado)'
  from estook.lote l
  join estook.producto p on p.id = l.producto_id
 where e.capa = 'caducidad' and e.origen = 'lote' and e.origen_id = l.id::text
   and l.congelado_el is not null and l.caduca_el is not null;

delete from estook.evento_de_calendario e
 using estook.lote l
 where e.capa = 'caducidad' and e.origen = 'lote' and e.origen_id = l.id::text
   and l.congelado_el is not null and l.caduca_el is null
   and not e.es_ejemplo;

alter table estook.producto
  drop constraint if exists producto_congelado_aguanta_razonable,
  drop column if exists congelado_aguanta_meses;

-- ── A · El permiso vuelve a su nombre de antes ─────────────────────────────

update estook.evento_de_calendario
   set ir = '/inventario' || substr(ir, length('/almacen') + 1)
 where ir like '/almacen/%' or ir = '/almacen';

update estook.rol
   set descripcion = replace(replace(descripcion, 'Almacén entero', 'Inventario entera'),
                             'Almacén y proveedores', 'Inventario y proveedores')
 where descripcion like '%Almacén%';

update estook.permiso
   set descripcion = replace(descripcion, 'quien lleva el Almacén', 'quien lleva Inventario')
 where descripcion like '%quien lleva el Almacén%';

update estook.permiso
   set nombre = 'Cerrar un recuento'
 where codigo = 'accion.cerrar_recuento';

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion)
select 'app.inventario', 'Inventario', familia, ambito, 'Genero, proveedores, pedidos, recuentos y mermas'
  from estook.permiso
 where codigo = 'app.almacen';

update estook.permiso_de_rol set permiso = 'app.inventario' where permiso = 'app.almacen';
update estook.recorte_de_permiso set permiso = 'app.inventario' where permiso = 'app.almacen';

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('estook', 'plataforma')
       and (qual like '%''app.almacen''%' or with_check like '%''app.almacen''%')
  loop
    execute format(
      'alter policy %I on %I.%I %s %s',
      p.policyname, p.schemaname, p.tablename,
      case when p.qual is null then ''
           else format('using (%s)', replace(p.qual, '''app.almacen''', '''app.inventario''')) end,
      case when p.with_check is null then ''
           else format('with check (%s)', replace(p.with_check, '''app.almacen''', '''app.inventario''')) end
    );
  end loop;

  for p in
    select f.oid
      from pg_proc f
      join pg_namespace n on n.oid = f.pronamespace
     where n.nspname in ('estook', 'plataforma')
       and f.prosrc like '%''app.almacen''%'
  loop
    execute replace(pg_get_functiondef(p.oid), '''app.almacen''', '''app.inventario''');
  end loop;
end;
$$;

delete from estook.permiso where codigo = 'app.almacen';
