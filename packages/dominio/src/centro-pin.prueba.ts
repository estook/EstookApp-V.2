import { pbkdf2Sync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { deQuienEsElPin, elSistemaDe, sigueSinInternet } from './centro-pin.ts';

/**
 * La huella como la guarda Estook (`derivarConSalDelLocal`): la sal del local, en hexadecimal,
 * pasada a base64url. Con pocas vueltas, para que la prueba no tarde.
 */
function laHuella(pin: string, salDelLocal: string, vueltas = 1000): string {
  const sal = Buffer.from(salDelLocal, 'utf8');
  const resultado = pbkdf2Sync(pin, sal, vueltas, 32, 'sha256');
  return `pbkdf2-sha256$${String(vueltas)}$${sal.toString('base64url')}$${resultado.toString('base64url')}`;
}

const SAL = '6f1c2e9a0b7d4c3e8f5a1b2c3d4e5f60';

/** T5 · 2 · 2 · 2 · Los PIN y Aparatos (0124): sin internet, la caja comprueba el PIN. */
describe('el PIN de cualquiera, en la caja de centro', () => {
  const ana = { id: 'ana', huella: laHuella('482913', SAL) };
  const luis = { id: 'luis', huella: laHuella('730561', SAL) };

  it('dice de quién es el PIN entre los del local, con las huellas de Estook', async () => {
    expect(await deQuienEsElPin('482913', [ana, luis])).toBe(ana);
    expect(await deQuienEsElPin('730561', [ana, luis])).toBe(luis);
  });

  it('un PIN que no es de nadie, o sin forma de PIN, no es de nadie', async () => {
    expect(await deQuienEsElPin('111222', [ana, luis])).toBeNull();
    expect(await deQuienEsElPin('48291', [ana, luis])).toBeNull();
    expect(await deQuienEsElPin('48291a', [ana, luis])).toBeNull();
    expect(await deQuienEsElPin('482913', [])).toBeNull();
  });

  it('una huella que no se sabe leer no se da por buena, y no estorba a las demás', async () => {
    const rota = { id: 'rota', huella: 'md5$1$x$y' };
    const vacia = { id: 'vacia', huella: 'pbkdf2-sha256$1000$$' };
    expect(await deQuienEsElPin('482913', [rota, vacia, ana])).toBe(ana);
  });

  it('si una huella lleva otra sal o más vueltas, se deriva también con las suyas', async () => {
    const conOtraSal = { id: 'otra', huella: laHuella('905174', 'otra-sal', 2000) };
    expect(await deQuienEsElPin('482913', [conOtraSal, ana])).toBe(ana);
    expect(await deQuienEsElPin('905174', [ana, conOtraSal])).toBe(conOtraSal);
  });
});

describe('quién sigue sin internet, en Aparatos', () => {
  it('sigue quien llega a la caja y quien guarda lo suyo; los demás, no', () => {
    expect(sigueSinInternet('llega')).toBe(true);
    expect(sigueSinInternet('guarda_lo_suyo')).toBe(true);
    for (const no of ['no_llega', 'con_datos', 'sin_permiso', 'bloqueado', null] as const) {
      expect(sigueSinInternet(no), String(no)).toBe(false);
    }
  });

  it('qué es cada aparato, por su navegador (el iPad de ahora dice ser un Mac)', () => {
    expect(elSistemaDe('Mozilla/5.0 (Linux; Android 14; SM-A146B) Chrome/146.0')).toBe('android');
    expect(elSistemaDe('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)')).toBe('ios');
    expect(elSistemaDe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(elSistemaDe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('otro');
    expect(elSistemaDe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Electron/44.7.0')).toBe(
      'windows',
    );
  });
});
