-- Revertir la 0027.
--
-- Se van las tres tablas y lo que se le añadió al local. Lo que se pierde son los
-- fichajes, las retribuciones y los horarios de siempre: **eso es un registro
-- horario**, así que revertir esta migración con datos dentro no es una operación
-- de mantenimiento, es un borrado. Se dice aquí para que nadie la ejecute
-- pensando que deshace un cambio de forma.

drop function if exists estook.metros_entre(numeric, numeric, numeric, numeric);

drop table if exists estook.horario_habitual;
drop table if exists estook.retribucion;
drop table if exists estook.fichaje;

drop type if exists estook.forma_de_retribucion;

alter table estook.local
  drop constraint if exists local_latitud_valida,
  drop constraint if exists local_longitud_valida,
  drop constraint if exists local_posicion_entera,
  drop constraint if exists local_radio_razonable;

alter table estook.local
  drop column if exists latitud,
  drop column if exists longitud,
  drop column if exists radio_de_fichaje_metros;
