-- 0069 · Fichas y escandallos (M9 · 2, decisiones 0086 y 0087)
--
-- La Carta ya dice lo que se vende y a cuánto (0068). Esto cuelga de cada plato **lo
-- que lleva y cómo se hace**, y de ahí sale solo lo que cuesta: el escandallo no se
-- guarda, se calcula cada vez con el Almacén de ese momento (Plan, M9: «nada escrito
-- a mano»).
--
--   · `elaboracion`        la salsa, el caldo, la masa: se prepara antes, no se vende
--                          y dice cuánto rinde («2 l»). Se usa dentro de otras.
--   · `receta`             la de ahora de un plato o de una elaboración: sus pasos, sus
--                          notas y su tiempo. Una por cada uno.
--   · `linea_de_receta`    lo que lleva: un producto del Almacén o una elaboración, en
--                          su cantidad y su unidad.
--   · `receta_guardada`    **cada guardado, entero**: el historial con quién, cuándo y
--                          qué cambió, la receta de antes para recuperarla, y la que
--                          valía el día que se vendió (Manifiesto 13: nunca se
--                          recalcula el pasado). En pantalla no hay versiones: solo
--                          la de ahora y su historial plegado (0086, pregunta 5).
--
-- Y el plato gana lo que la carta enseña al cliente (repaso del 16-oct): **cuántas
-- unidades lleva la ración** («8 croquetas»), **sus alérgenos** puestos a mano —se
-- suman a los de su receta—, **si pica** y si es vegetariano o vegano.
--
-- Y la ficha la ven todos (Richi, 16-oct: «es para camareros y cocineros sobre todo,
-- pero todos pueden acceder»): el camarero y el jefe de sala reciben Escandallos para
-- **ver**, que sin `dato.coste_de_plato` es la ficha sin un euro.

-- ═══ Lo nuevo del plato, para la carta ════════════════════════════════════════

alter table estook.plato
  add column unidades_por_racion smallint,
  add column alergenos           text[]   not null default '{}',
  add column picante             smallint not null default 0,
  add column distintivos         text[]   not null default '{}',
  add constraint plato_unidades_razonables
    check (unidades_por_racion is null or unidades_por_racion between 1 and 99),
  add constraint plato_picante_en_rango check (picante between 0 and 3),
  add constraint plato_distintivos_conocidos
    check (distintivos <@ array['vegetariano', 'vegano']::text[]);

comment on column estook.plato.unidades_por_racion is
  'Cuántas lleva la ración, para la carta («8 croquetas»). Opcional: la mayoría de platos no lo dicen.';
comment on column estook.plato.alergenos is
  'Los alérgenos puestos a mano en la carta. Se suman a los que trae su receta; nunca los quitan.';
comment on column estook.plato.picante is
  'Cuánto pica, de 0 (nada) a 3 guindillas.';

-- Los catorce oficiales y ninguno más, con el mismo vigilante que el producto.
create trigger plato_alergenos_conocidos
  before insert or update of alergenos on estook.plato
  for each row execute function estook.alergenos_conocidos();

-- ═══ Las elaboraciones ════════════════════════════════════════════════════════

create table estook.elaboracion (
  id              uuid                  primary key default gen_random_uuid(),
  local_id        uuid                  not null references estook.local (id) on delete cascade,
  nombre          text                  not null,
  -- Lo que sale de hacerla una vez: «2 l», «1,5 kg», «40 ud». De ahí, lo que cuesta
  -- el litro (0086, pregunta 2).
  rinde_cantidad  numeric(12, 4)        not null,
  rinde_unidad    estook.unidad_de_uso  not null,
  activo          boolean               not null default true,
  es_ejemplo      boolean               not null default false,
  creado_por      uuid                  references estook.persona (id) on delete set null,
  version         integer               not null default 1,
  creado_en       timestamptz           not null default now(),
  actualizado_en  timestamptz           not null default now(),
  constraint elaboracion_nombre_no_vacio check (length(btrim(nombre)) > 0 and length(nombre) <= 120),
  constraint elaboracion_rinde_positivo check (rinde_cantidad > 0 and rinde_cantidad <= 100000)
);

comment on table estook.elaboracion is
  'Lo que se prepara antes y no se vende (M9 · 2): una salsa, un caldo. Dice cuánto rinde y se usa dentro de otras recetas.';

create unique index elaboracion_una_por_nombre
  on estook.elaboracion (local_id, estook.sin_acentos(nombre));
create index elaboracion_por_local on estook.elaboracion (local_id, activo, nombre);

create trigger elaboracion_sube_version before update on estook.elaboracion
  for each row execute function estook.subir_version();

-- ═══ La receta de ahora ═══════════════════════════════════════════════════════

create table estook.receta (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  -- De un plato **o** de una elaboración: una por cada uno.
  plato_id        uuid         unique references estook.plato (id) on delete cascade,
  elaboracion_id  uuid         unique references estook.elaboracion (id) on delete cascade,
  -- Los pasos, en orden. Dato, no un texto suelto (Plan, M9): uno por paso.
  pasos           text[]       not null default '{}',
  -- Emplatado, conservación, lo que no es un paso.
  notas           text,
  tiempo_minutos  smallint,
  version         integer      not null default 1,
  actualizado_por uuid         references estook.persona (id) on delete set null,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint receta_de_uno_solo check ((plato_id is null) <> (elaboracion_id is null)),
  constraint receta_pasos_razonables check (cardinality(pasos) <= 40),
  constraint receta_notas_cortas check (notas is null or length(notas) <= 1000),
  constraint receta_tiempo_razonable check (tiempo_minutos is null or tiempo_minutos between 1 and 2880)
);

