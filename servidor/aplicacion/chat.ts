import { CANALES_DE_FABRICA } from '@estook/dominio';
import { dejarAlgoParaElMovil } from './avisos.ts';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { comoLista } from './listas.ts';
export { tocarElCanal } from './al-segundo.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * El chat del equipo · lo que comparten sus comandos y sus consultas (C1 · 0073).
 *
 * Quién ve cada canal lo decide la base (`estook.puede_ver_el_canal`) y aquí no se
 * repite: las consultas leen con la sesión de quien pregunta y las políticas dejan
 * ver lo que toca. Lo que hace este fichero es lo que pasa **después** de escribir:
 * a quién le suena el móvil y a quién le llega el toque al segundo.
 */

/** El local del chat: el de la sesión, nunca el que diga quien llama. */
export function elLocalDelChat(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para usar su chat. Elige uno primero.',
    });
  }
  return localId;
}

/**
 * Los tres canales de fábrica del local, si todavía no están: «Todo el equipo»,
 * «Cocina» y «Sala» (0071, pregunta 3). Se crean la primera vez que alguien abre el
 * chat; abrirlo a la vez dos personas no los duplica (índice único de la 0056).
 *
 * **Como sistema**, y solo esto: `on conflict` obliga a que quien inserta pueda leer
 * la fila nueva, y la regla de quién ve un canal lo busca en la tabla, donde todavía
 * no está. La política de alta sigue mandando: solo en un local que se ve.
 */
export async function asegurarLosCanales(contexto: Contexto, localId: string): Promise<void> {
  await enNombreDelSistema(contexto, async () => {
    for (const tipo of CANALES_DE_FABRICA) {
      await contexto.sql`
        insert into estook.canal (local_id, tipo)
        values (${localId}, ${tipo}::estook.tipo_de_canal)
        on conflict (local_id, tipo) where tipo in ('equipo', 'cocina', 'sala') do nothing
      `;
    }
  });
}

// ── Lo que suena en el móvil ─────────────────────────────────────────────────

/**
 * Lo que tiene que sonar en el móvil por un mensaje nuevo (0071, 7), o salir en el
 * correo del chat (C2 · 0075).
 *
 * A quién: a quien ve el canal menos quien escribe.
 *
 *   · **Con móvil puesto**: en los canales, salvo a quien lo tiene silenciado, **a
 *     menos que le nombren**. Los privados no se silencian.
 *   · **Sin móvil**: solo **los privados y lo que le nombra**, marcado para el correo
 *     (`por_correo`), que sale uno al día como mucho.
 *
 * Se suma a lo que ya esperaba de ese canal: tres mensajes son un aviso, no tres.
 * Cuándo suena —en su turno, o fuera de sus horas de silencio— lo decide al mandarlo
 * `al-movil.ts`, igual que los avisos de la campana.
 */
export async function apuntarParaElMovil(
  contexto: Contexto,
  datos: {
    readonly canalId: string;
    readonly tipo: string;
    readonly mensajeId: string;
    readonly autorId: string;
    readonly mencionados: readonly string[];
    /**
     * El aviso del horario (repaso del 10-oct): **les toca a todos**, como si les
     * nombraran —suena aunque tengan el canal silenciado, y por correo a quien no tiene
     * móvil—, menos a quien ya le ha llegado su horario, que no lo oye dos veces.
     */
    readonly aTodosMenos?: readonly string[];
  },
): Promise<void> {
  // Sin el puerto del móvil encendido, nadie tiene móvil: solo queda el correo.
  const hayMovil = contexto.movil !== null;
  const aTodos = datos.aTodosMenos !== undefined;
  const fuera = comoLista(datos.aTodosMenos ?? []);
  const mencionados = comoLista(datos.mencionados);
  const apuntados = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<{ persona_id: string }[]>`
      with quien as (
        select q.persona_id,
               ${hayMovil} and exists (
                 select 1 from estook.movil_suscrito m where m.persona_id = q.persona_id
               ) as con_movil,
               q.persona_id = any (${mencionados}::text::uuid[]) as le_nombran,
               -- Lo que les toca a todos (el horario): suena como si les nombraran.
               ${aTodos} or q.persona_id = any (${mencionados}::text::uuid[]) as importa
          from estook.quien_ve_el_canal(${datos.canalId}::uuid) q
         where q.persona_id <> ${datos.autorId}::uuid
           and not q.persona_id = any (${fuera}::text::uuid[])
      )
      insert into estook.chat_al_movil (
        persona_id, canal_id, ultimo_id, le_mencionan, movil_desde, creado_en, por_correo
      )
      select quien.persona_id, ${datos.canalId}::uuid, ${datos.mensajeId}::bigint, quien.le_nombran,
             ${contexto.ahora.toISOString()}::timestamptz, ${contexto.ahora.toISOString()}::timestamptz,
             not quien.con_movil
        from quien
       where (
               quien.con_movil
               and (
                 ${datos.tipo} = 'privado'
                 or quien.importa
                 or not exists (
                   select 1 from estook.lectura_del_canal l
                    where l.canal_id = ${datos.canalId}::uuid and l.persona_id = quien.persona_id
                      and l.silenciado
                 )
               )
             )
          or (not quien.con_movil and (${datos.tipo} = 'privado' or quien.importa))
      on conflict (persona_id, canal_id) do update
         set cuantos = estook.chat_al_movil.cuantos + 1,
             ultimo_id = excluded.ultimo_id,
             le_mencionan = estook.chat_al_movil.le_mencionan or excluded.le_mencionan,
             por_correo = excluded.por_correo
      returning persona_id
    `,
  );
  if (apuntados.length > 0) dejarAlgoParaElMovil(contexto.correlacionId);
}

/**
 * Quien crea canales, fija y pide confirmar en un local (C2 · 0075): quien ve Equipo
 * y el chat. La regla es de la base (`estook.lleva_canales`); aquí solo se pregunta.
 */
export async function llevaCanales(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ lleva: boolean }[]>`
    select estook.lleva_canales(${localId}::uuid) as lleva
  `;
  return filas[0]?.lleva === true;
}

/**
 * Lo que esperaba al móvil de un canal, fuera: quien lo lee ya no tiene que oírlo.
 *
 * **Como sistema**, con la persona de la sesión: borrar con `where` obliga a poder
 * **leer** la fila, y lo que espera al móvil solo lo lee el sistema. Con la sesión de
 * quien lee no borraba nada, y a Richi le iba a sonar a las 8:00 lo que ya había leído
 * a medianoche (lo vio el 6-oct, lección 147).
 */
export async function yaNoHaceFaltaElMovil(contexto: Contexto, canalId: string): Promise<void> {
  const personaId = contexto.personaId;
  if (personaId === null) return;
  await enNombreDelSistema(contexto, async () => {
    await contexto.sql`
      delete from estook.chat_al_movil
       where persona_id = ${personaId} and canal_id = ${canalId}
    `;
  });
}
