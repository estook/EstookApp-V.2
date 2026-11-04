-- Deshace la 0099: el alta de facturación, su empresa fiscal, sus series y lo del admin.

drop function plataforma.los_locales_de_la_casa();
drop function plataforma.las_empresas();
drop function plataforma.la_empresa_para_real(uuid);
drop function plataforma.pasar_a_real(uuid);
drop function plataforma.poner_la_empresa_de_pruebas(uuid, text, text, text, text, text, text, text);
drop table plataforma.productor;
drop table plataforma.condicion_para_facturar;

drop function estook.poner_pide_tu_factura(uuid, boolean);
drop function estook.apuntar_la_autorizacion(uuid, text, boolean, text, text, timestamptz, text);
drop function estook.apuntar_el_alta_en_verifacti(uuid);
drop function facturacion.poner_las_series(uuid, text, text, text, boolean);
drop function estook.contestar_donde_tributa(uuid, boolean, text);
drop function estook.usar_la_empresa(uuid, uuid);
drop function estook.guardar_la_empresa(uuid, uuid, text, text, text, text, text, text, text, text, text, uuid, text, text);
drop function estook.apuntar_lo_del_alta(uuid, text, text, uuid, jsonb);
drop function estook.la_organizacion_del_alta(uuid);

drop table facturacion.serie;

drop index estook.local_por_empresa;
alter table estook.local
  drop column pide_tu_factura,
  drop column facturacion_otro_programa,
  drop column empresa_id;

drop table estook.empresa;
drop function estook.lleva_la_facturacion(uuid);

drop function facturacion.solo_se_inserta();
drop schema facturacion;

delete from estook.permiso_de_rol where permiso = 'accion.alta_de_facturacion';
delete from estook.permiso where codigo = 'accion.alta_de_facturacion';
