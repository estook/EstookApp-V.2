-- Deshace la 0097: la caja deja de decir dónde escucha, y los aparatos, si llegan a ella.

drop function estook.las_impresoras_del_centro(uuid);

alter table estook.terminal
  drop constraint terminal_centro_con_medida,
  drop column llega_al_centro_en,
  drop column centro_visto_en,
  drop column centro_en;
