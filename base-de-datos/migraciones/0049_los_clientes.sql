-- 0049 · A2 · Los clientes, vistos desde el admin (decisión 0041, panel de administración 2)
--
-- Lo que el admin necesita para llevar a cada cliente, **sin tocar sus datos**:
--
--   A · **La ficha comercial**: responsable, teléfono y correo de contacto, y qué tipo
--       de cliente es. Es nuestra, no del restaurante: la edita el admin.
--   B · **Las notas** de cada cliente: con autor y fecha, se añaden y no se editan; se
--       pueden fijar arriba.
--   C · **La foto diaria del uso**: la actividad de cada cliente, calculada cada noche
--       por el reloj (Richi, 25-sep). La lista no cuenta nada al abrirse.
--   D · **Cambiar el correo de acceso** con doble confirmación: un enlace al nuevo para
--       confirmarlo y otro al viejo para pararlo. Solo se guardan huellas.
--   E · **Las funciones con privilegio** que el admin necesita para leer a todos los
--       clientes: devuelven lo justo, y cada una comprueba que quien pregunta es admin
--       (o el sistema). La seguridad por filas de `estook` está hecha para que nadie
--       vea de más de un restaurante, y un admin no es de ninguno.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La ficha comercial
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.ficha_comercial (
  organizacion_id  uuid         primary key references estook.organizacion (id) on delete cascade,
  responsable      text,
  telefono         text,
  correo           text,
  tipo             text,
  actualizado_en   timestamptz  not null default now(),
  actualizado_por  uuid         references estook.persona (id) on delete set null,
  constraint ficha_tipo_conocido check (tipo is null or tipo in ('independiente', 'grupo', 'cadena')),
  constraint ficha_textos_cortos check (
    coalesce(length(responsable), 0) <= 160
    and coalesce(length(telefono), 0) <= 40
    and coalesce(length(correo), 0) <= 320
  )
);

comment on table plataforma.ficha_comercial is
  'Lo comercial de cada cliente: con quién se habla y qué tipo de cliente es. Es de Estook, no del restaurante (0041).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las notas
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.nota_de_cliente (
  id               bigint       generated always as identity primary key,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  autor_id         uuid         not null references estook.persona (id) on delete restrict,
  texto            text         not null,
  fijada           boolean      not null default false,
  creada_en        timestamptz  not null default now(),
  constraint nota_de_cliente_con_medida check (char_length(btrim(texto)) between 1 and 2000)
);

create index nota_de_cliente_por_cliente on plataforma.nota_de_cliente (organizacion_id, creada_en desc);

comment on table plataforma.nota_de_cliente is
  'Notas internas de cada cliente. Se añaden y no se editan: se corrigen con otra. Solo se fijan (0041).';

-- Lo único que se cambia de una nota es si va fijada; y no se borra.
create function plataforma.nota_de_cliente_solo_se_fija()
returns trigger
language plpgsql
set search_path = plataforma, pg_catalog, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una nota no se borra: se corrige con otra.';
  end if;
  if new.texto is distinct from old.texto or new.autor_id is distinct from old.autor_id
     or new.organizacion_id is distinct from old.organizacion_id
     or new.creada_en is distinct from old.creada_en then
    raise exception 'Una nota no se edita: se corrige con otra.';
  end if;
  return new;
end;
$$;

create trigger nota_de_cliente_se_fija_y_nada_mas
  before update or delete on plataforma.nota_de_cliente
  for each row execute function plataforma.nota_de_cliente_solo_se_fija();

-- ═══════════════════════════════════════════════════════════════════════════
-- C · La foto diaria del uso
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.uso_diario (
  organizacion_id  uuid     not null references estook.organizacion (id) on delete cascade,
  dia              date     not null,
  dias_de_alta     integer  not null,
  productos        integer  not null,
  dias_sin_entrar  integer,
  apuntes_7        integer  not null,
  apuntes_14       integer  not null,
  apuntes_14_antes integer  not null,
  actividad        text     not null,
  primary key (organizacion_id, dia),
  constraint uso_actividad_conocida check (
    actividad in ('activo', 'bajando', 'dormido', 'sin_estrenar', 'mira')
  )
);

