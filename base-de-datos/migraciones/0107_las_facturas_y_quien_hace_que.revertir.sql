-- Deshace la 0107. **Lo que la vuelta atrás no puede guardar**: las facturas hechas, sus canjes y
-- sus clientes. En pruebas no importa; en real no se puede volver atrás (Anexo 4.12).

delete from estook.aviso where tipo = 'documento.rechazado';
delete from estook.preferencia_de_aviso where tipo = 'documento.rechazado';
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
  'fogon.revision'
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
  'fogon.revision'
));

drop function if exists facturacion.apuntar_la_copia(uuid, text, timestamptz);
drop function if exists facturacion.marcar_cobrada(uuid, timestamptz);
drop function if exists facturacion.apuntar_el_canje(uuid, uuid, uuid[], integer, timestamptz);
drop function if exists facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text);

drop policy if exists documento_lo_ve_quien_puede on facturacion.documento;
create policy documento_lo_ve_quien_la_lleva on facturacion.documento
  for select using (
    estook.es_el_sistema() or estook.puede_editar('accion.alta_de_facturacion', local_id)
  );
drop function if exists facturacion.lo_puede_ver(uuid);

drop table if exists facturacion.copia_mandada;
drop table if exists facturacion.cobro_de_factura;
drop table if exists facturacion.canje;

alter table facturacion.documento
  drop constraint documento_con_destinatario,
  drop constraint documento_origen_conocido,
  add constraint documento_origen_conocido
    check (origen in ('ticket_de_prueba', 'cobro')) not valid,
  drop column vencimiento,
  drop column destinatario;

-- La de la 0106, entera.
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
  p_en               timestamptz
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
  if p_origen <> 'ticket_de_prueba' then
    raise exception 'origen_desconocido' using errcode = 'P0001';
  end if;
  perform estook.la_organizacion_del_alta(p_local);

  select * into el_local from estook.local l where l.id = p_local;
  if el_local.empresa_id is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  select * into la_empresa from estook.empresa e where e.id = el_local.empresa_id;

  if la_empresa.modalidad = 'sin_envio' then
    raise exception 'sin_envio_todavia_no' using errcode = 'P0001';
  end if;
  if la_empresa.modalidad = 'verifactu' and (
    la_empresa.en_verifacti_en is null
    or (la_empresa.autorizacion <> 'correcta' and not la_empresa.de_pruebas)
  ) then
    raise exception 'empresa_sin_terminar' using errcode = 'P0001';
  end if;
  if p_origen = 'ticket_de_prueba' and la_empresa.entorno <> 'pruebas' then
    raise exception 'empresa_en_real' using errcode = 'P0001';
  end if;

  el_tipo := case when p_tipo in ('F2', 'F3') then 'ticket'
                  when p_tipo = 'F1' then 'factura'
                  else 'rectificativa' end;
  if p_tipo = 'F3' then el_tipo := 'factura'; end if;
  select * into la_serie from facturacion.serie s
   where s.local_id = p_local and s.tipo = el_tipo
   order by s.puesta_en desc
   limit 1;
  if la_serie.id is null or la_serie.empresa_id <> la_empresa.id then
    raise exception 'falta_la_serie' using errcode = 'P0001';
  end if;

  el_texto := la_serie.prefijo || '-' || to_char(p_fecha_operacion, 'YYYY') || '-';
  perform pg_advisory_xact_lock(
    hashtextextended(la_empresa.id::text || '|' || la_empresa.entorno || '|' || el_texto, 0)
  );
  select coalesce(max(d.numero), 0) + 1 into el_numero
    from facturacion.documento d
   where d.empresa_id = la_empresa.id and d.entorno = la_empresa.entorno and d.serie = el_texto;

  insert into facturacion.documento (
    empresa_id, local_id, serie_id, entorno, modalidad, tipo, serie, numero, fecha_operacion,
    descripcion, lineas, desglose, base, cuota, total, empresa_copia, donde, origen,
    preparado_por, desde_terminal, preparado_en
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
    nullif(btrim(coalesce(p_donde, '')), ''), p_origen, estook.persona_actual(), p_terminal, p_en
  )
  returning facturacion.documento.id into el_id;

  return query select el_id, el_texto, el_numero;
end;
$$;

revoke all on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz) from public;
grant execute on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz) to estook_api;

drop function if exists estook.quitar_el_cliente_de_factura(uuid, uuid);
drop function if exists estook.los_clientes_de_factura(uuid, text);
drop function if exists estook.el_cliente_por_su_numero(uuid, text);
drop table if exists estook.cliente_de_factura;

drop function if exists estook.dar_un_permiso_de_los_documentos(uuid, uuid, text, boolean);
drop function if exists estook.quien_hace_que(uuid);

create or replace function estook.recorte_de_la_facturacion_solo_la_direccion()
returns trigger
language plpgsql
as $$
begin
  if (new.permiso = 'accion.alta_de_facturacion'
        or (tg_op = 'UPDATE' and old.permiso = 'accion.alta_de_facturacion'))
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

drop function if exists estook.es_permiso_de_los_documentos(text);

delete from estook.recorte_de_permiso
 where permiso in ('accion.factura_de_un_ticket', 'accion.factura_a_mano', 'accion.ver_documentos');
delete from estook.permiso_de_rol
 where permiso in ('accion.factura_de_un_ticket', 'accion.factura_a_mano', 'accion.ver_documentos');
delete from estook.permiso
 where codigo in ('accion.factura_de_un_ticket', 'accion.factura_a_mano', 'accion.ver_documentos');
