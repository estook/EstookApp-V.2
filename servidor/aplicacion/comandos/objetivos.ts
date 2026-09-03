import { z } from 'zod';
import { CLAVES_DE_OBJETIVO, type ClaveDeObjetivo } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion, respondido } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Poner los objetivos (M5) · segunda mitad del paso 6.
 *
 * «Son los que ponen en verde o en rojo los semáforos de toda la aplicación, y
 *  los que usa Fogón para decir si algo está bien o mal» (Manifiesto 9).
 *
 * ── Por qué esto no es un `update` ───────────────────────────────────────────
 *
 * Porque los objetivos **tienen vigencia**, igual que los tipos impositivos y
 * los precios. Cambiar el objetivo de materia prima en marzo no puede repintar
 * de rojo el informe de enero: enero se juzga con el objetivo que estaba puesto
 * en enero.
 *
 * Así que poner un objetivo es **cerrar el de ayer y abrir el de hoy**, nunca
 * editar la fila que hay. Un índice único sobre `(local, clave) where hasta is
 * null` garantiza que solo haya uno vivo, y lo garantiza la base de datos y no
 * el cuidado de quien escribe.
 *
 * ── Y por qué se guardan en fracción ─────────────────────────────────────────
 *
 * «Porcentajes con 4 decimales como fracción» (Auditoría, parte 7). 0,2800 es el
 * 28 %. La pantalla enseña 28 y aquí llega 0,28: convertir en un solo sitio es
 * lo que evita que un día alguien guarde 28 y tiña la aplicación entera de rojo.
 */

export const entradaObjetivos = z
  .object({
    objetivos: z
      .array(
        z.object({
          clave: z.enum(CLAVES_DE_OBJETIVO),
          /** Fracción, no porcentaje: 0,28 es el 28 %. */
          valor: z.number().min(0).max(1),
        }),
      )
      .min(1)
      .max(CLAVES_DE_OBJETIVO.length),
  })
  .strict()
  .refine((e) => new Set(e.objetivos.map((o) => o.clave)).size === e.objetivos.length, {
    message: 'Un objetivo no puede venir dos veces.',
  });

export type EntradaObjetivos = z.infer<typeof entradaObjetivos>;

export interface SalidaObjetivos {
  readonly puestos: readonly { readonly clave: ClaveDeObjetivo; readonly valor: number }[];
}

export const ponerObjetivos = comando<EntradaObjetivos, SalidaObjetivos>({
  nombre: 'poner_objetivos',
  entrada: entradaObjetivos,
  exige: 'accion.poner_objetivos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const hoy = contexto.ahora.toISOString().slice(0, 10);

    for (const objetivo of entrada.objetivos) {
      const vigentes = await contexto.sql<{ id: string; valor: string; desde: string }[]>`
        select id, valor::text as valor, desde::text as desde
          from estook.objetivo
         where local_id = ${localId} and clave = ${objetivo.clave}::estook.clave_de_objetivo
           and hasta is null
      `;
      const vigente = vigentes[0];

      // Poner el mismo número otra vez no abre una vigencia nueva. Sin esto, cada
      // visita a Ajustes dejaría una fila más y el histórico de objetivos sería
      // una lista de duplicados.
      if (vigente && Number(vigente.valor) === objetivo.valor) continue;

      if (vigente) {
        // El de ayer se cierra **ayer**, no hoy: si se cerrara hoy, habría un día
        // con dos objetivos vigentes y el semáforo no sabría cuál mirar.
        //
        // Y si el vigente empezó hoy mismo —alguien lo puso y lo corrige un
        // minuto después— cerrarlo ayer rompería su propia vigencia. En ese caso
        // se borra: no es un histórico, es una errata.
        if (vigente.desde === hoy) {
          await contexto.sql`delete from estook.objetivo where id = ${vigente.id}`;
        } else {
          await contexto.sql`
            update estook.objetivo
               set hasta = (${hoy}::date - 1)
             where id = ${vigente.id}
          `;
        }
      }

      const puestos = await contexto.sql<{ id: string }[]>`
        insert into estook.objetivo (local_id, clave, valor, desde, de_partida)
        values (
          ${localId}, ${objetivo.clave}::estook.clave_de_objetivo,
          ${objetivo.valor}, ${hoy}::date, false
        )
        returning id
      `;
      if (puestos.length === 0) throw new FalloDeAplicacion('sin_permiso');

      await contexto.sql`
        select estook.anotar(
          ${organizacionId}::uuid, 'cambiar', 'objetivo', ${objetivo.clave},
          ${localId}::uuid,
          ${JSON.stringify({ valor: vigente ? Number(vigente.valor) : null })}::jsonb,
          ${JSON.stringify({ valor: objetivo.valor })}::jsonb,
          null
        )
      `;
    }

    await respondido(contexto, localId, 'fiscal_y_objetivos');

    // **Quién tiene que enterarse** (regla 14): todos los semáforos de la
    // aplicación, los avisos y Pulse. Un objetivo nuevo cambia el color de media
    // aplicación sin que se haya movido un solo dato de negocio.
    await publicar(contexto.sql, {
      tipo: 'objetivo.cambiado',
      organizacionId,
      localId,
      datos: { objetivos: entrada.objetivos },
      correlacionId: contexto.correlacionId,
    });

    return { puestos: entrada.objetivos };
  },
});
