-- Semilla 2 de 2 · la cadena
--
-- Grupo Costa: seis locales repartidos en dos areas. Es la semilla que obliga a que
-- todo se escriba desde el principio pensando en varios locales, que es el error
-- tipico que avisa M1: montarlo todo sobre "un usuario pertenece a un local".
--
-- Idempotente, igual que la otra.

insert into estook.organizacion (codigo, nombre, usa_areas, es_ejemplo)
values ('grupo-costa', 'Grupo Costa', true, true)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      usa_areas = excluded.usa_areas,
      es_ejemplo = excluded.es_ejemplo;

insert into estook.area (organizacion_id, codigo, nombre, es_ejemplo)
select o.id, v.codigo, v.nombre, true
from estook.organizacion o
cross join (values
  ('zona-norte', 'Zona Norte'),
  ('zona-sur',   'Zona Sur')
) as v (codigo, nombre)
where o.codigo = 'grupo-costa'
on conflict (organizacion_id, codigo) do update
  set nombre = excluded.nombre,
      es_ejemplo = excluded.es_ejemplo;

insert into estook.local (organizacion_id, area_id, codigo, nombre, zona_horaria, es_ejemplo)
select o.id, a.id, v.codigo, v.nombre, 'Europe/Madrid', true
from estook.organizacion o
join (values
  ('bar-puerto',  'Bar Puerto',  'zona-norte'),
  ('bar-playa',   'Bar Playa',   'zona-norte'),
  ('bar-faro',    'Bar Faro',    'zona-norte'),
  ('bar-muelle',  'Bar Muelle',  'zona-sur'),
  ('bar-ribera',  'Bar Ribera',  'zona-sur'),
  ('bar-darsena', 'Bar Darsena', 'zona-sur')
) as v (codigo, nombre, area) on true
join estook.area a on a.organizacion_id = o.id and a.codigo = v.area
where o.codigo = 'grupo-costa'
on conflict (organizacion_id, codigo) do update
  set nombre = excluded.nombre,
      area_id = excluded.area_id,
      es_ejemplo = excluded.es_ejemplo;
