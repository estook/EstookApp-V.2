import { centimos, type Centimos } from './dinero.ts';
import { sinIva } from './iva.ts';
import { porcentajeDe } from './cierre.ts';
import { conUnidad, enumerar, plural } from './textos.ts';
import { cantidad, costeDeLinea, milesimas } from './coste.ts';
import {
  horaEnElLocal,
  jornadaDe,
  masDias,
  type FechaOperativa,
  type HoraDeCorte,
} from './tiempo.ts';

/**
 * M8 · lo gastado de verdad y la desviación (decisión 0079, la segunda entrega).
 *
 * Las cuentas viven aquí y en ningún otro sitio, por la regla de siempre: la pantalla
 * de la desviación, el aviso de lo que falta al cerrar un inventario y la prueba que
 * lo cuadra «con una cuenta a mano» leen las mismas. Si cada uno contara a su manera,
 * el aviso diría «faltan 64 €» y la pantalla 61.
 *
 * ── Las tres cifras, en llano ────────────────────────────────────────────────
 *
 *   · **Lo gastado de verdad**, de un producto, entre sus dos últimos inventarios:
 *     lo que había al contar + lo que entró − lo que hay al volver a contar.
 *   · **El food cost real**, del local, en un periodo: (lo que había + lo que se
 *     compró − lo que queda) ÷ lo vendido sin IVA (Manifiesto 12, hallazgo 3).
 *   · **La desviación de lo que se vende tal cual** (1A): lo gastado de verdad menos
 *     lo que dice **la caja** que se vendió y lo apuntado como merma o salida. Siempre
 *     con **su causa más probable** (hallazgo 4), y nunca con un nombre de persona:
 *     quién contó o recibió está en el libro, no en el informe (0078).
 *
 * Lo que se cocina **no tiene desviación hasta M9**: sin la ficha no se sabe cuánto
 * debía gastarse, y compararlo con lo apuntado lo daría todo por «falta» (la 1C que
 * se descartó). De eso se enseña lo gastado de verdad, que ya vale.
 */

// ── Lo gastado de verdad ─────────────────────────────────────────────────────

/**
 * Lo que vale una cantidad a precio medio, en céntimos: lo gastado, lo que falta. Con
 * su signo: lo que sobra vale en negativo. Nulo si no se sabe lo que cuesta.
 */
export function loQueVale(cuanto: number, costeMilesimas: number | null): Centimos | null {
  if (costeMilesimas === null) return null;
  return costeDeLinea(milesimas(costeMilesimas), cantidad(cuanto));
}

/** Lo que había + lo que entró − lo que queda. Puede salir negativo: es que sobra. */
export function loGastado(habia: number, entro: number, queda: number): number {
  return cantidad(habia + entro - queda);
}

/**
 * Si una diferencia es tan pequeña que no vale la pena contarla: un 2 % de lo
 * gastado. Contar 9,8 kg donde había 10 es pesar, no perder.
 */
export const LO_QUE_CUADRA = 0.02;

export function cuadra(desviacion: number, gastado: number): boolean {
  return Math.abs(desviacion) <= Math.max(Math.abs(gastado) * LO_QUE_CUADRA, 0.0001);
}

// ── Qué días de caja van con cada inventario ─────────────────────────────────

/**
 * Hasta cuántas horas después del corte se cuenta **antes** del servicio.
 *
 * Con el corte a las 05:00, contar entre las 05:00 y las 12:00 es contar antes de
 * abrir: las ventas de ese día van después. Contar de tarde o de noche es contar
 * después: las ventas de ese día van antes. Es la única forma de decidir de qué lado
 * cae un día de caja sin preguntarlo cada vez, y se dice en pantalla qué días entran.
 */
export const HORAS_TRAS_EL_CORTE_QUE_SON_ANTES_DE_ABRIR = 7;

/** La primera jornada cuyas ventas van **después** de un conteo. */
export function primeraJornadaTrasContar(
  contadoEn: Date,
  zonaHoraria: string,
  corte: HoraDeCorte,
): FechaOperativa {
  const jornada = jornadaDe(contadoEn, zonaHoraria, corte);
  const [h, m] = horaEnElLocal(contadoEn, zonaHoraria).split(':').map(Number) as [number, number];
  const [hc, mc] = corte.split(':').map(Number) as [number, number];
  const desdeElCorte = (h * 60 + m - (hc * 60 + mc) + 1440) % 1440;
  return desdeElCorte < HORAS_TRAS_EL_CORTE_QUE_SON_ANTES_DE_ABRIR * 60
    ? jornada
    : masDias(jornada, 1);
}

/** Las jornadas de `desde` (incluida) a `hasta` (sin incluir). */
export function jornadasEntre(desde: FechaOperativa, hasta: FechaOperativa): FechaOperativa[] {
  const dias: FechaOperativa[] = [];
  for (let dia = desde; dia < hasta && dias.length < 400; dia = masDias(dia, 1)) dias.push(dia);
  return dias;
}

