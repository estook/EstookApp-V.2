import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T4 · 1 · La pantalla de cocina** (decisión 0116; Anexo 3.2, 3.4 y 3.7), contra la base:
 *
 *   · se vincula como pantalla de cocina y **entra sin PIN, con su llave**
 *   · ve **el ticket entero** de la mesa, el 1.º en marcha y el 2.º en espera, **sin un importe**
 *   · tacha y destacha de un toque; al tachar el último del pase, la sala ve que toca marchar,
 *     y al acabar la mesa pasa a «fuera» (Acabados)
 *   · **no marcha ni quita**, aunque alguien se salte la API, y no lee nada más del local
 *   · «Llamar a Sara» le llega a la mesa, y «Ya voy» lo quita; «Tienen prisa» la sube arriba
 *   · los minutos y el sonido, en la caja
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let llaveDeLaPantalla: string;
let enLaCaja: string;
let sara: string;
let cuenta: string;
const plato: Record<string, string> = {};
const linea = { croquetas: crypto.randomUUID(), entrecot: crypto.randomUUID() };

interface Tarjeta {
  cuentaId: string;
  titulo: string;
  camarero: string | null;
  conPrisa: boolean;
  cocinaLlamaEn: string | null;
  estado: string;
  pases: {
    numero: number;
    marchadoEn: string | null;
    platos: { id: string; salioEn: string | null }[];
  }[];
}
interface Pantalla {
  ajustes: { avisoMin: number; tardeMin: number; suena: boolean };
  enMarcha: Tarjeta[];
  esperando: Tarjeta[];
  fuera: Tarjeta[];
}

async function enElAparato(llave: string, correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llave, base.pinDe(correo, 'bar-centro'), llaveDeLaCaja),
  );
  return tokenDelAparato(dentro.turno, llave);
}

async function vincular(funcion: string, nombre: string, extra: Record<string, unknown> = {}) {
  const { codigo } = losDatos<{ codigo: string }>(
    await api.ejecutar(enLaCaja, 'sacar_codigo_para_vincular', { funcion, nombre, ...extra }),
  );
  return losDatos<{ llave: string }>(await api.ejecutar(null, 'vincular_con_codigo', { codigo }))
    .llave;
}

const laPantalla = async (llave = llaveDeLaPantalla) =>
  losDatos<Pantalla>(await api.ejecutar(null, 'la_pantalla_de_cocina', { llave }));
