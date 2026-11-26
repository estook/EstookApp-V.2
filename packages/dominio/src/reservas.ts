/**
 * Las reservas: el motor (la Ampliación 5 · 1, decisión 0153, sección 6; Plan, M32).
 *
 * Lo que hacen CoverManager, SevenRooms, TheFork Manager u OpenTable, **sobre el mismo plano que cobra**:
 *
 *   · **servicios** (comida, cena) con horas cada cuarto de hora
 *   · **cuánto dura una mesa** según los que son: de fábrica (1–2: 1 h 30 · 3–4: 1 h 45 · 5–6: 2 h ·
 *     7 o más: 2 h 30) y, cuando hay cuentas cobradas de sobra, **lo que duran de verdad**
 *   · **la mesa la elige Estook**: la que deja menos sillas vacías, o dos que se juntan (solo las que
 *     el local marcó en el editor de la sala)
 *   · **un tope de comensales por cuarto de hora**, para no hundir la cocina
 *
 * Todo son cuentas puras: el servidor las usa al reservar y la pantalla, para enseñar las horas. Que
 * dos reservas no se pisen lo garantiza además la base (0132), no estas cuentas.
 */

export interface ServicioDeReservas {
  readonly nombre: string;
  /** «20:00»: la primera hora a la que se reserva. */
  readonly desde: string;
  /** «22:30»: la última. */
  readonly hasta: string;
}

/** De fábrica: 1–2, 3–4, 5–6 y 7 o más comensales, en minutos. */
export const DURACIONES_DE_FABRICA: readonly number[] = [90, 105, 120, 150];

/** Cuántas cuentas cobradas de un tamaño hacen falta para fiarse de lo que duran de verdad. */
export const CUENTAS_PARA_APRENDER = 12;

/** El tramo de tamaño de un grupo: 0 (1–2), 1 (3–4), 2 (5–6) o 3 (7 o más). */
export function elTramoDeTamano(comensales: number): 0 | 1 | 2 | 3 {
  if (comensales <= 2) return 0;
  if (comensales <= 4) return 1;
  if (comensales <= 6) return 2;
  return 3;
}

/** Los minutos que dura una mesa de tantos, con las duraciones del local. */
export function cuantoDura(comensales: number, duraciones: readonly number[]): number {
  return duraciones[elTramoDeTamano(comensales)] ?? DURACIONES_DE_FABRICA[3] ?? 150;
}

/** La mediana de unos minutos, redondeada al cuarto de hora (es como se reserva). */
function laMediana(minutos: readonly number[]): number {
  const orden = [...minutos].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  const valor =
    orden.length % 2 === 1
      ? (orden[medio] ?? 0)
      : ((orden[medio - 1] ?? 0) + (orden[medio] ?? 0)) / 2;
  return Math.max(30, Math.min(360, Math.floor(valor / 15 + 0.5) * 15));
}

/**
 * **Lo que dura de verdad cada mesa** (mejora de la maqueta): de las cuentas cobradas, la mediana de
 * cada tamaño, redondeada al cuarto de hora. Donde no hay bastantes cuentas, la del local.
 */
export function lasDuracionesReales(
  cuentas: readonly { readonly comensales: number; readonly minutos: number }[],
  delLocal: readonly number[],
): { readonly duraciones: readonly number[]; readonly aprendidas: readonly boolean[] } {
  const porTramo: number[][] = [[], [], [], []];
  for (const c of cuentas) {
    if (c.minutos < 15 || c.minutos > 600) continue;
    porTramo[elTramoDeTamano(c.comensales)]?.push(c.minutos);
  }
  const aprendidas = porTramo.map((m) => m.length >= CUENTAS_PARA_APRENDER);
  return {
    duraciones: porTramo.map((m, i) =>
      m.length >= CUENTAS_PARA_APRENDER
        ? laMediana(m)
        : (delLocal[i] ?? DURACIONES_DE_FABRICA[i] ?? 90),
    ),
    aprendidas,
  };
}

function enMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

function comoHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Las horas de un servicio, cada cuarto de hora: de las 20:00 a las 22:30, once. */
export function lasHorasDelServicio(servicio: ServicioDeReservas): readonly string[] {
  const desde = enMinutos(servicio.desde);
  const hasta = enMinutos(servicio.hasta);
  const horas: string[] = [];
  for (let m = desde; m <= hasta; m += 15) horas.push(comoHora(m));
  return horas;
}

/** Si un texto es un servicio bien hecho: nombre, y «desde» antes de «hasta», en cuartos de hora. */
export function esUnServicio(valor: unknown): valor is ServicioDeReservas {
  if (typeof valor !== 'object' || valor === null) return false;
  const s = valor as Record<string, unknown>;
  const hora = /^([01]\d|2[0-3]):(00|15|30|45)$/;
  return (
    typeof s['nombre'] === 'string' &&
    s['nombre'].trim().length > 0 &&
    typeof s['desde'] === 'string' &&
    typeof s['hasta'] === 'string' &&
    hora.test(s['desde']) &&
    hora.test(s['hasta']) &&
    s['desde'] <= s['hasta']
  );
}

/** El cuarto de hora de una hora: «21:10» → «21:00». Es lo que cuenta para el tope. */
export function elCuartoDe(hora: string): string {
  const m = enMinutos(hora);
  return comoHora(m - (m % 15));
}

export interface MesaParaReservar {
  readonly id: string;
  readonly nombre: string;
  readonly plazas: number;
}

/** Un tramo ocupado de una mesa, en milisegundos: una reserva, o la cuenta que está abierta. */
export interface TramoOcupado {
  readonly mesaId: string;
  readonly desde: number;
  readonly hasta: number;
}

