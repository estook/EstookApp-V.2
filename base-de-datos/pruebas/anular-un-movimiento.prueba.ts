import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El atún de IKATZ (repaso del 3-oct · migración 0055).
 *
 * Santi sacó 2.000 kg de atún donde había 6,6: tenía elegido «por kilo» y escribió
 * 2000. Nada lo frenó, el almacén quedó en −1.993 kg, la ficha decía que «valía»
 * −51.800 € y las dos toneladas contaban como vendidas en cada cuenta. Y no había
 * forma de deshacerlo: «¿No cuadra?» arreglaba lo que hay, no lo vendido.
 *
 * Aquí se prueba el camino entero: que sacar más de lo que hay pide confirmarlo,
 * que lo que está en negativo no vale dinero negativo, y que anular deja el libro
 * entero y saca de las cuentas las dos líneas.
 */

let base: BaseDePrueba;
let api: ApiDePrueba;
let rosa: string;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function loQueHay(productoId: string): Promise<number> {
  const [fila] = await comoDuena<{ cantidad: string }>(
    'select cantidad::text as cantidad from estook.existencias where producto_id = $1',
    [productoId],
  );
  return fila === undefined ? 0 : Number(fila.cantidad);
}

interface LineaDelLibro {
  readonly id: string;
  readonly tipo: string;
  readonly cantidad: number;
  readonly anulado: boolean;
  readonly esAnulacion: boolean;
  readonly sePuedeAnular: boolean;
}

async function elLibro(productoId: string): Promise<readonly LineaDelLibro[]> {
  return losDatos<{ movimientos: LineaDelLibro[] }>(
    await api.consultar(rosa, 'un_producto', { producto_id: productoId }),
  ).movimientos;
}

describe('sacar más de lo que hay', () => {
  let atun: string;
  let venta: string;

  it('pide confirmarlo, y sin confirmar no apunta nada', async () => {
    atun = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Atún de la prueba',
        unidad_de_uso: 'kg',
        cantidad_inicial: 6.6,
        precio_centimos: 1818,
      }),
    ).productoId;

    const sinConfirmar = await api.ejecutar(rosa, 'apuntar_salida', {
      producto_id: atun,
      cuanto: 2000,
      por_que: 'vendido',
    });
    expect(elFallo(sinConfirmar)).toBe('no_consta_tanto');
    // Y dice cuánto hay, para que la pantalla lo enseñe.
    expect(sinConfirmar.estado === 'fallo' ? sinConfirmar.detalle?.['hay'] : null).toBe(6.6);
    expect(await loQueHay(atun)).toBe(6.6);
  });

  it('lo que cabe en lo que hay no pregunta nada', async () => {
    losDatos(await api.ejecutar(rosa, 'apuntar_salida', { producto_id: atun, cuanto: 0.6 }));
    expect(await loQueHay(atun)).toBe(6);
  });

  it('confirmado, sí: el negativo se permite (Manifiesto 28)', async () => {
    venta = losDatos<{ movimientoId: string }>(
      await api.ejecutar(rosa, 'apuntar_salida', {
        producto_id: atun,
        cuanto: 2000,
        por_que: 'vendido',
        aunque_no_conste: true,
      }),
    ).movimientoId;
    expect(await loQueHay(atun)).toBe(-1994);
  });

  it('y en negativo no vale dinero negativo', async () => {
    const ficha = losDatos<{ producto: { valorCentimos?: number | null } }>(
      await api.consultar(rosa, 'un_producto', { producto_id: atun }),
    );
    expect(ficha.producto.valorCentimos).toBe(0);
  });

  it('anular deja el libro entero y devuelve lo que hay', async () => {
    const antes = await elLibro(atun);
    expect(antes.find((m) => m.id === venta)?.sePuedeAnular).toBe(true);

    losDatos(
      await api.ejecutar(rosa, 'anular_movimiento', {
        movimiento_id: venta,
        motivo: 'Me equivoqué de unidad',
      }),
    );
    expect(await loQueHay(atun)).toBe(6);

    const despues = await elLibro(atun);
    // Una línea más, no una menos: el libro solo se añade (regla 8).
    expect(despues).toHaveLength(antes.length + 1);
    const anulada = despues.find((m) => m.id === venta);
    expect(anulada?.anulado).toBe(true);
    expect(anulada?.sePuedeAnular).toBe(false);
    const laQueAnula = despues.find((m) => m.esAnulacion);
    expect(laQueAnula).toMatchObject({ tipo: 'venta', cantidad: 2000, sePuedeAnular: false });
  });

  it('y las dos dejan de contar en lo vendido y en lo que se gasta', async () => {
    const [cuentan] = await comoDuena<{ ventas: string; lineas: string }>(
      `select count(*) filter (where tipo = 'venta')::text as ventas, count(*)::text as lineas
         from estook.movimiento_que_cuenta where producto_id = $1`,
      [atun],
    );
    // Quedan la entrada del alta y la salida de 0,6: ninguna venta.
    expect(cuentan).toEqual({ ventas: '0', lineas: '2' });
  });

  it('una vez, y la que anula no se anula', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'anular_movimiento', { movimiento_id: venta, motivo: 'Otra vez' }),
      ),
    ).toBe('no_se_puede_anular');

    const laQueAnula = (await elLibro(atun)).find((m) => m.esAnulacion);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'anular_movimiento', {
          movimiento_id: laQueAnula?.id ?? '0',
          motivo: 'Deshacer lo deshecho',
        }),
      ),
    ).toBe('no_se_puede_anular');
  });

  it('un ajuste no se anula: lo que hay se corrige con «¿No cuadra?»', async () => {
    losDatos(
      await api.ejecutar(rosa, 'ajustar_stock', { producto_id: atun, hay: 5, motivo: 'Contado' }),
    );
    const ajuste = (await elLibro(atun)).find((m) => m.tipo === 'ajuste');
    expect(ajuste?.sePuedeAnular).toBe(false);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'anular_movimiento', {
          movimiento_id: ajuste?.id ?? '0',
          motivo: 'No',
        }),
      ),
    ).toBe('no_se_puede_anular');
  });

  it('sin decir por qué no se anula nada', async () => {
    const salida = (await elLibro(atun)).find((m) => m.tipo === 'salida');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'anular_movimiento', {
          movimiento_id: salida?.id ?? '0',
          motivo: ' ',
        }),
      ),
    ).toBe('faltan_datos');
  });
});
