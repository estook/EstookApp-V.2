-- Reversion de 0013 · Las reglas fiscales

drop policy if exists regla_fiscal_lectura on estook.regla_fiscal;

drop trigger if exists regla_fiscal_auditada on estook.regla_fiscal;
drop trigger if exists regla_fiscal_intocable on estook.regla_fiscal;
drop trigger if exists regla_fiscal_actualizada on estook.regla_fiscal;

drop function if exists estook.regla_fiscal_deja_rastro();
drop function if exists estook.regla_fiscal_no_se_reescribe();

drop table if exists estook.regla_fiscal;

-- Para volver a exigir la organizacion hay que quitar antes las lineas que no la
-- tienen. La auditoria no deja borrar, y esta bien que no deje: apartar su
-- guardian solo esta permitido aqui, para deshacer la propia migracion que creo
-- esas lineas, y se vuelve a poner inmediatamente.
alter table estook.auditoria disable trigger auditoria_sin_borrar;
delete from estook.auditoria where organizacion_id is null;
alter table estook.auditoria enable trigger auditoria_sin_borrar;

alter table estook.auditoria alter column organizacion_id set not null;
