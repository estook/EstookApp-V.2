import { z } from 'zod';
import {
  VENTANA_DE_CONSUMO,
  cantidad as cuantasHay,
  comoEsta,
  comoPrecioPorUnidad,
  consumoMedioDiario,
  cuandoCae,
  diasDeCobertura,
  fechaEnElLocal,
  horaEnElLocal,
  ivaDeCompraPorDefecto,
  masDias,
  milesimas as enMilesimas,
  cuantoPedir,
  previsionDeAgotamiento,
  proximoReparto,
  urgenciaDe,
  valorDeLasExistencias,
  type Consumo,
  type EstadoDeExistencias,
  type FechaOperativa,
  type SugerenciaDeCompra,
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
  /** Si el valor sale del precio de hoy porque lo que hay entró sin coste. */
  readonly valorEsEstimado?: boolean;

  // ── La capa inteligente ────────────────────────────────────────────────────
  readonly consumo: Consumo;
  readonly diasDeCobertura: number | null;
  /** ISO completo, con hora: «se agota el viernes a las 20:30». */
  readonly seAgotaEn: string | null;
  /** Cuánto pedir en cajas enteras y por qué, contando con el reparto (M7). */
  readonly sugerencia: SugerenciaDeCompra | null;

  // ── M7, repaso · lo que vio Richi ──────────────────────────────────────────
  /** Si tiene algo en el congelador: un lote congelado que no se ha quitado. */
  readonly congelado: boolean;
  /**
   * El IVA que se paga al comprarlo: el que se le eligió, o el de su categoría.
   * Nulo: sin tipo, como en Canarias. No es un importe: lo ve todo el mundo.
   */
  readonly ivaDeCompra: number | null;
  /** Si ese tipo lo eligió alguien, o sale de la categoría. */
  readonly ivaDeCompraElegido: boolean;
  /** Lo que trae cada unidad, cuando se cuenta por unidades: 250 (g). */
  readonly contenidoPorUnidad: number | null;
  readonly unidadDelContenido: string | null;
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
  // No es un importe, pero dice de dónde sale uno: a quien no ve precios no le
  // sirve de nada y es una pista de más.
  'valorEsEstimado',
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
  // M7 · cómo reparte su proveedor principal, para que la sugerencia sepa qué día
  // llega lo que se pide y hasta cuándo tiene que durar.
  dias_de_reparto: number[] | null;
  plazo_de_entrega: number | null;
  hora_limite: string | null;
  // M7, repaso · congelado, IVA de compra y lo que trae cada unidad.
  congelado: boolean;
  iva_de_compra: string | null;
  territorio: string;
  contenido_por_unidad: string | null;
  unidad_del_contenido: string | null;
}

