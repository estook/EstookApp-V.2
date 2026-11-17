-- Deshace la 0118: vuelve el permiso de la app Cuaderno, con lo que traía cada rol en la 0004.
--
-- **Lo que se pierde:** los recortes por local de ese permiso, si había alguno. No los guardaba
-- nadie (la app no tenía nada construido), y por eso no se vuelven a poner.

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('app.cuaderno', 'Cuaderno', 'app', 'local', 'Incidencias, notas y equipos del local');

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('camarero',       'app.cuaderno', 'ver_y_editar'),
  ('cocinero',       'app.cuaderno', 'ver_y_editar'),
  ('jefe_de_sala',   'app.cuaderno', 'ver_y_editar'),
  ('jefe_de_cocina', 'app.cuaderno', 'ver_y_editar'),
  ('gerente',        'app.cuaderno', 'ver_y_editar'),
  ('area_manager',   'app.cuaderno', 'ver_y_editar'),
  ('direccion',      'app.cuaderno', 'ver_y_editar');
