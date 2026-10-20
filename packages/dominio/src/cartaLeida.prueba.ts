import { describe, expect, it } from 'vitest';
import {
  claveDelNombre,
  compararConLaCarta,
  leerLasLineas,
  preciosDelFinal,
  resumenDeLoQueCambia,
} from './cartaLeida.ts';

describe('los precios del final de una línea', () => {
  it.each([
    ['Croquetas de jamón ........ 8,50 €', 'Croquetas de jamón', [850]],
    ['Croquetas de jamón 8,50€', 'Croquetas de jamón', [850]],
    ['Pulpo a la gallega   14.5', 'Pulpo a la gallega', [1450]],
    ['Patatas bravas - 6 €', 'Patatas bravas', [600]],
    ['Tarta de queso 5', 'Tarta de queso', [500]],
    ['Calamares ... 6,00 / 10,00 €', 'Calamares', [600, 1000]],
    ['Entrecot 300 g 24', 'Entrecot 300 g', [2400]],
    ['Rioja crianza 2019 ..... 18,00', 'Rioja crianza 2019', [1800]],
  ])('«%s»', (linea, delante, precios) => {
    expect(preciosDelFinal(linea)).toEqual({ delante, precios });
  });

  it.each([
    'Ración de 6',
    'Cosecha 2021',
    'Menú para 2',
    'Agua 1,5l',
    'Abierto desde 1995',
    'Teléfono 943 123 456',
  ])('«%s» no tiene precio', (linea) => {
    expect(preciosDelFinal(linea).precios).toEqual([]);
  });
});

describe('leer las líneas de una carta', () => {
  const CARTA = [
    'IKATZ',
    'ENTRANTES',
    'Croquetas de jamón ........ 8,50 €',
    'Caseras, de jamón ibérico',
    'PULPO A LA GALLEGA ........ 14,50 €',
    'Calamares 6,00 / 10,00',
    'Principales:',
    'Entrecot de vaca',
    '22,00 €',
    'Bacalao al pil pil 18 €',
    'Postres',
    'Tarta de queso 5,50',
    'Croquetas de jamón 9,00',
    'IVA incluido · Consulte los alérgenos',
    'Reservas: 943 123 456 · www.ikatz.com',
  ];

  it('saca platos, precios, secciones y descripciones', () => {
    const leida = leerLasLineas(CARTA);
    expect(
      leida.platos.map((p) => [p.seccion, p.nombre, p.precioCentimos, p.otrosPrecios]),
    ).toEqual([
      ['Entrantes', 'Croquetas de jamón', 850, []],
      ['Entrantes', 'Pulpo a la gallega', 1450, []],
      ['Entrantes', 'Calamares', 1000, [600]],
      ['Principales', 'Entrecot de vaca', 2200, []],
      ['Principales', 'Bacalao al pil pil', 1800, []],
      ['Postres', 'Tarta de queso', 550, []],
    ]);
    expect(leida.platos[0]?.descripcion).toBe('Caseras, de jamón ibérico');
  });

  it('un plato que sale dos veces se queda con el primero', () => {
    const leida = leerLasLineas(CARTA);
    expect(leida.platos.filter((p) => p.nombre === 'Croquetas de jamón')).toHaveLength(1);
  });

  it('el pie de la carta no son platos', () => {
    const leida = leerLasLineas(CARTA);
    expect(leida.platos.some((p) => /iva|reservas/i.test(p.nombre))).toBe(false);
  });
});

describe('comparar con tu carta', () => {
  const MIA = [
    { id: 'a', nombre: 'Croquetas de jamón', precioCentimos: 850, activo: true },
    { id: 'b', nombre: 'Pulpo a la gallega', precioCentimos: 1300, activo: true },
    { id: 'c', nombre: 'Calamares', precioCentimos: 1000, activo: true },
    { id: 'd', nombre: 'Ensaladilla rusa', precioCentimos: 600, activo: true },
    { id: 'e', nombre: 'Bacalao al pil pil', precioCentimos: 1700, activo: true },
    { id: 'f', nombre: 'Tarta de queso', precioCentimos: 550, activo: false },
  ];

  it('una carta con dos precios cambiados propone exactamente esos dos', () => {
    // Plan, M10, «Terminado cuando».
    const leida = leerLasLineas([
      'Croquetas de jamón 8,50',
      'Pulpo a la gallega 14,50',
      'Calamares 10,00',
      'Ensaladilla rusa 6,00',
      'Bacalao al pil pil 18,00',
    ]);
    const cambia = compararConLaCarta(leida.platos, MIA);
    expect(cambia.precios).toEqual([
      { platoId: 'b', nombre: 'Pulpo a la gallega', antes: 1300, ahora: 1450 },
      { platoId: 'e', nombre: 'Bacalao al pil pil', antes: 1700, ahora: 1800 },
    ]);
    expect(cambia.nuevos).toEqual([]);
    expect(cambia.yaNoEstan).toEqual([]);
    expect(cambia.iguales).toBe(3);
  });

  it('los nuevos, los que ya no están y lo archivado que vuelve', () => {
    const leida = leerLasLineas(['CROQUETAS DE JAMON 8,50', 'Gildas 3,00', 'Tarta de queso 5,50']);
    const cambia = compararConLaCarta(leida.platos, MIA);
    expect(cambia.nuevos.map((p) => p.nombre)).toEqual(['Gildas', 'Tarta de queso']);
    expect(cambia.yaNoEstan.map((p) => p.nombre)).toEqual([
      'Bacalao al pil pil',
      'Calamares',
      'Ensaladilla rusa',
      'Pulpo a la gallega',
    ]);
    expect(resumenDeLoQueCambia(cambia)).toBe('2 platos nuevos · 4 que ya no están');
  });

  it('se empareja por el nombre exacto, sin parecidos', () => {
    expect(claveDelNombre('Croquetas de jamón.')).toBe(claveDelNombre('CROQUETAS DE JAMON'));
    const cambia = compararConLaCarta(leerLasLineas(['Croquetas caseras 8,50']).platos, MIA);
    expect(cambia.nuevos.map((p) => p.nombre)).toEqual(['Croquetas caseras']);
  });

  it('nada que cambiar se dice así', () => {
    const cambia = compararConLaCarta([], []);
    expect(resumenDeLoQueCambia(cambia)).toBe('Tu carta ya está como la leída');
  });
});
