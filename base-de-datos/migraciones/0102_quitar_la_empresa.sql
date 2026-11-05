-- 0102 · T6 · 1 · Quitar la empresa de un local (decisión 0129, pedido por Richi el 5-nov)
--
-- «Que se puedan quitar, por si me equivoco y pongo otra.» **Mientras se está en pruebas, la
-- empresa de un local se puede quitar**: el local se queda sin empresa y el alta vuelve al paso 1.
-- No se borra nada: lo fiscal solo crece (0126) y la auditoría se queda con todo.
--
--   · **En real no se quita.** Con tickets de verdad, la empresa es la que los firmó; cambiar de
--     empresa en real (un traspaso) es otra cosa y llega cuando toque.
--   · Si **ningún otro local la usa**, la empresa queda **quitada**: deja libre su NIF, para que
--     se pueda dar de alta bien (en esta cuenta o en otra). Si otro local la usa, solo se suelta.
--   · **Volver a ponerla la recupera**: escribir el mismo NIF en el paso 1, o elegirla en «Ya
--     tienes una empresa», devuelve la de antes con su alta en Verifacti y su autorización.
--   · **La empresa de pruebas se quita igual**, y también desde el admin, que es quien la pone.
--     Ella no queda quitada: es la de la cuenta, y ponerla otra vez la vuelve a usar.
--   · **En Verifacti no se toca nada**: su NIF se queda en la cuenta (nunca se borra, Anexo 4.2).

-- ═══ La empresa quitada ════════════════════════════════════════════════════════

alter table estook.empresa
  add column quitada_en   timestamptz,
  add column quitada_por  uuid  references estook.persona (id);

comment on column estook.empresa.quitada_en is
  'Cuándo se quitó del último local que la usaba, en pruebas (0129). Deja libre su NIF; ponerla otra vez la recupera.';

-- Un NIF, una empresa en todo Estook (0126), **contando solo las que no se han quitado**.
drop index estook.empresa_nif_unico;
create unique index empresa_nif_unico on estook.empresa (nif) where not de_pruebas and quitada_en is null;

-- ═══ Quitarla del local ════════════════════════════════════════════════════════

create function estook.quitar_la_empresa(p_local uuid)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_organizacion uuid := estook.la_organizacion_del_alta(p_local);
  la_empresa      estook.empresa;
begin
  select e.* into la_empresa
    from estook.empresa e join estook.local l on l.empresa_id = e.id
   where l.id = p_local and l.organizacion_id = la_organizacion
   for update of e;
  if la_empresa.id is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  if la_empresa.entorno = 'real' then
    raise exception 'empresa_en_real' using errcode = 'P0001';
  end if;

  update estook.local set empresa_id = null where id = p_local;
  if not la_empresa.de_pruebas
     and not exists (select 1 from estook.local l where l.empresa_id = la_empresa.id) then
    update estook.empresa
       set quitada_en = now(), quitada_por = estook.persona_actual(), cambiada_en = now()
     where id = la_empresa.id;
  end if;
  perform estook.apuntar_lo_del_alta(
    p_local, 'quitar', 'empresa', la_empresa.id,
    jsonb_build_object('nif', la_empresa.nif, 'de_pruebas', la_empresa.de_pruebas)
  );
end;
$$;

revoke all on function estook.quitar_la_empresa(uuid) from public;
grant execute on function estook.quitar_la_empresa(uuid) to estook_api;

-- La empresa de pruebas, quitada desde el admin, que es quien la pone (0099). Solo el admin total.
create function plataforma.quitar_la_empresa_de_pruebas(p_local uuid)
returns void
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  la_empresa uuid;
begin
  if plataforma.nivel_de(estook.persona_actual()) is distinct from 'total' then
    raise exception 'solo_admin_total' using errcode = 'P0001';
  end if;
  select e.id into la_empresa
    from estook.empresa e join estook.local l on l.empresa_id = e.id
   where l.id = p_local and e.de_pruebas;
  if la_empresa is null then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  update estook.local set empresa_id = null where id = p_local;
  perform estook.apuntar_lo_del_alta(p_local, 'quitar_de_pruebas', 'empresa', la_empresa, null);
