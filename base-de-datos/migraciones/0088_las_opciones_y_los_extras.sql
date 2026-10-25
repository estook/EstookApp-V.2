-- 0088 · T3 · 2 · 1 · Las opciones y los extras, y lo que se vende a peso (decisión 0113;
-- Anexo 7.2, 10.3 y 11.11)
--
--   · `grupo_de_opciones`   un grupo que se usa en muchos platos: la guarnición, los extras de
--                           la hamburguesa, el «¿Con qué?» de las copas; con cuántas se eligen
--   · `opcion_de_grupo`     cada opción, con su precio (suma, o resta en una sustitución más
--                           barata) y **lo que gasta del almacén**: añade un producto, quita un
--                           ingrediente del escandallo, cambia uno por otro, o nada (el libre)
--   · `grupo_del_plato`     qué grupos pregunta cada plato, y en qué orden
--   · `plato.a_peso`        se vende a peso: su precio es el del kilo
--   · `linea_de_cuenta`     lo elegido, **congelado al pedir** (`opciones`), y lo que pesó
--
-- El grupo, sus opciones y a qué platos va los monta quien tiene los Ajustes del TPV (Roles
-- 1.12), como la botonera. Que un plato se venda a peso es de la carta: lo cambia quien la
-- cambia.

create table estook.grupo_de_opciones (
  id            uuid         primary key default gen_random_uuid(),
  local_id      uuid         not null references estook.local (id) on delete cascade,
  nombre        text         not null,
  -- 0: opcional. Obligatoria y una: 1 y 1.
  minimo        smallint     not null default 0,
  maximo        smallint     not null default 1,
  version       integer      not null default 1,
  creado_en     timestamptz  not null default now(),

  constraint grupo_nombre_corto check (char_length(btrim(nombre)) between 1 and 40),
  constraint grupo_cuantas_razonables check (minimo between 0 and 20 and maximo between 1 and 20 and minimo <= maximo)
);

comment on table estook.grupo_de_opciones is
  'Un grupo de opciones que se usa en muchos platos (T3 · 2, Anexo 10.3): la guarnición, los extras, el «¿Con qué?» de las copas. Mínimo 0: opcional.';

create unique index grupo_uno_por_nombre on estook.grupo_de_opciones (local_id, estook.sin_acentos(nombre));

create trigger grupo_de_opciones_sube_version before update on estook.grupo_de_opciones
  for each row execute function estook.subir_version();

create table estook.opcion_de_grupo (
  id                  uuid                  primary key default gen_random_uuid(),
  local_id            uuid                  not null references estook.local (id) on delete cascade,
  grupo_id            uuid                  not null references estook.grupo_de_opciones (id) on delete cascade,
  nombre              text                  not null,
  orden               smallint              not null default 0,
  -- Lo que suma al precio del plato, con IVA; una sustitución más barata, resta.
  precio_centimos     integer               not null default 0,
  -- Lo que gasta: añade un producto del almacén en su cantidad…
  anade_producto_id   uuid                  references estook.producto (id) on delete restrict,
  anade_cantidad      numeric(12, 4),
  anade_unidad        estook.unidad_de_uso,
  -- …y quita un ingrediente del escandallo del plato (sin cebolla; o, con el de arriba, lo
  -- cambia por otro: pan sin gluten). Sin nada, el extra libre: no se sabe qué es.
  quita_producto_id   uuid                  references estook.producto (id) on delete restrict,

  constraint opcion_nombre_corto check (char_length(btrim(nombre)) between 1 and 40),
  constraint opcion_precio_razonable check (precio_centimos between -100000 and 100000),
  constraint opcion_lo_que_anade_entero check (
    (anade_producto_id is null and anade_cantidad is null and anade_unidad is null)
    or (anade_producto_id is not null and anade_cantidad > 0 and anade_cantidad <= 100000 and anade_unidad is not null)
  )
);

comment on table estook.opcion_de_grupo is
  'Una opción de un grupo, con su precio y lo que gasta del almacén: añade, quita, cambia uno por otro, o nada (el extra libre).';

create index opcion_por_grupo on estook.opcion_de_grupo (grupo_id, orden);

create table estook.grupo_del_plato (
  local_id   uuid      not null references estook.local (id) on delete cascade,
  plato_id   uuid      not null references estook.plato (id) on delete cascade,
  grupo_id   uuid      not null references estook.grupo_de_opciones (id) on delete cascade,
  orden      smallint  not null default 0,
  primary key (plato_id, grupo_id)
);

comment on table estook.grupo_del_plato is
  'Qué grupos de opciones pregunta un plato al pedirlo, y en qué orden (T3 · 2).';

create index grupo_del_plato_por_grupo on estook.grupo_del_plato (grupo_id);

-- Las tres, como la botonera: las leen los del local y las montan los de los Ajustes del TPV.
alter table estook.grupo_de_opciones enable row level security;
alter table estook.opcion_de_grupo enable row level security;
alter table estook.grupo_del_plato enable row level security;

create policy grupo_de_opciones_lectura on estook.grupo_de_opciones
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy grupo_de_opciones_escritura on estook.grupo_de_opciones
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));

create policy opcion_de_grupo_lectura on estook.opcion_de_grupo
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy opcion_de_grupo_escritura on estook.opcion_de_grupo
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (
    estook.puede_editar('accion.ajustes_del_tpv', local_id)
    and exists (
      select 1 from estook.grupo_de_opciones g
       where g.id = grupo_id and g.local_id = opcion_de_grupo.local_id
    )
  );

create policy grupo_del_plato_lectura on estook.grupo_del_plato
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy grupo_del_plato_escritura on estook.grupo_del_plato
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (
    estook.puede_editar('accion.ajustes_del_tpv', local_id)
    and exists (select 1 from estook.plato p where p.id = plato_id and p.local_id = grupo_del_plato.local_id)
    and exists (
      select 1 from estook.grupo_de_opciones g
       where g.id = grupo_id and g.local_id = grupo_del_plato.local_id
    )
  );

revoke all on estook.grupo_de_opciones from public;
revoke all on estook.opcion_de_grupo from public;
revoke all on estook.grupo_del_plato from public;
grant select, insert, update, delete on estook.grupo_de_opciones to estook_api;
grant select, insert, update, delete on estook.opcion_de_grupo to estook_api;
grant select, insert, update, delete on estook.grupo_del_plato to estook_api;

-- ═══ Lo que se vende a peso ══════════════════════════════════════════════════════

alter table estook.plato add column a_peso boolean not null default false;

comment on column estook.plato.a_peso is
  'Se vende a peso (el jamón, el pescado del día): su precio es el del kilo, y al pedirlo se dice cuánto pesa (Anexo 10.3).';

-- ═══ Lo elegido, en la línea de la cuenta ════════════════════════════════════════

-- Congelado al pedir, como el nombre y el precio: si mañana cambia la opción, esto no. Con lo
-- que gasta, para que el almacén descuente lo que se sirvió.
alter table estook.linea_de_cuenta
  add column opciones     jsonb    not null default '[]',
  add column peso_gramos  integer,
  add constraint linea_opciones_en_lista check (jsonb_typeof(opciones) = 'array'),
  add constraint linea_peso_razonable check (peso_gramos is null or peso_gramos between 1 and 100000);

comment on column estook.linea_de_cuenta.opciones is
  'Las opciones elegidas, congeladas al pedir: [{opcionId, grupo, nombre, precioCentimos, anade, quita}]. El precio de la línea ya las lleva.';
comment on column estook.linea_de_cuenta.peso_gramos is
  'Lo que pesó, si el plato se vende a peso: el precio de la línea es el de esos gramos.';
