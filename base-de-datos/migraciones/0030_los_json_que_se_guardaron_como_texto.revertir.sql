-- Revertir la 0030.
--
-- Se quita la función. Lo convertido **no se vuelve a envolver**: volver a
-- guardar los objetos como texto sería volver a romper lo que la 0030 arregló, y
-- con el código de ahora el formato bueno es el que se escribe.

drop function if exists estook.json_de_verdad(jsonb);
