-- 0040 · Cuándo es llegar tarde (mejoras antes de M8, entrega V, punto 2)
--
-- Equipo enseña sus cifras con flecha, y una de ellas son **los retrasos**: los
-- fichajes de entrada que llegan más tarde que la hora del horario de siempre de
-- esa persona (`horario_habitual`, 0027).
--
-- «Más tarde» necesita un margen, porque nadie llama retraso a fichar a las 9:01.
-- Richi lo decidió el 23 de septiembre de 2026: **cinco minutos de fábrica, y cada
-- local lo cambia** en Ajustes. Hay bares donde diez minutos es lo normal, y un
-- margen que no se puede cambiar acaba ignorado.
--
-- Es un ajuste **del local** y no de la organización: dos locales de la misma
-- cadena pueden tener costumbres distintas, igual que tienen su hora de corte y su
-- radio del fichaje. Lo cambia quien puede tocar la ficha del local
-- (`local_edicion`, 0020), sin política nueva.
--
-- Lo que **no** hace: decidir si alguien ha llegado tarde. Eso es una cuenta, y
-- las cuentas viven en el dominio (`llegoTarde`, regla 6). Aquí solo se guarda el
-- número.

alter table estook.local
  add column margen_de_retraso_minutos smallint not null default 5;

-- Una hora de margen ya no es un margen: es no contar retrasos. Y un número
-- negativo contaría como tarde a quien llega antes.
alter table estook.local
  add constraint local_margen_de_retraso_con_sentido
  check (margen_de_retraso_minutos between 0 and 60);

comment on column estook.local.margen_de_retraso_minutos is
  'Minutos tras la hora del horario de siempre a partir de los que un fichaje cuenta como retraso. Cinco de fábrica (0040).';
