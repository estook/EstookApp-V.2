-- 0107 · T6 · 2 · 2 · 1 · Las facturas y quién hace qué (decisión 0137; Anexo 4.5, 5.3 y 7.6)
--
--   1. **Quién hace qué, acción por acción** (Richi, 6-nov): hacer facturas no da acceso a la
--      empresa ni a las series. Permisos aparte, con su valor de fábrica por puesto, y la
--      dirección cambia a cada persona con un interruptor (un recorte de permiso, como 0100).
--   2. **Los clientes de las facturas**, que se guardan para la vez siguiente (0125). Son datos del
--      restaurante, se pueden borrar, y sus facturas emitidas no se tocan nunca. Solo por funciones:
--      la API no tiene ningún permiso sobre la tabla.
--   3. **La factura a mano (F1) y el canje (F3)**: el documento lleva su destinatario congelado, y
--      lo que se le añade (qué tickets sustituye, cuándo se cobró, a quién se mandó) solo se inserta.
--   4. **El año de la serie sale de cuándo se prepara, no de la fecha de la operación**: una factura
--      de enero por una comida de diciembre va en la serie del año en que se hace.

-- ═══ 1 · Los permisos ══════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.factura_de_un_ticket', 'Factura de un ticket y copias', 'accion', 'local',
   'Hacer la factura de uno o varios tickets, con su importe fijo, y mandar o descargar copias. Sin él, se ve solo lo que deje el permiso de consultar'),
  ('accion.factura_a_mano', 'Factura a mano', 'accion', 'local',
   'Hacer una factura con conceptos libres, ver los clientes guardados y marcar lo cobrado. De fábrica no es de los camareros: es la que puede facturar lo que nunca se vendió'),
  ('accion.ver_documentos', 'Consultar todos los documentos', 'accion', 'local',
   'Ver todos los tickets y facturas del local, de cualquier fecha. Con solo la factura de un ticket se ve lo de hoy y de ayer, y lo demás por su número');

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('camarero',                'accion.factura_de_un_ticket', 'ver_y_editar'),
  ('jefe_de_sala',            'accion.factura_de_un_ticket', 'ver_y_editar'),
  ('gerente',                 'accion.factura_de_un_ticket', 'ver_y_editar'),
  ('area_manager',            'accion.factura_de_un_ticket', 'ver_y_editar'),
  ('direccion',               'accion.factura_de_un_ticket', 'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.factura_de_un_ticket', 'ver_y_editar'),
  ('jefe_de_sala',            'accion.factura_a_mano',       'ver_y_editar'),
  ('gerente',                 'accion.factura_a_mano',       'ver_y_editar'),
  ('area_manager',            'accion.factura_a_mano',       'ver_y_editar'),
  ('direccion',               'accion.factura_a_mano',       'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.factura_a_mano',       'ver_y_editar'),
  ('jefe_de_sala',            'accion.ver_documentos',       'ver_y_editar'),
  ('gerente',                 'accion.ver_documentos',       'ver_y_editar'),
  ('area_manager',            'accion.ver_documentos',       'ver_y_editar'),
  ('direccion',               'accion.ver_documentos',       'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.ver_documentos',       'ver_y_editar'),
  ('gestoria',                'accion.ver_documentos',       'ver_y_editar');

-- Los que se cambian persona a persona en «Quién hace qué».
create function estook.es_permiso_de_los_documentos(p_permiso text)
returns boolean
language sql
immutable
as $$
  select p_permiso in (
    'accion.factura_de_un_ticket', 'accion.factura_a_mano', 'accion.ver_documentos'
  )
$$;

-- **Solo la dirección toca estos recortes**, igual que el de la facturación (0100): sin esto, un
-- gerente que invita personas podría darse permisos a sí mismo. Es la función de la 0100, con la
-- lista ampliada.
create or replace function estook.recorte_de_la_facturacion_solo_la_direccion()
returns trigger
language plpgsql
as $$
begin
  if (new.permiso = 'accion.alta_de_facturacion'
        or estook.es_permiso_de_los_documentos(new.permiso)
        or (tg_op = 'UPDATE' and (
              old.permiso = 'accion.alta_de_facturacion'
              or estook.es_permiso_de_los_documentos(old.permiso)
           )))
     and current_user <> (
       select r.rolname from pg_class c join pg_roles r on r.oid = c.relowner
        where c.oid = 'estook.recorte_de_permiso'::regclass
     )
     and not estook.es_la_direccion_del_local(new.local_id) then
    raise exception 'solo_la_direccion' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Quién hace qué en ese local, para la tarjeta de Ajustes › Facturación. **Solo la dirección.**