const laTarjeta = (p: Pantalla) =>
  [...p.enMarcha, ...p.esperando, ...p.fuera].find((t) => t.cuentaId === cuenta);

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
  enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
  const llaveDeLaTablet = await vincular('comandero', 'Tablet de la sala');
  llaveDeLaPantalla = await vincular('cocina', 'Pantalla de cocina');
  sara = await enElAparato(llaveDeLaTablet, SARA);

  const rosa = await api.entrar(ROSA);
  for (const [seccion, nombre, precio] of [
    ['Entrantes', 'Croquetas', 900],
    ['Principales', 'Entrecot', 2200],
  ] as const) {
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: seccion }),
    );
    const hechos = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: seccionId,
        platos: [{ nombre, precio_centimos: precio }],
      }),
    );
    plato[nombre] = hechos.creados[0]?.platoId ?? '';
  }

  const { zonaId } = losDatos<{ zonaId: string }>(
    await api.ejecutar(enLaCaja, 'crear_zona_de_sala', { nombre: 'Salón' }),
  );
  const { mesaId } = losDatos<{ mesaId: string }>(
    await api.ejecutar(enLaCaja, 'crear_mesa', { zona_id: zonaId, nombre: '6', plazas: 4 }),
  );
  cuenta = crypto.randomUUID();
  losDatos(
    await api.ejecutar(sara, 'abrir_mesa', { cuenta_id: cuenta, mesa_id: mesaId, personas: 4 }),
  );
  losDatos(
    await api.ejecutar(sara, 'pedir', {
      cuenta_id: cuenta,
      platos: [
        { id: linea.croquetas, plato_id: plato['Croquetas'], pase: 1 },
        { id: linea.entrecot, plato_id: plato['Entrecot'], pase: 2, nota: 'poco hecho' },
      ],
    }),
  );
  losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la pantalla de cocina, sin PIN', () => {
  it('con su llave ve el ticket entero: el 1.º en marcha, el 2.º en espera, y sin un importe', async () => {
    const pantalla = await laPantalla();
    const tarjeta = laTarjeta(pantalla);
    expect(tarjeta).toMatchObject({ titulo: 'Mesa 6', camarero: 'Sara', estado: 'en_marcha' });
    expect(tarjeta?.pases.map((p) => [p.numero, p.marchadoEn !== null])).toEqual([
      [1, true],
      [2, false],
    ]);
    // Ni un precio, ni un coste, ni un total: tampoco en la respuesta.
    expect(JSON.stringify(pantalla)).not.toMatch(/centimos|precio|coste|total/i);
    expect(pantalla.ajustes).toEqual({ avisoMin: 10, tardeMin: 20, suena: true });
  });

  it('la llave de un comandero no la abre, ni una que no existe', async () => {
    const otra = await vincular('comandero', 'Otra tablet');
    expect(elFallo(await api.ejecutar(null, 'la_pantalla_de_cocina', { llave: otra }))).toBe(
      'sin_permiso',
    );
    expect(
      elFallo(await api.ejecutar(null, 'la_pantalla_de_cocina', { llave: 'x'.repeat(40) })),
    ).toBe('aparato_retirado');
  });

  it('tacha y destacha de un toque; al tachar el último del 1.º, la sala ve que toca marchar', async () => {
    losDatos(
      await api.ejecutar(null, 'tachar_en_la_pantalla', {
        llave: llaveDeLaPantalla,
        linea_id: linea.croquetas,
      }),
    );
    losDatos(
      await api.ejecutar(null, 'destachar_en_la_pantalla', {
        llave: llaveDeLaPantalla,
        linea_id: linea.croquetas,
      }),
    );
    const otraVez = losDatos<{ paseFuera: boolean }>(
      await api.ejecutar(null, 'tachar_en_la_pantalla', {
        llave: llaveDeLaPantalla,
        linea_id: linea.croquetas,
      }),
    );
    expect(otraVez.paseFuera).toBe(true);
    expect(laTarjeta(await laPantalla())?.estado).toBe('esperando');
    const plano = losDatos<{ tocaMarchar: { cuentaId: string }[] }>(
      await api.consultar(sara, 'el_plano'),
    );
    expect(plano.tocaMarchar.map((t) => t.cuentaId)).toContain(cuenta);
  });

  it('la pantalla no marcha: lo que espera no se tacha, y marchar es de la sala', async () => {
    expect(
      elFallo(
        await api.ejecutar(null, 'tachar_en_la_pantalla', {
          llave: llaveDeLaPantalla,
          linea_id: linea.entrecot,
        }),
      ),
    ).toBe('ya_hecho');
    losDatos(await api.ejecutar(sara, 'marchar', { cuenta_id: cuenta, pase: 2 }));
    expect(laTarjeta(await laPantalla())?.estado).toBe('en_marcha');
  });

  it('«Tienen prisa» la sube arriba; «Llamar a Sara» llega a la mesa, y «Ya voy» lo quita', async () => {
    losDatos(await api.ejecutar(sara, 'cambiar_la_prisa', { cuenta_id: cuenta, con_prisa: true }));
    const pantalla = await laPantalla();
    expect(pantalla.enMarcha[0]).toMatchObject({ cuentaId: cuenta, conPrisa: true });

    losDatos(
      await api.ejecutar(null, 'llamar_al_camarero', {
        llave: llaveDeLaPantalla,
        cuenta_id: cuenta,
      }),
    );
    const llamada = losDatos<{ cocinaLlamaEn: string | null }>(
      await api.consultar(sara, 'la_mesa', { cuenta_id: cuenta }),
    );
    expect(llamada.cocinaLlamaEn).not.toBeNull();
    losDatos(await api.ejecutar(sara, 'ya_voy', { cuenta_id: cuenta }));
    expect(
      losDatos<{ cocinaLlamaEn: string | null }>(
        await api.consultar(sara, 'la_mesa', { cuenta_id: cuenta }),
      ).cocinaLlamaEn,
    ).toBeNull();
  });

  it('al tachar lo último, la mesa pasa a «fuera» (Acabados), y otro toque la devuelve', async () => {
    losDatos(
      await api.ejecutar(null, 'tachar_en_la_pantalla', {
        llave: llaveDeLaPantalla,
        linea_id: linea.entrecot,
      }),
    );
    expect(laTarjeta(await laPantalla())?.estado).toBe('fuera');
    losDatos(
      await api.ejecutar(null, 'destachar_en_la_pantalla', {
        llave: llaveDeLaPantalla,
        linea_id: linea.entrecot,
      }),
    );
    expect(laTarjeta(await laPantalla())?.estado).toBe('en_marcha');
  });
});

