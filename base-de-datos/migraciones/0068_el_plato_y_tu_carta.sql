-- 0068 · El plato y tu carta (M9 · 1, decisión 0086)
--
-- Richi, el 15-oct: «primero la carta». El hostelero monta lo que vende —secciones,
-- platos, su precio en sala y en cada canal— y después, en Escandallos, lo desgrana.
-- El plato es **uno solo**: la Carta es la dueña de lo que se vende y a cuánto, y
-- Escandallos (M9 · 2) colgará de él la receta y el coste por su identificador.
--
-- Cuatro tablas y un tipo:
--
--   · `seccion_de_carta`  Entrantes, Principales, Postres… en su orden.
--   · `plato`             lo que se vende: nombre, sección, descripción, foto y su
--                         precio de sala, con IVA, como en la carta de papel.
--   · `canal_de_venta_del_local`   los canales que usa el local, con su comisión y su envase.
--   · `precio_de_plato`   el precio a mano de un plato en un canal; sin fila, vale
--                         el de sala.
--
-- **El historial del plato es la auditoría** (`estook.anotar`): quién cambió qué y
-- cuándo, con el antes y el después. No hace falta otra tabla.
--
-- Y el buscador encuentra los platos (se copia entera la función de la 0067 y se
-- añade solo su bloque: lección del M6).

-- Los canales que Estook sabe nombrar. Activarlos lo dice el catálogo de la app
-- (`CANALES_DE_VENTA`): hoy, Sala y Uber Eats (0086).
create type estook.canal_de_venta as enum ('sala', 'para_llevar', 'uber_eats', 'glovo', 'just_eat');

-- ═══ Las secciones ════════════════════════════════════════════════════════════

create table estook.seccion_de_carta (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  nombre          text         not null,
  orden           integer      not null default 0,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint seccion_nombre_no_vacio check (length(btrim(nombre)) > 0 and length(nombre) <= 80)
);

comment on table estook.seccion_de_carta is
  'Las secciones de la carta de un local, en su orden (M9 · 1, 0086). Quitar una no borra sus platos: pasan a «Sin sección».';

create unique index seccion_una_por_nombre
  on estook.seccion_de_carta (local_id, estook.sin_acentos(nombre));
create index seccion_por_local on estook.seccion_de_carta (local_id, orden);

create trigger seccion_de_carta_sube_version before update on estook.seccion_de_carta
  for each row execute function estook.subir_version();

-- ═══ Los platos ═══════════════════════════════════════════════════════════════

create table estook.plato (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  -- Sin sección se puede: para añadir de golpe y colocar después (0086).
  seccion_id      uuid         references estook.seccion_de_carta (id) on delete set null,
  nombre          text         not null,
  descripcion     text,
  -- El precio de sala, con IVA, en céntimos. Nulo mientras no se ha puesto.
  precio_centimos integer,
  foto_clave      text,
  miniatura_clave text,
  orden           integer      not null default 0,
  -- «Nada se borra»: archivar lo quita de la carta y se recupera.
  activo          boolean      not null default true,
  es_ejemplo      boolean      not null default false,
  creado_por      uuid         references estook.persona (id) on delete set null,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint plato_nombre_no_vacio check (length(btrim(nombre)) > 0 and length(nombre) <= 120),
  constraint plato_descripcion_corta check (descripcion is null or length(descripcion) <= 500),
  constraint plato_precio_positivo check (precio_centimos is null or precio_centimos between 0 and 100000000),
  constraint plato_foto_con_miniatura check ((foto_clave is null) = (miniatura_clave is null))
);

comment on table estook.plato is
  'Lo que se vende (M9 · 1, 0086). Uno solo: la Carta es la dueña de su nombre, su sección y sus precios; Escandallos le colgará la receta por su id.';
comment on column estook.plato.precio_centimos is
  'El precio de sala, con IVA, como en la carta de papel. El margen se calcula sin IVA (Plan, M9).';

