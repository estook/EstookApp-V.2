-- Revertir la 0026.
--
-- Se va la columna. No se pierde ningun color: `color_de_marca` es de la 0020 y
-- se queda donde estaba. Lo unico que se pierde es **si el local habia encendido
-- el interruptor**, y al volver a aplicarla vuelve apagado, que es el valor de
-- fabrica y el lado seguro: la aplicacion se ve como se veia antes.

alter table estook.local
  drop column if exists color_en_la_app;