describe('la pantalla, para la base, solo cocina', () => {
  const comoLaPantalla = async (sql: string) => {
    const { rows } = await base.bd.query<{ id: string }>(
      `select id::text as id from estook.terminal where funcion = 'cocina' limit 1`,
    );
    const pantalla = rows[0]?.id ?? '';
    await base.bd.query(`begin`);
    try {
      await base.bd.query(`set local role estook_api`);
      await base.bd.query(`select set_config('estook.pantalla_id', $1, true)`, [pantalla]);
      return await base.bd.query(sql);
    } finally {
      await base.bd.query(`rollback`);
    }
  };

  it('ve las mesas del servicio, y nada más del local', async () => {
    expect((await comoLaPantalla(`select 1 from estook.cuenta`)).rows.length).toBeGreaterThan(0);
    expect((await comoLaPantalla(`select 1 from estook.producto`)).rows).toHaveLength(0);
    expect((await comoLaPantalla(`select 1 from estook.plato`)).rows).toHaveLength(0);
    // Ni el rastro del local, que podría llevar importes.
    expect((await comoLaPantalla(`select 1 from estook.auditoria`)).rows).toHaveLength(0);
  });

  it('no marcha ni quita, aunque alguien se salte la API', async () => {
    await expect(
      comoLaPantalla(
        `update estook.pase set marchado_en = now() where cuenta_id = '${cuenta}' and numero = 1`,
      ),
    ).rejects.toThrow(/marchar es de la sala/);
    await expect(
      comoLaPantalla(
        `update estook.linea_de_cuenta set quitada_en = now(), motivo_de_quitar = 'no'
          where id = '${linea.entrecot}'`,
      ),
    ).rejects.toThrow(/lo aprueba un jefe/);
  });
});

describe('Ajustes del TPV › Cocina y barra', () => {
  it('los minutos y el sonido se cambian en la caja; el rojo va después del ámbar', async () => {
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'guardar_la_cocina_y_la_barra', {
          aviso_min: 20,
          tarde_min: 15,
          suena: true,
        }),
      ),
    ).toBe('faltan_datos');
    losDatos(
      await api.ejecutar(enLaCaja, 'guardar_la_cocina_y_la_barra', {
        aviso_min: 8,
        tarde_min: 15,
        suena: false,
      }),
    );
    // Y dónde sale cada una (T5 · 1, 0119): sin tocarlo, en su pantalla.
    expect(losDatos(await api.consultar(enLaCaja, 'la_cocina_y_la_barra'))).toEqual({
      avisoMin: 8,
      tardeMin: 15,
      suena: false,
      cocinaSaleEn: 'pantalla',
      barraSaleEn: 'pantalla',
    });
    expect((await laPantalla()).ajustes).toEqual({ avisoMin: 8, tardeMin: 15, suena: false });
    // En la tablet de la sala no: los ajustes, en la caja (0115).
    expect(
      elFallo(
        await api.ejecutar(sara, 'guardar_la_cocina_y_la_barra', {
          aviso_min: 9,
          tarde_min: 15,
          suena: true,
        }),
      ),
    ).toBe('sin_permiso');
  });
});
