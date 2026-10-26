import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T4 · 2 · La barra y la alergia de la mesa** (decisión 0117; Anexo 3.2 y 7.2), contra la base:
 *
 *   · la pantalla de barra entra sin PIN, con su llave, y ve **solo lo de la barra**, en marcha
 *     al llegar y sin un importe; la de cocina, solo lo de cocina; ninguna tacha lo de la otra
 *   · lo que la barra tacha sale en la cuenta de la sala con su hora (el ✓ de la cuenta), y una
 *     ronda nueva empieza tarjeta nueva; lo de la barra también se devuelve
 *   · **la alergia de la mesa**: la marca la sala, la ven la sala, la cocina y la barra; lo que
 *     lleva cada plato se congela al pedir, y en cocina sale «LLEVA GLUTEN»
 *   · al juntar mesas, la alergia de las dos se queda; la pantalla la lee pero no la cambia
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let barCentro: string;
let llaveDeLaCaja: string;
let llaveDeLaBarra: string;
let llaveDeLaCocina: string;
let enLaCaja: string;
let sara: string;
let cuenta: string;
let zonaId: string;
const plato: Record<string, string> = {};
const linea = {
  canas: crypto.randomUUID(),
  croquetas: crypto.randomUUID(),
  cafe: crypto.randomUUID(),
};

interface Plato {
  id: string;
  nombre: string;
  salioEn: string | null;
  nuevo: boolean;
  lleva: string[];
}
interface Tarjeta {
  cuentaId: string;
  titulo: string;
  estado: string;
  alergias: string[];
  pases: { numero: number; marchadoEn: string | null; platos: Plato[] }[];
}
interface Pantalla {
  prepara: string;
  enMarcha: Tarjeta[];
  esperando: Tarjeta[];
  fuera: Tarjeta[];
}
interface Mesa {
  alergias: string[];
  platos: { id: string; estado: string; salioEn: string | null; alergenos: string[] }[];
}

async function enElAparato(llave: string, correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await entrarFichando(api, llave, base.pinDe(correo, 'bar-centro'), llaveDeLaCaja),
  );
  return tokenDelAparato(dentro.turno, llave);
}

async function vincular(funcion: string, nombre: string) {
  const { codigo } = losDatos<{ codigo: string }>(
    await api.ejecutar(enLaCaja, 'sacar_codigo_para_vincular', { funcion, nombre }),
  );
  return losDatos<{ llave: string }>(await api.ejecutar(null, 'vincular_con_codigo', { codigo }))
    .llave;
}

const laPantalla = async (llave: string) =>
  losDatos<Pantalla>(await api.ejecutar(null, 'la_pantalla_de_cocina', { llave }));
const laTarjeta = (p: Pantalla, de = cuenta) =>
  [...p.enMarcha, ...p.esperando, ...p.fuera].find((t) => t.cuentaId === de);
const losPlatos = (t: Tarjeta | undefined) => (t?.pases ?? []).flatMap((p) => p.platos);
const laMesa = async (de = cuenta) =>
  losDatos<Mesa>(await api.consultar(sara, 'la_mesa', { cuenta_id: de }));

