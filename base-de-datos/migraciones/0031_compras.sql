-- 0031 · Proveedores y compras (M7)
--
-- «`BORRADOR → ENVIADO → RECIBIDO`. La sugerencia por bajo mínimo respeta el
--  calendario de reparto y avisa si el pedido no llega al mínimo del proveedor.
--  Al recibir, lo primero que pregunta es "¿entero o con cambios?": entero son
--  dos toques. Y algo que casi ningún programa hace: la factura del proveedor se
--  concilia con sus albaranes, con las diferencias señaladas. **El albarán mueve
--  stock; la factura confirma el precio**» (Manifiesto 12).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- Lo que hay que entender antes de leer una sola tabla
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── 1 · Tres papeles, tres tablas, y cada uno hace una sola cosa ────────────
--
--   PEDIDO    lo que se pide. No mueve nada: es una intención.
--   ALBARÁN   lo que llega. **Es lo único que mueve género**, y lo mueve por
--             `apuntar`, con el mismo candado por producto que todo lo demás.
--   FACTURA   lo que se cobra. **No mueve género**: confirma el precio y se
--             concilia con los albaranes que cubre.
--
-- Mezclar dos de estos en una tabla es el error de casi todos los programas de
-- compras: el pedido que «se convierte» en albarán pierde lo que se pidió, y ya
-- no se puede decir qué faltó. Aquí el pedido se queda como estaba y el albarán
-- guarda, línea a línea, contra qué línea del pedido llegó.
--
-- ── 2 · La devolución es un albarán al revés, y el abono una factura al revés ─
--
-- No son cuatro circuitos: son dos, con signo. Una devolución es género que sale
-- hacia el proveedor con su papel; un abono es el papel del proveedor que lo
-- descuenta. Así **una sola conciliación** sirve para todo: una factura puede
-- cubrir entregas y restar devoluciones, y un abono cubre devoluciones. Cuatro
-- tablas para lo mismo serían cuatro sitios donde la suma sale distinta.
--
-- ── 3 · Los importes de compra van SIN impuestos ────────────────────────────
--
-- Un restaurante se deduce el IVA que paga al comprar, así que lo que le cuesta
-- el género es la base, no el total. Es también lo que dice la ficha de M9:
-- «margen sobre base sin impuestos». La factura guarda las dos cifras del papel
-- —base y total— y concilia con la base, que es lo que suman los albaranes.
--
-- ── 4 · Lo cerrado no se edita ──────────────────────────────────────────────
--
-- «Desde recibido no se vuelve atrás: se corrige con un ajuste o con un abono»
-- (Auditoría, parte 4). Un pedido recibido o cancelado, un albarán y una factura
-- conciliada **no admiten cambios**, y no porque la pantalla no enseñe el botón:
-- lo impiden unos guardianes en la base. Lo único que se le puede hacer a un
-- albarán es decir con qué factura se pagó.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · El proveedor, entero
-- ═══════════════════════════════════════════════════════════════════════════
--
-- M6 dejó «la ficha más corta que sostiene sus tres promesas»: nombre y notas.
-- Aquí se completa con lo que el Manifiesto pide —«CIF, teléfono, correo, web,
-- días de reparto, pedido mínimo, forma de pago y notas»— y con tres cosas que un
-- hostelero sabe de memoria de cada proveedor y que decide todo lo demás:
--
--   · **A quién se le pide**, que casi nunca es la centralita: es el comercial,
--     y el pedido va a su WhatsApp.
--   · **Hasta qué hora se puede pedir**: «si me lo dices antes de las ocho, te lo
--     llevo mañana». Sin esto, la sugerencia no sabe si hoy todavía se llega.
--   · **Los portes**: «pedido mínimo 150 €, o 12 € de portes». Es la mitad de la
--     decisión de si se pide hoy o se espera al martes.

create type estook.forma_de_pago as enum (
  'contado',
  'transferencia',
  'domiciliacion',
  'tarjeta',
  'pagare',
  'confirming',
  'otra'
);

comment on type estook.forma_de_pago is
  'Como se le paga al proveedor. Se enseña en su ficha y propone el vencimiento de la factura.';

create type estook.canal_de_pedido as enum (
  'whatsapp',
  'correo',
  'telefono',
  'web',       -- la tienda en línea del propio proveedor
  'comercial', -- pasa el comercial y se le dicta
  'impreso'    -- en papel o en PDF, en mano
);

comment on type estook.canal_de_pedido is
  'Por donde se le pide a un proveedor, y por donde salio cada pedido. Estook no manda el pedido por su cuenta: abre WhatsApp o el correo de quien lo pide.';

