import { z } from 'zod';
import { TIPOS_DE_FOTO, TOPE_DE_LA_CARA, claveDeLaCara } from '../../infraestructura/almacen.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { decodificar, esDeVerdadDeEseTipo } from '../ficheros.ts';

/**
 * La foto de cada persona (la experiencia, 0083).
 *
 * «Añadir poder subir fotos del trabajador, y que no sean redondas sino cuadrados con
 * bordes redondeados.» La cara llega ya recortada en cuadrado y reducida a 320 px en
 * el teléfono, como las fotos de producto; aquí se comprueba que es de verdad una
 * imagen de las que se aceptan y que no pesa más de lo que debe.
 *
 * ── Quién puede ──────────────────────────────────────────────────────────────
 *
 * **No lo decide este fichero, lo decide la base**: las dos políticas de
 * `estook.persona` que ya había. La persona cambia la suya; quien da accesos en su
 * local, la de su equipo. Si ninguna de las dos le deja, la fila no se ve para
 * escribir y la respuesta es la misma que si no existiera.
 *
 * Por eso no lleva `exige`: un cocinero puede poner **su** foto sin tener ningún
 * permiso de Equipo.
 */
const base64QueCabe = z
  .string()
  .min(1)
  .max(Math.ceil((TOPE_DE_LA_CARA * 4) / 3) + 1024);

export const entradaPonerFotoDePersona = z
  .object({
    persona_id: z.string().uuid(),
    tipo: z.string().refine((t) => t in TIPOS_DE_FOTO, {
      message: 'Solo se admiten fotos en WebP o JPG.',
    }),
    foto: base64QueCabe,
  })
  .strict();

export type EntradaPonerFotoDePersona = z.infer<typeof entradaPonerFotoDePersona>;

const NO_ESTA = 'Esa persona no está en tu equipo, o tu acceso no deja cambiar su ficha.';

/** La fila, **para escribir**: con el candado, y solo si las políticas dejan. */
async function laFotoDeAhora(
  contexto: Contexto,
  personaId: string,
): Promise<{ readonly clave: string | null } | null> {
  // `for update` respeta las políticas de escritura: si no se puede cambiar, no sale.
  const filas = await contexto.sql<{ foto_clave: string | null }[]>`
    select foto_clave from estook.persona where id = ${personaId} for update
  `;
  const fila = filas[0];
  return fila === undefined ? null : { clave: fila.foto_clave };
}

async function apuntar(
  contexto: Contexto,
  personaId: string,
  antes: string | null,
  ahora: 'puesta' | 'sin',
): Promise<void> {
  // Como al ponerle el correo a alguien: en su organización y en el local desde el
  // que se hizo. Sin organización (no debería pasar con sesión), no se apunta.
  const organizacionId = contexto.sesion?.organizacionId ?? null;
  if (organizacionId === null) return;
  await contexto.sql`
    select estook.anotar(
      ${organizacionId}::uuid, 'cambiar', 'persona', ${personaId},
      ${contexto.sesion?.localId ?? null}::uuid,
      ${JSON.stringify({ foto: antes === null ? 'sin' : 'puesta' })}::text::jsonb,
      ${JSON.stringify({ foto: ahora })}::text::jsonb,
      null
    )
  `;
}

export const ponerFotoDePersona = comando<
  EntradaPonerFotoDePersona,
  { personaId: string; puesta: boolean }
>({
  nombre: 'poner_foto_de_persona',
  entrada: entradaPonerFotoDePersona,

  async ejecutar(contexto, entrada) {
    const almacen = contexto.almacen;
    if (almacen === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque: 'Todavía no hay dónde guardar las fotos. Todo lo demás funciona igual.',
      });
    }

    const foto = decodificar(entrada.foto, 'foto');
    if (foto.byteLength > TOPE_DE_LA_CARA) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: `Esa foto pesa demasiado aun reducida. El tope son ${Math.trunc(TOPE_DE_LA_CARA / 1024)} KB: prueba con otra.`,
      });
    }
    if (!esDeVerdadDeEseTipo(foto, entrada.tipo)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: 'Eso no es una foto que se pueda guardar. Prueba con otra.',
      });
    }

    const antes = await laFotoDeAhora(contexto, entrada.persona_id);
    if (antes === null) throw new FalloDeAplicacion('no_existe', { porque: NO_ESTA });

    const clave = claveDeLaCara(
      entrada.persona_id,
      TIPOS_DE_FOTO[entrada.tipo] ?? 'jpg',
      contexto.ahora,
    );
    await almacen.guardar(clave, foto, entrada.tipo);

    const cambiadas = await contexto.sql<{ id: string }[]>`
      update estook.persona
         set foto_clave = ${clave}, foto_puesta_en = now()
       where id = ${entrada.persona_id}
      returning id
    `;
    if (cambiadas.length === 0) {
      // Las políticas dejaron leerla pero no escribirla: se deja todo como estaba.
      await almacen.borrar(clave);
      throw new FalloDeAplicacion('no_existe', { porque: NO_ESTA });
    }

    if (antes.clave !== null) await almacen.borrar(antes.clave);
    await apuntar(contexto, entrada.persona_id, antes.clave, 'puesta');

    return { personaId: entrada.persona_id, puesta: true };
  },
});

export const quitarFotoDePersona = comando<
  { persona_id: string },
  { personaId: string; quitada: boolean }
>({
  nombre: 'quitar_foto_de_persona',
  entrada: z.object({ persona_id: z.string().uuid() }).strict(),

  async ejecutar(contexto, entrada) {
    const antes = await laFotoDeAhora(contexto, entrada.persona_id);
    if (antes === null) throw new FalloDeAplicacion('no_existe', { porque: NO_ESTA });
    if (antes.clave === null) return { personaId: entrada.persona_id, quitada: false };

    const cambiadas = await contexto.sql<{ id: string }[]>`
      update estook.persona
         set foto_clave = null, foto_puesta_en = null
       where id = ${entrada.persona_id}
      returning id
    `;
    if (cambiadas.length === 0) throw new FalloDeAplicacion('no_existe', { porque: NO_ESTA });

    if (contexto.almacen !== null) await contexto.almacen.borrar(antes.clave);
    await apuntar(contexto, entrada.persona_id, antes.clave, 'sin');

    return { personaId: entrada.persona_id, quitada: true };
  },
});
