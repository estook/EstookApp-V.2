import { describe, expect, it } from 'vitest';
import { abrirElCajonEnPapel, laComandaEnPapel, laPruebaEnPapel } from '@estook/dominio';
import {
  IMPRESORA_DE_58_MM,
  aEscPos,
  comoEstaElPapel,
  enDosColumnas,
  enLaPagina858,
  enLineas,
} from './escpos.ts';

function contiene(bytes: Uint8Array, trozo: readonly number[]): boolean {
  outer: for (let i = 0; i + trozo.length <= bytes.length; i++) {
    for (let j = 0; j < trozo.length; j++) if (bytes[i + j] !== trozo[j]) continue outer;
    return true;
  }
  return false;
}

describe('las letras, en la página 858', () => {
  it('las tildes, la ñ, los signos de abrir y el €, en su byte', () => {
    expect(enLaPagina858('áéíóú')).toEqual([0xa0, 0x82, 0xa1, 0xa2, 0xa3]);
    expect(enLaPagina858('ñÑ¿¡€·')).toEqual([0xa4, 0xa5, 0xa8, 0xad, 0xd5, 0xfa]);
    expect(enLaPagina858('ÁÉÍÓÚÜç')).toEqual([0xb5, 0x90, 0xd6, 0xe0, 0xe9, 0x9a, 0x87]);
  });

  it('lo que no está, por su parecido o por «?»: nunca un byte roto', () => {
    expect(enLaPagina858('“Caña”—1…')).toEqual(enLaPagina858('"Caña"-1...'));
    expect(enLaPagina858('🍷')).toEqual([0x3f]);
  });

  it('lo mismo escrito de dos formas (con la tilde suelta) sale igual', () => {
    expect(enLaPagina858('a\u0301')).toEqual([0xa0]);
  });
});

describe('partir en líneas', () => {
  it('por los espacios, sin pasarse del ancho', () => {
    expect(enLineas('Croquetas de jamón ibérico caseras', 16)).toEqual([
      'Croquetas de',
      'jamón ibérico',
      'caseras',
    ]);
  });

  it('una palabra más larga que la línea, a trozos', () => {
    expect(enLineas('Supercalifragilístico', 8)).toEqual(['Supercal', 'ifragilí', 'stico']);
  });

  it('el importe siempre a la derecha, en la última línea del nombre', () => {
    expect(enDosColumnas('2 Caña', '4,40', 20)).toEqual(['2 Caña          4,40']);
    const largo = enDosColumnas('1 Ensalada de tomate de la huerta', '12,50', 20);
    expect(largo.at(-1)?.endsWith('12,50')).toBe(true);
    for (const l of largo) expect(l.length).toBeLessThanOrEqual(20);
  });
});

describe('el papel, en bytes', () => {
  const comanda = laComandaEnPapel({
    sitio: 'cocina',
    que: 'nueva',
    copia: false,
    mesa: 'Mesa 4',
    personas: 2,
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
            alergenos: ['gluten'],
          },
        ],
      },
    ],
    motivo: null,
    quien: null,
    aparato: 'Caja 1',
  });
  const bytes = aEscPos(comanda);

  it('empieza de cero y en la página 858', () => {
    expect(Array.from(bytes.slice(0, 5))).toEqual([0x1b, 0x40, 0x1b, 0x74, 19]);
  });

  it('la mesa va al triple, el negro invertido se pone y se quita, y corta al final', () => {
    expect(contiene(bytes, [0x1d, 0x21, 0x22, 0x1b, 0x45, 1, 0x1d, 0x42, 0])).toBe(true);
    expect(contiene(bytes, [0x1d, 0x42, 1])).toBe(true);
    expect(contiene(bytes, [0x1d, 0x42, 0])).toBe(true);
    expect(Array.from(bytes.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
  });

  it('el cajón es el pulso al pin 2, y nada más que se vea', () => {
    expect(Array.from(aEscPos(abrirElCajonEnPapel()))).toEqual([
      0x1b, 0x40, 0x1b, 0x74, 19, 0x1b, 0x70, 0x00, 0x19, 0xfa,
    ]);
  });

  it('la misma prueba sale idéntica dos veces (reimprimir es reimprimir)', () => {
    const prueba = laPruebaEnPapel({
      local: 'IKATZ',
      impresora: 'Caja',
      cuando: '27/10/2026',
      imprime: [],
    });
    expect(aEscPos(prueba)).toEqual(aEscPos(prueba));
  });

  it('en 58 mm la raya es más corta', () => {
    const raya = { version: 1 as const, piezas: [{ tipo: 'raya' as const }] };
    const en80 = aEscPos(raya).filter((b) => b === 0x2d).length;
    const en58 = aEscPos(raya, IMPRESORA_DE_58_MM).filter((b) => b === 0x2d).length;
    expect([en80, en58]).toEqual([48, 32]);
  });
});

describe('cómo está el papel', () => {
  it('lee los bits de lo que contesta', () => {
    expect(comoEstaElPapel(0x12)).toBe('bien');
    expect(comoEstaElPapel(0x12 | 0x0c)).toBe('poco_papel');
    expect(comoEstaElPapel(0x12 | 0x60)).toBe('sin_papel');
  });
});
