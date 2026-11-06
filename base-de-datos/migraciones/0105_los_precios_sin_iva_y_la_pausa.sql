-- 0105 · R4 · Los precios sin IVA y la Pausa (decisión 0135)
--
-- Richi, 6-nov: los precios finales **sin IVA**, con el IVA aparte (Esencial 39 €, Pro 99 €,
-- Cadena 89 € por local y Pausa 9 €), y la Pausa con sus reglas: al instante, se vuelve
-- cuando se quiera prorrateando, hasta seis meses (y entonces vuelve sola al plan de antes) y
-- una vez cada doce meses.
--
--   A · la Pausa en la suscripción: cuándo empezó la última y a qué plan vuelve
--   B · `cambiar_la_suscripcion` las escribe: la misma de la 0047, copiada entera, con tres
--       líneas más
--   C · **las cuotas guardadas pasan a sin IVA**: desde hoy la cuota de un cliente es la de
--       su precio sin IVA (Pro, 99 €). Lo apuntado antes, con el IVA dentro, se divide entre
--       1,21 para que las ventas del admin no mezclen las dos cosas. Solo hay pagos de prueba
--   D · el IVA de Stripe, **aparte** del precio: se olvida el tipo de IVA «incluido» que se
--       guardó, y el catálogo crea (o encuentra) el de «aparte» la próxima vez que haga falta
--   E · `las_pausas()`: las cuentas en Pausa, para el reloj, que avisa siete días antes de los
--       seis meses y ese día las vuelve al plan de antes. El reloj es el sistema y no ve la
--       suscripción por la política de lectura (es de quien ve la organización)
--
-- Lo cobrado (`plataforma.cobro`, `plataforma.devolucion`) no cambia: ya guardaba las dos
-- cifras, con IVA y sin él, como las dice la factura.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La Pausa en la suscripción
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.suscripcion
  add column pausa_empezo       date,
  add column vuelve_a_plan      text,
  add column vuelve_a_intervalo text,
  add constraint suscripcion_vuelve_a_plan_conocido
    check (vuelve_a_plan is null or vuelve_a_plan in ('esencial', 'pro', 'cadena')),
  add constraint suscripcion_vuelve_a_intervalo_conocido
    check (vuelve_a_intervalo is null or vuelve_a_intervalo in ('mes', 'ano'));

comment on column estook.suscripcion.pausa_empezo is
  'El día (Madrid) que empezó la última Pausa. Se queda al volver: de él cuentan los doce meses hasta la siguiente (0135).';
comment on column estook.suscripcion.vuelve_a_plan is
  'En Pausa, el plan que tenía al pausar: a él vuelve, cuando quiera o solo a los seis meses. Nulo fuera de la Pausa (0135).';
