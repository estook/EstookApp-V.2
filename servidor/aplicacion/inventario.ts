import {
  CAMARA_VACIA,
  cantidad,
  costePorUnidadDeUso,
  centimos,
  jornadaDe,
  horaDeCorte,
  milesimas,
  siguienteEstado,
  type EstadoDelStock,
  type TipoDeMovimiento,
} from '@estook/dominio';
import { FalloDeAplicacion, type Contexto } from './contrato.ts';

/**
 * Lo que comparten todas las operaciones de inventario (M6).
 *
 * Vive aparte por la regla 6, igual que `alta.ts` en M5. Apuntar una entrada,
 * apuntar una salida y ajustar lo que hay en cámara son tres comandos con tres
 * pantallas distintas, pero **por debajo son la misma cosa**: añadir una línea
 * al libro y dejar apuntado cómo queda la cámara. Si cada uno lo hiciera a su
 * manera, acabaría habiendo tres formas de calcular el mismo stock.
 */

// ── Quién es el producto, y de qué local ─────────────────────────────────────

export interface FichaBasica {
  readonly id: string;
  readonly localId: string;
  readonly nombre: string;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly rendimiento: number;
  readonly formato: string | null;
  readonly proveedorId: string | null;
  readonly pesoVariable: boolean;
  readonly esEjemplo: boolean;
  readonly zonaHoraria: string;
  readonly horaDeCorte: string;
}

/**
 * Lee el producto **con la fila bloqueada**, y de paso la ficha del local.
 *
 * ── Por qué el bloqueo, que es lo único delicado de este fichero ─────────────
 *
 * Porque el precio medio ponderado depende del orden. Dos entradas a la vez
 * leerían las dos el mismo «lo que había antes», calcularían las dos su media
 * sobre ese punto de partida y la segunda pisaría a la primera: el libro
 * quedaría con dos líneas y un saldo que no cuadra con ninguna de las dos.
 *
 * Bloquear la fila del producto —no la del movimiento— es lo que serializa las
 * dos peticiones. La segunda espera a que la primera termine y entonces lee el
 * saldo de verdad. Es una espera de milisegundos y solo entre movimientos **del
 * mismo producto**: dos cocinas apuntando cosas distintas no se estorban.
 *
 * Y se lee **con las políticas puestas**: de un producto que no se ve, no vuelve
 * nada, y entonces no hay que comprobar de quién es.
 */
export async function elProductoBloqueado(
  contexto: Contexto,
  productoId: string,
): Promise<FichaBasica> {
  const filas = await contexto.sql<
    {
      id: string;
      local_id: string;
      nombre: string;
      factor: string;
      unidad_de_uso: string;
      rendimiento: string;
      formato: string | null;
      proveedor_id: string | null;
      peso_variable: boolean;
      es_ejemplo: boolean;
      zona_horaria: string;
      hora_de_corte: string;
    }[]
  >`
    select p.id, p.local_id, p.nombre,
           p.factor::text as factor, p.unidad_de_uso::text as unidad_de_uso,
           p.rendimiento::text as rendimiento, p.formato, p.proveedor_id,
           p.peso_variable, p.es_ejemplo,
           l.zona_horaria, to_char(l.hora_de_corte, 'HH24:MI') as hora_de_corte
      from estook.producto p
      join estook.local l on l.id = p.local_id
     where p.id = ${productoId}
       for no key update of p
  `;

  const fila = filas[0];
  if (!fila) {
    throw new FalloDeAplicacion('no_existe', {
      porque: 'Ese producto no está, o no es de un local que puedas ver.',
    });
  }

  return {
    id: fila.id,
    localId: fila.local_id,
    nombre: fila.nombre,
    factor: Number(fila.factor),
    unidadDeUso: fila.unidad_de_uso,
    rendimiento: Number(fila.rendimiento),
    formato: fila.formato,
    proveedorId: fila.proveedor_id,
    pesoVariable: fila.peso_variable,
    esEjemplo: fila.es_ejemplo,
    zonaHoraria: fila.zona_horaria,
    horaDeCorte: fila.hora_de_corte,
  };
}

