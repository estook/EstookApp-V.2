-- 0048 · El repaso del 25-sep: Almacén e Inventario, lo congelado aparte, el Tablón
-- y la carta del local subida (decisión 0049)
--
-- Cuatro cosas que Richi vio al mirar E2:
--
--   A · **Almacén e Inventario.** La app que se llamaba «Inventario» se llama
--       **Almacén** —donde se guarda todo—, y lo que se llamaba «Recuento» se llama
--       **Inventario**, que es como se dice en una cocina: «hoy toca hacer
--       inventario». El permiso `app.inventario` pasa a `app.almacen`, con sus 23
--       políticas y sus filas, y los enlaces que guarda el Calendario van a la
--       dirección nueva. **Las políticas no se reescriben a mano**: se leen de la
--       propia base y se cambia solo el nombre del permiso, así que no puede colarse
--       ni una diferencia de más.
--   B · **Lo congelado va aparte.** No avisa por caducidad: avisa por lo que lleva en
--       el congelador. Cada producto dice cuánto aguanta congelado, tres meses si
--       nadie lo cambia.
--   C · **El Tablón**: las notas del equipo de un local —«reserva a las 17:00 de 20
--       personas»—, para todos o para cocina o sala, con hora si la tienen, y quién
--       las ha leído.
--   D · **La carta del local, subida**: el PDF o las fotos de la carta que ya tiene,
--       que es lo que enseña su QR hasta que haya platos (M10).

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Almacén e Inventario
-- ═══════════════════════════════════════════════════════════════════════════

-- El permiso nuevo, copia del de antes con su nombre de ahora.
insert into estook.permiso (codigo, nombre, familia, ambito, descripcion)
select 'app.almacen', 'Almacén', familia, ambito, 'Género, proveedores, pedidos, inventarios y mermas'
  from estook.permiso
 where codigo = 'app.inventario';

update estook.permiso_de_rol set permiso = 'app.almacen' where permiso = 'app.inventario';
update estook.recorte_de_permiso set permiso = 'app.almacen' where permiso = 'app.inventario';

-- Las políticas y las funciones que lo nombran, leídas de la base y con solo el
-- nombre del permiso cambiado. `alter policy` cambia la expresión sin tocar a quién
-- se aplica ni para qué orden; `pg_get_functiondef` devuelve la función entera,
-- con su `security definer` y su `search_path`, y reemplazarla conserva los permisos.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('estook', 'plataforma')
       and (qual like '%''app.inventario''%' or with_check like '%''app.inventario''%')
  loop
    execute format(
      'alter policy %I on %I.%I %s %s',
      p.policyname, p.schemaname, p.tablename,
      case when p.qual is null then ''
           else format('using (%s)', replace(p.qual, '''app.inventario''', '''app.almacen''')) end,
      case when p.with_check is null then ''
           else format('with check (%s)', replace(p.with_check, '''app.inventario''', '''app.almacen''')) end
    );
  end loop;

  for p in
    select f.oid
      from pg_proc f
      join pg_namespace n on n.oid = f.pronamespace
     where n.nspname in ('estook', 'plataforma')
       and f.prosrc like '%''app.inventario''%'
  loop
    execute replace(pg_get_functiondef(p.oid), '''app.inventario''', '''app.almacen''');
  end loop;
end;
$$;

delete from estook.permiso where codigo = 'app.inventario';

-- Lo que se ve de los permisos y los roles, con los nombres de ahora.
update estook.permiso
   set nombre = 'Cerrar un inventario'
 where codigo = 'accion.cerrar_recuento';

update estook.permiso
   set descripcion = replace(descripcion, 'quien lleva Inventario', 'quien lleva el Almacén')
 where descripcion like '%quien lleva Inventario%';

update estook.rol
   set descripcion = replace(replace(descripcion, 'Inventario entera', 'Almacén entero'),
                             'Inventario y proveedores', 'Almacén y proveedores')
 where descripcion like '%Inventario%';

-- Los enlaces del Calendario que llevaban a la app con su nombre de antes. La app
-- lleva también las direcciones viejas a las nuevas, para los marcadores.
update estook.evento_de_calendario
   set ir = '/almacen' || substr(ir, length('/inventario') + 1)
 where ir like '/inventario/%' or ir = '/inventario';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo congelado va aparte
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Lo congelado no caduca mientras siga en el congelador: se queda viejo. Así que
-- no avisa por la fecha de caducidad de cuando estaba fresco, sino por el tiempo
-- que lleva congelado. Tres meses es lo habitual en el APPCC de hostelería para lo
-- que congela el propio local, y cada producto lo cambia en su ficha (Richi, 25-sep).

