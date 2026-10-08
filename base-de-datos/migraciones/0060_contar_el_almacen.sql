-- 0060 · M8, la primera entrega · contar el almacén (decisión 0078)
--
-- Lo que contestó Richi el 8-oct: los platos esperan a sus fichas (1A), **contar y
-- cerrar son dos pasos, como lo hacen los mejores** (2A), el mínimo se calcula y se
-- propone (3A) y la foto de la merma es si quieres (4A, en la segunda entrega).
--
--   A · **El inventario**, con cabecera y líneas: quién contó, cuándo y qué; quién
--       lo cerró. Cada línea guarda **lo que decía el libro al contarla** y hasta qué
--       movimiento: al cerrar horas después, lo apuntado entre medias no se pierde.
--   B · **Los lotes se gastan solos** (FEFO): cada lote sabe lo que le queda, cada
--       salida dice de qué lotes salió, y el que se acaba deja de avisar.
--   C · **El mínimo calculado**: el producto dice si su mínimo lo rehace Estook.
--   D · **Tres avisos nuevos**: toca contar, alguien ha contado y vuelve a contarlo.
--
-- Aquí, como en la 0023, **no se calcula nada**: lo que toca contar, qué lote se
-- gasta y cuánto es el mínimo lo dice el dominio (`inventario.ts`). La base guarda.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El inventario
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por qué una tabla, si hasta hoy bastaba la correlación del libro ─────────
--
-- Porque contar y cerrar dejan de ser el mismo momento (2A). Entre que Marcos cuenta
-- la cámara a las 7 y el jefe la cierra a las 11, lo contado tiene que vivir en
-- algún sitio, y el libro no sirve: el libro dice lo que hay, y lo contado todavía
-- no lo es. Lo que se cerró antes de esta migración sigue en el libro como estaba.

create table estook.inventario (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  -- Lo que se contó: una zona, o nulo si se contó todo.
  zona            estook.zona_del_producto,
  -- `contado`: mandado, esperando a quien cierra. `cerrado`: ya está en el libro.
  -- `descartado`: quien cierra dijo que no vale, con su porqué.
  estado          text         not null default 'contado',
  contado_por     uuid         references estook.persona (id) on delete set null,
  contado_en      timestamptz  not null default now(),
  cerrado_por     uuid         references estook.persona (id) on delete set null,
  cerrado_en      timestamptz,
  -- La correlación de la petición que lo cerró: une sus líneas del libro.
  correlacion_id  uuid,
  notas           text,
  motivo_de_descarte text,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint inventario_estado_conocido check (estado in ('contado', 'cerrado', 'descartado')),
  constraint inventario_cerrado_con_quien check (
    (estado = 'cerrado') = (cerrado_en is not null)
  ),
  constraint inventario_descartado_con_motivo check (
    estado <> 'descartado' or length(btrim(coalesce(motivo_de_descarte, ''))) > 0
  )
);

comment on table estook.inventario is
  'Lo contado de una vez: quién, cuándo y de qué zona. Se manda y lo cierra quien tiene el permiso, o se cuenta y se cierra a la vez (0078).';

create index inventario_por_local on estook.inventario (local_id, estado, contado_en desc);

create trigger inventario_sube_version before update on estook.inventario
  for each row execute function estook.subir_version();

create table estook.linea_de_inventario (
  id                bigserial    primary key,
  inventario_id     uuid         not null references estook.inventario (id) on delete cascade,
  local_id          uuid         not null references estook.local (id) on delete cascade,
  producto_id       uuid         not null references estook.producto (id) on delete cascade,
  -- Lo que hay de verdad, en la unidad de uso del producto. Cero vale.
  hay               numeric(14, 4)  not null,
  -- Cómo se contó, si fue en cajas y sueltas: «2 cajas y 3 sueltas». Solo para leerlo
  -- después; lo que cuenta es `hay`, que ya lo trae pasado a la unidad de uso.
  formatos          numeric(12, 3),
  sueltas           numeric(14, 4),
  -- ── Lo que decía el libro al contarlo, y hasta qué línea ───────────────────
  --
  -- Es lo que hace que cerrar tarde no se coma nada (2A): la diferencia es `hay −
  -- decia`, y se suma a lo que haya al cerrar. Lo apuntado después de esta línea del
  -- libro sigue contando. Cero si el producto no tenía ninguna.
  decia             numeric(14, 4)  not null,
  hasta_movimiento  bigint          not null default 0,
  contado_por       uuid         references estook.persona (id) on delete set null,
  contado_en        timestamptz  not null default now(),
  -- Quien cierra pide que se vuelva a contar. Mientras está puesto, la línea no se
  -- cierra: se queda fuera del cierre y se dice.
  recontar          boolean      not null default false,
  recontar_pedido_por uuid       references estook.persona (id) on delete set null,
  constraint linea_de_inventario_hay_no_negativo check (hay >= 0),
  constraint linea_de_inventario_formatos_no_negativos check (
    (formatos is null or formatos >= 0) and (sueltas is null or sueltas >= 0)
  ),
  constraint linea_de_inventario_una_por_producto unique (inventario_id, producto_id)
);

comment on table estook.linea_de_inventario is
  'Lo contado de un producto en un inventario, con lo que decía el libro al contarlo y hasta qué movimiento (0078).';
comment on column estook.linea_de_inventario.hasta_movimiento is
  'La última línea del libro de ese producto cuando se contó. Al cerrar, lo apuntado después sigue contando.';

