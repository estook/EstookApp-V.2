-- 0037 · La puerta del admin (antes de M8, entrega A1 · decisión 0041)
--
-- «Admin de Estook donde solo entrarán los que tengan rol admin. Ese ya dentro
--  podrá añadir a admin a otros.»
--
-- Cuatro cosas, y ninguna toca un dato de un restaurante:
--
--   1. **El esquema `plataforma`**, aparte de `estook`. Lo que es nuestro —quién
--      administra Estook, y más adelante los contratos y los vendedores— no vive
--      entre las tablas de los clientes.
--   2. **Quién es admin**, con su nivel y su historia. Ser admin **no es un rol de
--      la matriz de M1**: esos viven dentro de una organización, y un admin no
--      pertenece a ninguna por serlo. Así ningún rol de cliente llega nunca aquí.
--   3. **La auditoría del admin**, que solo se añade, igual que la de M1.
--   4. **La sesión del admin**: se marca, y la base no le deja durar más de ocho
--      horas. El despachador no deja usar una sesión de la app en el admin, ni al
--      revés.
--
-- Dos funciones con privilegio, y las dos tasadas por una prueba:
--
--   · `plataforma.nivel_de`: las políticas preguntan «¿es admin quien mira?», y
--     para contestarlo hay que leer `administrador`, que tiene su propia política
--     haciendo la misma pregunta. Sin privilegio, la pregunta se llama a sí misma.
--     Es la misma razón que obligó a M1 con `locales_visibles`.
--   · `plataforma.dar_acceso`: dar acceso a alguien que todavía no tiene cuenta es
--     crear una persona **sin membresía**, y una persona sin membresía no la puede
--     leer nadie, ni siquiera quien la acaba de crear. Comprueba ella misma que
--     quien llama es admin total, igual que `dar_de_alta_persona` (0019).

-- ── 1 · El esquema ───────────────────────────────────────────────────────────

create schema plataforma;

comment on schema plataforma is
  'Lo que es de Estook y no de un cliente: quién administra, y más adelante contratos y vendedores (0041).';

revoke all on schema plataforma from public;
grant usage on schema plataforma to estook_api;

-- ── 2 · Quién administra ─────────────────────────────────────────────────────

create type plataforma.nivel as enum ('total', 'comercial', 'soporte', 'vendedor');

comment on type plataforma.nivel is
  'Total lo hace todo. Comercial, soporte y vendedor se estrenan con sus entregas (0041); hoy solo se usa total.';

create table plataforma.administrador (
  id                uuid              primary key default gen_random_uuid(),
  persona_id        uuid              not null references estook.persona (id) on delete restrict,
  nivel             plataforma.nivel  not null,
  dado_en           timestamptz       not null default now(),
  -- Nulo cuando lo dio la consola (`bd:dar-admin`): la primera cuenta no la da nadie.
  dado_por          uuid                  null references estook.persona (id) on delete restrict,
  -- Nada se borra (principio 6): quitar el acceso cierra la fila.
  quitado_en        timestamptz,
  quitado_por       uuid                  null references estook.persona (id) on delete restrict,
  motivo_de_quitar  text,
  constraint administrador_quitado_con_quien check (
    (quitado_en is null and quitado_por is null and motivo_de_quitar is null)
    or (quitado_en is not null and quitado_por is not null
        and length(btrim(coalesce(motivo_de_quitar, ''))) > 0)
  ),
  constraint administrador_quitado_despues_de_dado check (quitado_en is null or quitado_en >= dado_en)
);

comment on table plataforma.administrador is
  'Quién administra Estook, desde cuándo y hasta cuándo. Solo una fila viva por persona; las cerradas son la historia.';

create unique index administrador_uno_vivo_por_persona
  on plataforma.administrador (persona_id)
  where quitado_en is null;

-- Nunca se quita al último admin total, ni se le baja de nivel. **Lo guarda la
-- base**, y no solo el comando: una consola distraída no puede dejar Estook sin
-- nadie que lo administre.
create function plataforma.queda_un_total()
returns trigger
language plpgsql
as $$
begin
  if old.nivel = 'total' and old.quitado_en is null
     and (new.quitado_en is not null or new.nivel <> 'total')
     and not exists (
       select 1
         from plataforma.administrador a
        where a.id <> old.id and a.nivel = 'total' and a.quitado_en is null
     ) then
    raise exception 'Estook no se puede quedar sin ningún admin total.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger administrador_queda_un_total
  before update on plataforma.administrador
  for each row execute function plataforma.queda_un_total();

-- Y no se borra: se cierra.
create function plataforma.administrador_no_se_borra()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Un admin no se borra: se le quita el acceso, y la fila se queda como historia.'
    using errcode = '42501';
end;
$$;

