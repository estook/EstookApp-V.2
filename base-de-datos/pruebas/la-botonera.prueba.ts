import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loQueProponeElNombre, tokenDelAparato } from '@estook/dominio';
import { levantarBase, migraciones, reversiones, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T3 · La botonera de Estook TPV** (decisión 0111, migración 0086), contra una base de
 * verdad: las pruebas del Anexo 11.15 de los productos y de «¿Quién lo prepara?».
 *
 *   · sin montar, el TPV vende la carta por secciones, con lo que propone su nombre
 *   · «Traer toda la carta»: una página por sección, y **lo nuevo de la carta entra solo**,
 *     también si lo pone quien no tiene los Ajustes del TPV
 *   · **quién lo prepara manda a dónde va**: la barra, la cocina o nadie (el pan)
 *   · sin «entra solo», lo nuevo sale en «Nuevos en la carta», y lo que no tiene botón no se
 *     vende en el TPV
 *   · **un producto nuevo nace en la carta**, en la sección de su página, sin escandallo
 *   · «Lo más pedido»: lo fijado y lo más vendido a esta hora
 *   · quién la monta: la camarera no; el móvil de nadie tampoco; ni Estook con su sesión
 *   · la tabla de lo que se propone por el nombre, igual en la base que en el dominio
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const SARA = 'sara@ejemplo.estook.com'; // camarera

let barCentro: string;
let llaveDeLaCaja: string;
let llaveDelMovil: string;
let rosa: string; // Rosa, en Estook
const seccion: Record<string, string> = {};
const plato: Record<string, string> = {};

async function enElAparato(llave: string, correo: string): Promise<string> {
  const dentro = losDatos<{ turno: string }>(
    await api.ejecutar(null, 'entrar_con_pin', { llave, pin: base.pinDe(correo, 'bar-centro') }),
  );
  return tokenDelAparato(dentro.turno, llave);
}

interface LaCarta {
  montada: boolean;
  paginas: {
    id: string;
    nombre: string;
    pase: string;
    platos: { id: string; nombre: string; quienLoPrepara: string; pase: string }[];
  }[];
  loMasPedido: { id: string; nombre: string }[];
}

interface Botonera {
  camino: string | null;
  entraSolo: boolean;
  paginas: {
    id: string;
    nombre: string;
    quienLoPrepara: string;
    pase: string;
    deLaSeccion: string | null;
    botones: { botonId: string; platoId: string; nombre: string; quienLoPrepara: string | null }[];
  }[];
  nuevosEnLaCarta: { id: string; nombre: string; seccion: string | null }[];
  puedeCrearProductos: boolean;
}

const laCarta = async (token: string) =>
  losDatos<LaCarta>(await api.consultar(token, 'la_carta_de_la_sala'));
const laBotonera = async (token: string) =>
  losDatos<Botonera>(await api.consultar(token, 'la_botonera'));

async function crearPlatos(nombreDeLaSeccion: string, platos: [string, number][]) {
  seccion[nombreDeLaSeccion] ??= losDatos<{ seccionId: string }>(
    await api.ejecutar(rosa, 'crear_seccion', { nombre: nombreDeLaSeccion }),
  ).seccionId;
  const hechos = losDatos<{ creados: { platoId: string; nombre: string }[] }>(
    await api.ejecutar(rosa, 'crear_platos', {
      seccion_id: seccion[nombreDeLaSeccion],
      platos: platos.map(([nombre, precio_centimos]) => ({ nombre, precio_centimos })),
    }),
  );
  for (const p of hechos.creados) plato[p.nombre] = p.platoId;
}

/** Abre una cuenta en barra, pide y dice a dónde fue cada cosa, por orden de nombre. */
async function pedirYVer(token: string, platos: string[]) {
  const cuenta = crypto.randomUUID();
  losDatos(await api.ejecutar(token, 'abrir_mesa', { cuenta_id: cuenta, tipo: 'barra' }));
  losDatos(
    await api.ejecutar(token, 'pedir', {
      cuenta_id: cuenta,
      platos: platos.map((nombre) => ({ id: crypto.randomUUID(), plato_id: plato[nombre] })),
    }),
  );
  const mesa = losDatos<{ platos: { nombre: string; destino: string }[] }>(
    await api.consultar(token, 'la_mesa', { cuenta_id: cuenta }),
  );
  return {
    cuenta,
    destinos: mesa.platos
      .map((p) => [p.nombre, p.destino])
      .sort((a, b) => (a[0] ?? '').localeCompare(b[0] ?? '')),
  };
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  barCentro = await base.localPorCodigo('bar-centro');
  // Vincular con el correo cierra esa sesión (0108): Rosa vuelve a entrar en Estook después.
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
  const saraId = await base.personaPorCorreo(SARA);
  llaveDelMovil = losDatos<{ llave: string }>(
    await api.ejecutar(null, 'vincular_con_codigo', {
      codigo: losDatos<{ codigo: string }>(
        await api.ejecutar(enLaCaja, 'sacar_codigo_para_vincular', {
          funcion: 'comandero',
          nombre: 'Móvil de Sara',
          persona_id: saraId,
        }),
      ).codigo,
    }),
  ).llave;
  await crearPlatos('Entrantes', [
    ['Croquetas', 900],
    ['Pan', 150],
  ]);
  await crearPlatos('Principales', [['Entrecot', 2200]]);
  await crearPlatos('Refrescos', [['Coca-Cola', 250]]);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('sin montar', () => {
  it('el TPV vende la carta por secciones, con lo que propone su nombre', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    expect((await laBotonera(enLaCaja)).camino).toBeNull();
    const carta = await laCarta(enLaCaja);
    expect(carta.montada).toBe(false);
    expect(carta.paginas.map((g) => [g.nombre, g.pase])).toEqual([
      ['Entrantes', '1'],
      ['Principales', '2'],
      ['Refrescos', 'bebidas'],
    ]);
    expect((await pedirYVer(enLaCaja, ['Coca-Cola', 'Croquetas'])).destinos).toEqual([
      ['Coca-Cola', 'barra'],
      ['Croquetas', 'cocina'],
    ]);
  });
});

describe('«Traer toda la carta»', () => {
  it('una página por sección, en su orden, con las dos preguntas propuestas', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    expect(
      losDatos(await api.ejecutar(enLaCaja, 'montar_la_botonera', { camino: 'toda_la_carta' })),
    ).toEqual({ paginas: 3, botones: 4 });
    const botonera = await laBotonera(enLaCaja);
    expect(botonera).toMatchObject({ camino: 'toda_la_carta', entraSolo: true });
    expect(
      botonera.paginas.map((g) => [g.nombre, g.quienLoPrepara, g.pase, g.botones.length]),
    ).toEqual([
      ['Entrantes', 'cocina', '1', 2],
      ['Principales', 'cocina', '2', 1],
      ['Refrescos', 'barra', 'bebidas', 1],
    ]);
    expect((await laCarta(enLaCaja)).montada).toBe(true);
    // Montarla otra vez no repite nada.
    expect(
      losDatos(await api.ejecutar(enLaCaja, 'montar_la_botonera', { camino: 'toda_la_carta' })),
    ).toEqual({ paginas: 0, botones: 0 });
  });

  it('lo nuevo de la carta entra solo en su página, y una sección nueva trae su página', async () => {
    await crearPlatos('Entrantes', [['Gilda', 300]]);
    await crearPlatos('Postres', [['Tarta de queso', 550]]);
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const botonera = await laBotonera(enLaCaja);
    expect(
      botonera.paginas.find((g) => g.nombre === 'Entrantes')?.botones.map((b) => b.nombre),
    ).toEqual(['Croquetas', 'Pan', 'Gilda']);
    expect(botonera.paginas.find((g) => g.nombre === 'Postres')).toMatchObject({
      quienLoPrepara: 'cocina',
      pase: 'postre',
      deLaSeccion: 'Postres',
    });
    expect(botonera.nuevosEnLaCarta).toEqual([]);
  });

  it('entra solo también si lo pone quien toca la carta sin los Ajustes del TPV', async () => {
    // Luis lleva la cocina del Bar Puerto: cambia la carta, pero no los Ajustes del TPV. La
    // página y su botón los pone la base, con su privilegio.
    const barPuerto = await base.localPorCodigo('bar-puerto');
    await base.bd.query(
      `update estook.local set botonera_camino = 'toda_la_carta', botonera_entra_solo = true where id = $1`,
      [barPuerto],
    );
    const luis = await api.entrar('luis@ejemplo.estook.com');
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(luis, 'crear_seccion', { nombre: 'Cervezas' }),
    );
    losDatos(
      await api.ejecutar(luis, 'crear_platos', {
        seccion_id: seccionId,
        platos: [{ nombre: 'Caña', precio_centimos: 200 }],
      }),
    );
    const { rows } = await base.bd.query<{ pagina: string; quien: string; plato: string }>(
      `select g.nombre as pagina, g.quien_lo_prepara as quien, p.nombre as plato
         from estook.boton_del_tpv b
         join estook.pagina_del_tpv g on g.id = b.pagina_id
         join estook.plato p on p.id = b.plato_id
        where b.local_id = $1`,
      [barPuerto],
    );
    expect(rows).toEqual([{ pagina: 'Cervezas', quien: 'barra', plato: 'Caña' }]);
  });
});

