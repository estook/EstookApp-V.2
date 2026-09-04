import {
  cantidad,
  milesimas,
  precioMedioPonderado,
  type Cantidad,
  type Milesimas,
} from './coste.ts';
import { masDias, type FechaOperativa } from './tiempo.ts';

/**
 * Motor de inventario (M6) · el libro de movimientos y la capa que predice.
 *
 * Aquí vive **toda** la aritmética del stock, y por eso está en el dominio y no
 * en la base de datos (regla 6: un cálculo, un único dueño). La base de datos
 * guarda; quien suma, resta y pondera el precio es este fichero.
 *
 * ── Por qué no se calcula en SQL, que sería lo cómodo ────────────────────────
 *
 * Porque `precioMedioPonderado` ya existe en `coste.ts` desde M2. Escribirlo
 * otra vez en un disparador de Postgres serían dos dueños del mismo cálculo, y
 * el día que uno de los dos redondeara distinto, el valor de la cámara y el
 * coste de los platos dejarían de cuadrar sin que nadie supiera por qué.
 *
 * ── Las tres reglas críticas de la ficha de M6 ───────────────────────────────
 *
 *   1. **El stock nunca se escribe directo.** Se inserta un movimiento (regla 8
 *      del Plan). Ajustar a mano es un movimiento más, con su autor y su motivo.
 *   2. **Un producto sin precio se usa y queda marcado.** Cuenta cero, y nunca
 *      bloquea nada.
 *   3. **El stock negativo se permite y se marca.** «Si el sistema dice que no
 *      queda género, deja de creerse el sistema» (Manifiesto 28).
 *
 * La tercera es la que obliga a que este fichero exista y no baste con
 * `precioMedioPonderado`: esa función rechaza cantidades negativas, y con razón,
 * porque un precio medio sobre una deuda no significa nada. El libro sí tiene
 * que saber qué hacer cuando llega género a una cámara que estaba en números
 * rojos, y la respuesta está escrita abajo, en `siguienteEstado`.
 */

// ── El libro de movimientos ──────────────────────────────────────────────────

/**
 * Los tipos de movimiento, en catálogo cerrado.
 *
 * Se declaran los seis de una vez porque son vocabulario, como las unidades de
 * uso o los alérgenos, y un catálogo cerrado se declara una sola vez. **M6 solo
 * produce tres**; los otros los produce el módulo que dice cada uno:
 *
 *   entrada   M6 a mano · M7 al recibir un albarán
 *   salida    M6 a mano: género que sale y no es merma ni venta
 *   ajuste    M6 · «ajustar lo que hay en cámara», con motivo obligatorio
 *   merma     M8 · con su lista cerrada de motivos y su partida aparte
 *   consumo   M20 · lo que descuentan las ventas al explotar sus fichas
 *   recuento  M8 · el cierre de un inventario físico
 */
export const TIPOS_DE_MOVIMIENTO = [
  'entrada',
  'salida',
  'ajuste',
  'merma',
  'consumo',
  'recuento',
] as const;

export type TipoDeMovimiento = (typeof TIPOS_DE_MOVIMIENTO)[number];

export function esTipoDeMovimiento(valor: unknown): valor is TipoDeMovimiento {
  return typeof valor === 'string' && (TIPOS_DE_MOVIMIENTO as readonly string[]).includes(valor);
}

/** Lo que hay en cámara y a cuánto está valorado, después de un movimiento. */
export interface EstadoDelStock {
  readonly cantidad: Cantidad;
  /** El precio medio ponderado, en milésimas de céntimo por unidad de uso. */
  readonly coste: Milesimas;
}

export const CAMARA_VACIA: EstadoDelStock = {
  cantidad: cantidad(0),
  coste: milesimas(0),
};

export interface Movimiento {
  readonly tipo: TipoDeMovimiento;
  /**
   * En la unidad de uso del producto, siempre (Auditoría, parte 7). Positiva
   * entra, negativa sale, **nunca cero**: un movimiento que no mueve nada no es
   * un movimiento, es una línea de ruido en el libro.
   */
  readonly cantidad: Cantidad;
  /**
   * Lo que costó **esta** unidad, en milésimas. Solo tiene sentido en una
   * entrada; nulo cuando no se sabe, que es lo normal al ajustar a mano.
   */
  readonly coste?: Milesimas | null;
}

