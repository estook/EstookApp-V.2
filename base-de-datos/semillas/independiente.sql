-- Semilla 2 de 5 · los locales independientes
--
-- **Bar Centro.** Un solo local, sin areas: la organizacion nace con `usa_areas`
-- en falso y la palabra "area" no aparece por ninguna parte de su aplicacion.
--
-- **Casa Lola.** Lo mismo, pero recien dado de alta y **con el alta a medias**
-- (M5). Existe porque la quinta comprobacion al entrar es «si no ha terminado el
-- onboarding, sigue por donde ibas», y sin un local en ese estado esa rama no se
-- puede recorrer sin crear uno a mano cada vez.
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

-- Bar Centro ya esta montado, asi que tiene ficha: es un bar de tapas en Madrid.
-- Sin esto, un local con el alta terminada no tendria ni tipo ni objetivos, que
-- es un estado que no puede existir de verdad.
update estook.local
   set tipo = 'bar_de_tapas',
       direccion = 'Calle Mayor, 14',
       codigo_postal = '28013',
       poblacion = 'Madrid',
       provincia = 'Madrid',
       telefono = '910 000 001',
       hora_de_corte = '03:00',
       color_de_marca = '#8a3b12'
 where codigo = 'bar-centro';

-- ── Casa Lola · el que esta a medias ──────────────────────────────────────────
--
-- Sin tipo, sin direccion y sin objetivos, que es exactamente como nace un local:
-- las columnas del alta se quedan nulas hasta que alguien las responde.

insert into estook.organizacion (codigo, nombre, usa_areas, es_ejemplo)
values ('casa-lola', 'Casa Lola', false, true)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      usa_areas = excluded.usa_areas,
      es_ejemplo = excluded.es_ejemplo;

insert into estook.local (organizacion_id, area_id, codigo, nombre, zona_horaria, es_ejemplo)
select o.id, null, 'casa-lola', 'Casa Lola', 'Europe/Madrid', true
from estook.organizacion o
where o.codigo = 'casa-lola'
on conflict (organizacion_id, codigo) do update
  set nombre = excluded.nombre,
      area_id = excluded.area_id,
      es_ejemplo = excluded.es_ejemplo;

-- Y se le deja el alta en el paso cero **aunque se vuelva a sembrar**: si no, la
-- segunda siembra encontraria el alta ya avanzada de la vez anterior y la rama
-- del onboarding volveria a no poder probarse.
update estook.local
   set onboarding_paso = 0,
       onboarding_terminado = false,
       onboarding_terminado_en = null,
       onboarding_saltados = '{}'
 where codigo = 'casa-lola';
