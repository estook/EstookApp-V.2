-- Deshace la 0076: el coste de cada precio vuelve a llevar el aprovechamiento, y las
-- líneas de «revalorado» se van del libro.
--
-- Borrar del libro solo se hace aquí, y solo esas líneas: son las que puso la 0076, y
-- sin ellas cada producto vuelve al precio medio que tenía.

delete from estook.movimiento_de_stock where origen = 'revalorar';

alter table estook.movimiento_de_stock drop constraint movimiento_cantidad_no_nula;
alter table estook.movimiento_de_stock add constraint movimiento_cantidad_no_nula check (
  cantidad <> 0
);

-- Los precios que se abrieron para seguir a su envase se van, y vuelve el de antes.
create temporary table precio_que_volvio on commit drop as
select id, (referencia ->> 'sigue_al_envase')::uuid as de
  from estook.precio_de_producto
 where referencia ? 'sigue_al_envase';

delete from estook.precio_de_producto where id in (select id from precio_que_volvio);

update estook.precio_de_producto set hasta = null
 where id in (select de from precio_que_volvio);

update estook.producto set formato = 'Bolsa de 5 kg'
 where id = '8e6dbe15-1e76-497a-9d2b-cbf11e9770e2' and formato is null and factor = 1;

update estook.precio_de_producto
   set coste_milesimas = round(precio_centimos * 1000.0 / (factor * rendimiento));

update estook.precio_pactado
   set coste_milesimas = round(precio_centimos * 1000.0 / (factor * rendimiento));

comment on column estook.precio_de_producto.coste_milesimas is
  'precio ÷ (factor × rendimiento), en milesimas de centimo. Lo calcula el dominio; aqui solo se guarda para poder comparar y ordenar.';

revoke delete on estook.plato from estook_api;
