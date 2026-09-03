-- Revertir la 0023.
--
-- Se va Inventario entero: el genero, sus precios, su libro de movimientos, sus
-- lotes, sus categorias y los proveedores minimos que M6 necesitaba para poder
-- decir de quien viene cada precio.
--
-- **Si se pierden datos, y hay que decirlo**: revertir esta migracion borra el
-- inventario de todos los locales. No es un efecto raro de esta migracion en
-- concreto —lo mismo pasa con cualquiera que crea tablas— pero conviene tenerlo
-- delante antes de revertir contra una base de verdad.
--
-- El orden es el inverso al de creacion, para que las claves ajenas se respeten
-- solas: primero lo que apunta a otros, y al final lo apuntado.

-- ── El buscador vuelve a ser exactamente el de la 0017 ───────────────────────
--
-- **Copiado tal cual de esa migracion, sin reescribirlo de memoria.** Dejarlo
-- con los bloques de M6 apuntando a tablas que ya no existen lo dejaria roto al
-- primer atajo de busqueda, y reescribirlo «parecido» cambiaria en silencio el
-- umbral de 0,18 y el tope de 50, que se eligieron probandolos.

create or replace function estook.buscar(p_texto text, p_limite int default 20)
returns table (
  tipo       text,
  id         uuid,
  titulo     text,
  subtitulo  text,
  local_id   uuid,
  parecido   real
)
language sql
stable
set search_path = estook, public, pg_catalog, pg_temp
as $$
  with busqueda as (
    select estook.sin_acentos(p_texto) as texto
  ),

  -- Locales. Se busca por nombre y por codigo: hay quien tiene el codigo mas a
  -- mano que el nombre.
  locales as (
    select
      'local'::text as tipo,
      l.id,
      l.nombre as titulo,
      coalesce(a.nombre || ' · ', '') || o.nombre as subtitulo,
      l.id as local_id,
      greatest(
        similarity(estook.sin_acentos(l.nombre), b.texto),
        similarity(estook.sin_acentos(l.codigo), b.texto)
      ) as parecido
    from estook.local l
    cross join busqueda b
    join estook.organizacion o on o.id = l.organizacion_id
    left join estook.area a on a.id = l.area_id
    where l.activo
      and l.id in (select local_id from estook.locales_visibles())
  ),

  -- Personas. Por nombre entero y por correo: al invitar a alguien se busca por
  -- correo, y al mirar un cuadrante, por nombre.
  personas as (
    select
      'persona'::text as tipo,
      p.id,
      p.nombre || coalesce(' ' || p.apellidos, '') as titulo,
      p.correo as subtitulo,
      null::uuid as local_id,
      greatest(
        similarity(
          estook.sin_acentos(p.nombre || ' ' || coalesce(p.apellidos, '')),
          b.texto
        ),
        similarity(estook.sin_acentos(p.correo), b.texto)
      ) as parecido
    from estook.persona p
    cross join busqueda b
    where p.activa
      and p.id in (select persona_id from estook.personas_visibles())
  ),

  organizaciones as (
    select
      'organizacion'::text as tipo,
      o.id,
      o.nombre as titulo,
      'Organizacion'::text as subtitulo,
      null::uuid as local_id,
      similarity(estook.sin_acentos(o.nombre), b.texto) as parecido
    from estook.organizacion o
    cross join busqueda b
    where o.id in (select organizacion_id from estook.organizaciones_visibles())
  ),

  areas as (
    select
      'area'::text as tipo,
      a.id,
      a.nombre as titulo,
      o.nombre as subtitulo,
      null::uuid as local_id,
      similarity(estook.sin_acentos(a.nombre), b.texto) as parecido
    from estook.area a
    cross join busqueda b
    join estook.organizacion o on o.id = a.organizacion_id
    where a.organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  ),

  todo as (
    select * from locales
    union all select * from personas
    union all select * from organizaciones
    union all select * from areas
  )

  select t.tipo, t.id, t.titulo, t.subtitulo, t.local_id, t.parecido
  from todo t
  -- 0,18 deja pasar una errata o dos sin llenar la lista de ruido. Se eligio
  -- probandolo: con 0,3 «Migel» no encontraba a «Miguel».
  where t.parecido >= 0.18
  order by t.parecido desc, t.titulo
  limit least(greatest(p_limite, 1), 50)
$$;

drop view if exists estook.existencias;

drop table if exists estook.movimiento_de_stock;
drop function if exists estook.movimiento_no_se_modifica();
drop type if exists estook.tipo_de_movimiento;

drop table if exists estook.lote;

drop function if exists estook.precio_vigente(uuid);
drop table if exists estook.precio_de_producto;
drop type if exists estook.origen_de_precio;

drop table if exists estook.producto;

drop function if exists estook.sembrar_categorias(uuid);
drop table if exists estook.categoria_de_partida;
drop table if exists estook.categoria_de_producto;

drop table if exists estook.proveedor;
