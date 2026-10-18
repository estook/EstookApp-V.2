import {
  CANALES_DE_VENTA,
  comoSeLeeLaCantidad,
  escandalloDelPlato,
  costeDeLaReceta,
  fechaEnElLocal,
  jornadaDe,
  porRacion,
  precioEnElCanal,
  type CanalParaElMargen,
  type ElaboracionDelEscandallo,
  type EscandalloDelPlato,
  type LibroDeRecetas,
  type LineaDelEscandallo,
  type LineaQueSeEscribe,
  type ProductoDelEscandallo,
  type RecetaQueSeLee,
  type UnidadDeUso,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';
import { elRelojYElFisco, elTipoDeRestauracion } from './desviacion.ts';
import { losCanalesDelLocal, type UnCanal } from './canales-del-local.ts';

/**
 * Lo que comparten las fichas y el escandallo (M9 · 2, 0087): leer de una vez las
 * recetas del local, sus elaboraciones y los productos que llevan, con su coste.
 *
 * **El coste no se guarda**: se calcula cada vez con el Almacén de ese momento. Así
 * «sube el aceite» no apunta nada en ningún sitio y el escandallo ya lo sabe (0086), y
 * no hay un coste viejo esperando a que alguien lo recalcule.
 *
 * Y **solo se lee el coste si quien pregunta puede verlo** (`conCostes`): sin
 * `dato.coste_de_plato`, el libro sale sin un solo precio, así que ni por error puede
 * acabar uno en la respuesta.
 */

export interface LineaLeida extends LineaDelEscandallo {
  readonly id: string;
  readonly nota: string | null;
}

export interface RecetaLeida {
  readonly id: string;
  readonly platoId: string | null;
  readonly elaboracionId: string | null;
  readonly pasos: readonly string[];
  /** La clave de la foto de cada paso, en su orden; '' sin foto (0090). */
  readonly fotosDeLosPasos: readonly string[];
  readonly notas: string | null;
  readonly minutos: number | null;
  readonly version: number;
  /** Si el plato se vende tal como se guarda (0088). */
  readonly talCual: boolean;
  /** Cuántas raciones salen tal como está escrita: 1, o una tanda (0092). */
  readonly raciones: number;
  readonly lineas: readonly LineaLeida[];
}

export interface ProductoLeido extends ProductoDelEscandallo {
  readonly activo: boolean;
  readonly categoria: string | null;
}

export interface ElaboracionLeida {
  readonly id: string;
  readonly nombre: string;
  readonly rindeCantidad: number;
  readonly rindeUnidad: UnidadDeUso;
  readonly activo: boolean;
  readonly version: number;
}

export interface ElLibro {
  readonly libro: LibroDeRecetas;
  readonly productos: ReadonlyMap<string, ProductoLeido>;
  readonly elaboraciones: ReadonlyMap<string, ElaboracionLeida>;
  readonly recetaDelPlato: ReadonlyMap<string, RecetaLeida>;
  readonly recetaDeLaElaboracion: ReadonlyMap<string, RecetaLeida>;
}

export function elLocalDeEscandallos(contexto: Contexto): string {
  const localId = contexto.sesion?.localId ?? null;
  if (localId === null) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Las fichas son de un local: elige uno primero.',
    });
  }
  return localId;
}

export async function lasRecetasDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<RecetaLeida[]> {
  const filas = await contexto.sql<
    {
      id: string;
      plato_id: string | null;
      elaboracion_id: string | null;
      pasos: string[];
      fotos_de_los_pasos: string[];
      notas: string | null;
      tiempo_minutos: number | null;
      version: number;
      tal_cual: boolean;
      raciones: number | null;
      lineas: {
        id: string;
        producto_id: string | null;
        elaboracion_id: string | null;
        cantidad: number | string;
        unidad: UnidadDeUso;
        nota: string | null;
      }[];
    }[]
  >`
    select r.id, r.plato_id, r.elaboracion_id, r.pasos, r.fotos_de_los_pasos, r.notas,
           r.tiempo_minutos, r.version, r.tal_cual, r.raciones,
           coalesce(
             json_agg(json_build_object(
               'id', l.id, 'producto_id', l.producto_id, 'elaboracion_id', l.elaboracion_id,
               'cantidad', l.cantidad, 'unidad', l.unidad, 'nota', l.nota
             ) order by l.orden) filter (where l.id is not null),
             '[]'::json
           ) as lineas
      from estook.receta r
      left join estook.linea_de_receta l on l.receta_id = r.id
     where r.local_id = ${localId}::uuid
     group by r.id
  `;
  return filas.map((f) => ({
    id: f.id,
    platoId: f.plato_id,
    elaboracionId: f.elaboracion_id,
    pasos: f.pasos,
    fotosDeLosPasos: f.fotos_de_los_pasos,
    notas: f.notas,
    minutos: f.tiempo_minutos,
    version: f.version,
    talCual: f.tal_cual,
    raciones: f.raciones ?? 1,
    lineas: f.lineas.map((l) => ({
      id: l.id,
      productoId: l.producto_id,
      elaboracionId: l.elaboracion_id,
      cantidad: Number(l.cantidad),
      unidad: l.unidad,
      nota: l.nota,
    })),
  }));
}

