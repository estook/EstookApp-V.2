import { centimos, porFraccion, type Centimos } from './dinero.ts';
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
// El Manifiesto pone el real al lado del teórico, y la brecha entre los dos es «donde
// está el dinero». **Con Estook TPV ya hay teórico** (M20 · 2, 0151): lo que costó lo
// vendido según sus escandallos, en `laBrechaDelFoodCost`, al final de este fichero.
// Sin Estook TPV no lo hay —compararlo con lo apuntado sería caer en la 1C que se
// descartó—, y se compara con **el objetivo de materia prima** del local, con el
// semáforo de siempre (`comoVaFrenteAlObjetivo`).

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

// ── Lo que se escapa (M20 · 2, decisión 0151) ────────────────────────────────
//
// **Con Estook TPV, el libro ya sabe lo que tenía que salir**: cada venta resta su
// escandallo (M20 · 1), y las mermas y lo sacado a mano ya estaban apuntados. Así que
// lo que se escapa de un producto, entre dos inventarios, es **una resta**: lo gastado
// de verdad (había + entró − queda) menos lo que el libro sabe por qué salió. Es lo
// mismo que tuvo que ajustar el inventario, con el signo cambiado: no hay una cuenta
// nueva, solo se lee la que ya había.
//
// **Siempre hay margen** (Richi, 22-nov: «esto no es un policía»). Ninguna cocina pesa
// al gramo: lo que cae dentro del margen no se enseña. Es un margen fijo, el mismo para
// todos, sin nada que ajustar; si el uso dice que se queda corto o largo, se cambia aquí
// y en la 0151, con lo medido.

/** Hasta qué parte de lo que tenía que salir se da por normal que falte: un 5 %. */
export const MARGEN_DE_LO_QUE_SE_ESCAPA = 0.05;

/** Y lo que vale menos de esto tampoco se enseña: 5 €. Faltar 30 g de perejil no es nada. */
export const LO_POCO_QUE_SE_ESCAPA = centimos(500);

/** Cuántos productos se enseñan como mucho: los que más dinero se llevan. */
export const CUANTOS_SE_ESCAPAN_A_LA_VISTA = 3;

/** Un producto vigilado: vendido en Estook TPV, y contado dos veces desde entonces. */
export interface ProductoVigilado {
  readonly id: string;
  /** Lo gastado de verdad: había + entró − queda. */
  readonly gastado: number;
  /** Lo que el libro sabe por qué salió: lo vendido, las mermas y lo sacado a mano. */
  readonly apuntado: number;
  /** Lo que cuesta cada unidad, en milésimas. Nulo si no se sabe (o no se puede ver). */
  readonly costeMilesimas: number | null;
}

export interface LoQueSeEscapaDeUnProducto {
  readonly id: string;
  /** Lo que falta: lo gastado que nadie sabe dónde fue. En negativo, sobra. */
  readonly falta: number;
  /** Lo que tenía que salir, según el libro. */
  readonly debiaSalir: number;
  /** La parte de lo que tenía que salir que falta, en fracción con cuatro decimales. */
  readonly parte: number | null;
  /** Lo que vale lo que falta, a precio medio. */
  readonly centimos: Centimos | null;
  /** Si se sale del margen: es lo único que se enseña. */
  readonly seSale: boolean;
}

/**
 * Si lo que falta se sale del margen: que falte, que pase del 5 % de lo que tenía que salir
 * y que valga 5 € o más. Lo que sobra no se sale nunca: no es dinero que se va.
 */
export function seSaleDelMargen(
  falta: number,
  debiaSalir: number,
  valor: Centimos | null,
): boolean {
  if (falta <= 0) return false;
  if (falta <= Math.max(debiaSalir, 0) * MARGEN_DE_LO_QUE_SE_ESCAPA) return false;
  return valor === null || valor >= LO_POCO_QUE_SE_ESCAPA;
}

export function loQueSeEscapaDeUnProducto(p: ProductoVigilado): LoQueSeEscapaDeUnProducto {
  const falta = cantidad(p.gastado - p.apuntado);
  const valor = loQueVale(falta, p.costeMilesimas);
  return {
    id: p.id,
    falta,
    debiaSalir: p.apuntado,
    parte: p.apuntado > 0 ? Number((falta / p.apuntado).toFixed(4)) : null,
    centimos: valor,
    seSale: seSaleDelMargen(falta, p.apuntado, valor),
  };
}

