import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T3 · 2 · 1 · Las opciones y los extras, lo que se vende a peso y el precio desde el TPV**
 * (decisión 0113, migración 0088), contra una base de verdad: las pruebas de 10.12.
 *
 *   · un grupo que se reutiliza, obligatorio u opcional, con lo que gasta cada opción
 *   · **un plato con una opción obligatoria no se pide sin contestarla**, y el precio suma
 *   · lo elegido se queda en la línea, congelado, y sale en la mesa y en la cocina
 *   · lo que se vende a peso cobra lo que pesa
 *   · el precio, desde el TPV, es el de la carta; y «Copiar y cambiar» un grupo para un plato
 *   · quién lo monta: la camarera no
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera

let barCentro: string;
let llaveDeLaCaja: string;
let llaveDelMovil: string;
let rosa: string;
const plato: Record<string, string> = {};
let queso: string;
let cebolla: string;

async function enElAparato(llave: string, correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await api.ejecutar(null, 'entrar_con_pin', { llave, pin: base.pinDe(correo, 'bar-centro') }),
  );
  return tokenDelAparato(dentro.turno, llave);
}

interface Linea {
  nombre: string;
  precioCentimos: number;
  opciones: string[];
  pesoGramos: number | null;
}

async function pedirYVer(token: string, platos: Record<string, unknown>[]) {
  const cuenta = crypto.randomUUID();
  losDatos(await api.ejecutar(token, 'abrir_mesa', { cuenta_id: cuenta, tipo: 'barra' }));
  const pedido = await api.ejecutar(token, 'pedir', {
    cuenta_id: cuenta,
    platos: platos.map((p) => ({ id: crypto.randomUUID(), ...p })),
  });
  return { cuenta, pedido };
}

async function laMesa(token: string, cuenta: string) {
  return losDatos<{ platos: Linea[] }>(
    await api.consultar(token, 'la_mesa', { cuenta_id: cuenta }),
  );
}

let guarnicion: string;
let extras: string;

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
  for (const [seccion, platos] of [
    [
      'Principales',
      [
        ['Hamburguesa', 1250],
        ['Entrecot', 2200],
      ],
    ],
    ['Para picar', [['Jamón ibérico', 12000]]],
  ] as const) {
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: seccion }),
    );
    const hechos = losDatos<{ creados: { platoId: string; nombre: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: seccionId,
        platos: platos.map(([nombre, precio_centimos]) => ({ nombre, precio_centimos })),
      }),
    );
    for (const p of hechos.creados) plato[p.nombre] = p.platoId;
  }
  // Dos productos del almacén de Bar Centro, para lo que gasta cada opción.
  const producto = async (nombre: string) =>
    (
      await base.bd.query<{ id: string }>(
        `insert into estook.producto (local_id, nombre, unidad_de_uso) values ($1, $2, 'g') returning id::text as id`,
        [barCentro, nombre],
      )
    ).rows[0]?.id ?? '';
  queso = await producto('Queso cheddar');
  cebolla = await producto('Cebolla');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('los grupos de opciones', () => {
  it('se montan una vez y se ponen en los platos, con lo que gasta cada opción', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    guarnicion = losDatos<{ grupoId: string }>(
      await api.ejecutar(enLaCaja, 'guardar_grupo_de_opciones', {
        nombre: 'Guarnición',
        minimo: 1,
        maximo: 1,
        opciones: [{ nombre: 'Patatas' }, { nombre: 'Ensalada' }],
        plato_id: plato['Hamburguesa'],
      }),
    ).grupoId;
    extras = losDatos<{ grupoId: string }>(
      await api.ejecutar(enLaCaja, 'guardar_grupo_de_opciones', {
        nombre: 'Extras de hamburguesa',
        minimo: 0,
        maximo: 3,
        opciones: [
          {
            nombre: 'Doble de queso',
            precio_centimos: 100,
            anade: { producto_id: queso, cantidad: 30, unidad: 'g' },
          },
          { nombre: 'Sin cebolla', quita_producto_id: cebolla },
          { nombre: 'Al gusto del chef', precio_centimos: 200 },
        ],
        plato_id: plato['Hamburguesa'],
      }),
    ).grupoId;
    // La guarnición, también en el entrecot: el mismo grupo.
    losDatos(
      await api.ejecutar(enLaCaja, 'poner_grupos_al_plato', {
        plato_id: plato['Entrecot'],
        grupo_ids: [guarnicion],
      }),
    );
    const leidos = losDatos<{
      grupos: {
        nombre: string;
        platos: { nombre: string }[];
        opciones: { nombre: string; anade: { nombre: string } | null; quita: unknown }[];
      }[];
    }>(await api.consultar(enLaCaja, 'los_grupos_de_opciones'));
    expect(
      leidos.grupos.find((g) => g.nombre === 'Guarnición')?.platos.map((p) => p.nombre),
    ).toEqual(expect.arrayContaining(['Hamburguesa', 'Entrecot']));
    const delQueso = leidos.grupos
      .find((g) => g.nombre === 'Extras de hamburguesa')
      ?.opciones.find((o) => o.nombre === 'Doble de queso');
    expect(delQueso?.anade).not.toBeNull();
    // Un nombre repetido, no; ni más de las que hay.
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'guardar_grupo_de_opciones', {
          nombre: 'guarnición',
          minimo: 0,
          maximo: 1,
          opciones: [{ nombre: 'Pan' }],
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'guardar_grupo_de_opciones', {
          nombre: 'Salsas',
          minimo: 0,
          maximo: 3,
          opciones: [{ nombre: 'Brava' }],
        }),
      ),
    ).not.toMatch(/^no ha fallado/);
  });

  it('la sala ve los grupos de cada plato, sin lo que gastan', async () => {
    const sara = await enElAparato(llaveDelMovil, SARA);
    const carta = losDatos<{
      paginas: { platos: { nombre: string; grupos: { nombre: string; opciones: object[] }[] }[] }[];
    }>(await api.consultar(sara, 'la_carta_de_la_sala'));
    const hamburguesa = carta.paginas
      .flatMap((g) => g.platos)
      .find((p) => p.nombre === 'Hamburguesa');
    expect(hamburguesa?.grupos.map((g) => g.nombre)).toEqual([
      'Guarnición',
      'Extras de hamburguesa',
    ]);
    expect(JSON.stringify(hamburguesa)).not.toContain('anade');
  });
});

