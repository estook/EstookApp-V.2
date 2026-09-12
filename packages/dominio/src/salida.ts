import type { MotivoDeMerma } from './merma.ts';
import type { TipoDeMovimiento } from './inventario.ts';

/**
 * Por qué sale el género (M7, repaso) · el catálogo cerrado de una sola pregunta.
 *
 * ── El agujero que esto tapa ────────────────────────────────────────────────
 *
 * Hasta hoy, sacar género de la cámara ofrecía «Gastado o vendido» como primera
 * opción. Las dos cosas juntas, en el mismo botón. Y no son la misma cosa ni de
 * lejos:
 *
 *   · **Vendido** es género que salió y **entró dinero por él**. Cuenta en la
 *     caja del día y tiene margen.
 *   · **Gastado** es género que salió y **no entró dinero**: se cocinó, se fue a
 *     otro local. Es lo que cuesta lo que se vende, y no es una pérdida.
 *   · **Tirado** es género que salió, no entró dinero **y además no se aprovechó
 *     nada**. Eso es merma, con su motivo y su partida.
 *
 * Mezclar el primero con el segundo hace que Estook no sepa nunca cuánto se ha
 * ganado con lo que sale de cámara, que es justo lo que hace falta para que el
 * food cost y el margen signifiquen algo. Es el mismo fallo que el Manifiesto 28
 * ya arregló para la comida del personal, un escalón más arriba.
 *
 * ── Por qué el catálogo vive aquí y no en la pantalla ───────────────────────
 *
 * Porque lo usan tres sitios —la hoja de «ha salido género», la de apuntar merma
 * y el comando del servidor que lo valida— y un dato tiene un solo dueño
 * (regla 6). La pantalla pinta grupos; el servidor traduce cada motivo a su línea
 * del libro. Las dos leen de aquí.
 *
 * ── Y por qué «vendido» no suma dinero él solo ──────────────────────────────
 *
 * Porque el dinero de un día tiene un único sitio donde se cuenta: **el cierre de
 * caja** (0027). Si una salida de cámara sumara a las ganancias por su cuenta y
 * además se metiera el papel de la caja, el día se contaría dos veces y nadie lo
 * vería: el total del mes saldría mal y todo lo demás parecería correcto.
 *
 * Así que lo vendido **se apunta con lo que se cobró** y espera ahí: al cerrar la
 * caja sale propuesto, con su nombre y su importe, y decide una persona. Un dato,
 * un dueño; y la caja es la dueña del dinero.
 */

/** Las tres familias, que es lo que de verdad hay que distinguir. */
export const FAMILIAS_DE_SALIDA = ['se_vende', 'se_usa', 'se_pierde'] as const;

export type FamiliaDeSalida = (typeof FAMILIAS_DE_SALIDA)[number];

export const NOMBRE_DE_LA_FAMILIA: Readonly<Record<FamiliaDeSalida, string>> = {
  se_vende: 'Se ha vendido',
  se_usa: 'Se ha usado',
  se_pierde: 'No se ha aprovechado',
};

/** Qué significa cada familia, dicho en el momento de elegir. */
export const QUE_ES_CADA_FAMILIA: Readonly<Record<FamiliaDeSalida, string>> = {
  se_vende: 'Ha entrado dinero por ello. Se cuenta en la caja del día.',
  se_usa: 'No entra dinero. Es lo que cuesta lo que vendes.',
  se_pierde: 'Ni se ha vendido ni se ha usado. Se apunta como merma.',
};

/**
 * Todos los porqués, en el orden en que se pulsan durante un servicio.
 *
 * Lo que más pasa, primero, y dentro de cada familia igual. Los siete últimos son
 * los motivos de merma de la 0028 tal cual: no se duplican aquí, se apuntan.
 */
export const MOTIVOS_DE_SALIDA = [
  'vendido',
  'gastado',
  'traspaso',
  'caducado',
  'mal_estado',
  'roto',
  'fallo_de_elaboracion',
  'comida_de_personal',
  'invitacion',
  'prueba_de_carta',
  'otro',
] as const;

export type MotivoDeSalida = (typeof MOTIVOS_DE_SALIDA)[number];

export interface QueEsUnaSalida {
  readonly familia: FamiliaDeSalida;
  readonly nombre: string;
  /** Una frase, para no tener que adivinar cuál es cuál. */
  readonly que: string;
  /** Qué línea del libro produce. */
  readonly tipo: TipoDeMovimiento;
  /** El motivo de merma, cuando lo es. Nulo cuando no. */
  readonly motivoDeMerma: MotivoDeMerma | null;
  /** Si hay que escribir qué ha pasado para poder apuntarlo. */
  readonly pideNota: boolean;
}

