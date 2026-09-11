-- 0032 · El Calendario recoge lo de todos (M7, decisión 0031)
--
-- «Sí, también, para que lo sepa la gente. Incluso que puedan elegir qué roles
--  ven algún aviso en el calendario. Es un calendario avanzado: todo lo que sea
--  necesario, que quede bien sin pasarse» (Richi, al cerrar M6½).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- Lo que hay que entender antes de leer la tabla
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Los módulos publican; el Calendario pinta ───────────────────────────────
--
-- El Calendario **no va a buscar nada** a Inventario ni a Compras. Cada módulo
-- escribe aquí lo suyo en la misma transacción que lo provoca, con una reacción
-- (0014), y si su origen cambia o se va, su evento cambia o se va con él. Así M14,
-- que pintará mes, semana y día, **no tiene que rehacer nada**: lee una tabla.
--
-- ── Uno por origen, y por eso publicar dos veces no duplica ─────────────────
--
-- Cada evento sabe de qué fila sale —«el pedido tal», «el lote tal», «los repartos
-- de tal proveedor»—, y esa pareja es única. Publicar es escribir o reescribir la
-- misma fila: reaccionar dos veces al mismo cambio deja un evento, no dos.
--
-- ── Lo que se repite no se copia cien veces ─────────────────────────────────
--
-- «Makro reparte martes y viernes» es **una fila** con los días de la semana, no
-- una fila por martes hasta el fin de los tiempos. Copiarlas obligaría a tener un
-- proceso que las vaya fabricando, y a borrarlas todas el día que Makro cambie de
-- día. Quien lee las despliega en el rango que mira, con una función del dominio.
--
-- ── Quién ve qué, lo decide la base ─────────────────────────────────────────
--
-- Lo que publican los módulos lo ve **quien ve ese módulo**: una entrega o una
-- caducidad, quien lleva Inventario. Los avisos que publica una persona los ven
-- **los roles que ella elija**, y eso lo filtra la política de abajo, no la
-- pantalla: exactamente igual que las horas de cada uno (0025).

create type estook.capa_de_calendario as enum (
  'entrega',        -- M7 · los repartos de cada proveedor y los pedidos con fecha
  'caducidad',      -- M6 · los lotes con fecha
  'turno',          -- M14 · los turnos del cuadrante publicado
  'appcc',          -- M16 · el APPCC que toca cada día
  'mantenimiento',  -- M17 · revisiones y vencimientos de los equipos
  'aviso'           -- M14 · lo que publica una persona, para los roles que elija
);

comment on type estook.capa_de_calendario is
  'Cada capa la publica un modulo y se pinta con el color de su app. Se declaran todas de una vez porque son vocabulario.';

create table estook.evento_de_calendario (
  id        uuid  primary key default gen_random_uuid(),
  local_id  uuid  not null references estook.local (id) on delete cascade,
  capa      estook.capa_de_calendario  not null,

  -- De dónde sale: el nombre de lo que lo publica y su identificador. Es lo que
  -- permite reescribirlo en vez de duplicarlo, y seguirle los cambios.
  origen     text  not null,
  origen_id  text  not null,

  -- Cuándo. Un día, o del `dia` al `hasta_el`; con hora, o el día entero.
  dia       date  not null,
  hasta_el  date,
  desde     time,
  hasta     time,
  -- Los días de la semana en que se repite, del 1 (lunes) al 7 (domingo), a
  -- partir de `dia`. Nulo: no se repite.
  se_repite  smallint[],

  titulo   text  not null,
  detalle  text,
  -- Dónde se toca: «un evento de una entrega lleva a su pedido; uno de una
  -- caducidad, a su producto» (0031). Una dirección de la aplicación.
  ir       text,

  -- De quién es, para que lo concreto tape a lo que se repite: el martes que
  -- llega el pedido 23 de Makro no hace falta decir además «reparte Makro». Los
  -- dos llevan `proveedor:<id>`, y quien despliega se queda con el pedido.
  grupo    text,

  -- Qué roles lo ven, en los avisos. Nulo o vacío: todos los que ven su capa.
  roles    text[],
  -- Hecho: la entrega llegó, la tarea se hizo. Se queda en el calendario, tachado.
  hecho    boolean  not null default false,

  publicado_por   uuid  references estook.persona (id) on delete set null,
  es_ejemplo      boolean      not null default false,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),

  constraint evento_uno_por_origen unique (capa, origen, origen_id),
  constraint evento_titulo_no_vacio check (length(btrim(titulo)) > 0),
  constraint evento_fechas_coherentes check (hasta_el is null or hasta_el >= dia),
  constraint evento_se_repite_de_la_semana check (
    se_repite is null or (cardinality(se_repite) > 0 and se_repite <@ '{1,2,3,4,5,6,7}'::smallint[])
  )
);

comment on table estook.evento_de_calendario is
  'Todo lo que tiene fecha, venga del modulo que venga. Lo escribe el modulo de origen; el Calendario lo pinta. Uno por origen: publicar dos veces no duplica.';
comment on column estook.evento_de_calendario.roles is
  'Los roles que ven un aviso. Nulo o vacio: todos los que ven su capa. Lo filtra la politica, no la pantalla.';

create index evento_por_local_y_dia on estook.evento_de_calendario (local_id, dia);
create index evento_que_se_repite on estook.evento_de_calendario (local_id) where se_repite is not null;

