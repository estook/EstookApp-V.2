-- Deshace la 0041: el jefe de cocina vuelve a no ver las ventas.
--
-- Solo quita lo que da el rol. Los recortes que un gerente haya puesto a mano, local
-- a local, son suyos y se quedan.

delete from estook.permiso_de_rol
 where rol = 'jefe_de_cocina'
   and permiso = 'dato.ventas';
