-- 0044 · El precio vigente de muchos productos a la vez (repaso del 24-sep-2026)
--
-- Una prueba de Safari en la integración continua tardó de más, y al medirlo salió
-- que **lo más lento del Resumen de Inventario era el precio vigente**: se pedía
-- producto a producto, y cada llamada hacía su propia búsqueda, su propio orden y su
-- propio paso por la seguridad de las filas. Con 400 productos, más de un segundo de
-- los 1,5 que tardaba la pantalla en la base de pruebas.
--
-- La regla de cuál es el precio vigente **no cambia** y sigue viviendo en un solo
-- sitio (0023): el del proveedor principal si lo tiene, y si no, el último que se
-- puso. Lo que cambia es que ahora se puede pedir de muchos de una vez:
--
--   · `precios_vigentes(productos)` es la regla, escrita una vez, con `distinct on`:
--     una sola pasada por la tabla para todos los que se piden.
--   · `precio_vigente(producto)` —la de siempre, que usan la ficha, la merma, las
--     compras…— pasa a llamarla con uno. Mismo nombre, misma firma y misma
--     respuesta: nadie que la use se entera.

create or replace function estook.precios_vigentes(p_productos uuid[])
returns setof estook.precio_de_producto
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct on (p.producto_id) p.*
    from estook.precio_de_producto p
    join estook.producto pr on pr.id = p.producto_id
   where p.producto_id = any (p_productos)
     and p.hasta is null
   order by
     p.producto_id,
     case when pr.proveedor_id is not null and p.proveedor_id = pr.proveedor_id
          then 0 else 1 end,
     p.desde desc,
     p.creado_en desc
$$;

comment on function estook.precios_vigentes(uuid[]) is
  'El precio que se enseña de cada uno de esos productos, de una pasada: el del proveedor principal, y si no, el ultimo puesto. Es la regla; precio_vigente la usa con uno.';

create or replace function estook.precio_vigente(p_producto uuid)
returns estook.precio_de_producto
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select v.* from estook.precios_vigentes(array[p_producto]) v
$$;

comment on function estook.precio_vigente(uuid) is
  'El precio que se enseña de un producto: el del proveedor principal, y si no, el ultimo puesto. Nunca el mas barato: se enseña lo que cuesta, no lo que podria costar.';
