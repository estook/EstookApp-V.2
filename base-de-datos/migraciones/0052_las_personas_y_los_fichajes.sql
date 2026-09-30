-- 0052 · H1 · Las personas y los fichajes (decisiones 0057, 0062 y 0068)
--
-- La primera mitad de H · Horarios. Nada del cuadrante todavía: lo que pide la ley
-- y lo que hace falta para que todo el equipo pueda fichar.
--
--   A · **La persona sin correo** (0057): un extra o un friegaplatos se da de alta
--       con su nombre y un PIN. El correo pasa a ser opcional.
--   B · **El aparato del local para fichar** (0068): una tablet o un ordenador del
--       local con su propia llave, donde cada uno teclea su PIN. Es la primera pieza
--       del «terminal» de la 0057.
--   C · **La pausa de descanso** (0068): dentro de un turno, con su hora de empezar
--       y de volver. Si cuenta como trabajo lo elige cada local; de fábrica, no.
--   D · **Una corrección no borra el original** (0062): cada vez que alguien toca
--       las horas de un fichaje, queda una fila con lo de antes y lo de después, que
--       no se puede cambiar ni borrar. Y la base no deja tocarlas sin ella.
--   E · **Las horas trabajadas, con un solo dueño**: lo que va de la entrada a la
--       salida, menos las pausas si en ese local no cuentan.
--   F · **El aviso al trabajador** cuando le corrigen un fichaje.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La persona sin correo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Un correo, una identidad» sigue valiendo **cuando hay correo**: el índice único
-- no cambia, y Postgres no cuenta dos nulos como iguales. Las dos restricciones de
-- forma (`persona_correo_en_minusculas` y `persona_correo_con_forma`) dejan pasar
-- el nulo solas: una comprobación sobre un nulo no falla.
--
-- Quien no tiene correo **no puede entrar desde un aparato suyo**: entrar pide el
-- correo, y para eso hace falta demostrar quién es con algo suyo. Entra en el
-- aparato del local, con su PIN (B).

alter table estook.persona alter column correo drop not null;

comment on column estook.persona.correo is
  'Su correo, o nulo si no lo tiene o no lo quiere dar (0057). Sin correo solo se entra en el aparato del local, con el PIN.';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · El aparato del local para fichar
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por qué su propia llave, y no la sesión de quien lo puso ───────────────
--
-- Porque se queda en el local, encendido, y lo toca todo el mundo. Con la sesión
-- del gerente dentro, cualquiera podría abrir la app con sus permisos. Con una
-- llave suya, **solo sirve para fichar**: no abre ninguna pantalla ni enseña nada
-- de nadie.
--
-- De la llave se guarda **su huella** (SHA-256), como de las sesiones: quien se
-- lleve la base no se lleva ningún aparato.
--
-- ── Y por qué `terminal` ───────────────────────────────────────────────────
--
-- Es la pieza de la 0057, con una sola función por ahora, `fichar`. Estook TPV le
-- añadirá las suyas (sala, barra, cocina); no hay que rehacer nada.

-- Antes, los dos ajustes de la pausa (C), que el aparato ya necesita saber. De
-- fábrica la pausa **no cuenta** como trabajo: el Estatuto de los Trabajadores
-- (art. 34.4) solo la cuenta si lo dice el convenio o el contrato.
alter table estook.local
  add column pausas_en_uso boolean not null default true,
  add column pausa_cuenta_como_trabajo boolean not null default false;

comment on column estook.local.pausas_en_uso is
  'Si en este local se ficha la pausa de descanso. De fábrica, sí (0068).';
comment on column estook.local.pausa_cuenta_como_trabajo is
  'Si la pausa se paga como trabajo. De fábrica no: solo si lo dice el convenio o el contrato (ET art. 34.4).';

