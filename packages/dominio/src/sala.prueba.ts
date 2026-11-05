import { describe, expect, it } from 'vitest';
import {
  comoVaLaMesa,
  desdeCuandoEnCocina,
  elColorDelTiempo,
  MINUTOS_PARA_LA_CUENTA,
  elPaseHaSalido,
  elPaseQueTocaMarchar,
  laMesaEnCocina,
  loSiguienteDeLaMesa,
  esDeBebidas,
  losPasesDelMenu,
  losPasesQueSalenAlMandar,
  type PaseDeLaMesa,
  type PlatoDeLaMesa,
} from './sala.ts';

/** Un plato de cocina: por defecto, mandado y sin salir. */
function plato(pase: number, cambios: Partial<PlatoDeLaMesa> = {}): PlatoDeLaMesa {
  return { destino: 'cocina', pase, mandado: true, salio: false, quitado: false, ...cambios };
}
const bebida = (cambios: Partial<PlatoDeLaMesa> = {}): PlatoDeLaMesa => ({
  destino: 'barra',
  pase: null,
  mandado: true,
  salio: false,
  quitado: false,
  ...cambios,
});
const pase = (numero: number, cambios: Partial<PaseDeLaMesa> = {}): PaseDeLaMesa => ({
  numero,
  marchado: false,
  fuera: false,
  ...cambios,
});

describe('qué pase sale al mandar (0106)', () => {
  it('la primera comanda saca el 1.º y deja el 2.º en espera', () => {
    const platos = [plato(1), plato(1), plato(2), plato(2)];
    expect(losPasesQueSalenAlMandar(platos, [], true)).toEqual([1]);
  });

  it('«todo junto» saca todo a la vez', () => {
    const platos = [plato(1), plato(2)];
    expect(losPasesQueSalenAlMandar(platos, [], false)).toEqual([1, 2]);
  });

  it('una mesa que solo pide principales los saca ya: no hay nadie delante', () => {
    expect(losPasesQueSalenAlMandar([plato(2), plato(2)], [], true)).toEqual([2]);
  });

  it('los postres del final salen solos, porque el 1.º y el 2.º ya salieron', () => {
    const platos = [
      plato(1, { salio: true }),
      plato(2, { salio: true }),
      plato(3), // la tarta, recién mandada
    ];
    const pases = [
      pase(1, { marchado: true, fuera: true }),
      pase(2, { marchado: true, fuera: true }),
    ];
    expect(losPasesQueSalenAlMandar(platos, pases, true)).toEqual([3]);
  });

  it('añadir al 2.º que espera no lo marcha: lo marcha el camarero, aunque el 1.º ya saliera', () => {
    // El 1.º salió de cocina, pero la mesa aún se lo está comiendo; piden otro principal.
    const platos = [plato(1, { salio: true }), plato(2), plato(2)];
    const pases = [pase(1, { marchado: true }), pase(2)];
    expect(losPasesQueSalenAlMandar(platos, pases, true, [2])).toEqual([]);
    // Con «todo junto», en cambio, sale todo.
    expect(losPasesQueSalenAlMandar(platos, pases, false, [2])).toEqual([2]);
  });

  it('un postre pedido por adelantado espera, como un 2.º', () => {
    const platos = [plato(1), plato(3)];
    expect(losPasesQueSalenAlMandar(platos, [], true)).toEqual([1]);
  });

  it('un segundo pedido tarde no vuelve a marchar un pase ya marchado', () => {
    const platos = [plato(1, { salio: true }), plato(2), plato(2)];
    const pases = [pase(1, { marchado: true }), pase(2, { marchado: true })];
    expect(losPasesQueSalenAlMandar(platos, pases, true)).toEqual([]);
  });

  it('las bebidas no cuentan: van a la barra', () => {
    expect(losPasesQueSalenAlMandar([bebida(), plato(2)], [], true)).toEqual([2]);
  });
});

describe('cuándo toca marchar: lo dice la cocina al tachar, lo hace la sala', () => {
  const pases = [pase(1, { marchado: true }), pase(2)];

  it('mientras queda algo del 1.º, no toca', () => {
    const platos = [plato(1, { salio: true }), plato(1), plato(2)];
    expect(elPaseQueTocaMarchar(platos, pases)).toBeNull();
  });

  it('al tachar el último del 1.º, toca marchar el 2.º', () => {
    const platos = [plato(1, { salio: true }), plato(1, { salio: true }), plato(2)];
    expect(elPaseQueTocaMarchar(platos, pases)).toBe(2);
  });

  it('un plato del 1.º quitado no hace esperar a la mesa', () => {
    const platos = [plato(1, { salio: true }), plato(1, { quitado: true }), plato(2)];
    expect(elPaseQueTocaMarchar(platos, pases)).toBe(2);
  });

  it('si ya está marchado, no vuelve a tocar', () => {
    const platos = [plato(1, { salio: true }), plato(2)];
    expect(
      elPaseQueTocaMarchar(platos, [pase(1, { marchado: true }), pase(2, { marchado: true })]),
    ).toBeNull();
  });
});

