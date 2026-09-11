import { costeDeLinea, costePorUnidadDeUso, cantidad, milesimas, type Milesimas } from './coste.ts';
import { centimos, conSimbolo, porCantidad, type Centimos } from './dinero.ts';
import { comoSeLlamaElDia } from './equipo.ts';
import { DIAS_DE_COBERTURA_OBJETIVO, type Sugerencia } from './inventario.ts';
import { conUnidad, fechaEnLetra } from './textos.ts';
import { diaDeLaSemana, diasEntre, masDias, type FechaOperativa } from './tiempo.ts';

/**
 * Motor de compras (M7) · qué pedir, cuándo llega, qué ha llegado y si cuadra.
 *
 * Toda la aritmética de compras vive aquí y no en el servidor ni en la pantalla,
 * por la regla de siempre (un cálculo, un único dueño): la sugerencia que se ve en
 * la ficha de un producto, la del pedido de un proveedor y la de «hoy toca pedir»
 * **son la misma cuenta**, y si cada sitio la hiciera a su manera, la ficha
 * diría «pide 3 cajas» y el pedido «pide 2».
 *
 * ── Lo que un hostelero sabe y un programa de compras no ─────────────────────
 *
 *   · **El bajo mínimo sabe qué día reparte tu proveedor.** «Avisar el jueves de
 *     un pescado que llega los martes no sirve de nada» (Manifiesto 28). Lo que
 *     se pide hoy tiene que durar hasta el reparto **de después**, no hasta mañana.
 *   · **Nadie compra media caja.** Lo que se sugiere va en formatos enteros.
 *   · **El pedido mínimo es la mitad de la decisión**: «te faltan 23 € para el
 *     mínimo, o 12 € de portes» decide si se pide hoy o se espera.
 */

// ── Cuándo llega lo que se pide ──────────────────────────────────────────────

/** Cómo reparte un proveedor, tal cual se guarda en su ficha. */
export interface CalendarioDeReparto {
  /** Del 1 (lunes) al 7 (domingo). Vacío: no se sabe. */
  readonly dias: readonly number[];
  /** Días entre pedir y recibir. Uno es «hoy para mañana». */
  readonly plazo: number;
  /** Hasta qué hora del día de pedir cuenta como pedido de ese día. «HH:MM». */
  readonly horaLimite: string | null;
}

export interface ProximoReparto {
  /** El primer reparto al que todavía se llega pidiendo ahora. */
  readonly llega: FechaOperativa;
  /** El día en que hay que pedirlo. Puede ser hoy. */
  readonly pedirEl: FechaOperativa;
  /** Hasta qué hora de ese día, si el proveedor tiene hora límite. */
  readonly pedirAntesDe: string | null;
  /** El reparto de después: hasta ahí tiene que durar lo que llegue. */
  readonly siguiente: FechaOperativa;
}

/**
 * El próximo reparto al que se llega, y el de después.
 *
 * `hoy` y `horaAhora` son **del reloj de pared del local**, no de la jornada: el
 * proveedor cuenta con que hoy es hoy aunque el bar no haya cerrado la caja.
 *
 * Devuelve nulo cuando el proveedor no tiene días de reparto puestos: sin eso no
 * se puede decir cuándo llega nada, y se dice así en vez de suponer un día.
 */
export function proximoReparto(
  reparto: CalendarioDeReparto,
  hoy: FechaOperativa,
  horaAhora: string,
): ProximoReparto | null {
  const dias = new Set(reparto.dias.filter((d) => d >= 1 && d <= 7));
  if (dias.size === 0) return null;

  const plazo = Math.max(0, Math.trunc(reparto.plazo));

  // Cuatro semanas son de sobra: con un solo día de reparto a la semana, el
  // primero al que se llega está como mucho a una semana más el plazo.
  for (let adelante = 0; adelante <= 28 + plazo; adelante++) {
    const llega = masDias(hoy, adelante);
    if (!dias.has(diaDeLaSemana(llega))) continue;

    const pedirEl = masDias(llega, -plazo);
    if (pedirEl < hoy) continue;
    if (pedirEl === hoy && reparto.horaLimite !== null && horaAhora >= reparto.horaLimite) {
      continue;
    }

    let siguiente = masDias(llega, 1);
    while (!dias.has(diaDeLaSemana(siguiente))) siguiente = masDias(siguiente, 1);

    return { llega, pedirEl, pedirAntesDe: reparto.horaLimite, siguiente };
  }

  return null;
}

