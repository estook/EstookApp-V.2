import { describe, expect, it } from 'vitest';
import {
  abrirElCajonEnPapel,
  elNombreDelPase,
  esPapelCompuesto,
  importeEnElPapel,
  laComandaEnPapel,
  laCuentaEnPapel,
  laPruebaEnPapel,
  type LaComandaQueSeImprime,
  type PiezaDelPapel,
} from './impresion.ts';

const MESA_4: LaComandaQueSeImprime = {
  sitio: 'cocina',
  que: 'nueva',
  copia: false,
  mesa: 'Mesa 4',
  personas: 4,
  camarero: 'Lucía',
  hora: '13:42',
  alergiasDeLaMesa: ['gluten'],
  notaDeLaMesa: null,
  pases: [
    {
      numero: 1,
      espera: false,
      lineas: [
        {
          cantidad: 2,
          nombre: 'Croquetas',
          opciones: [],
          nota: null,
          pesoGramos: null,
          alergenos: ['gluten', 'lacteos'],
        },
        {
          cantidad: 1,
          nombre: 'Burrata',
          opciones: [],
          nota: null,
          pesoGramos: null,
          alergenos: ['lacteos'],
        },
      ],
    },
    {
      numero: 2,
      espera: true,
      lineas: [
        {
          cantidad: 2,
          nombre: 'Entrecot',
          opciones: ['Patatas'],
          nota: 'uno poco hecho',
          pesoGramos: null,
          alergenos: [],
        },
      ],
    },
  ],
  motivo: null,
  quien: null,
  aparato: 'Comandero · Móvil de Lucía',
};

function textos(piezas: readonly PiezaDelPapel[]): string[] {
  return piezas.flatMap((p) =>
    p.tipo === 'texto'
      ? [p.texto]
      : p.tipo === 'dos_columnas'
        ? [`${p.izquierda}|${p.derecha}`]
        : [],
  );
}

describe('la comanda en papel (T5 · 1, 0119)', () => {
  it('lleva la mesa enorme, el pase que sale ya y el que espera', () => {
    const papel = laComandaEnPapel(MESA_4);
    const mesa = papel.piezas.find((p) => p.tipo === 'texto' && p.texto === 'MESA 4');
    expect(mesa).toMatchObject({ tamano: 'grande', negrita: true });
    expect(textos(papel.piezas)).toEqual(
      expect.arrayContaining([
        'COCINA · 13:42',
        '4 personas · Lucía',
        '1.º · YA',
        '2.º · EN ESPERA',
      ]),
    );
    expect(papel.piezas.at(-1)).toEqual({ tipo: 'cortar' });
  });

  it('marca en negro la alergia de la mesa, y en el plato solo lo que la lleva', () => {
    const papel = laComandaEnPapel(MESA_4);
    const negativos = papel.piezas.filter((p) => p.tipo === 'texto' && p.negativo === true);
    expect(textos(negativos)).toEqual([' ALERGIA EN LA MESA: GLUTEN ', ' LLEVA GLUTEN ']);
  });

  it('pone las opciones y la nota de cada plato', () => {
    expect(textos(laComandaEnPapel(MESA_4).piezas)).toEqual(
      expect.arrayContaining(['   + Patatas', '   » uno poco hecho']),
    );
  });

  it('al marchar dice cuál sale, sin «YA» ni «EN ESPERA»', () => {
    const papel = laComandaEnPapel({ ...MESA_4, que: 'marcha', pases: MESA_4.pases.slice(1) });
    const lo = textos(papel.piezas);
    expect(lo).toContain('¡MARCHA EL 2.º!');
    expect(lo).toContain('2.º');
    expect(lo.join(' ')).not.toContain('EN ESPERA');
  });

  it('lo anulado y lo que vuelve salen arriba, en negro, con su motivo', () => {
    const anulado = laComandaEnPapel({
      ...MESA_4,
      que: 'anulado',
      motivo: 'se equivocó de mesa',
      quien: 'Lo quita Lucía · lo aprueba Richi',
    });
    expect(anulado.piezas).toContainEqual(
      expect.objectContaining({ texto: 'ANULADO', negativo: true }),
    );
    expect(textos(anulado.piezas)).toEqual(
      expect.arrayContaining(['Motivo: se equivocó de mesa', 'Lo quita Lucía · lo aprueba Richi']),
    );
    expect(textos(laComandaEnPapel({ ...MESA_4, que: 'vuelve' }).piezas)).toContain('VUELVE');
  });

  it('la barra no lleva pases, y la copia dice que es copia', () => {
    const barra = laComandaEnPapel({
      ...MESA_4,
      sitio: 'barra',
      copia: true,
      pases: [
        {
          numero: null,
          espera: false,
          lineas: [
            {
              cantidad: 2,
              nombre: 'Caña',
              opciones: [],
              nota: null,
              pesoGramos: null,
              alergenos: [],
            },
          ],
        },
      ],
    });
    const lo = textos(barra.piezas);
    expect(lo[0]).toBe('BARRA · 13:42 · COPIA');
    expect(lo).toContain(' COPIA ');
    expect(lo.join(' ')).not.toContain('1.º');
  });

  it('un pase sin platos no sale', () => {
    const papel = laComandaEnPapel({ ...MESA_4, pases: [{ numero: 3, espera: true, lineas: [] }] });
    expect(textos(papel.piezas).join(' ')).not.toContain('3.º');
  });

  it('el postre se llama postre, como en la sala', () => {
    expect(elNombreDelPase(2)).toBe('2.º');
    expect(elNombreDelPase(4)).toBe('Postre');
  });
});

