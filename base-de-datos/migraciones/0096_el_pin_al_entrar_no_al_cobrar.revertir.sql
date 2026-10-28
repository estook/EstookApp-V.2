-- Deshace la 0096: la caja vuelve a bloquearse al acabar cada cobro, de fábrica. Lo que cada
-- local tenga guardado se queda como está.

comment on column estook.ajustes_del_tpv.bloqueo_al_cobrar is null;

alter table estook.ajustes_del_tpv alter column bloqueo_al_cobrar set default true;
