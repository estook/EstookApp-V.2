import { describe, expect, it } from 'vitest';
import { conLaFoto, contestaDePrueba, type PeticionAFogon } from './modelo.ts';

/**
 * El puerto del modelo (Fogón 1 · 2, decisión 0098): la foto va donde la lee mejor, y el
 * Fogón de mentira contesta lo nuevo con la forma que se le pide, para que las pantallas
 * se puedan probar enteras sin gastar.
 */

const FOTO = { tipo: 'image/jpeg' as const, base64: 'AAAA' };

describe('la foto, en el último mensaje de la persona', () => {
  it('va antes del texto', () => {
    const mensajes = conLaFoto([{ rol: 'user', texto: 'Léelo.' }], FOTO);
    expect(mensajes).toEqual([
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } },
          { type: 'text', text: 'Léelo.' },
        ],
      },
    ]);
  });

  it('sin foto, los mensajes tal cual', () => {
    expect(
      conLaFoto(
        [
          { rol: 'user', texto: 'Hola' },
          { rol: 'assistant', texto: 'Dime' },
          { rol: 'user', texto: '¿Qué hay?' },
        ],
        undefined,
      ),
    ).toEqual([
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: 'Dime' },
      { role: 'user', content: '¿Qué hay?' },
    ]);
  });
});

function pide(forma: Record<string, unknown>, resumen: string, texto = 'Léelo.'): unknown {
  const peticion: PeticionAFogon = {
    reglas: '',
    resumen,
    mensajes: [{ rol: 'user', texto }],
    hastaTokens: 100,
    forma: { type: 'object', properties: forma },
  };
  return JSON.parse(contestaDePrueba(peticion)) as unknown;
}

describe('el Fogón de mentira contesta lo nuevo', () => {
  it('el albarán, con el primer producto de la lista', () => {
    const leido = pide(
      { numero: {}, lineas: {} },
      '# PRODUCTOS\nTomate pera (formato «caja»)\nLeche (l)',
    ) as {
      numero: string;
      lineas: { producto: string }[];
    };
    expect(leido.numero).toBe('A-2024');
    expect(leido.lineas[0]?.producto).toBe('Tomate pera');
  });

  it('el Z, con su total', () => {
    expect(pide({ total: {}, lineas: {} }, '# EL CIERRE')).toMatchObject({ total: 1234.5 });
  });

  it('la merma, con el primer producto de la lista', () => {
    expect(pide({ mermas: {} }, '# PRODUCTOS\nVino tinto (ud); Leche (l)')).toEqual({
      mermas: [{ producto: 'Vino tinto', cantidad: 2, motivo: 'roto', detalle: 'Se ha caído' }],
    });
  });

  it('el pedido, con un producto del pedido', () => {
    const ajuste = pide(
      { cambios: {} },
      '# EL PEDIDO\n- Harina · se pide en kg · hay 2 kg · Estook sugiere: 1 · en el pedido: 1',
    ) as { cambios: { producto: string }[] };
    expect(ajuste.cambios[0]?.producto).toBe('Harina');
  });

  it('el cuadrante, con las personas que le dicen', () => {
    const cuadrante = pide(
      { tramos: {} },
      '# EL HORARIO',
      'El equipo:\nP1 · cocina · 40 h a la semana\nP2 · sala · 20 h a la semana',
    ) as { tramos: { persona: string }[] };
    expect(new Set(cuadrante.tramos.map((t) => t.persona))).toEqual(new Set(['P1', 'P2']));
  });

  it('la revisión, sin nada que mirar', () => {
    expect(pide({ repetidos: {}, pasos: {} }, '# DATOS')).toEqual({ repetidos: [], pasos: [] });
  });
});
