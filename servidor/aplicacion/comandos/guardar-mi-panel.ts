import { z } from 'zod';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Guardar como tengo montado el Panel (M6½).
 *
 * «La configuracion se guarda **por persona y por dispositivo**: el gerente puede
 * tener un Panel en el ordenador y otro distinto en el movil» (Manifiesto 6).
 *
 * ── Por que en el servidor y no en el navegador ──────────────────────────────
 *
 * Es la leccion de la 0024, escrita alli con estas palabras: «"para siempre" tiene
 * que ser para siempre **en todos sus aparatos**». Guardar el Panel en
 * `localStorage` seria montarselo en el ordenador y encontrarse el de fabrica en el
 * telefono, o perderlo entero al cambiar de movil. La composicion de la pantalla
 * que alguien ve cada manana no vive en un navegador.
 *
 * ── Lo que este comando no hace ──────────────────────────────────────────────
 *
 * **No comprueba que los widgets existan**, y esta razonado en `mi_panel`: el
 * catalogo es navegacion y vive en la pantalla. Lo que si hace es lo que le toca a
 * un comando:
 *
 *   · Solo se puede guardar el propio, y eso lo impone la politica de la 0025:
 *     `persona_id = estook.persona_actual()`. No hay forma de escribir el de otro
 *     ni pidiendolo.
 *   · Acotado a veinticuatro, como la restriccion de la tabla. «Nada de scroll
 *     infinito en el Panel»: lo que hay, se ve, y se acaba.
 *   · Idempotente por la cabecera, como todos.
 *
 * ── Y no publica evento, a proposito ─────────────────────────────────────────
 *
 * Es la primera vez en el proyecto que un comando no deja nada en la bandeja, y
 * conviene decir por que: **no le interesa a nadie mas**. La regla 14 pregunta
 * «¿quien se entera cuando esto cambie?», y aqui la respuesta honesta es nadie:
 * mover un widget de sitio no cambia ni un dato del negocio, no dispara ninguna
 * reaccion y no hay ninguna otra parte de Estook que deba reaccionar. Publicar un
 * evento por cada arrastre seria llenar la bandeja de ruido —y la bandeja todavia
 * no la vacia nadie (el reloj es M8)—.
 *
 * Tampoco entra en la auditoria, y por lo mismo: la auditoria es «de todo lo que
 * toca dinero, permisos o registros legales», y esto no toca ninguno de los tres.
 */
export const entradaGuardarMiPanel = z
  .object({
    aparato: z.enum(['movil', 'escritorio']),
    widgets: z
      .array(
        z
          .object({
            // Un identificador de widget: minusculas y guiones, como los de la
            // direccion. No se comprueba que exista —eso es del catalogo— pero si
            // que tiene forma de identificador y no de parrafo.
            id: z
              .string()
              .min(1)
              .max(60)
              .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
            tamano: z.enum(['chico', 'ancho', 'grande']),
          })
          .strict(),
      )
      .max(24),
    /**
     * Con la que se empezo a editar. Cero cuando todavia no habia fila.
     *
     * Aqui el control optimista **si hace falta**, aunque el Panel sea de una sola
     * persona: la misma persona puede tener abierta la aplicacion en el movil y en
     * el ordenador. Sin esto, guardar en uno se llevaria por delante lo que acaba
     * de hacer en el otro sin decir nada.
     */
    version: z.number().int().min(0),
  })
  .strict();

export type EntradaGuardarMiPanel = z.infer<typeof entradaGuardarMiPanel>;

export const guardarMiPanel = comando<EntradaGuardarMiPanel, { version: number }>({
  nombre: 'guardar_mi_panel',
  entrada: entradaGuardarMiPanel,

  async ejecutar({ sql, personaId }, entrada) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');

    const comoJson = JSON.stringify(entrada.widgets);

    // Primera vez: no hay fila que actualizar. `on conflict do nothing` y no
    // `do update`, para que dos pestanas abiertas a la vez no se pisen en
    // silencio: si ya existe, se cae al camino de abajo y alli se compara version.
    if (entrada.version === 0) {
      const puestas = await sql<{ version: number }[]>`
        insert into estook.panel_de_persona (persona_id, aparato, widgets)
        values (${personaId}, ${entrada.aparato}, ${comoJson}::jsonb)
        on conflict (persona_id, aparato) do nothing
        returning version
      `;
      const puesta = puestas[0];
      if (puesta) return { version: puesta.version };

      const existe = await sql<{ version: number }[]>`
        select version from estook.panel_de_persona
         where persona_id = ${personaId} and aparato = ${entrada.aparato}
      `;
      throw new FalloDeAplicacion('lo_cambio_otra_persona', {
        version_actual: existe[0]?.version ?? 0,
      });
    }

    const cambiadas = await sql<{ version: number }[]>`
      update estook.panel_de_persona
         set widgets = ${comoJson}::jsonb
       where persona_id = ${personaId}
         and aparato = ${entrada.aparato}
         and version = ${entrada.version}
      returning version
    `;

    const cambiada = cambiadas[0];
    if (cambiada) return { version: cambiada.version };

    const existe = await sql<{ version: number }[]>`
      select version from estook.panel_de_persona
       where persona_id = ${personaId} and aparato = ${entrada.aparato}
    `;
    if (existe[0]) {
      throw new FalloDeAplicacion('lo_cambio_otra_persona', {
        version_actual: existe[0].version,
      });
    }
    throw new FalloDeAplicacion('no_existe');
  },
});
