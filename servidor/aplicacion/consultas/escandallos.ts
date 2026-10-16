import { z } from 'zod';
import {
  DESVIACION_DE_LOS_PLATOS_A_LA_VISTA,
  NOMBRE_DEL_ALERGENO,
  ALERGENOS,
  aCentimos,
  alergenosDeLaReceta,
  comoPrecioPorUnidad,
  comoSeLeeLaCantidad,
  costeDeLaReceta,
  costePorUnidadDeLaElaboracion,
  desviacionDeLosPlatos,
  enMilesimasEnteras,
  loQueDebiaGastarse,
  mediaEnPuntos,
  parteDelCoste,
  type Alergeno,
  type CanalDeVenta,
  type FechaOperativa,
  type Semaforo,
  type UnidadDeUso,
  type VendidoConSuReceta,
} from '@estook/dominio';
import { documentoDeLaFicha } from '@estook/documentos';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { loQuePuede } from '../lo-que-puede.ts';
import { hacerElPdf, hechoEl, laMarcaDelLocal, type UnPdf } from '../documentos.ts';
import {
  elEscandalloDe,
  elLibroDelLocal,
  elLocalDeEscandallos,
  lineasDeLoGuardado,
  loDeLaCuenta,
  type ElLibro,
  type RecetaGuardada,
} from '../escandallos.ts';
import { comoSeLeeElVinculo, losPlatos, type UnPlato } from './mi-carta.ts';
import { firmarLasFotos, laFirmada } from '../fotos-firmadas.ts';
import { elRelojYElFisco, loGastadoDeVerdad } from '../desviacion.ts';

/**
 * Escandallos (M9 · 2, decisiones 0086 y 0087): las fichas y lo que cuesta cada plato.
 *
 *   mis_fichas                 los platos y las elaboraciones, con «sin ficha» y, a quien
 *                              ve costes, su food cost y si pierden dinero en algún canal.
 *   una_ficha                  lo que lleva un plato o una elaboración y cómo se hace; su
 *                              escandallo a quien ve costes; y su historial.
 *   lo_que_puede_llevar        los productos y las elaboraciones para escribir una receta.
 *   la_ficha_en_pdf            la ficha en papel, **sin euros**.
 *   la_desviacion_de_los_platos  lo que se debía gastar según lo vendido frente a lo
 *                              gastado; construida y **a la vista con Estook TPV** (0086, 3B).
 *
 * **Los importes no viajan** a quien no tiene `dato.coste_de_plato` (Plan, regla 7): el
 * libro se lee sin costes y los campos de dinero ni se escriben en la respuesta.
 */

async function conCostes(contexto: Contexto, localId: string) {
  const puede = await loQuePuede(contexto, localId, [
    'app.escandallos',
    'dato.coste_de_plato',
    'app.carta',
    'app.almacen',
  ]);
  return {
    costes: puede.ver('dato.coste_de_plato'),
    editar: puede.editar('app.escandallos'),
    carta: puede.ver('app.carta'),
    almacen: puede.ver('app.almacen'),
  };
}

function enOrdenOficial(todos: Iterable<string>): Alergeno[] {
  const set = new Set(todos);
  return ALERGENOS.filter((a) => set.has(a));
}

// ═══ La lista ═════════════════════════════════════════════════════════════════

export interface CosteEnLaLista {
  readonly costeCentimos: number | null;
  readonly faltanPrecios: number;
  readonly foodCost: number | null;
  readonly semaforo: Semaforo;
  /** Los canales donde, al precio de hoy, se pierde dinero. */
  readonly pierdeEn: readonly string[];
}

export interface PlatoEnLaLista {
  readonly id: string;
  readonly nombre: string;
  readonly seccionId: string | null;
  readonly miniatura: string | null;
  /** Si tiene su escandallo: lo que lleva (0087 lo llamaba «ficha»). */
  readonly tieneFicha: boolean;
  /** Si tiene su ficha técnica: los pasos para hacerlo (0090). */
  readonly tieneFichaTecnica: boolean;
  /** Cuántos pasos lleva, y cuántos con foto. */
  readonly pasos: number;
  readonly vinculadoA: string | null;
  readonly alergenos: readonly Alergeno[];
  readonly picante: number;
  /** Solo con `dato.coste_de_plato`. */
  readonly coste?: CosteEnLaLista;
}

