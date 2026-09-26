-- Deshace la 0049: sin ficha comercial, sin notas de cliente, sin la foto diaria del
-- uso, sin cambios de correo y sin las funciones del admin para leer clientes.
--
-- **Lo que se pierde:** la ficha comercial y las notas de cada cliente, la historia
-- de su actividad y los cambios de correo pedidos. Lo que el admin anotó en la
-- auditoría de cada cliente se queda: la auditoría no se borra.

drop function if exists plataforma.parar_cambio_de_correo(text);
drop function if exists plataforma.confirmar_cambio_de_correo(text);
drop function if exists plataforma.pedir_cambio_de_correo(uuid, text, text, text, text, timestamptz);
drop function if exists estook.poner_de_la_casa(uuid, boolean, text);
drop function if exists estook.renombrar_desde_el_admin(uuid, text);
drop function if exists estook.anotar_desde_el_admin(uuid, text, text, text, jsonb, jsonb, text);
drop function if exists estook.el_uso_de(uuid);
drop function if exists estook.lo_que_hacen_los_clientes();
drop function if exists estook.un_cliente(uuid);
drop function if exists estook.los_clientes();
drop function if exists estook.es_admin_o_el_sistema();

drop table if exists plataforma.cambio_de_correo;
drop table if exists plataforma.uso_diario;
drop trigger if exists nota_de_cliente_se_fija_y_nada_mas on plataforma.nota_de_cliente;
drop table if exists plataforma.nota_de_cliente;
drop function if exists plataforma.nota_de_cliente_solo_se_fija();
drop table if exists plataforma.ficha_comercial;
