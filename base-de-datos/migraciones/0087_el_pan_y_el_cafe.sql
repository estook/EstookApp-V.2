-- 0087 · El pan, el agua y los cafés, en su página de siempre (decisión 0112; Anexo 11.11)
--
-- Lo que vio Richi en la botonera: el pan y el café no van en Entrantes. En cualquier TPV de
-- hostelería **el pan y el agua van juntos y los sirve el camarero** («Nadie»), y **los cafés
-- y las infusiones tienen su página**, que hace la barra. Así que, aunque la carta los tenga
-- en Entrantes o en Postres, en el TPV van a su página:
--
--   · `pagina_del_tpv.de_siempre`   'pan' («Pan y agua») o 'cafes' («Cafés»), una por local
--   · `la_pagina_de_siempre`        a cuál va un plato por su nombre (la misma tabla que
--                                   `laPaginaDeSiempre` de @estook/dominio), si su sección no
--                                   es ya la suya
--   · una sección de pan se propone de «Nadie» (`lo_que_propone_el_nombre`)
--   · lo nuevo que entra solo va a su página de siempre
--
-- Lo que ya había **se coloca solo**: el pan y el café de las páginas que vinieron de la carta
-- pasan a la suya. Lo que alguien puso a mano en una página suya no se toca.

-- ═══ Una sección de pan, de «Nadie» ══════════════════════════════════════════════

-- Copiada entera de la 0086, con el pan delante de la barra.
create or replace function estook.lo_que_propone_el_nombre(p_nombre text, out quien_lo_prepara text, out pase text)
language sql
immutable
set search_path = estook, pg_catalog, pg_temp
as $$
  select case
           when n ~ '(postre|dulce|tarta|helado)' then 'cocina'
           when n ~ '(^|[^a-z])(pan|panes)([^a-z]|$)' then 'nadie'
           when n ~ '(bebida|refresco|cerveza|vino|cava|champan|cafe|infusion|copa|coctel|combinado|licor|agua|zumo|vermut|sidra)' then 'barra'
           else 'cocina'
         end,
         case
           when n ~ '(postre|dulce|tarta|helado)' then 'postre'
           when n ~ '(^|[^a-z])(pan|panes)([^a-z]|$)' then 'bebidas'
           when n ~ '(bebida|refresco|cerveza|vino|cava|champan|cafe|infusion|copa|coctel|combinado|licor|agua|zumo|vermut|sidra)' then 'bebidas'
           when n ~ '(principal|segundo|carne|pescado|arroz|arroces|pizza|hamburguesa|parrilla|brasa|pasta|plato fuerte)' then '2'
           else '1'
         end
    from (select estook.sin_acentos(coalesce(p_nombre, '')) as n) t
$$;

-- ═══ A qué página de siempre va un plato ═════════════════════════════════════════

-- La misma tabla que `laPaginaDeSiempre` de @estook/dominio; una prueba mira que digan lo
-- mismo. «Pan con tomate» o «Pan de ajo» se cocinan: no son el pan de la mesa.
create function estook.la_pagina_de_siempre(p_plato text, p_seccion text)
returns text
language sql
immutable
set search_path = estook, pg_catalog, pg_temp
as $$
  select case
           when p ~ '^(pan|panes|pan (blanco|integral|sin gluten|de pueblo|casero|rustico|payes|de centeno|de cristal|de molde|de masa madre|artesano)|cesta de pan|servicio de pan|picos|reganas|colines)$'
             or p ~ '^(agua|aguas|agua mineral|agua (con|sin) gas|agua (grande|pequena|de litro|de medio litro)|botella de agua|solan de cabras|font vella|bezoya|lanjaron|vichy catalan)( \d.*)?$'
             then case when s ~ '(^|[^a-z])(pan|panes)([^a-z]|$)' then null else 'pan' end
           when p ~ '^(cafe|cafes|cortado|carajillo|capuchino|cappuccino|descafeinado|expreso|espresso|americano|leche manchada|infusion|infusiones|te|poleo|poleo menta|rooibos|chocolate caliente|cola cao|colacao)( |$)'
             then case when s ~ '(cafe|infusion)' then null else 'cafes' end
           else null
         end
    from (
      select regexp_replace(btrim(estook.sin_acentos(coalesce(p_plato, ''))), '\s+', ' ', 'g') as p,
             estook.sin_acentos(coalesce(p_seccion, '')) as s
    ) t
$$;

comment on function estook.la_pagina_de_siempre(text, text) is
  'A qué página de siempre va un plato por su nombre (0112): pan (el pan y el agua) o cafes. Nulo si su sección ya es la suya. La misma tabla que laPaginaDeSiempre de @estook/dominio.';

-- ═══ Las páginas de siempre ══════════════════════════════════════════════════════

alter table estook.pagina_del_tpv
  add column de_siempre text,
  add constraint pagina_de_siempre_conocida check (de_siempre is null or de_siempre in ('pan', 'cafes'));

comment on column estook.pagina_del_tpv.de_siempre is
  'Si es una página de siempre (0112): pan («Pan y agua», de «Nadie») o cafes («Cafés», de la barra). Una de cada por local.';

create unique index pagina_una_de_siempre
  on estook.pagina_del_tpv (local_id, de_siempre) where de_siempre is not null;

