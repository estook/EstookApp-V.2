import {
  DIAS_QUE_ESPERA_UN_AVISO,
  MINUTOS_ANTES_DE_ENTRAR,
  SILENCIO_DE_FABRICA,
  TIPOS_DE_CANAL,
  avisoDelChatEnElMovil,
  avisoDeConfirmar,
  correoDelChat,
  cuandoSeRecuerda,
  nombreDelCanal,
  vistaPrevia,
  avisoDeCaducidad,
  avisoDeEntrasEnUnRato,
  avisoDePedidoQueNoLlega,
  cuandoPuedeSonar,
  esCuandoSuena,
  fechaEnElLocal,
  horaEnElLocal,
  instanteEnElLocal,
  masDias,
  resumenParaElMovil,
  suModo,
  type CuandoSuena,
  type TipoDeAdjunto,
  type TipoDeCanal,
  type TipoDeTarjeta,
  type TipoDeAviso,
  type TurnoQueSeMira,
} from '@estook/dominio';
import type { LoQueVaAlMovil, SuscripcionDeMovil } from '../infraestructura/movil.ts';
import { avisar, losQueLoQuieren, quienesPuedenRecibir, type QuienRecibe } from './avisos.ts';
import { almacenHoy } from './consultas/almacen.ts';
import type { Contexto } from './contrato.ts';
import { correoDelChatParaMandar } from './correos.ts';
import { comoLista } from './listas.ts';
import { irAlPedido } from './lo-que-avisa.ts';
import { aparte, comoSiFuera } from './lo-que-avisa-el-reloj.ts';

/**
 * Lo que va al móvil (I · decisión 0070).
 *
 * Tres cosas, y las tres las hace el sistema, sin nadie delante:
 *
 *   1 · **Mandar** los avisos que esperan al móvil (`mandarLoDelMovil`): al momento,
 *       después de cada comando, y cada minuto lo que esperaba a su hora.
 *   2 · **Apuntar lo que toca a una hora** (`programarLoDelMovil`), cada hora: «entras
 *       en cinco minutos», lo que caduca a las 18:00 y a las 08:00, y el pedido que no
 *       llega media hora después de cuando suele.
 *   3 · **Hacerlo cuando llega su hora** (`hacerLoProgramado`), cada minuto, mirando
 *       antes si sigue haciendo falta: si el turno cambió o el pedido llegó, nada.
 *
 * ── «Fuera de turno no suena nada» (0017) ───────────────────────────────────
 *
 * Antes de mandar se mira **cuándo le puede sonar** a cada uno (`cuandoPuedeSonar`):
 * en su turno, o fuera de sus horas de silencio, como haya elegido. Si no puede, el
 * aviso espera a cuando pueda, y **lo que ha esperado sale en uno solo** («Tienes 3
 * avisos»): tres pitidos al entrar al turno son ruido. «Entras en cinco minutos» no
 * espera nunca: es justo antes de su turno.
 *
 * ── Que no se quede sin ver (Richi, 1-oct) ──────────────────────────────────
 *
 * Todo sigue en la campana pase lo que pase. Si el móvil no lo recibe —se cambió de
 * teléfono, quitó Estook, el servicio no contesta tras cinco intentos—, **sale por
 * correo** si lo quería por correo. Y el icono de Estook lleva el número de los que
 * tiene sin leer.
 */

// ── Cómo va cada aviso al móvil ──────────────────────────────────────────────

const MINUTO = 60_000;
const HORA = 60 * MINUTO;

/**
 * Cuánto sirve un aviso en el móvil. Pasado eso, si todavía no ha podido sonar, ya no
 * suena (sigue en la campana): «entras en cinco minutos» a media tarde no sirve, ni
 * «el pedido no ha llegado» al día siguiente.
 */
function cuantoVale(tipo: TipoDeAviso): number {
  if (tipo === 'turno.entras') return 15 * MINUTO;
  if (tipo === 'pedido.no_llega') return 4 * HORA;
  if (tipo === 'lote.caduca') return 18 * HORA;
  return 7 * 24 * HORA;
}

/** Lo que no puede esperar a que el móvil salga del ahorro de batería. */
const URGENTES: ReadonlySet<TipoDeAviso> = new Set([
  'turno.entras',
  'pedido.invitacion',
  'pedido.no_llega',
]);

/** Cuántas veces se intenta un aviso; después sale por correo, si lo quería. */
const INTENTOS = 5;

/** Fallos seguidos de un móvil antes de darlo por perdido. */
const FALLOS_PARA_OLVIDARLO = 20;

/** Lo que se mira de una vez. Más esperaría al minuto siguiente. */
const DE_UNA_VEZ = 200;

export interface LoQueHizoElMovil {
  readonly mandados: number;
  readonly esperan: number;
  readonly alCorreo: number;
  readonly programados: number;
  readonly hechos: number;
}

interface AvisoPendiente {
  readonly id: string;
  readonly persona_id: string;
  readonly tipo: TipoDeAviso;
  readonly clave: string;
  readonly titulo: string;
  readonly detalle: string | null;
  readonly ir: string | null;
  readonly actualizado_en: string;
  readonly movil_intentos: number;
  readonly zona_horaria: string;
}

interface SuMovil extends SuscripcionDeMovil {
  readonly id: string;
  readonly persona_id: string;
}

/** Lo que hace falta de alguien para saber cuándo le puede sonar. */
interface SuReloj {
  readonly modo: CuandoSuena;
  readonly desde: string;
  readonly hasta: string;
  readonly fichado: boolean;
  readonly turnos: readonly TurnoQueSeMira[];
}

