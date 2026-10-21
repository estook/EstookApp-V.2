import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M10 · 2 · Los menús (decisiones 0103 y 0104, migración 0079), contra una base de
 * verdad y como cada persona:
 *
 *   · **¿Tu local sirve menús?**: sin contestar, se pregunta; con sí, nace el menú del día
 *   · **cada día distinto** (A1): un día que no se toca repite el anterior; cambiar uno
 *     no mueve los demás; lo que ya pasó no se toca
 *   · **el plato nuevo** nace solo en el menú, no sale en la carta y pasa a ella si se
 *     escribe en la carta
 *   · **lo que deja**, solo a quien ve costes; y sin escandallos, dice cuáles faltan
 *   · **el cierre de caja** conoce el precio del menú
 *   · la camarera lo ve y no lo toca; nadie de fuera lo toca
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

/** Martes 20-oct-2026 a las 12:00 en Madrid: el lunes 19 ya pasó. */
const ahora = new Date('2026-10-20T10:00:00Z');
const LUNES = '2026-10-19';
const MARTES = '2026-10-20';
const MIERCOLES = '2026-10-21';
const JUEVES = '2026-10-22';

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: edita la carta y ve costes
const SARA = 'sara@ejemplo.estook.com'; // camarera: ve la carta, no la toca, sin costes
const LUIS = 'luis@ejemplo.estook.com'; // de Bar Puerto, otra organización

let rosa: string;
let sara: string;
let luis: string;

interface Plato {
  platoId: string;
  nombre: string;
  suplementoCentimos: number;
  soloDelMenu: boolean;
  agotado: boolean;
}
interface Dia {
  fecha: string;
  esHoy: boolean;
  yaPaso: boolean;
  montado: boolean;
  repiteDe: string | null;
  platos: Record<string, Plato[]>;
  loQueDeja?: { estado: string; faltan?: string[] };
}
interface Menu {
  id: string;
  nombre: string;
  clase: string;
  precioCentimos: number | null;
  version: number;
  secciones: { id: string; nombre: string; esPostre: boolean; incluida: boolean }[];
  dias: Dia[];
}
interface MisMenus {
  sirveMenus: boolean | null;
  puedeEditar: boolean;
  verCostes: boolean;
  hoy: string;
  lunes: string;
  menus: Menu[];
}

const carta: Record<string, string> = {};

async function losMenus(token: string, lunes?: string): Promise<MisMenus> {
  return losDatos<MisMenus>(
    await api.consultar(token, 'mis_menus', lunes === undefined ? {} : { lunes }),
  );
}

async function elDelDia(token: string, lunes?: string): Promise<Menu> {
  const menu = (await losMenus(token, lunes)).menus.find((m) => m.clase === 'del_dia');
  if (menu === undefined) throw new Error('sin menú del día');
  return menu;
}

function laSeccion(menu: Menu, nombre: string): string {
  const id = menu.secciones.find((s) => s.nombre === nombre)?.id;
  if (id === undefined) throw new Error(`sin «${nombre}»`);
  return id;
}

