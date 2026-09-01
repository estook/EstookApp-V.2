import { useCallback, useEffect, useState } from 'react';

/**
 * Los tres tamanos de letra · Parte B2 del Plan.
 *
 * «Tres tamanos de letra ajustables en Ajustes, que multiplican por
 * 0,9 · 1 · 1,15» · «Tamano de letra en tres pasos: **el pase de cocina se lee de
 * lejos**» (Manifiesto).
 *
 * ── Como funciona ────────────────────────────────────────────────────────────
 *
 * No se cambia ni un tamano de letra: se cambia **una variable**, `--escala`, en
 * el `<html>`. Todos los tamanos de B2 estan escritos como `calc(15px *
 * var(--escala))`, asi que la pantalla entera crece a la vez y ninguna tiene que
 * enterarse. Es lo mismo que hace que anadir una pantalla nueva no obligue a
 * acordarse de esto.
 *
 * ── Por que en el navegador y no en la base de datos ─────────────────────────
 *
 * Porque es del **aparato**, no de la persona. El mismo cocinero quiere la letra
 * grande en la tableta del pase, que mira de lejos, y normal en su movil. El
 * idioma si es de la persona y viaja con ella (comando `cambiar_mi_idioma`); el
 * tamano de letra se queda donde se eligio.
 *
 * Y por eso tampoco necesita conexion ni permiso: es una preferencia del
 * cristal que se esta mirando.
 */
export const TAMANOS = ['pequena', 'normal', 'grande'] as const;
export type TamanoDeLetra = (typeof TAMANOS)[number];

export const COMO_SE_LLAMA: Record<TamanoDeLetra, string> = {
  pequena: 'Pequena',
  normal: 'Normal',
  grande: 'Grande',
};

/** Lo que multiplica cada uno, tal cual B2. Se exporta para poder probarlo. */
export const CUANTO_MULTIPLICA: Record<TamanoDeLetra, number> = {
  pequena: 0.9,
  normal: 1,
  grande: 1.15,
};

const DONDE_SE_GUARDA = 'estook.tamano-de-letra';

export function esTamanoDeLetra(valor: unknown): valor is TamanoDeLetra {
  return typeof valor === 'string' && (TAMANOS as readonly string[]).includes(valor);
}

function leerGuardado(): TamanoDeLetra {
  if (typeof window === 'undefined') return 'normal';
  try {
    const guardado = window.localStorage.getItem(DONDE_SE_GUARDA);
    return esTamanoDeLetra(guardado) ? guardado : 'normal';
  } catch {
    // Navegacion privada, o almacenamiento bloqueado. No es un error: es que hoy
    // no se puede recordar, y la aplicacion sigue funcionando igual.
    return 'normal';
  }
}

export function usarTamanoDeLetra(): {
  readonly tamano: TamanoDeLetra;
  readonly poner: (tamano: TamanoDeLetra) => void;
} {
  const [tamano, setTamano] = useState<TamanoDeLetra>(leerGuardado);

  // El atributo se pone tambien en el primer pintado, para que no se vea la
  // letra normal un instante antes de crecer.
  useEffect(() => {
    document.documentElement.dataset['letra'] = tamano;
  }, [tamano]);

  const poner = useCallback((nuevo: TamanoDeLetra) => {
    setTamano(nuevo);
    try {
      window.localStorage.setItem(DONDE_SE_GUARDA, nuevo);
    } catch {
      // Se aplica igual, solo que no se recordara la proxima vez.
    }
  }, []);

  return { tamano, poner };
}
