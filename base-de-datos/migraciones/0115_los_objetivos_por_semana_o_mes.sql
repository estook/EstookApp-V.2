-- 0115 · El repaso del 8-nov · R2 · 2 · Los objetivos de venta, en € a la semana o al mes (0143)
--
-- Richi, 8-nov: «en objetivos a empleados pones euros la hora… pon objetivos a dinero a la semana
-- o al mes». Y el 9-nov: los de € por hora **se borran y se empieza de cero**: un € por hora no se
-- convierte bien en un mes, porque depende de las horas de cada uno.
--
--   · `periodo`   'semana' o 'mes': de qué es la cifra
--   · `centimos`  lo que debería vender, sin IVA: de 1 € a 1.000.000 €
--   · fuera `centimos_por_hora`
--
-- Lo demás no cambia: uno general por local y uno distinto para quien haga falta, `cada_uno_lo_ve`
-- en el general, y quién lo lee y quién lo pone (0113).

-- Empezar de cero (Richi, 9-nov): se borran los de € por hora.
delete from estook.objetivo_de_venta;

alter table estook.objetivo_de_venta
  drop constraint objetivo_de_venta_en_rango,
  drop column centimos_por_hora,
  add column periodo text not null,
  add column centimos integer not null,
  add constraint objetivo_de_venta_periodo_conocido check (periodo in ('semana', 'mes')),
  add constraint objetivo_de_venta_en_rango check (centimos between 100 and 100000000);

comment on column estook.objetivo_de_venta.periodo is
  'De qué es la cifra: la semana o el mes (0143).';
comment on column estook.objetivo_de_venta.centimos is
  'Lo que debería vender en ese periodo, sin IVA, en céntimos: de 1 € a 1.000.000 € (0143).';
comment on table estook.objetivo_de_venta is
  'El objetivo de venta de un local (general) o de una persona en él, en € a la semana o al mes (0142, 0143). Lo pone quien pone los objetivos; lo leen quien ve las ventas y cada uno el suyo.';
