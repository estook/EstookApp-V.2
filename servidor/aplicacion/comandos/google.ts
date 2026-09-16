import { z } from 'zod';
import {
  LETRAS_PARA_BUSCAR,
  horaDeCorte,
  jornadaDe,
  mesDe,
  topeDeGoogle,
  type UsoDeGoogle,
} from '@estook/dominio';
import { publicar } from '../../eventos/bandeja.ts';
import {
  GoogleNoContesta,
  type FichaDeGoogle,
  type LugaresDeGoogle,
} from '../../infraestructura/google.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * El local en Google (M7, entrega 5 · decisiones 0030 y 0040).
 *
 * «Ahora preguntas dónde está el local, pero eso se verá cuando se conecte con
 * Google Business y Places. Y servirá para fichar y ubicar el restaurante.»
 *
 *   buscar_mi_local_en_google     lo escrito → sugerencias de Google
 *   elegir_mi_local_de_google     una sugerencia → su ficha, guardada con su fecha
 *   actualizar_mi_ficha_de_google la ficha otra vez, como mucho una vez al día
 *
 * ── El tope, antes de llamar ─────────────────────────────────────────────────
 *
 * Cada llamada **cuenta primero y llama después**, y la cuenta es una sola orden
 * que suma solo si queda sitio (`on conflict … where cuantas < tope`). Dos
 * pestañas a la vez no pueden pasarse del tope entre las dos. Si Google falla, la
 * transacción se deshace y esa llamada no cuenta: Google no cobra las que fallan.
 *
 * ── Solo por la API, nunca desde el navegador ───────────────────────────────
 *
 * La clave vive en los secretos de Supabase y no sale del servidor (0030). Sin
 * ella, estos comandos dicen que Google no está conectado: no se rompe nada.
 */

function google(contexto: Contexto): LugaresDeGoogle {
  if (contexto.google === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        'Google todavía no está conectado: falta su clave en el servidor. Mientras, marca el local desde el propio local.',
    });
  }
  return contexto.google;
}

/** El mes del local, con su reloj y su hora de corte (regla 10). */
async function elMes(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string; hora_de_corte: string }[]>`
    select zona_horaria, to_char(hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.local where id = ${localId}
  `;
  const fila = filas[0];
  if (!fila) throw new FalloDeAplicacion('local_ajeno');
  return mesDe(jornadaDe(contexto.ahora, fila.zona_horaria, horaDeCorte(fila.hora_de_corte)));
}

/**
 * Suma una al contador del mes, **solo si queda sitio**. Si no, corta con la
 * frase que dice cuánto y hasta cuándo.
 */
async function contar(contexto: Contexto, localId: string, que: UsoDeGoogle): Promise<void> {
  const mes = await elMes(contexto, localId);
  const tope = topeDeGoogle(que);
  const sumadas = await contexto.sql<{ cuantas: number }[]>`
    insert into estook.uso_de_google (local_id, mes, que, cuantas)
    values (${localId}, ${mes}::date, ${que}, 1)
    on conflict (local_id, mes, que) do update
       set cuantas = estook.uso_de_google.cuantas + 1
     where estook.uso_de_google.cuantas < ${tope}
    returning cuantas
  `;
  if (sumadas.length === 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque:
        que === 'ficha'
          ? `Este mes ya se han pedido ${tope} fichas a Google para este local, que es el tope. Vuelve a haber el día 1.`
          : `Este mes ya se han hecho ${tope} búsquedas en Google para este local, que es el tope. Vuelve a haber el día 1.`,
    });
  }
}

/** Lo que pasa si Google contesta mal, dicho para una persona. */
async function preguntarA<T>(pregunta: () => Promise<T>): Promise<T> {
  try {
    return await pregunta();
  } catch (fallo) {
    if (fallo instanceof GoogleNoContesta || fallo instanceof TypeError) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Google no ha contestado bien. No se ha guardado nada: prueba otra vez en un rato.',
      });
    }
    throw fallo;
  }
}

// ── Buscar ───────────────────────────────────────────────────────────────────

export const entradaBuscarMiLocalEnGoogle = z
  .object({
    texto: z.string().trim().min(LETRAS_PARA_BUSCAR).max(120),
    /** Agrupa las letras de una búsqueda con la ficha que se elija: se cobra una vez. */
    sesion: z.string().uuid(),
  })
  .strict();

export type EntradaBuscarMiLocalEnGoogle = z.infer<typeof entradaBuscarMiLocalEnGoogle>;

export const buscarMiLocalEnGoogle = comando<
  EntradaBuscarMiLocalEnGoogle,
  { sugerencias: readonly { id: string; nombre: string; direccion: string }[] }
>({
  nombre: 'buscar_mi_local_en_google',
  entrada: entradaBuscarMiLocalEnGoogle,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const lugares = google(contexto);
    await contar(contexto, localId, 'busqueda');
    const sugerencias = await preguntarA(() => lugares.buscar(entrada.texto, entrada.sesion));
    return { sugerencias: sugerencias.slice(0, 5) };
  },
});

// ── Guardar una ficha ────────────────────────────────────────────────────────

