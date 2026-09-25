import { describe, expect, it } from 'vitest';
import { aFormulario, firmarComoStripe, laFirmaEsDeStripe, traducirSuscripcion } from './stripe.ts';

describe('la firma de los avisos de Stripe (0048)', () => {
  const cuerpo = '{"id":"evt_1","type":"invoice.paid"}';
  const secreto = 'whsec_prueba';
  const ahora = 1_790_000_000;

  it('vale la de Stripe, con su secreto y a tiempo', async () => {
    const firma = await firmarComoStripe(cuerpo, secreto, ahora);
    expect(await laFirmaEsDeStripe(cuerpo, firma, secreto, ahora + 60)).toBe(true);
  });

  it('no vale con otro secreto, con el cuerpo tocado, ni pasados cinco minutos', async () => {
    const firma = await firmarComoStripe(cuerpo, secreto, ahora);
    expect(await laFirmaEsDeStripe(cuerpo, firma, 'whsec_otro', ahora)).toBe(false);
    expect(await laFirmaEsDeStripe(`${cuerpo} `, firma, secreto, ahora)).toBe(false);
    expect(await laFirmaEsDeStripe(cuerpo, firma, secreto, ahora + 301)).toBe(false);
  });

  it('ignora lo que no sea v1: el v0 de pruebas es el camino de un ataque de degradación', async () => {
    const buena = await firmarComoStripe(cuerpo, secreto, ahora);
    const soloV0 = buena.replace('v1=', 'v0=');
    expect(await laFirmaEsDeStripe(cuerpo, soloV0, secreto, ahora)).toBe(false);
    // Y con varias firmas (cuando se cambia el secreto), basta con que una valga.
    expect(await laFirmaEsDeStripe(cuerpo, `${buena},v1=${'0'.repeat(64)}`, secreto, ahora)).toBe(
      true,
    );
  });

  it('sin cabecera o sin secreto, no', async () => {
    expect(await laFirmaEsDeStripe(cuerpo, null, secreto, ahora)).toBe(false);
    expect(await laFirmaEsDeStripe(cuerpo, 't=1,v1=ab', '', ahora)).toBe(false);
  });
});

describe('el formulario de Stripe', () => {
  it('aplana objetos y listas, y no manda lo que no hay', () => {
    const formulario = aFormulario({
      mode: 'subscription',
      line_items: [{ price: 'price_1', quantity: 2 }],
      subscription_data: { metadata: { organizacion_id: 'org' }, trial_period_days: undefined },
      allow_promotion_codes: true,
      nada: null,
    });
    expect([...formulario.entries()]).toEqual([
      ['mode', 'subscription'],
      ['line_items[0][price]', 'price_1'],
      ['line_items[0][quantity]', '2'],
      ['subscription_data[metadata][organizacion_id]', 'org'],
      ['allow_promotion_codes', 'true'],
    ]);
  });
});

describe('la suscripción de Stripe, traducida', () => {
  it('el fin del periodo sale de su línea (desde 2025), y la tarjeta se escribe como se lee', () => {
    const traducida = traducirSuscripcion({
      id: 'sub_1',
      status: 'trialing',
      customer: 'cus_1',
      metadata: { organizacion_id: 'org-1' },
      items: {
        data: [
          {
            id: 'si_1',
            quantity: 2,
            current_period_end: 1_791_000_000,
            price: { id: 'price_1', lookup_key: 'estook-cadena-mes-v1' },
          },
        ],
      },
      trial_end: 1_791_000_000,
      cancel_at_period_end: false,
      cancel_at: null,
      default_payment_method: { card: { brand: 'mastercard', last4: '4444' } },
    });
    expect(traducida).toMatchObject({
      organizacionId: 'org-1',
      linea: 'si_1',
      clave: 'estook-cadena-mes-v1',
      cantidad: 2,
      periodoHasta: new Date(1_791_000_000_000).toISOString(),
      cancelaAlAcabar: false,
      tarjeta: 'Mastercard ···· 4444',
    });
    expect(traducida.pruebaHasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
