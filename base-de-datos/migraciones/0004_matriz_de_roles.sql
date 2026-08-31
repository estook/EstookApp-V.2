-- 0004 · Que trae puesto cada rol
--
-- Modulo M1. La matriz de doce roles por treinta y dos permisos, derivada linea a
-- linea de la Parte 1 del documento «Roles, vistas, auditorias y administracion».
--
-- Lo que NO aparece aqui vale `sin_acceso`. Se guarda solo lo concedido, para que
-- la tabla se lea y se pueda auditar de un vistazo.
--
-- Cada bloque cita la frase del documento que lo justifica. Si alguna vez hay que
-- cambiar un nivel, se cambia con una migracion nueva y se dice por que.

create table estook.permiso_de_rol (
  rol      text                     not null references estook.rol (codigo) on delete cascade,
  permiso  text                     not null references estook.permiso (codigo) on delete cascade,
  nivel    estook.nivel_de_permiso  not null,
  primary key (rol, permiso),
  constraint permiso_de_rol_sin_ruido check (nivel <> 'sin_acceso')
);

comment on table estook.permiso_de_rol is
  'Lo que trae puesto cada rol. Ausencia = sin_acceso. El recorte por local lo ajusta despues.';

-- ── Camarero o personal de sala ───────────────────────────────────────────────
-- «Su turno de hoy, el menu del dia, los agotados, los alergenos y sus horas.»
-- «Que no ve, en ningun sitio: costes, margenes, precios de compra, ventas del
--  local, datos de otras personas ni el cuadrante completo.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('camarero', 'app.panel',              'ver'),
  ('camarero', 'app.calendario',         'ver'),
  ('camarero', 'app.carta',              'ver'),
  ('camarero', 'app.servicio',           'ver'),
  ('camarero', 'app.cuaderno',           'ver_y_editar'),
  ('camarero', 'accion.fichar',          'ver_y_editar'),
  ('camarero', 'accion.registrar_merma', 'ver_y_editar'),
  ('camarero', 'accion.marcar_agotado',  'ver_y_editar');

-- ── Cocinero ──────────────────────────────────────────────────────────────────
-- «Su rueda: Escandallos, Inventario (registrar), Servicio (APPCC y mermas),
--  Calendario y Cuaderno.»  «Que no ve: ningun importe.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('cocinero', 'app.panel',              'ver'),
  ('cocinero', 'app.escandallos',        'ver'),
  ('cocinero', 'app.inventario',         'ver_y_editar'),
  ('cocinero', 'app.servicio',           'ver_y_editar'),
  ('cocinero', 'app.calendario',         'ver'),
  ('cocinero', 'app.cuaderno',           'ver_y_editar'),
  ('cocinero', 'accion.fichar',          'ver_y_editar'),
  ('cocinero', 'accion.registrar_merma', 'ver_y_editar'),
  ('cocinero', 'accion.marcar_agotado',  'ver_y_editar');

-- ── Jefe de sala ──────────────────────────────────────────────────────────────
-- «Todo lo del camarero, y ademas: el cuadrante de sala en borrador y publicado,
--  los fichajes de su equipo, las ventas del turno con su ticket medio, los
--  agotados, y proponer cambios en la carta sin publicarlos.»
-- «No ve costes de materia prima ni escandallos con importes.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_sala', 'app.panel',                 'ver'),
  ('jefe_de_sala', 'app.calendario',            'ver_y_editar'),
  ('jefe_de_sala', 'app.carta',                 'ver_y_editar'),
  ('jefe_de_sala', 'app.servicio',              'ver_y_editar'),
  ('jefe_de_sala', 'app.cuaderno',              'ver_y_editar'),
  ('jefe_de_sala', 'app.equipo',                'ver'),
  ('jefe_de_sala', 'dato.ventas',               'ver'),
  ('jefe_de_sala', 'dato.cuadrante_completo',   'ver'),
  ('jefe_de_sala', 'accion.fichar',             'ver_y_editar'),
  ('jefe_de_sala', 'accion.registrar_merma',    'ver_y_editar'),
  ('jefe_de_sala', 'accion.marcar_agotado',     'ver_y_editar'),
  ('jefe_de_sala', 'accion.publicar_cuadrante', 'ver_y_editar');
