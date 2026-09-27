-- 0051 · R2 · El pedido sugerido, los informes y la nota en Google (decisión 0053)
--
-- La segunda mitad de R. La campana ya existe (0050); esto le da lo que avisa el
-- reloj sin que nadie abra la app:
--
--   A · **Seis avisos nuevos**: «mañana toca pedir», los productos bajo mínimo,
--       Tu día, Tu semana y Tu mes, y la nota en Google que baja. Son tipos de la
--       misma tabla, así que se amplía la lista que los admite.
--   B · **Las cifras de un informe**, en el aviso: el correo de Tu semana lleva su
--       tabla de cifras, y se escribe a las ocho, cuando el reloj ya las ha contado
--       como las vería quien lo recibe. Solo las lee él, como todo su aviso.
--   C · **La nota en Google, día a día**: una fila por local y día en que se leyó.
--       Es lo que dibuja su evolución en Negocio → Reseñas y con lo que se sabe si
--       ha bajado. La ficha del local sigue guardando la última, como siempre.
--   D · **Lo que el reloj mira sin nadie delante**: qué locales hay, y su ficha de
--       Google con su tope. Nada más: lo demás lo cuenta a nombre de quien recibe.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los avisos nuevos
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota'
));

alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota'
));

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las cifras de un informe
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.aviso
  add column cifras jsonb,
  add constraint aviso_cifras_son_una_lista check (
    cifras is null or (jsonb_typeof(cifras) = 'array' and jsonb_array_length(cifras) <= 20)
  );

comment on column estook.aviso.cifras is
  'Las cifras de un informe, como las ve quien lo recibe: la tabla de su correo (0053). Nulo en los demás avisos.';

-- Quien recibe el aviso solo lo marca leído, y ahora tampoco toca sus cifras. Es
-- la función de la 0050 entera, con `cifras` en las dos filas que se comparan.
create or replace function estook.aviso_solo_se_lee()
returns trigger
language plpgsql
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  if estook.es_el_sistema() then
    return new;
  end if;
  if (new.id, new.organizacion_id, new.local_id, new.persona_id, new.tipo, new.clave,
      new.titulo, new.detalle, new.ir, new.quienes, new.creado_en, new.actualizado_en,
      new.correo, new.correo_intentos, new.correo_para, new.cifras)
     is distinct from
     (old.id, old.organizacion_id, old.local_id, old.persona_id, old.tipo, old.clave,
      old.titulo, old.detalle, old.ir, old.quienes, old.creado_en, old.actualizado_en,
      old.correo, old.correo_intentos, old.correo_para, old.cifras) then
    raise exception 'De un aviso solo se marca si está leído'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

revoke all on function estook.aviso_solo_se_lee() from public;

-- ═══════════════════════════════════════════════════════════════════════════
-- C · La nota en Google, día a día
-- ═══════════════════════════════════════════════════════════════════════════

create table estook.nota_en_google (
  local_id    uuid          not null references estook.local (id) on delete cascade,
  -- El día en que se leyó, en Madrid. Si se lee dos veces el mismo día, vale la última.
  dia         date          not null,
  valoracion  numeric(2, 1) not null,
  resenas     integer,
  leida_en    timestamptz   not null default now(),
  primary key (local_id, dia),
  constraint nota_en_google_en_rango check (valoracion between 0 and 5),
  constraint nota_en_google_resenas_no_negativas check (resenas is null or resenas >= 0)
);

comment on table estook.nota_en_google is
  'La nota del local en Google cada día que se leyó: su evolución, y si ha bajado (0053).';

-- Lo que ya se sabía: la última lectura de cada local, como su primer día.
insert into estook.nota_en_google (local_id, dia, valoracion, resenas, leida_en)
select id, (google_leido_en at time zone 'Europe/Madrid')::date, google_valoracion,
       google_resenas, google_leido_en
  from estook.local
 where google_valoracion is not null and google_leido_en is not null;

alter table estook.nota_en_google enable row level security;

-- La ve quien ve Negocio (Reseñas) o quien lleva los ajustes del local (Tu local).
create policy nota_en_google_lectura on estook.nota_en_google
  for select using (
    estook.es_el_sistema()
    or estook.puede_ver('app.negocio', local_id)
    or estook.puede_ver('app.ajustes', local_id)
  );
-- La escribe el sistema: al leer la ficha de Google, la lea quien la lea.
create policy nota_en_google_alta on estook.nota_en_google
  for insert with check (estook.es_el_sistema());
create policy nota_en_google_al_dia on estook.nota_en_google
  for update using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.nota_en_google from public;
grant select, insert, update on estook.nota_en_google to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Lo que el reloj mira sin nadie delante
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A las ocho no hay nadie con sesión. El reloj necesita saber **qué locales hay** y
-- poner al día **su ficha de Google**, contándola en el tope. Son políticas nuevas
-- que se suman a las de siempre (se juntan con «o»): quien entra con su sesión
-- sigue viendo y tocando lo mismo que antes, y el sistema solo lo es dentro de la
-- API (`enNombreDelSistema`), nunca desde fuera.
--
-- Lo demás —los proveedores, el género, las cifras— el reloj no lo lee como
-- sistema: lo cuenta **a nombre de quien va a recibir el aviso**, con sus permisos.

create policy local_lo_mira_el_reloj on estook.local
  for select using (estook.es_el_sistema());
create policy local_su_ficha_de_google on estook.local
  for update using (estook.es_el_sistema()) with check (estook.es_el_sistema());
create policy uso_de_google_del_reloj on estook.uso_de_google
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());
