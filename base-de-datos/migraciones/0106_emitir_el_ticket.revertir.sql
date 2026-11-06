-- Deshace la 0106: el motor y el ticket se van, con todo lo emitido en pruebas.
--
-- **Lo que la vuelta atrás no puede guardar**: los documentos preparados, sus envíos y sus
-- registros. En pruebas no importa; **en real no se puede volver atrás** (Anexo 4.12), y por
-- eso «Pasar a real» sigue cerrado hasta las once condiciones del capítulo 9.

drop table if exists plataforma.aviso_de_verifacti;

drop function if exists facturacion.dar_el_justificante(uuid);
drop function if exists facturacion.apuntar_el_aviso(text, jsonb);
drop function if exists facturacion.apuntar_el_registro(uuid, text, text, text, text, text, text, text, text, text, timestamptz);
drop function if exists facturacion.apuntar_el_envio(uuid, date, boolean, text, text, integer, text, text, timestamptz);
drop function if exists facturacion.se_puede_tocar(uuid);
drop function if exists facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz);

drop table if exists facturacion.justificante;
drop table if exists facturacion.aviso_recibido;
drop table if exists facturacion.registro;
drop table if exists facturacion.envio;
drop table if exists facturacion.documento;
