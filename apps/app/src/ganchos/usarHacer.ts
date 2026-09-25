import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Accion } from '../acciones/catalogo.tsx';
import { usarElEsqueleto } from './usarElEsqueleto.tsx';

/**
 * Hacer una acción del catálogo: abrir el buscador, abrir Fogón o ir a su dirección.
 *
 * Lo usaban a mano las acciones rápidas y lo necesita el botón «+» (entrega O): dos
 * copias de lo mismo acaban haciendo cosas distintas el día que se añada un tercer
 * «abre».
 */
export function usarHacer(): (accion: Accion) => void {
  const navegar = useNavigate();
  const esqueleto = usarElEsqueleto();
  return useCallback(
    (accion: Accion) => {
      if (accion.abre === 'buscador') {
        esqueleto.abrirElBuscador();
        return;
      }
      if (accion.abre === 'fogon') {
        esqueleto.abrirFogon();
        return;
      }
      navegar(accion.ir);
    },
    [navegar, esqueleto],
  );
}
