-- 0117 · Cobrar en la mesa (decisión 0145; Richi, 10 y 11-nov)
--
-- **El comandero cobra.** Con tarjeta (el datáfono de siempre, aparte), Bizum o cheque, en la misma
-- mesa: no hace falta ir a la caja. **El efectivo se cobra en la caja**, porque el cajón está allí: el
-- camarero deja el cobro pendiente a su nombre y en la caja sale «Cobro pendiente · Mesa 4 · Ricardo»,
-- en la pantalla del PIN y en la mesa. Se toca, se teclea el PIN de quien cobra, se escribe lo que da
-- el cliente, sale el cambio, se imprime el ticket y la impresora abre el cajón. Lo de aquí:
--
--   · `cobro_pendiente`       lo que espera en la caja: qué cubre (la cuenta, unos platos o una parte),
--                             cuánto, lo que ya se cobró en la mesa con tarjeta (va en el mismo ticket)
--                             y quién lo dejó. Se resuelve con su cobro, o se quita
--   · `terminal.imprime_en`   la impresora donde saca sus tickets cada aparato; sin ella, la de la caja

-- ═══ 1 · Lo que espera en la caja ══════════════════════════════════════════════

create table estook.cobro_pendiente (
  -- Nace en el aparato: dejarlo dos veces desde el mismo toque no deja dos.
  id             uuid         primary key,
  local_id       uuid         not null references estook.local (id) on delete cascade,
  cuenta_id      uuid         not null references estook.cuenta (id) on delete restrict,
  -- Lo mismo que un cobro: lo que queda de la cuenta, unos platos o una parte igual.
  que            text         not null,
  lineas         uuid[],
  parte          smallint,
  de_partes      smallint,
  -- Lo que cubre, entero: lo cobrado ya en la mesa más lo que se cobra en efectivo en la caja.
  importe        integer      not null,
  -- Lo cobrado ya en la mesa con tarjeta, Bizum o cheque: [{"forma": "tarjeta", "importe": 2000}].
  -- Va en el mismo ticket que el efectivo, como dos pagos del mismo cobro (Anexo 5.1).
  ya_pagado      jsonb        not null default '[]',
  marcado_por    uuid         not null references estook.persona (id) on delete restrict,
  marcado_desde  uuid         references estook.terminal (id) on delete set null,
  marcado_en     timestamptz  not null,
  -- Cobrado en la caja: su cobro. O quitado (el cliente pagó al final con tarjeta).
  cobro_id       uuid         unique references estook.cobro (id) on delete restrict,
  quitado_en     timestamptz,
  quitado_por    uuid         references estook.persona (id) on delete restrict,

  constraint pendiente_que_conocido check (que in ('toda', 'platos', 'parte')),
  constraint pendiente_importe_en_rango check (importe between 1 and 300000),
  constraint pendiente_parte_entera check (
    (parte is null) = (de_partes is null)
    and (de_partes is null or (de_partes between 2 and 20 and parte between 1 and de_partes))
  ),
  constraint pendiente_ya_pagado_es_lista check (jsonb_typeof(ya_pagado) = 'array'),
  constraint pendiente_cobrado_o_quitado check (not (cobro_id is not null and quitado_en is not null)),
  constraint pendiente_quitado_entero check ((quitado_en is null) = (quitado_por is null))
);

comment on table estook.cobro_pendiente is
  'Lo que un camarero deja para cobrar en efectivo en la caja (0145): qué cubre, cuánto, lo ya cobrado en la mesa con tarjeta y quién lo dejó. Se resuelve con su cobro, o se quita.';

-- **Uno a la vez por cuenta y parte**: dos camareros dejando la misma mesa, gana uno.
create unique index pendiente_uno_por_parte on estook.cobro_pendiente (cuenta_id, coalesce(parte, 0))
  where cobro_id is null and quitado_en is null;
create index pendiente_por_local on estook.cobro_pendiente (local_id)
  where cobro_id is null and quitado_en is null;

