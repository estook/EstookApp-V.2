import { z } from 'zod';
import {
  ZONAS,
  cuantoTocaContar,
  diferenciaDeLoContado,
  fechaEnElLocal,
  valeLaPenaProponer,
  valorDeLasExistencias,
  cantidad as cuantasHay,
  milesimas,
  type FechaOperativa,
  type MinimoCalculado,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';
import { elLocalDeLaSesion } from '../alta.ts';
import { loQueTocaContar, puedeCerrar, type ProductoQueToca } from '../inventario.ts';
import { loQueValeLoQueHay, productosActivos, puedeVerPrecios } from './almacen.ts';

/**
 * Lo que enseña el inventario (M8 · decisión 0078).
 *
 *   el_inventario       lo que toca contar, lo mandado por cerrar, lo que te piden
 *                       que vuelvas a contar y los últimos cerrados
 *   un_inventario       lo contado de uno, para cerrarlo
 *   valor_del_almacen   cuánto dinero hay en cámara en cualquier fecha
 *   minimos_propuestos  los mínimos que propone Estook (3A)
 *
 * **Contar a ciegas**: a quien cuenta sin poder cerrar no le llega lo que decía el
 * libro de lo contado, ni la diferencia. Y **el dinero, solo a quien ve precios de
 * compra**, como en todo Almacén.
 */

async function laZonaHoraria(contexto: Contexto, localId: string): Promise<string> {
  const filas = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${localId}
  `;
  return filas[0]?.zona_horaria ?? 'Europe/Madrid';
}

// ── El inventario: la pantalla de entrada ───────────────────────────────────

export interface InventarioEnLista {
  readonly id: string;
  readonly zona: string | null;
  readonly estado: string;
  readonly contadoPor: string | null;
  /** Si lo contó quien pregunta. */
  readonly esMio: boolean;
  readonly contadoEn: string;
  readonly cerradoPor: string | null;
  readonly cerradoEn: string | null;
  readonly contados: number;
  /** Solo para quien puede cerrar: contar a ciegas (0078). */
  readonly noCuadran?: number;
  readonly aRecontar: number;
  readonly motivoDeDescarte: string | null;
}

export interface SalidaElInventario {
  readonly hoy: FechaOperativa;
  readonly puedeCerrar: boolean;
  readonly tocaContar: {
    readonly productos: readonly ProductoQueToca[];
    readonly frase: string;
  };
  /** Lo mandado que espera a quien cierra. */
  readonly porCerrar: readonly InventarioEnLista[];
  /** Lo que te piden que vuelvas a contar a ti. */
  readonly paraRecontar: readonly {
    readonly inventarioId: string;
    readonly productoId: string;
    readonly nombre: string;
    readonly unidadDeUso: string;
    readonly formato: string | null;
    readonly factor: number;
    readonly pesoVariable: boolean;
  }[];
  /** Los diez últimos cerrados o descartados. */
  readonly cerrados: readonly InventarioEnLista[];
}

interface FilaDeInventario {
  id: string;
  zona: string | null;
  estado: string;
  contado_por: string | null;
  contado_por_id: string | null;
  contado_en: string;
  cerrado_por: string | null;
  cerrado_en: string | null;
  contados: number;
  no_cuadran: number;
  a_recontar: number;
  motivo_de_descarte: string | null;
}

function comoInventario(
  fila: FilaDeInventario,
  yo: string | null,
  conLoQueDecia: boolean,
): InventarioEnLista {
  return {
    id: fila.id,
    zona: fila.zona,
    estado: fila.estado,
    contadoPor: fila.contado_por,
    esMio: fila.contado_por_id !== null && fila.contado_por_id === yo,
    contadoEn: fila.contado_en,
    cerradoPor: fila.cerrado_por,
    cerradoEn: fila.cerrado_en,
    contados: fila.contados,
    ...(conLoQueDecia ? { noCuadran: fila.no_cuadran } : {}),
    aRecontar: fila.a_recontar,
    motivoDeDescarte: fila.motivo_de_descarte,
  };
}

async function losInventarios(
  contexto: Contexto,
  localId: string,
  porCerrar: boolean,
): Promise<FilaDeInventario[]> {
  return contexto.sql<FilaDeInventario[]>`
    select i.id::text as id, i.zona::text as zona, i.estado,
           pc.nombre as contado_por, i.contado_por::text as contado_por_id,
           to_char(i.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as contado_en,
           pz.nombre as cerrado_por,
           to_char(i.cerrado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrado_en,
           (select count(*)::int from estook.linea_de_inventario l where l.inventario_id = i.id) as contados,
           (select count(*)::int from estook.linea_de_inventario l
             where l.inventario_id = i.id and l.hay <> l.decia) as no_cuadran,
           (select count(*)::int from estook.linea_de_inventario l
             where l.inventario_id = i.id and l.recontar) as a_recontar,
           i.motivo_de_descarte
      from estook.inventario i
      left join estook.persona pc on pc.id = i.contado_por
      left join estook.persona pz on pz.id = i.cerrado_por
     where i.local_id = ${localId}
       and ((${porCerrar} and i.estado = 'contado') or (not ${porCerrar} and i.estado <> 'contado'))
     order by coalesce(i.cerrado_en, i.contado_en) desc
     limit ${porCerrar ? 50 : 10}
  `;
}

export const elInventario = consulta<Record<string, never>, SalidaElInventario>({
  nombre: 'el_inventario',
  entrada: z.object({}).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const cierra = await puedeCerrar(contexto, localId);
    const toca = await loQueTocaContar(contexto, localId);

    const porCerrar = await losInventarios(contexto, localId, true);
    const cerrados = await losInventarios(contexto, localId, false);

    const paraRecontar = await contexto.sql<
      {
        inventario_id: string;
        producto_id: string;
        nombre: string;
        unidad_de_uso: string;
        formato: string | null;
        factor: string;
        peso_variable: boolean;
      }[]
    >`
      select l.inventario_id::text as inventario_id, p.id::text as producto_id, p.nombre,
             p.unidad_de_uso::text as unidad_de_uso, p.formato, p.factor::text as factor,
             p.peso_variable
        from estook.linea_de_inventario l
        join estook.inventario i on i.id = l.inventario_id
        join estook.producto p on p.id = l.producto_id
       where i.local_id = ${localId} and i.estado = 'contado'
         and l.recontar and l.contado_por = ${contexto.personaId}
       order by p.nombre
    `;

    return {
      hoy: toca.hoy,
      puedeCerrar: cierra,
      tocaContar: { productos: toca.productos, frase: cuantoTocaContar(toca.productos) },
      porCerrar: porCerrar.map((f) => comoInventario(f, contexto.personaId, cierra)),
      paraRecontar: paraRecontar.map((f) => ({
        inventarioId: f.inventario_id,
        productoId: f.producto_id,
        nombre: f.nombre,
        unidadDeUso: f.unidad_de_uso,
        formato: f.formato,
        factor: Number(f.factor),
        pesoVariable: f.peso_variable,
      })),
      cerrados: cerrados.map((f) => comoInventario(f, contexto.personaId, cierra)),
    };
  },
});

// ── Un inventario, para cerrarlo ────────────────────────────────────────────

export interface LineaDelInventario {
  readonly productoId: string;
  readonly producto: string;
  readonly unidadDeUso: string;
  readonly formato: string | null;
  readonly factor: number;
  readonly pesoVariable: boolean;
  readonly hay: number;
  readonly formatos: number | null;
  readonly sueltas: number | null;
  readonly contadoPor: string | null;
  readonly contadoEn: string;
  readonly recontar: boolean;
  /** Solo para quien puede cerrar: lo que decía el libro al contarlo, y la diferencia. */
  readonly decia?: number;
  readonly diferencia?: number;
  /** Y solo con precios de compra: lo que vale la diferencia, a su coste de hoy. */
  readonly valorDeLaDiferenciaCentimos?: number | null;
}

export interface SalidaUnInventario {
  readonly inventario: InventarioEnLista;
  readonly lineas: readonly LineaDelInventario[];
  readonly puedeCerrar: boolean;
  readonly puedeVerPrecios: boolean;
}

export const unInventario = consulta<{ inventario_id: string }, SalidaUnInventario>({
  nombre: 'un_inventario',
  entrada: z.object({ inventario_id: z.string().uuid() }).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const cierra = await puedeCerrar(contexto, localId);
    const conPrecios = cierra && (await puedeVerPrecios(contexto, localId));

    const cabeceras = await contexto.sql<FilaDeInventario[]>`
      select i.id::text as id, i.zona::text as zona, i.estado,
             pc.nombre as contado_por, i.contado_por::text as contado_por_id,
             to_char(i.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as contado_en,
             pz.nombre as cerrado_por,
             to_char(i.cerrado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as cerrado_en,
             (select count(*)::int from estook.linea_de_inventario l where l.inventario_id = i.id) as contados,
             (select count(*)::int from estook.linea_de_inventario l
               where l.inventario_id = i.id and l.hay <> l.decia) as no_cuadran,
             (select count(*)::int from estook.linea_de_inventario l
               where l.inventario_id = i.id and l.recontar) as a_recontar,
             i.motivo_de_descarte
        from estook.inventario i
        left join estook.persona pc on pc.id = i.contado_por
        left join estook.persona pz on pz.id = i.cerrado_por
       where i.id = ${entrada.inventario_id} and i.local_id = ${localId}
    `;
    const cabecera = cabeceras[0];
    if (cabecera === undefined) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese inventario no está, o no es de este local.',
      });
    }

    const filas = await contexto.sql<
      {
        producto_id: string;
        producto: string;
        unidad_de_uso: string;
        formato: string | null;
        factor: string;
        peso_variable: boolean;
        hay: string;
        formatos: string | null;
        sueltas: string | null;
        decia: string;
        contado_por: string | null;
        contado_en: string;
        recontar: boolean;
        coste: string | null;
      }[]
    >`
      select l.producto_id::text as producto_id, p.nombre as producto,
             p.unidad_de_uso::text as unidad_de_uso, p.formato, p.factor::text as factor,
             p.peso_variable,
             l.hay::text as hay, l.formatos::text as formatos, l.sueltas::text as sueltas,
             l.decia::text as decia, pe.nombre as contado_por,
             to_char(l.contado_en at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as contado_en,
             l.recontar,
             coalesce(nullif(e.coste_milesimas, 0), (estook.precio_vigente(p.id)).coste_milesimas)::text as coste
        from estook.linea_de_inventario l
        join estook.producto p on p.id = l.producto_id
        left join estook.persona pe on pe.id = l.contado_por
        left join estook.existencias e on e.producto_id = p.id
       where l.inventario_id = ${entrada.inventario_id}
       order by p.nombre
    `;

    const lineas: LineaDelInventario[] = filas.map((f) => {
      const hay = Number(f.hay);
      const decia = Number(f.decia);
      const diferencia = diferenciaDeLoContado(hay, decia) ?? 0;
      const valor =
        f.coste === null
          ? null
          : (Math.sign(diferencia) || 1) *
            valorDeLasExistencias({
              cantidad: cuantasHay(Math.abs(diferencia)),
              coste: milesimas(Number(f.coste)),
            });
      return {
        productoId: f.producto_id,
        producto: f.producto,
        unidadDeUso: f.unidad_de_uso,
        formato: f.formato,
        factor: Number(f.factor),
        pesoVariable: f.peso_variable,
        hay,
        formatos: f.formatos === null ? null : Number(f.formatos),
        sueltas: f.sueltas === null ? null : Number(f.sueltas),
        contadoPor: f.contado_por,
        contadoEn: f.contado_en,
        recontar: f.recontar,
        ...(cierra ? { decia, diferencia } : {}),
        ...(conPrecios ? { valorDeLaDiferenciaCentimos: diferencia === 0 ? 0 : valor } : {}),
      };
    });

    // Para cerrar se mira primero lo que más baila; para contar, por orden.
    if (cierra) {
      lineas.sort(
        (a, b) =>
          Number(b.recontar) - Number(a.recontar) ||
          Math.abs(b.valorDeLaDiferenciaCentimos ?? 0) -
            Math.abs(a.valorDeLaDiferenciaCentimos ?? 0) ||
          Math.abs(b.diferencia ?? 0) - Math.abs(a.diferencia ?? 0) ||
          a.producto.localeCompare(b.producto, 'es'),
      );
    }

    return {
      inventario: comoInventario(cabecera, contexto.personaId, cierra),
      lineas,
      puedeCerrar: cierra,
      puedeVerPrecios: conPrecios,
    };
  },
});

// ── El valor del almacén en cualquier fecha ─────────────────────────────────

export const entradaValorDelAlmacen = z
  .object({
    /** El día, al cerrar la jornada. Sin decirlo, hoy. */
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    zona: z.enum(ZONAS).optional(),
  })
  .strict();

export type EntradaValorDelAlmacen = z.infer<typeof entradaValorDelAlmacen>;

export interface ProductoValorado {
  readonly id: string;
  readonly nombre: string;
  readonly zona: string;
  readonly categoria: string | null;
  readonly unidadDeUso: string;
  readonly cantidad: number;
  /** Lo que costó cada unidad de uso, a precio medio ponderado, en milésimas. */
  readonly costeMilesimas: number | null;
  readonly valorCentimos: number | null;
  /** Si el valor sale del precio de hoy, porque lo que había entró sin coste. */
  readonly valorEsEstimado: boolean;
}

export interface SalidaValorDelAlmacen {
  readonly fecha: FechaOperativa;
  readonly hoy: FechaOperativa;
  readonly totalCentimos: number;
  readonly porZona: readonly { readonly zona: string; readonly valorCentimos: number }[];
  readonly porCategoria: readonly {
    readonly categoria: string | null;
    readonly valorCentimos: number;
    readonly cuantos: number;
  }[];
  readonly productos: readonly ProductoValorado[];
  /** Cuántos con género no tienen ni coste ni precio: cuentan cero. */
  readonly sinCoste: number;
}

/**
 * Lo que había de cada producto al acabar un día, y lo que valía.
 *
 * Sale del libro: cada línea guarda cómo quedó la cámara tras ella (0023), así que lo
 * que había un día es la última línea de cada producto hasta ese día. **No se
 * recalcula nada**: se lee. Lo usan «Valor» y el food cost real (0079), y por eso es
 * una sola función: el «había» y el «queda» del food cost son esta misma cifra.
 */
export async function losProductosValorados(
  contexto: Contexto,
  localId: string,
  fecha: string,
  zona: string | null,
  /**
   * O hasta una línea del libro, en vez de hasta un día: lo que había justo al cerrar
   * un inventario (el food cost entre dos inventarios, 0079). Con esto, `fecha` no se mira.
   */
  hastaMovimiento: string | null = null,
): Promise<ProductoValorado[]> {
  const filas = await contexto.sql<
    {
      id: string;
      nombre: string;
      zona: string;
      categoria: string | null;
      unidad_de_uso: string;
      cantidad: string;
      coste: string;
      coste_vigente: string | null;
    }[]
  >`
    select p.id::text as id, p.nombre, p.zona::text as zona, c.nombre as categoria,
           p.unidad_de_uso::text as unidad_de_uso,
           u.cantidad_despues::text as cantidad, u.coste_medio_despues::text as coste,
           case when u.coste_medio_despues = 0
                then (estook.precio_vigente(p.id)).coste_milesimas::text end as coste_vigente
      from estook.producto p
      left join estook.categoria_de_producto c on c.id = p.categoria_id
      join lateral (
        select m.cantidad_despues, m.coste_medio_despues
          from estook.movimiento_de_stock m
         where m.producto_id = p.id
           and (case when ${hastaMovimiento}::bigint is null
                     then m.fecha_operativa <= ${fecha}::date
                     else m.id <= ${hastaMovimiento}::bigint end)
         order by m.id desc
         limit 1
      ) u on true
     where p.local_id = ${localId}
       and p.activo
       and not p.es_ejemplo
       and u.cantidad_despues > 0
       and (${zona}::text is null or p.zona::text = ${zona}::text)
       and p.zona = any ((select estook.zonas_que_ve(${localId}::uuid))::estook.zona_del_producto[])
     order by p.nombre
  `;

  return filas.map((f) => {
    const cantidad = Number(f.cantidad);
    const coste = Number(f.coste);
    const valorado = loQueValeLoQueHay(
      cantidad,
      coste,
      f.coste_vigente === null ? null : Number(f.coste_vigente),
    );
    return {
      id: f.id,
      nombre: f.nombre,
      zona: f.zona,
      categoria: f.categoria,
      unidadDeUso: f.unidad_de_uso,
      cantidad,
      costeMilesimas: coste === 0 ? null : coste,
      valorCentimos: valorado.valor,
      valorEsEstimado: valorado.estimado,
    };
  });
}

/**
 * Cuánto dinero había en cámara al acabar un día, a precio medio ponderado. Lo de
 * hoy cuadra con «lo que vale la cámara» del Resumen.
 */
export const valorDelAlmacen = consulta<EntradaValorDelAlmacen, SalidaValorDelAlmacen>({
  nombre: 'valor_del_almacen',
  entrada: entradaValorDelAlmacen,
  exige: 'dato.precio_de_compra',

  async ejecutar(contexto, entrada) {
    const localId = elLocalDeLaSesion(contexto);
    const hoy = fechaEnElLocal(contexto.ahora, await laZonaHoraria(contexto, localId));
    const fecha = (entrada.fecha ?? hoy) as FechaOperativa;
    if (fecha > hoy) {
      throw new FalloDeAplicacion('faltan_datos', {
        campos: ['fecha'],
        porque: 'Lo que habrá mañana todavía no se sabe: elige hoy o un día de antes.',
      });
    }

    const productos = await losProductosValorados(contexto, localId, fecha, entrada.zona ?? null);

    const porZona = new Map<string, number>();
    const porCategoria = new Map<string | null, { valor: number; cuantos: number }>();
    let total = 0;
    let sinCoste = 0;
    for (const p of productos) {
      const valor = p.valorCentimos ?? 0;
      if (p.costeMilesimas === null && !p.valorEsEstimado) sinCoste += 1;
      total += valor;
      porZona.set(p.zona, (porZona.get(p.zona) ?? 0) + valor);
      const antes = porCategoria.get(p.categoria) ?? { valor: 0, cuantos: 0 };
      porCategoria.set(p.categoria, { valor: antes.valor + valor, cuantos: antes.cuantos + 1 });
    }

    return {
      fecha,
      hoy,
      totalCentimos: total,
      porZona: [...porZona].map(([zona, valorCentimos]) => ({ zona, valorCentimos })),
      porCategoria: [...porCategoria]
        .map(([categoria, v]) => ({ categoria, valorCentimos: v.valor, cuantos: v.cuantos }))
        .sort((a, b) => b.valorCentimos - a.valorCentimos),
      productos: productos.sort(
        (a, b) =>
          (b.valorCentimos ?? 0) - (a.valorCentimos ?? 0) || a.nombre.localeCompare(b.nombre, 'es'),
      ),
      sinCoste,
    };
  },
});

// ── Los mínimos que propone Estook (3A) ─────────────────────────────────────

export interface MinimoPropuesto {
  readonly id: string;
  readonly nombre: string;
  readonly unidadDeUso: string;
  readonly cantidad: number;
  /** El que tiene ahora. Nulo: ninguno. */
  readonly minimo: number | null;
  readonly propuesto: MinimoCalculado;
}

export interface SalidaMinimosPropuestos {
  readonly propuestas: readonly MinimoPropuesto[];
  /** Cuántos ya los rehace Estook cada lunes. */
  readonly automaticos: number;
  /** Cuántos todavía no tienen con qué calcularse: menos de una semana de historia. */
  readonly sinDatos: number;
}

export const minimosPropuestos = consulta<Record<string, never>, SalidaMinimosPropuestos>({
  nombre: 'minimos_propuestos',
  entrada: z.object({}).strict(),
  exige: 'app.almacen',

  async ejecutar(contexto) {
    const localId = elLocalDeLaSesion(contexto);
    const productos = await productosActivos(contexto, localId);
    const propuestas: MinimoPropuesto[] = [];
    let sinDatos = 0;
    for (const p of productos) {
      const calculado = p.minimoQueCalcula;
      if (calculado === null) {
        sinDatos += 1;
        continue;
      }
      if (p.minimoCalculado || !valeLaPenaProponer(p.minimo, calculado.minimo)) continue;
      propuestas.push({
        id: p.id,
        nombre: p.nombre,
        unidadDeUso: p.unidadDeUso,
        cantidad: p.cantidad,
        minimo: p.minimo,
        propuesto: calculado,
      });
    }
    return {
      propuestas,
      automaticos: productos.filter((p) => p.minimoCalculado).length,
      sinDatos,
    };
  },
});
