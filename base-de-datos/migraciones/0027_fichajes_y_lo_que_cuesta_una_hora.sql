-- 0027 · Fichajes, y lo que cuesta una hora
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Lo que había, y lo que faltaba ──────────────────────────────────────────
--
-- El permiso `accion.fichar` existe **desde M1**, y lo tienen el camarero, el
-- cocinero, el jefe de sala y el jefe de cocina. Es decir: la matriz de roles
-- lleva doce migraciones diciendo quién puede fichar, y **no había dónde
-- fichar**. El Panel lo decía en voz alta cada mañana —«los fichajes y las horas
-- llegan en M15»— y Equipo tenía la pestaña puesta, apagada, con su módulo.
--
-- Esto lo construye. Y lo construye antes de M15 por la misma razón por la que
-- Fogón tuvo su burbuja en M6 sin hablar (decisión 0015): **sin fichajes no hay
-- horas, sin horas no hay coste de personal, y sin coste de personal el Panel de
-- un gerente cuenta la mitad del negocio**. Lo que M15 traerá encima es la parte
-- laboral —contratos, ausencias, convenios, el informe para la inspección—, y
-- toda ella se apoya en esta tabla.
--
-- ── Tres tablas, y cada una responde a una pregunta ─────────────────────────
--
--   `fichaje`            ¿quién está trabajando, desde cuándo y desde dónde?
--   `retribucion`        ¿qué cuesta una hora de esta persona?
--   `horario_habitual`   ¿a qué hora entra normalmente?
--
-- La tercera es la que hace falta explicar, porque **no es el cuadrante**. El
-- cuadrante —quién trabaja el jueves que viene, con sus cambios y sus
-- sustituciones— es M14 y es otra cosa mucho más grande. Esto es el horario de
-- siempre de una persona, que es lo único que hace falta para poder decirle
-- «entras en cinco minutos, ficha ya» y para que M14 tenga de dónde partir en
-- vez de la nada. Cuando llegue el cuadrante, manda el cuadrante y esto se queda
-- como lo que es: el valor por defecto.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El fichaje
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── La ubicación, y por qué se pide pero no se exige ────────────────────────
--
-- «Añadir en fichar obligatorio pedir obtener ubicación para fichar.» Se pide
-- **siempre**, y esa es la parte que sí es obligatoria: el navegador pregunta y
-- la respuesta se guarda.
--
-- Lo que no puede pasar es que Estook **impida trabajar**. Un teléfono con el GPS
-- apagado, un sótano sin señal, un permiso denegado hace seis meses en otro
-- navegador: cualquiera de esas tres deja a una persona delante de un botón que
-- no la deja entrar a su turno. Eso es exactamente lo que el Manifiesto prohíbe
-- con «nunca se bloquea a nadie por cuadrar», y aquí hay más en juego que un
-- kilo de pulpo: hay el registro horario de alguien.
--
-- Así que se ficha igual, **y se apunta que no había ubicación y por qué**. La
-- diferencia entre un fichaje con coordenadas y uno sin ellas se ve en la lista,
-- con su palabra, y quien lleva el local decide qué hacer con eso. Un dato que
-- falta y se dice es un dato; un botón que no responde es un problema.
--
-- ── Y por qué se guardan los metros y no solo las coordenadas ───────────────
--
-- Porque la pregunta que se hace de verdad no es «¿dónde fichó?» sino **«¿fichó
-- en el local?»**, y esa se contesta con un número. Se calcula al fichar, con la
-- posición del local de ese momento, y se congela: si mañana el local corrige su
-- dirección, los fichajes de ayer no cambian de sitio. Es la misma decisión que
-- el saldo congelado del libro de movimientos.

alter table estook.local
  -- Dónde está el local, para poder decir a cuántos metros se fichó. Nulo hasta
  -- que alguien lo ponga: sin esto, un fichaje guarda sus coordenadas y no se
  -- puede comparar con nada, que es una verdad a medias pero no es una mentira.
  add column if not exists latitud   numeric(9, 6),
  add column if not exists longitud  numeric(9, 6),
  -- A cuántos metros del local se acepta un fichaje **sin marcarlo como lejos**.
  -- Cien es lo que da un GPS de móvil en la calle de un casco antiguo.
  add column if not exists radio_de_fichaje_metros integer not null default 100;