export interface ElaboracionEnLaLista {
  readonly id: string;
  readonly nombre: string;
  /** «2 l». */
  readonly rinde: string;
  readonly ingredientes: number;
  /** En cuántas recetas entra. */
  readonly usadaEn: number;
  readonly activo: boolean;
  readonly alergenos: readonly Alergeno[];
  /** «3,20 €/l». Solo con `dato.coste_de_plato`. */
  readonly costePorUnidad?: string | null;
}

export interface MisFichas {
  readonly puedeEditar: boolean;
  readonly conImportes: boolean;
  /** El objetivo de food cost del local, en fracción (0,30). Solo con costes. */
  readonly objetivo?: number | null;
  readonly secciones: readonly { readonly id: string; readonly nombre: string }[];
  readonly platos: readonly PlatoEnLaLista[];
  readonly elaboraciones: readonly ElaboracionEnLaLista[];
  readonly cifras: {
    readonly platos: number;
    readonly sinFicha: number;
    /** Los que tienen su ficha técnica (0090). */
    readonly conFichaTecnica: number;
    /** Solo con costes: los que pasan del objetivo (ámbar o rojo), los que pierden en algún canal y la media. */
    readonly bajoObjetivo?: number;
    readonly pierden?: number;
    readonly foodCostMedio?: number | null;
  };
}

function cuantasVecesSeUsa(libro: ElLibro, elaboracionId: string): number {
  let veces = 0;
  for (const r of [...libro.recetaDelPlato.values(), ...libro.recetaDeLaElaboracion.values()]) {
    if (r.lineas.some((l) => l.elaboracionId === elaboracionId)) veces += 1;
  }
  return veces;
}

export const misFichas = consulta<Record<string, never>, MisFichas>({
  nombre: 'mis_fichas',
  entrada: z.object({}).strict(),
  exige: 'app.escandallos',

  async ejecutar(contexto) {
    const localId = elLocalDeEscandallos(contexto);
    const puede = await conCostes(contexto, localId);
    const libro = await elLibroDelLocal(contexto, localId, puede.costes);
    const [platos, secciones, cuenta] = await Promise.all([
      losPlatos(contexto, localId, null, libro),
      contexto.sql<{ id: string; nombre: string }[]>`
        select id, nombre from estook.seccion_de_carta
         where local_id = ${localId}::uuid order by orden, nombre
      `,
      puede.costes ? loDeLaCuenta(contexto, localId) : Promise.resolve(null),
    ]);

    const activos = platos.filter((p) => p.activo);
    const enLaLista = activos.map((p): PlatoEnLaLista => {
      const receta = libro.recetaDelPlato.get(p.id);
      const base: PlatoEnLaLista = {
        id: p.id,
        nombre: p.nombre,
        seccionId: p.seccionId,
        miniatura: p.miniatura,
        tieneFicha: p.tieneFicha,
        tieneFichaTecnica: (receta?.pasos.length ?? 0) > 0,
        pasos: receta?.pasos.length ?? 0,
        vinculadoA: comoSeLeeElVinculo(p.vinculadoA),
        alergenos: enOrdenOficial([...p.alergenosDeLaReceta, ...p.alergenos]),
        picante: p.picante,
      };
      if (cuenta === null) return base;
      const escandallo = elEscandalloDe(receta, p, libro.libro, cuenta);
      return {
        ...base,
        coste: {
          costeCentimos: escandallo.costeCentimos,
          faltanPrecios: escandallo.faltanPrecios,
          foodCost: escandallo.foodCost,
          semaforo: escandallo.semaforo,
          pierdeEn: escandallo.canales.filter((c) => c.pierde).map((c) => c.nombre),
        },
      };
    });

    const elaboraciones = [...libro.elaboraciones.values()].map((e): ElaboracionEnLaLista => {
      const receta = libro.recetaDeLaElaboracion.get(e.id);
      const base: ElaboracionEnLaLista = {
        id: e.id,
        nombre: e.nombre,
        rinde: comoSeLeeLaCantidad(e.rindeCantidad, e.rindeUnidad),
        ingredientes: receta?.lineas.length ?? 0,
        usadaEn: cuantasVecesSeUsa(libro, e.id),
        activo: e.activo,
        alergenos: enOrdenOficial(alergenosDeLaReceta(receta?.lineas ?? [], libro.libro)),
      };
      if (!puede.costes) return base;
      const porUnidad = costePorUnidadDeLaElaboracion(e.id, libro.libro).milesimas;
      return {
        ...base,
        costePorUnidad:
          porUnidad === null || (receta?.lineas.length ?? 0) === 0
            ? null
            : comoPrecioPorUnidad(enMilesimasEnteras(porUnidad) as never, e.rindeUnidad),
      };
    });

    const conFoodCost = enLaLista.flatMap((p) =>
      p.coste?.foodCost === null || p.coste === undefined ? [] : [p.coste.foodCost],
    );
    return {
      puedeEditar: puede.editar,
      conImportes: puede.costes,
      ...(cuenta === null ? {} : { objetivo: cuenta.objetivo }),
      secciones,
      platos: enLaLista,
      elaboraciones,
      cifras: {
        platos: enLaLista.length,
        sinFicha: enLaLista.filter((p) => !p.tieneFicha).length,
        conFichaTecnica: enLaLista.filter((p) => p.tieneFichaTecnica).length,
        ...(cuenta === null
          ? {}
          : {
              bajoObjetivo: enLaLista.filter(
                (p) => p.coste?.semaforo === 'rojo' || p.coste?.semaforo === 'ambar',
              ).length,
              pierden: enLaLista.filter((p) => (p.coste?.pierdeEn.length ?? 0) > 0).length,
              foodCostMedio: mediaEnPuntos(conFoodCost),
            }),
      },
    };
  },
});

