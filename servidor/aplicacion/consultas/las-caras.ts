import { z } from 'zod';
import { firmarLasFotos, laFirmada } from '../fotos-firmadas.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Las caras de tu equipo (las bases firmes, 0084).
 *
 * «Las caras con foto también en el chat.» Desde la 0083 cada persona puede tener su
 * foto, pero solo la traían Personas, la ficha y «Equipo ahora»: el chat, las
 * incidencias, los turnos y las lecturas seguían con iniciales, porque cada una de
 * esas consultas tendría que haber firmado sus fotos por su cuenta.
 *
 * En vez de tocar veinte consultas, **una**: las fotos de quien ves, firmadas de una
 * tanda, que la app guarda media hora y pinta donde haya una cara (`CaraDe`). Cada
 * pantalla sigue trayendo lo suyo y la cara se busca aquí por su id.
 *
 * ── Quién sale ───────────────────────────────────────────────────────────────
 *
 * Las personas que ya ves (`personas_visibles`, las políticas de M1), activas y **con
 * foto**: sin foto no hay nada que mandar, y la cara son sus iniciales. Ni correo ni
 * rol: solo el nombre, que es lo que hace falta para las pantallas que solo lo tienen
 * a él (el chat dice «Rosa» y no su id).
 */
export interface UnaCara {
  readonly personaId: string;
  readonly nombre: string;
  readonly apellidos: string | null;
  readonly foto: string;
}

/** Más que esto no cabe en ningún equipo de un local; es un tope, no un límite real. */
const COMO_MUCHO = 400;

export const lasCaras = consulta<Record<string, never>, { readonly caras: readonly UnaCara[] }>({
  nombre: 'las_caras',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    if (contexto.personaId === null) throw new FalloDeAplicacion('sin_sesion');

    const filas = await contexto.sql<
      { id: string; nombre: string; apellidos: string | null; foto_clave: string }[]
    >`
      select p.id::text as id, p.nombre, p.apellidos, p.foto_clave
        from estook.persona p
       where p.activa
         and p.foto_clave is not null
         and p.id in (select persona_id from estook.personas_visibles())
       order by p.nombre
       limit ${COMO_MUCHO}
    `;

    const firmadas = await firmarLasFotos(
      contexto,
      filas.map((f) => f.foto_clave),
    );

    return {
      caras: filas.flatMap((f) => {
        const foto = laFirmada(firmadas, f.foto_clave);
        return foto === null
          ? []
          : [{ personaId: f.id, nombre: f.nombre, apellidos: f.apellidos, foto }];
      }),
    };
  },
});
