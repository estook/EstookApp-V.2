import { describe, expect, it } from 'vitest';
import {
  DIGITOS_DEL_PIN,
  LARGO_MINIMO_DE_CLAVE,
  comprobar,
  derivar,
  derivarConSalDelLocal,
  esPinConForma,
  huellaDeToken,
  pinNuevo,
  porQueNoValeLaClave,
  salNueva,
  tokenNuevo,
} from './secretos.ts';

/**
 * M4 · lo que sostiene el login, probado sin levantar nada.
 *
 * Estas son las pruebas que de verdad importan de todo M4: si una de ellas falla,
 * cualquiera entra en cualquier restaurante de Espana.
 */

describe('la contrasena', () => {
  it('lo guardado no se parece a la contrasena', async () => {
    const guardado = await derivar('la cocina cierra a las once');
    expect(guardado).not.toContain('cocina');
    expect(guardado).not.toContain('once');
  });

  it('lleva dentro sus parametros, para poder subir el coste sin invalidar nada', async () => {
    const guardado = await derivar('la cocina cierra a las once');
    const [algoritmo, vueltas, sal, resultado] = guardado.split('$');

    expect(algoritmo).toBe('pbkdf2-sha256');
    expect(Number(vueltas)).toBeGreaterThanOrEqual(210_000);
    expect(sal).toBeTruthy();
    expect(resultado).toBeTruthy();
  });

  it('la misma contrasena con sales distintas da resultados distintos', async () => {
    const una = await derivar('la cocina cierra a las once');
    const otra = await derivar('la cocina cierra a las once');
    expect(una).not.toBe(otra);
  });

  it('acierta con la buena y falla con cualquier otra', async () => {
    const guardado = await derivar('la cocina cierra a las once');

    await expect(comprobar('la cocina cierra a las once', guardado)).resolves.toBe(true);
    await expect(comprobar('la cocina cierra a las doce', guardado)).resolves.toBe(false);
    await expect(comprobar('', guardado)).resolves.toBe(false);
    // Ni de mas ni de menos: un espacio al final es otra contrasena.
    await expect(comprobar('la cocina cierra a las once ', guardado)).resolves.toBe(false);
  });

  it('una contrasena con acentos y enes sobrevive al viaje', async () => {
    const guardado = await derivar('el niño del rincón añadió jamón');
    await expect(comprobar('el niño del rincón añadió jamón', guardado)).resolves.toBe(true);
  });

  it('lo guardado con la forma cambiada no acierta nunca, en vez de romper', async () => {
    for (const roto of ['', 'nada', 'md5$1$a$b', 'pbkdf2-sha256$0$a$b', 'pbkdf2-sha256$x$a$b']) {
      await expect(comprobar('lo que sea', roto)).resolves.toBe(false);
    }
  });

  it('sigue comprobando lo derivado con menos vueltas de las de hoy', async () => {
    // El caso del dia que se suba el coste: lo viejo se sigue comprobando bien.
    const conPocas = await derivar('la cocina cierra a las once', salNueva());
    const bajado = conPocas.replace(/\$\d+\$/, '$1000$');

    // No acierta, porque el resultado se calculo con otras vueltas...
    await expect(comprobar('la cocina cierra a las once', bajado)).resolves.toBe(false);
    // ...pero no se rompe, que es lo que se esta comprobando.
  });
});

describe('lo que se le pide a una contrasena', () => {
  it('deja pasar una frase corta y normal', () => {
    expect(porQueNoValeLaClave('la cocina cierra a las once')).toBeNull();
  });

  it('no deja pasar las cortas', () => {
    expect(porQueNoValeLaClave('a'.repeat(LARGO_MINIMO_DE_CLAVE - 1))).toContain(
      String(LARGO_MINIMO_DE_CLAVE),
    );
  });

  it('no deja pasar las de siempre', () => {
    expect(porQueNoValeLaClave('Contrasena')).not.toBeNull();
    expect(porQueNoValeLaClave('1234567890')).not.toBeNull();
    expect(porQueNoValeLaClave('restaurante')).not.toBeNull();
  });

  it('no deja pasar el mismo caracter repetido', () => {
    expect(porQueNoValeLaClave('aaaaaaaaaaaa')).not.toBeNull();
  });

  it('no exige mayusculas ni simbolos, a proposito', () => {
    // Si los exigiera, media Espana usaria «Verano2024!».
    expect(porQueNoValeLaClave('bacalao con tomate')).toBeNull();
  });
});

