import type { PeriodoDelServicio } from '@estook/dominio';

/**
 * Lo que devuelven `lo_que_se_vende` y `el_servicio_por_dentro` (la pausa del 8-nov, 0142),
 * escrito aquí porque la app no importa del servidor; lo que dice cada campo, en
 * `servidor/aplicacion/consultas/lo-que-se-vende.ts`. Los importes, en céntimos y sin IVA, salvo
 * el ticket medio, que es con IVA (como lo paga el cliente).
 */
export interface PlatoVendido {
  readonly id: string;
  readonly nombre: string;
  readonly seccion: string | null;
  readonly bebida: boolean;
  readonly uds: number;
  readonly ventas: number;
  readonly margen: number | null;
  readonly margenPorUnidad: number | null;
}

export interface Cifra {
  readonly ahora: number | null;
  readonly antes: number | null;
}

interface ElPeriodoQueSeMira {
  readonly periodo: PeriodoDelServicio;
  readonly desde: string;
  readonly hasta: string;
  readonly hoy: string;
  readonly anteriorDel: string;
  readonly siguienteDel: string | null;
}

export interface LoQueSeVende extends ElPeriodoQueSeMira {
  readonly origen: 'tpv' | 'cierre' | 'nada';
  readonly cifras: {
    readonly ventas: Cifra;
    readonly platos: Cifra;
    readonly ticketMedio: Cifra;
    readonly personas: Cifra;
  };
  readonly platos: readonly PlatoVendido[];
  readonly secciones: readonly { readonly nombre: string; readonly ventas: number }[];
  readonly conMargen: boolean;
  readonly sinEscandallo: { readonly platos: number; readonly ventas: number };
  readonly ahoraMismo: {
    readonly mesas: number;
    readonly personas: number;
    readonly enCocina: number;
    readonly minutosDeCocina: number | null;
  } | null;
}

export interface ElServicioPorDentro extends ElPeriodoQueSeMira {
  readonly conTpv: boolean;
  readonly porHora: readonly {
    readonly hora: number;
    readonly ahora: number;
    readonly antes: number;
  }[];
  readonly porDiaYHora: readonly {
    readonly dia: number;
    readonly hora: number;
    readonly ventas: number;
  }[];
  readonly cocina: {
    readonly conTiempo: number;
    readonly media: number | null;
    readonly mediaAntes: number | null;
    readonly tarde: number;
    readonly mesasConTarde: number;
    readonly porDia: readonly {
      readonly dia: number;
      readonly ahora: number | null;
      readonly antes: number | null;
    }[];
    readonly masLentos: readonly {
      readonly nombre: string;
      readonly uds: number;
      readonly media: number;
      readonly tarde: number;
    }[];
  };
  readonly seTuerce: {
    readonly devueltos: {
      readonly ahora: number;
      readonly antes: number;
      readonly motivos: readonly { readonly motivo: string; readonly veces: number }[];
    };
    readonly cambiados: {
      readonly ahora: number;
      readonly antes: number;
      readonly yaHechos: number;
      readonly platos: readonly string[];
    };
    readonly quitados: { readonly ahora: number; readonly antes: number };
    readonly anuladas: {
      readonly ahora: number;
      readonly antes: number;
      readonly personas: number;
      readonly motivos: readonly { readonly motivo: string; readonly veces: number }[];
    };
  };
  readonly semanas: readonly { readonly lunes: string; readonly ventas: number | null }[];
  readonly mejorDia: { readonly dia: string; readonly ventas: number } | null;
  readonly peorDia: { readonly dia: string; readonly ventas: number } | null;
}
