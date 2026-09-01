-- Reversion de 0010 · Quien usa Fogon, y quien lleva los cuadrantes

delete from estook.permiso_de_rol
 where permiso = 'app.fogon'
   and rol in ('camarero', 'cocinero', 'jefe_de_sala', 'rrhh');

update estook.permiso
   set descripcion = 'El asistente. Propone, nunca decide'
 where codigo = 'app.fogon';

update estook.permiso
   set descripcion = 'El cuadrante entero del local. Sin esto, cada uno ve solo su turno'
 where codigo = 'dato.cuadrante_completo';
