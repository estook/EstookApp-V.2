-- Deshace la 0100: la facturación vuelve a la dirección, el administrador de cuenta y el gerente,
-- y la autorización vuelve a ser la de la 0099. Los recortes dados se quitan.

drop trigger recorte_de_la_facturacion on estook.recorte_de_permiso;
drop function estook.recorte_de_la_facturacion_solo_la_direccion();

delete from estook.recorte_de_permiso where permiso = 'accion.alta_de_facturacion';

drop function estook.dar_la_facturacion(uuid, uuid, boolean);
drop function estook.quien_lleva_la_facturacion(uuid);
drop function estook.rol_que_puede_llevar_la_facturacion(text);
drop function estook.es_la_direccion_del_local(uuid);

update estook.permiso
   set descripcion = 'Dar de alta la facturación del local: su empresa, dónde tributa y sus series. La autorización ante Hacienda, solo su titular'
 where codigo = 'accion.alta_de_facturacion';

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('gerente',                 'accion.alta_de_facturacion', 'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.alta_de_facturacion', 'ver_y_editar');

-- La de 0099, entera.
create or replace function estook.apuntar_la_autorizacion(
  p_local      uuid,
  p_estado     text,
  p_empieza    boolean,
  p_forma      text,
  p_firmante   text,
  p_caduca_en  timestamptz,
  p_error      text
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_empresa estook.empresa;
begin
  perform estook.la_organizacion_del_alta(p_local);
  select e.* into la_empresa
    from estook.empresa e join estook.local l on l.empresa_id = e.id
   where l.id = p_local
   for update of e;
  if la_empresa.id is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  if p_empieza and la_empresa.titular_id is distinct from estook.persona_actual() then
    raise exception 'solo_el_titular' using errcode = 'P0001';
  end if;

  update estook.empresa
     set autorizacion = p_estado,
         autorizacion_forma = case when p_empieza then p_forma else autorizacion_forma end,
         autorizacion_firmante = case when p_empieza then p_firmante else autorizacion_firmante end,
         autorizacion_por = case when p_empieza then estook.persona_actual() else autorizacion_por end,
         autorizacion_empezada_en = case when p_empieza then now() else autorizacion_empezada_en end,
         autorizacion_caduca_en = case
           when p_estado = 'pendiente' then coalesce(p_caduca_en, autorizacion_caduca_en)
           else null end,
         autorizacion_correcta_en = case
           when p_estado = 'correcta' then coalesce(autorizacion_correcta_en, now())
           else null end,
         autorizacion_error = case when p_estado = 'rechazada' then p_error else null end,
         autorizacion_mirada_en = now(),
         cambiada_en = now()
   where id = la_empresa.id;
  if p_empieza or p_estado is distinct from la_empresa.autorizacion then
    perform estook.apuntar_lo_del_alta(
      p_local, case when p_empieza then 'empezar' else 'cambiar' end, 'autorizacion', la_empresa.id,
      jsonb_build_object('estado', p_estado, 'forma', p_forma, 'firmante', p_firmante)
    );
  end if;
end;
$$;