comment on column estook.local.latitud is
  'Donde esta el local. Sirve para decir a cuantos metros se ficho. Nulo mientras nadie lo ponga: entonces el fichaje guarda su posicion y no se compara con nada.';
comment on column estook.local.radio_de_fichaje_metros is
  'Hasta donde se considera que alguien ficho en el local. No bloquea: marca.';

alter table estook.local
  add constraint local_latitud_valida check (latitud is null or (latitud >= -90 and latitud <= 90)),
  add constraint local_longitud_valida check (
    longitud is null or (longitud >= -180 and longitud <= 180)
  ),
  add constraint local_posicion_entera check (
    (latitud is null and longitud is null) or (latitud is not null and longitud is not null)
  ),
  add constraint local_radio_razonable check (
    radio_de_fichaje_metros between 10 and 5000
  );

create table estook.fichaje (
  -- `bigserial` y no `uuid`, como el libro de movimientos y por lo mismo: el
  -- orden en que se ficha **es** un dato, y dos fichajes del mismo segundo se
  -- tienen que poder ordenar sin fiarse de una marca de tiempo.
  id           bigserial    primary key,
  local_id     uuid         not null references estook.local (id) on delete cascade,
  -- `restrict` y no `cascade`: los fichajes de alguien son su registro horario,
  -- y eso no desaparece porque alguien borre una ficha. «La persona no se borra:
  -- sigue en lo que firmo, en sus fichajes y en su historial» (Auditoria 2.11),
  -- y esta es la linea que lo hace verdad en vez de una frase.
  persona_id   uuid         not null references estook.persona (id) on delete restrict,

  -- A qué jornada pertenece. La decide el servidor con la zona horaria y la hora
  -- de corte del local (regla 10): quien entra a las 23:00 y sale a las 03:00
  -- hizo **un** turno, el del día que empezó.
  fecha_operativa  date  not null,

  entro_en  timestamptz  not null default now(),
  salio_en  timestamptz,

  -- ── Dónde ────────────────────────────────────────────────────────────────
  entro_latitud     numeric(9, 6),
  entro_longitud    numeric(9, 6),
  -- Lo que el navegador dice que se fía de esa posición, en metros. Un fichaje
  -- «a 40 m del local con 500 m de precisión» no dice nada, y hay que poder
  -- distinguirlo de uno a 40 m con 8 m de precisión.
  entro_precision   numeric(8, 1),
  entro_metros      integer,
  -- Por qué no hay posición. Nulo cuando sí la hay.
  entro_sin_donde   text,

  salio_latitud     numeric(9, 6),
  salio_longitud    numeric(9, 6),
  salio_precision   numeric(8, 1),
  salio_metros      integer,
  salio_sin_donde   text,

  -- ── Cuando lo arregla una persona ────────────────────────────────────────
  --
  -- Un fichaje se corrige: la gente se olvida de salir, y un turno que dice
  -- diecinueve horas no se puede dejar así. Pero se corrige **con nombre y con
  -- motivo**, porque esto es el registro horario de otra persona y quien lo toca
  -- tiene que quedar escrito. Sin las dos cosas, la restricción lo rechaza.
  corregido_por   uuid         references estook.persona (id) on delete set null,
  corregido_en    timestamptz,
  motivo_de_la_correccion  text,

  notas       text,
  es_ejemplo  boolean      not null default false,
  version     integer      not null default 1,
  creado_en   timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),

  constraint fichaje_no_sale_antes_de_entrar check (salio_en is null or salio_en >= entro_en),
  constraint fichaje_correccion_con_nombre_y_motivo check (
    (corregido_por is null and corregido_en is null and motivo_de_la_correccion is null)
    or (
      corregido_por is not null
      and corregido_en is not null
      and motivo_de_la_correccion is not null
      and length(btrim(motivo_de_la_correccion)) > 0
    )
  ),
  constraint fichaje_entrada_coherente check (
    (entro_latitud is null) = (entro_longitud is null)
  ),
  constraint fichaje_salida_coherente check (
    (salio_latitud is null) = (salio_longitud is null)
  ),
  -- O hay posición o hay motivo por el que no la hay, pero nunca las dos ni
  -- ninguna: un fichaje sin ninguna de las dos cosas es un fichaje del que no se
  -- sabe si se pidió la ubicación o no, y eso no se puede investigar después.
  constraint fichaje_entrada_dice_donde check (
    (entro_latitud is not null) <> (entro_sin_donde is not null)
  ),
  --
  -- La salida, igual, **salvo que la haya puesto quien corrige**. El caso más
  -- normal de corregir es justo ese: alguien se fue sin fichar la salida, y quien
  -- lleva el equipo la pone al día siguiente. Ahí no hay aparato al que pedirle
  -- la posición, y el porqué ya está escrito: es el motivo de la corrección, con
  -- nombre. Sin esta excepción, cerrar un turno olvidado era imposible.
  constraint fichaje_salida_dice_donde check (
    salio_en is null
    or corregido_por is not null
    or ((salio_latitud is not null) <> (salio_sin_donde is not null))
  )
);

