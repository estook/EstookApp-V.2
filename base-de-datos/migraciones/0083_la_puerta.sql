-- 0083 · T1 · La puerta de Estook TPV (decisión 0107; Anexo 11.3, 11.4, 3.4 y 7.1)
--
-- Estook TPV deja de entrar con la sesión de Estook: **solo funciona en un aparato
-- vinculado al local**, y cada uno entra con su PIN. Lo que hace falta para eso:
--
--   · `terminal`, el aparato de la 0052, gana **sus cinco funciones** (caja, comandero,
--     pantalla de cocina, pantalla de barra y fichar), **de quién es** si es el móvil de
--     un camarero, **su cajón** si es una caja, su latido y su versión
--   · `cajon`: una caja por cajón (respuesta 9 de la 0107); dos cajas pueden compartirlo
--   · `codigo_para_vincular`: el código de 6 cifras, de un uso, que caduca a los 10 minutos.
--     Se guarda su huella, nunca el código
--   · `intento_de_vincular`: los códigos probados desde cada dirección, 20 por hora
--   · `turno_del_operador`: quién está usando el aparato ahora, desde su PIN hasta que se
--     bloquea. Lo que hace queda a su nombre
--   · `aprobacion`: lo que pide un encargado, aprobado con su PIN en el mismo aparato,
--     para una cosa y una vez (Anexo 3.4). La primera: quitar un plato ya en cocina
--   · `ajustes_del_tpv`: los minutos del bloqueo y «solo entra quien ha fichado»
--   · y dos permisos de Roles 1.12: vincular aparatos y los Ajustes del TPV
--
-- Lo que ya había no cambia: los aparatos para fichar siguen siendo de función «fichar»,
-- con su llave, y siguen fichando como siempre.

-- ═══ Los dos permisos ══════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.vincular_aparatos', 'Vincular aparatos', 'accion', 'local',
   'Vincular un aparato al local (sacar su código o entrar con el correo en el primero), cambiar su función o su nombre, y desvincularlo'),
  ('accion.ajustes_del_tpv', 'Ajustes del TPV', 'accion', 'local',
   'Los Ajustes de Estook TPV: el PIN y el bloqueo de cada aparato, y lo que llegue de la sala, los productos, las impresoras y la caja');

-- Roles 1.12: vincular, el gerente, la dirección y el administrador de cuenta; los
-- ajustes, el gerente. El area manager lleva lo del gerente, como en la 0081.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('gerente',                 'accion.vincular_aparatos', 'ver_y_editar'),
  ('area_manager',            'accion.vincular_aparatos', 'ver_y_editar'),
  ('direccion',               'accion.vincular_aparatos', 'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.vincular_aparatos', 'ver_y_editar'),
  ('gerente',                 'accion.ajustes_del_tpv',   'ver_y_editar'),
  ('area_manager',            'accion.ajustes_del_tpv',   'ver_y_editar'),
  ('direccion',               'accion.ajustes_del_tpv',   'ver_y_editar');

-- ═══ El cajón ══════════════════════════════════════════════════════════════════

create table estook.cajon (
  id           uuid         primary key default gen_random_uuid(),
  local_id     uuid         not null references estook.local (id) on delete cascade,
  nombre       text         not null,
  creado_por   uuid         references estook.persona (id) on delete set null,
  creado_en    timestamptz  not null default now(),
  retirado_en  timestamptz,

  constraint cajon_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 40)
);

comment on table estook.cajon is
  'El cajón del dinero de una caja (0107): una caja por cajón. Dos aparatos de caja pueden compartirlo, y entonces comparten su caja abierta.';

create unique index cajon_nombre_unico on estook.cajon (local_id, lower(btrim(nombre)))
  where retirado_en is null;

alter table estook.cajon enable row level security;

create policy cajon_lectura on estook.cajon
  for select using (
    estook.puede_ver('accion.vincular_aparatos', local_id)
    or estook.puede_ver('accion.ajustes_del_tpv', local_id)
  );
create policy cajon_alta on estook.cajon
  for insert with check (
    estook.puede_editar('accion.vincular_aparatos', local_id)
    and creado_por = estook.persona_actual()
  );
create policy cajon_cambio on estook.cajon
  for update using (estook.puede_editar('accion.vincular_aparatos', local_id))
  with check (estook.puede_editar('accion.vincular_aparatos', local_id));

revoke all on estook.cajon from public;
grant select, insert, update on estook.cajon to estook_api;

