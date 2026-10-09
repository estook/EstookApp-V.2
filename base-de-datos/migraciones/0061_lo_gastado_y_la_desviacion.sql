-- 0061 · M8, la segunda entrega · lo gastado de verdad y la desviación (decisión 0079)
--
-- Lo que contestó Richi el 8-oct (0078) y lo que pidió para la segunda entrega: **lo
-- gastado de verdad** entre dos inventarios, **el food cost real** con la caja, **la
-- desviación de lo que se vende tal cual** —emparejando la línea de la caja con el
-- producto— con su causa probable, y **la foto de la merma**, si se quiere (4A).
--
--   A · **El emparejamiento**: «Coca-Cola» en la caja es tu «Coca-Cola 33 cl», y cada
--       venta gasta una. Se dice una vez y vale para siempre.
--   B · **La foto de la merma**: una por merma, nunca obligatoria.
--   C · **Un aviso nuevo**: al cerrar un inventario, si lo que falta sin explicar
--       pasa del 3 % de lo gastado.
--
-- Aquí, como en la 0023 y la 0060, **no se calcula nada**: lo gastado, el food cost,
-- la desviación y su causa los dice el dominio (`desviacion.ts`) leyendo el libro, lo
-- contado y la caja, que ya estaban. La base guarda lo que solo una persona sabe: qué
-- producto es cada línea de la caja.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Qué producto es cada línea de la caja
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por qué por el texto normalizado ────────────────────────────────────────
--
-- La 0029 guardó cada línea de la caja tal cual y, al lado, **en minúsculas y sin
-- acentos**, «que es por donde M20 los va a juntar». Esto es ese emparejamiento,
-- adelantado para lo que se vende tal cual: «coca-cola», «Coca-Cola» y «COCA-COLA»
-- son la misma línea, y se emparejan una vez. Lo que se vende con receta —un plato—
-- se empareja con su ficha en M9 y M10, no aquí.
--
-- ── Y por qué «cuánto gasta cada venta» ─────────────────────────────────────
--
-- Porque lo que se vende tal cual no siempre se vende en la unidad en que se cuenta:
-- una botella de vino es una botella, pero una caña es 0,2 litros del barril. De
-- fábrica, 1; quien empareja lo cambia si hace falta.
--
-- `ignorado`: la línea no es de almacén —«Menú del día», «Pan»— y no se vuelve a
-- proponer. Sin producto y sin ignorar no se guarda: eso es no haberlo dicho.

create table estook.concepto_de_caja (
  id                    uuid         primary key default gen_random_uuid(),
  local_id              uuid         not null references estook.local (id) on delete cascade,
  -- Como sale en la caja, para leerlo; y normalizado, que es por donde se junta.
  concepto              text         not null,
  concepto_normalizado  text         not null,
  producto_id           uuid         references estook.producto (id) on delete cascade,
  -- Cuánto se gasta del producto con cada venta, en su unidad de uso.
  por_venta             numeric(14, 4)  not null default 1,
  ignorado              boolean      not null default false,
  emparejado_por        uuid         references estook.persona (id) on delete set null,
  emparejado_en         timestamptz  not null default now(),
  version               integer      not null default 1,
  constraint concepto_de_caja_uno_por_local unique (local_id, concepto_normalizado),
  constraint concepto_de_caja_por_venta_positivo check (por_venta > 0),
  constraint concepto_de_caja_dice_algo check ((producto_id is not null) <> ignorado),
  constraint concepto_de_caja_no_vacio check (length(btrim(concepto_normalizado)) > 0)
);

comment on table estook.concepto_de_caja is
  'Qué producto del almacén es cada línea de la caja que se vende tal cual, y cuánto gasta cada venta (0079). Se dice una vez.';
comment on column estook.concepto_de_caja.por_venta is
  'Cuánto gasta del producto cada unidad vendida, en su unidad de uso: 1 una botella, 0,2 una caña de un barril en litros.';

create index concepto_de_caja_por_producto on estook.concepto_de_caja (producto_id);