describe('quién lo prepara manda a dónde va', () => {
  it('la barra, la cocina o nadie: el pan, en Entrantes, de «Nadie»', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const entrantes = (await laBotonera(enLaCaja)).paginas.find((g) => g.nombre === 'Entrantes');
    const pan = entrantes?.botones.find((b) => b.nombre === 'Pan');
    losDatos(
      await api.ejecutar(enLaCaja, 'cambiar_boton_del_tpv', {
        boton_id: pan?.botonId,
        quien_lo_prepara: 'nadie',
      }),
    );
    expect(
      (await laCarta(enLaCaja)).paginas[0]?.platos.find((p) => p.nombre === 'Pan'),
    ).toMatchObject({ quienLoPrepara: 'nadie', pase: '1' });
    expect((await pedirYVer(enLaCaja, ['Pan', 'Croquetas', 'Coca-Cola'])).destinos).toEqual([
      ['Coca-Cola', 'barra'],
      ['Croquetas', 'cocina'],
      ['Pan', 'ninguno'],
    ]);
    // Mandado, el pan no sale en ninguna pantalla, y con la barra sin pantalla la mesa no se
    // queda esperando: no hay nada que marchar.
    const { cuenta } = await pedirYVer(enLaCaja, ['Pan', 'Coca-Cola']);
    expect(
      losDatos(await api.ejecutar(enLaCaja, 'mandar_a_cocina', { cuenta_id: cuenta })),
    ).toMatchObject({ aCocina: 0, aLaBarra: 1, talCual: 1 });
    const mesa = losDatos<{ loSiguiente: { que: string } }>(
      await api.consultar(enLaCaja, 'la_mesa', { cuenta_id: cuenta }),
    );
    expect(mesa.loSiguiente.que).not.toBe('marchar');
    expect(JSON.stringify(losDatos(await api.consultar(enLaCaja, 'la_cocina')))).not.toContain(
      'Pan',
    );
    // Los refrescos, si los saca la cocina (un local sin barra): la página entera cambia.
    const refrescos = (await laBotonera(enLaCaja)).paginas.find((g) => g.nombre === 'Refrescos');
    losDatos(
      await api.ejecutar(enLaCaja, 'cambiar_pagina_del_tpv', {
        pagina_id: refrescos?.id,
        quien_lo_prepara: 'cocina',
      }),
    );
    expect((await pedirYVer(enLaCaja, ['Coca-Cola'])).destinos).toEqual([['Coca-Cola', 'cocina']]);
    losDatos(
      await api.ejecutar(enLaCaja, 'cambiar_pagina_del_tpv', {
        pagina_id: refrescos?.id,
        quien_lo_prepara: 'barra',
      }),
    );
  });
});

