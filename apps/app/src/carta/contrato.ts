import {
  CANALES_DE_VENTA,
  NOMBRE_DEL_ALERGENO,
  type Alergeno,
  type CanalDeVenta,
} from '@estook/dominio';
import { comoDinero } from '../almacen/contrato.ts';

/**
 * Lo que devuelve el servidor de la carta (M9 · 1, decisión 0086): `mi_carta` y
 * `un_plato`. Las mismas formas que `servidor/aplicacion/consultas/mi-carta.ts`.
 */

export type { CanalDeVenta } from '@estook/dominio';

export interface UnCanal {
  readonly canal: CanalDeVenta;
  readonly nombre: string;
  readonly tipo: 'propio' | 'plataforma';
  readonly disponible: boolean;
  readonly activo: boolean;
  readonly comisionPorcentaje: number | null;
  readonly envaseCentimos: number | null;
  readonly comisionHabitual: number | null;
}

export interface UnaSeccion {
  readonly id: string;
  readonly nombre: string;
  readonly orden: number;
}

export interface UnPlato {
  readonly id: string;
  readonly seccionId: string | null;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precioCentimos: number | null;
  readonly precios: Readonly<Partial<Record<CanalDeVenta, number>>>;
  readonly foto: string | null;
  readonly miniatura: string | null;
  readonly orden: number;
  readonly activo: boolean;
  readonly version: number;
  /** Lo que la carta le dice al cliente (0087). */
  readonly unidadesPorRacion: number | null;
  readonly alergenos: readonly Alergeno[];
  readonly alergenosDeLaReceta: readonly Alergeno[];
  readonly picante: number;
  readonly distintivos: readonly string[];
  readonly vinculadoA: { readonly id: string; readonly nombre: string } | null;
  readonly tieneFicha: boolean;
}

/** Los alérgenos que lleva un plato: los de su receta y los puestos a mano. */
export function losAlergenosDe(plato: UnPlato): readonly Alergeno[] {
  return [...new Set([...plato.alergenosDeLaReceta, ...plato.alergenos])];
}

export interface MiCarta {
  readonly puedeEditar: boolean;
  readonly canales: readonly UnCanal[];
  readonly secciones: readonly UnaSeccion[];
  readonly platos: readonly UnPlato[];
}

export interface UnCambio {
  readonly cuando: string;
  readonly quien: string | null;
  readonly que: string;
  readonly antes: Readonly<Record<string, unknown>> | null;
  readonly despues: Readonly<Record<string, unknown>> | null;
}

export interface ElPlato {
  readonly plato: UnPlato;
  readonly puedeEditar: boolean;
  readonly historial: readonly UnCambio[];
}

/** Los canales que llevan precio propio: los activos que no son Sala. */
export function canalesConPrecio(canales: readonly UnCanal[]): readonly UnCanal[] {
  return canales.filter((c) => c.activo && c.canal !== 'sala');
}

function nombreDelCanal(canal: string): string {
  return CANALES_DE_VENTA.find((c) => c.canal === canal)?.nombre ?? canal;
}

function dinero(valor: unknown): string {
  return typeof valor === 'number' ? comoDinero(valor) : 'igual que sala';
}

/**
 * Una línea del historial, en cristiano: «Precio: 9,50 € → 9,90 €». La auditoría
 * guarda el antes y el después de lo que cambió; aquí se dice qué fue.
 */
export function queCambio(
  cambio: UnCambio,
  nombreDeLaSeccion: (id: string | null) => string,
): readonly string[] {
  if (cambio.que === 'crear') return ['Lo añadió a la carta'];
  if (cambio.que === 'archivar') return ['Lo archivó'];
  if (cambio.que === 'recuperar') return ['Lo recuperó'];

  const antes = cambio.antes ?? {};
  const despues = cambio.despues ?? {};
  return Object.keys(despues).map((clave) => {
    const de = antes[clave];
    const a = despues[clave];
    if (clave === 'precio') return `Precio de sala: ${dinero(de)} → ${dinero(a)}`;
    if (clave.startsWith('precio_')) {
      return `${nombreDelCanal(clave.slice('precio_'.length))}: ${dinero(de)} → ${dinero(a)}`;
    }
    if (clave === 'nombre') return `Nombre: «${String(de)}» → «${String(a)}»`;
    if (clave === 'seccion') {
      return `Sección: ${nombreDeLaSeccion(typeof de === 'string' ? de : null)} → ${nombreDeLaSeccion(typeof a === 'string' ? a : null)}`;
    }
    if (clave === 'descripcion') return 'Cambió la descripción';
    if (clave === 'unidades') {
      return typeof a === 'number' ? `Ración: ${String(a)} ud` : 'Quitó las unidades de la ración';
    }
    if (clave === 'picante') {
      return Number(a) === 0 ? 'Ya no pica' : `Picante: ${String(a)} de 3`;
    }
    if (clave === 'alergenos') {
      const lista = Array.isArray(a) ? (a as Alergeno[]) : [];
      return lista.length === 0
        ? 'Quitó los alérgenos puestos a mano'
        : `Alérgenos: ${lista.map((x) => NOMBRE_DEL_ALERGENO[x]).join(', ')}`;
    }
    if (clave === 'distintivos') {
      const lista = Array.isArray(a) ? (a as string[]) : [];
      return lista.length === 0
        ? 'Ni vegetariano ni vegano'
        : lista.includes('vegano')
          ? 'Vegano'
          : 'Vegetariano';
    }
    if (clave === 'vinculo') {
      return typeof a === 'string' ? `Lo vinculó a ${a}` : 'Lo desvinculó del Almacén';
    }
    if (clave === 'foto') return a === 'quitada' ? 'Quitó la foto' : 'Puso la foto';
    return `Cambió ${clave}`;
  });
}

const CUANDO = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function comoSeLeeElCuando(iso: string): string {
  return CUANDO.format(new Date(iso));
}
