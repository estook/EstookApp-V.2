import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CREDITOS_AL_MES, PARTE_DEL_MES_AL_DIA, TOPE_EN_EUROS } from '@estook/dominio';
import { modeloDeMentira } from '../../servidor/ia/modelo.ts';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Fogón 1 · 1 · la base (decisión 0097), con un modelo de mentira que no gasta y
 * guarda lo que le piden.
 *
 *   · apagado (general o del cliente) o sin clave: dice por qué y **no llama**
 *   · encendido: contesta, apunta la llamada y descuenta sus créditos
 *   · **los topes cortan antes de llamar**: créditos del día y euros del mes
 *   · el resumen lo arma el servidor, del local de la sesión, y **sin un euro** para
 *     quien no ve importes (un camarero)
 *   · rellenar y escribir pasos devuelven un borrador y **no guardan nada**
 *   · solo el admin total enciende y apaga
 */
let base: BaseDePrueba;
let api: ApiDePrueba;
let sinClave: ApiDePrueba;
const modelo = modeloDeMentira();

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero
const SARA = 'sara@ejemplo.estook.com'; // camarera

let rosa: string;
let marcos: string;
let sara: string;
let centro: string;
let organizacion: string;
let plato: string;

async function comoDuena<T>(consulta: string, parametros: unknown[] = []): Promise<T[]> {
  const { rows } = await base.bd.query<T>(consulta, parametros);
  return rows;
}

async function encender(general: boolean, cliente: boolean) {
  await comoDuena('update plataforma.fogon set encendido = $1 where unica', [general]);
  await comoDuena(
    `insert into plataforma.fogon_del_cliente (organizacion_id, encendido) values ($1, $2)
     on conflict (organizacion_id) do update set encendido = excluded.encendido`,
    [organizacion, cliente],
  );
}

const preguntar = (token: string, pregunta = '¿Qué tengo que atender hoy?', donde = '') =>
  api.ejecutar(token, 'preguntar_a_fogon', { pregunta, donde });

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd, { fogon: modelo });
  sinClave = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  sara = await api.entrar(SARA);
  centro = await base.localPorCodigo('bar-centro');
  const [org] = await comoDuena<{ organizacion_id: string }>(
    'select organizacion_id from estook.local where id = $1',
    [centro],
  );
  organizacion = org?.organizacion_id ?? '';
  plato =
    losDatos<{ creados: { platoId: string }[] }>(
      await api.ejecutar(rosa, 'crear_platos', {
        seccion_id: null,
        platos: [{ nombre: 'Croquetas de boletus', precio_centimos: 1200 }],
      }),
    ).creados[0]?.platoId ?? '';
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('apagado, no habla ni gasta', () => {
  it('de fábrica está apagado para todos, y lo dice', async () => {
    const yo = losDatos<{ habla: boolean; porque?: string }>(
      await api.consultar(rosa, 'fogon_y_yo'),
    );
    expect(yo.habla).toBe(false);
    expect(yo.porque).toMatch(/apagado ahora mismo/);
    expect(elFallo(await preguntar(rosa))).toBe('faltan_datos');
    expect(modelo.pedidas).toHaveLength(0);
  });

  it('con el general encendido y el cliente apagado, tampoco', async () => {
    await encender(true, false);
    const yo = losDatos<{ habla: boolean; porque?: string }>(
      await api.consultar(rosa, 'fogon_y_yo'),
    );
    expect(yo.porque).toMatch(/no está encendido en tu negocio/);
    expect(elFallo(await preguntar(rosa))).toBe('faltan_datos');
    expect(modelo.pedidas).toHaveLength(0);
  });

  it('encendido pero sin la clave en el servidor, dice que no está conectado', async () => {
    await encender(true, true);
    const token = await sinClave.entrar(ROSA);
    const yo = losDatos<{ habla: boolean; porque?: string }>(
      await sinClave.consultar(token, 'fogon_y_yo'),
    );
    expect(yo.porque).toMatch(/no está conectado/);
  });
});