/** El reloj de pared del local, que es con lo que cuenta un proveedor. */
interface RelojDelLocal {
  readonly hoy: FechaOperativa;
  readonly hora: string;
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
    /**
     * Solo los de este proveedor principal (M7). Es lo que sugiere un pedido: lo
     * de Makro que no llega a su reparto de después.
     */
    proveedorId?: string | null;
    soloConProblema: boolean;
    /**
     * Solo los que no tienen precio vigente.
     *
     * Es la vista «Sin precio» de la pantalla de Productos, y va en el servidor y
     * no filtrando la lista al llegar porque **la lista viene acotada a
     * cincuenta**: filtrar cincuenta filas ya traidas daria «no hay ninguno» en
     * un local con trescientos productos y los sin precio en la cola del
     * alfabeto. Un filtro que solo funciona cuando la lista cabe entera es un
     * filtro que miente.
     */
    soloSinPrecio: boolean;
    incluirEjemplos: boolean;
    incluirDesactivados: boolean;
    /**
     * Solo los desactivados, que es la vista «Desactivados».
     *
     * No es lo mismo que `incluirDesactivados`, y la diferencia importa: ese
     * ensena los activos **y** los desactivados juntos, que era el interruptor de
     * antes; este ensena solo los que se quitaron de en medio, que es lo que se
     * quiere cuando se va a buscar uno para traerlo de vuelta.
     */
    soloDesactivados: boolean;
    /** Solo los que tienen algo congelado, que es la vista «Congelados» (M7, repaso). */
    soloCongelados?: boolean;
    limite: number;
    salto: number;
  },
): Promise<{
  filas: FilaDeProducto[];
  hoy: FechaOperativa;
  desde: FechaOperativa;
  reloj: RelojDelLocal;
}> {
  const zonas = await contexto.sql<{ zona_horaria: string }[]>`
    select zona_horaria from estook.local where id = ${localId}
  `;
  const zona = zonas[0]?.zona_horaria ?? 'Europe/Madrid';
  const hoy = fechaEnElLocal(contexto.ahora, zona);
  const desde = masDias(hoy, -VENTANA_DE_CONSUMO);
  const reloj: RelojDelLocal = { hoy, hora: horaEnElLocal(contexto.ahora, zona) };

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
           ) as dias_con_datos,
           pv.dias_de_reparto::int[] as dias_de_reparto,
           pv.plazo_de_entrega::int as plazo_de_entrega,
           to_char(pv.hora_limite, 'HH24:MI') as hora_limite,
           exists (
             select 1 from estook.lote lo
              where lo.producto_id = p.id
                and lo.congelado_el is not null and lo.retirado_en is null
           ) as congelado,
           p.iva_de_compra::text as iva_de_compra,
           lc.territorio::text as territorio,
           p.contenido_por_unidad::text as contenido_por_unidad,
           p.unidad_del_contenido::text as unidad_del_contenido
      from estook.producto p
      join estook.local lc on lc.id = p.local_id
      left join estook.categoria_de_producto c on c.id = p.categoria_id
      left join estook.proveedor pv on pv.id = p.proveedor_id
      left join estook.existencias e on e.producto_id = p.id
      left join estook.precio_vigente(p.id) pr on true
     where p.local_id = ${localId}
       and (${filtros.productoId}::uuid is null or p.id = ${filtros.productoId}::uuid)
       and (${filtros.proveedorId ?? null}::uuid is null
            or p.proveedor_id = ${filtros.proveedorId ?? null}::uuid)
       and (${filtros.incluirDesactivados} or p.activo)
       and (not ${filtros.soloDesactivados} or not p.activo)
       and (${filtros.incluirEjemplos} or not p.es_ejemplo)
       and (${filtros.categoriaId}::uuid is null or p.categoria_id = ${filtros.categoriaId}::uuid)
       and (not ${filtros.soloSinPrecio} or pr.precio_centimos is null)
       and (not ${filtros.soloCongelados ?? false} or exists (
             select 1 from estook.lote lo
              where lo.producto_id = p.id
                and lo.congelado_el is not null and lo.retirado_en is null
           ))
       and (
         ${filtros.texto} = ''
         or estook.sin_acentos(p.nombre) like '%' || estook.sin_acentos(${filtros.texto}) || '%'
         or similarity(estook.sin_acentos(p.nombre), estook.sin_acentos(${filtros.texto})) > 0.3
         or p.codigo_de_barras = ${filtros.texto}
       )
     order by p.nombre
     limit ${filtros.limite} offset ${filtros.salto}
  `;

  return { filas, hoy, desde, reloj };
}

/**
 * Cuándo llegaría lo que se pida hoy de este producto, si su proveedor principal
 * tiene días de reparto. Nulo si no: la sugerencia lo dice y calcula cinco días.
 */
function cuandoLlegaria(fila: FilaDeProducto, reloj: RelojDelLocal) {
  if (fila.dias_de_reparto === null || fila.dias_de_reparto.length === 0) return null;
  const reparto = proximoReparto(
    {
      dias: fila.dias_de_reparto,
      plazo: fila.plazo_de_entrega ?? 1,
      horaLimite: fila.hora_limite,
    },
    reloj.hoy,
    reloj.hora,
  );
  return reparto === null
    ? null
    : { hoy: reloj.hoy, llega: reparto.llega, siguiente: reparto.siguiente };
}

/**
 * Lo que vale lo que hay en cámara, y si es una estimación.
 *
 * ── El caso que esto arregla ─────────────────────────────────────────────────
 *
 * Una ficha decía «500 ud · lo que hay vale 0,00 €». Las 500 habían entrado con
 * un ajuste, y un ajuste no trae coste: el precio medio se quedó a cero. Es la
 * cuenta bien hecha y el dato mal dicho.
 *
 * Cuando el medio es cero —o no hay— y el producto tiene precio, se valora **a su
 * precio de hoy**, y se marca como estimado para que la pantalla lo diga. En
 * cuanto entre género con su precio, el medio deja de ser cero y manda él.
 */
function loQueValeLoQueHay(
  cantidad: number,
  costeMedio: number | null,
  costeVigente: number | null,
): { readonly valor: number | null; readonly estimado: boolean } {
  const sinCoste = costeMedio === null || costeMedio === 0;
  const coste = sinCoste && cantidad > 0 && costeVigente !== null ? costeVigente : costeMedio;
  if (coste === null) return { valor: null, estimado: false };
  return {
    valor: valorDeLasExistencias({ cantidad: cuantasHay(cantidad), coste: enMilesimas(coste) }),
    estimado: coste !== costeMedio,
  };
}

function componer(
  fila: FilaDeProducto,
  hoy: FechaOperativa,
  desde: FechaOperativa,
  ahora: Date,
  reloj: RelojDelLocal,
) {
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
  const valorado = loQueValeLoQueHay(cantidad, costeMedio, costeVigente);

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
    valorCentimos: valorado.valor,
    valorEsEstimado: valorado.estimado,

    consumo,
    diasDeCobertura: cobertura,
    seAgotaEn: seAgota === null ? null : seAgota.toISOString(),
    // La misma cuenta que el pedido de su proveedor y que «hoy toca pedir»: hasta
    // el reparto de después, con margen, en cajas enteras (M7, `cuantoPedir`).
    sugerencia: cuantoPedir(
      {
        existencias: cantidad,
        consumoPorDia: consumo.porDia,
        minimo,
        factor: Number(fila.factor),
        unidadDeUso,
      },
      cuandoLlegaria(fila, reloj),
    ),

    congelado: fila.congelado,
    // El IVA de compra sale del dominio si nadie lo ha elegido: la categoría y el
    // territorio lo deciden, y en Canarias no se supone nada.
    ivaDeCompra:
      fila.iva_de_compra === null
        ? ivaDeCompraPorDefecto(fila.categoria_fiscal, fila.territorio)
        : Number(fila.iva_de_compra),
    ivaDeCompraElegido: fila.iva_de_compra !== null,
    contenidoPorUnidad:
      fila.contenido_por_unidad === null ? null : Number(fila.contenido_por_unidad),
    unidadDelContenido: fila.unidad_del_contenido,
  };

  return producto;
}

/** Cómo escribe este local sus precios de compra, y si ya se les quitó el IVA. */
async function comoApuntaLosPrecios(
  contexto: Contexto,
  localId: string,
): Promise<{
  readonly conIva: boolean;
  readonly ivaQuitadoEn: string | null;
  readonly territorio: string;
}> {
  const filas = await contexto.sql<
    { con_iva: boolean; quitado: string | null; territorio: string }[]
  >`
    select precios_de_compra_con_iva as con_iva,
           to_char(iva_quitado_de_los_precios_en, 'YYYY-MM-DD') as quitado,
           territorio::text as territorio
      from estook.local where id = ${localId}
  `;
  return {
    conIva: filas[0]?.con_iva === true,
    ivaQuitadoEn: filas[0]?.quitado ?? null,
    territorio: filas[0]?.territorio ?? 'peninsula_y_baleares',
  };
}

/**
 * Los productos cuyo proveedor principal es este, con su sugerencia hecha (M7).
 *
 * Es **la misma lectura y la misma cuenta** que la lista de productos: por eso la
 * sugerencia del pedido de Makro y la de la ficha del aceite dicen lo mismo. Trae
 * los importes enteros; quien la use para contestar a alguien que no ve precios
 * tiene que quitárselos.
 */
export async function productosDelProveedor(
  contexto: Contexto,
  localId: string,
  proveedorId: string,
): Promise<ProductoEnLista[]> {
  const { filas, hoy, desde, reloj } = await leerProductos(contexto, localId, {
    texto: '',
    categoriaId: null,
    productoId: null,
    proveedorId,
    soloConProblema: false,
    soloSinPrecio: false,
    soloDesactivados: false,
    incluirEjemplos: true,
    incluirDesactivados: false,
    limite: 200,
    salto: 0,
  });
  return filas.map((fila) => componer(fila, hoy, desde, contexto.ahora, reloj));
}

/** Todos los activos del local, con su sugerencia y su consumo. Para comparar precios. */
export async function productosActivos(
  contexto: Contexto,
  localId: string,
): Promise<ProductoEnLista[]> {
  const { filas, hoy, desde, reloj } = await leerProductos(contexto, localId, {
    texto: '',
    categoriaId: null,
    productoId: null,
    soloConProblema: false,
    soloSinPrecio: false,
    soloDesactivados: false,
    incluirEjemplos: false,
    incluirDesactivados: false,
    limite: 200,
    salto: 0,
  });
  return filas.map((fila) => componer(fila, hoy, desde, contexto.ahora, reloj));
}

/** Quita el dinero de un producto, para quien no ve precios. */
export function sinElDinero(producto: ProductoEnLista): ProductoEnLista {
  return sinPrecios(producto);
}

// ── La lista de productos ────────────────────────────────────────────────────

export const entradaMisProductos = z
  .object({
    texto: z.string().trim().max(120).optional(),
    categoria_id: z.string().uuid().nullable().optional(),
    /** Solo lo que necesita atención: negativo, agotado o bajo mínimo. */
    con_problema: z.coerce.boolean().optional(),
    /** Solo los que no tienen precio vigente. Es la vista «Sin precio». */
    sin_precio: z.coerce.boolean().optional(),
    /** Solo los que se quitaron de en medio. Es la vista «Desactivados». */
    solo_desactivados: z.coerce.boolean().optional(),
    /** Solo los que tienen algo congelado. Es la vista «Congelados» (M7, repaso). */
    congelados: z.coerce.boolean().optional(),
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
  /** Si en este local los precios de compra se escriben con IVA (M7, repaso). */
  readonly preciosConIva: boolean;
  /** El día que se les quitó el IVA a los precios que ya había. Una vez. */
  readonly ivaQuitadoEn: string | null;
  /** Dónde está a efectos fiscales: de ahí sale el IVA que se propone al dar de alta. */
  readonly territorio: string;
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

    const { filas, hoy, desde, reloj } = await leerProductos(contexto, localId, {
      texto: entrada.texto ?? '',
      categoriaId: entrada.categoria_id ?? null,
      productoId: null,
      soloConProblema: entrada.con_problema === true,
      soloSinPrecio: entrada.sin_precio === true,
      soloDesactivados: entrada.solo_desactivados === true,
      soloCongelados: entrada.congelados === true,
      incluirEjemplos: entrada.incluir_ejemplos !== false,
      incluirDesactivados: entrada.incluir_desactivados === true,
      limite: limite + 1,
      salto,
    });
    const precios = await comoApuntaLosPrecios(contexto, localId);

    const hayMas = filas.length > limite;
    let productos = filas
      .slice(0, limite)
      .map((fila) => componer(fila, hoy, desde, contexto.ahora, reloj));

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
          -- Lo que entró sin coste —un ajuste, o un producto dado de alta antes de
          -- que el alta apuntara lo que había— tiene el medio a cero, y contarlo a
          -- cero es decir que 500 burratas no valen nada: se cuenta a su precio de hoy.
          select sum(round(
                   coalesce(nullif(e.coste_milesimas, 0), pr.coste_milesimas, 0) * e.cantidad / 1000
                 ))::text as total
            from estook.existencias e
            join estook.producto p on p.id = e.producto_id
            left join estook.precio_vigente(p.id) pr on true
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
      preciosConIva: precios.conIva,
      ivaQuitadoEn: precios.ivaQuitadoEn,
      territorio: precios.territorio,
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
  /**
   * Quién lo puso.
   *
   * Se guardaba desde el primer día de M6 en `precio_de_producto.creado_por` y
   * **no salía de la base de datos**: la ficha enseñaba el precio y la fecha, y
   * la única columna de todo el esquema que se escribía sin que nadie la leyera.
   *
   * «Cada persona entra con su PIN, y **lo que hace queda con su nombre**»
   * (Manifiesto 8). El libro de movimientos ya lo cumplía; el de precios, no. Y
   * es donde más falta hace: un precio mal metido se arrastra a todos los
   * escandallos, y lo primero que se pregunta es quién lo puso.
   *
   * Nulo si esa persona ya no está: la fila del precio no se borra por eso.
   */
  readonly quien: string | null;
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
  /** Cuándo se congeló. Nulo: no está congelado (M7, repaso). */
  readonly congeladoEl: string | null;
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
  /** Si en este local los precios de compra se escriben con IVA (M7, repaso). */
  readonly preciosConIva: boolean;
}

export const unProducto = consulta<{ producto_id: string }, SalidaUnProducto>({
  nombre: 'un_producto',
  entrada: z.object({ producto_id: z.string().uuid() }).strict(),
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    const { filas, hoy, desde, reloj } = await leerProductos(contexto, localId, {
      texto: '',
      categoriaId: null,
      productoId: entrada.producto_id,
      soloConProblema: false,
      soloSinPrecio: false,
      soloDesactivados: false,
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

    const compuesto = componer(fila, hoy, desde, contexto.ahora, reloj);
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
            quien: string | null;
          }[]
        >`
          select pr.id, pv.nombre as proveedor, pr.proveedor_id,
                 pr.precio_centimos::text as precio_centimos,
                 pr.coste_milesimas::text as coste_milesimas,
                 pr.formato,
                 to_char(pr.desde, 'YYYY-MM-DD') as desde,
                 to_char(pr.hasta, 'YYYY-MM-DD') as hasta,
                 pr.origen::text as origen,
                 -- Union por la izquierda, no interna: si quien lo puso ya no esta,
                 -- el precio sigue estando. Con una union interna el historico
                 -- perderia filas cada vez que alguien deja el local, que es justo
                 -- lo contrario de para lo que existe un historico.
                 pe.nombre as quien
            from estook.precio_de_producto pr
            left join estook.proveedor pv on pv.id = pr.proveedor_id
            left join estook.persona pe on pe.id = pr.creado_por
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

    // Solo los que siguen ahí: un lote que se gastó o se tiró ya no es de esta
    // cámara, y enseñarlo es lo que hacía que «se quedara siempre» (M7, repaso).
    const lotes = await contexto.sql<
      {
        id: string;
        codigo: string | null;
        caduca_el: string | null;
        recibido_el: string;
        dias: number | null;
        congelado_el: string | null;
      }[]
    >`
      select id, codigo,
             to_char(caduca_el, 'YYYY-MM-DD') as caduca_el,
             to_char(recibido_el, 'YYYY-MM-DD') as recibido_el,
             (caduca_el - ${hoy}::date)::int as dias,
             to_char(congelado_el, 'YYYY-MM-DD') as congelado_el
        from estook.lote
       where producto_id = ${entrada.producto_id}
         and retirado_en is null
       order by caduca_el nulls last, recibido_el desc
       limit 30
    `;
    const comoApunta = await comoApuntaLosPrecios(contexto, localId);

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
        quien: p.quien,
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
        congeladoEl: l.congelado_el,
      })),
      alergenos: alergenos[0]?.alergenos ?? [],
      enCuantasFichas: 0,
      puedeVerPrecios: conPrecios,
      preciosConIva: comoApunta.conIva,
    };
  },
});

