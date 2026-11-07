-- 0111 · T6 · 2 · 3 · Pide tu factura (decisión 0141; Anexo 4.11, 5.3 y 7.6; maquetas del 2-nov y del 7-nov)
--
-- La factura que el cliente pide él solo, en su móvil, con el código de su ticket.
--
--   1. **El código de cada ticket**, que no se adivina y es de ese ticket. Sale con el QR en T7, y
--      hoy, con «Copiar el enlace» en Tickets y facturas. El del justificante vale igual (4.11).
--   2. **La factura que pide el cliente** es una F3 como las demás, con su origen. Entra sin sesión:
--      la API la hace como el sistema, y lo que se mira es que el código sea bueno.
--   3. **El correo**, con la factura, sale cuando Hacienda la tiene: una cola que mira el reloj de
--      los documentos. Es trabajo por hacer, no un registro fiscal, como `por_repasar`.
--   4. **Los intentos de la página**: sin ellos, cualquiera la usaría para preguntarle a Hacienda por
--      NIF ajenos. La dirección de internet se guarda una hora y se borra sola.

-- ═══ 1 · El código de cada ticket ══════════════════════════════════════════════

alter table facturacion.documento
  drop constraint documento_origen_conocido,
  add constraint documento_origen_conocido check (origen in (
    'ticket_de_prueba', 'cobro', 'a_mano', 'canje', 'devolucion', 'correccion', 'senal', 'pedida'
  ));

create table facturacion.codigo_de_ticket (
  documento_id  uuid         primary key references facturacion.documento (id),
  -- Doce letras y cifras de un alfabeto sin las que se confunden al escribirlas: 60 bits al azar.
  codigo        text         not null unique,
  en            timestamptz  not null default now(),
  constraint codigo_de_ticket_con_forma check (codigo ~ '^[0-9A-HJKMNP-TV-Z]{12}$')
);
comment on table facturacion.codigo_de_ticket is
  'El código con el que el cliente pide la factura de su ticket (0125, 0141): no se adivina y es de ese ticket. Solo se inserta.';

create table facturacion.pedida (
  factura_id  uuid         primary key references facturacion.documento (id),
  ticket_id   uuid         not null references facturacion.documento (id),
  -- Donde se manda, y **el único** al que se vuelve a mandar desde la página.
  correo      text         not null,
  en          timestamptz  not null,
  constraint pedida_correo_cabe check (char_length(correo) between 3 and 254)
);
comment on table facturacion.pedida is
  'La factura que pidió el cliente en la página, y a qué correo (0141). Solo se inserta.';