comment on table plataforma.uso_diario is
  'Cómo usa Estook cada cliente, una foto por día que deja el reloj. La actividad la calcula el dominio (laActividad).';

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Cambiar el correo de acceso, con doble confirmación
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.cambio_de_correo (
  id                uuid         primary key default gen_random_uuid(),
  persona_id        uuid         not null references estook.persona (id) on delete cascade,
  correo_viejo      text         not null,
  correo_nuevo      text         not null,
  -- Las huellas de los dos enlaces, nunca los enlaces: quien se lleve la base no
  -- puede cambiar el correo de nadie.
  huella_confirmar  text         not null unique,
  huella_parar      text         not null unique,
  motivo            text         not null,
  pedido_por        uuid         not null references estook.persona (id) on delete restrict,
  pedido_en         timestamptz  not null default now(),
  caduca_en         timestamptz  not null,
  confirmado_en     timestamptz,
  parado_en         timestamptz,
  constraint cambio_de_correo_con_motivo check (length(btrim(motivo)) > 0),
  constraint cambio_de_correo_una_salida check (confirmado_en is null or parado_en is null)
);

comment on table plataforma.cambio_de_correo is
  'Cambios del correo de acceso pedidos por un admin: se confirman desde el nuevo o se paran desde el viejo (0041).';

-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad por filas de lo nuevo: el admin; y la foto del uso, también el sistema
-- ═══════════════════════════════════════════════════════════════════════════

alter table plataforma.ficha_comercial  enable row level security;
alter table plataforma.nota_de_cliente  enable row level security;
alter table plataforma.uso_diario       enable row level security;
alter table plataforma.cambio_de_correo enable row level security;

create policy ficha_comercial_del_admin on plataforma.ficha_comercial
  for all using (plataforma.nivel_de(estook.persona_actual()) is not null)
  with check (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy nota_de_cliente_lectura on plataforma.nota_de_cliente
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);
create policy nota_de_cliente_alta on plataforma.nota_de_cliente
  for insert with check (
    plataforma.nivel_de(estook.persona_actual()) is not null
    and autor_id = estook.persona_actual()
  );
create policy nota_de_cliente_fijar on plataforma.nota_de_cliente
  for update using (plataforma.nivel_de(estook.persona_actual()) is not null)
  with check (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy uso_diario_lectura on plataforma.uso_diario
  for select using (
    estook.es_el_sistema() or plataforma.nivel_de(estook.persona_actual()) is not null
  );
create policy uso_diario_escritura on plataforma.uso_diario
  for all using (
    estook.es_el_sistema() or plataforma.nivel_de(estook.persona_actual()) is not null
  )
  with check (
    estook.es_el_sistema() or plataforma.nivel_de(estook.persona_actual()) is not null
  );

-- Los cambios de correo se leen desde el admin; se crean, confirman y paran por sus
-- funciones, que comprueban lo suyo.
create policy cambio_de_correo_lectura on plataforma.cambio_de_correo
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);

revoke all on plataforma.ficha_comercial, plataforma.nota_de_cliente, plataforma.uso_diario,
  plataforma.cambio_de_correo from public;
grant select, insert, update on plataforma.ficha_comercial to estook_api;
grant select, insert, update on plataforma.nota_de_cliente to estook_api;
grant select, insert, update, delete on plataforma.uso_diario to estook_api;
grant select on plataforma.cambio_de_correo to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Las funciones con privilegio
-- ═══════════════════════════════════════════════════════════════════════════

-- Si quien pregunta es admin o el sistema. Cada función de abajo lo comprueba ella
-- misma: con que la API la llamara mal una vez, se leería a todos los clientes.
create function estook.es_admin_o_el_sistema()
returns boolean
language sql
stable
security definer
set search_path = estook, plataforma, pg_catalog, pg_temp
as $$
  select estook.es_el_sistema() or plataforma.nivel_de(estook.persona_actual()) is not null
$$;

