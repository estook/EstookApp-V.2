-- Deshace la 0044: precio_vigente vuelve a ser la de la 0023, copiada entera, y se
-- quita la de muchos. Antes de revertir, la API tiene que volver al código de antes,
-- que no llama a precios_vigentes.

create or replace function estook.precio_vigente(p_producto uuid)
returns estook.precio_de_producto
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.*
    from estook.precio_de_producto p
    join estook.producto pr on pr.id = p.producto_id
   where p.producto_id = p_producto
     and p.hasta is null
   order by
     case when pr.proveedor_id is not null and p.proveedor_id = pr.proveedor_id
          then 0 else 1 end,
     p.desde desc,
     p.creado_en desc
   limit 1
$$;

comment on function estook.precio_vigente(uuid) is
  'El precio que se enseña de un producto: el del proveedor principal, y si no, el ultimo puesto. Nunca el mas barato: se enseña lo que cuesta, no lo que podria costar.';

drop function if exists estook.precios_vigentes(uuid[]);
