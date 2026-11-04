-- 0099 · T6 · 1 · El alta de facturación (decisión 0126; maquetas de T6 aprobadas el 2-nov con
-- las tres respuestas de Richi, 0125)
--
-- **Antes de emitir un solo ticket, el local tiene que estar dado de alta** (Anexo 4.3): su
-- empresa fiscal con el NIF comprobado en Hacienda (0060), dónde tributa, sus series, el alta
-- del NIF en Verifacti y la autorización ante Hacienda, que solo da el titular. Esta migración
-- guarda todo eso; emitir llega con T6 · 2.
--
-- **Todo en pruebas** hasta las once condiciones del Anexo, capítulo 9: la empresa nace en
-- pruebas, y «Pasar a real» es del admin y no se deja hacer mientras falte una (abajo).
--
-- **La clave de cada NIF no se guarda aquí** (0126): la pide el servidor a Verifacti con la
-- clave de la cuenta, que vive en los secretos de Supabase. Así no hay nada que llevarse de la
-- base, y rotarla en Verifacti no deja nada viejo en ningún sitio.

-- ═══ El permiso ════════════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.alta_de_facturacion', 'Alta de facturación', 'accion', 'local',
   'Dar de alta la facturación del local: su empresa, dónde tributa y sus series. La autorización ante Hacienda, solo su titular');

-- Roles 1.12: «Alta de facturación y series», el gerente, la dirección y el administrador de
-- cuenta. Ni el jefe de sala ni el area manager: es la cara del negocio ante Hacienda.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('gerente',                 'accion.alta_de_facturacion', 'ver_y_editar'),
  ('direccion',               'accion.alta_de_facturacion', 'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.alta_de_facturacion', 'ver_y_editar');

-- ═══ El esquema fiscal ═════════════════════════════════════════════════════════

create schema facturacion;

comment on schema facturacion is
  'Lo fiscal (Anexo 2 y 7.6): solo inserción. Ningún rol lo escribe a mano: lo hacen sus funciones.';

revoke all on schema facturacion from public;
grant usage on schema facturacion to estook_api;

-- Lo que no se cambia ni se borra, ni por quien manda: el disparador lo rechaza para todos,
-- también para el rol de servicio (Anexo 2, regla 3).
create function facturacion.solo_se_inserta()
returns trigger
language plpgsql
as $$
begin
  raise exception 'En % solo se inserta: lo fiscal no se cambia ni se borra (Anexo 2)', tg_table_name
    using errcode = 'P0001';
end;
$$;

-- ═══ La empresa fiscal (0060) ══════════════════════════════════════════════════