alter table estook.proveedor
  add column if not exists cif                     text,
  add column if not exists contacto                text,
  add column if not exists telefono                text,
  add column if not exists whatsapp                text,
  add column if not exists correo                  text,
  add column if not exists web                     text,
  add column if not exists como_se_pide            estook.canal_de_pedido,
  -- Los días de la semana en que reparte, del 1 (lunes) al 7 (domingo), como
  -- `isodow` de Postgres. Un array y no siete columnas: se pregunta «¿reparte el
  -- martes?» y se contesta con `2 = any(dias_de_reparto)`.
  add column if not exists dias_de_reparto         smallint[]  not null default '{}',
  -- Cuántos días pasan entre pedir y recibir. Uno es «hoy para mañana».
  add column if not exists plazo_de_entrega        smallint    not null default 1,
  -- Hasta qué hora del día de pedir cuenta como pedido de ese día. Nulo: a
  -- cualquier hora.
  add column if not exists hora_limite             time,
  add column if not exists pedido_minimo_centimos  bigint,
  add column if not exists portes_centimos         bigint,
  add column if not exists forma_de_pago           estook.forma_de_pago,
  add column if not exists dias_de_pago            smallint;

alter table estook.proveedor
  add constraint proveedor_dias_de_reparto_de_la_semana
    check (dias_de_reparto <@ '{1,2,3,4,5,6,7}'::smallint[]),
  add constraint proveedor_plazo_con_sentido
    check (plazo_de_entrega between 0 and 30),
  add constraint proveedor_minimo_no_negativo
    check (pedido_minimo_centimos is null or pedido_minimo_centimos >= 0),
  add constraint proveedor_portes_no_negativos
    check (portes_centimos is null or portes_centimos >= 0),
  add constraint proveedor_dias_de_pago_con_sentido
    check (dias_de_pago is null or dias_de_pago between 0 and 365),
  add constraint proveedor_correo_con_forma
    check (correo is null or correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

comment on column estook.proveedor.dias_de_reparto is
  'Dias de la semana en que reparte, del 1 (lunes) al 7 (domingo). De aqui salen la sugerencia de pedido y las entregas del Calendario.';
comment on column estook.proveedor.plazo_de_entrega is
  'Dias entre pedir y recibir. Con la hora limite, dice si hoy todavia se llega al proximo reparto.';
comment on column estook.proveedor.whatsapp is
  'El movil al que se le manda el pedido, casi siempre el del comercial. Si no hay, se usa el telefono.';

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Quién manda un pedido
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Un permiso nuevo, y por qué no basta con Inventario ─────────────────────
--
-- Un cocinero lleva Inventario entera: apunta lo que entra, lo que sale y lo que
-- se tira. Y en la mayoría de cocinas **es quien sabe lo que falta**. Pero mandar
-- un pedido compromete dinero del local, y la Auditoría ya separó una vez lo que
-- hace quien compra de lo que hace quien cuenta (hallazgo 5, «cerrar recuento»).
--
-- Así que se separa lo mismo aquí, en las dos direcciones que tienen sentido:
--
--   · **Preparar el borrador y recibir lo que llega** es de Inventario, y lo
--     hace el cocinero. «Falta aceite» deja de ser un grito por la cocina: es un
--     borrador que el jefe ve y manda.
--   · **Mandarlo, o cancelar uno ya mandado**, es de este permiso: jefe de
--     cocina, gerente, área, dirección y compras central.
--
-- Como toda acción, se puede dar local a local con un recorte: el gerente de un
-- bar donde el cocinero pide solo se lo concede y ya está.

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.enviar_pedidos', 'Enviar pedidos a proveedores', 'accion', 'local',
   'Mandar un pedido o cancelar uno ya mandado. Prepararlo y recibir lo que llega es de quien lleva Inventario');

insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_cocina',  'accion.enviar_pedidos', 'ver_y_editar'),
  ('gerente',         'accion.enviar_pedidos', 'ver_y_editar'),
  ('area_manager',    'accion.enviar_pedidos', 'ver_y_editar'),
  ('direccion',       'accion.enviar_pedidos', 'ver_y_editar'),
  ('compras_central', 'accion.enviar_pedidos', 'ver_y_editar');

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El pedido
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La máquina de estado es la de la Auditoría (parte 4), tal cual:
--
--   borrador → enviado → recibido | recibido con incidencias | cancelado
--
-- Con dos matices que salen de cómo se compra de verdad:
--
--   · **Se puede recibir un borrador.** El pedido se hizo por teléfono y nadie
--     pulsó «enviar»; cuando llega el camión, se recibe igual.
--   · **Se puede cancelar un borrador**, y es lo que se hace con uno que ya no
--     hace falta: nada se borra (principio 6).

