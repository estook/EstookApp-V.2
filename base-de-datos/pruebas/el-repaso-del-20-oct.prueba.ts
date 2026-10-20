import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El repaso del 20-oct (0100), con el despachador de verdad y la base de verdad.
 *
 * Richi: «91.000 € en compras y en Compras no es así», «corrijo a 50 kg y dice 250», «la
 * albahaca me la pide en unidades», y dos precios vivos para el mismo producto. Lo que
 * vive en el servidor tiene aquí su prueba; lo de la pantalla («¿No cuadra?» en kilos y
 * el inventario en una casilla), en el dominio y en las de pantalla.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

let rosa: string;

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

interface Indicador {
  readonly total: number | null;
  readonly jornada: string;
}

async function indicador(cual: string): Promise<Indicador> {
  return losDatos<Indicador>(
    await api.consultar(rosa, 'un_indicador', { indicador: cual, dias: '7' }),
  );
}

describe('las compras son lo comprado', () => {
  it('lo que había al dar de alta un producto no es una compra; lo que llega, sí', async () => {
    const antes = await indicador('compras');
    const productoId = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Harina repaso 20',
        formato: 'Saco de 25 kg',
        factor: 25,
        unidad_de_uso: 'kg',
        precio_centimos: 2500,
        cantidad_inicial: 50,
      }),
    ).productoId;
    expect((await indicador('compras')).total).toBe(antes.total);

    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: productoId,
        cuanto: 2,
        como: 'formatos',
        precio_centimos: 2500,
      }),
    );
    expect(((await indicador('compras')).total ?? 0) - (antes.total ?? 0)).toBe(5000);
  });
});

describe('un precio vivo de cada proveedor', () => {
  it('cambiar el precio sin decir de quién es el del proveedor del producto', async () => {
    const proveedorId = losDatos<{ proveedorId: string }>(
      await api.ejecutar(rosa, 'crear_proveedor', {
        nombre: 'Pollos repaso 20',
        como_se_pide: 'whatsapp',
        whatsapp: '612 00 00 20',
        dias_de_reparto: [1, 2, 3, 4, 5, 6, 7],
      }),
    ).proveedorId;
    const productoId = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Contramuslos repaso 20',
        formato: 'Caja de 5 kg',
        factor: 5000,
        unidad_de_uso: 'g',
        proveedor_id: proveedorId,
        precio_centimos: 4545,
      }),
    ).productoId;

    losDatos(
      await api.ejecutar(rosa, 'poner_precio', {
        producto_id: productoId,
        precio_centimos: 5000,
        proveedor_id: null,
      }),
    );
    const vivos = await comoDuena<{ precio: string; proveedor: string | null }>(
      `select precio_centimos::text as precio, proveedor_id::text as proveedor
         from estook.precio_de_producto where producto_id = $1 and hasta is null`,
      [productoId],
    );
    expect(vivos).toEqual([{ precio: '5000', proveedor: proveedorId }]);
  });
});

describe('la albahaca en bandejas de 200 g', () => {
  it('el aceite de albahaca se escribe en gramos y cuesta lo de sus bandejas', async () => {
    // Caja de 5 bandejas de 200 g a 6,80 €: la bandeja, 1,36 €.
    const albahaca = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Albahaca repaso 20',
        formato: 'Caja de 5 bandejas de 200 g',
        factor: 5,
        unidad_de_uso: 'ud',
        contenido_por_unidad: 200,
        unidad_del_contenido: 'g',
        precio_centimos: 680,
      }),
    ).productoId;
    const aceite = losDatos<{ elaboracionId: string }>(
      await api.ejecutar(rosa, 'crear_elaboracion', {
        nombre: 'Aceite de albahaca repaso 20',
        rinde_cantidad: 1,
        rinde_unidad: 'l',
      }),
    ).elaboracionId;
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        elaboracion_id: aceite,
        version: 0,
        lineas: [{ producto_id: albahaca, cantidad: 200, unidad: 'g' }],
        pasos: [],
      }),
    );
    const ficha = losDatos<{ receta: { lineas: { costeCentimos?: number | null }[] } }>(
      await api.consultar(rosa, 'una_ficha', { elaboracion_id: aceite }),
    );
    expect(ficha.receta.lineas[0]?.costeCentimos).toBe(136);

    // En mililitros no: la bandeja trae gramos, y no se adivina.
    const enMililitros = await api.ejecutar(rosa, 'guardar_ficha', {
      elaboracion_id: aceite,
      version: 1,
      lineas: [{ producto_id: albahaca, cantidad: 200, unidad: 'ml' }],
      pasos: [],
    });
    expect(elFallo(enMililitros)).toBe('faltan_datos');

    // Y lo que se puede escribir lo dice la lista del editor.
    const lo = losDatos<{
      productos: { id: string; contenido?: { cantidad: number; unidad: string } | null }[];
    }>(await api.consultar(rosa, 'lo_que_puede_llevar', {}));
    expect(lo.productos.find((p) => p.id === albahaca)?.contenido).toEqual({
      cantidad: 200,
      unidad: 'g',
    });
  });
});

describe('el valor de la cámara es lo que hay ahora', () => {
  it('una línea con la fecha de mañana cuenta en la foto de hoy', async () => {
    const productoId = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Aceite repaso 20',
        unidad_de_uso: 'l',
        factor: 1,
        precio_centimos: 500,
        cantidad_inicial: 10,
      }),
    ).productoId;
    const antes = await indicador('valor-camara');

    // Lo que hizo la 0076 a la 1:43: un «revalorado» con el día del calendario, cuando la
    // jornada del local aún era la de antes. Aquí, a 6 € el litro y con fecha de mañana.
    await comoDuena(
      `insert into estook.movimiento_de_stock (
         local_id, producto_id, tipo, cantidad, cantidad_despues, coste_medio_despues,
         motivo, fecha_operativa, origen
       )
       select p.local_id, p.id, 'ajuste', 0, 10, 600000, 'Revalorado de prueba',
              $2::date + 1, 'revalorar'
         from estook.producto p where p.id = $1`,
      [productoId, antes.jornada],
    );
    // 10 l de 5 € a 6 €: 10 € más, hoy mismo.
    expect(((await indicador('valor-camara')).total ?? 0) - (antes.total ?? 0)).toBe(1000);
  });
});
