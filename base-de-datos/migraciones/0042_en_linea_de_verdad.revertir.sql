-- Deshace la 0042: «en línea» vuelve a ser «tiene una sesión sin cerrar».
--
-- Antes de revertir, la API tiene que volver al código de antes: el de ahora llama a
-- estas dos funciones y a `sigo_aqui`, que escribe en las dos columnas.

drop function if exists estook.visto_por_ultima_vez(uuid);
drop function if exists estook.esta_en_linea(uuid);

alter table estook.sesion
  drop column if exists a_la_vista,
  drop column if exists visto_en;
