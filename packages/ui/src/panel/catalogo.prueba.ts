import { describe, expect, it } from 'vitest';
import type { Permiso } from '@estook/permisos';
import {
  GRUPO_DEL_WIDGET,
  MUDANZAS,
  PANEL_DEL_PUESTO,
  WIDGETS,
  elPanelDeFabrica,
  elPuestoDe,
  elCatalogoParaAnadir,
  idDeAhora,
  loQueSePuedeAnadir,
  loQueSePuedePintar,
  widgetPorId,
} from './catalogo.ts';

/**
 * El catálogo de «Añadir al panel» (M7, repaso; y la experiencia, 0083).
 *
 * «Los de fábrica no salen al dar a añadir: ¿si los borras los pierdes para
 *  siempre?» Estas pruebas son las que impiden que vuelva a pasar. Y desde la
 * experiencia, las que impiden que un Panel guardado con los widgets de antes se
 * quede vacío al recortar el catálogo.
 */
const todo = () => true;

describe('el catálogo para añadir', () => {
  it('cada widget tiene su grupo', () => {
    const sinGrupo = WIDGETS.filter((w) => GRUPO_DEL_WIDGET[w.id] === undefined).map((w) => w.id);
    expect(sinGrupo, 'un widget nuevo tiene que decir en qué grupo sale').toEqual([]);
  });

  it('salen también los que ya están puestos, y lo dicen', () => {
    const deFabrica = elPanelDeFabrica(todo);
    const grupos = elCatalogoParaAnadir(deFabrica, todo);
    const todos = grupos.flatMap((g) => g.widgets.map((w) => ({ ...w, id: w.widget.id })));
    for (const puesto of deFabrica) {
      expect(todos.find((w) => w.id === puesto.id)?.puesto, puesto.id).toBe(true);
    }
    expect(todos.some((w) => !w.puesto)).toBe(true);
  });

  it('los que no son para tu rol no se ofrecen', () => {
    const todos = elCatalogoParaAnadir([], (permiso) => permiso !== 'app.equipo').flatMap(
      (g) => g.widgets,
    );
    expect(todos.some((w) => w.widget.permiso === 'app.equipo')).toBe(false);
  });

  it('un widget de antes ya puesto cuenta como puesto en su nuevo nombre', () => {
    const quedan = loQueSePuedeAnadir([{ id: 'indicador-merma-7', tamano: 'chico' }], todo);
    expect(quedan.map((w) => w.id)).not.toContain('merma');
  });
});

