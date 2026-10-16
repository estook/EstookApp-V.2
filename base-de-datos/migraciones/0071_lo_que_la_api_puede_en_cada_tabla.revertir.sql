-- Deshace la 0071: vuelven el defecto de la 0006 y los cuatro permisos con los que
-- nacieron estas tablas, y apuntar un ejemplo vuelve a mirar solo que la tabla existe
-- (la función de la 0020, tal cual). No toca datos.

create or replace function estook.tabla_de_ejemplo_existe()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'estook'
       and table_name = new.tabla
       and column_name = 'id'
  ) then
    raise exception 'estook.% no existe o no tiene columna id, asi que no se podria borrar', new.tabla
      using errcode = '23514';
  end if;
  return new;
end;
$$;

alter default privileges in schema estook
  grant select, insert, update, delete on tables to estook_api;

grant select, insert, update, delete on
  estook.albaran, estook.alergeno, estook.canal, estook.canal_de_venta_del_local,
  estook.cifrado_usado, estook.clave_del_terminal, estook.confirmacion_del_mensaje,
  estook.correccion_de_fichaje, estook.cuando_suena, estook.existencias,
  estook.factura_de_compra, estook.fichaje, estook.identidad_externa,
  estook.invitacion_a_pedido, estook.justificacion, estook.lectura_del_canal,
  estook.linea_de_albaran, estook.linea_de_receta_de_referencia, estook.mensaje,
  estook.miembro_del_canal, estook.movimiento_que_cuenta, estook.nota_del_tablon,
  estook.nota_en_google, estook.nota_leida, estook.objetivo_de_partida, estook.pausa,
  estook.pedido_de_compra, estook.plato, estook.precio_pactado, estook.preferencia_de_aviso,
  estook.preferencias_de_persona, estook.producto_de_referencia, estook.reaccion_al_mensaje,
  estook.receta_de_referencia, estook.regla_fiscal, estook.semana_de_horario,
  estook.tema_al_segundo, estook.terminal, estook.turno_publicado, estook.uso_de_google,
  estook.categoria_de_partida, estook.categoria_de_producto, estook.concepto_de_caja,
  estook.dispositivo, estook.foto_de_merma, estook.inventario, estook.linea_de_inventario,
  estook.lote, estook.politica_de_catalogo, estook.precio_de_producto, estook.producto,
  estook.proveedor, estook.salida_de_lote, estook.traduccion
to estook_api;