/**
 * Cómo se le pide a un proveedor, en una frase: «Se le pide la víspera, hasta las
 * 20:00». Es lo que sale debajo de su reparto en el Calendario, que lo ve también
 * quien no ve un precio: por eso no lleva el pedido mínimo.
 */
export function comoSeLePide(plazo: number, horaLimite: string | null): string {
  const hasta = horaLimite === null ? '' : `, hasta las ${horaLimite}`;
  if (plazo <= 0) return `Se le pide el mismo día${hasta}.`;
  if (plazo === 1) return `Se le pide la víspera${hasta}.`;
  return `Se le pide con ${plazo} días de antelación${hasta}.`;
}

/**
 * Cómo se dice una fecha cercana: «hoy», «mañana», «el martes», «el martes 23».
 *
 * Recibe el hoy del servidor, porque aquí no se mira ningún reloj (regla 10).
 */
export function cuandoCae(fecha: FechaOperativa, hoy: FechaOperativa): string {
  const dias = diasEntre(hoy, fecha);
  const nombre = comoSeLlamaElDia(diaDeLaSemana(fecha));
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  if (dias > 1 && dias < 7) return `el ${nombre}`;
  return `el ${nombre} ${fechaEnLetra(fecha).replace(/ de \d{4}$/, '')}`;
}

// ── Cuánto pedir, y por qué ──────────────────────────────────────────────────

/**
 * El margen que se añade a lo que se va a gastar hasta el reparto de después.
 *
 * Es el 20 % de la Auditoría (hallazgo 1): «consumo medio diario × días hasta el
 * próximo reparto + 20 % de seguridad». Cubre la semana en que se vende más de lo
 * normal sin llenar la cámara de lo que no se va a gastar.
 */
export const MARGEN_DE_SEGURIDAD = 0.2;

/** Lo que hace falta saber de un producto para decir cuánto pedir. */
export interface LoQueHay {
  /** Lo que hay ahora en cámara, en unidad de uso. Puede ser negativo. */
  readonly existencias: number;
  /** Lo que se gasta al día, en unidad de uso. Nulo si todavía no se sabe. */
  readonly consumoPorDia: number | null;
  /** El mínimo que se puso a mano, en unidad de uso. */
  readonly minimo: number | null;
  /** Unidades de uso por formato: una caja de 10 kg son 10. */
  readonly factor: number;
  readonly unidadDeUso: string;
}

/** Una sugerencia en formatos enteros, además de en unidad de uso. */
export interface SugerenciaDeCompra extends Sugerencia {
  /** Cuántos formatos pedir. Siempre entero: nadie compra media caja. */
  readonly formatos: number;
}

export interface CuandoLlega {
  readonly hoy: FechaOperativa;
  readonly llega: FechaOperativa;
  readonly siguiente: FechaOperativa;
}

function cifra(valor: number): string {
  return Number(valor.toFixed(3)).toString().replace('.', ',');
}

/**
 * Cuánto pedir de un producto, y por qué, en formatos enteros.
 *
 * ── La cuenta ────────────────────────────────────────────────────────────────
 *
 * Lo que se pide hoy llega en el próximo reparto y tiene que durar **hasta el de
 * después**. Así que hace falta lo que se gasta desde hoy hasta ese segundo
 * reparto, más un 20 % de margen, y se pide lo que falte para eso:
 *
 *     objetivo = gasto al día × días hasta el reparto de después × 1,2
 *     pedir    = objetivo − lo que hay, en cajas enteras hacia arriba
 *
 * Si hay un mínimo puesto, se respeta también: el día que llegue tiene que haber
 * al menos el mínimo. Y si todavía no se sabe a qué ritmo se gasta —menos de
 * siete días de historia—, **solo se sugiere si está por debajo del mínimo**, y
 * se dice que es por eso. Una sugerencia sin base es peor que ninguna.
 *
 * Sin días de reparto del proveedor, se calcula para cinco días, que era la
 * sugerencia de M6, y el motivo lo dice para que alguien los ponga.
 */
