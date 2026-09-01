-- Reversion de 0012 · La ficha fiscal del local

alter table estook.local drop constraint if exists local_regimen_del_territorio;
drop index if exists estook.local_por_territorio;

alter table estook.local
  drop column if exists modo_de_precio,
  drop column if exists epigrafe_iae,
  drop column if exists actividad,
  drop column if exists regimen,
  drop column if exists territorio;
