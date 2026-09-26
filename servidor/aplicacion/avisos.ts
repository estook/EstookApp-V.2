import {
  laPreferencia,
  type LoQueDiceUnAviso,
  type PreferenciaDeAviso,
  type TipoDeAviso,
} from '@estook/dominio';
import { LO_QUE_PIDE_EL_AVISO } from '@estook/permisos';
import type { Contexto } from './contrato.ts';
import { correoDeUnAviso } from './correos.ts';
import { suAmplitud } from './jerarquia.ts';
import { comoLista } from './listas.ts';
import { enNombreDelSistema } from './pago.ts';

/**
 * Los avisos · quién recibe cada uno y cómo se escribe (entrega R · decisión 0052).
 *
 * Qué dice cada aviso y cómo viene de fábrica lo decide el dominio
 * (`packages/dominio/src/avisos.ts`); aquí se decide **a quién va** y se escribe.
 *
 * ── Lo escribe el sistema, no quien lo provoca ──────────────────────────────
 *
 * Quien apunta una merma no puede leer las membresías de su gerente, y está bien. Y
 * si pudiera escribir avisos a otros, podría dejarle a cualquiera uno falso. Así que
 * esto va **en nombre del sistema** (`enNombreDelSistema`), dentro de la misma
 * transacción que la merma: o pasan las dos cosas o ninguna (0014). La tabla solo
 * deja escribir al sistema, y a cada uno, marcar lo suyo como leído.
 *
 * ── Uno por cosa y persona ───────────────────────────────────────────────────
 *
 * Cada aviso tiene su cosa (`clave`): el pedido, la nota, el precio. Si ya hay uno
 * para esa persona, depende de cómo se avise:
 *
 *   juntar    el que ya había se queda como estaba y, si lo ha hecho otro, se suma
 *             su nombre sin volver a sonar. Es «Ana y Marcos están preparando…».
 *   de_nuevo  vuelve a sonar: te invitan otra vez, o vuelven a terminar.
 */

export type ComoSeAvisa = 'juntar' | 'de_nuevo';

export interface AvisoQueSeDa {
  readonly tipo: TipoDeAviso;
  readonly organizacionId: string;
  readonly localId: string;
  /** La cosa de la que avisa, para que sea uno por cosa y persona. */
  readonly clave: string;
  /** Lo que dice, sabiendo quiénes lo han hecho (casi siempre, uno). */
  readonly texto: (quienes: readonly string[]) => LoQueDiceUnAviso;
  readonly ir: string | null;
  /** Quien lo ha hecho, por su nombre. Nulo si lo hace Estook. */
  readonly quien: string | null;
  readonly como?: ComoSeAvisa;
}

export interface QuienRecibe {
  readonly personaId: string;
  readonly nombre: string;
  readonly correo: string | null;
  readonly amplitud: number;
  readonly rol: string;
}

/**
 * Quién tiene en ese local lo que pide un aviso (`LO_QUE_PIDE_EL_AVISO`), con su
 * puesto. Solo lo contesta la base al sistema, así que va dentro de él.
 */
export async function quienesPuedenRecibir(
  contexto: Contexto,
  localId: string,
  tipo: TipoDeAviso,
): Promise<readonly QuienRecibe[]> {
  const filas = await enNombreDelSistema(
    contexto,
    () =>
      contexto.sql<
        {
          persona_id: string;
          nombre: string;
          correo: string | null;
          amplitud: number;
          rol: string;
        }[]
      >`
      select persona_id, nombre, correo, amplitud, rol
        from estook.quien_recibe(${localId}::uuid, ${comoLista(LO_QUE_PIDE_EL_AVISO[tipo])}::text::text[])
    `,
  );
  return filas.map((f) => ({
    personaId: f.persona_id,
    nombre: f.nombre,
    correo: f.correo,
    amplitud: f.amplitud,
    rol: f.rol,
  }));
}

