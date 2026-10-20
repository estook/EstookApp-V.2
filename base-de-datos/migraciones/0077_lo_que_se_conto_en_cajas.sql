-- 0077 · Lo que se contó en cajas (el repaso del 20-oct, decisión 0100)
--
-- Richi, 20-oct: «he corregido los contramuslos poniendo que hay 50 kg y dice "ahora hay
-- 250 kg"», «pone que he gastado 91.000 € en compras y en Compras no es así», y dos
-- precios vivos para el mismo producto. Las causas eran de la pantalla y del servidor, y
-- están arregladas en el código. Esto arregla **lo que dejaron en la base**, sin borrar
-- nada del libro: se añaden líneas, como manda la regla 8.
--
--   A · **Las dos entradas a un precio que no era el suyo**, anuladas y vueltas a apuntar
--       a su precio de hoy. Anular es lo que haría la pantalla (0055): una línea más que
--       dice a cuál anula, y las dos dejan de contar en compras, mermas y consumo.
--         · Contramuslos de IKATZ, 19-oct: 20 kg a 4,55 € **el gramo** (91.000 €).
--         · Aceite de girasol de IKATZ, 9-oct: 8 l a 25 € el litro (era la garrafa de 5 l).
--   B · **Los 250 kg de contramuslos que eran 50.** «¿No cuadra?» guardó 50 cajas de 5 kg.
--       Se corrige a lo que Richi escribió, con su motivo.
--   C · **Un precio vivo de cada proveedor.** Un precio «sin proveedor» abierto al lado del
--       del proveedor del producto (contramuslos, burrata, leche, barril) se cierra.
--
-- A y B solo encuentran algo en la base de Richi: van por su id y por el coste o la
-- cantidad que tenían. C vale para cualquiera. Todo lo que pone esta migración lleva
-- `"arreglo": "0077"` en su referencia, para poder deshacerlo.

-- ═══════════════════════════════════════════════════════════════════════════
-- A y B · El libro de IKATZ
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  r record;
  hay numeric;
  medio bigint;
  hoy date;
  antes numeric;
