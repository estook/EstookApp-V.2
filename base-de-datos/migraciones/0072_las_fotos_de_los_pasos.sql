-- 0072 · Las fotos de los pasos de la ficha técnica (el repaso del 16-oct, decisión 0090)
--
-- Richi, 16-oct: el escandallo y la ficha técnica son dos cosas. El escandallo desgrana
-- el plato con sus pesos y sus precios; la ficha técnica es **para enseñar a los nuevos
-- a hacerlo**: el plato de la carta, lo que lleva (lo saca del escandallo, sin euros) y
-- los pasos, **cada uno con su foto si se quiere**.
--
-- Los pasos ya eran un dato (`receta.pasos`, uno por paso, 0069). Las fotos van al
-- lado, en el mismo orden: la del paso 3 es la tercera. Vacía ('') es un paso sin foto.
-- Se guarda la clave del almacén, nunca un enlace: los enlaces caducan y se firman cada
-- vez que se enseñan, como las del producto y las del plato.
--
-- No se apuntan en el historial: la receta guardada sigue siendo lo que lleva y cómo se
-- hace, y una foto no cambia el coste ni lo que se gasta.

alter table estook.receta
  add column fotos_de_los_pasos text[] not null default '{}';

alter table estook.receta
  add constraint receta_fotos_de_los_pasos_razonables
  check (cardinality(fotos_de_los_pasos) <= 40);

comment on column estook.receta.fotos_de_los_pasos is
  'La foto de cada paso, en el mismo orden que pasos: la clave en el almacén, o vacía si ese paso no lleva (0090).';