export function cuantoPedir(que: LoQueHay, cuando: CuandoLlega | null): SugerenciaDeCompra | null {
  const factor = que.factor > 0 ? que.factor : 1;
  const consumo = que.consumoPorDia !== null && que.consumoPorDia > 0 ? que.consumoPorDia : null;
  const gasto = consumo === null ? '' : conUnidad(cantidad(consumo), que.unidadDeUso);

  let falta: number;
  let motivo: string;

  if (consumo !== null) {
    const hasta = cuando === null ? 0 : diasEntre(cuando.hoy, cuando.llega);
    const ciclo =
      cuando === null ? DIAS_DE_COBERTURA_OBJETIVO : diasEntre(cuando.llega, cuando.siguiente);

    let objetivo = consumo * (hasta + ciclo) * (1 + MARGEN_DE_SEGURIDAD);
    if (que.minimo !== null) objetivo = Math.max(objetivo, consumo * hasta + que.minimo);
    falta = objetivo - que.existencias;

    motivo =
      cuando === null
        ? `Para unos ${ciclo} días a ${gasto} al día, con un 20 % de margen. Con los días de reparto del proveedor lo calcularía hasta su reparto siguiente.`
        : `Llega ${cuandoCae(cuando.llega, cuando.hoy)} y el reparto siguiente es ${cuandoCae(cuando.siguiente, cuando.hoy)}: ${hasta + ciclo} días a ${gasto} al día, con un 20 % de margen.`;
  } else if (que.minimo !== null && que.existencias < que.minimo) {
    falta = que.minimo - que.existencias;
    motivo = `Hay menos del mínimo que pusiste (${conUnidad(cantidad(que.minimo), que.unidadDeUso)}) y todavía no sé a qué ritmo se gasta.`;
  } else {
    return null;
  }

  if (falta <= 0) return null;

  // `toFixed` antes de subir: 30 ÷ 10 en coma flotante puede dar 3,0000000004, y
  // eso son cuatro cajas en vez de tres.
  const formatos = Math.max(1, Math.ceil(Number((falta / factor).toFixed(6))));

  return { formatos, cuanto: Number((formatos * factor).toFixed(4)), motivo };
}

/** «3 × Caja 10 kg», o «30 kg» si el producto no tiene formato. */
export function comoSePide(
  formatos: number,
  formato: string | null,
  factor: number,
  unidad: string,
): string {
  if (formato === null || formato.trim() === '') {
    return conUnidad(cantidad(formatos * factor), unidad);
  }
  return `${cifra(formatos)} × ${formato}`;
}

// ── Lo que se espera pagar ───────────────────────────────────────────────────

/** Lo que cuesta una línea: formatos por lo que cuesta cada uno. */
export function importeEstimado(formatos: number, precioCentimos: number | null): Centimos | null {
  if (precioCentimos === null) return null;
  return porCantidad(centimos(precioCentimos), formatos);
}

export interface TotalDelPedido {
  readonly total: Centimos;
  /** Cuántas líneas no tienen precio, y por tanto no suman. */
  readonly sinPrecio: number;
}

export function totalDelPedido(
  lineas: readonly { readonly cantidad: number; readonly precioCentimos: number | null }[],
): TotalDelPedido {
  let total = 0;
  let sinPrecio = 0;
  for (const linea of lineas) {
    const importe = importeEstimado(linea.cantidad, linea.precioCentimos);
    if (importe === null) sinPrecio += 1;
    else total += importe;
  }
  return { total: centimos(total), sinPrecio };
}

