import { z } from 'zod';
import {
  FIJADOS_POR_CANAL,
  LO_QUE_SE_ADJUNTA,
  PERSONAS_EN_UN_PRIVADO,
  REACCIONES,
  SEGUNDOS_DE_VOZ,
  TIPOS_DE_ADJUNTO,
  TOPE_DEL_ADJUNTO,
  TOPE_DEL_MENSAJE,
  TOPE_DEL_NOMBRE_DEL_CANAL,
  aQuienSeNombra,
  fechaOperativa,
  sePuedeCorregir,
  type TipoDeAdjunto,
} from '@estook/dominio';
import { programarLosRecordatorios } from '../al-movil.ts';
import { laOrganizacionDeLaSesion } from '../alta.ts';
import {
  apuntarParaElMovil,
  asegurarLosCanales,
  elLocalDelChat,
  llevaCanales,
  tocarElCanal,
  yaNoHaceFaltaElMovil,
} from '../chat.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { decodificar, esDeVerdadDeEseTipo } from '../ficheros.ts';
import { laSemana, unLunes } from '../horario.ts';
import { comoLista } from '../listas.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { enNombreDelSistema } from '../pago.ts';

/**
 * El chat del equipo · lo que se hace (C1 · decisiones 0071 y 0073).
 *
 * **Ninguno pide un permiso del catálogo**: el chat es de todo el local, como el
 * Tablón. Quién ve y quién escribe en cada canal lo deciden las políticas de la base
 * (0056), y aquí se dice en cristiano cuando no pasa. Lo que sí se comprueba aquí es lo
 * que no es seguridad sino forma: los quince minutos para corregir, los topes de los
 * ficheros, que no se retire nada en un privado.
 */

const unCanal = z.string().uuid();
const unMensaje = z.string().regex(/^\d+$/, 'Ese mensaje no existe.');

/** El canal, si quien pregunta lo ve. La política decide; aquí solo se pregunta. */
async function elCanal(
  contexto: Contexto,
  canalId: string,
): Promise<{ id: string; tipo: string; local_id: string; creado_por: string | null }> {
  const filas = await contexto.sql<
    { id: string; tipo: string; local_id: string; creado_por: string | null }[]
  >`
    select id, tipo::text as tipo, local_id, creado_por
      from estook.canal where id = ${canalId} and archivado_en is null
  `;
  const canal = filas[0];
  if (canal === undefined) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese canal no está, o no es de los que puedes ver.',
    });
  }
  return canal;
}

interface MensajeTomado {
  id: string;
  canal_id: string;
  local_id: string;
  autor_id: string | null;
  tipo: string;
  creado_en: Date;
  borrado_en: Date | null;
  adjunto_clave: string | null;
  texto: string | null;
  pide_confirmar: boolean;
  fijado: boolean;
}

/** Un mensaje que se ve, tomado para cambiarlo. */
async function elMensaje(contexto: Contexto, mensajeId: string): Promise<MensajeTomado> {
  const filas = await contexto.sql<MensajeTomado[]>`
    select m.id::text as id, m.canal_id, m.local_id, m.autor_id, c.tipo::text as tipo,
           m.creado_en, m.borrado_en, m.adjunto_clave, m.texto, m.pide_confirmar,
           m.fijado_en is not null as fijado
      from estook.mensaje m
      join estook.canal c on c.id = m.canal_id
     where m.id = ${mensajeId}::bigint
  `;
  const mensaje = filas[0];
  if (mensaje === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Ese mensaje no está.' });
  }
  return mensaje;
}

/** Quien ve el canal, con su nombre. La función contesta a quien ve el canal. */
async function quienVe(
  contexto: Contexto,
  canalId: string,
): Promise<{ id: string; nombre: string }[]> {
  return contexto.sql<{ id: string; nombre: string }[]>`
    select persona_id::text as id, nombre from estook.quien_ve_el_canal(${canalId}::uuid)
  `;
}

/** Que todas esas personas sean del local: las que ven «Todo el equipo». */
async function sonDelLocal(
  contexto: Contexto,
  localId: string,
  personas: readonly string[],
): Promise<void> {
  const equipo = await contexto.sql<{ id: string }[]>`
    select id from estook.canal where local_id = ${localId} and tipo = 'equipo'
  `;
  const del = equipo[0];
  const delLocal = del === undefined ? [] : await quienVe(contexto, del.id);
  const fuera = personas.filter((p) => !delLocal.some((d) => d.id === p));
  if (fuera.length > 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['personas'],
      porque: 'Solo se puede hablar con gente de este local.',
    });
  }
}

