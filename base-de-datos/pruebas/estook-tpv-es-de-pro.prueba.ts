import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **Estook TPV es de Pro** (decisión 0120; Richi, 28-oct: «TPV es únicamente Pro»), contra la
 * base: lo decide la API, no la pantalla.
 *
 *   · con Pro (y en la cuenta de ejemplo, donde se practica) se vincula, late y se trabaja
 *   · en Esencial o en Pausa, el aparato no late ni entra, y no se vincula otro —ni con el
 *     correo ni con un código sacado antes—, **sin desvincular ni borrar nada**
 *   · al volver a Pro, el mismo aparato entra como siempre
 *   · Estook sabe si la cuenta lo lleva, para el botón de Ajustes
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let enLaCaja: string;

async function comoDuena(consulta: string, parametros: unknown[] = []): Promise<void> {
  await base.bd.query(consulta, parametros);
}

/** El plan de la organización de bar-centro, ya sin ser de ejemplo. */
async function conElPlan(plan: string): Promise<void> {
  await comoDuena(
    `update estook.suscripcion s set plan = $1, estado = 'activa', de_la_casa = false
       from estook.local l
      where l.codigo = 'bar-centro' and s.organizacion_id = l.organizacion_id`,
    [plan],
  );
}

const late = async () =>
  api.ejecutar(null, 'latir_el_aparato', { llave: llaveDeLaCaja, version: 'prueba' });

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  barCentro = await base.localPorCodigo('bar-centro');
  llaveDeLaCaja = losDatos<{ llave: string }>(
    await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Cajón 1',
    }),
  ).llave;
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llaveDeLaCaja, base.pinDe(ROSA, 'bar-centro'), llaveDeLaCaja),
  );
  enLaCaja = tokenDelAparato(dentro.turno, llaveDeLaCaja);
  // Desde aquí, una cuenta de verdad: la de ejemplo lo tiene todo, como la casa.
  await comoDuena(
    `update estook.organizacion o set es_ejemplo = false
       from estook.local l where l.codigo = 'bar-centro' and o.id = l.organizacion_id`,
  );
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

describe('Estook TPV es de Pro (0120)', () => {
  it('con Pro, el aparato late y quien entra trabaja', async () => {
    await conElPlan('pro');
    expect((await late()).estado).toBe('ok');
    expect((await api.consultar(enLaCaja, 'yo_en_el_tpv')).estado).toBe('ok');
  });

  it('en Esencial, ni late ni entra, y no se vincula otro', async () => {
    const { codigo } = losDatos<{ codigo: string }>(
      await api.ejecutar(enLaCaja, 'sacar_codigo_para_vincular', {
        funcion: 'comandero',
        nombre: 'Tablet',
      }),
    );
    await conElPlan('esencial');

    expect(elFallo(await late())).toBe('estook_tpv_es_de_pro');
    expect(elFallo(await api.consultar(enLaCaja, 'yo_en_el_tpv'))).toBe('estook_tpv_es_de_pro');
    // Un código sacado con Pro no vincula después.
    expect(elFallo(await api.ejecutar(null, 'vincular_con_codigo', { codigo }))).toBe(
      'estook_tpv_es_de_pro',
    );
    // Ni el primero, con el correo.
    expect(
      elFallo(
        await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
          local_id: barCentro,
          funcion: 'caja',
          nombre: 'Caja 2',
        }),
      ),
    ).toBe('estook_tpv_es_de_pro');
  });

  it('no se desvincula nada: los aparatos siguen ahí', async () => {
    const { rows } = await base.bd.query<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.terminal t
         join estook.local l on l.id = t.local_id
        where l.codigo = 'bar-centro' and t.retirado_en is null`,
    );
    expect(rows[0]?.cuantos).toBe(1);
  });

  it('en Pausa, tampoco', async () => {
    await conElPlan('pausa');
    expect(elFallo(await late())).toBe('estook_tpv_es_de_pro');
  });

  it('Estook lo sabe, para el botón de Ajustes', async () => {
    const rosa = await api.entrar(ROSA);
    await conElPlan('esencial');
    const conEsencial = losDatos<{ cuenta: { conEstookTpv: boolean } }>(
      await api.consultar(rosa, 'quien_soy'),
    );
    expect(conEsencial.cuenta.conEstookTpv).toBe(false);
    await conElPlan('cadena');
    const conCadena = losDatos<{ cuenta: { conEstookTpv: boolean } }>(
      await api.consultar(rosa, 'quien_soy'),
    );
    expect(conCadena.cuenta.conEstookTpv).toBe(true);
  });

  it('al volver a Pro, el mismo aparato entra como siempre', async () => {
    await conElPlan('pro');
    expect((await late()).estado).toBe('ok');
    expect((await api.consultar(enLaCaja, 'yo_en_el_tpv')).estado).toBe('ok');
  });
});
