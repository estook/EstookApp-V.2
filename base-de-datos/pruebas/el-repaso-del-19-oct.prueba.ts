import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El repaso del 19-oct (0099), con el despachador de verdad y la base de verdad.
 *
 * Richi: «he añadido contramuslos de pollo, pongo que hay 20 kg y me dice que vale
 * 91.000 €». Detrás había tres cosas, y cada una tiene aquí su prueba:
 *
 *   · **Lo que hay vale lo que se pagó**: el aprovechamiento solo cuenta en el plato.
 *   · **Nadie compra a tanto el gramo**: un producto en gramos sin envase va por kilos.
 *   · **El precio sigue al envase**: cambiar «caja de 5 kg» por «caja de 10 kg» no
 *     cambia lo que cuesta el kilo.
 *
 * Y lo demás del repaso que vive en el servidor: borrar un plato, y salir del aparato
 * de fichar solo con la contraseña de quien lleva el local.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const CLAVE = 'estook en desarrollo';

let rosa: string;
let marcos: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function laCamara(productoId: string): Promise<{ cantidad: number; coste: number }> {
  const [fila] = await comoDuena<{ cantidad: string; coste: string }>(
    `select cantidad::text as cantidad, coste_milesimas::text as coste
       from estook.existencias where producto_id = $1`,
    [productoId],
  );
  return { cantidad: Number(fila?.cantidad ?? 0), coste: Number(fila?.coste ?? 0) };
}

describe('lo que hay vale lo que se pagó', () => {
  let atun: string;

  it('un kilo de atún pagado a 18,18 € vale 18,18 €, aunque se aproveche un 70 %', async () => {
    atun = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Atún repaso',
        formato: 'Kilo',
        factor: 1000,
        unidad_de_uso: 'g',
        rendimiento: 0.7,
        precio_centimos: 1818,
        cantidad_inicial: 1000,
      }),
    ).productoId;
    // 18,18 € el kilo son 1.818 milésimas de céntimo el gramo: sin el aprovechamiento.
    expect(await laCamara(atun)).toEqual({ cantidad: 1000, coste: 1818 });

    const [precio] = await comoDuena<{ coste: string }>(
      `select coste_milesimas::text as coste from estook.precio_de_producto
        where producto_id = $1 and hasta is null`,
      [atun],
    );
    expect(Number(precio?.coste)).toBe(1818);
  });

  it('una entrada nueva entra a lo que dice el albarán, no a lo limpio', async () => {
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: atun,
        cuanto: 1,
        como: 'formatos',
        precio_centimos: 2000,
      }),
    );
    // Un kilo a 18,18 y otro a 20,00: el medio, 19,09 € el kilo.
    expect(await laCamara(atun)).toEqual({ cantidad: 2000, coste: 1909 });
  });

  it('en el plato sí cuenta el aprovechamiento: 100 g limpios cuestan lo de 143 g en bruto', async () => {
    const [plato] = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'Tartar repaso', precio_centimos: 1800 }],
      }),
    ).creados;
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: plato?.platoId,
        version: 0,
        lineas: [{ producto_id: atun, cantidad: 100, unidad: 'g' }],
        pasos: [],
      }),
    );
    const ficha = losDatos<{
      receta: { lineas: { costeCentimos?: number | null }[] };
      escandallo?: { costeCentimos: number | null };
    }>(await api.consultar(rosa, 'una_ficha', { plato_id: plato?.platoId ?? '' }));
    // 100 g × 19,09 €/kg ÷ 0,7 = 2,73 €.
    expect(ficha.receta.lineas[0]?.costeCentimos).toBe(273);
    expect(ficha.escandallo?.costeCentimos).toBe(273);
  });
});

describe('nadie compra a tanto el gramo', () => {
  it('lo que nace en gramos sin envase va por kilos: su precio es el del kilo', async () => {
    const hecho = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Contramuslos repaso',
        unidad_de_uso: 'g',
      }),
    );
    const [fila] = await comoDuena<{ formato: string | null; factor: string }>(
      'select formato, factor::text as factor from estook.producto where id = $1',
      [hecho.productoId],
    );
    expect(fila).toEqual({ formato: 'Kilo', factor: '1000.0000' });

    // Y un precio de 4,55 € es el de un kilo: 20 kg valen 91 €, no 91.000 €.
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: hecho.productoId,
        cuanto: 20,
        como: 'formatos',
        precio_centimos: 455,
      }),
    );
    const camara = await laCamara(hecho.productoId);
    expect(camara.cantidad).toBe(20_000);
    // 20.000 g × 455 milésimas de céntimo: 9.100 céntimos, 91 €.
    expect(camara.cantidad * camara.coste).toBe(91 * 100 * 1000);
  });
});