/**
 * El estado de la cámara después de aplicar un movimiento.
 *
 * Es la única función que decide cómo se mueve el stock, y de ella cuelga que
 * reconstruir el libro entero dé exactamente los mismos números que ir
 * apuntándolos uno a uno. Esa igualdad es un criterio de terminado de M6, y
 * tiene su prueba.
 *
 * ── Qué le pasa al precio medio en cada caso ─────────────────────────────────
 *
 * | Situación                             | El precio medio               |
 * | ------------------------------------- | ----------------------------- |
 * | Entra género con precio, y había stock| Se pondera: el caso normal    |
 * | Entra género con precio, cámara a cero| Manda el que acaba de llegar  |
 * | Entra género con la cámara EN NEGATIVO| Manda el que acaba de llegar  |
 * | Entra género sin precio               | Se queda el que había         |
 * | Sale género, se ajusta o se merma     | Se queda el que había         |
 *
 * La fila del medio es la que obliga a que esta función exista. Con el stock en
 * −3 kg, ponderar daría un precio medio negativo o disparatado, y ese número
 * acabaría dentro del coste de un plato. Lo correcto es lo que hace un almacén
 * de verdad: lo que hay ahora en la cámara **es** lo que acaba de entrar, así
 * que vale lo que ha costado.
 */
export function siguienteEstado(actual: EstadoDelStock, movimiento: Movimiento): EstadoDelStock {
  const nuevaCantidad = cantidad(actual.cantidad + movimiento.cantidad);

  const entra = movimiento.cantidad > 0;
  const coste = movimiento.coste ?? null;

  if (!entra || coste === null) {
    return { cantidad: nuevaCantidad, coste: actual.coste };
  }

  // Sin nada en cámara —o con la cámara en números rojos— no hay nada que
  // ponderar: manda lo que acaba de entrar.
  if (actual.cantidad <= 0) {
    return { cantidad: nuevaCantidad, coste };
  }

  return {
    cantidad: nuevaCantidad,
    coste: precioMedioPonderado(
      { cantidad: actual.cantidad, coste: actual.coste },
      { cantidad: movimiento.cantidad, coste },
    ),
  };
}

/**
 * Reconstruye el libro entero desde el principio.
 *
 * «El stock se reconstruye entero desde los movimientos» es un criterio de
 * terminado de M6, y esta función es lo que lo hace comprobable: se replican
 * todos los movimientos de un producto y tiene que salir **exactamente** lo
 * mismo que quedó apuntado en cada línea, hasta la última milésima.
 *
 * Es también la respuesta a la Auditoría: «reconstruir los agregados desde cero
 * da exactamente los mismos números».
 */
export function reconstruir(movimientos: readonly Movimiento[]): readonly EstadoDelStock[] {
  const estados: EstadoDelStock[] = [];
  let estado = CAMARA_VACIA;

  for (const movimiento of movimientos) {
    estado = siguienteEstado(estado, movimiento);
    estados.push(estado);
  }

  return estados;
}

/**
 * De «hay 4 kg» a un movimiento.
 *
 * «Si el jefe de cocina dice que hay 4 kg, hay 4 kg: se apunta el ajuste con
 *  quién y cuándo. **Nunca se bloquea a nadie por cuadrar**» (Manifiesto 12).
 *
 * La pantalla pregunta cuánto hay, que es lo que una persona sabe mirando la
 * cámara. El libro guarda la diferencia, que es lo que un libro guarda. Devuelve
 * nulo cuando no hay diferencia: apuntar un ajuste de cero sería ensuciar el
 * histórico con una línea que no cuenta nada.
 */
export function ajusteHasta(actual: Cantidad, loQueHay: Cantidad): Cantidad | null {
  const diferencia = cantidad(loQueHay - actual);
  return diferencia === 0 ? null : diferencia;
}

// ── La capa que predice ──────────────────────────────────────────────────────

/**
 * Cuántos días se miran hacia atrás para saber cuánto se gasta.
 *
 * Cuatro semanas: coge los cuatro fines de semana, que es donde está casi toda
 * la diferencia en hostelería, y no arrastra la temporada anterior.
 */
export const VENTANA_DE_CONSUMO = 28;

/**
 * Con menos historia que esta no se predice nada.
 *
 * «Si el dato no está, lo dice» (Evolución 1.0, capítulo 8). Una previsión hecha
 * con dos días de historia es peor que no dar previsión: parece un dato y es una
 * corazonada, y encima con la autoridad de estar escrita en la pantalla.
 */
export const DIAS_MINIMOS_PARA_PREDECIR = 7;

/** Lo que se quiere tener siempre en cámara, en días (Manifiesto 12). */
export const DIAS_DE_COBERTURA_OBJETIVO = 5;

export interface Salida {
  readonly fecha: FechaOperativa;
  /** Lo que salió. Se toma en valor absoluto, venga con signo o sin él. */
  readonly cantidad: number;
}

