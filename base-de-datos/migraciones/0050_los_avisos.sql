-- 0050 · R · Los avisos: la campana (decisión 0052)
--
-- La campana de arriba llevaba desde M3 y abría una hoja que decía «llegará». Ahora
-- avisa de verdad: de lo que hace el equipo (un pedido empezado, uno mandado, una
-- merma cara), de lo que pasa con las compras (un albarán con incidencias, un
-- proveedor que sube) y de lo que se publica para todos (la carta, el Tablón).
--
--   A · **El aviso**: uno por cosa y persona. Lo escribe el sistema —nadie puede
--       dejarle un aviso falso a otro— y lo lee solo a quien va dirigido.
--   B · **Lo que cada uno quiere recibir**, y por dónde: la campana o también el
--       correo. Solo se guarda lo que alguien cambia; lo demás es de fábrica, y lo
--       decide el dominio (`packages/dominio/src/avisos.ts`).
--   C · **Pedir ayuda con un pedido**: quien lo puede mandar invita a alguien del
--       almacén a rellenarlo, y ese alguien avisa cuando termina.
--   D · **Desde cuánto avisa una subida de precio**, por local: 5 % de fábrica.
--   E · **A quién le llega**: la única función con privilegio de la entrega. Dice
--       quién tiene en un local los permisos que pide un aviso, y su puesto, y solo
--       contesta al sistema.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El aviso
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.aviso (
  id               uuid         primary key default gen_random_uuid(),
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid         references estook.local (id) on delete cascade,
  -- A quién va. Un aviso es de una persona: el mismo pedido empezado son dos avisos
  -- si lo tienen que saber el jefe de cocina y el gerente, y cada uno lo lee cuando lo lee.
  persona_id       uuid         not null references estook.persona (id) on delete cascade,
  tipo             text         not null,
  -- **La cosa** de la que avisa: el pedido, el producto con su proveedor, la nota.
  -- Con el tipo y la persona hace que sea uno por cosa y persona.
  clave            text         not null,
  titulo           text         not null,
  detalle          text,
  -- A dónde lleva al tocarlo, dentro de la app: `/almacen/pedidos?pedido=…`.
  ir               text,
  -- Quién lo ha hecho. Si lo sigue tocando otro, se suma aquí sin volver a sonar.
  quienes          text[]       not null default '{}',
  creado_en        timestamptz  not null default now(),
  actualizado_en   timestamptz  not null default now(),
  leido_en         timestamptz,
  -- Si además va por correo: `pendiente` hasta que sale, y el reloj reintenta.
  correo           text         not null default 'no',
  correo_intentos  smallint     not null default 0,
  -- A qué dirección, apuntada al avisar. El correo sale después, fuera de la sesión
  -- de nadie, y entonces ya no se puede leer la ficha de la persona.
  correo_para      text,

  constraint aviso_tipo_conocido check (tipo in (
    'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
    'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota'
  )),
  constraint aviso_correo_conocido check (correo in ('no', 'pendiente', 'mandado')),
  constraint aviso_correo_con_direccion check (correo = 'no' or correo_para is not null),
  constraint aviso_uno_por_cosa unique (persona_id, tipo, clave),
  constraint aviso_con_medida check (
    char_length(btrim(titulo)) between 1 and 300
    and coalesce(char_length(detalle), 0) <= 600
    and coalesce(char_length(ir), 0) <= 300
  ),
  constraint aviso_va_dentro check (ir is null or ir like '/%')
);

create index aviso_de_cada_uno on estook.aviso (persona_id, actualizado_en desc);
create index aviso_sin_leer on estook.aviso (persona_id) where leido_en is null;
create index aviso_con_correo_pendiente on estook.aviso (creado_en) where correo = 'pendiente';

comment on table estook.aviso is
  'La campana: un aviso por cosa y persona. Lo escribe el sistema y lo lee solo a quien va (0052).';

-- Quien lo recibe solo lo marca leído; lo demás es del sistema. La política deja
-- pasar el `update` de los dos, y la diferencia la marca esto.
create function estook.aviso_solo_se_lee()
returns trigger
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if estook.es_el_sistema() then
    return new;
  end if;
  if (new.id, new.organizacion_id, new.local_id, new.persona_id, new.tipo, new.clave,
      new.titulo, new.detalle, new.ir, new.quienes, new.creado_en, new.actualizado_en,
      new.correo, new.correo_intentos, new.correo_para)
     is distinct from
     (old.id, old.organizacion_id, old.local_id, old.persona_id, old.tipo, old.clave,
      old.titulo, old.detalle, old.ir, old.quienes, old.creado_en, old.actualizado_en,
      old.correo, old.correo_intentos, old.correo_para) then
    raise exception 'De un aviso solo se marca si está leído'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger aviso_solo_se_lee
  before update on estook.aviso
  for each row execute function estook.aviso_solo_se_lee();

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo que cada uno quiere recibir
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.preferencia_de_aviso (
  persona_id      uuid         not null references estook.persona (id) on delete cascade,
  tipo            text         not null,
  en_la_app       boolean      not null,
  por_correo      boolean      not null,
  actualizado_en  timestamptz  not null default now(),
  primary key (persona_id, tipo),
  constraint preferencia_tipo_conocido check (tipo in (
    'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
    'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota'
  )),
  -- El correo nunca sin la campana: un aviso que no está en la app no se puede dar
  -- por visto en ningún sitio.
  constraint preferencia_correo_con_app check (en_la_app or not por_correo)
);

