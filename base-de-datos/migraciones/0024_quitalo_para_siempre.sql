-- 0024 · «Quitalo para siempre», y que sea de verdad para siempre
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── El fallo que arregla ────────────────────────────────────────────────────
--
-- La tarjeta «Termina de configurar tu local» no se podia quitar. Se quedaba
-- arriba del Panel, la primera de todas, mientras quedara un paso del alta sin
-- responder — y hay pasos que alguien puede no querer responder nunca: quien
-- lleva el local solo no va a invitar a nadie.
--
-- «Una tarjeta que no se puede quitar y que no dice nada es lo peor que se le
-- puede poner encima al Panel a alguien» estaba escrito en el propio fichero de
-- las tarjetas, y aun asi esta no se podia quitar. Lo vio Richi en el movil.
--
-- ── Por que una columna, y no el navegador ──────────────────────────────────
--
-- Porque «para siempre» tiene que ser para siempre **en todos sus aparatos**.
-- Guardarlo en `localStorage` seria quitarla del ordenador y encontrarsela en el
-- telefono, que es exactamente la clase de mentira pequena que hace que uno deje
-- de fiarse de los botones.
--
-- Es la misma razon por la que la 0022 guardo `onboarding_retomado_para` en el
-- servidor: una decision sobre lo que se le ensena a alguien no vive en un
-- navegador.
--
-- ── Y lo que NO hace ────────────────────────────────────────────────────────
--
-- No marca los pasos como hechos ni como saltados. Lo que falta **sigue
-- faltando**, y `el_alta` lo sigue contando igual: esto solo dice «no me lo
-- recuerdes en el Panel». Ajustes sigue pudiendo retomar cualquier paso, y por
-- eso esconder la tarjeta no pierde nada.

alter table estook.local
  add column if not exists panel_recordatorio_oculto boolean not null default false;

comment on column estook.local.panel_recordatorio_oculto is
  'Si alguien pidio que el Panel deje de recordarle lo que falta del alta. No marca nada como hecho: los pasos pendientes siguen pendientes.';
