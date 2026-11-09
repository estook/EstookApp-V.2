-- 0116 · R3 · 1 · La caja (decisión 0144; Anexo 5.5, 10.5, 10.6 y 11.6; maqueta del 9-nov)
--
-- **Estook TPV cobra.** Se abre la caja contando el cajón, se cobra (efectivo, tarjeta, Bizum, cheque,
-- o dividido), se mete y se saca dinero, y se cierra contando a ciegas. Lo de aquí:
--
--   · los permisos nuevos: `accion.llevar_la_caja` (abrir, cerrar y «Cómo va») y `accion.cobrar`
--   · los ajustes de la caja, en `ajustes_del_tpv`: quién abre, el recuento al abrir, a ciegas, el
--     fondo de siempre, Bizum y el cheque
--   · `turno_de_caja`        cada caja abierta de un cajón, y al cerrarla **lo que salió, congelado**
--   · `cobro` y `pago`       cada cobro (un ticket) y cómo se pagó; `cobro_de_linea`, los platos que
--                            cubre un cobro por platos
--   · `movimiento_de_caja`   lo que mueve el cajón sin ser una venta: cambio, sacar, meter, devolver
--   · el motor de emitir acepta el cobro, con su permiso
--
-- **Lo que guarda la base, y no solo el código:** una caja abierta por cajón; un cobro no se cobra dos
-- veces (su id nace en el aparato); una línea no se cobra en dos cobros; lo cobrado, los pagos y lo
-- que mueve el cajón solo se añaden; y una caja cerrada no se toca, salvo el motivo de su diferencia,
-- una vez.

-- ═══ 1 · Los permisos ══════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.llevar_la_caja', 'Llevar la caja', 'accion', 'local',
   'Abrir y cerrar la caja contando el cajón, y ver cómo va (el X): queda a su nombre'),
  ('accion.cobrar', 'Cobrar', 'accion', 'local',
   'Cobrar una cuenta en la caja, en efectivo, con tarjeta, Bizum o cheque, o dividida: cada cobro, su ticket');

-- Roles 1.12: «Abrir caja, entradas y salidas, arqueo», el jefe de sala y el gerente (y quien lleva lo
-- del gerente). «Cobrar»: el camarero, si el local lo permite (encendido de fábrica), y toda la sala.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_sala', 'accion.llevar_la_caja', 'ver_y_editar'),
  ('gerente',      'accion.llevar_la_caja', 'ver_y_editar'),
  ('area_manager', 'accion.llevar_la_caja', 'ver_y_editar'),
  ('direccion',    'accion.llevar_la_caja', 'ver_y_editar'),
  ('camarero',     'accion.cobrar',         'ver_y_editar'),
  ('jefe_de_sala', 'accion.cobrar',         'ver_y_editar'),
  ('gerente',      'accion.cobrar',         'ver_y_editar'),
  ('area_manager', 'accion.cobrar',         'ver_y_editar'),
  ('direccion',    'accion.cobrar',         'ver_y_editar');

-- ═══ 2 · Los ajustes de la caja ════════════════════════════════════════════════

alter table estook.ajustes_del_tpv
  -- «Encargados» (los del permiso) o «También camareros» (cualquiera que tome nota): Richi, 9-nov.
  add column caja_la_abren          text     not null default 'encargados',
  -- Encendido, al abrir siempre se cuenta: no sale «Está correcto».
  add column recuento_al_abrir      boolean  not null default false,
  -- A ciegas de fábrica (Anexo 10.6): el gerente lo puede apagar.
  add column contar_a_ciegas        boolean  not null default true,
  -- Lo que se propone dejar para mañana. Sin él, lo que se dejó la última vez.
  add column fondo_de_siempre       integer,
  add column con_bizum              boolean  not null default false,
  add column con_cheque             boolean  not null default false,
  add constraint ajustes_caja_la_abren_conocido check (caja_la_abren in ('encargados', 'todos')),
  add constraint ajustes_fondo_en_rango check (
    fondo_de_siempre is null or fondo_de_siempre between 0 and 10000000
  );