create index linea_de_inventario_por_producto
  on estook.linea_de_inventario (producto_id, contado_en desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Los lotes se gastan solos (FEFO)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `cantidad` (0035) es lo que trajo el lote, o lo que se congeló. `queda` es lo que
-- le queda: baja con cada salida, primero del que antes caduca (Auditoría, hallazgo
-- 2), y al llegar a cero el lote se retira solo —«se acabó»— y deja de avisar.
-- Nulo: no se sabe cuánto trae, y entonces no se gasta solo, como hasta hoy.

alter table estook.lote
  add column queda numeric(14, 4),
  add constraint lote_queda_no_negativa check (queda is null or queda >= 0);

comment on column estook.lote.queda is
  'Lo que le queda al lote, en unidad de uso. Baja sola con cada salida, primero el que antes caduca (0078). Nulo: no se sabe.';

-- «Se acabó» es la tercera forma de retirarse: nadie lo quitó, se gastó entero.
alter table estook.lote drop constraint lote_como_se_retiro_conocido;
alter table estook.lote add constraint lote_como_se_retiro_conocido check (
  como_se_retiro is null or como_se_retiro in ('gastado', 'tirado', 'se_acabo')
);

-- Un lote nuevo empieza con lo que trae.
create or replace function estook.el_lote_empieza_lleno()
returns trigger
language plpgsql
as $$
begin
  if new.queda is null then
    new.queda := new.cantidad;
  end if;
  return new;
end;
$$;

create trigger lote_empieza_lleno before insert on estook.lote
  for each row execute function estook.el_lote_empieza_lleno();

-- Los que ya había: lo que trajeron, o lo que entró con ellos en el libro. **No se
-- les resta lo gastado**: no se sabe de cuál salió. El próximo inventario lo ajusta.
update estook.lote l
   set queda = coalesce(
         l.cantidad,
         (select sum(m.cantidad) from estook.movimiento_de_stock m
           where m.lote_id = l.id and m.cantidad > 0)
       )
 where l.retirado_en is null and l.queda is null;

-- De qué lotes salió cada salida. Es lo que deja devolverlo si la salida se anula.
create table estook.salida_de_lote (
  movimiento_id  bigint  not null references estook.movimiento_de_stock (id) on delete cascade,
  lote_id        uuid    not null references estook.lote (id) on delete cascade,
  local_id       uuid    not null references estook.local (id) on delete cascade,
  cantidad       numeric(14, 4)  not null,
  -- Si este gasto fue el que acabó el lote: al anular la salida, vuelve a estar.
  lo_acabo       boolean not null default false,
  primary key (movimiento_id, lote_id),
  constraint salida_de_lote_positiva check (cantidad > 0)
);

comment on table estook.salida_de_lote is
  'Cuánto se gastó de cada lote en cada salida, por FEFO (0078). Solo se añade: al anular la salida, se devuelve.';

create index salida_de_lote_por_lote on estook.salida_de_lote (lote_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El mínimo calculado
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.producto
  add column minimo_calculado boolean not null default false;

comment on column estook.producto.minimo_calculado is
  'Si el mínimo lo rehace Estook cada lunes con lo que se gasta y el reparto (0078). Cambiarlo a mano lo apaga.';

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Los avisos de inventario
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las listas enteras, copiadas de la 0057 y con lo nuevo al final.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar'
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
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar'
));

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Ver un inventario: quien ve el Almacén del local. Contar y mandar: quien lo lleva
-- (`app.almacen` para editar), el cocinero también (2A). **Cerrar** pide además
-- `accion.cerrar_recuento`, y eso lo mira el comando: la fila es la misma.
-- Lo que decía el libro no viaja a quien cuenta sin poder cerrar: lo quita la
-- consulta, que es donde se sabe quién pregunta (contar a ciegas, 0078).

alter table estook.inventario           enable row level security;
alter table estook.linea_de_inventario  enable row level security;
alter table estook.salida_de_lote       enable row level security;

create policy inventario_lectura on estook.inventario
  for select using (estook.puede_ver('app.almacen', local_id));

create policy inventario_alta on estook.inventario
  for insert with check (estook.puede_editar('app.almacen', local_id));

create policy inventario_cambio on estook.inventario
  for update using (estook.puede_editar('app.almacen', local_id))
  with check (estook.puede_editar('app.almacen', local_id));

create policy linea_de_inventario_lectura on estook.linea_de_inventario
  for select using (estook.puede_ver('app.almacen', local_id));

create policy linea_de_inventario_alta on estook.linea_de_inventario
  for insert with check (estook.puede_editar('app.almacen', local_id));

create policy linea_de_inventario_cambio on estook.linea_de_inventario
  for update using (estook.puede_editar('app.almacen', local_id))
  with check (estook.puede_editar('app.almacen', local_id));

-- ── Lo que se gasta de cada lote ────────────────────────────────────────────
--
-- Lo apunta `apuntar` con cada salida, **también la merma de la camarera**, que no
-- lleva Almacén (0026): por eso basta con poder apuntar mermas. Leer, quien ve el
-- local. Y no se borra ni se cambia: se devuelve apuntando otra cosa.

create policy salida_de_lote_lectura on estook.salida_de_lote
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy salida_de_lote_alta on estook.salida_de_lote
  for insert with check (
    estook.puede_editar('app.almacen', local_id)
    or estook.puede_editar('accion.registrar_merma', local_id)
  );

-- Y gastar del lote, por la misma razón: la merma de la camarera también lo gasta.
create policy lote_gasto on estook.lote
  for update using (estook.puede_editar('accion.registrar_merma', local_id))
  with check (estook.puede_editar('accion.registrar_merma', local_id));

comment on policy lote_gasto on estook.lote is
  'Quien apunta una merma gasta del lote que antes caduca (0078), aunque no lleve Almacén.';

grant usage, select on all sequences in schema estook to estook_api;
