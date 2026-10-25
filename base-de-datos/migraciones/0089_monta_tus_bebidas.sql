-- 0089 · T3 · 2 · 2 · «Monta tus bebidas» (decisión 0114; 0106, puntos 6 y 19 a 23)
--
-- Las bebidas se montan con lo que ya hay: el plato en la carta, su escandallo «tal cual»
-- (la caña: 200 ml del barril) o con su receta (el café con leche), y los grupos de
-- opciones de la 0088 (el «¿Con qué?» de las copas). Lo único nuevo son **las dosis de la
-- casa**, que cada local cambia una vez (Richi, 25-oct: «sí» a 50 ml y 150 ml).

alter table estook.local
  add column dosis_de_la_copa_ml   smallint not null default 50,
  add column copa_de_vino_ml       smallint not null default 150,
  add constraint local_dosis_razonables
    check (dosis_de_la_copa_ml between 10 and 500 and copa_de_vino_ml between 10 and 500);

comment on column estook.local.dosis_de_la_copa_ml is
  'Lo que lleva una copa de su botella, la dosis de la casa (0106: 50 ml). Una botella puede llevar la suya.';
comment on column estook.local.copa_de_vino_ml is
  'Lo que lleva una copa de vino (0106: 150 ml).';

-- ═══ Lo del TPV que vive en el local, con su permiso ════════════════════════════

-- Cómo se montó la botonera (0086) y las dosis viven en `local`, cuya ficha solo cambia quien
-- tiene los Ajustes de Estook (`local_edicion`). Quien tiene **los Ajustes del TPV** y no esos
-- montaba la botonera y no se guardaba nada, sin un aviso. Esta función cambia **solo eso**, y
-- solo a quien tiene los Ajustes del TPV en ese local. Nulo: lo deja como estaba.
create function estook.cambiar_lo_del_tpv_del_local(
  p_local             uuid,
  p_camino            text     default null,
  p_camino_si_no_hay  text     default null,
  p_entra_solo        boolean  default null,
  p_dosis_ml          smallint default null,
  p_copa_de_vino_ml   smallint default null
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
         copa_de_vino_ml = coalesce(p_copa_de_vino_ml, copa_de_vino_ml)
   where id = p_local;
end;
$$;

comment on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint) is
  'Cambia del local solo lo del TPV (cómo se montó la botonera, si lo nuevo entra solo, las dosis), a quien tiene los Ajustes del TPV (0114).';

revoke all on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint) from public;
grant execute on function estook.cambiar_lo_del_tpv_del_local(uuid, text, text, boolean, smallint, smallint) to estook_api;