create function estook.quien_hace_que(p_local uuid)
returns table (
  persona_id  uuid,
  nombre      text,
  rol         text,
  siempre     boolean,
  de_un_ticket boolean,
  a_mano      boolean,
  consultar   boolean,
  cambiados   text[]
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_la_direccion_del_local(p_local) then
    raise exception 'solo_la_direccion' using errcode = 'P0001';
  end if;
  return query
    with en_el_local as (
      select m.id as membresia_id, m.persona_id, m.rol, r.amplitud
        from estook.membresia m
        join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
        join estook.rol r on r.codigo = m.rol
       where m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
         and (m.revocada_en is null or m.revocada_en > now())
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
    ),
    su_rol as (
      select distinct on (e.persona_id) e.persona_id, e.rol
        from en_el_local e
       order by e.persona_id, e.amplitud desc
    )
    select p.id,
           btrim(p.nombre || ' ' || coalesce(p.apellidos, '')),
           s.rol::text,
           s.rol = 'direccion',
           estook.nivel_de_permiso(p.id, p_local, 'accion.factura_de_un_ticket') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.factura_a_mano') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.ver_documentos') <> 'sin_acceso',
           coalesce((
             select array_agg(rec.permiso order by rec.permiso)
               from estook.recorte_de_permiso rec
               join en_el_local e on e.membresia_id = rec.membresia_id
              where e.persona_id = p.id
                and rec.local_id = p_local
                and estook.es_permiso_de_los_documentos(rec.permiso)
           ), '{}')
      from su_rol s
      join estook.persona p on p.id = s.persona_id
     where p.activa
     order by s.rol = 'direccion' desc, p.nombre, p.apellidos;
end;
$$;

revoke all on function estook.quien_hace_que(uuid) from public;
grant execute on function estook.quien_hace_que(uuid) to estook_api;

