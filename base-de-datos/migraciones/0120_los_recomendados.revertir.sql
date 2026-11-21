-- Deshace la 0120: lo recomendado vuelve a ser «fijado» en cada botón del TPV.
--
-- **Lo que se pierde:** un plato recomendado desde la Carta que no tiene botón en el TPV (de una
-- carta sin botonera montada) deja de estar recomendado: el fijado vive en el botón, y sin botón
-- no hay dónde guardarlo.

comment on column estook.boton_del_tpv.fijado is
  'Fijado en «Lo más pedido»: sale el primero, se venda o no (Anexo 11.10).';

-- La columna sigue ahí (la 0120 no la quita): se vuelve a llenar con lo recomendado.
update estook.boton_del_tpv b
   set fijado = exists (select 1 from estook.plato p where p.id = b.plato_id and p.recomendado);

drop index if exists estook.plato_recomendado;

alter table estook.plato drop column recomendado;
