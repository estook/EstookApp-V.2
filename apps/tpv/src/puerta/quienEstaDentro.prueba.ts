import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dentro } from '../datos/tipos.ts';
import {
  guardarQuienEstaDentro,
  leerQuienEstaDentro,
  olvidarQuienEstaDentro,
} from './quienEstaDentro.ts';

/** Lo justo de `sessionStorage` para probarlo fuera del navegador. */
function unaPestana() {
  const dentro = new Map<string, string>();
  return {
    getItem: (k: string) => dentro.get(k) ?? null,
    setItem: (k: string, v: string) => {
      dentro.set(k, v);
    },
    removeItem: (k: string) => {
      dentro.delete(k);
    },
  };
}

const ANE = {
  turno: '00000000-0000-4000-8000-000000000001',
  persona: { id: 'p1', nombre: 'Ane', iniciales: 'AE' },
  fichaje: { dentro: true },
  caeEn: 'mesas',
} as unknown as Dentro;

describe('recargar no echa a quien está dentro (la Ampliación, 0153, fallo 4)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: unaPestana() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('al recargar antes de que salte el bloqueo, sigue dentro', () => {
    guardarQuienEstaDentro('llave-caja', ANE, 2, 1_000_000);
    expect(leerQuienEstaDentro('llave-caja', 1_000_000 + 119_000)?.persona.nombre).toBe('Ane');
  });

  it('si el bloqueo ya habría saltado, el PIN, y se olvida', () => {
    guardarQuienEstaDentro('llave-caja', ANE, 2, 1_000_000);
    expect(leerQuienEstaDentro('llave-caja', 1_000_000 + 120_000)).toBeNull();
    expect(leerQuienEstaDentro('llave-caja', 1_000_000)).toBeNull();
  });

  it('un aparato que no se bloquea sigue dentro; al salir, se olvida', () => {
    guardarQuienEstaDentro('llave-movil', ANE, null, 0);
    expect(leerQuienEstaDentro('llave-movil', 10 * 3_600_000)?.turno).toBe(ANE.turno);
    olvidarQuienEstaDentro('llave-movil');
    expect(leerQuienEstaDentro('llave-movil')).toBeNull();
  });

  it('lo de un aparato no vale para otro, y lo roto no deja entrar', () => {
    guardarQuienEstaDentro('llave-caja', ANE, 2, 0);
    expect(leerQuienEstaDentro('otra-llave', 0)).toBeNull();
    window.sessionStorage.setItem('estook.tpv.dentro.1', '{roto');
    expect(leerQuienEstaDentro('x', 0)).toBeNull();
  });
});