// ═══ Una ficha ════════════════════════════════════════════════════════════════

export interface LineaDeLaFicha {
  readonly id: string;
  readonly tipo: 'producto' | 'elaboracion';
  /** El producto o la elaboración. */
  readonly refId: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  /** La unidad en que se lleva lo que es: la del producto, o en la que rinde la elaboración. */
  readonly suUnidad: UnidadDeUso;
  readonly nota: string | null;
  readonly alergenos: readonly Alergeno[];
  /** Solo con costes. */
  readonly costeCentimos?: number | null;
  readonly parte?: number | null;
  /** «7,50 €/kg». */
  readonly costePorUnidad?: string | null;
}

export interface CambioDeLaReceta {
  readonly id: string;
  readonly version: number;
  readonly cuando: string;
  readonly quien: string | null;
  readonly cambios: readonly string[];
  /** La receta tal cual quedó, para verla y recuperarla. Sin un euro. */
  readonly receta: RecetaGuardada;
}

export interface MargenDeLaFicha {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  readonly precioCentimos: number | null;
  readonly igualQueSala: boolean;
  readonly seLlevaCentimos: number;
  readonly margenCentimos: number | null;
  readonly margenPuntos: number | null;
  readonly pierde: boolean;
}

export interface EscandalloDeLaFicha {
  readonly costeCentimos: number | null;
  readonly faltanPrecios: number;
  readonly precioCentimos: number | null;
  readonly precioSinIvaCentimos: number | null;
  readonly iva: number | null;
  readonly foodCost: number | null;
  readonly objetivo: number | null;
  readonly semaforo: Semaforo;
  readonly precioRecomendadoCentimos: number | null;
  readonly canales: readonly MargenDeLaFicha[];
}

