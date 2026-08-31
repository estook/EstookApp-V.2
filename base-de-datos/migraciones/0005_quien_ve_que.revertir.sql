-- Reversion de 0005 · Quien ve que

drop function if exists estook.puede_editar(text, uuid);
drop function if exists estook.puede_ver(text, uuid);
drop function if exists estook.nivel_de_permiso_en_organizacion(uuid, uuid, text);
drop function if exists estook.nivel_de_permiso(uuid, uuid, text);
drop function if exists estook.personas_visibles();
drop function if exists estook.personas_visibles(uuid);
drop function if exists estook.organizaciones_visibles();
drop function if exists estook.organizaciones_visibles(uuid);
drop function if exists estook.locales_visibles();
drop function if exists estook.locales_visibles(uuid);
drop function if exists estook.persona_actual();
