-- 0079 · Los menús y tu zona (M10 · 2, decisiones 0103 y 0104)
--
-- Richi, el 21-oct: el menú del día con primeros, segundos y bebida, «a elegir si entra
-- pan, café y postre», secciones que se añaden y se quitan, un precio, y otro menú a un
-- botón. Que cambia cada día (A1): la pantalla es la semana, y un día que no se toca
-- repite el anterior. Y «Analiza mi zona»: Fogón busca en internet lo que cobran los de
-- alrededor, una vez cada 24 horas.
--
--   · `plato.en_la_carta`   falso para el plato que nace en el menú (las lentejas del
--                           martes): es un plato como los demás, con su id y su
--                           escandallo, pero no sale en la carta.
--   · `local.sirve_menus`   nulo mientras el local no ha contestado «¿Tu local sirve
--                           menús?»; con «No», la pestaña se esconde.
--   · `menu`                el menú del día (uno por local) y los demás: su precio, si
--                           entra pan y café, y los días que se sirve.
--   · `seccion_de_menu`     Primeros, Segundos, Postre, Bebida… en su orden.
--   · `dia_de_menu`         un día que se ha montado. Un día sin fila vale lo del último
--                           montado antes: así «repite el anterior» sin copiar nada.
--   · `plato_de_menu`       los platos de cada sección ese día, con su suplemento.
--   · `analisis_de_zona` y `precio_de_la_zona`   lo que encontró Fogón, guardado: se
--                           vuelve a mirar sin gastar, y la comparación se rehace sola
--                           cuando cambia tu precio.
--
-- **El historial de cada menú es la auditoría**, como el del plato (0068).

-- ═══ El plato que nace en el menú ═════════════════════════════════════════════

alter table estook.plato
  add column en_la_carta boolean not null default true;

comment on column estook.plato.en_la_carta is
  'Falso si nació en un menú y no sale en la carta (las lentejas del martes, 0104). Sigue siendo un plato: su escandallo, sus agotados y su historial.';

-- ═══ ¿Tu local sirve menús? ═══════════════════════════════════════════════════

alter table estook.local
  add column sirve_menus boolean;

comment on column estook.local.sirve_menus is
  'Si el local sirve menús (0103). Nulo: todavía no lo ha dicho, y se pregunta al abrir Menús. Falso: la pestaña no sale; se enciende en Ajustes › Tu local.';

-- ═══ Los menús ════════════════════════════════════════════════════════════════

create type estook.clase_de_menu as enum ('del_dia', 'otro');

create table estook.menu (
  id                uuid                  primary key default gen_random_uuid(),
  local_id          uuid                  not null references estook.local (id) on delete cascade,
  nombre            text                  not null,
  clase             estook.clase_de_menu  not null default 'otro',
  -- Un precio por menú, con IVA, como el de la pizarra. Nulo mientras no se ha puesto.
  precio_centimos   integer,
  entra_pan         boolean               not null default true,
  entra_cafe        boolean               not null default false,
  -- Los días que se sirve, de 1 (lunes) a 7 (domingo): los de la semana que se monta.
  dias              smallint[]            not null default '{1,2,3,4,5}',
  -- Lo que cuesta el pan y el café, si se quiere: un producto del Almacén y cuántas
  -- raciones da cada unidad («una barra da 6»). Sin ellos, cuentan 0 y se dice.
  pan_producto_id   uuid                  references estook.producto (id) on delete set null,
  pan_raciones      integer,
  cafe_producto_id  uuid                  references estook.producto (id) on delete set null,
  cafe_raciones     integer,
  orden             integer               not null default 0,
  -- «Nada se borra»: archivar lo quita y se recupera.
  activo            boolean               not null default true,
  creado_por        uuid                  references estook.persona (id) on delete set null,
  version           integer               not null default 1,
  creado_en         timestamptz           not null default now(),
  actualizado_en    timestamptz           not null default now(),
  constraint menu_nombre_no_vacio check (length(btrim(nombre)) > 0 and length(nombre) <= 80),
  constraint menu_precio_positivo check (precio_centimos is null or precio_centimos between 0 and 10000000),
  constraint menu_dias_validos check (
    cardinality(dias) between 1 and 7 and dias <@ '{1,2,3,4,5,6,7}'::smallint[]
  ),
  constraint menu_raciones_validas check (
    (pan_raciones is null or pan_raciones between 1 and 1000)
    and (cafe_raciones is null or cafe_raciones between 1 and 1000)
  )
);

