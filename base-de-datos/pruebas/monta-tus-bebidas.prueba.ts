import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T3 · 2 · 2 · «Monta tus bebidas»** (decisión 0114, migración 0089), contra una base de verdad:
 * las pruebas de 10.12 de las raciones, las copas y los cafés.
 *
 *   · lo que propone para cada bebida del almacén: la caña, la doble y la jarra; la copa de vino
 *     y la botella; la lata entera; y lo que cuesta cada ración
 *   · montarlas: cada una es un plato de la carta, con su botón y su «tal cual» con su ración
 *   · **las copas se hacen solas**: 50 ml de su botella y el «¿Con qué?» con los refrescos, que
 *     gastan el suyo; y **un Havana 7 con Coca-Cola se pide en dos toques**
 *   · **los cafés vienen hechos**, unidos al café y la leche del almacén
 *   · las dosis de la casa, y lo del TPV del local con los Ajustes del TPV
 *   · quién las monta: la camarera no
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let llaveDelMovil: string;
let rosa: string;
const producto: Record<string, string> = {};

/** Entrar con el PIN; en un comandero, fichando antes en la caja (0115). */
async function enElAparato(llave: string, correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llave, base.pinDe(correo, 'bar-centro'), llaveDeLaCaja),
  );
  return tokenDelAparato(dentro.turno, llave);
}

interface ParaMontar {
  dosis: { copaMl: number; copaDeVinoMl: number };
  bebidas: {
    productoId: string;
    nombre: string;
    pagina: string;
    raciones: {
      nombre: string;
      cantidad: number;
      unidad: string;
      puesta: boolean;
      costeCentimos: number | null;
      yaEsta: boolean;
    }[];
  }[];
  botellas: {
    productoId: string;
    nombre: string;
    costeDeLaDosisCentimos: number | null;
    yaEsCopa: boolean;
  }[];
  conQue: { productoId: string; nombre: string }[];
  cafes: { clave: string; nombre: string; aproximado: boolean; falta: string[]; yaEsta: boolean }[];
  puedeMontarlas: boolean;
}