export interface Consumo {
  /** Lo que se gasta al día, en unidades de uso. Nulo si no hay con qué decirlo. */
  readonly porDia: number | null;
  /** Sobre cuántos días se ha mirado. Va siempre con la cifra, nunca sin ella. */
  readonly diasMirados: number;
  /** Por qué no hay cifra, cuando no la hay. Se enseña tal cual. */
  readonly porque: string | null;
}

/**
 * Cuánto se gasta al día de un producto.
 *
 * ── Por qué se divide entre los días de la ventana, y no entre los días que ──
 * ── tuvieron movimiento, que es la cuenta que sale más «bonita» ──────────────
 *
 * Porque lo que se quiere saber es cuánto dura lo que hay en la cámara, y la
 * cámara también se vacía los días que nadie apunta nada. Dividir entre los días
 * con movimiento daría el gasto de un día de servicio, no el gasto medio, y la
 * previsión de agotamiento saldría siempre demasiado pronto.
 *
 * Se cuentan **solo las salidas**: lo que entra no se consume. Y un ajuste
 * negativo cuenta como salida, porque el género que falta al cuadrar se ha ido
 * de verdad, aunque nadie sepa por dónde.
 */
export function consumoMedioDiario(
  salidas: readonly Salida[],
  desde: FechaOperativa,
  hasta: FechaOperativa,
  diasConDatos: number,
): Consumo {
  if (diasConDatos < DIAS_MINIMOS_PARA_PREDECIR) {
    return {
      porDia: null,
      diasMirados: Math.max(diasConDatos, 0),
      porque:
        diasConDatos <= 0
          ? 'Todavía no hay movimientos con los que calcular el consumo.'
          : `Llevo ${diasConDatos} ${diasConDatos === 1 ? 'día' : 'días'} de historia y necesito ${DIAS_MINIMOS_PARA_PREDECIR} para no inventarme una cifra.`,
    };
  }

  const dentro = salidas.filter((s) => s.fecha >= desde && s.fecha <= hasta);
  const total = dentro.reduce((suma, s) => suma + Math.abs(s.cantidad), 0);

  if (total <= 0) {
    return {
      porDia: null,
      diasMirados: diasConDatos,
      porque: 'No ha salido nada de este producto, así que no sé a qué ritmo se gasta.',
    };
  }

  return {
    porDia: Number((total / diasConDatos).toFixed(4)),
    diasMirados: diasConDatos,
    porque: null,
  };
}

/**
 * Días que aguanta lo que hay. Nulo cuando no se sabe a qué ritmo se gasta.
 *
 * Con el stock en negativo son cero días: ya no aguanta nada, y decir «−1,3
 * días» sería un número con forma de dato que no significa nada.
 */
export function diasDeCobertura(existencias: number, consumoPorDia: number | null): number | null {
  if (consumoPorDia === null || consumoPorDia <= 0) return null;
  if (existencias <= 0) return 0;
  return Number((existencias / consumoPorDia).toFixed(2));
}

/**
 * Cuándo se agota, con fecha **y hora**.
 *
 * Es lo que la Evolución 1.0 le pide a M6 con esas palabras: «previsión de
 * agotamiento con fecha y hora», del ejemplo «se agota el viernes a las 20:30».
 *
 * ── La hora, y por qué el consumo se reparte por todo el día ─────────────────
 *
 * El consumo se reparte de forma uniforme sobre las veinticuatro horas. No es
 * que se cocine de madrugada: es que **Estook todavía no sabe a qué hora abre
 * cada local** —eso llega con el calendario, en M14— y repartirlo sobre un
 * horario inventado daría una hora con más precisión aparente y menos verdad.
 *
 * Lo que el criterio de terminado del módulo exige es acertar **el día**, y eso
 * sale igual de bien de las dos maneras. La hora se enseña porque a las nueve de
 * la mañana no es lo mismo que te digan «hoy» que «hoy a las 20:30»: con la
 * segunda te da tiempo a pedir.
 */
export function previsionDeAgotamiento(
  existencias: number,
  consumoPorDia: number | null,
  ahora: Date,
): Date | null {
  const dias = diasDeCobertura(existencias, consumoPorDia);
  if (dias === null) return null;
  return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000);
}

/** La misma previsión, en fecha operativa, para poder compararla con el libro. */
export function diaDeAgotamiento(
  existencias: number,
  consumoPorDia: number | null,
  hoy: FechaOperativa,
): FechaOperativa | null {
  const dias = diasDeCobertura(existencias, consumoPorDia);
  if (dias === null) return null;
  return masDias(hoy, Math.floor(dias));
}

// ── Cómo está un producto ────────────────────────────────────────────────────

