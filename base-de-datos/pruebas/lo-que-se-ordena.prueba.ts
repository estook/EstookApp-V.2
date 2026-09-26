import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  masDias,
  type CifraDelSemaforo,
  type CosaDeHoy,
  type FechaOperativa,
} from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Entrega O · lo que se ordena (decisión 0047), contra la base y por la API.
 *
 *   · la carta de cada local: su dirección para siempre, única, y lo que enseña
 *     sin sesión, que es solo lo que el local ya enseña al mundo
 *   · los objetivos: la merma en fracción y las ventas en euros, y el semáforo
 *     contando **lo mismo** que las cifras del Panel
 *   · cada cifra del semáforo, solo a quien puede verla
 *   · lo de hoy: lo que caduca, la caja que se suele cerrar y no está, y nada de
 *     lo que no le toca a quien mira
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera de Bar Centro

let rosa: string;
let luis: string;
let marcos: string;
let sara: string;
let centro: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  luis = await api.entrar(LUIS);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  centro = await base.localPorCodigo('bar-centro');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

interface MisObjetivos {
  desde: string;
  hasta: string;
  cifras: CifraDelSemaforo[];
  puestos: { clave: string; valor: number | null; importeCentimos: number | null }[] | null;
  puedeCambiarlos: boolean;
  propuestaDeVentas: number | null;
}

async function misObjetivos(token: string): Promise<MisObjetivos> {
  return losDatos<MisObjetivos>(await api.consultar(token, 'mis_objetivos', {}));
}

function laCifra(de: MisObjetivos, que: string): CifraDelSemaforo | undefined {
  return de.cifras.find((c) => c.que === que);
}

// ── La carta ─────────────────────────────────────────────────────────────────

describe('la dirección de la carta', () => {
  it('cada local tiene la suya, sola si es el único de su empresa', async () => {
    const filas = await comoDuena<{ codigo: string; direccion: string }>(
      `select l.codigo, l.direccion_de_la_carta as direccion
         from estook.local l join estook.organizacion o on o.id = l.organizacion_id
        where o.codigo in ('bar-centro', 'grupo-costa') order by l.creado_en, l.id`,
    );
    expect(filas.find((f) => f.codigo === 'bar-centro')?.direccion).toBe('bar-centro');
    // En una cadena, la de la empresa y la del local; y ninguna repetida.
    expect(filas.find((f) => f.codigo === 'bar-ribera')?.direccion).toBe('grupo-costa-bar-ribera');
    const todas = await comoDuena<{ direccion: string }>(
      `select direccion_de_la_carta as direccion from estook.local`,
    );
    expect(new Set(todas.map((f) => f.direccion)).size).toBe(todas.length);
  });

  it('no cambia al renombrar el local: la lleva un QR impreso', async () => {
    const [antes] = await comoDuena<{ direccion: string }>(
      `select direccion_de_la_carta as direccion from estook.local where id = $1`,
      [centro],
    );
    await comoDuena(`update estook.local set nombre = 'Bar Centro Nuevo' where id = $1`, [centro]);
    const [despues] = await comoDuena<{ direccion: string }>(
      `select direccion_de_la_carta as direccion from estook.local where id = $1`,
      [centro],
    );
    await comoDuena(`update estook.local set nombre = 'Bar Centro' where id = $1`, [centro]);
    expect(despues?.direccion).toBe(antes?.direccion);
  });

  it('si ya está cogida, la siguiente libre', async () => {
    const [libre] = await comoDuena<{ d: string }>(
      `select estook.direccion_libre_para_la_carta('Bar  Centro!!') as d`,
    );
    expect(libre?.d).toBe('bar-centro-2');
  });

  it('quien lleva el local la ve en su sesión, para su QR', async () => {
    const yo = losDatos<{ local: { direccionDeLaCarta: string } }>(
      await api.consultar(rosa, 'quien_soy', {}),
    );
    expect(yo.local.direccionDeLaCarta).toBe('bar-centro');
  });
});

