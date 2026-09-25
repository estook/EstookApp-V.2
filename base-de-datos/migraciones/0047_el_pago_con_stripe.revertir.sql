-- Deshace la 0047: sin reloj, sin lo de Stripe y con la suscripción como en la 0018.
--
-- **Las extensiones `pg_cron` y `pg_net` se quedan encendidas**: son de Supabase y
-- no molestan sin trabajos. Lo que se quita es el trabajo y el secreto del Vault, y
-- volver a aplicar la 0047 genera un secreto nuevo.
--
-- **Y lo que se pierde:** a qué cliente y suscripción de Stripe va cada cuenta, el
-- historial de cambios y los avisos ya aplicados. En Stripe no se toca nada; volver
-- a aplicar la 0047 deja todas las cuentas pendientes de pago salvo `ikatz` y los
-- ejemplos, y los avisos siguientes de Stripe vuelven a enlazar cada una.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(j.jobid) from cron.job j where j.jobname = 'estook-latido';
  end if;
  if exists (select 1 from pg_namespace where nspname = 'vault') then
    delete from vault.secrets where name = 'estook_reloj';
  end if;
end;
$$;

drop function if exists estook.las_cuentas();
drop function if exists estook.cambiar_la_suscripcion(uuid, jsonb, text, text);

drop table if exists plataforma.reloj;
drop trigger if exists cambio_de_suscripcion_solo_se_anade on plataforma.cambio_de_suscripcion;
drop table if exists plataforma.cambio_de_suscripcion;
drop function if exists plataforma.cambio_de_suscripcion_no_se_toca();
drop table if exists plataforma.correo_de_la_cuenta;
drop table if exists plataforma.aviso_de_stripe;
drop table if exists plataforma.stripe;
drop function if exists estook.es_el_sistema();

-- La función del disparador, como la dejó la 0018: todo nace en prueba de catorce días.
create or replace function estook.suscripcion_al_crear_organizacion()
returns trigger
language plpgsql
security definer
set search_path = estook, pg_catalog, pg_temp
as $$
begin
  insert into estook.suscripcion (organizacion_id, estado, prueba_hasta)
  values (new.id, 'prueba', current_date + 14)
  on conflict (organizacion_id) do nothing;
  return new;
end;
$$;

-- Las de la casa vuelven a prueba, para que la restricción de la 0018 se cumpla.
update estook.suscripcion
   set estado = 'prueba', prueba_hasta = coalesce(prueba_hasta, current_date + 14)
 where de_la_casa;

alter table estook.suscripcion
  drop constraint if exists suscripcion_modo_conocido,
  drop constraint if exists suscripcion_dias_de_prueba_razonables,
  drop constraint if exists suscripcion_locales_positivos,
  drop constraint if exists suscripcion_intervalo_conocido,
  drop constraint if exists suscripcion_plan_conocido,
  drop column if exists tarjeta,
  drop column if exists stripe_suscripcion,
  drop column if exists stripe_cliente,
  drop column if exists stripe_modo,
  drop column if exists de_la_casa,
  drop column if exists dias_de_prueba,
  drop column if exists impago_desde,
  drop column if exists cancela_al_acabar,
  drop column if exists periodo_hasta,
  drop column if exists locales_pagados,
  drop column if exists intervalo;
