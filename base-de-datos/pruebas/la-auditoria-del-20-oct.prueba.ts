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

describe('lo que Fogón contesta y no sirve, también se cuenta', () => {
  /*
    Si la IA contestaba algo que no se entendía (o lo rechazaba), el comando fallaba y la
    transacción se deshacía **con el apunte de lo gastado dentro**: Anthropic lo cobraba,
    pero no contaba para el tope del local, y se podía reintentar sin fin.
  */
  it('una respuesta que no se entiende queda apuntada y gasta sus créditos', async () => {
    const { modeloDeMentira } = await import('../../servidor/ia/modelo.ts');
    const conFogon = montarLaApi(base.bd, { fogon: modeloDeMentira(() => 'esto no es JSON') });
    const rosa = await conFogon.entrar(ROSA);
    const { rows: org } = await base.bd.query<{ id: string }>(
      `select organizacion_id as id from estook.local where codigo = 'bar-centro'`,
    );
    await base.bd.query('update plataforma.fogon set encendido = true where unica');
    await base.bd.query(
      `insert into plataforma.fogon_del_cliente (organizacion_id, encendido) values ($1, true)
       on conflict (organizacion_id) do update set encendido = true`,
      [org[0]?.id],
    );
    const plato =
      losDatos<{ creados: { platoId: string }[] }>(
        await conFogon.ejecutar(rosa, 'crear_platos', {
          seccion_id: null,
          platos: [{ nombre: 'Croquetas de la auditoría', precio_centimos: 1200 }],
        }),
      ).creados[0]?.platoId ?? '';

    const cuantas = async () =>
      Number(
        (
          await base.bd.query<{ n: string }>(
            'select count(*)::text as n from estook.llamada_a_fogon',
          )
        ).rows[0]?.n,
      );
    const antes = await cuantas();
    const r = await conFogon.ejecutar(rosa, 'rellenar_con_fogon', { plato_id: plato });
    expect(elFallo(r)).toBe('faltan_datos');
    expect(await cuantas()).toBe(antes + 1);
  });
});

describe('crear cuenta con una dirección que no se entiende delante', () => {
  /*
    El tope de diez cuentas por hora y dirección leía solo la primera de
    `X-Forwarded-For`. Con «X-Forwarded-For: x», el proxy añade detrás la de verdad, pero la
    primera no se entendía: sin dirección, el tope no contaba nada. Ahora vale la primera
    que tenga forma de dirección.
  */
  it('cuenta la de verdad, la que añade el proxy', async () => {
    const { correoEnMemoria } = await import('../../servidor/infraestructura/correo.ts');
    const { direccionDeLaPeticion } = await import('../../servidor/api/cabeceras.ts');
    const conCorreo = montarLaApi(base.bd, { correo: correoEnMemoria() });
    const desde = direccionDeLaPeticion('x, 10.7.7.7');
    expect(desde).toBe('10.7.7.7');
    const pedir = (i: number) =>
      conCorreo.ejecutarDesde(desde ?? '', null, 'pedir_codigo_de_registro', {
        nombre: 'Marta',
        negocio: 'La Taberna de la Auditoría',
        correo: `detras-del-proxy-${String(i)}@correo-de-prueba.com`,
        contrasena: 'una frase que me sé',
        aceptaCondiciones: true,
      });
    for (let i = 0; i < 10; i++) losDatos(await pedir(i));
    expect(elFallo(await pedir(10))).toBe('demasiadas_cuentas');
  });

  it('y sin ninguna, como en desarrollo, no frena a nadie', async () => {
    const { direccionDeLaPeticion } = await import('../../servidor/api/cabeceras.ts');
    expect(direccionDeLaPeticion(undefined)).toBeNull();
    expect(direccionDeLaPeticion('x, y')).toBeNull();
    expect(direccionDeLaPeticion('1.2.3.4, 5.6.7.8')).toBe('1.2.3.4');
  });
});

describe('el food cost, sin IVA en todas partes', () => {
  /*
    La caja se guarda con IVA y el género sin él. El food cost real (Negocio) ya le
    quitaba el IVA a lo vendido (0079), y Richi lo pidió así (0099); el Panel, Servicio
    y los semáforos de objetivos dividían entre la caja con IVA: con un 10 %, un food
    cost un 9 % más bajo del que era. 30 € de género para 110 € de caja son un 30 %.
  */
  it('30 € de género para 110 € de caja: un 30 % en el Panel y en Servicio', async () => {
    const vera = await api.entrar('vera@ejemplo.estook.com');
    const pan = losDatos<{ productoId: string }>(
      await api.ejecutar(vera, 'crear_producto', {
        nombre: 'Pan de la auditoría',
        unidad_de_uso: 'kg',
        cantidad_inicial: 10,
        precio_centimos: 300,
      }),
    ).productoId;
    losDatos(await api.ejecutar(vera, 'apuntar_salida', { producto_id: pan, cuanto: 10 }));
    const cierres = losDatos<{ jornada: string }>(
      await api.consultar(vera, 'mis_cierres', { dias: '7' }),
    );
    losDatos(
      await api.ejecutar(vera, 'cerrar_la_caja', {
        fecha: cierres.jornada,
        total_centimos: 11_000,
      }),
    );

    const servicio = losDatos<{
      foodCost: number | null;
      cierres: { fecha: string; foodCost?: number | null }[];
    }>(await api.consultar(vera, 'mis_cierres', { dias: '7' }));
    expect(servicio.foodCost).toBe(30);
    expect(servicio.cierres.find((c) => c.fecha === cierres.jornada)?.foodCost).toBe(30);

    const panel = losDatos<{
      total: number | null;
      serie: { fecha: string; valor: number | null }[];
    }>(await api.consultar(vera, 'un_indicador', { indicador: 'food-cost', dias: '7' }));
    expect(panel.total).toBe(30);
    expect(panel.serie.at(-1)).toEqual({ fecha: cierres.jornada, valor: 30 });

    // Y en el food cost real, el pan dado de alta suma en la cuenta pero no es una compra:
    // el desglose decía «Compraste 30 €».
    const real = losDatos<{ comprasCentimos: number; deAltaCentimos: number }>(
      await api.consultar(vera, 'el_food_cost_real', {
        periodo: 'mes',
        mes: cierres.jornada.slice(0, 7),
      }),
    );
    expect(real.comprasCentimos).toBe(3000);
    expect(real.deAltaCentimos).toBe(3000);
  });
});
