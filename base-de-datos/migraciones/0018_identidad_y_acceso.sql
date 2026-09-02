-- 0018 · Identidad y acceso
--
-- Modulo M4. Aqui nace lo que M1 dejo esperando y M2 y M3 fueron rodeando: quien
-- entra, con que, desde donde y a que local esta mirando.
--
-- Hasta hoy la API se creia lo que le dijeran: `x-persona-id` en una cabecera y a
-- correr. Era correcto mientras no hubiera login —lo dice cada comentario que lo
-- rodea— pero es exactamente lo que la regla 4 prohibe dejar puesto. Esta
-- migracion trae lo que hace falta para que la identidad se demuestre, no se
-- declare.
--
-- ── Las cinco tablas ─────────────────────────────────────────────────────────
--
--   credencial     la contrasena de una persona. Una, aunque trabaje en seis sitios
--   pin            el PIN, que es por local y unico dentro de el
--   doble_factor   el segundo factor, exigible desde la organizacion
--   sesion         una visita viva, con su contexto (organizacion y local)
--   suscripcion    el estado de la cuenta, que es la primera de las seis
--                  comprobaciones al entrar. La cobra M26; aqui solo se declara
--
-- ── Lo que NO hay aqui, y es a proposito ─────────────────────────────────────
--
-- **No se guarda ninguna contrasena, ni ningun PIN.** Se guarda el resultado de
-- pasarlos por una funcion de derivacion lenta, y esa funcion vive en el
-- servidor (`servidor/dominio/contrasenas.ts`), no aqui.
--
-- La razon es la misma que la de la decision 0009, y ya nos costo una vez:
-- `pgcrypto` **no existe en el Postgres efimero de las pruebas**. Hacer el hash
-- en SQL dejaria el login entero sin poder probarse en dos de las tres capas.
-- Se hace con PBKDF2 sobre la Web Crypto del propio lenguaje, que existe igual
-- en Node, en Deno y en el navegador. Esta escrito en la decision 0010.
--
-- **Tampoco hay tabla de invitaciones.** Invitar es crear (o encontrar) la
-- persona, darle su membresia y generarle el PIN del local. Quien no ha aceptado
-- todavia es quien no tiene credencial y no ha entrado nunca; eso ya se sabe sin
-- una tabla mas, y la auditoria guarda quien invito a quien y cuando.

-- ── Suscripcion ───────────────────────────────────────────────────────────────
--
-- «Suscripcion: prueba → activa → impago → solo lectura → archivada, y desde
--  cualquiera de ellas de vuelta a activa pagando» (Auditoria de flujos, Parte 4).
--
-- Es la **primera** de las seis comprobaciones al entrar, asi que tiene que
-- existir antes que el login. Quien la mueve de estado es M26, con Stripe. Aqui
-- solo se declara la maquina y se deja a todo el mundo en prueba.

create type estook.estado_de_suscripcion as enum (
  'prueba',
  'activa',
  'impago',
  'solo_lectura',
  'archivada'
);

comment on type estook.estado_de_suscripcion is
  'La maquina de estado de la Auditoria de flujos. Desde cualquiera se vuelve a activa pagando.';

create table estook.suscripcion (
  organizacion_id  uuid                          primary key
                                                 references estook.organizacion (id) on delete restrict,
  estado           estook.estado_de_suscripcion  not null default 'prueba',
  -- «La prueba: 14 dias, sin tarjeta» (Manifiesto 28).
  prueba_hasta     date,
  -- Lo que M26 rellenara. Aqui nace vacio y no molesta a nadie.
  plan             text,
  creado_en        timestamptz                   not null default now(),
  actualizado_en   timestamptz                   not null default now(),
  constraint suscripcion_prueba_con_fecha check (estado <> 'prueba' or prueba_hasta is not null)
);

comment on table estook.suscripcion is
  'El estado de la cuenta. Se comprueba al entrar, antes que nada. La cobra M26.';

create trigger suscripcion_actualizada before update on estook.suscripcion
  for each row execute function estook.marcar_actualizado();

-- Las organizaciones que ya existen entran en prueba de catorce dias.
insert into estook.suscripcion (organizacion_id, estado, prueba_hasta)
select o.id, 'prueba', current_date + 14 from estook.organizacion o
on conflict (organizacion_id) do nothing;

-- Y las que vengan, tambien: sin esto, una organizacion nueva no podria entrar
-- nunca, porque la primera comprobacion no encontraria su fila.
create or replace function estook.suscripcion_al_crear_organizacion()
returns trigger
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  insert into estook.suscripcion (organizacion_id, estado, prueba_hasta)
  values (new.id, 'prueba', current_date + 14)
  on conflict (organizacion_id) do nothing;
  return new;
