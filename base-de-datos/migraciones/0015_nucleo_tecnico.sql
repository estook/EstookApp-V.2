-- 0015 · El nucleo tecnico
--
-- Modulo M2. Las cuatro piezas que hacen que la API sea de fiar:
--
--   1. Idempotencia. El mismo comando tres veces con la misma clave produce un
--      solo efecto. Es el criterio de terminado de M2.
--   2. Bandeja de salida. Los eventos se escriben en la MISMA transaccion que el
--      cambio que los provoca, y se publican despues. Asi no hay eventos de
--      cosas que no pasaron, ni cambios sin su evento.
--   3. Trabajos. Cola en tabla con reintento, porque en Edge Functions no hay
--      proceso largo (decision 0002).
--   4. Version optimista. Dos personas editando la misma ficha: gana quien
--      guarda primero, y al segundo se le ensena que cambio.

-- ── 1 · Idempotencia ──────────────────────────────────────────────────────────

create table estook.clave_de_idempotencia (
  clave           text          primary key,
  -- Huella de lo que se pidio. Si llega la misma clave con otra peticion, es un
  -- error de quien llama, no una repeticion: se avisa en vez de devolver lo de
  -- antes, que seria peor.
  huella          text          not null,
  organizacion_id uuid          not null references estook.organizacion (id) on delete restrict,
  persona_id      uuid              null references estook.persona (id) on delete set null,
  comando         text          not null,
  -- Lo que se respondio la primera vez. Se devuelve tal cual en las repeticiones.
  respuesta       jsonb,
  estado_http     integer       not null,
  creado_en       timestamptz   not null default now(),
  -- Las claves no se guardan para siempre: 24 horas cubren de sobra un reintento
  -- por mala cobertura, que es el caso real.
  caduca_en       timestamptz   not null default now() + interval '24 hours',
  constraint clave_no_vacia check (length(btrim(clave)) > 0)
);

comment on table estook.clave_de_idempotencia is
  'Importar dos veces el mismo dia no descuenta el genero dos veces (principio 9).';

create index idempotencia_caducada on estook.clave_de_idempotencia (caduca_en);

-- ── 2 · Bandeja de salida ─────────────────────────────────────────────────────

create type estook.estado_de_publicacion as enum ('pendiente', 'publicado', 'fallido');

create table estook.bandeja_de_salida (
  id              bigint                        generated always as identity primary key,
  organizacion_id uuid                          not null references estook.organizacion (id) on delete restrict,
  local_id        uuid                              null references estook.local (id) on delete restrict,
  tipo            text                          not null,
  datos           jsonb                         not null,
  correlacion_id  uuid,
  ocurrido_en     timestamptz                   not null default now(),
  estado          estook.estado_de_publicacion  not null default 'pendiente',
  publicado_en    timestamptz,
  intentos        integer                       not null default 0,
  ultimo_fallo    text,
  constraint evento_tipo_no_vacio check (length(btrim(tipo)) > 0)
);

comment on table estook.bandeja_de_salida is
  'Los eventos se escriben en la misma transaccion que el cambio. Si la transaccion se cae, el evento se cae con ella.';

create index bandeja_pendiente on estook.bandeja_de_salida (ocurrido_en) where estado = 'pendiente';

-- ── 3 · Trabajos ──────────────────────────────────────────────────────────────

create type estook.estado_del_trabajo as enum ('pendiente', 'en_curso', 'hecho', 'fallido');

create table estook.trabajo (
  id               bigint                      generated always as identity primary key,
  tipo             text                        not null,
  -- Una cola por clave: dos recalculos del mismo producto se ponen en fila y no
  -- se pisan (Auditoria, hallazgo 9).
  cola             text                        not null,
  datos            jsonb                       not null default '{}'::jsonb,
  organizacion_id  uuid                            null references estook.organizacion (id) on delete restrict,
  correlacion_id   uuid,
  estado           estook.estado_del_trabajo   not null default 'pendiente',
  -- Reintento con espera creciente: 1, 2, 4, 8... minutos.
  intentos         integer                     not null default 0,
  max_intentos     integer                     not null default 5,
  no_antes_de      timestamptz                 not null default now(),
  ultimo_fallo     text,
  creado_en        timestamptz                 not null default now(),
  terminado_en     timestamptz,
  constraint trabajo_tipo_no_vacio check (length(btrim(tipo)) > 0),
  constraint trabajo_intentos_en_rango check (intentos >= 0 and max_intentos > 0)
);

comment on table estook.trabajo is
  'Cola en tabla con reintento. En Edge Functions no hay proceso largo, asi que el reloj lo pone pg_cron (decision 0002).';

create index trabajo_por_hacer on estook.trabajo (no_antes_de, id)
  where estado = 'pendiente';
create index trabajo_por_cola on estook.trabajo (cola, id) where estado in ('pendiente', 'en_curso');

-- ── 4 · Version optimista ─────────────────────────────────────────────────────
--
-- «Dos personas editan la misma ficha: gana quien guarda primero; al segundo se
-- le ensena que cambio y se le ofrece fusionar» (Manifiesto, casos limite).
--
-- Cada fila lleva su numero de version, que sube sola en cada cambio. Quien
-- guarda dice con que version empezo; si ya no es esa, se le para.

create or replace function estook.subir_version()
returns trigger
language plpgsql
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array[
    'organizacion', 'area', 'local', 'persona', 'membresia',
    'recorte_de_permiso', 'traduccion', 'dispositivo', 'politica_de_catalogo'
  ]
  loop
    execute format(
      'alter table estook.%I add column version integer not null default 1', la_tabla
    );
    execute format(
      'create trigger %I before update on estook.%I for each row execute function estook.subir_version()',
      la_tabla || '_sube_version', la_tabla
    );
  end loop;
end
$$;

comment on function estook.subir_version() is
  'Sube el numero de version en cada cambio. Quien guarda con una version vieja recibe «lo cambio otra persona».';

-- ── Permisos ──────────────────────────────────────────────────────────────────

grant select, insert, update, delete on
  estook.clave_de_idempotencia,
  estook.bandeja_de_salida,
  estook.trabajo
to estook_api;

grant usage, select on all sequences in schema estook to estook_api;

alter table estook.clave_de_idempotencia enable row level security;
alter table estook.bandeja_de_salida     enable row level security;
alter table estook.trabajo               enable row level security;

-- Son fontaneria: las escribe y las lee la API, nunca una persona. Sin politica
-- de lectura no las ve nadie, que es lo que se quiere.
create policy idempotencia_de_su_organizacion on estook.clave_de_idempotencia
  for all using (organizacion_id in (select organizacion_id from estook.organizaciones_visibles()))
  with check (organizacion_id in (select organizacion_id from estook.organizaciones_visibles()));

create policy bandeja_de_su_organizacion on estook.bandeja_de_salida
  for all using (organizacion_id in (select organizacion_id from estook.organizaciones_visibles()))
  with check (organizacion_id in (select organizacion_id from estook.organizaciones_visibles()));
