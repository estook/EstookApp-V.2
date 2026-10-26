-- 0092 · T4 · 2 · La barra y la alergia de la mesa (decisión 0117; Anexo 3.2 y 7.2; maquetas
-- de T4, 2.ª versión, 3, 4 y 5)
--
--   · `alergeno_de_la_cuenta`   la alergia de la mesa: cada alérgeno de los catorce, quién lo
--                               marcó y cuándo. La marca la sala; la ven la sala y la cocina
--   · `linea_de_cuenta.alergenos`  lo que lleva cada plato, **congelado al pedir**, como el
--                               precio: la cocina lo ve sin leer la carta ni las fichas
--
-- **La pantalla de barra** no necesita nada nuevo aquí: la 0090 ya reconoce «la pantalla de
-- cocina o de barra» del local con el permiso de cocinar y ningún otro.

-- ═══ La alergia de la mesa ═══════════════════════════════════════════════════════

create table estook.alergeno_de_la_cuenta (
  cuenta_id    uuid         not null references estook.cuenta (id) on delete cascade,
  local_id     uuid         not null references estook.local (id) on delete cascade,
  -- Uno de los catorce oficiales (0020): la tabla de referencia hace de lista cerrada.
  alergeno     text         not null references estook.alergeno (codigo),
  marcado_por  uuid         references estook.persona (id) on delete set null,
  marcado_en   timestamptz  not null default now(),
  primary key (cuenta_id, alergeno)
);

comment on table estook.alergeno_de_la_cuenta is
  'La alergia de la mesa (Anexo 3.2, 7.2): la marca la sala al abrirla o después; al pedir algo que lo lleva, la sala avisa, y en cocina sale en rojo. La cocina no confirma nada (0117).';

create index alergeno_de_la_cuenta_por_local on estook.alergeno_de_la_cuenta (local_id);

alter table estook.alergeno_de_la_cuenta enable row level security;

-- La leen quienes ven las mesas: la sala, quien cocina y la pantalla del local (0090). La
-- marca y la quita la sala, en una cuenta de su local.
create policy alergeno_de_la_cuenta_lectura on estook.alergeno_de_la_cuenta
  for select using (estook.lleva_el_servicio(local_id));
create policy alergeno_de_la_cuenta_alta on estook.alergeno_de_la_cuenta
  for insert with check (
    estook.puede_editar('accion.tomar_nota', local_id)
    and exists (
      select 1 from estook.cuenta c
       where c.id = cuenta_id and c.local_id = alergeno_de_la_cuenta.local_id
    )
  );
create policy alergeno_de_la_cuenta_baja on estook.alergeno_de_la_cuenta
  for delete using (estook.puede_editar('accion.tomar_nota', local_id));

revoke all on estook.alergeno_de_la_cuenta from public;
grant select, insert, delete on estook.alergeno_de_la_cuenta to estook_api;

-- ═══ Lo que lleva cada plato, congelado al pedir ═══════════════════════════════════

alter table estook.linea_de_cuenta
  add column alergenos text[] not null default '{}';

comment on column estook.linea_de_cuenta.alergenos is
  'Lo que lleva el plato al pedirlo (0117): los suyos, los de su receta y los de lo que añaden sus opciones. Como el precio, no cambia si después cambia la ficha.';

create trigger linea_de_cuenta_alergenos_conocidos
  before insert or update of alergenos on estook.linea_de_cuenta
  for each row execute function estook.alergenos_conocidos();