async function susRelojes(
  contexto: Contexto,
  personas: readonly string[],
): Promise<ReadonlyMap<string, SuReloj>> {
  const lista = comoLista(personas);
  const elegidos = await contexto.sql<
    { persona_id: string; modo: string; desde: string; hasta: string }[]
  >`
    select persona_id, modo, to_char(silencio_desde, 'HH24:MI') as desde,
           to_char(silencio_hasta, 'HH24:MI') as hasta
      from estook.cuando_suena where persona_id = any (${lista}::text::uuid[])
  `;
  const como = await contexto.sql<
    { persona_id: string; fichado: boolean; tiene_horario: boolean }[]
  >`select persona_id, fichado, tiene_horario from estook.como_le_suena(${lista}::text::uuid[])`;
  const turnos = await contexto.sql<{ persona_id: string; empieza: Date; acaba: Date }[]>`
    select persona_id, empieza, acaba
      from estook.turnos_de(
        ${lista}::text::uuid[],
        ${new Date(contexto.ahora.getTime() - 24 * HORA).toISOString()}::timestamptz,
        ${new Date(contexto.ahora.getTime() + 8 * 24 * HORA).toISOString()}::timestamptz
      )
  `;
  const porElegido = new Map(elegidos.map((e) => [e.persona_id, e] as const));
  const mapa = new Map<string, SuReloj>();
  for (const c of como) {
    const elegido = porElegido.get(c.persona_id);
    mapa.set(c.persona_id, {
      modo: suModo(
        elegido !== undefined && esCuandoSuena(elegido.modo) ? elegido.modo : null,
        c.tiene_horario,
      ),
      desde: elegido?.desde ?? SILENCIO_DE_FABRICA.desde,
      hasta: elegido?.hasta ?? SILENCIO_DE_FABRICA.hasta,
      fichado: c.fichado,
      turnos: turnos
        .filter((t) => t.persona_id === c.persona_id)
        .map((t) => ({ empieza: new Date(t.empieza), acaba: new Date(t.acaba) })),
    });
  }
  return mapa;
}

/** La etiqueta del aviso en el móvil: el mismo aviso sustituye al anterior, no se apila. */
function etiquetaDe(aviso: AvisoPendiente): string {
  return `${aviso.tipo}:${aviso.clave}`.slice(0, 120);
}

// ── 1 · Mandar ───────────────────────────────────────────────────────────────

/**
 * Manda al móvil lo que espera y ya puede sonar. **Ya dentro del sistema**, y fuera de
 * la transacción del cambio que lo provocó: un móvil que no contesta no deshace nada.
 */
async function mandarLosAvisosAlMovil(contexto: Contexto): Promise<{
  mandados: number;
  esperan: number;
  alCorreo: number;
}> {
  const movil = contexto.movil;
  const ahora = contexto.ahora;
  const hecho = { mandados: 0, esperan: 0, alCorreo: 0 };

  const pendientes = await contexto.sql<AvisoPendiente[]>`
    select a.id, a.persona_id, a.tipo, a.clave, a.titulo, a.detalle, a.ir,
           to_char(a.actualizado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as actualizado_en,
           a.movil_intentos, coalesce(l.zona_horaria, 'Europe/Madrid') as zona_horaria
      from estook.aviso a
      left join estook.local l on l.id = a.local_id
     where a.movil = 'pendiente' and a.movil_desde <= ${ahora.toISOString()}::timestamptz
     order by a.persona_id, a.actualizado_en
     limit ${DE_UNA_VEZ}
       for update of a skip locked
  `;
  if (pendientes.length === 0) return hecho;

  /** Ya no va al móvil; si lo quería por correo, sale por correo. */
  async function alCorreo(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const pasados = await contexto.sql<{ id: string }[]>`
      update estook.aviso
         set movil = 'no', movil_desde = null,
             correo = case when correo_si_no_llega and correo = 'no' then 'pendiente' else correo end,
             correo_intentos = case when correo_si_no_llega and correo = 'no' then 0 else correo_intentos end
       where id = any (${comoLista(ids)}::text::uuid[])
      returning id
    `;
    hecho.alCorreo += pasados.length;
  }

  // Sin el puerto encendido (las claves quitadas), nada va a salir: al correo.
  if (movil === null) {
    await alCorreo(pendientes.map((p) => p.id));
    return hecho;
  }

  const personas = [...new Set(pendientes.map((p) => p.persona_id))];
  const lista = comoLista(personas);
  const moviles = await contexto.sql<SuMovil[]>`
    select id, persona_id, direccion, p256dh, auth
      from estook.movil_suscrito where persona_id = any (${lista}::text::uuid[])
  `;
  const sinLeer = await contexto.sql<{ persona_id: string; cuantos: number }[]>`
    select persona_id, count(*)::int as cuantos from estook.aviso
     where leido_en is null and persona_id = any (${lista}::text::uuid[])
     group by persona_id
  `;
  const relojes = await susRelojes(contexto, personas);

  for (const persona of personas) {
    const suyos = pendientes.filter((p) => p.persona_id === persona);
    const susMoviles = moviles.filter((m) => m.persona_id === persona);
    if (susMoviles.length === 0) {
      await alCorreo(suyos.map((a) => a.id));
      continue;
    }

    // «Entras en cinco minutos» no espera nunca. Lo demás, a cuando pueda sonar.
    const reloj = relojes.get(persona);
    const zona = suyos[0]?.zona_horaria ?? 'Europe/Madrid';
    const cuando =
      reloj === undefined
        ? ahora
        : cuandoPuedeSonar(ahora, {
            modo: reloj.modo,
            silencioDesde: reloj.desde,
            silencioHasta: reloj.hasta,
            zonaHoraria: zona,
            turnos: reloj.turnos,
            fichadoAhora: reloj.fichado,
          });

    const yaPueden: AvisoPendiente[] = [];
    for (const aviso of suyos) {
      if (
        aviso.tipo === 'turno.entras' ||
        (cuando !== null && cuando.getTime() <= ahora.getTime())
      ) {
        yaPueden.push(aviso);
        continue;
      }
      const vale = Date.parse(aviso.actualizado_en) + cuantoVale(aviso.tipo);
      if (cuando === null || cuando.getTime() > vale) {
        // No va a poder sonar mientras sirva: se queda en la campana, y si lo quería
        // por correo, al correo.
        await alCorreo([aviso.id]);
        continue;
      }
      await contexto.sql`
        update estook.aviso set movil_desde = ${cuando.toISOString()}::timestamptz
         where id = ${aviso.id}
      `;
      hecho.esperan += 1;
    }
    if (yaPueden.length === 0) continue;

    // Lo que esperaba sale en uno; lo que llega solo, tal cual.
    const numero = sinLeer.find((s) => s.persona_id === persona)?.cuantos ?? 0;
    const entras = yaPueden.filter((a) => a.tipo === 'turno.entras');
    const resto = yaPueden.filter((a) => a.tipo !== 'turno.entras');
    const envios: { avisos: AvisoPendiente[]; carga: LoQueVaAlMovil; urgente: boolean }[] = [];
    for (const aviso of entras) {
      envios.push({
        avisos: [aviso],
        carga: {
          titulo: aviso.titulo,
          detalle: aviso.detalle,
          ir: aviso.ir,
          etiqueta: etiquetaDe(aviso),
          sinLeer: numero,
        },
        urgente: true,
      });
    }
    const primero = resto[0];
    if (primero !== undefined && resto.length === 1) {
      envios.push({
        avisos: resto,
        carga: {
          titulo: primero.titulo,
          detalle: primero.detalle,
          ir: primero.ir,
          etiqueta: etiquetaDe(primero),
          sinLeer: numero,
        },
        urgente: URGENTES.has(primero.tipo),
      });
    } else if (resto.length > 1) {
      const resumen = resumenParaElMovil(resto.map((a) => a.titulo));
      envios.push({
        avisos: resto,
        // Al tocarlo se abre la campana, donde están todos.
        carga: { ...resumen, ir: '/?hacer=avisos', etiqueta: 'estook-resumen', sinLeer: numero },
        urgente: resto.some((a) => URGENTES.has(a.tipo)),
      });
    }

    for (const envio of envios) {
      const ids = envio.avisos.map((a) => a.id);
      const vale = Math.min(...envio.avisos.map((a) => cuantoVale(a.tipo)));
      const resultados = await Promise.all(
        susMoviles.map(async (m) => ({
          movil: m,
          como: await movil
            .mandar(m, envio.carga, {
              urgente: envio.urgente,
              segundosQueVale: Math.min(24 * 3600, Math.trunc(vale / 1000)),
            })
            .catch(() => 'fallo' as const),
        })),
      );

      for (const r of resultados) {
        if (r.como === 'ya_no_existe') {
          await contexto.sql`delete from estook.movil_suscrito where id = ${r.movil.id}`;
        } else if (r.como === 'entregado') {
          await contexto.sql`
            update estook.movil_suscrito set fallos = 0, ultimo_uso_en = now() where id = ${r.movil.id}
          `;
        } else {
          await contexto.sql`
            delete from estook.movil_suscrito
             where id = ${r.movil.id} and fallos + 1 >= ${FALLOS_PARA_OLVIDARLO}
          `;
          await contexto.sql`
            update estook.movil_suscrito set fallos = fallos + 1 where id = ${r.movil.id}
          `;
        }
      }

      if (resultados.some((r) => r.como === 'entregado')) {
        await contexto.sql`
          update estook.aviso set movil = 'mandado', movil_desde = null
           where id = any (${comoLista(ids)}::text::uuid[])
        `;
        hecho.mandados += ids.length;
      } else if (resultados.every((r) => r.como === 'ya_no_existe')) {
        await alCorreo(ids);
      } else {
        // Pasajero: se reintenta, cada vez un poco más tarde; al quinto, al correo.
        const intentos = Math.max(...envio.avisos.map((a) => a.movil_intentos)) + 1;
        if (intentos >= INTENTOS) {
          await alCorreo(ids);
        } else {
          await contexto.sql`
            update estook.aviso
               set movil_intentos = ${intentos},
                   movil_desde = ${new Date(ahora.getTime() + intentos * 2 * MINUTO).toISOString()}::timestamptz
             where id = any (${comoLista(ids)}::text::uuid[])
          `;
          hecho.esperan += ids.length;
        }
      }
    }
  }
  return hecho;
}

