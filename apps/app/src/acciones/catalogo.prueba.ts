import { describe, expect, it } from 'vitest';
import type { PermisosResueltos } from '@estook/permisos';
import { accionPorId, accionesDeAqui, accionesQuePuedo, puedoHacer } from './catalogo.tsx';

/**
 * **Con Estook TPV, «Cerrar la caja» no se ofrece en Estook** (R3 · 1, 0144): el día lo cierra la caja
 * y en Estook solo se ven sus cierres. Un botón que lleva a una pantalla de solo ver es el fallo que
 * este proyecto persigue: promete y no hace.
 */
const QUIEN_CIERRA: PermisosResueltos = { 'dato.ventas': 'ver_y_editar' };

describe('las acciones que se van con Estook TPV', () => {
  const cerrar = accionPorId('cerrar-caja');

  it('sin Estook TPV, quien cierra la caja la tiene a mano', () => {
    expect(cerrar).toBeDefined();
    if (cerrar === undefined) return;
    expect(puedoHacer(QUIEN_CIERRA, cerrar)).toBe(true);
    expect(accionesQuePuedo(QUIEN_CIERRA).map((a) => a.id)).toContain('cerrar-caja');
    expect(accionesDeAqui(QUIEN_CIERRA, 'servicio').map((a) => a.id)).toContain('cerrar-caja');
  });

  it('con Estook TPV no sale en ningún sitio, y lo demás sigue igual', () => {
    if (cerrar === undefined) return;
    expect(puedoHacer(QUIEN_CIERRA, cerrar, true)).toBe(false);
    expect(accionesQuePuedo(QUIEN_CIERRA, true).map((a) => a.id)).not.toContain('cerrar-caja');
    expect(accionesDeAqui(QUIEN_CIERRA, 'servicio', true).map((a) => a.id)).not.toContain(
      'cerrar-caja',
    );
    expect(accionesDeAqui(QUIEN_CIERRA, '', true).map((a) => a.id)).not.toContain('cerrar-caja');
    // Solo se van las que hace la caja: las otras no cambian.
    const sinEllas = accionesQuePuedo(QUIEN_CIERRA).filter((a) => a.sinEstookTpv !== true);
    expect(accionesQuePuedo(QUIEN_CIERRA, true)).toEqual(sinEllas);
  });
});
