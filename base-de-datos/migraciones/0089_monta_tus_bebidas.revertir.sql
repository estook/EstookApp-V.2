-- Deshace la 0089: se van las dosis de la casa (las bebidas montadas siguen, con lo suyo) y la
-- función que cambia lo del TPV del local.

drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint);

alter table estook.local drop constraint local_dosis_razonables;
alter table estook.local drop column copa_de_vino_ml, drop column dosis_de_la_copa_ml;
