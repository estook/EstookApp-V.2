-- 0042 · «En línea» de verdad (repaso del 23-sep-2026)
--
-- Lo vio Richi: «sale "en línea" gente que no está en la app. Que se marque solo con
-- la app abierta, como en las apps profesionales».
--
-- ── Los dos fallos que había ─────────────────────────────────────────────────
--
-- 1. **«En línea» era «tiene una sesión sin cerrar».** Una sesión dura días, así que
--    salía en línea cualquiera que hubiera entrado esta semana y no hubiera pulsado
--    «Salir», con el teléfono en el bolsillo.
--
-- 2. **Y solo lo veía bien quien puede quitar accesos.** La consulta leía
--    `estook.sesion`, y las políticas de la 0018 solo enseñan las sesiones propias y
--    las de la gente a la que puedes cerrárselas (`accion.invitar_personas`). Un jefe
--    de cocina, que lleva a su cocina, veía a todos «fuera de línea» menos a sí mismo.
--
-- ── Cómo queda ───────────────────────────────────────────────────────────────
--
--   · Mientras la app está **abierta y a la vista**, avisa cada poco de que sigue ahí
--     (`sigo_aqui`), y al esconderse —otra app, la pantalla apagada— avisa de que ya
--     no. Se apunta en la **sesión**, que es el aparato: el móvil puede estar en la
--     mano y el ordenador de la oficina cerrado.
--   · «En línea» es: alguna sesión viva, a la vista, y con aviso de hace menos de
--     dos minutos. Si el aparato se queda sin cobertura o se apaga sin avisar, en dos
--     minutos deja de salir.
--   · «Última vez» es el último aviso, o la última entrada si nunca hubo aviso. Antes
--     era solo la última entrada, así que quien usaba la app todo el día desde el
--     lunes salía «hace cuatro días».
--   · Las dos cosas las responde la base con dos funciones que **solo contestan de
--     gente que quien pregunta puede ver** (`personas_visibles`, 0005) y que no
--     enseñan nada más de la sesión: ni aparato, ni cuándo caduca, ni desde dónde.

alter table estook.sesion
  add column visto_en   timestamptz,
  add column a_la_vista boolean not null default false;

comment on column estook.sesion.visto_en is
  'El último «sigo aquí» de este aparato: la app estaba abierta. Nulo si nunca avisó.';
comment on column estook.sesion.a_la_vista is
  'Si en el último aviso la app estaba a la vista. Al esconderse avisa con falso.';

create function estook.esta_en_linea(p_persona uuid)
returns boolean
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  select exists (
    select 1
      from estook.sesion s
      join estook.persona p on p.id = s.persona_id and p.activa
     where s.persona_id = p_persona
       and s.cerrada_en is null
       and s.caduca_en > now()
       and s.a_la_vista
       and s.visto_en > now() - interval '2 minutes'
       and p_persona in (select v.persona_id from estook.personas_visibles() v)
  )
$$;

comment on function estook.esta_en_linea(uuid) is
  'Si esa persona tiene ahora la app abierta y a la vista en algún aparato. Solo contesta de gente que quien pregunta puede ver; de las demás, falso.';

create function estook.visto_por_ultima_vez(p_persona uuid)
returns timestamptz
language sql
stable
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
  -- `greatest` no hace caso de los nulos: sin avisos, queda la última entrada.
  select greatest(p.ultimo_acceso_en, (select max(s.visto_en) from estook.sesion s
                                        where s.persona_id = p.id))
    from estook.persona p
   where p.id = p_persona
     and p_persona in (select v.persona_id from estook.personas_visibles() v)
$$;

comment on function estook.visto_por_ultima_vez(uuid) is
  'La última vez que esa persona tuvo la app abierta, o su última entrada si nunca avisó. Solo de gente que quien pregunta puede ver; de las demás, nulo.';

do $$
declare
  la_funcion text;
begin
  foreach la_funcion in array array[
    'estook.esta_en_linea(uuid)',
    'estook.visto_por_ultima_vez(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', la_funcion);
    execute format('grant execute on function %s to estook_api', la_funcion);
  end loop;
end
$$;
