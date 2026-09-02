import { describe, expect, it } from 'vitest';
import {
  CUANTOS_DE_RESPALDO,
  DIGITOS,
  SEGUNDOS_POR_CODIGO,
  aBase32,
  codigoEn,
  codigosDeRespaldo,
  comprobarCodigo,
  deBase32,
  enlaceDeAlta,
  secretoNuevo,
  secretoParaTeclear,
} from './doble-factor.ts';

/**
 * M4 · el segundo factor.
 *
 * Lo importante de aqui son los **vectores del RFC 6238**: son los codigos que
 * el propio estandar publica para que dos implementaciones distintas se puedan
 * comprobar la una contra la otra. Si estos pasan, la aplicacion de
 * autenticacion que tenga instalada la gerente enseñara los mismos numeros que
 * calculamos nosotros. Sin ellos, esto se probaria contra si mismo, que es no
 * probar nada.
 */

describe('base32', () => {
  it('ida y vuelta deja los bytes como estaban', () => {
    for (let largo = 1; largo <= 25; largo++) {
      const bytes = new Uint8Array(largo);
      crypto.getRandomValues(bytes);
      expect([...deBase32(aBase32(bytes))]).toEqual([...bytes]);
    }
  });

  it('los vectores del RFC 4648', () => {
    const texto = (s: string) => aBase32(new TextEncoder().encode(s));
    expect(texto('f')).toBe('MY');
    expect(texto('fo')).toBe('MZXQ');
    expect(texto('foo')).toBe('MZXW6');
    expect(texto('foob')).toBe('MZXW6YQ');
    expect(texto('fooba')).toBe('MZXW6YTB');
    expect(texto('foobar')).toBe('MZXW6YTBOI');
  });

  it('perdona los espacios y las minusculas al teclearlo a mano', () => {
    const original = deBase32('MZXW6YTBOI');
    expect([...deBase32('mzxw 6ytb oi')]).toEqual([...original]);
  });
});

