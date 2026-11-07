-- Deshace la 0108. **Lo que se pierde:** nada fiscal. La cola de lo que falta por terminar sale otra
-- vez de los documentos si se vuelve a aplicar. Sin esto, nada sale de «En Hacienda» y un ticket cuya
-- factura rechazó Hacienda no se puede volver a facturar.

-- La de la 0107, entera.
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

drop function if exists facturacion.sigue_en_pie(uuid);

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'estook-documentos';
  end if;
end;
$$;

alter table plataforma.reloj drop column if exists documentos_programado;

drop trigger if exists envio_por_repasar on facturacion.envio;
drop trigger if exists registro_por_repasar on facturacion.registro;
drop trigger if exists documento_por_repasar on facturacion.documento;
drop function if exists facturacion.al_apuntar_un_envio();
drop function if exists facturacion.al_apuntar_un_estado();
drop function if exists facturacion.al_preparar_un_documento();
drop table if exists facturacion.por_repasar;
drop function if exists facturacion.es_estado_final(text);
