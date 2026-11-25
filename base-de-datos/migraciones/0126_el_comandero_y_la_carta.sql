-- 0126 · La Ampliación 2 · El comandero y la carta (decisión 0153)
--
-- **Cómo sale la cocina al abrir una mesa**: preguntar cada vez (de fábrica, lo de siempre), o, si el
-- local nunca usa pases o siempre los usa, no preguntar. Se elige una vez en Ajustes del TPV › Cocina
-- y barra, y la ventana de abrir mesa se salta su segundo paso.

alter table estook.ajustes_del_tpv
  add column como_sale_la_cocina text not null default 'preguntar',
  add constraint ajustes_como_sale_la_cocina_conocido
    check (como_sale_la_cocina in ('preguntar', 'pases', 'junto'));

comment on column estook.ajustes_del_tpv.como_sale_la_cocina is
  'Al abrir una mesa (0153): preguntar si va por pases o todo junto, o siempre por pases, o siempre todo junto.';