export interface ComoVaElMinimo {
  readonly llega: boolean;
  /** Lo que falta para el mínimo. Cero si ya llega. */
  readonly falta: Centimos;
  readonly frase: string;
}

/**
 * Si el pedido llega al mínimo del proveedor, y qué pasa si no.
 *
 * «Avisa si el pedido no llega al mínimo del proveedor» (Manifiesto 12). **Avisa,
 * no bloquea**: hay días en que se prefiere pagar los portes a quedarse sin pan.
 */
export function comoVaElMinimo(
  total: TotalDelPedido,
  minimoCentimos: number | null,
  portesCentimos: number | null,
): ComoVaElMinimo | null {
  if (minimoCentimos === null || minimoCentimos <= 0) return null;

  const coletilla =
    total.sinPrecio === 0
      ? ''
      : ` Sin contar ${total.sinPrecio === 1 ? 'un producto sin precio' : `${total.sinPrecio} productos sin precio`}.`;

  if (total.total >= minimoCentimos) {
    return {
      llega: true,
      falta: centimos(0),
      frase: `Llega al pedido mínimo (${conSimbolo(centimos(minimoCentimos))}).${coletilla}`,
    };
  }

  const falta = centimos(minimoCentimos - total.total);
  const portes =
    portesCentimos !== null && portesCentimos > 0
      ? `: si no, son ${conSimbolo(centimos(portesCentimos))} de portes`
      : '';

  return {
    llega: false,
    falta,
    frase: `Faltan ${conSimbolo(falta)} para el pedido mínimo (${conSimbolo(centimos(minimoCentimos))})${portes}.${coletilla}`,
  };
}

// ── El pedido, escrito para mandarlo ─────────────────────────────────────────

export interface LineaParaMandar {
  readonly producto: string;
  readonly cantidad: number;
  readonly formato: string | null;
  readonly factor: number;
  readonly unidadDeUso: string;
  readonly nota?: string | null;
}

export interface PedidoParaMandar {
  readonly numero: number;
  readonly local: string;
  readonly contacto: string | null;
  readonly llega: FechaOperativa | null;
  readonly hoy: FechaOperativa;
  readonly lineas: readonly LineaParaMandar[];
  readonly notas: string | null;
}

/**
 * El pedido escrito como lo escribiría una persona: «Botones grandes: WhatsApp
 * con el pedido escrito» (Manifiesto 12).
 *
 * **Sin precios, a propósito.** Al proveedor no se le dice lo que va a cobrar: se
 * le pide lo que se quiere. Lo que se espera pagar se queda en Estook, que es
 * donde se compara con lo que llega.
 *
 * Cada línea dice el producto y la caja, porque «3 de tomate» no sabe si son
 * cajas o kilos, y un pedido ambiguo es un pedido que llega mal.
 */
export function textoDelPedido(pedido: PedidoParaMandar): string {
  const saludo =
    pedido.contacto === null || pedido.contacto.trim() === ''
      ? 'Hola'
      : `Hola, ${pedido.contacto.trim()}`;
  const para =
    pedido.llega === null
      ? 'Os hago un pedido, por favor:'
      : `Os hago un pedido para ${cuandoCae(pedido.llega, pedido.hoy)}, por favor:`;

  const lineas = pedido.lineas.map((linea) => {
    const cuanto = comoSePide(linea.cantidad, linea.formato, linea.factor, linea.unidadDeUso);
    const nota =
      linea.nota === null || linea.nota === undefined || linea.nota.trim() === ''
        ? ''
        : ` (${linea.nota.trim()})`;
    return `· ${cuanto} de ${linea.producto}${nota}`;
  });

  const partes = [`${saludo}. Soy de ${pedido.local}.`, para, '', ...lineas];

  if (pedido.notas !== null && pedido.notas.trim() !== '') {
    partes.push('', pedido.notas.trim());
  }

  partes.push('', `Gracias. Pedido ${pedido.numero}.`);
  return partes.join('\n');
}

