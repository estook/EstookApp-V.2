import { describe, expect, it } from 'vitest';
import { ERRORES } from '@estook/dominio';
import type { CosaPorSubir } from './laCola.ts';
import { subirLaCola, type Mandar, type Respuesta } from './subir.ts';

/**
 * Subir lo guardado sin internet (T5 · 2 · 1): en orden, con su clave y cuánto hace; la
 * entrada sin internet delante de lo suyo; sin red, se para; lo que Estook no acepta se apunta
 * y se sigue.
 */

const LUCIA = { id: 'lucia', nombre: 'Lucía' };
const MARCOS = { id: 'marcos', nombre: 'Marcos' };

function cosa(
  id: string,
  nombre: string,
  con: CosaPorSubir['con'],
  quien = LUCIA,
  extra: Partial<CosaPorSubir> = {},
): CosaPorSubir {
  return { id, nombre, entrada: { id }, hechoEn: 1_000, quien, con, que: id, ...extra };
}

const bien = (datos: unknown = {}): Respuesta => ({ ok: true, datos });
const mal = (codigo: keyof typeof ERRORES): Respuesta => ({ ok: false, error: ERRORES[codigo] });

function apuntes() {
  const subidas: string[] = [];
  const fallos: [string, string][] = [];
  const entradas: [string, string][] = [];
  return {
    subidas,
    fallos,
    entradas,
    al: {
      subida: (id: string) => subidas.push(id),
      fallo: (id: string, porque: string) => fallos.push([id, porque]),
      entro: (id: string, dentro: { turno: string }) => entradas.push([id, dentro.turno]),
    },
  };
}

describe('subir lo guardado', () => {
  it('en orden, con su clave, con el turno de quien lo hizo y cuánto hace', async () => {
    const llamadas: unknown[] = [];
    const mandar: Mandar = (turno, nombre, _entrada, clave, haceMs) => {
      llamadas.push([turno, nombre, clave, haceMs]);
      return Promise.resolve(bien());
    };
    const a = apuntes();
    const cola = [
      cosa('abrir', 'abrir_mesa', { turno: 'T-lucia' }),
      cosa('pedir', 'pedir', { turno: 'T-lucia' }),
      cosa('mandar', 'mandar_a_cocina', { turno: 'T-lucia' }),
    ];
    const subido = await subirLaCola(cola, mandar, () => 61_000, a.al);
    expect(subido).toEqual({ subidas: 3, fallidas: 0, sinRed: false });
    expect(llamadas).toEqual([
      ['T-lucia', 'abrir_mesa', 'abrir', 60_000],
      ['T-lucia', 'pedir', 'pedir', 60_000],
      ['T-lucia', 'mandar_a_cocina', 'mandar', 60_000],
    ]);
    expect(a.subidas).toEqual(['abrir', 'pedir', 'mandar']);
  });

  it('la entrada sin internet sube delante, sin turno, y lo de esa persona sube con el suyo', async () => {
    const llamadas: [string | null, string][] = [];
    const mandar: Mandar = (turno, nombre) => {
      llamadas.push([turno, nombre]);
      return Promise.resolve(
        nombre === 'entrar_con_pin' ? bien({ turno: 'T-marcos', persona: MARCOS }) : bien(),
      );
    };
    const a = apuntes();
    const cola = [
      cosa('entra', 'entrar_con_pin', { entrada: 'entra' }, MARCOS),
      cosa('pedir', 'pedir', { entrada: 'entra' }, MARCOS),
      cosa('bloquea', 'bloquear', { entrada: 'entra' }, MARCOS),
    ];
    await subirLaCola(cola, mandar, () => 2_000, a.al);
    expect(llamadas).toEqual([
      [null, 'entrar_con_pin'],
      ['T-marcos', 'pedir'],
      ['T-marcos', 'bloquear'],
    ]);
    expect(a.entradas).toEqual([['entra', 'T-marcos']]);
  });

  it('sin red otra vez, se para ahí: lo que queda espera, en su orden', async () => {
    let veces = 0;
    const mandar: Mandar = () => {
      veces += 1;
      return Promise.resolve(veces === 1 ? bien() : mal('sin_conexion'));
    };
    const a = apuntes();
    const cola = [
      cosa('uno', 'pedir', { turno: 'T' }),
      cosa('dos', 'mandar_a_cocina', { turno: 'T' }),
      cosa('tres', 'marchar', { turno: 'T' }),
    ];
    expect(await subirLaCola(cola, mandar, () => 2_000, a.al)).toEqual({
      subidas: 1,
      fallidas: 0,
      sinRed: true,
    });
    expect(veces).toBe(2);
    expect(a.subidas).toEqual(['uno']);
    expect(a.fallos).toEqual([]);
  });

  it('lo que Estook no acepta se apunta con el porqué, y lo de los demás sube igual', async () => {
    const mandar: Mandar = (_turno, _nombre, _entrada, clave) =>
      Promise.resolve(clave === 'quitar' ? mal('ya_hecho') : bien());
    const a = apuntes();
    const cola = [
      cosa('quitar', 'quitar_plato', { turno: 'T' }),
      cosa('mandar', 'mandar_a_cocina', { turno: 'T' }),
    ];
    expect(await subirLaCola(cola, mandar, () => 2_000, a.al)).toEqual({
      subidas: 1,
      fallidas: 1,
      sinRed: false,
    });
    expect(a.fallos).toEqual([['quitar', ERRORES.ya_hecho.quePasa]]);
  });

  it('si la entrada no sube, lo de esa persona no se firma con otro: se apunta', async () => {
    const llamadas: string[] = [];
    const mandar: Mandar = (_turno, nombre) => {
      llamadas.push(nombre);
      return Promise.resolve(nombre === 'entrar_con_pin' ? mal('pin_desconocido') : bien());
    };
    const a = apuntes();
    const cola = [
      cosa('entra', 'entrar_con_pin', { entrada: 'entra' }, MARCOS),
      cosa('pedir', 'pedir', { entrada: 'entra' }, MARCOS),
      cosa('de-lucia', 'marchar', { turno: 'T-lucia' }),
    ];
    const subido = await subirLaCola(cola, mandar, () => 2_000, a.al);
    expect(subido).toEqual({ subidas: 1, fallidas: 2, sinRed: false });
    expect(llamadas).toEqual(['entrar_con_pin', 'marchar']);
    expect(a.fallos.map(([id]) => id)).toEqual(['entra', 'pedir']);
  });

  it('lo que ya falló no se vuelve a intentar, y bloquear un turno que ya no vale es lo que se quería', async () => {
    const llamadas: string[] = [];
    const mandar: Mandar = (_turno, nombre) => {
      llamadas.push(nombre);
      return Promise.resolve(mal('sin_sesion'));
    };
    const a = apuntes();
    const cola = [
      cosa('viejo', 'pedir', { turno: 'T' }, LUCIA, { fallo: 'Ya estaba cobrada.' }),
      cosa('bloquea', 'bloquear', { turno: 'T' }),
    ];
    expect(await subirLaCola(cola, mandar, () => 2_000, a.al)).toEqual({
      subidas: 1,
      fallidas: 0,
      sinRed: false,
    });
    expect(llamadas).toEqual(['bloquear']);
  });
});