/**
 * **Lo que hace el equipo le llega a quien está por encima** de quien lo hizo, en
 * la misma organización (`rol.amplitud`, como en `jerarquia.ts`): lo que empieza un
 * cocinero lo sabe su jefe de cocina y su gerente, y lo de un jefe de cocina, su
 * gerente. A uno mismo, nunca.
 */
export async function losDeArriba(
  contexto: Contexto,
  organizacionId: string,
  localId: string,
  tipo: TipoDeAviso,
): Promise<readonly QuienRecibe[]> {
  const yo = contexto.personaId;
  if (yo === null) return [];
  const mia = await suAmplitud(contexto.sql, organizacionId, yo);
  const todos = await quienesPuedenRecibir(contexto, localId, tipo);
  return todos.filter((q) => q.personaId !== yo && q.amplitud > mia);
}

/** Lo que cada uno ha elegido de este aviso, de una vez. */
async function susPreferencias(
  contexto: Contexto,
  tipo: TipoDeAviso,
  personas: readonly string[],
): Promise<ReadonlyMap<string, Partial<PreferenciaDeAviso>>> {
  if (personas.length === 0) return new Map();
  const filas = await contexto.sql<
    { persona_id: string; en_la_app: boolean; por_correo: boolean }[]
  >`
    select persona_id, en_la_app, por_correo
      from estook.preferencia_de_aviso
     where tipo = ${tipo} and persona_id = any (${comoLista(personas)}::text::uuid[])
  `;
  return new Map(
    filas.map((f) => [f.persona_id, { enLaApp: f.en_la_app, porCorreo: f.por_correo }] as const),
  );
}

/**
 * Deja el aviso a cada uno, según lo que haya elegido. Devuelve a cuántos les ha
 * llegado algo nuevo, que es lo que cuentan las pruebas.
 */
export async function avisar(
  contexto: Contexto,
  aviso: AvisoQueSeDa,
  a: readonly QuienRecibe[],
): Promise<number> {
  const como = aviso.como ?? 'juntar';
  // Nunca a uno mismo, aunque la lista lo traiga: nadie necesita que le avisen de
  // lo que acaba de hacer.
  const destinatarios = a.filter((q) => q.personaId !== contexto.personaId);
  if (destinatarios.length === 0) return 0;

  return enNombreDelSistema(contexto, async () => {
    const preferencias = await susPreferencias(
      contexto,
      aviso.tipo,
      destinatarios.map((q) => q.personaId),
    );
    let nuevos = 0;

    for (const quien of destinatarios) {
      const quiere = laPreferencia(aviso.tipo, quien.amplitud, preferencias.get(quien.personaId));
      if (!quiere.enLaApp) continue;
      const conCorreo = quiere.porCorreo && quien.correo !== null && quien.correo !== '';

      const yaEstaba = await contexto.sql<{ id: string; quienes: string[] }[]>`
        select id, quienes from estook.aviso
         where persona_id = ${quien.personaId} and tipo = ${aviso.tipo} and clave = ${aviso.clave}
      `;
      const antes = yaEstaba[0];

      if (antes === undefined) {
        const quienes = aviso.quien === null ? [] : [aviso.quien];
        const dice = aviso.texto(quienes);
        await contexto.sql`
          insert into estook.aviso (
            organizacion_id, local_id, persona_id, tipo, clave, titulo, detalle, ir, quienes,
            correo, correo_para
          )
          values (
            ${aviso.organizacionId}, ${aviso.localId}, ${quien.personaId}, ${aviso.tipo},
            ${aviso.clave}, ${dice.titulo}, ${dice.detalle}, ${aviso.ir},
            ${comoLista(quienes)}::text::text[], ${conCorreo ? 'pendiente' : 'no'},
            ${conCorreo ? quien.correo : null}
          )
          -- Dos a la vez sobre la misma cosa: el segundo no rompe lo que hacía.
          on conflict (persona_id, tipo, clave) do nothing
        `;
        if (conCorreo) conCorreoPendiente.add(contexto.correlacionId);
        nuevos += 1;
        continue;
      }

      const quienes =
        aviso.quien === null || antes.quienes.includes(aviso.quien)
          ? antes.quienes
          : [...antes.quienes, aviso.quien];

      if (como === 'juntar') {
        // Si no ha cambiado quién, no hay nada que contar: el que había ya lo dice.
        if (quienes.length === antes.quienes.length) continue;
        const dice = aviso.texto(quienes);
        await contexto.sql`
          update estook.aviso
             set quienes = ${comoLista(quienes)}::text::text[], titulo = ${dice.titulo},
                 detalle = ${dice.detalle}
           where id = ${antes.id}
        `;
        continue;
      }

      // De nuevo: vuelve a estar sin leer, arriba, y si quería correo, sale otra vez.
      const dice = aviso.texto(quienes);
      await contexto.sql`
        update estook.aviso
           set quienes = ${comoLista(quienes)}::text::text[], titulo = ${dice.titulo},
               detalle = ${dice.detalle}, ir = ${aviso.ir}, leido_en = null,
               actualizado_en = now(), correo = ${conCorreo ? 'pendiente' : 'no'},
               correo_para = ${conCorreo ? quien.correo : null}, correo_intentos = 0
         where id = ${antes.id}
      `;
      if (conCorreo) conCorreoPendiente.add(contexto.correlacionId);
      nuevos += 1;
    }

    return nuevos;
  });
}

