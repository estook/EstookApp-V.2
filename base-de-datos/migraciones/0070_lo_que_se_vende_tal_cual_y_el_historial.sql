-- 0070 · Lo que se vende tal cual, y el historial de una receta que solo crece
--        (el arreglo de la 0069, decisión 0088)
--
-- ── 1 · Lo que se vende tal cual ──────────────────────────────────────────────
--
-- Hasta hoy, un plato «vinculado» era el que tenía por receta **una unidad de un
-- producto** y nada más (la lata, la botella). Pero en el Almacén de verdad el
-- entrecot, la dorada entera o el helado van en gramos o mililitros, y no salían para
-- vincular (lección 190). Ahora se vincula con su ración («300 g»), y entonces la forma
-- ya no basta: una tortilla con una sola línea («Huevo, 3 ud») es una ficha, no algo que
-- se vende tal cual. Lo dice la receta, a propósito.
--
-- Los vínculos que ya hay (una línea, un producto, 1 ud) se marcan, sin subir la
-- versión: no ha cambiado lo que lleva nadie.

alter table estook.receta add column tal_cual boolean not null default false;

comment on column estook.receta.tal_cual is
  'El plato se vende tal como se guarda en el Almacén (0088): su receta es un producto y su ración. Solo vale con una línea de producto.';

alter table estook.receta disable trigger receta_sube_version;
update estook.receta r
   set tal_cual = true
 where r.plato_id is not null
   and (select count(*) from estook.linea_de_receta l where l.receta_id = r.id) = 1
   and exists (select 1 from estook.linea_de_receta l
                where l.receta_id = r.id and l.producto_id is not null
                  and l.unidad = 'ud' and l.cantidad = 1);
alter table estook.receta enable trigger receta_sube_version;

-- ── 2 · El historial solo crece ───────────────────────────────────────────────
--
-- La 0069 escribió lo que la API puede hacer en sus tablas nuevas:
--
--   elaboracion, receta   leer, añadir y cambiar; **nunca borrar** (se archiva).
--   linea_de_receta       todo: guardar una receta reescribe sus líneas.
--   receta_guardada       leer y añadir; **ni cambiar ni borrar**: es el historial.
--
-- Pero la 0006 dejó puesto que toda tabla nueva de `estook` nazca con select, insert,
-- update y delete para `estook_api` (`alter default privileges`), y un `grant` más corto
-- **no quita** lo que ya se dio: suma. Así que en producción la API podía cambiar y
-- borrar el historial. La política de seguridad por filas lo paraba (solo hay una de
-- añadir), pero es una barrera, no dos. Lo cazó `bd:comprobar-api` (lección 189).
--
-- Lo mismo que la 0023 hizo con el libro de movimientos: se quita todo y se da justo
-- lo que hace falta.

revoke all on estook.elaboracion, estook.receta, estook.receta_guardada from estook_api;

grant select, insert, update on estook.elaboracion to estook_api;
grant select, insert, update on estook.receta to estook_api;
grant select, insert on estook.receta_guardada to estook_api;
