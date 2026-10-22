import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { modeloDeMentira } from '../../servidor/ia/modelo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * «Analiza mi zona» (M10 · 2, decisiones 0103 y 0104), con el Fogón de mentira, que no
 * gasta:
 *
 *   · a Fogón le llega el local y sus platos **con su precio y sin un coste**, y que
 *     busque en internet cerca de su dirección
 *   · se guarda solo lo que se sostiene: **un enlace que no ha visto, no se guarda**
 *   · las medias las hace Estook, y con menos de tres precios no se juzga
 *   · **una vez cada 24 horas**: la segunda no llega al modelo ni gasta
 *   · la comparación se rehace con tu precio de hoy, sin buscar otra vez
 *   · la camarera lo ve y no lo lanza
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const modelo = modeloDeMentira();

/** Miércoles 21-oct-2026 a mediodía en Madrid. */
let ahora = new Date('2026-10-21T10:00:00Z');

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';

let rosa: string;
let sara: string;
const platos: Record<string, string> = {};

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

interface MiZona {
  puedeAnalizar: boolean;
  creditos: number;
  otraVezDesde: string | null;
  analisis: {
    resumen: string | null;
    locales: { nombre: string; enlace: string }[];
    platos: {
      platoId: string | null;
      nombre: string;
      miPrecioCentimos: number | null;
      comparado: {
        cuantos: number;
        mediaCentimos: number;
        diferenciaCentimos: number;
        como: string;
      } | null;
      precios: { donde: string; precioCentimos: number; enlace: string }[];
    }[];
  } | null;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { fogon: modelo, ahora: () => ahora });
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);

  const entrantes = losDatos<{ seccionId: string }>(
    await api.ejecutar(rosa, 'crear_seccion', { nombre: 'Para picar' }),
  ).seccionId;
  const hechos = losDatos<{ creados: { platoId: string; nombre: string }[] }>(
    await api.ejecutar(rosa, 'crear_platos', {
      seccion_id: entrantes,
      platos: [
        { nombre: 'Patatas bravas', precio_centimos: 700 },
        { nombre: 'Croquetas de jamón', precio_centimos: 850 },
      ],
    }),
  );
  for (const p of hechos.creados) platos[p.nombre] = p.platoId;
  losDatos(await api.ejecutar(rosa, 'sirve_menus', { sirve: true }));

  const centro = await base.localPorCodigo('bar-centro');
  await comoDuena(
    `update estook.local set direccion = 'Calle Mayor 5', codigo_postal = '20001',
            poblacion = 'Donostia', provincia = 'Gipuzkoa' where id = $1`,
    [centro],
  );
  const [org] = await comoDuena<{ organizacion_id: string }>(
    'select organizacion_id from estook.local where id = $1',
    [centro],
  );
  await comoDuena('update plataforma.fogon set encendido = true where unica');
  await comoDuena(
    `insert into plataforma.fogon_del_cliente (organizacion_id, encendido) values ($1, true)
     on conflict (organizacion_id) do update set encendido = true`,
    [org?.organizacion_id],
  );
  // El menú del día a 13,50 €.
  const menus = losDatos<{ menus: { id: string; version: number }[] }>(
    await api.consultar(rosa, 'mis_menus'),
  );
  const delDia = menus.menus[0];
  losDatos(
    await api.ejecutar(rosa, 'cambiar_menu', {
      menu_id: delDia?.id,
      version: delDia?.version,
      precio_centimos: 1350,
    }),
  );
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('analiza mi zona', () => {
  it('antes de la primera vez no hay nada, y se puede', async () => {
    const zona = losDatos<MiZona>(await api.consultar(rosa, 'mi_zona'));
    expect(zona.analisis).toBeNull();
    expect(zona.otraVezDesde).toBeNull();
    expect(zona.puedeAnalizar).toBe(true);
    expect(zona.creditos).toBe(25);
  });

  it('la camarera no lo lanza', async () => {
    expect(elFallo(await api.ejecutar(sara, 'analizar_mi_zona', {}))).toBe('sin_permiso');
    expect(losDatos<MiZona>(await api.consultar(sara, 'mi_zona')).puedeAnalizar).toBe(false);
  });

  it('a Fogón le llegan la dirección y los platos con su precio, sin un coste, y que busque', async () => {
    const zona = losDatos<MiZona>(await api.ejecutar(rosa, 'analizar_mi_zona', {}));
    const pedida = modelo.pedidas.at(-1);
    expect(pedida?.buscarEnInternet).toEqual({
      maxBusquedas: 8,
      ciudad: 'Donostia',
      region: 'Gipuzkoa',
      pais: 'ES',
      zonaHoraria: 'Europe/Madrid',
    });
    expect(pedida?.resumen).toContain('Calle Mayor 5, 20001 Donostia, Gipuzkoa');
    expect(pedida?.resumen).toContain('- Patatas bravas: 7,00 €');
    expect(pedida?.resumen).toContain('Su menú del día: 13,50 €');
    expect(pedida?.resumen).not.toMatch(/coste|cuesta/i);
    expect(zona.analisis?.locales.map((l) => l.nombre)).toEqual(['Bar 1', 'Bar 2', 'Bar 3']);

    // Apuntada, con sus búsquedas y sus 25 créditos.
    const [llamada] = await comoDuena<{ creditos: number; busquedas: number }>(
      `select creditos, busquedas_en_internet as busquedas from estook.llamada_a_fogon
        where que = 'analizar_zona'`,
    );
    expect(llamada).toEqual({ creditos: 25, busquedas: 3 });
  });

  it('el precio con un enlace que no ha visto no se guarda; las bravas, 1 € por encima', async () => {
    const zona = losDatos<MiZona>(await api.consultar(rosa, 'mi_zona'));
    const bravas = zona.analisis?.platos.find((p) => p.nombre === 'Patatas bravas');
    expect(bravas?.precios.map((p) => p.donde)).toEqual(['Bar 1', 'Bar 2', 'Bar 3']);
    expect(bravas?.precios.some((p) => p.enlace.includes('inventado'))).toBe(false);
    expect(bravas?.comparado).toMatchObject({
      cuantos: 3,
      mediaCentimos: 600,
      diferenciaCentimos: 100,
      como: 'por_encima',
    });
    const menu = zona.analisis?.platos.find((p) => p.platoId === null);
    expect(menu?.miPrecioCentimos).toBe(1350);
    expect(menu?.comparado?.como).toBe('en_la_media');
    // Lo que se puede juzgar va primero.
    expect(zona.analisis?.platos[0]?.nombre).toBe('Patatas bravas');
  });

  it('una vez cada 24 horas: la segunda no llega a Fogón ni gasta', async () => {
    const pedidas = modelo.pedidas.length;
    ahora = new Date('2026-10-22T08:00:00Z');
    expect(elFallo(await api.ejecutar(rosa, 'analizar_mi_zona', {}))).toBe('faltan_datos');
    expect(modelo.pedidas.length).toBe(pedidas);
    const zona = losDatos<MiZona>(await api.consultar(rosa, 'mi_zona'));
    expect(zona.otraVezDesde).toBe('2026-10-22T10:00:00.000Z');
    ahora = new Date('2026-10-22T10:00:00Z');
    expect(losDatos<MiZona>(await api.consultar(rosa, 'mi_zona')).otraVezDesde).toBeNull();
  });

  it('si bajas las bravas, la comparación cambia al momento, sin buscar otra vez', async () => {
    const pedidas = modelo.pedidas.length;
    const plato = losDatos<{ plato: { version: number } }>(
      await api.consultar(rosa, 'un_plato', { plato_id: platos['Patatas bravas'] ?? '' }),
    ).plato;
    losDatos(
      await api.ejecutar(rosa, 'cambiar_plato', {
        plato_id: platos['Patatas bravas'],
        version: plato.version,
        precio_centimos: 600,
      }),
    );
    const zona = losDatos<MiZona>(await api.consultar(rosa, 'mi_zona'));
    expect(zona.analisis?.platos.find((p) => p.nombre === 'Patatas bravas')?.comparado?.como).toBe(
      'en_la_media',
    );
    expect(modelo.pedidas.length).toBe(pedidas);
  });
});