comment on table estook.fichaje is
  'Quien entro a trabajar, cuando, desde donde y hasta cuando. Una fila por turno; la de hoy sin salida es quien esta dentro ahora mismo.';
comment on column estook.fichaje.fecha_operativa is
  'A que jornada pertenece el turno. La decide el servidor con la zona y la hora de corte del local: quien entra a las 23:00 hizo el turno del dia que empezo.';
comment on column estook.fichaje.entro_metros is
  'A cuantos metros del local se ficho, congelado en ese momento. Nulo si el local no tiene posicion puesta o si el aparato no la dio.';
comment on column estook.fichaje.entro_sin_donde is
  'Por que no hay posicion: el aparato la nego, no habia senal, o el navegador no la da. Nunca bloquea el fichaje.';

-- ── Uno abierto, y solo uno ──────────────────────────────────────────────────
--
-- **Por persona, no por persona y local.** Nadie está trabajando en dos sitios a
-- la vez, y quien lleva dos locales de la misma cadena podría fichar en los dos y
-- cobrar el doble sin que nada chillara. El índice parcial lo impide en la base,
-- que es el único sitio donde una regla así se cumple de verdad.
create unique index fichaje_uno_abierto_por_persona
  on estook.fichaje (persona_id)
  where salio_en is null;

create index fichaje_por_local_y_dia
  on estook.fichaje (local_id, fecha_operativa desc, id desc);

create index fichaje_por_persona_y_dia
  on estook.fichaje (persona_id, fecha_operativa desc, id desc);

create trigger fichaje_sube_version before update on estook.fichaje
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo que cuesta una hora
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por qué esto es una tabla con fechas y no una columna en `persona` ──────
--
-- Porque una subida de sueldo **no puede reescribir el pasado**. Con una columna,
-- subirle el precio de la hora a alguien en marzo cambiaría lo que costó su turno
-- de enero, y el coste de personal de enero dejaría de cuadrar con lo que se pagó
-- de verdad. Es exactamente la razón por la que los precios de compra son una
-- tabla con `desde` y `hasta` desde M6, aplicada a lo mismo.
--
-- ── Y por qué lleva local ───────────────────────────────────────────────────
--
-- Nulo quiere decir «en toda la organización», que es lo normal. Con local puesto
-- es para el caso real de una cadena: la misma persona cubre dos locales y en uno
-- va de encargada. Sin la columna, eso obliga a elegir un sueldo y mentir en el
-- otro.
--
-- ── Y quién lo ve ───────────────────────────────────────────────────────────
--
-- `dato.coste_de_personal`, que lo tienen el gerente, el área manager, la
-- dirección y RRHH. **El jefe de cocina no**, y es a propósito: lleva a su equipo,
-- ve sus horas y no ve lo que cobran. Está en la matriz desde M1 y aquí es donde
-- por fin significa algo.

create type estook.forma_de_retribucion as enum ('por_hora', 'mensual');

comment on type estook.forma_de_retribucion is
  'Como se paga: tanto la hora, o tanto al mes. Las dos se convierten a coste por hora con las horas de contrato.';

