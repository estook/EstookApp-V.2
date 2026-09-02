-- 0020 · El alta del local
--
-- Modulo M5. La 0018 dejo dos columnas esperando —`onboarding_paso` y
-- `onboarding_terminado`— y un comentario que decia «lo mueve M5». Esto es M5.
--
-- ── Que trae ─────────────────────────────────────────────────────────────────
--
--   A  la ficha del local: que clase de local es, donde esta, a que hora corta
--      su jornada y con que marca se pinta
--   B  los objetivos, que son el dato mas silencioso y mas influyente del
--      sistema (Auditoria 1.2), con su vigencia y con los de partida por tipo
--   C  el alta en si: por que paso va, que se salto y cuando termino
--   D  los catorce alergenos oficiales
--   E  el catalogo de referencia: productos y recetas que **se consultan**, no
--      que se tienen
--   F  las importaciones, con su huella para que importar dos veces no cambie
--      nada
--   G  el registro de datos de ejemplo, y el boton que los quita todos
--   H  el aparato desde el que se entra, que hasta hoy no lo escribia nadie
--
-- ── Lo que NO hay aqui, y es a proposito ─────────────────────────────────────
--
-- **No hay `estook.producto`.** El catalogo de referencia es una cosa y el
-- inventario de un local es otra, y confundirlas seria el error que E4 avisa:
-- dos listas parecidas con nombres parecidos acaban mezcladas. El producto de
-- verdad —con su libro de movimientos, sus precios con vigencia, sus lotes y su
-- stock minimo calculado— es M6 entero, y nace alli de una pieza. Aqui esta el
-- diccionario del que M6 copiara.
--
-- Esta razonado en `docs/decisiones/0012`.
--
-- **Tampoco hay nada de Google Places.** Se aplaza a M23, que es donde viven las
-- resenas y la competencia y donde hay que enlazar la ficha de Google de todas
-- formas. En el alta, la direccion y el telefono se escriben a mano
-- (`docs/decisiones/0013`).

-- ═══════════════════════════════════════════════════════════════════════════
-- A · La ficha del local
-- ═══════════════════════════════════════════════════════════════════════════

-- «¿Que tipo de local tienes?» es la segunda pregunta del alta, y no es una
-- etiqueta: decide los objetivos de partida, y decidira las categorias de
-- producto (M6), la plantilla de APPCC (M16) y que apps vienen encendidas (M25).
create type estook.tipo_de_local as enum (
  'bar_de_tapas',
  'restaurante_de_carta',
  'cafeteria',
  'obrador',
  'food_truck',
  'otro'
);

comment on type estook.tipo_de_local is
  'La segunda pregunta del alta. Decide los objetivos de partida, y mas adelante las categorias, el APPCC y que apps vienen encendidas.';

alter table estook.local
  -- Nulo hasta que se responde el paso 2. Un local a medias es un local a
  -- medias, y no se le inventa un tipo.
  add column tipo            estook.tipo_de_local,
  add column direccion       text,
  add column codigo_postal   text,
  add column poblacion       text,
  add column provincia       text,
  add column telefono        text,
  -- «Un bar cierra a las tres de la manana. Una venta de las 02:30 del sabado
  --  pertenece a la jornada del viernes» (motor de tiempo, M2). El motor ya
  --  sabia calcularlo; lo que faltaba era donde guardar la hora de cada local.
  add column hora_de_corte   time not null default '05:00',
  -- La marca. El color se aplica a la app y a todos los documentos.
  add column color_de_marca  text,
  -- La **clave** del objeto en el almacen, no la imagen ni una direccion. Una
  -- direccion caduca —los enlaces van firmados— y guardarla seria guardar algo
  -- que manana no sirve.
  add column logo_clave      text,
  add column logo_puesto_en  timestamptz;

comment on column estook.local.hora_de_corte is
  'A que hora corta la jornada operativa. Con la zona horaria, es lo que el motor de tiempo necesita para decidir a que dia pertenece una venta de madrugada.';
comment on column estook.local.color_de_marca is
  'El color del local, en hexadecimal. Se aplica a la cabecera y a los documentos. Nulo = el naranja de Estook.';
comment on column estook.local.logo_clave is
  'La clave del objeto en el almacen de ficheros. Nunca una direccion: los enlaces del almacen van firmados y caducan.';

