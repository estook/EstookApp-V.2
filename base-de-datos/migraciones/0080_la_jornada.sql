-- 0080 · La jornada (M16a, decisión 0105)
--
-- El día del restaurante va de la hora de corte a la hora de corte: lo que se cobra a las
-- 02:30 del sábado es del viernes (M2). Hasta hoy el día no tenía estado: la caja se
-- cerraba, y volver a cerrarla la cambiaba sin decir nada. La Auditoría de Flujos lo pide
-- con su máquina de estados, `abierta → cerrada → reabierta → cerrada`, y «reabrir exige
-- motivo y queda en auditoría».
--
--   · **Abierta no es una fila.** Un día sin cierre está abierto: se abre solo a la hora
--     de corte, sin que nadie pulse nada ni haga falta un reloj que lo apunte. Así no hay
--     dos verdades —«la jornada está abierta» y «no hay cierre»— que puedan contradecirse.
--   · `cierre_de_caja.estado`   `cerrada` o `reabierta`. El cierre de caja ya era uno por
--                               jornada (0029): es el cierre del día, y aquí gana su estado.
--   · `reapertura_de_jornada`   quién reabrió, cuándo y por qué. Solo se lee y se añade.
--   · **Un día cerrado no se toca**: la base no deja cambiar sus cifras ni sus platos. Para
--     cambiarlo se reabre con un motivo escrito (Richi, 22-oct: lo reabre quien puede
--     cerrar la caja), y al volver a cerrarlo queda cerrado otra vez.
--
-- Lo cerrado antes de hoy queda cerrado: la columna nace con `cerrada` para todos.

-- ═══ El estado del día ═════════════════════════════════════════════════════════

alter table estook.cierre_de_caja
  add column estado text not null default 'cerrada',
  add constraint cierre_estado_conocido check (estado in ('cerrada', 'reabierta'));

comment on column estook.cierre_de_caja.estado is
  'El estado de la jornada (M16a, 0105): cerrada, o reabierta con su motivo en reapertura_de_jornada. Un día sin cierre está abierto.';
comment on column estook.cierre_de_caja.cerrado_en is
  'Cuándo se cerró la jornada por última vez. Si se reabrió y se volvió a cerrar, la última; las de antes, en reapertura_de_jornada y en la auditoría.';

-- ═══ Las reaperturas ═══════════════════════════════════════════════════════════

create table estook.reapertura_de_jornada (
  id            uuid         primary key default gen_random_uuid(),
  cierre_id     uuid         not null references estook.cierre_de_caja (id) on delete cascade,
  local_id      uuid         not null references estook.local (id) on delete cascade,
  -- «Me equivoqué con la tarjeta: eran 412, no 421.» Se escribe siempre.
  motivo        text         not null,
  reabierta_por uuid         references estook.persona (id) on delete set null,
  reabierta_en  timestamptz  not null default now(),

  constraint reapertura_con_motivo check (char_length(btrim(motivo)) between 3 and 500)
);

comment on table estook.reapertura_de_jornada is
  'Cada vez que se reabre un día cerrado: quién, cuándo y por qué (M16a, 0105). Solo se lee y se añade: es el rastro de lo que se cambió después de cerrar.';

create index reapertura_por_cierre on estook.reapertura_de_jornada (cierre_id, reabierta_en desc);

alter table estook.reapertura_de_jornada enable row level security;

-- La lee quien ve las ventas, como el cierre. La escribe quien puede cerrar la caja, y
-- solo sobre un cierre de su local.
create policy reapertura_lectura on estook.reapertura_de_jornada
  for select using (estook.puede_ver('dato.ventas', local_id));

create policy reapertura_alta on estook.reapertura_de_jornada
  for insert with check (
    estook.puede_editar('dato.ventas', local_id)
    and estook.puede_editar('app.servicio', local_id)
    and exists (
      select 1 from estook.cierre_de_caja c
       where c.id = cierre_id and c.local_id = reapertura_de_jornada.local_id
    )
  );

grant select, insert on estook.reapertura_de_jornada to estook_api;

-- ═══ Un día cerrado no se toca ═════════════════════════════════════════════════
--
-- «Cerrado» es cerrado **en otra transacción**: el cierre que se está haciendo ahora
-- (con `cerrado_en = now()`) todavía escribe sus platos. Lo que se cerró antes solo
-- admite una cosa: pasar a `reabierta`, y solo si en esta misma transacción se ha
-- escrito por qué.

create function estook.el_dia_cerrado_no_se_toca()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
begin
  if old.estado <> 'cerrada' or old.cerrado_en >= now() then
    return new;
  end if;

  if new.estado = 'reabierta'
     and exists (
       select 1 from estook.reapertura_de_jornada r
        where r.cierre_id = old.id and r.reabierta_en = now()
     )
     and (new.total_centimos, new.efectivo_centimos, new.tarjeta_centimos, new.otros_centimos,
          new.comensales, new.tickets, new.origen, new.notas)
         is not distinct from
         (old.total_centimos, old.efectivo_centimos, old.tarjeta_centimos, old.otros_centimos,
          old.comensales, old.tickets, old.origen, old.notas) then
    return new;
  end if;

  raise exception 'jornada_cerrada: el día % está cerrado; se reabre con un motivo', old.fecha_operativa
    using errcode = 'P0001';
end;
$$;

create trigger cierre_de_caja_cerrado_no_se_toca
  before update on estook.cierre_de_caja
  for each row execute function estook.el_dia_cerrado_no_se_toca();

create function estook.los_platos_del_dia_cerrado_no_se_tocan()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
declare
  v_cierre uuid := coalesce(new.cierre_id, old.cierre_id);
begin
  if exists (
    select 1 from estook.cierre_de_caja c
     where c.id = v_cierre and c.estado = 'cerrada' and c.cerrado_en < now()
  ) then
    raise exception 'jornada_cerrada: los platos de un día cerrado no se cambian'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger linea_de_cierre_del_dia_cerrado
  before insert or update or delete on estook.linea_de_cierre
  for each row execute function estook.los_platos_del_dia_cerrado_no_se_tocan();

-- ═══ Cómo está el día, para quien no ve las ventas ═════════════════════════════
--
-- «En marcha» lo mira también una camarera, que no ve la caja (0029). Saber si el día
-- está cerrado y quién lo cerró no es dinero: esto lo dice sin enseñar una cifra, y
-- solo de un local que quien pregunta ve.

create function estook.como_esta_la_jornada(p_local uuid, p_fecha date)
returns table (estado text, cerrada_en timestamptz, cerrada_por text)
language sql
stable
security definer
set search_path = estook, public, pg_catalog, pg_temp
as $$
  select c.estado, c.cerrado_en, p.nombre
    from estook.cierre_de_caja c
    left join estook.persona p on p.id = c.cerrado_por
   where c.local_id = p_local
     and c.fecha_operativa = p_fecha
     and p_local in (select local_id from estook.locales_visibles());
$$;

comment on function estook.como_esta_la_jornada(uuid, date) is
  'Si un día de un local que quien pregunta ve está cerrado o reabierto, cuándo y quién: sin un euro (M16a, 0105). Sin fila, está abierto.';

revoke all on function estook.como_esta_la_jornada(uuid, date) from public;
grant execute on function estook.como_esta_la_jornada(uuid, date) to estook_api;