// ── «Hoy» · la pantalla de inicio de la app ──────────────────────────────────

export interface SalidaInventarioHoy {
  /** Lo que hay que atender, ya ordenado por urgencia. */
  readonly atencion: readonly ProductoEnLista[];
  readonly caducan: readonly {
    /** El lote, para poder quitarlo desde aquí cuando se gasta o se tira. */
    readonly loteId: string;
    readonly productoId: string;
    readonly producto: string;
    readonly lote: string | null;
    readonly caducaEl: string;
    readonly dias: number;
    readonly congelado: boolean;
    readonly unidadDeUso: string;
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
    const { filas, hoy, desde, reloj } = await leerProductos(contexto, localId, {
      texto: '',
      categoriaId: null,
      productoId: null,
      soloConProblema: true,
      soloSinPrecio: false,
      soloDesactivados: false,
      incluirEjemplos: false,
      incluirDesactivados: false,
      limite: 200,
      salto: 0,
    });

    const todos = filas.map((fila) => componer(fila, hoy, desde, contexto.ahora, reloj));

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
        lote_id: string;
        producto_id: string;
        producto: string;
        lote: string | null;
        caduca_el: string;
        dias: number;
        congelado: boolean;
        unidad_de_uso: string;
      }[]
    >`
      select l.id as lote_id, l.producto_id, p.nombre as producto, l.codigo as lote,
             to_char(l.caduca_el, 'YYYY-MM-DD') as caduca_el,
             (l.caduca_el - ${hoy}::date)::int as dias,
             l.congelado_el is not null as congelado,
             p.unidad_de_uso::text as unidad_de_uso
        from estook.lote l
        join estook.producto p on p.id = l.producto_id
       where l.local_id = ${localId}
         and not p.es_ejemplo
         and p.activo
         and l.caduca_el is not null
         -- Lo que ya se gastó o se tiró no avisa más (M7, repaso).
         and l.retirado_en is null
         -- El ::int no es adorno: sin el, el parametro viaja sin tipo y
         -- Postgres no sabe si sumar a una fecha es sumar dias o sumar un
         -- intervalo. Contesta "operator is not unique: date + unknown" y tumba
         -- la consulta ENTERA, no solo este bloque. La pantalla Hoy de M6
         -- llevaba rota desde que se escribio: un 500 a todo el mundo, siempre.
         and l.caduca_el <= ${hoy}::date + ${CADUCAN_EN}::int
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
          -- Lo que entró sin coste —un ajuste, o un producto dado de alta antes de
          -- que el alta apuntara lo que había— tiene el medio a cero, y contarlo a
          -- cero es decir que 500 burratas no valen nada: se cuenta a su precio de hoy.
          select sum(round(
                   coalesce(nullif(e.coste_milesimas, 0), pr.coste_milesimas, 0) * e.cantidad / 1000
                 ))::text as total
            from estook.existencias e
            join estook.producto p on p.id = e.producto_id
            left join estook.precio_vigente(p.id) pr on true
           where p.local_id = ${localId} and p.activo and not p.es_ejemplo
             and e.cantidad > 0
        `
      : null;