comment on table estook.preferencia_de_aviso is
  'Lo que alguien ha cambiado de sus avisos. Lo que no está aquí es de fábrica, y lo decide el dominio (0052).';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Pedir ayuda con un pedido
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.invitacion_a_pedido (
  pedido_id     uuid         not null references estook.pedido_de_compra (id) on delete cascade,
  persona_id    uuid         not null references estook.persona (id) on delete cascade,
  invitada_por  uuid         not null references estook.persona (id) on delete restrict,
  invitada_en   timestamptz  not null default now(),
  -- «Listo»: quien lo rellenó ha terminado y ha avisado a quien se lo pidió.
  terminada_en  timestamptz,
  primary key (pedido_id, persona_id),
  constraint invitacion_no_a_uno_mismo check (persona_id <> invitada_por)
);

comment on table estook.invitacion_a_pedido is
  'A quién se le ha pedido que rellene un pedido, y si ya ha terminado. Lo manda quien puede (0052).';

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Desde cuánto avisa una subida de precio
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.local
  add column subida_que_avisa smallint not null default 5,
  add constraint local_subida_que_avisa_en_rango check (subida_que_avisa between 1 and 50);

comment on column estook.local.subida_que_avisa is
  'Desde qué tanto por cien avisa una subida de precio de compra, sin IVA (0052). Lo cambia quien manda pedidos.';

-- ═══════════════════════════════════════════════════════════════════════════
-- E · A quién le llega
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Quien apunta una merma no puede leer las membresías de su gerente, y está bien
-- que no pueda. Pero el aviso tiene que saber a quién va. Esto lo dice, **solo al
-- sistema** (`estook.es_el_sistema()`), y solo lo justo para avisar: quién es, su
-- correo y su puesto en ese local. A cualquier otro le devuelve nada.

create function estook.quien_recibe(p_local uuid, p_permisos text[])
returns table (persona_id uuid, nombre text, correo text, amplitud integer, rol text)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id,
         p.nombre,
         p.correo,
         max(r.amplitud)::integer,
         (array_agg(r.codigo order by r.amplitud desc))[1]
    from estook.membresia m
    join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id and l.activo
    join estook.persona p on p.id = m.persona_id and p.activa
    join estook.rol r on r.codigo = m.rol
   where estook.es_el_sistema()
     and m.desde <= current_date
     and (m.hasta is null or m.hasta >= current_date)
     and (m.revocada_en is null or m.revocada_en > now())
     and (
       m.alcance = 'organizacion'
       or (m.alcance = 'area' and l.area_id = m.area_id)
       or (m.alcance = 'local' and l.id = m.local_id)
     )
     and not exists (
       select 1 from unnest(p_permisos) as pedido(permiso)
        where estook.nivel_de_permiso(p.id, p_local, pedido.permiso) = 'sin_acceso'
     )
   group by p.id, p.nombre, p.correo
$$;

comment on function estook.quien_recibe(uuid, text[]) is
  'Quién tiene en un local los permisos que pide un aviso, con su puesto. Solo contesta al sistema (0052).';

-- ═══════════════════════════════════════════════════════════════════════════
-- F · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.aviso                enable row level security;
alter table estook.preferencia_de_aviso enable row level security;
alter table estook.invitacion_a_pedido  enable row level security;

-- El aviso: lo tuyo, y el sistema.
create policy aviso_lectura on estook.aviso
  for select using (persona_id = estook.persona_actual() or estook.es_el_sistema());
create policy aviso_alta on estook.aviso
  for insert with check (estook.es_el_sistema());
create policy aviso_leer on estook.aviso
  for update using (persona_id = estook.persona_actual() or estook.es_el_sistema())
  with check (persona_id = estook.persona_actual() or estook.es_el_sistema());
-- Borrar, solo el reloj, pasado un mes.
create policy aviso_limpieza on estook.aviso
  for delete using (estook.es_el_sistema());

-- Lo que cada uno quiere: lo suyo. El sistema lo lee para saber a quién mandar qué.
create policy preferencia_lectura on estook.preferencia_de_aviso
  for select using (persona_id = estook.persona_actual() or estook.es_el_sistema());
create policy preferencia_la_mia on estook.preferencia_de_aviso
  for insert with check (persona_id = estook.persona_actual());
create policy preferencia_la_cambio on estook.preferencia_de_aviso
  for update using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

-- La invitación: la ve quien ve el pedido (la política del pedido aplica en la
-- subconsulta). La hace quien puede mandar pedidos en ese local, a su nombre; y la
-- da por terminada quien fue invitado.
create policy invitacion_lectura on estook.invitacion_a_pedido
  for select using (pedido_id in (select id from estook.pedido_de_compra));
create policy invitacion_alta on estook.invitacion_a_pedido
  for insert with check (
    invitada_por = estook.persona_actual()
    and exists (
      select 1 from estook.pedido_de_compra p
       where p.id = pedido_id
         and p.estado = 'borrador'
         and estook.puede_editar('accion.enviar_pedidos', p.local_id)
    )
  );
create policy invitacion_terminada on estook.invitacion_a_pedido
  for update using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

-- ═══════════════════════════════════════════════════════════════════════════
-- G · Permisos de tabla
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on estook.aviso, estook.preferencia_de_aviso, estook.invitacion_a_pedido from public;
grant select, insert, update, delete on estook.aviso to estook_api;
grant select, insert, update on estook.preferencia_de_aviso to estook_api;
grant select, insert, update on estook.invitacion_a_pedido to estook_api;

revoke all on function estook.quien_recibe(uuid, text[]) from public;
grant execute on function estook.quien_recibe(uuid, text[]) to estook_api;
revoke all on function estook.aviso_solo_se_lee() from public;