create table estook.retribucion (
  id               uuid  primary key default gen_random_uuid(),
  organizacion_id  uuid  not null references estook.organizacion (id) on delete cascade,
  persona_id       uuid  not null references estook.persona (id) on delete cascade,
  -- Nulo = en toda la organizacion. Con local, solo ahi.
  local_id         uuid  references estook.local (id) on delete cascade,

  forma             estook.forma_de_retribucion  not null,
  -- En centimos. Por hora, o al mes segun `forma`.
  importe_centimos  bigint  not null,
  -- Las horas de contrato a la semana. Hacen dos cosas: convertir un sueldo
  -- mensual en coste por hora, y decir cuando alguien se esta pasando, que es la
  -- pregunta del resumen de Equipo.
  horas_semanales   numeric(5, 2),
  -- Como se llama su puesto en el papel del contrato, que no es lo mismo que su
  -- rol en Estook: «Ayudante de cocina» es un puesto, `cocinero` es un rol.
  puesto            text,

  desde  date  not null default current_date,
  hasta  date,

  creado_por  uuid         references estook.persona (id) on delete set null,
  creado_en   timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  version     integer      not null default 1,

  constraint retribucion_importe_no_negativo check (importe_centimos >= 0),
  constraint retribucion_horas_razonables check (
    horas_semanales is null or (horas_semanales > 0 and horas_semanales <= 80)
  ),
  constraint retribucion_vigencia_coherente check (hasta is null or hasta >= desde),
  -- Un sueldo mensual sin horas de contrato no se puede repartir por hora, y
  -- entonces el coste de un turno seria un invento. Se pide.
  constraint retribucion_mensual_con_horas check (
    forma <> 'mensual' or horas_semanales is not null
  )
);

comment on table estook.retribucion is
  'Que cobra cada persona y desde cuando. Con fechas para que una subida no reescriba lo que costo el mes pasado. Solo lo ve quien tiene dato.coste_de_personal.';

