-- Deshace la 0087: el pan y el café vuelven a la página de su sección (la que vino de la
-- carta, si la hay; si no, se quedan fuera del TPV), y las funciones vuelven a las de la 0086.

update estook.boton_del_tpv b
   set pagina_id = g2.id, orden = 999
  from estook.pagina_del_tpv g, estook.plato p, estook.pagina_del_tpv g2
 where g.id = b.pagina_id and g.de_siempre is not null
   and p.id = b.plato_id
   and g2.local_id = b.local_id and g2.seccion_id = p.seccion_id
   and not exists (select 1 from estook.boton_del_tpv o where o.pagina_id = g2.id and o.plato_id = b.plato_id);

delete from estook.pagina_del_tpv where de_siempre is not null;

-- La de la 0086, tal cual.
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

  select id into v_pagina from estook.pagina_del_tpv
   where local_id = new.local_id and seccion_id = new.seccion_id;
  if v_pagina is null then
    select nombre, orden into v_seccion from estook.seccion_de_carta where id = new.seccion_id;
    select * into v_propone from estook.lo_que_propone_el_nombre(v_seccion.nombre);
    insert into estook.pagina_del_tpv (local_id, nombre, orden, quien_lo_prepara, pase, seccion_id)
    values (
      new.local_id, left(v_seccion.nombre, 30),
      coalesce((select max(orden) + 1 from estook.pagina_del_tpv where local_id = new.local_id), 0),
      v_propone.quien_lo_prepara, v_propone.pase, new.seccion_id
    )
    returning id into v_pagina;
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

drop function estook.la_pagina_de_siempre_del_local(uuid, text);
drop index estook.pagina_una_de_siempre;
alter table estook.pagina_del_tpv drop constraint pagina_de_siempre_conocida;
alter table estook.pagina_del_tpv drop column de_siempre;
drop function estook.la_pagina_de_siempre(text, text);

-- La de la 0086, tal cual.
create or replace function estook.lo_que_propone_el_nombre(p_nombre text, out quien_lo_prepara text, out pase text)
language sql
immutable
set search_path = estook, pg_catalog, pg_temp
as $$
  select case
           when n ~ '(postre|dulce|tarta|helado)' then 'cocina'
           when n ~ '(bebida|refresco|cerveza|vino|cava|champan|cafe|infusion|copa|coctel|combinado|licor|agua|zumo|vermut|sidra)' then 'barra'
           else 'cocina'
         end,
         case
           when n ~ '(postre|dulce|tarta|helado)' then 'postre'
           when n ~ '(bebida|refresco|cerveza|vino|cava|champan|cafe|infusion|copa|coctel|combinado|licor|agua|zumo|vermut|sidra)' then 'bebidas'
           when n ~ '(principal|segundo|carne|pescado|arroz|arroces|pizza|hamburguesa|parrilla|brasa|pasta|plato fuerte)' then '2'
           else '1'
         end
    from (select estook.sin_acentos(coalesce(p_nombre, '')) as n) t
$$;
