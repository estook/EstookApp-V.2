import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Lo que recuerda tu cuenta (las bases firmes, 0084 · migración 0066).
 *
 * Dos comandos pequeños, de la persona y solo suyos (la política lo impone:
 * `persona_id = estook.persona_actual()`), y por eso:
 *
 *   · **Sin evento y sin auditoría**, como mover un widget (`guardar_mi_panel`): no
 *     cambian ni un dato del negocio ni le interesan a nadie más.
 *   · **Sin pagar también** (0048): son de la persona y no apuntan nada.
 *   · **Sin control de versión**: lo último que se elige es lo que vale. Dos aparatos
 *     cambiando el periodo de la merma a la vez no se pisan nada que importe, y un
 *     «lo cambió otra persona» por esto sería ruido.
 */

/** Un identificador de widget: minúsculas y guiones, como en `guardar_mi_panel`. */
const idDeWidget = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const entradaPonerElPeriodoDelWidget = z
  .object({
    widget: idDeWidget,
    // La semana o el mes, los dos periodos que ofrece cada widget.
    dias: z.union([z.literal(7), z.literal(30)]),
  })
  .strict();

export type EntradaPonerElPeriodoDelWidget = z.infer<typeof entradaPonerElPeriodoDelWidget>;

/**
 * El periodo de un widget, para todos tus aparatos: «que el móvil y el ordenador lo
 * recuerden igual» (Richi, 14-oct).
 */
export const ponerElPeriodoDelWidget = comando<EntradaPonerElPeriodoDelWidget, { hecho: true }>({
  nombre: 'poner_el_periodo_del_widget',
  sinPagar: true,
  entrada: entradaPonerElPeriodoDelWidget,

  async ejecutar({ sql, personaId }, { widget, dias }) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');
    const uno = JSON.stringify({ [widget]: dias });
    await sql`
      insert into estook.preferencias_de_persona (persona_id, periodos)
      values (${personaId}, ${uno}::text::jsonb)
      on conflict (persona_id) do update
        set periodos = estook.preferencias_de_persona.periodos || excluded.periodos
    `;
    return { hecho: true };
  },
});

export const entradaYaHeVistoElRecorrido = z.object({}).strict();

/** El recorrido de la primera vez (0084), visto o saltado: no vuelve a salir. */
export const yaHeVistoElRecorrido = comando<Record<string, never>, { hecho: true }>({
  nombre: 'ya_he_visto_el_recorrido',
  sinPagar: true,
  entrada: entradaYaHeVistoElRecorrido,

  async ejecutar({ sql, personaId }) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');
    // La primera vez que se vio es la que cuenta: volver a decirlo no la mueve.
    await sql`
      insert into estook.preferencias_de_persona (persona_id, recorrido_visto_en)
      values (${personaId}, now())
      on conflict (persona_id) do update
        set recorrido_visto_en = coalesce(
          estook.preferencias_de_persona.recorrido_visto_en,
          excluded.recorrido_visto_en
        )
    `;
    return { hecho: true };
  },
});
