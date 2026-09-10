-- Revertir la 0028.
--
-- Se quita el motivo de la merma y se deja la política de apunte como estaba: con
-- Inventario en «ver y editar» y nada más. Las líneas de merma que hubiera se
-- quedan en el libro —el libro no se borra— pero pierden su motivo, así que dejan
-- de poder separarse de una salida cualquiera.

drop policy if exists movimiento_apunte on estook.movimiento_de_stock;

create policy movimiento_apunte on estook.movimiento_de_stock
  for insert with check (estook.puede_editar('app.inventario', local_id));

drop index if exists estook.movimiento_mermas_por_dia;

alter table estook.movimiento_de_stock
  drop constraint if exists movimiento_merma_con_su_motivo,
  drop constraint if exists movimiento_merma_otro_se_explica;

alter table estook.movimiento_de_stock
  drop column if exists motivo_de_merma;

drop function if exists estook.partida_de_la_merma(estook.motivo_de_merma);

drop type if exists estook.partida_de_merma;
drop type if exists estook.motivo_de_merma;
