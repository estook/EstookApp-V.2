-- 0023 · Inventario
--
-- Modulo M6. «El corazon. Lo que la app sabe que hay y lo que no. Todas las
-- demas leen de aqui» (Manifiesto 12), y el principio 1: **Inventario es la
-- unica fuente de verdad del genero. La carta lee, no escribe.**
--
-- ══════════════════════════════════════════════════════════════════════════
-- Lo que hay que entender antes de leer una sola tabla
-- ══════════════════════════════════════════════════════════════════════════
--
-- ── 1 · Aqui NO se calcula nada ──────────────────────────────────────────────
--
-- No hay ni un disparador que sume stock, ni uno que pondere precios. Toda la
-- aritmetica del inventario vive en `packages/dominio/src/inventario.ts`, junto
-- al `precioMedioPonderado` que M2 escribio en `coste.ts`.
--
-- Es la regla 6 del Plan —«nunca se calcula lo mismo en dos sitios; un calculo,
-- una funcion, un unico dueno»— aplicada donde mas caro se paga: el dia que un
-- disparador de Postgres y el motor del dominio redondearan distinto, el valor
-- de la camara y el coste de los platos dejarian de cuadrar, y nadie sabria por
-- que. Esta base de datos guarda; quien suma es el dominio.
--
-- ── 2 · El stock no es una columna ──────────────────────────────────────────
--
-- Regla 8 del Plan, literal: «nunca se hace UPDATE stock SET cantidad = …. Se
-- inserta un movimiento». Aqui no existe ninguna tabla con una cantidad
-- editable. Lo que existe es `movimiento_de_stock`, que **solo se anade**, y
-- `existencias`, que es **una vista** sobre la ultima linea de cada producto.
--
-- Que sea una vista y no una tabla es a proposito y es la decision que mas
-- fallos evita: dos sitios donde vive la misma cifra son dos sitios que un dia
-- se separan. Asi «el stock se reconstruye entero desde los movimientos» —que es
-- un criterio de terminado de M6— no es algo que haya que comprobar de vez en
-- cuando: es que **no hay otra forma de saberlo**.
--
-- ── 3 · Cada linea del libro lleva el saldo de despues ───────────────────────
--
-- `cantidad_despues` y `coste_medio_despues` guardan como quedo la camara tras
-- ese movimiento. Es lo que hace la vista barata, y sobre todo lo que hace que
-- reconstruir sea comprobable: se replica el libro entero con el motor del
-- dominio y tiene que salir **exactamente** lo mismo que quedo apuntado, hasta
-- la ultima milesima. No es un segundo dueno del calculo: es el resultado
-- congelado del unico dueno, como el saldo de una libreta.

-- ═══════════════════════════════════════════════════════════════════════════
-- A · Proveedores · lo minimo, porque M7 es quien los desarrolla
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Por que estan aqui y no enteros en M7 ────────────────────────────────────
--
-- Porque M6 no puede cumplir lo suyo sin ellos. Su ficha en el Plan pide
-- «**historico de precio por proveedor**» dentro de su capa inteligente, el
-- Manifiesto describe el alta de un producto como «aceptas, pones tu precio y
-- **tu proveedor**», y la Auditoria (parte 3) da por hecho un desplegable de
-- «proveedores activos del local». Un precio que no sabe de quien viene no se
-- puede comparar con el de al lado, y comparar es donde esta el dinero facil.
--
-- Asi que aqui nace **la ficha mas corta que sostiene esas tres promesas**:
-- nombre y poco mas. Lo que M7 anade —CIF, telefono, dias de reparto, pedido
-- minimo, forma de pago, contratos marco— se anade con su migracion, ampliando
-- esta tabla. Ampliar es normal; rehacer, no (regla 2).

