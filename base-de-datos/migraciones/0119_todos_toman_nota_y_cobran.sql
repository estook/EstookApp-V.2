-- 0119 · Todos toman nota y cobran (el rediseño, decisión 0148; Richi, 17 y 18-nov).
--
-- «Ahora he entrado con un cocinero y me dice que no puede. Sí puede: pueden todos», y «sí, todos
-- pueden cobrar». Hasta hoy, en Roles 1.12, la cocina solo cocinaba: un cocinero tecleaba su PIN
-- en la caja y no veía la sala. En una pizzería pequeña el que está en el horno tica, cobra y
-- listo. Ahora lo trae su puesto, como el de la sala, **cada uno con su PIN**: lo que hace queda a
-- su nombre y, si falta dinero, se sabe quién cobró.
--
-- Es lo que trae el puesto: el gerente se lo puede quitar en su local, como cualquier permiso. Los
-- Ajustes del TPV no cambian: siguen siendo de quien los tenía.

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('cocinero',       'accion.tomar_nota', 'ver_y_editar'),
  ('jefe_de_cocina', 'accion.tomar_nota', 'ver_y_editar'),
  ('cocinero',       'accion.cobrar',     'ver_y_editar'),
  ('jefe_de_cocina', 'accion.cobrar',     'ver_y_editar');
