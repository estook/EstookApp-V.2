import { z } from 'zod';
import type { Destino as ADonde } from '@estook/dominio';
import { decidirDestino, guardarContexto } from '../acceso.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * Cambiar de organizacion o de local **sin abrir sesion nueva** (M4).
 *
 * «Cambiar de local no cierra la sesion: cambia el contexto, y el color y el logo
 *  de la cabecera, **para que nadie apunte una merma en el local equivocado**»
 * (Manifiesto 28).
 *
 * ── Por que esto es un comando y no un parametro ─────────────────────────────
 *
 * Podria no existir: cada consulta podria recibir `local_id` y listo. Y seria un
 * error, por dos razones.
 *
 * La primera es de seguridad: el local en el que se esta **lo decide el
 * servidor**, mirando `locales_visibles`. Si viajara en cada peticion, la
 * comprobacion habria que repetirla en cada una, y repetir una comprobacion en
 * treinta sitios es olvidarla en uno.
 *
 * La segunda es de producto: el contexto tiene que sobrevivir a cerrar el
 * navegador. Quien deja Bar Puerto abierto el martes y vuelve el miercoles,
 * vuelve a Bar Puerto. Si viviera en la pantalla, se perderia en cada recarga.
 *
 * ── Y por que no se comprueba de quien es el local ───────────────────────────
 *
 * Porque no hace falta, y comprobarlo seria peor. Se guarda, se vuelven a hacer
 * las seis comprobaciones, y si las politicas de M1 no devuelven ese local, la
 * resolucion no lo elige y devuelve `elegir_local`. La misma respuesta para «no
 * existe» y para «no es tuyo», igual que en `un_local`.
 */
export const entradaCambiarDeContexto = z
  .object({
    organizacion_id: z.string().uuid().nullable().optional(),
    local_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export type EntradaCambiarDeContexto = z.infer<typeof entradaCambiarDeContexto>;

export interface SalidaCambiarDeContexto {
  readonly destino: ADonde;
  readonly organizacionId: string | null;
  readonly localId: string | null;
  readonly porque: string;
}

export const cambiarDeContexto = comando<EntradaCambiarDeContexto, SalidaCambiarDeContexto>({
  nombre: 'cambiar_de_contexto',
  entrada: entradaCambiarDeContexto,

  async ejecutar(contexto, entrada) {
    if (contexto.sesion === null) throw new FalloDeAplicacion('sin_sesion');

    // Cambiar de organizacion borra el local: el que se traia era de la otra, y
    // dejarlo puesto es exactamente «apuntar una merma en el local equivocado».
    const cambiaDeOrganizacion =
      entrada.organizacion_id !== undefined &&
      entrada.organizacion_id !== contexto.sesion.organizacionId;

    const pedida =
      entrada.organizacion_id === undefined
        ? contexto.sesion.organizacionId
        : entrada.organizacion_id;

    const pedido = cambiaDeOrganizacion
      ? (entrada.local_id ?? null)
      : entrada.local_id === undefined
        ? contexto.sesion.localId
        : entrada.local_id;

    const destino = await decidirDestino(contexto.sql, {
      organizacionId: pedida,
      localId: pedido,
    });

    await guardarContexto(contexto, destino.organizacionId, destino.localId);

    if (destino.organizacionId !== null && destino.localId !== null) {
      await contexto.sql`
        select estook.anotar(
          ${destino.organizacionId}::uuid, 'cambiar_de_contexto', 'sesion',
          ${contexto.sesion.id}, ${destino.localId}::uuid, null, null, null
        )
      `;
    }

    return {
      destino: destino.destino,
      organizacionId: destino.organizacionId,
      localId: destino.localId,
      porque: destino.porque,
    };
  },
});
