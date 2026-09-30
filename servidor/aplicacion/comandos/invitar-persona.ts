import { z } from 'zod';
import { ALCANCE_DEL_ROL, ROLES } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { ponerPinNuevo } from '../pines.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { exigirQueNoDeMasDeLoQueTiene } from '../jerarquia.ts';

/**
 * Invitar a alguien (M4).
 *
 * «Alta por invitacion con **PIN generado y mostrado en pantalla para darlo en
 *  mano**» (Manifiesto 15).
 *
 * ── Por que el PIN se ensena y no se manda por correo ────────────────────────
 *
 * Porque en un restaurante el alta se hace **con la persona delante**, el primer
 * dia, mientras se le ensena la camara. Esperar a que abra un correo que a lo
 * mejor no tiene en el movil es perder la tarde. Y porque el correo, cuando lo
 * haya, se cae: «El correo de invitacion no llega → el PIN sigue siendo valido →
 * "puedes darle el PIN en mano" con el codigo en pantalla» (Auditoria, Parte 5).
 * Aqui el camino de repuesto **es el camino principal**, asi que no hay nada que
 * pueda fallar.
 *
 * ── La regla que M1 avisa de no romper ───────────────────────────────────────
 *
 * «Invitar a un correo que ya existe **anade una membresia, nunca duplica la
 *  persona**» (Manifiesto 25). Una persona puede trabajar en dos empresas con el
 * mismo correo, y si se duplicara, sus horas y su historial quedarian partidos en
 * dos. Aqui se busca primero y se crea solo si no estaba.
 *
 * Y ojo: **la busqueda por correo tiene que ver a quien no se ve todavia**. Quien
 * invita a alguien de otra organizacion no puede leer su fila —las politicas de
 * M1 no se lo permiten, y esta bien que sea asi—, pero tampoco puede crearla otra
 * vez. Se resuelve con `estook.persona_por_correo`, que dice **si existe y su
 * identificador, y nada mas**: ni el nombre, ni donde trabaja.
 */
export const entradaInvitar = z
  .object({
    /**
     * **Opcional desde la 0052** (decisión 0057): un extra o un friegaplatos se da de
     * alta con su nombre y su PIN. Sin correo solo entra en el aparato del local, así
     * que su rol tiene que ser de un local.
     */
    correo: z.string().trim().toLowerCase().email().max(320).optional(),
    nombre: z.string().trim().min(1).max(120),
    apellidos: z.string().trim().max(160).optional(),
    rol: z.enum(ROLES),
    /** Obligatorio para los roles de local. */
    local_id: z.string().uuid().optional(),
    /** Obligatorio para los de area. */
    area_id: z.string().uuid().optional(),
    organizacion_id: z.string().uuid(),
  })
  .strict();

export type EntradaInvitar = z.infer<typeof entradaInvitar>;

export interface SalidaInvitar {
  readonly personaId: string;
  /** `true` si el correo ya existia y solo se le ha anadido la membresia. */
  readonly yaExistia: boolean;
  /**
   * El PIN, **en claro y una sola vez**. No se puede volver a consultar: lo que
   * se guarda es su huella. Si se pierde, se genera otro.
   */
  readonly pin: string | null;
  readonly localId: string | null;
}

