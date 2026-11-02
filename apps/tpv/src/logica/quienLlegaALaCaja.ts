import type { ComoEstaElCentro } from '@estook/impresion';
import type { UnAparato } from '../datos/tipos.ts';

/**
 * **Quién llega a la caja**, para Ajustes del TPV › Aparatos (T5 · 2 · 2 · 2, decisión 0124;
 * maquetas de T5 · 2, sección 3, y de la caja de centro, secciones 1 a 3): cálculo puro, sin
 * pantalla, para probarlo.
 */

/** Si el local tiene caja de centro: entonces se dice cómo llega cada uno. */
export function hayCentro(aparatos: readonly UnAparato[]): boolean {
  return aparatos.some((a) => a.esElCentro === true);
}

/** Sigue sin internet: el centro, quien llega a él, y el iPhone que guarda lo suyo. */
function sigue(a: UnAparato): boolean {
  if (a.esElCentro === true) return true;
  if (a.camino === 'llega') return true;
  // Una pantalla en un iPad no recibe sin internet: la cocina tira del papel.
  return a.camino === 'guarda_lo_suyo' && a.funcion !== 'cocina' && a.funcion !== 'barra';
}

/** «4 de 5 siguen sin internet»: sin contar el aparato de fichar, que va a lo suyo. */
export function cuantosSiguen(aparatos: readonly UnAparato[]): string {
  const cuentan = aparatos.filter((a) => a.funcion !== 'fichar' && a.vale);
  return `${String(cuentan.filter(sigue).length)} de ${String(cuentan.length)} siguen sin internet`;
}

function elSistema(a: UnAparato): string | null {
  switch (a.sistema) {
    case 'android':
      return a.funcion === 'cocina' || a.funcion === 'barra' ? 'Tablet Android' : 'Android';
    case 'ios':
      return a.funcion === 'comandero' ? 'iPhone' : 'iPad';
    case 'windows':
      return 'Windows';
    default:
      return null;
  }
}

/** Lo que se añade a la línea de un aparato: qué es y por qué no llegaría. */
export function comoSeDice(a: UnAparato, esEste: boolean, loQueEs: string): string {
  if (a.esElCentro === true) {
    const por =
      a.centroPor === 'cable' ? ' · por cable' : a.centroPor === 'wifi' ? ' · por wifi' : '';
    return `${esEste ? 'Este · ' : ''}la caja para Windows${por}`;
  }
  const partes = [elSistema(a), loQueEs.charAt(0).toLowerCase() + loQueEs.slice(1)].filter(
    (p): p is string => p !== null && p !== '',
  );
  if (a.camino === 'con_datos') partes.push('con datos');
  if (a.camino === 'sin_permiso') partes.push('sin el permiso de Chrome');
  if (a.camino === 'bloqueado') partes.push('Chrome lo bloqueó');
  return partes.join(' · ');
}

/** A la derecha: si llega, o qué le pasa. Nulo si no se sabe (se dice si está en línea). */
export function elEstado(
  a: UnAparato,
): { readonly texto: string; readonly tono: 'bien' | 'atencion' | 'tenue' } | 'como_darlo' | null {
  if (a.esElCentro === true) return { texto: 'Es el centro', tono: 'bien' };
  switch (a.camino) {
    case 'llega':
      return { texto: 'Llega a la caja', tono: 'bien' };
    case 'guarda_lo_suyo':
      return a.funcion === 'cocina' || a.funcion === 'barra'
        ? { texto: 'Sin internet, el papel', tono: 'tenue' }
        : { texto: 'Guarda lo suyo', tono: 'tenue' };
    case 'no_llega':
      return { texto: 'No llega a la caja', tono: 'atencion' };
    case 'con_datos':
      return { texto: 'No llegaría a la caja', tono: 'atencion' };
    case 'sin_permiso':
    case 'bloqueado':
      return 'como_darlo';
    default:
      return null;
  }
}

/** Si Windows no deja a esta caja escuchar en la red del local (y no es por la red pública). */
export function windowsNoLaDeja(caja: ComoEstaElCentro | null): boolean {
  const windows = caja?.windows;
  return (
    windows !== undefined && windows.red?.publica !== true && windows.cortafuegos === 'no_deja'
  );
}
