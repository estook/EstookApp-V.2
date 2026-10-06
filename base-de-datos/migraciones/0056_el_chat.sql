-- 0056 · C1 · Hablar: el chat del equipo (decisiones 0071 y 0073)
--
-- El chat del local, oficial y que suena en el móvil (Manifiesto 23,
-- `docs/c-el-chat.md`). Esta es la primera de sus dos entregas: hablar.
--
--   A · **Los canales**: «Todo el equipo», «Cocina» y «Sala», que se crean solos con
--       el local la primera vez que alguien abre el chat; los que crea quien lleva el
--       local («Barra», «Encargados»), con quién entra; y los privados, de dos o de un
--       grupo pequeño.
--   B · **Quién ve cada canal**, en una sola función: el del equipo, todo el local
--       menos la gestoría; Cocina y Sala, por rol; los creados, quien lleva el local y
--       quien está dentro; **los privados, solo quien está dentro, ni el dueño**.
--   C · **Los mensajes**: texto, foto, documento o nota de voz; responder a otro;
--       menciones. Corregir lo propio, borrarlo de verdad o que lo retire quien lleva
--       el local, todo en la propia fila y sin perder el sitio en la conversación.
--   D · **Hasta dónde ha llegado y leído cada uno**, y si tiene el canal silenciado.
--   E · **Las reacciones**, de una lista corta.
--   F · **Lo que espera al móvil**, una fila por persona y canal: tres mensajes en
--       Cocina son un aviso, «Cocina · 3 mensajes nuevos», no tres pitidos.
--   G · **El tema de cada uno para lo que llega al segundo**: un nombre secreto por
--       persona por el que Supabase le avisa «hay algo nuevo», sin el mensaje dentro.
--   H · **El cubo de los ficheros del chat**, privado y con enlace que caduca.
--   I · **El latido del móvil mira también el chat**.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los canales
-- ═══════════════════════════════════════════════════════════════════════════

create type estook.tipo_de_canal as enum ('equipo', 'cocina', 'sala', 'canal', 'privado');

comment on type estook.tipo_de_canal is
  'equipo, cocina y sala se crean solos con el local; canal lo crea quien lleva el local; privado, cualquiera (0071).';

create table estook.canal (
  id            uuid                  primary key default gen_random_uuid(),
  local_id      uuid                  not null references estook.local (id) on delete cascade,
  tipo          estook.tipo_de_canal  not null,
  -- El de los creados y, si se le pone, el de un grupo privado. Los tres de fábrica
  -- no lo llevan: su nombre lo dice la app.
  nombre        text,
  creado_por    uuid                  references estook.persona (id) on delete set null,
  creado_en     timestamptz           not null default now(),
  archivado_en  timestamptz,

  constraint canal_nombre_con_medida check (nombre is null or char_length(btrim(nombre)) between 1 and 40),
  constraint canal_creado_con_nombre check (tipo <> 'canal' or nombre is not null)
);

comment on table estook.canal is
  'Dónde se habla en el chat de un local: el equipo, cocina, sala, los creados y los privados (0071).';

-- Uno de cada de fábrica por local: abrir el chat a la vez dos personas no los duplica.
create unique index canal_uno_de_fabrica
  on estook.canal (local_id, tipo) where tipo in ('equipo', 'cocina', 'sala');

create index canal_del_local on estook.canal (local_id) where archivado_en is null;

create table estook.miembro_del_canal (
  canal_id    uuid         not null references estook.canal (id) on delete cascade,
  persona_id  uuid         not null references estook.persona (id) on delete cascade,
  entro_en    timestamptz  not null default now(),
  primary key (canal_id, persona_id)
);

comment on table estook.miembro_del_canal is
  'Quién está en un canal creado o en un privado. Los de fábrica no lo usan: los ve quien tiene el rol (0071).';