-- Dos «Croquetas» en el mismo local son un error de tecleo, y el cierre de caja y el
-- TPV emparejan por nombre la primera vez. Sin mayúsculas ni acentos, como el buscador.
create unique index plato_uno_por_nombre on estook.plato (local_id, estook.sin_acentos(nombre));
create index plato_por_seccion on estook.plato (local_id, activo, seccion_id, orden);
create index plato_buscable on estook.plato using gin (estook.sin_acentos(nombre) gin_trgm_ops);

create trigger plato_sube_version before update on estook.plato
  for each row execute function estook.subir_version();

-- ═══ Los canales del local ════════════════════════════════════════════════════

create table estook.canal_de_venta_del_local (
  local_id             uuid                   not null references estook.local (id) on delete cascade,
  canal                estook.canal_de_venta  not null,
  activo               boolean                not null default true,
  -- Lo que se lleva la plataforma, en tanto por ciento sobre el precio con IVA.
  comision_porcentaje  numeric(5, 2),
  -- Lo que cuesta el envase de un pedido, en céntimos.
  envase_centimos      integer,
  version              integer                not null default 1,
  actualizado_en       timestamptz            not null default now(),
  primary key (local_id, canal),
  -- Sala es el canal de siempre: ni se activa ni lleva comisión.
  constraint canal_no_es_sala check (canal <> 'sala'),
  constraint canal_comision_valida check (comision_porcentaje is null or comision_porcentaje between 0 and 100),
  constraint canal_envase_valido check (envase_centimos is null or envase_centimos between 0 and 10000000)
);

comment on table estook.canal_de_venta_del_local is
  'Los canales de venta que usa el local, con su comisión y su envase (0086). Activar un canal no lo conecta: es su lista de precios.';

create trigger canal_de_venta_del_local_sube_version before update on estook.canal_de_venta_del_local
  for each row execute function estook.subir_version();

-- ═══ El precio de un plato en un canal ════════════════════════════════════════

create table estook.precio_de_plato (
  plato_id         uuid                   not null references estook.plato (id) on delete cascade,
  canal            estook.canal_de_venta  not null,
  precio_centimos  integer                not null,
  actualizado_por  uuid                   references estook.persona (id) on delete set null,
  actualizado_en   timestamptz            not null default now(),
  primary key (plato_id, canal),
  -- El de sala vive en el plato: aquí, los demás.
  constraint precio_no_es_de_sala check (canal <> 'sala'),
  constraint precio_de_plato_positivo check (precio_centimos between 0 and 100000000)
);

comment on table estook.precio_de_plato is
  'El precio a mano de un plato en un canal (0086). Sin fila, vale el de sala.';

-- ═══ Quién ve y quién toca ════════════════════════════════════════════════════
--
-- Se lee en el local (la carta no es un secreto: el camarero la necesita); se toca
-- con Carta para editar. Las comisiones las filtra la consulta a quien no edita.

alter table estook.seccion_de_carta enable row level security;
alter table estook.plato            enable row level security;
alter table estook.canal_de_venta_del_local  enable row level security;
alter table estook.precio_de_plato  enable row level security;

create policy seccion_lectura on estook.seccion_de_carta
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy seccion_escritura on estook.seccion_de_carta
  for all using (estook.puede_editar('app.carta', local_id))
  with check (estook.puede_editar('app.carta', local_id));

create policy plato_lectura on estook.plato
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy plato_escritura on estook.plato
  for all using (estook.puede_editar('app.carta', local_id))
  with check (estook.puede_editar('app.carta', local_id));

create policy canal_de_venta_lectura on estook.canal_de_venta_del_local
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy canal_de_venta_escritura on estook.canal_de_venta_del_local
  for all using (estook.puede_editar('app.carta', local_id))
  with check (estook.puede_editar('app.carta', local_id));

create policy precio_de_plato_lectura on estook.precio_de_plato
  for select using (
    exists (
      select 1 from estook.plato p
       where p.id = plato_id and p.local_id in (select local_id from estook.locales_visibles())
    )
  );
create policy precio_de_plato_escritura on estook.precio_de_plato
  for all using (
    exists (select 1 from estook.plato p where p.id = plato_id and estook.puede_editar('app.carta', p.local_id))
  )
  with check (
    exists (select 1 from estook.plato p where p.id = plato_id and estook.puede_editar('app.carta', p.local_id))
  );

