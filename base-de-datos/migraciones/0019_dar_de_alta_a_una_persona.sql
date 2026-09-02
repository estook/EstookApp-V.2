-- 0019 · Dar de alta a una persona
--
-- Modulo M4, arreglando M4. Lo encontro un repaso despues de fusionar, y es de
-- los fallos que mas incomodan: **invitar a alguien nuevo no funcionaba en
-- absoluto**, y las quinientas pruebas pasaban.
--
-- ── Que pasaba, y por que no se vio ──────────────────────────────────────────
--
-- `estook.persona` tiene seguridad por filas desde la 0008, con dos politicas:
-- una de lectura y otra de «cada uno cambia lo suyo». **Ninguna de alta.** Y con
-- seguridad por filas encendida y sin politica de `insert`, Postgres no deja
-- insertar: no es que falte un permiso, es que no hay regla que lo autorice.
--
-- Era correcto en M1, que era el modulo del modelo y donde nadie daba de alta a
-- nadie. Lo que fallo es M4, que escribio `invitar_persona` dando por hecho que
-- podria insertar.
--
-- Y no se vio porque el comando **crea la persona solo si el correo no existe**.
-- Contra las semillas, donde las siete personas ya estan, ese camino no se
-- recorria nunca: todas las pruebas invitaban a quien ya existia.
--
-- ── Y la parte que costo entender ────────────────────────────────────────────
--
-- Poner una politica de `insert` **no bastaba**, y la condicion daba `true` al
-- probarla a mano un segundo antes de insertar. Lo que ocurre es esto:
--
--   > Si un `insert` lleva `returning`, Postgres aplica ademas las politicas de
--   > **`select`** a la fila devuelta.
--
-- Y `persona_lectura` dice «se ve a quien comparte organizacion contigo». Una
-- persona recien creada **todavia no tiene membresia** —se le crea justo
-- despues— asi que no comparte organizacion con nadie y no se puede leer. El
-- `insert` entraba y el `returning` lo tumbaba, con el mismo mensaje que si no
-- hubiera politica ninguna. De ahi la hora perdida.
--
-- Se comprobo: el mismo `insert` sin `returning` pasa, y con `returning` falla.
--
-- ── Como se arregla ──────────────────────────────────────────────────────────
--
-- Con una funcion, como el resto de M4. Es el mismo patron que
-- `estook.poner_credencial`: hay una escritura que las politicas no dejan hacer
-- —y esta bien que no dejen—, asi que la excepcion **se declara una vez, en un
-- sitio, y comprueba el permiso ella misma**.
--
-- Aflojar `persona_lectura` para que cada uno pueda ver a quien acaba de crear
-- seria peor: abriria la lectura de personas sin membresia a cualquiera, que es
-- justo el hueco por el que se cuela una lista de correos.

create or replace function estook.dar_de_alta_persona(
  p_correo text,
  p_nombre text,
  p_apellidos text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
declare
  puede boolean;
  la_persona uuid;
begin
  -- Quien da de alta tiene que poder invitar **en algun local suyo**. Es lo que
  -- separa a un gerente de un cocinero, y se pregunta con el mismo permiso que
  -- usa todo lo demas: nada de un caso especial.
  --
  -- No se puede exigir «que sea de mi organizacion», porque todavia no lo es: la
  -- membresia se crea en la linea siguiente del comando.
  select exists (
    select 1
      from estook.locales_visibles() lv
     where estook.nivel_de_permiso(
             estook.persona_actual(), lv.local_id, 'accion.invitar_personas'
           ) = 'ver_y_editar'
  ) into puede;

  if not puede then
    raise exception 'No se puede dar de alta a una persona sin poder invitar en ningun local'
      using errcode = '42501';
  end if;

  insert into estook.persona (correo, nombre, apellidos)
  values (lower(btrim(p_correo)), btrim(p_nombre), nullif(btrim(coalesce(p_apellidos, '')), ''))
  returning id into la_persona;

  return la_persona;
end;
$$;

comment on function estook.dar_de_alta_persona(text, text, text) is
  'La unica forma de crear una persona. Comprueba el permiso ella misma. Existe porque un insert con returning tambien tiene que pasar la politica de lectura, y una persona sin membresia no la pasa.';

revoke all on function estook.dar_de_alta_persona(text, text, text) from public;
grant execute on function estook.dar_de_alta_persona(text, text, text) to estook_api;

-- ── Y tocar la ficha de quien trabaja contigo ────────────────────────────────
--
-- Esto si es una politica, y funciona: para reactivar a quien se fue hay que
-- cambiar `activa`, y `persona_se_edita_a_si_misma` solo deja cambiar la propia.
-- Aqui la persona **ya tiene membresia**, asi que la lectura no estorba.
--
-- Acotado a quien llega a un local donde se puede invitar: la ficha de alguien de
-- otra organizacion no se toca ni teniendo el permiso.

create policy persona_la_edita_quien_da_acceso on estook.persona
  for update
  using (
    exists (
      select 1
        from estook.membresia m
        join estook.local l
          on l.organizacion_id = m.organizacion_id
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
       where m.persona_id = estook.persona.id
         and estook.nivel_de_permiso(
               estook.persona_actual(), l.id, 'accion.invitar_personas'
             ) = 'ver_y_editar'
    )
  )
  with check (
    exists (
      select 1
        from estook.membresia m
        join estook.local l
          on l.organizacion_id = m.organizacion_id
         and (
           m.alcance = 'organizacion'
           or (m.alcance = 'area' and l.area_id = m.area_id)
           or (m.alcance = 'local' and l.id = m.local_id)
         )
       where m.persona_id = estook.persona.id
         and estook.nivel_de_permiso(
               estook.persona_actual(), l.id, 'accion.invitar_personas'
             ) = 'ver_y_editar'
    )
  );

comment on policy persona_la_edita_quien_da_acceso on estook.persona is
  'Reactivar a quien se fue, y corregir una ficha. Solo de quien trabaja en un local donde se puede invitar.';

-- Ojo: la vigencia **no** se mira a proposito. Reactivar a quien se fue es tocar
-- la ficha de alguien cuya membresia esta cerrada; si se exigiera vigente, la
-- unica operacion para la que existe esta politica seria la unica que no podria.
