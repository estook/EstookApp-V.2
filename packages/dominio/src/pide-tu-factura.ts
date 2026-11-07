import { DIRECCION_DE_ESTOOK } from './carta.ts';
import { porQueNoSeCanjea, type EstadoDelDocumento } from './emitir.ts';

/**
 * **Pide tu factura** (T6 · 2 · 3, decisiones 0125 y 0141; maquetas del 2-nov y del 7-nov): la página
 * con la que el cliente pide la factura de su ticket en su móvil. Lo que se decide aquí, sin red.
 */

/** Lo que dice la dirección, con y sin el código. El QR del ticket, con T7, abre la que lo lleva. */
export const CAMINO_DE_LA_FACTURA = '/factura';

/**
 * **Cuántas veces a la hora**: por ticket y por dirección de internet. Sin esto, cualquiera usaría la
 * página para preguntarle a Hacienda por NIF ajenos o para llenarle el correo a alguien.
 */
export const INTENTOS_DE_LA_PAGINA = {
  /** Un código que no es de nadie. Solo por dirección: no hay ticket al que apuntarlo. */
  codigo: { ticket: 0, direccion: 30 },
  comprobar: { ticket: 10, direccion: 30 },
  reenviar: { ticket: 3, direccion: 10 },
  descargar: { ticket: 10, direccion: 30 },
} as const;

export type ClaseDeIntento = keyof typeof INTENTOS_DE_LA_PAGINA;

/**
 * Lo escrito o lo que trae la dirección, en la forma en que se guarda. **Se perdona lo que se
 * confunde al copiarlo de un papel**: minúsculas, espacios, guiones, la O por el 0 y la I o la L por
 * el 1 (el alfabeto no las lleva). Nulo si no puede ser un código.
 */
export function elCodigoEscrito(texto: string): string | null {
  const limpio = texto.trim().toUpperCase().replace(/[\s-]/g, '');
  const delJustificante = /^J([0-9A-F]{10})$/.exec(limpio);
  if (delJustificante !== null) return `J-${delJustificante[1] ?? ''}`;
  const sinConfundir = limpio.replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(sinConfundir) ? sinConfundir : null;
}

/** «7KQ2M9XP4TRD» → «7KQ2-M9XP-4TRD». El del justificante ya lleva su guion. */
export function elCodigoParaEnsenar(codigo: string): string {
  return codigo.startsWith('J-') ? codigo : (codigo.match(/.{1,4}/g) ?? []).join('-');
}

/** **La de producción, siempre**, como la de la carta: es la que se manda y la que irá impresa. */
export function direccionParaPedirLaFactura(codigo: string): string {
  return `${DIRECCION_DE_ESTOOK}${CAMINO_DE_LA_FACTURA}/${elCodigoParaEnsenar(codigo)}`;
}

/**
 * De la barra del navegador: nulo si no es esta página; `{ codigo: null }` si es `/factura` a secas, y
 * con el código tal como venga si lo trae: quien lo mira es `elCodigoEscrito`.
 */
export function laFacturaDeLaDireccion(camino: string): { readonly codigo: string | null } | null {
  const encontrada = /^\/factura(?:\/([^/]*))?\/?$/i.exec(camino);
  if (encontrada === null) return null;
  const escrito = encontrada[1] ?? '';
  if (escrito === '') return { codigo: null };
  try {
    return { codigo: decodeURIComponent(escrito) };
  } catch {
    return { codigo: escrito };
  }
}

export type LoQueDiceLaPagina =
  /** El formulario. */
  | 'puede'
  /** Hacienda todavía no ha contestado de ese ticket: la página se pone al día sola. */
  | 'todavia'
  | 'ya_tiene'
  /** Se anuló, tiene una devolución o Hacienda no lo tiene. */
  | 'no_se_puede'
  /** El local la apagó en Ajustes › Facturación. */
  | 'apagada';

/**
 * **Qué enseña la página** (maqueta del 7-nov, 2 y 3). Lo primero, si ya tiene factura: da igual que
 * después se haya apagado, volver a mandarla no hace nada nuevo. **Solo con el ticket ya en Hacienda**
 * (0125): «En Hacienda» todavía puede acabar rechazado, y es solo un minuto.
 */
export function queDiceLaPagina(a: {
  readonly estado: EstadoDelDocumento | 'fuera_sii';
  readonly tieneFactura: boolean;
  readonly tieneDevolucion: boolean;
  readonly anulando: boolean;
  readonly encendida: boolean;
}): LoQueDiceLaPagina {
  const no = porQueNoSeCanjea('F2', a.estado, a.tieneFactura, a.tieneDevolucion, a.anulando);
  if (no === 'ya_tiene_factura') return 'ya_tiene';
  if (no === 'tiene_devolucion' || no === 'se_esta_anulando' || no === 'no_vale') {
    return 'no_se_puede';
  }
  if (!a.encendida) return 'apagada';
  return no === 'sin_registrar' || a.estado === 'pendiente' ? 'todavia' : 'puede';
}

/**
 * **El ticket se puede descargar**, porque no lleva datos de nadie (4.11: es a lo que da derecho el
 * código del justificante), aunque el local haya apagado la factura. **La factura, nunca**: solo
 * llega al correo, y así quien se encuentre un ticket en una papelera no lee los datos de nadie.
 */
export function seDescargaElTicket(
  dice: LoQueDiceLaPagina,
  estado: EstadoDelDocumento | 'fuera_sii',
): boolean {
  if (dice === 'puede') return true;
  return (
    dice === 'apagada' &&
    (estado === 'correcto' || estado === 'aceptado_con_errores' || estado === 'fuera_sii')
  );
}

const LOS_MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** «2026-11-02» → «2-nov-2026». */
export function fechaDelTicket(fecha: string): string {
  const [ano, mes, dia] = fecha.split('-');
  return `${String(Number(dia))}-${LOS_MESES[Number(mes) - 1] ?? ''}-${ano ?? ''}`;
}
