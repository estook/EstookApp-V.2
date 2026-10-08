-- Deshace la 0058: sin vendedores, sin códigos y sin saber con quién llegó cada cliente.
--
-- **Lo que se pierde:** los vendedores y sus códigos, con qué código y por dónde
-- llegó cada cliente, y qué cupones de Stripe se habían creado. Los cupones siguen
-- en Stripe, sin usar; y un descuento ya puesto en una suscripción, también.

drop function if exists plataforma.apuntar_la_llegada(uuid, text, text, text, text, text, text);
drop function if exists plataforma.lo_que_da_el_codigo(text);

alter table plataforma.stripe
  drop column if exists avisos,
  drop column if exists cupones;

drop table if exists plataforma.llegada;
drop table if exists plataforma.codigo_de_vendedor;
drop function if exists plataforma.codigo_solo_se_cierra();
drop table if exists plataforma.vendedor;
drop function if exists plataforma.vendedor_no_se_borra();
