-- 0106 · T6 · 2 · 1 · El motor y el ticket (decisión 0136; Anexo 4.4 a 4.11 y 7.6)
--
-- **Emitir un documento fiscal**: el ticket (F2) primero, con el motor que usarán las facturas
-- y las devoluciones (T6 · 2 · 2). Lo de aquí es lo del Anexo 7.6, **todo de solo inserción**:
--
--   · `documento`       nace preparado, con su número, y **no cambia nunca más**: lo vendido,
--                       el desglose, los importes y la copia de los datos de la empresa
--   · `envio`           cada vez que se le manda a Verifacti: con qué fecha, qué pasó
--   · `registro`        cada estado que llega de Hacienda, una fila por novedad, con el QR
--   · `aviso_recibido`  cada aviso de Verifacti, una vez (su `X-Webhook-Id`)
--   · `justificante`    el código del justificante, si se dio uno porque no se llegaba (4.11)
--
-- **Cómo está un documento no se guarda**: se lee de lo que se le ha ido añadiendo
-- (`elEstadoDelDocumento` de @estook/dominio). Así no hay una sola excepción a «solo se inserta».
--
-- **El número se da al preparar** (Anexo 4.4), con el candado de su serie, en una transacción que
-- dura milisegundos: ningún aparato espera a Verifacti para numerar. Pruebas y real numeran
-- aparte (0125), y cada año empieza en 1 (la serie lleva el año: «T-IKA-2026-»).

-- ═══ El documento ══════════════════════════════════════════════════════════════

create table facturacion.documento (
  -- Su identificador **es la clave de idempotencia** ante Verifacti (0059): reintentar con ella
  -- nunca registra dos veces lo mismo.
  id               uuid         primary key default gen_random_uuid(),
  empresa_id       uuid         not null references estook.empresa (id),
  local_id         uuid         not null references estook.local (id),
  serie_id         uuid         not null references facturacion.serie (id),
  entorno          text         not null,
  modalidad        text         not null,
  tipo             text         not null,
  -- «T-IKA-2026-»: el prefijo y el año. Con el número, como lo ve Hacienda.
  serie            text         not null,
  numero           integer      not null,
  -- El día de la venta, en el del local. La de expedición es la del día en que se manda (4.11).
  fecha_operacion  date         not null,
  descripcion      text         not null,
  -- Lo vendido, congelado: [{nombre, cantidad, importe, regimen, tipo}].
  lineas           jsonb        not null,
  -- Una línea por impuesto y tipo, como va a Hacienda: [{regimen, tipo, base, cuota, total}].
  desglose         jsonb        not null,
  base             integer      not null,
  cuota            integer      not null,
  total            integer      not null,
  -- Los datos de la empresa y del local de ese momento: lo que salió impreso (Anexo 7.6).
  empresa_copia    jsonb        not null,
  -- «Mesa 6 · Sara», o nada.
  donde            text,
  -- De dónde viene: el ticket de prueba de Ajustes (T6 · 2 · 1) o un cobro (T7).
  origen           text         not null,
  preparado_por    uuid         references estook.persona (id),
  desde_terminal   uuid         references estook.terminal (id),
  preparado_en     timestamptz  not null default now(),
  constraint documento_entorno_conocido check (entorno in ('pruebas', 'real')),
  constraint documento_modalidad_conocida check (modalidad in ('verifactu', 'fuera_sii')),
  -- R2 y R3 no se programan (Anexo 4.5).
  constraint documento_tipo_conocido check (tipo in ('F2', 'F1', 'F3', 'R1', 'R4', 'R5')),
  constraint documento_origen_conocido check (origen in ('ticket_de_prueba', 'cobro')),
  constraint documento_numero_positivo check (numero > 0),
  -- Serie y número no pasan de los 60 de Hacienda (el número va con seis cifras).
  constraint documento_serie_cabe check (char_length(serie) between 1 and 54),
  constraint documento_descripcion_cabe check (char_length(descripcion) between 1 and 500),
  constraint documento_cuadra check (base + cuota = total),
  constraint documento_lineas_lista check (jsonb_typeof(lineas) = 'array'),
  constraint documento_desglose_lista check (
    jsonb_typeof(desglose) = 'array' and jsonb_array_length(desglose) between 1 and 12
  ),
  -- Un ticket no pasa de 3.000 € (RD 1619/2012, art. 4.2.e; Anexo 4.6).
  constraint documento_ticket_hasta_tres_mil check (tipo not in ('F2', 'R5') or abs(total) <= 300000),
  -- **Sin huecos ni duplicados** en cada serie de cada empresa, en pruebas y en real aparte.
  constraint documento_numero_unico unique (empresa_id, entorno, serie, numero)
);

