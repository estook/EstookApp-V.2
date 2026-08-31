-- Reversion de 0007 · Traducciones, dispositivos y catalogo maestro

drop trigger if exists politica_coherente on estook.politica_de_catalogo;
drop trigger if exists politica_actualizada on estook.politica_de_catalogo;
drop trigger if exists dispositivo_actualizado on estook.dispositivo;
drop trigger if exists traduccion_actualizada on estook.traduccion;

drop function if exists estook.politica_area_coherente();

drop table if exists estook.politica_de_catalogo;
drop table if exists estook.dispositivo;
drop table if exists estook.traduccion;

drop type if exists estook.politica_maestra;
drop type if exists estook.tipo_maestro;
drop type if exists estook.tipo_de_dispositivo;