create table estook.empresa (
  id                         uuid         primary key default gen_random_uuid(),
  organizacion_id            uuid         not null references estook.organizacion (id),
  nif                        text         not null,
  -- Como la tiene Hacienda: el nombre del NIF (Verifacti admite 120).
  nombre                     text         not null,
  nombre_comercial           text,
  persona                    text         not null,
  calle                      text         not null,
  numero                     text         not null,
  codigo_postal              text         not null,
  municipio                  text         not null,
  provincia                  text         not null,
  -- Nulos hasta contestarlos en el paso 2.
  en_sii                     boolean,
  foral                      text,
  -- La empresa de pruebas de Verifacti, que elige el admin para una cuenta de la casa (0125).
  de_pruebas                 boolean      not null default false,
  comprobada_en              timestamptz  not null,
  -- Quién la autoriza ante Hacienda en Estook: una persona que puede hacer el alta (Roles 1.12).
  titular_id                 uuid         references estook.persona (id),
  representante_nombre       text,
  representante_nif          text,
  -- Cómo factura (0127): con VERI*FACTU (la recomendada), sin envío (la modalidad «NO
  -- VERI*FACTU», que llega con T6 · 3) o fuera, por el SII. Desde cuándo, y quién la eligió.
  modalidad                  text         not null default 'verifactu',
  modalidad_desde            timestamptz  not null default now(),
  modalidad_por              uuid         references estook.persona (id),
  -- «Pasar a real» lo hace el admin, con las once condiciones (abajo).
  entorno                    text         not null default 'pruebas',
  real_desde                 timestamptz,
  real_por                   uuid         references estook.persona (id),
  en_verifacti_en            timestamptz,
  autorizacion               text         not null default 'sin_empezar',
  autorizacion_forma         text,
  autorizacion_firmante      text,
  autorizacion_por           uuid         references estook.persona (id),
  autorizacion_empezada_en   timestamptz,
  autorizacion_caduca_en     timestamptz,
  autorizacion_correcta_en   timestamptz,
  autorizacion_error         text,
  autorizacion_mirada_en     timestamptz,
  creada_por                 uuid         references estook.persona (id),
  creada_en                  timestamptz  not null default now(),
  cambiada_en                timestamptz  not null default now(),
  constraint empresa_nif_con_forma check (nif ~ '^[0-9A-Z][0-9]{7}[0-9A-Z]$'),
  constraint empresa_nombre_cabe check (length(btrim(nombre)) between 1 and 120),
  constraint empresa_persona_conocida check (persona in ('fisica', 'juridica')),
  constraint empresa_codigo_postal_con_forma check (codigo_postal ~ '^[0-9]{5}$'),
  constraint empresa_domicilio_entero check (
    length(btrim(calle)) > 0 and length(btrim(numero)) > 0
    and length(btrim(municipio)) > 0 and length(btrim(provincia)) > 0
  ),
  constraint empresa_foral_conocida check (
    foral is null or foral in ('no', 'alava', 'gipuzkoa', 'bizkaia', 'navarra')
  ),
  constraint empresa_entorno_conocido check (entorno in ('pruebas', 'real')),
  constraint empresa_modalidad_conocida check (modalidad in ('verifactu', 'sin_envio', 'fuera_sii')),
  -- Fuera de VERI*FACTU va solo quien lleva el SII, y quien lo lleva va fuera (RD 1007/2023).
  constraint empresa_fuera_solo_con_el_sii check ((modalidad = 'fuera_sii') = (en_sii is true)),
  constraint empresa_real_con_quien check (
    (entorno = 'pruebas' and real_desde is null) or (entorno = 'real' and real_desde is not null)
  ),
  constraint empresa_de_pruebas_no_pasa_a_real check (not (de_pruebas and entorno = 'real')),
  constraint empresa_autorizacion_conocida check (
    autorizacion in ('sin_empezar', 'pendiente', 'correcta', 'rechazada', 'caducada', 'cancelada')
  ),
  constraint empresa_forma_conocida check (
    autorizacion_forma is null or autorizacion_forma in ('en_linea', 'con_certificado')
  )
);

comment on table estook.empresa is
  'La empresa fiscal (0060): el obligado tributario de sus locales. Su NIF comprobado en Hacienda, dónde tributa, su alta en Verifacti y su autorización ante Hacienda (0126).';
comment on column estook.empresa.foral is
  'Si el domicilio fiscal es foral, y cuál: no, alava, gipuzkoa, bizkaia o navarra. Nulo sin contestar (Anexo 1.4).';
comment on column estook.empresa.de_pruebas is
  'La empresa de pruebas de Verifacti, que elige el admin para una cuenta de la casa (0125): sin alta del NIF ni firma, que ya vienen hechas.';
comment on column estook.empresa.modalidad is
  'Cómo factura (0127): verifactu (cada registro a Hacienda al momento, la recomendada), sin_envio (la modalidad NO VERI*FACTU: registros firmados y guardados, a Hacienda si los pide; llega con T6 · 3) o fuera_sii (empresas en el SII, fuera del reglamento).';
comment on column estook.empresa.titular_id is
  'Quién da la autorización ante Hacienda desde Estook: el titular o su representante legal (Roles 1.12). Nadie más la empieza.';

-- Un NIF es una empresa: dos cuentas no pueden ser el mismo obligado. La de pruebas es
-- compartida (la de Verifacti) y por eso no cuenta.
create unique index empresa_nif_unico on estook.empresa (nif) where not de_pruebas;
-- Una sola empresa de pruebas por organización.
create unique index empresa_de_pruebas_una on estook.empresa (organizacion_id) where de_pruebas;
create index empresa_por_organizacion on estook.empresa (organizacion_id);

