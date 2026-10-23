-- 0081 · La sala y la cocina (M20A · 1 · 1, decisión 0106)
--
-- La mesa y la comanda, por dentro: lo que la sala pide y lo que la cocina saca. Es la
-- primera pieza de Estook TPV que se guarda; las pantallas llegan en M20A · 1 · 2 y 1 · 3.
-- Todavía **no se cobra** (M20C): una mesa se libera sin cobrar, porque mientras tanto se
-- cobra en el TPV de siempre.
--
--   · `zona_de_sala` y `mesa`   el plano del local: salón, terraza, barra, y sus mesas.
--   · `cuenta`                  la mesa abierta (o la barra, o para llevar), sus personas,
--                               su camarero, «por pases» o «todo junto» y su nota.
--   · `pase`                    el 1.º y el 2.º de cada cuenta: cuándo se marchó, quién lo
--                               marchó (siempre la sala) y cuándo salió todo.
--   · `linea_de_cuenta`         cada plato: lo que es, cuántos, su precio congelado, su
--                               nota, su pase y cuándo salió. **Se le añaden líneas y nunca
--                               se reescriben** (Anexo 3.6): quitar es una marca con motivo.
--
-- Y los tres permisos de Roles 1.12 que hacían falta:
--
--   · `accion.tomar_nota`        la sala: abrir, pedir, mandar y **marchar**
--   · `accion.cocinar`           la cocina: verla sin un euro, **tachar** lo que sale
--   · `accion.quitar_de_cocina`  quitar lo que ya está en cocina, pasar cualquier mesa,
--                                anular y liberar

-- ═══ Los permisos ══════════════════════════════════════════════════════════════

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.tomar_nota', 'Tomar nota', 'accion', 'local',
   'Abrir mesas, pedir, mandar a cocina y marchar el siguiente pase. Lo que ya está en cocina lo quita quien tiene «Quitar de cocina»'),
  ('accion.cocinar', 'Cocinar', 'accion', 'local',
   'Ver la pantalla de cocina, sin un importe, tachar lo que sale y recuperar una mesa que se fue a «Fuera». Nunca marchar: eso es de la sala'),
  ('accion.quitar_de_cocina', 'Quitar de cocina', 'accion', 'local',
   'Quitar con motivo un plato que ya está en cocina, pasar cualquier mesa a otro camarero, y anular o liberar una mesa');

-- Roles 1.12, tal cual. El area manager y la dirección llevan lo del gerente.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('camarero',       'accion.tomar_nota',        'ver_y_editar'),
  ('jefe_de_sala',   'accion.tomar_nota',        'ver_y_editar'),
  ('gerente',        'accion.tomar_nota',        'ver_y_editar'),
  ('area_manager',   'accion.tomar_nota',        'ver_y_editar'),
  ('direccion',      'accion.tomar_nota',        'ver_y_editar'),
  ('cocinero',       'accion.cocinar',           'ver_y_editar'),
  ('jefe_de_cocina', 'accion.cocinar',           'ver_y_editar'),
  ('gerente',        'accion.cocinar',           'ver_y_editar'),
  ('area_manager',   'accion.cocinar',           'ver_y_editar'),
  ('direccion',      'accion.cocinar',           'ver_y_editar'),
  ('jefe_de_sala',   'accion.quitar_de_cocina',  'ver_y_editar'),
  ('gerente',        'accion.quitar_de_cocina',  'ver_y_editar'),
  ('area_manager',   'accion.quitar_de_cocina',  'ver_y_editar'),
  ('direccion',      'accion.quitar_de_cocina',  'ver_y_editar');

-- ═══ El plano ══════════════════════════════════════════════════════════════════

create table estook.zona_de_sala (
  id            uuid         primary key default gen_random_uuid(),
  local_id      uuid         not null references estook.local (id) on delete cascade,
  nombre        text         not null,
  orden         integer      not null default 0,
  archivada_en  timestamptz,
  version       integer      not null default 1,
  creado_en     timestamptz  not null default now(),
  constraint zona_de_sala_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 40)
);

