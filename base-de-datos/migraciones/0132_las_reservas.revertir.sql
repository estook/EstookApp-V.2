-- Deshace la 0132: sin reservas. **Se pierden las reservas, sus mesas y los ajustes de reservas.**

drop index estook.cuenta_una_por_reserva;
alter table estook.cuenta drop column reserva_id;
drop table estook.reserva_de_mesa;
drop table estook.reserva;
drop table estook.mesas_que_se_juntan;
drop table estook.ajuste_de_reservas;
-- `btree_gist` se queda: quitarla no deshace nada y otra cosa podría usarla.