comment on function estook.es_admin_o_el_sistema() is
  'Si la petición es de un admin vivo o del sistema (el reloj). La comprueban las funciones del admin (0041).';

-- La lista de clientes: lo de `las_cuentas` y lo que hace falta para buscarlos,
-- ordenarlos y saber cuándo entraron. **Ni un dato de dentro del restaurante.**
create function estook.los_clientes()
returns table (
  organizacion_id    uuid,
  codigo             text,
  nombre             text,
  es_ejemplo         boolean,
  alta               timestamptz,
  estado             text,
  plan               text,
  intervalo          text,
  locales_pagados    smallint,
  locales_activos    integer,
  prueba_hasta       date,
  periodo_hasta      timestamptz,
  cancela_al_acabar  boolean,
  impago_desde       timestamptz,
  de_la_casa         boolean,
  stripe_suscripcion text,
  stripe_cliente     text,
  stripe_modo        text,
  tarjeta            text,
  dias_de_prueba     smallint,
  correos            text[],
  ultimo_acceso      timestamptz,
  buscable           text
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_admin_o_el_sistema() then
    raise exception 'Solo el admin lee la lista de clientes.' using errcode = '42501';
  end if;

  return query
    select o.id, o.codigo, o.nombre, o.es_ejemplo, o.creado_en,
           s.estado::text, s.plan, s.intervalo, s.locales_pagados,
           (select count(*)::integer from estook.local l where l.organizacion_id = o.id and l.activo),
           s.prueba_hasta, s.periodo_hasta, s.cancela_al_acabar, s.impago_desde, s.de_la_casa,
           s.stripe_suscripcion, s.stripe_cliente, s.stripe_modo, s.tarjeta, s.dias_de_prueba,
           coalesce((
             select array_agg(distinct p.correo order by p.correo)
               from estook.membresia m
               join estook.persona p on p.id = m.persona_id
              where m.organizacion_id = o.id and m.rol = 'direccion'
                and m.desde <= current_date
                and (m.hasta is null or m.hasta >= current_date)
                and (m.revocada_en is null or m.revocada_en > now())
                and p.activa
           ), '{}'),
           -- La última vez que alguien de su gente entró o tuvo la app abierta, como
           -- `visto_por_ultima_vez` (0042): con la app instalada casi nunca se vuelve a entrar.
           (select max(greatest(p.ultimo_acceso_en, (select max(s2.visto_en) from estook.sesion s2 where s2.persona_id = p.id and not s2.para_admin)))
              from estook.membresia m
              join estook.persona p on p.id = m.persona_id
             where m.organizacion_id = o.id and not p.es_ejemplo),
           -- Lo que se busca: el nombre y el código, sus locales, sus teléfonos y los
           -- correos de su gente. Sin acentos y en minúsculas, como el buscador (0009).
           lower(estook.sin_acentos(concat_ws(' ',
             o.nombre, o.codigo,
             (select string_agg(concat_ws(' ', l.nombre, l.poblacion, l.telefono, l.google_telefono), ' ')
                from estook.local l where l.organizacion_id = o.id),
             (select string_agg(p.correo, ' ')
                from estook.membresia m join estook.persona p on p.id = m.persona_id
               where m.organizacion_id = o.id),
             (select concat_ws(' ', f.responsable, f.telefono, f.correo)
                from plataforma.ficha_comercial f where f.organizacion_id = o.id)
           )))
      from estook.organizacion o
      join estook.suscripcion s on s.organizacion_id = o.id
     where o.activa;
end;
$$;

comment on function estook.los_clientes() is
  'Todos los clientes para el admin: su suscripción, sus correos de dirección, su último acceso y lo buscable. Nada de dentro (0041).';

-- Un cliente: sus locales, su gente con su rol —sin datos personales (Roles 4.8)—,
-- y quién es el dueño de la cuenta con lo que importa para soporte.
create function estook.un_cliente(p_organizacion uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  resultado jsonb;
begin
  if not estook.es_admin_o_el_sistema() then
    raise exception 'Solo el admin lee la ficha de un cliente.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'locales', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nombre', l.nombre, 'poblacion', l.poblacion, 'direccion', l.direccion,
               'telefono', coalesce(l.telefono, l.google_telefono), 'activo', l.activo,
               'carta', l.direccion_de_la_carta,
               'altaTerminada', l.onboarding_terminado)
             order by l.creado_en)
        from estook.local l where l.organizacion_id = p_organizacion
    ), '[]'::jsonb),
    'personas', coalesce((
      select jsonb_agg(persona order by (persona ->> 'nombre'))
        from (
          select distinct on (p.id) jsonb_build_object(
                   'id', p.id, 'nombre', p.nombre, 'rol', m.rol::text,
                   'correo', case when m.rol = 'direccion' then p.correo end,
                   'esDireccion', m.rol = 'direccion',
                   'ultimoAcceso', greatest(p.ultimo_acceso_en, (select max(s2.visto_en) from estook.sesion s2 where s2.persona_id = p.id and not s2.para_admin)),
                   'estaSemana', coalesce(greatest(p.ultimo_acceso_en, (select max(s2.visto_en) from estook.sesion s2 where s2.persona_id = p.id and not s2.para_admin)) > now() - interval '7 days', false),
                   'dobleFactor', exists (
                     select 1 from estook.doble_factor d
                      where d.persona_id = p.id and d.confirmado_en is not null),
                   'sesiones', (select count(*) from estook.sesion s
                                 where s.persona_id = p.id and s.cerrada_en is null
                                   and s.caduca_en > now() and not s.para_admin),
                   'creada', p.creado_en
                 ) as persona
            from estook.membresia m
            join estook.persona p on p.id = m.persona_id
           where m.organizacion_id = p_organizacion
             and (m.revocada_en is null or m.revocada_en > now())
             and (m.hasta is null or m.hasta >= current_date)
             and p.activa and not p.es_ejemplo
           order by p.id, (m.rol = 'direccion') desc
        ) gente
    ), '[]'::jsonb),
    -- Lo último que apuntó su gente: qué y cuándo, **sin el contenido** (0041).
    'ultimoApunte', (
      select jsonb_build_object('accion', a.accion, 'entidad', a.entidad, 'en', a.ocurrido_en)
        from estook.auditoria a
       where a.organizacion_id = p_organizacion
         and exists (select 1 from estook.membresia m
                      where m.organizacion_id = p_organizacion and m.persona_id = a.persona_id)
       order by a.ocurrido_en desc
       limit 1
    )
  ) into resultado;

  return resultado;
