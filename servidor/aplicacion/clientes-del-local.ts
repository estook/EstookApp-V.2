import { DIAS_DE_HABITUAL, elGastoMedioPorPersona, esHabitual } from '@estook/dominio';
import type { Contexto } from './contrato.ts';

/**
 * **Los clientes de cada local**, leídos (la Ampliación 5 · 3, decisión 0153, sección 21; migración 0135).
 * Lo que sabe la base sin que nadie lo apunte: cuántas veces vino (reservas sentadas), cuándo fue la
 * última, las veces que no vino (lo que marca la sala), lo que gastan sus mesas y lo que suele pedir.
 * **Siempre del local de la sesión**: un cliente de otro local no sale nunca, ni aunque sea de la misma
 * empresa (lo dice también la base, por las filas que ve cada uno).
 */

/** Lo que sale junto al nombre en la lista de reservas: poco, y lo que importa en servicio. */
export interface LasMarcasDelCliente {
  readonly id: string;
  readonly vip: boolean;
  readonly habitual: boolean;
  readonly alergenos: readonly string[];
  readonly vecesSinVenir: number;
  readonly visitas: number;
  readonly nota: string | null;
}

export interface LaFichaDelCliente extends LasMarcasDelCliente {
  readonly nombre: string;
  readonly telefono: string;
  /** La fecha (YYYY-MM-DD) de su última visita, o nula si aún no ha venido. */
  readonly ultimaVisita: string | null;
  /** Los platos de cocina que más piden sus mesas, como mucho tres. */
  readonly loQueSuelePedir: readonly string[];
  /** En céntimos, con IVA. Nulo si quien mira no ve las ventas o si aún no hay mesas cobradas. */
  readonly gastoMedioPorPersona: number | null;
  /** Si quien mira ve las ventas: si no, el gasto no se enseña (ni «—»). */
  readonly veElGasto: boolean;
  readonly reservasQueVienen: number;
}

interface FilaDeMarcas {
  id: string;
  nombre: string;
  telefono: string;
  vip: boolean;
  alergenos: string[];
  nota: string | null;
  visitas: number;
  recientes: number;
  sin_venir: number;
  ultima: string | null;
  vienen: number;
}

async function lasFilas(
  contexto: Contexto,
  localId: string,
  ids: readonly string[],
): Promise<FilaDeMarcas[]> {
  if (ids.length === 0) return [];
  const desde = new Date(contexto.ahora.getTime() - DIAS_DE_HABITUAL * 86_400_000).toISOString();
  return contexto.sql<FilaDeMarcas[]>`
    select c.id::text as id, c.nombre, c.telefono, c.vip, c.alergenos, c.nota,
           count(r.id) filter (where r.estado = 'sentada')::int as visitas,
           count(r.id) filter (where r.estado = 'sentada' and r.sentada_en >= ${desde}::timestamptz)::int
             as recientes,
           count(r.id) filter (where r.estado = 'no_vino')::int as sin_venir,
           to_char(max(r.dia) filter (where r.estado = 'sentada'), 'YYYY-MM-DD') as ultima,
           count(r.id) filter (where r.estado = 'reservada'
                                 and r.empieza >= ${contexto.ahora.toISOString()}::timestamptz)::int
             as vienen
      from estook.cliente_del_local c
      left join estook.reserva r on r.cliente_id = c.id
     where c.local_id = ${localId}::uuid
       and c.id = any (${`{${ids.join(',')}}`}::uuid[])
     group by c.id
  `;
}

function comoMarcas(f: FilaDeMarcas): LasMarcasDelCliente {
  return {
    id: f.id,
    vip: f.vip,
    habitual: esHabitual(f.recientes),
    alergenos: f.alergenos,
    vecesSinVenir: f.sin_venir,
    visitas: f.visitas,
    nota: f.nota,
  };
}

/** Las marcas de varios clientes a la vez: la lista de reservas de un día en una sola lectura. */
export async function lasMarcasDeLosClientes(
  contexto: Contexto,
  localId: string,
  ids: readonly string[],
): Promise<Map<string, LasMarcasDelCliente>> {
  const unicos = [...new Set(ids)];
  const filas = await lasFilas(contexto, localId, unicos);
  return new Map(filas.map((f) => [f.id, comoMarcas(f)]));
}

