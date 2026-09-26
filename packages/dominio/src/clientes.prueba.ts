import { describe, expect, it } from 'vitest';
import { celdaDeCsv, comoCsv, estaEnLaPestana, laActividad } from './clientes.ts';

const base = {
  diasDeAlta: 60,
  productos: 80,
  diasSinEntrar: 1,
  apuntes7: 40,
  apuntes14: 90,
  apuntes14Antes: 100,
};

describe('la actividad de un cliente', () => {
  it('entra y apunta: activo', () => {
    expect(laActividad(base)).toBe('activo');
  });

  it('más de una semana de alta y menos de diez productos: sin estrenar', () => {
    expect(laActividad({ ...base, diasDeAlta: 9, productos: 4 })).toBe('sin_estrenar');
    // Recién llegado, todavía no: le damos su semana.
    expect(laActividad({ ...base, diasDeAlta: 3, productos: 0 })).toBe('activo');
  });

  it('nadie ha entrado en catorce días, o nunca: dormido', () => {
    expect(laActividad({ ...base, diasSinEntrar: 15 })).toBe('dormido');
    expect(laActividad({ ...base, diasSinEntrar: null })).toBe('dormido');
  });

  it('apunta menos de la mitad que las dos semanas de antes: bajando', () => {
    expect(laActividad({ ...base, apuntes14: 40, apuntes14Antes: 100 })).toBe('bajando');
    expect(laActividad({ ...base, apuntes14: 50, apuntes14Antes: 100 })).not.toBe('bajando');
  });

  it('entra y no apunta nada: entra sin apuntar', () => {
    expect(laActividad({ ...base, apuntes7: 0, apuntes14: 0, apuntes14Antes: 0 })).toBe('mira');
  });
});

describe('las pestañas de la lista', () => {
  it('se están yendo: los que pagan y no lo usan, los que fallan y los que cancelan', () => {
    const paga = { como: 'al_dia' as const, cancelaAlAcabar: false };
    expect(estaEnLaPestana('se_van', { ...paga, actividad: 'dormido' })).toBe(true);
    expect(estaEnLaPestana('se_van', { ...paga, actividad: 'activo' })).toBe(false);
    expect(estaEnLaPestana('se_van', { ...paga, actividad: 'activo', cancelaAlAcabar: true })).toBe(
      true,
    );
    expect(
      estaEnLaPestana('se_van', { como: 'impago', actividad: 'activo', cancelaAlAcabar: false }),
    ).toBe(true);
    expect(
      estaEnLaPestana('se_van', {
        como: 'sin_pagar',
        actividad: 'dormido',
        cancelaAlAcabar: false,
      }),
    ).toBe(false);
  });
});

describe('el CSV', () => {
  it('con punto y coma, comillas donde hace falta, y sin fórmulas', () => {
    expect(celdaDeCsv('Bar "El Puerto"; Cádiz')).toBe('"Bar ""El Puerto""; Cádiz"');
    expect(celdaDeCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celdaDeCsv(null)).toBe('');
    expect(comoCsv(['a', 'b'], [[1, 'dos']])).toBe('a;b\r\n1;dos');
  });
});
