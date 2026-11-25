-- 0127 · La Ampliación 3 · 1 · La ficha del trabajador (decisión 0153, sección 4; Plan, M13)
--
-- Lo que pidió Richi el 11-nov y pulió el 24-nov: una ficha de verdad por persona, que se
-- rellena subiendo el contrato (Fogón lo lee y el gerente confirma) o a mano.
--
--   A · **Las condiciones** (`ficha_laboral`): incorporación, contrato, jornada, categoría,
--       convenio y vacaciones. Las ve quien ve a esa persona en Equipo —los jefes también:
--       con ellas se cuentan las vacaciones que gestionan— y la propia persona.
--   B · **Lo privado** (`ficha_privada`): DNI, teléfono, domicilio y sueldo. Solo lo ven
--       quien lleva los datos del equipo (`dato.datos_del_equipo`: gerencia, dirección y
--       RRHH) y la propia persona. **Ni el jefe de sala ni el de cocina**: lo pidió Richi.
--   C · **Los documentos** (`documento_de_persona`): el contrato, en un cubo privado y con
--       enlace que caduca. Con la misma regla que lo privado. Las nóminas entran en la 3 · 2.
--   D · Fogón aprende a leer contratos (`leer_contrato`).
--
-- Lo decide la base, no la pantalla: un camarero llamando a la API a pelo no recibe el
-- contrato ni el sueldo de otro (Plan, M13, «Terminado cuando»). Y **nadie se rellena su
-- propia ficha**: se la pone quien lleva el equipo, como el sueldo (0027).

-- ═══════════════════════════════════════════════════════════════════════════
-- Quién lleva a una persona en una organización
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La ficha es de la organización (el contrato es con la empresa, no con un local), y a
-- una persona la lleva quien la tiene en su equipo en **algún** local de esa organización
-- con el permiso que haga falta. Es `a_quien_lleva` (0027) mirado local a local.

create or replace function estook.la_lleva(
  p_persona uuid,
  p_organizacion uuid,
  p_permiso text,
  p_editar boolean
)
returns boolean
language sql
stable
security invoker
set search_path = estook, pg_catalog, pg_temp
as $$
  select exists (
    select 1
      from estook.local l
     where l.organizacion_id = p_organizacion
       and l.id in (select v.local_id from estook.locales_visibles() v)
       and case when p_editar then estook.puede_editar(p_permiso, l.id)
                else estook.puede_ver(p_permiso, l.id) end
       and p_persona in (select q.persona_id from estook.a_quien_lleva(l.id) q)
  )
$$;

comment on function estook.la_lleva(uuid, uuid, text, boolean) is
  'Si quien pregunta lleva a esa persona en algún local de la organización con ese permiso (0153): la regla de la ficha del trabajador.';

revoke all on function estook.la_lleva(uuid, uuid, text, boolean) from public;
grant execute on function estook.la_lleva(uuid, uuid, text, boolean) to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Las condiciones
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.ficha_laboral (
  persona_id             uuid          not null references estook.persona (id) on delete cascade,
  organizacion_id        uuid          not null references estook.organizacion (id) on delete cascade,
  incorporacion          date,
  contrato               text,
  jornada                text,
  horas_semanales        numeric(4, 1),
  categoria              text,
  convenio               text,
  vacaciones_al_ano      numeric(4, 1),
  vacaciones_en          text          not null default 'naturales',
  pendientes_anteriores  numeric(4, 1) not null default 0,
  origen                 text          not null default 'a_mano',
  cambiada_por           uuid          references estook.persona (id) on delete set null,
  cambiada_en            timestamptz   not null default now(),
  primary key (persona_id, organizacion_id),
  constraint ficha_laboral_contrato_conocido check (
    contrato is null
    or contrato in ('indefinido', 'temporal', 'fijo_discontinuo', 'practicas', 'formacion', 'otro')
  ),
  constraint ficha_laboral_jornada_conocida check (jornada is null or jornada in ('completa', 'parcial')),
  constraint ficha_laboral_horas_razonables check (
    horas_semanales is null or (horas_semanales > 0 and horas_semanales <= 60)
  ),
  constraint ficha_laboral_categoria_corta check (categoria is null or char_length(categoria) between 1 and 120),
  constraint ficha_laboral_convenio_corto check (convenio is null or char_length(convenio) between 1 and 200),
  constraint ficha_laboral_vacaciones_razonables check (
    vacaciones_al_ano is null or (vacaciones_al_ano >= 0 and vacaciones_al_ano <= 60)
  ),
  constraint ficha_laboral_vacaciones_en check (vacaciones_en in ('naturales', 'laborables')),
  constraint ficha_laboral_pendientes_razonables check (
    pendientes_anteriores >= 0 and pendientes_anteriores <= 120
  ),
  constraint ficha_laboral_origen check (origen in ('a_mano', 'contrato'))
);

comment on table estook.ficha_laboral is
  'Las condiciones de cada persona en una organización (0153): de ellas salen la jornada, las vacaciones y, más adelante, las horas extra. Las ven quien lleva a esa persona en Equipo y ella misma.';
comment on column estook.ficha_laboral.vacaciones_al_ano is
  'Los días de vacaciones al año que dice su contrato o su convenio. Las disponibles las calcula Estook, nunca la IA.';
comment on column estook.ficha_laboral.pendientes_anteriores is
  'Los días de años anteriores que le quedan: los pone el gerente a mano.';
comment on column estook.ficha_laboral.origen is
  'Si salió de un contrato leído por Fogón (y confirmado) o se escribió a mano.';

alter table estook.ficha_laboral enable row level security;

create policy ficha_laboral_la_mia on estook.ficha_laboral
  for select using (persona_id = estook.persona_actual());

