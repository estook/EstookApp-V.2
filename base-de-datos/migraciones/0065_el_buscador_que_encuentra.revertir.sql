-- Deshace la 0065: el buscador vuelve a ser el de la 0023, que medía el campo
-- entero y enseñaba los productos a cualquiera del local.
--
-- **No se pierde nada**: es una función, no hay datos.

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

  -- ── M6 · el genero ─────────────────────────────────────────────────────────
  --
  -- Se busca por nombre y por codigo de barras: quien escanea uno espera llegar
  -- a su producto, no a una lista. Y los desactivados no salen, porque «ninguna
  -- lista ensena elementos desactivados, salvo en el historico» (Auditoria,
  -- parte 3).
  --
  -- Ojo con lo que **no** entra: el catalogo de referencia. Ese buscador busca
  -- cosas tuyas, y meter trescientas referencias que no estan en tu camara haria
  -- imposible encontrar la tuya.
  productos as (
    select
      'producto'::text as tipo,
      pr.id,
      pr.nombre as titulo,
      coalesce(c.nombre, pr.formato, 'Producto') as subtitulo,
      pr.local_id,
      greatest(
        similarity(estook.sin_acentos(pr.nombre), b.texto),
        similarity(estook.sin_acentos(coalesce(pr.codigo_de_barras, '')), b.texto)
      ) as parecido
    from estook.producto pr
    cross join busqueda b
    left join estook.categoria_de_producto c on c.id = pr.categoria_id
    where pr.activo
      and pr.local_id in (select local_id from estook.locales_visibles())
  ),

  proveedores as (
    select
      'proveedor'::text as tipo,
      pv.id,
      pv.nombre as titulo,
      'Proveedor'::text as subtitulo,
      pv.local_id,
      similarity(estook.sin_acentos(pv.nombre), b.texto) as parecido
    from estook.proveedor pv
    cross join busqueda b
    where pv.activo
      and pv.local_id in (select local_id from estook.locales_visibles())
  ),

  todo as (
    select * from locales
    union all select * from personas
    union all select * from organizaciones
    union all select * from areas
    union all select * from productos
    union all select * from proveedores
  )

  select t.tipo, t.id, t.titulo, t.subtitulo, t.local_id, t.parecido
  from todo t
  -- 0,18 deja pasar una errata o dos sin llenar la lista de ruido. Se eligio
  -- probandolo: con 0,3 «Migel» no encontraba a «Miguel».
  where t.parecido >= 0.18
  order by t.parecido desc, t.titulo
  limit least(greatest(p_limite, 1), 50)
$$;


comment on function estook.buscar(text, int) is
  'El buscador universal. Sin security definer: las politicas de M1 aplican igual que a cualquier consulta. Cada modulo anade su bloque por union.';

drop function if exists estook.parecido_al_buscar(text, text);
