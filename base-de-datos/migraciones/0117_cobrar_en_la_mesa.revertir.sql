-- Deshace la 0117: el comandero deja de cobrar en la mesa.
--
-- **Lo que se pierde:** los cobros en efectivo que esperaban en la caja (los ya cobrados siguen en
-- `estook.cobro`, con su ticket) y la impresora de cada aparato, que vuelve a ser la de la caja.

drop function estook.los_cobros_pendientes_de_la_caja(uuid);

alter table estook.terminal drop column imprime_en;

drop table estook.cobro_pendiente;
drop function estook.el_pendiente_no_se_reescribe();
