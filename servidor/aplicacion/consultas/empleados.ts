import { z } from 'zod';
import {
  PERIODOS_DEL_OBJETIVO,
  PERIODOS_DEL_SERVICIO,
  alCentimo,
  elPeriodoDelServicio,
  jornadaDe,
  laMetaDelPeriodo,
  laMetaHastaHoy,
  type ObjetivoDeVenta,
  type PeriodoDelObjetivo,
  type PeriodoDelServicio,
} from '@estook/dominio';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from '../desviacion.ts';
import {
  importeDe,
  lasLineasVendidas,
  lasMesasDelServicio,
  seVendio,
  sinIva,
} from '../lo-que-se-vende.ts';
import { lasHorasDelEquipo } from './equipo.ts';
import { comoLista } from '../listas.ts';

/**
 * Servicio › Empleados (la pausa del 8-nov, P3, decisión 0142).
 *
 *   la_venta_de_cada_uno           quien lleva el local (ve las ventas y pone los objetivos): todo
 *                                  el equipo, de mayor a menor, con lo que vende, por hora fichada y
 *                                  frente a su objetivo. Los demás, también un jefe de cocina o la
 *                                  gestoría: solo lo suyo, y solo si el gerente deja que cada uno lo vea
 *   guardar_los_objetivos_de_venta el general **en € a la semana o al mes** (0143), uno distinto
 *                                  para quien haga falta, y si cada uno ve el suyo
 *
 * Richi: «que platos han vendido más los empleados y dinero total vendido por ellos de mayor a
 * menor… dependiendo de sus horas, haciendo una proporción, ver quién gana más para el local».
 */

const entrada = z
  .object({
    periodo: z.enum(PERIODOS_DEL_SERVICIO),
    del: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-11-04.')
      .optional(),
  })
  .strict();

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver a su equipo. Elige uno primero.',
    });
  }
  return localId;
}

export interface VentaDeUno {
  readonly personaId: string;
  readonly nombre: string;
  /** Los minutos fichados en el periodo. */
  readonly minutos: number;
  /** Sin IVA, en céntimos. */
  readonly ventas: number;
  readonly mesas: number;
  /** Con IVA, por mesa: como lo paga el cliente. */
  readonly ticketMedio: number | null;
  /** Lo vendido por hora fichada, sin IVA. Nulo sin horas. */
  readonly porHora: number | null;
  /** Su objetivo (0143): el suyo, o el general. Nulo si no hay ninguno. */
  readonly objetivo: ObjetivoDeVenta | null;
  readonly objetivoSuyo: boolean;
  /** Lo que debería vender **en el periodo que se mira**, repartido por días si es otro. */
  readonly meta: number | null;
  /** Lo que toca llevar vendido hoy: dice si va por delante o por detrás. */
  readonly metaHastaHoy: number | null;
  readonly platos: readonly { readonly nombre: string; readonly uds: number }[];
}

export interface LaVentaDeCadaUno {
  readonly periodo: PeriodoDelServicio;
  readonly desde: string;
  readonly hasta: string;
  readonly hoy: string;
  readonly anteriorDel: string;
  readonly siguienteDel: string | null;
  /** «todos»: la lista entera. «yo»: solo lo de quien mira. */
  readonly modo: 'todos' | 'yo';
  readonly puedeCambiar: boolean;
  readonly general: {
    readonly periodo: PeriodoDelObjetivo;
    readonly centimos: number;
    readonly cadaUnoLoVe: boolean;
  } | null;
  readonly personas: readonly VentaDeUno[];
  /** Los del equipo con un objetivo distinto, para la hoja de Objetivos (en el periodo del general). */
  readonly distintos: readonly { readonly personaId: string; readonly centimos: number }[];
}

