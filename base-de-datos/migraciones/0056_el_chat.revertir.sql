-- Deshace la 0056: sin chat.
--
-- **Lo que se pierde:** todos los canales, los mensajes, quién estaba en cada uno,
-- hasta dónde había leído cada cual, las reacciones, lo que esperaba a sonar en el
-- móvil y los temas de lo que llega al segundo. Los ficheros subidos se quedan en el
-- cubo `chat` del almacén, sin nada que los enseñe. El latido del móvil vuelve a ser
-- el de la 0054.

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron')
     or not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;

  begin
    perform cron.schedule(
      'estook-movil',
      '* * * * *',
      $cron$
        select net.http_post(
          url := (select replace(r.url, '/tareas/latir', '/tareas/movil') from plataforma.reloj r where r.unica),
          headers := jsonb_build_object(
            'content-type', 'application/json',
            'x-reloj', (select d.decrypted_secret from vault.decrypted_secrets d where d.name = 'estook_reloj')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 50000
        )
         where exists (
           select 1 from estook.aviso a where a.movil = 'pendiente' and a.movil_desde <= now()
         )
            or exists (
           select 1 from estook.al_movil_programado p where p.hecho_en is null and p.cuando <= now()
         )
      $cron$
    );
  exception when others then
    raise notice 'El latido del móvil no se ha podido devolver al de la 0054: %.', sqlerrm;
  end;
end;
$$;

drop table if exists estook.tema_al_segundo;
drop table if exists estook.chat_al_movil;
drop table if exists estook.reaccion_al_mensaje;
drop table if exists estook.lectura_del_canal;
drop table if exists estook.mensaje;
drop table if exists estook.miembro_del_canal;
drop table if exists estook.canal;
drop function if exists estook.quien_ve_el_canal(uuid);
drop function if exists estook.ve_el_canal(uuid);
drop function if exists estook.puede_ver_el_canal(uuid, uuid);
drop type if exists estook.tipo_de_canal;