async function abrirUnaMesa(nombre: string): Promise<string> {
  const { mesaId } = losDatos<{ mesaId: string }>(
    await api.ejecutar(enLaCaja, 'crear_mesa', { zona_id: zonaId, nombre, plazas: 4 }),
  );
  const id = crypto.randomUUID();
  losDatos(await api.ejecutar(sara, 'abrir_mesa', { cuenta_id: id, mesa_id: mesaId, personas: 2 }));
  return id;
}

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
  llaveDeLaBarra = await vincular('barra', 'Pantalla de barra');
  llaveDeLaCocina = await vincular('cocina', 'Pantalla de cocina');
  sara = await enElAparato(llaveDeLaTablet, SARA);

  const rosa = await api.entrar(ROSA);
  for (const [seccion, nombre, precio] of [
    ['Bebidas', 'Caña', 220],
    ['Bebidas', 'Café', 150],
    ['Entrantes', 'Croquetas', 900],
  ] as const) {
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: `${seccion} · ${nombre}` }),
    );
    const hechos = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: seccionId,
        platos: [{ nombre, precio_centimos: precio }],
      }),
    );
    plato[nombre] = hechos.creados[0]?.platoId ?? '';
  }
  // Las croquetas llevan gluten y leche, puestos a mano en la carta.
  losDatos(
    await api.ejecutar(rosa, 'cambiar_plato', {
      plato_id: plato['Croquetas'],
      version: 1,
      alergenos: ['gluten', 'lacteos'],
    }),
  );

  zonaId = losDatos<{ zonaId: string }>(
    await api.ejecutar(enLaCaja, 'crear_zona_de_sala', { nombre: 'Salón' }),
  ).zonaId;
  cuenta = await abrirUnaMesa('6');
  // La mesa avisa de su alergia antes de pedir.
  losDatos(
    await api.ejecutar(sara, 'cambiar_las_alergias', {
      cuenta_id: cuenta,
      alergenos: ['gluten', 'huevos'],
    }),
  );
  losDatos(
    await api.ejecutar(sara, 'pedir', {
      cuenta_id: cuenta,
      platos: [
        { id: linea.canas, plato_id: plato['Caña'], cantidad: 2, destino: 'barra' },
        { id: linea.croquetas, plato_id: plato['Croquetas'], pase: 1 },
      ],
    }),
  );
  losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('la pantalla de barra, sin PIN', () => {
  it('ve solo lo de la barra, en marcha al llegar y sin un importe', async () => {
    const barra = await laPantalla(llaveDeLaBarra);
    expect(barra.prepara).toBe('barra');
    const tarjeta = laTarjeta(barra);
    expect(tarjeta).toMatchObject({ titulo: 'Mesa 6', estado: 'en_marcha' });
    expect(losPlatos(tarjeta).map((p) => p.nombre)).toEqual(['Caña']);
    expect(tarjeta?.pases[0]?.marchadoEn).not.toBeNull();
    expect(JSON.stringify(barra)).not.toMatch(/centimos|precio|coste|total/i);
    // Y la de cocina, solo lo suyo.
    const cocina = await laPantalla(llaveDeLaCocina);
    expect(cocina.prepara).toBe('cocina');
    expect(losPlatos(laTarjeta(cocina)).map((p) => p.nombre)).toEqual(['Croquetas']);
  });

  it('ninguna tacha lo de la otra', async () => {
    expect(
      elFallo(
        await api.ejecutar(null, 'tachar_en_la_pantalla', {
          llave: llaveDeLaBarra,
          linea_id: linea.croquetas,
        }),
      ),
    ).toBe('no_existe');
    expect(
      elFallo(
        await api.ejecutar(null, 'tachar_en_la_pantalla', {
          llave: llaveDeLaCocina,
          linea_id: linea.canas,
        }),
      ),
    ).toBe('no_existe');
  });

  it('lo que tacha la barra sale en la cuenta con su hora, y la mesa pasa a Acabados', async () => {
    losDatos(
      await api.ejecutar(null, 'tachar_en_la_pantalla', {
        llave: llaveDeLaBarra,
        linea_id: linea.canas,
      }),
    );
    expect(laTarjeta(await laPantalla(llaveDeLaBarra))?.estado).toBe('fuera');
    const canas = (await laMesa()).platos.find((p) => p.id === linea.canas);
    expect(canas?.estado).toBe('salio');
    expect(canas?.salioEn).not.toBeNull();
    // Otro toque y vuelve.
    losDatos(
      await api.ejecutar(null, 'destachar_en_la_pantalla', {
        llave: llaveDeLaBarra,
        linea_id: linea.canas,
      }),
    );
    expect(laTarjeta(await laPantalla(llaveDeLaBarra))?.estado).toBe('en_marcha');
    losDatos(
      await api.ejecutar(null, 'tachar_en_la_pantalla', {
        llave: llaveDeLaBarra,
        linea_id: linea.canas,
      }),
    );
  });

  it('lo que llega con todo servido empieza otra ronda: la tarjeta no crece', async () => {
    losDatos(
      await api.ejecutar(sara, 'pedir', {
        cuenta_id: cuenta,
        platos: [{ id: linea.cafe, plato_id: plato['Café'], destino: 'barra' }],
      }),
    );
    losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));
    const tarjeta = laTarjeta(await laPantalla(llaveDeLaBarra));
    expect(tarjeta?.estado).toBe('en_marcha');
    expect(losPlatos(tarjeta).map((p) => p.nombre)).toEqual(['Café']);
  });

  it('lo de la barra también se devuelve, y vuelve a su pantalla', async () => {
    losDatos(
      await api.ejecutar(sara, 'devolver_a_cocina', { linea_id: linea.canas, motivo: 'caliente' }),
    );
    const tarjeta = laTarjeta(await laPantalla(llaveDeLaBarra));
    expect(losPlatos(tarjeta).map((p) => p.nombre)).toEqual(['Caña', 'Café']);
  });
});

