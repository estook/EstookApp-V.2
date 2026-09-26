import { z } from 'zod';
import {
  COMO_ES_EL_AVISO,
  TIPOS_DE_AVISO,
  fechaEnElLocal,
  laPreferencia,
  type FechaOperativa,
  type TipoDeAviso,
} from '@estook/dominio';
import { LO_QUE_PIDE_EL_AVISO, type Permiso } from '@estook/permisos';
import { quienesPuedenRecibir } from '../avisos.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { suAmplitud } from '../jerarquia.ts';
import { loQuePuede } from '../lo-que-puede.ts';

/**
 * La campana, vista por quien la toca (entrega R · decisión 0052).
 *
 *   cuantos_avisos          el número de la campana: lo pregunta la app cada poco
 *   mis_avisos              la lista, al abrirla
 *   mis_avisos_elegidos     Ajustes → Avisos: lo que te puede llegar y cómo lo tienes
 *   ayuda_con_el_pedido     a quién se puede pedir que rellene un pedido, y quién está
 *
 * Los tres primeros no piden permiso: los avisos son de cada uno, y la política de
 * la tabla solo le da los suyos.
 */

const sinNada = z.object({}).strict();

export const cuantosAvisos = consulta<Record<string, never>, { sinLeer: number }>({
  nombre: 'cuantos_avisos',
  entrada: sinNada,

  async ejecutar(contexto) {
    const filas = await contexto.sql<{ cuantos: number }[]>`
      select count(*)::int as cuantos from estook.aviso
       where persona_id = ${contexto.personaId} and leido_en is null
    `;
    return { sinLeer: filas[0]?.cuantos ?? 0 };
  },
});

export interface UnAviso {
  readonly id: string;
  readonly tipo: TipoDeAviso;
  readonly titulo: string;
  readonly detalle: string | null;
  readonly ir: string | null;
  readonly localId: string | null;
  /** El nombre del local, para quien lleva varios: «Bar Centro». */
  readonly local: string | null;
  /** Cuándo pasó, en ISO, para decir «hace 5 min». */
  readonly cuando: string;
  /** El día en que pasó, en Madrid: para agruparlos en Hoy, Ayer… */
  readonly dia: FechaOperativa;
  readonly leido: boolean;
}

export interface SalidaMisAvisos {
  readonly hoy: FechaOperativa;
  readonly sinLeer: number;
  readonly avisos: readonly UnAviso[];
}

/** Cuántos enseña la campana: el último mes cabe de sobra en esto. */
const AVISOS_EN_LA_CAMPANA = 60;

export const misAvisos = consulta<Record<string, never>, SalidaMisAvisos>({
  nombre: 'mis_avisos',
  entrada: sinNada,

  async ejecutar(contexto) {
    const filas = await contexto.sql<
      {
        id: string;
        tipo: TipoDeAviso;
        titulo: string;
        detalle: string | null;
        ir: string | null;
        local_id: string | null;
        local: string | null;
        cuando: string;
        leido: boolean;
      }[]
    >`
      select a.id, a.tipo, a.titulo, a.detalle, a.ir, a.local_id, l.nombre as local,
             to_char(a.actualizado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando,
             a.leido_en is not null as leido
        from estook.aviso a
        left join estook.local l on l.id = a.local_id
       where a.persona_id = ${contexto.personaId}
       order by a.actualizado_en desc
       limit ${AVISOS_EN_LA_CAMPANA}
    `;
    const sinLeer = await contexto.sql<{ cuantos: number }[]>`
      select count(*)::int as cuantos from estook.aviso
       where persona_id = ${contexto.personaId} and leido_en is null
    `;
    return {
      hoy: fechaEnElLocal(contexto.ahora, 'Europe/Madrid'),
      sinLeer: sinLeer[0]?.cuantos ?? 0,
      avisos: filas.map((f) => ({
        id: f.id,
        tipo: f.tipo,
        titulo: f.titulo,
        detalle: f.detalle,
        ir: f.ir,
        localId: f.local_id,
        local: f.local,
        cuando: f.cuando,
        dia: fechaEnElLocal(new Date(f.cuando), 'Europe/Madrid'),
        leido: f.leido,
      })),
    };
  },
});

export interface AvisoElegible {
  readonly tipo: TipoDeAviso;
  readonly nombre: string;
  readonly explica: string;
  readonly grupo: string;
  readonly enLaApp: boolean;
  readonly porCorreo: boolean;
}

export interface SalidaMisAvisosElegidos {
  readonly avisos: readonly AvisoElegible[];
  /** A dónde salen los correos: el de su acceso. */
  readonly correo: string | null;
  /** Si el correo está montado en Estook: sin él, el interruptor no promete nada. */
  readonly hayCorreo: boolean;
  /** Desde cuánto avisa una subida, si quien mira lo puede cambiar; si no, nulo. */
  readonly subidaQueAvisa: number | null;
}

/**
 * Lo que te puede llegar en el local en el que estás, y cómo lo tienes.
 *
 * **Solo lo que te puede llegar**: a un camarero no se le enseña «un proveedor sube
 * un precio», que nunca va a recibir. Lo decide lo mismo que decide a quién va
 * cada aviso (`LO_QUE_PIDE_EL_AVISO`).
 */
