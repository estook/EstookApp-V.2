-- 0124 · R3 · 2 · 1 · La caja, segunda parte (decisión 0152; maqueta del 9-nov, corregida el 23-nov)
--
-- Lo de la caja que no toca el ticket:
--
--   · los ajustes nuevos: escribir el total al contar (E6), «Quédate el cambio» y repartir las
--     propinas (E5), y las dos cifras de los avisos: retirar (E2) y el descuadre al gerente (E3)
--   · la propina en efectivo, un movimiento más del cajón (`propina`), atado a su cobro: **no va en
--     el ticket** (Anexo 5.1), solo hace que el cajón cuadre
--   · entregar la caja a otro sin cerrarla (E7): la caja de quien la deja se cierra con su arqueo y
--     **sin cerrar el día**, y la de quien la recibe nace con lo contado
--   · el reparto de las propinas al cerrar, entre los que han fichado ese día
--   · el aviso del descuadre, un tipo más de la campana
--
-- **Lo que guarda la base, y no solo el código:** una propina siempre es de un cobro; una caja
-- recibida viene de una sola entregada; lo repartido solo se añade y cada persona sale una vez.

-- ═══ 1 · Los ajustes ═══════════════════════════════════════════════════════════

alter table estook.ajustes_del_tpv
  -- E6: además de billete a billete, escribir el total ya contado. Apagado de fábrica.
  add column contar_escribiendo  boolean  not null default false,
  -- E5: «Quédate el cambio» al cobrar en efectivo. Encendido: ayuda sin pedir nada.
  add column propina_al_cobrar   boolean  not null default true,
  -- E5: al cerrar, repartirlas a partes iguales entre los que han fichado. Apagado de fábrica.
  add column repartir_propinas   boolean  not null default false,
  -- E2: desde cuánto en el cajón sale «Retirar». 800 € de fábrica (maqueta del 9-nov).
  add column retirar_desde       integer  not null default 80000,
  -- E3: desde cuánto de diferencia le llega el aviso al gerente. 10 € de fábrica, la misma cifra
  -- que separa el ámbar del rojo.
  add column avisar_desde        integer  not null default 1000,
  add constraint ajustes_retirar_en_rango check (retirar_desde between 5000 and 10000000),
  add constraint ajustes_avisar_en_rango check (avisar_desde between 100 and 1000000);

comment on column estook.ajustes_del_tpv.contar_escribiendo is
  'E6 (0152): al abrir, al entregar y al cerrar, además de billete a billete, «Escribir el total». Sigue a ciegas.';
comment on column estook.ajustes_del_tpv.retirar_desde is
  'E2 (0152): con más que esto en el cajón, a quien lleva la caja le sale «Retirar». En céntimos.';
comment on column estook.ajustes_del_tpv.avisar_desde is
  'E3 (0152): una diferencia de más que esto, al cerrar o al entregar, avisa al gerente. En céntimos.';

-- ═══ 2 · La propina, un movimiento más del cajón ═══════════════════════════════

alter table estook.movimiento_de_caja
  -- La propina es de un cobro: lo que el cliente dejó del cambio.
  add column cobro_id uuid references estook.cobro (id) on delete restrict,
  drop constraint movimiento_tipo_conocido,
  add constraint movimiento_tipo_conocido check (
    tipo in ('cambio', 'sacar', 'meter', 'devolucion', 'propina')
  ),
  add constraint movimiento_propina_de_un_cobro check ((tipo = 'propina') = (cobro_id is not null));

-- Una propina por cobro.
create unique index movimiento_una_propina_por_cobro on estook.movimiento_de_caja (cobro_id)
  where cobro_id is not null;

comment on column estook.movimiento_de_caja.cobro_id is
  'La propina en efectivo (0152): el cobro del que salió. No va en el ticket: solo hace que el cajón cuadre (Anexo 5.1).';

-- La política de la 0116, entera, con la propina: la apunta quien cobra.
drop policy movimiento_alta on estook.movimiento_de_caja;
create policy movimiento_alta on estook.movimiento_de_caja
  for insert with check (
    (tipo in ('cambio', 'sacar', 'meter') and (
      estook.puede_editar('accion.abrir_el_cajon', local_id) or estook.puede_llevar_la_caja(local_id)
    ))
    or (tipo = 'devolucion' and estook.puede_editar('accion.devolver', local_id))
    or (tipo = 'propina' and estook.puede_editar('accion.cobrar', local_id))
    or estook.es_el_sistema()
  );

-- ═══ 3 · Entregar la caja, y lo que se congela al cerrar ═══════════════════════

alter table estook.turno_de_caja
  -- Las propinas del cajón al cerrar: suman en lo que debería haber, porque están dentro.
  add column propinas     integer,
  -- E7: a quién se entregó. Con ella, este cierre es un cambio de turno y no cierra el día.
  add column entregada_a  uuid  references estook.persona (id) on delete restrict,
  -- E7: la caja que se entregó y de la que nace esta. Una entregada, una recibida.
  add column recibida_de  uuid  unique references estook.turno_de_caja (id) on delete restrict,
  add constraint turno_entregada_si_cerrada check (entregada_a is null or cerrada_en is not null),
  add constraint turno_propinas_en_rango check (propinas is null or propinas between 0 and 10000000);

