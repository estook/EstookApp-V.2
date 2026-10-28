-- 0096 · El PIN al entrar, no al cobrar (decisión 0121, punto 7; Richi, 28-oct: «¿cada vez que
-- cobren pide PIN? Es un coñazo para los trabajadores»)
--
-- **La caja ya no se bloquea al acabar cada cobro, de fábrica.** Quien entra con su PIN se queda
-- dentro hasta que toca su nombre o pasan los minutos sin tocar, como en Toast y Square. Bloquear
-- tras cada cobro queda como opción en Ajustes del TPV › PIN y bloqueo, para el local donde la
-- caja la tocan muchos a la vez. Nadie cobra todavía con Estook TPV (T7), así que se apaga en
-- todos los locales sin cambiar nada de lo que ya se hace.

alter table estook.ajustes_del_tpv alter column bloqueo_al_cobrar set default false;

update estook.ajustes_del_tpv set bloqueo_al_cobrar = false where bloqueo_al_cobrar;

comment on column estook.ajustes_del_tpv.bloqueo_al_cobrar is
  'Bloquear la caja al acabar cada cobro (0121): apagado de fábrica; el PIN se pide al entrar.';
