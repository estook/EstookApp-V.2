import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { elLocalDelServicio } from '../sala.ts';
import {
  elClienteDelTelefono,
  laFichaDelCliente,
  lasMarcasDeLosClientes,
  veLasVentas,
  type LaFichaDelCliente,
  type LasMarcasDelCliente,
} from '../clientes-del-local.ts';

/**
 * **Los clientes de cada local**, leídos (la Ampliación 5 · 3, decisión 0153, sección 21; migración 0135).
 * Son de Estook TPV, y Estook TPV es de Pro, como las reservas.
 *
 *   la_ficha_del_cliente      su ficha: visitas, la última, gasto medio (si se ven las ventas), lo que
 *                             suele pedir, las veces que no vino, VIP, sus alergias y su nota
 *   buscar_al_cliente         en «+ Reserva», al escribir el teléfono: si ya es cliente, su nombre y
 *                             sus marcas («2 sin venir», la alergia)
 *   los_clientes_del_local    Servicio › Reservas › Clientes, en Estook: los de la última visita
 *                             primero, con buscador
 *
 * **Un cliente de otro local no sale nunca**: todo se pide con el local de la sesión, y la base solo
 * deja ver los de los locales donde uno lleva la sala.
 */

const id = z.string().uuid();

export const laFichaDelClienteConsulta = consulta<{ cliente_id: string }, LaFichaDelCliente>({
  nombre: 'la_ficha_del_cliente',
  entrada: z.object({ cliente_id: id }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'tambien',
  deEstookTpv: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const ficha = await laFichaDelCliente(contexto, localId, entrada.cliente_id);
    if (ficha === null) {
      throw new FalloDeAplicacion('no_existe', { porque: 'Ese cliente no está en este local.' });
    }
    return ficha;
  },
});

export interface ElClienteEncontrado {
  /** Nulo si con ese teléfono aún no ha reservado nadie en este local. */
  readonly cliente: (LasMarcasDelCliente & { readonly nombre: string }) | null;
}

export const buscarAlCliente = consulta<{ telefono: string }, ElClienteEncontrado>({
  nombre: 'buscar_al_cliente',
  // Con el número entero (nueve cifras como poco): no se van probando trozos.
  entrada: z.object({ telefono: z.string().trim().min(9).max(20) }).strict(),
  exige: 'accion.tomar_nota',
  enElTpv: 'solo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const encontrado = await elClienteDelTelefono(contexto, localId, entrada.telefono);
    if (encontrado === null) return { cliente: null };
    const marcas = (await lasMarcasDeLosClientes(contexto, localId, [encontrado.id])).get(
      encontrado.id,
    );
    return { cliente: marcas === undefined ? null : { ...marcas, nombre: encontrado.nombre } };
  },
});

export interface UnClienteDeLaLista extends LasMarcasDelCliente {
  readonly nombre: string;
  readonly telefono: string;
  readonly ultimaVisita: string | null;
}

export interface LosClientesDelLocal {
  readonly clientes: readonly UnClienteDeLaLista[];
  /** Si hay más de los que caben: entonces se busca. */
  readonly hayMas: boolean;
  /** Si quien mira puede borrar a un cliente (quien lleva los Ajustes del TPV). */
  readonly puedeBorrar: boolean;
  readonly veElGasto: boolean;
}

const CUANTOS = 100;

export const losClientesDelLocal = consulta<{ buscar?: string | undefined }, LosClientesDelLocal>({
  nombre: 'los_clientes_del_local',
  entrada: z.object({ buscar: z.string().trim().max(40).optional() }).strict(),
  exige: 'accion.tomar_nota',
  deEstookTpv: true,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelServicio(contexto);
    const texto = (entrada.buscar ?? '').trim();
    const cifras = texto.replace(/\D/g, '');
    const filas = await contexto.sql<{ id: string; nombre: string; telefono: string }[]>`
      select c.id::text as id, c.nombre, c.telefono
        from estook.cliente_del_local c
       where c.local_id = ${localId}::uuid
         and (
           ${texto} = ''
           or estook.sin_acentos(c.nombre) ilike '%' || estook.sin_acentos(${texto}) || '%'
           or (${cifras.length >= 3} and c.cifras like '%' || ${cifras} || '%')
         )
       -- Primero los de la última visita; luego los que han reservado hace menos y aún no han venido.
       order by (select max(r.dia) from estook.reserva r
                  where r.cliente_id = c.id and r.estado = 'sentada') desc nulls last,
                (select max(r.dia) from estook.reserva r where r.cliente_id = c.id) desc nulls last,
                c.nombre
       limit ${CUANTOS + 1}
    `;
    const estas = filas.slice(0, CUANTOS);
    const marcas = await lasMarcasDeLosClientes(
      contexto,
      localId,
      estas.map((f) => f.id),
    );
    const ultimas = await contexto.sql<{ id: string; ultima: string | null }[]>`
      select r.cliente_id::text as id, to_char(max(r.dia), 'YYYY-MM-DD') as ultima
        from estook.reserva r
       where r.local_id = ${localId}::uuid and r.estado = 'sentada'
         and r.cliente_id = any (${`{${estas.map((f) => f.id).join(',')}}`}::uuid[])
       group by r.cliente_id
    `;
    const ultimaDe = new Map(ultimas.map((u) => [u.id, u.ultima]));
    const [puede] = await contexto.sql<{ si: boolean }[]>`
      select estook.puede_editar('accion.ajustes_del_tpv', ${localId}::uuid) as si
    `;
    return {
      clientes: estas.flatMap((f) => {
        const m = marcas.get(f.id);
        return m === undefined
          ? []
          : [
              {
                ...m,
                nombre: f.nombre,
                telefono: f.telefono,
                ultimaVisita: ultimaDe.get(f.id) ?? null,
              },
            ];
      }),
      hayMas: filas.length > CUANTOS,
      puedeBorrar: puede?.si === true,
      veElGasto: await veLasVentas(contexto, localId),
    };
  },
});
