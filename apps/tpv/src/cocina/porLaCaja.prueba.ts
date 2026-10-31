import { describe, expect, it } from 'vitest';
import type { LoQueTieneLaCaja } from '@estook/dominio';
import type { LaPantallaDeCocina, TarjetaDeCocina } from '../datos/tipos.ts';
import { conLoTachado, laCocinaConLoDeLaCaja } from './porLaCaja.ts';

/**
 * **La pantalla de cocina sin internet** (T5 · 2 · 2, 0123): lo de antes sigue; lo que llega por
 * la caja se suma con las reglas de Estook (el 2.º espera hasta que se marcha) y sin repetir lo
 * que ya estaba; y lo tachado aquí se ve tachado.
 */

const AHORA = Date.parse('2026-10-31T21:45:00Z');

const MESA_2: TarjetaDeCocina = {
  cuentaId: 'c2',
  titulo: 'Mesa 2',
  tipo: 'mesa',
  personas: 2,
  camarero: 'Marcos',
  camareroId: null,
  notaParaCocina: null,
  porPases: true,
  conPrisa: false,
  cocinaLlamaEn: null,
  estado: 'en_marcha',
  anulada: null,
  llegoEn: '2026-10-31T21:38:00Z',
  minutos: 7,
  ultimaMarcha: null,
  fueraEn: null,
  pases: [
    {
      numero: 1,
      marchadoEn: '2026-10-31T21:38:00Z',
      fueraEn: null,
      platos: [
        {
          id: 'tortilla',
          nombre: 'Tortilla',
          cantidad: 1,
          nota: null,
          delMenu: false,
          salioEn: null,
          nuevo: false,
          cambio: false,
          anulado: false,
          vuelve: null,
          opciones: [],
          pesoGramos: null,
        },
      ],
    },
  ],
};

const ANTES: LaPantallaDeCocina = {
  aparato: { nombre: 'Cocina', local: 'IKATZ' },
  prepara: 'cocina',
  ajustes: { avisoMin: 10, tardeMin: 20, suena: true },
  enMarcha: [MESA_2],
  esperando: [],
  fuera: [],
};

const MESA_7 = {
  cuentaId: 'c7',
  titulo: 'Mesa 7',
  tipo: 'mesa',
  personas: 4,
  camarero: 'Lucía',
  camareroId: null,
  notaParaCocina: null,
  paraLas: null,
  porPases: true,
  alergias: ['gluten'],
};

function plato(
  id: string,
  nombre: string,
  pase: number | null,
  destino: 'cocina' | 'barra' = 'cocina',
) {
  return {
    id,
    nombre,
    cantidad: 1,
    nota: null,
    opciones: [],
    pesoGramos: null,
    alergenos: id === 'croquetas' ? ['gluten'] : [],
    destino,
    pase,
    delMenu: false,
  };
}

const MANDADO: LoQueTieneLaCaja = {
  que: 'nueva',
  id: 'k1',
  mesa: MESA_7,
  platos: [
    plato('croquetas', 'Croquetas', 1),
    plato('chuleton', 'Chuletón', 2),
    plato('cana', 'Caña', null, 'barra'),
  ],
  esperan: [2],
  hora: '21:43',
  aparato: 'Móvil de Lucía',
  llegoEn: '2026-10-31T21:43:00Z',
};

describe('la cocina, con lo que llega por la caja', () => {
  it('lo de antes sigue, y la mesa nueva entra en marcha con su 2.º esperando', () => {
    const pantalla = laCocinaConLoDeLaCaja(ANTES, [MANDADO], AHORA);
    expect(pantalla.enMarcha.map((t) => t.titulo)).toEqual(['Mesa 2', 'Mesa 7']);
    const mesa7 = pantalla.enMarcha.find((t) => t.cuentaId === 'c7');
    expect(mesa7?.minutos).toBe(2);
    expect(mesa7?.pases.map((p) => [p.numero, p.marchadoEn !== null])).toEqual([
      [1, true],
      [2, false],
    ]);
    // La caña es de la barra: aquí no sale. La alergia de la mesa, en el plato.
    expect(mesa7?.pases.flatMap((p) => p.platos.map((pl) => pl.nombre))).toEqual([
      'Croquetas',
      'Chuletón',
    ]);
    expect(mesa7?.pases[0]?.platos[0]?.lleva).toEqual(['gluten']);
  });

  it('al marchar el 2.º, sale; y lo que ya estaba no se repite', () => {
    const marcha: LoQueTieneLaCaja = {
      que: 'marcha',
      id: 'k2',
      mesa: MESA_7,
      pase: 2,
      platos: [plato('chuleton', 'Chuletón', 2)],
      hora: '21:44',
      aparato: 'Móvil de Lucía',
      llegoEn: '2026-10-31T21:44:00Z',
    };
    const pantalla = laCocinaConLoDeLaCaja(ANTES, [marcha, MANDADO, MANDADO], AHORA);
    const mesa7 = pantalla.enMarcha.find((t) => t.cuentaId === 'c7');
    expect(mesa7?.pases.find((p) => p.numero === 2)?.marchadoEn).toBe('2026-10-31T21:44:00Z');
    expect(mesa7?.pases.flatMap((p) => p.platos).filter((pl) => pl.id === 'chuleton')).toHaveLength(
      1,
    );
  });

  it('con el 1.º tachado, la mesa pasa a esperar el 2.º; destachado, vuelve', () => {
    const conLaCaja = laCocinaConLoDeLaCaja(ANTES, [MANDADO], AHORA);
    const tachado = conLoTachado(
      conLaCaja,
      [{ lineaId: 'croquetas', salio: true, en: AHORA }],
      AHORA,
    );
    expect(tachado.esperando.map((t) => t.cuentaId)).toEqual(['c7']);
    const otraVez = conLoTachado(
      conLaCaja,
      [
        { lineaId: 'croquetas', salio: true, en: AHORA },
        { lineaId: 'croquetas', salio: false, en: AHORA + 1 },
      ],
      AHORA,
    );
    expect(otraVez.enMarcha.map((t) => t.cuentaId)).toContain('c7');
  });

  it('lo de antes también se tacha sin internet, y la mesa pasa a Acabados', () => {
    const tachado = conLoTachado(ANTES, [{ lineaId: 'tortilla', salio: true, en: AHORA }], AHORA);
    expect(tachado.enMarcha).toEqual([]);
    expect(tachado.fuera.map((t) => t.cuentaId)).toEqual(['c2']);
  });

  it('la barra recibe lo suyo, todo en marcha al llegar', () => {
    const pantalla = laCocinaConLoDeLaCaja(
      { ...ANTES, prepara: 'barra', enMarcha: [] },
      [MANDADO],
      AHORA,
    );
    expect(
      pantalla.enMarcha.flatMap((t) => t.pases.flatMap((p) => p.platos.map((pl) => pl.nombre))),
    ).toEqual(['Caña']);
  });
});
