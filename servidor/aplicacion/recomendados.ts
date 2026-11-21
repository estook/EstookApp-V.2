import { TOPE_DE_RECOMENDADOS } from '@estook/dominio';
import { laOrganizacionDeLaSesion } from './alta.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * **Recomendar un plato** (0120; el rediseño, entrega 3). Lo hacen la Carta (`recomendar_plato`) y
 * Ajustes del TPV › Productos (`cambiar_boton_del_tpv`), y escriben lo mismo: es del plato.
 *
 * **Ocho como mucho** (Richi, 21-nov): si todo está recomendado, nada lo está. Al llegar al tope,
 * dice cuáles hay para que se quite uno. Quitar siempre se puede.
 */
export async function recomendarElPlato(
  contexto: Contexto,
  localId: string,
  platoId: string,
  recomendado: boolean,
): Promise<void> {
  if (recomendado) {
    const ya = await contexto.sql<{ id: string; nombre: string }[]>`
      select id::text as id, nombre from estook.plato
       where local_id = ${localId}::uuid and recomendado and activo
       order by nombre
    `;
    const otros = ya.filter((p) => p.id !== platoId);
    if (otros.length >= TOPE_DE_RECOMENDADOS) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: `Ya recomiendas ${String(TOPE_DE_RECOMENDADOS)} platos (${otros
          .map((p) => p.nombre)
          .join(', ')}). Quita uno para recomendar este: si todo está recomendado, nada lo está.`,
      });
    }
  }
  const cambiados = await contexto.sql<{ id: string }[]>`
    update estook.plato set recomendado = ${recomendado}
     where id = ${platoId}::uuid and local_id = ${localId}::uuid
    returning id::text as id
  `;
  // La base solo deja escribir el plato a quien edita la Carta: sin fila, no podía.
  if (cambiados.length === 0) throw new FalloDeAplicacion('sin_permiso');
  await contexto.sql`
    select estook.anotar(
      ${laOrganizacionDeLaSesion(contexto)}::uuid, ${recomendado ? 'recomendar' : 'dejar_de_recomendar'},
      'plato', ${platoId}, ${localId}::uuid, null,
      ${JSON.stringify({ recomendado })}::text::jsonb, null
    )
  `;
}