/** Lo que hay ahora en cámara, leído de la última línea del libro. */
export async function loQueHay(contexto: Contexto, productoId: string): Promise<EstadoDelStock> {
  const filas = await contexto.sql<{ cantidad: string; coste_milesimas: string }[]>`
    select cantidad::text as cantidad, coste_milesimas::text as coste_milesimas
      from estook.existencias
     where producto_id = ${productoId}
  `;

  const fila = filas[0];
  if (!fila) return CAMARA_VACIA;

  return {
    cantidad: cantidad(Number(fila.cantidad)),
    coste: milesimas(Number(fila.coste_milesimas)),
  };
}

// ── Apuntar en el libro ──────────────────────────────────────────────────────

export interface Apunte {
  readonly tipo: TipoDeMovimiento;
  /** En unidad de uso y con signo: positiva entra, negativa sale. Nunca cero. */
  readonly cantidad: number;
  /** Lo que costó esta unidad, en milésimas. Solo en las entradas. */
  readonly costeMilesimas?: number | null;
  readonly loteId?: string | null;
  readonly motivo?: string | null;
  readonly origen?: string;
  readonly referencia?: Record<string, unknown> | null;
  readonly esEjemplo?: boolean;
  /**
   * Cuándo ocurrió. Por defecto, el instante que decide el servidor. Se pasa a
   * mano **solo al sembrar los ejemplos**, que necesitan unas semanas de
   * historia para que la previsión de agotamiento tenga algo que enseñar el
   * primer día.
   */
  readonly cuando?: Date;
}

export interface Apuntado {
  readonly movimientoId: string;
  readonly antes: EstadoDelStock;
  readonly despues: EstadoDelStock;
  readonly fechaOperativa: string;
}

/**
 * Añade una línea al libro y deja apuntado cómo queda la cámara.
 *
 * **Es el único sitio del sistema que escribe en `movimiento_de_stock`.** No es
 * una convención: la tabla no tiene `update` concedido a nadie, y el cliente no
 * escribe en tablas de dominio (regla 3). Todo lo que mueve género —una entrada
 * a mano, un ajuste, y mañana un albarán o una venta— pasa por aquí.
 *
 * La cuenta la hace `siguienteEstado`, del dominio. Aquí solo se lee lo que
 * había, se le pregunta al motor y se guarda: la aritmética tiene un único
 * dueño y no está en este fichero (regla 6).
 */
export async function apuntar(
  contexto: Contexto,
  producto: FichaBasica,
  apunte: Apunte,
): Promise<Apuntado> {
  if (apunte.cantidad === 0) {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['cantidad'],
      porque: 'Un movimiento de cero no mueve nada, así que no se apunta.',
    });
  }

  const antes = await loQueHay(contexto, producto.id);

  const despues = siguienteEstado(antes, {
    tipo: apunte.tipo,
    cantidad: cantidad(apunte.cantidad),
    // Sin redondear: `milesimas` exige un entero y aquí eso es una garantía, no
    // una molestia. Todo lo que llega ya viene de `costeDeUso` —que es el dueño
    // del redondeo— o de una columna `bigint` de la base. Si algún día llegara
    // un decimal, es un fallo de programación y tiene que saltar aquí, no
    // colarse redondeado dentro del coste de un plato.
    coste:
      apunte.costeMilesimas === null || apunte.costeMilesimas === undefined
        ? null
        : milesimas(apunte.costeMilesimas),
  });

  // La fecha operativa la decide el servidor con la zona y la hora de corte del
  // local, nunca el navegador (regla 10). Una entrada de las 02:30 de un sábado
  // pertenece a la jornada del viernes, igual que una venta.
  const cuando = apunte.cuando ?? contexto.ahora;
  const fecha = jornadaDe(cuando, producto.zonaHoraria, horaDeCorte(producto.horaDeCorte));

  const insertados = await contexto.sql<{ id: string }[]>`
    insert into estook.movimiento_de_stock (
      local_id, producto_id, tipo, cantidad, coste_milesimas,
      cantidad_despues, coste_medio_despues, lote_id, motivo,
      fecha_operativa, ocurrido_en, persona_id, correlacion_id,
      origen, referencia, es_ejemplo
    )
    values (
      ${producto.localId},
      ${producto.id},
      ${apunte.tipo}::estook.tipo_de_movimiento,
      ${apunte.cantidad},
      ${apunte.costeMilesimas ?? null},
      ${despues.cantidad},
      ${despues.coste},
      ${apunte.loteId ?? null},
      ${apunte.motivo ?? null},
      ${fecha}::date,
      ${cuando.toISOString()}::timestamptz,
      ${contexto.personaId},
      ${contexto.correlacionId}::uuid,
      ${apunte.origen ?? 'a_mano'},
      ${apunte.referencia === null || apunte.referencia === undefined ? null : JSON.stringify(apunte.referencia)}::jsonb,
      ${apunte.esEjemplo ?? false}
    )
    returning id::text as id
  `;

  const movimientoId = insertados[0]?.id;
  if (movimientoId === undefined) throw new FalloDeAplicacion('sin_permiso');

  return { movimientoId, antes, despues, fechaOperativa: fecha };
}

