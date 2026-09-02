/**
 * Motor de dinero (M2).
 *
 * Regla 9 del Plan: **nunca se guarda dinero en coma flotante. Centimos en
 * entero.** No es manía: en coma flotante, 0,1 + 0,2 no es 0,3, y un escandallo
 * con veinte ingredientes acaba desviado de la factura por céntimos que nadie
 * sabe explicar.
 *
 * Aquí el dinero es siempre un entero de céntimos. Se convierte a euros al
 * presentar, y solo al presentar (Auditoría, parte 7: «solo al presentar, nunca
 * en un cálculo intermedio»).
 */

/**
 * Céntimos enteros. El tipo va marcado para que el compilador no deje sumar
 * céntimos con gramos ni con porcentajes por accidente.
 */
export type Centimos = number & { readonly __centimos: unique symbol };

/** El céntimo que sobra al repartir va siempre a la primera línea. */
export const A_QUIEN_VA_EL_RESTO = 'primera_linea' as const;

export function centimos(valor: number): Centimos {
  if (!Number.isInteger(valor)) {
    throw new Error(
      `El dinero va en centimos enteros y ha llegado ${valor}. Regla 9: nada de coma flotante.`,
    );
  }
  if (!Number.isSafeInteger(valor)) {
    throw new Error(`La cifra ${valor} se sale de lo que se puede contar sin perder precision.`);
  }
  return valor as Centimos;
}

export const CERO = centimos(0);

/** Convierte euros a céntimos redondeando al céntimo más cercano. Solo al entrar. */
export function desdeEuros(euros: number): Centimos {
  if (!Number.isFinite(euros)) {
    throw new Error(`«${euros}» no es una cantidad de euros.`);
  }
  // Se escala antes de redondear para no arrastrar el error de la coma flotante:
  // 8,115 en binario es 8,114999..., y redondear directo daria 811 en vez de 812.
  return centimos(Math.round(Number((euros * 100).toFixed(4))));
}

export function suma(...cantidades: readonly Centimos[]): Centimos {
  return centimos(cantidades.reduce<number>((total, una) => total + una, 0));
}

export function resta(menos: Centimos, sustraendo: Centimos): Centimos {
  return centimos(menos - sustraendo);
}

/**
 * Multiplica por una cantidad que puede tener decimales (gramos, raciones,
 * unidades) y redondea al céntimo. Es la operación de «cuántos de esto».
 */
export function porCantidad(precio: Centimos, cantidad: number): Centimos {
  if (!Number.isFinite(cantidad)) {
    throw new Error(`«${cantidad}» no es una cantidad.`);
  }
  return centimos(Math.round(Number((precio * cantidad).toFixed(6))));
}

/**
 * Aplica un porcentaje expresado como fracción (0,21 para el 21 %).
 * Los porcentajes van con cuatro decimales como fracción (Auditoría, parte 7).
 */
export function porFraccion(cantidad: Centimos, fraccion: number): Centimos {
  if (!Number.isFinite(fraccion)) {
    throw new Error(`«${fraccion}» no es una fraccion.`);
  }
  return centimos(Math.round(Number((cantidad * fraccion).toFixed(6))));
}

/**
 * Reparte una cantidad en partes proporcionales a unos pesos, **sin perder ni
 * ganar un céntimo**.
 *
 * Lo que sobra al redondear va siempre a la primera línea, y eso lo hace
 * determinista: dos ejecuciones con los mismos datos dan exactamente el mismo
 * resultado (Auditoría, parte 7). Sin esa regla, un escandallo prorrateado daría
 * cifras distintas según el orden en que se calculara.
 */
export function repartir(total: Centimos, pesos: readonly number[]): Centimos[] {
  if (pesos.length === 0) {
    throw new Error('No se puede repartir entre cero partes.');
  }
  if (pesos.some((peso) => !Number.isFinite(peso) || peso < 0)) {
    throw new Error('Los pesos de un reparto no pueden ser negativos ni indefinidos.');
  }

  const sumaDePesos = pesos.reduce((total, peso) => total + peso, 0);

  // Sin pesos, se reparte a partes iguales: es lo que espera cualquiera.
  if (sumaDePesos === 0) {
    const base = Math.trunc(total / pesos.length);
    const partes = pesos.map(() => centimos(base));
    return devolverElResto(total, partes);
  }

  const partes = pesos.map((peso) =>
    centimos(Math.trunc(Number(((total * peso) / sumaDePesos).toFixed(6)))),
  );
  return devolverElResto(total, partes);
}

/** Reparte a partes iguales entre `cuantas`. */
export function repartirEnPartesIguales(total: Centimos, cuantas: number): Centimos[] {
  if (!Number.isInteger(cuantas) || cuantas < 1) {
    throw new Error(`No se puede repartir entre ${cuantas} partes.`);
  }
  return repartir(total, new Array<number>(cuantas).fill(1));
}

function devolverElResto(total: Centimos, partes: readonly Centimos[]): Centimos[] {
  const repartido = partes.reduce<number>((suma, parte) => suma + parte, 0);
  const resto = total - repartido;
  if (resto === 0) return [...partes];

  const primera = partes[0];
  if (primera === undefined) throw new Error('Un reparto sin partes no debería llegar hasta aquí.');

  return [centimos(primera + resto), ...partes.slice(1)];
}

/**
 * Da la cifra en euros para presentarla. **Solo para presentar**: lo que devuelve
 * es texto, precisamente para que no se pueda seguir calculando con ello.
 */
export function enEuros(cantidad: Centimos): string {
  const negativo = cantidad < 0;
  const absoluto = Math.abs(cantidad);
  const entera = Math.trunc(absoluto / 100);
  const decimal = String(absoluto % 100).padStart(2, '0');
  const conMiles = String(entera).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}${conMiles},${decimal}`;
}

/** Lo mismo, con el símbolo. En España el euro va detrás y con espacio. */
export function conSimbolo(cantidad: Centimos): string {
  return `${enEuros(cantidad)} €`;
}

/**
 * Divide entre un factor y redondea al céntimo.
 *
 * Es la operación que saca la base imponible de un precio con impuesto incluido:
 * 14,50 € al 10 % tienen una base de 14,50 ÷ 1,10. Vive aquí, y no en el motor
 * fiscal, porque el redondeo del dinero tiene un solo dueño (regla 6).
 */
export function entreFactor(cantidad: Centimos, factor: number): Centimos {
  if (!Number.isFinite(factor) || factor === 0) {
    throw new Error(`No se puede dividir entre «${factor}».`);
  }
  return centimos(Math.round(Number((cantidad / factor).toFixed(6))));
}
