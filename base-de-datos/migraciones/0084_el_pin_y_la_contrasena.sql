-- 0084 · El PIN y la contraseña (decisión 0109)
--
-- Richi, el 24-oct, al probar T1: quien crea el restaurante no tenía PIN, no se podía
-- poner uno, y quien olvida el PIN o la contraseña depende de que el gerente esté. Y
-- eligió **la A**: el PIN es solo para los aparatos del local (Estook TPV y fichar), y
-- en Estook se entra con la contraseña o con Google.
--
-- Lo que hace falta en la base es una sola cosa: **los enlaces que se mandan por
-- correo**, de un solo uso y con caducidad, para
--
--   · «He olvidado mi contraseña» (o ponerse la primera): el enlace deja ponerla
--   · «He olvidado mi PIN», desde un aparato del local: el enlace da un PIN nuevo
--     para ese local
--
-- Se guarda la huella del enlace, nunca el enlace: quien se lleve la base no puede
-- usar ninguno. Y **cada petición deja su fila**, se mande algo o no, para contar
-- cuántas llegan desde una dirección: así el tope no dice si un correo existe.
--
-- Lo demás (el PIN de cada local en Mi acceso, el del primer aparato) ya cabe en lo
-- que había: `estook.pin` y `ponerPinNuevo`.

create table estook.enlace_por_correo (
  id           uuid         primary key default gen_random_uuid(),
  para         text         not null,
  -- Nulo si el correo no es de nadie (o no es de nadie del local): no se manda enlace,
  -- pero la petición cuenta igual.
  persona_id   uuid         references estook.persona (id) on delete cascade,
  -- El local del PIN nuevo. Solo en los de «pin».
  local_id     uuid         references estook.local (id) on delete cascade,
  -- SHA-256 del enlace. Nulo si no se mandó ninguno.
  huella       text         unique,
  -- SHA-256 de la dirección desde la que se pidió: para contar, no para saber quién era.
  desde        text         not null,
  pedido_en    timestamptz  not null default now(),
  caduca_en    timestamptz,
  usado_en     timestamptz,

  constraint enlace_para_que check (para in ('contrasena', 'pin')),
  constraint enlace_desde_con_forma check (desde ~ '^[0-9a-f]{64}$'),
  constraint enlace_huella_con_forma check (huella is null or huella ~ '^[0-9a-f]{64}$'),
  -- Un enlace mandado es de alguien y caduca; una petición sin enlace no tiene nada.
  constraint enlace_mandado_entero check (
    (huella is null and caduca_en is null and usado_en is null)
    or (huella is not null and persona_id is not null and caduca_en is not null)
  ),
  -- El del PIN va siempre con su local; el de la contraseña, nunca.
  constraint enlace_del_pin_con_su_local check (
    (para = 'pin' and (huella is null or local_id is not null))
    or (para = 'contrasena' and local_id is null)
  )
);

comment on table estook.enlace_por_correo is
  'Los enlaces de «He olvidado mi contraseña» y «He olvidado mi PIN» (0109): de un uso, con caducidad, y guardados por su huella. Cada petición deja su fila, para el tope por dirección.';

create index enlace_por_direccion on estook.enlace_por_correo (desde, pedido_en);
create index enlace_por_persona on estook.enlace_por_correo (persona_id, para, pedido_en);
create index enlace_por_fecha on estook.enlace_por_correo (pedido_en);

alter table estook.enlace_por_correo enable row level security;

-- Lo pide quien no ha entrado (por eso lo ha olvidado): todo pasa como el sistema, en
-- la API, que comprueba lo suyo. Nadie lo lee desde una pantalla.
create policy enlace_por_correo_el_sistema on estook.enlace_por_correo
  for all using (estook.es_el_sistema()) with check (estook.es_el_sistema());

revoke all on estook.enlace_por_correo from public;
grant select, insert, update, delete on estook.enlace_por_correo to estook_api;
