-- 0054 · I · La app instalable (decisión 0070)
--
-- Estook en la pantalla de inicio del móvil: lo que se hace sin señal y los avisos que
-- suenan en el móvil. La parte del navegador —instalarla, guardar lo pendiente, el
-- trabajador de servicio— no toca la base; esto es lo que la base tiene que saber.
--
--   A · **Lo hecho sin conexión**: el fichaje y la pausa dicen si se hicieron sin
--       señal, y el de más de doce horas sale para revisar (mejora 15).
--   B · **El fichaje que falta**, apuntado a mano por quien lleva el equipo, con su
--       nombre y su motivo: para el fichaje sin conexión que no se pudo apuntar, y
--       para quien se olvidó de fichar la entrada.
--   C · **El aparato del local sin wifi** (Richi, 1-oct: «elige la mejor»): su llave
--       de cifrado, para guardar el PIN tecleado sin señal de forma que solo Estook
--       lo pueda leer, y los cifrados ya usados, para que no se puedan repetir.
--   D · **Los móviles que reciben avisos**, uno por aparato y navegador.
--   E · **Cuándo suena**: en tu turno o fuera de tus horas de silencio, a tu gusto.
--   F · **Los avisos al móvil**: la columna «Móvil» de Ajustes → Avisos, el estado
--       de cada aviso en el móvil y los cuatro avisos nuevos.
--   G · **Lo que el reloj tiene que hacer a una hora**: «entras en cinco minutos»,
--       lo que caduca a las 18:00 y por la mañana, y el pedido que no llega.
--   H · **El proveedor dice a qué hora suele llegar**, si se quiere (Richi: «si se
--       deja en blanco no pasa nada»).
--   I · **El latido de cada minuto**: la base mira si hay algo que mandar al móvil, y
--       solo entonces llama a la API.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Lo hecho sin conexión
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La hora **la pone el servidor** (regla 10): el móvil dice cuánto hace que se hizo,
-- y el servidor la cuenta con su reloj. Aquí solo queda escrito que fue sin señal,
-- para que se vea en la lista, y si hay que revisarlo.

alter table estook.fichaje
  add column entro_sin_conexion boolean not null default false,
  add column salio_sin_conexion boolean not null default false,
  -- Con más de doce horas sin señal, lo mira quien lleva el equipo (mejora 15). Se
  -- quita al darlo por bueno o al corregirlo.
  add column por_revisar boolean not null default false,
  add column revisado_por uuid references estook.persona (id) on delete set null,
  add column revisado_en timestamptz;

comment on column estook.fichaje.entro_sin_conexion is
  'La entrada se fichó sin señal y se mandó después; la hora la contó el servidor (0070).';
comment on column estook.fichaje.salio_sin_conexion is
  'La salida se fichó sin señal y se mandó después; la hora la contó el servidor (0070).';
comment on column estook.fichaje.por_revisar is
  'Hecho sin conexión con más de doce horas sin señal: lo revisa quien lleva el equipo (mejora 15, 0070).';

alter table estook.fichaje
  add constraint fichaje_revisado_con_nombre check ((revisado_por is null) = (revisado_en is null));

create index fichaje_por_revisar on estook.fichaje (local_id) where por_revisar;

alter table estook.pausa
  add column sin_conexion boolean not null default false;

comment on column estook.pausa.sin_conexion is
  'La pausa, o su vuelta, se fichó sin señal y se mandó después (0070).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · El fichaje que falta, apuntado a mano
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hasta hoy, quien lleva el equipo **corregía** un fichaje, pero no podía **apuntar**
-- uno que no existía. Hace falta para dos cosas: el fichaje del aparato que se hizo
-- sin conexión con un PIN equivocado (C), y quien se olvidó de fichar la entrada.
--
-- Va con nombre y motivo, como una corrección, y **sin ubicación**: no hay aparato al
-- que pedírsela. Su porqué es `a_mano`, y lo dice la lista.

alter table estook.fichaje
  add column apuntado_por uuid references estook.persona (id) on delete set null,
  add column motivo_a_mano text;

alter table estook.fichaje
  add constraint fichaje_a_mano_con_nombre_y_motivo check (
    (apuntado_por is null and motivo_a_mano is null)
    or (apuntado_por is not null and motivo_a_mano is not null
        and char_length(btrim(motivo_a_mano)) between 3 and 400)
  );