// ── El food cost real ────────────────────────────────────────────────────────
//
// **Sin brecha hasta M9.** El Manifiesto pone el real al lado del teórico, y la
// brecha entre los dos es «donde está el dinero». El teórico sale de las fichas (M9,
// 0078). Compararlo mientras tanto con lo apuntado sería caer en la 1C que se
// descartó: en una cocina casi nadie apunta lo que cocina, y la brecha saldría
// siempre «fuga». Hasta entonces se compara con **el objetivo de materia prima** del
// local, con el semáforo de siempre (`comoVaFrenteAlObjetivo`).

/** Lo que entra en la cuenta del food cost real de un periodo, todo en céntimos. */
export interface CuentaDelFoodCost {
  /** Lo que valía el almacén al acabar el día de antes de empezar. */
  readonly habia: number;
  /** Lo que entró, a lo que costó, menos lo devuelto al proveedor. */
  readonly compras: number;
  /** Lo que vale al acabar el último día. */
  readonly queda: number;
  /** Lo que se llevó otro local: sale, pero no se ha gastado aquí. */
  readonly traspasos: number;
  /** La comida del personal y las invitaciones: partida aparte (Manifiesto 12, 0026). */
  readonly aparte: number;
  /** Lo que dice la caja, con IVA. */
  readonly ventasConImpuesto: number;
  /** El tipo del servicio de restauración del local (0,10). Nulo: no se sabe. */
  readonly tipoDeImpuesto: number | null;
  readonly diasDelPeriodo: number;
  readonly diasConCaja: number;
}

export interface FoodCostReal {
  /** Había + compras − queda − traspasos − lo que va aparte. */
  readonly consumoReal: Centimos;
  readonly ventasSinImpuesto: Centimos | null;
  /** En %, con un decimal. Nulo sin ventas. */
  readonly real: number | null;
  readonly faltanDiasDeCaja: number;
  /** Si se puede dar por exacto: todos los días con caja y el impuesto conocido. */
  readonly exacto: boolean;
}

/**
 * El food cost real (Manifiesto 12, Auditoría hallazgo 3), **sin IVA** (0078, 6): las
 * compras ya van sin él, y lo vendido se le quita con el tipo de restauración del
 * local. **Sin días de caja no se da por exacto** y se dice cuántos faltan.
 */
export function foodCostReal(cuenta: CuentaDelFoodCost): FoodCostReal {
  const consumoReal = centimos(
    cuenta.habia + cuenta.compras - cuenta.queda - cuenta.traspasos - cuenta.aparte,
  );
  const ventasSinImpuesto =
    cuenta.tipoDeImpuesto === null || cuenta.ventasConImpuesto <= 0
      ? null
      : sinIva(centimos(cuenta.ventasConImpuesto), cuenta.tipoDeImpuesto);
  const real = ventasSinImpuesto === null ? null : porcentajeDe(consumoReal, ventasSinImpuesto);
  const faltan = Math.max(cuenta.diasDelPeriodo - cuenta.diasConCaja, 0);
  return {
    consumoReal,
    ventasSinImpuesto,
    real,
    faltanDiasDeCaja: faltan,
    exacto: faltan === 0 && cuenta.tipoDeImpuesto !== null && ventasSinImpuesto !== null,
  };
}

// ── La causa probable ────────────────────────────────────────────────────────

export const CAUSAS = [
  'unidad_de_conteo',
  'faltan_dias_de_caja',
  'otro_nombre_en_la_caja',
  'recepcion',
  'entrada_sin_apuntar',
  'sin_apuntar',
] as const;

export type Causa = (typeof CAUSAS)[number];

/** Cómo se llama cada causa, y dónde se comprueba (hallazgo 4: «con el enlace»). */
export const COMO_ES_LA_CAUSA: Readonly<Record<Causa, { nombre: string; seMira: string }>> = {
  unidad_de_conteo: { nombre: 'Contado en otra unidad', seMira: 'el inventario' },
  faltan_dias_de_caja: { nombre: 'Faltan días de caja', seMira: 'los cierres de caja' },
  otro_nombre_en_la_caja: { nombre: 'Se vende con otro nombre', seMira: 'las líneas de la caja' },
  recepcion: { nombre: 'Recepción mal apuntada', seMira: 'los albaranes' },
  entrada_sin_apuntar: { nombre: 'Entró sin apuntarse', seMira: 'los albaranes' },
  sin_apuntar: { nombre: 'Salidas sin apuntar', seMira: 'las mermas' },
};

