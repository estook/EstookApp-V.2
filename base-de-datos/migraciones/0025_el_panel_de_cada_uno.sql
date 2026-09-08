-- 0025 · El Panel de cada uno
--
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── Lo que el Manifiesto prometia y no existia ──────────────────────────────
--
-- «Una rejilla de widgets que cada uno coloca a su gusto, arrastrando. La
-- configuracion se guarda **por persona y por dispositivo**: el gerente puede
-- tener un Panel en el ordenador y otro distinto en el movil» (Manifiesto 6).
--
-- Lo que habia era **seis tarjetas fijas escritas a mano en el codigo**, iguales
-- para las doce clases de rol, sin poder quitar ninguna ni anadir ninguna. Y una
-- de las seis era un andamio de pruebas —«apuntar una nota de prueba»— publicado
-- en el Panel de un negocio de verdad.
--
-- ── Por que en el servidor, y no en el navegador ────────────────────────────
--
-- Porque es exactamente la leccion de la 0024, y esta escrita ahi con estas
-- palabras: «"para siempre" tiene que ser para siempre **en todos sus
-- aparatos**». Guardar la composicion del Panel en `localStorage` seria
-- montarselo en el ordenador y encontrarse el de fabrica en el telefono, o
-- perderlo al cambiar de movil. La composicion de la pantalla que alguien ve cada
-- manana no vive en un navegador.
--
-- Y hay una segunda razon, que es la que decide el diseno de la tabla: **Fogon
-- tiene que poder leerla**. «Que te ordene lo que hay que atender por lo que mas
-- cuesta si se deja» (M22) necesita saber que le importa a esta persona, y eso
-- esta aqui.
--
-- ── Por persona y por aparato, que son dos cosas ────────────────────────────
--
-- La clave es (persona, aparato), y `aparato` es `movil` o `escritorio` y no el
-- identificador de un dispositivo concreto. Es lo que dice el Manifiesto —«uno en
-- el ordenador y otro distinto en el movil»— y es lo unico que se sostiene: quien
-- se monta su Panel en el movil de casa espera encontrarselo en el de la cocina,
-- no empezar de cero. `estook.dispositivo` existe desde M5 y sirve para las
-- sesiones, que es otra cosa.
--
-- ── Y no lleva local ────────────────────────────────────────────────────────
--
-- A proposito, y es una decision: un area manager que lleva seis locales no
-- quiere montarse seis paneles. Los widgets dicen **que** mirar; el local dice
-- **de donde**, y eso ya lo lleva la sesion. El dia que alguien pida un Panel
-- distinto por local, se anade la columna con su valor nulo para «el de siempre».
--
-- ── Que hay dentro de `widgets` ─────────────────────────────────────────────
--
-- Una lista JSON, en orden, de `{ "id": "...", "tamano": "..." }`. El catalogo de
-- que widgets existen, que permiso pide cada uno y que tamanos admite vive **en
-- el codigo** (`packages/ui/src/panel/catalogo.ts`), igual que el catalogo de
-- apps: es navegacion, no datos del negocio. Aqui solo se guarda la eleccion.
--
-- Por eso la base **no valida los identificadores**: un widget que ya no existe
-- se ignora al pintar, y uno nuevo entra sin migracion. Validarlos aqui obligaria
-- a una migracion por cada widget nuevo, que es justo la clase de acoplamiento
-- que hace que nadie anada widgets.

create table estook.panel_de_persona (
  persona_id      uuid         not null references estook.persona (id) on delete cascade,
  aparato         text         not null,
  widgets         jsonb        not null default '[]'::jsonb,
  version         integer      not null default 1,
  creado_en       timestamptz  not null default now(),
  actualizado_en  timestamptz  not null default now(),

  primary key (persona_id, aparato),

  constraint panel_de_persona_aparato check (aparato in ('movil', 'escritorio')),
  -- Una lista, no un objeto: el orden **es** el dato. Y acotada, porque un Panel
  -- de doscientos widgets no es un Panel, es un scroll infinito, que es justo lo
  -- que el Manifiesto prohibe: «lo que hay, se ve; y se acaba».
  constraint panel_de_persona_es_una_lista check (jsonb_typeof(widgets) = 'array'),
  constraint panel_de_persona_acotado check (jsonb_array_length(widgets) <= 24)
);

comment on table estook.panel_de_persona is
  'Que widgets tiene el Panel de cada persona, en que orden y de que tamano, por aparato. La lista de que widgets existen vive en el codigo, no aqui.';

comment on column estook.panel_de_persona.aparato is
  'movil o escritorio. No es un dispositivo concreto: quien se monta su Panel en un movil espera encontrarselo en otro movil.';

comment on column estook.panel_de_persona.widgets is
  'Lista JSON en orden de { id, tamano }. Un id que ya no existe se ignora al pintar, y uno nuevo entra sin migracion.';

create trigger panel_de_persona_sube_version before update on estook.panel_de_persona
  for each row execute function estook.subir_version();

-- ── Seguridad por filas ─────────────────────────────────────────────────────
--
-- Esta es la tabla mas facil de proteger de todo el esquema, y por eso conviene
-- decir en voz alta lo que no hace: **nadie ve el Panel de nadie**. No es «lo ve
-- quien comparte organizacion», que es la politica de casi todo lo demas: es tuyo
-- y solo tuyo. Un gerente no tiene ningun motivo para saber que widgets se ha
-- puesto un cocinero, y si algun dia lo tuviera, seria una decision escrita.

alter table estook.panel_de_persona enable row level security;

create policy panel_de_persona_solo_mio on estook.panel_de_persona
  for all using (persona_id = estook.persona_actual())
  with check (persona_id = estook.persona_actual());

grant select, insert, update, delete on estook.panel_de_persona to estook_api;
