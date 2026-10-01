import { z } from 'zod';
import {
  SUBIDA_QUE_AVISA_MAXIMA,
  SUBIDA_QUE_AVISA_MINIMA,
  TIPOS_DE_AVISO,
  avisoDeInvitacion,
  avisoDePedidoListo,
  type TipoDeAviso,
} from '@estook/dominio';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { avisar, quienesPuedenRecibir } from '../avisos.ts';
import { elPedidoBloqueado } from '../compras.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { irAlPedido } from '../lo-que-avisa.ts';

/**
 * La campana, y pedir ayuda con un pedido (entrega R · decisión 0052).
 *
 *   leer_avisos                    marcar leídos unos, o todos
 *   guardar_mis_avisos             Ajustes → Avisos: la campana, el correo y el móvil, de uno en uno
 *   guardar_la_subida_que_avisa    desde qué tanto por cien avisa una subida de precio
 *   pedir_ayuda_con_el_pedido      quien manda pedidos invita a alguien del almacén
 *   he_terminado_el_pedido         y ese alguien avisa de que ya está
 */

export const entradaLeerAvisos = z
  .object({
    /** Los que se han mirado. Sin mandarlo, todos. */
    ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  })
  .strict();

export const leerAvisos = comando<z.infer<typeof entradaLeerAvisos>, { leidos: number }>({
  nombre: 'leer_avisos',
  entrada: entradaLeerAvisos,

  async ejecutar(contexto, entrada) {
    // La política de la tabla solo deja tocar los tuyos, y el disparador, solo
    // «leído»: aunque llegaran ids de otro, no se marcaría nada suyo.
    const filas =
      entrada.ids === undefined
        ? await contexto.sql<{ id: string }[]>`
            update estook.aviso set leido_en = now()
             where persona_id = ${contexto.personaId} and leido_en is null
            returning id
          `
        : await contexto.sql<{ id: string }[]>`
            update estook.aviso set leido_en = now()
             where persona_id = ${contexto.personaId} and leido_en is null
               and id = any (${comoLista(entrada.ids)}::text::uuid[])
            returning id
          `;
    return { leidos: filas.length };
  },
});

export const entradaGuardarMisAvisos = z
  .object({
    tipo: z.enum(TIPOS_DE_AVISO as unknown as [TipoDeAviso, ...TipoDeAviso[]]),
    en_la_app: z.boolean(),
    por_correo: z.boolean(),
    /** Sin mandarlo, lo que hubiera (o el de fábrica): quien no toca el móvil no lo cambia. */
    al_movil: z.boolean().optional(),
  })
  .strict();

export const guardarMisAvisos = comando<
  z.infer<typeof entradaGuardarMisAvisos>,
  { enLaApp: boolean; porCorreo: boolean; alMovil: boolean | null }
>({
  nombre: 'guardar_mis_avisos',
  entrada: entradaGuardarMisAvisos,

  async ejecutar(contexto, entrada) {
    // Sin la campana no hay correo: se guarda coherente en vez de fallar, que es lo
    // que haría la pantalla al apagar la campana con el correo encendido.
    const porCorreo = entrada.en_la_app && entrada.por_correo;
    // El móvil, igual: sin campana no hay móvil (0070). Sin mandarlo, se deja como estaba.
    const alMovil = !entrada.en_la_app
      ? false
      : entrada.al_movil === undefined
        ? null
        : entrada.al_movil;
    const guardadas = await contexto.sql<{ al_movil: boolean | null }[]>`
      insert into estook.preferencia_de_aviso (persona_id, tipo, en_la_app, por_correo, al_movil)
      values (${contexto.personaId}, ${entrada.tipo}, ${entrada.en_la_app}, ${porCorreo}, ${alMovil})
      on conflict (persona_id, tipo) do update
        set en_la_app = excluded.en_la_app, por_correo = excluded.por_correo,
            al_movil = case
              when not excluded.en_la_app then false
              when ${entrada.al_movil === undefined} then estook.preferencia_de_aviso.al_movil
              else excluded.al_movil
            end,
            actualizado_en = now()
      returning al_movil
    `;
    return { enLaApp: entrada.en_la_app, porCorreo, alMovil: guardadas[0]?.al_movil ?? null };
  },
});

export const guardarLaSubidaQueAvisa = comando<{ porcentaje: number }, { porcentaje: number }>({
  nombre: 'guardar_la_subida_que_avisa',
  entrada: z
    .object({
      porcentaje: z
        .number()
        .int('Un número entero: 5, 8, 10.')
        .min(SUBIDA_QUE_AVISA_MINIMA, `Como poco, un ${String(SUBIDA_QUE_AVISA_MINIMA)} %.`)
        .max(SUBIDA_QUE_AVISA_MAXIMA, `Como mucho, un ${String(SUBIDA_QUE_AVISA_MAXIMA)} %.`),
    })
    .strict(),
  exige: 'accion.enviar_pedidos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const filas = await contexto.sql<{ id: string }[]>`
      update estook.local set subida_que_avisa = ${entrada.porcentaje}
       where id = ${localId}
      returning id
    `;
    if (filas[0] === undefined) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Esto lo cambia quien lleva los ajustes del local.',
      });
    }
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'local', ${localId}, ${localId}::uuid,
        null, ${JSON.stringify({ subida_que_avisa: entrada.porcentaje })}::text::jsonb, null
      )
    `;
    return { porcentaje: entrada.porcentaje };
  },
});

// ── Pedir ayuda con un pedido ────────────────────────────────────────────────