/**
 * Manda al móvil lo que espera y ya puede sonar: los avisos de la campana y lo del chat
 * (C1 · 0073). **Ya dentro del sistema**, y fuera de la transacción del cambio que lo
 * provocó: un móvil que no contesta no deshace nada.
 */
export async function mandarLoDelMovil(contexto: Contexto): Promise<{
  mandados: number;
  esperan: number;
  alCorreo: number;
}> {
  const avisos = await mandarLosAvisosAlMovil(contexto);
  const chat = await mandarElChatAlMovil(contexto);
  return {
    mandados: avisos.mandados + chat.mandados,
    esperan: avisos.esperan + chat.esperan,
    alCorreo: avisos.alCorreo,
  };
}

// ── 1 bis · Lo del chat (C1 · 0073) ──────────────────────────────────────────

/** Cuánto lo guarda el servicio de avisos si el móvil está apagado cuando suena. */
const LO_QUE_VALE_EL_CHAT = 12 * HORA;

/**
 * Cuánto espera lo del chat a poder sonar: **hasta su próximo turno**, o hasta que
 * acaben sus horas de silencio, si no lo ha leído antes (leerlo lo quita). Lo mismo que
 * los avisos, una semana, para que unos días libres no lo tiren. Antes eran 12 horas y
 * lo de la víspera de un día libre se perdía sin sonar nunca (6-oct, lección 148).
 * Pasado eso, sigue en el chat con su número en el icono.
 */
const LO_QUE_ESPERA_EL_CHAT = DIAS_QUE_ESPERA_UN_AVISO * 24 * HORA;

interface ChatPendiente {
  readonly persona_id: string;
  readonly canal_id: string;
  readonly cuantos: number;
  readonly le_mencionan: boolean;
  readonly intentos: number;
  readonly creado_en: string;
  readonly tipo: string;
  readonly nombre: string | null;
  readonly zona_horaria: string;
  readonly autor_id: string | null;
  readonly texto: string | null;
  readonly adjunto_tipo: TipoDeAdjunto | null;
  readonly adjunto_nombre: string | null;
  readonly adjunto_segundos: number | null;
  readonly tarjeta: TipoDeTarjeta | null;
  readonly borrado: boolean;
  readonly por_correo: boolean;
}