describe('al pedir', () => {
  it('no se pide sin contestar lo obligatorio, y el precio suma lo elegido', async () => {
    const sara = await enElAparato(llaveDelMovil, SARA);
    const sinNada = await pedirYVer(sara, [{ plato_id: plato['Hamburguesa'] }]);
    expect(elFallo(sinNada.pedido)).toBe('faltan_datos');
    expect(JSON.stringify(sinNada.pedido)).toContain('Falta «Guarnición» en «Hamburguesa»');

    const leidos = losDatos<{
      grupos: { id: string; opciones: { id: string; nombre: string }[] }[];
    }>(await api.consultar(await enElAparato(llaveDeLaCaja, ROSA), 'los_grupos_de_opciones'));
    const opcion = (nombre: string) =>
      leidos.grupos.flatMap((g) => g.opciones).find((o) => o.nombre === nombre)?.id ?? '';
    const sara2 = await enElAparato(llaveDelMovil, SARA);
    const bien = await pedirYVer(sara2, [
      { plato_id: plato['Hamburguesa'], opciones: [opcion('Patatas'), opcion('Doble de queso')] },
    ]);
    losDatos(bien.pedido);
    const mesa = await laMesa(sara2, bien.cuenta);
    expect(mesa.platos[0]).toMatchObject({
      nombre: 'Hamburguesa',
      precioCentimos: 1350,
      opciones: ['Patatas', 'Doble de queso'],
    });
    // Lo que gasta, congelado en la línea: el almacén descontará lo que se sirvió.
    const { rows } = await base.bd.query<{ opciones: { nombre: string; anade: unknown }[] }>(
      'select opciones from estook.linea_de_cuenta where cuenta_id = $1',
      [bien.cuenta],
    );
    expect(rows[0]?.opciones.find((o) => o.nombre === 'Doble de queso')?.anade).toMatchObject({
      productoId: queso,
      cantidad: 30,
      unidad: 'g',
    });

    // Dos guarniciones, no; una opción de otro plato, tampoco.
    const dos = await pedirYVer(sara2, [
      { plato_id: plato['Hamburguesa'], opciones: [opcion('Patatas'), opcion('Ensalada')] },
    ]);
    expect(elFallo(dos.pedido)).toBe('faltan_datos');
    const deOtro = await pedirYVer(sara2, [
      { plato_id: plato['Entrecot'], opciones: [opcion('Patatas'), opcion('Doble de queso')] },
    ]);
    expect(elFallo(deOtro.pedido)).toBe('faltan_datos');

    // La cocina lo ve, al mandar.
    losDatos(await api.ejecutar(sara2, 'mandar_a_cocina', { cuenta_id: bien.cuenta }));
    const rosaEnLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    expect(JSON.stringify(losDatos(await api.consultar(rosaEnLaCaja, 'la_cocina')))).toContain(
      'Doble de queso',
    );
  });
});

