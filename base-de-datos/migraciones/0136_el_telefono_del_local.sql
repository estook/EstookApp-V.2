-- 0136 · El teléfono y la dirección del local, los suyos (Richi, 27-nov)
--
-- Richi fue a reservar en la web de IKATZ y le dijo «llama al 628 74 94 14», que es el teléfono de un Burger
-- King: la ficha de Google de IKATZ está unida a otro negocio, y la carta del QR y la web de reservas ponían lo
-- de Google **por delante** de lo que escribió el local. Ahora manda lo que pone el local en Ajustes; lo de
-- Google, solo si el local no lo ha puesto.
--
-- La función de la 0048 entera, con esos dos `coalesce` al revés. Devuelve lo mismo: se reemplaza.

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
         coalesce(nullif(concat_ws(', ', l.direccion, l.poblacion), ''),
                  l.google_direccion),
         l.poblacion,
         coalesce(l.telefono, l.google_telefono),
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