/** Cuándo puede sonar el móvil de alguien, o salirle el correo: lo mismo (0070). */
function cuandoPuede(ahora: Date, reloj: SuReloj | undefined, zonaHoraria: string): Date | null {
  if (reloj === undefined) return ahora;
  return cuandoPuedeSonar(ahora, {
    modo: reloj.modo,
    silencioDesde: reloj.desde,
    silencioHasta: reloj.hasta,
    zonaHoraria,
    turnos: reloj.turnos,
    fichadoAhora: reloj.fichado,
  });
}

/** El nombre del canal como lo lee quien recibe el aviso: un privado, por los otros. */
async function elCanalParaQuien(
  contexto: Contexto,
  p: ChatPendiente,
): Promise<{ canal: string; autor: string; otros: readonly string[] }> {
  // Los nombres, de la función del chat: contesta al sistema, y la tabla de personas
  // solo enseña a quien comparte local, que aquí no hay nadie.
  const gente = await contexto.sql<{ id: string; nombre: string }[]>`
    select persona_id::text as id, nombre from estook.quien_ve_el_canal(${p.canal_id}::uuid)
     order by nombre
  `;
  const otros =
    p.tipo === 'privado' ? gente.filter((g) => g.id !== p.persona_id).map((g) => g.nombre) : [];
  const tipo = esTipoDeCanal(p.tipo) ? p.tipo : 'canal';
  return {
    canal: nombreDelCanal({ tipo, nombre: p.nombre, otros }),
    autor: gente.find((g) => g.id === p.autor_id)?.nombre ?? 'Alguien',
    otros,
  };
}

/** Entre dos correos del chat a la misma persona, como poco: uno al día (0075). */
const ENTRE_CORREOS_DEL_CHAT = 20 * HORA;

/**
 * El correo del chat (C2 · 0075): a quien no tiene el móvil puesto, **sus privados y
 * lo que le nombra**, sin leer, en un correo **al día como mucho**, cuando le puede
 * sonar (en su turno, o fuera de sus horas de silencio: el correo tampoco salta la
 * desconexión). Leerlo en el chat lo quita antes de que salga.
 */
async function mandarElCorreoDelChat(
  contexto: Contexto,
  pendientes: readonly ChatPendiente[],
  relojes: ReadonlyMap<string, SuReloj>,
): Promise<{ mandados: number; esperan: number }> {
  const hecho = { mandados: 0, esperan: 0 };
  if (pendientes.length === 0) return hecho;
  const ahora = contexto.ahora;
  const correo = contexto.correo;

  async function quitar(p: ChatPendiente): Promise<void> {
    await contexto.sql`
      delete from estook.chat_al_movil where persona_id = ${p.persona_id} and canal_id = ${p.canal_id}
    `;
  }
  if (correo === null) {
    for (const p of pendientes) await quitar(p);
    return hecho;
  }

  const personas = [...new Set(pendientes.map((p) => p.persona_id))];
  // El correo, de la función que se lo da al sistema: la tabla de personas no se lo enseña.
  const datos = await contexto.sql<
    { id: string; correo: string | null; mandado_en: Date | null }[]
  >`
    select q.persona_id::text as id, q.correo, c.mandado_en
      from estook.a_quien_escribir(${comoLista(personas)}::text::uuid[]) q
      left join estook.correo_del_chat c on c.persona_id = q.persona_id
  `;

  for (const persona of personas) {
    const suyos = pendientes.filter((p) => p.persona_id === persona);
    const suyo = datos.find((d) => d.id === persona);
    if (suyo?.correo === null || suyo?.correo === undefined || suyo.correo === '') {
      for (const p of suyos) await quitar(p);
      continue;
    }

    const cuando = cuandoPuede(
      ahora,
      relojes.get(persona),
      suyos[0]?.zona_horaria ?? 'Europe/Madrid',
    );
    const otraVez =
      suyo.mandado_en === null
        ? null
        : new Date(new Date(suyo.mandado_en).getTime() + ENTRE_CORREOS_DEL_CHAT);
    const desde =
      cuando === null
        ? null
        : otraVez !== null && otraVez.getTime() > cuando.getTime()
          ? otraVez
          : cuando;

    const quedan: ChatPendiente[] = [];
    for (const p of suyos) {
      const vale = Date.parse(p.creado_en) + LO_QUE_ESPERA_EL_CHAT;
      if (desde === null || desde.getTime() > vale) await quitar(p);
      else quedan.push(p);
    }
    if (quedan.length === 0 || desde === null) continue;
    if (desde.getTime() > ahora.getTime()) {
      for (const p of quedan) {
        await contexto.sql`
          update estook.chat_al_movil set movil_desde = ${desde.toISOString()}::timestamptz
           where persona_id = ${p.persona_id} and canal_id = ${p.canal_id}
        `;
      }
      hecho.esperan += quedan.length;
      continue;
    }

    const lineas = [];
    for (const p of quedan) {
      const { canal } = await elCanalParaQuien(contexto, p);
      lineas.push({ canal, cuantos: p.cuantos, teNombran: p.le_mencionan });
    }
    try {
      await correo.mandar(correoDelChatParaMandar(suyo.correo, correoDelChat(lineas)));
      await contexto.sql`
        insert into estook.correo_del_chat (persona_id, mandado_en)
        values (${persona}, ${ahora.toISOString()}::timestamptz)
        on conflict (persona_id) do update set mandado_en = excluded.mandado_en
      `;
      for (const p of quedan) await quitar(p);
      hecho.mandados += 1;
    } catch {
      // Pasajero: se reintenta, cada vez un poco más tarde; al quinto, se deja.
      for (const p of quedan) {
        if (p.intentos + 1 >= INTENTOS) {
          await quitar(p);
          continue;
        }
        await contexto.sql`
          update estook.chat_al_movil
             set intentos = intentos + 1,
                 movil_desde = ${new Date(ahora.getTime() + (p.intentos + 1) * 2 * MINUTO).toISOString()}::timestamptz
           where persona_id = ${p.persona_id} and canal_id = ${p.canal_id}
        `;
      }
      hecho.esperan += quedan.length;
    }
  }
  return hecho;
}

