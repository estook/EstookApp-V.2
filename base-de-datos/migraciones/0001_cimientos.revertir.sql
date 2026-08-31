-- Reversion de 0001 · Cimientos

drop trigger if exists local_actualizado on estook.local;
drop trigger if exists area_actualizada on estook.area;
drop trigger if exists organizacion_actualizada on estook.organizacion;
drop trigger if exists local_area_coherente on estook.local;

drop table if exists estook.local;
drop table if exists estook.area;
drop table if exists estook.organizacion;

drop function if exists estook.area_es_de_la_misma_organizacion();
drop function if exists estook.marcar_actualizado();

-- El esquema no se borra: lo comparte con la tabla de control de migraciones.
