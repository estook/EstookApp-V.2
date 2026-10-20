-- Deshace la 0078: los agotados se van, la tarjeta del chat vuelve a no saber de platos y
-- Fogón, a no leer cartas. Los avisos de agotado del chat y las lecturas de cartas
-- apuntadas se borran con ella: sin su tipo, no caben en sus tablas.

delete from estook.llamada_a_fogon where que = 'leer_carta';
alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena'
));

drop function if exists estook.quien_trabaja_ahora(uuid);
drop table if exists estook.plato_agotado;

delete from estook.mensaje where tarjeta ->> 'tipo' = 'plato';

alter table estook.mensaje drop constraint if exists mensaje_tarjeta_conocida;
alter table estook.mensaje add constraint mensaje_tarjeta_conocida check (
  tarjeta is null or (
    jsonb_typeof(tarjeta) = 'object'
    and tarjeta ->> 'tipo' in ('pedido', 'producto', 'horario')
    and char_length(coalesce(tarjeta ->> 'id', '')) between 1 and 60
  )
);

comment on column estook.mensaje.tarjeta is
  'Un pedido, un producto o el aviso del horario: el tipo y su identificador. Se abre con los permisos de quien lo mira (0075).';
