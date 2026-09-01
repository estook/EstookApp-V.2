import { describe, expect, it } from 'vitest';
import {
  PERMISOS,
  appsVisibles,
  comprobarAccion,
  elMasAmplio,
  nivelDe,
  puedeEditar,
  puedeVer,
  recortar,
  recortarLista,
  type PermisosResueltos,
} from './index.ts';

describe('lectura de permisos resueltos', () => {
  const camarera: PermisosResueltos = {
    'app.panel': 'ver',
    'app.calendario': 'ver',
    'app.carta': 'ver',
    'app.cuaderno': 'ver_y_editar',
    'accion.fichar': 'ver_y_editar',
  };

  it('lo que no viene, no se tiene', () => {
    expect(nivelDe(camarera, 'dato.coste_de_plato')).toBe('sin_acceso');
    expect(puedeVer(camarera, 'dato.ventas')).toBe(false);
  });

  it('ver no es editar', () => {
    expect(puedeVer(camarera, 'app.carta')).toBe(true);
    expect(puedeEditar(camarera, 'app.carta')).toBe(false);
    expect(puedeEditar(camarera, 'app.cuaderno')).toBe(true);
  });

  it('la rueda solo ensena las apps que se tienen, sin huecos', () => {
    expect(appsVisibles(camarera)).toEqual(['app.carta', 'app.calendario', 'app.cuaderno']);
    expect(appsVisibles({})).toEqual([]);
  });

  it('el catalogo no tiene codigos repetidos', () => {
    expect(new Set(PERMISOS).size).toBe(PERMISOS.length);
  });
});

describe('el servidor no envia lo que el rol no puede ver', () => {
  /** Una linea de escandallo, como la vera M9. */
  interface LineaDeFicha {
    ingrediente: string;
    gramos: number;
    costeDeLinea: number;
    margen: number;
  }

  const proteccion = {
    costeDeLinea: 'dato.coste_de_plato',
    margen: 'dato.coste_de_plato',
  } as const;

  const linea: LineaDeFicha = {
    ingrediente: 'Aceite de oliva',
    gramos: 25,
    costeDeLinea: 92,
    margen: 0.68,
  };

  it('al cocinero le llega la ficha SIN un solo importe', () => {
    // «Que no ve: ningun importe. Esa columna no existe para el.»
    const paraElCocinero = recortar(linea, proteccion, { 'app.escandallos': 'ver' });
    expect(paraElCocinero).toEqual({ ingrediente: 'Aceite de oliva', gramos: 25 });
    expect(Object.keys(paraElCocinero)).not.toContain('costeDeLinea');
  });

  it('los campos se QUITAN, no se ponen a cero', () => {
    // Un campo a null seguiria diciendo que existe, y eso ya es informacion.
    const paraElCocinero = recortar(linea, proteccion, {});
    expect('costeDeLinea' in paraElCocinero).toBe(false);
  });

  it('al jefe de cocina le llega entera', () => {
    const paraElJefe = recortar(linea, proteccion, { 'dato.coste_de_plato': 'ver_y_editar' });
    expect(paraElJefe).toEqual(linea);
  });

  it('con «ver» basta para recibir el dato; editar es otra cosa', () => {
    const soloMirando = recortar(linea, proteccion, { 'dato.coste_de_plato': 'ver' });
    expect(soloMirando.costeDeLinea).toBe(92);
  });

  it('funciona igual sobre una lista entera', () => {
    const recortada = recortarLista([linea, linea], proteccion, {});
    expect(recortada).toHaveLength(2);
    expect(recortada.every((l) => !('margen' in l))).toBe(true);
  });
});

describe('dos roles sobre el mismo local', () => {
  it('gana el mas amplio, permiso a permiso', () => {
    const camarera = { 'app.carta': 'ver', 'app.cuaderno': 'ver_y_editar' } as const;
    const jefaDeCocina = { 'app.carta': 'ver_y_editar', 'app.inventario': 'ver_y_editar' } as const;

    const juntos = elMasAmplio(camarera, jefaDeCocina);
    expect(juntos['app.carta']).toBe('ver_y_editar');
    expect(juntos['app.cuaderno']).toBe('ver_y_editar');
    expect(juntos['app.inventario']).toBe('ver_y_editar');
  });

  it('no baja nada: nunca quita lo que ya tenia', () => {
    const juntos = elMasAmplio({ 'app.carta': 'ver_y_editar' }, { 'app.carta': 'ver' });
    expect(juntos['app.carta']).toBe('ver_y_editar');
  });

  it('sin conjuntos, no hay permisos', () => {
    expect(elMasAmplio()).toEqual({});
  });
});

describe('comprobar antes de ejecutar', () => {
  it('deja pasar a quien puede', () => {
    expect(
      comprobarAccion({ 'accion.conectar_tpv': 'ver_y_editar' }, 'accion.conectar_tpv'),
    ).toEqual({ puede: true });
  });

  it('y dice cual falta a quien no', () => {
    expect(comprobarAccion({}, 'accion.conectar_tpv')).toEqual({
      puede: false,
      falta: 'accion.conectar_tpv',
    });
  });

  it('«ver» no basta para ejecutar una accion', () => {
    expect(comprobarAccion({ 'accion.cerrar_recuento': 'ver' }, 'accion.cerrar_recuento')).toEqual({
      puede: false,
      falta: 'accion.cerrar_recuento',
    });
  });
});
