import { z } from 'zod';
import {
  MODOS_DE_SONAR,
  SILENCIO_DE_FABRICA,
  esCuandoSuena,
  suModo,
  type CuandoSuena,
} from '@estook/dominio';
import { esDireccionDeAvisos } from '../../infraestructura/movil.ts';
import { comando, consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { comoLista } from '../listas.ts';
import { enNombreDelSistema } from '../pago.ts';

/**
 * El móvil de cada uno (I · decisión 0070): ponerlo para recibir avisos, quitarlo,
 * probarlo y elegir cuándo suena. Todo de la persona, sin permiso de nadie: son sus
 * avisos y su teléfono.
 *
 *   mi_movil                   Ajustes → Avisos: si está encendido, sus móviles y cuándo suena
 *   poner_este_movil           el navegador ha dicho que sí: se guarda su dirección
 *   quitar_este_movil          dejar de recibir en este (o en otro de la lista)
 *   probar_mi_movil            un aviso de prueba, ahora, a todos sus móviles
 *   guardar_cuando_suena       en mi turno, o fuera de mis horas de silencio
 */

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Una hora como 23:00.');

export interface UnMovilMio {
  readonly id: string;
  readonly aparato: string | null;
  readonly desde: string;
  readonly ultimoUso: string | null;
}

export interface SalidaMiMovil {
  /** Si los avisos al móvil están encendidos en Estook (sus claves VAPID puestas). */
  readonly encendido: boolean;
  /** La pública de Estook, que el navegador necesita para suscribirse. */
  readonly clavePublica: string | null;
  readonly moviles: readonly UnMovilMio[];
  readonly cuandoSuena: {
    readonly modo: CuandoSuena;
    readonly desde: string;
    readonly hasta: string;
    /** Si no lo ha elegido: es el de fábrica según tenga horario o no. */
    readonly deFabrica: boolean;
    readonly tieneHorario: boolean;
  };
}

function yo(contexto: Contexto): string {
  if (contexto.personaId === null) throw new FalloDeAplicacion('sin_sesion');
  return contexto.personaId;
}

export const miMovil = consulta<Record<string, never>, SalidaMiMovil>({
  nombre: 'mi_movil',
  entrada: z.object({}).strict(),

  async ejecutar(contexto) {
    const personaId = yo(contexto);
    const moviles = await contexto.sql<
      { id: string; aparato: string | null; desde: string; ultimo: string | null }[]
    >`
      select id, aparato,
             to_char(creado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as desde,
             to_char(ultimo_uso_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ultimo
        from estook.movil_suscrito where persona_id = ${personaId}
       order by creado_en
    `;
    const elegido = await contexto.sql<{ modo: string; desde: string; hasta: string }[]>`
      select modo, to_char(silencio_desde, 'HH24:MI') as desde,
             to_char(silencio_hasta, 'HH24:MI') as hasta
        from estook.cuando_suena where persona_id = ${personaId}
    `;
    // Si tiene horario lo sabe la base, y solo se lo dice al sistema (0054).
    const tieneHorario = await enNombreDelSistema(contexto, async () => {
      const filas = await contexto.sql<{ tiene_horario: boolean }[]>`
        select tiene_horario from estook.como_le_suena(${comoLista([personaId])}::text::uuid[])
      `;
      return filas[0]?.tiene_horario === true;
    });
    const suyo = elegido[0];
    const modo = suModo(
      suyo !== undefined && esCuandoSuena(suyo.modo) ? suyo.modo : null,
      tieneHorario,
    );
    return {
      encendido: contexto.movil !== null,
      clavePublica: contexto.movil?.clavePublica ?? null,
      moviles: moviles.map((m) => ({
        id: m.id,
        aparato: m.aparato,
        desde: m.desde,
        ultimoUso: m.ultimo,
      })),
      cuandoSuena: {
        modo,
        desde: suyo?.desde ?? SILENCIO_DE_FABRICA.desde,
        hasta: suyo?.hasta ?? SILENCIO_DE_FABRICA.hasta,
        deFabrica: suyo === undefined,
        tieneHorario,
      },
    };
  },
});

export const entradaPonerEsteMovil = z
  .object({
    direccion: z.string().trim().max(1000),
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{10,100}$/),
    /** «iPhone · Safari», para reconocerlo en la lista. */
    aparato: z.string().trim().max(80).nullable().optional(),
  })
  .strict();

/**
 * El navegador ha dicho que sí: se guarda **a dónde mandarle los avisos**.
 *
 * Solo direcciones de los servicios de avisos de los navegadores: una inventada haría
 * que Estook mandara peticiones a donde alguien quisiera (\`esDireccionDeAvisos\`).
 *
 * **Si ese móvil era de otra persona, pasa a ser de quien está ahora**: es el mismo
 * navegador, y si se quedara a nombre del de antes, a quien entra le llegarían los
 * avisos del otro. Salir de la app ya lo quita, pero una sesión que caduca no sale.
 */
