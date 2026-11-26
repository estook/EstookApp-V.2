-- 0133 · La Ampliación 5 · 2 · La web de reservas y los correos (decisión 0153, sección 6; Plan, M32)
--
-- `estook.com/reservar/<local>`, para su web, Instagram, Google y WhatsApp: solo ofrece horas con mesa
-- de verdad. **Nombre y teléfono, siempre**; el correo, si el local avisa por correo. Al reservar, su
-- reserva con **un código de 4 cifras**; con su teléfono y el código, «Ya tengo reserva» la confirma o la
-- cancela (Richi, 24-nov). Y dos opciones del local, **apagadas de fábrica**: «Avisar al cliente por
-- correo» y «Pedir que confirmen» (si no confirma X minutos antes, se cancela sola).
--
--   A · Los ajustes nuevos: avisar por correo, pedir que confirmen y cuántos minutos antes.
--   B · `mesa.por_internet`: qué mesas salen en la web (la barra, para quien llega).
--   C · La reserva: su código, cuándo la confirmó, si quiere ofertas y quién la canceló.
--   D · `aviso_si_se_libera`: «Avísame si se libera», cuando un día está lleno.
--   E · `intento_en_la_web_de_reservas`: los intentos de cada dirección, para frenar a quien pruebe
--       códigos o llene el local de reservas falsas.
--   F · Lo que lee y escribe el sistema: la web no tiene sesión; entra como el sistema, solo dentro de
--       la transacción de cada petición, y solo para lo de reservar.
--   G · El reloj: cancelar la que no se confirmó a tiempo y el recordatorio del día antes.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los ajustes
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.ajuste_de_reservas
  add column avisar_por_correo      boolean   not null default false,
  add column pedir_que_confirmen    boolean   not null default false,
  add column minutos_para_confirmar smallint  not null default 30,
  add constraint ajuste_de_reservas_minutos_para_confirmar check (minutos_para_confirmar between 15 and 60);

comment on column estook.ajuste_de_reservas.avisar_por_correo is
  'Al cliente que reserva: el correo con su reserva, el recordatorio del día antes y «Avísame si se libera» (0153). Apagado de fábrica.';
comment on column estook.ajuste_de_reservas.pedir_que_confirmen is
  'Si no confirma `minutos_para_confirmar` antes de la hora, la reserva se cancela sola y la mesa queda libre (0153). Apagado de fábrica.';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las mesas que salen por internet
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.mesa add column por_internet boolean not null default true;

comment on column estook.mesa.por_internet is
  'Si se ofrece en la web de reservas (0153). La barra o la mesa del rincón se quedan para quien llega o para el teléfono.';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · La reserva
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.reserva
  -- Las de antes, con uno cualquiera: no se van a buscar en la web, pero así nadie queda sin código.
  add column codigo         text         not null default lpad((floor(random() * 10000))::int::text, 4, '0'),
  add column confirmada_en  timestamptz,
  add column ofertas        boolean      not null default false,
  add column cancelada_por  text,
  add constraint reserva_codigo check (codigo ~ '^[0-9]{4}$'),
  add constraint reserva_cancelada_por check (
    cancelada_por is null or cancelada_por in ('local', 'cliente', 'sin_confirmar')
  );

comment on column estook.reserva.codigo is
  'Las 4 cifras con las que el cliente, con su teléfono, vuelve a su reserva en la web (0153).';
comment on column estook.reserva.ofertas is
  'Si marcó recibir ofertas: casilla aparte y sin marcar, como pide la ley. Sin ella, solo lo de su reserva.';

