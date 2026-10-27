-- Deshace la 0093: se van las impresoras, la cola, dónde sale lo de la cocina y la barra,
-- «Pasar a la app» y el permiso del cajón. Las dos funciones vuelven a ser las de la 0083 y
-- la 0090, enteras.

-- ═══ «Pasar a la app» ══════════════════════════════════════════════════════════

drop function estook.codigo_vivo_por_huella(text, timestamptz);

create function estook.codigo_vivo_por_huella(p_huella text, p_ahora timestamptz)
returns table (
  codigo_id    uuid,
  local_id     uuid,
  organizacion_id uuid,
  funcion      text,
  nombre       text,
  persona_id   uuid,
  cajon_id     uuid,
  creado_por   uuid
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select c.id, c.local_id, l.organizacion_id, c.funcion, c.nombre, c.persona_id, c.cajon_id, c.creado_por
    from estook.codigo_para_vincular c
    join estook.local l on l.id = c.local_id and l.activo
   where c.huella = p_huella
     and c.usado_en is null
     and c.anulado_en is null
     -- La hora la dice la API, la misma con la que se sacó (regla 10).
     and c.caduca_en > p_ahora
   order by c.creado_en desc
   limit 1
$$;

comment on function estook.codigo_vivo_por_huella(text, timestamptz) is
  'Puerta mínima de vincular (Anexo 11.3): el código vivo con esa huella, sin caducar ni usar. Solo la ejecuta estook_api.';

revoke all on function estook.codigo_vivo_por_huella(text, timestamptz) from public;
grant execute on function estook.codigo_vivo_por_huella(text, timestamptz) to estook_api;

alter table estook.codigo_para_vincular drop column pasa_terminal_id;

-- ═══ La caja, la cola y las impresoras ═════════════════════════════════════════

drop function estook.apuntar_como_esta_la_impresora(uuid, uuid, text, timestamptz);
drop function estook.apuntar_lo_impreso(uuid, uuid, boolean, boolean, text, timestamptz);
drop function estook.la_cola_de_la_caja(uuid, timestamptz);
drop function estook.es_una_caja_viva(uuid);

drop table estook.trabajo_de_impresion;
drop table estook.impresora;

-- ═══ Dónde sale lo de la cocina y lo de la barra ═══════════════════════════════

drop function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint, smallint, smallint, boolean, text, text);

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

alter table estook.local
  drop constraint local_donde_sale,
  drop column barra_sale_en,
  drop column cocina_sale_en;

-- ═══ El permiso del cajón ══════════════════════════════════════════════════════

delete from estook.permiso_de_rol where permiso = 'accion.abrir_el_cajon';
delete from estook.permiso where codigo = 'accion.abrir_el_cajon';
