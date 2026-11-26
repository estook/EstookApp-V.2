-- 0134 · La Ampliación 5 · 2, lo que pidió Richi al verla (decisión 0153, secciones 9 y 20)
--
-- **Hasta cuánto antes se reserva por la web lo elige cada local** (Richi, 26-nov: «¿y si ellos sí lo
-- permiten? ¿generalizas con todos?»): 15 minutos, 30, 1 hora, 2, 4 o un día. De fábrica, dos horas, como la
-- maqueta aprobada. En el TPV se reserva siempre, al momento.
--
-- Va aparte de la 0133 porque la 0133 ya está fusionada (#209) y puede estar aplicada: una migración aplicada
-- no se vuelve a pasar, así que cambiarla dejaría la base sin la columna.

alter table estook.ajuste_de_reservas
  add column antelacion_web smallint not null default 120,
  add constraint ajuste_de_reservas_antelacion_web
    check (antelacion_web in (15, 30, 60, 120, 240, 1440));

comment on column estook.ajuste_de_reservas.antelacion_web is
  'Hasta cuántos minutos antes de la hora se reserva por la web: lo elige cada local (0153). Dos horas de fábrica.';