// ── El coste por unidad de uso, en un solo sitio ─────────────────────────────

/**
 * `precio ÷ (factor × rendimiento)`, con el motor de M2.
 *
 * Se envuelve aquí porque los tres sitios que ponen un precio —crear un producto
 * desde el catálogo, cambiar el precio a mano y sembrar los ejemplos— tienen que
 * guardar exactamente el mismo número. Y porque el motor rechaza un rendimiento
 * fuera de rango con una excepción cruda, y lo que tiene que llegar a la
 * pantalla es una frase del catálogo de errores.
 */
export function costeDeUso(precioCentimos: number, factor: number, rendimiento: number): number {
  try {
    // `centimos` exige un entero, y lo que llega ya lo es: los comandos lo
    // validan con `z.number().int()` y la base lo guarda en `bigint`. Redondear
    // aquí sería tapar un fallo en vez de verlo.
    return costePorUnidadDeUso(centimos(precioCentimos), { factor, rendimiento });
  } catch {
    throw new FalloDeAplicacion('faltan_datos', {
      campos: ['factor', 'rendimiento'],
      porque:
        'El factor tiene que ser mayor que cero y el rendimiento estar entre 0 y 1, donde 0,85 es un 85 %.',
    });
  }
}

// ── Los datos de ejemplo ─────────────────────────────────────────────────────

/**
 * Los seis productos de ejemplo, copiados del catálogo de referencia.
 *
 * «Estook crea **seis o siete productos**, dos elaboraciones, tres fichas y una
 *  carta de cuatro platos. Lo justo para entender cómo un producto alimenta una
 *  ficha y una ficha alimenta la carta» (Manifiesto 8).
 *
 * Los seis son los de una tortilla con pollo y patatas: así, cuando M9 traiga
 * las fichas y M10 la carta, sus ejemplos salen de estos y la cadena entera se
 * ve con datos que ya están.
 *
 * **Los códigos son del catálogo de la 0021 y de ahí sale todo lo demás**:
 * formato, factor, unidad de uso, rendimiento y alérgenos. Copiarlos aquí sería
 * tener dos veces el mismo dato y verlos discrepar el día que se corrija uno.
 * Lo único que se pone aquí es el precio, porque el catálogo no lleva precios a
 * propósito: los precios son de cada local y de cada proveedor.
 */
const EJEMPLOS = [
  { codigo: 'aceite-oliva-virgen-extra-5l', precioCentimos: 4250, minimo: 5000, gastoDiario: 320 },
  { codigo: 'patata-agria-20kg', precioCentimos: 1800, minimo: 8000, gastoDiario: 2100 },
  { codigo: 'cebolla-blanca-10kg', precioCentimos: 1150, minimo: 3000, gastoDiario: 640 },
  { codigo: 'huevo-fresco-docena', precioCentimos: 780, minimo: 60, gastoDiario: 8 },
  { codigo: 'pechuga-pollo-5kg', precioCentimos: 3400, minimo: 4000, gastoDiario: 1450 },
  { codigo: 'tomate-pera-10kg', precioCentimos: 1600, minimo: 3000, gastoDiario: 780 },
] as const;

