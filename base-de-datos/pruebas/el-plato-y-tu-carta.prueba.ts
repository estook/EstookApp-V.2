import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * M9 · 1 · El plato y tu carta (decisión 0086, migración 0068), contra una base de
 * verdad y como cada persona: lo que se monta, quién lo toca, los canales con su
 * precio a mano y el historial de cada plato.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro: edita la carta
const SARA = 'sara@ejemplo.estook.com'; // camarera: ve la carta, no la toca
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero: sin Carta
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina de Bar Puerto, otra organización

let rosa: string;
let sara: string;
let marcos: string;
let luis: string;

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  sara = await api.entrar(SARA);
  marcos = await api.entrar(MARCOS);
  luis = await api.entrar(LUIS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

interface Plato {
  id: string;
  seccionId: string | null;
  nombre: string;
  precioCentimos: number | null;
  precios: Record<string, number>;
  activo: boolean;
  version: number;
}
interface Canal {
  canal: string;
  activo: boolean;
  disponible: boolean;
  comisionPorcentaje: number | null;
}
interface Carta {
  puedeEditar: boolean;
  canales: Canal[];
  secciones: { id: string; nombre: string }[];
  platos: Plato[];
}

async function laCarta(token: string): Promise<Carta> {
  return losDatos<Carta>(await api.consultar(token, 'mi_carta'));
}

let entrantes: string;
let croquetas: Plato;

describe('montar la carta', () => {
  it('una sección, y la misma otra vez no se duplica', async () => {
    entrantes = losDatos<{ seccionId: string }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: 'Entrantes' }),
    ).seccionId;
    const otra = losDatos<{ seccionId: string; yaExistia: boolean }>(
      await api.ejecutar(rosa, 'crear_seccion', { nombre: 'entrantes' }),
    );
    expect(otra).toEqual({ seccionId: entrantes, yaExistia: true });
  });

  it('varios platos de golpe, sin repetir los que ya están', async () => {
    const hecho = losDatos<{ creados: unknown[]; yaEstaban: string[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: entrantes,
        platos: [
          { nombre: 'Croquetas de jamón', precio_centimos: 950 },
          { nombre: 'Patatas bravas', precio_centimos: 650 },
          { nombre: 'Croquetas de jamón', precio_centimos: 990 },
        ],
      }),
    );
    expect(hecho.creados).toHaveLength(2);
    const otraVez = losDatos<{ creados: unknown[]; yaEstaban: string[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'CROQUETAS DE JAMON' }],
      }),
    );
    expect(otraVez).toMatchObject({ creados: [], yaEstaban: ['Croquetas de jamón'] });

    const carta = await laCarta(rosa);
    croquetas = carta.platos.find((p) => p.nombre === 'Croquetas de jamón') as Plato;
    expect(croquetas).toMatchObject({ seccionId: entrantes, precioCentimos: 950, activo: true });
    expect(carta.puedeEditar).toBe(true);
  });

  it('la camarera ve la carta y sus precios, pero ni la toca ni ve las comisiones', async () => {
    await api.ejecutar(rosa, 'configurar_canal', { canal: 'uber_eats', activo: true });
    const suya = await laCarta(sara);
    expect(suya.puedeEditar).toBe(false);
    expect(suya.platos.some((p) => p.nombre === 'Croquetas de jamón')).toBe(true);
    expect(suya.canales.find((c) => c.canal === 'uber_eats')?.comisionPorcentaje).toBeNull();
    expect(
      elFallo(
        await api.ejecutar(sara, 'crear_platos', {
          seccion_id: null,
          platos: [{ nombre: 'Flan' }],
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('el cocinero, sin Carta, no la lee', async () => {
    expect(elFallo(await api.consultar(marcos, 'mi_carta'))).toBe('sin_permiso');
  });

  it('desde otra organización no se ve ni se toca', async () => {
    // Luis edita la carta de su local, así que pasa la puerta del permiso: el plato
    // de otro local, sencillamente, no existe para él.
    expect(elFallo(await api.consultar(luis, 'un_plato', { plato_id: croquetas.id }))).toBe(
      'no_existe',
    );
    const intento = await api.ejecutar(luis, 'cambiar_plato', {
      plato_id: croquetas.id,
      version: croquetas.version,
      precio_centimos: 1,
    });
    expect(elFallo(intento)).toBe('no_existe');
    expect((await laCarta(rosa)).platos.find((p) => p.id === croquetas.id)?.precioCentimos).toBe(
      950,
    );
  });
});

describe('los canales', () => {
  it('Uber Eats se activa con la comisión de siempre; Glovo todavía no', async () => {
    const carta = await laCarta(rosa);
    expect(carta.canales.find((c) => c.canal === 'uber_eats')).toMatchObject({
      activo: true,
      comisionPorcentaje: 30,
    });
    expect(carta.canales.find((c) => c.canal === 'glovo')).toMatchObject({
      activo: false,
      disponible: false,
    });
    expect(
      elFallo(await api.ejecutar(rosa, 'configurar_canal', { canal: 'glovo', activo: true })),
    ).toBe('todavia_no_disponible');
    expect(
      elFallo(await api.ejecutar(rosa, 'configurar_canal', { canal: 'sala', activo: true })),
    ).toBe('faltan_datos');
  });

  it('la comisión se cambia, y la ve quien edita', async () => {
    losDatos(
      await api.ejecutar(rosa, 'configurar_canal', {
        canal: 'uber_eats',
        activo: true,
        comision_porcentaje: 27.5,
        envase_centimos: 35,
      }),
    );
    expect((await laCarta(rosa)).canales.find((c) => c.canal === 'uber_eats')).toMatchObject({
      comisionPorcentaje: 27.5,
    });
  });
});

describe('el precio de cada plato en cada canal', () => {
  it('a mano en Uber Eats; sin él, vale el de sala', async () => {
    const { version } = losDatos<{ version: number }>(
      await api.ejecutar(rosa, 'cambiar_plato', {
        plato_id: croquetas.id,
        version: croquetas.version,
        precio_centimos: 990,
        precios: { uber_eats: 1250 },
      }),
    );
    const despues = (await laCarta(rosa)).platos.find((p) => p.id === croquetas.id);
    expect(despues).toMatchObject({ precioCentimos: 990, precios: { uber_eats: 1250 } });

    // Quitarlo vuelve a «igual que sala».
    losDatos(
      await api.ejecutar(rosa, 'cambiar_plato', {
        plato_id: croquetas.id,
        version,
        precios: { uber_eats: null },
      }),
    );
    croquetas = (await laCarta(rosa)).platos.find((p) => p.id === croquetas.id) as Plato;
    expect(croquetas.precios).toEqual({});
  });

  it('un canal que todavía no se puede usar no lleva precio', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'cambiar_plato', {
          plato_id: croquetas.id,
          version: croquetas.version,
          precios: { glovo: 1100 },
        }),
      ),
    ).toBe('faltan_datos');
  });

  it('dos personas a la vez: la segunda se entera, no pisa', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'cambiar_plato', {
          plato_id: croquetas.id,
          version: croquetas.version - 1,
          precio_centimos: 1,
        }),
      ),
    ).toBe('lo_cambio_otra_persona');
  });

  it('dos platos no se llaman igual', async () => {
    expect(
      elFallo(
        await api.ejecutar(rosa, 'cambiar_plato', {
          plato_id: croquetas.id,
          version: croquetas.version,
          nombre: 'patatas BRAVAS',
        }),
      ),
    ).toBe('faltan_datos');
  });
});

