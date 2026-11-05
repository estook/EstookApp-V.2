-- Deshace la 0101: la base vuelve a dejar ese NIF en cualquier empresa. Lo convertido se queda
-- como empresa de pruebas: devolverlo a «normal» volvería a pedir firmar por otra sociedad.

drop trigger empresa_el_nif_de_pruebas on estook.empresa;
drop function estook.el_nif_de_pruebas_solo_en_la_de_pruebas();