comment on table estook.receta is
  'La receta de ahora de un plato (por ración) o de una elaboración (por lo que rinde). Cada guardado queda entero en receta_guardada.';

create index receta_por_local on estook.receta (local_id);

create table estook.linea_de_receta (
  id              uuid                  primary key default gen_random_uuid(),
  receta_id       uuid                  not null references estook.receta (id) on delete cascade,
  orden           smallint              not null,
  -- Un producto del Almacén **o** una elaboración. Ni uno ni otro se borran nunca
  -- (se desactivan o se archivan): la receta no se queda colgando.
  producto_id     uuid                  references estook.producto (id) on delete restrict,
  elaboracion_id  uuid                  references estook.elaboracion (id) on delete restrict,
  -- En limpio, como va al plato (Plan, M9): el aprovechamiento lo pone el coste.
  cantidad        numeric(12, 4)        not null,
  unidad          estook.unidad_de_uso  not null,
  -- «Picada fina», «en láminas».
  nota            text,
  constraint linea_de_uno_solo check ((producto_id is null) <> (elaboracion_id is null)),
  constraint linea_cantidad_positiva check (cantidad > 0 and cantidad <= 100000),
  constraint linea_nota_corta check (nota is null or length(nota) <= 80),
  constraint linea_orden_unico unique (receta_id, orden)
);

comment on table estook.linea_de_receta is
  'Lo que lleva una receta: un producto o una elaboración, en su cantidad. Si el mismo entra dos veces, se suma y se avisa (Plan, M9).';

create index linea_de_receta_por_producto on estook.linea_de_receta (producto_id);
create index linea_de_receta_por_elaboracion on estook.linea_de_receta (elaboracion_id);

create trigger receta_sube_version before update on estook.receta
  for each row execute function estook.subir_version();

-- ═══ Cada guardado, entero ════════════════════════════════════════════════════

create table estook.receta_guardada (
  id              uuid         primary key default gen_random_uuid(),
  receta_id       uuid         not null references estook.receta (id) on delete cascade,
  local_id        uuid         not null references estook.local (id) on delete cascade,
  version         integer      not null,
  -- La receta tal cual quedó: nombres, cantidades, pasos. Se lee sin mirar nada más.
  contenido       jsonb        not null,
  -- Lo que cambió respecto a la anterior, en una línea cada cosa: «Carne: 180 → 200 g».
  cambios         text[]       not null default '{}',
  -- Si este guardado fue recuperar otro, cuál.
  recupera        integer,
  persona_id      uuid         references estook.persona (id) on delete set null,
  guardada_en     timestamptz  not null default now(),
  constraint receta_guardada_una_por_version unique (receta_id, version),
  constraint receta_guardada_es_objeto check (jsonb_typeof(contenido) = 'object')
);

comment on table estook.receta_guardada is
  'El historial de una receta (0086, pregunta 5): cada guardado entero, con quién y qué cambió. Lo vendido se cuenta con la que valía ese día.';

create index receta_guardada_por_receta on estook.receta_guardada (receta_id, guardada_en desc);

-- ═══ Quién ve y quién toca ════════════════════════════════════════════════════
--
-- Se lee en el local: aquí no hay un euro (el coste se calcula en la API, y solo
-- viaja a quien tiene `dato.coste_de_plato`), y la sala necesita los alérgenos.
-- Se escribe con Escandallos para editar. El historial no se cambia nunca.

alter table estook.elaboracion     enable row level security;
alter table estook.receta          enable row level security;
alter table estook.linea_de_receta enable row level security;
alter table estook.receta_guardada enable row level security;

create policy elaboracion_lectura on estook.elaboracion
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy elaboracion_escritura on estook.elaboracion
  for all using (estook.puede_editar('app.escandallos', local_id))
  with check (estook.puede_editar('app.escandallos', local_id));

create policy receta_lectura on estook.receta
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy receta_escritura on estook.receta
  for all using (estook.puede_editar('app.escandallos', local_id))
  with check (estook.puede_editar('app.escandallos', local_id));

create policy linea_de_receta_lectura on estook.linea_de_receta
  for select using (
    exists (
      select 1 from estook.receta r
       where r.id = receta_id and r.local_id in (select local_id from estook.locales_visibles())
    )
  );
create policy linea_de_receta_escritura on estook.linea_de_receta
  for all using (
    exists (select 1 from estook.receta r where r.id = receta_id and estook.puede_editar('app.escandallos', r.local_id))
  )
  with check (
    exists (select 1 from estook.receta r where r.id = receta_id and estook.puede_editar('app.escandallos', r.local_id))
  );

create policy receta_guardada_lectura on estook.receta_guardada
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy receta_guardada_escritura on estook.receta_guardada
  for insert with check (estook.puede_editar('app.escandallos', local_id));

-- Las elaboraciones se archivan, no se borran; las líneas de la receta de ahora se
-- rehacen al guardar; el historial solo crece.
grant select, insert, update on estook.elaboracion to estook_api;
grant select, insert, update on estook.receta to estook_api;
grant select, insert, update, delete on estook.linea_de_receta to estook_api;
grant select, insert on estook.receta_guardada to estook_api;

-- ═══ La ficha la ven todos ════════════════════════════════════════════════════
--
-- El cocinero ya tenía Escandallos para ver. El camarero y el jefe de sala, ahora
-- también: sin `dato.coste_de_plato`, la API no les manda ni un importe.

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('camarero',     'app.escandallos', 'ver'),
  ('jefe_de_sala', 'app.escandallos', 'ver')
on conflict (rol, permiso) do nothing;
