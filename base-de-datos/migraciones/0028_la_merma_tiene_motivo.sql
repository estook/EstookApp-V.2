-- 0028 · La merma tiene motivo, y no toda la merma es merma
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Lo que había ────────────────────────────────────────────────────────────
--
-- El tipo de movimiento `merma` está en el catálogo **desde la 0023**, declarado
-- entero de una vez con esta nota: «M6 produce entrada, salida y ajuste; merma y
-- recuento son M8». Y el permiso `accion.registrar_merma` está desde M1, y lo
-- tienen el camarero, el cocinero, el jefe de sala y el jefe de cocina.
--
-- Es decir: cuatro roles llevan doce migraciones con permiso para registrar una
-- merma, el libro sabe guardarla, **y no había forma de apuntar ninguna**. Lo que
-- se hacía en su lugar era una salida con el motivo escrito a mano, y eso tiene
-- una consecuencia cara: un texto libre no se puede sumar. «¿Cuánto se me ha ido
-- en producto caducado este mes?» no se contesta con `motivo like '%caduc%'`.
--
-- ── Y la regla que ordena esta migración entera ─────────────────────────────
--
-- «La comida del personal **no es merma**, ni las invitaciones: van con motivo
-- propio y **como partida aparte**, o el food cost miente» (Manifiesto 28).
--
-- Eso es lo que decide que aquí haya dos tipos y no uno. El motivo dice qué pasó;
-- la partida dice **en qué cuenta cae**, y son cosas distintas: dos kilos de
-- solomillo que se estropean y dos kilos que se come el equipo salen los dos de
-- la cámara y cuestan lo mismo, pero uno es una pérdida y el otro es un gasto de
-- personal. Sumarlos juntos es exactamente cómo un food cost empieza a mentir.
--
-- La partida **se deduce del motivo**, no se elige: si se eligieran las dos, un
-- día alguien apuntaría «caducado» en la partida de personal y nadie lo vería.
-- Un dato, un único dueño (regla 6).

create type estook.motivo_de_merma as enum (
  -- ── Lo que se pierde de verdad ───────────────────────────────────────────
  'caducado',
  'mal_estado',
  'roto',
  'fallo_de_elaboracion',
  -- ── Lo que sale de la cámara y no es una pérdida ─────────────────────────
  'comida_de_personal',
  'invitacion',
  'prueba_de_carta',
  -- ── Y el cajón, que lleva su texto obligatorio ───────────────────────────
  'otro'
);

comment on type estook.motivo_de_merma is
  'Por que salio el genero sin venderse. Lista cerrada a proposito: un motivo escrito a mano no se puede sumar, y la pregunta que se hace es cuanto se va en cada cosa.';

create type estook.partida_de_merma as enum ('perdida', 'personal', 'atencion');

comment on type estook.partida_de_merma is
  'En que cuenta cae. Se deduce del motivo, nunca se elige: perdida es food cost, personal es gasto de personal y atencion es comercial.';

create or replace function estook.partida_de_la_merma(p_motivo estook.motivo_de_merma)
returns estook.partida_de_merma
language sql
immutable
as $$
  select case p_motivo
    when 'comida_de_personal' then 'personal'::estook.partida_de_merma
    when 'invitacion'         then 'atencion'::estook.partida_de_merma
    when 'prueba_de_carta'    then 'atencion'::estook.partida_de_merma
    else 'perdida'::estook.partida_de_merma
  end
$$;

comment on function estook.partida_de_la_merma(estook.motivo_de_merma) is
  'El unico dueno de «esto cuenta como perdida o no». Lo usan el resumen del dia, la lista y el informe.';

-- ── La columna ──────────────────────────────────────────────────────────────
--
-- Va en el libro y no en una tabla aparte, y esa es la decisión importante: **una
-- merma es una salida de género**, no un documento. Ponerla en su propia tabla
-- obligaría a que el stock se calculara desde dos sitios, que es justo lo que la
-- regla 8 prohíbe —«no hay ninguna tabla con una cantidad editable»— y lo que
-- hace que la cámara se pueda cuadrar leyendo una sola cosa.

alter table estook.movimiento_de_stock
  add column motivo_de_merma estook.motivo_de_merma;

comment on column estook.movimiento_de_stock.motivo_de_merma is
  'Obligatorio en las mermas y prohibido en lo demas. De el sale la partida, que es lo que separa una perdida de la comida del personal.';

-- Las dos direcciones, y las dos hacen falta: una merma sin motivo no se puede
-- analizar, y una entrada con motivo de merma es un dato que no significa nada y
-- que un día alguien sumaría.
alter table estook.movimiento_de_stock
  add constraint movimiento_merma_con_su_motivo check (
    (tipo = 'merma') = (motivo_de_merma is not null)
  ),
  -- «Otro» sin explicar es lo mismo que no poner motivo, con un paso más. El
  -- texto libre vive en `motivo`, que ya existe.
  add constraint movimiento_merma_otro_se_explica check (
    motivo_de_merma is distinct from 'otro'
    or (motivo is not null and length(btrim(motivo)) > 0)
  );

-- El índice de la pantalla de mermas: las de un local, por día, de nuevo a
-- viejo. Parcial, porque las mermas son una fracción del libro y un índice sobre
-- el libro entero para leer esa fracción es pagar por lo que no se usa.
create index movimiento_mermas_por_dia
  on estook.movimiento_de_stock (local_id, fecha_operativa desc, id desc)
  where tipo = 'merma';

-- ── Y quién puede apuntarla ─────────────────────────────────────────────────
--
-- Hasta ahora, escribir en el libro pedía `app.inventario` en «ver y editar», que
-- **el camarero no tiene**. Y el camarero es quien rompe una copa y quien ve
-- caerse una bandeja: es, literalmente, la persona a la que se le pensó
-- `accion.registrar_merma` en M1.
--
-- Así que la política de apunte se amplía: se puede escribir en el libro con
-- Inventario en «ver y editar» **o** con permiso de registrar merma, y en ese
-- segundo caso **solo mermas**. Un camarero no apunta una entrada de género.

drop policy if exists movimiento_apunte on estook.movimiento_de_stock;

create policy movimiento_apunte on estook.movimiento_de_stock
  for insert with check (
    estook.puede_editar('app.inventario', local_id)
    or (tipo = 'merma' and estook.puede_editar('accion.registrar_merma', local_id))
  );

comment on table estook.movimiento_de_stock is
  'El libro. Solo se anade: un movimiento equivocado se enmienda con otro, nunca se corrige. De aqui sale todo el stock de Estook, y desde la 0028 tambien la merma con su motivo.';