comment on table estook.menu is
  'Los menús de un local (M10 · 2, 0104): el del día, uno, y los demás (ejecutivo, de grupo). Un precio, si entra pan y café, y los días que se sirve.';

create unique index menu_uno_por_nombre on estook.menu (local_id, estook.sin_acentos(nombre));
create unique index menu_un_solo_del_dia on estook.menu (local_id) where clase = 'del_dia' and activo;
create index menu_por_local on estook.menu (local_id, activo, orden);

create trigger menu_sube_version before update on estook.menu
  for each row execute function estook.subir_version();

create table estook.seccion_de_menu (
  id          uuid         primary key default gen_random_uuid(),
  menu_id     uuid         not null references estook.menu (id) on delete cascade,
  local_id    uuid         not null references estook.local (id) on delete cascade,
  nombre      text         not null,
  orden       integer      not null default 0,
  -- La del postre la enciende y la apaga «¿Entra postre?» sin perder sus platos.
  es_postre   boolean      not null default false,
  incluida    boolean      not null default true,
  creado_en   timestamptz  not null default now(),
  constraint seccion_de_menu_nombre_no_vacio check (length(btrim(nombre)) > 0 and length(nombre) <= 60)
);

comment on table estook.seccion_de_menu is
  'Las secciones de un menú (Primeros, Segundos, Postre, Bebida), en su orden. El cliente elige una cosa de cada una (0104).';

create unique index seccion_de_menu_una_por_nombre
  on estook.seccion_de_menu (menu_id, estook.sin_acentos(nombre));
create index seccion_de_menu_por_menu on estook.seccion_de_menu (menu_id, orden);

-- ═══ Lo de cada día ═══════════════════════════════════════════════════════════

create table estook.dia_de_menu (
  menu_id     uuid         not null references estook.menu (id) on delete cascade,
  fecha       date         not null,
  local_id    uuid         not null references estook.local (id) on delete cascade,
  puesto_por  uuid         references estook.persona (id) on delete set null,
  puesto_en   timestamptz  not null default now(),
  primary key (menu_id, fecha)
);

comment on table estook.dia_de_menu is
  'Un día que se ha montado (0104). El que no tiene fila vale lo del último montado antes: repite el anterior sin copiar nada. Es la historia que leerá Fogón para proponer el menú.';

create table estook.plato_de_menu (
  id                   uuid         primary key default gen_random_uuid(),
  menu_id              uuid         not null,
  fecha                date         not null,
  seccion_id           uuid         not null references estook.seccion_de_menu (id) on delete cascade,
  plato_id             uuid         not null references estook.plato (id) on delete cascade,
  local_id             uuid         not null references estook.local (id) on delete cascade,
  -- Lo que se cobra de más por elegirlo («entrecot +4 €»), con IVA.
  suplemento_centimos  integer      not null default 0,
  orden                integer      not null default 0,
  foreign key (menu_id, fecha) references estook.dia_de_menu (menu_id, fecha) on delete cascade,
  constraint plato_de_menu_suplemento_valido check (suplemento_centimos between 0 and 1000000)
);

comment on table estook.plato_de_menu is
  'Los platos a elegir de cada sección de un menú un día, con su suplemento (0104).';

create unique index plato_de_menu_una_vez
  on estook.plato_de_menu (menu_id, fecha, seccion_id, plato_id);
create index plato_de_menu_del_dia on estook.plato_de_menu (menu_id, fecha, seccion_id, orden);
create index plato_de_menu_por_plato on estook.plato_de_menu (plato_id);