describe('el historial del plato', () => {
  it('dice quién cambió qué precio, de lo más nuevo a lo más viejo', async () => {
    const { historial } = losDatos<{
      historial: { quien: string | null; que: string; antes: unknown; despues: unknown }[];
    }>(await api.consultar(rosa, 'un_plato', { plato_id: croquetas.id }));
    expect(historial.map((h) => h.que)).toEqual(['cambiar', 'cambiar', 'crear']);
    expect(historial[0]).toMatchObject({
      quien: 'Rosa',
      antes: { precio_uber_eats: 1250 },
      despues: { precio_uber_eats: null },
    });
    expect(historial[1]).toMatchObject({
      antes: { precio: 950, precio_uber_eats: null },
      despues: { precio: 990, precio_uber_eats: 1250 },
    });
  });
});

describe('archivar, recuperar y quitar secciones', () => {
  it('archivado sale de la carta; creado otra vez, vuelve el mismo con su historial', async () => {
    const bravas = (await laCarta(rosa)).platos.find((p) => p.nombre === 'Patatas bravas') as Plato;
    losDatos(await api.ejecutar(rosa, 'archivar_plato', { plato_id: bravas.id }));
    expect((await laCarta(rosa)).platos.find((p) => p.id === bravas.id)?.activo).toBe(false);

    const vuelta = losDatos<{ recuperados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: entrantes,
        platos: [{ nombre: 'patatas bravas', precio_centimos: 700 }],
      }),
    );
    expect(vuelta.recuperados[0]?.platoId).toBe(bravas.id);
    expect((await laCarta(rosa)).platos.find((p) => p.id === bravas.id)).toMatchObject({
      activo: true,
      precioCentimos: 700,
    });
  });

  it('quitar una sección deja sus platos en «Sin sección», sin borrar ninguno', async () => {
    const { platosSinSeccion } = losDatos<{ platosSinSeccion: number }>(
      await api.ejecutar(rosa, 'quitar_seccion', { seccion_id: entrantes }),
    );
    expect(platosSinSeccion).toBe(2);
    const carta = await laCarta(rosa);
    expect(carta.secciones.some((s) => s.id === entrantes)).toBe(false);
    expect(carta.platos.filter((p) => p.seccionId === null).length).toBeGreaterThanOrEqual(2);
  });
});

describe('el buscador encuentra los platos', () => {
  async function buscar(token: string, texto: string) {
    return losDatos<{ tipo: string; titulo: string }[]>(
      await api.consultar(token, 'buscar', { texto }),
    );
  }

  it('a quien tiene Carta; al cocinero, no', async () => {
    expect((await buscar(rosa, 'croque')).some((r) => r.tipo === 'plato')).toBe(true);
    expect((await buscar(sara, 'croque')).some((r) => r.tipo === 'plato')).toBe(true);
    expect((await buscar(marcos, 'croque')).some((r) => r.tipo === 'plato')).toBe(false);
    expect((await buscar(luis, 'croque')).some((r) => r.tipo === 'plato')).toBe(false);
  });
});
