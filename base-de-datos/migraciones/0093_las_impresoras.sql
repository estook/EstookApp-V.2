-- 0093 · T5 · 1 · Imprimir y el cajón (decisión 0119; Anexo 6.3, 6.5, 7.5 y 10.6)
--
-- **Las impresoras del local y la cola de lo que se imprime.** El servidor compone cada papel
-- una vez, en el formato intermedio (`@estook/dominio`, `impresion.ts`), y lo deja aquí; **la
-- caja para Windows** lo recoge con su llave, también bloqueada y sin nadie dentro, lo
-- traduce a ESC/POS y lo manda a la impresora. Quien pide nunca imprime.
--
-- Y lo que lo rodea: **dónde sale lo de la cocina y lo de la barra** (pantalla, papel o las
-- dos), **el permiso de abrir el cajón** (Roles 1.12: jefe de sala y gerente, con motivo) y
-- **«Pasar a la app»**: el código de vincular que lleva la caja del navegador al programa,
-- con la misma fila, su nombre y su cajón, y deja sin valer la llave de antes.

-- ═══ El permiso del cajón ══════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.abrir_el_cajon', 'Abrir el cajón', 'accion', 'local',
   'Abrir el cajón del dinero sin una venta (cambiar un billete, probarlo), con motivo: queda quién y cuándo');

-- Roles 1.12: «Abrir el cajón sin venta», el jefe de sala y el gerente, con motivo. El area
-- manager y la dirección llevan lo del gerente, como en la 0083.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_sala', 'accion.abrir_el_cajon', 'ver_y_editar'),
  ('gerente',      'accion.abrir_el_cajon', 'ver_y_editar'),
  ('area_manager', 'accion.abrir_el_cajon', 'ver_y_editar'),
  ('direccion',    'accion.abrir_el_cajon', 'ver_y_editar');

-- ═══ Dónde sale lo de la cocina y lo de la barra ═══════════════════════════════

alter table estook.local
  add column cocina_sale_en  text  not null default 'pantalla',
  add column barra_sale_en   text  not null default 'pantalla',
  add constraint local_donde_sale check (
    cocina_sale_en in ('pantalla', 'papel', 'las_dos')
    and barra_sale_en in ('pantalla', 'papel', 'las_dos')
  );

comment on column estook.local.cocina_sale_en is
  'Dónde ve la cocina lo suyo (0119): en su pantalla, en papel o en las dos. En papel, sin pantalla, marchar va directo.';
comment on column estook.local.barra_sale_en is
  'Dónde ve la barra lo suyo (0119): en su pantalla, en papel o en las dos.';

-- **La de la 0090, entera, con dos cosas más**: dónde sale lo de la cocina y lo de la barra.
drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean);

create function estook.cambiar_lo_del_tpv_del_local(
  p_local             uuid,
  p_camino            text     default null,
  p_camino_si_no_hay  text     default null,
  p_entra_solo        boolean  default null,
  p_dosis_ml          smallint default null,
  p_copa_de_vino_ml   smallint default null,
  p_aviso_min         smallint default null,
  p_tarde_min         smallint default null,
  p_suena             boolean  default null,
  p_cocina_sale_en    text     default null,
  p_barra_sale_en     text     default null
)
returns void
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_editar('accion.ajustes_del_tpv', p_local) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  update estook.local
     set botonera_camino = coalesce(p_camino, botonera_camino, p_camino_si_no_hay),
         botonera_entra_solo = coalesce(p_entra_solo, botonera_entra_solo),
         dosis_de_la_copa_ml = coalesce(p_dosis_ml, dosis_de_la_copa_ml),
         copa_de_vino_ml = coalesce(p_copa_de_vino_ml, copa_de_vino_ml),
         cocina_aviso_min = coalesce(p_aviso_min, cocina_aviso_min),
         cocina_tarde_min = coalesce(p_tarde_min, cocina_tarde_min),
         cocina_suena = coalesce(p_suena, cocina_suena),
         cocina_sale_en = coalesce(p_cocina_sale_en, cocina_sale_en),
         barra_sale_en = coalesce(p_barra_sale_en, barra_sale_en)
   where id = p_local;