async function guardarLaFicha(
  contexto: Contexto,
  localId: string,
  ficha: FichaDeGoogle,
  usarSuPosicion: boolean,
): Promise<{ posicionPuesta: boolean }> {
  const organizacionId = laOrganizacionDeLaSesion(contexto);
  const conPosicion = usarSuPosicion && ficha.latitud !== null && ficha.longitud !== null;

  const antes = await contexto.sql<{ google_id: string | null; posicion_de: string | null }[]>`
    select google_id, posicion_de from estook.local where id = ${localId}
  `;

  const cambiadas = await contexto.sql<{ id: string }[]>`
    update estook.local
       set google_id = ${ficha.id},
           google_nombre = ${ficha.nombre},
           google_direccion = ${ficha.direccion},
           google_telefono = ${ficha.telefono},
           google_web = ${ficha.web},
           google_mapa = ${ficha.mapa},
           google_valoracion = ${ficha.valoracion}::numeric,
           google_resenas = ${ficha.resenas}::int,
           google_horario = ${ficha.horario === null ? null : JSON.stringify(ficha.horario)}::text::jsonb,
           google_leido_en = ${contexto.ahora.toISOString()}::timestamptz,
           -- Lo escrito a mano en el alta **no se pisa**: se rellena si está vacío.
           direccion = coalesce(direccion, ${ficha.direccion}),
           telefono = coalesce(telefono, ${ficha.telefono}),
           latitud = case when ${conPosicion} then ${ficha.latitud}::numeric else latitud end,
           longitud = case when ${conPosicion} then ${ficha.longitud}::numeric else longitud end,
           posicion_de = case when ${conPosicion} then 'google' else posicion_de end
     where id = ${localId}
    returning id::text as id
  `;
  // Si la política no deja escribir, se dice: guardar en silencio es peor (regla 34).
  if (cambiadas.length === 0) throw new FalloDeAplicacion('sin_permiso');

  await contexto.sql`
    select estook.anotar(
      ${organizacionId}::uuid, 'cambiar', 'local', ${localId},
      ${localId}::uuid,
      ${JSON.stringify({ google_id: antes[0]?.google_id ?? null, posicion_de: antes[0]?.posicion_de ?? null })}::text::jsonb,
      ${JSON.stringify({ google_id: ficha.id, posicion_de: conPosicion ? 'google' : (antes[0]?.posicion_de ?? null) })}::text::jsonb,
      null
    )
  `;

  await publicar(contexto.sql, {
    tipo: 'local.ficha_cambiada',
    organizacionId,
    localId,
    datos: { que: 'google', conPosicion },
    correlacionId: contexto.correlacionId,
  });

  return { posicionPuesta: conPosicion };
}

// ── Elegir ───────────────────────────────────────────────────────────────────

export const entradaElegirMiLocalDeGoogle = z
  .object({
    id: z.string().trim().min(1).max(300),
    sesion: z.string().uuid().nullable(),
    /**
     * Si la posición del fichaje sale de Google. La pantalla lo propone encendido
     * cuando el local no tiene posición, o cuando la que tiene ya era de Google; si
     * se marcó a mano desde el local, lo propone apagado: **la de a mano manda**,
     * porque en un centro comercial el punto de Google cae en el aparcamiento.
     */
    usar_su_posicion: z.boolean(),
  })
  .strict();

export type EntradaElegirMiLocalDeGoogle = z.infer<typeof entradaElegirMiLocalDeGoogle>;

export const elegirMiLocalDeGoogle = comando<
  EntradaElegirMiLocalDeGoogle,
  { nombre: string | null; posicionPuesta: boolean }
>({
  nombre: 'elegir_mi_local_de_google',
  entrada: entradaElegirMiLocalDeGoogle,
  exige: 'app.ajustes',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const lugares = google(contexto);
    await contar(contexto, localId, 'ficha');
    const ficha = await preguntarA(() => lugares.ficha(entrada.id, entrada.sesion));
    const { posicionPuesta } = await guardarLaFicha(
      contexto,
      localId,
      ficha,
      entrada.usar_su_posicion,
    );
    return { nombre: ficha.nombre, posicionPuesta };
  },
});

// ── Actualizar ───────────────────────────────────────────────────────────────

/**
 * Traer la ficha otra vez: el horario, la valoración o el teléfono cambian.
 *
 * **Como mucho una vez al día por local.** Si ya se trajo hoy, contesta sin llamar
 * a Google. La 0030 quiere que esto lo haga solo el reloj al cerrar la jornada;
 * mientras el reloj no exista (0016), es un botón, con el mismo límite.
 */
export const actualizarMiFichaDeGoogle = comando<Record<string, never>, { actualizada: boolean }>({
  nombre: 'actualizar_mi_ficha_de_google',
  entrada: z.object({}).strict(),
  exige: 'app.ajustes',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const filas = await contexto.sql<
      { google_id: string | null; hoy: boolean; posicion_de: string | null }[]
    >`
      select google_id, posicion_de,
             coalesce(google_leido_en > ${contexto.ahora.toISOString()}::timestamptz - interval '1 day', false) as hoy
        from estook.local where id = ${localId}
    `;
    const fila = filas[0];
    if (!fila) throw new FalloDeAplicacion('local_ajeno');
    if (fila.google_id === null) {
      throw new FalloDeAplicacion('faltan_datos', {
        porque: 'Este local todavía no está enlazado con Google. Búscalo primero.',
      });
    }
    if (fila.hoy) return { actualizada: false };

    const lugares = google(contexto);
    await contar(contexto, localId, 'ficha');
    const googleId = fila.google_id;
    const ficha = await preguntarA(() => lugares.ficha(googleId, null));
    // La posición sigue a Google solo si ya venía de Google.
    await guardarLaFicha(contexto, localId, ficha, fila.posicion_de === 'google');
    return { actualizada: true };
  },
});