/**
 * El número tal cual lo quiere WhatsApp: solo cifras, con el prefijo del país.
 *
 * Se escribe «612 34 56 78», «+34 612345678» o «0034612345678», y los tres son el
 * mismo. Un número español de nueve cifras sin prefijo se entiende como español,
 * que es lo que es el noventa y nueve por ciento de las veces. Nulo si lo que
 * queda no puede ser un teléfono.
 */
export function numeroParaWhatsApp(telefono: string | null): string | null {
  if (telefono === null) return null;
  const limpio = telefono.trim();
  if (limpio === '') return null;

  let cifras = limpio.replace(/[^\d+]/g, '');
  if (cifras.startsWith('+')) cifras = cifras.slice(1);
  else if (cifras.startsWith('00')) cifras = cifras.slice(2);
  else if (/^[6789]\d{8}$/.test(cifras)) cifras = `34${cifras}`;

  cifras = cifras.replace(/\D/g, '');
  return cifras.length >= 9 && cifras.length <= 15 ? cifras : null;
}

export function enlaceDeWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/**
 * El correo, abierto en la aplicación de correo de quien pide.
 *
 * **Sale de su correo, no del nuestro**, y es a propósito: el proveedor ve quién
 * le escribe y le contesta a él, no a una dirección de Estook que no lee nadie.
 */