end;
$$;

comment on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text) is
  'Cambia del local solo lo del TPV (la botonera, lo que entra solo, las dosis, los minutos y el sonido de la cocina, y dónde sale lo de la cocina y la barra), a quien tiene los Ajustes del TPV (0114, 0116, 0119).';

revoke all on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text) from public;
grant execute on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text) to estook_api;

-- ═══ Las impresoras ════════════════════════════════════════════════════════════

create table estook.impresora (
  id            uuid         primary key default gen_random_uuid(),
  local_id      uuid         not null references estook.local (id) on delete cascade,
  -- **La caja que la imprime** (0119): la que la encontró en su red y le manda los trabajos.
  terminal_id   uuid         not null references estook.terminal (id) on delete cascade,
  nombre        text         not null,
  -- Lo que dijo la búsqueda («Epson TM-T20III»), para reconocerla. Puede no saberse.
  modelo        text,
  -- «192.168.1.50:9100». **Solo la lee la caja que la imprime** (Anexo 6.8): la pantalla
  -- de Ajustes dice «por la red», nunca la dirección.
  direccion     text         not null,
  ancho_mm      smallint     not null default 80,
  -- Qué imprime: lo de la cocina, lo de la barra, y la cuenta y el ticket (la caja).
  imprime       text[]       not null default '{}',
  tiene_cajon   boolean      not null default false,
  -- Si no responde, por dónde sale lo suyo (la de la caja, por ejemplo).
  reserva_id    uuid         references estook.impresora (id) on delete set null,
  -- Lo último que dijo la caja de ella, y cuándo.
  estado        text         not null default 'sin_saber',
  visto_en      timestamptz,
  creada_por    uuid         references estook.persona (id) on delete set null,
  creada_en     timestamptz  not null default now(),
  retirada_en   timestamptz,

  constraint impresora_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 40),
  constraint impresora_modelo_con_medida check (modelo is null or char_length(modelo) <= 80),
  constraint impresora_direccion_con_medida check (char_length(direccion) between 3 and 120),
  constraint impresora_ancho_conocido check (ancho_mm in (58, 80)),
  constraint impresora_imprime_conocido check (imprime <@ array['cocina', 'barra', 'caja']::text[]),
  constraint impresora_estado_conocido check (
    estado in ('sin_saber', 'lista', 'poco_papel', 'sin_papel', 'no_responde')
  ),
  constraint impresora_no_es_su_reserva check (reserva_id is distinct from id)
);

comment on table estook.impresora is
  'Una impresora del local (Anexo 7.5, 0119): la caja que la imprime, qué imprime, si tiene el cajón y su reserva. Su dirección solo la lee esa caja.';

create unique index impresora_nombre_unico on estook.impresora (local_id, lower(btrim(nombre)))
  where retirada_en is null;
create index impresora_por_caja on estook.impresora (terminal_id) where retirada_en is null;

alter table estook.impresora enable row level security;

-- La ven quien toma nota (para saber si lo suyo sale en papel y avisar si falla) y quien
-- lleva los Ajustes del TPV.
create policy impresora_lectura on estook.impresora
  for select using (
    estook.puede_ver('accion.tomar_nota', local_id)
    or estook.puede_ver('accion.ajustes_del_tpv', local_id)
  );
create policy impresora_alta on estook.impresora
  for insert with check (
    estook.puede_editar('accion.ajustes_del_tpv', local_id)
    and creada_por = estook.persona_actual()
  );
create policy impresora_cambio on estook.impresora
  for update using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));

revoke all on estook.impresora from public;
grant select, insert, update on estook.impresora to estook_api;

-- ═══ La cola de lo que se imprime ══════════════════════════════════════════════

