import { describe, expect, it } from 'vitest';
import {
  comoCodigoDeVendedor,
  conLaLlegada,
  elDescuentoEnPalabras,
  elEnlaceDelCodigo,
  elNombreDeLaWeb,
  esDescuentoValido,
  laLlegadaDelEnlace,
  lasCifrasDelVendedor,
  porDondeLlego,
  type ClienteDeUnVendedor,
} from './vendedores.ts';

describe('el código de un vendedor', () => {
  it('se guarda sin espacios y en mayúsculas', () => {
    expect(comoCodigoDeVendedor('juan26')).toBe('JUAN26');
    expect(comoCodigoDeVendedor('  juan 26 ')).toBe('JUAN26');
    expect(comoCodigoDeVendedor('juan-feria')).toBe('JUAN-FERIA');
  });

  it('de 3 a 20, letras, números y guiones; ni tildes ni eñes ni guion en los bordes', () => {
    expect(comoCodigoDeVendedor('AB')).toBeNull();
    expect(comoCodigoDeVendedor('ABC')).toBe('ABC');
    expect(comoCodigoDeVendedor('A'.repeat(20))).toBe('A'.repeat(20));
    expect(comoCodigoDeVendedor('A'.repeat(21))).toBeNull();
    expect(comoCodigoDeVendedor('-JUAN')).toBeNull();
    expect(comoCodigoDeVendedor('JUAN-')).toBeNull();
    expect(comoCodigoDeVendedor('NUÑEZ')).toBeNull();
    expect(comoCodigoDeVendedor('JOSÉ')).toBeNull();
    expect(comoCodigoDeVendedor('JUAN_26')).toBeNull();
    expect(comoCodigoDeVendedor('')).toBeNull();
    expect(comoCodigoDeVendedor(null)).toBeNull();
  });
});

describe('el descuento del primer mes', () => {
  it('es un entero de 0 a 100', () => {
    expect(esDescuentoValido(0)).toBe(true);
    expect(esDescuentoValido(50)).toBe(true);
    expect(esDescuentoValido(100)).toBe(true);
    expect(esDescuentoValido(101)).toBe(false);
    expect(esDescuentoValido(-1)).toBe(false);
    expect(esDescuentoValido(12.5)).toBe(false);
  });

  it('se dice en palabras, y sin descuento no se dice nada', () => {
    expect(elDescuentoEnPalabras(0)).toBeNull();
    expect(elDescuentoEnPalabras(50)).toBe('50 % el primer mes');
    expect(elDescuentoEnPalabras(100)).toBe('El primer mes, gratis');
  });
});

describe('por dónde llegó', () => {
  it('un anuncio lo dice su enlace, aunque venga de Google', () => {
    expect(porDondeLlego({ medio: 'cpc', web: 'google.es' })).toBe('anuncios');
    expect(porDondeLlego({ medio: 'Paid_Social', fuente: 'instagram' })).toBe('anuncios');
  });

  it('un buscador, por su nombre; cualquier otra web, otra web', () => {
    expect(porDondeLlego({ web: 'google.es' })).toBe('buscadores');
    expect(porDondeLlego({ web: 'www.bing.com' })).toBe('buscadores');
    expect(porDondeLlego({ web: 'duckduckgo.com' })).toBe('buscadores');
    expect(porDondeLlego({ web: 'forodehosteleros.es' })).toBe('otra_web');
    // Con marcas de campaña que no son de pago (un boletín, una red sin anuncio).
    expect(porDondeLlego({ fuente: 'boletin', medio: 'email' })).toBe('otra_web');
  });

  it('sin nada, directo; y de nuestra propia web, también', () => {
    expect(porDondeLlego({})).toBe('directo');
    expect(porDondeLlego({ web: 'estook.com' })).toBe('directo');
    expect(porDondeLlego({ web: 'www.estook.com' })).toBe('directo');
  });

  it('de la web se queda solo el nombre: nunca lo que alguien buscó', () => {
    expect(elNombreDeLaWeb('https://www.google.es/search?q=mi+restaurante+de+toda+la+vida')).toBe(
      'google.es',
    );
    expect(elNombreDeLaWeb('foro.hosteleria.es')).toBe('foro.hosteleria.es');
    expect(elNombreDeLaWeb('https://estook.com/precios')).toBeNull();
    expect(elNombreDeLaWeb('localhost')).toBeNull();
    expect(elNombreDeLaWeb('no es una web')).toBeNull();
    expect(elNombreDeLaWeb('')).toBeNull();
  });
});

