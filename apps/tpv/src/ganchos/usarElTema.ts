import { useEffect, useSyncExternalStore } from 'react';

/**
 * **El tema de Estook TPV** (el repaso del 8-nov, 0143): oscuro, claro o automático, **de cada
 * aparato** (la caja de la barra al sol, la tablet de la cocina a oscuras). Se guarda en el
 * aparato y no viaja a ningún sitio: no es un dato del local.
 *
 * El oscuro es el de siempre (`data-tema='tpv'`), y sigue siendo el de fábrica: quien no toque
 * nada ve lo mismo que antes. El automático sigue al sistema, también si cambia con la app
 * abierta (el iPad que se pone oscuro al anochecer).
 */
export type TemaDelTpv = 'oscuro' | 'claro' | 'auto';

const CLAVE = 'estook.tpv.tema';
const CAMBIO = 'estook:tema-del-tpv';

function leer(): TemaDelTpv {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return guardado === 'claro' || guardado === 'auto' ? guardado : 'oscuro';
  } catch {
    return 'oscuro';
  }
}

export function ponerElTema(tema: TemaDelTpv): void {
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    // Sin almacenamiento (ventana privada): vale para esta vez.
  }
  window.dispatchEvent(new Event(CAMBIO));
}

function suscribir(aviso: () => void): () => void {
  window.addEventListener(CAMBIO, aviso);
  window.addEventListener('storage', aviso);
  return () => {
    window.removeEventListener(CAMBIO, aviso);
    window.removeEventListener('storage', aviso);
  };
}

export function usarElTemaElegido(): TemaDelTpv {
  return useSyncExternalStore(suscribir, leer, () => 'oscuro');
}

/** Pone el tema en el `<html>` y lo cambia al cambiar la elección o el sistema. */
export function usarElTemaDelTpv(): void {
  const elegido = usarElTemaElegido();
  useEffect(() => {
    const sistema = window.matchMedia('(prefers-color-scheme: light)');
    const aplicar = () => {
      const claro = elegido === 'claro' || (elegido === 'auto' && sistema.matches);
      document.documentElement.dataset['tema'] = claro ? 'tpv-claro' : 'tpv';
    };
    aplicar();
    if (elegido !== 'auto') return;
    sistema.addEventListener('change', aplicar);
    return () => {
      sistema.removeEventListener('change', aplicar);
    };
  }, [elegido]);
}