-- Dar o quitar uno a una persona. **Solo la dirección**. A la dirección no se le quita nada, y la
-- gestoría solo mira: su permiso de hacer no se enciende nunca. Si queda igual que lo de fábrica
-- de su puesto, no se guarda excepción.
create function estook.dar_un_permiso_de_los_documentos(
  p_local uuid, p_persona uuid, p_permiso text, p_tiene boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_membresia  uuid;
  su_rol        text;
  de_fabrica    estook.nivel_de_permiso;
  el_nivel      estook.nivel_de_permiso;
begin
  if not estook.es_la_direccion_del_local(p_local) then
    raise exception 'solo_la_direccion' using errcode = 'P0001';
  end if;
  if not estook.es_permiso_de_los_documentos(p_permiso) then
    raise exception 'permiso_desconocido' using errcode = 'P0001';
  end if;

  select m.id, m.rol into la_membresia, su_rol
    from estook.membresia m
    join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
    join estook.rol r on r.codigo = m.rol
    join estook.persona p on p.id = m.persona_id and p.activa
   where m.persona_id = p_persona
     and m.desde <= current_date
     and (m.hasta is null or m.hasta >= current_date)
     and (m.revocada_en is null or m.revocada_en > now())
     and (
       m.alcance = 'organizacion'
       or (m.alcance = 'area' and l.area_id = m.area_id)
       or (m.alcance = 'local' and l.id = m.local_id)
     )
   order by r.amplitud desc
   limit 1;
  if la_membresia is null then
    raise exception 'no_esta_en_el_local' using errcode = 'P0001';
  end if;
  if su_rol = 'direccion' then
    raise exception 'la_direccion_siempre' using errcode = 'P0001';
  end if;
  if su_rol = 'gestoria' and p_permiso <> 'accion.ver_documentos' then
    raise exception 'la_gestoria_solo_mira' using errcode = 'P0001';
  end if;

  select pr.nivel into de_fabrica
    from estook.permiso_de_rol pr
   where pr.rol = su_rol and pr.permiso = p_permiso;
  de_fabrica := coalesce(de_fabrica, 'sin_acceso');
  el_nivel := case when p_tiene then 'ver_y_editar' else 'sin_acceso' end::estook.nivel_de_permiso;

  delete from estook.recorte_de_permiso rec
   using estook.membresia m
   where rec.membresia_id = m.id
     and m.persona_id = p_persona
     and rec.local_id = p_local
     and rec.permiso = p_permiso;
  if el_nivel <> de_fabrica then
    insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
    values (la_membresia, p_local, p_permiso, el_nivel, 'Lo cambió la dirección (0137)');
  end if;

  perform estook.apuntar_lo_del_alta(
    p_local, case when p_tiene then 'dar' else 'quitar' end, 'quien_hace_que', p_persona,
    jsonb_build_object('permiso', p_permiso, 'tiene', p_tiene)
  );
end;
$$;

revoke all on function estook.dar_un_permiso_de_los_documentos(uuid, uuid, text, boolean) from public;
grant execute on function estook.dar_un_permiso_de_los_documentos(uuid, uuid, text, boolean) to estook_api;

-- ═══ 2 · Los clientes ══════════════════════════════════════════════════════════

create table estook.cliente_de_factura (
  id             uuid         primary key default gen_random_uuid(),
  empresa_id     uuid         not null references estook.empresa (id) on delete cascade,
  clase          text         not null,
  nombre         text         not null,
  -- El NIF, el número de IVA o el pasaporte, sin espacios y en mayúsculas.
  identificador  text         not null,
  -- De fuera: 02, su IVA en el censo europeo; 03, su pasaporte (Verifacti, `id_otro`).
  id_tipo        text,
  codigo_pais    text,
  domicilio      text         not null,
  correo         text,
  actualizado_en timestamptz  not null default now(),
  constraint cliente_clase_conocida check (clase in ('empresa', 'particular', 'de_fuera')),
  constraint cliente_nombre_cabe check (char_length(nombre) between 1 and 120),
  constraint cliente_identificador_cabe check (char_length(identificador) between 1 and 20),
  constraint cliente_domicilio_cabe check (char_length(domicilio) between 1 and 300),
  constraint cliente_id_de_fuera check (
    (clase = 'de_fuera') = (id_tipo is not null)
    and (id_tipo is null or id_tipo in ('02', '03'))
    and (clase <> 'de_fuera' or codigo_pais ~ '^[A-Z]{2}$')
  ),
  constraint cliente_una_vez unique (empresa_id, identificador)
);

comment on table estook.cliente_de_factura is
  'Los clientes de las facturas, guardados para la vez siguiente (0125). Se pueden borrar; lo emitido lleva su copia y no cambia. Solo por funciones (0137).';

alter table estook.cliente_de_factura enable row level security;
revoke all on estook.cliente_de_factura from public;

-- El que tiene ese número, para quien hace facturas: escribir un NIF conocido rellena lo demás, sin
-- poder hojear a los clientes. Devuelve una fila o ninguna.
create function estook.el_cliente_por_su_numero(p_local uuid, p_identificador text)
returns setof estook.cliente_de_factura
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not (estook.puede_editar('accion.factura_de_un_ticket', p_local)
          or estook.puede_editar('accion.factura_a_mano', p_local)) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  return query
    select c.* from estook.cliente_de_factura c
      join estook.local l on l.empresa_id = c.empresa_id and l.id = p_local
     where c.identificador = upper(replace(p_identificador, ' ', ''));
end;
$$;

-- La lista, solo para quien hace facturas a mano: hay DNI y domicilios (RGPD, datos mínimos).
create function estook.los_clientes_de_factura(p_local uuid, p_buscar text)
returns setof estook.cliente_de_factura
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_editar('accion.factura_a_mano', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  return query
    select c.* from estook.cliente_de_factura c
      join estook.local l on l.empresa_id = c.empresa_id and l.id = p_local
     where p_buscar is null or btrim(p_buscar) = ''
        or c.nombre ilike '%' || p_buscar || '%'
        or c.identificador ilike '%' || p_buscar || '%'
     order by c.actualizado_en desc
     limit 50;
end;
$$;

create function estook.quitar_el_cliente_de_factura(p_local uuid, p_cliente uuid)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_editar('accion.factura_a_mano', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  delete from estook.cliente_de_factura c
   using estook.local l
   where c.id = p_cliente and l.id = p_local and l.empresa_id = c.empresa_id;
  if not found then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  perform estook.apuntar_lo_del_alta(p_local, 'quitar', 'cliente_de_factura', p_cliente, '{}'::jsonb);
end;
$$;

revoke all on function estook.el_cliente_por_su_numero(uuid, text) from public;
revoke all on function estook.los_clientes_de_factura(uuid, text) from public;
revoke all on function estook.quitar_el_cliente_de_factura(uuid, uuid) from public;
grant execute on function estook.el_cliente_por_su_numero(uuid, text) to estook_api;
grant execute on function estook.los_clientes_de_factura(uuid, text) to estook_api;
grant execute on function estook.quitar_el_cliente_de_factura(uuid, uuid) to estook_api;

-- ═══ 3 · El documento y lo que se le añade ═════════════════════════════════════

alter table facturacion.documento
  -- {clase, nombre, identificador, id_tipo, codigo_pais, domicilio}: lo que sale impreso.
  add column destinatario jsonb,
  -- Si se hizo sin cobrar, cuándo vence. Si se ha cobrado, lo dice `cobro_de_factura`.
  add column vencimiento  date,
  drop constraint documento_origen_conocido,
  add constraint documento_origen_conocido
    check (origen in ('ticket_de_prueba', 'cobro', 'a_mano', 'canje')),
  -- Una factura completa lleva a quién; un ticket, nunca (Verifacti, `destinatario_no_aplica`).
  add constraint documento_con_destinatario check (
    (tipo in ('F1', 'F3', 'R1', 'R4')) = (destinatario is not null)
  );

create table facturacion.canje (
  ticket_id   uuid         not null references facturacion.documento (id),
  factura_id  uuid         not null references facturacion.documento (id),
  en          timestamptz  not null,
  primary key (ticket_id, factura_id)
);
comment on table facturacion.canje is
  'Qué tickets sustituye cada factura F3 (Anexo 4.5 y 5.3). El ticket no se toca; cada uno, una vez. Solo se inserta.';
create index canje_de_la_factura on facturacion.canje (factura_id);

create table facturacion.cobro_de_factura (
  documento_id  uuid         primary key references facturacion.documento (id),
  en            timestamptz  not null,
  por           uuid         references estook.persona (id)
);
comment on table facturacion.cobro_de_factura is
  'Cuándo se cobró una factura hecha a mano. No mueve la caja: eso llega con T7. Solo se inserta.';

create table facturacion.copia_mandada (
  id            bigint       generated always as identity primary key,
  documento_id  uuid         not null references facturacion.documento (id),
  para          text         not null,
  en            timestamptz  not null,
  por           uuid         references estook.persona (id)
);
comment on table facturacion.copia_mandada is
  'A quién se le ha mandado un documento por correo: queda quién y cuándo (A8). Solo se inserta.';
create index copia_del_documento on facturacion.copia_mandada (documento_id, en);

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array['canje', 'cobro_de_factura', 'copia_mandada']
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

-- Quién ve lo emitido: quien lleva la facturación, quien consulta y quien hace facturas. Hoy y ayer
-- para el último lo mira el comando, porque también puede abrir uno viejo por su número.
create function facturacion.lo_puede_ver(p_local uuid)
returns boolean
language sql
stable
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
  select estook.es_el_sistema()
      or estook.puede_editar('accion.alta_de_facturacion', p_local)
      or estook.puede_editar('accion.factura_de_un_ticket', p_local)
      or estook.puede_editar('accion.factura_a_mano', p_local)
      or estook.nivel_de_permiso(estook.persona_actual(), p_local, 'accion.ver_documentos') <> 'sin_acceso'
$$;
revoke all on function facturacion.lo_puede_ver(uuid) from public;
grant execute on function facturacion.lo_puede_ver(uuid) to estook_api;

drop policy documento_lo_ve_quien_la_lleva on facturacion.documento;
create policy documento_lo_ve_quien_puede on facturacion.documento
  for select using (facturacion.lo_puede_ver(local_id));

create policy canje_lo_ve_quien_ve_la_factura on facturacion.canje
  for select using (factura_id in (select id from facturacion.documento));
create policy cobro_lo_ve_quien_ve_el_documento on facturacion.cobro_de_factura
  for select using (documento_id in (select id from facturacion.documento));
create policy copia_la_ve_quien_ve_el_documento on facturacion.copia_mandada
  for select using (documento_id in (select id from facturacion.documento));

-- ═══ 4 · Preparar (la función de la 0106, entera, con lo de arriba) ════════════

drop function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz);

create function facturacion.preparar_el_documento(
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
  p_correo           text default null
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
  if p_origen = 'ticket_de_prueba' then
    perform estook.la_organizacion_del_alta(p_local);
  elsif p_origen = 'canje' then
    if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'a_mano' then
    if not estook.puede_editar('accion.factura_a_mano', p_local) then
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

  -- El cliente, para la vez siguiente (0125). Lo emitido lleva su copia: cambiarlo aquí no lo toca.
  if p_destinatario is not null then
    insert into estook.cliente_de_factura (
      empresa_id, clase, nombre, identificador, id_tipo, codigo_pais, domicilio, correo, actualizado_en
    ) values (
      la_empresa.id, p_destinatario ->> 'clase', p_destinatario ->> 'nombre',
      p_destinatario ->> 'identificador', p_destinatario ->> 'id_tipo',
      p_destinatario ->> 'codigo_pais', p_destinatario ->> 'domicilio',
      nullif(btrim(coalesce(p_correo, '')), ''), p_en
    )
    on conflict (empresa_id, identificador) do update
       set clase = excluded.clase, nombre = excluded.nombre, id_tipo = excluded.id_tipo,
           codigo_pais = excluded.codigo_pais, domicilio = excluded.domicilio,
           correo = coalesce(excluded.correo, estook.cliente_de_factura.correo),
           actualizado_en = excluded.actualizado_en;
  end if;

  return query select el_id, el_texto, el_numero;
end;
$$;

comment on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text) is
  'Prepara un documento con su número, con el candado de su serie (Anexo 4.9, pasos 1 a 4). Lo que va a Verifacti, fuera (0136).';

revoke all on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text) from public;
grant execute on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text) to estook_api;