create table estook.trabajo_de_impresion (
  -- Nace en el servidor, uno por papel: reintentar no imprime dos veces (Anexo 7.5).
  id               uuid         primary key default gen_random_uuid(),
  local_id         uuid         not null references estook.local (id) on delete cascade,
  impresora_id     uuid         not null references estook.impresora (id) on delete cascade,
  tipo             text         not null,
  -- **Ya compuesto por el servidor**, en el formato intermedio. No cambia nunca.
  papel            jsonb        not null,
  estado           text         not null default 'pendiente',
  intentos         smallint     not null default 0,
  -- Si salió por la impresora de reserva, porque la suya no respondía.
  por_la_reserva   boolean      not null default false,
  error            text,
  -- De dónde viene: la mesa, quién lo pidió y desde qué aparato.
  cuenta_id        uuid         references estook.cuenta (id) on delete set null,
  pedido_por       uuid         references estook.persona (id) on delete set null,
  desde_terminal   uuid         references estook.terminal (id) on delete set null,
  creado_en        timestamptz  not null default now(),
  entregado_en     timestamptz,
  impreso_en       timestamptz,

  constraint trabajo_tipo_conocido check (
    tipo in ('comanda', 'precuenta', 'prueba', 'cajon', 'ticket', 'justificante', 'informe')
  ),
  constraint trabajo_estado_conocido check (estado in ('pendiente', 'entregado', 'impreso', 'error')),
  constraint trabajo_papel_con_forma check (jsonb_typeof(papel) = 'object' and papel ? 'piezas'),
  constraint trabajo_intentos_con_medida check (intentos between 0 and 20),
  constraint trabajo_error_con_medida check (error is null or char_length(error) <= 300)
);

comment on table estook.trabajo_de_impresion is
  'Lo que hay que imprimir (Anexo 6.5, 7.5; 0119): el papel ya compuesto, a qué impresora, y por dónde va. Lo recoge la caja que la imprime.';

create index trabajo_por_salir on estook.trabajo_de_impresion (impresora_id, creado_en)
  where estado in ('pendiente', 'entregado');
create index trabajo_por_local on estook.trabajo_de_impresion (local_id, creado_en);

alter table estook.trabajo_de_impresion enable row level security;

create policy trabajo_lectura on estook.trabajo_de_impresion
  for select using (
    estook.puede_ver('accion.tomar_nota', local_id)
    or estook.puede_ver('accion.ajustes_del_tpv', local_id)
  );
-- Lo deja quien toma nota (la comanda, la cuenta) o quien lleva los Ajustes (la prueba y el
-- cajón), en su nombre y en una impresora de su local.
create policy trabajo_alta on estook.trabajo_de_impresion
  for insert with check (
    pedido_por = estook.persona_actual()
    and (estook.puede_editar('accion.tomar_nota', local_id)
         or estook.puede_editar('accion.ajustes_del_tpv', local_id)
         or estook.puede_editar('accion.abrir_el_cajon', local_id))
    and exists (
      select 1 from estook.impresora i
       where i.id = impresora_id and i.local_id = trabajo_de_impresion.local_id
         and i.retirada_en is null
    )
  );

-- Cambiarlo, solo la caja, por sus funciones (abajo): nadie más toca un trabajo.
revoke all on estook.trabajo_de_impresion from public;
grant select, insert on estook.trabajo_de_impresion to estook_api;

-- ═══ Lo que hace la caja con su llave ══════════════════════════════════════════
--
-- La caja recoge su cola **sin nadie dentro** (bloqueada, o con el gerente en otra cosa),
-- como la pantalla de cocina tacha sin PIN (0116). La API mira antes la llave y que el
-- aparato es una caja viva; estas funciones lo vuelven a mirar, y solo tocan **las
-- impresoras de esa caja**.

