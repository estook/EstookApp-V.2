-- Deshace la 0045: el producto deja de saber cuál es su foto.
--
-- Los ficheros del almacén **no se tocan desde aquí**: viven en el esquema
-- `storage`, que no es de estas migraciones. Se quedan en su cubo sin nadie que los
-- nombre, y volver a aplicar la 0045 no los recupera: habría que volver a subirlos.

alter table estook.producto
  drop constraint if exists producto_foto_entera,
  drop column if exists foto_clave,
  drop column if exists miniatura_clave,
  drop column if exists foto_puesta_en;
