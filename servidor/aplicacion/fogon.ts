import {
  CREDITOS_DE_FOGON,
  PARTE_DEL_MES_AL_DIA,
  POR_QUE_NO_HABLA,
  cabeEnLosTopes,
  costeEnMicroEuros,
  creditosDelPlan,
  type LoGastado,
  type QueSeLePide,
} from '@estook/dominio';
import { FogonNoContesta, type ModeloDeFogon, type PeticionAFogon } from '../ia/modelo.ts';
import { apuntarUnFallo } from '../infraestructura/fallos.ts';
import { FalloDeAplicacion, falloQueSeGuarda, type Contexto } from './contrato.ts';

/**
 * El motor de Fogón (Fogón 1 · 1, decisión 0097).
 *
 * Todo lo que pide algo al modelo pasa por aquí, y aquí se cumplen las reglas que
 * Richi puso el 18-oct y las que ya estaban escritas:
 *
 *   1. **Si está encendido**: el interruptor general y el del cliente (los dos del
 *      admin), y la clave del servidor. Si no, se dice por qué, y no se gasta nada.
 *   2. **Si cabe en los topes**: créditos del día y del mes, y euros del día y del
 *      mes, **de todo el local**. Se mira antes de llamar: lo que no cabe no se gasta.
 *      Y se mira con el local bloqueado, para que dos pestañas a la vez no se pasen
 *      del tope entre las dos (como el contador de Google).
 *   3. **Cada llamada se apunta** con sus tokens y lo que costó, en la misma
 *      transacción. Si el modelo falla, se deshace todo y no cuenta: no se cobra.
 *
 * El resumen que lee el modelo lo arma `fogon-resumen.ts`, en el servidor (0023).
 */

export interface FogonDeLaSesion {
  readonly modelo: ModeloDeFogon;
  readonly organizacionId: string;
  readonly localId: string;
  readonly creditosDelMes: number;
}

export type ComoEstaFogon =
  | { readonly habla: true; readonly creditosDelMes: number }
  | {
      readonly habla: false;
      readonly porque: 'sin_clave' | 'apagado_general' | 'apagado_cliente' | 'sin_local';
    };

/** Lo que se le dice a la persona cuando Fogón no habla, por cada motivo. */
export const POR_QUE_ESTA_APAGADO = {
  sin_clave: 'Fogón todavía no está conectado: falta su clave en el servidor.',
  apagado_general: 'Fogón está apagado ahora mismo. Vuelve en un rato.',
  apagado_cliente: 'Fogón todavía no está encendido en tu negocio.',
  sin_local: 'Elige un local para hablar con Fogón.',
} as const;

/** Si Fogón habla aquí, y con cuántos créditos al mes. Sin gastar nada. */
export async function comoEstaFogon(contexto: Contexto): Promise<ComoEstaFogon> {
  const { sesion } = contexto;
  if (sesion?.localId == null || sesion.organizacionId == null) {
    return { habla: false, porque: 'sin_local' };
  }
  const filas = await contexto.sql<{ como: string; plan: string | null; de_la_casa: boolean }[]>`
    select como, plan, de_la_casa from estook.como_esta_fogon(${sesion.organizacionId}::uuid)
  `;
  const fila = filas[0];
  if (fila === undefined) return { habla: false, porque: 'apagado_cliente' };
  if (fila.como === 'apagado_general') return { habla: false, porque: 'apagado_general' };
  if (fila.como !== 'encendido') return { habla: false, porque: 'apagado_cliente' };
  // La clave, lo último: con Fogón encendido y sin clave es cosa nuestra, y se dice.
  if (contexto.fogon == null) return { habla: false, porque: 'sin_clave' };
  return { habla: true, creditosDelMes: creditosDelPlan(fila.plan, fila.de_la_casa) };
}

/** Lo gastado en el local hoy y este mes. Ceros si todavía no hay nada. */
export async function loGastadoEnElLocal(contexto: Contexto, localId: string): Promise<LoGastado> {
  const filas = await contexto.sql<
    {
      creditos_hoy: number;
      creditos_mes: number;
      micro_euros_hoy: string | number;
      micro_euros_mes: string | number;
    }[]
  >`
    select creditos_hoy, creditos_mes, micro_euros_hoy, micro_euros_mes
      from estook.lo_gastado_en_fogon(${localId}::uuid)
  `;
  const fila = filas[0];
  return {
    creditosHoy: fila?.creditos_hoy ?? 0,
    creditosMes: fila?.creditos_mes ?? 0,
    microEurosHoy: Number(fila?.micro_euros_hoy ?? 0),
    microEurosMes: Number(fila?.micro_euros_mes ?? 0),
  };
}

