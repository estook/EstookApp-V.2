import { useEffect } from 'react';
import type { ElAparatoPorDentro } from '../datos/tipos.ts';
import {
  conocerLaCaja,
  elPermisoDeChrome,
  probarLaCaja,
  type LaCajaDelAparato,
} from '../sinInternet/laCaja.ts';

/**
 * **La caja de centro, desde cada aparato** (T5 · 2 · 2, decisión 0123): con lo que dice el
 * latido (o lo guardado, sin internet), el aparato sabe dónde está la caja; y cada minuto mira
 * si llega a ella, para que Aparatos lo enseñe antes de que falte internet.
 *
 * Si Chrome aún no ha dado el permiso de red local, no se prueba: probar es lo que hace que
 * Chrome pregunte, y eso lo decide quien toca «Seguir» en el plano (`LaFranjaDeLaCaja`).
 */
const CADA = 60_000;

export function usarLaCajaDeCentro(aparato: ElAparatoPorDentro | undefined): void {
  const terminalId = aparato?.terminalId ?? null;
  // En texto: así un latido que dice lo mismo no vuelve a empezar nada.
  const elCentro = aparato?.elCentro ?? null;
  const clave = elCentro === null ? null : JSON.stringify(elCentro);

  useEffect(() => {
    if (terminalId === null) return undefined;
    conocerLaCaja(clave === null ? null : (JSON.parse(clave) as LaCajaDelAparato), terminalId);
    if (clave === null) return undefined;
    const mirar = () => {
      void elPermisoDeChrome().then((permiso) => {
        if (permiso === 'concedido' || permiso === 'no_hay') void probarLaCaja();
      });
    };
    mirar();
    const reloj = window.setInterval(mirar, CADA);
    return () => {
      window.clearInterval(reloj);
    };
  }, [clave, terminalId]);
}
