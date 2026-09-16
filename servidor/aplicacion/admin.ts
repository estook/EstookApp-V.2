import { comprobarCodigo } from '../dominio/doble-factor.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Lo que comparten los comandos del admin (0041).
 *
 * Dos cosas, y las dos tienen que hacerse igual en todos: dejar rastro y volver a
 * pedir el código antes de lo delicado. Escritas una vez, aquí, para que el
 * comando número veinte no se olvide de ninguna de las dos.
 */

export interface LineaDeAuditoria {
  readonly accion: string;
  readonly entidad: string;
  readonly entidadId: string | null;
  readonly antes?: Record<string, unknown> | null;
  readonly despues?: Record<string, unknown> | null;
  readonly motivo?: string | null;
}

/**
 * Una línea en la auditoría del admin, **siempre en nombre de quien llama**.
 *
 * El nivel se guarda el de ese momento, que lo pone la base; la sesión, para saber
 * después desde qué aparato; y la dirección de la petición. La política de la
 * tabla no deja escribir una línea a nombre de otra persona.
 */
export async function anotarEnElAdmin(contexto: Contexto, linea: LineaDeAuditoria): Promise<void> {
  const { sql, sesion } = contexto;
  if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

  // Lo que va a una columna JSON viaja como texto (0029).
  const antes =
    linea.antes === undefined || linea.antes === null ? null : JSON.stringify(linea.antes);
  const despues =
    linea.despues === undefined || linea.despues === null ? null : JSON.stringify(linea.despues);

  await sql`
    insert into plataforma.auditoria (
      persona_id, nivel, sesion_id, ip, correlacion_id,
      accion, entidad, entidad_id, antes, despues, motivo
    )
    values (
      ${sesion.personaId}::uuid,
      plataforma.nivel_de(${sesion.personaId}::uuid),
      ${sesion.id}::uuid,
      ${contexto.desde},
      ${contexto.correlacionId}::uuid,
      ${linea.accion},
      ${linea.entidad},
      ${linea.entidadId},
      ${antes}::text::jsonb,
      ${despues}::text::jsonb,
      ${linea.motivo ?? null}
    )
  `;
}

/**
 * El código del segundo factor, **otra vez**, antes de lo delicado.
 *
 * La sesión ya lo superó al entrar, y eso no basta para dar o quitar un acceso: un
 * portátil abierto en una mesa lleva ocho horas de sesión encima. Solo vale el de
 * la aplicación, no uno de respaldo: esos son para cuando se pierde el móvil, no
 * para firmar.
 */
export async function comprobarMiCodigo(contexto: Contexto, codigo: string): Promise<void> {
  const { sql, sesion, ahora } = contexto;
  if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

  const filas = await sql<{ secreto: string }[]>`
    select secreto from estook.doble_factor
     where persona_id = ${sesion.personaId}::uuid and confirmado_en is not null
  `;
  const secreto = filas[0]?.secreto;

  if (secreto === undefined || !(await comprobarCodigo(secreto, codigo, ahora))) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['codigo'],
      porque: 'Ese código no es el que enseña ahora tu aplicación de autenticación.',
    });
  }
}
