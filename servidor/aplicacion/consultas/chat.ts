import { z } from 'zod';
import {
  esCanalDeFabrica,
  estadoDeMiMensaje,
  nombreDelCanal,
  sePuedeCorregir,
  vistaPrevia,
  type EstadoDeMiMensaje,
  type TipoDeAdjunto,
  type TipoDeCanal,
} from '@estook/dominio';
import { elLocalDelChat } from '../chat.ts';
import { consulta, FalloDeAplicacion } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { loQuePuede } from '../lo-que-puede.ts';

/**
 * El chat del equipo · lo que se ve (C1 · decisiones 0071 y 0073).
 *
 * Todo se lee **con la sesión de quien pregunta**: las políticas de la 0056 dejan ver
 * los canales que le tocan y nada más, así que un privado ajeno no sale ni en la lista
 * ni en el buscador ni preguntando por su identificador. Lo que no se ve, no existe.
 */

/** Cuánto vale un enlace a un fichero del chat: lo que dura mirar una conversación. */
const SEGUNDOS_DEL_ENLACE = 3600;

/** Los mensajes que llegan de una vez. Más atrás, con «antes». */
const DE_UNA_VEZ = 50;

// ── La lista de canales ──────────────────────────────────────────────────────

export interface CanalEnLista {
  readonly id: string;
  readonly tipo: TipoDeCanal;
  readonly nombre: string;
  /** Los que están en un privado, sin quien mira. Vacío en los demás. */
  readonly otros: readonly string[];
  readonly ultimo: {
    readonly id: string;
    readonly autor: string | null;
    readonly esMio: boolean;
    readonly vista: string;
    readonly en: string;
  } | null;
  readonly sinLeer: number;
  /** Si en lo que no ha leído le nombran. */
  readonly teNombran: boolean;
  readonly silenciado: boolean;
}

export interface SalidaMisCanales {
  readonly canales: readonly CanalEnLista[];
  /** Todo lo que no ha leído, para el número del icono. */
  readonly sinLeer: number;
  /** Si puede crear canales: quien lleva el local (0071, pregunta 3). */
  readonly puedeCrearCanales: boolean;
  /** Si ya están los de fábrica. Si no, la app abre el chat para que se creen. */
  readonly abierto: boolean;
}

