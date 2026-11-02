-- Deshace la 0098: la caja deja de recibir los PIN del local, y Aparatos, cómo llega cada uno.

drop function estook.los_pin_del_centro(uuid);

alter table estook.terminal
  drop constraint terminal_centro_por_conocido,
  drop constraint terminal_camino_al_centro_conocido,
  drop constraint terminal_sistema_conocido,
  drop column centro_por,
  drop column camino_al_centro,
  drop column sistema;