/** Lo que le queda a un local, para enseñarlo en Fogón. */
export interface LoQueQueda {
  readonly hoy: number;
  readonly mes: number;
  readonly delMes: number;
}

export function loQueQueda(gastado: LoGastado, creditosDelMes: number): LoQueQueda {
  const alDia = Math.floor(creditosDelMes / PARTE_DEL_MES_AL_DIA);
  return {
    hoy: Math.max(0, alDia - gastado.creditosHoy),
    mes: Math.max(0, creditosDelMes - gastado.creditosMes),
    delMes: creditosDelMes,
  };
}

/** Fogón, o el motivo por el que no habla, dicho para una persona. */
export async function elFogonDeLaSesion(contexto: Contexto): Promise<FogonDeLaSesion> {
  const como = await comoEstaFogon(contexto);
  if (!como.habla) {
    throw new FalloDeAplicacion('faltan_datos', { porque: POR_QUE_ESTA_APAGADO[como.porque] });
  }
  const { sesion } = contexto;
  const modelo = contexto.fogon;
  if (sesion?.localId == null || sesion.organizacionId == null || modelo == null) {
    throw new FalloDeAplicacion('faltan_datos', { porque: POR_QUE_ESTA_APAGADO.sin_local });
  }
  return {
    modelo,
    organizacionId: sesion.organizacionId,
    localId: sesion.localId,
    creditosDelMes: como.creditosDelMes,
  };
}

/** Lo que se apunta de una llamada, además de lo que dice el modelo. */
export interface LoQueSeApunta {
  readonly donde: string | null;
  readonly pregunta: string | null;
  /** El sello del resumen (0023): de qué local, a qué hora y cuántas letras. */
  readonly sello: Record<string, unknown>;
  /** La revisión de noche (0098): la lanza el reloj, y no se apunta a nadie. */
  readonly sinPersona?: boolean;
}

export interface LoQueContesta {
  readonly texto: string;
  readonly queda: LoQueQueda;
}

/**
 * Pedirle algo a Fogón: comprueba, llama, apunta. Lo que gasta sale de lo que se pide
 * (`CREDITOS_DE_FOGON`), nunca de lo que diga el cliente.
 */
export async function pedirAFogon(
  contexto: Contexto,
  fogon: FogonDeLaSesion,
  que: QueSeLePide,
  peticion: PeticionAFogon,
  apunte: LoQueSeApunta,
): Promise<LoQueContesta> {
  const creditos = CREDITOS_DE_FOGON[que];

  // 0023, regla uno: el resumen es del local de la sesión, o no se manda.
  if (apunte.sello['localId'] !== fogon.localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Has cambiado de local mientras preguntabas. Vuelve a preguntar.',
    });
  }

  // De una en una por local, hasta acabar la transacción: así el tope no se pasa.
  await contexto.sql`select pg_advisory_xact_lock(hashtext(${`fogon:${fogon.localId}`}))`;
  const gastado = await loGastadoEnElLocal(contexto, fogon.localId);
  const noCabe = cabeEnLosTopes(gastado, fogon.creditosDelMes, creditos);
  if (noCabe !== null) {
    throw new FalloDeAplicacion('faltan_datos', { porque: POR_QUE_NO_HABLA[noCabe] });
  }

  let respuesta;
  try {
    respuesta = await fogon.modelo.pedir(peticion);
  } catch (fallo) {
    if (fallo instanceof FogonNoContesta) {
      // El motivo de verdad, a los registros y a Sentry: a la persona, una frase.
      await apuntarUnFallo(fallo, {
        mensaje: 'Fogón no ha contestado',
        correlacionId: contexto.correlacionId,
        extra: { estado: fallo.estado, tipo: fallo.tipo, que },
      });
      throw new FalloDeAplicacion('faltan_datos', {
        porque:
          fallo.estado === 429 || fallo.estado === 529
            ? 'Fogón está muy ocupado ahora mismo. Prueba otra vez en un minuto.'
            : 'Fogón no ha podido contestar. No se ha gastado nada: prueba otra vez en un rato.',
      });
    }
    throw fallo;
  }
  const coste = costeEnMicroEuros(respuesta.modelo, respuesta.tokens);
  await contexto.sql`
    insert into estook.llamada_a_fogon
      (organizacion_id, local_id, persona_id, que, donde, pregunta, sello, modelo,
       tokens_entrada, tokens_cache_leidos, tokens_cache_escritos, tokens_salida,
       coste_micro_euros, creditos, hecha_en)
    values (${fogon.organizacionId}::uuid, ${fogon.localId}::uuid,
            ${apunte.sinPersona === true ? null : contexto.personaId}::uuid,
            ${que}, ${apunte.donde}, ${apunte.pregunta},
            ${JSON.stringify(apunte.sello)}::text::jsonb, ${respuesta.modelo},
            ${respuesta.tokens.entrada}, ${respuesta.tokens.cacheLeidos},
            ${respuesta.tokens.cacheEscritos}, ${respuesta.tokens.salida},
            ${coste}, ${creditos}, ${contexto.ahora.toISOString()}::timestamptz)
  `;

  // **Lo contestado se cuenta aunque no sirva** (auditoría del 20-oct): Anthropic lo
  // cobra igual. Antes, un rechazo o una respuesta que no se entendía deshacía la
  // transacción con el apunte dentro, y no contaba para el tope del local.
  if (respuesta.rechazada || respuesta.texto === '') {
    throw falloQueSeGuarda('faltan_datos', {
      porque: 'Fogón no ha sabido contestar a eso. Prueba a decirlo de otra forma.',
    });
  }

  const despues: LoGastado = {
    creditosHoy: gastado.creditosHoy + creditos,
    creditosMes: gastado.creditosMes + creditos,
    microEurosHoy: gastado.microEurosHoy + coste,
    microEurosMes: gastado.microEurosMes + coste,
  };
  return { texto: respuesta.texto, queda: loQueQueda(despues, fogon.creditosDelMes) };
}