export const misCanales = consulta<Record<string, never>, SalidaMisCanales>({
  nombre: 'mis_canales',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocalDelChat(contexto);
    const puede = await loQuePuede(contexto, localId, ['app.equipo']);

    const filas = await contexto.sql<
      {
        id: string;
        tipo: TipoDeCanal;
        nombre: string | null;
        otros: string[] | null;
        ultimo_id: string | null;
        ultimo_autor: string | null;
        ultimo_autor_id: string | null;
        ultimo_texto: string | null;
        ultimo_adjunto_tipo: TipoDeAdjunto | null;
        ultimo_adjunto_nombre: string | null;
        ultimo_adjunto_segundos: number | null;
        ultimo_borrado: boolean | null;
        ultimo_en: string | null;
        sin_leer: number;
        te_nombran: boolean;
        silenciado: boolean;
      }[]
    >`
      select c.id, c.tipo::text as tipo, c.nombre,
             (select array_agg(p.nombre order by p.nombre)
                from estook.miembro_del_canal mc
                join estook.persona p on p.id = mc.persona_id
               where c.tipo = 'privado' and mc.canal_id = c.id
                 and mc.persona_id <> ${contexto.personaId}) as otros,
             u.id::text as ultimo_id, up.nombre as ultimo_autor, u.autor_id::text as ultimo_autor_id,
             u.texto as ultimo_texto, u.adjunto_tipo as ultimo_adjunto_tipo,
             u.adjunto_nombre as ultimo_adjunto_nombre, u.adjunto_segundos as ultimo_adjunto_segundos,
             u.borrado_en is not null as ultimo_borrado,
             to_char(u.creado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ultimo_en,
             (select count(*)::int from estook.mensaje m
               where m.canal_id = c.id and m.id > coalesce(l.leido_hasta, 0)
                 and m.autor_id is distinct from ${contexto.personaId}
                 and m.borrado_en is null) as sin_leer,
             exists (select 1 from estook.mensaje m
                      where m.canal_id = c.id and m.id > coalesce(l.leido_hasta, 0)
                        and ${contexto.personaId}::uuid = any (m.menciones)) as te_nombran,
             coalesce(l.silenciado, false) as silenciado
        from estook.canal c
        left join estook.lectura_del_canal l
          on l.canal_id = c.id and l.persona_id = ${contexto.personaId}
        left join lateral (
          select * from estook.mensaje m where m.canal_id = c.id order by m.id desc limit 1
        ) u on true
        left join estook.persona up on up.id = u.autor_id
       where c.local_id = ${localId} and c.archivado_en is null
    `;

    const orden = (tipo: TipoDeCanal) =>
      tipo === 'equipo' ? 0 : tipo === 'cocina' ? 1 : tipo === 'sala' ? 2 : 3;
    const canales: CanalEnLista[] = filas
      .map((f) => {
        const otros = f.otros ?? [];
        return {
          id: f.id,
          tipo: f.tipo,
          nombre: nombreDelCanal({ tipo: f.tipo, nombre: f.nombre, otros }),
          otros,
          ultimo:
            f.ultimo_id === null || f.ultimo_en === null
              ? null
              : {
                  id: f.ultimo_id,
                  autor: f.ultimo_autor,
                  esMio: f.ultimo_autor_id === contexto.personaId,
                  vista: vistaPrevia({
                    texto: f.ultimo_texto,
                    adjuntoTipo: f.ultimo_adjunto_tipo,
                    adjuntoNombre: f.ultimo_adjunto_nombre,
                    adjuntoSegundos: f.ultimo_adjunto_segundos,
                    borrado: f.ultimo_borrado === true,
                  }),
                  en: f.ultimo_en,
                },
          sinLeer: f.sin_leer,
          teNombran: f.te_nombran,
          silenciado: f.silenciado,
        };
      })
      // Los de fábrica arriba, en su orden; los demás, por lo último que se ha dicho.
      .sort((a, b) => {
        const fabrica = orden(a.tipo) - orden(b.tipo);
        if (fabrica !== 0 && (esCanalDeFabrica(a.tipo) || esCanalDeFabrica(b.tipo))) return fabrica;
        return (b.ultimo?.en ?? '').localeCompare(a.ultimo?.en ?? '');
      });

    return {
      canales,
      sinLeer: canales.reduce((n, c) => n + c.sinLeer, 0),
      puedeCrearCanales: puede.editar('app.equipo'),
      abierto: filas.some((f) => f.tipo === 'equipo'),
    };
  },
});

// ── Un canal ─────────────────────────────────────────────────────────────────

export interface AdjuntoDelMensaje {
  readonly tipo: TipoDeAdjunto;
  readonly nombre: string | null;
  readonly mime: string;
  readonly bytes: number;
  readonly segundos: number | null;
  /** Firmado y que caduca. Nulo si el almacén no lo ha podido firmar. */
  readonly enlace: string | null;
}

export interface ReaccionDelMensaje {
  readonly emoji: string;
  readonly cuantos: number;
  readonly mia: boolean;
  readonly quien: readonly string[];
}

export interface MensajeDelCanal {
  readonly id: string;
  readonly autorId: string | null;
  readonly autor: string;
  readonly esMio: boolean;
  readonly texto: string | null;
  readonly en: string;
  readonly editado: boolean;
  readonly borrado: boolean;
  /** Retirado por quien lleva el local, y no borrado por quien lo escribió. */
  readonly retirado: boolean;
  readonly respondeA: {
    readonly id: string;
    readonly autor: string;
    readonly vista: string;
  } | null;
  readonly adjunto: AdjuntoDelMensaje | null;
  readonly reacciones: readonly ReaccionDelMensaje[];
  /** Si le nombran a quien mira. */
  readonly meNombran: boolean;
  readonly sePuedeCorregir: boolean;
  /** Solo en lo propio: enviado, entregado o leído (0071, pregunta 6). */
  readonly estado: EstadoDeMiMensaje | null;
}

export interface PersonaDelCanal {
  readonly id: string;
  readonly nombre: string;
}

export interface LecturaDeOtro {
  readonly personaId: string;
  readonly nombre: string;
  readonly entregadoHasta: string;
  readonly leidoHasta: string;
}

