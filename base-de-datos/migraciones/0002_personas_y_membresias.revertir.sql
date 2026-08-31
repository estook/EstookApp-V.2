-- Reversion de 0002 · Personas, roles y membresias

drop trigger if exists membresia_coherente on estook.membresia;
drop trigger if exists membresia_actualizada on estook.membresia;
drop trigger if exists persona_actualizada on estook.persona;

drop function if exists estook.membresia_es_coherente();

drop table if exists estook.membresia;
drop table if exists estook.rol;
drop table if exists estook.persona;

drop type if exists estook.idioma;
drop type if exists estook.alcance;