alter table estook.local
  add constraint local_color_con_forma check (
    color_de_marca is null or color_de_marca ~ '^#[0-9a-f]{6}$'
  ),
  add constraint local_codigo_postal_con_forma check (
    codigo_postal is null or codigo_postal ~ '^[0-9]{5}$'
  ),
  -- Laxo a proposito: hay fijos, moviles, prefijos y espacios, y rechazar un
  -- telefono valido en el alta es mucho peor que aceptar uno raro.
  add constraint local_telefono_con_forma check (
    telefono is null or telefono ~ '^[0-9+ ()-]{7,24}$'
  ),
  add constraint local_logo_coherente check (
    (logo_clave is null and logo_puesto_en is null)
    or (logo_clave is not null and logo_puesto_en is not null)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- B · Los objetivos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Son los que ponen en verde o en rojo los semaforos de toda la aplicacion, y
--  los que usa Fogon para decir si algo esta bien o mal» (Manifiesto 9).
--
-- Y de la Auditoria (1.2): «**Este es el dato mas silencioso y mas influyente
-- del sistema.** Un objetivo mal puesto tiñe de rojo o de verde una aplicacion
-- entera. Por eso se revisa en el alta y se recuerda una vez al trimestre.»
--
-- Por eso tienen vigencia. Cambiar un objetivo en marzo **no puede** repintar
-- de rojo los informes de enero: los de enero se juzgan con el objetivo que
-- estaba puesto en enero. Es la misma regla que las reglas fiscales.

create type estook.clave_de_objetivo as enum ('materia_prima', 'personal', 'margen');

comment on type estook.clave_de_objetivo is
  'Los tres del Manifiesto. El margen por familia llega con M6, que es donde nacen las familias.';

create table estook.objetivo (
  id              uuid                       primary key default gen_random_uuid(),
  local_id        uuid                       not null references estook.local (id) on delete restrict,
  clave           estook.clave_de_objetivo   not null,
  -- Fraccion con cuatro decimales, igual que el tipo de una regla fiscal:
  -- 0,2800 es el 28 %. Nunca un porcentaje escrito como 28.
  valor           numeric(6, 4)              not null,
  desde           date                       not null default current_date,
  hasta           date,
  -- «Si faltan: se usan los del tipo de local y **se dice que son los de
  --  partida**» (Auditoria 1.2). Se dice porque esta escrito aqui.
  de_partida      boolean                    not null default false,
  version         integer                    not null default 1,
  creado_en       timestamptz                not null default now(),
  actualizado_en  timestamptz                not null default now(),
  constraint objetivo_en_rango check (valor >= 0 and valor <= 1),
  constraint objetivo_vigencia_coherente check (hasta is null or hasta >= desde)
);

comment on table estook.objetivo is
  'Materia prima, personal y margen. Con vigencia: cambiar el objetivo hoy no repinta los informes de enero.';
comment on column estook.objetivo.valor is
  'Fraccion, no porcentaje: 0,2800 es el 28 %. Cuatro decimales, como todos los porcentajes de Estook.';

-- Uno vigente por clave y por local. Cambiar un objetivo es cerrar el de ayer y
-- abrir el de hoy, no editar el que hay.
create unique index objetivo_uno_vigente_por_clave
  on estook.objetivo (local_id, clave) where hasta is null;

create index objetivo_por_local on estook.objetivo (local_id, clave, desde);

create trigger objetivo_actualizado before update on estook.objetivo
  for each row execute function estook.marcar_actualizado();

create trigger objetivo_sube_version before update on estook.objetivo
  for each row execute function estook.subir_version();

-- Los de partida, por tipo de local. Catalogo cerrado, como el de permisos: se
-- cambia con una migracion y no lo escribe nadie desde la aplicacion.
create table estook.objetivo_de_partida (
  tipo   estook.tipo_de_local      not null,
  clave  estook.clave_de_objetivo  not null,
  valor  numeric(6, 4)             not null,
  primary key (tipo, clave),
  constraint objetivo_de_partida_en_rango check (valor >= 0 and valor <= 1)
);

comment on table estook.objetivo_de_partida is
  'Lo que se le propone a un local segun su tipo. Un obrador y un bar de tapas no tienen el mismo food cost razonable.';

-- Las cifras salen de los rangos habituales del sector en Espana, y son un
-- **punto de partida que se revisa en el alta**, no una verdad. Por eso el alta
-- los enseña con su casilla para cambiarlos y no los da por buenos en silencio.
insert into estook.objetivo_de_partida (tipo, clave, valor) values
  ('bar_de_tapas',         'materia_prima', 0.3000),
  ('bar_de_tapas',         'personal',      0.3000),
  ('bar_de_tapas',         'margen',        0.7000),
  ('restaurante_de_carta', 'materia_prima', 0.3200),
  ('restaurante_de_carta', 'personal',      0.3200),
  ('restaurante_de_carta', 'margen',        0.6800),
  ('cafeteria',            'materia_prima', 0.2500),
  ('cafeteria',            'personal',      0.3000),
  ('cafeteria',            'margen',        0.7500),
  ('obrador',              'materia_prima', 0.3500),
  ('obrador',              'personal',      0.2500),
  ('obrador',              'margen',        0.6500),
  ('food_truck',           'materia_prima', 0.3000),
  ('food_truck',           'personal',      0.2200),
  ('food_truck',           'margen',        0.7000),
  ('otro',                 'materia_prima', 0.3000),
  ('otro',                 'personal',      0.3000),
  ('otro',                 'margen',        0.7000);

-- ═══════════════════════════════════════════════════════════════════════════
-- C · El alta, paso a paso
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La 0018 puso `onboarding_paso` (0 a 8) y `onboarding_terminado`. Falta saber
-- **que se salto** —«con la opcion de saltar cualquier cosa» (Manifiesto 8)— y
-- cuando se termino, que es lo que permite decir «llevas X sin completar esto».

alter table estook.local
  add column onboarding_terminado_en timestamptz,
  -- Los codigos de los pasos que se saltaron. La lista de codigos vive en
  -- `@estook/dominio`, que es quien la usa para pintar; aqui solo se guardan.
  add column onboarding_saltados text[] not null default '{}';

comment on column estook.local.onboarding_saltados is
  'Los pasos que se saltaron, por su codigo. Sirven para la barra de progreso y para poder volver a ofrecerlos, nunca para bloquear.';

alter table estook.local
  add constraint local_onboarding_terminado_coherente check (
    onboarding_terminado = (onboarding_terminado_en is not null)
  );

-- Los que ya estan montados terminaron cuando se sembraron. Sin esto, la
-- restriccion de arriba no dejaria aplicar la migracion.
update estook.local
   set onboarding_terminado_en = creado_en
 where onboarding_terminado and onboarding_terminado_en is null;

-- ═══════════════════════════════════════════════════════════════════════════
-- D · Los catorce alergenos
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Alergeno · Los 14 oficiales de la normativa · Fijo, con icono · Nunca vacio»
-- (Auditoria, parte 3). Son los del anexo II del Reglamento (UE) 1169/2011.
--
-- Viven aqui y no en M6 porque el catalogo de referencia ya los lleva puestos, y
-- porque un catalogo cerrado se declara una vez.

create table estook.alergeno (
  codigo  text      primary key,
  nombre  text      not null,
  orden   smallint  not null unique,
  constraint alergeno_codigo_con_forma check (codigo ~ '^[a-z_]{3,32}$')
);

comment on table estook.alergeno is
  'Los catorce del anexo II del Reglamento (UE) 1169/2011. Catalogo cerrado: se cambia con una migracion.';

insert into estook.alergeno (codigo, nombre, orden) values
  ('gluten',            'Cereales con gluten',      1),
  ('crustaceos',        'Crustáceos',               2),
  ('huevos',            'Huevos',                   3),
  ('pescado',           'Pescado',                  4),
  ('cacahuetes',        'Cacahuetes',               5),
  ('soja',              'Soja',                     6),
  ('lacteos',           'Leche y derivados',        7),
  ('frutos_de_cascara', 'Frutos de cáscara',        8),
  ('apio',              'Apio',                     9),
  ('mostaza',           'Mostaza',                 10),
  ('sesamo',            'Granos de sésamo',        11),
  ('sulfitos',          'Dióxido de azufre y sulfitos', 12),
  ('altramuces',        'Altramuces',              13),
  ('moluscos',          'Moluscos',                14);

-- ═══════════════════════════════════════════════════════════════════════════
-- E · El catalogo de referencia
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Estook **no mete nada en tu inventario.** Te lo rellena cuando tu se lo
--  pides. [...] La diferencia es de fondo: el catalogo de referencia es **una
--  ayuda que se consulta**, no un inventario que hay que limpiar»
-- (Manifiesto 8).
--
-- Es un diccionario. Ninguna fila de aqui pertenece a nadie, ninguna cuenta para
-- nada, y ninguna aparece en el inventario de un local hasta que alguien la
-- copia a proposito. Por eso **no lleva `local_id` ni `es_ejemplo`**: no es de
-- un local y no es un ejemplo, es una referencia.
--
-- Lo que resuelve, y por lo que existe: «sin el error clasico de confundir la
-- unidad de compra con la de uso», que segun la Auditoria (1.2) es «la primera
-- causa de escandallos falsos».

-- La lista cerrada de la Auditoria (parte 3): g · ml · ud · kg · l.
create type estook.unidad_de_uso as enum ('g', 'ml', 'ud', 'kg', 'l');

comment on type estook.unidad_de_uso is
  'Lista cerrada. El catalogo de referencia usa g, ml y ud: una receta se escribe en gramos, no en kilos.';

create table estook.producto_de_referencia (
  id                uuid                      primary key default gen_random_uuid(),
  -- Legible, para poder citarlo: 'aceite-de-oliva-virgen-extra-garrafa-5l'.
  codigo            text                      not null unique,
  nombre            text                      not null,
  -- Texto y no una clave ajena: las categorias de verdad son del local y nacen
  -- en M6. Aqui es la etiqueta con la que se propone una.
  categoria         text                      not null,
  -- Como se compra, en palabras: «Garrafa de 5 l». Es lo que se lee en el
  -- albaran, y por eso va tal cual.
  formato           text                      not null,
  -- Cuantas unidades de uso trae un formato. 5 l de aceite = 5.000 ml.
  factor            numeric(12, 4)            not null,
  unidad_de_uso     estook.unidad_de_uso      not null,
  -- Lo que queda despues de limpiar, pelar o descongelar. 1 = no se pierde nada.
  rendimiento       numeric(6, 4)             not null default 1,
  categoria_fiscal  estook.categoria_fiscal   not null,
  alergenos         text[]                    not null default '{}',
  -- Como lo llama la gente. «AOVE», «oliva virgen extra».
  sinonimos         text[]                    not null default '{}',
  creado_en         timestamptz               not null default now(),
  actualizado_en    timestamptz               not null default now(),
  constraint producto_de_referencia_codigo_con_forma check (codigo ~ '^[a-z0-9-]{3,80}$'),
  constraint producto_de_referencia_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint producto_de_referencia_factor_positivo check (factor > 0),
  constraint producto_de_referencia_rendimiento_en_rango check (
    rendimiento > 0 and rendimiento <= 1
  )
);

comment on table estook.producto_de_referencia is
  'Un diccionario que se consulta al crear un producto. No es de nadie, no cuenta para nada y no aparece en ningun inventario hasta que alguien lo copia.';
comment on column estook.producto_de_referencia.factor is
  'Unidades de uso por formato de compra. Una garrafa de 5 l son 5000 ml. Es la mitad de «precio ÷ (factor × rendimiento)».';
comment on column estook.producto_de_referencia.rendimiento is
  'Lo que queda tras limpiar o pelar. Un rendimiento mal puesto es el error mas caro del sistema (Auditoria 1.2), y por eso viene propuesto.';

-- Los alergenos son un catalogo cerrado, asi que un codigo inventado tiene que
-- rebotar. No se puede con una clave ajena sobre un array, asi que va con un
-- disparador: es la unica forma de que la base de datos lo garantice y no el
-- cuidado de quien escribe la semilla.
create or replace function estook.alergenos_conocidos()
returns trigger
language plpgsql
as $$
declare
  desconocido text;
begin
  select a into desconocido
    from unnest(new.alergenos) as a
   where a not in (select codigo from estook.alergeno)
   limit 1;

  if desconocido is not null then
    raise exception 'El alergeno «%» no esta en los catorce oficiales', desconocido
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function estook.alergenos_conocidos() is
  'Comprueba que cada alergeno de la lista existe. Hace de clave ajena sobre un array, que Postgres no sabe hacer.';

create trigger producto_de_referencia_con_alergenos_conocidos
  before insert or update on estook.producto_de_referencia
  for each row execute function estook.alergenos_conocidos();

create trigger producto_de_referencia_actualizado
  before update on estook.producto_de_referencia
  for each row execute function estook.marcar_actualizado();

-- «Toda lista larga tiene buscador tolerante a erratas y sin acentos»
-- (Auditoria, parte 8). Doscientas cincuenta filas es una lista larga.
create index producto_de_referencia_buscable
  on estook.producto_de_referencia using gin (estook.sin_acentos(nombre) gin_trgm_ops);

create index producto_de_referencia_por_categoria
  on estook.producto_de_referencia (categoria, nombre);

-- ── Las recetas de referencia ────────────────────────────────────────────────
--
-- «Lo mismo con las recetas de referencia. Nadie obliga, y lo que no se usa no
--  existe» (Manifiesto 8). Son opcionales de verdad: nada del sistema depende de
-- que exista ninguna.

create table estook.receta_de_referencia (
  id              uuid         primary key default gen_random_uuid(),
  codigo          text         not null unique,
  nombre          text         not null,
  categoria       text         not null,
  -- Para cuantas raciones esta escrita. Sin esto, los gramajes no dicen nada.
  raciones        smallint     not null,
  elaboracion     text,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),
  constraint receta_de_referencia_codigo_con_forma check (codigo ~ '^[a-z0-9-]{3,80}$'),
  constraint receta_de_referencia_raciones_positivas check (raciones > 0)
);

