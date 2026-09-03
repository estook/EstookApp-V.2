-- Semilla 3 de 5 · los objetivos de los locales que ya estan montados
--
-- «Objetivos. Materia prima, personal y margen por familia. **Son los que ponen
--  en verde o en rojo los semaforos de toda la aplicacion**, y los que usa Fogon
--  para decir si algo esta bien o mal. Vienen propuestos segun el tipo de local»
-- (Manifiesto 9).
--
-- Se siembran **de partida**, es decir marcados como «estos te los hemos puesto
-- nosotros», que es lo que la Auditoria (1.2) exige decir: «si faltan: se usan
-- los del tipo de local **y se dice que son los de partida**».
--
-- Casa Lola no entra: no tiene tipo todavia, porque no ha pasado del paso 2 del
-- alta. Un local sin tipo no puede tener objetivos propuestos, y esa es
-- exactamente la razon de que el paso 6 exista.
--
-- Idempotente, como las demas.

insert into estook.objetivo (local_id, clave, valor, desde, de_partida)
select l.id, p.clave, p.valor, current_date, true
  from estook.local l
  join estook.objetivo_de_partida p on p.tipo = l.tipo
 where l.es_ejemplo
   and l.tipo is not null
   and not exists (
     select 1 from estook.objetivo o
      where o.local_id = l.id and o.clave = p.clave and o.hasta is null
   );
