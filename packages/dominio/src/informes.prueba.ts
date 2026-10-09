import { describe, expect, it } from 'vitest';
import {
  atrasDe,
  elPeriodoDelInforme,
  hayDatos,
  lasCifrasDelCorreo,
  lasFlechasDelInforme,
  lasFrasesJuntas,
  lasTresFrases,
  losDiasEntre,
  type CifraDelInforme,
} from './informes.ts';
import { fechaOperativa } from './tiempo.ts';

/**
 * Los informes · Tu día, Tu semana y Tu mes (R2 · 0053).
 *
 * El lunes 28 de septiembre de 2026 es el día de las pruebas: Tu día es el domingo
 * 27, Tu semana va del lunes 21 al domingo 27, y Tu mes es agosto.
 */
const LUNES = fechaOperativa('2026-09-28');
const dia = fechaOperativa;

describe('el periodo de cada informe', () => {
  it('Tu día es ayer, y se compara con el mismo día de la semana anterior', () => {
    const periodo = elPeriodoDelInforme('dia', LUNES);
    expect(periodo).toMatchObject({
      desde: '2026-09-27',
      hasta: '2026-09-27',
      antesDesde: '2026-09-20',
      antesHasta: '2026-09-20',
      nombre: 'el domingo 27 de septiembre',
      frenteA: 'que el domingo anterior',
      comparado: 'frente al domingo anterior',
      dias: 1,
    });
  });

  it('Tu semana es la de lunes a domingo que acaba de pasar, y se compara con la de antes', () => {
    const periodo = elPeriodoDelInforme('semana', LUNES);
    expect(periodo).toMatchObject({
      desde: '2026-09-21',
      hasta: '2026-09-27',
      antesDesde: '2026-09-14',
      antesHasta: '2026-09-20',
      nombre: 'del 21 al 27 de septiembre',
      dias: 7,
    });
    // Un miércoles, la semana pasada sigue siendo la misma: la de esta va por la mitad.
    expect(elPeriodoDelInforme('semana', dia('2026-09-30')).desde).toBe('2026-09-21');
  });

  it('una semana entre dos meses dice los dos', () => {
    expect(elPeriodoDelInforme('semana', dia('2026-10-05')).nombre).toBe(
      'del 28 de septiembre al 4 de octubre',
    );
  });

  it('Tu mes es el mes que acaba de pasar, con sus días, frente al de antes', () => {
    const periodo = elPeriodoDelInforme('mes', LUNES);
    expect(periodo).toMatchObject({
      desde: '2026-08-01',
      hasta: '2026-08-31',
      antesDesde: '2026-07-01',
      antesHasta: '2026-07-31',
      nombre: 'agosto de 2026',
      frenteA: 'que en julio',
      dias: 31,
    });
    // En enero, el de antes es diciembre del año pasado.
    expect(elPeriodoDelInforme('mes', dia('2027-01-01'))).toMatchObject({
      desde: '2026-12-01',
      hasta: '2026-12-31',
      antesDesde: '2026-11-01',
      dias: 31,
    });
    // Y febrero tiene los suyos.
    expect(elPeriodoDelInforme('mes', dia('2027-03-10')).dias).toBe(28);
  });

  it('hacia atrás, y de vuelta: la fecha de dentro de un periodo dice cuántos atrás está', () => {
    for (const tipo of ['dia', 'semana', 'mes'] as const) {
      for (const atras of [0, 1, 5]) {
        const periodo = elPeriodoDelInforme(tipo, LUNES, atras);
        expect(atrasDe(tipo, LUNES, periodo.desde)).toBe(atras);
        expect(atrasDe(tipo, LUNES, periodo.hasta)).toBe(atras);
      }
    }
    // Hoy o después es el último cerrado, nunca uno que va por la mitad.
    expect(atrasDe('semana', LUNES, LUNES)).toBe(0);
    expect(atrasDe('dia', LUNES, dia('2026-10-10'))).toBe(0);
  });

  it('las flechas van un periodo atrás y uno adelante, también en Tu día (Richi, 9-oct)', () => {
    // Antes, en Tu día, «Anterior» saltaba al mismo día de la semana anterior —el que
    // se compara— y «Siguiente» avanzaba uno: un viaje de ida de siete y de vuelta de uno.
    expect(lasFlechasDelInforme('dia', LUNES, 0)).toEqual({
      anteriorDel: '2026-09-26',
      siguienteDel: null,
    });
    expect(lasFlechasDelInforme('dia', LUNES, 1)).toEqual({
      anteriorDel: '2026-09-25',
      siguienteDel: '2026-09-27',
    });
    expect(lasFlechasDelInforme('semana', LUNES, 1)).toEqual({
      anteriorDel: '2026-09-07',
      siguienteDel: '2026-09-21',
    });
    expect(lasFlechasDelInforme('mes', LUNES, 1)).toEqual({
      anteriorDel: '2026-06-01',
      siguienteDel: '2026-08-01',
    });
    // Ida y vuelta: atrás y luego adelante deja donde se estaba, en los tres.
    for (const tipo of ['dia', 'semana', 'mes'] as const) {
      const ida = lasFlechasDelInforme(tipo, LUNES, 3).anteriorDel;
      expect(ida).not.toBeNull();
      const atras = atrasDe(tipo, LUNES, ida ?? LUNES);
      expect(atras).toBe(4);
      const vuelta = lasFlechasDelInforme(tipo, LUNES, atras).siguienteDel;
      expect(atrasDe(tipo, LUNES, vuelta ?? LUNES)).toBe(3);
    }
    // Y al fondo, sin flecha de atrás.
    expect(lasFlechasDelInforme('mes', LUNES, 12).anteriorDel).toBeNull();
  });

  it('los días de un tramo, los dos extremos dentro', () => {
    expect(losDiasEntre(dia('2026-09-27'), dia('2026-09-29'))).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
    ]);
  });
});

