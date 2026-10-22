-- Deshace la 0080: el día vuelve a no tener estado y la caja se puede volver a cerrar sin
-- decir nada. Las reaperturas apuntadas se van con su tabla; lo que se cambió sigue en la
-- auditoría.

drop function if exists estook.como_esta_la_jornada(uuid, date);

drop trigger if exists linea_de_cierre_del_dia_cerrado on estook.linea_de_cierre;
drop function if exists estook.los_platos_del_dia_cerrado_no_se_tocan();

drop trigger if exists cierre_de_caja_cerrado_no_se_toca on estook.cierre_de_caja;
drop function if exists estook.el_dia_cerrado_no_se_toca();

drop table if exists estook.reapertura_de_jornada;

alter table estook.cierre_de_caja
  drop constraint if exists cierre_estado_conocido,
  drop column if exists estado;

comment on column estook.cierre_de_caja.cerrado_en is null;
