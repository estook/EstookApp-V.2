import { z } from 'zod';
import {
  TIPOS_DE_PAGINA,
  TOPE_DE_LA_PAGINA,
  claveDeLaPagina,
  esDeLaCartaDe,
} from '../../infraestructura/almacen.ts';
import { elLocalDeLaSesion, laOrganizacionDeLaSesion } from '../alta.ts';
import { comando, FalloDeAplicacion } from '../contrato.ts';
import { decodificar, esDeVerdadDeEseTipo } from '../ficheros.ts';
import { comoLista } from '../listas.ts';

/**
 * La carta del local, subida (repaso del 25-sep · decisión 0049).
 *
 * «Poder subir una carta suya, si la tienen, o un diseño: así el PDF o el diseño
 * pasa a ser el que se muestra en la carta online.» (Richi) Hasta que haya platos
 * (M10), el QR de la mesa enseñaba el nombre y el horario; con esto enseña **la
 * carta de verdad del local**, la que ya tenía impresa.
 *
 * ── Por qué en dos pasos ─────────────────────────────────────────────────────
 *
 * Las páginas viajan **de una en una**: el navegador pasa cada página del PDF (o
 * cada foto) a una imagen de 1600 px y la sube (`subir_pagina_de_la_carta`), y
 * cuando están todas, **se publica la carta entera de una vez**
 * (`publicar_la_carta`). Así ninguna petición carga con doce páginas, y quien
 * escanea el QR a mitad de la subida sigue viendo la carta de antes entera, nunca
 * media carta nueva.
 *
 * Leer los platos de la carta subida y proponer los cambios —«3 platos nuevos, 2
 * precios distintos: ¿seguro?»— llega con los platos, en M10 (0049).
 */

/** Lo que se deja: doce páginas. Una carta de verdad tiene dos, cuatro, seis. */
export const PAGINAS_DE_LA_CARTA = 12;

const base64QueCabe = z
  .string()
  .min(1)
  .max(Math.ceil((TOPE_DE_LA_PAGINA * 4) / 3) + 1024);

export const entradaSubirPagina = z
  .object({
    /** La marca de la subida: la misma para todas las páginas de una carta. */
    subida: z.number().int().positive(),
    /** Qué página es, desde la 1. */
    pagina: z.number().int().min(1).max(PAGINAS_DE_LA_CARTA),
    tipo: z.string().refine((t) => t in TIPOS_DE_PAGINA, {
      message: 'Solo se admiten páginas en WebP o JPG.',
    }),
    /** La página ya pasada a imagen, en base64 y sin el prefijo `data:`. */
    contenido: base64QueCabe,
  })
  .strict();

export type EntradaSubirPagina = z.infer<typeof entradaSubirPagina>;

export const subirPaginaDeLaCarta = comando<EntradaSubirPagina, { clave: string }>({
  nombre: 'subir_pagina_de_la_carta',
  entrada: entradaSubirPagina,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const almacen = contexto.almacen;
    if (almacen === null) {
      throw new FalloDeAplicacion('fallo_nuestro', {
        porque: 'Todavía no hay dónde guardar la carta. El QR sigue enseñando lo de siempre.',
      });
    }

    const bytes = decodificar(entrada.contenido, 'contenido');
    if (bytes.byteLength > TOPE_DE_LA_PAGINA) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['contenido'],
        porque: `Esa página pesa demasiado aun reducida. El tope son ${String(Math.trunc(TOPE_DE_LA_PAGINA / 1024))} KB por página.`,
      });
    }
    if (!esDeVerdadDeEseTipo(bytes, entrada.tipo)) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['contenido'],
        porque: 'Eso no es una página que se pueda guardar. Prueba con el PDF o con otra foto.',
      });
    }

    const clave = claveDeLaPagina(
      localId,
      entrada.subida,
      entrada.pagina,
      TIPOS_DE_PAGINA[entrada.tipo] ?? 'jpg',
    );
    await almacen.guardar(clave, bytes, entrada.tipo);
    return { clave };
  },
});

export const entradaPublicarLaCarta = z
  .object({
    /** Las claves de las páginas, en su orden, tal como las devolvió la subida. */
    paginas: z.array(z.string().min(1).max(200)).min(1).max(PAGINAS_DE_LA_CARTA),
  })
  .strict();

export type EntradaPublicarLaCarta = z.infer<typeof entradaPublicarLaCarta>;

export const publicarLaCarta = comando<EntradaPublicarLaCarta, { paginas: number }>({
  nombre: 'publicar_la_carta',
  entrada: entradaPublicarLaCarta,
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    // Solo páginas de la carta de **este** local: quien llame a la API a pelo no
    // puede publicar como carta suya el logo de otro, ni una foto de producto.
    if (!entrada.paginas.every((clave) => esDeLaCartaDe(clave, localId))) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['paginas'],
        porque: 'Alguna de esas páginas no es de la carta de este local. Vuelve a subirla.',
      });
    }

    const antes = await contexto.sql<{ carta_paginas: string[] | null }[]>`
      select carta_paginas from estook.local where id = ${localId} for update
    `;
    if (antes.length === 0) {
      throw new FalloDeAplicacion('sin_permiso', {
        porque: 'Tu acceso no deja cambiar la carta de este local.',
      });
    }

    await contexto.sql`
      update estook.local
         set carta_paginas = ${comoLista(entrada.paginas)}::text::text[], carta_subida_en = now()
       where id = ${localId}
    `;

    // Lo de antes se borra al final, cuando ya no lo nombra nadie.
    const viejas = (antes[0]?.carta_paginas ?? []).filter((c) => !entrada.paginas.includes(c));
    if (contexto.almacen !== null) {
      for (const clave of viejas) await contexto.almacen.borrar(clave).catch(() => undefined);
    }

    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'cambiar', 'carta', ${localId}, ${localId}::uuid,
        ${JSON.stringify({ paginas: antes[0]?.carta_paginas?.length ?? 0 })}::text::jsonb,
        ${JSON.stringify({ paginas: entrada.paginas.length })}::text::jsonb,
        null
      )
    `;

    return { paginas: entrada.paginas.length };
  },
});

export const quitarLaCarta = comando<Record<string, never>, { quitada: boolean }>({
  nombre: 'quitar_la_carta',
  entrada: z.object({}).strict(),
  exige: 'app.carta',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const organizacionId = laOrganizacionDeLaSesion(contexto);

    const antes = await contexto.sql<{ carta_paginas: string[] | null }[]>`
      select carta_paginas from estook.local where id = ${localId} for update
    `;
    const paginas = antes[0]?.carta_paginas ?? null;
    if (paginas === null) return { quitada: false };

    await contexto.sql`
      update estook.local set carta_paginas = null, carta_subida_en = null where id = ${localId}
    `;
    if (contexto.almacen !== null) {
      for (const clave of paginas) await contexto.almacen.borrar(clave).catch(() => undefined);
    }
    await contexto.sql`
      select estook.anotar(
        ${organizacionId}::uuid, 'borrar', 'carta', ${localId}, ${localId}::uuid,
        ${JSON.stringify({ paginas: paginas.length })}::text::jsonb, null, null
      )
    `;
    return { quitada: true };
  },
});