describe('las tres frases', () => {
  const semana = elPeriodoDelInforme('semana', LUNES);
  const cifra = (
    indicador: CifraDelInforme['indicador'],
    total: number | null,
    anterior: number | null,
    diasConDato = 7,
  ): CifraDelInforme => ({ indicador, total, anterior, diasConDato });

  it('lo mejor y lo peor son lo que más se mueve a bien y a mal, frente a lo que era', () => {
    const frases = lasTresFrases(
      [
        cifra('ventas', 421_000, 376_000),
        // La merma sube un 30 %: es lo que peor va.
        cifra('merma', 8_450, 6_500),
        // El food cost baja 3 puntos sobre 33: un 9 % mejor, menos que las ventas (12 %).
        cifra('food-cost', 30, 33),
        // Las compras son neutras: no son ni buena ni mala noticia.
        cifra('compras', 200_000, 100_000),
      ],
      semana,
    );
    expect(frases.mejor).toBe(
      'Lo mejor: las ventas, 4.210,00 €, un 12 % más que la semana anterior.',
    );
    expect(frases.peor).toBe('Lo peor: la merma, 84,50 €, un 30 % más que la semana anterior.');
    expect(frases.mirar).toBe('Nada más que mirar: todo en su sitio.');
  });

  it('con lo mismo, gana la que va antes: las ventas antes que el ticket medio', () => {
    // 1.234 € con 30 tickets frente a 1.000 € con 30: suben las dos un 23,4 %, y el
    // ticket medio, redondeado a céntimos, un pelo más.
    const frases = lasTresFrases(
      [cifra('ventas', 123_400, 100_000), cifra('ticket-medio', 4_113, 3_333)],
      semana,
    );
    expect(frases.mejor).toContain('Lo mejor: las ventas');
  });

  it('las cajas cerradas no son noticia: dicen si faltan datos, no cómo va', () => {
    const frases = lasTresFrases([cifra('cierres', 5, 0)], semana);
    expect(frases.mejor).toBeNull();
  });

  it('en puntos lo que ya es un porcentaje', () => {
    const frases = lasTresFrases([cifra('food-cost', 34, 31)], semana);
    expect(frases.peor).toBe('Lo peor: el food cost, 34 %, 3 puntos más que la semana anterior.');
    expect(frases.mejor).toBeNull();
  });

  it('lo que apenas se mueve no se cuenta', () => {
    const frases = lasTresFrases([cifra('ventas', 101_000, 100_000)], semana);
    expect(frases.mejor).toBeNull();
    expect(frases.peor).toBeNull();
  });

  it('lo que conviene mirar: primero los días sin caja cerrada', () => {
    const frases = lasTresFrases([cifra('ventas', 300_000, 280_000, 5)], semana, {
      fueraDeObjetivo: ['food cost, 34 %, con objetivo 30 %'],
    });
    expect(frases.mirar).toBe(
      '2 días sin caja cerrada: las ventas y el food cost cuentan solo los otros 5.',
    );
    expect(lasTresFrases([cifra('ventas', null, null, 0)], semana).mirar).toContain(
      'No se cerró la caja ningún día',
    );
    const ayer = elPeriodoDelInforme('dia', LUNES);
    expect(lasTresFrases([cifra('ventas', null, 90_000, 0)], ayer).mirar).toBe(
      'Ese día no se cerró la caja: sin ella no hay ventas ni food cost.',
    );
  });

  it('después, lo que está fuera de objetivo', () => {
    const frases = lasTresFrases([cifra('ventas', 300_000, 280_000)], semana, {
      fueraDeObjetivo: ['food cost, 34 %, con objetivo 30 %'],
    });
    expect(frases.mirar).toBe('Fuera de objetivo: food cost, 34 %, con objetivo 30 %.');
  });

  it('sin ningún dato, se dice, y el informe no tiene nada que contar', () => {
    const vacias = [cifra('merma', 0, 0), cifra('compras', 0, 0)];
    expect(hayDatos(vacias)).toBe(false);
    expect(lasTresFrases(vacias, semana).mirar).toContain('Todavía no hay datos');
    // Una merma de verdad sí es un dato.
    expect(hayDatos([cifra('merma', 1_200, 0)])).toBe(true);
    // Y unas ventas de cero con la caja cerrada, también: se vendió cero.
    expect(hayDatos([cifra('ventas', 0, 10_000)])).toBe(true);
  });

  it('juntas, sin las que no hay', () => {
    expect(
      lasFrasesJuntas({ mejor: null, peor: 'Lo peor: la merma.', mirar: 'Nada más que mirar.' }),
    ).toBe('Lo peor: la merma. Nada más que mirar.');
  });
});

describe('las cifras del correo', () => {
  it('escritas como en la app, con su cambio y si es buena noticia', () => {
    const semana = elPeriodoDelInforme('semana', LUNES);
    expect(
      lasCifrasDelCorreo(
        [
          { indicador: 'ventas', total: 421_000, anterior: 376_000, diasConDato: 7 },
          { indicador: 'food-cost', total: 30, anterior: 31, diasConDato: 7 },
          { indicador: 'cierres', total: 6, anterior: 6, diasConDato: 7 },
          { indicador: 'merma', total: null, anterior: null, diasConDato: 0 },
        ],
        semana,
      ),
    ).toEqual([
      { nombre: 'Ventas', valor: '4.210,00 €', cambio: '+12 %', bueno: true },
      { nombre: 'Food cost', valor: '30 %', cambio: '−1 punto', bueno: true },
      { nombre: 'Cajas cerradas', valor: '6 de 7', cambio: 'igual', bueno: null },
      { nombre: 'Merma', valor: '—', cambio: null, bueno: null },
    ]);
  });
});