comment on table estook.zona_de_sala is
  'Las zonas del plano de un local: salón, terraza, barra (M20A, 0106). Se archivan, no se borran: una cuenta vieja sigue diciendo dónde estuvo.';

create unique index zona_de_sala_una_por_nombre
  on estook.zona_de_sala (local_id, estook.sin_acentos(lower(btrim(nombre))))
  where archivada_en is null;

create trigger zona_de_sala_sube_version before update on estook.zona_de_sala
  for each row execute function estook.subir_version();

create table estook.mesa (
  id            uuid         primary key default gen_random_uuid(),
  local_id      uuid         not null references estook.local (id) on delete cascade,
  zona_id       uuid         not null references estook.zona_de_sala (id) on delete cascade,
  -- «6», «Terraza 2», «V1»: como la llama el local.
  nombre        text         not null,
  plazas        smallint     not null default 4,
  forma         text         not null default 'cuadrada',
  -- Dónde está en el plano, de 0 a 1000 en los dos ejes: vale para cualquier pantalla.
  x             integer      not null default 0,
  y             integer      not null default 0,
  archivada_en  timestamptz,
  version       integer      not null default 1,
  creado_en     timestamptz  not null default now(),
  constraint mesa_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 20),
  constraint mesa_plazas_en_rango check (plazas between 1 and 50),
  constraint mesa_forma_conocida check (forma in ('cuadrada', 'redonda', 'alargada')),
  constraint mesa_en_el_plano check (x between 0 and 1000 and y between 0 and 1000)
);

comment on table estook.mesa is
  'Las mesas del plano, en su zona (M20A, 0106). Se archivan, no se borran.';

create unique index mesa_una_por_nombre
  on estook.mesa (local_id, estook.sin_acentos(lower(btrim(nombre))))
  where archivada_en is null;
create index mesa_por_zona on estook.mesa (zona_id) where archivada_en is null;

create trigger mesa_sube_version before update on estook.mesa
  for each row execute function estook.subir_version();

alter table estook.zona_de_sala enable row level security;
alter table estook.mesa enable row level security;

-- El plano lo ve todo el local; lo dibuja quien toca los ajustes del local.
create policy zona_de_sala_lectura on estook.zona_de_sala
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy zona_de_sala_escritura on estook.zona_de_sala
  for all using (estook.puede_editar('app.ajustes', local_id))
  with check (estook.puede_editar('app.ajustes', local_id));

create policy mesa_lectura on estook.mesa
  for select using (local_id in (select local_id from estook.locales_visibles()));
create policy mesa_escritura on estook.mesa
  for all using (estook.puede_editar('app.ajustes', local_id))
  with check (
    estook.puede_editar('app.ajustes', local_id)
    and exists (select 1 from estook.zona_de_sala z where z.id = zona_id and z.local_id = mesa.local_id)
  );

grant select, insert, update on estook.zona_de_sala to estook_api;
grant select, insert, update on estook.mesa to estook_api;

-- ═══ La cuenta ═════════════════════════════════════════════════════════════════
--
-- Su identificador **nace en el aparato** (Anexo 7.2): abrir dos veces la misma mesa
-- desde el mismo toque no abre dos. Una mesa tiene **una sola cuenta abierta**.

