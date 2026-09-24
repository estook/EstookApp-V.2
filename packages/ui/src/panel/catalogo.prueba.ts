import { describe, expect, it } from 'vitest';
import type { Permiso } from '@estook/permisos';
import {
  GRUPO_DEL_WIDGET,
  PANEL_DEL_PUESTO,
  WIDGETS,
  elPanelDeFabrica,
  elPuestoDe,
  elCatalogoParaAnadir,
  loQueSePuedePintar,
  losIndicadoresQueSePuedenTener,
  widgetPorId,
} from './catalogo.ts';

/**
 * El catálogo de «Añadir al panel» (M7, repaso).
 *
 * «Los de fábrica no salen al dar a añadir: ¿si los borras los pierdes para
 *  siempre?» Estas pruebas son las que impiden que vuelva a pasar.
 */
const todo = () => true;

describe('el catálogo para añadir', () => {
  it('cada widget construido tiene su grupo', () => {
    const sinGrupo = WIDGETS.filter(
      (w) => w.modulo === undefined && GRUPO_DEL_WIDGET[w.id] === undefined,
    ).map((w) => w.id);
    expect(sinGrupo, 'un widget nuevo tiene que decir en qué grupo sale').toEqual([]);
  });

  it('salen también los que ya están puestos, y lo dicen', () => {
    const deFabrica = elPanelDeFabrica(todo);
    const grupos = elCatalogoParaAnadir(deFabrica, todo);
    const todos = grupos.flatMap((g) => g.widgets.map((w) => ({ ...w, id: w.widget.id })));
    for (const puesto of deFabrica.filter((p) => !p.id.startsWith('indicador-'))) {
      expect(todos.find((w) => w.id === puesto.id)?.puesto, puesto.id).toBe(true);
    }
    expect(todos.some((w) => !w.puesto)).toBe(true);
  });

  it('los que llegan con su módulo no se ofrecen, y los sin permiso tampoco', () => {
    const todos = elCatalogoParaAnadir([], (permiso) => permiso !== 'app.equipo').flatMap(
      (g) => g.widgets,
    );
    expect(todos.some((w) => w.widget.modulo !== undefined)).toBe(false);
    expect(todos.some((w) => w.widget.permiso === 'app.equipo')).toBe(false);
  });
});

describe('los indicadores, como widgets (0039)', () => {
  it('un indicador puesto se lee con su nombre y sus tres tamaños', () => {
    const widget = widgetPorId('indicador-ventas-7');
    expect(widget?.nombre).toBe('Ventas · 7 días');
    expect(widget?.tamanos).toEqual(['ancho', 'chico', 'grande']);
  });

  it('el food cost pide ver las ventas **y** los costes', () => {
    const soloVentas = (permiso: Permiso) => permiso === 'dato.ventas';
    expect(
      loQueSePuedePintar([{ id: 'indicador-food-cost-30', tamano: 'ancho' }], soloVentas),
    ).toEqual([]);
    expect(losIndicadoresQueSePuedenTener(soloVentas)).not.toContain('food-cost');
    expect(losIndicadoresQueSePuedenTener(soloVentas)).toContain('ventas');
  });

  it('las horas propias las tiene cualquiera', () => {
    expect(losIndicadoresQueSePuedenTener(() => false)).toEqual(['mis-horas']);
  });

  it('un indicador inventado no se pinta', () => {
    expect(
      loQueSePuedePintar([{ id: 'indicador-propinas-7', tamano: 'ancho' }], () => true),
    ).toEqual([]);
  });
});

describe('el Panel de cada puesto (mejora 9)', () => {
  const con =
    (...los: Permiso[]) =>
    (permiso: Permiso) =>
      los.includes(permiso);

  it('el puesto sale de los permisos, no del nombre del rol', () => {
    expect(elPuestoDe(con('dato.ventas', 'dato.coste_de_personal', 'app.inventario'))).toBe(
      'gerente',
    );
    expect(elPuestoDe(con('dato.ventas', 'app.inventario'))).toBe('jefe');
    expect(elPuestoDe(con('app.inventario', 'accion.fichar'))).toBe('cocina');
    expect(elPuestoDe(con('accion.fichar', 'accion.registrar_merma'))).toBe('sala');
  });

  it('todos los de fábrica existen y se pueden pintar con su tamaño', () => {
    for (const [puesto, widgets] of Object.entries(PANEL_DEL_PUESTO)) {
      expect(loQueSePuedePintar(widgets, todo), puesto).toEqual(widgets);
    }
  });

  it('un cocinero arranca fichando, y sin un euro a la vista', () => {
    const cocinero = con(
      'app.inventario',
      'accion.fichar',
      'accion.registrar_merma',
      'app.calendario',
    );
    const suyo = elPanelDeFabrica(cocinero).map((w) => w.id);
    expect(suyo[0]).toBe('fichar');
    expect(suyo).toContain('caducidades');
    expect(suyo).not.toContain('objetivos');
    expect(suyo).not.toContain('ventas-de-hoy');
  });

  it('quien lleva el local arranca con su reloj, lo que ha entrado hoy y el semáforo', () => {
    const suyo = elPanelDeFabrica(todo).map((w) => w.id);
    expect(suyo.slice(0, 3)).toEqual(['fichar', 'ventas-de-hoy', 'objetivos']);
    // El food cost ya va en el semáforo: no se repite en otra tarjeta.
    expect(suyo).not.toContain('indicador-food-cost-7');
  });

  it('todos los que fichan arrancan con el reloj arriba a la izquierda', () => {
    for (const widgets of Object.values(PANEL_DEL_PUESTO)) {
      expect(widgets[0]?.id).toBe('fichar');
    }
  });
});
