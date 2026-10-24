-- Deshace la 0085: el plano vuelve a dibujarse con los ajustes de Estook, sin las cosas de
-- la sala. Las mesas pierden su tamaño y su giro; las de formas nuevas pasan a la más
-- parecida de las tres de antes.

drop function estook.han_fichado_la_salida(uuid);

drop policy mesa_escritura on estook.mesa;
create policy mesa_escritura on estook.mesa
  for all using (estook.puede_editar('app.ajustes', local_id))
  with check (
    estook.puede_editar('app.ajustes', local_id)
    and exists (select 1 from estook.zona_de_sala z where z.id = zona_id and z.local_id = mesa.local_id)
  );

drop policy zona_de_sala_escritura on estook.zona_de_sala;
create policy zona_de_sala_escritura on estook.zona_de_sala
  for all using (estook.puede_editar('app.ajustes', local_id))
  with check (estook.puede_editar('app.ajustes', local_id));

drop table estook.elemento_de_sala;

alter table estook.mesa drop constraint mesa_giro_en_grados;
alter table estook.mesa drop constraint mesa_tamano_en_el_plano;
alter table estook.mesa drop column giro, drop column fondo, drop column ancho;

alter table estook.mesa drop constraint mesa_forma_conocida;
update estook.mesa set forma = case forma
    when 'rectangular' then 'alargada'
    when 'ovalada' then 'alargada'
    when 'taburete' then 'redonda'
    else forma
  end
 where forma in ('rectangular', 'ovalada', 'taburete');
alter table estook.mesa add constraint mesa_forma_conocida
  check (forma in ('cuadrada', 'redonda', 'alargada'));
