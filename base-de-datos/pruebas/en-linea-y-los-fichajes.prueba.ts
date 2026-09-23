import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levantarBase, type BaseDePrueba } from './entorno.ts';
import { elFallo, losDatos, montarLaApi, type ApiDePrueba } from './despachador.ts';

/**
 * Dos cosas de la ficha de una persona, del repaso del 23-sep-2026.
 *
 *   · **«En línea» es tener la app abierta** (0042), y no tener una sesión sin
 *     cerrar. Y lo ve igual quien lleva a esa persona, tenga o no el permiso de
 *     quitar accesos: antes un jefe de cocina veía a todos fuera de línea.
 *   · **Sus fichajes: los tres últimos, y el historial entero aparte**, por páginas
 *     y contando bien aunque se pida más allá del final.
 */
let base: BaseDePrueba;
let api: ApiDePrueba;

const ROSA = 'rosa@ejemplo.estook.com'; // gerente de Bar Centro
const MARCOS = 'marcos@ejemplo.estook.com'; // cocinero de Bar Centro
const NURIA = 'nuria@ejemplo.estook.com'; // camarera del Grupo Costa
const LUIS = 'luis@ejemplo.estook.com'; // jefe de cocina del Grupo Costa
const PABLO = 'pablo@ejemplo.estook.com'; // Casa Lola: otro negocio

let rosa: string;
let marcos: string;
let marcosId: string;

interface Ficha {
  enLinea: boolean;
  ultimoAccesoEn: string | null;
  ultimosFichajes: { fichajeId: string; fecha: string }[];
  cuantosFichajes: number;
}

interface Historial {
  fichajes: { fichajeId: string; fecha: string }[];
  cuantos: number;
  hayMas: boolean;
}

const laFicha = async () =>
  losDatos<Ficha>(await api.consultar(rosa, 'una_persona', { persona_id: marcosId }));

async function comoDuena(consulta: string, parametros: unknown[] = []) {
  await base.bd.query(consulta, parametros);
}

beforeAll(async () => {
  base = await levantarBase();
  api = montarLaApi(base.bd);
  rosa = await api.entrar(ROSA);
  marcos = await api.entrar(MARCOS);
  marcosId = await base.personaPorCorreo(MARCOS);
}, 120_000);

afterAll(async () => {
  await base.cerrar();
});

describe('en línea es tener la app abierta', () => {
  it('con la sesión abierta pero sin avisar, no está en línea', async () => {
    // Marcos ha entrado —su sesión está viva— y no ha avisado de nada: es el
    // teléfono en el bolsillo. Hasta la 0042 esto salía «en línea».
    expect((await laFicha()).enLinea).toBe(false);
  });

  it('con la app a la vista sí, y al esconderla deja de estarlo', async () => {
    losDatos(await api.ejecutar(marcos, 'sigo_aqui', { a_la_vista: true }));
    const viendola = await laFicha();
    expect(viendola.enLinea).toBe(true);
    // Y «última vez» es el aviso, no la entrada.
    expect(viendola.ultimoAccesoEn).not.toBeNull();

    losDatos(await api.ejecutar(marcos, 'sigo_aqui', { a_la_vista: false }));
    expect((await laFicha()).enLinea).toBe(false);
  });

  it('si el aparato deja de avisar, en dos minutos deja de salir', async () => {
    losDatos(await api.ejecutar(marcos, 'sigo_aqui', { a_la_vista: true }));
    expect((await laFicha()).enLinea).toBe(true);

    // Sin cobertura, o cerrada de golpe: el último aviso se queda viejo.
    await comoDuena(
      `update estook.sesion set visto_en = now() - interval '3 minutes'
        where persona_id = $1 and cerrada_en is null`,
      [marcosId],
    );
    expect((await laFicha()).enLinea).toBe(false);
  });

  it('al salir deja de estar en línea aunque su último aviso sea de ahora', async () => {
    const otra = await api.entrar(MARCOS);
    losDatos(await api.ejecutar(otra, 'sigo_aqui', { a_la_vista: true }));
    expect((await laFicha()).enLinea).toBe(true);
    losDatos(await api.ejecutar(otra, 'salir', {}));
    expect((await laFicha()).enLinea).toBe(false);
  });

  it('el aviso no se guarda para repetirlo: no llena la tabla de idempotencia', async () => {
    const cuantas = async () => {
      const { rows } = await base.bd.query<{ n: number }>(
        'select count(*)::int as n from estook.clave_de_idempotencia',
      );
      return rows[0]?.n ?? 0;
    };
    const antes = await cuantas();
    for (let i = 0; i < 3; i++) {
      losDatos(await api.ejecutar(marcos, 'sigo_aqui', { a_la_vista: true }, `latido-${i}`));
    }
    expect(await cuantas()).toBe(antes);
  });

  it('lo ve quien lleva a esa persona, aunque no pueda cerrarle las sesiones', async () => {
    // El jefe de cocina no tiene `accion.invitar_personas`, así que las políticas
    // de la 0018 no le dejan leer las sesiones de nadie más. Por eso veía a todos
    // fuera de línea. Ahora pregunta a la base, que contesta sí o no y nada más.
    const nuria = await api.entrar(NURIA);
    losDatos(await api.ejecutar(nuria, 'sigo_aqui', { a_la_vista: true }));
    const nuriaId = await base.personaPorCorreo(NURIA);

    const luisId = await base.personaPorCorreo(LUIS);
    const comoLuis = await base.comoPersona(luisId, async () => {
      const { rows } = await base.bd.query<{ en_linea: boolean; sesiones: number }>(
        `select estook.esta_en_linea($1) as en_linea,
                (select count(*)::int from estook.sesion where persona_id = $1) as sesiones`,
        [nuriaId],
      );
      return rows[0];
    });
    expect(comoLuis?.sesiones).toBe(0);
    expect(comoLuis?.en_linea).toBe(true);
  });

  it('de otro negocio no contesta nada: ni si está, ni cuándo se le vio', async () => {
    const nuriaId = await base.personaPorCorreo(NURIA);
    const pabloId = await base.personaPorCorreo(PABLO);
    const comoPablo = await base.comoPersona(pabloId, async () => {
      const { rows } = await base.bd.query<{ en_linea: boolean; visto: string | null }>(
        `select estook.esta_en_linea($1) as en_linea,
                estook.visto_por_ultima_vez($1)::text as visto`,
        [nuriaId],
      );
      return rows[0];
    });
    expect(comoPablo?.en_linea).toBe(false);
    expect(comoPablo?.visto).toBeNull();
  });
});

