import { useEffect, useRef, useState } from 'react';
import { usarSesion } from '../sesion/Sesion.tsx';

/**
 * La vuelta de Stripe (0048).
 *
 * Stripe devuelve a `estook.com/app/?pago=hecho&sesion=…` al pagar, y a
 * `?pago=cancelado` si se echa atrás. Al volver de pagar se le pregunta a Stripe
 * cómo ha ido (`volver_del_pago`) **sin esperar a su aviso**, se vuelve a preguntar
 * quién soy —y la app entra sola al alta— y se limpia la dirección, para que
 * recargar no lo repita. Mientras, «Confirmando tu pago».
 *
 * Si algo falla por el camino no se queda nadie atascado: el aviso de Stripe llega
 * igual, y `quien_soy` pone la sesión al día.
 */
export function usarLaVueltaDelPago(): boolean {
  const { yo, cliente, refrescar } = usarSesion();
  const [parametros] = useState(() => new URLSearchParams(window.location.search));
  const vuelveDePagar = parametros.get('pago') === 'hecho' && parametros.get('sesion') !== null;
  const [confirmando, setConfirmando] = useState(vuelveDePagar);
  const hecho = useRef(false);

  useEffect(() => {
    if (parametros.get('pago') === null || yo === null || yo.faltaDobleFactor || hecho.current)
      return;
    hecho.current = true;

    const limpiar = () => {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
    };

    if (!vuelveDePagar) {
      limpiar();
      return;
    }

    void (async () => {
      try {
        await cliente.ejecutar('volver_del_pago', { sesion: parametros.get('sesion') ?? '' });
        await refrescar();
      } finally {
        limpiar();
        setConfirmando(false);
      }
    })();
  }, [cliente, parametros, refrescar, vuelveDePagar, yo]);

  return confirmando && yo !== null;
}
