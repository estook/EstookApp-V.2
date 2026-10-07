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
  type TipoDeTarjeta,
} from '@estook/dominio';
import { elLocalDelChat, llevaCanales } from '../chat.ts';
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
  /** Si puede crear canales: el gerente y los jefes (0075, 3). */
  readonly puedeCrearCanales: boolean;
  /** Si ya están los de fábrica. Si no, la app abre el chat para que se creen. */
  readonly abierto: boolean;
}

export const misCanales = consulta<Record<string, never>, SalidaMisCanales>({
  nombre: 'mis_canales',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const localId = elLocalDelChat(contexto);
    const lleva = await llevaCanales(contexto, localId);

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
        ultimo_tarjeta: TipoDeTarjeta | null;
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
             u.tarjeta ->> 'tipo' as ultimo_tarjeta,
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

    const orden = (tipo: TipoDeCanal) => (tipo === 'equipo' ? 0 : 1);
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
                    tarjeta: f.ultimo_tarjeta,
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
      puedeCrearCanales: lleva,
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

/**
 * Una tarjeta, leída **con los permisos de quien la mira** (0075): lo que no puede ver
 * llega a nulo, y la app dice «Esto no es de lo que puedes ver», sin más.
 */
export type TarjetaDelMensaje =
  | {
      readonly tipo: 'pedido';
      readonly id: string;
      readonly pedido: {
        readonly numero: number;
        readonly proveedor: string;
        readonly estado: string;
        readonly llegaEl: string | null;
      } | null;
    }
  | {
      readonly tipo: 'producto';
      readonly id: string;
      readonly producto: { readonly nombre: string; readonly formato: string | null } | null;
    }
  | { readonly tipo: 'horario'; readonly lunes: string };

/** «Confirmar que lo he leído» (0075): cuántos, y si me toca a mí. */
export interface ConfirmarElMensaje {
  readonly cuantos: number;
  readonly de: number;
  /** Lo mío: me falta, ya lo hice, o no me lo pide (lo escribí yo, o entré después). */
  readonly mio: 'falta' | 'hecho' | null;
  /** Quién falta: a quien lo pidió y a quien lleva el equipo. Nulo a los demás. */
  readonly faltan: readonly string[] | null;
}

export interface FijadoDelCanal {
  readonly id: string;
  readonly autor: string;
  readonly vista: string;
  readonly en: string;
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
  /** Lo propio se borra, salvo lo que pide confirmar (0075). */
  readonly sePuedeBorrar: boolean;
  /** Solo en lo propio: enviado, entregado o leído (0071, pregunta 6). */
  readonly estado: EstadoDeMiMensaje | null;
  readonly tarjeta: TarjetaDelMensaje | null;
  readonly fijado: boolean;
  readonly confirmar: ConfirmarElMensaje | null;
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
    /** Si fija y pide confirmar: el gerente y los jefes, nunca en un privado (0075). */
    readonly puedeFijar: boolean;
    /** Si lo renombra y lo borra: en los creados, quien lo creó y el gerente (0075). */
    readonly puedeGestionar: boolean;
  };
  /** Lo fijado arriba, de lo más viejo a lo más nuevo. Aunque no esté en esta página. */
  readonly fijados: readonly FijadoDelCanal[];
  /** Quien ve el canal, para nombrar y para saber quién ha leído. */
  readonly personas: readonly PersonaDelCanal[];
  /** Hasta dónde ha leído cada uno de los demás. «Leído» no se oculta (0071, 6). */
  readonly lecturas: readonly LecturaDeOtro[];
  readonly mensajes: readonly MensajeDelCanal[];
  readonly hayMas: boolean;
  /** El último que ya había leído quien mira, para la raya de «sin leer». */
  readonly leidoHasta: string;
}

/** La tarjeta guardada, venga como objeto o como texto, o nula si no se entiende. */
function laTarjeta(
  guardada: { tipo?: string; id?: string } | string | null,
): { tipo: 'pedido' | 'producto' | 'horario'; id: string } | null {
  const valor = typeof guardada === 'string' ? (JSON.parse(guardada) as unknown) : guardada;
  if (valor === null || typeof valor !== 'object') return null;
  const { tipo, id } = valor as { tipo?: unknown; id?: unknown };
  if (typeof id !== 'string') return null;
  if (tipo === 'pedido' || tipo === 'producto' || tipo === 'horario') return { tipo, id };
  return null;
}

/** La tarjeta como la ve quien mira: con lo que su sesión ha podido leer, o nula. */
function laTarjetaVista(
  tarjeta: { tipo: 'pedido' | 'producto' | 'horario'; id: string } | null,
  pedidos: readonly {
    id: string;
    numero: number;
    proveedor: string;
    estado: string;
    llega_el: string | null;
  }[],
  productos: readonly { id: string; nombre: string; formato: string | null }[],
): TarjetaDelMensaje | null {
  if (tarjeta === null) return null;
  if (tarjeta.tipo === 'horario') return { tipo: 'horario', lunes: tarjeta.id };
  if (tarjeta.tipo === 'pedido') {
    const p = pedidos.find((x) => x.id === tarjeta.id);
    return {
      tipo: 'pedido',
      id: tarjeta.id,
      pedido:
        p === undefined
          ? null
          : { numero: p.numero, proveedor: p.proveedor, estado: p.estado, llegaEl: p.llega_el },
    };
  }
  const p = productos.find((x) => x.id === tarjeta.id);
  return {
    tipo: 'producto',
    id: tarjeta.id,
    producto: p === undefined ? null : { nombre: p.nombre, formato: p.formato },
  };
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
      {
        id: string;
        tipo: TipoDeCanal;
        nombre: string | null;
        local_id: string;
        creado_por: string | null;
      }[]
    >`
      select id, tipo::text as tipo, nombre, local_id, creado_por::text as creado_por
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
        tarjeta: { tipo?: string; id?: string } | null;
        pide_confirmar: boolean;
        fijado: boolean;
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
             ${yo}::uuid = any (m.menciones) as me_nombran,
             m.tarjeta, m.pide_confirmar, m.fijado_en is not null as fijado
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
    const lleva = canal.tipo !== 'privado' && (await llevaCanales(contexto, canal.local_id));

    // Las tarjetas, con la sesión de quien mira: lo que no ve, no sale (0075).
    const tarjetas = deEstaVez.map((f) => ({ id: f.id, tarjeta: laTarjeta(f.tarjeta) }));
    const deTipo = (tipo: string) =>
      tarjetas.flatMap((t) => (t.tarjeta?.tipo === tipo ? [t.tarjeta.id] : []));
    const pedidos =
      deTipo('pedido').length === 0
        ? []
        : await contexto.sql<
            {
              id: string;
              numero: number;
              proveedor: string;
              estado: string;
              llega_el: string | null;
            }[]
          >`
            select p.id::text as id, p.numero, pr.nombre as proveedor, p.estado::text as estado,
                   to_char(p.llega_el, 'YYYY-MM-DD') as llega_el
              from estook.pedido_de_compra p
              join estook.proveedor pr on pr.id = p.proveedor_id
             where p.id = any (${comoLista(deTipo('pedido'))}::text::uuid[])
          `;
    const productos =
      deTipo('producto').length === 0
        ? []
        : await contexto.sql<{ id: string; nombre: string; formato: string | null }[]>`
            select id::text as id, nombre, formato from estook.producto
             where id = any (${comoLista(deTipo('producto'))}::text::uuid[])
          `;

    // Quién tiene que confirmar cada uno, y quién lo ha hecho.
    const conConfirmar = deEstaVez.filter((f) => f.pide_confirmar).map((f) => f.id);
    const confirmaciones =
      conConfirmar.length === 0
        ? []
        : await contexto.sql<
            { mensaje_id: string; persona_id: string; hecho: boolean; nombre: string | null }[]
          >`
            select c.mensaje_id::text as mensaje_id, c.persona_id::text as persona_id,
                   c.confirmado_en is not null as hecho, p.nombre
              from estook.confirmacion_del_mensaje c
              left join estook.persona p on p.id = c.persona_id
             where c.mensaje_id = any (${comoLista(conConfirmar)}::text::bigint[])
             order by p.nombre
          `;

    // Lo fijado, aunque sea más viejo que lo que llega en esta página.
    const fijados = await contexto.sql<
      {
        id: string;
        autor: string | null;
        texto: string | null;
        adjunto_tipo: TipoDeAdjunto | null;
        adjunto_nombre: string | null;
        adjunto_segundos: number | null;
        tarjeta: TipoDeTarjeta | null;
        en: string;
      }[]
    >`
      select m.id::text as id, p.nombre as autor, m.texto, m.adjunto_tipo, m.adjunto_nombre,
             m.adjunto_segundos, m.tarjeta ->> 'tipo' as tarjeta,
             to_char(m.creado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en
        from estook.mensaje m
        left join estook.persona p on p.id = m.autor_id
       where m.canal_id = ${canal.id} and m.fijado_en is not null and m.borrado_en is null
       order by m.fijado_en
    `;

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
          !f.pide_confirmar &&
          f.texto !== null &&
          sePuedeCorregir(new Date(f.creado_en), contexto.ahora),
        sePuedeBorrar: esMio && !f.borrado && !f.pide_confirmar,
        estado: esMio && !f.borrado ? estadoDeMiMensaje(Number(f.id), lecturasParaElEstado) : null,
        tarjeta: f.borrado
          ? null
          : laTarjetaVista(
              tarjetas.find((t) => t.id === f.id)?.tarjeta ?? null,
              pedidos,
              productos,
            ),
        fijado: f.fijado,
        confirmar:
          !f.pide_confirmar || f.borrado
            ? null
            : (() => {
                const suyas = confirmaciones.filter((c) => c.mensaje_id === f.id);
                const mia = suyas.find((c) => c.persona_id === yo);
                return {
                  cuantos: suyas.filter((c) => c.hecho).length,
                  de: suyas.length,
                  mio: mia === undefined ? null : mia.hecho ? 'hecho' : 'falta',
                  faltan:
                    esMio || lleva
                      ? suyas.filter((c) => !c.hecho).map((c) => c.nombre ?? 'Alguien')
                      : null,
                };
              })(),
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
        puedeFijar: lleva,
        puedeGestionar:
          canal.tipo === 'canal' && (canal.creado_por === yo || puede.editar('app.equipo')),
      },
      fijados: fijados.map((f) => ({
        id: f.id,
        autor: f.autor ?? 'Alguien',
        vista: vistaPrevia({
          texto: f.texto,
          adjuntoTipo: f.adjunto_tipo,
          adjuntoNombre: f.adjunto_nombre,
          adjuntoSegundos: f.adjunto_segundos,
          borrado: false,
          tarjeta: f.tarjeta,
        }),
        en: f.en,
      })),
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