export async function lasElaboracionesDelLocal(
  contexto: Contexto,
  localId: string,
): Promise<ElaboracionLeida[]> {
  const filas = await contexto.sql<
    {
      id: string;
      nombre: string;
      rinde_cantidad: string;
      rinde_unidad: UnidadDeUso;
      activo: boolean;
      version: number;
    }[]
  >`
    select id, nombre, rinde_cantidad::text as rinde_cantidad, rinde_unidad::text as rinde_unidad,
           activo, version
      from estook.elaboracion
     where local_id = ${localId}::uuid
     order by nombre
  `;
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    rindeCantidad: Number(f.rinde_cantidad),
    rindeUnidad: f.rinde_unidad,
    activo: f.activo,
    version: f.version,
  }));
}

/**
 * Los productos del local con lo que necesita una ficha: su unidad, sus alérgenos y,
 * **solo con `conCostes`**, lo que cuesta una unidad de uso con su aprovechamiento:
 * el precio medio del Almacén, y si lo que hay entró sin coste, el de hoy (la misma
 * regla que el valor de la cámara y el food cost real).
 */
export async function losProductosDeLasFichas(
  contexto: Contexto,
  localId: string,
  conCostes: boolean,
): Promise<ProductoLeido[]> {
  const filas = conCostes
    ? await contexto.sql<
        {
          id: string;
          nombre: string;
          unidad_de_uso: UnidadDeUso;
          alergenos: string[];
          activo: boolean;
          categoria: string | null;
          coste: string | null;
        }[]
      >`
        select p.id, p.nombre, p.unidad_de_uso::text as unidad_de_uso, p.alergenos, p.activo,
               c.nombre as categoria,
               coalesce(nullif(e.coste_milesimas, 0), v.coste_milesimas)::text as coste
          from estook.producto p
          left join estook.categoria_de_producto c on c.id = p.categoria_id
          left join lateral (
            select x.coste_milesimas from estook.existencias x where x.producto_id = p.id
          ) e on true
          left join estook.precios_vigentes(
            array(select id from estook.producto where local_id = ${localId}::uuid)
          ) v on v.producto_id = p.id
         where p.local_id = ${localId}::uuid
         order by p.nombre
      `
    : await contexto.sql<
        {
          id: string;
          nombre: string;
          unidad_de_uso: UnidadDeUso;
          alergenos: string[];
          activo: boolean;
          categoria: string | null;
          coste: null;
        }[]
      >`
        select p.id, p.nombre, p.unidad_de_uso::text as unidad_de_uso, p.alergenos, p.activo,
               c.nombre as categoria, null as coste
          from estook.producto p
          left join estook.categoria_de_producto c on c.id = p.categoria_id
         where p.local_id = ${localId}::uuid
         order by p.nombre
      `;
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    unidad: f.unidad_de_uso,
    alergenos: f.alergenos,
    activo: f.activo,
    categoria: f.categoria,
    costeMilesimas: f.coste === null ? null : Number(f.coste),
  }));
}

