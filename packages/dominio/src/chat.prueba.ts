import { describe, expect, it } from 'vitest';
import {
  aQuienSeNombra,
  avisoDelChatEnElMovil,
  duracionEnLetra,
  enUnaLinea,
  estadoDeMiMensaje,
  nombreDelCanal,
  pesoEnLetra,
  sePuedeCorregir,
  vistaPrevia,
} from './chat.ts';

describe('el nombre de un canal', () => {
  it('los de fábrica, por su tipo', () => {
    expect(nombreDelCanal({ tipo: 'equipo', nombre: null, otros: [] })).toBe('Todo el equipo');
    expect(nombreDelCanal({ tipo: 'cocina', nombre: 'Lo que sea', otros: [] })).toBe('Cocina');
  });

  it('un privado de dos, por la otra persona; uno de grupo sin nombre, por quién está', () => {
    expect(nombreDelCanal({ tipo: 'privado', nombre: null, otros: ['Ana'] })).toBe('Ana');
    expect(nombreDelCanal({ tipo: 'privado', nombre: null, otros: ['Ana', 'Luis', 'Marta'] })).toBe(
      'Ana, Luis y Marta',
    );
    expect(nombreDelCanal({ tipo: 'privado', nombre: 'Cierre', otros: ['Ana', 'Luis'] })).toBe(
      'Cierre',
    );
  });
});

describe('a quién se nombra', () => {
  const personas = [
    { id: 'ana', nombre: 'Ana' },
    { id: 'anamaria', nombre: 'Ana María' },
    { id: 'luis', nombre: 'Luis' },
  ];

  it('por su nombre entero, con o sin mayúsculas', () => {
    expect(aQuienSeNombra('@luis ¿me cubres el sábado?', personas)).toEqual(['luis']);
  });

  it('«@Ana María» es Ana María, no Ana', () => {
    expect(aQuienSeNombra('@Ana María, mira esto', personas)).toEqual(['anamaria']);
  });

  it('y las dos, si se nombra a las dos', () => {
    expect([...aQuienSeNombra('@Ana y @Ana María', personas)].sort()).toEqual(['ana', 'anamaria']);
  });

  it('«@Analía» no es Ana', () => {
    expect(aQuienSeNombra('@Analía', personas)).toEqual([]);
  });
});

describe('cómo va mi mensaje', () => {
  it('en un privado de dos: enviado, entregado, leído', () => {
    expect(estadoDeMiMensaje(10, [{ entregadoHasta: 9, leidoHasta: 9 }])).toEqual({
      como: 'enviado',
    });
    expect(estadoDeMiMensaje(10, [{ entregadoHasta: 10, leidoHasta: 9 }])).toEqual({
      como: 'entregado',
    });
    expect(estadoDeMiMensaje(10, [{ entregadoHasta: 12, leidoHasta: 11 }])).toEqual({
      como: 'leido',
      todos: true,
    });
  });

  it('en un grupo, leído por todos o por cuántos', () => {
    expect(
      estadoDeMiMensaje(10, [
        { entregadoHasta: 10, leidoHasta: 10 },
        { entregadoHasta: 10, leidoHasta: 3 },
        { entregadoHasta: 2, leidoHasta: 2 },
      ]),
    ).toEqual({ como: 'leido_por', cuantos: 1, de: 3 });
  });

  it('sin nadie más, enviado', () => {
    expect(estadoDeMiMensaje(10, [])).toEqual({ como: 'enviado' });
  });
});

describe('corregir', () => {
  it('quince minutos, con la hora del servidor', () => {
    const escrito = new Date('2026-10-03T10:00:00Z');
    expect(sePuedeCorregir(escrito, new Date('2026-10-03T10:15:00Z'))).toBe(true);
    expect(sePuedeCorregir(escrito, new Date('2026-10-03T10:15:01Z'))).toBe(false);
  });
});

describe('lo que se enseña de un mensaje', () => {
  const sin = {
    texto: null,
    adjuntoTipo: null,
    adjuntoNombre: null,
    adjuntoSegundos: null,
    borrado: false,
  };

  it('el texto, o qué era, nunca el fichero', () => {
    expect(vistaPrevia({ ...sin, texto: 'Se acabó  el pulpo' })).toBe('Se acabó el pulpo');
    expect(vistaPrevia({ ...sin, adjuntoTipo: 'foto' })).toBe('Foto');
    expect(vistaPrevia({ ...sin, adjuntoTipo: 'voz', adjuntoSegundos: 65 })).toBe(
      'Nota de voz · 1:05',
    );
    expect(vistaPrevia({ ...sin, adjuntoTipo: 'documento', adjuntoNombre: 'carta.pdf' })).toBe(
      'carta.pdf',
    );
    expect(vistaPrevia({ ...sin, borrado: true })).toBe('Se eliminó este mensaje');
  });

  it('en una línea, sin partir palabras', () => {
    expect(enUnaLinea('uno dos tres cuatro cinco', 12)).toBe('uno dos tres…');
    expect(duracionEnLetra(9)).toBe('0:09');
    expect(pesoEnLetra(840 * 1024)).toBe('840 KB');
  });
});

describe('lo que dice el móvil', () => {
  it('uno: quién y qué; en un privado de dos, solo qué', () => {
    expect(
      avisoDelChatEnElMovil({
        canal: 'Cocina',
        esPrivadoDeDos: false,
        cuantos: 1,
        autor: 'Luis',
        ultimo: 'Se acabó el pulpo',
        teMencionan: false,
      }),
    ).toEqual({ titulo: 'Cocina', detalle: 'Luis: Se acabó el pulpo' });
    expect(
      avisoDelChatEnElMovil({
        canal: 'Luis',
        esPrivadoDeDos: true,
        cuantos: 1,
        autor: 'Luis',
        ultimo: '¿Me cubres?',
        teMencionan: false,
      }),
    ).toEqual({ titulo: 'Luis', detalle: '¿Me cubres?' });
  });

  it('varios del mismo canal, en uno solo', () => {
    expect(
      avisoDelChatEnElMovil({
        canal: 'Cocina',
        esPrivadoDeDos: false,
        cuantos: 3,
        autor: 'Luis',
        ultimo: 'x',
        teMencionan: true,
      }),
    ).toEqual({ titulo: 'Cocina', detalle: '3 mensajes nuevos, y te nombran' });
  });
});