async function elProveedorDelPedido(
  contexto: Parameters<typeof elPedidoBloqueado>[0],
  proveedorId: string,
): Promise<string> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.proveedor where id = ${proveedorId}
  `;
  return filas[0]?.nombre ?? 'el proveedor';
}

async function miNombre(contexto: Parameters<typeof elPedidoBloqueado>[0]): Promise<string> {
  const filas = await contexto.sql<{ nombre: string }[]>`
    select nombre from estook.persona where id = ${contexto.personaId}
  `;
  return filas[0]?.nombre ?? 'Alguien';
}

export const entradaPedirAyuda = z
  .object({
    pedido_id: z.string().uuid(),
    personas: z.array(z.string().uuid()).min(1, 'Elige a quién.').max(10),
  })
  .strict();

/**
 * «Te han invitado a hacer este pedido» (entrega 2 de M7).
 *
 * Quien lo puede mandar pide a alguien del almacén que lo rellene —con prisa, casi
 * siempre: le llega a la campana y, de fábrica, también al correo—. Quien lo rellena
 * no lo puede mandar: pulsa «Listo» y lo manda quien se lo pidió. **Solo a quien
 * lleva el almacén en ese local**: pedir ayuda no da permisos a nadie.
 */
export const pedirAyudaConElPedido = comando<
  z.infer<typeof entradaPedirAyuda>,
  { invitadas: number }
>({
  nombre: 'pedir_ayuda_con_el_pedido',
  entrada: entradaPedirAyuda,
  exige: 'accion.enviar_pedidos',

  async ejecutar(contexto, entrada) {
    const pedido = await elPedidoBloqueado(contexto, entrada.pedido_id);
    if (pedido.estado !== 'borrador') {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ese pedido ya no está en borrador: ya no hay nada que rellenar.',
      });
    }

    const delAlmacen = await quienesPuedenRecibir(contexto, pedido.localId, 'pedido.invitacion');
    const pedidas = new Set(entrada.personas);
    const aQuien = delAlmacen.filter(
      (q) => pedidas.has(q.personaId) && q.personaId !== contexto.personaId,
    );
    if (aQuien.length !== pedidas.size) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['personas'],
        porque:
          'Solo se le puede pedir a quien lleva el almacén en este local, y a ti mismo no hace falta.',
      });
    }

    for (const quien of aQuien) {
      await contexto.sql`
        insert into estook.invitacion_a_pedido (pedido_id, persona_id, invitada_por)
        values (${pedido.id}, ${quien.personaId}, ${contexto.personaId})
        on conflict (pedido_id, persona_id) do update
          set invitada_por = excluded.invitada_por, invitada_en = now(), terminada_en = null
      `;
    }

    const quien = await miNombre(contexto);
    const proveedor = await elProveedorDelPedido(contexto, pedido.proveedorId);
    await avisar(
      contexto,
      {
        tipo: 'pedido.invitacion',
        organizacionId: laOrganizacionDeLaSesion(contexto),
        localId: pedido.localId,
        clave: pedido.id,
        texto: () => avisoDeInvitacion(quien, proveedor),
        ir: irAlPedido(pedido.id),
        quien,
        como: 'de_nuevo',
      },
      aQuien,
    );

    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'cambiar', 'pedido_de_compra', ${pedido.id},
        ${pedido.localId}::uuid, null,
        ${JSON.stringify({ ayuda_pedida_a: aQuien.map((q) => q.nombre) })}::text::jsonb, null
      )
    `;

    return { invitadas: aQuien.length };
  },
});

/** «Listo»: quien lo ha rellenado avisa a quien se lo pidió, que es quien lo manda. */
export const heTerminadoElPedido = comando<{ pedido_id: string }, { avisado: string }>({
  nombre: 'he_terminado_el_pedido',
  entrada: z.object({ pedido_id: z.string().uuid() }).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const pedido = await elPedidoBloqueado(contexto, entrada.pedido_id);
    if (pedido.estado !== 'borrador') {
      throw new FalloDeAplicacion('ya_hecho', {
        porque: 'Ese pedido ya se ha mandado o cancelado: no hace falta avisar.',
      });
    }

    const terminadas = await contexto.sql<{ invitada_por: string }[]>`
      update estook.invitacion_a_pedido set terminada_en = now()
       where pedido_id = ${pedido.id} and persona_id = ${contexto.personaId}
      returning invitada_por
    `;
    const invitacion = terminadas[0];
    if (invitacion === undefined) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'No te han pedido ayuda con este pedido.',
      });
    }

    // Mi invitación ya está hecha: fuera de mi campana.
    await contexto.sql`
      update estook.aviso set leido_en = now()
       where persona_id = ${contexto.personaId} and tipo = 'pedido.invitacion'
         and clave = ${pedido.id} and leido_en is null
    `;

    const aQuien = (await quienesPuedenRecibir(contexto, pedido.localId, 'pedido.listo')).filter(
      (q) => q.personaId === invitacion.invitada_por,
    );
    const quien = await miNombre(contexto);
    const proveedor = await elProveedorDelPedido(contexto, pedido.proveedorId);
    await avisar(
      contexto,
      {
        tipo: 'pedido.listo',
        organizacionId: laOrganizacionDeLaSesion(contexto),
        localId: pedido.localId,
        clave: pedido.id,
        texto: (quienes) => avisoDePedidoListo(quienes, proveedor),
        ir: irAlPedido(pedido.id),
        quien,
        como: 'de_nuevo',
      },
      aQuien,
    );

    return { avisado: aQuien[0]?.nombre ?? '' };
  },
});
