-- 0035 · El precio de venta vive en la carta, y cada genero tiene su zona
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Lo que se corrige, y por que se corrige entero ──────────────────────────
--
-- La 0034 le puso a cada producto un **precio de venta**. Estaba mal, y Richi lo
-- dijo en cuanto lo vio: «no se venden los ingredientes sueltos; con ellos se
-- crean platos, y ahi ponemos el precio de venta».
--
-- Tiene razon, y no es un detalle de pantalla: es el modelo. Un kilo de queso no
-- tiene precio de venta. Lo que tiene precio de venta es **lo que sale por la
-- puerta**, y eso vive en la carta; lo que cuesta sale del escandallo, que dice
-- cuanto queso lleva. Poner un precio de venta en el producto era inventarse un
-- tercer sitio para un dato que ya tiene el suyo, y ademas el equivocado.
--
--     coste    ←  inventario (precio de compra, sin IVA)
--     cuanto   ←  escandallo  (M9: que lleva cada plato)
--     venta    ←  carta       (M10: a cuanto sale)
--     ingreso  ←  el cierre de caja, o el TPV (M20)
--
-- Asi que se quitan las dos columnas de la 0034, y con ellas el importe que se
-- tecleaba al sacar genero. **Lo vendido se sigue distinguiendo** —el tipo de
-- movimiento `venta` se queda, que eso si estaba bien— y el dinero lo pone quien
-- lo sabe: la caja.
--
-- ── Y lo que se anade ───────────────────────────────────────────────────────
--
-- La **zona**: si un producto es de cocina, de sala o de limpieza. De ahi sale el
-- filtro de Inventario y, sobre todo, **quien ve que**: un cocinero no tiene por
-- que ver las botellas de la barra, ni un camarero el genero de la camara.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Fuera el precio de venta del producto
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Lo que se pierde al quitarlas: el precio de venta que se hubiera puesto a mano
-- en estos dias. Son cuatro dias y un sitio equivocado; lo que no se pierde es
-- nada de lo que mueve genero.

alter table estook.producto
  drop constraint if exists producto_iva_de_venta_razonable,
  drop constraint if exists producto_precio_de_venta_no_negativo,
  drop column if exists iva_de_venta,
  drop column if exists precio_de_venta_centimos;

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Y fuera el importe de la linea del libro
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Por lo mismo: lo que se cobro por algo **no se teclea al sacarlo de la camara**.
-- Se sabe por la carta, o lo dice la caja al cerrarla. Preguntarlo aqui era pedir
-- dos veces el mismo dato y arriesgarse a que las dos respuestas no cuadraran.
--
-- El tipo `venta` se queda: sigue haciendo falta saber si lo que salio se vendio,
-- se cocino o se tiro. Eso era lo bueno de la 0034 y no se toca.

alter table estook.movimiento_de_stock
  drop constraint if exists movimiento_solo_la_venta_trae_dinero,
  drop constraint if exists movimiento_ingreso_no_negativo,
  drop column if exists ingreso_centimos;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · De donde es cada producto
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Tres, y catalogo cerrado:
--
--   cocina     lo que se cocina. Lleva categorias, porque un cocinero busca por
--              «carnes» o «lacteos».
--   sala       lo que se sirve tal cual: botellas, cafe, servilletas de mesa.
--              Lleva categorias tambien.
--   limpieza   lo que no se come. **No lleva categorias**, y es a proposito:
--              son quince cosas y montar un arbol encima sobra.
--
-- El valor de fabrica es `cocina` porque es donde esta casi todo, y porque un
-- producto de antes de esta migracion se dio de alta en Inventario, que hasta hoy
-- era la camara.

create type estook.zona_del_producto as enum ('cocina', 'sala', 'limpieza');

comment on type estook.zona_del_producto is
  'De donde es un producto: cocina, sala o limpieza. Decide el filtro de Inventario y quien lo ve.';

alter table estook.producto
  add column zona estook.zona_del_producto not null default 'cocina';

comment on column estook.producto.zona is
  'Cocina, sala o limpieza. Un cocinero ve cocina y limpieza; un camarero, sala y limpieza; de jefe para arriba, todo.';

-- ── Lo que ya estaba, repartido con lo que se sabe ──────────────────────────
--
-- Y no a ojo: **con la categoria fiscal**, que ya dice si algo es una bebida. Una
-- cerveza o un refresco se sirven en sala; lo demas se queda en cocina, que es de
-- donde vino. Es una propuesta razonada y se puede cambiar en la ficha de cada
-- uno; lo que no se hace es dejarlo todo en un monton y que lo ordene una persona
-- producto a producto.

update estook.producto
   set zona = 'sala'
 where categoria_fiscal in (
         'bebida_alcoholica', 'bebida_refrescante', 'bebida_refrescante_azucarada'
       );