comment on table facturacion.documento is
  'Cada ticket o factura, preparado con su número (Anexo 4.4 y 7.6). Solo se inserta: su estado se lee de sus envíos y registros (0136).';
comment on column facturacion.documento.id is
  'La clave de idempotencia ante Verifacti (0059): reintentar con ella nunca registra dos veces lo mismo.';

create index documento_del_local on facturacion.documento (local_id, preparado_en desc);

-- ═══ Lo que se le añade ════════════════════════════════════════════════════════

create table facturacion.envio (
  id                bigint       generated always as identity primary key,
  documento_id      uuid         not null references facturacion.documento (id),
  en                timestamptz  not null default now(),
  -- La que se mandó: la del día del envío (Verifacti: «debe ser la fecha actual»).
  fecha_expedicion  date         not null,
  incidencia        boolean      not null default false,
  -- La cabecera `Idempotency-Key`: el id del documento, y otra si se corrigen los datos.
  idempotencia      text         not null,
  resultado         text         not null,
  codigo_http       integer,
  -- El código estable de Verifacti (`vf-verifactu-…`) y lo que dijo, recortado.
  codigo            text,
  mensaje           text,
  constraint envio_resultado_conocido check (
    resultado in ('aceptado', 'rechazado_por_datos', 'en_curso', 'sin_respuesta')
  ),
  constraint envio_mensaje_cabe check (mensaje is null or char_length(mensaje) <= 500)
);

comment on table facturacion.envio is
  'Cada vez que un documento se manda a Verifacti, con lo que pasó (Anexo 4.9, paso 6). Solo se inserta.';

create index envio_del_documento on facturacion.envio (documento_id, en);

create table facturacion.registro (
  id             bigint       generated always as identity primary key,
  documento_id   uuid         not null references facturacion.documento (id),
  en             timestamptz  not null default now(),
  -- El de Verifacti, para preguntar por él (`GET /verifactu/status?uuid=`).
  uuid           text         not null,
  -- Tal cual lo dice Verifacti: Pendiente, Correcto, Aceptado con errores, Incorrecto…
  estado         text         not null,
  -- El QR (imagen en base 64), su dirección de cotejo y la huella: se guardan para reimprimir
  -- sin volver a llamar a nadie (Anexo 4.7).
  qr             text,
  url            text,
  huella         text,
  codigo_error   text,
  mensaje_error  text,
  operacion      text,
  -- Por dónde llegó: la respuesta al alta, una consulta o un aviso.
  por            text         not null,
  constraint registro_por_conocido check (por in ('alta', 'consulta', 'aviso')),
  constraint registro_mensaje_cabe check (mensaje_error is null or char_length(mensaje_error) <= 1000)
);

comment on table facturacion.registro is
  'Cada estado de un documento ante Hacienda, una fila por novedad (Anexo 4.10). Solo se inserta.';

create index registro_del_documento on facturacion.registro (documento_id, en);
create index registro_por_uuid on facturacion.registro (uuid);

create table facturacion.aviso_recibido (
  -- `X-Webhook-Id`: no cambia en los reintentos. Es la clave de idempotencia (Anexo 4.10).
  id           text         primary key,
  recibido_en  timestamptz  not null default now(),
  contenido    jsonb        not null
);

comment on table facturacion.aviso_recibido is
  'Cada aviso de Verifacti, una vez (prueba 16 del Anexo). Solo se inserta.';

create table facturacion.justificante (
  documento_id  uuid         primary key references facturacion.documento (id),
  -- Con él se recoge el ticket cuando se emita (Anexo 4.11). No se puede adivinar.
  codigo        text         not null unique,
  dado_en       timestamptz  not null default now(),
  constraint justificante_codigo_con_forma check (codigo ~ '^J-[0-9A-F]{10}$')
);