const paraMontar = async (token: string) =>
  losDatos<ParaMontar>(await api.consultar(token, 'las_bebidas_para_montar'));

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  barCentro = await base.localPorCodigo('bar-centro');
  llaveDeLaCaja = losDatos<{ llave: string }>(
    await api.ejecutar(await api.entrar(ROSA), 'vincular_el_primer_aparato', {
      local_id: barCentro,
      funcion: 'caja',
      nombre: 'Caja 1',
      cajon_nuevo: 'Cajón 1',
    }),
  ).llave;
  rosa = await api.entrar(ROSA);
  const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
  llaveDelMovil = losDatos<{ llave: string }>(
    await api.ejecutar(null, 'vincular_con_codigo', {
      codigo: losDatos<{ codigo: string }>(
        await api.ejecutar(enLaCaja, 'sacar_codigo_para_vincular', {
          funcion: 'comandero',
          nombre: 'Móvil de Sara',
          persona_id: await base.personaPorCorreo(SARA),
        }),
      ).codigo,
    }),
  ).llave;
  // El almacén de Bar Centro: sus familias y lo que hay en cada una, con su precio.
  const familia = async (nombre: string) => {
    const ya = await base.bd.query<{ id: string }>(
      `select id::text as id from estook.categoria_de_producto where local_id = $1 and nombre = $2`,
      [barCentro, nombre],
    );
    if (ya.rows[0] !== undefined) return ya.rows[0].id;
    return (
      (
        await base.bd.query<{ id: string }>(
          `insert into estook.categoria_de_producto (local_id, nombre) values ($1, $2) returning id::text as id`,
          [barCentro, nombre],
        )
      ).rows[0]?.id ?? ''
    );
  };
  const conAlcohol = await familia('Bebidas con alcohol');
  const sinAlcohol = await familia('Bebidas sin alcohol');
  const cafe = await familia('Café e infusiones');
  const lacteos = await familia('Lácteos');
  const poner = async (
    nombre: string,
    categoria: string,
    unidad: string,
    contenido: number | null = null,
  ) => {
    const { rows } = await base.bd.query<{ id: string }>(
      `insert into estook.producto (local_id, nombre, unidad_de_uso, categoria_id, contenido_por_unidad, unidad_del_contenido)
       values ($1, $2, $3, $4, $5, $6) returning id::text as id`,
      [barCentro, nombre, unidad, categoria, contenido, contenido === null ? null : 'ml'],
    );
    producto[nombre] = rows[0]?.id ?? '';
  };
  await poner('Cerveza de barril', conAlcohol, 'ml');
  await poner('Rioja crianza', conAlcohol, 'ud', 750);
  await poner('Ron Havana 7', conAlcohol, 'ml');
  await poner('Ginebra Beefeater', conAlcohol, 'ml');
  await poner('Coca-Cola', sinAlcohol, 'ud');
  await poner('Tónica', sinAlcohol, 'ud');
  await poner('Agua mineral 50 cl', sinAlcohol, 'ud');
  await poner('Café en grano', cafe, 'g');
  await poner('Leche entera', lacteos, 'ml');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('lo que propone', () => {
  it('la caña, la doble y la jarra; la copa de vino y la botella; la lata entera; y las botellas para copas', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const leido = await paraMontar(enLaCaja);
    expect(leido.dosis).toEqual({ copaMl: 50, copaDeVinoMl: 150 });
    expect(leido.puedeMontarlas).toBe(true);
    const de = (nombre: string) => leido.bebidas.find((b) => b.nombre === nombre);
    expect(de('Cerveza de barril')?.raciones.map((r) => [r.nombre, r.cantidad, r.puesta])).toEqual([
      ['Caña', 200, true],
      ['Doble', 330, true],
      ['Jarra', 500, false],
    ]);
    expect(de('Rioja crianza')?.raciones.map((r) => r.nombre)).toEqual([
      'Rioja crianza · copa',
      'Rioja crianza · botella',
    ]);
    expect(de('Coca-Cola')).toMatchObject({ pagina: 'Refrescos' });
    expect(de('Agua mineral 50 cl')).toMatchObject({ pagina: 'Pan y agua' });
    expect(leido.botellas.map((b) => b.nombre)).toEqual(['Ginebra Beefeater', 'Ron Havana 7']);
    expect(leido.conQue.map((r) => r.nombre)).toEqual(['Coca-Cola', 'Tónica']);
    // El café solo tiene su café; el Cola Cao, no su cacao: coste aproximado, y dice qué falta.
    expect(leido.cafes.find((c) => c.clave === 'solo')).toMatchObject({ aproximado: true });
    expect(leido.cafes.find((c) => c.clave === 'cola_cao')?.falta).toEqual(['cacao']);
  });
});