describe('el precio sigue al envase', () => {
  it('de caja de 5 kg a caja de 10 kg: el precio de la caja se dobla y el kilo sigue igual', async () => {
    const pollo = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Pollo repaso',
        formato: 'Caja de 5 kg',
        factor: 5000,
        unidad_de_uso: 'g',
        precio_centimos: 4545,
      }),
    ).productoId;
    const cambio = losDatos<{ precioQueSigue: number | null }>(
      await api.ejecutar(rosa, 'cambiar_producto', {
        producto_id: pollo,
        nombre: 'Pollo repaso',
        categoria_id: null,
        formato: 'Caja de 10 kg',
        factor: 10_000,
        unidad_de_uso: 'g',
        rendimiento: 1,
        categoria_fiscal: 'alimento',
        alergenos: [],
        peso_variable: false,
        codigo_de_barras: null,
        minimo: null,
        proveedor_id: null,
        notas: null,
      }),
    );
    expect(cambio.precioQueSigue).toBe(9090);
    const vigentes = await comoDuena<{ precio: string; formato: string; coste: string }>(
      `select precio_centimos::text as precio, formato, coste_milesimas::text as coste
         from estook.precio_de_producto where producto_id = $1 and hasta is null`,
      [pollo],
    );
    expect(vigentes).toEqual([{ precio: '9090', formato: 'Caja de 10 kg', coste: '909' }]);
  });
});

describe('borrar un plato', () => {
  let plato: string;

  it('el cocinero no puede', async () => {
    plato =
      losDatos<{ creados: { platoId: string }[] }>(
        await api.ejecutar(rosa, 'crear_platos', {
          seccion_id: null,
          platos: [{ nombre: 'Plato que se borra', precio_centimos: 900 }],
        }),
      ).creados[0]?.platoId ?? '';
    expect(elFallo(await api.ejecutar(marcos, 'borrar_plato', { plato_id: plato }))).toBe(
      'sin_permiso',
    );
  });

  it('quien lleva la carta lo borra para siempre, con su escandallo', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: plato,
        version: 0,
        lineas: [],
        pasos: ['Emplatar'],
      }),
    );
    const borrado = losDatos<{ nombre: string }>(
      await api.ejecutar(rosa, 'borrar_plato', { plato_id: plato }),
    );
    expect(borrado.nombre).toBe('Plato que se borra');
    const quedan = await comoDuena<{ n: number }>(
      `select (select count(*) from estook.plato where id = $1)::int
            + (select count(*) from estook.receta where plato_id = $1)::int as n`,
      [plato],
    );
    expect(quedan[0]?.n).toBe(0);
  });
});

describe('salir del aparato de fichar', () => {
  let llave: string;

  it('solo con la contraseña de quien lleva el local', async () => {
    // Se vincula en Estook TPV, con la función «Fichar» (T1, 0107).
    llave = await api.vincularParaFichar(
      ROSA,
      await base.localPorCodigo('bar-centro'),
      'Tablet del repaso',
    );
    const delCocinero = await api.despachador.ejecutar(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      'entrar',
      { correo: MARCOS, contrasena: CLAVE, llave_del_aparato: llave },
      crypto.randomUUID(),
    );
    expect(elFallo(delCocinero)).toBe('sin_permiso');

    const deLaGerente = losDatos<{ token: string; localId: string | null }>(
      await api.despachador.ejecutar(
        { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
        'entrar',
        { correo: ROSA, contrasena: CLAVE, llave_del_aparato: llave },
        crypto.randomUUID(),
      ),
    );
    expect(deLaGerente.token.length).toBeGreaterThan(20);
    const [delAparato] = await comoDuena<{ local_id: string }>(
      'select local_id from estook.terminal where nombre = $1',
      ['Tablet del repaso'],
    );
    expect(deLaGerente.localId).toBe(delAparato?.local_id);
  });

  it('con una contraseña mala no sale nadie', async () => {
    const mala = await api.despachador.ejecutar(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      'entrar',
      { correo: ROSA, contrasena: 'no es esta', llave_del_aparato: llave },
      crypto.randomUUID(),
    );
    expect(elFallo(mala)).not.toBeNull();
  });
});
