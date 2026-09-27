import {
  avisoDeNotaDeGoogle,
  fechaEnElLocal,
  horaDeCorte,
  jornadaDe,
  laNotaBaja,
  mesDe,
  topeDeGoogle,
  type FechaOperativa,
  type UsoDeGoogle,
} from '@estook/dominio';
import { GoogleNoContesta, type FichaDeGoogle } from '../infraestructura/google.ts';
import { avisar, quienesPuedenRecibir } from './avisos.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * La nota del local en Google (entrega R2, mejora 19 · decisión 0053).
 *
 * «Un punto medio: el que menos gaste sin dejarles desactualizados» (Richi, 27-sep).
 * Así queda:
 *
 *   · **El reloj la pone al día cada tres días**, sola: diez fichas al mes por local,
 *     que Google no cobra hasta unos cien locales.
 *   · **Y al mirarla**, en Negocio → Reseñas, si lleva más de un día sin mirarse.
 *   · **Solo de las cuentas que pagan o están en prueba**: las demás no se miran.
 *   · Todo dentro del tope de siempre (`contar`, cuarenta fichas al mes por local).
 *
 * Cada lectura deja la nota del día en `estook.nota_en_google`, que es su evolución,
 * y **si baja lo que enseña Google**, avisa a quien lleva Negocio.
 */

// ── El tope, antes de llamar (M7 · 0040) ──────────────────────────────────────
//
// Vive aquí desde R2 porque lo usan los comandos de Ajustes y la nota que pone al
// día el reloj: todo lo que llama a Google cuenta antes, por el mismo sitio.

/** El mes del local, con su reloj y su hora de corte (regla 10). */
async function elMes(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return mesDe(jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte)));
}

/**
 * Suma una al contador del mes, **solo si queda sitio**. Si no, corta con la
 * frase que dice cuánto y hasta cuándo.
 */
export async function contar(contexto: Contexto, localId: string, que: UsoDeGoogle): Promise<void> {
  const mes = await elMes(contexto, localId);
  const tope = topeDeGoogle(que);
  const sumadas = await contexto.sql<{ cuantas: number }[]>`
    insert into estook.uso_de_google (local_id, mes, que, cuantas)
    values (${localId}, ${mes}::date, ${que}, 1)
    on conflict (local_id, mes, que) do update
       set cuantas = estook.uso_de_google.cuantas + 1
     where estook.uso_de_google.cuantas < ${tope}
    returning cuantas
  `;
  if (sumadas.length === 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        que === 'ficha'
          ? `Este mes ya se han pedido ${tope} fichas a Google para este local, que es el tope. Vuelve a haber el día 1.`
          : `Este mes ya se han hecho ${tope} búsquedas en Google para este local, que es el tope. Vuelve a haber el día 1.`,
    });
  }
}

/** Lo que pasa si Google contesta mal, dicho para una persona. */
export async function preguntarA<T>(pregunta: () => Promise<T>): Promise<T> {
  try {
    return await pregunta();
  } catch (fallo) {
    if (fallo instanceof GoogleNoContesta || fallo instanceof TypeError) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Google no ha contestado bien. No se ha guardado nada: prueba otra vez en un rato.',
      });
    }
    throw fallo;
  }
}

// ── La nota ──────────────────────────────────────────────────────────────────

/** Cada cuántos días la pone al día el reloj. */
export const DIAS_ENTRE_LECTURAS = 3;

/** Con cuántas horas encima se vuelve a mirar al abrir Reseñas. */
export const HORAS_PARA_MIRARLA_OTRA_VEZ = 24;

/** El día de hoy en Madrid, que es el día de la nota. */
function elDia(contexto: Contexto): FechaOperativa {
  return fechaEnElLocal(contexto.ahora, 'Europe/Madrid');
}

/**
 * Las columnas de Google del local, las de la ficha y nada más. Lo usan quien la
 * elige o la actualiza desde Ajustes, a su nombre (y su permiso), y el reloj, como
 * sistema. Devuelve si ha cambiado alguna fila: la política decide.
 */
