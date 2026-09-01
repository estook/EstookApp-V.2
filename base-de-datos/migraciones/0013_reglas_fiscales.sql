-- 0013 · Las reglas fiscales
--
-- Modulo M2. La tabla de la que sale el impuesto de cada operacion.
--
-- Dos garantias, y las dos las impone la base de datos, no el codigo:
--
--   1. **Una regla usada no se reescribe.** Solo se puede cerrar su vigencia o
--      desactivarla. Cambiar un tipo es crear una version nueva. Asi una venta de
--      septiembre nunca cambia porque en octubre cambie la ley.
--   2. **Nada se toca en silencio.** Cada alta y cada cambio deja linea en la
--      auditoria, con quien, cuando y por que.

-- La auditoria de M1 exigia organizacion. Las reglas fiscales no son de nadie:
-- son de la plataforma. Se permite dejarla vacia para esos casos.
alter table estook.auditoria alter column organizacion_id drop not null;

comment on column estook.auditoria.organizacion_id is
  'Vacio cuando el hecho es de la plataforma y no de un cliente, como un cambio en las reglas fiscales. Las politicas RLS no ensenan esas lineas a nadie: son de administracion interna.';

-- ── La tabla ──────────────────────────────────────────────────────────────────

create table estook.regla_fiscal (
  id                uuid                            primary key default gen_random_uuid(),
  -- Legible, para poder citarla en una conversacion: 'iva-restauracion'.
  codigo            text                            not null,
  version           integer                         not null default 1,

  -- Lo que siempre se exige.
  territorio        estook.territorio_fiscal        not null,
  regimen           estook.regimen_fiscal           not null,

  -- Las casillas que puede concretar. Vacio significa «me da igual», no «nada».
  -- Cuantas mas llene una regla, mas especifica es, y antes gana.
  naturaleza        estook.naturaleza_de_operacion,
  modo_de_consumo   estook.modo_de_consumo,
  categoria_fiscal  estook.categoria_fiscal,
  actividad         estook.actividad_de_hosteleria,
  epigrafe_iae      text,

  -- Fraccion con cuatro decimales: 0,1000 es el 10 %.
  tipo              numeric(6, 4)                   not null,

  vigente_desde     date                            not null,
  vigente_hasta     date,

  -- De donde sale. Sin esto una regla es un numero sin respaldo.
  referencia_legal  text                            not null,
  fuente_url        text,

  activa            boolean                         not null default true,
  creado_en         timestamptz                     not null default now(),
  actualizado_en    timestamptz                     not null default now(),

  constraint regla_version_unica unique (codigo, version),
  constraint regla_tipo_en_rango check (tipo >= 0 and tipo <= 1),
  constraint regla_vigencia_coherente check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  constraint regla_referencia_no_vacia check (length(btrim(referencia_legal)) > 0),
  constraint regla_regimen_del_territorio check (
    (territorio = 'peninsula_y_baleares' and regimen = 'iva')
    or (territorio = 'canarias' and regimen = 'igic')
    or (territorio in ('ceuta', 'melilla') and regimen = 'ipsi')
  )
);

comment on table estook.regla_fiscal is
  'De aqui sale el impuesto de cada operacion. Ninguna regla vive en el codigo.';
comment on column estook.regla_fiscal.tipo is
  'Fraccion, no porcentaje: 0,1000 es el 10 %. Con cuatro decimales, como todos los porcentajes de Estook.';

create index regla_por_territorio on estook.regla_fiscal (territorio, regimen, vigente_desde);
create index regla_vigente on estook.regla_fiscal (territorio, regimen) where activa;

create trigger regla_fiscal_actualizada before update on estook.regla_fiscal
  for each row execute function estook.marcar_actualizado();

-- ── Barrera 1 · una regla usada no se reescribe ───────────────────────────────

create or replace function estook.regla_fiscal_no_se_reescribe()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Una regla fiscal no se borra: se desactiva o se cierra su vigencia. Borrarla dejaria ventas historicas sin explicacion.'
      using errcode = '42501';
  end if;

  -- Lo unico que se puede cambiar es cerrarla o apagarla. Todo lo demas obliga a
  -- crear una version nueva, y asi lo ya vendido conserva su regla.
  if (new.codigo, new.territorio, new.regimen, new.tipo, new.vigente_desde, new.version)
     is distinct from
     (old.codigo, old.territorio, old.regimen, old.tipo, old.vigente_desde, old.version)
     or new.naturaleza is distinct from old.naturaleza
     or new.modo_de_consumo is distinct from old.modo_de_consumo
     or new.categoria_fiscal is distinct from old.categoria_fiscal
     or new.actividad is distinct from old.actividad
     or new.epigrafe_iae is distinct from old.epigrafe_iae
  then
    raise exception 'Una regla fiscal no se reescribe. Crea una version nueva (mismo codigo, version siguiente) y cierra la vigencia de esta.'
      using errcode = '42501';
  end if;

  -- Y cerrarla solo hacia delante: cerrar en el pasado si reescribiria la historia.
  if new.vigente_hasta is distinct from old.vigente_hasta
     and new.vigente_hasta is not null
     and new.vigente_hasta < current_date
  then
    raise exception 'Una vigencia solo se cierra a partir de hoy. Cerrarla en el pasado cambiaria ventas ya hechas.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger regla_fiscal_intocable
  before update or delete on estook.regla_fiscal
  for each row execute function estook.regla_fiscal_no_se_reescribe();

-- ── Barrera 2 · nada se toca en silencio ──────────────────────────────────────

create or replace function estook.regla_fiscal_deja_rastro()
returns trigger
language plpgsql
as $$
declare
  que_paso text;
begin
  if tg_op = 'INSERT' then
    que_paso := 'crear';
  elsif new.activa is distinct from old.activa then
    que_paso := case when new.activa then 'reactivar' else 'desactivar' end;
  elsif new.vigente_hasta is distinct from old.vigente_hasta then
    que_paso := 'cerrar_vigencia';
  else
    que_paso := 'modificar';
  end if;

  insert into estook.auditoria (
    organizacion_id, persona_id, correlacion_id,
    accion, entidad, entidad_id, antes, despues, motivo
  ) values (
    null,
    estook.persona_actual(),
    nullif(current_setting('estook.correlacion_id', true), '')::uuid,
    que_paso,
    'regla_fiscal',
    new.codigo || ' v' || new.version,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    new.referencia_legal
  );

  return new;
end;
$$;

create trigger regla_fiscal_auditada
  after insert or update on estook.regla_fiscal
  for each row execute function estook.regla_fiscal_deja_rastro();

grant select, insert, update on estook.regla_fiscal to estook_api;
alter table estook.regla_fiscal enable row level security;

-- Las reglas fiscales las lee todo el mundo: son la ley, no un dato de nadie.
create policy regla_fiscal_lectura on estook.regla_fiscal for select using (true);