describe('el botón grande dice lo siguiente', () => {
  it('con algo sin mandar: mandar', () => {
    expect(loSiguienteDeLaMesa([plato(1, { mandado: false })], [])).toEqual({ que: 'mandar' });
  });

  it('una bebida sin mandar también se manda (a la barra)', () => {
    expect(loSiguienteDeLaMesa([bebida({ mandado: false })], [])).toEqual({ que: 'mandar' });
  });

  it('con todo el 1.º fuera y el 2.º en espera: marchar el 2.º', () => {
    const platos = [plato(1, { salio: true }), plato(2)];
    expect(loSiguienteDeLaMesa(platos, [pase(1, { marchado: true }), pase(2)])).toEqual({
      que: 'marchar',
      pase: 2,
    });
  });

  it('con el 1.º aún en cocina: cobrar (no hay nada que hacer todavía)', () => {
    const platos = [plato(1), plato(2)];
    expect(loSiguienteDeLaMesa(platos, [pase(1, { marchado: true }), pase(2)])).toEqual({
      que: 'cobrar',
    });
  });

  it('una mesa recién abierta, sin nada: pedir (no «cobrar»)', () => {
    expect(loSiguienteDeLaMesa([], [])).toEqual({ que: 'pedir' });
  });

  it('lo quitado sin mandar no cuenta: la mesa vuelve a estar por pedir', () => {
    expect(loSiguienteDeLaMesa([plato(1, { mandado: false, quitado: true })], [])).toEqual({
      que: 'pedir',
    });
  });

  it('con solo las bebidas servidas: cobrar, como en la barra', () => {
    expect(loSiguienteDeLaMesa([bebida({ mandado: true })], [])).toEqual({ que: 'cobrar' });
  });
});

describe('dónde está la mesa en la pantalla de cocina', () => {
  it('sin platos en cocina, no sale', () => {
    expect(laMesaEnCocina([bebida()], [])).toBe('nada');
    expect(laMesaEnCocina([plato(1, { mandado: false })], [])).toBe('nada');
  });

  it('en marcha, mientras al pase marchado le queda algo', () => {
    expect(laMesaEnCocina([plato(1), plato(2)], [pase(1, { marchado: true }), pase(2)])).toBe(
      'en_marcha',
    );
  });

  it('esperando a que la sala marche, con el 1.º fuera', () => {
    const platos = [plato(1, { salio: true }), plato(2)];
    expect(laMesaEnCocina(platos, [pase(1, { marchado: true, fuera: true }), pase(2)])).toBe(
      'esperando',
    );
  });

  it('fuera, al tachar el último', () => {
    const platos = [plato(1, { salio: true }), plato(2, { salio: true })];
    const pases = [
      pase(1, { marchado: true, fuera: true }),
      pase(2, { marchado: true, fuera: true }),
    ];
    expect(laMesaEnCocina(platos, pases)).toBe('fuera');
  });

  it('«Todo fuera» la saca aunque quede algo sin tachar', () => {
    const platos = [plato(1, { salio: true }), plato(1)];
    expect(laMesaEnCocina(platos, [pase(1, { marchado: true, fuera: true })])).toBe('fuera');
  });

  it('un plato nuevo en un pase ya fuera la devuelve a «En marcha»', () => {
    const platos = [plato(1, { salio: true }), plato(1)];
    expect(laMesaEnCocina(platos, [pase(1, { marchado: true })])).toBe('en_marcha');
  });
});

