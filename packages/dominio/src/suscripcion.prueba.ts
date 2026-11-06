import { describe, expect, it } from 'vitest';
import {
  DIAS_DE_GRACIA,
  claveDelPrecio,
  cuandoAcabaLaPausa,
  masMeses,
  porQueNoSePausaEnLetra,
  porQueNoSePuedePausar,
  tocaVolverDeLaPausa,
  comoEstaLaCuenta,
  dejaEscribir,
  dejaMirar,
  elCorreoDeHoy,
  elEstadoDeStripe,
  elPlanPorLosLocales,
  laCuota,
  llevaEstookTpv,
  type LaSuscripcion,
} from './suscripcion.ts';
import type { FechaOperativa } from './tiempo.ts';

const HOY = '2026-09-25' as FechaOperativa;
const AHORA = new Date('2026-09-25T10:00:00Z');

function una(cambios: Partial<LaSuscripcion> = {}): LaSuscripcion {
  return {
    estado: 'activa',
    plan: 'esencial',
    pruebaHasta: null,
    impagoDesde: null,
    deLaCasa: false,
    esEjemplo: false,
    conStripe: true,
    ...cambios,
  };
}

const haceDias = (n: number) => new Date(AHORA.getTime() - n * 86_400_000);

describe('cómo está la cuenta (0048)', () => {
  it('pendiente de pago: sin pagar, y sin pagar no se mira ni se escribe', () => {
    const cuenta = comoEstaLaCuenta(una({ estado: 'pendiente_de_pago' }), AHORA, HOY);
    expect(cuenta.como).toBe('sin_pagar');
    expect(dejaMirar(cuenta.como)).toBe(false);
    expect(dejaEscribir(cuenta.como)).toBe(false);
  });

  it('de la casa y los ejemplos, al día, digan lo que digan', () => {
    expect(
      comoEstaLaCuenta(una({ estado: 'pendiente_de_pago', deLaCasa: true }), AHORA, HOY).como,
    ).toBe('al_dia');
    expect(comoEstaLaCuenta(una({ estado: 'impago', esEjemplo: true }), AHORA, HOY).como).toBe(
      'al_dia',
    );
  });

  it('una prueba con tarjeta sigue lo que diga Stripe; una vieja sin tarjeta, al acabar, a pagar', () => {
    const vieja = una({
      estado: 'prueba',
      conStripe: false,
      pruebaHasta: '2026-09-18' as FechaOperativa,
    });
    expect(comoEstaLaCuenta(vieja, AHORA, HOY).como).toBe('sin_pagar');

    const viva = una({
      estado: 'prueba',
      conStripe: false,
      pruebaHasta: '2026-09-28' as FechaOperativa,
    });
    expect(comoEstaLaCuenta(viva, AHORA, HOY).como).toBe('prueba');

    const conTarjeta = una({ estado: 'prueba', pruebaHasta: '2026-09-24' as FechaOperativa });
    expect(comoEstaLaCuenta(conTarjeta, AHORA, HOY).como).toBe('prueba');
  });

  it('impago: siete días trabajando, con los que quedan, y el octavo solo lectura', () => {
    const primerDia = comoEstaLaCuenta(
      una({ estado: 'impago', impagoDesde: haceDias(0) }),
      AHORA,
      HOY,
    );
    expect(primerDia).toEqual({ como: 'impago', diasQuedan: DIAS_DE_GRACIA });
    expect(dejaEscribir(primerDia.como)).toBe(true);

    const ultimoDia = comoEstaLaCuenta(
      una({ estado: 'impago', impagoDesde: haceDias(6) }),
      AHORA,
      HOY,
    );
    expect(ultimoDia).toEqual({ como: 'impago', diasQuedan: 1 });

    const octavo = comoEstaLaCuenta(
      una({ estado: 'impago', impagoDesde: haceDias(7) }),
      AHORA,
      HOY,
    );
    expect(octavo.como).toBe('solo_lectura');
    expect(dejaMirar(octavo.como)).toBe(true);
    expect(dejaEscribir(octavo.como)).toBe(false);
  });

  it('en Pausa se paga menos y se mira, pero no se escribe', () => {
    expect(comoEstaLaCuenta(una({ plan: 'pausa' }), AHORA, HOY).como).toBe('solo_lectura');
  });
});