/** Cuántos días de historia se siembran. Suficientes para poder predecir. */
const DIAS_DE_HISTORIA = 21;

/**
 * Cuántos días de más entran, para que la cámara no acabe vacía.
 *
 * ── Por qué esto se calcula y no se escribe a mano ───────────────────────────
 *
 * Porque escrito a mano se equivoca. La primera versión metía «tres formatos» de
 * cada cosa, y con eso un local de ejemplo se quedaba con **los huevos en −372
 * unidades**: tres bandejas de treinta no aguantan tres semanas gastando
 * veintidós al día. Se veía raro y además enseñaba la capa inteligente por su
 * peor cara, avisando de una cámara en números rojos el primer día.
 *
 * Ahora la entrada sale del consumo: lo que se gasta en las tres semanas de
 * historia, más unos días de cobertura, redondeado hacia arriba a formatos
 * enteros. Nadie compra media caja.
 */
const COBERTURA_DE_LOS_EJEMPLOS = 4;

/**
 * Le pone a un local sus categorías y sus seis productos de ejemplo.
 *
 * ── Por qué los ejemplos se siembran desde aquí y no desde la migración ─────
 *
 * Porque llevan precio y llevan movimientos, y las dos cosas son aritmética: el
 * coste por unidad de uso y el precio medio ponderado. Sembrarlos en SQL sería
 * escribir esas dos cuentas por segunda vez dentro de una migración, y entonces
 * habría dos dueños del mismo cálculo (regla 6). Aquí se siembran llamando
 * exactamente a lo mismo que llama la pantalla.
 *
 * ── Y por qué traen tres semanas de consumo ─────────────────────────────────
 *
 * Porque sin historia, la capa inteligente de M6 no tiene nada que enseñar: la
 * previsión de agotamiento diría «todavía estoy aprendiendo» en los seis, y
 * quien acaba de entrar no vería para qué sirve. Con tres semanas de salidas, el
 * primer día ya se ve «se agota el jueves a las 19:40», que es la promesa del
 * módulo funcionando con datos que además están marcados como de mentira.
 */
export async function sembrarElInventario(
  contexto: Contexto,
  localId: string,
  opciones: { readonly conEjemplos: boolean },
): Promise<{ readonly categorias: number; readonly productos: number }> {
  const sembradas = await contexto.sql<{ sembrar_categorias: number }[]>`
    select estook.sembrar_categorias(${localId}::uuid) as sembrar_categorias
  `;
  const categorias = sembradas[0]?.sembrar_categorias ?? 0;

  if (!opciones.conEjemplos) return { categorias, productos: 0 };

  const yaHay = await contexto.sql<{ cuantos: number }[]>`
    select count(*)::int as cuantos from estook.producto where local_id = ${localId}
  `;

  // Sembrar dos veces no duplica nada. Y si el local ya tiene género de verdad,
  // no se le meten ejemplos por detrás: «Estook no mete nada en tu inventario».
  if ((yaHay[0]?.cuantos ?? 0) > 0) return { categorias, productos: 0 };

  let productos = 0;
  for (const ejemplo of EJEMPLOS) {
    const puesto = await sembrarUnEjemplo(contexto, localId, ejemplo);
    if (puesto) productos += 1;
  }

  return { categorias, productos };
}

