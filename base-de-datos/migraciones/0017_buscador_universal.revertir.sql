-- Reversion de 0017 · El buscador universal

drop function if exists estook.buscar(text, int);

drop index if exists estook.area_buscable;
drop index if exists estook.organizacion_buscable;
drop index if exists estook.persona_correo_buscable;
drop index if exists estook.persona_buscable;
drop index if exists estook.local_codigo_buscable;
drop index if exists estook.local_buscable;

drop function if exists estook.sin_acentos(text);

-- La extension pg_trgm no se quita. Es compartida con todo el proyecto y quitarla
-- se llevaria por delante cualquier otro indice que la use. Que una reversion
-- deje una extension instalada y sin usar no rompe nada; que se lleve un indice
-- ajeno, si.