function losNombres(dia: Dia | undefined, seccionId: string): string[] {
  return (dia?.platos[seccionId] ?? []).map((p) => p.nombre);
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { ahora: () => ahora });
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  luis = await api.entrar(LUIS);

  const segundos = losDatos<{ seccionId: string }>(
    await api.ejecutar(rosa, 'crear_seccion', { nombre: 'Principales' }),
  ).seccionId;
  const hechos = losDatos<{ creados: { platoId: string; nombre: string }[] }>(
    await api.ejecutar(rosa, 'crear_platos', {
      seccion_id: segundos,
      platos: [
        { nombre: 'Pollo asado', precio_centimos: 1200 },
        { nombre: 'Entrecot', precio_centimos: 2200 },
      ],
    }),
  );
  for (const p of hechos.creados) carta[p.nombre] = p.platoId;
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('¿tu local sirve menús?', () => {
  it('sin contestar, se pregunta, y no hay ninguno', async () => {
    const menus = await losMenus(rosa);
    expect(menus.sirveMenus).toBeNull();
    expect(menus.menus).toEqual([]);
    expect(menus.lunes).toBe(LUNES);
    expect(menus.hoy).toBe(MARTES);
  });

  it('la camarera no lo contesta', async () => {
    expect(elFallo(await api.ejecutar(sara, 'sirve_menus', { sirve: true }))).toBe('sin_permiso');
  });

  it('con sí, nace el menú del día: primeros, segundos y bebida, y el postre apagado', async () => {
    losDatos(await api.ejecutar(rosa, 'sirve_menus', { sirve: true }));
    const menus = await losMenus(rosa);
    expect(menus.sirveMenus).toBe(true);
    const delDia = menus.menus[0];
    expect(delDia?.nombre).toBe('Menú del día');
    expect(delDia?.secciones.map((s) => [s.nombre, s.incluida])).toEqual([
      ['Primeros', true],
      ['Segundos', true],
      ['Postre', false],
      ['Bebida', true],
    ]);
    // De lunes a viernes, y ninguno montado todavía.
    expect(delDia?.dias.map((d) => d.fecha)).toEqual([
      LUNES,
      MARTES,
      MIERCOLES,
      JUEVES,
      '2026-10-23',
    ]);
    expect(delDia?.dias.every((d) => !d.montado && d.repiteDe === null)).toBe(true);
    // Decirlo otra vez no crea otro.
    losDatos(await api.ejecutar(rosa, 'sirve_menus', { sirve: true }));
    expect((await losMenus(rosa)).menus).toHaveLength(1);
  });
});

describe('cada día distinto, y un día sin tocar repite el anterior', () => {
  it('el lunes ya pasó: no se toca', async () => {
    const menu = await elDelDia(rosa);
    const fallo = await api.ejecutar(rosa, 'poner_plato_en_el_menu', {
      menu_id: menu.id,
      fecha: LUNES,
      seccion_id: laSeccion(menu, 'Primeros'),
      nuevo: 'Lentejas',
    });
    expect(elFallo(fallo)).toBe('faltan_datos');
  });

  it('el martes: unas lentejas nuevas de primero y el entrecot con suplemento', async () => {
    const menu = await elDelDia(rosa);
    const lentejas = losDatos<{ platoId: string; nuevo: boolean }>(
      await api.ejecutar(rosa, 'poner_plato_en_el_menu', {
        menu_id: menu.id,
        fecha: MARTES,
        seccion_id: laSeccion(menu, 'Primeros'),
        nuevo: 'Lentejas',
      }),
    );
    expect(lentejas.nuevo).toBe(true);
    carta['Lentejas'] = lentejas.platoId;
    for (const [plato, suplemento] of [
      ['Pollo asado', 0],
      ['Entrecot', 400],
    ] as const) {
      losDatos(
        await api.ejecutar(rosa, 'poner_plato_en_el_menu', {
          menu_id: menu.id,
          fecha: MARTES,
          seccion_id: laSeccion(menu, 'Segundos'),
          plato_id: carta[plato],
          suplemento_centimos: suplemento,
        }),
      );
    }
    // Ponerlo dos veces lo deja como estaba.
    const otraVez = losDatos<{ yaEstaba: boolean }>(
      await api.ejecutar(rosa, 'poner_plato_en_el_menu', {
        menu_id: menu.id,
        fecha: MARTES,
        seccion_id: laSeccion(menu, 'Segundos'),
        plato_id: carta['Pollo asado'],
      }),
    );
    expect(otraVez.yaEstaba).toBe(true);

    const despues = await elDelDia(rosa);
    const martes = despues.dias.find((d) => d.fecha === MARTES);
    expect(martes?.montado).toBe(true);
    expect(losNombres(martes, laSeccion(despues, 'Primeros'))).toEqual(['Lentejas']);
    expect(losNombres(martes, laSeccion(despues, 'Segundos'))).toEqual(['Pollo asado', 'Entrecot']);
    expect(
      martes?.platos[laSeccion(despues, 'Segundos')]?.find((p) => p.nombre === 'Entrecot')
        ?.suplementoCentimos,
    ).toBe(400);
  });

  it('el miércoles y el jueves, sin tocar, repiten el martes; el lunes sigue vacío', async () => {
    const menu = await elDelDia(rosa);
    const miercoles = menu.dias.find((d) => d.fecha === MIERCOLES);
    expect(miercoles?.montado).toBe(false);
    expect(miercoles?.repiteDe).toBe(MARTES);
    expect(losNombres(miercoles, laSeccion(menu, 'Primeros'))).toEqual(['Lentejas']);
    const lunes = menu.dias.find((d) => d.fecha === LUNES);
    expect(lunes?.yaPaso).toBe(true);
    expect(Object.values(lunes?.platos ?? {}).flat()).toEqual([]);
  });

  it('quitar las lentejas el miércoles no las quita del martes, y el jueves repite el miércoles', async () => {
    const menu = await elDelDia(rosa);
    losDatos(
      await api.ejecutar(rosa, 'quitar_plato_del_menu', {
        menu_id: menu.id,
        fecha: MIERCOLES,
        seccion_id: laSeccion(menu, 'Primeros'),
        plato_id: carta['Lentejas'],
      }),
    );
    const despues = await elDelDia(rosa);
    const primeros = laSeccion(despues, 'Primeros');
    expect(losNombres(despues.dias.find((d) => d.fecha === MARTES), primeros)).toEqual(['Lentejas']);
    expect(losNombres(despues.dias.find((d) => d.fecha === MIERCOLES), primeros)).toEqual([]);
    const jueves = despues.dias.find((d) => d.fecha === JUEVES);
    expect(jueves?.repiteDe).toBe(MIERCOLES);
    expect(losNombres(jueves, primeros)).toEqual([]);
    // Los segundos del miércoles siguen: se montó con lo que valía.
    expect(losNombres(despues.dias.find((d) => d.fecha === MIERCOLES), laSeccion(despues, 'Segundos'))).toEqual(
      ['Pollo asado', 'Entrecot'],
    );
  });

  it('copiar la semana pasada en la siguiente: cada día, lo de su día de antes', async () => {
    const menu = await elDelDia(rosa);
    const copia = losDatos<{ dias: string[] }>(
      await api.ejecutar(rosa, 'copiar_la_semana_pasada', { menu_id: menu.id, lunes: '2026-10-26' }),
    );
    expect(copia.dias).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
    const siguiente = await elDelDia(rosa, '2026-10-26');
    const primeros = laSeccion(siguiente, 'Primeros');
    expect(siguiente.dias.map((d) => losNombres(d, primeros))).toEqual([[], ['Lentejas'], [], [], []]);
    expect(siguiente.dias.every((d) => d.montado)).toBe(true);
  });
});