comment on column estook.ajustes_del_tpv.caja_la_abren is
  'Quién abre y cierra la caja (0144): «encargados», los de accion.llevar_la_caja; o «todos», también quien toma nota. Lo contado queda a su nombre.';

-- **Quién puede llevar la caja ahora** (0144): quien tiene el permiso, o quien toma nota si el local
-- deja a los camareros. Lee los ajustes sin mirar quién los puede ver: por eso es `security definer`.
create function estook.puede_llevar_la_caja(p_local uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select estook.puede_editar('accion.llevar_la_caja', p_local)
      or (
        estook.puede_editar('accion.tomar_nota', p_local)
        and exists (
          select 1 from estook.ajustes_del_tpv a
           where a.local_id = p_local and a.caja_la_abren = 'todos'
        )
      )
$$;

comment on function estook.puede_llevar_la_caja(uuid) is
  'Si quien está puede abrir y cerrar la caja de un local (0144): con su permiso, o tomando nota si el local deja a los camareros.';

revoke all on function estook.puede_llevar_la_caja(uuid) from public;
grant execute on function estook.puede_llevar_la_caja(uuid) to estook_api;

-- Lo que la caja lee y la sala de Estook mira: quien cobra, quien lleva la caja y quien ve las ventas.
create function estook.ve_la_caja(p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.puede_ver('accion.cobrar', p_local)
      or estook.puede_ver('accion.llevar_la_caja', p_local)
      or estook.puede_ver('dato.ventas', p_local)
      or estook.es_el_sistema()
$$;

revoke all on function estook.ve_la_caja(uuid) from public;
grant execute on function estook.ve_la_caja(uuid) to estook_api;

-- El cajón de la caja lo leen también quien cobra y quien la lleva: hasta hoy solo quien da de alta
-- aparatos, y un camarero que cobra tiene que saber a qué caja va lo suyo.
create policy cajon_lo_lee_la_caja on estook.cajon
  for select using (estook.ve_la_caja(local_id));

-- Lo que solo se añade: ni se cambia ni se borra, tampoco por quien manda.
create function estook.la_caja_solo_se_anade()
returns trigger
language plpgsql
as $$
begin
  raise exception 'En % solo se añade: lo cobrado y lo que mueve el cajón no se cambia (0144)', tg_table_name
    using errcode = 'P0001';
end;
$$;

-- ═══ 3 · La caja abierta de un cajón ═══════════════════════════════════════════

create table estook.turno_de_caja (
  -- Nace en el aparato: abrir dos veces desde el mismo toque no abre dos.
  id                    uuid         primary key,
  local_id              uuid         not null references estook.local (id) on delete cascade,
  cajon_id              uuid         not null references estook.cajon (id) on delete restrict,
  -- El día del restaurante en que se abrió (M2, con su hora de corte).
  fecha_operativa       date         not null,
  abierta_en            timestamptz  not null,
  abierta_por           uuid         not null references estook.persona (id) on delete restrict,
  abierta_desde         uuid         references estook.terminal (id) on delete set null,
  -- Si quien abrió no podía y lo aprobó un encargado con su PIN.
  abierta_aprobada_por  uuid         references estook.persona (id) on delete restrict,
  fondo                 integer      not null,
  -- Billete a billete, si se contó: {"5000": 2, "2000": 4, …}, en céntimos. Nulo: «Está correcto».
  contado_al_abrir      jsonb,
  -- Lo que se dejó en el cajón la última vez; nulo el primer día.
  lo_de_la_ultima_vez   integer,

  -- ── Al cerrar, todo congelado: el Z es esto y no cambia ──────────────────────
  cerrada_en            timestamptz,
  cerrada_por           uuid         references estook.persona (id) on delete restrict,
  cerrada_desde         uuid         references estook.terminal (id) on delete set null,
  cerrada_aprobada_por  uuid         references estook.persona (id) on delete restrict,
  -- Billete a billete, o nulo si se escribió el total (E6).
  contado               jsonb,
  contado_total         integer,
  -- Lo que dijo el datáfono; nulo si hoy no se usó.
  datafono              integer,
  para_manana           integer,
  efectivo_cobrado      integer,
  tarjeta_cobrada       integer,
  bizum_cobrado         integer,
  cheque_cobrado        integer,
  metido                integer,
  sacado                integer,
  devuelto              integer,
  tickets               integer,
  cajon_sin_venta       integer,
  -- El fondo + lo cobrado en efectivo + lo metido − lo sacado − lo devuelto en efectivo.
  deberia_haber         integer,
  diferencia            integer,
  -- Un toque, si se sabe, después de verla; una vez.
  motivo_de_la_diferencia text,
  version               integer      not null default 1,

  constraint turno_fondo_en_rango check (fondo between 0 and 10000000),
  constraint turno_contado_al_abrir_es_objeto check (
    contado_al_abrir is null or jsonb_typeof(contado_al_abrir) = 'object'
  ),
  constraint turno_contado_es_objeto check (contado is null or jsonb_typeof(contado) = 'object'),
  -- Cerrada, con todo; abierta, sin nada de lo de cerrar.
  constraint turno_cerrado_entero check (
    (cerrada_en is null) = (cerrada_por is null)
    and (cerrada_en is null) = (contado_total is null)
    and (cerrada_en is null) = (para_manana is null)
    and (cerrada_en is null) = (deberia_haber is null)
    and (cerrada_en is null) = (diferencia is null)
    and (cerrada_en is null) = (efectivo_cobrado is null)
  ),
  constraint turno_lo_contado_en_rango check (
    (contado_total is null or contado_total between 0 and 100000000)
    and (datafono is null or datafono between 0 and 100000000)
    and (para_manana is null or para_manana between 0 and contado_total)
  ),
  constraint turno_motivo_conocido check (
    motivo_de_la_diferencia is null
    or motivo_de_la_diferencia in ('error_al_dar_el_cambio', 'propina_sin_apuntar', 'no_se_sabe')
  ),
  constraint turno_motivo_si_cerrada check (motivo_de_la_diferencia is null or cerrada_en is not null)
);

comment on table estook.turno_de_caja is
  'Cada caja abierta de un cajón (0144): su fondo y quién la abrió; y al cerrarla, lo que salió congelado (el Z): lo esperado, lo contado a ciegas, el datáfono, lo que se queda para mañana y la diferencia. Una abierta por cajón.';

-- **Una caja abierta por cajón**, aunque dos aparatos le den a abrir a la vez.
create unique index turno_uno_abierto_por_cajon on estook.turno_de_caja (cajon_id)
  where cerrada_en is null;
create index turno_por_local on estook.turno_de_caja (local_id, fecha_operativa desc);

create trigger turno_de_caja_sube_version before update on estook.turno_de_caja
  for each row execute function estook.subir_version();

-- **Una caja cerrada no se toca** (0144): el Z es lo que salió al cerrar. Lo único que se le puede
-- poner después es el motivo de su diferencia, una vez. Y no se borra nunca.
create function estook.la_caja_cerrada_no_se_toca()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una caja no se borra (0144)' using errcode = 'P0001';
  end if;
  if old.cerrada_en is null then
    -- Abierta: lo de abrirla no cambia.
    if new.id <> old.id or new.local_id <> old.local_id or new.cajon_id <> old.cajon_id
       or new.fecha_operativa <> old.fecha_operativa or new.abierta_en <> old.abierta_en
       or new.abierta_por <> old.abierta_por or new.fondo <> old.fondo then
      raise exception 'Lo de abrir la caja no se cambia (0144)' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if old.motivo_de_la_diferencia is null and new.motivo_de_la_diferencia is not null
     and (to_jsonb(new) - 'motivo_de_la_diferencia' - 'version')
       = (to_jsonb(old) - 'motivo_de_la_diferencia' - 'version') then
    return new;
  end if;
  raise exception 'Una caja cerrada no se toca: es su Z (0144)' using errcode = 'P0001';
end;
$$;

create trigger turno_cerrado_no_se_toca before update or delete on estook.turno_de_caja
  for each row execute function estook.la_caja_cerrada_no_se_toca();

alter table estook.turno_de_caja enable row level security;

create policy turno_lectura on estook.turno_de_caja
  for select using (estook.ve_la_caja(local_id));
create policy turno_alta on estook.turno_de_caja
  for insert with check (estook.puede_llevar_la_caja(local_id) or estook.es_el_sistema());
create policy turno_cambio on estook.turno_de_caja
  for update using (estook.puede_llevar_la_caja(local_id) or estook.es_el_sistema())
  with check (estook.puede_llevar_la_caja(local_id) or estook.es_el_sistema());

revoke all on estook.turno_de_caja from public;
grant select, insert, update on estook.turno_de_caja to estook_api;

-- ═══ 4 · El cobro y sus pagos ══════════════════════════════════════════════════

create table estook.cobro (
  -- **Nace en el aparato** (0121): mandarlo dos veces, o perder la respuesta y repetir, no cobra dos.
  id               uuid         primary key,
  local_id         uuid         not null references estook.local (id) on delete cascade,
  cuenta_id        uuid         not null references estook.cuenta (id) on delete restrict,
  turno_id         uuid         not null references estook.turno_de_caja (id) on delete restrict,
  -- Su ticket. Uno por cobro (Anexo 5.1).
  documento_id     uuid         not null unique references facturacion.documento (id),
  importe          integer      not null,
  -- A partes iguales: la parte y de cuántas. Por platos o entera: nulos.
  parte            smallint,
  de_partes        smallint,
  cobrado_por      uuid         not null references estook.persona (id) on delete restrict,
  cobrado_desde    uuid         references estook.terminal (id) on delete set null,
  cobrado_en       timestamptz  not null,

  constraint cobro_importe_en_rango check (importe between 1 and 300000),
  constraint cobro_parte_entera check (
    (parte is null) = (de_partes is null)
    and (de_partes is null or (de_partes between 2 and 20 and parte between 1 and de_partes))
  )
);

comment on table estook.cobro is
  'Cada cobro de una cuenta (0144; Anexo 5.1): su ticket, su caja y lo que cubre (la cuenta, unos platos o una parte igual). Nace en el aparato con su id y solo se añade.';

-- Dos cajas cobrando la misma parte a la vez: gana una.
create unique index cobro_una_vez_cada_parte on estook.cobro (cuenta_id, parte) where parte is not null;
create index cobro_por_turno on estook.cobro (turno_id, cobrado_en);
create index cobro_por_cuenta on estook.cobro (cuenta_id);

create table estook.cobro_de_linea (
  cobro_id   uuid  not null references estook.cobro (id) on delete restrict,
  -- **Una línea se cobra una vez**: dos cobros no pueden llevarse el mismo plato.
  linea_id   uuid  not null unique references estook.linea_de_cuenta (id) on delete restrict,
  primary key (cobro_id, linea_id)
);

comment on table estook.cobro_de_linea is
  'Los platos que cubre un cobro (0144): todos los de la cuenta, o los de una parte por platos. Una línea, un cobro.';

create table estook.pago (
  id          uuid         primary key default gen_random_uuid(),
  cobro_id    uuid         not null references estook.cobro (id) on delete restrict,
  local_id    uuid         not null references estook.local (id) on delete cascade,
  forma       text         not null,
  importe     integer      not null,
  -- Solo en efectivo: lo que dio el cliente. El cambio es lo que sobra.
  entregado   integer,

  constraint pago_forma_conocida check (forma in ('efectivo', 'tarjeta', 'bizum', 'cheque')),
  constraint pago_importe_en_rango check (importe between 1 and 300000),
  constraint pago_entregado_solo_en_efectivo check (
    (entregado is null) or (forma = 'efectivo' and entregado >= importe and entregado <= 10000000)
  ),
  -- Efectivo y tarjeta a la vez son dos pagos del mismo cobro; dos de la misma forma, no.
  constraint pago_una_forma_por_cobro unique (cobro_id, forma)
);

comment on table estook.pago is
  'Cómo se pagó un cobro (0144; Anexo 5.1): efectivo (con lo entregado), tarjeta, Bizum o cheque. Mezclar es dos pagos del mismo cobro. Solo se añade.';

create index pago_por_cobro on estook.pago (cobro_id);

-- ═══ 5 · Lo que mueve el cajón sin ser una venta ═══════════════════════════════

create table estook.movimiento_de_caja (
  -- Nace en el aparato: repetir no mete dos veces.
  id            uuid         primary key,
  turno_id      uuid         not null references estook.turno_de_caja (id) on delete restrict,
  local_id      uuid         not null references estook.local (id) on delete cascade,
  -- Cambio (el cajón abierto sin importe), sacar, meter y lo devuelto en efectivo.
  tipo          text         not null,
  importe       integer      not null,
  -- Para qué: compras, un proveedor, propinas, al banco, cambio del banco, otro, o el de la devolución.
  motivo        text,
  nota          text,
  -- La devolución: el ticket que la rectifica.
  documento_id  uuid         references facturacion.documento (id),
  hecho_por     uuid         not null references estook.persona (id) on delete restrict,
  aprobado_por  uuid         references estook.persona (id) on delete restrict,
  hecho_desde   uuid         references estook.terminal (id) on delete set null,
  en            timestamptz  not null,

  constraint movimiento_tipo_conocido check (tipo in ('cambio', 'sacar', 'meter', 'devolucion')),
  constraint movimiento_importe_en_rango check (
    (tipo = 'cambio' and importe = 0) or (tipo <> 'cambio' and importe between 1 and 10000000)
  ),
  constraint movimiento_con_motivo check (
    tipo = 'cambio' or (motivo is not null and char_length(btrim(motivo)) between 2 and 120)
  ),
  constraint movimiento_nota_corta check (nota is null or char_length(nota) <= 200),
  constraint movimiento_devolucion_con_su_ticket check ((tipo = 'devolucion') = (documento_id is not null))
);

comment on table estook.movimiento_de_caja is
  'Lo que mueve el cajón sin ser una venta (0144; Anexo 11.6): cambio, sacar y meter dinero con su para qué, y lo devuelto en efectivo. Quién, cuándo y quién lo aprobó. Solo se añade.';

create index movimiento_por_turno on estook.movimiento_de_caja (turno_id, en);

-- ═══ 6 · Solo se añade, y quién lee y escribe ══════════════════════════════════

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array['cobro', 'cobro_de_linea', 'pago', 'movimiento_de_caja']
  loop
    execute format(
      'create trigger %1$s_solo_se_anade before update or delete on estook.%1$s
         for each row execute function estook.la_caja_solo_se_anade()', la_tabla);
    execute format(
      'create trigger %1$s_no_se_vacia before truncate on estook.%1$s
         for each statement execute function estook.la_caja_solo_se_anade()', la_tabla);
  end loop;
end;
$$;

-- Leer y añadir, y nada más: la API no puede cambiar ni borrar lo cobrado (lección 189).
alter table estook.cobro enable row level security;
revoke all on estook.cobro from public;
grant select, insert on estook.cobro to estook_api;

alter table estook.cobro_de_linea enable row level security;
revoke all on estook.cobro_de_linea from public;
grant select, insert on estook.cobro_de_linea to estook_api;

alter table estook.pago enable row level security;
revoke all on estook.pago from public;
grant select, insert on estook.pago to estook_api;

alter table estook.movimiento_de_caja enable row level security;
revoke all on estook.movimiento_de_caja from public;
grant select, insert on estook.movimiento_de_caja to estook_api;

create policy cobro_lectura on estook.cobro for select using (estook.ve_la_caja(local_id));
create policy cobro_alta on estook.cobro
  for insert with check (estook.puede_editar('accion.cobrar', local_id) or estook.es_el_sistema());

create policy cobro_de_linea_lectura on estook.cobro_de_linea
  for select using (cobro_id in (select id from estook.cobro));
create policy cobro_de_linea_alta on estook.cobro_de_linea
  for insert with check (
    cobro_id in (select c.id from estook.cobro c
                  where estook.puede_editar('accion.cobrar', c.local_id))
    or estook.es_el_sistema()
  );

create policy pago_lectura on estook.pago for select using (estook.ve_la_caja(local_id));
create policy pago_alta on estook.pago
  for insert with check (estook.puede_editar('accion.cobrar', local_id) or estook.es_el_sistema());

create policy movimiento_lectura on estook.movimiento_de_caja
  for select using (estook.ve_la_caja(local_id));
-- Sacar, meter o abrir para cambio: quien abre el cajón o lleva la caja. Devolver: quien devuelve.
-- Lo que aprueba un encargado con su PIN lo escribe el sistema, con los dos nombres.
create policy movimiento_alta on estook.movimiento_de_caja
  for insert with check (
    (tipo in ('cambio', 'sacar', 'meter') and (
      estook.puede_editar('accion.abrir_el_cajon', local_id) or estook.puede_llevar_la_caja(local_id)
    ))
    or (tipo = 'devolucion' and estook.puede_editar('accion.devolver', local_id))
    or estook.es_el_sistema()
  );

-- ═══ 7 · Lo que aprueba un encargado ═══════════════════════════════════════════

-- Abrir o cerrar la caja y abrir el cajón, cuando quien está no puede (Anexo 11.6).
alter table estook.aprobacion
  drop constraint aprobacion_operacion_conocida,
  add constraint aprobacion_operacion_conocida check (
    operacion in ('quitar_de_cocina', 'llevar_la_caja', 'abrir_el_cajon')
  );

-- ═══ 8 · El cierre del día lo escribe la caja ══════════════════════════════════
--
-- Con Estook TPV, cerrar la última caja del día **es** cerrar el día (0144, Richi 9-nov): se escribe el
-- cierre de siempre con `origen = 'tpv'`. Lo hace la API como el sistema, a nombre de quien cerró la
-- caja, porque quien la cierra (un jefe de sala, o un camarero si el local lo deja) no tiene por qué
-- poder ver las ventas. Y si se abre otra caja en un día ya cerrado, el día se reabre solo, con su
-- motivo escrito, como cualquier reapertura (0080).

create policy cierre_lo_escribe_la_caja on estook.cierre_de_caja
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy reapertura_la_hace_la_caja on estook.reapertura_de_jornada
  for insert with check (estook.es_el_sistema());
-- Y la lee: la regla del día cerrado (0080) mira que la reapertura esté escrita, y quien abre la caja
-- puede no ver las ventas.
create policy reapertura_la_lee_la_caja on estook.reapertura_de_jornada
  for select using (estook.es_el_sistema());

-- ═══ 9 · Emitir el ticket de un cobro ══════════════════════════════════════════

-- La función de la 0111, entera, con una rama más: el cobro, con `accion.cobrar`.
create or replace function facturacion.preparar_el_documento(
  p_local            uuid,
  p_tipo             text,
  p_fecha_operacion  date,
  p_descripcion      text,
  p_lineas           jsonb,
  p_desglose         jsonb,
  p_base             integer,
  p_cuota            integer,
  p_total            integer,
  p_donde            text,
  p_origen           text,
  p_terminal         uuid,
  -- La hora la pone la API, nunca el reloj de la base (Plan, regla 10).
  p_en               timestamptz,
  p_destinatario     jsonb default null,
  p_vencimiento      date default null,
  p_rehace           uuid default null
)
returns table (id uuid, serie text, numero integer)
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
#variable_conflict use_column
declare
  la_empresa   estook.empresa%rowtype;
  el_local     estook.local%rowtype;
  la_serie     facturacion.serie%rowtype;
  el_tipo      text;
  el_texto     text;
  el_numero    integer;
  el_id        uuid;
begin
  -- Cada origen, con su permiso (0137). El cobro, desde R3 · 1 (0144), con el suyo.
  if p_rehace is not null then
    if not estook.puede_editar('accion.corregir_datos', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
    if p_origen not in ('ticket_de_prueba', 'cobro', 'canje', 'a_mano', 'senal', 'devolucion', 'correccion', 'pedida') then
      raise exception 'origen_desconocido' using errcode = 'P0001';
    end if;
  elsif p_origen = 'cobro' then
    if not estook.puede_editar('accion.cobrar', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'ticket_de_prueba' then
    perform estook.la_organizacion_del_alta(p_local);
  elsif p_origen = 'canje' then
    if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'pedida' then
    -- La pide el cliente en la página, sin sesión: la API lo hace como el sistema (0141).
    if not estook.es_el_sistema() then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen in ('a_mano', 'senal') then
    if not estook.puede_editar('accion.factura_a_mano', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'devolucion' then
    if not estook.puede_editar('accion.devolver', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'correccion' then
    if not estook.puede_editar('accion.corregir_datos', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  else
    raise exception 'origen_desconocido' using errcode = 'P0001';
  end if;

  select * into el_local from estook.local l where l.id = p_local;
  if el_local.empresa_id is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  select * into la_empresa from estook.empresa e where e.id = el_local.empresa_id;

  -- Lo que pide el alta antes de emitir (Anexo 4.3): sin envío todavía no existe (T6 · 3), y
  -- con VERI*FACTU hacen falta el alta en Verifacti y la autorización (salvo la de pruebas).
  if la_empresa.modalidad = 'sin_envio' then
    raise exception 'sin_envio_todavia_no' using errcode = 'P0001';
  end if;
  if la_empresa.modalidad = 'verifactu' and (
    la_empresa.en_verifacti_en is null
    or (la_empresa.autorizacion <> 'correcta' and not la_empresa.de_pruebas)
  ) then
    raise exception 'empresa_sin_terminar' using errcode = 'P0001';
  end if;
  -- Un ticket de prueba solo en pruebas: en real no se imprime nada de mentira (Anexo 4.12).
  if p_origen = 'ticket_de_prueba' and la_empresa.entorno <> 'pruebas' then
    raise exception 'empresa_en_real' using errcode = 'P0001';
  end if;
  -- La operación puede ser de antes, nunca de después: Verifacti lo rechazaría.
  if p_fecha_operacion > (p_en at time zone el_local.zona_horaria)::date then
    raise exception 'fecha_futura' using errcode = 'P0001';
  end if;

  el_tipo := case when p_tipo = 'F2' then 'ticket'
                  when p_tipo in ('F1', 'F3') then 'factura'
                  else 'rectificativa' end;
  select * into la_serie from facturacion.serie s
   where s.local_id = p_local and s.tipo = el_tipo
   order by s.puesta_en desc
   limit 1;
  if la_serie.id is null or la_serie.empresa_id <> la_empresa.id then
    raise exception 'falta_la_serie' using errcode = 'P0001';
  end if;

  -- **El año en que se hace**, en la hora del local: una factura de enero por una comida de
  -- diciembre no se numera en la serie del año pasado.
  el_texto := la_serie.prefijo || '-'
              || to_char(p_en at time zone el_local.zona_horaria, 'YYYY') || '-';
  -- El candado de **su** serie: dura lo que esta transacción, que son milisegundos.
  perform pg_advisory_xact_lock(
    hashtextextended(la_empresa.id::text || '|' || la_empresa.entorno || '|' || el_texto, 0)
  );
  select coalesce(max(d.numero), 0) + 1 into el_numero
    from facturacion.documento d
   where d.empresa_id = la_empresa.id and d.entorno = la_empresa.entorno and d.serie = el_texto;

  insert into facturacion.documento (
    empresa_id, local_id, serie_id, entorno, modalidad, tipo, serie, numero, fecha_operacion,
    descripcion, lineas, desglose, base, cuota, total, empresa_copia, donde, origen,
    preparado_por, desde_terminal, preparado_en, destinatario, vencimiento
  ) values (
    la_empresa.id, p_local, la_serie.id, la_empresa.entorno, la_empresa.modalidad, p_tipo,
    el_texto, el_numero, p_fecha_operacion, p_descripcion, p_lineas, p_desglose, p_base, p_cuota,
    p_total,
    jsonb_build_object(
      'local', coalesce(nullif(btrim(la_empresa.nombre_comercial), ''), el_local.nombre),
      'nombre', la_empresa.nombre,
      'nif', la_empresa.nif,
      'domicilio', la_empresa.calle || ' ' || la_empresa.numero || ', '
                   || la_empresa.codigo_postal || ' ' || la_empresa.municipio,
      'de_pruebas', la_empresa.de_pruebas
    ),
    nullif(btrim(coalesce(p_donde, '')), ''), p_origen, estook.persona_actual(), p_terminal, p_en,
    p_destinatario, p_vencimiento
  )
  returning facturacion.documento.id into el_id;

  return query select el_id, el_texto, el_numero;
end;
$$;
