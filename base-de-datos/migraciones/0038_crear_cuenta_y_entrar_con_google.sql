-- 0038 · Crear cuenta y entrar con Google (antes de M8 · decisión 0042)
--
-- «Me interesaría que se puedan registrar con Google. Si dan a crear cuenta,
--  pueden hacerlo con correo normal y verificación o con Google; y si dan a
--  iniciar sesión, con su cuenta, con PIN o con Google.» Y: «entra y monta su
--  negocio y paga directamente; de vez en cuando subiremos una prueba de 12 días,
--  y desde el admin manejamos si activamos la oferta o no».
--
-- Hasta aquí no había registro abierto (Manifiesto 31). Esta migración lo abre:
--
--   1. **El registro que espera su código**: se guarda lo escrito y la huella de
--      un código de seis cifras que llega por correo. La cuenta no existe hasta
--      que se escribe el código.
--   2. **Las identidades de fuera**: una persona unida a su cuenta de Google.
--   3. **Crear la cuenta y el negocio de una vez**: persona, organización, local y
--      membresía de dirección, y la suscripción en prueba o pendiente de pago.
--   4. **La oferta de prueba**, que se enciende y se apaga desde el admin.
--   5. Dos cosas pequeñas: la sesión sabe que se entró con Google, y la suscripción
--      puede estar «pendiente de pago».
--
-- **Siete funciones con privilegio**, y todas por la misma razón que las once de la
-- 0018: se usan **antes de que haya nadie dentro**. Quien crea su cuenta todavía no
-- es una persona, así que ninguna política le deja leer ni escribir; cada función
-- hace una sola cosa y comprueba lo suyo.

-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · Lo pequeño, primero
-- ═══════════════════════════════════════════════════════════════════════════

-- Un valor nuevo de un tipo enumerado no se puede **usar** en la misma
-- transacción en que se añade: aquí solo se nombra dentro de funciones, que se
-- resuelven al ejecutarlas.
alter type estook.estado_de_suscripcion add value if not exists 'pendiente_de_pago' after 'prueba';

