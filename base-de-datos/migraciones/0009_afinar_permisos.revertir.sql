-- Reversion de 0009 · Afinar el catalogo de permisos

drop trigger if exists recorte_con_sentido on estook.recorte_de_permiso;
drop trigger if exists permiso_de_rol_con_sentido on estook.permiso_de_rol;
drop function if exists estook.nivel_tiene_sentido();

-- Vuelve el permiso unico, con quien tuviera cualquiera de los dos separados.
insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('dato.coste_de_genero', 'Costes de genero', 'dato', 'local',
   'Precios de compra, coste por unidad de uso, coste de plato y margen. Un cocinero no recibe estos campos');

insert into estook.permiso_de_rol (rol, permiso, nivel)
select distinct pr.rol, 'dato.coste_de_genero', pr.nivel
from estook.permiso_de_rol pr
where pr.permiso in ('dato.precio_de_compra', 'dato.coste_de_plato')
on conflict (rol, permiso) do nothing;

delete from estook.permiso_de_rol
 where permiso in ('dato.precio_de_compra', 'dato.coste_de_plato');
delete from estook.recorte_de_permiso
 where permiso in ('dato.precio_de_compra', 'dato.coste_de_plato');
delete from estook.permiso
 where codigo in ('dato.precio_de_compra', 'dato.coste_de_plato');
