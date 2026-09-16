-- Deshace la 0039: el segundo factor pierde su límite de intentos.
--
-- No borra nada de nadie: son dos contadores. El arreglo del despachador, que es
-- el que hace que se guarden los intentos de la contraseña y del PIN, no vive en
-- la base y no se deshace aquí.

alter table estook.doble_factor
  drop constraint if exists doble_factor_intentos_no_negativos,
  drop column if exists bloqueado_hasta,
  drop column if exists intentos_fallidos;