export interface LoQueSeSabeDeLaDesviacion {
  /** Lo gastado − lo esperado. Positivo: falta. Negativo: sobra. */
  readonly desviacion: number;
  readonly gastado: number;
  readonly unidad: string;
  /** Lo que se contó la segunda vez, y lo que decía el libro entonces. */
  readonly hay: number;
  readonly decia: number;
  /** Cuántas unidades de uso trae una caja. 1 si no se compra en cajas. */
  readonly factor: number;
  /** Solo lo que se vende tal cual: los días sin caja de su ventana. */
  readonly diasSinCaja: number;
  /** Las líneas de la caja sin emparejar que se parecen a este producto. */
  readonly otrosNombres: readonly string[];
  /** Los albaranes de su ventana que llegaron con incidencias. */
  readonly albaranesConIncidencias: number;
  /** Lo que entró a mano, sin albarán, en su ventana. */
  readonly entradasAMano: readonly number[];
}

export interface CausaProbable {
  readonly causa: Causa;
  readonly porque: string;
}

/** Si dos cantidades se parecen: un 10 %, que es lo que baila al pesar y al contar. */
function seParece(una: number, otra: number): boolean {
  if (otra === 0) return Math.abs(una) < 0.0001;
  return Math.abs(una - otra) <= Math.abs(otra) * 0.1;
}

/**
 * La causa más probable de una desviación (Auditoría, hallazgo 4), con lo que Estook
 * ya sabe y en este orden: lo que se puede comprobar primero, y la explicación de
 * siempre —salió sin apuntarse— solo cuando no hay otra. **Nulo si cuadra.**
 *
 * «Error de escandallo» llega con las fichas (M9); «albarán contra factura» mueve
 * euros, no unidades, y se mira en Compras → Facturas.
 */
export function causaProbable(datos: LoQueSeSabeDeLaDesviacion): CausaProbable | null {
  if (cuadra(datos.desviacion, datos.gastado)) return null;
  const cuanto = conUnidad(cantidad(Math.abs(datos.desviacion)), datos.unidad);

  // Contado en cajas donde iban unidades, o al revés: lo contado × la caja es lo que
  // decía el libro, o lo contado ÷ la caja.
  if (
    datos.factor > 1 &&
    datos.hay > 0 &&
    datos.decia > 0 &&
    (seParece(datos.hay * datos.factor, datos.decia) ||
      seParece(datos.hay, datos.decia * datos.factor))
  ) {
    return {
      causa: 'unidad_de_conteo',
      porque: `Se contaron ${conUnidad(cantidad(datos.hay), datos.unidad)} y el libro decía ${conUnidad(cantidad(datos.decia), datos.unidad)}: parece contado en cajas de ${String(datos.factor)} en vez de en ${datos.unidad}, o al revés.`,
    };
  }

  if (datos.desviacion < 0) {
    return {
      causa: 'entrada_sin_apuntar',
      porque: `Sobran ${cuanto}: algo entró sin apuntarse, o se contó de más.`,
    };
  }

  if (datos.diasSinCaja > 0) {
    return {
      causa: 'faltan_dias_de_caja',
      porque: `Faltan ${plural(datos.diasSinCaja, 'día', 'días')} de caja: lo vendido esos días no está en la cuenta.`,
    };
  }

  if (datos.otrosNombres.length > 0) {
    const nombres = enumerar(datos.otrosNombres.slice(0, 3).map((n) => `«${n}»`));
    return {
      causa: 'otro_nombre_en_la_caja',
      porque: `En la caja hay ${nombres} sin emparejar: si es este producto, emparéjalo y se cuenta.`,
    };
  }

  const entradaQueCuadra = datos.entradasAMano.find((e) => seParece(e, datos.desviacion));
  if (datos.albaranesConIncidencias > 0 || entradaQueCuadra !== undefined) {
    return {
      causa: 'recepcion',
      porque:
        entradaQueCuadra === undefined
          ? `Faltan ${cuanto} y ${datos.albaranesConIncidencias === 1 ? 'un albarán de estos días llegó' : 'unos albaranes de estos días llegaron'} con incidencias: puede que entrara menos de lo apuntado.`
          : `Faltan ${cuanto}, lo mismo que una entrada apuntada a mano: puede que no llegara.`,
    };
  }

  return {
    causa: 'sin_apuntar',
    porque: `Faltan ${cuanto}: lo más probable, comida del personal, invitaciones o roturas sin apuntar.`,
  };
}

// ── El aviso de lo que falta al cerrar ───────────────────────────────────────

/**
 * Desde qué parte de lo gastado avisa lo que falta al cerrar (0078, «lo que decido
 * yo» 9): un 3 %. Lo de menos se ve en la desviación, pero no suena.
 */
export const PARTE_QUE_AVISA = 0.03;

export function faltaComoParaAvisar(faltaCentimos: number, gastadoCentimos: number): boolean {
  return (
    faltaCentimos > 0 && gastadoCentimos > 0 && faltaCentimos > gastadoCentimos * PARTE_QUE_AVISA
  );
}
