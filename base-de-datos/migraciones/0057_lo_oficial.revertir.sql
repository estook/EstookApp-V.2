-- Deshace la 0057: sin fijados, sin confirmar, sin tarjetas y sin el correo del chat.
--
-- **Lo que se pierde:** quién fijó qué, quién confirmó, las tarjetas (los mensajes que
-- eran solo una tarjeta se quedan como «Se eliminó este mensaje») y cuándo salió el
-- último correo del chat. «Cocina» y «Sala» no vuelven solas: las crea otra vez la app
-- de C1 al abrir el chat.

drop function if exists estook.a_quien_escribir(uuid[]);
drop table if exists estook.correo_del_chat;
alter table estook.chat_al_movil drop column if exists por_correo;

delete from estook.al_movil_programado where tipo = 'chat.confirmar';
alter table estook.al_movil_programado drop constraint programado_tipo_conocido;
alter table estook.al_movil_programado add constraint programado_tipo_conocido check (
  tipo in ('turno.entras', 'lote.caduca', 'pedido.no_llega')
);

delete from estook.aviso where tipo = 'chat.confirmar';
delete from estook.preferencia_de_aviso where tipo = 'chat.confirmar';

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar'
));

drop table if exists estook.confirmacion_del_mensaje;

-- Los mensajes que eran solo una tarjeta no cabrían en la regla de antes.
update estook.mensaje
   set tarjeta = null, borrado_en = coalesce(borrado_en, now()), fijado_en = null
 where tarjeta is not null and texto is null and adjunto_clave is null;

drop index if exists estook.mensaje_fijado;
alter table estook.mensaje drop constraint if exists mensaje_borrado_sin_fijar;
alter table estook.mensaje drop constraint if exists mensaje_tarjeta_conocida;

alter table estook.mensaje drop constraint mensaje_borrado_sin_nada;
alter table estook.mensaje add constraint mensaje_borrado_sin_nada check (
  borrado_en is null or (texto is null and adjunto_clave is null)
);

alter table estook.mensaje drop constraint mensaje_con_algo;
alter table estook.mensaje add constraint mensaje_con_algo check (
  borrado_en is not null or texto is not null or adjunto_clave is not null
);

alter table estook.mensaje
  drop column if exists fijado_por,
  drop column if exists fijado_en,
  drop column if exists pide_confirmar,
  drop column if exists tarjeta;

-- Las dos políticas, como las dejó la 0056.
drop policy canal_cambio on estook.canal;
create policy canal_cambio on estook.canal
  for update using (tipo = 'canal' and estook.puede_editar('app.equipo', local_id))
  with check (tipo = 'canal' and estook.puede_editar('app.equipo', local_id));

drop policy canal_alta on estook.canal;
create policy canal_alta on estook.canal
  for insert with check (
    local_id in (select estook.locales_visibles())
    and archivado_en is null
    and (
      tipo in ('equipo', 'cocina', 'sala')
      or (tipo = 'privado' and creado_por = estook.persona_actual())
      or (tipo = 'canal' and creado_por = estook.persona_actual()
          and estook.puede_editar('app.equipo', local_id))
    )
  );

drop function if exists estook.lleva_canales(uuid);

comment on type estook.tipo_de_canal is
  'equipo, cocina y sala se crean solos con el local; canal lo crea quien lleva el local; privado, cualquiera (0071).';