export interface UnaFicha {
  readonly tipo: 'plato' | 'elaboracion';
  readonly id: string;
  readonly nombre: string;
  readonly activo: boolean;
  readonly foto: string | null;
  readonly miniatura: string | null;
  /** «Entrantes», o nulo. */
  readonly seccion: string | null;
  readonly descripcion: string | null;
  /** Solo de una elaboración: lo que sale de hacerla una vez. */
  readonly rinde: { readonly cantidad: number; readonly unidad: UnidadDeUso } | null;
  /** Dónde entra una elaboración. */
  readonly usadaEn: readonly {
    readonly tipo: 'plato' | 'elaboracion';
    readonly id: string;
    readonly nombre: string;
  }[];
  readonly unidadesPorRacion: number | null;
  readonly picante: number;
  readonly distintivos: readonly string[];
  readonly vinculadoA: string | null;
  readonly receta: {
    /** 0 si todavía no tiene. */
    readonly version: number;
    readonly lineas: readonly LineaDeLaFicha[];
    readonly pasos: readonly string[];
    /** La foto de cada paso, ya firmada, o nula (0090). */
    readonly fotosDeLosPasos: readonly (string | null)[];
    readonly notas: string | null;
    readonly minutos: number | null;
  };
  /** Los de la receta y los puestos a mano en la carta, en el orden oficial. */
  readonly alergenos: readonly Alergeno[];
  readonly alergenosDeLaCarta: readonly Alergeno[];
  readonly puedeEditar: boolean;
  /** Si quien mira puede abrir el plato en la Carta (para ir a ponerle precio). */
  readonly puedeAbrirLaCarta: boolean;
  readonly escandallo?: EscandalloDeLaFicha;
  readonly historial: readonly CambioDeLaReceta[];
}

const LINEAS_DEL_HISTORIAL = 20;

async function elHistorial(
  contexto: Contexto,
  recetaId: string | undefined,
): Promise<CambioDeLaReceta[]> {
  if (recetaId === undefined) return [];
  const filas = await contexto.sql<
    {
      id: string;
      version: number;
      cuando: string;
      quien: string | null;
      cambios: string[];
      contenido: RecetaGuardada;
    }[]
  >`
    select g.id, g.version,
           to_char(g.guardada_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cuando,
           p.nombre as quien, g.cambios, g.contenido
      from estook.receta_guardada g
      left join estook.persona p on p.id = g.persona_id
     where g.receta_id = ${recetaId}::uuid
     order by g.version desc
     limit ${LINEAS_DEL_HISTORIAL}
  `;
  return filas.map((f) => ({
    id: f.id,
    version: f.version,
    cuando: f.cuando,
    quien: f.quien,
    cambios: f.cambios,
    receta: f.contenido,
  }));
}

/** Lo que se pide: un plato o una elaboración. */
const entradaDeUnaFicha = z
  .object({
    plato_id: z.string().uuid().optional(),
    elaboracion_id: z.string().uuid().optional(),
  })
  .strict()
  .refine((e) => (e.plato_id === undefined) !== (e.elaboracion_id === undefined), {
    message: 'Una ficha es de un plato o de una elaboración.',
  });

type EntradaDeUnaFicha = z.infer<typeof entradaDeUnaFicha>;