create type estook.estado_de_pedido as enum (
  'borrador',
  'enviado',
  'recibido',
  'recibido_con_incidencias',
  'cancelado'
);

comment on type estook.estado_de_pedido is
  'borrador → enviado → recibido | recibido con incidencias | cancelado. Desde recibido o cancelado no se vuelve atras (Auditoria, parte 4).';

create table estook.pedido_de_compra (
  id            uuid  primary key default gen_random_uuid(),
  local_id      uuid  not null references estook.local (id) on delete cascade,
  -- `cascade` y no `restrict`: un proveedor no se borra nunca —se desactiva—, y
  -- el único caso en que desaparece es un proveedor de ejemplo. Con `restrict`,
  -- «Quitar los ejemplos» fallaría a medias, que es lo que le pasó a la 0023
  -- con los lotes.
  proveedor_id  uuid  not null references estook.proveedor (id) on delete cascade,

  -- «El pedido 23». Se habla de los pedidos por su número, así que lo tiene, y
  -- es del local: el pedido 1 de un bar no es el pedido 1 de otro.
  numero        integer  not null,
  estado        estook.estado_de_pedido  not null default 'borrador',

  -- Cuándo tiene que llegar. Es lo que publica la entrega en el Calendario.
  llega_el      date,
  -- Lo que se le dice al proveedor: «dejadlo por la puerta de atrás».
  notas         text,
  -- Si salió de la sugerencia o lo montó alguien a mano. Sirve para medir si la
  -- sugerencia se usa, que es la única forma de saber si sirve.
  origen        text  not null default 'a_mano',

  enviado_en         timestamptz,
  enviado_por        uuid  references estook.persona (id) on delete set null,
  enviado_por_canal  estook.canal_de_pedido,
  recibido_en        timestamptz,
  recibido_por       uuid  references estook.persona (id) on delete set null,
  cancelado_en       timestamptz,
  cancelado_por      uuid  references estook.persona (id) on delete set null,
  motivo_de_cancelacion text,

  creado_por      uuid  references estook.persona (id) on delete set null,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  version         integer      not null default 1,
  es_ejemplo      boolean      not null default false,

  constraint pedido_numero_por_local unique (local_id, numero),
  constraint pedido_numero_positivo check (numero > 0),
  constraint pedido_origen_conocido check (origen in ('a_mano', 'sugerencia')),
  -- «Toda transición registra quién, cuándo y desde dónde» (Auditoría, parte 4).
  constraint pedido_enviado_con_fecha check (estado <> 'enviado' or enviado_en is not null),
  constraint pedido_recibido_con_fecha check (
    estado not in ('recibido', 'recibido_con_incidencias') or recibido_en is not null
  ),
  constraint pedido_cancelado_con_motivo check (
    estado <> 'cancelado'
    or (cancelado_en is not null and motivo_de_cancelacion is not null
        and length(btrim(motivo_de_cancelacion)) > 0)
  )
);

comment on table estook.pedido_de_compra is
  'Lo que se le pide a un proveedor. No mueve genero: lo mueve el albaran. Uno por papel, numerado por local.';

create index pedido_por_local on estook.pedido_de_compra (local_id, estado, llega_el);
create index pedido_por_proveedor on estook.pedido_de_compra (proveedor_id, creado_en desc);

create trigger pedido_sube_version before update on estook.pedido_de_compra
  for each row execute function estook.subir_version();

-- ── Lo cerrado no se toca, y lo que compromete dinero lo decide quien puede ──
--
-- Dos guardias en una sola función, porque las dos miran la misma transición:
--
--   1. Un pedido recibido o cancelado **no cambia nunca**. Se corrige con un
--      ajuste o con un abono, que dejan su propio rastro.
--   2. **Pasar a enviado, o cancelar uno enviado, pide `accion.enviar_pedidos`.**
--      La API ya lo comprueba antes de ejecutar nada; esto es la segunda capa,
--      la que protege el dato aunque alguien se salte la primera («lo que protege
--      el dato y lo que lo enseña son dos capas», lección 26).
--
-- La segunda solo mira cuando hay una persona en la conexión: una migración o el
-- dueño de la base no tienen persona, y no son quienes mandan pedidos.

create or replace function estook.pedido_guardian()
returns trigger
language plpgsql
as $$
begin
  if old.estado in ('recibido', 'recibido_con_incidencias', 'cancelado') then
    raise exception 'Un pedido recibido o cancelado ya no se cambia. Se corrige con un ajuste o con un abono.'
      using errcode = '42501';
  end if;

  if estook.persona_actual() is not null
     and (
       (old.estado = 'borrador' and new.estado = 'enviado')
       or (old.estado = 'enviado' and new.estado = 'cancelado')
     )
     and not estook.puede_editar('accion.enviar_pedidos', new.local_id)
  then
    raise exception 'Mandar un pedido, o cancelar uno mandado, lo hace quien puede enviar pedidos.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger pedido_guardado before update on estook.pedido_de_compra
  for each row execute function estook.pedido_guardian();

