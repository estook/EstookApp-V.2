-- 0002 · Personas, roles y membresias
--
-- Modulo M1. Aqui nace el cuarto nivel de alcance del Manifiesto: la persona.
-- Los otros tres (organizacion, area, local) los creo la migracion 0001.
--
-- La regla que sostiene todo el modelo, y que M1 avisa de no incumplir: una
-- persona NO pertenece a un local. Una persona tiene membresias, y cada membresia
-- es persona + alcance + rol. Alguien puede llevar seis locales de dos areas, o
-- trabajar en dos organizaciones distintas con el mismo correo.

-- ── Vocabulario ───────────────────────────────────────────────────────────────

-- Los cuatro niveles del Manifiesto. Una membresia solo se concede en los tres
-- primeros; `persona` existe porque hay permisos que son siempre sobre lo tuyo
-- (tus horas, tu horario, tus fichas) y hay que poder nombrarlo.
create type estook.alcance as enum ('organizacion', 'area', 'local', 'persona');

-- Interfaz en espanol, catalan, gallego, euskera e ingles, elegida por persona y
-- no por local: en la misma cocina puede haber quien la quiera en castellano y
-- quien la quiera en ingles.
create type estook.idioma as enum ('es', 'ca', 'gl', 'eu', 'en');

-- ── Persona ───────────────────────────────────────────────────────────────────