async function laFicha(contexto: Contexto, entrada: EntradaDeUnaFicha): Promise<UnaFicha> {
  const localId = elLocalDeEscandallos(contexto);
  const puede = await conCostes(contexto, localId);
  const libro = await elLibroDelLocal(contexto, localId, puede.costes);

  let plato: UnPlato | undefined;
  let seccion: string | null = null;
  const elaboracion =
    entrada.elaboracion_id === undefined
      ? undefined
      : libro.elaboraciones.get(entrada.elaboracion_id);
  if (entrada.plato_id !== undefined) {
    [plato] = await losPlatos(contexto, localId, entrada.plato_id, libro);
    if (plato?.seccionId != null) {
      const filas = await contexto.sql<{ nombre: string }[]>`
        select nombre from estook.seccion_de_carta where id = ${plato.seccionId}::uuid
      `;
      seccion = filas[0]?.nombre ?? null;
    }
  }
  if (plato === undefined && elaboracion === undefined) {
    throw new FalloDeAplicacion('no_existe', { porque: 'Esa ficha no está en este local.' });
  }

  const receta =
    plato !== undefined
      ? libro.recetaDelPlato.get(plato.id)
      : libro.recetaDeLaElaboracion.get(elaboracion?.id ?? '');
  const lineas = receta?.lineas ?? [];
  const cuenta = puede.costes && plato !== undefined ? await loDeLaCuenta(contexto, localId) : null;
  const escandallo =
    plato !== undefined && cuenta !== null
      ? elEscandalloDe(receta, plato, libro.libro, cuenta)
      : null;
  const lineasDelPlato = escandallo === null ? null : escandallo.lineas;
  const totalMilesimas =
    lineasDelPlato === null
      ? null
      : lineasDelPlato.reduce<number | null>(
          (suma, l) => (suma === null || l.milesimas === null ? null : suma + l.milesimas),
          0,
        );
  // De una elaboración, su coste línea a línea también (sin margen: no se vende).
  const costeDeLaElaboracion =
    elaboracion !== undefined && puede.costes ? costeDeLaReceta(lineas, libro.libro) : null;
  const lineasConCoste = lineasDelPlato ?? costeDeLaElaboracion?.lineas ?? null;
  const total = totalMilesimas ?? costeDeLaElaboracion?.milesimas ?? null;

  const lineasDeLaFicha = lineas.map((l, i): LineaDeLaFicha => {
    const esProducto = l.productoId !== null;
    const refId = (esProducto ? l.productoId : l.elaboracionId) ?? '';
    const producto = esProducto ? libro.productos.get(refId) : undefined;
    const suya = esProducto ? undefined : libro.elaboraciones.get(refId);
    const base: LineaDeLaFicha = {
      id: l.id,
      tipo: esProducto ? 'producto' : 'elaboracion',
      refId,
      nombre: producto?.nombre ?? suya?.nombre ?? '¿?',
      cantidad: l.cantidad,
      unidad: l.unidad,
      suUnidad: producto?.unidad ?? suya?.rindeUnidad ?? l.unidad,
      nota: l.nota,
      alergenos: enOrdenOficial(
        esProducto
          ? (producto?.alergenos ?? [])
          : alergenosDeLaReceta(libro.recetaDeLaElaboracion.get(refId)?.lineas ?? [], libro.libro),
      ),
    };
    if (!puede.costes || lineasConCoste === null) return base;
    const coste = lineasConCoste[i]?.milesimas ?? null;
    const porUnidad = esProducto
      ? (producto?.costeMilesimas ?? null)
      : costePorUnidadDeLaElaboracion(refId, libro.libro).milesimas;
    return {
      ...base,
      costeCentimos: coste === null ? null : aCentimos(coste),
      parte: parteDelCoste(coste, total),
      costePorUnidad:
        porUnidad === null
          ? null
          : comoPrecioPorUnidad(enMilesimasEnteras(porUnidad) as never, base.suUnidad),
    };
  });

  const usadaEn =
    elaboracion === undefined
      ? []
      : [
          ...[...libro.recetaDelPlato.values()]
            .filter((r) => r.lineas.some((l) => l.elaboracionId === elaboracion.id))
            .map((r) => ({ tipo: 'plato' as const, id: r.platoId ?? '', nombre: '' })),
          ...[...libro.recetaDeLaElaboracion.values()]
            .filter((r) => r.lineas.some((l) => l.elaboracionId === elaboracion.id))
            .map((r) => ({
              tipo: 'elaboracion' as const,
              id: r.elaboracionId ?? '',
              nombre: libro.elaboraciones.get(r.elaboracionId ?? '')?.nombre ?? '',
            })),
        ];
  if (usadaEn.some((u) => u.tipo === 'plato')) {
    const nombres = await contexto.sql<{ id: string; nombre: string }[]>`
      select id, nombre from estook.plato where local_id = ${localId}::uuid
    `;
    const nombreDe = new Map(nombres.map((n) => [n.id, n.nombre]));
    for (const u of usadaEn) if (u.tipo === 'plato') u.nombre = nombreDe.get(u.id) ?? '';
  }

  const alergenosDeLaReceta_ = alergenosDeLaReceta(lineas, libro.libro);
  const [historial, firmadas] = await Promise.all([
    elHistorial(contexto, receta?.id),
    firmarLasFotos(
      contexto,
      (receta?.fotosDeLosPasos ?? []).filter((c) => c !== ''),
    ),
  ]);

  return {
    tipo: plato !== undefined ? 'plato' : 'elaboracion',
    id: plato?.id ?? elaboracion?.id ?? '',
    nombre: plato?.nombre ?? elaboracion?.nombre ?? '',
    activo: plato?.activo ?? elaboracion?.activo ?? true,
    foto: plato?.foto ?? null,
    miniatura: plato?.miniatura ?? null,
    seccion,
    descripcion: plato?.descripcion ?? null,
    rinde:
      elaboracion === undefined
        ? null
        : { cantidad: elaboracion.rindeCantidad, unidad: elaboracion.rindeUnidad },
    usadaEn: usadaEn.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    unidadesPorRacion: plato?.unidadesPorRacion ?? null,
    picante: plato?.picante ?? 0,
    distintivos: plato?.distintivos ?? [],
    vinculadoA: plato === undefined ? null : comoSeLeeElVinculo(plato.vinculadoA),
    receta: {
      version: receta?.version ?? 0,
      lineas: lineasDeLaFicha,
      pasos: receta?.pasos ?? [],
      fotosDeLosPasos: (receta?.pasos ?? []).map((_, i) => {
        const clave = receta?.fotosDeLosPasos[i] ?? '';
        return laFirmada(firmadas, clave === '' ? null : clave);
      }),
      notas: receta?.notas ?? null,
      minutos: receta?.minutos ?? null,
    },
    alergenos: enOrdenOficial([...alergenosDeLaReceta_, ...(plato?.alergenos ?? [])]),
    alergenosDeLaCarta: enOrdenOficial(plato?.alergenos ?? []),
    puedeEditar: puede.editar,
    puedeAbrirLaCarta: puede.carta,
    ...(escandallo === null || plato === undefined || cuenta === null
      ? {}
      : {
          escandallo: {
            costeCentimos: (receta?.lineas.length ?? 0) === 0 ? null : escandallo.costeCentimos,
            faltanPrecios: escandallo.faltanPrecios,
            precioCentimos: plato.precioCentimos,
            precioSinIvaCentimos: escandallo.precioSinIvaCentimos,
            iva: cuenta.iva,
            foodCost: escandallo.foodCost,
            objetivo: cuenta.objetivo,
            semaforo: escandallo.semaforo,
            precioRecomendadoCentimos: escandallo.precioRecomendadoCentimos,
            canales: escandallo.canales,
          },
        }),
    historial,
  };
}

