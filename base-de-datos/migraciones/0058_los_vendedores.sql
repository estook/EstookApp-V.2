-- 0058 · A3 · Los vendedores (decisión 0076)
--
-- Lo que contestó Richi el 7-oct: «el vendedor no se ocupa de nada, solo trae el
-- cliente; nosotros vemos con qué vendedor ha venido. Los vendedores NO son admins».
--
--   A · **El vendedor**: una ficha en el admin. No tiene cuenta ni entra en Estook.
--   B · **Sus códigos**: únicos para siempre (0041), cada uno con su campaña y su
--       descuento del primer mes, que no se cambia. Se cierran, no se borran.
--   C · **La llegada** de cada cliente nuevo: con qué código y por dónde vino.
--   D · **Lo de Stripe**: el cupón de cada descuento, y qué avisos tiene pedidos.
--   E · **Dos funciones con privilegio**, porque quien crea su cuenta todavía no es
--       nadie: lo que da un código, para la pantalla de crear cuenta, y apuntar la
--       llegada en la misma transacción que crea la cuenta.
--
-- Nada de comisiones, asignaciones ni panel del vendedor: se descartaron (0076).

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El vendedor
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.vendedor (
  id          uuid         primary key default gen_random_uuid(),
  nombre      text         not null,
  telefono    text,
  correo      text,
  notas       text,
  alta_en     timestamptz  not null default now(),
  baja_en     timestamptz,
  creado_por  uuid         references estook.persona (id) on delete set null,
  constraint vendedor_con_nombre check (char_length(btrim(nombre)) between 1 and 120),
  constraint vendedor_textos_cortos check (
    coalesce(length(telefono), 0) <= 40
    and coalesce(length(correo), 0) <= 320
    and coalesce(length(notas), 0) <= 2000
  ),
  constraint vendedor_baja_despues check (baja_en is null or baja_en >= alta_en)
);

comment on table plataforma.vendedor is
  'Quien trae clientes a Estook. Una ficha del admin: no entra en Estook ni cobra desde aquí (0076).';

-- Un vendedor no se borra: se da de baja. Y la baja no se deshace: para volver, se
-- le da de alta otra vez, y su historia sigue en la ficha de antes.
create function plataforma.vendedor_no_se_borra()
returns trigger
language plpgsql
set search_path = plataforma, pg_catalog, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un vendedor no se borra: se da de baja.';
  end if;
  if old.baja_en is not null and new.baja_en is distinct from old.baja_en then
    raise exception 'La baja de un vendedor no se deshace.';
  end if;
  if new.alta_en is distinct from old.alta_en then
    raise exception 'El alta de un vendedor no se cambia.';
  end if;
  return new;
end;
$$;

create trigger vendedor_se_da_de_baja
  before update or delete on plataforma.vendedor
  for each row execute function plataforma.vendedor_no_se_borra();

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Sus códigos
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.codigo_de_vendedor (
  id           uuid         primary key default gen_random_uuid(),
  vendedor_id  uuid         not null references plataforma.vendedor (id) on delete restrict,
  -- En mayúsculas, de 3 a 20, letras, números y guiones (no al principio ni al
  -- final). Lo mismo que comprueba el dominio (`comoCodigoDeVendedor`).
  codigo       text         not null unique,
  campana      text,
  -- El tanto por ciento del primer cobro mensual. Cero: sin descuento.
  descuento    smallint     not null default 0,
  creado_en    timestamptz  not null default now(),
  creado_por   uuid         references estook.persona (id) on delete set null,
  cerrado_en   timestamptz,
  constraint codigo_con_forma check (codigo ~ '^[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$'),
  constraint codigo_descuento_valido check (descuento between 0 and 100),
  constraint codigo_campana_corta check (coalesce(length(campana), 0) <= 80)
);

create index codigo_de_vendedor_por_vendedor on plataforma.codigo_de_vendedor (vendedor_id);

comment on table plataforma.codigo_de_vendedor is
  'Los códigos de cada vendedor: únicos para siempre, con su campaña y su descuento del primer mes, que no cambia (0041, 0076).';