-- La página de siempre de un local, creada si no está: «Pan y agua» la primera y «Cafés» la
-- última, que es donde se buscan.
create function estook.la_pagina_de_siempre_del_local(p_local uuid, p_tipo text)
returns uuid
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  v_pagina uuid;
begin
  select id into v_pagina from estook.pagina_del_tpv
   where local_id = p_local and de_siempre = p_tipo;
  if v_pagina is not null then
    return v_pagina;
  end if;
  insert into estook.pagina_del_tpv (local_id, nombre, orden, quien_lo_prepara, pase, de_siempre)
  values (
    p_local,
    case p_tipo when 'pan' then 'Pan y agua' else 'Cafés' end,
    case p_tipo
      when 'pan' then coalesce((select min(orden) - 1 from estook.pagina_del_tpv where local_id = p_local), 0)
      else coalesce((select max(orden) + 1 from estook.pagina_del_tpv where local_id = p_local), 0)
    end,
    case p_tipo when 'pan' then 'nadie' else 'barra' end,
    'bebidas',
    p_tipo
  )
  returning id into v_pagina;
  return v_pagina;
end;
$$;

comment on function estook.la_pagina_de_siempre_del_local(uuid, text) is
  'La página «Pan y agua» o «Cafés» de un local, creada si no está (0112).';

revoke all on function estook.la_pagina_de_siempre_del_local(uuid, text) from public;
grant execute on function estook.la_pagina_de_siempre_del_local(uuid, text) to estook_api;

-- ═══ Lo nuevo que entra solo, a su página de siempre ═════════════════════════════

-- Copiada entera de la 0086, con la página de siempre delante de la de su sección.
create or replace function estook.el_plato_entra_en_la_botonera()
returns trigger
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  v_pagina uuid;
  v_seccion record;
  v_propone record;
  v_de_siempre text;
begin
  if new.seccion_id is null or not new.activo or not new.en_la_carta then
    return new;
  end if;
  if not exists (
    select 1 from estook.local l where l.id = new.local_id and l.botonera_entra_solo
  ) then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.seccion_id is not distinct from new.seccion_id
     and old.activo = new.activo and old.en_la_carta = new.en_la_carta then
    return new;
  end if;

  select nombre, orden into v_seccion from estook.seccion_de_carta where id = new.seccion_id;
  v_de_siempre := estook.la_pagina_de_siempre(new.nombre, v_seccion.nombre);

  if v_de_siempre is not null then
    v_pagina := estook.la_pagina_de_siempre_del_local(new.local_id, v_de_siempre);
  else
    select id into v_pagina from estook.pagina_del_tpv
     where local_id = new.local_id and seccion_id = new.seccion_id;
    if v_pagina is null then
      select * into v_propone from estook.lo_que_propone_el_nombre(v_seccion.nombre);
      insert into estook.pagina_del_tpv (local_id, nombre, orden, quien_lo_prepara, pase, seccion_id)
      values (
        new.local_id, left(v_seccion.nombre, 30),
        coalesce((select max(orden) + 1 from estook.pagina_del_tpv where local_id = new.local_id), 0),
        v_propone.quien_lo_prepara, v_propone.pase, new.seccion_id
      )
      returning id into v_pagina;
    end if;
  end if;

  -- Si cambió de sección, su botón de la página de antes se va a la nueva.
  if tg_op = 'UPDATE' and old.seccion_id is distinct from new.seccion_id then
    delete from estook.boton_del_tpv b
     using estook.pagina_del_tpv g
     where b.pagina_id = g.id and b.plato_id = new.id and g.seccion_id = old.seccion_id;
  end if;

  insert into estook.boton_del_tpv (local_id, pagina_id, plato_id, orden)
  values (
    new.local_id, v_pagina, new.id,
    coalesce((select max(orden) + 1 from estook.boton_del_tpv where pagina_id = v_pagina), 0)
  )
  on conflict (pagina_id, plato_id) do nothing;
  return new;
end;
$$;

-- ═══ Lo que ya había: el pan y el café, a su página ══════════════════════════════

-- Solo lo de las páginas que vinieron de la carta (lo que el local puso a mano, se queda).
do $$
declare
  v record;
  v_pagina uuid;
begin
  for v in
    select b.id as boton_id, b.local_id, b.plato_id,
           estook.la_pagina_de_siempre(p.nombre, s.nombre) as de_siempre
      from estook.boton_del_tpv b
      join estook.pagina_del_tpv g on g.id = b.pagina_id
      join estook.plato p on p.id = b.plato_id
      left join estook.seccion_de_carta s on s.id = p.seccion_id
     where g.seccion_id is not null and g.de_siempre is null
       and estook.la_pagina_de_siempre(p.nombre, s.nombre) is not null
     order by b.local_id, g.orden, b.orden
  loop
    v_pagina := estook.la_pagina_de_siempre_del_local(v.local_id, v.de_siempre);
    if exists (select 1 from estook.boton_del_tpv where pagina_id = v_pagina and plato_id = v.plato_id) then
      delete from estook.boton_del_tpv where id = v.boton_id;
    else
      update estook.boton_del_tpv
         set pagina_id = v_pagina,
             -- Lo de su página nueva manda: el pan ya es de «Nadie» por estar en «Pan y agua».
             quien_lo_prepara = null, pase = null,
             orden = coalesce((select max(orden) + 1 from estook.boton_del_tpv where pagina_id = v_pagina), 0)
       where id = v.boton_id;
    end if;
  end loop;
end;
$$;
