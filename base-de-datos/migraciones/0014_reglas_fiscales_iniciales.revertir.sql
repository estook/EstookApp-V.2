-- Reversion de 0014 · Las reglas fiscales iniciales
--
-- El guardian de 0013 impide borrar reglas, asi que hay que apartarlo para
-- deshacer la siembra. Es el unico sitio donde eso esta permitido, y solo para
-- deshacer la propia migracion que las creo.

alter table estook.regla_fiscal disable trigger regla_fiscal_intocable;
alter table estook.regla_fiscal disable trigger regla_fiscal_auditada;

delete from estook.regla_fiscal
 where codigo in (
   'iva-restauracion', 'iva-alimento-entregado', 'iva-alcohol-entregado',
   'iva-refresco-azucarado-entregado', 'iva-refresco-entregado', 'iva-otros-entregado',
   'igic-restauracion',
   'ipsi-ceuta-servicios', 'ipsi-ceuta-un-tenedor', 'ipsi-ceuta-bares-673-2',
   'ipsi-ceuta-restauracion-677-9',
   'ipsi-melilla-servicios', 'ipsi-melilla-un-tenedor', 'ipsi-melilla-cafes-y-bares',
   'ipsi-melilla-dos-o-mas-tenedores', 'ipsi-melilla-categoria-especial',
   'ipsi-melilla-demas-hosteleria'
 );

alter table estook.regla_fiscal enable trigger regla_fiscal_auditada;
alter table estook.regla_fiscal enable trigger regla_fiscal_intocable;
