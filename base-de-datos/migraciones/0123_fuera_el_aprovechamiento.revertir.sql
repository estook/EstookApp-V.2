-- Deshace la 0123: las columnas del aprovechamiento vuelven a pedirse y a explicarse como antes.
--
-- **Lo que se pierde:** el porcentaje que tenía cada producto. La 0123 los puso todos al 100 % y no
-- guarda los de antes: al deshacer, siguen al 100 % y cada cocina tendría que volver a medirlos.
--
-- **Postgres no sabe quitar un valor de un tipo enumerado**: «limpieza» se queda en
-- `estook.motivo_de_merma`, sin usar. Si hay mermas apuntadas con él, esta reversión **para**:
-- quitárselo sería cambiar en silencio por qué se tiró algo.

do $$
begin
  if exists (select 1 from estook.movimiento_de_stock where motivo_de_merma::text = 'limpieza') then
    raise exception 'Hay mermas apuntadas como «Al limpiarlo». Revertir la 0123 las dejaría sin motivo que se entienda. Míralas antes.'
      using errcode = '23514';
  end if;
end;
$$;

alter table estook.precio_pactado alter column rendimiento drop default;
alter table estook.precio_de_producto alter column rendimiento drop default;

comment on column estook.producto.rendimiento is null;
comment on column estook.precio_de_producto.rendimiento is null;
comment on column estook.precio_pactado.rendimiento is null;
comment on column estook.producto.sin_verificar is
  'El factor o el rendimiento vienen supuestos, no medidos por esta cocina. Un rendimiento mal puesto es el error mas caro del sistema (Auditoria 1.2).';