export const unaFicha = consulta<EntradaDeUnaFicha, UnaFicha>({
  nombre: 'una_ficha',
  entrada: entradaDeUnaFicha,
  exige: 'app.escandallos',

  async ejecutar(contexto, entrada) {
    return laFicha(contexto, entrada);
  },
});

// ═══ Lo que puede llevar una receta ═══════════════════════════════════════════

export interface LoQuePuedeLlevar {
  readonly productos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly unidad: UnidadDeUso;
    readonly categoria: string | null;
    readonly alergenos: readonly string[];
  }[];
  readonly elaboraciones: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly unidad: UnidadDeUso;
  }[];
}

export const loQuePuedeLlevar = consulta<Record<string, never>, LoQuePuedeLlevar>({
  nombre: 'lo_que_puede_llevar',
  entrada: z.object({}).strict(),
  exige: 'app.escandallos',

  async ejecutar(contexto) {
    const localId = elLocalDeEscandallos(contexto);
    const libro = await elLibroDelLocal(contexto, localId, false);
    return {
      productos: [...libro.productos.values()]
        .filter((p) => p.activo)
        .map((p) => ({
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidad,
          categoria: p.categoria,
          alergenos: p.alergenos,
        })),
      elaboraciones: [...libro.elaboraciones.values()]
        .filter((e) => e.activo)
        .map((e) => ({ id: e.id, nombre: e.nombre, unidad: e.rindeUnidad })),
    };
  },
});

// ═══ La ficha en PDF ══════════════════════════════════════════════════════════