create trigger administrador_sin_borrar
  before delete on plataforma.administrador
  for each statement execute function plataforma.administrador_no_se_borra();

-- ── 3 · La auditoría del admin ───────────────────────────────────────────────
--
-- Aparte de `estook.auditoria` porque aquella exige una organización, y dar acceso
-- a un admin no es de ninguna. Lo que un admin haga **sobre un cliente** se
-- copiará además a la auditoría de ese cliente (A2), que es quien tiene que verlo.

create table plataforma.auditoria (
  id              bigint            generated always as identity primary key,
  ocurrido_en     timestamptz       not null default now(),
  -- Quién. Nulo cuando lo hizo la consola.
  persona_id      uuid                  null references estook.persona (id) on delete restrict,
  -- Su nivel en ese momento: mañana puede tener otro.
  nivel           plataforma.nivel      null,
  -- Desde qué sesión, y por ella desde qué aparato.
  sesion_id       uuid                  null references estook.sesion (id) on delete restrict,
  -- La dirección de la petición, tal como llega a la API.
  ip              text,
  correlacion_id  uuid,
  accion          text              not null,
  entidad         text              not null,
  entidad_id      text,
  antes           jsonb,
  despues         jsonb,
  motivo          text,
  constraint auditoria_de_plataforma_accion_no_vacia check (length(btrim(accion)) > 0),
  constraint auditoria_de_plataforma_entidad_no_vacia check (length(btrim(entidad)) > 0),
  constraint auditoria_de_plataforma_ip_corta check (ip is null or length(ip) <= 64)
);

comment on table plataforma.auditoria is
  'Todo lo que cambia algo en el admin. Solo se añade: ni se modifica ni se borra, y lo impide la base de datos.';

create index auditoria_de_plataforma_por_fecha on plataforma.auditoria (ocurrido_en desc);
create index auditoria_de_plataforma_por_entidad on plataforma.auditoria (entidad, entidad_id);

-- El mismo guardián que la auditoría de M1: los permisos no aplican al dueño de
-- la tabla, y esto sí.
create trigger auditoria_de_plataforma_sin_modificar
  before update on plataforma.auditoria
  for each statement execute function estook.auditoria_solo_se_anade();

create trigger auditoria_de_plataforma_sin_borrar
  before delete on plataforma.auditoria
  for each statement execute function estook.auditoria_solo_se_anade();

-- ── 4 · La sesión del admin ──────────────────────────────────────────────────

alter table estook.sesion
  add column para_admin boolean not null default false;

-- Ocho horas como mucho, y lo dice la base: una sesión del admin olvidada abierta
-- en un portátil no puede valer un mes, como una de la app.
alter table estook.sesion
  add constraint sesion_de_admin_dura_ocho_horas check (
    not para_admin or caduca_en <= creada_en + interval '8 hours'
  );

comment on column estook.sesion.para_admin is
  'Una sesión abierta desde el admin. Solo vale para el admin, y el admin solo acepta estas (0041).';

-- ── Las dos funciones con privilegio ─────────────────────────────────────────

create function plataforma.nivel_de(p_persona uuid)
returns plataforma.nivel
language sql
stable
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
  select a.nivel
    from plataforma.administrador a
    join estook.persona p on p.id = a.persona_id and p.activa
   where a.persona_id = p_persona
     and a.quitado_en is null
$$;

comment on function plataforma.nivel_de(uuid) is
  'El nivel de admin vivo de una persona, o nulo. Con privilegio porque las políticas de `administrador` la llaman a ella.';

create function plataforma.dar_acceso(
  p_correo text,
  p_nombre text,
  p_nivel plataforma.nivel,
  p_derivada text
)
returns table (persona_id uuid, persona_nueva boolean, clave_puesta boolean)
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  quien        uuid := estook.persona_actual();
  el_correo    text := lower(btrim(p_correo));
  la_persona   uuid;
  de_ejemplo   boolean;
  nueva        boolean := false;
  con_clave    boolean := false;
