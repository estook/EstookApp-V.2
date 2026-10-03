-- 0055 · Anular un movimiento mal tecleado (repaso del 3-oct)
--
-- Santi sacó en IKATZ 2.000 kg de atún donde había 6,6 (tenía elegido «por kilo» y
-- escribió 2000). Nada lo frenó, y el libro de movimientos solo se añade, nunca se
-- borra ni se edita (regla 8): «¿No cuadra?» devolvía lo que hay a su sitio, pero las
-- dos toneladas seguían contando como vendidas en las ventas, en lo que se gasta al
-- día, en cuándo se agota y en el pedido sugerido, durante las cuatro semanas que
-- mira cada cuenta.
--
-- Anular **no borra**: apunta una línea más, del mismo tipo y con la cantidad al
-- revés, que dice en `referencia` a cuál anula. Lo que cuenta —lo vendido, lo
-- gastado, las mermas— se lee de la vista `movimiento_que_cuenta`, que deja fuera
-- las dos líneas, la anulada y la que anula. El libro sigue entero y se lee igual.
--
--   A · Un movimiento se anula **una sola vez** (índice único), y encontrar la línea
--       que lo anula es una búsqueda por índice, no un recorrido del libro.
--   B · La vista de lo que cuenta, con los permisos de quien pregunta.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Una sola vez, y por índice
-- ═══════════════════════════════════════════════════════════════════════════

create unique index movimiento_se_anula_una_vez
  on estook.movimiento_de_stock ((referencia ->> 'anula'))
  where referencia ? 'anula';

comment on index estook.movimiento_se_anula_una_vez is
  'Un movimiento se anula una vez. La línea que anula guarda en referencia.anula el id de la anulada.';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo que cuenta
-- ═══════════════════════════════════════════════════════════════════════════

create view estook.movimiento_que_cuenta
with (security_invoker = true)
as
  select m.*
    from estook.movimiento_de_stock m
   where not coalesce(m.referencia ? 'anula', false)
     and not exists (
       select 1
         from estook.movimiento_de_stock a
        where a.referencia ? 'anula'
          and a.referencia ->> 'anula' = m.id::text
     );

comment on view estook.movimiento_que_cuenta is
  'El libro sin lo anulado ni lo que anula: de aquí salen lo vendido, lo gastado y las mermas. Lo que hay en cámara sigue saliendo de existencias, que lee el libro entero.';

grant select on estook.movimiento_que_cuenta to estook_api;