create table estook.cuenta (
  id                 uuid         primary key default gen_random_uuid(),
  local_id           uuid         not null references estook.local (id) on delete cascade,
  tipo               text         not null default 'mesa',
  mesa_id            uuid         references estook.mesa (id),
  -- Para llevar y reparto: el nombre de recogida («Laura»).
  nombre             text,
  personas           smallint,
  camarero_id        uuid         references estook.persona (id) on delete set null,
  -- «Por pases» (el 2.º espera a que la sala lo marche) o «todo junto» (0106).
  por_pases          boolean      not null default true,
  -- La nota de toda la mesa, para cocina: «tienen prisa».
  nota_para_cocina   text,
  abierta_en         timestamptz  not null default now(),
  abierta_por        uuid         references estook.persona (id) on delete set null,
  -- Liberada: la mesa queda libre. Con M20C, al cobrar; hasta entonces se cobra fuera.
  liberada_en        timestamptz,
  liberada_por       uuid         references estook.persona (id) on delete set null,
  -- Juntada con otra: sus platos pasaron a esa, y esta se liberó.
  unida_a            uuid         references estook.cuenta (id) on delete set null,
  anulada_en         timestamptz,
  anulada_por        uuid         references estook.persona (id) on delete set null,
  motivo_de_anular   text,
  version            integer      not null default 1,

  constraint cuenta_tipo_conocido check (tipo in ('mesa', 'barra', 'para_llevar', 'reparto')),
  constraint cuenta_mesa_si_es_mesa check ((tipo = 'mesa') = (mesa_id is not null)),
  constraint cuenta_nombre_corto check (nombre is null or char_length(btrim(nombre)) between 1 and 40),
  constraint cuenta_personas_en_rango check (personas is null or personas between 1 and 99),
  constraint cuenta_nota_corta check (nota_para_cocina is null or char_length(nota_para_cocina) <= 200),
  constraint cuenta_anulada_con_motivo check (
    (anulada_en is null) = (motivo_de_anular is null)
    and (motivo_de_anular is null or char_length(btrim(motivo_de_anular)) between 3 and 300)
  ),
  constraint cuenta_acaba_de_una_forma check (not (liberada_en is not null and anulada_en is not null))
);

comment on table estook.cuenta is
  'Una mesa abierta, la barra o un pedido para llevar (M20A, 0106): sus personas, su camarero y si va por pases. Se libera (con M20C, al cobrar) o se anula con motivo; nunca se borra.';
comment on column estook.cuenta.camarero_id is
  'De quién es la mesa ahora: quien la abrió o a quien se la pasaron. Lo que se venda es suyo (Anexo 3.4).';

create unique index cuenta_una_abierta_por_mesa
  on estook.cuenta (mesa_id)
  where mesa_id is not null and liberada_en is null and anulada_en is null;
create index cuenta_abiertas_por_local
  on estook.cuenta (local_id, abierta_en)
  where liberada_en is null and anulada_en is null;

create trigger cuenta_sube_version before update on estook.cuenta
  for each row execute function estook.subir_version();

-- ═══ Los pases ═════════════════════════════════════════════════════════════════
--
-- **Marcha la sala, nunca la cocina** (0106): la cocina no ve cuándo una mesa va
-- acabando el primero. La base lo vuelve a mirar abajo, en `el_pase_lo_marcha_la_sala`.

create table estook.pase (
  cuenta_id     uuid         not null references estook.cuenta (id) on delete cascade,
  numero        smallint     not null,
  local_id      uuid         not null references estook.local (id) on delete cascade,
  marchado_en   timestamptz,
  marchado_por  uuid         references estook.persona (id) on delete set null,
  -- Salió todo: al tachar el último plato o con «Todo fuera». «Recuperar» lo quita.
  fuera_en      timestamptz,
  primary key (cuenta_id, numero),
  constraint pase_numero_en_rango check (numero between 1 and 9),
  constraint pase_fuera_marchado check (fuera_en is null or marchado_en is not null)
);

comment on table estook.pase is
  'El 1.º, el 2.º… de una cuenta (0106): cuándo lo marchó la sala y cuándo salió todo. Un pase sin marchar se ve en cocina en espera.';

-- ═══ Los platos de la cuenta ═══════════════════════════════════════════════════