end;
$$;

create trigger organizacion_nace_en_prueba
  after insert on estook.organizacion
  for each row execute function estook.suscripcion_al_crear_organizacion();

-- ── Lo que la organizacion exige ──────────────────────────────────────────────
--
-- «Doble factor disponible y **exigible desde la organizacion**» y «segundo
--  administrador o correo de recuperacion obligatorio» (Plan, M4).

alter table estook.organizacion
  add column exige_doble_factor    boolean not null default false,
  add column correo_de_recuperacion text;

comment on column estook.organizacion.exige_doble_factor is
  'Si esta puesto, nadie de la organizacion entra sin su segundo factor.';
comment on column estook.organizacion.correo_de_recuperacion is
  'La otra mitad de «segundo administrador o correo de recuperacion obligatorio». Se comprueba en estook.tiene_como_volver_a_entrar().';

alter table estook.organizacion
  add constraint organizacion_correo_de_recuperacion_con_forma check (
    correo_de_recuperacion is null
    or correo_de_recuperacion ~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'
  );

-- ── Lo que el local necesita para los PIN ─────────────────────────────────────
--
-- La sal del PIN es **del local, no de la persona**, y esa decision es la que
-- hace posible «PIN unico por local» de verdad:
--
--   · Con sal por persona, dos personas con el mismo PIN darian hashes distintos
--     y la unicidad habria que comprobarla a mano, verificando el candidato
--     contra todos los PIN del local. Comprobar a mano se olvida.
--   · Con sal por local, el mismo PIN da el mismo hash, y **lo impide un indice
--     unico**. Como todo lo demas en este proyecto: la base de datos, no el
--     cuidado de quien escribe.
--
-- Lo que se pierde: quien tuviera la base de datos entera podria ver que dos
-- locales distintos usan PIN distintos, pero no cual. Y podria recorrer el millon
-- de PIN posibles de un local. Eso ultimo es cierto **con cualquier sal**, porque
-- un PIN de seis digitos tiene un millon de combinaciones y el atacante ya tiene
-- la sal delante. Por eso la derivacion es lenta a proposito: ese recorrido pasa
-- de segundos a dias. Y por eso el PIN identifica pero no firma (Manifiesto 25).
--
-- Se puebla con `gen_random_uuid()`, que es de Postgres y no de pgcrypto.

alter table estook.local
  add column sal_del_pin text not null default replace(gen_random_uuid()::text, '-', '');

comment on column estook.local.sal_del_pin is
  'Sal compartida por los PIN de este local. Es lo que permite que «PIN unico por local» lo garantice un indice unico.';

-- «Si no ha terminado el onboarding, sigue por donde iba» · quinta comprobacion.
-- El alta es de un local y son ocho pasos (M5). Aqui solo se guarda por donde va.
alter table estook.local
  add column onboarding_paso       smallint not null default 0,
  add column onboarding_terminado  boolean  not null default false;

comment on column estook.local.onboarding_paso is
  'Por que paso de los ocho del alta va este local. Lo mueve M5; M4 solo lo lee para decidir a donde entrar.';

alter table estook.local
  add constraint local_onboarding_en_rango check (onboarding_paso between 0 and 8);

-- Los locales sembrados estan montados: no se les manda al alta.
update estook.local set onboarding_paso = 8, onboarding_terminado = true;

-- ── «Retirar el acceso mata el PIN AL INSTANTE» ───────────────────────────────
--
-- Hasta M4, una membresia se cerraba poniendole `hasta`. Y `hasta` es una fecha,
-- no un instante, asi que «al instante» no podia ser verdad:
--
--   · Poniendo `hasta = hoy`, la persona sigue viendo el local hasta medianoche,
--     porque la vigencia se comprueba con `hasta >= current_date`.
--   · Poniendo `hasta = ayer` se rompe: a quien entro **hoy** le quedaria una
--     membresia que acaba antes de empezar, y la restriccion
--     `membresia_vigencia_coherente` de la 0002 lo impide, con razon.
--
-- Lo encontro una prueba, no la pantalla: retirar el acceso a alguien que habia
-- entrado ese mismo dia fallaba con un error de base de datos en la cara.
--
-- La solucion no es apanar la fecha: es que **la revocacion tenga hora**. `desde`
-- y `hasta` siguen contando la verdad —«fue camarera de marzo a agosto»— y
-- `revocada_en` dice el segundo exacto en que dejo de tener acceso.
--
-- Es el mismo criterio que el resto del proyecto: una fecha operativa es una
-- fecha, pero un permiso se quita ya.

