-- Deshace la 0113. **Lo que se pierde:** los objetivos de venta de cada local y de cada persona, y
-- si cada uno veía el suyo. Lo vendido no se toca: se lee de las mesas.

drop function if exists estook.lo_que_he_vendido(uuid, date, date);
drop table if exists estook.objetivo_de_venta;
