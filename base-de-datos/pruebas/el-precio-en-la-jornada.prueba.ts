import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { losDatos, montarLaApi } from './despachador.ts';

/**
 * **El precio se apunta en la jornada del local** (18-oct, decisión 0096; regla 10).
 *
 * Richi: «la jornada puede acabar de madrugada perfectamente o incluso más tarde; si no,
 * se mezcla el dinero». Bar Centro corta a las 3:00 (sus semillas): un precio puesto a
 * las 2:30 de Madrid es **de la jornada de ayer**, como el stock, los fichajes y el
 * cierre. Antes se apuntaba con `current_date`, el día de la hora universal, que no
 * sabe nada del local: aquí, el de la base, que no es ni el de esa noche.
 */
let base: BaseDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

// El domingo 18-oct a las 2:30 de Madrid (0:30 en la hora universal, que ya es día 18):
// la jornada es la del sábado 17, porque Bar Centro corta a las 3:00.
const DE_MADRUGADA = new Date('2026-10-18T00:30:00Z');
// Y el mismo domingo a las 13:00 de Madrid: ya es la jornada del 18.
const A_MEDIODIA = new Date('2026-10-18T11:00:00Z');

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

beforeAll(async () => {
  base = await levantarBase();
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function losPreciosDe(
  productoId: string,
): Promise<{ precio: number; desde: string; hasta: string | null }[]> {
  return comoDuena(
    `select precio_centimos as precio, desde::text as desde, hasta::text as hasta
       from estook.precio_de_producto where producto_id = $1 order by creado_en`,
    [productoId],
  );
}

describe('el precio, en la jornada del local', () => {
  it('de madrugada cuenta en la jornada de la noche; a mediodía, en la nueva', async () => {
    const deNoche = montarLaApi(base.bd, { ahora: () => DE_MADRUGADA });
    const rosa = await deNoche.entrar(ROSA);
    const { productoId } = losDatos<{ productoId: string }>(
      await deNoche.ejecutar(rosa, 'crear_producto', {
        nombre: 'Aceite de la jornada',
        factor: 1,
        unidad_de_uso: 'l',
        precio_centimos: 620,
      }),
    );
    // El primero, creado a las 2:30: de la jornada del sábado.
    expect(await losPreciosDe(productoId)).toEqual([
      { precio: 620, desde: '2026-10-17', hasta: null },
    ]);

    // A las 2:30 sube el aceite: el de antes acaba el viernes, y el nuevo vale desde el
    // sábado (la noche que sigue abierta).
    losDatos(
      await deNoche.ejecutar(rosa, 'poner_precio', {
        producto_id: productoId,
        precio_centimos: 710,
      }),
    );
    expect((await losPreciosDe(productoId)).map((p) => [p.desde, p.hasta])).toEqual([
      ['2026-10-17', '2026-10-17'],
      ['2026-10-17', null],
    ]);

    // A mediodía del domingo vuelve a cambiar: ya es la jornada del 18.
    const deDia = montarLaApi(base.bd, { ahora: () => A_MEDIODIA });
    const rosaDeDia = await deDia.entrar(ROSA);
    losDatos(
      await deDia.ejecutar(rosaDeDia, 'poner_precio', {
        producto_id: productoId,
        precio_centimos: 690,
      }),
    );
    expect((await losPreciosDe(productoId)).map((p) => [p.precio, p.desde, p.hasta])).toEqual([
      [620, '2026-10-17', '2026-10-17'],
      [710, '2026-10-17', '2026-10-17'],
      [690, '2026-10-18', null],
    ]);
  });

  it('lo pactado con un proveedor vale hasta el final de su último día de jornada', async () => {
    const deNoche = montarLaApi(base.bd, { ahora: () => DE_MADRUGADA });
    const rosa = await deNoche.entrar(ROSA);
    const { proveedorId } = losDatos<{ proveedorId: string }>(
      await deNoche.ejecutar(rosa, 'crear_proveedor', { nombre: 'Harinas de la jornada' }),
    );
    const { productoId } = losDatos<{ productoId: string }>(
      await deNoche.ejecutar(rosa, 'crear_producto', {
        nombre: 'Harina pactada',
        factor: 1,
        unidad_de_uso: 'kg',
        precio_centimos: 90,
        proveedor_id: proveedorId,
        // Sin nada en la cámara y con mínimo: sale en el pedido sugerido, con su precio.
        minimo: 5,
      }),
    );
    // Pactado hasta el sábado 17. A las 2:30 del domingo aún es la noche del sábado.
    losDatos(
      await deNoche.ejecutar(rosa, 'pactar_precio', {
        producto_id: productoId,
        proveedor_id: proveedorId,
        precio_centimos: 80,
        hasta: '2026-10-17',
      }),
    );
    const [pactado] = await comoDuena<{ desde: string }>(
      `select desde::text as desde from estook.precio_pactado where producto_id = $1`,
      [productoId],
    );
    expect(pactado?.desde).toBe('2026-10-17');

    // El pedido sugerido lo ve vigente a las 2:30 del domingo (aún es la noche del
    // sábado), y a mediodía ya no: vuelve al de siempre.
    const elDeLaHarina = async (api: ReturnType<typeof montarLaApi>, token: string) =>
      losDatos<{ lineas: { productoId: string; precioCentimos?: number | null }[] }>(
        await api.consultar(token, 'sugerencia_de_pedido', { proveedor_id: proveedorId }),
      ).lineas.find((l) => l.productoId === productoId)?.precioCentimos;
    expect(await elDeLaHarina(deNoche, rosa)).toBe(80);
    const deDia = montarLaApi(base.bd, { ahora: () => A_MEDIODIA });
    expect(await elDeLaHarina(deDia, await deDia.entrar(ROSA))).toBe(90);
  });
});