comment on table estook.receta_de_referencia is
  'Recetas de partida, opcionales. Se copian a una ficha tecnica, nunca se usan tal cual: la ficha es del local.';

create table estook.linea_de_receta_de_referencia (
  id                        uuid                  primary key default gen_random_uuid(),
  receta_id                 uuid                  not null references estook.receta_de_referencia (id) on delete cascade,
  producto_de_referencia_id uuid                  not null references estook.producto_de_referencia (id) on delete restrict,
  -- En la unidad de uso del producto, siempre (Auditoria, parte 7).
  cantidad                  numeric(12, 4)        not null,
  orden                     smallint              not null,
  constraint linea_de_receta_cantidad_positiva check (cantidad > 0),
  constraint linea_de_receta_orden_unico unique (receta_id, orden),
  -- «¿Que pasa si el mismo producto entra dos veces en una ficha? Se suman las
  --  cantidades y se avisa, **no se duplica la linea**» (Auditoria, parte 7).
  --  En una receta de referencia, que la escribimos nosotros, se impide y punto.
  constraint linea_de_receta_producto_unico unique (receta_id, producto_de_referencia_id)
);

create index linea_de_receta_por_receta on estook.linea_de_receta_de_referencia (receta_id, orden);

create trigger receta_de_referencia_actualizada
  before update on estook.receta_de_referencia
  for each row execute function estook.marcar_actualizado();