export const misAvisosElegidos = consulta<Record<string, never>, SalidaMisAvisosElegidos>({
  nombre: 'mis_avisos_elegidos',
  entrada: sinNada,

  async ejecutar(contexto) {
    const localId = contexto.sesion?.localId ?? null;
    const organizacionId = contexto.sesion?.organizacionId ?? null;
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_sesion');

    const todos = [...new Set(Object.values(LO_QUE_PIDE_EL_AVISO).flat())] as Permiso[];
    const puede =
      localId === null ? null : await loQuePuede(contexto, localId, [...todos, 'app.ajustes']);
    const amplitud =
      organizacionId === null ? 0 : await suAmplitud(contexto.sql, organizacionId, personaId);

    const guardadas = await contexto.sql<
      { tipo: TipoDeAviso; en_la_app: boolean; por_correo: boolean }[]
    >`
      select tipo, en_la_app, por_correo from estook.preferencia_de_aviso
       where persona_id = ${personaId}
    `;
    const deCadaTipo = new Map(guardadas.map((g) => [g.tipo, g] as const));

    const avisos = TIPOS_DE_AVISO.filter(
      (tipo) => puede !== null && puede.verTodos(LO_QUE_PIDE_EL_AVISO[tipo]),
    ).map((tipo): AvisoElegible => {
      const guardada = deCadaTipo.get(tipo);
      const vale = laPreferencia(
        tipo,
        amplitud,
        guardada === undefined
          ? null
          : { enLaApp: guardada.en_la_app, porCorreo: guardada.por_correo },
      );
      const como = COMO_ES_EL_AVISO[tipo];
      return {
        tipo,
        nombre: como.nombre,
        explica: como.explica,
        grupo: como.grupo,
        enLaApp: vale.enLaApp,
        porCorreo: vale.porCorreo,
      };
    });

    const yo = await contexto.sql<{ correo: string | null }[]>`
      select correo from estook.persona where id = ${personaId}
    `;

    let subidaQueAvisa: number | null = null;
    if (
      localId !== null &&
      puede !== null &&
      puede.editar('accion.enviar_pedidos') &&
      puede.editar('app.ajustes')
    ) {
      const filas = await contexto.sql<{ umbral: number }[]>`
        select subida_que_avisa::int as umbral from estook.local where id = ${localId}
      `;
      subidaQueAvisa = filas[0]?.umbral ?? null;
    }

    return {
      avisos,
      correo: yo[0]?.correo ?? null,
      hayCorreo: contexto.correo !== null,
      subidaQueAvisa,
    };
  },
});

export interface PersonaDelEquipo {
  readonly personaId: string;
  readonly nombre: string;
}

export interface SalidaAyudaConElPedido {
  /** Si quien mira puede pedir ayuda: puede mandarlo y está en borrador. */
  readonly puedePedirAyuda: boolean;
  /** A quién se le puede pedir: quien lleva el almacén en el local, menos uno mismo. */
  readonly aQuien: readonly PersonaDelEquipo[];
  /** A quién ya se le ha pedido, y si ha terminado. */
  readonly invitados: readonly (PersonaDelEquipo & { readonly terminada: boolean })[];
  /** Si a quien mira le han pedido ayuda con este pedido: quién, y si ya terminó. */
  readonly aMi: { readonly quien: string; readonly terminada: boolean } | null;
}

export const ayudaConElPedido = consulta<{ pedido_id: string }, SalidaAyudaConElPedido>({
  nombre: 'ayuda_con_el_pedido',
  entrada: z.object({ pedido_id: z.string().uuid() }).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const pedidos = await contexto.sql<{ local_id: string; estado: string }[]>`
      select local_id, estado::text as estado from estook.pedido_de_compra where id = ${entrada.pedido_id}
    `;
    const pedido = pedidos[0];
    if (pedido === undefined) throw new FalloDeAplicacion('no_existe');

    const invitaciones = await contexto.sql<
      {
        persona_id: string;
        nombre: string | null;
        invitada_por: string;
        por: string | null;
        terminada: boolean;
      }[]
    >`
      select i.persona_id, p.nombre, i.invitada_por, q.nombre as por,
             i.terminada_en is not null as terminada
        from estook.invitacion_a_pedido i
        left join estook.persona p on p.id = i.persona_id
        left join estook.persona q on q.id = i.invitada_por
       where i.pedido_id = ${entrada.pedido_id}
       order by i.invitada_en
    `;

    const puede = await loQuePuede(contexto, pedido.local_id, ['accion.enviar_pedidos']);
    const puedePedirAyuda = pedido.estado === 'borrador' && puede.editar('accion.enviar_pedidos');

    // Los nombres de los invitados los lee el sistema: un cocinero no tiene por qué
    // poder leer la ficha de su compañero, y aquí solo sale el nombre.
    const delEquipo = puedePedirAyuda
      ? await quienesPuedenRecibir(contexto, pedido.local_id, 'pedido.invitacion')
      : [];
    const nombres = new Map(delEquipo.map((q) => [q.personaId, q.nombre] as const));

    const mia = invitaciones.find((i) => i.persona_id === contexto.personaId);
    return {
      puedePedirAyuda,
      aQuien: delEquipo
        .filter((q) => q.personaId !== contexto.personaId)
        .map((q) => ({ personaId: q.personaId, nombre: q.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      invitados: invitaciones.map((i) => ({
        personaId: i.persona_id,
        nombre: i.nombre ?? nombres.get(i.persona_id) ?? 'Alguien del equipo',
        terminada: i.terminada,
      })),
      aMi:
        mia === undefined ? null : { quien: mia.por ?? 'Tu responsable', terminada: mia.terminada },
    };
  },
});