create index miembro_de_la_persona on estook.miembro_del_canal (persona_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Quién ve cada canal, en un solo sitio
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Con privilegio porque mira las membresías de otros, que su política no enseña. Por
-- eso **no la puede llamar cualquiera** (0043): solo la API. Quien se va deja de verlo
-- al momento, porque su membresía ya no vale; lo que escribió se queda.

create function estook.puede_ver_el_canal(p_canal uuid, p_persona uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with el_canal as (
    select c.id, c.tipo, c.local_id
      from estook.canal c
     where c.id = p_canal and c.archivado_en is null
  ),
  sus_roles as (
    select m.rol
      from el_canal c
      join estook.local l on l.id = c.local_id and l.activo
      join estook.membresia m on m.organizacion_id = l.organizacion_id
     where m.persona_id = p_persona
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
       and (
         m.alcance = 'organizacion'
         or (m.alcance = 'area' and l.area_id = m.area_id)
         or (m.alcance = 'local' and l.id = m.local_id)
       )
       -- La gestoría no ve el chat (Roles, 1.8).
       and m.rol <> 'gestoria'
  )
  select coalesce(
    (
      select exists (select 1 from sus_roles)
         and case c.tipo
               when 'equipo' then true
               when 'cocina' then exists (
                 select 1 from sus_roles
                  where rol in ('direccion', 'area_manager', 'gerente', 'jefe_de_cocina',
                                'cocinero', 'chef_corporativo')
               )
               when 'sala' then exists (
                 select 1 from sus_roles
                  where rol in ('direccion', 'area_manager', 'gerente', 'jefe_de_sala', 'camarero')
               )
               -- Quien lleva el local ve los canales creados; nunca los privados.
               when 'canal' then exists (
                 select 1 from sus_roles where rol in ('direccion', 'area_manager', 'gerente')
               ) or exists (
                 select 1 from estook.miembro_del_canal mc
                  where mc.canal_id = c.id and mc.persona_id = p_persona
               )
               when 'privado' then exists (
                 select 1 from estook.miembro_del_canal mc
                  where mc.canal_id = c.id and mc.persona_id = p_persona
               )
               else false
             end
        from el_canal c
    ),
    false
  )
$$;

comment on function estook.puede_ver_el_canal(uuid, uuid) is
  'Si una persona ve un canal del chat: el equipo, todo el local menos la gestoría; cocina y sala, por rol; los creados, quien lleva el local y quien está dentro; los privados, solo quien está dentro (0071).';

create function estook.ve_el_canal(p_canal uuid)
returns boolean
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select estook.puede_ver_el_canal(p_canal, estook.persona_actual())
$$;

comment on function estook.ve_el_canal(uuid) is
  'Si quien pregunta ve ese canal. La usan todas las políticas del chat (0071).';

-- Quién ve un canal, con su nombre: a quien está dentro, para mencionar y para saber
-- quién lo ha leído; y al sistema, para saber a quién avisar.
create function estook.quien_ve_el_canal(p_canal uuid)
returns table (persona_id uuid, nombre text)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct p.id, p.nombre
    from estook.canal c
    join estook.local l on l.id = c.local_id
    join estook.membresia m on m.organizacion_id = l.organizacion_id
    join estook.persona p on p.id = m.persona_id
   where c.id = p_canal
     and (estook.es_el_sistema() or estook.puede_ver_el_canal(p_canal, estook.persona_actual()))
     and estook.puede_ver_el_canal(p_canal, p.id)
$$;

comment on function estook.quien_ve_el_canal(uuid) is
  'Quién ve un canal, con su nombre. Contesta a quien ve ese canal y al sistema (0071).';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Los mensajes
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.mensaje (
  id               bigserial    primary key,
  canal_id         uuid         not null references estook.canal (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  autor_id         uuid         references estook.persona (id) on delete set null,
  texto            text,
  responde_a       bigint       references estook.mensaje (id) on delete set null,
  -- Lo que va adjunto: una foto, un documento o una nota de voz. La clave del almacén,
  -- nunca un enlace: los enlaces caducan (M5).
  adjunto_clave    text,
  adjunto_tipo     text,
  adjunto_nombre   text,
  adjunto_mime     text,
  adjunto_bytes    integer,
  adjunto_segundos integer,
  menciones        uuid[]       not null default '{}',
  creado_en        timestamptz  not null default now(),
  editado_en       timestamptz,
  -- Borrar es de verdad: el texto y el fichero se van. Queda que hubo un mensaje.
  borrado_en       timestamptz,
  -- Retirado por quien lleva el local, en un canal (nunca en un privado).
  retirado_por     uuid         references estook.persona (id) on delete set null,

  constraint mensaje_texto_con_medida check (texto is null or char_length(texto) between 1 and 4000),
  constraint mensaje_con_algo check (
    borrado_en is not null or texto is not null or adjunto_clave is not null
  ),
  constraint mensaje_adjunto_conocido check (
    adjunto_tipo is null or adjunto_tipo in ('foto', 'documento', 'voz')
  ),
  constraint mensaje_adjunto_entero check ((adjunto_clave is null) = (adjunto_tipo is null)),
  constraint mensaje_adjunto_con_medida check (
    adjunto_bytes is null or adjunto_bytes between 1 and 10485760
  ),
  constraint mensaje_voz_con_medida check (
    adjunto_segundos is null or adjunto_segundos between 1 and 180
  ),
  constraint mensaje_borrado_sin_nada check (
    borrado_en is null or (texto is null and adjunto_clave is null)
  ),
  constraint mensaje_retirado_es_borrado check (retirado_por is null or borrado_en is not null)
);

comment on table estook.mensaje is
  'Lo que se escribe en el chat. Borrar es de verdad: el texto y el fichero se van, y queda que hubo un mensaje (0071).';

create index mensaje_del_canal on estook.mensaje (canal_id, id desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Hasta dónde ha llegado y leído cada uno
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.lectura_del_canal (
  canal_id         uuid         not null references estook.canal (id) on delete cascade,
  persona_id       uuid         not null references estook.persona (id) on delete cascade,
  -- El último mensaje que su app ha recibido, y el último que ha visto en pantalla.
  entregado_hasta  bigint       not null default 0,
  leido_hasta      bigint       not null default 0,
  -- Silenciado: no le suena, salvo lo que le menciona. Los privados no se silencian.
  silenciado       boolean      not null default false,
  actualizado_en   timestamptz  not null default now(),
  primary key (canal_id, persona_id),

  constraint lectura_leido_es_entregado check (leido_hasta <= entregado_hasta)
);

comment on table estook.lectura_del_canal is
  'Hasta dónde le ha llegado y ha leído cada uno un canal, y si lo tiene silenciado. «Leído» no se puede ocultar (0071).';

create index lectura_de_la_persona on estook.lectura_del_canal (persona_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Las reacciones
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.reaccion_al_mensaje (
  mensaje_id  bigint       not null references estook.mensaje (id) on delete cascade,
  persona_id  uuid         not null references estook.persona (id) on delete cascade,
  emoji       text         not null,
  creada_en   timestamptz  not null default now(),
  primary key (mensaje_id, persona_id, emoji),

  constraint reaccion_de_la_lista check (emoji in ('👍', '❤️', '😂', '😮', '🙏', '✅'))
);

comment on table estook.reaccion_al_mensaje is
  'Las reacciones a un mensaje, de una lista corta (0071).';

-- ═══════════════════════════════════════════════════════════════════════════
-- F · Lo que espera al móvil
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una fila por persona y canal, que se suma: lo que llega en silencio espera y sale
-- en uno solo (0070). Leer el canal la quita. **Nunca va por correo** ni a la campana:
-- el chat tiene su sitio (0071, decido yo, 8).

create table estook.chat_al_movil (
  persona_id     uuid         not null references estook.persona (id) on delete cascade,
  canal_id       uuid         not null references estook.canal (id) on delete cascade,
  cuantos        integer      not null default 1,
  ultimo_id      bigint       not null,
  -- Si alguno le nombra: entonces suena aunque el canal esté silenciado.
  le_mencionan   boolean      not null default false,
  movil_desde    timestamptz  not null default now(),
  intentos       integer      not null default 0,
  creado_en      timestamptz  not null default now(),
  primary key (persona_id, canal_id),

  constraint chat_al_movil_cuantos check (cuantos >= 1)
);

comment on table estook.chat_al_movil is
  'Lo del chat que espera a sonar en el móvil de alguien, uno por canal. Nunca por correo (0071).';

create index chat_al_movil_pendiente on estook.chat_al_movil (movil_desde);

-- ═══════════════════════════════════════════════════════════════════════════
-- G · El tema de cada uno, para lo que llega al segundo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Supabase avisa por un canal público con nombre: este nombre es secreto y de cada
-- persona, y lo que pasa por él es «hay algo nuevo en tal canal», **nunca el mensaje**.
-- La app lo pide a la API con su sesión, como todo. Quien escuchase el tema de otro no
-- leería nada (0071, decido yo, 5).

create table estook.tema_al_segundo (
  persona_id  uuid         primary key references estook.persona (id) on delete cascade,
  tema        text         not null unique,
  creado_en   timestamptz  not null default now(),

  constraint tema_largo check (char_length(tema) >= 48)
);

comment on table estook.tema_al_segundo is
  'El nombre secreto por el que a cada uno le llega «hay algo nuevo» al segundo. Sin el mensaje dentro (0071).';

-- ═══════════════════════════════════════════════════════════════════════════
-- Las políticas
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.canal enable row level security;
alter table estook.miembro_del_canal enable row level security;
alter table estook.mensaje enable row level security;
alter table estook.lectura_del_canal enable row level security;
alter table estook.reaccion_al_mensaje enable row level security;
alter table estook.chat_al_movil enable row level security;
alter table estook.tema_al_segundo enable row level security;

create policy canal_lectura on estook.canal
  for select using (estook.es_el_sistema() or estook.ve_el_canal(id));

-- Los de fábrica los crea quien abre el chat, en su local; los canales, quien lleva el
-- local; los privados, cualquiera del local. Siempre a su nombre.
create policy canal_alta on estook.canal
  for insert with check (
    local_id in (select estook.locales_visibles())
    and archivado_en is null
    and (
      tipo in ('equipo', 'cocina', 'sala')
      or (tipo = 'privado' and creado_por = estook.persona_actual())
      or (tipo = 'canal' and creado_por = estook.persona_actual()
          and estook.puede_editar('app.equipo', local_id))
    )
  );

-- Cambiar el nombre o archivar: quien lleva el local, en los creados.
create policy canal_cambio on estook.canal
  for update using (tipo = 'canal' and estook.puede_editar('app.equipo', local_id))
  with check (tipo = 'canal' and estook.puede_editar('app.equipo', local_id));

create policy miembro_lectura on estook.miembro_del_canal
  for select using (estook.es_el_sistema() or canal_id in (select c.id from estook.canal c));

-- Mete gente quien creó el canal o el privado, o quien ya está dentro de un privado; y
-- en un canal creado, quien lleva el local. Los primeros de un canal recién creado los
-- mete el sistema: hasta que hay alguien dentro, nadie lo ve, tampoco quien lo crea.
create policy miembro_alta on estook.miembro_del_canal
  for insert with check (
    estook.es_el_sistema()
    or exists (
      select 1 from estook.canal c
       where c.id = canal_id
         and c.tipo in ('canal', 'privado')
         and c.archivado_en is null
         and (
           c.creado_por = estook.persona_actual()
           or (c.tipo = 'privado' and estook.ve_el_canal(c.id))
           or (c.tipo = 'canal' and estook.puede_editar('app.equipo', c.local_id))
         )
    )
  );

-- Salir de un grupo, uno mismo; sacar a alguien de un canal, quien lleva el local.
create policy miembro_baja on estook.miembro_del_canal
  for delete using (
    persona_id = estook.persona_actual()
    or exists (
      select 1 from estook.canal c
       where c.id = canal_id and c.tipo = 'canal'
         and estook.puede_editar('app.equipo', c.local_id)
    )
  );

-- Por los canales que se ven, que son pocos, y no fila a fila: buscar en un año de
-- mensajes no puede llamar a la función una vez por mensaje.
create policy mensaje_lectura on estook.mensaje
  for select using (estook.es_el_sistema() or canal_id in (select c.id from estook.canal c));

create policy mensaje_alta on estook.mensaje
  for insert with check (
    autor_id = estook.persona_actual()
    and borrado_en is null
    and estook.ve_el_canal(canal_id)
    and local_id = (select c.local_id from estook.canal c where c.id = canal_id)
  );

-- Corregir y borrar lo propio; retirar, quien lleva el local, y **nunca en un privado**.
create policy mensaje_cambio on estook.mensaje
  for update using (
    estook.ve_el_canal(canal_id)
    and (
      autor_id = estook.persona_actual()
      or (
        estook.puede_editar('app.equipo', local_id)
        and (select c.tipo from estook.canal c where c.id = canal_id) <> 'privado'
      )
    )
  )
  with check (estook.ve_el_canal(canal_id));

create policy lectura_lectura on estook.lectura_del_canal
  for select using (
    persona_id = estook.persona_actual() or estook.es_el_sistema()
    or canal_id in (select c.id from estook.canal c)
  );

create policy lectura_alta on estook.lectura_del_canal
  for insert with check (persona_id = estook.persona_actual() and estook.ve_el_canal(canal_id));

create policy lectura_cambio on estook.lectura_del_canal
  for update using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual() and estook.ve_el_canal(canal_id));

create policy reaccion_lectura on estook.reaccion_al_mensaje
  for select using (
    exists (select 1 from estook.mensaje m where m.id = mensaje_id)
  );

create policy reaccion_alta on estook.reaccion_al_mensaje
  for insert with check (
    persona_id = estook.persona_actual()
    and exists (select 1 from estook.mensaje m where m.id = mensaje_id and m.borrado_en is null)
  );

create policy reaccion_baja on estook.reaccion_al_mensaje
  for delete using (persona_id = estook.persona_actual());

create policy chat_al_movil_el_sistema on estook.chat_al_movil
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

-- Leer el canal quita lo que esperaba: lo suyo, cada uno.
create policy chat_al_movil_lo_mio on estook.chat_al_movil
  for delete using (persona_id = estook.persona_actual());

create policy tema_lo_mio on estook.tema_al_segundo
  for select using (persona_id = estook.persona_actual() or estook.es_el_sistema());

create policy tema_alta on estook.tema_al_segundo
  for insert with check (persona_id = estook.persona_actual());

revoke all on estook.canal from public;
revoke all on estook.miembro_del_canal from public;
revoke all on estook.mensaje from public;
revoke all on estook.lectura_del_canal from public;
revoke all on estook.reaccion_al_mensaje from public;
revoke all on estook.chat_al_movil from public;
revoke all on estook.tema_al_segundo from public;

grant select, insert, update on estook.canal to estook_api;
grant select, insert, delete on estook.miembro_del_canal to estook_api;
grant select, insert, update on estook.mensaje to estook_api;
grant usage, select on sequence estook.mensaje_id_seq to estook_api;
grant select, insert, update on estook.lectura_del_canal to estook_api;
grant select, insert, delete on estook.reaccion_al_mensaje to estook_api;
grant select, insert, update, delete on estook.chat_al_movil to estook_api;
grant select, insert on estook.tema_al_segundo to estook_api;

revoke all on function estook.puede_ver_el_canal(uuid, uuid) from public;
revoke all on function estook.quien_ve_el_canal(uuid) from public;
revoke all on function estook.ve_el_canal(uuid) from public;
grant execute on function estook.puede_ver_el_canal(uuid, uuid) to estook_api;
grant execute on function estook.quien_ve_el_canal(uuid) to estook_api;
grant execute on function estook.ve_el_canal(uuid) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- H · El cubo de los ficheros del chat
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Privado, con enlace que caduca, como el resto (Manifiesto 23). Solo donde hay
-- almacén de Supabase: en la base de pruebas no lo hay, y no hace falta.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'chat', 'chat', false, 10 * 1024 * 1024,
      array[
        'image/webp', 'image/jpeg', 'image/png',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'audio/webm', 'audio/mp4', 'audio/ogg'
      ]
    )
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- I · El latido del móvil mira también el chat
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El mismo trabajo de la 0054, copiado entero, con una condición más: que haya algo
-- del chat esperando a sonar. `cron.schedule` con el mismo nombre lo sustituye.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;

  begin
    perform cron.schedule(
      'estook-movil',
      '* * * * *',
      $cron$
        select net.http_post(
          url := (select replace(r.url, '/tareas/latir', '/tareas/movil') from plataforma.reloj r where r.unica),
          headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-reloj', (select d.decrypted_secret from vault.decrypted_secrets d where d.name = 'estook_reloj')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 50000
        )
         where exists (
           select 1 from estook.aviso a where a.movil = 'pendiente' and a.movil_desde <= now()
         )
            or exists (
           select 1 from estook.al_movil_programado p where p.hecho_en is null and p.cuando <= now()
         )
            or exists (
           select 1 from estook.chat_al_movil c where c.movil_desde <= now()
         )
      $cron$
    );
  exception when others then
    raise notice 'El latido del móvil no se ha podido cambiar: %. Lo dirá bd:comprobar-api.', sqlerrm;
  end;
end;
$$;
