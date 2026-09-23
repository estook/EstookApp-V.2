import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Las listas de Productos cuentan lo que enseñan (23-sep-2026).
 *
 * Lo vio Richi: «11 productos por debajo del mínimo», y salían tres; «11 con algo
 * congelado», y salían dos. El título contaba **todos los productos del local**, fuera
 * cual fuera la vista. Y «Bajo mínimo» tenía otro fallo debajo: traía los cincuenta
 * primeros del abecedario y filtraba después, así que con más de cincuenta productos
 * se perdía los del final.
 *
 * Se comprueba lo que tiene que ser verdad siempre, con los productos que haya:
 *
 *   · el título dice exactamente cuántos salen, en cada vista
 *   · y lo sigue diciendo con la lista partida en páginas, que es donde se perdían
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let rosa: string;

const ROSA = 'rosa@ejemplo.estook.com';

interface Lista {
  productos: { id: string; nombre: string; estado: string }[];
  cuantosHay: number;
  cuantosCumplen: number;
  hayMas: boolean;
}

const lista = async (entrada: Record<string, string>) =>
  losDatos<Lista>(await api.consultar(rosa, 'mis_productos', entrada));

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);

  // Tres por debajo del mínimo, con nombres del final del abecedario —donde se
  // perdían—, y dos que están bien.
  for (const [nombre, cantidad, minimo] of [
    ['Zanahoria de la cuenta', 1, 10],
    ['Zumo de la cuenta', 0, 4],
    ['Yogur de la cuenta', 2, 6],
    ['Arroz de la cuenta', 20, 5],
    ['Azúcar de la cuenta', 30, 5],
  ] as const) {
    losDatos(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre,
        unidad_de_uso: 'kg',
        zona: 'cocina',
        precio_centimos: 100,
        cantidad_inicial: cantidad,
        minimo,
      }),
    );
  }
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el título de cada vista cuenta lo que enseña', () => {
  it('en «Bajo mínimo», el número es el de los que salen, y salen los del final', async () => {
    const todos = await lista({ con_problema: 'true', limite: '200' });
    expect(todos.cuantosCumplen).toBe(todos.productos.length);
    expect(todos.hayMas).toBe(false);
    for (const nombre of ['Zanahoria de la cuenta', 'Zumo de la cuenta', 'Yogur de la cuenta']) {
      expect(
        todos.productos.map((p) => p.nombre),
        nombre,
      ).toContain(nombre);
    }
    // Y ninguno de los que están bien.
    expect(todos.productos.map((p) => p.nombre)).not.toContain('Arroz de la cuenta');
    // El total del local sigue siendo otra cosa: por eso no valía de título.
    expect(todos.cuantosHay).toBeGreaterThan(todos.cuantosCumplen);
  });

  it('en «Bajo mínimo» por páginas, el total no cambia y se dice que hay más', async () => {
    const todos = await lista({ con_problema: 'true', limite: '200' });
    const primera = await lista({ con_problema: 'true', limite: '1' });
    expect(primera.productos).toHaveLength(1);
    expect(primera.cuantosCumplen).toBe(todos.cuantosCumplen);
    expect(primera.hayMas).toBe(true);

    const segunda = await lista({ con_problema: 'true', limite: '1', salto: '1' });
    expect(segunda.productos[0]?.id).not.toBe(primera.productos[0]?.id);
  });

  it('en «Todo» y en «Sin precio», igual', async () => {
    for (const entrada of [{}, { sin_precio: 'true' }, { congelados: 'true' }]) {
      const entera = await lista({ ...entrada, limite: '200' });
      expect(entera.cuantosCumplen, JSON.stringify(entrada)).toBe(entera.productos.length);

      const partida = await lista({ ...entrada, limite: '1' });
      expect(partida.cuantosCumplen, JSON.stringify(entrada)).toBe(entera.cuantosCumplen);
      expect(partida.hayMas, JSON.stringify(entrada)).toBe(entera.cuantosCumplen > 1);
    }
  });
});
