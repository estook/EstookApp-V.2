import { NOMBRE_DE_LA_ACTIVIDAD, type ActividadDeCliente } from '@estook/dominio';

/**
 * Lo que la API del admin dice de los clientes (A2 · 0041), como lo pinta la
 * pantalla. Las formas son las de `servidor/aplicacion/consultas/clientes.ts`.
 */

export type ComoEstaElCliente = 'al_dia' | 'prueba' | 'impago' | 'solo_lectura' | 'sin_pagar';

export interface ClienteEnLista {
  readonly organizacionId: string;
  readonly codigo: string;
  readonly nombre: string;
  readonly esEjemplo: boolean;
  readonly alta: string;
  readonly diasDeCliente: number;
  readonly como: ComoEstaElCliente;
  readonly diasQuedan: number | null;
  readonly estado: string;
  readonly plan: string | null;
  readonly intervalo: string | null;
  readonly locales: number;
  readonly cuota: number | null;
  readonly cuotaAlMes: number | null;
  readonly ultimoAcceso: string | null;
  readonly diasSinEntrar: number | null;
  readonly actividad: ActividadDeCliente | null;
  readonly tipo: 'independiente' | 'grupo' | 'cadena';
  readonly correos: readonly string[];
  readonly cancelaAlAcabar: boolean;
  readonly deLaCasa: boolean;
  readonly pruebaHasta: string | null;
  readonly periodoHasta: string | null;
  readonly impagoDesde: string | null;
  readonly tarjeta: string | null;
  readonly conStripe: boolean;
  readonly stripe: { readonly cliente: string; readonly prueba: boolean } | null;
}

export type Pestana = 'todos' | 'prueba' | 'pagando' | 'se_van' | 'baja';

export interface LaLista {
  readonly clientes: readonly ClienteEnLista[];
  readonly total: number;
  readonly hayMas: boolean;
  readonly porPestana: Readonly<Record<Pestana, number>>;
  readonly foto: string | null;
  readonly cobro: { readonly pagan: number; readonly alMes: number; readonly alAno: number };
}

export interface FichaDeCliente {
  readonly cliente: ClienteEnLista;
  readonly ficha: {
    readonly responsable: string | null;
    readonly telefono: string | null;
    readonly correo: string | null;
    readonly tipo: string | null;
  };
  readonly locales: readonly {
    readonly nombre: string;
    readonly poblacion: string | null;
    readonly direccion: string | null;
    readonly telefono: string | null;
    readonly activo: boolean;
    readonly carta: string | null;
    readonly altaTerminada: boolean;
  }[];
  readonly personas: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly rol: string;
    readonly correo: string | null;
    readonly esDireccion: boolean;
    readonly ultimoAcceso: string | null;
    readonly estaSemana: boolean;
    readonly dobleFactor: boolean;
    readonly sesiones: number;
    readonly creada: string;
  }[];
  readonly ultimoApunte: {
    readonly accion: string;
    readonly entidad: string;
    readonly en: string;
  } | null;
  readonly uso: readonly {
    readonly que: string;
    readonly ultimos: number;
    readonly anteriores: number;
  }[];
  readonly historial: readonly {
    readonly en: string;
    readonly de: string | null;
    readonly a: string;
    readonly plan: string | null;
    readonly quien: string;
    readonly porque: string;
  }[];
  readonly auditoria: readonly {
    readonly en: string;
    readonly quien: string | null;
    readonly accion: string;
    readonly antes: unknown;
    readonly despues: unknown;
    readonly motivo: string | null;
  }[];
  readonly notas: readonly {
    readonly id: number;
    readonly texto: string;
    readonly fijada: boolean;
    readonly en: string;
    readonly autor: string | null;
  }[];
  readonly cambiosDeCorreo: readonly {
    readonly correoViejo: string;
    readonly correoNuevo: string;
    readonly pedidoEn: string;
    readonly como: 'pendiente' | 'confirmado' | 'parado' | 'caducado';
  }[];
  readonly alertas: readonly string[];
}

type Tono = 'bien' | 'info' | 'mal' | 'atencion' | 'neutro' | 'marca';

/** El contrato, en una etiqueta: lo que ha pagado, no lo que usa. */
export function elContrato(c: ClienteEnLista): { readonly texto: string; readonly tono: Tono } {
  if (c.deLaCasa) return { texto: 'De la casa', tono: 'marca' };
  switch (c.como) {
    case 'al_dia':
      return {
        texto: c.cancelaAlAcabar ? 'Se va al acabar' : 'Al día',
        tono: c.cancelaAlAcabar ? 'atencion' : 'bien',
      };
    case 'prueba':
      return {
        texto: c.diasQuedan === null ? 'En prueba' : `Prueba · ${String(c.diasQuedan)} d`,
        tono: 'info',
      };
    case 'impago':
      return { texto: 'Cobro fallido', tono: 'mal' };
    case 'solo_lectura':
      return { texto: 'Solo lectura', tono: 'atencion' };
    case 'sin_pagar':
      return { texto: 'Sin pagar', tono: 'neutro' };
  }
}