describe('un solo tamaño y menos widgets (la experiencia, 0083)', () => {
  it('cada widget tiene su tamaño, y nadie lo cambia', () => {
    for (const widget of WIDGETS) {
      expect(['chico', 'ancho'], widget.id).toContain(widget.tamano);
    }
    // Lo guardado en otro tamaño se pinta en el suyo.
    expect(loQueSePuedePintar([{ id: 'merma', tamano: 'grande' }], todo)).toEqual([
      { id: 'merma', tamano: 'chico' },
    ]);
  });

  it('las cifras de antes, de 7 y de 30 días, se convierten en su widget', () => {
    expect(idDeAhora('indicador-merma-7')).toBe('merma');
    expect(idDeAhora('indicador-merma-30')).toBe('merma');
    expect(idDeAhora('indicador-ticket-medio-7')).toBe('ventas');
    expect(idDeAhora('ventas-de-hoy')).toBe('ventas');
    expect(idDeAhora('indicador-retrasos-30')).toBe('fichajes');
    expect(widgetPorId('indicador-valor-camara-7')?.id).toBe('valor-de-la-camara');
  });

  it('si dos de antes acaban en el mismo, se queda uno y en el sitio del primero', () => {
    expect(
      loQueSePuedePintar(
        [
          { id: 'fichar', tamano: 'chico' },
          { id: 'indicador-ventas-7', tamano: 'ancho' },
          { id: 'ventas-de-hoy', tamano: 'chico' },
          { id: 'indicador-ventas-30', tamano: 'grande' },
        ],
        todo,
      ),
    ).toEqual([
      { id: 'fichar', tamano: 'chico' },
      { id: 'ventas', tamano: 'ancho' },
    ]);
  });

  it('toda mudanza lleva a un widget que existe', () => {
    for (const [antes, ahora] of Object.entries(MUDANZAS)) {
      expect(
        WIDGETS.some((w) => w.id === ahora),
        `${antes} se muda a ${ahora}`,
      ).toBe(true);
    }
  });

  it('lo que se dejó de pintar no rompe el Panel: se salta', () => {
    expect(
      loQueSePuedePintar(
        [
          { id: 'cuanto-genero', tamano: 'chico' },
          { id: 'ultimos-movimientos', tamano: 'ancho' },
          { id: 'pulse', tamano: 'ancho' },
          { id: 'indicador-propinas-7', tamano: 'ancho' },
        ],
        todo,
      ),
    ).toEqual([]);
  });

  it('el food cost pide ver las ventas **y** los costes', () => {
    const soloVentas = (permiso: Permiso) => permiso === 'dato.ventas';
    expect(
      loQueSePuedePintar([{ id: 'indicador-food-cost-30', tamano: 'ancho' }], soloVentas),
    ).toEqual([]);
    expect(loQueSePuedePintar([{ id: 'ventas', tamano: 'ancho' }], soloVentas)).toEqual([
      { id: 'ventas', tamano: 'ancho' },
    ]);
  });

  it('las horas propias las tiene cualquiera', () => {
    expect(loQueSePuedeAnadir([], () => false).map((w) => w.id)).toContain('mis-horas');
  });
});

describe('el Panel de cada puesto (mejora 9)', () => {
  const con =
    (...los: Permiso[]) =>
    (permiso: Permiso) =>
      los.includes(permiso);

  it('el puesto sale de los permisos, no del nombre del rol', () => {
    expect(elPuestoDe(con('dato.ventas', 'dato.coste_de_personal', 'app.almacen'))).toBe('gerente');
    expect(elPuestoDe(con('dato.ventas', 'app.almacen'))).toBe('jefe');
    expect(elPuestoDe(con('app.almacen', 'accion.fichar'))).toBe('cocina');
    expect(elPuestoDe(con('accion.fichar', 'accion.registrar_merma'))).toBe('sala');
  });

  it('todos los de fábrica existen y se pueden pintar con su tamaño', () => {
    for (const [puesto, widgets] of Object.entries(PANEL_DEL_PUESTO)) {
      expect(loQueSePuedePintar(widgets, todo), puesto).toEqual(widgets);
    }
  });

  it('un cocinero arranca fichando, y sin un euro a la vista', () => {
    const cocinero = con(
      'app.almacen',
      'accion.fichar',
      'accion.registrar_merma',
      'app.calendario',
    );
    const suyo = elPanelDeFabrica(cocinero).map((w) => w.id);
    expect(suyo[0]).toBe('fichar');
    expect(suyo).toContain('caducidades');
    expect(suyo).not.toContain('objetivos');
    expect(suyo).not.toContain('ventas');
    // La merma la apunta él: le sale, sin euros (los pinta el widget, no el catálogo).
    expect(suyo).toContain('merma');
  });

  it('quien lleva el local arranca con su reloj, lo que ha entrado y el semáforo', () => {
    const suyo = elPanelDeFabrica(todo).map((w) => w.id);
    expect(suyo.slice(0, 3)).toEqual(['fichar', 'ventas', 'objetivos']);
    // El food cost ya va en el semáforo: no se repite en otra tarjeta.
    expect(suyo).not.toContain('food-cost');
  });

  it('todos los que fichan arrancan con el reloj arriba a la izquierda', () => {
    for (const widgets of Object.values(PANEL_DEL_PUESTO)) {
      expect(widgets[0]?.id).toBe('fichar');
    }
  });
});