alter table estook.membresia
  add column revocada_en timestamptz;

comment on column estook.membresia.revocada_en is
  'El instante exacto en que se retiro el acceso. `hasta` cuenta el periodo; esto lo corta al segundo.';

create index membresia_revocada on estook.membresia (persona_id) where revocada_en is not null;

-- Y las cinco funciones de M1 que miran la vigencia, ampliadas para mirarla
-- tambien. Se sustituyen enteras porque `create or replace` no admite parches;
-- lo unico que cambia en cada una es la linea de `revocada_en`.

create or replace function estook.locales_visibles(p_persona uuid)
returns table (local_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct l.id
  from estook.local l
  join estook.membresia m on m.organizacion_id = l.organizacion_id
  where m.persona_id = p_persona
    and l.activo
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date)
    and (m.revocada_en is null or m.revocada_en > now())
    and (
      m.alcance = 'organizacion'
      or (m.alcance = 'area' and l.area_id = m.area_id)
      or (m.alcance = 'local' and l.id = m.local_id)
    )
$$;

create or replace function estook.organizaciones_visibles(p_persona uuid)
returns table (organizacion_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select distinct m.organizacion_id
  from estook.membresia m
  where m.persona_id = p_persona
    and m.desde <= current_date
    and (m.hasta is null or m.hasta >= current_date)
    and (m.revocada_en is null or m.revocada_en > now())
$$;

create or replace function estook.nivel_de_permiso(
  p_persona uuid,
  p_local uuid,
  p_permiso text
)
returns estook.nivel_de_permiso
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select coalesce(rec.nivel, pr.nivel)
      from estook.membresia m
      join estook.local l
        on l.id = p_local
       and l.organizacion_id = m.organizacion_id
      left join estook.permiso_de_rol pr
        on pr.rol = m.rol
       and pr.permiso = p_permiso
      left join estook.recorte_de_permiso rec
        on rec.membresia_id = m.id
       and rec.local_id = p_local
       and rec.permiso = p_permiso
      where m.persona_id = p_persona
        and l.activo
        and m.desde <= current_date
        and (m.hasta is null or m.hasta >= current_date)
        and (m.revocada_en is null or m.revocada_en > now())
        and (
          m.alcance = 'organizacion'
          or (m.alcance = 'area' and l.area_id = m.area_id)
          or (m.alcance = 'local' and l.id = m.local_id)
        )
        and (pr.nivel is not null or rec.nivel is not null)
      order by coalesce(rec.nivel, pr.nivel) desc
      limit 1
    ),
    'sin_acceso'
  )
$$;

create or replace function estook.nivel_de_permiso_en_organizacion(
  p_persona uuid,
  p_organizacion uuid,
  p_permiso text
)
returns estook.nivel_de_permiso
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select pr.nivel
      from estook.membresia m
      join estook.permiso_de_rol pr
        on pr.rol = m.rol
       and pr.permiso = p_permiso
      where m.persona_id = p_persona
        and m.organizacion_id = p_organizacion
        and m.desde <= current_date
        and (m.hasta is null or m.hasta >= current_date)
        and (m.revocada_en is null or m.revocada_en > now())
      order by pr.nivel desc
      limit 1
    ),
    'sin_acceso'
  )
$$;

-- ── Lo que la persona necesita ────────────────────────────────────────────────

alter table estook.persona
  add column ultimo_acceso_en timestamptz;

comment on column estook.persona.ultimo_acceso_en is
  'La ultima vez que entro. Quien no tiene credencial y no ha entrado nunca es quien tiene la invitacion sin aceptar.';

-- `auth_id` se queda, pero ya no significa lo que decia. La decision 0010 dice
-- por que el login es nuestro y no de Supabase Auth, y una columna cuyo
-- comentario miente es peor que una columna sin usar.
comment on column estook.persona.auth_id is
  'Sin usar. Nacio pensando en Supabase Auth; la decision 0010 dejo el login en nuestra API, por lo mismo que la 0005 dejo fuera auth.uid(). Se conserva por si algun dia hay identidad federada.';

-- ── Credencial · la contrasena ────────────────────────────────────────────────
--
-- Una por persona, no una por membresia: «un correo, una identidad» (Manifiesto
-- 28). Quien trabaja en dos empresas entra una sola vez y elige despues.