create index receta_de_referencia_buscable
  on estook.receta_de_referencia using gin (estook.sin_acentos(nombre) gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════════════════
-- F · Las importaciones
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Importadores desde Excel, CSV, PDF y foto, con el mapeo propuesto por Fogon y
--  confirmado por una persona» (Manifiesto 8).
--
-- ── Dos cosas que quedan decididas aqui ──────────────────────────────────────
--
-- 1. **El mapeo lo propone el codigo, no el modelo.** «Las reglas van en codigo.
--    [...] son condiciones, no opiniones, y no gastan un solo credito»
--    (Evolucion 1.0, capitulo 8, regla 4). Emparejar «Correo electronico» con la
--    columna `correo` es parecido de texto, que es exactamente lo que ya hace el
--    buscador universal de M3. Cuando llegue M22, Fogon podra mejorar la
--    propuesta en los casos raros; el camino normal no le necesita.
--
-- 2. **Se guarda lo leido antes de escribir nada.** Una importacion nace como
--    propuesta, con sus filas y su mapeo, y no toca el dominio hasta que una
--    persona confirma. Es lo que permite la pantalla de repaso que pide la
--    Auditoria (parte 5): «pantalla de emparejar columnas con vista previa de 5
--    filas».
--
-- Hoy el unico destino que existe es el equipo, que es el paso 7 del alta. Los
-- albaranes por foto necesitan proveedores y productos, asi que su destino nace
-- con M7. Añadir uno es añadir un valor al enum y un caso al comando.

create type estook.destino_de_importacion as enum ('equipo');

comment on type estook.destino_de_importacion is
  'A donde va lo importado. Solo el equipo por ahora: los albaranes necesitan proveedores y productos, que son M6 y M7.';

create type estook.estado_de_importacion as enum ('propuesta', 'confirmada', 'descartada');

create table estook.importacion (
  id                  uuid                           primary key default gen_random_uuid(),
  organizacion_id     uuid                           not null references estook.organizacion (id) on delete restrict,
  local_id            uuid                               null references estook.local (id) on delete restrict,
  destino             estook.destino_de_importacion  not null,
  nombre_del_fichero  text                           not null,
  -- SHA-256 del contenido, en hexadecimal. Es lo que hace verdad «importar dos
  -- veces el mismo fichero no cambia nada» (Manifiesto 28).
  huella              text                           not null,
  estado              estook.estado_de_importacion   not null default 'propuesta',
  -- Las cabeceras tal como venian en el fichero.
  columnas            text[]                         not null,
  -- De columna del fichero a campo nuestro. Lo propone el codigo y lo confirma
  -- una persona.
  mapeo               jsonb                          not null default '{}'::jsonb,
  -- Las filas leidas, tal cual. Se guardan antes de escribir nada.
  filas               jsonb                          not null,
  -- Que paso al confirmar: cuantas entraron, cuantas se saltaron y por que.
  resultado           jsonb,
  creada_por          uuid                           not null references estook.persona (id) on delete restrict,
  version             integer                        not null default 1,
  creado_en           timestamptz                    not null default now(),
  actualizado_en      timestamptz                    not null default now(),
  constraint importacion_huella_con_forma check (huella ~ '^[0-9a-f]{64}$'),
  constraint importacion_confirmada_con_resultado check (
    estado <> 'confirmada' or resultado is not null
  )
);

comment on table estook.importacion is
  'Un fichero leido, con su mapeo propuesto, esperando a que una persona lo confirme. No toca el dominio hasta entonces.';
comment on column estook.importacion.huella is
  'SHA-256 del contenido. Dos ficheros iguales tienen la misma huella, y el segundo no vuelve a importar nada.';

-- El mismo fichero, al mismo sitio, **una sola vez**. Solo cuenta lo confirmado:
-- una propuesta descartada no tiene por que impedir volver a intentarlo.
create unique index importacion_no_se_repite
  on estook.importacion (organizacion_id, local_id, destino, huella)
  where estado = 'confirmada';

create index importacion_por_local on estook.importacion (local_id, estado, creado_en desc);

create trigger importacion_actualizada before update on estook.importacion
  for each row execute function estook.marcar_actualizado();

create trigger importacion_sube_version before update on estook.importacion
  for each row execute function estook.subir_version();

-- ═══════════════════════════════════════════════════════════════════════════
-- G · Los datos de ejemplo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «Todo lleva una etiqueta gris **ejemplo** bien visible. **No cuenta para
--  nada:** ni avisos, ni analisis, ni salud de los datos, ni informes. Un solo
--  boton, **Quitar los ejemplos**, los borra todos de golpe» (Manifiesto 8).
--
-- ── Por que un registro y no una columna en cada tabla ───────────────────────
--
-- Porque «los borra todos de golpe» tiene que seguir siendo verdad dentro de
-- veinte modulos. Con una columna por tabla, el boton seria una lista de
-- borrados que hay que acordarse de ampliar cada vez, y el dia que alguien se
-- olvide quedaran ejemplos sueltos contaminando el food cost de alguien.
--
-- Con un registro, quien crea un ejemplo lo apunta **en la misma transaccion**,
-- y el boton borra lo apuntado en orden inverso. Un modulo nuevo no toca este
-- fichero ni el comando: solo apunta lo suyo.
--
-- Las columnas `es_ejemplo` de la 0001 se quedan: dicen «esta fila es de
-- mentira» para las semillas y para el modo demostracion, que es otra cosa que
-- borrar los ejemplos de un local de verdad.

create table estook.dato_de_ejemplo (
  id               bigserial    primary key,
  organizacion_id  uuid         not null references estook.organizacion (id) on delete cascade,
  local_id         uuid             null references estook.local (id) on delete cascade,
  -- El nombre de la tabla, sin esquema: siempre es `estook`.
  tabla            text         not null,
  fila_id          text         not null,
  creado_en        timestamptz  not null default now(),
  constraint dato_de_ejemplo_tabla_con_forma check (tabla ~ '^[a-z_]{3,63}$'),
  constraint dato_de_ejemplo_una_vez unique (tabla, fila_id)
);

comment on table estook.dato_de_ejemplo is
  'Que filas son de ejemplo. Quien crea un ejemplo lo apunta aqui en la misma transaccion, y «Quitar los ejemplos» borra lo apuntado sin tener que conocer las tablas.';

create index dato_de_ejemplo_por_local on estook.dato_de_ejemplo (local_id, id);

-- Una tabla que no existe apuntada aqui seria un borrado que falla el dia que
-- alguien pulse el boton, es decir, el peor dia. Se comprueba al apuntar.
create or replace function estook.tabla_de_ejemplo_existe()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'estook'
       and table_name = new.tabla
       and column_name = 'id'
  ) then
    raise exception 'estook.% no existe o no tiene columna id, asi que no se podria borrar', new.tabla
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger dato_de_ejemplo_de_una_tabla_real
  before insert or update on estook.dato_de_ejemplo
  for each row execute function estook.tabla_de_ejemplo_existe();