export interface SalidaUnCanal {
  readonly canal: {
    readonly id: string;
    readonly tipo: TipoDeCanal;
    readonly nombre: string;
    readonly silenciado: boolean;
    /** Si se puede salir (los creados y los privados) y meter gente. */
    readonly sePuedeSalir: boolean;
    /** Si quien mira puede retirar mensajes: quien lleva el local, y nunca en un privado. */
    readonly puedeRetirar: boolean;
  };
  /** Quien ve el canal, para nombrar y para saber quién ha leído. */
  readonly personas: readonly PersonaDelCanal[];
  /** Hasta dónde ha leído cada uno de los demás. «Leído» no se oculta (0071, 6). */
  readonly lecturas: readonly LecturaDeOtro[];
  readonly mensajes: readonly MensajeDelCanal[];
  readonly hayMas: boolean;
  /** El último que ya había leído quien mira, para la raya de «sin leer». */
  readonly leidoHasta: string;
}

export const entradaUnCanal = z
  .object({
    canal_id: z.string().uuid(),
    /** Los anteriores a este, para subir en la conversación. */
    antes: z.string().regex(/^\d+$/).optional(),
  })
  .strict();

export type EntradaUnCanal = z.infer<typeof entradaUnCanal>;

export const unCanal = consulta<EntradaUnCanal, SalidaUnCanal>({
  nombre: 'un_canal',
  entrada: entradaUnCanal,

  async ejecutar(contexto, entrada) {
    const yo = contexto.personaId;
    const canales = await contexto.sql<
      { id: string; tipo: TipoDeCanal; nombre: string | null; local_id: string }[]
    >`
      select id, tipo::text as tipo, nombre, local_id
        from estook.canal where id = ${entrada.canal_id} and archivado_en is null
    `;
    const canal = canales[0];
    if (canal === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese canal no está, o no es de los que puedes ver.',
      });
    }

    const personas = await contexto.sql<PersonaDelCanal[]>`
      select persona_id::text as id, nombre from estook.quien_ve_el_canal(${canal.id}::uuid)
       order by nombre
    `;
    const lecturas = await contexto.sql<
      {
        persona_id: string;
        entregado_hasta: string;
        leido_hasta: string;
        silenciado: boolean;
      }[]
    >`
      select persona_id::text as persona_id, entregado_hasta::text as entregado_hasta,
             leido_hasta::text as leido_hasta, silenciado
        from estook.lectura_del_canal where canal_id = ${canal.id}
    `;
    const mia = lecturas.find((l) => l.persona_id === yo);
    const otrosQueLoVen = personas.filter((p) => p.id !== yo);
    const lecturasDeOtros: LecturaDeOtro[] = otrosQueLoVen.map((p) => {
      const suya = lecturas.find((l) => l.persona_id === p.id);
      return {
        personaId: p.id,
        nombre: p.nombre,
        entregadoHasta: suya?.entregado_hasta ?? '0',
        leidoHasta: suya?.leido_hasta ?? '0',
      };
    });

    const filas = await contexto.sql<
      {
        id: string;
        autor_id: string | null;
        autor: string | null;
        texto: string | null;
        en: string;
        creado_en: Date;
        editado: boolean;
        borrado: boolean;
        retirado: boolean;
        responde_a: string | null;
        r_autor: string | null;
        r_texto: string | null;
        r_adjunto_tipo: TipoDeAdjunto | null;
        r_adjunto_nombre: string | null;
        r_adjunto_segundos: number | null;
        r_borrado: boolean | null;
        adjunto_clave: string | null;
        adjunto_tipo: TipoDeAdjunto | null;
        adjunto_nombre: string | null;
        adjunto_mime: string | null;
        adjunto_bytes: number | null;
        adjunto_segundos: number | null;
        me_nombran: boolean;
      }[]
    >`
      select m.id::text as id, m.autor_id::text as autor_id, p.nombre as autor, m.texto,
             to_char(m.creado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en,
             m.creado_en,
             m.editado_en is not null as editado, m.borrado_en is not null as borrado,
             m.retirado_por is not null as retirado,
             m.responde_a::text as responde_a, rp.nombre as r_autor, r.texto as r_texto,
             r.adjunto_tipo as r_adjunto_tipo, r.adjunto_nombre as r_adjunto_nombre,
             r.adjunto_segundos as r_adjunto_segundos, r.borrado_en is not null as r_borrado,
             m.adjunto_clave, m.adjunto_tipo, m.adjunto_nombre, m.adjunto_mime,
             m.adjunto_bytes, m.adjunto_segundos,
             ${yo}::uuid = any (m.menciones) as me_nombran
        from estook.mensaje m
        left join estook.persona p on p.id = m.autor_id
        left join estook.mensaje r on r.id = m.responde_a
        left join estook.persona rp on rp.id = r.autor_id
       where m.canal_id = ${canal.id}
         and (${entrada.antes ?? null}::bigint is null or m.id < ${entrada.antes ?? null}::bigint)
       order by m.id desc
       limit ${DE_UNA_VEZ + 1}
    `;
    const hayMas = filas.length > DE_UNA_VEZ;
    const deEstaVez = filas.slice(0, DE_UNA_VEZ).reverse();

    const ids = deEstaVez.map((f) => f.id);
    const reacciones =
      ids.length === 0
        ? []
        : await contexto.sql<
            { mensaje_id: string; emoji: string; persona_id: string; nombre: string | null }[]
          >`
            select r.mensaje_id::text as mensaje_id, r.emoji, r.persona_id::text as persona_id,
                   p.nombre
              from estook.reaccion_al_mensaje r
              left join estook.persona p on p.id = r.persona_id
             where r.mensaje_id = any (${comoLista(ids)}::text::bigint[])
             order by r.creada_en
          `;

    const claves = deEstaVez.map((f) => f.adjunto_clave).filter((c): c is string => c !== null);
    const enlaces =
      claves.length === 0 || contexto.almacen === null
        ? new Map<string, string>()
        : await contexto.almacen.enlaces(claves, SEGUNDOS_DEL_ENLACE);

    const puede = await loQuePuede(contexto, canal.local_id, ['app.equipo']);
    const lecturasParaElEstado = lecturasDeOtros.map((l) => ({
      entregadoHasta: Number(l.entregadoHasta),
      leidoHasta: Number(l.leidoHasta),
    }));

    const mensajes: MensajeDelCanal[] = deEstaVez.map((f) => {
      const suyas = reacciones.filter((r) => r.mensaje_id === f.id);
      const porEmoji = new Map<string, { cuantos: number; mia: boolean; quien: string[] }>();
      for (const r of suyas) {
        const una = porEmoji.get(r.emoji) ?? { cuantos: 0, mia: false, quien: [] };
        una.cuantos += 1;
        if (r.persona_id === yo) una.mia = true;
        una.quien.push(r.nombre ?? 'Alguien');
        porEmoji.set(r.emoji, una);
      }
      const esMio = f.autor_id !== null && f.autor_id === yo;
      return {
        id: f.id,
        autorId: f.autor_id,
        autor: f.autor ?? 'Alguien que ya no está',
        esMio,
        texto: f.texto,
        en: f.en,
        editado: f.editado,
        borrado: f.borrado,
        retirado: f.retirado,
        respondeA:
          f.responde_a === null
            ? null
            : {
                id: f.responde_a,
                autor: f.r_autor ?? 'Alguien',
                vista: vistaPrevia({
                  texto: f.r_texto,
                  adjuntoTipo: f.r_adjunto_tipo,
                  adjuntoNombre: f.r_adjunto_nombre,
                  adjuntoSegundos: f.r_adjunto_segundos,
                  borrado: f.r_borrado === true,
                }),
              },
        adjunto:
          f.adjunto_clave === null || f.adjunto_tipo === null
            ? null
            : {
                tipo: f.adjunto_tipo,
                nombre: f.adjunto_nombre,
                mime: f.adjunto_mime ?? '',
                bytes: f.adjunto_bytes ?? 0,
                segundos: f.adjunto_segundos,
                enlace: enlaces.get(f.adjunto_clave) ?? null,
              },
        reacciones: [...porEmoji.entries()].map(([emoji, r]) => ({ emoji, ...r })),
        meNombran: f.me_nombran,
        sePuedeCorregir:
          esMio &&
          !f.borrado &&
          f.texto !== null &&
          sePuedeCorregir(new Date(f.creado_en), contexto.ahora),
        estado: esMio && !f.borrado ? estadoDeMiMensaje(Number(f.id), lecturasParaElEstado) : null,
      };
    });

    const otros = canal.tipo === 'privado' ? otrosQueLoVen.map((p) => p.nombre) : [];

    return {
      canal: {
        id: canal.id,
        tipo: canal.tipo,
        nombre: nombreDelCanal({ tipo: canal.tipo, nombre: canal.nombre, otros }),
        silenciado: mia?.silenciado ?? false,
        sePuedeSalir: canal.tipo === 'canal' || canal.tipo === 'privado',
        puedeRetirar: canal.tipo !== 'privado' && puede.editar('app.equipo'),
      },
      personas,
      lecturas: lecturasDeOtros,
      mensajes,
      hayMas,
      leidoHasta: mia?.leido_hasta ?? '0',
    };
  },
});

