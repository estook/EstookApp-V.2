-- 0090 · T4 · 1 · La cocina (decisión 0116; Anexo 3.2 y 3.4; maquetas de T4, 2.ª versión)
--
-- **La pantalla de cocina no tiene operador** (Anexo 3.4): se vincula una vez y se queda
-- encendida, sin PIN. Hasta aquí, todo lo de la sala y la cocina lo leía y lo escribía una
-- persona con su permiso. Ahora la base reconoce también **la pantalla de cocina del local**,
-- comprobada por la API con su llave, **con el permiso de cocinar y ningún otro**: ve las
-- mesas sin un euro, tacha y destacha, y llama al camarero. No marcha, no quita, no cobra.
--
-- Y lo que la sala le dice a la cocina: **«Tienen prisa»** y **«la cocina te llama»**, en la
-- cuenta; y **los minutos del semáforo y el sonido**, en el local.

-- ═══ Lo que la sala y la cocina se dicen ═══════════════════════════════════════

alter table estook.cuenta
  add column con_prisa        boolean      not null default false,
  add column cocina_llama_en  timestamptz;

comment on column estook.cuenta.con_prisa is
  '«Tienen prisa» (Anexo 3.2): la sala lo marca y la tarjeta sube en cocina con su franja.';
comment on column estook.cuenta.cocina_llama_en is
  '«Llamar al camarero» desde la pantalla de cocina (0116); vuelve a nulo con «Ya voy».';

alter table estook.local
  add column cocina_aviso_min  smallint  not null default 10,
  add column cocina_tarde_min  smallint  not null default 20,
  add column cocina_suena      boolean   not null default true,
  add constraint local_minutos_de_cocina check (
    cocina_aviso_min between 1 and 120
    and cocina_tarde_min between 2 and 180
    and cocina_tarde_min > cocina_aviso_min
  );

comment on column estook.local.cocina_aviso_min is
  'A los cuántos minutos un pase se pone en ámbar en cocina (Anexo 3.2; 10 de fábrica).';
comment on column estook.local.cocina_tarde_min is
  'Y a los cuántos va tarde, en rojo (20 de fábrica).';
comment on column estook.local.cocina_suena is
  'Si la pantalla de cocina suena al entrar una mesa, al marchar y al anular.';

-- ═══ La pantalla del local ═════════════════════════════════════════════════════

-- Como `persona_actual`: la API la declara en la transacción, **solo después de comprobar
-- la llave del aparato**, y solo cuando no hay ninguna persona.
create function estook.pantalla_actual()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('estook.pantalla_id', true), '')::uuid
$$;

comment on function estook.pantalla_actual() is
  'La pantalla de cocina o de barra declarada en esta conexión (0116). Vacío si no hay.';

