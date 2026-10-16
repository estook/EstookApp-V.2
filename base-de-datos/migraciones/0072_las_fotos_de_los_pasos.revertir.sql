-- Deshace la 0072: los pasos se quedan sin foto. Los ficheros del almacén no se tocan
-- desde aquí; sin la columna que los nombra, nadie los enseña.

alter table estook.receta drop column fotos_de_los_pasos;