end;
$$;

comment on function estook.un_cliente(uuid) is
  'Los locales de un cliente, su gente con su rol —sin datos personales salvo el correo de quien lo dirige— y lo último que apuntó, sin el contenido (0041, Roles 4.8).';

-- Lo que hace cada cliente, para la foto diaria: días de alta, productos, días sin
-- entrar y lo apuntado en 7, 14 y los 14 de antes. **Cuenta, no decide**: la
-- actividad la saca el dominio.
create function estook.lo_que_hacen_los_clientes()
returns table (
  organizacion_id   uuid,
  dias_de_alta      integer,
  productos         integer,
  dias_sin_entrar   integer,
  apuntes_7         integer,
  apuntes_14        integer,
  apuntes_14_antes  integer
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_admin_o_el_sistema() then
    raise exception 'Solo el admin y el reloj miran el uso de los clientes.' using errcode = '42501';
  end if;

  return query
    -- Lo apuntado es **trabajo**: lo que su gente escribe en Estook. Montar la cuenta
    -- también deja rastro —la organización, el local, las categorías, las personas,
    -- el segundo factor, el Panel—, y contarlo haría «activo» a quien acaba de darse
    -- de alta y no ha hecho nada. Una sola pasada por la auditoría, no tres por cliente.
    with trabajo as (
      select a.organizacion_id,
             count(*) filter (where a.ocurrido_en > now() - interval '7 days')::integer as en_7,
             count(*) filter (where a.ocurrido_en > now() - interval '14 days')::integer as en_14,
             count(*) filter (where a.ocurrido_en <= now() - interval '14 days')::integer as en_14_antes
        from estook.auditoria a
       where a.persona_id is not null
         and a.ocurrido_en > now() - interval '28 days'
         and a.entidad not in (
           'organizacion', 'local', 'area', 'persona', 'membresia', 'credencial', 'pin',
           'dispositivo', 'doble_factor', 'panel_de_persona', 'suscripcion',
           'categoria_de_producto', 'politica_de_catalogo', 'recorte_de_permiso',
           'regla_fiscal', 'traduccion', 'sesion', 'onboarding', 'ejemplos'
         )
       group by a.organizacion_id
    )
    select o.id,
           (current_date - o.creado_en::date)::integer,
           (select count(*)::integer from estook.producto p
              join estook.local l on l.id = p.local_id
             where l.organizacion_id = o.id and not p.es_ejemplo and p.activo),
           (select (current_date - max(greatest(p.ultimo_acceso_en, (select max(s2.visto_en) from estook.sesion s2 where s2.persona_id = p.id and not s2.para_admin)))::date)::integer
              from estook.membresia m join estook.persona p on p.id = m.persona_id
             where m.organizacion_id = o.id and not p.es_ejemplo),
           coalesce(t.en_7, 0), coalesce(t.en_14, 0), coalesce(t.en_14_antes, 0)
      from estook.organizacion o
      left join trabajo t on t.organizacion_id = o.id
     where o.activa and not o.es_ejemplo;
end;
$$;

comment on function estook.lo_que_hacen_los_clientes() is
  'Lo que cuenta la foto diaria del uso de cada cliente. La actividad la decide el dominio (0041).';

-- El uso de un cliente, **solo de lo que existe** (0041): cada cosa en los últimos 30
-- días frente a los 30 de antes.
create function estook.el_uso_de(p_organizacion uuid)
returns table (que text, ultimos integer, anteriores integer)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_admin_o_el_sistema() then
    raise exception 'Solo el admin mira el uso de un cliente.' using errcode = '42501';
  end if;

  return query
    with locales as (select l.id from estook.local l where l.organizacion_id = p_organizacion),
    cosas (que, en) as (
      select 'productos', p.creado_en from estook.producto p
       where p.local_id in (select id from locales) and not p.es_ejemplo
      union all
      select 'proveedores', v.creado_en from estook.proveedor v
       where v.local_id in (select id from locales) and not v.es_ejemplo
      union all
      select 'pedidos', d.creado_en from estook.pedido_de_compra d
       where d.local_id in (select id from locales) and not d.es_ejemplo
      union all
      select 'albaranes', b.recibido_en from estook.albaran b
       where b.local_id in (select id from locales) and not b.es_ejemplo
      union all
      select 'facturas', f.registrada_en from estook.factura_de_compra f
       where f.local_id in (select id from locales) and not f.es_ejemplo
      union all
      select case m.tipo::text when 'merma' then 'mermas' else 'inventarios' end, m.ocurrido_en
        from estook.movimiento_de_stock m
       where m.local_id in (select id from locales) and not m.es_ejemplo
         and m.tipo::text in ('merma', 'recuento')
      union all
      select 'cierres', c.cerrado_en from estook.cierre_de_caja c
       where c.local_id in (select id from locales) and not c.es_ejemplo
      union all
      select 'fichajes', j.entro_en from estook.fichaje j
       where j.local_id in (select id from locales) and not j.es_ejemplo
    )
    select c.que,
           count(*) filter (where c.en > now() - interval '30 days')::integer,
           count(*) filter (where c.en <= now() - interval '30 days' and c.en > now() - interval '60 days')::integer
      from cosas c
     group by c.que;
end;
$$;

comment on function estook.el_uso_de(uuid) is
  'Lo que un cliente ha hecho con Estook en 30 días y en los 30 de antes, contado por cosa. Solo lo que existe (0041).';

-- Lo que el admin hace sobre un cliente, **en la auditoría del cliente** (Roles 4.3):
-- «Estook cambió el nombre de tu organización · motivo: lo pidió por teléfono».
create function estook.anotar_desde_el_admin(
  p_organizacion uuid,
  p_accion text,
  p_entidad text,
  p_entidad_id text,
  p_antes jsonb,
  p_despues jsonb,
  p_motivo text
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if plataforma.nivel_de(estook.persona_actual()) is null then
    raise exception 'Solo un admin anota en la auditoría de un cliente.' using errcode = '42501';
  end if;
  insert into estook.auditoria (
    organizacion_id, persona_id, correlacion_id, accion, entidad, entidad_id, antes, despues, motivo
  )
  values (
    p_organizacion, estook.persona_actual(),
    nullif(current_setting('estook.correlacion_id', true), '')::uuid,
    p_accion, p_entidad, p_entidad_id, p_antes, p_despues, p_motivo
  );
end;
$$;

comment on function estook.anotar_desde_el_admin(uuid, text, text, text, jsonb, jsonb, text) is
  'Copia a la auditoría de un cliente lo que un admin hace sobre él, en nombre del admin (0041, Roles 4.3).';

-- Cambiar el nombre de una organización desde el admin, con motivo.
create function estook.renombrar_desde_el_admin(p_organizacion uuid, p_nombre text)
returns text
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  antes text;
begin
  if plataforma.nivel_de(estook.persona_actual()) is null then
    raise exception 'Solo un admin cambia el nombre de un cliente.' using errcode = '42501';
  end if;
  select o.nombre into antes from estook.organizacion o where o.id = p_organizacion for update;
  if not found then
    raise exception 'Ese cliente no existe.' using errcode = 'P0002';
  end if;
  update estook.organizacion set nombre = btrim(p_nombre), actualizado_en = now()
   where id = p_organizacion;
  return antes;
end;
$$;

comment on function estook.renombrar_desde_el_admin(uuid, text) is
  'El nombre de una organización, cambiado por un admin; devuelve el de antes para la auditoría (0041).';

-- Marcar a un cliente «de la casa» —no paga— o quitárselo, desde el admin, con su
-- historial. Quitárselo lo deja pendiente de pago: tendrá que elegir plan (0048).
create function estook.poner_de_la_casa(p_organizacion uuid, p_si boolean, p_porque text)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $fn$
declare
  quien  uuid := estook.persona_actual();
  antes  estook.estado_de_suscripcion;
  ahora  estook.estado_de_suscripcion;
begin
  if quien is null or plataforma.nivel_de(quien) is distinct from 'total' then
    raise exception 'Solo un admin total decide quién no paga.' using errcode = '42501';
  end if;
  select s.estado into antes from estook.suscripcion s where s.organizacion_id = p_organizacion
   for update;
  if not found then
    raise exception 'Ese cliente no tiene suscripción.' using errcode = 'P0002';
  end if;
  update estook.suscripcion s
     set de_la_casa = p_si,
         estado = case when p_si then 'activa'::estook.estado_de_suscripcion
                       when s.stripe_suscripcion is null then 'pendiente_de_pago'::estook.estado_de_suscripcion
                       else s.estado end,
         prueba_hasta = case when p_si then null else s.prueba_hasta end
   where s.organizacion_id = p_organizacion
  returning s.estado into ahora;
  insert into plataforma.cambio_de_suscripcion (organizacion_id, de_estado, a_estado, plan, quien, porque)
  values (p_organizacion, antes::text, ahora::text, null, 'admin:' || quien::text,
          case when p_si then 'de la casa: ' else 'deja de ser de la casa: ' end || btrim(p_porque));
end;
$fn$;

comment on function estook.poner_de_la_casa(uuid, boolean, text) is
  'Marca a un cliente de la casa (no paga) o se lo quita, desde el admin total, con su historial (0041, 0048).';

-- Pedir el cambio del correo de acceso: guarda las dos huellas y devuelve el correo
-- de ahora, que es a donde va el aviso de «párelo si no ha sido usted».
create function plataforma.pedir_cambio_de_correo(
  p_persona uuid,
  p_correo_nuevo text,
  p_huella_confirmar text,
  p_huella_parar text,
  p_motivo text,
  p_caduca_en timestamptz
)
returns text
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  quien   uuid := estook.persona_actual();
  viejo   text;
  nuevo   text := lower(btrim(p_correo_nuevo));
begin
  if quien is null or plataforma.nivel_de(quien) is distinct from 'total' then
    raise exception 'Solo un admin total cambia el correo de acceso de alguien.' using errcode = '42501';
  end if;
  select p.correo into viejo from estook.persona p where p.id = p_persona and p.activa and not p.es_ejemplo;
  if viejo is null then
    raise exception 'Esa persona no está.' using errcode = 'P0002';
  end if;
  if exists (select 1 from estook.persona p where p.correo = nuevo) then
    raise exception 'Ese correo ya es de otra cuenta de Estook.' using errcode = '23505';
  end if;
  -- Uno vivo por persona: el de antes se para.
  update plataforma.cambio_de_correo
     set parado_en = now()
   where persona_id = p_persona and confirmado_en is null and parado_en is null;
  insert into plataforma.cambio_de_correo (
    persona_id, correo_viejo, correo_nuevo, huella_confirmar, huella_parar, motivo, pedido_por, caduca_en
  )
  values (p_persona, viejo, nuevo, p_huella_confirmar, p_huella_parar, btrim(p_motivo), quien, p_caduca_en);
  return viejo;
end;
$$;

comment on function plataforma.pedir_cambio_de_correo(uuid, text, text, text, text, timestamptz) is
  'Pide el cambio del correo de acceso de una persona (admin total). Devuelve el correo de ahora (0041).';

-- Confirmarlo desde el correo nuevo: cambia el correo, cierra sus sesiones y deja rastro.
create function plataforma.confirmar_cambio_de_correo(p_huella text)
returns table (persona_id uuid, correo_viejo text, correo_nuevo text)
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  cambio plataforma.cambio_de_correo%rowtype;
begin
  select * into cambio from plataforma.cambio_de_correo c
   where c.huella_confirmar = p_huella for update;
  if not found or cambio.parado_en is not null or cambio.confirmado_en is not null
     or cambio.caduca_en < now() then
    return;
  end if;
  update estook.persona set correo = cambio.correo_nuevo, actualizado_en = now()
   where id = cambio.persona_id;
  update plataforma.cambio_de_correo set confirmado_en = now() where id = cambio.id;
  perform estook.cerrar_sesiones_de(cambio.persona_id, null);
  return query select cambio.persona_id, cambio.correo_viejo, cambio.correo_nuevo;
end;
$$;

comment on function plataforma.confirmar_cambio_de_correo(text) is
  'Confirma un cambio de correo desde el enlace del correo nuevo, y cierra las sesiones de esa persona (0041).';

-- Pararlo desde el correo viejo.
create function plataforma.parar_cambio_de_correo(p_huella text)
returns boolean
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  parado boolean;
begin
  update plataforma.cambio_de_correo c set parado_en = now()
   where c.huella_parar = p_huella and c.confirmado_en is null and c.parado_en is null
  returning true into parado;
  return coalesce(parado, false);
end;
$$;

comment on function plataforma.parar_cambio_de_correo(text) is
  'Para un cambio de correo desde el enlace que llega al correo de ahora (0041).';

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.es_admin_o_el_sistema()',
    'estook.los_clientes()',
    'estook.un_cliente(uuid)',
    'estook.lo_que_hacen_los_clientes()',
    'estook.el_uso_de(uuid)',
    'estook.anotar_desde_el_admin(uuid, text, text, text, jsonb, jsonb, text)',
    'estook.renombrar_desde_el_admin(uuid, text)',
    'estook.poner_de_la_casa(uuid, boolean, text)',
    'plataforma.pedir_cambio_de_correo(uuid, text, text, text, text, timestamptz)',
    'plataforma.confirmar_cambio_de_correo(text)',
    'plataforma.parar_cambio_de_correo(text)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;
