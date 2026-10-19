import { describe, expect, it } from 'vitest';
import { FogonNoContesta, limpiarLaClave } from '../ia/modelo.ts';
import { loQueSeDice, porQueNoContesta } from './fogon.ts';

/**
 * Por qué no contesta Fogón, dicho para Richi (19-oct).
 *
 * Richi puso su clave y saldo, y Fogón contestaba «no ha contestado bien» sin decir por
 * qué. Ahora el fallo trae lo que dice Anthropic, y «Probar la conexión» lo traduce: cada
 * motivo, a la frase que dice qué tocar.
 */
describe('por qué no contesta Fogón', () => {
  const caso = (estado: number | null, tipo: string | null, detalle = '') =>
    porQueNoContesta(new FogonNoContesta(estado, tipo, detalle));

  it('la clave que no vale', () => {
    expect(caso(401, 'authentication_error', 'invalid x-api-key')).toMatch(/La clave no vale/);
  });

  it('sin saldo, aunque llegue como un 400', () => {
    expect(
      caso(
        400,
        'invalid_request_error',
        'Your credit balance is too low to access the Anthropic API.',
      ),
    ).toMatch(/no tiene saldo/);
  });

  it('el modelo que no existe', () => {
    expect(caso(404, 'not_found_error', 'model: claude-x')).toMatch(/AI_MODELO_RAPIDO/);
  });

  it('el límite de gasto o de peticiones', () => {
    expect(caso(429, 'rate_limit_error')).toMatch(/límite/);
  });

  it('Anthropic saturado', () => {
    expect(caso(529, 'overloaded_error')).toMatch(/saturado/);
  });

  it('una petición que no acepta es cosa nuestra', () => {
    expect(caso(400, 'invalid_request_error', 'thinking: unexpected')).toMatch(/cosa nuestra/);
  });

  it('sin llegar a Anthropic', () => {
    expect(caso(null, null, 'TypeError: fetch failed')).toMatch(/No se ha podido llegar/);
  });

  it('el fallo lleva el motivo de Anthropic en su mensaje, para los registros', () => {
    const fallo = new FogonNoContesta(401, 'authentication_error', 'invalid x-api-key');
    expect(fallo.message).toBe(
      'Fogón no ha contestado (401) · authentication_error · invalid x-api-key',
    );
  });
});

/**
 * Lo que ve quien pregunta en el chat cuando Fogón no contesta (19-oct: con la frase
 * genérica, Richi no podía saber si era la clave, el saldo o el modelo).
 */
describe('lo que dice el chat cuando Fogón no contesta', () => {
  const sinSaldo = new FogonNoContesta(
    400,
    'invalid_request_error',
    'Your credit balance is too low to access the Anthropic API.',
  );

  it('en un negocio de la casa, el motivo de verdad y la frase de Anthropic', () => {
    const dice = loQueSeDice(sinSaldo, true);
    expect(dice).toMatch(/no tiene saldo/);
    expect(dice).toContain('(Anthropic: 400 · invalid_request_error · Your credit balance');
  });

  it('a un cliente, una frase sin tecnicismos', () => {
    expect(loQueSeDice(sinSaldo, false)).toBe(
      'Fogón no ha podido contestar. No se ha gastado nada: prueba otra vez en un rato.',
    );
    expect(loQueSeDice(new FogonNoContesta(529, 'overloaded_error'), false)).toMatch(/ocupado/);
  });
});

describe('la clave, tal como se pega en Supabase', () => {
  it('quita espacios, saltos de línea, comillas y el nombre delante', () => {
    expect(limpiarLaClave('  sk-ant-api03-abc\n')).toBe('sk-ant-api03-abc');
    expect(limpiarLaClave('"sk-ant-api03-abc"')).toBe('sk-ant-api03-abc');
    expect(limpiarLaClave('AI_API_KEY=sk-ant-api03-abc')).toBe('sk-ant-api03-abc');
    expect(limpiarLaClave("'sk-ant- api03-abc'")).toBe('sk-ant-api03-abc');
  });

  it('una clave vacía sigue vacía', () => {
    expect(limpiarLaClave('   ')).toBe('');
  });
});