/** Si quien mira ve las ventas del local: el gasto de un cliente es una venta. */
export async function veLasVentas(contexto: Contexto, localId: string): Promise<boolean> {
  const [fila] = await contexto.sql<{ si: boolean }[]>`
    select estook.puede_ver('dato.ventas', ${localId}::uuid) as si
  `;
  return fila?.si === true;
}

/** **La ficha entera** de un cliente del local, o nula si no es de este local. */
export async function laFichaDelCliente(
  contexto: Contexto,
  localId: string,
  clienteId: string,
): Promise<LaFichaDelCliente | null> {
  const [f] = await lasFilas(contexto, localId, [clienteId]);
  if (f === undefined) return null;

  // Sus mesas: las cuentas cobradas de sus reservas sentadas, con lo que tomaron.
  const mesas = await contexto.sql<{ centimos: number; personas: number }[]>`
    select coalesce(sum(l.precio_centimos * l.cantidad) filter (where l.quitada_en is null), 0)::int
             as centimos,
           coalesce(max(cu.personas), max(r.comensales))::int as personas
      from estook.reserva r
      join estook.cuenta cu on cu.reserva_id = r.id
      left join estook.linea_de_cuenta l on l.cuenta_id = cu.id
     where r.cliente_id = ${clienteId}::uuid and r.local_id = ${localId}::uuid
       and cu.liberada_en is not null and cu.anulada_en is null
     group by cu.id
  `;
  const platos = await contexto.sql<{ nombre: string }[]>`
    select l.nombre
      from estook.reserva r
      join estook.cuenta cu on cu.reserva_id = r.id
      join estook.linea_de_cuenta l on l.cuenta_id = cu.id
     where r.cliente_id = ${clienteId}::uuid and r.local_id = ${localId}::uuid
       and cu.anulada_en is null and l.quitada_en is null and l.destino = 'cocina'
     group by l.nombre
     order by sum(l.cantidad) desc, l.nombre
     limit 3
  `;
  const veElGasto = await veLasVentas(contexto, localId);
  return {
    ...comoMarcas(f),
    nombre: f.nombre,
    telefono: f.telefono,
    ultimaVisita: f.ultima,
    loQueSuelePedir: platos.map((p) => p.nombre),
    gastoMedioPorPersona: veElGasto ? elGastoMedioPorPersona(mesas) : null,
    veElGasto,
    reservasQueVienen: f.vienen,
  };
}

/** El cliente de un teléfono en este local (sus nueve últimas cifras), o nulo. */
export async function elClienteDelTelefono(
  contexto: Contexto,
  localId: string,
  telefono: string,
): Promise<{ readonly id: string; readonly nombre: string } | null> {
  const cifras = telefono.replace(/\D/g, '').slice(-9);
  if (cifras.length < 9) return null;
  const [c] = await contexto.sql<{ id: string; nombre: string }[]>`
    select id::text as id, nombre from estook.cliente_del_local
     where local_id = ${localId}::uuid and cifras = ${cifras}
  `;
  return c ?? null;
}

/**
 * **Lo que el reloj borra de las reservas**, cada hora y como el sistema: la lista de espera de hace dos
 * días (un nombre y quizá un teléfono que ya no sirven) y **los clientes que llevan dos años sin
 * reservar** (RGPD, art. 5: no se guarda a nadie para siempre). Sus reservas viejas se quedan, sin él.
 */
export async function limpiarLoDeLasReservas(contexto: Contexto): Promise<void> {
  await contexto.sql`delete from estook.espera where llego_en < now() - interval '2 days'`;
  await contexto.sql`
    delete from estook.cliente_del_local c
     where c.creado_en < now() - interval '2 years'
       and not exists (
         select 1 from estook.reserva r
          where r.cliente_id = c.id and r.creada_en >= now() - interval '2 years'
       )
  `;
}
