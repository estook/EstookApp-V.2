-- Semilla 1 de 5 · la cadena
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

-- La ficha de cada uno. Los seis estan montados, asi que tienen tipo, direccion
-- y hora de corte: un local con el alta terminada y sin tipo es un estado que no
-- puede existir de verdad, y sembrarlo asi enseñaria pantallas que nadie vera.
update estook.local l
   set tipo = v.tipo::estook.tipo_de_local,
       direccion = v.direccion,
       codigo_postal = v.codigo_postal,
       poblacion = v.poblacion,
       provincia = 'Cadiz',
       telefono = v.telefono,
       hora_de_corte = '04:00',
       color_de_marca = '#0d5c63'
  from (values
    ('bar-puerto',  'restaurante_de_carta', 'Muelle Pesquero, 3',  '11006', 'Cadiz',    '956 000 001'),
    ('bar-playa',   'bar_de_tapas',         'Paseo Maritimo, 41',  '11010', 'Cadiz',    '956 000 002'),
    ('bar-faro',    'cafeteria',            'Punta del Faro, s/n', '11011', 'Cadiz',    '956 000 003'),
    ('bar-muelle',  'bar_de_tapas',         'Muelle Viejo, 8',     '11201', 'Algeciras','956 000 004'),
    ('bar-ribera',  'restaurante_de_carta', 'Ribera del Rio, 22',  '11500', 'El Puerto','956 000 005'),
    ('bar-darsena', 'food_truck',           'Darsena Sur, 1',      '11207', 'Algeciras','956 000 006')
  ) as v (codigo, tipo, direccion, codigo_postal, poblacion, telefono)
  join estook.organizacion o on o.codigo = 'grupo-costa'
 where l.codigo = v.codigo and l.organizacion_id = o.id;
