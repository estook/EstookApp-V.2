-- 0098 · Los PIN y Aparatos (T5 · 2 · 2 · 2, decisión 0124; maquetas de T5 · 2 y de la caja de
-- centro, aprobadas el 29 y el 31-oct)
--
-- **Sin internet, la caja comprueba el PIN de cualquiera del local** (Anexo 3.4): un Android que
-- llega a la caja entra con el PIN de quien sea, y en la caja se ficha. Para eso la caja guarda,
-- cifradas con la cuenta de Windows, **las huellas de los PIN de su local** (las mismas que
-- guarda Estook: PBKDF2 con la sal del local, nunca el PIN). Solo se las da a una caja que ya
-- hace de centro (ha dicho dónde escucha): una caja abierta en un navegador no las recibe.
--
-- **Y Aparatos dice quién llega a la caja**: cada aparato dice en su latido qué es (Android,
-- iPhone…) y cómo llega a la caja (llega, va con datos, le falta el permiso de Chrome…), y la
-- caja, si va por wifi o por cable.

alter table estook.terminal
  add column sistema text,
  add column camino_al_centro text,
  add column centro_por text,
  add constraint terminal_sistema_conocido check (
    sistema is null or sistema in ('android', 'ios', 'windows', 'otro')
  ),
  add constraint terminal_camino_al_centro_conocido check (
    camino_al_centro is null
    or camino_al_centro in ('llega', 'no_llega', 'con_datos', 'sin_permiso', 'bloqueado', 'guarda_lo_suyo')
  ),
  add constraint terminal_centro_por_conocido check (
    centro_por is null or centro_por in ('wifi', 'cable')
  );

comment on column estook.terminal.sistema is
  'Qué es el aparato, según su latido (0124): android, ios, windows u otro. Para «Android · comandero» en Aparatos.';
comment on column estook.terminal.camino_al_centro is
  'Cómo llega este aparato a la caja de centro, según su último latido (0124): llega, no_llega, con_datos, sin_permiso (Chrome aún no lo dio), bloqueado (alguien tocó «Bloquear») o guarda_lo_suyo (un iPhone o un iPad).';
comment on column estook.terminal.centro_por is
  'Solo la caja de centro (0124): si va por wifi o por cable al router, según su último latido.';

-- **Los PIN del local, para la caja de centro**: de cada persona activa con PIN en ese local, su
-- huella, hasta cuándo está parado su PIN y si está fichada (desde cuándo está dentro o en la
-- pausa: los fichajes no se ven sin ser su dueño). Solo para una caja viva que ya hace de centro.
create function estook.los_pin_del_centro(p_terminal uuid)
returns table (
  persona_id       uuid,
  nombre           text,
  apellidos        text,
  huella           text,
  bloqueado_hasta  timestamptz,
  dentro_desde     timestamptz,
  pausa_desde      timestamptz
)
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
#variable_conflict use_column
begin
  if not exists (
    select 1 from estook.terminal t
     where t.id = p_terminal and t.funcion = 'caja' and t.retirado_en is null
       and t.centro_en is not null
  ) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  return query
  select p.id, p.nombre, p.apellidos, n.huella, n.bloqueado_hasta,
         (select max(f.entro_en) from estook.fichaje f
           where f.persona_id = p.id and f.salio_en is null),
         (select max(pa.empezo_en) from estook.pausa pa
           where pa.persona_id = p.id and pa.acabo_en is null)
    from estook.terminal t
    join estook.pin n on n.local_id = t.local_id
    join estook.persona p on p.id = n.persona_id and p.activa
   where t.id = p_terminal
   order by p.nombre, p.id;
end;
$$;

comment on function estook.los_pin_del_centro(uuid) is
  'Las huellas de los PIN del local de esa caja, para comprobarlos sin internet (0124). Solo para una caja que hace de centro; solo la ejecuta estook_api, después de mirar la llave.';

revoke all on function estook.los_pin_del_centro(uuid) from public;
grant execute on function estook.los_pin_del_centro(uuid) to estook_api;
