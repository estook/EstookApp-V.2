-- 0091 · El reloj del lunes (26 de octubre de 2026; lección 225)
--
-- **La revisión de noche no veía la que ya había hecho.** El reloj es el sistema, no una
-- persona, y la política de lectura de `revision_de_fogon` pide poder ver Fogón y el
-- Almacén del local: para el sistema, nada. Así que a la hora siguiente volvía a elegir los
-- mismos locales, la IA los volvía a revisar y guardarlo chocaba con
-- `revision_de_fogon_una_de_noche`. En producción, ese choque tumbaba el latido entero
-- (la madrugada del 26-oct, desde la 01:07 hasta las 06:07, la última hora en que revisa).
--
-- Se arregla como `cuentas_con_fogon` (0075): **se lo dice la base, y solo al sistema**.
-- No se abre la tabla al sistema: solo qué locales ya están revisados esa semana.

create function estook.locales_revisados_de_noche(p_semana date)
returns table (local_id uuid)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select r.local_id
    from estook.revision_de_fogon r
   where r.semana = p_semana
     and r.de_noche
     and estook.es_el_sistema()
$$;

comment on function estook.locales_revisados_de_noche(date) is
  'Los locales que ya tienen su revisión de noche esa semana. Solo al sistema: el reloj del lunes (0091).';

revoke all on function estook.locales_revisados_de_noche(date) from public;
grant execute on function estook.locales_revisados_de_noche(date) to estook_api;
