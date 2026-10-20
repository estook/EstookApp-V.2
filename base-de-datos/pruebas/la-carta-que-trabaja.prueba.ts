import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { modeloDeMentira } from '../../servidor/ia/modelo.ts';
import { movilDeMentira } from '../../servidor/infraestructura/movil.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M10 · 1 · La carta que trabaja (decisión 0102, migración 0078), contra una base de
 * verdad y como cada persona:
 *
 *   · **agotados**: los marcan sala y cocina, vuelven solos al acabar la jornada, avisan
 *     al equipo una vez y solo suenan a quien está trabajando; nadie de fuera los toca
 *   · **el precio del cierre** sale de la carta
 *   · **leer tu carta**: una carta con dos precios cambiados propone exactamente esos dos
 *   · **el equilibrio**: una sección descompensada a propósito se dice
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const movil = movilDeMentira();
const modelo = modeloDeMentira();

/** Lunes 5-oct-2026 a las 22:00 en Madrid: el pulpo se acaba en mitad del servicio. */
let ahora = new Date('2026-10-05T20:00:00Z');

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: edita la carta
const SARA = 'sara@ejemplo.estook.com'; // camarera: ve la carta y marca agotados
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero: sin Carta, marca agotados
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let sara: string;
let marcos: string;
let luis: string;

const platos: Record<string, string> = {};

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { movil, fogon: modelo, ahora: () => ahora });
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  marcos = await api.entrar(MARCOS);
  luis = await api.entrar(LUIS);

  const entrantes = losDatos<{ seccionId: string }>(
    await api.ejecutar(rosa, 'crear_seccion', { nombre: 'Entrantes' }),
  ).seccionId;
  const hechos = losDatos<{ creados: { platoId: string; nombre: string }[] }>(
    await api.ejecutar(rosa, 'crear_platos', {
      seccion_id: entrantes,
      platos: [
        { nombre: 'Pulpo a la gallega', precio_centimos: 1400 },
        { nombre: 'Croquetas de jamón', precio_centimos: 850 },
        { nombre: 'Ensaladilla rusa', precio_centimos: 600 },
        { nombre: 'Patatas bravas', precio_centimos: 500 },
        { nombre: 'Chuletón de vaca', precio_centimos: 4800 },
      ],
    }),
  );
  for (const p of hechos.creados) platos[p.nombre] = p.platoId;

  // Marcos y Rosa tienen el móvil puesto; Marcos está trabajando, Rosa no.
  for (const [token, quien] of [
    [marcos, 'marcos'],
    [rosa, 'rosa'],
  ] as const) {
    losDatos(
      await api.ejecutar(token, 'poner_este_movil', {
        direccion: `https://fcm.googleapis.com/fcm/send/el-de-${quien}-en-la-carta`,
        p256dh: `B${'A'.repeat(86)}`,
        auth: 'A'.repeat(22),
        aparato: 'Android · Chrome',
      }),
    );
  }
  const centro = await base.localPorCodigo('bar-centro');
  await comoDuena(
    `insert into estook.fichaje (local_id, persona_id, fecha_operativa, entro_en, entro_sin_donde)
     values ($1, $2, '2026-10-05', $3, 'la_nego')`,
    [centro, await base.personaPorCorreo(MARCOS), '2026-10-05T16:00:00Z'],
  );
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

interface PlatoParaAgotar {
  id: string;
  nombre: string;
  agotado: { hasta: string | null; quien: string | null } | null;
}

async function losAgotados(token: string): Promise<PlatoParaAgotar[]> {
  return losDatos<{ platos: PlatoParaAgotar[] }>(await api.consultar(token, 'los_agotados')).platos;
}

async function elDelPulpo(token: string): Promise<PlatoParaAgotar | undefined> {
  return (await losAgotados(token)).find((p) => p.nombre === 'Pulpo a la gallega');
}