export const laFichaEnPdf = consulta<EntradaDeUnaFicha, UnPdf>({
  nombre: 'la_ficha_en_pdf',
  entrada: entradaDeUnaFicha,
  exige: 'app.escandallos',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeEscandallos(contexto);
    const ficha = await laFicha(contexto, entrada);
    const marca = await laMarcaDelLocal(contexto, localId);
    const html = documentoDeLaFicha({
      marca,
      hechoEl: hechoEl(contexto.ahora, marca.zonaHoraria),
      nombre: ficha.nombre,
      queEs:
        ficha.tipo === 'plato'
          ? `Ficha técnica${ficha.seccion === null ? '' : ` · ${ficha.seccion}`}`
          : `Elaboración${ficha.rinde === null ? '' : ` · rinde ${comoSeLeeLaCantidad(ficha.rinde.cantidad, ficha.rinde.unidad)}`}`,
      foto: ficha.foto,
      minutos: ficha.receta.minutos,
      racion:
        ficha.unidadesPorRacion === null
          ? null
          : `${String(ficha.unidadesPorRacion)} ud por ración`,
      alergenos: ficha.alergenos.map((a) => NOMBRE_DEL_ALERGENO[a]),
      picante: ficha.picante,
      // Solo nombres y cantidades: lo que se pase aquí sale en el papel, y en el papel
      // no va ni un euro (0087).
      ingredientes: ficha.receta.lineas.map((l) => ({
        nombre: l.nombre,
        cantidad: comoSeLeeLaCantidad(l.cantidad, l.unidad),
        nota: l.nota,
        esElaboracion: l.tipo === 'elaboracion',
      })),
      pasos: ficha.receta.pasos,
      fotosDeLosPasos: ficha.receta.fotosDeLosPasos,
      notas: ficha.receta.notas,
    });
    const nombre = ficha.nombre
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return hacerElPdf(contexto, html, {
      nombre: `ficha-${nombre || 'tecnica'}.pdf`,
      pie: `${ficha.nombre} · ${marca.nombreDelLocal}`,
    });
  },
});

// ═══ La desviación de los platos ══════════════════════════════════════════════

export interface DesviacionDeLosPlatos {
  /** Falso hasta que la caja traiga lo vendido plato a plato (Estook TPV, 0086 · 3B). */
  readonly aLaVista: boolean;
  /** Platos vendidos con ficha entre los dos últimos inventarios de cada producto. */
  readonly raciones: number;
  readonly productos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly unidad: string;
    readonly debia: number;
    readonly gastado: number;
    readonly desviacion: number;
    readonly cuadra: boolean;
  }[];
}

/**
 * Lo que se debía gastar según lo vendido y sus fichas, frente a lo gastado de verdad,
 * producto a producto y entre **sus** dos últimos inventarios (como lo de M8). Lo
 * vendido sale de las líneas de la caja que se llaman como un plato (el nombre va
 * normalizado en los dos sitios, 0086 punto 9), y **cada día con la receta que valía
 * ese día** (Manifiesto 13).
 */
