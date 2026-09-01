import { z } from 'zod';
import { consulta, FalloDeAplicacion } from '../contrato.ts';

/**
 * El buscador universal (M3).
 *
 * «Buscador universal con `pg_trgm` y `unaccent` que busca tambien acciones»
 * (B5) · «Buscar en el buscador universal: **150 ms**» (B7).
 *
 * Lo de la base de datos lo resuelve `estook.buscar` (migracion 0017): sin
 * acentos, tolerante a erratas y con las politicas de M1 aplicando, porque la
 * funcion **no es `security definer`**. Preguntar por «bahia» no puede devolver
 * el local de la competencia ni aunque se llame asi.
 *
 * ── Las acciones no vienen de aqui ───────────────────────────────────────────
 *
 * «Que busca **tambien acciones**»: «cambiar el tamano de letra», «ir a
 * Inventario». Esas no estan en ninguna tabla, porque no son datos: son sitios y
 * botones de la propia pantalla. Las resuelve el cliente sobre su catalogo de
 * acciones, sin pedir nada.
 *
 * Y es lo correcto ademas de lo comodo: una accion se encuentra al instante y
 * sin conexion, que es justo lo que se espera de escribir «ajustes» y darle a
 * `Enter`. Lo que necesita la base de datos son los datos.
 */
export interface Resultado {
  /** `local`, `persona`, `organizacion`, `area`. Crece con cada modulo. */
  readonly tipo: string;
  readonly id: string;
  readonly titulo: string;
  readonly subtitulo: string;
  /** El local al que pertenece, cuando el resultado cuelga de uno. */
  readonly local_id: string | null;
}

/**
 * Menos de dos letras no se busca.
 *
 * Con una letra el parecido por trigramas no significa nada y devolveria medio
 * catalogo. Se para aqui y no en la pantalla, porque la regla 4 dice que toda
 * regla se prueba llamando a la API a pelo.
 */
export const MINIMO_DE_LETRAS = 2;

export const entradaDeBuscar = z
  .object({
    texto: z.string().trim().min(MINIMO_DE_LETRAS).max(120),
    // Llega por la barra de direcciones, asi que llega como texto.
    limite: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export type EntradaDeBuscar = z.infer<typeof entradaDeBuscar>;

export const buscar = consulta<EntradaDeBuscar, Resultado[]>({
  nombre: 'buscar',
  entrada: entradaDeBuscar,

  async ejecutar({ sql, personaId }, { texto, limite = 20 }) {
    if (!personaId) throw new FalloDeAplicacion('sin_sesion');

    const filas = await sql<
      {
        tipo: string;
        id: string;
        titulo: string;
        subtitulo: string;
        local_id: string | null;
      }[]
    >`
      select tipo, id, titulo, subtitulo, local_id
        from estook.buscar(${texto}, ${limite})
    `;

    // El parecido no sale: es como se ordena, no algo que la pantalla tenga que
    // ensenar ni de lo que deba depender.
    return filas.map((f) => ({ ...f }));
  },
});
