-- 0121 · M20 · 1 · Lo vendido baja del almacén (decisión 0149; Richi, 22-nov).
--
-- «Tiene que ser un reloj suizo» (Richi, 10-nov). Al cobrar en Estook TPV, el almacén resta lo que
-- lleva el escandallo de cada plato, con lo elegido al pedirlo («sin cebolla», la tónica de la copa,
-- lo que pesó el jamón), del lote que antes caduca y con el coste de ese momento congelado en el libro.
-- Nadie apunta nada.
--
-- **El cobro nunca espera a esto ni se cae por esto.** Se resta dentro del mismo cobro, en un punto de
-- guardado aparte: si algo falla, el cobro sigue, lo vendido queda en la cola de abajo con su fallo, y
-- el siguiente cobro del local lo vuelve a intentar antes que lo suyo. Nada se pierde y nada se resta
-- dos veces: cada plato cobrado se apunta una sola vez en `linea_bajada`.
--
--   1. **Dónde va cada plato en su ticket** (`cobro_de_linea.posicion`): una devolución dice «la línea 2
--      del ticket», y para devolver al almacén lo de «Se cobró de más» hay que saber qué plato es.
--   2. **La cola** de lo que falta por restar o por devolver al almacén.
--   3. **Lo que bajó cada plato cobrado**: una fila por línea de la cuenta, con lo que costó lo que
--      salió. De aquí salen «Por producto» en Ventas y «Vendidos sin escandallo» en Escandallos.
--   4. **El permiso de restar.** Quien cobra (un camarero) no lleva Almacén: el libro lo apunta «el
--      sistema», solo como consumo de una venta. Son políticas **nuevas que se suman** a las de siempre
--      (en Postgres, dos políticas permisivas valen si vale una): ninguna de antes se reescribe.

-- ═══ 1 · El sitio de cada plato en su ticket ═══════════════════════════════════

alter table estook.cobro_de_linea
  add column posicion smallint,
  add constraint cobro_de_linea_posicion_en_rango check (posicion is null or posicion between 0 and 999);

comment on column estook.cobro_de_linea.posicion is
  'La línea del ticket que es este plato, empezando en 0 (0149). Nula si no sale en el ticket: el plato de un menú sin suplemento va dentro de su menú. Antes de la 0121, nula siempre.';

-- ═══ 2 · La cola de lo que falta por restar ════════════════════════════════════

create table estook.lo_vendido_por_bajar (
  id            bigserial    primary key,
  local_id      uuid         not null references estook.local (id) on delete cascade,
  -- `cobro`: restar lo cobrado. `anulacion`: el ticket nunca debió existir, todo vuelve.
  -- `devolucion`: lo devuelto con «Se cobró de más», que no llegó a salir, vuelve.
  que           text         not null,
  cobro_id      uuid         not null references estook.cobro (id) on delete restrict,
  -- En una devolución, su rectificativa: un ticket puede devolverse en varias veces.
  documento_id  uuid         references facturacion.documento (id),
  -- En una devolución, lo devuelto de cada línea del ticket: `[{"linea": 2, "cantidad": 1}]`.
  partes        jsonb,
  desde         timestamptz  not null default now(),
  intentos      smallint     not null default 0,
  ultimo_fallo  text,

  constraint lo_vendido_que_conocido check (que in ('cobro', 'anulacion', 'devolucion')),
  constraint lo_vendido_devolucion_con_su_documento check ((que = 'devolucion') = (documento_id is not null)),
  constraint lo_vendido_devolucion_con_sus_partes check (
    (que = 'devolucion') = (partes is not null) and (partes is null or jsonb_typeof(partes) = 'array')
  ),
  constraint lo_vendido_fallo_corto check (ultimo_fallo is null or char_length(ultimo_fallo) <= 500)
);

comment on table estook.lo_vendido_por_bajar is
  'Lo vendido, anulado o devuelto que el almacén todavía no ha restado o devuelto (0149). Es trabajo por hacer, no un registro: se vacía sola al hacerlo. Lo que se queda con un fallo lo reintenta el siguiente cobro del local, y bd:comprobar-api avisa si algo lleva más de una hora.';

