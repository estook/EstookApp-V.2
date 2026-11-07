-- 0109 · Sin lista de clientes (decisión 0139; Anexo 4.5 y 7.6)
--
-- Richi, 7-nov: «no tiene sentido hacerlo en un bar o restaurante que se llena de personas y tienes
-- que hacer varias o muchas a la semana; se tendría que poner directamente el cliente, no guardarlo,
-- sino esto se peta de personas a la larga». Tenía razón: la 0125 guardaba a los clientes de la factura
-- a mano, y la 0137 lo extendió a cada factura de un ticket. Cada una dejaba otro DNI y otro domicilio
-- en una lista que no hacía falta (RGPD, art. 5: datos mínimos).
--
--   1. **Fuera la tabla, la lista y borrar**. No hay nada que hojear ni que se llene.
--   2. **Quien vuelve no dicta otra vez su dirección**: al escribir su número entero, los datos salen
--      de **su última factura**, que hay que conservar igualmente por ley y lleva su copia. Sin copia
--      aparte de nada: lo que no se usa no ocupa, y se borra con la factura a su plazo.
--   3. **Preparar ya no guarda clientes.** Sigue igual en todo lo demás.
--
-- Lo emitido no cambia: cada documento lleva su destinatario congelado (0137).

-- ═══ 1 · Quien vuelve ══════════════════════════════════════════════════════════

-- Lo mismo que quien hace facturas podía ver: una fila o ninguna, y solo con el número entero. Con su
-- empresa y su entorno, y nunca de una factura que Hacienda no tiene: sus datos pueden ser los que
-- estaban mal. El correo, el último al que se le mandó de verdad.
drop function estook.el_cliente_por_su_numero(uuid, text);

create function estook.el_cliente_por_su_numero(p_local uuid, p_identificador text)
returns table (nombre text, domicilio text, correo text)
language plpgsql
stable
security definer
set search_path = estook, facturacion, pg_catalog, pg_temp
as $$
declare
  la_empresa  uuid;
  el_entorno  text;
  el_numero   text := upper(replace(p_identificador, ' ', ''));
begin
  if not (estook.puede_editar('accion.factura_de_un_ticket', p_local)
          or estook.puede_editar('accion.factura_a_mano', p_local)) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select e.id, e.entorno into la_empresa, el_entorno
    from estook.local l
    join estook.empresa e on e.id = l.empresa_id
   where l.id = p_local;
  return query
    select d.destinatario ->> 'nombre',
           d.destinatario ->> 'domicilio',
           (select c.para
              from facturacion.copia_mandada c
              join facturacion.documento o on o.id = c.documento_id
             where o.empresa_id = la_empresa
               and o.entorno = el_entorno
               and o.destinatario ->> 'identificador' = el_numero
             order by c.en desc, c.id desc
             limit 1)
      from facturacion.documento d
     where d.empresa_id = la_empresa
       and d.entorno = el_entorno
       and d.destinatario ->> 'identificador' = el_numero
       and facturacion.sigue_en_pie(d.id)
     order by d.preparado_en desc, d.numero desc
     limit 1;
end;
$$;

revoke all on function estook.el_cliente_por_su_numero(uuid, text) from public;
grant execute on function estook.el_cliente_por_su_numero(uuid, text) to estook_api;

-- Encontrarlo no recorre todas las facturas de la empresa.
create index documento_por_su_cliente on facturacion.documento (
  empresa_id, (destinatario ->> 'identificador'), preparado_en desc
) where destinatario is not null;

-- ═══ 2 · Fuera la lista ════════════════════════════════════════════════════════

drop function estook.los_clientes_de_factura(uuid, text);
drop function estook.quitar_el_cliente_de_factura(uuid, uuid);
drop table estook.cliente_de_factura;

update estook.permiso
   set descripcion = 'Hacer una factura con conceptos libres y marcar lo cobrado. De fábrica no es de los camareros: es la que puede facturar lo que nunca se vendió'
 where codigo = 'accion.factura_a_mano';

-- ═══ 3 · Preparar (la función de la 0107, entera, sin guardar al cliente) ═════

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
