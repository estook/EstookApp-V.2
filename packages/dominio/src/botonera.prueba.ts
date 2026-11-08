import { describe, expect, it } from 'vitest';
import {
  COLORES_DE_LA_BOTONERA,
  ICONOS_DE_LA_SECCION,
  comoSeVeElNombre,
  comoSeVeLaSeccion,
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

describe('el icono y el color de cada sección, por su nombre (R3, 0133)', () => {
  const ve = (nombre: string) => {
    const s = comoSeVeElNombre(nombre);
    return `${s.icono} ${s.color ?? 'gris'}`;
  };

  it('pone lo de la maqueta aprobada por Richi', () => {
    expect(ve('Lo más pedido')).toBe('star amarillo');
    expect(ve('Cervezas')).toBe('beer naranja');
    expect(ve('Cañas')).toBe('beer naranja');
    expect(ve('Vinos')).toBe('wine morado');
    expect(ve('Cavas y espumosos')).toBe('wine morado');
    expect(ve('Cócteles')).toBe('martini rosa');
    expect(ve('Refrescos')).toBe('cup-soda azul');
    expect(ve('Cafés e infusiones')).toBe('coffee marron');
    expect(ve('Desayunos')).toBe('croissant arena');
    expect(ve('Entrantes')).toBe('salad verde');
    expect(ve('Carnes')).toBe('beef rojo');
    expect(ve('Pescados')).toBe('fish turquesa');
    expect(ve('Mariscos')).toBe('shell turquesa');
    expect(ve('Pizzas')).toBe('pizza naranja');
    expect(ve('Hamburguesas')).toBe('sandwich arena');
    expect(ve('Postres')).toBe('cake-slice rosa');
    expect(ve('Pan y agua')).toBe('wheat arena');
    // El repaso del 8-nov (0143): lo principal ya no sale en gris.
    expect(ve('Principales')).toBe('utensils-crossed morado');
    expect(ve('Segundos')).toBe('utensils-crossed morado');
  });

  it('las palabras cortas no se cuelan dentro de otras', () => {
    // «cana» en «americana», «ron» en «Ronda», «ave» en «llave»: no son bebida ni pollo.
    expect(ve('Ensalada americana')).toBe('salad verde');
    expect(ve('Ronda del chef')).toBe('chef-hat naranja');
    expect(ve('Gin tonics')).toBe('martini rosa');
    expect(ve('Aves')).toBe('drumstick ambar');
  });

  it('lo dulce gana a lo que lleva dentro, y lo que no se reconoce va en gris con los cubiertos', () => {
    expect(ve('Tarta de queso')).toBe('cake-slice rosa');
    expect(ve('Helados')).toBe('ice-cream-cone rosa');
    expect(ve('Sugerencias')).toBe('utensils-crossed gris');
  });

  it('lo que elige el local manda; lo que no eligió, lo pone el nombre', () => {
    expect(comoSeVeLaSeccion({ nombre: 'Cervezas', color: 'verde', icono: null })).toEqual({
      icono: 'beer',
      color: 'verde',
    });
    expect(comoSeVeLaSeccion({ nombre: 'Cervezas', color: null, icono: 'wine' })).toEqual({
      icono: 'wine',
      color: 'naranja',
    });
  });

  it('once colores y treinta iconos, sin repetir', () => {
    expect(new Set(COLORES_DE_LA_BOTONERA).size).toBe(11);
    expect(COLORES_DE_LA_BOTONERA).toContain('amarillo');
    expect(COLORES_DE_LA_BOTONERA).toContain('marron');
    expect(new Set(ICONOS_DE_LA_SECCION).size).toBe(30);
  });
});