-- **Lo resuelto no se toca**: un pendiente cobrado o quitado se queda como quedó. Antes, solo se le
-- pone su cobro o se quita; lo que cubre no cambia. Y no se borra nunca.
create function estook.el_pendiente_no_se_reescribe()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un cobro pendiente no se borra: se quita (0145)' using errcode = 'P0001';
  end if;
  if old.cobro_id is not null or old.quitado_en is not null then
    raise exception 'Un cobro pendiente resuelto no se toca (0145)' using errcode = 'P0001';
  end if;
  if (to_jsonb(new) - 'cobro_id' - 'quitado_en' - 'quitado_por')
     <> (to_jsonb(old) - 'cobro_id' - 'quitado_en' - 'quitado_por') then
    raise exception 'Lo que cubre un cobro pendiente no se cambia (0145)' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pendiente_no_se_reescribe before update or delete on estook.cobro_pendiente
  for each row execute function estook.el_pendiente_no_se_reescribe();

alter table estook.cobro_pendiente enable row level security;
revoke all on estook.cobro_pendiente from public;
grant select, insert, update on estook.cobro_pendiente to estook_api;

-- Lo ve quien cobra, quien lleva la caja y quien ve las ventas; lo deja y lo resuelve quien cobra.
create policy pendiente_lectura on estook.cobro_pendiente
  for select using (estook.ve_la_caja(local_id));
create policy pendiente_alta on estook.cobro_pendiente
  for insert with check (estook.puede_editar('accion.cobrar', local_id) or estook.es_el_sistema());
create policy pendiente_cambio on estook.cobro_pendiente
  for update using (estook.puede_editar('accion.cobrar', local_id) or estook.es_el_sistema())
  with check (estook.puede_editar('accion.cobrar', local_id) or estook.es_el_sistema());

-- ═══ 2 · Dónde saca sus tickets cada aparato ═══════════════════════════════════

-- Un comandero puede tener su impresora (una en la sala, o una pequeña en el cinturón). Sin ella, sus
-- tickets salen por la de la caja, como hasta hoy (Richi, 11-nov: «la impresora de cada aparato»).
alter table estook.terminal
  add column imprime_en uuid references estook.impresora (id) on delete set null;

comment on column estook.terminal.imprime_en is
  'La impresora donde saca sus tickets este aparato (0145). Nula: la de la caja.';

-- ═══ 3 · Lo que la caja lee sin nadie dentro ═══════════════════════════════════

-- **Los cobros que esperan, para la pantalla del PIN** (0145): la mesa, lo que se cobra en efectivo y el
-- nombre de pila de quien lo dejó. Sin abrir la tabla de personas al sistema: solo esto, solo de este
-- local y solo para el sistema (el latido del aparato, que va sin sesión).
create function estook.los_cobros_pendientes_de_la_caja(p_local uuid)
returns table (
  id           uuid,
  cuenta_id    uuid,
  tipo         text,
  mesa         text,
  nombre       text,
  en_efectivo  integer,
  por          text,
  desde        timestamptz
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id, p.cuenta_id, c.tipo, m.nombre, c.nombre,
         (p.importe - coalesce((select sum((y.v ->> 'importe')::integer)
                                  from jsonb_array_elements(p.ya_pagado) as y(v)), 0))::integer,
         split_part(btrim(q.nombre), ' ', 1),
         p.marcado_en
    from estook.cobro_pendiente p
    join estook.cuenta c on c.id = p.cuenta_id
    left join estook.mesa m on m.id = c.mesa_id
    join estook.persona q on q.id = p.marcado_por
   where estook.es_el_sistema()
     and p.local_id = p_local and p.cobro_id is null and p.quitado_en is null
   order by p.marcado_en
$$;

revoke all on function estook.los_cobros_pendientes_de_la_caja(uuid) from public;
grant execute on function estook.los_cobros_pendientes_de_la_caja(uuid) to estook_api;
