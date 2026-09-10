-- 0029 · El cierre de caja, con TPV o sin él
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── El agujero que esto tapa ────────────────────────────────────────────────
--
-- Estook sabe **lo que cuesta** el género: lo que se compró, a cuánto, cuánto hay
-- y cuánto se gasta al día. Y no sabe **lo que entra**. Sin eso no hay food cost,
-- no hay margen, no hay Pulse y el Panel de un gerente cuenta la mitad del
-- negocio con mucha autoridad.
--
-- La respuesta escrita hasta hoy era «conecta tu TPV», y eso tiene dos problemas
-- que no son pequeños:
--
--   · **La conexión es M18 y M20**, y hasta entonces la tarjeta del Panel pide
--     una cosa que no se puede hacer. Lleva desde M5 pidiéndola.
--   · Y sobre todo: **hay locales que no van a conectar nada**. Un bar con una
--     caja registradora de veinte años y un papel de Z al final del día no tiene
--     API que conectar, y no por eso deja de necesitar saber su margen. Pedirle
--     credenciales de otro programa en el minuto dos «es la forma más rápida de
--     asustar a un gerente», y eso ya estaba escrito.
--
-- Así que **son dos caminos, y se elige uno**: a mano —tecleado, de un CSV o de
-- una foto del Z— o conectando el TPV. Se pregunta una vez, se cambia en Ajustes,
-- y **por debajo acaban en la misma tabla**: cuando M20 traiga la conexión, lo
-- que llegue del TPV se guarda aquí, con `origen = 'tpv'`, y ni una pantalla ni
-- una gráfica se entera de que ha cambiado nada.
--
-- Esa última frase es la razón de que esto se construya ahora y no dentro de
-- catorce módulos: si el cierre a mano se hubiera montado aparte, conectar el TPV
-- habría significado rehacerlo.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Cómo cierra este local
-- ═══════════════════════════════════════════════════════════════════════════

create type estook.como_se_cierra as enum ('sin_decidir', 'a_mano', 'tpv');

comment on type estook.como_se_cierra is
  'Como entran las ventas en Estook. Sin decidir es el estado de fabrica y hace que el Panel lo pregunte; los otros dos son los dos caminos, y acaban en la misma tabla.';

alter table estook.local
  -- `sin_decidir` de fábrica **y a propósito**. Suponer «a mano» dejaría a todo
  -- el mundo con la pantalla de teclear sin haberlo elegido, y suponer «TPV»
  -- dejaría a todo el mundo esperando una conexión que nadie ha montado. Sin
  -- decidir es la verdad, y es lo que hace que la tarjeta del Panel pregunte una
  -- vez en vez de pedir siempre lo mismo.
  add column if not exists como_se_cierra  estook.como_se_cierra  not null default 'sin_decidir',
  -- Qué TPV, cuando lo diga. Texto y no una lista cerrada: la lista de TPV del
  -- mercado cambia cada temporada, y una migración por cada uno nuevo es lo que
  -- hace que nadie añada ninguno. La lista que se ofrece en pantalla vive en el
  -- código, como el catálogo de apps.
  add column if not exists tpv             text,
  add column if not exists tpv_conectado_en timestamptz;

comment on column estook.local.como_se_cierra is
  'Si las ventas se meten a mano (tecleadas, CSV o foto) o vienen del TPV. Se elige al empezar y se cambia en Ajustes.';
comment on column estook.local.tpv is
  'Como se llama el programa de caja. Texto libre a proposito: la lista de TPV cambia mas deprisa que las migraciones.';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · El cierre
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Uno por local y jornada, y por qué eso es una restricción y no un consejo ──
--
-- Porque un día con dos cierres es un día que se cuenta dos veces, y eso no se
-- ve: el total del mes sale mal y todo lo demás parece correcto. Con la clave
-- única, volver a cerrar el mismo día **corrige** el cierre en vez de añadir otro,
-- que es lo que una persona espera cuando se ha equivocado en una cifra.
--
-- Y la jornada es la operativa, no la del calendario: lo que se cobra a las 02:30
-- de un sábado es del viernes, igual que una entrada de género. El motor de tiempo
-- lo decide desde M2 y aquí solo se guarda el resultado.