create table estook.linea_de_pedido (
  id           bigserial  primary key,
  pedido_id    uuid  not null references estook.pedido_de_compra (id) on delete cascade,
  producto_id  uuid  not null references estook.producto (id) on delete cascade,

  -- **En formatos**: cajas, garrafas, sacos. Se pide como se compra, y la
  -- conversión a unidades de uso se hace al recibir, con el factor congelado de
  -- abajo (Auditoría, parte 7: «la conversión se hace al entrar y al salir»).
  cantidad     numeric(12, 3)  not null,
  formato      text,
  factor       numeric(12, 4)  not null,

  -- Lo que se espera pagar por formato, sin impuestos. Nulo: no se sabe todavía.
  -- Sale de lo pactado o del último precio de ese proveedor.
  precio_centimos  bigint,
  nota         text,
  orden        smallint  not null default 0,

  -- «¿Qué pasa si el mismo producto entra dos veces?» · «Se suman las cantidades
  -- y se avisa, **no se duplica la línea**» (Auditoría, parte 7).
  constraint linea_de_pedido_un_producto unique (pedido_id, producto_id),
  constraint linea_de_pedido_cantidad_positiva check (cantidad > 0),
  constraint linea_de_pedido_factor_positivo check (factor > 0),
  constraint linea_de_pedido_precio_no_negativo check (precio_centimos is null or precio_centimos >= 0)
);

comment on table estook.linea_de_pedido is
  'Que se pide y cuanto, en formatos. El factor se congela al pedir: si el producto cambia de caja mañana, este pedido sigue siendo de la caja de hoy.';

create index linea_de_pedido_por_pedido on estook.linea_de_pedido (pedido_id, orden, id);

-- Las líneas de un pedido cerrado no se añaden ni se cambian. **El borrado no se
-- guarda aquí, y es a propósito**: un disparador que impidiera borrar haría fallar
-- «Quitar los ejemplos» al llegar a un producto de ejemplo que estuviera pedido.
-- Borrar lo cierra la política de abajo, que las cascadas no miran.
create or replace function estook.linea_de_pedido_guardian()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from estook.pedido_de_compra p
     where p.id = new.pedido_id
       and p.estado not in ('borrador', 'enviado')
  ) then
    raise exception 'Ese pedido ya está cerrado: sus líneas no se cambian.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger linea_de_pedido_guardada
  before insert or update on estook.linea_de_pedido
  for each row execute function estook.linea_de_pedido_guardian();

-- ═══════════════════════════════════════════════════════════════════════════
-- D · El albarán: lo que llega, y lo que se devuelve
-- ═══════════════════════════════════════════════════════════════════════════

create type estook.tipo_de_albaran as enum ('entrega', 'devolucion');

comment on type estook.tipo_de_albaran is
  'Entrega: genero que entra. Devolucion: genero que vuelve al proveedor. Las dos con su papel, y la factura las cuenta con signo.';

create type estook.incidencia_de_recepcion as enum (
  'falta',      -- ha venido menos de lo pedido, o nada
  'sobra',      -- ha venido más
  'rechazado',  -- ha venido y no se acepta: en mal estado, roto, caducado
  'precio',     -- cobrado distinto de lo esperado
  'no_pedido'   -- ha venido algo que no estaba en el pedido
);

comment on type estook.incidencia_de_recepcion is
  'Lo que no cuadro al recibir. Se guarda por linea: la puntualidad y las incidencias de la ficha del proveedor salen de aqui.';

create table estook.albaran (
  id            uuid  primary key default gen_random_uuid(),
  local_id      uuid  not null references estook.local (id) on delete cascade,
  proveedor_id  uuid  not null references estook.proveedor (id) on delete cascade,
  -- Nulo: llegó sin pedido, que es lo que pasa con el de la fruta todas las
  -- mañanas. `cascade` por la misma razón que arriba: solo desaparece un pedido
  -- si desaparece su proveedor de ejemplo, y entonces sus albaranes se van con él.
  pedido_id     uuid  references estook.pedido_de_compra (id) on delete cascade,
  tipo          estook.tipo_de_albaran  not null default 'entrega',

  -- El número del papel del proveedor. **Texto y no número**: hay proveedores que
  -- los escriben con letras («A-2231»), y era una decisión escrita en el Plan (A2).
  numero        text,
  -- La jornada en la que llegó, que decide el servidor (regla 10).
  fecha         date  not null,
  con_incidencias  boolean  not null default false,
  notas         text,

  -- La factura que lo cubre. Es lo único que se le puede cambiar a un albarán.
  factura_id    uuid,

  recibido_por  uuid  references estook.persona (id) on delete set null,
  recibido_en   timestamptz  not null default now(),
  es_ejemplo    boolean      not null default false,

  constraint albaran_numero_no_vacio check (numero is null or length(btrim(numero)) > 0)
);

