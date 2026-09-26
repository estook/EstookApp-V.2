import { z } from 'zod';
import {
  TIPOS_DE_FOTO,
  TOPE_DE_LA_FOTO,
  TOPE_DE_LA_MINIATURA,
  claveDeLaFoto,
} from '../../infraestructura/almacen.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { decodificar, esDeVerdadDeEseTipo } from '../ficheros.ts';

/**
 * La foto de un producto (mejoras antes de M8, entrega V, punto 5).
 *
 * «Van al mismo almacén que el logo del local, en un cubo suyo y con el mismo
 * camino: se sube por la API, la fila se escribe después de subir y la foto vieja
 * se borra.» Es exactamente el camino de `poner_logo` (`marca.ts`), con dos
 * diferencias que se notan:
 *
 *   · **Llegan dos ficheros**: la foto de 800 px y la miniatura de 160, ya
 *     reducidas en el móvil. Se reducen allí y no aquí por lo mismo que el logo:
 *     lo que se quiere evitar es subir cuatro megas por la red de un bar. Aquí se
 *     comprueba el tamaño otra vez —esconder algo en la pantalla no es protegerlo
 *     (regla 4)— y que sean de verdad una foto.
 *   · **Antes de subir nada se toma la fila para escribir** (`for update`). La
 *     base solo la da si la política de la tabla deja editarla —el permiso y la
 *     zona, 0035—, así que decide ella y no una copia de su regla aquí. Y la deja
 *     bloqueada hasta el final: dos personas poniendo la foto del mismo producto a
 *     la vez no se dejan un fichero huérfano la una a la otra.
 *
 * ── Y de qué local ───────────────────────────────────────────────────────────
 *
 * **Del de la sesión.** La foto es de la ficha de ese local (el plan lo dice así),
 * y se pone desde su ficha. Un producto de otro local, aunque esa persona también
 * lo lleve, contesta que no existe: primero se cambia de local.
 */

const base64QueCabe = (tope: number) =>
  z
    .string()
    .min(1)
    .max(Math.ceil((tope * 4) / 3) + 1024);

export const entradaPonerFoto = z
  .object({
    producto_id: z.string().uuid(),
    tipo: z.string().refine((t) => t in TIPOS_DE_FOTO, {
      message: 'Solo se admiten fotos en WebP o JPG.',
    }),
    /** La foto de 800 px, en base64 y sin el prefijo `data:`. */
    foto: base64QueCabe(TOPE_DE_LA_FOTO),
    /** La miniatura de 160 px, del mismo tipo. */
    miniatura: base64QueCabe(TOPE_DE_LA_MINIATURA),
  })
  .strict();

export type EntradaPonerFoto = z.infer<typeof entradaPonerFoto>;

interface FotoDeLaFila {
  local_id: string;
  foto_clave: string | null;
  miniatura_clave: string | null;
}

/**
 * La fila del producto, tomada para escribir. Nula si no existe, no es de este
 * local, o la política no deja editarla: las tres cosas se contestan igual, para
 * no decirle a nadie qué hay en un local que no es el suyo.
 */
async function laFilaParaEscribir(
  contexto: Contexto,
  productoId: string,
  localId: string,
): Promise<FotoDeLaFila | null> {
  // `for update` no es solo el candado: Postgres le aplica **las políticas de
  // escribir** además de las de leer, así que una fila que se puede ver pero no
  // editar —la gestoría, o un cocinero con un producto de sala— no sale.
  const filas = await contexto.sql<FotoDeLaFila[]>`
    select local_id, foto_clave, miniatura_clave
      from estook.producto
     where id = ${productoId} and local_id = ${localId}
       for update
  `;
  return filas[0] ?? null;
}

const NO_ESTA = 'Ese producto no está en este local, o tu acceso no deja cambiar su ficha.';

export const ponerFotoDeProducto = comando<
  EntradaPonerFoto,
  { productoId: string; puesta: boolean }