    return {
      atencion,
      caducan: caducan.map((c) => ({
        loteId: c.lote_id,
        productoId: c.producto_id,
        producto: c.producto,
        lote: c.lote,
        caducaEl: c.caduca_el,
        dias: c.dias,
        congelado: c.congelado,
        unidadDeUso: c.unidad_de_uso,
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
  // ── M7 · lo que la lista necesita para decidir a quién llamar hoy ─────────
  readonly contacto: string | null;
  readonly telefono: string | null;
  readonly diasDeReparto: readonly number[];
  /** «Llega el martes», si se le pide ahora. Nulo sin días de reparto. */
  readonly llegaCuando: string | null;
  /** Para llegar a su próximo reparto hay que pedirle hoy. */
  readonly tocaPedirHoy: boolean;
  readonly pedirAntesDe: string | null;
  readonly pedidosAbiertos: number;
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

    const zonas = await contexto.sql<{ zona_horaria: string }[]>`
      select zona_horaria from estook.local where id = ${localId}
    `;
    const zona = zonas[0]?.zona_horaria ?? 'Europe/Madrid';
    const reloj: RelojDelLocal = {
      hoy: fechaEnElLocal(contexto.ahora, zona),
      hora: horaEnElLocal(contexto.ahora, zona),
    };

    const filas = await contexto.sql<
      {
        id: string;
        nombre: string;
        notas: string | null;
        activo: boolean;
        cuantos: number;
        contacto: string | null;
        telefono: string | null;
        dias: number[];
        plazo: number;
        hora_limite: string | null;
        abiertos: number;
      }[]
    >`
      select pv.id, pv.nombre, pv.notas, pv.activo,
             (select count(*)::int from estook.producto p
               where p.proveedor_id = pv.id and p.activo) as cuantos,
             pv.contacto, pv.telefono, pv.dias_de_reparto::int[] as dias,
             pv.plazo_de_entrega::int as plazo, to_char(pv.hora_limite, 'HH24:MI') as hora_limite,
             (select count(*)::int from estook.pedido_de_compra pd
               where pd.proveedor_id = pv.id and pd.estado in ('borrador', 'enviado')) as abiertos
        from estook.proveedor pv
       where pv.local_id = ${localId}
         and (${entrada.incluir_desactivados === true} or pv.activo)
       order by pv.activo desc, pv.nombre
       limit 200
    `;

    return {
      proveedores: filas.map((f) => {
        const reparto =
          f.activo && f.dias.length > 0
            ? proximoReparto(
                { dias: f.dias, plazo: f.plazo, horaLimite: f.hora_limite },
                reloj.hoy,
                reloj.hora,
              )
            : null;
        return {
          id: f.id,
          nombre: f.nombre,
          notas: f.notas,
          activo: f.activo,
          cuantosProductos: f.cuantos,
          contacto: f.contacto,
          telefono: f.telefono,
          diasDeReparto: f.dias,
          llegaCuando: reparto === null ? null : cuandoCae(reparto.llega, reloj.hoy),
          tocaPedirHoy: reparto !== null && reparto.pedirEl === reloj.hoy,
          pedirAntesDe: reparto?.pedirAntesDe ?? null,
          pedidosAbiertos: f.abiertos,
        };
      }),
      puedeVerPrecios: conPrecios,
    };
  },
});

// ── El libro de movimientos, entero ──────────────────────────────────────────

/**
 * Una linea del libro, como la ve la pantalla de Movimientos.
 *
 * ── Por que esta consulta existe ─────────────────────────────────────────────
 *
 * «El stock es un libro de movimientos, y no hay ninguna tabla con una cantidad
 * editable» (regla 8). Eso es lo que hace que la camara se pueda auditar: el
 * libro solo se anade, no tiene `update` concedido a nadie y un disparador lo
 * rechaza.
 *
 * Y hasta hoy **el libro no se podia leer**. Sus lineas solo salian dentro de la
 * ficha de un producto, de un producto a la vez y las cincuenta ultimas. Un libro
 * que solo se lee por paginas sueltas no sirve para lo que sirve un libro, que es
 * cuadrar: «esta manana faltaban cuatro kilos de pulpo, ¿quien apunto que?» no se
 * puede contestar abriendo fichas de una en una.
 *
 * No lleva ni una cuenta nueva: cada linea guarda **el saldo de despues**, que es
 * «el resultado congelado del unico dueno, como el saldo de una libreta». Aqui
 * solo se lee y se ordena.
 */
export interface MovimientoDelLibro {
  readonly id: string;
  readonly tipo: string;
  readonly producto: string;
  readonly productoId: string;
  readonly unidadDeUso: string;
  readonly cantidad: number;
  readonly cantidadDespues: number;
  readonly motivo: string | null;
  readonly fechaOperativa: string;
  readonly ocurrioEn: string;
  /**
   * Quien lo apunto.
   *
   * «Lo que hace cada uno queda con su nombre» (Manifiesto 8). Es la mitad de la
   * razon de que esta pantalla exista.
   */
  readonly quien: string | null;
  readonly lote: string | null;
  readonly esEjemplo: boolean;
  /** Lo que costo, si quien mira puede ver dinero. Si no, no viaja. */
  readonly costeMilesimas?: number | null;
}

export const entradaMovimientos = z
  .object({
    /**
     * De que tipo. Es la vista de la pantalla: todo, entradas, salidas o ajustes.
     *
     * Se valida contra la lista cerrada y no se cuela en el `where` a pelo: es
     * texto que llega de fuera.
     */
    tipo: z.enum(['entrada', 'salida', 'ajuste']).optional(),
    producto_id: z.string().uuid().optional(),
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    limite: z.coerce.number().int().min(1).max(200).optional(),
    salto: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type EntradaMovimientos = z.infer<typeof entradaMovimientos>;

export interface SalidaMovimientos {
  readonly movimientos: readonly MovimientoDelLibro[];
  readonly hayMas: boolean;
  readonly puedeVerPrecios: boolean;
  /**
   * La fecha operativa de hoy **en el local**.
   *
   * Va aqui para que la pantalla pueda escribir «hoy» y «ayer» sin mirar el reloj
   * del navegador, que es lo que prohibe la regla 10 y con razon: la tablet de la
   * cocina puede estar en otra zona horaria, y a las dos de la manana «hoy» no
   * significa lo mismo para el reloj que para la jornada de un bar que cierra a
   * las cinco.
   */
  readonly hoy: string;
}

export const misMovimientos = consulta<EntradaMovimientos, SalidaMovimientos>({
  nombre: 'mis_movimientos',
  entrada: entradaMovimientos,
  exige: 'app.inventario',

  async ejecutar(contexto, entrada) {
    const localId = elLocal(contexto);
    const conPrecios = await puedeVerPrecios(contexto, localId);

    const zonas = await contexto.sql<{ zona_horaria: string }[]>`
      select zona_horaria from estook.local where id = ${localId}
    `;
    const hoy = fechaEnElLocal(contexto.ahora, zonas[0]?.zona_horaria ?? 'Europe/Madrid');

    // «**Toda lista larga esta acotada**» (Auditoria, parte 8). Cincuenta por
    // defecto, doscientos como mucho, y se dice si hay mas. El libro de un local
    // en marcha crece todos los dias: es justo la lista que no puede nacer sin
    // tope.
    const limite = entrada.limite ?? 50;
    const salto = entrada.salto ?? 0;

    const filas = await contexto.sql<
      {
        id: string;
        tipo: string;
        producto: string;
        producto_id: string;
        unidad_de_uso: string;
        cantidad: string;
        cantidad_despues: string;
        coste_milesimas: string | null;
        motivo: string | null;
        fecha_operativa: string;
        ocurrido_en: string;
        quien: string | null;
        lote: string | null;
        es_ejemplo: boolean;
      }[]
    >`
      select m.id::text as id, m.tipo::text as tipo,
             p.nombre as producto, p.id::text as producto_id,
             p.unidad_de_uso::text as unidad_de_uso,
             m.cantidad::text as cantidad,
             m.cantidad_despues::text as cantidad_despues,
             m.coste_milesimas::text as coste_milesimas,
             m.motivo,
             to_char(m.fecha_operativa, 'YYYY-MM-DD') as fecha_operativa,
             to_char(m.ocurrido_en, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as ocurrido_en,
             pe.nombre as quien,
             l.codigo as lote,
             p.es_ejemplo as es_ejemplo
        from estook.movimiento_de_stock m
        join estook.producto p on p.id = m.producto_id
        left join estook.persona pe on pe.id = m.persona_id
        left join estook.lote l on l.id = m.lote_id
       where p.local_id = ${localId}
         and (${entrada.tipo ?? null}::text is null or m.tipo::text = ${entrada.tipo ?? null})
         and (${entrada.producto_id ?? null}::uuid is null
              or m.producto_id = ${entrada.producto_id ?? null}::uuid)
         and (${entrada.desde ?? null}::date is null
              or m.fecha_operativa >= ${entrada.desde ?? null}::date)
       order by m.ocurrido_en desc, m.id desc
       limit ${limite + 1} offset ${salto}
    `;

    const hayMas = filas.length > limite;

    return {
      movimientos: filas.slice(0, limite).map((f) => {
        const linea: MovimientoDelLibro = {
          id: f.id,
          tipo: f.tipo,
          producto: f.producto,
          productoId: f.producto_id,
          unidadDeUso: f.unidad_de_uso,
          cantidad: Number(f.cantidad),
          cantidadDespues: Number(f.cantidad_despues),
          motivo: f.motivo,
          fechaOperativa: f.fecha_operativa,
          ocurrioEn: f.ocurrido_en,
          quien: f.quien,
          lote: f.lote,
          esEjemplo: f.es_ejemplo,
        };
        // El coste **no se esconde: no se manda**. Es la regla que ordena este
        // fichero entero, y un cocinero tiene esta pantalla igual que las demas.
        return conPrecios
          ? {
              ...linea,
              costeMilesimas: f.coste_milesimas === null ? null : Number(f.coste_milesimas),
            }
          : linea;
      }),
      hayMas,
      puedeVerPrecios: conPrecios,
      hoy,
    };
  },
});
