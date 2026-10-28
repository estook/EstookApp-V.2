-- 0095 · La pausa del TPV (decisión 0121; Richi, 28-oct: «programar pedido para llevar»)
--
-- **Lo de llevar, a su hora.** El cliente llama y lo quiere para las 21:30: la cuenta para
-- llevar guarda **para cuándo** es. La cocina la ve aparte, con su hora, hasta que toca
-- empezarla; la comanda en papel sale con «PARA LAS 21:30». Solo lo de llevar: una mesa o la
-- barra comen ahora.

alter table estook.cuenta
  add column para_las timestamptz,
  add constraint cuenta_para_las_solo_para_llevar check (para_las is null or tipo = 'para_llevar');

comment on column estook.cuenta.para_las is
  'Lo de llevar programado (0121): para cuándo lo quiere el cliente. Nulo, para ya.';