describe('la alergia de la mesa', () => {
  it('la sala la ve en la mesa y en el plano, en el orden del reglamento', async () => {
    expect((await laMesa()).alergias).toEqual(['gluten', 'huevos']);
    const plano = losDatos<{
      zonas: { mesas: { cuenta: { cuentaId: string; alergias: string[] } | null }[] }[];
    }>(await api.consultar(sara, 'el_plano'));
    const enElPlano = plano.zonas
      .flatMap((z) => z.mesas)
      .find((m) => m.cuenta?.cuentaId === cuenta)?.cuenta;
    expect(enElPlano?.alergias).toEqual(['gluten', 'huevos']);
  });

  it('lo que lleva cada plato se congela al pedir', async () => {
    const croquetas = (await laMesa()).platos.find((p) => p.id === linea.croquetas);
    expect(croquetas?.alergenos).toEqual(['gluten', 'lacteos']);
    // Si la carta cambia después, lo pedido no.
    losDatos(
      await api.ejecutar(await api.entrar(ROSA), 'cambiar_plato', {
        plato_id: plato['Croquetas'],
        version: 2,
        alergenos: [],
      }),
    );
    expect((await laMesa()).platos.find((p) => p.id === linea.croquetas)?.alergenos).toEqual([
      'gluten',
      'lacteos',
    ]);
  });

  it('en cocina sale la franja y «LLEVA GLUTEN» en el plato, sin confirmar nada', async () => {
    const tarjeta = laTarjeta(await laPantalla(llaveDeLaCocina));
    expect(tarjeta?.alergias).toEqual(['gluten', 'huevos']);
    // De lo que lleva, solo lo de la alergia: la leche no es de esta mesa.
    expect(losPlatos(tarjeta).find((p) => p.id === linea.croquetas)?.lleva).toEqual(['gluten']);
    // Y en la barra, la misma franja.
    expect(laTarjeta(await laPantalla(llaveDeLaBarra))?.alergias).toEqual(['gluten', 'huevos']);
  });

  it('se cambia diciendo la lista entera, y lo que no es de los catorce no entra', async () => {
    losDatos(
      await api.ejecutar(sara, 'cambiar_las_alergias', {
        cuenta_id: cuenta,
        alergenos: ['gluten'],
      }),
    );
    expect((await laMesa()).alergias).toEqual(['gluten']);
    expect(
      elFallo(
        await api.ejecutar(sara, 'cambiar_las_alergias', {
          cuenta_id: cuenta,
          alergenos: ['marisco'],
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('al juntar dos mesas, la alergia de las dos se queda en la que queda', async () => {
    const otra = await abrirUnaMesa('7');
    losDatos(
      await api.ejecutar(sara, 'cambiar_las_alergias', { cuenta_id: otra, alergenos: ['sesamo'] }),
    );
    losDatos(await api.ejecutar(sara, 'juntar_mesas', { cuenta_id: cuenta, con: otra }));
    expect((await laMesa()).alergias).toEqual(['gluten', 'sesamo']);
  });
});

describe('la alergia, para la base', () => {
  const comoLaPantalla = async (sql: string) => {
    const { rows } = await base.bd.query<{ id: string }>(
      `select id::text as id from estook.terminal where funcion = 'barra' limit 1`,
    );
    await base.bd.query(`begin`);
    try {
      await base.bd.query(`set local role estook_api`);
      await base.bd.query(`select set_config('estook.pantalla_id', $1, true)`, [rows[0]?.id ?? '']);
      return await base.bd.query(sql);
    } finally {
      await base.bd.query(`rollback`);
    }
  };

  it('la pantalla la lee, pero no la cambia aunque alguien se salte la API', async () => {
    expect(
      (await comoLaPantalla(`select 1 from estook.alergeno_de_la_cuenta`)).rows.length,
    ).toBeGreaterThan(0);
    await expect(
      comoLaPantalla(
        `insert into estook.alergeno_de_la_cuenta (cuenta_id, local_id, alergeno)
         values ('${cuenta}', '${barCentro}', 'apio')`,
      ),
    ).rejects.toThrow(/row-level security/);
    const borradas = await comoLaPantalla(`delete from estook.alergeno_de_la_cuenta returning 1`);
    expect(borradas.rows).toHaveLength(0);
  });
});