export const QUE_ES_CADA_SALIDA: Readonly<Record<MotivoDeSalida, QueEsUnaSalida>> = {
  vendido: {
    familia: 'se_vende',
    nombre: 'Vendido a un cliente',
    que: 'Una caña, una botella, una ración: salió y se cobró',
    tipo: 'venta',
    motivoDeMerma: null,
    pideNota: false,
  },
  gastado: {
    familia: 'se_usa',
    nombre: 'Gastado en cocina',
    que: 'Se ha cocinado con ello',
    tipo: 'salida',
    motivoDeMerma: null,
    pideNota: false,
  },
  traspaso: {
    familia: 'se_usa',
    nombre: 'A otro local',
    que: 'Se lo ha llevado otro local del grupo',
    tipo: 'salida',
    motivoDeMerma: null,
    pideNota: false,
  },
  caducado: {
    familia: 'se_pierde',
    nombre: 'Ha caducado',
    que: 'Se pasó de fecha antes de gastarlo',
    tipo: 'merma',
    motivoDeMerma: 'caducado',
    pideNota: false,
  },
  mal_estado: {
    familia: 'se_pierde',
    nombre: 'Estaba malo',
    que: 'Llegó mal, se cortó, olía mal',
    tipo: 'merma',
    motivoDeMerma: 'mal_estado',
    pideNota: false,
  },
  roto: {
    familia: 'se_pierde',
    nombre: 'Se ha caído o roto',
    que: 'Se cayó al suelo, se rompió el envase',
    tipo: 'merma',
    motivoDeMerma: 'roto',
    pideNota: false,
  },
  fallo_de_elaboracion: {
    familia: 'se_pierde',
    nombre: 'Ha salido mal',
    que: 'Se quemó, se pasó de sal, se rehízo el plato',
    tipo: 'merma',
    motivoDeMerma: 'fallo_de_elaboracion',
    pideNota: false,
  },
  comida_de_personal: {
    familia: 'se_pierde',
    nombre: 'Comida del personal',
    que: 'Lo que come el equipo. No es una pérdida: es gasto de personal',
    tipo: 'merma',
    motivoDeMerma: 'comida_de_personal',
    pideNota: false,
  },
  invitacion: {
    familia: 'se_pierde',
    nombre: 'Invitación a un cliente',
    que: 'Se le puso a un cliente sin cobrarlo',
    tipo: 'merma',
    motivoDeMerma: 'invitacion',
    pideNota: false,
  },
  prueba_de_carta: {
    familia: 'se_pierde',
    nombre: 'Prueba o cata',
    que: 'Una cata, una foto, probar un plato nuevo',
    tipo: 'merma',
    motivoDeMerma: 'prueba_de_carta',
    pideNota: false,
  },
  otro: {
    familia: 'se_usa',
    nombre: 'Otra cosa',
    que: 'Cuéntalo en una frase y queda apuntado',
    // **No es merma, y es a propósito.** Una merma de motivo «otro» cuenta como
    // pérdida y sube el coste de lo que se vende; quien pulsa «otra cosa» al sacar
    // género no está diciendo que se haya perdido nada. Si se perdió, hay siete
    // motivos que lo dicen.
    tipo: 'salida',
    motivoDeMerma: null,
    pideNota: true,
  },
};

export function esMotivoDeSalida(valor: unknown): valor is MotivoDeSalida {
  return typeof valor === 'string' && (MOTIVOS_DE_SALIDA as readonly string[]).includes(valor);
}

/** Los motivos de una familia, en el orden del catálogo. */
export function losDeLaFamilia(familia: FamiliaDeSalida): readonly MotivoDeSalida[] {
  return MOTIVOS_DE_SALIDA.filter((motivo) => QUE_ES_CADA_SALIDA[motivo].familia === familia);
}

/** Si esta salida es una venta, que es la única que puede traer dinero. */
export function esVenta(motivo: MotivoDeSalida): boolean {
  return QUE_ES_CADA_SALIDA[motivo].familia === 'se_vende';
}

/** Si esta salida se apunta como merma, con su motivo y su partida. */
export function esMerma(motivo: MotivoDeSalida): boolean {
  return QUE_ES_CADA_SALIDA[motivo].motivoDeMerma !== null;
}