describe('el PIN', () => {
  it('son seis digitos', () => {
    for (let i = 0; i < 50; i++) {
      const pin = pinNuevo();
      expect(pin).toHaveLength(DIGITOS_DEL_PIN);
      expect(esPinConForma(pin)).toBe(true);
    }
  });

  it('no repite el mismo una y otra vez', () => {
    const vistos = new Set(Array.from({ length: 200 }, () => pinNuevo()));
    // Con un millon de combinaciones, 200 tiradas repiten casi nunca.
    expect(vistos.size).toBeGreaterThan(195);
  });

  it('los diez digitos salen mas o menos lo mismo · sin sesgo', () => {
    // La razon de que `pinNuevo` descarte bytes en vez de usar `% 10`: 256 no es
    // multiplo de 10, asi que el atajo haria salir los digitos bajos mas veces.
    const cuenta = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      for (const digito of pinNuevo()) cuenta.set(digito, (cuenta.get(digito) ?? 0) + 1);
    }

    const esperado = (2000 * DIGITOS_DEL_PIN) / 10;
    for (const digito of '0123456789') {
      const veces = cuenta.get(digito) ?? 0;
      // Holgado: esto caza un sesgo de verdad, no el azar de una tirada.
      expect(veces).toBeGreaterThan(esperado * 0.8);
      expect(veces).toBeLessThan(esperado * 1.2);
    }
  });

  it('no acepta lo que no es un PIN', () => {
    for (const malo of ['', '12345', '1234567', 'abcdef', '12 34 56', '12345a']) {
      expect(esPinConForma(malo)).toBe(false);
    }
  });

  it('con la sal del local, el mismo PIN da la MISMA huella', async () => {
    // Esto es lo que hace posible el indice unico de la migracion 0018, que es
    // lo unico que garantiza «PIN unico por local». Si esta prueba deja de pasar,
    // la unicidad se pierde en silencio.
    const sal = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
    const una = await derivarConSalDelLocal('482913', sal);
    const otra = await derivarConSalDelLocal('482913', sal);
    expect(una).toBe(otra);
  });

  it('el mismo PIN en dos locales distintos da huellas distintas', async () => {
    const enUno = await derivarConSalDelLocal('482913', 'a'.repeat(32));
    const enOtro = await derivarConSalDelLocal('482913', 'b'.repeat(32));
    expect(enOtro).not.toBe(enUno);
  });

  it('y se comprueba como cualquier otra cosa derivada', async () => {
    const huella = await derivarConSalDelLocal('482913', 'a'.repeat(32));
    await expect(comprobar('482913', huella)).resolves.toBe(true);
    await expect(comprobar('482914', huella)).resolves.toBe(false);
  });
});

describe('el token de sesion', () => {
  it('no se repite', () => {
    const vistos = new Set(Array.from({ length: 500 }, () => tokenNuevo()));
    expect(vistos.size).toBe(500);
  });

  it('viaja en una cabecera sin escaparse', () => {
    for (let i = 0; i < 50; i++) {
      expect(tokenNuevo()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('la huella es SHA-256 en hexadecimal, y siempre la misma', async () => {
    const token = tokenNuevo();
    const una = await huellaDeToken(token);
    const otra = await huellaDeToken(token);

    expect(una).toBe(otra);
    expect(una).toMatch(/^[0-9a-f]{64}$/);
  });

  it('de la huella no se saca el token', async () => {
    const token = tokenNuevo();
    const huella = await huellaDeToken(token);
    expect(huella).not.toContain(token);
  });
});