/**
 * Lo que contesta el modelo cuando se le pide un JSON (salida estructurada). Si no se
 * deja leer, se dice: no se rellena nada a medias.
 */
export function leerElJson(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    // Con lo gastado apuntado: la llamada ya está hecha (auditoría del 20-oct).
    throw falloQueSeGuarda('faltan_datos', {
      porque:
        'Fogón ha contestado algo que no se entiende. No se ha rellenado nada: prueba otra vez.',
    });
  }
}

/**
 * Por qué no contesta el modelo, dicho para Richi (0097): lo que enseña «Probar la
 * conexión» en el admin. Sale del código y del tipo de error que da Anthropic.
 */
export function porQueNoContesta(fallo: FogonNoContesta): string {
  const dice = fallo.detalle.toLowerCase();
  if (fallo.estado === 401 || fallo.tipo === 'authentication_error') {
    return 'La clave no vale. Cópiala otra vez de Anthropic y ponla en Supabase como AI_API_KEY, sin espacios.';
  }
  if (dice.includes('credit balance') || dice.includes('billing')) {
    return 'La cuenta de Anthropic no tiene saldo disponible. Mira en su web, en facturación, que el pago esté hecho y en la misma organización que la clave.';
  }
  if (fallo.estado === 403 || fallo.tipo === 'permission_error') {
    return 'La clave no tiene permiso para usar el modelo. Mira en Anthropic que la clave sea de la organización con saldo.';
  }
  if (fallo.estado === 404 || fallo.tipo === 'not_found_error') {
    return 'El modelo no existe con ese nombre. Quita AI_MODELO_RAPIDO de Supabase (sin él, usa claude-haiku-5-5).';
  }
  if (fallo.estado === 429 || fallo.tipo === 'rate_limit_error') {
    return 'Anthropic frena: o se ha llegado al límite de gasto del mes, o a su límite de peticiones. Mira los límites en su web.';
  }
  if (fallo.estado === 529 || fallo.tipo === 'overloaded_error' || (fallo.estado ?? 0) >= 500) {
    return 'Anthropic está saturado ahora mismo. Prueba otra vez en unos minutos.';
  }
  if (fallo.estado === 400 || fallo.tipo === 'invalid_request_error') {
    return 'Anthropic no acepta la petición tal como va: es cosa nuestra. Pásale el detalle de abajo a la IA.';
  }
  return 'No se ha podido llegar a Anthropic desde el servidor. Pásale el detalle de abajo a la IA.';
}
