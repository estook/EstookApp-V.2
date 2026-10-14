import { afterEach, describe, expect, it, vi } from 'vitest';
import { enlaceEstable } from './enlaceEstable.ts';

describe('el enlace estable de una foto (0084)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('la misma foto con otra firma sigue con el enlace de antes: no se descarga otra vez', () => {
    const primero = enlaceEstable(
      'https://x.supabase.co/storage/v1/object/sign/c/cara-1.webp?token=a',
    );
    const segundo = enlaceEstable(
      'https://x.supabase.co/storage/v1/object/sign/c/cara-1.webp?token=b',
    );
    expect(segundo).toBe(primero);
  });

  it('una foto distinta entra al momento', () => {
    enlaceEstable('https://x/object/sign/c/cara-2.webp?token=a');
    expect(enlaceEstable('https://x/object/sign/c/cara-3.webp?token=b')).toBe(
      'https://x/object/sign/c/cara-3.webp?token=b',
    );
  });

  it('pasada media hora, se coge la firma nueva, que la vieja caduca', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
    enlaceEstable('https://x/object/sign/c/logo.webp?token=a');
    vi.setSystemTime(new Date('2026-10-14T10:31:00Z'));
    expect(enlaceEstable('https://x/object/sign/c/logo.webp?token=b')).toBe(
      'https://x/object/sign/c/logo.webp?token=b',
    );
  });

  it('sin enlace, nada', () => {
    expect(enlaceEstable(null)).toBeNull();
    expect(enlaceEstable('')).toBeNull();
  });
});