describe('«Elegir lo que se vende aquí»', () => {
  it('lo nuevo no entra solo: sale en «Nuevos en la carta», no se vende hasta añadirlo, y se añade de un toque', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    // Cambiar de camino no quita lo que ya hay: solo deja de entrar lo nuevo.
    expect(
      losDatos(
        await api.ejecutar(enLaCaja, 'montar_la_botonera', {
          camino: 'elegir',
          plato_ids: [plato['Croquetas']],
        }),
      ),
    ).toEqual({ paginas: 0, botones: 0 });
    expect(await laBotonera(enLaCaja)).toMatchObject({ camino: 'elegir', entraSolo: false });
    await crearPlatos('Principales', [['Merluza', 2100]]);
    const botonera = await laBotonera(enLaCaja);
    expect(botonera.nuevosEnLaCarta.map((p) => [p.nombre, p.seccion])).toEqual([
      ['Merluza', 'Principales'],
    ]);
    // Sin botón, no se vende en el TPV.
    const cuenta = crypto.randomUUID();
    losDatos(await api.ejecutar(enLaCaja, 'abrir_mesa', { cuenta_id: cuenta, tipo: 'barra' }));
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'pedir', {
          cuenta_id: cuenta,
          platos: [{ id: crypto.randomUUID(), plato_id: plato['Merluza'] }],
        }),
      ),
    ).toBe('no_existe');
    expect(
      losDatos(
        await api.ejecutar(enLaCaja, 'traer_de_la_carta', { plato_ids: [plato['Merluza']] }),
      ),
    ).toEqual({ paginas: 0, botones: 1 });
    expect((await laBotonera(enLaCaja)).nuevosEnLaCarta).toEqual([]);
    losDatos(await api.ejecutar(enLaCaja, 'lo_nuevo_entra_solo', { si: true }));
  });
});

