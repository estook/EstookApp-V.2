-- Deshace la 0074: se van los dos interruptores de Fogón y lo apuntado de cada llamada.
--
-- Lo apuntado es lo que ha costado Fogón: se avisa de cuántas llamadas había antes de
-- borrarlo, para que no se pierda sin saberlo.

do $$
declare
  llamadas int;
begin
  select count(*) into llamadas from estook.llamada_a_fogon;
  if llamadas > 0 then
    raise notice '% llamada(s) a Fogón apuntadas se borran con la tabla', llamadas;
  end if;
end
$$;

drop function if exists estook.lo_gastado_en_fogon(uuid);
drop table if exists estook.llamada_a_fogon;
drop function if exists estook.como_esta_fogon(uuid);
drop table if exists plataforma.fogon_del_cliente;
drop table if exists plataforma.fogon;
