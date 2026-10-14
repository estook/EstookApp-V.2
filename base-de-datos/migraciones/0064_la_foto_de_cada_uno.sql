-- 0064 · La foto de cada persona (la experiencia, decisión 0083)
--
-- Richi, el 13-oct: «añadir poder subir fotos del trabajador, y que no sean redondas
-- sino cuadrados con bordes redondeados». Hasta hoy una persona era sus iniciales.
--
-- ── Dónde vive ───────────────────────────────────────────────────────────────
--
-- La foto es de **la persona**, no de un local ni de una organización: es la misma
-- cara en todos sitios. Así que va en `estook.persona`, como el nombre.
--
-- El fichero vive en el cubo de las fotos (`fotos-de-producto`, que ya existe y es
-- privado), bajo `personas/`: no hace falta crear otro con `almacen:preparar`. Aquí
-- se guarda solo **su clave**, y la API la firma al leerla, con caducidad, como las
-- de producto. Nunca una dirección pública: es la cara de alguien.
--
-- ── Quién la cambia ──────────────────────────────────────────────────────────
--
-- Las dos políticas que ya había sobre `estook.persona`: la persona la suya
-- (`persona_se_edita_a_si_misma`) y quien da accesos en su local la de su equipo
-- (`persona_la_edita_quien_da_acceso`). No hace falta ninguna nueva.

alter table estook.persona
  add column foto_clave text,
  add column foto_puesta_en timestamptz;

alter table estook.persona
  add constraint persona_foto_con_forma check (
    foto_clave is null
    or foto_clave ~ '^fotos-de-producto/personas/[0-9a-f-]{36}/cara-[0-9]+\.(webp|jpg)$'
  );

comment on column estook.persona.foto_clave is
  'La clave de su foto en el cubo privado de las fotos. La API la firma al leerla; nunca se publica (0083).';