create table estook.credencial (
  persona_id         uuid         primary key references estook.persona (id) on delete restrict,
  -- El texto entero que devuelve la derivacion: algoritmo, coste, sal y resultado.
  -- Nunca la contrasena, y nunca solo el hash: los parametros van dentro para
  -- poder subir el coste sin invalidar lo guardado.
  derivada           text         not null,
  -- «Bloqueo a los cinco intentos» (Manifiesto 28), tambien para la contrasena.
  intentos_fallidos  smallint     not null default 0,
  bloqueada_hasta    timestamptz,
  cambiada_en        timestamptz  not null default now(),
  -- Quien recibe una contrasena puesta por otra persona la cambia al entrar.
  debe_cambiarla     boolean      not null default false,
  creado_en          timestamptz  not null default now(),
  actualizado_en     timestamptz  not null default now(),
  constraint credencial_derivada_con_forma check (derivada ~ '^pbkdf2-sha256\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$'),
  constraint credencial_intentos_en_rango check (intentos_fallidos between 0 and 100)
);

comment on table estook.credencial is
  'La contrasena de una persona, derivada y nunca guardada. La derivacion la hace el servidor: pgcrypto no existe en el Postgres de las pruebas (decision 0010).';

create trigger credencial_actualizada before update on estook.credencial
  for each row execute function estook.marcar_actualizado();

-- ── PIN · por local, y unico dentro de el ─────────────────────────────────────

create table estook.pin (
  id                 uuid         primary key default gen_random_uuid(),
  persona_id         uuid         not null references estook.persona (id) on delete restrict,
  local_id           uuid         not null references estook.local (id) on delete restrict,
  -- Derivado con la sal DEL LOCAL, asi que el mismo PIN da la misma huella y el
  -- indice unico de abajo hace cumplir «PIN unico por local».
  huella             text         not null,
  intentos_fallidos  smallint     not null default 0,
  bloqueado_hasta    timestamptz,
  creado_en          timestamptz  not null default now(),
  actualizado_en     timestamptz  not null default now(),
  constraint pin_huella_con_forma check (huella ~ '^pbkdf2-sha256\$[0-9]+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$'),
  constraint pin_intentos_en_rango check (intentos_fallidos between 0 and 100),
  -- Una persona tiene un PIN por local, no dos.
  constraint pin_uno_por_persona_y_local unique (persona_id, local_id)
);

-- **Esta es la linea que cumple «PIN unico por local».** No un comentario, no una
-- comprobacion en el servidor: un indice.
create unique index pin_unico_en_su_local on estook.pin (local_id, huella);

comment on table estook.pin is
  'El PIN de una persona en un local. Retirar el acceso borra la fila, y el PIN muere al instante.';
comment on index estook.pin_unico_en_su_local is
  'Lo que hace verdad «PIN unico por local». Funciona porque la sal es del local (ver estook.local.sal_del_pin).';

create index pin_por_persona on estook.pin (persona_id);
create index pin_por_local on estook.pin (local_id);

create trigger pin_actualizado before update on estook.pin
  for each row execute function estook.marcar_actualizado();

-- ── Doble factor ──────────────────────────────────────────────────────────────
--
-- TOTP, el de las aplicaciones de autenticacion. El secreto se guarda tal cual
-- porque **tiene que poder leerse para verificar**: no es una contrasena, es una
-- clave compartida. Lo que lo protege es que solo lo devuelve una funcion con
-- permiso y que la fila solo la ve su duena.

create table estook.doble_factor (
  persona_id         uuid         primary key references estook.persona (id) on delete restrict,
  -- Base32, que es lo que entienden las aplicaciones de autenticacion.
  secreto            text         not null,
  -- Mientras no este confirmado con un codigo, no cuenta: si contara, alguien
  -- podria quedarse fuera por haber empezado a activarlo y no terminar.
  confirmado_en      timestamptz,
  -- Para cuando se pierde el telefono. Derivados, como las contrasenas.
  codigos_de_respaldo text[]      not null default '{}',
  creado_en          timestamptz  not null default now(),
  actualizado_en     timestamptz  not null default now(),
  constraint doble_factor_secreto_base32 check (secreto ~ '^[A-Z2-7]{16,64}$')
);

comment on table estook.doble_factor is
  'El segundo factor de una persona. Sin confirmar no cuenta: nadie se queda fuera por dejarlo a medias.';

create trigger doble_factor_actualizado before update on estook.doble_factor
  for each row execute function estook.marcar_actualizado();

-- ── Sesion ────────────────────────────────────────────────────────────────────
--
-- «Cambiar de local **no cierra la sesion**: cambia el contexto» (Manifiesto 28).
-- Por eso el contexto vive aqui y no en el navegador: si viviera en el navegador,
-- cambiarlo seria decirle al servidor a que local mirar, y eso es justo lo que
-- M1 avisa de no hacer.
--
-- Del token no se guarda el token: se guarda su huella. Quien robe la base de
-- datos no se lleva ni una sesion.