-- La misma cosa no entra dos veces: cobrar otra vez (la respuesta se perdió) no la duplica.
create unique index lo_vendido_una_vez
  on estook.lo_vendido_por_bajar (que, cobro_id, coalesce(documento_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index lo_vendido_por_local on estook.lo_vendido_por_bajar (local_id, id);

alter table estook.lo_vendido_por_bajar enable row level security;

-- La escribe y la vacía el comando que cobra, anula o devuelve, con la persona que lo hace.
create policy lo_vendido_por_bajar_del_local on estook.lo_vendido_por_bajar
  for all using (estook.es_el_sistema() or local_id in (select local_id from estook.locales_visibles()))
  with check (estook.es_el_sistema() or local_id in (select local_id from estook.locales_visibles()));

revoke all on estook.lo_vendido_por_bajar from public;
grant select, insert, update, delete on estook.lo_vendido_por_bajar to estook_api;

-- ═══ 3 · Lo que bajó cada plato cobrado ════════════════════════════════════════

create table estook.linea_bajada (
  -- Una línea de la cuenta baja una vez: es lo que hace que nada se reste dos veces.
  linea_id        uuid           primary key references estook.linea_de_cuenta (id) on delete restrict,
  local_id        uuid           not null references estook.local (id) on delete cascade,
  cobro_id        uuid           not null references estook.cobro (id) on delete restrict,
  plato_id        uuid           references estook.plato (id) on delete set null,
  menu_id         uuid           references estook.menu (id) on delete set null,
  -- El plato elegido dentro de un menú: la línea del menú. Lo que cuesta va con su menú.
  menu_de         uuid           references estook.linea_de_cuenta (id) on delete restrict,
  -- **Lo cobrado, congelado** como en la cuenta: el nombre, las unidades y el importe con IVA. Así
  -- «Por producto» lo lee quien ve las ventas sin abrir las mesas, que son de la sala (0106).
  nombre          text           not null,
  cantidad        integer        not null,
  importe_centimos integer       not null,
  -- `bajada`: restó su escandallo. `sin_escandallo`: un plato sin escandallo, cuenta en dinero y
  -- no resta género (0095). `sin_plato`: un artículo libre o la línea de un menú, que no se cocina.
  estado          text           not null,
  -- Lo que costó lo que salió, en milésimas de céntimo, con el coste medio de ese momento. Nulo si
  -- no restó nada o si algo de lo que restó no tenía coste.
  coste_milesimas bigint,
  -- Ingredientes de su escandallo que no se pudieron restar: una unidad que no se convierte (300 g de
  -- algo que se cuenta por cajas sin decir cuánto trae). Se resta lo que se sabe y se dice lo que falta.
  faltan          smallint       not null default 0,
  -- La jornada de la venta, la de la hora en que se cobró y la hora de corte del local.
  jornada         date           not null,
  bajada_en       timestamptz    not null default now(),

  constraint linea_bajada_estado_conocido check (estado in ('bajada', 'sin_escandallo', 'sin_plato')),
  constraint linea_bajada_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 120),
  constraint linea_bajada_cantidad_en_rango check (cantidad between 1 and 999),
  constraint linea_bajada_importe_en_rango check (importe_centimos between 0 and 100000000),
  constraint linea_bajada_coste_no_negativo check (coste_milesimas is null or coste_milesimas >= 0),
  constraint linea_bajada_faltan_en_rango check (faltan between 0 and 999)
);

comment on table estook.linea_bajada is
  'Cada plato cobrado, una vez (0149): lo cobrado congelado, si restó su escandallo, lo que costó lo que salió con el coste de ese momento, y si no tenía escandallo. Solo se añade.';

create index linea_bajada_por_jornada on estook.linea_bajada (local_id, jornada);
create index linea_bajada_por_cobro on estook.linea_bajada (cobro_id);

alter table estook.linea_bajada enable row level security;

create policy linea_bajada_lectura on estook.linea_bajada
  for select using (local_id in (select local_id from estook.locales_visibles()));
-- La apunta el cobro, como el sistema: quien cobra no lleva Almacén.
create policy linea_bajada_alta on estook.linea_bajada
  for insert with check (estook.es_el_sistema());

revoke all on estook.linea_bajada from public;
grant select, insert on estook.linea_bajada to estook_api;

-- ═══ 4 · El permiso de restar lo vendido ═══════════════════════════════════════

-- El libro: solo el consumo de una venta, solo como el sistema. Lo demás sigue con su permiso.
create policy movimiento_lo_vendido on estook.movimiento_de_stock
  for insert with check (tipo = 'consumo' and origen = 'venta' and estook.es_el_sistema());

comment on policy movimiento_lo_vendido on estook.movimiento_de_stock is
  'Lo que resta (o devuelve) una venta de Estook TPV lo apunta el sistema dentro del cobro: quien cobra no lleva Almacén (0149).';

-- Y gastar del lote que antes caduca, y apuntar de qué lote salió, por lo mismo.
create policy lote_lo_vendido on estook.lote
  for update using (estook.es_el_sistema())
  with check (estook.es_el_sistema());

create policy salida_de_lote_lo_vendido on estook.salida_de_lote
  for insert with check (estook.es_el_sistema());