// ── El correo ────────────────────────────────────────────────────────────────

/** Tras cinco intentos, se deja: el aviso sigue en la campana. */
const INTENTOS_DE_CORREO = 5;

/**
 * Manda los correos de los avisos que lo piden (0017: solo lo que se lo gana).
 *
 * **Fuera de la transacción del cambio**: el despachador lo llama cuando el comando
 * ya está guardado, y el reloj, cada hora, por si alguno no salió. Un correo que no
 * sale no deshace el pedido ni la merma; se queda `pendiente` y se reintenta.
 */
export async function mandarLosCorreosDeLosAvisos(contexto: Contexto): Promise<number> {
  const correo = contexto.correo;
  if (correo === null) return 0;

  return enNombreDelSistema(contexto, async () => {
    const pendientes = await contexto.sql<
      { id: string; titulo: string; detalle: string | null; ir: string | null; para: string }[]
    >`
      select id, titulo, detalle, ir, correo_para as para
        from estook.aviso
       where correo = 'pendiente' and correo_intentos < ${INTENTOS_DE_CORREO}
       order by creado_en
       limit 50
    `;

    let mandados = 0;
    for (const aviso of pendientes) {
      try {
        await correo.mandar(
          correoDeUnAviso(aviso.para, {
            titulo: aviso.titulo,
            detalle: aviso.detalle,
            ir: aviso.ir,
          }),
        );
        await contexto.sql`update estook.aviso set correo = 'mandado' where id = ${aviso.id}`;
        mandados += 1;
      } catch (fallo) {
        await contexto.sql`
          update estook.aviso
             set correo_intentos = correo_intentos + 1,
                 correo = case when correo_intentos + 1 >= ${INTENTOS_DE_CORREO} then 'no' else 'pendiente' end
           where id = ${aviso.id}
        `;
        console.error(
          JSON.stringify({
            nivel: 'error',
            mensaje: 'el correo de un aviso no ha salido',
            correlacion_id: contexto.correlacionId,
            detalle: fallo instanceof Error ? fallo.message : String(fallo),
          }),
        );
      }
    }
    return mandados;
  });
}

/**
 * Las peticiones que han dejado algún correo pendiente, para que el despachador abra
 * la transacción de mandarlos **solo cuando hace falta**: casi ningún comando deja
 * correo, y abrir otra transacción en cada uno sería pagar por nada.
 */
const conCorreoPendiente = new Set<string>();

/** Si esta petición dejó correo. Pregunta y olvida, se haya guardado o no. */
export function dejoCorreos(correlacionId: string): boolean {
  return conCorreoPendiente.delete(correlacionId);
}