async function losObjetivos(contexto: Contexto, localId: string) {
  const filas = await contexto.sql<
    {
      persona_id: string | null;
      periodo: PeriodoDelObjetivo;
      centimos: number;
      cada_uno_lo_ve: boolean | null;
    }[]
  >`
    select persona_id::text as persona_id, periodo, centimos, cada_uno_lo_ve
      from estook.objetivo_de_venta where local_id = ${localId}::uuid
  `;
  const general = filas.find((f) => f.persona_id === null);
  return {
    general:
      general === undefined
        ? null
        : {
            periodo: general.periodo,
            centimos: general.centimos,
            cadaUnoLoVe: general.cada_uno_lo_ve ?? true,
          },
    distintos: filas.flatMap((f) =>
      f.persona_id === null
        ? []
        : [{ personaId: f.persona_id, periodo: f.periodo, centimos: f.centimos }],
    ),
  };
}

export const laVentaDeCadaUno = consulta<z.infer<typeof entrada>, LaVentaDeCadaUno>({
  nombre: 'la_venta_de_cada_uno',
  entrada,
  exige: 'app.servicio',

  async ejecutar(contexto, pedido) {
    const localId = elLocal(contexto);
    const local = await elRelojYElFisco(contexto, localId);
    const hoy = jornadaDe(contexto.ahora, local.zonaHoraria, local.corte);
    const periodo = elPeriodoDelServicio(pedido.periodo, pedido.del ?? null, hoy);
    const iva = await elTipoDeRestauracion(contexto, local, hoy);
    const puede = await loQuePuede(contexto, localId, ['dato.ventas', 'accion.poner_objetivos']);
    const objetivos = await losObjetivos(contexto, localId);
    // **La lista de todos, solo para quien lleva el local** (Richi, 0142): ver las ventas no basta,
    // que también las ven el jefe de cocina, el de sala o la gestoría. Lo de cada persona lo ve quien
    // pone los objetivos (gerente, area manager, dirección), y nadie más.
    const veATodos = puede.ver('dato.ventas') && puede.editar('accion.poner_objetivos');
    const puedeCambiar = puede.editar('accion.poner_objetivos');
    const comun = {
      periodo: pedido.periodo,
      desde: periodo.desde,
      hasta: periodo.hasta,
      hoy,
      anteriorDel: periodo.anteriorDel,
      siguienteDel: periodo.siguienteDel,
      puedeCambiar,
      // Los objetivos de los demás, solo para quien los pone.
      general: puedeCambiar ? objetivos.general : null,
      distintos: puedeCambiar
        ? objetivos.distintos.map((d) => ({ personaId: d.personaId, centimos: d.centimos }))
        : [],
    };
    // Su objetivo (el suyo o el general), y lo que le toca en el periodo que se mira (0143).
    const objetivoDe = (personaId: string) => {
      const suyo = objetivos.distintos.find((d) => d.personaId === personaId);
      const objetivo: ObjetivoDeVenta | null =
        suyo !== undefined
          ? { periodo: suyo.periodo, centimos: suyo.centimos }
          : objetivos.general === null
            ? null
            : { periodo: objetivos.general.periodo, centimos: objetivos.general.centimos };
      const meta =
        objetivo === null ? null : laMetaDelPeriodo(objetivo, periodo.desde, periodo.hasta);
      return {
        objetivo,
        objetivoSuyo: suyo !== undefined,
        meta,
        metaHastaHoy:
          meta === null ? null : laMetaHastaHoy(meta, periodo.desde, periodo.hasta, hoy),
      };
    };

    // ── Quien no lleva el local: lo suyo, si el gerente lo deja ──
    if (!veATodos) {
      const personaId = contexto.personaId;
      if (personaId === null) throw new FalloDeAplicacion('sin_sesion');
      const [vendido] = await contexto.sql<
        { se_ve: boolean; centimos_con_iva: string; mesas: number }[]
      >`
        select se_ve, centimos_con_iva::text as centimos_con_iva, mesas
          from estook.lo_que_he_vendido(${localId}::uuid, ${periodo.desde}::date, ${periodo.hasta}::date)
      `;
      // El gerente ha decidido no enseñarlo: ni lo suyo.
      if (vendido?.se_ve !== true) return { ...comun, modo: 'yo', personas: [] };
      const conIva = Number(vendido.centimos_con_iva);
      const [horas] = await contexto.sql<{ segundos: string | null; nombre: string }[]>`
        select (select sum(estook.segundos_trabajados(f, ${contexto.ahora.toISOString()}::timestamptz))
                  from estook.fichaje f
                 where f.persona_id = ${personaId}::uuid and f.local_id = ${localId}::uuid
                   and f.fecha_operativa between ${periodo.desde}::date and ${periodo.hasta}::date)::text as segundos,
               (select nombre from estook.persona where id = ${personaId}::uuid) as nombre
      `;
      const minutos = Math.floor(Number(horas?.segundos ?? 0) / 60);
      const ventas = sinIva(conIva, iva);
      return {
        ...comun,
        modo: 'yo',
        personas: [
          {
            personaId,
            nombre: horas?.nombre ?? '',
            minutos,
            ventas,
            mesas: vendido.mesas,
            ticketMedio: vendido.mesas === 0 ? null : alCentimo(conIva / vendido.mesas),
            porHora: minutos === 0 ? null : alCentimo((ventas * 60) / minutos),
            ...objetivoDe(personaId),
            platos: [],
          },
        ],
      };
    }

    // ── Quien lleva el local: todo el equipo ──
    const [lineas, mesas, horas] = await Promise.all([
      lasLineasVendidas(contexto, localId, periodo.desde, periodo.hasta),
      lasMesasDelServicio(contexto, localId, periodo.desde, periodo.hasta),
      lasHorasDelEquipo(contexto, localId, periodo.desde, periodo.hasta),
    ]);
    const deCadaUno = new Map<string, { conIva: number; platos: Map<string, number> }>();
    for (const l of lineas.filter(seVendio)) {
      if (l.camareroId === null) continue;
      const uno = deCadaUno.get(l.camareroId) ?? { conIva: 0, platos: new Map<string, number>() };
      uno.conIva += importeDe(l);
      if (l.destino !== 'ninguno')
        uno.platos.set(l.nombre, (uno.platos.get(l.nombre) ?? 0) + l.cantidad);
      deCadaUno.set(l.camareroId, uno);
    }
    const mesasDe = new Map<string, number>();
    for (const m of mesas) {
      if (m.anuladaEn !== null || m.camareroId === null) continue;
      mesasDe.set(m.camareroId, (mesasDe.get(m.camareroId) ?? 0) + 1);
    }
    const minutosDe = new Map<string, number>();
    for (const h of horas)
      minutosDe.set(h.personaId, (minutosDe.get(h.personaId) ?? 0) + h.segundos / 60);

    const ids = [...new Set([...deCadaUno.keys()])];
    const nombres =
      ids.length === 0
        ? []
        : await contexto.sql<{ id: string; nombre: string }[]>`
            select id::text as id, nombre from estook.persona
             where id = any(${comoLista(ids)}::text::uuid[])
          `;
    const personas: VentaDeUno[] = ids.map((personaId) => {
      const uno = deCadaUno.get(personaId) ?? { conIva: 0, platos: new Map<string, number>() };
      const minutos = Math.floor(minutosDe.get(personaId) ?? 0);
      const ventas = sinIva(uno.conIva, iva);
      const suyasMesas = mesasDe.get(personaId) ?? 0;
      return {
        personaId,
        nombre: nombres.find((n) => n.id === personaId)?.nombre ?? 'Sin nombre',
        minutos,
        ventas,
        mesas: suyasMesas,
        ticketMedio: suyasMesas === 0 ? null : alCentimo(uno.conIva / suyasMesas),
        porHora: minutos === 0 ? null : alCentimo((ventas * 60) / minutos),
        ...objetivoDe(personaId),
        platos: [...uno.platos.entries()]
          .map(([nombre, uds]) => ({ nombre, uds }))
          .sort((a, b) => b.uds - a.uds)
          .slice(0, 5),
      };
    });
    personas.sort((a, b) => b.ventas - a.ventas);
    return { ...comun, modo: 'todos', personas };
  },
});