create table estook.cierre_de_caja (
  id        uuid  primary key default gen_random_uuid(),
  local_id  uuid  not null references estook.local (id) on delete cascade,
  fecha_operativa  date  not null,

  -- ── El dinero ─────────────────────────────────────────────────────────────
  --
  -- **Con IVA**, que es lo que dice el papel de la caja. Quitárselo es cosa del
  -- motor fiscal de M2 y de cada regla de cada territorio, y guardarlo ya
  -- quitado obligaría a decidir aquí un tipo de IVA que depende de lo que se
  -- haya vendido. Se guarda lo que se cobró, que es el único número que quien
  -- cierra la caja sabe con certeza.
  total_centimos     bigint  not null,
  efectivo_centimos  bigint,
  tarjeta_centimos   bigint,
  otros_centimos     bigint,

  comensales  integer,
  tickets     integer,

  -- Cómo entró. `a_mano` es tecleado, `csv` y `foto` es de un fichero, `tpv` lo
  -- traerá M20 sin tocar esta tabla.
  origen  text  not null default 'a_mano',

  -- El fichero del que salió, si salió de uno: la clave del objeto en el
  -- almacén, nunca una dirección (los enlaces van firmados y caducan). Un cierre
  -- que se metió con una foto del Z **tiene que poder enseñar esa foto**: es la
  -- única prueba de que la cifra no se la inventó nadie.
  fichero_clave  text,

  notas  text,

  cerrado_por  uuid  references estook.persona (id) on delete set null,
  cerrado_en   timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  version      integer  not null default 1,
  es_ejemplo   boolean  not null default false,

  constraint cierre_uno_por_jornada unique (local_id, fecha_operativa),
  constraint cierre_total_no_negativo check (total_centimos >= 0),
  constraint cierre_desglose_no_negativo check (
    coalesce(efectivo_centimos, 0) >= 0
    and coalesce(tarjeta_centimos, 0) >= 0
    and coalesce(otros_centimos, 0) >= 0
  ),
  constraint cierre_cuentas_no_negativas check (
    (comensales is null or comensales >= 0) and (tickets is null or tickets >= 0)
  ),
  constraint cierre_origen_conocido check (origen in ('a_mano', 'csv', 'foto', 'tpv'))
  -- **No se exige que el desglose sume el total**, y es deliberado. En un bar de
  -- verdad no cuadra al céntimo casi nunca —propinas, un cambio mal dado, un
  -- vale— y bloquear el cierre por eso es dejar a alguien sin poder cerrar la
  -- caja a las dos de la mañana. Se guarda, se enseña la diferencia, y decide una
  -- persona. Es la misma regla que «nunca se bloquea a nadie por cuadrar».
);

comment on table estook.cierre_de_caja is
  'Lo que ha entrado en una jornada. Uno por local y dia: volver a cerrar corrige, no duplica. Da igual si se tecleo, si salio de un CSV, de una foto o del TPV.';
comment on column estook.cierre_de_caja.total_centimos is
  'Con IVA, que es lo que dice el papel de la caja. Quitarlo es del motor fiscal y depende de lo que se haya vendido.';
comment on column estook.cierre_de_caja.fichero_clave is
  'La clave del Z o del CSV en el almacen. Es la prueba de que la cifra no se la invento nadie.';

create index cierre_por_local_y_dia on estook.cierre_de_caja (local_id, fecha_operativa desc);

create trigger cierre_de_caja_sube_version before update on estook.cierre_de_caja
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- C · Qué salió, y cuánto
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por qué las líneas son texto y todavía no apuntan a un plato ────────────
--
-- Porque **la carta es M10 y no existe**. Lo que hay hoy es lo que dice el papel
-- del TPV: «Hamburguesa clásica · 14 · 168,00». Guardar eso tal cual, con su
-- nombre literal, es lo único honesto que se puede hacer ahora, y es además lo
-- que hace posible el emparejamiento de M20: cuando existan los platos, se
-- empareja **este texto** con **ese plato**, una vez, y a partir de ahí Estook
-- sabe qué consumo genera cada venta.
--
-- La alternativa —esperar a M10 para guardar las ventas— significaría que el día
-- que llegue la carta no hay ni un histórico con el que estrenarla.
--
-- Se guarda en `minusculas_sin_acentos` además del literal, y no es un capricho:
-- el mismo plato sale del TPV escrito de tres maneras a lo largo de un año, y ese
-- campo es por donde M20 los va a juntar sin tener que adivinar.