/** Todo de una vez: tres lecturas, y el resto se cuenta aquí. */
export async function elLibroDelLocal(
  contexto: Contexto,
  localId: string,
  conCostes: boolean,
): Promise<ElLibro> {
  const [recetas, elaboraciones, productos] = await Promise.all([
    lasRecetasDelLocal(contexto, localId),
    lasElaboracionesDelLocal(contexto, localId),
    losProductosDeLasFichas(contexto, localId, conCostes),
  ]);
  const recetaDelPlato = new Map<string, RecetaLeida>();
  const recetaDeLaElaboracion = new Map<string, RecetaLeida>();
  for (const r of recetas) {
    if (r.platoId !== null) recetaDelPlato.set(r.platoId, r);
    if (r.elaboracionId !== null) recetaDeLaElaboracion.set(r.elaboracionId, r);
  }
  const deLasElaboraciones = new Map<string, ElaboracionDelEscandallo>(
    elaboraciones.map((e) => [
      e.id,
      {
        id: e.id,
        nombre: e.nombre,
        rindeCantidad: e.rindeCantidad,
        rindeUnidad: e.rindeUnidad,
        lineas: recetaDeLaElaboracion.get(e.id)?.lineas ?? [],
      },
    ]),
  );
  return {
    libro: {
      productos: new Map(productos.map((p) => [p.id, p])),
      elaboraciones: deLasElaboraciones,
    },
    productos: new Map(productos.map((p) => [p.id, p])),
    elaboraciones: new Map(elaboraciones.map((e) => [e.id, e])),
    recetaDelPlato,
    recetaDeLaElaboracion,
  };
}

// ── Vinculado: un producto que se vende tal cual ─────────────────────────────

export interface ElVinculo {
  readonly productoId: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
}

/**
 * Si el plato **se vende tal cual**: su receta es un producto y su ración, la lata de
 * refresco (1 ud), el entrecot (300 g), la dorada entera (450 g) (repaso del 16-oct, A).
 * Es una ficha como cualquiera —se cuenta como desgranada—, y la Carta la enseña con su
 * cadena.
 *
 * Hasta el 16-oct por la tarde solo valía **una unidad**, y en el Almacén de verdad el
 * entrecot, el pescado entero o el helado se llevan en gramos o mililitros: no salían, y
 * Richi no encontraba lo suyo (lección 190). Con cualquier cantidad, la forma ya no basta
 * —una tortilla de «Huevo, 3 ud» es una ficha, no se vende tal cual—, así que lo dice la
 * receta (`tal_cual`, 0070), y solo vale mientras sea una línea de producto.
 */
export function elVinculado(receta: RecetaLeida | undefined): ElVinculo | null {
  if (receta === undefined || !receta.talCual || receta.lineas.length !== 1) return null;
  const linea = receta.lineas[0];
  if (linea === undefined || linea.productoId === null) return null;
  return { productoId: linea.productoId, cantidad: linea.cantidad, unidad: linea.unidad };
}

/** «300 g» al lado del nombre; con una unidad, nada: «Refresco de cola» se entiende solo. */
export function laRacionDelVinculo(vinculo: ElVinculo): string | null {
  return vinculo.unidad === 'ud' && vinculo.cantidad === 1
    ? null
    : comoSeLeeLaCantidad(vinculo.cantidad, vinculo.unidad);
}

// ── El IVA, el objetivo y los canales ────────────────────────────────────────

export interface LoDeLaCuenta {
  readonly iva: number | null;
  readonly objetivo: number | null;
  readonly canales: readonly UnCanal[];
}

/** Lo que pide el margen y que no es del plato: el IVA del local, su objetivo y sus canales. */
export async function loDeLaCuenta(contexto: Contexto, localId: string): Promise<LoDeLaCuenta> {
  const local = await elRelojYElFisco(contexto, localId);
  const [iva, objetivos, canales] = await Promise.all([
    elTipoDeRestauracion(contexto, local, fechaEnElLocal(contexto.ahora, local.zonaHoraria)),
    contexto.sql<{ valor: string | null }[]>`
      select valor::text as valor from estook.objetivo
       where local_id = ${localId}::uuid and clave = 'materia_prima' and hasta is null
    `,
    losCanalesDelLocal(contexto, localId, true),
  ]);
  const valor = objetivos[0]?.valor;
  return {
    iva,
    objetivo: valor === null || valor === undefined ? null : Number(valor),
    canales: canales.filter((c) => c.activo),
  };
}

/**
 * El escandallo de un plato con sus precios: el coste, el food cost y el margen por canal.
 * **De una ración**: si la receta está escrita para una tanda, se divide (0092). Las
 * líneas, en cambio, cuestan lo que pone la receta: lo de la tanda entera.
 */
