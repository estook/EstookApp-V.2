import {
  escucharAlSegundo as escuchar,
  haySegundo,
  type Escucha,
} from '@estook/cliente-api/al-segundo';

/**
 * Lo que llega al segundo en la app (C1 · decisión 0073): la escucha vive en
 * `@estook/cliente-api/al-segundo`, la misma que usa Estook TPV; aquí solo se le dice
 * dónde está Supabase, que es de esta construcción.
 */
const DONDE = {
  direccion: (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ?? '',
  clavePublica: (import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined) ?? '',
};

/** Si esta construcción sabe escuchar al segundo. Si no, el chat pregunta cada poco. */
export const HAY_AL_SEGUNDO = haySegundo(DONDE);

export type { Escucha };

export function escucharAlSegundo(
  tema: string,
  alLlegar: (canalId: string) => void,
  alCambiar: (conectado: boolean) => void,
): Escucha {
  return escuchar(DONDE, tema, alLlegar, alCambiar);
}