-- ═══ Tu zona ══════════════════════════════════════════════════════════════════

create table estook.analisis_de_zona (
  id          uuid         primary key default gen_random_uuid(),
  local_id    uuid         not null references estook.local (id) on delete cascade,
  hecho_en    timestamptz  not null default now(),
  hecho_por   uuid         references estook.persona (id) on delete set null,
  -- Una frase de Fogón: qué ha mirado y qué ha encontrado.
  resumen     text,
  -- Los locales que ha leído: nombre y enlace.
  locales     jsonb        not null default '[]'::jsonb,
  constraint analisis_de_zona_resumen_corto check (resumen is null or char_length(resumen) <= 600),
  constraint analisis_de_zona_locales_lista check (jsonb_typeof(locales) = 'array')
);

comment on table estook.analisis_de_zona is
  'Lo que encontró Fogón al analizar la zona de un local (0104), uno cada 24 horas como mucho. Solo para ese local: no se junta entre clientes.';

create index analisis_de_zona_por_local on estook.analisis_de_zona (local_id, hecho_en desc);

create table estook.precio_de_la_zona (
  id               uuid         primary key default gen_random_uuid(),
  analisis_id      uuid         not null references estook.analisis_de_zona (id) on delete cascade,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  -- Con qué plato tuyo se compara; nulo, el precio del menú del día de ese local.
  plato_id         uuid         references estook.plato (id) on delete cascade,
  es_menu_del_dia  boolean      not null default false,
  -- De dónde: el local de la zona, su plato tal como lo escribe, el precio y el enlace.
  donde            text         not null,
  plato_de_alli    text,
  precio_centimos  integer      not null,
  enlace           text         not null,
  leido_el         date,
  constraint precio_de_la_zona_de_algo check (es_menu_del_dia or plato_id is not null),
  constraint precio_de_la_zona_precio_valido check (precio_centimos between 1 and 100000),
  constraint precio_de_la_zona_enlace_web check (enlace ~ '^https?://' and char_length(enlace) <= 500),
  constraint precio_de_la_zona_textos_cortos check (
    char_length(donde) between 1 and 120 and (plato_de_alli is null or char_length(plato_de_alli) <= 160)
  )
);

comment on table estook.precio_de_la_zona is
  'Un precio público de otro local de la zona, con su enlace y su fecha (0104). Las medias las calcula la base; con menos de tres, no se juzga.';

create index precio_de_la_zona_por_analisis on estook.precio_de_la_zona (analisis_id);

-- ═══ Quién ve y quién toca ════════════════════════════════════════════════════
--
-- Se lee en el local (el camarero tiene que saber qué hay hoy de menú); se toca con
-- Carta para editar. Lo que deja cada menú, con sus euros, lo filtra la consulta.

alter table estook.menu              enable row level security;
alter table estook.seccion_de_menu   enable row level security;
alter table estook.dia_de_menu       enable row level security;
alter table estook.plato_de_menu     enable row level security;
alter table estook.analisis_de_zona  enable row level security;
alter table estook.precio_de_la_zona enable row level security;

create policy menu_lectura on estook.menu
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy menu_escritura on estook.menu
  for all using (estook.puede_editar('app.carta', local_id))
  with check (estook.puede_editar('app.carta', local_id));

create policy seccion_de_menu_lectura on estook.seccion_de_menu
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy seccion_de_menu_escritura on estook.seccion_de_menu
  for all using (estook.puede_editar('app.carta', local_id))
  with check (
    estook.puede_editar('app.carta', local_id)
    and exists (select 1 from estook.menu m where m.id = menu_id and m.local_id = seccion_de_menu.local_id)
  );

create policy dia_de_menu_lectura on estook.dia_de_menu
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy dia_de_menu_escritura on estook.dia_de_menu
  for all using (estook.puede_editar('app.carta', local_id))
  with check (
    estook.puede_editar('app.carta', local_id)
    and exists (select 1 from estook.menu m where m.id = menu_id and m.local_id = dia_de_menu.local_id)
  );

