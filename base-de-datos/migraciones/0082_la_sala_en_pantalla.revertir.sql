-- Deshace la 0082: las secciones vuelven a no saber si son de bebidas. Lo pedido sigue
-- con su destino (barra o cocina), que se guardó al pedir.

alter table estook.seccion_de_menu drop column if exists es_bebida;
alter table estook.seccion_de_carta drop column if exists es_bebida;
