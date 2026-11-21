-- Un mes de historia para Bar Centro, solo en la API de pruebas y solo si se pide
-- (la experiencia, 0083).
--
--   CON_HISTORIA=1 pnpm api:pruebas
--
-- ── Para qué existe ──────────────────────────────────────────────────────────
--
-- Para **mirar** las gráficas: el Panel nuevo se juzga con ventas, ticket medio y
-- horas de un mes, y Bar Centro, recién sembrado, no tiene ni un día. Sin esto, cada
-- captura enseña rayas planas y nadie puede decir si una gráfica está bien.
--
-- Va aquí y no en `semillas/` a propósito: las semillas las cargan **todas** las
-- pruebas, y estas dan por hecho que Bar Centro empieza sin cierres. Esto no lo
-- carga ninguna prueba ni toca ninguna base de verdad: es la base de pruebas, en
-- memoria, y muere al parar el servidor.
--
-- Solo se escriben tablas sin cuentas por detrás (los cierres de caja y los
-- fichajes). El libro de movimientos no: lleva su coste medio encadenado, y una
-- historia escrita a mano lo descuadraría.

-- Treinta días de caja: entre semana menos, el fin de semana más, con su ticket.
insert into estook.cierre_de_caja
  (local_id, fecha_operativa, total_centimos, efectivo_centimos, tarjeta_centimos,
   comensales, tickets, origen, es_ejemplo)
select l.id,
       (now() at time zone 'Europe/Madrid')::date - d,
       ventas,
       ventas * 30 / 100,
       ventas - ventas * 30 / 100,
       tickets * 2,
       tickets,
       'a_mano',
       false
  from estook.local l
 cross join generate_series(1, 30) as d
 cross join lateral (
   select (
     case extract(isodow from (now() at time zone 'Europe/Madrid')::date - d)
       when 5 then 238000 when 6 then 296000 when 7 then 214000
       when 1 then 0 else 152000
     end
     + ((d * 7919) % 31000) - 15500
   )::bigint as ventas
 ) as v
 cross join lateral (select greatest(1, (v.ventas / 2350))::integer as tickets) as t
 where l.codigo = 'bar-centro'
   and v.ventas > 0
on conflict (local_id, fecha_operativa) do nothing;

-- Y las horas: cada persona de Bar Centro, cinco días por semana, siete u ocho horas.
insert into estook.fichaje
  (local_id, persona_id, fecha_operativa, entro_en, salio_en, entro_sin_donde, salio_sin_donde)
select l.id,
       m.persona_id,
       (now() at time zone 'Europe/Madrid')::date - d,
       ((now() at time zone 'Europe/Madrid')::date - d) + time '10:00' + ((d * 13 + length(m.persona_id::text)) % 25) * interval '1 minute',
       ((now() at time zone 'Europe/Madrid')::date - d) + time '17:30' + ((d * 17) % 50) * interval '1 minute',
       'historia de ejemplo',
       'historia de ejemplo'
  from estook.local l
  join estook.membresia m on m.local_id = l.id
 cross join generate_series(1, 30) as d
 where l.codigo = 'bar-centro'
   and extract(isodow from (now() at time zone 'Europe/Madrid')::date - d) not in (1, 2);

-- ── Y un mes de Estook TPV (el rediseño, entrega 3 · 0148) ────────────────────
--
-- El Panel nuevo lee las mesas: «Ventas según canal», «Lo que más sale», «Cuándo se vende», la
-- espera de la cocina y la previsión al cierre. Sin esto salían todas en silueta. Cinco secciones,
-- diez platos (tres recomendados), una sala con ocho mesas y cinco semanas de cuentas de mesa, de
-- barra y para llevar, a la hora de comer y de cenar; las de hoy, hasta ahora, y alguna abierta.
-- Sin cobros: «Cómo se cobra» sale en silueta, y así también se mira.
insert into estook.seccion_de_carta (local_id, nombre, orden)
select l.id, s.nombre, s.orden
  from estook.local l
 cross join (values ('Entrantes', 1), ('Pizzas', 2), ('Principales', 3), ('Postres', 4),
                    ('Bebidas', 5)) as s (nombre, orden)
 where l.codigo = 'bar-centro';