create table estook.terminal (
  id                 uuid         primary key default gen_random_uuid(),
  local_id           uuid         not null references estook.local (id) on delete cascade,
  nombre             text         not null,
  funcion            text         not null default 'fichar',
  -- SHA-256 de la llave, en hexadecimal. La llave solo la tiene el aparato.
  huella             text         not null unique,
  -- Contra quien prueba PIN al azar: diez fallos seguidos, cinco minutos parado.
  intentos_fallidos  smallint     not null default 0,
  parado_hasta       timestamptz,
  creado_por         uuid         references estook.persona (id) on delete set null,
  creado_en          timestamptz  not null default now(),
  ultimo_uso_en      timestamptz,
  retirado_en        timestamptz,
  retirado_por       uuid         references estook.persona (id) on delete set null,
  version            integer      not null default 1,

  constraint terminal_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 60),
  constraint terminal_funcion_conocida check (funcion in ('fichar')),
  constraint terminal_huella_con_forma check (huella ~ '^[0-9a-f]{64}$'),
  constraint terminal_intentos_en_rango check (intentos_fallidos between 0 and 1000),
  constraint terminal_retirado_con_nombre check ((retirado_en is null) = (retirado_por is null))
);

comment on table estook.terminal is
  'Un aparato del local con su propia llave (0057, 0068). Hoy solo ficha: cada uno teclea su PIN. Retirarlo lo deja sin valer al momento.';

create index terminal_por_local on estook.terminal (local_id) where retirado_en is null;

create trigger terminal_sube_version before update on estook.terminal
  for each row execute function estook.subir_version();

alter table estook.terminal enable row level security;

-- Lo ven y lo ponen quienes tocan la ficha del local (`app.ajustes`): son los
-- mismos que eligen dónde está el local y cuándo es llegar tarde.
create policy terminal_lectura on estook.terminal
  for select using (estook.puede_ver('app.ajustes', local_id));

create policy terminal_alta on estook.terminal
  for insert with check (
    estook.puede_editar('app.ajustes', local_id)
    and creado_por = estook.persona_actual()
  );

create policy terminal_retirar on estook.terminal
  for update using (estook.puede_editar('app.ajustes', local_id))
  with check (estook.puede_editar('app.ajustes', local_id));

-- Sin borrar: un fichaje dice desde qué aparato se hizo, y eso no se pierde.
revoke all on estook.terminal from public;
grant select, insert, update on estook.terminal to estook_api;

-- ── Las dos puertas del aparato, y son a propósito ─────────────────────────
--
-- Quien teclea en el aparato **todavía no es nadie**: no hay persona con la que
-- pasar la seguridad de las filas. Así que, como al entrar (0018), hay dos
-- funciones con privilegio, minúsculas: una dice de qué local es una llave, y la
-- otra apunta los intentos. Ninguna devuelve un dato de nadie.

