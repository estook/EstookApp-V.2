import { z } from 'zod';
import { IDIOMAS } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Cambiar el idioma propio (M2).
 *
 * Pequeno a proposito: es el comando que demuestra que la maquinaria entera
 * funciona. Toca todo lo que M2 tenia que traer:
 *
 *   · Solo puede cambiar el suyo, y eso lo impone la politica de M1.
 *   · Control optimista por version: si otra persona lo cambio mientras tanto,
 *     se para y se avisa.
 *   · Deja evento en la bandeja de salida, en la misma transaccion.
 *   · Es idempotente por la cabecera, como todos los comandos.
 *
 * «La interfaz en catalan, gallego, euskera o ingles se elige **por persona, no
 * por local**: en la misma cocina puede haber quien la quiera en castellano y
 * quien la quiera en ingles» (Manifiesto).
 */
export const entradaCambiarMiIdioma = z
  .object({
    idioma: z.enum(IDIOMAS),
    /** Con la que se empezo a editar. Si ya no es esa, alguien se adelanto. */
    version: z.number().int().positive(),
  })
  .strict();

export type EntradaCambiarMiIdioma = z.infer<typeof entradaCambiarMiIdioma>;

export const cambiarMiIdioma = comando<EntradaCambiarMiIdioma, { version: number }>({
  nombre: 'cambiar_mi_idioma',
  entrada: entradaCambiarMiIdioma,

  async ejecutar({ sql, personaId, correlacionId }, entrada) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');

    const cambiadas = await sql<{ version: number; idioma: string }[]>`
      update estook.persona
         set idioma = ${entrada.idioma}
       where id = ${personaId} and version = ${entrada.version}
      returning version, idioma::text as idioma
    `;

    const cambiada = cambiadas[0];
    if (!cambiada) {
      // O no existe, o alguien la cambio antes. Se distingue, porque el mensaje
      // que hay que ensenar no es el mismo.
      const existe = await sql<{ version: number }[]>`
        select version from estook.persona where id = ${personaId}
      `;
      if (existe[0]) {
        throw new FalloDeAplicacion('lo_cambio_otra_persona', {
          version_actual: existe[0].version,
        });
      }
      throw new FalloDeAplicacion('no_existe');
    }

    const organizaciones = await sql<{ organizacion_id: string }[]>`
      select organizacion_id from estook.organizaciones_visibles() limit 1
    `;
    const laOrganizacion = organizaciones[0]?.organizacion_id;

    if (laOrganizacion) {
      await publicar(sql, {
        tipo: 'persona.idioma_cambiado',
        organizacionId: laOrganizacion,
        datos: { persona_id: personaId, idioma: entrada.idioma },
        correlacionId,
      });
    }

    return { version: cambiada.version };
  },
});
