-- Deshace la 0070: vuelven los permisos con los que nacieron las tablas de la 0069
-- (los que daba la 0006 por defecto) y se quita la marca de «tal cual». Los platos
-- vinculados con una ración que no es 1 ud pasan a verse como una ficha de una línea.

grant select, insert, update, delete on estook.elaboracion, estook.receta, estook.receta_guardada
  to estook_api;

alter table estook.receta drop column tal_cual;
