-- Deshace la 0138: fuera la función y la columna. Lo que ya se quitó no vuelve (cada uno lo activa otra vez).

drop function estook.quitar_el_doble_factor_exigido(uuid);

alter table estook.doble_factor drop column por_el_admin;
alter table estook.doble_factor drop column por_obligacion;