describe('montarlas', () => {
  it('cada bebida es un plato de la carta, con su botón y su ración, y no se repite', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const hecho = losDatos<{ puestas: number; yaEstaban: string[] }>(
      await api.ejecutar(enLaCaja, 'montar_bebidas', {
        bebidas: [
          {
            producto_id: producto['Cerveza de barril'],
            nombre: 'Caña',
            pagina: 'Cervezas',
            cantidad: 200,
            unidad: 'ml',
            precio_centimos: 180,
          },
          {
            producto_id: producto['Cerveza de barril'],
            nombre: 'Doble',
            pagina: 'Cervezas',
            cantidad: 330,
            unidad: 'ml',
            precio_centimos: 260,
          },
          {
            producto_id: producto['Rioja crianza'],
            nombre: 'Rioja crianza · copa',
            pagina: 'Vinos',
            cantidad: 150,
            unidad: 'ml',
            precio_centimos: 350,
          },
          {
            producto_id: producto['Coca-Cola'],
            nombre: 'Coca-Cola',
            pagina: 'Refrescos',
            cantidad: 1,
            unidad: 'ud',
            precio_centimos: 250,
          },
          {
            producto_id: producto['Agua mineral 50 cl'],
            nombre: 'Agua mineral',
            pagina: 'Pan y agua',
            cantidad: 1,
            unidad: 'ud',
            precio_centimos: 180,
          },
        ],
      }),
    );
    expect(hecho).toEqual({ puestas: 5, yaEstaban: [] });
    const botonera = losDatos<{
      camino: string | null;
      paginas: { nombre: string; quienLoPrepara: string; botones: { nombre: string }[] }[];
    }>(await api.consultar(enLaCaja, 'la_botonera'));
    expect(botonera.camino).toBe('de_cero');
    expect(
      botonera.paginas.find((g) => g.nombre === 'Cervezas')?.botones.map((b) => b.nombre),
    ).toEqual(['Caña', 'Doble']);
    expect(botonera.paginas.find((g) => g.nombre === 'Cervezas')?.quienLoPrepara).toBe('barra');
    expect(
      botonera.paginas.find((g) => g.nombre === 'Pan y agua')?.botones.map((b) => b.nombre),
    ).toEqual(['Agua mineral']);
    // Su escandallo, tal cual con su ración: la caña, 200 ml del barril.
    const carta = losDatos<{
      platos: { nombre: string; vinculadoA: { id: string; racion: string | null } | null }[];
    }>(await api.consultar(rosa, 'mi_carta'));
    expect(carta.platos.find((p) => p.nombre === 'Caña')?.vinculadoA).toMatchObject({
      id: producto['Cerveza de barril'],
      racion: '200 ml',
    });
    // Ya están: no se repiten.
    expect(
      (await paraMontar(enLaCaja)).bebidas
        .find((b) => b.nombre === 'Cerveza de barril')
        ?.raciones.map((r) => r.yaEsta),
    ).toEqual([true, true, false]);
    expect(
      losDatos(
        await api.ejecutar(enLaCaja, 'montar_bebidas', {
          bebidas: [
            {
              producto_id: producto['Coca-Cola'],
              nombre: 'Coca-Cola',
              pagina: 'Refrescos',
              cantidad: 1,
              unidad: 'ud',
              precio_centimos: 250,
            },
          ],
        }),
      ),
    ).toEqual({ puestas: 0, yaEstaban: ['Coca-Cola'] });
  });
});

describe('las copas, que se hacen solas', () => {
  it('50 ml de su botella, el «¿Con qué?» con los refrescos, y un Havana 7 con Coca-Cola en dos toques', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const { grupoId } = losDatos<{ puestas: number; grupoId: string }>(
      await api.ejecutar(enLaCaja, 'montar_copas', {
        botellas: [
          { producto_id: producto['Ron Havana 7'], nombre: 'Havana 7', precio_centimos: 800 },
          {
            producto_id: producto['Ginebra Beefeater'],
            nombre: 'Beefeater',
            precio_centimos: 750,
            dosis_ml: 60,
          },
        ],
        con_que: [producto['Coca-Cola'], producto['Tónica']],
      }),
    );
    const grupos = losDatos<{
      grupos: {
        id: string;
        nombre: string;
        minimo: number;
        maximo: number;
        opciones: { id: string; nombre: string; anade: { productoId: string } | null }[];
        platos: { nombre: string }[];
      }[];
    }>(await api.consultar(enLaCaja, 'los_grupos_de_opciones'));
    const conQue = grupos.grupos.find((g) => g.id === grupoId);
    expect(conQue).toMatchObject({ nombre: '¿Con qué?', minimo: 1, maximo: 1 });
    expect(conQue?.opciones.map((o) => o.nombre)).toEqual([
      'Coca-Cola',
      'Tónica',
      'Solo, con hielo',
    ]);
    expect(conQue?.opciones[0]?.anade?.productoId).toBe(producto['Coca-Cola']);
    expect(conQue?.platos.map((p) => p.nombre).sort()).toEqual(['Beefeater', 'Havana 7']);
    // La ginebra, con su dosis; el ron, con la de la casa.
    const carta = losDatos<{
      platos: { nombre: string; vinculadoA: { racion: string | null } | null }[];
    }>(await api.consultar(rosa, 'mi_carta'));
    expect(carta.platos.find((p) => p.nombre === 'Havana 7')?.vinculadoA?.racion).toBe('50 ml');
    expect(carta.platos.find((p) => p.nombre === 'Beefeater')?.vinculadoA?.racion).toBe('60 ml');

    // Un Havana 7 con Coca-Cola: el ron y la Coca-Cola, congelados en la línea, al precio de la copa.
    const sara = await enElAparato(llaveDelMovil, SARA);
    const sala = losDatos<{
      paginas: {
        platos: {
          id: string;
          nombre: string;
          grupos: { opciones: { id: string; nombre: string }[] }[];
        }[];
      }[];
    }>(await api.consultar(sara, 'la_carta_de_la_sala'));
    const havana = sala.paginas.flatMap((g) => g.platos).find((p) => p.nombre === 'Havana 7');
    const cocaCola = havana?.grupos[0]?.opciones.find((o) => o.nombre === 'Coca-Cola')?.id;
    const cuenta = crypto.randomUUID();
    losDatos(await api.ejecutar(sara, 'abrir_mesa', { cuenta_id: cuenta, tipo: 'barra' }));
    losDatos(
      await api.ejecutar(sara, 'pedir', {
        cuenta_id: cuenta,
        platos: [{ id: crypto.randomUUID(), plato_id: havana?.id, opciones: [cocaCola] }],
      }),
    );
    const mesa = losDatos<{
      platos: { nombre: string; precioCentimos: number; opciones: string[]; destino: string }[];
    }>(await api.consultar(sara, 'la_mesa', { cuenta_id: cuenta }));
    expect(mesa.platos[0]).toMatchObject({
      nombre: 'Havana 7',
      precioCentimos: 800,
      opciones: ['Coca-Cola'],
      destino: 'barra',
    });
  });
});