comment on column estook.turno_de_caja.entregada_a is
  'E7 (0152): la caja se entregó a esta persona sin cerrar el día. Su arqueo es este cierre; la de quien la recibe nace con lo contado (recibida_de).';
comment on column estook.turno_de_caja.recibida_de is
  'E7 (0152): la caja entregada de la que nace esta, con lo que se contó al entregarla como fondo.';

-- ═══ 4 · El reparto de las propinas ════════════════════════════════════════════

create table estook.reparto_de_propinas (
  id             uuid         primary key default gen_random_uuid(),
  -- La caja que se cerró: las propinas son las suyas y las de las cajas que se le entregaron.
  turno_id       uuid         not null references estook.turno_de_caja (id) on delete restrict,
  local_id       uuid         not null references estook.local (id) on delete cascade,
  persona_id     uuid         not null references estook.persona (id) on delete restrict,
  importe        integer      not null,
  repartido_por  uuid         not null references estook.persona (id) on delete restrict,
  en             timestamptz  not null,

  constraint reparto_importe_en_rango check (importe between 0 and 10000000),
  -- Cada uno sale una vez en el reparto de una caja.
  constraint reparto_una_vez_cada_uno unique (turno_id, persona_id)
);

comment on table estook.reparto_de_propinas is
  'E5 (0152): cómo se repartieron las propinas en efectivo de una caja al cerrarla, a partes iguales entre los que habían fichado. Estook no da el dinero: lo apunta para el Z. Solo se añade.';

create index reparto_por_local on estook.reparto_de_propinas (local_id, en desc);

create trigger reparto_de_propinas_solo_se_anade before update or delete on estook.reparto_de_propinas
  for each row execute function estook.la_caja_solo_se_anade();
create trigger reparto_de_propinas_no_se_vacia before truncate on estook.reparto_de_propinas
  for each statement execute function estook.la_caja_solo_se_anade();

alter table estook.reparto_de_propinas enable row level security;
revoke all on estook.reparto_de_propinas from public;
grant select, insert on estook.reparto_de_propinas to estook_api;

create policy reparto_lectura on estook.reparto_de_propinas
  for select using (estook.ve_la_caja(local_id));
create policy reparto_alta on estook.reparto_de_propinas
  for insert with check (estook.puede_llevar_la_caja(local_id) or estook.es_el_sistema());

-- **Quién ha fichado ese día**, para repartir: el nombre y el puesto, nada más. La camarera que cierra
-- no ve los fichajes de los demás (0027), y no tiene por qué: esto le dice solo a quién le toca.
create function estook.fichados_del_dia(p_local uuid, p_fecha date)
returns table (persona_id uuid, nombre text, rol text)
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select f.persona_id, p.nombre,
         (select m.rol from estook.membresia m
           where m.persona_id = f.persona_id and m.local_id = p_local
             and (m.hasta is null or m.hasta >= p_fecha)
           order by m.desde desc limit 1)
    from estook.fichaje f join estook.persona p on p.id = f.persona_id
   where f.local_id = p_local and f.fecha_operativa = p_fecha
     and estook.ve_la_caja(p_local)
   group by f.persona_id, p.nombre
   order by min(f.entro_en)
$$;

comment on function estook.fichados_del_dia(uuid, date) is
  'E5 (0152): quién ha fichado ese día en el local, con su nombre y su rol, para repartir las propinas. Solo a quien ve la caja.';

revoke all on function estook.fichados_del_dia(uuid, date) from public;
grant execute on function estook.fichados_del_dia(uuid, date) to estook_api;

-- ═══ 5 · El aviso del descuadre, a la campana ══════════════════════════════════

alter table estook.aviso drop constraint aviso_tipo_conocido;
alter table estook.aviso add constraint aviso_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision',
  'documento.rechazado',
  'caja.descuadre'
));
alter table estook.preferencia_de_aviso drop constraint preferencia_tipo_conocido;
alter table estook.preferencia_de_aviso add constraint preferencia_tipo_conocido check (tipo in (
  'pedido.empezado', 'pedido.mandado', 'pedido.invitacion', 'pedido.listo',
  'albaran.incidencias', 'merma.grande', 'precio.subida', 'carta.publicada', 'tablon.nota',
  'pedido.toca', 'almacen.bajo_minimo', 'informe.dia', 'informe.semana', 'informe.mes',
  'google.nota',
  'fichaje.corregido',
  'horario.publicado', 'horario.cambiado',
  'turno.entras', 'lote.caduca', 'pedido.no_llega', 'fichaje.sin_apuntar',
  'chat.confirmar',
  'inventario.toca', 'inventario.contado', 'inventario.recontar',
  'inventario.falta',
  'plato.raya',
  'fogon.revision',
  'documento.rechazado',
  'caja.descuadre'
));
