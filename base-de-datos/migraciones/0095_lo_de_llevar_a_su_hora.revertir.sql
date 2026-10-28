-- Deshace la 0095: lo de llevar vuelve a ser siempre para ya.

alter table estook.cuenta
  drop constraint cuenta_para_las_solo_para_llevar,
  drop column para_las;
