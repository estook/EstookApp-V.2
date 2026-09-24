-- Deshace la 0046: sin objetivos de merma ni de ventas, y sin dirección de carta.
--
-- **Los dos valores del tipo `clave_de_objetivo` se quedan**: Postgres no sabe
-- quitar un valor de un enumerado. Sin filas que los usen, no molestan, y volver a
-- aplicar la 0046 los encuentra puestos (`add value if not exists`).
--
-- Y **las direcciones de las cartas se pierden**. Si ya había un QR impreso, volver
-- a aplicar la 0046 las vuelve a poner con la misma regla y el mismo orden, así
-- que saldrían las mismas mientras no se haya creado ningún local entre medias.

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.la_carta_publica(text)',
    'estook.direccion_libre_para_la_carta(text)'
  ]
  loop
    execute format('drop function if exists %s', la_funcion);
  end loop;
end;
$$;

drop trigger if exists local_con_direccion_de_la_carta on estook.local;
drop function if exists estook.poner_la_direccion_de_la_carta();

alter table estook.local
  drop constraint if exists local_direccion_de_la_carta_unica,
  drop constraint if exists local_direccion_de_la_carta_con_forma,
  drop column if exists direccion_de_la_carta;

delete from estook.objetivo where valor is null or clave::text in ('merma', 'ventas_semanales');

alter table estook.objetivo
  drop constraint if exists objetivo_importe_positivo,
  drop constraint if exists objetivo_valor_o_importe,
  drop column if exists importe_centimos,
  alter column valor set not null;
