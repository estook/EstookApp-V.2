-- Deshace la 0105: la Pausa sale de la suscripción, `cambiar_la_suscripcion` vuelve a ser la
-- de la 0047 y las cuotas guardadas vuelven a llevar el IVA dentro.
--
-- Lo que la vuelta atrás no puede guardar, dicho aquí: **cuándo empezó la última Pausa y a
-- qué plan volvía** (quien esté en Pausa se queda en ella, sin vuelta automática), y **un
-- céntimo arriba o abajo** en alguna cuota, por redondear dos veces.

drop function if exists estook.las_pausas();

update plataforma.stripe set iva = null;

update plataforma.cuota_de_stripe
   set importe = round(importe * 1.21);

update plataforma.uso_diario
   set cuota_al_mes = round(cuota_al_mes * 1.21)
 where cuota_al_mes is not null;

comment on column plataforma.uso_diario.cuota_al_mes is
  'Lo que dejaba al mes ese día, en céntimos y con IVA: el anual, su doceava parte. Nulo si no pagaba (0077).';
comment on table plataforma.cuota_de_stripe is
  'Lo que Stripe cobra a cada cliente en cada cobro, con el precio con el que se apuntó (0077).';

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
    tarjeta            = case when p_cambios ? 'tarjeta' then p_cambios ->> 'tarjeta' else s.tarjeta end
   where s.organizacion_id = p_organizacion
  returning s.estado, s.plan into ahora, el_plan;

  if ahora is distinct from antes then
    insert into plataforma.cambio_de_suscripcion (organizacion_id, de_estado, a_estado, plan, quien, porque)
    values (p_organizacion, antes::text, ahora::text, el_plan, p_quien, p_porque);
  end if;
end;
$$;

comment on function estook.cambiar_la_suscripcion(uuid, jsonb, text, text) is
  'Cambia la suscripción de una organización y apunta el cambio de estado. La llaman Stripe, el reloj y las operaciones de pago (0048).';

alter table estook.suscripcion
  drop constraint suscripcion_vuelve_a_intervalo_conocido,
  drop constraint suscripcion_vuelve_a_plan_conocido,
  drop column vuelve_a_intervalo,
  drop column vuelve_a_plan,
  drop column pausa_empezo;
