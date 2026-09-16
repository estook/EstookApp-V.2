-- 0039 · Los intentos se cuentan de verdad (repaso de la 0042)
--
-- Revisando la entrada para abrir el registro salió un fallo de seguridad que
-- llevaba ahí desde M4, y dos cosas:
--
--   · **El bloqueo a los cinco intentos no bloqueaba nunca.** `entrar` apuntaba el
--     intento fallido y después fallaba; el fallo deshacía la transacción, y con
--     ella el apunte. Se arregla en el despachador (`falloQueSeGuarda`), sin tocar
--     la base: las columnas ya estaban.
--   · **El código del segundo factor no tenía límite de intentos.** Seis cifras,
--     con tres tramos válidos, se prueban en poco más de trescientas mil llamadas.
--     Esta migración le da el mismo límite que a la contraseña: cinco fallos,
--     quince minutos.

alter table estook.doble_factor
  add column intentos_fallidos smallint not null default 0,
  add column bloqueado_hasta   timestamptz;

alter table estook.doble_factor
  add constraint doble_factor_intentos_no_negativos check (intentos_fallidos >= 0);

comment on column estook.doble_factor.bloqueado_hasta is
  'Cinco códigos mal seguidos paran el segundo factor quince minutos, igual que la contraseña (0039).';