comment on table facturacion.justificante is
  'El justificante provisional que se dio porque no se llegaba a Verifacti, con su código (Anexo 4.11). Solo se inserta.';

-- ═══ Solo se inserta (Anexo 2 y pruebas 1 y 9) ═════════════════════════════════

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array['documento', 'envio', 'registro', 'aviso_recibido', 'justificante']
  loop
    execute format(
      'create trigger %1$s_solo_se_inserta before update or delete on facturacion.%1$s
         for each row execute function facturacion.solo_se_inserta()', la_tabla);
    execute format(
      'create trigger %1$s_no_se_vacia before truncate on facturacion.%1$s
         for each statement execute function facturacion.solo_se_inserta()', la_tabla);
    execute format('alter table facturacion.%s enable row level security', la_tabla);
    execute format('revoke all on facturacion.%s from public', la_tabla);
    execute format('grant select on facturacion.%s to estook_api', la_tabla);
  end loop;
end;
$$;

-- Quién los ve: quien lleva la facturación del local (0128), y el sistema, que termina lo que
-- se quedó a medias. Escribir, solo con las funciones de abajo.
create policy documento_lo_ve_quien_la_lleva on facturacion.documento
  for select using (
    estook.es_el_sistema() or estook.puede_editar('accion.alta_de_facturacion', local_id)
  );

create policy envio_lo_ve_quien_ve_el_documento on facturacion.envio
  for select using (documento_id in (select id from facturacion.documento));
create policy registro_lo_ve_quien_ve_el_documento on facturacion.registro
  for select using (documento_id in (select id from facturacion.documento));
create policy justificante_lo_ve_quien_ve_el_documento on facturacion.justificante
  for select using (documento_id in (select id from facturacion.documento));
create policy aviso_lo_ve_el_sistema on facturacion.aviso_recibido
  for select using (estook.es_el_sistema());

-- ═══ Preparar (Anexo 4.9, pasos 1 a 4) ═════════════════════════════════════════

-- El documento preparado, con su número. Lo vendido y su desglose los calcula el servidor con el
-- motor fiscal (`elDesglose`); aquí se mira lo que no puede saltarse nadie: el permiso, que el
-- alta esté lista, la serie, y el número con el candado de su serie.
create function facturacion.preparar_el_documento(
  p_local            uuid,
  p_tipo             text,
  p_fecha_operacion  date,
  p_descripcion      text,
  p_lineas           jsonb,
  p_desglose         jsonb,
  p_base             integer,
  p_cuota            integer,
  p_total            integer,
  p_donde            text,
  p_origen           text,
  p_terminal         uuid,
  -- La hora la pone la API, nunca el reloj de la base (Plan, regla 10).
  p_en               timestamptz
)
returns table (id uuid, serie text, numero integer)
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
#variable_conflict use_column
declare
  la_empresa   estook.empresa%rowtype;
  el_local     estook.local%rowtype;
  la_serie     facturacion.serie%rowtype;
  el_tipo      text;
  el_texto     text;
  el_numero    integer;
  el_id        uuid;
begin
  -- Hoy solo el ticket de prueba, que pide quien lleva la facturación (T6 · 2 · 1). El cobro
  -- (T7) lo pedirá quien cobra.
  if p_origen <> 'ticket_de_prueba' then
    raise exception 'origen_desconocido' using errcode = 'P0001';
  end if;
  perform estook.la_organizacion_del_alta(p_local);

  select * into el_local from estook.local l where l.id = p_local;
  if el_local.empresa_id is null then
    raise exception 'falta_la_empresa' using errcode = 'P0001';
  end if;
  select * into la_empresa from estook.empresa e where e.id = el_local.empresa_id;

  -- Lo que pide el alta antes de emitir (Anexo 4.3): sin envío todavía no existe (T6 · 3), y
  -- con VERI*FACTU hacen falta el alta en Verifacti y la autorización (salvo la de pruebas).
  if la_empresa.modalidad = 'sin_envio' then
    raise exception 'sin_envio_todavia_no' using errcode = 'P0001';
  end if;
  if la_empresa.modalidad = 'verifactu' and (
    la_empresa.en_verifacti_en is null
    or (la_empresa.autorizacion <> 'correcta' and not la_empresa.de_pruebas)
  ) then
    raise exception 'empresa_sin_terminar' using errcode = 'P0001';
  end if;
  -- Un ticket de prueba solo en pruebas: en real no se imprime nada de mentira (Anexo 4.12).
  if p_origen = 'ticket_de_prueba' and la_empresa.entorno <> 'pruebas' then
    raise exception 'empresa_en_real' using errcode = 'P0001';
  end if;

  el_tipo := case when p_tipo in ('F2', 'F3') then 'ticket'
                  when p_tipo = 'F1' then 'factura'
                  else 'rectificativa' end;
  -- F3 va en la de facturas: el canje es una factura (T6 · 2 · 2).
  if p_tipo = 'F3' then el_tipo := 'factura'; end if;
  select * into la_serie from facturacion.serie s
   where s.local_id = p_local and s.tipo = el_tipo
   order by s.puesta_en desc
   limit 1;
  if la_serie.id is null or la_serie.empresa_id <> la_empresa.id then
    raise exception 'falta_la_serie' using errcode = 'P0001';
  end if;

  el_texto := la_serie.prefijo || '-' || to_char(p_fecha_operacion, 'YYYY') || '-';
  -- El candado de **su** serie: dura lo que esta transacción, que son milisegundos.
  perform pg_advisory_xact_lock(
    hashtextextended(la_empresa.id::text || '|' || la_empresa.entorno || '|' || el_texto, 0)
  );
  select coalesce(max(d.numero), 0) + 1 into el_numero
    from facturacion.documento d
   where d.empresa_id = la_empresa.id and d.entorno = la_empresa.entorno and d.serie = el_texto;

  insert into facturacion.documento (
    empresa_id, local_id, serie_id, entorno, modalidad, tipo, serie, numero, fecha_operacion,
    descripcion, lineas, desglose, base, cuota, total, empresa_copia, donde, origen,
    preparado_por, desde_terminal, preparado_en
  ) values (
    la_empresa.id, p_local, la_serie.id, la_empresa.entorno, la_empresa.modalidad, p_tipo,
    el_texto, el_numero, p_fecha_operacion, p_descripcion, p_lineas, p_desglose, p_base, p_cuota,
    p_total,
    jsonb_build_object(
      'local', coalesce(nullif(btrim(la_empresa.nombre_comercial), ''), el_local.nombre),
      'nombre', la_empresa.nombre,
      'nif', la_empresa.nif,
      'domicilio', la_empresa.calle || ' ' || la_empresa.numero || ', '
                   || la_empresa.codigo_postal || ' ' || la_empresa.municipio,
      'de_pruebas', la_empresa.de_pruebas
    ),
    nullif(btrim(coalesce(p_donde, '')), ''), p_origen, estook.persona_actual(), p_terminal, p_en
  )
  returning facturacion.documento.id into el_id;

  return query select el_id, el_texto, el_numero;
end;
$$;

comment on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz) is
  'Prepara un documento con su número, con el candado de su serie (Anexo 4.9, pasos 1 a 4). Lo que va a Verifacti, fuera (0136).';

-- Quién puede tocar lo de un documento: quien lo ve, o el sistema.
create function facturacion.se_puede_tocar(p_documento uuid)
returns boolean
language sql
stable
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
  select estook.es_el_sistema() or exists (
    select 1 from facturacion.documento d
     where d.id = p_documento
       and estook.puede_editar('accion.alta_de_facturacion', d.local_id)
  )
$$;

-- ═══ Lo que se le añade (4.9, paso 6; 4.10) ════════════════════════════════════

create function facturacion.apuntar_el_envio(
  p_documento         uuid,
  p_fecha_expedicion  date,
  p_incidencia        boolean,
  p_idempotencia      text,
  p_resultado         text,
  p_codigo_http       integer,
  p_codigo            text,
  p_mensaje           text,
  p_en                timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not facturacion.se_puede_tocar(p_documento) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  insert into facturacion.envio (
    documento_id, en, fecha_expedicion, incidencia, idempotencia, resultado, codigo_http, codigo,
    mensaje
  ) values (
    p_documento, p_en, p_fecha_expedicion, p_incidencia, p_idempotencia, p_resultado, p_codigo_http,
    left(p_codigo, 200), left(p_mensaje, 500)
  );
end;
$$;

-- Un estado de Hacienda. **Una fila por novedad**: si es el mismo que el último, no se repite.
create function facturacion.apuntar_el_registro(
  p_documento      uuid,
  p_uuid           text,
  p_estado         text,
  p_qr             text,
  p_url            text,
  p_huella         text,
  p_codigo_error   text,
  p_mensaje_error  text,
  p_operacion      text,
  p_por            text,
  p_en             timestamptz
)
returns boolean
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  el_ultimo facturacion.registro%rowtype;
begin
  if not facturacion.se_puede_tocar(p_documento) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select * into el_ultimo from facturacion.registro r
   where r.documento_id = p_documento order by r.en desc, r.id desc limit 1;
  if el_ultimo.id is not null
     and el_ultimo.estado = p_estado
     and el_ultimo.codigo_error is not distinct from p_codigo_error then
    return false;
  end if;
  insert into facturacion.registro (
    documento_id, en, uuid, estado, qr, url, huella, codigo_error, mensaje_error, operacion, por
  ) values (
    p_documento, p_en, p_uuid, p_estado,
    coalesce(p_qr, el_ultimo.qr), coalesce(p_url, el_ultimo.url), coalesce(p_huella, el_ultimo.huella),
    p_codigo_error, left(p_mensaje_error, 1000), p_operacion, p_por
  );
  return true;
end;
$$;

-- Un aviso de Verifacti, una sola vez: devuelve si es nuevo (prueba 16).
create function facturacion.apuntar_el_aviso(p_id text, p_contenido jsonb)
returns boolean
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
begin
  if not estook.es_el_sistema() then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  insert into facturacion.aviso_recibido (id, contenido) values (left(p_id, 200), p_contenido)
  on conflict (id) do nothing;
  return found;
end;
$$;

-- El justificante de un documento que no llegó a Verifacti (4.11): su código, que no se adivina.
-- Si ya tiene uno, el mismo.
create function facturacion.dar_el_justificante(p_documento uuid)
returns text
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  el_codigo text;
begin
  if not facturacion.se_puede_tocar(p_documento) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select j.codigo into el_codigo from facturacion.justificante j where j.documento_id = p_documento;
  if el_codigo is not null then
    return el_codigo;
  end if;
  el_codigo := 'J-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 10));
  insert into facturacion.justificante (documento_id, codigo) values (p_documento, el_codigo);
  return el_codigo;
end;
$$;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz)',
    'facturacion.se_puede_tocar(uuid)',
    'facturacion.apuntar_el_envio(uuid, date, boolean, text, text, integer, text, text, timestamptz)',
    'facturacion.apuntar_el_registro(uuid, text, text, text, text, text, text, text, text, text, timestamptz)',
    'facturacion.apuntar_el_aviso(text, jsonb)',
    'facturacion.dar_el_justificante(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;

-- ═══ El aviso de Verifacti, dado de alta (4.10) ════════════════════════════════

-- Lo que el código dio de alta en Verifacti para recibir sus avisos, por entorno: el aviso y
-- los NIF que escucha. Como `plataforma.stripe`: se crea la primera vez que hace falta.
create table plataforma.aviso_de_verifacti (
  entorno     text         primary key,
  aviso       text         not null,
  nifs        text[]       not null default '{}',
  puesto_en   timestamptz  not null default now(),
  constraint aviso_de_verifacti_entorno check (entorno in ('test', 'prod'))
);

comment on table plataforma.aviso_de_verifacti is
  'El aviso dado de alta en Verifacti por entorno y los NIF que escucha (0136). Lo toca solo el sistema.';

alter table plataforma.aviso_de_verifacti enable row level security;
create policy aviso_de_verifacti_el_sistema on plataforma.aviso_de_verifacti
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
revoke all on plataforma.aviso_de_verifacti from public;
grant select, insert, update on plataforma.aviso_de_verifacti to estook_api;
