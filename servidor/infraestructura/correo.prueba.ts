import { describe, expect, it } from 'vitest';
import { CorreoNoSale, dominioDelRemitente, porQueNoValeElRemitente } from './correo.ts';

/**
 * El correo que sale de Estook · el remitente.
 *
 * ── El fallo que estas pruebas existen para que no vuelva ────────────────────
 *
 * El 21 de septiembre de 2026 se encendió el correo en producción y crear cuenta
 * dejó de funcionar. El dominio `estook.com` llevaba **verificado desde el 17**,
 * así que se buscó el fallo ahí durante un día. No estaba ahí.
 *
 * Lo que pasaba lo decía Resend con todas las letras, en cuanto se miró el
 * registro: **«The gmail.com domain is not verified»**. `CORREO_REMITENTE` estaba
 * puesto al correo de la cuenta, `estookapp@gmail.com`, que es lo que parece
 * razonable y **es justo lo que no se puede**: desde Gmail no se envía, porque ese
 * dominio no es tuyo y no hay forma de verificarlo.
 *
 * Dos cosas distintas que se habían dado por una sola:
 *
 *   · **tener un dominio verificado** en Resend, y
 *   · **enviar desde ese dominio**.
 *
 * Se puede tener lo primero y fallar en lo segundo, que es exactamente lo que
 * pasó.
 */

describe('de dónde sale el dominio del remitente', () => {
  it('lo saca de la forma larga, con el nombre delante', () => {
    expect(dominioDelRemitente('Estook <hola@estook.com>')).toBe('estook.com');
  });

  it('y de la corta, solo la dirección', () => {
    expect(dominioDelRemitente('hola@estook.com')).toBe('estook.com');
  });

  it('sin mirar mayúsculas, que en un dominio dan igual', () => {
    expect(dominioDelRemitente('Estook <Hola@Estook.COM>')).toBe('estook.com');
  });

  it('y si no hay dirección dentro, no hay dominio', () => {
    expect(dominioDelRemitente('Estook')).toBe('');
    expect(dominioDelRemitente('')).toBe('');
  });
});

describe('qué remitente vale', () => {
  it('uno del dominio propio, en las dos formas', () => {
    expect(porQueNoValeElRemitente('Estook <hola@estook.com>')).toBeNull();
    expect(porQueNoValeElRemitente('avisos@estook.com')).toBeNull();
  });

  it('el de Gmail NO, que es el que rompió producción', () => {
    // El caso exacto del 21 de septiembre.
    const porque = porQueNoValeElRemitente('estookapp@gmail.com');
    expect(porque).not.toBeNull();
    // Y lo dice en cristiano, nombrando el dominio: quien lea esto en el registro
    // tiene que poder arreglarlo sin preguntar a nadie.
    expect(porque).toContain('gmail.com');
    expect(porque).toContain('CORREO_REMITENTE');
  });

  it('ni ningún otro correo gratuito, por lo mismo', () => {
    for (const cual of [
      'hola@hotmail.com',
      'Estook <hola@outlook.es>',
      'hola@yahoo.es',
      'hola@icloud.com',
      'hola@proton.me',
    ]) {
      expect(porQueNoValeElRemitente(cual), cual).not.toBeNull();
    }
  });

  it('y uno sin dirección dentro tampoco, diciendo cómo se escribe', () => {
    const porque = porQueNoValeElRemitente('Estook');
    expect(porque).not.toBeNull();
    expect(porque).toContain('Estook <hola@estook.com>');
  });

  it('un dominio propio que se parezca a uno gratuito sí vale', () => {
    // `mi-gmail.com` no es `gmail.com`. La comprobación es por dominio entero, no
    // por si aparece el texto: si no, un dominio legítimo se quedaría fuera.
    expect(porQueNoValeElRemitente('hola@mi-gmail.com')).toBeNull();
    expect(porQueNoValeElRemitente('hola@gmail.com.estook.com')).toBeNull();
  });
});

describe('cuando Resend dice que no', () => {
  it('un 4xx es configuración: no se arregla esperando', () => {
    const fallo = new CorreoNoSale(403, 'The gmail.com domain is not verified');
    expect(fallo.esDeConfiguracion).toBe(true);
    // El motivo viaja entero, que es lo que faltaba el 21 de septiembre.
    expect(fallo.message).toContain('gmail.com domain is not verified');
  });

  it('un 5xx es pasajero, y ahí sí se reintenta', () => {
    expect(new CorreoNoSale(503, 'Service Unavailable').esDeConfiguracion).toBe(false);
  });

  it('y sin motivo sigue diciendo el código', () => {
    expect(new CorreoNoSale(429).message).toContain('429');
  });
});
