import { z } from 'zod';
import { CODIGOS_DE_PASO, CUANTOS_PASOS, numeroDelPaso } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Moverse por el alta (M5).
 *
 * Guardar cada paso es cosa de su comando —el tipo, la dirección, los
 * objetivos—; esto es solo el movimiento: saltar, terminar y volver a abrirla.
 *
 * ── Por qué saltar es un comando y no «no hacer nada» ────────────────────────
 *
 * Porque saltarse un paso **es una respuesta**, y hay que apuntarla. Si saltar
 * fuera simplemente pasar de pantalla, la barra de progreso no podría distinguir
 * «no ha llegado» de «no quiere», y la tarjeta del Panel no sabría qué volver a
 * ofrecer.
 */

export const saltarPaso = comando<{ paso: string }, { paso: string; siguiente: number }>({
  nombre: 'saltar_paso_del_alta',
  entrada: z.object({ paso: z.enum(CODIGOS_DE_PASO as unknown as [string, ...string[]]) }).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const siguiente = numeroDelPaso(entrada.paso as (typeof CODIGOS_DE_PASO)[number]) + 1;

    await contexto.sql`
      update estook.local
         set onboarding_paso = greatest(onboarding_paso, ${siguiente}),
             onboarding_saltados = (
               select array(select distinct unnest(onboarding_saltados || array[${entrada.paso}]::text[]))
             )
       where id = ${localId} and not onboarding_terminado
    `;

    return { paso: entrada.paso, siguiente };
  },
});

/**
 * Terminar el alta.
 *
 * A partir de aquí, la quinta comprobación al entrar deja de mandar al alta y
 * lleva al Panel. **Lo saltado sigue apuntado**: terminar no es completar, y la
 * tarjeta del Panel seguirá ofreciendo lo que falte.
 */
export const terminarElAlta = comando<Record<string, never>, { terminado: boolean }>({
  nombre: 'terminar_el_alta',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<{ onboarding_saltados: string[] }[]>`
      update estook.local
         set onboarding_paso = ${CUANTOS_PASOS},
             onboarding_terminado = true,
             onboarding_terminado_en = coalesce(onboarding_terminado_en, now()),
             -- El recado se cierra con el alta. La restricción de la 0022 no
             -- deja que quede uno abierto sobre un alta terminada, así que
             -- olvidarlo aquí no sería un despiste silencioso: sería un error.
             onboarding_retomado_para = null
       where id = ${localId}
      returning onboarding_saltados
    `;

    if (filas.length === 0) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'terminar', 'onboarding', ${localId},
        ${localId}::uuid, null,
        ${JSON.stringify({ saltados: filas[0]?.onboarding_saltados ?? [] })}::jsonb,
        null
      )
    `;

    // **Quién tiene que enterarse**: el Panel deja de enseñar el alta y empieza a
    // medir la salud de los datos; M26 empieza a contar los catorce días de
    // prueba desde algo real y no desde una cuenta vacía.
    await publicar(contexto.sql, {
      tipo: 'local.alta_terminado',
      organizacionId,
      localId,
      datos: { saltados: filas[0]?.onboarding_saltados ?? [] },
      correlacionId: contexto.correlacionId,
    });

    return { terminado: true };
  },
});

/**
 * Volver a abrir el alta, de dos maneras que no son la misma.
 *
 *   · **Un recado** (`solo_este_paso`): la tarjeta del Panel ofrece «Invita a tu
 *     equipo» y, debajo, «y 1 cosa más, **cuando quieras**». Se abre ese paso, y
 *     al guardarlo el alta se cierra y se vuelve al Panel.
 *   · **El asistente entero**: se abre por ese paso y se sigue hacia delante
 *     hasta el final, como la primera vez.
 *
 * **No borra nada** en ninguno de los dos casos: lo respondido sigue respondido.
 *
 * ── Por qué se dice y no se adivina ─────────────────────────────────────────
 *
 * El primer intento daba por hecho que reabrir siempre era un recado, y eso
 * rompió el alta entera: la prueba que la reabre por el principio para poder
 * recorrerla guardaba el primer paso y **se plantaba en el Panel**, porque el
 * servidor había decidido por su cuenta que era un recado de un solo paso.
 *
 * Se intentó deducirlo —«si el alta ya estaba terminada, es un recado»— y era
 * peor: el mismo recorrido se comportaba distinto la segunda vez que se corría,
 * según cómo lo hubiera dejado la primera. Una regla que depende de lo que pasó
 * antes es una regla que falla un martes.
 *
 * Así que lo dice quien llama. La tarjeta del Panel pide un recado porque eso es
 * lo que ofrece; quien quiera reabrir el alta entera no pasa la bandera.
 */
export const entradaRetomar = z
  .object({
    paso: z.enum(CODIGOS_DE_PASO as unknown as [string, ...string[]]),
    solo_este_paso: z.boolean().optional(),
  })
  .strict();

export type EntradaRetomar = z.infer<typeof entradaRetomar>;

export const retomarElAlta = comando<EntradaRetomar, { paso: string; soloEstePaso: boolean }>({
  nombre: 'retomar_el_alta',
  entrada: entradaRetomar,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const numero = numeroDelPaso(entrada.paso as (typeof CODIGOS_DE_PASO)[number]);
    const soloEstePaso = entrada.solo_este_paso === true;

    // `onboarding_retomado_para` deja escrito **a qué se vino**, y eso es lo que
    // hace que al guardar se vuelva al Panel en vez de seguir con lo siguiente.
    // Si no es un recado se pone a nulo, y no por limpieza: dejarlo puesto de una
    // vez anterior cerraría el alta a mitad del recorrido siguiente.
    await contexto.sql`
      update estook.local
         set onboarding_paso = ${numero},
             onboarding_terminado = false,
             onboarding_terminado_en = null,
             onboarding_retomado_para = ${soloEstePaso ? entrada.paso : null}
       where id = ${localId}
    `;

    return { paso: entrada.paso, soloEstePaso };
  },
});
