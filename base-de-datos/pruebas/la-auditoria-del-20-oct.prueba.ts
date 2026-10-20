import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';

/**
 * La auditoría del 20-oct: lo que encontró, probado contra la API de verdad.
 *
 * Cada `describe` es un fallo que se vio con un barrido automático de las 307
 * operaciones de la API (desde otra organización y con cada rol) o repasando a mano.
 * Está contado en la decisión 0101.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

async function laFichaDe(codigo: string) {
  const { rows } = await base.bd.query<{ zona_horaria: string; hora_de_corte: string }>(
    `select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
       from estook.local where codigo = $1`,
    [codigo],
  );
  return rows[0];
}

const DONDE_ESTA = {
  nombre: 'Bar Centro',
  direccion: 'Calle Mayor 1',
  codigo_postal: '28001',
  poblacion: 'Madrid',
  provincia: 'Madrid',
  telefono: null,
};

describe('la zona horaria del local', () => {
  /*
    El barrido guardó «2026-10-19» como zona de un local: la API lo aceptó, y desde ahí
    crear un proveedor, escribir en el tablón o abrir el inventario de ese local daban
    «se nos ha roto algo». Una zona que no existe no se guarda.
  */
  it('una zona que no existe no entra, y el local sigue funcionando', async () => {
    const rosa = await api.entrar(ROSA);
    const mala = await api.ejecutar(rosa, 'guardar_donde_esta', {
      ...DONDE_ESTA,
      zona_horaria: '2026-10-19',
    });
    expect(elFallo(mala)).toBe('faltan_datos');
    expect((await laFichaDe('bar-centro'))?.zona_horaria).toBe('Europe/Madrid');

    // Y lo que depende de la jornada sigue contestando.
    losDatos(await api.consultar(rosa, 'el_tablon'));
  });

  /*
    La pantalla de «¿Dónde está?» no manda la zona, y la API ponía Madrid cada vez que se
    guardaba: un local de Canarias volvía a la hora de Madrid sin que nadie lo tocara.
  */
  it('lo que no se manda se queda como estaba', async () => {
    const rosa = await api.entrar(ROSA);
    losDatos(
      await api.ejecutar(rosa, 'guardar_donde_esta', {
        ...DONDE_ESTA,
        zona_horaria: 'Atlantic/Canary',
        hora_de_corte: '04:00',
      }),
    );
    losDatos(await api.ejecutar(rosa, 'guardar_donde_esta', DONDE_ESTA));
    expect(await laFichaDe('bar-centro')).toEqual({
      zona_horaria: 'Atlantic/Canary',
      hora_de_corte: '04:00',
    });

    // Se deja como estaba para las demás pruebas de este fichero.
    losDatos(
      await api.ejecutar(rosa, 'guardar_donde_esta', {
        ...DONDE_ESTA,
        zona_horaria: 'Europe/Madrid',
        hora_de_corte: '05:00',
      }),
    );
  });
});
