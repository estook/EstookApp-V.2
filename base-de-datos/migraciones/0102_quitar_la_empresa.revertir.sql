-- Deshace la 0102: las tres funciones vuelven a ser las de la 0099, y sin «quitar».

drop function plataforma.quitar_la_empresa_de_pruebas(uuid);
drop function estook.quitar_la_empresa(uuid);

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
begin
  if p_titular is null
     or estook.nivel_de_permiso(p_titular, p_local, 'accion.alta_de_facturacion') <> 'ver_y_editar' then
    raise exception 'titular_sin_permiso' using errcode = 'P0001';
  end if;

  if p_empresa is null then
    if exists (select 1 from estook.empresa e where e.nif = p_nif and not e.de_pruebas) then
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
     where e.id = p_empresa and e.organizacion_id = la_organizacion
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
    p_local, case when p_empresa is null then 'crear' else 'modificar' end, 'empresa', la_empresa,
    jsonb_build_object('nif', p_nif, 'nombre', btrim(p_nombre), 'titular', p_titular)
  );
  return la_empresa;
end;
$$;

create or replace function estook.usar_la_empresa(p_local uuid, p_empresa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_organizacion uuid := estook.la_organizacion_del_alta(p_local);
begin
  if not exists (
    select 1 from estook.empresa e where e.id = p_empresa and e.organizacion_id = la_organizacion
  ) then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  update estook.local set empresa_id = p_empresa where id = p_local;
  perform estook.apuntar_lo_del_alta(p_local, 'elegir', 'empresa', p_empresa, null);
end;
$$;

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
     where e.id = p_empresa and not e.de_pruebas
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

drop index estook.empresa_nif_unico;
alter table estook.empresa drop column quitada_por, drop column quitada_en;
create unique index empresa_nif_unico on estook.empresa (nif) where not de_pruebas;