// ── La gente del local ───────────────────────────────────────────────────────

export interface SalidaGenteDelChat {
  readonly personas: readonly PersonaDelCanal[];
}

/** Con quién se puede hablar: quien ve «Todo el equipo» del local, sin quien mira. */
export const genteDelChat = consulta<Record<string, never>, SalidaGenteDelChat>({
  nombre: 'gente_del_chat',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocalDelChat(contexto);
    const personas = await contexto.sql<PersonaDelCanal[]>`
      select q.persona_id::text as id, q.nombre
        from estook.canal c
        cross join lateral estook.quien_ve_el_canal(c.id) q
       where c.local_id = ${localId} and c.tipo = 'equipo'
         and q.persona_id <> ${contexto.personaId}
       order by q.nombre
    `;
    return { personas };
  },
});

// ── El buscador ──────────────────────────────────────────────────────────────

export interface EncontradoEnElChat {
  readonly canalId: string;
  readonly canal: string;
  readonly mensajeId: string;
  readonly autor: string;
  readonly vista: string;
  readonly en: string;
}

export const entradaBuscarEnElChat = z
  .object({ texto: z.string().trim().min(2, 'Escribe al menos dos letras.').max(80) })
  .strict();

export type EntradaBuscarEnElChat = z.infer<typeof entradaBuscarEnElChat>;

