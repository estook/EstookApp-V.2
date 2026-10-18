import { describe, expect, it } from 'vitest';
import { FogonNoContesta } from '../ia/modelo.ts';
import { porQueNoContesta } from './fogon.ts';

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
