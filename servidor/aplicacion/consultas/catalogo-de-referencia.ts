import { z } from 'zod';
import { comoSaleElCoste, type Alergeno, type UnidadDeUso } from '@estook/dominio';
import { consulta } from '../contrato.ts';

/**
 * El catálogo de referencia (M5).
 *
 * «Al crear un producto, el buscador consulta un catálogo de referencia de unos
 *  250 productos habituales de hostelería española. Escribes "aceite de oliva" y
 *  salen las variantes con su unidad de compra, su factor, su rendimiento
 *  aproximado, su categoría y sus alérgenos ya puestos» (Manifiesto 8).
 *
 * ── Lo que esta consulta NO hace, y es lo importante ─────────────────────────
 *
 * **No crea nada.** Devuelve una propuesta rellenada, y quien decide es una
 * persona: «Estook no mete nada en tu inventario. Te lo rellena cuando tú se lo
 * pides». Copiar una referencia a un producto de verdad es M6, y será un comando
 * suyo.
 *
 * ── Por qué no entra en el buscador universal ────────────────────────────────
 *
 * Porque el buscador de la barra busca **cosas tuyas**: tus locales, tu gente y,
 * desde M6, tus productos. Una referencia no es de nadie. Meterla ahí haría que
 * escribir «aceite» devolviera trescientas filas que no están en tu cámara, justo
 * cuando lo que buscabas era el tuyo.
 *
 * Se busca desde donde tiene sentido: la pantalla de crear un producto.
 */

export interface ProductoDeReferencia {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly categoria: string;
  readonly formato: string;
  readonly factor: number;
  readonly unidadDeUso: UnidadDeUso;
  readonly rendimiento: number;
  readonly categoriaFiscal: string;
  readonly alergenos: readonly Alergeno[];
  /**
   * La cuenta explicada: «Garrafa de 5 l = 5.000 ml para usar».
   *
   * Viene hecha del servidor y no se compone en la pantalla porque es **la razón
   * de que este catálogo exista**: «confundir la unidad de compra con la unidad
   * de uso es la primera causa de escandallos falsos» (Auditoría 1.2). Un cálculo,
   * un único dueño.
   */
  readonly comoSale: string;
}