export const laDesviacionDeLosPlatos = consulta<Record<string, never>, DesviacionDeLosPlatos>({
  nombre: 'la_desviacion_de_los_platos',
  entrada: z.object({}).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto) {
    const localId = elLocalDeEscandallos(contexto);
    const puede = await loQuePuede(contexto, localId, ['dato.ventas', 'app.escandallos']);
    if (!puede.verTodos(['dato.ventas', 'app.escandallos'])) {
      throw new FalloDeAplicacion('sin_permiso');
    }
    const local = await elRelojYElFisco(contexto, localId);
    const { productos } = await loGastadoDeVerdad(contexto, localId, { conVentas: false });
    if (productos.length === 0) {
      return { aLaVista: DESVIACION_DE_LOS_PLATOS_A_LA_VISTA, raciones: 0, productos: [] };
    }
    const desde = productos.reduce(
      (min, p) => (p.ventasDesde < min ? p.ventasDesde : min),
      '9999-12-31' as FechaOperativa,
    );
    const hasta = productos.reduce(
      (max, p) => (p.ventasHasta > max ? p.ventasHasta : max),
      '0000-01-01' as FechaOperativa,
    );

    // Lo vendido de cada plato cada día, por su nombre en la caja.
    const vendidos = await contexto.sql<{ plato_id: string; fecha: string; unidades: string }[]>`
      select p.id as plato_id, to_char(c.fecha_operativa, 'YYYY-MM-DD') as fecha,
             sum(l.unidades)::text as unidades
        from estook.linea_de_cierre l
        join estook.cierre_de_caja c on c.id = l.cierre_id
        join estook.plato p
          on p.local_id = c.local_id
         and estook.sin_acentos(lower(btrim(p.nombre))) = l.concepto_normalizado
       where c.local_id = ${localId}::uuid
         and c.fecha_operativa between ${desde}::date and ${hasta}::date
       group by p.id, c.fecha_operativa
    `;
    // La receta que valía al cerrar cada día: la última guardada antes de que acabara.
    const guardadas = await contexto.sql<
      {
        plato_id: string | null;
        elaboracion_id: string | null;
        hasta: string;
        contenido: RecetaGuardada;
      }[]
    >`
      select r.plato_id, r.elaboracion_id,
             to_char((g.guardada_en at time zone ${local.zonaHoraria})::date, 'YYYY-MM-DD') as hasta,
             g.contenido
        from estook.receta_guardada g
        join estook.receta r on r.id = g.receta_id
       where g.local_id = ${localId}::uuid
       order by g.guardada_en
    `;
    const laDeEseDia = (dueno: (g: (typeof guardadas)[number]) => boolean, dia: string) => {
      let vale: RecetaGuardada | null = null;
      for (const g of guardadas) if (dueno(g) && g.hasta <= dia) vale = g.contenido;
      return vale;
    };

    const libro = await elLibroDelLocal(contexto, localId, false);
    const porDia = new Map<string, { plato_id: string; fecha: string; unidades: string }[]>();
    for (const v of vendidos) porDia.set(v.fecha, [...(porDia.get(v.fecha) ?? []), v]);
    const debia = new Map<string, number>();
    let raciones = 0;
    for (const [dia, delDia] of porDia) {
      // Las elaboraciones, también como estaban ese día.
      const elaboraciones = new Map(
        [...libro.libro.elaboraciones.values()].map((e) => {
          const guardada = laDeEseDia((g) => g.elaboracion_id === e.id, dia);
          return [
            e.id,
            guardada === null
              ? e
              : {
                  ...e,
                  rindeCantidad: guardada.rinde?.cantidad ?? e.rindeCantidad,
                  rindeUnidad: guardada.rinde?.unidad ?? e.rindeUnidad,
                  lineas: lineasDeLoGuardado(guardada),
                },
          ];
        }),
      );
      const delDiaConReceta: VendidoConSuReceta[] = delDia.flatMap((v) => {
        const guardada = laDeEseDia((g) => g.plato_id === v.plato_id, dia);
        if (guardada === null || guardada.lineas.length === 0) return [];
        raciones += Number(v.unidades);
        return [{ lineas: lineasDeLoGuardado(guardada), raciones: Number(v.unidades) }];
      });
      for (const [id, cuanto] of loQueDebiaGastarse(delDiaConReceta, {
        productos: libro.libro.productos,
        elaboraciones,
      })) {
        debia.set(id, (debia.get(id) ?? 0) + cuanto);
      }
    }

    const desviaciones = desviacionDeLosPlatos(
      debia,
      productos.map((p) => ({
        productoId: p.id,
        gastado: p.gastado,
        // Lo que se sabe por qué salió: lo tirado. Lo sacado a cocina no explica nada:
        // es justo lo que los platos tenían que gastar.
        explicado: p.mermas,
      })),
    );
    const deCadaUno = new Map(productos.map((p) => [p.id, p]));
    return {
      aLaVista: DESVIACION_DE_LOS_PLATOS_A_LA_VISTA,
      raciones,
      productos: desviaciones.map((d) => ({
        id: d.productoId,
        nombre: deCadaUno.get(d.productoId)?.nombre ?? '',
        unidad: deCadaUno.get(d.productoId)?.unidadDeUso ?? '',
        debia: Number(d.debia.toFixed(4)),
        gastado: d.gastado,
        desviacion: d.desviacion,
        cuadra: d.cuadra,
      })),
    };
  },
});
