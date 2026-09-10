import { centimos, type Centimos } from './dinero.ts';

/**
 * El motor de horas y de lo que cuestan (M6½, anticipando M15).
 *
 * ── Por qué esto vive en el dominio y no en el servidor ─────────────────────
 *
 * Porque **las mismas cuentas se hacen en tres sitios**: el servidor, cuando
 * resume las horas de un mes; la pantalla del fichaje, que tiene que decir «llevas
 * 6 h 12 min» sin pedirle nada a nadie; y el perfil de cada persona, que enseña lo
 * que lleva esta semana. Tres implementaciones de «cuántas horas son esto» acaban
 * dando tres números distintos, y el que sale en la nómina es uno solo.
 *
 * Es la regla 6, la misma que ya obligó a que el precio medio ponderado viviera
 * aquí y no dentro de una consulta.
 *
 * ── Y la regla que ordena el fichero entero ─────────────────────────────────
 *
 * **Los minutos son enteros y el dinero son céntimos enteros.** Nunca una hora
 * con coma flotante multiplicada por un precio con coma flotante: eso es
 * exactamente lo que la regla 9 prohíbe, y en una nómina se nota. Se cuentan
 * minutos, se redondea **una sola vez y al final**, y ese redondeo tiene un
 * único dueño, que es este fichero.
 */

/** Minutos trabajados. Enteros, siempre. */
export type Minutos = number & { readonly __minutos: unique symbol };

export function minutos(valor: number): Minutos {
  if (!Number.isInteger(valor)) {
    throw new Error(`Los minutos se cuentan enteros, y ha llegado ${valor}.`);
  }
  if (valor < 0) throw new Error(`No se pueden trabajar ${valor} minutos.`);
  return valor as Minutos;
}

const MINUTOS_POR_HORA = 60;
/** Cincuenta y dos semanas repartidas en doce meses. Es la cuenta de convenio. */
const SEMANAS_POR_MES = 52 / 12;

/**
 * Cuánto duró un turno, en minutos.
 *
 * Sin salida devuelve nulo, y **eso es un dato, no un cero**: un turno abierto no
 * dura cero minutos, dura «todavía no se sabe». Poner cero ahí hace que un resumen
 * de horas mienta hacia abajo justo el día que alguien se olvidó de fichar la
 * salida, que es cuando más falta hace verlo.
 */
export function duracionDelTurno(entro: Date, salio: Date | null): Minutos | null {
  if (salio === null) return null;
  const diferencia = salio.getTime() - entro.getTime();
  if (diferencia < 0) {
    throw new Error('Un turno no puede acabar antes de empezar. Eso es un fallo de datos.');
  }
  // `trunc` y no `round`: los segundos sueltos de un fichaje no son medio minuto
  // trabajado, son ruido del reloj. Y hacia abajo siempre, para que nadie cobre
  // un minuto que no hizo por cómo redondea una función.
  return minutos(Math.trunc(diferencia / 60_000));
}

/**
 * Cuánto lleva abierto un turno **ahora**.
 *
 * Recibe el instante, no lo mira: la regla 10 prohíbe leer el reloj aquí, y no es
 * una formalidad. La tableta de una cocina puede estar en otra zona horaria, y las
 * horas de alguien no pueden depender de eso.
 */
export function loQueLlevaDentro(entro: Date, ahora: Date): Minutos {
  return duracionDelTurno(entro, ahora) ?? minutos(0);
}

/**
 * «6 h 12 min», «45 min», «8 h».
 *
 * En horas y minutos y no en decimal, porque nadie dice «he hecho seis coma dos
 * horas». El decimal es para las cuentas; esto es para leerlo.
 */