-- Cuantos ejemplos tiene un local. Es lo que decide si la tarjeta del Panel
-- aparece: sin ejemplos no hay nada que quitar, y una tarjeta que no hace nada
-- es ruido.
create or replace function estook.contar_ejemplos(p_local uuid)
returns integer
language sql
stable
set search_path = estook, pg_catalog, pg_temp
as $$
  select count(*)::integer
    from estook.dato_de_ejemplo d
   where d.local_id = p_local
     and d.local_id in (select local_id from estook.locales_visibles())
$$;

comment on function estook.contar_ejemplos(uuid) is
  'Cuantos datos de ejemplo le quedan a un local. Respeta las politicas: de un local que no se ve, cero.';

-- Y el boton. **Sin `security definer` a proposito**: borrar un ejemplo es
-- borrar una fila del local, y quien no pueda borrarla no debe poder hacerlo por
-- aqui. Si una politica dice que no, el borrado no ocurre y el registro se
-- queda, que es lo correcto: mejor un ejemplo de mas que un borrado que se salta
-- la seguridad.
create or replace function estook.quitar_ejemplos(p_local uuid)
returns integer
language plpgsql
volatile
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  fila     record;
  borradas integer := 0;
  cuantas  integer;
begin
  if not exists (
    select 1 from estook.locales_visibles() lv where lv.local_id = p_local
  ) then
    raise exception 'Ese local no es tuyo' using errcode = '42501';
  end if;

  -- En orden inverso al de creacion: lo de dentro antes que lo de fuera. Un
  -- plato se apunto despues que su ficha, y su ficha despues que su producto,
  -- asi que borrando del mas nuevo al mas viejo las claves ajenas se respetan
  -- solas y no hay que conocer el modelo.
  for fila in
    select d.id, d.tabla, d.fila_id
      from estook.dato_de_ejemplo d
     where d.local_id = p_local
     order by d.id desc
  loop
    execute format('delete from estook.%I where id::text = $1', fila.tabla)
      using fila.fila_id;
    get diagnostics cuantas = row_count;
    borradas := borradas + cuantas;

    -- El apunte se va con la fila. Si la politica no dejo borrarla, `cuantas`
    -- es cero y el apunte se queda: sigue habiendo un ejemplo ahi.
    if cuantas > 0 then
      delete from estook.dato_de_ejemplo where id = fila.id;
    end if;
  end loop;

  return borradas;