-- Si alguien lleva la facturación de algún local de una organización: quien ve y cambia su
-- empresa (0060 y Roles 1.12). Con privilegio porque mira todos los locales de esa organización.
create function estook.lleva_la_facturacion(p_organizacion uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select exists (
    select 1 from estook.local l
     where l.organizacion_id = p_organizacion
       and estook.puede_editar('accion.alta_de_facturacion', l.id)
  )
$$;

revoke all on function estook.lleva_la_facturacion(uuid) from public;
grant execute on function estook.lleva_la_facturacion(uuid) to estook_api;

alter table estook.empresa enable row level security;

create policy empresa_la_ve_quien_la_lleva on estook.empresa
  for select using (estook.lleva_la_facturacion(organizacion_id));

-- Se escribe solo con las funciones de abajo, que miran el permiso y el paso. **Hay que quitarlo
-- a mano**: en `estook` cada tabla nueva nace con escritura para la API (0006, privilegios por
-- defecto), y sin política no pasaría, pero una política nueva mal escrita lo abriría.
revoke all on estook.empresa from public;
revoke insert, update, delete, truncate on estook.empresa from estook_api;
grant select on estook.empresa to estook_api;

-- ═══ Lo del local ══════════════════════════════════════════════════════════════

alter table estook.local
  add column empresa_id                 uuid     references estook.empresa (id),
  add column facturacion_otro_programa  boolean,
  add column pide_tu_factura            boolean  not null default true;

comment on column estook.local.empresa_id is
  'La empresa fiscal de este local (0060): la que sale en sus tickets. Se elige en el alta de facturación.';
comment on column estook.local.facturacion_otro_programa is
  'Si el local ya hace facturas con otro programa (Anexo 4.3): para que sus series no choquen. Nulo sin contestar.';
comment on column estook.local.pide_tu_factura is
  '«Pide tu factura» (0125): el QR del ticket con el que el cliente pide su factura él solo. Encendido de fábrica; el QR sale con T7.';

create index local_por_empresa on estook.local (empresa_id) where empresa_id is not null;

-- ═══ Las series (Anexo 4.4) ════════════════════════════════════════════════════

-- Una fila por cada vez que se ponen. La de ahora es la última de su local y su tipo; el año y
-- el número se ponen al emitir (T6 · 2), y pruebas y real numeran aparte (0125).
create table facturacion.serie (
  id          uuid         primary key default gen_random_uuid(),
  local_id    uuid         not null references estook.local (id),
  empresa_id  uuid         not null references estook.empresa (id),
  tipo        text         not null,
  prefijo     text         not null,
  puesta_en   timestamptz  not null default now(),
  puesta_por  uuid         references estook.persona (id),
  constraint serie_tipo_conocido check (tipo in ('ticket', 'factura', 'rectificativa')),
  -- Con «-2026-» y seis cifras, como mucho 32 caracteres: nunca los 60 de Hacienda.
  constraint serie_prefijo_con_forma check (
    prefijo ~ '^[A-Z0-9]([A-Z0-9-]{0,18}[A-Z0-9])?$' and position('--' in prefijo) = 0
  )
);

comment on table facturacion.serie is
  'Las series de cada local (Anexo 4.4): la de ahora es la última de su tipo. Solo se inserta (0126).';

create index serie_de_ahora on facturacion.serie (local_id, tipo, puesta_en desc);

create trigger serie_solo_se_inserta
  before update or delete on facturacion.serie
  for each row execute function facturacion.solo_se_inserta();
create trigger serie_no_se_vacia
  before truncate on facturacion.serie
  for each statement execute function facturacion.solo_se_inserta();

alter table facturacion.serie enable row level security;

create policy serie_la_ve_quien_ve_el_local on facturacion.serie
  for select using (local_id in (select local_id from estook.locales_visibles(estook.persona_actual())));

revoke all on facturacion.serie from public;
grant select on facturacion.serie to estook_api;

-- ═══ Lo que hace el alta, paso a paso ══════════════════════════════════════════
--
-- Cada paso, una función: mira el permiso en ese local y lo que pide el paso. **El servidor
-- llama a Hacienda y a Verifacti antes**, fuera de la base; esto guarda lo que salió.

create function estook.la_organizacion_del_alta(p_local uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_organizacion uuid;
begin
  if not estook.puede_editar('accion.alta_de_facturacion', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select l.organizacion_id into la_organizacion from estook.local l where l.id = p_local;
  if la_organizacion is null then
    raise exception 'local_ajeno' using errcode = 'P0001';
  end if;
  return la_organizacion;
end;
$$;

revoke all on function estook.la_organizacion_del_alta(uuid) from public;
grant execute on function estook.la_organizacion_del_alta(uuid) to estook_api;

-- Cada paso deja su rastro en la auditoría, que solo crece (0006): quién, qué y cuándo. Es lo que
-- se pregunta cuando algo no cuadra con Hacienda. **Sin privilegio propio**: solo la llaman las
-- funciones del alta, que ya lo tienen; la API no la puede llamar para apuntar lo que quiera.
create function estook.apuntar_lo_del_alta(
  p_local      uuid,
  p_accion     text,
  p_entidad    text,
  p_entidad_id uuid,
  p_despues    jsonb
)
returns void
language sql
volatile
set search_path = estook, pg_catalog, pg_temp
as $$
  insert into estook.auditoria (
    organizacion_id, local_id, persona_id, correlacion_id, accion, entidad, entidad_id, despues
  )
  select l.organizacion_id, l.id, nullif(estook.persona_actual()::text, '')::uuid,
         nullif(current_setting('estook.correlacion_id', true), '')::uuid,
         p_accion, p_entidad, p_entidad_id::text, p_despues
    from estook.local l
   where l.id = p_local
$$;

revoke all on function estook.apuntar_lo_del_alta(uuid, text, text, uuid, jsonb) from public;

-- Paso 1 · la empresa. Nueva (p_empresa nulo) o la del local, cambiada. **El NIF de una empresa
-- ya dada de alta en Verifacti no se cambia**: es otra empresa (0060).
create function estook.guardar_la_empresa(
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

revoke all on function estook.guardar_la_empresa(uuid, uuid, text, text, text, text, text, text, text, text, text, uuid, text, text) from public;
grant execute on function estook.guardar_la_empresa(uuid, uuid, text, text, text, text, text, text, text, text, text, uuid, text, text) to estook_api;

-- Paso 1, si la empresa ya existe: el segundo local la elige y no escribe nada (Anexo 4.3).
-- Cambiar de empresa deja sin series al local: las suyas eran de la otra.
create function estook.usar_la_empresa(p_local uuid, p_empresa uuid)
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

revoke all on function estook.usar_la_empresa(uuid, uuid) from public;
grant execute on function estook.usar_la_empresa(uuid, uuid) to estook_api;

-- Paso 2 · dónde tributa la empresa: el SII y si su domicilio fiscal es foral. El territorio no
-- se pregunta: es el del local (Anexo 1.4).
create function estook.contestar_donde_tributa(p_local uuid, p_en_sii boolean, p_foral text)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_empresa uuid;
begin
  perform estook.la_organizacion_del_alta(p_local);
  select l.empresa_id into la_empresa from estook.local l where l.id = p_local;
  if la_empresa is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  -- Con el SII, fuera de VERI*FACTU; sin él, la que tenía (o VERI*FACTU si venía de fuera).
  update estook.empresa
     set en_sii = p_en_sii, foral = p_foral,
         modalidad = case
           when p_en_sii then 'fuera_sii'
           when modalidad = 'fuera_sii' then 'verifactu'
           else modalidad end,
         modalidad_desde = case
           when (p_en_sii and modalidad <> 'fuera_sii') or (not p_en_sii and modalidad = 'fuera_sii')
             then now() else modalidad_desde end,
         modalidad_por = case
           when (p_en_sii and modalidad <> 'fuera_sii') or (not p_en_sii and modalidad = 'fuera_sii')
             then estook.persona_actual() else modalidad_por end,
         cambiada_en = now()
   where id = la_empresa and not de_pruebas;
  perform estook.apuntar_lo_del_alta(
    p_local, 'contestar', 'empresa', la_empresa,
    jsonb_build_object('en_sii', p_en_sii, 'foral', p_foral)
  );
end;
$$;

revoke all on function estook.contestar_donde_tributa(uuid, boolean, text) from public;
grant execute on function estook.contestar_donde_tributa(uuid, boolean, text) to estook_api;

-- Cómo factura (0127), entre VERI*FACTU y sin envío; fuera, solo con el SII (paso 2). **Sin envío
-- todavía no se puede elegir**: Verifacti no la hace y la construye Estook (T6 · 3). Y quien
-- factura **de verdad** con VERI*FACTU se queda en ella hasta el fin del año natural (AEAT).
create function estook.elegir_la_modalidad(p_local uuid, p_modalidad text)
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
  if p_modalidad not in ('verifactu', 'sin_envio') or la_empresa.modalidad = 'fuera_sii' then
    raise exception 'fuera_solo_con_el_sii' using errcode = 'P0001';
  end if;
  if p_modalidad = 'sin_envio' then
    raise exception 'sin_envio_todavia_no' using errcode = 'P0001';
  end if;
  if la_empresa.modalidad = p_modalidad then
    return;
  end if;
  update estook.empresa
     set modalidad = p_modalidad, modalidad_desde = now(), modalidad_por = estook.persona_actual(),
         cambiada_en = now()
   where id = la_empresa.id;
  perform estook.apuntar_lo_del_alta(
    p_local, 'elegir', 'modalidad', la_empresa.id,
    jsonb_build_object('de', la_empresa.modalidad, 'a', p_modalidad)
  );
end;
$$;

revoke all on function estook.elegir_la_modalidad(uuid, text) from public;
grant execute on function estook.elegir_la_modalidad(uuid, text) to estook_api;

-- Paso 3 · las series. **Sin chocar**: los tres prefijos distintos, y ninguno en uso por otro
-- local de la misma empresa, que numera en la misma cadena (Anexo 4.1). Solo se apunta lo que
-- cambia.
create function facturacion.poner_las_series(
  p_local          uuid,
  p_ticket         text,
  p_factura        text,
  p_rectificativa  text,
  p_otro_programa  boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  la_empresa uuid;
  el_tipo    text;
  el_prefijo text;
begin
  perform estook.la_organizacion_del_alta(p_local);
  select l.empresa_id into la_empresa from estook.local l where l.id = p_local;
  if la_empresa is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  if p_ticket = p_factura or p_ticket = p_rectificativa or p_factura = p_rectificativa then
    raise exception 'series_repetidas' using errcode = 'P0001';
  end if;

  foreach el_tipo in array array['ticket', 'factura', 'rectificativa'] loop
    el_prefijo := case el_tipo
      when 'ticket' then p_ticket
      when 'factura' then p_factura
      else p_rectificativa
    end;
    if exists (
      select 1 from (
        select distinct on (s.local_id, s.tipo) s.local_id, s.prefijo, s.empresa_id
          from facturacion.serie s
         order by s.local_id, s.tipo, s.puesta_en desc
      ) ahora
       where ahora.empresa_id = la_empresa and ahora.local_id <> p_local
         and ahora.prefijo = el_prefijo
    ) then
      raise exception 'serie_de_otro_local' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from (
        select s.prefijo, s.empresa_id from facturacion.serie s
         where s.local_id = p_local and s.tipo = el_tipo
         order by s.puesta_en desc limit 1
      ) la_de_ahora
       where la_de_ahora.prefijo = el_prefijo and la_de_ahora.empresa_id = la_empresa
    ) then
      insert into facturacion.serie (local_id, empresa_id, tipo, prefijo, puesta_por)
      values (p_local, la_empresa, el_tipo, el_prefijo, estook.persona_actual());
    end if;
  end loop;

  update estook.local set facturacion_otro_programa = p_otro_programa where id = p_local;
  perform estook.apuntar_lo_del_alta(
    p_local, 'poner', 'serie', la_empresa,
    jsonb_build_object('ticket', p_ticket, 'factura', p_factura, 'rectificativa', p_rectificativa,
                       'otro_programa', p_otro_programa)
  );
end;
$$;

revoke all on function facturacion.poner_las_series(uuid, text, text, text, boolean) from public;
grant execute on function facturacion.poner_las_series(uuid, text, text, text, boolean) to estook_api;

-- Paso 4 · el alta del NIF en Verifacti, ya hecha por el servidor.
create function estook.apuntar_el_alta_en_verifacti(p_local uuid)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  perform estook.la_organizacion_del_alta(p_local);
  update estook.empresa e
     set en_verifacti_en = coalesce(e.en_verifacti_en, now()), cambiada_en = now()
    from estook.local l
   where l.id = p_local and e.id = l.empresa_id;
  perform estook.apuntar_lo_del_alta(p_local, 'dar_de_alta', 'verifacti', null, null);
end;
$$;

revoke all on function estook.apuntar_el_alta_en_verifacti(uuid) from public;
grant execute on function estook.apuntar_el_alta_en_verifacti(uuid) to estook_api;

-- Paso 5 · la autorización ante Hacienda: lo que dijo Verifacti. **Empezarla (p_empieza) solo
-- la puede su titular**, aunque otro tenga el permiso del alta (Roles 1.12).
create function estook.apuntar_la_autorizacion(
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

revoke all on function estook.apuntar_la_autorizacion(uuid, text, boolean, text, text, timestamptz, text) from public;
grant execute on function estook.apuntar_la_autorizacion(uuid, text, boolean, text, text, timestamptz, text) to estook_api;

-- «Pide tu factura», encendido o apagado en el local (0125).
create function estook.poner_pide_tu_factura(p_local uuid, p_encendido boolean)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  perform estook.la_organizacion_del_alta(p_local);
  update estook.local set pide_tu_factura = p_encendido where id = p_local;
  perform estook.apuntar_lo_del_alta(
    p_local, 'cambiar', 'pide_tu_factura', null, jsonb_build_object('encendido', p_encendido)
  );
end;
$$;

revoke all on function estook.poner_pide_tu_factura(uuid, boolean) from public;
grant execute on function estook.poner_pide_tu_factura(uuid, boolean) to estook_api;

-- ═══ Lo del admin: las once condiciones, la empresa de pruebas y pasar a real ═══

-- Las once condiciones del Anexo, capítulo 9. **Hasta que estén todas, nada pasa a real.** Las
-- marca el admin total, con una nota de dónde está la prueba.
create table plataforma.condicion_para_facturar (
  numero       integer      primary key,
  texto        text         not null,
  cumplida_en  timestamptz,
  cumplida_por uuid         references estook.persona (id),
  nota         text,
  constraint condicion_del_uno_al_once check (numero between 1 and 11),
  constraint condicion_cumplida_con_quien check ((cumplida_en is null) = (cumplida_por is null))
);

comment on table plataforma.condicion_para_facturar is
  'Las once condiciones del Anexo, capítulo 9 (0126): sin todas, ninguna empresa pasa a real.';

insert into plataforma.condicion_para_facturar (numero, texto) values
  (1,  'Todas las pruebas del capítulo 8 y de los apartados 3.7 y 10.12, en verde'),
  (2,  'Todos los [VERIFICAR] resueltos y escritos en ESTADO.md, con su fuente y su fecha'),
  (3,  'La declaración responsable de Estook, redactada por el asesor y publicada en la app'),
  (4,  'La revisión escrita del asesor fiscal sobre el planteamiento entero'),
  (5,  'La suscripción de pago con Verifacti, con el NIF de producción dado de alta y su representación firmada'),
  (6,  'El procedimiento de baja escrito, con la exportación de los XML antes de cancelar nada'),
  (7,  'La vía de impresión decidida y probada con impresoras reales'),
  (8,  'Supabase de pago con recuperación a un punto en el tiempo'),
  (9,  'El contrato de encargado del tratamiento aceptado por el cliente, y la tabla de conservación en vigor'),
  (10, 'El soporte en horario de servicio funcionando, y el latido de cada terminal a la vista de soporte'),
  (11, 'La publicación en Cloudflare Pages, con el repositorio privado');

alter table plataforma.condicion_para_facturar enable row level security;

create policy condicion_la_lee_el_admin on plataforma.condicion_para_facturar
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);
create policy condicion_la_marca_el_admin_total on plataforma.condicion_para_facturar
  for update using (plataforma.nivel_de(estook.persona_actual()) = 'total')
  with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

revoke all on plataforma.condicion_para_facturar from public;
grant select, update (cumplida_en, cumplida_por, nota) on plataforma.condicion_para_facturar to estook_api;

-- Quién hace Estook, para su declaración responsable (Orden HAC/1177/2024, art. 15). **Sus datos
-- no van en el código**, que es público: los escribe el admin. Sin firmar, sale como borrador.
create table plataforma.productor (
  unica          boolean      primary key default true,
  nombre         text,
  nif            text,
  direccion      text,
  lugar          text,
  firmada_el     date,
  texto_del_asesor text,
  cambiado_en    timestamptz  not null default now(),
  cambiado_por   uuid         references estook.persona (id),
  constraint productor_una_sola check (unica)
);

comment on table plataforma.productor is
  'Quién produce Estook, para su declaración responsable (0126): nombre, NIF, dirección y, al firmarla, fecha y lugar. Sin el texto del asesor y la firma, es un borrador.';

insert into plataforma.productor (unica) values (true);

alter table plataforma.productor enable row level security;

-- La lee cualquiera que use el programa: la declaración tiene que estar a mano de todos (Orden
-- HAC/1177/2024, art. 15). La cambia solo el admin total.
create policy productor_lo_lee_cualquiera on plataforma.productor for select using (true);
create policy productor_lo_cambia_el_admin_total on plataforma.productor
  for update using (plataforma.nivel_de(estook.persona_actual()) = 'total')
  with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

revoke all on plataforma.productor from public;
grant select, update on plataforma.productor to estook_api;

-- La empresa de pruebas de Verifacti en una cuenta de la casa (0125, respuesta 3). Con lo que
-- dice Verifacti de ella: su alta y su autorización ya están hechas.
create function plataforma.poner_la_empresa_de_pruebas(
  p_local          uuid,
  p_nif            text,
  p_nombre         text,
  p_calle          text,
  p_codigo_postal  text,
  p_municipio      text,
  p_provincia      text,
  p_autorizacion   text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
declare
  la_organizacion uuid;
  la_empresa      uuid;
begin
  if plataforma.nivel_de(estook.persona_actual()) is distinct from 'total' then
    raise exception 'solo_admin_total' using errcode = 'P0001';
  end if;
  select l.organizacion_id into la_organizacion from estook.local l where l.id = p_local;
  if la_organizacion is null then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from estook.suscripcion s where s.organizacion_id = la_organizacion and s.de_la_casa
  ) then
    raise exception 'no_es_de_la_casa' using errcode = 'P0001';
  end if;

  select e.id into la_empresa from estook.empresa e
   where e.organizacion_id = la_organizacion and e.de_pruebas;
  if la_empresa is null then
    insert into estook.empresa (
      organizacion_id, nif, nombre, persona, calle, numero, codigo_postal, municipio, provincia,
      en_sii, foral, modalidad, de_pruebas, comprobada_en, en_verifacti_en, autorizacion,
      autorizacion_correcta_en, autorizacion_mirada_en, creada_por
    ) values (
      la_organizacion, p_nif, p_nombre, 'juridica', p_calle, 's/n', p_codigo_postal, p_municipio,
      p_provincia, false, 'no', 'verifactu', true, now(), now(), p_autorizacion,
      case when p_autorizacion = 'correcta' then now() end, now(), estook.persona_actual()
    )
    returning id into la_empresa;
  end if;

  update estook.local set empresa_id = la_empresa where id = p_local;
  perform estook.apuntar_lo_del_alta(p_local, 'poner_de_pruebas', 'empresa', la_empresa, null);
  return la_empresa;
end;
$$;

revoke all on function plataforma.poner_la_empresa_de_pruebas(uuid, text, text, text, text, text, text, text) from public;
grant execute on function plataforma.poner_la_empresa_de_pruebas(uuid, text, text, text, text, text, text, text) to estook_api;

-- «Pasar a real» (0125): el admin total, una empresa que no es la de pruebas, con su
-- autorización correcta y **las once condiciones cumplidas**. Si falta algo, no pasa.
create function plataforma.pasar_a_real(p_empresa uuid)
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

revoke all on function plataforma.pasar_a_real(uuid) from public;
grant execute on function plataforma.pasar_a_real(uuid) to estook_api;

-- Lo que hace falta para dar de alta el NIF en producción al pasar a real: solo el admin total.
create function plataforma.la_empresa_para_real(p_empresa uuid)
returns table (
  nif text, nombre text, direccion text, codigo_postal text, municipio text, provincia text,
  organizacion text
)
language plpgsql
stable
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
begin
  if plataforma.nivel_de(estook.persona_actual()) is distinct from 'total' then
    raise exception 'solo_admin_total' using errcode = 'P0001';
  end if;
  return query
    select e.nif, e.nombre, e.calle || ' ' || e.numero, e.codigo_postal, e.municipio, e.provincia,
           o.nombre
      from estook.empresa e join estook.organizacion o on o.id = e.organizacion_id
     where e.id = p_empresa;
end;
$$;

revoke all on function plataforma.la_empresa_para_real(uuid) from public;
grant execute on function plataforma.la_empresa_para_real(uuid) to estook_api;

-- Las empresas de todos los clientes, para el admin: su estado, sin el NIF entero si es de una
-- persona (es un dato personal: se ve lo justo para reconocerla).
create function plataforma.las_empresas()
returns table (
  empresa_id      uuid,
  organizacion    text,
  nombre          text,
  nif_visible     text,
  persona         text,
  de_pruebas      boolean,
  entorno         text,
  modalidad       text,
  en_verifacti    boolean,
  autorizacion    text,
  locales         integer,
  creada_en       timestamptz
)
language plpgsql
stable
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
begin
  if plataforma.nivel_de(estook.persona_actual()) is null then
    raise exception 'solo_admin' using errcode = 'P0001';
  end if;
  return query
    select e.id, o.nombre, e.nombre,
           case when e.persona = 'fisica' then '•••••' || right(e.nif, 4) else e.nif end,
           e.persona, e.de_pruebas, e.entorno, e.modalidad, e.en_verifacti_en is not null,
           e.autorizacion,
           (select count(*)::integer from estook.local l where l.empresa_id = e.id),
           e.creada_en
      from estook.empresa e join estook.organizacion o on o.id = e.organizacion_id
     order by e.creada_en desc;
end;
$$;

revoke all on function plataforma.las_empresas() from public;
grant execute on function plataforma.las_empresas() to estook_api;

-- Los locales de las cuentas de la casa, para elegir en el admin dónde va la empresa de pruebas.
create function plataforma.los_locales_de_la_casa()
returns table (local_id uuid, local text, organizacion text, empresa text, de_pruebas boolean)
language plpgsql
stable
security definer
set search_path = plataforma, estook, pg_catalog, pg_temp
as $$
begin
  if plataforma.nivel_de(estook.persona_actual()) is null then
    raise exception 'solo_admin' using errcode = 'P0001';
  end if;
  return query
    select l.id, l.nombre, o.nombre, e.nombre, coalesce(e.de_pruebas, false)
      from estook.local l
      join estook.organizacion o on o.id = l.organizacion_id
      join estook.suscripcion s on s.organizacion_id = o.id and s.de_la_casa
      left join estook.empresa e on e.id = l.empresa_id
     order by o.nombre, l.nombre;
end;
$$;

revoke all on function plataforma.los_locales_de_la_casa() from public;
grant execute on function plataforma.los_locales_de_la_casa() to estook_api;