describe('encendido', () => {
  it('contesta, apunta la llamada y descuenta un crédito', async () => {
    await encender(true, true);
    const antes = losDatos<{ queda: { hoy: number; mes: number; delMes: number } }>(
      await api.consultar(rosa, 'fogon_y_yo'),
    );
    expect(antes.queda.delMes).toBe(CREDITOS_AL_MES.pro);

    const contesta = losDatos<{ respuesta: string; queda: { mes: number } }>(await preguntar(rosa));
    expect(contesta.respuesta).toMatch(/Fogón de pruebas/);
    expect(contesta.queda.mes).toBe(antes.queda.mes - 1);

    const [apuntada] = await comoDuena<{
      que: string;
      creditos: number;
      coste: number;
      persona: string;
    }>(
      `select que, creditos, coste_micro_euros as coste, p.correo as persona
         from estook.llamada_a_fogon f join estook.persona p on p.id = f.persona_id
        order by hecha_en desc limit 1`,
    );
    expect(apuntada).toMatchObject({ que: 'preguntar', creditos: 1, persona: ROSA });
  });

  it('el resumen es del local de la sesión, con su sello, y lleva lo de hoy', async () => {
    const pedida = modelo.pedidas.at(-1);
    expect(pedida?.resumen).toMatch(/RESUMEN DE ESTOOK · Bar Centro/);
    expect(pedida?.resumen).toMatch(/ve importes/);
    const [sello] = await comoDuena<{ sello: { localId: string } }>(
      'select sello from estook.llamada_a_fogon order by hecha_en desc limit 1',
    );
    expect(sello?.sello.localId).toBe(centro);
  });

  it('a la camarera le contesta, pero sin un euro en lo que se manda', async () => {
    losDatos(await preguntar(sara, '¿Qué hay hoy?', 'almacen'));
    const pedida = modelo.pedidas.at(-1);
    expect(pedida?.resumen).toMatch(/NO ve importes/);
    // Los datos van después de la primera sección; la frase de arriba es la regla.
    const datos = pedida?.resumen.slice(pedida.resumen.indexOf('## ')) ?? '';
    expect(datos).toMatch(/Lo de hoy/);
    expect(datos).not.toMatch(/€|centimos|precio|coste|valor/i);
  });

  it('en el Almacén, lleva el Almacén de hoy y las compras, con los euros ya en euros', async () => {
    losDatos(await preguntar(rosa, '¿Qué falta?', 'almacen/compras'));
    const resumen = modelo.pedidas.at(-1)?.resumen ?? '';
    expect(resumen).toMatch(/Estás en: Almacén/);
    expect(resumen).toMatch(/## Almacén hoy/);
    expect(resumen).toMatch(/## Compras de hoy/);
    expect(resumen).toMatch(/0,00 €/);
    expect(resumen).not.toMatch(/Centimos/);
  });

  it('el cocinero puede preguntar, pero no rellenar escandallos', async () => {
    losDatos(await preguntar(marcos));
    expect(elFallo(await api.ejecutar(marcos, 'rellenar_con_fogon', { plato_id: plato }))).toBe(
      'sin_permiso',
    );
  });
});

describe('los borradores no guardan nada', () => {
  it('rellenar devuelve las líneas, y el plato sigue sin escandallo', async () => {
    const borrador = losDatos<{ raciones: number; lineas: { ingrediente: string }[] }>(
      await api.ejecutar(rosa, 'rellenar_con_fogon', { plato_id: plato, pista: 'con bechamel' }),
    );
    expect(borrador.lineas.map((l) => l.ingrediente)).toContain('Leche entera');
    // Le ha enseñado el Almacén solo con nombres: ni un precio.
    expect(modelo.pedidas.at(-1)?.resumen).toMatch(/PRODUCTOS DEL ALMACÉN/);
    expect(modelo.pedidas.at(-1)?.resumen).not.toMatch(/€/);
    const [receta] = await comoDuena<{ lineas: number }>(
      `select count(l.*)::int as lineas from estook.receta r
         left join estook.linea_de_receta l on l.receta_id = r.id where r.plato_id = $1`,
      [plato],
    );
    expect(receta?.lineas ?? 0).toBe(0);
  });

  it('escribir los pasos sin nada que leer dice qué hace falta, y no gasta', async () => {
    const pedidas = modelo.pedidas.length;
    expect(
      elFallo(await api.ejecutar(rosa, 'escribir_los_pasos_con_fogon', { plato_id: plato })),
    ).toBe('faltan_datos');
    expect(modelo.pedidas).toHaveLength(pedidas);
  });

  it('con un resumen, propone los pasos', async () => {
    const pasos = losDatos<{ pasos: string[]; minutos: number | null }>(
      await api.ejecutar(rosa, 'escribir_los_pasos_con_fogon', {
        plato_id: plato,
        resumen: 'bechamel espesa, enfriar, empanar y freír',
      }),
    );
    expect(pasos.pasos.length).toBeGreaterThan(0);
    expect(pasos.minutos).toBe(40);
  });
});

describe('los topes cortan antes de llamar', () => {
  it('con los créditos del día gastados, no llama', async () => {
    const alDia = CREDITOS_AL_MES.pro / PARTE_DEL_MES_AL_DIA;
    await comoDuena(
      `insert into estook.llamada_a_fogon (organizacion_id, local_id, que, modelo, creditos, coste_micro_euros)
       select $1, $2, 'preguntar', 'de-mentira', 10, 0 from generate_series(1, $3)`,
      [organizacion, centro, alDia / 10],
    );
    const pedidas = modelo.pedidas.length;
    const fallo = await preguntar(rosa);
    expect(elFallo(fallo)).toBe('faltan_datos');
    expect(JSON.stringify(fallo)).toMatch(/Mañana vuelve/);
    expect(modelo.pedidas).toHaveLength(pedidas);
  });

  it('con los euros del mes gastados, tampoco (aunque queden créditos)', async () => {
    await comoDuena('delete from estook.llamada_a_fogon');
    await comoDuena(
      `insert into estook.llamada_a_fogon (organizacion_id, local_id, que, modelo, creditos, coste_micro_euros)
       values ($1, $2, 'preguntar', 'de-mentira', 1, $3)`,
      [organizacion, centro, TOPE_EN_EUROS.mes],
    );
    const pedidas = modelo.pedidas.length;
    expect(elFallo(await preguntar(rosa))).toBe('faltan_datos');
    expect(modelo.pedidas).toHaveLength(pedidas);
  });
});

describe('los interruptores son del admin', () => {
  it('quien no es admin no los toca', async () => {
    expect(elFallo(await api.ejecutar(rosa, 'admin_encender_fogon', { encendido: true }))).toBe(
      'sin_permiso',
    );
    expect(elFallo(await api.consultar(rosa, 'admin_fogon'))).toBe('sin_permiso');
  });

  it('desde la app no se puede escribir en los interruptores', async () => {
    await expect(
      base.bd.exec(`
        begin;
        set local role estook_api;
        update plataforma.fogon set encendido = false where unica;
        commit;
      `),
    ).resolves.toBeDefined();
    // La política no deja: la fila sigue como estaba.
    const [fila] = await comoDuena<{ encendido: boolean }>(
      'select encendido from plataforma.fogon where unica',
    );
    expect(fila?.encendido).toBe(true);
  });
});