export function comoSeLeenLasHoras(cuantos: Minutos | number): string {
  const total = Math.max(0, Math.trunc(cuantos));
  const horas = Math.trunc(total / MINUTOS_POR_HORA);
  const resto = total % MINUTOS_POR_HORA;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

/** Las mismas horas en decimal, para comparar con un contrato. Dos decimales. */
export function enHoras(cuantos: Minutos | number): number {
  return Math.round((Math.max(0, cuantos) / MINUTOS_POR_HORA) * 100) / 100;
}

// ── Lo que cuesta una hora ───────────────────────────────────────────────────

export type FormaDeRetribucion = 'por_hora' | 'mensual';

export interface Retribucion {
  readonly forma: FormaDeRetribucion;
  /** Por hora, o al mes, según `forma`. */
  readonly importeCentimos: number;
  /** Las de contrato. Hacen falta para repartir un sueldo mensual. */
  readonly horasSemanales: number | null;
}

/**
 * Lo que cuesta **una hora** de esta persona, en céntimos.
 *
 * ── Por qué un sueldo mensual necesita las horas de contrato ────────────────
 *
 * Porque repartirlo sin ellas obliga a suponer una jornada, y suponer cuarenta
 * horas a quien tiene veinte le duplica el coste por hora en el food cost. Sin ese
 * dato devuelve **nulo**, que quiere decir «no lo sé», y quien lo pinta enseña una
 * raya en vez de un número inventado. Es la misma regla que el producto sin precio:
 * cuenta cero y se dice, nunca se rellena a ojo.
 *
 * Y la restricción de la base ya lo impide en la práctica —un mensual sin horas no
 * se puede guardar—, así que este nulo es el cinturón por si algún día entra por
 * otro sitio.
 */
export function costeDeUnaHora(retribucion: Retribucion): Centimos | null {
  if (retribucion.forma === 'por_hora') return centimos(Math.trunc(retribucion.importeCentimos));

  const semanales = retribucion.horasSemanales;
  if (semanales === null || semanales <= 0) return null;

  const horasAlMes = semanales * SEMANAS_POR_MES;
  // Un solo redondeo, y al final. Es la regla 9, y aquí es la diferencia entre
  // que el coste de personal de un mes cuadre o se vaya unos euros.
  return centimos(Math.round(retribucion.importeCentimos / horasAlMes));
}

/**
 * Lo que ha costado un rato de trabajo.
 *
 * Nulo cuando no se sabe lo que cuesta la hora. Y **por minutos, no por horas
 * redondeadas**: cobrar por horas enteras hacia arriba o hacia abajo son varios
 * euros al mes por persona.
 */
export function loQueCuesta(cuantos: Minutos | number, retribucion: Retribucion): Centimos | null {
  const hora = costeDeUnaHora(retribucion);
  if (hora === null) return null;
  return centimos(Math.round((hora * Math.max(0, cuantos)) / MINUTOS_POR_HORA));
}

// ── Si alguien se está pasando ───────────────────────────────────────────────

/**
 * Cuántos minutos de más o de menos lleva alguien frente a su contrato.
 *
 * Positivo es de más. Nulo si no hay contrato con horas, que otra vez es «no lo
 * sé» y no «cero»: la pregunta del resumen de Equipo es «¿quién se está pasando?»,
 * y contestar «nadie» porque falta un dato es la peor de las respuestas.
 */
export function comoVaConSuContrato(
  trabajados: Minutos | number,
  horasSemanales: number | null,
  diasDelPeriodo: number,
): number | null {
  if (horasSemanales === null || horasSemanales <= 0 || diasDelPeriodo <= 0) return null;
  const esperados = (horasSemanales / 7) * diasDelPeriodo * MINUTOS_POR_HORA;
  return Math.round(trabajados - esperados);
}

// ── El horario de siempre ────────────────────────────────────────────────────

/** 1 lunes … 7 domingo, como `isodow` de Postgres. */
export const DIAS_DE_LA_SEMANA = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

export function comoSeLlamaElDia(isodow: number): string {
  return DIAS_DE_LA_SEMANA[isodow - 1] ?? '';
}

/**
 * Cuántos minutos faltan para una hora del día, desde otra hora del día.
 *
 * Las dos en `HH:MM`. Si la hora ya pasó devuelve negativo, y eso también sirve:
 * «entraste hace veinte minutos y no has fichado» es un aviso tan útil como
 * «entras en cinco».
 */
export function minutosHasta(ahora: string, hora: string): number {
  const enMinutos = (valor: string): number => {
    const [h = '0', m = '0'] = valor.split(':');
    return Number(h) * MINUTOS_POR_HORA + Number(m);
  };
  return enMinutos(hora) - enMinutos(ahora);
}

/**
 * Cuándo hay que avisar de que toca fichar.
 *
 * Media hora antes. Es lo que da tiempo a llegar y no tanto como para que el aviso
 * se vea a media mañana y se olvide.
 */
export const AVISAR_ANTES_DE_ENTRAR = 30;

/**
 * A partir de cuántas horas un turno abierto es sospechoso.
 *
 * Doce. Nadie hace un turno de doce horas seguidas sin descanso, así que lo que
 * casi siempre significa es «se ha ido y no ha fichado la salida», y eso hay que
 * decirlo antes de que se convierta en una discusión a fin de mes.
 */
export const TURNO_SOSPECHOSO_DESDE = 12 * MINUTOS_POR_HORA;
