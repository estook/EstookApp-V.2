-- Revertir la 0024.
--
-- Se va la columna. Lo unico que se pierde es «no me lo recuerdes», y sin ella
-- el Panel vuelve a ensenar la tarjeta a quien tenga pasos pendientes, que es
-- como se comportaba antes.

alter table estook.local
  drop column if exists panel_recordatorio_oculto;
