-- 0057 · C2 · Lo oficial (decisión 0075)
--
-- La segunda entrega del chat, con lo que contestó Richi el 7-oct:
--
--   A · **Solo «Todo el equipo» de fábrica.** «Cocina» y «Sala» se quitan; donde
--       tuvieran mensajes, se quedan como canales normales, con su nombre y la gente
--       que los veía. Al hacerla, solo existían en IKATZ y estaban vacías.
--   B · **Los canales los crean el gerente y los jefes**: quien ve Equipo y el chat
--       (`estook.lleva_canales`). Renombrarlos y borrarlos (archivarlos), quien los
--       creó y quien edita Equipo. «Todo el equipo» no se toca.
--   C · **Los mensajes ganan** fijado, «Confirmar que lo he leído» y la tarjeta (un
--       pedido, un producto o el aviso del horario).
--   D · **Quién tiene que confirmar**, apuntado al mandarlo: quien veía el canal.
--   E · **El recordatorio** de confirmar, como aviso, al empezar el siguiente turno.
--   F · **El correo del chat** a quien no tiene el móvil puesto: lo que espera se
--       marca para el correo, y un correo al día como mucho.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Solo «Todo el equipo» de fábrica
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Los que tengan mensajes no se pierden: pasan a canal normal con quien los veía
-- dentro. Se mira **antes** de cambiarles el tipo, que es lo que decide quién los ve.

do $$
begin
  perform set_config('estook.sistema', 'si', true);
  insert into estook.miembro_del_canal (canal_id, persona_id)
  select c.id, q.persona_id
    from estook.canal c
    cross join lateral estook.quien_ve_el_canal(c.id) q
   where c.tipo in ('cocina', 'sala')
     and exists (select 1 from estook.mensaje m where m.canal_id = c.id)
  on conflict do nothing;
  perform set_config('estook.sistema', '', true);
end;
$$;

update estook.canal
   set tipo = 'canal', nombre = case tipo when 'cocina' then 'Cocina' else 'Sala' end
 where tipo in ('cocina', 'sala')
   and exists (select 1 from estook.mensaje m where m.canal_id = canal.id);

delete from estook.canal where tipo in ('cocina', 'sala');

comment on type estook.tipo_de_canal is
  'equipo se crea solo con el local; canal lo crean el gerente y los jefes; privado, cualquiera. cocina y sala ya no se usan (0075).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Quién lleva los canales
-- ═══════════════════════════════════════════════════════════════════════════

create function estook.lleva_canales(p_local uuid)
returns boolean
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select estook.puede_ver('app.equipo', p_local)
     and exists (
       select 1 from estook.canal c
        where c.local_id = p_local and c.tipo = 'equipo' and c.archivado_en is null
          and estook.puede_ver_el_canal(c.id, estook.persona_actual())
     )
$$;

comment on function estook.lleva_canales(uuid) is
  'Si quien pregunta crea canales, fija y pide confirmar en ese local: quien ve Equipo y el chat (gerente, jefes, dirección). La gestoría no (0075).';

revoke all on function estook.lleva_canales(uuid) from public;
grant execute on function estook.lleva_canales(uuid) to estook_api;

-- Crear: «Todo el equipo» (lo crea el sistema al abrir el chat), los privados
-- cualquiera, y los canales quien los lleva. Copiada de la 0056, sin cocina ni sala.
drop policy canal_alta on estook.canal;
create policy canal_alta on estook.canal
  for insert with check (
    local_id in (select estook.locales_visibles())
    and archivado_en is null
    and (
      tipo = 'equipo'
      or (tipo = 'privado' and creado_por = estook.persona_actual())
      or (tipo = 'canal' and creado_por = estook.persona_actual()
          and estook.lleva_canales(local_id))
    )
  );

