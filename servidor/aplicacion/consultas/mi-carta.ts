import { z } from 'zod';
import { alergenosDeLaReceta, type CanalDeVenta } from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { firmarLasFotos, laFirmada } from '../fotos-firmadas.ts';
import { losCanalesDelLocal, type UnCanal } from '../canales-del-local.ts';
import { elLibroDelLocal, elVinculado, laRacionDelVinculo, type ElLibro } from '../escandallos.ts';
import { losAgotadosDelLocal, type ElAgotado } from '../agotados.ts';

export { losCanalesDelLocal };
export type { UnCanal };

/**
 * Tu carta (M9 · 1, decisión 0086): las secciones, los platos y los canales.
 *
 * El plato es uno solo y **la Carta es la dueña de lo que se vende y a cuánto**: su
 * sección, su descripción, su foto, su precio de sala y su precio en cada canal.
 * La lee quien tiene Carta (el camarero también: la necesita para contestar en
 * sala); **las comisiones y los envases, solo quien la edita**, que es quien los pone.
 */

export interface UnaSeccion {
  readonly id: string;
  readonly nombre: string;
  readonly orden: number;
  /** De bebidas (0106): sale en la pestaña Bebidas de Estook TPV y va a la barra. */
  readonly esBebida: boolean;
}

export interface UnPlato {
  readonly id: string;
  readonly seccionId: string | null;
  readonly nombre: string;
  readonly descripcion: string | null;
  /** El de sala, con IVA. */
  readonly precioCentimos: number | null;
  /** Los que tiene puestos a mano en otros canales; sin uno, vale el de sala. */
  readonly precios: Readonly<Partial<Record<CanalDeVenta, number>>>;
  readonly foto: string | null;
  readonly miniatura: string | null;
  readonly orden: number;
  readonly activo: boolean;
  readonly version: number;
  /** Cuántas lleva la ración, para el cliente («8 croquetas»), si se dice (0087). */
  readonly unidadesPorRacion: number | null;
  /** Los puestos a mano en la carta. */
  readonly alergenos: readonly string[];
  /** Los que trae su receta, sumados de sus ingredientes: no se pueden quitar desde aquí. */
  readonly alergenosDeLaReceta: readonly string[];
  /** De 0 (nada) a 3 guindillas. */
  readonly picante: number;
  /** Vegetariano, vegano. */
  readonly distintivos: readonly string[];
  /**
   * Si se vende tal cual un producto del Almacén (la lata, el entrecot): cuál, y lo que
   * lleva la ración cuando no es una unidad («300 g»).
   */
  readonly vinculadoA: {
    readonly id: string;
    readonly nombre: string;
    readonly racion: string | null;
  } | null;
  /** Si ya está desgranado en Escandallos. */
  readonly tieneFicha: boolean;
  /** Si está agotado ahora, hasta cuándo y quién lo marcó (M10 · 1, 0102). */
  readonly agotado: ElAgotado | null;
  /** Falso si nació en un menú y no sale en la carta (M10 · 2, 0104). */
  readonly enLaCarta: boolean;
}

/** «Entrecot de ternera · 300 g», o solo el nombre si es una unidad. */
export function comoSeLeeElVinculo(vinculo: UnPlato['vinculadoA']): string | null {
  if (vinculo === null) return null;
  return vinculo.racion === null ? vinculo.nombre : `${vinculo.nombre} · ${vinculo.racion}`;
}

export interface MiCarta {
  readonly puedeEditar: boolean;
  readonly canales: readonly UnCanal[];
  readonly secciones: readonly UnaSeccion[];
  /** Todos, también los archivados (`activo: false`), que se ven aparte. */
  readonly platos: readonly UnPlato[];
}

export async function puedeEditarLaCarta(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_editar('app.carta', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

export function elLocalDeLaCarta(contexto: Contexto): string {
  const localId = contexto.sesion?.localId ?? null;
  if (localId === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'La carta es de un local: elige uno primero.',
    });
  }
  return localId;
}

interface FilaDePlato {
  id: string;
  seccion_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio_centimos: number | null;
  foto_clave: string | null;
  miniatura_clave: string | null;
  orden: number;
  activo: boolean;
  version: number;
  precios: Record<string, number> | null;
  unidades_por_racion: number | null;
  alergenos: string[];
  picante: number;
  distintivos: string[];
  en_la_carta: boolean;
}

/**
 * Los platos del local, con lo que su receta dice de ellos: si está desgranado, si se
 * vende tal cual un producto y los alérgenos que trae (0087). `libro` se pasa si ya se
 * ha leído (Escandallos lo lee con costes); si no, se lee aquí, sin ellos.
 */
