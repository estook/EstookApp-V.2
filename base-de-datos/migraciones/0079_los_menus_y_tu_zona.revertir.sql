-- Deshace la 0079: los menús y lo de la zona se van, el plato vuelve a estar siempre en
-- la carta y Fogón, a no buscar en internet. Los platos que nacieron en un menú se
-- quedan, ya en la carta: nada se borra. Las búsquedas apuntadas se borran con ella: sin
-- su tipo, no caben en su tabla.

delete from estook.llamada_a_fogon where que = 'analizar_zona';
alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta'
));
alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_creditos;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_creditos check (creditos between 1 and 20);
alter table estook.llamada_a_fogon drop constraint if exists llamada_a_fogon_busquedas_no_negativas;
alter table estook.llamada_a_fogon drop column if exists busquedas_en_internet;

drop table if exists estook.precio_de_la_zona;
drop table if exists estook.analisis_de_zona;
drop table if exists estook.plato_de_menu;
drop table if exists estook.dia_de_menu;
drop table if exists estook.seccion_de_menu;
drop table if exists estook.menu;
drop type if exists estook.clase_de_menu;

alter table estook.local drop column if exists sirve_menus;
alter table estook.plato drop column if exists en_la_carta;