-- **Lo prometido no cambia por debajo**: ni el código, ni de quién es, ni su
-- descuento. Solo se cierra, y cerrado no se abre. Y no se borra: un cliente de
-- 2026 tiene que seguir diciendo con qué código vino.
create function plataforma.codigo_solo_se_cierra()
returns trigger
language plpgsql
set search_path = plataforma, pg_catalog, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un código no se borra: se cierra.';
  end if;
  if new.codigo is distinct from old.codigo or new.vendedor_id is distinct from old.vendedor_id
     or new.descuento is distinct from old.descuento or new.creado_en is distinct from old.creado_en then
    raise exception 'Un código no se cambia: se cierra y se hace otro.';
  end if;
  if old.cerrado_en is not null and new.cerrado_en is distinct from old.cerrado_en then
    raise exception 'Un código cerrado no se vuelve a abrir.';
  end if;
  return new;
end;
$$;

create trigger codigo_de_vendedor_solo_se_cierra
  before update or delete on plataforma.codigo_de_vendedor
  for each row execute function plataforma.codigo_solo_se_cierra();

-- ═══════════════════════════════════════════════════════════════════════════
-- C · La llegada de cada cliente
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.llegada (
  organizacion_id      uuid         primary key references estook.organizacion (id) on delete cascade,
  codigo_id            uuid         references plataforma.codigo_de_vendedor (id) on delete restrict,
  -- Por dónde vino, al registrarse. `sin_saber`: llegó antes de A3, o lo puso un admin.
  origen               text         not null,
  -- Las marcas de campaña del enlace (`utm_source`, `utm_medium`, `utm_campaign`) y,
  -- de la web de la que venía, **solo su nombre**: nunca la dirección entera.
  fuente               text,
  medio                text,
  campana              text,
  web                  text,
  llego_en             timestamptz  not null default now(),
  -- Si el vendedor lo puso o lo cambió un admin, quién y cuándo. El motivo, en la
  -- auditoría del admin.
  puesto_por           uuid         references estook.persona (id) on delete set null,
  puesto_en            timestamptz,
  -- Cuándo se le puso el descuento en Stripe, con prueba: una sola vez.
  descuento_puesto_en  timestamptz,
  constraint llegada_origen_conocido check (
    origen in ('vendedor', 'anuncios', 'buscadores', 'otra_web', 'directo', 'sin_saber')
  ),
  constraint llegada_textos_cortos check (
    coalesce(length(fuente), 0) <= 100
    and coalesce(length(medio), 0) <= 100
    and coalesce(length(campana), 0) <= 100
    and coalesce(length(web), 0) <= 253
  )
);

create index llegada_por_codigo on plataforma.llegada (codigo_id) where codigo_id is not null;

comment on table plataforma.llegada is
  'Con qué código de vendedor y por dónde llegó cada cliente nuevo (0076). Lo comercial es de Estook, no del cliente.';

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Lo de Stripe: los cupones y los avisos pedidos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un cupón por tanto por ciento, que se crea la primera vez que hace falta. Y la
-- lista de avisos que tiene pedidos el de Stripe: A3 pide uno más (la prueba que
-- acaba, para poner el descuento en el primer cobro), y una lista que no coincide
-- con la del código hace que se vuelva a pedir.

alter table plataforma.stripe
  add column cupones jsonb  not null default '{}'::jsonb,
  add column avisos  text[] not null default '{}';

comment on column plataforma.stripe.cupones is
  'De cada tanto por ciento del primer mes, el cupón de Stripe que lo hace (0076).';
comment on column plataforma.stripe.avisos is
  'Los avisos que el de Stripe tiene pedidos. Si el código pide otros, se le cambian (0076).';

-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad por filas: el admin; y lo que hace falta para el descuento, el sistema
-- ═══════════════════════════════════════════════════════════════════════════

alter table plataforma.vendedor           enable row level security;
alter table plataforma.codigo_de_vendedor enable row level security;
alter table plataforma.llegada            enable row level security;

