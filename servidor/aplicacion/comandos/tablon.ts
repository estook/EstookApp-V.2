import { z } from 'zod';
import { masDias } from '@estook/dominio';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { elLocalDelTablon, hoyEnElLocal } from '../consultas/tablon.ts';

/**
 * Escribir en el Tablón, marcar una nota leída y quitarla (repaso del 25-sep ·
 * decisión 0049). Lo que se ve, en `consultas/tablon.ts`.
 *
 * **No piden ningún permiso**: el Tablón es de todo el equipo del local, como el
 * corcho de la cocina. Quién puede escribir, leer y quitar lo deciden las
 * políticas de la tabla —escribe cualquiera del local y a su nombre; quita su
 * autor o quien lleva al equipo—, y aquí se dice en cristiano cuando no pasa.
 */

/** Hasta dónde se puede apuntar por delante: un mes. Una reserva de Navidad, en diciembre. */
const DIAS_QUE_SE_PUEDE_ADELANTAR = 31;

export const entradaEscribirEnElTablon = z
  .object({
    texto: z.string().trim().min(1, 'Escribe la nota.').max(280, 'Como mucho, 280 letras.'),
    /** Para quién: toda la plantilla (sin mandarlo), la cocina o la sala. */
    zona: z.enum(['cocina', 'sala']).nullable().optional(),
    /**
     * Mañana, contado con el reloj y la zona del local y no con los del móvil
     * (regla 10): a las once y media de la noche, el «mañana» del aparato y el del
     * local pueden no ser el mismo.
     */
    manana: z.literal(true).optional(),
    /** Otro día, elegido en el calendario. Sin mandar esto ni `manana`, hoy. */
    dia: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.')
      .optional(),
    /** A qué hora, si la tiene: «17:00». Con hora sale en «Hoy» y en el Calendario. */
    hora: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora se escribe así: 17:00.')
      .nullable()
      .optional(),
  })
  .strict();

export type EntradaEscribirEnElTablon = z.infer<typeof entradaEscribirEnElTablon>;

export const escribirEnElTablon = comando<EntradaEscribirEnElTablon, { notaId: string }>({
  nombre: 'escribir_en_el_tablon',
  entrada: entradaEscribirEnElTablon,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelTablon(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const hoy = await hoyEnElLocal(contexto, localId);
    const dia = entrada.dia ?? (entrada.manana === true ? masDias(hoy, 1) : hoy);

    if (dia < hoy) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['dia'],
        porque: 'Ese día ya ha pasado. El tablón es para hoy y lo que viene.',
      });
    }
    if (dia > masDias(hoy, DIAS_QUE_SE_PUEDE_ADELANTAR)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['dia'],
        porque: 'Como mucho, un mes por delante. Para más, apúntalo más cerca de la fecha.',
      });
    }

    const puestas = await contexto.sql<{ id: string }[]>`
      insert into estook.nota_del_tablon (local_id, autor_id, texto, zona, dia, hora)
      values (
        ${localId}, ${contexto.personaId}, ${entrada.texto},
        ${entrada.zona ?? null}::estook.zona_del_producto,
        ${dia}::date, ${entrada.hora ?? null}::time
      )
      returning id
    `;
    const notaId = puestas[0]?.id;
    if (notaId === undefined) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'crear', 'nota_del_tablon', ${notaId}, ${localId}::uuid, null,
        ${JSON.stringify({ dia, hora: entrada.hora ?? null, zona: entrada.zona ?? null })}::text::jsonb,
        null
      )
    `;

    return { notaId };
  },
});

export const entradaDeUnaNota = z.object({ nota_id: z.string().uuid() }).strict();
export type EntradaDeUnaNota = z.infer<typeof entradaDeUnaNota>;

/** «Leída», una vez por persona: marcarla dos veces no hace nada. */
export const marcarNotaLeida = comando<EntradaDeUnaNota, { leida: true }>({
  nombre: 'marcar_nota_leida',
  entrada: entradaDeUnaNota,

  async ejecutar(contexto, entrada) {
    const hay = await contexto.sql<{ id: string }[]>`
      select id from estook.nota_del_tablon where id = ${entrada.nota_id} and quitada_en is null
    `;
    if (hay.length === 0) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa nota ya no está en el tablón: la han quitado.',
      });
    }
    await contexto.sql`
      insert into estook.nota_leida (nota_id, persona_id)
      values (${entrada.nota_id}, ${contexto.personaId})
      on conflict (nota_id, persona_id) do nothing
    `;
    return { leida: true };
  },
});

/** Quitarla del tablón antes de su día: su autor, o quien lleva al equipo. No se borra. */
export const quitarNota = comando<EntradaDeUnaNota, { quitada: true }>({
  nombre: 'quitar_nota',
  entrada: entradaDeUnaNota,

  async ejecutar(contexto, entrada) {
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const quitadas = await contexto.sql<{ id: string; local_id: string }[]>`
      update estook.nota_del_tablon
         set quitada_en = now(), quitada_por = ${contexto.personaId}
       where id = ${entrada.nota_id} and quitada_en is null
      returning id, local_id
    `;
    const quitada = quitadas[0];
    if (quitada === undefined) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque:
          'Esa nota la quita quien la escribió o quien lleva al equipo. Si ya no estaba, es que la han quitado.',
      });
    }
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'borrar', 'nota_del_tablon', ${quitada.id}, ${quitada.local_id}::uuid,
        null, null, null
      )
    `;
    return { quitada: true };
  },
});