export interface LoQueSeEscapa {
  readonly vigilados: number;
  /** Los que se salen del margen: el que más dinero se lleva, primero. */
  readonly seSalen: readonly LoQueSeEscapaDeUnProducto[];
  /** Lo que valen todos los que se salen, juntos. Nulo si alguno no tiene precio. */
  readonly centimos: Centimos | null;
}

/**
 * Lo que se escapa de un almacén: de cada producto vigilado, si se sale del margen. Se ordena
 * por euros, no por porcentaje (un 15 % en perejil es ruido; un 4 % en salmón cuesta miles), y
 * sin precio, por la parte que falta.
 */
export function loQueSeEscapa(productos: readonly ProductoVigilado[]): LoQueSeEscapa {
  const seSalen = productos
    .map(loQueSeEscapaDeUnProducto)
    .filter((p) => p.seSale)
    .sort(
      (a, b) =>
        (b.centimos ?? -1) - (a.centimos ?? -1) ||
        (b.parte ?? 0) - (a.parte ?? 0) ||
        a.id.localeCompare(b.id),
    );
  const todosConPrecio = seSalen.every((p) => p.centimos !== null);
  return {
    vigilados: productos.length,
    seSalen,
    centimos: todosConPrecio
      ? centimos(seSalen.reduce((total, p) => total + (p.centimos ?? 0), 0))
      : null,
  };
}

// ── El food cost de tus escandallos, junto al real (M20 · 2, 0151) ───────────
//
// Lo que **debería** costar lo vendido según sus escandallos, con el coste congelado de
// cada venta (`linea_bajada`), frente a lo que costó de verdad. La diferencia es lo que
// se tira y lo que se escapa. Solo con lo vendido que tiene escandallo: de lo demás no
// se sabe qué lleva, y se dice qué parte de lo vendido sí lo tiene.

/** Hasta cuántos puntos de diferencia entre el real y el de los escandallos es lo normal. */
export const MARGEN_DEL_FOOD_COST = 3;

export interface LoVendidoConSuCoste {
  /** Lo que costó lo vendido con escandallo, en céntimos. */
  readonly coste: number;
  /** Lo vendido con escandallo, sin IVA. */
  readonly ventasConCoste: number;
  /** Todo lo vendido en Estook TPV en el periodo, sin IVA. */
  readonly ventas: number;
}

export interface LaBrechaDelFoodCost extends LoVendidoConSuCoste {
  /** El food cost de tus escandallos, en %, con un decimal. */
  readonly teorico: number;
  /** La parte de lo vendido que tiene escandallo, en fracción con cuatro decimales. */
  readonly parteConEscandallo: number;
  /** Real − escandallos, en puntos y con un decimal: lo que se resta en pantalla, cuadra. */
  readonly puntos: number | null;
  /** Lo que se ha ido de más (o de menos) en el periodo, en céntimos. */
  readonly centimos: Centimos | null;
  /** Si la diferencia cae dentro del margen, por arriba o por abajo. */
  readonly dentroDeLoNormal: boolean | null;
}

/**
 * La brecha entre el food cost real y el de tus escandallos. Nula si nada de lo vendido tiene
 * escandallo: no hay con qué comparar. Sin el real (sin ventas en la caja), se da el de los
 * escandallos y nada más.
 */
export function laBrechaDelFoodCost(
  real: FoodCostReal,
  vendido: LoVendidoConSuCoste,
): LaBrechaDelFoodCost | null {
  const teorico = porcentajeDe(vendido.coste, vendido.ventasConCoste);
  if (teorico === null) return null;
  const parteConEscandallo =
    vendido.ventas > 0 ? Number((vendido.ventasConCoste / vendido.ventas).toFixed(4)) : 1;
  if (real.real === null || real.ventasSinImpuesto === null || real.consumoReal < 0) {
    return {
      ...vendido,
      teorico,
      parteConEscandallo,
      puntos: null,
      centimos: null,
      dentroDeLoNormal: null,
    };
  }
  // Los dos llegan con un decimal: la resta, también, sin el ruido de la coma flotante.
  const puntos = Number((real.real - teorico).toFixed(1));
  const loQuePediran = porFraccion(real.ventasSinImpuesto, vendido.coste / vendido.ventasConCoste);
  return {
    ...vendido,
    teorico,
    parteConEscandallo,
    puntos,
    centimos: centimos(real.consumoReal - loQuePediran),
    dentroDeLoNormal: Math.abs(puntos) <= MARGEN_DEL_FOOD_COST,
  };
}
