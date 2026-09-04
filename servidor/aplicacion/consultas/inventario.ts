import { z } from 'zod';
import {
  VENTANA_DE_CONSUMO,
  cantidad as cuantasHay,
  comoEsta,
  comoPrecioPorUnidad,
  consumoMedioDiario,
  diasDeCobertura,
  fechaEnElLocal,
  masDias,
  milesimas as enMilesimas,
  pedidoRecomendado,
  previsionDeAgotamiento,
  urgenciaDe,
  valorDeLasExistencias,
  type Consumo,
  type EstadoDeExistencias,
  type FechaOperativa,
  type Sugerencia,
} from '@estook/dominio';
import { consulta, FalloDeAplicacion, type Contexto } from '../contrato.ts';

/**
 * Lo que Inventario enseña (M6).
 *
 * ── La regla que ordena este fichero entero ──────────────────────────────────
 *
 * «**Un rol sin costes no recibe ni un campo de coste en ninguna respuesta**»
 * (Auditoría, parte 8). Un cocinero tiene Inventario entera —apunta lo que entra
 * y lo que sale, ajusta la cámara, mira lo que caduca— y **no tiene**
 * `dato.precio_de_compra`.
 *
 * Eso no se resuelve escondiendo una columna en la pantalla: se resuelve **no
 * enviándola**. Las políticas de la 0023 ya cierran la tabla de precios por
 * filas, pero hay cifras derivadas —el coste por unidad de uso, lo que vale la
 * cámara, el precio medio ponderado— que salen del libro de movimientos, que un
 * cocinero sí puede leer. Esas se quitan aquí, con `sinPrecios`, y hay una
 * prueba que llama a la API a pelo con un cocinero para comprobar que no viajan.
 *
 * ── Y la segunda: cada cifra lleva de dónde sale ─────────────────────────────
 *
 * «Cada número lleva debajo de dónde sale y de qué periodo es» (Evolución 1.0).
 * Por eso el consumo no es un número suelto: viene con cuántos días se han
 * mirado, y cuando no se puede decir, viene con la frase de por qué no.
 */

// ── Lo que la pantalla recibe de cada producto ───────────────────────────────

export interface ProductoEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: string | null;
  /**
   * Los identificadores, y no solo los nombres.
   *
   * Sin ellos la ficha **no podía preseleccionar nada**, y al guardar mandaba
   * nulo: editar el nombre de un producto le borraba la categoría y el
   * proveedor sin decir nada. Un nombre sirve para enseñar; para volver a
   * guardar hace falta el identificador.
   */
  readonly categoriaId: string | null;
  readonly proveedorId: string | null;
  readonly formato: string | null;
  readonly unidadDeUso: string;
  readonly factor: number;
  readonly rendimiento: number;
  readonly sinVerificar: boolean;
  readonly pesoVariable: boolean;
  readonly esEjemplo: boolean;
  readonly activo: boolean;
  readonly proveedor: string | null;
  readonly codigoDeBarras: string | null;
  /** Decide el impuesto que lleva lo que se venda. Nunca se supone. */
  readonly categoriaFiscal: string;
  readonly notas: string | null;

  readonly cantidad: number;
  readonly minimo: number | null;
  readonly estado: EstadoDeExistencias;

  // ── Lo que solo ve quien puede ver precios ─────────────────────────────────
  readonly precioCentimos?: number | null;
  readonly costeMilesimas?: number | null;
  /** «0,0039 €/g». Texto, para que no se pueda seguir calculando con él. */
  readonly costePorUnidad?: string | null;
  readonly valorCentimos?: number | null;

  // ── La capa inteligente ────────────────────────────────────────────────────
  readonly consumo: Consumo;
  readonly diasDeCobertura: number | null;
  /** ISO completo, con hora: «se agota el viernes a las 20:30». */
  readonly seAgotaEn: string | null;
  readonly sugerencia: Sugerencia | null;
}