comment on column estook.fichaje.apuntado_por is
  'Quien apuntó a mano este fichaje que faltaba, con su motivo. Nulo si lo fichó la persona (0070).';

-- La política: lo apunta quien lleva el equipo de ese local, para alguien a quien
-- lleva, y con su propio nombre. La de siempre (`fichaje_ficho_yo`) sigue igual.
create policy fichaje_lo_apunta_quien_lleva_el_equipo on estook.fichaje
  for insert with check (
    apuntado_por = estook.persona_actual()
    and estook.puede_editar('app.equipo', local_id)
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El aparato del local, sin wifi
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Sin conexión el PIN no se puede comprobar: su huella no sale del servidor (0068).
-- Así que el aparato guarda lo que se teclea y lo manda al volver la señal. Para que
-- en la tablet **no quede ningún PIN legible**, se cifra con la llave pública del
-- aparato (RSA-OAEP), y la privada solo la tiene Estook: en una tabla que solo lee el
-- sistema, como el secreto de Stripe.
--
-- Y para que un cifrado copiado de la tablet **no se pueda volver a mandar**, cada
-- uno lleva su número de un solo uso, y aquí se apunta el que ya se usó.

alter table estook.terminal
  add column clave_publica text;

comment on column estook.terminal.clave_publica is
  'La llave pública con la que el aparato cifra el PIN tecleado sin conexión (SPKI en base64). La privada, en clave_del_terminal (0070).';

alter table estook.terminal
  add constraint terminal_clave_con_medida check (
    clave_publica is null or char_length(clave_publica) between 100 and 2000
  );

-- El sistema la pone la primera vez que el aparato se prepara para ir sin conexión.
create policy terminal_lo_prepara_el_sistema on estook.terminal
  for update using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy terminal_lo_mira_el_sistema on estook.terminal
  for select using (estook.es_el_sistema());

create table estook.clave_del_terminal (
  terminal_id  uuid         primary key references estook.terminal (id) on delete cascade,
  -- PKCS#8 en base64. Nunca sale de la API.
  privada      text         not null,
  creada_en    timestamptz  not null default now(),
  constraint clave_del_terminal_con_medida check (char_length(privada) between 500 and 5000)
);

comment on table estook.clave_del_terminal is
  'La llave privada de cada aparato, para leer el PIN que se tecleó sin conexión. Solo la lee el sistema (0070).';

create table estook.cifrado_usado (
  terminal_id  uuid         not null references estook.terminal (id) on delete cascade,
  numero       text         not null,
  usado_en     timestamptz  not null default now(),
  primary key (terminal_id, numero),
  constraint cifrado_usado_numero_con_forma check (numero ~ '^[0-9a-f]{32}$')
);

comment on table estook.cifrado_usado is
  'Los números de un solo uso de los PIN cifrados sin conexión que ya se han usado: un cifrado no vale dos veces (0070).';

alter table estook.clave_del_terminal enable row level security;
alter table estook.cifrado_usado      enable row level security;

create policy clave_del_terminal_el_sistema on estook.clave_del_terminal
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy cifrado_usado_el_sistema on estook.cifrado_usado
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.clave_del_terminal from public;
revoke all on estook.cifrado_usado from public;
grant select, insert on estook.clave_del_terminal to estook_api;
grant select, insert, delete on estook.cifrado_usado to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Los móviles que reciben avisos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Uno por aparato y navegador: la dirección del servicio de avisos de ese navegador
-- (el de Google, el de Apple o el de Mozilla) y sus dos claves para cifrar lo que se
-- le manda. **Lo que se manda va cifrado de punta a punta**: el servicio lo entrega y
-- no lo puede leer (RFC 8291).

create table estook.movil_suscrito (
  id             uuid         primary key default gen_random_uuid(),
  persona_id     uuid         not null references estook.persona (id) on delete cascade,
  direccion      text         not null unique,
  p256dh         text         not null,
  auth           text         not null,
  -- «iPhone · Safari», para que cada uno sepa en Ajustes cuál es cuál.
  aparato        text,
  creado_en      timestamptz  not null default now(),
  ultimo_uso_en  timestamptz,
  fallos         smallint     not null default 0,

  constraint movil_direccion_segura check (
    direccion like 'https://%' and char_length(direccion) between 20 and 1000
  ),
  constraint movil_claves_con_medida check (
    char_length(p256dh) between 40 and 200 and char_length(auth) between 10 and 100
  ),
  constraint movil_aparato_con_medida check (aparato is null or char_length(aparato) <= 80),
  constraint movil_fallos_en_rango check (fallos between 0 and 1000)
);

comment on table estook.movil_suscrito is
  'Cada móvil que recibe avisos: la dirección de su servicio de avisos y sus claves (0070). Se borra solo al dejar de existir.';

create index movil_suscrito_por_persona on estook.movil_suscrito (persona_id);

alter table estook.movil_suscrito enable row level security;

-- Lo tuyo: verlo, ponerlo y quitarlo. Y el sistema, que manda los avisos.
create policy movil_lectura on estook.movil_suscrito
  for select using (persona_id = estook.persona_actual() or estook.es_el_sistema());
create policy movil_lo_pongo_yo on estook.movil_suscrito
  for insert with check (persona_id = estook.persona_actual());
create policy movil_lo_cambio_yo on estook.movil_suscrito
  for update using (persona_id = estook.persona_actual() or estook.es_el_sistema())
  with check (persona_id = estook.persona_actual() or estook.es_el_sistema());
create policy movil_lo_quito on estook.movil_suscrito
  for delete using (persona_id = estook.persona_actual() or estook.es_el_sistema());

revoke all on estook.movil_suscrito from public;
grant select, insert, update, delete on estook.movil_suscrito to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Cuándo suena el móvil
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Fuera de turno no suena nada» (0017). Quien tiene horario, de fábrica, solo en su
-- turno; quien no lo tiene, fuera de sus horas de silencio (de 23:00 a 08:00). Lo que
-- no está aquí es de fábrica, y lo decide el dominio (`suModo`).

create table estook.cuando_suena (
  persona_id      uuid         primary key references estook.persona (id) on delete cascade,
  modo            text         not null,
  silencio_desde  time         not null default '23:00',
  silencio_hasta  time         not null default '08:00',
  actualizado_en  timestamptz  not null default now(),
  constraint cuando_suena_modo_conocido check (modo in ('en_mi_turno', 'fuera_del_silencio'))
);

comment on table estook.cuando_suena is
  'Cuándo puede sonar el móvil de alguien: en su turno o fuera de sus horas de silencio (0070).';

alter table estook.cuando_suena enable row level security;

create policy cuando_suena_lectura on estook.cuando_suena
  for select using (persona_id = estook.persona_actual() or estook.es_el_sistema());
create policy cuando_suena_lo_pongo_yo on estook.cuando_suena
  for insert with check (persona_id = estook.persona_actual());
create policy cuando_suena_lo_cambio_yo on estook.cuando_suena
  for update using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

revoke all on estook.cuando_suena from public;
grant select, insert, update on estook.cuando_suena to estook_api;

-- ── Lo que hace falta saber para decidir si suena, solo al sistema ─────────
--
-- Si está fichado ahora, y si tiene horario (el de siempre vigente, o algo publicado
-- en las cuatro semanas de alrededor). Lo justo, como `quien_recibe` (0050).

create function estook.como_le_suena(p_personas uuid[])
returns table (persona_id uuid, fichado boolean, tiene_horario boolean)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.id,
         exists (select 1 from estook.fichaje f where f.persona_id = p.id and f.salio_en is null),
         exists (
           select 1 from estook.horario_habitual hh
            where hh.persona_id = p.id and hh.desde <= current_date
              and (hh.hasta is null or hh.hasta >= current_date)
         ) or exists (
           select 1 from estook.turno_publicado tp
            where tp.persona_id = p.id and tp.tipo = 'trabajo'
              and tp.dia between current_date - 14 and current_date + 14
         )
    from estook.persona p
   where estook.es_el_sistema()
     and p.id = any (p_personas)
$$;

comment on function estook.como_le_suena(uuid[]) is
  'Si cada persona está fichada y si tiene horario, para saber cuándo le puede sonar el móvil. Solo contesta al sistema (0070).';

-- ── Sus turnos, publicados o de siempre ────────────────────────────────────
--
-- **Cuando hay horario publicado, manda el horario** (0069): en las semanas
-- publicadas de un local cuenta lo publicado, y en las demás, el de siempre. Es la
-- misma regla que `lasEntradasDelHorario` (los retrasos), aquí por instantes: cuándo
-- empieza y cuándo acaba cada tramo, en el reloj del local. Un tramo que sale antes
-- de entrar acaba al día siguiente; uno de siempre que entra antes de la hora de
-- corte es del día siguiente del calendario, como en los retrasos.

create function estook.turnos_de(p_personas uuid[], p_desde timestamptz, p_hasta timestamptz)
returns table (persona_id uuid, local_id uuid, empieza timestamptz, acaba timestamptz)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with locales as (
    select l.id, l.zona_horaria, l.hora_de_corte
      from estook.local l
     where l.activo and not l.es_ejemplo
  ),
  dias as (
    select d::date as fecha
      from generate_series(
        (p_desde at time zone 'UTC')::date - 2,
        (p_hasta at time zone 'UTC')::date + 1,
        interval '1 day'
      ) d
  ),
  publicadas as (
    select s.local_id, s.lunes
      from estook.semana_de_horario s
     where s.publicada_en is not null
       and s.lunes between (p_desde at time zone 'UTC')::date - 9 and (p_hasta at time zone 'UTC')::date + 1
  ),
  de_siempre as (
    select hh.persona_id, l.id as local_id,
           ((case when hh.entra >= l.hora_de_corte then dd.fecha else dd.fecha + 1 end) + hh.entra)
             at time zone l.zona_horaria as empieza,
           (case when hh.sale > hh.entra then hh.sale - hh.entra
                 else hh.sale - hh.entra + interval '24 hours' end) as dura
      from estook.horario_habitual hh
      join locales l on l.id = hh.local_id
      join dias dd on hh.dia_de_la_semana = extract(isodow from dd.fecha)::int
     where hh.persona_id = any (p_personas)
       and hh.desde <= dd.fecha
       and (hh.hasta is null or hh.hasta >= dd.fecha)
       and not exists (
         select 1 from publicadas pu
          where pu.local_id = l.id and dd.fecha between pu.lunes and pu.lunes + 6
       )
  ),
  publicados as (
    select tp.persona_id, l.id as local_id,
           (tp.dia + tp.entra) at time zone l.zona_horaria as empieza,
           (case when tp.sale > tp.entra then tp.sale - tp.entra
                 else tp.sale - tp.entra + interval '24 hours' end) as dura
      from estook.turno_publicado tp
      join locales l on l.id = tp.local_id
      join publicadas pu on pu.local_id = tp.local_id and tp.dia between pu.lunes and pu.lunes + 6
     where tp.persona_id = any (p_personas)
       and tp.tipo = 'trabajo'
  ),
  todos as (
    select * from de_siempre
    union all
    select * from publicados
  )
  select t.persona_id, t.local_id, t.empieza, t.empieza + t.dura as acaba
    from todos t
   where estook.es_el_sistema()
     and t.empieza + t.dura > p_desde
     and t.empieza < p_hasta
   order by t.empieza
$$;

comment on function estook.turnos_de(uuid[], timestamptz, timestamptz) is
  'Los tramos de trabajo de unas personas entre dos instantes: lo publicado en las semanas publicadas, y el de siempre en las demás. Solo contesta al sistema (0070).';

-- ═══════════════════════════════════════════════════════════════════════════
-- F · Los avisos al móvil
-- ═══════════════════════════════════════════════════════════════════════════

-- La columna «Móvil» de Ajustes → Avisos. Nula: de fábrica, lo que diga el dominio.
alter table estook.preferencia_de_aviso
  add column al_movil boolean;

alter table estook.preferencia_de_aviso
  -- El móvil nunca sin la campana, como el correo: tocar el aviso abre la campana.
  add constraint preferencia_movil_con_app check (en_la_app or not coalesce(al_movil, false));

-- El aviso, en el móvil. `pendiente` hasta que sale, a partir de `movil_desde`: si le
-- pilla fuera de turno o en silencio, espera a cuando pueda sonar.
alter table estook.aviso
  add column movil text not null default 'no',
  add column movil_desde timestamptz,
  add column movil_intentos smallint not null default 0,
  -- **Lo que suena en el móvil no va también por correo** (0017). Pero si el móvil no
  -- lo recibe —se cambió de teléfono, quitó Estook—, sale por correo si lo quería.
  add column correo_si_no_llega boolean not null default false;

alter table estook.aviso
  add constraint aviso_movil_conocido check (movil in ('no', 'pendiente', 'mandado')),
  add constraint aviso_movil_con_hora check (movil <> 'pendiente' or movil_desde is not null),
  add constraint aviso_correo_de_repuesto check (not correo_si_no_llega or correo_para is not null);

create index aviso_con_movil_pendiente on estook.aviso (movil_desde) where movil = 'pendiente';

-- Quien lo recibe solo lo marca leído; lo demás es del sistema. Es la de la 0050,
-- copiada entera, con las cuatro columnas nuevas dentro de lo que no se toca.
create or replace function estook.aviso_solo_se_lee()
returns trigger
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if estook.es_el_sistema() then
    return new;
  end if;
  if (new.id, new.organizacion_id, new.local_id, new.persona_id, new.tipo, new.clave,
      new.titulo, new.detalle, new.ir, new.quienes, new.creado_en, new.actualizado_en,
      new.correo, new.correo_intentos, new.correo_para,
      new.movil, new.movil_desde, new.movil_intentos, new.correo_si_no_llega)
     is distinct from
     (old.id, old.organizacion_id, old.local_id, old.persona_id, old.tipo, old.clave,
      old.titulo, old.detalle, old.ir, old.quienes, old.creado_en, old.actualizado_en,
      old.correo, old.correo_intentos, old.correo_para,
      old.movil, old.movil_desde, old.movil_intentos, old.correo_si_no_llega) then
    raise exception 'De un aviso solo se marca si está leído'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- Los cuatro avisos nuevos. La lista entera, copiada de la 0053 y con ellos al final.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar'
));

