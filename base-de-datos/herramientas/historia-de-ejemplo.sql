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
