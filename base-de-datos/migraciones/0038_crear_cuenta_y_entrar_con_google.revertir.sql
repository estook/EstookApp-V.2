-- Deshace la 0038: se cierra el registro abierto y la entrada con Google.
--
-- ── Lo que no se deshace, y se dice ──────────────────────────────────────────
--
-- **Postgres no sabe quitar un valor de un tipo enumerado**: `pendiente_de_pago`
-- se queda escrito en `estook.estado_de_suscripcion`, sin usar. El tipo entero
-- desaparece al revertir la 0018, que es la que lo crea.
--
-- Y **las cuentas creadas no se borran**: son personas y negocios de verdad.
-- Por eso esta reversión **para** si hay suscripciones pendientes de pago o
-- sesiones abiertas con Google: deshacer sin mirarlas dejaría cuentas que no
-- pueden entrar, o sesiones que dicen haber entrado de una forma que ya no existe.

do $$
begin
  if exists (select 1 from estook.suscripcion where estado::text = 'pendiente_de_pago') then
    raise exception 'Hay cuentas pendientes de pago. Revertir la 0038 las dejaría sin forma de entrar. Míralas antes.'
      using errcode = '23514';
  end if;
  if exists (select 1 from estook.sesion where entro_con = 'google') then
    raise exception 'Hay sesiones abiertas con Google. Revertir la 0038 dejaría su forma de entrar sin nombre. Míralas antes.'
      using errcode = '23514';
  end if;
end;
$$;

drop function if exists plataforma.oferta_vigente();
drop function if exists estook.unir_identidad(uuid, text, text, text);
drop function if exists estook.persona_por_identidad(text, text, text);
drop function if exists estook.crear_cuenta_con_negocio(text, text, text, text, text, text, integer, text, text);
drop function if exists estook.anotar_intento_de_registro(uuid, boolean, integer);
drop function if exists estook.registro_pendiente_de(text);
drop function if exists estook.pedir_codigo_de_registro(text, text, text, text, text, text, integer, integer, integer);

drop table if exists plataforma.oferta_de_prueba;
drop table if exists estook.identidad_externa;
drop table if exists estook.envio_de_codigo;
drop table if exists estook.registro_pendiente;

alter table estook.sesion drop constraint if exists sesion_entro_con_conocido;
alter table estook.sesion
  add constraint sesion_entro_con_conocido check (entro_con in ('contrasena', 'pin'));