-- **El canje** (Anexo 5.3, prueba 11): los tickets se bloquean en orden, se mira que cada uno se
-- pueda canjear y que el importe sea exactamente el suyo, y se apunta cuáles sustituye. **Ningún
-- ticket se toca**, y ninguno se canjea dos veces, ni a la vez desde dos aparatos.
create function facturacion.apuntar_el_canje(
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
  el_ticket  uuid;
  fila       facturacion.documento%rowtype;
  lo_ultimo  text;
  la_suma    integer := 0;
begin
  if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_tickets, 1), 0) = 0 then
    raise exception 'sin_tickets' using errcode = 'P0001';
  end if;
  foreach el_ticket in array (select array_agg(t order by t) from unnest(p_tickets) t)
  loop
    perform pg_advisory_xact_lock(hashtextextended('canje|' || el_ticket::text, 0));
    select * into fila from facturacion.documento d where d.id = el_ticket;
    if fila.id is null or fila.local_id <> p_local or fila.tipo <> 'F2' then
      raise exception 'no_es_un_ticket' using errcode = 'P0001';
    end if;
    if exists (select 1 from facturacion.canje c where c.ticket_id = el_ticket) then
      raise exception 'ya_tiene_factura' using errcode = 'P0001';
    end if;
    if fila.modalidad = 'verifactu' then
      select lower(r.estado) into lo_ultimo from facturacion.registro r
       where r.documento_id = el_ticket order by r.en desc, r.id desc limit 1;
      if lo_ultimo is null then
        raise exception 'ticket_sin_registrar' using errcode = 'P0001';
      end if;
      if lo_ultimo in ('incorrecto', 'no registrado', 'factura inexistente', 'anulado') then
        raise exception 'ticket_no_valido' using errcode = 'P0001';
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