comment on column estook.suscripcion.vuelve_a_intervalo is
  'En Pausa, si pagaba al mes o al año antes de pausar (0135).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Cambiar la suscripción, con la Pausa
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function estook.cambiar_la_suscripcion(
  p_organizacion uuid,
  p_cambios jsonb,
  p_quien text,
  p_porque text
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  antes  estook.estado_de_suscripcion;
  ahora  estook.estado_de_suscripcion;
  el_plan text;
begin
  select s.estado into antes from estook.suscripcion s where s.organizacion_id = p_organizacion
   for update;
  if not found then
    raise exception 'Esa organización no tiene suscripción.';
  end if;

  update estook.suscripcion s set
    estado             = coalesce((p_cambios ->> 'estado')::estook.estado_de_suscripcion, s.estado),
    plan               = case when p_cambios ? 'plan' then p_cambios ->> 'plan' else s.plan end,
    intervalo          = case when p_cambios ? 'intervalo' then p_cambios ->> 'intervalo' else s.intervalo end,
    locales_pagados    = case when p_cambios ? 'locales_pagados' then (p_cambios ->> 'locales_pagados')::smallint else s.locales_pagados end,
    prueba_hasta       = case when p_cambios ? 'prueba_hasta' then (p_cambios ->> 'prueba_hasta')::date else s.prueba_hasta end,
    periodo_hasta      = case when p_cambios ? 'periodo_hasta' then (p_cambios ->> 'periodo_hasta')::timestamptz else s.periodo_hasta end,
    cancela_al_acabar  = coalesce((p_cambios ->> 'cancela_al_acabar')::boolean, s.cancela_al_acabar),
    impago_desde       = case
                           when not p_cambios ? 'impago' then s.impago_desde
                           when (p_cambios ->> 'impago')::boolean then coalesce(s.impago_desde, now())
                           else null
                         end,
    dias_de_prueba     = case when p_cambios ? 'dias_de_prueba' then (p_cambios ->> 'dias_de_prueba')::smallint else s.dias_de_prueba end,
    stripe_modo        = case when p_cambios ? 'stripe_modo' then p_cambios ->> 'stripe_modo' else s.stripe_modo end,
    stripe_cliente     = case when p_cambios ? 'stripe_cliente' then p_cambios ->> 'stripe_cliente' else s.stripe_cliente end,
    stripe_suscripcion = case when p_cambios ? 'stripe_suscripcion' then p_cambios ->> 'stripe_suscripcion' else s.stripe_suscripcion end,
    tarjeta            = case when p_cambios ? 'tarjeta' then p_cambios ->> 'tarjeta' else s.tarjeta end,
    pausa_empezo       = case when p_cambios ? 'pausa_empezo' then (p_cambios ->> 'pausa_empezo')::date else s.pausa_empezo end,
    vuelve_a_plan      = case when p_cambios ? 'vuelve_a_plan' then p_cambios ->> 'vuelve_a_plan' else s.vuelve_a_plan end,
    vuelve_a_intervalo = case when p_cambios ? 'vuelve_a_intervalo' then p_cambios ->> 'vuelve_a_intervalo' else s.vuelve_a_intervalo end
   where s.organizacion_id = p_organizacion
  returning s.estado, s.plan into ahora, el_plan;

  if ahora is distinct from antes then
    insert into plataforma.cambio_de_suscripcion (organizacion_id, de_estado, a_estado, plan, quien, porque)
    values (p_organizacion, antes::text, ahora::text, el_plan, p_quien, p_porque);
  end if;
end;
$$;

comment on function estook.cambiar_la_suscripcion(uuid, jsonb, text, text) is
  'Cambia la suscripción de una organización y apunta el cambio de estado. La llaman Stripe, el reloj y las operaciones de pago (0048, y la Pausa desde la 0135).';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Las cuotas guardadas, sin IVA
-- ═══════════════════════════════════════════════════════════════════════════

update plataforma.uso_diario
   set cuota_al_mes = round(cuota_al_mes / 1.21)
 where cuota_al_mes is not null;

update plataforma.cuota_de_stripe
   set importe = round(importe / 1.21);

comment on column plataforma.uso_diario.cuota_al_mes is
  'Lo que dejaba al mes ese día, en céntimos y sin IVA (desde la 0135): el anual, su doceava parte. Nulo si no pagaba (0077).';
comment on table plataforma.cuota_de_stripe is
  'Lo que Stripe cobra a cada cliente en cada cobro, sin IVA (desde la 0135), con el precio con el que se apuntó (0077).';

-- ═══════════════════════════════════════════════════════════════════════════
-- D · El IVA de Stripe, aparte
-- ═══════════════════════════════════════════════════════════════════════════

update plataforma.stripe set iva = null;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Las cuentas en Pausa, para el reloj
-- ═══════════════════════════════════════════════════════════════════════════

create function estook.las_pausas()
returns table (
  organizacion_id    uuid,
  pausa_empezo       date,
  vuelve_a_plan      text,
  vuelve_a_intervalo text
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select s.organizacion_id, s.pausa_empezo, s.vuelve_a_plan, s.vuelve_a_intervalo
    from estook.suscripcion s
   where estook.es_el_sistema()
     and s.plan = 'pausa'
     and s.pausa_empezo is not null
     and s.vuelve_a_plan is not null
$$;

comment on function estook.las_pausas() is
  'Las cuentas en Pausa, con cuándo empezó y a qué plan vuelven. Solo para el sistema (el reloj, 0135).';

revoke all on function estook.las_pausas() from public;
grant execute on function estook.las_pausas() to estook_api;
