import { describe, expect, it } from 'vitest';
import { comoSeVe } from './MesaEnElPlano.tsx';

describe('cómo se ve una mesa', () => {
  it('cada estado conocido, con lo suyo', () => {
    expect(comoSeVe('libre', null).caja).not.toBe(comoSeVe('comiendo', null).caja);
    expect(comoSeVe('esperando', 'tarde').caja).not.toBe(comoSeVe('esperando', 'justo').caja);
  });

  it('lo que no conoce no tumba la sala: una pestaña vieja y una API nueva (Sentry, 5-nov)', () => {
    const abierta = comoSeVe('sin_pedir', null);
    expect(comoSeVe('uno_que_llegara_despues' as never, null)).toBe(abierta);
    expect(comoSeVe('esperando', 'otro_color' as never)).toBe(abierta);
  });
});