-- ═══ El aparato, con su función ════════════════════════════════════════════════

alter table estook.terminal drop constraint terminal_funcion_conocida;

alter table estook.terminal
  -- El comandero personal: el móvil de alguien, en el que solo entra su PIN.
  add column persona_id uuid references estook.persona (id) on delete restrict,
  add column cajon_id uuid references estook.cajon (id) on delete restrict,
  add column version_de_la_app text,
  add column ultimo_latido_en timestamptz,
  -- El toque «algo ha cambiado en la sala» le llega al aparato, no a quien lo usa: así
  -- cambiar de camarero no vuelve a conectar (0073, 0106).
  add column tema_al_segundo text,
  add constraint terminal_funcion_conocida check (
    funcion in ('caja', 'comandero', 'cocina', 'barra', 'fichar')
  ),
  -- Lo que separa la caja del comandero es el cajón (Anexo 11.3).
  add constraint terminal_cajon_en_la_caja check ((funcion = 'caja') = (cajon_id is not null)),
  add constraint terminal_dueno_en_el_comandero check (persona_id is null or funcion = 'comandero'),
  add constraint terminal_version_corta check (
    version_de_la_app is null or char_length(version_de_la_app) <= 40
  ),
  add constraint terminal_tema_con_forma check (
    tema_al_segundo is null or tema_al_segundo ~ '^[A-Za-z0-9_-]{20,100}$'
  );

create unique index terminal_tema_unico on estook.terminal (tema_al_segundo)
  where tema_al_segundo is not null;

comment on table estook.terminal is
  'Un aparato del local con su propia llave y su función (0057, 0068, 0107): caja, comandero, pantalla de cocina, pantalla de barra o fichar. Desvincularlo lo deja sin valer en la petición siguiente.';
comment on column estook.terminal.persona_id is
  'De quién es, si es un comandero personal (su móvil): solo entra su PIN. Si deja el local, el aparato deja de valer.';
comment on column estook.terminal.cajon_id is
  'El cajón de una caja. Una caja siempre tiene el suyo; un comandero, nunca.';

-- Lo ven quienes vinculan aparatos y, como hasta hoy, quienes tocan los Ajustes del
-- local (los aparatos para fichar se ponían allí).
drop policy terminal_lectura on estook.terminal;
drop policy terminal_alta on estook.terminal;
drop policy terminal_retirar on estook.terminal;

create policy terminal_lectura on estook.terminal
  for select using (
    estook.puede_ver('accion.vincular_aparatos', local_id)
    or estook.puede_ver('app.ajustes', local_id)
  );
create policy terminal_alta on estook.terminal
  for insert with check (
    estook.puede_editar('accion.vincular_aparatos', local_id)
    and creado_por = estook.persona_actual()
  );
create policy terminal_cambio on estook.terminal
  for update using (estook.puede_editar('accion.vincular_aparatos', local_id))
  with check (estook.puede_editar('accion.vincular_aparatos', local_id));

-- ═══ El código para vincular ═══════════════════════════════════════════════════

create table estook.codigo_para_vincular (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  -- Lo que será el aparato, elegido antes de sacar el código (Anexo 11.3).
  funcion         text         not null,
  nombre          text         not null,
  persona_id      uuid         references estook.persona (id) on delete cascade,
  cajon_id        uuid         references estook.cajon (id) on delete cascade,
  -- SHA-256 del código. El código no se guarda.
  huella          text         not null,
  creado_por      uuid         not null references estook.persona (id) on delete cascade,
  creado_desde    uuid         references estook.terminal (id) on delete set null,
  creado_en       timestamptz  not null default now(),
  caduca_en       timestamptz  not null,
  usado_en        timestamptz,
  -- El aparato que se vinculó con él.
  terminal_id     uuid         references estook.terminal (id) on delete set null,
  anulado_en      timestamptz,

  constraint codigo_funcion_conocida check (
    funcion in ('caja', 'comandero', 'cocina', 'barra', 'fichar')
  ),
  constraint codigo_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 60),
  constraint codigo_huella_con_forma check (huella ~ '^[0-9a-f]{64}$'),
  constraint codigo_cajon_en_la_caja check ((funcion = 'caja') = (cajon_id is not null)),
  constraint codigo_dueno_en_el_comandero check (persona_id is null or funcion = 'comandero'),
  constraint codigo_dura_diez_minutos check (
    caduca_en > creado_en and caduca_en <= creado_en + interval '10 minutes'
  )
);

