-- 0003 · El catalogo de permisos
--
-- Modulo M1. Tres estados, tal como los fija el Manifiesto: sin acceso, ver, y
-- ver y editar. Los permisos se heredan del rol y se recortan local a local.
--
-- La regla que hay detras: «viven en el servidor: un rol sin costes no recibe los
-- campos de precio». Esconder un campo en la pantalla no es protegerlo (regla 4).

create type estook.nivel_de_permiso as enum ('sin_acceso', 'ver', 'ver_y_editar');

create table estook.permiso (
  codigo       text            primary key,
  nombre       text            not null,
  -- 'app' que se ve · 'dato' sensible · 'accion' que se puede ejecutar
  familia      text            not null,
  -- Sobre que manda este permiso. Los de familia 'persona' son siempre sobre lo
  -- tuyo y no se recortan: tus horas son tuyas.
  ambito       estook.alcance  not null default 'local',
  descripcion  text            not null,
  constraint permiso_familia_conocida check (familia in ('app', 'dato', 'accion')),
  constraint permiso_codigo_con_forma check (codigo ~ '^(app|dato|accion)\.[a-z_]+$')
);

comment on table estook.permiso is
  'Catalogo cerrado. Un permiso que no este aqui no existe, para que no acaben apareciendo cadenas sueltas por el codigo.';

-- ── Las ocho apps, mas el Panel, Fogon, Ajustes y la vista de gestoria ────────

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('app.panel',        'Panel',        'app', 'local',        'La pantalla de inicio con sus widgets'),
  ('app.inventario',   'Inventario',   'app', 'local',        'Genero, proveedores, pedidos, recuentos y mermas'),
  ('app.escandallos',  'Escandallos',  'app', 'local',        'Fichas tecnicas, elaboraciones y costes de plato'),
  ('app.carta',        'Carta',        'app', 'local',        'Cartas, menus y analisis de rentabilidad'),
  ('app.calendario',   'Calendario',   'app', 'local',        'Cuadrante, turnos, entregas y tareas'),
  ('app.equipo',       'Equipo',       'app', 'local',        'Personas, contratos, fichajes y documentos'),
  ('app.servicio',     'Servicio',     'app', 'local',        'Jornada, ventas del dia, APPCC y trazabilidad'),
  ('app.negocio',      'Negocio',      'app', 'local',        'Analitica, costes, margenes y resenas'),
  ('app.cuaderno',     'Cuaderno',     'app', 'local',        'Incidencias, notas y equipos del local'),
  ('app.fogon',        'Fogon',        'app', 'local',        'El asistente. Propone, nunca decide'),
  ('app.ajustes',      'Ajustes',      'app', 'local',        'Configuracion del local y de la organizacion'),
  ('app.gestoria',     'Vista de gestoria', 'app', 'organizacion',
   'La vista aparte, sin rueda de apps: periodos, exportaciones, cuadres y documentos');

-- ── Los datos que no todo el mundo puede ver ──────────────────────────────────

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('dato.coste_de_genero', 'Costes de genero', 'dato', 'local',
   'Precios de compra, coste por unidad de uso, coste de plato y margen. Un cocinero no recibe estos campos'),
  ('dato.coste_de_personal', 'Costes de personal', 'dato', 'local',
   'Coste por hora y coste de personal. Vive en la ficha de la persona, con permiso propio'),
  ('dato.ventas', 'Ventas', 'dato', 'local',
   'Facturacion del local, ticket medio y ventas por turno'),
  ('dato.facturacion', 'Plan y facturacion', 'dato', 'organizacion',
   'La suscripcion de Estook, sus facturas y sus licencias'),
  ('dato.datos_del_equipo', 'Datos del equipo', 'dato', 'local',
   'Contacto, contrato y documentos de otras personas. Cada uno ve siempre los suyos'),
  ('dato.cuadrante_completo', 'Cuadrante completo', 'dato', 'local',
   'El cuadrante entero del local. Sin esto, cada uno ve solo su turno'),
  ('dato.chat_directos', 'Mensajes directos ajenos', 'dato', 'local',
   'Los directos entre dos personas. NADIE lo tiene, ni la direccion: esta aqui para dejar escrito que no se concede');