describe('la carta, sin sesión', () => {
  it('enseña el nombre y lo que el local ya enseña al mundo, y nada de dentro', async () => {
    await comoDuena(
      `update estook.local set telefono = '956 000 001', google_horario = $2::jsonb where id = $1`,
      [centro, JSON.stringify(['lunes: 13:00–16:00', 'martes: cerrado'])],
    );
    const carta = losDatos<Record<string, unknown>>(
      await api.consultar(null, 'la_carta', { direccion: 'Bar-Centro' }),
    );
    expect(carta['nombre']).toBe('Bar Centro');
    expect(carta['telefono']).toBe('956 000 001');
    expect(carta['horario']).toEqual(['lunes: 13:00–16:00', 'martes: cerrado']);
    // Ni un identificador: la carta no es una puerta al local.
    expect(Object.keys(carta).sort()).toEqual(
      [
        'colorDeMarca',
        'direccion',
        'horario',
        'logo',
        'mapa',
        'nombre',
        // La carta que subió el local, en enlaces firmados (repaso del 25-sep, 0049).
        'paginas',
        'resenas',
        'telefono',
        'valoracion',
        'web',
      ].sort(),
    );
  });

  it('una dirección que no existe dice que no existe, y una rara ni llega a la base', async () => {
    expect(elFallo(await api.consultar(null, 'la_carta', { direccion: 'no-hay-tal' }))).toBe(
      'no_existe',
    );
    expect(elFallo(await api.consultar(null, 'la_carta', { direccion: "x'; drop" }))).not.toBe(
      'no_existe',
    );
  });

  it('un local dado de baja no enseña carta', async () => {
    await comoDuena(`update estook.local set activo = false where id = $1`, [centro]);
    const carta = await api.consultar(null, 'la_carta', { direccion: 'bar-centro' });
    await comoDuena(`update estook.local set activo = true where id = $1`, [centro]);
    expect(elFallo(carta)).toBe('no_existe');
  });
});

// ── Los objetivos ────────────────────────────────────────────────────────────

