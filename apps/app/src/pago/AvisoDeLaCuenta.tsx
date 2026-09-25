import { useNavigate } from 'react-router-dom';
import { Aviso, Boton } from '@estook/ui';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * El aviso de arriba cuando la cuenta no está al día (0048).
 *
 * Richi, 25-sep: si falla un cobro, **al entrar** se ve que no se ha podido cobrar,
 * los días que quedan y que no se pierde nada. Y en solo lectura, por qué no deja
 * apuntar. A quien lleva la facturación, con su botón; a los demás, a quién decírselo.
 * En Ajustes → Suscripción no sale: ahí ya está dicho con más detalle.
 */
export function AvisoDeLaCuenta({
  enAjustesDeSuscripcion,
}: {
  readonly enAjustesDeSuscripcion: boolean;
}) {
  const { yo } = usarSesion();
  const navegar = useNavigate();
  const cuenta = yo?.cuenta ?? null;
  if (cuenta === null || enAjustesDeSuscripcion) return null;
  if (cuenta.como !== 'impago' && cuenta.como !== 'solo_lectura') return null;

  const laPaga = cuenta.laLlevo;
  const quedan = cuenta.diasQuedan ?? 0;
  const boton = laPaga ? (
    <Boton
      tono="principal"
      onClick={() => {
        navegar('/ajustes/suscripcion');
      }}
    >
      Pagar ahora
    </Boton>
  ) : undefined;

  return cuenta.como === 'impago' ? (
    <Aviso
      tono="mal"
      titulo={`No hemos podido cobrar la suscripción · ${quedan === 1 ? 'queda 1 día' : `quedan ${String(quedan)} días`}`}
      accion={boton}
    >
      {laPaga
        ? 'Después la cuenta pasa a solo lectura. No se pierde nada.'
        : 'Avisa a quien lleva la cuenta. No se pierde nada.'}
    </Aviso>
  ) : (
    <Aviso tono="atencion" titulo="La cuenta está en solo lectura" accion={boton}>
      {laPaga
        ? 'Puedes verlo todo, pero no apuntar nada hasta pagar. No se ha perdido nada.'
        : 'Puedes verlo todo, pero no apuntar nada. Avisa a quien lleva la cuenta.'}
    </Aviso>
  );
}
