-- 0007 · Traducciones, dispositivos y politicas del catalogo maestro
--
-- Modulo M1. Las tres cosas que M1 pide y que, dejadas para luego, obligan a
-- rehacer medio sistema:
--
--  · Traducciones. El error tipico que avisa M1 es «dejar traducciones para luego
--    y acabar con columnas nombre_en». Aqui no hay columnas por idioma: hay una
--    tabla de traducciones que sirve para cualquier texto de cualquier entidad.
--  · Dispositivos, con revocacion.
--  · El catalogo maestro y sus tres politicas: obligatorio, sugerido y libre.

-- ── Traducciones ──────────────────────────────────────────────────────────────

create table estook.traduccion (
  id               uuid           primary key default gen_random_uuid(),
  -- Para el aislamiento entre organizaciones. Una traduccion es de quien la hizo.
  organizacion_id  uuid           not null references estook.organizacion (id) on delete restrict,
  -- Que se traduce: 'producto', 'plato', 'paso', 'alergeno'... y cual.
  entidad          text           not null,
  entidad_id       uuid           not null,
  campo            text           not null,
  idioma           estook.idioma  not null,
  texto            text           not null,
  -- «Fogon propone la traduccion, una persona la aprueba, y el cocinero ve los
  --  pasos en su idioma.» Una traduccion sin aprobar no se ensena en cocina.
  propuesta_por_ia boolean        not null default false,
  aprobada         boolean        not null default false,
  aprobada_por     uuid               null references estook.persona (id) on delete set null,
  aprobada_en      timestamptz,
  creado_en        timestamptz    not null default now(),
  actualizado_en   timestamptz    not null default now(),
  constraint traduccion_unica unique (entidad, entidad_id, campo, idioma),
  constraint traduccion_texto_no_vacio check (length(btrim(texto)) > 0),
  constraint traduccion_aprobacion_coherente check (
    (aprobada = false and aprobada_por is null and aprobada_en is null)
    or (aprobada = true and aprobada_en is not null)
  )
);

comment on table estook.traduccion is
  'Cualquier texto en cualquier idioma. Nunca columnas nombre_en: eso es el error que M1 avisa de no cometer.';

create index traduccion_por_entidad on estook.traduccion (entidad, entidad_id, idioma);
create index traduccion_por_organizacion on estook.traduccion (organizacion_id);

create trigger traduccion_actualizada before update on estook.traduccion
  for each row execute function estook.marcar_actualizado();

-- ── Dispositivos ──────────────────────────────────────────────────────────────

-- Un movil, una tablet del pase, un PC viejo haciendo de quiosco de fichaje.
create type estook.tipo_de_dispositivo as enum ('movil', 'tablet', 'quiosco', 'escritorio');

create table estook.dispositivo (
  id              uuid                        primary key default gen_random_uuid(),
  persona_id      uuid                        not null references estook.persona (id) on delete restrict,
  -- Un quiosco vive en un local concreto; un movil, no necesariamente.
  local_id        uuid                            null references estook.local (id) on delete restrict,
  nombre          text                        not null,
  tipo            estook.tipo_de_dispositivo  not null,
  -- Identificador opaco del navegador o de la aplicacion. Nunca datos del aparato.
  huella          text,
  ultimo_uso_en   timestamptz,
  -- Revocacion. No se borra la fila: queda quien lo revoco y cuando.
  revocado_en     timestamptz,
  revocado_por    uuid                            null references estook.persona (id) on delete set null,
  creado_en       timestamptz                 not null default now(),
  actualizado_en  timestamptz                 not null default now(),
  constraint dispositivo_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint dispositivo_revocacion_coherente check (
    (revocado_en is null and revocado_por is null) or revocado_en is not null
  ),
  constraint dispositivo_quiosco_con_local check (tipo <> 'quiosco' or local_id is not null)
);

comment on table estook.dispositivo is
  'Los aparatos desde los que se entra. Revocar uno no lo borra: deja constancia de quien y cuando.';
comment on column estook.dispositivo.huella is
  'Identificador opaco. Nunca modelo, numero de serie ni nada que identifique el aparato fisico.';

create index dispositivo_por_persona on estook.dispositivo (persona_id);
create index dispositivo_por_local on estook.dispositivo (local_id) where local_id is not null;
create index dispositivo_activo on estook.dispositivo (persona_id) where revocado_en is null;

create trigger dispositivo_actualizado before update on estook.dispositivo
  for each row execute function estook.marcar_actualizado();

-- ── El catalogo maestro y sus tres politicas ──────────────────────────────────

-- «Productos, recetas, cartas, plantillas de APPCC, plantillas de tarea y
--  objetivos que viven en la organizacion o en el area, cada uno con su politica.»
create type estook.tipo_maestro as enum (
  'producto',
  'receta',
  'carta',
  'plantilla_appcc',
  'plantilla_tarea',
  'objetivo'
);

create type estook.politica_maestra as enum ('obligatorio', 'sugerido', 'libre');

comment on type estook.politica_maestra is
  'obligatorio: el local lo lee del maestro y no puede editarlo · sugerido: puede desviarse y la desviacion queda registrada · libre: lo gestiona por su cuenta';

create table estook.politica_de_catalogo (
  id               uuid                      primary key default gen_random_uuid(),
  organizacion_id  uuid                      not null references estook.organizacion (id) on delete restrict,
  -- Nulo = vale para toda la organizacion. Con area = solo para esa area.
  area_id          uuid                          null references estook.area (id) on delete restrict,
  tipo             estook.tipo_maestro       not null,
  politica         estook.politica_maestra   not null,
  creado_en        timestamptz               not null default now(),
  actualizado_en   timestamptz               not null default now(),
  constraint politica_unica unique nulls not distinct (organizacion_id, area_id, tipo)
);

comment on table estook.politica_de_catalogo is
  'La politica por defecto de cada tipo de elemento maestro. La propagacion y la adopcion se construyen en M24.';

create index politica_por_organizacion on estook.politica_de_catalogo (organizacion_id);

create trigger politica_actualizada before update on estook.politica_de_catalogo
  for each row execute function estook.marcar_actualizado();

-- Un area de otra organizacion no puede colarse en una politica.
create or replace function estook.politica_area_coherente()
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
  from estook.area a where a.id = new.area_id;

  if organizacion_del_area is distinct from new.organizacion_id then
    raise exception 'El area % no pertenece a la organizacion %', new.area_id, new.organizacion_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger politica_coherente
  before insert or update on estook.politica_de_catalogo
  for each row execute function estook.politica_area_coherente();

-- Lo que nunca se hereda del maestro, dicho por escrito para que no se intente
-- en M24: el stock, los albaranes, los precios de compra reales, los fichajes y
-- los canales de chat. Son del local siempre.