/** Que quien manda la tarjeta vea lo que manda, en ese local. La política decide. */
async function laTarjetaSeVe(
  contexto: Contexto,
  localId: string,
  tarjeta: { readonly tipo: 'pedido' | 'producto'; readonly id: string },
): Promise<void> {
  const filas =
    tarjeta.tipo === 'pedido'
      ? await contexto.sql<{ id: string }[]>`
          select id from estook.pedido_de_compra where id = ${tarjeta.id} and local_id = ${localId}
        `
      : await contexto.sql<{ id: string }[]>`
          select id from estook.producto where id = ${tarjeta.id} and local_id = ${localId}
        `;
  if (filas.length === 0) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Eso no está, o no es de lo que puedes ver.',
    });
  }
}

// ── Abrir el chat ────────────────────────────────────────────────────────────

/**
 * Lo primero al abrir el chat: los canales de fábrica del local, si no están, y el tema
 * de quien lo abre para lo que llega al segundo. **Devuelve un secreto** (el tema), así
 * que no se recuerda: un reintento devuelve el mismo, que ya está guardado.
 */
export const abrirElChat = comando<Record<string, never>, { tema: string }>({
  nombre: 'abrir_el_chat',
  entrada: z.object({}).strict(),
  conSecreto: true,

  async ejecutar(contexto) {
    const localId = elLocalDelChat(contexto);
    await asegurarLosCanales(contexto, localId);

    const suyo = await contexto.sql<{ tema: string }[]>`
      select tema from estook.tema_al_segundo where persona_id = ${contexto.personaId}
    `;
    if (suyo[0] !== undefined) return { tema: suyo[0].tema };

    const nuevo = await contexto.sql<{ tema: string }[]>`
      insert into estook.tema_al_segundo (persona_id, tema)
      values (
        ${contexto.personaId},
        'estook-' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
      )
      returning tema
    `;
    const tema = nuevo[0]?.tema;
    if (tema === undefined) throw new FalloDeAplicacion('sin_permiso');
    return { tema };
  },
});

// ── Escribir ─────────────────────────────────────────────────────────────────

const unAdjunto = z
  .object({
    tipo: z.enum(TIPOS_DE_ADJUNTO),
    mime: z.string().min(1).max(120),
    /** El nombre del fichero, para los documentos. */
    nombre: z.string().trim().min(1).max(120).optional(),
    /** En base64, sin el prefijo `data:`. */
    contenido: z
      .string()
      .min(1)
      .max(Math.ceil((TOPE_DEL_ADJUNTO.documento * 4) / 3) + 1024),
    /** Lo que dura una nota de voz, según el móvil que la grabó. */
    segundos: z.number().int().min(1).max(SEGUNDOS_DE_VOZ).optional(),
  })
  .strict();

export const entradaEscribirEnElChat = z
  .object({
    canal_id: unCanal,
    texto: z
      .string()
      .trim()
      .max(TOPE_DEL_MENSAJE, `Como mucho, ${String(TOPE_DEL_MENSAJE)} letras.`)
      .optional(),
    responde_a: unMensaje.optional(),
    adjunto: unAdjunto.optional(),
    /** Pedir «Confirmar que lo he leído» (C2 · 0075): quien lleva el equipo, no en privados. */
    pide_confirmar: z.boolean().optional(),
    /** Un pedido o un producto, como tarjeta que se abre en su sitio (C2 · 0075). */
    tarjeta: z
      .object({ tipo: z.enum(['pedido', 'producto']), id: z.string().uuid() })
      .strict()
      .optional(),
  })
  .strict()
  .refine((e) => (e.texto ?? '') !== '' || e.adjunto !== undefined || e.tarjeta !== undefined, {
    message: 'Escribe algo o adjunta un fichero.',
    path: ['texto'],
  });

export type EntradaEscribirEnElChat = z.infer<typeof entradaEscribirEnElChat>;