describe('los objetivos y su semáforo', () => {
  let hoy: FechaOperativa;
  let pulpo: string;

  beforeAll(async () => {
    const ventas = losDatos<{ jornada: string }>(
      await api.consultar(rosa, 'un_indicador', { indicador: 'ventas', dias: '7' }),
    );
    hoy = ventas.jornada as FechaOperativa;

    pulpo = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Pulpo de los objetivos',
        unidad_de_uso: 'kg',
        zona: 'cocina',
        precio_centimos: 2_000,
      }),
    ).productoId;
    // Compras de la semana: 10 kg a 20 €. Y se tira 1 kg: el 10 % de lo comprado.
    losDatos(await api.ejecutar(rosa, 'apuntar_entrada', { producto_id: pulpo, cuanto: 10 }));
    losDatos(
      await api.ejecutar(rosa, 'apuntar_merma', {
        producto_id: pulpo,
        cuanto: 1,
        motivo: 'caducado',
      }),
    );
    losDatos(
      await api.ejecutar(rosa, 'cerrar_la_caja', {
        fecha: masDias(hoy, -1),
        total_centimos: 100_000,
        tickets: 30,
      }),
    );
  });

  it('se ponen la merma, en fracción, y las ventas de la semana, en euros', async () => {
    const puestos = await api.ejecutar(rosa, 'poner_objetivos', {
      objetivos: [
        { clave: 'merma', valor: 0.05 },
        { clave: 'ventas_semanales', importeCentimos: 500_000 },
      ],
    });
    expect(puestos.estado).toBe('ok');
    const mios = await misObjetivos(rosa);
    const merma = mios.puestos?.find((p) => p.clave === 'merma');
    const ventas = mios.puestos?.find((p) => p.clave === 'ventas_semanales');
    expect(merma).toMatchObject({ valor: 0.05, importeCentimos: null });
    expect(ventas).toMatchObject({ valor: null, importeCentimos: 500_000 });
  });

  it('no deja mezclar: la merma no va en euros ni las ventas en fracción', async () => {
    for (const mal of [
      { clave: 'merma', importeCentimos: 1_000 },
      { clave: 'ventas_semanales', valor: 0.3 },
      { clave: 'merma', valor: 3 },
    ]) {
      expect((await api.ejecutar(rosa, 'poner_objetivos', { objetivos: [mal] })).estado).not.toBe(
        'ok',
      );
    }
  });

  it('la merma del semáforo es lo tirado entre lo comprado, y se juzga con su objetivo', async () => {
    const merma = laCifra(await misObjetivos(rosa), 'merma');
    // 20 € tirados de 200 € comprados: el 10 %, con un objetivo del 5 %. Rojo.
    expect(merma?.valor).toBe(10);
    expect(merma?.semaforo).toBe('rojo');
    expect(merma?.porque.join(' ')).toContain('Pulpo de los objetivos');
  });

  it('el food cost del semáforo es el mismo que la cifra del Panel', async () => {
    const semaforo = laCifra(await misObjetivos(rosa), 'materia_prima');
    const cifra = losDatos<{ total: number | null }>(
      await api.consultar(rosa, 'un_indicador', { indicador: 'food-cost', dias: '7' }),
    );
    expect(semaforo?.valor).toBe(cifra.total);
  });

  it('las ventas, frente a su objetivo', async () => {
    const ventas = laCifra(await misObjetivos(rosa), 'ventas_semanales');
    // 1.000 € de 5.000 €: rojo, y lo dice con los dos números.
    expect(ventas?.semaforo).toBe('rojo');
    expect(ventas?.porque[0]).toContain('1.000,00 €');
    expect(ventas?.porque[0]).toContain('5.000,00 €');
  });

  it('y se quita el de ventas, que es el único que se puede no tener', async () => {
    losDatos(
      await api.ejecutar(rosa, 'poner_objetivos', {
        objetivos: [{ clave: 'ventas_semanales', importeCentimos: null }],
      }),
    );
    const ventas = laCifra(await misObjetivos(rosa), 'ventas_semanales');
    expect(ventas?.semaforo).toBe('sin_dato');
    expect(ventas?.queHacer?.ir).toContain('objetivos');
  });

  it('cada uno ve las cifras que puede ver, y solo quien lleva el local las cambia', async () => {
    const deRosa = await misObjetivos(rosa);
    expect(deRosa.cifras.map((c) => c.que)).toEqual([
      'materia_prima',
      'personal',
      'coste_primo',
      'merma',
      'ventas_semanales',
    ]);
    expect(deRosa.puedeCambiarlos).toBe(true);

    // El jefe de cocina ve las ventas (0041) y los precios, pero no lo que cuesta
    // el personal: ni el personal ni el coste primo, que se lo diría restando.
    const deLuis = await misObjetivos(luis);
    expect(deLuis.cifras.map((c) => c.que)).not.toContain('personal');
    expect(deLuis.cifras.map((c) => c.que)).not.toContain('coste_primo');
    expect(deLuis.puedeCambiarlos).toBe(false);
    expect(deLuis.puestos).toBeNull();

    // Ni el cocinero ni la camarera ven un euro.
    expect((await misObjetivos(marcos)).cifras).toEqual([]);
    expect((await misObjetivos(sara)).cifras).toEqual([]);

    // Y cambiarlos, solo quien puede.
    const deLuisPoner = await api.ejecutar(luis, 'poner_objetivos', {
      objetivos: [{ clave: 'merma', valor: 0.2 }],
    });
    expect(elFallo(deLuisPoner)).toBe('sin_permiso');
  });

  it('el alta sigue viendo solo sus tres objetivos', async () => {
    const alta = losDatos<{ objetivos: { clave: string }[] }>(
      await api.consultar(rosa, 'el_alta', {}),
    );
    expect(alta.objetivos.map((o) => o.clave).sort()).toEqual([
      'margen',
      'materia_prima',
      'personal',
    ]);
  });
});

