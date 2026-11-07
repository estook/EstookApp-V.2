-- 0110 · T6 · 2 · 2 · 2 · Las correcciones (decisión 0140; Anexo 4.5, 4.10, 5.3, 5.4 y 7.6)
--
-- Lo emitido no se toca nunca: **se corrige con otro documento**.
--
--   1. **Quién hace qué**: devolver, corregir los datos y anular, cada uno con su permiso (maqueta del
--      6-nov, 8). Solo la dirección los cambia, como los demás (0137).
--   2. **La devolución** (R5 de un ticket, R1 de una factura), por diferencias: lo devuelto, en negativo.
--      La base mira que no se devuelva más de lo que queda de cada línea.
--   3. **Corregir los datos** (R4), por sustitución: la anterior se queda donde estaba, «Corregida».
--   4. **Anular**, para lo que nunca debió existir. Su registro ante Hacienda va aparte del alta: una
--      anulación que Hacienda no acepta **no** convierte en rechazada a la factura, que sigue valiendo.
--      Solo cuando Hacienda dice «Anulado» se le añade a `registro`, y desde ahí se lee como siempre.
--   5. **La señal** (F1 que se factura al cobrarla) y lo que la final le descuenta (Ley del IVA, art. 75.Dos).
--   6. **Lo rechazado se corrige** con otro documento igual y otro número, y deja de salir arriba.

-- ═══ 1 · Los permisos ══════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.devolver', 'Devolver', 'accion', 'local',
   'Devolver un ticket o una factura, entera o una parte, con su motivo. Sale una rectificativa'),
  ('accion.corregir_datos', 'Corregir los datos del cliente', 'accion', 'local',
   'Corregir el NIF, el nombre o el domicilio de una factura, y volver a hacer lo que rechaza Hacienda'),
  ('accion.anular', 'Anular', 'accion', 'local',
   'Anular, con su motivo, lo que nunca debió existir. El número no se vuelve a usar');

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('gerente',                 'accion.devolver',       'ver_y_editar'),
  ('area_manager',            'accion.devolver',       'ver_y_editar'),
  ('direccion',               'accion.devolver',       'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.devolver',       'ver_y_editar'),
  ('gerente',                 'accion.corregir_datos', 'ver_y_editar'),
  ('direccion',               'accion.corregir_datos', 'ver_y_editar'),
  ('gerente',                 'accion.anular',         'ver_y_editar'),
  ('direccion',               'accion.anular',         'ver_y_editar');

create or replace function estook.es_permiso_de_los_documentos(p_permiso text)
returns boolean
language sql
immutable
as $$
  select p_permiso in (
    'accion.factura_de_un_ticket', 'accion.factura_a_mano', 'accion.ver_documentos',
    'accion.devolver', 'accion.corregir_datos', 'accion.anular'
  )
$$;

-- La de la 0107, entera, con los tres de ahora.
drop function estook.quien_hace_que(uuid);

create function estook.quien_hace_que(p_local uuid)
returns table (
  persona_id  uuid,
  nombre      text,
  rol         text,
  siempre     boolean,
  de_un_ticket boolean,
  a_mano      boolean,
  consultar   boolean,
  devolver    boolean,
  corregir    boolean,
  anular      boolean,
  cambiados   text[]
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
      select m.id as membresia_id, m.persona_id, m.rol, r.amplitud
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
    ),
    su_rol as (
      select distinct on (e.persona_id) e.persona_id, e.rol
        from en_el_local e
       order by e.persona_id, e.amplitud desc
    )
    select p.id,
           btrim(p.nombre || ' ' || coalesce(p.apellidos, '')),
           s.rol::text,
           s.rol = 'direccion',
           estook.nivel_de_permiso(p.id, p_local, 'accion.factura_de_un_ticket') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.factura_a_mano') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.ver_documentos') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.devolver') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.corregir_datos') <> 'sin_acceso',
           estook.nivel_de_permiso(p.id, p_local, 'accion.anular') <> 'sin_acceso',
           coalesce((
             select array_agg(rec.permiso order by rec.permiso)
               from estook.recorte_de_permiso rec
               join en_el_local e on e.membresia_id = rec.membresia_id
              where e.persona_id = p.id
                and rec.local_id = p_local
                and estook.es_permiso_de_los_documentos(rec.permiso)
           ), '{}')
      from su_rol s
      join estook.persona p on p.id = s.persona_id
     where p.activa
     order by s.rol = 'direccion' desc, p.nombre, p.apellidos;
end;
$$;

revoke all on function estook.quien_hace_que(uuid) from public;
grant execute on function estook.quien_hace_que(uuid) to estook_api;

-- ═══ 2 · Lo que se añade (todo de solo inserción, Anexo 7.6) ═══════════════════

alter table facturacion.documento
  drop constraint documento_origen_conocido,
  add constraint documento_origen_conocido check (origen in (
    'ticket_de_prueba', 'cobro', 'a_mano', 'canje', 'devolucion', 'correccion', 'senal'
  ));

