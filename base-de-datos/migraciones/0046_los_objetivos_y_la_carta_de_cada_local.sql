-- 0046 · Los objetivos con semáforo y la dirección fija de la carta de cada local
--      (mejoras antes de M8, entrega O · decisión 0047)
--
-- Dos cosas, las dos de O, y ninguna toca lo que ya hay:
--
--   A · Dos objetivos más: la merma (en fracción de lo comprado) y las ventas de
--       la semana (en céntimos). Son los que faltaban para el semáforo del Panel.
--   B · La dirección de la carta de cada local, **para siempre**: la que lleva el
--       QR que se imprime una vez. Y la única lectura que se hace sin sesión: lo
--       que enseña esa dirección.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Los objetivos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Food cost bajo el 30 %, merma bajo X €», pedía Richi. La merma se mide **en
-- porcentaje de lo comprado**, que es como la mide el sector (del 4 al 10 %, con el
-- 4 % como meta): no depende del tamaño del local y se sabe aunque no se cierre la
-- caja. Así cabe en `valor`, como los otros, en fracción.
--
-- Las ventas no: son euros. Van en `importe_centimos`, y cada fila lleva **o un
-- valor o un importe**, nunca los dos ni ninguno. Qué clave lleva cuál lo decide
-- la API (`poner_objetivos`): aquí no se nombran los valores nuevos del tipo,
-- porque Postgres no deja usarlos en la misma transacción que los añade.

alter type estook.clave_de_objetivo add value if not exists 'merma';
alter type estook.clave_de_objetivo add value if not exists 'ventas_semanales';

alter table estook.objetivo
  alter column valor drop not null,
  add column importe_centimos bigint;

alter table estook.objetivo
  add constraint objetivo_valor_o_importe check ((valor is null) <> (importe_centimos is null)),
  add constraint objetivo_importe_positivo check (importe_centimos is null or importe_centimos > 0);

comment on column estook.objetivo.importe_centimos is
  'Solo para los objetivos que son dinero —las ventas de la semana—, en céntimos. Los demás van en valor, en fracción (0047).';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · La dirección de la carta
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Cada local recibe su dirección fija (`estook.com/carta/nombre-del-local`) y su
--  QR para imprimir. El día que llegue la carta, el mismo QR ya impreso la enseña,
--  sin reimprimir nada» (mejoras antes de M8, punto 20).
--
-- **Fija quiere decir que no se cambia nunca**, ni al cambiar el nombre del local:
-- un QR impreso en cuatrocientas mesas no se puede corregir. Por eso es una columna
-- propia y no se deduce del nombre cada vez, y por eso ninguna operación la
-- escribe: la pone la base al nacer el local.
--
-- La forma: la de la organización si el local es el único que tiene
-- (`estook.com/carta/ikatz`); con más de uno, la de la organización y la del local
-- (`estook.com/carta/burger-king-food-truck`). Y única en todo Estook, que es lo que
-- la hace una dirección.

alter table estook.local
  add column direccion_de_la_carta text;

alter table estook.local
  add constraint local_direccion_de_la_carta_con_forma
    check (direccion_de_la_carta is null or direccion_de_la_carta ~ '^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$'),
  add constraint local_direccion_de_la_carta_unica unique (direccion_de_la_carta);

comment on column estook.local.direccion_de_la_carta is
  'La dirección fija de su carta: estook.com/carta/<esto>. La lleva el QR impreso, así que no cambia nunca, ni al renombrar el local (0047).';

-- La primera libre a partir de una base: `ikatz`, y si ya está, `ikatz-2`.
--
-- Con privilegio porque tiene que ver **las direcciones de todo Estook** para no
-- repetir una, y quien da de alta un local solo ve las suyas: sin él, dos locales
-- de dos empresas distintas podrían chocar y el alta fallaría con un error que
-- nadie entendería. No devuelve nada de nadie: solo un texto libre.
create function estook.direccion_libre_para_la_carta(p_base text)
returns text
language plpgsql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  base text;
  candidata text;
  n integer := 1;
