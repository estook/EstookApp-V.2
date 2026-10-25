-- 0086 · T3 · La botonera de Estook TPV (decisión 0111; Anexo 7.2 y 11.11)
--
-- Qué se vende en el TPV, en qué página y de qué color, **quién lo prepara** y **en qué
-- pase sale**. «Es de bebidas» (la 0082) se va: no se entendía (respuesta 6 de la 0107).
--
--   · `pagina_del_tpv`  una página de la botonera: su nombre, su orden, su color, quién lo
--                       prepara (cocina, barra, nadie) y en qué pase sale (bebidas, 1, 2, 3,
--                       postre); y la sección de la carta de la que vino, si vino de una
--   · `boton_del_tpv`   un botón: **el plato de la carta al que apunta** (no una copia), su
--                       orden, su color, y quién lo prepara o su pase **solo si cambian** los
--                       de su página; y si está fijado en «Lo más pedido»
--   · en `local`        cómo se montó (toda la carta, elegir, de cero) y **si lo nuevo de la
--                       carta entra solo**
--
-- Lo que ya había **no cambia para nadie**: cada local con carta queda con «Traer toda la
-- carta», una página por sección, y **lo que estaba «de bebidas» pasa a Barra y Bebidas**
-- sin que nadie toque nada. Después, `seccion_de_carta.es_bebida` se quita.

-- ═══ Lo que se propone por el nombre de la sección (Anexo 11.11) ══════════════════

-- La misma tabla que `loQueProponeElNombre` de @estook/dominio; una prueba mira que digan
-- lo mismo. La usan esta migración y el plato que entra solo (abajo).
create function estook.lo_que_propone_el_nombre(p_nombre text, out quien_lo_prepara text, out pase text)
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

comment on function estook.lo_que_propone_el_nombre(text) is
  'Quién lo prepara y en qué pase sale lo de una sección, por su nombre (Anexo 11.11). La misma tabla que loQueProponeElNombre de @estook/dominio.';

-- ═══ Las páginas y los botones ═══════════════════════════════════════════════════

create table estook.pagina_del_tpv (
  id               uuid         primary key default gen_random_uuid(),
  local_id         uuid         not null references estook.local (id) on delete cascade,
  nombre           text         not null,
  orden            integer      not null default 0,
  color            text,
  quien_lo_prepara text         not null default 'cocina',
  pase             text         not null default '1',
  -- La sección de la carta de la que vino: lo nuevo de esa sección entra aquí.
  seccion_id       uuid         references estook.seccion_de_carta (id) on delete set null,
  version          integer      not null default 1,
  creado_en        timestamptz  not null default now(),

  constraint pagina_nombre_corto check (char_length(btrim(nombre)) between 1 and 30),
  constraint pagina_color_conocido check (
    color is null
    or color in ('naranja', 'verde', 'azul', 'ambar', 'rojo', 'rosa', 'morado', 'turquesa', 'arena')
  ),
  constraint pagina_quien_conocido check (quien_lo_prepara in ('cocina', 'barra', 'nadie')),
  constraint pagina_pase_conocido check (pase in ('bebidas', '1', '2', '3', 'postre'))
);

comment on table estook.pagina_del_tpv is
  'Una página de la botonera de Estook TPV (T3, Anexo 11.11): su nombre, su orden, su color, quién lo prepara y en qué pase sale. Lo hereda cada botón.';
comment on column estook.pagina_del_tpv.quien_lo_prepara is
  'A qué pantalla o impresora va al mandar: cocina, barra o nadie (se sirve tal cual).';
comment on column estook.pagina_del_tpv.pase is
  'En qué pase sale: la pestaña que se marca sola al abrir la página (bebidas, 1, 2, 3, postre).';

create unique index pagina_una_por_seccion
  on estook.pagina_del_tpv (local_id, seccion_id) where seccion_id is not null;
create index pagina_por_local on estook.pagina_del_tpv (local_id, orden);

create trigger pagina_del_tpv_sube_version before update on estook.pagina_del_tpv
  for each row execute function estook.subir_version();

create table estook.boton_del_tpv (
  id               uuid         primary key default gen_random_uuid(),
  local_id         uuid         not null references estook.local (id) on delete cascade,
  pagina_id        uuid         not null references estook.pagina_del_tpv (id) on delete cascade,
  plato_id         uuid         not null references estook.plato (id) on delete cascade,
  orden            integer      not null default 0,
  color            text,
  -- Nulos: los de su página.
  quien_lo_prepara text,
  pase             text,
  fijado           boolean      not null default false,
  version          integer      not null default 1,
  creado_en        timestamptz  not null default now(),

  constraint boton_color_conocido check (
    color is null
    or color in ('naranja', 'verde', 'azul', 'ambar', 'rojo', 'rosa', 'morado', 'turquesa', 'arena')
  ),
  constraint boton_quien_conocido check (quien_lo_prepara is null or quien_lo_prepara in ('cocina', 'barra', 'nadie')),
  constraint boton_pase_conocido check (pase is null or pase in ('bebidas', '1', '2', '3', 'postre'))
);

