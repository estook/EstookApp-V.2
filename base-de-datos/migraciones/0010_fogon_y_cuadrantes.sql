-- 0010 · Quien usa Fogon, y quien lleva los cuadrantes
--
-- Tres decisiones de Richi del 1 de septiembre de 2026, en respuesta a las tres
-- preguntas que dejo abiertas el repaso de la matriz de M1.

-- ── 1 · Fogon lo usa todo el mundo, pero no todos igual ──────────────────────
--
-- «El jefe de sala si, es como el jefe de cocina. Cocinero y camarero tambien,
--  pero solo en ciertas funciones: tipo boton "explicame esto" o "explica lo que
--  ves". Mas acotado y limitado.»
--
-- Encaja exactamente en la escalera que ya existe, sin inventar nada:
--
--   ver           Fogon acotado. Pregunta y explica lo que esa persona ya ve
--                 en pantalla. No propone cambios ni rellena formularios.
--   ver_y_editar  Fogon completo. Ademas propone, rellena y prepara cosas para
--                 que una persona las apruebe (principio 10: Fogon propone,
--                 una persona aprueba y guarda).
--
-- Y sigue valiendo el principio 11: Fogon ve exactamente lo que ve quien
-- pregunta. El acotado no es que vea menos datos, es que hace menos cosas.

update estook.permiso
   set descripcion = 'El asistente. Propone, nunca decide. En «ver» es acotado: explica lo que esa persona ya ve. En «ver y editar» ademas propone y rellena, y una persona aprueba'
 where codigo = 'app.fogon';

-- Los que lo tienen acotado.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('camarero', 'app.fogon', 'ver'),
  ('cocinero', 'app.fogon', 'ver')
on conflict (rol, permiso) do update set nivel = excluded.nivel;

-- El jefe de sala, igual que el jefe de cocina.
insert into estook.permiso_de_rol (rol, permiso, nivel) values
  ('jefe_de_sala', 'app.fogon', 'ver_y_editar'),
  -- RRHH lleva Equipo y Calendario de todos los locales: es un rol operativo y
  -- se le da completo, por coherencia con los demas roles operativos.
  ('rrhh', 'app.fogon', 'ver_y_editar')
on conflict (rol, permiso) do update set nivel = excluded.nivel;

-- Sin Fogon a proposito: la gestoria, cuya vista son cuatro cosas y ninguna rueda
-- de apps; y el administrador de cuenta, que no tiene acceso a la operacion
-- diaria salvo que se le de expresamente.

-- ── 2 · Marcar un plato agotado lo hace cualquiera del local ─────────────────
--
-- «Si, un cocinero puede marcarlo como agotado. Incluso un camarero tambien, y
--  un jefe de sala. Entre ellos tambien se ayudan.»
--
-- Ya estaba asi desde 0004 para camarero, cocinero, jefe de sala, jefe de cocina
-- y gerente. Se deja aqui escrito el porque, que es lo que faltaba: en un local
-- pequeno no hay fronteras rigidas entre sala y cocina, y quien ve que se ha
-- acabado el pulpo lo apunta, sea quien sea.

-- ── 3 · Los dos jefes llevan los dos cuadrantes ──────────────────────────────
--
-- «Hay ocasiones en que uno hace los dos. Pon que ambos, jefe de sala y jefe de
--  cocina, pueden hacer los dos: asi separados pueden, o juntos, y editar el de
--  ambos.»
--
-- Es lo que ya habia (los dos con `dato.cuadrante_completo` y
-- `accion.publicar_cuadrante`), pero estaba anotado como una simplificacion a
-- revisar en M13/M14. Deja de serlo: es la decision.
--
-- Lo que M14 tendra que resolver es como se ENSENA, no quien puede: junto,
-- separado por seccion o individual, y con su resumen en el Panel. Eso es
-- presentacion, y no cambia estos permisos.
--
-- Ojo con no confundir dos cosas distintas, que siguen siendo distintas:
--   · Ver TU turno y con quien lo haces. Lo tiene todo el mundo, y sale en el
--     Panel del camarero tal como lo dibuja el documento de Roles.
--   · Ver el CUADRANTE COMPLETO del local. Eso es `dato.cuadrante_completo`, y
--     el documento dice expresamente que un camarero no lo tiene.

update estook.permiso
   set descripcion = 'El cuadrante entero del local, sala y cocina. Sin esto, cada uno ve su turno y con quien lo hace, pero no el conjunto'
 where codigo = 'dato.cuadrante_completo';
