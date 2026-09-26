import { centimos, entreFactor } from './dinero.ts';
import type { ComoEstaLaCuenta } from './suscripcion.ts';

/**
 * Los clientes de Estook, vistos desde el admin (entrega A2 · decisión 0041).
 *
 * **Dos cosas separadas, y no un estado**: el **contrato** —lo que paga, que lo dice
 * Stripe y cuenta `comoEstaLaCuenta`— y **la actividad** —lo que usa, que se calcula
 * aquí—. «Inactivo» mezclaba las dos: un cliente puede pagar y no entrar —el que se
 * va a ir— o entrar y no pagar —el de prueba—.
 *
 * La actividad se calcula **cada noche** con el reloj (Richi, 25-sep) y se guarda
 * como una foto del día: la lista de mil clientes no cuenta nada al abrirse.
 */

export type ActividadDeCliente = 'activo' | 'bajando' | 'dormido' | 'sin_estrenar' | 'mira';

export const NOMBRE_DE_LA_ACTIVIDAD: Readonly<Record<ActividadDeCliente, string>> = {
  activo: 'Activo',
  bajando: 'Bajando',
  dormido: 'Dormido',
  sin_estrenar: 'Sin estrenar',
  mira: 'Entra sin apuntar',
};

/** Lo que se cuenta de un cliente para saber cómo lo usa. */
export interface LoQueHaceUnCliente {
  /** Días desde que se dio de alta. */
  readonly diasDeAlta: number;
  /** Productos de verdad (sin los de ejemplo). */
  readonly productos: number;
  /** Días desde que entró alguien de su equipo. Nulo: nunca. */
  readonly diasSinEntrar: number | null;
  /** Lo que ha apuntado su equipo —cualquier cambio que deja rastro— en 7 días. */
  readonly apuntes7: number;
  /** Y en los últimos 14, y en los 14 de antes: para ver si baja. */
  readonly apuntes14: number;
  readonly apuntes14Antes: number;
}

/** Un alta de más de una semana con menos de esto no ha empezado de verdad. */
export const PRODUCTOS_PARA_ESTRENAR = 10;

/**
 * Cómo usa Estook un cliente, en este orden (panel de administración, 2):
 *
 *   1  **Sin estrenar**: más de 7 días de alta y menos de 10 productos.
 *   2  **Dormido**: nadie ha entrado en 14 días.
 *   3  **Bajando**: lo apuntado en las dos últimas semanas es menos de la mitad que
 *      en las dos anteriores.
 *   4  **Activo**: alguien ha entrado en 7 días **y ha apuntado algo**. Entrar no
 *      basta: quien abre el Panel y se va no usa Estook.
 *   5  **Entra sin apuntar**: lo que queda. Mira, pero no trabaja con él.
 */
export function laActividad(hace: LoQueHaceUnCliente): ActividadDeCliente {
  if (hace.diasDeAlta > 7 && hace.productos < PRODUCTOS_PARA_ESTRENAR) return 'sin_estrenar';
  if (hace.diasSinEntrar === null || hace.diasSinEntrar > 14) return 'dormido';
  if (hace.apuntes14Antes > 0 && hace.apuntes14 * 2 < hace.apuntes14Antes) return 'bajando';
  if (hace.diasSinEntrar <= 7 && hace.apuntes7 > 0) return 'activo';
  return 'mira';
}

/** Las pestañas de la lista: filtros guardados, no pantallas aparte. */
export type PestanaDeClientes = 'todos' | 'prueba' | 'pagando' | 'se_van' | 'baja';

export const NOMBRE_DE_LA_PESTANA: Readonly<Record<PestanaDeClientes, string>> = {
  todos: 'Todos',
  prueba: 'En prueba',
  pagando: 'Pagando',
  se_van: 'Se están yendo',
  baja: 'Sin pagar',
};

/**
 * Si un cliente cae en una pestaña.
 *
 *   · **Se están yendo**: los que pagan (o prueban) y no lo usan —dormidos o
 *     bajando—, y los que tienen un cobro fallido o han pedido cancelar. Es la señal
 *     que pedía Richi: «lleva pagando tres meses y apenas lo usa».
 *   · **Sin pagar**: los que no han pagado nunca o están en solo lectura.
 */
export function estaEnLaPestana(
  pestana: PestanaDeClientes,
  cliente: {
    readonly como: ComoEstaLaCuenta;
    readonly actividad: ActividadDeCliente | null;
    readonly cancelaAlAcabar: boolean;
  },
): boolean {
  switch (pestana) {
    case 'todos':
      return true;
    case 'prueba':
      return cliente.como === 'prueba';
    case 'pagando':
      return cliente.como === 'al_dia';
    case 'se_van':
      return (
        cliente.como === 'impago' ||
        ((cliente.como === 'al_dia' || cliente.como === 'prueba') &&
          (cliente.cancelaAlAcabar ||
            cliente.actividad === 'dormido' ||
            cliente.actividad === 'bajando'))
      );
    case 'baja':
      return cliente.como === 'sin_pagar' || cliente.como === 'solo_lectura';
  }
}

/** Una celda de CSV: entre comillas si hace falta, y sin fórmulas que abra Excel. */
export function celdaDeCsv(valor: string | number | null): string {
  if (valor === null) return '';
  let texto = String(valor);
  // Lo que empieza por = + - @ Excel lo ejecuta como fórmula: se neutraliza.
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Un CSV con punto y coma, que es lo que abre bien un Excel en español. */
export function comoCsv(
  cabecera: readonly string[],
  filas: readonly (readonly (string | number | null)[])[],
): string {
  return [cabecera, ...filas].map((fila) => fila.map(celdaDeCsv).join(';')).join('\r\n');
}

/**
 * Lo que deja al mes un cliente, en céntimos: la cuota tal cual si paga al mes, y la
 * doceava parte si paga al año. Es la columna «Cuota/mes» de la lista, y la cuenta
 * que hará el tablero de ventas (A4).
 */
export function cuotaAlMes(cuota: number | null, intervalo: 'mes' | 'ano' | null): number | null {
  if (cuota === null) return null;
  return intervalo === 'ano' ? entreFactor(centimos(cuota), 12) : cuota;
}