create table estook.sesion (
  id                    uuid         primary key default gen_random_uuid(),
  persona_id            uuid         not null references estook.persona (id) on delete restrict,
  dispositivo_id        uuid             null references estook.dispositivo (id) on delete set null,
  -- SHA-256 del token en hexadecimal. Sin sal: el token tiene 256 bits de azar,
  -- asi que no hay diccionario que recorrer y una derivacion lenta en cada
  -- peticion solo serviria para hacer la aplicacion lenta.
  huella                text         not null unique,
  -- El contexto. Cambiarlo NO abre sesion nueva.
  organizacion_id       uuid             null references estook.organizacion (id) on delete restrict,
  local_id              uuid             null references estook.local (id) on delete restrict,
  -- Con que se entro, para poder ensenarlo en «Mis dispositivos».
  entro_con             text         not null,
  -- Si la organizacion exige doble factor, la sesion nace a medias y no vale
  -- para nada hasta que se pasa el segundo factor.
  doble_factor_superado boolean      not null default true,
  creada_en             timestamptz  not null default now(),
  ultima_actividad_en   timestamptz  not null default now(),
  caduca_en             timestamptz  not null,
  cerrada_en            timestamptz,
  -- Quien la cerro. Nulo si se cerro sola o la cerro su duena.
  cerrada_por           uuid             null references estook.persona (id) on delete set null,
  constraint sesion_entro_con_conocido check (entro_con in ('contrasena', 'pin')),
  constraint sesion_huella_con_forma check (huella ~ '^[0-9a-f]{64}$'),
  constraint sesion_caduca_despues_de_nacer check (caduca_en > creada_en)
);

comment on table estook.sesion is
  'Una visita viva. El contexto (organizacion y local) vive aqui, para que cambiar de local no obligue a entrar otra vez.';
comment on column estook.sesion.huella is
  'SHA-256 del token. El token no se guarda en ningun sitio: si se pierde, se entra otra vez.';

create index sesion_viva_por_persona on estook.sesion (persona_id) where cerrada_en is null;
create index sesion_por_dispositivo on estook.sesion (dispositivo_id) where dispositivo_id is not null;

-- ── Version optimista, igual que las demas ────────────────────────────────────

do $$
declare
  la_tabla text;
begin
  foreach la_tabla in array array['suscripcion', 'credencial', 'pin', 'doble_factor']
  loop
    execute format(
      'alter table estook.%I add column version integer not null default 1', la_tabla
    );
    execute format(
      'create trigger %I before update on estook.%I for each row execute function estook.subir_version()',
      la_tabla || '_sube_version', la_tabla
    );
  end loop;
end
$$;

-- La sesion no lleva version: no se edita a dos manos, se abre y se cierra.

-- ── Las funciones de entrar ───────────────────────────────────────────────────
--
-- **Aqui esta la unica puerta de atras de todo el sistema, y es a proposito.**
--
-- El resto del proyecto se apoya en que las politicas de M1 aplican porque
-- `persona_actual()` dice quien pregunta. Pero al entrar todavia no hay quien
-- pregunte: esa es la definicion de entrar. Asi que las tres funciones de abajo
-- son `security definer` y ven lo que ninguna otra ve.
--
-- Por eso son **tres, minusculas y con el permiso justo**:
--
--   · Solo `estook_api` puede ejecutarlas. A `public` se le revoca expresamente.
--   · No devuelven ni un dato de negocio: ni locales, ni nombres, ni membresias.
--     Lo justo para comprobar una credencial y abrir una sesion.
--   · Nada de lo que devuelven sirve para entrar: la derivada no es la contrasena.
--
-- Es lo contrario de lo que se hizo con `estook.buscar` en la 0017, que
-- deliberadamente NO es `security definer`. La diferencia no es de gusto: buscar
-- se hace **con** identidad y entrar se hace **sin** ella.