export const ponerEsteMovil = comando<z.infer<typeof entradaPonerEsteMovil>, { id: string }>({
  nombre: 'poner_este_movil',
  entrada: entradaPonerEsteMovil,

  async ejecutar(contexto, entrada) {
    const personaId = yo(contexto);
    if (contexto.movil === null) throw new FalloDeAplicacion('movil_sin_encender');
    if (!esDireccionDeAvisos(entrada.direccion)) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Esa dirección no es la de un servicio de avisos de un navegador.',
      });
    }
    await enNombreDelSistema(contexto, async () => {
      await contexto.sql`
        delete from estook.movil_suscrito
         where direccion = ${entrada.direccion} and persona_id <> ${personaId}
      `;
    });
    const filas = await contexto.sql<{ id: string }[]>`
      insert into estook.movil_suscrito (persona_id, direccion, p256dh, auth, aparato, ultimo_uso_en)
      values (${personaId}, ${entrada.direccion}, ${entrada.p256dh}, ${entrada.auth},
              ${entrada.aparato ?? null}, now())
      on conflict (direccion) do update
        set p256dh = excluded.p256dh, auth = excluded.auth, aparato = excluded.aparato,
            fallos = 0, ultimo_uso_en = now()
      returning id
    `;
    const fila = filas[0];
    if (fila === undefined) throw new FalloDeAplicacion('sin_permiso');
    return { id: fila.id };
  },
});

export const quitarEsteMovil = comando<
  { direccion?: string | undefined; id?: string | undefined },
  { quitados: number }
>({
  nombre: 'quitar_este_movil',
  entrada: z
    .object({
      direccion: z.string().trim().max(1000).optional(),
      id: z.string().uuid().optional(),
    })
    .strict()
    .refine((e) => (e.direccion === undefined) !== (e.id === undefined), {
      message: 'Este móvil, por su dirección, o uno de la lista, por su número.',
    }),
  // Al salir de la app se quita, y salir tiene que poder hacerse siempre. En una
  // visita de demostración no hace falta: allí no se puede poner ninguno.
  sinPagar: true,

  async ejecutar(contexto, entrada) {
    const personaId = yo(contexto);
    // La política solo deja quitar los tuyos: aunque llegara la de otro, no se toca.
    const filas = await contexto.sql<{ id: string }[]>`
      delete from estook.movil_suscrito
       where persona_id = ${personaId}
         and (${entrada.direccion ?? null}::text is null or direccion = ${entrada.direccion ?? null})
         and (${entrada.id ?? null}::uuid is null or id = ${entrada.id ?? null}::uuid)
      returning id
    `;
    return { quitados: filas.length };
  },
});

/**
 * Un aviso de prueba, ahora, a todos sus móviles: «¿me llega?» se contesta mirando el
 * teléfono, no leyendo una explicación. No queda en la campana.
 */
export const probarMiMovil = comando<
  Record<string, never>,
  { entregados: number; fallidos: number }
>({
  nombre: 'probar_mi_movil',
  entrada: z.object({}).strict(),
  // Probar no cambia nada: no hace falta recordarlo.
  sinRecordar: true,

  async ejecutar(contexto) {
    const personaId = yo(contexto);
    const movil = contexto.movil;
    if (movil === null) throw new FalloDeAplicacion('movil_sin_encender');
    const moviles = await contexto.sql<
      { id: string; direccion: string; p256dh: string; auth: string }[]
    >`
      select id, direccion, p256dh, auth from estook.movil_suscrito where persona_id = ${personaId}
    `;
    if (moviles.length === 0) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Este móvil todavía no recibe avisos. Pulsa «Recibir en este móvil» primero.',
      });
    }
    let entregados = 0;
    let fallidos = 0;
    for (const m of moviles) {
      const como = await movil
        .mandar(
          m,
          {
            titulo: 'Así te llegarán los avisos de Estook',
            detalle: 'Si lo estás leyendo en la pantalla del móvil, ya está.',
            ir: '/ajustes/avisos',
            etiqueta: 'estook-prueba',
            sinLeer: 0,
          },
          { urgente: true, segundosQueVale: 60 },
        )
        .catch(() => 'fallo' as const);
      if (como === 'entregado') entregados += 1;
      else fallidos += 1;
      if (como === 'ya_no_existe') {
        await contexto.sql`delete from estook.movil_suscrito where id = ${m.id}`;
      }
    }
    return { entregados, fallidos };
  },
});

export const entradaGuardarCuandoSuena = z
  .object({
    modo: z.enum(MODOS_DE_SONAR),
    desde: hora,
    hasta: hora,
  })
  .strict();

export const guardarCuandoSuena = comando<
  z.infer<typeof entradaGuardarCuandoSuena>,
  { modo: CuandoSuena; desde: string; hasta: string }
>({
  nombre: 'guardar_cuando_suena',
  entrada: entradaGuardarCuandoSuena,

  async ejecutar(contexto, entrada) {
    const personaId = yo(contexto);
    await contexto.sql`
      insert into estook.cuando_suena (persona_id, modo, silencio_desde, silencio_hasta)
      values (${personaId}, ${entrada.modo}, ${entrada.desde}::time, ${entrada.hasta}::time)
      on conflict (persona_id) do update
        set modo = excluded.modo, silencio_desde = excluded.silencio_desde,
            silencio_hasta = excluded.silencio_hasta, actualizado_en = now()
    `;
    return { modo: entrada.modo, desde: entrada.desde, hasta: entrada.hasta };
  },
});