export function elEscandalloDe(
  receta: RecetaLeida | undefined,
  plato: {
    readonly precioCentimos: number | null;
    readonly precios: Readonly<Record<string, number>>;
  },
  libro: LibroDeRecetas,
  cuenta: LoDeLaCuenta,
): EscandalloDelPlato & { readonly lineas: ReturnType<typeof costeDeLaReceta>['lineas'] } {
  const coste = costeDeLaReceta(receta?.lineas ?? [], libro);
  const conLineas = (receta?.lineas.length ?? 0) > 0;
  const canales: CanalParaElMargen[] = cuenta.canales.map((c) => {
    const vale = precioEnElCanal(plato.precioCentimos, plato.precios[c.canal]);
    return {
      canal: c.canal,
      nombre: c.nombre,
      precioCentimos: vale.centimos,
      igualQueSala: c.canal !== 'sala' && vale.igualQueSala,
      comisionPorcentaje: c.comisionPorcentaje,
      envaseCentimos: c.envaseCentimos,
    };
  });
  return {
    ...escandalloDelPlato({
      costeMilesimas: conLineas ? porRacion(coste.milesimas, receta?.raciones) : null,
      faltanPrecios: coste.faltanPrecios,
      precioSalaCentimos: plato.precioCentimos,
      iva: cuenta.iva,
      objetivo: cuenta.objetivo,
      canales,
    }),
    lineas: coste.lineas,
  };
}

/** Los canales que se pueden activar hoy, por si alguno se apaga del catálogo. */
export const NOMBRE_DEL_CANAL = new Map(CANALES_DE_VENTA.map((c) => [c.canal, c.nombre]));

// ── La receta, como se guarda en el historial ────────────────────────────────

export interface LineaGuardada {
  readonly tipo: 'producto' | 'elaboracion';
  readonly id: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly unidad: UnidadDeUso;
  readonly nota: string | null;
}

export interface RecetaGuardada extends RecetaQueSeLee {
  readonly lineas: readonly LineaGuardada[];
}

/** La receta entera, con los nombres de ese momento: se lee sin mirar nada más. */
export function comoSeGuarda(
  nombre: string,
  rinde: RecetaQueSeLee['rinde'],
  receta: {
    readonly lineas: readonly LineaQueSeEscribe[];
    readonly pasos: readonly string[];
    readonly notas: string | null;
    readonly minutos: number | null;
    /** De un plato: para cuántas raciones está escrita; nula si es una (0092). */
    readonly raciones?: number | null;
  },
  nombres: {
    readonly productos: ReadonlyMap<string, { readonly nombre: string }>;
    readonly elaboraciones: ReadonlyMap<string, { readonly nombre: string }>;
  },
): RecetaGuardada {
  return {
    nombre,
    rinde,
    ...(receta.raciones === undefined || receta.raciones === null || receta.raciones <= 1
      ? {}
      : { raciones: receta.raciones }),
    lineas: receta.lineas.map((l) => {
      const esProducto = l.productoId !== null;
      const id = (esProducto ? l.productoId : l.elaboracionId) ?? '';
      return {
        tipo: esProducto ? 'producto' : 'elaboracion',
        id,
        nombre:
          (esProducto
            ? nombres.productos.get(id)?.nombre
            : nombres.elaboraciones.get(id)?.nombre) ?? '¿?',
        cantidad: l.cantidad,
        unidad: l.unidad,
        nota: l.nota,
      };
    }),
    pasos: [...receta.pasos],
    notas: receta.notas,
    minutos: receta.minutos,
  };
}

/** De lo guardado a lo que entiende el motor (la desviación cuenta con la de ese día). */
export function lineasDeLoGuardado(guardada: RecetaGuardada): LineaDelEscandallo[] {
  return guardada.lineas.map((l) => ({
    productoId: l.tipo === 'producto' ? l.id : null,
    elaboracionId: l.tipo === 'elaboracion' ? l.id : null,
    cantidad: l.cantidad,
    unidad: l.unidad,
  }));
}

// ── El libro de otro día (M9 · 3, «qué ha cambiado», 0092) ───────────────────

export interface RecetaDeOtroDia {
  readonly lineas: readonly (LineaDelEscandallo & { readonly nombre: string })[];
  readonly raciones: number;
}

export interface ElLibroDeOtroDia {
  /** Los productos con **lo que costaban entonces**, y las elaboraciones de hoy. */
  readonly libro: LibroDeRecetas;
  /** La receta que tenía cada plato entonces: la última guardada antes de esa hora. */
  readonly recetaDelPlato: ReadonlyMap<string, RecetaDeOtroDia>;
}