alter table estook.sesion drop constraint if exists sesion_entro_con_conocido;
alter table estook.sesion
  add constraint sesion_entro_con_conocido check (entro_con in ('contrasena', 'pin', 'google'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · El registro que espera su código
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.registro_pendiente (
  id                 uuid         primary key default gen_random_uuid(),
  -- Uno por correo: pedir otro código sustituye al anterior.
  correo             text         not null unique,
  nombre             text         not null,
  negocio            text         not null,
  -- La contraseña ya derivada, igual que en `credencial`. En claro, nunca.
  derivada           text         not null,
  -- La huella del código de seis cifras, derivada como una contraseña.
  huella_del_codigo  text         not null,
  intentos           smallint     not null default 0,
  ultimo_envio_en    timestamptz  not null default now(),
  caduca_en          timestamptz  not null,
  ip                 text,
  creado_en          timestamptz  not null default now(),
  constraint registro_pendiente_correo_en_minusculas check (correo = lower(correo)),
  constraint registro_pendiente_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint registro_pendiente_negocio_no_vacio check (length(btrim(negocio)) > 0),
  constraint registro_pendiente_intentos_no_negativos check (intentos >= 0)
);

comment on table estook.registro_pendiente is
  'Una cuenta que se está creando y espera el código del correo. No es nadie todavía: solo la tocan sus funciones (0042).';

-- Cada código que sale, con su dirección: es lo que frena a quien intenta crear
-- cien cuentas o mandar correos desde nuestro dominio a gente que no los ha pedido.
create table estook.envio_de_codigo (
  id          bigint       generated always as identity primary key,
  ip          text,
  enviado_en  timestamptz  not null default now()
);

create index envio_de_codigo_por_ip on estook.envio_de_codigo (ip, enviado_en desc);

comment on table estook.envio_de_codigo is
  'Cuándo y desde dónde se ha mandado un código de registro. Solo para el límite por dirección (0042).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · Las identidades de fuera
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.identidad_externa (
  id             uuid         primary key default gen_random_uuid(),
  persona_id     uuid         not null references estook.persona (id) on delete restrict,
  proveedor      text         not null,
  -- El identificador que da el proveedor. **No el correo**: el correo de una
  -- cuenta de Google puede cambiar, y el identificador no.
  sujeto         text         not null,
  -- El correo que traía la última vez, para enseñarlo en «Mi acceso».
  correo         text         not null,
  creada_en      timestamptz  not null default now(),
  ultimo_uso_en  timestamptz  not null default now(),
  constraint identidad_externa_proveedor_conocido check (proveedor in ('google')),
  constraint identidad_externa_sujeto_no_vacio check (length(btrim(sujeto)) > 0),
  unique (proveedor, sujeto),
  unique (persona_id, proveedor)
);

comment on table estook.identidad_externa is
  'Una persona unida a su cuenta de un proveedor (hoy, Google). Se busca por el sujeto, no por el correo (0042).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · La oferta de prueba
-- ═══════════════════════════════════════════════════════════════════════════

create table plataforma.oferta_de_prueba (
  -- Una sola fila, y lo dice la base.
  unica         boolean      primary key default true,
  activa        boolean      not null default false,
  dias          smallint     not null default 12,
  cambiada_en   timestamptz  not null default now(),
  cambiada_por  uuid             null references estook.persona (id) on delete restrict,
  constraint oferta_de_prueba_una_sola check (unica),
  constraint oferta_de_prueba_dias_razonables check (dias between 1 and 90)
);

comment on table plataforma.oferta_de_prueba is
  'Si quien crea su cuenta tiene días de prueba o paga al empezar. Una sola fila; la cambia un admin total (0042).';

insert into plataforma.oferta_de_prueba (unica) values (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Las siete funciones con privilegio
-- ═══════════════════════════════════════════════════════════════════════════

-- 1 · Pedir un código. Cuenta y frena **antes** de guardar nada.
--
-- Con `p_huella` nula no guarda ningún registro: es el caso de un correo que ya
-- tiene cuenta, al que se le manda otro correo («ya tienes cuenta») y que también
-- tiene que contar, o se podría bombardear de correos a cualquiera.
create function estook.pedir_codigo_de_registro(
  p_correo text,
  p_nombre text,
  p_negocio text,
  p_derivada text,
  p_huella text,
  p_ip text,
  p_minutos integer,
  p_segundos_entre_envios integer,
  p_por_direccion_a_la_hora integer
)
returns text
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  el_correo text := lower(btrim(p_correo));
  recientes integer;
  ultimo    timestamptz;
begin
  if p_ip is not null then
    select count(*) into recientes
      from estook.envio_de_codigo
     where ip = p_ip and enviado_en > now() - interval '1 hour';
    if recientes >= p_por_direccion_a_la_hora then
      return 'demasiados';
    end if;
  end if;

  select ultimo_envio_en into ultimo from estook.registro_pendiente where correo = el_correo;
  if ultimo is not null and ultimo > now() - make_interval(secs => p_segundos_entre_envios) then
    return 'espera';
  end if;

  insert into estook.envio_de_codigo (ip) values (p_ip);

  if p_huella is null then
    return 'sin_guardar';
  end if;

  insert into estook.registro_pendiente (
    correo, nombre, negocio, derivada, huella_del_codigo, intentos, ultimo_envio_en, caduca_en, ip
  )
  values (
    el_correo, btrim(p_nombre), btrim(p_negocio), p_derivada, p_huella, 0, now(),
    now() + make_interval(mins => p_minutos), p_ip
  )
  on conflict (correo) do update
    set nombre = excluded.nombre,
        negocio = excluded.negocio,
        derivada = excluded.derivada,
        huella_del_codigo = excluded.huella_del_codigo,
        intentos = 0,
        ultimo_envio_en = now(),
        caduca_en = excluded.caduca_en,
        ip = excluded.ip;

  return 'guardado';
end;
$$;

comment on function estook.pedir_codigo_de_registro(text, text, text, text, text, text, integer, integer, integer) is
  'Guarda el registro que espera su código, con el límite por dirección y por correo. Sin huella, solo cuenta el envío.';

-- 2 · Leer el registro de un correo, si no ha caducado.
create function estook.registro_pendiente_de(p_correo text)
returns table (
  registro_id        uuid,
  nombre             text,
  negocio            text,
  derivada           text,
  huella_del_codigo  text,
  intentos           smallint
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select r.id, r.nombre, r.negocio, r.derivada, r.huella_del_codigo, r.intentos
    from estook.registro_pendiente r
   where r.correo = lower(btrim(p_correo))
     and r.caduca_en > now()
$$;

-- 3 · Apuntar un intento. Acertar o agotar los intentos lo borra: un registro
-- pendiente no es nada de nadie, y un código gastado no tiene que quedarse.
create function estook.anotar_intento_de_registro(
  p_registro uuid,
  p_acierta boolean,
  p_intentos_maximos integer
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if p_acierta then
    delete from estook.registro_pendiente where id = p_registro;
    return;
  end if;

  update estook.registro_pendiente set intentos = intentos + 1 where id = p_registro;
  delete from estook.registro_pendiente where id = p_registro and intentos >= p_intentos_maximos;
end;
$$;

-- 4 · Crear la cuenta y el negocio, de una vez.
--
-- Una sola transacción: o nace todo o no nace nada. Una persona sin negocio
-- vería «tu cuenta no está asociada a ningún negocio», y un negocio sin nadie
-- dentro no lo podría abrir nadie.
create function estook.crear_cuenta_con_negocio(
  p_correo text,
  p_nombre text,
  p_apellidos text,
  p_derivada text,
  p_negocio text,
  p_codigo_base text,
  p_dias_de_prueba integer,
  p_proveedor text,
  p_sujeto text
)
returns table (persona_id uuid, organizacion_id uuid, local_id uuid)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  el_correo    text := lower(btrim(p_correo));
  la_persona   uuid;
  la_org       uuid;
  el_local     uuid;
  el_codigo    text := p_codigo_base;
  vuelta       integer := 0;
begin
  if exists (select 1 from estook.persona p where p.correo = el_correo) then
    raise exception 'Ya hay una cuenta con ese correo.' using errcode = '23505';
  end if;

  insert into estook.persona (correo, nombre, apellidos, es_ejemplo)
  values (el_correo, btrim(p_nombre), nullif(btrim(coalesce(p_apellidos, '')), ''), false)
  returning id into la_persona;

  if p_derivada is not null then
    insert into estook.credencial (persona_id, derivada, debe_cambiarla)
    values (la_persona, p_derivada, false);
  end if;

  if p_sujeto is not null then
    insert into estook.identidad_externa (persona_id, proveedor, sujeto, correo)
    values (la_persona, p_proveedor, p_sujeto, el_correo);
  end if;

  -- El código de la organización es único en todo Estook: si ya existe, se le
  -- pone un número detrás. Dos bares que se llaman igual son dos bares.
  while exists (select 1 from estook.organizacion o where o.codigo = el_codigo) loop
    vuelta := vuelta + 1;
    el_codigo := left(p_codigo_base, 40) || '-' || vuelta;
  end loop;

  insert into estook.organizacion (codigo, nombre, usa_areas, es_ejemplo)
  values (el_codigo, btrim(p_negocio), false, false)
  returning id into la_org;

  -- El local nace con el alta **sin empezar**: al entrar, las ocho preguntas.
  insert into estook.local (organizacion_id, area_id, codigo, nombre, zona_horaria, es_ejemplo)
  values (la_org, null, el_codigo, btrim(p_negocio), 'Europe/Madrid', false)
  returning id into el_local;

  -- Dirección y de organización: es su negocio, lo ve todo, y un segundo local
  -- le sale solo sin tocar nada.
  insert into estook.membresia (persona_id, organizacion_id, alcance, rol)
  values (la_persona, la_org, 'organizacion', 'direccion');

  -- La suscripción la creó el disparador de la 0018 en prueba de catorce días. Aquí
  -- se pone lo que toca: los días de la oferta, o pendiente de pago.
  if p_dias_de_prueba is not null then
    update estook.suscripcion
       set estado = 'prueba', prueba_hasta = current_date + p_dias_de_prueba
     where suscripcion.organizacion_id = la_org;
  else
    update estook.suscripcion
       set estado = 'pendiente_de_pago', prueba_hasta = null
     where suscripcion.organizacion_id = la_org;
  end if;

  return query select la_persona, la_org, el_local;
end;
$$;

comment on function estook.crear_cuenta_con_negocio(text, text, text, text, text, text, integer, text, text) is
  'Persona, organización, local, membresía de dirección y suscripción, de una vez. Falla si el correo ya tiene cuenta (0042).';

-- 5 · Quién es esta identidad de fuera: por su sujeto, y si no, por su correo.
create function estook.persona_por_identidad(p_proveedor text, p_sujeto text, p_correo text)
returns table (persona_id uuid, activa boolean, es_ejemplo boolean, ya_unida boolean)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  (
    select p.id, p.activa, p.es_ejemplo, true
      from estook.identidad_externa i
      join estook.persona p on p.id = i.persona_id
     where i.proveedor = p_proveedor and i.sujeto = p_sujeto
  )
  union all
  (
    select p.id, p.activa, p.es_ejemplo, false
      from estook.persona p
     where p.correo = lower(btrim(p_correo))
       and not exists (
         select 1 from estook.identidad_externa i
          where i.proveedor = p_proveedor and i.sujeto = p_sujeto
       )
  )
  limit 1
$$;

-- 6 · Unir (o volver a tocar) una identidad de fuera a una persona.
create function estook.unir_identidad(p_persona uuid, p_proveedor text, p_sujeto text, p_correo text)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if exists (select 1 from estook.persona p where p.id = p_persona and p.es_ejemplo) then
    raise exception 'Una persona de ejemplo no se une a una cuenta de fuera.' using errcode = '42501';
  end if;

  insert into estook.identidad_externa (persona_id, proveedor, sujeto, correo)
  values (p_persona, p_proveedor, p_sujeto, lower(btrim(p_correo)))
  on conflict (proveedor, sujeto) do update
    set correo = excluded.correo, ultimo_uso_en = now()
  where identidad_externa.persona_id = p_persona;
end;
$$;

-- 7 · La oferta que está puesta, para quien todavía no ha entrado: la web y la
-- pantalla de crear cuenta la enseñan.
create function plataforma.oferta_vigente()
returns table (activa boolean, dias smallint)
language sql
stable
security definer
set search_path = plataforma, pg_catalog, pg_temp
as $$
  select o.activa, o.dias from plataforma.oferta_de_prueba o where o.unica
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad por filas y permisos
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.registro_pendiente  enable row level security;
alter table estook.envio_de_codigo     enable row level security;
alter table estook.identidad_externa   enable row level security;
alter table plataforma.oferta_de_prueba enable row level security;

-- El registro y los envíos no los lee ni los escribe nadie más que sus funciones:
-- **sin política** a propósito, igual que las tablas de referencia sin escritura.
revoke all on estook.registro_pendiente from public, estook_api;
revoke all on estook.envio_de_codigo from public, estook_api;

-- Tus identidades, las ves tú.
create policy identidad_externa_la_propia on estook.identidad_externa
  for select using (persona_id = estook.persona_actual());

revoke all on estook.identidad_externa from public;
grant select on estook.identidad_externa to estook_api;

-- La oferta la lee y la cambia un admin; el público la lee por `oferta_vigente`.
create policy oferta_de_prueba_lectura on plataforma.oferta_de_prueba
  for select using (plataforma.nivel_de(estook.persona_actual()) is not null);

create policy oferta_de_prueba_escritura on plataforma.oferta_de_prueba
  for update using (plataforma.nivel_de(estook.persona_actual()) = 'total')
  with check (plataforma.nivel_de(estook.persona_actual()) = 'total');

revoke all on plataforma.oferta_de_prueba from public;
grant select, update on plataforma.oferta_de_prueba to estook_api;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.pedir_codigo_de_registro(text, text, text, text, text, text, integer, integer, integer)',
    'estook.registro_pendiente_de(text)',
    'estook.anotar_intento_de_registro(uuid, boolean, integer)',
    'estook.crear_cuenta_con_negocio(text, text, text, text, text, text, integer, text, text)',
    'estook.persona_por_identidad(text, text, text)',
    'estook.unir_identidad(uuid, text, text, text)',
    'plataforma.oferta_vigente()'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;