-- 1 · Lo que hace falta para comprobar una contrasena.
create or replace function estook.credencial_para_entrar(p_correo text)
returns table (
  persona_id       uuid,
  derivada         text,
  bloqueada_hasta  timestamptz,
  debe_cambiarla   boolean,
  persona_activa   boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id, c.derivada, c.bloqueada_hasta, c.debe_cambiarla, p.activa
    from estook.persona p
    join estook.credencial c on c.persona_id = p.id
   where p.correo = lower(btrim(p_correo))
$$;

comment on function estook.credencial_para_entrar(text) is
  'Puerta de atras deliberada y minima: al entrar no hay identidad que consultar. Solo la puede ejecutar estook_api.';

-- 2 · Lo mismo para el PIN. Devuelve los de esa persona, uno por local.
create or replace function estook.pines_para_entrar(p_correo text)
returns table (
  pin_id           uuid,
  persona_id       uuid,
  local_id         uuid,
  sal_del_local    text,
  huella           text,
  bloqueado_hasta  timestamptz,
  persona_activa   boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select n.id, p.id, n.local_id, l.sal_del_pin, n.huella, n.bloqueado_hasta, p.activa
    from estook.persona p
    join estook.pin n on n.persona_id = p.id
    join estook.local l on l.id = n.local_id
   where p.correo = lower(btrim(p_correo))
     and l.activo
   order by n.creado_en
$$;

-- 3 · Y el de un quiosco, que sabe en que local esta pero no quien teclea.
-- Es la razon de que la sal sea del local: una huella, un indice, una fila.
create or replace function estook.pin_del_quiosco(p_local uuid, p_huella text)
returns table (
  pin_id           uuid,
  persona_id       uuid,
  bloqueado_hasta  timestamptz
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select n.id, n.persona_id, n.bloqueado_hasta
    from estook.pin n
    join estook.persona p on p.id = n.persona_id and p.activa
   where n.local_id = p_local and n.huella = p_huella
$$;

comment on function estook.pin_del_quiosco(uuid, text) is
  'El fichaje de M14: el quiosco sabe su local, teclean seis digitos y sale quien es. Posible solo porque la sal es del local.';

-- 4 · Anotar el intento. Es lo que hace verdad «bloqueo a los cinco intentos».
create or replace function estook.anotar_intento_de_contrasena(p_persona uuid, p_acerto boolean)
returns void
language sql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  update estook.credencial
     set intentos_fallidos = case when p_acerto then 0 else intentos_fallidos + 1 end,
         bloqueada_hasta = case
           when p_acerto then null
           -- Cinco fallos, quince minutos. No es para siempre: dejar a alguien
           -- fuera de su trabajo para siempre por escribir mal cinco veces seria
           -- peor que el riesgo del que protege.
           when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes'
           else bloqueada_hasta
         end
   where persona_id = p_persona
$$;

create or replace function estook.anotar_intento_de_pin(p_pin uuid, p_acerto boolean)
returns void
language sql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  update estook.pin
     set intentos_fallidos = case when p_acerto then 0 else intentos_fallidos + 1 end,
         bloqueado_hasta = case
           when p_acerto then null
           when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes'
           else bloqueado_hasta
         end
   where id = p_pin
$$;

-- 5 · Abrir la sesion. Devuelve la fila entera para no tener que leerla despues,
-- que seria otra consulta sin identidad todavia puesta.
create or replace function estook.abrir_sesion(
  p_persona uuid,
  p_huella text,
  p_entro_con text,
  p_organizacion uuid,
  p_local uuid,
  p_doble_factor_superado boolean,
  p_dias integer
)
returns uuid
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_sesion uuid;
begin
  insert into estook.sesion (
    persona_id, huella, entro_con, organizacion_id, local_id,
    doble_factor_superado, caduca_en
  )
  values (
    p_persona, p_huella, p_entro_con, p_organizacion, p_local,
    p_doble_factor_superado, now() + make_interval(days => p_dias)
  )
  returning id into la_sesion;

  update estook.persona set ultimo_acceso_en = now() where id = p_persona;

  return la_sesion;
end;
$$;

-- 6 · Resolver una sesion. Se llama en **cada peticion**, antes de saber quien
-- pregunta, asi que tambien tiene que ver sin identidad.
--
-- Aprovecha para refrescar la actividad, pero solo si hace mas de quince
-- minutos: escribir una fila en cada peticion, para nada.
create or replace function estook.sesion_activa(p_huella text)
returns table (
  sesion_id             uuid,
  persona_id            uuid,
  organizacion_id       uuid,
  local_id              uuid,
  doble_factor_superado boolean,
  debe_cambiar_clave    boolean
)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  update estook.sesion s
     set ultima_actividad_en = now()
   where s.huella = p_huella
     and s.cerrada_en is null
     and s.caduca_en > now()
     and s.ultima_actividad_en < now() - interval '15 minutes';

  return query
    select s.id, s.persona_id, s.organizacion_id, s.local_id, s.doble_factor_superado,
           coalesce(c.debe_cambiarla, false)
      from estook.sesion s
      join estook.persona p on p.id = s.persona_id and p.activa
      left join estook.credencial c on c.persona_id = s.persona_id
     where s.huella = p_huella
       and s.cerrada_en is null
       and s.caduca_en > now();
end;
$$;

comment on function estook.sesion_activa(text) is
  'De la huella del token a quien pregunta. Se llama antes de declarar la identidad, asi que tiene que ver sin ella.';

-- 7 · «Invitar a un correo que ya existe anade membresia, nunca duplica persona.»
--
-- Esta tambien tiene que ver sin identidad, y por una razon que no es la de las
-- otras: quien invita a alguien que trabaja en OTRA organizacion **no puede leer
-- su fila**, y esta bien que no pueda. Pero tampoco puede crearla otra vez, o esa
-- persona acabaria partida en dos y con su historial y sus horas repartidos.
--
-- Asi que devuelve lo justo para no duplicar: **si existe y su identificador**.
-- Ni el nombre, ni los apellidos, ni donde trabaja. Con eso se anade la membresia
-- y nada mas, y quien invita sigue sin poder ver un dato que no le toca.
create or replace function estook.persona_por_correo(p_correo text)
returns table (persona_id uuid, activa boolean)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id, p.activa
    from estook.persona p
   where p.correo = lower(btrim(p_correo))
$$;

comment on function estook.persona_por_correo(text) is
  'Si ese correo ya es una persona. Devuelve el identificador y nada mas: quien invita no tiene por que ver a quien trabaja en otra organizacion.';

-- 8 · Cerrar sesiones. Lo usa «retirar el acceso», que tiene que matar todo a la
-- vez, y tambien «cerrar sesion en este dispositivo».
create or replace function estook.cerrar_sesiones_de(p_persona uuid, p_quien uuid)
returns integer
language sql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with cerradas as (
    update estook.sesion
       set cerrada_en = now(), cerrada_por = p_quien
     where persona_id = p_persona and cerrada_en is null
    returning 1
  )
  select count(*)::integer from cerradas
$$;

-- 9 · Poner la contrasena a OTRA persona.
--
-- Es la forma de volver a entrar mientras no hay proveedor de correo: quien lleva
-- el local pone una nueva, la da en mano, y quien entra con ella tiene que
-- cambiarla antes de tocar nada (`debe_cambiarla`).
--
-- Hace falta una funcion porque la politica `credencial_solo_la_propia` no deja
-- escribir la de otro, **y esta bien que no deje**: aflojarla para este caso
-- abriria la puerta a que cualquier comando futuro escribiera credenciales
-- ajenas sin darse cuenta.
--
-- Asi que la excepcion se declara aqui, una vez, y **comprueba el permiso ella
-- misma**. No se fia de que lo haya comprobado quien la llama: si algun dia otro
-- comando la llamara sin comprobarlo, seguiria sin poder.
create or replace function estook.poner_credencial(
  p_persona uuid,
  p_derivada text,
  p_organizacion uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  puede boolean;
begin
  -- Quien la pone tiene que poder invitar en algun local de esa organizacion al
  -- que esa persona llegue. Es el mismo permiso que da de alta a alguien: quien
  -- puede dar acceso puede devolverlo.
  select exists (
    select 1
      from estook.membresia m
      join estook.local l
        on l.organizacion_id = m.organizacion_id
       and (
         m.alcance = 'organizacion'
         or (m.alcance = 'area' and l.area_id = m.area_id)
         or (m.alcance = 'local' and l.id = m.local_id)
       )
     where m.persona_id = p_persona
       and m.organizacion_id = p_organizacion
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and estook.nivel_de_permiso(
             estook.persona_actual(), l.id, 'accion.invitar_personas'
           ) = 'ver_y_editar'
  ) into puede;

  if not puede then
    raise exception 'No se puede poner la contrasena de esa persona'
      using errcode = '42501';
  end if;

  insert into estook.credencial (persona_id, derivada, debe_cambiarla)
  values (p_persona, p_derivada, true)
  on conflict (persona_id) do update
    set derivada = excluded.derivada,
        debe_cambiarla = true,
        cambiada_en = now(),
        intentos_fallidos = 0,
        bloqueada_hasta = null;
end;
$$;

comment on function estook.poner_credencial(uuid, text, uuid) is
  'La unica forma de escribir la credencial de otra persona. Comprueba el permiso ella misma y deja debe_cambiarla puesto.';

-- ── 10 · «Segundo administrador o correo de recuperacion obligatorio» ────────
--
-- Escrito como una funcion y no como un aviso en una pantalla, porque una
-- organizacion que se queda sin forma de volver a entrar es un cliente perdido y
-- un dia de soporte. La comprueba el comando que quita accesos, antes de quitarlos.

create or replace function estook.tiene_como_volver_a_entrar(
  p_organizacion uuid,
  p_sin_contar uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select
    -- O queda otra persona que puede administrar la cuenta...
    exists (
      select 1
        from estook.membresia m
        join estook.persona p on p.id = m.persona_id and p.activa
       where m.organizacion_id = p_organizacion
         and m.alcance = 'organizacion'
         and m.rol in ('direccion', 'administrador_de_cuenta')
         and m.persona_id is distinct from p_sin_contar
         and m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
    )
    -- ...o hay un correo de recuperacion declarado.
    or exists (
      select 1 from estook.organizacion o
       where o.id = p_organizacion and o.correo_de_recuperacion is not null
    )
$$;

comment on function estook.tiene_como_volver_a_entrar(uuid, uuid) is
  '«Segundo administrador o correo de recuperacion obligatorio» (Plan, M4), comprobado antes de quitar un acceso.';

-- ── Seguridad por filas ───────────────────────────────────────────────────────
--
-- Las cinco tablas nuevas, encendidas y con su politica. Ninguna tabla de este
-- esquema se queda sin, y hay una prueba que lo comprueba tabla a tabla.

alter table estook.suscripcion   enable row level security;
alter table estook.credencial    enable row level security;
alter table estook.pin           enable row level security;
alter table estook.doble_factor  enable row level security;
alter table estook.sesion        enable row level security;

-- Suscripcion · la ve quien ve la organizacion; la toca quien lleva la facturacion.
create policy suscripcion_lectura on estook.suscripcion
  for select using (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

create policy suscripcion_escritura on estook.suscripcion
  for all using (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'dato.facturacion'
    ) = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'dato.facturacion'
    ) = 'ver_y_editar'
  );

-- Credencial · **la tuya y nada mas**. Ni la de quien lleva el local, ni la de
-- quien lleva la organizacion. Nadie tiene por que ver la derivada de otro, y una
-- contrasena no se «gestiona»: se cambia o se pone una nueva.
create policy credencial_solo_la_propia on estook.credencial
  for all using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

-- PIN · el tuyo, y los del local donde puedes invitar. Quien da de alta a alguien
-- tiene que poder generarle un PIN y verlo en pantalla para darlo en mano.
-- Lo que ve es la fila; la huella no sirve para entrar.
create policy pin_lectura on estook.pin
  for select using (
    persona_id = estook.persona_actual()
    or estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') <> 'sin_acceso'
  );

create policy pin_escritura on estook.pin
  for all using (
    persona_id = estook.persona_actual()
    or estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
  )
  with check (
    persona_id = estook.persona_actual()
    or estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
  );

-- Doble factor · el tuyo y nada mas, por lo mismo que la credencial.
create policy doble_factor_solo_el_propio on estook.doble_factor
  for all using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

-- Sesion · las tuyas siempre. Y quien puede quitar accesos en un local ve las de
-- su gente para poder cerrarlas: «retirar el acceso cierra las sesiones».
create policy sesion_lectura on estook.sesion
  for select using (
    persona_id = estook.persona_actual()
    or exists (
      select 1
        from estook.membresia m
       where m.persona_id = estook.sesion.persona_id
         and m.local_id is not null
         and estook.nivel_de_permiso(estook.persona_actual(), m.local_id, 'accion.invitar_personas') = 'ver_y_editar'
    )
  );

create policy sesion_escritura on estook.sesion
  for update using (
    persona_id = estook.persona_actual()
    or exists (
      select 1
        from estook.membresia m
       where m.persona_id = estook.sesion.persona_id
         and m.local_id is not null
         and estook.nivel_de_permiso(estook.persona_actual(), m.local_id, 'accion.invitar_personas') = 'ver_y_editar'
    )
  );

-- ── Permisos ──────────────────────────────────────────────────────────────────

grant select, insert, update, delete on
  estook.suscripcion,
  estook.credencial,
  estook.pin,
  estook.doble_factor,
  estook.sesion
to estook_api;

-- Las once puertas de atras: **solo estook_api**, y a nadie mas. Se revoca
-- primero de `public`, porque una funcion nace ejecutable por todo el mundo y
-- dejarla asi seria regalar lo unico que este fichero protege.
do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.credencial_para_entrar(text)',
    'estook.pines_para_entrar(text)',
    'estook.pin_del_quiosco(uuid, text)',
    'estook.anotar_intento_de_contrasena(uuid, boolean)',
    'estook.anotar_intento_de_pin(uuid, boolean)',
    'estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer)',
    'estook.sesion_activa(text)',
    'estook.persona_por_correo(text)',
    'estook.poner_credencial(uuid, text, uuid)',
    'estook.cerrar_sesiones_de(uuid, uuid)',
    'estook.tiene_como_volver_a_entrar(uuid, uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;