async function losMensajesDelEquipo(token: string) {
  const canales = losDatos<{ canales: { id: string; tipo: string }[] }>(
    await api.consultar(token, 'mis_canales', {}),
  ).canales;
  const equipo = canales.find((c) => c.tipo === 'equipo')?.id ?? '';
  return {
    equipo,
    mensajes: losDatos<{
      mensajes: {
        id: string;
        texto: string | null;
        sePuedeCorregir: boolean;
        tarjeta: { tipo: string; plato?: { nombre: string; agotado: boolean } | null } | null;
      }[];
    }>(await api.consultar(token, 'un_canal', { canal_id: equipo })).mensajes,
  };
}

describe('los agotados', () => {
  it('la camarera lo marca en mitad del servicio, y vuelve al empezar la jornada siguiente', async () => {
    losDatos(await api.ejecutar(sara, 'abrir_el_chat', {}));
    const antes = movil.mandados.length;
    const hecho = losDatos<{ hasta: string | null; recordatorio: string }>(
      await api.ejecutar(sara, 'marcar_agotado', {
        plato_id: platos['Pulpo a la gallega'],
        hasta: 'jornada',
      }),
    );
    // Bar Centro corta a las 03:00: vuelve el martes a las 03:00 de Madrid.
    expect(hecho.hasta).toBe('2026-10-06T01:00:00.000Z');
    expect(hecho.recordatorio).toBe('Quítalo también de tu TPV.');

    // Suena solo a quien está trabajando (Marcos), no a Rosa, que libra.
    const nuevos = movil.mandados.slice(antes);
    expect(nuevos.map((m) => m.suscripcion.direccion)).toEqual([
      'https://fcm.googleapis.com/fcm/send/el-de-marcos-en-la-carta',
    ]);
    expect(nuevos[0]?.carga).toMatchObject({
      detalle: expect.stringContaining('Agotado · Pulpo a la gallega') as unknown,
    });
  });

  it('la carta lo dice, con quién lo marcó', async () => {
    const carta = losDatos<{
      platos: { nombre: string; agotado: { hasta: string | null; quien: string | null } | null }[];
    }>(await api.consultar(rosa, 'mi_carta'));
    const pulpo = carta.platos.find((p) => p.nombre === 'Pulpo a la gallega');
    expect(pulpo?.agotado?.hasta).toBe('2026-10-06T01:00:00Z');
    expect(pulpo?.agotado?.quien).toMatch(/Sara/);
    expect(carta.platos.find((p) => p.nombre === 'Patatas bravas')?.agotado).toBeNull();
  });

  it('en el chat, una tarjeta que se pone al día; marcarlo otra vez no avisa dos veces', async () => {
    const { mensajes } = await losMensajesDelEquipo(rosa);
    const avisos = mensajes.filter((m) => m.tarjeta?.tipo === 'plato');
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.texto).toBe('Pulpo a la gallega');
    expect(avisos[0]?.tarjeta?.plato).toEqual({ nombre: 'Pulpo a la gallega', agotado: true });

    losDatos(
      await api.ejecutar(marcos, 'marcar_agotado', {
        plato_id: platos['Pulpo a la gallega'],
        hasta: 'jornada',
      }),
    );
    const otraVez = await losMensajesDelEquipo(rosa);
    expect(otraVez.mensajes.filter((m) => m.tarjeta?.tipo === 'plato')).toHaveLength(1);
  });

  it('el aviso no se corrige: el nombre del plato no es algo escrito', async () => {
    const { mensajes } = await losMensajesDelEquipo(sara);
    const aviso = mensajes.find((m) => m.tarjeta?.tipo === 'plato');
    expect(aviso?.sePuedeCorregir).toBe(false);
    expect(
      elFallo(
        await api.ejecutar(sara, 'corregir_mensaje', { mensaje_id: aviso?.id, texto: 'Otra cosa' }),
      ),
    ).toBe('faltan_datos');
  });

  it('la cocina, sin la app Carta, ve los platos para agotar y ni un precio', async () => {
    const respuesta = await api.consultar(marcos, 'los_agotados');
    expect(JSON.stringify(losDatos(respuesta))).not.toMatch(/precio|1400|centimos/i);
    expect((await elDelPulpo(marcos))?.agotado).not.toBeNull();
    expect(elFallo(await api.consultar(marcos, 'mi_carta'))).toBe('sin_permiso');
  });

  it('nadie de otro negocio lo toca', async () => {
    const fallo = elFallo(
      await api.ejecutar(luis, 'marcar_agotado', {
        plato_id: platos['Croquetas de jamón'],
        hasta: 'sin_fecha',
      }),
    );
    expect(['no_existe', 'sin_permiso']).toContain(fallo);
    const filas = await comoDuena<{ cuantos: number }>(
      'select count(*)::int as cuantos from estook.plato_agotado where plato_id = $1',
      [platos['Croquetas de jamón']],
    );
    expect(filas[0]?.cuantos).toBe(0);
  });

  it('pasado el corte, vuelve solo, y la tarjeta del chat dice que ya hay', async () => {
    ahora = new Date('2026-10-06T00:59:00Z');
    expect((await elDelPulpo(sara))?.agotado).not.toBeNull();
    ahora = new Date('2026-10-06T01:00:00Z');
    expect((await elDelPulpo(sara))?.agotado).toBeNull();
    const { mensajes } = await losMensajesDelEquipo(rosa);
    expect(mensajes.find((m) => m.tarjeta?.tipo === 'plato')?.tarjeta?.plato?.agotado).toBe(false);
  });

  it('sin fecha, sigue agotado hasta que alguien dice que ya hay', async () => {
    ahora = new Date('2026-10-06T12:00:00Z');
    const hecho = losDatos<{ hasta: string | null }>(
      await api.ejecutar(sara, 'marcar_agotado', {
        plato_id: platos['Croquetas de jamón'],
        hasta: 'sin_fecha',
      }),
    );
    expect(hecho.hasta).toBeNull();
    ahora = new Date('2026-10-20T12:00:00Z');
    const croquetas = (await losAgotados(sara)).find((p) => p.nombre === 'Croquetas de jamón');
    expect(croquetas?.agotado).toMatchObject({ hasta: null });

    expect(
      losDatos<{ estaba: boolean }>(
        await api.ejecutar(marcos, 'quitar_agotado', { plato_id: platos['Croquetas de jamón'] }),
      ).estaba,
    ).toBe(true);
    expect(
      (await losAgotados(sara)).find((p) => p.nombre === 'Croquetas de jamón')?.agotado,
    ).toBeNull();
    // Otra vez, ya no estaba.
    expect(
      losDatos<{ estaba: boolean }>(
        await api.ejecutar(marcos, 'quitar_agotado', { plato_id: platos['Croquetas de jamón'] }),
      ).estaba,
    ).toBe(false);
  });

  it('queda en el historial del plato', async () => {
    const plato = losDatos<{ historial: { que: string }[] }>(
      await api.consultar(rosa, 'un_plato', { plato_id: platos['Croquetas de jamón'] ?? '' }),
    );
    expect(plato.historial.map((h) => h.que)).toEqual(expect.arrayContaining(['agotar', 'ya_hay']));
  });

  it('agotado no es stock: no mueve el libro', async () => {
    const libro = async () =>
      (
        await comoDuena<{ cuantos: number }>(
          'select count(*)::int as cuantos from estook.movimiento_de_stock',
        )
      )[0]?.cuantos;
    const antes = await libro();
    losDatos(
      await api.ejecutar(sara, 'marcar_agotado', {
        plato_id: platos['Ensaladilla rusa'],
        hasta: 'jornada',
      }),
    );
    expect(await libro()).toBe(antes);
  });
});

