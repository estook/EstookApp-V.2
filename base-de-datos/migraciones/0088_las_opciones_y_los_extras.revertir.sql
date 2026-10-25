-- Deshace la 0088: se van los grupos de opciones, lo que se vende a peso y lo elegido en cada
-- línea (el precio de la línea, que ya lo llevaba, se queda como estaba).

alter table estook.linea_de_cuenta
  drop constraint linea_peso_razonable,
  drop constraint linea_opciones_en_lista,
  drop column peso_gramos,
  drop column opciones;

alter table estook.plato drop column a_peso;

drop table estook.grupo_del_plato;
drop table estook.opcion_de_grupo;
drop table estook.grupo_de_opciones;