end;
$$;

revoke all on function plataforma.quitar_la_empresa_de_pruebas(uuid) from public;
grant execute on function plataforma.quitar_la_empresa_de_pruebas(uuid) to estook_api;

-- ═══ Ponerla otra vez la recupera ══════════════════════════════════════════════

-- **La de 0099, entera, con dos cosas más**: una empresa nueva con el NIF de una quitada de esta
-- misma cuenta **la recupera** (con su alta en Verifacti y su autorización), y una quitada no
-- cuenta para «ese NIF ya es de otra empresa».
create or replace function estook.guardar_la_empresa(
  p_local                 uuid,
  p_empresa               uuid,
  p_nif                   text,
  p_nombre                text,
  p_nombre_comercial      text,
  p_persona               text,
  p_calle                 text,
  p_numero                text,
  p_codigo_postal         text,
  p_municipio             text,
  p_provincia             text,
  p_titular               uuid,
  p_representante_nombre  text,
  p_representante_nif     text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_organizacion uuid := estook.la_organizacion_del_alta(p_local);
  la_empresa      uuid;
  la_de_antes     estook.empresa;
  la_quitada      uuid;
  recuperada      boolean := false;
begin
  if p_titular is null
     or estook.nivel_de_permiso(p_titular, p_local, 'accion.alta_de_facturacion') <> 'ver_y_editar' then
    raise exception 'titular_sin_permiso' using errcode = 'P0001';
  end if;

  -- La quitada de esta cuenta con ese NIF vuelve: es la misma empresa (0129).
  if p_empresa is null then
    select e.id into la_quitada from estook.empresa e
     where e.organizacion_id = la_organizacion and e.nif = p_nif
       and not e.de_pruebas and e.quitada_en is not null
     order by e.quitada_en desc
     limit 1;
    if la_quitada is not null then
      if exists (
        select 1 from estook.empresa e
         where e.nif = p_nif and not e.de_pruebas and e.quitada_en is null
      ) then
        raise exception 'nif_de_otra_empresa' using errcode = 'P0001';
      end if;
      update estook.empresa set quitada_en = null, quitada_por = null where id = la_quitada;
      p_empresa := la_quitada;
      recuperada := true;
    end if;
  end if;

  if p_empresa is null then
    if exists (
      select 1 from estook.empresa e where e.nif = p_nif and not e.de_pruebas and e.quitada_en is null
    ) then
      raise exception 'nif_de_otra_empresa' using errcode = 'P0001';
    end if;
    insert into estook.empresa (
      organizacion_id, nif, nombre, nombre_comercial, persona, calle, numero, codigo_postal,
      municipio, provincia, comprobada_en, titular_id, representante_nombre, representante_nif,
      creada_por
    ) values (
      la_organizacion, p_nif, btrim(p_nombre), nullif(btrim(coalesce(p_nombre_comercial, '')), ''),
      p_persona, btrim(p_calle), btrim(p_numero), p_codigo_postal, btrim(p_municipio),
      btrim(p_provincia), now(), p_titular, nullif(btrim(coalesce(p_representante_nombre, '')), ''),
      nullif(btrim(coalesce(p_representante_nif, '')), ''), estook.persona_actual()
    )
    returning id into la_empresa;
  else
    select * into la_de_antes from estook.empresa e
     where e.id = p_empresa and e.organizacion_id = la_organizacion and e.quitada_en is null
     for update;
    if la_de_antes.id is null then
      raise exception 'no_existe' using errcode = 'P0001';
    end if;
    if la_de_antes.de_pruebas then
      raise exception 'empresa_de_pruebas' using errcode = 'P0001';
    end if;
    if la_de_antes.nif <> p_nif and la_de_antes.en_verifacti_en is not null then
      raise exception 'nif_no_se_cambia' using errcode = 'P0001';
    end if;
    update estook.empresa
       set nif = p_nif, nombre = btrim(p_nombre),
           nombre_comercial = nullif(btrim(coalesce(p_nombre_comercial, '')), ''),
           persona = p_persona, calle = btrim(p_calle), numero = btrim(p_numero),
           codigo_postal = p_codigo_postal, municipio = btrim(p_municipio),
           provincia = btrim(p_provincia), comprobada_en = now(), titular_id = p_titular,
           representante_nombre = nullif(btrim(coalesce(p_representante_nombre, '')), ''),
           representante_nif = nullif(btrim(coalesce(p_representante_nif, '')), ''),
           -- Otro domicilio puede ser otra hacienda: el paso 2 se vuelve a contestar.
           foral = case when codigo_postal = p_codigo_postal then foral else null end,
           cambiada_en = now()
     where id = p_empresa;
    la_empresa := p_empresa;
  end if;

  update estook.local set empresa_id = la_empresa where id = p_local;
  perform estook.apuntar_lo_del_alta(
    p_local,
    case when recuperada then 'recuperar' when p_empresa is null then 'crear' else 'modificar' end,
    'empresa', la_empresa,
    jsonb_build_object('nif', p_nif, 'nombre', btrim(p_nombre), 'titular', p_titular)
  );
  return la_empresa;
end;
$$;

-- **La de 0099, entera, con dos cosas más**: elegir una quitada de esta cuenta la recupera (si su
-- NIF no lo ha cogido nadie entretanto), y la de pruebas no se elige aquí: la pone el admin.
create or replace function estook.usar_la_empresa(p_local uuid, p_empresa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_organizacion uuid := estook.la_organizacion_del_alta(p_local);
  la_empresa      estook.empresa;
begin
  select e.* into la_empresa from estook.empresa e
   where e.id = p_empresa and e.organizacion_id = la_organizacion
   for update;
  if la_empresa.id is null then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if la_empresa.de_pruebas then
    raise exception 'empresa_de_pruebas' using errcode = 'P0001';
  end if;
  if la_empresa.quitada_en is not null then
    if exists (
      select 1 from estook.empresa e
       where e.nif = la_empresa.nif and not e.de_pruebas and e.quitada_en is null
    ) then
      raise exception 'nif_de_otra_empresa' using errcode = 'P0001';
    end if;
    update estook.empresa set quitada_en = null, quitada_por = null where id = p_empresa;
  end if;
  update estook.local set empresa_id = p_empresa where id = p_local;
  perform estook.apuntar_lo_del_alta(p_local, 'elegir', 'empresa', p_empresa, null);
end;
$$;

-- **La de 0099, entera, con una cosa más**: una empresa quitada no pasa a real.
create or replace function plataforma.pasar_a_real(p_empresa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
begin
  if plataforma.nivel_de(estook.persona_actual()) is distinct from 'total' then
    raise exception 'solo_admin_total' using errcode = 'P0001';
  end if;
  if exists (select 1 from plataforma.condicion_para_facturar c where c.cumplida_en is null) then
    raise exception 'faltan_condiciones' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from estook.empresa e
     where e.id = p_empresa and not e.de_pruebas and e.quitada_en is null
       and (e.modalidad = 'fuera_sii'
            or (e.modalidad = 'verifactu' and e.autorizacion = 'correcta'
                and e.en_verifacti_en is not null))
  ) then
    raise exception 'empresa_sin_terminar' using errcode = 'P0001';
  end if;
  update estook.empresa
     set entorno = 'real', real_desde = now(), real_por = estook.persona_actual(), cambiada_en = now()
   where id = p_empresa and entorno = 'pruebas';
end;
$$;