comment on table estook.codigo_para_vincular is
  'El código de 6 cifras para vincular un aparato (Anexo 11.3): sirve una vez, para ese local, esa función y ese nombre, y caduca a los 10 minutos. Se guarda su huella.';

create index codigo_vivo on estook.codigo_para_vincular (huella)
  where usado_en is null and anulado_en is null;
create index codigo_por_local on estook.codigo_para_vincular (local_id, creado_en);

alter table estook.codigo_para_vincular enable row level security;

create policy codigo_lectura on estook.codigo_para_vincular
  for select using (estook.puede_ver('accion.vincular_aparatos', local_id));
create policy codigo_alta on estook.codigo_para_vincular
  for insert with check (
    estook.puede_editar('accion.vincular_aparatos', local_id)
    and creado_por = estook.persona_actual()
  );
create policy codigo_cambio on estook.codigo_para_vincular
  for update using (estook.puede_editar('accion.vincular_aparatos', local_id))
  with check (estook.puede_editar('accion.vincular_aparatos', local_id));

revoke all on estook.codigo_para_vincular from public;
grant select, insert, update on estook.codigo_para_vincular to estook_api;

-- Quien teclea el código en el aparato nuevo **todavía no es nadie**: como la llave de
-- la 0052, una función mínima dice qué código vivo tiene esa huella.
create function estook.codigo_vivo_por_huella(p_huella text, p_ahora timestamptz)
returns table (
  codigo_id    uuid,
  local_id     uuid,
  organizacion_id uuid,
  funcion      text,
  nombre       text,
  persona_id   uuid,
  cajon_id     uuid,
  creado_por   uuid
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select c.id, c.local_id, l.organizacion_id, c.funcion, c.nombre, c.persona_id, c.cajon_id, c.creado_por
    from estook.codigo_para_vincular c
    join estook.local l on l.id = c.local_id and l.activo
   where c.huella = p_huella
     and c.usado_en is null
     and c.anulado_en is null
     -- La hora la dice la API, la misma con la que se sacó (regla 10).
     and c.caduca_en > p_ahora
   order by c.creado_en desc
   limit 1
$$;

comment on function estook.codigo_vivo_por_huella(text, timestamptz) is
  'Puerta mínima de vincular (Anexo 11.3): el código vivo con esa huella, sin caducar ni usar. Solo la ejecuta estook_api.';

revoke all on function estook.codigo_vivo_por_huella(text, timestamptz) from public;
grant execute on function estook.codigo_vivo_por_huella(text, timestamptz) to estook_api;

-- ═══ Los códigos probados desde cada dirección ═════════════════════════════════

create table estook.intento_de_vincular (
  id      bigint       generated always as identity primary key,
  -- SHA-256 de la dirección: para contar, no para saber quién era.
  desde   text         not null,
  en      timestamptz  not null default now(),
  acerto  boolean      not null,
  constraint intento_desde_con_forma check (desde ~ '^[0-9a-f]{64}$')
);

comment on table estook.intento_de_vincular is
  'Cada código tecleado para vincular, por dirección (Anexo 11.3): una dirección no prueba más de 20 en una hora. Lo de más de un día se borra solo al apuntar.';

create index intento_por_direccion on estook.intento_de_vincular (desde, en);
create index intento_por_fecha on estook.intento_de_vincular (en);

alter table estook.intento_de_vincular enable row level security;

create policy intento_de_vincular_el_sistema on estook.intento_de_vincular
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.intento_de_vincular from public;
grant select, insert, delete on estook.intento_de_vincular to estook_api;

-- ═══ El turno del operador ═════════════════════════════════════════════════════

create table estook.turno_del_operador (
  id             uuid         primary key default gen_random_uuid(),
  terminal_id    uuid         not null references estook.terminal (id) on delete cascade,
  persona_id     uuid         not null references estook.persona (id) on delete cascade,
  local_id       uuid         not null references estook.local (id) on delete cascade,
  -- SHA-256 del turno, como el token de una sesión. El turno solo vive en la memoria
  -- del aparato: al recargar, se bloquea (Anexo 3.4).
  huella         text         not null unique,
  -- Con la hora de la base, como la sesión: es la que mira `turno_activo` en cada
  -- petición, antes de que la API tenga su reloj.
  desde          timestamptz  not null default now(),
  hasta          timestamptz,
  por_que_acabo  text,

  constraint turno_huella_con_forma check (huella ~ '^[0-9a-f]{64}$'),
  constraint turno_acaba_con_motivo check ((hasta is null) = (por_que_acabo is null)),
  constraint turno_motivo_conocido check (
    por_que_acabo is null
    or por_que_acabo in ('bloqueo', 'otro_operador', 'salir', 'desvinculado')
  )
);

comment on table estook.turno_del_operador is
  'Quién usa ahora un aparato del local (Anexo 7.1): desde su PIN hasta que se bloquea, entra otro o se desvincula. Lo que hace queda a su nombre, con la hora y el aparato.';

create index turno_abierto_por_aparato on estook.turno_del_operador (terminal_id)
  where hasta is null;
create index turno_por_aparato on estook.turno_del_operador (terminal_id, desde);

alter table estook.turno_del_operador enable row level security;

create policy turno_lectura on estook.turno_del_operador
  for select using (
    persona_id = estook.persona_actual()
    or estook.puede_ver('accion.vincular_aparatos', local_id)
    or estook.es_el_sistema()
  );
create policy turno_lo_escribe_el_sistema on estook.turno_del_operador
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.turno_del_operador from public;
grant select, insert, update on estook.turno_del_operador to estook_api;

-- Lo que la API resuelve en cada petición de Estook TPV: el turno **y** la llave del
-- aparato, los dos (Anexo 11.14, punto 4). Devuelve lo mismo que `sesion_activa`, para
-- que todo lo que mira una sesión (los permisos, la seguridad de las filas) mire igual
-- al operador, y además el aparato y su función.
create function estook.turno_activo(p_huella_turno text, p_huella_llave text)
returns table (
  sesion_id              uuid,
  persona_id             uuid,
  organizacion_id        uuid,
  local_id               uuid,
  doble_factor_superado  boolean,
  debe_cambiar_clave     boolean,
  es_demostracion        boolean,
  para_admin             boolean,
  terminal_id            uuid,
  funcion                text,
  es_personal            boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select o.id, o.persona_id, l.organizacion_id, o.local_id, true, false, false, false,
         t.id, t.funcion, t.persona_id is not null
    from estook.turno_del_operador o
    join estook.terminal t
      on t.id = o.terminal_id and t.huella = p_huella_llave and t.retirado_en is null
    join estook.local l on l.id = o.local_id and l.activo
    join estook.persona p on p.id = o.persona_id and p.activa
   where o.huella = p_huella_turno
     and o.hasta is null
     -- Un turno no pasa de un servicio largo: al día siguiente se vuelve a teclear.
     and o.desde > now() - interval '16 hours'
     and (t.persona_id is null or t.persona_id = o.persona_id)
$$;

comment on function estook.turno_activo(text, text) is
  'Quién opera ahora en un aparato vinculado (Anexo 11.14): el turno vivo con esa huella en el aparato de esa llave. Solo la ejecuta estook_api.';

revoke all on function estook.turno_activo(text, text) from public;
grant execute on function estook.turno_activo(text, text) to estook_api;

-- El aparato por su llave, **sea cual sea su función** (la de la 0052 solo ve los de
-- fichar, y así se queda). Lo usan el latido, el PIN y la pantalla de bloqueo. Un
-- comandero personal cuyo dueño ya no toma nota en el local deja de valer.
create function estook.aparato_por_llave(p_huella text)
returns table (
  terminal_id      uuid,
  local_id         uuid,
  organizacion_id  uuid,
  nombre           text,
  funcion          text,
  persona_id       uuid,
  nombre_del_dueno text,
  cajon_id         uuid,
  nombre_del_cajon text,
  sal_del_pin      text,
  -- Parado por diez PIN fallados seguidos, mirado con la hora con que se paró (0068).
  parado           boolean,
  nombre_del_local text,
  pausas_en_uso    boolean,
  tema_al_segundo  text
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select t.id, t.local_id, l.organizacion_id, t.nombre, t.funcion, t.persona_id, d.nombre,
         t.cajon_id, c.nombre, l.sal_del_pin, coalesce(t.parado_hasta > now(), false),
         l.nombre, l.pausas_en_uso, t.tema_al_segundo
    from estook.terminal t
    join estook.local l on l.id = t.local_id and l.activo
    left join estook.persona d on d.id = t.persona_id
    left join estook.cajon c on c.id = t.cajon_id
   where t.huella = p_huella
     and t.retirado_en is null
     and (
       t.persona_id is null
       or (d.activa and estook.nivel_de_permiso(t.persona_id, t.local_id, 'accion.tomar_nota') <> 'sin_acceso')
     )
$$;

comment on function estook.aparato_por_llave(text) is
  'Puerta mínima de Estook TPV (0107): el aparato vivo de una llave, con su función y su local. Solo la ejecuta estook_api.';

revoke all on function estook.aparato_por_llave(text) from public;
grant execute on function estook.aparato_por_llave(text) to estook_api;

-- Quién está fichado ahora en el local del aparato: la pantalla del PIN lo enseña
-- («Fichados ahora: Sara · Rosa»). Solo el nombre de pila y desde cuándo.
create function estook.fichados_en_el_aparato(p_huella text)
returns table (persona_id uuid, nombre text, desde timestamptz)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct on (f.persona_id) f.persona_id, p.nombre, f.entro_en
    from estook.terminal t
    join estook.fichaje f
      on f.local_id = t.local_id and f.salio_en is null and f.entro_en > now() - interval '20 hours'
    join estook.persona p on p.id = f.persona_id and p.activa
   where t.huella = p_huella and t.retirado_en is null
   order by f.persona_id, f.entro_en desc
$$;

comment on function estook.fichados_en_el_aparato(text) is
  'Quién está fichado ahora en el local de un aparato vivo, para su pantalla del PIN (Anexo 11.4). Solo la ejecuta estook_api.';

revoke all on function estook.fichados_en_el_aparato(text) from public;
grant execute on function estook.fichados_en_el_aparato(text) to estook_api;

-- ═══ Los ajustes del bloqueo ═══════════════════════════════════════════════════

create table estook.ajustes_del_tpv (
  local_id                  uuid         primary key references estook.local (id) on delete cascade,
  -- La caja y el comandero para todos: a los 2 minutos sin tocar y al acabar cada cobro.
  bloqueo_minutos           smallint     not null default 2,
  bloqueo_al_cobrar         boolean      not null default true,
  -- El móvil de cada camarero: a los 10.
  bloqueo_personal_minutos  smallint     not null default 10,
  solo_entra_quien_ficha    boolean      not null default false,
  cambiado_por              uuid         references estook.persona (id) on delete set null,
  cambiado_en               timestamptz  not null default now(),
  version                   integer      not null default 1,

  constraint ajustes_bloqueo_en_rango check (bloqueo_minutos between 1 and 10),
  constraint ajustes_bloqueo_personal_en_rango check (bloqueo_personal_minutos between 5 and 30)
);

comment on table estook.ajustes_del_tpv is
  'Ajustes del TPV › PIN y bloqueo (Anexo 11.4). Sin fila, los de fábrica: 2 minutos y al cobrar, 10 en el móvil personal, y entra quien no ha fichado.';

create trigger ajustes_del_tpv_sube_version before update on estook.ajustes_del_tpv
  for each row execute function estook.subir_version();

alter table estook.ajustes_del_tpv enable row level security;

-- Los lee el propio aparato antes de que nadie entre: eso pasa por el sistema.
create policy ajustes_del_tpv_lectura on estook.ajustes_del_tpv
  for select using (estook.puede_ver('accion.ajustes_del_tpv', local_id) or estook.es_el_sistema());
create policy ajustes_del_tpv_alta on estook.ajustes_del_tpv
  for insert with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));
create policy ajustes_del_tpv_cambio on estook.ajustes_del_tpv
  for update using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));

