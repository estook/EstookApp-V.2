-- 0001 · Cimientos
--
-- Modulo M0. Crea el esquema propio y los tres contenedores de alcance que las
-- semillas de M0 necesitan para existir: organizacion, area y local.
--
-- Lo que NO hay aqui, y es a proposito: usuarios, membresias, roles, la funcion
-- locales_visibles, las politicas RLS de verdad y la auditoria. Todo eso es M1.
-- Aqui esta solo lo que sin ello haria imposible cargar las dos semillas.
--
-- Los cuatro niveles de alcance del Manifiesto son organizacion, area, local y
-- persona. Esta migracion crea los tres primeros. La persona llega con M1, que es
-- donde vive la autenticacion.

create schema if not exists estook;

-- Sello de modificacion, una sola vez y para todas las tablas (regla 6).
create or replace function estook.marcar_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

-- ORGANIZACION · la empresa que contrata. De 1 a 40 locales.
create table estook.organizacion (
  id              uuid        primary key default gen_random_uuid(),
  codigo          text        not null unique,
  nombre          text        not null,
  -- Un local independiente no ve nunca la palabra "area". Se decide aqui, una vez.
  usa_areas       boolean     not null default false,
  es_ejemplo      boolean     not null default false,
  activa          boolean     not null default true,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint organizacion_codigo_con_forma check (codigo ~ '^[a-z0-9-]{2,48}$'),
  constraint organizacion_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

comment on table estook.organizacion is
  'Nivel 1 de alcance. La empresa que contrata Estook.';
comment on column estook.organizacion.es_ejemplo is
  'Datos de ejemplo o de demostracion. No cuentan para nada y se borran con un boton (M5).';

-- AREA · agrupacion opcional dentro de una organizacion.
create table estook.area (
  id               uuid        primary key default gen_random_uuid(),
  organizacion_id  uuid        not null references estook.organizacion (id) on delete restrict,
  codigo           text        not null,
  nombre           text        not null,
  es_ejemplo       boolean     not null default false,
  activa           boolean     not null default true,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  constraint area_codigo_con_forma check (codigo ~ '^[a-z0-9-]{2,48}$'),
  constraint area_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint area_codigo_unico_en_su_organizacion unique (organizacion_id, codigo)
);

comment on table estook.area is
  'Nivel 2 de alcance, opcional. "Zona Norte", "Madrid". Solo existe si la organizacion usa areas.';

-- LOCAL · el restaurante. Donde ocurre la operacion.
create table estook.local (
  id               uuid        primary key default gen_random_uuid(),
  organizacion_id  uuid        not null references estook.organizacion (id) on delete restrict,
  area_id          uuid            null references estook.area (id) on delete restrict,
  codigo           text        not null,
  nombre           text        not null,
  -- La fecha operativa la decide el servidor (regla 10), y necesita saber donde esta el local.
  zona_horaria     text        not null default 'Europe/Madrid',
  es_ejemplo       boolean     not null default false,
  activo           boolean     not null default true,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  constraint local_codigo_con_forma check (codigo ~ '^[a-z0-9-]{2,48}$'),
  constraint local_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint local_codigo_unico_en_su_organizacion unique (organizacion_id, codigo)
);

comment on table estook.local is
  'Nivel 3 de alcance. Un local jamas ve los datos de otro (principio 8).';

-- Un area de otra organizacion no puede colarse en un local: se comprueba en la
-- base de datos, no solo en el codigo.
create or replace function estook.area_es_de_la_misma_organizacion()
returns trigger
language plpgsql
as $$
declare
  organizacion_del_area uuid;
begin
  if new.area_id is null then
    return new;
  end if;

  select a.organizacion_id into organizacion_del_area
  from estook.area a
  where a.id = new.area_id;

  if organizacion_del_area is distinct from new.organizacion_id then
    raise exception 'El area % no pertenece a la organizacion %', new.area_id, new.organizacion_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger local_area_coherente
  before insert or update of area_id, organizacion_id on estook.local
  for each row execute function estook.area_es_de_la_misma_organizacion();

create index area_por_organizacion on estook.area (organizacion_id);
create index local_por_organizacion on estook.local (organizacion_id);
create index local_por_area on estook.local (area_id) where area_id is not null;

create trigger organizacion_actualizada before update on estook.organizacion
  for each row execute function estook.marcar_actualizado();
create trigger area_actualizada before update on estook.area
  for each row execute function estook.marcar_actualizado();
create trigger local_actualizado before update on estook.local
  for each row execute function estook.marcar_actualizado();

-- Se enciende RLS sin ninguna politica: hasta que M1 escriba las de verdad contra
-- locales_visibles, nadie que no sea el servicio lee nada. Es el fallo seguro.
alter table estook.organizacion enable row level security;
alter table estook.area         enable row level security;
alter table estook.local        enable row level security;