-- Ojo: proponer cambios en la carta es `app.carta`; publicarlos es
-- `accion.publicar_carta`, que el jefe de sala NO tiene.

-- ── Jefe de cocina ────────────────────────────────────────────────────────────
-- «Manda en: Inventario entera, Escandallos entera, la parte de cocina de la
--  Carta, el APPCC, el cuadrante de cocina y las fichas de su equipo.»
-- «No ve: el margen global del negocio, el coste de personal de sala, la
--  facturacion ni la parte de plan y facturacion de Ajustes.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_cocina', 'app.panel',                 'ver'),
  ('jefe_de_cocina', 'app.inventario',            'ver_y_editar'),
  ('jefe_de_cocina', 'app.escandallos',           'ver_y_editar'),
  ('jefe_de_cocina', 'app.carta',                 'ver_y_editar'),
  ('jefe_de_cocina', 'app.servicio',              'ver_y_editar'),
  ('jefe_de_cocina', 'app.calendario',            'ver_y_editar'),
  ('jefe_de_cocina', 'app.cuaderno',              'ver_y_editar'),
  ('jefe_de_cocina', 'app.equipo',                'ver'),
  ('jefe_de_cocina', 'app.fogon',                 'ver_y_editar'),
  ('jefe_de_cocina', 'app.ajustes',               'ver'),
  ('jefe_de_cocina', 'dato.coste_de_genero',      'ver_y_editar'),
  ('jefe_de_cocina', 'dato.cuadrante_completo',   'ver'),
  ('jefe_de_cocina', 'accion.fichar',             'ver_y_editar'),
  ('jefe_de_cocina', 'accion.registrar_merma',    'ver_y_editar'),
  ('jefe_de_cocina', 'accion.marcar_agotado',     'ver_y_editar'),
  ('jefe_de_cocina', 'accion.cerrar_recuento',    'ver_y_editar'),
  ('jefe_de_cocina', 'accion.publicar_cuadrante', 'ver_y_editar');

-- ── Gerente ───────────────────────────────────────────────────────────────────
-- «Todo lo de su local. Es quien tiene el Panel completo, quien pone los
--  objetivos, quien invita y quita accesos, quien conecta el TPV y quien recibe
--  los avisos de negocio.»
-- «No ve: los directos entre dos empleados en el chat, ni otros locales.»
insert into estook.permiso_de_rol (rol, permiso, nivel)
select 'gerente', p.codigo, 'ver_y_editar'
from estook.permiso p
where p.codigo not in (
  -- Nadie ve los directos ajenos.
  'dato.chat_directos',
  -- Plan, facturacion, altas de local y catalogo maestro son de organizacion.
  'dato.facturacion',
  'accion.gestionar_locales',
  'accion.catalogo_maestro',
  'accion.contratos_marco',
  'accion.exportar_contabilidad',
  'app.gestoria'
);

-- ── Area manager ──────────────────────────────────────────────────────────────
-- «Hace lo de un gerente pero en sus locales y en vista comparada, sin tocar
--  facturacion ni crear locales.»
insert into estook.permiso_de_rol (rol, permiso, nivel)
select 'area_manager', pr.permiso, pr.nivel
from estook.permiso_de_rol pr
where pr.rol = 'gerente';

-- ── Direccion o propietario ───────────────────────────────────────────────────
-- «Todo, en todos los locales.» Con la unica excepcion de los directos ajenos,
-- que no se conceden a nadie.
insert into estook.permiso_de_rol (rol, permiso, nivel)
select 'direccion', p.codigo, 'ver_y_editar'
from estook.permiso p
where p.codigo <> 'dato.chat_directos';

