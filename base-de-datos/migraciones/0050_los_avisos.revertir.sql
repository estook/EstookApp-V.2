-- Deshace la 0050: sin campana, sin lo que cada uno eligió de sus avisos, sin
-- invitaciones a rellenar un pedido y sin el umbral de las subidas de precio.
--
-- **Lo que se pierde:** los avisos de cada uno, sus preferencias y las invitaciones
-- a pedidos. Los pedidos, las mermas, las notas y los precios de los que avisaban se
-- quedan como estaban: el aviso era un reflejo, no el dato.

drop function if exists estook.quien_recibe(uuid, text[]);

drop table if exists estook.invitacion_a_pedido;
drop table if exists estook.preferencia_de_aviso;
drop trigger if exists aviso_solo_se_lee on estook.aviso;
drop table if exists estook.aviso;
drop function if exists estook.aviso_solo_se_lee();

alter table estook.local
  drop constraint if exists local_subida_que_avisa_en_rango,
  drop column if exists subida_que_avisa;