comment on table estook.albaran is
  'Lo que llega o lo que se devuelve, con su papel. Es lo unico que mueve genero en compras, y no se edita: solo se le dice con que factura se pago.';

create index albaran_por_local on estook.albaran (local_id, fecha desc);
create index albaran_por_proveedor on estook.albaran (proveedor_id, fecha desc);
create index albaran_sin_factura on estook.albaran (proveedor_id, fecha) where factura_id is null;
create index albaran_por_pedido on estook.albaran (pedido_id) where pedido_id is not null;

create table estook.linea_de_albaran (
  id           bigserial  primary key,
  albaran_id   uuid  not null references estook.albaran (id) on delete cascade,
  producto_id  uuid  not null references estook.producto (id) on delete cascade,
  -- Contra qué línea del pedido llegó, para poder decir qué faltó.
  linea_de_pedido_id  bigint  references estook.linea_de_pedido (id) on delete cascade,

  -- Lo contado en formatos, si se contó así. Nulo en el peso variable: «se pide
  -- en piezas y entra en kilos reales» (Manifiesto 29).
  formatos     numeric(12, 3),
  -- **Lo que mueve el libro**, en la unidad de uso del producto. Cero cuando no
  -- ha entrado nada —lo que faltó o lo que se rechazó en la puerta—, y entonces
  -- la línea está para decir la incidencia, no para mover género.
  cantidad     numeric(14, 4)  not null,

  -- Lo que cobra esta línea, sin impuestos. **Nulo es un albarán sin valorar**,
  -- que es como llegan muchos: el precio lo pone la factura.
  importe_centimos  bigint,
  -- Lo que costó cada unidad de uso. Lo calcula el dominio y aquí solo se guarda.
  coste_milesimas   bigint,
  -- Lo que dice la factura de esta misma línea, cuando no coincide o cuando el
  -- albarán vino sin valorar. «La factura confirma el precio» (hallazgo 8).
  importe_facturado_centimos  bigint,

  incidencias  estook.incidencia_de_recepcion[]  not null default '{}',
  nota         text,

  lote_id        uuid    references estook.lote (id) on delete cascade,
  -- La línea del libro que movió, si movió algo.
  movimiento_id  bigint  references estook.movimiento_de_stock (id) on delete cascade,

  constraint linea_de_albaran_cantidad_no_negativa check (cantidad >= 0),
  -- Una línea que no mueve nada solo existe para contar por qué.
  constraint linea_de_albaran_cero_con_motivo check (cantidad > 0 or cardinality(incidencias) > 0),
  constraint linea_de_albaran_importes_no_negativos check (
    (importe_centimos is null or importe_centimos >= 0)
    and (importe_facturado_centimos is null or importe_facturado_centimos >= 0)
    and (coste_milesimas is null or coste_milesimas >= 0)
  ),
  constraint linea_de_albaran_formatos_positivos check (formatos is null or formatos >= 0)
);

comment on table estook.linea_de_albaran is
  'Que ha llegado de verdad, a cuanto, y que no cuadro. La cantidad va en unidad de uso porque es lo que entra en el libro.';

create index linea_de_albaran_por_albaran on estook.linea_de_albaran (albaran_id, id);
create index linea_de_albaran_por_producto on estook.linea_de_albaran (producto_id);

-- ── Un albarán no se edita: solo se concilia ─────────────────────────────────
--
-- «Ningún estado final se puede editar: se corrige creando algo nuevo que lo
-- enmiende» (Auditoría, parte 4). Un albarán es un papel que firmó alguien en la
-- puerta; si llegó mal, se devuelve o se abona, pero lo que se firmó no cambia.
--
-- Lo único que se le puede tocar es **con qué factura se pagó**, y una vez dicho,
-- no se le cambia por otra. Para la línea, lo único es lo que dice la factura.
--
-- Se comprueba copiando la fila nueva, devolviéndole lo que sí se puede cambiar y
-- comparándola con la vieja: si queda alguna diferencia, alguien ha tocado lo
-- que no debía. Así, una columna que se añada mañana queda protegida sin que
-- nadie se acuerde de venir aquí.