export const entradaCatalogo = z
  .object({
    /** Lo escrito. Vacío = las primeras de cada categoría, para poder ojear. */
    texto: z.string().trim().max(80).optional(),
    categoria: z.string().trim().max(80).optional(),
    limite: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();

export type EntradaCatalogo = z.infer<typeof entradaCatalogo>;

export interface SalidaCatalogo {
  readonly productos: readonly ProductoDeReferencia[];
  /** Las categorías, con cuántos hay en cada una, para ojear sin escribir. */
  readonly categorias: readonly { readonly nombre: string; readonly cuantos: number }[];
}

export const catalogoDeReferencia = consulta<EntradaCatalogo, SalidaCatalogo>({
  nombre: 'catalogo_de_referencia',
  entrada: entradaCatalogo,
  // Sin `exige`: es un diccionario, no un dato de nadie. Con estar dentro basta,
  // y las políticas de la tabla ya dicen que se lee y no se escribe.

  async ejecutar(contexto, entrada) {
    const busca = entrada.texto ?? '';

    // «Toda lista larga tiene buscador tolerante a erratas y sin acentos»
    // (Auditoría, parte 8). Lo resuelve Postgres con el mismo `pg_trgm` y el
    // mismo `sin_acentos` que el buscador universal: son trescientas filas con
    // su índice, y traérselas al servidor para filtrarlas sería peor.
    //
    // El umbral es el 0,18 de la migración 0017, no el 0,3 del buscador de
    // acciones: aquí una fila de más en una lista de veinte no molesta, y quien
    // escribe «aove» tiene que encontrar el aceite.
    const productos = await contexto.sql<
      {
        id: string;
        codigo: string;
        nombre: string;
        categoria: string;
        formato: string;
        factor: string;
        unidad_de_uso: string;
        rendimiento: string;
        categoria_fiscal: string;
        alergenos: string[];
      }[]
    >`
      select id, codigo, nombre, categoria, formato,
             factor::text as factor, unidad_de_uso::text as unidad_de_uso,
             rendimiento::text as rendimiento,
             categoria_fiscal::text as categoria_fiscal, alergenos
        from estook.producto_de_referencia
       where (${entrada.categoria ?? null}::text is null or categoria = ${entrada.categoria ?? null})
         and (
           ${busca} = ''
           or estook.sin_acentos(nombre) like '%' || estook.sin_acentos(${busca}) || '%'
           or similarity(estook.sin_acentos(nombre), estook.sin_acentos(${busca})) > 0.18
           or exists (
             select 1 from unnest(sinonimos) s
              where estook.sin_acentos(s) like '%' || estook.sin_acentos(${busca}) || '%'
           )
         )
       order by
         -- Lo que contiene lo escrito, primero; después lo que se le parece.
         case when ${busca} <> ''
                and estook.sin_acentos(nombre) like '%' || estook.sin_acentos(${busca}) || '%'
              then 0 else 1 end,
         case when ${busca} = '' then 0
              else 1 - similarity(estook.sin_acentos(nombre), estook.sin_acentos(${busca})) end,
         nombre
       limit ${entrada.limite ?? 20}
    `;

    const categorias = await contexto.sql<{ categoria: string; cuantos: number }[]>`
      select categoria, count(*)::int as cuantos
        from estook.producto_de_referencia
       group by categoria
       order by categoria
    `;

    return {
      productos: productos.map((p) => {
        const factor = Number(p.factor);
        const rendimiento = Number(p.rendimiento);
        const unidadDeUso = p.unidad_de_uso as UnidadDeUso;

        return {
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          formato: p.formato,
          factor,
          unidadDeUso,
          rendimiento,
          categoriaFiscal: p.categoria_fiscal,
          alergenos: p.alergenos as Alergeno[],
          comoSale: comoSaleElCoste({ formato: p.formato, factor, unidadDeUso, rendimiento }),
        };
      }),
      categorias: categorias.map((c) => ({ nombre: c.categoria, cuantos: c.cuantos })),
    };
  },
});

// ── Las recetas de referencia ────────────────────────────────────────────────

export interface RecetaDeReferencia {
  readonly id: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly categoria: string;
  readonly raciones: number;
  readonly elaboracion: string | null;
  readonly lineas: readonly {
    readonly producto: string;
    readonly cantidad: number;
    readonly unidad: UnidadDeUso;
  }[];
}

export const recetasDeReferencia = consulta<
  { texto?: string | undefined },
  { readonly recetas: readonly RecetaDeReferencia[] }
>({
  nombre: 'recetas_de_referencia',
  entrada: z.object({ texto: z.string().trim().max(80).optional() }).strict(),

  async ejecutar(contexto, entrada) {
    const recetas = await contexto.sql<
      {
        id: string;
        codigo: string;
        nombre: string;
        categoria: string;
        raciones: number;
        elaboracion: string | null;
      }[]
    >`
      select id, codigo, nombre, categoria, raciones, elaboracion
        from estook.receta_de_referencia
       where ${entrada.texto ?? ''} = ''
          or estook.sin_acentos(nombre) like '%' || estook.sin_acentos(${entrada.texto ?? ''}) || '%'
          or similarity(estook.sin_acentos(nombre), estook.sin_acentos(${entrada.texto ?? ''})) > 0.18
       order by categoria, nombre
       limit 20
    `;

    // Las líneas de todas de una vez: diez recetas con seis líneas cada una es
    // una consulta, no diez. Es la misma razón por la que `quien_soy` no son
    // cuatro llamadas.
    const ids = recetas.map((r) => r.id);
    const lineas =
      ids.length === 0
        ? []
        : await contexto.sql<
            { receta_id: string; producto: string; cantidad: string; unidad: string }[]
          >`
            select l.receta_id, p.nombre as producto,
                   l.cantidad::text as cantidad, p.unidad_de_uso::text as unidad
              from estook.linea_de_receta_de_referencia l
              join estook.producto_de_referencia p on p.id = l.producto_de_referencia_id
             where l.receta_id = any(${ids}::uuid[])
             order by l.receta_id, l.orden
          `;

    return {
      recetas: recetas.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        categoria: r.categoria,
        raciones: r.raciones,
        elaboracion: r.elaboracion,
        lineas: lineas
          .filter((l) => l.receta_id === r.id)
          .map((l) => ({
            producto: l.producto,
            cantidad: Number(l.cantidad),
            unidad: l.unidad as UnidadDeUso,
          })),
      })),
    };
  },
});
