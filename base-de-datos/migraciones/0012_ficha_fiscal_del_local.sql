-- 0012 · La ficha fiscal del local
--
-- Modulo M2. Hasta ahora el local solo sabia su zona horaria. Para ponerle el
-- impuesto a una venta hace falta saber ademas donde esta, bajo que regimen y a
-- que se dedica.
--
-- **Estos campos nacen aqui, pero los rellena M5**, que es donde el Plan pone el
-- «regimen fiscal» dentro del alta asistida. Hasta entonces valen los de por
-- defecto, que son los del caso mas comun.

alter table estook.local
  add column territorio estook.territorio_fiscal not null default 'peninsula_y_baleares',
  add column regimen estook.regimen_fiscal not null default 'iva',
  add column actividad estook.actividad_de_hosteleria,
  add column epigrafe_iae text,
  -- En una carta de bar los precios llevan el impuesto dentro. Es lo normal aqui.
  add column modo_de_precio estook.modo_de_precio not null default 'impuesto_incluido';

comment on column estook.local.territorio is
  'Donde esta el local a efectos fiscales. Decide que impuesto se le aplica.';
comment on column estook.local.actividad is
  'Solo determina el tipo en Ceuta y en Melilla, pero se guarda siempre.';
comment on column estook.local.epigrafe_iae is
  'El epigrafe del IAE, como texto. La normativa de Ceuta cita epigrafes concretos (673.2, 677.9).';

create index local_por_territorio on estook.local (territorio, regimen);

-- El regimen no se elige: lo determina el territorio. Se comprueba en la base de
-- datos para que no pueda quedar un local canario con IVA por un descuido.
alter table estook.local
  add constraint local_regimen_del_territorio check (
    (territorio = 'peninsula_y_baleares' and regimen = 'iva')
    or (territorio = 'canarias' and regimen = 'igic')
    or (territorio in ('ceuta', 'melilla') and regimen = 'ipsi')
  );

comment on constraint local_regimen_del_territorio on estook.local is
  'Canarias es IGIC, Ceuta y Melilla son IPSI, el resto IVA. No es configurable: lo dice la ley.';
