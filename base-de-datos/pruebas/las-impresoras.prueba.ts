import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenDelAparato } from '@estook/dominio';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, entrarFichando, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **T5 · 1 · Imprimir y el cajón** (decisión 0119; Anexo 6.5, 6.8, 7.5 y 10.6), contra la base:
 *
 *   · las impresoras se dan de alta en la caja, y **su dirección no llega a la pantalla**
 *   · lo de la cocina y la barra sale en papel **solo si trabajan en papel**, un trabajo por
 *     sitio, compuesto por el servidor; y al marchar, «¡Marcha el 2.º!»; y lo quitado, ANULADO
 *   · **la caja recoge su cola con su llave**, sin nadie dentro, con la dirección; lo dado no se
 *     vuelve a dar enseguida, y lo impreso no vuelve
 *   · la cuenta, la prueba y reimprimir; **un comandero no abre el cajón** ni con el gerente
 *   · «Pasar a la app»: la misma caja con otra llave, y la de antes deja de valer
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com';
const SARA = 'sara@ejemplo.estook.com';
const DIRECCION = '192.168.77.31:9100';

let barCentro: string;
let llaveDeLaCaja: string;
let llaveDeLaTablet: string;
let llaveDeOtraTablet: string;
let rosaEnLaTablet: string;
let enLaCaja: string;
let sara: string;
let mesaId: string;
const plato: Record<string, string> = {};
const impresora: Record<string, string> = {};

interface Papel {
  piezas: { tipo: string; texto?: string; izquierda?: string; derecha?: string }[];
}
interface Trabajo {
  id: string;
  tipo: string;
  papel: Papel;
  impresora: { id: string; nombre: string; direccion: string; anchoMm: number };
  reserva: { id: string; direccion: string } | null;
}
interface Cola {
  trabajos: Trabajo[];
  temaAlSegundo: string | null;
  impresoras: { id: string; nombre: string; direccion: string }[];
}

const textos = (p: Papel) =>
  p.piezas.flatMap((x) =>
    x.texto !== undefined
      ? [x.texto]
      : x.izquierda !== undefined
        ? [`${x.izquierda}|${x.derecha}`]
        : [],
  );

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

const laCola = async (llave = llaveDeLaCaja) =>
  losDatos<Cola>(await api.ejecutar(null, 'la_cola_de_la_caja', { llave }));

async function imprimirlo(trabajos: readonly Trabajo[]) {
  return losDatos<{ apuntados: number }>(
    await api.ejecutar(null, 'apuntar_lo_impreso', {
      llave: llaveDeLaCaja,
      trabajos: trabajos.map((t) => ({ id: t.id, salio: true })),
    }),
  );
}

let laAbierta: string | null = null;

/** La mesa 6, otra vez: se libera la de la prueba anterior (una mesa, una cuenta abierta). */
async function abrirLaMesa(personas: number): Promise<string> {
  if (laAbierta !== null) await api.ejecutar(sara, 'liberar_mesa', { cuenta_id: laAbierta });
  const cuenta = crypto.randomUUID();
  losDatos(
    await api.ejecutar(sara, 'abrir_mesa', { cuenta_id: cuenta, mesa_id: mesaId, personas }),
  );
  laAbierta = cuenta;
  return cuenta;
}

