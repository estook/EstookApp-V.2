import { describe, expect, it } from 'vitest';
import { filtrarPorParecido, parecido, sinAcentos, trigramas } from './trigramas.ts';

/**
 * M3 · el buscador de acciones.
 *
 * «Toda lista larga tiene buscador **tolerante a erratas y sin acentos**»
 * (Auditoria de flujos, Parte 8).
 *
 * La mitad de la lista la busca Postgres (migracion 0017) y la otra mitad se
 * busca aqui, en memoria. Lo que estas pruebas cuidan es que **las dos mitades se
 * comporten igual**: si escribir «Migel» encuentra a Miguel, escribir
 * «Invetario» tiene que encontrar Inventario.
 */
describe('sinAcentos', () => {
  it('quita las tildes y baja a minusculas', () => {
    expect(sinAcentos('José María')).toBe('jose maria');
    expect(sinAcentos('BAHÍA')).toBe('bahia');
    expect(sinAcentos('Amunárriz')).toBe('amunarriz');
  });

  it('tambien con las letras que no son "letra mas tilde"', () => {
    // Estas no se deshacen con NFD: son letras enteras y distintas. Postgres las
    // resuelve con su `translate`; aqui hay que decirlo a mano.
    expect(sinAcentos('Muñoz')).toBe('munoz');
    expect(sinAcentos('Françoise')).toBe('francoise');
    expect(sinAcentos('Søren')).toBe('soren');
    expect(sinAcentos('Wałęsa')).toBe('walesa');
  });
});

describe('trigramas', () => {
  it('rellena cada palabra, para que el principio cuente', () => {
    // Es lo que hace que «inv» se parezca mucho mas a «inventario» que «ari».
    const trozos = trigramas('sal');
    expect(trozos.has('  s')).toBe(true);
    expect(trozos.has(' sa')).toBe(true);
    expect(trozos.has('sal')).toBe(true);
    expect(trozos.has('al ')).toBe(true);
  });

  it('trata cada palabra por separado', () => {
    const dos = trigramas('mar bella');
    const juntas = trigramas('marbella');
    expect(dos.has('  m')).toBe(true);
    expect(dos.has('  b')).toBe(true);
    expect(juntas.has('  b')).toBe(false);
  });

  it('los signos no cuentan', () => {
    expect([...trigramas('bar-puerto')]).toEqual([...trigramas('bar puerto')]);
  });

  it('de una cadena vacia no salen trigramas', () => {
    expect(trigramas('').size).toBe(0);
    expect(trigramas('   ').size).toBe(0);
  });
});

describe('parecido', () => {
  it('lo identico se parece del todo', () => {
    expect(parecido('inventario', 'inventario')).toBe(1);
  });

  it('lo que no tiene nada que ver no se parece nada', () => {
    expect(parecido('inventario', 'zzqwx')).toBe(0);
  });

  it('perdona una errata', () => {
    // Las mismas que aguanta Postgres.
    expect(parecido('Invetario', 'Inventario')).toBeGreaterThan(UMBRAL_QUE_USA_EL_BUSCADOR);
    expect(parecido('Migel', 'Miguel')).toBeGreaterThan(UMBRAL_QUE_USA_EL_BUSCADOR);
    expect(parecido('escandallso', 'escandallos')).toBeGreaterThan(UMBRAL_QUE_USA_EL_BUSCADOR);
  });

  it('los acentos dan igual', () => {
    expect(parecido('bahia', 'Bahía')).toBe(1);
  });

  it('es simetrico: da igual el orden', () => {
    expect(parecido('carta', 'cartas')).toBeCloseTo(parecido('cartas', 'carta'), 10);
  });
});

const UMBRAL_QUE_USA_EL_BUSCADOR = 0.3;

describe('filtrarPorParecido', () => {
  const APPS = [
    'Inventario',
    'Escandallos',
    'Carta',
    'Calendario',
    'Equipo',
    'Servicio',
    'Negocio',
    'Cuaderno',
  ];

  const como = (escrito: string) => filtrarPorParecido(APPS, escrito, (t) => t);

  it('tres letras bastan para encontrar la app', () => {
    expect(como('inv')[0]).toBe('Inventario');
    expect(como('esc')[0]).toBe('Escandallos');
    expect(como('cua')[0]).toBe('Cuaderno');
  });

  it('lo que empieza igual va delante', () => {
    // «Carta» y «Calendario» empiezan las dos por «ca»; gana la mas corta y la
    // que coincide antes, no la que salga primero en la lista.
    expect(como('cart')[0]).toBe('Carta');
  });

  it('encuentra aunque se escriba con erratas', () => {
    expect(como('invetario')[0]).toBe('Inventario');
    expect(como('calenadrio')[0]).toBe('Calendario');
  });

  it('encuentra sin acentos y con ellos', () => {
    expect(filtrarPorParecido(['Análisis'], 'analisis', (t) => t)).toEqual(['Análisis']);
    expect(filtrarPorParecido(['Analisis'], 'análisis', (t) => t)).toEqual(['Analisis']);
  });

  it('lo que no se parece a nada no sale', () => {
    expect(como('zzqwx')).toEqual([]);
  });

  it('sin escribir nada no sale nada, en vez de salir todo', () => {
    // Es importante: si devolviera la lista entera, el buscador ensenaria las
    // veinte acciones nada mas abrirlo y no se leeria ninguna.
    expect(como('')).toEqual([]);
    expect(como('   ')).toEqual([]);
  });
});

describe('el nombre se puntua; lo de al lado solo acompana', () => {
  interface Accion {
    nombre: string;
    donde: string;
  }

  const ACCIONES: Accion[] = [
    { nombre: 'Ir a Inventario', donde: 'Que hay, que falta y que se ha ido sin explicacion' },
    { nombre: 'Ir a Carta', donde: 'Lo que vendes, a que precio y con que margen' },
    { nombre: 'Ir a Calendario', donde: 'Que pasa cada dia en el local: turnos, limpiezas' },
  ];

  const buscar = (escrito: string) =>
    filtrarPorParecido(
      ACCIONES,
      escrito,
      (a) => a.nombre,
      undefined,
      (a) => a.donde,
    ).map((a) => a.nombre);

  it('encuentra la accion aunque se escriba con erratas', () => {
    // Este es el caso que se rompio: puntuando nombre + descripcion juntos, la
    // frase larga se comia el parecido y «invetario» no encontraba nada.
    expect(buscar('invetario')[0]).toBe('Ir a Inventario');
    expect(buscar('calenadrio')[0]).toBe('Ir a Calendario');
  });

  it('lo de al lado encuentra, pero va por detras', () => {
    // «margen» solo esta en la descripcion de Carta.
    expect(buscar('margen')).toEqual(['Ir a Carta']);
  });

  it('el nombre gana a la descripcion', () => {
    // «carta» esta en el nombre de una y en ninguna descripcion.
    expect(buscar('carta')[0]).toBe('Ir a Carta');
  });

  it('una descripcion larga no cuela una accion que no viene a cuento', () => {
    expect(buscar('zzqwx')).toEqual([]);
  });
});
