-- Deshace la 0134: la web vuelve a reservar hasta dos horas antes para todos (lo que diga el código).

alter table estook.ajuste_de_reservas
  drop constraint ajuste_de_reservas_antelacion_web,
  drop column antelacion_web;
