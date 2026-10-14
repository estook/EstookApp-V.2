-- 0066 · Lo que recuerda tu cuenta (las bases firmes, decisión 0084)
--
-- Dos cosas pequeñas que Richi pidió el 14-oct y que tienen que valer **en todos tus
-- aparatos**, no solo en el que las hiciste:
--
--   1 · **El periodo de cada widget** (7 o 30 días). Desde la 0083 se recordaba en el
--       aparato: en el móvil la merma de la semana y en el ordenador la del mes, sin
--       querer. «Guardar el periodo de cada widget en tu cuenta, para que el móvil y
--       el ordenador lo recuerden igual.»
--   2 · **Si ya has visto el recorrido** de 30 segundos de la primera vez. Si se
--       guardara en el aparato, cada móvil nuevo te lo volvería a enseñar.
--
-- ── Por qué una tabla y no dos columnas en `persona` ─────────────────────────
--
-- Porque `persona` es de la ficha —la tocan quien da accesos y la propia persona, y
-- lleva su versión para que dos no se pisen—, y esto no le importa a nadie más que a
-- ti: cambiar el periodo de un widget no puede chocar con que tu jefa te cambie el
-- teléfono. Es lo mismo que `panel_de_persona` (0025), y con su misma regla:
-- **nadie ve lo de nadie**.

create table estook.preferencias_de_persona (
  persona_id          uuid         primary key references estook.persona (id) on delete cascade,
  -- De cada widget, su periodo: `{"merma": 30, "ventas": 7}`. Un objeto y no columnas:
  -- un widget nuevo no pide migración, como en el Panel.
  periodos            jsonb        not null default '{}'::jsonb,
  recorrido_visto_en  timestamptz,
  version             integer      not null default 1,
  creado_en           timestamptz  not null default now(),

  constraint preferencias_periodos_es_un_objeto check (jsonb_typeof(periodos) = 'object'),
  -- Acotado: dieciséis widgets son unos cientos de bytes. Esto para a quien quiera
  -- llenar la fila de basura a base de comandos.
  constraint preferencias_acotadas check (pg_column_size(periodos) <= 4096)
);

comment on table estook.preferencias_de_persona is
  'Lo que recuerda la cuenta de cada persona en todos sus aparatos: el periodo de cada widget y si ya vio el recorrido de la primera vez (0084). Solo de cada uno.';

comment on column estook.preferencias_de_persona.periodos is
  'De cada widget, sus días (7 o 30). Lo comprueba el comando; aquí, que sea un objeto y pequeño.';

create trigger preferencias_de_persona_sube_version before update on estook.preferencias_de_persona
  for each row execute function estook.subir_version();

-- ── Seguridad por filas ─────────────────────────────────────────────────────
--
-- Como el Panel (0025): **tuyo y solo tuyo**. Ni el dueño ve qué periodo ha elegido
-- un cocinero, ni hay motivo para que lo vea.

alter table estook.preferencias_de_persona enable row level security;

create policy preferencias_de_persona_solo_mias on estook.preferencias_de_persona
  for all using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

grant select, insert, update on estook.preferencias_de_persona to estook_api;