revoke all on estook.ajustes_del_tpv from public;
grant select, insert, update on estook.ajustes_del_tpv to estook_api;

-- ═══ Lo que aprueba un encargado ═══════════════════════════════════════════════

create table estook.aprobacion (
  id            uuid         primary key default gen_random_uuid(),
  local_id      uuid         not null references estook.local (id) on delete cascade,
  terminal_id   uuid         not null references estook.terminal (id) on delete cascade,
  -- Qué y sobre qué. Hoy, quitar un plato que ya está en cocina (Roles 1.12).
  operacion     text         not null,
  sobre         uuid         not null,
  pedida_por    uuid         not null references estook.persona (id) on delete restrict,
  aprobada_por  uuid         not null references estook.persona (id) on delete restrict,
  motivo        text         not null,
  creada_en     timestamptz  not null default now(),
  usada_en      timestamptz,

  constraint aprobacion_operacion_conocida check (operacion in ('quitar_de_cocina')),
  constraint aprobacion_motivo_con_medida check (char_length(btrim(motivo)) between 3 and 300)
);

comment on table estook.aprobacion is
  'Lo que pide un encargado, aprobado con su PIN en el mismo aparato (Anexo 3.4): una cosa, una vez, dos minutos. Queda quién lo pidió, quién lo aprobó, qué, por qué y desde qué aparato.';