-- ── Administrador de cuenta ───────────────────────────────────────────────────
-- «Plan, facturacion, licencias, altas de local y de personas. Sin acceso a la
--  operacion diaria, salvo que se le de expresamente.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('administrador_de_cuenta', 'app.panel',                 'ver'),
  ('administrador_de_cuenta', 'app.ajustes',               'ver_y_editar'),
  ('administrador_de_cuenta', 'dato.facturacion',          'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.gestionar_locales',  'ver_y_editar'),
  ('administrador_de_cuenta', 'accion.invitar_personas',   'ver_y_editar');
-- «Salvo que se le de expresamente» es exactamente para lo que sirve el recorte
-- de permisos: se le sube lo que haga falta, local a local.

-- ── Chef corporativo ──────────────────────────────────────────────────────────
-- «Escandallos y Carta de todos los locales, mas el catalogo maestro de recetas.
--  Nada de personal ni de facturacion.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('chef_corporativo', 'app.panel',                'ver'),
  ('chef_corporativo', 'app.escandallos',          'ver_y_editar'),
  ('chef_corporativo', 'app.carta',                'ver_y_editar'),
  ('chef_corporativo', 'app.fogon',                'ver_y_editar'),
  ('chef_corporativo', 'dato.coste_de_genero',     'ver_y_editar'),
  ('chef_corporativo', 'accion.publicar_carta',    'ver_y_editar'),
  ('chef_corporativo', 'accion.catalogo_maestro',  'ver_y_editar');

-- ── Compras central ───────────────────────────────────────────────────────────
-- «Inventario y proveedores de todos los locales, contratos marco y la
--  comparativa de precios entre locales. Nada de recetas ni de personal.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('compras_central', 'app.panel',                'ver'),
  ('compras_central', 'app.inventario',           'ver_y_editar'),
  ('compras_central', 'app.fogon',                'ver_y_editar'),
  ('compras_central', 'dato.coste_de_genero',     'ver_y_editar'),
  ('compras_central', 'accion.contratos_marco',   'ver_y_editar'),
  ('compras_central', 'accion.catalogo_maestro',  'ver_y_editar');
-- A proposito SIN `accion.cerrar_recuento`: quien compra no deberia valorar su
-- propio inventario. Es la decision 5 de la Auditoria de flujos. No se prohibe,
-- se deja fuera; el gerente puede concederlo con un recorte si lo quiere.

-- ── RRHH ──────────────────────────────────────────────────────────────────────
-- «Equipo y Calendario de todos los locales, con costes de personal. Sin acceso
--  a materia prima ni a margenes.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('rrhh', 'app.panel',                 'ver'),
  ('rrhh', 'app.equipo',                'ver_y_editar'),
  ('rrhh', 'app.calendario',            'ver_y_editar'),
  ('rrhh', 'dato.coste_de_personal',    'ver_y_editar'),
  ('rrhh', 'dato.datos_del_equipo',     'ver_y_editar'),
  ('rrhh', 'dato.cuadrante_completo',   'ver_y_editar'),
  ('rrhh', 'accion.publicar_cuadrante', 'ver_y_editar'),
  ('rrhh', 'accion.invitar_personas',   'ver_y_editar');

-- ── Gestoria ──────────────────────────────────────────────────────────────────
-- «Entra en una vista aparte, sin rueda de apps. Solo lectura, solo de los
--  locales que se le asignen. No ve fichas tecnicas, ni recetas, ni el chat, ni
--  datos personales del equipo mas alla de las horas.»
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('gestoria', 'app.gestoria',                  'ver'),
  ('gestoria', 'dato.ventas',                   'ver'),
  ('gestoria', 'dato.coste_de_genero',          'ver'),
  ('gestoria', 'accion.exportar_contabilidad',  'ver_y_editar');
-- `ver` en todo lo demas: es solo lectura por definicion. Exportar si es una
-- accion, porque genera un documento, pero no cambia ni un dato.
