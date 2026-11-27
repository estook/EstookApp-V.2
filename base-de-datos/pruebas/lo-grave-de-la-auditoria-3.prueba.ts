import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **Lo grave de la Auditoría 3** (migración 0137; docs/auditorias/auditoria-2026-11-27-la-auditoria-3.md):
 *
 *   G1 · la ficha privada solo se ve hacia abajo: una gerente no ve la de la dirección
 *   G2 · lo de toda la empresa, solo quien es de toda ella: una gerente de un local no la renombra
 *   G3 · ni da puestos de toda la empresa (RRHH, gestoría…)
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let org = '';

const VERA = 'vera@ejemplo.estook.com'; // gerente de Bar Ribera
const ELENA = 'elena@ejemplo.estook.com'; // dirección de Grupo Costa
const IGNACIO = 'ignacio@ejemplo.estook.com'; // area manager de Zona Norte

const q = async <T = Record<string, unknown>>(t: string, p: unknown[] = []) =>
  (await base.bd.query<T>(t, p)).rows;
const idDe = async (correo: string) =>
  String((await q(`select id::text as id from estook.persona where correo = $1`, [correo]))[0]?.['id']);

async function laPrivadaQueVe(quien: string, de: string, local: string): Promise<unknown> {
  const token = await api.entrar(quien);
  const localId = String((await q(`select id::text as id from estook.local where codigo = $1`, [local]))[0]?.['id']);
  losDatos(await api.ejecutar(token, 'cambiar_de_contexto', { local_id: localId }));
  const r = await api.consultar(token, 'una_persona', { persona_id: await idDe(de) });
  if (r.estado !== 'ok') return null;
  return (r.datos as { ficha?: { privada?: unknown } }).ficha?.privada ?? null;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  org = String((await q(`select id::text as id from estook.organizacion where codigo = 'grupo-costa'`))[0]?.['id']);
  for (const correo of [ELENA, IGNACIO, VERA]) {
    await q(
      `insert into estook.ficha_privada (persona_id, organizacion_id, dni, sueldo_centimos)
       values ($1, $2, '12345678Z', 250000)`,
      [await idDe(correo), org],
    );
  }
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('G1 · la ficha privada, solo hacia abajo', () => {
  it('la gerente no ve la de la dirección, y el area manager tampoco', async () => {
    expect(await laPrivadaQueVe(VERA, ELENA, 'bar-ribera')).toBeNull();
    expect(await laPrivadaQueVe(IGNACIO, ELENA, 'bar-puerto')).toBeNull();
  });

  it('la dirección sí ve la de la gerente y la del area manager', async () => {
    expect(await laPrivadaQueVe(ELENA, VERA, 'bar-ribera')).toMatchObject({ dni: '12345678Z' });
    expect(await laPrivadaQueVe(ELENA, IGNACIO, 'bar-puerto')).toMatchObject({ dni: '12345678Z' });
  });

  it('a pelo contra la base, la gerente no lee la fila de la dirección', async () => {
    const filas = await base.comoPersona(await idDe(VERA), () =>
      q(`select dni from estook.ficha_privada where persona_id = $1`, [ELENA_ID]),
    );
    expect(filas).toEqual([]);
  });
});

let ELENA_ID = '';
beforeAll(async () => {
  ELENA_ID = await idDe(ELENA);
});

describe('G2 · lo de toda la empresa, solo quien es de toda ella', () => {
  for (const correo of [VERA, IGNACIO]) {
    it(`${correo.split('@')[0]} no renombra la empresa ni le cambia el doble factor`, async () => {
      const token = await api.entrar(correo);
      const v = Number((await q(`select version from estook.organizacion where id = $1`, [org]))[0]?.['version']);
      expect(
        elFallo(
          await api.ejecutar(token, 'cambiar_nombre_del_negocio', { organizacion_id: org, nombre: 'Otra', version: v }),
        ),
      ).toBe('sin_permiso');
      expect(
        elFallo(await api.ejecutar(token, 'exigir_doble_factor', { organizacion_id: org, exigir: true, version: v })),
      ).toBe('sin_permiso');
    });
  }
});

describe('G3 · los puestos de toda la empresa, solo los da quien es de toda ella', () => {
  it('la gerente de un local no crea un RRHH ni una gestoría para todos', async () => {
    const token = await api.entrar(VERA);
    for (const rol of ['rrhh', 'gestoria', 'chef_corporativo', 'compras_central']) {
      expect(
        elFallo(
          await api.ejecutar(token, 'invitar_persona', {
            correo: `${rol}.de.vera@ejemplo.estook.com`,
            nombre: 'Alguien',
            rol,
            organizacion_id: org,
          }),
        ),
      ).toBe('sin_permiso');
    }
  });

  it('la dirección sí', async () => {
    const token = await api.entrar(ELENA);
    losDatos(
      await api.ejecutar(token, 'invitar_persona', {
        correo: 'rrhh.de.elena@ejemplo.estook.com',
        nombre: 'RRHH',
        rol: 'rrhh',
        organizacion_id: org,
      }),
    );
  });
});