async function abrirYPedir(lineas: { id: string; plato: string; pase: number; nota?: string }[]) {
  const cuenta = await abrirLaMesa(4);
  losDatos(
    await api.ejecutar(sara, 'pedir', {
      cuenta_id: cuenta,
      platos: lineas.map((l) => ({
        id: l.id,
        plato_id: plato[l.plato],
        pase: l.pase,
        ...(l.nota === undefined ? {} : { nota: l.nota }),
      })),
    }),
  );
  return cuenta;
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
  llaveDeLaTablet = await vincular('comandero', 'Tablet de la sala');
  sara = await enElAparato(llaveDeLaTablet, SARA);
  // Rosa pide en su propia tablet: entrar en la de Sara la sacaría a ella (un aparato, una persona).
  llaveDeOtraTablet = await vincular('comandero', 'Tablet de Rosa');
  rosaEnLaTablet = await enElAparato(llaveDeOtraTablet, ROSA);

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
  mesaId = losDatos<{ mesaId: string }>(
    await api.ejecutar(enLaCaja, 'crear_mesa', { zona_id: zonaId, nombre: '6', plazas: 4 }),
  ).mesaId;
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('las impresoras, en la caja', () => {
  it('se dan de alta con lo que imprimen, y su dirección no sale en la pantalla', async () => {
    for (const [nombre, imprime, cajon] of [
      ['Cocina', ['cocina'], false],
      ['Caja', ['caja', 'barra'], true],
    ] as const) {
      const lista = losDatos<{ impresoras: { id: string; nombre: string }[] }>(
        await api.ejecutar(enLaCaja, 'guardar_impresora', {
          nombre,
          modelo: 'Epson TM-T20III',
          direccion: DIRECCION,
          imprime,
          tiene_cajon: cajon,
        }),
      );
      impresora[nombre] = lista.impresoras.find((i) => i.nombre === nombre)?.id ?? '';
    }
    const respuesta = await api.consultar(enLaCaja, 'las_impresoras', {});
    const lista = losDatos<{
      impresoras: { nombre: string; deEstaCaja: boolean; laImprime: string }[];
    }>(respuesta);
    expect(lista.impresoras.map((i) => [i.nombre, i.deEstaCaja, i.laImprime])).toEqual([
      ['Cocina', true, 'Caja 1'],
      ['Caja', true, 'Caja 1'],
    ]);
    expect(JSON.stringify(respuesta)).not.toContain('192.168');
  });

  it('dos con el mismo nombre no, y una no es su propia reserva', async () => {
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'guardar_impresora', {
          nombre: 'cocina',
          direccion: DIRECCION,
          imprime: [],
        }),
      ),
    ).toBe('faltan_datos');
    expect(
      elFallo(
        await api.ejecutar(enLaCaja, 'guardar_impresora', {
          impresora_id: impresora['Cocina'],
          nombre: 'Cocina',
          imprime: ['cocina'],
          reserva_id: impresora['Cocina'],
        }),
      ),
    ).toBe('faltan_datos');
    // La de la caja, de reserva de la de cocina.
    losDatos(
      await api.ejecutar(enLaCaja, 'guardar_impresora', {
        impresora_id: impresora['Cocina'],
        nombre: 'Cocina',
        imprime: ['cocina'],
        reserva_id: impresora['Caja'],
      }),
    );
  });

  it('un camarero no las ve ni las toca, y un comandero tampoco', async () => {
    expect(elFallo(await api.consultar(sara, 'las_impresoras', {}))).toBe('sin_permiso');
    expect(
      elFallo(
        await api.ejecutar(rosaEnLaTablet, 'guardar_impresora', {
          nombre: 'Otra',
          direccion: DIRECCION,
          imprime: [],
        }),
      ),
    ).toBe('sin_permiso');
  });
});

