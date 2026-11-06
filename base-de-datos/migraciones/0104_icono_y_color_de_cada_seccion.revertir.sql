-- Deshace la 0104: se quita el icono de las secciones y los colores vuelven a ser nueve.
--
-- Una sección o un botón con amarillo o marrón **vuelven a «sin color»** (el de su sección, o
-- ninguno): es lo único que la vuelta atrás no puede guardar, y se dice aquí.

update estook.pagina_del_tpv set color = null where color in ('amarillo', 'marron');
update estook.boton_del_tpv set color = null where color in ('amarillo', 'marron');

alter table estook.boton_del_tpv
  drop constraint boton_color_conocido,
  add constraint boton_color_conocido check (
    color is null
    or color in ('naranja', 'verde', 'azul', 'ambar', 'rojo', 'rosa', 'morado', 'turquesa', 'arena')
  );

alter table estook.pagina_del_tpv
  drop constraint pagina_color_conocido,
  add constraint pagina_color_conocido check (
    color is null
    or color in ('naranja', 'verde', 'azul', 'ambar', 'rojo', 'rosa', 'morado', 'turquesa', 'arena')
  );

comment on column estook.pagina_del_tpv.color is null;

alter table estook.pagina_del_tpv drop column icono;
