/**
 * Lo que contesta la API a la sala (`servidor/aplicacion/consultas/sala.ts`), tal cual.
 * Si allí cambia algo, aquí también: la prueba de pantalla lo dice antes que nadie.
 */

import type {
  CaminoDeLaBotonera,
  ColorDeLaBotonera,
  CosaDeLaSala,
  FormaDeMesa,
  PaseDeLaBotonera,
  QuienLoPrepara,
} from '@estook/dominio';

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
  readonly camareroId: string | null;
  readonly iniciales: string | null;
  readonly esMia: boolean;
  readonly minutos: number;
  readonly totalCentimos: number;
  readonly porPases: boolean;
  readonly notaParaCocina: string | null;
  readonly loSiguiente: LoSiguiente;
  /** Su camarero ha fichado la salida: «Ana ha fichado la salida» (Anexo 11.8). */
  readonly suCamareroSeHaIdo: boolean;
}

/** Una mesa como se dibujó en el TPV (T2): su forma, su sitio, su tamaño y su giro. */
export interface MesaDibujada {
  readonly id: string;
  readonly nombre: string;
  readonly plazas: number;
  readonly forma: FormaDeMesa;
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly fondo: number;
  /** Estirada a mano: «Volver al tamaño de sus plazas» lo quita. */
  readonly estirada: boolean;
  readonly giro: number;
}

/** Lo que hay en la sala y no se abre: la barra, una pared, una planta… */
export interface CosaDibujada {
  readonly id: string;
  readonly tipo: CosaDeLaSala;
  readonly texto: string | null;
  readonly x: number;
  readonly y: number;
  readonly ancho: number;
  readonly fondo: number;
  readonly giro: number;
}

export interface MesaDelPlano extends MesaDibujada {
  readonly estado: EstadoDeLaMesa;
  readonly cuenta: CuentaEnElPlano | null;
}

export interface ElPlano {
  readonly zonas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly orden: number;
    readonly mesas: readonly MesaDelPlano[];
    readonly cosas: readonly CosaDibujada[];
  }[];
  /** El lápiz de arriba del plano: quien puede dibujar la sala, y no en el móvil de nadie. */
  readonly puedeDibujar: boolean;
  readonly sinMesa: readonly CuentaEnElPlano[];
  readonly tocaMarchar: readonly {
    readonly cuentaId: string;
    readonly titulo: string;
    readonly pase: number;
    readonly salioEl: number;
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
  /** Lo que vale en su botón: lo suyo, o lo de su página (T3, Anexo 11.11). */
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
  readonly color: ColorDeLaBotonera | null;
}

/** Una página de la botonera; sin montar, una sección de la carta (T3). */
export interface PaginaDeLaSala {
  readonly id: string;
  readonly nombre: string;
  readonly color: ColorDeLaBotonera | null;
  /** Qué pestaña se marca sola al abrirla (Anexo 11.10). */
  readonly pase: PaseDeLaBotonera;
  /** «Pan y agua» o «Cafés» (0112): no es la que se abre sola al sentarse. */
  readonly deSiempre?: 'pan' | 'cafes' | null;
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
  /** Si la botonera está montada; sin montar, una página por sección de la carta. */
  readonly montada: boolean;
  readonly paginas: readonly PaginaDeLaSala[];
  /** Lo fijado y lo más vendido a esta hora en cuatro semanas (Anexo 11.10). */
  readonly loMasPedido: readonly PlatoDeLaSala[];
  readonly menus: readonly MenuDeLaSala[];
}

// ── T3 · La botonera (0111): Ajustes del TPV › Productos (`consultas/botonera.ts`) ──

export interface PlatoParaLaBotonera {
  readonly id: string;
  readonly nombre: string;
  readonly precioCentimos: number | null;
  readonly miniatura: string | null;
  readonly agotado: boolean;
}

export interface BotonDeLaBotonera extends PlatoParaLaBotonera {
  readonly botonId: string;
  readonly platoId: string;
  readonly color: ColorDeLaBotonera | null;
  /** Nulos: los de su página. */
  readonly quienLoPrepara: QuienLoPrepara | null;
  readonly pase: PaseDeLaBotonera | null;
  readonly fijado: boolean;
}

export interface PaginaDeLaBotonera {
  readonly id: string;
  readonly nombre: string;
  readonly color: ColorDeLaBotonera | null;
  readonly quienLoPrepara: QuienLoPrepara;
  readonly pase: PaseDeLaBotonera;
  readonly deLaSeccion: string | null;
  /** «Pan y agua» o «Cafés» (0112). */
  readonly deSiempre: 'pan' | 'cafes' | null;
  readonly botones: readonly BotonDeLaBotonera[];
}

