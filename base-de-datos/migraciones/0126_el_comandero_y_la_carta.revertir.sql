-- Deshace la 0126: abrir una mesa vuelve a preguntar siempre cómo sale la cocina. No se pierde nada
-- que no se pueda volver a elegir en Ajustes.

alter table estook.ajustes_del_tpv
  drop constraint ajustes_como_sale_la_cocina_conocido,
  drop column como_sale_la_cocina;