/** Guarda el adjunto en el almacén y devuelve lo que se apunta en la fila. */
async function guardarElAdjunto(
  contexto: Contexto,
  localId: string,
  canalId: string,
  adjunto: z.infer<typeof unAdjunto>,
): Promise<{
  clave: string;
  tipo: TipoDeAdjunto;
  nombre: string | null;
  mime: string;
  bytes: number;
  segundos: number | null;
}> {
  if (contexto.almacen === null) {
    throw new FalloDeAplicacion('fallo_nuestro', {
      porque: 'Todavía no hay dónde guardar ficheros. El texto sí se puede mandar.',
    });
  }
  const extension = LO_QUE_SE_ADJUNTA[adjunto.tipo][adjunto.mime];
  if (extension === undefined) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['adjunto'],
      porque:
        adjunto.tipo === 'documento'
          ? 'Se pueden mandar PDF, Word, Excel y fotos.'
          : adjunto.tipo === 'foto'
            ? 'Solo se admiten fotos en WebP, JPG o PNG.'
            : 'Esa nota de voz no se ha grabado en un formato que se pueda oír.',
    });
  }
  const bytes = decodificar(adjunto.contenido, 'adjunto');
  if (bytes.length > TOPE_DEL_ADJUNTO[adjunto.tipo]) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['adjunto'],
      porque:
        adjunto.tipo === 'documento'
          ? 'Como mucho, 10 MB por documento.'
          : 'Ese fichero es demasiado grande para el chat.',
    });
  }
  // Esconder el tipo en la pantalla no es comprobarlo (regla 4): los primeros bytes.
  if (!esDeVerdadDeEseTipo(bytes, adjunto.mime)) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['adjunto'],
      porque: 'Ese fichero no es lo que dice ser.',
    });
  }
  const clave = `chat/${localId}/${canalId}/${crypto.randomUUID()}.${extension}`;
  await contexto.almacen.guardar(clave, bytes, adjunto.mime);
  return {
    clave,
    tipo: adjunto.tipo,
    nombre: adjunto.nombre ?? null,
    mime: adjunto.mime,
    bytes: bytes.length,
    segundos: adjunto.tipo === 'voz' ? (adjunto.segundos ?? null) : null,
  };
}

export const escribirEnElChat = comando<EntradaEscribirEnElChat, { mensajeId: string }>({
  nombre: 'escribir_en_el_chat',
  entrada: entradaEscribirEnElChat,

  async ejecutar(contexto, entrada) {
    const canal = await elCanal(contexto, entrada.canal_id);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_permiso');

    if (entrada.responde_a !== undefined) {
      const respondido = await contexto.sql<{ id: string }[]>`
        select id::text as id from estook.mensaje
         where id = ${entrada.responde_a}::bigint and canal_id = ${canal.id}
      `;
      if (respondido.length === 0) {
        throw new FalloDeAplicacion('no_existe', {
          porque: 'Ese mensaje ya no está en este canal.',
        });
      }
    }

    const pideConfirmar = entrada.pide_confirmar === true;
    if (pideConfirmar) {
      if (canal.tipo === 'privado') {
        throw new FalloDeAplicacion('faltan_datos', {
          porque: 'En un privado no se pide confirmar: ya ves quién lo ha leído.',
        });
      }
      if (!(await llevaCanales(contexto, canal.local_id))) {
        throw new FalloDeAplicacion('sin_permiso', {
          porque: 'Pedir que confirmen es de quien lleva el equipo: el gerente y los jefes.',
        });
      }
    }
    if (entrada.tarjeta !== undefined) await laTarjetaSeVe(contexto, canal.local_id, entrada.tarjeta);

    const texto = entrada.texto === undefined || entrada.texto === '' ? null : entrada.texto;
    const personas = texto === null && !pideConfirmar ? [] : await quienVe(contexto, canal.id);
    const mencionados =
      texto === null ? [] : aQuienSeNombra(texto, personas).filter((p) => p !== personaId);

    const adjunto =
      entrada.adjunto === undefined
        ? null
        : await guardarElAdjunto(contexto, canal.local_id, canal.id, entrada.adjunto);

    const puestos = await contexto.sql<{ id: string }[]>`
      insert into estook.mensaje (
        canal_id, local_id, autor_id, texto, responde_a,
        adjunto_clave, adjunto_tipo, adjunto_nombre, adjunto_mime, adjunto_bytes, adjunto_segundos,
        menciones, creado_en, tarjeta, pide_confirmar
      )
      values (
        ${canal.id}, ${canal.local_id}, ${personaId}, ${texto},
        ${entrada.responde_a ?? null}::bigint,
        ${adjunto?.clave ?? null}, ${adjunto?.tipo ?? null}, ${adjunto?.nombre ?? null},
        ${adjunto?.mime ?? null}, ${adjunto?.bytes ?? null}, ${adjunto?.segundos ?? null},
        ${comoLista(mencionados)}::text::uuid[],
        ${contexto.ahora.toISOString()}::timestamptz,
        ${entrada.tarjeta === undefined ? null : JSON.stringify(entrada.tarjeta)}::text::jsonb,
        ${pideConfirmar}
      )
      returning id::text as id
    `;
    const mensajeId = puestos[0]?.id;
    if (mensajeId === undefined) throw new FalloDeAplicacion('sin_permiso');

    // Quién tiene que confirmar: quien ve el canal ahora, menos quien lo pide. Lo apunta
    // el sistema, con su recordatorio al empezar el siguiente turno de cada uno.
    if (pideConfirmar) {
      const tienen = personas.map((p) => p.id).filter((p) => p !== personaId);
      await enNombreDelSistema(contexto, async () => {
        for (const persona of tienen) {
          await contexto.sql`
            insert into estook.confirmacion_del_mensaje (mensaje_id, persona_id)
            values (${mensajeId}::bigint, ${persona})
            on conflict do nothing
          `;
        }
        await programarLosRecordatorios(contexto, {
          localId: canal.local_id,
          mensajeId,
          personas: tienen,
        });
      });
    }

    // Lo propio está leído: el número de sin leer no cuenta lo que uno escribe.
    await contexto.sql`
      insert into estook.lectura_del_canal (canal_id, persona_id, entregado_hasta, leido_hasta)
      values (${canal.id}, ${personaId}, ${mensajeId}::bigint, ${mensajeId}::bigint)
      on conflict (canal_id, persona_id) do update
         set entregado_hasta = greatest(estook.lectura_del_canal.entregado_hasta, excluded.entregado_hasta),
             leido_hasta = greatest(estook.lectura_del_canal.leido_hasta, excluded.leido_hasta),
             actualizado_en = now()
    `;

    await apuntarParaElMovil(contexto, {
      canalId: canal.id,
      tipo: canal.tipo,
      mensajeId,
      autorId: personaId,
      mencionados,
    });
    await tocarElCanal(contexto, canal.id);

    return { mensajeId };
  },
});

