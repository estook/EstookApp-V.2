import { describe, expect, it } from 'vitest';
import { aBase64, deBase64, pdfDeImagenes } from './pdfDeImagenes.ts';

/** Un JPEG de mentira: sus primeros bytes y relleno. Lo que importa es que va tal cual. */
const UN_JPEG = new Uint8Array([
  0xff,
  0xd8,
  0xff,
  0xe0,
  ...new Array<number>(120).fill(7),
  0xff,
  0xd9,
]);

function comoTexto(pdf: Uint8Array): string {
  return new TextDecoder('latin1').decode(pdf);
}

describe('un PDF con las páginas en imagen (0153: cada nómina, sola)', () => {
  it('empieza y acaba como un PDF, y lleva el JPEG tal cual', () => {
    const pdf = pdfDeImagenes([{ jpeg: UN_JPEG, ancho: 1400, alto: 1980 }]);
    const texto = comoTexto(pdf);
    expect(texto.startsWith('%PDF-1.4')).toBe(true);
    expect(texto.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(texto).toContain('/Filter /DCTDecode');
    expect(texto).toContain('/Width 1400 /Height 1980');
    expect(texto).toContain('/Count 1');
  });

  it('con dos páginas, dos páginas', () => {
    const pdf = pdfDeImagenes([
      { jpeg: UN_JPEG, ancho: 1400, alto: 1980 },
      { jpeg: UN_JPEG, ancho: 1980, alto: 1400 },
    ]);
    expect(comoTexto(pdf)).toContain('/Count 2');
  });

  it('la tabla dice bien dónde empieza cada objeto', () => {
    const pdf = pdfDeImagenes([{ jpeg: UN_JPEG, ancho: 100, alto: 140 }]);
    const texto = comoTexto(pdf);
    const desde = Number(/startxref\n(\d+)/.exec(texto)?.[1]);
    const tabla = texto.slice(desde);
    expect(tabla.startsWith('xref')).toBe(true);
    const entradas = [...tabla.matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    entradas.forEach((donde, i) => {
      expect(texto.slice(donde).startsWith(`${String(i + 1)} 0 obj`)).toBe(true);
    });
  });

  it('el base64 va y vuelve igual', () => {
    expect([...deBase64(aBase64(UN_JPEG))]).toEqual([...UN_JPEG]);
  });
});