begin
  -- Comprueba lo suyo: solo un admin total da acceso. Sin esto, cualquiera que
  -- pudiera ejecutar la función se daría acceso a sí mismo.
  if quien is null or plataforma.nivel_de(quien) is distinct from 'total' then
    raise exception 'Solo un admin total puede dar acceso al admin.'
      using errcode = '42501';
  end if;

  select p.id, p.es_ejemplo into la_persona, de_ejemplo
    from estook.persona p
   where p.correo = el_correo;

  -- Una persona de ejemplo tiene su contraseña publicada en el repositorio: no
  -- entra en el admin de nadie.
  if de_ejemplo then
    raise exception 'Una persona de ejemplo no puede ser admin.'
      using errcode = '42501';
  end if;

  if la_persona is null then
    insert into estook.persona (correo, nombre, es_ejemplo)
    values (el_correo, btrim(p_nombre), false)
    returning id into la_persona;
    nueva := true;
  end if;

  -- Sin contraseña no se entra al admin (el PIN no vale). Si no tiene, se le pone
  -- la de un solo uso y tendrá que cambiarla al entrar. **La que tenga no se toca.**
  if not exists (select 1 from estook.credencial c where c.persona_id = la_persona) then
    insert into estook.credencial (persona_id, derivada, debe_cambiarla)
    values (la_persona, p_derivada, true);
    con_clave := true;
  end if;

  insert into plataforma.administrador (persona_id, nivel, dado_por)
  values (la_persona, p_nivel, quien);

  return query select la_persona, nueva, con_clave;
end;
$$;

comment on function plataforma.dar_acceso(text, text, plataforma.nivel, text) is
  'Da acceso al admin, creando la persona y su clave de un solo uso si no las tiene. Comprueba ella misma que quien llama es admin total.';

-- ── Seguridad por filas ──────────────────────────────────────────────────────

alter table plataforma.administrador enable row level security;
alter table plataforma.auditoria     enable row level security;

-- Los admins los ve un admin. Los cambia un admin total (quitar el acceso).
create policy administrador_lectura on plataforma.administrador
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy administrador_escritura on plataforma.administrador
  for update using (plataforma.nivel_de(estook.persona_actual()) = 'total')
  with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

-- La auditoría la lee un admin y la escribe un admin, **siempre en su nombre**.
create policy auditoria_de_plataforma_lectura on plataforma.auditoria
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy auditoria_de_plataforma_escritura on plataforma.auditoria
  for insert with check (
    plataforma.nivel_de(estook.persona_actual()) is not null
    and persona_id = estook.persona_actual()
  );

-- Un admin ve el nombre y el correo **de los demás admins**, y de nadie más. Una
-- persona sin membresía no la ve nadie (M1), y un admin puede no tener ninguna.
create policy persona_la_ve_un_admin_si_es_admin on estook.persona
  for select using (
    plataforma.nivel_de(estook.persona_actual()) is not null
    and exists (
      select 1 from plataforma.administrador a where a.persona_id = estook.persona.id
    )
  );

-- ── `sesion_activa`, que ahora dice si la sesión es del admin ────────────────
--
-- Copiada entera de la 0020 y con una columna más: una función que devuelve tabla
-- no se amplía, se sustituye.

drop function if exists estook.sesion_activa(text);

create function estook.sesion_activa(p_huella text)
returns table (
  sesion_id             uuid,
  persona_id            uuid,
  organizacion_id       uuid,
  local_id              uuid,
  doble_factor_superado boolean,
  debe_cambiar_clave    boolean,
  es_demostracion       boolean,
  para_admin            boolean
)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  -- Se refresca la actividad, pero solo si hace mas de quince minutos: escribir
  -- una fila en cada peticion, para nada.
  update estook.sesion s
     set ultima_actividad_en = now()
   where s.huella = p_huella
     and s.cerrada_en is null
     and s.caduca_en > now()
     and s.ultima_actividad_en < now() - interval '15 minutes';

  -- El `join` con la persona **y su `activa`** no es decorativo: es lo que hace
  -- que retirarle el acceso a alguien mate sus sesiones al instante, sin esperar
  -- a que caduquen. Estaba en la 0018 y se conserva tal cual.
  return query
    select s.id, s.persona_id, s.organizacion_id, s.local_id, s.doble_factor_superado,
           coalesce(c.debe_cambiarla, false),
           s.es_demostracion,
           s.para_admin
      from estook.sesion s
      join estook.persona p on p.id = s.persona_id and p.activa
      left join estook.credencial c on c.persona_id = s.persona_id
     where s.huella = p_huella
       and s.cerrada_en is null
       and s.caduca_en > now();
end;
$$;

comment on function estook.sesion_activa(text) is
  'De la huella del token a quien pregunta. Se llama antes de declarar la identidad, asi que tiene que ver sin ella. Desde M5 dice si la visita es una demostracion, y desde la 0037 si la sesion es del admin.';

-- ── Permisos ─────────────────────────────────────────────────────────────────

revoke all on plataforma.administrador from public;
revoke all on plataforma.auditoria from public;

grant select, update on plataforma.administrador to estook_api;
-- Deliberadamente sin update ni delete, como la de M1.
grant select, insert on plataforma.auditoria to estook_api;
grant usage, select on all sequences in schema plataforma to estook_api;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'plataforma.nivel_de(uuid)',
    'plataforma.dar_acceso(text, text, plataforma.nivel, text)',
    'estook.sesion_activa(text)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;
