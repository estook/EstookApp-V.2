import { describe, expect, it } from 'vitest';
import type { Permiso } from '@estook/permisos';
import {
  ANADIDOS_DE_FABRICA,
  ELIGE_EL_PUESTO,
  FIJOS_DEL_PUESTO,
  MUDANZAS,
  WIDGETS,
  elCatalogoParaAnadir,
  elPanelDeFabrica,
  elPuestoDe,
  idDeAhora,
  loGuardadoDeAhora,
  loQueSePuedeAnadir,
  loQueSePuedePintar,
  losFijos,
  losIdsFijos,
  widgetPorId,
  type Puesto,
} from './catalogo.ts';

/**
 * El Panel de cada puesto (el rediseño, entrega 3 · 0148): los fijos arriba y los añadidos abajo,
 * del mismo tamaño. Y lo que protegían las de antes: que lo guardado no se pierda al cambiar el
 * catálogo, y que nadie vea un widget que no es para su rol.
 */
const todo = () => true;
const con =
  (...los: Permiso[]) =>
  (permiso: Permiso) =>
    los.includes(permiso);

const GERENTE = todo;
const JEFE_DE_COCINA = con(
  'dato.ventas',
  'app.almacen',
  'dato.precio_de_compra',
  'app.escandallos',
  'dato.coste_de_plato',
  'accion.enviar_pedidos',
  'accion.marcar_agotado',
  'app.equipo',
);
const JEFE_DE_SALA = con('dato.ventas', 'app.equipo', 'app.carta', 'accion.marcar_agotado');
const COCINERO = con(
  'app.almacen',
  'accion.fichar',
  'accion.registrar_merma',
  'accion.marcar_agotado',
);
const CAMARERO = con('accion.fichar', 'accion.marcar_agotado', 'app.carta');

describe('el puesto sale de los permisos, no del nombre del rol', () => {
  it('los cinco de la maqueta', () => {
    expect(elPuestoDe(GERENTE)).toBe('gerente');
    expect(elPuestoDe(JEFE_DE_COCINA)).toBe('jefe-cocina');
    expect(elPuestoDe(JEFE_DE_SALA)).toBe('jefe-sala');
    expect(elPuestoDe(COCINERO)).toBe('cocina');
    expect(elPuestoDe(CAMARERO)).toBe('sala');
  });

  it('un jefe de cocina sin Almacén sigue siendo de cocina: ve lo que cuesta cada plato', () => {
    // Luis, en las semillas, tiene el acceso recortado: sin el Almacén salía como jefe de sala.
    expect(elPuestoDe(con('dato.ventas', 'dato.coste_de_plato', 'app.escandallos'))).toBe(
      'jefe-cocina',
    );
  });
});

describe('los fijos de cada puesto', () => {
  it('todos existen', () => {
    for (const [puesto, fijos] of Object.entries(FIJOS_DEL_PUESTO)) {
      for (const fijo of fijos) {
        expect(
          WIDGETS.some((w) => w.id === fijo.id),
          `${puesto}: ${fijo.id}`,
        ).toBe(true);
      }
    }
  });

  it('cada uno ve sus fijos enteros con los permisos de su rol', () => {
    const roles: readonly [Puesto, (p: Permiso) => boolean][] = [
      ['gerente', GERENTE],
      ['jefe-cocina', JEFE_DE_COCINA],
      ['jefe-sala', JEFE_DE_SALA],
      ['cocina', COCINERO],
      ['sala', CAMARERO],
    ];
    for (const [puesto, permisos] of roles) {
      expect(losFijos(puesto, permisos).length, puesto).toBe(FIJOS_DEL_PUESTO[puesto].length);
    }
  });

  it('la cocina y la sala, sin un euro a la vista', () => {
    for (const puesto of ['cocina', 'sala'] as const) {
      for (const fijo of FIJOS_DEL_PUESTO[puesto]) {
        const widget = WIDGETS.find((w) => w.id === fijo.id);
        expect(widget?.permiso ?? null, `${puesto}: ${fijo.id}`).not.toBe('dato.ventas');
      }
    }
  });

  it('un fijo que el rol no puede ver no se pinta, y los demás siguen', () => {
    const sinEquipo = (p: Permiso) => p !== 'app.equipo';
    const ids = losFijos('gerente', sinEquipo).map((f) => f.id);
    expect(ids).not.toContain('equipo-ahora');
    expect(ids).toContain('cifra-ventas');
  });
});