/**
 * Quita del producto todo lo que huela a dinero.
 *
 * **No los pone a cero ni a nulo: los quita.** Un campo con `null` sigue
 * diciendo que existe, y a veces eso ya es información de más. Es la misma
 * decisión que toma `recortar` en `@estook/permisos`, y aquí se hace a mano
 * porque estos cuatro campos son derivados y no columnas de una tabla.
 */
const LO_QUE_ES_DINERO: readonly string[] = [
  'precioCentimos',
  'costeMilesimas',
  'costePorUnidad',
  'valorCentimos',
];

/** Devuelve una copia con solo las claves que no son dinero. */
function sinLosCamposDeDinero<T extends object>(dato: T, fuera: readonly string[]): T {
  return Object.fromEntries(
    Object.entries(dato).filter(([clave]) => !fuera.includes(clave)),
  ) as unknown as T;
}

function sinPrecios(producto: ProductoEnLista): ProductoEnLista {
  return sinLosCamposDeDinero(producto, LO_QUE_ES_DINERO);
}

async function puedeVerPrecios(contexto: Contexto, localId: string): Promise<boolean> {
  const filas = await contexto.sql<{ puede: boolean }[]>`
    select estook.puede_ver('dato.precio_de_compra', ${localId}::uuid) as puede
  `;
  return filas[0]?.puede === true;
}

function elLocal(contexto: Contexto): string {
  const localId = contexto.sesion?.localId;
  if (!localId) {
    throw new FalloDeAplicacion('faltan_datos', {
      porque: 'Hay que estar dentro de un local para ver su inventario. Elige uno primero.',
    });
  }
  return localId;
}

/**
 * La consulta gorda, en una sola pasada.
 *
 * Producto, categoría, proveedor, existencias, precio vigente y las salidas de
 * la ventana de consumo, todo junto. Traérselo en cinco consultas y juntarlo en
 * memoria costaría cinco viajes por pantalla, y el presupuesto de velocidad de
 * B7 no perdona.
 */
interface FilaDeProducto {
  id: string;
  nombre: string;
  categoria: string | null;
  categoria_id: string | null;
  proveedor_id: string | null;
  formato: string | null;
  unidad_de_uso: string;
  factor: string;
  rendimiento: string;
  sin_verificar: boolean;
  peso_variable: boolean;
  es_ejemplo: boolean;
  activo: boolean;
  proveedor: string | null;
  codigo_de_barras: string | null;
  categoria_fiscal: string;
  notas: string | null;
  minimo: string | null;
  cantidad: string | null;
  coste_medio: string | null;
  precio_centimos: string | null;
  coste_vigente: string | null;
  salidas: string | null;
  dias_con_datos: number;
}