-- Si la conexión es la pantalla de cocina o de barra de ese local, viva. Mira el aparato
-- aunque quien pregunta no pueda leer los aparatos: por eso es security definer.
create function estook.es_la_pantalla_del_local(p_local uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select estook.persona_actual() is null
     and exists (
       select 1 from estook.terminal t
        where t.id = estook.pantalla_actual()
          and t.local_id = p_local
          and t.retirado_en is null
          and t.funcion in ('cocina', 'barra')
     )
$$;

comment on function estook.es_la_pantalla_del_local(uuid) is
  'Si la conexión es la pantalla de cocina o de barra viva de ese local (0116): puede cocinar, y nada más.';

revoke all on function estook.es_la_pantalla_del_local(uuid) from public;
grant execute on function estook.es_la_pantalla_del_local(uuid) to estook_api;

-- **Las dos de 0005, enteras, con una cosa más**: la pantalla del local puede cocinar. Solo
-- ese permiso: para todo lo demás no es nadie.
create or replace function estook.puede_ver(p_permiso text, p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.nivel_de_permiso(estook.persona_actual(), p_local, p_permiso) <> 'sin_acceso'
      or (p_permiso = 'accion.cocinar'
          and estook.pantalla_actual() is not null
          and estook.es_la_pantalla_del_local(p_local))
$$;

create or replace function estook.puede_editar(p_permiso text, p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.nivel_de_permiso(estook.persona_actual(), p_local, p_permiso) = 'ver_y_editar'
      or (p_permiso = 'accion.cocinar'
          and estook.pantalla_actual() is not null
          and estook.es_la_pantalla_del_local(p_local))
$$;

-- Las mesas de su local, para leer «Mesa 6»: las mesas se leen por los locales que ve una
-- persona (0081), y la pantalla no es una persona. Solo leerlas.
create policy mesa_la_lee_su_pantalla on estook.mesa
  for select using (estook.pantalla_actual() is not null and estook.es_la_pantalla_del_local(local_id));

-- Lo que hace queda en el rastro (tachar, destachar, llamar), como lo de cualquiera: puede
-- apuntar **solo en su local y su organización**.
create function estook.la_pantalla_apunta_en(p_organizacion uuid, p_local uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select estook.es_la_pantalla_del_local(p_local)
     and exists (select 1 from estook.local l where l.id = p_local and l.organizacion_id = p_organizacion)
$$;

comment on function estook.la_pantalla_apunta_en(uuid, uuid) is
  'Si la pantalla de cocina de la conexión puede apuntar en el rastro de ese local y esa organización (0116).';

revoke all on function estook.la_pantalla_apunta_en(uuid, uuid) from public;
grant execute on function estook.la_pantalla_apunta_en(uuid, uuid) to estook_api;

create policy auditoria_la_anade_su_pantalla on estook.auditoria
  for insert with check (
    estook.pantalla_actual() is not null
    and local_id is not null
    and estook.la_pantalla_apunta_en(organizacion_id, local_id)
  );
-- `anotar` devuelve lo que apunta, y devolverlo pide poder leerlo: **solo lo de esta misma
-- petición**, sin persona. El rastro del local no lo lee (podría llevar importes).
create policy auditoria_la_lee_su_pantalla_al_apuntar on estook.auditoria
  for select using (
    estook.pantalla_actual() is not null
    and persona_id is null
    and correlacion_id = nullif(current_setting('estook.correlacion_id', true), '')::uuid
    and estook.la_pantalla_apunta_en(organizacion_id, local_id)
  );

-- El nombre de quien lleva cada mesa, para «Llamar a Lucía»: la pantalla no lee personas.
-- Solo el nombre de pila de quien toma nota en ese local, y solo para su pantalla.
create function estook.los_nombres_de_la_sala(p_local uuid)
returns table (persona_id uuid, nombre text)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id, p.nombre
    from estook.persona p
   where estook.es_la_pantalla_del_local(p_local)
     and exists (
       select 1
         from estook.membresia m
         join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
        where m.persona_id = p.id and (m.hasta is null or m.hasta >= current_date)
     )
     and estook.nivel_de_permiso(p.id, p_local, 'accion.tomar_nota') <> 'sin_acceso'
$$;

comment on function estook.los_nombres_de_la_sala(uuid) is
  'El nombre de pila de quien lleva el servicio de un local, solo para su pantalla de cocina (0116).';

revoke all on function estook.los_nombres_de_la_sala(uuid) from public;
grant execute on function estook.los_nombres_de_la_sala(uuid) to estook_api;

-- Lo de la cocina del local: cuándo empieza el día (para «Acabados») y los minutos y el
-- sonido. Para su pantalla, que no lee el local, y para quien lo ve.
create function estook.la_cocina_del_local(p_local uuid)
returns table (
  zona_horaria  text,
  hora_de_corte text,
  aviso_min     smallint,
  tarde_min     smallint,
  suena         boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select l.zona_horaria, to_char(l.hora_de_corte, 'HH24:MI'), l.cocina_aviso_min,
         l.cocina_tarde_min, l.cocina_suena
    from estook.local l
   where l.id = p_local
     and (estook.es_la_pantalla_del_local(p_local)
          or p_local in (select local_id from estook.locales_visibles()))
$$;

comment on function estook.la_cocina_del_local(uuid) is
  'Cuándo empieza el día y los minutos y el sonido de la cocina de un local, para su pantalla y para quien lo ve (0116).';

revoke all on function estook.la_cocina_del_local(uuid) from public;
grant execute on function estook.la_cocina_del_local(uuid) to estook_api;

-- ═══ Lo que la base no deja, también a la pantalla ═════════════════════════════
--
-- Las reglas de 0081 y 0083, enteras, que solo miraban **cuando hay una persona**: ahora
-- también cuando es la pantalla. Así la pantalla, aunque alguien se salte la API, **no
-- marcha** (es de la sala) **ni quita** lo que está en cocina.

create or replace function estook.el_pase_lo_marcha_la_sala()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
begin
  if (estook.persona_actual() is not null or estook.pantalla_actual() is not null)
     and new.marchado_en is distinct from old.marchado_en
     and not estook.puede_editar('accion.tomar_nota', new.local_id) then
    raise exception 'sin_permiso: marchar es de la sala, nunca de la cocina'
      using errcode = '42501';
  end if;
  if old.marchado_en is not null and new.marchado_en is null then
    raise exception 'pase_marchado: un pase marchado no se desmarcha'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function estook.lo_mandado_no_se_reescribe()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
declare
  v_persona uuid := estook.persona_actual();
  -- Una persona o la pantalla del local: alguien que sirve, no una migración (0116).
  v_alguien boolean := estook.persona_actual() is not null or estook.pantalla_actual() is not null;
begin
  -- Lo quitado se queda como se quitó.
  if old.quitada_en is not null
     and (new.quitada_en, new.quitada_por, new.motivo_de_quitar, new.salio_en, new.nota, new.cantidad)
         is distinct from
         (old.quitada_en, old.quitada_por, old.motivo_de_quitar, old.salio_en, old.nota, old.cantidad) then
    raise exception 'linea_quitada: un plato quitado ya no se cambia'
      using errcode = 'P0001';
  end if;

  if old.mandada_en is not null then
    -- Lo que es, cuántos, a qué precio y a dónde va no cambia una vez en cocina.
    if (new.plato_id, new.menu_id, new.parte_de, new.nombre, new.cantidad, new.precio_centimos,
        new.destino, new.mandada_en)
       is distinct from
       (old.plato_id, old.menu_id, old.parte_de, old.nombre, old.cantidad, old.precio_centimos,
        old.destino, old.mandada_en) then
      raise exception 'linea_mandada: lo que ya está en cocina no se reescribe; se quita con motivo y se pide otra vez'
        using errcode = 'P0001';
    end if;
    -- Quitar lo que está en cocina pide motivo y el permiso de quitarlo, o la
    -- aprobación de quien lo tiene (0107).
    if old.quitada_en is null and new.quitada_en is not null then
      if new.motivo_de_quitar is null then
        raise exception 'falta_motivo: quitar lo que ya está en cocina pide un motivo'
          using errcode = 'P0001';
      end if;
      if v_alguien
         and not estook.puede_editar('accion.quitar_de_cocina', new.local_id)
         and not exists (
           select 1
             from estook.aprobacion a
            where a.id = new.aprobacion_id
              and a.local_id = new.local_id
              and a.operacion = 'quitar_de_cocina'
              and a.sobre in (new.id, new.parte_de)
              and a.pedida_por = v_persona
              and a.creada_en > now() - interval '2 minutes'
              and estook.nivel_de_permiso(a.aprobada_por, a.local_id, 'accion.quitar_de_cocina') = 'ver_y_editar'
         ) then
        raise exception 'sin_permiso: quitar lo que ya está en cocina lo aprueba un jefe'
          using errcode = '42501';
      end if;
    end if;
  elsif new.mandada_en is null
        and (new.salio_en is not null or new.vuelve_en is not null) then
    raise exception 'linea_sin_mandar: no se tacha lo que no ha llegado a cocina'
      using errcode = 'P0001';
  end if;

  -- Tachar y destachar es de la cocina. La sala solo lo destacha al devolverlo («VUELVE»).
  if v_alguien
     and new.salio_en is distinct from old.salio_en
     and not estook.puede_editar('accion.cocinar', new.local_id)
     and not (
       new.salio_en is null
       and new.vuelve_en is distinct from old.vuelve_en
       and estook.puede_editar('accion.tomar_nota', new.local_id)
     ) then
    raise exception 'sin_permiso: tachar lo que sale es de la cocina'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ═══ Lo del TPV que vive en el local, con los minutos y el sonido ══════════════
--
-- La de la 0089, entera, con tres cosas más. Nulo: lo deja como estaba.

drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint);

create function estook.cambiar_lo_del_tpv_del_local(
  p_local             uuid,
  p_camino            text     default null,
  p_camino_si_no_hay  text     default null,
  p_entra_solo        boolean  default null,
  p_dosis_ml          smallint default null,
  p_copa_de_vino_ml   smallint default null,
  p_aviso_min         smallint default null,
  p_tarde_min         smallint default null,
  p_suena             boolean  default null
)
returns void
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if not estook.puede_editar('accion.ajustes_del_tpv', p_local) then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  update estook.local
     set botonera_camino = coalesce(p_camino, botonera_camino, p_camino_si_no_hay),
         botonera_entra_solo = coalesce(p_entra_solo, botonera_entra_solo),
         dosis_de_la_copa_ml = coalesce(p_dosis_ml, dosis_de_la_copa_ml),
         copa_de_vino_ml = coalesce(p_copa_de_vino_ml, copa_de_vino_ml),
         cocina_aviso_min = coalesce(p_aviso_min, cocina_aviso_min),
         cocina_tarde_min = coalesce(p_tarde_min, cocina_tarde_min),
         cocina_suena = coalesce(p_suena, cocina_suena)
   where id = p_local;
end;
$$;

comment on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean) is
  'Cambia del local solo lo del TPV (la botonera, lo que entra solo, las dosis, los minutos y el sonido de la cocina), a quien tiene los Ajustes del TPV (0114, 0116).';

revoke all on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean) from public;
grant execute on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean) to estook_api;