/**
 * Lo del chat que espera al móvil (0071, 7): uno por canal y persona, con lo que se ha
 * juntado. Las mismas reglas que los avisos —en su turno, o fuera de sus horas de
 * silencio—. Lo que no puede sonar mientras sirva, se queda en el chat, que es su sitio.
 * Lo de quien no tiene móvil va al correo del chat (C2 · 0075).
 */
async function mandarElChatAlMovil(
  contexto: Contexto,
): Promise<{ mandados: number; esperan: number }> {
  const movil = contexto.movil;
  const ahora = contexto.ahora;
  const hecho = { mandados: 0, esperan: 0 };

  // Sin el puerto encendido, lo que era para el móvil no va a salir. Lo del correo, sí.
  if (movil === null) {
    await contexto.sql`
      delete from estook.chat_al_movil
       where not por_correo and movil_desde <= ${ahora.toISOString()}::timestamptz
    `;
  }

  const pendientes = await contexto.sql<ChatPendiente[]>`
    select c.persona_id, c.canal_id, c.cuantos, c.le_mencionan, c.intentos, c.por_correo,
           to_char(c.creado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as creado_en,
           can.tipo::text as tipo, can.nombre, coalesce(l.zona_horaria, 'Europe/Madrid') as zona_horaria,
           m.autor_id::text as autor_id, m.texto, m.adjunto_tipo, m.adjunto_nombre, m.adjunto_segundos,
           m.tarjeta ->> 'tipo' as tarjeta, m.borrado_en is not null as borrado
      from estook.chat_al_movil c
      join estook.canal can on can.id = c.canal_id
      join estook.local l on l.id = can.local_id
      left join estook.mensaje m on m.id = c.ultimo_id
     where c.movil_desde <= ${ahora.toISOString()}::timestamptz
     order by c.persona_id, c.creado_en
     limit ${DE_UNA_VEZ}
       for update of c skip locked
  `;
  if (pendientes.length === 0) return hecho;

  async function quitar(p: ChatPendiente): Promise<void> {
    await contexto.sql`
      delete from estook.chat_al_movil where persona_id = ${p.persona_id} and canal_id = ${p.canal_id}
    `;
  }

  const personas = [...new Set(pendientes.map((p) => p.persona_id))];
  const relojes = await susRelojes(contexto, personas);

  const delCorreo = await mandarElCorreoDelChat(
    contexto,
    pendientes.filter((p) => p.por_correo),
    relojes,
  );
  hecho.mandados += delCorreo.mandados;
  hecho.esperan += delCorreo.esperan;

  const alMovil = pendientes.filter((p) => !p.por_correo);
  if (movil === null || alMovil.length === 0) return hecho;
  const deEllos = [...new Set(alMovil.map((p) => p.persona_id))];
  const lista = comoLista(deEllos);
  const moviles = await contexto.sql<SuMovil[]>`
    select id, persona_id, direccion, p256dh, auth
      from estook.movil_suscrito where persona_id = any (${lista}::text::uuid[])
  `;
  const sinLeer = await contexto.sql<{ persona_id: string; cuantos: number }[]>`
    select persona_id, count(*)::int as cuantos from estook.aviso
     where leido_en is null and persona_id = any (${lista}::text::uuid[])
     group by persona_id
  `;

  for (const persona of deEllos) {
    const suyos = alMovil.filter((p) => p.persona_id === persona);
    const susMoviles = moviles.filter((m) => m.persona_id === persona);
    if (susMoviles.length === 0) {
      for (const p of suyos) await quitar(p);
      continue;
    }

    const cuando = cuandoPuede(
      ahora,
      relojes.get(persona),
      suyos[0]?.zona_horaria ?? 'Europe/Madrid',
    );

    // El número del icono: la campana más lo que espera del chat.
    const numero =
      (sinLeer.find((s) => s.persona_id === persona)?.cuantos ?? 0) +
      suyos.reduce((n, p) => n + p.cuantos, 0);

    for (const p of suyos) {
      const vale = Date.parse(p.creado_en) + LO_QUE_ESPERA_EL_CHAT;
      if (cuando === null || cuando.getTime() > vale) {
        await quitar(p);
        continue;
      }
      if (cuando.getTime() > ahora.getTime()) {
        await contexto.sql`
          update estook.chat_al_movil set movil_desde = ${cuando.toISOString()}::timestamptz
           where persona_id = ${p.persona_id} and canal_id = ${p.canal_id}
        `;
        hecho.esperan += 1;
        continue;
      }

      const { canal, autor, otros } = await elCanalParaQuien(contexto, p);
      const dice = avisoDelChatEnElMovil({
        canal,
        esPrivadoDeDos: p.tipo === 'privado' && otros.length === 1 && p.nombre === null,
        cuantos: p.cuantos,
        autor,
        ultimo: vistaPrevia({
          texto: p.texto,
          adjuntoTipo: p.adjunto_tipo,
          adjuntoNombre: p.adjunto_nombre,
          adjuntoSegundos: p.adjunto_segundos,
          borrado: p.borrado,
          tarjeta: p.tarjeta,
        }),
        teMencionan: p.le_mencionan,
      });

      const resultados = await Promise.all(
        susMoviles.map(async (m) => ({
          movil: m,
          como: await movil
            .mandar(
              m,
              {
                titulo: dice.titulo,
                detalle: dice.detalle,
                ir: `/chat/${p.canal_id}`,
                etiqueta: `chat:${p.canal_id}`,
                sinLeer: numero,
              },
              { urgente: false, segundosQueVale: Math.trunc(LO_QUE_VALE_EL_CHAT / 1000) },
            )
            .catch(() => 'fallo' as const),
        })),
      );

      for (const r of resultados) {
        if (r.como === 'ya_no_existe') {
          await contexto.sql`delete from estook.movil_suscrito where id = ${r.movil.id}`;
        } else if (r.como === 'entregado') {
          await contexto.sql`
            update estook.movil_suscrito set fallos = 0, ultimo_uso_en = now() where id = ${r.movil.id}
          `;
        } else {
          await contexto.sql`
            delete from estook.movil_suscrito
             where id = ${r.movil.id} and fallos + 1 >= ${FALLOS_PARA_OLVIDARLO}
          `;
          await contexto.sql`
            update estook.movil_suscrito set fallos = fallos + 1 where id = ${r.movil.id}
          `;
        }
      }

      if (
        resultados.some((r) => r.como === 'entregado') ||
        resultados.every((r) => r.como === 'ya_no_existe')
      ) {
        await quitar(p);
        if (resultados.some((r) => r.como === 'entregado')) hecho.mandados += 1;
      } else if (p.intentos + 1 >= INTENTOS) {
        await quitar(p);
      } else {
        await contexto.sql`
          update estook.chat_al_movil
             set intentos = intentos + 1,
                 movil_desde = ${new Date(ahora.getTime() + (p.intentos + 1) * 2 * MINUTO).toISOString()}::timestamptz
           where persona_id = ${p.persona_id} and canal_id = ${p.canal_id}
        `;
        hecho.esperan += 1;
      }
    }
  }
  return hecho;
}