insert into estook.plato (local_id, seccion_id, nombre, precio_centimos, orden, recomendado)
select l.id, s.id, p.nombre, p.precio, p.orden, p.recomendado
  from estook.local l
 cross join (values
   ('Entrantes', 'Croquetas de jamón', 850, 1, false),
   ('Entrantes', 'Burrata', 1150, 2, true),
   ('Pizzas', 'Pizza margarita', 1100, 1, false),
   ('Pizzas', 'Diavola', 1250, 2, true),
   ('Pizzas', 'Calzone', 1300, 3, false),
   ('Principales', 'Lasaña de la casa', 1400, 1, false),
   ('Postres', 'Tiramisú', 600, 1, true),
   ('Postres', 'Tarta de queso', 650, 2, false),
   ('Bebidas', 'Caña', 250, 1, false),
   ('Bebidas', 'Copa de vino', 350, 2, false)
 ) as p (seccion, nombre, precio, orden, recomendado)
  join estook.seccion_de_carta s on s.local_id = l.id and s.nombre = p.seccion
 where l.codigo = 'bar-centro';

insert into estook.zona_de_sala (local_id, nombre)
select id, 'Sala' from estook.local where codigo = 'bar-centro';

insert into estook.mesa (local_id, zona_id, nombre, plazas)
select l.id, z.id, 'Mesa ' || n, 4
  from estook.local l
  join estook.zona_de_sala z on z.local_id = l.id
 cross join generate_series(1, 8) as n
 where l.codigo = 'bar-centro';

with dias as (
  select d, (now() at time zone 'Europe/Madrid')::date - d as dia,
         extract(isodow from (now() at time zone 'Europe/Madrid')::date - d)::int as dow
    from generate_series(0, 34) as d
), huecos as (
  select dias.*, k,
         case when k % 3 = 0 then 13 + (k * 7) % 3 else 20 + (k * 5) % 3 end as hora,
         (k * 37 + d * 11) % 55 as minuto,
         case when k % 10 < 6 then 'mesa' when k % 10 < 8 then 'barra' else 'para_llevar' end as tipo
    from dias
   cross join generate_series(1, 40) as k
   where dow <> 1
     and k <= case dow when 5 then 34 when 6 then 40 when 7 then 30 else 20 end
)
insert into estook.cuenta (local_id, tipo, mesa_id, nombre, personas, abierta_en, liberada_en)
select l.id, h.tipo,
       case when h.tipo = 'mesa' then (
         select m.id from estook.mesa m where m.local_id = l.id order by m.nombre offset h.k % 8 limit 1
       ) end,
       case when h.tipo = 'mesa' then null else 'Historia' end,
       case when h.tipo = 'mesa' then 2 + h.k % 3 else 1 end,
       (h.dia + make_time(h.hora, h.minuto, 0)) at time zone 'Europe/Madrid',
       case when (h.dia + make_time(h.hora, h.minuto, 0)) at time zone 'Europe/Madrid'
                 > now() - interval '50 minutes' then null
            else ((h.dia + make_time(h.hora, h.minuto, 0)) at time zone 'Europe/Madrid')
                 + interval '50 minutes' end
  from estook.local l
 cross join huecos h
 where l.codigo = 'bar-centro'
   and (h.dia + make_time(h.hora, h.minuto, 0)) at time zone 'Europe/Madrid' <= now()
   -- Una mesa abierta a la vez en cada mesa: las de hoy que siguen abiertas, sin repetir.
   and not (h.tipo = 'mesa' and h.d = 0
            and (h.dia + make_time(h.hora, h.minuto, 0)) at time zone 'Europe/Madrid'
                > now() - interval '50 minutes' and h.k > 8);

insert into estook.linea_de_cuenta
  (id, cuenta_id, local_id, plato_id, nombre, cantidad, precio_centimos, destino, pase, pedida_en,
   mandada_en, salio_en)
select gen_random_uuid(), c.id, c.local_id, p.id, p.nombre,
       1 + abs(hashtext(c.id::text || p.id::text)) % 2, p.precio_centimos,
       case when s.nombre = 'Bebidas' then 'barra' else 'cocina' end,
       case when s.nombre = 'Bebidas' then null else 1 end,
       c.abierta_en + interval '3 minutes',
       c.abierta_en + interval '4 minutes',
       case when s.nombre = 'Bebidas' then null
            when c.liberada_en is null and abs(hashtext(c.id::text || p.id::text)) % 2 = 0 then null
            else c.abierta_en + make_interval(mins => 12 + abs(hashtext(p.nombre)) % 14) end
  from estook.cuenta c
  join estook.plato p on p.local_id = c.local_id
  join estook.seccion_de_carta s on s.id = p.seccion_id
 where c.local_id = (select id from estook.local where codigo = 'bar-centro')
   and abs(hashtext(c.id::text || p.id::text)) % 100
       < case s.nombre when 'Pizzas' then 52 when 'Bebidas' then 60 when 'Entrantes' then 38
                       when 'Postres' then 26 else 22 end - p.orden * 6;