/**
 * **La mesa que pone Estook**: de las libres en todo el tramo, la que deja menos sillas vacías; y si
 * ninguna sola cabe, **dos que se juntan** (solo las parejas que marcó el local), las que dejan menos.
 * A igualdad, la más pequeña y luego por nombre, para que siempre salga la misma. Nula si no cabe.
 */
export function laMejorMesa(entrada: {
  readonly mesas: readonly MesaParaReservar[];
  readonly juntables: readonly (readonly [string, string])[];
  readonly ocupados: readonly TramoOcupado[];
  readonly comensales: number;
  readonly desde: number;
  readonly hasta: number;
}): readonly MesaParaReservar[] | null {
  const { mesas, comensales, desde, hasta } = entrada;
  const libre = (m: MesaParaReservar) =>
    !entrada.ocupados.some((o) => o.mesaId === m.id && o.desde < hasta && desde < o.hasta);
  const porNombre = (a: MesaParaReservar, b: MesaParaReservar) =>
    a.nombre.localeCompare(b.nombre, 'es', { numeric: true });

  const solas = mesas
    .filter((m) => m.plazas >= comensales && libre(m))
    .sort((a, b) => a.plazas - b.plazas || porNombre(a, b));
  if (solas[0] !== undefined) return [solas[0]];

  const deId = new Map(mesas.map((m) => [m.id, m] as const));
  const parejas = entrada.juntables
    .map(([a, b]) => [deId.get(a), deId.get(b)] as const)
    .filter(
      (p): p is readonly [MesaParaReservar, MesaParaReservar] =>
        p[0] !== undefined && p[1] !== undefined,
    )
    .filter(([a, b]) => a.plazas + b.plazas >= comensales && libre(a) && libre(b))
    .map(([a, b]): readonly [MesaParaReservar, MesaParaReservar] =>
      porNombre(a, b) <= 0 ? [a, b] : [b, a],
    )
    .sort(
      ([a1, b1], [a2, b2]) =>
        a1.plazas + b1.plazas - (a2.plazas + b2.plazas) || porNombre(a1, a2) || porNombre(b1, b2),
    );
  const mejor = parejas[0];
  return mejor === undefined ? null : [mejor[0], mejor[1]];
}

/** Si caben tantos más en un cuarto de hora con tope (nulo: sin tope). */
export function cabeEnElCuarto(
  tope: number | null,
  yaEmpiezan: number,
  comensales: number,
): boolean {
  return tope === null || yaEmpiezan + comensales <= tope;
}

/** «7 + 8», «T1»: las mesas de una reserva, como se dicen. */
export function lasMesasEnLetra(nombres: readonly string[]): string {
  return [...nombres].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).join(' + ');
}

/** El teléfono como se guarda y se compara: solo cifras, y el «+» delante si lo llevaba. */
export function telefonoLimpio(telefono: string): string {
  const limpio = telefono.replace(/[^\d+]/g, '');
  return limpio.startsWith('+')
    ? `+${limpio.slice(1).replace(/\+/g, '')}`
    : limpio.replace(/\+/g, '');
}

// ── La web de reservas (la Ampliación 5 · 2, 0153) ───────────────────────────

/** Cuántos días por delante ofrece la web: dos meses. En el TPV se reserva hasta con un año. */
export const DIAS_QUE_OFRECE_LA_WEB = 60;

/** Hasta cuántos reserva la web; más, por teléfono, que un grupo grande se habla. */
export const COMENSALES_DE_LA_WEB = 12;

/**
 * **Lo que puede pedir cada dirección en una hora** (como «Pide tu factura», 0141): reservar, buscar su
 * reserva (un código que no casa gasta uno, así no se pueden ir probando) y «Avísame si se libera».
 */
export const INTENTOS_DE_LA_WEB_DE_RESERVAS = {
  reservar: 10,
  buscar: 20,
  avisame: 5,
} as const;
export type ClaseDeIntentoDeReserva = keyof typeof INTENTOS_DE_LA_WEB_DE_RESERVAS;

/** `estook.com/reservar/ikatz` → «ikatz». Nula si la dirección no es de reservar. */
export function laReservaDeLaDireccion(camino: string): { readonly direccion: string } | null {
  const encontrada = /^\/reservar\/([^/?#]+)\/?$/i.exec(camino);
  if (encontrada === null) return null;
  try {
    return { direccion: decodeURIComponent(encontrada[1] ?? '').toLowerCase() };
  } catch {
    return { direccion: (encontrada[1] ?? '').toLowerCase() };
  }
}

/** Un código de 4 cifras, con un número al azar que da el que llama (de 0 a 1). */
export function elCodigoDeLaReserva(azar: number): string {
  return String(Math.floor(azar * 10_000) % 10_000).padStart(4, '0');
}

/**
 * **Hasta cuándo se confirma** (Richi, 24-nov, pregunta 9): X minutos antes de la hora de la reserva, no
 * desde que se reserva, «que pueden reservar un día o dos antes». Una de las 21:15 con 30 minutos: hasta
 * las 20:45.
 */
export function hastaCuandoConfirmar(empieza: Date, minutos: number): Date {
  return new Date(empieza.getTime() - minutos * 60_000);
}

/**
 * **Cuándo sale el recordatorio** del día antes: a las 12:00 del día anterior en el reloj del local; si se
 * reserva más tarde que eso, al momento (lo decide quien lo programa).
 */
export const HORA_DEL_RECORDATORIO = '12:00';