describe('el plan por los locales', () => {
  it('Pro con dos locales pasa a Cadena, y Cadena con uno vuelve a Pro', () => {
    expect(elPlanPorLosLocales('pro', 1)).toBe('pro');
    expect(elPlanPorLosLocales('pro', 2)).toBe('cadena');
    expect(elPlanPorLosLocales('cadena', 1)).toBe('pro');
    expect(elPlanPorLosLocales('esencial', 5)).toBe('esencial');
  });

  it('la cuota es por local, y crecer nunca sube el precio de cada uno', () => {
    expect(laCuota('esencial', 'mes', 1)).toBe(3_900);
    expect(laCuota('cadena', 'mes', 3)).toBe(26_700);
    expect(laCuota('pro', 'ano', 1)).toBe(99_000);
    expect(laCuota('pausa', 'ano', 1)).toBeNull();
    // Dos locales en Pro se cobran como Cadena: menos que dos Pro.
    const conDos = laCuota(elPlanPorLosLocales('pro', 2), 'mes', 2) ?? 0;
    expect(conDos).toBeLessThan(2 * (laCuota('pro', 'mes', 1) ?? 0));
  });

  it('cada precio tiene su nombre en Stripe, y el que cambia de importe cambia de versión', () => {
    // Todos pasaron a sin IVA el 6-nov (0135): cada uno, su versión nueva.
    expect(claveDelPrecio('pro', 'ano')).toBe('estook-pro-ano-v3');
    expect(claveDelPrecio('cadena', 'mes')).toBe('estook-cadena-mes-v3');
    expect(claveDelPrecio('esencial', 'mes')).toBe('estook-esencial-mes-v2');
    expect(claveDelPrecio('pausa', 'mes')).toBe('estook-pausa-mes-v2');
  });
});

describe('lo que dice Stripe', () => {
  it('se traduce a los estados de siempre', () => {
    expect(elEstadoDeStripe('trialing')).toBe('prueba');
    expect(elEstadoDeStripe('active')).toBe('activa');
    expect(elEstadoDeStripe('past_due')).toBe('impago');
    expect(elEstadoDeStripe('unpaid')).toBe('impago');
    expect(elEstadoDeStripe('canceled')).toBe('solo_lectura');
    expect(elEstadoDeStripe('incomplete')).toBe('pendiente_de_pago');
    expect(elEstadoDeStripe('lo-que-sea-nuevo')).toBe('pendiente_de_pago');
  });
});

describe('el correo de cada día', () => {
  const cuenta = (s: Partial<LaSuscripcion>) => ({
    nombre: 'IKATZ',
    suscripcion: una(s),
    cuota: 3_900,
  });

  it('en impago, uno cada día con los días que quedan y que no se pierde nada', () => {
    const correo = elCorreoDeHoy(
      cuenta({ estado: 'impago', impagoDesde: haceDias(2) }),
      AHORA,
      HOY,
    );
    expect(correo?.tipo).toBe('impago');
    expect(correo?.clave).toBe(HOY);
    expect(correo?.asunto).toContain('te quedan 5 días');
    expect(correo?.parrafos.join(' ')).toContain('No se pierde nada');
  });

  it('el último día lo dice como último día', () => {
    const correo = elCorreoDeHoy(
      cuenta({ estado: 'impago', impagoDesde: haceDias(6) }),
      AHORA,
      HOY,
    );
    expect(correo?.asunto).toContain('último día');
  });

  it('al pasar a solo lectura, uno, que no se repite cada día', () => {
    const desde = haceDias(9);
    const correo = elCorreoDeHoy(cuenta({ estado: 'impago', impagoDesde: desde }), AHORA, HOY);
    expect(correo?.tipo).toBe('solo_lectura');
    expect(correo?.clave).toBe(desde.toISOString().slice(0, 10));
  });

  it('la prueba avisa siete días antes de cobrar, con el importe', () => {
    const dentroDeSiete = elCorreoDeHoy(
      cuenta({ estado: 'prueba', pruebaHasta: '2026-10-02' as FechaOperativa }),
      AHORA,
      HOY,
    );
    expect(dentroDeSiete?.tipo).toBe('fin_de_prueba');
    expect(dentroDeSiete?.parrafos[0]).toContain('39,00 € más IVA');
    expect(dentroDeSiete?.parrafos[1]).toContain('no se te cobrará nada');

    const dentroDeOcho = elCorreoDeHoy(
      cuenta({ estado: 'prueba', pruebaHasta: '2026-10-03' as FechaOperativa }),
      AHORA,
      HOY,
    );
    expect(dentroDeOcho).toBeNull();
  });

  it('a la casa y a quien está al día, ninguno', () => {
    expect(elCorreoDeHoy(cuenta({ estado: 'impago', deLaCasa: true }), AHORA, HOY)).toBeNull();
    expect(elCorreoDeHoy(cuenta({}), AHORA, HOY)).toBeNull();
  });
});