-- ═══════════════════════════════════════════════════════════════════════════
-- D · «Avísame si se libera»
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.aviso_si_se_libera (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  dia              date         not null,
  comensales       smallint     not null,
  nombre           text         not null,
  telefono         text         not null,
  correo           text         not null,
  creado_en        timestamptz  not null default now(),
  -- Se avisa una vez: cuando se libera una mesa ese día.
  avisado_en       timestamptz,

  constraint aviso_si_se_libera_comensales check (comensales between 1 and 99),
  constraint aviso_si_se_libera_nombre check (char_length(btrim(nombre)) between 1 and 60),
  constraint aviso_si_se_libera_correo check (correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

comment on table estook.aviso_si_se_libera is
  'Quien pidió que se le avise si se libera una mesa un día que estaba lleno (0153). Solo con «Avisar al cliente por correo».';

create index aviso_si_se_libera_por_dia on estook.aviso_si_se_libera (local_id, dia) where avisado_en is null;

alter table estook.aviso_si_se_libera enable row level security;

-- Lo ve quien lleva la sala; lo apunta y lo avisa el sistema (la web no tiene sesión).
create policy aviso_si_se_libera_lectura on estook.aviso_si_se_libera
  for select using (estook.puede_ver('accion.tomar_nota', local_id) or estook.es_el_sistema());
create policy aviso_si_se_libera_el_sistema on estook.aviso_si_se_libera
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.aviso_si_se_libera from public;
grant select, insert, update on estook.aviso_si_se_libera to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Los intentos de cada dirección
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.intento_en_la_web_de_reservas (
  id         bigserial    primary key,
  direccion  text         not null,
  clase      text         not null,
  en         timestamptz  not null default now(),
  constraint intento_en_la_web_de_reservas_clase check (clase in ('reservar', 'buscar', 'avisame'))
);

comment on table estook.intento_en_la_web_de_reservas is
  'Lo que pide cada dirección en la web de reservas, para frenar a quien pruebe códigos o reserve sin parar (0153). Se borra a la semana.';

create index intento_en_la_web_de_reservas_por_direccion
  on estook.intento_en_la_web_de_reservas (direccion, clase, en);

alter table estook.intento_en_la_web_de_reservas enable row level security;

create policy intento_en_la_web_de_reservas_el_sistema on estook.intento_en_la_web_de_reservas
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.intento_en_la_web_de_reservas from public;
grant select, insert, delete on estook.intento_en_la_web_de_reservas to estook_api;
grant usage, select on sequence estook.intento_en_la_web_de_reservas_id_seq to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- F · Lo que lee y escribe el sistema, para la web
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La web de reservas no tiene sesión: cada petición entra como el sistema **solo dentro de su
-- transacción** (`set_config('estook.sistema', 'si', true)`), como «Pide tu factura» (0141). Necesita
-- leer el local, sus ajustes y sus mesas, lo ocupado (las reservas y las mesas abiertas hoy), y apuntar
-- y cambiar reservas. Nada de esto se enseña entero: la API devuelve solo las horas libres y la reserva
-- de quien da su teléfono y su código.

create policy local_lo_lee_el_sistema on estook.local
  for select using (estook.es_el_sistema());
create policy ajuste_de_reservas_lo_lee_el_sistema on estook.ajuste_de_reservas
  for select using (estook.es_el_sistema());
create policy mesa_la_lee_el_sistema on estook.mesa
  for select using (estook.es_el_sistema());
create policy mesas_que_se_juntan_lo_lee_el_sistema on estook.mesas_que_se_juntan
  for select using (estook.es_el_sistema());
create policy cuenta_la_lee_el_sistema on estook.cuenta
  for select using (estook.es_el_sistema());
create policy reserva_la_lleva_el_sistema on estook.reserva
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy reserva_de_mesa_la_lleva_el_sistema on estook.reserva_de_mesa
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

-- ═══════════════════════════════════════════════════════════════════════════
-- G · El reloj
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Al reservar en la web se apunta: si el local pide que confirmen, **cancelarla si a esa hora no la ha
-- confirmado**; y si avisa por correo, **el recordatorio del día antes**. Al llegar su hora, el reloj
-- vuelve a mirar si sigue haciendo falta.

alter table estook.al_movil_programado drop constraint programado_tipo_conocido;
alter table estook.al_movil_programado add constraint programado_tipo_conocido check (
  tipo in (
    'turno.entras', 'lote.caduca', 'pedido.no_llega', 'chat.confirmar',
    'calendario.recordatorio', 'calendario.nota',
    'reserva.sin_confirmar', 'reserva.recordatorio'
  )
);