describe('los cafés, que vienen hechos', () => {
  it('unidos al café y la leche del almacén; sin lo suyo, sin receta', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    expect(
      losDatos(
        await api.ejecutar(enLaCaja, 'montar_cafes', {
          cafes: [
            { clave: 'solo', precio_centimos: 130 },
            { clave: 'con_leche', precio_centimos: 160 },
            { clave: 'te', precio_centimos: 150 },
          ],
        }),
      ),
    ).toEqual({ puestos: 3, conReceta: 2, yaEstaban: [] });
    const carta = losDatos<{ platos: { nombre: string; tieneFicha: boolean }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(carta.platos.find((p) => p.nombre === 'Café con leche')?.tieneFicha).toBe(true);
    // El té no tiene su bolsita en el almacén: sin escandallo, no con uno falso.
    expect(carta.platos.find((p) => p.nombre === 'Té')?.tieneFicha).toBe(false);
    const botonera = losDatos<{ paginas: { nombre: string; botones: { nombre: string }[] }[] }>(
      await api.consultar(enLaCaja, 'la_botonera'),
    );
    expect(botonera.paginas.at(-1)?.nombre).toBe('Cafés');
    expect(botonera.paginas.at(-1)?.botones.map((b) => b.nombre)).toEqual([
      'Café solo',
      'Café con leche',
      'Té',
    ]);
  });
});

describe('las dosis de la casa', () => {
  it('se cambian una vez; y lo del TPV del local lo cambia quien tiene los Ajustes del TPV', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    losDatos(
      await api.ejecutar(enLaCaja, 'cambiar_las_dosis', { copa_ml: 40, copa_de_vino_ml: 120 }),
    );
    expect((await paraMontar(enLaCaja)).dosis).toEqual({ copaMl: 40, copaDeVinoMl: 120 });
    // La función, a pelo: la camarera no puede.
    const sara = await base.personaPorCorreo(SARA);
    await expect(
      base.comoPersona(sara, () =>
        base.bd.query(
          'select estook.cambiar_lo_del_tpv_del_local($1, p_dosis_ml => 99::smallint)',
          [barCentro],
        ),
      ),
    ).rejects.toThrow(/sin_permiso/);
  });
});

describe('quién las monta', () => {
  it('la camarera no; ni Estook con su sesión', async () => {
    const sara = await enElAparato(llaveDelMovil, SARA);
    expect(elFallo(await api.consultar(sara, 'las_bebidas_para_montar'))).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(sara, 'montar_cafes', {
          cafes: [{ clave: 'solo', precio_centimos: 1 }],
        }),
      ),
    ).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'montar_cafes', {
          cafes: [{ clave: 'solo', precio_centimos: 1 }],
        }),
      ),
    ).toBe('sin_permiso');
  });
});