alter table estook.producto
  add column congelado_aguanta_meses smallint not null default 3,
  add constraint producto_congelado_aguanta_razonable
    check (congelado_aguanta_meses between 1 and 24);

comment on column estook.producto.congelado_aguanta_meses is
  'Cuántos meses aguanta congelado. De ahí sale el aviso de lo congelado, no de su caducidad (0049).';

-- Los avisos del Calendario de lo que ya estaba congelado, al día de hoy: el día que
-- cumple lo que aguanta, y no el de su caducidad de fresco. Con el mismo título que
-- pone `publicarLaCaducidad` (`tituloDeLoCongelado`), que la prueba compara. Los que
-- ya tenían aviso lo cambian; los que no, lo estrenan, salvo los de ejemplo, que
-- tienen que quedar apuntados como ejemplo y eso lo hace la API.
insert into estook.evento_de_calendario (
  local_id, capa, origen, origen_id, dia, titulo, detalle, ir, es_ejemplo
)
select l.local_id, 'caducidad', 'lote', l.id::text,
       (l.congelado_el + make_interval(months => p.congelado_aguanta_meses::int))::date,
       p.nombre || ' cumple ' || p.congelado_aguanta_meses::text
         || case when p.congelado_aguanta_meses = 1 then ' mes' else ' meses' end
         || ' congelado',
       case when l.codigo is null then null else 'Lote ' || l.codigo end,
       '/almacen/productos/todo?producto=' || p.id::text,
       l.es_ejemplo
  from estook.lote l
  join estook.producto p on p.id = l.producto_id
 where l.congelado_el is not null
   and l.retirado_en is null
   and (not l.es_ejemplo
        or exists (select 1 from estook.evento_de_calendario e
                    where e.capa = 'caducidad' and e.origen = 'lote' and e.origen_id = l.id::text))
on conflict (capa, origen, origen_id) do update
   set dia = excluded.dia, titulo = excluded.titulo, detalle = excluded.detalle;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El Tablón
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una nota del equipo de un local, para un día. Sin zona es para todos; con zona,
-- para cocina o para sala (quien lleva las dos, las ve todas). Con hora, sale
-- también en «Hoy» y en el Calendario. Se va sola al pasar su día: no se borra,
-- deja de enseñarse. Quitarla antes lo puede su autor o quien lleva al equipo.

create table estook.nota_del_tablon (
  id           uuid                        primary key default gen_random_uuid(),
  local_id     uuid                        not null references estook.local (id) on delete cascade,
  autor_id     uuid                        not null references estook.persona (id) on delete restrict,
  texto        text                        not null,
  zona         estook.zona_del_producto,
  dia          date                        not null,
  hora         time,
  creada_en    timestamptz                 not null default now(),
  quitada_en   timestamptz,
  quitada_por  uuid                        references estook.persona (id) on delete set null,
  constraint nota_texto_con_medida check (char_length(btrim(texto)) between 1 and 280),
  constraint nota_para_cocina_o_sala check (zona is null or zona in ('cocina', 'sala')),
  constraint nota_quitada_con_quien check ((quitada_en is null) = (quitada_por is null))
);

create index nota_del_tablon_del_dia on estook.nota_del_tablon (local_id, dia)
  where quitada_en is null;

comment on table estook.nota_del_tablon is
  'El Tablón del local: notas del equipo para un día, para todos o para cocina o sala, con quién las ha leído (0049).';

create table estook.nota_leida (
  nota_id     uuid         not null references estook.nota_del_tablon (id) on delete cascade,
  persona_id  uuid         not null references estook.persona (id) on delete cascade,
  leida_en    timestamptz  not null default now(),
  primary key (nota_id, persona_id)
);

comment on table estook.nota_leida is
  'Quién ha leído cada nota del Tablón. La lee su autor, para saber quién falta (0049).';

alter table estook.nota_del_tablon enable row level security;
alter table estook.nota_leida enable row level security;

-- Leer: quien ve el local, si la nota es para todos o para una de sus zonas. Su
-- autor la ve siempre, y quien lleva al equipo también.
create policy nota_lectura on estook.nota_del_tablon
  for select using (
    local_id in (select estook.locales_visibles())
    and (
      zona is null
      or zona = any (estook.zonas_que_ve(local_id))
      or autor_id = estook.persona_actual()
      or estook.puede_ver('app.equipo', local_id)
    )
  );

