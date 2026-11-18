import { useSyncExternalStore } from 'react';

/**
 * **«Mías»** (0131), compartido: lo pone el botón de encima del plano y, en el móvil, **la barra de
 * abajo** (el rediseño, 0148). El aparato lo recuerda, en su navegador y aparte de todo lo demás; un
 * móvil personal empieza en «Mías».
 */
const CLAVE_DEL_FILTRO = 'estook.tpv.mias';

let soloMias: boolean | null = null;
const quienEscucha = new Set<() => void>();

function leer(esPersonal: boolean): boolean {
  try {
    const guardado = window.localStorage.getItem(CLAVE_DEL_FILTRO);
    if (guardado === null) return esPersonal;
    return guardado === 'si';
  } catch {
    return esPersonal;
  }
}

export function ponerSoloMias(mias: boolean): void {
  soloMias = mias;
  try {
    window.localStorage.setItem(CLAVE_DEL_FILTRO, mias ? 'si' : 'no');
  } catch {
    // En una ventana privada no se guarda: el filtro dura lo que la pantalla.
  }
  for (const f of quienEscucha) f();
}

function escuchar(f: () => void) {
  quienEscucha.add(f);
  return () => {
    quienEscucha.delete(f);
  };
}

export function usarSoloMias(esPersonal: boolean): boolean {
  return useSyncExternalStore(escuchar, () => {
    soloMias ??= leer(esPersonal);
    return soloMias;
  });
}
