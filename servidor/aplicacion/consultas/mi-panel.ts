import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Como tiene montado el Panel esta persona, en este aparato (M6½).
 *
 * ── Por que el servidor no sabe que widgets existen ──────────────────────────
 *
 * Porque no es asunto suyo. El catalogo de widgets —cual hay, que ensena cada
 * uno, que permiso pide y que tamanos admite— es **navegacion**, y vive donde vive
 * el de las apps: en `packages/ui`. El servidor guarda la eleccion y la devuelve
 * tal cual, y la pantalla se queda con lo que sepa pintar.
 *
 * Eso no es dejar la puerta abierta: es que aqui no hay nada que cerrar. Lo unico
 * que llega es una lista de identificadores que **solo esta persona puede leer y
 * escribir**, y que solo se usa para decidir en que orden se pintan unas tarjetas
 * cuyos datos vienen, cada uno, de su propia consulta con su propio permiso. Un
 * identificador inventado no ensena nada: se ignora al pintar.
 *
 * La alternativa —validar aqui la lista de widgets— obligaria a una migracion o a
 * un despliegue de la API por cada widget nuevo, que es justo la clase de
 * acoplamiento que hace que nadie anada widgets.
 *
 * ── Y por que devuelve nulo en vez de un Panel de fabrica ────────────────────
 *
 * Porque «con que Panel empieza cada rol» tambien es del catalogo. Si el servidor
 * devolviera una lista por defecto habria **dos** listas de fabrica, la suya y la
 * del codigo de pantalla, y un dia dirian cosas distintas (regla 6). Aqui `null`
 * quiere decir «esta persona no ha tocado nada todavia», que es un dato distinto
 * de «tiene el Panel vacio a proposito» —y eso segundo se puede: una lista vacia
 * se guarda y se respeta—.
 */
export const entradaMiPanel = z
  .object({
    aparato: z.enum(['movil', 'escritorio']),
  })
  .strict();

export type EntradaMiPanel = z.infer<typeof entradaMiPanel>;

export interface SalidaMiPanel {
  /** Nulo si nunca lo ha tocado. Lista vacia si lo ha vaciado a proposito. */
  readonly widgets: readonly { readonly id: string; readonly tamano: string }[] | null;
  /** Para el control optimista al guardar. Cero cuando todavia no hay fila. */
  readonly version: number;
}

export const miPanel = consulta<EntradaMiPanel, SalidaMiPanel>({
  nombre: 'mi_panel',
  entrada: entradaMiPanel,

  async ejecutar(contexto, entrada) {
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await contexto.sql<{ widgets: unknown; version: number }[]>`
      select widgets, version
        from estook.panel_de_persona
       where persona_id = ${personaId} and aparato = ${entrada.aparato}
    `;

    const fila = filas[0];
    if (fila === undefined) return { widgets: null, version: 0 };

    // Lo que salga que no tenga forma de widget se cae aqui y no en la pantalla.
    // Es una lista JSON escrita por un cliente: puede venir de una version de la
    // aplicacion que ya no existe.
    const lista = Array.isArray(fila.widgets) ? fila.widgets : [];
    const widgets = lista.flatMap((suelto) => {
      if (typeof suelto !== 'object' || suelto === null) return [];
      const puesto = suelto as { id?: unknown; tamano?: unknown };
      if (typeof puesto.id !== 'string' || typeof puesto.tamano !== 'string') return [];
      return [{ id: puesto.id, tamano: puesto.tamano }];
    });

    return { widgets, version: fila.version };
  },
});
