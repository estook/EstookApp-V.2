-- Deshace la 0111. **Lo que se pierde:** el código de cada ticket, qué factura pidió cada cliente y a
-- qué correo, y lo que quedaba por mandar. **Los documentos se quedan**, que son de solo inserción: una
-- factura pedida sigue siendo una factura, con su origen, y por eso la restricción queda sin validar.

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
      $cron$
    );
  exception when others then
    raise notice 'El reloj de los documentos no se ha podido programar: %. Lo dirá bd:comprobar-api.', sqlerrm;
  end;
end;
$$;

drop trigger lo_rehecho_llega_a_quien_lo_pidio on facturacion.rehecho;
drop function facturacion.al_rehacer_una_pedida();
drop trigger cada_ticket_con_su_codigo on facturacion.documento;
drop function facturacion.al_preparar_un_ticket();
drop function facturacion.un_codigo_nuevo();
drop function facturacion.apuntar_un_intento(text, uuid, text, timestamptz);
drop function facturacion.quedan_intentos(text, uuid, text, timestamptz, integer, integer);
drop function facturacion.apuntar_lo_pedido(uuid, uuid, text, timestamptz);
drop function facturacion.correo_que_no_salio(uuid, timestamptz, timestamptz);
drop function facturacion.quitar_el_correo(uuid);
drop function facturacion.correo_mandado(uuid, text, timestamptz);
drop function facturacion.poner_el_correo(uuid, text, timestamptz);
drop table facturacion.intento_de_la_pagina;
drop table facturacion.correo_por_mandar;

drop trigger pedida_solo_se_inserta on facturacion.pedida;
drop trigger pedida_no_se_vacia on facturacion.pedida;
drop table facturacion.pedida;
drop trigger codigo_de_ticket_solo_se_inserta on facturacion.codigo_de_ticket;
drop trigger codigo_de_ticket_no_se_vacia on facturacion.codigo_de_ticket;
drop table facturacion.codigo_de_ticket;

-- La de la 0110, entera.
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

-- La de la 0110, entera.
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
    if p_origen not in ('ticket_de_prueba', 'cobro', 'canje', 'a_mano', 'senal', 'devolucion', 'correccion') then
      raise exception 'origen_desconocido' using errcode = 'P0001';
    end if;
  elsif p_origen = 'ticket_de_prueba' then
    perform estook.la_organizacion_del_alta(p_local);
  elsif p_origen = 'canje' then
    if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
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

alter table facturacion.documento
  drop constraint documento_origen_conocido,
  add constraint documento_origen_conocido check (origen in (
    'ticket_de_prueba', 'cobro', 'a_mano', 'canje', 'devolucion', 'correccion', 'senal'
  )) not valid;
