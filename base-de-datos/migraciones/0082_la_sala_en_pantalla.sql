-- 0082 · La sala en pantalla (M20A · 1 · 2, decisión 0106)
--
-- Lo que necesita Estook TPV para tomar nota que no tenía la 0081: **saber qué es bebida**.
-- La pestaña Bebidas enseña las secciones de bebidas, y lo que se pide de ellas va a la
-- barra y no a la cocina (0106). Sin esto, el camarero tendría que decir a dónde va cada
-- caña.
--
--   · `seccion_de_carta.es_bebida`  Bebidas, Vinos, Cervezas, Cafés, Copas…
--   · `seccion_de_menu.es_bebida`   la «Bebida» del menú del día: la caña o la copa que
--                                   entra en el menú va a la barra
--
-- Lo que ya hay se marca por su nombre, con las mismas palabras que `esDeBebidas` del
-- dominio (`packages/dominio/src/sala.ts`): una sección nueva con esos nombres nace
-- marcada, y el local lo cambia con un toque en la Carta.

alter table estook.seccion_de_carta
  add column es_bebida boolean not null default false;

comment on column estook.seccion_de_carta.es_bebida is
  'Si es de bebidas (0106): sale en la pestaña Bebidas de Estook TPV y lo que se pide va a la barra, no a la cocina.';

alter table estook.seccion_de_menu
  add column es_bebida boolean not null default false;

comment on column estook.seccion_de_menu.es_bebida is
  'Si es la bebida del menú (0106): lo que se elige de ella va a la barra, no a la cocina.';

update estook.seccion_de_carta
   set es_bebida = true
 where estook.sin_acentos(nombre)
       ~ '(bebida|vino|cerveza|refresco|cafe|infusion|copa|combinado|coctel|licor|cava|champan|zumo|vermut|sidra)';

update estook.seccion_de_menu
   set es_bebida = true
 where estook.sin_acentos(nombre)
       ~ '(bebida|vino|cerveza|refresco|cafe|infusion|copa|combinado|coctel|licor|cava|champan|zumo|vermut|sidra)'
   and not es_postre;