describe('«Empezar de cero»: un producto nuevo', () => {
  it('nace en la carta, en la sección que se llama como su página, sin escandallo', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const { paginaId } = losDatos<{ paginaId: string }>(
      await api.ejecutar(enLaCaja, 'crear_pagina_del_tpv', { nombre: 'Del día' }),
    );
    const { platoId } = losDatos<{ platoId: string }>(
      await api.ejecutar(enLaCaja, 'nuevo_producto_del_tpv', {
        nombre: 'Tortilla de patatas',
        precio_centimos: 800,
        pagina_id: paginaId,
      }),
    );
    const carta = losDatos<{
      secciones: { id: string; nombre: string }[];
      platos: {
        id: string;
        seccionId: string | null;
        precioCentimos: number;
        tieneFicha: boolean;
      }[];
    }>(await api.consultar(rosa, 'mi_carta'));
    const enLaCarta = carta.platos.find((p) => p.id === platoId);
    expect(carta.secciones.find((s) => s.id === enLaCarta?.seccionId)?.nombre).toBe('Del día');
    expect(enLaCarta).toMatchObject({ precioCentimos: 800, tieneFicha: false });
    const pagina = (await laBotonera(enLaCaja)).paginas.find((g) => g.id === paginaId);
    expect(pagina).toMatchObject({ deLaSeccion: 'Del día' });
    // Una sola vez: el que entra solo y el del TPV son el mismo botón.
    expect(pagina?.botones.map((b) => b.nombre)).toEqual(['Tortilla de patatas']);
    // Y se vende, a la cocina, que es lo de su página.
    plato['Tortilla de patatas'] = platoId;
    expect((await pedirYVer(enLaCaja, ['Tortilla de patatas'])).destinos).toEqual([
      ['Tortilla de patatas', 'cocina'],
    ]);
    // Dos con el mismo nombre, no.
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'nuevo_producto_del_tpv', {
          nombre: 'tortilla de patatas',
          precio_centimos: 800,
          pagina_id: paginaId,
        }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('«Lo más pedido»', () => {
  it('lo fijado primero, y después lo más vendido a esta hora', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    // Arriba se han pedido dos croquetas y cuatro Coca-Colas; ahora, tres croquetas más.
    await pedirYVer(enLaCaja, ['Croquetas', 'Croquetas', 'Croquetas']);
    const carta = await laCarta(enLaCaja);
    expect(carta.loMasPedido.slice(0, 2).map((p) => p.nombre)).toEqual(['Croquetas', 'Coca-Cola']);
    const tarta = (await laBotonera(enLaCaja)).paginas
      .flatMap((g) => g.botones)
      .find((b) => b.nombre === 'Tarta de queso');
    losDatos(
      await api.ejecutar(enLaCaja, 'cambiar_boton_del_tpv', {
        boton_id: tarta?.botonId,
        fijado: true,
      }),
    );
    expect((await laCarta(enLaCaja)).loMasPedido[0]?.nombre).toBe('Tarta de queso');
  });
});

describe('quién monta la botonera', () => {
  it('la camarera no; el móvil de nadie tampoco; ni Estook con su sesión', async () => {
    const sara = await enElAparato(llaveDelMovil, SARA);
    expect(elFallo(await api.consultar(sara, 'la_botonera'))).toBe('sin_permiso');
    expect(elFallo(await api.ejecutar(sara, 'crear_pagina_del_tpv', { nombre: 'Mía' }))).toBe(
      'sin_permiso',
    );
    expect(
      elFallo(await api.ejecutar(rosa, 'crear_pagina_del_tpv', { nombre: 'Desde Estook' })),
    ).toBe('sin_permiso');
    // Pero la camarera vende lo de la botonera: la carta de la sala sí la lee.
    expect((await laCarta(sara)).montada).toBe(true);
  });
});

describe('ordenar, poner y quitar', () => {
  it('las páginas y los botones se ordenan; se pone de la carta; quitar no toca la carta', async () => {
    const enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
    const antes = await laBotonera(enLaCaja);
    const ids = antes.paginas.map((g) => g.id);
    const alReves = [...ids].reverse();
    losDatos(await api.ejecutar(enLaCaja, 'ordenar_las_paginas_del_tpv', { paginas: alReves }));
    expect((await laBotonera(enLaCaja)).paginas.map((g) => g.id)).toEqual(alReves);
    losDatos(await api.ejecutar(enLaCaja, 'ordenar_las_paginas_del_tpv', { paginas: ids }));

    const entrantes = antes.paginas.find((g) => g.nombre === 'Entrantes');
    const botones = entrantes?.botones.map((b) => b.botonId) ?? [];
    losDatos(
      await api.ejecutar(enLaCaja, 'ordenar_los_botones', {
        pagina_id: entrantes?.id,
        botones: [...botones].reverse(),
      }),
    );
    expect(
      (await laBotonera(enLaCaja)).paginas
        .find((g) => g.nombre === 'Entrantes')
        ?.botones.map((b) => b.botonId),
    ).toEqual([...botones].reverse());

    // El entrecot, también en «Del día»: un plato puede estar en dos páginas.
    const delDia = antes.paginas.find((g) => g.nombre === 'Del día');
    expect(
      losDatos(
        await api.ejecutar(enLaCaja, 'poner_botones', {
          pagina_id: delDia?.id,
          plato_ids: [plato['Entrecot'], plato['Entrecot']],
        }),
      ),
    ).toEqual({ puestos: 1 });

    // Quitar la página se lleva sus botones, y los platos siguen en la carta.
    expect(
      losDatos(await api.ejecutar(enLaCaja, 'quitar_pagina_del_tpv', { pagina_id: delDia?.id })),
    ).toEqual({ quitados: 2 });
    const carta = losDatos<{ platos: { nombre: string; activo: boolean }[] }>(
      await api.consultar(rosa, 'mi_carta'),
    );
    expect(carta.platos.find((p) => p.nombre === 'Tortilla de patatas')?.activo).toBe(true);
    expect((await laBotonera(enLaCaja)).paginas.some((g) => g.nombre === 'Del día')).toBe(false);
  });
});

describe('lo que se propone por el nombre', () => {
  it('la base y el dominio dicen lo mismo', async () => {
    const nombres = [
      'Bebidas',
      'Refrescos',
      'Cervezas',
      'Vinos',
      'Cavas',
      'Cafés',
      'Infusiones',
      'Copas',
      'Cócteles',
      'Licores',
      'Aguas',
      'Entrantes',
      'Para picar',
      'Tapas',
      'Raciones',
      'Ensaladas',
      'Primeros',
      'Sopas',
      'Para compartir',
      'Principales',
      'Segundos',
      'Carnes',
      'Pescados',
      'Arroces',
      'Pizzas',
      'Hamburguesas',
      'Postres',
      'Dulces',
      'Del chef',
      'Postres y cafés',
      'Vino dulce',
    ];
    for (const nombre of nombres) {
      const { rows } = await base.bd.query<{ quien_lo_prepara: string; pase: string }>(
        'select * from estook.lo_que_propone_el_nombre($1)',
        [nombre],
      );
      const propone = loQueProponeElNombre(nombre);
      expect(rows[0], nombre).toEqual({
        quien_lo_prepara: propone.quienLoPrepara,
        pase: propone.pase,
      });
    }
  });
});

describe('lo que ya había, al migrar', () => {
  it('lo marcado «de bebidas» pasa a Barra y Bebidas sin tocar nada, y «Es de bebidas» se va', async () => {
    // Se deshace la 0086, se marca de bebidas una sección cuyo nombre no lo dice, y se vuelve a
    // aplicar: es lo que pasa en un local de verdad al migrar.
    const deshacer = (await reversiones()).find((m) => m.nombre.startsWith('0086'));
    const hacer = (await migraciones()).find((m) => m.nombre.startsWith('0086'));
    if (deshacer === undefined || hacer === undefined) throw new Error('Sin la 0086');
    await base.bd.exec(deshacer.sql);
    const { rows } = await base.bd.query<{ id: string }>(
      `insert into estook.seccion_de_carta (local_id, nombre, orden, es_bebida)
       values ($1, 'Lo de la casa', 99, true) returning id`,
      [barCentro],
    );
    await base.bd.query(
      `insert into estook.plato (local_id, seccion_id, nombre, precio_centimos) values ($1, $2, 'Vermú de grifo', 300)`,
      [barCentro, rows[0]?.id],
    );
    await base.bd.exec(hacer.sql);
    const paginas = await base.bd.query<{ nombre: string; quien_lo_prepara: string; pase: string }>(
      `select nombre, quien_lo_prepara, pase from estook.pagina_del_tpv
        where local_id = $1 and nombre in ('Lo de la casa', 'Entrantes') order by nombre`,
      [barCentro],
    );
    expect(paginas.rows).toEqual([
      { nombre: 'Entrantes', quien_lo_prepara: 'cocina', pase: '1' },
      { nombre: 'Lo de la casa', quien_lo_prepara: 'barra', pase: 'bebidas' },
    ]);
    const camino = await base.bd.query<{ botonera_camino: string; botonera_entra_solo: boolean }>(
      'select botonera_camino, botonera_entra_solo from estook.local where id = $1',
      [barCentro],
    );
    expect(camino.rows[0]).toEqual({ botonera_camino: 'toda_la_carta', botonera_entra_solo: true });
    const columna = await base.bd.query(
      `select 1 from information_schema.columns
        where table_schema = 'estook' and table_name = 'seccion_de_carta' and column_name = 'es_bebida'`,
    );
    expect(columna.rows).toEqual([]);
  });
});
