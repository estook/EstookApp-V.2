-- 0113 · La pausa del 8-nov · P3 · Empleados y sus objetivos (decisión 0142)
--
-- Servicio › Empleados: lo que vende cada uno y por hora fichada, con su objetivo. Richi, 8-nov:
-- «un botón de añadir objetivo con General o Por empleado», «el camarero ve su objetivo solo, y el
-- gerente puede ocultar que lo vean».
--
--   · **El objetivo es en € por hora**: lo de la semana de cada uno sale de sus horas, y así es
--     justo con quien hace 20 horas y con quien hace 40.
--   · **Uno general por local** (`persona_id` nulo) y, si hace falta, **uno distinto** para alguien.
--   · **`cada_uno_lo_ve`**, en el general: si cada camarero ve el suyo. Encendido de fábrica.
--
-- Lo cambia quien pone los objetivos del local (`accion.poner_objetivos`, el de los del Panel).
-- Lo leen quien ve las ventas y **cada uno el suyo**; la lista de los demás, nunca.

create table estook.objetivo_de_venta (
  id                 uuid         primary key default gen_random_uuid(),
  local_id           uuid         not null references estook.local (id) on delete cascade,
  -- Nulo: el general del local.
  persona_id         uuid         references estook.persona (id) on delete cascade,
  -- Lo que debería vender cada hora fichada, sin IVA: de 1 a 1.000 €.
  centimos_por_hora  integer      not null,
  -- Solo en el general: si cada camarero ve el suyo.
  cada_uno_lo_ve     boolean,
  cambiado_en        timestamptz  not null default now(),
  cambiado_por       uuid         references estook.persona (id) on delete set null,
  version            integer      not null default 1,

  constraint objetivo_de_venta_en_rango check (centimos_por_hora between 100 and 100000),
  constraint objetivo_de_venta_lo_ve_solo_el_general check (
    (persona_id is null) = (cada_uno_lo_ve is not null)
  ),
  constraint objetivo_de_venta_uno_por_persona unique nulls not distinct (local_id, persona_id)
);

comment on table estook.objetivo_de_venta is
  'El objetivo de venta por hora de un local (general) o de una persona en él (0142). Lo pone quien pone los objetivos; lo leen quien ve las ventas y cada uno el suyo.';

create trigger objetivo_de_venta_sube_version before update on estook.objetivo_de_venta
  for each row execute function estook.subir_version();

alter table estook.objetivo_de_venta enable row level security;

create policy objetivo_de_venta_lectura on estook.objetivo_de_venta
  for select using (
    estook.puede_ver('dato.ventas', local_id)
    or estook.puede_editar('accion.poner_objetivos', local_id)
    -- Cada uno, el suyo, y el general (para saber el suyo si no tiene uno distinto).
    or (
      local_id in (select local_id from estook.locales_visibles())
      and (persona_id = estook.persona_actual() or persona_id is null)
    )
  );

-- **Solo a gente de ese local** (lo cazó la prueba que ataca la API desde otro negocio): sin esto,
-- se podía poner un objetivo, en el local propio, a nombre de alguien de otra organización.
create policy objetivo_de_venta_escritura on estook.objetivo_de_venta
  for all using (estook.puede_editar('accion.poner_objetivos', local_id))
  with check (
    estook.puede_editar('accion.poner_objetivos', local_id)
    and (persona_id is null or persona_id in (select estook.quien_lleva_el_servicio(local_id)))
  );

grant select, insert, update, delete on estook.objetivo_de_venta to estook_api;

-- ── Lo vendido por cada uno, para el propio camarero ────────────────────────
--
-- Quien no ve las ventas del local no puede leer `las_lineas_vendidas` (0112). Para ver **su**
-- objetivo necesita **su** venta, y solo esa: esta función la da sumada, de quien pregunta, y
-- solo si el gerente deja que cada uno vea el suyo.

create function estook.lo_que_he_vendido(p_local uuid, p_desde date, p_hasta date)
returns table (se_ve boolean, centimos_con_iva bigint, mesas integer)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  v_persona uuid := estook.persona_actual();
begin
  if v_persona is null
     or not estook.puede_ver('app.servicio', p_local)
     or not coalesce((select o.cada_uno_lo_ve from estook.objetivo_de_venta o
                       where o.local_id = p_local and o.persona_id is null), true) then
    -- Sin error: una excepción dejaría la transacción de la API a medias. Se dice que no se ve.
    return query select false, 0::bigint, 0;
    return;
  end if;
  return query
    with el_local as (
      select l.zona_horaria, l.hora_de_corte from estook.local l where l.id = p_local
    ), suyas as (
      select c.id
        from estook.cuenta c, el_local el
       where c.local_id = p_local
         and c.camarero_id = v_persona
         and c.anulada_en is null
         and c.unida_a is null
         and ((coalesce(c.liberada_en, c.abierta_en) at time zone el.zona_horaria)
               - el.hora_de_corte::interval)::date between p_desde and p_hasta
    )
    select true, coalesce(sum(ld.precio_centimos::bigint * ld.cantidad), 0)::bigint,
           (select count(*)::integer from suyas)
      from estook.linea_de_cuenta ld
     where ld.cuenta_id in (select id from suyas)
       and ld.quitada_en is null;
end;
$$;

comment on function estook.lo_que_he_vendido(uuid, date, date) is
  'Lo que ha vendido quien pregunta en un local entre dos jornadas, sumado, para su objetivo (0142). Solo lo suyo, y solo si el gerente deja que cada uno lo vea.';

revoke all on function estook.lo_que_he_vendido(uuid, date, date) from public;
grant execute on function estook.lo_que_he_vendido(uuid, date, date) to estook_api;
