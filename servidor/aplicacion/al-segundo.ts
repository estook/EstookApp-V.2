import type { AlSegundo, ToqueAlSegundo } from '../infraestructura/al-segundo.ts';
import type { Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * Los toques al segundo, con el comando ya guardado (C1 · 0073).
 *
 * Darlo **antes** de guardar sería avisar de algo que todavía no se puede leer: la app
 * preguntaría, no vería nada y se quedaría así hasta la siguiente vuelta. Así que se
 * apuntan aquí, por petición, y el despachador los da al terminar, igual que el correo
 * y el móvil. Los usan el chat (un canal) y la campana (`campana`).
 */
const toquesPendientes = new Map<string, { alSegundo: AlSegundo; toques: ToqueAlSegundo[] }>();

/** Da los toques que dejó esta petición. Nunca lanza: un toque perdido no rompe nada. */
export async function darLosToques(correlacionId: string): Promise<void> {
  const pendiente = toquesPendientes.get(correlacionId);
  toquesPendientes.delete(correlacionId);
  if (pendiente === undefined || pendiente.toques.length === 0) return;
  try {
    await pendiente.alSegundo.avisar(pendiente.toques);
  } catch {
    // La app pregunta cada poco de todas formas: nada se pierde.
  }
}

function apuntar(contexto: Contexto, temas: readonly string[], canalId: string): void {
  const alSegundo = contexto.alSegundo ?? null;
  if (alSegundo === null || temas.length === 0) return;
  const pendiente = toquesPendientes.get(contexto.correlacionId) ?? { alSegundo, toques: [] };
  for (const tema of temas) {
    if (!pendiente.toques.some((t) => t.tema === tema && t.canalId === canalId)) {
      pendiente.toques.push({ tema, canalId });
    }
  }
  toquesPendientes.set(contexto.correlacionId, pendiente);
}

/** «Hay algo nuevo en este canal», a todos los que lo ven, también a quien lo hizo. */
export async function tocarElCanal(contexto: Contexto, canalId: string): Promise<void> {
  if ((contexto.alSegundo ?? null) === null) return;
  const temas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ tema: string }[]>`
      select t.tema
        from estook.quien_ve_el_canal(${canalId}::uuid) q
        join estook.tema_al_segundo t on t.persona_id = q.persona_id
    `,
  );
  apuntar(
    contexto,
    temas.map((t) => t.tema),
    canalId,
  );
}

/** «Hay algo nuevo en tu campana» (0071, lo que decido yo, 6). */
export async function tocarLaCampana(
  contexto: Contexto,
  personas: readonly string[],
): Promise<void> {
  if ((contexto.alSegundo ?? null) === null || personas.length === 0) return;
  const temas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ tema: string }[]>`
      select tema from estook.tema_al_segundo
       where persona_id = any (${comoLista(personas)}::text::uuid[])
    `,
  );
  apuntar(
    contexto,
    temas.map((t) => t.tema),
    'campana',
  );
}