create or replace function estook.albaran_guardian()
returns trigger
language plpgsql
as $$
declare
  sin_lo_que_se_puede estook.albaran;
begin
  if old.factura_id is not null
     and new.factura_id is not null
     and new.factura_id <> old.factura_id then
    raise exception 'Ese albarán ya está en otra factura.'
      using errcode = '42501';
  end if;

  sin_lo_que_se_puede := new;
  sin_lo_que_se_puede.factura_id := old.factura_id;

  if sin_lo_que_se_puede is distinct from old then
    raise exception 'Un albarán no se cambia. Si llegó mal, se devuelve o se abona.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger albaran_guardado before update on estook.albaran
  for each row execute function estook.albaran_guardian();

create or replace function estook.linea_de_albaran_guardian()
returns trigger
language plpgsql
as $$
declare
  sin_lo_que_se_puede estook.linea_de_albaran;
begin
  sin_lo_que_se_puede := new;
  sin_lo_que_se_puede.importe_facturado_centimos := old.importe_facturado_centimos;

  if sin_lo_que_se_puede is distinct from old then
    raise exception 'Una línea de albarán no se cambia. Lo único que se le pone es lo que dice la factura.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger linea_de_albaran_guardada before update on estook.linea_de_albaran
  for each row execute function estook.linea_de_albaran_guardian();

-- ═══════════════════════════════════════════════════════════════════════════
-- E · La factura: lo que se cobra, y lo que se abona
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Qué es conciliar, dicho en una línea ────────────────────────────────────
--
-- Sumar los albaranes que la factura dice cubrir y compararlo con su base. Si
-- cuadra, conciliada; si no, **conciliada con la diferencia señalada**, que es
-- lo que pide el criterio de terminado de M7. No se bloquea: se dice, con la
-- cifra y con la nota de quien la vio. Es la misma regla del cierre de caja.

create type estook.tipo_de_factura as enum ('factura', 'abono');

create type estook.estado_de_factura as enum ('sin_conciliar', 'conciliada', 'con_diferencia');

comment on type estook.estado_de_factura is
  'Sin conciliar: registrada, sin albaranes. Conciliada: cuadra. Con diferencia: se concilio y no cuadra, con la diferencia guardada y dicha.';

create table estook.factura_de_compra (
  id            uuid  primary key default gen_random_uuid(),
  local_id      uuid  not null references estook.local (id) on delete cascade,
  proveedor_id  uuid  not null references estook.proveedor (id) on delete cascade,
  tipo          estook.tipo_de_factura  not null default 'factura',

  numero        text  not null,
  fecha         date  not null,
  vence_el      date,

  -- Las dos cifras del papel. Se concilia con la base, que es lo que suman los
  -- albaranes; el total se guarda porque es lo que se paga.
  base_centimos   bigint  not null,
  total_centimos  bigint,

  estado        estook.estado_de_factura  not null default 'sin_conciliar',
  -- La base menos lo que suman sus albaranes, con signo, al conciliar.
  diferencia_centimos  bigint,
  conciliada_en   timestamptz,
  conciliada_por  uuid  references estook.persona (id) on delete set null,

  notas         text,
  -- La foto o el PDF del papel, en el almacén. La lee Fogón en M11.
  fichero_clave text,

  registrada_por  uuid  references estook.persona (id) on delete set null,
  registrada_en   timestamptz  not null default now(),
  version         integer      not null default 1,
  es_ejemplo      boolean      not null default false,

  -- La misma factura dos veces es un error de tecleo, y sumaría dos veces lo que
  -- se ha pagado una.
  constraint factura_una_por_numero unique (proveedor_id, tipo, numero),
  constraint factura_numero_no_vacio check (length(btrim(numero)) > 0),
  constraint factura_importes_no_negativos check (
    base_centimos >= 0 and (total_centimos is null or total_centimos >= 0)
  ),
  constraint factura_vencimiento_coherente check (vence_el is null or vence_el >= fecha),
  constraint factura_conciliada_con_cifra check (
    estado = 'sin_conciliar'
    or (diferencia_centimos is not null and conciliada_en is not null)
  )
);

comment on table estook.factura_de_compra is
  'Lo que cobra el proveedor, sin mover genero. Se concilia con los albaranes que cubre; si no cuadra, la diferencia queda guardada y dicha.';

create index factura_por_local on estook.factura_de_compra (local_id, fecha desc);
create index factura_por_proveedor on estook.factura_de_compra (proveedor_id, fecha desc);

create trigger factura_sube_version before update on estook.factura_de_compra
  for each row execute function estook.subir_version();

