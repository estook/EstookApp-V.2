-- 0094 · Estook TPV es de Pro (decisión 0120; Richi, 28-oct: «TPV es únicamente Pro»)
--
-- **El plan de una organización, para la API, sin sesión.** Lo que entra en Estook TPV con la
-- llave de un aparato —el latido, el PIN, la pantalla de cocina— no tiene persona, y la
-- suscripción solo la ve quien ve la organización (0018): leída así, llegaba vacía y el
-- aparato de un local en Esencial pasaba. Esta función da **solo lo que hace falta para
-- decidir**: el plan y si la cuenta es de la casa o de ejemplo. La regla en sí —qué planes
-- llevan Estook TPV— vive en un solo sitio, `llevaEstookTpv` en `@estook/dominio`.

create function estook.el_plan_de(p_organizacion uuid)
returns table (
  plan        text,
  de_la_casa  boolean,
  es_ejemplo  boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select s.plan, s.de_la_casa, o.es_ejemplo
    from estook.organizacion o
    join estook.suscripcion s on s.organizacion_id = o.id
   where o.id = p_organizacion
$$;

comment on function estook.el_plan_de(uuid) is
  'El plan de una organización y si es de la casa o de ejemplo: lo que mira la API para Estook TPV (0120). Solo la ejecuta estook_api.';

revoke all on function estook.el_plan_de(uuid) from public;
grant execute on function estook.el_plan_de(uuid) to estook_api;
