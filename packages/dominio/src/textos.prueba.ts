import { describe, expect, it } from 'vitest';
import { cantidad } from './coste.ts';
import { fechaOperativa } from './tiempo.ts';
import {
  comoPorcentaje,
  conUnidad,
  enumerar,
  fechaCorta,
  fechaEnLetra,
  haceCuanto,
  plural,
  revisarTexto,
} from './textos.ts';
import { ERRORES, comoFrase, errorDeEstook, type CodigoDeError } from './errores.ts';
import { colaPara, ORDEN_DEL_RECALCULO, pasosPara } from './recalculo.ts';

describe('escribir en espanol de Espana', () => {
  it('el plural, sin el «(s)» de los formularios feos', () => {
    expect(plural(1, 'producto', 'productos')).toBe('1 producto');
    expect(plural(3, 'producto', 'productos')).toBe('3 productos');
    expect(plural(0, 'producto', 'productos')).toBe('0 productos');
  });

  it('enumera con «y», y con «e» cuando toca', () => {
    expect(enumerar(['pan'])).toBe('pan');
    expect(enumerar(['pan', 'queso'])).toBe('pan y queso');
    expect(enumerar(['pan', 'queso', 'tomate'])).toBe('pan, queso y tomate');
    // La «y» pasa a «e» ante palabra que empieza por el sonido «i».
    expect(enumerar(['carne', 'higado'])).toBe('carne e higado');
    expect(enumerar(['sal', 'ingredientes'])).toBe('sal e ingredientes');
    // Pero NO ante el diptongo «hie-», que suena «ye»: es «agua y hielo».
    expect(enumerar(['agua', 'hielo'])).toBe('agua y hielo');
    expect(enumerar(['agua', 'hierbabuena'])).toBe('agua y hierbabuena');
  });

  it('las fechas como se escriben aqui', () => {
    expect(fechaEnLetra(fechaOperativa('2026-09-01'))).toBe('1 de septiembre de 2026');
    expect(fechaCorta(fechaOperativa('2026-09-01'))).toBe('01/09/2026');
  });

  it('las cantidades sin decimales que sobran', () => {
    expect(conUnidad(cantidad(1.5), 'kg')).toBe('1,5 kg');
    expect(conUnidad(cantidad(250), 'g')).toBe('250 g');
    expect(conUnidad(cantidad(0.125), 'l')).toBe('0,125 l');
  });

  it('los porcentajes desde su fraccion', () => {
    expect(comoPorcentaje(0.1)).toBe('10 %');
    expect(comoPorcentaje(0.2135, 2)).toBe('21,35 %');
  });

  it('cuanto hace, en palabras', () => {
    const hoy = fechaOperativa('2026-09-01');
    expect(haceCuanto(hoy, hoy)).toBe('hoy');
    expect(haceCuanto(fechaOperativa('2026-08-31'), hoy)).toBe('ayer');
    expect(haceCuanto(fechaOperativa('2026-08-20'), hoy)).toBe('hace 12 días');
    expect(haceCuanto(fechaOperativa('2026-06-01'), hoy)).toBe('hace 3 meses');
    expect(haceCuanto(fechaOperativa('2024-09-01'), hoy)).toBe('hace 2 años');
  });
});

describe('la jerga no pasa', () => {
  it('caza las palabras que obligan a traducir mentalmente', () => {
    expect(revisarTexto('Revisa el stock disponible')[0]).toMatch(/lo que hay en cámara/);
    expect(revisarTexto('Abre el dashboard')[0]).toMatch(/panel/);
  });

  it('ni emojis ni exclamaciones: el tono es sereno', () => {
    expect(revisarTexto('Todo listo 🎉').join()).toMatch(/emoji/);
    expect(revisarTexto('¡Guardado!').join()).toMatch(/exclamación/);
  });

  it('un texto bien escrito no tiene nada que decir', () => {
    expect(revisarTexto('Se ha guardado el recuento de esta mañana.')).toEqual([]);
  });
});

describe('los errores hablan en cristiano', () => {
  it('todos dicen que ha pasado y que se puede hacer', () => {
    for (const [codigo, el] of Object.entries(ERRORES)) {
      expect(el.quePasa.length, codigo).toBeGreaterThan(10);
      expect(el.queSePuedeHacer.length, codigo).toBeGreaterThan(10);
      expect(el.codigo, codigo).toBe(codigo);
    }
  });

  it('ninguno lleva jerga, ni emojis, ni exclamaciones', () => {
    for (const [codigo, el] of Object.entries(ERRORES)) {
      expect(revisarTexto(el.quePasa), `${codigo} · que pasa`).toEqual([]);
      expect(revisarTexto(el.queSePuedeHacer), `${codigo} · que se puede hacer`).toEqual([]);
    }
  });

  it('ninguno culpa a quien lo lee ni dice «error inesperado»', () => {
    for (const [codigo, el] of Object.entries(ERRORES)) {
      const texto = `${el.quePasa} ${el.queSePuedeHacer}`.toLowerCase();
      expect(texto, codigo).not.toMatch(/inesperado|desconocido|has hecho mal|invalido/);
    }
  });

  it('los que puede arreglar la persona traen su boton', () => {
    for (const codigo of [
      'sin_sesion',
      'local_ajeno',
      'lo_cambio_otra_persona',
      'periodo_cerrado',
    ] as const) {
      expect(errorDeEstook(codigo).boton, codigo).not.toBeNull();
    }
  });

  it('el fiscal sin regla dice que Estook no se inventa un impuesto', () => {
    expect(comoFrase('fiscal_sin_regla')).toMatch(/no se inventa un impuesto/i);
    expect(errorDeEstook('fiscal_sin_regla').estadoHttp).toBe(422);
  });

  it('cuando se rompe algo nuestro, se dice que no es cosa suya', () => {
    expect(comoFrase('fallo_nuestro')).toMatch(/no es cosa tuya/i);
  });

  it('el catalogo es cerrado: pedir uno que no existe no compila', () => {
    const codigo: CodigoDeError = 'sin_permiso';
    expect(errorDeEstook(codigo).estadoHttp).toBe(403);
  });
});

describe('el orden del recalculo', () => {
  it('es el que fija la Auditoria, y no se altera', () => {
    expect(ORDEN_DEL_RECALCULO).toEqual(['precio', 'elaboracion', 'plato', 'margen', 'aviso']);
  });

  it('un precio de compra nuevo arrastra toda la cadena', () => {
    expect(pasosPara('precio_de_compra')).toEqual([
      'precio',
      'elaboracion',
      'plato',
      'margen',
      'aviso',
    ]);
  });

  it('un cambio de objetivo solo repinta los avisos', () => {
    expect(pasosPara('objetivo')).toEqual(['aviso']);
  });

  it('un precio de venta nuevo no recalcula costes, solo margen y aviso', () => {
    expect(pasosPara('precio_de_venta')).toEqual(['margen', 'aviso']);
  });

  it('dos cambios a la vez dan lo mismo que uno tras otro', () => {
    // Es lo que garantiza que el resultado no dependa de cual gane la carrera.
    const juntos = colaPara(['objetivo', 'precio_de_compra']);
    const soloElMasTemprano = pasosPara('precio_de_compra');
    expect(juntos).toEqual(soloElMasTemprano);
  });

  it('sin cambios no hay nada que rehacer', () => {
    expect(colaPara([])).toEqual([]);
  });
});
