-- 0078 · Los agotados (M10 · 1, decisión 0102)
--
-- A las 22:00 se acaba el pulpo. Quien lo ve lo marca en el móvil y el equipo se entera
-- (Auditoría de Flujos 2.4): sale «Agotado» en la carta, llega un aviso al chat y vuelve
-- solo al empezar la jornada siguiente, salvo que se marque «sin fecha».
--
--   · `plato_agotado`  un plato agotado, hasta cuándo y quién lo marcó. Una fila por plato:
--                      volver a marcarlo la pone al día, y «ya hay» la quita. Lo que pasó
--                      queda en la auditoría, que es el historial del plato.
--   · La tarjeta del chat aprende el tipo `plato`: el aviso del agotado es una tarjeta que
--     se pone al día sola («Agotado» o «Ya hay»).
--
-- **Agotado no es stock** (Auditoría de Flujos, punto 7): no mueve el libro, y un plato
-- puede estar agotado con la cámara llena. Lo marcan sala y cocina con
-- `accion.marcar_agotado` (Roles 1.12; la matriz lo trae desde la 0004), y quien edita la
-- Carta.

create table estook.plato_agotado (
  plato_id     uuid         primary key references estook.plato (id) on delete cascade,
  local_id     uuid         not null references estook.local (id) on delete cascade,
  -- El instante en que empieza la jornada siguiente, con la hora de corte del local; o
  -- `infinity`, «sin fecha»: hasta que alguien diga que ya hay.
  hasta        timestamptz  not null,
  marcado_por  uuid         references estook.persona (id) on delete set null,
  marcado_en   timestamptz  not null default now()
);

comment on table estook.plato_agotado is
  'Los platos agotados de un local, hasta cuándo y quién (M10 · 1, 0102). No es stock: no mueve el libro (Auditoría de Flujos 2.4).';
comment on column estook.plato_agotado.hasta is
  'Hasta el principio de la jornada siguiente, o infinity: sin fecha. Pasado ese instante, el plato ya no está agotado.';

create index plato_agotado_por_local on estook.plato_agotado (local_id, hasta);

alter table estook.plato_agotado enable row level security;

create policy plato_agotado_lectura on estook.plato_agotado
  for select using (local_id in (select local_id from estook.locales_visibles()));

-- Escribe quien puede marcar agotados o editar la Carta, y solo con un plato de su local.
create policy plato_agotado_escritura on estook.plato_agotado
  for all using (
    estook.puede_editar('accion.marcar_agotado', local_id) or estook.puede_editar('app.carta', local_id)
  )
  with check (
    (estook.puede_editar('accion.marcar_agotado', local_id) or estook.puede_editar('app.carta', local_id))
    and exists (select 1 from estook.plato p where p.id = plato_id and p.local_id = plato_agotado.local_id)
  );

grant select, insert, update, delete on estook.plato_agotado to estook_api;

-- ═══ Quién está trabajando ahora ══════════════════════════════════════════════
--
-- El aviso de un agotado suena solo a quien está fichado (0102): a quien libra no le
-- despierta un pulpo. Los fichajes de los demás no los lee una camarera (0027), así que
-- la API pregunta aquí: **solo los identificadores**, que no salen del servidor, y solo
-- de un local que quien pregunta ve.

create function estook.quien_trabaja_ahora(p_local uuid)
returns setof uuid
language sql
stable
security definer
set search_path = estook, public, pg_catalog, pg_temp
as $$
  select distinct f.persona_id
    from estook.fichaje f
   where f.local_id = p_local
     and f.salio_en is null
     and p_local in (select local_id from estook.locales_visibles());
$$;

comment on function estook.quien_trabaja_ahora(uuid) is
  'Quién está fichado ahora en un local que quien pregunta ve: solo sus ids, para que el aviso de un agotado suene a quien trabaja (0102).';

revoke all on function estook.quien_trabaja_ahora(uuid) from public;
grant execute on function estook.quien_trabaja_ahora(uuid) to estook_api;

-- ═══ La tarjeta del chat: el plato ════════════════════════════════════════════
--
-- Copiada de la 0057 entera, con `plato` añadido.

alter table estook.mensaje drop constraint mensaje_tarjeta_conocida;
alter table estook.mensaje add constraint mensaje_tarjeta_conocida check (
  tarjeta is null or (
    jsonb_typeof(tarjeta) = 'object'
    and tarjeta ->> 'tipo' in ('pedido', 'producto', 'horario', 'plato')
    and char_length(coalesce(tarjeta ->> 'id', '')) between 1 and 60
  )
);

comment on column estook.mensaje.tarjeta is
  'Un pedido, un producto, el aviso del horario o un plato agotado: el tipo y su identificador. Se abre con los permisos de quien lo mira (0075, 0102).';

-- ═══ Fogón lee la carta ═══════════════════════════════════════════════════════
--
-- Leer tu carta (M10 · 1, 0102): un PDF con texto lo lee Estook sin IA; una foto o un
-- PDF escaneado, Fogón, página a página. Cada llamada se apunta con lo suyo. Copiada de
-- la 0075 entera, con `leer_carta` añadido.

alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta'
));
