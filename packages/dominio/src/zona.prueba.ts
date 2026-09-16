import { describe, expect, it } from 'vitest';
import { ROLES } from './alcances.ts';
import {
  NOMBRE_DE_LA_ZONA,
  ZONAS,
  ZONAS_DEL_ROL,
  esZona,
  llevaCategorias,
  zonasDe,
} from './zona.ts';

describe('de dónde es cada producto', () => {
  it('un cocinero no ve la barra, y un camarero no ve la cámara', () => {
    expect(ZONAS_DEL_ROL.cocinero).toEqual(['cocina', 'limpieza']);
    expect(ZONAS_DEL_ROL.camarero).toEqual(['sala', 'limpieza']);
  });

  it('los dos ven lo de limpieza, porque los dos limpian', () => {
    expect(ZONAS_DEL_ROL.cocinero).toContain('limpieza');
    expect(ZONAS_DEL_ROL.camarero).toContain('limpieza');
  });

  it('de jefe para arriba se ve todo', () => {
    for (const rol of ROLES) {
      if (rol === 'cocinero' || rol === 'camarero') continue;
      expect([...ZONAS_DEL_ROL[rol]], rol).toEqual([...ZONAS]);
    }
  });

  it('ningún rol se queda sin zonas', () => {
    for (const rol of ROLES) expect(ZONAS_DEL_ROL[rol].length, rol).toBeGreaterThan(0);
  });

  it('quien tiene dos roles ve la suma, no lo que comparten', () => {
    // Nuria es camarera en su local y gerente de otro: en el suyo lo ve todo. Es
    // la misma regla que con los permisos desde M1, gana el más amplio.
    expect([...zonasDe(['camarero', 'gerente'])]).toEqual([...ZONAS]);
    expect([...zonasDe(['cocinero', 'camarero'])]).toEqual([...ZONAS]);
    expect([...zonasDe(['cocinero'])]).toEqual(['cocina', 'limpieza']);
  });

  it('limpieza no lleva categorías, y las otras dos sí', () => {
    expect(llevaCategorias('limpieza')).toBe(false);
    expect(llevaCategorias('cocina')).toBe(true);
    expect(llevaCategorias('sala')).toBe(true);
  });

  it('todas tienen nombre en cristiano', () => {
    for (const zona of ZONAS) expect(NOMBRE_DE_LA_ZONA[zona]).not.toBe('');
  });

  it('lo que llega de fuera se comprueba contra la lista', () => {
    expect(esZona('sala')).toBe(true);
    expect(esZona('terraza')).toBe(false);
    expect(esZona(3)).toBe(false);
  });
});
