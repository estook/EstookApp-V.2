-- Deshace la 0122: vuelve la columna «fijado» de cada botón del TPV, sin usar como la dejó la 0120,
-- y se llena con lo recomendado de cada plato, que es lo que guardaba.

alter table estook.boton_del_tpv
  add column fijado boolean not null default false;

comment on column estook.boton_del_tpv.fijado is
  'Sin usar desde la 0120: lo recomendado es del plato (plato.recomendado). Se quita en una migración de después, cuando ninguna API lo lea.';

update estook.boton_del_tpv b
   set fijado = exists (select 1 from estook.plato p where p.id = b.plato_id and p.recomendado);