create table facturacion.rectificacion (
  rectificativa_id   uuid         primary key references facturacion.documento (id),
  -- El documento que rectifica.
  documento_id       uuid         not null references facturacion.documento (id),
  -- `devolucion` va por diferencias (I); `datos`, por sustitución (S).
  clase              text         not null,
  motivo             text         not null,
  -- En una devolución, de qué línea del documento sale cada cosa: [{linea, cantidad, importe}].
  -- La cantidad puede ser 0: «se cobró de más» no devuelve ninguna ración, solo dinero.
  lineas             jsonb        not null default '[]',
  -- En una sustitución, lo que había antes, que es lo que pide Verifacti (`importe_rectificativa`).
  base_rectificada   integer,
  cuota_rectificada  integer,
  -- Las devoluciones que ya tenía: la sustitución las recoge y dice que las rectifica también.
  tambien            uuid[]       not null default '{}',
  -- Si lo que corrige es una señal: lo sigue siendo, con el cliente bien.
  de_senal           boolean      not null default false,
  por                uuid         references estook.persona (id),
  en                 timestamptz  not null,
  constraint rectificacion_clase_conocida check (clase in ('devolucion', 'datos')),
  constraint rectificacion_motivo_cabe check (char_length(motivo) between 1 and 200),
  constraint rectificacion_lineas_lista check (jsonb_typeof(lineas) = 'array'),
  constraint rectificacion_sustitucion_con_lo_de_antes check (
    (clase = 'datos') = (base_rectificada is not null and cuota_rectificada is not null)
  )
);
comment on table facturacion.rectificacion is
  'Qué rectifica cada rectificativa, por qué y de qué líneas (Anexo 4.5 y 5.4). Solo se inserta.';
create index rectificacion_del_documento on facturacion.rectificacion (documento_id);

create table facturacion.descuento_de_senal (
  senal_id    uuid         not null references facturacion.documento (id),
  factura_id  uuid         not null references facturacion.documento (id),
  importe     integer      not null,
  en          timestamptz  not null,
  primary key (senal_id, factura_id),
  constraint descuento_positivo check (importe > 0)
);
comment on table facturacion.descuento_de_senal is
  'Qué señales descuenta cada factura final (Ley del IVA, art. 75.Dos; lo investigado, A22). Solo se inserta.';
create index descuento_de_la_factura on facturacion.descuento_de_senal (factura_id);

create table facturacion.anulacion (
  id            uuid         primary key default gen_random_uuid(),
  documento_id  uuid         not null references facturacion.documento (id),
  motivo        text         not null,
  por           uuid         references estook.persona (id),
  en            timestamptz  not null,
  constraint anulacion_motivo_cabe check (char_length(motivo) between 3 and 200)
);
comment on table facturacion.anulacion is
  'Cada vez que se pide anular un documento, con quién y por qué (Anexo 4.5). Solo se inserta. Cómo va, en `paso_de_anulacion`.';
create index anulacion_del_documento on facturacion.anulacion (documento_id, en);

create table facturacion.paso_de_anulacion (
  id            bigint       generated always as identity primary key,
  anulacion_id  uuid         not null references facturacion.anulacion (id),
  en            timestamptz  not null,
  -- El registro de la anulación en Verifacti, que es otro que el del alta.
  uuid          text,
  -- Tal cual lo dice Verifacti, o lo que pasó con la llamada si no contestó.
  estado        text         not null,
  codigo        text,
  mensaje       text,
  -- Lo que queda: `sigue` (se vuelve a mirar), `anulada` o `no_salio` (el documento sigue valiendo).
  queda         text         not null,
  por           text         not null,
  constraint paso_queda_conocido check (queda in ('sigue', 'anulada', 'no_salio')),
  constraint paso_por_conocido check (por in ('alta', 'consulta', 'aviso')),
  constraint paso_mensaje_cabe check (mensaje is null or char_length(mensaje) <= 1000)
);
comment on table facturacion.paso_de_anulacion is
  'Lo que va pasando con una anulación ante Hacienda (Verifacti, `POST /verifactu/cancel`). Solo se inserta.';
create index paso_de_la_anulacion on facturacion.paso_de_anulacion (anulacion_id, en);
create index paso_por_uuid on facturacion.paso_de_anulacion (uuid);

create table facturacion.rehecho (
  original_id  uuid         primary key references facturacion.documento (id),
  nuevo_id     uuid         not null unique references facturacion.documento (id),
  por          uuid         references estook.persona (id),
  en           timestamptz  not null
);
comment on table facturacion.rehecho is
  'Qué documento corrige a otro que rechazó Hacienda (Anexo 4.10): el rechazado se queda y su número sigue usado. Solo se inserta.';

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array[
    'rectificacion', 'descuento_de_senal', 'anulacion', 'paso_de_anulacion', 'rehecho'
  ]
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

create policy rectificacion_la_ve_quien_ve_el_documento on facturacion.rectificacion
  for select using (documento_id in (select id from facturacion.documento));
create policy descuento_lo_ve_quien_ve_la_factura on facturacion.descuento_de_senal
  for select using (factura_id in (select id from facturacion.documento));
create policy anulacion_la_ve_quien_ve_el_documento on facturacion.anulacion
  for select using (documento_id in (select id from facturacion.documento));
create policy paso_lo_ve_quien_ve_la_anulacion on facturacion.paso_de_anulacion
  for select using (anulacion_id in (select id from facturacion.anulacion));
create policy rehecho_lo_ve_quien_ve_el_documento on facturacion.rehecho
  for select using (original_id in (select id from facturacion.documento));

-- ═══ 3 · Lo que se pregunta de un documento ════════════════════════════════════

