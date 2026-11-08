import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * **La pausa del 8-nov** (decisión 0142), contra la base: lo de P1 que vive en el servidor.
 *
 *   · el food cost real por semana (de lunes a domingo) y por trimestre natural
 *   · el nombre del negocio, que hasta ahora no se podía cambiar, solo lo cambia quien lleva
 *     la organización, y queda apuntado
 *   · los datos del local, desde Ajustes, con la hora de corte que no se pregunta
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
}, 60_000);

afterAll(async () => {
  await base.cerrar();
});

describe('el food cost real, por semana y por trimestre', () => {
  it('la semana va de lunes a domingo, la del día que se pide', async () => {
    const rosa = await api.entrar(ROSA);
    const f = losDatos<{ periodo: string; desde: string }>(
      await api.consultar(rosa, 'el_food_cost_real', { periodo: 'semana', dia: '2026-11-05' }),
    );
    expect(f.periodo).toBe('semana');
    // El 5-nov-2026 es jueves: su lunes, el 2.
    expect(f.desde).toBe('2026-11-02');
  });

  it('el trimestre es el natural del mes que se pide', async () => {
    const rosa = await api.entrar(ROSA);
    const f = losDatos<{ periodo: string; desde: string; hasta: string }>(
      await api.consultar(rosa, 'el_food_cost_real', { periodo: 'trimestre', mes: '2026-08' }),
    );
    expect(f.periodo).toBe('trimestre');
    expect(f.desde).toBe('2026-07-01');
    expect(f.hasta).toBe('2026-09-30');
  });

  it('un día mal escrito no llega a calcularse', async () => {
    const rosa = await api.entrar(ROSA);
    expect(
      elFallo(await api.consultar(rosa, 'el_food_cost_real', { periodo: 'semana', dia: '5-11' })),
    ).toBe('faltan_datos');
  });
});

describe('el nombre del negocio', () => {
  async function laOrganizacion(
    token: string,
  ): Promise<{ id: string; version: number; nombre: string }> {
    const yo = losDatos<{ organizacion: { id: string; version: number; nombre: string } }>(
      await api.consultar(token, 'quien_soy'),
    );
    return yo.organizacion;
  }

  it('quien no lleva los ajustes no lo cambia', async () => {
    const marcos = await api.entrar(MARCOS);
    const org = await laOrganizacion(marcos);
    expect(
      elFallo(
        await api.ejecutar(marcos, 'cambiar_nombre_del_negocio', {
          organizacion_id: org.id,
          nombre: 'Lo que yo diga',
          version: org.version,
        }),
      ),
    ).toBe('sin_permiso');
  });

  it('quien la lleva lo cambia, y queda apuntado quién y qué había', async () => {
    // Elena es la dirección de Grupo Costa: lleva la organización entera.
    const token = await api.entrar('elena@ejemplo.estook.com');
    const org = await laOrganizacion(token);
    losDatos(
      await api.ejecutar(token, 'cambiar_nombre_del_negocio', {
        organizacion_id: org.id,
        nombre: 'Grupo Centro',
        version: org.version,
      }),
    );
    expect((await laOrganizacion(token)).nombre).toBe('Grupo Centro');
    const { rows } = await base.bd.query<{ antes: { nombre: string } }>(
      `select antes from estook.auditoria
        where entidad = 'organizacion' and entidad_id = $1 and accion = 'modificar'
        order by ocurrido_en desc limit 1`,
      [org.id],
    );
    expect(rows[0]?.antes.nombre).toBe(org.nombre);
  });
});

describe('los datos del local, desde Ajustes', () => {
  it('se cambian después del alta, con la hora de corte de fábrica si no se toca', async () => {
    const rosa = await api.entrar(ROSA);
    losDatos(
      await api.ejecutar(rosa, 'guardar_donde_esta', {
        nombre: 'Bar Centro de Siempre',
        direccion: 'Calle Mayor, 1',
        codigo_postal: '20001',
        poblacion: 'Donostia',
        provincia: 'Gipuzkoa',
        telefono: '943 00 00 00',
        hora_de_corte: '05:00',
      }),
    );
    const alta = losDatos<{ nombre: string; ficha: { direccion: string; horaDeCorte: string } }>(
      await api.consultar(rosa, 'el_alta'),
    );
    expect(alta.nombre).toBe('Bar Centro de Siempre');
    expect(alta.ficha.direccion).toBe('Calle Mayor, 1');
    expect(alta.ficha.horaDeCorte.slice(0, 5)).toBe('05:00');
  });
});
