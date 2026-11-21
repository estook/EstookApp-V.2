import type {
  CanalDeVentaDelPanel,
  ColorDeLaBotonera,
  FormaDePago,
  HoraDeLaCurva,
  IconoDeLaSeccion,
} from '@estook/dominio';

/**
 * Los datos del Panel (el rediseño, entrega 3 · 0148), tal cual los devuelve el servidor.
 *
 * **Se ponen al día solos cada minuto** (Richi, 21-nov: «se refresca solo»), como el Tablón y
 * «Lo de hoy»: las ventas, las mesas, la espera y el equipo cambian mientras el local está
 * abierto, y nadie recarga en mitad de un servicio.
 *
 * La web se publica al fusionar y la API se despliega después: en ese rato estas consultas todavía
 * no existen. Cada widget lo lleva con su «No he podido leerlo» y su «Volver a intentarlo». Las lee
 * `usarLoDelPanel`, que se pone al día sola cada minuto.
 */

/** `como_va_hoy`: las cifras vivas del Panel, con IVA. */
export interface ComoVaHoy {
  readonly hoy: string;
  readonly hora: string;
  readonly origen: 'tpv' | 'cierre' | 'nada';
  readonly ventas: {
    readonly hoy: number | null;
    readonly elOtroDia: string;
    readonly aEstaHora: number | null;
    readonly entero: number | null;
  };
  readonly tickets: {
    readonly hoy: number | null;
    readonly medio: number | null;
    readonly medioAntes: number | null;
  };
  readonly objetivo: {
    readonly semanal: number;
    readonly llevas: number;
    readonly deberiasIr: number;
    readonly hoy: number;
    readonly reparto: 'historial' | 'igual';
  } | null;
  readonly prevision: number | null;
  readonly curva: readonly HoraDeLaCurva[];
  readonly semanasDeCurva: number;
  readonly canales: readonly {
    readonly canal: CanalDeVentaDelPanel;
    readonly ventas: number;
    readonly tickets: number;
  }[];
  readonly cobros: Readonly<Record<FormaDePago, number>> | null;
  readonly sala: {
    readonly mesas: number;
    readonly porCobrar: number | null;
    readonly personas: number;
  } | null;
  readonly cocina: {
    readonly media: number | null;
    readonly mediaAyer: number | null;
    readonly masLenta: { readonly nombre: string; readonly media: number } | null;
    readonly sacados: number;
    readonly esperando: number;
    readonly mesasEsperando: number;
  } | null;
}

/** `los_recomendados`: lo que recomienda la casa, sin lo agotado (0120). */
export interface LosRecomendados {
  readonly platos: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly seccion: string | null;
    readonly icono: IconoDeLaSeccion;
    readonly color: ColorDeLaBotonera | null;
    readonly precioCentimos: number | null;
    readonly foto: string | null;
  }[];
  readonly agotados: number;
  readonly puedeElegir: boolean;
}

/** `el_menu_de_hoy`: el menú del día de hoy, con la foto de cada plato. */
export interface ElMenuDeHoy {
  readonly sirveMenus: boolean;
  readonly menu: {
    readonly id: string;
    readonly nombre: string;
    readonly precioCentimos: number | null;
    readonly secciones: readonly {
      readonly id: string;
      readonly nombre: string;
      readonly platos: readonly {
        readonly platoId: string;
        readonly nombre: string;
        readonly suplementoCentimos: number;
        readonly agotado: boolean;
        readonly foto: string | null;
      }[];
    }[];
  } | null;
}
