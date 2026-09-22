-- Deshace la 0040: el local deja de saber cuándo es llegar tarde.
--
-- No borra nada de nadie: es un número por local. Los fichajes y los horarios no
-- se tocan, y los retrasos se vuelven a contar igual en cuanto vuelva la columna.

alter table estook.local
  drop constraint if exists local_margen_de_retraso_con_sentido,
  drop column if exists margen_de_retraso_minutos;
