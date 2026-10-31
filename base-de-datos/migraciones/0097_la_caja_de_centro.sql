-- 0097 · La caja de centro (T5 · 2 · 2, decisión 0123; Richi, 29-oct: los camareros en el wifi
-- del local, la cocina mejor en una tablet Android y la caja por cable o por wifi)
--
-- **Sin internet, la caja hace de centro**: los comanderos y la pantalla de cocina le hablan por
-- el wifi del local. Para encontrarla sin preguntar a nadie, **la caja dice en su latido dónde
-- escucha** (su dirección en la red del local, con el puerto), y los demás aparatos la guardan
-- mientras hay internet. Y cada aparato dice si llega a ella, para que Aparatos lo enseñe antes
-- de que falte internet y no en mitad del servicio.
--
-- No hay secretos nuevos: la clave de cada aparato con la caja sale de la huella que ya se
-- guarda de la llave de la caja (`huella`), y volver a vincularla las cambia todas.

alter table estook.terminal
  add column centro_en text[],
  add column centro_visto_en timestamptz,
  add column llega_al_centro_en timestamptz,
  add constraint terminal_centro_con_medida check (
    centro_en is null or (cardinality(centro_en) between 1 and 4)
  );

comment on column estook.terminal.centro_en is
  'Solo la caja (0123): dónde escucha en la red del local, «192.168.1.20:47100», según su último latido.';
comment on column estook.terminal.centro_visto_en is
  'Cuándo dijo la caja por última vez dónde escucha (0123).';
comment on column estook.terminal.llega_al_centro_en is
  'La última vez que este aparato dijo que llega a la caja por el wifi del local (0123).';