export async function losPlatos(
  contexto: Contexto,
  localId: string,
  soloEste: string | null = null,
  libro?: ElLibro,
): Promise<readonly UnPlato[]> {
  const [filas, elLibro, agotados] = await Promise.all([
    contexto.sql<FilaDePlato[]>`
      select p.id, p.seccion_id, p.nombre, p.descripcion, p.precio_centimos,
             p.foto_clave, p.miniatura_clave, p.orden, p.activo, p.version,
             p.unidades_por_racion, p.alergenos, p.picante, p.distintivos, p.en_la_carta,
             (select jsonb_object_agg(pp.canal::text, pp.precio_centimos)
                from estook.precio_de_plato pp where pp.plato_id = p.id) as precios
        from estook.plato p
       where p.local_id = ${localId}::uuid
         and (${soloEste}::uuid is null or p.id = ${soloEste}::uuid)
       order by p.orden, p.nombre
    `,
    libro === undefined ? elLibroDelLocal(contexto, localId, false) : Promise.resolve(libro),
    losAgotadosDelLocal(contexto, localId),
  ]);
  const firmadas = await firmarLasFotos(
    contexto,
    filas.flatMap((f) => [f.foto_clave, f.miniatura_clave]),
  );
  return filas.map((f) => {
    const receta = elLibro.recetaDelPlato.get(f.id);
    const vinculado = elVinculado(receta);
    return {
      id: f.id,
      seccionId: f.seccion_id,
      nombre: f.nombre,
      descripcion: f.descripcion,
      precioCentimos: f.precio_centimos,
      precios: f.precios ?? {},
      foto: laFirmada(firmadas, f.foto_clave),
      miniatura: laFirmada(firmadas, f.miniatura_clave),
      orden: f.orden,
      activo: f.activo,
      version: f.version,
      unidadesPorRacion: f.unidades_por_racion,
      alergenos: f.alergenos,
      alergenosDeLaReceta: [...alergenosDeLaReceta(receta?.lineas ?? [], elLibro.libro)],
      picante: f.picante,
      distintivos: f.distintivos,
      vinculadoA:
        vinculado === null
          ? null
          : {
              id: vinculado.productoId,
              nombre: elLibro.productos.get(vinculado.productoId)?.nombre ?? 'Producto',
              racion: laRacionDelVinculo(vinculado),
            },
      tieneFicha: (receta?.lineas.length ?? 0) > 0,
      agotado: agotados.get(f.id) ?? null,
      enLaCarta: f.en_la_carta,
    };
  });
}

export const miCarta = consulta<Record<string, never>, MiCarta>({
  nombre: 'mi_carta',
  entrada: z.object({}).strict(),
  exige: 'app.carta',

  async ejecutar(contexto) {
    const localId = elLocalDeLaCarta(contexto);
    const puedeEditar = await puedeEditarLaCarta(contexto, localId);
    const [canales, secciones, platos] = await Promise.all([
      losCanalesDelLocal(contexto, localId, puedeEditar),
      contexto.sql<{ id: string; nombre: string; orden: number; es_bebida: boolean }[]>`
        select id, nombre, orden, es_bebida from estook.seccion_de_carta
         where local_id = ${localId}::uuid
         order by orden, nombre
      `,
      losPlatos(contexto, localId),
    ]);
    return {
      puedeEditar,
      canales,
      secciones: secciones.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        orden: s.orden,
        esBebida: s.es_bebida,
      })),
      platos,
    };
  },
});

// ── Un plato, con su historial ───────────────────────────────────────────────

export interface UnCambio {
  readonly cuando: string;
  readonly quien: string | null;
  readonly que: string;
  readonly antes: Record<string, unknown> | null;
  readonly despues: Record<string, unknown> | null;
}

export interface ElPlato {
  readonly plato: UnPlato;
  readonly puedeEditar: boolean;
  /** Lo último que se le ha cambiado, de lo más nuevo a lo más viejo (la auditoría). */
  readonly historial: readonly UnCambio[];
}

/** Las líneas del historial que se enseñan: las del plato, las treinta últimas. */
const LINEAS_DEL_HISTORIAL = 30;

export const unPlato = consulta<{ plato_id: string }, ElPlato>({
  nombre: 'un_plato',
  entrada: z.object({ plato_id: z.string().uuid() }).strict(),
  exige: 'app.carta',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaCarta(contexto);
    const [plato] = await losPlatos(contexto, localId, entrada.plato_id);
    if (plato === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese plato no está en la carta de este local.',
      });
    }
    const puedeEditar = await puedeEditarLaCarta(contexto, localId);
    const historial = await contexto.sql<
      {
        cuando: string;
        quien: string | null;
        accion: string;
        antes: Record<string, unknown> | null;
        despues: Record<string, unknown> | null;
      }[]
    >`
      select to_char(a.ocurrido_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando,
             p.nombre as quien, a.accion, a.antes, a.despues
        from estook.auditoria a
        left join estook.persona p on p.id = a.persona_id
       where a.entidad = 'plato' and a.entidad_id = ${entrada.plato_id}
         and a.local_id = ${localId}::uuid
       order by a.ocurrido_en desc, a.id desc
       limit ${LINEAS_DEL_HISTORIAL}
    `;
    return {
      plato,
      puedeEditar,
      historial: historial.map((h) => ({
        cuando: h.cuando,
        quien: h.quien,
        que: h.accion,
        antes: h.antes,
        despues: h.despues,
      })),
    };
  },
});