describe('lo que sale en papel', () => {
  it('con la cocina en pantalla, mandar no deja nada en la cola', async () => {
    await abrirYPedir([{ id: crypto.randomUUID(), plato: 'Croquetas', pase: 1 }]).then((cuenta) =>
      api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }),
    );
    expect((await laCola()).trabajos).toEqual([]);
  });

  it('con la cocina en las dos, la comanda sale por su impresora, con la mesa, el pase y la nota', async () => {
    const ajustes = losDatos<{ cocinaSaleEn: string; barraSaleEn: string }>(
      await api.ejecutar(enLaCaja, 'guardar_la_cocina_y_la_barra', {
        aviso_min: 10,
        tarde_min: 20,
        suena: true,
        cocina_sale_en: 'las_dos',
        barra_sale_en: 'papel',
      }),
    );
    expect(ajustes).toMatchObject({ cocinaSaleEn: 'las_dos', barraSaleEn: 'papel' });

    const cuenta = await abrirYPedir([
      { id: crypto.randomUUID(), plato: 'Croquetas', pase: 1 },
      { id: crypto.randomUUID(), plato: 'Entrecot', pase: 2, nota: 'poco hecho' },
    ]);
    losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));

    const cola = await laCola();
    expect(cola.trabajos).toHaveLength(1);
    const [comanda] = cola.trabajos;
    expect(comanda?.tipo).toBe('comanda');
    expect(comanda?.impresora).toMatchObject({
      nombre: 'Cocina',
      direccion: DIRECCION,
      anchoMm: 80,
    });
    expect(comanda?.reserva).toMatchObject({ id: impresora['Caja'], direccion: DIRECCION });
    expect(textos(comanda?.papel ?? { piezas: [] })).toEqual(
      expect.arrayContaining([
        'MESA 6',
        '1.º · YA',
        '2.º · EN ESPERA',
        '1  Croquetas',
        '   » poco hecho',
      ]),
    );
    // Ni un importe en la comanda.
    expect(JSON.stringify(comanda?.papel)).not.toMatch(/,\d\d|EUR|€/);

    // Lo dado no se vuelve a dar enseguida; impreso, no vuelve nunca.
    expect((await laCola()).trabajos).toEqual([]);
    expect((await imprimirlo(cola.trabajos)).apuntados).toBe(1);
    expect((await imprimirlo(cola.trabajos)).apuntados).toBe(0);

    // Al marchar, «¡Marcha el 2.º!» con lo que falta de ese pase.
    losDatos(await api.ejecutar(sara, 'marchar', { cuenta_id: cuenta, pase: 2 }));
    const marcha = (await laCola()).trabajos;
    expect(marcha).toHaveLength(1);
    expect(textos(marcha[0]?.papel ?? { piezas: [] })).toEqual(
      expect.arrayContaining(['¡MARCHA EL 2.º!', '1  Entrecot', '   » poco hecho']),
    );
    await imprimirlo(marcha);
  });

  it('lo de la barra sale aparte, por la impresora que imprime la barra', async () => {
    const { seccionId } = losDatos<{ seccionId: string }>(
      await api.ejecutar(await api.entrar(ROSA), 'crear_seccion', { nombre: 'Bebidas' }),
    );
    const hechos = losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(await api.entrar(ROSA), 'crear_platos', {
        seccion_id: seccionId,
        platos: [{ nombre: 'Caña', precio_centimos: 220 }],
      }),
    );
    const cana = hechos.creados[0]?.platoId ?? '';
    const cuenta = await abrirLaMesa(2);
    losDatos(
      await api.ejecutar(sara, 'pedir', {
        cuenta_id: cuenta,
        platos: [
          { id: crypto.randomUUID(), plato_id: cana, cantidad: 2, destino: 'barra' },
          { id: crypto.randomUUID(), plato_id: plato['Croquetas'], pase: 1 },
        ],
      }),
    );
    losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));
    const cola = (await laCola()).trabajos;
    // Dos papeles, cada uno por su impresora y con lo suyo (Anexo 6.5).
    const porSitio = new Map(cola.map((t) => [textos(t.papel)[0]?.split(' · ')[0], t]));
    expect([...porSitio.keys()].sort()).toEqual(['BARRA', 'COCINA']);
    expect(porSitio.get('BARRA')?.impresora.nombre).toBe('Caja');
    expect(textos(porSitio.get('BARRA')?.papel ?? { piezas: [] })).toContain('2  Caña');
    expect(textos(porSitio.get('BARRA')?.papel ?? { piezas: [] }).join(' ')).not.toContain(
      'Croquetas',
    );
    expect(porSitio.get('COCINA')?.impresora.nombre).toBe('Cocina');
    await imprimirlo(cola);
  });

  it('quitar lo que ya está en cocina sale ANULADO, con su motivo', async () => {
    const croquetas = crypto.randomUUID();
    const cuenta = await abrirYPedir([{ id: croquetas, plato: 'Croquetas', pase: 1 }]);
    losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));
    await imprimirlo((await laCola()).trabajos);
    losDatos(
      await api.ejecutar(rosaEnLaTablet, 'quitar_plato', {
        linea_id: croquetas,
        motivo: 'se equivocó de mesa',
      }),
    );
    const anulado = (await laCola()).trabajos;
    expect(anulado).toHaveLength(1);
    expect(textos(anulado[0]?.papel ?? { piezas: [] })).toEqual(
      expect.arrayContaining(['ANULADO', 'Motivo: se equivocó de mesa', 'Lo quita Rosa']),
    );
    await imprimirlo(anulado);
  });

  it('la cuenta sale por la de la caja, con el total y que no es una factura', async () => {
    const cuenta = await abrirYPedir([
      { id: crypto.randomUUID(), plato: 'Croquetas', pase: 1 },
      { id: crypto.randomUUID(), plato: 'Entrecot', pase: 2 },
    ]);
    losDatos(await api.ejecutar(sara, 'imprimir_la_cuenta', { cuenta_id: cuenta }));
    const cola = (await laCola()).trabajos;
    expect(cola).toHaveLength(1);
    expect(cola[0]).toMatchObject({ tipo: 'precuenta', impresora: { nombre: 'Caja' } });
    expect(textos(cola[0]?.papel ?? { piezas: [] })).toEqual(
      expect.arrayContaining(['PRECUENTA', 'TOTAL|31,00 EUR', 'Documento no válido como factura']),
    );
    await imprimirlo(cola);
  });

  it('reimprimir la comanda sale marcado COPIA', async () => {
    const cuenta = await abrirYPedir([{ id: crypto.randomUUID(), plato: 'Croquetas', pase: 1 }]);
    losDatos(await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }));
    await imprimirlo((await laCola()).trabajos);
    losDatos(await api.ejecutar(sara, 'reimprimir_la_comanda', { cuenta_id: cuenta }));
    const copia = (await laCola()).trabajos;
    expect(textos(copia[0]?.papel ?? { piezas: [] })).toContain(' COPIA ');
    await imprimirlo(copia);
  });
});

