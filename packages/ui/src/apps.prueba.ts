import { describe, expect, it } from 'vitest';
import { ORDEN_DE_LA_RUEDA, appsVisibles, type PermisosResueltos } from '@estook/permisos';
import { APPS, PANEL, appPorId, appPorPermiso } from './apps.ts';

/**
 * M3 · las ocho apps (Partes B3 y B5 del Plan).
 *
 * Este catalogo es el unico dueno de «que apps hay». Estas pruebas cuidan que no
 * se salga de lo que dicen las tablas de B3 y B5, que es lo que impide que dentro
 * de un ano una app tenga seis pestanas «porque hacia falta».
 */
describe('las ocho', () => {
  it('son ocho, ni una mas', () => {
    expect(APPS).toHaveLength(8);
  });

  it('van en el orden de la rueda, que lo fija @estook/permisos', () => {
    expect(APPS.map((a) => a.permiso)).toEqual([...ORDEN_DE_LA_RUEDA]);
  });

  it('cada una tiene su icono y su acento, y ninguno se repite', () => {
    // «Cada app con su icono y su acento de color» (Manifiesto, regla 11).
    expect(new Set(APPS.map((a) => a.acento)).size).toBe(8);
    expect(new Set(APPS.map((a) => a.icono)).size).toBe(8);
  });

  it('el acento es una variable de las fichas, nunca un color escrito a mano', () => {
    // Si alguien escribe `#C77700` aqui, el color pasaria a estar en dos sitios
    // y la prueba de contraste dejaria de valer para esta pantalla.
    for (const app of APPS) {
      expect(app.acento).toMatch(/^var\(--color-app-[a-z]+\)$/);
    }
  });

  it('ninguna pasa de cuatro pestanas', () => {
    // «Con un maximo de cuatro posiciones y un "Mas" si hacen falta cinco» (B5).
    for (const app of APPS) {
      expect(app.pestanas.length).toBeLessThanOrEqual(4);
      expect(app.pestanas.length).toBeGreaterThan(0);
    }
  });

  it('las que llegan a cuatro, la cuarta es «Mas»', () => {
    for (const app of APPS.filter((a) => a.pestanas.length === 4)) {
      expect(app.pestanas[3]?.nombre).toBe('Mas');
    }
  });

  it('las pestanas de cada app tienen las de la tabla de B5', () => {
    const esperado: Record<string, string[]> = {
      inventario: ['Hoy', 'Productos', 'Pedidos', 'Mas'],
      escandallos: ['Hoy', 'Fichas', 'Elaboraciones', 'Mas'],
      carta: ['Carta', 'Menus', 'Analisis', 'Mas'],
      calendario: ['Mes', 'Semana', 'Dia', 'Mas'],
      equipo: ['Hoy', 'Personas', 'Fichajes', 'Mas'],
      servicio: ['Jornada', 'Ventas', 'APPCC', 'Mas'],
      negocio: ['Resumen', 'Costes', 'Resenas', 'Mas'],
      cuaderno: ['Incidencias', 'Notas', 'Equipos'],
    };

    for (const app of APPS) {
      expect(app.pestanas.map((p) => p.nombre)).toEqual(esperado[app.id]);
    }
  });

  it('los identificadores de pestana valen para una direccion', () => {
    // Van en la barra de direcciones: sin acentos, sin espacios y en minusculas.
    for (const app of APPS) {
      expect(app.id).toMatch(/^[a-z]+$/);
      for (const pestana of app.pestanas) {
        expect(pestana.id).toMatch(/^[a-z]+$/);
      }
    }
  });

  it('cada una dice que hace, en una frase', () => {
    for (const app of APPS) {
      expect(app.queHace.length).toBeGreaterThan(15);
      // Sin punto final: son frases de tarjeta, no parrafos.
      expect(app.queHace.endsWith('.')).toBe(false);
    }
  });
});

describe('el Panel no es una de las ocho', () => {
  it('no entra en la rueda', () => {
    expect(APPS.map((a) => a.id)).not.toContain('panel');
  });

  it('no tiene pestanas: es la pantalla de inicio', () => {
    expect(PANEL.pestanas).toHaveLength(0);
  });
});

describe('buscar una app', () => {
  it('por su identificador', () => {
    expect(appPorId('inventario')?.nombre).toBe('Inventario');
    expect(appPorId('no-existe')).toBeUndefined();
  });

  it('por su permiso', () => {
    expect(appPorPermiso('app.carta')?.nombre).toBe('Carta');
  });

  it('los permisos que no son de la rueda no dan app', () => {
    // Fogon, Ajustes y la gestoria son permisos de app, pero no son sectores.
    expect(appPorPermiso('app.fogon')).toBeUndefined();
    expect(appPorPermiso('app.ajustes')).toBeUndefined();
    expect(appPorPermiso('app.gestoria')).toBeUndefined();
    expect(appPorPermiso('app.panel')).toBeUndefined();
  });
});

describe('la rueda se reparte entre las que el rol tiene', () => {
  const con = (...permisos: string[]): PermisosResueltos =>
    Object.fromEntries(permisos.map((p) => [p, 'ver']));

  it('un camarero ve cuatro', () => {
    // Las de la matriz: calendario, carta, servicio y cuaderno. El Panel no
    // cuenta, porque no es un sector.
    const suyas = appsVisibles(
      con('app.panel', 'app.calendario', 'app.carta', 'app.servicio', 'app.cuaderno'),
    );
    expect(suyas).toHaveLength(4);
  });

  it('quien no tiene ninguna app no ve ninguna, y eso no revienta', () => {
    expect(appsVisibles(con('app.panel'))).toEqual([]);
  });

  it('salen en el orden de la rueda, no en el que se le pasen', () => {
    const suyas = appsVisibles(con('app.negocio', 'app.inventario', 'app.carta'));
    expect(suyas).toEqual(['app.inventario', 'app.carta', 'app.negocio']);
  });
});
