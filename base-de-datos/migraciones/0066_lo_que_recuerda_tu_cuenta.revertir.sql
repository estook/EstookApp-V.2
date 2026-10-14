-- Deshace la 0066.
--
-- **Lo que se pierde:** el periodo que cada uno eligió en cada widget y quién ha visto
-- el recorrido. La app vuelve a lo de antes: el periodo que recuerde cada aparato (o
-- 7 días) y el recorrido otra vez a todos, una vez.

drop table if exists estook.preferencias_de_persona;