describe('la caja, con su llave', () => {
  it('una llave de comandero no recoge la cola', async () => {
    expect(
      elFallo(await api.ejecutar(null, 'la_cola_de_la_caja', { llave: llaveDeLaTablet })),
    ).toBe('sin_permiso');
  });

  it('lo que no sale vuelve a la cola, y sin papel la sala lo ve', async () => {
    losDatos(
      await api.ejecutar(enLaCaja, 'imprimir_prueba', { impresora_id: impresora['Cocina'] }),
    );
    const cola = (await laCola()).trabajos;
    expect(cola.map((t) => t.tipo)).toEqual(['prueba']);
    losDatos(
      await api.ejecutar(null, 'apuntar_lo_impreso', {
        llave: llaveDeLaCaja,
        trabajos: [{ id: cola[0]?.id, salio: false, error: 'Sin papel' }],
        impresoras: [{ id: impresora['Cocina'], estado: 'sin_papel' }],
      }),
    );
    // Vuelve a estar pendiente: la siguiente vuelta lo da otra vez.
    expect((await laCola()).trabajos.map((t) => t.id)).toEqual([cola[0]?.id]);
    const como = losDatos<{ cocinaSaleEn: string; avisos: { impresora: string; que: string }[] }>(
      await api.consultar(sara, 'como_estan_las_impresoras', {}),
    );
    expect(como.cocinaSaleEn).toBe('las_dos');
    expect(como.avisos).toContainEqual(
      expect.objectContaining({ impresora: 'Cocina', que: 'sin_papel' }),
    );
    await imprimirlo((await laCola(llaveDeLaCaja)).trabajos);
    losDatos(
      await api.ejecutar(null, 'apuntar_lo_impreso', {
        llave: llaveDeLaCaja,
        trabajos: [],
        impresoras: [{ id: impresora['Cocina'], estado: 'lista' }],
      }),
    );
  });
});

