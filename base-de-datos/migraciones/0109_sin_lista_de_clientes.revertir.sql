-- Deshace la 0109: vuelven la tabla, la lista y borrar, tal como estaban en la 0107. **Los clientes se
-- vuelven a sacar de las facturas**, con el último dato de cada uno: los que se habían quitado a mano
-- vuelven también, y sus correos se pierden.

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

drop index if exists facturacion.documento_por_su_cliente;
drop function estook.el_cliente_por_su_numero(uuid, text);

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

insert into estook.cliente_de_factura (
  empresa_id, clase, nombre, identificador, id_tipo, codigo_pais, domicilio, actualizado_en
)
select distinct on (d.empresa_id, d.destinatario ->> 'identificador')
       d.empresa_id, d.destinatario ->> 'clase', d.destinatario ->> 'nombre',
       d.destinatario ->> 'identificador', d.destinatario ->> 'id_tipo',
       d.destinatario ->> 'codigo_pais', d.destinatario ->> 'domicilio', d.preparado_en
  from facturacion.documento d
 where d.destinatario is not null
 order by d.empresa_id, d.destinatario ->> 'identificador', d.preparado_en desc;

update estook.permiso
   set descripcion = 'Hacer una factura con conceptos libres, ver los clientes guardados y marcar lo cobrado. De fábrica no es de los camareros: es la que puede facturar lo que nunca se vendió'
 where codigo = 'accion.factura_a_mano';
