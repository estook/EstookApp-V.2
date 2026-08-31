-- 0006 · La auditoria, que solo sabe anadir
--
-- Modulo M1. Regla critica del modulo, literal: «la auditoria rechaza UPDATE por
-- permisos de base de datos». No por un aviso en el codigo: por permisos. Aunque
-- alguien se equivoque escribiendo un `update`, la base de datos dice que no.
--
-- Se audita todo lo que toca dinero, permisos o registros legales.

-- ── El rol con el que se conecta la API ───────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'estook_api') then
    create role estook_api nologin;
  end if;
end
$$;

comment on schema estook is
  'El esquema de Estook. La API se conecta como estook_api, que no es el dueno, para que las politicas de seguridad le apliquen.';

grant usage on schema estook to estook_api;

-- Las tablas de dominio: lectura y escritura, siempre bajo las politicas RLS.
grant select, insert, update, delete on
  estook.organizacion,
  estook.area,
  estook.local,
  estook.persona,
  estook.membresia,
  estook.recorte_de_permiso
to estook_api;

-- Las tablas de catalogo son de solo lectura: los doce roles y los permisos no
-- se tocan desde la aplicacion, se cambian con una migracion.
grant select on estook.rol, estook.permiso, estook.permiso_de_rol to estook_api;

-- Lo que se cree de aqui en adelante nace con los mismos permisos.
alter default privileges in schema estook
  grant select, insert, update, delete on tables to estook_api;
alter default privileges in schema estook
  grant usage, select on sequences to estook_api;

-- ── La tabla ──────────────────────────────────────────────────────────────────

create table estook.auditoria (
  id              bigint       generated always as identity primary key,
  ocurrido_en     timestamptz  not null default now(),
  -- Siempre se sabe de quien es la linea, aunque el local sea nulo.
  organizacion_id uuid         not null references estook.organizacion (id) on delete restrict,
  local_id        uuid             null references estook.local (id) on delete restrict,
  -- Quien lo hizo. Nulo cuando lo hizo un trabajo automatico.
  persona_id      uuid             null references estook.persona (id) on delete restrict,
  -- El hilo que une el toque en el movil con lo que paso en el servidor (M0).
  correlacion_id  uuid,
  -- Que paso: 'crear', 'modificar', 'anular', 'invitar', 'revocar'...
  accion          text         not null,
  -- Sobre que: el nombre de la entidad y su identificador, como texto, porque
  -- la auditoria sobrevive a que la fila original se archive.
  entidad         text         not null,
  entidad_id      text,
  antes           jsonb,
  despues         jsonb,
  -- Reabrir un periodo exige motivo escrito, por ejemplo.
  motivo          text,
  constraint auditoria_accion_no_vacia check (length(btrim(accion)) > 0),
  constraint auditoria_entidad_no_vacia check (length(btrim(entidad)) > 0)
);

comment on table estook.auditoria is
  'Solo se anade. Ni se modifica ni se borra, y lo impide la base de datos, no el codigo.';

create index auditoria_por_organizacion on estook.auditoria (organizacion_id, ocurrido_en desc);
create index auditoria_por_local on estook.auditoria (local_id, ocurrido_en desc) where local_id is not null;
create index auditoria_por_persona on estook.auditoria (persona_id, ocurrido_en desc) where persona_id is not null;
create index auditoria_por_entidad on estook.auditoria (entidad, entidad_id);
create index auditoria_por_correlacion on estook.auditoria (correlacion_id) where correlacion_id is not null;

-- ── Primera barrera · permisos ────────────────────────────────────────────────
-- Esta es la que pide la regla critica de M1.

-- Ojo con el orden: la tabla acaba de nacer despues del `alter default
-- privileges` de arriba, asi que ya trae concedido update y delete. Hay que
-- quitarselos expresamente antes de conceder lo que si toca.
revoke all on estook.auditoria from public;
revoke all on estook.auditoria from estook_api;
grant select, insert on estook.auditoria to estook_api;
-- Deliberadamente NO se concede update ni delete. A nadie.

-- La identidad de la tabla tambien necesita permiso para poder insertar.
grant usage, select on all sequences in schema estook to estook_api;

-- ── Segunda barrera · un guardian ─────────────────────────────────────────────
-- Los permisos no aplican al dueno de la tabla ni a un superusuario. Esta regla
-- si, y es la que protege de un `update` lanzado desde una migracion distraida.

create or replace function estook.auditoria_solo_se_anade()
returns trigger
language plpgsql
as $$
begin
  raise exception 'La auditoria solo se anade: no se modifica ni se borra. Si algo esta mal, se anade una linea que lo corrija.'
    using errcode = '42501';
end;
$$;

create trigger auditoria_sin_modificar
  before update on estook.auditoria
  for each statement execute function estook.auditoria_solo_se_anade();

create trigger auditoria_sin_borrar
  before delete on estook.auditoria
  for each statement execute function estook.auditoria_solo_se_anade();

-- ── Como se escribe una linea ─────────────────────────────────────────────────

create or replace function estook.anotar(
  p_organizacion uuid,
  p_accion text,
  p_entidad text,
  p_entidad_id text default null,
  p_local uuid default null,
  p_antes jsonb default null,
  p_despues jsonb default null,
  p_motivo text default null
)
returns bigint
language sql
volatile
as $$
  insert into estook.auditoria (
    organizacion_id, local_id, persona_id, correlacion_id,
    accion, entidad, entidad_id, antes, despues, motivo
  )
  values (
    p_organizacion,
    p_local,
    estook.persona_actual(),
    nullif(current_setting('estook.correlacion_id', true), '')::uuid,
    p_accion, p_entidad, p_entidad_id, p_antes, p_despues, p_motivo
  )
  returning id
$$;

comment on function estook.anotar(uuid, text, text, text, uuid, jsonb, jsonb, text) is
  'Anade una linea a la auditoria tomando la persona y la correlacion de la conexion.';