/**
 * Lo que costaba cada producto y cómo era la receta de cada plato **a una hora pasada**,
 * para comparar con hoy sin recalcular el pasado con precios de hoy (Manifiesto 13).
 *
 * El coste de un producto entonces sale como el de hoy: el precio medio con que quedó la
 * cámara tras su último movimiento de antes de esa hora, y si entró sin coste, el precio
 * que valía ese día (`precio_de_producto`, con su `desde` y su `hasta`). Las elaboraciones,
 * con lo que llevan hoy: están paradas (0090) y casi nadie las tiene.
 */
export async function elLibroDeOtroDia(
  contexto: Contexto,
  localId: string,
  instante: Date,
  zonaHoraria: string,
  hoy: ElLibro,
): Promise<ElLibroDeOtroDia> {
  // El precio que valía **en la jornada** de ese instante, con la hora de corte del
  // local, que es como se apuntan los precios (regla 10, 0096).
  const { corte } = await elRelojYElFisco(contexto, localId);
  const fecha = jornadaDe(instante, zonaHoraria, corte);
  const [costes, guardadas] = await Promise.all([
    contexto.sql<{ id: string; coste: string | null }[]>`
      select p.id, coalesce(nullif(m.coste_medio_despues, 0), v.coste_milesimas)::text as coste
        from estook.producto p
        left join lateral (
          select x.coste_medio_despues from estook.movimiento_de_stock x
           where x.producto_id = p.id and x.ocurrido_en <= ${instante.toISOString()}::timestamptz
           order by x.ocurrido_en desc, x.id desc
           limit 1
        ) m on true
        left join lateral (
          select pr.coste_milesimas from estook.precio_de_producto pr
           where pr.producto_id = p.id and pr.desde <= ${fecha}::date
             and (pr.hasta is null or pr.hasta >= ${fecha}::date)
           order by case when p.proveedor_id is not null and pr.proveedor_id = p.proveedor_id
                         then 0 else 1 end,
                    pr.desde desc, pr.creado_en desc
           limit 1
        ) v on true
       where p.local_id = ${localId}::uuid
    `,
    contexto.sql<{ plato_id: string; contenido: RecetaGuardada }[]>`
      select distinct on (g.receta_id) r.plato_id, g.contenido
        from estook.receta_guardada g
        join estook.receta r on r.id = g.receta_id
       where g.local_id = ${localId}::uuid and r.plato_id is not null
         and g.guardada_en <= ${instante.toISOString()}::timestamptz
       order by g.receta_id, g.version desc
    `,
  ]);
  const costeEntonces = new Map(
    costes.map((c) => [c.id, c.coste === null ? null : Number(c.coste)]),
  );
  const productos = new Map<string, ProductoDelEscandallo>(
    [...hoy.libro.productos.values()].map((p) => [
      p.id,
      { ...p, costeMilesimas: costeEntonces.get(p.id) ?? null },
    ]),
  );
  return {
    libro: { productos, elaboraciones: hoy.libro.elaboraciones },
    recetaDelPlato: new Map(
      guardadas.map((g) => [
        g.plato_id,
        {
          lineas: g.contenido.lineas.map((l) => ({
            productoId: l.tipo === 'producto' ? l.id : null,
            elaboracionId: l.tipo === 'elaboracion' ? l.id : null,
            cantidad: l.cantidad,
            unidad: l.unidad,
            nombre: l.nombre,
          })),
          raciones: g.contenido.raciones ?? 1,
        },
      ]),
    ),
  };
}

/** Si la receta de hoy es otra que la de entonces: otras líneas, otras cantidades u otra tanda. */
export function cambioLaReceta(entonces: RecetaDeOtroDia, hoy: RecetaLeida): boolean {
  const comoQueda = (lineas: readonly LineaDelEscandallo[], raciones: number): string =>
    JSON.stringify({
      raciones,
      lineas: lineas
        .map(
          (l) => `${l.productoId ?? ''}|${l.elaboracionId ?? ''}|${String(l.cantidad)}|${l.unidad}`,
        )
        .sort(),
    });
  return comoQueda(entonces.lineas, entonces.raciones) !== comoQueda(hoy.lineas, hoy.raciones);
}