create trigger evento_actualizado before update on estook.evento_de_calendario
  for each row execute function estook.marcar_actualizado();

-- Un rol inventado en un aviso no lo vería nadie, y nadie se enteraría. Se
-- rechaza al guardar, igual que un alérgeno inventado en un producto.
create or replace function estook.evento_roles_conocidos()
returns trigger
language plpgsql
as $$
begin
  if new.roles is not null and exists (
    select 1 from unnest(new.roles) r
     where not exists (select 1 from estook.rol where codigo = r)
  ) then
    raise exception 'Ese aviso nombra un rol que no existe.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger evento_con_roles_conocidos
  before insert or update on estook.evento_de_calendario
  for each row execute function estook.evento_roles_conocidos();

-- ── Mis roles en un local ────────────────────────────────────────────────────
--
-- Los de mis membresías vigentes que alcanzan ese local: la del propio local, la
-- de su área y la de su organización. **Sin privilegio**: cada persona puede leer
-- sus propias membresías (política de M1), y no hace falta ver las de nadie más
-- para saber las mías.

create or replace function estook.mis_roles_en(p_local uuid)
returns text[]
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(array_agg(distinct m.rol), '{}')
    from estook.membresia m
    join estook.local l on l.id = p_local
   where m.persona_id = estook.persona_actual()
     and m.desde <= current_date
     and (m.hasta is null or m.hasta >= current_date)
     and (
       m.local_id = p_local
       or (m.alcance = 'area' and m.area_id = l.area_id)
       or (m.alcance = 'organizacion' and m.organizacion_id = l.organizacion_id)
     )
$$;

comment on function estook.mis_roles_en(uuid) is
  'Los roles de quien pregunta en ese local, por cualquiera de sus membresias vigentes. Sin security definer: cada uno lee las suyas.';

-- ── Seguridad por filas ──────────────────────────────────────────────────────
--
-- Leer, por capas:
--
--   entrega, caducidad        quien ve Inventario en ese local
--   aviso                     quien ve el Calendario y es de uno de sus roles; y
--                             siempre quien lo puso y quien edita el Calendario,
--                             que es quien los gestiona
--   turno, appcc, mantenimiento  quien ve el Calendario. **M14, M16 y M17 afinan
--                             la suya** cuando empiecen a publicar: un turno lo
--                             verá su dueño y quien lleva a esa persona
--
-- Escribir, por el mismo reparto: lo de Inventario, quien lleva Inventario; lo del
-- Calendario, quien lo edita.

alter table estook.evento_de_calendario enable row level security;

create policy evento_lectura on estook.evento_de_calendario
  for select using (
    case capa
      when 'entrega' then estook.puede_ver('app.inventario', local_id)
      when 'caducidad' then estook.puede_ver('app.inventario', local_id)
      when 'aviso' then
        estook.puede_ver('app.calendario', local_id)
        and (
          coalesce(cardinality(roles), 0) = 0
          or roles && estook.mis_roles_en(local_id)
          or publicado_por = estook.persona_actual()
          or estook.puede_editar('app.calendario', local_id)
        )
      else estook.puede_ver('app.calendario', local_id)
    end
  );

create policy evento_escritura on estook.evento_de_calendario
  for all using (
    case capa
      when 'entrega' then estook.puede_editar('app.inventario', local_id)
      when 'caducidad' then estook.puede_editar('app.inventario', local_id)
      else estook.puede_editar('app.calendario', local_id)
    end
  )
  with check (
    case capa
      when 'entrega' then estook.puede_editar('app.inventario', local_id)
      when 'caducidad' then estook.puede_editar('app.inventario', local_id)
      else estook.puede_editar('app.calendario', local_id)
    end
  );

revoke all on estook.evento_de_calendario from public;
grant select, insert, update, delete on estook.evento_de_calendario to estook_api;

revoke all on function estook.mis_roles_en(uuid) from public;
grant execute on function estook.mis_roles_en(uuid) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- Las caducidades que ya había
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «M6 · las caducidades de los lotes, **con una migración que pone las que ya
--  hay**» (0031). Desde hoy las publica la reacción al nacer cada lote; las de
-- antes se ponen aquí, una por lote con fecha, con el mismo título y el mismo
-- destino que pondrá la reacción. Si el título se cambia en un sitio y no en el
-- otro, la prueba de las caducidades lo caza.

insert into estook.evento_de_calendario (
  local_id, capa, origen, origen_id, dia, titulo, detalle, ir, es_ejemplo
)
select l.local_id,
       'caducidad',
       'lote',
       l.id::text,
       l.caduca_el,
       'Caduca ' || p.nombre,
       case when l.codigo is null then null else 'Lote ' || l.codigo end,
       '/inventario/productos/todo?producto=' || p.id::text,
       l.es_ejemplo
  from estook.lote l
  join estook.producto p on p.id = l.producto_id
 where l.caduca_el is not null
   -- Los de ejemplo no: su evento no estaría apuntado como ejemplo, y «Quitar
   -- los ejemplos» se llevaría el lote y dejaría la caducidad huérfana. Los que
   -- nazcan desde hoy sí, porque la reacción los apunta.
   and not l.es_ejemplo
on conflict (capa, origen, origen_id) do nothing;