create table estook.persona (
  id              uuid           primary key default gen_random_uuid(),
  -- Enlace con Supabase Auth. Vacio mientras la invitacion no se ha aceptado:
  -- se invita a un correo y la persona existe antes de tener con que entrar.
  auth_id         uuid           unique,
  -- «Un correo, una identidad.» Invitar a un correo que ya existe anade una
  -- membresia, nunca duplica la persona.
  correo          text           not null unique,
  nombre          text           not null,
  apellidos       text,
  idioma          estook.idioma  not null default 'es',
  -- Nada se borra: se desactiva (principio 6).
  activa          boolean        not null default true,
  es_ejemplo      boolean        not null default false,
  creado_en       timestamptz    not null default now(),
  actualizado_en  timestamptz    not null default now(),
  constraint persona_correo_en_minusculas check (correo = lower(correo)),
  constraint persona_correo_con_forma check (correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  constraint persona_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

comment on table estook.persona is
  'Nivel 4 de alcance. La persona existe una sola vez aunque trabaje en varias organizaciones.';
comment on column estook.persona.auth_id is
  'Vacio hasta que acepta la invitacion. El login se construye en M4.';

create trigger persona_actualizada before update on estook.persona
  for each row execute function estook.marcar_actualizado();

-- ── Los doce roles ────────────────────────────────────────────────────────────

create table estook.rol (
  codigo       text            primary key,
  nombre       text            not null,
  -- En que nivel se puede conceder este rol. Un cocinero no se concede a una
  -- organizacion entera, y una gestoria no se concede a un local suelto.
  alcance      estook.alcance  not null,
  -- Para «si alguien tiene dos roles sobre el mismo local, gana el mas amplio».
  amplitud     smallint        not null,
  descripcion  text            not null,
  constraint rol_alcance_concedible check (alcance <> 'persona'),
  constraint rol_amplitud_en_rango check (amplitud between 0 and 100)
);

comment on table estook.rol is
  'Los doce roles del Manifiesto. Cerrados: no se anaden roles sin decision escrita.';

insert into estook.rol (codigo, nombre, alcance, amplitud, descripcion) values
  -- De organizacion
  ('direccion',               'Direccion o propietario',  'organizacion', 100,
   'Todo, en todos los locales'),
  ('administrador_de_cuenta', 'Administrador de cuenta',  'organizacion',  90,
   'Plan, facturacion, licencias, altas de local y de personas. Sin operacion diaria salvo que se le de expresamente'),
  ('chef_corporativo',        'Chef corporativo',         'organizacion',  60,
   'Escandallos y Carta de todos los locales, mas el catalogo maestro de recetas. Nada de personal ni de facturacion'),
  ('compras_central',         'Compras central',          'organizacion',  60,
   'Inventario y proveedores de todos los locales, contratos marco y comparativa de precios. Nada de recetas ni de personal'),
  ('rrhh',                    'RRHH',                     'organizacion',  60,
   'Equipo y Calendario de todos los locales, con costes de personal. Sin materia prima ni margenes'),
  ('gestoria',                'Gestoria',                 'organizacion',  10,
   'Periodos cerrados y exportaciones, solo lectura, y solo de los locales que se le asignen'),
  -- De area
  ('area_manager',            'Area manager',             'area',          80,
   'Lo de un gerente pero en sus locales y en vista comparada, sin tocar facturacion ni crear locales'),
  -- De local
  ('gerente',                 'Gerente',                  'local',         70,
   'Todo lo de su local. Panel completo, objetivos, invitaciones, conexion del TPV y avisos de negocio'),
  ('jefe_de_cocina',          'Jefe de cocina',           'local',         50,
   'Inventario entera, Escandallos entera, la parte de cocina de la Carta, el APPCC, el cuadrante de cocina y las fichas de su equipo'),
  ('jefe_de_sala',            'Jefe de sala',             'local',         50,
   'Lo del camarero, mas el cuadrante de sala, los fichajes de su equipo y las ventas del turno'),
  ('cocinero',                'Cocinero',                 'local',         30,
   'Su turno, las fichas que tiene que aprenderse, lo que caduca, sus tareas y la hoja de produccion. Ningun importe'),
  ('camarero',                'Camarero o personal de sala', 'local',      30,
   'Su turno, el menu del dia, los agotados, los alergenos y sus horas');

-- ── Membresias ────────────────────────────────────────────────────────────────

create table estook.membresia (
  id               uuid            primary key default gen_random_uuid(),
  persona_id       uuid            not null references estook.persona (id) on delete restrict,
  -- Siempre se sabe de que organizacion es una membresia, sea cual sea su alcance.
  organizacion_id  uuid            not null references estook.organizacion (id) on delete restrict,
  area_id          uuid                null references estook.area (id) on delete restrict,
  local_id         uuid                null references estook.local (id) on delete restrict,
  alcance          estook.alcance  not null,
  rol              text            not null references estook.rol (codigo) on delete restrict,
  -- Vigencia. Una membresia que caduco no da acceso, pero no se borra: quien se
  -- fue en marzo tiene que seguir apareciendo en el historico de marzo.
  desde            date            not null default current_date,
  hasta            date,
  creado_en        timestamptz     not null default now(),
  actualizado_en   timestamptz     not null default now(),

  constraint membresia_alcance_concedible check (alcance <> 'persona'),
  constraint membresia_vigencia_coherente check (hasta is null or hasta >= desde),
  -- Cada alcance rellena exactamente los identificadores que le tocan.
  constraint membresia_alcance_cuadra check (
    (alcance = 'organizacion' and area_id is null and local_id is null)
    or (alcance = 'area' and area_id is not null and local_id is null)
    or (alcance = 'local' and area_id is null and local_id is not null)
  )
);

comment on table estook.membresia is
  'persona + alcance + rol. Una persona tiene una o varias; nunca "pertenece a un local".';
comment on column estook.membresia.hasta is
  'Vigencia. Nulo = indefinida. Una membresia caducada no da acceso pero no se borra.';

-- La misma persona no puede tener el mismo rol dos veces sobre lo mismo.
create unique index membresia_sin_duplicados_en_organizacion
  on estook.membresia (persona_id, organizacion_id, rol)
  where alcance = 'organizacion';
create unique index membresia_sin_duplicados_en_area
  on estook.membresia (persona_id, area_id, rol)
  where alcance = 'area';
create unique index membresia_sin_duplicados_en_local
  on estook.membresia (persona_id, local_id, rol)
  where alcance = 'local';

create index membresia_por_persona on estook.membresia (persona_id);
create index membresia_por_organizacion on estook.membresia (organizacion_id);
create index membresia_por_local on estook.membresia (local_id) where local_id is not null;
create index membresia_por_area on estook.membresia (area_id) where area_id is not null;

create trigger membresia_actualizada before update on estook.membresia
  for each row execute function estook.marcar_actualizado();

-- El alcance del rol tiene que ser el de la membresia, y el area o el local
-- tienen que ser de esa organizacion. Se comprueba en la base de datos, porque
-- fiarse del identificador que manda el cliente es el error tipico que avisa M1.
create or replace function estook.membresia_es_coherente()
returns trigger
language plpgsql
as $$
declare
  alcance_del_rol estook.alcance;
  organizacion_del_contenedor uuid;
begin
  select r.alcance into alcance_del_rol from estook.rol r where r.codigo = new.rol;

  if alcance_del_rol is distinct from new.alcance then
    raise exception 'El rol % se concede con alcance %, no con alcance %',
      new.rol, alcance_del_rol, new.alcance
      using errcode = '23514';
  end if;

  if new.alcance = 'area' then
    select a.organizacion_id into organizacion_del_contenedor
    from estook.area a where a.id = new.area_id;
  elsif new.alcance = 'local' then
    select l.organizacion_id into organizacion_del_contenedor
    from estook.local l where l.id = new.local_id;
  else
    return new;
  end if;

  if organizacion_del_contenedor is distinct from new.organizacion_id then
    raise exception 'El % indicado no pertenece a la organizacion %',
      new.alcance, new.organizacion_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger membresia_coherente
  before insert or update on estook.membresia
  for each row execute function estook.membresia_es_coherente();