describe('lo que se vende a peso', () => {
  it('cobra lo que pesa, y sin el peso no se pide', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    losDatos(
      await api.ejecutar(enLaCaja, 'vender_a_peso', { plato_id: plato['Jamón ibérico'], si: true }),
    );
    const sinPeso = await pedirYVer(enLaCaja, [{ plato_id: plato['Jamón ibérico'] }]);
    expect(elFallo(sinPeso.pedido)).toBe('faltan_datos');
    const conPeso = await pedirYVer(enLaCaja, [
      { plato_id: plato['Jamón ibérico'], peso_gramos: 120 },
    ]);
    losDatos(conPeso.pedido);
    expect((await laMesa(enLaCaja, conPeso.cuenta)).platos[0]).toMatchObject({
      precioCentimos: 1440,
      pesoGramos: 120,
    });
  });
});

describe('el precio, desde el TPV', () => {
  it('es el de la carta de Estook, con su rastro', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    losDatos(
      await api.ejecutar(enLaCaja, 'cambiar_precio_desde_el_tpv', {
        plato_id: plato['Entrecot'],
        precio_centimos: 2350,
      }),
    );
    const carta = losDatos<{ platos: { id: string; precioCentimos: number }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(carta.platos.find((p) => p.id === plato['Entrecot'])?.precioCentimos).toBe(2350);
    const { rows } = await base.bd.query<{ n: number }>(
      `select count(*)::int as n from estook.auditoria where accion = 'cambiar_precio_desde_el_tpv'`,
    );
    expect(rows[0]?.n).toBe(1);
  });
});

describe('«Copiar y cambiar» y quitar', () => {
  it('la copia ocupa el sitio del grupo en ese plato, y los demás siguen con el de antes', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const { grupoId } = losDatos<{ grupoId: string }>(
      await api.ejecutar(enLaCaja, 'copiar_grupo_de_opciones', {
        grupo_id: guarnicion,
        nombre: 'Guarnición del entrecot',
        plato_id: plato['Entrecot'],
      }),
    );
    const leidos = losDatos<{ grupos: { id: string; platos: { nombre: string }[] }[] }>(
      await api.consultar(enLaCaja, 'los_grupos_de_opciones'),
    );
    expect(leidos.grupos.find((g) => g.id === grupoId)?.platos.map((p) => p.nombre)).toEqual([
      'Entrecot',
    ]);
    expect(leidos.grupos.find((g) => g.id === guarnicion)?.platos.map((p) => p.nombre)).toEqual([
      'Hamburguesa',
    ]);
    expect(
      losDatos(await api.ejecutar(enLaCaja, 'quitar_grupo_de_opciones', { grupo_id: extras })),
    ).toEqual({ platos: 1 });
  });
});

describe('quién lo monta', () => {
  it('la camarera no; ni Estook con su sesión', async () => {
    const sara = await enElAparato(llaveDelMovil, SARA);
    expect(elFallo(await api.consultar(sara, 'los_grupos_de_opciones'))).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(sara, 'cambiar_precio_desde_el_tpv', {
          plato_id: plato['Entrecot'],
          precio_centimos: 1,
        }),
      ),
    ).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(rosa, 'guardar_grupo_de_opciones', {
          nombre: 'Desde Estook',
          minimo: 0,
          maximo: 1,
          opciones: [{ nombre: 'Una' }],
        }),
      ),
    ).toBe('sin_permiso');
  });
});