export interface LaBotonera {
  readonly camino: CaminoDeLaBotonera | null;
  readonly entraSolo: boolean;
  readonly paginas: readonly PaginaDeLaBotonera[];
  readonly nuevosEnLaCarta: readonly (PlatoParaLaBotonera & { readonly seccion: string | null })[];
  readonly carta: readonly {
    readonly id: string | null;
    readonly nombre: string;
    readonly platos: readonly PlatoParaLaBotonera[];
  }[];
  readonly puedeCrearProductos: boolean;
}

// ── T1 · La puerta (0107): el aparato y quién lo usa (`comandos/aparatos.ts`) ──

export type FuncionDelAparato = 'caja' | 'comandero' | 'cocina' | 'barra' | 'fichar';

export interface AjustesDelBloqueo {
  readonly minutos: number;
  readonly alCobrar: boolean;
  readonly personalMinutos: number;
  readonly soloEntraQuienFicha: boolean;
}

/** Lo que dice el latido: el aparato, su local, el bloqueo y quién está fichado. */
export interface ElAparatoPorDentro {
  readonly terminalId: string;
  readonly nombre: string;
  readonly funcion: FuncionDelAparato;
  readonly esPersonal: boolean;
  readonly dueno: { readonly id: string; readonly nombre: string } | null;
  readonly cajon: string | null;
  readonly local: { readonly id: string; readonly nombre: string };
  readonly bloqueo: AjustesDelBloqueo;
  readonly fichados: readonly {
    readonly nombre: string;
    readonly iniciales: string;
    readonly desde: string;
  }[];
  readonly temaAlSegundo: string | null;
  readonly hayMesas: boolean;
}

export interface AparatoVinculado {
  readonly llave: string;
  readonly aparato: ElAparatoPorDentro;
  /** El PIN de quien vinculó el primer aparato, una vez, si no tenía o pidió uno (0109). */
  readonly tuPinNuevo: string | null;
}

export type EstadoDelFichaje = 'fuera' | 'dentro' | 'en_pausa';

export interface DentroDelTpv {
  readonly turno: string;
  readonly persona: { readonly id: string; readonly nombre: string; readonly iniciales: string };
  readonly fichaje: EstadoDelFichaje;
  readonly caeEn: 'inicio' | 'mesas';
}

export interface ElFichaje {
  readonly nombre: string;
  readonly estado: EstadoDelFichaje;
  readonly desde: string | null;
  readonly minutosDeHoy: number;
  readonly pausasEnUso: boolean;
}

export interface YoEnElTpv {
  readonly persona: { readonly id: string; readonly nombre: string; readonly iniciales: string };
  readonly local: { readonly id: string; readonly nombre: string };
  readonly permisos: Readonly<Record<string, 'ver' | 'ver_y_editar'>>;
  readonly aparato: {
    readonly terminalId: string;
    readonly nombre: string;
    readonly funcion: FuncionDelAparato;
    readonly esPersonal: boolean;
  };
  readonly fichaje: ElFichaje;
  readonly misMesas: readonly { readonly cuentaId: string; readonly titulo: string }[];
  readonly companeros: readonly { readonly id: string; readonly nombre: string }[];
}

export interface UnAparato {
  readonly id: string;
  readonly nombre: string;
  readonly funcion: FuncionDelAparato;
  readonly dueno: { readonly id: string; readonly nombre: string } | null;
  readonly cajon: { readonly id: string; readonly nombre: string } | null;
  readonly enLinea: boolean;
  readonly vistoEn: string | null;
  readonly version: string | null;
  readonly vale: boolean;
}

export interface LosAparatos {
  readonly este: string;
  readonly aparatos: readonly UnAparato[];
  readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
  readonly personas: readonly { readonly id: string; readonly nombre: string }[];
}

export interface DondeSePuedeVincular {
  readonly locales: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly cajones: readonly { readonly id: string; readonly nombre: string }[];
    readonly aparatos: readonly string[];
    readonly personas: readonly { readonly id: string; readonly nombre: string }[];
  }[];
}

export interface CodigoParaVincular {
  readonly codigo: string;
  readonly caducaEn: string;
}

/** Lo que se elige al vincular: qué es, cómo se llama, de quién y su cajón. */
export interface QueSera {
  readonly funcion: FuncionDelAparato;
  readonly nombre: string;
  readonly persona_id?: string;
  readonly cajon_id?: string;
  readonly cajon_nuevo?: string;
}

/** El plano para dibujarlo (`el_plano_del_local`, T2): sin las cuentas. */
export interface ElPlanoParaDibujar {
  readonly salas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly orden: number;
    readonly mesas: readonly (MesaDibujada & { readonly abierta: boolean })[];
    readonly cosas: readonly CosaDibujada[];
    readonly conAlgoAbierto: boolean;
  }[];
}