describe('sus fichajes: los tres últimos, y el historial entero', () => {
  beforeAll(async () => {
    const centro = await base.localPorCodigo('bar-centro');
    for (let dias = 1; dias <= 5; dias++) {
      await comoDuena(
        `insert into estook.fichaje (
           local_id, persona_id, fecha_operativa, entro_en, salio_en,
           entro_latitud, entro_longitud, salio_latitud, salio_longitud
         )
         select l.id, $2, current_date - $3::int,
                ((current_date - $3::int) + time '10:00') at time zone l.zona_horaria,
                ((current_date - $3::int) + time '16:00') at time zone l.zona_horaria,
                43.3, -1.98, 43.3, -1.98
           from estook.local l where l.id = $1`,
        [centro, marcosId, dias],
      );
    }
  });

  it('la ficha trae los tres últimos y dice cuántos hay', async () => {
    const ficha = await laFicha();
    expect(ficha.ultimosFichajes).toHaveLength(3);
    expect(ficha.cuantosFichajes).toBe(5);
    // Del último hacia atrás.
    const fechas = ficha.ultimosFichajes.map((f) => f.fecha);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it('el historial va por páginas, sin repetir ni perder ninguno', async () => {
    const pagina = async (salto: number) =>
      losDatos<Historial>(
        await api.consultar(rosa, 'fichajes_de_una_persona', {
          persona_id: marcosId,
          limite: '2',
          salto: String(salto),
        }),
      );

    const primera = await pagina(0);
    const segunda = await pagina(2);
    const tercera = await pagina(4);
    expect(primera.cuantos).toBe(5);
    expect([primera.hayMas, segunda.hayMas, tercera.hayMas]).toEqual([true, true, false]);

    const todos = [...primera.fichajes, ...segunda.fichajes, ...tercera.fichajes];
    expect(new Set(todos.map((f) => f.fichajeId)).size).toBe(5);

    // Más allá del final: ninguno, pero el total sigue siendo el de verdad.
    const despues = await pagina(10);
    expect(despues.fichajes).toHaveLength(0);
    expect(despues.cuantos).toBe(5);
    expect(despues.hayMas).toBe(false);
  });

  it('cada uno ve su historial, y un cocinero no ve el de su gerente', async () => {
    const suyo = await api.consultar(marcos, 'fichajes_de_una_persona', {
      persona_id: marcosId,
    });
    expect(losDatos<Historial>(suyo).cuantos).toBe(5);

    const deRosa = await api.consultar(marcos, 'fichajes_de_una_persona', {
      persona_id: await base.personaPorCorreo(ROSA),
    });
    expect(elFallo(deRosa)).toBe('no_existe');
  });
});