describe('la cuenta en papel (la precuenta, Anexo 3.5)', () => {
  const papel = laCuentaEnPapel({
    local: 'IKATZ',
    mesa: 'Mesa 4',
    personas: 4,
    camarero: 'Lucía',
    cuando: '27/10/2026 15:10',
    lineas: [
      { cantidad: 2, nombre: 'Caña', importeCentimos: 440 },
      { cantidad: 2, nombre: 'Entrecot', importeCentimos: 4400 },
    ],
    totalCentimos: 4840,
    copia: false,
  });

  it('lleva cada línea con su importe y el total', () => {
    expect(textos(papel.piezas)).toEqual(
      expect.arrayContaining(['2 Caña|4,40', '2 Entrecot|44,00', 'TOTAL|48,40 EUR']),
    );
  });

  it('dice que no es una factura, y no lleva número ni QR', () => {
    const lo = textos(papel.piezas);
    expect(lo).toContain('PRECUENTA');
    expect(lo).toContain('Documento no válido como factura');
    expect(lo.join(' ')).not.toMatch(/VERI\*FACTU|FACTURA SIMPLIFICADA|Serie/i);
  });

  it('los importes, con coma y puntos de miles', () => {
    expect(importeEnElPapel(7890)).toBe('78,90');
    expect(importeEnElPapel(123456)).toBe('1.234,56');
    expect(importeEnElPapel(5)).toBe('0,05');
    expect(importeEnElPapel(-250)).toBe('-2,50');
  });
});

describe('la prueba y el cajón', () => {
  it('la prueba dice qué impresora es y qué va a imprimir', () => {
    const lo = textos(
      laPruebaEnPapel({
        local: 'IKATZ',
        impresora: 'Cocina',
        cuando: '27/10/2026 12:00',
        imprime: ['Cocina'],
      }).piezas,
    );
    expect(lo).toEqual(
      expect.arrayContaining(['Cocina', 'Imprime: Cocina', 'Si lees esto, sale bien.']),
    );
  });

  it('el cajón es solo la orden, sin papel', () => {
    expect(abrirElCajonEnPapel().piezas).toEqual([{ tipo: 'cajon' }]);
  });

  it('reconoce un papel guardado, y no otra cosa', () => {
    expect(esPapelCompuesto(abrirElCajonEnPapel())).toBe(true);
    expect(esPapelCompuesto({ version: 2, piezas: [] })).toBe(false);
    expect(esPapelCompuesto('papel')).toBe(false);
  });
});
