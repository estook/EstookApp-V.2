import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TOPES_DE_GOOGLE } from '@estook/dominio';
import { lugaresDeMentira } from '../../servidor/infraestructura/google.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * El local en Google (M7, entrega 5 · decisiones 0030 y 0040).
 *
 * «La API que cuesta dinero hay que acotarla bien.» Lo que se prueba aquí, con un
 * Google de mentira que cuenta cuántas veces le preguntan:
 *
 *   · sin clave, se dice que no está conectado, y no se rompe nada
 *   · elegir el local guarda su ficha y, si se pide, su posición para fichar
 *   · **la posición marcada a mano manda**: actualizar desde Google no la pisa
 *   · **el tope corta antes de llamar**: Google no llega a enterarse
 *   · actualizar la ficha, como mucho una vez al día
 *   · quien no lleva el local no puede ni buscarlo
 */
let base: BaseDePrueba;
let conGoogle: ApiDePrueba;
let sinGoogle: ApiDePrueba;
const google = lugaresDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro

let rosa: string;
let rosaSinGoogle: string;
let marcos: string;
let centro: string;

const SESION = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b';

interface MiLocalEnGoogle {
  conectado: boolean;
  ficha: { nombre: string | null; valoracion: number | null; horario: string[] | null } | null;
  tienePosicion: boolean;
  posicionDe: string | null;
  uso: { busquedas: number; fichas: number };
}

beforeAll(async () => {
  base = await levantarBase();
  conGoogle = montarLaApi(base.bd, { google });
  sinGoogle = montarLaApi(base.bd);
  rosa = await conGoogle.entrar(ROSA);
  rosaSinGoogle = await sinGoogle.entrar(ROSA);
  marcos = await conGoogle.entrar(MARCOS);
  centro = await base.localPorCodigo('bar-centro');
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

const loGuardado = async (token: string, api = conGoogle) =>
  losDatos<MiLocalEnGoogle>(await api.consultar(token, 'mi_local_en_google'));

describe('sin la clave de Google', () => {
  it('se dice que no está conectado, y buscar contesta con su motivo', async () => {
    expect((await loGuardado(rosaSinGoogle, sinGoogle)).conectado).toBe(false);
    const buscado = await sinGoogle.ejecutar(rosaSinGoogle, 'buscar_mi_local_en_google', {
      texto: 'Bar Centro',
      sesion: SESION,
    });
    expect(elFallo(buscado)).toBe('faltan_datos');
  });
});

describe('con Google', () => {
  it('buscar trae sugerencias y cuenta una búsqueda', async () => {
    const antes = await loGuardado(rosa);
    expect(antes.conectado).toBe(true);

    const buscado = losDatos<{ sugerencias: { id: string; nombre: string }[] }>(
      await conGoogle.ejecutar(rosa, 'buscar_mi_local_en_google', {
        texto: 'Bar Centro',
        sesion: SESION,
      }),
    );
    expect(buscado.sugerencias[0]?.nombre).toBe('Bar Centro');
    expect((await loGuardado(rosa)).uso.busquedas).toBe(antes.uso.busquedas + 1);
  });

  it('con menos de tres letras no se llega a preguntar', async () => {
    const llamadas = google.llamadas.n;
    const buscado = await conGoogle.ejecutar(rosa, 'buscar_mi_local_en_google', {
      texto: 'Ba',
      sesion: SESION,
    });
    expect(buscado.estado).toBe('fallo');
    expect(google.llamadas.n).toBe(llamadas);
  });

  it('elegirlo guarda su ficha y, si se pide, su posición para fichar', async () => {
    losDatos(
      await conGoogle.ejecutar(rosa, 'elegir_mi_local_de_google', {
        id: 'lugar-de-prueba',
        sesion: SESION,
        usar_su_posicion: true,
      }),
    );

    const guardado = await loGuardado(rosa);
    expect(guardado.ficha?.nombre).toBe('Bar Centro');
    expect(guardado.ficha?.valoracion).toBe(4.4);
    expect(guardado.ficha?.horario).toHaveLength(2);
    expect(guardado.posicionDe).toBe('google');
    expect(guardado.tienePosicion).toBe(true);
    expect(guardado.uso.fichas).toBeGreaterThanOrEqual(1);

    const [local] = await comoDuena<{ latitud: string }>(
      'select latitud::text as latitud from estook.local where id = $1',
      [centro],
    );
    expect(Number(local?.latitud)).toBeCloseTo(43.3183, 3);
  });

  it('actualizar la ficha el mismo día no vuelve a llamar a Google', async () => {
    const llamadas = google.llamadas.n;
    const hecho = losDatos<{ actualizada: boolean }>(
      await conGoogle.ejecutar(rosa, 'actualizar_mi_ficha_de_google', {}),
    );
    expect(hecho.actualizada).toBe(false);
    expect(google.llamadas.n).toBe(llamadas);
  });

  it('**la posición marcada a mano manda**: actualizar desde Google no la pisa', async () => {
    losDatos(
      await conGoogle.ejecutar(rosa, 'poner_donde_esta_el_local', {
        latitud: 43.1,
        longitud: -2.1,
      }),
    );
    expect((await loGuardado(rosa)).posicionDe).toBe('a_mano');

    // Se hace «viejo» lo leído para que actualizar llame de verdad.
    await comoDuena(
      "update estook.local set google_leido_en = now() - interval '2 days' where id = $1",
      [centro],
    );
    const hecho = losDatos<{ actualizada: boolean }>(
      await conGoogle.ejecutar(rosa, 'actualizar_mi_ficha_de_google', {}),
    );
    expect(hecho.actualizada).toBe(true);

    const [local] = await comoDuena<{ latitud: string; posicion_de: string }>(
      'select latitud::text as latitud, posicion_de from estook.local where id = $1',
      [centro],
    );
    expect(Number(local?.latitud)).toBeCloseTo(43.1, 3);
    expect(local?.posicion_de).toBe('a_mano');
  });

  it('**el tope corta antes de llamar**: Google no llega a enterarse', async () => {
    await comoDuena(
      'update estook.uso_de_google set cuantas = $1 where local_id = $2 and que = $3',
      [TOPES_DE_GOOGLE.fichasAlMes, centro, 'ficha'],
    );
    const llamadas = google.llamadas.n;

    const elegido = await conGoogle.ejecutar(rosa, 'elegir_mi_local_de_google', {
      id: 'lugar-de-prueba',
      sesion: null,
      usar_su_posicion: false,
    });
    expect(elFallo(elegido)).toBe('faltan_datos');
    expect(google.llamadas.n).toBe(llamadas);
    expect((await loGuardado(rosa)).uso.fichas).toBe(TOPES_DE_GOOGLE.fichasAlMes);
  });

  it('quien no lleva el local no puede ni buscarlo, ni ver lo gastado', async () => {
    const buscado = await conGoogle.ejecutar(marcos, 'buscar_mi_local_en_google', {
      texto: 'Bar Centro',
      sesion: SESION,
    });
    expect(elFallo(buscado)).toBe('sin_permiso');
    expect(elFallo(await conGoogle.consultar(marcos, 'mi_local_en_google'))).toBe('sin_permiso');
  });
});
