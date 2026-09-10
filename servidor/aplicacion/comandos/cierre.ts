import { z } from 'zod';
import { horaDeCorte, jornadaDe } from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * El cierre de caja (M6½) · con TPV o sin él.
 *
 * ── Por qué esto existe antes de M20 ────────────────────────────────────────
 *
 * Porque Estook sabe lo que **cuesta** el género y no sabía lo que **entra**, y sin
 * eso no hay food cost, no hay margen y no hay Pulse. La respuesta escrita hasta
 * hoy era «conecta tu TPV», que es M18 y M20, y eso deja fuera a media hostelería:
 * un bar con una caja de veinte años y un papel de Z al final del día no tiene nada
 * que conectar.
 *
 * ── Y por qué los dos caminos escriben la misma fila ────────────────────────
 *
 * Esta es la decisión que hace que valga la pena hacerlo ahora. `origen` dice si
 * se teclóo, si salió de un CSV, de una foto del Z o del TPV, y **nada más**
 * depende de eso: las gráficas, el food cost y el histórico leen la misma tabla.
 * Cuando M20 traiga el conector, lo que llegue se guarda aquí con
 * `origen = 'tpv'` y no hay que rehacer una sola pantalla.
 *
 * Si el cierre a mano se hubiera montado aparte «de momento», conectar el TPV
 * habría significado tirar y volver a escribir todo esto.
 */

