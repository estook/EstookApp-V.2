-- 0009 · Afinar el catalogo de permisos
--
-- Dos arreglos que salen de repasar la matriz con el documento de Roles delante.

-- ── 1 · Una accion no puede estar en «ver» ───────────────────────────────────
--
-- Los tres estados del Manifiesto (sin acceso · ver · ver y editar) se leen bien
-- en una app o en un dato. En una accion no: publicar la carta o se puede o no se
-- puede, y decir que alguien tiene «ver» sobre publicar no significa nada.
--
-- No se cambia el vocabulario, que esta escrito en el Manifiesto y ademas forma
-- una escalera que es lo que hace que «gana el mas amplio» se resuelva comparando.
-- Se cierra la puerta a la combinacion que no tiene sentido, y ya.

create or replace function estook.nivel_tiene_sentido()
returns trigger
language plpgsql
as $$
declare
  familia_del_permiso text;
begin
  select p.familia into familia_del_permiso
  from estook.permiso p where p.codigo = new.permiso;

  if familia_del_permiso = 'accion' and new.nivel = 'ver' then
    raise exception
      'El permiso % es una accion: o se puede o no se puede. El nivel «ver» no significa nada aqui',
      new.permiso
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger permiso_de_rol_con_sentido
  before insert or update on estook.permiso_de_rol
  for each row execute function estook.nivel_tiene_sentido();

create trigger recorte_con_sentido
  before insert or update on estook.recorte_de_permiso
  for each row execute function estook.nivel_tiene_sentido();

-- ── 2 · Separar el precio de compra del coste del plato ──────────────────────
--
-- `dato.coste_de_genero` metia dos cosas distintas en el mismo saco: lo que
-- cuesta comprar el genero, y lo que cuesta y margina un plato. Y hay roles que
-- necesitan lo uno pero no lo otro:
--
--  · La gestoria exporta «IVA, ventas, compras y horas», asi que necesita ver
--    precios de compra. Pero el documento dice tambien que «no ve fichas
--    tecnicas, ni recetas», o sea, ni costes de plato ni margenes.
--  · Compras central lleva «proveedores, contratos marco y la comparativa de
--    precios», pero «nada de recetas».
--
-- Con un solo permiso no se puede decir eso. Con dos, si.

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('dato.precio_de_compra', 'Precios de compra', 'dato', 'local',
   'Lo que cuesta el genero: albaranes, facturas de proveedor, precio medio ponderado y coste por unidad de uso'),
  ('dato.coste_de_plato', 'Costes y margenes de plato', 'dato', 'local',
   'Lo que cuesta y lo que margina un plato: escandallo valorado, food cost, margen y precio recomendado');

-- Quien tenia el permiso viejo pasa a tener los dos, salvo los dos casos de
-- arriba, que es justo para lo que se separan.
insert into estook.permiso_de_rol (rol, permiso, nivel)
select pr.rol, 'dato.precio_de_compra', pr.nivel
from estook.permiso_de_rol pr
where pr.permiso = 'dato.coste_de_genero';

insert into estook.permiso_de_rol (rol, permiso, nivel)
select pr.rol, 'dato.coste_de_plato', pr.nivel
from estook.permiso_de_rol pr
where pr.permiso = 'dato.coste_de_genero'
  -- La gestoria ve lo que compra el local, no lo que margina cada plato.
  and pr.rol <> 'gestoria'
  -- Compras central lleva precios, no recetas.
  and pr.rol <> 'compras_central';

delete from estook.permiso_de_rol where permiso = 'dato.coste_de_genero';
delete from estook.recorte_de_permiso where permiso = 'dato.coste_de_genero';
delete from estook.permiso where codigo = 'dato.coste_de_genero';