-- ═══════════════════════════════════════════════════════════════════════════
-- G · Lo que el reloj tiene que hacer a una hora
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El reloj late cada hora (0048) y apunta aquí lo que toca en la hora siguiente:
-- «entras en cinco minutos» de cada turno, lo que caduca a las 18:00 y a las 08:00
-- de cada local, y el pedido que no ha llegado media hora después de cuando suele.
-- Cada minuto la base mira si a algo le ha llegado su hora (I), y solo entonces
-- llama a la API, que vuelve a comprobar que sigue haciendo falta: si el turno ha
-- cambiado o el pedido ya llegó, no se avisa de nada.

create table estook.al_movil_programado (
  id          bigserial    primary key,
  local_id    uuid         not null references estook.local (id) on delete cascade,
  -- De quién: «entras en cinco minutos» es de una persona; lo demás, del local.
  persona_id  uuid         references estook.persona (id) on delete cascade,
  tipo        text         not null,
  -- La cosa, para no apuntarla dos veces: el turno, el día o el pedido.
  clave       text         not null,
  cuando      timestamptz  not null,
  hecho_en    timestamptz,
  creado_en   timestamptz  not null default now(),

  constraint programado_tipo_conocido check (tipo in ('turno.entras', 'lote.caduca', 'pedido.no_llega')),
  constraint programado_uno_por_cosa unique (tipo, clave),
  constraint programado_clave_con_medida check (char_length(clave) between 1 and 200)
);