create function estook.es_una_caja_viva(p_terminal uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select exists (
    select 1 from estook.terminal t
     where t.id = p_terminal and t.funcion = 'caja' and t.retirado_en is null
  )
$$;

revoke all on function estook.es_una_caja_viva(uuid) from public;
grant execute on function estook.es_una_caja_viva(uuid) to estook_api;

-- Lo que tiene que imprimir: lo pendiente, y lo entregado que no confirmó en un minuto (se
-- cortó a medias). Lo marca entregado al darlo. Con la dirección de su impresora y, si su
-- reserva también es de esta caja, la de la reserva. Más de cinco intentos es un error.
create function estook.la_cola_de_la_caja(p_terminal uuid, p_ahora timestamptz)
returns table (
  trabajo_id          uuid,
  tipo                text,
  papel               jsonb,
  intentos            smallint,
  impresora_id        uuid,
  impresora           text,
  direccion           text,
  ancho_mm            smallint,
  reserva_id          uuid,
  reserva_direccion   text,
  reserva_ancho_mm    smallint,
  creado_en           timestamptz
)
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
-- Lo que devuelve se llama como las columnas: dentro, cada nombre es la columna.
#variable_conflict use_column
begin
  if not estook.es_una_caja_viva(p_terminal) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  update estook.trabajo_de_impresion t
     set estado = 'error', error = 'No salió en cinco intentos'
    from estook.impresora i
   where i.id = t.impresora_id and i.terminal_id = p_terminal
     and t.estado in ('pendiente', 'entregado') and t.intentos >= 5
     and (t.estado = 'pendiente' or t.entregado_en < p_ahora - interval '1 minute');

  return query
  with dados as (
    update estook.trabajo_de_impresion t
       set estado = 'entregado', entregado_en = p_ahora, intentos = t.intentos + 1
      from estook.impresora i
     where i.id = t.impresora_id and i.terminal_id = p_terminal and i.retirada_en is null
       and (t.estado = 'pendiente'
            or (t.estado = 'entregado' and t.entregado_en < p_ahora - interval '1 minute'))
       and t.id in (
         select x.id from estook.trabajo_de_impresion x
          join estook.impresora xi on xi.id = x.impresora_id and xi.terminal_id = p_terminal
          where x.estado in ('pendiente', 'entregado')
          order by x.creado_en
          limit 50
       )
    returning t.id, t.tipo, t.papel, t.intentos, t.impresora_id, t.creado_en
  )
  select d.id, d.tipo, d.papel, d.intentos, i.id, i.nombre, i.direccion, i.ancho_mm,
         r.id, r.direccion, r.ancho_mm, d.creado_en
    from dados d
    join estook.impresora i on i.id = d.impresora_id
    left join estook.impresora r
      on r.id = i.reserva_id and r.terminal_id = p_terminal and r.retirada_en is null
   order by d.creado_en;
end;
$$;

comment on function estook.la_cola_de_la_caja(uuid, timestamptz) is
  'Lo que tiene que imprimir esa caja (0119), en orden, con la dirección de sus impresoras. Lo marca entregado. Solo la ejecuta estook_api, después de mirar la llave.';

revoke all on function estook.la_cola_de_la_caja(uuid, timestamptz) from public;
grant execute on function estook.la_cola_de_la_caja(uuid, timestamptz) to estook_api;

-- Las impresoras que imprime esa caja, con su dirección: para mirar cómo están aunque no haya
-- nada que imprimir.
create function estook.las_impresoras_de_la_caja(p_terminal uuid)
returns table (impresora_id uuid, impresora text, direccion text)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
#variable_conflict use_column
begin
  if not estook.es_una_caja_viva(p_terminal) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
  select i.id, i.nombre, i.direccion
    from estook.impresora i
   where i.terminal_id = p_terminal and i.retirada_en is null
   order by i.creada_en;
end;
$$;

comment on function estook.las_impresoras_de_la_caja(uuid) is
  'Las impresoras que imprime esa caja, con su dirección (0119). Solo la ejecuta estook_api, después de mirar la llave.';

revoke all on function estook.las_impresoras_de_la_caja(uuid) from public;
grant execute on function estook.las_impresoras_de_la_caja(uuid) to estook_api;

-- Cómo salió un trabajo, y cómo está su impresora. Lo impreso no vuelve atrás: confirmarlo
-- dos veces no hace nada.
create function estook.apuntar_lo_impreso(
  p_terminal        uuid,
  p_trabajo         uuid,
  p_salio           boolean,
  p_por_la_reserva  boolean,
  p_error           text,
  p_ahora           timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  v_cambiado integer;
begin
  if not estook.es_una_caja_viva(p_terminal) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  update estook.trabajo_de_impresion t
     set estado = case when p_salio then 'impreso' else 'pendiente' end,
         impreso_en = case when p_salio then p_ahora else null end,
         por_la_reserva = p_salio and coalesce(p_por_la_reserva, false),
         error = case when p_salio then null else left(p_error, 300) end
    from estook.impresora i
   where t.id = p_trabajo and i.id = t.impresora_id and i.terminal_id = p_terminal
     and t.estado in ('pendiente', 'entregado');
  get diagnostics v_cambiado = row_count;
  return v_cambiado > 0;
end;
$$;

comment on function estook.apuntar_lo_impreso(uuid, uuid, boolean, boolean, text, timestamptz) is
  'La caja dice si un trabajo salió, o por qué no (0119). Lo impreso se queda impreso.';

revoke all on function estook.apuntar_lo_impreso(uuid, uuid, boolean, boolean, text, timestamptz) from public;
grant execute on function estook.apuntar_lo_impreso(uuid, uuid, boolean, boolean, text, timestamptz) to estook_api;

create function estook.apuntar_como_esta_la_impresora(
  p_terminal   uuid,
  p_impresora  uuid,
  p_estado     text,
  p_ahora      timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  v_cambiado integer;
begin
  if not estook.es_una_caja_viva(p_terminal) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  update estook.impresora
     set estado = p_estado,
         -- «Visto» es la última vez que contestó: si no responde, se queda la de antes.
         visto_en = case when p_estado = 'no_responde' then visto_en else p_ahora end
   where id = p_impresora and terminal_id = p_terminal and retirada_en is null;
  get diagnostics v_cambiado = row_count;
  return v_cambiado > 0;
end;
$$;

comment on function estook.apuntar_como_esta_la_impresora(uuid, uuid, text, timestamptz) is
  'La caja dice cómo está una de sus impresoras (0119): lista, poco papel, sin papel o que no responde.';

revoke all on function estook.apuntar_como_esta_la_impresora(uuid, uuid, text, timestamptz) from public;
grant execute on function estook.apuntar_como_esta_la_impresora(uuid, uuid, text, timestamptz) to estook_api;

-- ═══ «Pasar a la app» ══════════════════════════════════════════════════════════

-- El código que pasa una caja al programa: al usarlo, **esa misma fila** cambia de llave.
alter table estook.codigo_para_vincular
  add column pasa_terminal_id uuid references estook.terminal (id) on delete cascade;

comment on column estook.codigo_para_vincular.pasa_terminal_id is
  '«Pasar a la app» (0119): el aparato que se pasa. Al usar el código, ese aparato cambia de llave y la de antes deja de valer; conserva su nombre, su función y su cajón.';

-- **La de la 0083, entera, con una cosa más**: el aparato que se pasa.
drop function estook.codigo_vivo_por_huella(text, timestamptz);

create function estook.codigo_vivo_por_huella(p_huella text, p_ahora timestamptz)
returns table (
  codigo_id    uuid,
  local_id     uuid,
  organizacion_id uuid,
  funcion      text,
  nombre       text,
  persona_id   uuid,
  cajon_id     uuid,
  creado_por   uuid,
  pasa_terminal_id uuid
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select c.id, c.local_id, l.organizacion_id, c.funcion, c.nombre, c.persona_id, c.cajon_id, c.creado_por,
         c.pasa_terminal_id
    from estook.codigo_para_vincular c
    join estook.local l on l.id = c.local_id and l.activo
   where c.huella = p_huella
     and c.usado_en is null
     and c.anulado_en is null
     -- La hora la dice la API, la misma con la que se sacó (regla 10).
     and c.caduca_en > p_ahora
   order by c.creado_en desc
   limit 1
$$;

comment on function estook.codigo_vivo_por_huella(text, timestamptz) is
  'Puerta mínima de vincular (Anexo 11.3): el código vivo con esa huella, sin caducar ni usar, y el aparato que pasa si es «Pasar a la app». Solo la ejecuta estook_api.';

revoke all on function estook.codigo_vivo_por_huella(text, timestamptz) from public;
grant execute on function estook.codigo_vivo_por_huella(text, timestamptz) to estook_api;
