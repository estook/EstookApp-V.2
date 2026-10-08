-- Deshace la 0059: sin lo cobrado, sin las visitas de los códigos y sin el correo del
-- lunes; y la foto de cada día vuelve a ser solo la del uso.
--
-- **Lo que se pierde:** los cobros y las devoluciones apuntados (siguen en Stripe), lo
-- que Stripe cobra a cada cliente, cuántas veces se abrió cada enlace, qué correos del
-- lunes se mandaron y, de cada foto, cómo estaba la cuenta y cuánto dejaba.

drop function if exists plataforma.los_correos_de_los_admins();
drop function if exists plataforma.contar_la_visita(text, date);
drop function if exists plataforma.apuntar_la_cuota_de_stripe(uuid, integer, text);

drop table if exists plataforma.correo_de_ventas;
drop table if exists plataforma.visita_del_codigo;
drop table if exists plataforma.devolucion;
drop table if exists plataforma.cobro;
drop function if exists plataforma.lo_cobrado_no_se_toca();
drop table if exists plataforma.cuota_de_stripe;

alter table plataforma.stripe
  drop column if exists cobros_traidos_en;

alter table plataforma.uso_diario
  drop constraint if exists uso_como_conocido,
  drop constraint if exists uso_cuota_positiva,
  drop constraint if exists uso_modo_conocido,
  drop column if exists como,
  drop column if exists en_pausa,
  drop column if exists cuota_al_mes,
  drop column if exists de_la_casa,
  drop column if exists modo;
