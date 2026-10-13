-- Deshace la 0064: la persona vuelve a ser solo sus iniciales.
--
-- **Lo que se pierde:** qué foto tenía cada uno. Los ficheros se quedan en el cubo,
-- sin nadie que los nombre: se borran a mano si se quiere (`personas/` del cubo de
-- las fotos).

alter table estook.persona drop constraint if exists persona_foto_con_forma;
alter table estook.persona
  drop column if exists foto_puesta_en,
  drop column if exists foto_clave;