async function leerProductos(
  contexto: Contexto,
  localId: string,
  filtros: {
    texto: string;
    categoriaId: string | null;
    /**
     * Uno solo, por su identificador.
     *
     * Existe para que la ficha de un producto **lea una fila y no trescientas**.
     * La primera versión traía la lista entera y buscaba dentro, y con un local
     * de verdad eso son trescientas filas y sus subconsultas para devolver una:
     * el presupuesto de velocidad de B7 no perdona eso.
     */
    productoId: string | null;
    soloConProblema: boolean;
    incluirEjemplos: boolean;
    incluirDesactivados: boolean;
    limite: number;
    salto: number;
  },
): Promise<{ filas: FilaDeProducto[]; hoy: FechaOperativa; desde: FechaOperativa }> {
  const zonas = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${localId}
  `;
  const zona = zonas[0]?.zona_horaria ?? 'Europe/Madrid';
  const hoy = fechaEnElLocal(contexto.ahora, zona);
  const desde = masDias(hoy, -VENTANA_DE_CONSUMO);

  const filas = await contexto.sql<FilaDeProducto[]>`
    select p.id, p.nombre, c.nombre as categoria, p.categoria_id, p.proveedor_id,
           p.categoria_fiscal::text as categoria_fiscal, p.notas, p.formato,
           p.unidad_de_uso::text as unidad_de_uso,
           p.factor::text as factor, p.rendimiento::text as rendimiento,
           p.sin_verificar, p.peso_variable, p.es_ejemplo, p.activo,
           pv.nombre as proveedor, p.codigo_de_barras,
           p.minimo::text as minimo,
           e.cantidad::text as cantidad,
           e.coste_milesimas::text as coste_medio,
           pr.precio_centimos::text as precio_centimos,
           pr.coste_milesimas::text as coste_vigente,
           (
             select coalesce(sum(abs(m.cantidad)), 0)::text
               from estook.movimiento_de_stock m
              where m.producto_id = p.id
                and m.cantidad < 0
                and m.fecha_operativa >= ${desde}::date
                and m.fecha_operativa <= ${hoy}::date
           ) as salidas,
           (
             select least(
               ${VENTANA_DE_CONSUMO}::int,
               coalesce(
                 (${hoy}::date - min(m.fecha_operativa))::int,
                 0
               )
             )
               from estook.movimiento_de_stock m
              where m.producto_id = p.id
           ) as dias_con_datos
      from estook.producto p
      left join estook.categoria_de_producto c on c.id = p.categoria_id
      left join estook.proveedor pv on pv.id = p.proveedor_id
      left join estook.existencias e on e.producto_id = p.id
      left join estook.precio_vigente(p.id) pr on true
     where p.local_id = ${localId}
       and (${filtros.productoId}::uuid is null or p.id = ${filtros.productoId}::uuid)
       and (${filtros.incluirDesactivados} or p.activo)
       and (${filtros.incluirEjemplos} or not p.es_ejemplo)
       and (${filtros.categoriaId}::uuid is null or p.categoria_id = ${filtros.categoriaId}::uuid)
       and (
         ${filtros.texto} = ''
         or estook.sin_acentos(p.nombre) like '%' || estook.sin_acentos(${filtros.texto}) || '%'
         or similarity(estook.sin_acentos(p.nombre), estook.sin_acentos(${filtros.texto})) > 0.3
         or p.codigo_de_barras = ${filtros.texto}
       )
     order by p.nombre
     limit ${filtros.limite} offset ${filtros.salto}
  `;

  return { filas, hoy, desde };
}

function componer(fila: FilaDeProducto, hoy: FechaOperativa, desde: FechaOperativa, ahora: Date) {
  const cantidad = fila.cantidad === null ? 0 : Number(fila.cantidad);
  const minimo = fila.minimo === null ? null : Number(fila.minimo);
  const costeMedio = fila.coste_medio === null ? null : Number(fila.coste_medio);
  const salidas = fila.salidas === null ? 0 : Number(fila.salidas);
  const unidadDeUso = fila.unidad_de_uso;

  // Se le pasa el total ya sumado como una sola salida: la ventana ya la ha
  // aplicado la consulta, y el motor solo necesita el total y cuántos días
  // mirar. Repartirlo día a día para volver a sumarlo sería traer cien filas
  // para no usarlas.
  const consumo = consumoMedioDiario(
    salidas > 0 ? [{ fecha: hoy, cantidad: salidas }] : [],
    desde,
    hoy,
    fila.dias_con_datos,
  );

  const cobertura = diasDeCobertura(cantidad, consumo.porDia);
  const seAgota = previsionDeAgotamiento(cantidad, consumo.porDia, ahora);
  const costeVigente = fila.coste_vigente === null ? null : Number(fila.coste_vigente);

  const producto: ProductoEnLista = {
    id: fila.id,
    nombre: fila.nombre,
    categoria: fila.categoria,
    categoriaId: fila.categoria_id,
    proveedorId: fila.proveedor_id,
    categoriaFiscal: fila.categoria_fiscal,
    notas: fila.notas,
    formato: fila.formato,
    unidadDeUso,
    factor: Number(fila.factor),
    rendimiento: Number(fila.rendimiento),
    sinVerificar: fila.sin_verificar,
    pesoVariable: fila.peso_variable,
    esEjemplo: fila.es_ejemplo,
    activo: fila.activo,
    proveedor: fila.proveedor,
    codigoDeBarras: fila.codigo_de_barras,

    cantidad,
    minimo,
    estado: comoEsta(cantidad, minimo),

    precioCentimos: fila.precio_centimos === null ? null : Number(fila.precio_centimos),
    costeMilesimas: costeVigente,
    costePorUnidad:
      costeVigente === null ? null : comoPrecioPorUnidad(costeVigente as never, unidadDeUso),
    // Lo que vale lo que hay, con el precio medio ponderado y no con el de la
    // lista: es lo que de verdad costó llenar esa cámara. La cuenta la hace
    // `valorDeLasExistencias`, del motor de coste de M2, que es quien sabe pasar
    // de milésimas a céntimos con un solo redondeo y al final.
    valorCentimos:
      costeMedio === null
        ? null
        : valorDeLasExistencias({
            cantidad: cuantasHay(cantidad),
            coste: enMilesimas(costeMedio),
          }),

    consumo,
    diasDeCobertura: cobertura,
    seAgotaEn: seAgota === null ? null : seAgota.toISOString(),
    sugerencia: pedidoRecomendado(cantidad, consumo.porDia),
  };

  return producto;
}

// ── La lista de productos ────────────────────────────────────────────────────

export const entradaMisProductos = z
  .object({
    texto: z.string().trim().max(120).optional(),
    categoria_id: z.string().uuid().nullable().optional(),
    /** Solo lo que necesita atención: negativo, agotado o bajo mínimo. */
    con_problema: z.coerce.boolean().optional(),
    incluir_ejemplos: z.coerce.boolean().optional(),
    incluir_desactivados: z.coerce.boolean().optional(),
    limite: z.coerce.number().int().min(1).max(200).optional(),
    salto: z.coerce.number().int().min(0).max(100_000).optional(),
  })
  .strict();

export type EntradaMisProductos = z.infer<typeof entradaMisProductos>;

export interface SalidaMisProductos {
  readonly productos: readonly ProductoEnLista[];
  readonly categorias: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly cuantos: number;
  }[];
  readonly proveedores: readonly { readonly id: string; readonly nombre: string }[];
  readonly cuantosHay: number;
  readonly hayMas: boolean;
  readonly puedeVerPrecios: boolean;
  /** Cuántos de ejemplo quedan, para poder ofrecer quitarlos. */
  readonly ejemplos: number;
  /** Lo que vale la cámara entera, sin contar los ejemplos. Solo con permiso. */
  readonly valorTotalCentimos?: number | null;
}

export const misProductos = consulta<EntradaMisProductos, SalidaMisProductos>({
  nombre: 'mis_productos',
  entrada: entradaMisProductos,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    // «**Toda lista larga está acotada**: no se enseñan cincuenta filas
    // idénticas» (Auditoría, parte 8). Cincuenta por defecto, doscientas como
    // mucho, y se dice si hay más.
    const limite = entrada.limite ?? 50;
    const salto = entrada.salto ?? 0;

    const { filas, hoy, desde } = await leerProductos(contexto, localId, {
      texto: entrada.texto ?? '',
      categoriaId: entrada.categoria_id ?? null,
      productoId: null,
      soloConProblema: entrada.con_problema === true,
      incluirEjemplos: entrada.incluir_ejemplos !== false,
      incluirDesactivados: entrada.incluir_desactivados === true,
      limite: limite + 1,
      salto,
    });

    const hayMas = filas.length > limite;
    let productos = filas
      .slice(0, limite)
      .map((fila) => componer(fila, hoy, desde, contexto.ahora));

    if (entrada.con_problema === true) {
      productos = productos.filter((p) => urgenciaDe(p.estado) <= urgenciaDe('bajo_minimo'));
    }

    if (!conPrecios) productos = productos.map(sinPrecios);

    const categorias = await contexto.sql<{ id: string; nombre: string; cuantos: number }[]>`
      select c.id, c.nombre,
             (select count(*)::int from estook.producto p
               where p.categoria_id = c.id and p.activo) as cuantos
        from estook.categoria_de_producto c
       where c.local_id = ${localId} and c.activa
       order by c.orden, c.nombre
    `;

    const proveedores = await contexto.sql<{ id: string; nombre: string }[]>`
      select id, nombre from estook.proveedor
       where local_id = ${localId} and activo
       order by nombre
    `;

    const cuentas = await contexto.sql<{ cuantos: number; ejemplos: number }[]>`
      select count(*) filter (where p.activo)::int as cuantos,
             count(*) filter (where p.activo and p.es_ejemplo)::int as ejemplos
        from estook.producto p
       where p.local_id = ${localId}
    `;

    // El valor de la cámara **sin los ejemplos**: «no cuenta para nada: ni
    // avisos, ni análisis, ni salud de los datos, ni informes» (Manifiesto 8).
    const valor = conPrecios
      ? await contexto.sql<{ total: string | null }[]>`
          select sum(round(e.coste_milesimas * e.cantidad / 1000))::text as total
            from estook.existencias e
            join estook.producto p on p.id = e.producto_id
           where p.local_id = ${localId} and p.activo and not p.es_ejemplo
             and e.cantidad > 0
        `
      : null;

    return {
      productos,
      categorias,
      proveedores,
      cuantosHay: cuentas[0]?.cuantos ?? 0,
      hayMas,
      puedeVerPrecios: conPrecios,
      ejemplos: cuentas[0]?.ejemplos ?? 0,
      ...(conPrecios
        ? {
            valorTotalCentimos:
              valor?.[0]?.total === null || valor?.[0] === undefined ? 0 : Number(valor[0].total),
          }
        : {}),
    };
  },
});

// ── La ficha de un producto ──────────────────────────────────────────────────

export interface PrecioEnFicha {
  readonly id: string;
  readonly proveedor: string | null;
  readonly proveedorId: string | null;
  readonly precioCentimos: number;
  readonly costeMilesimas: number;
  readonly costePorUnidad: string;
  readonly formato: string | null;
  readonly desde: string;
  readonly hasta: string | null;
  readonly vigente: boolean;
  readonly origen: string;
}

export interface MovimientoEnFicha {
  readonly id: string;
  readonly tipo: string;
  readonly cantidad: number;
  readonly cantidadDespues: number;
  readonly motivo: string | null;
  readonly fechaOperativa: string;
  readonly ocurrioEn: string;
  readonly quien: string | null;
  readonly lote: string | null;
  readonly costeMilesimas?: number | null;
}

export interface LoteEnFicha {
  readonly id: string;
  readonly codigo: string | null;
  readonly caducaEl: string | null;
  readonly recibidoEl: string;
  readonly diasParaCaducar: number | null;
}

export interface SalidaUnProducto {
  readonly producto: ProductoEnLista;
  readonly precios: readonly PrecioEnFicha[];
  readonly movimientos: readonly MovimientoEnFicha[];
  readonly lotes: readonly LoteEnFicha[];
  readonly alergenos: readonly string[];
  /**
   * En cuántas fichas técnicas está. «Se avisa de en cuántas está antes de
   * desactivar» (Auditoría 2.6). Hoy es cero siempre porque las fichas son M9:
   * la cuenta vive donde tiene que vivir y se llenará sola.
   */
  readonly enCuantasFichas: number;
  readonly puedeVerPrecios: boolean;
}

export const unProducto = consulta<{ producto_id: string }, SalidaUnProducto>({
  nombre: 'un_producto',
  entrada: z.object({ producto_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    const { filas, hoy, desde } = await leerProductos(contexto, localId, {
      texto: '',
      categoriaId: null,
      productoId: entrada.producto_id,
      soloConProblema: false,
      incluirEjemplos: true,
      incluirDesactivados: true,
      limite: 1,
      salto: 0,
    });

    const fila = filas[0];
    if (!fila) {
      throw new FalloDeAplicacion('no_existe', {
        porque: 'Ese producto no está, o no es de un local que puedas ver.',
      });
    }

    const compuesto = componer(fila, hoy, desde, contexto.ahora);
    const producto = conPrecios ? compuesto : sinPrecios(compuesto);

    // El histórico entero, incluido el de cada proveedor. Es la mitad de la capa
    // inteligente de M6: «histórico de precio por proveedor», y la comparativa
    // que enseña dónde está el dinero fácil.
    const precios = conPrecios
      ? await contexto.sql<
          {
            id: string;
            proveedor: string | null;
            proveedor_id: string | null;
            precio_centimos: string;
            coste_milesimas: string;
            formato: string | null;
            desde: string;
            hasta: string | null;
            origen: string;
          }[]
        >`
          select pr.id, pv.nombre as proveedor, pr.proveedor_id,
                 pr.precio_centimos::text as precio_centimos,
                 pr.coste_milesimas::text as coste_milesimas,
                 pr.formato,
                 to_char(pr.desde, 'YYYY-MM-DD') as desde,
                 to_char(pr.hasta, 'YYYY-MM-DD') as hasta,
                 pr.origen::text as origen
            from estook.precio_de_producto pr
            left join estook.proveedor pv on pv.id = pr.proveedor_id
           where pr.producto_id = ${entrada.producto_id}
           order by pr.hasta nulls first, pr.desde desc
           limit 50
        `
      : [];

    const movimientos = await contexto.sql<
      {
        id: string;
        tipo: string;
        cantidad: string;
        cantidad_despues: string;
        coste_milesimas: string | null;
        motivo: string | null;
        fecha_operativa: string;
        ocurrido_en: string;
        quien: string | null;
        lote: string | null;
      }[]
    >`
      select m.id::text as id, m.tipo::text as tipo,
             m.cantidad::text as cantidad,
             m.cantidad_despues::text as cantidad_despues,
             m.coste_milesimas::text as coste_milesimas,
             m.motivo,
             to_char(m.fecha_operativa, 'YYYY-MM-DD') as fecha_operativa,
             to_char(m.ocurrido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ocurrido_en,
             pe.nombre as quien,
             l.codigo as lote
        from estook.movimiento_de_stock m
        left join estook.persona pe on pe.id = m.persona_id
        left join estook.lote l on l.id = m.lote_id
       where m.producto_id = ${entrada.producto_id}
       order by m.id desc
       limit 50
    `;

    const lotes = await contexto.sql<
      {
        id: string;
        codigo: string | null;
        caduca_el: string | null;
        recibido_el: string;
        dias: number | null;
      }[]
    >`
      select id, codigo,
             to_char(caduca_el, 'YYYY-MM-DD') as caduca_el,
             to_char(recibido_el, 'YYYY-MM-DD') as recibido_el,
             (caduca_el - ${hoy}::date)::int as dias
        from estook.lote
       where producto_id = ${entrada.producto_id}
       order by caduca_el nulls last, recibido_el desc
       limit 30
    `;

    const alergenos = await contexto.sql<{ alergenos: string[] }[]>`
      select alergenos from estook.producto where id = ${entrada.producto_id}
    `;

    return {
      producto,
      precios: precios.map((p) => ({
        id: p.id,
        proveedor: p.proveedor,
        proveedorId: p.proveedor_id,
        precioCentimos: Number(p.precio_centimos),
        costeMilesimas: Number(p.coste_milesimas),
        costePorUnidad: comoPrecioPorUnidad(Number(p.coste_milesimas) as never, fila.unidad_de_uso),
        formato: p.formato,
        desde: p.desde,
        hasta: p.hasta,
        vigente: p.hasta === null,
        origen: p.origen,
      })),
      movimientos: movimientos.map((m) => {
        const linea: MovimientoEnFicha = {
          id: m.id,
          tipo: m.tipo,
          cantidad: Number(m.cantidad),
          cantidadDespues: Number(m.cantidad_despues),
          motivo: m.motivo,
          fechaOperativa: m.fecha_operativa,
          ocurrioEn: m.ocurrido_en,
          quien: m.quien,
          lote: m.lote,
          costeMilesimas: m.coste_milesimas === null ? null : Number(m.coste_milesimas),
        };
        // Igual que arriba: el campo se quita, no se vacía.
        return conPrecios ? linea : sinLosCamposDeDinero(linea, ['costeMilesimas']);
      }),
      lotes: lotes.map((l) => ({
        id: l.id,
        codigo: l.codigo,
        caducaEl: l.caduca_el,
        recibidoEl: l.recibido_el,
        diasParaCaducar: l.dias,
      })),
      alergenos: alergenos[0]?.alergenos ?? [],
      enCuantasFichas: 0,
      puedeVerPrecios: conPrecios,
    };
  },
});

// ── «Hoy» · la pantalla de inicio de la app ──────────────────────────────────

export interface SalidaInventarioHoy {
  /** Lo que hay que atender, ya ordenado por urgencia. */
  readonly atencion: readonly ProductoEnLista[];
  readonly caducan: readonly {
    readonly productoId: string;
    readonly producto: string;
    readonly lote: string | null;
    readonly caducaEl: string;
    readonly dias: number;
  }[];
  readonly sinPrecio: readonly { readonly id: string; readonly nombre: string }[];
  readonly cuantosProductos: number;
  readonly ejemplos: number;
  readonly puedeVerPrecios: boolean;
  readonly valorTotalCentimos?: number | null;
}

/** Cuántos días vista se avisa de una caducidad. Una semana: da tiempo a gastarlo. */
const CADUCAN_EN = 7;

export const inventarioHoy = consulta<Record<string, never>, SalidaInventarioHoy>({
  nombre: 'inventario_hoy',
  entrada: z.object({}).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto) {
    const localId = elLocal(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    // **Los ejemplos no salen aquí, y es la regla que los define**: «no cuenta
    // para nada: ni avisos, ni análisis, ni salud de los datos, ni informes»
    // (Manifiesto 8). Salen en la lista, marcados en gris; en lo que hay que
    // atender, no.
    const { filas, hoy, desde } = await leerProductos(contexto, localId, {
      texto: '',
      categoriaId: null,
      productoId: null,
      soloConProblema: true,
      incluirEjemplos: false,
      incluirDesactivados: false,
      limite: 200,
      salto: 0,
    });

    const todos = filas.map((fila) => componer(fila, hoy, desde, contexto.ahora));

    const atencion = todos
      .filter((p) => urgenciaDe(p.estado) <= urgenciaDe('bajo_minimo'))
      .sort((a, b) => {
        const porEstado = urgenciaDe(a.estado) - urgenciaDe(b.estado);
        if (porEstado !== 0) return porEstado;
        // Con el mismo estado, primero lo que se agota antes.
        const diasA = a.diasDeCobertura ?? Number.POSITIVE_INFINITY;
        const diasB = b.diasDeCobertura ?? Number.POSITIVE_INFINITY;
        return diasA - diasB;
      })
      .map((p) => (conPrecios ? p : sinPrecios(p)));

    const caducan = await contexto.sql<
      {
        producto_id: string;
        producto: string;
        lote: string | null;
        caduca_el: string;
        dias: number;
      }[]
    >`
      select l.producto_id, p.nombre as producto, l.codigo as lote,
             to_char(l.caduca_el, 'YYYY-MM-DD') as caduca_el,
             (l.caduca_el - ${hoy}::date)::int as dias
        from estook.lote l
        join estook.producto p on p.id = l.producto_id
       where l.local_id = ${localId}
         and not p.es_ejemplo
         and p.activo
         and l.caduca_el is not null
         and l.caduca_el <= ${hoy}::date + ${CADUCAN_EN}
       order by l.caduca_el
       limit 50
    `;

    // «Un producto sin precio se usa igual: cuenta cero, sale en amarillo en las
    // fichas que lo llevan y Fogón lo recuerda hasta el primer albarán donde
    // aparezca» (Manifiesto 12). Esto es ese recordatorio, sin gastar un crédito.
    const sinPrecio = conPrecios
      ? await contexto.sql<{ id: string; nombre: string }[]>`
          select p.id, p.nombre
            from estook.producto p
           where p.local_id = ${localId}
             and p.activo
             and not p.es_ejemplo
             and not exists (
               select 1 from estook.precio_de_producto pr
                where pr.producto_id = p.id and pr.hasta is null
             )
           order by p.nombre
           limit 50
        `
      : [];

    const cuentas = await contexto.sql<{ cuantos: number; ejemplos: number }[]>`
      select count(*) filter (where p.activo)::int as cuantos,
             count(*) filter (where p.activo and p.es_ejemplo)::int as ejemplos
        from estook.producto p
       where p.local_id = ${localId}
    `;

    const valor = conPrecios
      ? await contexto.sql<{ total: string | null }[]>`
          select sum(round(e.coste_milesimas * e.cantidad / 1000))::text as total
            from estook.existencias e
            join estook.producto p on p.id = e.producto_id
           where p.local_id = ${localId} and p.activo and not p.es_ejemplo
             and e.cantidad > 0
        `
      : null;

    return {
      atencion,
      caducan: caducan.map((c) => ({
        productoId: c.producto_id,
        producto: c.producto,
        lote: c.lote,
        caducaEl: c.caduca_el,
        dias: c.dias,
      })),
      sinPrecio,
      cuantosProductos: cuentas[0]?.cuantos ?? 0,
      ejemplos: cuentas[0]?.ejemplos ?? 0,
      puedeVerPrecios: conPrecios,
      ...(conPrecios
        ? {
            valorTotalCentimos:
              valor?.[0]?.total === null || valor?.[0] === undefined ? 0 : Number(valor[0].total),
          }
        : {}),
    };
  },
});

// ── Los proveedores ──────────────────────────────────────────────────────────

export interface ProveedorEnLista {
  readonly id: string;
  readonly nombre: string;
  readonly notas: string | null;
  readonly activo: boolean;
  readonly cuantosProductos: number;
  /** Cuánto se le compra, sumando el precio vigente de lo suyo. Con permiso. */
  readonly gastoMedioCentimos?: number | null;
}

export const misProveedores = consulta<
  { incluir_desactivados?: boolean | undefined },
  { readonly proveedores: readonly ProveedorEnLista[]; readonly puedeVerPrecios: boolean }
>({
  nombre: 'mis_proveedores',
  entrada: z.object({ incluir_desactivados: z.coerce.boolean().optional() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    const filas = await contexto.sql<
      { id: string; nombre: string; notas: string | null; activo: boolean; cuantos: number }[]
    >`
      select pv.id, pv.nombre, pv.notas, pv.activo,
             (select count(*)::int from estook.producto p
               where p.proveedor_id = pv.id and p.activo) as cuantos
        from estook.proveedor pv
       where pv.local_id = ${localId}
         and (${entrada.incluir_desactivados === true} or pv.activo)
       order by pv.activo desc, pv.nombre
       limit 200
    `;

    return {
      proveedores: filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        notas: f.notas,
        activo: f.activo,
        cuantosProductos: f.cuantos,
      })),
      puedeVerPrecios: conPrecios,
    };
  },
});