revoke all on function facturacion.apuntar_el_canje(uuid, uuid, uuid[], integer, timestamptz) from public;
grant execute on function facturacion.apuntar_el_canje(uuid, uuid, uuid[], integer, timestamptz) to estook_api;

-- Marcar cobrada una factura hecha a mano. Una vez: lo cobrado no se descobra.
create function facturacion.marcar_cobrada(p_documento uuid, p_en timestamptz)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  fila facturacion.documento%rowtype;
begin
  select * into fila from facturacion.documento d where d.id = p_documento;
  if fila.id is null then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if not estook.puede_editar('accion.factura_a_mano', fila.local_id) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  insert into facturacion.cobro_de_factura (documento_id, en, por)
  values (p_documento, p_en, estook.persona_actual())
  on conflict (documento_id) do nothing;
end;
$$;

revoke all on function facturacion.marcar_cobrada(uuid, timestamptz) from public;
grant execute on function facturacion.marcar_cobrada(uuid, timestamptz) to estook_api;

-- A quién se le mandó. La gestoría solo mira: no manda copias a nadie.
create function facturacion.apuntar_la_copia(p_documento uuid, p_para text, p_en timestamptz)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  fila facturacion.documento%rowtype;
begin
  select * into fila from facturacion.documento d where d.id = p_documento;
  if fila.id is null then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if not estook.puede_editar('accion.factura_de_un_ticket', fila.local_id) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  insert into facturacion.copia_mandada (documento_id, para, en, por)
  values (p_documento, left(p_para, 254), p_en, estook.persona_actual());
end;
$$;

revoke all on function facturacion.apuntar_la_copia(uuid, text, timestamptz) from public;
grant execute on function facturacion.apuntar_la_copia(uuid, text, timestamptz) to estook_api;

-- ═══ 5 · Lo que rechaza Hacienda, a la campana (maqueta de T6, 3) ══════════════

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision',
  'documento.rechazado'
));
alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision',
  'documento.rechazado'
));
