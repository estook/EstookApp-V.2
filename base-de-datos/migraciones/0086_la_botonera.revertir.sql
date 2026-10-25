-- Deshace la 0086: vuelve «Es de bebidas» en las secciones de la carta, marcado en las que
-- tenían su página en la barra, y se van la botonera y lo de cómo se montó.

alter table estook.seccion_de_carta add column es_bebida boolean not null default false;

comment on column estook.seccion_de_carta.es_bebida is
  'Si lo de esta sección es de beber: va a la barra, sin pase (0106).';

update estook.seccion_de_carta s
   set es_bebida = true
 where exists (
   select 1 from estook.pagina_del_tpv g
    where g.seccion_id = s.id and g.quien_lo_prepara = 'barra'
 );

drop trigger plato_entra_en_la_botonera on estook.plato;
drop function estook.el_plato_entra_en_la_botonera();

alter table estook.local drop constraint local_botonera_camino_conocido;
alter table estook.local drop column botonera_entra_solo, drop column botonera_camino;

drop table estook.boton_del_tpv;
drop table estook.pagina_del_tpv;

drop function estook.lo_que_propone_el_nombre(text);
