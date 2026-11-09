-- Deshace la 0114: el color y el icono vuelven a vivir solo en la página del TPV.
--
-- **Lo que se guarda:** lo elegido para cada sección vuelve a su página del TPV. **Lo que se
-- pierde:** el color y el icono de una sección que no tiene página en el TPV (una carta sin
-- botonera), que vuelve a «el que propone su nombre».

update estook.pagina_del_tpv p
   set color = s.color,
       icono = s.icono
  from estook.seccion_de_carta s
 where p.seccion_id = s.id
   and (s.color is not null or s.icono is not null);

comment on column estook.pagina_del_tpv.color is
  'El color de la sección (R3, 0133: once). Nulo: el que propone su nombre.';
comment on column estook.pagina_del_tpv.icono is
  'El icono de la sección, por su nombre de Lucide (R3, 0133). Nulo: el que propone su nombre.';

alter table estook.seccion_de_carta
  drop constraint seccion_color_conocido,
  drop constraint seccion_icono_conocido,
  drop column color,
  drop column icono;