create index pedida_del_ticket on facturacion.pedida (ticket_id);

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array['codigo_de_ticket', 'pedida']
  loop
    execute format(
      'create trigger %1$s_solo_se_inserta before update or delete on facturacion.%1$s
         for each row execute function facturacion.solo_se_inserta()', la_tabla);
    execute format(
      'create trigger %1$s_no_se_vacia before truncate on facturacion.%1$s
         for each statement execute function facturacion.solo_se_inserta()', la_tabla);
    execute format('alter table facturacion.%s enable row level security', la_tabla);
    execute format('revoke all on facturacion.%s from public', la_tabla);
    execute format('grant select on facturacion.%s to estook_api', la_tabla);
  end loop;
end;
$$;

create policy codigo_lo_ve_quien_ve_el_documento on facturacion.codigo_de_ticket
  for select using (documento_id in (select id from facturacion.documento));
create policy pedida_la_ve_quien_ve_la_factura on facturacion.pedida
  for select using (factura_id in (select id from facturacion.documento));

-- Del azar de `gen_random_uuid`, sin los bytes que llevan la versión de un uuid.
create function facturacion.un_codigo_nuevo()
returns text
language plpgsql
volatile
set search_path = pg_catalog, pg_temp
as $$
declare
  las_letras constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  crudo     bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  el_sitio  integer;
  el_codigo text := '';
begin
  foreach el_sitio in array array[0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14]
  loop
    el_codigo := el_codigo || substr(las_letras, (get_byte(crudo, el_sitio) % 32) + 1, 1);
  end loop;
  return el_codigo;
end;
$$;

revoke all on function facturacion.un_codigo_nuevo() from public;

create function facturacion.al_preparar_un_ticket()
returns trigger
language plpgsql
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
begin
  insert into facturacion.codigo_de_ticket (documento_id, codigo, en)
  values (new.id, facturacion.un_codigo_nuevo(), new.preparado_en);
  return new;
end;
$$;

revoke all on function facturacion.al_preparar_un_ticket() from public;

create trigger cada_ticket_con_su_codigo after insert on facturacion.documento
  for each row when (new.tipo = 'F2') execute function facturacion.al_preparar_un_ticket();

-- Los tickets que ya hay, también: el enlace de uno de ayer tiene que funcionar.
insert into facturacion.codigo_de_ticket (documento_id, codigo, en)
select d.id, facturacion.un_codigo_nuevo(), d.preparado_en
  from facturacion.documento d
 where d.tipo = 'F2';

-- ═══ 2 · El correo, cuando Hacienda la tiene ═══════════════════════════════════

create table facturacion.correo_por_mandar (
  factura_id    uuid         primary key references facturacion.documento (id),
  para          text         not null,
  desde         timestamptz  not null,
  intentos      smallint     not null default 0,
  -- Cuándo toca mirarlo. Nulo: se dejó de intentar, y lo dice Tickets y facturas.
  siguiente_en  timestamptz,
  no_salio_en   timestamptz,
  constraint correo_por_mandar_cabe check (char_length(para) between 3 and 254),
  constraint correo_por_mandar_o_toca_o_no_salio check ((siguiente_en is null) = (no_salio_en is not null))
);
comment on table facturacion.correo_por_mandar is
  'La factura que hay que mandarle al cliente que la pidió (0141). Es trabajo por hacer, no un registro fiscal: lo mandado queda en `copia_mandada`.';
create index correo_por_mandar_cuando on facturacion.correo_por_mandar (siguiente_en)
  where siguiente_en is not null;

alter table facturacion.correo_por_mandar enable row level security;
revoke all on facturacion.correo_por_mandar from public;
grant select on facturacion.correo_por_mandar to estook_api;
create policy correo_lo_ve_quien_ve_la_factura on facturacion.correo_por_mandar
  for select using (factura_id in (select id from facturacion.documento));

-- Lo que se pide otra vez desde la página, o lo que corrige un rechazo: vuelve a empezar.
create function facturacion.poner_el_correo(p_factura uuid, p_para text, p_en timestamptz)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  insert into facturacion.correo_por_mandar (factura_id, para, desde, siguiente_en)
  values (p_factura, p_para, p_en, p_en)
  on conflict (factura_id) do update
     set para = excluded.para, desde = excluded.desde, intentos = 0,
         siguiente_en = excluded.siguiente_en, no_salio_en = null;
end;
$$;

-- Lo mandado: sale de la cola y queda en su historia, como cualquier copia.
create function facturacion.correo_mandado(p_factura uuid, p_para text, p_en timestamptz)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  delete from facturacion.correo_por_mandar c where c.factura_id = p_factura;
  insert into facturacion.copia_mandada (documento_id, para, en, por)
  values (p_factura, left(p_para, 254), p_en, null);
end;
$$;

-- Lo que ya no hay que mandar: Hacienda la rechazó y ya se le ha dicho, o se anuló.
create function facturacion.quitar_el_correo(p_factura uuid)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  delete from facturacion.correo_por_mandar c where c.factura_id = p_factura;
end;
$$;

-- Un correo que no ha salido: con `p_siguiente` se reintenta entonces; sin él, se deja de intentar.
create function facturacion.correo_que_no_salio(
  p_factura    uuid,
  p_siguiente  timestamptz,
  p_en         timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  update facturacion.correo_por_mandar c
     set intentos = c.intentos + 1,
         siguiente_en = p_siguiente,
         no_salio_en = case when p_siguiente is null then p_en end
   where c.factura_id = p_factura;
end;
$$;

-- **Lo que corrige una factura pedida le llega a quien la pidió**, al mismo correo. Con un disparador
-- y no en `apuntar_lo_rehecho`: así vale también cuando la corrige el cliente repitiéndola.
create function facturacion.al_rehacer_una_pedida()
returns trigger
language plpgsql
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
declare
  la_pedida facturacion.pedida%rowtype;
begin
  select * into la_pedida from facturacion.pedida p where p.factura_id = new.original_id;
  if la_pedida.factura_id is null then
    return new;
  end if;
  insert into facturacion.pedida (factura_id, ticket_id, correo, en)
  values (new.nuevo_id, la_pedida.ticket_id, la_pedida.correo, new.en)
  on conflict (factura_id) do nothing;
  insert into facturacion.correo_por_mandar (factura_id, para, desde, siguiente_en)
  values (new.nuevo_id, la_pedida.correo, new.en, new.en)
  on conflict (factura_id) do nothing;
  return new;
end;
$$;

revoke all on function facturacion.al_rehacer_una_pedida() from public;

create trigger lo_rehecho_llega_a_quien_lo_pidio after insert on facturacion.rehecho
  for each row execute function facturacion.al_rehacer_una_pedida();

-- ═══ 3 · Lo que pide el cliente ════════════════════════════════════════════════

-- **Si la página está encendida se mira aquí también**, con el documento delante. Si había una suya
-- que Hacienda rechazó, esta la corrige: deja de salir arriba en Tickets y facturas (0140).
create function facturacion.apuntar_lo_pedido(
  p_factura  uuid,
  p_ticket   uuid,
  p_correo   text,
  p_en       timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  la_factura  facturacion.documento%rowtype;
  el_ticket   facturacion.documento%rowtype;
  encendida   boolean;
  el_rechazo  uuid;
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select * into la_factura from facturacion.documento d where d.id = p_factura;
  select * into el_ticket from facturacion.documento d where d.id = p_ticket;
  if la_factura.id is null or el_ticket.id is null or la_factura.origen <> 'pedida'
     or la_factura.tipo <> 'F3' or el_ticket.tipo <> 'F2'
     or la_factura.local_id <> el_ticket.local_id then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  select l.pide_tu_factura into encendida from estook.local l where l.id = el_ticket.local_id;
  if not coalesce(encendida, false) then
    raise exception 'pide_tu_factura_apagada' using errcode = 'P0001';
  end if;

  insert into facturacion.pedida (factura_id, ticket_id, correo, en)
  values (p_factura, p_ticket, left(p_correo, 254), p_en);
  insert into facturacion.correo_por_mandar (factura_id, para, desde, siguiente_en)
  values (p_factura, left(p_correo, 254), p_en, p_en);

  select c.factura_id into el_rechazo
    from facturacion.canje c
   where c.ticket_id = p_ticket
     and c.factura_id <> p_factura
     and not facturacion.sigue_en_pie(c.factura_id)
     and not exists (select 1 from facturacion.rehecho h where h.original_id = c.factura_id)
     and not exists (
       select 1 from facturacion.registro r
        where r.documento_id = c.factura_id and lower(btrim(r.estado)) = 'anulado'
     )
     -- Una de varios tickets no se corrige con la de uno solo.
     and (select count(*) from facturacion.canje o where o.factura_id = c.factura_id) = 1
   order by c.en desc
   limit 1;
  if el_rechazo is not null then
    insert into facturacion.rehecho (original_id, nuevo_id, por, en)
    values (el_rechazo, p_factura, null, p_en);
  end if;
end;
$$;

-- ═══ 4 · Los intentos de la página ═════════════════════════════════════════════

create table facturacion.intento_de_la_pagina (
  id         bigint       generated always as identity primary key,
  clase      text         not null,
  ticket_id  uuid         references facturacion.documento (id),
  -- Se borra a la hora: solo sirve para contar.
  direccion  text,
  en         timestamptz  not null,
  constraint intento_clase_conocida check (clase in ('codigo', 'comprobar', 'reenviar', 'descargar'))
);
comment on table facturacion.intento_de_la_pagina is
  'Lo que se ha intentado en «Pide tu factura» en la última hora (0141). La dirección de internet no se guarda más que eso.';
create index intento_por_ticket on facturacion.intento_de_la_pagina (clase, ticket_id, en);
create index intento_por_direccion on facturacion.intento_de_la_pagina (clase, direccion, en);

alter table facturacion.intento_de_la_pagina enable row level security;
revoke all on facturacion.intento_de_la_pagina from public;
grant select on facturacion.intento_de_la_pagina to estook_api;
create policy intento_lo_ve_el_sistema on facturacion.intento_de_la_pagina
  for select using (estook.es_el_sistema());

create function facturacion.quedan_intentos(
  p_clase           text,
  p_ticket          uuid,
  p_direccion       text,
  p_en              timestamptz,
  p_tope_ticket     integer,
  p_tope_direccion  integer
)
returns boolean
language plpgsql
stable
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if p_ticket is not null and (
    select count(*) from facturacion.intento_de_la_pagina i
     where i.clase = p_clase and i.ticket_id = p_ticket and i.en > p_en - interval '1 hour'
  ) >= p_tope_ticket then
    return false;
  end if;
  if p_direccion is not null and (
    select count(*) from facturacion.intento_de_la_pagina i
     where i.clase = p_clase and i.direccion = p_direccion and i.en > p_en - interval '1 hour'
  ) >= p_tope_direccion then
    return false;
  end if;
  return true;
end;
$$;

create function facturacion.apuntar_un_intento(
  p_clase      text,
  p_ticket     uuid,
  p_direccion  text,
  p_en         timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  -- Lo de hace más de una hora no sirve para nada, y una dirección de internet es un dato personal.
  delete from facturacion.intento_de_la_pagina i where i.en < p_en - interval '1 hour';
  insert into facturacion.intento_de_la_pagina (clase, ticket_id, direccion, en)
  values (p_clase, p_ticket, p_direccion, p_en);
end;
$$;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'facturacion.poner_el_correo(uuid, text, timestamptz)',
    'facturacion.correo_mandado(uuid, text, timestamptz)',
    'facturacion.quitar_el_correo(uuid)',
    'facturacion.correo_que_no_salio(uuid, timestamptz, timestamptz)',
    'facturacion.apuntar_lo_pedido(uuid, uuid, text, timestamptz)',
    'facturacion.quedan_intentos(text, uuid, text, timestamptz, integer, integer)',
    'facturacion.apuntar_un_intento(text, uuid, text, timestamptz)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;

-- ═══ 5 · El canje, también sin sesión (la función de la 0110, entera) ══════════

create or replace function facturacion.apuntar_el_canje(
  p_local    uuid,
  p_factura  uuid,
  p_tickets  uuid[],
  p_total    integer,
  p_en       timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  el_ticket   uuid;
  fila        facturacion.documento%rowtype;
  la_factura  facturacion.documento%rowtype;
  la_suma     integer := 0;
begin
  -- La que pide el cliente en la página entra como el sistema: no hay nadie con sesión (0141).
  if not estook.es_el_sistema() and not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_tickets, 1), 0) = 0 then
    raise exception 'sin_tickets' using errcode = 'P0001';
  end if;
  select * into la_factura from facturacion.documento d where d.id = p_factura;
  if la_factura.id is null or la_factura.local_id <> p_local or la_factura.tipo <> 'F3' then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  foreach el_ticket in array (select array_agg(t order by t) from unnest(p_tickets) t)
  loop
    perform pg_advisory_xact_lock(hashtextextended('documento|' || el_ticket::text, 0));
    perform pg_advisory_xact_lock(hashtextextended('canje|' || el_ticket::text, 0));
    select * into fila from facturacion.documento d where d.id = el_ticket;
    if fila.id is null or fila.local_id <> p_local or fila.tipo <> 'F2' then
      raise exception 'no_es_un_ticket' using errcode = 'P0001';
    end if;
    if fila.entorno <> la_factura.entorno or fila.empresa_id <> la_factura.empresa_id then
      raise exception 'ticket_de_otro_entorno' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from facturacion.canje c
       where c.ticket_id = el_ticket and facturacion.sigue_en_pie(c.factura_id)
    ) then
      raise exception 'ya_tiene_factura' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from facturacion.rectificacion r
       where r.documento_id = el_ticket and facturacion.sigue_en_pie(r.rectificativa_id)
    ) then
      raise exception 'tiene_una_devolucion' using errcode = 'P0001';
    end if;
    if facturacion.anulacion_en_curso(el_ticket) then
      raise exception 'se_esta_anulando' using errcode = 'P0001';
    end if;
    if fila.modalidad = 'verifactu' then
      if not facturacion.sigue_en_pie(el_ticket) then
        raise exception 'ticket_no_valido' using errcode = 'P0001';
      end if;
      if not exists (select 1 from facturacion.registro r where r.documento_id = el_ticket) then
        raise exception 'ticket_sin_registrar' using errcode = 'P0001';
      end if;
    end if;
    la_suma := la_suma + fila.total;
    insert into facturacion.canje (ticket_id, factura_id, en) values (el_ticket, p_factura, p_en);
  end loop;
  -- El importe es el de los tickets, al céntimo (Anexo 5.3).
  if la_suma <> p_total then
    raise exception 'el_importe_no_cuadra' using errcode = 'P0001';
  end if;
end;
$$;

-- ═══ 6 · Preparar, con su origen (la función de la 0110, entera) ═══════════════

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
  -- Cada origen, con su permiso (0137). El cobro llegará con T7.
  if p_rehace is not null then
    if not estook.puede_editar('accion.corregir_datos', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
    if p_origen not in ('ticket_de_prueba', 'cobro', 'canje', 'a_mano', 'senal', 'devolucion', 'correccion', 'pedida') then
      raise exception 'origen_desconocido' using errcode = 'P0001';
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

-- ═══ 7 · El reloj de los documentos también mira los correos ═══════════════════

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;

  begin
    perform cron.schedule(
      'estook-documentos',
      '* * * * *',
      $cron$
        select net.http_post(
          url := (select replace(r.url, '/tareas/latir', '/tareas/documentos') from plataforma.reloj r where r.unica),
          headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-reloj', (select d.decrypted_secret from vault.decrypted_secrets d where d.name = 'estook_reloj')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 50000
        )
         where exists (
           select 1 from facturacion.por_repasar p
            where p.desde > now() - interval '30 days'
              and p.desde <= now() - interval '2 minutes'
         )
            or exists (
              select 1 from facturacion.correo_por_mandar c where c.siguiente_en <= now()
            )
      $cron$
    );
  exception when others then
    raise notice 'El reloj de los documentos no se ha podido programar: %. Lo dirá bd:comprobar-api.', sqlerrm;
  end;
end;
$$;