create policy vendedor_del_admin on plataforma.vendedor
  for all using (plataforma.nivel_de(estook.persona_actual()) is not null)
  with check (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy codigo_de_vendedor_del_admin on plataforma.codigo_de_vendedor
  for all using (plataforma.nivel_de(estook.persona_actual()) is not null)
  with check (plataforma.nivel_de(estook.persona_actual()) is not null);

-- El pago, como sistema, mira el descuento del código con que llegó.
create policy codigo_de_vendedor_del_sistema on plataforma.codigo_de_vendedor
  for select using (estook.es_el_sistema());

create policy llegada_del_admin on plataforma.llegada
  for all using (plataforma.nivel_de(estook.persona_actual()) is not null)
  with check (plataforma.nivel_de(estook.persona_actual()) is not null);

-- Y el sistema la lee, y apunta cuándo puso el descuento.
create policy llegada_lectura_del_sistema on plataforma.llegada
  for select using (estook.es_el_sistema());
create policy llegada_descuento_del_sistema on plataforma.llegada
  for update using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on plataforma.vendedor, plataforma.codigo_de_vendedor, plataforma.llegada from public;
grant select, insert, update on plataforma.vendedor to estook_api;
grant select, insert, update on plataforma.codigo_de_vendedor to estook_api;
grant select, insert, update on plataforma.llegada to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Las dos funciones con privilegio
-- ═══════════════════════════════════════════════════════════════════════════

-- Lo que da un código, para la pantalla de crear cuenta, que todavía no es nadie.
-- **Solo el código y su descuento**: ni de qué vendedor es, ni su campaña. Sin fila,
-- el código no vale: no existe, está cerrado o su vendedor está de baja.
create function plataforma.lo_que_da_el_codigo(p_codigo text)
returns table (codigo text, descuento smallint)
language sql
stable
security definer
set search_path = plataforma, pg_catalog, pg_temp
as $$
  select c.codigo, c.descuento
    from plataforma.codigo_de_vendedor c
    join plataforma.vendedor v on v.id = c.vendedor_id
   where c.codigo = upper(btrim(p_codigo))
     and c.cerrado_en is null
     and v.baja_en is null
$$;

comment on function plataforma.lo_que_da_el_codigo(text) is
  'Si un código de vendedor vale y qué descuento da. Lo lee crear cuenta, sin sesión; no dice de quién es (0076).';

-- Apunta con qué código y por dónde llegó un cliente. **Solo en la misma transacción
-- que crea su organización** (`creado_en = now()`, que en Postgres es la hora de la
-- transacción) y **una sola vez**: así nadie puede ponerle un vendedor a un cliente
-- que ya existía llamándola por su cuenta. Devuelve el código que se apuntó, o nulo
-- si no valía.
create function plataforma.apuntar_la_llegada(
  p_organizacion uuid,
  p_codigo text,
  p_origen text,
  p_fuente text,
  p_medio text,
  p_campana text,
  p_web text
)
returns text
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  el_codigo plataforma.codigo_de_vendedor%rowtype;
  origen    text := p_origen;
begin
  if not exists (
    select 1 from estook.organizacion o where o.id = p_organizacion and o.creado_en = now()
  ) then
    raise exception 'La llegada solo se apunta al crear la cuenta.' using errcode = '42501';
  end if;

  if p_codigo is not null and btrim(p_codigo) <> '' then
    select c.* into el_codigo
      from plataforma.codigo_de_vendedor c
      join plataforma.vendedor v on v.id = c.vendedor_id
     where c.codigo = upper(btrim(p_codigo)) and c.cerrado_en is null and v.baja_en is null;
  end if;

  if el_codigo.id is not null then
    origen := 'vendedor';
  elsif origen is null or origen not in ('anuncios', 'buscadores', 'otra_web', 'directo') then
    origen := 'directo';
  end if;

  insert into plataforma.llegada (organizacion_id, codigo_id, origen, fuente, medio, campana, web)
  values (
    p_organizacion, el_codigo.id, origen,
    left(nullif(btrim(p_fuente), ''), 100), left(nullif(btrim(p_medio), ''), 100),
    left(nullif(btrim(p_campana), ''), 100), left(nullif(lower(btrim(p_web)), ''), 253)
  );

  return el_codigo.codigo;
end;
$$;

comment on function plataforma.apuntar_la_llegada(uuid, text, text, text, text, text, text) is
  'Con qué código y por dónde llegó un cliente, en la transacción que crea su cuenta y una sola vez (0076).';

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'plataforma.lo_que_da_el_codigo(text)',
    'plataforma.apuntar_la_llegada(uuid, text, text, text, text, text, text)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;
