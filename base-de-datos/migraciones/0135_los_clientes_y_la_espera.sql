-- 0135 · La Ampliación 5 · 3 · Los clientes, la lista de espera y los que no vienen (decisión 0153,
-- secciones 6 y 21; maqueta, pestaña 5, «Los clientes, y los que no vienen»)
--
--   A · `cliente_del_local`: cada reserva crea o encuentra a su cliente **por su teléfono** (sus nueve últimas
--       cifras, como la web de la 5 · 2). **Los clientes son de cada local**: otro local, aunque sea de
--       la misma empresa, no los ve nunca. Lo que se apunta a mano: VIP, sus alergias (**solo con su
--       sí**: son datos de salud, RGPD art. 9; Richi, 26-nov) y una nota corta («trona»). Lo demás
--       (visitas, gasto medio, lo que suele pedir, los que no vinieron) se cuenta al leerlo.
--   B · `reserva.cliente_id`, que pone la base al guardar la reserva, venga del TPV o de la web.
--   C · `espera`: «En espera», la lista de quien llega sin reservar y espera mesa.
--   D · `las_reservas_grandes`: las de 12 o más, para Calendario › Equipo (que cocina lo sepa),
--       sin nombre ni teléfono: quien ve el calendario no tiene por qué llevar la sala (desde la
--       0119 toman nota todos, pero el gerente se lo puede quitar a cualquiera).

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los clientes
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.cliente_del_local (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  -- Las nueve últimas cifras: «+34 600 111 222» y «600111222» son el mismo cliente.
  cifras           text         not null,
  -- El teléfono y el nombre de su última reserva.
  telefono         text         not null,
  nombre           text         not null,
  vip              boolean      not null default false,
  -- De los catorce oficiales. Solo con su sí (lo marca la sala después de preguntarle).
  alergenos        text[]       not null default '{}',
  nota             text,
  creado_en        timestamptz  not null default now(),
  actualizado_en   timestamptz  not null default now(),
  version          integer      not null default 1,

  constraint cliente_del_local_cifras check (cifras ~ '^[0-9]{6,9}$'),
  constraint cliente_del_local_nombre check (char_length(btrim(nombre)) between 1 and 60),
  constraint cliente_del_local_nota check (nota is null or char_length(btrim(nota)) between 1 and 80),
  unique (local_id, cifras)
);

comment on table estook.cliente_del_local is
  'Los clientes de cada local (0153, M32): los crea la base al reservar, por su teléfono. Otro local no los ve nunca. Visitas, gasto y lo que suele pedir se cuentan al leerlos.';
comment on column estook.cliente_del_local.alergenos is
  'Sus alergias guardadas, solo con su sí (datos de salud, RGPD art. 9): al sentarlo pasan solas a la mesa.';

create trigger cliente_del_local_sube_version before update on estook.cliente_del_local
  for each row execute function estook.subir_version();
create trigger cliente_del_local_actualizado before update on estook.cliente_del_local
  for each row execute function estook.marcar_actualizado();
create trigger cliente_del_local_con_alergenos_conocidos before insert or update of alergenos on estook.cliente_del_local
  for each row execute function estook.alergenos_conocidos();

alter table estook.cliente_del_local enable row level security;

-- Los ve quien ve las reservas: la sala y quien lleva los Ajustes del TPV, **de su local**.
create policy cliente_del_local_lectura on estook.cliente_del_local
  for select using (
    estook.puede_ver('accion.tomar_nota', local_id)
    or estook.puede_ver('accion.ajustes_del_tpv', local_id)
  );
-- VIP, alergias y nota los cambia la sala.
create policy cliente_del_local_cambio on estook.cliente_del_local
  for update using (estook.puede_editar('accion.tomar_nota', local_id))
  with check (estook.puede_editar('accion.tomar_nota', local_id));
-- Borrar a un cliente (el derecho de supresión) es de quien lleva los Ajustes del TPV.
create policy cliente_del_local_baja on estook.cliente_del_local
  for delete using (estook.puede_editar('accion.ajustes_del_tpv', local_id));
-- **No se guarda a nadie para siempre** (RGPD, art. 5: lo mínimo y el tiempo justo): el reloj borra al
-- cliente que lleva dos años sin reservar. Sus reservas viejas se quedan, sin cliente.
create policy cliente_del_local_lo_lee_el_sistema on estook.cliente_del_local
  for select using (estook.es_el_sistema());
create policy cliente_del_local_lo_borra_el_sistema on estook.cliente_del_local
  for delete using (estook.es_el_sistema());

revoke all on estook.cliente_del_local from public;
grant select, update, delete on estook.cliente_del_local to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Cada reserva, con su cliente
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.reserva
  add column cliente_id uuid references estook.cliente_del_local (id) on delete set null;

comment on column estook.reserva.cliente_id is
  'El cliente de la reserva, por su teléfono (0153). Lo pone la base al guardarla, desde el TPV o desde la web.';

create index reserva_por_cliente on estook.reserva (cliente_id) where cliente_id is not null;

-- Los clientes de las reservas que ya había: uno por local y teléfono, con el nombre de la última.
insert into estook.cliente_del_local (organizacion_id, local_id, cifras, telefono, nombre)
select distinct on (r.local_id, right(regexp_replace(r.telefono, '\D', '', 'g'), 9))
       r.organizacion_id, r.local_id, right(regexp_replace(r.telefono, '\D', '', 'g'), 9),
       r.telefono, r.nombre
  from estook.reserva r
 order by r.local_id, right(regexp_replace(r.telefono, '\D', '', 'g'), 9), r.creada_en desc;

