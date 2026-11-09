-- Deshace la 0115: los objetivos vuelven a ser en € por hora.
--
-- **Lo que se pierde:** los objetivos por semana o por mes. Un objetivo mensual no se convierte
-- bien en uno por hora (depende de las horas de cada uno), así que se borran, igual que la 0115
-- borró los de € por hora.

delete from estook.objetivo_de_venta;

alter table estook.objetivo_de_venta
  drop constraint objetivo_de_venta_en_rango,
  drop constraint objetivo_de_venta_periodo_conocido,
  drop column periodo,
  drop column centimos,
  add column centimos_por_hora integer not null,
  add constraint objetivo_de_venta_en_rango check (centimos_por_hora between 100 and 100000);

comment on table estook.objetivo_de_venta is
  'El objetivo de venta por hora de un local (general) o de una persona en él (0142). Lo pone quien pone los objetivos; lo leen quien ve las ventas y cada uno el suyo.';
