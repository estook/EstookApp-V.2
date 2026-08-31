-- 0005 · Quien ve que
--
-- Modulo M1. Aqui vive `locales_visibles`, que es la pieza de la que cuelga todo
-- lo demas: cada politica de seguridad de cada tabla se escribe contra ella, y
-- nunca contra un identificador que mande el cliente. Eso ultimo es el error
-- tipico que M1 avisa de no cometer.

-- ── Quien esta preguntando ────────────────────────────────────────────────────

-- La API abre su conexion y hace `set local estook.persona_id = '...'` con la
-- persona que ha autenticado. Si nadie la ha puesto, esto devuelve vacio y las
-- politicas de seguridad no dejan ver nada. El fallo seguro.
--
-- Se hace asi, y no con `auth.uid()`, porque la API es nuestra (decision 0002) y
-- porque de este modo el modelo se puede probar en cualquier Postgres, sin
-- depender de que exista el esquema de autenticacion de Supabase.
create or replace function estook.persona_actual()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('estook.persona_id', true), '')::uuid
$$;

comment on function estook.persona_actual() is
  'La persona autenticada en esta conexion. Vacio si nadie la ha declarado.';

-- ── Que locales alcanza una persona ───────────────────────────────────────────

create or replace function estook.locales_visibles(p_persona uuid)
returns table (local_id uuid)
language sql
stable
-- SECURITY DEFINER a proposito: esta funcion es la autoridad sobre quien ve que,
-- asi que tiene que poder mirar todas las membresias. Sin esto, la politica de
-- `membresia` la llamaria a ella, que volveria a consultar `membresia`, que
-- volveria a aplicar la politica: recursion infinita y desbordamiento de pila.
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct l.id
  from estook.local l
  join estook.membresia m on m.organizacion_id = l.organizacion_id
  where m.persona_id = p_persona
    and l.activo
    -- Vigencia: una membresia que aun no empieza, o que ya caduco, no da acceso.
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date)
    and (
      -- Alcance de organizacion: todos los locales de la organizacion.
      m.alcance = 'organizacion'
      -- Alcance de area: los locales de esa area.
      or (m.alcance = 'area' and l.area_id = m.area_id)
      -- Alcance de local: ese local y ninguno mas.
      or (m.alcance = 'local' and l.id = m.local_id)
    )
$$;

comment on function estook.locales_visibles(uuid) is
  'Los locales que alcanza una persona por sus membresias vigentes. Toda politica RLS se escribe contra esto.';

-- La misma, para quien esta preguntando ahora.
create or replace function estook.locales_visibles()
returns table (local_id uuid)
language sql
stable
as $$
  select v.local_id from estook.locales_visibles(estook.persona_actual()) v
$$;

create or replace function estook.organizaciones_visibles(p_persona uuid)
returns table (organizacion_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct m.organizacion_id
  from estook.membresia m
  where m.persona_id = p_persona
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date)
$$;

create or replace function estook.organizaciones_visibles()
returns table (organizacion_id uuid)
language sql
stable
as $$
  select v.organizacion_id from estook.organizaciones_visibles(estook.persona_actual()) v
$$;

-- Quien comparte organizacion contigo. Tambien tiene que ser SECURITY DEFINER,
-- por lo mismo: la politica de `persona` no puede recorrer `membresia` con la
-- politica de `membresia` puesta.
create or replace function estook.personas_visibles(p_persona uuid)
returns table (persona_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p_persona
  union
  select distinct m.persona_id
  from estook.membresia m
  where m.organizacion_id in (
    select v.organizacion_id from estook.organizaciones_visibles(p_persona) v
  )
$$;

create or replace function estook.personas_visibles()
returns table (persona_id uuid)
language sql
stable
as $$
  select v.persona_id from estook.personas_visibles(estook.persona_actual()) v
$$;

-- ── Que nivel tiene sobre un permiso ──────────────────────────────────────────

-- «Si alguien tiene dos roles sobre el mismo local, gana el mas amplio.»
-- Se resuelve permiso a permiso: de todas las membresias que alcanzan ese local,
-- se queda el nivel mas alto. El recorte de una membresia pisa lo que trae su
-- rol, y puede subir o bajar.
create or replace function estook.nivel_de_permiso(
  p_persona uuid,
  p_local uuid,
  p_permiso text
)
returns estook.nivel_de_permiso
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select coalesce(rec.nivel, pr.nivel)
      from estook.membresia m
      join estook.local l
        on l.id = p_local
       and l.organizacion_id = m.organizacion_id
      left join estook.permiso_de_rol pr
        on pr.rol = m.rol
       and pr.permiso = p_permiso
      left join estook.recorte_de_permiso rec
        on rec.membresia_id = m.id
       and rec.local_id = p_local
       and rec.permiso = p_permiso
      where m.persona_id = p_persona
        and l.activo
        and m.desde <= current_date
        and (m.hasta is null or m.hasta >= current_date)
        and (
          m.alcance = 'organizacion'
          or (m.alcance = 'area' and l.area_id = m.area_id)
          or (m.alcance = 'local' and l.id = m.local_id)
        )
        -- O lo trae el rol, o se lo han dado expresamente con un recorte.
        and (pr.nivel is not null or rec.nivel is not null)
      order by coalesce(rec.nivel, pr.nivel) desc
      limit 1
    ),
    'sin_acceso'
  )
$$;

comment on function estook.nivel_de_permiso(uuid, uuid, text) is
  'El nivel efectivo sobre un local: gana el mas amplio de todas sus membresias, y el recorte pisa al rol.';

-- Los permisos de ambito organizacion no cuelgan de un local: plan, facturacion,
-- altas de local, catalogo maestro, contratos marco y exportacion contable.
create or replace function estook.nivel_de_permiso_en_organizacion(
  p_persona uuid,
  p_organizacion uuid,
  p_permiso text
)
returns estook.nivel_de_permiso
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select pr.nivel
      from estook.membresia m
      join estook.permiso_de_rol pr
        on pr.rol = m.rol
       and pr.permiso = p_permiso
      where m.persona_id = p_persona
        and m.organizacion_id = p_organizacion
        and m.desde <= current_date
        and (m.hasta is null or m.hasta >= current_date)
      order by pr.nivel desc
      limit 1
    ),
    'sin_acceso'
  )
$$;

-- ── Atajos para leer bien ─────────────────────────────────────────────────────

create or replace function estook.puede_ver(p_permiso text, p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.nivel_de_permiso(estook.persona_actual(), p_local, p_permiso) <> 'sin_acceso'
$$;

create or replace function estook.puede_editar(p_permiso text, p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.nivel_de_permiso(estook.persona_actual(), p_local, p_permiso) = 'ver_y_editar'
$$;
