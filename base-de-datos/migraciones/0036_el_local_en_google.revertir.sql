-- Deshace la 0036: se va el contador y la ficha de Google del local.
--
-- La posición del local (latitud y longitud) **no se toca**: es de la 0027, y un
-- fichaje de mañana la sigue necesitando venga de donde venga.

drop table if exists estook.uso_de_google;

alter table estook.local
  drop constraint if exists local_posicion_de_valida,
  drop constraint if exists local_valoracion_valida,
  drop constraint if exists local_resenas_no_negativas,
  drop constraint if exists local_horario_es_una_lista,
  drop column if exists google_id,
  drop column if exists google_nombre,
  drop column if exists google_direccion,
  drop column if exists google_telefono,
  drop column if exists google_web,
  drop column if exists google_mapa,
  drop column if exists google_valoracion,
  drop column if exists google_resenas,
  drop column if exists google_horario,
  drop column if exists google_leido_en,
  drop column if exists posicion_de;
