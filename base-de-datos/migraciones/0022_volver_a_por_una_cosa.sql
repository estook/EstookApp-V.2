-- 0022 · Volver al alta a por UNA cosa, y volver al Panel (M5)
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── El fallo que arregla ────────────────────────────────────────────────────
--
-- La tarjeta del Panel «Termina de configurar tu local» ofrece lo que quedó sin
-- responder: «Invita a tu equipo», y debajo «y 1 cosa más, **cuando quieras**».
--
-- Pulsarla llamaba a `retomar_el_alta`, que reabre el alta entera. Y la pantalla
-- del alta, al guardar un paso, avanza al siguiente sin más. Resultado: quien
-- volvia a invitar a su equipo se encontraba **otra vez el paseo y la guia de
-- instalacion**, que ya habia visto. Le habian ofrecido un recado y le metian
-- en el asistente completo.
--
-- «Cuando quieras» y «ahora te lo enseño todo otra vez» no son lo mismo.
--
-- ── Por que hace falta una columna y no basta con mirar los pasos ───────────
--
-- Porque desde los datos no se distingue un alta recien empezada de un alta
-- reabierta: en las dos hay pasos pendientes y un `onboarding_paso`. Lo unico
-- que las separa es **la intencion con la que se abrio**, y eso hay que
-- guardarlo o se pierde en cuanto la pantalla se vuelve a pintar.
--
-- Se guardo en el servidor y no en el navegador a proposito. A donde va alguien
-- despues de guardar es una decision del servidor —igual que las seis
-- comprobaciones al entrar—, y una regla de negocio metida en `sessionStorage`
-- se pierde en cuanto se cambia de aparato.

alter table estook.local
  add column onboarding_retomado_para text;

comment on column estook.local.onboarding_retomado_para is
  'Que paso se reabrio desde el Panel, si es que se reabrio uno solo. Al guardarlo, el alta se cierra y se vuelve al Panel en vez de seguir con los siguientes.';

-- Los ocho codigos y nada mas. Un codigo inventado aqui mandaria a la pantalla a
-- un paso que no existe, y eso se ve como una pantalla en blanco.
alter table estook.local
  add constraint local_retomado_para_es_un_paso check (
    onboarding_retomado_para is null
    or onboarding_retomado_para in (
      'quien_eres', 'tipo_de_local', 'cuantos_locales', 'donde_esta',
      'marca', 'fiscal_y_objetivos', 'equipo', 'paseo'
    )
  );

-- Y no puede quedar puesto en un alta terminada: si el alta esta cerrada, no hay
-- ningun recado abierto. Es la misma clase de coherencia que
-- `local_onboarding_terminado_coherente`, y por la misma razon: un estado
-- imposible que la base de datos permite acaba existiendo.
alter table estook.local
  add constraint local_retomado_solo_con_el_alta_abierta check (
    onboarding_retomado_para is null or not onboarding_terminado
  );