-- ── Lo que se puede ejecutar ──────────────────────────────────────────────────

insert into estook.permiso (codigo, nombre, familia, ambito, descripcion) values
  ('accion.fichar', 'Fichar', 'accion', 'persona',
   'Entrada y salida propias. Es de ambito persona: no se recorta'),
  ('accion.registrar_merma', 'Registrar una merma', 'accion', 'local',
   'Apuntar genero que se tira, con su motivo obligatorio'),
  ('accion.marcar_agotado', 'Marcar un plato agotado', 'accion', 'local',
   'Lo pone una persona y afecta a la carta. Distinto de quedarse sin stock, que lo calcula el sistema'),
  ('accion.cerrar_recuento', 'Cerrar un recuento', 'accion', 'local',
   'Permiso aparte a proposito: quien compra no deberia valorar su propio inventario'),
  ('accion.publicar_carta', 'Publicar la carta', 'accion', 'local',
   'Proponer cambios es otra cosa; esto es lo que los hace visibles'),
  ('accion.publicar_cuadrante', 'Publicar el cuadrante', 'accion', 'local',
   'Pasar el cuadrante de borrador a publicado'),
  ('accion.invitar_personas', 'Invitar y quitar accesos', 'accion', 'local',
   'Dar de alta a alguien, cambiar su rol o retirarle el acceso'),
  ('accion.conectar_tpv', 'Conectar el TPV', 'accion', 'local',
   'Autorizar la conexion con el TPV por cualquiera de las tres vias'),
  ('accion.poner_objetivos', 'Poner los objetivos', 'accion', 'local',
   'Los objetivos pintan de rojo o de verde la aplicacion entera. Se tocan con cuidado'),
  ('accion.exportar_contabilidad', 'Exportar para la gestoria', 'accion', 'organizacion',
   'IVA, ventas, compras y horas, en PDF, CSV y los formatos de A3, Sage, Contasol y Holded'),
  ('accion.gestionar_locales', 'Dar de alta y archivar locales', 'accion', 'organizacion',
   'Crear un local, archivarlo o darlo de baja'),
  ('accion.catalogo_maestro', 'Gestionar el catalogo maestro', 'accion', 'organizacion',
   'Crear elementos maestros y decidir su politica: obligatorio, sugerido o libre'),
  ('accion.contratos_marco', 'Contratos marco con proveedores', 'accion', 'organizacion',
   'Precios negociados en la organizacion que aplican a todos los locales');

-- ── El recorte local a local ──────────────────────────────────────────────────

create table estook.recorte_de_permiso (
  id              uuid                     primary key default gen_random_uuid(),
  membresia_id    uuid                     not null references estook.membresia (id) on delete cascade,
  local_id        uuid                     not null references estook.local (id) on delete cascade,
  permiso         text                     not null references estook.permiso (codigo) on delete restrict,
  nivel           estook.nivel_de_permiso  not null,
  motivo          text,
  creado_en       timestamptz              not null default now(),
  actualizado_en  timestamptz              not null default now(),
  constraint recorte_unico unique (membresia_id, local_id, permiso)
);

comment on table estook.recorte_de_permiso is
  'Ajusta un permiso concreto para un local concreto. Puede subir o bajar el nivel que trae el rol.';

create index recorte_por_membresia on estook.recorte_de_permiso (membresia_id);

create trigger recorte_actualizado before update on estook.recorte_de_permiso
  for each row execute function estook.marcar_actualizado();

-- Un permiso de ambito persona es sobre lo tuyo y no se recorta.
create or replace function estook.recorte_es_recortable()
returns trigger
language plpgsql
as $$
declare
  ambito_del_permiso estook.alcance;
begin
  select p.ambito into ambito_del_permiso from estook.permiso p where p.codigo = new.permiso;

  if ambito_del_permiso = 'persona' then
    raise exception 'El permiso % es sobre lo tuyo y no se recorta', new.permiso
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger recorte_recortable
  before insert or update on estook.recorte_de_permiso
  for each row execute function estook.recorte_es_recortable();
