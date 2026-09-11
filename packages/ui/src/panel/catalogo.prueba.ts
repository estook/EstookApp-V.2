import { describe, expect, it } from 'vitest';
import { GRUPO_DEL_WIDGET, PANEL_DE_FABRICA, WIDGETS, elCatalogoParaAnadir } from './catalogo.ts';

/**
 * El catálogo de «Añadir al panel» (M7, repaso).
 *
 * «Los de fábrica no salen al dar a añadir: ¿si los borras los pierdes para
 *  siempre?» Estas pruebas son las que impiden que vuelva a pasar.
 */
describe('el catálogo para añadir', () => {
  const todo = () => true;

  it('cada widget construido tiene su grupo', () => {
    const sinGrupo = WIDGETS.filter(
      (w) => w.modulo === undefined && GRUPO_DEL_WIDGET[w.id] === undefined,
    ).map((w) => w.id);
    expect(sinGrupo, 'un widget nuevo tiene que decir en qué grupo sale').toEqual([]);
  });

  it('salen también los que ya están puestos, y lo dicen', () => {
    const grupos = elCatalogoParaAnadir(PANEL_DE_FABRICA, todo);
    const todos = grupos.flatMap((g) => g.widgets);
    for (const puesto of PANEL_DE_FABRICA) {
      expect(todos.find((w) => w.widget.id === puesto.id)?.puesto, puesto.id).toBe(true);
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