export async function ponerLaFicha(
  contexto: Contexto,
  localId: string,
  ficha: FichaDeGoogle,
): Promise<boolean> {
  const cambiadas = await contexto.sql<{ id: string }[]>`
    update estook.local
       set google_id = ${ficha.id},
           google_nombre = ${ficha.nombre},
           google_direccion = ${ficha.direccion},
           google_telefono = ${ficha.telefono},
           google_web = ${ficha.web},
           google_mapa = ${ficha.mapa},
           google_valoracion = ${ficha.valoracion}::numeric,
           google_resenas = ${ficha.resenas}::int,
           google_horario = ${ficha.horario === null ? null : JSON.stringify(ficha.horario)}::text::jsonb,
           google_leido_en = ${contexto.ahora.toISOString()}::timestamptz
     where id = ${localId}
    returning id::text as id
  `;
  return cambiadas.length > 0;
}

export interface LaNotaDeAntes {
  readonly googleId: string | null;
  readonly valoracion: number | null;
  readonly resenas: number | null;
}

/**
 * Deja la nota del día y, si ha bajado frente a la de antes **del mismo sitio de
 * Google**, avisa. Elegir otro sitio no es que baje la nota: es otra nota.
 */
export async function apuntarLaNota(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
  ficha: FichaDeGoogle,
  antes: LaNotaDeAntes,
): Promise<{ readonly baja: boolean }> {
  if (ficha.valoracion === null) return { baja: false };
  const dia = elDia(contexto);

  await enNombreDelSistema(contexto, async () => {
    await contexto.sql`
      insert into estook.nota_en_google (local_id, dia, valoracion, resenas, leida_en)
      values (${localId}, ${dia}::date, ${ficha.valoracion}::numeric, ${ficha.resenas}::int,
              ${contexto.ahora.toISOString()}::timestamptz)
      on conflict (local_id, dia) do update
         set valoracion = excluded.valoracion, resenas = excluded.resenas,
             leida_en = excluded.leida_en
    `;
  });

  const baja = antes.googleId === ficha.id && laNotaBaja(antes.valoracion, ficha.valoracion);
  if (baja && antes.valoracion !== null) {
    const dice = avisoDeNotaDeGoogle(
      antes.valoracion,
      ficha.valoracion,
      antes.resenas,
      ficha.resenas,
    );
    await avisar(
      contexto,
      {
        tipo: 'google.nota',
        organizacionId,
        localId,
        // Uno por lectura en la que baja; el de la vez anterior se queda viejo.
        clave: `${localId}:${dia}`,
        sustituyeA: `${localId}:`,
        texto: () => dice,
        ir: '/negocio/resenas',
        quien: null,
      },
      await quienesPuedenRecibir(contexto, localId, 'google.nota'),
    );
  }
  return { baja };
}

/**
 * Trae la ficha de Google otra vez y la guarda, **como el sistema**: la llama el
 * reloj, sin nadie delante, y Reseñas, a nombre de quien la mira pero sin pedirle
 * permiso de Ajustes (mirar la nota no es cambiar el local). Cuenta en el tope antes
 * de llamar; sin sitio en el tope, sin clave o sin enlazar, no hace nada.
 *
 * Devuelve si la ha puesto al día.
 */
export async function ponerAlDiaLaNota(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
): Promise<boolean> {
  const lugares = contexto.google;
  if (lugares === null) return false;

  return enNombreDelSistema(contexto, async () => {
    const filas = await contexto.sql<
      { google_id: string | null; valoracion: string | null; resenas: number | null }[]
    >`
      select google_id, google_valoracion::text as valoracion, google_resenas as resenas
        from estook.local where id = ${localId}
    `;
    const fila = filas[0];
    if (fila?.google_id === null || fila?.google_id === undefined) return false;
    const googleId = fila.google_id;

    try {
      await contar(contexto, localId, 'ficha');
    } catch {
      // El tope del mes está lleno: se queda la de antes, con su fecha.
      return false;
    }
    const ficha = await preguntarA(() => lugares.ficha(googleId, null));
    await ponerLaFicha(contexto, localId, ficha);
    await apuntarLaNota(contexto, organizacionId, localId, ficha, {
      googleId,
      valoracion: fila.valoracion === null ? null : Number(fila.valoracion),
      resenas: fila.resenas,
    });
    return true;
  });
}