create index aprobacion_por_local on estook.aprobacion (local_id, creada_en);

alter table estook.aprobacion enable row level security;

create policy aprobacion_lectura on estook.aprobacion
  for select using (
    pedida_por = estook.persona_actual()
    or aprobada_por = estook.persona_actual()
    or estook.puede_ver('accion.quitar_de_cocina', local_id)
    or estook.es_el_sistema()
  );
create policy aprobacion_la_escribe_el_sistema on estook.aprobacion
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.aprobacion from public;
grant select, insert, update on estook.aprobacion to estook_api;

alter table estook.linea_de_cuenta
  add column aprobacion_id uuid references estook.aprobacion (id) on delete restrict;

comment on column estook.linea_de_cuenta.aprobacion_id is
  'Si se quitó ya en cocina por quien no puede quitarlo solo: la aprobación del encargado que tecleó su PIN (Anexo 3.4).';

-- La regla de la 0081, entera, con una cosa más: lo que ya está en cocina lo quita quien
-- tiene «Quitar de cocina» **o quien trae la aprobación de alguien que lo tiene**, de
-- hace menos de dos minutos y para ese plato.
create or replace function estook.lo_mandado_no_se_reescribe()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
declare
  v_persona uuid := estook.persona_actual();
begin
  -- Lo quitado se queda como se quitó.
  if old.quitada_en is not null
     and (new.quitada_en, new.quitada_por, new.motivo_de_quitar, new.salio_en, new.nota, new.cantidad)
         is distinct from
         (old.quitada_en, old.quitada_por, old.motivo_de_quitar, old.salio_en, old.nota, old.cantidad) then
    raise exception 'linea_quitada: un plato quitado ya no se cambia'
      using errcode = 'P0001';
  end if;

  if old.mandada_en is not null then
    -- Lo que es, cuántos, a qué precio y a dónde va no cambia una vez en cocina.
    if (new.plato_id, new.menu_id, new.parte_de, new.nombre, new.cantidad, new.precio_centimos,
        new.destino, new.mandada_en)
       is distinct from
       (old.plato_id, old.menu_id, old.parte_de, old.nombre, old.cantidad, old.precio_centimos,
        old.destino, old.mandada_en) then
      raise exception 'linea_mandada: lo que ya está en cocina no se reescribe; se quita con motivo y se pide otra vez'
        using errcode = 'P0001';
    end if;
    -- Quitar lo que está en cocina pide motivo y el permiso de quitarlo, o la
    -- aprobación de quien lo tiene (0107).
    if old.quitada_en is null and new.quitada_en is not null then
      if new.motivo_de_quitar is null then
        raise exception 'falta_motivo: quitar lo que ya está en cocina pide un motivo'
          using errcode = 'P0001';
      end if;
      if v_persona is not null
         and not estook.puede_editar('accion.quitar_de_cocina', new.local_id)
         and not exists (
           select 1
             from estook.aprobacion a
            where a.id = new.aprobacion_id
              and a.local_id = new.local_id
              and a.operacion = 'quitar_de_cocina'
              and a.sobre in (new.id, new.parte_de)
              and a.pedida_por = v_persona
              and a.creada_en > now() - interval '2 minutes'
              and estook.nivel_de_permiso(a.aprobada_por, a.local_id, 'accion.quitar_de_cocina') = 'ver_y_editar'
         ) then
        raise exception 'sin_permiso: quitar lo que ya está en cocina lo aprueba un jefe'
          using errcode = '42501';
      end if;
    end if;
  elsif new.mandada_en is null
        and (new.salio_en is not null or new.vuelve_en is not null) then
    raise exception 'linea_sin_mandar: no se tacha lo que no ha llegado a cocina'
      using errcode = 'P0001';
  end if;

  -- Tachar y destachar es de la cocina. La sala solo lo destacha al devolverlo («VUELVE»).
  if v_persona is not null
     and new.salio_en is distinct from old.salio_en
     and not estook.puede_editar('accion.cocinar', new.local_id)
     and not (
       new.salio_en is null
       and new.vuelve_en is distinct from old.vuelve_en
       and estook.puede_editar('accion.tomar_nota', new.local_id)
     ) then
    raise exception 'sin_permiso: tachar lo que sale es de la cocina'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
