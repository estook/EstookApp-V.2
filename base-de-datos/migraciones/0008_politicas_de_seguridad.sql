-- 0008 · Las politicas de seguridad
--
-- Modulo M1. «Un local jamas ve los datos de otro» (principio 8) y «la seguridad
-- se hace en el servidor; la interfaz esconde, no protege» (principio 7).
--
-- Todas se escriben contra `locales_visibles` y `organizaciones_visibles`, nunca
-- contra un identificador que mande el cliente. Si nadie ha declarado quien
-- pregunta, `persona_actual()` devuelve vacio y no se ve absolutamente nada.
--
-- Terminado cuando (M1): toda consulta cruzada entre organizaciones devuelve
-- vacio. Eso es lo que estas politicas garantizan, y lo que prueban las pruebas.

-- ── Se enciende en todo lo nuevo ──────────────────────────────────────────────
-- Las tres de 0001 ya venian encendidas, sin ninguna politica. Ahora se les
-- escriben las suyas.

alter table estook.persona               enable row level security;
alter table estook.membresia             enable row level security;
alter table estook.recorte_de_permiso    enable row level security;
alter table estook.auditoria             enable row level security;
alter table estook.traduccion            enable row level security;
alter table estook.dispositivo           enable row level security;
alter table estook.politica_de_catalogo  enable row level security;
alter table estook.rol                   enable row level security;
alter table estook.permiso               enable row level security;
alter table estook.permiso_de_rol        enable row level security;

-- A proposito SIN `force row level security`. Forzarla la aplicaria tambien al
-- dueno de las tablas, y el dueno es quien ejecuta las migraciones y las
-- semillas: se quedaria sin poder sembrar. No hace falta, porque la API no se
-- conecta como dueno sino como `estook_api`, que no lo es y a quien las
-- politicas si le aplican. Las pruebas hacen `set role estook_api` por eso mismo.

-- ── Datos de referencia · los doce roles y el catalogo de permisos ────────────
-- No son de nadie: los lee todo el mundo y no los escribe nadie. Se cambian con
-- una migracion, que es como debe ser un catalogo cerrado.

create policy rol_lectura on estook.rol
  for select using (true);
create policy permiso_lectura on estook.permiso
  for select using (true);
create policy permiso_de_rol_lectura on estook.permiso_de_rol
  for select using (true);

-- ── Organizacion ──────────────────────────────────────────────────────────────

create policy organizacion_lectura on estook.organizacion
  for select using (
    id in (select organizacion_id from estook.organizaciones_visibles())
  );

create policy organizacion_escritura on estook.organizacion
  for update using (
    estook.nivel_de_permiso_en_organizacion(estook.persona_actual(), id, 'app.ajustes') = 'ver_y_editar'
  );

-- ── Area ──────────────────────────────────────────────────────────────────────

create policy area_lectura on estook.area
  for select using (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

create policy area_escritura on estook.area
  for all using (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  );

-- ── Local ─────────────────────────────────────────────────────────────────────
-- La mas importante de todas. Un local se ve si, y solo si, esta en
-- `locales_visibles` de quien pregunta.

create policy local_lectura on estook.local
  for select using (
    id in (select local_id from estook.locales_visibles())
  );

create policy local_escritura on estook.local
  for all using (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.gestionar_locales'
    ) = 'ver_y_editar'
  );

-- ── Persona ───────────────────────────────────────────────────────────────────
-- Cada uno se ve siempre a si mismo. Y ve a quien comparte organizacion con el,
-- porque los nombres salen en el cuadrante y en el chat. Que un camarero no vea
-- el telefono ni el contrato de otro es cosa de los campos que envia la API
-- (`dato.datos_del_equipo`), no de si la fila existe.

create policy persona_lectura on estook.persona
  for select using (
    id in (select persona_id from estook.personas_visibles())
  );

create policy persona_se_edita_a_si_misma on estook.persona
  for update using (id = estook.persona_actual())
  with check (id = estook.persona_actual());

-- ── Membresia ─────────────────────────────────────────────────────────────────

create policy membresia_lectura on estook.membresia
  for select using (
    persona_id = estook.persona_actual()
    or organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

-- Invitar y quitar accesos. Para una membresia de local se mira el permiso en
-- ese local; para las de organizacion y area, en la organizacion.
create policy membresia_escritura on estook.membresia
  for all using (
    case
      when local_id is not null
        then estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
      else estook.nivel_de_permiso_en_organizacion(
        estook.persona_actual(), organizacion_id, 'accion.invitar_personas'
      ) = 'ver_y_editar'
    end
  )
  with check (
    case
      when local_id is not null
        then estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
      else estook.nivel_de_permiso_en_organizacion(
        estook.persona_actual(), organizacion_id, 'accion.invitar_personas'
      ) = 'ver_y_editar'
    end
  );

-- ── Recorte de permiso ────────────────────────────────────────────────────────

create policy recorte_lectura on estook.recorte_de_permiso
  for select using (
    local_id in (select local_id from estook.locales_visibles())
  );

create policy recorte_escritura on estook.recorte_de_permiso
  for all using (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
  );

-- ── Auditoria ─────────────────────────────────────────────────────────────────
-- Se lee lo de la propia organizacion, y si la linea es de un local, solo si ese
-- local se ve. Escribir siempre se puede: es un registro, no un privilegio.

create policy auditoria_lectura on estook.auditoria
  for select using (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
    and (
      local_id is null
      or local_id in (select local_id from estook.locales_visibles())
    )
  );

create policy auditoria_se_anade on estook.auditoria
  for insert with check (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

-- ── Traduccion ────────────────────────────────────────────────────────────────

create policy traduccion_lectura on estook.traduccion
  for select using (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

create policy traduccion_escritura on estook.traduccion
  for all using (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  )
  with check (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

-- ── Dispositivo ───────────────────────────────────────────────────────────────
-- Los tuyos siempre. Los de otros, solo si el dispositivo esta en un local que
-- ves y puedes gestionar accesos ahi.

create policy dispositivo_lectura on estook.dispositivo
  for select using (
    persona_id = estook.persona_actual()
    or (
      local_id in (select local_id from estook.locales_visibles())
      and estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') <> 'sin_acceso'
    )
  );

create policy dispositivo_escritura on estook.dispositivo
  for all using (
    persona_id = estook.persona_actual()
    or (
      local_id in (select local_id from estook.locales_visibles())
      and estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
    )
  )
  with check (
    persona_id = estook.persona_actual()
    or (
      local_id in (select local_id from estook.locales_visibles())
      and estook.nivel_de_permiso(estook.persona_actual(), local_id, 'accion.invitar_personas') = 'ver_y_editar'
    )
  );

-- ── Politicas del catalogo maestro ────────────────────────────────────────────

create policy politica_lectura on estook.politica_de_catalogo
  for select using (
    organizacion_id in (select organizacion_id from estook.organizaciones_visibles())
  );

create policy politica_escritura on estook.politica_de_catalogo
  for all using (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.catalogo_maestro'
    ) = 'ver_y_editar'
  )
  with check (
    estook.nivel_de_permiso_en_organizacion(
      estook.persona_actual(), organizacion_id, 'accion.catalogo_maestro'
    ) = 'ver_y_editar'
  );
