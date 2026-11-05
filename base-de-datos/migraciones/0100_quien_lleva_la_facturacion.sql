-- 0100 · T6 · 1 · Quién lleva la facturación (decisión 0128, pedido por Richi el 5-nov)
--
-- **La facturación es la cara del negocio ante Hacienda**: su NIF, su domicilio, quién firma.
-- Hasta aquí la veían la dirección, el administrador de cuenta y el gerente (0099, Roles 1.12).
-- Richi pidió que **solo la vea quien creó la cuenta**, y que él pueda dársela a otra persona.
-- Es lo que hacen los TPV y los programas de facturación grandes: lo fiscal es del propietario,
-- y él lo comparte con quien quiera, persona a persona.
--
--   1. De fábrica, **solo la dirección** (el propietario: quien crea la cuenta nace dirección,
--      0038). El gerente y el administrador de cuenta dejan de traerla puesta.
--   2. **La dirección se la da a quien quiera**, local a local, de entre quien manda en ese
--      local (administrador de cuenta, area manager, gerente o gestoría). Se guarda como un
--      recorte de permiso (0003), que es justo para lo que nació: «salvo que se le dé
--      expresamente». **Solo la dirección** toca ese recorte, lo diga la política que lo diga.
--   3. **La empresa de pruebas de Verifacti no se firma** (arreglo): es la de Verifacti, una
--      sociedad real que no es nuestra. Nadie puede firmar su autorización en su nombre.

-- ═══ 1 · De fábrica, solo la dirección ═════════════════════════════════════════

delete from estook.permiso_de_rol
 where permiso = 'accion.alta_de_facturacion'
   and rol in ('gerente', 'administrador_de_cuenta');

update estook.permiso
   set descripcion = 'Ver y llevar la facturación del local: su empresa, dónde tributa, sus series y cómo factura. De fábrica, solo la dirección; ella se la da a quien quiera (0100). La autorización ante Hacienda, solo su titular'
 where codigo = 'accion.alta_de_facturacion';

-- ═══ 2 · La dirección se la da a quien quiera ═════════════════════════════════

