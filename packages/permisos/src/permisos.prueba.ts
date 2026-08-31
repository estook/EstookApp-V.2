import { describe, expect, it } from 'vitest';
import {
  PERMISOS,
  appsVisibles,
  nivelDe,
  puedeEditar,
  puedeVer,
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
    expect(nivelDe(camarera, 'dato.coste_de_genero')).toBe('sin_acceso');
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