create table estook.linea_de_cuenta (
  -- Nace en el aparato: pedir dos veces lo mismo, desde el mismo toque, no pide dos.
  id                  uuid         primary key,
  cuenta_id           uuid         not null references estook.cuenta (id) on delete cascade,
  local_id            uuid         not null references estook.local (id) on delete cascade,
  plato_id            uuid         references estook.plato (id) on delete set null,
  menu_id             uuid         references estook.menu (id) on delete set null,
  -- El plato elegido dentro de un menú: «Lentejas» es parte de «Menú del día».
  parte_de            uuid         references estook.linea_de_cuenta (id) on delete cascade,
  -- Congelado al pedir: si mañana el plato cambia de nombre o de precio, esto no.
  nombre              text         not null,
  cantidad            integer      not null,
  -- La unidad, con IVA, como en la carta. El plato de un menú: su suplemento (o 0).
  precio_centimos     integer      not null,
  -- A dónde va: la cocina, la barra (bebidas, cafés, copas) o a ninguna parte (la línea
  -- del menú, que no se cocina: se cocinan sus platos).
  destino             text         not null default 'cocina',
  pase                smallint,
  nota                text,
  nota_cambiada_en    timestamptz,
  pedida_en           timestamptz  not null default now(),
  pedida_por          uuid         references estook.persona (id) on delete set null,
  mandada_en          timestamptz,
  mandada_por         uuid         references estook.persona (id) on delete set null,
  -- Lo tachó la cocina al sacarlo.
  salio_en            timestamptz,
  salio_por           uuid         references estook.persona (id) on delete set null,
  quitada_en          timestamptz,
  quitada_por         uuid         references estook.persona (id) on delete set null,
  motivo_de_quitar    text,
  -- Se devolvió y se rehace («VUELVE · más hecho»): vuelve a cocina, arriba del todo.
  vuelve_en           timestamptz,
  motivo_de_vuelve    text,
  version             integer      not null default 1,

  constraint linea_nombre_con_medida check (char_length(btrim(nombre)) between 1 and 120),
  constraint linea_cantidad_en_rango check (cantidad between 1 and 999),
  constraint linea_precio_valido check (precio_centimos between 0 and 100000000),
  constraint linea_destino_conocido check (destino in ('cocina', 'barra', 'ninguno')),
  constraint linea_pase_si_va_a_cocina check ((destino = 'cocina') = (pase is not null)),
  constraint linea_pase_en_rango check (pase is null or pase between 1 and 9),
  constraint linea_nota_corta check (nota is null or char_length(nota) <= 200),
  constraint linea_sale_si_se_mando check (salio_en is null or mandada_en is not null),
  constraint linea_quitada_con_quien check ((quitada_en is null) = (quitada_por is null)),
  constraint linea_quitada_con_motivo check (
    motivo_de_quitar is null or char_length(btrim(motivo_de_quitar)) between 3 and 300
  ),
  constraint linea_vuelve_con_motivo check (
    (vuelve_en is null) = (motivo_de_vuelve is null)
    and (motivo_de_vuelve is null or char_length(btrim(motivo_de_vuelve)) between 1 and 200)
  )
);

comment on table estook.linea_de_cuenta is
  'Cada plato de una cuenta (0106), con su precio congelado. Se le añaden líneas y nunca se reescriben: quitar lo mandado es una marca con quién y por qué. La cocina la tacha al sacarla.';

create index linea_por_cuenta on estook.linea_de_cuenta (cuenta_id, pedida_en);
create index linea_en_cocina on estook.linea_de_cuenta (local_id, mandada_en)
  where destino = 'cocina' and quitada_en is null;

create trigger linea_de_cuenta_sube_version before update on estook.linea_de_cuenta
  for each row execute function estook.subir_version();

-- ═══ Quién lee y quién escribe ═════════════════════════════════════════════════
--
-- La sala y la cocina leen las cuentas de su local. La cocina **no recibe un importe**:
-- eso lo cumple la API, que no lo pide (Anexo 3.2); aquí se decide quién toca qué.

alter table estook.cuenta enable row level security;
alter table estook.pase enable row level security;
alter table estook.linea_de_cuenta enable row level security;

create function estook.lleva_el_servicio(p_local uuid)
returns boolean
language sql
stable
as $$
  select estook.puede_ver('accion.tomar_nota', p_local) or estook.puede_ver('accion.cocinar', p_local)
$$;