export const invitarPersona = comando<EntradaInvitar, SalidaInvitar>({
  nombre: 'invitar_persona',
  entrada: entradaInvitar,
  exige: 'accion.invitar_personas',
  // Devuelve el PIN en claro: no se recuerda.
  conSecreto: true,

  async ejecutar(contexto, entrada) {
    const { sql, sesion, correlacionId } = contexto;
    if (sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const alcance = ALCANCE_DEL_ROL[entrada.rol];

    if (alcance === 'local' && entrada.local_id === undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['local_id'],
        porque: `El rol «${entrada.rol}» se concede sobre un local, así que hay que decir cuál.`,
      });
    }
    if (alcance === 'area' && entrada.area_id === undefined) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['area_id'],
        porque: 'Un area manager lleva un área, así que hay que decir cuál.',
      });
    }

    // ── Sin correo, solo en un local (0057) ──────────────────────────────────
    //
    // Quien no tiene correo entra únicamente en el aparato del local, con el PIN de
    // ese local. Un rol de área o de organización no tendría dónde entrar.
    if (entrada.correo === undefined && alcance !== 'local') {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['correo'],
        porque:
          'Sin correo solo se entra en el aparato del local, con el PIN de ese local: su puesto tiene que ser de un local.',
      });
    }

    // ── Un rol que no esté por encima del tuyo ───────────────────────────────
    //
    // Un gerente no nombra a un área manager ni a dirección (M7, repaso ·
    // `jerarquia.ts`). Dar un rol de tu mismo nivel sí: dos gerentes en un local
    // es normal, y quien lo invita no podrá después retirárselo, que es lo justo.
    await exigirQueNoDeMasDeLoQueTiene(sql, entrada.organizacion_id, sesion.personaId, entrada.rol);

    // ── ¿Existe ya ese correo? ───────────────────────────────────────────────
    //
    // Sin correo no hay nada que buscar: es siempre una persona nueva. Dos personas
    // sin correo no son la misma aunque se llamen igual.
    const encontrada =
      entrada.correo === undefined
        ? []
        : await sql<{ persona_id: string; activa: boolean }[]>`
            select * from estook.persona_por_correo(${entrada.correo})
          `;
    const yaExistia = encontrada.length > 0;
    let personaId = encontrada[0]?.persona_id;

    if (personaId === undefined) {
      const creadas = await sql<{ id: string }[]>`
        select estook.dar_de_alta_persona(
          ${entrada.correo ?? null}, ${entrada.nombre}, ${entrada.apellidos ?? null}
        ) as id
      `;
      personaId = creadas[0]?.id;
      if (personaId === undefined) throw new FalloDeAplicacion('fallo_nuestro');
    } else if (encontrada[0]?.activa === false) {
      // «Quien se va y vuelve se reactiva: recupera su ficha, su historial y sus
      // fichas aprendidas.» Invitar otra vez a quien se fue es reactivarla.
      await sql`update estook.persona set activa = true where id = ${personaId}`;
    }

    // ── La membresía ─────────────────────────────────────────────────────────
    //
    // La escribe la política de M1, que exige `accion.invitar_personas` sobre ese
    // local o esa organización. Si no se tiene, esto no inserta y sale `403`: no
    // hace falta comprobarlo aquí, y comprobarlo aquí sería tener dos dueños.
    const membresias = await sql<{ id: string }[]>`
      insert into estook.membresia
        (persona_id, organizacion_id, area_id, local_id, alcance, rol)
      values (
        ${personaId},
        ${entrada.organizacion_id},
        ${entrada.area_id ?? null},
        ${entrada.local_id ?? null},
        ${alcance},
        ${entrada.rol}
      )
      on conflict do nothing
      returning id
    `;

    if (membresias.length === 0 && !yaExistia) throw new FalloDeAplicacion('sin_permiso');

    // ── El PIN, si la membresía es de un local ───────────────────────────────
    //
    // El PIN es por local (migración 0018), así que quien entra con alcance de
    // organización o de área no tiene uno: no hay un local del que sea.
    const pin =
      entrada.local_id === undefined ? null : await ponerPinNuevo(sql, personaId, entrada.local_id);

    await sql`
      select estook.anotar(
        ${entrada.organizacion_id}::uuid, 'invitar', 'persona', ${personaId},
        ${entrada.local_id ?? null}::uuid, null,
        ${JSON.stringify({ rol: entrada.rol, alcance, ya_existia: yaExistia, sin_correo: entrada.correo === undefined })}::text::jsonb,
        null
      )
    `;

    if (membresias.length > 0) {
      await publicar(sql, {
        tipo: 'membresia.creada',
        organizacionId: entrada.organizacion_id,
        localId: entrada.local_id ?? null,
        datos: { persona_id: personaId, rol: entrada.rol },
        correlacionId,
      });
    }

    return { personaId, yaExistia, pin, localId: entrada.local_id ?? null };
  },
});

// ── Ponerle el correo a quien no lo tenía (0057) ─────────────────────────────

export const entradaPonerCorreo = z
  .object({
    persona_id: z.string().uuid(),
    correo: z.string().trim().toLowerCase().email().max(320),
  })
  .strict();

export type EntradaPonerCorreo = z.infer<typeof entradaPonerCorreo>;

/**
 * «Si un día da su correo, se le añade y sigue siendo la misma persona, con su
 * historia» (0057).
 *
 * **Si ese correo ya es de otra persona de Estook, no se unen solas**: se dice y no
 * se toca nada. Unir dos personas con todos sus fichajes y su historia es trabajo
 * de M13, con confirmación; aquí solo se le pone el correo a quien no tenía.
 *
 * Se mira con `persona_por_correo`, que dice si existe y nada más: quien lo pone no
 * tiene por qué saber dónde trabaja esa otra persona.
 */
export const ponerCorreo = comando<EntradaPonerCorreo, { personaId: string }>({
  nombre: 'poner_correo',
  entrada: entradaPonerCorreo,
  exige: 'accion.invitar_personas',

  async ejecutar(contexto, entrada) {
    const { sql } = contexto;
    if (contexto.sesion === null) throw new FalloDeAplicacion('sin_sesion');

    const otra = await sql<{ persona_id: string }[]>`
      select persona_id from estook.persona_por_correo(${entrada.correo})
    `;
    if (otra.length > 0 && otra[0]?.persona_id !== entrada.persona_id) {
      throw new FalloDeAplicacion('correo_de_otra_persona');
    }

    // Solo a quien no tenía: cambiar el correo de alguien es cambiar cómo entra, y
    // eso lo hace cada uno desde su cuenta. La política `persona_la_edita_quien_da_acceso`
    // (0019) decide además si esa persona es de un local donde puedes dar acceso.
    const puestas = await sql<{ id: string }[]>`
      update estook.persona set correo = ${entrada.correo}
       where id = ${entrada.persona_id} and correo is null
      returning id::text as id
    `;
    if (puestas.length === 0) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Esa persona ya tiene correo, o no es de un local donde puedas dar acceso.',
      });
    }

    const organizacionId = contexto.sesion.organizacionId;
    if (organizacionId !== null) {
      await sql`
        select estook.anotar(
          ${organizacionId}::uuid, 'cambiar', 'persona', ${entrada.persona_id},
          ${contexto.sesion.localId}::uuid, ${JSON.stringify({ correo: null })}::text::jsonb,
          ${JSON.stringify({ correo: 'puesto' })}::text::jsonb, 'Se le pone el correo que no tenía'
        )
      `;
    }
    return { personaId: entrada.persona_id };
  },
});
