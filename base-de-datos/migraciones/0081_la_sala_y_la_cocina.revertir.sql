-- Deshace la 0081: se van el plano, las cuentas, sus pases y sus platos, y los tres
-- permisos de la sala y la cocina. Lo que pasó sigue en la auditoría.

drop function if exists estook.quien_lleva_el_servicio(uuid);

drop table if exists estook.linea_de_cuenta;
drop table if exists estook.pase;
drop table if exists estook.cuenta;
drop table if exists estook.mesa;
drop table if exists estook.zona_de_sala;

drop function if exists estook.lo_mandado_no_se_reescribe();
drop function if exists estook.el_pase_lo_marcha_la_sala();
drop function if exists estook.lleva_el_servicio(uuid);

delete from estook.permiso_de_rol
 where permiso in ('accion.tomar_nota', 'accion.cocinar', 'accion.quitar_de_cocina');
delete from estook.permiso
 where codigo in ('accion.tomar_nota', 'accion.cocinar', 'accion.quitar_de_cocina');
