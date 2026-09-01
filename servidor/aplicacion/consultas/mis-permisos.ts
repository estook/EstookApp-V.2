import { z } from 'zod';
import { esPermiso, type Nivel, type PermisosResueltos } from '@estook/permisos';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * Los permisos de quien pregunta, sobre un local (M3).
 *
 * Es la consulta que hace posible la rueda de apps: «las apps que el rol no
 * tiene **no aparecen** y los sectores se reparten» (B5). Para repartirlos hay
 * que saber cuales tiene, y eso **lo dice el servidor**, nunca el cliente.
 *
 * ── Esto no protege nada, y es importante entenderlo ─────────────────────────
 *
 * «Esconder un boton no es proteger nada» (principio 7). Lo que se protege se
 * protege en la base de datos, con las politicas de M1, y en el servidor, que no
 * envia los campos que el rol no puede ver (el motor de permisos de M2).
 *
 * Esto sirve para **no ensenar lo que no toca**, que es otra cosa: que un
 * cocinero no vea ocho apps con seis candados, sino tres apps sin candados. «Un
 * cocinero no usa Estook con cosas ocultas, usa una aplicacion pensada para el»
 * (Manifiesto).
 *
 * Aunque alguien falsificara la respuesta, no ganaria nada: la pantalla se
 * pintaria y todas las consultas de detras devolverian vacio.
 *
 * ── Y por que sale de la base de datos ───────────────────────────────────────
 *
 * «La matriz de permisos vive **solo** en la base de datos» (decision de M1). Se
 * pregunta `nivel_de_permiso` permiso a permiso, contra el catalogo, en vez de
 * repetir la matriz aqui. Un calculo, un unico dueno (regla 6).
 */
export const misPermisos = consulta<{ local_id: string }, PermisosResueltos>({
  nombre: 'mis_permisos',
  entrada: z.object({ local_id: z.string().uuid() }).strict(),

  async ejecutar({ sql, personaId }, { local_id }) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');

    // Primero, que el local sea suyo. Se pregunta a las politicas y no se
    // comprueba a quien pertenece: si no lo devuelven, no se puede ver, y la
    // respuesta es la misma para «no existe» y para «no es tuyo».
    const suyos = await sql<{ local_id: string }[]>`
      select local_id from estook.locales_visibles() where local_id = ${local_id}
    `;
    if (!suyos[0]) throw new FalloDeAplicacion('local_ajeno');

    const filas = await sql<{ codigo: string; nivel: string }[]>`
      select p.codigo,
             estook.nivel_de_permiso(${personaId}::uuid, ${local_id}::uuid, p.codigo)::text
               as nivel
        from estook.permiso p
       order by p.codigo
    `;

    const resueltos: Record<string, Nivel> = {};
    for (const fila of filas) {
      // Los de `sin_acceso` no se envian: lo que no esta, no se tiene. Asi la
      // respuesta de un cocinero es un tercio de larga que la de un director.
      if (fila.nivel === 'sin_acceso') continue;
      // Si la base de datos trae un permiso que el vocabulario no conoce, se
      // ignora en vez de colarlo: el catalogo de `@estook/permisos` manda sobre
      // lo que el cliente puede recibir.
      if (!esPermiso(fila.codigo)) continue;
      resueltos[fila.codigo] = fila.nivel as Nivel;
    }

    return resueltos;
  },
});
