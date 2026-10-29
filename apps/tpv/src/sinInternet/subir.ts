import type { ErrorDeLaApi } from '@estook/cliente-api';
import type { DentroDelTpv } from '../datos/tipos.ts';
import { loQueEspera, type CosaPorSubir } from './laCola.ts';

/**
 * **Subir lo guardado al volver internet** (T5 · 2 · 1): en orden, una cosa detrás de otra,
 * cada una con su clave y **cuánto hace** que se hizo (la hora la pone el servidor). Sin
 * pantalla: quien llama le da cómo mandar y qué hacer con cada resultado, y así se prueba.
 *
 *   · **Una entrada sin internet** (el PIN cifrado) sube delante de lo de esa persona, y su
 *     turno pasa a lo que quedaba suyo en la cola.
 *   · **Sin red otra vez**, se para: lo que queda sigue en la cola, en su orden.
 *   · **Lo que Estook no acepta** se queda apuntado con el porqué, para que alguien lo mire,
 *     y se sigue con lo demás: una cosa rara no deja lo de los otros sin subir.
 */

export type Respuesta =
  | { readonly ok: true; readonly datos: unknown }
  | { readonly ok: false; readonly error: ErrorDeLaApi };

export type Mandar = (
  turno: string | null,
  nombre: string,
  entrada: unknown,
  clave: string,
  haceMs: number,
) => Promise<Respuesta>;

export interface AlSubir {
  readonly subida: (id: string) => void;
  readonly fallo: (id: string, porque: string) => void;
  /** La entrada de quien entró sin internet ya subió: este es su turno de verdad. */
  readonly entro: (entradaId: string, dentro: DentroDelTpv) => void;
}

export interface LoSubido {
  readonly subidas: number;
  readonly fallidas: number;
  /** Se cortó otra vez: lo que queda espera a la próxima. */
  readonly sinRed: boolean;
}

const SIN_SU_ENTRADA =
  'No se pudo comprobar el PIN de quien lo hizo. Si hace falta, hazlo otra vez desde la mesa.';

export async function subirLaCola(
  cola: readonly CosaPorSubir[],
  mandar: Mandar,
  ahora: () => number,
  al: AlSubir,
): Promise<LoSubido> {
  const turnos = new Map<string, string>();
  let subidas = 0;
  let fallidas = 0;

  for (const cosa of loQueEspera(cola)) {
    const turno = 'turno' in cosa.con ? cosa.con.turno : turnos.get(cosa.con.entrada);
    if (cosa.nombre !== 'entrar_con_pin' && turno === undefined) {
      // Su entrada no subió: sin ella no se sabe quién lo hizo, y nadie lo firma por otro.
      al.fallo(cosa.id, SIN_SU_ENTRADA);
      fallidas += 1;
      continue;
    }
    const respuesta = await mandar(
      cosa.nombre === 'entrar_con_pin' ? null : (turno ?? null),
      cosa.nombre,
      cosa.entrada,
      cosa.id,
      Math.max(0, ahora() - cosa.hechoEn),
    );
    if (respuesta.ok) {
      if (cosa.nombre === 'entrar_con_pin') {
        const dentro = respuesta.datos as DentroDelTpv;
        turnos.set(cosa.id, dentro.turno);
        al.entro(cosa.id, dentro);
      }
      al.subida(cosa.id);
      subidas += 1;
      continue;
    }
    if (respuesta.error.codigo === 'sin_conexion') return { subidas, fallidas, sinRed: true };
    // Bloquear un turno que ya no vale es lo que se quería: ya está cerrado.
    if (cosa.nombre === 'bloquear' && respuesta.error.codigo === 'sin_sesion') {
      al.subida(cosa.id);
      subidas += 1;
      continue;
    }
    al.fallo(cosa.id, respuesta.error.quePasa);
    fallidas += 1;
  }
  return { subidas, fallidas, sinRed: false };
}