/**
 * Los estados en los que puede estar lo que hay en cámara.
 *
 * `sin_minimo` no es un fallo: es que nadie ha dicho cuánto quiere tener. Hasta
 * M8 el mínimo se escribe a mano, y se distingue de `bien` a propósito, porque
 * «no lo sé» y «está bien» no son lo mismo y enseñarlos igual sería mentir.
 */
export const ESTADOS_DEL_STOCK = [
  'negativo',
  'agotado',
  'bajo_minimo',
  'bien',
  'sin_minimo',
] as const;

export type EstadoDeExistencias = (typeof ESTADOS_DEL_STOCK)[number];

export function comoEsta(existencias: number, minimo: number | null): EstadoDeExistencias {
  if (existencias < 0) return 'negativo';
  if (existencias === 0) return 'agotado';
  if (minimo === null) return 'sin_minimo';
  return existencias < minimo ? 'bajo_minimo' : 'bien';
}

/** Cómo se llama cada estado en pantalla. Sin jerga (principio 14). */
export const NOMBRE_DEL_ESTADO: Readonly<Record<EstadoDeExistencias, string>> = {
  negativo: 'En negativo',
  agotado: 'No queda nada',
  bajo_minimo: 'Por debajo del mínimo',
  bien: 'Hay de sobra',
  sin_minimo: 'Sin mínimo puesto',
};

/** Cuánto pesa cada estado al ordenar la pantalla «Hoy»: primero lo peor. */
export function urgenciaDe(estado: EstadoDeExistencias): number {
  const orden: Readonly<Record<EstadoDeExistencias, number>> = {
    negativo: 0,
    agotado: 1,
    bajo_minimo: 2,
    sin_minimo: 3,
    bien: 4,
  };
  return orden[estado];
}

// ── La sugerencia de pedido, con su motivo escrito ───────────────────────────

export interface Sugerencia {
  readonly cuanto: number;
  /** «Mantener unos 5 días de cobertura». Se enseña tal cual, sin recomponerla. */
  readonly motivo: string;
}

/**
 * Cuánto pedir, y por qué.
 *
 * «Motivo: mantener unos 5 días de cobertura» (Manifiesto 12). La cifra sin el
 * motivo no vale: una recomendación que no se puede discutir no se sigue.
 *
 * **Lo que esta función no hace, y es de M7**: mirar qué días reparte el
 * proveedor y si el pedido llega a su pedido mínimo. Hasta entonces la
 * sugerencia es honesta con lo que sabe, y lo dice en su motivo.
 */
export function pedidoRecomendado(
  existencias: number,
  consumoPorDia: number | null,
  diasObjetivo: number = DIAS_DE_COBERTURA_OBJETIVO,
): Sugerencia | null {
  if (consumoPorDia === null || consumoPorDia <= 0) return null;

  const objetivo = consumoPorDia * diasObjetivo;
  const falta = objetivo - existencias;
  if (falta <= 0) return null;

  return {
    cuanto: Number(falta.toFixed(2)),
    motivo: `Mantener unos ${diasObjetivo} días de cobertura al ritmo al que se está gastando.`,
  };
}

// ── El cambio de precio, contado como lo que es ──────────────────────────────

export interface CambioDePrecio {
  /** La variación como fracción: 0,12 es un 12 % más caro. Nulo si no había antes. */
  readonly variacion: number | null;
  readonly subeBaja: 'sube' | 'baja' | 'igual' | 'primero';
  /** La frase, hecha. «Ha subido un 12 %.» */
  readonly frase: string;
}

/**
 * Cuánto ha cambiado un precio.
 *
 * Es el principio de la cascada de la Auditoría (2.1): «El aceite ha subido un
 * 12 %. Afecta a 7 platos; 2 se quedan bajo objetivo». M6 puede decir la primera
 * frase entera; la segunda necesita fichas técnicas, y esas son M9.
 */
export function comoHaCambiado(antes: number | null, ahora: number): CambioDePrecio {
  if (antes === null || antes <= 0) {
    return { variacion: null, subeBaja: 'primero', frase: 'Es el primer precio que le pones.' };
  }

  const variacion = Number(((ahora - antes) / antes).toFixed(4));

  if (variacion === 0) {
    return { variacion: 0, subeBaja: 'igual', frase: 'Se queda en el mismo precio.' };
  }

  const cuanto = Math.abs(variacion * 100)
    .toFixed(1)
    .replace('.', ',')
    .replace(',0', '');

  return {
    variacion,
    subeBaja: variacion > 0 ? 'sube' : 'baja',
    frase: variacion > 0 ? `Ha subido un ${cuanto} %.` : `Ha bajado un ${cuanto} %.`,
  };
}