export function enlaceDeCorreo(correo: string, asunto: string, texto: string): string {
  return `mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;
}

// ── Lo que ha llegado ────────────────────────────────────────────────────────

export interface LineaQueLlega {
  readonly pesoVariable: boolean;
  readonly factor: number;
  readonly rendimiento: number;
  /** Cuántos formatos. Obligatorio si no es peso variable. */
  readonly formatos?: number | null;
  /** Los kilos (o litros) reales. Obligatorio si es peso variable. */
  readonly cantidadDeUso?: number | null;
  /** Lo que cuesta cada formato, sin impuestos. Para lo que no es peso variable. */
  readonly precioFormatoCentimos?: number | null;
  /** Lo que cobra la línea entera, sin impuestos. Para el peso variable. */
  readonly importeCentimos?: number | null;
}

export interface LineaRecibida {
  readonly formatos: number | null;
  /** Lo que entra en el libro, en unidad de uso. */
  readonly cantidadDeUso: number;
  /** Lo que cobra la línea. Nulo: el albarán vino sin valorar. */
  readonly importeCentimos: Centimos | null;
  /** Lo que cuesta cada unidad de uso, en milésimas. Nulo sin precio. */
  readonly costeMilesimas: Milesimas | null;
  /** Lo que cuesta un formato, para abrir el precio nuevo del producto. */
  readonly precioFormatoCentimos: Centimos | null;
}

/**
 * De lo que dice el papel a lo que entra en el libro.
 *
 * ── Dos formas de llegar, y por qué ──────────────────────────────────────────
 *
 * Lo normal llega en cajas a un precio por caja: «3 cajas de tomate a 16 €». Se
 * multiplica por el factor y ya está.
 *
 * El peso variable no: «se pide en piezas y entra en kilos reales; **el coste va
 * por peso real**» (Manifiesto 29). El papel dice «5,4 kg · 67,50 €», y el coste
 * del kilo sale de esas dos cifras, no del precio de una caja que pesaba otra
 * cosa. Es la única forma de que el pescado no salga más barato de lo que costó.
 */
export function lineaRecibida(linea: LineaQueLlega): LineaRecibida {
  const rendimiento = linea.rendimiento > 0 && linea.rendimiento <= 1 ? linea.rendimiento : 1;

  if (linea.pesoVariable) {
    const cuanto = Math.max(0, linea.cantidadDeUso ?? 0);
    const importe =
      linea.importeCentimos === null || linea.importeCentimos === undefined
        ? null
        : centimos(linea.importeCentimos);
    const coste =
      importe === null || cuanto <= 0
        ? null
        : costePorUnidadDeUso(importe, { factor: cuanto, rendimiento });
    const precioFormato =
      importe === null || cuanto <= 0 ? null : porCantidad(importe, linea.factor / cuanto);

    return {
      formatos: linea.formatos ?? null,
      cantidadDeUso: Number(cuanto.toFixed(4)),
      importeCentimos: importe,
      costeMilesimas: coste,
      precioFormatoCentimos: precioFormato,
    };
  }

  const formatos = Math.max(0, linea.formatos ?? 0);
  const precio =
    linea.precioFormatoCentimos === null || linea.precioFormatoCentimos === undefined
      ? null
      : centimos(linea.precioFormatoCentimos);

  return {
    formatos,
    cantidadDeUso: Number((formatos * linea.factor).toFixed(4)),
    importeCentimos: precio === null ? null : porCantidad(precio, formatos),
    costeMilesimas:
      precio === null ? null : costePorUnidadDeUso(precio, { factor: linea.factor, rendimiento }),
    precioFormatoCentimos: precio,
  };
}

/**
 * Lo que cuesta un formato, sabiendo lo que cobró la línea entera.
 *
 * Es la vuelta de `lineaRecibida`, y la usa la factura: cuando corrige lo que
 * cobra una línea, el precio nuevo del producto se abre **por formato**, que es
 * como se guardan los precios. Con cajas contadas, el importe entre las cajas; en
 * el peso variable, el kilo real por lo que pesa una caja nominal.
 */
export function precioPorFormato(
  importeCentimos: number,
  linea: {
    readonly formatos: number | null;
    readonly cantidadDeUso: number;
    readonly factor: number;
  },
): Centimos | null {
  const importe = centimos(importeCentimos);
  if (linea.formatos !== null && linea.formatos > 0)
    return porCantidad(importe, 1 / linea.formatos);
  if (linea.cantidadDeUso > 0) return porCantidad(importe, linea.factor / linea.cantidadDeUso);
  return null;
}

export const INCIDENCIAS = ['falta', 'sobra', 'rechazado', 'precio', 'no_pedido'] as const;
export type Incidencia = (typeof INCIDENCIAS)[number];

export const NOMBRE_DE_LA_INCIDENCIA: Readonly<Record<Incidencia, string>> = {
  falta: 'Ha venido menos',
  sobra: 'Ha venido más',
  rechazado: 'No se ha aceptado',
  precio: 'Otro precio',
  no_pedido: 'No estaba pedido',
};

/**
 * Lo que no cuadra en una línea, comparando lo pedido con lo que ha llegado.
 *
 * Las cantidades se comparan **en formatos**, que es como se pidió. En el peso
 * variable no se comparan: se pidieron dos piezas y han llegado 5,4 kg, y eso no
 * es ni más ni menos, es cómo funciona el pescado.
 */
export function incidenciasDe(linea: {
  readonly pedida: number | null;
  readonly recibida: number;
  readonly rechazada: boolean;
  readonly pesoVariable: boolean;
  readonly precioEsperado: number | null;
  readonly precioCobrado: number | null;
}): readonly Incidencia[] {
  const incidencias: Incidencia[] = [];

  if (linea.pedida === null) incidencias.push('no_pedido');
  if (linea.rechazada) incidencias.push('rechazado');

  if (linea.pedida !== null && !linea.rechazada && !linea.pesoVariable) {
    const diferencia = Number((linea.recibida - linea.pedida).toFixed(6));
    if (diferencia < 0) incidencias.push('falta');
    if (diferencia > 0) incidencias.push('sobra');
  }
  if (linea.pedida !== null && linea.pesoVariable && !linea.rechazada && linea.recibida <= 0) {
    incidencias.push('falta');
  }

  if (
    linea.precioEsperado !== null &&
    linea.precioCobrado !== null &&
    linea.precioEsperado !== linea.precioCobrado
  ) {
    incidencias.push('precio');
  }

  return incidencias;
}

// ── La factura contra sus albaranes ──────────────────────────────────────────

export interface AlbaranParaConciliar {
  readonly tipo: 'entrega' | 'devolucion';
  readonly lineas: readonly {
    readonly importeCentimos: number | null;
    readonly importeFacturadoCentimos: number | null;
  }[];
}

export interface Conciliacion {
  /** Lo que suman los albaranes, con signo, sin impuestos. */
  readonly sumaCentimos: Centimos;
  /** La base de la factura menos lo que suman. Positiva: te cobran de más. */
  readonly diferenciaCentimos: Centimos;
  /** Líneas que siguen sin ningún precio. */
  readonly sinPrecio: number;
  readonly estado: 'conciliada' | 'con_diferencia';
  readonly frase: string;
}

/**
 * Concilia una factura, o un abono, con los albaranes que cubre.
 *
 * «La factura del proveedor se concilia con sus albaranes, con las diferencias
 *  señaladas» (Manifiesto 12). La cuenta es sencilla y lo difícil es decirla:
 *
 *   · Cada línea cuenta **lo que dice la factura** si se ha puesto, y si no, lo
 *     que decía el albarán. «La factura confirma el precio» (hallazgo 8).
 *   · Una factura suma las entregas y resta las devoluciones; un abono, al revés.
 *   · Si no cuadra al céntimo, **no se bloquea**: queda conciliada con la
 *     diferencia guardada y dicha, que es lo que alguien tiene que reclamar.
 */
export function conciliar(
  tipo: 'factura' | 'abono',
  baseCentimos: number,
  albaranes: readonly AlbaranParaConciliar[],
): Conciliacion {
  let suma = 0;
  let sinPrecio = 0;

  for (const albaran of albaranes) {
    const signo =
      (tipo === 'factura' && albaran.tipo === 'entrega') ||
      (tipo === 'abono' && albaran.tipo === 'devolucion')
        ? 1
        : -1;

    for (const linea of albaran.lineas) {
      const importe = linea.importeFacturadoCentimos ?? linea.importeCentimos;
      if (importe === null) {
        sinPrecio += 1;
        continue;
      }
      suma += signo * importe;
    }
  }

  const sumaCentimos = centimos(suma);
  const diferenciaCentimos = centimos(baseCentimos - suma);
  const cuantos =
    albaranes.length === 1 ? 'el albarán suma' : `los ${albaranes.length} albaranes suman`;
  const papel = tipo === 'factura' ? 'la factura' : 'el abono';

  let frase: string;
  if (albaranes.length === 0) {
    frase = `No hay albaranes con los que comparar ${papel}.`;
  } else if (diferenciaCentimos === 0) {
    frase = `Cuadra: ${cuantos} ${conSimbolo(sumaCentimos)}, lo mismo que ${papel}.`;
  } else {
    const deMas = diferenciaCentimos > 0;
    const cuanto = conSimbolo(centimos(Math.abs(diferenciaCentimos)));
    frase =
      tipo === 'factura'
        ? `La factura dice ${conSimbolo(centimos(baseCentimos))} y ${cuantos} ${conSimbolo(sumaCentimos)}: te cobran ${cuanto} de ${deMas ? 'más' : 'menos'}.`
        : `El abono dice ${conSimbolo(centimos(baseCentimos))} y ${cuantos} ${conSimbolo(sumaCentimos)}: te devuelven ${cuanto} de ${deMas ? 'más' : 'menos'}.`;
  }

  if (sinPrecio > 0) {
    frase += ` ${sinPrecio === 1 ? 'Hay una línea' : `Hay ${sinPrecio} líneas`} sin precio: pon lo que dice ${papel}.`;
  }

  return {
    sumaCentimos,
    diferenciaCentimos,
    sinPrecio,
    estado:
      diferenciaCentimos === 0 && sinPrecio === 0 && albaranes.length > 0
        ? 'conciliada'
        : 'con_diferencia',
    frase,
  };
}

// ── Quién te lo deja mejor ───────────────────────────────────────────────────

export interface PrecioDeUnProveedor {
  readonly proveedorId: string;
  readonly proveedor: string;
  /** Por unidad de uso, en milésimas: es lo único que se puede comparar. */
  readonly costeMilesimas: number;
}

export interface Comparacion {
  readonly mejor: PrecioDeUnProveedor;
  readonly actual: PrecioDeUnProveedor | null;
  /** Lo que se ahorraría al mes comprándoselo al mejor. Nulo sin consumo. */
  readonly ahorroAlMesCentimos: Centimos | null;
  readonly frase: string;
}

/**
 * «La comparación entre proveedores para lo mismo, que es donde aparece el
 *  dinero fácil» (Manifiesto 12).
 *
 * Se compara **por unidad de uso**, nunca por caja: una caja de 5 kg a 30 € y una
 * de 3 kg a 21 € no se comparan por los 30 y los 21. Y el ahorro se dice en euros
 * al mes, con el consumo de verdad, porque «un 8 % más barato» no le dice a nadie
 * si merece la pena cambiar de proveedor.
 */
export function quienLoDejaMejor(
  precios: readonly PrecioDeUnProveedor[],
  proveedorActualId: string | null,
  consumoPorDia: number | null,
  unidadDeUso: string,
): Comparacion | null {
  if (precios.length < 2) return null;

  const ordenados = [...precios].sort((a, b) => a.costeMilesimas - b.costeMilesimas);
  const mejor = ordenados[0];
  if (mejor === undefined) return null;
  const actual = precios.find((p) => p.proveedorId === proveedorActualId) ?? null;

  if (actual === null || actual.proveedorId === mejor.proveedorId) {
    return {
      mejor,
      actual,
      ahorroAlMesCentimos: null,
      frase:
        actual === null
          ? `${mejor.proveedor} es quien te lo deja mejor.`
          : `Ya se lo compras a quien te lo deja mejor.`,
    };
  }

  const diferencia = actual.costeMilesimas - mejor.costeMilesimas;
  const ahorro =
    consumoPorDia === null || consumoPorDia <= 0
      ? null
      : costeDeLinea(milesimas(diferencia), cantidad(consumoPorDia * 30));

  const porUnidad = conSimbolo(costeDeLinea(milesimas(diferencia), cantidad(1)));
  return {
    mejor,
    actual,
    ahorroAlMesCentimos: ahorro,
    frase:
      ahorro === null || ahorro <= 0
        ? `${mejor.proveedor} te lo deja ${porUnidad} por ${unidadDeUso} más barato que ${actual.proveedor}.`
        : `${mejor.proveedor} te lo deja más barato que ${actual.proveedor}: al ritmo al que lo gastas, unos ${conSimbolo(ahorro)} al mes.`,
  };
}

// ── Si llega cuando dice ─────────────────────────────────────────────────────

export interface Puntualidad {
  readonly aTiempo: number;
  readonly tarde: number;
  readonly frase: string | null;
}

/**
 * «Se llena solo: qué te sirve, gasto del mes, subidas detectadas, incidencias y
 *  **puntualidad**» (Manifiesto 12).
 *
 * Una entrega llega a tiempo si llega el día previsto o antes. Solo cuentan las
 * que tenían fecha prevista: sin ella no hay con qué comparar.
 */
export function puntualidad(
  entregas: readonly { readonly prevista: FechaOperativa | null; readonly llego: FechaOperativa }[],
): Puntualidad {
  let aTiempo = 0;
  let tarde = 0;
  for (const entrega of entregas) {
    if (entrega.prevista === null) continue;
    if (entrega.llego <= entrega.prevista) aTiempo += 1;
    else tarde += 1;
  }
  const total = aTiempo + tarde;
  return {
    aTiempo,
    tarde,
    frase:
      total === 0
        ? null
        : tarde === 0
          ? `${total === 1 ? 'La entrega llegó' : `Las ${total} entregas llegaron`} el día previsto.`
          : `${tarde} de ${total} ${total === 1 ? 'entrega llegó' : 'entregas llegaron'} tarde.`,
  };
}