// ── Corregir, borrar y retirar ───────────────────────────────────────────────

export const entradaCorregirMensaje = z
  .object({
    mensaje_id: unMensaje,
    texto: z
      .string()
      .trim()
      .min(1, 'Escribe el mensaje.')
      .max(TOPE_DEL_MENSAJE, `Como mucho, ${String(TOPE_DEL_MENSAJE)} letras.`),
  })
  .strict();

export type EntradaCorregirMensaje = z.infer<typeof entradaCorregirMensaje>;

/** Corregir lo propio, en los primeros quince minutos, y sale «editado» (0071, 10). */
export const corregirMensaje = comando<EntradaCorregirMensaje, { corregido: true }>({
  nombre: 'corregir_mensaje',
  entrada: entradaCorregirMensaje,

  async ejecutar(contexto, entrada) {
    const mensaje = await elMensaje(contexto, entrada.mensaje_id);
    if (mensaje.autor_id !== contexto.personaId || mensaje.borrado_en !== null) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Solo se corrige lo que escribiste tú, mientras sigue ahí.',
      });
    }
    if (!sePuedeCorregir(new Date(mensaje.creado_en), contexto.ahora)) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Pasados quince minutos ya no se corrige: bórralo y escribe otro.',
      });
    }
    await contexto.sql`
      update estook.mensaje
         set texto = ${entrada.texto}, editado_en = ${contexto.ahora.toISOString()}::timestamptz
       where id = ${mensaje.id}::bigint
    `;
    await tocarElCanal(contexto, mensaje.canal_id);
    return { corregido: true };
  },
});

export const entradaDeUnMensaje = z.object({ mensaje_id: unMensaje }).strict();
export type EntradaDeUnMensaje = z.infer<typeof entradaDeUnMensaje>;