describe('el cajón', () => {
  it('lo abre en la caja quien puede, con motivo; queda en la auditoría', async () => {
    const hecho = losDatos<{ trabajoId: string }>(
      await api.ejecutar(enLaCaja, 'abrir_el_cajon', { motivo: 'cambiar un billete' }),
    );
    const cola = (await laCola()).trabajos;
    expect(cola).toEqual([expect.objectContaining({ id: hecho.trabajoId, tipo: 'cajon' })]);
    expect(cola[0]?.papel.piezas).toEqual([{ tipo: 'cajon' }]);
    await imprimirlo(cola);
    const { rows } = await base.bd.query<{ accion: string }>(
      `select accion from estook.auditoria where accion = 'abrir_el_cajon'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('un comandero no abre el cajón ni con el PIN del gerente, ni un camarero en la caja', async () => {
    expect(
      elFallo(await api.ejecutar(rosaEnLaTablet, 'abrir_el_cajon', { motivo: 'probar' })),
    ).toBe('sin_permiso');
    const saraEnLaCaja = await enElAparato(llaveDeLaCaja, SARA);
    expect(elFallo(await api.ejecutar(saraEnLaCaja, 'abrir_el_cajon', { motivo: 'probar' }))).toBe(
      'sin_permiso',
    );
    // Y Rosa vuelve a la caja.
    enLaCaja = await enElAparato(llaveDeLaCaja, ROSA);
  });
});

describe('la caja de centro (T5 · 2 · 2, 0123)', () => {
  interface ConCentro {
    elCentro: {
      caja: string;
      aparatos: string[];
      cocinaSaleEn: string;
      barraSaleEn: string;
      impresoras: { direccion: string; anchoMm: number; imprime: string[] }[];
    };
  }

  it('la cola le da a la caja lo que necesita sin internet: los aparatos del local y a qué impresora va cada cosa', async () => {
    const { elCentro } = losDatos<ConCentro>(
      await api.ejecutar(null, 'la_cola_de_la_caja', { llave: llaveDeLaCaja }),
    );
    expect(elCentro.aparatos).toHaveLength(2);
    expect(elCentro.aparatos).not.toContain(elCentro.caja);
    expect(elCentro.cocinaSaleEn).toBe('las_dos');
    expect(elCentro.impresoras.find((i) => i.imprime.includes('cocina'))?.direccion).toBe(
      DIRECCION,
    );
  });

  it('lo mandado sin internet que ya imprimió la caja sube sin otro papel, con la hora a la que llegó a cocina', async () => {
    const cuenta = await abrirYPedir([{ id: crypto.randomUUID(), plato: 'Croquetas', pase: 1 }]);
    const antes = Date.now();
    losDatos(
      await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }, crypto.randomUUID(), {
        hechoHaceMs: 10 * 60_000,
        porLaCaja: true,
      }),
    );
    expect((await laCola()).trabajos).toEqual([]);
    const { rows } = await base.bd.query<{ mandada_en: Date }>(
      `select mandada_en from estook.linea_de_cuenta where cuenta_id = $1`,
      [cuenta],
    );
    const llego = new Date(rows[0]?.mandada_en ?? 0).getTime();
    expect(antes - llego).toBeGreaterThan(9 * 60_000);
    expect(antes - llego).toBeLessThan(11 * 60_000);
  });

  it('lo mandado sin internet que no pasó por la caja sí sale en papel al subir', async () => {
    await imprimirlo((await laCola()).trabajos);
    const cuenta = await abrirYPedir([{ id: crypto.randomUUID(), plato: 'Croquetas', pase: 1 }]);
    losDatos(
      await api.ejecutar(sara, 'mandar_a_cocina', { cuenta_id: cuenta }, crypto.randomUUID(), {
        hechoHaceMs: 60_000,
      }),
    );
    const cola = (await laCola()).trabajos;
    expect(cola).toHaveLength(1);
    await imprimirlo(cola);
  });
});

describe('«Pasar a la app»', () => {
  it('la misma caja con otra llave: la de antes deja de valer, y sus impresoras siguen', async () => {
    const { codigo } = losDatos<{ codigo: string }>(
      await api.ejecutar(enLaCaja, 'sacar_codigo_para_pasar_a_la_app', {}),
    );
    const nueva = losDatos<{ llave: string; aparato: { nombre: string } }>(
      await api.ejecutar(null, 'vincular_con_codigo', { codigo }),
    );
    expect(nueva.aparato.nombre).toBe('Caja 1');
    expect(elFallo(await api.ejecutar(null, 'la_cola_de_la_caja', { llave: llaveDeLaCaja }))).toBe(
      'aparato_retirado',
    );
    const cola = await laCola(nueva.llave);
    expect(cola.impresoras.map((i) => i.nombre)).toEqual(['Cocina', 'Caja']);
    const { rows } = await base.bd.query<{ cuantas: number }>(
      `select count(*)::int as cuantas from estook.terminal
        where local_id = $1 and funcion = 'caja' and retirado_en is null`,
      [barCentro],
    );
    expect(rows[0]?.cuantas).toBe(1);
  });
});
