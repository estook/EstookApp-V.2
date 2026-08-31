-- Reversion de 0006 · La auditoria

drop trigger if exists auditoria_sin_borrar on estook.auditoria;
drop trigger if exists auditoria_sin_modificar on estook.auditoria;

drop function if exists estook.anotar(uuid, text, text, text, uuid, jsonb, jsonb, text);
drop function if exists estook.auditoria_solo_se_anade();

drop table if exists estook.auditoria;

alter default privileges in schema estook
  revoke select, insert, update, delete on tables from estook_api;
alter default privileges in schema estook
  revoke usage, select on sequences from estook_api;

revoke all on all tables in schema estook from estook_api;
revoke all on all sequences in schema estook from estook_api;
revoke usage on schema estook from estook_api;

-- El rol no se borra: puede haber conexiones abiertas usandolo, y borrar roles
-- es de las pocas cosas que no se pueden deshacer sin enterarse.