comment on table estook.al_movil_programado is
  'Lo que el reloj tiene que avisar a una hora: entras en cinco minutos, lo que caduca y el pedido que no llega (0070).';

create index programado_pendiente on estook.al_movil_programado (cuando) where hecho_en is null;

alter table estook.al_movil_programado enable row level security;

create policy programado_el_sistema on estook.al_movil_programado
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.al_movil_programado from public;
grant select, insert, update, delete on estook.al_movil_programado to estook_api;
grant usage, select on sequence estook.al_movil_programado_id_seq to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- H · A qué hora suele llegar un proveedor
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.proveedor
  add column suele_llegar_a time;

comment on column estook.proveedor.suele_llegar_a is
  'Hacia qué hora suele llegar su reparto. Si está puesto, avisa media hora después si un pedido de ese día no ha llegado (0070). En blanco, no avisa.';

alter table estook.proveedor
  add constraint proveedor_suele_llegar_en_punto check (
    suele_llegar_a is null or extract(second from suele_llegar_a) = 0
  );

-- ── Los pedidos que tienen que llegar, solo al sistema ─────────────────────
--
-- El reloj, sin nadie delante, necesita saber qué pedido mandado tiene que llegar
-- hoy y a qué hora avisa si no llega: media hora después de cuando suele llegar
-- su proveedor, en el reloj del local. Lo justo, y solo al sistema, como
-- `quien_recibe`. Con `p_pedido` dice si ese sigue sin llegar.

