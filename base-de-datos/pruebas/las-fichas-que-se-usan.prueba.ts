import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fechaEnElLocal, masDias } from '@estook/dominio';
import { pdfDeMentira } from '../../servidor/infraestructura/pdf.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M9 · 3 · Las fichas que se usan, y lo que ha cambiado (decisiones 0092 a 0095,
 * migración 0073), contra una base de verdad y como cada persona:
 *
 *   · **La receta por tanda**: el escandallo dice lo que cuesta **una** ración, el
 *     historial lo apunta, recuperar la trae, y lo vinculado y las elaboraciones no la
 *     llevan nunca.
 *   · **El coste aproximado** de un plato sin escandallo, solo a quien ve costes.
 *   · **El PDF escalado** y **todas las fichas en un PDF**, sin un euro.
 *   · **Qué ha cambiado**: con los precios y la receta de entonces, ordenado por euros, y
 *     **el aviso del reloj** cuando un plato cruza tu objetivo, una vez.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
const motor = pdfDeMentira();
let conPdf: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: lo edita todo y ve costes
const SARA = 'sara@ejemplo.estook.com'; // camarera: ve las fichas, sin euros
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero: ve las fichas, sin euros
const SECRETO = 'el-secreto-del-reloj-de-m9-3';

let rosa: string;
let sara: string;
let marcos: string;