describe('el secreto', () => {
  it('son 160 bits, que es lo que espera cualquier aplicacion de autenticacion', () => {
    const secreto = secretoNuevo();
    expect(deBase32(secreto)).toHaveLength(20);
    expect(secreto).toMatch(/^[A-Z2-7]+$/);
  });

  it('no se repite', () => {
    const vistos = new Set(Array.from({ length: 200 }, () => secretoNuevo()));
    expect(vistos.size).toBe(200);
  });

  it('se puede dictar por telefono', () => {
    expect(secretoParaTeclear('MZXW6YTBOI')).toBe('MZXW 6YTB OI');
  });

  it('el enlace lleva todo lo que necesita la aplicacion de autenticacion', () => {
    const enlace = enlaceDeAlta('MZXW6YTBOI', 'rosa@ejemplo.estook.com');

    expect(enlace).toMatch(/^otpauth:\/\/totp\//);
    expect(enlace).toContain('secret=MZXW6YTBOI');
    expect(enlace).toContain('issuer=Estook');
    expect(enlace).toContain('digits=6');
    expect(enlace).toContain('period=30');
    // El correo lleva arroba y puntos: tiene que ir escapado o la aplicacion no
    // sabe donde acaba la cuenta y donde empiezan los parametros.
    expect(enlace).toContain(encodeURIComponent('Estook:rosa@ejemplo.estook.com'));
  });
});

describe('el codigo · los vectores del RFC 6238', () => {
  // El secreto del RFC es la cadena ASCII "12345678901234567890" en base32.
  const SECRETO = aBase32(new TextEncoder().encode('12345678901234567890'));

  // Los del RFC son de ocho digitos; los nuestros de seis, asi que se comparan
  // los seis ultimos, que es lo mismo que hace el truncado.
  const VECTORES: readonly [number, string][] = [
    [59, '287082'],
    [1_111_111_109, '081804'],
    [1_111_111_111, '050471'],
    [1_234_567_890, '005924'],
    [2_000_000_000, '279037'],
    [20_000_000_000, '353130'],
  ];

  for (const [segundos, esperado] of VECTORES) {
    it(`en el segundo ${segundos} da ${esperado}`, async () => {
      await expect(codigoEn(SECRETO, new Date(segundos * 1000))).resolves.toBe(esperado);
    });
  }

  it('el codigo cambia cada treinta segundos y no antes', async () => {
    // El instante tiene que caer justo al principio de un tramo, o esto no
    // comprueba lo que dice: 1.700.000.010 si es multiplo de 30, y 1.700.000.000
    // no lo es.
    const instante = new Date(1_700_000_010_000);
    expect(instante.getTime() / 1000 / SEGUNDOS_POR_CODIGO).toBe(56_666_667);

    const dentro = new Date(instante.getTime() + (SEGUNDOS_POR_CODIGO - 1) * 1000);
    const despues = new Date(instante.getTime() + SEGUNDOS_POR_CODIGO * 1000);

    await expect(codigoEn(SECRETO, dentro)).resolves.toBe(await codigoEn(SECRETO, instante));
    await expect(codigoEn(SECRETO, despues)).resolves.not.toBe(await codigoEn(SECRETO, instante));
  });

  it('siempre son seis digitos, incluso cuando empieza por cero', async () => {
    for (const [segundos] of VECTORES) {
      const codigo = await codigoEn(SECRETO, new Date(segundos * 1000));
      expect(codigo).toHaveLength(DIGITOS);
      expect(codigo).toMatch(/^[0-9]{6}$/);
    }
  });
});

describe('comprobar el codigo', () => {
  const SECRETO = secretoNuevo();
  const AHORA = new Date(1_700_000_000_000);

  it('acepta el de ahora', async () => {
    const codigo = await codigoEn(SECRETO, AHORA);
    await expect(comprobarCodigo(SECRETO, codigo, AHORA)).resolves.toBe(true);
  });

  it('perdona treinta segundos de reloj, hacia atras y hacia delante', async () => {
    // El telefono de cocina lleva el reloj como lleva el reloj.
    const antes = await codigoEn(SECRETO, new Date(AHORA.getTime() - 30_000));
    const despues = await codigoEn(SECRETO, new Date(AHORA.getTime() + 30_000));

    await expect(comprobarCodigo(SECRETO, antes, AHORA)).resolves.toBe(true);
    await expect(comprobarCodigo(SECRETO, despues, AHORA)).resolves.toBe(true);
  });

  it('pero no dos minutos: un codigo viejo ya no vale', async () => {
    const viejo = await codigoEn(SECRETO, new Date(AHORA.getTime() - 120_000));
    await expect(comprobarCodigo(SECRETO, viejo, AHORA)).resolves.toBe(false);
  });

  it('no acepta el codigo de otro secreto', async () => {
    const ajeno = await codigoEn(secretoNuevo(), AHORA);
    await expect(comprobarCodigo(SECRETO, ajeno, AHORA)).resolves.toBe(false);
  });

  it('perdona los espacios de quien lo copia del telefono', async () => {
    const codigo = await codigoEn(SECRETO, AHORA);
    const partido = `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
    await expect(comprobarCodigo(SECRETO, partido, AHORA)).resolves.toBe(true);
  });

  it('lo que no es un codigo no acierta, en vez de romper', async () => {
    for (const malo of ['', '12345', '1234567', 'abcdef', 'null']) {
      await expect(comprobarCodigo(SECRETO, malo, AHORA)).resolves.toBe(false);
    }
  });
});

describe('los codigos de respaldo', () => {
  it('son ocho', () => {
    expect(codigosDeRespaldo()).toHaveLength(CUANTOS_DE_RESPALDO);
  });

  it('no llevan letras que se confundan al dictarlas', () => {
    // Sin I, O, 0 ni 1: se dictan por telefono cuando alguien pierde el movil.
    for (const codigo of codigosDeRespaldo(40)) {
      expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    }
  });

  it('no se repiten', () => {
    const todos = codigosDeRespaldo(100);
    expect(new Set(todos).size).toBe(todos.length);
  });
});