-- Una sola vigente por persona y ámbito. Sin esto, dos filas abiertas darían dos
-- sueldos a la vez y la cuenta del coste dependería del orden en que salieran.
create unique index retribucion_una_vigente
  on estook.retribucion (persona_id, coalesce(local_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where hasta is null;

create index retribucion_por_persona on estook.retribucion (persona_id, desde desc);

create trigger retribucion_sube_version before update on estook.retribucion
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El horario de siempre
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Lo que es, y sobre todo lo que no es ────────────────────────────────────
--
-- **No es el cuadrante.** El cuadrante es M14: quién trabaja el jueves 19, con
-- sus cambios, sus sustituciones, sus vacaciones y su coste antes de publicarlo.
-- Esto es una cosa mucho más pequeña y que hace falta ya: **a qué hora entra
-- normalmente cada persona**, que es lo único que Estook necesita para poder
-- decir «entras en cinco minutos, ficha» y «mañana entras a las nueve».
--
-- Se construye ahora porque el aviso no se puede construir sin ello, y porque
-- dejarlo para M14 significaría que M14 nace teniendo que preguntar el horario de
-- toda la plantilla desde cero. Cuando llegue el cuadrante, **manda el
-- cuadrante**: esto pasa a ser el valor por defecto del que parte, que es como
-- funciona en cualquier sitio donde se hacen horarios de verdad.
--
-- ── Y por qué el día de la semana es un número ISO ──────────────────────────
--
-- 1 es lunes y 7 es domingo, que es lo que devuelve `isodow` de Postgres. Con el
-- `dow` normal —0 es domingo— la semana empieza el domingo, que no es la semana
-- de nadie aquí, y cada consulta tendría que acordarse de girarla.

create table estook.horario_habitual (
  id          uuid  primary key default gen_random_uuid(),
  local_id    uuid  not null references estook.local (id) on delete cascade,
  persona_id  uuid  not null references estook.persona (id) on delete cascade,

  -- 1 lunes … 7 domingo, como `isodow`.
  dia_de_la_semana  smallint  not null,
  entra             time      not null,
  sale              time      not null,

  desde  date  not null default current_date,
  hasta  date,

  creado_por  uuid         references estook.persona (id) on delete set null,
  creado_en   timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  version     integer      not null default 1,

  constraint horario_dia_valido check (dia_de_la_semana between 1 and 7),
  constraint horario_vigencia_coherente check (hasta is null or hasta >= desde)
  -- `sale` puede ser **menor** que `entra`, y no es un error: es el turno de
  -- noche. Quien entra a las 20:00 y sale a las 02:00 es lo normal en un bar, y
  -- una restriccion que lo prohibiera dejaria fuera justo a quien mas tarde ficha.
);

comment on table estook.horario_habitual is
  'A que hora entra y sale normalmente cada persona, por dia de la semana. NO es el cuadrante (M14): es el valor de siempre, y sirve para avisar de que toca fichar.';
comment on column estook.horario_habitual.dia_de_la_semana is
  '1 lunes … 7 domingo, como isodow de Postgres.';
comment on column estook.horario_habitual.sale is
  'Puede ser menor que `entra`: eso es el turno de noche, que en un bar es lo normal.';

create index horario_por_persona on estook.horario_habitual (persona_id, dia_de_la_semana);
create index horario_por_local on estook.horario_habitual (local_id, dia_de_la_semana);

create trigger horario_habitual_sube_version before update on estook.horario_habitual
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Las tres reglas del fichaje ─────────────────────────────────────────────
--
--   · **El tuyo siempre lo ves.** Aunque no tengas Equipo, aunque seas el último
--     camarero: tus horas son tuyas y verlas no depende de un permiso. Es lo que
--     dice la ley y es lo que dice el sentido común.
--   · **El de los demás, con `app.equipo`.** Un jefe de cocina ve los de su gente
--     porque tiene Equipo en «ver»; un cocinero no ve los de nadie más.
--   · **Fichar es tuyo y solo tuyo.** `accion.fichar` deja crear **tu** fichaje,
--     no el de otro. Fichar por un compañero es fraude, y no se impide con un
--     botón escondido: se impide aquí.
--
-- Corregir sí es de otro, y por eso es una política aparte con `app.equipo` en
-- «ver y editar»: es lo que separa mirar las horas de tocarlas.

-- ── A quién lleva cada uno ──────────────────────────────────────────────────
--
-- «Resumen para gerentes o managers (todos), o jefe de cocina si son cocineros,
-- o jefe de sala si son camareros.» Es decir: **un jefe de cocina mira a la
-- cocina y no a la sala**, aunque los dos tengan la app Equipo en «ver».
--
-- `personas_visibles` no sirve para esto, y no por un fallo: contesta «a quién
-- conoces en tu organización», que para un jefe de cocina es todo el mundo —tiene
-- que poder ver quién es la camarera para trabajar con ella—. Lo que no tiene que
-- ver son **sus horas**. Son dos preguntas, y esta es la segunda.
--
-- Se decide por el rol más amplio que alcanza el local:
--
--   gerente, área manager, dirección, RRHH   a todo el equipo del local
--   jefe de cocina                           a la cocina: cocineros y jefes de cocina
--   jefe de sala                             a la sala: camareros y jefes de sala
--   el resto                                 a sí mismo, y a nadie más
--
-- Y va en la base, en una función y en la política, y no en cada consulta: la
-- regla se cumple porque no hay camino que la rodee, no porque cada pantalla se
-- acuerde de filtrar. `security definer` porque tiene que leer las membresías de
-- toda la organización para decidir, igual que `locales_visibles`.

create or replace function estook.a_quien_lleva(p_local uuid)
returns table (persona_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  with mi_rol as (
    select r.codigo, r.amplitud
      from estook.membresia m
      join estook.rol r on r.codigo = m.rol
      join estook.local l on l.id = p_local
     where m.persona_id = estook.persona_actual()
       and m.organizacion_id = l.organizacion_id
       and (
         m.alcance = 'organizacion'
         or (m.alcance = 'area' and l.area_id = m.area_id)
         or (m.alcance = 'local' and l.id = m.local_id)
       )
       and m.desde <= current_date
       and (m.hasta is null or m.hasta >= current_date)
       and (m.revocada_en is null or m.revocada_en > now())
     order by r.amplitud desc
     limit 1
  ),
  familia as (
    select case (select codigo from mi_rol)
             when 'jefe_de_cocina' then array['cocinero', 'jefe_de_cocina']
             when 'jefe_de_sala'   then array['camarero', 'jefe_de_sala']
             else null
           end as roles
  )
  select estook.persona_actual()
  union
  select distinct m.persona_id
    from estook.membresia m
    join estook.local l on l.id = p_local
   where m.organizacion_id = l.organizacion_id
     and (
       m.alcance = 'organizacion'
       or (m.alcance = 'area' and l.area_id = m.area_id)
       or (m.alcance = 'local' and l.id = m.local_id)
     )
     -- De jefe para arriba. Un cocinero no lleva a nadie: se ve a sí mismo.
     and coalesce((select amplitud from mi_rol), 0) >= 50
     -- El `::text[]` no es adorno: sin él, `any (select …)` se lee como «algún
     -- elemento de esta subconsulta», que devuelve una fila con un array, y
     -- Postgres acaba comparando un texto con un array entero. Con el cast es una
     -- expresión, y `any` recorre el array. Lo cazó la prueba de migraciones.
     and (
       (select roles from familia) is null
       or m.rol = any ((select roles from familia)::text[])
     )
$$;

comment on function estook.a_quien_lleva(uuid) is
  'A quien lleva quien pregunta en ese local: todo el equipo desde gerente, su familia (cocina o sala) si es jefe, y a si mismo si no. Decide de quien se ven las horas.';

alter table estook.fichaje          enable row level security;
alter table estook.retribucion      enable row level security;
alter table estook.horario_habitual enable row level security;

create policy fichaje_el_mio on estook.fichaje
  for select using (persona_id = estook.persona_actual());

create policy fichaje_los_del_equipo on estook.fichaje
  for select using (
    estook.puede_ver('app.equipo', local_id)
    and persona_id in (select q.persona_id from estook.a_quien_lleva(local_id) q)
  );

-- Fichar: solo el propio, y solo en un local que se alcance.
create policy fichaje_ficho_yo on estook.fichaje
  for insert with check (
    persona_id = estook.persona_actual()
    and estook.puede_editar('accion.fichar', local_id)
    and local_id in (select local_id from estook.locales_visibles())
  );

-- Cerrar el propio —«me voy»— y corregir el de otro son el mismo `update` para
-- Postgres, así que la política deja pasar las dos y **la diferencia la marca la
-- restricción de arriba**: tocar un fichaje ajeno obliga a poner nombre y motivo.
create policy fichaje_cierro_el_mio on estook.fichaje
  for update using (persona_id = estook.persona_actual() and salio_en is null)
  with check (persona_id = estook.persona_actual());

create policy fichaje_corrijo_los_del_equipo on estook.fichaje
  for update using (
    estook.puede_editar('app.equipo', local_id)
    and persona_id in (select persona_id from estook.personas_visibles())
  )
  with check (estook.puede_editar('app.equipo', local_id));

-- **No hay política de borrado.** Un fichaje no se borra: se corrige, con nombre
-- y motivo. Es la misma regla que el libro de movimientos, y por lo mismo: si se
-- pudiera borrar, el registro horario no serviría para lo único que sirve.

-- ── La retribución · lo más cerrado de todo el esquema ──────────────────────
--
-- Solo dos caminos: el tuyo, y el de quien tenga `dato.coste_de_personal` en ese
-- local. **Ni siquiera con Equipo entera se ve un sueldo**: es la diferencia
-- entre llevar a un equipo y llevar sus nóminas, y la matriz de M1 ya la tenía
-- escrita.

create policy retribucion_la_mia on estook.retribucion
  for select using (persona_id = estook.persona_actual());

create policy retribucion_quien_lleva_los_costes on estook.retribucion
  for select using (
    persona_id in (select persona_id from estook.personas_visibles())
    and (
      (local_id is not null and estook.puede_ver('dato.coste_de_personal', local_id))
      or (
        local_id is null
        and exists (
          select 1 from estook.local l
           where l.organizacion_id = retribucion.organizacion_id
             and l.id in (select local_id from estook.locales_visibles())
             and estook.puede_ver('dato.coste_de_personal', l.id)
        )
      )
    )
  );

create policy retribucion_escritura on estook.retribucion
  for all using (
    persona_id in (select persona_id from estook.personas_visibles())
    and (
      (local_id is not null and estook.puede_editar('dato.coste_de_personal', local_id))
      or (
        local_id is null
        and exists (
          select 1 from estook.local l
           where l.organizacion_id = retribucion.organizacion_id
             and l.id in (select local_id from estook.locales_visibles())
             and estook.puede_editar('dato.coste_de_personal', l.id)
        )
      )
    )
  )
  with check (
    persona_id in (select persona_id from estook.personas_visibles())
    and (
      (local_id is not null and estook.puede_editar('dato.coste_de_personal', local_id))
      or (
        local_id is null
        and exists (
          select 1 from estook.local l
           where l.organizacion_id = retribucion.organizacion_id
             and l.id in (select local_id from estook.locales_visibles())
             and estook.puede_editar('dato.coste_de_personal', l.id)
        )
      )
    )
  );

-- ── El horario · quien ve el local lo ve ────────────────────────────────────
--
-- No es un dato sensible: saber a qué hora entra el cocinero es justo lo que hace
-- falta para trabajar con él. Tocarlo sí pide Equipo en «ver y editar».

create policy horario_lectura on estook.horario_habitual
  for select using (
    persona_id = estook.persona_actual()
    or (
      local_id in (select local_id from estook.locales_visibles())
      and persona_id in (select persona_id from estook.personas_visibles())
    )
  );

create policy horario_escritura on estook.horario_habitual
  for all using (estook.puede_editar('app.equipo', local_id))
  with check (estook.puede_editar('app.equipo', local_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Permisos de tabla
-- ═══════════════════════════════════════════════════════════════════════════

revoke all on estook.fichaje          from public;
revoke all on estook.retribucion      from public;
revoke all on estook.horario_habitual from public;

-- Sin `delete` en `fichaje`, y a propósito: ver arriba.
grant select, insert, update on estook.fichaje to estook_api;
grant usage, select on sequence estook.fichaje_id_seq to estook_api;
grant select, insert, update, delete on estook.retribucion      to estook_api;
grant select, insert, update, delete on estook.horario_habitual to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- F · A cuántos metros
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por qué esto vive en la base y no en el servidor ────────────────────────
--
-- Porque la distancia entre dos puntos es un **cálculo**, y la regla 6 dice que
-- un cálculo tiene un único dueño. Lo va a preguntar el comando de fichar, lo va
-- a preguntar el resumen de Equipo, y el día que haya un informe lo preguntará
-- también. Escrito tres veces serían tres fórmulas ligeramente distintas.
--
-- Es la fórmula del semiverseno, con la Tierra como una esfera de 6 371 km. Da
-- un error de hasta un 0,5 % frente a la elipsoide de verdad, que sobre cien
-- metros son cincuenta centímetros: para decidir si alguien fichó en el bar o en
-- su casa, sobra. PostGIS haría esto exacto y sería una extensión entera para
-- una raíz cuadrada.

create or replace function estook.metros_entre(
  p_lat_a numeric, p_lon_a numeric, p_lat_b numeric, p_lon_b numeric
)
returns integer
language sql
immutable
as $$
  select case
    when p_lat_a is null or p_lon_a is null or p_lat_b is null or p_lon_b is null then null
    else round(
      2 * 6371000 * asin(
        sqrt(
          power(sin(radians(p_lat_b - p_lat_a) / 2), 2)
          + cos(radians(p_lat_a)) * cos(radians(p_lat_b))
            * power(sin(radians(p_lon_b - p_lon_a) / 2), 2)
        )
      )
    )::integer
  end
$$;

comment on function estook.metros_entre(numeric, numeric, numeric, numeric) is
  'Metros entre dos puntos, por el semiverseno. Nulo si falta alguno. Un unico dueno de la cuenta: la usan fichar y los resumenes.';
