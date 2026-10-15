-- Deshace la 0069: fuera las fichas, las elaboraciones y su historial, y el plato
-- vuelve a ser el de la 0068.
--
-- **Se pierden las recetas, las elaboraciones y todo su historial**, y lo que se
-- puso en la carta de unidades, alérgenos, picante y distintivos. Antes de revertir
-- en una base con datos de verdad, se copian.

delete from estook.permiso_de_rol
 where permiso = 'app.escandallos' and rol in ('camarero', 'jefe_de_sala');

drop table if exists estook.receta_guardada;
drop table if exists estook.linea_de_receta;
drop table if exists estook.receta;
drop table if exists estook.elaboracion;

drop trigger if exists plato_alergenos_conocidos on estook.plato;

alter table estook.plato
  drop constraint if exists plato_distintivos_conocidos,
  drop constraint if exists plato_picante_en_rango,
  drop constraint if exists plato_unidades_razonables,
  drop column if exists distintivos,
  drop column if exists picante,
  drop column if exists alergenos,
  drop column if exists unidades_por_racion;