-- Renombrar o borrar (archivar): quien lo creó o quien edita Equipo, solo en los creados.
drop policy canal_cambio on estook.canal;
create policy canal_cambio on estook.canal
  for update using (
    tipo = 'canal'
    and (creado_por = estook.persona_actual() or estook.puede_editar('app.equipo', local_id))
  )
  with check (
    tipo = 'canal'
    and (creado_por = estook.persona_actual() or estook.puede_editar('app.equipo', local_id))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Fijado, confirmar y la tarjeta
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.mensaje
  add column tarjeta         jsonb,
  add column pide_confirmar  boolean      not null default false,
  add column fijado_en       timestamptz,
  add column fijado_por      uuid         references estook.persona (id) on delete set null;

comment on column estook.mensaje.tarjeta is
  'Un pedido, un producto o el aviso del horario: el tipo y su identificador. Se abre con los permisos de quien lo mira (0075).';
comment on column estook.mensaje.pide_confirmar is
  'Si quien lo mandó pide «Confirmar que lo he leído». Entonces no se corrige ni se borra (0075).';

alter table estook.mensaje add constraint mensaje_tarjeta_conocida check (
  tarjeta is null or (
    jsonb_typeof(tarjeta) = 'object'
    and tarjeta ->> 'tipo' in ('pedido', 'producto', 'horario')
    and char_length(coalesce(tarjeta ->> 'id', '')) between 1 and 60
  )
);

-- Copiadas de la 0056, con la tarjeta: un mensaje puede ser solo una tarjeta.
alter table estook.mensaje drop constraint mensaje_con_algo;
alter table estook.mensaje add constraint mensaje_con_algo check (
  borrado_en is not null or texto is not null or adjunto_clave is not null or tarjeta is not null
);

alter table estook.mensaje drop constraint mensaje_borrado_sin_nada;
alter table estook.mensaje add constraint mensaje_borrado_sin_nada check (
  borrado_en is null or (texto is null and adjunto_clave is null and tarjeta is null)
);

alter table estook.mensaje add constraint mensaje_borrado_sin_fijar check (
  borrado_en is null or fijado_en is null
);

create index mensaje_fijado on estook.mensaje (canal_id) where fijado_en is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Quién tiene que confirmar
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una fila por persona, puesta al mandarlo: **quien veía el canal entonces**. Quien
-- entra después no sale como «falta» (0075, lo que decido yo, 4).

create table estook.confirmacion_del_mensaje (
  mensaje_id     bigint       not null references estook.mensaje (id) on delete cascade,
  persona_id     uuid         not null references estook.persona (id) on delete cascade,
  confirmado_en  timestamptz,
  primary key (mensaje_id, persona_id)
);

comment on table estook.confirmacion_del_mensaje is
  'Quién tiene que confirmar un mensaje y cuándo lo hizo. No se deshace (0075).';

create index confirmacion_que_falta on estook.confirmacion_del_mensaje (persona_id)
  where confirmado_en is null;

alter table estook.confirmacion_del_mensaje enable row level security;

-- Se ve lo de los mensajes que se ven, como las reacciones.
create policy confirmacion_lectura on estook.confirmacion_del_mensaje
  for select using (
    estook.es_el_sistema() or persona_id = estook.persona_actual()
    or exists (select 1 from estook.mensaje m where m.id = mensaje_id)
  );

create policy confirmacion_alta on estook.confirmacion_del_mensaje
  for insert with check (estook.es_el_sistema());

-- Confirmar es lo suyo, cada uno.
create policy confirmacion_cambio on estook.confirmacion_del_mensaje
  for update using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual() and confirmado_en is not null);

revoke all on estook.confirmacion_del_mensaje from public;
grant select, insert, update on estook.confirmacion_del_mensaje to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · El recordatorio de confirmar
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un aviso nuevo, y lo programado gana su tipo. Las listas enteras, copiadas de la
-- 0054 y con lo nuevo al final.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar'
));

alter table estook.al_movil_programado drop constraint programado_tipo_conocido;
alter table estook.al_movil_programado add constraint programado_tipo_conocido check (
  tipo in ('turno.entras', 'lote.caduca', 'pedido.no_llega', 'chat.confirmar')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- F · El correo del chat
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Lo que espera de alguien sin móvil puesto, si es un privado o le nombran, se marca
-- para el correo. Y cuándo le salió el último, para que sea uno al día como mucho.

alter table estook.chat_al_movil
  add column por_correo boolean not null default false;

comment on column estook.chat_al_movil.por_correo is
  'De alguien sin móvil puesto: sale en su correo del chat, uno al día como mucho, en su turno (0075).';

create table estook.correo_del_chat (
  persona_id  uuid         primary key references estook.persona (id) on delete cascade,
  mandado_en  timestamptz  not null
);

comment on table estook.correo_del_chat is
  'Cuándo salió el último correo del chat de cada uno: uno al día como mucho (0075).';

-- El nombre y el correo de unas personas, **solo al sistema**: como sistema, la tabla de
-- personas no enseña nada (lo cierra su política), y el correo del chat y el
-- recordatorio necesitan a quién escribir y quién lo pidió. Como `quien_recibe`.
create function estook.a_quien_escribir(p_personas uuid[])
returns table (persona_id uuid, nombre text, correo text)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id, p.nombre, p.correo
    from estook.persona p
   where estook.es_el_sistema() and p.id = any (p_personas)
$$;

comment on function estook.a_quien_escribir(uuid[]) is
  'El nombre y el correo de unas personas, solo al sistema: para el correo del chat y el recordatorio de confirmar (0075).';

revoke all on function estook.a_quien_escribir(uuid[]) from public;
grant execute on function estook.a_quien_escribir(uuid[]) to estook_api;

alter table estook.correo_del_chat enable row level security;

create policy correo_del_chat_el_sistema on estook.correo_del_chat
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.correo_del_chat from public;
grant select, insert, update, delete on estook.correo_del_chat to estook_api;
