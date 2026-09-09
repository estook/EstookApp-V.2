import { useCallback, useEffect, useState } from 'react';

/**
 * Claro, oscuro o el del sistema.
 *
 * ── Por que existe, si B1 decia «esquema claro fijo» ─────────────────────────
 *
 * Porque Estook dejo de ser solo la pantalla del pase. La misma aplicacion la
 * abre quien lleva el local a las once de la noche, en la oficina, para mirar el
 * margen del dia; y ahi una pantalla blanca entera es lo que hace que se cierre
 * el portatil. La decision esta escrita en la 0024.
 *
 * **El de fabrica sigue siendo el claro**, y eso no es prudencia: una cocina se
 * mira de lejos y con la luz encendida, y ahi el claro se lee mejor. Quien no
 * entre en Ajustes ve exactamente lo de antes.
 *
 * ── Por que en el aparato y no en la persona ─────────────────────────────────
 *
 * Lo mismo que el tamano de letra, y por lo mismo: la tableta del pase quiere el
 * claro a las dos de la tarde y el portatil de la oficina quiere el oscuro a las
 * once de la noche, **y puede ser la misma persona**. Es una preferencia del
 * cristal que se esta mirando, asi que no viaja ni necesita conexion.
 *
 * ── Y por que las pantallas no se enteran ────────────────────────────────────
 *
 * Aqui solo se pone un atributo en el <html>. Quien cambia los colores es
 * `temas.css`, redefiniendo las fichas: `bg-superficie` compila a
 * `var(--color-superficie)`, asi que cambiar la ficha cambia las cuarenta
 * pantallas a la vez. **Ninguna pantalla lleva una clase de modo oscuro**, y por
 * eso una pantalla nueva sale bien en los dos sin que nadie se acuerde.
 */
export const TEMAS = ['claro', 'oscuro', 'sistema'] as const;
export type Tema = (typeof TEMAS)[number];

export const COMO_SE_LLAMA_EL_TEMA: Record<Tema, string> = {
  claro: 'Claro',
  oscuro: 'Oscuro',
  sistema: 'El del sistema',
};

export const QUE_HACE_CADA_TEMA: Record<Tema, string> = {
  claro: 'El de siempre. Se lee mejor de lejos y con luz.',
  oscuro: 'Para la oficina de noche, y para una pantalla que deslumbra.',
  sistema: 'Sigue a tu móvil o a tu ordenador, y cambia con ellos.',
};

const DONDE_SE_GUARDA = 'estook.tema';

export function esTema(valor: unknown): valor is Tema {
  return typeof valor === 'string' && (TEMAS as readonly string[]).includes(valor);
}

function leerGuardado(): Tema {
  if (typeof window === 'undefined') return 'claro';
  try {
    const guardado = window.localStorage.getItem(DONDE_SE_GUARDA);
    return esTema(guardado) ? guardado : 'claro';
  } catch {
    // Navegacion privada, o almacenamiento bloqueado. Se ve el claro y ya.
    return 'claro';
  }
}

export function usarTema(): {
  readonly tema: Tema;
  readonly poner: (tema: Tema) => void;
} {
  const [tema, setTema] = useState<Tema>(leerGuardado);

  useEffect(() => {
    document.documentElement.dataset['tema'] = tema;
  }, [tema]);

  const poner = useCallback((nuevo: Tema) => {
    setTema(nuevo);
    try {
      window.localStorage.setItem(DONDE_SE_GUARDA, nuevo);
    } catch {
      // Se aplica igual, solo que no se recordara la proxima vez.
    }
  }, []);

  return { tema, poner };
}

/**
 * Si lo que se esta pintando ahora mismo es oscuro.
 *
 * No mira el ajuste, mira **el resultado**: con «el del sistema» puesto, la
 * respuesta depende del sistema y cambia sin que nadie toque nada. Lo usa el
 * gancho del color de marca, que tiene que recalcular el acento cuando la
 * superficie cambia de color debajo.
 */
export function usarSeVeOscuro(): boolean {
  const [oscuro, setOscuro] = useState(() => seVeOscuroAhora());

  useEffect(() => {
    const mirar = () => {
      setOscuro(seVeOscuroAhora());
    };
    mirar();

    // Dos cosas lo cambian: el ajuste (el atributo del <html>) y el sistema.
    const vigilante = new MutationObserver(mirar);
    vigilante.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-tema'],
    });

    const delSistema = window.matchMedia('(prefers-color-scheme: dark)');
    delSistema.addEventListener('change', mirar);

    return () => {
      vigilante.disconnect();
      delSistema.removeEventListener('change', mirar);
    };
  }, []);

  return oscuro;
}

/**
 * Si lo pintado ahora mismo es oscuro, mirando **solo lo que dice la aplicacion**.
 *
 * ── El fallo que este `sistema` explicito evita ──────────────────────────────
 *
 * De las cuatro aplicaciones, solo `app` elige tema: la web publica y la carta no
 * llaman a `usarTema`, asi que su <html> no lleva `data-tema` y **se quedan
 * claras siempre**, que es lo que les toca.
 *
 * Si la respuesta por defecto fuera «lo que diga el sistema», con el movil en
 * modo oscuro esas dos pintarian el logotipo claro sobre una pagina clara:
 * invisible. El mismo fallo que el modo oscuro traia en la barra de arriba, pero
 * al reves y en las aplicaciones que ni siquiera tienen modo oscuro.
 *
 * Asi que el sistema solo manda cuando alguien ha elegido que mande.
 */
function seVeOscuroAhora(): boolean {
  if (typeof window === 'undefined') return false;
  const puesto = document.documentElement.dataset['tema'];
  if (puesto === 'oscuro') return true;
  if (puesto === 'sistema') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return false;
}