// ── Lo de hoy ────────────────────────────────────────────────────────────────

describe('lo de hoy', () => {
  let hoy: FechaOperativa;

  beforeAll(async () => {
    hoy = losDatos<{ hoy: string }>(await api.consultar(rosa, 'lo_de_hoy', {}))
      .hoy as FechaOperativa;
    const tomate = losDatos<{ productoId: string }>(
      await api.ejecutar(rosa, 'crear_producto', {
        nombre: 'Tomate de hoy',
        unidad_de_uso: 'kg',
        zona: 'cocina',
        precio_centimos: 300,
      }),
    ).productoId;
    // La caducidad es una fecha del calendario, no de la jornada: a la una de la
    // madrugada lo que caducaba «ayer» ya ha caducado, aunque la caja sea de ayer.
    const [calendario] = await comoDuena<{ hoy: string }>(
      `select (now() at time zone l.zona_horaria)::date::text as hoy from estook.local l where l.id = $1`,
      [centro],
    );
    losDatos(
      await api.ejecutar(rosa, 'apuntar_entrada', {
        producto_id: tomate,
        cuanto: 5,
        lote: 'L-HOY',
        caduca_el: calendario?.hoy,
      }),
    );
  });

  async function loDeHoy(token: string): Promise<CosaDeHoy[]> {
    return losDatos<{ cosas: CosaDeHoy[] }>(await api.consultar(token, 'lo_de_hoy', {})).cosas;
  }

  it('lo que caduca hoy sale, y ordenado por escalones', async () => {
    const cosas = await loDeHoy(rosa);
    const caduca = cosas.find((c) => c.id === 'lotes-caducan-hoy');
    expect(caduca?.escalon).toBe(2);
    expect(caduca?.detalle).toContain('Tomate de hoy');
    const escalones = cosas.map((c) => c.escalon);
    expect(escalones).toEqual([...escalones].sort((a, b) => a - b));
  });

  it('la caja que se suele cerrar ese día y no está, arriba del todo', async () => {
    await comoDuena(`update estook.local set como_se_cierra = 'a_mano' where id = $1`, [centro]);
    // Se cerró el mismo día de la semana que ayer, hace una y dos semanas. Ayer no.
    for (const hace of [8, 15]) {
      losDatos(
        await api.ejecutar(rosa, 'cerrar_la_caja', {
          fecha: masDias(hoy, -hace),
          total_centimos: 80_000,
          tickets: 20,
        }),
      );
    }
    await comoDuena(
      `delete from estook.cierre_de_caja where local_id = $1 and fecha_operativa = $2::date`,
      [centro, masDias(hoy, -1)],
    );
    const cosas = await loDeHoy(rosa);
    const caja = cosas.find((c) => c.id === 'caja-sin-cerrar');
    expect(caja?.escalon).toBe(1);
    // Corto, que en el móvil cabe en una línea: la fecha entera lo partía en tres.
    expect(caja?.titulo).toBe('La caja de ayer está sin cerrar');
    expect(cosas[0]?.escalon).toBe(1);
  });

  it('a cada uno, lo suyo: la camarera no ve ni la cámara ni la caja', async () => {
    const deSara = await loDeHoy(sara);
    expect(deSara.filter((c) => c.app === 'almacen' || c.app === 'servicio')).toEqual([]);
    // El cocinero ve lo que caduca, y no la caja.
    const deMarcos = await loDeHoy(marcos);
    expect(deMarcos.some((c) => c.id === 'lotes-caducan-hoy')).toBe(true);
    expect(deMarcos.some((c) => c.id === 'caja-sin-cerrar')).toBe(false);
  });
});