/** Quita el texto y el fichero de verdad: queda «Se eliminó este mensaje». */
async function vaciarElMensaje(
  contexto: Contexto,
  mensaje: MensajeTomado,
  retiradoPor: string | null,
): Promise<void> {
  await contexto.sql`
    update estook.mensaje
       set texto = null, adjunto_clave = null, adjunto_tipo = null, adjunto_nombre = null,
           adjunto_mime = null, adjunto_bytes = null, adjunto_segundos = null,
           menciones = '{}', borrado_en = ${contexto.ahora.toISOString()}::timestamptz,
           retirado_por = ${retiradoPor}
     where id = ${mensaje.id}::bigint
  `;
  await contexto.sql`delete from estook.reaccion_al_mensaje where mensaje_id = ${mensaje.id}::bigint`;
  // El fichero, después de la fila: si el almacén falla, el mensaje ya no lo enseña.
  if (mensaje.adjunto_clave !== null && contexto.almacen !== null) {
    try {
      await contexto.almacen.borrar(mensaje.adjunto_clave);
    } catch {
      // Un fichero huérfano en el cubo no enseña nada a nadie: sin fila, no hay enlace.
    }
  }
}

/** Borrar lo propio, siempre: el texto se borra de verdad (0071, 10). */
export const borrarMensaje = comando<EntradaDeUnMensaje, { borrado: true }>({
  nombre: 'borrar_mensaje',
  entrada: entradaDeUnMensaje,

  async ejecutar(contexto, entrada) {
    const mensaje = await elMensaje(contexto, entrada.mensaje_id);
    if (mensaje.autor_id !== contexto.personaId) {
      throw new FalloDeAplicacion('sin_permiso', { porque: 'Solo se borra lo que escribiste tú.' });
    }
    if (mensaje.borrado_en !== null) return { borrado: true };
    await vaciarElMensaje(contexto, mensaje, null);
    await tocarElCanal(contexto, mensaje.canal_id);
    return { borrado: true };
  },
});

export const entradaRetirarMensaje = z
  .object({
    mensaje_id: unMensaje,
    motivo: z.string().trim().min(1, 'Di por qué.').max(400),
  })
  .strict();

export type EntradaRetirarMensaje = z.infer<typeof entradaRetirarMensaje>;

/**
 * Retirar un mensaje de un canal: quien lleva el local, con su porqué, en la
 * auditoría. **En un privado, nunca** (0071, 11). La política lo para también.
 */
