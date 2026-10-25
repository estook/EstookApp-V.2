import { describe, expect, it } from 'vitest';
import {
  elDestinoDeLaLinea,
  esElPan,
  esPanOAgua,
  laPaginaDeSiempre,
  loQueProponeElNombre,
  loQueValeEnElBoton,
} from './botonera.ts';

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

describe('el pan, el agua y los cafés, en su página de siempre (0112)', () => {
  it('una sección de pan la sirve el camarero, al momento', () => {
    expect(loQueProponeElNombre('Pan y agua')).toEqual({
      quienLoPrepara: 'nadie',
      pase: 'bebidas',
    });
    expect(loQueProponeElNombre('Panes')).toEqual({ quienLoPrepara: 'nadie', pase: 'bebidas' });
    // «Empanadas» no es pan.
    expect(loQueProponeElNombre('Empanadas').quienLoPrepara).toBe('cocina');
  });

  it('el pan y el agua van a «Pan y agua»; los cafés, a «Cafés»; lo que se cocina, no', () => {
    expect(laPaginaDeSiempre('Pan', 'Entrantes')).toBe('pan');
    expect(laPaginaDeSiempre('Pan de pueblo', 'Entrantes')).toBe('pan');
    expect(laPaginaDeSiempre('Regañás', 'Para picar')).toBe('pan');
    expect(laPaginaDeSiempre('Agua mineral', 'Bebidas')).toBe('pan');
    expect(laPaginaDeSiempre('Agua con gas', 'Refrescos')).toBe('pan');
    expect(laPaginaDeSiempre('Café con leche', 'Postres')).toBe('cafes');
    expect(laPaginaDeSiempre('Cortado', 'Bebidas')).toBe('cafes');
    expect(laPaginaDeSiempre('Infusión de manzanilla', 'Postres y cafés')).toBeNull();
    expect(laPaginaDeSiempre('Té verde', 'Bebidas')).toBe('cafes');
    // Lo que se cocina, aunque lleve pan, y lo que no es café aunque empiece igual.
    expect(laPaginaDeSiempre('Pan con tomate', 'Entrantes')).toBeNull();
    expect(laPaginaDeSiempre('Pan de ajo', 'Entrantes')).toBeNull();
    expect(laPaginaDeSiempre('Agua de Valencia', 'Copas')).toBeNull();
    expect(laPaginaDeSiempre('Ternera guisada', 'Principales')).toBeNull();
    expect(laPaginaDeSiempre('Tarta de café', 'Postres')).toBeNull();
    // Si ya está en su sección, se queda en su página.
    expect(laPaginaDeSiempre('Pan', 'Pan y agua')).toBeNull();
    expect(laPaginaDeSiempre('Cortado', 'Cafés e infusiones')).toBeNull();
  });

  it('el pan de la mesa, para «Pan para 4»', () => {
    expect(esElPan('Pan')).toBe(true);
    expect(esElPan('Cesta de pan')).toBe(true);
    expect(esElPan('Agua mineral')).toBe(false);
    expect(esPanOAgua('Agua mineral')).toBe(true);
    expect(esElPan('Pan con tomate')).toBe(false);
  });
});