-- **Si tiene una anulación sin terminar**: mientras, nadie lo devuelve ni lo corrige.
create function facturacion.anulacion_en_curso(p_documento uuid)
returns boolean
language sql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
  select exists (
    select 1 from facturacion.anulacion a
     where a.documento_id = p_documento
       and not exists (
         select 1 from facturacion.paso_de_anulacion p
          where p.anulacion_id = a.id and p.queda in ('anulada', 'no_salio')
       )
  )
$$;

-- **Lo que queda de un documento**: lo que vale menos lo devuelto. Si se ha corregido, lo de su
-- corrección, que es la que está en vigor.
create function facturacion.lo_que_queda(p_documento uuid)
returns integer
language plpgsql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
declare
  la_correccion uuid;
  el_total      integer;
  lo_devuelto   integer;
begin
  select r.rectificativa_id into la_correccion
    from facturacion.rectificacion r
   where r.documento_id = p_documento and r.clase = 'datos'
     and facturacion.sigue_en_pie(r.rectificativa_id)
   order by r.en desc
   limit 1;
  if la_correccion is not null then
    return facturacion.lo_que_queda(la_correccion);
  end if;
  select d.total into el_total from facturacion.documento d where d.id = p_documento;
  select coalesce(sum(d.total), 0) into lo_devuelto
    from facturacion.rectificacion r
    join facturacion.documento d on d.id = r.rectificativa_id
   where r.documento_id = p_documento and r.clase = 'devolucion'
     and facturacion.sigue_en_pie(r.rectificativa_id);
  return el_total + lo_devuelto;
end;
$$;

create function facturacion.es_senal(p_documento uuid)
returns boolean
language sql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
  select exists (select 1 from facturacion.documento d where d.id = p_documento and d.origen = 'senal')
      or exists (
        select 1 from facturacion.rectificacion r
         where r.rectificativa_id = p_documento and r.de_senal
      )
$$;

-- **Si una señal ya está descontada**: por una factura que Hacienda tiene y a la que le queda algo.
-- Si la final se anula, se rechaza o se devuelve entera, la señal vuelve a estar libre.
create function facturacion.esta_descontada(p_senal uuid)
returns boolean
language sql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
  select exists (
    select 1 from facturacion.descuento_de_senal d
     where d.senal_id = p_senal
       and facturacion.sigue_en_pie(d.factura_id)
       and facturacion.lo_que_queda(d.factura_id) <> 0
  )
$$;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'facturacion.anulacion_en_curso(uuid)',
    'facturacion.lo_que_queda(uuid)',
    'facturacion.es_senal(uuid)',
    'facturacion.esta_descontada(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;

-- Lo que hace falta para rectificar algo: lo tiene Hacienda (o va por el SII), sigue en pie y nadie
-- lo está anulando. El candado es el mismo para todo lo que toca a un documento: lo que dos aparatos
-- intenten a la vez, sale de uno en uno.
create function facturacion.se_puede_rectificar(p_documento uuid, p_local uuid)
returns facturacion.documento
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  fila facturacion.documento%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('documento|' || p_documento::text, 0));
  select * into fila from facturacion.documento d where d.id = p_documento;
  if fila.id is null or fila.local_id <> p_local then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if not facturacion.sigue_en_pie(p_documento) then
    raise exception 'ya_no_vale' using errcode = 'P0001';
  end if;
  if fila.modalidad = 'verifactu'
     and not exists (select 1 from facturacion.registro r where r.documento_id = p_documento) then
    raise exception 'sin_registrar' using errcode = 'P0001';
  end if;
  if facturacion.anulacion_en_curso(p_documento) then
    raise exception 'se_esta_anulando' using errcode = 'P0001';
  end if;
  return fila;
end;
$$;

revoke all on function facturacion.se_puede_rectificar(uuid, uuid) from public;

-- Que lo que se devuelve quepa en lo que queda de cada línea y del documento. Lo llama quien ya tiene
-- el candado, y también lo mira al rehacer una devolución que rechazó Hacienda.
create function facturacion.cabe_lo_devuelto(
  p_documento  facturacion.documento,
  p_lineas     jsonb,
  p_total      integer
)
returns void
language plpgsql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
declare
  item       jsonb;
  la_linea   jsonb;
  el_indice  integer;
  cantidad   integer;
  importe    integer;
  ya_cant    numeric;
  ya_imp     numeric;
  la_suma    integer := 0;
begin
  if jsonb_array_length(p_lineas) = 0 then
    raise exception 'sin_lineas' using errcode = 'P0001';
  end if;
  for item in select * from jsonb_array_elements(p_lineas)
  loop
    el_indice := (item ->> 'linea')::integer;
    cantidad := (item ->> 'cantidad')::integer;
    importe := (item ->> 'importe')::integer;
    la_linea := p_documento.lineas -> el_indice;
    if el_indice < 0 or la_linea is null or cantidad < 0 or importe = 0
       or sign(importe) <> sign((la_linea ->> 'importe')::integer) then
      raise exception 'linea_que_no_existe' using errcode = 'P0001';
    end if;
    select coalesce(sum((x ->> 'cantidad')::integer), 0), coalesce(sum((x ->> 'importe')::integer), 0)
      into ya_cant, ya_imp
      from facturacion.rectificacion r
      cross join lateral jsonb_array_elements(r.lineas) x
     where r.documento_id = p_documento.id
       and r.clase = 'devolucion'
       and (x ->> 'linea')::integer = el_indice
       and facturacion.sigue_en_pie(r.rectificativa_id);
    if ya_cant + cantidad > (la_linea ->> 'cantidad')::integer
       or abs(ya_imp + importe) > abs((la_linea ->> 'importe')::integer) then
      raise exception 'ya_devuelto' using errcode = 'P0001';
    end if;
    la_suma := la_suma + importe;
  end loop;
  -- `p_total` es el de la rectificativa: lo devuelto, en negativo.
  if la_suma <> -p_total then
    raise exception 'el_importe_no_cuadra' using errcode = 'P0001';
  end if;
  if -p_total > facturacion.lo_que_queda(p_documento.id) then
    raise exception 'ya_devuelto' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function facturacion.cabe_lo_devuelto(facturacion.documento, jsonb, integer) from public;

