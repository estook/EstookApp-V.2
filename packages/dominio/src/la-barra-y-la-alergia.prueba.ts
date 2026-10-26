import { describe, expect, it } from 'vitest';
import { NOMBRE_CORTO_DEL_ALERGENO, ALERGENOS } from './referencia.ts';
import { enSuOrden, lasAlergiasQueLleva, laRondaDeLaBarra, type LineaDeLaBarra } from './sala.ts';

/** Una línea de la barra mandada a las `hora` (21:00, 21:05…), sin servir. */
function linea(id: string, hora: string, cambios: Partial<LineaDeLaBarra> = {}): LineaDeLaBarra {
  return {
    id,
    mandadaEn: `2026-10-26T${hora}:00Z`,
    salioEn: null,
    quitadaEn: null,
    ...cambios,
  };
}
const a = (hora: string) => `2026-10-26T${hora}:00Z`;

describe('la ronda de la barra (0117)', () => {
  it('sin nada en la barra, no hay tarjeta', () => {
    expect(laRondaDeLaBarra([])).toBeNull();
  });

  it('lo de una comanda es una ronda, y cuenta desde que llegó', () => {
    const ronda = laRondaDeLaBarra([linea('cana', '21:00'), linea('agua', '21:00')]);
    expect(ronda).toEqual({
      ids: ['agua', 'cana'],
      llegoEn: a('21:00'),
      pendientes: 2,
      fueraEn: null,
    });
  });

  it('servido todo, la ronda está acabada a la hora de lo último', () => {
    const ronda = laRondaDeLaBarra([
      linea('cana', '21:00', { salioEn: a('21:02') }),
      linea('agua', '21:00', { salioEn: a('21:03') }),
    ]);
    expect(ronda?.pendientes).toBe(0);
    expect(ronda?.fueraEn).toBe(a('21:03'));
  });

  it('lo que llega con todo servido empieza otra ronda: la tarjeta no crece toda la noche', () => {
    const ronda = laRondaDeLaBarra([
      linea('canas', '21:00', { salioEn: a('21:02') }),
      linea('vino', '21:40'),
      linea('cafe', '22:30'),
    ]);
    // El vino aún no ha salido cuando llega el café: los dos van juntos.
    expect(ronda?.ids).toEqual(['vino', 'cafe']);
    expect(ronda?.llegoEn).toBe(a('21:40'));
    expect(ronda?.pendientes).toBe(2);
  });

  it('en el mismo segundo, lo servido va antes que lo recién pedido (las horas van al segundo)', () => {
    const ronda = laRondaDeLaBarra([
      linea('a-cafe', '21:00'),
      linea('z-cana', '21:00', { salioEn: a('21:00') }),
    ]);
    expect(ronda?.ids).toEqual(['a-cafe']);
  });

  it('lo que llega mientras la barra aún sirve entra en la misma ronda («NUEVO»)', () => {
    const ronda = laRondaDeLaBarra([
      linea('cana', '21:00', { salioEn: a('21:06') }),
      linea('otra', '21:05'),
    ]);
    expect(ronda?.ids).toEqual(['cana', 'otra']);
  });

  it('lo quitado cuenta como hecho: no deja la ronda abierta', () => {
    const ronda = laRondaDeLaBarra([
      linea('cana', '21:00', { quitadaEn: a('21:01') }),
      linea('cafe', '22:00'),
    ]);
    expect(ronda?.ids).toEqual(['cafe']);
  });

  it('destachar lo de antes vuelve a juntarlo todo: no se pierde nada por servir', () => {
    const ronda = laRondaDeLaBarra([linea('cana', '21:00'), linea('cafe', '22:00')]);
    expect(ronda?.ids).toEqual(['cana', 'cafe']);
    expect(ronda?.pendientes).toBe(2);
  });
});

describe('la alergia de la mesa (0117)', () => {
  it('avisa de lo que lleva el plato y la mesa no puede tomar', () => {
    expect(lasAlergiasQueLleva(['lacteos', 'gluten', 'huevos'], ['gluten', 'lacteos'])).toEqual([
      'gluten',
      'lacteos',
    ]);
  });

  it('sin alergia en la mesa, o sin nada en el plato, no avisa', () => {
    expect(lasAlergiasQueLleva(['gluten'], [])).toEqual([]);
    expect(lasAlergiasQueLleva([], ['gluten'])).toEqual([]);
  });

  it('en el orden del reglamento y sin repetir', () => {
    expect(enSuOrden(['sulfitos', 'gluten', 'sulfitos', 'apio'])).toEqual([
      'gluten',
      'apio',
      'sulfitos',
    ]);
  });

  it('cada uno de los catorce tiene su nombre de servicio, corto', () => {
    for (const alergeno of ALERGENOS) {
      expect(NOMBRE_CORTO_DEL_ALERGENO[alergeno].length).toBeLessThanOrEqual(12);
    }
  });
});