describe('cómo va la mesa en el plano (0131)', () => {
  const base = {
    loSiguiente: { que: 'cobrar' } as const,
    enCocina: 'fuera' as const,
    conComida: true,
    minutosDesdeLoUltimo: 3,
    nadieTacha: false,
  };

  it('lo de siempre sigue igual: sin pedir, sin mandar y toca marchar', () => {
    expect(comoVaLaMesa({ ...base, loSiguiente: { que: 'pedir' } })).toBe('sin_pedir');
    expect(comoVaLaMesa({ ...base, loSiguiente: { que: 'mandar' } })).toBe('por_mandar');
    expect(comoVaLaMesa({ ...base, loSiguiente: { que: 'marchar', pase: 2 } })).toBe(
      'toca_marchar',
    );
  });

  it('con algo en cocina sin salir, «esperando», no «comiendo» (Richi, 5-nov)', () => {
    expect(comoVaLaMesa({ ...base, enCocina: 'en_marcha' })).toBe('esperando');
  });

  it('cuando ha salido todo, «comiendo»; y a los 15 minutos de lo último, «para cobrar»', () => {
    expect(comoVaLaMesa(base)).toBe('comiendo');
    expect(comoVaLaMesa({ ...base, minutosDesdeLoUltimo: MINUTOS_PARA_LA_CUENTA - 1 })).toBe(
      'comiendo',
    );
    expect(comoVaLaMesa({ ...base, minutosDesdeLoUltimo: MINUTOS_PARA_LA_CUENTA })).toBe(
      'para_cobrar',
    );
  });

  it('una mesa solo de bebida no pide la cuenta sola', () => {
    expect(comoVaLaMesa({ ...base, conComida: false, minutosDesdeLoUltimo: 90 })).toBe('comiendo');
  });

  it('con la cocina solo en papel nadie tacha: espera, y nunca pide la cuenta sola', () => {
    expect(comoVaLaMesa({ ...base, nadieTacha: true, minutosDesdeLoUltimo: 90 })).toBe('esperando');
  });
});

describe('desde cuándo cuenta la cocina, igual en su tarjeta y en el plano (0116, 0131)', () => {
  it('desde lo primero que llegó, y desde la última marcha si hubo más de una', () => {
    const llega = '2026-11-05T21:00:00Z';
    const otro = '2026-11-05T21:05:00Z';
    const marcha2 = '2026-11-05T21:30:00Z';
    expect(desdeCuandoEnCocina([otro, llega], [llega])).toBe(llega);
    expect(desdeCuandoEnCocina([otro, llega], [llega, marcha2])).toBe(marcha2);
    expect(desdeCuandoEnCocina([], [])).toBeNull();
  });

  it('el color: verde, ámbar a los de aviso y rojo a los de tarde', () => {
    const ajustes = { avisoMin: 10, tardeMin: 20 };
    expect(elColorDelTiempo(9, ajustes)).toBe('en_hora');
    expect(elColorDelTiempo(10, ajustes)).toBe('justo');
    expect(elColorDelTiempo(20, ajustes)).toBe('tarde');
  });
});

describe('si un pase ha salido entero', () => {
  it('sí, con todo tachado', () => {
    expect(elPaseHaSalido([plato(1, { salio: true }), plato(1, { salio: true })], 1)).toBe(true);
  });
  it('no, si queda algo', () => {
    expect(elPaseHaSalido([plato(1, { salio: true }), plato(1)], 1)).toBe(false);
  });
  it('no, si no tiene ni un plato', () => {
    expect(elPaseHaSalido([plato(2)], 1)).toBe(false);
  });
  it('lo quitado no cuenta', () => {
    expect(elPaseHaSalido([plato(1, { salio: true }), plato(1, { quitado: true })], 1)).toBe(true);
  });
});

describe('qué sección es de bebidas', () => {
  it('por su nombre, con o sin acentos ni mayúsculas', () => {
    for (const nombre of [
      'Bebidas',
      'Vinos',
      'CERVEZAS',
      'Cafés e infusiones',
      'Copas',
      'Cócteles',
      'Refrescos y zumos',
    ]) {
      expect(esDeBebidas(nombre), nombre).toBe(true);
    }
  });

  it('y la comida no', () => {
    for (const nombre of ['Entrantes', 'Principales', 'Postres', 'Para picar', 'Arroces']) {
      expect(esDeBebidas(nombre), nombre).toBe(false);
    }
  });
});

describe('en qué pase sale cada sección del menú', () => {
  const seccion = (id: string, orden: number, esPostre = false, esBebida = false) => ({
    id,
    orden,
    esPostre,
    esBebida,
  });

  it('primeros el 1.º, segundos el 2.º, el postre al final y la bebida a la barra', () => {
    const pases = losPasesDelMenu([
      seccion('bebida', 3, false, true),
      seccion('primeros', 0),
      seccion('postre', 2, true),
      seccion('segundos', 1),
    ]);
    expect(Object.fromEntries(pases)).toEqual({
      primeros: 1,
      segundos: 2,
      postre: 3,
      bebida: null,
    });
  });

  it('un menú de plato único: el plato en el 1.º y el postre en el 2.º', () => {
    const pases = losPasesDelMenu([seccion('plato', 0), seccion('postre', 1, true)]);
    expect(Object.fromEntries(pases)).toEqual({ plato: 1, postre: 2 });
  });
});
