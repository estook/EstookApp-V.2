-- Deshace la 0127: sin ficha del trabajador. **Se pierde lo escrito en las fichas** y la
-- lista de documentos; los ficheros se quedan en el cubo `equipo`, que no se borra.

delete from estook.llamada_a_fogon where que = 'leer_contrato';
alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta', 'analizar_zona'
));

drop table estook.documento_de_persona;
drop table estook.ficha_privada;
drop table estook.ficha_laboral;
drop function estook.la_lleva(uuid, uuid, text, boolean);