end;
$$;

comment on function estook.quitar_ejemplos(uuid) is
  'Borra de golpe todo lo apuntado como ejemplo de un local, del mas nuevo al mas viejo. Sin security definer: las politicas siguen mandando.';

-- ═══════════════════════════════════════════════════════════════════════════
-- H · El aparato desde el que se entra
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `estook.dispositivo` existe desde M1 con su clave ajena en `sesion`, y **no la
-- escribia nadie**: 0 filas, 0 sesiones con dispositivo. Por eso «Mis
-- dispositivos» acababa enseñando el local de cada sesion en vez del aparato, y
-- salian veintitres filas identicas.
--
-- Y tiene consecuencia de seguridad, que es lo que lo hace urgente: **el caso
-- para el que existe la pantalla es reconocer una sesion que no es tuya**, y con
-- todas las filas iguales no se puede.
--
-- Lo dice la regla critica de M4 en el Plan: «la sesion se ata al **aparato**, no
-- al login: entrar dos veces desde el mismo movil no son dos filas».

-- Un aparato, una fila. Lo garantiza un indice unico y no una comprobacion en el
-- codigo, por lo mismo de siempre.
create unique index dispositivo_uno_por_huella
  on estook.dispositivo (persona_id, huella)
  where huella is not null and revocado_en is null;

-- Reconocer el aparato, o darlo de alta si es la primera vez.
--
-- `security definer` **es necesario aqui**, y no por comodidad: esto se llama
-- desde `entrar`, y aunque `entrar` declara la identidad antes, la fila se crea
-- para una persona que en ese instante todavia no tiene sesion abierta. Es la
-- misma razon por la que existe `estook.abrir_sesion`. Comprueba lo suyo: solo
-- toca dispositivos **de la persona que se le dice**, y a esa persona la ha
-- verificado `entrar` un instante antes contra su contraseña o su PIN.
create or replace function estook.reconocer_dispositivo(
  p_persona uuid,
  p_huella  text,
  p_nombre  text,
  p_tipo    estook.tipo_de_dispositivo,
  p_local   uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  el_dispositivo uuid;
begin
  if p_huella is null or length(btrim(p_huella)) = 0 then
    return null;
  end if;

  select id into el_dispositivo
    from estook.dispositivo
   where persona_id = p_persona
     and huella = p_huella
     and revocado_en is null;

  if el_dispositivo is not null then
    -- Ya se conocia: se le actualiza la fecha y el nombre, que puede haber
    -- cambiado de navegador. **No se crea otra fila**, que es el objetivo.
    update estook.dispositivo
       set ultimo_uso_en = now(),
           nombre = coalesce(nullif(btrim(p_nombre), ''), nombre),
           local_id = coalesce(p_local, local_id)
     where id = el_dispositivo;
    return el_dispositivo;
  end if;

  insert into estook.dispositivo (persona_id, local_id, nombre, tipo, huella, ultimo_uso_en)
  values (
    p_persona,
    p_local,
    coalesce(nullif(btrim(p_nombre), ''), 'Un aparato'),
    p_tipo,
    p_huella,
    now()
  )
  returning id into el_dispositivo;

  return el_dispositivo;
end;
$$;

comment on function estook.reconocer_dispositivo(uuid, text, text, estook.tipo_de_dispositivo, uuid) is
  'Encuentra el aparato por su huella o lo da de alta. Entrar dos veces desde el mismo movil no son dos filas.';

-- `abrir_sesion` con el aparato.
--
-- **Primero se borra la de siete argumentos y luego se crea la de ocho**, y ese
-- orden importa. Al reves, las dos convivirian un momento y una llamada con
-- siete argumentos encajaria en las dos, porque el octavo tiene valor por
-- defecto: Postgres diria «funcion ambigua» y la migracion se caeria a mitad.
--
-- Y se borra en vez de dejarla: con ella suelta, cualquier llamada que se
-- olvidara del aparato seguiria funcionando, y volveriamos a tener sesiones sin
-- dispositivo sin que nadie se entere. Que el codigo viejo **no compile** es
-- justamente lo que se quiere.
drop function if exists estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer);

create function estook.abrir_sesion(
  p_persona uuid,
  p_huella text,
  p_entro_con text,
  p_organizacion uuid,
  p_local uuid,
  p_doble_factor_superado boolean,
  p_dias integer,
  p_dispositivo uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_sesion uuid;
begin
  insert into estook.sesion (
    persona_id, dispositivo_id, huella, entro_con, organizacion_id, local_id,
    doble_factor_superado, caduca_en
  )
  values (
    p_persona, p_dispositivo, p_huella, p_entro_con, p_organizacion, p_local,
    p_doble_factor_superado, now() + make_interval(days => p_dias)
  )
  returning id into la_sesion;

  update estook.persona set ultimo_acceso_en = now() where id = p_persona;

  return la_sesion;
end;
$$;

comment on function estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer, uuid) is
  'Abre la sesion y la cuelga del aparato. Sin el aparato, «Mis dispositivos» enseña sesiones, que es lo que no servia para nada.';

-- ═══════════════════════════════════════════════════════════════════════════
-- I · El modo demostracion
-- ═══════════════════════════════════════════════════════════════════════════
--
-- «**Modo demostracion aparte**, con un restaurante ficticio entero. Se entra y
--  se sale **sin dejar rastro**» (Manifiesto 8).
--
-- ── Como se cumple «sin dejar rastro» ────────────────────────────────────────
--
-- No con limpieza posterior, que exigiria un proceso de fondo que todavia no
-- existe: **la sesion de demostracion no puede escribir**. El despachador la
-- para antes de ejecutar ningun comando, en el mismo sitio donde estan las tres
-- puertas de M4, asi que no hay nada que limpiar salvo su propia fila. Y esa se
-- borra al salir, y las viejas se barren al abrir la siguiente.
--
-- Es mas honesto que dejar escribir y borrar despues: con lo segundo, un fallo a
-- mitad deja datos de mentira dentro de un restaurante de ejemplo que la
-- siguiente visita se encuentra.

