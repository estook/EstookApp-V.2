-- 0085 · T2 · La sala: el plano se dibuja en Estook TPV, a ojo (decisión 0110; Anexo 11.9)
--
-- Lo que hace falta para dibujar la sala en el TPV, sin un solo centímetro:
--
--   · `mesa` gana **sus formas** (cuadrada, redonda, rectangular, ovalada, alargada y
--     taburete), **su tamaño a ojo** (`ancho` y `fondo`, en las unidades del plano de
--     1000 × 1000; nulos = el que le toca por sus plazas) y **su giro**
--   · `elemento_de_sala`: lo que hay en la sala y no se abre —la barra, las paredes, las
--     columnas, las puertas, las plantas y los textos—, con su sitio, su tamaño y su giro
--   · **el plano lo dibuja quien tiene los Ajustes del TPV** (Roles 1.12, Anexo 11.13):
--     «Tu sala» sale de Estook, así que las políticas dejan de mirar `app.ajustes`
--
-- Lo que ya había no cambia: las mesas dibujadas en Estook › Tu sala siguen donde
-- estaban, con su forma, y su tamaño sale de sus plazas.

-- ═══ La mesa: sus formas, su tamaño y su giro ═══════════════════════════════════

alter table estook.mesa drop constraint mesa_forma_conocida;
alter table estook.mesa add constraint mesa_forma_conocida
  check (forma in ('cuadrada', 'redonda', 'rectangular', 'ovalada', 'alargada', 'taburete'));

alter table estook.mesa
  add column ancho smallint,
  add column fondo smallint,
  add column giro  smallint not null default 0;

alter table estook.mesa add constraint mesa_tamano_en_el_plano
  check ((ancho is null or ancho between 14 and 1000) and (fondo is null or fondo between 14 and 1000));
alter table estook.mesa add constraint mesa_giro_en_grados check (giro between 0 and 359);

comment on column estook.mesa.ancho is
  'Lo ancha que se ha estirado, en unidades del plano (de 1000). Nulo: la que le toca por sus plazas (Anexo 11.9).';
comment on column estook.mesa.fondo is
  'Lo honda que se ha estirado, en unidades del plano (de 1000). Nulo: la que le toca por sus plazas.';
comment on column estook.mesa.giro is 'Cuánto está girada, en grados (0 a 359).';

-- ═══ Lo que hay en la sala y no se abre ═════════════════════════════════════════

create table estook.elemento_de_sala (
  id            uuid         primary key default gen_random_uuid(),
  local_id      uuid         not null references estook.local (id) on delete cascade,
  zona_id       uuid         not null references estook.zona_de_sala (id) on delete cascade,
  tipo          text         not null,
  -- Solo los de tipo «texto»: «ZONA VENTANAS», «Entrada».
  texto         text,
  x             integer      not null default 0,
  y             integer      not null default 0,
  ancho         smallint     not null,
  fondo         smallint     not null,
  giro          smallint     not null default 0,
  archivado_en  timestamptz,
  version       integer      not null default 1,
  creado_en     timestamptz  not null default now(),

  constraint elemento_tipo_conocido
    check (tipo in ('barra', 'pared', 'columna', 'puerta', 'planta', 'texto')),
  constraint elemento_texto_con_medida
    check (texto is null or char_length(btrim(texto)) between 1 and 40),
  constraint elemento_en_el_plano check (x between 0 and 1000 and y between 0 and 1000),
  constraint elemento_tamano_en_el_plano check (ancho between 14 and 1000 and fondo between 14 and 1000),
  constraint elemento_giro_en_grados check (giro between 0 and 359)
);

comment on table estook.elemento_de_sala is
  'Lo que hay en la sala y no se abre (T2, Anexo 11.9): barra, paredes, columnas, puertas, plantas y textos. Se archiva, no se borra.';

create index elemento_por_zona on estook.elemento_de_sala (zona_id) where archivado_en is null;

create trigger elemento_de_sala_sube_version before update on estook.elemento_de_sala
  for each row execute function estook.subir_version();

alter table estook.elemento_de_sala enable row level security;

create policy elemento_de_sala_lectura on estook.elemento_de_sala
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy elemento_de_sala_escritura on estook.elemento_de_sala
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (
    estook.puede_editar('accion.ajustes_del_tpv', local_id)
    and exists (
      select 1 from estook.zona_de_sala z
       where z.id = zona_id and z.local_id = elemento_de_sala.local_id
    )
  );

revoke all on estook.elemento_de_sala from public;
grant select, insert, update on estook.elemento_de_sala to estook_api;

-- ═══ El plano lo dibuja quien tiene los Ajustes del TPV ═════════════════════════

drop policy zona_de_sala_escritura on estook.zona_de_sala;
create policy zona_de_sala_escritura on estook.zona_de_sala
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (estook.puede_editar('accion.ajustes_del_tpv', local_id));

drop policy mesa_escritura on estook.mesa;
create policy mesa_escritura on estook.mesa
  for all using (estook.puede_editar('accion.ajustes_del_tpv', local_id))
  with check (
    estook.puede_editar('accion.ajustes_del_tpv', local_id)
    and exists (select 1 from estook.zona_de_sala z where z.id = zona_id and z.local_id = mesa.local_id)
  );

-- ═══ «Ana ha fichado la salida» (Anexo 11.8) ════════════════════════════════════

-- Quién ha fichado hoy en el local y ya ha fichado la salida: sus mesas abiertas salen en
-- el plano con el aviso, para que alguien se las quede (0106). Solo los ids, y solo de
-- un local que quien pregunta ve. Quien no ficha nunca no sale: no se ha ido.
create function estook.han_fichado_la_salida(p_local uuid)
returns setof uuid
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select ultimo.persona_id
    from (
      select distinct on (f.persona_id) f.persona_id, f.salio_en
        from estook.fichaje f
       where f.local_id = p_local and f.entro_en > now() - interval '20 hours'
         and p_local in (select local_id from estook.locales_visibles())
       order by f.persona_id, f.entro_en desc
    ) ultimo
   where ultimo.salio_en is not null
$$;

comment on function estook.han_fichado_la_salida(uuid) is
  'Quién ha fichado la salida hoy en un local que quien pregunta ve: el aviso de sus mesas en el plano (Anexo 11.8). Solo la ejecuta estook_api.';

revoke all on function estook.han_fichado_la_salida(uuid) from public;
grant execute on function estook.han_fichado_la_salida(uuid) to estook_api;