create table estook.proveedor (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  nombre          text         not null,
  -- «Nada se borra. Se desactiva, se archiva o se anula» (principio 6).
  activo          boolean      not null default true,
  notas           text,
  es_ejemplo      boolean      not null default false,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint proveedor_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

comment on table estook.proveedor is
  'La ficha minima que M6 necesita para poder decir de quien viene cada precio. M7 la amplia con dias de reparto, pedido minimo y contratos marco.';

-- Dos «Makro» en el mismo local son un error de tecleo, no dos proveedores. Se
-- compara sin acentos y en minusculas con la misma funcion que usa el buscador,
-- para que «Cárnicas Gómez» y «carnicas gomez» no acaben siendo dos fichas.
create unique index proveedor_uno_por_nombre
  on estook.proveedor (local_id, estook.sin_acentos(nombre));

create index proveedor_por_local on estook.proveedor (local_id, activo, nombre);

create index proveedor_buscable
  on estook.proveedor using gin (estook.sin_acentos(nombre) gin_trgm_ops);

create trigger proveedor_sube_version before update on estook.proveedor
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Las categorias del local
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Categoria de producto · Categorias del local, **sembradas por tipo de
--  local** · Alfabetico, con las usadas arriba · **Nunca vacio: vienen de
--  serie**» (Auditoria, parte 3).
--
-- Son del local y se pueden renombrar, anadir y desactivar: cada cocina llama a
-- las cosas como quiere, y obligar a usar las nuestras seria la primera pelea.

create table estook.categoria_de_producto (
  id              uuid         primary key default gen_random_uuid(),
  local_id        uuid         not null references estook.local (id) on delete cascade,
  nombre          text         not null,
  orden           smallint     not null default 0,
  activa          boolean      not null default true,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint categoria_de_producto_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

comment on table estook.categoria_de_producto is
  'Las categorias de genero de un local. Nacen sembradas segun el tipo de local y se pueden cambiar: cada cocina llama a las cosas como quiere.';

create unique index categoria_de_producto_una_por_nombre
  on estook.categoria_de_producto (local_id, estook.sin_acentos(nombre));

create index categoria_de_producto_por_local
  on estook.categoria_de_producto (local_id, activa, orden, nombre);

create trigger categoria_de_producto_sube_version before update on estook.categoria_de_producto
  for each row execute function estook.subir_version();

-- ── Las de serie, por tipo de local ──────────────────────────────────────────
--
-- Catalogo cerrado, exactamente igual que `objetivo_de_partida` de la 0020: se
-- cambia con una migracion y no lo escribe nadie desde la aplicacion.
--
-- Los nombres son **los mismos 22 que usa el catalogo de referencia** de la
-- 0021, y eso no es casualidad: al copiar un producto del catalogo, su categoria
-- ya existe en el local y no hay que inventarse ninguna ni dejarla sin poner.
--
-- Que trae cada tipo sale de lo que de verdad se guarda en cada sitio. Un
-- obrador no tiene barra, y una cafeteria no despieza pescado.

create table estook.categoria_de_partida (
  tipo    estook.tipo_de_local  not null,
  nombre  text                  not null,
  orden   smallint              not null,
  primary key (tipo, nombre)
);

comment on table estook.categoria_de_partida is
  'Que categorias trae de serie cada tipo de local. Catalogo cerrado, como los objetivos de partida: se cambia con una migracion.';

-- Las que lleva todo el mundo, tenga el local que tenga.
insert into estook.categoria_de_partida (tipo, nombre, orden)
select t.tipo, c.nombre, c.orden
  from unnest(enum_range(null::estook.tipo_de_local)) as t(tipo)
 cross join (values
   ('Aceites y grasas',        10),
   ('Especias y condimentos',  20),
   ('Salsas y vinagres',       30),
   ('Conservas',               40),
   ('Bebidas sin alcohol',     50),
   ('Café e infusiones',       60),
   ('Limpieza y desechables',  70)
 ) as c(nombre, orden);

-- Y lo que anade cada tipo sobre eso.
insert into estook.categoria_de_partida (tipo, nombre, orden)
select t.tipo, c.nombre, c.orden
  from unnest(array[
         'bar_de_tapas', 'restaurante_de_carta', 'cafeteria', 'food_truck', 'otro'
       ]::estook.tipo_de_local[]) as t(tipo)
 cross join (values
   ('Verduras y hortalizas', 110),
   ('Carnes',                120),
   ('Charcutería',           130),
   ('Lácteos',               140),
   ('Huevos',                150),
   ('Congelados',            160),
   ('Harinas y panadería',   170),
   ('Encurtidos y aceitunas',180)
 ) as c(nombre, orden);

-- Barra: quien sirve alcohol lo guarda, y quien no, no tiene por que verlo.
insert into estook.categoria_de_partida (tipo, nombre, orden)
select t.tipo, 'Bebidas con alcohol', 55
  from unnest(array[
         'bar_de_tapas', 'restaurante_de_carta', 'cafeteria', 'otro'
       ]::estook.tipo_de_local[]) as t(tipo);

-- Cocina de carta: pescado, arroces y legumbres, que un bar de tapas tambien
-- suele llevar.
insert into estook.categoria_de_partida (tipo, nombre, orden)
select t.tipo, c.nombre, c.orden
  from unnest(array[
         'bar_de_tapas', 'restaurante_de_carta', 'otro'
       ]::estook.tipo_de_local[]) as t(tipo)
 cross join (values
   ('Pescados y mariscos', 190),
   ('Arroces y pastas',    200),
   ('Legumbres',           210),
   ('Frutas',              220)
 ) as c(nombre, orden);

-- Obrador: harinas, azucares, lacteos, huevos y frutos secos. Nada de barra.
insert into estook.categoria_de_partida (tipo, nombre, orden) values
  ('obrador', 'Harinas y panadería',    110),
  ('obrador', 'Azúcares y repostería',  120),
  ('obrador', 'Lácteos',                130),
  ('obrador', 'Huevos',                 140),
  ('obrador', 'Frutos secos',           150),
  ('obrador', 'Frutas',                 160),
  ('obrador', 'Congelados',             170);

-- Cafeteria y food truck: reposteria y frutos secos, para las tostadas y los
-- postres.
insert into estook.categoria_de_partida (tipo, nombre, orden)
select t.tipo, c.nombre, c.orden
  from unnest(array['cafeteria', 'food_truck']::estook.tipo_de_local[]) as t(tipo)
 cross join (values
   ('Azúcares y repostería', 230),
   ('Frutas',                240)
 ) as c(nombre, orden);

-- ── Sembrarlas ───────────────────────────────────────────────────────────────
--
-- ── Por que esto es una funcion y no un disparador ──────────────────────────
--
-- Porque un disparador es una regla escondida: mira una tabla y hace cosas en
-- otra sin que se vea desde el codigo que lo provoca. La reaccion que llama a
-- esto vive en `servidor/eventos/reacciones.ts`, se lee al lado de los eventos y
-- dice en una linea que M6 escucha `local.creado`.
--
-- **Es idempotente a proposito.** Sembrar dos veces no duplica ni pisa nada:
-- solo anade las que faltan. Asi da igual cuantas veces se llame —al crear el
-- local, al responder el tipo, o desde una migracion que arregla lo de antes— y
-- nunca le devuelve a nadie una categoria que habia desactivado.
--
-- ── Y por que lleva `security definer`, que es una decision seria ────────────
--
-- Porque quien crea un local **no es quien va a trabajar en el**. Crear locales
-- es `accion.gestionar_locales`, que tiene el administrador de cuenta, y su
-- ficha dice literalmente «sin acceso a la operacion diaria»: no tiene
-- `app.inventario`. Sin privilegio, la politica de categorias le diria que no y
-- **el local nacería sin categorias**, o peor, la creacion entera fallaria.
--
-- El privilegio esta acotado a lo minimo, y por eso es aceptable:
--
--   · Comprueba que el local es visible para quien llama, igual que hace
--     `quitar_ejemplos`. De un local ajeno no siembra nada: levanta un 42501.
--   · Solo puede insertar **filas del catalogo cerrado** `categoria_de_partida`,
--     que no lo escribe nadie desde la aplicacion. No hay forma de colar por
--     aqui un dato que venga de fuera.
--
-- Queda contada en la prueba que tasa las funciones con privilegio. «Si un dia
-- son trece, que sea a proposito» (ESTADO.md).

create or replace function estook.sembrar_categorias(p_local uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  el_tipo   estook.tipo_de_local;
  sembradas integer;
begin
  -- Con privilegio hay que mirar a mano lo que las politicas mirarian solas. Se
  -- salta la comprobacion cuando no hay identidad declarada, que es el caso de
  -- la migracion: alli no hay nadie preguntando, se esta arreglando la base.
  if estook.persona_actual() is not null
     and not exists (
       select 1 from estook.locales_visibles() lv where lv.local_id = p_local
     ) then
    raise exception 'Ese local no es tuyo' using errcode = '42501';
  end if;

  select l.tipo into el_tipo from estook.local l where l.id = p_local;

  -- Sin tipo no se siembra nada, y no es un fallo: es que todavia no se ha
  -- respondido el paso 2 del alta. Cuando se responda, se llama otra vez.
  if el_tipo is null then
    return 0;
  end if;

  insert into estook.categoria_de_producto (local_id, nombre, orden)
  select p_local, cp.nombre, cp.orden
    from estook.categoria_de_partida cp
   where cp.tipo = el_tipo
     -- Ni las que ya estan, ni las que alguien renombro y quedaron parecidas:
     -- se compara sin acentos, como el indice unico.
     and not exists (
       select 1 from estook.categoria_de_producto c
        where c.local_id = p_local
          and estook.sin_acentos(c.nombre) = estook.sin_acentos(cp.nombre)
     );

  get diagnostics sembradas = row_count;
  return sembradas;
end;
$$;

comment on function estook.sembrar_categorias(uuid) is
  'Le pone a un local las categorias de serie de su tipo. Idempotente: no duplica, no pisa y no devuelve una que se hubiera desactivado.';

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El producto
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Cada producto guarda nombre, categoria, foto, unidad de compra ("caja 3 kg"),
--  unidad de uso (g/ml/ud), factor, rendimiento, peso variable, codigo de
--  barras, tipo impositivo, alergenos, minimo en camara y proveedor principal»
-- (Manifiesto 12).
--
-- ── Solo dos campos son obligatorios ────────────────────────────────────────
--
-- «**Solo dos campos obligatorios: nombre y cantidad**» (Manifiesto 12). El
-- nombre esta aqui; la cantidad es un movimiento, y ni siquiera hace falta para
-- que el producto exista. Todo lo demas tiene un valor por defecto que se puede
-- corregir despues, porque un formulario de catorce casillas en la puerta es la
-- forma mas segura de que nadie de de alta su segundo producto.
--
-- Cuando el factor o el rendimiento se dan por supuestos, el producto queda
-- **sin verificar**, que es lo que pide la Auditoria (1.2): «si faltan, se asume
-- factor 1 y rendimiento 1, y el producto queda marcado como sin verificar,
-- porque un rendimiento mal puesto es el error mas caro del sistema».

create table estook.producto (
  id            uuid  primary key default gen_random_uuid(),
  local_id      uuid  not null references estook.local (id) on delete cascade,
  categoria_id  uuid      null references estook.categoria_de_producto (id) on delete set null,
  nombre        text  not null,

  -- Como se compra, en palabras: «Garrafa de 5 l». Es lo que se lee en el
  -- albaran. Nulo mientras nadie lo diga.
  formato           text,
  -- Cuantas unidades de uso trae un formato de compra. 5 l = 5.000 ml.
  factor            numeric(12, 4)           not null default 1,
  unidad_de_uso     estook.unidad_de_uso     not null default 'ud',
  -- Lo que queda tras limpiar, pelar o descongelar. 1 = no se pierde nada.
  rendimiento       numeric(6, 4)            not null default 1,
  categoria_fiscal  estook.categoria_fiscal  not null default 'alimento',
  alergenos         text[]                   not null default '{}',

  -- «Pescado a peso variable: se pide en piezas y entra en kilos reales; el
  --  coste va por peso real» (Manifiesto 29). Aqui no cambia la aritmetica:
  --  cambia **lo que pregunta la pantalla**. Con esto puesto no se ofrece
  --  «¿cuantas cajas?», porque una caja de merluza no pesa lo mismo que otra;
  --  se pregunta cuanto ha venido de verdad.
  peso_variable     boolean                  not null default false,
  codigo_de_barras  text,

  -- El minimo que se quiere tener en camara. **A mano en M6**: calcularlo
  -- necesita saber que dias reparte el proveedor, y eso es M7 y M8 («el bajo
  -- minimo sabe que dia reparte tu proveedor», Manifiesto 28). Nulo = nadie lo
  -- ha dicho, y entonces el producto no sale ni en verde ni en rojo, sale sin
  -- minimo, que es la verdad.
  minimo            numeric(14, 4),

  proveedor_id      uuid  null references estook.proveedor (id) on delete set null,
  -- De donde se copio, si se copio. Sirve para saber que su factor y su
  -- rendimiento son una propuesta del catalogo y no una medida de esta cocina.
  producto_de_referencia_id uuid null references estook.producto_de_referencia (id) on delete set null,

  sin_verificar   boolean      not null default true,
  activo          boolean      not null default true,
  notas           text,
  es_ejemplo      boolean      not null default false,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),

  constraint producto_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint producto_factor_positivo check (factor > 0),
  constraint producto_rendimiento_en_rango check (rendimiento > 0 and rendimiento <= 1),
  constraint producto_minimo_no_negativo check (minimo is null or minimo >= 0),
  constraint producto_codigo_de_barras_con_forma check (
    codigo_de_barras is null or codigo_de_barras ~ '^[0-9A-Za-z-]{4,32}$'
  )
);

comment on table estook.producto is
  'El genero del local. La unica fuente de verdad: Escandallos lee de aqui y nunca escribe (principio 1).';
comment on column estook.producto.factor is
  'Unidades de uso por formato de compra. Es la mitad de «precio ÷ (factor × rendimiento)»; el precio del formato no costea nunca.';
comment on column estook.producto.sin_verificar is
  'El factor o el rendimiento vienen supuestos, no medidos por esta cocina. Un rendimiento mal puesto es el error mas caro del sistema (Auditoria 1.2).';
comment on column estook.producto.peso_variable is
  'Cambia lo que pregunta la pantalla al recibir: cuanto ha venido de verdad, no cuantas cajas. Una caja de merluza no pesa lo mismo que otra.';
comment on column estook.producto.minimo is
  'A mano en M6. Calcularlo necesita el calendario de reparto del proveedor, que es M7 y M8.';

-- Dos productos con el mismo nombre en el mismo local son un error de tecleo, y
-- ademas rompen el escandallo: nadie sabria cual de los dos lleva la ficha. Solo
-- entre los activos, para que desactivar uno libere su nombre.
create unique index producto_uno_por_nombre
  on estook.producto (local_id, estook.sin_acentos(nombre))
  where activo;

-- Un codigo de barras tiene que llevar a un producto y solo a uno, o escanear no
-- sirve de nada.
create unique index producto_un_codigo_de_barras
  on estook.producto (local_id, codigo_de_barras)
  where codigo_de_barras is not null and activo;

create index producto_por_local on estook.producto (local_id, activo, nombre);
create index producto_por_categoria on estook.producto (categoria_id) where activo;
create index producto_por_proveedor on estook.producto (proveedor_id) where activo;

create index producto_buscable
  on estook.producto using gin (estook.sin_acentos(nombre) gin_trgm_ops);

create trigger producto_sube_version before update on estook.producto
  for each row execute function estook.subir_version();

-- Los alergenos son catalogo cerrado, igual que en el catalogo de referencia de
-- la 0020: un codigo inventado tiene que rebotar aqui, no aparecer en la carta.
create trigger producto_alergenos_conocidos
  before insert or update on estook.producto
  for each row execute function estook.alergenos_conocidos();

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Los precios, con vigencia
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Si cambia: abre vigencia nueva, la anterior queda en el historico, y dispara
--  el recalculo de todo lo que cuelga» (Auditoria 1.2, PRECIO DE COMPRA).
--
-- ── Por que un precio vigente POR PROVEEDOR y no uno solo ───────────────────
--
-- Porque «la comparacion entre proveedores para lo mismo es donde aparece el
-- dinero facil» (Manifiesto 12), y para comparar hacen falta dos precios vivos a
-- la vez. Un solo vigente por producto haria imposible la unica pantalla que
-- justifica que M6 sepa de proveedores.
--
-- ── Y por que el formato se congela en cada precio ──────────────────────────
--
-- «El producto cambia de formato → precio nuevo con su formato; **se compara por
--  unidad de uso**» (Manifiesto 29). Si el precio solo guardara «60 €» y manana
-- el producto pasara de caja de 5 kg a caja de 3, el historico diria que ha
-- bajado cuando en realidad ha subido un 66 %. Cada precio guarda con que
-- formato, factor y rendimiento se pago, y por eso el coste por unidad de uso
-- del pasado sigue siendo verdad.

create type estook.origen_de_precio as enum (
  'a_mano',     -- alguien lo escribio
  'catalogo',   -- vino propuesto al copiar del catalogo de referencia
  'albaran',    -- M7 · lo movio la recepcion de un pedido
  'factura'     -- M7 · la factura confirma el precio, y manda sobre el albaran
);

comment on type estook.origen_de_precio is
  'De donde salio el precio. El albaran mueve stock; la factura confirma el precio y, si difiere, abre vigencia nueva (Auditoria, hallazgo 8).';

create table estook.precio_de_producto (
  id            uuid  primary key default gen_random_uuid(),
  producto_id   uuid  not null references estook.producto (id) on delete cascade,
  proveedor_id  uuid      null references estook.proveedor (id) on delete set null,

  -- Lo que cuesta **el formato**, en centimos enteros (regla 9). Nunca en euros
  -- con coma, y nunca el coste por unidad de uso: eso se deriva.
  precio_centimos  bigint  not null,

  -- El formato al que corresponde ese precio, congelado.
  formato        text,
  factor         numeric(12, 4)        not null,
  unidad_de_uso  estook.unidad_de_uso  not null,
  rendimiento    numeric(6, 4)         not null,

  -- `precio ÷ (factor × rendimiento)`, en milesimas de centimo. Lo calcula
  -- `costePorUnidadDeUso` del dominio y aqui solo se guarda: es lo que se
  -- compara entre proveedores y lo que consumen los escandallos, y recalcularlo
  -- en cada consulta lo pondria en manos de quien escriba la consulta.
  coste_milesimas  bigint  not null,

  desde   date  not null,
  -- Nulo = es el que vale hoy. Con fecha = quedo en el historico.
  hasta   date,
  origen  estook.origen_de_precio  not null default 'a_mano',
  -- De donde vino: numero de albaran, de factura, de importacion. Sin estructura
  -- todavia: la pone M7, que es quien tiene albaranes.
  referencia   jsonb,
  creado_por   uuid  references estook.persona (id) on delete set null,
  creado_en    timestamptz  not null default now(),

  constraint precio_no_negativo check (precio_centimos >= 0),
  constraint precio_coste_no_negativo check (coste_milesimas >= 0),
  constraint precio_factor_positivo check (factor > 0),
  constraint precio_rendimiento_en_rango check (rendimiento > 0 and rendimiento <= 1),
  constraint precio_vigencia_coherente check (hasta is null or hasta >= desde)
);

comment on table estook.precio_de_producto is
  'Lo que cuesta un producto a un proveedor, desde cuando. Con vigencia: cambiar el precio de hoy no reescribe lo que costo en enero.';
comment on column estook.precio_de_producto.coste_milesimas is
  'precio ÷ (factor × rendimiento), en milesimas de centimo. Lo calcula el dominio; aqui solo se guarda para poder comparar y ordenar.';

-- Un vigente por proveedor. Dos indices y no uno porque en Postgres los nulos
-- son distintos entre si, asi que un unico indice sobre (producto, proveedor)
-- dejaria colar varios precios vigentes sin proveedor.
create unique index precio_uno_vigente_por_proveedor
  on estook.precio_de_producto (producto_id, proveedor_id)
  where hasta is null and proveedor_id is not null;

create unique index precio_uno_vigente_sin_proveedor
  on estook.precio_de_producto (producto_id)
  where hasta is null and proveedor_id is null;

create index precio_por_producto
  on estook.precio_de_producto (producto_id, desde desc);

-- ── Cual es «el» precio de un producto ───────────────────────────────────────
--
-- Con varios proveedores vivos hay que elegir uno para enseñar en la lista y
-- para proponerlo al recibir genero. La regla vive **aqui y en un solo sitio**,
-- porque si cada consulta eligiera a su manera, la lista y la ficha del mismo
-- producto acabarian enseñando precios distintos:
--
--   1. El del proveedor principal, si lo tiene y tiene precio.
--   2. Si no, el ultimo que se puso.
--
-- No el mas barato, a proposito: lo que se enseña es lo que **te cuesta**, no lo
-- que te podria costar. Lo barato se ve en la comparativa, que es otra pantalla
-- y con otra pregunta.

create or replace function estook.precio_vigente(p_producto uuid)
returns estook.precio_de_producto
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select p.*
    from estook.precio_de_producto p
    join estook.producto pr on pr.id = p.producto_id
   where p.producto_id = p_producto
     and p.hasta is null
   order by
     case when pr.proveedor_id is not null and p.proveedor_id = pr.proveedor_id
          then 0 else 1 end,
     p.desde desc,
     p.creado_en desc
   limit 1
$$;

comment on function estook.precio_vigente(uuid) is
  'El precio que se enseña de un producto: el del proveedor principal, y si no, el ultimo puesto. Nunca el mas barato: se enseña lo que cuesta, no lo que podria costar.';

-- ═══════════════════════════════════════════════════════════════════════════
-- E · Lotes y caducidades
-- ═══════════════════════════════════════════════════════════════════════════
--
-- M6 los guarda y los enseña; **consumir por FEFO es M8** («al consumir, primero
-- lo que antes caduca», Auditoria hallazgo 2), porque consumir de verdad
-- necesita las fichas tecnicas, que son M9, y las ventas, que son M20.
--
-- Lo que si hace M6, y es lo que salva genero de la basura: enseñar en «Hoy» lo
-- que caduca esta semana.

create table estook.lote (
  id           uuid  primary key default gen_random_uuid(),
  local_id     uuid  not null references estook.local (id) on delete cascade,
  producto_id  uuid  not null references estook.producto (id) on delete cascade,
  -- El del albaran o el del envase. Nulo: no todo viene con lote impreso.
  codigo       text,
  caduca_el    date,
  recibido_el  date  not null,
  es_ejemplo   boolean      not null default false,
  creado_en    timestamptz  not null default now()
);

comment on table estook.lote is
  'Un lote de genero con su caducidad. M6 los apunta y avisa de lo que caduca; consumir primero lo que antes caduca es M8.';

create index lote_por_producto on estook.lote (producto_id, caduca_el);
create index lote_que_caduca on estook.lote (local_id, caduca_el) where caduca_el is not null;

-- ═══════════════════════════════════════════════════════════════════════════
-- F · El libro de movimientos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «**El stock es un libro de movimientos.** Los ajustes a mano tambien son
--  movimientos, con autor y motivo» (principio 5).
--
-- Solo se anade. Un movimiento equivocado **no se corrige: se enmienda** con
-- otro, igual que en la contabilidad de toda la vida, y por la misma razon: si
-- una linea se pudiera cambiar, el libro dejaria de ser una prueba de lo que
-- paso y pasaria a ser una opinion sobre lo que hay.

create type estook.tipo_de_movimiento as enum (
  'entrada',
  'salida',
  'ajuste',
  'merma',
  'consumo',
  'recuento'
);

comment on type estook.tipo_de_movimiento is
  'Catalogo cerrado, declarado entero de una vez. M6 produce entrada, salida y ajuste; merma y recuento son M8, y consumo lo produce M20 al explotar las fichas de lo vendido.';

create table estook.movimiento_de_stock (
  -- `bigserial` y no `uuid` a proposito: el orden del libro **es** el orden en
  -- que ocurrieron las cosas, y el precio medio ponderado depende de ese orden.
  -- Con un uuid al azar habria que fiarse de una marca de tiempo, y dos
  -- movimientos del mismo milisegundo se podrian reconstruir al reves.
  id           bigserial  primary key,
  local_id     uuid  not null references estook.local (id) on delete cascade,
  producto_id  uuid  not null references estook.producto (id) on delete cascade,
  tipo         estook.tipo_de_movimiento  not null,

  -- Siempre en la unidad de uso del producto (Auditoria, parte 7: «la conversion
  -- se hace al entrar y al salir, nunca por dentro»). Positiva entra, negativa
  -- sale, y nunca cero: un movimiento que no mueve nada es ruido.
  cantidad  numeric(14, 4)  not null,

  -- Lo que costo esta unidad, en milesimas. Solo en las entradas.
  coste_milesimas  bigint,

  -- ── El saldo de despues, congelado ─────────────────────────────────────────
  -- Es lo que hace barata la vista `existencias` y, sobre todo, lo que hace
  -- comprobable «el stock se reconstruye entero desde los movimientos»: se
  -- replica el libro con el motor del dominio y tiene que dar esto mismo.
  cantidad_despues     numeric(14, 4)  not null,
  coste_medio_despues  bigint          not null,

  -- ── `cascade` y no `set null`, y costo encontrarlo ──────────────────────
  --
  -- Con `on delete set null`, borrar un lote hace que Postgres lance un
  -- **`update`** sobre esta tabla para vaciar la columna. Y este libro no admite
  -- `update`: el guardian lo rechaza, con razon.
  --
  -- La consecuencia era que **«Quitar los ejemplos» fallaba** en cuanto un
  -- producto de mentira tuviera un lote, que es siempre que se apunte una
  -- caducidad. El boton se quedaba a medias sin decir nada. Lo encontro una
  -- prueba, no la pantalla.
  --
  -- Con `cascade` no hay `update` que valga: si desaparece el lote, desaparecen
  -- sus lineas. Y eso no abre ninguna puerta, porque **un lote no se borra
  -- solo**: no hay politica de borrado para los reales, igual que para los
  -- movimientos. Un lote solo desaparece cuando desaparece su producto, y
  -- entonces sus lineas se iban a ir de todas formas.
  lote_id  uuid  references estook.lote (id) on delete cascade,
  -- Obligatorio en los ajustes: un descuadre sin motivo no se puede investigar.
  motivo   text,
  -- La decide el servidor con la zona y la hora de corte del local (regla 10).
  fecha_operativa  date         not null,
  ocurrido_en      timestamptz  not null default now(),
  -- Aqui `set null` si, y con la misma consecuencia mirada del derecho: como el
  -- libro no admite `update`, esto hace que **una persona con movimientos
  -- apuntados no se pueda borrar**. Es exactamente lo que se quiere: «la persona
  -- no se borra: sigue en lo que firmo, en sus fichajes y en su historial»
  -- (Auditoria 2.11). Quien se va se retira, no se borra.
  persona_id       uuid  references estook.persona (id) on delete set null,
  correlacion_id   uuid,
  -- Como entro: 'a_mano', 'catalogo', 'ejemplo'. M7 anadira 'albaran'.
  origen      text,
  referencia  jsonb,
  es_ejemplo  boolean  not null default false,

  constraint movimiento_cantidad_no_nula check (cantidad <> 0),
  constraint movimiento_coste_no_negativo check (coste_milesimas is null or coste_milesimas >= 0),
  constraint movimiento_coste_medio_no_negativo check (coste_medio_despues >= 0),
  -- Un ajuste sin motivo no es un ajuste, es un descuadre sin explicar.
  constraint movimiento_ajuste_con_motivo check (
    tipo <> 'ajuste' or (motivo is not null and length(btrim(motivo)) > 0)
  )
);

comment on table estook.movimiento_de_stock is
  'El libro. Solo se anade: un movimiento equivocado se enmienda con otro, nunca se corrige. De aqui sale todo el stock de Estook.';
comment on column estook.movimiento_de_stock.cantidad_despues is
  'Como quedo la camara tras este movimiento. Es el resultado congelado del motor del dominio, no un segundo dueno del calculo.';

-- El indice del que cuelga la vista de existencias: la ultima linea de cada
-- producto, sin recorrer el libro entero.
create index movimiento_ultimo_por_producto
  on estook.movimiento_de_stock (producto_id, id desc);

create index movimiento_por_local
  on estook.movimiento_de_stock (local_id, fecha_operativa desc, id desc);

-- Para el consumo medio: las salidas de un producto en una ventana de fechas.
create index movimiento_salidas
  on estook.movimiento_de_stock (producto_id, fecha_operativa)
  where cantidad < 0;

-- ── Que solo se pueda anadir ─────────────────────────────────────────────────
--
-- Dos barreras, como la auditoria de M1. La primera son los permisos, que no se
-- pueden esquivar desde la aplicacion; la segunda es un guardian, que tampoco se
-- esquiva desde una migracion distraida.
--
-- ── Y por que aqui NO se prohibe borrar con un disparador ───────────────────
--
-- Porque la auditoria no borra **nunca**, y este libro si tiene un caso: los
-- datos de ejemplo. «Un solo boton, Quitar los ejemplos, los borra todos de
-- golpe» (Manifiesto 8), y si un disparador cerrara el borrado, ese boton
-- fallaria al llegar a los movimientos de un producto de mentira.
--
-- Asi que borrar se cierra con **politicas**, que saben distinguir: se puede
-- borrar una linea de ejemplo, y no se puede borrar ninguna de verdad. La
-- diferencia esta escrita abajo, en `movimiento_borrado`.

revoke all on estook.movimiento_de_stock from public;
revoke all on estook.movimiento_de_stock from estook_api;
grant select, insert, delete on estook.movimiento_de_stock to estook_api;
-- Deliberadamente NO se concede update. A nadie, en ningun caso.

create or replace function estook.movimiento_no_se_modifica()
returns trigger
language plpgsql
as $$
begin
  raise exception 'El libro de movimientos solo se anade. Un movimiento equivocado se enmienda con otro, con su motivo.'
    using errcode = '42501';
end;
$$;

create trigger movimiento_sin_modificar
  before update on estook.movimiento_de_stock
  for each statement execute function estook.movimiento_no_se_modifica();

-- ── Lo que hay hoy en camara ─────────────────────────────────────────────────
--
-- **Una vista, no una tabla.** Dos sitios donde vive la misma cifra son dos
-- sitios que un dia se separan, y el dia que se separen nadie sabra cual de los
-- dos tiene razon. Aqui el stock es, literalmente, la ultima linea del libro.
--
-- `security_invoker` es lo importante de este bloque: sin el, la vista se
-- ejecutaria con los permisos de su dueno y **se saltaria la seguridad por
-- filas**, que es exactamente la puerta de atras que M1 se preocupo de no dejar
-- abierta. Con el, las politicas de `movimiento_de_stock` aplican igual que si
-- se consultara la tabla a pelo.

create view estook.existencias
with (security_invoker = true)
as
  select distinct on (m.producto_id)
         m.producto_id,
         m.local_id,
         m.cantidad_despues       as cantidad,
         m.coste_medio_despues    as coste_milesimas,
         m.id                     as ultimo_movimiento_id,
         m.ocurrido_en            as ultimo_movimiento_en
    from estook.movimiento_de_stock m
   order by m.producto_id, m.id desc;

comment on view estook.existencias is
  'Lo que hay hoy en camara: la ultima linea del libro de cada producto. Es una vista y no una tabla para que no pueda discrepar del libro.';

grant select on estook.existencias to estook_api;

-- ═══════════════════════════════════════════════════════════════════════════
-- G · El buscador universal aprende genero
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «La funcion esta escrita para crecer por union: cada modulo anade su bloque, y
--  ni el buscador de la pantalla ni la consulta de la API cambian» (0017).
--
-- Esto es M6 anadiendo el suyo. Ojo con lo que **no** entra: el catalogo de
-- referencia. Ese buscador busca cosas tuyas, y meter trescientas referencias
-- que no estan en tu camara haria imposible encontrar la tuya.

-- **Se copia la funcion entera de la 0017 y se le anaden dos bloques.** No se
-- reescribe «parecida»: el umbral de 0,18, el tope de 50 y los cuatro bloques de
-- antes se quedan tal cual estaban, porque cada uno de esos numeros se eligio
-- probandolo y cambiarlos aqui seria cambiarlos a escondidas.
--
-- Y no es una advertencia teorica: al escribir esto se reescribio de memoria,
-- con el umbral en 0,3 y sin los bloques de organizaciones y areas. La prueba
-- del buscador lo cazo en el acto —«Ignaico» dejo de encontrar a «Ignacio»— y
-- por eso esta puesta.

create or replace function estook.buscar(p_texto text, p_limite int default 20)
returns table (
  tipo       text,
  id         uuid,
  titulo     text,
  subtitulo  text,
  local_id   uuid,
  parecido   real
)
language sql
stable
set search_path = estook, public, pg_catalog, pg_temp
as $$
  with busqueda as (
    select estook.sin_acentos(p_texto) as texto
  ),

  -- Locales. Se busca por nombre y por codigo: hay quien tiene el codigo mas a
  -- mano que el nombre.
  locales as (
    select
      'local'::text as tipo,
      l.id,
      l.nombre as titulo,
      coalesce(a.nombre || ' · ', '') || o.nombre as subtitulo,
      l.id as local_id,
      greatest(
        similarity(estook.sin_acentos(l.nombre), b.texto),
        similarity(estook.sin_acentos(l.codigo), b.texto)
      ) as parecido
    from estook.local l
    cross join busqueda b
    join estook.organizacion o on o.id = l.organizacion_id
    left join estook.area a on a.id = l.area_id
    where l.activo
      and l.id in (select local_id from estook.locales_visibles())
  ),

  -- Personas. Por nombre entero y por correo: al invitar a alguien se busca por
  -- correo, y al mirar un cuadrante, por nombre.
  personas as (
    select
      'persona'::text as tipo,
      p.id,
      p.nombre || coalesce(' ' || p.apellidos, '') as titulo,
      p.correo as subtitulo,
      null::uuid as local_id,
      greatest(
        similarity(
          estook.sin_acentos(p.nombre || ' ' || coalesce(p.apellidos, '')),
          b.texto
        ),
        similarity(estook.sin_acentos(p.correo), b.texto)
      ) as parecido
    from estook.persona p
    cross join busqueda b
    where p.activa
      and p.id in (select persona_id from estook.personas_visibles())
  ),

  organizaciones as (
    select
      'organizacion'::text as tipo,
      o.id,
      o.nombre as titulo,
      'Organizacion'::text as subtitulo,
      null::uuid as local_id,
      similarity(estook.sin_acentos(o.nombre), b.texto) as parecido
    from estook.organizacion o
    cross join busqueda b
    where o.id in (select organizacion_id from estook.organizaciones_visibles())
  ),

  areas as (
    select
      'area'::text as tipo,
      a.id,
      a.nombre as titulo,
      o.nombre as subtitulo,
      null::uuid as local_id,
      similarity(estook.sin_acentos(a.nombre), b.texto) as parecido
    from estook.area a
    cross join busqueda b
    join estook.organizacion o on o.id = a.organizacion_id
    where a.organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  ),

  -- ── M6 · el genero ─────────────────────────────────────────────────────────
  --
  -- Se busca por nombre y por codigo de barras: quien escanea uno espera llegar
  -- a su producto, no a una lista. Y los desactivados no salen, porque «ninguna
  -- lista ensena elementos desactivados, salvo en el historico» (Auditoria,
  -- parte 3).
  --
  -- Ojo con lo que **no** entra: el catalogo de referencia. Ese buscador busca
  -- cosas tuyas, y meter trescientas referencias que no estan en tu camara haria
  -- imposible encontrar la tuya.
  productos as (
    select
      'producto'::text as tipo,
      pr.id,
      pr.nombre as titulo,
      coalesce(c.nombre, pr.formato, 'Producto') as subtitulo,
      pr.local_id,
      greatest(
        similarity(estook.sin_acentos(pr.nombre), b.texto),
        similarity(estook.sin_acentos(coalesce(pr.codigo_de_barras, '')), b.texto)
      ) as parecido
    from estook.producto pr
    cross join busqueda b
    left join estook.categoria_de_producto c on c.id = pr.categoria_id
    where pr.activo
      and pr.local_id in (select local_id from estook.locales_visibles())
  ),

  proveedores as (
    select
      'proveedor'::text as tipo,
      pv.id,
      pv.nombre as titulo,
      'Proveedor'::text as subtitulo,
      pv.local_id,
      similarity(estook.sin_acentos(pv.nombre), b.texto) as parecido
    from estook.proveedor pv
    cross join busqueda b
    where pv.activo
      and pv.local_id in (select local_id from estook.locales_visibles())
  ),

  todo as (
    select * from locales
    union all select * from personas
    union all select * from organizaciones
    union all select * from areas
    union all select * from productos
    union all select * from proveedores
  )

  select t.tipo, t.id, t.titulo, t.subtitulo, t.local_id, t.parecido
  from todo t
  -- 0,18 deja pasar una errata o dos sin llenar la lista de ruido. Se eligio
  -- probandolo: con 0,3 «Migel» no encontraba a «Miguel».
  where t.parecido >= 0.18
  order by t.parecido desc, t.titulo
  limit least(greatest(p_limite, 1), 50)
$$;

comment on function estook.buscar(text, int) is
  'El buscador universal. Sin security definer: las politicas de M1 aplican igual que a cualquier consulta. Cada modulo anade su bloque por union.';

-- ═══════════════════════════════════════════════════════════════════════════
-- H · Seguridad por filas
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Un local jamas ve los datos de otro» (principio 8), y ademas: **quien no
-- puede ver precios de compra no recibe ni un campo de coste**. Esa segunda
-- parte se hace en las consultas con `recortar`, porque una politica de filas
-- decide filas y no columnas; lo de aqui es que un cocinero de otro local no vea
-- ni el nombre del producto.

alter table estook.proveedor              enable row level security;
alter table estook.categoria_de_producto  enable row level security;
alter table estook.categoria_de_partida   enable row level security;
alter table estook.producto               enable row level security;
alter table estook.precio_de_producto     enable row level security;
alter table estook.lote                   enable row level security;
alter table estook.movimiento_de_stock    enable row level security;

-- El catalogo de categorias de serie: lo lee todo el mundo, no lo escribe nadie.
-- Sin politica de escritura, igual que los objetivos de partida de la 0020: no
-- es que haga falta un permiso, es que no hay camino.
create policy categoria_de_partida_lectura on estook.categoria_de_partida
  for select using (true);

-- ── Proveedores, categorias y productos ──────────────────────────────────────
--
-- Se ven si se ve el local; se tocan con `app.inventario` en ver_y_editar, que
-- es lo que tienen el cocinero, el jefe de cocina, el gerente y compras central,
-- y lo que no tiene un camarero.

create policy proveedor_lectura on estook.proveedor
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy proveedor_escritura on estook.proveedor
  for all using (estook.puede_editar('app.inventario', local_id))
  with check (estook.puede_editar('app.inventario', local_id));

create policy categoria_de_producto_lectura on estook.categoria_de_producto
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy categoria_de_producto_escritura on estook.categoria_de_producto
  for all using (estook.puede_editar('app.inventario', local_id))
  with check (estook.puede_editar('app.inventario', local_id));

create policy producto_lectura on estook.producto
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy producto_escritura on estook.producto
  for all using (estook.puede_editar('app.inventario', local_id))
  with check (estook.puede_editar('app.inventario', local_id));

-- ── Precios · con su propio permiso, que es lo que separa a un cocinero ─────
--
-- «Un rol sin costes no recibe ni un campo de coste en ninguna respuesta»
-- (Auditoria, parte 8). Un cocinero tiene Inventario entera y **no tiene**
-- `dato.precio_de_compra`: apunta lo que entra y lo que sale, y no ve lo que
-- cuesta. Aqui se cierra por filas, y ademas las consultas recortan las columnas
-- derivadas —el coste por unidad de uso, el valor de la camara—, porque una
-- politica de filas no sabe de columnas.

create policy precio_lectura on estook.precio_de_producto
  for select using (
    exists (
      select 1 from estook.producto p
       where p.id = producto_id
         and estook.puede_ver('dato.precio_de_compra', p.local_id)
    )
  );

create policy precio_escritura on estook.precio_de_producto
  for all using (
    exists (
      select 1 from estook.producto p
       where p.id = producto_id
         and estook.puede_editar('dato.precio_de_compra', p.local_id)
    )
  )
  with check (
    exists (
      select 1 from estook.producto p
       where p.id = producto_id
         and estook.puede_editar('dato.precio_de_compra', p.local_id)
    )
  );

-- ── Lotes ────────────────────────────────────────────────────────────────────

create policy lote_lectura on estook.lote
  for select using (local_id in (select local_id from estook.locales_visibles()));

-- Se apunta y se corrige, **pero no se borra**: no hay politica de `delete`, y
-- eso es lo que hace verdad el `on delete cascade` de la linea del libro. Un
-- lote solo desaparece cuando desaparece su producto.
create policy lote_alta on estook.lote
  for insert with check (estook.puede_editar('app.inventario', local_id));

create policy lote_edicion on estook.lote
  for update using (estook.puede_editar('app.inventario', local_id))
  with check (estook.puede_editar('app.inventario', local_id));

-- ── El libro ─────────────────────────────────────────────────────────────────
--
-- Leer: quien ve el local. **No hace falta ver precios para ver el libro**: un
-- cocinero tiene que poder mirar cuanto genero entro ayer. Lo que no vera son
-- las columnas de coste, que las quitan las consultas.
--
-- Escribir: solo insertar, y con `app.inventario`. No hay politica de `update`
-- porque ademas se lo prohiben los permisos y un disparador: tres barreras para
-- la regla 8 del Plan.

create policy movimiento_lectura on estook.movimiento_de_stock
  for select using (local_id in (select local_id from estook.locales_visibles()));

create policy movimiento_apunte on estook.movimiento_de_stock
  for insert with check (estook.puede_editar('app.inventario', local_id));

-- Y el unico borrado que existe: el de una linea que nunca fue de verdad.
-- «Todo lleva una etiqueta gris ejemplo. Un solo boton los borra todos de
--  golpe» (Manifiesto 8). Una linea real no se borra ni con este permiso ni con
-- ninguno: se enmienda.
create policy movimiento_borrado on estook.movimiento_de_stock
  for delete using (es_ejemplo and estook.puede_editar('app.inventario', local_id));

comment on policy movimiento_borrado on estook.movimiento_de_stock is
  'Lo unico que sale del libro es lo que nunca fue de verdad. Un movimiento real se enmienda con otro, jamas se borra.';

-- Lo que nace despues hereda los permisos de la 0006, pero las secuencias nuevas
-- hay que concederlas: sin esto, `bigserial` falla al insertar como estook_api.
grant usage, select on all sequences in schema estook to estook_api;

-- Y las funciones nuevas: solo `estook_api`, nunca `public`. Una funcion con
-- privilegio que pueda ejecutar cualquiera es una puerta de atras abierta, y hay
-- una prueba de M4 que lo comprueba en todas.
do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.sembrar_categorias(uuid)',
    'estook.precio_vigente(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- I · Los locales que ya existen
-- ═══════════════════════════════════════════════════════════════════════════
--
-- **Y el orden importa, que es el fallo que cometio la 0020.** Primero se crea
-- todo lo de arriba, y solo al final se toca lo que ya hay. Una migracion
-- probada solo contra tablas vacias no esta probada: en la base de verdad hay
-- siete locales con su tipo puesto, y si se quedaran sin categorias, el primero
-- que entrara en Inventario encontraria un desplegable vacio con la promesa de
-- la Auditoria diciendo «nunca vacio: vienen de serie».
--
-- A los que todavia no han respondido el paso 2 no se les siembra nada, y no es
-- un olvido: no se sabe que tipo son. Se les siembra al responderlo, con la
-- reaccion que escucha ese evento.

do $$
declare
  el_local uuid;
begin
  for el_local in select id from estook.local where tipo is not null loop
    perform estook.sembrar_categorias(el_local);
  end loop;
end
$$;