update estook.reserva r
   set cliente_id = c.id
  from estook.cliente_del_local c
 where c.local_id = r.local_id
   and c.cifras = right(regexp_replace(r.telefono, '\D', '', 'g'), 9);

-- **Crea o encuentra al cliente** al guardar la reserva. Con privilegio, porque la web no tiene sesión y
-- quien reserva en el TPV no crea clientes a mano: solo toca el cliente de ese local y ese teléfono.
create function estook.el_cliente_de_la_reserva()
returns trigger
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  v_id uuid;
begin
  -- Se acaba de borrar a su cliente (el derecho de supresión): la reserva se queda sin él.
  if tg_op = 'UPDATE' and new.cliente_id is null and old.cliente_id is not null then
    return new;
  end if;
  -- Cambiar la hora o cuántos son con el mismo teléfono no cambia de cliente.
  if tg_op = 'UPDATE' and new.telefono = old.telefono and new.cliente_id is not null then
    return new;
  end if;
  insert into estook.cliente_del_local (organizacion_id, local_id, cifras, telefono, nombre)
  values (new.organizacion_id, new.local_id,
          right(regexp_replace(new.telefono, '\D', '', 'g'), 9), new.telefono, new.nombre)
  on conflict (local_id, cifras) do update
     set telefono = excluded.telefono, nombre = excluded.nombre
  returning id into v_id;
  new.cliente_id := v_id;
  return new;
end;
$$;

comment on function estook.el_cliente_de_la_reserva() is
  'Al guardar una reserva, crea o encuentra a su cliente en ese local por las nueve últimas cifras del teléfono (0153).';

revoke all on function estook.el_cliente_de_la_reserva() from public;
grant execute on function estook.el_cliente_de_la_reserva() to estook_api;

create trigger reserva_con_su_cliente
  before insert or update of telefono on estook.reserva
  for each row execute function estook.el_cliente_de_la_reserva();

-- ═══════════════════════════════════════════════════════════════════════════
-- C · «En espera»: quien llega sin reservar
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.espera (
  -- Nace en el aparato: tocar dos veces no apunta dos veces.
  id           uuid         primary key,
  local_id     uuid         not null references estook.local (id) on delete cascade,
  nombre       text         not null,
  comensales   smallint     not null,
  -- Por si se va a dar una vuelta y hay que llamarle. No hace falta.
  telefono     text,
  nota         text,
  llego_en     timestamptz  not null default now(),
  estado       text         not null default 'esperando',
  cuenta_id    uuid         references estook.cuenta (id) on delete set null,
  resuelta_en  timestamptz,
  creada_por   uuid         references estook.persona (id) on delete set null,
  version      integer      not null default 1,

  constraint espera_nombre check (char_length(btrim(nombre)) between 1 and 40),
  constraint espera_comensales check (comensales between 1 and 99),
  constraint espera_telefono check (
    telefono is null or char_length(regexp_replace(telefono, '\D', '', 'g')) between 6 and 15
  ),
  constraint espera_nota check (nota is null or char_length(nota) <= 120),
  constraint espera_estado check (estado in ('esperando', 'sentado', 'se_fue')),
  constraint espera_resuelta check ((estado = 'esperando') = (resuelta_en is null))
);

comment on table estook.espera is
  'La lista de espera (0153): quien llega sin reservar y espera mesa. Se sienta o se va; el reloj la borra a los dos días.';

create index espera_por_local on estook.espera (local_id, llego_en);

create trigger espera_sube_version before update on estook.espera
  for each row execute function estook.subir_version();

alter table estook.espera enable row level security;

create policy espera_lectura on estook.espera
  for select using (estook.puede_ver('accion.tomar_nota', local_id));
create policy espera_escritura on estook.espera
  for all using (estook.puede_editar('accion.tomar_nota', local_id))
  with check (estook.puede_editar('accion.tomar_nota', local_id));
-- El reloj borra lo de hace dos días: es un nombre y quizá un teléfono, y ya no sirve.
create policy espera_la_lee_el_sistema on estook.espera
  for select using (estook.es_el_sistema());
create policy espera_la_borra_el_sistema on estook.espera
  for delete using (estook.es_el_sistema());

revoke all on estook.espera from public;
grant select, insert, update, delete on estook.espera to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Las reservas grandes, en Calendario › Equipo
-- ═══════════════════════════════════════════════════════════════════════════

-- Lo ve todo el que ve el calendario, también quien no lleva la sala: por eso con privilegio, y por eso
-- **solo el día, la hora y cuántos**, sin nombre ni teléfono.
create function estook.las_reservas_grandes(p_local uuid, p_desde date, p_hasta date)
returns table (id uuid, dia date, hora time, comensales smallint)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select r.id, r.dia, r.hora, r.comensales
    from estook.reserva r
    join estook.ajuste_de_reservas a on a.local_id = r.local_id and a.encendidas
   where r.local_id = p_local
     and r.dia between p_desde and p_hasta
     and r.estado in ('reservada', 'sentada')
     and r.comensales >= 12
     and estook.puede_ver('app.calendario', p_local)
   order by r.dia, r.hora
   limit 200
$$;

comment on function estook.las_reservas_grandes(uuid, date, date) is
  'Las reservas de 12 o más de un local entre dos fechas, sin nombre ni teléfono: para Calendario › Equipo, que ve también quien no lleva la sala (0153).';

revoke all on function estook.las_reservas_grandes(uuid, date, date) from public;
grant execute on function estook.las_reservas_grandes(uuid, date, date) to estook_api;
