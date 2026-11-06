-- 0104 · R3 · El icono y el color de cada sección del TPV (decisión 0133)
--
-- Richi, 5-nov: cada sección del TPV con **su icono y su color**, que Estook pone solo por el
-- nombre y el local cambia en Ajustes del TPV › Productos y precios.
--
--   · `pagina_del_tpv.icono`   el icono que eligió el local, por su nombre de Lucide. Nulo: el
--                              que propone el nombre de la sección (`comoSeVeElNombre` de
--                              @estook/dominio), que se calcula al leer, así que una sección
--                              recién creada, traída de la carta o renombrada lo lleva sin más
--   · los colores pasan de nueve a **once**: amarillo (el de «Lo más pedido») y marrón (el de
--     los cafés). En la sección, nulo sigue siendo «el que propone su nombre»; en el botón, «el
--     de su sección»
--
-- Lo que ya había **no cambia para nadie**: ningún color ni botón se reescribe.

alter table estook.pagina_del_tpv
  add column icono text,
  add constraint pagina_icono_conocido check (
    icono is null
    or icono in (
      'beer', 'wine', 'martini', 'cup-soda', 'glass-water', 'coffee', 'milk', 'croissant',
      'sandwich', 'pizza', 'salad', 'soup', 'beef', 'drumstick', 'ham', 'fish', 'shell',
      'egg-fried', 'cooking-pot', 'leaf', 'wheat', 'cake-slice', 'ice-cream-cone', 'cookie',
      'cherry', 'citrus', 'baby', 'chef-hat', 'star', 'utensils-crossed'
    )
  );

comment on column estook.pagina_del_tpv.icono is
  'El icono de la sección, por su nombre de Lucide (R3, 0133). Nulo: el que propone su nombre.';
comment on column estook.pagina_del_tpv.color is
  'El color de la sección (R3, 0133: once). Nulo: el que propone su nombre.';

alter table estook.pagina_del_tpv
  drop constraint pagina_color_conocido,
  add constraint pagina_color_conocido check (
    color is null
    or color in (
      'amarillo', 'naranja', 'ambar', 'rojo', 'rosa', 'morado', 'azul', 'turquesa', 'verde',
      'arena', 'marron'
    )
  );

alter table estook.boton_del_tpv
  drop constraint boton_color_conocido,
  add constraint boton_color_conocido check (
    color is null
    or color in (
      'amarillo', 'naranja', 'ambar', 'rojo', 'rosa', 'morado', 'azul', 'turquesa', 'verde',
      'arena', 'marron'
    )
  );