describe('el enlace de un código y lo que trae', () => {
  it('el enlace del QR es siempre el de producción, a la portada', () => {
    expect(elEnlaceDelCodigo('JUAN26')).toBe('https://estook.com/?ref=JUAN26');
  });

  it('de la dirección sale el código, las marcas y la web de la que se venía', () => {
    expect(
      laLlegadaDelEnlace(
        '?ref=juan26&utm_source=google&utm_medium=cpc&utm_campaign=otono',
        'https://www.google.es/search?q=algo',
      ),
    ).toEqual({
      codigo: 'juan26',
      fuente: 'google',
      medio: 'cpc',
      campana: 'otono',
      web: 'google.es',
    });
    // La que dice la portada al pasar a crear cuenta manda sobre la del navegador,
    // que ya sería la propia portada.
    expect(laLlegadaDelEnlace('?de=bing.com', 'https://estook.com/')).toEqual({ web: 'bing.com' });
    expect(laLlegadaDelEnlace('', 'https://estook.com/')).toEqual({});
    expect(laLlegadaDelEnlace('?ref=%20%20', '')).toEqual({});
  });

  it('se pasa de un enlace a otro antes de la almohadilla', () => {
    expect(conLaLlegada('app/#/crear-cuenta', { codigo: 'JUAN26', web: 'google.es' })).toBe(
      'app/?ref=JUAN26&de=google.es#/crear-cuenta',
    );
    expect(conLaLlegada('app/', {})).toBe('app/');
    expect(conLaLlegada('privacidad/?x=1', { medio: 'cpc' })).toBe(
      'privacidad/?x=1&utm_medium=cpc',
    );
  });
});

describe('las cifras de un vendedor', () => {
  const uno = (cambios: Partial<ClienteDeUnVendedor>): ClienteDeUnVendedor => ({
    como: 'al_dia',
    actividad: 'activo',
    cancelaAlAcabar: false,
    deLaCasa: false,
    esEjemplo: false,
    cuotaAlMes: 4900,
    diasDeCliente: 30,
    llegoEl: '2026-09-07',
    ...cambios,
  });

  it('cuenta con las pestañas de Clientes, y lo que dejan al mes solo de quien paga', () => {
    const cifras = lasCifrasDelVendedor(
      [
        uno({}),
        uno({ actividad: 'dormido', diasDeCliente: 90 }),
        uno({ como: 'prueba', cuotaAlMes: 9900, llegoEl: '2026-10-02', diasDeCliente: 5 }),
        uno({ como: 'sin_pagar', actividad: null, cuotaAlMes: null, llegoEl: '2026-10-06' }),
        uno({ como: 'impago', cuotaAlMes: 4900 }),
      ],
      '2026-10-07',
    );
    expect(cifras).toEqual({
      traidos: 5,
      esteMes: 2,
      pagando: 2,
      enPrueba: 1,
      // El dormido que paga y el del cobro fallido.
      seVan: 2,
      sinPagar: 1,
      loUsan: 3,
      dormidos: 1,
      // Los dos al día y el del cobro fallido: la prueba todavía no deja nada.
      alMes: 14700,
      diasDeMedia: 37,
    });
  });

  it('los de ejemplo no cuentan nunca, y sin clientes no hay media', () => {
    const cifras = lasCifrasDelVendedor([uno({ esEjemplo: true })], '2026-10-07');
    expect(cifras.traidos).toBe(0);
    expect(cifras.alMes).toBe(0);
    expect(cifras.diasDeMedia).toBeNull();
  });

  it('el de la casa no deja dinero aunque esté al día', () => {
    expect(lasCifrasDelVendedor([uno({ deLaCasa: true })], '2026-10-07').alMes).toBe(0);
  });
});