-- Un plato de otro local no entra en tu menú, aunque se sepa su id.
create policy plato_de_menu_lectura on estook.plato_de_menu
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy plato_de_menu_escritura on estook.plato_de_menu
  for all using (estook.puede_editar('app.carta', local_id))
  with check (
    estook.puede_editar('app.carta', local_id)
    and exists (select 1 from estook.menu m where m.id = menu_id and m.local_id = plato_de_menu.local_id)
    and exists (select 1 from estook.plato p where p.id = plato_id and p.local_id = plato_de_menu.local_id)
    and exists (
      select 1 from estook.seccion_de_menu s
       where s.id = seccion_id and s.menu_id = plato_de_menu.menu_id
    )
  );

create policy analisis_de_zona_lectura on estook.analisis_de_zona
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy analisis_de_zona_escritura on estook.analisis_de_zona
  for insert with check (estook.puede_editar('app.carta', local_id));

create policy precio_de_la_zona_lectura on estook.precio_de_la_zona
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy precio_de_la_zona_escritura on estook.precio_de_la_zona
  for insert with check (
    estook.puede_editar('app.carta', local_id)
    and exists (
      select 1 from estook.analisis_de_zona a
       where a.id = analisis_id and a.local_id = precio_de_la_zona.local_id
    )
    and (plato_id is null or exists (
      select 1 from estook.plato p where p.id = plato_id and p.local_id = precio_de_la_zona.local_id
    ))
  );

-- Los menús se archivan, no se borran; sus secciones y sus días, sí se quitan. Lo de la
-- zona solo se añade: es lo que se leyó ese día.
grant select, insert, update on estook.menu to estook_api;
grant select, insert, update, delete on estook.seccion_de_menu to estook_api;
grant select, insert, update, delete on estook.dia_de_menu to estook_api;
grant select, insert, update, delete on estook.plato_de_menu to estook_api;
grant select, insert on estook.analisis_de_zona to estook_api;
grant select, insert on estook.precio_de_la_zona to estook_api;

-- ═══ Fogón busca en internet ══════════════════════════════════════════════════
--
-- «Analiza mi zona» (0104): cada búsqueda en internet se paga aparte (10 $ cada mil), y
-- se apunta con la llamada. Copiada de la 0078 entera, con `analizar_zona` añadido.

alter table estook.llamada_a_fogon
  add column busquedas_en_internet smallint not null default 0,
  add constraint llamada_a_fogon_busquedas_no_negativas check (busquedas_en_internet >= 0);

alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta', 'analizar_zona'
));

-- Y cabe lo que gasta: 25 créditos (Richi: «gastando muchos créditos»). Hasta ahora lo
-- más caro eran 20.
alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_creditos;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_creditos check (creditos between 1 and 30);

-- ═══ IKATZ sirve menú del día ═════════════════════════════════════════════════
--
-- Richi, 21-oct: «IKATZ sí hace, dejar esa opción como activada». Con su menú del día
-- ya montado de fábrica, sin precio ni platos todavía.

update estook.local l
   set sirve_menus = true
  from estook.organizacion o
 where o.id = l.organizacion_id
   and o.codigo = 'ikatz';

with nuevos as (
  insert into estook.menu (local_id, nombre, clase)
  select l.id, 'Menú del día', 'del_dia'
    from estook.local l
    join estook.organizacion o on o.id = l.organizacion_id
   where o.codigo = 'ikatz'
     and not exists (select 1 from estook.menu m where m.local_id = l.id and m.clase = 'del_dia')
  returning id, local_id
)
insert into estook.seccion_de_menu (menu_id, local_id, nombre, orden, es_postre, incluida)
select n.id, n.local_id, s.nombre, s.orden, s.es_postre, s.incluida
  from nuevos n
 cross join (values ('Primeros', 0, false, true),
                    ('Segundos', 1, false, true),
                    ('Postre', 2, true, false),
                    ('Bebida', 3, false, true)) as s (nombre, orden, es_postre, incluida);