-- Lo que no deja rectificar lo que se le pide: tiene su factura, su corrección o ya se ha descontado.
create function facturacion.mirar_lo_rectificable(p_documento facturacion.documento)
returns void
language plpgsql
stable
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
begin
  if exists (
    select 1 from facturacion.canje c
     where c.ticket_id = p_documento.id and facturacion.sigue_en_pie(c.factura_id)
  ) then
    raise exception 'ya_tiene_factura' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from facturacion.rectificacion r
     where r.documento_id = p_documento.id and r.clase = 'datos'
       and facturacion.sigue_en_pie(r.rectificativa_id)
  ) then
    raise exception 'ya_corregida' using errcode = 'P0001';
  end if;
  if facturacion.es_senal(p_documento.id) and facturacion.esta_descontada(p_documento.id) then
    raise exception 'senal_descontada' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function facturacion.mirar_lo_rectificable(facturacion.documento) from public;

-- ═══ 4 · Devolver ══════════════════════════════════════════════════════════════

create function facturacion.apuntar_la_devolucion(
  p_local          uuid,
  p_rectificativa  uuid,
  p_documento      uuid,
  p_motivo         text,
  p_lineas         jsonb,
  p_en             timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  fila  facturacion.documento%rowtype;
  la_r  facturacion.documento%rowtype;
begin
  if not estook.puede_editar('accion.devolver', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  fila := facturacion.se_puede_rectificar(p_documento, p_local);
  select * into la_r from facturacion.documento d where d.id = p_rectificativa;
  if la_r.id is null or la_r.local_id <> p_local
     or la_r.empresa_id <> fila.empresa_id or la_r.entorno <> fila.entorno then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  -- **Sobre un ticket, R5; sobre una factura, R1** (Anexo 4.5): lo contrario declara mal el documento.
  if not (
    (fila.tipo = 'F2' and la_r.tipo = 'R5')
    or (fila.tipo in ('F1', 'F3', 'R4') and la_r.tipo = 'R1')
  ) then
    raise exception 'no_se_puede_devolver' using errcode = 'P0001';
  end if;
  perform facturacion.mirar_lo_rectificable(fila);
  perform facturacion.cabe_lo_devuelto(fila, p_lineas, la_r.total);
  insert into facturacion.rectificacion (rectificativa_id, documento_id, clase, motivo, lineas, por, en)
  values (p_rectificativa, p_documento, 'devolucion', left(p_motivo, 200), p_lineas,
          estook.persona_actual(), p_en);
end;
$$;

revoke all on function facturacion.apuntar_la_devolucion(uuid, uuid, uuid, text, jsonb, timestamptz) from public;
grant execute on function facturacion.apuntar_la_devolucion(uuid, uuid, uuid, text, jsonb, timestamptz) to estook_api;

-- ═══ 5 · Corregir los datos ════════════════════════════════════════════════════

-- La nueva recoge lo que queda: el total es el de la original menos sus devoluciones, y lo de antes
-- es la suma de todo lo que Hacienda tiene de esa factura. La base lo vuelve a sumar.
create function facturacion.apuntar_la_correccion(
  p_local          uuid,
  p_rectificativa  uuid,
  p_documento      uuid,
  p_motivo         text,
  p_en             timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  fila     facturacion.documento%rowtype;
  la_r     facturacion.documento%rowtype;
  la_base  integer;
  la_cuota integer;
  el_total integer;
  las_otras uuid[];
begin
  if not estook.puede_editar('accion.corregir_datos', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  fila := facturacion.se_puede_rectificar(p_documento, p_local);
  select * into la_r from facturacion.documento d where d.id = p_rectificativa;
  if la_r.id is null or la_r.local_id <> p_local or la_r.tipo <> 'R4'
     or la_r.empresa_id <> fila.empresa_id or la_r.entorno <> fila.entorno then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  -- Un ticket no lleva cliente: no hay dato que corregir.
  if fila.tipo not in ('F1', 'F3', 'R4') then
    raise exception 'no_se_puede_corregir' using errcode = 'P0001';
  end if;
  perform facturacion.mirar_lo_rectificable(fila);

  select coalesce(sum(d.base), 0), coalesce(sum(d.cuota), 0), coalesce(sum(d.total), 0),
         coalesce(array_agg(d.id), '{}')
    into la_base, la_cuota, el_total, las_otras
    from facturacion.rectificacion r
    join facturacion.documento d on d.id = r.rectificativa_id
   where r.documento_id = p_documento and r.clase = 'devolucion'
     and facturacion.sigue_en_pie(r.rectificativa_id);
  if la_r.total <> fila.total + el_total then
    raise exception 'el_importe_no_cuadra' using errcode = 'P0001';
  end if;
  insert into facturacion.rectificacion (
    rectificativa_id, documento_id, clase, motivo, base_rectificada, cuota_rectificada, tambien,
    de_senal, por, en
  ) values (
    p_rectificativa, p_documento, 'datos', left(p_motivo, 200), fila.base + la_base,
    fila.cuota + la_cuota, las_otras, facturacion.es_senal(p_documento), estook.persona_actual(), p_en
  );
end;
$$;

revoke all on function facturacion.apuntar_la_correccion(uuid, uuid, uuid, text, timestamptz) from public;
grant execute on function facturacion.apuntar_la_correccion(uuid, uuid, uuid, text, timestamptz) to estook_api;

-- ═══ 6 · Anular ════════════════════════════════════════════════════════════════

-- **Solo para lo que nunca debió existir** (Anexo 4.5). No se anula lo que tiene una factura, una
-- corrección o una devolución encima, ni una señal, ni lo que Hacienda no ha contestado: si contesta
-- después, no se sabría de qué. Devuelve el id de la anulación.
create function facturacion.pedir_la_anulacion(
  p_local      uuid,
  p_documento  uuid,
  p_motivo     text,
  p_en         timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  fila      facturacion.documento%rowtype;
  lo_ultimo text;
  el_id     uuid;
begin
  if not estook.puede_editar('accion.anular', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'falta_el_motivo' using errcode = 'P0001';
  end if;
  fila := facturacion.se_puede_rectificar(p_documento, p_local);
  if fila.tipo not in ('F1', 'F2', 'F3') then
    raise exception 'no_se_puede_anular' using errcode = 'P0001';
  end if;
  perform facturacion.mirar_lo_rectificable(fila);
  if facturacion.es_senal(p_documento) then
    raise exception 'es_una_senal' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from facturacion.rectificacion r
     where r.documento_id = p_documento and facturacion.sigue_en_pie(r.rectificativa_id)
  ) then
    raise exception 'tiene_una_devolucion' using errcode = 'P0001';
  end if;
  if fila.modalidad = 'verifactu' then
    select lower(btrim(r.estado)) into lo_ultimo from facturacion.registro r
     where r.documento_id = p_documento order by r.en desc, r.id desc limit 1;
    if coalesce(lo_ultimo, '') not in ('correcto', 'aceptado con errores', 'duplicado') then
      raise exception 'todavia_en_hacienda' using errcode = 'P0001';
    end if;
  end if;
  insert into facturacion.anulacion (documento_id, motivo, por, en)
  values (p_documento, btrim(p_motivo), estook.persona_actual(), p_en)
  returning id into el_id;
  -- Vuelve a la cola: el reloj tiene que saber qué dice Hacienda de esto (0138).
  if fila.modalidad = 'verifactu' then
    insert into facturacion.por_repasar (documento_id, desde) values (p_documento, p_en)
    on conflict (documento_id) do update set desde = excluded.desde;
  end if;
  return el_id;
end;
$$;

revoke all on function facturacion.pedir_la_anulacion(uuid, uuid, text, timestamptz) from public;
grant execute on function facturacion.pedir_la_anulacion(uuid, uuid, text, timestamptz) to estook_api;

-- Lo que va pasando con ella. **Si Hacienda dice que está anulado, se le añade al documento**, y todo
-- lo que lee su último registro lo ve anulado sin saber nada de esto. Si no sale, el documento sigue
-- como estaba y se quita de la cola. Una fila por novedad; devuelve si era nueva.
create function facturacion.apuntar_el_paso_de_anular(
  p_anulacion  uuid,
  p_uuid       text,
  p_estado     text,
  p_codigo     text,
  p_mensaje    text,
  p_queda      text,
  p_por        text,
  p_en         timestamptz
)
returns boolean
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  la_anulacion facturacion.anulacion%rowtype;
  el_ultimo    facturacion.paso_de_anulacion%rowtype;
begin
  select * into la_anulacion from facturacion.anulacion a where a.id = p_anulacion;
  if la_anulacion.id is null then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if not facturacion.se_puede_tocar(la_anulacion.documento_id) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select * into el_ultimo from facturacion.paso_de_anulacion p
   where p.anulacion_id = p_anulacion order by p.en desc, p.id desc limit 1;
  -- Lo que ya terminó no cambia, y lo mismo dos veces no se repite.
  if el_ultimo.id is not null and (
    el_ultimo.queda <> 'sigue'
    or (el_ultimo.estado = p_estado and el_ultimo.codigo is not distinct from p_codigo)
  ) then
    return false;
  end if;
  insert into facturacion.paso_de_anulacion (
    anulacion_id, en, uuid, estado, codigo, mensaje, queda, por
  ) values (
    p_anulacion, p_en, coalesce(p_uuid, el_ultimo.uuid), p_estado, left(p_codigo, 200),
    left(p_mensaje, 1000), p_queda, p_por
  );
  if p_queda = 'anulada' then
    perform facturacion.apuntar_el_registro(
      la_anulacion.documento_id, coalesce(p_uuid, el_ultimo.uuid, 'sin-registro'), 'Anulado', null,
      null, null, null, null, 'Anulación', p_por, p_en
    );
  elsif p_queda = 'no_salio' then
    delete from facturacion.por_repasar r where r.documento_id = la_anulacion.documento_id;
  end if;
  return true;
end;
$$;

revoke all on function facturacion.apuntar_el_paso_de_anular(uuid, text, text, text, text, text, text, timestamptz) from public;
grant execute on function facturacion.apuntar_el_paso_de_anular(uuid, text, text, text, text, text, text, timestamptz) to estook_api;

-- La de la 0108, entera: el estado final del alta no saca de la cola lo que se está anulando.
create or replace function facturacion.al_apuntar_un_estado()
returns trigger
language plpgsql
security definer
set search_path = facturacion, pg_catalog, pg_temp
as $$
begin
  if facturacion.es_estado_final(new.estado)
     and not facturacion.anulacion_en_curso(new.documento_id) then
    delete from facturacion.por_repasar p where p.documento_id = new.documento_id;
  end if;
  return new;
end;
$$;

-- ═══ 7 · La señal ══════════════════════════════════════════════════════════════

-- **Qué descuenta la final** (Anexo; lo investigado, A22): una señal una sola vez y del mismo cliente.
-- Lo que descuenta es lo que le queda, y la suma tiene que ser la de sus líneas en negativo.
create function facturacion.apuntar_los_descuentos(
  p_local    uuid,
  p_factura  uuid,
  p_senales  uuid[],
  p_en       timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  la_factura  facturacion.documento%rowtype;
  fila        facturacion.documento%rowtype;
  la_senal    uuid;
  lo_suyo     integer;
  la_suma     integer := 0;
  en_negativo integer;
begin
  if not estook.puede_editar('accion.factura_a_mano', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select * into la_factura from facturacion.documento d where d.id = p_factura;
  if la_factura.id is null or la_factura.local_id <> p_local or la_factura.tipo <> 'F1' then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  foreach la_senal in array (select array_agg(t order by t) from unnest(p_senales) t)
  loop
    fila := facturacion.se_puede_rectificar(la_senal, p_local);
    if not facturacion.es_senal(la_senal) then
      raise exception 'no_es_una_senal' using errcode = 'P0001';
    end if;
    perform facturacion.mirar_lo_rectificable(fila);
    if fila.empresa_id <> la_factura.empresa_id or fila.entorno <> la_factura.entorno
       or fila.destinatario ->> 'identificador' is distinct from la_factura.destinatario ->> 'identificador' then
      raise exception 'senal_de_otro_cliente' using errcode = 'P0001';
    end if;
    lo_suyo := facturacion.lo_que_queda(la_senal);
    if lo_suyo <= 0 then
      raise exception 'senal_sin_nada' using errcode = 'P0001';
    end if;
    la_suma := la_suma + lo_suyo;
    insert into facturacion.descuento_de_senal (senal_id, factura_id, importe, en)
    values (la_senal, p_factura, lo_suyo, p_en);
  end loop;
  select coalesce(sum((l ->> 'importe')::integer), 0) into en_negativo
    from jsonb_array_elements(la_factura.lineas) l
   where (l ->> 'importe')::integer < 0;
  if en_negativo <> -la_suma then
    raise exception 'el_importe_no_cuadra' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function facturacion.apuntar_los_descuentos(uuid, uuid, uuid[], timestamptz) from public;
grant execute on function facturacion.apuntar_los_descuentos(uuid, uuid, uuid[], timestamptz) to estook_api;

-- Las señales de ese cliente que se pueden descontar: el número entero, como `el_cliente_por_su_numero`.
create function facturacion.las_senales_del_cliente(p_local uuid, p_identificador text)
returns table (id uuid, serie text, numero integer, fecha date, queda integer, lineas jsonb)
language plpgsql
stable
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
#variable_conflict use_column
declare
  la_empresa uuid;
  el_entorno text;
begin
  if not estook.puede_editar('accion.factura_a_mano', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  select e.id, e.entorno into la_empresa, el_entorno
    from estook.local l
    join estook.empresa e on e.id = l.empresa_id
   where l.id = p_local;
  return query
    select d.id, d.serie, d.numero, (d.preparado_en at time zone l.zona_horaria)::date,
           facturacion.lo_que_queda(d.id), d.lineas
      from facturacion.documento d
      join estook.local l on l.id = d.local_id
     where d.empresa_id = la_empresa
       and d.entorno = el_entorno
       and d.local_id = p_local
       and d.destinatario ->> 'identificador' = upper(replace(p_identificador, ' ', ''))
       and facturacion.es_senal(d.id)
       and facturacion.sigue_en_pie(d.id)
       and not facturacion.anulacion_en_curso(d.id)
       and not facturacion.esta_descontada(d.id)
       and not exists (
         select 1 from facturacion.rectificacion r
          where r.documento_id = d.id and r.clase = 'datos'
            and facturacion.sigue_en_pie(r.rectificativa_id)
       )
       and facturacion.lo_que_queda(d.id) > 0
     order by d.preparado_en
     limit 20;
end;
$$;

revoke all on function facturacion.las_senales_del_cliente(uuid, text) from public;
grant execute on function facturacion.las_senales_del_cliente(uuid, text) to estook_api;

-- ═══ 8 · Lo rechazado se corrige con otro documento ════════════════════════════

-- La de la 0108, entera, con una cosa más: **un ticket con una devolución no se canjea**, porque el
-- importe ya no sería el suyo (Anexo 5.3), ni uno que se está anulando.
create or replace function facturacion.apuntar_el_canje(
  p_local    uuid,
  p_factura  uuid,
  p_tickets  uuid[],
  p_total    integer,
  p_en       timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  el_ticket   uuid;
  fila        facturacion.documento%rowtype;
  la_factura  facturacion.documento%rowtype;
  la_suma     integer := 0;
begin
  if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_tickets, 1), 0) = 0 then
    raise exception 'sin_tickets' using errcode = 'P0001';
  end if;
  select * into la_factura from facturacion.documento d where d.id = p_factura;
  if la_factura.id is null or la_factura.local_id <> p_local or la_factura.tipo <> 'F3' then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  foreach el_ticket in array (select array_agg(t order by t) from unnest(p_tickets) t)
  loop
    perform pg_advisory_xact_lock(hashtextextended('documento|' || el_ticket::text, 0));
    perform pg_advisory_xact_lock(hashtextextended('canje|' || el_ticket::text, 0));
    select * into fila from facturacion.documento d where d.id = el_ticket;
    if fila.id is null or fila.local_id <> p_local or fila.tipo <> 'F2' then
      raise exception 'no_es_un_ticket' using errcode = 'P0001';
    end if;
    if fila.entorno <> la_factura.entorno or fila.empresa_id <> la_factura.empresa_id then
      raise exception 'ticket_de_otro_entorno' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from facturacion.canje c
       where c.ticket_id = el_ticket and facturacion.sigue_en_pie(c.factura_id)
    ) then
      raise exception 'ya_tiene_factura' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from facturacion.rectificacion r
       where r.documento_id = el_ticket and facturacion.sigue_en_pie(r.rectificativa_id)
    ) then
      raise exception 'tiene_una_devolucion' using errcode = 'P0001';
    end if;
    if facturacion.anulacion_en_curso(el_ticket) then
      raise exception 'se_esta_anulando' using errcode = 'P0001';
    end if;
    if fila.modalidad = 'verifactu' then
      if not facturacion.sigue_en_pie(el_ticket) then
        raise exception 'ticket_no_valido' using errcode = 'P0001';
      end if;
      if not exists (select 1 from facturacion.registro r where r.documento_id = el_ticket) then
        raise exception 'ticket_sin_registrar' using errcode = 'P0001';
      end if;
    end if;
    la_suma := la_suma + fila.total;
    insert into facturacion.canje (ticket_id, factura_id, en) values (el_ticket, p_factura, p_en);
  end loop;
  -- El importe es el de los tickets, al céntimo (Anexo 5.3).
  if la_suma <> p_total then
    raise exception 'el_importe_no_cuadra' using errcode = 'P0001';
  end if;
end;
$$;

-- **Lo que iba con el rechazado pasa al nuevo**: los tickets que sustituía, lo que descontaba, lo que
-- rectificaba y si estaba cobrado. Todo se vuelve a mirar: mientras tanto otro pudo hacerlo por su
-- cuenta. Y el rechazado deja de salir arriba, porque ya está corregido (maqueta del 6-nov, 1).
create function facturacion.apuntar_lo_rehecho(
  p_original  uuid,
  p_nuevo     uuid,
  p_en        timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = facturacion, estook, pg_catalog, pg_temp
as $$
declare
  el_viejo  facturacion.documento%rowtype;
  el_nuevo  facturacion.documento%rowtype;
  rect      facturacion.rectificacion%rowtype;
  rectifica facturacion.documento%rowtype;
  fila      record;
begin
  perform pg_advisory_xact_lock(hashtextextended('documento|' || p_original::text, 0));
  select * into el_viejo from facturacion.documento d where d.id = p_original;
  select * into el_nuevo from facturacion.documento d where d.id = p_nuevo;
  if el_viejo.id is null or el_nuevo.id is null or el_viejo.local_id <> el_nuevo.local_id
     or el_viejo.tipo <> el_nuevo.tipo then
    raise exception 'no_existe' using errcode = 'P0001';
  end if;
  if not estook.puede_editar('accion.corregir_datos', el_viejo.local_id) then
    raise exception 'sin_permiso' using errcode = 'P0001';
  end if;
  -- Un documento en pie no se rehace, y uno anulado tampoco: se anuló porque no debía existir.
  if facturacion.sigue_en_pie(p_original) or exists (
    select 1 from facturacion.registro r
     where r.documento_id = p_original and lower(btrim(r.estado)) = 'anulado'
  ) then
    raise exception 'no_esta_rechazado' using errcode = 'P0001';
  end if;
  if exists (select 1 from facturacion.rehecho h where h.original_id = p_original) then
    raise exception 'ya_corregida' using errcode = 'P0001';
  end if;

  for fila in select c.ticket_id from facturacion.canje c where c.factura_id = p_original
  loop
    if exists (
      select 1 from facturacion.canje c
       where c.ticket_id = fila.ticket_id and facturacion.sigue_en_pie(c.factura_id)
    ) then
      raise exception 'ya_tiene_factura' using errcode = 'P0001';
    end if;
    insert into facturacion.canje (ticket_id, factura_id, en) values (fila.ticket_id, p_nuevo, p_en);
  end loop;

  for fila in select d.senal_id, d.importe from facturacion.descuento_de_senal d where d.factura_id = p_original
  loop
    if facturacion.esta_descontada(fila.senal_id) then
      raise exception 'senal_descontada' using errcode = 'P0001';
    end if;
    insert into facturacion.descuento_de_senal (senal_id, factura_id, importe, en)
    values (fila.senal_id, p_nuevo, fila.importe, p_en);
  end loop;

  select * into rect from facturacion.rectificacion r where r.rectificativa_id = p_original;
  if rect.rectificativa_id is not null then
    select * into rectifica from facturacion.documento d where d.id = rect.documento_id;
    perform facturacion.mirar_lo_rectificable(rectifica);
    if rect.clase = 'devolucion' then
      perform facturacion.cabe_lo_devuelto(rectifica, rect.lineas, el_nuevo.total);
    end if;
    insert into facturacion.rectificacion (
      rectificativa_id, documento_id, clase, motivo, lineas, base_rectificada, cuota_rectificada,
      tambien, de_senal, por, en
    ) values (
      p_nuevo, rect.documento_id, rect.clase, rect.motivo, rect.lineas, rect.base_rectificada,
      rect.cuota_rectificada, rect.tambien, rect.de_senal, estook.persona_actual(), p_en
    );
  end if;

  insert into facturacion.cobro_de_factura (documento_id, en, por)
  select p_nuevo, c.en, c.por from facturacion.cobro_de_factura c where c.documento_id = p_original;

  insert into facturacion.rehecho (original_id, nuevo_id, por, en)
  values (p_original, p_nuevo, estook.persona_actual(), p_en);
end;
$$;

revoke all on function facturacion.apuntar_lo_rehecho(uuid, uuid, timestamptz) from public;
grant execute on function facturacion.apuntar_lo_rehecho(uuid, uuid, timestamptz) to estook_api;

-- ═══ 9 · Preparar (la función de la 0109, entera) ══════════════════════════════

-- Cada origen nuevo, con su permiso. **Lo que rehace un rechazado** lo prepara quien corrige, sea el
-- origen que sea. `p_correo` se va: ya no se usaba (0139), y la API desplegada no lo manda.
drop function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, text);

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
  p_en               timestamptz,
  p_destinatario     jsonb default null,
  p_vencimiento      date default null,
  p_rehace           uuid default null
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
  -- Cada origen, con su permiso (0137). El cobro llegará con T7.
  if p_rehace is not null then
    if not estook.puede_editar('accion.corregir_datos', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
    if p_origen not in ('ticket_de_prueba', 'cobro', 'canje', 'a_mano', 'senal', 'devolucion', 'correccion') then
      raise exception 'origen_desconocido' using errcode = 'P0001';
    end if;
  elsif p_origen = 'ticket_de_prueba' then
    perform estook.la_organizacion_del_alta(p_local);
  elsif p_origen = 'canje' then
    if not estook.puede_editar('accion.factura_de_un_ticket', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen in ('a_mano', 'senal') then
    if not estook.puede_editar('accion.factura_a_mano', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'devolucion' then
    if not estook.puede_editar('accion.devolver', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  elsif p_origen = 'correccion' then
    if not estook.puede_editar('accion.corregir_datos', p_local) then
      raise exception 'sin_permiso' using errcode = 'P0001';
    end if;
  else
    raise exception 'origen_desconocido' using errcode = 'P0001';
  end if;

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
  -- La operación puede ser de antes, nunca de después: Verifacti lo rechazaría.
  if p_fecha_operacion > (p_en at time zone el_local.zona_horaria)::date then
    raise exception 'fecha_futura' using errcode = 'P0001';
  end if;

  el_tipo := case when p_tipo = 'F2' then 'ticket'
                  when p_tipo in ('F1', 'F3') then 'factura'
                  else 'rectificativa' end;
  select * into la_serie from facturacion.serie s
   where s.local_id = p_local and s.tipo = el_tipo
   order by s.puesta_en desc
   limit 1;
  if la_serie.id is null or la_serie.empresa_id <> la_empresa.id then
    raise exception 'falta_la_serie' using errcode = 'P0001';
  end if;

  -- **El año en que se hace**, en la hora del local: una factura de enero por una comida de
  -- diciembre no se numera en la serie del año pasado.
  el_texto := la_serie.prefijo || '-'
              || to_char(p_en at time zone el_local.zona_horaria, 'YYYY') || '-';
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
    preparado_por, desde_terminal, preparado_en, destinatario, vencimiento
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
    nullif(btrim(coalesce(p_donde, '')), ''), p_origen, estook.persona_actual(), p_terminal, p_en,
    p_destinatario, p_vencimiento
  )
  returning facturacion.documento.id into el_id;

  return query select el_id, el_texto, el_numero;
end;
$$;

comment on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, uuid) is
  'Prepara un documento con su número, con el candado de su serie (Anexo 4.9, pasos 1 a 4). Lo que va a Verifacti, fuera (0136).';

revoke all on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, uuid) from public;
grant execute on function facturacion.preparar_el_documento(uuid, text, date, text, jsonb, jsonb, integer, integer, integer, text, text, uuid, timestamptz, jsonb, date, uuid) to estook_api;
