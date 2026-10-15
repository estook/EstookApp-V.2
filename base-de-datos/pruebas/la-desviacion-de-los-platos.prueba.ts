import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal, masDias } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * La desviación de los platos (M9 · 2, 0086 · 3B, 0087): **construida y probada**, y
 * a la vista cuando la caja traiga lo vendido plato a plato (Estook TPV).
 *
 * El calendario: el pulpo se cuenta el D0 por la mañana (10 kg); entran 12 kg el D3;
 * cada día se venden 10 «Pulpo a feira», con 150 g de pulpo hasta el D3 y 160 g desde
 * que el D4 se cambia la receta; y el D7 por la mañana quedan 10,5 kg.
 *
 *   gastado     10 + 12 − 10,5           = 11,5 kg
 *   debía       4 × 10 × 0,15 + 3 × 10 × 0,16 = 6 + 4,8 = 10,8 kg
 *   desviación  11,5 − 10,8              = 0,7 kg que nadie sabe dónde fueron
 *
 * Con la receta de hoy para todos los días saldrían 11,2 kg y 0,3 kg: por eso **cada
 * día se cuenta con la receta que valía ese día** (Manifiesto 13).
 */

let base: BaseDePrueba;
const ROSA = 'rosa@ejemplo.estook.com';

const HOY = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');
const D0 = masDias(HOY, -8);
const D7 = masDias(HOY, -1);
const dia = (n: number) => masDias(D0, n);

let pulpo: string;
let plato: string;

function apiEl(instante: string): ApiDePrueba {
  return montarLaApi(base.bd, { ahora: () => new Date(instante) });
}

async function comoRosaEl(instante: string): Promise<{ api: ApiDePrueba; token: string }> {
  const entonces = apiEl(instante);
  return { api: entonces, token: await entonces.entrar(ROSA) };
}

beforeAll(async () => {
  base = await levantarBase();
  // Lo de ejemplo no cuenta para nada (Manifiesto 8): el local, de verdad.
  await base.bd.query(
    `update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`,
  );
  await base.bd.query(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);

  // ── D0, por la mañana: el pulpo, el plato con su receta y el primer inventario ─
  const { api: d0, token } = await comoRosaEl(`${D0}T05:00:00Z`);
  pulpo = losDatos<{ productoId: string }>(
    await d0.ejecutar(token, 'crear_producto', {
      nombre: 'Pulpo cocido',
      unidad_de_uso: 'kg',
      zona: 'cocina',
      cantidad_inicial: 10,
      precio_centimos: 3200,
    }),
  ).productoId;
  plato = losDatos<{ creados: { platoId: string }[] }>(
    await d0.ejecutar(token, 'crear_platos', {
      seccion_id: null,
      platos: [{ nombre: 'Pulpo a feira', precio_centimos: 1600 }],
    }),
  ).creados[0]?.platoId as string;
  losDatos(
    await d0.ejecutar(token, 'guardar_ficha', {
      plato_id: plato,
      version: 0,
      lineas: [{ producto_id: pulpo, cantidad: 150, unidad: 'g' }],
      pasos: [],
    }),
  );
  const { api: d0b, token: t0b } = await comoRosaEl(`${D0}T06:30:00Z`);
  losDatos(
    await d0b.ejecutar(t0b, 'cerrar_recuento', { lineas: [{ producto_id: pulpo, hay: 10 }] }),
  );

  // ── D3: entra pulpo. D4: la ración pasa a 160 g ────────────────────────────
  const { api: d3, token: t3 } = await comoRosaEl(`${dia(3)}T09:00:00Z`);
  losDatos(
    await d3.ejecutar(t3, 'apuntar_entrada', {
      producto_id: pulpo,
      cuanto: 12,
      como: 'unidades_de_uso',
      precio_centimos: 3200,
    }),
  );
  const { api: d4, token: t4 } = await comoRosaEl(`${dia(4)}T08:00:00Z`);
  losDatos(
    await d4.ejecutar(t4, 'guardar_ficha', {
      plato_id: plato,
      version: 1,
      lineas: [{ producto_id: pulpo, cantidad: 160, unidad: 'g' }],
      pasos: [],
    }),
  );

  // ── Siete días de caja, con el plato escrito como en la carta pero en minúsculas ─
  for (let n = 0; n < 7; n += 1) {
    const { api: noche, token: tn } = await comoRosaEl(`${dia(n)}T21:00:00Z`);
    losDatos(
      await noche.ejecutar(tn, 'cerrar_la_caja', {
        fecha: dia(n),
        total_centimos: 16000,
        lineas: [{ concepto: 'pulpo a feira', unidades: 10, importe_centimos: 16000 }],
      }),
    );
  }

  // ── D7, por la mañana: el segundo inventario ──────────────────────────────
  const { api: d7, token: t7 } = await comoRosaEl(`${D7}T06:00:00Z`);
  losDatos(
    await d7.ejecutar(t7, 'cerrar_recuento', { lineas: [{ producto_id: pulpo, hay: 10.5 }] }),
  );
}, 180_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la desviación de los platos', () => {
  it('cada día con la receta que valía ese día, y lo que falta producto a producto', async () => {
    const { api, token } = await comoRosaEl(`${D7}T10:00:00Z`);
    const desviacion = losDatos<{
      aLaVista: boolean;
      raciones: number;
      productos: {
        id: string;
        debia: number;
        gastado: number;
        desviacion: number;
        cuadra: boolean;
      }[];
    }>(await api.consultar(token, 'la_desviacion_de_los_platos'));

    expect(desviacion.raciones).toBe(70);
    expect(desviacion.productos).toEqual([
      expect.objectContaining({
        id: pulpo,
        debia: 10.8,
        gastado: 11.5,
        desviacion: 0.7,
        cuadra: false,
      }),
    ]);
    // Construida, y todavía sin enseñar: espera a la caja plato a plato del TPV.
    expect(desviacion.aLaVista).toBe(false);
  });
});
