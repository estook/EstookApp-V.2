-- Deshace la 0112. **No se pierde nada**: eran dos funciones de solo lectura. Información e
-- Informes vuelven a no tener de dónde leer las mesas.

drop function if exists estook.las_mesas_del_servicio(uuid, date, date);
drop function if exists estook.las_lineas_vendidas(uuid, date, date);
