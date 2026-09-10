-- 0030 · Los JSON que se guardaron como texto
--
-- ── Lo que pasó ──────────────────────────────────────────────────────────────
--
-- En producción la API habla con Postgres con `postgres.js`, y cuando un
-- parámetro va a una columna `jsonb`, postgres.js lo convierte él a JSON. El
-- código ya le pasaba el texto hecho con `JSON.stringify`, así que se codificaba
-- **dos veces**: lo que se guardaba no era el objeto sino un texto con el objeto
-- dentro. En las pruebas no se veía, porque corren con PGlite, que pasa el texto
-- tal cual.
--
-- Donde una restricción miraba dentro —el Panel exige una lista de widgets— el
-- guardado fallaba entero: por eso en producción no se guardó ni un Panel, y es
-- el «se nos ha roto algo por dentro» que salió al tocar el Panel. En el resto se
-- guardaba el texto sin que nadie lo leyera todavía.
--
-- El código ya manda `::text::jsonb`, y una prueba lo vigila. Esta migración
-- arregla lo que se guardó mal.
--
-- ── Qué se arregla y qué no ──────────────────────────────────────────────────
--
-- Se convierten **la bandeja de eventos** y **la memoria de idempotencia**: las
-- dos se leen —la bandeja la vaciará el reloj de M8, y la memoria devuelve la
-- respuesta de la primera vez cuando alguien reintenta—.
--
-- **La auditoría y el libro de movimientos no se tocan.** Son de solo añadir, y
-- esa garantía vale más que el formato de unas doscientas filas. Para leerlas
-- está `estook.json_de_verdad`, que devuelve el objeto venga como venga.

create or replace function estook.json_de_verdad(valor jsonb)
returns jsonb
language plpgsql
immutable
as $$
begin
  if jsonb_typeof(valor) = 'string' then
    return (valor #>> '{}')::jsonb;
  end if;
  return valor;
exception
  -- Un texto que de verdad era un texto, y no un objeto envuelto: se deja.
  when others then
    return valor;
end;
$$;

comment on function estook.json_de_verdad(jsonb) is
  'Devuelve el objeto aunque se guardara envuelto en un texto. Hace falta para la auditoria y el libro anteriores a la 0030, que no se reescriben.';

grant execute on function estook.json_de_verdad(jsonb) to estook_api;

update estook.bandeja_de_salida
   set datos = estook.json_de_verdad(datos)
 where jsonb_typeof(datos) = 'string';

update estook.clave_de_idempotencia
   set respuesta = estook.json_de_verdad(respuesta)
 where jsonb_typeof(respuesta) = 'string';
