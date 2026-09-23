import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Nunca se tira más de lo que hay (23-sep-2026).
 *
 * «Si algo se tira en merma y se está tirando más de lo que hay, indicar que no se
 * puede tirar más a la basura de lo que hay» (Richi). Hasta hoy el servidor restaba
 * lo que se le dijera, y el producto se quedaba en negativo. Se prueba llamando a la
 * API a pelo, que es lo que la pantalla no puede garantizar (regla 4), por los dos
 * caminos que tiran algo: la merma y quitar un lote tirado.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let rosa: string;

const ROSA = 'rosa@ejemplo.estook.com';

const loQueQueda = async (productoId: string) =>
  losDatos<{ producto: { cantidad: number } }>(
    await api.consultar(rosa, 'un_producto', { producto_id: productoId }),
  ).producto.cantidad;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la merma, nunca más de lo que hay', () => {
  it('con 2 kg, tirar 5 no se deja, lo dice, y no toca el libro', async () => {
    const { productoId } = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Merluza de la merma',
        unidad_de_uso: 'kg',
        zona: 'cocina',
        precio_centimos: 900,
        cantidad_inicial: 2,
      }),
    );

    const demasiado = await api.ejecutar(rosa, 'apuntar_merma', {
      producto_id: productoId,
      cuanto: 5,
      motivo: 'mal_estado',
    });
    expect(elFallo(demasiado)).toBe('mas_de_lo_que_hay');
    expect(JSON.stringify(demasiado)).toContain('Quedan 2 kg');
    expect(await loQueQueda(productoId)).toBe(2);

    // Lo que hay, sí.
    losDatos(
      await api.ejecutar(rosa, 'apuntar_merma', {
        producto_id: productoId,
        cuanto: 2,
        motivo: 'mal_estado',
      }),
    );
    expect(await loQueQueda(productoId)).toBe(0);

    // Y con la cámara ya vacía, nada.
    expect(
      elFallo(
        await api.ejecutar(rosa, 'apuntar_merma', {
          producto_id: productoId,
          cuanto: 0.5,
          motivo: 'mal_estado',
        }),
      ),
    ).toBe('mas_de_lo_que_hay');
  });

  it('al quitar un lote tirado, tampoco se tira más de lo que hay', async () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const { productoId } = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Nata de la merma',
        unidad_de_uso: 'l',
        zona: 'cocina',
        precio_centimos: 250,
        cantidad_inicial: 3,
        caduca_el: manana,
      }),
    );
    const { lotes } = losDatos<{ lotes: { id: string }[] }>(
      await api.consultar(rosa, 'un_producto', { producto_id: productoId }),
    );
    const loteId = lotes[0]?.id ?? '';

    const demasiado = await api.ejecutar(rosa, 'quitar_lote', {
      lote_id: loteId,
      como: 'tirado',
      cuanto: 10,
    });
    expect(elFallo(demasiado)).toBe('mas_de_lo_que_hay');
    expect(await loQueQueda(productoId)).toBe(3);
  });
});