create trigger concepto_de_caja_sube_version before update on estook.concepto_de_caja
  for each row execute function estook.subir_version();

-- El normalizado, como en la 0029: lo calcula la base y solo ella, o el
-- emparejamiento y la caja escribirían «lo mismo» de dos maneras y no juntarían nada.
create or replace function estook.normalizar_el_concepto_emparejado()
returns trigger
language plpgsql
as $$
begin
  new.concepto_normalizado := estook.sin_acentos(lower(btrim(new.concepto)));
  return new;
end;
$$;

create trigger concepto_de_caja_normaliza
  before insert or update on estook.concepto_de_caja
  for each row execute function estook.normalizar_el_concepto_emparejado();

-- ═══════════════════════════════════════════════════════════════════════════
-- B · La foto de la merma (4A)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Aparte del libro porque **el libro no admite `update`** (0023): la merma se apunta
-- primero —también sin señal— y la foto llega después, si la hay. Una por merma, y no
-- se cambia: es la prueba de lo que se tiró. El fichero va al cubo de las fotos de
-- producto (`fotos-de-producto`), que ya existe: no hace falta preparar nada.

create table estook.foto_de_merma (
  movimiento_id  bigint       primary key references estook.movimiento_de_stock (id) on delete cascade,
  local_id       uuid         not null references estook.local (id) on delete cascade,
  -- La clave en el almacén, nunca una dirección: los enlaces van firmados y caducan.
  clave          text         not null,
  puesta_por     uuid         references estook.persona (id) on delete set null,
  puesta_en      timestamptz  not null default now(),
  constraint foto_de_merma_clave_no_vacia check (length(btrim(clave)) > 0)
);

comment on table estook.foto_de_merma is
  'La foto de lo que se tiró, si se hizo (4A). Una por merma y no se cambia: es la prueba (0079).';

create index foto_de_merma_por_local on estook.foto_de_merma (local_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El aviso de lo que falta al cerrar
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las listas enteras, copiadas de la 0060 y con lo nuevo al final.

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
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta'
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
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta'
));

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **El emparejamiento** es ver las ventas del local por línea: leerlo pide
-- `dato.ventas`, como la caja (0029). Emparejar lo hace quien responde del inventario
-- (`accion.cerrar_recuento`) y además ve las ventas: es él quien mira la desviación.
--
-- **La foto de la merma** la pone quien puede apuntar mermas —la camarera también,
-- que es quien rompe la copa— o quien lleva el Almacén; y la ve quien ve las mermas.
-- No se cambia ni se borra: desaparece con su merma.

alter table estook.concepto_de_caja enable row level security;
alter table estook.foto_de_merma    enable row level security;

create policy concepto_de_caja_lectura on estook.concepto_de_caja
  for select using (estook.puede_ver('dato.ventas', local_id));

create policy concepto_de_caja_alta on estook.concepto_de_caja
  for insert with check (
    estook.puede_editar('accion.cerrar_recuento', local_id)
    and estook.puede_ver('dato.ventas', local_id)
  );

create policy concepto_de_caja_cambio on estook.concepto_de_caja
  for update using (
    estook.puede_editar('accion.cerrar_recuento', local_id)
    and estook.puede_ver('dato.ventas', local_id)
  )
  with check (
    estook.puede_editar('accion.cerrar_recuento', local_id)
    and estook.puede_ver('dato.ventas', local_id)
  );

create policy concepto_de_caja_baja on estook.concepto_de_caja
  for delete using (
    estook.puede_editar('accion.cerrar_recuento', local_id)
    and estook.puede_ver('dato.ventas', local_id)
  );

create policy foto_de_merma_lectura on estook.foto_de_merma
  for select using (
    estook.puede_ver('app.almacen', local_id)
    or estook.puede_editar('accion.registrar_merma', local_id)
  );

create policy foto_de_merma_alta on estook.foto_de_merma
  for insert with check (
    estook.puede_editar('accion.registrar_merma', local_id)
    or estook.puede_editar('app.almacen', local_id)
  );

grant usage, select on all sequences in schema estook to estook_api;