/**
 * Buscar en lo que puedes ver, con y sin acentos (0071, 14). Las políticas deciden qué
 * entra: un privado ajeno no sale nunca.
 */
export const buscarEnElChat = consulta<
  EntradaBuscarEnElChat,
  { readonly encontrados: readonly EncontradoEnElChat[] }
>({
  nombre: 'buscar_en_el_chat',
  entrada: entradaBuscarEnElChat,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelChat(contexto);
    const filas = await contexto.sql<
      {
        canal_id: string;
        tipo: TipoDeCanal;
        nombre: string | null;
        otros: string[] | null;
        id: string;
        autor: string | null;
        texto: string;
        en: string;
      }[]
    >`
      select m.canal_id::text as canal_id, c.tipo::text as tipo, c.nombre,
             (select array_agg(p2.nombre order by p2.nombre)
                from estook.miembro_del_canal mc
                join estook.persona p2 on p2.id = mc.persona_id
               where c.tipo = 'privado' and mc.canal_id = c.id
                 and mc.persona_id <> ${contexto.personaId}) as otros,
             m.id::text as id, p.nombre as autor, m.texto,
             to_char(m.creado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en
        from estook.mensaje m
        join estook.canal c on c.id = m.canal_id
        left join estook.persona p on p.id = m.autor_id
       where m.local_id = ${localId}
         and m.borrado_en is null
         and m.texto is not null
         and estook.sin_acentos(m.texto) like '%' || estook.sin_acentos(${entrada.texto}) || '%'
       order by m.id desc
       limit 30
    `;
    return {
      encontrados: filas.map((f) => ({
        canalId: f.canal_id,
        canal: nombreDelCanal({ tipo: f.tipo, nombre: f.nombre, otros: f.otros ?? [] }),
        mensajeId: f.id,
        autor: f.autor ?? 'Alguien',
        vista: f.texto,
        en: f.en,
      })),
    };
  },
});
