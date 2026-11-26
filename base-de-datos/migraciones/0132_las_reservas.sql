-- 0132 · La Ampliación 5 · 1 · Las reservas: el motor y la sala (decisión 0153, sección 6; Plan, M32)
--
-- Richi cambió el 24-nov lo que decía el Manifiesto («no gestiona reservas»): Estook TPV reserva
-- **sobre el mismo plano y las mismas mesas que cobran**. Apagado de fábrica; se enciende en Ajustes
-- del TPV › Reservas. Es de Pro, como todo el TPV.
--
--   A · `ajuste_de_reservas`: encendidas o no, los servicios (comida, cena), cuánto dura una mesa
--       según los que son, el tope de comensales por cuarto de hora y a los cuántos minutos de
--       retraso se libera la mesa.
--   B · `mesas_que_se_juntan`: solo se juntan las que el local marca en el editor de la sala.
--   C · `reserva` y `reserva_de_mesa`: cada reserva, con su id nacido en el aparato (repetir no
--       duplica), y las mesas que ocupa en su tramo. **Nunca dos reservas en la misma mesa y tramo:
--       lo impide la base** (una restricción de exclusión), no la pantalla.
--   D · `cuenta.reserva_id`: «Sentar» abre la mesa unida a su reserva, y su ticket queda unido.

create extension if not exists btree_gist;

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los ajustes de cada local
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.ajuste_de_reservas (
  local_id         uuid         primary key references estook.local (id) on delete cascade,
  encendidas       boolean      not null default false,
  -- [{"nombre": "Cena", "desde": "20:00", "hasta": "23:30"}]: la última hora a la que se reserva.
  servicios        jsonb        not null default
    '[{"nombre": "Comida", "desde": "13:00", "hasta": "15:30"}, {"nombre": "Cena", "desde": "20:00", "hasta": "22:30"}]',
  -- Minutos que dura una mesa según los que son: de 1 a 2, de 3 a 4, de 5 a 6, y 7 o más.
  duraciones       smallint[]   not null default '{90,105,120,150}',
  -- Comensales que pueden empezar en el mismo cuarto de hora (para no hundir la cocina). Nulo: sin tope.
  tope_por_cuarto  smallint,
  -- A los cuántos minutos de retraso se da la mesa por libre.
  liberar_tras     smallint     not null default 15,
  version          integer      not null default 1,
  actualizado_en   timestamptz  not null default now(),

  constraint ajuste_de_reservas_duraciones check (
    cardinality(duraciones) = 4 and 30 <= all (duraciones) and 360 >= all (duraciones)
  ),
  constraint ajuste_de_reservas_tope check (tope_por_cuarto is null or tope_por_cuarto between 1 and 500),
  constraint ajuste_de_reservas_liberar check (liberar_tras between 5 and 120),
  constraint ajuste_de_reservas_servicios check (jsonb_typeof(servicios) = 'array' and jsonb_array_length(servicios) <= 4)
);

comment on table estook.ajuste_de_reservas is
  'Las reservas de cada local (0153, M32): si están encendidas, sus servicios, cuánto dura una mesa, el tope por cuarto de hora y cuándo se libera la mesa de quien no llega.';

create trigger ajuste_de_reservas_sube_version before update on estook.ajuste_de_reservas
  for each row execute function estook.subir_version();
create trigger ajuste_de_reservas_actualizado before update on estook.ajuste_de_reservas
  for each row execute function estook.marcar_actualizado();

alter table estook.ajuste_de_reservas enable row level security;

create policy ajuste_de_reservas_lectura on estook.ajuste_de_reservas
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy ajuste_de_reservas_escritura on estook.ajuste_de_reservas
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));

revoke all on estook.ajuste_de_reservas from public;
grant select, insert, update on estook.ajuste_de_reservas to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las mesas que se juntan
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.mesas_que_se_juntan (
  local_id  uuid  not null references estook.local (id) on delete cascade,
  mesa_a    uuid  not null references estook.mesa (id) on delete cascade,
  mesa_b    uuid  not null references estook.mesa (id) on delete cascade,
  primary key (mesa_a, mesa_b),
  -- Una pareja se guarda una vez: la de id menor, primero.
  constraint mesas_que_se_juntan_en_orden check (mesa_a < mesa_b)
);

comment on table estook.mesas_que_se_juntan is
  'Las mesas que se pueden juntar para una reserva grande (0153): solo las que el local marca en el editor de la sala.';

alter table estook.mesas_que_se_juntan enable row level security;

create policy mesas_que_se_juntan_lectura on estook.mesas_que_se_juntan
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy mesas_que_se_juntan_escritura on estook.mesas_que_se_juntan
  for all using (estook.puede_editar('app.ajustes', local_id))
  with check (
    estook.puede_editar('app.ajustes', local_id)
    and exists (select 1 from estook.mesa m where m.id = mesa_a and m.local_id = mesas_que_se_juntan.local_id)
    and exists (select 1 from estook.mesa m where m.id = mesa_b and m.local_id = mesas_que_se_juntan.local_id)
  );

