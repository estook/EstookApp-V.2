-- Deshace la 0119: la cocina vuelve a solo cocinar, como en la 0081 y la 0116.
--
-- **Lo que se pierde:** nada guardado. Lo que un cocinero pidió o cobró sigue a su nombre; solo deja
-- de poder hacerlo desde ahora.

delete from estook.permiso_de_rol
 where rol in ('cocinero', 'jefe_de_cocina')
   and permiso in ('accion.tomar_nota', 'accion.cobrar');
