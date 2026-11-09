-- 0114 · El repaso del 8-nov · R2 · 1 · El color y el icono de cada sección, uno solo (0143)
--
-- Richi, 8-nov: «las secciones de carta en el TPV tienen un símbolo y un color, pero en la app
-- esto no sale: todas tienen el mismo color». Era así porque el color y el icono vivían en la
-- página del TPV (`pagina_del_tpv`, 0104) y la carta de Estook no los tenía.
--
--   · `seccion_de_carta.color` y `.icono`   **el color y el icono de la sección**, los mismos en
--                                          Estook y en el TPV. Nulo: el que propone su nombre
--                                          (`comoSeVeElNombre`), que se calcula al leer
--   · la página del TPV que vino de una sección **lee los de su sección**; los suyos quedan solo
--     para las páginas que no vienen de la carta (las creadas en el TPV, «Pan y agua», «Cafés»)
--
-- Lo que ya había **no cambia para nadie**: lo que el local eligió en el TPV para una página que
-- vino de una sección pasa a su sección, y se ve igual que antes, ahora también en Estook.

alter table estook.seccion_de_carta
  add column color text,
  add column icono text,
  add constraint seccion_color_conocido check (
    color is null
    or color in (
      'amarillo', 'naranja', 'ambar', 'rojo', 'rosa', 'morado', 'azul', 'turquesa', 'verde',
      'arena', 'marron'
    )
  ),
  add constraint seccion_icono_conocido check (
    icono is null
    or icono in (
      'beer', 'wine', 'martini', 'cup-soda', 'glass-water', 'coffee', 'milk', 'croissant',
      'sandwich', 'pizza', 'salad', 'soup', 'beef', 'drumstick', 'ham', 'fish', 'shell',
      'egg-fried', 'cooking-pot', 'leaf', 'wheat', 'cake-slice', 'ice-cream-cone', 'cookie',
      'cherry', 'citrus', 'baby', 'chef-hat', 'star', 'utensils-crossed'
    )
  );

comment on column estook.seccion_de_carta.color is
  'El color de la sección, el mismo en Estook y en Estook TPV (0143). Nulo: el que propone su nombre.';
comment on column estook.seccion_de_carta.icono is
  'El icono de la sección, por su nombre de Lucide, el mismo en Estook y en Estook TPV (0143). Nulo: el que propone su nombre.';
comment on column estook.pagina_del_tpv.color is
  'El color de una página que no viene de la carta (R3, 0133). La que vino de una sección lee el de su sección (0143).';
comment on column estook.pagina_del_tpv.icono is
  'El icono de una página que no viene de la carta (R3, 0133). La que vino de una sección lee el de su sección (0143).';

-- Lo elegido en el TPV para una página que vino de una sección pasa a su sección.
update estook.seccion_de_carta s
   set color = coalesce(s.color, p.color),
       icono = coalesce(s.icono, p.icono)
  from estook.pagina_del_tpv p
 where p.seccion_id = s.id
   and (p.color is not null or p.icono is not null);

-- Y la página se queda sin los suyos: si después la sección vuelve a «el de su nombre», no
-- reaparece un color viejo de la página.
update estook.pagina_del_tpv
   set color = null, icono = null
 where seccion_id is not null
   and (color is not null or icono is not null);