alter table estook.sesion
  add column es_demostracion boolean not null default false;

comment on column estook.sesion.es_demostracion is
  'Una visita al restaurante de ejemplo. Puede mirarlo todo y no puede escribir nada: lo impide el despachador, no una politica de pantalla.';

create index sesion_de_demostracion on estook.sesion (creada_en)
  where es_demostracion and cerrada_en is null;

-- Abrir una demostracion.
--
-- `security definer` porque abre una sesion sin que nadie haya demostrado quien
-- es, igual que `abrir_sesion`. Y **por eso comprueba lo suyo con tres
-- condiciones a la vez**: la organizacion, el local y la persona tienen que ser
-- de ejemplo. Si alguna vez alguien marcara por error una organizacion de verdad
-- como `es_ejemplo`, seguirian haciendo falta las otras dos.
create or replace function estook.abrir_demostracion(
  p_huella text,
  p_horas integer default 2
)
returns table (sesion_id uuid, persona_id uuid, organizacion_id uuid, local_id uuid)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  la_persona uuid;
  la_organizacion uuid;
  el_local uuid;
  la_sesion uuid;
begin
  -- Las de demostracion que ya hayan caducado se van ahora. Es la limpieza que
  -- de otro modo necesitaria un reloj: se hace al entrar, que es cuando importa
  -- y cuando hay alguien esperando de todas formas.
  delete from estook.sesion
   where es_demostracion and (caduca_en < now() or cerrada_en is not null);

  select p.id, o.id, l.id
    into la_persona, la_organizacion, el_local
    from estook.persona p
    join estook.membresia m on m.persona_id = p.id and m.rol = 'gerente'
    join estook.organizacion o on o.id = m.organizacion_id
    join estook.local l on l.id = m.local_id
   where p.es_ejemplo and p.activa
     and o.es_ejemplo and o.activa
     and l.es_ejemplo and l.activo
     and l.onboarding_terminado
     and (m.hasta is null or m.hasta >= current_date)
     and (m.revocada_en is null or m.revocada_en > now())
   order by l.codigo
   limit 1;

  -- Sin restaurante de ejemplo no hay demostracion. Se dice devolviendo nada, y
  -- quien llama lo cuenta en cristiano.
  if la_persona is null then
    return;
  end if;

  insert into estook.sesion (
    persona_id, huella, entro_con, organizacion_id, local_id,
    doble_factor_superado, es_demostracion, caduca_en
  )
  values (
    la_persona, p_huella, 'contrasena', la_organizacion, el_local,
    true, true, now() + make_interval(hours => p_horas)
  )
  returning id into la_sesion;

  return query select la_sesion, la_persona, la_organizacion, el_local;
end;
$$;

comment on function estook.abrir_demostracion(text, integer) is
  'Abre una visita de solo lectura al restaurante de ejemplo. Exige que la organizacion, el local y la persona sean de ejemplo, las tres.';

-- Y salir: la fila **se borra**, no se cierra. Una sesion cerrada seria un
-- rastro, y lo que se prometio es que no queda ninguno.
create or replace function estook.cerrar_demostracion(p_sesion uuid)
returns void
language sql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  delete from estook.sesion where id = p_sesion and es_demostracion
$$;

comment on function estook.cerrar_demostracion(uuid) is
  'Borra la sesion de demostracion. No la cierra: «se entra y se sale sin dejar rastro».';

-- `sesion_activa` tiene que decir tambien si la visita es una demostracion, o el
-- despachador no podria pararla. Se sustituye entera, que es lo unico que admite
-- una funcion que devuelve tabla.
drop function if exists estook.sesion_activa(text);

create function estook.sesion_activa(p_huella text)
returns table (
  sesion_id             uuid,
  persona_id            uuid,
  organizacion_id       uuid,
  local_id              uuid,
  doble_factor_superado boolean,
  debe_cambiar_clave    boolean,
  es_demostracion       boolean
)
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  -- Se refresca la actividad, pero solo si hace mas de quince minutos: escribir
  -- una fila en cada peticion, para nada.
  update estook.sesion s
     set ultima_actividad_en = now()
   where s.huella = p_huella
     and s.cerrada_en is null
     and s.caduca_en > now()
     and s.ultima_actividad_en < now() - interval '15 minutes';

  -- El `join` con la persona **y su `activa`** no es decorativo: es lo que hace
  -- que retirarle el acceso a alguien mate sus sesiones al instante, sin esperar
  -- a que caduquen. Estaba en la 0018 y se conserva tal cual.
  return query
    select s.id, s.persona_id, s.organizacion_id, s.local_id, s.doble_factor_superado,
           coalesce(c.debe_cambiarla, false),
           s.es_demostracion
      from estook.sesion s
      join estook.persona p on p.id = s.persona_id and p.activa
      left join estook.credencial c on c.persona_id = s.persona_id
     where s.huella = p_huella
       and s.cerrada_en is null
       and s.caduca_en > now();
end;
$$;

comment on function estook.sesion_activa(text) is
  'De la huella del token a quien pregunta. Se llama antes de declarar la identidad, asi que tiene que ver sin ella. Desde M5 dice ademas si la visita es una demostracion.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Seguridad por filas y permisos
-- ═══════════════════════════════════════════════════════════════════════════

