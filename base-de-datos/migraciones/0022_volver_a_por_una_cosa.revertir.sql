-- Revertir la 0022.
--
-- Se van las dos restricciones y la columna. No se pierde nada que importe: lo
-- que guardaba era la intencion de un recado a medias, y sin ella el alta
-- simplemente vuelve a comportarse como el asistente completo.

alter table estook.local
  drop constraint if exists local_retomado_solo_con_el_alta_abierta;

alter table estook.local
  drop constraint if exists local_retomado_para_es_un_paso;

alter table estook.local
  drop column if exists onboarding_retomado_para;
