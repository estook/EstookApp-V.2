import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * La auditoría del 20-oct: lo que encontró, probado contra la API de verdad.
 *
 * Cada `describe` es un fallo que se vio con un barrido automático de las 307
 * operaciones de la API (desde otra organización y con cada rol) o repasando a mano.
 * Está contado en la decisión 0101.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function laFichaDe(codigo: string) {
  const { rows } = await base.bd.query<{ zona_horaria: string; hora_de_corte: string }>(
    `select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
       from estook.local where codigo = $1`,
    [codigo],
  );
  return rows[0];
}

const DONDE_ESTA = {
  nombre: 'Bar Centro',
  direccion: 'Calle Mayor 1',
  codigo_postal: '28001',
  poblacion: 'Madrid',
  provincia: 'Madrid',
  telefono: null,
};

describe('la zona horaria del local', () => {
  /*
    El barrido guardó «2026-10-19» como zona de un local: la API lo aceptó, y desde ahí
    crear un proveedor, escribir en el tablón o abrir el inventario de ese local daban
    «se nos ha roto algo». Una zona que no existe no se guarda.
  */
  it('una zona que no existe no entra, y el local sigue funcionando', async () => {
    const rosa = await api.entrar(ROSA);
    const mala = await api.ejecutar(rosa, 'guardar_donde_esta', {
      ...DONDE_ESTA,
      zona_horaria: '2026-10-19',
    });
    expect(elFallo(mala)).toBe('faltan_datos');
    expect((await laFichaDe('bar-centro'))?.zona_horaria).toBe('Europe/Madrid');

    // Y lo que depende de la jornada sigue contestando.
    losDatos(await api.consultar(rosa, 'el_tablon'));
  });

  /*
    La pantalla de «¿Dónde está?» no manda la zona, y la API ponía Madrid cada vez que se
    guardaba: un local de Canarias volvía a la hora de Madrid sin que nadie lo tocara.
  */
  it('lo que no se manda se queda como estaba', async () => {
    const rosa = await api.entrar(ROSA);
    losDatos(
      await api.ejecutar(rosa, 'guardar_donde_esta', {
        ...DONDE_ESTA,
        zona_horaria: 'Atlantic/Canary',
        hora_de_corte: '04:00',
      }),
    );
    losDatos(await api.ejecutar(rosa, 'guardar_donde_esta', DONDE_ESTA));
    expect(await laFichaDe('bar-centro')).toEqual({
      zona_horaria: 'Atlantic/Canary',
      hora_de_corte: '04:00',
    });

    // Se deja como estaba para las demás pruebas de este fichero.
    losDatos(
      await api.ejecutar(rosa, 'guardar_donde_esta', {
        ...DONDE_ESTA,
        zona_horaria: 'Europe/Madrid',
        hora_de_corte: '05:00',
      }),
    );
  });
});

describe('anular una entrada con el precio mal escrito', () => {
  /*
    Lo que pasó con los contramuslos (19-oct, 0099): una entrada a 4,55 € el gramo. Anularla
    quitaba los kilos pero **dejaba el precio medio con ella dentro**, y la cámara, las
    mermas y lo gastado seguían valiendo miles de euros: hizo falta revalorar a mano
    (0076). Anular tiene que dejar el precio medio como si esa entrada no hubiera llegado.
  */
  async function elMedio(productoId: string) {
    const { rows } = await base.bd.query<{ cantidad: string; coste: string }>(
      `select cantidad::text as cantidad, coste_milesimas::text as coste
         from estook.existencias where producto_id = $1`,
      [productoId],
    );
    return { cantidad: Number(rows[0]?.cantidad), coste: Number(rows[0]?.coste) };
  }

  it('el precio medio vuelve a lo que era', async () => {
    const rosa = await api.entrar(ROSA);
    const pollo = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Pollo de la auditoría',
        unidad_de_uso: 'kg',
        cantidad_inicial: 10,
        precio_centimos: 500,
      }),
    ).productoId;
    expect(await elMedio(pollo)).toEqual({ cantidad: 10, coste: 500_000 });

    // 10 kg a 500 € el kilo, en vez de 5: el campo decía solo «Precio».
    const mal = losDatos<{ movimientoId: string }>(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: pollo,
        cuanto: 10,
        como: 'unidades_de_uso',
        precio_centimos: 50_000,
      }),
    ).movimientoId;
    expect(await elMedio(pollo)).toEqual({ cantidad: 20, coste: 25_250_000 });

    // Y después, cosas que pasan: sale algo y entra una caja a su precio.
    losDatos(await api.ejecutar(rosa, 'apuntar_salida', { producto_id: pollo, cuanto: 4 }));
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: pollo,
        cuanto: 4,
        como: 'unidades_de_uso',
        precio_centimos: 600,
      }),
    );

    losDatos(
      await api.ejecutar(rosa, 'anular_movimiento', {
        movimiento_id: mal,
        motivo: 'Era el precio de 100 kg',
      }),
    );

    // Sin la entrada mala: 10 kg a 5 €, salen 4 (quedan 6 a 5 €) y entran 4 a 6 €.
    // 6 × 5 + 4 × 6 = 54 € en 10 kg: 5,40 €/kg.
    expect(await elMedio(pollo)).toEqual({ cantidad: 10, coste: 540_000 });
  });

  it('y si lo anulado es una entrada sin precio, el medio no se mueve', async () => {
    const rosa = await api.entrar(ROSA);
    const sal = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Sal de la auditoría',
        unidad_de_uso: 'kg',
        cantidad_inicial: 5,
        precio_centimos: 40,
      }),
    ).productoId;
    const regalo = losDatos<{ movimientoId: string }>(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: sal,
        cuanto: 5,
        como: 'unidades_de_uso',
        precio_centimos: 0,
      }),
    ).movimientoId;
    const conRegalo = await elMedio(sal);
    losDatos(
      await api.ejecutar(rosa, 'anular_movimiento', { movimiento_id: regalo, motivo: 'No llegó' }),
    );
    expect(await elMedio(sal)).toEqual({ cantidad: 5, coste: 40_000 });
    expect(conRegalo.cantidad).toBe(10);
  });
});
