-- 0017 · El buscador universal
--
-- Modulo M3. «Buscador universal con `pg_trgm` y `unaccent` que busca tambien
-- acciones» (Parte B5 del Plan) · «Toda lista larga tiene buscador tolerante a
-- erratas y sin acentos» (Auditoria de flujos, Parte 8).
--
-- ── Las dos cosas que tiene que aguantar ─────────────────────────────────────
--
-- Se busca con prisa, con una mano y con el movil mojado. Eso significa dos
-- cosas concretas:
--
--   · **Sin acentos.** Quien escribe «jose» tiene que encontrar a «Jose» y a
--     «Jose Maria», y quien escribe «bahia» tiene que encontrar «Bahia». Nadie
--     va a poner un acento en un buscador.
--   · **Con erratas.** «invetario», «escandallso», «Migel». Un `like` no perdona
--     una letra cambiada de sitio; la similitud por trigramas si.
--
-- ── Quitar los acentos sin `unaccent`, y por que ─────────────────────────────
--
-- El Plan (B5) dice «`pg_trgm` y `unaccent`». `pg_trgm` se usa tal cual. Para
-- quitar los acentos **no se usa `unaccent`**, y hay dos razones, las dos de
-- peso:
--
--   1. **No esta en el Postgres efimero de las pruebas.** A3 exige tres capas de
--      pruebas y una es «Postgres efimero», que aqui es PGlite. PGlite trae
--      `pg_trgm` pero no `unaccent`. Usarlo dejaria el buscador entero sin
--      probar hasta que alguien lo mirase a mano contra Supabase, y un buscador
--      sin probar es peor que uno hecho de otra forma.
--
--   2. **`unaccent()` no es inmutable.** Depende de un diccionario que se puede
--      cambiar por debajo, y Postgres, con razon, no deja indexar una expresion
--      asi. Se rodea declarando un envoltorio inmutable... que estaria mintiendo:
--      si alguien tocara el diccionario, los indices quedarian mal en silencio.
--
-- `translate()` no tiene ninguno de los dos problemas: es inmutable de verdad, no
-- depende de nada externo, y para el alfabeto latino la correspondencia es esta
-- lista y se acaba. Cubre los cinco idiomas de la interfaz y los nombres
-- europeos que aparecen en proveedores y personas.
--
-- Esta escrito en `docs/decisiones/0009`.
--
-- ── Y por que aqui solo hay locales y personas ───────────────────────────────
--
-- Porque hoy no hay mas. Productos, fichas, platos y proveedores llegan de M6 en
-- adelante. La funcion esta escrita para crecer por union: cada modulo anade su
-- bloque, y ni el buscador de la pantalla ni la consulta de la API cambian.

create extension if not exists pg_trgm;

-- ── Minusculas y sin acentos, inmutable de verdad ────────────────────────────

create or replace function estook.sin_acentos(p_texto text)
returns text
language sql
immutable
parallel safe
strict
set search_path = pg_catalog, pg_temp
as $$
  select translate(
    -- Primero minusculas: asi la lista de abajo es la mitad de larga y no se
    -- puede olvidar una mayuscula.
    lower(p_texto),
    'áàäâãåéèëêíìïîóòöôõøúùüûñçýÿšžćčřěłđ',
    'aaaaaaeeeeiiiioooooouuuuncyyszccreld'
  )
$$;

comment on function estook.sin_acentos(text) is
  'Minusculas y sin acentos. Con translate y no con unaccent: es inmutable de verdad y existe en el Postgres de las pruebas (decision 0009).';

-- ── Los indices ──────────────────────────────────────────────────────────────
--
-- GIN con `gin_trgm_ops`: es el que sabe responder a «parecido a esto» sin
-- recorrer la tabla entera.

create index local_buscable
  on estook.local using gin (estook.sin_acentos(nombre) gin_trgm_ops);

create index local_codigo_buscable
  on estook.local using gin (estook.sin_acentos(codigo) gin_trgm_ops);

create index persona_buscable
  on estook.persona using gin (
    estook.sin_acentos(nombre || ' ' || coalesce(apellidos, '')) gin_trgm_ops
  );

create index persona_correo_buscable
  on estook.persona using gin (estook.sin_acentos(correo) gin_trgm_ops);

create index organizacion_buscable
  on estook.organizacion using gin (estook.sin_acentos(nombre) gin_trgm_ops);

create index area_buscable
  on estook.area using gin (estook.sin_acentos(nombre) gin_trgm_ops);

-- ── La funcion ───────────────────────────────────────────────────────────────
--
-- **Sin `security definer`.** Es lo importante de todo este fichero: la funcion
-- se ejecuta con los permisos de quien la llama, asi que las politicas de M1 le
-- aplican igual que a cualquier otra consulta. Un buscador con `security
-- definer` seria la puerta de atras perfecta para leer los locales de la
-- competencia escribiendo tres letras.

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

  todo as (
    select * from locales
    union all select * from personas
    union all select * from organizaciones
    union all select * from areas
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
  'El buscador universal: sin acentos y tolerante a erratas. Sin security definer, para que las politicas de M1 apliquen.';

grant execute on function estook.sin_acentos(text) to estook_api;
grant execute on function estook.buscar(text, int) to estook_api;
