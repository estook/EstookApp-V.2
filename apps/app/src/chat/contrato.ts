import type { EstadoDeMiMensaje, TipoDeAdjunto, TipoDeCanal } from '@estook/dominio';

/**
 * Lo que contesta la API del chat (C1 · 0073), tal como llega. La forma la manda
 * `servidor/aplicacion/consultas/chat.ts`; aquí se copia para no importar el servidor
 * desde la app.
 */

export interface CanalEnLista {
  readonly id: string;
  readonly tipo: TipoDeCanal;
  readonly nombre: string;
  readonly otros: readonly string[];
  readonly ultimo: {
    readonly id: string;
    readonly autor: string | null;
    readonly esMio: boolean;
    readonly vista: string;
    readonly en: string;
  } | null;
  readonly sinLeer: number;
  readonly teNombran: boolean;
  readonly silenciado: boolean;
}

export interface MisCanales {
  readonly canales: readonly CanalEnLista[];
  readonly sinLeer: number;
  readonly puedeCrearCanales: boolean;
  readonly abierto: boolean;
}

export interface AdjuntoDelMensaje {
  readonly tipo: TipoDeAdjunto;
  readonly nombre: string | null;
  readonly mime: string;
  readonly bytes: number;
  readonly segundos: number | null;
  readonly enlace: string | null;
}

export interface ReaccionDelMensaje {
  readonly emoji: string;
  readonly cuantos: number;
  readonly mia: boolean;
  readonly quien: readonly string[];
}

/** Una tarjeta, leída con los permisos de quien mira: nula dentro si no la puede ver. */
export type TarjetaDelMensaje =
  | {
      readonly tipo: 'pedido';
      readonly id: string;
      readonly pedido: {
        readonly numero: number;
        readonly proveedor: string;
        readonly estado: string;
        readonly llegaEl: string | null;
      } | null;
    }
  | {
      readonly tipo: 'producto';
      readonly id: string;
      readonly producto: { readonly nombre: string; readonly formato: string | null } | null;
    }
  | { readonly tipo: 'horario'; readonly lunes: string };

/** «Confirmar que lo he leído» (C2 · 0075). */
export interface ConfirmarElMensaje {
  readonly cuantos: number;
  readonly de: number;
  readonly mio: 'falta' | 'hecho' | null;
  /** Quién falta: a quien lo pidió y a quien lleva el equipo. */
  readonly faltan: readonly string[] | null;
}

export interface FijadoDelCanal {
  readonly id: string;
  readonly autor: string;
  readonly vista: string;
  readonly en: string;
}

export interface MensajeDelCanal {
  readonly id: string;
  readonly autorId: string | null;
  readonly autor: string;
  readonly esMio: boolean;
  readonly texto: string | null;
  readonly en: string;
  readonly editado: boolean;
  readonly borrado: boolean;
  readonly retirado: boolean;
  readonly respondeA: {
    readonly id: string;
    readonly autor: string;
    readonly vista: string;
  } | null;
  readonly adjunto: AdjuntoDelMensaje | null;
  readonly reacciones: readonly ReaccionDelMensaje[];
  readonly meNombran: boolean;
  readonly sePuedeCorregir: boolean;
  readonly sePuedeBorrar: boolean;
  readonly estado: EstadoDeMiMensaje | null;
  readonly tarjeta: TarjetaDelMensaje | null;
  readonly fijado: boolean;
  readonly confirmar: ConfirmarElMensaje | null;
}

export interface PersonaDelCanal {
  readonly id: string;
  readonly nombre: string;
}

export interface LecturaDeOtro {
  readonly personaId: string;
  readonly nombre: string;
  readonly entregadoHasta: string;
  readonly leidoHasta: string;
}

export interface UnCanal {
  readonly canal: {
    readonly id: string;
    readonly tipo: TipoDeCanal;
    readonly nombre: string;
    readonly silenciado: boolean;
    readonly sePuedeSalir: boolean;
    readonly puedeRetirar: boolean;
    /** El gerente y los jefes, nunca en un privado (C2 · 0075). */
    readonly puedeFijar: boolean;
    /** Renombrarlo y borrarlo: quien lo creó y el gerente, en los canales creados. */
    readonly puedeGestionar: boolean;
  };
  readonly fijados: readonly FijadoDelCanal[];
  readonly personas: readonly PersonaDelCanal[];
  readonly lecturas: readonly LecturaDeOtro[];
  readonly mensajes: readonly MensajeDelCanal[];
  readonly hayMas: boolean;
  readonly leidoHasta: string;
}

export interface EncontradoEnElChat {
  readonly canalId: string;
  readonly canal: string;
  readonly mensajeId: string;
  readonly autor: string;
  readonly vista: string;
  readonly en: string;
}

/** Las claves de la caché: invalidar por el nombre refresca todo lo de ese nombre. */
export const CLAVE_DE_MIS_CANALES = ['mis_canales'] as const;
export const claveDeUnCanal = (canalId: string) => ['un_canal', canalId] as const;

/** «10:42» hoy; «ayer»; «lun»; «12/09». Con el reloj del aparato, solo para pintar. */
export function cuandoEnLaLista(iso: string, ahora: Date): string {
  const en = new Date(iso);
  const mismoDia = en.toDateString() === ahora.toDateString();
  if (mismoDia) return en.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (en.toDateString() === ayer.toDateString()) return 'ayer';
  const hace = (ahora.getTime() - en.getTime()) / 86_400_000;
  if (hace < 6) return en.toLocaleDateString('es-ES', { weekday: 'short' });
  return en.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

/** «Hoy», «Ayer», «Lunes, 29 de septiembre»: la raya que separa los días. */
export function diaEnLaConversacion(iso: string, ahora: Date): string {
  const en = new Date(iso);
  if (en.toDateString() === ahora.toDateString()) return 'Hoy';
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (en.toDateString() === ayer.toDateString()) return 'Ayer';
  const texto = en.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function horaDelMensaje(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}