describe('Estook TPV es de Pro (0120)', () => {
  it('Pro y Cadena lo llevan; Esencial, Pausa y sin plan, no', () => {
    expect(llevaEstookTpv(una({ plan: 'pro' }))).toBe(true);
    expect(llevaEstookTpv(una({ plan: 'cadena' }))).toBe(true);
    expect(llevaEstookTpv(una({ plan: 'esencial' }))).toBe(false);
    expect(llevaEstookTpv(una({ plan: 'pausa' }))).toBe(false);
    expect(llevaEstookTpv(una({ plan: null }))).toBe(false);
  });

  it('en la prueba vale el plan elegido', () => {
    expect(llevaEstookTpv(una({ estado: 'prueba', plan: 'pro' }))).toBe(true);
    expect(llevaEstookTpv(una({ estado: 'prueba', plan: 'esencial' }))).toBe(false);
  });

  it('la casa y los locales de ejemplo lo tienen todo', () => {
    expect(llevaEstookTpv(una({ plan: 'esencial', deLaCasa: true }))).toBe(true);
    expect(llevaEstookTpv(una({ plan: null, esEjemplo: true }))).toBe(true);
  });
});

describe('la Pausa (0135)', () => {
  const activa = { estado: 'activa' as const, plan: 'pro' as const };
  const hoy = '2026-11-06' as FechaOperativa;

  it('seis meses desde que empieza; si el mes es más corto, su último día', () => {
    expect(cuandoAcabaLaPausa('2026-11-06' as FechaOperativa)).toBe('2027-05-06');
    expect(masMeses('2026-08-31' as FechaOperativa, 6)).toBe('2027-02-28');
    expect(masMeses('2027-08-31' as FechaOperativa, 6)).toBe('2028-02-29');
    expect(
      tocaVolverDeLaPausa('2026-11-06' as FechaOperativa, '2027-05-05' as FechaOperativa),
    ).toBe(false);
    expect(
      tocaVolverDeLaPausa('2026-11-06' as FechaOperativa, '2027-05-06' as FechaOperativa),
    ).toBe(true);
  });

  it('una vez cada doce meses, contados desde que empezó la anterior', () => {
    expect(porQueNoSePuedePausar(activa, null, hoy)).toBeNull();
    const no = porQueNoSePuedePausar(activa, '2026-03-01' as FechaOperativa, hoy);
    expect(no).toEqual({ porque: 'una_al_ano', desde: '2027-03-01' });
    expect(porQueNoSePausaEnLetra(no ?? { porque: 'una_al_ano', desde: null })).toContain(
      '1 de marzo de 2027',
    );
    expect(porQueNoSePuedePausar(activa, '2025-11-06' as FechaOperativa, hoy)).toBeNull();
  });

  it('ni en la prueba, ni debiendo, ni estando ya en Pausa', () => {
    expect(porQueNoSePuedePausar({ estado: 'prueba', plan: 'pro' }, null, hoy)?.porque).toBe(
      'en_prueba',
    );
    expect(porQueNoSePuedePausar({ estado: 'impago', plan: 'pro' }, null, hoy)?.porque).toBe(
      'sin_pagar',
    );
    expect(porQueNoSePuedePausar({ estado: 'activa', plan: 'pausa' }, null, hoy)?.porque).toBe(
      'ya_en_pausa',
    );
  });

  it('avisa por correo siete días antes de volver solo, una vez', () => {
    const enPausa = (dia: string) =>
      elCorreoDeHoy(
        {
          nombre: 'Chiringuito',
          suscripcion: una({ estado: 'activa', plan: 'pausa', conStripe: true }),
          cuota: 900,
          pausa: { empezo: '2026-04-02' as FechaOperativa, vuelveA: 'pro' },
        },
        AHORA,
        dia as FechaOperativa,
      );
    const correo = enPausa('2026-09-25');
    expect(correo?.tipo).toBe('fin_de_pausa');
    expect(correo?.clave).toBe('2026-10-02');
    expect(correo?.parrafos[0]).toContain('vuelves solo a Pro');
    expect(enPausa('2026-09-24')).toBeNull();
  });
});
