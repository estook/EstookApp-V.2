-- Revertir la 0029.
--
-- Se van los cierres y sus líneas, y el local vuelve a no tener elegido cómo
-- entran sus ventas. Lo que se pierde es la facturación registrada: si había
-- cierres dentro, esto no deshace un cambio de forma, borra el histórico de
-- ventas del local.

drop trigger if exists linea_de_cierre_normaliza on estook.linea_de_cierre;
drop function if exists estook.normalizar_el_concepto();

drop table if exists estook.linea_de_cierre;
drop table if exists estook.cierre_de_caja;

alter table estook.local
  drop column if exists como_se_cierra,
  drop column if exists tpv,
  drop column if exists tpv_conectado_en;

drop type if exists estook.como_se_cierra;