create policy ficha_laboral_quien_lleva on estook.ficha_laboral
  for select using (estook.la_lleva(persona_id, organizacion_id, 'app.equipo', false));

-- La escribe quien lleva los datos del equipo, y nunca la propia persona.
create policy ficha_laboral_la_pone_quien_lleva on estook.ficha_laboral
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

create policy ficha_laboral_la_cambia_quien_lleva on estook.ficha_laboral
  for update using (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  )
  with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

revoke all on estook.ficha_laboral from public;
grant select, insert, update on estook.ficha_laboral to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo privado
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.ficha_privada (
  persona_id       uuid         not null references estook.persona (id) on delete cascade,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  dni              text,
  telefono         text,
  domicilio        text,
  sueldo_centimos  bigint,
  sueldo_es        text,
  sueldo_cada      text,
  pagas            smallint,
  cambiada_por     uuid         references estook.persona (id) on delete set null,
  cambiada_en      timestamptz  not null default now(),
  primary key (persona_id, organizacion_id),
  constraint ficha_privada_dni_corto check (dni is null or char_length(dni) between 5 and 20),
  constraint ficha_privada_telefono_corto check (telefono is null or char_length(telefono) between 6 and 30),
  constraint ficha_privada_domicilio_corto check (domicilio is null or char_length(domicilio) between 2 and 240),
  constraint ficha_privada_sueldo_positivo check (sueldo_centimos is null or sueldo_centimos > 0),
  constraint ficha_privada_sueldo_es check (sueldo_es is null or sueldo_es in ('bruto', 'neto')),
  constraint ficha_privada_sueldo_cada check (sueldo_cada is null or sueldo_cada in ('mes', 'ano')),
  constraint ficha_privada_pagas check (pagas is null or pagas between 1 and 16)
);

comment on table estook.ficha_privada is
  'Lo privado de cada persona (0153): DNI, teléfono, domicilio y sueldo del contrato. Solo lo ven quien tiene dato.datos_del_equipo y ella misma. El sueldo del contrato no es el coste para el local (eso es estook.retribucion).';

alter table estook.ficha_privada enable row level security;

create policy ficha_privada_la_mia on estook.ficha_privada
  for select using (persona_id = estook.persona_actual());

create policy ficha_privada_quien_lleva_los_datos on estook.ficha_privada
  for select using (estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', false));

create policy ficha_privada_la_pone_quien_lleva on estook.ficha_privada
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

create policy ficha_privada_la_cambia_quien_lleva on estook.ficha_privada
  for update using (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  )
  with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

revoke all on estook.ficha_privada from public;
grant select, insert, update on estook.ficha_privada to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Los documentos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- En la fila, la clave del objeto y no el fichero (M5): el fichero vive en el cubo
-- privado `equipo` y se enseña con un enlace firmado que caduca. **No se borran**: un
-- contrato nuevo se suma y el de antes queda debajo, como el historial de una receta.

create table estook.documento_de_persona (
  id               uuid         primary key default gen_random_uuid(),
  persona_id       uuid         not null references estook.persona (id) on delete cascade,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  tipo             text         not null,
  clave            text         not null unique,
  nombre           text         not null,
  mime             text         not null,
  bytes            integer      not null,
  subido_por       uuid         references estook.persona (id) on delete set null,
  subido_en        timestamptz  not null default now(),
  constraint documento_de_persona_tipo check (tipo in ('contrato')),
  constraint documento_de_persona_nombre check (char_length(nombre) between 1 and 160),
  constraint documento_de_persona_mime check (mime in ('application/pdf', 'image/jpeg', 'image/webp')),
  constraint documento_de_persona_bytes check (bytes > 0 and bytes <= 10 * 1024 * 1024),
  constraint documento_de_persona_en_su_cubo check (clave like 'equipo/%')
);

comment on table estook.documento_de_persona is
  'Los documentos de cada persona (0153): el contrato, y con la 3 · 2 las nóminas. En el cubo privado equipo, con enlace que caduca; los ven quien tiene dato.datos_del_equipo y ella misma.';

create index documento_de_persona_por_persona
  on estook.documento_de_persona (persona_id, organizacion_id, tipo, subido_en desc);

alter table estook.documento_de_persona enable row level security;

create policy documento_de_persona_el_mio on estook.documento_de_persona
  for select using (persona_id = estook.persona_actual());

create policy documento_de_persona_quien_lleva_los_datos on estook.documento_de_persona
  for select using (estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', false));

create policy documento_de_persona_lo_sube_quien_lleva on estook.documento_de_persona
  for insert with check (
    persona_id <> estook.persona_actual()
    and estook.la_lleva(persona_id, organizacion_id, 'dato.datos_del_equipo', true)
  );

revoke all on estook.documento_de_persona from public;
-- Sin `update` ni `delete`: un documento subido no se cambia ni se borra a escondidas.
grant select, insert on estook.documento_de_persona to estook_api;

-- El cubo, privado y solo donde hay almacén de Supabase (en la base de pruebas no hay).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'equipo', 'equipo', false, 10 * 1024 * 1024,
      array['application/pdf', 'image/jpeg', 'image/webp']
    )
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Fogón lee contratos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Copiada de la 0079 entera, con `leer_contrato` añadido.

alter table estook.llamada_a_fogon drop constraint llamada_a_fogon_que;
alter table estook.llamada_a_fogon add constraint llamada_a_fogon_que check (que in (
  'preguntar', 'rellenar_escandallo', 'escribir_pasos',
  'leer_albaran', 'leer_cierre', 'leer_merma_foto', 'leer_merma_voz',
  'revisar_datos', 'ajustar_pedido', 'hacer_cuadrante', 'responder_resena',
  'leer_carta', 'analizar_zona', 'leer_contrato'
));
