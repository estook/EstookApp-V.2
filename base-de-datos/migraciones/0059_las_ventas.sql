-- 0059 · A4 · Las ventas (decisión 0077)
--
-- Lo que contestó Richi el 8-oct: el dinero **sin IVA** (1A), **guardar lo cobrado**
-- además de la cuota (2A), **contar las visitas de los enlaces de vendedor** y solo
-- esas (3B) y **un correo cada lunes** con la semana (4A).
--
--   A · **Lo que cobra Stripe a cada cliente**, con el precio con el que se apuntó: el
--       de hoy no sirve para quien entró en Pro cuando costaba 79 €.
--   B · **La foto de cada día dice también cómo está la cuenta y cuánto deja**: el
--       historial de la suscripción dice el estado, pero no la cuota, y sin esto la
--       cuota de un mes pasado no se puede contar.
--   C · **Cada cobro y cada devolución** que avisa Stripe, en céntimos y con lo que es
--       IVA aparte.
--   D · **Las visitas de cada código de vendedor**: un número por código y día. Ni
--       quién, ni su dirección, ni nada en su navegador (3B).
--   E · **El correo del lunes**, una vez por semana, y a quién va: los admins vivos.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Lo que cobra Stripe a cada cliente
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.cuota_de_stripe (
  organizacion_id  uuid         primary key references estook.organizacion (id) on delete cascade,
  -- Lo que se cobra cada vez (al mes o al año), en céntimos y con el IVA: el precio de
  -- Stripe por los locales. **Sin descuentos**: el del primer mes es una vez.
  importe          integer      not null,
  modo             text         not null,
  actualizado_en   timestamptz  not null default now(),
  constraint cuota_de_stripe_importe_positivo check (importe >= 0),
  constraint cuota_de_stripe_modo_conocido check (modo in ('prueba', 'real'))
);

comment on table plataforma.cuota_de_stripe is
  'Lo que Stripe cobra a cada cliente en cada cobro, con el precio con el que se apuntó (0077).';

-- La apunta el pago cada vez que lee la suscripción de Stripe, como
-- `cambiar_la_suscripcion`: lo llama quien ya habla con Stripe, y nadie más.
create function plataforma.apuntar_la_cuota_de_stripe(
  p_organizacion uuid,
  p_importe integer,
  p_modo text
)
returns void
language sql
volatile
security definer
set search_path = plataforma, pg_catalog, pg_temp
as $$
  insert into plataforma.cuota_de_stripe (organizacion_id, importe, modo)
  values (p_organizacion, p_importe, p_modo)
  on conflict (organizacion_id) do update
    set importe = excluded.importe, modo = excluded.modo, actualizado_en = now()
$$;

comment on function plataforma.apuntar_la_cuota_de_stripe(uuid, integer, text) is
  'Lo que Stripe cobra a un cliente en cada cobro. La llama el pago al leer la suscripción (0077).';

-- Y si los cobros de antes de A4 ya se trajeron, por modo: se traen una vez.
alter table plataforma.stripe
  add column cobros_traidos_en timestamptz;

comment on column plataforma.stripe.cobros_traidos_en is
  'Cuándo se trajeron de Stripe los cobros de antes de A4. Nulo: todavía no (0077).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · La foto de cada día, con la cuenta y lo que deja
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Las fotos de antes de A4 se quedan sin esto (nulo): de ellas sale la actividad,
-- como hasta hoy, y las cuentas de dinero empiezan el día que se despliegue.

alter table plataforma.uso_diario
  add column como         text,
  add column en_pausa     boolean,
  add column cuota_al_mes integer,
  add column de_la_casa   boolean,
  add column modo         text,
  add constraint uso_como_conocido check (
    como is null or como in ('al_dia', 'prueba', 'impago', 'solo_lectura', 'sin_pagar')
  ),
  add constraint uso_cuota_positiva check (cuota_al_mes is null or cuota_al_mes >= 0),
  add constraint uso_modo_conocido check (modo is null or modo in ('prueba', 'real'));

comment on column plataforma.uso_diario.como is
  'Cómo estaba la cuenta ese día (`comoEstaLaCuenta`). Nulo en las fotos de antes de A4 (0077).';
comment on column plataforma.uso_diario.cuota_al_mes is
  'Lo que dejaba al mes ese día, en céntimos y con IVA: el anual, su doceava parte. Nulo si no pagaba (0077).';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Los cobros y las devoluciones
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.cobro (
  -- El de la factura de Stripe (`in_…`): un cobro se apunta una vez.
  id               text         primary key,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  modo             text         not null,
  cobrado_en       timestamptz  not null,
  -- Lo cobrado, con el IVA; y sin él, como lo dice la factura.
  importe          integer      not null,
  sin_iva          integer      not null,
  -- Por qué se cobró: el alta, el periodo nuevo o un cambio de plan.
  motivo           text,
  apuntado_en      timestamptz  not null default now(),
  constraint cobro_modo_conocido check (modo in ('prueba', 'real')),
  constraint cobro_importes_positivos check (importe > 0 and sin_iva >= 0 and sin_iva <= importe)
);

create index cobro_por_fecha on plataforma.cobro (cobrado_en);
create index cobro_por_organizacion on plataforma.cobro (organizacion_id);

comment on table plataforma.cobro is
  'Lo que Stripe ha cobrado a cada cliente, factura a factura (0077). Solo se añade.';

create table plataforma.devolucion (
  id               bigint       generated always as identity primary key,
  -- El cargo de Stripe (`ch_…`): un cargo puede devolverse en varias veces.
  cargo            text         not null,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  modo             text         not null,
  devuelto_en      timestamptz  not null,
  importe          integer      not null,
  sin_iva          integer      not null,
  constraint devolucion_modo_conocido check (modo in ('prueba', 'real')),
  constraint devolucion_importes_positivos check (importe > 0 and sin_iva >= 0 and sin_iva <= importe)
);

