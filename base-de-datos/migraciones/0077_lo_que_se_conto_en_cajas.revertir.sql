-- Deshace la 0077: las líneas que puso en el libro se van, y los precios «sin proveedor»
-- que cerró vuelven a estar vivos.
--
-- Borrar del libro solo se hace aquí, y solo esas líneas: son las que puso la 0077 (todas
-- llevan `"arreglo": "0077"`), y sin ellas cada producto vuelve a lo que tenía.

delete from estook.movimiento_de_stock where referencia ->> 'arreglo' = '0077';

update estook.precio_de_producto
   set hasta = null,
       referencia = nullif(referencia - 'arreglo', '{}'::jsonb)
 where referencia ->> 'arreglo' = '0077';
