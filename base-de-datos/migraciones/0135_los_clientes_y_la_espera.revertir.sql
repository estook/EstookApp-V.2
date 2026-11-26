-- Deshace la 0135 (los clientes, la lista de espera y las reservas grandes del calendario).
drop function if exists estook.las_reservas_grandes(uuid, date, date);
drop table if exists estook.espera;
drop trigger if exists reserva_con_su_cliente on estook.reserva;
drop function if exists estook.el_cliente_de_la_reserva();
alter table estook.reserva drop column if exists cliente_id;
drop table if exists estook.cliente_del_local;
