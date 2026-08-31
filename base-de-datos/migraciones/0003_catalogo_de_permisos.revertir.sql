-- Reversion de 0003 · El catalogo de permisos

drop trigger if exists recorte_recortable on estook.recorte_de_permiso;
drop trigger if exists recorte_actualizado on estook.recorte_de_permiso;

drop function if exists estook.recorte_es_recortable();

drop table if exists estook.recorte_de_permiso;
drop table if exists estook.permiso;

drop type if exists estook.nivel_de_permiso;