const TONO_DE_LA_ACTIVIDAD: Readonly<Record<ActividadDeCliente, Tono>> = {
  activo: 'bien',
  bajando: 'atencion',
  dormido: 'mal',
  sin_estrenar: 'neutro',
  mira: 'info',
};

/** La actividad, en una etiqueta: lo que usa, que calcula el reloj cada noche. */
export function laActividad(actividad: ActividadDeCliente | null): {
  readonly texto: string;
  readonly tono: Tono;
} {
  if (actividad === null) return { texto: 'Sin calcular', tono: 'neutro' };
  return { texto: NOMBRE_DE_LA_ACTIVIDAD[actividad], tono: TONO_DE_LA_ACTIVIDAD[actividad] };
}

/** «Hoy», «Ayer», «hace 9 días» o «Nunca». */
export function cuandoEntro(dias: number | null): string {
  if (dias === null) return 'Nunca';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  return `hace ${String(dias)} días`;
}

/** «12/05/26»: la fecha corta de las listas, en la hora de España. */
export function fechaCorta(instante: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(instante.length === 10 ? `${instante}T12:00:00Z` : instante));
}

/** El enlace a este cliente en el panel de Stripe, en su modo. */
export function enStripe(stripe: { readonly cliente: string; readonly prueba: boolean }): string {
  return `https://dashboard.stripe.com/${stripe.prueba ? 'test/' : ''}customers/${encodeURIComponent(stripe.cliente)}`;
}

export const NOMBRE_DEL_TIPO: Readonly<Record<ClienteEnLista['tipo'], string>> = {
  independiente: 'Independiente',
  grupo: 'Grupo',
  cadena: 'Cadena',
};

/** Lo que cuenta la pestaña Uso, dicho como se dice. */
export const NOMBRE_DEL_USO: Readonly<Record<string, string>> = {
  productos: 'Productos',
  proveedores: 'Proveedores',
  pedidos: 'Pedidos',
  albaranes: 'Albaranes',
  facturas: 'Facturas',
  mermas: 'Mermas',
  inventarios: 'Inventarios',
  cierres: 'Cierres de caja',
  fichajes: 'Fichajes',
};

/** De qué va un apunte, dicho como se dice: «productos», «el Tablón». */
const DE_QUE_VA: Readonly<Record<string, string>> = {
  organizacion: 'su organización',
  local: 'su local',
  area: 'sus zonas',
  persona: 'su equipo',
  membresia: 'su equipo',
  pin: 'un PIN',
  producto: 'productos',
  lote: 'lotes',
  movimiento_de_stock: 'el almacén',
  recuento: 'el inventario',
  proveedor: 'proveedores',
  precio_pactado: 'precios',
  precio_de_producto: 'precios',
  pedido_de_compra: 'pedidos',
  albaran: 'albaranes',
  linea_de_albaran: 'albaranes',
  factura_de_compra: 'facturas',
  cierre_de_caja: 'la caja',
  fichaje: 'fichajes',
  horario_habitual: 'horarios',
  retribucion: 'sueldos',
  objetivo: 'objetivos',
  evento_de_calendario: 'el calendario',
  nota_del_tablon: 'el Tablón',
  carta: 'la carta',
  importacion: 'una importación',
  onboarding: 'el alta',
  sesion: 'Estook',
  suscripcion: 'su suscripción',
};

/** «Creó productos», «Cambió la caja», «Entró en Estook»: lo último, sin el contenido. */
export function loUltimo(accion: string, entidad: string): string {
  const que = DE_QUE_VA[entidad] ?? entidad.replace(/_/g, ' ');
  if (entidad === 'sesion') return 'Entró en Estook';
  if (accion.startsWith('crear') || accion === 'importar' || accion === 'invitar')
    return `Creó ${que}`;
  if (accion === 'borrar' || accion === 'quitado' || accion === 'revocar') return `Quitó ${que}`;
  if (accion === 'terminar') return `Terminó ${que}`;
  return `Cambió ${que}`;
}

/** «de alta hoy», «1 día de cliente», «40 días de cliente». */
export function cuantoLlevaDeCliente(dias: number): string {
  if (dias === 0) return 'de alta hoy';
  return dias === 1 ? '1 día de cliente' : `${String(dias)} días de cliente`;
}