function esTipoDeCanal(tipo: string): tipo is TipoDeCanal {
  return (TIPOS_DE_CANAL as readonly string[]).includes(tipo);
}

// ── 2 · Apuntar lo que toca a una hora ───────────────────────────────────────

/** Lo que se apunta cada hora: lo de la hora siguiente, con margen para el latido. */
const VENTANA_MS = 75 * MINUTO;

/** Las horas de lo que caduca, en el reloj del local: la víspera y por la mañana. */
const HORA_DE_LA_VISPERA = '18:00';
const HORA_DE_LA_MANANA = '08:00';

export interface CuentaDelMovil {
  readonly organizacionId: string;
}

/**
 * Cada hora, con el latido: apunta lo que toca en la hora siguiente. Ya dentro del
 * sistema. Solo de las cuentas que pagan o están en prueba, como lo del día.
 */
export async function programarLoDelMovil(
  contexto: Contexto,
  cuentas: readonly CuentaDelMovil[],
): Promise<number> {
  const desde = contexto.ahora;
  const hasta = new Date(desde.getTime() + VENTANA_MS);
  const enLaVentana = (t: Date) => t.getTime() >= desde.getTime() && t.getTime() < hasta.getTime();
  let apuntados = 0;

  async function apuntar(
    localId: string,
    personaId: string | null,
    tipo: 'turno.entras' | 'lote.caduca' | 'pedido.no_llega',
    clave: string,
    cuando: Date,
  ): Promise<void> {
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.al_movil_programado (local_id, persona_id, tipo, clave, cuando)
      values (${localId}, ${personaId}, ${tipo}, ${clave}, ${cuando.toISOString()}::timestamptz)
      on conflict (tipo, clave) do nothing
      returning id::text as id
    `;
    apuntados += filas.length;
  }

  // «Entras en cinco minutos»: solo a quien tiene un móvil puesto. A quien no, no le
  // serviría de nada: la app ya lo dice en el Panel al abrirla.
  const conMovil = await contexto.sql<{ persona_id: string }[]>`
    select distinct persona_id from estook.movil_suscrito
  `;
  if (conMovil.length > 0) {
    const turnos = await contexto.sql<{ persona_id: string; local_id: string; empieza: Date }[]>`
      select persona_id, local_id, empieza
        from estook.turnos_de(
          ${comoLista(conMovil.map((c) => c.persona_id))}::text::uuid[],
          ${desde.toISOString()}::timestamptz,
          ${new Date(hasta.getTime() + MINUTOS_ANTES_DE_ENTRAR * MINUTO).toISOString()}::timestamptz
        )
    `;
    for (const t of turnos) {
      const empieza = new Date(t.empieza);
      const avisa = new Date(empieza.getTime() - MINUTOS_ANTES_DE_ENTRAR * MINUTO);
      if (!enLaVentana(avisa)) continue;
      await apuntar(
        t.local_id,
        t.persona_id,
        'turno.entras',
        `${t.persona_id}:${empieza.toISOString()}`,
        avisa,
      );
    }
  }

  if (cuentas.length === 0) return apuntados;
  const locales = await contexto.sql<{ id: string; zona_horaria: string }[]>`
    select id, zona_horaria from estook.local
     where activo and not es_ejemplo
       and organizacion_id = any (${comoLista(cuentas.map((c) => c.organizacionId))}::text::uuid[])
  `;

  // Lo que caduca: a las 18:00 lo de mañana, a las 08:00 lo de hoy, en cada local.
  for (const local of locales) {
    for (const dia of [
      fechaEnElLocal(desde, local.zona_horaria),
      fechaEnElLocal(hasta, local.zona_horaria),
    ]) {
      for (const [hora, cual] of [
        [HORA_DE_LA_VISPERA, 'manana'],
        [HORA_DE_LA_MANANA, 'hoy'],
      ] as const) {
        const cuando = instanteEnElLocal(dia, hora, local.zona_horaria);
        if (!enLaVentana(cuando)) continue;
        await apuntar(local.id, null, 'lote.caduca', `${local.id}:${dia}:${cual}`, cuando);
      }
    }
  }

  // El pedido que no llega: media hora después de cuando suele llegar su proveedor.
  const pedidos = await contexto.sql<
    { pedido_id: string; local_id: string; organizacion_id: string; avisa_en: Date }[]
  >`
    select pedido_id, local_id, organizacion_id, avisa_en
      from estook.pedidos_por_llegar(${desde.toISOString()}::timestamptz, ${hasta.toISOString()}::timestamptz)
  `;
  const deCuentas = new Set(cuentas.map((c) => c.organizacionId));
  for (const p of pedidos) {
    if (!deCuentas.has(p.organizacion_id)) continue;
    await apuntar(p.local_id, null, 'pedido.no_llega', p.pedido_id, new Date(p.avisa_en));
  }

  return apuntados;
}

// ── 3 · Hacerlo cuando llega su hora ─────────────────────────────────────────

/**
 * El recordatorio de confirmar (C2 · 0075): a cada uno que tiene que confirmar, **al
 * empezar su siguiente turno** (`cuandoSeRecuerda`). Se apunta al mandar el mensaje, ya
 * dentro del sistema; al llegar su hora se mira si todavía falta.
 */
export async function programarLosRecordatorios(
  contexto: Contexto,
  datos: {
    readonly localId: string;
    readonly mensajeId: string;
    readonly personas: readonly string[];
  },
): Promise<number> {
  if (datos.personas.length === 0) return 0;
  const relojes = await susRelojes(contexto, datos.personas);
  const zona = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${datos.localId}
  `;
  const zonaHoraria = zona[0]?.zona_horaria ?? 'Europe/Madrid';
  let apuntados = 0;
  for (const persona of datos.personas) {
    const reloj = relojes.get(persona);
    if (reloj === undefined) continue;
    const cuando = cuandoSeRecuerda(contexto.ahora, {
      modo: reloj.modo,
      silencioDesde: reloj.desde,
      silencioHasta: reloj.hasta,
      zonaHoraria,
      turnos: reloj.turnos,
      fichadoAhora: reloj.fichado,
    });
    if (cuando === null) continue;
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.al_movil_programado (local_id, persona_id, tipo, clave, cuando)
      values (
        ${datos.localId}, ${persona}, 'chat.confirmar', ${`${datos.mensajeId}:${persona}`},
        ${cuando.toISOString()}::timestamptz
      )
      on conflict (tipo, clave) do nothing
      returning id::text as id
    `;
    apuntados += filas.length;
  }
  return apuntados;
}

interface Programado {
  readonly id: string;
  readonly local_id: string;
  readonly persona_id: string | null;
  readonly tipo: 'turno.entras' | 'lote.caduca' | 'pedido.no_llega' | 'chat.confirmar';
  readonly clave: string;
  readonly cuando: Date;
  readonly organizacion_id: string;
  readonly nombre: string;
  readonly zona_horaria: string;
}

/** A quién le toca un aviso en un local y lo tiene encendido. */
async function aQuien(
  contexto: Contexto,
  localId: string,
  tipo: TipoDeAviso,
): Promise<readonly QuienRecibe[]> {
  return losQueLoQuieren(contexto, tipo, await quienesPuedenRecibir(contexto, localId, tipo));
}

async function entrasEnUnRato(contexto: Contexto, p: Programado): Promise<number> {
  if (p.persona_id === null) return 0;
  const empieza = new Date(p.cuando.getTime() + MINUTOS_ANTES_DE_ENTRAR * MINUTO);
  // ¿Sigue entrando a esa hora, y sin haber fichado? Si el horario cambió, nada.
  const sigue = await contexto.sql<{ empieza: Date }[]>`
    select empieza from estook.turnos_de(
      ${comoLista([p.persona_id])}::text::uuid[],
      ${new Date(empieza.getTime() - MINUTO).toISOString()}::timestamptz,
      ${new Date(empieza.getTime() + MINUTO).toISOString()}::timestamptz
    ) where empieza = ${empieza.toISOString()}::timestamptz and local_id = ${p.local_id}
  `;
  if (sigue.length === 0) return 0;
  const como = await contexto.sql<{ fichado: boolean }[]>`
    select fichado from estook.como_le_suena(${comoLista([p.persona_id])}::text::uuid[])
  `;
  if (como[0]?.fichado === true) return 0;

  const quien = (await aQuien(contexto, p.local_id, 'turno.entras')).filter(
    (q) => q.personaId === p.persona_id,
  );
  const hora = horaEnElLocal(empieza, p.zona_horaria);
  // Hacia arriba: a los cuatro minutos y medio, todavía faltan «5 minutos».
  const minutos = Math.max(0, Math.ceil((empieza.getTime() - contexto.ahora.getTime()) / MINUTO));
  return avisar(
    contexto,
    {
      tipo: 'turno.entras',
      organizacionId: p.organizacion_id,
      localId: p.local_id,
      clave: empieza.toISOString(),
      // El de la vez anterior ya no sirve: la campana no se llena de uno por turno.
      sustituyeA: '',
      texto: () => avisoDeEntrasEnUnRato(minutos, hora, p.nombre),
      ir: '/?hacer=fichar',
      quien: null,
      como: 'de_nuevo',
    },
    quien,
  );
}

async function loQueCaduca(contexto: Contexto, p: Programado): Promise<number> {
  const cual = p.clave.endsWith(':manana') ? 'manana' : 'hoy';
  const dias = cual === 'manana' ? 1 : 0;
  const dia = fechaEnElLocal(contexto.ahora, p.zona_horaria);
  let avisos = 0;
  for (const quien of await aQuien(contexto, p.local_id, 'lote.caduca')) {
    // «Hoy» de Almacén, tal cual lo vería: con sus zonas (0038), como lo bajo mínimo.
    const { caducan } = await comoSiFuera(
      contexto,
      { personaId: quien.personaId, organizacionId: p.organizacion_id, localId: p.local_id },
      (suyo) => almacenHoy.ejecutar(suyo, {}),
    );
    const estos = caducan.filter((c) => c.dias === dias);
    if (estos.length === 0) continue;
    avisos += await avisar(
      contexto,
      {
        tipo: 'lote.caduca',
        organizacionId: p.organizacion_id,
        localId: p.local_id,
        // El de hoy deja viejo al de la víspera: uno por local y día en la campana.
        clave: `${p.local_id}:${cual === 'manana' ? masDias(dia, 1) : dia}`,
        sustituyeA: `${p.local_id}:`,
        texto: () =>
          avisoDeCaducidad(
            cual,
            estos.map((c) => c.producto),
          ),
        ir: '/almacen/resumen',
        quien: null,
        como: 'de_nuevo',
      },
      [quien],
    );
  }
  return avisos;
}

async function elPedidoQueNoLlega(contexto: Contexto, p: Programado): Promise<number> {
  // ¿Sigue sin llegar? Si ya se recibió o se canceló, no hay nada que avisar.
  const sigue = await contexto.sql<{ numero: number; proveedor: string; suele_llegar_a: string }[]>`
    select numero, proveedor, suele_llegar_a
      from estook.pedidos_por_llegar(
        ${new Date(p.cuando.getTime() - 24 * HORA).toISOString()}::timestamptz,
        ${new Date(p.cuando.getTime() + MINUTO).toISOString()}::timestamptz,
        ${p.clave}::uuid
      )
  `;
  const pedido = sigue[0];
  if (pedido === undefined) return 0;
  return avisar(
    contexto,
    {
      tipo: 'pedido.no_llega',
      organizacionId: p.organizacion_id,
      localId: p.local_id,
      clave: p.clave,
      texto: () => avisoDePedidoQueNoLlega(pedido.proveedor, pedido.numero, pedido.suele_llegar_a),
      ir: irAlPedido(p.clave),
      quien: null,
    },
    await aQuien(contexto, p.local_id, 'pedido.no_llega'),
  );
}

async function recordarQueConfirme(contexto: Contexto, p: Programado): Promise<number> {
  if (p.persona_id === null) return 0;
  const mensajeId = p.clave.split(':')[0] ?? '';
  // ¿Le sigue faltando, el mensaje sigue ahí y sigue viendo el canal? Si no, nada.
  const falta = await contexto.sql<
    {
      canal_id: string;
      tipo: string;
      nombre: string | null;
      autor_id: string | null;
      texto: string | null;
      adjunto_tipo: TipoDeAdjunto | null;
      adjunto_nombre: string | null;
      adjunto_segundos: number | null;
      tarjeta: TipoDeTarjeta | null;
    }[]
  >`
    select c.id::text as canal_id, c.tipo::text as tipo, c.nombre, m.autor_id::text as autor_id,
           m.texto, m.adjunto_tipo, m.adjunto_nombre, m.adjunto_segundos,
           m.tarjeta ->> 'tipo' as tarjeta
      from estook.confirmacion_del_mensaje cm
      join estook.mensaje m on m.id = cm.mensaje_id
      join estook.canal c on c.id = m.canal_id
     where cm.mensaje_id = ${mensajeId}::bigint and cm.persona_id = ${p.persona_id}
       and cm.confirmado_en is null and m.borrado_en is null and c.archivado_en is null
       and estook.puede_ver_el_canal(c.id, ${p.persona_id}::uuid)
  `;
  const mensaje = falta[0];
  if (mensaje === undefined) return 0;
  const autor =
    mensaje.autor_id === null
      ? []
      : await contexto.sql<{ nombre: string }[]>`
          select nombre from estook.a_quien_escribir(${comoLista([mensaje.autor_id])}::text::uuid[])
        `;
  const tipo = esTipoDeCanal(mensaje.tipo) ? mensaje.tipo : 'canal';
  const canal = nombreDelCanal({ tipo, nombre: mensaje.nombre, otros: [] });
  const vista = vistaPrevia({
    texto: mensaje.texto,
    adjuntoTipo: mensaje.adjunto_tipo,
    adjuntoNombre: mensaje.adjunto_nombre,
    adjuntoSegundos: mensaje.adjunto_segundos,
    borrado: false,
    tarjeta: mensaje.tarjeta,
  });
  const quien = (await aQuien(contexto, p.local_id, 'chat.confirmar')).filter(
    (q) => q.personaId === p.persona_id,
  );
  return avisar(
    contexto,
    {
      tipo: 'chat.confirmar',
      organizacionId: p.organizacion_id,
      localId: p.local_id,
      clave: mensajeId,
      texto: () => avisoDeConfirmar(autor[0]?.nombre ?? 'alguien', canal, vista),
      ir: `/chat/${mensaje.canal_id}`,
      quien: null,
    },
    quien,
  );
}

/** Cada minuto: lo apuntado cuya hora ha llegado. Ya dentro del sistema. */
export async function hacerLoProgramado(contexto: Contexto): Promise<number> {
  const tocan = await contexto.sql<Programado[]>`
    select p.id::text as id, p.local_id, p.persona_id, p.tipo, p.clave, p.cuando,
           l.organizacion_id, l.nombre, l.zona_horaria
      from estook.al_movil_programado p
      join estook.local l on l.id = p.local_id
     where p.hecho_en is null and p.cuando <= ${contexto.ahora.toISOString()}::timestamptz
     order by p.cuando
     limit ${DE_UNA_VEZ}
       for update of p skip locked
  `;
  let hechos = 0;
  for (const p of tocan) {
    const programado = { ...p, cuando: new Date(p.cuando) };
    // Lo que se pasó de largo (el reloj estuvo parado) no se avisa tarde: se da por
    // hecho. «Entras en cinco minutos» a los diez ya no sirve; lo demás aguanta más.
    const margen = p.tipo === 'turno.entras' ? 10 * MINUTO : 2 * HORA;
    const tarde = contexto.ahora.getTime() - programado.cuando.getTime() > margen;
    if (!tarde) {
      const hacer =
        p.tipo === 'turno.entras'
          ? () => entrasEnUnRato(contexto, programado)
          : p.tipo === 'lote.caduca'
            ? () => loQueCaduca(contexto, programado)
            : p.tipo === 'chat.confirmar'
              ? () => recordarQueConfirme(contexto, programado)
              : () => elPedidoQueNoLlega(contexto, programado);
      const hecho = await aparte(contexto, `avisar al móvil (${p.tipo})`, hacer);
      if (hecho !== null) hechos += hecho;
    }
    await contexto.sql`
      update estook.al_movil_programado set hecho_en = now() where id = ${p.id}::bigint
    `;
  }
  return hechos;
}

/** Lo que el reloj borra cada hora: lo programado ya hecho y los cifrados usados viejos. */
export async function limpiarLoDelMovil(contexto: Contexto): Promise<void> {
  await contexto.sql`
    delete from estook.al_movil_programado where hecho_en < now() - interval '2 days'
  `;
  // Un cifrado se acepta hasta una semana (seAceptaLoHecho): pasado eso no vale, y su
  // número ya no hace falta para impedir que se repita.
  await contexto.sql`delete from estook.cifrado_usado where usado_en < now() - interval '8 days'`;
}
