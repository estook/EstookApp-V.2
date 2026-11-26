-- Deshace la 0133: sin web de reservas. **Se pierden los «Avísame si se libera», los intentos, los
-- códigos y las confirmaciones de las reservas**, y lo que el reloj tenía apuntado para ellas.

delete from estook.al_movil_programado where tipo in ('reserva.sin_confirmar', 'reserva.recordatorio');
alter table estook.al_movil_programado drop constraint programado_tipo_conocido;
alter table estook.al_movil_programado add constraint programado_tipo_conocido check (
  tipo in (
    'turno.entras', 'lote.caduca', 'pedido.no_llega', 'chat.confirmar',
    'calendario.recordatorio', 'calendario.nota'
  )
);

drop policy reserva_de_mesa_la_lleva_el_sistema on estook.reserva_de_mesa;
drop policy reserva_la_lleva_el_sistema on estook.reserva;
drop policy cuenta_la_lee_el_sistema on estook.cuenta;
drop policy mesas_que_se_juntan_lo_lee_el_sistema on estook.mesas_que_se_juntan;
drop policy mesa_la_lee_el_sistema on estook.mesa;
drop policy ajuste_de_reservas_lo_lee_el_sistema on estook.ajuste_de_reservas;
drop policy local_lo_lee_el_sistema on estook.local;

drop table estook.intento_en_la_web_de_reservas;
drop table estook.aviso_si_se_libera;

alter table estook.reserva
  drop constraint reserva_cancelada_por,
  drop constraint reserva_codigo,
  drop column cancelada_por,
  drop column ofertas,
  drop column confirmada_en,
  drop column codigo;

alter table estook.mesa drop column por_internet;

alter table estook.ajuste_de_reservas
  drop constraint ajuste_de_reservas_minutos_para_confirmar,
  drop column minutos_para_confirmar,
  drop column pedir_que_confirmen,
  drop column avisar_por_correo;