>({
  nombre: 'poner_foto_de_producto',
  entrada: entradaPonerFoto,
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);
    const almacen = contexto.almacen;

    if (almacen === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque:
          'Todavía no hay dónde guardar las fotos. Todo lo demás del producto funciona igual.',
      });
    }

    const foto = decodificar(entrada.foto, 'foto');
    const miniatura = decodificar(entrada.miniatura, 'miniatura');

    if (foto.byteLength > TOPE_DE_LA_FOTO || miniatura.byteLength > TOPE_DE_LA_MINIATURA) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: `Esa foto pesa demasiado aun reducida. El tope son ${Math.trunc(TOPE_DE_LA_FOTO / 1024)} KB: prueba con otra.`,
      });
    }
    if (!esDeVerdadDeEseTipo(foto, entrada.tipo) || !esDeVerdadDeEseTipo(miniatura, entrada.tipo)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['foto'],
        porque: 'Eso no es una foto que se pueda guardar. Prueba a hacerla otra vez.',
      });
    }

    // Primero la fila, y con ella lo que había: si se leyera después de subir, ya
    // no habría forma de saber qué ficheros sobran.
    const antes = await laFilaParaEscribir(contexto, entrada.producto_id, localId);
    if (antes === null) throw new FalloDeAplicacion('no_existe', { porque: NO_ESTA });

    const extension = TIPOS_DE_FOTO[entrada.tipo] ?? 'jpg';
    const claveFoto = claveDeLaFoto(
      localId,
      entrada.producto_id,
      'foto',
      extension,
      contexto.ahora,
    );
    const claveMiniatura = claveDeLaFoto(
      localId,
      entrada.producto_id,
      'miniatura',
      extension,
      contexto.ahora,
    );

    // Las dos, y si la segunda falla se borra la primera: media foto no sirve.
    await almacen.guardar(claveFoto, foto, entrada.tipo);
    try {
      await almacen.guardar(claveMiniatura, miniatura, entrada.tipo);
    } catch (fallo) {
      await almacen.borrar(claveFoto);
      throw fallo;
    }

    // **La fila se escribe después de subir.** Al revés, un fallo del almacén
    // dejaría el producto apuntando a una foto que no existe, y la lista enseñaría
    // un hueco roto en vez de la inicial.
    await contexto.sql`
      update estook.producto
         set foto_clave = ${claveFoto},
             miniatura_clave = ${claveMiniatura},
             foto_puesta_en = now()
       where id = ${entrada.producto_id}
    `;

    // Y lo viejo se borra al final, cuando ya no lo nombra nadie.
    if (antes.foto_clave !== null) await almacen.borrar(antes.foto_clave);
    if (antes.miniatura_clave !== null) await almacen.borrar(antes.miniatura_clave);

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'producto', ${entrada.producto_id},
        ${antes.local_id}::uuid,
        ${JSON.stringify({ foto: antes.foto_clave === null ? 'sin' : 'puesta' })}::text::jsonb,
        ${JSON.stringify({ foto: 'puesta' })}::text::jsonb,
        null
      )
    `;

    return { productoId: entrada.producto_id, puesta: true };
  },
});

export const quitarFotoDeProducto = comando<
  { producto_id: string },
  { productoId: string; quitada: boolean }
>({
  nombre: 'quitar_foto_de_producto',
  entrada: z.object({ producto_id: z.string().uuid() }).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const antes = await laFilaParaEscribir(contexto, entrada.producto_id, localId);
    if (antes === null) throw new FalloDeAplicacion('no_existe', { porque: NO_ESTA });
    if (antes.foto_clave === null) return { productoId: entrada.producto_id, quitada: false };

    await contexto.sql`
      update estook.producto
         set foto_clave = null, miniatura_clave = null, foto_puesta_en = null
       where id = ${entrada.producto_id}
    `;

    // Los ficheros, al final: si fallara el borrado sobra un fichero que nadie ve;
    // al revés, la ficha enseñaría un hueco roto.
    if (contexto.almacen !== null) {
      await contexto.almacen.borrar(antes.foto_clave);
      if (antes.miniatura_clave !== null) await contexto.almacen.borrar(antes.miniatura_clave);
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'producto', ${entrada.producto_id},
        ${antes.local_id}::uuid,
        ${JSON.stringify({ foto: 'puesta' })}::text::jsonb,
        ${JSON.stringify({ foto: 'quitada' })}::text::jsonb,
        null
      )
    `;

    return { productoId: entrada.producto_id, quitada: true };
  },
});
