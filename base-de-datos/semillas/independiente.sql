-- Semilla 1 de 2 · el local independiente
--
-- Bar Centro. Un solo local, sin areas: la organizacion nace con `usa_areas` en
-- falso y la palabra "area" no aparece por ninguna parte de su aplicacion.
--
-- Es idempotente: se puede volver a ejecutar sin duplicar nada (principio 9).

insert into estook.organizacion (codigo, nombre, usa_areas, es_ejemplo)
values ('bar-centro', 'Bar Centro', false, true)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      usa_areas = excluded.usa_areas,
      es_ejemplo = excluded.es_ejemplo;

insert into estook.local (organizacion_id, area_id, codigo, nombre, zona_horaria, es_ejemplo)
select o.id, null, 'bar-centro', 'Bar Centro', 'Europe/Madrid', true
from estook.organizacion o
where o.codigo = 'bar-centro'
on conflict (organizacion_id, codigo) do update
  set nombre = excluded.nombre,
      area_id = excluded.area_id,
      es_ejemplo = excluded.es_ejemplo;