comment on function estook.lleva_el_servicio(uuid) is
  'Si quien pregunta toma nota o cocina en ese local (0106): es quien ve sus mesas.';

create policy cuenta_lectura on estook.cuenta
  for select using (estook.lleva_el_servicio(local_id));
create policy cuenta_alta on estook.cuenta
  for insert with check (
    estook.puede_editar('accion.tomar_nota', local_id)
    and (mesa_id is null or exists (
      select 1 from estook.mesa m where m.id = mesa_id and m.local_id = cuenta.local_id
    ))
  );
-- La cocina la toca para «Recuperar»; lo demás, la sala.
create policy cuenta_cambio on estook.cuenta
  for update using (
    estook.puede_editar('accion.tomar_nota', local_id) or estook.puede_editar('accion.cocinar', local_id)
  )
  with check (
    (estook.puede_editar('accion.tomar_nota', local_id) or estook.puede_editar('accion.cocinar', local_id))
    and (mesa_id is null or exists (
      select 1 from estook.mesa m where m.id = mesa_id and m.local_id = cuenta.local_id
    ))
  );

create policy pase_lectura on estook.pase
  for select using (estook.lleva_el_servicio(local_id));
create policy pase_alta on estook.pase
  for insert with check (
    estook.puede_editar('accion.tomar_nota', local_id)
    and exists (select 1 from estook.cuenta c where c.id = cuenta_id and c.local_id = pase.local_id)
  );
create policy pase_cambio on estook.pase
  for update using (
    estook.puede_editar('accion.tomar_nota', local_id) or estook.puede_editar('accion.cocinar', local_id)
  );

create policy linea_de_cuenta_lectura on estook.linea_de_cuenta
  for select using (estook.lleva_el_servicio(local_id));
create policy linea_de_cuenta_alta on estook.linea_de_cuenta
  for insert with check (
    estook.puede_editar('accion.tomar_nota', local_id)
    and exists (select 1 from estook.cuenta c where c.id = cuenta_id and c.local_id = linea_de_cuenta.local_id)
  );
create policy linea_de_cuenta_cambio on estook.linea_de_cuenta
  for update using (
    estook.puede_editar('accion.tomar_nota', local_id) or estook.puede_editar('accion.cocinar', local_id)
  )
  with check (
    exists (select 1 from estook.cuenta c where c.id = cuenta_id and c.local_id = linea_de_cuenta.local_id)
  );
-- Antes de mandar, quitar es libre y se borra; lo mandado no se borra nunca.
create policy linea_de_cuenta_sin_mandar on estook.linea_de_cuenta
  for delete using (estook.puede_editar('accion.tomar_nota', local_id) and mandada_en is null);

grant select, insert, update on estook.cuenta to estook_api;
grant select, insert, update on estook.pase to estook_api;
grant select, insert, update, delete on estook.linea_de_cuenta to estook_api;

-- ═══ Lo que la base no deja, aunque alguien se salte la API ═══════════════════════
--
-- La segunda capa (lección 26). Solo mira cuando hay una persona en la conexión: una
-- migración o el dueño de la base no tienen persona, y no son quienes sirven mesas.

create function estook.el_pase_lo_marcha_la_sala()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
begin
  if estook.persona_actual() is not null
     and new.marchado_en is distinct from old.marchado_en
     and not estook.puede_editar('accion.tomar_nota', new.local_id) then
    raise exception 'sin_permiso: marchar es de la sala, nunca de la cocina'
      using errcode = '42501';
  end if;
  if old.marchado_en is not null and new.marchado_en is null then
    raise exception 'pase_marchado: un pase marchado no se desmarcha'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pase_lo_marcha_la_sala before update on estook.pase
  for each row execute function estook.el_pase_lo_marcha_la_sala();

create function estook.lo_mandado_no_se_reescribe()
returns trigger
language plpgsql
set search_path = estook, public, pg_catalog, pg_temp
as $$
declare
  v_persona uuid := estook.persona_actual();
