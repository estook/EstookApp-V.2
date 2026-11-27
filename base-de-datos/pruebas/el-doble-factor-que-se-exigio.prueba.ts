import { afterAll, beforeAll, expect, it } from 'vitest';
import { codigoEn } from '../../servidor/dominio/doble-factor.ts';
import { CLAVE_DE_EJEMPLO } from '../semillas/acceso.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **El doble factor que se exigió** (migración 0138; la Auditoría 3, 16.4; lo vio Richi el 27-nov).
 *
 * Grupo Costa exige el doble factor; Vera lo activa porque es obligatorio e Ignacio ya lo tenía por su cuenta.
 * Cuando Elena (la dirección) deja de exigirlo, **a Vera se le deja de pedir** e Ignacio lo conserva.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let org = '';

const ELENA = 'elena@ejemplo.estook.com';
const VERA = 'vera@ejemplo.estook.com';
const IGNACIO = 'ignacio@ejemplo.estook.com';

async function entrar(correo: string) {
  return losDatos<{ token: string; faltaDobleFactor: boolean }>(
    await api.ejecutar(null, 'entrar', { correo, contrasena: CLAVE_DE_EJEMPLO }),
  );
}

async function activarlo(correo: string): Promise<void> {
  const { token } = await entrar(correo);
  const alta = losDatos<{ secreto: string }>(await api.ejecutar(token, 'activar_doble_factor', {}));
  losDatos(
    await api.ejecutar(token, 'confirmar_doble_factor', {
      codigo: await codigoEn(alta.secreto.replace(/\s/g, ''), new Date(Date.now())),
    }),
  );
}

async function exigirlo(exigir: boolean) {
  const token = await api.entrar(ELENA);
  const [fila] = (
    await base.bd.query<{ version: number }>(
      'select version from estook.organizacion where id = $1',
      [org],
    )
  ).rows;
  return losDatos<{ aQuienSeLeQuita: number }>(
    await api.ejecutar(token, 'exigir_doble_factor', {
      organizacion_id: org,
      exigir,
      version: fila?.version,
    }),
  );
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  const [fila] = (
    await base.bd.query<{ id: string }>(
      `select id::text as id from estook.organizacion where codigo = 'grupo-costa'`,
    )
  ).rows;
  org = fila?.id ?? '';
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

it('quien lo activó porque era obligatorio deja de tenerlo; quien lo puso por su cuenta, no', async () => {
  // Ignacio lo pone por su cuenta, antes de que nadie lo exija.
  await activarlo(IGNACIO);
  // La empresa lo exige, y Vera lo activa porque es obligatorio.
  await exigirlo(true);
  await activarlo(VERA);
  expect((await entrar(VERA)).faltaDobleFactor).toBe(true);
  expect((await entrar(IGNACIO)).faltaDobleFactor).toBe(true);

  // La empresa deja de exigirlo: a Vera se le quita, y lo dice.
  expect((await exigirlo(false)).aQuienSeLeQuita).toBe(1);
  expect((await entrar(VERA)).faltaDobleFactor).toBe(false);
  // Ignacio lo puso él: lo sigue teniendo.
  expect((await entrar(IGNACIO)).faltaDobleFactor).toBe(true);
});

it('el del admin de Estook no se pide en la app, salvo que la empresa lo exija', async () => {
  // Ignacio lo tiene (de la prueba de arriba). Como si lo hubiera activado para el admin de Estook.
  await base.bd.query(
    `update estook.doble_factor set por_el_admin = true
      where persona_id = (select id from estook.persona where correo = $1)`,
    [IGNACIO],
  );
  expect((await entrar(IGNACIO)).faltaDobleFactor).toBe(false);
  // Si su empresa lo exige, sí se le pide, también en la app.
  await exigirlo(true);
  expect((await entrar(IGNACIO)).faltaDobleFactor).toBe(true);
  await exigirlo(false);
  // Y al dejar de exigirlo no se le quita: lo necesita para el admin.
  expect((await entrar(IGNACIO)).faltaDobleFactor).toBe(false);
  const [fila] = (
    await base.bd.query<{ hay: number }>(
      `select count(*)::int as hay from estook.doble_factor
        where persona_id = (select id from estook.persona where correo = $1)`,
      [IGNACIO],
    )
  ).rows;
  expect(fila?.hay).toBe(1);
});
