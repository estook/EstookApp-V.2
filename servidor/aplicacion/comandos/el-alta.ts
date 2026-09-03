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
             onboarding_terminado_en = coalesce(onboarding_terminado_en, now())
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
 * Volver a abrir el alta.
 *
 * Existe para la tarjeta del Panel: quien se saltó la mitad y un día quiere
 * completarla vuelve por donde estaba. **No borra nada**: lo respondido sigue
 * respondido, y el alta se abre en el primer paso que falte.
 */
export const retomarElAlta = comando<{ paso: string }, { paso: string }>({
  nombre: 'retomar_el_alta',
  entrada: z.object({ paso: z.enum(CODIGOS_DE_PASO as unknown as [string, ...string[]]) }).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const numero = numeroDelPaso(entrada.paso as (typeof CODIGOS_DE_PASO)[number]);

    await contexto.sql`
      update estook.local
         set onboarding_paso = ${numero},
             onboarding_terminado = false,
             onboarding_terminado_en = null
       where id = ${localId}
    `;

    return { paso: entrada.paso };
  },
});