create index devolucion_por_cargo on plataforma.devolucion (cargo);
create index devolucion_por_fecha on plataforma.devolucion (devuelto_en);

comment on table plataforma.devolucion is
  'Lo que se ha devuelto de cada cargo, en cada vez (0077). Solo se añade.';

-- Lo cobrado no se toca: un error se corrige con otro apunte.
create function plataforma.lo_cobrado_no_se_toca()
returns trigger
language plpgsql
set search_path = plataforma, pg_catalog, pg_temp
as $$
begin
  raise exception 'Lo cobrado y lo devuelto solo se añaden.';
end;
$$;

create trigger cobro_solo_se_anade
  before update or delete on plataforma.cobro
  for each row execute function plataforma.lo_cobrado_no_se_toca();

create trigger devolucion_solo_se_anade
  before update or delete on plataforma.devolucion
  for each row execute function plataforma.lo_cobrado_no_se_toca();

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Las visitas de cada código de vendedor
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.visita_del_codigo (
  codigo_id  uuid     not null references plataforma.codigo_de_vendedor (id) on delete restrict,
  dia        date     not null,
  visitas    integer  not null default 0,
  primary key (codigo_id, dia),
  constraint visita_del_codigo_positiva check (visitas >= 0)
);

comment on table plataforma.visita_del_codigo is
  'Cuántas veces se abrió el enlace de cada código, por día. Un número: ni quién, ni desde dónde (0077, 3B).';

-- Las mismas veces que se puede abrir un enlace en un día sin que sea alguien
-- haciéndolo a propósito: lo de más no cuenta.
create function plataforma.contar_la_visita(p_codigo text, p_dia date)
returns boolean
language plpgsql
volatile
security definer
set search_path = plataforma, pg_catalog, pg_temp
as $$
declare
  el_codigo uuid;
begin
  select c.id into el_codigo
    from plataforma.codigo_de_vendedor c
    join plataforma.vendedor v on v.id = c.vendedor_id
   where c.codigo = upper(btrim(p_codigo)) and c.cerrado_en is null and v.baja_en is null;
  if el_codigo is null then
    return false;
  end if;

  insert into plataforma.visita_del_codigo (codigo_id, dia, visitas)
  values (el_codigo, p_dia, 1)
  on conflict (codigo_id, dia) do update
    set visitas = plataforma.visita_del_codigo.visitas + 1
    where plataforma.visita_del_codigo.visitas < 10000;
  return true;
end;
$$;

comment on function plataforma.contar_la_visita(text, date) is
  'Suma una visita al enlace de un código que vale. Diez mil al día como mucho (0077).';

-- ═══════════════════════════════════════════════════════════════════════════
-- E · El correo del lunes
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.correo_de_ventas (
  -- El lunes de la semana que cuenta: un correo por semana.
  lunes        date         primary key,
  mandado_en   timestamptz  not null default now(),
  a_cuantos    integer      not null
);

comment on table plataforma.correo_de_ventas is
  'El correo de cada lunes con las cifras de la semana: ya mandado, para no repetirlo (0077, 4A).';

-- A quién va: los admins con el acceso vivo. Lo lee el reloj, que es el sistema.
create function plataforma.los_correos_de_los_admins()
returns table (correo text, nombre text)
language plpgsql
stable
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_admin_o_el_sistema() then
    raise exception 'Solo el admin o el sistema leen a quién va el correo del lunes.' using errcode = '42501';
  end if;
  return query
    select p.correo, p.nombre
      from plataforma.administrador a
      join estook.persona p on p.id = a.persona_id
     where a.quitado_en is null and p.activa and p.correo is not null
     order by p.nombre;
end;
$$;

comment on function plataforma.los_correos_de_los_admins() is
  'Los admins vivos con su correo, para el correo de ventas del lunes (0077).';

-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad por filas: lo lee el admin; lo escribe el sistema
-- ═══════════════════════════════════════════════════════════════════════════

alter table plataforma.cuota_de_stripe   enable row level security;
alter table plataforma.cobro             enable row level security;
alter table plataforma.devolucion        enable row level security;
alter table plataforma.visita_del_codigo enable row level security;
alter table plataforma.correo_de_ventas  enable row level security;

create policy cuota_de_stripe_lectura on plataforma.cuota_de_stripe
  for select using (estook.es_admin_o_el_sistema());

create policy cobro_lectura on plataforma.cobro
  for select using (estook.es_admin_o_el_sistema());
create policy cobro_del_sistema on plataforma.cobro
  for insert with check (estook.es_el_sistema());

create policy devolucion_lectura on plataforma.devolucion
  for select using (estook.es_admin_o_el_sistema());
create policy devolucion_del_sistema on plataforma.devolucion
  for insert with check (estook.es_el_sistema());

create policy visita_del_codigo_lectura on plataforma.visita_del_codigo
  for select using (estook.es_admin_o_el_sistema());

create policy correo_de_ventas_del_sistema on plataforma.correo_de_ventas
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on plataforma.cuota_de_stripe, plataforma.cobro, plataforma.devolucion,
  plataforma.visita_del_codigo, plataforma.correo_de_ventas from public;
grant select on plataforma.cuota_de_stripe to estook_api;
grant select, insert on plataforma.cobro to estook_api;
grant select, insert on plataforma.devolucion to estook_api;
grant select on plataforma.visita_del_codigo to estook_api;
grant select, insert, delete on plataforma.correo_de_ventas to estook_api;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'plataforma.apuntar_la_cuota_de_stripe(uuid, integer, text)',
    'plataforma.contar_la_visita(text, date)',
    'plataforma.los_correos_de_los_admins()'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;
