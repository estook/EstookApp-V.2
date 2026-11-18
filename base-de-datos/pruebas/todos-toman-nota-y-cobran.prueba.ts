import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { puedeEditar, type PermisosResueltos } from '@estook/permisos';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **Todos toman nota y cobran** (migración 0119, decisión 0148; Richi, 17 y 18-nov: «he entrado
 * con un cocinero y me dice que no puede; sí puede, pueden todos»). Marcos es el cocinero de Bar
 * Centro: teclea su PIN en la caja, ve la sala y puede cobrar. Los Ajustes del TPV siguen siendo de
 * quien los tenía.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let llave: string;

const ROSA = 'rosa@ejemplo.estook.com';
const MARCOS = 'marcos@ejemplo.estook.com';

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  const barCentro = await base.localPorCodigo('bar-centro');
  llave = losDatos<{ llave: string }>(
    await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Cajón 1',
    }),
  ).llave;
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

describe('todos toman nota y cobran (0119)', () => {
  it('el cocinero entra en la caja, ve la sala y puede cobrar', async () => {
    const dentro = losDatos<{ turno: string }>(
      await entrarFichando(api, llave, base.pinDe(MARCOS, 'bar-centro'), llave),
    );
    const marcos = tokenDelAparato(dentro.turno, llave);
    const yo = losDatos<{ permisos: PermisosResueltos }>(
      await api.consultar(marcos, 'yo_en_el_tpv'),
    );
    expect(puedeEditar(yo.permisos, 'accion.tomar_nota')).toBe(true);
    expect(puedeEditar(yo.permisos, 'accion.cobrar')).toBe(true);
    // Los Ajustes del TPV no vienen con esto.
    expect(puedeEditar(yo.permisos, 'accion.ajustes_del_tpv')).toBe(false);
    // Y la sala se le abre: hasta la 0119, `sin_permiso`.
    expect((await api.consultar(marcos, 'el_plano')).estado).toBe('ok');
  });
});
