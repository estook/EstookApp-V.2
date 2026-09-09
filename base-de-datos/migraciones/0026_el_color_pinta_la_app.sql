-- 0026 · El color de marca pinta la aplicacion
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Lo que faltaba ─────────────────────────────────────────────────────────
--
-- Desde M5 cada local sube su logo y elige su color en el alta, y eso es lo unico
-- que hace ese color: sale en la cabecera. Ademas **se pedia una sola vez**: no
-- habia forma de cambiarlo despues, ni el logo ni el color, porque el paso vive
-- dentro del alta y el alta no se repite.
--
-- Ahora se cambian en Ajustes, y el color puede pintar la aplicacion entera.
--
-- ── Por que una columna y no una preferencia del navegador ─────────────────
--
-- Porque **es el color de la empresa, no el gusto de quien mira**. Si viviera en
-- el aparato, el gerente lo activaria en su ordenador y el equipo seguiria viendo
-- naranja: la marca del local se veria en un sitio de doce. Es la misma razon por
-- la que la composicion del Panel se subio al servidor en la 0025, aplicada al
-- reves: aquello es de cada uno y esto es del local.
--
-- El tema —claro u oscuro— si vive en el aparato, y no es incoherente: la tableta
-- del pase quiere el claro a las dos de la tarde y el portatil de la oficina
-- quiere el oscuro a las once de la noche, y puede ser la misma persona.
--
-- ── Y por que apagado de fabrica ────────────────────────────────────────────
--
-- Porque el color se eligio en el alta para la cabecera y para los documentos, y
-- encenderlo aqui cambiaria de golpe el aspecto de la aplicacion a todos los
-- locales que ya lo tienen puesto, sin que nadie lo haya pedido. Se enciende
-- desde Ajustes, con su interruptor, viendolo antes.

alter table estook.local
  add column if not exists color_en_la_app boolean not null default false;

comment on column estook.local.color_en_la_app is
  'Si el color de marca pinta la aplicacion entera, y no solo la cabecera. Lo enciende Ajustes.';