begin
  -- A la forma de la columna: minúsculas, números y guiones, sin guiones en los
  -- extremos ni repetidos, y con sitio para el `-n` del final.
  base := regexp_replace(lower(coalesce(p_base, '')), '[^a-z0-9-]+', '-', 'g');
  base := regexp_replace(base, '-{2,}', '-', 'g');
  base := trim(both '-' from left(base, 72));
  if base = '' then
    base := 'local';
  end if;

  candidata := base;
  while exists (select 1 from estook.local where direccion_de_la_carta = candidata) loop
    n := n + 1;
    candidata := base || '-' || n;
  end loop;
  return candidata;
end;
$$;

comment on function estook.direccion_libre_para_la_carta(text) is
  'La primera dirección de carta libre a partir de una base: ikatz, ikatz-2… Mira las de todo Estook para no repetir, y no devuelve nada de nadie (0047).';

-- Al nacer un local, su dirección. En un disparador y no en la API para que
-- **ningún** local se quede sin ella —el alta, crear cuenta, duplicar un local, las
-- semillas—: son cuatro caminos, y el quinto que llegue se olvidaría.
create function estook.poner_la_direccion_de_la_carta()
returns trigger
language plpgsql
as $$
declare
  codigo_de_la_organizacion text;
  cuantos integer;
begin
  if new.direccion_de_la_carta is not null then
    return new;
  end if;

  select o.codigo into codigo_de_la_organizacion
    from estook.organizacion o where o.id = new.organizacion_id;

  select count(*) into cuantos
    from estook.local l where l.organizacion_id = new.organizacion_id;

  new.direccion_de_la_carta := estook.direccion_libre_para_la_carta(
    case when cuantos = 0 then codigo_de_la_organizacion
         else codigo_de_la_organizacion || '-' || new.codigo end
  );
  return new;
end;
$$;

create trigger local_con_direccion_de_la_carta
  before insert on estook.local
  for each row execute function estook.poner_la_direccion_de_la_carta();

-- Y a los que ya existen, una vez: por orden de antigüedad, para que el primer
-- local de cada empresa se quede con la dirección corta.
do $$
declare
  el_local record;
begin
  for el_local in
    select l.id, l.codigo, o.codigo as de_la_organizacion,
           (select count(*) from estook.local x where x.organizacion_id = l.organizacion_id) as hermanos
      from estook.local l
      join estook.organizacion o on o.id = l.organizacion_id
     where l.direccion_de_la_carta is null
     order by l.creado_en, l.id
  loop
    update estook.local
       set direccion_de_la_carta = estook.direccion_libre_para_la_carta(
             case when el_local.hermanos = 1 then el_local.de_la_organizacion
                  else el_local.de_la_organizacion || '-' || el_local.codigo end)
     where id = el_local.id;
  end loop;
end;
$$;

alter table estook.local
  alter column direccion_de_la_carta set not null;

-- ── Lo que enseña la dirección, sin sesión ─────────────────────────────────
--
-- Quien escanea el QR no ha entrado en ningún sitio, así que no hay persona con la
-- que pasar la seguridad de las filas: se lee por aquí o no se lee. Y por eso
-- devuelve **solo lo que el local ya enseña al mundo** —su nombre, su dirección,
-- su teléfono y lo que dice su ficha de Google—, nunca un identificador ni nada
-- de dentro. Hasta M12, eso es la carta; después, además, los platos.
create function estook.la_carta_publica(p_direccion text)
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
  logo_clave text
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
         l.logo_clave
    from estook.local l
   where l.direccion_de_la_carta = lower(p_direccion)
     and l.activo
$$;

comment on function estook.la_carta_publica(text) is
  'Lo que enseña estook.com/carta/<dirección> a quien escanea el QR, sin sesión: solo lo que el local ya enseña al mundo (0047).';

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.direccion_libre_para_la_carta(text)',
    'estook.la_carta_publica(text)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end;
$$;