revoke all on estook.mesas_que_se_juntan from public;
grant select, insert, delete on estook.mesas_que_se_juntan to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Las reservas
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.reserva (
  -- Nace en el aparato (o en la web): tocar dos veces o perder la red no duplica.
  id               uuid         primary key,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  dia              date         not null,
  hora             time         not null,
  empieza          timestamptz  not null,
  acaba            timestamptz  not null,
  comensales       smallint     not null,
  nombre           text         not null,
  telefono         text         not null,
  correo           text,
  nota             text,
  origen           text         not null default 'tpv',
  estado           text         not null default 'reservada',
  cuenta_id        uuid         references estook.cuenta (id) on delete set null,
  creada_por       uuid         references estook.persona (id) on delete set null,
  creada_en        timestamptz  not null default now(),
  sentada_en       timestamptz,
  cancelada_en     timestamptz,
  version          integer      not null default 1,

  constraint reserva_tramo check (acaba > empieza),
  constraint reserva_comensales check (comensales between 1 and 99),
  constraint reserva_nombre check (char_length(btrim(nombre)) between 1 and 60),
  constraint reserva_telefono check (char_length(regexp_replace(telefono, '\D', '', 'g')) between 6 and 15),
  constraint reserva_correo check (correo is null or correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint reserva_nota check (nota is null or char_length(nota) <= 200),
  constraint reserva_origen check (origen in ('tpv', 'web')),
  constraint reserva_estado check (estado in ('reservada', 'sentada', 'cancelada', 'no_vino'))
);

comment on table estook.reserva is
  'Las reservas del local (0153, M32), sobre las mismas mesas que cobran. Se cancelan o se marcan «no vino»; nunca se borran.';

create index reserva_por_dia on estook.reserva (local_id, dia);
create index reserva_por_telefono on estook.reserva (local_id, telefono);

create trigger reserva_sube_version before update on estook.reserva
  for each row execute function estook.subir_version();

create table estook.reserva_de_mesa (
  reserva_id  uuid       not null references estook.reserva (id) on delete cascade,
  mesa_id     uuid       not null references estook.mesa (id) on delete cascade,
  local_id    uuid       not null references estook.local (id) on delete cascade,
  tramo       tstzrange  not null,
  primary key (reserva_id, mesa_id),
  -- **La garantía**: dos reservas no se pisan en la misma mesa. Lo comprueba la base al guardar,
  -- también si dos aparatos reservan a la vez: entra una y la otra recibe el fallo.
  constraint reserva_de_mesa_sin_pisarse exclude using gist (mesa_id with =, tramo with &&)
);

comment on table estook.reserva_de_mesa is
  'Las mesas que ocupa cada reserva en su tramo. Al cancelarla, sus filas se quitan y la mesa queda libre.';

alter table estook.reserva enable row level security;
alter table estook.reserva_de_mesa enable row level security;

-- Las ve quien lleva la sala (toma nota) y quien lleva los ajustes del TPV; las pone la sala.
create policy reserva_lectura on estook.reserva
  for select using (
    estook.puede_ver('accion.tomar_nota', local_id)
    or estook.puede_ver('accion.ajustes_del_tpv', local_id)
  );
create policy reserva_escritura on estook.reserva
  for all using (estook.puede_editar('accion.tomar_nota', local_id))
  with check (estook.puede_editar('accion.tomar_nota', local_id));

create policy reserva_de_mesa_lectura on estook.reserva_de_mesa
  for select using (
    estook.puede_ver('accion.tomar_nota', local_id)
    or estook.puede_ver('accion.ajustes_del_tpv', local_id)
  );
create policy reserva_de_mesa_escritura on estook.reserva_de_mesa
  for all using (estook.puede_editar('accion.tomar_nota', local_id))
  with check (
    estook.puede_editar('accion.tomar_nota', local_id)
    and exists (select 1 from estook.mesa m where m.id = mesa_id and m.local_id = reserva_de_mesa.local_id)
    and exists (select 1 from estook.reserva r where r.id = reserva_id and r.local_id = reserva_de_mesa.local_id)
  );

revoke all on estook.reserva from public;
revoke all on estook.reserva_de_mesa from public;
grant select, insert, update on estook.reserva to estook_api;
grant select, insert, delete on estook.reserva_de_mesa to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · La cuenta, unida a su reserva
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.cuenta add column reserva_id uuid references estook.reserva (id) on delete set null;

comment on column estook.cuenta.reserva_id is
  'La reserva que se sentó en esta mesa (0153): «Sentar» la une, y su ticket queda unido a ella.';

create unique index cuenta_una_por_reserva on estook.cuenta (reserva_id) where reserva_id is not null;

-- Cuando la mesa de una reserva se cobra, se anula o se junta con otra, **sus mesas quedan libres para
-- otras reservas**: el tramo previsto ya no hace falta. Con privilegio, porque quien cobra en la caja no
-- tiene por qué llevar las reservas; solo toca las filas de esa reserva.
create function estook.soltar_las_mesas_de_la_reserva()
returns trigger
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if new.reserva_id is not null
     and (new.liberada_en is not null or new.anulada_en is not null)
     and old.liberada_en is null and old.anulada_en is null then
    delete from estook.reserva_de_mesa where reserva_id = new.reserva_id;
  end if;
  return new;
end;
$$;

comment on function estook.soltar_las_mesas_de_la_reserva() is
  'Al cobrar, anular o juntar la cuenta de una reserva sentada, suelta sus mesas para otras reservas (0153).';

revoke all on function estook.soltar_las_mesas_de_la_reserva() from public;
grant execute on function estook.soltar_las_mesas_de_la_reserva() to estook_api;

create trigger cuenta_suelta_las_mesas_de_su_reserva
  after update of liberada_en, anulada_en on estook.cuenta
  for each row execute function estook.soltar_las_mesas_de_la_reserva();
