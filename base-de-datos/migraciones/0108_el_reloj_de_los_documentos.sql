-- 0108 · El reloj de los documentos (decisión 0138; Anexo 4.9, 4.10 y 5.3)
--
-- Richi vio en IKATZ que **nada salía nunca de «En Hacienda»**. El repaso colgaba del latido del
-- móvil (0136), y ese latido `pg_cron` solo lo llama si hay algo que mandar al móvil (0054): sin un
-- aviso pendiente, nadie preguntaba a Hacienda ni se pedían los avisos de Verifacti. Las pruebas no
-- lo vieron porque llaman a la función por dentro, sin pasar por `pg_cron`.
--
--   1. **Lo que falta por terminar, en una cola** (`por_repasar`). El documento y lo que se le añade
--      siguen siendo de solo inserción; esto es trabajo por hacer, no un registro fiscal. Se mantiene
--      sola con disparadores, y así mirar cada minuto si hay algo no recorre todos los documentos.
--   2. **Un reloj propio** (`estook-documentos`), con su camino en la API: lo fiscal no depende de
--      los avisos al móvil.
--   3. **El canje de una factura que Hacienda no tiene no cuenta**: el ticket se puede volver a
--      facturar. Y una factura nunca sustituye un ticket de otro entorno ni de otra empresa.

-- ═══ 1 · Lo que falta por terminar ═════════════════════════════════════════════

-- **Si ya está dicho todo sobre un documento.** Lo que no se conoce no es final: se sigue
-- preguntando, igual que `elEstadoDeVerifacti` lo lee como pendiente (una prueba mira las dos listas).
create function facturacion.es_estado_final(p_estado text)
returns boolean
language sql
immutable
as $$
  select lower(btrim(p_estado)) in (
    'correcto', 'aceptado con errores', 'incorrecto', 'no registrado', 'factura inexistente',
    'anulado', 'duplicado'
  )
$$;

create table facturacion.por_repasar (
  documento_id  uuid         primary key references facturacion.documento (id),
  -- Cuándo se preparó, en la hora que puso la API.
  desde         timestamptz  not null
);

comment on table facturacion.por_repasar is
  'Los documentos de los que Hacienda todavía no ha dicho nada definitivo: lo que mira el reloj cada minuto (0138). Es trabajo por hacer, no un registro fiscal: se vacía sola.';

create index por_repasar_por_edad on facturacion.por_repasar (desde);

alter table facturacion.por_repasar enable row level security;
revoke all on facturacion.por_repasar from public;
grant select on facturacion.por_repasar to estook_api;
create policy por_repasar_lo_ve_el_sistema on facturacion.por_repasar
  for select using (estook.es_el_sistema());

create function facturacion.al_preparar_un_documento()
returns trigger
language plpgsql
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
begin
  -- Lo que va por el SII no pasa por Verifacti: está emitido al prepararse.
  if new.modalidad = 'verifactu' then
    insert into facturacion.por_repasar (documento_id, desde)
    values (new.id, new.preparado_en)
    on conflict (documento_id) do nothing;
  end if;
  return new;
end;
$$;

create function facturacion.al_apuntar_un_estado()
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

create function facturacion.al_apuntar_un_envio()
returns trigger
language plpgsql
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
begin
  -- Rechazado por los datos: no llegó a Hacienda y se corrige con otro documento.
  if new.resultado = 'rechazado_por_datos' then
    delete from facturacion.por_repasar p where p.documento_id = new.documento_id;
  end if;
  return new;
end;
$$;

revoke all on function facturacion.al_preparar_un_documento() from public;
revoke all on function facturacion.al_apuntar_un_estado() from public;
revoke all on function facturacion.al_apuntar_un_envio() from public;

create trigger documento_por_repasar after insert on facturacion.documento
  for each row execute function facturacion.al_preparar_un_documento();
create trigger registro_por_repasar after insert on facturacion.registro
  for each row execute function facturacion.al_apuntar_un_estado();
create trigger envio_por_repasar after insert on facturacion.envio
  for each row execute function facturacion.al_apuntar_un_envio();

-- Lo que ya hay, como si hubiera estado siempre.
insert into facturacion.por_repasar (documento_id, desde)
select d.id, d.preparado_en
  from facturacion.documento d
 where d.modalidad = 'verifactu'
   and not exists (
     select 1 from facturacion.registro r
      where r.documento_id = d.id and facturacion.es_estado_final(r.estado)
   )
   and not exists (
     select 1 from facturacion.envio e
      where e.documento_id = d.id and e.resultado = 'rechazado_por_datos'
   );

-- ═══ 2 · El reloj ══════════════════════════════════════════════════════════════

alter table plataforma.reloj
  add column documentos_programado boolean not null default false;

-- Solo donde hay `pg_cron`, como los otros dos. Si no se puede programar, la migración sigue y
-- `bd:comprobar-api` lo dice en rojo. Lo de menos de dos minutos todavía lo está mandando quien lo
-- hizo: la base no molesta a la API por eso.
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

    update plataforma.reloj set documentos_programado = true where unica;
  exception when others then
    raise notice 'El reloj de los documentos no se ha podido programar: %. Lo dirá bd:comprobar-api.', sqlerrm;
  end;
end;
$$;

-- ═══ 3 · El canje ══════════════════════════════════════════════════════════════

-- **Si un documento sigue valiendo ante Hacienda**: no lo rechazó Verifacti por los datos, y lo
-- último que dice Hacienda no es que lo rechaza. Lo que todavía no ha contestado, vale.
create function facturacion.sigue_en_pie(p_documento uuid)
returns boolean
language sql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
  select not exists (
           select 1 from facturacion.envio e
            where e.documento_id = p_documento and e.resultado = 'rechazado_por_datos'
         )
     and coalesce((
           select lower(btrim(r.estado)) from facturacion.registro r
            where r.documento_id = p_documento
            order by r.en desc, r.id desc
            limit 1
         ), '') not in ('incorrecto', 'no registrado', 'factura inexistente', 'anulado')
$$;

revoke all on function facturacion.sigue_en_pie(uuid) from public;
grant execute on function facturacion.sigue_en_pie(uuid) to estook_api;

-- La de la 0107, entera, con tres cosas más: la factura es de este local, el ticket es del mismo
-- entorno y de la misma empresa (una factura de verdad no sustituye un ticket de pruebas), y un
-- ticket solo está canjeado si la factura que lo sustituye sigue en pie.
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