begin
  for r in
    select m.id, m.local_id, m.producto_id, m.cantidad, m.es_ejemplo, m.lote_id, x.porque,
           to_char(m.fecha_operativa, 'FMDD') as dia,
           (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                  'septiembre','octubre','noviembre','diciembre'])[extract(month from m.fecha_operativa)::int] as mes,
           v.coste_milesimas as de_hoy,
           ((now() at time zone l.zona_horaria) - l.hora_de_corte::interval)::date as jornada
      from (values
        (526::bigint, '0077f073-b02a-44d1-86b0-7c004cd70454'::uuid, 455000::bigint,
         'Entró a 4,55 € el gramo: el campo decía solo «Precio». Vuelto a apuntar a su precio de hoy (0100)'),
        (490::bigint, '735f5577-7908-49c1-b0f7-6c33ded6db46'::uuid, 2500000::bigint,
         'Entró a 25 € el litro, que era lo de la garrafa de 5 l. Vuelto a apuntar a su precio de hoy (0100)')
      ) as x(id, producto_id, coste, porque)
      join estook.movimiento_de_stock m
        on m.id = x.id and m.producto_id = x.producto_id and m.coste_milesimas = x.coste
       and m.tipo = 'entrada' and m.cantidad > 0
      join estook.local l on l.id = m.local_id
      join lateral estook.precio_vigente(m.producto_id) v on v.coste_milesimas is not null
     where not exists (
       select 1 from estook.movimiento_de_stock a
        where a.referencia ? 'anula' and a.referencia ->> 'anula' = m.id::text
     )
  loop
    select e.cantidad, e.coste_milesimas into hay, medio
      from estook.existencias e where e.producto_id = r.producto_id;
    hoy := r.jornada;

    -- La que anula: lo mismo al revés, sin tocar el precio medio (como `anular_movimiento`).
    -- Con su lote, si lo trae: sale y vuelve a entrar en el mismo, que no cambia ni de
    -- cantidad ni de caducidad (los contramuslos caducan el 9-nov).
    insert into estook.movimiento_de_stock (
      local_id, producto_id, tipo, cantidad, coste_milesimas, cantidad_despues,
      coste_medio_despues, lote_id, motivo, fecha_operativa, origen, referencia, es_ejemplo
    ) values (
      r.local_id, r.producto_id, 'entrada', -r.cantidad, null, hay - r.cantidad, medio, r.lote_id,
      format('Anula lo apuntado el %s de %s · %s', r.dia, r.mes, r.porque),
      hoy, 'a_mano',
      jsonb_build_object('anula', r.id::text, 'arreglo', '0077'), r.es_ejemplo
    );

    -- Y la misma entrada, a lo que se paga hoy. El precio medio, el de siempre: lo que
    -- quedaba a su medio y lo que entra a su precio.
    antes := hay - r.cantidad;
    insert into estook.movimiento_de_stock (
      local_id, producto_id, tipo, cantidad, coste_milesimas, cantidad_despues,
      coste_medio_despues, lote_id, motivo, fecha_operativa, origen, referencia, es_ejemplo
    ) values (
      r.local_id, r.producto_id, 'entrada', r.cantidad, r.de_hoy, hay,
      case when antes <= 0 or hay <= 0 then r.de_hoy
           else round((antes * medio + r.cantidad * r.de_hoy) / hay) end,
      r.lote_id,
      format('Lo del %s de %s, a su precio de hoy (0100)', r.dia, r.mes),
      hoy, 'a_mano',
      jsonb_build_object('arreglo', '0077', 'en_vez_de', r.id::text), r.es_ejemplo
    );
  end loop;

  -- B · Los contramuslos: 250 kg que eran los 50 que escribió Richi.
  for r in
    select e.local_id, e.producto_id, e.cantidad, e.coste_milesimas,
           ((now() at time zone l.zona_horaria) - l.hora_de_corte::interval)::date as jornada
      from estook.existencias e
      join estook.local l on l.id = e.local_id
     where e.producto_id = '0077f073-b02a-44d1-86b0-7c004cd70454'
       and e.cantidad = 250000
  loop
    insert into estook.movimiento_de_stock (
      local_id, producto_id, tipo, cantidad, coste_milesimas, cantidad_despues,
      coste_medio_despues, motivo, fecha_operativa, origen, referencia, es_ejemplo
    ) values (
      r.local_id, r.producto_id, 'ajuste', 50000 - r.cantidad, null, 50000, r.coste_milesimas,
      'Corregido: en «¿No cuadra?» se escribieron 50 kg y se guardaron 50 cajas de 5 kg (0100)',
      r.jornada, 'a_mano',
      jsonb_build_object('hay', 50000, 'habia', r.cantidad, 'arreglo', '0077'), false
    );
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Un precio vivo de cada proveedor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- El «sin proveedor» abierto de un producto que tiene proveedor y precio de él: lo abrió
-- «Cambiar el precio» con «Sin proveedor» elegido. Se cierra ayer, como cualquier precio
-- que se sustituye; el de su proveedor es el que vale.

update estook.precio_de_producto s
   set hasta = greatest(s.desde, ((now() at time zone l.zona_horaria) - l.hora_de_corte::interval)::date - 1),
       referencia = coalesce(s.referencia, '{}'::jsonb) || jsonb_build_object('arreglo', '0077')
  from estook.producto p
  join estook.local l on l.id = p.local_id
 where s.producto_id = p.id
   and s.hasta is null
   and s.proveedor_id is null
   and p.proveedor_id is not null
   and exists (
     select 1 from estook.precio_de_producto c
      where c.producto_id = p.id and c.hasta is null and c.proveedor_id = p.proveedor_id
   );