-- Una factura conciliada es un estado final: no se edita.
create or replace function estook.factura_guardian()
returns trigger
language plpgsql
as $$
begin
  if old.estado <> 'sin_conciliar' then
    raise exception 'Una factura conciliada ya no se cambia. Si hay algo que corregir, es un abono.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger factura_guardada before update on estook.factura_de_compra
  for each row execute function estook.factura_guardian();

-- La clave ajena del albarán a su factura va aquí, porque la factura nace después.
-- `set null`: una factura solo desaparece si era de ejemplo, y el albarán real
-- que la llevara vuelve a quedarse sin factura, que es la verdad.
alter table estook.albaran
  add constraint albaran_factura
    foreign key (factura_id) references estook.factura_de_compra (id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════════
-- F · Lo pactado
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Contratos marco con precio de referencia, para comparar lo pactado con lo que
--  de verdad te cobran» (Manifiesto 12).
--
-- ── Por qué aquí va por local, y el contrato de toda la organización no ─────
--
-- Un contrato marco de cadena es un precio para **el mismo producto en todos los
-- locales**, y hoy cada local tiene su producto: el aceite de Bar Puerto y el de
-- Bar Faro son dos filas sin nada que las una. Lo que las une es el catálogo
-- maestro, y eso es M24 (Cadena), que es donde vive «la comparativa de precios de
-- compra frente al contrato marco». Hacerlo aquí sería inventarse ese vínculo.
--
-- Lo que sí tiene cada local desde hoy es **lo que pactó él**: «Makro me deja el
-- aceite a 42 € hasta diciembre». Y con eso ya se ve lo que importa: al recibir,
-- si te lo cobran más caro de lo pactado, se dice.

create table estook.precio_pactado (
  id            uuid  primary key default gen_random_uuid(),
  producto_id   uuid  not null references estook.producto (id) on delete cascade,
  proveedor_id  uuid  not null references estook.proveedor (id) on delete cascade,

  -- Por formato, sin impuestos, con el formato congelado igual que un precio.
  precio_centimos  bigint  not null,
  formato          text,
  factor           numeric(12, 4)        not null,
  unidad_de_uso    estook.unidad_de_uso  not null,
  rendimiento      numeric(6, 4)         not null,
  coste_milesimas  bigint  not null,

  desde   date  not null,
  -- Hasta cuándo vale lo pactado. Nulo: sin fecha.
  hasta   date,
  nota    text,
  -- Se deja de pactar, no se borra: lo pactado en marzo sigue explicando por qué
  -- en marzo se reclamó una factura.
  anulado_en  timestamptz,
  creado_por  uuid  references estook.persona (id) on delete set null,
  creado_en   timestamptz  not null default now(),

  constraint pactado_precio_no_negativo check (precio_centimos >= 0 and coste_milesimas >= 0),
  constraint pactado_factor_positivo check (factor > 0),
  constraint pactado_rendimiento_en_rango check (rendimiento > 0 and rendimiento <= 1),
  constraint pactado_vigencia_coherente check (hasta is null or hasta >= desde)
);

comment on table estook.precio_pactado is
  'Lo que un proveedor se ha comprometido a cobrar por un producto en este local. Se compara con lo que de verdad cobra al recibir.';

create unique index pactado_uno_vivo
  on estook.precio_pactado (producto_id, proveedor_id)
  where anulado_en is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- G · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Pedidos y albaranes son de Inventario: los ve quien ve el local con Inventario,
-- y los toca quien lo lleva. **Un cocinero los ve y no ve un solo importe**: eso
-- no lo hace una política —que decide filas, no columnas— sino las consultas, que
-- no mandan los campos de dinero a quien no tiene `dato.precio_de_compra`.
--
-- Facturas y precios pactados **son dinero enteros**, así que se cierran por
-- filas con el permiso de precios: un cocinero no ve ni que existen.

alter table estook.pedido_de_compra   enable row level security;
alter table estook.linea_de_pedido    enable row level security;
alter table estook.albaran            enable row level security;
alter table estook.linea_de_albaran   enable row level security;
alter table estook.factura_de_compra  enable row level security;
alter table estook.precio_pactado     enable row level security;

create policy pedido_lectura on estook.pedido_de_compra
  for select using (estook.puede_ver('app.inventario', local_id));

create policy pedido_alta on estook.pedido_de_compra
  for insert with check (estook.puede_editar('app.inventario', local_id));

create policy pedido_cambio on estook.pedido_de_compra
  for update using (estook.puede_editar('app.inventario', local_id))
  with check (estook.puede_editar('app.inventario', local_id));
-- Sin política de borrado: un pedido se cancela, no se borra.

create policy linea_de_pedido_lectura on estook.linea_de_pedido
  for select using (
    exists (
      select 1 from estook.pedido_de_compra p
       where p.id = pedido_id and estook.puede_ver('app.inventario', p.local_id)
    )
  );

create policy linea_de_pedido_escritura on estook.linea_de_pedido
  for insert with check (
    exists (
      select 1 from estook.pedido_de_compra p
       where p.id = pedido_id and estook.puede_editar('app.inventario', p.local_id)
    )
  );

create policy linea_de_pedido_cambio on estook.linea_de_pedido
  for update using (
    exists (
      select 1 from estook.pedido_de_compra p
       where p.id = pedido_id and estook.puede_editar('app.inventario', p.local_id)
    )
  );

-- Quitar una línea solo mientras el pedido está abierto. Va en la política y no
-- en el guardián a propósito: las cascadas de «Quitar los ejemplos» no miran
-- políticas, y un guardián las pararía.
create policy linea_de_pedido_quitar on estook.linea_de_pedido
  for delete using (
    exists (
      select 1 from estook.pedido_de_compra p
       where p.id = pedido_id
         and p.estado in ('borrador', 'enviado')
         and estook.puede_editar('app.inventario', p.local_id)
    )
  );

create policy albaran_lectura on estook.albaran
  for select using (estook.puede_ver('app.inventario', local_id));

create policy albaran_alta on estook.albaran
  for insert with check (estook.puede_editar('app.inventario', local_id));

-- Conciliar es ponerle la factura, y eso es cosa de quien ve precios.
create policy albaran_conciliar on estook.albaran
  for update using (
    estook.puede_editar('app.inventario', local_id)
    and estook.puede_editar('dato.precio_de_compra', local_id)
  );

create policy linea_de_albaran_lectura on estook.linea_de_albaran
  for select using (
    exists (
      select 1 from estook.albaran a
       where a.id = albaran_id and estook.puede_ver('app.inventario', a.local_id)
    )
  );

create policy linea_de_albaran_alta on estook.linea_de_albaran
  for insert with check (
    exists (
      select 1 from estook.albaran a
       where a.id = albaran_id and estook.puede_editar('app.inventario', a.local_id)
    )
  );

create policy linea_de_albaran_conciliar on estook.linea_de_albaran
  for update using (
    exists (
      select 1 from estook.albaran a
       where a.id = albaran_id
         and estook.puede_editar('dato.precio_de_compra', a.local_id)
    )
  );

create policy factura_lectura on estook.factura_de_compra
  for select using (estook.puede_ver('dato.precio_de_compra', local_id));

create policy factura_escritura on estook.factura_de_compra
  for insert with check (
    estook.puede_editar('dato.precio_de_compra', local_id)
    and estook.puede_editar('app.inventario', local_id)
  );

create policy factura_cambio on estook.factura_de_compra
  for update using (
    estook.puede_editar('dato.precio_de_compra', local_id)
    and estook.puede_editar('app.inventario', local_id)
  );

create policy pactado_lectura on estook.precio_pactado
  for select using (
    exists (
      select 1 from estook.producto p
       where p.id = producto_id and estook.puede_ver('dato.precio_de_compra', p.local_id)
    )
  );

create policy pactado_escritura on estook.precio_pactado
  for insert with check (
    exists (
      select 1 from estook.producto p
       where p.id = producto_id and estook.puede_editar('dato.precio_de_compra', p.local_id)
    )
  );

create policy pactado_cambio on estook.precio_pactado
  for update using (
    exists (
      select 1 from estook.producto p
       where p.id = producto_id and estook.puede_editar('dato.precio_de_compra', p.local_id)
    )
  );

revoke all on estook.pedido_de_compra  from public;
revoke all on estook.linea_de_pedido   from public;
revoke all on estook.albaran           from public;
revoke all on estook.linea_de_albaran  from public;
revoke all on estook.factura_de_compra from public;
revoke all on estook.precio_pactado    from public;

-- Sin `delete` en pedidos, albaranes, facturas ni pactados: **nada se borra**. Lo
-- que desaparece con un ejemplo se va por cascada, que no necesita el permiso.
grant select, insert, update         on estook.pedido_de_compra  to estook_api;
grant select, insert, update, delete on estook.linea_de_pedido   to estook_api;
grant select, insert, update         on estook.albaran           to estook_api;
grant select, insert, update         on estook.linea_de_albaran  to estook_api;
grant select, insert, update         on estook.factura_de_compra to estook_api;
grant select, insert, update         on estook.precio_pactado    to estook_api;
grant usage, select on sequence estook.linea_de_pedido_id_seq  to estook_api;
grant usage, select on sequence estook.linea_de_albaran_id_seq to estook_api;
