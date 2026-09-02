import { z } from 'zod';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Quitar los ejemplos (M5).
 *
 * «Un solo botón, **Quitar los ejemplos**, los borra todos de golpe»
 * (Manifiesto 8).
 *
 * ── Lo que este comando NO sabe, y es su gracia ──────────────────────────────
 *
 * No sabe qué tablas tienen ejemplos. Se lo dice el registro
 * `estook.dato_de_ejemplo`, donde cada módulo apunta lo que crea de mentira, y
 * `estook.quitar_ejemplos` los borra del más nuevo al más viejo.
 *
 * Es a propósito. Con la lista de tablas escrita aquí, este fichero habría que
 * ampliarlo en M6, M7, M9, M10, M14 y M16, y el día que a alguien se le olvidara
 * quedarían ejemplos sueltos contaminando el food cost de un local de verdad.
 * Así, un módulo nuevo apunta lo suyo y este botón se entera solo.
 *
 * ── Y por qué la función no lleva `security definer` ─────────────────────────
 *
 * Porque borrar un ejemplo es borrar una fila del local, y quien no pueda
 * borrarla no debe poder hacerlo por aquí. Si una política dice que no, la fila
 * se queda y el apunte también: **mejor un ejemplo de más que un borrado que se
 * salta la seguridad** (principio 7).
 */
export const quitarLosEjemplos = comando<
  Record<string, never>,
  { readonly borrados: number; readonly quedan: number }
>({
  nombre: 'quitar_los_ejemplos',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const borradas = await contexto.sql<{ quitar_ejemplos: number }[]>`
      select estook.quitar_ejemplos(${localId}::uuid) as quitar_ejemplos
    `;
    const borrados = borradas[0]?.quitar_ejemplos;
    if (borrados === undefined) throw new FalloDeAplicacion('fallo_nuestro');

    const restantes = await contexto.sql<{ contar_ejemplos: number }[]>`
      select estook.contar_ejemplos(${localId}::uuid) as contar_ejemplos
    `;
    const quedan = restantes[0]?.contar_ejemplos ?? 0;

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'borrar', 'ejemplos', ${localId},
        ${localId}::uuid, null,
        ${JSON.stringify({ borrados, quedan })}::jsonb, null
      )
    `;

    // **Quién tiene que enterarse**: la salud de los datos y el Panel, porque
    // hasta ahora los ejemplos no contaban y ahora tampoco están. Y M21, que si
    // hubiera agregados calculados tendría que rehacerlos.
    await publicar(contexto.sql, {
      tipo: 'ejemplos.quitados',
      organizacionId,
      localId,
      datos: { borrados },
      correlacionId: contexto.correlacionId,
    });

    return { borrados, quedan };
  },
});
