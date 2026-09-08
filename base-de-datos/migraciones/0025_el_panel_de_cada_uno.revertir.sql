-- Revertir la 0025.
--
-- Se va la tabla entera. Lo unico que se pierde es la composicion del Panel de
-- cada uno, y el Panel vuelve a pintar la de fabrica que le toca a su rol: no se
-- queda en blanco ni se rompe, porque el catalogo de widgets y los valores por
-- rol viven en el codigo.

drop table if exists estook.panel_de_persona;