describe('los añadidos, abajo y del mismo tamaño', () => {
  it('todos del mismo tamaño, se guarden como se guarden', () => {
    expect(loQueSePuedePintar([{ id: 'objetivos', tamano: 'grande' }], GERENTE)).toEqual([
      { id: 'objetivos', tamano: 'chico' },
    ]);
  });

  it('lo que ya es fijo de su puesto no se repite abajo', () => {
    const pintados = loQueSePuedePintar(
      [
        { id: 'lo-que-mas-sale', tamano: 'chico' },
        { id: 'cifras-del-dia', tamano: 'chico' },
        { id: 'tablon', tamano: 'chico' },
      ],
      GERENTE,
    ).map((w) => w.id);
    expect(pintados).toEqual(['tablon']);
  });

  it('la cocina y la sala no añaden', () => {
    expect(ELIGE_EL_PUESTO.cocina).toBe(false);
    expect(ELIGE_EL_PUESTO.sala).toBe(false);
    expect(loQueSePuedePintar([{ id: 'mis-horas', tamano: 'chico' }], COCINERO)).toEqual([]);
  });

  it('los de fábrica existen, se añaden y no son fijos de su puesto', () => {
    for (const [puesto, ids] of Object.entries(ANADIDOS_DE_FABRICA)) {
      const fijos = losIdsFijos(puesto as Puesto);
      for (const id of ids) {
        const widget = WIDGETS.find((w) => w.id === id);
        expect(widget?.anadible, `${puesto}: ${id}`).toBe(true);
        expect(fijos.has(id), `${puesto}: ${id}`).toBe(false);
      }
    }
  });

  it('el gerente arranca con los de la maqueta', () => {
    expect(elPanelDeFabrica(GERENTE).map((w) => w.id)).toEqual([
      'objetivos',
      'repartos',
      'caducidades',
      'mis-horas',
    ]);
  });
});

describe('lo guardado de antes no se pierde', () => {
  it('toda mudanza lleva a un widget que existe', () => {
    for (const [antes, ahora] of Object.entries(MUDANZAS)) {
      expect(
        WIDGETS.some((w) => w.id === ahora),
        `${antes} se muda a ${ahora}`,
      ).toBe(true);
    }
  });

  it('los de antes se convierten en el suyo', () => {
    expect(idDeAhora('fichar')).toBe('tu-dia');
    expect(idDeAhora('pedidos')).toBe('repartos');
    expect(idDeAhora('indicador-merma-7')).toBe('cifras-del-dia');
    expect(widgetPorId('indicador-valor-camara-7')?.id).toBe('almacen-pide');
  });

  it('lo tocado por alguien se queda, convertido y sin repetir', () => {
    expect(
      loGuardadoDeAhora(
        [
          { id: 'fichar', tamano: 'chico' },
          { id: 'mi-turno', tamano: 'ancho' },
          { id: 'menu-de-hoy', tamano: 'ancho' },
        ],
        GERENTE,
      ).map((w) => w.id),
    ).toEqual(['tu-dia']);
  });

  it('quien tenía el Panel de fábrica de antes estrena el de su puesto', () => {
    const deAntes = ['fichar', 'ventas', 'objetivos', 'merma', 'valor-de-la-camara', 'fichajes'];
    expect(
      loGuardadoDeAhora(
        deAntes.map((id) => ({ id, tamano: 'chico' as const })),
        GERENTE,
      ).map((w) => w.id),
    ).toEqual(ANADIDOS_DE_FABRICA.gerente);
  });

  it('lo que se dejó de pintar no rompe el Panel: se salta', () => {
    expect(
      loQueSePuedePintar(
        [
          { id: 'mis-apps', tamano: 'chico' },
          { id: 'pulse', tamano: 'ancho' },
          { id: 'indicador-propinas-7', tamano: 'ancho' },
        ],
        GERENTE,
      ),
    ).toEqual([]);
  });
});

describe('«Añadir un widget»', () => {
  it('por los grupos de la maqueta, con los fijos dichos y Uber Eats en gris', () => {
    const grupos = elCatalogoParaAnadir([{ id: 'tablon', tamano: 'chico' }], GERENTE);
    expect(grupos.map((g) => g.nombre)).toEqual([
      'Ventas',
      'Almacén y cocina',
      'Equipo',
      'Canales',
    ]);
    const todos = grupos.flatMap((g) => g.widgets);
    expect(todos.find((w) => w.widget.id === 'tablon')?.estado).toBe('puesto');
    expect(todos.find((w) => w.widget.id === 'lo-que-mas-sale')?.estado).toBe('fijo');
    expect(todos.find((w) => w.widget.id === 'uber-eats')?.estado).toBe('pronto');
    expect(todos.find((w) => w.widget.id === 'para-recomendar')?.estado).toBe('libre');
  });

  it('lo que no es para tu rol no se ofrece', () => {
    const quedan = loQueSePuedeAnadir([], JEFE_DE_SALA).map((w) => w.id);
    expect(quedan).not.toContain('caducidades');
    expect(quedan).not.toContain('lo-que-se-escapa');
    expect(quedan).toContain('para-recomendar');
  });
});