create table estook.linea_de_cierre (
  id         bigserial  primary key,
  cierre_id  uuid  not null references estook.cierre_de_caja (id) on delete cascade,

  -- Tal cual lo escribe la caja. Es la prueba, y no se toca.
  concepto   text  not null,
  -- El mismo, en minúsculas y sin acentos. Por aquí empareja M20.
  concepto_normalizado  text  not null,

  unidades          numeric(12, 3)  not null,
  importe_centimos  bigint,

  constraint linea_concepto_no_vacio check (length(btrim(concepto)) > 0),
  constraint linea_unidades_positivas check (unidades > 0),
  constraint linea_importe_no_negativo check (importe_centimos is null or importe_centimos >= 0)
);

comment on table estook.linea_de_cierre is
  'Que platos salieron y cuantos. Texto mientras no exista la carta (M10); M20 empareja cada concepto con su plato una vez y desde ahi calcula el consumo.';
comment on column estook.linea_de_cierre.concepto_normalizado is
  'El concepto en minusculas y sin acentos. Es por donde M20 juntara el mismo plato escrito de tres maneras distintas.';

create index linea_de_cierre_por_cierre on estook.linea_de_cierre (cierre_id, id);
create index linea_de_cierre_por_concepto on estook.linea_de_cierre (concepto_normalizado);

-- El normalizado se calcula aquí y no en el servidor, por la misma razón de
-- siempre: lo van a escribir el cierre a mano, el importador de CSV y, un día, el
-- conector del TPV. Tres sitios calculando lo mismo son tres formas de escribirlo
-- distinto, y entonces el emparejamiento de M20 no junta nada.
create or replace function estook.normalizar_el_concepto()
returns trigger
language plpgsql
as $$
begin
  new.concepto_normalizado := estook.sin_acentos(lower(btrim(new.concepto)));
  return new;
end;
$$;

create trigger linea_de_cierre_normaliza
  before insert or update on estook.linea_de_cierre
  for each row execute function estook.normalizar_el_concepto();

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Leer un cierre es ver la facturación del día, así que pide `dato.ventas`: lo
-- tienen el gerente, el jefe de sala, el área manager, la dirección y la gestoría.
-- **Un cocinero no**, y está en la matriz desde M1: «que no ve, en ningún sitio:
-- costes, márgenes, precios de compra, ventas del local».
--
-- Escribirlo pide además `app.servicio` en «ver y editar», que es donde vive el
-- cierre de la jornada. Cerrar la caja es un acto del servicio, no de la
-- contabilidad.

alter table estook.cierre_de_caja  enable row level security;
alter table estook.linea_de_cierre enable row level security;

create policy cierre_lectura on estook.cierre_de_caja
  for select using (estook.puede_ver('dato.ventas', local_id));

create policy cierre_escritura on estook.cierre_de_caja
  for all using (
    estook.puede_editar('dato.ventas', local_id)
    and estook.puede_editar('app.servicio', local_id)
  )
  with check (
    estook.puede_editar('dato.ventas', local_id)
    and estook.puede_editar('app.servicio', local_id)
  );

create policy linea_lectura on estook.linea_de_cierre
  for select using (
    exists (
      select 1 from estook.cierre_de_caja c
       where c.id = cierre_id and estook.puede_ver('dato.ventas', c.local_id)
    )
  );

create policy linea_escritura on estook.linea_de_cierre
  for all using (
    exists (
      select 1 from estook.cierre_de_caja c
       where c.id = cierre_id
         and estook.puede_editar('dato.ventas', c.local_id)
         and estook.puede_editar('app.servicio', c.local_id)
    )
  )
  with check (
    exists (
      select 1 from estook.cierre_de_caja c
       where c.id = cierre_id
         and estook.puede_editar('dato.ventas', c.local_id)
         and estook.puede_editar('app.servicio', c.local_id)
    )
  );

revoke all on estook.cierre_de_caja  from public;
revoke all on estook.linea_de_cierre from public;

grant select, insert, update, delete on estook.cierre_de_caja  to estook_api;
grant select, insert, update, delete on estook.linea_de_cierre to estook_api;
grant usage, select on sequence estook.linea_de_cierre_id_seq to estook_api;