-- Escribir: cualquiera del local, y siempre a su nombre.
create policy nota_alta on estook.nota_del_tablon
  for insert with check (
    local_id in (select estook.locales_visibles())
    and autor_id = estook.persona_actual()
    and quitada_en is null
  );

-- Quitarla: su autor, o quien lleva al equipo (quien ve Equipo: los jefes y de ahí arriba).
create policy nota_quitar on estook.nota_del_tablon
  for update using (
    autor_id = estook.persona_actual() or estook.puede_ver('app.equipo', local_id)
  )
  with check (
    autor_id = estook.persona_actual() or estook.puede_ver('app.equipo', local_id)
  );

-- Quién la ha leído: cada uno lo suyo; y de una nota, su autor y quien lleva al
-- equipo, que es para lo que sirve saberlo.
create policy leida_lectura on estook.nota_leida
  for select using (
    persona_id = estook.persona_actual()
    or exists (
      select 1 from estook.nota_del_tablon n
       where n.id = nota_id
         and (n.autor_id = estook.persona_actual()
              or estook.puede_ver('app.equipo', n.local_id))
    )
  );

-- Marcarla leída: cada uno la suya, y solo una nota que puede ver.
create policy leida_alta on estook.nota_leida
  for insert with check (
    persona_id = estook.persona_actual()
    and exists (select 1 from estook.nota_del_tablon n where n.id = nota_id)
  );

revoke all on estook.nota_del_tablon from public;
revoke all on estook.nota_leida from public;
grant select, insert, update on estook.nota_del_tablon to estook_api;
grant select, insert on estook.nota_leida to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · La carta del local, subida
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La carta que el local ya tiene, en PDF o en fotos. Se guarda **como páginas en
-- imagen** —el navegador pasa cada página del PDF a imagen al subirla—, porque es lo
-- que se lee bien en el móvil de quien escanea el QR. En la fila, claves del
-- almacén, nunca direcciones (0046).

alter table estook.local
  add column carta_paginas   text[],
  add column carta_subida_en timestamptz,
  add constraint local_carta_con_paginas
    check (carta_paginas is null or cardinality(carta_paginas) between 1 and 12),
  add constraint local_carta_con_fecha
    check ((carta_paginas is null) = (carta_subida_en is null));

-- El cubo de las cartas, privado como el de la marca: nadie llega a una página sin
-- un enlace firmado por la API. Solo donde hay almacén (Supabase); en las bases de
-- las pruebas no existe el esquema `storage` y no se hace nada.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('cartas', 'cartas', false, 1536 * 1024, array['image/webp', 'image/jpeg'])
    on conflict (id) do nothing;
  end if;
end;
$$;

comment on column estook.local.carta_paginas is
  'Las páginas de la carta subida, en orden: claves del almacén. Es lo que enseña su QR hasta que haya platos (0049).';

-- Lo que enseña el QR, con la carta subida. La función de la 0046 entera, con una
-- columna más: cambia lo que devuelve, así que se quita y se vuelve a crear.
drop function estook.la_carta_publica(text);

create function estook.la_carta_publica(p_direccion text)
returns table (
  nombre text,
  direccion text,
  poblacion text,
  telefono text,
  web text,
  mapa text,
  valoracion numeric,
  resenas integer,
  horario jsonb,
  color_de_marca text,
  logo_clave text,
  carta_paginas text[]
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select l.nombre,
         coalesce(l.google_direccion,
                  nullif(concat_ws(', ', l.direccion, l.poblacion), '')),
         l.poblacion,
         coalesce(l.google_telefono, l.telefono),
         l.google_web,
         l.google_mapa,
         l.google_valoracion,
         l.google_resenas,
         l.google_horario,
         l.color_de_marca,
         l.logo_clave,
         l.carta_paginas
    from estook.local l
   where l.direccion_de_la_carta = lower(p_direccion)
     and l.activo
$$;

comment on function estook.la_carta_publica(text) is
  'Lo que enseña estook.com/carta/<dirección> a quien escanea el QR, sin sesión: solo lo que el local ya enseña al mundo, y su carta subida (0047, 0049).';

revoke all on function estook.la_carta_publica(text) from public;
grant execute on function estook.la_carta_publica(text) to estook_api;