async function sembrarUnEjemplo(
  contexto: Contexto,
  localId: string,
  ejemplo: (typeof EJEMPLOS)[number],
): Promise<boolean> {
  const referencias = await contexto.sql<
    {
      id: string;
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
    select id, nombre, categoria, formato, factor::text as factor,
           unidad_de_uso::text as unidad_de_uso, rendimiento::text as rendimiento,
           categoria_fiscal::text as categoria_fiscal, alergenos
      from estook.producto_de_referencia
     where codigo = ${ejemplo.codigo}
  `;

  const referencia = referencias[0];
  // Si un día se renombra un código del catálogo, aquí no se rompe nada: ese
  // ejemplo no se siembra y los otros cinco sí. Un dato de mentira que falta no
  // puede tumbar el alta de un local de verdad.
  if (!referencia) return false;

  // La categoría se busca por nombre entre las que el local acaba de recibir.
  // Puede no estar —un obrador no trae «Carnes»— y entonces el producto se queda
  // sin categoría, que es un estado válido y visible, no un fallo escondido.
  const categorias = await contexto.sql<{ id: string }[]>`
    select id from estook.categoria_de_producto
     where local_id = ${localId}
       and estook.sin_acentos(nombre) = estook.sin_acentos(${referencia.categoria})
     limit 1
  `;

  const factor = Number(referencia.factor);
  const rendimiento = Number(referencia.rendimiento);

  const creados = await contexto.sql<{ id: string }[]>`
    insert into estook.producto (
      local_id, categoria_id, nombre, formato, factor, unidad_de_uso, rendimiento,
      categoria_fiscal, alergenos, minimo, producto_de_referencia_id,
      sin_verificar, es_ejemplo
    )
    values (
      ${localId},
      ${categorias[0]?.id ?? null},
      ${referencia.nombre},
      ${referencia.formato},
      ${factor},
      ${referencia.unidad_de_uso}::estook.unidad_de_uso,
      ${rendimiento},
      ${referencia.categoria_fiscal}::estook.categoria_fiscal,
      ${referencia.alergenos},
      ${ejemplo.minimo},
      ${referencia.id},
      true,
      true
    )
    returning id
  `;

  const productoId = creados[0]?.id;
  if (productoId === undefined) return false;

  // Se apunta en el registro de M5, que es lo que hace que el botón «Quitar los
  // ejemplos» del Panel se entere sin que nadie toque ni el comando ni la
  // pantalla. Los precios, los movimientos y los lotes se van con el producto
  // por su clave ajena: no hay que apuntarlos uno a uno.
  await contexto.sql`
    insert into estook.dato_de_ejemplo (organizacion_id, local_id, tabla, fila_id)
    select l.organizacion_id, ${localId}, 'producto', ${productoId}
      from estook.local l where l.id = ${localId}
    on conflict (tabla, fila_id) do nothing
  `;

  const coste = costeDeUso(ejemplo.precioCentimos, factor, rendimiento);

  await contexto.sql`
    insert into estook.precio_de_producto (
      producto_id, precio_centimos, formato, factor, unidad_de_uso, rendimiento,
      coste_milesimas, desde, origen, creado_por
    )
    values (
      ${productoId}, ${ejemplo.precioCentimos}, ${referencia.formato}, ${factor},
      ${referencia.unidad_de_uso}::estook.unidad_de_uso, ${rendimiento},
      ${coste}, current_date, 'catalogo', ${contexto.personaId}
    )
  `;

  const ficha: FichaBasica = await elProductoBloqueado(contexto, productoId);

  // Una entrada que dé para las tres semanas de historia y unos días más, y
  // después el gasto diario. En ese orden y con sus fechas, porque el libro es
  // el orden en que pasaron las cosas.
  const dia = 24 * 60 * 60 * 1000;
  const arranque = new Date(contexto.ahora.getTime() - (DIAS_DE_HISTORIA + 1) * dia);

  const haceFalta = ejemplo.gastoDiario * (DIAS_DE_HISTORIA + COBERTURA_DE_LOS_EJEMPLOS);
  const formatosEnteros = Math.max(1, Math.ceil(haceFalta / factor));

  await apuntar(contexto, ficha, {
    tipo: 'entrada',
    cantidad: factor * formatosEnteros,
    costeMilesimas: coste,
    origen: 'ejemplo',
    esEjemplo: true,
    cuando: arranque,
  });

  for (let atras = DIAS_DE_HISTORIA; atras >= 1; atras--) {
    await apuntar(contexto, ficha, {
      tipo: 'salida',
      cantidad: -ejemplo.gastoDiario,
      origen: 'ejemplo',
      esEjemplo: true,
      cuando: new Date(contexto.ahora.getTime() - atras * dia),
    });
  }

  return true;
}
