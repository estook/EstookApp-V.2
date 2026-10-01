-- Deshace la 0054: sin lo hecho sin conexión, sin avisos al móvil y sin la hora a la
-- que suele llegar un proveedor.
--
-- **Lo que se pierde:** qué fichajes se hicieron sin señal y cuáles había que
-- revisar (los fichajes se quedan, con sus horas), quién apuntó a mano un fichaje y
-- por qué (el fichaje se queda, y su rastro sigue en la auditoría), los móviles que
-- recibían avisos (cada uno tendrá que volver a decir que sí), lo que eligió cada uno
-- en la columna «Móvil» y en «Cuándo suena», los avisos de los cuatro tipos nuevos y
-- las llaves de cifrado de los aparatos (lo que un aparato tuviera guardado sin
-- conexión ya no se podrá leer). Los proveedores pierden su «suele llegar hacia las».

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'estook-movil';
  end if;
end;
$$;

alter table plataforma.reloj drop column if exists movil_programado;

drop function if exists estook.pedidos_por_llegar(timestamptz, timestamptz, uuid);
alter table estook.proveedor
  drop constraint if exists proveedor_suele_llegar_en_punto,
  drop column if exists suele_llegar_a;

drop table if exists estook.al_movil_programado;

delete from estook.aviso
 where tipo in ('turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar');
delete from estook.preferencia_de_aviso
 where tipo in ('turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar');

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado'
));

-- El disparador, como lo dejó la 0050.
create or replace function estook.aviso_solo_se_lee()
returns trigger
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if estook.es_el_sistema() then
    return new;
  end if;
  if (new.id, new.organizacion_id, new.local_id, new.persona_id, new.tipo, new.clave,
      new.titulo, new.detalle, new.ir, new.quienes, new.creado_en, new.actualizado_en,
      new.correo, new.correo_intentos, new.correo_para)
     is distinct from
     (old.id, old.organizacion_id, old.local_id, old.persona_id, old.tipo, old.clave,
      old.titulo, old.detalle, old.ir, old.quienes, old.creado_en, old.actualizado_en,
      old.correo, old.correo_intentos, old.correo_para) then
    raise exception 'De un aviso solo se marca si está leído'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop index if exists estook.aviso_con_movil_pendiente;
alter table estook.aviso
  drop constraint if exists aviso_correo_de_repuesto,
  drop constraint if exists aviso_movil_con_hora,
  drop constraint if exists aviso_movil_conocido,
  drop column if exists correo_si_no_llega,
  drop column if exists movil_intentos,
  drop column if exists movil_desde,
  drop column if exists movil;

alter table estook.preferencia_de_aviso
  drop constraint if exists preferencia_movil_con_app,
  drop column if exists al_movil;

drop function if exists estook.turnos_de(uuid[], timestamptz, timestamptz);
drop function if exists estook.como_le_suena(uuid[]);
drop table if exists estook.cuando_suena;
drop table if exists estook.movil_suscrito;

drop table if exists estook.cifrado_usado;
drop table if exists estook.clave_del_terminal;
drop policy if exists terminal_lo_mira_el_sistema on estook.terminal;
drop policy if exists terminal_lo_prepara_el_sistema on estook.terminal;
alter table estook.terminal
  drop constraint if exists terminal_clave_con_medida,
  drop column if exists clave_publica;

drop policy if exists fichaje_lo_apunta_quien_lleva_el_equipo on estook.fichaje;
alter table estook.fichaje
  drop constraint if exists fichaje_a_mano_con_nombre_y_motivo,
  drop column if exists motivo_a_mano,
  drop column if exists apuntado_por;

alter table estook.pausa drop column if exists sin_conexion;

drop index if exists estook.fichaje_por_revisar;
alter table estook.fichaje
  drop constraint if exists fichaje_revisado_con_nombre,
  drop column if exists revisado_en,
  drop column if exists revisado_por,
  drop column if exists por_revisar,
  drop column if exists salio_sin_conexion,
  drop column if exists entro_sin_conexion;
