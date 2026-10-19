-- 0076 · La cámara vale lo pagado (el repaso del 19-oct, decisión 0099)
--
-- Richi, 19-oct: «he añadido contramuslos de pollo, pongo que hay 20 kg y me dice que
-- vale 91.000 €». Y el atún de aceite enseñaba tres precios distintos. Detrás había
-- tres cosas, y esta migración arregla las dos que viven en la base:
--
--   A · **El coste de cada precio, sin el aprovechamiento.** Era
--       `precio ÷ (factor × rendimiento)`, y con ese número se valoraba también lo que
--       hay en cámara, las mermas y las compras: un kilo de atún pagado a 18,18 €
--       «valía» 25,97 € porque se aprovecha un 70 %. Lo que hay en cámara son kilos en
--       bruto y valen lo de la factura (Richi lo eligió así el 19-oct). Desde ahora el
--       coste guardado es `precio ÷ factor`, y el aprovechamiento lo pone el escandallo,
--       que es donde se cuentan gramos limpios. Se recalcula con lo que ya guarda cada
--       fila —su precio y su factor—, que no cambian: es una columna derivada.
--
--   B · **Lo que hay en cámara, revalorado una vez a lo que se paga hoy.** El precio
--       medio de lo que había se hizo con la cuenta de antes, y en IKATZ además con dos
--       errores: los contramuslos entraron a 4,55 € **el gramo** (el producto se creó sin
--       envase y el campo decía solo «Precio») y el aceite de girasol con un envase que
--       ya no tiene. El libro no se reescribe nunca, así que se **añade** una línea por
--       producto: un ajuste de cero que deja el precio medio en lo que cuesta hoy, con
--       su motivo. Lo de antes sigue ahí, tal cual pasó.
--
--   La tercera —que el campo diga «el kilo» y no deje escribir el precio de un gramo—
--   es de la pantalla y del servidor, no de la base.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El coste de cada precio, sin el aprovechamiento
-- ═══════════════════════════════════════════════════════════════════════════

update estook.precio_de_producto
   set coste_milesimas = round(precio_centimos * 1000.0 / factor)
 where coste_milesimas is distinct from round(precio_centimos * 1000.0 / factor);

update estook.precio_pactado
   set coste_milesimas = round(precio_centimos * 1000.0 / factor)
 where coste_milesimas is distinct from round(precio_centimos * 1000.0 / factor);

comment on column estook.precio_de_producto.coste_milesimas is
  'precio ÷ factor: lo pagado por cada unidad de uso, en milesimas de centimo, sin el aprovechamiento (0099). Lo pone el escandallo. Lo calcula el dominio; aqui solo se guarda para comparar y ordenar.';

-- ── El precio que no es de su envase ─────────────────────────────────────────
--
-- El precio se guarda por envase, y hasta hoy cambiar el envase del producto no lo
-- tocaba: el aceite de girasol de IKATZ pasó de garrafa de 5 l a suelto y seguía con
-- «25 €», que la ficha leía como 25 € el litro. Desde hoy el servidor abre uno nuevo
-- al cambiar el envase; los que ya estaban así se abren aquí, **con lo mismo por
-- litro, kilo o unidad**, en el envase que tiene el producto. El de antes se cierra.

create temporary table precio_que_sigue on commit drop as
select pr.id as de, pr.producto_id, pr.proveedor_id, pr.origen,
       round(pr.precio_centimos * p.factor / pr.factor) as precio_centimos,
       p.formato, p.factor, p.unidad_de_uso, p.rendimiento,
       (now() at time zone l.zona_horaria)::date as hoy
  from estook.precio_de_producto pr
  join estook.producto p on p.id = pr.producto_id
  join estook.local l on l.id = p.local_id
 where pr.hasta is null
   and pr.factor <> p.factor
   and pr.unidad_de_uso = p.unidad_de_uso;

update estook.precio_de_producto pr
   set hasta = greatest(pr.desde, q.hoy - 1)
  from precio_que_sigue q
 where pr.id = q.de;

insert into estook.precio_de_producto (
  producto_id, proveedor_id, precio_centimos, formato, factor, unidad_de_uso,
  rendimiento, coste_milesimas, desde, origen, referencia
)
select q.producto_id, q.proveedor_id, q.precio_centimos, q.formato, q.factor, q.unidad_de_uso,
       q.rendimiento, round(q.precio_centimos * 1000.0 / q.factor), q.hoy, q.origen,
       jsonb_build_object('sigue_al_envase', q.de)
  from precio_que_sigue q;

-- ── La zanahoria de IKATZ ────────────────────────────────────────────────────
--
-- Decía «Bolsa de 5 kg» con 1 kg por bolsa, y la ficha enseñaba «0,91 € la bolsa de
-- 5 kg · 0,91 €/kg». Se compra al kilo (su precio es de kilo): se queda sin envase. Es
-- de la cuenta de prueba de Richi, que pidió arreglar sus datos (19-oct); en
-- cualquier otra base esta línea no encuentra nada.
update estook.producto
   set formato = null
 where id = '8e6dbe15-1e76-497a-9d2b-cbf11e9770e2'
   and formato = 'Bolsa de 5 kg'
   and factor = 1;

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Lo que hay, revalorado a lo que se paga hoy
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Un movimiento que no mueve nada se prohibía por ruido. Este no es ruido: cambia lo
-- que vale lo que hay sin cambiar cuánto hay. Se deja solo para eso: un ajuste, con
-- origen `revalorar` y su motivo.

alter table estook.movimiento_de_stock drop constraint movimiento_cantidad_no_nula;
alter table estook.movimiento_de_stock add constraint movimiento_cantidad_no_nula check (
  cantidad <> 0 or (tipo = 'ajuste' and origen = 'revalorar')
);

-- Solo lo de verdad, con algo en cámara, con precio de hoy, y cuyo precio medio no es
-- ya ese. Los ejemplos no cuentan para nada; lo que entró sin coste ya se valora a
-- precio de hoy al enseñarlo.
insert into estook.movimiento_de_stock (
  local_id, producto_id, tipo, cantidad, coste_milesimas,
  cantidad_despues, coste_medio_despues, motivo, fecha_operativa, origen, referencia, es_ejemplo
)
select e.local_id, e.producto_id, 'ajuste', 0, null,
       e.cantidad, v.coste_milesimas,
       'Revalorado a lo que se paga hoy: desde el 19-oct la cámara vale lo de la factura, sin el aprovechamiento (0099)',
       (now() at time zone l.zona_horaria)::date, 'revalorar',
       jsonb_build_object('antes', e.coste_milesimas, 'ahora', v.coste_milesimas),
       false
  from estook.existencias e
  join estook.producto p on p.id = e.producto_id
  join estook.local l on l.id = e.local_id
  join lateral estook.precio_vigente(p.id) v on true
 where not p.es_ejemplo
   and e.cantidad > 0
   and e.coste_milesimas > 0
   and v.coste_milesimas is not null
   and e.coste_milesimas <> v.coste_milesimas
 order by e.producto_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Borrar un plato de la carta
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Richi, 19-oct: «poder borrar platos archivados, o borrarlos directamente». Archivar
-- lo quita de la carta y se puede recuperar; borrar es para siempre, con su escandallo,
-- su ficha técnica y sus precios por canal (todo cuelga del plato con `cascade`). Se
-- pide confirmar en la pantalla, diciendo que no hay vuelta atrás. La política de
-- escribir la carta (`plato_escritura`, para todo) ya cubre borrar: faltaba el permiso.
grant delete on estook.plato to estook_api;