/** Hoy en Madrid: los precios se fechan con el día de la base. */
const HOY = fechaEnElLocal(new Date(Date.now()), 'Europe/Madrid');

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  conPdf = montarLaApi(base.bd, { pdf: motor });
  // Bar Centro deja de ser un ejemplo: el reloj no avisa a los ejemplos.
  await comoDuena(`update estook.organizacion set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(`update estook.local set es_ejemplo = false where codigo = 'bar-centro'`);
  await comoDuena(
    `update plataforma.reloj set huella = encode(sha256(convert_to($1, 'UTF8')), 'hex')`,
    [SECRETO],
  );
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  marcos = await api.entrar(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function unProducto(datos: Record<string, unknown>): Promise<string> {
  return losDatos<{ productoId: string }>(await api.ejecutar(rosa, 'crear_producto', datos))
    .productoId;
}

async function unPlato(nombre: string, precio: number): Promise<string> {
  return losDatos<{ creados: { platoId: string }[] }>(
    await api.ejecutar(rosa, 'crear_platos', {
      seccion_id: null,
      platos: [{ nombre, precio_centimos: precio }],
    }),
  ).creados[0]?.platoId as string;
}

interface Ficha {
  receta: { version: number; raciones?: number; lineas: { cantidad: number }[] };
  escandallo?: {
    costeCentimos: number | null;
    precioSinIvaCentimos: number | null;
    iva: number | null;
    objetivo: number | null;
  };
  historial: { id: string; version: number; cambios: string[] }[];
}

async function laFicha(token: string, platoId: string): Promise<Ficha> {
  return losDatos<Ficha>(await api.consultar(token, 'una_ficha', { plato_id: platoId }));
}

let garbanzo: string;
let puchero: string;

describe('la receta por tanda', () => {
  it('se escribe la olla entera, y el escandallo dice lo que cuesta una ración', async () => {
    // 3 €/kg: la olla lleva 3 kg (9 €) y sale para 25 raciones: 0,36 € la ración.
    garbanzo = await unProducto({
      nombre: 'Garbanzo m93',
      factor: 1,
      unidad_de_uso: 'kg',
      precio_centimos: 300,
    });
    puchero = await unPlato('Puchero m93', 1100);
    const guardada = losDatos<{ version: number }>(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: puchero,
        version: 0,
        lineas: [{ producto_id: garbanzo, cantidad: 3000, unidad: 'g' }],
        pasos: [],
        raciones: 25,
      }),
    );
    expect(guardada.version).toBe(1);

    const deRosa = await laFicha(rosa, puchero);
    expect(deRosa.receta.raciones).toBe(25);
    expect(deRosa.receta.lineas[0]?.cantidad).toBe(3000);
    expect(deRosa.escandallo?.costeCentimos).toBe(36);

    // La camarera ve la tanda, y ni un euro.
    const deSara = await laFicha(sara, puchero);
    expect(deSara.receta.raciones).toBe(25);
    expect(deSara.escandallo).toBeUndefined();
  });

  it('cambiarla queda en el historial, en palabras', async () => {
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: puchero,
        version: 1,
        lineas: [{ producto_id: garbanzo, cantidad: 3000, unidad: 'g' }],
        pasos: [],
        raciones: 1,
      }),
    );
    const de1 = await laFicha(rosa, puchero);
    expect(de1.receta.raciones).toBe(1);
    expect(de1.escandallo?.costeCentimos).toBe(900);
    expect(de1.historial[0]?.cambios).toEqual(['Para: una tanda de 25 raciones → 1 ración']);

    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: puchero,
        version: 2,
        lineas: [{ producto_id: garbanzo, cantidad: 3000, unidad: 'g' }],
        pasos: [],
        raciones: 25,
      }),
    );
    const otraVez = await laFicha(rosa, puchero);
    expect(otraVez.historial[0]?.cambios).toEqual(['Para: 1 ración → una tanda de 25 raciones']);
  });

  it('guardar sin decir nada de la tanda la deja como estaba', async () => {
    const antes = await laFicha(rosa, puchero);
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: puchero,
        version: antes.receta.version,
        lineas: [{ producto_id: garbanzo, cantidad: 3000, unidad: 'g' }],
        pasos: ['Remojar la víspera'],
      }),
    );
    expect((await laFicha(rosa, puchero)).receta.raciones).toBe(25);
  });

  it('recuperar la de una ración la trae con su ración', async () => {
    const ficha = await laFicha(rosa, puchero);
    const deUna = ficha.historial.find((h) => h.version === 2);
    losDatos(await api.ejecutar(rosa, 'recuperar_receta', { guardada_id: deUna?.id }));
    const recuperada = await laFicha(rosa, puchero);
    expect(recuperada.receta.raciones).toBe(1);
    expect(recuperada.historial[0]?.cambios[0]).toMatch(/^Recuperó la del /);
  });

  it('lo que se vende tal cual es siempre una ración', async () => {
    const refresco = await unProducto({
      nombre: 'Refresco m93',
      factor: 24,
      unidad_de_uso: 'ud',
      precio_centimos: 1200,
    });
    const plato = await unPlato('Refresco de la carta m93', 300);
    losDatos(
      await api.ejecutar(rosa, 'vincular_plato', { plato_id: plato, producto_id: refresco }),
    );
    // Aunque alguien pida una tanda guardando su receta, lo vinculado sigue en una ración.
    const vinculado = await laFicha(rosa, plato);
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: plato,
        version: vinculado.receta.version,
        lineas: [{ producto_id: refresco, cantidad: 1, unidad: 'ud' }],
        pasos: [],
        raciones: 6,
      }),
    );
    expect((await laFicha(rosa, plato)).receta.raciones).toBe(1);
  });

  it('una elaboración no lleva tanda: ya dice lo que rinde', async () => {
    const caldo = losDatos<{ elaboracionId: string }>(
      await api.ejecutar(rosa, 'crear_elaboracion', {
        nombre: 'Caldo m93',
        rinde_cantidad: 5,
        rinde_unidad: 'l',
      }),
    ).elaboracionId;
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        elaboracion_id: caldo,
        version: 0,
        lineas: [{ producto_id: garbanzo, cantidad: 500, unidad: 'g' }],
        pasos: [],
        raciones: 10,
      }),
    );
    const [fila] = await comoDuena<{ raciones: number | null }>(
      'select raciones from estook.receta where elaboracion_id = $1',
      [caldo],
    );
    expect(fila?.raciones).toBeNull();
    // Y la base tampoco lo deja, aunque alguien se salte el comando.
    await expect(
      comoDuena('update estook.receta set raciones = 10 where elaboracion_id = $1', [caldo]),
    ).rejects.toThrow(/receta_raciones_solo_de_un_plato/);
  });
});

describe('el coste aproximado de lo que no tiene escandallo', () => {
  it('a quien ve costes, precio sin IVA por su objetivo; a la sala, nada', async () => {
    const sinEscandallo = await unPlato('Sin escandallo m93', 1210);
    const deRosa = losDatos<{
      objetivo?: number | null;
      platos: { id: string; coste?: { costeAproxCentimos?: number | null } }[];
    }>(await api.consultar(rosa, 'mis_fichas'));
    // Bar Centro tiene de objetivo el 30 % (la semilla de los objetivos).
    expect(deRosa.objetivo).toBe(0.3);
    const suyo = deRosa.platos.find((p) => p.id === sinEscandallo);
    // 12,10 € con el 10 % de IVA son 11,00 € sin él; al 30 %, 3,30 €.
    expect(suyo?.coste?.costeAproxCentimos).toBe(330);

    const deSara = losDatos<{ platos: { id: string; coste?: unknown }[] }>(
      await api.consultar(sara, 'mis_fichas'),
    );
    expect(deSara.platos.find((p) => p.id === sinEscandallo)?.coste).toBeUndefined();
  });
});

describe('los PDF', () => {
  it('la ficha técnica sale escalada si se pide, y sin pedirlo, como está escrita', async () => {
    const ficha = await laFicha(rosa, puchero);
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: puchero,
        version: ficha.receta.version,
        lineas: [{ producto_id: garbanzo, cantidad: 3000, unidad: 'g' }],
        pasos: ['Remojar la víspera'],
        raciones: 25,
      }),
    );
    losDatos(await conPdf.consultar(marcos, 'la_ficha_en_pdf', { plato_id: puchero }));
    const escrita = motor.hechos.at(-1)?.html ?? '';
    expect(escrita).toContain('para 25 raciones');
    expect(escrita).toContain('3 kg');

    losDatos(await conPdf.consultar(marcos, 'la_ficha_en_pdf', { plato_id: puchero, para: '50' }));
    const doble = motor.hechos.at(-1)?.html ?? '';
    expect(doble).toContain('para 50 raciones');
    expect(doble).toContain('6 kg');
    expect(doble).not.toContain('€');
  });

  it('todas las fichas en un PDF, con su índice, para la sala también y sin un euro', async () => {
    const pdf = losDatos<{ nombre: string }>(await conPdf.consultar(sara, 'las_fichas_en_pdf'));
    expect(pdf.nombre).toBe('fichas-tecnicas.pdf');
    const html = motor.hechos.at(-1)?.html ?? '';
    expect(html).toContain('Fichas técnicas');
    expect(html).toContain('Puchero m93');
    // Lo que se vende tal cual no tiene ficha técnica.
    expect(html).not.toContain('Refresco de la carta m93');
    expect(html).not.toContain('€');
  });
});

// ── Qué ha cambiado, y el aviso del reloj ────────────────────────────────────

let lentejas: string;
let guiso: string;

describe('qué ha cambiado', () => {
  beforeAll(async () => {
    // 2 €/kg y el guiso lleva 2 kg: 4,00 € la ración. Hace 40 días.
    lentejas = await unProducto({
      nombre: 'Lentejas m93',
      factor: 1,
      unidad_de_uso: 'kg',
      precio_centimos: 200,
    });
    guiso = await unPlato('Lentejas guisadas m93', 1650);
    losDatos(
      await api.ejecutar(rosa, 'guardar_ficha', {
        plato_id: guiso,
        version: 0,
        lineas: [{ producto_id: lentejas, cantidad: 2000, unidad: 'g' }],
        pasos: [],
      }),
    );
    // Lo de entonces, atrasado a mano: el precio y la receta guardada.
    await comoDuena(
      `update estook.precio_de_producto set desde = current_date - 40 where producto_id = $1`,
      [lentejas],
    );
    await comoDuena(
      `update estook.receta_guardada set guardada_en = now() - interval '40 days'
        where receta_id = (select id from estook.receta where plato_id = $1)`,
      [guiso],
    );
    // Hoy sube a 3 €/kg: 6,00 € la ración.
    losDatos(
      await api.ejecutar(rosa, 'poner_precio', { producto_id: lentejas, precio_centimos: 300 }),
    );
    // La base fecha los precios con su día (UTC), y a medianoche en Madrid ya es otro: se
    // dejan en días de Madrid, el de antes hasta ayer y el nuevo desde hoy (lección 128).
    await comoDuena(
      `update estook.precio_de_producto set desde = $2::date, hasta = $3::date
        where producto_id = $1 and hasta is not null`,
      [lentejas, masDias(HOY, -40), masDias(HOY, -1)],
    );
    await comoDuena(
      `update estook.precio_de_producto set desde = $2::date
        where producto_id = $1 and hasta is null`,
      [lentejas, HOY],
    );
  });

  it('el plato que más se ha movido, con lo que lo ha movido', async () => {
    const cambio = losDatos<{
      platos: {
        id: string;
        antesCentimos: number;
        ahoraCentimos: number;
        diferenciaCentimos: number;
        porQue: { nombre: string; centimos: number } | null;
        cambioLaReceta: boolean;
      }[];
    }>(await api.consultar(rosa, 'que_ha_cambiado', { dias: '30' }));
    const suyo = cambio.platos.find((p) => p.id === guiso);
    expect(suyo).toMatchObject({
      antesCentimos: 400,
      ahoraCentimos: 600,
      diferenciaCentimos: 200,
      porQue: { nombre: 'Lentejas m93', centimos: 200 },
      cambioLaReceta: false,
    });
    // Lo que no tenía receta entonces no se compara: el puchero es de hoy.
    expect(cambio.platos.some((p) => p.id === puchero)).toBe(false);
  });

  it('solo a quien ve costes', async () => {
    expect(elFallo(await api.consultar(sara, 'que_ha_cambiado'))).toBe('sin_permiso');
    expect(elFallo(await api.consultar(marcos, 'que_ha_cambiado'))).toBe('sin_permiso');
  });
});

describe('el reloj avisa cuando un plato cruza la raya', () => {
  interface Aviso {
    tipo: string;
    titulo: string;
    detalle: string | null;
    ir: string | null;
  }
  async function deTipo(token: string, tipo: string): Promise<Aviso[]> {
    return losDatos<{ avisos: Aviso[] }>(await api.consultar(token, 'mis_avisos')).avisos.filter(
      (a) => a.tipo === tipo,
    );
  }
  async function latir() {
    return montarLaApi(base.bd, { ahora: () => new Date(`${HOY}T07:10:00Z`) }).despachador.latir(
      { tokenDeSesion: null, correlacionId: crypto.randomUUID() },
      SECRETO,
    );
  }

  beforeAll(async () => {
    // El guiso, a un precio en que ayer (4,00 €) quedaba dentro del objetivo del 30 % y
    // hoy (6,00 €) pasa de él: cruza la raya.
    const ficha = await laFicha(rosa, guiso);
    expect(ficha.escandallo).toMatchObject({ objetivo: 0.3, iva: 0.1 });
    const [plato] = await comoDuena<{ version: number }>(
      'select version from estook.plato where id = $1',
      [guiso],
    );
    losDatos(
      await api.ejecutar(rosa, 'cambiar_plato', {
        plato_id: guiso,
        version: plato?.version,
        // 18,34 € (16,67 sin IVA): 4,00 € es el 24 %, y 6,00 € el 36 %.
        precio_centimos: 1834,
      }),
    );
    // El precio de ayer acaba ayer, y el de hoy vale desde hoy (arriba, en días de Madrid).
    expect(await latir()).toMatchObject({ diario: true });
  });

  it('a quien ve lo que cuesta cada plato, con lo que lo ha movido y a dónde ir', async () => {
    const avisos = await deTipo(rosa, 'plato.raya');
    const suyo = avisos.find((a) => a.titulo === 'Lentejas guisadas m93 pasa de tu objetivo');
    expect(suyo?.detalle).toContain('Lo ha movido lentejas m93');
    expect(suyo?.ir).toBe(`/escandallos/escandallos/todos?ficha=plato.${guiso}`);
    // La sala y la cocina no ven costes: no les llega.
    expect(await deTipo(sara, 'plato.raya')).toEqual([]);
    expect(await deTipo(marcos, 'plato.raya')).toEqual([]);
  });

  it('una vez: si el reloj vuelve a latir el mismo día, no se repite', async () => {
    await latir();
    const avisos = await deTipo(rosa, 'plato.raya');
    expect(avisos.filter((a) => a.titulo.startsWith('Lentejas guisadas m93'))).toHaveLength(1);
  });
});
