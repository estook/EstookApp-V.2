import { describe, expect, it } from 'vitest';
import { elDestinoDeLaLinea, loQueProponeElNombre, loQueValeEnElBoton } from './botonera.ts';

describe('la botonera (T3, Anexo 11.11)', () => {
  it('propone quién lo prepara y en qué pase sale por el nombre de la sección, como su tabla', () => {
    const propone = (nombre: string) => {
      const p = loQueProponeElNombre(nombre);
      return `${p.quienLoPrepara} ${p.pase}`;
    };
    for (const nombre of [
      'Bebidas',
      'Refrescos',
      'Cervezas',
      'Vinos',
      'Cavas',
      'Cafés',
      'Infusiones',
      'Copas',
      'Cócteles',
      'Licores',
      'Aguas',
    ]) {
      expect(propone(nombre), nombre).toBe('barra bebidas');
    }
    for (const nombre of [
      'Entrantes',
      'Para picar',
      'Tapas',
      'Raciones',
      'Ensaladas',
      'Primeros',
      'Sopas',
      'Para compartir',
    ]) {
      expect(propone(nombre), nombre).toBe('cocina 1');
    }
    for (const nombre of [
      'Principales',
      'Segundos',
      'Carnes',
      'Pescados',
      'Arroces',
      'Pizzas',
      'Hamburguesas',
    ]) {
      expect(propone(nombre), nombre).toBe('cocina 2');
    }
    expect(propone('Postres')).toBe('cocina postre');
    expect(propone('Dulces')).toBe('cocina postre');
    // Cualquier otra, Cocina y 1.º.
    expect(propone('Del chef')).toBe('cocina 1');
    // Si el nombre dice postre, gana el postre: «Postres y cafés» sale con el postre.
    expect(propone('Postres y cafés')).toBe('cocina postre');
  });

  it('un botón hereda lo de su página, salvo lo que cambia (el pan, en Entrantes, de «Nadie»)', () => {
    const entrantes = { quienLoPrepara: 'cocina', pase: '1' } as const;
    expect(loQueValeEnElBoton(entrantes, { quienLoPrepara: null, pase: null })).toEqual(entrantes);
    expect(loQueValeEnElBoton(entrantes, { quienLoPrepara: 'nadie', pase: null })).toEqual({
      quienLoPrepara: 'nadie',
      pase: '1',
    });
  });

  it('«Nadie» no va a ninguna pantalla: la línea va a ninguna parte', () => {
    expect(elDestinoDeLaLinea('nadie')).toBe('ninguno');
    expect(elDestinoDeLaLinea('barra')).toBe('barra');
    expect(elDestinoDeLaLinea('cocina')).toBe('cocina');
  });
});
