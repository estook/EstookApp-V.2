-- Reversion de 0021 · El catalogo de referencia
--
-- Solo son datos: las tablas las crea y las quita la 0020. Se borra en orden,
-- primero las lineas y luego lo que cuelga de ellas.

delete from estook.linea_de_receta_de_referencia;
delete from estook.receta_de_referencia;
delete from estook.producto_de_referencia;