create or replace function estook.terminal_por_llave(p_huella text)
returns table (
  terminal_id      uuid,
  local_id         uuid,
  organizacion_id  uuid,
  nombre           text,
  sal_del_pin      text,
  parado_hasta     timestamptz,
  -- Lo que el aparato enseña arriba, antes de que nadie teclee: el nombre del
  -- local, que ya está en la puerta, y si allí se fichan las pausas.
  nombre_del_local text,
  pausas_en_uso    boolean
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select t.id, t.local_id, l.organizacion_id, t.nombre, l.sal_del_pin, t.parado_hasta,
         l.nombre, l.pausas_en_uso
    from estook.terminal t
    join estook.local l on l.id = t.local_id and l.activo
   where t.huella = p_huella
     and t.retirado_en is null
     and t.funcion = 'fichar'
$$;

comment on function estook.terminal_por_llave(text) is
  'Puerta deliberada y mínima del aparato para fichar (0068): de qué local es una llave viva. Solo la ejecuta estook_api.';

create or replace function estook.anotar_intento_en_terminal(p_terminal uuid, p_acerto boolean)
returns void
language sql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  update estook.terminal
     set intentos_fallidos = case when p_acerto then 0 else intentos_fallidos + 1 end,
         parado_hasta = case
           when p_acerto then null
           -- Diez y no cinco, como el PIN de una persona: aquí se equivoca todo el
           -- equipo con los dedos mojados, y cinco pararían la tablet cada día.
           when intentos_fallidos + 1 >= 10 then now() + interval '5 minutes'
           else parado_hasta
         end,
         ultimo_uso_en = case when p_acerto then now() else ultimo_uso_en end
   where id = p_terminal
$$;

comment on function estook.anotar_intento_en_terminal(uuid, boolean) is
  'Cuenta los PIN fallados en un aparato: diez seguidos lo paran cinco minutos (0068). Solo la ejecuta estook_api.';

revoke all on function estook.terminal_por_llave(text) from public;
revoke all on function estook.anotar_intento_en_terminal(uuid, boolean) from public;
grant execute on function estook.terminal_por_llave(text) to estook_api;
grant execute on function estook.anotar_intento_en_terminal(uuid, boolean) to estook_api;

-- El fichaje dice desde qué aparato del local se hizo. Nulo: desde el suyo.
alter table estook.fichaje
  add column terminal_id uuid references estook.terminal (id) on delete restrict;

comment on column estook.fichaje.terminal_id is
  'El aparato del local donde se fichó, o nulo si fue desde el de la persona. En el del local no se pide la ubicación: está en el local.';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · La pausa de descanso
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Una fila por pausa, colgando de su fichaje. **El horario partido no es esto**:
-- son dos fichajes el mismo día, con su salida y su entrada (0068).
--
-- Si cuenta como trabajo lo decide el convenio de cada local, así que es un ajuste
-- del local (las dos columnas, arriba, en B: el aparato también las lee).

create table estook.pausa (
  id           bigserial    primary key,
  fichaje_id   bigint       not null references estook.fichaje (id) on delete restrict,
  local_id     uuid         not null references estook.local (id) on delete cascade,
  -- Repetida del fichaje a propósito: la política y el índice de «una abierta» la
  -- necesitan sin tener que ir a buscarla.
  persona_id   uuid         not null references estook.persona (id) on delete restrict,
  empezo_en    timestamptz  not null default now(),
  acabo_en     timestamptz,
  terminal_id  uuid         references estook.terminal (id) on delete restrict,
  creado_en    timestamptz  not null default now(),

  constraint pausa_no_acaba_antes_de_empezar check (acabo_en is null or acabo_en >= empezo_en)
);

comment on table estook.pausa is
  'Una pausa de descanso dentro de un turno (0068). Si cuenta como trabajo lo dice el local (pausa_cuenta_como_trabajo).';

-- Una abierta por persona, como el fichaje.
create unique index pausa_una_abierta_por_persona on estook.pausa (persona_id) where acabo_en is null;
create index pausa_por_fichaje on estook.pausa (fichaje_id);

alter table estook.pausa enable row level security;

-- Se ven como el fichaje del que cuelgan: la tuya siempre, y las de tu equipo si
-- ves sus horas.
create policy pausa_la_mia on estook.pausa
  for select using (persona_id = estook.persona_actual());

create policy pausa_las_del_equipo on estook.pausa
  for select using (
    estook.puede_ver('app.equipo', local_id)
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

-- Solo la propia, y de un fichaje propio abierto: nadie pausa por otro.
create policy pausa_empiezo_la_mia on estook.pausa
  for insert with check (
    persona_id = estook.persona_actual()
    and estook.puede_editar('accion.fichar', local_id)
    and exists (
      select 1 from estook.fichaje f
       where f.id = fichaje_id and f.persona_id = estook.persona_actual() and f.salio_en is null
    )
  );

create policy pausa_vuelvo_de_la_mia on estook.pausa
  for update using (persona_id = estook.persona_actual() and acabo_en is null)
  with check (persona_id = estook.persona_actual());

revoke all on estook.pausa from public;
grant select, insert, update on estook.pausa to estook_api;
grant usage, select on sequence estook.pausa_id_seq to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Una corrección no borra el original
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hasta hoy, corregir cambiaba el fichaje y dejaba el rastro en la auditoría. La
-- 0062 pide más: **la corrección es un registro nuevo, y los dos se ven**. Así:
--
--   · El fichaje sigue diciendo **cómo quedó**, para que todo lo que cuenta horas
--     siga leyendo una sola fila.
--   · Cada corrección deja **una fila con lo de antes y lo de después**, que no se
--     puede cambiar ni borrar. La primera guarda el fichaje tal como se hizo.
--   · **La base no deja tocar las horas sin ella**: cambiar la entrada, cambiar una
--     salida ya puesta o poner la de otra persona exige subir `correcciones` en uno,
--     con nombre y motivo, y entonces la fila de la corrección la escribe la base.
--
-- Cerrar tu propio turno («me voy») no es corregir nada, y pasa como siempre.

alter table estook.fichaje
  add column correcciones integer not null default 0;

comment on column estook.fichaje.correcciones is
  'Cuántas veces se ha corregido. Cada una deja su fila en correccion_de_fichaje, que la base escribe sola (0062).';

create table estook.correccion_de_fichaje (
  id              bigserial    primary key,
  fichaje_id      bigint       not null references estook.fichaje (id) on delete restrict,
  local_id        uuid         not null references estook.local (id) on delete restrict,
  -- De quién es el fichaje: el trabajador, que la ve siempre.
  persona_id      uuid         not null references estook.persona (id) on delete restrict,
  numero          integer      not null,
  entro_antes     timestamptz  not null,
  salio_antes     timestamptz,
  entro_despues   timestamptz  not null,
  salio_despues   timestamptz,
  motivo          text         not null,
  corregido_por   uuid         references estook.persona (id) on delete set null,
  corregido_en    timestamptz  not null,

  constraint correccion_numero_positivo check (numero >= 1),
  constraint correccion_una_por_numero unique (fichaje_id, numero)
);

comment on table estook.correccion_de_fichaje is
  'Cada corrección de un fichaje, con lo de antes y lo de después. Solo se escribe desde la base y no se cambia ni se borra (0062).';

create index correccion_por_fichaje on estook.correccion_de_fichaje (fichaje_id, numero);
create index correccion_por_persona on estook.correccion_de_fichaje (persona_id, corregido_en desc);

-- La tabla no se toca: ni cambiar, ni borrar, ni vaciar. `truncate` no pasa por los
-- disparadores de fila, así que tiene el suyo (0059).
create or replace function estook.correccion_no_se_toca()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Una corrección de un fichaje no se cambia ni se borra'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger correccion_no_se_cambia before update or delete on estook.correccion_de_fichaje
  for each row execute function estook.correccion_no_se_toca();
create trigger correccion_no_se_vacia before truncate on estook.correccion_de_fichaje
  for each statement execute function estook.correccion_no_se_toca();

alter table estook.correccion_de_fichaje enable row level security;

create policy correccion_la_mia on estook.correccion_de_fichaje
  for select using (persona_id = estook.persona_actual());

create policy correccion_las_del_equipo on estook.correccion_de_fichaje
  for select using (
    estook.puede_ver('app.equipo', local_id)
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

-- La escribe el disparador, con la identidad de quien corrige: que sea él, y que
-- pueda corregir en ese local.
create policy correccion_la_escribe_quien_corrige on estook.correccion_de_fichaje
  for insert with check (
    corregido_por = estook.persona_actual()
    and estook.puede_editar('app.equipo', local_id)
  );

revoke all on estook.correccion_de_fichaje from public;
grant select, insert on estook.correccion_de_fichaje to estook_api;
grant usage, select on sequence estook.correccion_de_fichaje_id_seq to estook_api;

-- ── La guarda: las horas no se tocan sin corrección ────────────────────────

create or replace function estook.fichaje_se_corrige_con_nombre()
returns trigger
language plpgsql
as $$
declare
  toca_las_horas boolean;
begin
  toca_las_horas :=
    new.entro_en is distinct from old.entro_en
    -- Una salida que ya estaba puesta.
    or (old.salio_en is not null and new.salio_en is distinct from old.salio_en)
    -- O poner la salida de otra persona.
    or (old.salio_en is null and new.salio_en is not null
        and new.persona_id is distinct from estook.persona_actual());

  if new.correcciones <> old.correcciones then
    if new.correcciones <> old.correcciones + 1 then
      raise exception 'Las correcciones de un fichaje se cuentan de una en una'
        using errcode = 'check_violation';
    end if;
    if new.corregido_por is null or new.motivo_de_la_correccion is null then
      raise exception 'Una corrección lleva nombre y motivo'
        using errcode = 'check_violation';
    end if;
  elsif toca_las_horas then
    raise exception 'Las horas de un fichaje solo se cambian corrigiéndolo, con nombre y motivo'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger fichaje_se_corrige_con_nombre before update on estook.fichaje
  for each row execute function estook.fichaje_se_corrige_con_nombre();

create or replace function estook.fichaje_deja_su_correccion()
returns trigger
language plpgsql
as $$
begin
  if new.correcciones = old.correcciones + 1 then
    insert into estook.correccion_de_fichaje (
      fichaje_id, local_id, persona_id, numero,
      entro_antes, salio_antes, entro_despues, salio_despues,
      motivo, corregido_por, corregido_en
    )
    values (
      new.id, new.local_id, new.persona_id, new.correcciones,
      old.entro_en, old.salio_en, new.entro_en, new.salio_en,
      new.motivo_de_la_correccion, new.corregido_por, coalesce(new.corregido_en, now())
    );
  end if;
  return new;
end;
$$;

create trigger fichaje_deja_su_correccion after update on estook.fichaje
  for each row execute function estook.fichaje_deja_su_correccion();

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Las horas trabajadas, con un solo dueño
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Hasta hoy, cada consulta restaba la salida menos la entrada. Con pausas eso ya no
-- es lo trabajado, y escribirlo en cada consulta serían doce restas que un día no
-- dicen lo mismo (regla 6). Aquí, una vez: de la entrada a la salida —o a ahora, si
-- sigue dentro—, **menos las pausas si en ese local no cuentan**.
--
-- No es `security definer`: ve las pausas que ve quien pregunta, y quien ve un
-- fichaje ve sus pausas (las políticas de C son las mismas que las del fichaje).

create or replace function estook.segundos_trabajados(p_fichaje estook.fichaje, p_ahora timestamptz)
returns numeric
language sql
stable
as $$
  select greatest(
    0,
    extract(epoch from (coalesce(p_fichaje.salio_en, p_ahora) - p_fichaje.entro_en))
    - case
        when l.pausa_cuenta_como_trabajo then 0
        else coalesce((
          select sum(extract(epoch from (
                   least(coalesce(pa.acabo_en, p_ahora), coalesce(p_fichaje.salio_en, p_ahora))
                   - pa.empezo_en
                 )))
            from estook.pausa pa
           where pa.fichaje_id = p_fichaje.id
             and pa.empezo_en < coalesce(p_fichaje.salio_en, p_ahora)
        ), 0)
      end
  )
    from estook.local l
   where l.id = p_fichaje.local_id
$$;

comment on function estook.segundos_trabajados(estook.fichaje, timestamptz) is
  'Lo trabajado en un fichaje: de la entrada a la salida (o a ahora), menos las pausas si en su local no cuentan (0068). El único dueño de esa cuenta.';

-- ═══════════════════════════════════════════════════════════════════════════
-- F · El aviso al trabajador
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un tipo más en la campana. La lista entera, copiada de la 0051 y con el nuevo al
-- final.

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido'
));
