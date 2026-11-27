-- Deshace la 0136: la carta del QR vuelve a poner primero el teléfono y la dirección de Google (la de la 0048).

create or replace function estook.la_carta_publica(p_direccion text)
returns table (
  nombre text,
  direccion text,
  poblacion text,
  telefono text,
  web text,
  mapa text,
  valoracion numeric,
  resenas integer,
  horario jsonb,
  color_de_marca text,
  logo_clave text,
  carta_paginas text[]
)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select l.nombre,
         coalesce(l.google_direccion,
                  nullif(concat_ws(', ', l.direccion, l.poblacion), '')),
         l.poblacion,
         coalesce(l.google_telefono, l.telefono),
         l.google_web,
         l.google_mapa,
         l.google_valoracion,
         l.google_resenas,
         l.google_horario,
         l.color_de_marca,
         l.logo_clave,
         l.carta_paginas
    from estook.local l
   where l.direccion_de_la_carta = lower(p_direccion)
     and l.activo
$$;

comment on function estook.la_carta_publica(text) is
  'Lo que enseña estook.com/carta/<dirección> a quien escanea el QR, sin sesión: solo lo que el local ya enseña al mundo, y su carta subida (0047, 0049).';

revoke all on function estook.la_carta_publica(text) from public;
grant execute on function estook.la_carta_publica(text) to estook_api;