// ── Guardar los objetivos ────────────────────────────────────────────────────

export const entradaObjetivosDeVenta = z
  .object({
    /** De qué es la cifra: la semana o el mes (0143). Vale para el general y para los distintos. */
    periodo: z.enum(PERIODOS_DEL_OBJETIVO),
    /** En céntimos, sin IVA: de 1 € a 1.000.000 €. */
    general: z.number().int().min(100).max(100_000_000),
    cada_uno_lo_ve: z.boolean(),
    /** Los que tienen uno distinto. Quien no está, vuelve al general. */
    distintos: z
      .array(
        z
          .object({
            persona_id: z.string().uuid(),
            centimos: z.number().int().min(100).max(100_000_000),
          })
          .strict(),
      )
      .max(200),
  })
  .strict();

export const guardarLosObjetivosDeVenta = comando<
  z.infer<typeof entradaObjetivosDeVenta>,
  { distintos: number }
>({
  nombre: 'guardar_los_objetivos_de_venta',
  entrada: entradaObjetivosDeVenta,
  exige: 'accion.poner_objetivos',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const quien = contexto.personaId;
    // Solo a gente de este local: otra persona no se puede ni nombrar (la base lo vuelve a mirar).
    if (entrada.distintos.length > 0) {
      const delLocal = await contexto.sql<{ id: string }[]>`
        select p::text as id from estook.quien_lleva_el_servicio(${localId}::uuid) as p
      `;
      const suyos = new Set(delLocal.map((f) => f.id));
      if (entrada.distintos.some((d) => !suyos.has(d.persona_id))) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Esa persona no trabaja en este local: no se le puede poner un objetivo aquí.',
        });
      }
    }
    await contexto.sql`
      insert into estook.objetivo_de_venta (local_id, persona_id, periodo, centimos, cada_uno_lo_ve, cambiado_por)
      values (${localId}::uuid, null, ${entrada.periodo}, ${entrada.general}, ${entrada.cada_uno_lo_ve}, ${quien}::uuid)
      on conflict (local_id, persona_id) do update
        set periodo = excluded.periodo,
            centimos = excluded.centimos,
            cada_uno_lo_ve = excluded.cada_uno_lo_ve,
            cambiado_en = now(), cambiado_por = excluded.cambiado_por
    `;
    const quedan = entrada.distintos.map((d) => d.persona_id);
    await contexto.sql`
      delete from estook.objetivo_de_venta
       where local_id = ${localId}::uuid and persona_id is not null
         and not (persona_id = any(${comoLista(quedan)}::text::uuid[]))
    `;
    for (const d of entrada.distintos) {
      await contexto.sql`
        insert into estook.objetivo_de_venta (local_id, persona_id, periodo, centimos, cambiado_por)
        values (${localId}::uuid, ${d.persona_id}::uuid, ${entrada.periodo}, ${d.centimos}, ${quien}::uuid)
        on conflict (local_id, persona_id) do update
          set periodo = excluded.periodo,
              centimos = excluded.centimos,
              cambiado_en = now(), cambiado_por = excluded.cambiado_por
      `;
    }
    const [org] = await contexto.sql<{ organizacion_id: string }[]>`
      select organizacion_id::text as organizacion_id from estook.local where id = ${localId}::uuid
    `;
    if (org !== undefined) {
      await contexto.sql`
        select estook.anotar(
          ${org.organizacion_id}::uuid, 'cambiar', 'objetivo_de_venta', ${localId},
          ${localId}::uuid, null, ${JSON.stringify(entrada)}::text::jsonb, null
        )
      `;
    }
    return { distintos: entrada.distintos.length };
  },
});