-- Las secciones se quitan (sus platos pasan a «Sin sección»); los platos, no: se archivan.
grant select, insert, update, delete on estook.seccion_de_carta to estook_api;
grant select, insert, update on estook.plato to estook_api;
grant select, insert, update on estook.canal_de_venta_del_local to estook_api;
grant select, insert, update, delete on estook.precio_de_plato to estook_api;

-- ═══ El buscador encuentra los platos ═════════════════════════════════════════

create or replace function estook.buscar(p_texto text, p_limite int default 20)
returns table (
  tipo       text,
  id         uuid,
  titulo     text,
  subtitulo  text,
  local_id   uuid,
  parecido   real
)
language sql
stable
set search_path = estook, public, pg_catalog, pg_temp
as $$
  with busqueda as (
    select estook.sin_acentos(btrim(p_texto)) as texto
  ),

  -- Dónde tiene Almacén y si tiene Equipo quien pregunta (0084): una vez, y no fila
  -- a fila, que con trescientos productos serían trescientas preguntas.
  con_almacen as (
    select v.local_id from estook.locales_visibles() v
     where estook.puede_ver('app.almacen', v.local_id)
  ),

  con_equipo as (
    select 1 from estook.locales_visibles() v
     where estook.puede_ver('app.equipo', v.local_id)
     limit 1
  ),

  -- Los platos, a quien tiene Carta en ese local (0068): es donde se abren.
  con_carta as (
    select v.local_id from estook.locales_visibles() v
     where estook.puede_ver('app.carta', v.local_id)
  ),

  -- Las facturas son dinero entero (0067): a quien tiene Almacén y ve los precios de
  -- compra en ese local, que es quien abre Compras › Facturas.
  con_precios as (
    select a.local_id from con_almacen a
     where estook.puede_ver('dato.precio_de_compra', a.local_id)
  ),

  -- Si lo escrito es un número —«12», «nº 12», «#12», «pedido 12», «F-2026/0045»—,
  -- sus cifras sin ceros delante, para buscar pedidos y facturas por su número
  -- (0067). Si no lo es, nulo.
  el_numero as (
    select case
             when b.texto ~ '^[a-zº°#. -]{0,8}[0-9][0-9/ .-]*$'
             then nullif(ltrim(regexp_replace(b.texto, '[^0-9]', '', 'g'), '0'), '')
           end as cifras
      from busqueda b
  ),

  -- Locales. Se busca por nombre y por codigo: hay quien tiene el codigo mas a
  -- mano que el nombre.
  locales as (
    select
      'local'::text as tipo,
      l.id,
      l.nombre as titulo,
      coalesce(a.nombre || ' · ', '') || o.nombre as subtitulo,
      l.id as local_id,
      greatest(
        estook.parecido_al_buscar(l.nombre, b.texto),
        estook.parecido_al_buscar(l.codigo, b.texto)
      ) as parecido
    from estook.local l
    cross join busqueda b
    join estook.organizacion o on o.id = l.organizacion_id
    left join estook.area a on a.id = l.area_id
    where l.activo
      and l.id in (select local_id from estook.locales_visibles())
  ),

  -- Personas. Por nombre entero y por correo: al invitar a alguien se busca por
  -- correo, y al mirar un cuadrante, por nombre.
  personas as (
    select
      'persona'::text as tipo,
      p.id,
      p.nombre || coalesce(' ' || p.apellidos, '') as titulo,
      p.correo as subtitulo,
      null::uuid as local_id,
      greatest(
        estook.parecido_al_buscar(p.nombre || ' ' || coalesce(p.apellidos, ''), b.texto),
        estook.parecido_al_buscar(p.correo, b.texto)
      ) as parecido
    from estook.persona p
    cross join busqueda b
    where p.activa
      and p.id in (select persona_id from estook.personas_visibles())
      -- Las personas, a quien lleva Equipo en alguno de sus locales (0084): es
      -- donde se abre su ficha, y un correo no es para cualquiera del local.
      and exists (select 1 from con_equipo)
  ),

  organizaciones as (
    select
      'organizacion'::text as tipo,
      o.id,
      o.nombre as titulo,
      'Organizacion'::text as subtitulo,
      null::uuid as local_id,
      estook.parecido_al_buscar(o.nombre, b.texto) as parecido
    from estook.organizacion o
    cross join busqueda b
    where o.id in (select organizacion_id from estook.organizaciones_visibles())
  ),

  areas as (
    select
      'area'::text as tipo,
      a.id,
      a.nombre as titulo,
      o.nombre as subtitulo,
      null::uuid as local_id,
      estook.parecido_al_buscar(a.nombre, b.texto) as parecido
    from estook.area a
    cross join busqueda b
    join estook.organizacion o on o.id = a.organizacion_id
    where a.organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  ),

  -- ── M6 · el genero ─────────────────────────────────────────────────────────
  --
  -- Se busca por nombre y por codigo de barras: quien escanea uno espera llegar
  -- a su producto, no a una lista. Y los desactivados no salen, porque «ninguna
  -- lista ensena elementos desactivados, salvo en el historico» (Auditoria,
  -- parte 3).
  --
  -- Ojo con lo que **no** entra: el catalogo de referencia. Ese buscador busca
  -- cosas tuyas, y meter trescientas referencias que no estan en tu camara haria
  -- imposible encontrar la tuya.
  productos as (
    select
      'producto'::text as tipo,
      pr.id,
      pr.nombre as titulo,
      coalesce(c.nombre, pr.formato, 'Producto') as subtitulo,
      pr.local_id,
      greatest(
        estook.parecido_al_buscar(pr.nombre, b.texto),
        estook.parecido_al_buscar(coalesce(pr.codigo_de_barras, ''), b.texto)
      ) as parecido
    from estook.producto pr
    cross join busqueda b
    left join estook.categoria_de_producto c on c.id = pr.categoria_id
    where pr.activo
      -- El género, a quien tiene Almacén en ese local (0084): es donde se abre, y el
      -- camarero que no lo tiene no busca productos.
      and pr.local_id in (select local_id from con_almacen)
  ),

  proveedores as (
    select
      'proveedor'::text as tipo,
      pv.id,
      pv.nombre as titulo,
      'Proveedor'::text as subtitulo,
      pv.local_id,
      estook.parecido_al_buscar(pv.nombre, b.texto) as parecido
    from estook.proveedor pv
    cross join busqueda b
    where pv.activo
      and pv.local_id in (select local_id from con_almacen)
  ),

  -- ── 0067 · los pedidos y las facturas ──────────────────────────────────────
  --
  -- Por su número o por su proveedor (Richi, 15-oct: «encontrar pedidos y facturas
  -- por número o por proveedor, que cada resultado abra su ficha»). Por el número,
  -- todos; por el proveedor, **los tres últimos de cada uno**: «makro» no puede
  -- llenar la lista con dos años de pedidos y tapar al proveedor mismo. Y un poco
  -- por debajo del proveedor (× 0,9), que sale primero.
  pedidos_todos as (
    select
      'pedido'::text as tipo,
      p.id,
      'Pedido ' || p.numero || ' · ' || pv.nombre as titulo,
      case p.estado
        -- Como los llama Compras (`NOMBRE_DEL_ESTADO_DEL_PEDIDO`).
        when 'borrador' then 'Borrador'
        when 'enviado' then coalesce('Llega el ' || to_char(p.llega_el, 'DD/MM'), 'Mandado')
        when 'recibido' then 'Recibido'
        when 'recibido_con_incidencias' then 'Recibido con incidencias'
        else 'Cancelado'
      end as subtitulo,
      p.local_id,
      (n.cifras is not null and p.numero::text = n.cifras) as por_numero,
      estook.parecido_al_buscar(pv.nombre, b.texto) * 0.9 as por_proveedor,
      row_number() over (partition by p.proveedor_id order by p.creado_en desc) as reciente
    from estook.pedido_de_compra p
    cross join busqueda b
    cross join el_numero n
    join estook.proveedor pv on pv.id = p.proveedor_id
    where p.local_id in (select local_id from con_almacen)
  ),

  pedidos as (
    select tipo, id, titulo, subtitulo, local_id,
           (case when por_numero then 1 else por_proveedor end)::real as parecido
      from pedidos_todos
     where por_numero or reciente <= 3
  ),

  facturas_todas as (
    select
      'factura'::text as tipo,
      f.id,
      case f.tipo when 'abono' then 'Abono ' else 'Factura ' end
        || f.numero || ' · ' || pv.nombre as titulo,
      to_char(f.fecha, 'DD/MM/YYYY') || ' · ' || case f.estado
        when 'conciliada' then 'Cuadra'
        when 'con_diferencia' then 'Con diferencia'
        else 'Sin comprobar'
      end as subtitulo,
      f.local_id,
      greatest(
        estook.parecido_al_buscar(f.numero, b.texto),
        case
          when n.cifras is null then 0
          when ltrim(regexp_replace(f.numero, '[^0-9]', '', 'g'), '0') = n.cifras then 1
          when strpos(regexp_replace(f.numero, '[^0-9]', '', 'g'), n.cifras) > 0 then 0.7
          else 0
        end
      )::real as por_numero,
      estook.parecido_al_buscar(pv.nombre, b.texto) * 0.9 as por_proveedor,
      row_number() over (partition by f.proveedor_id order by f.fecha desc, f.registrada_en desc)
        as reciente
    from estook.factura_de_compra f
    cross join busqueda b
    cross join el_numero n
    join estook.proveedor pv on pv.id = f.proveedor_id
    where f.local_id in (select local_id from con_precios)
  ),

  facturas as (
    select tipo, id, titulo, subtitulo, local_id,
           greatest(por_numero, case when reciente <= 3 then por_proveedor else 0 end)::real
             as parecido
      from facturas_todas
     where por_numero >= 0.18 or reciente <= 3
  ),

  -- ── 0068 · los platos de la carta ────────────────────────────────────────
  --
  -- Por su nombre, como un producto; los archivados no salen, igual que los
  -- productos desactivados. Su sección, de subtítulo.
  platos as (
    select
      'plato'::text as tipo,
      pl.id,
      pl.nombre as titulo,
      coalesce(sc.nombre, 'Sin sección') as subtitulo,
      pl.local_id,
      estook.parecido_al_buscar(pl.nombre, b.texto) as parecido
    from estook.plato pl
    cross join busqueda b
    left join estook.seccion_de_carta sc on sc.id = pl.seccion_id
    where pl.activo
      and pl.local_id in (select local_id from con_carta)
  ),

  todo as (
    select * from locales
    union all select * from personas
    union all select * from organizaciones
    union all select * from areas
    union all select * from productos
    union all select * from proveedores
    union all select * from pedidos
    union all select * from facturas
    union all select * from platos
  ),

  -- 0,18 deja pasar una errata o dos sin llenar la lista de ruido. Se eligio
  -- probandolo: con 0,3 «Migel» no encontraba a «Miguel».
  pasan as (
    select t.*, max(t.parecido) over () as el_mejor
      from todo t
     where t.parecido >= 0.18
  )

  -- Y si algo encaja de verdad (una palabra que empieza por lo escrito), lo que se
  -- parece menos de la mitad no sale: «santi» encuentra a Santiago, no a todo el que
  -- lleva una «s» y una «t» en el correo (0084).
  select p.tipo, p.id, p.titulo, p.subtitulo, p.local_id, p.parecido
  from pasan p
  where p.parecido >= p.el_mejor * 0.5
  order by p.parecido desc, p.titulo
  limit least(greatest(p_limite, 1), 50)
$$;


comment on function estook.buscar(text, int) is
  'El buscador universal. Sin security definer: las politicas de M1 aplican igual que a cualquier consulta. Cada modulo anade su bloque por union. Desde la 0065, el parecido por palabras y cada cosa a quien la puede abrir; desde la 0067, los pedidos y las facturas, por su número o por su proveedor; desde la 0068, los platos de la carta.';