describe('el precio del cierre sale de la carta', () => {
  it('el de sala, marcado como de la carta', async () => {
    const cierre = losDatos<{
      platosConocidos: { concepto: string; precioUnidadCentimos: number; deLaCarta: boolean }[];
    }>(await api.consultar(rosa, 'un_cierre'));
    expect(cierre.platosConocidos).toEqual(
      expect.arrayContaining([
        {
          clave: 'pulpo a la gallega',
          concepto: 'Pulpo a la gallega',
          precioUnidadCentimos: 1400,
          deLaCarta: true,
        },
      ]),
    );
  });
});

describe('leer tu carta', () => {
  it('una carta con dos precios cambiados propone exactamente esos dos', async () => {
    const leida = losDatos<{
      resumen: string;
      cambia: {
        nuevos: { nombre: string }[];
        precios: { nombre: string; antes: number; ahora: number }[];
        yaNoEstan: { nombre: string }[];
      };
    }>(
      await api.ejecutar(rosa, 'leer_la_carta', {
        lineas: [
          'BAR CENTRO',
          'ENTRANTES',
          'Pulpo a la gallega ........ 15,00 €',
          'Croquetas de jamón ........ 8,50 €',
          'Ensaladilla rusa .......... 6,00 €',
          'Patatas bravas ............ 5,50 €',
          'Chuletón de vaca .......... 48,00 €',
          'IVA incluido',
        ],
      }),
    );
    expect(leida.cambia.precios).toEqual([
      {
        platoId: platos['Pulpo a la gallega'],
        nombre: 'Pulpo a la gallega',
        antes: 1400,
        ahora: 1500,
      },
      { platoId: platos['Patatas bravas'], nombre: 'Patatas bravas', antes: 500, ahora: 550 },
    ]);
    expect(leida.cambia.nuevos).toEqual([]);
    expect(leida.cambia.yaNoEstan).toEqual([]);
    expect(leida.resumen).toBe('2 precios distintos');
  });

  it('leer no cambia nada', async () => {
    const filas = await comoDuena<{ precio_centimos: number }>(
      'select precio_centimos from estook.plato where id = $1',
      [platos['Pulpo a la gallega']],
    );
    expect(filas[0]?.precio_centimos).toBe(1400);
  });

  it('una carta sin platos que se entiendan lo dice', async () => {
    expect(
      elFallo(await api.ejecutar(rosa, 'leer_la_carta', { lineas: ['Bienvenidos', 'Gracias'] })),
    ).toBe('faltan_datos');
  });

  it('la sala no la lee: cambiar la carta es de quien la edita', async () => {
    expect(elFallo(await api.ejecutar(sara, 'leer_la_carta', { lineas: ['Gildas 3 €'] }))).toBe(
      'sin_permiso',
    );
  });

  it('una foto, con Fogón: la pasa a líneas y Estook las lee igual', async () => {
    const centro = await base.localPorCodigo('bar-centro');
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
    const UN_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]);
    const pagina = losDatos<{ lineas: string[] }>(
      await api.ejecutar(rosa, 'leer_pagina_con_fogon', {
        foto: { tipo: 'image/jpeg', base64: UN_JPEG.toString('base64') },
        pagina: 1,
      }),
    );
    expect(pagina.lineas).toContain('Gildas de la casa 3,50 €');
    expect(modelo.pedidas.at(-1)?.foto?.tipo).toBe('image/jpeg');
    const apuntada = await comoDuena<{ cuantos: number }>(
      `select count(*)::int as cuantos from estook.llamada_a_fogon where que = 'leer_carta'`,
    );
    expect(apuntada[0]?.cuantos).toBe(1);

    const leida = losDatos<{ cambia: { nuevos: { nombre: string; seccion: string | null }[] } }>(
      await api.ejecutar(rosa, 'leer_la_carta', { lineas: pagina.lineas }),
    );
    expect(leida.cambia.nuevos.map((p) => [p.seccion, p.nombre])).toEqual([
      ['Entrantes', 'Croquetas caseras'],
      ['Entrantes', 'Gildas de la casa'],
      ['Postres', 'Tarta de queso'],
    ]);
  });
});

describe('el equilibrio de la carta', () => {
  it('los entrantes van de 5 a 48 €: el salto se dice', async () => {
    const visto = losDatos<{
      secciones: { nombre: string; salto: number | null; avisos: string[] }[];
      conAlgoQueMirar: number;
    }>(await api.consultar(sara, 'el_equilibrio_de_la_carta'));
    const entrantes = visto.secciones.find((s) => s.nombre === 'Entrantes');
    expect(entrantes?.salto).toBe(9.6);
    expect(entrantes?.avisos[0]).toContain('9,6 veces');
    expect(visto.conAlgoQueMirar).toBe(1);
  });

  it('la cocina no tiene Carta: no lo ve', async () => {
    expect(elFallo(await api.consultar(marcos, 'el_equilibrio_de_la_carta'))).toBe('sin_permiso');
  });
});