-- Si quien pregunta es dirección de la organización de ese local, con su membresía en vigor.
create function estook.es_la_direccion_del_local(p_local uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select exists (
    select 1
      from estook.membresia m
      join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
     where m.persona_id = estook.persona_actual()
       and m.rol = 'direccion'
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
  )
$$;

revoke all on function estook.es_la_direccion_del_local(uuid) from public;
grant execute on function estook.es_la_direccion_del_local(uuid) to estook_api;

-- A quién se le puede dar: quien manda en ese local. Ni la sala ni la cocina, y tampoco chef
-- corporativo, compras central ni RRHH, que no tienen nada que ver con Hacienda.
create function estook.rol_que_puede_llevar_la_facturacion(p_rol text)
returns boolean
language sql
immutable
as $$
  select p_rol in ('administrador_de_cuenta', 'area_manager', 'gerente', 'gestoria')
$$;

-- Quién la lleva en ese local, para la tarjeta «Quién la ve» de Ajustes › Facturación. **Solo
-- para la dirección**: los demás no saben ni a quién se le ha dado.
create function estook.quien_lleva_la_facturacion(p_local uuid)
returns table (
  persona_id  uuid,
  nombre      text,
  rol         text,
  siempre     boolean,
  la_lleva    boolean,
  es_titular  boolean
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_la_direccion_del_local(p_local) then
    raise exception 'solo_la_direccion' using errcode = 'P0001';
  end if;
  return query
    with en_el_local as (
      select m.persona_id, m.rol, r.amplitud
        from estook.membresia m
        join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
        join estook.rol r on r.codigo = m.rol
       where m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
         and (m.revocada_en is null or m.revocada_en > now())
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
         and (m.rol = 'direccion' or estook.rol_que_puede_llevar_la_facturacion(m.rol))
    ),
    su_rol as (
      select distinct on (e.persona_id) e.persona_id, e.rol
        from en_el_local e
       order by e.persona_id, e.amplitud desc
    )
    select p.id,
           btrim(p.nombre || ' ' || coalesce(p.apellidos, '')),
           s.rol,
           s.rol = 'direccion',
           estook.nivel_de_permiso(p.id, p_local, 'accion.alta_de_facturacion') = 'ver_y_editar',
           exists (
             select 1 from estook.empresa e join estook.local l on l.empresa_id = e.id
              where l.id = p_local and e.titular_id = p.id
           )
      from su_rol s
      join estook.persona p on p.id = s.persona_id
     where p.activa
     order by s.rol = 'direccion' desc, p.nombre, p.apellidos;
end;
$$;

revoke all on function estook.quien_lleva_la_facturacion(uuid) from public;
grant execute on function estook.quien_lleva_la_facturacion(uuid) to estook_api;

-- Darla o quitarla. **Solo la dirección**, y solo a quien puede llevarla en ese local. Al
-- **titular** no se le quita: es quien firma ante Hacienda; antes se cambia el titular (paso 1).
create function estook.dar_la_facturacion(p_local uuid, p_persona uuid, p_la_lleva boolean)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_membresia uuid;
begin
  if not estook.es_la_direccion_del_local(p_local) then
    raise exception 'solo_la_direccion' using errcode = 'P0001';
  end if;

  -- Su membresía en ese local con un rol que la puede llevar: la más amplia, si tiene varias.
  select m.id into la_membresia
    from estook.membresia m
    join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
    join estook.rol r on r.codigo = m.rol
    join estook.persona p on p.id = m.persona_id and p.activa
   where m.persona_id = p_persona
     and m.desde <= current_date
     and (m.hasta is null or m.hasta >= current_date)
     and (m.revocada_en is null or m.revocada_en > now())
     and (
       m.alcance = 'organizacion'
       or (m.alcance = 'area' and l.area_id = m.area_id)
       or (m.alcance = 'local' and l.id = m.local_id)
     )
     and estook.rol_que_puede_llevar_la_facturacion(m.rol)
   order by r.amplitud desc
   limit 1;
  if la_membresia is null then
    raise exception 'no_puede_llevarla' using errcode = 'P0001';
  end if;

  if p_la_lleva then
    insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
    values (la_membresia, p_local, 'accion.alta_de_facturacion', 'ver_y_editar',
            'Se la dio la dirección (0100)')
    on conflict (membresia_id, local_id, permiso)
      do update set nivel = 'ver_y_editar', motivo = excluded.motivo;
  else
    if exists (
      select 1 from estook.empresa e join estook.local l on l.empresa_id = e.id
       where l.id = p_local and e.titular_id = p_persona
    ) then
      raise exception 'es_el_titular' using errcode = 'P0001';
    end if;
    -- De todas sus membresías en ese local: que no quede ninguna puerta abierta.
    delete from estook.recorte_de_permiso rec
     using estook.membresia m
     where rec.membresia_id = m.id
       and m.persona_id = p_persona
       and rec.local_id = p_local
       and rec.permiso = 'accion.alta_de_facturacion';
  end if;

  perform estook.apuntar_lo_del_alta(
    p_local, case when p_la_lleva then 'dar' else 'quitar' end, 'quien_la_lleva', p_persona,
    jsonb_build_object('la_lleva', p_la_lleva)
  );
end;
$$;

revoke all on function estook.dar_la_facturacion(uuid, uuid, boolean) from public;
grant execute on function estook.dar_la_facturacion(uuid, uuid, boolean) to estook_api;

-- **Solo la dirección toca este recorte**, venga de donde venga la API. La política de los
-- recortes (0008) deja escribirlos a quien invita personas, y un gerente no puede darse a sí
-- mismo la facturación. Se mira a todo el que no sea la dueña de la tabla: la API y cualquier
-- papel que venga después. La dueña son las migraciones, las semillas y la función de arriba,
-- que ya mira que sea la dirección. **Quitarla no se vigila**: cerrar una puerta nunca da nada,
-- y así una membresía o un local que se borran se llevan su recorte como siempre (0003).
create function estook.recorte_de_la_facturacion_solo_la_direccion()
returns trigger
language plpgsql
as $$
begin
  if (new.permiso = 'accion.alta_de_facturacion'
        or (tg_op = 'UPDATE' and old.permiso = 'accion.alta_de_facturacion'))
     and current_user <> (
       select r.rolname from pg_class c join pg_roles r on r.oid = c.relowner
        where c.oid = 'estook.recorte_de_permiso'::regclass
     )
     and not estook.es_la_direccion_del_local(new.local_id) then
    raise exception 'solo_la_direccion' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger recorte_de_la_facturacion
  before insert or update on estook.recorte_de_permiso
  for each row execute function estook.recorte_de_la_facturacion_solo_la_direccion();

-- ═══ 3 · La empresa de pruebas no se firma ════════════════════════════════════

-- **La de 0099, entera, con una cosa más**: con la empresa de pruebas no se apunta nada. Es la
-- de Verifacti, y su autorización es cosa suya: Estook no la empieza, no la manda ni la cambia.
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
  if la_empresa.de_pruebas then
    raise exception 'empresa_de_pruebas' using errcode = 'P0001';
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

-- Lo que quedó apuntado en la de pruebas antes de este arreglo (el 5-nov, una firma rechazada
-- en IKATZ) se borra: no era nuestro. **Queda en la auditoría**, que solo crece.
update estook.empresa
   set autorizacion = 'sin_empezar', autorizacion_forma = null, autorizacion_firmante = null,
       autorizacion_por = null, autorizacion_empezada_en = null, autorizacion_caduca_en = null,
       autorizacion_error = null, cambiada_en = now()
 where de_pruebas and autorizacion <> 'correcta';
