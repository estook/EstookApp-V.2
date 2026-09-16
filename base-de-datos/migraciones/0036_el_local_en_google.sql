-- 0036 · El local en Google (M7, entrega 5 · decisiones 0030 y 0040)
--
-- «Ahora preguntas dónde está el local, pero eso se verá cuando se conecte con
-- Google Business y Places. Y servirá para fichar y ubicar el restaurante.»
--
-- Dos cosas, y ninguna llama a Google desde aquí:
--
--   1. **La ficha de Google del local**, guardada con su fecha. Abrir una pantalla
--      nunca llama a Google: se lee lo guardado (0030).
--   2. **El contador de lo que se pide**, por local y por mes, que es el tope que
--      corta de verdad. Un presupuesto de Google Cloud avisa y sigue cobrando.

-- ── 1 · La ficha ─────────────────────────────────────────────────────────────

alter table estook.local
  add column google_id          text,
  add column google_nombre      text,
  add column google_direccion   text,
  add column google_telefono    text,
  add column google_web         text,
  add column google_mapa        text,
  add column google_valoracion  numeric(2, 1),
  add column google_resenas     integer,
  add column google_horario     jsonb,
  add column google_leido_en    timestamptz,
  -- De dónde sale la posición que usa el fichaje. Nulo en los locales de antes,
  -- que la marcaron a mano sin que se guardara de dónde.
  add column posicion_de        text;

alter table estook.local
  add constraint local_posicion_de_valida check (posicion_de is null or posicion_de in ('a_mano', 'google')),
  add constraint local_valoracion_valida check (
    google_valoracion is null or (google_valoracion >= 0 and google_valoracion <= 5)
  ),
  add constraint local_resenas_no_negativas check (google_resenas is null or google_resenas >= 0),
  add constraint local_horario_es_una_lista check (
    google_horario is null or jsonb_typeof(google_horario) = 'array'
  );

comment on column estook.local.google_id is
  'El identificador del sitio en Google Places. Con él se vuelve a pedir la ficha sin buscar.';
comment on column estook.local.google_leido_en is
  'Cuándo se trajo la ficha de Google. Lo que se enseña es lo guardado, con esta fecha.';
comment on column estook.local.posicion_de is
  'De dónde sale latitud y longitud: a_mano (desde el local) o google (de su ficha). La de a mano manda.';

-- ── 2 · Lo que se le pide a Google, contado ─────────────────────────────────

create table estook.uso_de_google (
  local_id  uuid     not null references estook.local (id) on delete cascade,
  -- El primer día del mes: el tope es mensual, como la factura de Google.
  mes       date     not null,
  que       text     not null,
  cuantas   integer  not null default 0,

  primary key (local_id, mes, que),
  constraint uso_de_google_que check (que in ('busqueda', 'ficha')),
  constraint uso_de_google_mes_es_dia_uno check (extract(day from mes) = 1),
  constraint uso_de_google_no_negativo check (cuantas >= 0)
);

comment on table estook.uso_de_google is
  'Cuántas búsquedas y fichas se le han pedido a Google por local y mes. Es el tope que corta (0030, 0040).';

alter table estook.uso_de_google enable row level security;

-- Lo cuenta quien puede cambiar la ficha del local, que es quien puede buscarlo.
create policy uso_de_google_lectura on estook.uso_de_google
  for select using (estook.puede_ver('app.ajustes', local_id));

create policy uso_de_google_escritura on estook.uso_de_google
  for all using (estook.puede_editar('app.ajustes', local_id))
  with check (estook.puede_editar('app.ajustes', local_id));

revoke all on estook.uso_de_google from public;
grant select, insert, update on estook.uso_de_google to estook_api;
