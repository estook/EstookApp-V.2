-- Semilla 3 de 3 · las personas y sus membresias
--
-- Se carga despues de las dos anteriores, porque cuelga de ellas.
--
-- Monta el caso que M1 usa como criterio de terminado: un area manager que ve
-- exactamente sus tres locales, ni uno mas. Y el caso opuesto: una camarera de
-- un solo local que no ve nada de la cadena.
--
-- Idempotente, como las otras dos.

-- ── Las personas ──────────────────────────────────────────────────────────────

insert into estook.persona (correo, nombre, apellidos, idioma, es_ejemplo) values
  -- Bar Centro · el local independiente
  ('rosa@ejemplo.estook.com',    'Rosa',    'Iglesias', 'es', true),
  ('marcos@ejemplo.estook.com',  'Marcos',  'Vega',     'gl', true),
  ('sara@ejemplo.estook.com',    'Sara',    'Nunez',    'es', true),
  -- Grupo Costa · la cadena
  ('elena@ejemplo.estook.com',   'Elena',   'Prat',     'ca', true),
  ('ignacio@ejemplo.estook.com', 'Ignacio', 'Bordas',   'es', true),
  ('luis@ejemplo.estook.com',    'Luis',    'Amunarriz','eu', true),
  ('asesoria@ejemplo.estook.com','Asesoria','Cuenta Clara', 'es', true)
on conflict (correo) do update
  set nombre = excluded.nombre,
      apellidos = excluded.apellidos,
      idioma = excluded.idioma,
      es_ejemplo = excluded.es_ejemplo;

-- ── Bar Centro · un local, tres personas ──────────────────────────────────────
-- Rosa lleva el bar, Marcos cocina y Sara esta en sala. Ninguno ve otra cosa.

insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
select p.id, o.id, l.id, 'local', v.rol
from (values
  ('rosa@ejemplo.estook.com',   'gerente'),
  ('marcos@ejemplo.estook.com', 'cocinero'),
  ('sara@ejemplo.estook.com',   'camarero')
) as v (correo, rol)
join estook.persona p on p.correo = v.correo
join estook.organizacion o on o.codigo = 'bar-centro'
join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-centro'
on conflict do nothing;

-- ── Grupo Costa · seis locales en dos areas ───────────────────────────────────

-- Elena es la propietaria: ve los seis.
insert into estook.membresia (persona_id, organizacion_id, alcance, rol)
select p.id, o.id, 'organizacion', 'direccion'
from estook.persona p, estook.organizacion o
where p.correo = 'elena@ejemplo.estook.com' and o.codigo = 'grupo-costa'
on conflict do nothing;

-- Ignacio lleva Zona Norte: ve exactamente tres.
-- Este es el criterio de terminado de M1, sembrado.
insert into estook.membresia (persona_id, organizacion_id, area_id, alcance, rol)
select p.id, o.id, a.id, 'area', 'area_manager'
from estook.persona p, estook.organizacion o
join estook.area a on a.organizacion_id = o.id and a.codigo = 'zona-norte'
where p.correo = 'ignacio@ejemplo.estook.com' and o.codigo = 'grupo-costa'
on conflict do nothing;

-- Luis lleva la cocina del Bar Puerto: ve uno.
insert into estook.membresia (persona_id, organizacion_id, local_id, alcance, rol)
select p.id, o.id, l.id, 'local', 'jefe_de_cocina'
from estook.persona p, estook.organizacion o
join estook.local l on l.organizacion_id = o.id and l.codigo = 'bar-puerto'
where p.correo = 'luis@ejemplo.estook.com' and o.codigo = 'grupo-costa'
on conflict do nothing;

-- La gestoria entra a toda la organizacion, en solo lectura y sin rueda de apps.
insert into estook.membresia (persona_id, organizacion_id, alcance, rol)
select p.id, o.id, 'organizacion', 'gestoria'
from estook.persona p, estook.organizacion o
where p.correo = 'asesoria@ejemplo.estook.com' and o.codigo = 'grupo-costa'
on conflict do nothing;

-- ── Un recorte de ejemplo ─────────────────────────────────────────────────────
-- En el Bar Puerto no quieren que la cocina cierre recuentos: lo hara el gerente.
-- Es el mismo conflicto de interes que la Auditoria de flujos senala para quien
-- compra, aplicado local a local, que es justo para lo que existe el recorte.

insert into estook.recorte_de_permiso (membresia_id, local_id, permiso, nivel, motivo)
select m.id, l.id, 'accion.cerrar_recuento', 'sin_acceso',
       'En este local el recuento lo cierra el gerente'
from estook.membresia m
join estook.persona p on p.id = m.persona_id and p.correo = 'luis@ejemplo.estook.com'
join estook.local l on l.id = m.local_id and l.codigo = 'bar-puerto'
on conflict (membresia_id, local_id, permiso) do update
  set nivel = excluded.nivel,
      motivo = excluded.motivo;

-- ── Politicas del catalogo maestro de la cadena ───────────────────────────────
-- «Asi una franquicia bloquea la receta del plato estrella y deja libre la carta
--  de vinos.» Aqui: las recetas mandan desde arriba, las cartas se sugieren y los
--  productos son libres.

insert into estook.politica_de_catalogo (organizacion_id, area_id, tipo, politica)
select o.id, null, v.tipo::estook.tipo_maestro, v.politica::estook.politica_maestra
from estook.organizacion o
cross join (values
  ('receta',          'obligatorio'),
  ('carta',           'sugerido'),
  ('producto',        'libre'),
  ('plantilla_appcc', 'obligatorio'),
  ('plantilla_tarea', 'sugerido'),
  ('objetivo',        'sugerido')
) as v (tipo, politica)
where o.codigo = 'grupo-costa'
on conflict (organizacion_id, area_id, tipo) do update
  set politica = excluded.politica;
