import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PUERTO_DEL_CENTRO } from '../packages/dominio/src/centro.ts';
import { politicaDeSeguridad } from './politica-de-seguridad.ts';

/**
 * **La política de seguridad y la caja de centro** (T5 · 2 · 2, 0123): sin el puerto de la caja
 * en `connect-src`, el navegador bloquea en silencio lo que el comandero le manda por el wifi, y
 * la cocina no recibe sin internet. Se abre solo en Estook TPV, y solo ese puerto.
 */
describe('la política de seguridad', () => {
  const base = { direccionDeLaApi: 'https://api.estook.com', enDesarrollo: false };

  it('Estook TPV puede hablar con la caja de centro en su puerto, y con nada más del wifi', () => {
    const politica = politicaDeSeguridad({ ...base, puertoDeLaCaja: PUERTO_DEL_CENTRO });
    const conecta = /connect-src ([^;]*)/.exec(politica)?.[1] ?? '';
    expect(conecta.split(' ')).toContain(`http://*:${String(PUERTO_DEL_CENTRO)}`);
    expect(conecta).not.toMatch(/http:\/\/\*(?!:)/);
  });

  it('las demás apps no hablan con el wifi del local', () => {
    expect(politicaDeSeguridad(base)).not.toContain(`:${String(PUERTO_DEL_CENTRO)}`);
  });

  it('la de Estook TPV usa el mismo puerto en el que escucha la caja', () => {
    const configuracion = readFileSync(
      new URL('../apps/tpv/vite.config.ts', import.meta.url),
      'utf8',
    );
    expect(configuracion).toContain(`puertoDeLaCaja: ${String(PUERTO_DEL_CENTRO)},`);
  });
});