create function estook.pedidos_por_llegar(
  p_desde timestamptz,
  p_hasta timestamptz,
  p_pedido uuid default null
)
returns table (
  pedido_id        uuid,
  local_id         uuid,
  organizacion_id  uuid,
  numero           integer,
  proveedor        text,
  suele_llegar_a   text,
  avisa_en         timestamptz
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select pc.id, pc.local_id, l.organizacion_id, pc.numero, pv.nombre,
         to_char(pv.suele_llegar_a, 'HH24:MI'),
         ((pc.llega_el + pv.suele_llegar_a) at time zone l.zona_horaria) + interval '30 minutes'
    from estook.pedido_de_compra pc
    join estook.proveedor pv on pv.id = pc.proveedor_id
    join estook.local l on l.id = pc.local_id and l.activo and not l.es_ejemplo
   where estook.es_el_sistema()
     and pc.estado = 'enviado'
     and not pc.es_ejemplo
     and pc.llega_el is not null
     and pv.suele_llegar_a is not null
     and (p_pedido is null or pc.id = p_pedido)
     and ((pc.llega_el + pv.suele_llegar_a) at time zone l.zona_horaria) + interval '30 minutes'
         between p_desde and p_hasta
$$;

comment on function estook.pedidos_por_llegar(timestamptz, timestamptz, uuid) is
  'Los pedidos mandados que tienen que llegar entre dos instantes, con cuándo avisar si no llegan. Solo contesta al sistema (0070).';

-- ═══════════════════════════════════════════════════════════════════════════
-- I · El latido de cada minuto
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La base mira **dentro de sí misma**, cada minuto, si hay algún aviso pendiente de
-- sonar o algo programado que ya toca. Solo si lo hay llama a la API, con el mismo
-- secreto que el latido de cada hora. Mirarlo es una consulta a dos índices
-- parciales: no gasta nada, y la API no se despierta para nada (0070).
--
-- Solo donde hay `pg_cron`, como el reloj de la 0047. Si no se puede programar, la
-- migración sigue y `bd:comprobar-api` lo dice en rojo.

alter table plataforma.reloj
  add column movil_programado boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;

  begin
    perform cron.schedule(
      'estook-movil',
      '* * * * *',
      $cron$
        select net.http_post(
          url := (select replace(r.url, '/tareas/latir', '/tareas/movil') from plataforma.reloj r where r.unica),
          headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-reloj', (select d.decrypted_secret from vault.decrypted_secrets d where d.name = 'estook_reloj')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 50000
        )
         where exists (
           select 1 from estook.aviso a where a.movil = 'pendiente' and a.movil_desde <= now()
         )
            or exists (
           select 1 from estook.al_movil_programado p where p.hecho_en is null and p.cuando <= now()
         )
      $cron$
    );

    update plataforma.reloj set movil_programado = true where unica;
  exception when others then
    raise notice 'El latido del móvil no se ha podido programar: %. Lo dirá bd:comprobar-api.', sqlerrm;
  end;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Las puertas de las funciones nuevas
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on function estook.como_le_suena(uuid[]) from public;
revoke all on function estook.turnos_de(uuid[], timestamptz, timestamptz) from public;
revoke all on function estook.pedidos_por_llegar(timestamptz, timestamptz, uuid) from public;
grant execute on function estook.como_le_suena(uuid[]) to estook_api;
grant execute on function estook.turnos_de(uuid[], timestamptz, timestamptz) to estook_api;
grant execute on function estook.pedidos_por_llegar(timestamptz, timestamptz, uuid) to estook_api;