alter table estook.objetivo                     enable row level security;
alter table estook.objetivo_de_partida          enable row level security;
alter table estook.alergeno                     enable row level security;
alter table estook.producto_de_referencia       enable row level security;
alter table estook.receta_de_referencia         enable row level security;
alter table estook.linea_de_receta_de_referencia enable row level security;
alter table estook.importacion                  enable row level security;
alter table estook.dato_de_ejemplo              enable row level security;

-- ── Los catalogos de referencia · los lee todo el mundo, no los escribe nadie ─
--
-- Igual que `rol` y `permiso` de M1: son datos de referencia, se cambian con una
-- migracion, y no tienen dueño. **Sin politica de escritura**: no es que haga
-- falta un permiso, es que no hay camino.

create policy objetivo_de_partida_lectura on estook.objetivo_de_partida
  for select using (true);
create policy alergeno_lectura on estook.alergeno
  for select using (true);
create policy producto_de_referencia_lectura on estook.producto_de_referencia
  for select using (true);
create policy receta_de_referencia_lectura on estook.receta_de_referencia
  for select using (true);
create policy linea_de_receta_de_referencia_lectura on estook.linea_de_receta_de_referencia
  for select using (true);

-- ── Objetivos ────────────────────────────────────────────────────────────────
--
-- Se leen si se ve el local. Se ponen con `accion.poner_objetivos`, que es el
-- permiso que M1 creo justo para esto.

create policy objetivo_lectura on estook.objetivo
  for select using (
    local_id in (select local_id from estook.locales_visibles())
  );

create policy objetivo_escritura on estook.objetivo
  for all using (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.poner_objetivos') = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.poner_objetivos') = 'ver_y_editar'
  );

-- ── Importaciones ────────────────────────────────────────────────────────────
--
-- Una importacion lleva dentro los datos que se van a escribir, asi que se
-- protege con el permiso del destino y no con uno propio: quien no puede invitar
-- no puede subir un fichero con la lista del equipo y mirarla.

create policy importacion_lectura on estook.importacion
  for select using (
    local_id in (select local_id from estook.locales_visibles())
    and estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') <> 'sin_acceso'
  );

create policy importacion_escritura on estook.importacion
  for all using (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
  );

-- ── Datos de ejemplo ─────────────────────────────────────────────────────────
--
-- El registro se lee si se ve el local, y lo escribe quien lleva **ese local**.
-- Borrar la fila apuntada es otra cosa, y la decide la politica de su propia
-- tabla: por eso `quitar_ejemplos` no lleva `security definer`.

create policy dato_de_ejemplo_lectura on estook.dato_de_ejemplo
  for select using (
    local_id in (select local_id from estook.locales_visibles())
  );

create policy dato_de_ejemplo_escritura on estook.dato_de_ejemplo
  for all using (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'app.ajustes') = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'app.ajustes') = 'ver_y_editar'
  );

-- ── Y la que hacia falta arreglar: quien puede tocar la ficha de su local ────
--
-- **Este es el fallo que encontro una prueba de M5, y era de los caros.**
--
-- La politica `local_escritura` de la 0008 exige `accion.gestionar_locales` para
-- cualquier escritura sobre `estook.local`. Y ese permiso **el gerente no lo
-- tiene**, a proposito: «plan, facturacion, **altas de local** y catalogo maestro
-- son de organizacion» (matriz de roles, 0004).
--
-- Eso era correcto mientras lo unico que se escribia en `local` fuera darlo de
-- alta o archivarlo. Con M5 deja de serlo: el alta de un local **la hace su
-- gerente**, y el Manifiesto (26) pone «Local y marca» dentro de Ajustes, que es
-- suyo. Con la politica como estaba, el gerente de un bar recien dado de alta
-- entraba en su propia alta y no podia responder ni la primera pregunta.
--
-- Asi que se parte en dos, que es lo que siempre debio ser:
--
--   dar de alta o archivar un local  →  `accion.gestionar_locales`, de la
--                                       organizacion. Sigue igual.
--   tocar la ficha del local         →  `app.ajustes` sobre **ese** local. Es lo
--                                       que tiene el gerente, y solo del suyo.
--
-- Un gerente sigue sin poder crear locales ni tocar los de al lado. Lo unico que
-- gana es poder configurar el que lleva, que es justo lo que su rol promete.

drop policy if exists local_escritura on estook.local;

create policy local_alta on estook.local
  for insert with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  );

create policy local_edicion on estook.local
  for update using (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
    or estook.nivel_de_permiso(estook.persona_actual(), id, 'app.ajustes') = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
    or estook.nivel_de_permiso(estook.persona_actual(), id, 'app.ajustes') = 'ver_y_editar'
  );

comment on policy local_edicion on estook.local is
  'Tocar la ficha del local que llevas. Crear o archivar uno sigue siendo accion.gestionar_locales, que es de organizacion.';

-- Y **no hay politica de borrado**, igual que antes: «nada se borra nunca». Un
-- local que se cierra se archiva con `activo = false`, que es una edicion.

-- ── Concesiones ──────────────────────────────────────────────────────────────

grant select on
  estook.objetivo_de_partida,
  estook.alergeno,
  estook.producto_de_referencia,
  estook.receta_de_referencia,
  estook.linea_de_receta_de_referencia
to estook_api;

grant select, insert, update, delete on
  estook.objetivo,
  estook.importacion,
  estook.dato_de_ejemplo
to estook_api;

grant usage, select on all sequences in schema estook to estook_api;

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.contar_ejemplos(uuid)',
    'estook.quitar_ejemplos(uuid)',
    'estook.reconocer_dispositivo(uuid, text, text, estook.tipo_de_dispositivo, uuid)',
    'estook.abrir_sesion(uuid, text, text, uuid, uuid, boolean, integer, uuid)',
    'estook.abrir_demostracion(text, integer)',
    'estook.cerrar_demostracion(uuid)',
    'estook.sesion_activa(text)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;