export const retirarMensaje = comando<EntradaRetirarMensaje, { retirado: true }>({
  nombre: 'retirar_mensaje',
  entrada: entradaRetirarMensaje,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    const mensaje = await elMensaje(contexto, entrada.mensaje_id);
    if (mensaje.tipo === 'privado') {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Lo que se dice en un privado no lo retira nadie más que quien lo escribió.',
      });
    }
    if (mensaje.borrado_en !== null) return { retirado: true };
    await vaciarElMensaje(contexto, mensaje, contexto.personaId);
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'borrar', 'mensaje', ${mensaje.id},
        ${mensaje.local_id}::uuid, null, null, ${entrada.motivo}
      )
    `;
    await tocarElCanal(contexto, mensaje.canal_id);
    return { retirado: true };
  },
});

// ── Reaccionar ───────────────────────────────────────────────────────────────

export const entradaReaccionar = z
  .object({ mensaje_id: unMensaje, emoji: z.enum(REACCIONES) })
  .strict();

export type EntradaReaccionar = z.infer<typeof entradaReaccionar>;

/** Pone la reacción, o la quita si ya estaba: el mismo toque que en cualquier chat. */
export const reaccionar = comando<EntradaReaccionar, { puesta: boolean }>({
  nombre: 'reaccionar',
  entrada: entradaReaccionar,

  async ejecutar(contexto, entrada) {
    const mensaje = await elMensaje(contexto, entrada.mensaje_id);
    const quitadas = await contexto.sql<{ emoji: string }[]>`
      delete from estook.reaccion_al_mensaje
       where mensaje_id = ${mensaje.id}::bigint and persona_id = ${contexto.personaId}
         and emoji = ${entrada.emoji}
      returning emoji
    `;
    const puesta = quitadas.length === 0;
    if (puesta) {
      await contexto.sql`
        insert into estook.reaccion_al_mensaje (mensaje_id, persona_id, emoji)
        values (${mensaje.id}::bigint, ${contexto.personaId}, ${entrada.emoji})
      `;
    }
    await tocarElCanal(contexto, mensaje.canal_id);
    return { puesta };
  },
});

// ── Leído y entregado ────────────────────────────────────────────────────────

export const entradaLeerElCanal = z.object({ canal_id: unCanal, hasta: unMensaje }).strict();
export type EntradaLeerElCanal = z.infer<typeof entradaLeerElCanal>;

/**
 * «Leído» es leído de verdad: con el canal abierto y el mensaje en pantalla (0071, 9).
 * Quita lo que esperaba al móvil de ese canal. En un privado avisa al segundo, para que
 * a quien escribió le cambie la marca; en los canales grandes, no: veinte personas
 * leyendo no son veinte toques para todos.
 */
export const leerElCanal = comando<EntradaLeerElCanal, { leido: true }>({
  nombre: 'leer_el_canal',
  entrada: entradaLeerElCanal,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    const canal = await elCanal(contexto, entrada.canal_id);
    const antes = await contexto.sql<{ leido_hasta: string }[]>`
      select leido_hasta::text as leido_hasta from estook.lectura_del_canal
       where canal_id = ${canal.id} and persona_id = ${contexto.personaId}
    `;
    await contexto.sql`
      insert into estook.lectura_del_canal (canal_id, persona_id, entregado_hasta, leido_hasta)
      values (${canal.id}, ${contexto.personaId}, ${entrada.hasta}::bigint, ${entrada.hasta}::bigint)
      on conflict (canal_id, persona_id) do update
         set entregado_hasta = greatest(estook.lectura_del_canal.entregado_hasta, excluded.entregado_hasta),
             leido_hasta = greatest(estook.lectura_del_canal.leido_hasta, excluded.leido_hasta),
             actualizado_en = now()
    `;
    await yaNoHaceFaltaElMovil(contexto, canal.id);
    const avanzo = Number(entrada.hasta) > Number(antes[0]?.leido_hasta ?? 0);
    if (avanzo && canal.tipo === 'privado') await tocarElCanal(contexto, canal.id);
    return { leido: true };
  },
});

export const entradaYaMeHaLlegado = z
  .object({
    canales: z.array(z.object({ canal_id: unCanal, hasta: unMensaje }).strict()).max(200),
  })
  .strict();

export type EntradaYaMeHaLlegado = z.infer<typeof entradaYaMeHaLlegado>;

/** «Entregado»: lo que la app ya ha recibido, aunque no se haya abierto. */
export const yaMeHaLlegado = comando<EntradaYaMeHaLlegado, { apuntados: number }>({
  nombre: 'ya_me_ha_llegado',
  entrada: entradaYaMeHaLlegado,
  sinRecordar: true,

  async ejecutar(contexto, entrada) {
    let apuntados = 0;
    for (const { canal_id: canalId, hasta } of entrada.canales) {
      const cambiadas = await contexto.sql<{ tipo: string }[]>`
        insert into estook.lectura_del_canal (canal_id, persona_id, entregado_hasta)
        select c.id, ${contexto.personaId}, ${hasta}::bigint
          from estook.canal c where c.id = ${canalId}
        on conflict (canal_id, persona_id) do update
           set entregado_hasta = greatest(estook.lectura_del_canal.entregado_hasta, excluded.entregado_hasta),
               actualizado_en = now()
         where estook.lectura_del_canal.entregado_hasta < excluded.entregado_hasta
        returning (select c.tipo::text from estook.canal c where c.id = canal_id) as tipo
      `;
      if (cambiadas.length > 0) {
        apuntados += 1;
        if (cambiadas[0]?.tipo === 'privado') await tocarElCanal(contexto, canalId);
      }
    }
    return { apuntados };
  },
});

// ── Silenciar ────────────────────────────────────────────────────────────────

export const entradaSilenciarCanal = z
  .object({ canal_id: unCanal, silenciado: z.boolean() })
  .strict();

export type EntradaSilenciarCanal = z.infer<typeof entradaSilenciarCanal>;

/**
 * Silenciar un canal: no suena, salvo lo que te nombra (0071, 7). Un privado no se
 * silencia: si alguien te escribe a ti, tiene que sonar (siempre dentro de tu turno o
 * fuera de tus horas de silencio, como ya elegiste).
 */
export const silenciarCanal = comando<EntradaSilenciarCanal, { silenciado: boolean }>({
  nombre: 'silenciar_canal',
  entrada: entradaSilenciarCanal,

  async ejecutar(contexto, entrada) {
    const canal = await elCanal(contexto, entrada.canal_id);
    if (canal.tipo === 'privado') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Un privado no se silencia: si alguien te escribe a ti, te suena.',
      });
    }
    await contexto.sql`
      insert into estook.lectura_del_canal (canal_id, persona_id, silenciado)
      values (${canal.id}, ${contexto.personaId}, ${entrada.silenciado})
      on conflict (canal_id, persona_id) do update
         set silenciado = excluded.silenciado, actualizado_en = now()
    `;
    if (entrada.silenciado) await yaNoHaceFaltaElMovil(contexto, canal.id);
    return { silenciado: entrada.silenciado };
  },
});

// ── Canales y privados ───────────────────────────────────────────────────────

const unasPersonas = z.array(z.string().uuid()).max(200);

export const entradaCrearCanal = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Ponle nombre.')
      .max(TOPE_DEL_NOMBRE_DEL_CANAL, `Como mucho, ${String(TOPE_DEL_NOMBRE_DEL_CANAL)} letras.`),
    personas: unasPersonas,
  })
  .strict();

export type EntradaCrearCanal = z.infer<typeof entradaCrearCanal>;

/**
 * Un canal nuevo («Barra», «Encargados»), con quién entra: quien lleva el local
 * (0071, pregunta 3). Quien lleva el local los ve todos, esté o no dentro.
 */
export const crearCanal = comando<EntradaCrearCanal, { canalId: string }>({
  nombre: 'crear_canal',
  entrada: entradaCrearCanal,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelChat(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_permiso');
    await asegurarLosCanales(contexto, localId);
    const personas = [...new Set([personaId, ...entrada.personas])];
    await sonDelLocal(contexto, localId, personas);

    // Sin `returning`: pedir la fila de vuelta obliga a poder verla, y quien la ve se
    // decide por quién está dentro, que todavía no hay nadie. El identificador, de aquí.
    const canalId = crypto.randomUUID();
    await contexto.sql`
      insert into estook.canal (id, local_id, tipo, nombre, creado_por)
      values (${canalId}, ${localId}, 'canal', ${entrada.nombre}, ${personaId})
    `;
    // Los primeros, como sistema: ya se ha comprobado que son del local, y hasta que
    // hay alguien dentro nadie ve el canal, tampoco quien lo crea (0056).
    await enNombreDelSistema(contexto, async () => {
      for (const persona of personas) {
        await contexto.sql`
          insert into estook.miembro_del_canal (canal_id, persona_id) values (${canalId}, ${persona})
        `;
      }
    });
    await contexto.sql`
      select estook.anotar(
        ${laOrganizacionDeLaSesion(contexto)}::uuid, 'crear', 'canal', ${canalId}, ${localId}::uuid,
        null, ${JSON.stringify({ nombre: entrada.nombre, personas: personas.length })}::text::jsonb, null
      )
    `;
    await tocarElCanal(contexto, canalId);
    return { canalId };
  },
});

export const entradaAbrirPrivado = z
  .object({
    personas: unasPersonas
      .min(1, 'Elige con quién.')
      .max(PERSONAS_EN_UN_PRIVADO - 1, `Como mucho, ${String(PERSONAS_EN_UN_PRIVADO)} contándote.`),
    nombre: z.string().trim().max(TOPE_DEL_NOMBRE_DEL_CANAL).optional(),
  })
  .strict();

export type EntradaAbrirPrivado = z.infer<typeof entradaAbrirPrivado>;

/**
 * Un privado, de dos o de un grupo pequeño: lo abre cualquiera del local (0071, 3).
 * **Con una sola persona, el que ya hubiera**: dos privados con la misma persona serían
 * dos conversaciones que nadie sabría cuál mirar.
 */
export const abrirPrivado = comando<EntradaAbrirPrivado, { canalId: string; nuevo: boolean }>({
  nombre: 'abrir_privado',
  entrada: entradaAbrirPrivado,

  async ejecutar(contexto, entrada) {
    const localId = elLocalDelChat(contexto);
    const personaId = contexto.personaId;
    if (personaId === null) throw new FalloDeAplicacion('sin_permiso');
    await asegurarLosCanales(contexto, localId);
    const otros = [...new Set(entrada.personas)].filter((p) => p !== personaId);
    if (otros.length === 0) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['personas'],
        porque: 'Elige con quién quieres hablar.',
      });
    }
    await sonDelLocal(contexto, localId, otros);

    if (otros.length === 1 && (entrada.nombre ?? '') === '') {
      const ya = await contexto.sql<{ id: string }[]>`
        select c.id
          from estook.canal c
         where c.local_id = ${localId} and c.tipo = 'privado' and c.archivado_en is null
           and c.nombre is null
           and (select count(*) from estook.miembro_del_canal m where m.canal_id = c.id) = 2
           and exists (select 1 from estook.miembro_del_canal m
                        where m.canal_id = c.id and m.persona_id = ${personaId})
           and exists (select 1 from estook.miembro_del_canal m
                        where m.canal_id = c.id and m.persona_id = ${otros[0] ?? ''}::uuid)
         limit 1
      `;
      if (ya[0] !== undefined) return { canalId: ya[0].id, nuevo: false };
    }

    const nombre = (entrada.nombre ?? '') === '' ? null : (entrada.nombre ?? null);
    // Sin `returning`, por lo mismo que al crear un canal.
    const canalId = crypto.randomUUID();
    await contexto.sql`
      insert into estook.canal (id, local_id, tipo, nombre, creado_por)
      values (${canalId}, ${localId}, 'privado', ${nombre}, ${personaId})
    `;
    // Los primeros, como sistema, por lo mismo que en un canal nuevo.
    await enNombreDelSistema(contexto, async () => {
      for (const persona of [personaId, ...otros]) {
        await contexto.sql`
          insert into estook.miembro_del_canal (canal_id, persona_id) values (${canalId}, ${persona})
        `;
      }
    });
    return { canalId, nuevo: true };
  },
});

export const entradaAnadirAlCanal = z
  .object({ canal_id: unCanal, personas: unasPersonas.min(1) })
  .strict();

export type EntradaAnadirAlCanal = z.infer<typeof entradaAnadirAlCanal>;

/** Meter a más gente en un canal creado o en un grupo privado. */
export const anadirAlCanal = comando<EntradaAnadirAlCanal, { anadidos: number }>({
  nombre: 'anadir_al_canal',
  entrada: entradaAnadirAlCanal,

  async ejecutar(contexto, entrada) {
    const canal = await elCanal(contexto, entrada.canal_id);
    if (canal.tipo !== 'canal' && canal.tipo !== 'privado') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'En este canal está quien tiene el rol: no se mete a nadie a mano.',
      });
    }
    await sonDelLocal(contexto, canal.local_id, entrada.personas);
    const dentro = await contexto.sql<{ persona_id: string }[]>`
      select persona_id from estook.miembro_del_canal where canal_id = ${canal.id}
    `;
    const nuevos = entrada.personas.filter((p) => !dentro.some((d) => d.persona_id === p));
    if (canal.tipo === 'privado' && dentro.length + nuevos.length > PERSONAS_EN_UN_PRIVADO) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: `En un privado caben ${String(PERSONAS_EN_UN_PRIVADO)}. Para más, que lo cree quien lleva el local como canal.`,
      });
    }
    for (const persona of nuevos) {
      const puestos = await contexto.sql<{ persona_id: string }[]>`
        insert into estook.miembro_del_canal (canal_id, persona_id) values (${canal.id}, ${persona})
        returning persona_id
      `;
      if (puestos.length === 0) throw new FalloDeAplicacion('sin_permiso');
    }
    await tocarElCanal(contexto, canal.id);
    return { anadidos: nuevos.length };
  },
});

export const entradaDeUnCanal = z.object({ canal_id: unCanal }).strict();
export type EntradaDeUnCanal = z.infer<typeof entradaDeUnCanal>;

/** Salir de un grupo o de un canal creado. De los de fábrica no se sale: son del rol. */
export const salirDelCanal = comando<EntradaDeUnCanal, { fuera: true }>({
  nombre: 'salir_del_canal',
  entrada: entradaDeUnCanal,

  async ejecutar(contexto, entrada) {
    const canal = await elCanal(contexto, entrada.canal_id);
    if (canal.tipo !== 'canal' && canal.tipo !== 'privado') {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'De este canal no se sale: es de todo el que tiene el rol. Puedes silenciarlo.',
      });
    }
    await contexto.sql`
      delete from estook.miembro_del_canal
       where canal_id = ${canal.id} and persona_id = ${contexto.personaId}
    `;
    await yaNoHaceFaltaElMovil(contexto, canal.id);
    return { fuera: true };
  },
});
