-- Revertir la 0032.
--
-- Se va la tabla de eventos, con todo lo que los módulos hubieran publicado. No
-- se pierde nada de origen: las entregas salen de los pedidos y los repartos, y
-- las caducidades de los lotes, así que volver a aplicarla las pone otra vez.

drop table if exists estook.evento_de_calendario;
drop function if exists estook.evento_roles_conocidos();
drop function if exists estook.mis_roles_en(uuid);
drop type if exists estook.capa_de_calendario;
