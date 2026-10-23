/**
 * Lo que contesta la API a la sala (`servidor/aplicacion/consultas/sala.ts`), tal cual.
 * Si allí cambia algo, aquí también: la prueba de pantalla lo dice antes que nadie.
 */

export type LoSiguiente =
  | { readonly que: 'pedir' }
  | { readonly que: 'mandar' }
  | { readonly que: 'marchar'; readonly pase: number }
  | { readonly que: 'cobrar' };

export type EstadoDeLaMesa = 'libre' | 'sin_pedir' | 'comiendo' | 'toca_marchar' | 'por_mandar';

export interface CuentaEnElPlano {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly iniciales: string | null;
  readonly esMia: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  readonly loSiguiente: LoSiguiente;
}

export interface MesaDelPlano {
  readonly id: string;
  readonly nombre: string;
  readonly plazas: number;
  readonly forma: 'cuadrada' | 'redonda' | 'alargada';
  readonly x: number;
  readonly y: number;
  readonly estado: EstadoDeLaMesa;
  readonly cuenta: CuentaEnElPlano | null;
}

export interface ElPlano {
  readonly zonas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly mesas: readonly MesaDelPlano[];
  }[];
  readonly sinMesa: readonly CuentaEnElPlano[];
  readonly tocaMarchar: readonly {
    readonly cuentaId: string;
    readonly titulo: string;
    readonly pase: number;
  }[];
  readonly camareros: readonly { readonly id: string; readonly nombre: string }[];
}

export type EstadoDelPlato =
  'sin_mandar' | 'en_espera' | 'en_marcha' | 'salio' | 'en_la_barra' | 'quitado';

export interface PlatoDeLaCuenta {
  readonly id: string;
  readonly platoId: string | null;
  readonly menuId: string | null;
  readonly parteDe: string | null;
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioCentimos: number;
  readonly destino: 'cocina' | 'barra' | 'ninguno';
  readonly pase: number | null;
  readonly nota: string | null;
  readonly estado: EstadoDelPlato;
  readonly salioEn: string | null;
  readonly motivoDeQuitar: string | null;
  readonly vuelve: string | null;
}

export interface LaMesa {
  readonly cuentaId: string;
  readonly titulo: string;
  readonly tipo: string;
  readonly mesaId: string | null;
  readonly personas: number | null;
  readonly camarero: string | null;
  readonly porPases: boolean;
  readonly notaParaCocina: string | null;
  readonly abierta: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  readonly platos: readonly PlatoDeLaCuenta[];
  readonly pases: readonly {
    readonly numero: number;
    readonly marchadoEn: string | null;
    readonly haSalido: boolean;
  }[];
  readonly loSiguiente: LoSiguiente;
}

export interface PlatoDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  readonly miniatura: string | null;
  readonly agotado: boolean;
  readonly alergenos: readonly string[];
}

export interface SeccionDeLaSala {
  readonly id: string | null;
  readonly nombre: string;
  readonly esBebida: boolean;
  readonly platos: readonly PlatoDeLaSala[];
}

export interface SeccionDelMenuDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly esPostre: boolean;
  readonly esBebida: boolean;
  readonly pase: number | null;
  readonly platos: readonly {
    readonly platoId: string;
    readonly nombre: string;
    readonly suplementoCentimos: number;
    readonly agotado: boolean;
  }[];
}

export interface MenuDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number;
  readonly entraPan: boolean;
  readonly entraCafe: boolean;
  readonly secciones: readonly SeccionDelMenuDeLaSala[];
}

export interface LaCartaDeLaSala {
  readonly hoy: string;
  readonly secciones: readonly SeccionDeLaSala[];
  readonly menus: readonly MenuDeLaSala[];
}
