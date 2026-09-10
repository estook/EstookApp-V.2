import { z } from 'zod';
import { laOrganizacionDeLaSesion, elLocalDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';

/**
 * La ficha de cada persona (M6½, anticipando M15).
 *
 * Dos cosas que hasta hoy no tenían dónde guardarse y sin las cuales el perfil de
 * un trabajador es una tarjeta con un nombre: **lo que cobra** y **a qué hora
 * entra normalmente**.
 *
 * ── Lo que cobra: quién puede ponerlo ───────────────────────────────────────
 *
 * `dato.coste_de_personal`, que lo tienen el gerente, el área manager, la
 * dirección y RRHH. **El jefe de cocina no**, y es a propósito: lleva a su equipo,
 * ve sus horas, y no ve lo que cobran. Está escrito en la matriz desde M1 —«no ve
 * el coste de personal de sala»— y aquí es donde por fin significa algo.
 *
 * ── Y por qué no se puede subir el sueldo a quien manda más que tú ──────────
 *
 * Porque si no, un gerente podría ponerle sueldo a su área manager y a la
 * dirección. La regla es sencilla y se comprueba con la amplitud del rol, que es
 * un número que la base ya tiene desde M1: **solo se toca la retribución de quien
 * no manda más que tú**. Un gerente pone la de su equipo; la suya y la de arriba,
 * no.
 *
 * Esto **no sustituye a las políticas** —las de la 0027 ya cierran quién ve qué—,
 * lo añade: las políticas dicen «este dato es de este ámbito» y esto dice «y
 * dentro del ámbito, no hacia arriba».
 */

export const entradaPonerRetribucion = z
  .object({
    persona_id: z.string().uuid(),
    /** Nulo = para toda la organización, que es lo normal. */
    local_id: z.string().uuid().nullable().optional(),
    forma: z.enum(['por_hora', 'mensual']),
    /** Por hora o al mes según `forma`, en céntimos enteros. */
    importe_centimos: z.number().int().min(0).max(100_000_000),
    horas_semanales: z.number().min(0.5).max(80).nullable().optional(),
    puesto: z.string().trim().max(120).nullable().optional(),
  })
  .strict()
  // La misma regla que la restricción de la base: un sueldo mensual sin horas de
  // contrato no se puede repartir por hora, y entonces lo que cuesta un turno
  // sería un invento. Se comprueba aquí también para poder decirlo en cristiano
  // en vez de devolver un error de restricción.
  .refine((e) => e.forma !== 'mensual' || (e.horas_semanales ?? 0) > 0, {
    message: 'Un sueldo mensual necesita las horas de contrato para poder repartirlo por hora.',
    path: ['horas_semanales'],
  });

export type EntradaPonerRetribucion = z.infer<typeof entradaPonerRetribucion>;

/**
 * Poner o cambiar lo que cobra alguien.
 *
 * ── Por qué cierra la anterior en vez de editarla ───────────────────────────
 *
 * Porque una subida de sueldo **no puede reescribir el pasado**. Editando la fila,
 * subirle el precio de la hora a alguien en marzo cambiaría lo que costó su turno
 * de enero, y el coste de personal de enero dejaría de cuadrar con lo que se pagó
 * de verdad. Es la misma decisión que los precios de compra desde M6: se cierra la
 * vigente con la fecha de ayer y se abre una nueva.
 */
export const ponerRetribucion = comando<
  EntradaPonerRetribucion,
  { retribucionId: string; desde: string }
>({
  nombre: 'poner_retribucion',
  entrada: entradaPonerRetribucion,
  exige: 'dato.coste_de_personal',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    if (entrada.persona_id === contexto.personaId) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Tu propia retribución no te la pones tú. La pone quien lleva la organización.',
      });
    }

    // ── No hacia arriba ──────────────────────────────────────────────────────
    //
    // `rol.amplitud` es el número que M1 usa para ordenar los doce roles. Se
    // compara el más amplio de quien mira con el más amplio de la otra persona
    // **dentro de la misma organización**, que es el ámbito donde una jerarquía
    // significa algo.
    const jerarquia = await contexto.sql<{ mio: number | null; suyo: number | null }[]>`
      select
        (select max(r.amplitud)
           from estook.membresia m join estook.rol r on r.codigo = m.rol
          where m.persona_id = ${contexto.personaId}
            and m.organizacion_id = ${organizacionId}
            and m.revocada_en is null) as mio,
        (select max(r.amplitud)
           from estook.membresia m join estook.rol r on r.codigo = m.rol
          where m.persona_id = ${entrada.persona_id}
            and m.organizacion_id = ${organizacionId}
            and m.revocada_en is null) as suyo
    `;
    const mio = jerarquia[0]?.mio ?? 0;
    const suyo = jerarquia[0]?.suyo ?? 0;
    if (suyo >= mio) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque:
          'Solo puedes poner la retribución de quien no manda más que tú. La de esa persona la lleva la dirección.',
      });
    }

    const ambito = entrada.local_id ?? null;

    // Se cierra la vigente **ayer**, no hoy: si se cerrara hoy, el día de hoy se
    // quedaría con dos vigencias o con ninguna según cómo se mire, y el coste de
    // hoy dependería del orden de las filas.
    await contexto.sql`
      update estook.retribucion
         set hasta = current_date - 1, actualizado_en = now()
       where persona_id = ${entrada.persona_id}
         and hasta is null
         and local_id is not distinct from ${ambito}::uuid
    `;

    const puestas = await contexto.sql<{ id: string; desde: string }[]>`
      insert into estook.retribucion (
        organizacion_id, persona_id, local_id, forma, importe_centimos,
        horas_semanales, puesto, desde, creado_por
      )
      values (
        ${organizacionId}, ${entrada.persona_id}, ${ambito},
        ${entrada.forma}::estook.forma_de_retribucion,
        ${entrada.importe_centimos},
        ${entrada.horas_semanales ?? null},
        ${entrada.puesto ?? null},
        current_date,
        ${contexto.personaId}
      )
      returning id, to_char(desde, 'YYYY-MM-DD') as desde
    `;

    const puesta = puestas[0];
    if (!puesta) throw new FalloDeAplicacion('sin_permiso');

    // A la auditoría, y sin dudarlo: «todo lo que toca dinero». Sin el importe
    // dentro, que la auditoría la leen más personas de las que pueden ver un
    // sueldo. Lo que queda escrito es que se cambió, quién y cuándo.
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'retribucion', ${puesta.id},
        ${entrada.local_id ?? null}::uuid, null,
        ${JSON.stringify({ persona_id: entrada.persona_id, forma: entrada.forma })}::jsonb,
        null
      )
    `;

    return { retribucionId: puesta.id, desde: puesta.desde };
  },
});

// ── El horario de siempre ────────────────────────────────────────────────────

const unTramo = z
  .object({
    dia: z.number().int().min(1).max(7),
    entra: z.string().regex(/^\d{2}:\d{2}$/, 'Una hora se escribe así: 09:00.'),
    sale: z.string().regex(/^\d{2}:\d{2}$/, 'Una hora se escribe así: 17:00.'),
  })
  .strict();

export const entradaPonerHorarioHabitual = z
  .object({
    persona_id: z.string().uuid(),
    /** La semana entera, de golpe. Vacío quiere decir «no tiene horario fijo». */
    tramos: z.array(unTramo).max(21),
  })
  .strict();

export type EntradaPonerHorarioHabitual = z.infer<typeof entradaPonerHorarioHabitual>;

/**
 * El horario de siempre de una persona.
 *
 * ── Lo que es, y sobre todo lo que no ───────────────────────────────────────
 *
 * **No es el cuadrante.** El cuadrante es M14: quién trabaja el jueves 19, con sus
 * cambios, sus sustituciones y su coste antes de publicarlo. Esto es «entra a las
 * nueve de lunes a viernes», que es lo único que hace falta para poder avisar de
 * que toca fichar. Cuando llegue M14, manda el cuadrante y esto queda como el
 * valor por defecto del que parte.
 *
 * Se manda **la semana entera** y se reemplaza, en vez de tramo a tramo. Es una
 * pantalla de siete filas que se rellena de una vez, y hacerlo con tres comandos
 * —añadir, cambiar, quitar— obligaría a la pantalla a llevar la cuenta de qué ha
 * cambiado, que es de donde salen los estados a medias.
 */
export const ponerHorarioHabitual = comando<EntradaPonerHorarioHabitual, { tramos: number }>({
  nombre: 'poner_horario_habitual',
  entrada: entradaPonerHorarioHabitual,
  exige: 'app.equipo',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);

    await contexto.sql`
      delete from estook.horario_habitual
       where persona_id = ${entrada.persona_id} and local_id = ${localId}
    `;

    for (const tramo of entrada.tramos) {
      await contexto.sql`
        insert into estook.horario_habitual (
          local_id, persona_id, dia_de_la_semana, entra, sale, creado_por
        )
        values (
          ${localId}, ${entrada.persona_id}, ${tramo.dia},
          ${tramo.entra}::time, ${tramo.sale}::time, ${contexto.personaId}
        )
      `;
    }

    return { tramos: entrada.tramos.length };
  },
});

// ── Dónde está el local ──────────────────────────────────────────────────────

export const entradaPonerDondeEstaElLocal = z
  .object({
    /**
     * Las dos coordenadas, o ninguna. **Sin ellas en el cuerpo, se quedan las que
     * hay**: es lo que permite cambiar solo el radio sin tener que volver a mandar
     * la posición. Con las dos a nulo, se quitan.
     */
    latitud: z.number().min(-90).max(90).nullable().optional(),
    longitud: z.number().min(-180).max(180).nullable().optional(),
    radio_metros: z.number().int().min(10).max(5000).optional(),
  })
  .strict()
  .refine(
    (e) =>
      (e.latitud === undefined) === (e.longitud === undefined) &&
      (e.latitud === null) === (e.longitud === null),
    { message: 'O van las dos coordenadas o no va ninguna.' },
  );

export type EntradaPonerDondeEstaElLocal = z.infer<typeof entradaPonerDondeEstaElLocal>;

/**
 * Marcar dónde está el local, para poder decir a cuántos metros se fichó.
 *
 * Se pone **desde el propio local**, con el botón «estoy aquí», que es la forma en
 * la que sale bien: una dirección escrita a mano hay que geocodificarla, y eso es
 * un servicio de fuera que hoy no está contratado (la decisión 0013 aplazó Google
 * Places a M23 por lo mismo).
 *
 * Sin esto puesto, los fichajes guardan su posición igual y **no se comparan con
 * nada**: `metros` sale nulo y la lista lo dice. Es una verdad a medias, no una
 * mentira, y se puede completar cualquier día sin perder lo de antes.
 */
export const ponerDondeEstaElLocal = comando<
  EntradaPonerDondeEstaElLocal,
  { latitud: number | null; longitud: number | null; radioMetros: number }
>({
  nombre: 'poner_donde_esta_el_local',
  entrada: entradaPonerDondeEstaElLocal,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);

    // Si no vienen coordenadas, no se tocan. Se decide aquí y se manda como un
    // booleano, en vez de componer el `update` a trozos: la API de pruebas no
    // admite fragmentos condicionales, a propósito (ver `cambiar_producto`).
    const cambiaLaPosicion = entrada.latitud !== undefined;

    const filas = await contexto.sql<
      { latitud: string | null; longitud: string | null; radio: number }[]
    >`
      update estook.local
         set latitud = case when ${cambiaLaPosicion} then ${entrada.latitud ?? null}::numeric
                            else latitud end,
             longitud = case when ${cambiaLaPosicion} then ${entrada.longitud ?? null}::numeric
                             else longitud end,
             radio_de_fichaje_metros = coalesce(
               ${entrada.radio_metros ?? null}::int, radio_de_fichaje_metros
             )
       where id = ${localId}
      returning latitud::text as latitud, longitud::text as longitud,
                radio_de_fichaje_metros as radio
    `;

    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('sin_permiso');

    return {
      latitud: fila.latitud === null ? null : Number(fila.latitud),
      longitud: fila.longitud === null ? null : Number(fila.longitud),
      radioMetros: fila.radio,
    };
  },
});
