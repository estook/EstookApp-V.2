-- Deshace la 0110. **Lo que se pierde:** quién devolvió, corrigió o anuló y por qué, qué línea devolvió
-- cada rectificativa y qué señal descontó cada factura. **Los documentos se quedan**, que son de solo
-- inserción, y una anulación ya hecha sigue en `registro`: lo emitido no se toca.

drop function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, uuid);
drop function facturacion.apuntar_lo_rehecho(uuid, uuid, timestamptz);
drop function facturacion.las_senales_del_cliente(uuid, text);
drop function facturacion.apuntar_los_descuentos(uuid, uuid, uuid[], timestamptz);
drop function facturacion.apuntar_el_paso_de_anular(uuid, text, text, text, text, text, text, timestamptz);
drop function facturacion.pedir_la_anulacion(uuid, uuid, text, timestamptz);
drop function facturacion.apuntar_la_correccion(uuid, uuid, uuid, text, timestamptz);
drop function facturacion.apuntar_la_devolucion(uuid, uuid, uuid, text, jsonb, timestamptz);
drop function facturacion.mirar_lo_rectificable(facturacion.documento);
drop function facturacion.cabe_lo_devuelto(facturacion.documento, jsonb, integer);
drop function facturacion.se_puede_rectificar(uuid, uuid);

-- La de la 0108, entera.
create or replace function facturacion.al_apuntar_un_estado()
returns trigger
language plpgsql
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
begin
  if facturacion.es_estado_final(new.estado) then
    delete from facturacion.por_repasar p where p.documento_id = new.documento_id;
  end if;
  return new;
end;
$$;

-- La de la 0108, entera.
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
  if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
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

drop function facturacion.esta_descontada(uuid);
drop function facturacion.es_senal(uuid);
drop function facturacion.lo_que_queda(uuid);
drop function facturacion.anulacion_en_curso(uuid);

drop table facturacion.rehecho;
drop table facturacion.paso_de_anulacion;
drop table facturacion.anulacion;
drop table facturacion.descuento_de_senal;
drop table facturacion.rectificacion;

alter table facturacion.documento
  drop constraint documento_origen_conocido,
  add constraint documento_origen_conocido
    check (origen in ('ticket_de_prueba', 'cobro', 'a_mano', 'canje')) not valid;

-- La de la 0109, entera.
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
  -- Ya no se usa (0139): sigue para que la API de antes funcione hasta desplegar la nueva.
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

  return query select el_id, el_texto, el_numero;
end;
$$;

comment on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text) is
  'Prepara un documento con su número, con el candado de su serie (Anexo 4.9, pasos 1 a 4). Lo que va a Verifacti, fuera (0136).';

revoke all on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text) from public;
grant execute on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text) to estook_api;

-- La de la 0107, entera.
drop function estook.quien_hace_que(uuid);

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

create or replace function estook.es_permiso_de_los_documentos(p_permiso text)
returns boolean
language sql
immutable
as $$
  select p_permiso in (
    'accion.factura_de_un_ticket', 'accion.factura_a_mano', 'accion.ver_documentos'
  )
$$;

delete from estook.recorte_de_permiso
 where permiso in ('accion.devolver', 'accion.corregir_datos', 'accion.anular');
delete from estook.permiso_de_rol
 where permiso in ('accion.devolver', 'accion.corregir_datos', 'accion.anular');
delete from estook.permiso
 where codigo in ('accion.devolver', 'accion.corregir_datos', 'accion.anular');