export const entradaElegirComoSeCierra = z
  .object({
    como: z.enum(['a_mano', 'tpv']),
    /** Qué programa de caja, si se ha elegido el TPV. */
    tpv: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

export type EntradaElegirComoSeCierra = z.infer<typeof entradaElegirComoSeCierra>;

/**
 * Elegir cómo entran las ventas.
 *
 * Se pregunta **una vez**, en la tarjeta del Panel o en el alta, y se cambia en
 * Ajustes. Antes esa tarjeta pedía «conecta tu TPV» y no había asistente que
 * conectara nada: pedía siempre lo mismo y no se podía resolver, que es la
 * definición de una tarjeta que se aprende a ignorar.
 */
export const elegirComoSeCierra = comando<
  EntradaElegirComoSeCierra,
  { como: string; tpv: string | null }
>({
  nombre: 'elegir_como_se_cierra',
  entrada: entradaElegirComoSeCierra,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const filas = await contexto.sql<{ como: string; tpv: string | null }[]>`
      update estook.local
         set como_se_cierra = ${entrada.como}::estook.como_se_cierra,
             tpv = ${entrada.como === 'tpv' ? (entrada.tpv ?? null) : null}
       where id = ${localId}
      returning como_se_cierra::text as como, tpv
    `;

    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('sin_permiso');

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
        ${localId}::uuid, null,
        ${JSON.stringify({ como_se_cierra: entrada.como, tpv: fila.tpv })}::text::jsonb,
        null
      )
    `;

    // La regla 14: quién se entera. El Panel deja de pedir que se elija, y M20
    // sabrá si tiene que ir a buscar algo a un TPV o no.
    await publicar(contexto.sql, {
      tipo: 'local.como_cierra',
      organizacionId,
      localId,
      datos: { como: entrada.como, tpv: fila.tpv },
      correlacionId: contexto.correlacionId,
    });

    return { como: fila.como, tpv: fila.tpv };
  },
});

// ── Cerrar la caja ───────────────────────────────────────────────────────────

const unaLinea = z
  .object({
    concepto: z.string().trim().min(1).max(200),
    unidades: z.number().positive().max(100_000),
    importe_centimos: z.number().int().min(0).max(100_000_000).nullable().optional(),
  })
  .strict();

export const entradaCerrarLaCaja = z
  .object({
    /** La jornada. Por defecto, la de ahora mismo según el reloj del local. */
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha se escribe así: 2026-09-30.')
      .optional(),
    total_centimos: z.number().int().min(0).max(1_000_000_000),
    efectivo_centimos: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    tarjeta_centimos: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    otros_centimos: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
    comensales: z.number().int().min(0).max(100_000).nullable().optional(),
    tickets: z.number().int().min(0).max(100_000).nullable().optional(),
    origen: z.enum(['a_mano', 'csv', 'foto']).optional(),
    notas: z.string().trim().max(1000).nullable().optional(),
    /** Qué platos salieron. Vacío se acepta: no todo el mundo lo tiene a mano. */
    lineas: z.array(unaLinea).max(500).optional(),
  })
  .strict();

export type EntradaCerrarLaCaja = z.infer<typeof entradaCerrarLaCaja>;

export interface SalidaCerrarLaCaja {
  readonly cierreId: string;
  readonly fecha: string;
  readonly totalCentimos: number;
  readonly lineas: number;
  /** Si ya había un cierre de ese día y se ha corregido. */
  readonly seHaCorregido: boolean;
}

async function laJornadaDelLocal(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte));
}

/**
 * Cerrar la caja de una jornada.
 *
 * ── Volver a cerrar el mismo día corrige, no duplica ────────────────────────
 *
 * La clave única de la 0029 lo impone en la base, y aquí se aprovecha: `on
 * conflict do update`. Es lo que una persona espera cuando se ha equivocado en una
 * cifra y vuelve a entrar, y sobre todo es lo que evita el fallo que no se ve —dos
 * cierres del mismo día haciendo que el total del mes salga mal mientras todo lo
 * demás parece correcto—.
 *
 * Las líneas se **reemplazan** enteras, no se acumulan. Un cierre corregido es el
 * cierre de ese día, no el de antes más el de ahora.
 */
export const cerrarLaCaja = comando<EntradaCerrarLaCaja, SalidaCerrarLaCaja>({
  nombre: 'cerrar_la_caja',
  entrada: entradaCerrarLaCaja,
  exige: 'dato.ventas',

  async ejecutar(contexto, entrada) {
    if (!contexto.personaId) throw new FalloDeAplicacion('sin_sesion');
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const fecha = entrada.fecha ?? (await laJornadaDelLocal(contexto, localId));

    const habia = await contexto.sql<{ id: string }[]>`
      select id from estook.cierre_de_caja
       where local_id = ${localId} and fecha_operativa = ${fecha}::date
    `;
    const seHaCorregido = habia.length > 0;

    const puestos = await contexto.sql<{ id: string }[]>`
      insert into estook.cierre_de_caja (
        local_id, fecha_operativa, total_centimos,
        efectivo_centimos, tarjeta_centimos, otros_centimos,
        comensales, tickets, origen, notas, cerrado_por
      )
      values (
        ${localId}, ${fecha}::date, ${entrada.total_centimos},
        ${entrada.efectivo_centimos ?? null}, ${entrada.tarjeta_centimos ?? null},
        ${entrada.otros_centimos ?? null},
        ${entrada.comensales ?? null}, ${entrada.tickets ?? null},
        ${entrada.origen ?? 'a_mano'}, ${entrada.notas ?? null}, ${contexto.personaId}
      )
      on conflict (local_id, fecha_operativa) do update
        set total_centimos = excluded.total_centimos,
            efectivo_centimos = excluded.efectivo_centimos,
            tarjeta_centimos = excluded.tarjeta_centimos,
            otros_centimos = excluded.otros_centimos,
            comensales = excluded.comensales,
            tickets = excluded.tickets,
            origen = excluded.origen,
            notas = excluded.notas,
            cerrado_por = excluded.cerrado_por,
            actualizado_en = now()
      returning id
    `;

    const cierreId = puestos[0]?.id;
    if (cierreId === undefined) throw new FalloDeAplicacion('sin_permiso');

    const lineas = entrada.lineas ?? [];
    await contexto.sql`delete from estook.linea_de_cierre where cierre_id = ${cierreId}`;

    for (const linea of lineas) {
      await contexto.sql`
        insert into estook.linea_de_cierre (
          cierre_id, concepto, concepto_normalizado, unidades, importe_centimos
        )
        values (
          ${cierreId}, ${linea.concepto},
          -- El disparador de la 0029 lo recalcula: se manda algo para cumplir el
          -- «not null» y el unico dueno del normalizado sigue siendo la base.
          '', ${linea.unidades}, ${linea.importe_centimos ?? null}
        )
      `;
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, ${seHaCorregido ? 'cambiar' : 'crear'}, 'cierre_de_caja',
        ${cierreId}, ${localId}::uuid, null,
        ${JSON.stringify({ fecha, total_centimos: entrada.total_centimos, lineas: lineas.length })}::text::jsonb,
        ${entrada.notas ?? null}
      )
    `;

    // La cascada de verdad de este módulo: ventas del día, ticket medio, food cost
    // sobre ventas, Pulse y —cuando llegue M20— el consumo que genera cada plato
    // vendido. Es el evento con más gente escuchando de todo el catálogo.
    await publicar(contexto.sql, {
      tipo: 'caja.cerrada',
      organizacionId,
      localId,
      datos: {
        cierreId,
        fecha,
        totalCentimos: entrada.total_centimos,
        lineas: lineas.length,
        origen: entrada.origen ?? 'a_mano',
        seHaCorregido,
      },
      correlacionId: contexto.correlacionId,
    });

    return {
      cierreId,
      fecha,
      totalCentimos: entrada.total_centimos,
      lineas: lineas.length,
      seHaCorregido,
    };
  },
});