describe('el plato que nace en el menú', () => {
  it('no sale en la carta ni en su equilibrio', async () => {
    const miCarta = losDatos<{ platos: { nombre: string; enLaCarta: boolean }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(miCarta.platos.find((p) => p.nombre === 'Lentejas')?.enLaCarta).toBe(false);
    expect(miCarta.platos.find((p) => p.nombre === 'Entrecot')?.enLaCarta).toBe(true);
  });

  it('escrito en la carta, es el mismo plato y pasa a ella', async () => {
    const hecho = losDatos<{ creados: unknown[]; recuperados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'lentejas', precio_centimos: 900 }],
      }),
    );
    expect(hecho.creados).toEqual([]);
    expect(hecho.recuperados[0]?.platoId).toBe(carta['Lentejas']);
    const miCarta = losDatos<{ platos: { nombre: string; enLaCarta: boolean }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(miCarta.platos.find((p) => p.nombre === 'Lentejas')?.enLaCarta).toBe(true);
  });
});

describe('lo que deja, y quién lo ve', () => {
  it('sin precio lo dice; con precio y sin escandallos, dice cuáles faltan', async () => {
    let menu = await elDelDia(rosa);
    expect(menu.dias.find((d) => d.fecha === MARTES)?.loQueDeja?.estado).toBe('sin_precio');
    losDatos(
      await api.ejecutar(rosa, 'cambiar_menu', {
        menu_id: menu.id,
        version: menu.version,
        precio_centimos: 1350,
      }),
    );
    menu = await elDelDia(rosa);
    expect(menu.precioCentimos).toBe(1350);
    const deja = menu.dias.find((d) => d.fecha === MARTES)?.loQueDeja;
    expect(deja?.estado).toBe('faltan_costes');
    expect(deja?.faltan).toEqual(['Lentejas', 'Pollo asado', 'Entrecot']);
  });

  it('cambiar con una versión vieja no pisa a otro', async () => {
    const menu = await elDelDia(rosa);
    expect(
      elFallo(
        await api.ejecutar(rosa, 'cambiar_menu', {
          menu_id: menu.id,
          version: menu.version - 1,
          precio_centimos: 1500,
        }),
      ),
    ).toBe('lo_cambio_otra_persona');
  });

  it('la camarera ve el menú de hoy, sin un euro, y no lo cambia', async () => {
    const menus = await losMenus(sara);
    expect(menus.puedeEditar).toBe(false);
    expect(menus.verCostes).toBe(false);
    const martes = menus.menus[0]?.dias.find((d) => d.fecha === MARTES);
    expect(martes?.loQueDeja).toBeUndefined();
    expect(Object.values(martes?.platos ?? {}).flat().length).toBeGreaterThan(0);
    const menu = await elDelDia(rosa);
    expect(
      elFallo(
        await api.ejecutar(sara, 'quitar_plato_del_menu', {
          menu_id: menu.id,
          fecha: JUEVES,
          seccion_id: laSeccion(menu, 'Segundos'),
          plato_id: carta['Entrecot'],
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('nadie de otro negocio lo toca, ni sabiendo sus ids', async () => {
    const menu = await elDelDia(rosa);
    const fallo = await api.ejecutar(luis, 'poner_plato_en_el_menu', {
      menu_id: menu.id,
      fecha: JUEVES,
      seccion_id: laSeccion(menu, 'Segundos'),
      plato_id: carta['Entrecot'],
    });
    expect(['no_existe', 'sin_permiso']).toContain(elFallo(fallo));
  });
});

describe('las secciones y el postre', () => {
  it('«¿entra postre?» enciende su sección, y «Postre» se renombra', async () => {
    const menu = await elDelDia(rosa);
    losDatos(
      await api.ejecutar(rosa, 'cambiar_menu', {
        menu_id: menu.id,
        version: menu.version,
        entra_postre: true,
        entra_cafe: true,
      }),
    );
    const despues = await elDelDia(rosa);
    expect(despues.secciones.find((s) => s.esPostre)?.incluida).toBe(true);
  });

  it('una sección nueva, y quitarla si no se ha servido', async () => {
    const menu = await elDelDia(rosa);
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'poner_seccion_de_menu', { menu_id: menu.id, nombre: 'Para picar' }),
    );
    expect(
      elFallo(await api.ejecutar(rosa, 'poner_seccion_de_menu', { menu_id: menu.id, nombre: 'para PICAR' })),
    ).toBe('faltan_datos');
    losDatos(await api.ejecutar(rosa, 'quitar_seccion_de_menu', { seccion_id: seccionId }));
    expect((await elDelDia(rosa)).secciones.map((s) => s.nombre)).not.toContain('Para picar');
  });

  it('otro menú, a un botón; el del día no se archiva', async () => {
    const { menuId } = losDatos<{ menuId: string }>(
      await api.ejecutar(rosa, 'crear_menu', { nombre: 'Menú ejecutivo' }),
    );
    const menus = await losMenus(rosa);
    expect(menus.menus.map((m) => m.nombre)).toEqual(['Menú del día', 'Menú ejecutivo']);
    // El que no es del día no cambia por días: un solo día, hoy.
    expect(menus.menus[1]?.dias.map((d) => d.fecha)).toEqual([MARTES]);
    const delDia = await elDelDia(rosa);
    expect(elFallo(await api.ejecutar(rosa, 'archivar_menu', { menu_id: delDia.id }))).toBe(
      'faltan_datos',
    );
    losDatos(await api.ejecutar(rosa, 'archivar_menu', { menu_id: menuId }));
    expect((await losMenus(rosa)).menus).toHaveLength(1);
  });
});

describe('el cierre de caja', () => {
  it('«Menú del día» sale con su precio, como un plato de la carta', async () => {
    const cierre = losDatos<{
      platosConocidos: { concepto: string; precioUnidadCentimos: number; deLaCarta: boolean }[];
    }>(await api.consultar(rosa, 'un_cierre'));
    expect(cierre.platosConocidos).toContainEqual(
      expect.objectContaining({ concepto: 'Menú del día', precioUnidadCentimos: 1350, deLaCarta: true }),
    );
  });
});