comment on table estook.boton_del_tpv is
  'Un botón de la botonera (T3, Anexo 11.11): apunta a su plato de la carta, sin copiarlo. Quién lo prepara y su pase, solo si cambian los de su página.';
comment on column estook.boton_del_tpv.fijado is
  'Fijado en «Lo más pedido»: sale el primero, se venda o no (Anexo 11.10).';

create unique index boton_uno_por_pagina on estook.boton_del_tpv (pagina_id, plato_id);
create index boton_por_pagina on estook.boton_del_tpv (pagina_id, orden);
create index boton_por_plato on estook.boton_del_tpv (local_id, plato_id);

create trigger boton_del_tpv_sube_version before update on estook.boton_del_tpv
  for each row execute function estook.subir_version();

-- La botonera la monta quien tiene los Ajustes del TPV (Roles 1.12); la leen todos los del
-- local, que es lo que se vende.
alter table estook.pagina_del_tpv enable row level security;
alter table estook.boton_del_tpv enable row level security;

create policy pagina_del_tpv_lectura on estook.pagina_del_tpv
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy pagina_del_tpv_escritura on estook.pagina_del_tpv
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));

create policy boton_del_tpv_lectura on estook.boton_del_tpv
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy boton_del_tpv_escritura on estook.boton_del_tpv
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (
    estook.puede_editar('accion.ajustes_del_tpv', local_id)
    and exists (
      select 1 from estook.pagina_del_tpv g
       where g.id = pagina_id and g.local_id = boton_del_tpv.local_id
    )
    and exists (
      select 1 from estook.plato p
       where p.id = plato_id and p.local_id = boton_del_tpv.local_id
    )
  );

revoke all on estook.pagina_del_tpv from public;
revoke all on estook.boton_del_tpv from public;
grant select, insert, update, delete on estook.pagina_del_tpv to estook_api;
grant select, insert, update, delete on estook.boton_del_tpv to estook_api;

-- ═══ Cómo se montó, y si lo nuevo entra solo ═════════════════════════════════════

alter table estook.local
  add column botonera_camino      text,
  add column botonera_entra_solo  boolean not null default false,
  add constraint local_botonera_camino_conocido
    check (botonera_camino is null or botonera_camino in ('toda_la_carta', 'elegir', 'de_cero'));

comment on column estook.local.botonera_camino is
  'Cómo se montó la botonera (Anexo 11.11): toda_la_carta, elegir o de_cero. Nulo: sin montar; el TPV enseña la carta, una página por sección.';
comment on column estook.local.botonera_entra_solo is
  'Si lo nuevo de la carta entra solo en su página del TPV. Si no, sale en «Nuevos en la carta», con «Añadir».';

-- ═══ Lo nuevo de la carta, que entra solo ════════════════════════════════════════

-- Un plato que entra en la carta (o cambia de sección) con la botonera en «entra solo» va a
-- la página de su sección, que se crea con lo que propone su nombre si no está. Con
-- privilegio: lo hace quien toca la carta, que puede no tener los Ajustes del TPV.
create function estook.el_plato_entra_en_la_botonera()
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

comment on function estook.el_plato_entra_en_la_botonera() is
  'Lo nuevo de la carta entra solo en su página del TPV si el local lo quiere (Anexo 11.11). Con privilegio: lo dispara quien toca la carta.';

revoke all on function estook.el_plato_entra_en_la_botonera() from public;
-- Como todas las de privilegio (0043): solo la API. Una función de disparador no se puede
-- llamar a mano, así que esto no abre nada.
grant execute on function estook.el_plato_entra_en_la_botonera() to estook_api;

create trigger plato_entra_en_la_botonera
  after insert or update of seccion_id, activo, en_la_carta on estook.plato
  for each row execute function estook.el_plato_entra_en_la_botonera();

-- ═══ Lo que ya había: «Traer toda la carta», y lo de bebidas a la barra ═════════

update estook.local l
   set botonera_camino = 'toda_la_carta', botonera_entra_solo = true
 where exists (
   select 1 from estook.plato p
    where p.local_id = l.id and p.activo and p.en_la_carta and p.seccion_id is not null
 );

insert into estook.pagina_del_tpv (local_id, nombre, orden, quien_lo_prepara, pase, seccion_id)
select s.local_id, left(s.nombre, 30), s.orden,
       case when s.es_bebida then 'barra' else (estook.lo_que_propone_el_nombre(s.nombre)).quien_lo_prepara end,
       case when s.es_bebida then 'bebidas' else (estook.lo_que_propone_el_nombre(s.nombre)).pase end,
       s.id
  from estook.seccion_de_carta s
  join estook.local l on l.id = s.local_id and l.botonera_camino = 'toda_la_carta'
 where exists (
   select 1 from estook.plato p
    where p.seccion_id = s.id and p.activo and p.en_la_carta
 );

insert into estook.boton_del_tpv (local_id, pagina_id, plato_id, orden)
select p.local_id, g.id, p.id, p.orden
  from estook.plato p
  join estook.pagina_del_tpv g on g.seccion_id = p.seccion_id and g.local_id = p.local_id
 where p.activo and p.en_la_carta;

-- ═══ «Es de bebidas» se va de la carta ═══════════════════════════════════════════

alter table estook.seccion_de_carta drop column es_bebida;