create index producto_por_zona on estook.producto (local_id, zona) where activo;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Quien ve que zona
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por que esto es una politica y no un filtro de pantalla ─────────────────
--
-- «Lo que protege el dato y lo que lo ensena son dos capas, y se prueban las
-- dos.» Filtrarlo solo en la consulta dejaria el dato a un `curl` de distancia, y
-- este proyecto lleva desde M1 con las dos barreras puestas.
--
-- ── Y por que es `security definer`, que es la puerta 18 ────────────────────
--
-- Porque lee `estook.membresia` para saber el rol, y `membresia` tiene su propia
-- seguridad por filas que llamaria otra vez aqui: la misma recursion que obligo a
-- M1 a hacer lo mismo con `nivel_de_permiso`. Son diecisiete y pasan a ser
-- dieciocho, a proposito y con su prueba contandolas.
--
-- Se declara una sola vez, aqui, y la copia en TypeScript —`ZONAS_DEL_ROL`, en
-- `packages/dominio/src/zona.ts`— tiene una prueba que cuadra las dos, igual que
-- `partida_de_la_merma` desde M6½.

create or replace function estook.zonas_que_ve(p_local uuid)
returns estook.zona_del_producto[]
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select coalesce(
    (
      select array_agg(distinct z order by z)
        from estook.membresia m
        join estook.local l
          on l.id = p_local
         and l.organizacion_id = m.organizacion_id
        cross join lateral unnest(
          case m.rol
            -- Un cocinero no lleva la barra, y un camarero no lleva la camara.
            -- Los dos limpian, asi que los dos ven lo de limpieza.
            when 'cocinero' then array['cocina', 'limpieza']::estook.zona_del_producto[]
            when 'camarero' then array['sala', 'limpieza']::estook.zona_del_producto[]
            -- De jefe de cocina y jefe de sala para arriba, todo: son los que
            -- piden, los que cuadran y los que responden de lo que falta.
            else enum_range(null::estook.zona_del_producto)
          end
        ) as z
       where m.persona_id = estook.persona_actual()
         and l.activo
         and m.desde <= current_date
         and (m.hasta is null or m.hasta >= current_date)
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
    ),
    array[]::estook.zona_del_producto[]
  )
$$;

comment on function estook.zonas_que_ve(uuid) is
  'Las zonas de genero que ve una persona en un local. Cocinero: cocina y limpieza. Camarero: sala y limpieza. De jefe para arriba, todas.';

revoke all on function estook.zonas_que_ve(uuid) from public;
grant execute on function estook.zonas_que_ve(uuid) to estook_api;

-- ── Donde va el limite, que costo una prueba en rojo ───────────────────────
--
-- La primera version metia la zona **tambien en la lectura**: un cocinero no veia
-- ni una fila de sala. Y eso rompio algo que ya estaba decidido y bien decidido:
-- «la merma la apunta quien la rompe» (0026). Una camarera que tira una nata de
-- la camara **no podia apuntarla**, porque la nata no existia para ella. Lo cazo
-- la prueba de la camarera apuntando una merma desde el Panel.
--
-- Asi que el limite va donde tiene sentido:
--
--   **Leer**   todo el genero del local. La merma, el albaran, el escandallo y la
--              busqueda universal lo necesitan, y no es ningun secreto: quien
--              trabaja ahi ve lo que hay.
--   **Editar** solo lo de tu zona. Un cocinero no da de alta ni cambia la ficha
--              de las botellas de la barra: no es su almacen.
--
-- Y «cocineros ven cocina y limpieza» se cumple **donde se pidio**: en la lista de
-- Inventario, que es la que se filtra por las zonas de cada uno en el servidor
-- (`mis_productos`). No es esconder un dato: es que esa pantalla ensene tu
-- almacen y no el de otro.
--
-- Las politicas se rehacen enteras y no se «amplian»: una politica se lee de una
-- vez o no se lee. Aqui esta la original entera, con lo nuevo al lado.

drop policy if exists producto_lectura on estook.producto;
drop policy if exists producto_escritura on estook.producto;

create policy producto_lectura on estook.producto
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy producto_escritura on estook.producto
  for all using (
    estook.puede_editar('app.inventario', local_id)
    and zona = any (estook.zonas_que_ve(local_id))
  )
  with check (
    estook.puede_editar('app.inventario', local_id)
    and zona = any (estook.zonas_que_ve(local_id))
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Un lote puede decir cuanto lleva
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── El fallo que esto tapa ──────────────────────────────────────────────────
--
-- «Congelar» marcaba el producto entero. Si de 43 kg de bacon se congelan 10, lo
-- que habia que poder decir es **10**, y el producto quedaba con los 43 marcados
-- como congelados. Congelar la mitad es justo el caso normal —«la mitad de la
-- carne va al congelador»— y era el unico que no se podia contar.
--
-- Nulo sigue queriendo decir «no se sabe cuanto», que es lo que pasa con un lote
-- que llego en un albaran sin desglosar. No se supone que sea todo.

alter table estook.lote
  add column cantidad numeric(14, 4),
  add constraint lote_cantidad_positiva check (cantidad is null or cantidad > 0);

comment on column estook.lote.cantidad is
  'Cuanto genero lleva este lote, en la unidad de uso del producto. Nulo: no se sabe. Es lo que permite congelar una parte.';