begin
  -- Lo quitado se queda como se quitó.
  if old.quitada_en is not null
     and (new.quitada_en, new.quitada_por, new.motivo_de_quitar, new.salio_en, new.nota, new.cantidad)
         is distinct from
         (old.quitada_en, old.quitada_por, old.motivo_de_quitar, old.salio_en, old.nota, old.cantidad) then
    raise exception 'linea_quitada: un plato quitado ya no se cambia'
      using errcode = 'P0001';
  end if;

  if old.mandada_en is not null then
    -- Lo que es, cuántos, a qué precio y a dónde va no cambia una vez en cocina.
    if (new.plato_id, new.menu_id, new.parte_de, new.nombre, new.cantidad, new.precio_centimos,
        new.destino, new.mandada_en)
       is distinct from
       (old.plato_id, old.menu_id, old.parte_de, old.nombre, old.cantidad, old.precio_centimos,
        old.destino, old.mandada_en) then
      raise exception 'linea_mandada: lo que ya está en cocina no se reescribe; se quita con motivo y se pide otra vez'
        using errcode = 'P0001';
    end if;
    -- Quitar lo que está en cocina pide motivo y el permiso de quitarlo.
    if old.quitada_en is null and new.quitada_en is not null then
      if new.motivo_de_quitar is null then
        raise exception 'falta_motivo: quitar lo que ya está en cocina pide un motivo'
          using errcode = 'P0001';
      end if;
      if v_persona is not null and not estook.puede_editar('accion.quitar_de_cocina', new.local_id) then
        raise exception 'sin_permiso: quitar lo que ya está en cocina lo aprueba un jefe'
          using errcode = '42501';
      end if;
    end if;
  elsif new.mandada_en is null
        and (new.salio_en is not null or new.vuelve_en is not null) then
    raise exception 'linea_sin_mandar: no se tacha lo que no ha llegado a cocina'
      using errcode = 'P0001';
  end if;

  -- Tachar y destachar es de la cocina. La sala solo lo destacha al devolverlo («VUELVE»).
  if v_persona is not null
     and new.salio_en is distinct from old.salio_en
     and not estook.puede_editar('accion.cocinar', new.local_id)
     and not (
       new.salio_en is null
       and new.vuelve_en is distinct from old.vuelve_en
       and estook.puede_editar('accion.tomar_nota', new.local_id)
     ) then
    raise exception 'sin_permiso: tachar lo que sale es de la cocina'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger linea_de_cuenta_lo_mandado before update on estook.linea_de_cuenta
  for each row execute function estook.lo_mandado_no_se_reescribe();

-- ═══ A quién se avisa al segundo ═══════════════════════════════════════════════
--
-- Lo que cambia una mesa se avisa a quien lleva el servicio en ese local: la sala y la
-- cocina. Solo sus ids, que no salen del servidor, y solo de un local que quien
-- pregunta ve (como `quien_trabaja_ahora`, 0078).

create function estook.quien_lleva_el_servicio(p_local uuid)
returns setof uuid
language sql
stable
security definer
set search_path = estook, public, pg_catalog, pg_temp
as $$
  select distinct m.persona_id
    from estook.membresia m
    join estook.local l on l.id = p_local and l.organizacion_id = m.organizacion_id
   where (m.hasta is null or m.hasta >= current_date)
     and (estook.es_el_sistema() or p_local in (select local_id from estook.locales_visibles()))
     and (estook.nivel_de_permiso(m.persona_id, p_local, 'accion.tomar_nota') <> 'sin_acceso'
          or estook.nivel_de_permiso(m.persona_id, p_local, 'accion.cocinar') <> 'sin_acceso');
$$;

comment on function estook.quien_lleva_el_servicio(uuid) is
  'Quién toma nota o cocina en un local que quien pregunta ve: solo sus ids, para avisarles al segundo de lo que cambia una mesa (0106).';

revoke all on function estook.quien_lleva_el_servicio(uuid) from public;
grant execute on function estook.quien_lleva_el_servicio(uuid) to estook_api;
